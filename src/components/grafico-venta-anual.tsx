"use client";

import { formatCLP } from "@/lib/format";

interface Datos {
  anioActual: number;
  anioPrevio: number;
  porMes: { mes: number; actual: number; previo: number }[];
  totalActual: number;
  totalPrevio: number;
}

const MESES = ["Ene","Feb","Mar","Abr","May","Jun","Jul","Ago","Sep","Oct","Nov","Dic"];

const ALTURA_PX = 180; // debe coincidir con el height del contenedor padre

function Barra({ valor, max, color }: { valor: number; max: number; color: string }) {
  // Usamos píxeles directos: % no funciona cuando el wrapper no tiene altura explícita
  const px = max > 0 ? Math.round((valor / max) * ALTURA_PX) : 0;
  const altPx = Math.max(px, valor > 0 ? 2 : 0);
  return (
    <div className="group relative flex justify-center">
      <div
        className={`w-3.5 rounded-t-sm transition-opacity group-hover:opacity-75 ${color}`}
        style={{ height: `${altPx}px` }}
      />
      {valor > 0 && (
        <div className="pointer-events-none absolute bottom-full left-1/2 z-20 mb-1 hidden -translate-x-1/2 whitespace-nowrap rounded bg-slate-900 px-2 py-1 text-[10px] text-white group-hover:block">
          {formatCLP(valor)}
        </div>
      )}
    </div>
  );
}

export function GraficoVentaAnual({ datos }: { datos: Datos }) {
  const { anioActual, anioPrevio, porMes, totalActual, totalPrevio } = datos;

  const max = Math.max(
    ...porMes.flatMap((d) => [d.actual, d.previo]),
    1,
  );

  return (
    <div className="mt-6 rounded-xl border border-slate-200 bg-white p-5">
      {/* Header */}
      <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
        <h2 className="text-sm font-semibold text-slate-700">Venta mensual comparativa</h2>
        <div className="flex items-center gap-4">
          <span className="flex items-center gap-1.5 text-xs text-slate-600">
            <span className="inline-block h-3 w-3 rounded-sm bg-slate-800" />
            {anioActual}
          </span>
          <span className="flex items-center gap-1.5 text-xs text-slate-400">
            <span className="inline-block h-3 w-3 rounded-sm bg-slate-300" />
            {anioPrevio}
          </span>
        </div>
      </div>

      {/* Gráfico de barras */}
      <div className="flex items-end justify-between gap-1" style={{ height: "200px" }}>
        {porMes.map(({ mes, actual, previo }) => (
          <div key={mes} className="flex flex-1 flex-col items-center gap-0">
            {/* Barras (alineadas al fondo) */}
            <div className="flex w-full items-end justify-center gap-0.5" style={{ height: "180px" }}>
              <Barra valor={actual} max={max} color="bg-slate-800" />
              <Barra valor={previo} max={max} color="bg-slate-300" />
            </div>
            {/* Etiqueta mes */}
            <span className="mt-1 text-[10px] text-slate-400">{MESES[mes - 1]}</span>
          </div>
        ))}
      </div>

      {/* Totales acumulados */}
      <div className="mt-5 grid grid-cols-2 gap-3">
        <div className="rounded-lg bg-slate-900 p-4 text-white">
          <div className="text-xs font-medium opacity-70">Acumulado {anioActual}</div>
          <div className="mt-1 text-xl font-bold">{formatCLP(totalActual)}</div>
          <div className="mt-0.5 text-[10px] opacity-50">a la fecha</div>
        </div>
        <div className="rounded-lg bg-slate-100 p-4 text-slate-700">
          <div className="text-xs font-medium text-slate-500">Acumulado {anioPrevio}</div>
          <div className="mt-1 text-xl font-bold text-slate-900">{formatCLP(totalPrevio)}</div>
          <div className="mt-0.5 text-[10px] text-slate-400">año completo</div>
        </div>
      </div>
    </div>
  );
}
