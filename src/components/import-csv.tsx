"use client";

import { useActionState, useEffect, useRef, useState } from "react";
import type { ActionState, ResultadoImport } from "@/lib/types";

// ─────────────────────────────────────────────
// Tipos
// ─────────────────────────────────────────────

export interface ColConfig {
  campo: string;
  label: string;
  requerido: boolean;
  /** Valores exactos permitidos (mayúsculas). Si se omite, cualquier texto es válido. */
  valoresPermitidos?: string[];
  tipo?: "fecha" | "numero" | "texto";
  /** Descripción corta para mostrar en la guía de columnas. */
  descripcion?: string;
}

type ImportAction = (prev: ActionState, fd: FormData) => Promise<ActionState>;

interface Props {
  titulo: string;
  /** Ruta relativa al archivo CSV de ejemplo (ej: /ejemplos/alumnos_ejemplo.csv) */
  ejemploUrl: string;
  columnas: ColConfig[];
  action: ImportAction;
  disabled?: boolean;
}

// ─────────────────────────────────────────────
// Parser CSV (soporta coma y punto-y-coma, comillas dobles, BOM)
// ─────────────────────────────────────────────

function parsearCSV(
  texto: string,
  cols: ColConfig[],
): {
  filas: Record<string, string>[];
  erroresValidacion: { fila: number; campo: string; mensaje: string }[];
  headersDesconocidos: string[];
} {
  // Eliminar BOM y normalizar saltos de línea
  const clean = texto.replace(/^﻿/, "").replace(/\r\n?/g, "\n");
  const lineas = clean.split("\n").filter((l) => l.trim() !== "");

  if (lineas.length < 2) {
    return { filas: [], erroresValidacion: [], headersDesconocidos: [] };
  }

  // Detectar delimitador
  const primeraLinea = lineas[0];
  const countComa = (primeraLinea.match(/,/g) ?? []).length;
  const countPuntoYComa = (primeraLinea.match(/;/g) ?? []).length;
  const delimitador = countPuntoYComa > countComa ? ";" : ",";

  const splitLinea = (linea: string): string[] => {
    const campos: string[] = [];
    let campo = "";
    let enComillas = false;
    for (let i = 0; i < linea.length; i++) {
      const c = linea[i];
      if (c === '"') {
        if (enComillas && linea[i + 1] === '"') {
          campo += '"';
          i++;
        } else {
          enComillas = !enComillas;
        }
      } else if (c === delimitador && !enComillas) {
        campos.push(campo.trim());
        campo = "";
      } else {
        campo += c;
      }
    }
    campos.push(campo.trim());
    return campos;
  };

  const headers = splitLinea(lineas[0]).map((h) => h.trim());

  // Detectar columnas que no están en la configuración (informativo)
  const camposEsperados = new Set(cols.map((c) => c.campo));
  const headersDesconocidos = headers.filter((h) => !camposEsperados.has(h));

  const filas: Record<string, string>[] = [];
  const erroresValidacion: { fila: number; campo: string; mensaje: string }[] =
    [];

  for (let i = 1; i < lineas.length; i++) {
    const valores = splitLinea(lineas[i]);
    const fila: Record<string, string> = {};
    headers.forEach((h, idx) => {
      fila[h] = (valores[idx] ?? "").trim();
    });

    // Validar columnas requeridas y valores permitidos
    for (const col of cols) {
      const valor = fila[col.campo] ?? "";
      if (col.requerido && !valor) {
        erroresValidacion.push({
          fila: i + 1,
          campo: col.campo,
          mensaje: `"${col.label}" es requerido`,
        });
      } else if (
        valor &&
        col.valoresPermitidos &&
        !col.valoresPermitidos.includes(valor.toUpperCase())
      ) {
        erroresValidacion.push({
          fila: i + 1,
          campo: col.campo,
          mensaje: `"${col.label}": valor inválido ("${valor}"). Permitidos: ${col.valoresPermitidos.join(" | ")}`,
        });
      } else if (
        valor &&
        col.tipo === "fecha" &&
        isNaN(Date.parse(valor))
      ) {
        erroresValidacion.push({
          fila: i + 1,
          campo: col.campo,
          mensaje: `"${col.label}": fecha inválida. Usar formato YYYY-MM-DD`,
        });
      } else if (
        valor &&
        col.tipo === "numero" &&
        (isNaN(Number(valor)) || Number(valor) <= 0)
      ) {
        erroresValidacion.push({
          fila: i + 1,
          campo: col.campo,
          mensaje: `"${col.label}": debe ser un número positivo`,
        });
      }
    }

    filas.push(fila);
  }

  return { filas, erroresValidacion, headersDesconocidos };
}

