"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import bcrypt from "bcryptjs";
import { prisma } from "@/lib/db";
import { auth } from "@/auth";
import type { ActionState } from "@/lib/types";

async function requireGestion() {
  const session = await auth();
  if (!session?.user) throw new Error("No autenticado");
  if (session.user.rol === "COBRADOR") throw new Error("Sin permisos");
  return session.user;
}

async function requireAdmin() {
  const session = await auth();
  if (!session?.user || session.user.rol !== "ADMIN") {
    throw new Error("Solo administradores");
  }
  return session.user;
}

const opt = (v: FormDataEntryValue | null) => {
  const s = v ? String(v).trim() : "";
  return s.length ? s : null;
};

// ----------------- Alumnos -----------------

const alumnoSchema = z.object({
  nombre: z.string().min(1, "Nombre requerido"),
  apellidoPaterno: z.string().min(1, "Apellido paterno requerido"),
});

export async function guardarAlumno(
  _prev: ActionState,
  fd: FormData,
): Promise<ActionState> {
  await requireGestion();
  const parsed = alumnoSchema.safeParse(Object.fromEntries(fd));
  if (!parsed.success) return { error: parsed.error.errors[0]?.message };

  const data = {
    nombre: String(fd.get("nombre")).trim(),
    segundoNombre: opt(fd.get("segundoNombre")),
    apellidoPaterno: String(fd.get("apellidoPaterno")).trim(),
    apellidoMaterno: opt(fd.get("apellidoMaterno")),
    rut: opt(fd.get("rut")),
    email: opt(fd.get("email")),
    telefono: opt(fd.get("telefono")),
    direccion: opt(fd.get("direccion")),
    fechaNacimiento: fd.get("fechaNacimiento") ? new Date(String(fd.get("fechaNacimiento"))) : null,
  };

  const id = opt(fd.get("id"));
  try {
    if (id) await prisma.alumno.update({ where: { idAlumno: id }, data });
    else await prisma.alumno.create({ data });
  } catch {
    return { error: "No se pudo guardar (¿RUT duplicado?)" };
  }
  revalidatePath("/alumnos");
  revalidatePath("/cobranza");
  return { ok: true };
}

export async function eliminarAlumno(fd: FormData): Promise<void> {
  await requireGestion();
  try {
    await prisma.alumno.delete({ where: { idAlumno: String(fd.get("id")) } });
  } catch {
    /* tiene negocios asociados: no se elimina */
  }
  revalidatePath("/alumnos");
}

// ----------------- Programas -----------------

const programaSchema = z.object({
  codPrograma: z.string().min(1, "Código requerido"),
  descripcion: z.string().min(1, "Descripción requerida"),
  fechaInicio: z.string().min(1, "Fecha inicio requerida"),
  fechaFin: z.string().min(1, "Fecha fin requerida"),
});

export async function guardarPrograma(
  _prev: ActionState,
  fd: FormData,
): Promise<ActionState> {
  await requireGestion();
  const parsed = programaSchema.safeParse(Object.fromEntries(fd));
  if (!parsed.success) return { error: parsed.error.errors[0]?.message };
  const p = parsed.data;
  const valor = fd.get("valor") ? Number(fd.get("valor")) : null;
  const esEdicion = opt(fd.get("modo")) === "edit";

  try {
    if (esEdicion) {
      await prisma.programa.update({
        where: { codPrograma: p.codPrograma },
        data: {
          descripcion: p.descripcion,
          fechaInicio: new Date(p.fechaInicio),
          fechaFin: new Date(p.fechaFin),
          valor,
        },
      });
    } else {
      await prisma.programa.create({
        data: {
          codPrograma: p.codPrograma,
          descripcion: p.descripcion,
          fechaInicio: new Date(p.fechaInicio),
          fechaFin: new Date(p.fechaFin),
          valor,
        },
      });
    }
  } catch {
    return { error: "No se pudo guardar (¿código duplicado?)" };
  }
  revalidatePath("/programas");
  return { ok: true };
}

export async function eliminarPrograma(fd: FormData): Promise<void> {
  await requireGestion();
  try {
    await prisma.programa.delete({ where: { codPrograma: String(fd.get("id")) } });
  } catch {
    /* tiene negocios asociados */
  }
  revalidatePath("/programas");
}

