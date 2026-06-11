CREATE TABLE IF NOT EXISTS "changelogs" (
  "id" TEXT NOT NULL,
  "productId" TEXT NOT NULL,
  "version" TEXT NOT NULL,
  "content" TEXT NOT NULL,
  "createdAt" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "changelogs_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "changelogs_productId_fkey" FOREIGN KEY ("productId") REFERENCES "products"("id") ON DELETE CASCADE
);
