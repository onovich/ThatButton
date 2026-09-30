"""Prepare the approved MAX! sticker for the WeChat runtime."""

from pathlib import Path

from PIL import Image


PORT_ROOT = Path(__file__).resolve().parents[1]
SOURCE = PORT_ROOT / "assets/concepts/2026-10-01/max-wordmark-v26-master.png"
TARGET = PORT_ROOT / "assets/runtime/max-wordmark-v26.png"


def main() -> None:
    image = Image.open(SOURCE).convert("RGBA")
    alpha = image.getchannel("A")
    visible = alpha.point(lambda value: 255 if value >= 12 else 0)
    bounds = visible.getbbox()
    if bounds is None:
        raise ValueError("MAX! source has no visible pixels")
    margin = 4
    image = image.crop((
        max(0, bounds[0] - margin), max(0, bounds[1] - margin),
        min(image.width, bounds[2] + margin),
        min(image.height, bounds[3] + margin),
    ))
    width = 512
    height = round(image.height * width / image.width)
    image.resize((width, height), Image.Resampling.LANCZOS).save(TARGET, optimize=True)
    print(f"{TARGET}: {width}x{height}")


if __name__ == "__main__":
    main()
