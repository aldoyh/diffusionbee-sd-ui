#!/usr/bin/env python3
"""Install FLUX.2 models from Hugging Face into ~/.diffusionbee."""

from __future__ import annotations

import argparse
import subprocess
import sys
from pathlib import Path

PROJECT_ROOT = Path(__file__).resolve().parents[1]
INSTALLER = PROJECT_ROOT / "install_hf_model.py"

PRESETS = [
    "flux2-klein-4b",
    "flux2-klein-9b",
    "flux2-dev",
]


def main() -> int:
    parser = argparse.ArgumentParser(description="Install FLUX.2 models for DiffusionBee")
    parser.add_argument(
        "--preset",
        choices=PRESETS + ["all"],
        default="flux2-klein-4b",
        help="Which FLUX.2 preset to install (default: flux2-klein-4b)",
    )
    args = parser.parse_args()

    targets = PRESETS if args.preset == "all" else [args.preset]

    for preset in targets:
        print(f"\n=== Installing {preset} ===")
        result = subprocess.run(
            [sys.executable, str(INSTALLER), "--preset", preset],
            cwd=str(PROJECT_ROOT),
            check=False,
        )
        if result.returncode != 0:
            print(f"Failed to install preset: {preset}")
            return result.returncode

    print("\nFLUX.2 installation complete.")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())