"use client";

import { useState } from "react";
import { Sidebar } from "@/components/sidebar";
import { cerrarSesion } from "@/server/auth-actions";
import { etiqueta, cn } from "@/lib/format";

export function AppShell({
  children,
  esAdmin,
  userName,
  userRol,
}: {
  children: React.ReactNode;
  esAdmin: boolean;
  userName: string;
  userRol: string;
}) {
  const [colapsado, setColapsado] = useState(false);

  return (
    <div className="flex min-h-screen">
      {/* Barra lateral */}
      <aside
        className={cn(
          "relative flex shrink-0 flex-col border-r border-slate-200 bg-white transition-[width] duration-200",
          colapsado ? "w-14" : "w-60",
        )}
      >
        {/* Header / logo */}
        <div
          className={cn(
            "flex items-center border-b border-slate-200 py-4",
            colapsado ? "justify-center px-3" : "gap-2 px-4",
          )}
        >
          <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-slate-900 text-sm font-bold text-white">
            C
          </div>
          {!colapsado && (
            <div className="overflow-hidden">
              <div className="text-sm font-bold text-slate-900">Cobranza</div>
              <div className="text-xs text-slate-400">UA Blended</div>
            </div>
          )}
        </div>

        {/* Botón colapsar / expandir */}
        <button
          onClick={() => setColapsado(!colapsado)}
          title={colapsado ? "Expandir panel" : "Colapsar panel"}
          className="absolute -right-3 top-[3.75rem] z-10 flex h-6 w-6 items-center justify-center rounded-full border border-slate-200 bg-white text-slate-500 shadow-sm hover:bg-slate-100 hover:text-slate-900"
        >
          {colapsado ? (
            <svg xmlns="http://www.w3.org/2000/svg" className="h-3 w-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
            </svg>
          ) : (
            <svg xmlns="http://www.w3.org/2000/svg" className="h-3 w-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" />
            </svg>
          )}
        </button>

        {/* Navegación */}
        {!colapsado && <Sidebar esAdmin={esAdmin} />}

        {/* Usuario + cerrar sesión */}
        {!colapsado && (
          <div className="mt-auto border-t border-slate-200 p-3">
            <div className="px-2 pb-2">
              <div className="truncate text-sm font-medium text-slate-800">
                {userName}
              </div>
              <div className="text-xs text-slate-400">{etiqueta(userRol)}</div>
            </div>
            <form action={cerrarSesion}>
              <button
                type="submit"
                className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm font-medium text-slate-600 transition hover:bg-slate-100"
              >
                Cerrar sesión
              </button>
            </form>
          </div>
        )}
      </aside>

      {/* Contenido principal */}
      <main className="flex-1 overflow-x-hidden">{children}</main>
    </div>
  );
}
