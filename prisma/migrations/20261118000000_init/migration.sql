-- Research Hub MVP schema
CREATE TYPE "Period" AS ENUM ('DAY', 'WEEK', 'MONTH');
CREATE TABLE "JournalEntry" (
    "id" TEXT NOT NULL,
    "period" "Period" NOT NULL DEFAULT 'DAY',
    "date" DATE NOT NULL,
    "title" TEXT NOT NULL,
    "content" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "JournalEntry_pkey" PRIMARY KEY ("id")
);
CREATE TABLE "ResourceLink" (
    "id" TEXT NOT NULL,
    "journalId" TEXT NOT NULL,
    "source" TEXT NOT NULL,
    "externalId" TEXT NOT NULL,
    "url" TEXT NOT NULL,
    "label" TEXT NOT NULL,
    CONSTRAINT "ResourceLink_pkey" PRIMARY KEY ("id")
);
CREATE INDEX "JournalEntry_date_period_idx" ON "JournalEntry"("date", "period");
CREATE UNIQUE INDEX "ResourceLink_journalId_source_externalId_key" ON "ResourceLink"("journalId","source","externalId");
ALTER TABLE "ResourceLink" ADD CONSTRAINT "ResourceLink_journalId_fkey" FOREIGN KEY ("journalId") REFERENCES "JournalEntry"("id") ON DELETE CASCADE ON UPDATE CASCADE;
