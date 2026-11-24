# Dataset registry

Register a parent dataset in /datasets, then paste a version 1 dataset manifest for each variant. The identifier and manifest are immutable; register a new variant if the data changes. Titles and descriptions of parent datasets can be edited.

The manifest follows the phd-experiments dataset contract. Shape order is projections, detector rows, detector columns. A checksum must be supplied by the producer; canonical inventory hashing remains a follow-up. The registry does not verify file presence, upload data, or access the GPU cluster. Palma denotes the intended execution location, not readiness.

Back up PostgreSQL before deploying the additive migration. No existing experiment records are modified.
