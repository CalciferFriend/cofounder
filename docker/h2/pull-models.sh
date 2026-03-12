#!/usr/bin/env bash
# pull-models.sh — Pull a comma-separated list of Ollama models at startup.
#
# Usage: pull-models.sh "llama3.2,mistral,codellama:13b"
#
# Skips models already present. Exits 0 even if some pulls fail (warning only).

set -euo pipefail

MODELS="${1:-}"
if [ -z "$MODELS" ]; then
  echo "pull-models.sh: no models specified — skipping"
  exit 0
fi

IFS=',' read -ra MODEL_LIST <<< "$MODELS"
for model in "${MODEL_LIST[@]}"; do
  model=$(echo "$model" | xargs)  # trim whitespace
  [ -z "$model" ] && continue

  echo "  Pulling $model..."
  if ollama pull "$model"; then
    echo "  ✓ $model ready"
  else
    echo "  ✗ WARNING: Failed to pull $model — continuing"
  fi
done
