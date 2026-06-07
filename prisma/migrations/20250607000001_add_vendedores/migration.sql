-- CreateTable
CREATE TABLE "vendedores" (
    "id" TEXT NOT NULL,
    "nombre" TEXT NOT NULL,
    "email" TEXT,
    "telefono" TEXT,
    "activo" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "vendedores_pkey" PRIMARY KEY ("id")
);

-- AlterTable: agrega campo opcional idVendedor a negocios
ALTER TABLE "negocios" ADD COLUMN "idVendedor" TEXT;

-- AddForeignKey
ALTER TABLE "negocios" ADD CONSTRAINT "negocios_idVendedor_fkey"
    FOREIGN KEY ("idVendedor") REFERENCES "vendedores"("id")
    ON DELETE SET NULL ON UPDATE CASCADE;
