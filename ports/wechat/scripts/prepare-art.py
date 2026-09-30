"""Crop the accepted transparent v14/v11 character groups for the game bundle."""

from pathlib import Path
from PIL import Image


ROOT = Path(__file__).resolve().parents[1]
CONCEPTS = ROOT / "assets" / "concepts" / "2026-09-29"
DEST = ROOT / "assets" / "runtime"
DEST.mkdir(parents=True, exist_ok=True)

SOURCES = {
    "running-pair.png": (CONCEPTS / "v14-production-art" / "brain-glove-running-pair-v14.png", 840),
    "caring-pair.png": (CONCEPTS / "brain-glove-b-caring-pair-thin-rim.png", 760),
}

for name, (source, target_width) in SOURCES.items():
    with Image.open(source) as original:
        rgba = original.convert("RGBA")
        alpha = rgba.getchannel("A").point(lambda value: 255 if value > 3 else 0)
        box = alpha.getbbox()
        if box is None:
            raise ValueError(f"No visible pixels in {source}")
        padding = 12
        box = (
            max(0, box[0] - padding),
            max(0, box[1] - padding),
            min(rgba.width, box[2] + padding),
            min(rgba.height, box[3] + padding),
        )
        cropped = rgba.crop(box)
        height = round(cropped.height * target_width / cropped.width)
        cropped.resize((target_width, height), Image.Resampling.LANCZOS).save(
            DEST / name, optimize=True
        )
        print(f"{name}: {rgba.size} crop={box} runtime={target_width}x{height}")

# v15 keeps the accepted characters and exports only layered UI artwork.
V15 = CONCEPTS / "v15-art-polish"
for name, source_name, target_width in [
    ("title-home.png", "title-home-v15.png", 900),
    ("title-result.png", "title-result-v15.png", 900),
    ("separated-pair.png", "brain-glove-separated-v15.png", 900),
]:
    with Image.open(V15 / source_name) as original:
        rgba = original.convert("RGBA")
        box = rgba.getchannel("A").getbbox()
        if box is None:
            raise ValueError(f"No visible pixels in {source_name}")
        padding = 12
        box = (max(0, box[0] - padding), max(0, box[1] - padding),
               min(rgba.width, box[2] + padding), min(rgba.height, box[3] + padding))
        cropped = rgba.crop(box)
        target_height = round(cropped.height * target_width / cropped.width)
        cropped.resize((target_width, target_height), Image.Resampling.LANCZOS).save(
            DEST / name, optimize=True
        )
        print(f"{name}: {rgba.size} crop={box} runtime={target_width}x{target_height}")

for name, source_name, target_width in [
    ("sunny-stage.jpg", "sunny-stage-v15.png", 800),
    ("gameplay-landscape.jpg", "gameplay-landscape-v15.png", 800),
]:
    with Image.open(V15 / source_name) as original:
        target_height = round(original.height * target_width / original.width)
        original.convert("RGB").resize((target_width, target_height), Image.Resampling.LANCZOS).save(
            DEST / name, quality=87, optimize=True, progressive=True
        )
        print(f"{name}: {original.size} runtime={target_width}x{target_height}")
