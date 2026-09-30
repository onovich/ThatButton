/**
 * Visual handoff only. Draw the dynamic, open COMBO wordmark in the header gap.
 * Call after the level and score cards. No bitmap, Chinese hint or hit target.
 */
export function drawComboMark(ctx, {
  left, top, width, height, count, remainingMs, windowMs, pulse = 0
}) {
  if (!Number.isFinite(count) || count < 1 || width < 55) return;
  const number = String(Math.floor(count));
  const compact = width < 126;
  const numberSize = compact ? 27 : 35;
  const wordSize = compact ? 15 : 18;
  const numberFont = `italic 900 ${numberSize}px "Arial Black",Arial,sans-serif`;
  const wordFont = `italic 900 ${wordSize}px "Arial Black",Arial,sans-serif`;
  const word = 'COMBO!';

  ctx.save();
  ctx.font = numberFont;
  const numberWidth = ctx.measureText(number).width;
  ctx.font = wordFont;
  const wordWidth = ctx.measureText(word).width;
  const naturalWidth = numberWidth + wordWidth + 2;
  const scale = Math.min(1, (width - 8) / (naturalWidth * (1 + Math.min(.06, Math.max(0, pulse)))));
  const pulseScale = 1 + Math.min(.06, Math.max(0, pulse));
  const centerX = left + width / 2;
  const centerY = top + height / 2;
  ctx.translate(centerX, centerY);
  ctx.scale(scale * pulseScale, scale * pulseScale);
  ctx.rotate(-4 * Math.PI / 180);
  ctx.textBaseline = 'alphabetic';
  ctx.textAlign = 'left';
  ctx.lineJoin = 'round';

  const numberX = -naturalWidth / 2;
  const numberY = compact ? 8 : 10;
  const wordX = numberX + numberWidth + 2;
  const wordY = compact ? 3 : 4;

  // A narrow white sticker halo makes the lettering legible on the cream stage.
  ctx.font = numberFont;
  ctx.strokeStyle = '#fffdf8';
  ctx.lineWidth = compact ? 6 : 7;
  ctx.strokeText(number, numberX, numberY);
  ctx.strokeStyle = '#071944';
  ctx.lineWidth = compact ? 3 : 3.5;
  ctx.strokeText(number, numberX, numberY);
  ctx.fillStyle = '#ff9b13';
  ctx.fillText(number, numberX, numberY);

  ctx.font = wordFont;
  ctx.strokeStyle = '#fffdf8';
  ctx.lineWidth = compact ? 5 : 6;
  ctx.strokeText(word, wordX, wordY);
  ctx.strokeStyle = '#071944';
  ctx.lineWidth = compact ? 2.5 : 3;
  ctx.strokeText(word, wordX, wordY);
  ctx.fillStyle = '#ffe644';
  ctx.fillText(word, wordX, wordY);

  // This curved accent is the only continuation indicator. No tiny timer copy.
  const x1 = wordX + 1;
  const x2 = wordX + wordWidth - 2;
  const barY = compact ? 10 : 13;
  const point = (t) => ({
    x: x1 + (x2 - x1) * t,
    y: barY - 3.5 * Math.sin(Math.PI * t)
  });
  const strokeCurve = (fraction, color, lineWidth) => {
    ctx.beginPath();
    const start = point(0);
    ctx.moveTo(start.x, start.y);
    for (let step = 1; step <= 18; step++) {
      const t = fraction * step / 18;
      const p = point(t);
      ctx.lineTo(p.x, p.y);
    }
    ctx.strokeStyle = color;
    ctx.lineWidth = lineWidth;
    ctx.lineCap = 'round';
    ctx.stroke();
  };
  strokeCurve(1, '#071944', compact ? 5 : 6);
  strokeCurve(1, '#ffe34e', compact ? 3.2 : 4);
  const fraction = Number.isFinite(remainingMs) && Number.isFinite(windowMs) && windowMs > 0
    ? Math.max(0, Math.min(1, remainingMs / windowMs))
    : 1;
  if (fraction > 0) strokeCurve(fraction, '#f89915', compact ? 2.2 : 2.8);

  ctx.restore();
}
