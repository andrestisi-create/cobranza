"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/db";
import { auth } from "@/auth";
import type { ActionState } from "@/lib/types";
import { getTodasLasOpciones } from "@/server/opciones";

/** Parsea fechas en YYYY-MM-DD o DD-MM-YYYY. */
function parseFecha(str: string): Date {
  if (/^\d{2}-\d{2}-\d{4}$/.test(str.trim())) {
    const [d, m, y] = str.trim().split("-");
    return new Date(`${y}-${m}-${d}`);
  }
  return new Date(str.trim());
}

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
        fechaInicio: parseFecha(r.fechaInicio?.trim()),
        fechaFin: parseFecha(r.fechaFin?.trim()),
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

interface OcImport {
  tipo: "OTIC" | "OTEC" | "EMPRESA";
  numero: string;
  entidadNombre: string;
  entidadRut: string | null;
  monto: number;
}

function extraerOcs(r: Record<string, string>): OcImport[] {
  const ocs: OcImport[] = [];
  for (const n of [1, 2, 3] as const) {
    const numero = r[`oc${n}Numero`]?.trim();
    const entidadNombre = r[`oc${n}EntidadNombre`]?.trim();
    const monto = Number(r[`oc${n}Monto`]?.trim());
    if (!numero || !entidadNombre || !(monto > 0)) continue;

    const tipoRaw = r[`oc${n}Tipo`]?.trim().toUpperCase();
    const tipo: "OTIC" | "OTEC" | "EMPRESA" =
      tipoRaw === "OTEC" ? "OTEC" : tipoRaw === "EMPRESA" ? "EMPRESA" : "OTIC";

    ocs.push({
      tipo,
      numero,
      entidadNombre,
      entidadRut: r[`oc${n}EntidadRut`]?.trim() || null,
      monto,
    });
  }
  return ocs;
}

