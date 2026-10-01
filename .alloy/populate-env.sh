#!/usr/bin/env bash
# Idempotently create .env from .env.example, filling values from the current environment.
set -euo pipefail
cd "$(dirname "$0")/.."
[ -f .env ] || cp .env.example .env
for var in OPENAI_API_KEY OPENAI_MODELS OPENAI_DEFAULT_MODEL OPENAI_BASE_URL; do
  val="${!var:-}"
  [ -z "$val" ] && continue
  current="$(grep -E "^${var}=" .env | head -1 | cut -d= -f2- || true)"
  if [ -z "$current" ] || [ "$current" = "sk-your-key-here" ]; then
    grep -vE "^${var}=" .env > .env.tmp || true
    printf '%s=%s\n' "$var" "$val" >> .env.tmp
    mv .env.tmp .env
  fi
done
echo ".env ready"
