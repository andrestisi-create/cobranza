-- CreateSchema
CREATE SCHEMA IF NOT EXISTS "public";

-- CreateEnum
CREATE TYPE "RolUsuario" AS ENUM ('ADMIN', 'SUPERVISOR', 'COBRADOR');

-- CreateEnum
CREATE TYPE "EstadoNegocio" AS ENUM ('MATRICULADO', 'DE_BAJA', 'DESISTE');

-- CreateEnum
CREATE TYPE "TipoNegocio" AS ENUM ('CORPORATIVO', 'RETAIL');

-- CreateEnum
CREATE TYPE "TipoVenta" AS ENUM ('SENCE', 'NO_SENCE');

-- CreateEnum
CREATE TYPE "TipoDocto" AS ENUM ('FACTURA', 'BOLETA', 'ORDEN_COMPRA');

-- CreateEnum
CREATE TYPE "TipoOC" AS ENUM ('OTIC', 'EMPRESA');

-- CreateEnum
CREATE TYPE "EstadoOC" AS ENUM ('PENDIENTE', 'FACTURADA', 'PAGADA', 'ANULADA');

-- CreateEnum
CREATE TYPE "MedioPago" AS ENUM ('TRANSFERENCIA', 'CHEQUE', 'EFECTIVO', 'TARJETA', 'OTRO');

-- CreateTable
CREATE TABLE "usuarios" (
    "id" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "nombre" TEXT NOT NULL,
    "passwordHash" TEXT NOT NULL,
    "rol" "RolUsuario" NOT NULL DEFAULT 'COBRADOR',
    "activo" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "usuarios_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "alumnos" (
    "idAlumno" TEXT NOT NULL,
    "nombre" TEXT NOT NULL,
    "segundoNombre" TEXT,
    "apellidoPaterno" TEXT NOT NULL,
    "apellidoMaterno" TEXT,
    "direccion" TEXT,
    "fechaNacimiento" TIMESTAMP(3),
    "rut" TEXT,
    "email" TEXT,
    "telefono" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "alumnos_pkey" PRIMARY KEY ("idAlumno")
);

-- CreateTable
CREATE TABLE "programas" (
    "codPrograma" TEXT NOT NULL,
    "descripcion" TEXT NOT NULL,
    "fechaInicio" TIMESTAMP(3) NOT NULL,
    "fechaFin" TIMESTAMP(3) NOT NULL,
    "valor" DECIMAL(14,0),

    CONSTRAINT "programas_pkey" PRIMARY KEY ("codPrograma")
);

-- CreateTable
CREATE TABLE "negocios" (
    "recordId" TEXT NOT NULL,
    "idAlumno" TEXT NOT NULL,
    "codPrograma" TEXT NOT NULL,
    "fechaCreacion" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "estadoNegocio" "EstadoNegocio" NOT NULL DEFAULT 'MATRICULADO',
    "montoNegocio" DECIMAL(14,0) NOT NULL,
    "tipoNegocio" "TipoNegocio" NOT NULL,
    "tipoVenta" "TipoVenta" NOT NULL,
    "tipoDocto" "TipoDocto" NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "negocios_pkey" PRIMARY KEY ("recordId")
);

-- CreateTable
CREATE TABLE "ordenes_compra" (
    "id" TEXT NOT NULL,
    "recordId" TEXT NOT NULL,
    "tipoOC" "TipoOC" NOT NULL,
    "numeroOC" TEXT NOT NULL,
    "entidadNombre" TEXT NOT NULL,
    "entidadRut" TEXT,
    "monto" DECIMAL(14,0) NOT NULL,
    "fechaOC" TIMESTAMP(3),
    "estadoOC" "EstadoOC" NOT NULL DEFAULT 'PENDIENTE',
    "observacion" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ordenes_compra_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "pagos" (
    "id" TEXT NOT NULL,
    "recordId" TEXT NOT NULL,
    "fechaPago" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "montoPago" DECIMAL(14,0) NOT NULL,
    "medioPago" "MedioPago" NOT NULL DEFAULT 'TRANSFERENCIA',
    "referencia" TEXT,
    "observacion" TEXT,
    "registradoPorId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "pagos_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "documentos_tributarios" (
    "id" TEXT NOT NULL,
    "recordId" TEXT NOT NULL,
    "tipoDocto" "TipoDocto" NOT NULL,
    "folio" TEXT,
    "fechaEmision" TIMESTAMP(3),
    "monto" DECIMAL(14,0),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "documentos_tributarios_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "usuarios_email_key" ON "usuarios"("email");

-- CreateIndex
CREATE UNIQUE INDEX "alumnos_rut_key" ON "alumnos"("rut");

-- CreateIndex
CREATE INDEX "alumnos_apellidoPaterno_idx" ON "alumnos"("apellidoPaterno");

-- CreateIndex
CREATE INDEX "negocios_idAlumno_idx" ON "negocios"("idAlumno");

-- CreateIndex
CREATE INDEX "negocios_codPrograma_idx" ON "negocios"("codPrograma");

-- CreateIndex
CREATE INDEX "negocios_tipoVenta_idx" ON "negocios"("tipoVenta");

-- CreateIndex
CREATE INDEX "negocios_estadoNegocio_idx" ON "negocios"("estadoNegocio");

-- CreateIndex
CREATE INDEX "ordenes_compra_recordId_idx" ON "ordenes_compra"("recordId");

-- CreateIndex
CREATE INDEX "ordenes_compra_tipoOC_idx" ON "ordenes_compra"("tipoOC");

-- CreateIndex
CREATE INDEX "pagos_recordId_idx" ON "pagos"("recordId");

-- CreateIndex
CREATE INDEX "documentos_tributarios_recordId_idx" ON "documentos_tributarios"("recordId");

-- AddForeignKey
ALTER TABLE "negocios" ADD CONSTRAINT "negocios_idAlumno_fkey" FOREIGN KEY ("idAlumno") REFERENCES "alumnos"("idAlumno") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "negocios" ADD CONSTRAINT "negocios_codPrograma_fkey" FOREIGN KEY ("codPrograma") REFERENCES "programas"("codPrograma") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ordenes_compra" ADD CONSTRAINT "ordenes_compra_recordId_fkey" FOREIGN KEY ("recordId") REFERENCES "negocios"("recordId") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "pagos" ADD CONSTRAINT "pagos_recordId_fkey" FOREIGN KEY ("recordId") REFERENCES "negocios"("recordId") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "pagos" ADD CONSTRAINT "pagos_registradoPorId_fkey" FOREIGN KEY ("registradoPorId") REFERENCES "usuarios"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "documentos_tributarios" ADD CONSTRAINT "documentos_tributarios_recordId_fkey" FOREIGN KEY ("recordId") REFERENCES "negocios"("recordId") ON DELETE CASCADE ON UPDATE CASCADE;

