import { drawPreCombo } from './pre-combo.js';
import { CHARACTER_FRAMES } from './character-frames.js';
import { swapRect, rectsOverlap, slicePixels, WECHAT_HAZARDS } from './hazards.js';
import { createTextAtlas } from './text-atlas.js';

const C = {
  navy: '#071944', yellow: '#ffe343', paper: '#fffdf4', cyan: '#04c8d9',
  pink: '#ef668e', red: '#ed1c39', blue: '#087ddd', purple: '#7e3dd7'
};
const TILES = {
  red: ['#ffb0b3', '#ff5163', '#f91e3e', '#bb0b2b', '#9b0e2c'],
  blue: ['#b4f5ff', '#36bafa', '#0081e8', '#075ab3', '#064c98'],
  yellow: ['#fff9bd', '#ffec61', '#ffd00d', '#eaa300', '#a97302'],
  purple: ['#eed1ff', '#bb79fa', '#8342e7', '#5a25b0', '#512391']
};
const UPGRADES = {
  'chain-span-plus': {
    symbol: '↗', title: '连击接续更久', value: 500,
    description: (value) => `接续时间 +${(value / 1000).toFixed(1)} 秒`,
    face: '#ffe76b', side: '#d9a400'
  },
  'max-hp-plus': {
    symbol: '♥', title: '体力上限提升', value: 24,
    description: (value) => `上限 +${value}，当前体力 +${value}`,
    face: '#ffacc9', side: '#e55d89'
  },
  'round-time-plus': {
    symbol: '◷', title: '每轮时间更长', value: 1200,
    description: (value) => `时间上限 +${(value / 1000).toFixed(1)} 秒`,
    face: '#9af1f7', side: '#09b9cb'
  },
  'base-attack-plus': {
    symbol: '✦', title: '清轮进度加成', value: 4,
    description: (value) => `每次清轮，挑战进度额外 +${value}`,
    face: '#d8b6ff', side: '#9251d7'
  }
};
const UPGRADE_CARD_ART = {
  'chain-span-plus': 'upgradeChain',
  'max-hp-plus': 'upgradeHp',
  'round-time-plus': 'upgradeTime',
  'base-attack-plus': 'upgradeProgress'
};
// Visible alpha bounds within each 128 px cell of the illustrated v29 atlas.
const COMBO_DIGIT_BOUNDS = [
  [11, 116], [22, 106], [11, 115], [11, 117], [11, 116],
  [13, 115], [11, 116], [14, 115], [11, 117], [13, 115]
];
const RESULT_SCORE_DIGIT_BOUNDS = [
  [5, 97], [19, 85], [7, 97], [7, 95], [4, 100],
  [5, 99], [6, 96], [6, 97], [6, 98], [6, 97]
];
const RESULT_FONT = '"SimHei","Microsoft YaHei",sans-serif';
const clamp = (n, a, b) => Math.max(a, Math.min(b, n));
const within = (r, x, y) => x >= r.x && y >= r.y && x <= r.x + r.w && y <= r.y + r.h;
const clamp01 = (value) => clamp(value, 0, 1);
const easeOutCubic = (value) => 1 - (1 - clamp01(value)) ** 3;
const easeOutBack = (value) => {
  const t = clamp01(value) - 1;
  return 1 + 2.70158 * t ** 3 + 1.70158 * t ** 2;
};
const lerp = (from, to, progress) => from + (to - from) * progress;

