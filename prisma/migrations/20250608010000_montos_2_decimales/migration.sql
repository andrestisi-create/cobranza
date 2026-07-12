-- Permite hasta 2 decimales en los montos, para todas las monedas (CLP/PEN/USD).
-- Ensanchar numeric(14,0) -> numeric(14,2) no pierde datos (los valores enteros
-- existentes quedan igual, solo se habilita la escala decimal).

ALTER TABLE "negocios"               ALTER COLUMN "montoNegocio" TYPE DECIMAL(14,2);
ALTER TABLE "pagos"                  ALTER COLUMN "montoPago"    TYPE DECIMAL(14,2);
ALTER TABLE "ordenes_compra"         ALTER COLUMN "monto"        TYPE DECIMAL(14,2);
ALTER TABLE "documentos_tributarios" ALTER COLUMN "monto"        TYPE DECIMAL(14,2);
