# Import experiment runs

Open an existing experiment and copy its experiment ID. Register the exact dataset variant (including checksum and execution environment) first. Generate a v1 run manifest using phd-experiments, with that experiment ID, and package the results using its package_results.py script. Upload the ZIP from the Runs section. The cluster never connects to PhD Web.

The importer accepts root manifest.json, results.md for completed runs, and report files, metrics, logs and PNG/JPEG/WebP figures. Limits: 32 MiB compressed, 64 MiB expanded, 12 MiB per file and 512 entries. ZIP64, encrypted archives, symlinks, duplicate paths and unsafe names are rejected. Files are kept in PostgreSQL for atomic imports and existing backup coverage; no filesystem extraction occurs. This is intended for small report bundles, not raw volumes. Review all results for confidential content before uploading.

Runs are immutable and duplicate run IDs within an experiment are rejected. Experiments with imported runs cannot be deleted. Existing source reports remain unchanged. Back up PostgreSQL before deploying the migration. No runner or remote execution is enabled.
