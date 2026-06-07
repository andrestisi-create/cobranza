"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/db";
import { auth } from "@/auth";
import type { ActionState } from "@/lib/types";

async function requireGestion() {
  const session = await auth();
  if (!session?.user) throw new Error("No autenticado");
  if (session.user.rol === "COBRADOR") throw new Error("Sin permisos");
}

// ─────────────────────────────────────────────
// Importar alumnos
// ─────────────────────────────────────────────

export async function importarAlumnos(
  _prev: ActionState,
  fd: FormData,
): Promise<ActionState> {
  await requireGestion();

  const raw = fd.get("json");
  if (!raw) return { error: "No se recibieron datos" };

  let rows: Record<string, string>[];
  try {
    rows = JSON.parse(String(raw));
  } catch {
    return { error: "Datos inválidos" };
  }

  let creados = 0;
  const errores: { fila: number; mensaje: string }[] = [];

  for (let i = 0; i < rows.length; i++) {
    const r = rows[i];
    const fila = i + 2; // fila 1 = encabezado
    try {
      await prisma.alumno.create({
        data: {
          nombre: r.nombre?.trim() ?? "",
          apellidoPaterno: r.apellidoPaterno?.trim() ?? "",
          segundoNombre: r.segundoNombre?.trim() || null,
          apellidoMaterno: r.apellidoMaterno?.trim() || null,
          rut: r.rut?.trim() || null,
          email: r.email?.trim() || null,
          telefono: r.telefono?.trim() || null,
          direccion: r.direccion?.trim() || null,
          fechaNacimiento: r.fechaNacimiento?.trim()
            ? new Date(r.fechaNacimiento.trim())
            : null,
        },
      });
      creados++;
    } catch {
      errores.push({ fila, mensaje: "No se pudo crear (¿RUT duplicado?)" });
    }
  }

  if (creados > 0) {
    revalidatePath("/alumnos");
    revalidatePath("/negocios");
  }

  return { ok: true, resultado: { creados, errores } };
}

// ─────────────────────────────────────────────
// Importar programas (upsert por codPrograma)
// ─────────────────────────────────────────────

export async function importarProgramas(
  _prev: ActionState,
  fd: FormData,
): Promise<ActionState> {
  await requireGestion();

  const raw = fd.get("json");
  if (!raw) return { error: "No se recibieron datos" };

  let rows: Record<string, string>[];
  try {
    rows = JSON.parse(String(raw));
  } catch {
    return { error: "Datos inválidos" };
  }

  let creados = 0;
  const errores: { fila: number; mensaje: string }[] = [];

  for (let i = 0; i < rows.length; i++) {
    const r = rows[i];
    const fila = i + 2;
    try {
      const cod = r.codPrograma?.trim();
      const data = {
        descripcion: r.descripcion?.trim() ?? "",
        fechaInicio: new Date(r.fechaInicio?.trim()),
        fechaFin: new Date(r.fechaFin?.trim()),
        valor: r.valor?.trim() ? Number(r.valor.trim()) : null,
      };

      await prisma.programa.upsert({
        where: { codPrograma: cod },
        update: data,
        create: { codPrograma: cod, ...data },
      });
      creados++;
    } catch {
      errores.push({
        fila,
        mensaje: "No se pudo crear/actualizar el programa (¿fecha inválida?)",
      });
    }
  }

  if (creados > 0) {
    revalidatePath("/programas");
    revalidatePath("/negocios");
  }

  return { ok: true, resultado: { creados, errores } };
}

// ─────────────────────────────────────────────
// Importar negocios (alumno identificado por RUT)
// ─────────────────────────────────────────────

export async function importarNegocios(
  _prev: ActionState,
  fd: FormData,
): Promise<ActionState> {
  await requireGestion();

  const raw = fd.get("json");
  if (!raw) return { error: "No se recibieron datos" };

  let rows: Record<string, string>[];
  try {
    rows = JSON.parse(String(raw));
  } catch {
    return { error: "Datos inválidos" };
  }

  let creados = 0;
  const errores: { fila: number; mensaje: string }[] = [];

  for (let i = 0; i < rows.length; i++) {
    const r = rows[i];
    const fila = i + 2;
    try {
      // Buscar alumno por RUT
      const alumno = await prisma.alumno.findFirst({
        where: { rut: r.rutAlumno?.trim() },
      });
      if (!alumno) {
        errores.push({
          fila,
          mensaje: `Alumno con RUT "${r.rutAlumno?.trim()}" no encontrado en el sistema`,
        });
        continue;
      }

      // Verificar programa
      const programa = await prisma.programa.findUnique({
        where: { codPrograma: r.codPrograma?.trim() },
      });
      if (!programa) {
        errores.push({
          fila,
          mensaje: `Programa "${r.codPrograma?.trim()}" no encontrado en el sistema`,
        });
        continue;
      }

      const tipoNegocio = r.tipoNegocio?.trim().toUpperCase() as
        | "CORPORATIVO"
        | "RETAIL";
      const tipoVenta = r.tipoVenta?.trim().toUpperCase() as
        | "SENCE"
        | "NO_SENCE";
      const tipoDocto = r.tipoDocto?.trim().toUpperCase() as
        | "FACTURA"
        | "BOLETA"
        | "ORDEN_COMPRA";
      const estadoNegocio = (
        r.estadoNegocio?.trim().toUpperCase() || "MATRICULADO"
      ) as "MATRICULADO" | "DE_BAJA" | "DESISTE";

      await prisma.negocio.create({
        data: {
          idAlumno: alumno.idAlumno,
          codPrograma: programa.codPrograma,
          montoNegocio: Number(r.montoNegocio?.trim()),
          tipoNegocio,
          tipoVenta,
          tipoDocto,
          estadoNegocio,
        },
      });
      creados++;
    } catch {
      errores.push({
        fila,
        mensaje: "No se pudo crear el negocio (verifique los datos)",
      });
    }
  }

  if (creados > 0) {
    revalidatePath("/negocios");
    revalidatePath("/cobranza");
    revalidatePath("/pre-cobranza");
    revalidatePath("/");
  }

  return { ok: true, resultado: { creados, errores } };
}

// ─────────────────────────────────────────────
// Importar vendedores
// ─────────────────────────────────────────────

export async function importarVendedores(
  _prev: ActionState,
  fd: FormData,
): Promise<ActionState> {
  await requireGestion();

  const raw = fd.get("json");
  if (!raw) return { error: "No se recibieron datos" };

  let rows: Record<string, string>[];
  try {
    rows = JSON.parse(String(raw));
  } catch {
    return { error: "Datos inválidos" };
  }

  let creados = 0;
  const errores: { fila: number; mensaje: string }[] = [];

  for (let i = 0; i < rows.length; i++) {
    const r = rows[i];
    const fila = i + 2;
    const nombre = r.nombre?.trim();
    if (!nombre) {
      errores.push({ fila, mensaje: "El campo nombre es obligatorio" });
      continue;
    }
    try {
      const activo = r.activo?.trim().toLowerCase();
      await prisma.vendedor.create({
        data: {
          nombre,
          email: r.email?.trim() || null,
          telefono: r.telefono?.trim() || null,
          activo:
            activo === "false" || activo === "no" || activo === "0"
              ? false
              : true,
        },
      });
      creados++;
    } catch {
      errores.push({ fila, mensaje: "No se pudo crear el vendedor" });
    }
  }

  if (creados > 0) {
    revalidatePath("/vendedores");
    revalidatePath("/negocios");
  }

  return { ok: true, resultado: { creados, errores } };
}
