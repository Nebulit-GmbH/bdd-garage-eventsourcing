#!/usr/bin/env bash
set -euo pipefail

prompt() {
  local var_name="$1"
  local prompt_text="$2"
  local value
  read -rp "$prompt_text: " value
  if [[ -z "$value" ]]; then
    echo "Error: $var_name cannot be empty." >&2
    exit 1
  fi
  echo "$value"
}

prompt_secret() {
  local var_name="$1"
  local prompt_text="$2"
  local value
  read -rsp "$prompt_text: " value
  echo "" >&2
  if [[ -z "$value" ]]; then
    echo "Error: $var_name cannot be empty." >&2
    exit 1
  fi
  echo "$value"
}

echo "=== SQLite .env setup ==="
echo ""

SQLITE_DB_PATH=$(prompt SQLITE_DB_PATH "SQLite file path (e.g. ./data/app.db)")
BACKEND_URL=$(prompt BACKEND_URL "Backend URL (e.g. http://localhost:3000)")

cat > .env <<EOF
SQLITE_DB_PATH=${SQLITE_DB_PATH}

BACKEND_URL=${BACKEND_URL}
PORT=3000
API_URL=${BACKEND_URL}
EOF

echo ""
echo ".env created successfully."

if [ -f .githooks/pre-commit ] && git rev-parse --git-dir >/dev/null 2>&1; then
  chmod +x .githooks/pre-commit 2>/dev/null || true
  # core.hooksPath resolves against the repo's actual top level, not this directory —
  # a relative ".githooks" silently breaks (no error, hooks just don't run) when this
  # project sits in a subfolder of a larger repo instead of being the repo root itself.
  git config core.hooksPath "$(pwd)/.githooks"
  echo "Configured git to use .githooks/ (slice commit-scope guard)."
fi