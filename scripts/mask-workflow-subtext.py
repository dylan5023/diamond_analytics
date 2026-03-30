#!/usr/bin/env python3
"""
Blur horizontal bands where n8n HTTP nodes show method + URL under the title.

Unmasked originals (if you keep them): assets/n8n-workflow-originals/
Each run copies from assets/n8n-workflow-originals/ first (when present), then applies the mask — avoids stacking blur.

  python3 scripts/mask-workflow-subtext.py

Edit MASK_SPECS / BLUR_RADIUS / MASK_FEATHER to taste.
"""

from __future__ import annotations

import shutil
from pathlib import Path

from PIL import Image, ImageDraw, ImageFilter

ROOT = Path(__file__).resolve().parents[1]
WF_DIR = ROOT / "public" / "home-workflows"
ORIGINALS_DIR = ROOT / "assets" / "n8n-workflow-originals"

# Normalized rectangles: (left, top, right, bottom) in 0–1. Tight bands = subtitle row only.
MASK_SPECS: dict[str, list[tuple[float, float, float, float]]] = {
    "win-probability.png": [(0.0, 0.48, 1.0, 0.57)],
    "gear-pipeline.png": [(0.0, 0.50, 1.0, 0.59)],
    "top-news.png": [(0.0, 0.44, 1.0, 0.53), (0.0, 0.56, 1.0, 0.64)],
    "site-chat.png": [
        (0.0, 0.33, 1.0, 0.39),
        (0.0, 0.51, 1.0, 0.57),
        (0.0, 0.68, 1.0, 0.74),
    ],
}

# Light touch: strong values read like heavy censorship on thumbnails.
BLUR_RADIUS = 2
MASK_FEATHER = 8
DIM_OVERLAY_ALPHA = 10  # 0 = skip darken; was 28 (too heavy)


def build_soft_mask(size: tuple[int, int], rects_norm: list[tuple[float, float, float, float]]) -> Image.Image:
    w, h = size
    mask = Image.new("L", size, 0)
    draw = ImageDraw.Draw(mask)
    for l, t, r, b in rects_norm:
        x0, y0 = int(l * w), int(t * h)
        x1, y1 = int(r * w), int(b * h)
        draw.rectangle([x0, y0, x1, y1], fill=255)
    return mask.filter(ImageFilter.GaussianBlur(MASK_FEATHER))


def mask_image(path: Path, rects_norm: list[tuple[float, float, float, float]]) -> None:
    im = Image.open(path).convert("RGBA")
    blurred = im.filter(ImageFilter.GaussianBlur(BLUR_RADIUS))
    mask = build_soft_mask(im.size, rects_norm)
    out = Image.composite(blurred, im, mask)
    if DIM_OVERLAY_ALPHA > 0:
        dim = Image.new("RGBA", im.size, (12, 14, 20, DIM_OVERLAY_ALPHA))
        out = Image.composite(dim, out, mask)
    out.save(path, optimize=True)


def main() -> None:
    for name, rects in MASK_SPECS.items():
        path = WF_DIR / name
        original = ORIGINALS_DIR / name
        if original.is_file():
            shutil.copy2(original, path)
        elif not path.is_file():
            print("skip (missing original and dest):", name)
            continue
        mask_image(path, rects)
        print("masked:", path.relative_to(ROOT))


if __name__ == "__main__":
    main()
