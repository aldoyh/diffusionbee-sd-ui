#!/usr/bin/env bash
# Stage a production backend for electron-builder extraResources.
#
# The official PyInstaller binary expects libpython3.9.dylib and friends in the
# SAME directory as diffusionbee_backend (flat core/ layout). Putting them in a
# subfolder breaks dlopen and the backend exits immediately.
set -euo pipefail

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
STAGE="${ROOT}/electron_app/.packaged-backend"
OFFICIAL_APP="/Applications/DiffusionBee.app"
OFFICIAL_CORE="${OFFICIAL_APP}/Contents/Resources/core"

rm -rf "${STAGE}"
mkdir -p "${STAGE}"

if [[ -x "${OFFICIAL_CORE}/diffusionbee_backend" ]]; then
  echo "[prepare-backend] Using official PyInstaller core from ${OFFICIAL_APP}"
  rsync -a "${OFFICIAL_CORE}/" "${STAGE}/"
else
  echo "[prepare-backend] Official backend not found — falling back to source tree (dev only)"
  rsync -a \
    --exclude 'venv/' \
    --exclude 'venv311/' \
    --exclude '.venv/' \
    --exclude '__pycache__/' \
    --exclude '*.pyc' \
    --exclude '.DS_Store' \
    --exclude '.git/' \
    "${ROOT}/backends/" "${STAGE}/"
fi

if [[ ! -x "${STAGE}/diffusionbee_backend" && ! -f "${STAGE}/stable_diffusion/diffusionbee_backend.py" ]]; then
  echo "[prepare-backend] ERROR: No runnable backend in staged core" >&2
  exit 1
fi

echo "[prepare-backend] Staged backend at ${STAGE}"
du -sh "${STAGE}"
if [[ -f "${STAGE}/libpython3.9.dylib" ]]; then
  echo "[prepare-backend] PyInstaller runtime OK (libpython3.9.dylib present)"
else
  echo "[prepare-backend] WARNING: libpython3.9.dylib missing — generation may fail"
fi