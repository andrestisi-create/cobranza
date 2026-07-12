"use server";

import { randomUUID } from "crypto";
import { revalidatePath } from "next/cache";
import { Prisma } from "@prisma/client";
import { prisma } from "@/lib/db";
import { auth } from "@/auth";
import type { ActionState } from "@/lib/types";
import { getTodasLasOpciones } from "@/server/opciones";
import { parseNumero } from "@/lib/format";

const TAM_LOTE = 500;

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

  const errores: { fila: number; mensaje: string }[] = [];

  interface AlumnoInput {
    idAlumno: string;
    rut: string;
    nombre: string;
    segundoNombre: string | null;
    apellidoPaterno: string;
    apellidoMaterno: string | null;
    email: string | null;
    telefono: string | null;
    direccion: string | null;
    fechaNacimiento: Date | null;
  }

  // Si el mismo RUT aparece varias veces en el archivo, gana la última fila
  // (evita el error de Postgres "ON CONFLICT DO UPDATE cannot affect row a second time").
  const porRut = new Map<string, AlumnoInput>();

  for (let i = 0; i < rows.length; i++) {
    const r = rows[i];
    const fila = i + 2; // fila 1 = encabezado
    const rut = r.rut?.trim();
    if (!rut) {
      errores.push({ fila, mensaje: "RUT requerido" });
      continue;
    }
    porRut.set(rut, {
      idAlumno: randomUUID(),
      rut,
      nombre: r.nombre?.trim() ?? "",
      segundoNombre: r.segundoNombre?.trim() || null,
      apellidoPaterno: r.apellidoPaterno?.trim() ?? "",
      apellidoMaterno: r.apellidoMaterno?.trim() || null,
      email: r.email?.trim() || null,
      telefono: r.telefono?.trim() || null,
      direccion: r.direccion?.trim() || null,
      fechaNacimiento: r.fechaNacimiento?.trim() ? new Date(r.fechaNacimiento.trim()) : null,
    });
  }

  const alumnos = [...porRut.values()];
  let creados = 0;
  try {
    for (let i = 0; i < alumnos.length; i += TAM_LOTE) {
      const lote = alumnos.slice(i, i + TAM_LOTE);
      const values = lote.map(
        (a) => Prisma.sql`(${a.idAlumno}, ${a.rut}, ${a.nombre}, ${a.segundoNombre}, ${a.apellidoPaterno}, ${a.apellidoMaterno}, ${a.email}, ${a.telefono}, ${a.direccion}, ${a.fechaNacimiento})`,
      );
      // Upsert por RUT: si ya existe, actualiza — pero solo sobreescribe campos
      // que vengan con valor en el archivo, para no borrar datos ya cargados
      // con una fila que solo trae el RUT.
      const count = await prisma.$executeRaw`
        INSERT INTO "alumnos" ("idAlumno","rut","nombre","segundoNombre","apellidoPaterno","apellidoMaterno","email","telefono","direccion","fechaNacimiento")
        VALUES ${Prisma.join(values)}
        ON CONFLICT ("rut") DO UPDATE SET
          "nombre" = COALESCE(NULLIF(EXCLUDED."nombre", ''), "alumnos"."nombre"),
          "segundoNombre" = COALESCE(EXCLUDED."segundoNombre", "alumnos"."segundoNombre"),
          "apellidoPaterno" = COALESCE(NULLIF(EXCLUDED."apellidoPaterno", ''), "alumnos"."apellidoPaterno"),
          "apellidoMaterno" = COALESCE(EXCLUDED."apellidoMaterno", "alumnos"."apellidoMaterno"),
          "email" = COALESCE(EXCLUDED."email", "alumnos"."email"),
          "telefono" = COALESCE(EXCLUDED."telefono", "alumnos"."telefono"),
          "direccion" = COALESCE(EXCLUDED."direccion", "alumnos"."direccion"),
          "fechaNacimiento" = COALESCE(EXCLUDED."fechaNacimiento", "alumnos"."fechaNacimiento")
      `;
      creados += count;
    }
  } catch (e) {
    return { error: `No se pudieron guardar los alumnos: ${e instanceof Error ? e.message : "error desconocido"}` };
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

  // ── Crear automáticamente los alumnos cuyo RUT no existe (solo con el RUT) ──
  const rutsFaltantes = rutsArchivo.filter((rut) => !alumnoPorRut.has(rut));
  if (rutsFaltantes.length > 0) {
    try {
      for (let i = 0; i < rutsFaltantes.length; i += 500) {
        const lote = rutsFaltantes.slice(i, i + 500);
        await prisma.alumno.createMany({
          data: lote.map((rut) => ({ rut, nombre: "", apellidoPaterno: "" })),
          skipDuplicates: true,
        });
      }
      const alumnosCreados = await prisma.alumno.findMany({
        where: { rut: { in: rutsFaltantes } },
        select: { idAlumno: true, rut: true },
      });
      for (const a of alumnosCreados) alumnoPorRut.set(a.rut, a);
    } catch (e) {
      return { error: `No se pudieron crear los alumnos faltantes: ${e instanceof Error ? e.message : "error desconocido"}` };
    }
  }

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
    // Si el Record ID ya existe se actualiza (upsert); si no, se crea.
    if (recordIdsVistos.has(recordId)) {
      errores.push({ fila, mensaje: `Record ID "${recordId}" duplicado dentro del archivo` });
      continue;
    }

    const rut = r.rutAlumno?.trim();
    if (!rut) {
      errores.push({ fila, mensaje: "RUT del alumno requerido" });
      continue;
    }
    const alumno = alumnoPorRut.get(rut);
    if (!alumno) {
      errores.push({ fila, mensaje: `No se pudo crear/encontrar el alumno con RUT "${rut}"` });
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

    // Las OCs solo se crean para negocios nuevos — si el negocio ya existía y se
    // está actualizando, no se vuelven a agregar (evitaría duplicarlas en cada re-carga).
    if (!recordIdsExistentes.has(recordId)) {
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
  }

  // ── Insertar/actualizar en lotes vía upsert masivo (INSERT ... ON CONFLICT) ──
  let creados = 0;
  try {
    for (let i = 0; i < negociosACrear.length; i += TAM_LOTE) {
      const lote = negociosACrear.slice(i, i + TAM_LOTE);
      const values = lote.map(
        (n) => Prisma.sql`(${n.recordId}, ${n.idAlumno}, ${n.codPrograma}, ${n.montoNegocio}, ${n.moneda}::"Moneda", ${n.tipoNegocio}, ${n.tipoVenta}, ${n.tipoDocto}, ${n.estadoNegocio}, NOW())`,
      );
      const count = await prisma.$executeRaw`
        INSERT INTO "negocios" ("recordId","idAlumno","codPrograma","montoNegocio","moneda","tipoNegocio","tipoVenta","tipoDocto","estadoNegocio","updatedAt")
        VALUES ${Prisma.join(values)}
        ON CONFLICT ("recordId") DO UPDATE SET
          "idAlumno" = EXCLUDED."idAlumno",
          "codPrograma" = EXCLUDED."codPrograma",
          "montoNegocio" = EXCLUDED."montoNegocio",
          "moneda" = EXCLUDED."moneda",
          "tipoNegocio" = EXCLUDED."tipoNegocio",
          "tipoVenta" = EXCLUDED."tipoVenta",
          "tipoDocto" = EXCLUDED."tipoDocto",
          "estadoNegocio" = EXCLUDED."estadoNegocio",
          "updatedAt" = NOW()
      `;
      creados += count;
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
