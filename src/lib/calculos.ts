// Cálculos derivados de cobranza. No se almacenan en columnas: se computan aquí.

import { toNumber } from "./format";

export type EstadoCobranza =
  | "SIN_PAGOS"
  | "PARCIAL"
  | "PAGADO"
  | "SOBREPAGADO";

export interface ResumenCobranza {
  montoNegocio: number;
  totalPagado: number;
  saldo: number;
  porcentaje: number; // 0..100
  estadoCobranza: EstadoCobranza;
}

type Pagolike = { montoPago: unknown };

/** Calcula totalPagado, saldo, % de avance y estado de cobranza de un negocio. */
export function resumenCobranza(
  montoNegocio: unknown,
  pagos: Pagolike[],
): ResumenCobranza {
  const monto = toNumber(montoNegocio as number);
  const totalPagado = pagos.reduce((acc, p) => acc + toNumber(p.montoPago as number), 0);
  const saldo = monto - totalPagado;

  let estadoCobranza: EstadoCobranza;
  if (totalPagado <= 0) estadoCobranza = "SIN_PAGOS";
  else if (totalPagado < monto) estadoCobranza = "PARCIAL";
  else if (totalPagado === monto) estadoCobranza = "PAGADO";
  else estadoCobranza = "SOBREPAGADO";

  const porcentaje = monto > 0 ? Math.min(100, Math.round((totalPagado / monto) * 100)) : 0;

  return { montoNegocio: monto, totalPagado, saldo, porcentaje, estadoCobranza };
}
