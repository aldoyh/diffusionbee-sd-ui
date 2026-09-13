#!/usr/bin/env python3
"""Pixel-level sanity analysis of UI screenshots.
Detects: blank windows, dead-gray screens, whether UI chrome actually rendered."""
import sys
from PIL import Image, ImageFilter, ImageStat

def analyze(path, label):
    im = Image.open(path).convert("RGB")
    w, h = im.size
    small = im.resize((w // 4, h // 4))
    px = list(small.getdata())
    n = len(px)
    colors = len(set(px))
    stat = ImageStat.Stat(small)
    mean = [round(m, 1) for m in stat.mean]
    std = [round(s, 1) for s in stat.stddev]

    # Edge density: UI has many edges; blank window has almost none
    edges = small.convert("L").filter(ImageFilter.FIND_EDGES)
    estat = ImageStat.Stat(edges)
    edge_mean = round(estat.mean[0], 2)

    # Dark/light split (the app is dark-themed by default)
    lum = [0.299 * r + 0.587 * g + 0.114 * b for r, g, b in px[::7]]
    dark = sum(1 for L in lum if L < 60) / len(lum)
    light = sum(1 for L in lum if L > 200) / len(lum)

    # Quadrant variance (top bar / sidebar / center should differ)
    qw, qh = small.size[0] // 2, small.size[1] // 2
    quads = []
    for bx, by in ((0, 0), (qw, 0), (0, qh), (qw, qh)):
        q = small.crop((bx, by, bx + qw, by + qh))
        quads.append(round(ImageStat.Stat(q).stddev[0], 1))

    verdict = "SUSPECT (low detail)" if (colors < 300 or edge_mean < 2.0) else "looks rendered"
    print(f"--- {label}: {path}")
    print(f"    {w}x{h}  unique_colors={colors}  mean={mean}  std={std}")
    print(f"    edge_density={edge_mean}  dark%={dark:.2f}  light%={light:.2f}")
    print(f"    quadrant_std={quads}")
    print(f"    verdict: {verdict}")
    return colors, edge_mean

for path, label in zip(sys.argv[1::2], sys.argv[2::2]):
    analyze(path, label)
