"""Package image-generated result UI cutouts without redrawing protected art."""

from pathlib import Path
from PIL import Image


ROOT = Path(__file__).resolve().parents[1]
CONCEPT = ROOT / "assets/concepts/2026-10-01"
RUNTIME = ROOT / "assets/runtime"


def bounds(image: Image.Image, threshold: int = 96):
    return image.getchannel("A").point(
        lambda alpha: 255 if alpha >= threshold else 0).getbbox()


def crop_art(name: str, pad: int = 8):
    image = Image.open(CONCEPT / f"{name}-v32-master.png").convert("RGBA")
    box = bounds(image)
    if not box:
        raise ValueError(f"Empty image: {name}")
    return image.crop((max(0, box[0] - pad), max(0, box[1] - pad),
                       min(image.width, box[2] + pad), min(image.height, box[3] + pad)))


def save(image: Image.Image, name: str, colors: int = 128):
    output = RUNTIME / f"{name}-v32.png"
    image.quantize(colors=colors, method=Image.Quantize.FASTOCTREE,
                   dither=Image.Dither.NONE).save(output, optimize=True)
    print(f"{output.name}: {image.size}, {output.stat().st_size} bytes")


def button(name: str):
    crop = crop_art(f"result-button-{name}", 5)
    height = 128
    scaled = crop.resize((round(crop.width * height / crop.height), height),
                         Image.Resampling.LANCZOS)
    width = 768
    xcuts = [0, round(scaled.width * .12), round(scaled.width * .28),
             round(scaled.width * .72), round(scaled.width * .88), scaled.width]
    extra = width - scaled.width
    if extra < 0:
        raise ValueError(f"Button art too wide for target: {name}")
    output = Image.new("RGBA", (width, height))
    dest = 0
    for index in range(5):
        segment = scaled.crop((xcuts[index], 0, xcuts[index + 1], height))
        dest_width = segment.width + (extra // 2 if index == 1 else
                                      extra - extra // 2 if index == 3 else 0)
        if dest_width != segment.width:
            segment = segment.resize((dest_width, height), Image.Resampling.LANCZOS)
        output.alpha_composite(segment, (dest, 0))
        dest += segment.width
    assert dest == width
    save(output, f"result-button-{name}", 128)


def score_digits():
    source = Image.open(CONCEPT / "result-score-digits-v32-master.png").convert("RGBA")
    cell_w, cell_h = 104, 112
    atlas = Image.new("RGBA", (10 * cell_w, cell_h))
    metrics = []
    for digit in range(10):
        row, col = divmod(digit, 5)
        cell = (Image.open(CONCEPT / "result-score-four-v32-master.png").convert("RGBA")
                if digit == 4 else source.crop((round(col * source.width / 5),
                                                round(row * source.height / 2),
                                                round((col + 1) * source.width / 5),
                                                round((row + 1) * source.height / 2))))
        box = bounds(cell)
        if not box:
            raise ValueError(f"Missing score digit {digit}")
        pad = 5
        crop = cell.crop((max(0, box[0] - pad), max(0, box[1] - pad),
                          min(cell.width, box[2] + pad), min(cell.height, box[3] + pad)))
        scale = min(96 / crop.width, 101 / crop.height)
        glyph = crop.resize((round(crop.width * scale), round(crop.height * scale)),
                            Image.Resampling.LANCZOS)
        left = (cell_w - glyph.width) // 2
        top = (cell_h - glyph.height) // 2
        atlas.alpha_composite(glyph, (digit * cell_w + left, top))
        box = bounds(atlas.crop((digit * cell_w, 0, (digit + 1) * cell_w, cell_h)))
        metrics.append((box[0], box[2]))
    save(atlas, "result-score-digits", 128)
    print(f"RESULT_SCORE_DIGIT_BOUNDS = {metrics}")


def single(name: str, max_width: int, max_height: int, colors: int = 128):
    crop = crop_art(name)
    scale = min(max_width / crop.width, max_height / crop.height)
    image = crop.resize((round(crop.width * scale), round(crop.height * scale)),
                        Image.Resampling.LANCZOS)
    save(image, name, colors)


for name in ("retry", "home"):
    button(name)
score_digits()
single("result-score-fen", 104, 112)
single("result-crown", 68, 54)
single("result-burst", 64, 74)
burst = Image.open(RUNTIME / "result-burst-v32.png").convert("RGBA")
save(burst.transpose(Image.Transpose.FLIP_LEFT_RIGHT), "result-burst-right")
