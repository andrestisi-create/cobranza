"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/db";
import { auth } from "@/auth";
import type { ActionState } from "@/lib/types";
import { getTodasLasOpciones } from "@/server/opciones";
import { parseNumero } from "@/lib/format";

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
    const monto = parseNumero(r[`oc${n}Monto`]);
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
  try {
    await requireGestion();
  } catch (e) {
    return { error: e instanceof Error ? e.message : "Sin permisos" };
  }

  const raw = fd.get("json");
  if (!raw) return { error: "No se recibieron datos" };

  let rows: Record<string, string>[];
  try {
    rows = JSON.parse(String(raw));
  } catch {
    return { error: "Datos inválidos" };
  }

  let opciones;
  try {
    opciones = await getTodasLasOpciones();
  } catch (e) {
    return { error: `No se pudieron cargar los catálogos: ${e instanceof Error ? e.message : "error desconocido"}` };
  }

  const errores: { fila: number; mensaje: string }[] = [];

  // ── Precargar todo lo necesario en memoria (evita N+1: 1 query en vez de miles) ──
  const rutsArchivo = [...new Set(rows.map((r) => r.rutAlumno?.trim()).filter(Boolean))];
  const codsPrograma = [...new Set(rows.map((r) => r.codPrograma?.trim()).filter(Boolean))];
  const recordIdsArchivo = rows.map((r) => r.recordId?.trim()).filter(Boolean);

  let alumnosDb, programasDb, negociosExistentes;
  try {
    [alumnosDb, programasDb, negociosExistentes] = await Promise.all([
      prisma.alumno.findMany({ where: { rut: { in: rutsArchivo } }, select: { idAlumno: true, rut: true } }),
      prisma.programa.findMany({ where: { codPrograma: { in: codsPrograma } }, select: { codPrograma: true } }),
      prisma.negocio.findMany({ where: { recordId: { in: recordIdsArchivo } }, select: { recordId: true } }),
    ]);
  } catch (e) {
    return { error: `No se pudieron precargar los datos: ${e instanceof Error ? e.message : "error desconocido"}` };
  }

  const alumnoPorRut = new Map(alumnosDb.map((a) => [a.rut, a]));
  const programasValidos = new Set(programasDb.map((p) => p.codPrograma));
  const recordIdsExistentes = new Set(negociosExistentes.map((n) => n.recordId));
  const recordIdsVistos = new Set<string>();

  interface NegocioInput {
    recordId: string;
    idAlumno: string;
    codPrograma: string;
    montoNegocio: number;
    moneda: "CLP" | "PEN" | "USD";
    tipoNegocio: string;
    tipoVenta: string;
    tipoDocto: string;
    estadoNegocio: string;
  }
  interface OcInput {
    recordId: string;
    tipoOC: "OTIC" | "OTEC" | "EMPRESA";
    numeroOC: string;
    entidadNombre: string;
    entidadRut: string | null;
    monto: number;
    estadoOC: "PENDIENTE";
  }
  const negociosACrear: NegocioInput[] = [];
  const ocsACrear: OcInput[] = [];

  for (let i = 0; i < rows.length; i++) {
    const r = rows[i];
    const fila = i + 2;

    const recordId = r.recordId?.trim();
    if (!recordId || !/^\d+$/.test(recordId)) {
      errores.push({ fila, mensaje: "Record ID inválido (debe ser un número entero)" });
      continue;
    }
    if (recordIdsExistentes.has(recordId)) {
      errores.push({ fila, mensaje: `Record ID "${recordId}" ya existe en el sistema` });
      continue;
    }
    if (recordIdsVistos.has(recordId)) {
      errores.push({ fila, mensaje: `Record ID "${recordId}" duplicado dentro del archivo` });
      continue;
    }

    const rut = r.rutAlumno?.trim();
    const alumno = alumnoPorRut.get(rut ?? "");
    if (!alumno) {
      errores.push({ fila, mensaje: `Alumno con RUT "${rut}" no encontrado` });
      continue;
    }

    const codPrograma = r.codPrograma?.trim() ?? "";
    if (!programasValidos.has(codPrograma)) {
      errores.push({ fila, mensaje: `Programa "${codPrograma}" no encontrado` });
      continue;
    }

    const tipoNegocio = r.tipoNegocio?.trim() ?? "";
    const tipoVenta = r.tipoVenta?.trim() ?? "";
    const tipoDocto = r.tipoDocto?.trim() ?? "";
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

    const montoNegocio = parseNumero(r.montoNegocio);
    if (isNaN(montoNegocio) || montoNegocio <= 0) {
      errores.push({ fila, mensaje: `Monto inválido: "${r.montoNegocio}"` });
      continue;
    }

    recordIdsVistos.add(recordId);
    negociosACrear.push({
      recordId,
      idAlumno: alumno.idAlumno,
      codPrograma,
      montoNegocio,
      moneda: moneda as "CLP" | "PEN" | "USD",
      tipoNegocio,
      tipoVenta,
      tipoDocto,
      estadoNegocio,
    });

    for (const oc of extraerOcs(r)) {
      ocsACrear.push({
        recordId,
        tipoOC: oc.tipo,
        numeroOC: oc.numero,
        entidadNombre: oc.entidadNombre,
        entidadRut: oc.entidadRut,
        monto: oc.monto,
        estadoOC: "PENDIENTE",
      });
    }
  }

  // ── Insertar en lotes (createMany) en vez de fila por fila ──
  const TAM_LOTE = 500;
  let creados = 0;
  try {
    for (let i = 0; i < negociosACrear.length; i += TAM_LOTE) {
      const lote = negociosACrear.slice(i, i + TAM_LOTE);
      const resultado = await prisma.negocio.createMany({ data: lote, skipDuplicates: true });
      creados += resultado.count;
    }
    for (let i = 0; i < ocsACrear.length; i += TAM_LOTE) {
      const lote = ocsACrear.slice(i, i + TAM_LOTE);
      await prisma.ordenCompra.createMany({ data: lote });
    }
  } catch (e) {
    return { error: `Error al insertar en la base de datos: ${e instanceof Error ? e.message : "error desconocido"}` };
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

const MEDIOS_VALIDOS = ["TRANSFERENCIA", "WEBPAY", "MERCADOPAGO_LINK", "MERCADOPAGO_TARJETA", "CHEQUE", "EFECTIVO", "OTRO"];

export async function importarPagos(
  _prev: ActionState,
  fd: FormData,
): Promise<ActionState> {
  try {
    await requireGestion();
  } catch (e) {
    return { error: e instanceof Error ? e.message : "Sin permisos" };
  }

  const raw = fd.get("json");
  if (!raw) return { error: "No se recibieron datos" };

  let rows: Record<string, string>[];
  try {
    rows = JSON.parse(String(raw));
  } catch {
    return { error: "Datos inválidos" };
  }

  const errores: { fila: number; mensaje: string }[] = [];

  // ── Precargar los negocios referenciados (evita N+1: 1 query en vez de miles) ──
  const recordIdsArchivo = [...new Set(rows.map((r) => r.recordId?.trim()).filter(Boolean))];
  let negociosDb;
  try {
    negociosDb = await prisma.negocio.findMany({
      where: { recordId: { in: recordIdsArchivo } },
      select: { recordId: true },
    });
  } catch (e) {
    return { error: `No se pudieron precargar los negocios: ${e instanceof Error ? e.message : "error desconocido"}` };
  }
  const recordIdsValidos = new Set(negociosDb.map((n) => n.recordId));

  interface PagoInput {
    recordId: string;
    montoPago: number;
    fechaPago: Date;
    medioPago: "TRANSFERENCIA" | "WEBPAY" | "MERCADOPAGO_LINK" | "MERCADOPAGO_TARJETA" | "CHEQUE" | "EFECTIVO" | "OTRO";
    referencia: string | null;
    observacion: string | null;
  }
  interface DocumentoInput {
    recordId: string;
    tipoDocto: string;
    folio: string | null;
    fechaEmision: Date | null;
    monto: number;
  }
  const pagosACrear: PagoInput[] = [];
  const documentosACrear: DocumentoInput[] = [];

  for (let i = 0; i < rows.length; i++) {
    const r = rows[i];
    const fila = i + 2;

    const recordId = r.recordId?.trim();
    if (!recordId) {
      errores.push({ fila, mensaje: "Record ID requerido" });
      continue;
    }
    if (!recordIdsValidos.has(recordId)) {
      errores.push({ fila, mensaje: `Negocio con Record ID "${recordId}" no encontrado` });
      continue;
    }

    const monto = parseNumero(r.montoPago);
    if (!monto || monto <= 0) {
      errores.push({ fila, mensaje: "Monto de pago inválido" });
      continue;
    }

    const medioRaw = r.medioPago?.trim().toUpperCase();
    const medioPago = (
      MEDIOS_VALIDOS.includes(medioRaw) ? medioRaw : "TRANSFERENCIA"
    ) as PagoInput["medioPago"];

    pagosACrear.push({
      recordId,
      montoPago: monto,
      fechaPago: r.fechaPago?.trim() ? parseFecha(r.fechaPago.trim()) : new Date(),
      medioPago,
      referencia: r.referencia?.trim() || null,
      observacion: r.observacion?.trim() || null,
    });

    // Documento tributario opcional (boleta, factura, OC)
    const tipoDoctoRaw = r.tipoDocto?.trim().toUpperCase();
    if (tipoDoctoRaw === "FACTURA" || tipoDoctoRaw === "BOLETA" || tipoDoctoRaw === "ORDEN_COMPRA") {
      documentosACrear.push({
        recordId,
        tipoDocto: tipoDoctoRaw,
        folio: r.folioDocto?.trim() || null,
        fechaEmision: r.fechaDocto?.trim() ? parseFecha(r.fechaDocto.trim()) : null,
        monto: r.montoDocto?.trim() ? parseNumero(r.montoDocto) : monto,
      });
    }
  }

  // ── Insertar en lotes (createMany) en vez de fila por fila ──
  const TAM_LOTE = 500;
  let creados = 0;
  try {
    for (let i = 0; i < pagosACrear.length; i += TAM_LOTE) {
      const lote = pagosACrear.slice(i, i + TAM_LOTE);
      const resultado = await prisma.pago.createMany({ data: lote });
      creados += resultado.count;
    }
    for (let i = 0; i < documentosACrear.length; i += TAM_LOTE) {
      const lote = documentosACrear.slice(i, i + TAM_LOTE);
      await prisma.documentoTributario.createMany({ data: lote });
    }
  } catch (e) {
    return { error: `Error al insertar en la base de datos: ${e instanceof Error ? e.message : "error desconocido"}` };
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
