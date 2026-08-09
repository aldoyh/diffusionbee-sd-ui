#!/usr/bin/env bash
# Ensure documentation screenshots contain validated, real generated images.
# Exits non-zero if verification fails.
set -euo pipefail

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
cd "$ROOT"

echo "==> Step 1: Generate / validate sample output image"
python3 scripts/prepare_doc_screenshots.py --generate

APP_PROCESS_NAME="${APP_PROCESS_NAME:-Electron}"

echo "==> Step 2: Capture UI (requires running $APP_PROCESS_NAME window)"
if osascript -e "tell application \"System Events\" to return (exists process \"$APP_PROCESS_NAME\")" 2>/dev/null | grep -q true; then
  APP_PROCESS_NAME="$APP_PROCESS_NAME" ./scripts/capture_screenshots.sh
else
  echo "WARN: $APP_PROCESS_NAME not running — reusing existing UI captures in docs/screenshots/"
  if [[ ! -f docs/screenshots/02-txt2img-ui.png && -f docs/screenshots/02-txt2img.png ]]; then
    cp docs/screenshots/02-txt2img.png docs/screenshots/02-txt2img-ui.png
  fi
fi

echo "==> Step 3: Composite real generation into txt2img screenshot"
python3 scripts/compose_txt2img_screenshot.py

echo "==> Step 4: Verify all documentation images"
python3 scripts/verify_doc_screenshots.py

echo "Documentation screenshots OK."