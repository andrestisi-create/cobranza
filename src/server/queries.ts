import { prisma } from "@/lib/db";
import { resumenCobranza, type EstadoCobranza } from "@/lib/calculos";
import { toNumber } from "@/lib/format";

export interface PagoView {
  id: string;
  fechaPago: string;
  montoPago: number;
  medioPago: string;
  referencia: string | null;
  observacion: string | null;
}

export interface OCView {
  id: string;
  tipoOC: string;
  numeroOC: string;
  entidadNombre: string;
  entidadRut: string | null;
  monto: number;
  fechaOC: string | null;
  estadoOC: string;
  observacion: string | null;
}

export interface DocView {
  id: string;
  tipoDocto: string;
  folio: string | null;
  fechaEmision: string | null;
  monto: number | null;
}

export interface AlumnoView {
  idAlumno: string;
  nombreCompleto: string;
  rut: string | null;
  email: string | null;
  telefono: string | null;
  direccion: string | null;
}

export interface NegocioCobranza {
  recordId: string;
  fechaCreacion: string;
  estadoNegocio: string;
  tipoNegocio: string;
  tipoVenta: string;
  tipoDocto: string;
  montoNegocio: number;
  totalPagado: number;
  saldo: number;
  porcentaje: number;
  estadoCobranza: EstadoCobranza;
  tieneDocumento: boolean;
  esSence: boolean;
  alumno: AlumnoView;
  codPrograma: string;
  programaDescripcion: string;
  pagos: PagoView[];
  ordenes: OCView[];
  documentos: DocView[];
  totalOC: number;
}

function nombreCompleto(a: {
  nombre: string;
  segundoNombre: string | null;
  apellidoPaterno: string;
  apellidoMaterno: string | null;
}): string {
  return [a.nombre, a.segundoNombre, a.apellidoPaterno, a.apellidoMaterno]
    .filter(Boolean)
    .join(" ");
}

/** Devuelve todos los negocios con su resumen de cobranza, pagos, OCs y documentos. */
export async function getNegociosCobranza(): Promise<NegocioCobranza[]> {
  const negocios = await prisma.negocio.findMany({
    orderBy: { fechaCreacion: "desc" },
    include: {
      alumno: true,
      programa: true,
      pagos: { orderBy: { fechaPago: "desc" } },
      ordenesCompra: { orderBy: { createdAt: "asc" } },
      documentos: { orderBy: { createdAt: "desc" } },
    },
  });

  return negocios.map((n) => {
    const resumen = resumenCobranza(n.montoNegocio, n.pagos);
    const totalOC = n.ordenesCompra.reduce((acc, oc) => acc + toNumber(oc.monto), 0);

    return {
      recordId: n.recordId,
      fechaCreacion: n.fechaCreacion.toISOString(),
      estadoNegocio: n.estadoNegocio,
      tipoNegocio: n.tipoNegocio,
      tipoVenta: n.tipoVenta,
      tipoDocto: n.tipoDocto,
      montoNegocio: resumen.montoNegocio,
      totalPagado: resumen.totalPagado,
      saldo: resumen.saldo,
      porcentaje: resumen.porcentaje,
      estadoCobranza: resumen.estadoCobranza,
      tieneDocumento: n.documentos.length > 0,
      esSence: n.tipoVenta === "SENCE",
      codPrograma: n.codPrograma,
      programaDescripcion: n.programa.descripcion,
      alumno: {
        idAlumno: n.alumno.idAlumno,
        nombreCompleto: nombreCompleto(n.alumno),
        rut: n.alumno.rut,
        email: n.alumno.email,
        telefono: n.alumno.telefono,
        direccion: n.alumno.direccion,
      },
      pagos: n.pagos.map((p) => ({
        id: p.id,
        fechaPago: p.fechaPago.toISOString(),
        montoPago: toNumber(p.montoPago),
        medioPago: p.medioPago,
        referencia: p.referencia,
        observacion: p.observacion,
      })),
      ordenes: n.ordenesCompra.map((oc) => ({
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
      documentos: n.documentos.map((d) => ({
        id: d.id,
        tipoDocto: d.tipoDocto,
        folio: d.folio,
        fechaEmision: d.fechaEmision ? d.fechaEmision.toISOString() : null,
        monto: d.monto !== null ? toNumber(d.monto) : null,
      })),
      totalOC,
    };
  });
}

export interface MetricasDashboard {
  totalNegocios: number;
  montoTotal: number;
  totalCobrado: number;
  saldoPendiente: number;
  senceSinDocumento: number;
  negociosPagados: number;
}

export async function getMetricas(): Promise<MetricasDashboard> {
  const negocios = await getNegociosCobranza();
  const montoTotal = negocios.reduce((a, n) => a + n.montoNegocio, 0);
  const totalCobrado = negocios.reduce((a, n) => a + n.totalPagado, 0);
  const saldoPendiente = negocios.reduce((a, n) => a + Math.max(0, n.saldo), 0);
  const senceSinDocumento = negocios.filter((n) => n.esSence && !n.tieneDocumento).length;
  const negociosPagados = negocios.filter((n) => n.estadoCobranza === "PAGADO").length;

  return {
    totalNegocios: negocios.length,
    montoTotal,
    totalCobrado,
    saldoPendiente,
    senceSinDocumento,
    negociosPagados,
  };
}
