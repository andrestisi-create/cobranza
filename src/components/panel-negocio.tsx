"use client";

import { useActionState, useEffect, useRef } from "react";
import type { NegocioCobranza } from "@/server/queries";
import {
  registrarPago,
  crearOrdenCompra,
  registrarDocumento,
  eliminarPago,
} from "@/server/actions";
import type { ActionState } from "@/lib/types";
import { formatCLP, formatFecha, etiqueta } from "@/lib/format";
import {
  EstadoNegocioBadge,
  EstadoCobranzaBadge,
  TipoVentaBadge,
  EstadoOCBadge,
  Badge,
} from "@/components/badges";

const inputCls =
  "w-full rounded-lg border border-slate-300 px-3 py-2 text-sm outline-none focus:border-slate-900 focus:ring-1 focus:ring-slate-900";
const labelCls = "mb-1 block text-xs font-medium text-slate-600";

type AccionForm = (prev: ActionState, fd: FormData) => Promise<ActionState>;

function FormAccion({
  action,
  recordId,
  submitLabel,
  children,
}: {
  action: AccionForm;
  recordId: string;
  submitLabel: string;
  children: React.ReactNode;
}) {
  const [state, formAction, pending] = useActionState(action, undefined);
  const ref = useRef<HTMLFormElement>(null);

  useEffect(() => {
    if (state?.ok) ref.current?.reset();
  }, [state]);

  return (
    <form ref={ref} action={formAction} className="space-y-2 rounded-lg bg-slate-50 p-3">
      <input type="hidden" name="recordId" value={recordId} />
      {children}
      {state?.error && <p className="text-xs text-red-600">{state.error}</p>}
      {state?.ok && <p className="text-xs text-emerald-600">Guardado.</p>}
      <button
        type="submit"
        disabled={pending}
        className="w-full rounded-lg bg-slate-900 px-3 py-2 text-sm font-semibold text-white transition hover:bg-slate-700 disabled:opacity-60"
      >
        {pending ? "Guardando…" : submitLabel}
      </button>
    </form>
  );
}

function Seccion({ titulo, children }: { titulo: string; children: React.ReactNode }) {
  return (
    <section className="mb-6">
      <h3 className="mb-2 text-sm font-bold uppercase tracking-wide text-slate-400">
        {titulo}
      </h3>
      {children}
    </section>
  );
}

function Dato({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div>
      <dt className="text-xs text-slate-400">{label}</dt>
      <dd className="text-sm text-slate-800">{value || "—"}</dd>
    </div>
  );
}

