"use client";

import { useActionState, useEffect, useState } from "react";
import { guardarVendedor, eliminarVendedor } from "@/server/crud";
import type { ActionState } from "@/lib/types";

export interface VendedorRow {
  id: string;
  nombre: string;
  email: string | null;
  telefono: string | null;
  activo: boolean;
  negociosCount: number;
}

const inputCls =
  "w-full rounded-lg border border-slate-300 px-3 py-2 text-sm outline-none focus:border-slate-900";
const labelCls = "mb-1 block text-xs font-medium text-slate-600";

export function VendedoresManager({
  vendedores,
  puedeGestionar,
}: {
  vendedores: VendedorRow[];
  puedeGestionar: boolean;
}) {
  const [editing, setEditing] = useState<VendedorRow | null>(null);
  const [abierto, setAbierto] = useState(false);
  const [state, formAction, pending] = useActionState<ActionState, FormData>(
    guardarVendedor,
    undefined,
  );

  useEffect(() => {
    if (state?.ok) {
      setEditing(null);
      setAbierto(false);
    }
  }, [state]);

  const editar = (v: VendedorRow) => {
    setEditing(v);
    setAbierto(true);
  };
  const nuevo = () => {
    setEditing(null);
    setAbierto(true);
  };

  return (
    <div>
      {puedeGestionar && (
        <div className="mb-4 space-y-3">
          <div className="flex flex-wrap items-center gap-2">
            {!abierto && (
              <button
                onClick={nuevo}
                className="rounded-lg bg-slate-900 px-4 py-2 text-sm font-semibold text-white hover:bg-slate-700"
              >
                + Nuevo vendedor
              </button>
            )}
          </div>

          {abierto && (
            <form
              key={editing?.id ?? "new"}
              action={formAction}
              className="rounded-xl border border-slate-200 bg-white p-4"
            >
              {editing && <input type="hidden" name="id" value={editing.id} />}
              <p className="mb-3 text-xs font-semibold uppercase tracking-wide text-slate-400">
                {editing ? `Editando: ${editing.nombre}` : "Nuevo vendedor"}
              </p>
              <div className="grid grid-cols-2 gap-3 md:grid-cols-3">
                <div>
                  <label className={labelCls}>Nombre *</label>
                  <input
                    name="nombre"
                    required
                    defaultValue={editing?.nombre ?? ""}
                    className={inputCls}
                  />
                </div>
                <div>
                  <label className={labelCls}>Email</label>
                  <input
                    name="email"
                    type="email"
                    defaultValue={editing?.email ?? ""}
                    className={inputCls}
                  />
                </div>
                <div>
                  <label className={labelCls}>Teléfono</label>
                  <input
                    name="telefono"
                    defaultValue={editing?.telefono ?? ""}
                    className={inputCls}
                  />
                </div>
                <div className="flex items-center gap-2 pt-5">
                  <input
                    id="activo"
                    name="activo"
                    type="checkbox"
                    defaultChecked={editing?.activo ?? true}
                    value="true"
                    className="h-4 w-4 rounded border-slate-300"
                  />
                  <label htmlFor="activo" className="text-sm text-slate-700">
                    Activo
                  </label>
                </div>
              </div>
              {state?.error && (
                <p className="mt-2 text-xs text-red-600">{state.error}</p>
              )}
              <div className="mt-3 flex gap-2">
                <button
                  type="submit"
                  disabled={pending}
                  className="rounded-lg bg-slate-900 px-4 py-2 text-sm font-semibold text-white hover:bg-slate-700 disabled:opacity-60"
                >
                  {pending ? "Guardando…" : editing ? "Actualizar" : "Crear"}
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setAbierto(false);
                    setEditing(null);
                  }}
                  className="rounded-lg border border-slate-300 px-4 py-2 text-sm font-medium text-slate-600 hover:bg-slate-100"
                >
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
              <th className="px-3 py-2 text-left">Nombre</th>
              <th className="px-3 py-2 text-left">Email</th>
              <th className="px-3 py-2 text-left">Teléfono</th>
              <th className="px-3 py-2 text-center">Estado</th>
              <th className="px-3 py-2 text-center">Negocios</th>
              {puedeGestionar && <th className="px-3 py-2"></th>}
            </tr>
          </thead>
          <tbody>
            {vendedores.length === 0 && (
              <tr>
                <td
                  colSpan={puedeGestionar ? 6 : 5}
                  className="px-3 py-8 text-center text-slate-400"
                >
                  Sin vendedores registrados.
                </td>
              </tr>
            )}
            {vendedores.map((v) => (
              <tr
                key={v.id}
                className="border-b border-slate-100 hover:bg-slate-50"
              >
                <td className="px-3 py-2 font-medium text-slate-900">
                  {v.nombre}
                </td>
                <td className="px-3 py-2 text-slate-600">{v.email ?? "—"}</td>
                <td className="px-3 py-2 text-slate-600">
                  {v.telefono ?? "—"}
                </td>
                <td className="px-3 py-2 text-center">
                  {v.activo ? (
                    <span className="inline-flex items-center rounded-full bg-emerald-100 px-2 py-0.5 text-xs font-semibold text-emerald-700">
                      Activo
                    </span>
                  ) : (
                    <span className="inline-flex items-center rounded-full bg-slate-100 px-2 py-0.5 text-xs font-semibold text-slate-500">
                      Inactivo
                    </span>
                  )}
                </td>
                <td className="px-3 py-2 text-center text-slate-600">
                  {v.negociosCount}
                </td>
                {puedeGestionar && (
                  <td className="px-3 py-2 text-right whitespace-nowrap">
                    <button
                      onClick={() => editar(v)}
                      className="mr-3 text-xs text-slate-600 hover:underline"
                    >
                      Editar
                    </button>
                    {v.negociosCount === 0 && (
                      <form action={eliminarVendedor} className="inline">
                        <input type="hidden" name="id" value={v.id} />
                        <button
                          type="submit"
                          className="text-xs text-red-500 hover:underline"
                        >
                          Eliminar
                        </button>
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
