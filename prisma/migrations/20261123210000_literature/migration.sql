CREATE TABLE "LiteraturePaper" (
  "id" TEXT NOT NULL,
  "paper" TEXT NOT NULL,
  "authors" TEXT NOT NULL DEFAULT '',
  "year" TEXT NOT NULL DEFAULT '',
  "journal" TEXT NOT NULL DEFAULT '',
  "imageType" TEXT NOT NULL DEFAULT '',
  "notes" TEXT NOT NULL DEFAULT '',
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "LiteraturePaper_pkey" PRIMARY KEY ("id")
);
CREATE INDEX "LiteraturePaper_createdAt_idx" ON "LiteraturePaper"("createdAt");
