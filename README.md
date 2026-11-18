# PhD Research Hub

Private, self-hosted research journal and activity dashboard for a PhD in synchrotron tomography compression.

**Destination:** https://phd.les12.fr · **Authentication:** Authelia via Traefik

## Implemented

- Responsive Next.js dashboard and navigation.
- Journal CRUD with daily, ISO-weekly and monthly views, Markdown content, and PostgreSQL storage.
- Research calendar with filters for journal/GitHub/Vikunja/MLflow.
- GitHub read-only commits, PRs, issues and releases, selected via GITHUB_REPOS.
- Vikunja task reading, creation and completion through server-side REST calls.
- MLflow experiment list and metrics read through the tracking API.
- In-app journal resource linking (Git commit SHA, Obsidian note, Vikunja task or MLflow run) and ResourceLink API.
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
