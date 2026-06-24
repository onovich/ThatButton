function escapeHtml(value) {
  return String(value)
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#39;');
}

function getFailureResultText(recap) {
  if (recap.result === 'victory') {
    return `VICTORY: L${recap.level} / ${recap.score} pts`;
  }
  if (recap.bestComparison === 'new_best') {
    return `NEW BEST：L${recap.bestAfter.bestLevel} / ${recap.bestAfter.bestScore} 分`;
  }
  if (recap.bestComparison === 'matched_best') {
    return `MATCHED BEST：L${recap.bestBefore.bestLevel} / ${recap.bestBefore.bestScore} 分`;
  }
  return `BEST：L${recap.bestBefore.bestLevel} / ${recap.bestBefore.bestScore} 分`;
}

function getCombatRecapRows(recap) {
  if (!recap.player && !recap.combat && !recap.combo && !recap.lastPlayerDamage && !recap.lastDamage) {
    return '';
  }
  const playerLine = recap.player
    ? `<div class="failure-recap-row">PLAYER: ${recap.player.hp}/${recap.player.maxHp}</div>`
    : '';
  const playerDamageLine = recap.lastPlayerDamage
    ? `<div class="failure-recap-row">PLAYER DAMAGE: -${recap.lastPlayerDamage.appliedDamage}</div>`
    : '';
  const combatLine = recap.combat
    ? `<div class="failure-recap-row">BOSS: ${escapeHtml(recap.combat.bossName)} ${recap.combat.hp}/${recap.combat.maxHp}</div>`
    : '';
  const damageLine = recap.lastDamage
    ? `<div class="failure-recap-row">DAMAGE: ${recap.lastDamage.appliedDamage} (${recap.lastDamage.baseDamage}+${recap.lastDamage.timeBonus}+${recap.lastDamage.comboBonus})</div>`
    : '';
  const comboLine = recap.combo
    ? `<div class="failure-recap-row">COMBO: ${escapeHtml(recap.combo.comboText || recap.combo.statusText || 'CHAIN --')} / +${recap.combo.damageBonus}</div>`
    : '';
  return `${playerLine}${playerDamageLine}${combatLine}${damageLine}${comboLine}`;
}

