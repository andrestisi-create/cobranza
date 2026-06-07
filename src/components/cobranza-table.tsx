"use client";

import { useMemo, useRef, useEffect, useState } from "react";
import type { NegocioCobranza } from "@/server/queries";
import { formatCLP, formatFecha, etiqueta, cn } from "@/lib/format";
import {
  EstadoNegocioBadge,
  EstadoCobranzaBadge,
  TipoVentaBadge,
  Badge,
} from "@/components/badges";
import { Drawer } from "@/components/drawer";
import { PanelNegocio } from "@/components/panel-negocio";

type SortKey = "fecha" | "alumno" | "monto" | "pagado" | "saldo";

const selectCls =
  "rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm outline-none focus:border-slate-900";

// ─────────────────────────────────────────────
// Filtro multi-select para estado de cobranza
// ─────────────────────────────────────────────

const ESTADOS_COB = [
  { value: "SIN_PAGOS",   label: "Sin pagos" },
  { value: "PARCIAL",     label: "Parcial" },
  { value: "PAGADO",      label: "Pagado" },
  { value: "SOBREPAGADO", label: "Sobrepagado" },
];

function FiltroCobranza({
  seleccionados,
  onChange,
}: {
  seleccionados: string[];
  onChange: (v: string[]) => void;
}) {
  const [abierto, setAbierto] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handle(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node))
        setAbierto(false);
    }
    document.addEventListener("mousedown", handle);
    return () => document.removeEventListener("mousedown", handle);
  }, []);

  const toggle = (v: string) =>
    onChange(
      seleccionados.includes(v)
        ? seleccionados.filter((s) => s !== v)
        : [...seleccionados, v],
    );

  const label =
    seleccionados.length === 0
      ? "Cobranza: todas"
      : seleccionados.length === 1
        ? (ESTADOS_COB.find((e) => e.value === seleccionados[0])?.label ?? "1 sel.")
        : `Cobranza: ${seleccionados.length} estados`;

  return (
    <div ref={ref} className="relative">
      <button
        type="button"
        onClick={() => setAbierto(!abierto)}
        className={cn(
          selectCls,
          "flex items-center gap-2",
          seleccionados.length > 0 && "border-slate-900 font-medium",
        )}
      >
        {label}
        <svg
          xmlns="http://www.w3.org/2000/svg"
          className={cn("h-3.5 w-3.5 shrink-0 text-slate-400 transition", abierto && "rotate-180")}
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
          strokeWidth={2}
        >
          <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
        </svg>
      </button>

      {abierto && (
        <div className="absolute left-0 top-full z-20 mt-1 w-48 rounded-lg border border-slate-200 bg-white shadow-lg">
          {ESTADOS_COB.map((e) => (
            <label
              key={e.value}
              className="flex cursor-pointer items-center gap-2.5 px-3 py-2 hover:bg-slate-50"
            >
              <input
                type="checkbox"
                checked={seleccionados.includes(e.value)}
                onChange={() => toggle(e.value)}
                className="h-4 w-4 rounded border-slate-300 accent-slate-900"
              />
              <span className="text-sm text-slate-700">{e.label}</span>
            </label>
          ))}
          {seleccionados.length > 0 && (
            <div className="border-t border-slate-100 px-3 py-2">
              <button
                type="button"
                onClick={() => onChange([])}
                className="text-xs text-slate-400 hover:text-slate-700"
              >
                Limpiar filtro
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

// ─────────────────────────────────────────────
// Tabla principal
// ─────────────────────────────────────────────

export function CobranzaTable({
  negocios,
  puedeEliminar,
  soloPendientes = false,
}: {
  negocios: NegocioCobranza[];
  puedeEliminar: boolean;
  soloPendientes?: boolean;
}) {
  const [q, setQ] = useState("");
  const [fVenta, setFVenta] = useState("");
  const [fNegocio, setFNegocio] = useState("");
  const [fEstado, setFEstado] = useState("");
  const [fCobranzas, setFCobranzas] = useState<string[]>([]);
  const [sortKey, setSortKey] = useState<SortKey>("fecha");
  const [sortDir, setSortDir] = useState<"asc" | "desc">("desc");
  const [selectedId, setSelectedId] = useState<string | null>(null);

  const filtrados = useMemo(() => {
    const term = q.trim().toLowerCase();
    let rows = negocios.filter((n) => {
      if (soloPendientes && !(n.esSence && !n.tieneDocumento)) return false;
      if (fVenta && n.tipoVenta !== fVenta) return false;
      if (fNegocio && n.tipoNegocio !== fNegocio) return false;
      if (fEstado && n.estadoNegocio !== fEstado) return false;
      if (fCobranzas.length > 0 && !fCobranzas.includes(n.estadoCobranza)) return false;
      if (term) {
        const hay =
          n.alumno.nombreCompleto.toLowerCase().includes(term) ||
          n.recordId.toLowerCase().includes(term) ||
          n.codPrograma.toLowerCase().includes(term) ||
          n.programaDescripcion.toLowerCase().includes(term) ||
          (n.alumno.rut ?? "").toLowerCase().includes(term);
        if (!hay) return false;
      }
      return true;
    });

    rows = [...rows].sort((a, b) => {
      let cmp = 0;
      switch (sortKey) {
        case "alumno":
          cmp = a.alumno.nombreCompleto.localeCompare(b.alumno.nombreCompleto);
          break;
        case "monto":
          cmp = a.montoNegocio - b.montoNegocio;
          break;
        case "pagado":
          cmp = a.totalPagado - b.totalPagado;
          break;
        case "saldo":
          cmp = a.saldo - b.saldo;
          break;
        default:
          cmp = a.fechaCreacion.localeCompare(b.fechaCreacion);
      }
      return sortDir === "asc" ? cmp : -cmp;
    });

    return rows;
  }, [negocios, q, fVenta, fNegocio, fEstado, fCobranzas, sortKey, sortDir, soloPendientes]);

  // Totalizadores (reaccionan a filtros)
  const totales = useMemo(
    () => ({
      monto:  filtrados.reduce((s, n) => s + n.montoNegocio, 0),
      pagado: filtrados.reduce((s, n) => s + n.totalPagado, 0),
      saldo:  filtrados.reduce((s, n) => s + Math.max(0, n.saldo), 0),
    }),
    [filtrados],
  );

  const seleccionado = selectedId
    ? negocios.find((n) => n.recordId === selectedId) ?? null
    : null;

  const toggleSort = (k: SortKey) => {
    if (sortKey === k) setSortDir((d) => (d === "asc" ? "desc" : "asc"));
    else { setSortKey(k); setSortDir("desc"); }
  };

  const Th = ({
    k,
    children,
    num,
  }: {
    k: SortKey;
    children: React.ReactNode;
    num?: boolean;
  }) => (
    <th
      onClick={() => toggleSort(k)}
      className={cn(
        "cursor-pointer select-none px-3 py-2 font-semibold text-slate-500 hover:text-slate-900",
        num ? "text-right" : "text-left",
      )}
    >
      {children}
      {sortKey === k ? (sortDir === "asc" ? " ↑" : " ↓") : ""}
    </th>
  );

  return (
    <div>
      {/* ── Totalizadores ── */}
      <div className="mb-4 grid grid-cols-2 gap-3 sm:grid-cols-4">
        <div className="rounded-xl border border-slate-200 bg-white px-4 py-3 text-center">
          <div className="text-2xl font-bold text-slate-900">{filtrados.length}</div>
          <div className="text-xs text-slate-400">
            Negocios{filtrados.length < negocios.length ? ` de ${negocios.length}` : ""}
          </div>
        </div>
        <div className="rounded-xl border border-slate-200 bg-white px-4 py-3 text-center">
          <div className="text-lg font-bold text-slate-900">{formatCLP(totales.monto)}</div>
          <div className="text-xs text-slate-400">Monto total</div>
        </div>
        <div className="rounded-xl border border-emerald-100 bg-emerald-50 px-4 py-3 text-center">
          <div className="text-lg font-bold text-emerald-700">{formatCLP(totales.pagado)}</div>
          <div className="text-xs text-emerald-600">Pagado</div>
        </div>
        <div className="rounded-xl border border-red-100 bg-red-50 px-4 py-3 text-center">
          <div className="text-lg font-bold text-red-700">{formatCLP(totales.saldo)}</div>
          <div className="text-xs text-red-600">Saldo adeudado</div>
        </div>
      </div>

      {/* ── Filtros ── */}
      <div className="mb-4 flex flex-wrap items-center gap-2">
        <input
          value={q}
          onChange={(e) => setQ(e.target.value)}
          placeholder="Buscar alumno, RUT, Record ID, programa…"
          className="min-w-[220px] flex-1 rounded-lg border border-slate-300 px-3 py-2 text-sm outline-none focus:border-slate-900"
        />
        <select
          value={fVenta}
          onChange={(e) => setFVenta(e.target.value)}
          className={selectCls}
        >
          <option value="">Venta: todas</option>
          <option value="SENCE">Sence</option>
          <option value="NO_SENCE">No Sence</option>
        </select>
        <select
          value={fNegocio}
          onChange={(e) => setFNegocio(e.target.value)}
          className={selectCls}
        >
          <option value="">Tipo: todos</option>
          <option value="CORPORATIVO">Corporativo</option>
          <option value="RETAIL">Retail</option>
        </select>
        <select
          value={fEstado}
          onChange={(e) => setFEstado(e.target.value)}
          className={selectCls}
        >
          <option value="">Estado: todos</option>
          <option value="MATRICULADO">Matriculado</option>
          <option value="DE_BAJA">De Baja</option>
          <option value="DESISTE">Desiste</option>
        </select>
        <FiltroCobranza seleccionados={fCobranzas} onChange={setFCobranzas} />
      </div>

      {/* ── Tabla ── */}
      <div className="overflow-x-auto rounded-xl border border-slate-200 bg-white">
        <table className="w-full text-sm">
          <thead className="border-b border-slate-200 bg-slate-50 text-xs uppercase">
            <tr>
              <th className="px-3 py-2 text-left font-semibold text-slate-500">Record ID</th>
              <Th k="fecha">Fecha</Th>
              <Th k="alumno">Alumno</Th>
              <th className="px-3 py-2 text-left font-semibold text-slate-500">Programa</th>
              <th className="px-3 py-2 text-left font-semibold text-slate-500">Venta</th>
              <th className="px-3 py-2 text-left font-semibold text-slate-500">Estado</th>
              <Th k="monto" num>Monto</Th>
              <Th k="pagado" num>Pagado</Th>
              <Th k="saldo" num>Saldo</Th>
              <th className="px-3 py-2 text-left font-semibold text-slate-500">Cobranza</th>
              <th className="px-3 py-2 text-center font-semibold text-slate-500">Doc.</th>
              <th className="px-3 py-2"></th>
            </tr>
          </thead>
          <tbody>
            {filtrados.length === 0 && (
              <tr>
                <td colSpan={12} className="px-3 py-8 text-center text-slate-400">
                  No hay negocios que coincidan con los filtros.
                </td>
              </tr>
            )}
            {filtrados.map((n) => (
              <tr
                key={n.recordId}
                className={cn(
                  "border-b hover:bg-slate-50",
                  n.ocDescubierta
                    ? "border-red-200 bg-red-50 hover:bg-red-100"
                    : "border-slate-100",
                )}
              >
                <td className="px-3 py-2 font-mono text-xs text-slate-400">
                  {n.recordId}
                </td>
                <td className="px-3 py-2 text-slate-500">{formatFecha(n.fechaCreacion)}</td>
                <td className="px-3 py-2">
                  <div className="font-medium text-slate-900">{n.alumno.nombreCompleto}</div>
                  <div className="text-xs text-slate-400">{n.alumno.rut ?? "—"}</div>
                </td>
                <td className="px-3 py-2 text-slate-600">{n.codPrograma}</td>
                <td className="px-3 py-2"><TipoVentaBadge tipo={n.tipoVenta} /></td>
                <td className="px-3 py-2"><EstadoNegocioBadge estado={n.estadoNegocio} /></td>
                <td className="px-3 py-2 text-right tabular-nums text-slate-700">
                  {formatCLP(n.montoNegocio)}
                </td>
                <td className="px-3 py-2 text-right tabular-nums text-emerald-600">
                  {formatCLP(n.totalPagado)}
                </td>
                <td className="px-3 py-2 text-right tabular-nums font-medium text-slate-900">
                  {formatCLP(n.saldo)}
                </td>
                <td className="px-3 py-2"><EstadoCobranzaBadge estado={n.estadoCobranza} /></td>
                <td className="px-3 py-2 text-center">
                  {n.esSence ? (
                    n.tieneDocumento ? (
                      <Badge color="green">Sí</Badge>
                    ) : (
                      <Badge color="amber">No</Badge>
                    )
                  ) : (
                    <span className="text-slate-300">—</span>
                  )}
                </td>
                <td className="px-3 py-2 text-right">
                  <button
                    onClick={() => setSelectedId(n.recordId)}
                    className="rounded-lg bg-slate-900 px-3 py-1.5 text-xs font-semibold text-white transition hover:bg-slate-700"
                  >
                    Ver / Cobrar
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <p className="mt-3 text-xs text-slate-400">
        {filtrados.length} de {negocios.length} negocios
      </p>

      {/* Panel lateral */}
      <Drawer
        open={!!seleccionado}
        onClose={() => setSelectedId(null)}
        title={seleccionado?.alumno.nombreCompleto ?? ""}
        subtitle={
          seleccionado
            ? `${etiqueta(seleccionado.tipoVenta)} · ${etiqueta(seleccionado.tipoNegocio)}`
            : ""
        }
      >
        {seleccionado && (
          <PanelNegocio negocio={seleccionado} puedeEliminar={puedeEliminar} />
        )}
      </Drawer>
    </div>
  );
}
