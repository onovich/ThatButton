"""Repair the v23 bubble's clipped tail without rerendering its lettering.

The generated edit is stored beside the source as a shape reference. Pixels
in the final bubble come from the approved painting, preserving every glyph.
"""

from collections import deque
from pathlib import Path

from PIL import Image, ImageDraw, ImageFilter


ROOT = Path(__file__).resolve().parents[1]
SOURCE = ROOT / "assets/concepts/2026-09-30/upgrade-v22/bubble-source-crop.png"
OUTPUT = ROOT / "assets/runtime/upgrade-bubble-v25.png"


with Image.open(SOURCE) as original:
    source = original.convert("RGB")
    hsv = source.convert("HSV")
    width, height = source.size
    source_px = source.load()
    hsv_px = hsv.load()

    # Follow the cream interior, then extend far enough to include the navy
    # outline. The v23 limit ended in a vertical line at x=430.
    inside = Image.new("L", source.size)
    inside_px = inside.load()
    seen = bytearray(width * height)
    queue = deque([(200, 100)])
    while queue:
        x, y = queue.popleft()
        if x < 0 or y < 0 or x >= width or y >= height:
            continue
        index = y * width + x
        if seen[index]:
            continue
        seen[index] = 1
        _, saturation, value = hsv_px[x, y]
        if saturation > 100 or value < 185:
            continue
        inside_px[x, y] = 255
        queue.extend(((x - 1, y), (x + 1, y), (x, y - 1), (x, y + 1)))
    mask = inside.filter(ImageFilter.MaxFilter(21))

    # The generated repair confirms a smooth return from the tail tip toward
    # the upper-right edge. Keep this contour behind the foreground mascot.
    limit = Image.new("L", source.size)
    ImageDraw.Draw(limit).polygon(
        [(0, 0), (470, 0), (485, 63), (475, 127), (455, 145),
         (458, 160), (445, 168), (420, 174), (414, 194), (0, 205)], fill=255)
    mask = Image.composite(mask, Image.new("L", source.size), limit)
    mask_px = mask.load()
    for y in range(height):
        for x in range(width):
            red, green, blue = source_px[x, y]
            # Remove opaque yellow pixels and the occluding pink brain sliver
            # that were accidentally included by the old dilation.
            if red > 195 and green > 185 and blue < 125:
                mask_px[x, y] = 0
            elif x > 450 and red > green + 35 and blue > 120:
                mask_px[x, y] = 0
    mask = mask.filter(ImageFilter.GaussianBlur(.55))
    bubble = source.convert("RGBA")
    bubble.putalpha(mask)
    bubble.quantize(colors=192, method=Image.Quantize.FASTOCTREE,
                    dither=Image.Dither.NONE).save(OUTPUT, optimize=True)
    print(OUTPUT, OUTPUT.stat().st_size)
