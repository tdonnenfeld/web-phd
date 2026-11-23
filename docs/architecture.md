# Architecture and data ownership

## Data flow

- Obsidian → Syncthing → read-only vault → Quartz builder → static /knowledge website.
- GitHub → server-side adapter → calendar/activity views (polling).
- Vikunja REST API ↔ server-side adapter → task UI.
- Approved private GitHub results Markdown (pinned to source SHA) or the read-only PhD Obsidian vault → source-linked experiment registry in PostgreSQL.
- Journal & link metadata ↔ PostgreSQL via Prisma.

The website never stores GitHub/Vikunja tokens in the browser. External systems remain the source of truth for their records. Journal entries and resource-link metadata are owned by Research Hub.

## Activity model

Each activity has a stable ID, source, kind, title, timestamp, and URL. The calendar treats dates without times as all-day entries. The current MVP performs on-demand reads. Durable history / sync-cursors / backfill worker are follow-up milestones.

## Linking

Journal notes use ResourceLink records with (journalId, source, externalId) uniqueness to connect notes to exact SHA-based commits, Vikunja IDs, and source-linked experiment records. The REST API supports adding and removing links; the visual link picker is scheduled for a follow-up.

## Privacy

Traefik's Authelia ForwardAuth is the external perimeter. Next.js middleware requires the authenticated Remote-User to equal ALLOWED_USER. The Traefik middleware must remove any incoming Remote-User before Authelia inserts an authenticated value. Confirm this in your actual Traefik dynamic configuration; do not rely solely on the sample Compose labels.

The Next.js container is deliberately not published on host ports. Allow network access only via Traefik on stack_web. GitHub source reports and images are served only through authenticated backend routes.

## Important limitations

- The MVP journal and basic calendar are functional; external APIs need correct tokens and connectivity.
- GitHub lists the first 100 results per endpoint, not a complete paginated historical archive.
- The experiment catalogue records source-linked reports; generated Slurm results must be committed to GitHub to become available, and computational runs are not launched by this application.
- Quartz must be built from an explicitly selected vault; don't publish all synchronized vaults.
- External activity is computed on demand, not persisted; future worker will store a durable activity snapshot.
- Task creation requires a numeric Vikunja project ID; a project selector is planned.
