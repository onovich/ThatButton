"""Build illustrated numeral sprites for the HIT!/COMBO! header family."""

from pathlib import Path
from PIL import Image, ImageChops, ImageDraw, ImageFilter, ImageFont


ROOT = Path(__file__).resolve().parents[1]
FONT = Path(r"C:\Windows\Fonts\ariblk.ttf")
OUTPUT = ROOT / "assets/runtime/combo-digits-v25.png"
CELL_W, CELL_H = 96, 120
SCALE = 2


def color_layer(mask: Image.Image, color: tuple[int, int, int]) -> Image.Image:
    image = Image.new("RGBA", mask.size, (*color, 0))
    image.putalpha(mask)
    return image


def digit_image(digit: int) -> Image.Image:
    canvas_size = (CELL_W * SCALE, CELL_H * SCALE)
    font = ImageFont.truetype(str(FONT), 165)
    mask = Image.new("L", canvas_size)
    draw = ImageDraw.Draw(mask)
    text = str(digit)
    box = draw.textbbox((0, 0), text, font=font)
    x = (canvas_size[0] - (box[2] - box[0])) // 2 - box[0]
    y = (canvas_size[1] - (box[3] - box[1])) // 2 - box[1] - 6
    draw.text((x, y), text, font=font, fill=255)
    mask = mask.rotate(-7, resample=Image.Resampling.BICUBIC, expand=False)

    bevel = Image.new("L", canvas_size)
    bevel.paste(mask, (0, 10))
    shape = ImageChops.lighter(mask, bevel)
    white_rim = shape.filter(ImageFilter.MaxFilter(31))
    navy_rim = shape.filter(ImageFilter.MaxFilter(23))
    orange_rim = shape.filter(ImageFilter.MaxFilter(7))

    art = Image.new("RGBA", canvas_size)
    art.alpha_composite(color_layer(white_rim, (255, 253, 246)))
    art.alpha_composite(color_layer(navy_rim, (7, 25, 68)))
    art.alpha_composite(color_layer(orange_rim, (255, 112, 15)))
    art.alpha_composite(color_layer(bevel, (255, 78, 9)))

    face = Image.new("RGBA", canvas_size)
    pixels = face.load()
    for row in range(canvas_size[1]):
        t = min(1, max(0, (row - 44) / 155))
        color = (
            round(255),
            round(246 - 72 * t),
            round(46 - 46 * t),
            255,
        )
        for col in range(canvas_size[0]):
            pixels[col, row] = color
    face.putalpha(mask)
    art.alpha_composite(face)

    # A narrow light catch gives each number the same glossy face as 1 HIT!.
    highlight = Image.new("L", canvas_size)
    ImageDraw.Draw(highlight).rounded_rectangle((28, 38, canvas_size[0] - 28, 67), radius=14, fill=90)
    highlight = ImageChops.multiply(highlight, mask)
    art.alpha_composite(color_layer(highlight, (255, 255, 230)))
    return art.resize((CELL_W, CELL_H), Image.Resampling.LANCZOS)


atlas = Image.new("RGBA", (CELL_W * 10, CELL_H))
for value in range(10):
    atlas.alpha_composite(digit_image(value), (value * CELL_W, 0))
atlas.save(OUTPUT, optimize=True)
print(f"{OUTPUT}: {atlas.width}x{atlas.height}, {OUTPUT.stat().st_size} bytes")
