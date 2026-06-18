#!/usr/bin/env bash
# One-command setup: ensure models are installed, then run prompt generation tests.
set -euo pipefail

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
cd "$ROOT"

PYTHON="${ROOT}/backends/stable_diffusion/venv311/bin/python3"
if [[ ! -x "$PYTHON" ]]; then
  PYTHON="python3"
fi

MODE="${1:-smoke}"

echo "==> Step 1/2: Model setup"
"$PYTHON" scripts/setup_models.py

echo
echo "==> Step 2/2: Prompt generation tests"

case "$MODE" in
  smoke)
    "$PYTHON" scripts/test_prompt_generation.py
    ;;
  full)
    "$PYTHON" scripts/test_prompt_generation.py --full
    ;;
  *)
    echo "Usage: $0 [smoke|full]"
    exit 1
    ;;
esac

echo
echo "Setup and tests finished successfully."