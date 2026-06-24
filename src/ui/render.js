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
  if (!recap.combat && !recap.combo && !recap.lastDamage) {
    return '';
  }
  const combatLine = recap.combat
    ? `<div class="failure-recap-row">BOSS: ${escapeHtml(recap.combat.bossName)} ${recap.combat.hp}/${recap.combat.maxHp}</div>`
    : '';
  const damageLine = recap.lastDamage
    ? `<div class="failure-recap-row">DAMAGE: ${recap.lastDamage.appliedDamage} (${recap.lastDamage.baseDamage}+${recap.lastDamage.timeBonus}+${recap.lastDamage.comboBonus})</div>`
    : '';
  const comboLine = recap.combo
    ? `<div class="failure-recap-row">COMBO: ${recap.combo.streak} ${escapeHtml(recap.combo.multiplierLabel)} / +${recap.combo.damageBonus}</div>`
    : '';
  return `${combatLine}${damageLine}${comboLine}`;
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
    bossHpText: document.getElementById('boss-hp-text'),
    bossHpBar: document.getElementById('boss-hp-bar'),
    comboStatusText: document.getElementById('combo-status-text'),
    comboRewardText: document.getElementById('combo-reward-text'),
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

  function updateCombatStatus({ combat, combo }) {
    if (!combat || !combo) return;
    const hpPercent = Math.max(0, Math.min(100, Math.round((combat.hp / combat.maxHp) * 100)));
    refs.bossHpText.innerText = `${combat.bossName}: ${combat.hp}/${combat.maxHp}`;
    refs.bossHpBar.style.width = `${hpPercent}%`;
    refs.comboStatusText.innerText = `COMBO ${combo.multiplierLabel} / ${combo.streak}`;
  }

  function showComboReward({ previous, combo }) {
    if (!previous || !combo) return;
    const bonusChanged = combo.damageBonus > previous.damageBonus;
    refs.comboRewardText.innerText = bonusChanged ? `DMG +${combo.damageBonus}` : 'STREAK +1';
    if (bonusChanged) {
      refs.comboRewardText.classList.add('damage-bonus');
    } else {
      refs.comboRewardText.classList.remove('damage-bonus');
    }
    refs.comboRewardText.classList.remove('combo-reward-pop');
    refs.comboStatusText.classList.remove('combo-pulse');
    void refs.comboRewardText.offsetWidth;
    refs.comboRewardText.classList.add('combo-reward-pop');
    refs.comboStatusText.classList.add('combo-pulse');
    if (comboRewardTimeout !== null) {
      cancelSchedule(comboRewardTimeout);
    }
    comboRewardTimeout = schedule(() => {
      refs.comboRewardText.classList.remove('combo-reward-pop');
      refs.comboStatusText.classList.remove('combo-pulse');
      comboRewardTimeout = null;
    }, 760);
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
