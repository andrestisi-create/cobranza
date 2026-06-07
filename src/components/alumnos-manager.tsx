"use client";

import { useActionState, useEffect, useState } from "react";
import { guardarAlumno, eliminarAlumno } from "@/server/crud";
import { importarAlumnos } from "@/server/imports";
import { ImportCSV, type ColConfig } from "@/components/import-csv";
import type { ActionState } from "@/lib/types";

const COLUMNAS_ALUMNOS: ColConfig[] = [
  { campo: "nombre",          label: "Nombre",           requerido: true },
  { campo: "apellidoPaterno", label: "Apellido paterno", requerido: true },
  { campo: "segundoNombre",   label: "Segundo nombre",   requerido: false },
  { campo: "apellidoMaterno", label: "Apellido materno", requerido: false },
  { campo: "rut",             label: "RUT",              requerido: false, descripcion: "Ej: 12.345.678-9 (debe ser único)" },
  { campo: "email",           label: "Email",            requerido: false },
  { campo: "telefono",        label: "Teléfono",         requerido: false },
  { campo: "direccion",       label: "Dirección",        requerido: false },
  { campo: "fechaNacimiento", label: "Fecha nacimiento", requerido: false, tipo: "fecha" },
];

export interface AlumnoRow {
  idAlumno: string;
  nombre: string;
  segundoNombre: string | null;
  apellidoPaterno: string;
  apellidoMaterno: string | null;
  rut: string | null;
  email: string | null;
  telefono: string | null;
  direccion: string | null;
  fechaNacimiento: string | null;
  negociosCount: number;
}

const inputCls =
  "w-full rounded-lg border border-slate-300 px-3 py-2 text-sm outline-none focus:border-slate-900";
const labelCls = "mb-1 block text-xs font-medium text-slate-600";

export function AlumnosManager({
  alumnos,
  puedeGestionar,
}: {
  alumnos: AlumnoRow[];
  puedeGestionar: boolean;
}) {
  const [editing, setEditing] = useState<AlumnoRow | null>(null);
  const [abierto, setAbierto] = useState(false);
  const [state, formAction, pending] = useActionState<ActionState, FormData>(
    guardarAlumno,
    undefined,
  );

  useEffect(() => {
    if (state?.ok) {
      setEditing(null);
      setAbierto(false);
    }
  }, [state]);

  const editar = (a: AlumnoRow) => {
    setEditing(a);
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
          {/* Acciones superiores */}
          <div className="flex flex-wrap items-center gap-2">
            {!abierto && (
              <button
                onClick={nuevo}
                className="rounded-lg bg-slate-900 px-4 py-2 text-sm font-semibold text-white hover:bg-slate-700"
              >
                + Nuevo alumno
              </button>
            )}
            {!abierto && (
              <ImportCSV
                titulo="Importar alumnos desde CSV"
                ejemploUrl="/ejemplos/alumnos_ejemplo.csv"
                columnas={COLUMNAS_ALUMNOS}
                action={importarAlumnos}
              />
            )}
          </div>

          {/* Formulario de nuevo alumno */}
          {abierto && (
            <form
              key={editing?.idAlumno ?? "new"}
              action={formAction}
              className="rounded-xl border border-slate-200 bg-white p-4"
            >
              {editing && <input type="hidden" name="id" value={editing.idAlumno} />}
              <div className="grid grid-cols-2 gap-3 md:grid-cols-3">
                <div>
                  <label className={labelCls}>Nombre *</label>
                  <input name="nombre" required defaultValue={editing?.nombre ?? ""} className={inputCls} />
                </div>
                <div>
                  <label className={labelCls}>Segundo nombre</label>
                  <input name="segundoNombre" defaultValue={editing?.segundoNombre ?? ""} className={inputCls} />
                </div>
                <div>
                  <label className={labelCls}>Apellido paterno *</label>
                  <input name="apellidoPaterno" required defaultValue={editing?.apellidoPaterno ?? ""} className={inputCls} />
                </div>
                <div>
                  <label className={labelCls}>Apellido materno</label>
                  <input name="apellidoMaterno" defaultValue={editing?.apellidoMaterno ?? ""} className={inputCls} />
                </div>
                <div>
                  <label className={labelCls}>RUT</label>
                  <input name="rut" defaultValue={editing?.rut ?? ""} className={inputCls} />
                </div>
                <div>
                  <label className={labelCls}>Fecha nacimiento</label>
                  <input name="fechaNacimiento" type="date" defaultValue={editing?.fechaNacimiento?.slice(0, 10) ?? ""} className={inputCls} />
                </div>
                <div>
                  <label className={labelCls}>Email</label>
                  <input name="email" type="email" defaultValue={editing?.email ?? ""} className={inputCls} />
                </div>
                <div>
                  <label className={labelCls}>Teléfono</label>
                  <input name="telefono" defaultValue={editing?.telefono ?? ""} className={inputCls} />
                </div>
                <div className="md:col-span-1 col-span-2">
                  <label className={labelCls}>Dirección</label>
                  <input name="direccion" defaultValue={editing?.direccion ?? ""} className={inputCls} />
                </div>
              </div>
              {state?.error && <p className="mt-2 text-xs text-red-600">{state.error}</p>}
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
              <th className="px-3 py-2 text-left">RUT</th>
              <th className="px-3 py-2 text-left">Contacto</th>
              <th className="px-3 py-2 text-center">Negocios</th>
              {puedeGestionar && <th className="px-3 py-2"></th>}
            </tr>
          </thead>
          <tbody>
            {alumnos.map((a) => (
              <tr key={a.idAlumno} className="border-b border-slate-100 hover:bg-slate-50">
                <td className="px-3 py-2 font-medium text-slate-900">
                  {[a.nombre, a.segundoNombre, a.apellidoPaterno, a.apellidoMaterno].filter(Boolean).join(" ")}
                </td>
                <td className="px-3 py-2 text-slate-600">{a.rut ?? "—"}</td>
                <td className="px-3 py-2 text-slate-600">
                  <div>{a.email ?? "—"}</div>
                  <div className="text-xs text-slate-400">{a.telefono ?? ""}</div>
                </td>
                <td className="px-3 py-2 text-center text-slate-600">{a.negociosCount}</td>
                {puedeGestionar && (
                  <td className="px-3 py-2 text-right whitespace-nowrap">
                    <button onClick={() => editar(a)} className="mr-3 text-xs text-slate-600 hover:underline">
                      Editar
                    </button>
                    {a.negociosCount === 0 && (
                      <form action={eliminarAlumno} className="inline">
                        <input type="hidden" name="id" value={a.idAlumno} />
                        <button type="submit" className="text-xs text-red-500 hover:underline">
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
