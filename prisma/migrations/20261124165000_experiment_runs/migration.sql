CREATE TABLE "ExperimentRun" (
  "id" TEXT NOT NULL,
  "experimentId" TEXT NOT NULL,
  "datasetVariantId" TEXT NOT NULL,
  "runKey" TEXT NOT NULL,
  "manifest" JSONB NOT NULL,
  "importedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "ExperimentRun_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX "ExperimentRun_experimentId_runKey_key" ON "ExperimentRun"("experimentId","runKey");
ALTER TABLE "ExperimentRun" ADD CONSTRAINT "ExperimentRun_experimentId_fkey" FOREIGN KEY ("experimentId") REFERENCES "ResearchExperiment"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "ExperimentRun" ADD CONSTRAINT "ExperimentRun_datasetVariantId_fkey" FOREIGN KEY ("datasetVariantId") REFERENCES "DatasetVariant"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
CREATE TABLE "RunFile" (
  "runId" TEXT NOT NULL,
  "path" TEXT NOT NULL,
  "content" BYTEA NOT NULL,
  CONSTRAINT "RunFile_pkey" PRIMARY KEY ("runId","path")
);
ALTER TABLE "RunFile" ADD CONSTRAINT "RunFile_runId_fkey" FOREIGN KEY ("runId") REFERENCES "ExperimentRun"("id") ON DELETE CASCADE ON UPDATE CASCADE;
