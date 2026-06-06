// Utilidades de formato para la UI.

import type { Prisma } from "@prisma/client";

type Numerico = number | string | Prisma.Decimal | null | undefined;

/** Convierte Decimal/string/number a number de forma segura. */
export function toNumber(value: Numerico): number {
  if (value === null || value === undefined) return 0;
  if (typeof value === "number") return value;
  return Number(value.toString());
}

/** Formatea un monto en pesos chilenos (sin decimales). */
export function formatCLP(value: Numerico): string {
  return new Intl.NumberFormat("es-CL", {
    style: "currency",
    currency: "CLP",
    maximumFractionDigits: 0,
  }).format(toNumber(value));
}

/** Formatea una fecha en formato dd-mm-yyyy. */
export function formatFecha(value: Date | string | null | undefined): string {
  if (!value) return "—";
  const d = typeof value === "string" ? new Date(value) : value;
  if (Number.isNaN(d.getTime())) return "—";
  return new Intl.DateTimeFormat("es-CL", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  }).format(d);
}

/** Combina clases CSS condicionales. */
export function cn(...classes: (string | false | null | undefined)[]): string {
  return classes.filter(Boolean).join(" ");
}

const ETIQUETAS: Record<string, string> = {
  // EstadoNegocio
  MATRICULADO: "Matriculado",
  DE_BAJA: "De Baja",
  DESISTE: "Desiste",
  // TipoNegocio
  CORPORATIVO: "Corporativo",
  RETAIL: "Retail",
  // TipoVenta
  SENCE: "Sence",
  NO_SENCE: "No Sence",
  // TipoDocto
  FACTURA: "Factura",
  BOLETA: "Boleta",
  ORDEN_COMPRA: "Orden de Compra",
  // TipoOC
  OTIC: "OTIC",
  EMPRESA: "Empresa",
  // EstadoOC
  PENDIENTE: "Pendiente",
  FACTURADA: "Facturada",
  PAGADA: "Pagada",
  ANULADA: "Anulada",
  // MedioPago
  TRANSFERENCIA: "Transferencia",
  CHEQUE: "Cheque",
  EFECTIVO: "Efectivo",
  TARJETA: "Tarjeta",
  OTRO: "Otro",
  // Roles
  ADMIN: "Administrador",
  SUPERVISOR: "Supervisor",
  COBRADOR: "Cobrador",
  // EstadoCobranza (derivado)
  SIN_PAGOS: "Sin pagos",
  PARCIAL: "Pago parcial",
  PAGADO: "Pagado",
  SOBREPAGADO: "Sobrepagado",
};

/** Traduce un valor enum a una etiqueta legible en español. */
export function etiqueta(valor: string | null | undefined): string {
  if (!valor) return "—";
  return ETIQUETAS[valor] ?? valor;
}
