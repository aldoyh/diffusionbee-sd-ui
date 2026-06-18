#!/usr/bin/env python3
"""Verify homepage welcome grid and history screenshot content."""
from __future__ import annotations

import statistics
import sys
from pathlib import Path

from PIL import Image

ROOT = Path(__file__).resolve().parents[1]
SHOTS = ROOT / "docs" / "screenshots"


def tile_variance(tile: Image.Image) -> float:
    px = list(tile.convert("RGB").getdata())[::80]
    values = [p[0] for p in px] + [p[1] for p in px] + [p[2] for p in px]
    return statistics.pvariance(values) if values else 0.0


def verify_homepage(path: Path) -> tuple[int, int]:
    im = Image.open(path)
    # Retina captures are 2x — scale crop proportionally.
    scale = im.width / 1280
    left, top, right, bottom = (int(190 * scale), int(95 * scale), int(1090 * scale), int(340 * scale))
    region = im.crop((left, top, right, bottom))
    w, h = region.size
    cols, rows = 4, 3
    tw, th = w // cols, h // rows
    passed = 0
    for r in range(rows):
        for c in range(cols):
            tile = region.crop((c * tw, r * th, (c + 1) * tw, (r + 1) * th))
            if tile_variance(tile) > 800:
                passed += 1
    return passed, cols * rows


def verify_history(path: Path) -> bool:
    im = Image.open(path)
    scale = im.width / 1280
    region = im.crop((int(180 * scale), int(120 * scale), int(1200 * scale), int(860 * scale)))
    var = tile_variance(region)
    # History should show prompts/thumbnails; upscaler empty state is much flatter.
    return var > 900


def main() -> int:
    home = SHOTS / "01-homepage.png"
    history = SHOTS / "07-history.png"
    ok = True

    if not home.exists():
        print(f"FAIL missing {home}")
        return 1

    passed, total = verify_homepage(home)
    print(f"homepage grid: {passed}/{total} tiles PASS")
    ok = ok and passed == total

    if history.exists():
        hist_ok = verify_history(history)
        print(f"history page: {'PASS' if hist_ok else 'FAIL'}")
        ok = ok and hist_ok
    else:
        print("WARN missing 07-history.png")

    return 0 if ok else 1


if __name__ == "__main__":
    sys.exit(main())