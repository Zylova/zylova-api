-- CreateEnum (if not exists - safe for first run)
-- Add product_files table
CREATE TABLE IF NOT EXISTS "product_files" (
    "id" TEXT NOT NULL,
    "productId" TEXT NOT NULL,
    "fileName" TEXT NOT NULL,
    "fileSize" INTEGER NOT NULL,
    "filePath" TEXT NOT NULL,
    "version" TEXT NOT NULL DEFAULT '1.0.0',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "product_files_pkey" PRIMARY KEY ("id"),
    CONSTRAINT "product_files_productId_key" UNIQUE ("productId")
);

-- Add download_logs table
CREATE TABLE IF NOT EXISTS "download_logs" (
    "id" TEXT NOT NULL,
    "token" TEXT NOT NULL,
    "productId" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "ip" TEXT,
    "downloaded" BOOLEAN NOT NULL DEFAULT false,
    "downloadedAt" TIMESTAMP(3),
    "licenseKey" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "download_logs_pkey" PRIMARY KEY ("id"),
    CONSTRAINT "download_logs_licenseKey_key" UNIQUE ("licenseKey")
);

-- CreateIndex
CREATE INDEX IF NOT EXISTS "download_logs_token_idx" ON "download_logs"("token");
CREATE INDEX IF NOT EXISTS "download_logs_productId_idx" ON "download_logs"("productId");
CREATE INDEX IF NOT EXISTS "download_logs_email_idx" ON "download_logs"("email");
