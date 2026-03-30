#!/usr/bin/env python3
"""
Blur horizontal bands where n8n HTTP nodes show method + URL under the title.

Unmasked originals (if you keep them): assets/n8n-workflow-originals/
Re-run after replacing PNGs in public/home-workflows/:

  python3 scripts/mask-workflow-subtext.py

Edit MASK_SPECS / BLUR_RADIUS / MASK_FEATHER to taste.
"""

from __future__ import annotations

from pathlib import Path

from PIL import Image, ImageDraw, ImageFilter

ROOT = Path(__file__).resolve().parents[1]
WF_DIR = ROOT / "public" / "home-workflows"

# Normalized rectangles: (left, top, right, bottom) in 0–1. Small strips = subtitle rows only.
MASK_SPECS: dict[str, list[tuple[float, float, float, float]]] = {
    "win-probability.png": [(0.0, 0.44, 1.0, 0.60)],
    "gear-pipeline.png": [(0.0, 0.46, 1.0, 0.62)],
    "top-news.png": [(0.0, 0.40, 1.0, 0.56), (0.0, 0.52, 1.0, 0.66)],
    "site-chat.png": [
        (0.0, 0.30, 1.0, 0.40),
        (0.0, 0.48, 1.0, 0.58),
        (0.0, 0.65, 1.0, 0.76),
    ],
}

BLUR_RADIUS = 5
MASK_FEATHER = 14


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
    # Slight darken in masked zones so URLs don’t “shine through” after mild blur
    dim = Image.new("RGBA", im.size, (10, 12, 18, 28))
    out = Image.composite(dim, out, mask)
    out.save(path, optimize=True)


def main() -> None:
    for name, rects in MASK_SPECS.items():
        path = WF_DIR / name
        if not path.is_file():
            print("skip (missing):", path)
            continue
        mask_image(path, rects)
        print("masked:", path.relative_to(ROOT))


if __name__ == "__main__":
    main()
