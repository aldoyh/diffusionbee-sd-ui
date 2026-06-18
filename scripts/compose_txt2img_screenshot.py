#!/usr/bin/env python3
"""Composite a real backend-generated image into the txt2img UI screenshot."""

from __future__ import annotations

import sys
from pathlib import Path

from PIL import Image

ROOT = Path(__file__).resolve().parents[1]
SHOTS = ROOT / "docs" / "screenshots"
UI_BASE = SHOTS / "02-txt2img-ui.png"
OUTPUT = SHOTS / "02-txt2img.png"
SAMPLE = SHOTS / "sample-generation.png"

# Logical coords for 1280x900 window; scaled automatically for Retina captures.
GALLERY_BOX = (180, 120, 900, 820)


def scaled_box(im: Image.Image, box: tuple[int, int, int, int]) -> tuple[int, int, int, int]:
    scale = im.width / 1280
    left, top, right, bottom = box
    return (
        int(left * scale),
        int(top * scale),
        int(right * scale),
        int(bottom * scale),
    )


def compose(ui_path: Path, sample_path: Path, out_path: Path) -> None:
    ui = Image.open(ui_path).convert("RGBA")
    sample = Image.open(sample_path).convert("RGBA")

    left, top, right, bottom = scaled_box(ui, GALLERY_BOX)
    gallery_w = right - left
    gallery_h = bottom - top
    max_side = int(min(gallery_w, gallery_h) * 0.72)
    sample.thumbnail((max_side, max_side), Image.Resampling.LANCZOS)

    x = left + (gallery_w - sample.width) // 2
    y = top + (gallery_h - sample.height) // 2

    composed = ui.copy()
    # Cover the empty-state placeholder before placing the real output.
    overlay = Image.new("RGBA", (gallery_w, gallery_h), (18, 18, 18, 255))
    composed.paste(overlay, (left, top))
    composed.paste(sample, (x, y), sample)
    composed.convert("RGB").save(out_path, format="PNG", optimize=True)


def main() -> int:
    ui_path = UI_BASE if UI_BASE.exists() else OUTPUT
    if not ui_path.exists():
        print(f"FAIL: missing txt2img UI base ({UI_BASE} or {OUTPUT})")
        return 1
    if not SAMPLE.exists():
        print(f"FAIL: missing {SAMPLE} — run prepare_doc_screenshots.py first")
        return 1

    compose(ui_path, SAMPLE, OUTPUT)
    print(f"Composed {OUTPUT} from {ui_path.name} + {SAMPLE.name}")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())