export function createRenderer({ document, timers = {}, random = Math.random, audio }) {
  const schedule = timers.setTimeout || setTimeout;
  const cancelSchedule = timers.clearTimeout || clearTimeout;
  const refs = {
    gridEl: document.getElementById('btn-grid'),
    clueEl: document.getElementById('clue-text'),
    timerBarEl: document.getElementById('timer-bar'),
    comboWindowBar: document.getElementById('combo-window-bar'),
    levelDisplay: document.getElementById('level-display'),
    scoreDisplay: document.getElementById('score-display'),
    warningText: document.getElementById('warning-text'),
    bestLevelDisplay: document.getElementById('best-level-display'),
    bestScoreDisplay: document.getElementById('best-score-display'),
    bestStatusNote: document.getElementById('best-status-note'),
    commandPanel: document.getElementById('command-panel'),
    battleStage: document.getElementById('battle-stage'),
    combatStatus: document.getElementById('combat-status'),
    bossAvatarShell: document.getElementById('boss-avatar-shell'),
    bossHpText: document.getElementById('boss-hp-text'),
    bossHpBar: document.getElementById('boss-hp-bar'),
    bossDamageText: document.getElementById('boss-damage-text'),
    bossAttackLayer: document.getElementById('boss-attack-layer'),
    playerHud: document.getElementById('player-hud'),
    playerHpText: document.getElementById('player-hp-text'),
    playerHpBar: document.getElementById('player-hp-bar'),
    enemyAttackText: document.getElementById('enemy-attack-text'),
    playerDamageText: document.getElementById('player-damage-text'),
    comboStatusText: document.getElementById('combo-status-text'),
    comboRewardText: document.getElementById('combo-reward-text'),
    comboParticleLayer: document.getElementById('combo-particle-layer'),
    hazardLayer: document.getElementById('hazard-layer'),
    hazardStatusText: document.getElementById('hazard-status-text'),
    failureRecapEl: document.getElementById('failure-recap'),
    startScreen: document.getElementById('start-screen'),
    gameOverScreen: document.getElementById('game-over-screen'),
    upgradeScreen: document.getElementById('upgrade-screen'),
    upgradeChoiceList: document.getElementById('upgrade-choice-list'),
    finalLevel: document.getElementById('final-level'),
    deathReason: document.getElementById('death-reason'),
    resultTitle: document.getElementById('result-title'),
    resultSubtitle: document.getElementById('result-subtitle')
  };
  let typewriterTimeout = null;
  let comboRewardTimeout = null;
  let comboImpactTimeout = null;
  let comboShakeTimeout = null;
  let wrongPressFlashTimeout = null;
  let hazardMotionButtonIds = new Set();
  const terminalGlyphs = ['>', '/', '+', '#'];

  function removeNode(node) {
    if (node && typeof node.remove === 'function') {
      node.remove();
    }
  }

  function getComboRewardKind({ previous, combo, capped }) {
    if (capped) {
      return {
        label: `MAX COMBO x${combo.streak}`,
        className: 'max-combo',
        color: '#ffffff',
        strong: true
      };
    }
    if (combo.streak === 2) {
      return {
        label: `${combo.comboText} ${combo.rewardText}`.trim(),
        className: 'combo-stage-two',
        color: 'var(--crt-yellow)',
        strong: true
      };
    }
    if (combo.streak >= 3) {
      return {
        label: `${combo.comboText} ${combo.rewardText}`.trim(),
        className: 'combo-stage-high',
        color: '#ffffff',
        strong: true
      };
    }
    if (combo.rewardText && combo.damageBonus > previous.damageBonus) {
      return {
        label: combo.rewardText,
        className: 'damage-bonus',
        color: 'var(--crt-yellow)',
        strong: true
      };
    }
    return {
      label: combo.comboText || 'CHAIN BONUS',
      className: '',
      color: 'var(--crt-green)',
      strong: false
    };
  }

  function spawnButtonToEnemyTracers({
    sourceElement = null,
    color = 'var(--crt-green)',
    strong = false,
    combo = false,
    count = null
  } = {}) {
    if (!sourceElement || !document.body || typeof document.body.appendChild !== 'function') return false;
    const source = getElementCenter(sourceElement);
    const target = getElementCenter(refs.bossAvatarShell);
    if (!source || !target) return false;

    const tracerCount = count || (strong ? 14 : 7);
    for (let index = 0; index < tracerCount; index++) {
      const tracer = document.createElement('span');
      const isGlyph = combo && index % 5 === 0;
      const targetJitterX = (random() - 0.5) * target.width * (strong ? 0.42 : 0.28);
      const targetJitterY = (random() - 0.5) * target.height * (strong ? 0.42 : 0.28);
      const sourceJitterX = (random() - 0.5) * source.width * 0.2;
      const sourceJitterY = (random() - 0.5) * source.height * 0.2;
      const dx = (target.x + targetJitterX) - (source.x + sourceJitterX);
      const dy = (target.y + targetJitterY) - (source.y + sourceJitterY);
      const angle = Math.atan2(dy, dx);
      tracer.className = [
        'button-combo-spark',
        'button-to-enemy-tracer',
        'retro-crt-tracer',
        combo ? 'combo-directional-tracer' : '',
        isGlyph ? 'terminal-glyph-fragment' : (index % 2 === 0 ? 'pixel-spark' : 'scanline-streak')
      ].filter(Boolean).join(' ');
      if (isGlyph) {
        tracer.textContent = terminalGlyphs[index % terminalGlyphs.length];
      }
      tracer.style.left = `${source.x + sourceJitterX}px`;
      tracer.style.top = `${source.y + sourceJitterY}px`;
      tracer.style.setProperty('--dx', `${dx}px`);
      tracer.style.setProperty('--dy', `${dy}px`);
      tracer.style.setProperty('--tracer-angle', `${angle}rad`);
      tracer.style.setProperty('--particle-color', color);
      tracer.style.setProperty('--particle-size', `${strong ? 7 : 5}px`);
      tracer.style.setProperty('--tracer-width', `${strong ? 24 : 17}px`);
      tracer.style.setProperty('--tracer-height', `${strong ? 5 : 4}px`);
      document.body.appendChild(tracer);
      schedule(() => removeNode(tracer), 820);
    }
    return true;
  }

  function spawnComboParticles({ strong, color, sourceElement = null }) {
    if (spawnButtonToEnemyTracers({
      sourceElement,
      color,
      strong,
      combo: true,
      count: strong ? 18 : 10
    })) {
      return;
    }
    if (!refs.comboParticleLayer || typeof refs.comboParticleLayer.appendChild !== 'function') return;
    const width = refs.combatStatus?.clientWidth || 280;
    const height = refs.combatStatus?.clientHeight || 44;
    const originX = Math.max(42, width - 36);
    const originY = Math.max(12, height * 0.42);
    const count = strong ? 16 : 9;

    for (let index = 0; index < count; index++) {
      const particle = document.createElement('span');
      const angle = (200 + random() * 140) * (Math.PI / 180);
      const distance = (strong ? 34 : 24) + random() * (strong ? 32 : 22);
      particle.className = 'combo-particle retro-crt-tracer pixel-spark';
      particle.style.left = `${originX}px`;
      particle.style.top = `${originY}px`;
      particle.style.setProperty('--dx', `${Math.cos(angle) * distance}px`);
      particle.style.setProperty('--dy', `${Math.sin(angle) * distance}px`);
      particle.style.setProperty('--particle-color', color);
      particle.style.setProperty('--particle-size', `${strong ? 7 : 5}px`);
      refs.comboParticleLayer.appendChild(particle);
      schedule(() => removeNode(particle), 900);
    }
  }

  function spawnButtonReward({ sourceElement, label, className, color, strong, directional = false, combo = false }) {
    if (!sourceElement || typeof sourceElement.getBoundingClientRect !== 'function') return;
    if (!document.body || typeof document.body.appendChild !== 'function') return;
    const rect = sourceElement.getBoundingClientRect();
    if (!rect.width || !rect.height) return;
    const originX = rect.left + rect.width / 2;
    const originY = rect.top + rect.height * 0.46;
    const floatText = document.createElement('span');
    floatText.className = `button-float-text ${className}`.trim();
    floatText.innerText = label;
    floatText.style.left = `${originX}px`;
    floatText.style.top = `${originY}px`;
    document.body.appendChild(floatText);
    schedule(() => removeNode(floatText), 900);
    if (directional) {
      spawnButtonToEnemyTracers({ sourceElement, color, strong, combo });
    }

    const sparkCount = directional ? (strong ? 5 : 3) : (strong ? 14 : 8);
    for (let index = 0; index < sparkCount; index++) {
      const spark = document.createElement('span');
      const angle = random() * Math.PI * 2;
      const distance = rect.width * (0.22 + random() * (strong ? 0.48 : 0.32));
      spark.className = `button-combo-spark retro-crt-tracer ${index % 2 === 0 ? 'pixel-spark' : 'scanline-streak'}`;
      spark.style.left = `${originX}px`;
      spark.style.top = `${originY}px`;
      spark.style.setProperty('--dx', `${Math.cos(angle) * distance}px`);
      spark.style.setProperty('--dy', `${Math.sin(angle) * distance}px`);
      spark.style.setProperty('--tracer-angle', `${angle}rad`);
      spark.style.setProperty('--particle-color', color);
      spark.style.setProperty('--particle-size', `${strong ? 7 : 5}px`);
      document.body.appendChild(spark);
      schedule(() => removeNode(spark), 780);
    }
  }

  function triggerVibration(pattern) {
    const vibrate = document.defaultView?.navigator?.vibrate;
    if (typeof vibrate === 'function') {
      vibrate.call(document.defaultView.navigator, pattern);
    }
  }

  function flashWrongPress() {
    if (wrongPressFlashTimeout !== null) {
      cancelSchedule(wrongPressFlashTimeout);
    }
    document.body.classList.remove('wrong-press-flash');
    void document.body.offsetWidth;
    document.body.classList.add('wrong-press-flash');
    wrongPressFlashTimeout = schedule(() => {
      document.body.classList.remove('wrong-press-flash');
      wrongPressFlashTimeout = null;
    }, 260);
  }

  function getElementCenter(element) {
    if (!element || typeof element.getBoundingClientRect !== 'function') return null;
    const rect = element.getBoundingClientRect();
    if (!rect.width || !rect.height) return null;
    return {
      x: rect.left + rect.width / 2,
      y: rect.top + rect.height / 2,
      width: rect.width,
      height: rect.height
    };
  }

  function toDatasetToken(value, fallback = 'none') {
    const token = String(value || fallback)
      .trim()
      .toLowerCase()
      .replace(/[^a-z0-9_-]+/g, '-')
      .replace(/^-+|-+$/g, '');
    return token || fallback;
  }

  function getElementRect(element) {
    if (!element || typeof element.getBoundingClientRect !== 'function') return null;
    const rect = element.getBoundingClientRect();
    if (!rect.width || !rect.height) return null;
    return rect;
  }

  function createHazardMarker({ hazard, phase, targetElement, targetButtonId = '', boardMarker = false }) {
    if (!refs.hazardLayer || typeof refs.hazardLayer.appendChild !== 'function') return false;
    const panelRect = getElementRect(refs.commandPanel);
    const targetRect = getElementRect(targetElement);
    if (!panelRect || !targetRect) return false;
    const marker = document.createElement('span');
    const typeToken = toDatasetToken(hazard?.type);
    const phaseToken = toDatasetToken(phase, 'inactive');
    marker.className = [
      'hazard-marker',
      `hazard-marker-${phaseToken}`,
      boardMarker ? 'hazard-board-marker' : '',
      'retro-crt-tracer',
      boardMarker ? 'scanline-streak' : 'terminal-glyph-fragment'
    ].filter(Boolean).join(' ');
    marker.dataset.hazardType = typeToken;
    marker.dataset.hazardPhase = phaseToken;
    marker.dataset.targetButtonId = targetButtonId;
    marker.dataset.hazardGlyph = boardMarker ? '##' : '>>';
    marker.setAttribute('aria-hidden', 'true');
    marker.style.left = `${targetRect.left - panelRect.left}px`;
    marker.style.top = `${targetRect.top - panelRect.top}px`;
    marker.style.width = `${targetRect.width}px`;
    marker.style.height = `${targetRect.height}px`;
    refs.hazardLayer.appendChild(marker);
    return true;
  }

  function resetHazardMotion(buttonId) {
    const buttonElement = getButtonElement(buttonId);
    if (!buttonElement?.style) return;
    buttonElement.style.setProperty('--hazard-x', '0px');
    buttonElement.style.setProperty('--hazard-y', '0px');
    if (buttonElement.dataset) {
      buttonElement.dataset.hazardMotion = 'none';
    }
  }

  function applyHazardMotion({ buttonId, hazard, phase }) {
    const buttonElement = getButtonElement(buttonId);
    if (!buttonElement?.style) return false;
    const offsetX = Math.round(Number(hazard?.motion?.offsetXPx) || 0);
    const offsetY = Math.round(Number(hazard?.motion?.offsetYPx) || 0);
    buttonElement.style.setProperty('--hazard-x', `${offsetX}px`);
    buttonElement.style.setProperty('--hazard-y', `${offsetY}px`);
    if (buttonElement.dataset) {
      buttonElement.dataset.hazardMotion = phase === 'active' ? 'active' : 'telegraph';
    }
    return true;
  }

  function updateHazardPresentation(hazards = null) {
    const phase = toDatasetToken(hazards?.phase, 'inactive');
    const activeHazards = Array.isArray(hazards?.hazards)
      ? hazards.hazards.filter((hazard) => ['telegraph', 'active'].includes(hazard.phase))
      : [];
    const typeTokens = activeHazards.map((hazard) => toDatasetToken(hazard.type));
    const targetButtonIds = activeHazards.flatMap((hazard) => Array.isArray(hazard.targetButtonIds)
      ? hazard.targetButtonIds
      : []);
    const hasBoardHazard = activeHazards.some((hazard) => hazard.target === 'board');

    if (refs.commandPanel?.dataset) {
      refs.commandPanel.dataset.hazardPhase = phase;
      refs.commandPanel.dataset.hazardTypes = typeTokens.length ? typeTokens.join(' ') : 'none';
      refs.commandPanel.dataset.hazardUnlocked = hazards?.unlocked ? 'true' : 'false';
      refs.commandPanel.dataset.hazardTargetCount = String(targetButtonIds.length);
      refs.commandPanel.dataset.hazardBoard = hasBoardHazard ? phase : 'none';
    }
    if (refs.gridEl?.dataset) {
      refs.gridEl.dataset.hazardPhase = phase;
      refs.gridEl.dataset.hazardTargetCount = String(targetButtonIds.length);
    }
    if (refs.hazardStatusText) {
      refs.hazardStatusText.innerText = phase === 'active'
        ? 'HAZARD ACTIVE'
        : (phase === 'telegraph' ? 'HAZARD WARN' : 'HAZARD --');
    }
    if (refs.hazardLayer) {
      refs.hazardLayer.innerHTML = '';
    }
    const nextMotionButtonIds = new Set();
    if (!activeHazards.length) {
      hazardMotionButtonIds.forEach(resetHazardMotion);
      hazardMotionButtonIds = nextMotionButtonIds;
      return;
    }

    activeHazards.forEach((hazard) => {
      const hazardPhase = toDatasetToken(hazard.phase, phase);
      if (Array.isArray(hazard.targetButtonIds)) {
        hazard.targetButtonIds.forEach((buttonId) => {
          if (applyHazardMotion({ buttonId, hazard, phase: hazardPhase })) {
            nextMotionButtonIds.add(buttonId);
          }
          createHazardMarker({
            hazard,
            phase: hazardPhase,
            targetElement: getButtonElement(buttonId),
            targetButtonId: buttonId
          });
        });
      }
      if (hazard.target === 'board') {
        createHazardMarker({
          hazard,
          phase: hazardPhase,
          targetElement: refs.gridEl,
          boardMarker: true
        });
      }
    });
    hazardMotionButtonIds.forEach((buttonId) => {
      if (!nextMotionButtonIds.has(buttonId)) {
        resetHazardMotion(buttonId);
      }
    });
    hazardMotionButtonIds = nextMotionButtonIds;
  }

  function spawnBossProjectile({ sourceElement, strong }) {
    if (!document.body || typeof document.body.appendChild !== 'function') return;
    const target = getElementCenter(refs.bossAvatarShell);
    if (!target) return;
    const viewport = {
      width: document.documentElement?.clientWidth || refs.battleStage?.clientWidth || 320,
      height: document.documentElement?.clientHeight || 640
    };
    const source = getElementCenter(sourceElement) || {
      x: viewport.width / 2,
      y: Math.min(viewport.height - 120, target.y + 220)
    };
    const projectile = document.createElement('span');
    const dx = target.x - source.x;
    const dy = target.y - source.y;
    projectile.className = 'boss-projectile button-to-enemy-tracer retro-crt-tracer scanline-streak';
    projectile.style.left = `${source.x}px`;
    projectile.style.top = `${source.y}px`;
    projectile.style.setProperty('--dx', `${dx}px`);
    projectile.style.setProperty('--dy', `${dy}px`);
    projectile.style.setProperty('--tracer-angle', `${Math.atan2(dy, dx)}rad`);
    projectile.style.setProperty('--particle-color', strong ? 'var(--crt-yellow)' : 'var(--crt-green)');
    projectile.style.setProperty('--tracer-width', `${strong ? 26 : 18}px`);
    projectile.style.setProperty('--tracer-height', `${strong ? 5 : 4}px`);
    if (strong) {
      projectile.style.width = '26px';
      projectile.style.height = '5px';
      projectile.style.boxShadow = '0 0 0 1px rgba(0, 0, 0, 0.82), 0 0 14px var(--crt-yellow)';
      projectile.style.background = 'var(--crt-yellow)';
    }
    document.body.appendChild(projectile);
    schedule(() => removeNode(projectile), 520);
  }

  function spawnBossHitSparks(strong) {
    if (!document.body || typeof document.body.appendChild !== 'function') return;
    const target = getElementCenter(refs.bossAvatarShell);
    if (!target) return;
    const count = strong ? 18 : 12;
    const color = strong ? 'var(--crt-yellow)' : 'var(--crt-green)';
    for (let index = 0; index < count; index++) {
      const spark = document.createElement('span');
      const angle = random() * Math.PI * 2;
      const distance = target.width * (0.18 + random() * (strong ? 0.44 : 0.34));
      spark.className = `boss-hit-spark retro-crt-tracer ${index % 2 === 0 ? 'pixel-spark' : 'terminal-glyph-fragment'}`;
      if (index % 2 === 1) {
        spark.textContent = terminalGlyphs[index % terminalGlyphs.length];
      }
      spark.style.left = `${target.x}px`;
      spark.style.top = `${target.y}px`;
      spark.style.setProperty('--dx', `${Math.cos(angle) * distance}px`);
      spark.style.setProperty('--dy', `${Math.sin(angle) * distance}px`);
      spark.style.setProperty('--tracer-angle', `${angle}rad`);
      spark.style.setProperty('--particle-color', color);
      spark.style.setProperty('--particle-size', `${strong ? 8 : 6}px`);
      document.body.appendChild(spark);
      schedule(() => removeNode(spark), 820);
    }
  }

  function playComboShake(strong) {
    if (comboShakeTimeout !== null) {
      cancelSchedule(comboShakeTimeout);
    }
    document.body.classList.remove('combo-shake');
    document.body.classList.remove('combo-shake-strong');
    void document.body.offsetWidth;
    document.body.classList.add(strong ? 'combo-shake-strong' : 'combo-shake');
    comboShakeTimeout = schedule(() => {
      document.body.classList.remove('combo-shake');
      document.body.classList.remove('combo-shake-strong');
      comboShakeTimeout = null;
    }, strong ? 280 : 200);
  }

  function renderFailureRecap(recap) {
    if (!recap) {
      refs.failureRecapEl.innerHTML = '';
      return;
    }
    if (recap.result === 'victory') {
      refs.failureRecapEl.innerHTML = `
                <div class="failure-result">${escapeHtml(getFailureResultText(recap))}</div>
                <div class="failure-recap-title">Encounter result</div>
                ${getCombatRecapRows(recap)}
                <div class="failure-recap-row">Best status: ${escapeHtml(recap.bestComparison)}</div>
            `;
      return;
    }

    const forbiddenItems = (recap.forbiddenButtons || [])
      .slice(0, 4)
      .map((button) => `<li>${escapeHtml(button.label)}</li>`)
      .join('');
    const hiddenCount = Math.max(0, recap.forbiddenButtons.length - 4);
    const extraLine = hiddenCount > 0 ? `<li>另有 ${hiddenCount} 个禁止按键</li>` : '';
    const pressedLine = recap.failureReason === 'wrong_click' && recap.pressedButton
      ? `<div class="failure-recap-row">错按：${escapeHtml(recap.pressedButton.label)}</div>`
      : '<div class="failure-recap-row">失败原因：倒计时归零</div>';

    refs.failureRecapEl.innerHTML = `
                <div class="failure-result">${escapeHtml(getFailureResultText(recap))}</div>
                <div class="failure-recap-title">致命条件回放</div>
                <div class="failure-recap-row">${escapeHtml(recap.ruleText)}</div>
                ${pressedLine}
                <div class="failure-recap-row">禁止按键：</div>
                <ul class="failure-recap-list">${forbiddenItems}${extraLine}</ul>
                <div class="failure-recap-row">安全键进度：已清 ${recap.safeCleared}/${recap.safeTotal}，剩余 ${recap.safeRemaining}</div>
                <div class="failure-recap-row">本轮：L${recap.level} / ${recap.score} 分 / ${escapeHtml(recap.difficultyId)}</div>
                ${getCombatRecapRows(recap)}
            `;
  }

  function renderBoard({ buttons, difficulty, ruleText, level, score, onButtonInput }) {
    refs.gridEl.innerHTML = '';
    refs.gridEl.style.gridTemplateColumns = `repeat(${difficulty.cols}, minmax(0, 1fr))`;
    refs.gridEl.style.setProperty('--board-max-width', difficulty.cols <= 2 ? '340px' : '500px');
    refs.gridEl.dataset.gridSize = difficulty.gridSize;

    buttons.forEach((button, index) => {
      const buttonEl = document.createElement('div');
      buttonEl.id = button.id;
      buttonEl.className = `game-btn ${button.color.css}`;
      buttonEl.setAttribute('role', 'button');
      buttonEl.setAttribute('tabindex', '0');
      buttonEl.setAttribute('aria-label', `${button.color.name}${button.shape.name}，数字 ${button.number}`);
      buttonEl.innerHTML = `
                    <span class="btn-number crt-font">${String(button.number).padStart(2, '0')}</span>
                    <span class="btn-shape">${button.shape.char}</span>
      `;
      buttonEl.style.opacity = '0';
      buttonEl.style.setProperty('--hazard-x', '0px');
      buttonEl.style.setProperty('--hazard-y', '0px');
      buttonEl.style.setProperty('--button-press-y', '0px');
      buttonEl.style.setProperty('--button-scale', '0.8');
      schedule(() => {
        buttonEl.style.transition = 'all 0.2s cubic-bezier(.36,.07,.19,.97)';
        buttonEl.style.opacity = '1';
        buttonEl.style.setProperty('--button-scale', '1');
      }, index * 40);

      buttonEl.addEventListener('pointerdown', (event) => onButtonInput(button.id, buttonEl, event), { passive: false });
      buttonEl.addEventListener('keydown', (event) => {
        if (event.key === 'Enter' || event.key === ' ') {
          onButtonInput(button.id, buttonEl, event);
        }
      });
      refs.gridEl.appendChild(buttonEl);
    });

    refs.clueEl.innerHTML = '';
    cancelSchedule(typewriterTimeout);
    let charIndex = 0;
    function typeChar() {
      if (charIndex < ruleText.length) {
        refs.clueEl.innerHTML += ruleText.charAt(charIndex);
        charIndex++;
        if (charIndex % 3 === 0) audio.playBeep(800 + random() * 200, 'square', 0.02);
        typewriterTimeout = schedule(typeChar, 30);
      }
    }
    typeChar();

    refs.levelDisplay.innerText = level;
    refs.scoreDisplay.innerText = score;
  }

  function updateBestRecordUi(record, note = '') {
    refs.bestLevelDisplay.innerText = record.updatedAt ? `L${record.bestLevel}` : '--';
    refs.bestScoreDisplay.innerText = record.bestScore;
    refs.bestStatusNote.innerText = note;
  }

  function updateCombatStatus({ player, combat, combo }) {
    if (!combat || !combo) return;
    const hpPercent = Math.max(0, Math.min(100, Math.round((combat.hp / combat.maxHp) * 100)));
    refs.bossHpText.innerText = `${combat.enemyName || combat.bossName}: ${combat.hp}/${combat.maxHp}`;
    refs.bossHpBar.style.width = `${hpPercent}%`;
    if (player) {
      const playerPercent = Math.max(0, Math.min(100, Math.round((player.hp / player.maxHp) * 100)));
      refs.playerHpText.innerText = `HP: ${player.hp}/${player.maxHp}`;
      refs.playerHpBar.style.width = `${playerPercent}%`;
    }
    refs.enemyAttackText.innerText = `ATK ${combat.attack ?? '--'}`;
    refs.comboStatusText.innerText = combo.statusText || 'CHAIN --';
    if (combat.status === 'defeated') {
      refs.bossAvatarShell.classList.add('boss-defeated');
    } else {
      refs.bossAvatarShell.classList.remove('boss-defeated');
    }
  }

  function showBossHit({ damage, defeated = false, sourceElement = null }) {
    const appliedDamage = Math.max(0, Math.floor(Number(damage?.appliedDamage) || 0));
    if (appliedDamage <= 0) return;
    const strong = appliedDamage >= 28 || defeated;
    refs.bossDamageText.innerText = `-${appliedDamage}`;
    refs.bossDamageText.classList.remove('boss-damage-pop');
    refs.bossAvatarShell.classList.remove('boss-hit');
    void refs.bossDamageText.offsetWidth;
    refs.bossDamageText.classList.add('boss-damage-pop');
    refs.bossAvatarShell.classList.add('boss-hit');
    if (defeated) {
      refs.bossAvatarShell.classList.add('boss-defeated');
    }
    spawnBossProjectile({ sourceElement, strong });
    schedule(() => spawnBossHitSparks(strong), 320);
    schedule(() => {
      refs.bossDamageText.classList.remove('boss-damage-pop');
      refs.bossAvatarShell.classList.remove('boss-hit');
    }, 920);
  }

  function showPlayerHit({ damage, defeated = false }) {
    const appliedDamage = Math.max(0, Math.floor(Number(damage?.appliedDamage) || 0));
    if (appliedDamage <= 0) return;
    refs.playerDamageText.innerText = `HIT -${appliedDamage}`;
    refs.playerDamageText.classList.remove('player-damage-pop');
    refs.playerHud.classList.remove('player-hit');
    void refs.playerDamageText.offsetWidth;
    refs.playerDamageText.classList.add('player-damage-pop');
    if (defeated) {
      refs.playerHud.classList.add('player-hit');
    }
    schedule(() => {
      refs.playerDamageText.classList.remove('player-damage-pop');
      refs.playerHud.classList.remove('player-hit');
    }, 880);
  }

  function showSafePressFeedback({ sourceElement = null, combo = null, previous = null, expired = false } = {}) {
    const chainStarted = combo?.streak === 1 && (expired || (previous?.streak || 0) === 0);
    spawnButtonReward({
      sourceElement,
      label: chainStarted ? 'CHAIN READY' : 'SUCCESS',
      className: chainStarted ? 'chain-start' : 'safe-success',
      color: chainStarted ? '#b7ff8a' : 'var(--crt-green)',
      strong: false,
      directional: true
    });
  }

  function showWrongPressFeedback({ sourceElement = null, damage, defeated = false } = {}) {
    const appliedDamage = Math.max(0, Math.floor(Number(damage?.appliedDamage) || 0));
    if (sourceElement?.classList) {
      sourceElement.classList.add('wrong-press');
    }
    flashWrongPress();
    triggerVibration(defeated ? [35, 25, 70] : [25, 15, 35]);
    showPlayerHit({ damage, defeated });
    spawnButtonReward({
      sourceElement,
      label: appliedDamage > 0 ? `HIT -${appliedDamage}` : 'WRONG',
      className: 'wrong-press',
      color: 'var(--crt-red)',
      strong: true
    });
  }

  function showComboReward({ previous, combo, sourceElement = null, capped = false }) {
    if (!previous || !combo) return;
    const reward = getComboRewardKind({ previous, combo, capped });
    refs.comboRewardText.innerText = reward.label;
    ['damage-bonus', 'combo-stage-two', 'combo-stage-high', 'max-combo'].forEach((className) => {
      refs.comboRewardText.classList.remove(className);
    });
    if (reward.className) refs.comboRewardText.classList.add(reward.className);
    refs.comboRewardText.classList.remove('combo-reward-pop');
    refs.comboStatusText.classList.remove('combo-pulse');
    refs.combatStatus.classList.remove('combo-impact');
    refs.combatStatus.classList.remove('combo-tier-impact');
    void refs.comboRewardText.offsetWidth;
    refs.comboRewardText.classList.add('combo-reward-pop');
    refs.comboStatusText.classList.add('combo-pulse');
    refs.combatStatus.classList.add(reward.strong ? 'combo-tier-impact' : 'combo-impact');
    spawnComboParticles({ ...reward, sourceElement });
    spawnButtonReward({
      sourceElement,
      label: reward.label,
      className: reward.className,
      color: reward.color,
      strong: reward.strong,
      directional: true,
      combo: true
    });
    playComboShake(reward.strong);
    if (comboRewardTimeout !== null) {
      cancelSchedule(comboRewardTimeout);
    }
    if (comboImpactTimeout !== null) {
      cancelSchedule(comboImpactTimeout);
    }
    comboRewardTimeout = schedule(() => {
      refs.comboRewardText.classList.remove('combo-reward-pop');
      refs.comboStatusText.classList.remove('combo-pulse');
      comboRewardTimeout = null;
    }, 940);
    comboImpactTimeout = schedule(() => {
      refs.combatStatus.classList.remove('combo-impact');
      refs.combatStatus.classList.remove('combo-tier-impact');
      comboImpactTimeout = null;
    }, reward.strong ? 720 : 560);
  }

  function updateComboWindow(comboWindow = null) {
    if (!refs.comboWindowBar) return;
    const percent = Math.max(0, Math.min(100, Math.round(Number(comboWindow?.remainingPercent) || 0)));
    refs.comboWindowBar.style.width = `${percent}%`;
    if (comboWindow?.isWindowActive) {
      refs.comboWindowBar.classList.add('active');
    } else {
      refs.comboWindowBar.classList.remove('active');
    }
    if (comboWindow?.isExpiring) {
      refs.comboWindowBar.classList.add('expiring');
    } else {
      refs.comboWindowBar.classList.remove('expiring');
    }
  }

  function updateTimer(timeLeft, timeLimit, comboWindow = null) {
    const timePercent = Math.max(0, (timeLeft / timeLimit) * 100);
    refs.timerBarEl.style.width = `${timePercent}%`;
    updateComboWindow(comboWindow);

    if (timePercent < 30) {
      refs.timerBarEl.classList.add('timer-danger');
      refs.timerBarEl.style.opacity = Math.floor(timeLeft / 200) % 2 === 0 ? '0.5' : '1';
    } else {
      refs.timerBarEl.classList.remove('timer-danger');
      refs.timerBarEl.style.opacity = '1';
    }
  }

  function updateScore(score) {
    refs.scoreDisplay.innerText = score;
  }

  function hideStartScreen() {
    refs.startScreen.classList.add('hidden');
  }

  function hideGameOverScreen() {
    refs.gameOverScreen.classList.add('hidden');
  }

  function showUpgradeScreen({ choices = [], onSelect }) {
    refs.upgradeChoiceList.innerHTML = '';
    choices.forEach((choice) => {
      const card = document.createElement('button');
      card.type = 'button';
      card.className = 'upgrade-card crt-font';
      card.dataset.upgradeId = choice.id;
      card.innerHTML = `
                    <span class="upgrade-card-label">${escapeHtml(choice.label)}</span>
                    <span class="upgrade-card-effect">${escapeHtml(choice.shortLabel)} / +${choice.value}</span>
                `;
      card.addEventListener('click', () => onSelect(choice.id));
      refs.upgradeChoiceList.appendChild(card);
    });
    refs.upgradeScreen.classList.remove('hidden');
  }

  function hideUpgradeScreen() {
    refs.upgradeScreen.classList.add('hidden');
    refs.upgradeChoiceList.innerHTML = '';
  }

  function showGameOverScreen({ level, isTimeout, recap, isVictory = false }) {
    refs.finalLevel.innerText = level;
    refs.resultTitle.innerText = isVictory ? 'ENCOUNTER CLEAR' : 'SYSTEM FAILURE';
    refs.resultTitle.className = isVictory
      ? 'failure-title text-5xl font-black mb-4 text-green-400 crt-font'
      : 'failure-title text-6xl font-black mb-4 text-red-500 crt-font blink';
    refs.resultSubtitle.innerText = isVictory ? 'Boss core collapsed' : '核心已熔毁';
    refs.deathReason.innerHTML = isVictory
      ? 'REACTOR WARDEN offline.<br>安全键链路保持完整。'
      : (isTimeout
        ? '倒计时归零。<br>面板未清空，反应堆越过临界线。'
        : '你按下了禁止按键。');
    renderFailureRecap(recap);
    refs.gameOverScreen.classList.remove('hidden');
  }

  function setWarningVisible(visible) {
    if (visible) {
      refs.warningText.classList.remove('hidden');
    } else {
      refs.warningText.classList.add('hidden');
    }
  }

  function resetFailureShake() {
    document.body.classList.remove('shake-intense');
  }

  function setFailureShake() {
    document.body.classList.add('shake-intense');
  }

  function playInteractionShake() {
    document.body.classList.remove('shake-light');
    void document.body.offsetWidth;
    document.body.classList.add('shake-light');
  }

  function markButtonPressed(element) {
    element.classList.add('pressed');
    element.classList.add('disabled');
  }

  function markButtonExploded(element) {
    element.classList.add('explode');
  }

  function getButtonElement(buttonId) {
    return document.getElementById(buttonId);
  }

  return {
    renderBoard,
    renderFailureRecap,
    updateBestRecordUi,
    updateCombatStatus,
    updateHazardPresentation,
    showBossHit,
    showPlayerHit,
    showSafePressFeedback,
    showWrongPressFeedback,
    showComboReward,
    updateComboWindow,
    updateTimer,
    updateScore,
    hideStartScreen,
    hideGameOverScreen,
    showUpgradeScreen,
    hideUpgradeScreen,
    showGameOverScreen,
    setWarningVisible,
    resetFailureShake,
    setFailureShake,
    playInteractionShake,
    markButtonPressed,
    markButtonExploded,
    getButtonElement
  };
}
