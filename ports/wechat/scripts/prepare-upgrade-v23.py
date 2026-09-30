"""Cut the accepted v22 upgrade study into reusable, transparent game layers.

The three existing choice cards and the speech bubble have fixed copy, so they
are cut as complete art. Only score and health remain live Canvas text.
"""

from collections import deque
from pathlib import Path

from PIL import Image, ImageDraw, ImageFilter


ROOT = Path(__file__).resolve().parents[1]
STUDY = ROOT / "assets/concepts/2026-09-30/upgrade-v22/upgrade-fullscreen-study.png"
PURPLE = ROOT / "assets/concepts/2026-09-30/upgrade-v22/card4-purple-generated-master.png"
DEST = ROOT / "assets/runtime"
DEST.mkdir(parents=True, exist_ok=True)


def rounded_mask(size, box, radius):
    mask = Image.new("L", size)
    ImageDraw.Draw(mask).rounded_rectangle(box, radius=radius, fill=255)
    return mask.filter(ImageFilter.GaussianBlur(0.65))


def save_layer(image, mask, name, width, colors=128):
    rgba = image.convert("RGBA")
    rgba.putalpha(mask)
    height = round(rgba.height * width / rgba.width)
    rgba = rgba.resize((width, height), Image.Resampling.LANCZOS)
    # Palette PNGs retain alpha but cost far less of the WeChat main package.
    rgba.quantize(colors=colors, method=Image.Quantize.FASTOCTREE,
                  dither=Image.Dither.NONE).save(DEST / name, optimize=True)
    print(f"{name}: {width}x{height}, {(DEST / name).stat().st_size:,} bytes")


def cream_region_mask(image, seed=(200, 100)):
    """Find the bubble's light fill; expand to its navy outline without the hero."""
    hsv = image.convert("HSV")
    width, height = image.size
    data = hsv.load()
    seen = bytearray(width * height)
    mask = Image.new("L", image.size)
    pix = mask.load()
    queue = deque([seed])
    while queue:
        x, y = queue.popleft()
        if x < 0 or y < 0 or x >= width or y >= height:
            continue
        index = y * width + x
        if seen[index]:
            continue
        seen[index] = 1
        _, sat, value = data[x, y]
        if sat > 100 or value < 185:
            continue
        pix[x, y] = 255
        queue.extend(((x - 1, y), (x + 1, y), (x, y - 1), (x, y + 1)))
    # Source outline is about 8 px. The mask stays off the adjacent pink brain.
    mask = mask.filter(ImageFilter.MaxFilter(21))
    limit = Image.new("L", image.size)
    ImageDraw.Draw(limit).polygon(
        [(0, 0), (470, 0), (485, 63), (475, 127), (430, 149),
         (430, 204), (390, 204), (356, 186), (0, 195)], fill=255)
    return Image.composite(mask, Image.new("L", image.size), limit)


with Image.open(STUDY) as source:
    source = source.convert("RGB")
    card_boxes = {
        "upgrade-card-chain-v23.png": (20, 790, 833, 1072),
        "upgrade-card-hp-v23.png": (20, 1070, 833, 1362),
        "upgrade-card-time-v23.png": (20, 1355, 833, 1645),
    }
    for name, box in card_boxes.items():
        card = source.crop(box).resize((813, 282), Image.Resampling.LANCZOS)
        save_layer(card, rounded_mask(card.size, (13, 6, 801, 275), 51),
                   name, 640, colors=160)

    bubble = source.crop((20, 380, 530, 585))
    save_layer(bubble, cream_region_mask(bubble),
               "upgrade-bubble-v23.png", 510, colors=192)

    status = source.crop((20, 645, 833, 780))
    blank = status.copy()
    # Sample a text-free column row by row to preserve the original warm gradient.
    pixels = blank.load()
    for y in range(18, 109):
        sampled = status.getpixel((350, y))
        for x in range(23, 790):
            pixels[x, y] = sampled
    save_layer(blank, rounded_mask(blank.size, (4, 4, 808, 129), 28),
               "upgrade-status-v23.png", 640, colors=128)

    badge = source.crop((471, 667, 553, 749))
    save_layer(badge, rounded_mask(badge.size, (1, 1, 80, 80), 20),
               "upgrade-heart-v23.png", 96, colors=128)

with Image.open(PURPLE) as generated:
    card = generated.convert("RGB").resize((813, 282), Image.Resampling.LANCZOS)
    save_layer(card, rounded_mask(card.size, (13, 6, 801, 275), 51),
               "upgrade-card-progress-v23.png", 640, colors=160)
