#!/usr/bin/env bash
# download-media.sh — Populate public/exercise-media/ from the private awan-exercise-media repo.
# Usage: ./scripts/download-media.sh
#
# Prerequisites:
#   - GIT_TOKEN env var set (GitHub PAT with read access to awan-exercise-media)
#   - Repo URL: https://github.com/<owner>/awan-exercise-media
#
# The script clones (shallow) the private media repo into public/exercise-media/.
# Existing files are preserved (idempotent — skips if already present).
#
# TODO: Fill in MEDIA_REPO_URL after creating the private GitHub repo (Sprint 0 step 0.3).

set -euo pipefail

MEDIA_DIR="$(dirname "$0")/../public/exercise-media"
MEDIA_REPO_URL="${MEDIA_REPO_URL:-}"  # set via env or replace below
# MEDIA_REPO_URL="https://github.com/<owner>/awan-exercise-media"

if [[ -z "$MEDIA_REPO_URL" ]]; then
  echo "Error: MEDIA_REPO_URL is not set."
  echo "Usage: MEDIA_REPO_URL=https://github.com/<owner>/awan-exercise-media GIT_TOKEN=<pat> ./scripts/download-media.sh"
  exit 1
fi

if [[ -z "${GIT_TOKEN:-}" ]]; then
  echo "Error: GIT_TOKEN is not set."
  exit 1
fi

AUTHED_URL="${MEDIA_REPO_URL/https:\/\//https://${GIT_TOKEN}@}"

if [[ -d "$MEDIA_DIR/.git" ]]; then
  echo "Updating existing media repo..."
  git -C "$MEDIA_DIR" pull --depth=1
else
  echo "Cloning media repo into $MEDIA_DIR ..."
  git clone --depth=1 "$AUTHED_URL" "$MEDIA_DIR"
fi

echo "Done. Exercise media available at $MEDIA_DIR"
