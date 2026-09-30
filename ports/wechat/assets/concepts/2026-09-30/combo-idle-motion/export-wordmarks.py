"""Trim transparent imagegen masters into small, repeatable game assets."""

from pathlib import Path
from PIL import Image


ROOT = Path(__file__).resolve().parent
MASTERS = (
    ("ready-wordmark-transparent.png", "ready-wordmark-3x.png", 384),
    ("one-hit-wordmark-transparent.png", "one-hit-wordmark-3x.png", 320),
)


for source_name, output_name, output_width in MASTERS:
    source = Image.open(ROOT / source_name).convert("RGBA")
    solid_alpha = source.getchannel("A").point(lambda value: 255 if value > 16 else 0)
    bounds = solid_alpha.getbbox()
    if bounds is None:
        raise ValueError(f"No visible art in {source_name}")
    padding = round((bounds[2] - bounds[0]) * 0.015)
    bounds = (
        max(0, bounds[0] - padding),
        max(0, bounds[1] - padding),
        min(source.width, bounds[2] + padding),
        min(source.height, bounds[3] + padding),
    )
    cutout = source.crop(bounds)
    output_height = round(cutout.height * output_width / cutout.width)
    cutout = cutout.resize((output_width, output_height), Image.Resampling.LANCZOS)
    destination = ROOT / output_name
    cutout.save(destination, optimize=True)
    print(f"{destination}: {cutout.width}x{cutout.height}, {destination.stat().st_size} bytes")