export function createCanvasRenderer({ canvas, info, menuButtonRect = null, motionEnabled = true,
  diagnostics = null,
  textAtlasOptions = {},
  createSurface = () => typeof document !== 'undefined' ? document.createElement('canvas') : null }) {
  const width = Math.max(280, info.windowWidth || info.screenWidth || 390);
  const height = Math.max(480, info.windowHeight || info.screenHeight || 844);
  const ratio = clamp(info.pixelRatio || 1, 1, 3);
  const safeTop = Math.max(10, info.safeArea?.top || 0, menuButtonRect?.bottom ? menuButtonRect.bottom + 5 : 0);
  const safeBottom = Math.max(10, height - (info.safeArea?.bottom || height));
  canvas.width = Math.round(width * ratio);
  canvas.height = Math.round(height * ratio);
  let ctx = canvas.getContext('2d');
  const glitchCache = new Map();
  const textWidths = new Map();
  const textAtlas = createTextAtlas(textAtlasOptions);
  let batchDepth = 0, drawPending = false, drawRevision = 0;
  function measuredWidth(value) {
    const text = String(value);
    const key = `${ctx.font}:${ctx.textAlign}:${ctx.direction}:${text}`;
    if (textWidths.has(key)) return textWidths.get(key);
    const width = ctx.measureText(text).width;
    if (textWidths.size >= 1024) textWidths.clear();
    textWidths.set(key, width);
    return width;
  }
  function batch(callback) {
    batchDepth++;
    try { return callback(); }
    finally {
      batchDepth--;
      if (!batchDepth && drawPending) { drawPending = false; draw(); }
    }
  }
  let blockedTileRects = [];
  function drawGlitchTile(button, rect, hazard) {
    if (!createSurface || !ctx.drawImage) return false;
    const stamp = Math.floor(hazard.elapsedMs / 100);
    const key = `${stamp}:${rect.w}:${rect.h}:${button.color?.id}:${button.shape?.id}:${button.number}`;
    let cached = glitchCache.get(button.id);
    if (cached?.key !== key) {
      let surface;
      try { surface = cached?.surface || createSurface(); } catch { return false; }
      if (!surface || surface === canvas) return false;
      const sw = Math.ceil(rect.w)+4, sh = Math.ceil(rect.h)+12;
      if (surface.width !== sw) surface.width = sw;
      if (surface.height !== sh) surface.height = sh;
      const local = surface.getContext('2d');
      if (!local?.getImageData || !local?.putImageData) return false;
      const screen = ctx;
      try {
        local.clearRect(0,0,surface.width,surface.height);
        ctx = local; drawTile(button, {x:2,y:2,w:rect.w,h:rect.h});
        const pixels = local.getImageData(0,0,surface.width,surface.height);
        diagnostics?.count('glitchReadback');
        const output = cached?.output?.length === pixels.data.length
          ? cached.output : new Uint8ClampedArray(pixels.data.length);
        slicePixels(pixels.data,surface.width,surface.height,hazard.elapsedMs/1000,undefined,output);
        pixels.data.set(output);
        cached = { output };
        local.putImageData(pixels,0,0);
      } catch { return false; } finally { ctx = screen; }
      cached = {...cached,key,surface};glitchCache.set(button.id,cached);
      diagnostics?.count('glitchRebuild');
    }
    ctx.drawImage(cached.surface,rect.x-2,rect.y-2,rect.w+4,rect.h+12);
    return true;
  }
  if (ctx.setTransform) ctx.setTransform(ratio, 0, 0, ratio, 0, 0);
  else ctx.scale(ratio, ratio);

  const view = {
    mode: 'loading', board: null, combat: null, hazards: null, score: 0,
    timeLeft: 0, timeLimit: 1, comboWindow: null, bestRecord: null,
    bestNote: '', upgradeChoices: [], recap: null, isTimeout: false,
    comboPulseUntil: 0, settings: { sound: true, music: true, musicVolume: 2,
      vibration: true, vibrationAvailable: true },
    images: {}, failedAssets: [], warning: false, upgradeLocked: false, recordSaveFailed: false,
    selectedUpgradeId: null, lastPressedId: null, wrongButtonId: null, wrongUntil: 0
  };
  let hits = [];
  const canAnimate = Boolean(motionEnabled && ctx.save && ctx.restore && ctx.translate && ctx.scale);
  const motion = {
    sceneStartedAt: Date.now(), activeUntil: 0, paused: false, timer: null,
    tilePressAt: new Map(), tileSuccessAt: new Map(),
    shakeStartedAt: 0, shakeUntil: 0, shakeStrength: 0,
    scoreTween: null, hpTween: null, progressTween: null,
    scorePulseAt: 0, healthPulseAt: 0, progressPulseAt: 0,
    actionTap: null, toggleAt: 0, toggleKey: null, upgradeSelectAt: 0,
    preComboPulseUntil: 0, comboExit: null,
    gameCharacterStartedAt: 0, roundExit: null, roundEnter: null
  };

  function tweenValue(tween, fallback, now = Date.now()) {
    if (!canAnimate || !tween) return fallback;
    return lerp(tween.from, tween.to, easeOutCubic((now - tween.startedAt) / tween.duration));
  }
  function startTween(previous, next, duration = 380) {
    if (!canAnimate || previous === next) return null;
    return { from: previous, to: next, startedAt: Date.now(), duration };
  }
  function scheduleMotion() {
    if (!canAnimate || motion.paused || motion.timer) return;
    const now = Date.now();
    const ambient = ['home', 'gameover', 'upgrade', 'resume'].includes(view.mode);
    const active = now < motion.activeUntil;
    if (!ambient && !active) return;
    const scheduledRevision = drawRevision;
    motion.timer = setTimeout(() => {
      motion.timer = null;
      if (!motion.paused) {
        if (view.mode !== 'game' || scheduledRevision === drawRevision) draw();
        else scheduleMotion();
      }
    }, active ? 32 : 85);
    motion.timer.unref?.();
  }
  function animateFor(duration) {
    if (!canAnimate) return;
    motion.activeUntil = Math.max(motion.activeUntil, Date.now() + duration);
    scheduleMotion();
  }
  function enterScene(mode, duration = 480) {
    view.mode = mode;
    motion.sceneStartedAt = Date.now();
    animateFor(duration);
    draw();
  }
  function sceneProgress(delay = 0, duration = 420) {
    if (!canAnimate) return 1;
    return clamp01((Date.now() - motion.sceneStartedAt - delay) / duration);
  }
  function visual(rect, scale, alpha, paint, offsetX = 0, offsetY = 0) {
    if (!canAnimate) { paint(); return; }
    ctx.save();
    ctx.globalAlpha *= clamp01(alpha);
    const cx = rect.x + rect.w / 2, cy = rect.y + rect.h / 2;
    ctx.translate(cx + offsetX, cy + offsetY);
    ctx.scale(scale, scale);
    ctx.translate(-cx, -cy);
    paint();
    ctx.restore();
  }
  function shake(strength, duration) {
    if (!canAnimate) return;
    const now = Date.now();
    motion.shakeStrength = now >= motion.shakeUntil ? strength :
      Math.max(motion.shakeStrength, strength);
    motion.shakeStartedAt = now;
    motion.shakeUntil = motion.shakeStartedAt + duration;
    animateFor(duration);
  }
  function cameraOffset() {
    const now = Date.now();
    if (!canAnimate || now >= motion.shakeUntil) return { x: 0, y: 0 };
    const t = clamp01((now - motion.shakeStartedAt) /
      (motion.shakeUntil - motion.shakeStartedAt));
    const decay = (1 - t) ** 2 * motion.shakeStrength;
    return { x: Math.sin(t * 49) * decay, y: Math.cos(t * 37) * decay * .55 };
  }

  function path(x, y, w, h, r = 0) {
    const radius = Math.min(r, w / 2, h / 2);
    ctx.beginPath();
    ctx.moveTo(x + radius, y);
    ctx.lineTo(x + w - radius, y);
    ctx.quadraticCurveTo(x + w, y, x + w, y + radius);
    ctx.lineTo(x + w, y + h - radius);
    ctx.quadraticCurveTo(x + w, y + h, x + w - radius, y + h);
    ctx.lineTo(x + radius, y + h);
    ctx.quadraticCurveTo(x, y + h, x, y + h - radius);
    ctx.lineTo(x, y + radius);
    ctx.quadraticCurveTo(x, y, x + radius, y);
    ctx.closePath();
  }
  function box(x, y, w, h, fill = '#fff', stroke = C.navy, r = 12, line = 2, shadow = null) {
    if (shadow) {
      path(x, y + shadow.dy, w, h, r);
      ctx.fillStyle = shadow.color;
      ctx.fill();
    }
    path(x, y, w, h, r);
    ctx.fillStyle = fill;
    ctx.fill();
    if (stroke) {
      ctx.strokeStyle = stroke;
      ctx.lineWidth = line;
      ctx.stroke();
    }
  }
  function label(value, x, y, size = 14, color = C.navy, align = 'left', weight = 700,
    outline = null, family = '"Microsoft YaHei",sans-serif') {
    ctx.font = `${weight} ${size}px ${family}`;
    ctx.textAlign = align;
    ctx.textBaseline = 'middle';
    if (outline && ctx.strokeText) {
      ctx.lineJoin = 'round';
      ctx.lineWidth = outline.width;
      ctx.strokeStyle = outline.color;
      ctx.strokeText(String(value), x, y);
    }
    ctx.fillStyle = color;
    ctx.fillText(String(value), x, y);
    diagnostics?.count('fillText');
  }
  function textWidth(value, size, weight = 900, family = '"Microsoft YaHei",sans-serif') {
    ctx.font = `${weight} ${size}px ${family}`;
    return measuredWidth(String(value));
  }
  function fittedTextSize(value, maxSize, minSize, maxWidth, weight = 900,
    family = '"Microsoft YaHei",sans-serif') {
    let size = maxSize;
    while (size > minSize && textWidth(value, size, weight, family) > maxWidth) size -= .5;
    return Math.max(minSize, size);
  }
  function scoreBadge(rect, value, compact) {
    const digits = String(Math.max(0, Math.floor(Number(value) || 0)));
    const displayValue = String(Math.round(tweenValue(motion.scoreTween, Number(value))));
    let fontSize = Math.min(compact ? 27 : 33,
      digits.length > 4 ? (compact ? 18 : 23) : digits.length > 3 ? (compact ? 22 : 28) : 99);
    const unitSize = compact ? 11 : 12;
    ctx.font = `800 ${unitSize}px "Microsoft YaHei",sans-serif`;
    const unitWidth = measuredWidth('分');
    const gap = compact ? 2 : 3;
    ctx.font = `900 ${fontSize}px "Microsoft YaHei",sans-serif`;
    while (fontSize > 13 && Math.max(measuredWidth(digits),
      measuredWidth(displayValue)) + gap + unitWidth > rect.w - 10) {
      fontSize--;
      ctx.font = `900 ${fontSize}px "Microsoft YaHei",sans-serif`;
    }
    const numberWidth = measuredWidth(displayValue);
    const startX = rect.x + (rect.w - numberWidth - gap - unitWidth) / 2;
    // Canvas middle baseline sits optically high for these heavy digits.
    const numberY = rect.y + rect.h / 2 + 3;
    const pulse = clamp01((Date.now() - motion.scorePulseAt) / 350);
    const scale = motion.scorePulseAt && pulse < 1 ? 1 + .10 * (1 - pulse) * Math.sin(Math.PI * pulse) : 1;
    visual(rect, scale, 1, () => {
      label(displayValue, startX, numberY, fontSize, C.navy, 'left', 900);
      label('分', startX + numberWidth + gap,
        numberY + (compact ? 4 : 5), unitSize, C.navy, 'left', 800);
    });
  }
  function comboPair(count, slotX, slotY, slotW, slotH, compact) {
    const value = String(count);
    const digitAtlas = view.images.comboDigits;
    const wordmark = view.images.comboWordmark;
    if (digitAtlas?.width >= 1280 && digitAtlas?.height >= 136 &&
        wordmark?.width > 0 && wordmark?.height > 0 && ctx.drawImage && /^\d+$/.test(value)) {
      const many = value.length > 1;
      const digitH = many ? (compact ? 32 : 35) : (compact ? 40 : 44);
      const wordH = many ? (compact ? 29 : 33) : (compact ? 32 : 36);
      const glyphs = [...value].map((char) => {
        const digit = Number(char);
        const [left, right] = COMBO_DIGIT_BOUNDS[digit];
        return { digit, left, sourceW: right - left,
          width: digitH * (right - left) / 136 };
      });
      const gap = many ? -digitH * .08 : 0;
      const digitW = glyphs.reduce((sum, glyph) => sum + glyph.width, 0) +
        gap * (glyphs.length - 1);
      const join = -2;
      const wordW = wordH * wordmark.width / wordmark.height;
      const totalW = digitW + join + wordW;
      const scale = Math.min(1, (slotW - 4) / totalW);
      const centerY = slotY + slotH / 2;
      let drawX = slotX + (slotW - totalW * scale) / 2;
      for (const glyph of glyphs) {
        ctx.drawImage(digitAtlas, glyph.digit * 128 + glyph.left, 0,
          glyph.sourceW, 136, drawX, centerY - digitH * scale / 2,
          glyph.width * scale, digitH * scale);
        drawX += (glyph.width + gap) * scale;
      }
      ctx.drawImage(wordmark,
        slotX + (slotW - totalW * scale) / 2 + (digitW + join) * scale,
        centerY - wordH * scale / 2, wordW * scale, wordH * scale);
      return true;
    }
    label(`${value} COMBO!`, slotX + slotW / 2, slotY + slotH / 2,
      compact ? 17 : 22, C.yellow, 'center', 900, { width: 3, color: C.navy });
    return false;
  }
  function maxSticker(slotX, slotY, slotW, slotH, compact) {
    const mark = view.images.maxWordmark;
    if (mark?.width > 0 && mark?.height > 0) {
      const w = Math.min(compact ? 102 : 132, slotW - 4,
        slotH * mark.width / mark.height);
      const h = w * mark.height / mark.width;
      return drawArt('maxWordmark', slotX + (slotW - w) / 2,
        slotY + (slotH - h) / 2, w, h);
    }
    label('MAX!', slotX + slotW / 2, slotY + slotH / 2,
      compact ? 18 : 23, C.yellow, 'center', 900, { width: 3, color: C.navy });
    return false;
  }
  function gradient(x, y, h, top, bottom) {
    if (!ctx.createLinearGradient) return top;
    const fill = ctx.createLinearGradient(x, y, x, y + h);
    fill.addColorStop(0, top);
    fill.addColorStop(1, bottom);
    return fill;
  }
  function action(text, rect, type, style = 'primary', extra = {}) {
    const primary = style === 'primary';
    const resultSecondary = style === 'result-secondary';
    const raised = primary || resultSecondary;
    let fill = '#fffdf4';
    if (primary && ctx.createLinearGradient) {
      fill = ctx.createLinearGradient(rect.x, rect.y, rect.x, rect.y + rect.h);
      for (const [stop, color] of [[0, '#b3ffff'], [.14, '#35ebec'], [.48, '#00d4df'], [1, '#00a9d2']]) {
        fill.addColorStop(stop, color);
      }
    } else if (primary) fill = '#25dce4';
    if (resultSecondary && ctx.createLinearGradient) {
      fill = ctx.createLinearGradient(rect.x, rect.y, rect.x, rect.y + rect.h);
      for (const [stop, color] of [[0, '#fffce1'], [.18, '#fff4ad'], [.65, '#ffe276'], [1, '#f5c34c']]) {
        fill.addColorStop(stop, color);
      }
    } else if (resultSecondary) fill = '#ffe78b';
    const intro = sceneProgress(60, 410);
    const enterScale = lerp(.90, 1, easeOutBack(intro));
    const tapAge = motion.actionTap?.type === type ? Date.now() - motion.actionTap.at : Infinity;
    const tapScale = tapAge < 280 ?
      (tapAge < 90 ? lerp(1, .92, tapAge / 90) :
        lerp(.92, 1, easeOutBack((tapAge - 90) / 190))) : 1;
    visual(rect, enterScale * tapScale, lerp(.35, 1, easeOutCubic(intro)), () => {
      if (raised) box(rect.x, rect.y + 7, rect.w, rect.h,
        primary ? '#087b9b' : '#d58f1f', C.navy, 19, 3);
      box(rect.x, rect.y, rect.w, rect.h, fill,
        C.navy, raised ? 19 : 12, raised ? 3 : 2);
      if (raised) {
        path(rect.x + 15, rect.y + 7, rect.w - 30, 10, 5);
        ctx.fillStyle = primary ? '#ffffff75' : '#ffffffa3';
        ctx.fill();
      }
      label(text, rect.x + rect.w / 2, rect.y + rect.h / 2,
        extra.fontSize || (primary ? 20 : resultSecondary ? 19 : 14),
        primary ? '#fff' : C.navy, 'center', 900, primary ? { width: 2, color: C.navy } : null);
    });
    hits.push({ rect, action: { type, ...extra } });
  }
  function resultAction(text, rect, type, imageKey, fallbackStyle) {
    if (!view.images[imageKey] || !ctx.drawImage) {
      action(text, rect, type, fallbackStyle);
      return;
    }
    const intro = sceneProgress(60, 410);
    const tapAge = motion.actionTap?.type === type ? Date.now() - motion.actionTap.at : Infinity;
    const tapScale = tapAge < 280 ?
      (tapAge < 90 ? lerp(1, .92, tapAge / 90) :
        lerp(.92, 1, easeOutBack((tapAge - 90) / 190))) : 1;
    visual(rect, lerp(.9, 1, easeOutBack(intro)) * tapScale,
      lerp(.35, 1, easeOutCubic(intro)), () => {
        drawArt(imageKey, rect.x, rect.y, rect.w, rect.h);
      });
    hits.push({ rect, action: { type } });
  }
  function resultScoreArt(value, centerX, top, targetH, maxWidth) {
    const atlas = view.images.resultScoreDigits;
    const fen = view.images.resultScoreFen;
    const digits = String(Math.max(0, Math.floor(Number(value) || 0)));
    if (atlas?.width < 1040 || !fen?.width || !ctx.drawImage) {
      const text = `${digits} 分`;
      label(text, centerX, top + targetH / 2,
        fittedTextSize(text, targetH, 18, maxWidth, 900, RESULT_FONT),
        '#d92343', 'center', 900, null, RESULT_FONT);
      return { left: centerX - maxWidth / 2, right: centerX + maxWidth / 2 };
    }
    const pieces = [...digits].map(char => {
      const digit = Number(char);
      const [left, right] = RESULT_SCORE_DIGIT_BOUNDS[digit];
      return { digit, left, sourceW: right - left,
        width: targetH * (right - left) / 112 };
    });
    const gap = -targetH * .045;
    const fenH = targetH * .9;
    const fenW = fenH * fen.width / fen.height;
    const digitW = pieces.reduce((sum, part) => sum + part.width, 0) +
      gap * Math.max(0, pieces.length - 1);
    const totalW = digitW + targetH * .025 + fenW;
    const scale = Math.min(1, maxWidth / totalW);
    let x = centerX - totalW * scale / 2;
    for (const part of pieces) {
      ctx.drawImage(atlas, part.digit * 104 + part.left, 0,
        part.sourceW, 112, x, top + targetH * (1 - scale) / 2,
        part.width * scale, targetH * scale);
      x += (part.width + gap) * scale;
    }
    const fenX = centerX - totalW * scale / 2 +
      (digitW + targetH * .025) * scale;
    ctx.drawImage(fen, fenX, top + (targetH - fenH * scale) / 2,
      fenW * scale, fenH * scale);
    return { left: centerX - totalW * scale / 2,
      right: centerX + totalW * scale / 2 };
  }
  function pill(text, rect, type = null) {
    box(rect.x, rect.y, rect.w, rect.h, '#fff9bd', C.navy, 11, 2, { dy: 2, color: '#c1a83d' });
    label(text, rect.x + rect.w / 2, rect.y + rect.h / 2, 13, C.navy, 'center', 900);
    if (type) hits.push({ rect, action: { type } });
  }
  function artPill(text, rect, angle, fontSize, textColor, colors, shadowColor) {
    const intro = sceneProgress(85, 420);
    visual(rect, lerp(.87, 1, easeOutBack(intro)), easeOutCubic(intro), () => {
      const turned = ctx.save && ctx.translate && ctx.rotate && ctx.restore;
      if (turned) {
        ctx.save();
        ctx.translate(rect.x + rect.w / 2, rect.y + rect.h / 2);
        ctx.rotate(angle * Math.PI / 180);
      }
      const x = turned ? -rect.w / 2 : rect.x;
      const y = turned ? -rect.h / 2 : rect.y;
      box(x, y, rect.w, rect.h, gradient(x, y, rect.h, colors[0], colors[1]),
        C.navy, rect.h / 2, 3, { dy: 3, color: shadowColor });
      label(text, x + rect.w / 2, y + rect.h / 2, fontSize, textColor, 'center', 900);
      if (turned) ctx.restore();
    });
  }
  function fillBar(rect, value, max, fill, base) {
    box(rect.x, rect.y, rect.w, rect.h, base, C.navy, rect.h / 2, 2);
    const inner = clamp((max > 0 ? value / max : 0), 0, 1) * (rect.w - 4);
    if (inner > 1) {
      path(rect.x + 2, rect.y + 2, inner, rect.h - 4, (rect.h - 4) / 2);
      ctx.fillStyle = fill;
      ctx.fill();
    }
  }
  function wrap(textValue, maxWidth, size, weight = 800) {
    ctx.font = `${weight} ${size}px "Microsoft YaHei",sans-serif`;
    const lines = [];
    let line = '';
    const tokens = String(textValue || '').match(/【[^】]*】|./gu) || [];
    for (const token of tokens) {
      if (line && measuredWidth(line + token) > maxWidth) {
        lines.push(line);
        line = '';
      }
      line += token;
    }
    if (line) lines.push(line);
    return lines.length ? lines : [''];
  }
  function background(kind = 'paper') {
    ctx.fillStyle = kind === 'yellow' ? C.yellow : C.paper;
    ctx.fillRect(0, 0, width, height);
    if (kind === 'yellow') {
      if (view.images.stage) {
        const image = view.images.stage;
        const sourceWidth = image.width || 800;
        const sourceHeight = image.height || 1421;
        const scale = Math.max(width / sourceWidth, height / sourceHeight);
        const drawWidth = sourceWidth * scale, drawHeight = sourceHeight * scale;
        ctx.drawImage(image, (width - drawWidth) / 2, (height - drawHeight) / 2, drawWidth, drawHeight);
        return;
      }
      ctx.fillStyle = '#fff6a6';
      for (const [x, y, r] of [[-5, height * .32, 72], [width + 20, height * .69, 84]]) {
        ctx.beginPath(); ctx.arc(x, y, r, 0, Math.PI * 2); ctx.fill();
      }
    }
  }
  function upgradeBackground() {
    if (drawArt('upgradeBackground', 0, 0, width, height)) return;
    const image = view.images.stage;
    if (!image || !ctx.drawImage) { background('yellow'); return; }
    ctx.fillStyle = C.yellow;
    ctx.fillRect(0, 0, width, height);
    const sourceWidth = image.width || 800;
    const sourceHeight = image.height || 1421;
    ctx.drawImage(image, 0, 0, sourceWidth, Math.round(sourceHeight * .69),
      0, 0, width, height);
  }
  function drawImage(name, x, y, w, h) {
    const img = view.images[name];
    if (img && ctx.drawImage) {
      ctx.drawImage(img, x, y, w, h);
      return;
    }
    // The characters are optional decoration; the game remains readable without a decoded PNG.
    box(x + w * .12, y + h * .2, w * .35, h * .55, '#ffa6c2', C.navy, 28, 3);
    box(x + w * .51, y + h * .13, w * .37, h * .63, '#fff', C.navy, 28, 3);
    label('脑手搭档', x + w / 2, y + h * .84, 14, C.navy, 'center', 900);
  }
  function drawArt(name, x, y, w, h) {
    const img = view.images[name];
    if (!img || !ctx.drawImage) return false;
    ctx.drawImage(img, x, y, w, h);
    return true;
  }
  function mascot(name, x, y, w, h, rhythm = 'idle', delay = 0) {
    const rect = { x, y, w, h };
    const scene = rhythm === 'run' ? 'home' : rhythm === 'comfort' ? 'result' : 'game';
    const sequence = CHARACTER_FRAMES[scene];
    const epoch = scene === 'game' ? motion.gameCharacterStartedAt : motion.sceneStartedAt;
    const intro = canAnimate ? clamp01((Date.now() - epoch - delay) / 520) : 1;
    const sceneActive = (scene === 'result' ? view.mode === 'gameover' :
      view.mode === scene || (name === 'upgradePair' && view.mode === 'upgrade'));
    const elapsed = canAnimate && !motion.paused && sceneActive
      ? Math.max(0, Date.now() - epoch - (sequence.settleMs || 0)) : 0;
    const frameIndex = Math.floor(elapsed * sequence.fps / 1000) % sequence.poses.length;
    const pose = sequence.poses[frameIndex];
    const image = view.images[name];
    visual(rect, lerp(.88, 1, easeOutBack(intro)),
      lerp(.25, 1, easeOutCubic(intro)), () => {
        if (!image || !ctx.drawImage) { drawImage(name, x, y, w, h); return; }
        if (sequence.split && image.width > 0 && image.height > 0 && ctx.save) {
          const splitX = Math.round(image.width * sequence.split);
          const leftW = w * sequence.split;
          ctx.save();
          ctx.translate(0, pose.leftY || 0);
          ctx.drawImage(image, 0, 0, splitX, image.height, x, y, leftW, h);
          ctx.restore();
          ctx.save();
          ctx.translate(0, pose.rightY || 0);
          ctx.drawImage(image, splitX, 0, image.width - splitX, image.height,
            x + leftW, y, w - leftW, h);
          ctx.restore();
          return;
        }
        ctx.save?.();
        const pivotX = x + w / 2, pivotY = y + h * .91;
        ctx.translate?.(pivotX + (pose.x || 0), pivotY + (pose.y || 0));
        ctx.rotate?.(pose.angle || 0);
        ctx.scale?.(pose.scale || 1, pose.scale || 1);
        ctx.translate?.(-pivotX, -pivotY);
        ctx.drawImage(image, x, y, w, h);
        ctx.restore?.();
      });
  }
  function logo(y, size) {
    label('手指', width / 2, y, size, '#fff', 'center', 900, { width: 5, color: C.navy });
    label('等等我', width / 2, y + size * .99, size, C.yellow, 'center', 900, { width: 5, color: C.navy });
  }
  function nav(title = '') {
    const y = safeTop + 8;
    action('‹ 返回', { x: 14, y, w: 70, h: 44 }, 'home', 'secondary');
    if (title) pill(title, { x: width - 119, y: y + 4, w: 104, h: 34 });
    return y + 44;
  }
  function drawHome() {
    background('yellow');
    const small = height < 700;
    const top = safeTop + (small ? 12 : 8);
    action('怎么玩', { x: width - 135, y: top, w: 58, h: 44 }, 'help', 'secondary');
    action('设置', { x: width - 69, y: top, w: 55, h: 44 }, 'settings', 'secondary');
    const titleW = width * (small ? .9125 : .95);
    const titleH = titleW * 337 / 900;
    const titleY = safeTop + (small ? 63 : 73);
    const titleX = (width - titleW) / 2 - (small ? 0 : 3);
    const titleIntro = sceneProgress(0, 490);
    visual({ x: titleX, y: titleY, w: titleW, h: titleH },
      lerp(.87, 1, easeOutBack(titleIntro)), easeOutCubic(titleIntro), () => {
        if (!drawArt('homeTitle', titleX, titleY, titleW, titleH))
          logo(titleY + 24, small ? 37 : 48);
      });
    const tagY = titleY + titleH + (small ? 18 : 32);
    artPill('读懂提示，点亮安全按钮', {
      x: width * (small ? .24 : .22), y: tagY,
      w: width * (small ? .52 : .56), h: small ? 33 : 41
    }, -2, small ? 12 : 16, C.navy, ['#fffefa', '#fffefa'], '#d49b00');
    const mascotW = width * (small ? .78 : .97);
    const mascotH = width * (small ? .42 : .54);
    const startY = height - (small ? Math.max(10, safeBottom) + 148 : Math.max(119, safeBottom) + 75);
    const mascotY = tagY + (small ? 34 : 96);
    mascot('running', (width - mascotW) / 2, mascotY, mascotW, mascotH, 'run', 90);
    const startX = small ? 27 : 34;
    action('开始游戏', { x: startX, y: startY, w: width - startX * 2,
      h: small ? 68 : 75 }, 'start', 'primary', { fontSize: small ? 27 : 30 });
    const recordY = height - (small ? Math.max(10, safeBottom) + 54 : Math.max(39, safeBottom) + 48);
    const recordX = small ? 28 : 34;
    box(recordX, recordY, width - recordX * 2, small ? 40 : 45,
      '#fffdf2', '#e4c93e', 12, 3, { dy: 3, color: '#be9d19' });
    const best = view.bestRecord;
    label(view.recordSaveFailed ? '本次纪录暂未保存' :
      best?.updatedAt ? `★ 最高纪录 ${best.bestLevel} 关 · ${best.bestScore} 分` : '第一次挑战，从这里出发！',
      width / 2, recordY + (small ? 20 : 22), small ? 13 : 15, C.navy, 'center', 900);
  }
  function drawHelp() {
    background();
    const bottomNav = nav();
    label('怎么玩？', 14, bottomNav + 29, 27, C.navy, 'left', 900);
    label('读规则、找安全按钮，脑子和手指一起冲！', 14, bottomNav + 57, 12, C.navy, 'left', 700);
    const items = [
      '先读完整的“本轮别按”，点完其余按钮。',
      '点错会扣体力；体力耗尽或时间到，这一局结束。',
      '点对加分；每轮清完进下一关，并推进挑战进度。',
      '挑战进度满格时三选一升级；连击有接续时限。'
    ];
    const top = bottomNav + 77;
    const end = height - safeBottom - 91;
    const gap = 8;
    const cardH = clamp((end - top - gap * 3) / 4, 50, 65);
    items.forEach((item, i) => {
      const y = top + i * (cardH + gap);
      const rect = { x: 14, y, w: width - 28, h: cardH };
      const intro = sceneProgress(85 + i * 65, 360);
      visual(rect, lerp(.94, 1, easeOutBack(intro)), easeOutCubic(intro), () => {
        box(14, y, width - 28, cardH, '#fffefa', C.navy, 13, 2);
        box(26, y + (cardH - 23) / 2, 23, 23, C.yellow, C.navy, 12, 2);
        label(i + 1, 37.5, y + cardH / 2, 13, C.navy, 'center', 900);
        const lines = wrap(item, width - 82, 12, 800);
        lines.forEach((line, index) => label(line, 60,
          y + cardH / 2 + (index - (lines.length - 1) / 2) * 16,
          12, C.navy, 'left', 800));
      });
    });
    action('明白了', { x: 18, y: height - safeBottom - 63, w: width - 36, h: 51 }, 'home');
  }
  function drawSettings() {
    background();
    const bottomNav = nav();
    label('设置', 14, bottomNav + 29, 27, C.navy, 'left', 900);
    label('小小调整，不打乱本局节奏。', 14, bottomNav + 57, 12, C.navy, 'left', 700);
    const compact = height < 700;
    const rowH = compact ? 56 : 70;
    const gap = compact ? 8 : 12;
    const top = bottomNav + (compact ? 74 : 85);
    const rows = [
      { title: '音效', note: '按钮和结果提示声', key: 'sound', enabled: view.settings.sound },
      { title: '背景音乐', note: '首页与局内循环', key: 'music', enabled: view.settings.music },
      { title: '音乐音量', note: '轻于操作音效', key: 'musicVolume', volume: true },
      ...(view.settings.vibrationAvailable
        ? [{ title: '误按震动', note: '设备支持时生效', key: 'vibration', enabled: view.settings.vibration }]
        : [])
    ];
    rows.forEach(({ title, note, key, enabled, volume }, index) => {
      const y = top + index * (rowH + gap);
      const rect = { x: 14, y, w: width - 28, h: rowH };
      const intro = sceneProgress(80 + index * 65, 390);
      visual(rect, lerp(.92, 1, easeOutBack(intro)), easeOutCubic(intro), () => {
        box(rect.x, rect.y, rect.w, rect.h, '#fff', C.navy, 14, 2);
        label(title, 28, y + (compact ? 21 : 27), compact ? 16 : 18, C.navy, 'left', 900);
        label(note, 28, y + (compact ? 42 : 52), 11, '#526181', 'left', 700);
        if (volume) {
          const volumeValue = Math.max(0, Math.min(4, Number(view.settings.musicVolume) || 0));
          const controlY = y + (rowH - 34) / 2;
          box(width - 154, controlY, 36, 34, '#fff6d9', C.navy, 9, 2);
          label('−', width - 136, controlY + 17, 22, C.navy, 'center', 900);
          label(`${volumeValue * 25}%`, width - 94, controlY + 17, 14, C.navy, 'center', 900);
          box(width - 60, controlY, 36, 34, '#fff6d9', C.navy, 9, 2);
          label('+', width - 42, controlY + 17, 19, C.navy, 'center', 900);
        } else {
          const toggleY = y + (rowH - 28) / 2;
          box(width - 77, toggleY, 46, 28, enabled ? '#20c9ba' : '#c5cbd5', C.navy, 14, 2);
          const toggleActive = motion.toggleKey === key && Date.now() - motion.toggleAt < 320;
          const toggleProgress = toggleActive ? easeOutBack((Date.now() - motion.toggleAt) / 320) : 1;
          const knobFrom = width - (motion.toggleFrom ? 53 : 75);
          const knobTo = width - (enabled ? 53 : 75);
          box(toggleActive ? lerp(knobFrom, knobTo, toggleProgress) : knobTo,
            toggleY + 3, 22, 22, '#fff', null, 11);
        }
      });
      if (volume) {
        const controlY = y + (rowH - 34) / 2;
        hits.push({ rect: { x: width - 154, y: controlY, w: 36, h: 34 },
          action: { type: 'musicVolume', delta: -1 } });
        hits.push({ rect: { x: width - 60, y: controlY, w: 36, h: 34 },
          action: { type: 'musicVolume', delta: 1 } });
      } else hits.push({ rect, action: { type: 'toggle', key } });
    });
    label('设置保存在本机。', 14, top + rows.length * (rowH + gap) + 5,
      11, '#596581', 'left', 600);
    action(diagnostics ? '内测诊断：开' : '内测诊断：关', {
      x: 18, y: height - safeBottom - 63, w: (width - 46) / 2, h: 51
    }, 'diagnosticsMenu', 'secondary');
    action('完成', { x: (width + 10) / 2, y: height - safeBottom - 63,
      w: (width - 46) / 2, h: 51 }, 'home');
  }
  function drawLoading(error = false) {
    background('yellow');
    logo(safeTop + 67, 37);
    if (!error) {
      label('◌', width / 2, height * .46, 62, C.navy, 'center', 900);
      label('正在准备画面…', width / 2, height * .58, 21, C.navy, 'center', 900);
      return;
    }
    const y = Math.max(safeTop + 165, height * .39);
    box(15, y, width - 30, 242, '#fffdf4', C.navy, 17, 3, { dy: 7, color: '#c79819' });
    label('部分画面没准备好', width / 2, y + 38, 21, C.navy, 'center', 900);
    label('可以重试；若只是角色图片失败，', width / 2, y + 72, 12, C.navy, 'center', 700);
    label('可用简化画面继续游戏。', width / 2, y + 91, 12, C.navy, 'center', 700);
    action('重试加载', { x: 33, y: y + 119, w: width - 66, h: 51 }, 'retryAssets');
    action('简化画面继续', { x: 33, y: y + 179, w: width - 66, h: 44 }, 'continueFallback', 'secondary');
  }
  function drawTile(button, rect, wrong = false) {
    const [shine, top, base, deep, wall] = TILES[button.color?.id] || TILES.blue;
    const pressed = Boolean(button.isClicked || wrong);
    const now = Date.now();
    const pressedAt = motion.tilePressAt.get(button.id);
    const pressProgress = pressed && canAnimate && pressedAt
      ? easeOutBack((now - pressedAt) / 245) : pressed ? 1 : 0;
    const inset = 2 + 5 * pressProgress;
    const x = rect.x + inset, y = rect.y + 2 + 9 * pressProgress;
    const w = rect.w - inset * 2, h = rect.h - 4 - 12 * pressProgress;
    if (canAnimate) {
      ctx.save();
      if (wrong) {
        const age = clamp01((view.wrongUntil - now) / 700);
        ctx.translate(Math.sin((1 - age) * 43) * age * 3, 0);
      }
    }
    box(rect.x, rect.y + 8, rect.w, rect.h, pressed ? '#173661' : '#07194455', null, 15);
    box(rect.x, rect.y + (pressed ? 5 : 5), rect.w, rect.h,
      pressed ? '#183968' : wall, C.navy, 15, 3);
    if (!pressed) box(rect.x, rect.y, rect.w, rect.h, wall, C.navy, 15, 3);
    let face = pressed ? gradient(x, y, h, top, base) : top;
    if (!pressed && ctx.createLinearGradient) {
      face = ctx.createLinearGradient(x, y, x, y + h);
      for (const [stop, color] of [[0, shine], [.24, top], [.84, base], [1, deep]]) {
        face.addColorStop(stop, color);
      }
    }
    box(x, y, w, h, face, pressed ? deep : '#ffffff99', pressed ? 9 : 11, pressed ? 2 : 2);
    if (pressed) {
      path(x + 2, y + 2, w - 4, h - 4, 8);
      ctx.fillStyle = 'rgba(7,25,68,.22)';
      ctx.fill();
      path(x + 3, y + 3, w - 6, h - 6, 7);
      ctx.strokeStyle = '#07194455';
      ctx.lineWidth = 3;
      ctx.stroke();
    } else {
      path(x + 8, y + 5, w - 16, Math.min(12, h * .2), 7);
      ctx.fillStyle = '#ffffffe3';
      ctx.fill();
      path(x + 3, y + 3, w - 6, h - 6, 8);
      ctx.strokeStyle = '#ffffff65';
      ctx.lineWidth = 1.5;
      ctx.stroke();
    }
    const ink = button.color?.id === 'yellow' ? C.navy : '#fff';
    const symbolSize = clamp(h * .35, 19, 32);
    const numberSize = clamp(h * .23, 16, 21);
    const contentGap = clamp(h * .07, 3, 7);
    const contentTop = y + (h - symbolSize - contentGap - numberSize) / 2;
    const centerX = rect.x + rect.w / 2;
    drawShape(button.shape?.id, centerX, contentTop + symbolSize / 2, symbolSize, ink);
    const numberText = String(button.number).padStart(2, '0');
    const numberY = contentTop + symbolSize + contentGap + numberSize / 2;
    if (textAtlas.numbers && button.number >= 1 && button.number <= 9 &&
        textAtlas.canDraw(numberText, ink)) {
      // Use the original font's advance/kerning and centered two-digit layout.
      const startX = centerX - textWidth(numberText, numberSize) / 2;
      for (let i = 0; i < numberText.length; i++) {
        const glyphX = startX + (i ? textWidth(numberText.slice(0, i + 1), numberSize) -
          textWidth(numberText[i], numberSize) : 0);
        if (textAtlas.drawGlyph(ctx, numberText[i], glyphX, numberY, numberSize, ink))
          diagnostics?.count('numberAtlasHit');
        else {
          diagnostics?.count('numberAtlasFallback');
          label(numberText[i], glyphX, numberY, numberSize, ink, 'left', 900);
        }
      }
    } else {
      if (textAtlas.numbers) diagnostics?.count('numberAtlasFallback', numberText.length);
      label(numberText, centerX, numberY, numberSize, ink, 'center', 900);
    }
    if (wrong) {
      const exitT = canAnimate ? clamp01(1 - (view.wrongUntil - now) / 700) : 0;
      if (canAnimate) {
        ctx.save();
        ctx.globalAlpha *= 1 - exitT;
      }
      path(rect.x - 2 - exitT * 3, rect.y - 2 - exitT * 3,
        rect.w + 4 + exitT * 6, rect.h + 7 + exitT * 6, 14);
      ctx.strokeStyle = '#f24961';
      ctx.lineWidth = 3 - exitT;
      ctx.stroke();
      if (canAnimate) ctx.restore();
    }
    const successAt = motion.tileSuccessAt.get(button.id);
    if (canAnimate && successAt && now - successAt < 430) {
      const t = clamp01((now - successAt) / 430);
      ctx.globalAlpha *= (1 - t) * .75;
      path(rect.x - 1 - t * 3, rect.y - 1 - t * 3,
        rect.w + 2 + t * 6, rect.h + 2 + t * 6, 15);
      ctx.strokeStyle = '#fff5a5';
      ctx.lineWidth = 3 - t * 1.5;
      ctx.stroke();
    }
    if (canAnimate) ctx.restore();
  }
  function drawShape(shape, cx, cy, size, color) {
    ctx.fillStyle = color;
    ctx.beginPath();
    if (shape === 'triangle') {
      ctx.moveTo(cx, cy - size * .5);
      ctx.lineTo(cx + size * .53, cy + size * .46);
      ctx.lineTo(cx - size * .53, cy + size * .46);
    } else if (shape === 'square') {
      path(cx - size * .43, cy - size * .43, size * .86, size * .86, size * .05);
    } else if (shape === 'star') {
      for (let point = 0; point < 10; point++) {
        const angle = -Math.PI / 2 + point * Math.PI / 5;
        const radius = size * (point % 2 ? .23 : .51);
        const px = cx + Math.cos(angle) * radius;
        const py = cy + Math.sin(angle) * radius;
        if (point === 0) ctx.moveTo(px, py);
        else ctx.lineTo(px, py);
      }
    } else {
      ctx.arc(cx, cy, size * .43, 0, Math.PI * 2);
    }
    ctx.closePath();
    ctx.fill();
  }
  let ruleLayout = null;
  function drawRuleText(value, centerY, maxWidth, preferredSize) {
    const makeLines = (size) => {
      ctx.font = `900 ${size}px "Microsoft YaHei",sans-serif`;
      const lines = [{ glyphs: [], width: 0 }];
      const clauses = [[]];
      let highlighted = false;
      for (const glyph of String(value || '')) {
        if (glyph === '【') { highlighted = true; continue; }
        if (glyph === '】') { highlighted = false; continue; }
        if ((glyph === '且' || glyph === '或') && !highlighted && clauses[clauses.length - 1].length) {
          clauses.push([]);
        }
        clauses[clauses.length - 1].push({ glyph, width: measuredWidth(glyph), highlighted });
      }
      for (const glyphs of clauses) {
        const clauseWidth = glyphs.reduce((sum, item) => sum + item.width, 0);
        let line = lines[lines.length - 1];
        if (line.glyphs.length && line.width + clauseWidth > maxWidth) {
          line = { glyphs: [], width: 0 };
          lines.push(line);
        }
        for (const item of glyphs) {
          if (line.glyphs.length && line.width + item.width > maxWidth) {
            line = { glyphs: [], width: 0 };
            lines.push(line);
          }
          line.glyphs.push(item);
          line.width += item.width;
        }
      }
      return lines;
    };
    const key = JSON.stringify([value, maxWidth, preferredSize, ctx.direction]);
    if (ruleLayout?.key !== key) {
      let size = preferredSize;
      let lines = makeLines(size);
      if (lines.length > 2) { size -= 2; lines = makeLines(size); }
      const plainText = String(value || '').replace(/[【】]/g, '');
      const atlasReady = textAtlas.rules && textAtlas.canDraw(plainText, C.navy) &&
        textAtlas.canDraw(plainText, '#ec1938');
      ruleLayout = { key, size, lines, atlasReady };
    }
    const { size, lines, atlasReady } = ruleLayout;
    ctx.font = `900 ${size}px "Microsoft YaHei",sans-serif`;
    const lineHeight = size + 4;
    lines.slice(0, 3).forEach((line, index) => {
      let x = (width - line.width) / 2;
      const y = centerY + (index - (lines.length - 1) / 2) * lineHeight;
      for (const item of line.glyphs) {
        const color = item.highlighted ? '#ec1938' : C.navy;
        if (atlasReady && textAtlas.drawGlyph(ctx, item.glyph, x, y, size, color))
          diagnostics?.count('ruleAtlasHit');
        else {
          if (textAtlas.rules) diagnostics?.count('ruleAtlasFallback');
          label(item.glyph, x, y, size, color, 'left', 900);
        }
        x += item.width;
      }
    });
  }
  function drawGame() {
    background();
    const board = view.board;
    if (!board) return;
    if (canAnimate) {
      const camera = cameraOffset();
      ctx.save();
      ctx.translate(camera.x, camera.y);
    }
    const compact = height < 700;
    const x = compact ? 10 : 14, w = width - x * 2;
    const headY = safeTop + (compact && safeTop > 45 ? 13 : compact ? 7 : 18);
    const headH = compact ? 38 : 43;
    box(x, headY, compact ? 96 : 110, headH, '#ffe35c', C.navy, 13, 3,
      { dy: 3, color: '#c58e00' });
    label(`第 ${board.level} 关`, x + (compact ? 48 : 55), headY + headH / 2,
      compact ? 19 : 23, C.navy, 'center', 900);
    const scoreW = compact ? 87 : 99;
    const scoreRect = { x: width - x - scoreW, y: headY, w: scoreW, h: headH };
    box(scoreRect.x, scoreRect.y, scoreRect.w, scoreRect.h, '#fffefa', C.navy, 16, 3);
    scoreBadge(scoreRect, view.score, compact);
    const combo = view.combat?.combo;
    const comboX = x + (compact ? 98 : 112);
    const comboW = width - x - scoreW - 7 - comboX;
    if (!combo?.hasVisibleCombo) {
      const stage = combo?.streak === 1 ? 1 : 0;
      const prePulse = 1 - Math.max(0, motion.preComboPulseUntil - Date.now()) / 420;
      const elastic = stage === 1 && prePulse > 0 && prePulse < 1 ?
        .10 * Math.exp(-4 * prePulse) * Math.sin(Math.PI * 3 * prePulse) : 0;
      const intro = sceneProgress(55, 310);
      const rect = { x: comboX, y: headY, w: comboW, h: headH };
      const exitAge = motion.comboExit ? Date.now() - motion.comboExit.startedAt : 220;
      const exitT = clamp01(exitAge / 220);
      visual(rect, lerp(.90, 1, easeOutBack(intro)) + elastic,
        easeOutCubic(intro) * (motion.comboExit ? exitT : 1), () => drawPreCombo(ctx, {
          left: comboX, top: headY, width: comboW, height: headH, stage,
          readyImage: view.images.readyWordmark,
          hitImage: view.images.hitWordmark
        }));
      if (motion.comboExit && exitT < 1) {
        const sustained = motion.comboExit.capped;
        visual(rect, 1 - .16 * exitT, 1 - exitT, () => {
          if (sustained) maxSticker(comboX, headY, comboW, headH, compact);
          else comboPair(motion.comboExit.count, comboX, headY, comboW, headH, compact);
        });
      }
    } else {
      const count = Math.max(1, combo.streak || combo.chainCount || 1);
      const sustained = Boolean(combo.isCapped || count >= (Number(combo.maxStreak) || 12));
      const pulse = 1 - Math.max(0, view.comboPulseUntil - Date.now()) / 550;
      const comboIntro = sceneProgress(70, 370);
      const elastic = pulse > 0 && pulse < 1 ?
        .14 * Math.exp(-4 * pulse) * Math.sin(Math.PI * 3 * pulse) : 0;
      if (canAnimate) {
        ctx.save();
        ctx.globalAlpha *= easeOutCubic(comboIntro);
        const centerX = comboX + comboW / 2, centerY = headY + headH / 2;
        const scale = lerp(.84, 1, easeOutBack(comboIntro)) + elastic;
        ctx.translate(centerX, centerY);
        ctx.scale(scale, scale);
        ctx.translate(-centerX, -centerY);
      }
      if (sustained) maxSticker(comboX, headY, comboW, headH, compact);
      else comboPair(count, comboX, headY, comboW, headH, compact);
      if (canAnimate) ctx.restore();
    }

    const ruleY = headY + headH + (compact ? 5 : 10);
    const ruleH = compact ? (safeTop > 45 ? 77 : 87) : 106;
    const ruleIntro = sceneProgress(0, 200);
    visual({ x, y: ruleY, w, h: ruleH },
      lerp(.98, 1, easeOutBack(ruleIntro)), 1, () => {
        box(x, ruleY, w, ruleH, gradient(x, ruleY, ruleH, '#ffe6eb', '#fffdf8'), C.navy, 16, 3,
          { dy: 4, color: '#d4bac4' });
        label('本轮别按：', width / 2, ruleY + (compact ? 19 : 26),
          compact ? 17 : 25, C.navy, 'center', 900);
        drawRuleText(board.ruleText, ruleY + (compact ? 47 : 70), w - 18,
          compact ? 16 : 21);
      });

    const timerY = ruleY + ruleH + (compact && safeTop > 45 ? 2 : compact ? 7 : 11);
    const timeDanger = view.timeLeft / Math.max(1, view.timeLimit) < .28;
    const timerRect = { x: width / 2 - 90, y: timerY - 1,
      w: 180, h: compact ? 27 : 37 };
    const timerPulse = timeDanger && canAnimate ? 1 + .035 * Math.sin(Date.now() / 150) : 1;
    visual(timerRect, timerPulse, 1, () =>
      label(`◷ ${(Math.max(0, view.timeLeft) / 1000).toFixed(1)} 秒`, width / 2,
        timerY + (compact ? 12 : 17), compact ? 20 : 26,
        timeDanger ? '#cf294b' : C.navy, 'center', 900));
    fillBar({ x: x + 18, y: timerY + (compact ? 30 : 40), w: w - 36, h: compact ? 10 : 12 },
      view.timeLeft, view.timeLimit, timeDanger ? '#ed4b68' : '#56ce72', '#dfeeff');
    const boardTop = timerY + (compact ? 47 : 60);
    const footerH = compact ? (safeTop > 45 ? 105 : 125) : 193;
    const statsH = compact ? (safeTop > 45 ? 53 : 55) : 73;
    const footerY = height - footerH;
    const cols = board.difficulty.cols, rows = board.difficulty.rows;
    const gap = compact ? 11 : 9;
    const boardAvail = Math.max(100, footerY - boardTop - 8);
    const cellW = Math.min(118, (w - 5 - gap * (cols - 1)) / cols);
    const cellH = Math.max(41, Math.min(compact ? 118 : 116,
      (boardAvail - gap * (rows - 1)) / rows));
    const boardH = rows * cellH + gap * (rows - 1);
    const boardW = cols * cellW + gap * (cols - 1);
    const gridX = (width - boardW) / 2;
    const gridY = boardTop + Math.max(0, (boardAvail - boardH) / 2) + (compact ? 0 : 2);
    const movement = view.hazards?.hazards?.find((h) => h.type === 'moving_button' && h.phase === 'active');
    const swap = view.hazards?.hazards?.find(h=>h.type==='button_swap');
    const glitch = view.hazards?.hazards?.find(h=>h.type==='button_glitch');
    const baseRects = board.buttons.map((button,index)=>({id:button.id,
      x:gridX+index%cols*(cellW+gap),y:gridY+Math.floor(index/cols)*(cellH+gap),w:cellW,h:cellH+1}));
    const tileRects = baseRects.map(r=>{
      const targetIndex=swap?.targetButtonIds.indexOf(r.id)??-1;
      if(targetIndex<0 || !['active','settled'].includes(swap.phase))return r;
      const destination=baseRects.find(b=>b.id===swap.targetButtonIds[1-targetIndex]);
      if(!destination)return r;
      const moved=swapRect(r,destination,targetIndex,swap.elapsedMs);
      return {...moved,id:r.id,y:clamp(moved.y,gridY,gridY+boardH+1-moved.h)};
    });
    blockedTileRects = tileRects.filter(a=>tileRects.some(b=>a.id!==b.id&&rectsOverlap(a,b)));
    board.buttons.forEach((button, index) => {
      const moving = movement?.targetButtonIds?.includes(button.id);
      const dx = moving ? clamp(movement.motion?.offsetXPx || 0, -6, 6) : 0;
      const dy = moving ? clamp(movement.motion?.offsetYPx || 0, -6, 6) : 0;
      const rect = {
        x: tileRects[index].x + dx,
        y: tileRects[index].y + dy,
        w: tileRects[index].w, h: tileRects[index].h - 8
      };
      const now = Date.now();
      let tileScale, tileAlpha;
      if (motion.roundExit) {
        const t = clamp01((now - motion.roundExit.startedAt - index * 45) / 180);
        tileScale = lerp(1, .05, easeOutCubic(t));
        tileAlpha = 1 - easeOutCubic(t);
      } else if (motion.roundEnter) {
        const t = clamp01((now - motion.roundEnter.startedAt - index * 45) / 230);
        tileScale = lerp(.12, 1, easeOutBack(t));
        tileAlpha = easeOutCubic(t);
      } else {
        const t = sceneProgress(10 + index * 12, 220);
        tileScale = lerp(.96, 1, easeOutBack(t));
        tileAlpha = 1;
      }
      visual(rect, tileScale, tileAlpha, () => {
        const affected=glitch?.phase==='active' && glitch.targetButtonIds.includes(button.id) && !button.isClicked;
        if(!affected || !drawGlitchTile(button,rect,glitch))
          drawTile(button, rect, view.wrongButtonId === button.id && Date.now() < view.wrongUntil);
      });
      const marked=[swap,glitch].some(h=>h?.phase==='telegraph'&&h.targetButtonIds.includes(button.id));
      if(marked){path(rect.x-2,rect.y-2,rect.w+4,rect.h+12,14);ctx.strokeStyle=C.cyan;ctx.lineWidth=3;ctx.stroke();}
      const entering = motion.roundEnter && now < motion.roundEnter.startedAt + motion.roundEnter.duration;
      if (!button.isClicked && !entering && !motion.roundExit && !blockedTileRects.some(r=>r.id===button.id)) hits.push({ rect: { ...rect, h: rect.h + 8 },
        action: { type: 'press', buttonId: button.id } });
    });
    drawArt('landscape', 0, footerY, width, footerH - statsH + 11);
    const pairW = compact ? width * (safeTop > 45 ? .516 : .688) : width * .85;
    const pairH = pairW / 3;
    mascot('separated', (width - pairW) / 2, footerY, pairW, pairH, 'idle', 130);
    const statsY = height - statsH;
    box(4, statsY, width - 8, statsH, '#fff9ed', C.navy, 12, 2);
    const middle = width / 2;
    ctx.fillStyle = '#d8d7d2';
    ctx.fillRect(middle, statsY + 5, 1, statsH - 10);
    const player = view.combat?.player;
    const hp = player?.hp ?? 100, maxHp = player?.maxHp ?? 100;
    const combat = view.combat?.combat;
    const target = Math.max(1, combat?.maxHp || 500);
    const progress = clamp(target - (combat?.hp ?? target), 0, target);
    const displayedHp = Math.round(tweenValue(motion.hpTween, hp));
    const displayedProgress = Math.round(tweenValue(motion.progressTween, progress));
    const statSize = compact ? 10 : 14;
    const statLabelY = statsY + (compact ? 16 : 22);
    const breath = canAnimate ? Math.sin(Date.now() * Math.PI * 2 / 1050) : 0;
    visual({ x, y: statLabelY - statSize / 2, w: statSize + 2, h: statSize + 2 },
      1 + .08 * breath, 1, () =>
        label('♥', x + statSize / 2, statLabelY, statSize + 2,
          '#c92b4b', 'center', 900));
    label('体力', x + statSize + 4, statLabelY, statSize, '#c92b4b', 'left', 900);
    const hpPulse = clamp01((Date.now() - motion.healthPulseAt) / 430);
    visual({ x: middle - 88, y: statsY + 4, w: 80, h: compact ? 24 : 33 },
      motion.healthPulseAt && hpPulse < 1 ? 1 + .13 * (1 - hpPulse) * Math.sin(Math.PI * hpPulse) : 1,
      1, () => label(`${displayedHp}/${maxHp}`, middle - 9, statsY + (compact ? 16 : 22),
        compact ? 12 : 17, C.navy, 'right', 900));
    const challengeX = middle + 7;
    visual({ x: challengeX, y: statLabelY - statSize / 2,
      w: statSize + 2, h: statSize + 2 },
    1 + .06 * Math.sin(Date.now() * Math.PI * 2 / 1470), 1, () =>
      label('✦', challengeX + statSize / 2, statLabelY, statSize + 2,
        '#6541ad', 'center', 900));
    label('挑战进度', challengeX + statSize + 4, statLabelY,
      statSize, '#6541ad', 'left', 900);
    const progressPulse = clamp01((Date.now() - motion.progressPulseAt) / 430);
    visual({ x: width - x - 93, y: statsY + 4, w: 93, h: compact ? 24 : 33 },
      motion.progressPulseAt && progressPulse < 1 ?
        1 + .10 * (1 - progressPulse) * Math.sin(Math.PI * progressPulse) : 1,
      1, () => label(`${displayedProgress}/${target}`, width - x,
        statsY + (compact ? 16 : 22), compact ? 12 : 17, C.navy, 'right', 900));
    const barY = statsY + (compact ? 27 : 36);
    const barH = compact ? 10 : 13;
    fillBar({ x, y: barY, w: middle - x - 10, h: barH },
      displayedHp, maxHp, '#f36a98', '#ffe0e7');
    fillBar({ x: middle + 8, y: barY, w: middle - x - 8, h: barH },
      displayedProgress, target, '#9453e2', '#eee6fc');
    if (canAnimate) ctx.restore();
  }
  function drawUpgradeV23() {
    upgradeBackground();
    drawArt('upgradeRays', 0, 0, width, width * 650 / 853);
    const short = height < 650;
    const margin = width * .04;
    const titleW = Math.min(width - 24, width * (short ? .80 : .88));
    const titleH = titleW * 766 / 2054;
    const titleRect = {
      x: (width - titleW) / 2, y: safeTop + (short ? 2 : 10),
      w: titleW, h: titleH
    };
    const titleIntro = sceneProgress(0, 470);
    visual(titleRect, lerp(.86, 1, easeOutBack(titleIntro)),
      easeOutCubic(titleIntro), () => {
        if (!drawArt('upgradeTitle', titleRect.x, titleRect.y, titleRect.w, titleRect.h)) {
          label('挑战完成！', width / 2, titleRect.y + titleRect.h / 2,
            short ? 28 : 39, '#fff', 'center', 900,
            { width: 6, color: C.navy });
        }
      });

    const bubbleW = width * .57;
    const bubbleH = bubbleW * 205 / 510;
    const bubble = {
      x: width * .025, y: titleRect.y + titleRect.h - (short ? 15 : 18),
      w: bubbleW, h: bubbleH
    };
    const statusY = bubble.y + bubble.h + (short ? 13 : 21);
    const statusW = width - margin * 2;
    const statusH = statusW * 106 / 640;
    const pairW = width * (short ? .40 : .50);
    const pairImage = view.images.upgradePair;
    const pairH = pairW * (pairImage?.height && pairImage?.width ?
      pairImage.height / pairImage.width : 500 / 760);
    const bubbleIntro = sceneProgress(80, 400);
    visual(bubble, lerp(.91, 1, easeOutBack(bubbleIntro)),
      easeOutCubic(bubbleIntro), () => {
        if (!drawArt('upgradeBubble', bubble.x, bubble.y, bubble.w, bubble.h)) {
          box(bubble.x, bubble.y, bubble.w, bubble.h, '#fffefa', C.navy,
            17, 3, { dy: 3, color: '#e49480' });
          label('挑战进度已满', bubble.x + bubble.w / 2,
            bubble.y + bubble.h * .40, short ? 12 : 16, C.navy, 'center', 900);
          label('选一个升级，继续下一关', bubble.x + bubble.w / 2,
            bubble.y + bubble.h * .72, short ? 10 : 12, '#c92547', 'center', 900);
        }
      });
    mascot('upgradePair', width - pairW + (short ? 0 : 2), statusY - pairH - 2,
      pairW, pairH, 'run', 80);

    const statusRect = { x: margin, y: statusY, w: statusW, h: statusH };
    if (!drawArt('upgradeStatus', statusRect.x, statusRect.y,
      statusRect.w, statusRect.h)) {
      box(statusRect.x, statusRect.y, statusRect.w, statusRect.h,
        '#fffdf4', C.navy, 13, 3);
    }
    const dividerX = width * .49;
    ctx.fillStyle = '#c8bdab';
    ctx.fillRect(dividerX, statusY + statusH * .21, 1, statusH * .58);
    const statY = statusY + statusH * .51;
    const scoreNumber = String(Math.max(0, Math.floor(Number(view.score) || 0)));
    const scorePrefix = '本局 ';
    const scoreUnit = ' 分';
    const basePrefixSize = Math.min(17, width * .052);
    const baseNumberSize = Math.min(24, width * .073);
    const baseWidth = textWidth(scorePrefix, basePrefixSize) +
      textWidth(scoreNumber, baseNumberSize) + textWidth(scoreUnit, basePrefixSize);
    const scoreScale = Math.min(1, (dividerX - margin - 14) / baseWidth);
    const prefixSize = basePrefixSize * scoreScale;
    const numberSize = baseNumberSize * scoreScale;
    const prefixWidth = textWidth(scorePrefix, prefixSize);
    const numberWidth = textWidth(scoreNumber, numberSize);
    const unitWidth = textWidth(scoreUnit, prefixSize);
    let scoreX = margin + (dividerX - margin - prefixWidth - numberWidth - unitWidth) / 2;
    label(scorePrefix, scoreX, statY + 1, prefixSize, C.navy, 'left', 900);
    scoreX += prefixWidth;
    label(scoreNumber, scoreX, statY + 1, numberSize, C.navy, 'left', 900);
    scoreX += numberWidth;
    label(scoreUnit, scoreX, statY + 1, prefixSize, C.navy, 'left', 900);
    const badgeSize = Math.min(width * .088, statusH * .7);
    const badgeX = dividerX + width * .045;
    const badgeY = statusY + (statusH - badgeSize) / 2;
    if (!drawArt('upgradeHeart', badgeX, badgeY, badgeSize, badgeSize)) {
      label('♥', badgeX + badgeSize / 2, statY,
        badgeSize * .75, C.navy, 'center', 900);
    }
    const player = view.combat?.player;
    const healthText = `体力 ${player?.hp ?? 100}/${player?.maxHp ?? 100}`;
    const healthX = badgeX + badgeSize + width * .012;
    const healthMaxWidth = margin + statusW - width * .032 - healthX;
    const healthSize = fittedTextSize(healthText,
      Math.min(14, width * .042), 10, healthMaxWidth);
    label(healthText, healthX, statY + 1, healthSize, C.navy, 'left', 900);

    const cardsTop = statusY + statusH + width * (short ? .022 : .025);
    const gap = width * .023;
    const footerReserve = short ? 29 : 39;
    const naturalW = width - margin * 2;
    const naturalH = naturalW * 222 / 640;
    const availableH = height - safeBottom - footerReserve - cardsTop - gap * 2;
    const cardH = Math.max(58, Math.min(naturalH, availableH / 3));
    const cardW = Math.min(naturalW, cardH * 640 / 222);
    const cardX = (width - cardW) / 2;
    view.upgradeChoices.forEach((choice, index) => {
      const y = cardsTop + index * (cardH + gap);
      const rect = { x: cardX, y, w: cardW, h: cardH };
      const selected = view.selectedUpgradeId === choice.id;
      const intro = sceneProgress(85 + index * 70, 400);
      const selectAge = Date.now() - motion.upgradeSelectAt;
      const selecting = view.upgradeLocked && selected && selectAge < 460;
      const selectT = clamp01(selectAge / 460);
      const selectScale = selecting ?
        1 + .08 * (1 - selectT) * Math.sin(Math.PI * 2.5 * selectT) : 1;
      const fade = view.upgradeLocked && !selected ? .48 :
        selecting ? 1 - .15 * selectT : 1;
      visual(rect, lerp(.85, 1, easeOutBack(intro)) * selectScale,
        easeOutCubic(intro) * fade, () => {
          if (selected) {
            box(rect.x - 3, rect.y - 3, rect.w + 6, rect.h + 6,
              '#71f5e9', C.navy, 20, 2);
          }
          const art = UPGRADES[choice.id];
          const fixedCopyMatches = art &&
            (choice.value == null || Number(choice.value) === art.value);
          if (!fixedCopyMatches ||
              !drawArt(UPGRADE_CARD_ART[choice.id], rect.x, rect.y, rect.w, rect.h)) {
            box(rect.x, rect.y, rect.w, rect.h, '#fffdf4', C.navy, 18, 3,
              { dy: 7, color: art?.side || '#d9a400' });
            label(art?.title || choice.label || '升级', rect.x + rect.w / 2,
              rect.y + rect.h * .40, short ? 15 : 20, C.navy, 'center', 900);
            label(art?.description(Number(choice.value ?? art.value) || 0) || '',
              rect.x + rect.w / 2, rect.y + rect.h * .70,
              short ? 10 : 13, C.navy, 'center', 800);
          }
        });
      if (!view.upgradeLocked) hits.push({ rect,
        action: { type: 'upgrade', upgradeId: choice.id } });
    });
    const footer = view.upgradeLocked ? '升级已生效 · 即将开始下一关' :
      '选择后立刻生效';
    const footerY = cardsTop + cardH * view.upgradeChoices.length +
      gap * Math.max(0, view.upgradeChoices.length - 1) + (short ? 12 : 20);
    const finalFooterY = Math.min(height - safeBottom - 12, footerY);
    if (short) {
      box((width - 232) / 2, finalFooterY - 12, 232, 21,
        '#fffdf4', C.navy, 8, 1, { dy: 2, color: '#77bdb7' });
    }
    label(footer, width / 2, finalFooterY,
      short ? 10 : Math.min(13, width * .034), C.navy, 'center', 900);
  }
  function drawResult() {
    background('yellow');
    const short = height < 700;
    const resultScale = short ? 1 : clamp(width / 390, 1, 1.2);
    const titleW = width * (short ? .78 : .88);
    const titleH = short ? 106 : titleW * 327 / 900;
    const titleY = safeTop + (short ? 2 : 33);
    const titleX = (width - titleW) / 2;
    const titleIntro = sceneProgress(0, 470);
    visual({ x: titleX, y: titleY, w: titleW, h: titleH },
      lerp(.86, 1, easeOutBack(titleIntro)), easeOutCubic(titleIntro), () => {
        if (!drawArt('resultTitle', titleX, titleY, titleW, titleH)) {
          label('这次到这里', width / 2, titleY + titleH / 2, short ? 33 : 41,
            '#fff', 'center', 900, { width: 5, color: C.navy });
        }
      });
    const reasonY = safeTop + (short ? 107 : 158);
    const reasonW = short ? 120 : Math.round(150 * resultScale);
    const reasonH = short ? 45 : Math.round(54 * resultScale);
    artPill(view.isTimeout ? '时间到啦' : '体力耗尽',
      { x: (width - reasonW) / 2, y: reasonY, w: reasonW, h: reasonH },
      -3, short ? 21 : Math.round(29 * resultScale),
      '#cb2848', ['#fff', '#ffe4e9'], '#c67823');
    const scoreY = short ? 294 : Math.round(height * .544);
    const mascotBaseW = width * (short ? .36 : .71);
    const mascotBaseH = short ? 87 : mascotBaseW * 237 / 312;
    const mascotH = short ? mascotBaseH : Math.max(120, Math.min(mascotBaseH,
      scoreY - reasonY - reasonH - 14));
    const mascotW = mascotBaseW * mascotH / mascotBaseH;
    mascot('caring', (width - mascotW) / 2,
      scoreY - mascotH - (short ? 12 : 7), mascotW, mascotH, 'comfort', 110);
    const scoreH = short ? 68 : Math.round(109 * resultScale);
    const recap = view.recap || {};
    const record = recap.bestAfter || view.bestRecord;
    const panelMargin = short ? 14 : Math.round(18 * resultScale);
    const scoreRect = { x: panelMargin, y: scoreY,
      w: width - panelMargin * 2, h: scoreH };
    const scoreIntro = sceneProgress(190, 470);
    visual(scoreRect, lerp(.88, 1, easeOutBack(scoreIntro)), easeOutCubic(scoreIntro), () => {
      box(scoreRect.x, scoreRect.y + 7, scoreRect.w, scoreRect.h,
        C.navy, null, 17, 0);
      box(scoreRect.x, scoreRect.y + 4, scoreRect.w, scoreRect.h,
        '#e6ae24', null, 17, 0);
      box(scoreRect.x, scoreRect.y, scoreRect.w, scoreRect.h,
        gradient(0, scoreY, scoreH, '#fffefa', '#fff9ed'), C.navy, 17, 3);
      const levelText = `第 ${recap.level || view.board?.level || 1} 关`;
      const badgeW = short ? 70 : Math.round(96 * resultScale);
      const badgeH = short ? 15 : Math.round(20 * resultScale);
      const badgeY = scoreY + (short ? 4 : Math.round(6 * resultScale));
      box((width - badgeW) / 2, badgeY, badgeW, badgeH,
        gradient(0, badgeY, badgeH, '#d9edff', '#bcdcff'), null, badgeH / 2, 0);
      label(levelText, width / 2, badgeY + badgeH / 2,
        fittedTextSize(levelText, short ? 10.5 : 15 * resultScale,
          short ? 8.5 : 12 * resultScale, badgeW - 10, 900, RESULT_FONT),
        C.navy, 'center', 900, null, RESULT_FONT);
      const scoreArtH = short ? 31 : Math.round(52 * resultScale);
      const scoreArtY = scoreY + (short ? 17 : Math.round(24 * resultScale));
      const art = resultScoreArt(recap.score ?? view.score, width / 2,
        scoreArtY, scoreArtH, scoreRect.w - (short ? 38 : 78 * resultScale));
      const burstH = short ? 22 : Math.round(40 * resultScale);
      const burstW = burstH * 44 / 74;
      const burstY = scoreArtY + (scoreArtH - burstH) / 2;
      drawArt('resultBurst', Math.max(scoreRect.x + 7, art.left - burstW - 7),
        burstY, burstW, burstH);
      drawArt('resultBurstRight', Math.min(scoreRect.x + scoreRect.w - burstW - 7,
        art.right + 7), burstY, burstW, burstH);
      const recordText = recap.bestSaveStatus === 'unavailable' ?
        '本次纪录暂未保存' :
        `最高纪录 ${record?.bestLevel || 1} 关 · ${record?.bestScore || 0} 分`;
      const ribbonW = Math.min(scoreRect.w - 24,
        Math.round(scoreRect.w * (short ? .79 : .76)));
      const ribbonH = short ? 16 : Math.round(26 * resultScale);
      const ribbonY = scoreY + scoreH - ribbonH - (short ? 3 : 5);
      const ribbonX = (width - ribbonW) / 2;
      box(ribbonX, ribbonY, ribbonW, ribbonH,
        gradient(0, ribbonY, ribbonH, '#e8f5ff', '#c9e4ff'),
        null, ribbonH / 2, 0);
      const crownH = short ? 13 : Math.round(20 * resultScale);
      const crownW = crownH * 68 / 49;
      drawArt('resultCrown', ribbonX + (short ? 8 : 11 * resultScale),
        ribbonY + (ribbonH - crownH) / 2, crownW, crownH);
      const recordX = ribbonX + (short ? 12 : 15 * resultScale) + crownW;
      const recordWidth = ribbonW - (recordX - ribbonX) - (short ? 6 : 10 * resultScale);
      const recordFont = fittedTextSize(recordText,
        short ? 10.5 : 15 * resultScale, short ? 8 : 10 * resultScale,
        recordWidth, 900, RESULT_FONT);
      label(recordText, recordX + recordWidth / 2, ribbonY + ribbonH / 2,
        recordFont, C.navy, 'center', 900, null, RESULT_FONT);
    });
    const hasWrong = Boolean(recap.pressedButton) && !view.isTimeout;
    const recapY = scoreY + scoreH + (short ? 5 : Math.round(11 * resultScale)) +
      (hasWrong ? 0 : short ? 4 : Math.round(12 * resultScale));
    const recapH = hasWrong ? (short ? 60 : Math.round(82 * resultScale)) :
      (short ? 44 : Math.round(65 * resultScale));
    const recapRect = { x: panelMargin, y: recapY,
      w: width - panelMargin * 2, h: recapH };
    const recapLeft = recapRect.x + (short ? 12 : 20 * resultScale);
    const ruleText = String(recap.ruleText || '').replace(/[【】]/g, '');
    const prefix = '当时别按：';
    const ruleFont = fittedTextSize(prefix + ruleText,
      short ? 11.5 : 16 * resultScale, short ? 8 : 10 * resultScale,
      recapRect.w - (short ? 24 : 40 * resultScale), 900, RESULT_FONT);
    const ruleY = recapY + (hasWrong ? (short ? 18 : 25 * resultScale) : recapH / 2);
    const recapIntro = sceneProgress(270, 430);
    visual(recapRect, lerp(.94, 1, easeOutBack(recapIntro)),
      easeOutCubic(recapIntro), () => {
        box(recapRect.x, recapRect.y + 7, recapRect.w, recapRect.h,
          C.navy, null, 15, 0);
        box(recapRect.x, recapRect.y + 4, recapRect.w, recapRect.h,
          '#e6ae24', null, 15, 0);
        box(recapRect.x, recapRect.y, recapRect.w, recapRect.h,
          '#fffefa', C.navy, 15, 3);
        label(prefix, recapLeft, ruleY, ruleFont, C.navy, 'left', 900,
          null, RESULT_FONT);
        label(ruleText, recapLeft + textWidth(prefix, ruleFont, 900, RESULT_FONT),
          ruleY, ruleFont, '#e71d43', 'left', 900, null, RESULT_FONT);
        if (hasWrong) {
          const dividerY = recapY + (short ? 32 : 43 * resultScale);
          for (let px = recapLeft; px < width - recapLeft; px += 9) {
            ctx.fillStyle = '#c8d0da';
            ctx.fillRect(px, dividerY, 6, 1.5);
          }
          const wrongY = recapY + (short ? 45 : 61 * resultScale);
          const wrongPrefix = '这次误按：';
          const wrongText = String(recap.pressedButton.label || '');
          const wrongFont = fittedTextSize(wrongPrefix + wrongText,
            short ? 11.5 : 16 * resultScale, short ? 8 : 10 * resultScale,
            recapRect.w - (short ? 24 : 40 * resultScale), 900, RESULT_FONT);
          label(wrongPrefix, recapLeft, wrongY, wrongFont, C.navy, 'left', 900,
            null, RESULT_FONT);
          label(wrongText,
            recapLeft + textWidth(wrongPrefix, wrongFont, 900, RESULT_FONT),
            wrongY, wrongFont, '#e71d43', 'left', 900, null, RESULT_FONT);
        }
      }, 0, lerp(9, 0, easeOutCubic(recapIntro)));
    const bottom = height - (short ? Math.max(16, safeBottom + 6) : Math.max(35, safeBottom + 4));
    const actionX = short ? 18 : Math.round(19 * resultScale);
    const buttonH = short ? 48 : Math.round(60 * resultScale);
    const buttonGap = short ? 20 : Math.round(14 * resultScale);
    const homeY = bottom - buttonH;
    resultAction('再来一局', { x: actionX, y: homeY - buttonGap - buttonH,
      w: width - actionX * 2, h: buttonH }, 'reset', 'resultButtonRetry', 'primary');
    resultAction('返回首页', { x: actionX, y: homeY,
      w: width - actionX * 2, h: buttonH }, 'home', 'resultButtonHome', 'result-secondary');
  }
  function drawResume() {
    drawGame();
    hits = [];
    ctx.fillStyle = 'rgba(7,25,68,.7)';
    ctx.fillRect(0, 0, width, height);
    const y = height * .34;
    const card = { x: 22, y, w: width - 44, h: 190 };
    const intro = sceneProgress(0, 440);
    visual(card, lerp(.84, 1, easeOutBack(intro)), easeOutCubic(intro), () => {
      box(22, y, width - 44, 190, C.paper, C.navy, 17, 3);
      label('欢迎回来', width / 2, y + 43, 25, C.navy, 'center', 900);
      label(`第 ${view.board?.level || 1} 关还在等你。`, width / 2, y + 75, 14, C.navy, 'center', 800);
      label('规则、体力与剩余时间保持原样。', width / 2, y + 101, 12, C.navy, 'center', 700);
    });
    action('继续这一局', { x: 40, y: y + 121, w: width - 80, h: 51 }, 'resume');
  }
  function getDiagnosticScene() {
    if (view.mode !== 'game') return view.mode;
    if (motion.roundExit) return 'game-exit';
    // Keep the animation state intact; classify only its active time window.
    if (motion.roundEnter && Date.now() < motion.roundEnter.startedAt + motion.roundEnter.duration) return 'game-entry';
    for (const hazard of view.hazards?.hazards || []) {
      if (hazard.phase !== 'active') continue;
      if (hazard.type === 'button_glitch') return 'game-glitch';
      if (hazard.type === 'button_swap') return 'game-swap';
      if (hazard.type === 'moving_button') return 'game-drift';
    }
    return 'game';
  }
  function draw() {
    if (batchDepth) { drawPending = true; return; }
    if (motion.paused) return;
    const drawStarted = diagnostics?.beginDraw(getDiagnosticScene());
    drawRevision++;
    hits = [];
    if (view.mode === 'home') drawHome();
    else if (view.mode === 'help') drawHelp();
    else if (view.mode === 'settings') drawSettings();
    else if (view.mode === 'loading') drawLoading();
    else if (view.mode === 'resource-error') drawLoading(true);
    else if (view.mode === 'upgrade') drawUpgradeV23();
    else if (view.mode === 'gameover') drawResult();
    else if (view.mode === 'resume') drawResume();
    else drawGame();
    if (diagnostics) diagnostics.endDraw(drawStarted);
    scheduleMotion();
  }
  const renderer = {
    resetRoundMotion() {
      glitchCache.clear(); blockedTileRects=[];
      motion.gameCharacterStartedAt = 0;
      motion.roundExit = null;
      motion.roundEnter = null;
      motion.scoreTween = null; motion.hpTween = null; motion.progressTween = null;
      motion.comboExit = null;
      view.combat = null;
    },
    beginRoundExit() {
      if (!canAnimate || view.mode !== 'game' || !view.board) return undefined;
      const duration = 180 + Math.max(0, view.board.buttons.length - 1) * 45;
      motion.roundEnter = null;
      motion.roundExit = { startedAt: Date.now(), duration };
      animateFor(duration + 35);
      draw();
      return Math.max(600, duration + 60);
    },
    renderBoard({ buttons, forbiddenIds, difficulty, ruleText, level, score }) {
      const firstBoard = !canAnimate || !motion.gameCharacterStartedAt;
      view.board = { buttons, forbiddenIds, difficulty, ruleText, level };
      view.score = score; view.upgradeLocked = false; view.recordSaveFailed = false;
      motion.tilePressAt.clear(); motion.tileSuccessAt.clear();
      motion.roundExit = null;
      if (firstBoard) {
        motion.gameCharacterStartedAt = Date.now();
        motion.roundEnter = null;
        enterScene('game', 650);
        return 0;
      }
      const duration = 230 + Math.max(0, buttons.length - 1) * 45;
      motion.roundEnter = { startedAt: Date.now(), duration };
      view.mode = 'game';
      animateFor(duration + 30);
      draw();
      return duration + 30;
    },
    renderFailureRecap(recap) { view.recap = recap; },
    updateBestRecordUi(record, note = '') { view.bestRecord = record; view.bestNote = note; draw(); },
    updateCombatStatus(facts) {
      const now = Date.now();
      if (view.combat?.combo?.hasVisibleCombo && !facts?.combo?.hasVisibleCombo) {
        const previousCombo = view.combat.combo;
        const count = Math.max(2, previousCombo.streak || previousCombo.chainCount || 2);
        motion.comboExit = { count,
          capped: Boolean(previousCombo.isCapped || count >= (Number(previousCombo.maxStreak) || 12)),
          startedAt: now };
        animateFor(240);
      } else if (facts?.combo?.hasVisibleCombo) motion.comboExit = null;
      const oldPlayer = view.combat?.player;
      const oldCombat = view.combat?.combat;
      const oldHp = oldPlayer?.hp;
      const nextHp = facts?.player?.hp;
      if (Number.isFinite(oldHp) && Number.isFinite(nextHp) && oldHp !== nextHp) {
        motion.hpTween = startTween(tweenValue(motion.hpTween, oldHp, now), nextHp, 440);
        motion.healthPulseAt = now;
        animateFor(480);
      }
      const oldProgress = oldCombat?.maxHp - oldCombat?.hp;
      const nextProgress = facts?.combat?.maxHp - facts?.combat?.hp;
      if (oldCombat?.maxHp === facts?.combat?.maxHp &&
          Number.isFinite(oldProgress) && Number.isFinite(nextProgress) &&
          oldProgress !== nextProgress) {
        motion.progressTween = startTween(
          tweenValue(motion.progressTween, oldProgress, now), nextProgress, 450);
        motion.progressPulseAt = now;
        animateFor(490);
      } else if (oldCombat?.maxHp !== facts?.combat?.maxHp) motion.progressTween = null;
      view.combat = facts; draw();
    },
    updateHazardPresentation(hazards) { view.hazards = hazards; },
    canPressButton(id) { return !blockedTileRects.some(r=>r.id===id); },
    showBossHit() { motion.progressPulseAt = Date.now(); shake(2.5, 190); draw(); },
    showPlayerHit() { motion.healthPulseAt = Date.now(); shake(5, 280); draw(); },
    showSafePressFeedback() {
      if (view.lastPressedId) motion.tileSuccessAt.set(view.lastPressedId, Date.now());
      motion.preComboPulseUntil = Date.now() + 420;
      animateFor(450); draw();
    },
    showWrongPressFeedback() {
      view.wrongButtonId = view.lastPressedId;
      view.wrongUntil = Date.now() + 700;
      shake(6, 360);
      draw();
    },
    showComboReward() {
      if (view.lastPressedId) motion.tileSuccessAt.set(view.lastPressedId, Date.now());
      view.comboPulseUntil = Date.now() + 550; animateFor(570); draw();
    },
    updateComboWindow(value) { view.comboWindow = value; },
    updateTimer(timeLeft, timeLimit, comboWindow) {
      view.timeLeft = timeLeft; view.timeLimit = timeLimit; view.comboWindow = comboWindow; draw();
    },
    updateScore(score) {
      if (score !== view.score) {
        motion.scoreTween = startTween(tweenValue(motion.scoreTween, view.score), score, 390);
        motion.scorePulseAt = Date.now(); animateFor(440);
      }
      view.score = score; draw();
    },
    hideStartScreen() { if (view.mode === 'home') view.mode = 'game'; },
    hideGameOverScreen() { if (view.mode === 'gameover') view.mode = 'game'; },
    showPlaytestReportExport() {}, clearPlaytestReportExport() {},
    showUpgradeScreen({ choices }) {
      view.upgradeChoices = choices; view.upgradeLocked = false; view.selectedUpgradeId = null;
      enterScene('upgrade', 650);
    },
    showUpgradeReward({ upgrade }) {
      view.upgradeLocked = true;
      view.selectedUpgradeId = upgrade?.id || null;
      motion.upgradeSelectAt = Date.now(); animateFor(460);
      draw();
    },
    hideUpgradeScreen() {},
    showGameOverScreen({ isTimeout, recap }) {
      view.recap = recap; view.isTimeout = isTimeout;
      view.recordSaveFailed = recap?.bestSaveStatus === 'unavailable';
      enterScene('gameover', 740);
    },
    setWarningVisible(value) { view.warning = value; },
    resetFailureShake() { motion.shakeUntil = 0; motion.shakeStrength = 0; },
    setFailureShake() { shake(8, 520); draw(); },
    playInteractionShake() { animateFor(180); },
    markButtonPressed(id) {
      view.lastPressedId = id;
      if (id) motion.tilePressAt.set(id, Date.now());
      animateFor(270);
    },
    markButtonExploded(id) {
      if (id) { view.wrongButtonId = id; view.wrongUntil = Date.now() + 700; }
      shake(8, 500);
    },
    getButtonElement(id) { return id; }
  };
  draw();
  return {
    renderer, width, height, safeTop, safeBottom, draw, batch, getDiagnosticScene,
    setDiagnostics(value) { diagnostics = value; draw(); },
    getView: () => view,
    hitTest(x, y) {
      const camera = view.mode === 'game' ? cameraOffset() : { x: 0, y: 0 };
      if(view.mode==='game' && blockedTileRects.some(r=>within(r,x-camera.x,y-camera.y)))return null;
      for (let i = hits.length - 1; i >= 0; i--) {
        if (within(hits[i].rect, x - camera.x, y - camera.y)) return hits[i].action;
      }
      return null;
    },
    showHome() { enterScene('home', 650); },
    showHelp() { enterScene('help', 680); },
    showSettings() { enterScene('settings', 580); },
    showResume() { enterScene('resume', 500); },
    resumeGame() { enterScene('game', 360); },
    showResourceError(failedAssets = []) {
      view.failedAssets = failedAssets; enterScene('resource-error', 470);
    },
    showLoading() { view.mode = 'loading'; draw(); },
    setImages(images) {
      ruleLayout = null; textWidths.clear(); glitchCache.clear();
      view.images = images; textAtlas.setImage(images.textAtlas); draw();
    },
    getTextAtlasStatus: () => textAtlas.status(),
    setTextAtlasOptions(options) {
      textAtlas.setOptions(options); ruleLayout = null; glitchCache.clear(); draw();
    },
    setSettings(settings) { view.settings = { ...view.settings, ...settings }; draw(); },
    playActionFeedback(action) {
      if (!canAnimate || !action) return;
      motion.actionTap = { type: action.type, at: Date.now() };
      if (action.type === 'toggle') {
        motion.toggleKey = action.key;
        motion.toggleFrom = Boolean(view.settings[action.key]);
        motion.toggleAt = Date.now();
      }
      animateFor(290);
    },
    setMotionPaused(paused) {
      motion.paused = Boolean(paused);
      if (motion.paused && motion.timer) { clearTimeout(motion.timer); motion.timer = null; }
      if (!motion.paused) { draw(); scheduleMotion(); }
    }
  };
}
