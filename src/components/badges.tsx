import { cn, etiqueta } from "@/lib/format";

type Color = "gray" | "green" | "amber" | "red" | "blue" | "indigo" | "slate";

const COLORS: Record<Color, string> = {
  gray: "bg-slate-100 text-slate-700",
  green: "bg-emerald-100 text-emerald-700",
  amber: "bg-amber-100 text-amber-800",
  red: "bg-red-100 text-red-700",
  blue: "bg-sky-100 text-sky-700",
  indigo: "bg-indigo-100 text-indigo-700",
  slate: "bg-slate-200 text-slate-700",
};

export function Badge({
  children,
  color = "gray",
  className,
}: {
  children: React.ReactNode;
  color?: Color;
  className?: string;
}) {
  return (
    <span
      className={cn(
        "inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium",
        COLORS[color],
        className,
      )}
    >
      {children}
    </span>
  );
}

export function EstadoNegocioBadge({ estado }: { estado: string }) {
  const color: Color =
    estado === "MATRICULADO" ? "green" : estado === "DESISTE" ? "red" : "gray";
  return <Badge color={color}>{etiqueta(estado)}</Badge>;
}

export function EstadoCobranzaBadge({ estado }: { estado: string }) {
  const color: Color =
    estado === "PAGADO"
      ? "green"
      : estado === "PARCIAL"
        ? "amber"
        : estado === "SOBREPAGADO"
          ? "blue"
          : "gray";
  return <Badge color={color}>{etiqueta(estado)}</Badge>;
}

export function TipoVentaBadge({ tipo }: { tipo: string }) {
  return (
    <Badge color={tipo === "SENCE" ? "indigo" : "slate"}>{etiqueta(tipo)}</Badge>
  );
}

export function EstadoOCBadge({ estado }: { estado: string }) {
  const color: Color =
    estado === "PAGADA"
      ? "green"
      : estado === "FACTURADA"
        ? "blue"
        : estado === "ANULADA"
          ? "red"
          : "amber";
  return <Badge color={color}>{etiqueta(estado)}</Badge>;
}
