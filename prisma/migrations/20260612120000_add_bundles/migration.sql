CREATE TABLE IF NOT EXISTS "bundles" (
  "id" TEXT NOT NULL,
  "name" TEXT NOT NULL,
  "slug" TEXT NOT NULL,
  "description" TEXT,
  "discountPercent" DOUBLE PRECISION NOT NULL,
  "validFrom" TIMESTAMPTZ,
  "validUntil" TIMESTAMPTZ,
  "active" BOOLEAN NOT NULL DEFAULT true,
  "createdAt" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "bundles_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX IF NOT EXISTS "bundles_slug_key" ON "bundles"("slug");

CREATE TABLE IF NOT EXISTS "bundle_products" (
  "id" TEXT NOT NULL,
  "bundleId" TEXT NOT NULL,
  "productId" TEXT NOT NULL,
  "createdAt" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "bundle_products_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "bundle_products_bundleId_productId_key" UNIQUE ("bundleId", "productId"),
  CONSTRAINT "bundle_products_bundleId_fkey" FOREIGN KEY ("bundleId") REFERENCES "bundles"("id") ON DELETE CASCADE,
  CONSTRAINT "bundle_products_productId_fkey" FOREIGN KEY ("productId") REFERENCES "products"("id") ON DELETE CASCADE
);