export function PanelNegocio({
  negocio,
  puedeEliminar,
}: {
  negocio: NegocioCobranza;
  puedeEliminar: boolean;
}) {
  const n = negocio;

  return (
    <div>
      {/* Resumen de cobranza */}
      <Seccion titulo="Resumen de cobranza">
        <div className="rounded-xl border border-slate-200 p-4">
          <div className="mb-3 flex flex-wrap items-center gap-2">
            <EstadoCobranzaBadge estado={n.estadoCobranza} />
            <EstadoNegocioBadge estado={n.estadoNegocio} />
            <TipoVentaBadge tipo={n.tipoVenta} />
            <Badge color="slate">{etiqueta(n.tipoNegocio)}</Badge>
            {n.esSence &&
              (n.tieneDocumento ? (
                <Badge color="green">Con documento</Badge>
              ) : (
                <Badge color="amber">Sin documento</Badge>
              ))}
          </div>
          <div className="grid grid-cols-3 gap-3 text-center">
            <div>
              <div className="text-xs text-slate-400">Monto</div>
              <div className="text-sm font-bold text-slate-900">{formatCLP(n.montoNegocio)}</div>
            </div>
            <div>
              <div className="text-xs text-slate-400">Pagado</div>
              <div className="text-sm font-bold text-emerald-600">{formatCLP(n.totalPagado)}</div>
            </div>
            <div>
              <div className="text-xs text-slate-400">Saldo</div>
              <div className="text-sm font-bold text-red-600">{formatCLP(n.saldo)}</div>
            </div>
          </div>
          <div className="mt-3 h-2 w-full overflow-hidden rounded-full bg-slate-100">
            <div
              className="h-full rounded-full bg-emerald-500"
              style={{ width: `${n.porcentaje}%` }}
            />
          </div>
          <div className="mt-1 text-right text-xs text-slate-400">{n.porcentaje}% pagado</div>
        </div>
      </Seccion>

      {/* Datos del alumno */}
      <Seccion titulo="Alumno">
        <dl className="grid grid-cols-2 gap-3 rounded-xl border border-slate-200 p-4">
          <div className="col-span-2">
            <Dato label="Nombre" value={n.alumno.nombreCompleto} />
          </div>
          <Dato label="RUT" value={n.alumno.rut} />
          <Dato label="Teléfono" value={n.alumno.telefono} />
          <div className="col-span-2">
            <Dato label="Email" value={n.alumno.email} />
          </div>
          <div className="col-span-2">
            <Dato label="Dirección" value={n.alumno.direccion} />
          </div>
          <Dato label="Programa" value={`${n.codPrograma} · ${n.programaDescripcion}`} />
          <Dato label="Creado" value={formatFecha(n.fechaCreacion)} />
        </dl>
      </Seccion>

      {/* Pagos */}
      <Seccion titulo={`Pagos (${n.pagos.length})`}>
        <div className="mb-3 space-y-2">
          {n.pagos.length === 0 && (
            <p className="rounded-lg bg-slate-50 px-3 py-2 text-sm text-slate-400">
              Sin pagos registrados.
            </p>
          )}
          {n.pagos.map((p) => (
            <div
              key={p.id}
              className="flex items-center justify-between rounded-lg border border-slate-200 px-3 py-2"
            >
              <div>
                <div className="text-sm font-semibold text-slate-900">{formatCLP(p.montoPago)}</div>
                <div className="text-xs text-slate-400">
                  {formatFecha(p.fechaPago)} · {etiqueta(p.medioPago)}
                  {p.referencia ? ` · ${p.referencia}` : ""}
                </div>
              </div>
              {puedeEliminar && (
                <form action={eliminarPago}>
                  <input type="hidden" name="id" value={p.id} />
                  <button
                    type="submit"
                    className="text-xs text-red-500 hover:underline"
                    title="Eliminar pago"
                  >
                    Eliminar
                  </button>
                </form>
              )}
            </div>
          ))}
        </div>

        <FormAccion action={registrarPago} recordId={n.recordId} submitLabel="Registrar pago">
          <div className="grid grid-cols-2 gap-2">
            <div>
              <label className={labelCls}>Monto</label>
              <input name="montoPago" type="number" min="1" step="1" required className={inputCls} />
            </div>
            <div>
              <label className={labelCls}>Fecha</label>
              <input name="fechaPago" type="date" className={inputCls} />
            </div>
          </div>
          <div>
            <label className={labelCls}>Medio de pago</label>
            <select name="medioPago" className={inputCls} defaultValue="TRANSFERENCIA">
              <option value="TRANSFERENCIA">Transferencia</option>
              <option value="CHEQUE">Cheque</option>
              <option value="EFECTIVO">Efectivo</option>
              <option value="TARJETA">Tarjeta</option>
              <option value="OTRO">Otro</option>
            </select>
          </div>
          <div>
            <label className={labelCls}>Referencia (opcional)</label>
            <input name="referencia" type="text" className={inputCls} placeholder="N° transferencia, cheque…" />
          </div>
        </FormAccion>
      </Seccion>

      {/* Órdenes de compra (solo Sence) */}
      {n.esSence && (
        <Seccion titulo={`Órdenes de compra (${n.ordenes.length})`}>
          <div className="mb-2 flex items-center justify-between rounded-lg bg-indigo-50 px-3 py-2 text-xs">
            <span className="text-indigo-700">Total comprometido en OC</span>
            <span className="font-bold text-indigo-900">{formatCLP(n.totalOC)}</span>
          </div>
          <div className="mb-3 space-y-2">
            {n.ordenes.length === 0 && (
              <p className="rounded-lg bg-slate-50 px-3 py-2 text-sm text-slate-400">
                Sin órdenes de compra.
              </p>
            )}
            {n.ordenes.map((oc) => (
              <div key={oc.id} className="rounded-lg border border-slate-200 px-3 py-2">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Badge color={oc.tipoOC === "OTIC" ? "indigo" : "slate"}>
                      {etiqueta(oc.tipoOC)}
                    </Badge>
                    <span className="text-sm font-semibold text-slate-900">{oc.numeroOC}</span>
                  </div>
                  <EstadoOCBadge estado={oc.estadoOC} />
                </div>
                <div className="mt-1 flex items-center justify-between">
                  <span className="text-xs text-slate-500">{oc.entidadNombre}</span>
                  <span className="text-sm font-bold text-slate-800">{formatCLP(oc.monto)}</span>
                </div>
              </div>
            ))}
          </div>

          <FormAccion action={crearOrdenCompra} recordId={n.recordId} submitLabel="Agregar OC">
            <div className="grid grid-cols-2 gap-2">
              <div>
                <label className={labelCls}>Tipo</label>
                <select name="tipoOC" className={inputCls} defaultValue="OTIC">
                  <option value="OTIC">OTIC</option>
                  <option value="EMPRESA">Empresa</option>
                </select>
              </div>
              <div>
                <label className={labelCls}>N° OC</label>
                <input name="numeroOC" type="text" required className={inputCls} />
              </div>
            </div>
            <div>
              <label className={labelCls}>OTIC / Empresa</label>
              <input name="entidadNombre" type="text" required className={inputCls} />
            </div>
            <div className="grid grid-cols-2 gap-2">
              <div>
                <label className={labelCls}>RUT entidad</label>
                <input name="entidadRut" type="text" className={inputCls} />
              </div>
              <div>
                <label className={labelCls}>Monto</label>
                <input name="monto" type="number" min="1" step="1" required className={inputCls} />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-2">
              <div>
                <label className={labelCls}>Fecha OC</label>
                <input name="fechaOC" type="date" className={inputCls} />
              </div>
              <div>
                <label className={labelCls}>Estado</label>
                <select name="estadoOC" className={inputCls} defaultValue="PENDIENTE">
                  <option value="PENDIENTE">Pendiente</option>
                  <option value="FACTURADA">Facturada</option>
                  <option value="PAGADA">Pagada</option>
                  <option value="ANULADA">Anulada</option>
                </select>
              </div>
            </div>
          </FormAccion>
        </Seccion>
      )}

      {/* Documentos tributarios */}
      <Seccion titulo={`Documentos tributarios (${n.documentos.length})`}>
        <p className="mb-2 text-xs text-slate-400">
          Informativo. La cobranza se asocia al RecordID, no al documento.
        </p>
        <div className="mb-3 space-y-2">
          {n.documentos.length === 0 && (
            <p className="rounded-lg bg-amber-50 px-3 py-2 text-sm text-amber-700">
              Sin documento tributario emitido.
            </p>
          )}
          {n.documentos.map((d) => (
            <div
              key={d.id}
              className="flex items-center justify-between rounded-lg border border-slate-200 px-3 py-2"
            >
              <div>
                <div className="text-sm font-semibold text-slate-900">
                  {etiqueta(d.tipoDocto)} {d.folio ? `· ${d.folio}` : ""}
                </div>
                <div className="text-xs text-slate-400">{formatFecha(d.fechaEmision)}</div>
              </div>
              <span className="text-sm text-slate-700">{d.monto !== null ? formatCLP(d.monto) : ""}</span>
            </div>
          ))}
        </div>

        <FormAccion action={registrarDocumento} recordId={n.recordId} submitLabel="Registrar documento">
          <div className="grid grid-cols-2 gap-2">
            <div>
              <label className={labelCls}>Tipo</label>
              <select name="tipoDocto" className={inputCls} defaultValue="FACTURA">
                <option value="FACTURA">Factura</option>
                <option value="BOLETA">Boleta</option>
                <option value="ORDEN_COMPRA">Orden de Compra</option>
              </select>
            </div>
            <div>
              <label className={labelCls}>Folio</label>
              <input name="folio" type="text" className={inputCls} />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-2">
            <div>
              <label className={labelCls}>Fecha emisión</label>
              <input name="fechaEmision" type="date" className={inputCls} />
            </div>
            <div>
              <label className={labelCls}>Monto</label>
              <input name="monto" type="number" min="0" step="1" className={inputCls} />
            </div>
          </div>
        </FormAccion>
      </Seccion>
    </div>
  );
}
