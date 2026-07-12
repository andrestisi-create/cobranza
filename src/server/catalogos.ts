"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { prisma } from "@/lib/db";
import { auth } from "@/auth";
import type { ActionState } from "@/lib/types";
import type { Catalogo } from "@/server/opciones";

async function requireAdmin() {
  const session = await auth();
  if (!session?.user || session.user.rol !== "ADMIN") {
    throw new Error("Solo administradores");
  }
  return session.user;
}

function revalidarTodo() {
  revalidatePath("/configuracion");
  revalidatePath("/negocios");
  revalidatePath("/cobranza");
  revalidatePath("/pre-cobranza");
}

const CATALOGOS_VALIDOS: Catalogo[] = [
  "ESTADO_NEGOCIO",
  "TIPO_NEGOCIO",
  "TIPO_VENTA",
  "TIPO_DOCTO",
];

async function contarUsos(catalogo: Catalogo, valor: string): Promise<number> {
  switch (catalogo) {
    case "ESTADO_NEGOCIO":
      return prisma.negocio.count({ where: { estadoNegocio: valor } });
    case "TIPO_NEGOCIO":
      return prisma.negocio.count({ where: { tipoNegocio: valor } });
    case "TIPO_VENTA":
      return prisma.negocio.count({ where: { tipoVenta: valor } });
    case "TIPO_DOCTO": {
      const [enNegocios, enDocumentos] = await Promise.all([
        prisma.negocio.count({ where: { tipoDocto: valor } }),
        prisma.documentoTributario.count({ where: { tipoDocto: valor } }),
      ]);
      return enNegocios + enDocumentos;
    }
  }
}

// ─────────────────────────────────────────────
// Crear opción
// ─────────────────────────────────────────────

const crearOpcionSchema = z.object({
  catalogo: z.enum(["ESTADO_NEGOCIO", "TIPO_NEGOCIO", "TIPO_VENTA", "TIPO_DOCTO"]),
  valor: z.string().trim().min(1, "Indica un valor").max(60, "Máximo 60 caracteres"),
});

export async function crearOpcion(
  _prev: ActionState,
  fd: FormData,
): Promise<ActionState> {
  await requireAdmin();
  const parsed = crearOpcionSchema.safeParse(Object.fromEntries(fd));
  if (!parsed.success) return { error: parsed.error.errors[0]?.message ?? "Datos inválidos" };
  const { catalogo, valor } = parsed.data;

  try {
    const max = await prisma.opcionCatalogo.aggregate({
      where: { catalogo },
      _max: { orden: true },
    });
    await prisma.opcionCatalogo.create({
      data: { catalogo, valor, orden: (max._max.orden ?? -1) + 1 },
    });
  } catch {
    return { error: `"${valor}" ya existe en este catálogo` };
  }
  revalidarTodo();
  return { ok: true };
}

// ─────────────────────────────────────────────
// Eliminar opción (bloqueado si está en uso)
// ─────────────────────────────────────────────

export async function eliminarOpcion(
  _prev: ActionState,
  fd: FormData,
): Promise<ActionState> {
  await requireAdmin();
  const id = String(fd.get("id") ?? "");
  if (!id) return { error: "ID inválido" };

  const opcion = await prisma.opcionCatalogo.findUnique({ where: { id } });
  if (!opcion) return { error: "La opción ya no existe" };
  if (!CATALOGOS_VALIDOS.includes(opcion.catalogo as Catalogo)) {
    return { error: "Catálogo desconocido" };
  }

  const usos = await contarUsos(opcion.catalogo as Catalogo, opcion.valor);
  if (usos > 0) {
    return {
      error: `No se puede eliminar: ${usos} negocio${usos === 1 ? "" : "s"} usa${usos === 1 ? "" : "n"} este valor. Puedes desactivarlo en vez de eliminarlo.`,
    };
  }

  await prisma.opcionCatalogo.delete({ where: { id } });
  revalidarTodo();
  return { ok: true };
}

// ─────────────────────────────────────────────
// Activar / desactivar opción
// ─────────────────────────────────────────────

export async function toggleActivoOpcion(fd: FormData): Promise<void> {
  await requireAdmin();
  const id = String(fd.get("id") ?? "");
  const activo = fd.get("activo") === "true";
  if (!id) return;
  await prisma.opcionCatalogo.update({ where: { id }, data: { activo: !activo } });
  revalidarTodo();
}
