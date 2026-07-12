import { prisma } from "@/lib/db";

export type Catalogo = "ESTADO_NEGOCIO" | "TIPO_NEGOCIO" | "TIPO_VENTA" | "TIPO_DOCTO";

export interface OpcionCatalogoView {
  id: string;
  catalogo: Catalogo;
  valor: string;
  activo: boolean;
  orden: number;
}

/** Valores activos de un catálogo, listos para poblar un <select>. */
export async function getOpciones(catalogo: Catalogo): Promise<string[]> {
  const rows = await prisma.opcionCatalogo.findMany({
    where: { catalogo, activo: true },
    orderBy: { orden: "asc" },
    select: { valor: true },
  });
  return rows.map((r) => r.valor);
}

export interface TodasLasOpciones {
  estadosNegocio: string[];
  tiposNegocio: string[];
  tiposVenta: string[];
  tiposDocto: string[];
}

/** Los 4 catálogos activos, en paralelo — para pasar como props a formularios/filtros. */
export async function getTodasLasOpciones(): Promise<TodasLasOpciones> {
  const [estadosNegocio, tiposNegocio, tiposVenta, tiposDocto] = await Promise.all([
    getOpciones("ESTADO_NEGOCIO"),
    getOpciones("TIPO_NEGOCIO"),
    getOpciones("TIPO_VENTA"),
    getOpciones("TIPO_DOCTO"),
  ]);
  return { estadosNegocio, tiposNegocio, tiposVenta, tiposDocto };
}

/** Los 4 catálogos completos (activos e inactivos) para la pantalla de Configuración. */
export async function getCatalogosCompletos(): Promise<Record<Catalogo, OpcionCatalogoView[]>> {
  const rows = await prisma.opcionCatalogo.findMany({
    orderBy: [{ catalogo: "asc" }, { orden: "asc" }],
  });

  const base: Record<Catalogo, OpcionCatalogoView[]> = {
    ESTADO_NEGOCIO: [],
    TIPO_NEGOCIO: [],
    TIPO_VENTA: [],
    TIPO_DOCTO: [],
  };
  for (const r of rows) {
    const catalogo = r.catalogo as Catalogo;
    if (catalogo in base) {
      base[catalogo].push({
        id: r.id,
        catalogo,
        valor: r.valor,
        activo: r.activo,
        orden: r.orden,
      });
    }
  }
  return base;
}
