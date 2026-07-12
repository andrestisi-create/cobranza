-- Datos maestros configurables (Estado de Negocio, Tipo de Negocio, Tipo de Venta,
-- Tipo de Documento) + moneda del negocio (CLP/PEN/USD).
--
-- Los enums EstadoNegocio/TipoNegocio/TipoVenta/TipoDocto pasan a ser texto libre
-- validado en la aplicación contra la tabla "opciones_catalogo", administrable
-- desde /configuracion (solo ADMIN). Se preservan los literales exactos que ya
-- usan los negocios existentes, así que no se migra ningún dato.

-- 1) Tabla de catálogo genérico
CREATE TABLE "opciones_catalogo" (
    "id"        TEXT NOT NULL,
    "catalogo"  TEXT NOT NULL,
    "valor"     TEXT NOT NULL,
    "activo"    BOOLEAN NOT NULL DEFAULT true,
    "orden"     INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "opciones_catalogo_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "opciones_catalogo_catalogo_valor_key" ON "opciones_catalogo"("catalogo", "valor");

-- 2) Sembrar con los valores legado (mismos literales que usan los negocios existentes)
INSERT INTO "opciones_catalogo" ("id", "catalogo", "valor", "orden") VALUES
    (gen_random_uuid()::text, 'ESTADO_NEGOCIO', 'MATRICULADO',  0),
    (gen_random_uuid()::text, 'ESTADO_NEGOCIO', 'DE_BAJA',      1),
    (gen_random_uuid()::text, 'ESTADO_NEGOCIO', 'DESISTE',      2),
    (gen_random_uuid()::text, 'TIPO_NEGOCIO',   'CORPORATIVO',  0),
    (gen_random_uuid()::text, 'TIPO_NEGOCIO',   'RETAIL',       1),
    (gen_random_uuid()::text, 'TIPO_VENTA',     'SENCE',        0),
    (gen_random_uuid()::text, 'TIPO_VENTA',     'NO_SENCE',     1),
    (gen_random_uuid()::text, 'TIPO_DOCTO',     'FACTURA',      0),
    (gen_random_uuid()::text, 'TIPO_DOCTO',     'BOLETA',       1),
    (gen_random_uuid()::text, 'TIPO_DOCTO',     'ORDEN_COMPRA', 2)
ON CONFLICT ("catalogo", "valor") DO NOTHING;

-- 3) Moneda del negocio
CREATE TYPE "Moneda" AS ENUM ('CLP', 'PEN', 'USD');
ALTER TABLE "negocios" ADD COLUMN "moneda" "Moneda" NOT NULL DEFAULT 'CLP';

-- 4) Convertir columnas enum -> texto (sin migrar valores, se preservan tal cual)
ALTER TABLE "negocios" ALTER COLUMN "estadoNegocio" DROP DEFAULT;
ALTER TABLE "negocios" ALTER COLUMN "estadoNegocio" TYPE TEXT USING "estadoNegocio"::TEXT;
ALTER TABLE "negocios" ALTER COLUMN "estadoNegocio" SET DEFAULT 'MATRICULADO';

ALTER TABLE "negocios" ALTER COLUMN "tipoNegocio" TYPE TEXT USING "tipoNegocio"::TEXT;
ALTER TABLE "negocios" ALTER COLUMN "tipoVenta" TYPE TEXT USING "tipoVenta"::TEXT;
ALTER TABLE "negocios" ALTER COLUMN "tipoDocto" TYPE TEXT USING "tipoDocto"::TEXT;

ALTER TABLE "documentos_tributarios" ALTER COLUMN "tipoDocto" TYPE TEXT USING "tipoDocto"::TEXT;

-- 5) Eliminar los enums ya no usados por ninguna columna
DROP TYPE "EstadoNegocio";
DROP TYPE "TipoNegocio";
DROP TYPE "TipoVenta";
DROP TYPE "TipoDocto";
