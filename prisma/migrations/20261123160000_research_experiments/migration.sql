CREATE TABLE "ResearchExperiment" (
  "id" TEXT NOT NULL,
  "title" TEXT NOT NULL,
  "description" TEXT NOT NULL DEFAULT '',
  "sourceType" TEXT NOT NULL,
  "repository" TEXT,
  "sourcePath" TEXT NOT NULL,
  "sourceRef" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "ResearchExperiment_pkey" PRIMARY KEY ("id")
);
CREATE INDEX "ResearchExperiment_createdAt_idx" ON "ResearchExperiment"("createdAt");
