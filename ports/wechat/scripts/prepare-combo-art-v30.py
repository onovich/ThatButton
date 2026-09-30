"""Package the approved, underline-free combo wordmarks and illustrated digits."""

from pathlib import Path
from PIL import Image


ROOT = Path(__file__).resolve().parents[1]
CONCEPTS = ROOT / "assets/concepts/2026-10-01"
RUNTIME = ROOT / "assets/runtime"


def alpha_bounds(image: Image.Image, threshold: int = 96):
    return image.getchannel("A").point(lambda value: 255 if value >= threshold else 0).getbbox()


def package_wordmark(name: str):
    source = Image.open(CONCEPTS / f"{name}-v30-master.png").convert("RGBA")
    bounds = alpha_bounds(source)
    if bounds is None:
        raise ValueError(f"Empty wordmark: {name}")
    pad = 12
    crop = source.crop((max(0, bounds[0] - pad), max(0, bounds[1] - pad),
                        min(source.width, bounds[2] + pad), min(source.height, bounds[3] + pad)))
    # The HUD renders these at about 100 logical pixels; 384 keeps 3x detail.
    width = 384
    crop = crop.resize((width, round(crop.height * width / crop.width)), Image.Resampling.LANCZOS)
    output = RUNTIME / f"{name}-v30.png"
    crop.save(output, optimize=True)
    print(f"{output.name}: {crop.size}, {output.stat().st_size} bytes")


def package_digits():
    source = Image.open(CONCEPTS / "combo-digits-v29-master.png").convert("RGBA")
    cell_w, cell_h = 128, 136
    atlas = Image.new("RGBA", (cell_w * 10, cell_h))
    metrics = []
    for value in range(10):
        row, col = divmod(value, 5)
        x0 = round(col * source.width / 5)
        x1 = round((col + 1) * source.width / 5)
        y0 = round(row * source.height / 2)
        y1 = round((row + 1) * source.height / 2)
        cell = source.crop((x0, y0, x1, y1))
        bounds = alpha_bounds(cell, 96)
        if bounds is None:
            raise ValueError(f"Missing digit {value}")
        pad = 10
        crop = cell.crop((max(0, bounds[0] - pad), max(0, bounds[1] - pad),
                          min(cell.width, bounds[2] + pad), min(cell.height, bounds[3] + pad)))
        scale = min(112 / crop.width, 120 / crop.height)
        scaled = crop.resize((round(crop.width * scale), round(crop.height * scale)),
                             Image.Resampling.LANCZOS)
        left = (cell_w - scaled.width) // 2
        top = (cell_h - scaled.height) // 2
        atlas.alpha_composite(scaled, (value * cell_w + left, top))
        visible = alpha_bounds(atlas.crop((value * cell_w, 0, (value + 1) * cell_w, cell_h)), 96)
        metrics.append((visible[0], visible[2]))
    output = RUNTIME / "combo-digits-v29.png"
    atlas.save(output, optimize=True)
    print(f"{output.name}: {atlas.size}, {output.stat().st_size} bytes")
    print(f"COMBO_DIGIT_BOUNDS = {metrics}")


for wordmark in ("hit-wordmark", "max-wordmark", "combo-wordmark"):
    package_wordmark(wordmark)
package_digits()
