ALTER TABLE "users" ADD COLUMN "github_id" TEXT;
CREATE UNIQUE INDEX IF NOT EXISTS "users_github_id_key" ON "users"("github_id");
