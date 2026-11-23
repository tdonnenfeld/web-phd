# PhD Research Hub

Private, self-hosted research journal and activity dashboard for a PhD in synchrotron tomography compression.

**Destination:** https://phd.les12.fr · **Authentication:** Authelia via Traefik

## Implemented

- Responsive Next.js dashboard and navigation.
- Journal with daily, ISO-weekly and monthly views: read-only Obsidian daily notes plus existing PostgreSQL journal entries and resource links.
- Research calendar with filters for journal/GitHub/Vikunja.
- GitHub read-only commits, PRs, issues and releases, selected via GITHUB_REPOS.
- Vikunja task reading, creation and completion for the `PhD` project, with show/hide completed and sorting controls.
- Research experiment register: create records from Obsidian daily notes or selected private GitHub repository Markdown reports, with pinned commit refs and on-demand figure display.
- In-app journal resource linking (Git commit SHA, Obsidian note, Vikunja task) and ResourceLink API.
- Quartz reverse-proxy route at /knowledge/, plus opt-in approved-vault build helper (requires a configured Quartz checkout).
- Docker Compose deployment and Authelia perimeter protection.

## Quick start

See [deployment guide](docs/deployment.md) and [architecture](docs/architecture.md).

For local development, copy .env.example to .env, set DATABASE_URL and DEV_AUTH_BYPASS=true, then:

```bash
npm install
npx prisma db push
npm run dev
```

For production, create dedicated PostgreSQL databases, configure .env and run:

```bash
docker compose --env-file .env -f infrastructure/compose.yml up -d --build
```

## Scope and limitations

This is an **MVP**, not a finished full integration suite. It needs credentials, live API verification, and production hardening. Quartz content is deliberately not automatically published to avoid exposing unintended Obsidian notes. The on-demand GitHub activity importer currently fetches at most one page per resource category; long-term history will require persistent backfill and pagination. Vikunja API requests should be validated against the version deployed on your host.

Do not commit credentials, scientific data, or proprietary ALBA datasets.

## Obsidian daily journal

The journal reads `YYYY-MM-DD.md` files recursively from the **PhD** Obsidian vault, including subfolders such as `Daily Notes/`. Markdown content and an optional YAML frontmatter `title:` appear as day entries in the Journal, calendar and homepage chronology. Frontmatter is stripped from the rendered body; files are read on demand rather than copied to PostgreSQL.

Set `OBSIDIAN_DAILY_DIR` to the vault directory **inside the web container**. On `palma`, the VPS Ansible Compose override mounts only `/opt/services/shared/obsidian/vaults/PhD` at `/mnt/obsidian-phd:ro` and sets `OBSIDIAN_DAILY_DIR=/mnt/obsidian-phd`. No other Obsidian vault is mounted in the app.

Obsidian entries are **read-only** in web-phd: edit them in Obsidian. The existing PostgreSQL journal remains available for earlier entries and new in-app notes; nothing is migrated, overwritten or deleted. If `OBSIDIAN_DAILY_DIR` is unset, the journal works as before. Daily files should be named exactly `YYYY-MM-DD.md` and must be within the mounted PhD vault. Dotfolders, `private/`, `templates/`, symlinks, and files over 200 KB are ignored.

Tasks default to hiding completed items and sorting by earliest due date. Sorting, including date descending, title, status, and newest-first, is client-side and does not change Vikunja data.

## Source-linked experiment register

The /experiments section replaces MLflow. Each experiment stores a title, interpretation, source kind, source file and (for GitHub) the commit SHA captured at creation. The original Markdown stays in the repository or in the read-only PhD Obsidian vault. A private server-side GitHub API adapter displays Markdown plus relative PNG/JPEG/WebP figures, using the configured read-only GITHUB_TOKEN; the browser never receives the token. Repositories are limited to `tdonnenfeld/tomo-mct-pipeline` and `tdonnenfeld/volcomp`.

For the pipeline, the documented report path is `results/results.md`; `volcomp` documents generated plots such as `rate_distortion.png` and `slice_metrics.png`. At present, **neither repository commits its generated results in GitHub**. To display these reports and graph files within the web app, commit the selected `results.md` and its referenced PNGs to the corresponding private repository, ideally under a dedicated run folder. Until then, you can create an experiment from a committed README or a daily Obsidian note. This registration does not rerun compression or import local Slurm outputs automatically.

The experiment registry is PostgreSQL-backed, and its schema is migrated on startup. Back up the `phd_hub` database before applying migrations. The app no longer needs `MLFLOW_URL`, an MLflow Docker service or an MLflow database; existing MLflow data should be retained/backed up separately rather than deleted.
