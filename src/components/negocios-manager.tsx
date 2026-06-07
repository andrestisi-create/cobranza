"use client";

import { useActionState, useEffect, useState } from "react";
import { crearNegocio, actualizarEstadoNegocio, eliminarNegocio } from "@/server/crud";
import { importarNegocios } from "@/server/imports";
import { ImportCSV, type ColConfig } from "@/components/import-csv";
import type { ActionState } from "@/lib/types";
import { formatCLP, formatFecha, etiqueta } from "@/lib/format";
import { TipoVentaBadge } from "@/components/badges";

const COLUMNAS_NEGOCIOS: ColConfig[] = [
  {
    campo: "rutAlumno",    label: "RUT del alumno",   requerido: true,
    descripcion: "El alumno debe existir en el sistema con ese RUT",
  },
  {
    campo: "codPrograma",  label: "Código programa",  requerido: true,
    descripcion: "El programa debe existir en el sistema",
  },
  {
    campo: "montoNegocio", label: "Monto (CLP)",      requerido: true,  tipo: "numero",
  },
  {
    campo: "tipoNegocio",  label: "Tipo negocio",     requerido: true,
    valoresPermitidos: ["CORPORATIVO", "RETAIL"],
  },
  {
    campo: "tipoVenta",    label: "Tipo venta",       requerido: true,
    valoresPermitidos: ["SENCE", "NO_SENCE"],
  },
  {
    campo: "tipoDocto",    label: "Tipo documento",   requerido: true,
    valoresPermitidos: ["FACTURA", "BOLETA", "ORDEN_COMPRA"],
  },
  {
    campo: "estadoNegocio", label: "Estado",          requerido: false,
    valoresPermitidos: ["MATRICULADO", "DE_BAJA", "DESISTE"],
    descripcion: "Vacío = MATRICULADO",
  },
];

export interface NegocioRow {
  recordId: string;
  alumnoNombre: string;
  codPrograma: string;
  montoNegocio: number;
  tipoNegocio: string;
  tipoVenta: string;
  tipoDocto: string;
  estadoNegocio: string;
  fechaCreacion: string;
}

const inputCls =
  "w-full rounded-lg border border-slate-300 px-3 py-2 text-sm outline-none focus:border-slate-900";
const labelCls = "mb-1 block text-xs font-medium text-slate-600";

