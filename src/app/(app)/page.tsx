import Link from "next/link";
import { getMetricas } from "@/server/queries";
import { PageHeader } from "@/components/page-header";
import { formatCLP } from "@/lib/format";

export const dynamic = "force-dynamic";

function Metrica({
  label,
  value,
  hint,
  color = "slate",
}: {
  label: string;
  value: string;
  hint?: string;
  color?: "slate" | "emerald" | "red" | "amber";
}) {
  const colores: Record<string, string> = {
    slate: "text-slate-900",
    emerald: "text-emerald-600",
    red: "text-red-600",
    amber: "text-amber-600",
  };
  return (
    <div className="rounded-xl border border-slate-200 bg-white p-5">
      <div className="text-sm text-slate-500">{label}</div>
      <div className={`mt-1 text-2xl font-bold ${colores[color]}`}>{value}</div>
      {hint && <div className="mt-1 text-xs text-slate-400">{hint}</div>}
    </div>
  );
}

export default async function DashboardPage() {
  const m = await getMetricas();

  return (
    <div className="p-6">
      <PageHeader title="Dashboard" description="Resumen general de cobranza y pre-cobranza." />

      <div className="grid grid-cols-2 gap-4 lg:grid-cols-3">
        <Metrica label="Negocios" value={String(m.totalNegocios)} hint={`${m.negociosPagados} pagados`} />
        <Metrica label="Monto total" value={formatCLP(m.montoTotal)} />
        <Metrica label="Total cobrado" value={formatCLP(m.totalCobrado)} color="emerald" />
        <Metrica label="Saldo pendiente" value={formatCLP(m.saldoPendiente)} color="red" />
        <Metrica
          label="Sence sin documento"
          value={String(m.senceSinDocumento)}
          color="amber"
          hint="Pendientes de documento tributario"
        />
      </div>

      <div className="mt-6 flex flex-wrap gap-3">
        <Link
          href="/cobranza"
          className="rounded-lg bg-slate-900 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-slate-700"
        >
          Ir a Cobranza
        </Link>
        <Link
          href="/pre-cobranza"
          className="rounded-lg border border-slate-300 bg-white px-4 py-2.5 text-sm font-semibold text-slate-700 transition hover:bg-slate-100"
        >
          Ver Pre-cobranza
        </Link>
      </div>
    </div>
  );
}
