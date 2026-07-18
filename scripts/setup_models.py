#!/usr/bin/env python3
"""
Ensure required DiffusionBee models are downloaded and converted.

Fetches the official catalog, installs Default SD1.5, DreamShaper 6, and
CyberRealistic v3.1, optionally FLUX.1 models with --include-optional, and
optionally FLUX.2 Klein/Dev presets from Hugging Face with --include-flux2.
"""

from __future__ import annotations

import argparse
import os
import subprocess
import sys

PROJECT_ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
sys.path.insert(0, PROJECT_ROOT)

from scripts.lib.fixtures import REQUIRED_CATALOG_MODEL_IDS  # noqa: E402
from scripts.lib.models import ensure_required_models, verify_required_models  # noqa: E402


def main() -> int:
    parser = argparse.ArgumentParser(description="Download and verify DiffusionBee models")
    parser.add_argument(
        "--include-optional",
        action="store_true",
        help="Also sync FLUX.1-dev and FLUX.1-schnell from the catalog",
    )
    parser.add_argument(
        "--include-flux2",
        action="store_true",
        help="Also install FLUX.2 Klein 4B from Hugging Face (requires HF_TOKEN for gated variants)",
    )
    parser.add_argument(
        "--force",
        action="store_true",
        help="Re-download and re-convert models even if already present",
    )
    parser.add_argument(
        "--verify-only",
        action="store_true",
        help="Only check that required models exist; do not download",
    )
    args = parser.parse_args()

    print("=" * 70)
    print("  DiffusionBee Model Setup")
    print("=" * 70)
    print(f"Required: {', '.join(REQUIRED_CATALOG_MODEL_IDS)}")
    if args.include_optional:
        print("Optional: FLUX.1-dev, FLUX.1-schnell")
    if args.include_flux2:
        print("Optional: FLUX.2-klein-4B (Hugging Face)")
    print()

    if args.verify_only:
        missing = verify_required_models()
        if missing:
            print("Missing models:")
            for model_id in missing:
                print(f"  ✗ {model_id}")
            print("\nRun: python3 scripts/setup_models.py")
            return 1
        print("All required models are installed.")
        return 0

    try:
        installed = ensure_required_models(
            include_optional=args.include_optional,
            force=args.force,
        )
    except Exception as exc:
        print(f"\nSetup failed: {exc}")
        return 1

    if args.include_flux2:
        flux2_script = os.path.join(os.path.dirname(__file__), "install_flux2_models.py")
        flux2_result = subprocess.run(
            [sys.executable, flux2_script, "--preset", "flux2-klein-4b"],
            cwd=PROJECT_ROOT,
            check=False,
        )
        if flux2_result.returncode != 0:
            print("\nFLUX.2 setup failed. Ensure HF_TOKEN is set for gated models.")
            return flux2_result.returncode

    missing = verify_required_models()
    print()
    for model_id, record in installed.items():
        path = record.get("asset_path", "")
        exists = os.path.exists(path) if path else False
        mark = "✓" if exists else "✗"
        print(f"  {mark} {model_id}: {path}")

    if missing:
        print(f"\nSetup incomplete. Still missing: {', '.join(missing)}")
        return 1

    print("\nModel setup complete.")
    return 0


if __name__ == "__main__":
    sys.exit(main())