"use client";

import { useActionState, useEffect, useMemo, useState } from "react";
import {
  crearNegocio,
  actualizarNegocio,
  actualizarEstadoNegocio,
  eliminarNegocio,
} from "@/server/crud";
import { eliminarOrdenCompra } from "@/server/actions";
import { importarNegocios } from "@/server/imports";
import { getDetalleNegocio } from "@/server/detalle";
import { ImportCSV, type ColConfig } from "@/components/import-csv";
import { Combobox, type OpcionCombobox } from "@/components/combobox";
import type { ActionState } from "@/lib/types";
import type { TodasLasOpciones } from "@/server/opciones";
import { formatCLP, formatMonto, etiqueta, formatFecha, toNumber } from "@/lib/format";
import { TipoVentaBadge } from "@/components/badges";

const MONEDAS = ["CLP", "PEN", "USD"] as const;
const TAM_PAGINA = 50;

/** Asegura que el valor actual del negocio aparezca en el <select> aunque haya sido desactivado. */
function conValorActual(activos: string[], valorActual: string | undefined): string[] {
  if (!valorActual || activos.includes(valorActual)) return activos;
  return [valorActual, ...activos];
}

// ─────────────────────────────────────────────
// Tipos
// ─────────────────────────────────────────────

export interface OcRow {
  id: string;
  tipoOC: string;
  numeroOC: string;
  entidadNombre: string;
  entidadRut: string | null;
  monto: number;
  estadoOC: string;
}

export interface NegocioRow {
  recordId: string;
  idAlumno: string;
  alumnoNombre: string;
  codPrograma: string;
  montoNegocio: number;
  moneda: string;
  tipoNegocio: string;
  tipoVenta: string;
  tipoDocto: string;
  estadoNegocio: string;
  fechaCreacion: string;
  totalOC: number;
  ordenesCount: number;
  idVendedor: string | null;
  vendedorNombre: string | null;
}

interface OcPendiente {
  tempId: string;
  tipoOC: "OTIC" | "OTEC" | "EMPRESA";
  numeroOC: string;
  entidadNombre: string;
  entidadRut: string;
  monto: string;
  estadoOC: "PENDIENTE" | "FACTURADA" | "PAGADA" | "ANULADA";
}

// ─────────────────────────────────────────────
// Config importación CSV
// ─────────────────────────────────────────────

function getColumnasNegocios(opciones: TodasLasOpciones): ColConfig[] { return [
  { campo: "recordId",     label: "Record ID",       requerido: true,  tipo: "numero", descripcion: "Número de 11 dígitos sin puntos ni guiones. Ej: 60178145390" },
  { campo: "rutAlumno",    label: "RUT del alumno",  requerido: true,  descripcion: "El alumno debe existir en el sistema con ese RUT" },
  { campo: "codPrograma",  label: "Código programa", requerido: true,  descripcion: "El programa debe existir en el sistema" },
  { campo: "montoNegocio", label: "Monto",           requerido: true,  tipo: "numero" },
  { campo: "moneda",       label: "Moneda",          requerido: false, valoresPermitidos: [...MONEDAS], descripcion: "Vacío = CLP" },
  { campo: "tipoNegocio",  label: "Tipo negocio",    requerido: true,  valoresPermitidos: opciones.tiposNegocio },
  { campo: "tipoVenta",    label: "Tipo venta",      requerido: true,  valoresPermitidos: opciones.tiposVenta },
  { campo: "tipoDocto",    label: "Tipo documento",  requerido: true,  valoresPermitidos: opciones.tiposDocto },
  { campo: "estadoNegocio",label: "Estado",          requerido: false, valoresPermitidos: opciones.estadosNegocio, descripcion: "Vacío = MATRICULADO" },
  // ── Orden de Compra 1 ──────────────────────────────────────────────────────
  { campo: "oc1Tipo",          label: "OC 1 - Tipo",         requerido: false, valoresPermitidos: ["OTIC","OTEC","EMPRESA"], descripcion: "Primera OC (opcional)" },
  { campo: "oc1Numero",        label: "OC 1 - N° OC",        requerido: false },
  { campo: "oc1EntidadNombre", label: "OC 1 - Entidad",      requerido: false },
  { campo: "oc1EntidadRut",    label: "OC 1 - RUT entidad",  requerido: false },
  { campo: "oc1Monto",         label: "OC 1 - Monto",        requerido: false, tipo: "numero" },
  // ── Orden de Compra 2 ──────────────────────────────────────────────────────
  { campo: "oc2Tipo",          label: "OC 2 - Tipo",         requerido: false, valoresPermitidos: ["OTIC","OTEC","EMPRESA"] },
  { campo: "oc2Numero",        label: "OC 2 - N° OC",        requerido: false },
  { campo: "oc2EntidadNombre", label: "OC 2 - Entidad",      requerido: false },
  { campo: "oc2EntidadRut",    label: "OC 2 - RUT entidad",  requerido: false },
  { campo: "oc2Monto",         label: "OC 2 - Monto",        requerido: false, tipo: "numero" },
  // ── Orden de Compra 3 ──────────────────────────────────────────────────────
  { campo: "oc3Tipo",          label: "OC 3 - Tipo",         requerido: false, valoresPermitidos: ["OTIC","OTEC","EMPRESA"] },
  { campo: "oc3Numero",        label: "OC 3 - N° OC",        requerido: false },
  { campo: "oc3EntidadNombre", label: "OC 3 - Entidad",      requerido: false },
  { campo: "oc3EntidadRut",    label: "OC 3 - RUT entidad",  requerido: false },
  { campo: "oc3Monto",         label: "OC 3 - Monto",        requerido: false, tipo: "numero" },
]; }

