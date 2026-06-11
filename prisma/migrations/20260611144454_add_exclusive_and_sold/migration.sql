-- AlterTable: add exclusive and sold columns to products
ALTER TABLE "products" ADD COLUMN IF NOT EXISTS "exclusive" BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE "products" ADD COLUMN IF NOT EXISTS "sold" BOOLEAN NOT NULL DEFAULT false;
