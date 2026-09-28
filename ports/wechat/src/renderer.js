const COLORS = {
  red: '#ff5b55',
  blue: '#5caeff',
  yellow: '#f2c94c',
  purple: '#c18aff'
};

function clamp(value, min, max) {
  return Math.max(min, Math.min(max, value));
}

function inside(rect, x, y) {
  return x >= rect.x && y >= rect.y && x <= rect.x + rect.w && y <= rect.y + rect.h;
}

export function createCanvasRenderer({ canvas, info }) {
  const width = Math.max(280, info.windowWidth || info.screenWidth || 390);
  const height = Math.max(480, info.windowHeight || info.screenHeight || 844);
  const pixelRatio = clamp(info.pixelRatio || 1, 1, 3);
  const safeTop = Math.max(12, info.safeArea?.top || 12);
  const safeBottom = Math.max(12, height - (info.safeArea?.bottom || height));
  canvas.width = Math.round(width * pixelRatio);
  canvas.height = Math.round(height * pixelRatio);
  const ctx = canvas.getContext('2d');
  if (typeof ctx.setTransform === 'function') {
    ctx.setTransform(pixelRatio, 0, 0, pixelRatio, 0, 0);
  } else {
    ctx.scale(pixelRatio, pixelRatio);
  }

  const view = {
    mode: 'start',
    board: null,
    combat: null,
    hazards: null,
    timeLeft: 0,
    timeLimit: 1,
    comboWindow: null,
    score: 0,
    bestRecord: null,
    bestNote: '',
    warning: false,
    upgradeChoices: [],
    recap: null,
    isTimeout: false,
    toast: '',
    toastUntil: 0
  };
  let hitRects = [];

  function text(value, x, y, size = 15, color = '#d3f5d0', align = 'left', bold = false) {
    ctx.fillStyle = color;
    ctx.font = `${bold ? 'bold ' : ''}${size}px sans-serif`;
    ctx.textAlign = align;
    ctx.textBaseline = 'middle';
    ctx.fillText(String(value), x, y);
  }

  function panel(x, y, w, h, border = '#265c39', fill = '#101a14') {
    ctx.fillStyle = fill;
    ctx.fillRect(x, y, w, h);
    ctx.strokeStyle = border;
    ctx.lineWidth = 1;
    ctx.strokeRect(x + 0.5, y + 0.5, w - 1, h - 1);
  }

  function meter(x, y, w, h, value, max, color) {
    ctx.fillStyle = '#25332a';
    ctx.fillRect(x, y, w, h);
    ctx.fillStyle = color;
    ctx.fillRect(x, y, w * clamp(max > 0 ? value / max : 0, 0, 1), h);
  }

  function wrapped(value, x, y, maxWidth, lineHeight, maxLines = 2, color = '#d3f5d0') {
    const chars = [...String(value || '')];
    let line = '';
    let lineIndex = 0;
    ctx.font = 'bold 17px sans-serif';
    for (const char of chars) {
      if (line && ctx.measureText(line + char).width > maxWidth) {
        text(line, x, y + lineIndex * lineHeight, 17, color, 'left', true);
        line = '';
        lineIndex++;
        if (lineIndex >= maxLines) return;
      }
      line += char;
    }
    if (line && lineIndex < maxLines) {
      text(line, x, y + lineIndex * lineHeight, 17, color, 'left', true);
    }
  }

  function actionButton(label, rect, action, color = '#4af626') {
    panel(rect.x, rect.y, rect.w, rect.h, color, '#14301b');
    text(label, rect.x + rect.w / 2, rect.y + rect.h / 2, 18, '#f4fff0', 'center', true);
    hitRects.push({ rect, action });
  }

  function drawBoard() {
    const board = view.board;
    if (!board) return;
    const margin = 18;
    const headerY = safeTop + 6;
    text('THAT BUTTON', margin, headerY + 13, 19, '#4af626', 'left', true);
    text(`L${board.level}  /  ${view.score}`, width - margin, headerY + 13, 15, '#e4f3d9', 'right', true);

    const enemyY = headerY + 36;
    panel(margin, enemyY, width - margin * 2, 92);
    const combat = view.combat?.combat;
    const player = view.combat?.player;
    const combo = view.combat?.combo;
    text(combat?.enemyName || 'REACTOR WARDEN', margin + 12, enemyY + 19, 15, '#e4f3d9', 'left', true);
    text(combat?.stageLabel || '', width - margin - 12, enemyY + 19, 12, '#8de4a4', 'right');
    meter(margin + 12, enemyY + 38, width - margin * 2 - 24, 10, combat?.hp || 0, combat?.maxHp || 1, '#ff625c');
    text(`BOSS ${combat?.hp ?? '--'}/${combat?.maxHp ?? '--'}`, margin + 12, enemyY + 65, 12, '#f4d5d2');
    text(`ATK ${combat?.attack ?? '--'}`, width - margin - 12, enemyY + 65, 12, '#f4d5d2', 'right');

    const playerY = enemyY + 100;
    panel(margin, playerY, width - margin * 2, 46);
    text(`HP ${player?.hp ?? '--'}/${player?.maxHp ?? '--'}`, margin + 10, playerY + 16, 13, '#d4edff', 'left', true);
    text(combo?.statusText || 'CHAIN --', width - margin - 10, playerY + 16, 13, '#f2c94c', 'right', true);
    meter(margin + 10, playerY + 30, width - margin * 2 - 20, 6, player?.hp || 0, player?.maxHp || 1, '#5caeff');

    const clueY = playerY + 54;
    panel(margin, clueY, width - margin * 2, 88, '#56844d');
    text('禁止按键 / DO NOT PRESS', margin + 12, clueY + 17, 12, '#ff8d83', 'left', true);
    wrapped(board.ruleText, margin + 12, clueY + 45, width - margin * 2 - 24, 24, 2);

    const gridY = clueY + 99;
    const cols = board.difficulty.cols;
    const rows = board.difficulty.rows;
    const gap = 8;
    const availableHeight = Math.max(150, height - safeBottom - gridY - 64);
    const cell = Math.max(48, Math.min(
      104,
      (width - margin * 2 - gap * (cols - 1)) / cols,
      (availableHeight - gap * (rows - 1)) / rows
    ));
    const gridWidth = cell * cols + gap * (cols - 1);
    const gridX = (width - gridWidth) / 2;
    const gridHeight = cell * rows + gap * (rows - 1);
    const movement = view.hazards?.hazards?.find((hazard) =>
      hazard.type === 'moving_button' && hazard.phase === 'active');

    board.buttons.forEach((button, index) => {
      const col = index % cols;
      const row = Math.floor(index / cols);
      const moving = movement?.targetButtonIds?.includes(button.id);
      const dx = moving ? clamp(movement.motion?.offsetXPx || 0, -6, 6) : 0;
      const dy = moving ? clamp(movement.motion?.offsetYPx || 0, -6, 6) : 0;
      const rect = {
        x: gridX + col * (cell + gap) + dx,
        y: gridY + row * (cell + gap) + dy,
        w: cell,
        h: cell
      };
      const color = COLORS[button.color?.id] || '#4af626';
      panel(rect.x, rect.y, rect.w, rect.h, button.isClicked ? '#3a4c40' : color,
        button.isClicked ? '#101712' : '#1d2b21');
      text(String(button.number).padStart(2, '0'), rect.x + 9, rect.y + 14, 13,
        button.isClicked ? '#647467' : color, 'left', true);
      text(button.shape?.char || '?', rect.x + cell / 2, rect.y + cell / 2 + 8,
        Math.round(clamp(cell * 0.43, 25, 43)), button.isClicked ? '#526555' : color, 'center', true);
      if (!button.isClicked) hitRects.push({ rect, action: { type: 'press', buttonId: button.id } });
    });

    const boardInterference = view.hazards?.hazards?.some((hazard) =>
      hazard.type === 'interference' && hazard.phase === 'active');
    if (boardInterference) {
      ctx.fillStyle = 'rgba(74,246,38,0.06)';
      for (let y = gridY + 3; y < gridY + gridHeight; y += 10) {
        ctx.fillRect(gridX, y, gridWidth, 2);
      }
    }

    const footerY = Math.min(height - safeBottom - 16, gridY + gridHeight + 25);
    meter(margin, footerY - 16, width - margin * 2, 8, view.timeLeft, view.timeLimit,
      view.timeLeft / view.timeLimit < 0.28 ? '#ff625c' : '#4af626');
    text(`TIME ${(Math.max(0, view.timeLeft) / 1000).toFixed(1)}s`, margin, footerY + 3, 12, '#d4e8d2');
    text(`SAFE ${board.buttons.filter((button) => !button.isClicked && !board.forbiddenIds?.includes(button.id)).length}`,
      width - margin, footerY + 3, 12, '#d4e8d2', 'right');
    if (view.warning || view.hazards?.phase === 'active') {
      text(view.hazards?.phase === 'active' ? 'HAZARD ACTIVE' : 'CRITICAL',
        width / 2, footerY + 3, 11, '#ff918a', 'center', true);
    }
  }

  function drawOverlay() {
    if (view.mode === 'game') return;
    hitRects = [];
    ctx.fillStyle = 'rgba(0,0,0,0.84)';
    ctx.fillRect(0, 0, width, height);
    const x = 24;
    const w = width - 48;
    if (view.mode === 'start') {
      const y = Math.max(safeTop + 28, height * 0.22);
      panel(x, y, w, 322, '#4af626');
      text('THAT BUTTON', width / 2, y + 46, 26, '#4af626', 'center', true);
      text('核心熔毁：那个键', width / 2, y + 84, 17, '#f0f8e9', 'center', true);
      text('读懂禁止条件，按完所有安全按钮。', width / 2, y + 136, 14, '#d4e8d2', 'center');
      text('误按会受伤；计时归零则挑战结束。', width / 2, y + 166, 14, '#d4e8d2', 'center');
      const best = view.bestRecord;
      text(`BEST  L${best?.bestLevel || 1}  /  ${best?.bestScore || 0}`, width / 2,
        y + 212, 14, '#f2c94c', 'center', true);
      actionButton('开始游戏', { x: x + 20, y: y + 248, w: w - 40, h: 54 }, { type: 'start' });
    } else if (view.mode === 'upgrade') {
      const y = Math.max(safeTop + 20, height * 0.15);
      const cardHeight = 66;
      const gap = 12;
      const panelHeight = 120 + view.upgradeChoices.length * (cardHeight + gap);
      panel(x, y, w, panelHeight, '#f2c94c');
      text('ENCOUNTER CLEAR', width / 2, y + 40, 21, '#f2c94c', 'center', true);
      text('选择一项升级', width / 2, y + 73, 15, '#e5eee1', 'center');
      view.upgradeChoices.forEach((choice, index) => {
        const rect = { x: x + 16, y: y + 99 + index * (cardHeight + gap), w: w - 32, h: cardHeight };
        panel(rect.x, rect.y, rect.w, rect.h, '#a18645', '#252416');
        text(choice.label, rect.x + 12, rect.y + 23, 15, '#fff2c7', 'left', true);
        text(`${choice.shortLabel}  +${choice.value}`, rect.x + 12, rect.y + 46, 12, '#d8c38b');
        hitRects.push({ rect, action: { type: 'upgrade', upgradeId: choice.id } });
      });
    } else if (view.mode === 'gameover') {
      const y = Math.max(safeTop + 28, height * 0.2);
      panel(x, y, w, 342, '#ff625c');
      text('SYSTEM FAILURE', width / 2, y + 45, 25, '#ff625c', 'center', true);
      text(view.isTimeout ? '倒计时归零' : '禁止按键触发', width / 2, y + 93, 17,
        '#f4e8e3', 'center', true);
      text(`LEVEL ${view.recap?.level || view.board?.level || 1}`, width / 2, y + 149, 17,
        '#dcebd7', 'center');
      text(`SCORE ${view.recap?.score || view.score}`, width / 2, y + 184, 17,
        '#dcebd7', 'center');
      text(`BEST  L${view.bestRecord?.bestLevel || 1}  /  ${view.bestRecord?.bestScore || 0}`,
        width / 2, y + 223, 14, '#f2c94c', 'center', true);
      actionButton('重新开始', { x: x + 20, y: y + 269, w: w - 40, h: 54 }, { type: 'reset' });
    }
  }

  function draw() {
    hitRects = [];
    ctx.fillStyle = '#050807';
    ctx.fillRect(0, 0, width, height);
    ctx.fillStyle = 'rgba(74,246,38,0.045)';
    for (let y = 1; y < height; y += 5) ctx.fillRect(0, y, width, 1);
    drawBoard();
    drawOverlay();
    if (view.toast && Date.now() < view.toastUntil && view.mode === 'game') {
      panel(44, height - safeBottom - 97, width - 88, 35, '#9ac981', '#14261a');
      text(view.toast, width / 2, height - safeBottom - 79, 13, '#eaffdd', 'center', true);
    }
  }

  function flash(message, duration = 650) {
    view.toast = message;
    view.toastUntil = Date.now() + duration;
    draw();
  }

  const renderer = {
    renderBoard({ buttons, forbiddenIds, difficulty, ruleText, level, score }) {
      view.board = { buttons, forbiddenIds, difficulty, ruleText, level };
      view.score = score;
      view.mode = 'game';
      draw();
    },
    renderFailureRecap(recap) { view.recap = recap; },
    updateBestRecordUi(record, note = '') { view.bestRecord = record; view.bestNote = note; draw(); },
    updateCombatStatus(facts) { view.combat = facts; draw(); },
    updateHazardPresentation(hazards) { view.hazards = hazards; },
    showBossHit({ damage, defeated }) {
      flash(defeated ? 'BOSS DEFEATED' : `HIT -${damage?.appliedDamage || 0}`);
    },
    showPlayerHit({ damage }) { flash(`HP -${damage?.appliedDamage || 0}`); },
    showSafePressFeedback() { flash('SAFE'); },
    showWrongPressFeedback({ damage }) { flash(`WRONG  HP -${damage?.appliedDamage || 0}`); },
    showComboReward({ combo }) { flash(combo?.rewardText || combo?.comboText || 'COMBO'); },
    updateComboWindow(comboWindow) { view.comboWindow = comboWindow; },
    updateTimer(timeLeft, timeLimit, comboWindow) {
      view.timeLeft = timeLeft;
      view.timeLimit = timeLimit;
      view.comboWindow = comboWindow;
      draw();
    },
    updateScore(score) { view.score = score; },
    hideStartScreen() { if (view.mode === 'start') view.mode = 'game'; },
    hideGameOverScreen() { if (view.mode === 'gameover') view.mode = 'game'; },
    showPlaytestReportExport() {},
    clearPlaytestReportExport() {},
    showUpgradeScreen({ choices }) { view.upgradeChoices = choices; view.mode = 'upgrade'; draw(); },
    showUpgradeReward({ upgrade }) { flash(`${upgrade?.shortLabel || 'UPGRADE'} +${upgrade?.value || 0}`); },
    hideUpgradeScreen() { if (view.mode === 'upgrade') view.mode = 'game'; },
    showGameOverScreen({ isTimeout, recap }) {
      view.mode = 'gameover';
      view.recap = recap;
      view.isTimeout = isTimeout;
      draw();
    },
    setWarningVisible(visible) { view.warning = visible; },
    resetFailureShake() {},
    setFailureShake() {},
    playInteractionShake() {},
    markButtonPressed() {},
    markButtonExploded() {},
    getButtonElement() { return null; }
  };

  draw();
  return {
    renderer,
    hitTest(x, y) {
      for (let index = hitRects.length - 1; index >= 0; index--) {
        if (inside(hitRects[index].rect, x, y)) return hitRects[index].action;
      }
      return null;
    },
    getView: () => view,
    draw,
    width,
    height
  };
}
