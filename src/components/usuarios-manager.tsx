"use client";

import { useActionState, useEffect, useState } from "react";
import { guardarUsuario } from "@/server/crud";
import type { ActionState } from "@/lib/types";
import { etiqueta, formatFecha } from "@/lib/format";
import { Badge } from "@/components/badges";

export interface UsuarioRow {
  id: string;
  email: string;
  nombre: string;
  rol: string;
  activo: boolean;
  createdAt: string;
}

const inputCls =
  "w-full rounded-lg border border-slate-300 px-3 py-2 text-sm outline-none focus:border-slate-900";
const labelCls = "mb-1 block text-xs font-medium text-slate-600";

export function UsuariosManager({ usuarios }: { usuarios: UsuarioRow[] }) {
  const [editing, setEditing] = useState<UsuarioRow | null>(null);
  const [abierto, setAbierto] = useState(false);
  const [state, formAction, pending] = useActionState<ActionState, FormData>(
    guardarUsuario,
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
      <div className="mb-4">
        {!abierto ? (
          <button
            onClick={() => { setEditing(null); setAbierto(true); }}
            className="rounded-lg bg-slate-900 px-4 py-2 text-sm font-semibold text-white hover:bg-slate-700"
          >
            + Nuevo usuario
          </button>
        ) : (
          <form key={editing?.id ?? "new"} action={formAction} className="rounded-xl border border-slate-200 bg-white p-4">
            {editing && <input type="hidden" name="id" value={editing.id} />}
            <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
              <div>
                <label className={labelCls}>Email *</label>
                <input name="email" type="email" required readOnly={!!editing} defaultValue={editing?.email ?? ""} className={inputCls} />
              </div>
              <div>
                <label className={labelCls}>Nombre *</label>
                <input name="nombre" required defaultValue={editing?.nombre ?? ""} className={inputCls} />
              </div>
              <div>
                <label className={labelCls}>Rol *</label>
                <select name="rol" className={inputCls} defaultValue={editing?.rol ?? "COBRADOR"}>
                  <option value="ADMIN">Administrador</option>
                  <option value="SUPERVISOR">Supervisor</option>
                  <option value="COBRADOR">Cobrador</option>
                </select>
              </div>
              <div>
                <label className={labelCls}>{editing ? "Nueva contraseña" : "Contraseña *"}</label>
                <input name="password" type="password" required={!editing} placeholder={editing ? "(sin cambios)" : ""} className={inputCls} />
              </div>
              <div className="flex items-center gap-2">
                <input id="activo" name="activo" type="checkbox" defaultChecked={editing ? editing.activo : true} className="h-4 w-4" />
                <label htmlFor="activo" className="text-sm text-slate-600">Activo</label>
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

      <div className="overflow-x-auto rounded-xl border border-slate-200 bg-white">
        <table className="w-full text-sm">
          <thead className="border-b border-slate-200 bg-slate-50 text-xs uppercase text-slate-500">
            <tr>
              <th className="px-3 py-2 text-left">Nombre</th>
              <th className="px-3 py-2 text-left">Email</th>
              <th className="px-3 py-2 text-left">Rol</th>
              <th className="px-3 py-2 text-left">Estado</th>
              <th className="px-3 py-2 text-left">Creado</th>
              <th className="px-3 py-2"></th>
            </tr>
          </thead>
          <tbody>
            {usuarios.map((u) => (
              <tr key={u.id} className="border-b border-slate-100 hover:bg-slate-50">
                <td className="px-3 py-2 font-medium text-slate-900">{u.nombre}</td>
                <td className="px-3 py-2 text-slate-600">{u.email}</td>
                <td className="px-3 py-2 text-slate-600">{etiqueta(u.rol)}</td>
                <td className="px-3 py-2">
                  {u.activo ? <Badge color="green">Activo</Badge> : <Badge color="red">Inactivo</Badge>}
                </td>
                <td className="px-3 py-2 text-slate-500">{formatFecha(u.createdAt)}</td>
                <td className="px-3 py-2 text-right">
                  <button onClick={() => { setEditing(u); setAbierto(true); }} className="text-xs text-slate-600 hover:underline">
                    Editar
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
