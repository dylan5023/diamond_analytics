#!/usr/bin/env python3
"""
Apply a light, uniform blur to the whole workflow PNG (no strip / line masking).

Copies from assets/n8n-workflow-originals/ first when present, then blurs the entire image
so small URL text is slightly harder to read without banding artifacts.

  python3 scripts/mask-workflow-subtext.py

Tune FULL_IMAGE_BLUR_RADIUS (0 = exact original after copy).
"""

from __future__ import annotations

import shutil
from pathlib import Path

from PIL import Image, ImageFilter

ROOT = Path(__file__).resolve().parents[1]
WF_DIR = ROOT / "public" / "home-workflows"
ORIGINALS_DIR = ROOT / "assets" / "n8n-workflow-originals"

WORKFLOW_FILES = (
    "win-probability.png",
    "gear-pipeline.png",
    "top-news.png",
    "site-chat.png",
)

# Whole-image softness (PIL GaussianBlur radius). Try 1 = subtle, 2 = a bit stronger.
FULL_IMAGE_BLUR_RADIUS = 1


def process_image(path: Path) -> None:
    im = Image.open(path).convert("RGBA")
    if FULL_IMAGE_BLUR_RADIUS <= 0:
        out = im
    else:
        out = im.filter(ImageFilter.GaussianBlur(FULL_IMAGE_BLUR_RADIUS))
    out.save(path, optimize=True)


def main() -> None:
    for name in WORKFLOW_FILES:
        path = WF_DIR / name
        original = ORIGINALS_DIR / name
        if original.is_file():
            shutil.copy2(original, path)
        elif not path.is_file():
            print("skip (missing original and dest):", name)
            continue
        process_image(path)
        print("processed:", path.relative_to(ROOT))


if __name__ == "__main__":
    main()
