#!/usr/bin/env python3
"""
Generate DiffusionBee app icons from the brand logo.

Produces:
  electron_app/build/Icon-1024.png   (macOS app icon, rounded-rect master)
  electron_app/build/Icon-512.png
  electron_app/build/Icon-256.png
  electron_app/build/Icon-128.png
  electron_app/build/Icon-64.png
  electron_app/build/Icon-32.png
  electron_app/build/Icon-16.png
  electron_app/build/Icon.ico        (Windows, multi-size)
"""
from __future__ import annotations

import os
import subprocess
import sys
from io import BytesIO

from PIL import Image, ImageDraw, ImageFilter, ImageOps

REPO = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
BUILD_DIR = os.path.join(REPO, "electron_app", "build")
ASSETS = os.path.join(REPO, "electron_app", "src", "assets")

MAGENTA = (246, 59, 137, 255)      # #F63B89
CYAN = (0, 194, 255, 255)          # #00C2FF
DARK_BG = (10, 10, 15, 255)        # deep space bg
ACCENT_BLUE = (62, 123, 250, 255)  # #3E7BFA


def rounded_rectangle(size: int, radius: int = 0.22) -> Image.Image:
    """Return a white mask with a rounded-rectangle shape."""
    r = int(size * radius)
    mask = Image.new("L", (size, size), 0)
    draw = ImageDraw.Draw(mask)
    draw.rounded_rectangle([0, 0, size - 1, size - 1], radius=r, fill=255)
    return mask


def radial_gradient(size: int, center_color, edge_color) -> Image.Image:
    """Radial gradient from center_color to edge_color."""
    img = Image.new("RGB", (size, size))
    cx = cy = size / 2
    max_dist = ((size / 2) ** 2 + (size / 2) ** 2) ** 0.5
    for y in range(size):
        for x in range(size):
            d = ((x - cx) ** 2 + (y - cy) ** 2) ** 0.5
            t = min(1.0, d / max_dist)
            # smoothstep for a softer falloff
            t = t * t * (3 - 2 * t)
            r = int(center_color[0] * (1 - t) + edge_color[0] * t)
            g = int(center_color[1] * (1 - t) + edge_color[1] * t)
            b = int(center_color[2] * (1 - t) + edge_color[2] * t)
            img.putpixel((x, y), (r, g, b))
    return img


def load_logo(size: int) -> Image.Image:
    """Rasterize the brand logo SVG at the given size using ImageMagick."""
    svg_path = os.path.join(ASSETS, "logo_icon_raw.svg")
    tmp_png = os.path.join(BUILD_DIR, "_logo_tmp.png")
    # Render SVG at high res then downscale for crispness
    render = max(size * 4, 2048)
    subprocess.run(
        [
            "magick",
            "convert",
            "-background",
            "none",
            "-density",
            "300",
            svg_path,
            "-resize",
            f"{render}x{render}",
            tmp_png,
        ],
        check=True,
        capture_output=True,
    )
    logo = Image.open(tmp_png).convert("RGBA")
    os.remove(tmp_png)
    # Fit logo inside a centered square with padding
    pad = int(size * 0.14)
    box = size - 2 * pad
    logo = logo.resize((box, box), Image.LANCZOS)
    canvas = Image.new("RGBA", (size, size), (0, 0, 0, 0))
    canvas.paste(logo, (pad, pad), logo)
    return canvas


def make_icon(size: int) -> Image.Image:
    """Compose a single app-icon PNG."""
    base = radial_gradient(size, (20, 22, 34), DARK_BG)

    # subtle inner glow ring
    glow = Image.new("RGBA", (size, size), (0, 0, 0, 0))
    gdraw = ImageDraw.Draw(glow)
    gdraw.ellipse(
        [int(size * 0.06), int(size * 0.06), int(size * 0.94), int(size * 0.94)],
        outline=(62, 123, 250, 40),
        width=max(2, int(size * 0.012)),
    )
    base = Image.alpha_composite(base.convert("RGBA"), glow)

    logo = load_logo(size)
    base = Image.alpha_composite(base, logo)

    # Apply rounded-rect mask
    mask = rounded_rectangle(size)
    base.putalpha(mask)

    # Drop shadow underneath (baked into alpha channel is enough for PNG)
    return base


def save_icons():
    os.makedirs(BUILD_DIR, exist_ok=True)
    sizes = [16, 32, 64, 128, 256, 512, 1024]
    png_files = []
    for s in sizes:
        img = make_icon(s)
        name = f"Icon-{s}.png" if s >= 32 else f"Icon-{s}.png"
        path = os.path.join(BUILD_DIR, name)
        img.save(path, "PNG")
        png_files.append(path)
        print(f"✓ wrote {path} ({s}x{s})")

    # Windows ICO: standard sizes
    ico_sizes = [16, 32, 48, 64, 128, 256]
    ico_imgs = [make_icon(s) for s in ico_sizes]
    ico_path = os.path.join(BUILD_DIR, "Icon.ico")
    ico_imgs[0].save(
        ico_path,
        "ICO",
        sizes=[(s, s) for s in ico_sizes],
    )
    print(f"✓ wrote {ico_path}")

    return png_files


if __name__ == "__main__":
    save_icons()
    print("\nAll icons generated. Next: rebuild the app bundle.")
