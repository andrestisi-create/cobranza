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
  moneda: string;
  totalPagado: number;
  saldo: number;
  porcentaje: number;
  estadoCobranza: EstadoCobranza;
  tieneDocumento: boolean;
  esSence: boolean;
  /** true cuando tipoDocto=ORDEN_COMPRA y totalOC < montoNegocio */
  ocDescubierta: boolean;
  alumno: AlumnoView;
  codPrograma: string;
  programaDescripcion: string;
  vendedorNombre: string | null;
  /** Cantidad de OCs (el detalle completo se trae bajo demanda vía getDetalleNegocio) */
  ordenesCount: number;
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

/**
 * Devuelve todos los negocios con su resumen de cobranza (pagado/saldo/estado) usando
 * agregados en vez de traer cada pago/OC/documento completo — con miles de negocios,
 * incluir las relaciones 1-N completas es prohibitivamente lento. El detalle completo
 * de un negocio puntual se trae bajo demanda vía getDetalleNegocio().
 */
export async function getNegociosCobranza(): Promise<NegocioCobranza[]> {
  const [negocios, pagosPorNegocio, ocsPorNegocio, recordIdsConDocumento] = await Promise.all([
    prisma.negocio.findMany({
      orderBy: { fechaCreacion: "desc" },
      include: { alumno: true, programa: true, vendedor: true },
    }),
    prisma.pago.groupBy({ by: ["recordId"], _sum: { montoPago: true } }),
    prisma.ordenCompra.groupBy({ by: ["recordId"], _sum: { monto: true }, _count: { _all: true } }),
    prisma.documentoTributario.findMany({ distinct: ["recordId"], select: { recordId: true } }),
  ]);

  const totalPagadoPorRecordId = new Map(
    pagosPorNegocio.map((p) => [p.recordId, toNumber(p._sum.montoPago)]),
  );
  const ocPorRecordId = new Map(
    ocsPorNegocio.map((o) => [o.recordId, { total: toNumber(o._sum.monto), count: o._count._all }]),
  );
  const conDocumento = new Set(recordIdsConDocumento.map((d) => d.recordId));

  return negocios.map((n) => {
    const totalPagado = totalPagadoPorRecordId.get(n.recordId) ?? 0;
    const resumen = resumenCobranza(n.montoNegocio, totalPagado);
    const oc = ocPorRecordId.get(n.recordId);
    const totalOC = oc?.total ?? 0;
    const ordenesCount = oc?.count ?? 0;
    const ocDescubierta = n.tipoDocto === "ORDEN_COMPRA" && totalOC < resumen.montoNegocio;

    return {
      recordId: n.recordId,
      fechaCreacion: n.fechaCreacion.toISOString(),
      estadoNegocio: n.estadoNegocio,
      tipoNegocio: n.tipoNegocio,
      tipoVenta: n.tipoVenta,
      tipoDocto: n.tipoDocto,
      montoNegocio: resumen.montoNegocio,
      moneda: n.moneda,
      totalPagado: resumen.totalPagado,
      saldo: resumen.saldo,
      porcentaje: resumen.porcentaje,
      estadoCobranza: resumen.estadoCobranza,
      tieneDocumento: conDocumento.has(n.recordId),
      esSence: n.tipoVenta === "SENCE",
      ocDescubierta,
      codPrograma: n.codPrograma,
      programaDescripcion: n.programa.descripcion,
      vendedorNombre: n.vendedor?.nombre ?? null,
      alumno: {
        idAlumno: n.alumno.idAlumno,
        nombreCompleto: nombreCompleto(n.alumno),
        rut: n.alumno.rut,
        email: n.alumno.email,
        telefono: n.alumno.telefono,
        direccion: n.alumno.direccion,
      },
      ordenesCount,
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

// ─────────────────────────────────────────────
// Venta mensual: año actual vs año anterior
// ─────────────────────────────────────────────

export interface VentaAnualComparativo {
  anioActual: number;
  anioPrevio: number;
  porMes: { mes: number; actual: number; previo: number }[];
  totalActual: number;
  totalPrevio: number;
}

export async function getVentaAnual(): Promise<VentaAnualComparativo> {
  const ahora = new Date();
  const anioActual = ahora.getFullYear();
  const anioPrevio = anioActual - 1;

  const negocios = await prisma.negocio.findMany({
    where: {
      fechaCreacion: {
        gte: new Date(`${anioPrevio}-01-01T00:00:00.000Z`),
        lt: new Date(`${anioActual + 1}-01-01T00:00:00.000Z`),
      },
    },
    select: {
      fechaCreacion: true,
      montoNegocio: true,
    },
  });

  const mesActual = Array<number>(12).fill(0);
  const mesPrevio = Array<number>(12).fill(0);

  for (const n of negocios) {
    const anio = n.fechaCreacion.getFullYear();
    const mes = n.fechaCreacion.getMonth(); // 0-11
    const monto = toNumber(n.montoNegocio);
    if (anio === anioActual) mesActual[mes] += monto;
    else if (anio === anioPrevio) mesPrevio[mes] += monto;
  }

  return {
    anioActual,
    anioPrevio,
    porMes: Array.from({ length: 12 }, (_, i) => ({
      mes: i + 1,
      actual: mesActual[i],
      previo: mesPrevio[i],
    })),
    totalActual: mesActual.reduce((a, b) => a + b, 0),
    totalPrevio: mesPrevio.reduce((a, b) => a + b, 0),
  };
}
