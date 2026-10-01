import { TEXT_ATLAS } from './text-atlas-manifest.js';

// One immutable prebuilt image (under 3 MiB decoded), no text surfaces or history.
export function createTextAtlas({ rules = false, numbers = false } = {}) {
  let image = null;
  let failed = false;
  return {
    get rules() { return rules; },
    get numbers() { return numbers; },
    setOptions(options) { rules = Boolean(options.rules); numbers = Boolean(options.numbers); },
    setImage(value) {
      failed = false;
      image = value?.width === TEXT_ATLAS.width && value?.height === TEXT_ATLAS.height ? value : null;
    },
    canDraw(value, color) {
      if (!image || failed || !TEXT_ATLAS.glyphs[color]) return false;
      for (const char of String(value)) if (!TEXT_ATLAS.glyphs[color][char]) return false;
      return true;
    },
    drawGlyph(ctx, glyph, x, y, size, color) {
      const cell = TEXT_ATLAS.glyphs[color]?.[glyph];
      if (!image || failed || !cell || !ctx.drawImage) return false;
      const scale = size / TEXT_ATLAS.sourceEm;
      try {
        ctx.drawImage(image, cell.x, cell.y, TEXT_ATLAS.cellWidth, TEXT_ATLAS.cellHeight,
          x - TEXT_ATLAS.originX * scale, y - TEXT_ATLAS.originY * scale,
          TEXT_ATLAS.cellWidth * scale, TEXT_ATLAS.cellHeight * scale);
        return true;
      } catch { failed = true; return false; }
    },
    status() { return { rules, numbers, loaded: Boolean(image), failed,
      decodedBytes: image ? TEXT_ATLAS.decodedBytes : 0, version: TEXT_ATLAS.version }; }
  };
}