// ----------------- Negocios -----------------

const negocioSchema = z.object({
  idAlumno: z.string().min(1, "Selecciona un alumno"),
  codPrograma: z.string().min(1, "Selecciona un programa"),
  montoNegocio: z.coerce.number().positive("Monto inválido"),
  moneda: z.enum(["CLP", "PEN", "USD"]),
  tipoNegocio: z.string().min(1, "Selecciona un tipo de negocio"),
  tipoVenta: z.string().min(1, "Selecciona un tipo de venta"),
  tipoDocto: z.string().min(1, "Selecciona un tipo de documento"),
  estadoNegocio: z.string().min(1, "Selecciona un estado"),
});

// ----------------- Vendedores -----------------

const vendedorSchema = z.object({
  nombre: z.string().min(1, "Nombre requerido"),
});

export async function guardarVendedor(
  _prev: ActionState,
  fd: FormData,
): Promise<ActionState> {
  await requireGestion();
  const parsed = vendedorSchema.safeParse(Object.fromEntries(fd));
  if (!parsed.success) return { error: parsed.error.errors[0]?.message };

  const data = {
    nombre: String(fd.get("nombre")).trim(),
    email: opt(fd.get("email")),
    telefono: opt(fd.get("telefono")),
    activo: fd.get("activo") !== "false",
  };
  const id = opt(fd.get("id"));
  try {
    if (id) await prisma.vendedor.update({ where: { id }, data });
    else await prisma.vendedor.create({ data });
  } catch {
    return { error: "No se pudo guardar el vendedor" };
  }
  revalidatePath("/vendedores");
  revalidatePath("/negocios");
  return { ok: true };
}

export async function eliminarVendedor(fd: FormData): Promise<void> {
  await requireGestion();
  try {
    await prisma.vendedor.delete({ where: { id: String(fd.get("id")) } });
  } catch {
    /* tiene negocios asociados */
  }
  revalidatePath("/vendedores");
}

interface OcInput {
  tipoOC: "OTIC" | "OTEC" | "EMPRESA";
  numeroOC: string;
  entidadNombre: string;
  entidadRut?: string;
  monto: string;
  estadoOC: "PENDIENTE" | "FACTURADA" | "PAGADA" | "ANULADA";
}

function parseOcs(fd: FormData): OcInput[] {
  const raw = fd.get("ocsNuevas");
  if (!raw) return [];
  try {
    const arr = JSON.parse(String(raw)) as OcInput[];
    return Array.isArray(arr) ? arr.filter((o) => o.numeroOC && o.entidadNombre && Number(o.monto) > 0) : [];
  } catch {
    return [];
  }
}

export async function crearNegocio(
  _prev: ActionState,
  fd: FormData,
): Promise<ActionState> {
  await requireGestion();
  const parsed = negocioSchema.safeParse(Object.fromEntries(fd));
  if (!parsed.success) return { error: parsed.error.errors[0]?.message };
  const d = parsed.data;
  const recordIdInput = String(fd.get("recordId") ?? "").trim();
  if (!recordIdInput || !/^\d+$/.test(recordIdInput)) {
    return { error: "El Record ID debe ser un número entero (solo dígitos, sin puntos ni guiones)" };
  }
  const ocsNuevas = parseOcs(fd);
  try {
    const idVendedor = opt(fd.get("idVendedor"));
    const negocio = await prisma.negocio.create({
      data: {
        recordId: recordIdInput,
        idAlumno: d.idAlumno,
        codPrograma: d.codPrograma,
        montoNegocio: d.montoNegocio,
        moneda: d.moneda,
        tipoNegocio: d.tipoNegocio,
        tipoVenta: d.tipoVenta,
        tipoDocto: d.tipoDocto,
        estadoNegocio: d.estadoNegocio,
        idVendedor,
      },
    });
    for (const oc of ocsNuevas) {
      await prisma.ordenCompra.create({
        data: {
          recordId: negocio.recordId,
          tipoOC: oc.tipoOC,
          numeroOC: oc.numeroOC,
          entidadNombre: oc.entidadNombre,
          entidadRut: oc.entidadRut || null,
          monto: Number(oc.monto),
          estadoOC: oc.estadoOC,
        },
      });
    }
  } catch {
    return { error: "No se pudo crear el negocio" };
  }
  revalidatePath("/negocios");
  revalidatePath("/cobranza");
  revalidatePath("/pre-cobranza");
  revalidatePath("/");
  return { ok: true };
}

