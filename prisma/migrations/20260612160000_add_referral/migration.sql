-- Add referral fields to users
ALTER TABLE "users" ADD COLUMN "referralCode" TEXT UNIQUE;
ALTER TABLE "users" ADD COLUMN "referralCommission" DOUBLE PRECISION NOT NULL DEFAULT 0;

-- Create referrals table
CREATE TABLE "referrals" (
  "id" TEXT NOT NULL,
  "referrerId" TEXT NOT NULL,
  "refereeId" TEXT UNIQUE,
  "refereeEmail" TEXT,
  "code" TEXT NOT NULL,
  "commission" DOUBLE PRECISION NOT NULL DEFAULT 0,
  "status" TEXT NOT NULL DEFAULT 'pending',
  "orderId" TEXT,
  "orderAmount" DOUBLE PRECISION,
  "paidAt" TIMESTAMP(3),
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,

  CONSTRAINT "referrals_pkey" PRIMARY KEY ("id")
);

-- Add foreign keys
CREATE INDEX "referrals_referrerId_idx" ON "referrals"("referrerId");
CREATE INDEX "referrals_refereeEmail_idx" ON "referrals"("refereeEmail");
CREATE INDEX "referrals_status_idx" ON "referrals"("status");

ALTER TABLE "referrals" ADD CONSTRAINT "referrals_referrerId_fkey" FOREIGN KEY ("referrerId") REFERENCES "users"("id") ON DELETE CASCADE;
ALTER TABLE "referrals" ADD CONSTRAINT "referrals_refereeId_fkey" FOREIGN KEY ("refereeId") REFERENCES "users"("id") ON DELETE SET NULL;
