# Deployment on phd.les12.fr

## Prerequisites

- DNS record for phd.les12.fr points to the existing Traefik host.
- Existing external Docker networks stack_web and stack_internal (check with docker network ls).
- PostgreSQL 16 running on stack_internal.
- Authelia ForwardAuth middleware named authelia@file, with safe Remote-User header handling.
- The selected Obsidian vault is synchronized via Syncthing and explicitly approved for Quartz publication.

## PostgreSQL bootstrap

Run SQL as a database administrator (adjust passwords; use dedicated random secrets):

```sql
CREATE USER phd WITH PASSWORD 'REPLACE_WITH_STRONG_RANDOM_PASSWORD';
CREATE DATABASE phd_hub OWNER phd;
```

## Application configuration

```bash
git clone https://github.com/tdonnenfeld/web-phd.git /opt/stack/phd-hub
cd /opt/stack/phd-hub
cp .env.example .env
chmod 600 .env
```

Set DATABASE_URL, ALLOWED_USER, GITHUB_REPOS, GITHUB_TOKEN and VIKUNJA_TOKEN in .env. NEVER commit this file.

The Compose file uses the external network stack_internal, assuming the existing main Compose project is named stack. If names differ, adjust.

## Build and start

```bash
docker compose --env-file .env -f infrastructure/compose.yml up -d --build
docker compose --env-file .env -f infrastructure/compose.yml logs -f phd-web
```

Prisma migrations are applied automatically on web container startup. Ensure a database backup exists before updates.

## Quartz

The Nginx service initially serves from quartz/public, which must contain the generated Quartz site. Mount only the approved PhD vault, read-only, to a separate Quartz build environment. Configure Quartz baseUrl to phd.les12.fr/knowledge and deploy the generated files to quartz/public. Set the Quartz content directory to an allowlisted selection, not all of /opt/services/shared/obsidian/vaults.

Until this is done, /knowledge/ returns an expected 404. This avoids accidentally exposing personal notes.

## Auth validation

- Verify unauthenticated visitors are sent to auth.les12.fr.
- Verify login only works for ALLOWED_USER.
- Verify forged Remote-User sent by the client is stripped by Traefik.
- Verify /api/journal and /knowledge/ are protected too.
- Verify that application containers are not host-published.

## Backups

Back up phd_hub PostgreSQL (including experiment records), the selected journal artifacts, Quartz configuration, and .env through secure secret storage. Test a restore before production usage.

## Development

```bash
npm install
cp .env.example .env
# provide a reachable local Postgres DATABASE_URL
npm run db:dev
npm run dev
```

Only local development may use DEV_AUTH_BYPASS=true. Production middleware ignores the bypass even when set.

Existing MLflow data is not removed by the web app migration. Retain its historical database/artifacts until you explicitly decommission them.
