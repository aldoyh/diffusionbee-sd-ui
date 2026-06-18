#!/usr/bin/env python3
"""Verify documentation screenshots contain real image content, not empty UI states."""

from __future__ import annotations

import statistics
import sys
from pathlib import Path

from PIL import Image

ROOT = Path(__file__).resolve().parents[1]
SHOTS = ROOT / "docs" / "screenshots"


def region_variance(im: Image.Image, box: tuple[int, int, int, int]) -> float:
    region = im.crop(box).convert("RGB")
    px = list(region.getdata())[::80]
    values = [v for p in px for v in p]
    return statistics.pvariance(values) if values else 0.0


def scaled_box(im: Image.Image, left: int, top: int, right: int, bottom: int) -> tuple[int, int, int, int]:
    scale = im.width / 1280
    return (
        int(left * scale),
        int(top * scale),
        int(right * scale),
        int(bottom * scale),
    )


def verify_homepage(path: Path) -> tuple[int, int]:
    im = Image.open(path)
    box = scaled_box(im, 190, 95, 1090, 340)
    w, h = im.crop(box).size
    cols, rows = 3, 2
    tw, th = w // cols, h // rows
    passed = 0
    for r in range(rows):
        for c in range(cols):
            tile = im.crop(box).crop((c * tw, r * th, (c + 1) * tw, (r + 1) * th))
            if region_variance(tile, (0, 0, tile.width, tile.height)) > 800:
                passed += 1
    return passed, cols * rows


def verify_txt2img(path: Path) -> bool:
    im = Image.open(path)
    # Main gallery canvas (left of settings panel)
    box = scaled_box(im, 180, 120, 900, 820)
    return region_variance(im, box) > 500


def verify_history(path: Path) -> bool:
    im = Image.open(path)
    box = scaled_box(im, 180, 120, 1200, 860)
    return region_variance(im, box) > 900


def verify_sample_generation(path: Path) -> bool:
    if not path.exists():
        return False
    im = Image.open(path)
    return im.width >= 256 and im.height >= 256 and region_variance(im, (0, 0, im.width, im.height)) > 1000


def main() -> int:
    ok = True

    home = SHOTS / "01-homepage.png"
    if home.exists():
        passed, total = verify_homepage(home)
        print(f"homepage grid: {passed}/{total} tiles {'PASS' if passed == total else 'FAIL'}")
        ok = ok and passed == total
    else:
        print("FAIL missing 01-homepage.png")
        ok = False

    txt2img = SHOTS / "02-txt2img.png"
    if txt2img.exists():
        txt_ok = verify_txt2img(txt2img)
        print(f"txt2img gallery: {'PASS' if txt_ok else 'FAIL (no generated image visible)'}")
        ok = ok and txt_ok
    else:
        print("FAIL missing 02-txt2img.png")
        ok = False

    history = SHOTS / "07-history.png"
    if history.exists():
        hist_ok = verify_history(history)
        print(f"history page: {'PASS' if hist_ok else 'FAIL'}")
        ok = ok and hist_ok
    else:
        print("WARN missing 07-history.png")

    sample = SHOTS / "sample-generation.png"
    sample_ok = verify_sample_generation(sample)
    print(f"sample-generation.png: {'PASS' if sample_ok else 'FAIL'}")
    ok = ok and sample_ok

    return 0 if ok else 1


if __name__ == "__main__":
    sys.exit(main())