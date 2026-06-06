"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { prisma } from "@/lib/db";
import { auth } from "@/auth";
import type { ActionState } from "@/lib/types";

async function requireUser() {
  const session = await auth();
  if (!session?.user) throw new Error("No autenticado");
  return session.user;
}

function revalidarCobranza() {
  revalidatePath("/cobranza");
  revalidatePath("/pre-cobranza");
  revalidatePath("/");
  revalidatePath("/negocios");
}

// ---------------- Pagos ----------------

const pagoSchema = z.object({
  recordId: z.string().min(1),
  montoPago: z.coerce.number().positive("El monto debe ser mayor a 0"),
  medioPago: z.enum(["TRANSFERENCIA", "CHEQUE", "EFECTIVO", "TARJETA", "OTRO"]),
  fechaPago: z.string().optional(),
  referencia: z.string().optional(),
  observacion: z.string().optional(),
});

export async function registrarPago(
  _prev: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const user = await requireUser();
  const parsed = pagoSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) {
    return { error: parsed.error.errors[0]?.message ?? "Datos inválidos" };
  }
  const d = parsed.data;
  try {
    await prisma.pago.create({
      data: {
        recordId: d.recordId,
        montoPago: d.montoPago,
        medioPago: d.medioPago,
        fechaPago: d.fechaPago ? new Date(d.fechaPago) : new Date(),
        referencia: d.referencia || null,
        observacion: d.observacion || null,
        registradoPorId: user.id,
      },
    });
  } catch {
    return { error: "No se pudo registrar el pago" };
  }
  revalidarCobranza();
  return { ok: true };
}

export async function eliminarPago(formData: FormData): Promise<void> {
  const user = await requireUser();
  if (user.rol === "COBRADOR") throw new Error("Sin permisos para eliminar pagos");
  const id = String(formData.get("id"));
  await prisma.pago.delete({ where: { id } });
  revalidarCobranza();
}

// ---------------- Órdenes de compra (Sence) ----------------

const ocSchema = z.object({
  recordId: z.string().min(1),
  tipoOC: z.enum(["OTIC", "EMPRESA"]),
  numeroOC: z.string().min(1, "Indica el número de OC"),
  entidadNombre: z.string().min(1, "Indica la OTIC o empresa"),
  entidadRut: z.string().optional(),
  monto: z.coerce.number().positive("El monto debe ser mayor a 0"),
  fechaOC: z.string().optional(),
  estadoOC: z.enum(["PENDIENTE", "FACTURADA", "PAGADA", "ANULADA"]),
  observacion: z.string().optional(),
});

export async function crearOrdenCompra(
  _prev: ActionState,
  formData: FormData,
): Promise<ActionState> {
  await requireUser();
  const parsed = ocSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) {
    return { error: parsed.error.errors[0]?.message ?? "Datos inválidos" };
  }
  const d = parsed.data;
  try {
    await prisma.ordenCompra.create({
      data: {
        recordId: d.recordId,
        tipoOC: d.tipoOC,
        numeroOC: d.numeroOC,
        entidadNombre: d.entidadNombre,
        entidadRut: d.entidadRut || null,
        monto: d.monto,
        fechaOC: d.fechaOC ? new Date(d.fechaOC) : null,
        estadoOC: d.estadoOC,
        observacion: d.observacion || null,
      },
    });
  } catch {
    return { error: "No se pudo crear la orden de compra" };
  }
  revalidarCobranza();
  return { ok: true };
}

export async function eliminarOrdenCompra(formData: FormData): Promise<void> {
  const user = await requireUser();
  if (user.rol === "COBRADOR") throw new Error("Sin permisos");
  const id = String(formData.get("id"));
  await prisma.ordenCompra.delete({ where: { id } });
  revalidarCobranza();
}

// ---------------- Documento tributario (informativo) ----------------

const docSchema = z.object({
  recordId: z.string().min(1),
  tipoDocto: z.enum(["FACTURA", "BOLETA", "ORDEN_COMPRA"]),
  folio: z.string().optional(),
  fechaEmision: z.string().optional(),
  monto: z.coerce.number().optional(),
});

export async function registrarDocumento(
  _prev: ActionState,
  formData: FormData,
): Promise<ActionState> {
  await requireUser();
  const parsed = docSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) {
    return { error: parsed.error.errors[0]?.message ?? "Datos inválidos" };
  }
  const d = parsed.data;
  try {
    await prisma.documentoTributario.create({
      data: {
        recordId: d.recordId,
        tipoDocto: d.tipoDocto,
        folio: d.folio || null,
        fechaEmision: d.fechaEmision ? new Date(d.fechaEmision) : new Date(),
        monto: d.monto ?? null,
      },
    });
  } catch {
    return { error: "No se pudo registrar el documento" };
  }
  revalidarCobranza();
  return { ok: true };
}
