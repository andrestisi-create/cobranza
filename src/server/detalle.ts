"use server";

import { prisma } from "@/lib/db";
import { toNumber } from "@/lib/format";
import type { PagoView, OCView, DocView } from "@/server/queries";

export interface DetalleNegocio {
  pagos: PagoView[];
  ordenes: OCView[];
  documentos: DocView[];
}

/**
 * Detalle completo (pagos, OCs, documentos) de UN negocio, traído bajo demanda cuando
 * el usuario abre el panel de Cobranza o edita un negocio — evita incluir estas
 * relaciones para los miles de negocios de la lista.
 */
export async function getDetalleNegocio(recordId: string): Promise<DetalleNegocio> {
  const [pagos, ordenes, documentos] = await Promise.all([
    prisma.pago.findMany({ where: { recordId }, orderBy: { fechaPago: "desc" } }),
    prisma.ordenCompra.findMany({ where: { recordId }, orderBy: { createdAt: "asc" } }),
    prisma.documentoTributario.findMany({ where: { recordId }, orderBy: { createdAt: "desc" } }),
  ]);

  return {
    pagos: pagos.map((p) => ({
      id: p.id,
      fechaPago: p.fechaPago.toISOString(),
      montoPago: toNumber(p.montoPago),
      medioPago: p.medioPago,
      referencia: p.referencia,
      observacion: p.observacion,
    })),
    ordenes: ordenes.map((oc) => ({
      id: oc.id,
      tipoOC: oc.tipoOC,
      numeroOC: oc.numeroOC,
      entidadNombre: oc.entidadNombre,
      entidadRut: oc.entidadRut,
      monto: toNumber(oc.monto),
      fechaOC: oc.fechaOC ? oc.fechaOC.toISOString() : null,
      estadoOC: oc.estadoOC,
      observacion: oc.observacion,
    })),
    documentos: documentos.map((d) => ({
      id: d.id,
      tipoDocto: d.tipoDocto,
      folio: d.folio,
      fechaEmision: d.fechaEmision ? d.fechaEmision.toISOString() : null,
      monto: d.monto !== null ? toNumber(d.monto) : null,
    })),
  };
}