export function NegociosManager({
  negocios,
  alumnos,
  programas,
  puedeGestionar,
}: {
  negocios: NegocioRow[];
  alumnos: { idAlumno: string; nombre: string }[];
  programas: { codPrograma: string; descripcion: string }[];
  puedeGestionar: boolean;
}) {
  const [abierto, setAbierto] = useState(false);
  const [state, formAction, pending] = useActionState<ActionState, FormData>(
    crearNegocio,
    undefined,
  );

  useEffect(() => {
    if (state?.ok) setAbierto(false);
  }, [state]);

  return (
    <div>
      {puedeGestionar && (
        <div className="mb-4 space-y-3">
          {/* Acciones superiores */}
          <div className="flex flex-wrap items-center gap-2">
            {!abierto && (
              <button
                onClick={() => setAbierto(true)}
                className="rounded-lg bg-slate-900 px-4 py-2 text-sm font-semibold text-white hover:bg-slate-700"
              >
                + Nuevo negocio
              </button>
            )}
            {!abierto && (
              <ImportCSV
                titulo="Importar negocios desde CSV"
                ejemploUrl="/ejemplos/negocios_ejemplo.csv"
                columnas={COLUMNAS_NEGOCIOS}
                action={importarNegocios}
              />
            )}
          </div>

          {/* Formulario de nuevo negocio */}
          {abierto && (
            <form key="new" action={formAction} className="rounded-xl border border-slate-200 bg-white p-4">
              <div className="grid grid-cols-2 gap-3 md:grid-cols-3">
                <div className="col-span-2 md:col-span-1">
                  <label className={labelCls}>Alumno *</label>
                  <select name="idAlumno" required className={inputCls} defaultValue="">
                    <option value="" disabled>Selecciona…</option>
                    {alumnos.map((a) => (
                      <option key={a.idAlumno} value={a.idAlumno}>{a.nombre}</option>
                    ))}
                  </select>
                </div>
                <div className="col-span-2 md:col-span-1">
                  <label className={labelCls}>Programa *</label>
                  <select name="codPrograma" required className={inputCls} defaultValue="">
                    <option value="" disabled>Selecciona…</option>
                    {programas.map((p) => (
                      <option key={p.codPrograma} value={p.codPrograma}>{p.codPrograma} · {p.descripcion}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className={labelCls}>Monto (CLP) *</label>
                  <input name="montoNegocio" type="number" min="1" step="1" required className={inputCls} />
                </div>
                <div>
                  <label className={labelCls}>Tipo negocio *</label>
                  <select name="tipoNegocio" className={inputCls} defaultValue="RETAIL">
                    <option value="CORPORATIVO">Corporativo</option>
                    <option value="RETAIL">Retail</option>
                  </select>
                </div>
                <div>
                  <label className={labelCls}>Tipo venta *</label>
                  <select name="tipoVenta" className={inputCls} defaultValue="NO_SENCE">
                    <option value="SENCE">Sence</option>
                    <option value="NO_SENCE">No Sence</option>
                  </select>
                </div>
                <div>
                  <label className={labelCls}>Tipo documento *</label>
                  <select name="tipoDocto" className={inputCls} defaultValue="BOLETA">
                    <option value="FACTURA">Factura</option>
                    <option value="BOLETA">Boleta</option>
                    <option value="ORDEN_COMPRA">Orden de Compra</option>
                  </select>
                </div>
                <div>
                  <label className={labelCls}>Estado *</label>
                  <select name="estadoNegocio" className={inputCls} defaultValue="MATRICULADO">
                    <option value="MATRICULADO">Matriculado</option>
                    <option value="DE_BAJA">De Baja</option>
                    <option value="DESISTE">Desiste</option>
                  </select>
                </div>
              </div>
              {state?.error && <p className="mt-2 text-xs text-red-600">{state.error}</p>}
              <p className="mt-2 text-xs text-slate-400">
                Para ventas Sence, las órdenes de compra (OTIC/Empresa) se agregan desde el panel de Cobranza.
              </p>
              <div className="mt-3 flex gap-2">
                <button type="submit" disabled={pending} className="rounded-lg bg-slate-900 px-4 py-2 text-sm font-semibold text-white hover:bg-slate-700 disabled:opacity-60">
                  {pending ? "Creando…" : "Crear negocio"}
                </button>
                <button type="button" onClick={() => setAbierto(false)} className="rounded-lg border border-slate-300 px-4 py-2 text-sm font-medium text-slate-600 hover:bg-slate-100">
                  Cancelar
                </button>
              </div>
            </form>
          )}
        </div>
      )}

      <div className="overflow-x-auto rounded-xl border border-slate-200 bg-white">
        <table className="w-full text-sm">
          <thead className="border-b border-slate-200 bg-slate-50 text-xs uppercase text-slate-500">
            <tr>
              <th className="px-3 py-2 text-left">Fecha</th>
              <th className="px-3 py-2 text-left">Alumno</th>
              <th className="px-3 py-2 text-left">Programa</th>
              <th className="px-3 py-2 text-left">Tipo</th>
              <th className="px-3 py-2 text-left">Venta</th>
              <th className="px-3 py-2 text-left">Docto</th>
              <th className="px-3 py-2 text-right">Monto</th>
              <th className="px-3 py-2 text-left">Estado</th>
              {puedeGestionar && <th className="px-3 py-2"></th>}
            </tr>
          </thead>
          <tbody>
            {negocios.map((n) => (
              <tr key={n.recordId} className="border-b border-slate-100 hover:bg-slate-50">
                <td className="px-3 py-2 text-slate-500">{formatFecha(n.fechaCreacion)}</td>
                <td className="px-3 py-2 font-medium text-slate-900">{n.alumnoNombre}</td>
                <td className="px-3 py-2 text-slate-600">{n.codPrograma}</td>
                <td className="px-3 py-2 text-slate-600">{etiqueta(n.tipoNegocio)}</td>
                <td className="px-3 py-2"><TipoVentaBadge tipo={n.tipoVenta} /></td>
                <td className="px-3 py-2 text-slate-600">{etiqueta(n.tipoDocto)}</td>
                <td className="px-3 py-2 text-right tabular-nums text-slate-700">{formatCLP(n.montoNegocio)}</td>
                <td className="px-3 py-2">
                  {puedeGestionar ? (
                    <form action={actualizarEstadoNegocio}>
                      <input type="hidden" name="id" value={n.recordId} />
                      <select
                        name="estadoNegocio"
                        defaultValue={n.estadoNegocio}
                        onChange={(e) => e.currentTarget.form?.requestSubmit()}
                        className="rounded-lg border border-slate-300 px-2 py-1 text-xs outline-none focus:border-slate-900"
                      >
                        <option value="MATRICULADO">Matriculado</option>
                        <option value="DE_BAJA">De Baja</option>
                        <option value="DESISTE">Desiste</option>
                      </select>
                    </form>
                  ) : (
                    etiqueta(n.estadoNegocio)
                  )}
                </td>
                {puedeGestionar && (
                  <td className="px-3 py-2 text-right">
                    <form action={eliminarNegocio} className="inline">
                      <input type="hidden" name="id" value={n.recordId} />
                      <button type="submit" className="text-xs text-red-500 hover:underline">Eliminar</button>
                    </form>
                  </td>
                )}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
