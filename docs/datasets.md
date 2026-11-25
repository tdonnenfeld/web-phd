# Dataset registry

Register a parent dataset in /datasets, then paste a version 1 dataset manifest for each variant. The identifier and manifest are immutable; register a new variant if the data changes. Titles and descriptions of parent datasets can be edited.

The manifest follows the phd-experiments dataset contract. Shape order is projections, detector rows, detector columns. A checksum must be supplied by the producer; canonical inventory hashing remains a follow-up. The registry does not verify file presence, upload data, or access the GPU cluster. Palma denotes the intended execution location, not readiness.

Back up PostgreSQL before deploying the additive migration. No existing experiment records are modified.

## Local discovery

Set `PHD_DATASETS_DIR` to a trusted read-only dataset mount. Opening or refreshing /datasets scans `<dataset_id>/<variant_id>/manifest.json` alongside `checksums.sha256`, validates the manifest and registers missing records. Existing metadata is never overwritten. A found manifest is not a fresh verification of all data files; verify checksums during staging. Cluster records remain manual and no cluster filesystem is accessed.
