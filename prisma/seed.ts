import { PrismaClient } from "@prisma/client";
import bcrypt from "bcryptjs";

const prisma = new PrismaClient();

async function main() {
  console.log("Seed: iniciando…");

  // ---- Usuario administrador inicial (idempotente) ----
  const adminEmail = "atisi@uablended.cl";
  const passwordHash = await bcrypt.hash("Rock*1982", 10);
  await prisma.usuario.upsert({
    where: { email: adminEmail },
    update: {},
    create: {
      email: adminEmail,
      nombre: "Andrés Tisi",
      passwordHash,
      rol: "ADMIN",
      activo: true,
    },
  });
  console.log(`Seed: admin ${adminEmail} listo.`);

  // Usuario cobrador de ejemplo
  await prisma.usuario.upsert({
    where: { email: "cobrador@uablended.cl" },
    update: {},
    create: {
      email: "cobrador@uablended.cl",
      nombre: "Carla Cobranza",
      passwordHash: await bcrypt.hash("Cobrador*2024", 10),
      rol: "COBRADOR",
      activo: true,
    },
  });

  // Si ya hay negocios, no volver a cargar datos de prueba.
  const existentes = await prisma.negocio.count();
  if (existentes > 0) {
    console.log("Seed: ya existen negocios, se omiten los datos de prueba.");
    return;
  }

  // ---- Programas ----
  const programas = [
    {
      codPrograma: "DIP-RRHH-2025",
      descripcion: "Diplomado en Gestión de Recursos Humanos",
      fechaInicio: new Date("2025-03-10"),
      fechaFin: new Date("2025-09-10"),
      valor: 1800000,
    },
    {
      codPrograma: "CUR-EXCEL-2025",
      descripcion: "Curso Excel Avanzado para Empresas",
      fechaInicio: new Date("2025-04-01"),
      fechaFin: new Date("2025-06-01"),
      valor: 450000,
    },
    {
      codPrograma: "DIP-LOG-2025",
      descripcion: "Diplomado en Logística y Operaciones",
      fechaInicio: new Date("2025-05-05"),
      fechaFin: new Date("2025-11-05"),
      valor: 2100000,
    },
  ];
  for (const p of programas) {
    await prisma.programa.create({ data: p });
  }
  console.log(`Seed: ${programas.length} programas creados.`);

  // ---- Alumnos ----
  const alumnosData = [
    { nombre: "María", segundoNombre: "José", apellidoPaterno: "González", apellidoMaterno: "Pérez", rut: "12.345.678-9", email: "maria.gonzalez@example.cl", telefono: "+56 9 1111 1111", direccion: "Av. Providencia 123, Santiago" },
    { nombre: "Juan", apellidoPaterno: "Rojas", apellidoMaterno: "Soto", rut: "9.876.543-2", email: "juan.rojas@example.cl", telefono: "+56 9 2222 2222", direccion: "Calle Larga 45, Valparaíso" },
    { nombre: "Camila", segundoNombre: "Andrea", apellidoPaterno: "Muñoz", apellidoMaterno: "Vega", rut: "15.111.222-3", email: "camila.munoz@example.cl", telefono: "+56 9 3333 3333" },
    { nombre: "Pedro", apellidoPaterno: "Fuentes", apellidoMaterno: "Lagos", rut: "13.444.555-6", email: "pedro.fuentes@example.cl", telefono: "+56 9 4444 4444" },
    { nombre: "Ana", segundoNombre: "Luisa", apellidoPaterno: "Castro", apellidoMaterno: "Díaz", rut: "16.777.888-9", email: "ana.castro@example.cl", telefono: "+56 9 5555 5555" },
    { nombre: "Diego", apellidoPaterno: "Salinas", apellidoMaterno: "Reyes", rut: "14.222.333-4", email: "diego.salinas@example.cl", telefono: "+56 9 6666 6666" },
    { nombre: "Valentina", apellidoPaterno: "Herrera", apellidoMaterno: "Núñez", rut: "17.333.444-5", email: "valentina.herrera@example.cl", telefono: "+56 9 7777 7777" },
    { nombre: "Felipe", segundoNombre: "Ignacio", apellidoPaterno: "Araya", apellidoMaterno: "Bravo", rut: "11.555.666-7", email: "felipe.araya@example.cl", telefono: "+56 9 8888 8888" },
    { nombre: "Sofía", apellidoPaterno: "Carrasco", apellidoMaterno: "Morales", rut: "18.999.000-1", email: "sofia.carrasco@example.cl", telefono: "+56 9 9999 9999" },
    { nombre: "Matías", apellidoPaterno: "Vargas", apellidoMaterno: "Tapia", rut: "10.111.222-3", email: "matias.vargas@example.cl", telefono: "+56 9 1010 1010" },
  ];
  const alumnos = [];
  for (const a of alumnosData) {
    alumnos.push(await prisma.alumno.create({ data: a }));
  }
  console.log(`Seed: ${alumnos.length} alumnos creados.`);

  const codProg = programas.map((p) => p.codPrograma);
  const pick = <T>(arr: T[], i: number) => arr[i % arr.length];

  // ---- Negocios + pagos + OCs + documentos ----
  // Mezcla de Corporativo/Retail, Sence/No Sence, estados y avance de pago.
  type NegocioSeed = {
    recordId: string;
    alumnoIdx: number;
    codPrograma: string;
    monto: number;
    tipoNegocio: "CORPORATIVO" | "RETAIL";
    tipoVenta: "SENCE" | "NO_SENCE";
    tipoDocto: "FACTURA" | "BOLETA" | "ORDEN_COMPRA";
    estadoNegocio: "MATRICULADO" | "DE_BAJA" | "DESISTE";
    pagos: { monto: number; medio: "TRANSFERENCIA" | "WEBPAY" | "MERCADOPAGO_LINK" | "MERCADOPAGO_TARJETA" | "CHEQUE" | "EFECTIVO" | "OTRO" }[];
    ocs?: { tipo: "OTIC" | "OTEC" | "EMPRESA"; numero: string; entidad: string; monto: number; estado?: "PENDIENTE" | "FACTURADA" | "PAGADA" | "ANULADA" }[];
    conDocumento?: boolean;
  };

  const negocios: NegocioSeed[] = [
    {
      recordId: "60178145390",
      alumnoIdx: 0, codPrograma: codProg[0], monto: 1800000,
      tipoNegocio: "CORPORATIVO", tipoVenta: "SENCE", tipoDocto: "ORDEN_COMPRA", estadoNegocio: "MATRICULADO",
      pagos: [{ monto: 900000, medio: "TRANSFERENCIA" }],
      ocs: [
        { tipo: "OTIC", numero: "OTIC-1001", entidad: "OTIC SOFOFA", monto: 1200000, estado: "FACTURADA" },
        { tipo: "EMPRESA", numero: "OC-EMP-501", entidad: "Constructora Andes SpA", monto: 600000, estado: "PENDIENTE" },
      ],
      conDocumento: false,
    },
    {
      recordId: "60178145391",
      alumnoIdx: 1, codPrograma: codProg[1], monto: 450000,
      tipoNegocio: "RETAIL", tipoVenta: "NO_SENCE", tipoDocto: "BOLETA", estadoNegocio: "MATRICULADO",
      pagos: [{ monto: 450000, medio: "WEBPAY" }],
      conDocumento: true,
    },
    {
      recordId: "60178145392",
      alumnoIdx: 2, codPrograma: codProg[2], monto: 2100000,
      tipoNegocio: "CORPORATIVO", tipoVenta: "SENCE", tipoDocto: "ORDEN_COMPRA", estadoNegocio: "MATRICULADO",
      pagos: [],
      ocs: [
        { tipo: "OTIC", numero: "OTIC-1002", entidad: "OTIC Cámara Comercio", monto: 2100000, estado: "PENDIENTE" },
      ],
      conDocumento: false,
    },
    {
      recordId: "60178145393",
      alumnoIdx: 3, codPrograma: codProg[0], monto: 1800000,
      tipoNegocio: "RETAIL", tipoVenta: "NO_SENCE", tipoDocto: "FACTURA", estadoNegocio: "MATRICULADO",
      pagos: [{ monto: 600000, medio: "TRANSFERENCIA" }, { monto: 600000, medio: "TRANSFERENCIA" }],
      conDocumento: true,
    },
    {
      recordId: "60178145394",
      alumnoIdx: 4, codPrograma: codProg[1], monto: 450000,
      tipoNegocio: "RETAIL", tipoVenta: "NO_SENCE", tipoDocto: "BOLETA", estadoNegocio: "DESISTE",
      pagos: [],
      conDocumento: false,
    },
    {
      recordId: "60178145395",
      alumnoIdx: 5, codPrograma: codProg[2], monto: 2100000,
      tipoNegocio: "CORPORATIVO", tipoVenta: "SENCE", tipoDocto: "ORDEN_COMPRA", estadoNegocio: "MATRICULADO",
      pagos: [{ monto: 1050000, medio: "TRANSFERENCIA" }, { monto: 1050000, medio: "CHEQUE" }],
      ocs: [
        { tipo: "OTIC", numero: "OTIC-1003", entidad: "OTIC SOFOFA", monto: 1500000, estado: "PAGADA" },
        { tipo: "EMPRESA", numero: "OC-EMP-777", entidad: "Minera Norte Ltda.", monto: 600000, estado: "PAGADA" },
      ],
      conDocumento: true,
    },
    {
      recordId: "60178145396",
      alumnoIdx: 6, codPrograma: codProg[0], monto: 1800000,
      tipoNegocio: "CORPORATIVO", tipoVenta: "SENCE", tipoDocto: "ORDEN_COMPRA", estadoNegocio: "MATRICULADO",
      pagos: [{ monto: 500000, medio: "TRANSFERENCIA" }],
      ocs: [
        { tipo: "EMPRESA", numero: "OC-EMP-888", entidad: "Retail Sur SA", monto: 1800000, estado: "PENDIENTE" },
      ],
      conDocumento: false,
    },
    {
      recordId: "60178145397",
      alumnoIdx: 7, codPrograma: codProg[1], monto: 450000,
      tipoNegocio: "RETAIL", tipoVenta: "NO_SENCE", tipoDocto: "BOLETA", estadoNegocio: "MATRICULADO",
      pagos: [{ monto: 150000, medio: "EFECTIVO" }],
      conDocumento: true,
    },
    {
      recordId: "60178145398",
      alumnoIdx: 8, codPrograma: codProg[2], monto: 2100000,
      tipoNegocio: "CORPORATIVO", tipoVenta: "SENCE", tipoDocto: "ORDEN_COMPRA", estadoNegocio: "DE_BAJA",
      pagos: [],
      ocs: [
        { tipo: "OTIC", numero: "OTIC-1004", entidad: "OTIC Mutual", monto: 1000000, estado: "ANULADA" },
      ],
      conDocumento: false,
    },
    {
      recordId: "60178145399",
      alumnoIdx: 9, codPrograma: codProg[0], monto: 1800000,
      tipoNegocio: "RETAIL", tipoVenta: "NO_SENCE", tipoDocto: "FACTURA", estadoNegocio: "MATRICULADO",
      pagos: [{ monto: 1800000, medio: "TRANSFERENCIA" }],
      conDocumento: true,
    },
    {
      recordId: "60178145400",
      alumnoIdx: 0, codPrograma: codProg[1], monto: 450000,
      tipoNegocio: "CORPORATIVO", tipoVenta: "SENCE", tipoDocto: "ORDEN_COMPRA", estadoNegocio: "MATRICULADO",
      pagos: [],
      ocs: [
        { tipo: "OTIC", numero: "OTIC-1005", entidad: "OTIC SOFOFA", monto: 300000, estado: "PENDIENTE" },
        { tipo: "EMPRESA", numero: "OC-EMP-910", entidad: "Servicios Globales SpA", monto: 150000, estado: "PENDIENTE" },
      ],
      conDocumento: false,
    },
    {
      recordId: "60178145401",
      alumnoIdx: 3, codPrograma: codProg[2], monto: 2100000,
      tipoNegocio: "CORPORATIVO", tipoVenta: "SENCE", tipoDocto: "ORDEN_COMPRA", estadoNegocio: "MATRICULADO",
      pagos: [{ monto: 700000, medio: "TRANSFERENCIA" }],
      ocs: [
        { tipo: "EMPRESA", numero: "OC-EMP-920", entidad: "Transportes del Valle Ltda.", monto: 2100000, estado: "FACTURADA" },
      ],
      conDocumento: false,
    },
    {
      recordId: "60178145402",
      alumnoIdx: 5, codPrograma: codProg[1], monto: 450000,
      tipoNegocio: "RETAIL", tipoVenta: "NO_SENCE", tipoDocto: "BOLETA", estadoNegocio: "MATRICULADO",
      pagos: [{ monto: 225000, medio: "WEBPAY" }],
      conDocumento: false,
    },
    {
      recordId: "60178145403",
      alumnoIdx: 6, codPrograma: codProg[2], monto: 2100000,
      tipoNegocio: "RETAIL", tipoVenta: "NO_SENCE", tipoDocto: "FACTURA", estadoNegocio: "MATRICULADO",
      pagos: [{ monto: 2100000, medio: "TRANSFERENCIA" }],
      conDocumento: true,
    },
  ];

  let nNeg = 0, nPag = 0, nOc = 0, nDoc = 0;
  for (const n of negocios) {
    const negocio = await prisma.negocio.create({
      data: {
        recordId: n.recordId,
        idAlumno: alumnos[n.alumnoIdx].idAlumno,
        codPrograma: n.codPrograma,
        montoNegocio: n.monto,
        tipoNegocio: n.tipoNegocio,
        tipoVenta: n.tipoVenta,
        tipoDocto: n.tipoDocto,
        estadoNegocio: n.estadoNegocio,
      },
    });
    nNeg++;

    for (const p of n.pagos) {
      await prisma.pago.create({
        data: { recordId: negocio.recordId, montoPago: p.monto, medioPago: p.medio },
      });
      nPag++;
    }

    for (const oc of n.ocs ?? []) {
      await prisma.ordenCompra.create({
        data: {
          recordId: negocio.recordId,
          tipoOC: oc.tipo,
          numeroOC: oc.numero,
          entidadNombre: oc.entidad,
          monto: oc.monto,
          estadoOC: oc.estado ?? "PENDIENTE",
        },
      });
      nOc++;
    }

    if (n.conDocumento) {
      await prisma.documentoTributario.create({
        data: {
          recordId: negocio.recordId,
          tipoDocto: n.tipoDocto === "ORDEN_COMPRA" ? "FACTURA" : n.tipoDocto,
          folio: `F-${1000 + nDoc}`,
          fechaEmision: new Date(),
          monto: n.monto,
        },
      });
      nDoc++;
    }
  }

  console.log(`Seed: ${nNeg} negocios, ${nPag} pagos, ${nOc} órdenes de compra, ${nDoc} documentos.`);
  console.log("Seed: completado.");
  void pick; void codProg;
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
