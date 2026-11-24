CREATE TABLE "ResearchDataset" (
    "id" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT NOT NULL DEFAULT '',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "ResearchDataset_pkey" PRIMARY KEY ("id")
);
CREATE TABLE "DatasetVariant" (
    "id" TEXT NOT NULL,
    "datasetId" TEXT NOT NULL,
    "variantId" TEXT NOT NULL,
    "metadata" JSONB NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "DatasetVariant_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX "DatasetVariant_datasetId_variantId_key" ON "DatasetVariant"("datasetId", "variantId");
ALTER TABLE "DatasetVariant" ADD CONSTRAINT "DatasetVariant_datasetId_fkey" FOREIGN KEY ("datasetId") REFERENCES "ResearchDataset"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
