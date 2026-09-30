/** Draw the approved READY / 1 HIT! stickers between level and score. */
export function drawPreCombo(ctx, { left, top, width, height, stage,
  readyImage = null, hitImage = null }) {
  if (stage >= 2 || width < 70) return;
  const mark = stage === 1 ? hitImage : readyImage;
  if (mark?.width > 0 && mark?.height > 0 && ctx.drawImage) {
    const artH = Math.min(height, (width - 2) * mark.height / mark.width);
    const artW = artH * mark.width / mark.height;
    const x = left + (width - artW) / 2;
    const y = top + (height - artH) / 2;
    ctx.drawImage(mark, x, y, artW, artH);

    return;
  }

  // Keep the game legible if an image fails to decode on a device.
  ctx.font = '900 16px Arial,sans-serif';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillStyle = '#071944';
  ctx.fillText(stage === 1 ? '1 HIT!' : 'READY', left + width / 2, top + height / 2);
}
