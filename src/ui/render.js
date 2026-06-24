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
    levelDisplay: document.getElementById('level-display'),
    scoreDisplay: document.getElementById('score-display'),
    warningText: document.getElementById('warning-text'),
    bestLevelDisplay: document.getElementById('best-level-display'),
    bestScoreDisplay: document.getElementById('best-score-display'),
    bestStatusNote: document.getElementById('best-status-note'),
    battleStage: document.getElementById('battle-stage'),
    combatStatus: document.getElementById('combat-status'),
    bossAvatarShell: document.getElementById('boss-avatar-shell'),
    bossHpText: document.getElementById('boss-hp-text'),
    bossHpBar: document.getElementById('boss-hp-bar'),
    bossDamageText: document.getElementById('boss-damage-text'),
    bossAttackLayer: document.getElementById('boss-attack-layer'),
    playerHpText: document.getElementById('player-hp-text'),
    playerHpBar: document.getElementById('player-hp-bar'),
    enemyAttackText: document.getElementById('enemy-attack-text'),
    playerDamageText: document.getElementById('player-damage-text'),
    comboStatusText: document.getElementById('combo-status-text'),
    comboRewardText: document.getElementById('combo-reward-text'),
    comboParticleLayer: document.getElementById('combo-particle-layer'),
    failureRecapEl: document.getElementById('failure-recap'),
    startScreen: document.getElementById('start-screen'),
    gameOverScreen: document.getElementById('game-over-screen'),
    finalLevel: document.getElementById('final-level'),
    deathReason: document.getElementById('death-reason'),
    resultTitle: document.getElementById('result-title'),
    resultSubtitle: document.getElementById('result-subtitle')
  };
  let typewriterTimeout = null;
  let comboRewardTimeout = null;
  let comboImpactTimeout = null;
  let comboShakeTimeout = null;

  function removeNode(node) {
    if (node && typeof node.remove === 'function') {
      node.remove();
    }
  }

  function getComboRewardKind({ previous, combo, capped }) {
    if (capped) {
      return {
        label: 'MAX COMBO',
        className: 'max-combo',
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

  function spawnComboParticles({ strong, color }) {
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
      particle.className = 'combo-particle';
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

  function spawnButtonReward({ sourceElement, label, className, color, strong }) {
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

    const sparkCount = strong ? 14 : 8;
    for (let index = 0; index < sparkCount; index++) {
      const spark = document.createElement('span');
      const angle = random() * Math.PI * 2;
      const distance = rect.width * (0.22 + random() * (strong ? 0.48 : 0.32));
      spark.className = 'button-combo-spark';
      spark.style.left = `${originX}px`;
      spark.style.top = `${originY}px`;
      spark.style.setProperty('--dx', `${Math.cos(angle) * distance}px`);
      spark.style.setProperty('--dy', `${Math.sin(angle) * distance}px`);
      spark.style.setProperty('--particle-color', color);
      spark.style.setProperty('--particle-size', `${strong ? 7 : 5}px`);
      document.body.appendChild(spark);
      schedule(() => removeNode(spark), 780);
    }
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
    projectile.className = 'boss-projectile';
    projectile.style.left = `${source.x}px`;
    projectile.style.top = `${source.y}px`;
    projectile.style.setProperty('--dx', `${target.x - source.x}px`);
    projectile.style.setProperty('--dy', `${target.y - source.y}px`);
    if (strong) {
      projectile.style.width = '16px';
      projectile.style.height = '16px';
      projectile.style.boxShadow = '0 0 18px var(--crt-yellow), 0 0 36px rgba(255, 204, 0, 0.5)';
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
      spark.className = 'boss-hit-spark';
      spark.style.left = `${target.x}px`;
      spark.style.top = `${target.y}px`;
      spark.style.setProperty('--dx', `${Math.cos(angle) * distance}px`);
      spark.style.setProperty('--dy', `${Math.sin(angle) * distance}px`);
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
      buttonEl.style.transform = 'scale(0.8)';
      schedule(() => {
        buttonEl.style.transition = 'all 0.2s cubic-bezier(.36,.07,.19,.97)';
        buttonEl.style.opacity = '1';
        buttonEl.style.transform = 'scale(1)';
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
    refs.playerDamageText.innerText = `-${appliedDamage}`;
    refs.playerDamageText.classList.remove('player-damage-pop');
    refs.combatStatus.classList.remove('player-hit');
    void refs.playerDamageText.offsetWidth;
    refs.playerDamageText.classList.add('player-damage-pop');
    if (defeated) {
      refs.combatStatus.classList.add('player-hit');
    }
    schedule(() => {
      refs.playerDamageText.classList.remove('player-damage-pop');
      refs.combatStatus.classList.remove('player-hit');
    }, 880);
  }

  function showComboReward({ previous, combo, sourceElement = null, capped = false }) {
    if (!previous || !combo) return;
    const reward = getComboRewardKind({ previous, combo, capped });
    refs.comboRewardText.innerText = reward.label;
    refs.comboRewardText.classList.remove('damage-bonus');
    refs.comboRewardText.classList.remove('max-combo');
    if (reward.className) refs.comboRewardText.classList.add(reward.className);
    refs.comboRewardText.classList.remove('combo-reward-pop');
    refs.comboStatusText.classList.remove('combo-pulse');
    refs.combatStatus.classList.remove('combo-impact');
    refs.combatStatus.classList.remove('combo-tier-impact');
    void refs.comboRewardText.offsetWidth;
    refs.comboRewardText.classList.add('combo-reward-pop');
    refs.comboStatusText.classList.add('combo-pulse');
    refs.combatStatus.classList.add(reward.strong ? 'combo-tier-impact' : 'combo-impact');
    spawnComboParticles(reward);
    spawnButtonReward({
      sourceElement,
      label: reward.label,
      className: reward.className,
      color: reward.color,
      strong: reward.strong
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

  function updateTimer(timeLeft, timeLimit) {
    const timePercent = Math.max(0, (timeLeft / timeLimit) * 100);
    refs.timerBarEl.style.width = `${timePercent}%`;

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
    showBossHit,
    showPlayerHit,
    showComboReward,
    updateTimer,
    updateScore,
    hideStartScreen,
    hideGameOverScreen,
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
