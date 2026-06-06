"use client";

import { useActionState, useEffect, useState } from "react";
import { guardarPrograma, eliminarPrograma } from "@/server/crud";
import type { ActionState } from "@/lib/types";
import { formatCLP, formatFecha } from "@/lib/format";

export interface ProgramaRow {
  codPrograma: string;
  descripcion: string;
  fechaInicio: string;
  fechaFin: string;
  valor: number | null;
  negociosCount: number;
}

const inputCls =
  "w-full rounded-lg border border-slate-300 px-3 py-2 text-sm outline-none focus:border-slate-900";
const labelCls = "mb-1 block text-xs font-medium text-slate-600";

export function ProgramasManager({
  programas,
  puedeGestionar,
}: {
  programas: ProgramaRow[];
  puedeGestionar: boolean;
}) {
  const [editing, setEditing] = useState<ProgramaRow | null>(null);
  const [abierto, setAbierto] = useState(false);
  const [state, formAction, pending] = useActionState<ActionState, FormData>(
    guardarPrograma,
    undefined,
  );

  useEffect(() => {
    if (state?.ok) {
      setEditing(null);
      setAbierto(false);
    }
  }, [state]);

  return (
    <div>
      {puedeGestionar && (
        <div className="mb-4">
          {!abierto ? (
            <button
              onClick={() => {
                setEditing(null);
                setAbierto(true);
              }}
              className="rounded-lg bg-slate-900 px-4 py-2 text-sm font-semibold text-white hover:bg-slate-700"
            >
              + Nuevo programa
            </button>
          ) : (
            <form
              key={editing?.codPrograma ?? "new"}
              action={formAction}
              className="rounded-xl border border-slate-200 bg-white p-4"
            >
              {editing && <input type="hidden" name="modo" value="edit" />}
              <div className="grid grid-cols-2 gap-3 md:grid-cols-3">
                <div>
                  <label className={labelCls}>Código *</label>
                  <input
                    name="codPrograma"
                    required
                    readOnly={!!editing}
                    defaultValue={editing?.codPrograma ?? ""}
                    className={inputCls}
                  />
                </div>
                <div className="col-span-2">
                  <label className={labelCls}>Descripción *</label>
                  <input name="descripcion" required defaultValue={editing?.descripcion ?? ""} className={inputCls} />
                </div>
                <div>
                  <label className={labelCls}>Fecha inicio *</label>
                  <input name="fechaInicio" type="date" required defaultValue={editing?.fechaInicio.slice(0, 10) ?? ""} className={inputCls} />
                </div>
                <div>
                  <label className={labelCls}>Fecha fin *</label>
                  <input name="fechaFin" type="date" required defaultValue={editing?.fechaFin.slice(0, 10) ?? ""} className={inputCls} />
                </div>
                <div>
                  <label className={labelCls}>Valor (CLP)</label>
                  <input name="valor" type="number" min="0" step="1" defaultValue={editing?.valor ?? ""} className={inputCls} />
                </div>
              </div>
              {state?.error && <p className="mt-2 text-xs text-red-600">{state.error}</p>}
              <div className="mt-3 flex gap-2">
                <button type="submit" disabled={pending} className="rounded-lg bg-slate-900 px-4 py-2 text-sm font-semibold text-white hover:bg-slate-700 disabled:opacity-60">
                  {pending ? "Guardando…" : editing ? "Actualizar" : "Crear"}
                </button>
                <button type="button" onClick={() => { setAbierto(false); setEditing(null); }} className="rounded-lg border border-slate-300 px-4 py-2 text-sm font-medium text-slate-600 hover:bg-slate-100">
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
              <th className="px-3 py-2 text-left">Código</th>
              <th className="px-3 py-2 text-left">Descripción</th>
              <th className="px-3 py-2 text-left">Inicio</th>
              <th className="px-3 py-2 text-left">Fin</th>
              <th className="px-3 py-2 text-right">Valor</th>
              <th className="px-3 py-2 text-center">Negocios</th>
              {puedeGestionar && <th className="px-3 py-2"></th>}
            </tr>
          </thead>
          <tbody>
            {programas.map((p) => (
              <tr key={p.codPrograma} className="border-b border-slate-100 hover:bg-slate-50">
                <td className="px-3 py-2 font-medium text-slate-900">{p.codPrograma}</td>
                <td className="px-3 py-2 text-slate-700">{p.descripcion}</td>
                <td className="px-3 py-2 text-slate-500">{formatFecha(p.fechaInicio)}</td>
                <td className="px-3 py-2 text-slate-500">{formatFecha(p.fechaFin)}</td>
                <td className="px-3 py-2 text-right text-slate-700">{p.valor !== null ? formatCLP(p.valor) : "—"}</td>
                <td className="px-3 py-2 text-center text-slate-600">{p.negociosCount}</td>
                {puedeGestionar && (
                  <td className="px-3 py-2 text-right whitespace-nowrap">
                    <button onClick={() => { setEditing(p); setAbierto(true); }} className="mr-3 text-xs text-slate-600 hover:underline">
                      Editar
                    </button>
                    {p.negociosCount === 0 && (
                      <form action={eliminarPrograma} className="inline">
                        <input type="hidden" name="id" value={p.codPrograma} />
                        <button type="submit" className="text-xs text-red-500 hover:underline">Eliminar</button>
                      </form>
                    )}
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
