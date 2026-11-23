# Integration configuration and Knowledge publication

## GitHub token

The GitHub Actions secret `GITHUB_TOKEN` is only available to explicitly authorized GitHub workflows. It does **not** automatically reach the production Docker container. The app requires `process.env.GITHUB_TOKEN` at runtime. A read-only diagnostic on 2026-11-23 confirmed the token **is already present in the live `phd-web` container**. The persistent warning came from a page that Next.js could prerender at build time, before the production runtime token existed. The Repositories page now explicitly opts into dynamic rendering.

The VPS repository's `web_phd` role renders the `.env` template using the Ansible variable `github_token`. Set the token in the **encrypted** `ansible/group_vars/vps.vault.yml` using `ansible-vault edit` locally. Do not commit the plaintext token or print its contents in CI. Apply the `web_phd` role and recreate the `phd-web` container to load the environment.

A configured token is not proof of valid access. Give a fine-grained token minimum read permissions to the selected private repositories. See the repository activity feed for actual successful imports.

## Quartz / Knowledge

The Nginx `phd-quartz` service serves `/opt/phd-hub/quartz/public` at `/knowledge/`. Without `index.html`, Nginx responds with a 403 directory-index error. The VPS role now provisions a **setup page only when an index file is absent**, so the route is usable and explains what remains.

Publishing real notes requires choosing an approved PhD-specific Obsidian vault/subdirectory, building it with Quartz, and copying its generated output to `quartz/public`. The optional `scripts/build-quartz.sh` helper in this repository requires the explicit `PHD_VAULT` and `QUARTZ_SOURCE` paths. Do not publish the entire Syncthing vault root or expose private unrelated notes. A future improvement can automate builds once the exact source vault is selected.

## Server updates

When the `.env` template or app commit changes, the service must recreate `phd-web`; simply doing `systemctl start web-phd` on an already started oneshot unit does not reload Docker environment variables or application images. The VPS Ansible role handles this on changes.