// ─────────────────────────────────────────────
// Estilos
// ─────────────────────────────────────────────

const inputCls =
  "w-full rounded-lg border border-slate-300 px-3 py-2 text-sm outline-none focus:border-slate-900 focus:ring-1 focus:ring-slate-900";
const inputSmCls =
  "w-full rounded-md border border-slate-300 px-2 py-1.5 text-xs outline-none focus:border-slate-900";
const labelCls = "mb-1 block text-xs font-medium text-slate-600";

// ─────────────────────────────────────────────
// Sección de OC (dinámica, pendientes de guardar)
// ─────────────────────────────────────────────

function SeccionOC({
  ocsSaved,        // OCs ya en DB (edición) — se traen bajo demanda
  cargandoOcsSaved,
  onEliminarOc,
  ocsPendientes,
  onChange,
  montoNegocio,
}: {
  ocsSaved: OcRow[];
  cargandoOcsSaved: boolean;
  onEliminarOc: (fd: FormData) => void;
  ocsPendientes: OcPendiente[];
  onChange: (ocs: OcPendiente[]) => void;
  montoNegocio: number;
}) {
  const agregar = () =>
    onChange([
      ...ocsPendientes,
      {
        tempId: Math.random().toString(36).slice(2),
        tipoOC: "OTIC",
        numeroOC: "",
        entidadNombre: "",
        entidadRut: "",
        monto: "",
        estadoOC: "PENDIENTE",
      },
    ]);

  const actualizar = (idx: number, campo: keyof OcPendiente, valor: string) =>
    onChange(
      ocsPendientes.map((oc, i) => (i === idx ? { ...oc, [campo]: valor } : oc)),
    );

  const quitar = (idx: number) =>
    onChange(ocsPendientes.filter((_, i) => i !== idx));

  const totalSaved  = ocsSaved.reduce((s, o) => s + o.monto, 0);
  const totalPend   = ocsPendientes.reduce((s, o) => s + (Number(o.monto) || 0), 0);
  const totalOC     = totalSaved + totalPend;
  const diferencia  = montoNegocio - totalOC;

  return (
    <div className="rounded-xl border border-slate-200 bg-slate-50 p-4">
      <div className="mb-3 flex items-center justify-between">
        <h4 className="text-xs font-bold uppercase tracking-wide text-slate-500">
          Órdenes de compra
        </h4>
        <button
          type="button"
          onClick={agregar}
          className="flex items-center gap-1 rounded-lg bg-indigo-600 px-3 py-1.5 text-xs font-semibold text-white hover:bg-indigo-500"
        >
          + Agregar OC
        </button>
      </div>

      {/* OCs ya guardadas (solo visible en edición, se traen bajo demanda) */}
      {cargandoOcsSaved && (
        <p className="mb-3 text-xs text-slate-400">Cargando OCs…</p>
      )}
      {!cargandoOcsSaved && ocsSaved.length > 0 && (
        <div className="mb-3 space-y-1.5">
          <p className="text-xs font-medium text-slate-400">OC guardadas</p>
          {ocsSaved.map((oc) => (
            <div
              key={oc.id}
              className="flex items-center justify-between rounded-lg border border-slate-200 bg-white px-3 py-2"
            >
              <div className="flex items-center gap-3 text-xs">
                <span className="rounded-full bg-indigo-100 px-2 py-0.5 font-semibold text-indigo-700">
                  {etiqueta(oc.tipoOC)}
                </span>
                <span className="text-slate-600">{oc.numeroOC}</span>
                <span className="text-slate-500">{oc.entidadNombre}</span>
                {oc.entidadRut && (
                  <span className="text-slate-400">{oc.entidadRut}</span>
                )}
                <span className="font-semibold text-slate-800">
                  {formatCLP(oc.monto)}
                </span>
                <span className="text-slate-400">{etiqueta(oc.estadoOC)}</span>
              </div>
              <form action={onEliminarOc}>
                <input type="hidden" name="id" value={oc.id} />
                <button
                  type="submit"
                  className="text-xs text-red-500 hover:underline"
                >
                  Eliminar
                </button>
              </form>
            </div>
          ))}
        </div>
      )}

      {/* OCs pendientes por agregar */}
      {ocsPendientes.length > 0 && (
        <div className="mb-3 space-y-2">
          {ocsPendientes.length > 0 && (
            <p className="text-xs font-medium text-slate-400">
              Nuevas OC (se guardarán al confirmar)
            </p>
          )}
          {ocsPendientes.map((oc, idx) => (
            <div
              key={oc.tempId}
              className="grid grid-cols-12 items-end gap-1.5 rounded-lg border border-indigo-200 bg-indigo-50 p-2"
            >
              {/* Tipo */}
              <div className="col-span-2">
                {idx === 0 && <p className={labelCls}>Tipo</p>}
                <select
                  value={oc.tipoOC}
                  onChange={(e) => actualizar(idx, "tipoOC", e.target.value)}
                  className={inputSmCls}
                >
                  <option value="OTIC">OTIC</option>
                  <option value="OTEC">OTEC</option>
                  <option value="EMPRESA">Empresa</option>
                </select>
              </div>
              {/* N° OC */}
              <div className="col-span-2">
                {idx === 0 && <p className={labelCls}>N° OC</p>}
                <input
                  type="text"
                  value={oc.numeroOC}
                  onChange={(e) => actualizar(idx, "numeroOC", e.target.value)}
                  placeholder="N° OC"
                  className={inputSmCls}
                />
              </div>
              {/* Entidad */}
              <div className="col-span-3">
                {idx === 0 && <p className={labelCls}>Entidad (nombre)</p>}
                <input
                  type="text"
                  value={oc.entidadNombre}
                  onChange={(e) =>
                    actualizar(idx, "entidadNombre", e.target.value)
                  }
                  placeholder="Nombre entidad"
                  className={inputSmCls}
                />
              </div>
              {/* RUT entidad */}
              <div className="col-span-2">
                {idx === 0 && <p className={labelCls}>RUT (opcional)</p>}
                <input
                  type="text"
                  value={oc.entidadRut}
                  onChange={(e) =>
                    actualizar(idx, "entidadRut", e.target.value)
                  }
                  placeholder="RUT"
                  className={inputSmCls}
                />
              </div>
              {/* Monto */}
              <div className="col-span-2">
                {idx === 0 && <p className={labelCls}>Monto</p>}
                <input
                  type="number"
                  value={oc.monto}
                  onChange={(e) => actualizar(idx, "monto", e.target.value)}
                  placeholder="0"
                  min="0.01"
                  step="0.01"
                  className={inputSmCls}
                />
              </div>
              {/* Botón quitar */}
              <div className="col-span-1 flex justify-center">
                {idx === 0 && <p className={labelCls}>&nbsp;</p>}
                <button
                  type="button"
                  onClick={() => quitar(idx)}
                  className="rounded-full p-1 text-red-500 hover:bg-red-100"
                  title="Quitar"
                >
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" />
                  </svg>
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Estado vacío */}
      {ocsSaved.length === 0 && ocsPendientes.length === 0 && (
        <p className="text-xs text-slate-400">
          Sin órdenes de compra. Usa "+ Agregar OC" para asociar una.
        </p>
      )}

      {/* Resumen totales */}
      {(ocsSaved.length + ocsPendientes.length) > 0 && (
        <div className="mt-3 flex flex-wrap items-center gap-4 rounded-lg bg-white px-3 py-2 text-xs">
          <span className="text-slate-500">
            Total OC:{" "}
            <strong className="text-indigo-700">{formatCLP(totalOC)}</strong>
          </span>
          <span className="text-slate-500">
            Monto negocio:{" "}
            <strong className="text-slate-800">
              {montoNegocio > 0 ? formatCLP(montoNegocio) : "—"}
            </strong>
          </span>
          {montoNegocio > 0 && (
            <span
              className={
                diferencia === 0
                  ? "font-semibold text-emerald-600"
                  : diferencia < 0
                    ? "font-semibold text-red-600"
                    : "font-semibold text-amber-600"
              }
            >
              {diferencia === 0
                ? "✓ Cubierto"
                : diferencia > 0
                  ? `Faltan ${formatCLP(diferencia)}`
                  : `Exceso ${formatCLP(Math.abs(diferencia))}`}
            </span>
          )}
        </div>
      )}
    </div>
  );
}

// ─────────────────────────────────────────────
// Formulario crear / editar negocio
// ─────────────────────────────────────────────

function FormNegocio({
  editing,
  opcionesAlumno,
  opcionesPrograma,
  opcionesVendedor,
  opciones,
  onCancel,
}: {
  editing: NegocioRow | null;
  opcionesAlumno: OpcionCombobox[];
  opcionesPrograma: OpcionCombobox[];
  opcionesVendedor: OpcionCombobox[];
  opciones: TodasLasOpciones;
  onCancel: () => void;
}) {
  const esEdicion = editing !== null;
  const [ocsPendientes, setOcsPendientes] = useState<OcPendiente[]>([]);
  const [ocsGuardadas, setOcsGuardadas] = useState<OcRow[]>([]);
  const [cargandoOcs, setCargandoOcs] = useState(false);
  const [montoInput, setMontoInput] = useState(
    editing ? String(editing.montoNegocio) : "",
  );

  const refrescarOcsGuardadas = (recordId: string) => {
    setCargandoOcs(true);
    getDetalleNegocio(recordId)
      .then((d) => setOcsGuardadas(d.ordenes))
      .finally(() => setCargandoOcs(false));
  };

  const eliminarOcYRefrescar = async (fd: FormData) => {
    await eliminarOrdenCompra(fd);
    if (editing) refrescarOcsGuardadas(editing.recordId);
  };

  const [stateCrear, dispatchCrear, pendingCrear] =
    useActionState<ActionState, FormData>(crearNegocio, undefined);
  const [stateActualizar, dispatchActualizar, pendingActualizar] =
    useActionState<ActionState, FormData>(actualizarNegocio, undefined);

  const state   = esEdicion ? stateActualizar : stateCrear;
  const dispatch = esEdicion ? dispatchActualizar : dispatchCrear;
  const pending  = esEdicion ? pendingActualizar : pendingCrear;

  useEffect(() => {
    if (state?.ok) {
      setOcsPendientes([]);
      onCancel();
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [state]);

  // Resetear OC pendientes al cambiar de negocio editado, y traer las OC guardadas
  useEffect(() => {
    setOcsPendientes([]);
    setOcsGuardadas([]);
    setMontoInput(editing ? String(editing.montoNegocio) : "");
    if (editing) refrescarOcsGuardadas(editing.recordId);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [editing?.recordId]);

  return (
    <form
      key={editing?.recordId ?? "new"}
      action={dispatch}
      className="rounded-xl border border-slate-200 bg-white p-4 space-y-5"
    >
      {esEdicion && (
        <input type="hidden" name="recordId" value={editing!.recordId} />
      )}
      {/* OCs pendientes serializadas */}
      <input
        type="hidden"
        name="ocsNuevas"
        value={JSON.stringify(ocsPendientes)}
      />

      <p className="text-xs font-semibold uppercase tracking-wide text-slate-400">
        {esEdicion
          ? `Editando negocio · ${editing!.recordId}`
          : "Nuevo negocio"}
      </p>

      {/* Record ID (solo creación) */}
      {!esEdicion && (
        <div>
          <label className={labelCls}>Record ID *</label>
          <input
            name="recordId"
            type="text"
            inputMode="numeric"
            pattern="[0-9]+"
            required
            placeholder="Ej: 60178145390 (11 dígitos)"
            className={inputCls}
          />
        </div>
      )}

      {/* Campos del negocio */}
      <div className="grid grid-cols-2 gap-3 md:grid-cols-3">
        <div className="col-span-2 md:col-span-1">
          <label className={labelCls}>Alumno *</label>
          <Combobox
            name="idAlumno"
            opciones={opcionesAlumno}
            valorDefecto={editing?.idAlumno}
            placeholder="Buscar por nombre o RUT…"
          />
        </div>

        <div className="col-span-2 md:col-span-1">
          <label className={labelCls}>Programa *</label>
          <Combobox
            name="codPrograma"
            opciones={opcionesPrograma}
            valorDefecto={editing?.codPrograma}
            placeholder="Buscar por código o nombre…"
          />
        </div>

        <div>
          <label className={labelCls}>Monto *</label>
          <input
            name="montoNegocio"
            type="number"
            min="0.01"
            step="0.01"
            required
            value={montoInput}
            onChange={(e) => setMontoInput(e.target.value)}
            className={inputCls}
          />
        </div>

        <div>
          <label className={labelCls}>Moneda *</label>
          <select
            name="moneda"
            className={inputCls}
            defaultValue={editing?.moneda ?? "CLP"}
          >
            {MONEDAS.map((m) => (
              <option key={m} value={m}>{etiqueta(m)}</option>
            ))}
          </select>
        </div>

        <div>
          <label className={labelCls}>Tipo negocio *</label>
          <select
            name="tipoNegocio"
            className={inputCls}
            defaultValue={editing?.tipoNegocio ?? opciones.tiposNegocio[0] ?? ""}
          >
            {conValorActual(opciones.tiposNegocio, editing?.tipoNegocio).map((v) => (
              <option key={v} value={v}>{etiqueta(v)}</option>
            ))}
          </select>
        </div>

        <div>
          <label className={labelCls}>Tipo venta *</label>
          <select
            name="tipoVenta"
            className={inputCls}
            defaultValue={editing?.tipoVenta ?? opciones.tiposVenta[0] ?? ""}
          >
            {conValorActual(opciones.tiposVenta, editing?.tipoVenta).map((v) => (
              <option key={v} value={v}>{etiqueta(v)}</option>
            ))}
          </select>
        </div>

        <div>
          <label className={labelCls}>Tipo documento *</label>
          <select
            name="tipoDocto"
            className={inputCls}
            defaultValue={editing?.tipoDocto ?? opciones.tiposDocto[0] ?? ""}
          >
            {conValorActual(opciones.tiposDocto, editing?.tipoDocto).map((v) => (
              <option key={v} value={v}>{etiqueta(v)}</option>
            ))}
          </select>
        </div>

        <div>
          <label className={labelCls}>Estado *</label>
          <select
            name="estadoNegocio"
            className={inputCls}
            defaultValue={editing?.estadoNegocio ?? opciones.estadosNegocio[0] ?? "MATRICULADO"}
          >
            {conValorActual(opciones.estadosNegocio, editing?.estadoNegocio).map((v) => (
              <option key={v} value={v}>{etiqueta(v)}</option>
            ))}
          </select>
        </div>

        <div className="col-span-2 md:col-span-1">
          <label className={labelCls}>Vendedor (opcional)</label>
          <Combobox
            name="idVendedor"
            opciones={opcionesVendedor}
            valorDefecto={editing?.idVendedor ?? undefined}
            placeholder="Sin vendedor asignado…"
          />
        </div>
      </div>

      {/* Sección OC */}
      <SeccionOC
        ocsSaved={ocsGuardadas}
        cargandoOcsSaved={cargandoOcs}
        onEliminarOc={eliminarOcYRefrescar}
        ocsPendientes={ocsPendientes}
        onChange={setOcsPendientes}
        montoNegocio={toNumber(montoInput)}
      />

      {state?.error && (
        <p className="text-xs text-red-600">{state.error}</p>
      )}

      <div className="flex gap-2">
        <button
          type="submit"
          disabled={pending}
          className="rounded-lg bg-slate-900 px-5 py-2 text-sm font-semibold text-white hover:bg-slate-700 disabled:opacity-60"
        >
          {pending
            ? "Guardando…"
            : esEdicion
              ? "Guardar cambios"
              : "Crear negocio"}
        </button>
        <button
          type="button"
          onClick={onCancel}
          className="rounded-lg border border-slate-300 px-4 py-2 text-sm font-medium text-slate-600 hover:bg-slate-100"
        >
          Cancelar
        </button>
      </div>
    </form>
  );
}

// ─────────────────────────────────────────────
// Manager principal
// ─────────────────────────────────────────────

export function NegociosManager({
  negocios,
  alumnos,
  programas,
  vendedores,
  opciones,
  puedeGestionar,
}: {
  negocios: NegocioRow[];
  alumnos: { idAlumno: string; nombre: string; rut: string }[];
  programas: { codPrograma: string; descripcion: string }[];
  vendedores: { id: string; nombre: string }[];
  opciones: TodasLasOpciones;
  puedeGestionar: boolean;
}) {
  // Almacena sólo el recordId (o "nuevo") — se deriva la fila viva desde `negocios`
  const [modoId, setModoId] = useState<string | "nuevo" | null>(null);
  const [q, setQ] = useState("");
  const [pagina, setPagina] = useState(1);

  const editingRow =
    modoId !== null && modoId !== "nuevo"
      ? (negocios.find((n) => n.recordId === modoId) ?? null)
      : null;

  const formAbierto = modoId !== null;

  const filtrados = useMemo(() => {
    const term = q.trim().toLowerCase();
    if (!term) return negocios;
    return negocios.filter(
      (n) =>
        n.recordId.toLowerCase().includes(term) ||
        n.alumnoNombre.toLowerCase().includes(term) ||
        n.codPrograma.toLowerCase().includes(term),
    );
  }, [negocios, q]);

  useEffect(() => {
    setPagina(1);
  }, [q]);

  const totalPaginas = Math.max(1, Math.ceil(filtrados.length / TAM_PAGINA));
  const paginaSegura = Math.min(pagina, totalPaginas);
  const visibles = filtrados.slice(
    (paginaSegura - 1) * TAM_PAGINA,
    paginaSegura * TAM_PAGINA,
  );

  const opcionesAlumno: OpcionCombobox[] = alumnos.map((a) => ({
    valor: a.idAlumno,
    etiqueta: a.nombre,
    subEtiqueta: a.rut || undefined,
  }));

  const opcionesPrograma: OpcionCombobox[] = programas.map((p) => ({
    valor: p.codPrograma,
    etiqueta: p.codPrograma,
    subEtiqueta: p.descripcion,
  }));

  const opcionesVendedor: OpcionCombobox[] = vendedores.map((v) => ({
    valor: v.id,
    etiqueta: v.nombre,
  }));

  return (
    <div>
      {puedeGestionar && (
        <div className="mb-4 space-y-3">
          <div className="flex flex-wrap items-center gap-2">
            {!formAbierto && (
              <button
                onClick={() => setModoId("nuevo")}
                className="rounded-lg bg-slate-900 px-4 py-2 text-sm font-semibold text-white hover:bg-slate-700"
              >
                + Nuevo negocio
              </button>
            )}
            {!formAbierto && (
              <ImportCSV
                titulo="Importar negocios desde CSV"
                ejemploUrl="/ejemplos/negocios_ejemplo.csv"
                columnas={getColumnasNegocios(opciones)}
                action={importarNegocios}
              />
            )}
          </div>

          {formAbierto && (
            <FormNegocio
              editing={editingRow}
              opcionesAlumno={opcionesAlumno}
              opcionesPrograma={opcionesPrograma}
              opcionesVendedor={opcionesVendedor}
              opciones={opciones}
              onCancel={() => setModoId(null)}
            />
          )}
        </div>
      )}

      {/* Buscador */}
      {!formAbierto && (
        <div className="mb-3">
          <input
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="Buscar por Record ID, alumno o programa…"
            className="w-full max-w-md rounded-lg border border-slate-300 px-3 py-2 text-sm outline-none focus:border-slate-900"
          />
        </div>
      )}

      {/* Tabla */}
      <div className="overflow-x-auto rounded-xl border border-slate-200 bg-white">
        <table className="w-full text-sm">
          <thead className="border-b border-slate-200 bg-slate-50 text-xs uppercase text-slate-500">
            <tr>
              <th className="px-3 py-2 text-left">Record ID</th>
              <th className="px-3 py-2 text-left">Fecha</th>
              <th className="px-3 py-2 text-left">Alumno</th>
              <th className="px-3 py-2 text-left">Programa</th>
              <th className="px-3 py-2 text-left">Tipo</th>
              <th className="px-3 py-2 text-left">Venta</th>
              <th className="px-3 py-2 text-left">Docto</th>
              <th className="px-3 py-2 text-right">Monto</th>
              <th className="px-3 py-2 text-center">OC</th>
              <th className="px-3 py-2 text-left">Vendedor</th>
              <th className="px-3 py-2 text-left">Estado</th>
              {puedeGestionar && <th className="px-3 py-2"></th>}
            </tr>
          </thead>
          <tbody>
            {visibles.length === 0 && (
              <tr>
                <td colSpan={puedeGestionar ? 11 : 10} className="px-3 py-8 text-center text-slate-400">
                  No hay negocios que coincidan con la búsqueda.
                </td>
              </tr>
            )}
            {visibles.map((n) => {
              const totalOC = n.totalOC;
              const ocDescubierta =
                n.tipoDocto === "ORDEN_COMPRA" && totalOC < n.montoNegocio;
              return (
                <tr
                  key={n.recordId}
                  className={
                    editingRow?.recordId === n.recordId
                      ? "border-b border-indigo-200 bg-indigo-50"
                      : "border-b border-slate-100 hover:bg-slate-50"
                  }
                >
                  <td className="px-3 py-2 font-mono text-xs text-slate-500">
                    {n.recordId}
                  </td>
                  <td className="px-3 py-2 text-slate-500">
                    {formatFecha(n.fechaCreacion)}
                  </td>
                  <td className="px-3 py-2 font-medium text-slate-900">
                    {n.alumnoNombre}
                  </td>
                  <td className="px-3 py-2 text-slate-600">{n.codPrograma}</td>
                  <td className="px-3 py-2 text-slate-600">
                    {etiqueta(n.tipoNegocio)}
                  </td>
                  <td className="px-3 py-2">
                    <TipoVentaBadge tipo={n.tipoVenta} />
                  </td>
                  <td className="px-3 py-2 text-slate-600">
                    {etiqueta(n.tipoDocto)}
                  </td>
                  <td className="px-3 py-2 text-right tabular-nums text-slate-700">
                    {formatMonto(n.montoNegocio, n.moneda)}
                    {n.moneda !== "CLP" && (
                      <span className="ml-1 rounded bg-slate-100 px-1 py-0.5 text-[10px] font-semibold text-slate-500">
                        {n.moneda}
                      </span>
                    )}
                  </td>
                  {/* Columna OC */}
                  <td className="px-3 py-2 text-center">
                    {n.ordenesCount > 0 ? (
                      <span
                        title={
                          ocDescubierta
                            ? `⚠ OC insuficiente — Total OC: ${formatCLP(totalOC)} · Faltan: ${formatCLP(n.montoNegocio - totalOC)}`
                            : `${n.ordenesCount} OC · Total: ${formatCLP(totalOC)}`
                        }
                        className={`inline-flex cursor-help items-center gap-1 rounded-full px-2 py-0.5 text-xs font-semibold ${
                          ocDescubierta
                            ? "bg-red-100 text-red-700"
                            : "bg-indigo-100 text-indigo-700"
                        }`}
                      >
                        {n.ordenesCount}
                      </span>
                    ) : n.tipoDocto === "ORDEN_COMPRA" ? (
                      <span
                        title={`⚠ Sin OC — Faltan: ${formatCLP(n.montoNegocio)}`}
                        className="inline-flex cursor-help items-center rounded-full bg-red-100 px-2 py-0.5 text-xs font-semibold text-red-700"
                      >
                        0
                      </span>
                    ) : (
                      <span className="text-slate-300">—</span>
                    )}
                  </td>
                  <td className="px-3 py-2 text-slate-500 text-xs">
                    {n.vendedorNombre ?? <span className="text-slate-300">—</span>}
                  </td>
                  <td className="px-3 py-2">
                    {puedeGestionar ? (
                      <form action={actualizarEstadoNegocio}>
                        <input type="hidden" name="id" value={n.recordId} />
                        <select
                          name="estadoNegocio"
                          defaultValue={n.estadoNegocio}
                          onChange={(e) =>
                            e.currentTarget.form?.requestSubmit()
                          }
                          className="rounded-lg border border-slate-300 px-2 py-1 text-xs outline-none focus:border-slate-900"
                        >
                          {conValorActual(opciones.estadosNegocio, n.estadoNegocio).map((v) => (
                            <option key={v} value={v}>{etiqueta(v)}</option>
                          ))}
                        </select>
                      </form>
                    ) : (
                      etiqueta(n.estadoNegocio)
                    )}
                  </td>
                  {puedeGestionar && (
                    <td className="px-3 py-2 text-right whitespace-nowrap">
                      <button
                        onClick={() => {
                          setModoId(n.recordId);
                          window.scrollTo({ top: 0, behavior: "smooth" });
                        }}
                        className="mr-3 text-xs text-indigo-600 hover:underline"
                      >
                        Editar
                      </button>
                      <form action={eliminarNegocio} className="inline">
                        <input type="hidden" name="id" value={n.recordId} />
                        <button
                          type="submit"
                          className="text-xs text-red-500 hover:underline"
                        >
                          Eliminar
                        </button>
                      </form>
                    </td>
                  )}
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {/* ── Paginación ── */}
      <div className="mt-3 flex items-center justify-between text-xs text-slate-400">
        <span>
          {filtrados.length} de {negocios.length} negocios
          {totalPaginas > 1 ? ` · página ${paginaSegura} de ${totalPaginas}` : ""}
        </span>
        {totalPaginas > 1 && (
          <div className="flex items-center gap-2">
            <button
              type="button"
              disabled={paginaSegura <= 1}
              onClick={() => setPagina((p) => Math.max(1, p - 1))}
              className="rounded-lg border border-slate-300 px-3 py-1.5 font-medium text-slate-600 hover:bg-slate-100 disabled:opacity-40"
            >
              Anterior
            </button>
            <button
              type="button"
              disabled={paginaSegura >= totalPaginas}
              onClick={() => setPagina((p) => Math.min(totalPaginas, p + 1))}
              className="rounded-lg border border-slate-300 px-3 py-1.5 font-medium text-slate-600 hover:bg-slate-100 disabled:opacity-40"
            >
              Siguiente
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
