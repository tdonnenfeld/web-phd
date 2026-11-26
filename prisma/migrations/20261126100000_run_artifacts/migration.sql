ALTER TABLE "RunFile" ALTER COLUMN "content" DROP NOT NULL;
ALTER TABLE "RunFile" ADD COLUMN "digest" TEXT;
ALTER TABLE "RunFile" ADD COLUMN "size" INTEGER;
ALTER TABLE "RunFile" ADD CONSTRAINT "RunFile_storage_check" CHECK (
  ("content" IS NOT NULL AND "digest" IS NULL AND "size" IS NULL)
  OR ("content" IS NULL AND "digest" IS NOT NULL AND "digest" ~ '^[a-f0-9]{64}$' AND "size" IS NOT NULL AND "size" >= 0)
);