const MONEDAS_VALIDAS = ["CLP", "PEN", "USD"];

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

  const opciones = await getTodasLasOpciones();

  let creados = 0;
  const errores: { fila: number; mensaje: string }[] = [];

  for (let i = 0; i < rows.length; i++) {
    const r = rows[i];
    const fila = i + 2;
    try {
      // Validar recordId
      const recordId = r.recordId?.trim();
      if (!recordId || !/^\d+$/.test(recordId)) {
        errores.push({ fila, mensaje: "Record ID inválido (debe ser un número entero)" });
        continue;
      }

      // Buscar alumno por RUT
      const alumno = await prisma.alumno.findFirst({
        where: { rut: r.rutAlumno?.trim() },
      });
      if (!alumno) {
        errores.push({
          fila,
          mensaje: `Alumno con RUT "${r.rutAlumno?.trim()}" no encontrado`,
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
          mensaje: `Programa "${r.codPrograma?.trim()}" no encontrado`,
        });
        continue;
      }

      const tipoNegocio = r.tipoNegocio?.trim();
      const tipoVenta = r.tipoVenta?.trim();
      const tipoDocto = r.tipoDocto?.trim();
      const estadoNegocio = r.estadoNegocio?.trim() || "MATRICULADO";
      const moneda = r.moneda?.trim().toUpperCase() || "CLP";

      if (!opciones.tiposNegocio.includes(tipoNegocio)) {
        errores.push({ fila, mensaje: `Tipo negocio inválido: "${tipoNegocio}". Válidos: ${opciones.tiposNegocio.join(", ")}` });
        continue;
      }
      if (!opciones.tiposVenta.includes(tipoVenta)) {
        errores.push({ fila, mensaje: `Tipo venta inválido: "${tipoVenta}". Válidos: ${opciones.tiposVenta.join(", ")}` });
        continue;
      }
      if (!opciones.tiposDocto.includes(tipoDocto)) {
        errores.push({ fila, mensaje: `Tipo documento inválido: "${tipoDocto}". Válidos: ${opciones.tiposDocto.join(", ")}` });
        continue;
      }
      if (!opciones.estadosNegocio.includes(estadoNegocio)) {
        errores.push({ fila, mensaje: `Estado inválido: "${estadoNegocio}". Válidos: ${opciones.estadosNegocio.join(", ")}` });
        continue;
      }
      if (!MONEDAS_VALIDAS.includes(moneda)) {
        errores.push({ fila, mensaje: `Moneda inválida: "${moneda}". Válidas: ${MONEDAS_VALIDAS.join(", ")}` });
        continue;
      }

      const negocio = await prisma.negocio.create({
        data: {
          recordId,
          idAlumno: alumno.idAlumno,
          codPrograma: programa.codPrograma,
          montoNegocio: Number(r.montoNegocio?.trim()),
          moneda: moneda as "CLP" | "PEN" | "USD",
          tipoNegocio,
          tipoVenta,
          tipoDocto,
          estadoNegocio,
        },
      });

      // Crear OCs si vienen en el CSV
      const ocsImport = extraerOcs(r);
      for (const oc of ocsImport) {
        await prisma.ordenCompra.create({
          data: {
            recordId: negocio.recordId,
            tipoOC: oc.tipo,
            numeroOC: oc.numero,
            entidadNombre: oc.entidadNombre,
            entidadRut: oc.entidadRut,
            monto: oc.monto,
            estadoOC: "PENDIENTE",
          },
        });
      }

      creados++;
    } catch {
      errores.push({
        fila,
        mensaje: "No se pudo crear el negocio (¿Record ID duplicado?)",
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
// Importar pagos masivos (+ documento opcional)
// ─────────────────────────────────────────────

export async function importarPagos(
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
      const recordId = r.recordId?.trim();
      if (!recordId) {
        errores.push({ fila, mensaje: "Record ID requerido" });
        continue;
      }

      // Verificar que el negocio existe
      const negocio = await prisma.negocio.findUnique({ where: { recordId } });
      if (!negocio) {
        errores.push({
          fila,
          mensaje: `Negocio con Record ID "${recordId}" no encontrado`,
        });
        continue;
      }

      const monto = Number(r.montoPago?.trim());
      if (!monto || monto <= 0) {
        errores.push({ fila, mensaje: "Monto de pago inválido" });
        continue;
      }

      const medioRaw = r.medioPago?.trim().toUpperCase();
      const MEDIOS_VALIDOS = ["TRANSFERENCIA", "WEBPAY", "MERCADOPAGO_LINK", "MERCADOPAGO_TARJETA", "CHEQUE", "EFECTIVO", "OTRO"];
      const medioPago = (
        MEDIOS_VALIDOS.includes(medioRaw) ? medioRaw : "TRANSFERENCIA"
      ) as "TRANSFERENCIA" | "WEBPAY" | "MERCADOPAGO_LINK" | "MERCADOPAGO_TARJETA" | "CHEQUE" | "EFECTIVO" | "OTRO";

      await prisma.pago.create({
        data: {
          recordId,
          montoPago: monto,
          fechaPago: r.fechaPago?.trim()
            ? parseFecha(r.fechaPago.trim())
            : new Date(),
          medioPago,
          referencia: r.referencia?.trim() || null,
          observacion: r.observacion?.trim() || null,
        },
      });

      // Documento tributario opcional (boleta, factura, OC)
      const tipoDoctoRaw = r.tipoDocto?.trim().toUpperCase();
      if (
        tipoDoctoRaw === "FACTURA" ||
        tipoDoctoRaw === "BOLETA" ||
        tipoDoctoRaw === "ORDEN_COMPRA"
      ) {
        await prisma.documentoTributario.create({
          data: {
            recordId,
            tipoDocto: tipoDoctoRaw,
            folio: r.folioDocto?.trim() || null,
            fechaEmision: r.fechaDocto?.trim()
              ? parseFecha(r.fechaDocto.trim())
              : null,
            monto: r.montoDocto?.trim()
              ? Number(r.montoDocto.trim())
              : monto,
          },
        });
      }

      creados++;
    } catch {
      errores.push({
        fila,
        mensaje: "No se pudo registrar el pago (verifique los datos)",
      });
    }
  }

  if (creados > 0) {
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
