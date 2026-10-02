#!/usr/bin/env bash
# Idempotently create .env from .env.example, filling values from the current environment.
set -euo pipefail
cd "$(dirname "$0")/.."
[ -f .env ] || cp .env.example .env
for var in GEMINI_API_KEY OPENAI_API_KEY AI_PROVIDER MODEL_FAST MODEL_BALANCED MODEL_ADVANCED OPENAI_BASE_URL; do
  val="${!var:-}"
  [ -z "$val" ] && continue
  current="$(grep -E "^${var}=" .env | head -1 | cut -d= -f2- || true)"
  if [ -z "$current" ] || [ "$current" = "your-gemini-api-key" ]; then
    grep -vE "^${var}=" .env > .env.tmp || true
    printf '%s=%s\n' "$var" "$val" >> .env.tmp
    mv .env.tmp .env
  fi
done
echo ".env ready"
