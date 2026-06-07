-- Agrega el valor OTEC al enum TipoOC
-- (ADD VALUE IF NOT EXISTS evita error si ya existe)
ALTER TYPE "TipoOC" ADD VALUE IF NOT EXISTS 'OTEC';
