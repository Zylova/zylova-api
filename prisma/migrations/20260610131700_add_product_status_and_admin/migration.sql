-- CreateEnum
CREATE TYPE "ProductStatus" AS ENUM ('draft', 'pending', 'approved', 'rejected');

-- AlterTable: users
ALTER TABLE "users" ADD COLUMN "banned" BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE "users" ADD COLUMN "resetToken" TEXT;
ALTER TABLE "users" ADD COLUMN "resetTokenExpiry" TIMESTAMP(3);

-- AlterTable: products
ALTER TABLE "products" ADD COLUMN "status" "ProductStatus" NOT NULL DEFAULT 'pending';
ALTER TABLE "products" ADD COLUMN "rejectReason" TEXT;

-- Migrate existing data: published=true → approved, published=false → draft
UPDATE "products" SET "status" = 'approved' WHERE "published" = true;
UPDATE "products" SET "status" = 'draft' WHERE "published" = false;

-- DropColumn: published (no longer needed)
ALTER TABLE "products" DROP COLUMN "published";

-- AlterTable: contact_submissions
ALTER TABLE "contact_submissions" ADD COLUMN "status" TEXT NOT NULL DEFAULT 'unread';

-- AlterTable: orders
ALTER TABLE "orders" ADD COLUMN "refundReason" TEXT;
