#!/usr/bin/env bash
# Copy welcome_*.png from ~/.diffusionbee/images into bundled app asset folders.
set -euo pipefail

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
SRC="${HOME}/.diffusionbee/images"
PUBLIC="${ROOT}/electron_app/public/welcome"
ASSETS="${ROOT}/electron_app/src/assets/welcome"

mkdir -p "$PUBLIC" "$ASSETS"

count=0
for name in welcome_*.png; do
  src_file="${SRC}/${name}"
  if [[ -f "$src_file" ]]; then
    cp "$src_file" "${PUBLIC}/${name}"
    cp "$src_file" "${ASSETS}/${name}"
    echo "Synced ${name}"
    count=$((count + 1))
  fi
done

echo "Synced ${count} welcome image(s)."