export async function actualizarNegocio(
  _prev: ActionState,
  fd: FormData,
): Promise<ActionState> {
  await requireGestion();
  const parsed = negocioSchema.safeParse(Object.fromEntries(fd));
  if (!parsed.success) return { error: parsed.error.errors[0]?.message };
  const d = parsed.data;
  const recordId = String(fd.get("recordId") ?? "");
  if (!recordId) return { error: "RecordID inválido" };
  const ocsNuevas = parseOcs(fd);
  try {
    const idVendedor = opt(fd.get("idVendedor"));
    await prisma.negocio.update({
      where: { recordId },
      data: {
        idAlumno: d.idAlumno,
        codPrograma: d.codPrograma,
        montoNegocio: d.montoNegocio,
        moneda: d.moneda,
        tipoNegocio: d.tipoNegocio,
        tipoVenta: d.tipoVenta,
        tipoDocto: d.tipoDocto,
        estadoNegocio: d.estadoNegocio,
        idVendedor,
      },
    });
    for (const oc of ocsNuevas) {
      await prisma.ordenCompra.create({
        data: {
          recordId,
          tipoOC: oc.tipoOC,
          numeroOC: oc.numeroOC,
          entidadNombre: oc.entidadNombre,
          entidadRut: oc.entidadRut || null,
          monto: Number(oc.monto),
          estadoOC: oc.estadoOC,
        },
      });
    }
  } catch {
    return { error: "No se pudo actualizar el negocio" };
  }
  revalidatePath("/negocios");
  revalidatePath("/cobranza");
  revalidatePath("/pre-cobranza");
  revalidatePath("/");
  return { ok: true };
}

export async function actualizarEstadoNegocio(fd: FormData): Promise<void> {
  await requireGestion();
  const estado = String(fd.get("estadoNegocio"));
  await prisma.negocio.update({
    where: { recordId: String(fd.get("id")) },
    data: { estadoNegocio: estado },
  });
  revalidatePath("/negocios");
  revalidatePath("/cobranza");
}

export async function eliminarNegocio(fd: FormData): Promise<void> {
  await requireGestion();
  await prisma.negocio.delete({ where: { recordId: String(fd.get("id")) } });
  revalidatePath("/negocios");
  revalidatePath("/cobranza");
  revalidatePath("/");
}

// ----------------- Usuarios -----------------

const usuarioSchema = z.object({
  email: z.string().email("Email inválido"),
  nombre: z.string().min(1, "Nombre requerido"),
  rol: z.enum(["ADMIN", "SUPERVISOR", "COBRADOR"]),
});

export async function guardarUsuario(
  _prev: ActionState,
  fd: FormData,
): Promise<ActionState> {
  await requireAdmin();
  const parsed = usuarioSchema.safeParse(Object.fromEntries(fd));
  if (!parsed.success) return { error: parsed.error.errors[0]?.message };
  const d = parsed.data;
  const id = opt(fd.get("id"));
  const password = opt(fd.get("password"));
  const activo = fd.get("activo") === "on" || fd.get("activo") === "true";

  try {
    if (id) {
      await prisma.usuario.update({
        where: { id },
        data: {
          nombre: d.nombre,
          rol: d.rol,
          activo,
          ...(password ? { passwordHash: await bcrypt.hash(password, 10) } : {}),
        },
      });
    } else {
      if (!password) return { error: "La contraseña es obligatoria" };
      await prisma.usuario.create({
        data: {
          email: d.email,
          nombre: d.nombre,
          rol: d.rol,
          activo,
          passwordHash: await bcrypt.hash(password, 10),
        },
      });
    }
  } catch {
    return { error: "No se pudo guardar (¿email duplicado?)" };
  }
  revalidatePath("/usuarios");
  return { ok: true };
}
