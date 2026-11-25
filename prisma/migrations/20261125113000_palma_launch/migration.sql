CREATE TABLE "PalmaLaunch" (
  "id" TEXT NOT NULL,
  "experimentId" TEXT NOT NULL,
  "ratio" INTEGER NOT NULL,
  "pipelineCommit" TEXT NOT NULL DEFAULT '',
  "datasetSha" TEXT NOT NULL,
  "status" TEXT NOT NULL,
  "githubRunId" TEXT,
  "message" TEXT NOT NULL DEFAULT '',
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "PalmaLaunch_pkey" PRIMARY KEY ("id")
);
CREATE INDEX "PalmaLaunch_experimentId_createdAt_idx" ON "PalmaLaunch"("experimentId","createdAt");
ALTER TABLE "PalmaLaunch" ADD CONSTRAINT "PalmaLaunch_experimentId_fkey" FOREIGN KEY ("experimentId") REFERENCES "ResearchExperiment"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
