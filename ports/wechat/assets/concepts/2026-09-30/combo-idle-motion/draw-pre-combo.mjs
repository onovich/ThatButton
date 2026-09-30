/**
 * Concept-only pre-combo marks between the level and score cards.
 * Stages 0 and 1 use transparent art derived from the complete game screen.
 * Stage 2+ delegates to the accepted v17 COMBO! renderer.
 */
export function drawPreCombo(ctx, {
  left, top, width, height, stage, remainingPercent = 0, readyImage, hitImage
}) {
  if (stage >= 2 || width < 70) return;
  const mark = stage <= 0 ? readyImage : hitImage;
  if (!mark?.naturalWidth) return;
  const drawHeight = Math.min(height, (width - 2) * mark.naturalHeight / mark.naturalWidth);
  const drawWidth = drawHeight * mark.naturalWidth / mark.naturalHeight;
  const x = left + (width - drawWidth) / 2;
  const y = top + (height - drawHeight) / 2;
  ctx.drawImage(mark, x, y, drawWidth, drawHeight);

  if (stage === 1 && remainingPercent > 0) {
    // Keep the original continuation cue inside the illustrated gold swoosh.
    const progress = Math.min(1, Math.max(0, remainingPercent / 100));
    const startX = x + drawWidth * .33;
    const span = drawWidth * .42 * progress;
    ctx.save();
    ctx.beginPath();
    for (let i = 0; i <= 18; i++) {
      const t = i / 18;
      const px = startX + span * t;
      const py = y + drawHeight * (.83 - .027 * Math.sin(Math.PI * t));
      if (i === 0) ctx.moveTo(px, py);
      else ctx.lineTo(px, py);
    }
    ctx.strokeStyle = '#ec7623';
    ctx.lineWidth = Math.max(1.2, drawHeight * .055);
    ctx.lineCap = 'round';
    ctx.stroke();
    ctx.restore();
  }
}
