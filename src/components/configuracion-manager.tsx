"use client";

import { useActionState, useEffect, useRef } from "react";
import { crearOpcion, eliminarOpcion, toggleActivoOpcion } from "@/server/catalogos";
import type { Catalogo, OpcionCatalogoView } from "@/server/opciones";
import type { ActionState } from "@/lib/types";

const TITULOS: Record<Catalogo, string> = {
  ESTADO_NEGOCIO: "Estado de Negocio",
  TIPO_NEGOCIO: "Tipo de Negocio",
  TIPO_VENTA: "Tipo de Venta",
  TIPO_DOCTO: "Tipo de Documento",
};

const ORDEN_CATALOGOS: Catalogo[] = ["ESTADO_NEGOCIO", "TIPO_NEGOCIO", "TIPO_VENTA", "TIPO_DOCTO"];

function FormAgregar({ catalogo }: { catalogo: Catalogo }) {
  const [state, formAction, pending] = useActionState<ActionState, FormData>(
    crearOpcion,
    undefined,
  );
  const ref = useRef<HTMLFormElement>(null);

  useEffect(() => {
    if (state?.ok) ref.current?.reset();
  }, [state]);

  return (
    <form ref={ref} action={formAction} className="mt-3 flex items-start gap-2">
      <input type="hidden" name="catalogo" value={catalogo} />
      <div className="flex-1">
        <input
          name="valor"
          type="text"
          placeholder="Nuevo valor…"
          required
          maxLength={60}
          className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm outline-none focus:border-slate-900"
        />
        {state?.error && <p className="mt-1 text-xs text-red-600">{state.error}</p>}
      </div>
      <button
        type="submit"
        disabled={pending}
        className="rounded-lg bg-slate-900 px-4 py-2 text-sm font-semibold text-white transition hover:bg-slate-700 disabled:opacity-60"
      >
        {pending ? "Agregando…" : "+ Agregar"}
      </button>
    </form>
  );
}

function FilaOpcion({ opcion }: { opcion: OpcionCatalogoView }) {
  const [state, formAction, pending] = useActionState<ActionState, FormData>(
    eliminarOpcion,
    undefined,
  );

  return (
    <li className="border-b border-slate-100 px-3 py-2 last:border-0">
      <div className="flex items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <span
            className={
              opcion.activo
                ? "text-sm text-slate-800"
                : "text-sm text-slate-400 line-through"
            }
          >
            {opcion.valor}
          </span>
          {!opcion.activo && (
            <span className="rounded-full bg-slate-100 px-2 py-0.5 text-[10px] font-medium text-slate-500">
              Inactivo
            </span>
          )}
        </div>
        <div className="flex items-center gap-3">
          <form action={toggleActivoOpcion}>
            <input type="hidden" name="id" value={opcion.id} />
            <input type="hidden" name="activo" value={String(opcion.activo)} />
            <button type="submit" className="text-xs text-slate-500 hover:underline">
              {opcion.activo ? "Desactivar" : "Activar"}
            </button>
          </form>
          <form action={formAction}>
            <input type="hidden" name="id" value={opcion.id} />
            <button
              type="submit"
              disabled={pending}
              className="text-xs text-red-500 hover:underline disabled:opacity-50"
            >
              Eliminar
            </button>
          </form>
        </div>
      </div>
      {state?.error && <p className="mt-1 text-xs text-red-600">{state.error}</p>}
    </li>
  );
}

function CatalogoSection({
  catalogo,
  opciones,
}: {
  catalogo: Catalogo;
  opciones: OpcionCatalogoView[];
}) {
  const activos = opciones.filter((o) => o.activo).length;
  return (
    <section className="rounded-xl border border-slate-200 bg-white p-5">
      <h2 className="text-sm font-bold text-slate-800">{TITULOS[catalogo]}</h2>
      <p className="mt-0.5 text-xs text-slate-400">
        {activos} valor{activos === 1 ? "" : "es"} activo{activos === 1 ? "" : "s"}
      </p>
      <ul className="mt-3 rounded-lg border border-slate-100">
        {opciones.length === 0 && (
          <li className="px-3 py-4 text-center text-sm text-slate-400">
            Sin valores configurados.
          </li>
        )}
        {opciones.map((o) => (
          <FilaOpcion key={o.id} opcion={o} />
        ))}
      </ul>
      <FormAgregar catalogo={catalogo} />
    </section>
  );
}

export function ConfiguracionManager({
  catalogos,
}: {
  catalogos: Record<Catalogo, OpcionCatalogoView[]>;
}) {
  return (
    <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
      {ORDEN_CATALOGOS.map((c) => (
        <CatalogoSection key={c} catalogo={c} opciones={catalogos[c]} />
      ))}
    </div>
  );
}
