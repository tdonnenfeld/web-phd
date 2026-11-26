ALTER TABLE "PalmaLaunch" ADD COLUMN "ratios" INTEGER[] NOT NULL DEFAULT ARRAY[]::INTEGER[];
UPDATE "PalmaLaunch" SET "ratios" = ARRAY["ratio"];
