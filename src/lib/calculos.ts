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

/** Calcula saldo, % de avance y estado de cobranza de un negocio a partir del total ya pagado. */
export function resumenCobranza(
  montoNegocio: unknown,
  totalPagadoInput: unknown,
): ResumenCobranza {
  const monto = toNumber(montoNegocio as number);
  const totalPagado = toNumber(totalPagadoInput as number);
  const saldo = monto - totalPagado;

  let estadoCobranza: EstadoCobranza;
  if (totalPagado <= 0) estadoCobranza = "SIN_PAGOS";
  else if (totalPagado < monto) estadoCobranza = "PARCIAL";
  else if (totalPagado === monto) estadoCobranza = "PAGADO";
  else estadoCobranza = "SOBREPAGADO";

  const porcentaje = monto > 0 ? Math.min(100, Math.round((totalPagado / monto) * 100)) : 0;

  return { montoNegocio: monto, totalPagado, saldo, porcentaje, estadoCobranza };
}
