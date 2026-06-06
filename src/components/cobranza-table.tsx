"use client";

import { useMemo, useState } from "react";
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
  const [fCobranza, setFCobranza] = useState("");
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
      if (fCobranza && n.estadoCobranza !== fCobranza) return false;
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
  }, [negocios, q, fVenta, fNegocio, fEstado, fCobranza, sortKey, sortDir, soloPendientes]);

  const seleccionado = selectedId
    ? negocios.find((n) => n.recordId === selectedId) ?? null
    : null;

  const toggleSort = (k: SortKey) => {
    if (sortKey === k) setSortDir((d) => (d === "asc" ? "desc" : "asc"));
    else {
      setSortKey(k);
      setSortDir("desc");
    }
  };

  const Th = ({ k, children, num }: { k: SortKey; children: React.ReactNode; num?: boolean }) => (
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
      {/* Filtros */}
      <div className="mb-4 flex flex-wrap items-center gap-2">
        <input
          value={q}
          onChange={(e) => setQ(e.target.value)}
          placeholder="Buscar alumno, RUT, programa…"
          className="min-w-[220px] flex-1 rounded-lg border border-slate-300 px-3 py-2 text-sm outline-none focus:border-slate-900"
        />
        <select value={fVenta} onChange={(e) => setFVenta(e.target.value)} className={selectCls}>
          <option value="">Venta: todas</option>
          <option value="SENCE">Sence</option>
          <option value="NO_SENCE">No Sence</option>
        </select>
        <select value={fNegocio} onChange={(e) => setFNegocio(e.target.value)} className={selectCls}>
          <option value="">Tipo: todos</option>
          <option value="CORPORATIVO">Corporativo</option>
          <option value="RETAIL">Retail</option>
        </select>
        <select value={fEstado} onChange={(e) => setFEstado(e.target.value)} className={selectCls}>
          <option value="">Estado: todos</option>
          <option value="MATRICULADO">Matriculado</option>
          <option value="DE_BAJA">De Baja</option>
          <option value="DESISTE">Desiste</option>
        </select>
        <select value={fCobranza} onChange={(e) => setFCobranza(e.target.value)} className={selectCls}>
          <option value="">Cobranza: todas</option>
          <option value="SIN_PAGOS">Sin pagos</option>
          <option value="PARCIAL">Parcial</option>
          <option value="PAGADO">Pagado</option>
          <option value="SOBREPAGADO">Sobrepagado</option>
        </select>
      </div>

      {/* Tabla */}
      <div className="overflow-x-auto rounded-xl border border-slate-200 bg-white">
        <table className="w-full text-sm">
          <thead className="border-b border-slate-200 bg-slate-50 text-xs uppercase">
            <tr>
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
                <td colSpan={11} className="px-3 py-8 text-center text-slate-400">
                  No hay negocios que coincidan con los filtros.
                </td>
              </tr>
            )}
            {filtrados.map((n) => (
              <tr key={n.recordId} className="border-b border-slate-100 hover:bg-slate-50">
                <td className="px-3 py-2 text-slate-500">{formatFecha(n.fechaCreacion)}</td>
                <td className="px-3 py-2">
                  <div className="font-medium text-slate-900">{n.alumno.nombreCompleto}</div>
                  <div className="text-xs text-slate-400">{n.alumno.rut ?? "—"}</div>
                </td>
                <td className="px-3 py-2 text-slate-600">{n.codPrograma}</td>
                <td className="px-3 py-2"><TipoVentaBadge tipo={n.tipoVenta} /></td>
                <td className="px-3 py-2"><EstadoNegocioBadge estado={n.estadoNegocio} /></td>
                <td className="px-3 py-2 text-right tabular-nums text-slate-700">{formatCLP(n.montoNegocio)}</td>
                <td className="px-3 py-2 text-right tabular-nums text-emerald-600">{formatCLP(n.totalPagado)}</td>
                <td className="px-3 py-2 text-right tabular-nums font-medium text-slate-900">{formatCLP(n.saldo)}</td>
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

      {/* Panel lateral derecho */}
      <Drawer
        open={!!seleccionado}
        onClose={() => setSelectedId(null)}
        title={seleccionado?.alumno.nombreCompleto ?? ""}
        subtitle={seleccionado ? `${etiqueta(seleccionado.tipoVenta)} · ${etiqueta(seleccionado.tipoNegocio)}` : ""}
      >
        {seleccionado && <PanelNegocio negocio={seleccionado} puedeEliminar={puedeEliminar} />}
      </Drawer>
    </div>
  );
}
