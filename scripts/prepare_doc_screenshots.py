#!/usr/bin/env python3
"""Prepare documentation image assets from real backend generations."""

from __future__ import annotations

import argparse
import os
import shutil
import sys

PROJECT_ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
sys.path.insert(0, PROJECT_ROOT)

from scripts.lib.backend_client import BackendSession  # noqa: E402
from scripts.lib.fixtures import MODEL_TDICT_PATHS  # noqa: E402
from scripts.lib.image_checks import validate_image  # noqa: E402
from scripts.lib.paths import IMAGES_DIR  # noqa: E402

SHOTS_DIR = os.path.join(PROJECT_ROOT, "docs", "screenshots")
SAMPLE_OUTPUT = os.path.join(SHOTS_DIR, "sample-generation.png")

DOC_PROMPT = (
    "A lone samurai standing on a misty mountain peak at dawn, golden sunlight "
    "piercing through clouds, epic cinematic composition, dramatic shadows, "
    "volumetric lighting, award-winning photography, 8K ultra detailed"
)
DOC_SEED = 227018


def pick_existing_sample() -> str | None:
    candidates = [
        os.path.join(IMAGES_DIR, "welcome_glass_pavilion.png"),
        os.path.join(IMAGES_DIR, "welcome_anime_tokyo_alley.png"),
        os.path.join(IMAGES_DIR, "welcome_oil_still_life.png"),
    ]
    for path in candidates:
        ok, _ = validate_image(path)
        if ok:
            return path
    if not os.path.isdir(IMAGES_DIR):
        return None
    for name in sorted(os.listdir(IMAGES_DIR), key=lambda n: os.path.getmtime(os.path.join(IMAGES_DIR, n)), reverse=True):
        if not name.lower().endswith(".png") or name.startswith("welcome_"):
            continue
        path = os.path.join(IMAGES_DIR, name)
        ok, _ = validate_image(path)
        if ok:
            return path
    return None


def generate_sample(model_key: str = "default") -> str | None:
    model_path = MODEL_TDICT_PATHS[model_key]
    if not os.path.exists(model_path):
        return None
    os.makedirs(IMAGES_DIR, exist_ok=True)
    with BackendSession() as session:
        return session.generate(
            prompt=DOC_PROMPT,
            model_path=model_path,
            seed=DOC_SEED,
            num_steps=25,
            width=512,
            height=512,
        )


def main() -> int:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument(
        "--generate",
        action="store_true",
        help="Run a fresh txt2img generation instead of reusing ~/.diffusionbee/images",
    )
    args = parser.parse_args()

    os.makedirs(SHOTS_DIR, exist_ok=True)

    source = None
    if args.generate:
        print("Generating documentation sample image via backend...")
        for key in ("default", "dream", "cyber"):
            source = generate_sample(key)
            if source:
                print(f"  Generated: {source}")
                break
    else:
        source = pick_existing_sample()
        if source:
            print(f"Reusing existing image: {source}")

    if not source:
        print("FAIL: no valid generated image available for documentation")
        return 1

    ok, detail = validate_image(source)
    if not ok:
        print(f"FAIL: {detail}")
        return 1

    shutil.copy2(source, SAMPLE_OUTPUT)
    print(f"Wrote {SAMPLE_OUTPUT} ({detail})")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())