// ─────────────────────────────────────────────
// Iconos SVG inline (sin dependencias)
// ─────────────────────────────────────────────

function IconUpload() {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      className="h-4 w-4"
      fill="none"
      viewBox="0 0 24 24"
      stroke="currentColor"
      strokeWidth={2}
    >
      <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
      <polyline points="17 8 12 3 7 8" />
      <line x1="12" y1="3" x2="12" y2="15" />
    </svg>
  );
}

function IconDownload() {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      className="h-4 w-4"
      fill="none"
      viewBox="0 0 24 24"
      stroke="currentColor"
      strokeWidth={2}
    >
      <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
      <polyline points="7 10 12 15 17 10" />
      <line x1="12" y1="15" x2="12" y2="3" />
    </svg>
  );
}

// ─────────────────────────────────────────────
// Componente principal
// ─────────────────────────────────────────────

export function ImportCSV({
  titulo,
  ejemploUrl,
  columnas,
  action,
  disabled = false,
}: Props) {
  const [abierto, setAbierto] = useState(false);
  const [filas, setFilas] = useState<Record<string, string>[]>([]);
  const [erroresValidacion, setErroresValidacion] = useState<
    { fila: number; campo: string; mensaje: string }[]
  >([]);
  const [headersDesconocidos, setHeadersDesconocidos] = useState<string[]>([]);
  const [nombreArchivo, setNombreArchivo] = useState("");
  const fileRef = useRef<HTMLInputElement>(null);

  const [state, dispatch, pending] = useActionState<ActionState, FormData>(
    action,
    undefined,
  );

  const resultado = state?.resultado as ResultadoImport | undefined;

  // Resetear archivo cuando se importa con éxito
  useEffect(() => {
    if (resultado) {
      setFilas([]);
      setErroresValidacion([]);
      setHeadersDesconocidos([]);
      setNombreArchivo("");
      if (fileRef.current) fileRef.current.value = "";
    }
  }, [resultado]);

  const cerrar = () => {
    setAbierto(false);
    setFilas([]);
    setErroresValidacion([]);
    setHeadersDesconocidos([]);
    setNombreArchivo("");
    if (fileRef.current) fileRef.current.value = "";
  };

  const handleFile = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setNombreArchivo(file.name);
    const reader = new FileReader();
    reader.onload = (ev) => {
      const texto = ev.target?.result as string;
      const { filas: f, erroresValidacion: err, headersDesconocidos: hd } =
        parsearCSV(texto, columnas);
      setFilas(f);
      setErroresValidacion(err);
      setHeadersDesconocidos(hd);
    };
    // Intentar UTF-8 primero; si hay problemas con caracteres españoles usar latin1
    reader.readAsText(file, "UTF-8");
  };

  const filasConError = new Set(erroresValidacion.map((e) => e.fila));
  // Las filas válidas son las que no tienen ningún error de validación
  const filasValidas = filas.filter((_, i) => !filasConError.has(i + 2));

  // ── Vista colapsada ──────────────────────────────────────
  if (!abierto) {
    return (
      <div className="flex items-center gap-2">
        <button
          onClick={() => setAbierto(true)}
          disabled={disabled}
          className="flex items-center gap-1.5 rounded-lg border border-slate-300 px-3 py-2 text-sm font-medium text-slate-700 hover:bg-slate-100 disabled:opacity-50"
        >
          <IconUpload />
          Importar CSV
        </button>
        <a
          href={ejemploUrl}
          download
          className="flex items-center gap-1.5 rounded-lg border border-slate-200 px-3 py-2 text-sm text-slate-500 hover:bg-slate-50"
        >
          <IconDownload />
          Archivo ejemplo
        </a>
      </div>
    );
  }

  // ── Vista expandida ──────────────────────────────────────
  return (
    <div className="rounded-xl border border-slate-200 bg-white p-5">
      {/* Cabecera */}
      <div className="mb-4 flex items-center justify-between">
        <h3 className="text-sm font-bold text-slate-800">{titulo}</h3>
        <button
          onClick={cerrar}
          className="text-xs text-slate-400 hover:text-slate-700 hover:underline"
        >
          Cerrar
        </button>
      </div>

      {/* Guía de columnas */}
      <div className="mb-5 overflow-x-auto rounded-lg border border-slate-100 bg-slate-50 p-3">
        <div className="mb-2 flex items-center justify-between">
          <p className="text-xs font-semibold uppercase tracking-wide text-slate-400">
            Estructura del archivo CSV
          </p>
          <a
            href={ejemploUrl}
            download
            className="flex items-center gap-1 text-xs text-indigo-600 hover:underline"
          >
            <IconDownload />
            Descargar ejemplo
          </a>
        </div>
        <table className="w-full text-xs">
          <thead>
            <tr className="text-left text-slate-400">
              <th className="pb-1.5 pr-4 font-medium">Campo en CSV</th>
              <th className="pb-1.5 pr-4 font-medium">Descripción</th>
              <th className="pb-1.5 pr-4 font-medium">¿Requerido?</th>
              <th className="pb-1.5 font-medium">Valores / Formato</th>
            </tr>
          </thead>
          <tbody>
            {columnas.map((c) => (
              <tr key={c.campo} className="border-t border-slate-200">
                <td className="py-1.5 pr-4 font-mono text-slate-800">
                  {c.campo}
                </td>
                <td className="py-1.5 pr-4 text-slate-600">{c.label}</td>
                <td className="py-1.5 pr-4">
                  {c.requerido ? (
                    <span className="font-semibold text-red-600">SÍ</span>
                  ) : (
                    <span className="text-slate-400">No</span>
                  )}
                </td>
                <td className="py-1.5 text-slate-500">
                  {c.valoresPermitidos
                    ? c.valoresPermitidos.join(" | ")
                    : c.descripcion ??
                      (c.tipo === "fecha"
                        ? "YYYY-MM-DD"
                        : c.tipo === "numero"
                          ? "Número entero positivo"
                          : "Texto libre")}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        <p className="mt-2 text-xs text-slate-400">
          El archivo debe tener los nombres de columna exactamente como se
          muestran arriba. Puedes usar coma (,) o punto y coma (;) como
          separador.
        </p>
      </div>

      {/* Selector de archivo */}
      {!resultado && (
        <div className="mb-4">
          <label className="mb-1.5 block text-xs font-medium text-slate-600">
            Seleccionar archivo CSV
          </label>
          <input
            ref={fileRef}
            type="file"
            accept=".csv,text/csv,text/plain"
            onChange={handleFile}
            className="w-full cursor-pointer rounded-lg border border-slate-300 px-3 py-2 text-sm text-slate-600
              file:mr-3 file:cursor-pointer file:rounded-md file:border-0 file:bg-slate-900
              file:px-3 file:py-1 file:text-xs file:font-semibold file:text-white
              hover:file:bg-slate-700"
          />
          {nombreArchivo && (
            <p className="mt-1 text-xs text-slate-400">
              <span className="font-medium text-slate-600">{nombreArchivo}</span>{" "}
              · {filas.length} filas encontradas
            </p>
          )}
        </div>
      )}

      {/* Aviso columnas desconocidas */}
      {headersDesconocidos.length > 0 && (
        <div className="mb-3 rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-xs text-amber-700">
          <strong>Columnas no reconocidas en el archivo</strong> (serán
          ignoradas):{" "}
          <span className="font-mono">{headersDesconocidos.join(", ")}</span>
        </div>
      )}

      {/* Errores de validación */}
      {erroresValidacion.length > 0 && (
        <div className="mb-4 rounded-lg border border-red-200 bg-red-50 p-3">
          <p className="mb-1.5 text-xs font-semibold text-red-700">
            ⚠ Errores de validación ({erroresValidacion.length})
          </p>
          <ul className="space-y-0.5">
            {erroresValidacion.slice(0, 12).map((e, i) => (
              <li key={i} className="text-xs text-red-600">
                Fila {e.fila}: {e.mensaje}
              </li>
            ))}
            {erroresValidacion.length > 12 && (
              <li className="text-xs text-red-400">
                …y {erroresValidacion.length - 12} errores más. Corrija el
                archivo y vuelva a cargarlo.
              </li>
            )}
          </ul>
          {filasValidas.length > 0 && (
            <p className="mt-2 rounded bg-amber-100 px-2 py-1 text-xs text-amber-700">
              Las {filasValidas.length} filas sin error{" "}
              <strong>sí se importarán</strong>.
            </p>
          )}
        </div>
      )}

      {/* Vista previa */}
      {filas.length > 0 && !resultado && (
        <div className="mb-4">
          <p className="mb-1.5 text-xs font-semibold text-slate-500 uppercase tracking-wide">
            Vista previa
            {filas.length > 5 ? ` (mostrando 5 de ${filas.length} filas)` : ""}
          </p>
          <div className="overflow-x-auto rounded-lg border border-slate-200">
            <table className="w-full text-xs">
              <thead className="bg-slate-50 text-slate-400">
                <tr>
                  <th className="px-2 py-1.5 text-left">#</th>
                  {columnas.map((c) => (
                    <th key={c.campo} className="px-2 py-1.5 text-left">
                      {c.label}
                    </th>
                  ))}
                  <th className="px-2 py-1.5 text-left">Estado</th>
                </tr>
              </thead>
              <tbody>
                {filas.slice(0, 5).map((fila, i) => {
                  const numFila = i + 2;
                  const tieneError = filasConError.has(numFila);
                  return (
                    <tr
                      key={i}
                      className={
                        tieneError
                          ? "bg-red-50"
                          : "border-t border-slate-100 hover:bg-slate-50"
                      }
                    >
                      <td className="px-2 py-1.5 text-slate-400">{numFila}</td>
                      {columnas.map((c) => {
                        const val = fila[c.campo] ?? "";
                        const vacio = !val && c.requerido;
                        return (
                          <td
                            key={c.campo}
                            className={`px-2 py-1.5 ${vacio ? "text-red-500" : "text-slate-700"}`}
                          >
                            {val || (
                              <span className="text-slate-300">—</span>
                            )}
                          </td>
                        );
                      })}
                      <td className="px-2 py-1.5">
                        {tieneError ? (
                          <span className="rounded-full bg-red-100 px-1.5 py-0.5 text-red-600">
                            Error
                          </span>
                        ) : (
                          <span className="rounded-full bg-emerald-100 px-1.5 py-0.5 text-emerald-600">
                            OK
                          </span>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Botón importar — usa form con hidden input para pasar JSON */}
      {filas.length > 0 && !resultado && (
        <form action={dispatch}>
          <input
            type="hidden"
            name="json"
            value={JSON.stringify(filasValidas)}
          />
          {state?.error && (
            <p className="mb-2 text-xs text-red-600">{state.error}</p>
          )}
          <div className="flex items-center gap-3">
            <button
              type="submit"
              disabled={pending || filasValidas.length === 0}
              className="rounded-lg bg-slate-900 px-5 py-2 text-sm font-semibold text-white transition hover:bg-slate-700 disabled:opacity-60"
            >
              {pending
                ? "Importando…"
                : `Importar ${filasValidas.length} ${filasValidas.length === 1 ? "fila" : "filas"}`}
            </button>
            {filasConError.size > 0 && (
              <span className="text-xs text-slate-400">
                {filasConError.size}{" "}
                {filasConError.size === 1 ? "fila con error" : "filas con error"}{" "}
                serán omitidas
              </span>
            )}
            {filasValidas.length === 0 && erroresValidacion.length > 0 && (
              <span className="text-xs text-red-500">
                Corrija los errores antes de importar.
              </span>
            )}
          </div>
        </form>
      )}

      {/* Resultado */}
      {resultado && (
        <div className="rounded-lg border border-emerald-200 bg-emerald-50 p-4">
          <p className="text-sm font-semibold text-emerald-800">
            ✓ Importación completada
          </p>
          <p className="mt-1 text-sm text-emerald-700">
            <strong>{resultado.creados}</strong> registro
            {resultado.creados !== 1 ? "s" : ""} creado
            {resultado.creados !== 1 ? "s" : ""} correctamente.
          </p>
          {resultado.errores.length > 0 && (
            <div className="mt-3 rounded-lg border border-amber-200 bg-amber-50 p-3">
              <p className="mb-1 text-xs font-semibold text-amber-700">
                {resultado.errores.length} fila
                {resultado.errores.length !== 1 ? "s" : ""} con error
                {resultado.errores.length !== 1 ? "es" : ""}:
              </p>
              <ul className="space-y-0.5">
                {resultado.errores.map((e, i) => (
                  <li key={i} className="text-xs text-amber-700">
                    Fila {e.fila}: {e.mensaje}
                  </li>
                ))}
              </ul>
            </div>
          )}
          <button
            onClick={cerrar}
            className="mt-4 rounded-lg bg-emerald-700 px-4 py-2 text-sm font-semibold text-white hover:bg-emerald-600"
          >
            Cerrar
          </button>
        </div>
      )}
    </div>
  );
}
