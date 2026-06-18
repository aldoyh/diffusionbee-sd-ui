#!/usr/bin/env python3
"""
Generate images from fixture prompt text and verify outputs.

Runs smoke tests by default (2 prompts, 512x512, fewer steps).
Use --full to regenerate all six welcome homepage samples at 768x768.
"""

from __future__ import annotations

import argparse
import os
import shutil
import sys
import time

PROJECT_ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
sys.path.insert(0, PROJECT_ROOT)

from scripts.lib.backend_client import BackendSession  # noqa: E402
from scripts.lib.fixtures import (  # noqa: E402
    FULL_WELCOME_CASES,
    GENERATION_CASES,
    MODEL_TDICT_PATHS,
)
from scripts.lib.image_checks import validate_image  # noqa: E402
from scripts.lib.models import verify_required_models  # noqa: E402
from scripts.lib.paths import ASSETS_WELCOME, IMAGES_DIR, PUBLIC_WELCOME  # noqa: E402


def sync_welcome_assets(filenames):
    synced = []
    for name in filenames:
        src = os.path.join(IMAGES_DIR, name)
        if not os.path.exists(src):
            continue
        for dest_dir in (PUBLIC_WELCOME, ASSETS_WELCOME):
            os.makedirs(dest_dir, exist_ok=True)
            shutil.copy2(src, os.path.join(dest_dir, name))
        synced.append(name)
    return synced


def run_cases(cases, width, height, sync_assets: bool) -> int:
    os.makedirs(IMAGES_DIR, exist_ok=True)
    failures = []
    saved_names = []

    print(f"Running {len(cases)} generation case(s) at {width}x{height}")
    print()

    with BackendSession() as session:
        for index, case in enumerate(cases, start=1):
            prompt, seed, label, model_key, steps, filename = case
            model_path = MODEL_TDICT_PATHS[model_key]
            if not os.path.exists(model_path):
                failures.append((label, f"model missing: {model_path}"))
                print(f"[{index}/{len(cases)}] {label} — SKIP (model missing)")
                continue

            print(f"[{index}/{len(cases)}] {label}")
            print(f"  Prompt: {prompt[:80]}...")
            print(f"  Model:  {model_key} ({steps} steps)")
            start = time.time()

            image_path = session.generate(
                prompt=prompt,
                model_path=model_path,
                seed=seed,
                num_steps=steps,
                width=width,
                height=height,
            )
            elapsed = time.time() - start

            if not image_path:
                failures.append((label, "backend returned no image path"))
                print(f"  ✗ Failed ({elapsed:.0f}s)")
                continue

            ok, detail = validate_image(image_path, min_width=width // 2, min_height=height // 2)
            if not ok:
                failures.append((label, detail))
                print(f"  ✗ Invalid image: {detail}")
                continue

            if filename:
                dest = os.path.join(IMAGES_DIR, filename)
                shutil.copy2(image_path, dest)
                saved_names.append(filename)
                print(f"  ✓ Saved {dest} ({detail}, {elapsed:.0f}s)")
            else:
                print(f"  ✓ Generated {image_path} ({detail}, {elapsed:.0f}s)")

    if sync_assets and saved_names:
        synced = sync_welcome_assets(saved_names)
        print(f"\nSynced {len(synced)} welcome asset(s) into electron_app")

    print()
    if failures:
        print(f"Failed {len(failures)}/{len(cases)} case(s):")
        for label, reason in failures:
            print(f"  ✗ {label}: {reason}")
        return 1

    print(f"All {len(cases)} generation case(s) passed.")
    return 0


def main() -> int:
    parser = argparse.ArgumentParser(description="Prompt-driven image generation tests")
    parser.add_argument(
        "--full",
        action="store_true",
        help="Run all six welcome prompts at 768x768 and sync app assets",
    )
    parser.add_argument(
        "--skip-setup-check",
        action="store_true",
        help="Do not verify required models before generating",
    )
    args = parser.parse_args()

    print("=" * 70)
    print("  DiffusionBee Prompt Generation Tests")
    print("=" * 70)

    if not args.skip_setup_check:
        missing = verify_required_models()
        if missing:
            print("Required models are missing:")
            for model_id in missing:
                print(f"  ✗ {model_id}")
            print("\nRun setup first: python3 scripts/setup_models.py")
            return 1
        print("Required models verified.")
        print()

    if args.full:
        return run_cases(FULL_WELCOME_CASES, 768, 768, sync_assets=True)

    return run_cases(GENERATION_CASES, 512, 512, sync_assets=False)


if __name__ == "__main__":
    sys.exit(main())