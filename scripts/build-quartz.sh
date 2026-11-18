#!/usr/bin/env bash
set -euo pipefail

# Explicitly select one approved PhD vault / folder. Never scan all synced vaults.
: "${PHD_VAULT:?Set PHD_VAULT to an approved Obsidian vault directory}"
: "${QUARTZ_SOURCE:?Set QUARTZ_SOURCE to a local checkout of the Quartz project}"

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
VAULT="$(realpath "$PHD_VAULT")"
SOURCE="$(realpath "$QUARTZ_SOURCE")"
[[ -d "$VAULT" ]] || { echo "Vault not found" >&2; exit 1; }
[[ -f "$SOURCE/quartz.config.ts" ]] || { echo "Quartz checkout missing" >&2; exit 1; }
[[ "$VAULT" != "/" ]] || { echo "Refusing filesystem root" >&2; exit 1; }
command -v rsync >/dev/null || { echo "Install rsync" >&2; exit 1; }

echo "Selected vault: $VAULT"
echo "Quartz checkout: $SOURCE"
echo "Verify that quartz.config.ts sets baseUrl to phd.les12.fr/knowledge."
read -r -p "Publish this approved vault into the private Research Hub? [y/N] " answer
[[ "$answer" == "y" ]] || exit 1

mkdir -p "$SOURCE/content" "$ROOT/quartz/public"
rsync -a --delete \
  --exclude='.obsidian/' --exclude='.git/' --exclude='.trash/' \
  --exclude='.env' --exclude='.env.*' --exclude='*.key' --exclude='*.pem' \
  "$VAULT/" "$SOURCE/content/"
(cd "$SOURCE" && npx quartz build --output "$ROOT/quartz/public")
echo "Quartz site generated in $ROOT/quartz/public"
