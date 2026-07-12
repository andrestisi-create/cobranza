"use client";

import { useEffect, useRef, useState } from "react";
import { cn } from "@/lib/format";

export interface OpcionCombobox {
  valor: string;
  /** Texto principal (nombre, código…) */
  etiqueta: string;
  /** Texto secundario para búsqueda adicional (RUT, descripción…) */
  subEtiqueta?: string;
}

interface Props {
  /** Nombre del campo hidden que se envía en el FormData */
  name: string;
  opciones: OpcionCombobox[];
  /** Valor inicial (valor, no etiqueta) */
  valorDefecto?: string;
  placeholder?: string;
  className?: string;
}

export function Combobox({
  name,
  opciones,
  valorDefecto,
  placeholder = "Escriba para buscar…",
  className,
}: Props) {
  const inicial = valorDefecto
    ? (opciones.find((o) => o.valor === valorDefecto) ?? null)
    : null;

  const [abierto, setAbierto] = useState(false);
  const [busqueda, setBusqueda] = useState("");
  const [seleccionado, setSeleccionado] = useState<OpcionCombobox | null>(inicial);
  const contenedorRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  // Cerrar al hacer click fuera
  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (
        contenedorRef.current &&
        !contenedorRef.current.contains(e.target as Node)
      ) {
        setAbierto(false);
        setBusqueda("");
      }
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  const LIMITE_RESULTADOS = 50;

  // Filtrar opciones por etiqueta y subEtiqueta
  const opcionesCoincidentes =
    busqueda.trim() === ""
      ? opciones
      : opciones.filter((o) => {
          const q = busqueda.toLowerCase();
          return (
            o.etiqueta.toLowerCase().includes(q) ||
            (o.subEtiqueta && o.subEtiqueta.toLowerCase().includes(q))
          );
        });
  const opcionesFiltradas = opcionesCoincidentes.slice(0, LIMITE_RESULTADOS);
  const hayMasResultados = opcionesCoincidentes.length > LIMITE_RESULTADOS;

  const seleccionar = (opcion: OpcionCombobox) => {
    setSeleccionado(opcion);
    setBusqueda("");
    setAbierto(false);
  };

  const limpiar = (e: React.MouseEvent) => {
    e.stopPropagation();
    setSeleccionado(null);
    setBusqueda("");
    inputRef.current?.focus();
  };

  // Texto que muestra el input visible
  const textoVisible = abierto ? busqueda : (seleccionado?.etiqueta ?? "");

  return (
    <div ref={contenedorRef} className={cn("relative", className)}>
      {/* Campo oculto que envía el valor real al FormData */}
      <input type="hidden" name={name} value={seleccionado?.valor ?? ""} />

      {/* Input de búsqueda visible */}
      <div className="relative flex items-center">
        <input
          ref={inputRef}
          type="text"
          autoComplete="off"
          value={textoVisible}
          placeholder={!seleccionado ? placeholder : undefined}
          onFocus={() => {
            setAbierto(true);
            setBusqueda("");
          }}
          onChange={(e) => {
            setBusqueda(e.target.value);
            setAbierto(true);
            if (!e.target.value) setSeleccionado(null);
          }}
          onKeyDown={(e) => {
            if (e.key === "Escape") {
              setAbierto(false);
              setBusqueda("");
            }
            if (e.key === "Enter") {
              e.preventDefault();
              if (opcionesFiltradas.length === 1) seleccionar(opcionesFiltradas[0]);
            }
          }}
          className="w-full rounded-lg border border-slate-300 py-2 pl-3 pr-8 text-sm outline-none
            focus:border-slate-900 focus:ring-1 focus:ring-slate-900"
        />
        {/* Chevron o X */}
        {seleccionado ? (
          <button
            type="button"
            onClick={limpiar}
            title="Limpiar selección"
            className="absolute right-2 text-slate-400 hover:text-slate-700"
          >
            <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <line x1="18" y1="6" x2="6" y2="18" />
              <line x1="6" y1="6" x2="18" y2="18" />
            </svg>
          </button>
        ) : (
          <span className="pointer-events-none absolute right-2 text-slate-400">
            <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <polyline points="6 9 12 15 18 9" />
            </svg>
          </span>
        )}
      </div>

      {/* Dropdown */}
      {abierto && (
        <ul className="absolute z-50 mt-1 max-h-52 w-full overflow-auto rounded-lg border border-slate-200 bg-white py-1 shadow-lg">
          {opcionesFiltradas.length === 0 ? (
            <li className="px-3 py-2 text-sm text-slate-400">
              Sin resultados para &ldquo;{busqueda}&rdquo;
            </li>
          ) : (
            opcionesFiltradas.map((o) => (
              <li
                key={o.valor}
                onMouseDown={(e) => {
                  e.preventDefault(); // evita que el input pierda foco primero
                  seleccionar(o);
                }}
                className={cn(
                  "cursor-pointer px-3 py-2 hover:bg-slate-100",
                  seleccionado?.valor === o.valor
                    ? "bg-indigo-50 font-medium text-indigo-700"
                    : "text-slate-800",
                )}
              >
                <div className="text-sm">{o.etiqueta}</div>
                {o.subEtiqueta && (
                  <div className="text-xs text-slate-400">{o.subEtiqueta}</div>
                )}
              </li>
            ))
          )}
          {hayMasResultados && (
            <li className="border-t border-slate-100 px-3 py-2 text-xs text-slate-400">
              Sigue escribiendo para refinar…
            </li>
          )}
        </ul>
      )}
    </div>
  );
}
