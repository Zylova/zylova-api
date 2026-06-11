CREATE TABLE IF NOT EXISTS "reviews" (
    "id" TEXT NOT NULL,
    "productId" TEXT NOT NULL,
    "userId" TEXT,
    "email" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "rating" INTEGER NOT NULL,
    "comment" TEXT,
    "approved" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "reviews_pkey" PRIMARY KEY ("id")
);

CREATE INDEX IF NOT EXISTS "reviews_productId_idx" ON "reviews"("productId");
