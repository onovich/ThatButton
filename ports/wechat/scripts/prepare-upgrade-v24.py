"""Prepare the v24 upgrade character, painted accents, and full-height foliage.

The approved v22 page is the source for the accents and bottom border. The
character master is a transparent, anatomy-corrected edit of its upgrade pose.
"""

from pathlib import Path

from PIL import Image, ImageDraw, ImageFilter


ROOT = Path(__file__).resolve().parents[1]
SOURCE = ROOT / "assets/concepts/2026-09-30/upgrade-v22"
DEST = ROOT / "assets/runtime"


def save_indexed(image: Image.Image, filename: str, colors: int = 192) -> None:
    image.quantize(colors=colors, method=Image.Quantize.FASTOCTREE,
                   dither=Image.Dither.NONE).save(DEST / filename, optimize=True)
    print(filename, (DEST / filename).stat().st_size)


with Image.open(SOURCE / "upgrade-pair-v24-generated-master.png") as master:
    character = master.convert("RGBA")
    alpha = character.getchannel("A")
    bounds = alpha.point(lambda value: 255 if value > 8 else 0).getbbox()
    if bounds is None:
        raise ValueError("The upgrade character master has no visible pixels")
    character = character.crop(bounds)
    pad = 18
    padded = Image.new("RGBA", (character.width + pad * 2,
                                character.height + pad * 2))
    padded.alpha_composite(character, (pad, pad))
    character = padded.resize((760, round(padded.height * 760 / padded.width)),
                              Image.Resampling.LANCZOS)
    save_indexed(character, "upgrade-pair-v24.png", 192)


with Image.open(SOURCE / "upgrade-fullscreen-study.png") as source:
    source = source.convert("RGB")
    # These boxes contain only the white, tapered burst marks in the original.
    # Keep color samples from the painting and derive smooth alpha from whiteness.
    rays = Image.new("RGBA", (853, 650))
    alpha = Image.new("L", rays.size)
    allowed = Image.new("L", rays.size)
    draw = ImageDraw.Draw(allowed)
    for box in [(145, 110, 216, 198), (0, 247, 100, 415),
                (760, 238, 853, 373), (520, 354, 609, 444)]:
        draw.rectangle(box, fill=255)
    src = source.crop((0, 0, 853, 650))
    src_px = src.load()
    allow_px = allowed.load()
    a_px = alpha.load()
    for y in range(650):
        for x in range(853):
            if not allow_px[x, y]:
                continue
            red, green, blue = src_px[x, y]
            chroma = max(red, green, blue) - min(red, green, blue)
            # Yellow backdrop has high chroma; the painted marks are neutral.
            a_px[x, y] = max(0, min(255, int((38 - chroma) * 10))) \
                if min(red, green, blue) > 220 else 0
    # The boxes also graze the title's pale outer rim. Retain the seven large
    # ray shapes while discarding those narrow disconnected outline fragments.
    seen = bytearray(853 * 650)
    keep = Image.new("L", rays.size)
    keep_px = keep.load()
    for y in range(650):
        for x in range(853):
            index = y * 853 + x
            if seen[index] or a_px[x, y] < 128:
                continue
            queue = [(x, y)]
            seen[index] = 1
            component = []
            while queue:
                cx, cy = queue.pop()
                component.append((cx, cy))
                for nx, ny in ((cx - 1, cy), (cx + 1, cy),
                               (cx, cy - 1), (cx, cy + 1)):
                    if nx < 0 or ny < 0 or nx >= 853 or ny >= 650:
                        continue
                    ni = ny * 853 + nx
                    if not seen[ni] and a_px[nx, ny] >= 128:
                        seen[ni] = 1
                        queue.append((nx, ny))
            if len(component) > 800:
                for cx, cy in component:
                    keep_px[cx, cy] = 255
    keep = keep.filter(ImageFilter.MaxFilter(5))
    alpha = Image.composite(alpha, Image.new("L", rays.size), keep)
    alpha = alpha.filter(ImageFilter.GaussianBlur(.35))
    rays.paste(src, (0, 0))
    rays.putalpha(alpha)
    save_indexed(rays, "upgrade-rays-v24.png", 64)

    # Select the original green/teal foliage and its white rim by color, so
    # the top stays irregular instead of forming a cropped horizontal seam.
    foliage = source.crop((0, 1580, 853, 1844)).convert("RGBA")
    green = Image.new("L", foliage.size)
    green_px = green.load()
    foliage_px = foliage.load()
    for y in range(foliage.height):
        for x in range(foliage.width):
            red, g, blue, _ = foliage_px[x, y]
            if y + 1580 >= 1690 and g > red + 12 and g > 85:
                green_px[x, y] = 255
    green = green.filter(ImageFilter.MaxFilter(31))
    green = green.filter(ImageFilter.GaussianBlur(.8))
    foliage.putalpha(green)
    save_indexed(foliage, "upgrade-foliage-v24.png", 160)

    with Image.open(DEST / "sunny-stage.jpg") as stage_source:
        # Use the whole stage width so the side clouds are no longer cropped.
        # Isolate cloud regions over a clean yellow gradient; the home-page
        # navy/white bursts and high foliage must not leak into this screen.
        stage = stage_source.convert("RGB").resize((853, 1844),
                                                    Image.Resampling.LANCZOS)
        background = Image.new("RGBA", stage.size)
        background_draw = ImageDraw.Draw(background)
        for y in range(1844):
            sample = stage.getpixel((425, min(y, 1200)))
            background_draw.line((0, y, 853, y), fill=(*sample, 255))
        cloud_regions = [(0, 0, 235, 305), (570, 0, 853, 280),
                         (590, 375, 790, 510), (0, 505, 165, 730),
                         (680, 565, 853, 780), (0, 1070, 290, 1320),
                         (585, 1170, 853, 1390)]
        allowed_cloud = Image.new("L", stage.size)
        allowed_draw = ImageDraw.Draw(allowed_cloud)
        for region in cloud_regions:
            allowed_draw.rectangle(region, fill=255)
        cloud_alpha = Image.new("L", stage.size)
        stage_px = stage.load()
        allowed_px = allowed_cloud.load()
        alpha_px = cloud_alpha.load()
        for y in range(1390):
            for x in range(853):
                if not allowed_px[x, y]:
                    continue
                red, green_value, blue = stage_px[x, y]
                if red > 165 and green_value > 155:
                    alpha_px[x, y] = max(0, min(255, (blue - 75) * 4))
        cloud_alpha = cloud_alpha.filter(ImageFilter.GaussianBlur(.6))
        clouds = stage.convert("RGBA")
        clouds.putalpha(cloud_alpha)
        background.alpha_composite(clouds)
        background.alpha_composite(foliage, (0, 1580))
        background.convert("RGB").save(DEST / "upgrade-background-v24.jpg", quality=82,
                   optimize=True, subsampling=1)
        print("upgrade-background-v24.jpg",
              (DEST / "upgrade-background-v24.jpg").stat().st_size)


with Image.open(DEST / "combo-wordmark-v17.png") as combo:
    # The wordmark is displayed at a small fraction of its 1774px source width.
    # Indexed PNG preserves its phone-size appearance and frees main-package room.
    save_indexed(combo.convert("RGBA"), "combo-wordmark-v24.png", 256)
