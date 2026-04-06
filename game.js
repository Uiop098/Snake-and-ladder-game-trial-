/* ============================================
   SNAKES & LADDERS - GAME LOGIC
   ============================================ */

'use strict';

// ---- GAME DATA ----
const SNAKES = {
  99: 21, 95: 75, 92: 73, 87: 24, 64: 60,
  62: 19, 56: 53, 49: 11, 47: 26, 16: 6
};
const LADDERS = {
  2: 38, 7: 14, 8: 31, 15: 26, 21: 42,
  28: 84, 36: 44, 51: 67, 71: 91, 78: 98, 88: 100
};

const EMOJIS = ['🦊','🐱','🐶','🐻','🦁','🐯','🐸','🐼','🐧','🦄','🎃','🤖','👽','🧙','🎯','🏆'];
const COLORS = ['#ff4d6d','#6c3fc5','#f7c948','#22c55e','#3b82f6','#f97316'];

// ---- STATE ----
const state = {
  players: [],
  currentTurn: 0,
  rolling: false,
  gameOver: false,
  diceCount: 1,
  settings: {
    soundEnabled: true,
    soundUrl: 'https://litter.catbox.moe/x208po.mp3',
    hapticEnabled: true,
    bgMusicEnabled: false,
    bgMusicVolume: 0.4,
    theme: 'default',
  }
};

// ---- DOM REFS ----
const $id = id => document.getElementById(id);
const $qs = s => document.querySelector(s);

// ---- AUDIO ----
let sfxAudio = null;
let bgAudio = null;
let localMusicBlob = null;

function playSound(url) {
  if (!state.settings.soundEnabled) return;
  try {
    if (sfxAudio) { sfxAudio.pause(); sfxAudio.currentTime = 0; }
    sfxAudio = new Audio(url || state.settings.soundUrl);
    sfxAudio.volume = 0.7;
    sfxAudio.play().catch(() => {});
  } catch(e) {}
}

function playBgMusic() {
  if (!state.settings.bgMusicEnabled) return;
  const src = localMusicBlob || null;
  if (!src) return;
  if (!bgAudio) bgAudio = new Audio();
  bgAudio.src = src;
  bgAudio.loop = true;
  bgAudio.volume = state.settings.bgMusicVolume;
  bgAudio.play().catch(() => {});
}
function stopBgMusic() {
  if (bgAudio) { bgAudio.pause(); bgAudio.currentTime = 0; }
}

// ---- HAPTIC ----
function haptic(pattern = [30]) {
  if (!state.settings.hapticEnabled) return;
  if (navigator.vibrate) navigator.vibrate(pattern);
}

// ---- SETUP SCREEN ----
let setupPlayerCount = 2;
let setupEmoji = [...EMOJIS.slice(0,4)];
let setupNames = ['Player 1','Player 2','Player 3','Player 4'];
let setupColors = [...COLORS];
let activeEmojiPickerIndex = -1;

function initSetup() {
  renderPlayerRows();

  // theme buttons
  document.querySelectorAll('.theme-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      document.querySelectorAll('.theme-btn').forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
      const theme = btn.dataset.theme;
      state.settings.theme = theme;
      document.body.className = theme === 'default' ? '' : `theme-${theme}`;
    });
  });

  // player count
  document.querySelectorAll('.count-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      document.querySelectorAll('.count-btn').forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
      setupPlayerCount = parseInt(btn.dataset.count);
      renderPlayerRows();
    });
  });

  $id('btn-start').addEventListener('click', startGame);
}

function renderPlayerRows() {
  const container = $id('players-setup');
  container.innerHTML = '';
  for (let i = 0; i < setupPlayerCount; i++) {
    const row = document.createElement('div');
    row.className = 'player-row';
    row.innerHTML = `
      <div class="player-avatar-pick" data-idx="${i}" title="Pick avatar">${setupEmoji[i]}</div>
      <input class="player-name-input" type="text" value="${setupNames[i]}" maxlength="12" data-idx="${i}" placeholder="Player ${i+1}" />
      <input class="player-color-pick" type="color" value="${setupColors[i]}" data-idx="${i}" />
    `;
    container.appendChild(row);
  }

  // Avatar click → emoji picker
  container.querySelectorAll('.player-avatar-pick').forEach(el => {
    el.addEventListener('click', e => {
      e.stopPropagation();
      openEmojiPicker(parseInt(el.dataset.idx), el);
    });
  });
  // Name change
  container.querySelectorAll('.player-name-input').forEach(el => {
    el.addEventListener('input', () => {
      setupNames[parseInt(el.dataset.idx)] = el.value || `Player ${parseInt(el.dataset.idx)+1}`;
    });
  });
  // Color change
  container.querySelectorAll('.player-color-pick').forEach(el => {
    el.addEventListener('input', () => {
      setupColors[parseInt(el.dataset.idx)] = el.value;
    });
  });
}

function openEmojiPicker(idx, anchor) {
  closeEmojiPicker();
  activeEmojiPickerIndex = idx;
  const picker = document.createElement('div');
  picker.className = 'emoji-picker';
  picker.id = 'emoji-picker';
  EMOJIS.forEach(em => {
    const btn = document.createElement('button');
    btn.className = 'emoji-option';
    btn.textContent = em;
    btn.addEventListener('click', () => {
      setupEmoji[idx] = em;
      anchor.textContent = em;
      closeEmojiPicker();
    });
    picker.appendChild(btn);
  });
  // position
  const rect = anchor.getBoundingClientRect();
  picker.style.position = 'fixed';
  picker.style.top = (rect.bottom + 4) + 'px';
  picker.style.left = Math.max(8, rect.left) + 'px';
  document.body.appendChild(picker);
  setTimeout(() => document.addEventListener('click', closeEmojiPicker), 50);
}
function closeEmojiPicker() {
  const p = $id('emoji-picker');
  if (p) p.remove();
  document.removeEventListener('click', closeEmojiPicker);
  activeEmojiPickerIndex = -1;
}

function startGame() {
  // save names before starting
  document.querySelectorAll('.player-name-input').forEach(el => {
    setupNames[parseInt(el.dataset.idx)] = el.value || `Player ${parseInt(el.dataset.idx)+1}`;
  });

  state.players = [];
  for (let i = 0; i < setupPlayerCount; i++) {
    state.players.push({
      id: i,
      name: setupNames[i],
      emoji: setupEmoji[i],
      color: setupColors[i],
      position: 0,
      wins: 0,
    });
  }
  state.currentTurn = 0;
  state.rolling = false;
  state.gameOver = false;

  $id('setup-screen').style.display = 'none';
  $id('game-screen').classList.add('active');

  if (document.documentElement.requestFullscreen) {
    document.documentElement.requestFullscreen().catch(() => {});
  }

  buildBoard();
  buildTokens();
  renderPlayerCards();
  renderDice(1);
  setStatus(`${state.players[0].name}'s turn! Roll the dice 🎲`);

  if (state.settings.bgMusicEnabled) playBgMusic();
}

// ---- BOARD ----
function buildBoard() {
  const board = $id('game-board');
  board.innerHTML = '';
  const svg = document.createElementNS('http://www.w3.org/2000/svg','svg');
  svg.setAttribute('id','board-svg');
  svg.setAttribute('viewBox','0 0 600 600');
  svg.setAttribute('preserveAspectRatio','none');
  board.appendChild(svg);

  // Build cells: row 0 (top) = cells 91-100, row 9 (bottom) = cells 1-10
  for (let row = 0; row < 10; row++) {
    for (let col = 0; col < 10; col++) {
      const cellNum = getCellNumber(row, col);
      const cell = document.createElement('div');
      cell.className = `board-cell ${(row + col) % 2 === 0 ? 'even' : 'odd'}`;
      cell.id = `cell-${cellNum}`;
      cell.setAttribute('data-num', cellNum);

      const num = document.createElement('span');
      num.className = 'cell-number';
      num.textContent = cellNum;
      cell.appendChild(num);

      if (SNAKES[cellNum]) {
        cell.classList.add('cell-snake');
        cell.setAttribute('data-icon', '🐍');
      } else if (LADDERS[cellNum]) {
        cell.classList.add('cell-ladder');
        cell.setAttribute('data-icon', '🪜');
      }

      board.appendChild(cell);
    }
  }

  drawSnakesAndLadders(svg);
}

function getCellNumber(row, col) {
  // row 0 = top (91-100), row 9 = bottom (1-10)
  const baseRow = 9 - row;
  if (baseRow % 2 === 0) {
    // left to right
    return baseRow * 10 + col + 1;
  } else {
    // right to left
    return baseRow * 10 + (9 - col) + 1;
  }
}

function getCellCenter(cellNum) {
  // Find the cell's grid position
  const cellNum0 = cellNum - 1; // 0-indexed
  const rowFromBottom = Math.floor(cellNum0 / 10);
  const colInRow = cellNum0 % 10;
  
  // row from top
  const row = 9 - rowFromBottom;
  let col;
  if (rowFromBottom % 2 === 0) {
    col = colInRow;
  } else {
    col = 9 - colInRow;
  }
  
  // SVG is 600x600, 10x10 cells = 60px each
  const x = col * 60 + 30;
  const y = row * 60 + 30;
  return { x, y };
}

function drawSnakesAndLadders(svg) {
  // Draw ladders
  Object.entries(LADDERS).forEach(([from, to]) => {
    const f = getCellCenter(parseInt(from));
    const t = getCellCenter(parseInt(to));
    
    const g = document.createElementNS('http://www.w3.org/2000/svg','g');
    
    // Shadow
    const shadow = document.createElementNS('http://www.w3.org/2000/svg','line');
    shadow.setAttribute('x1', f.x + 2); shadow.setAttribute('y1', f.y + 2);
    shadow.setAttribute('x2', t.x + 2); shadow.setAttribute('y2', t.y + 2);
    shadow.setAttribute('stroke','rgba(0,0,0,0.3)');
    shadow.setAttribute('stroke-width','8');
    shadow.setAttribute('stroke-linecap','round');
    g.appendChild(shadow);

    // Main line
    const line = document.createElementNS('http://www.w3.org/2000/svg','line');
    line.setAttribute('x1', f.x); line.setAttribute('y1', f.y);
    line.setAttribute('x2', t.x); line.setAttribute('y2', t.y);
    line.setAttribute('stroke','var(--ladder)');
    line.setAttribute('stroke-width','6');
    line.setAttribute('stroke-linecap','round');
    line.setAttribute('opacity','0.85');
    g.appendChild(line);

    // Rungs
    const dx = t.x - f.x, dy = t.y - f.y;
    const len = Math.sqrt(dx*dx + dy*dy);
    const steps = Math.max(2, Math.floor(len/40));
    const nx = -dy/len * 8, ny = dx/len * 8;
    for (let i = 1; i < steps; i++) {
      const px = f.x + dx * i/steps, py = f.y + dy * i/steps;
      const rung = document.createElementNS('http://www.w3.org/2000/svg','line');
      rung.setAttribute('x1', px - nx); rung.setAttribute('y1', py - ny);
      rung.setAttribute('x2', px + nx); rung.setAttribute('y2', py + ny);
      rung.setAttribute('stroke','var(--ladder)');
      rung.setAttribute('stroke-width','3');
      rung.setAttribute('opacity','0.7');
      g.appendChild(rung);
    }

    // Label
    const mid = { x: (f.x+t.x)/2, y: (f.y+t.y)/2 };
    const txt = document.createElementNS('http://www.w3.org/2000/svg','text');
    txt.setAttribute('x', mid.x); txt.setAttribute('y', mid.y - 5);
    txt.setAttribute('text-anchor','middle'); txt.setAttribute('font-size','14');
    txt.textContent = '🪜';
    g.appendChild(txt);

    svg.appendChild(g);
  });

  // Draw snakes
  Object.entries(SNAKES).forEach(([from, to]) => {
    const f = getCellCenter(parseInt(from));
    const t = getCellCenter(parseInt(to));
    
    const g = document.createElementNS('http://www.w3.org/2000/svg','g');
    
    // Bezier curve for snake body
    const mx = (f.x + t.x) / 2 + (Math.random() * 40 - 20);
    const my = (f.y + t.y) / 2 + (Math.random() * 40 - 20);
    
    const path = document.createElementNS('http://www.w3.org/2000/svg','path');
    path.setAttribute('d', `M ${f.x} ${f.y} Q ${mx} ${my} ${t.x} ${t.y}`);
    path.setAttribute('stroke','var(--snake)');
    path.setAttribute('stroke-width','7');
    path.setAttribute('fill','none');
    path.setAttribute('stroke-linecap','round');
    path.setAttribute('opacity','0.8');
    g.appendChild(path);

    // Scale pattern
    const pathEl = document.createElementNS('http://www.w3.org/2000/svg','path');
    pathEl.setAttribute('d', `M ${f.x} ${f.y} Q ${mx} ${my} ${t.x} ${t.y}`);
    pathEl.setAttribute('stroke','rgba(255,255,255,0.15)');
    pathEl.setAttribute('stroke-width','3');
    pathEl.setAttribute('stroke-dasharray','8 6');
    pathEl.setAttribute('fill','none');
    pathEl.setAttribute('stroke-linecap','round');
    g.appendChild(pathEl);

    // Head emoji
    const txt = document.createElementNS('http://www.w3.org/2000/svg','text');
    txt.setAttribute('x', f.x); txt.setAttribute('y', f.y - 6);
    txt.setAttribute('text-anchor','middle'); txt.setAttribute('font-size','16');
    txt.textContent = '🐍';
    g.appendChild(txt);

    svg.appendChild(g);
  });
}

// ---- TOKENS ----
function buildTokens() {
  // Remove old tokens
  document.querySelectorAll('.player-token').forEach(t => t.remove());
  state.players.forEach(p => {
    const token = document.createElement('div');
    token.className = 'player-token';
    token.id = `token-${p.id}`;
    token.textContent = p.emoji;
    token.style.background = p.color;
    token.style.opacity = '0';
    $id('game-board').appendChild(token);
    placeToken(p);
    setTimeout(() => { token.style.opacity = '1'; }, 100 * p.id);
  });
}

function placeToken(player) {
  const token = $id(`token-${player.id}`);
  if (!token) return;

  if (player.position === 0) {
    token.style.opacity = '0';
    return;
  }
  token.style.opacity = '1';

  const cell = $id(`cell-${player.position}`);
  if (!cell) return;

  const board = $id('game-board');
  const boardRect = board.getBoundingClientRect();
  const cellRect = cell.getBoundingClientRect();

  // Offset slightly for multiple players on same cell
  const playersOnCell = state.players.filter(p => p.position === player.position);
  const pIdx = playersOnCell.findIndex(p => p.id === player.id);
  const offsets = [[0,0],[10,-8],[-8,8],[8,8]];
  const off = offsets[pIdx] || [0,0];

  const x = cellRect.left - boardRect.left + cellRect.width/2 - 14 + off[0];
  const y = cellRect.top - boardRect.top + cellRect.height/2 - 14 + off[1];

  token.style.left = x + 'px';
  token.style.top = y + 'px';
}

// ---- PLAYER CARDS ----
function renderPlayerCards() {
  const container = $id('player-cards');
  container.innerHTML = '';
  state.players.forEach((p, i) => {
    const card = document.createElement('div');
    card.className = `player-card ${i === state.currentTurn ? 'current-turn' : ''}`;
    card.id = `pcard-${p.id}`;
    card.innerHTML = `
      <div class="p-avatar" style="background:${p.color}22">${p.emoji}</div>
      <div class="p-info">
        <div class="p-name">${p.name}</div>
        <div class="p-pos">${p.position === 0 ? 'Start' : `Square ${p.position}`}</div>
      </div>
      <div class="p-status">
        ${i === state.currentTurn ? '<span class="turn-indicator">TURN</span>' : ''}
      </div>
    `;
    container.appendChild(card);
  });
}

// ---- DICE ----
function renderDice(val, val2 = null) {
  const wrapper = $id('dice-wrapper');
  const positions = ['d1','d2','d3','d4','d5','d6','d7','d8','d9'];
  const dotHTML = positions.map(d => `<div class="dot ${d}"></div>`).join('');

  if (state.diceCount === 1) {
    wrapper.innerHTML = `<div class="dice" id="dice1" data-val="${val}">${dotHTML}</div>`;
  } else {
    wrapper.innerHTML = `
      <div class="dice" id="dice1" data-val="${val}">${dotHTML}</div>
      <div class="dice" id="dice2" data-val="${val2 || val}">${dotHTML}</div>
    `;
  }
}

// ---- STATUS ----
function setStatus(msg) {
  $id('status-msg').innerHTML = msg;
}

// ---- ROLL ----
$id('btn-roll') && ($id('btn-roll').addEventListener('click', rollDice));

function rollDice() {
  if (state.rolling || state.gameOver) return;
  state.rolling = true;
  $id('btn-roll').disabled = true;
  haptic([30, 20, 30]);
  playSound(state.settings.soundUrl);

  const d1 = $id('dice1');
  const d2 = $id('dice2');
  if (d1) d1.classList.add('rolling');
  if (d2) d2.classList.add('rolling');

  let frames = 0;
  const interval = setInterval(() => {
    const r1 = Math.floor(Math.random()*6)+1;
    const r2 = Math.floor(Math.random()*6)+1;
    if (d1) d1.setAttribute('data-val', r1);
    if (d2) d2.setAttribute('data-val', r2);
    frames++;
    if (frames >= 8) {
      clearInterval(interval);
      if (d1) d1.classList.remove('rolling');
      if (d2) d2.classList.remove('rolling');
      const final1 = Math.floor(Math.random()*6)+1;
      const final2 = state.diceCount === 2 ? Math.floor(Math.random()*6)+1 : null;
      if (d1) d1.setAttribute('data-val', final1);
      if (d2 && final2) d2.setAttribute('data-val', final2);
      const total = state.diceCount === 2 ? final1 + final2 : final1;
      setTimeout(() => movePlayer(total), 200);
    }
  }, 80);
}

// ---- MOVE PLAYER ----
async function movePlayer(steps) {
  const player = state.players[state.currentTurn];
  const oldPos = player.position;
  let newPos = oldPos + steps;

  setStatus(`${player.emoji} <strong>${player.name}</strong> rolled <strong>${steps}</strong>!`);

  if (newPos > 100) {
    newPos = 100 - (newPos - 100); // bounce back
    setStatus(`${player.emoji} <strong>${player.name}</strong> rolled ${steps} — bounced back to ${newPos}!`);
  }

  // Animate step by step
  for (let pos = oldPos + 1; pos <= newPos; pos++) {
    player.position = pos;
    placeToken(player);
    await sleep(80);
  }

  haptic([20]);
  addLog(`${player.emoji} ${player.name}: ${oldPos === 0 ? 'Start' : oldPos} → ${newPos} (rolled ${steps})`);

  // Check snake
  if (SNAKES[newPos]) {
    const dest = SNAKES[newPos];
    await sleep(300);
    setStatus(`🐍 Oh no! <strong>${player.name}</strong> hit a snake! Sliding down to ${dest}...`);
    haptic([100, 50, 100]);
    playSound(state.settings.soundUrl);
    await sleep(500);
    player.position = dest;
    placeToken(player);
    addLog(`🐍 ${player.name} slid down from ${newPos} to ${dest}!`);
  }

  // Check ladder
  else if (LADDERS[newPos]) {
    const dest = LADDERS[newPos];
    await sleep(300);
    setStatus(`🪜 Woohoo! <strong>${player.name}</strong> climbed a ladder to ${dest}!`);
    haptic([30, 20, 30, 20, 30]);
    playSound(state.settings.soundUrl);
    await sleep(500);
    player.position = dest;
    placeToken(player);
    addLog(`🪜 ${player.name} climbed from ${newPos} to ${dest}!`);
  }

  // Check win
  if (player.position >= 100) {
    player.position = 100;
    placeToken(player);
    state.gameOver = true;
    state.rolling = false;
    addLog(`🏆 ${player.name} WON THE GAME!`);
    setTimeout(() => showWinScreen(player), 400);
    return;
  }

  // Next turn
  state.currentTurn = (state.currentTurn + 1) % state.players.length;
  state.rolling = false;
  $id('btn-roll').disabled = false;
  renderPlayerCards();
  setStatus(`${state.players[state.currentTurn].emoji} <strong>${state.players[state.currentTurn].name}'s</strong> turn — roll the dice!`);
}

function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

// ---- LOG ----
function addLog(msg) {
  const log = $id('move-log-list');
  const entry = document.createElement('div');
  entry.className = 'log-entry';
  entry.innerHTML = msg;
  log.insertBefore(entry, log.firstChild);
  if (log.children.length > 20) log.removeChild(log.lastChild);
}

// ---- WIN SCREEN ----
function showWinScreen(player) {
  haptic([200, 100, 200, 100, 200]);
  launchConfetti();

  const overlay = document.createElement('div');
  overlay.className = 'win-overlay';
  overlay.id = 'win-overlay';
  overlay.innerHTML = `
    <div class="win-card">
      <div class="win-trophy">🏆</div>
      <h2>${player.name} Wins!</h2>
      <p>${player.emoji} Reached square 100 first! Congratulations! 🎉</p>
      <div class="win-buttons">
        <button class="btn-replay" id="btn-replay">Play Again</button>
        <button class="btn-new" id="btn-new">New Setup</button>
      </div>
    </div>
  `;
  document.body.appendChild(overlay);

  $id('btn-replay').addEventListener('click', () => {
    overlay.remove();
    replayGame();
  });
  $id('btn-new').addEventListener('click', () => {
    overlay.remove();
    goToSetup();
  });
}

function replayGame() {
  state.players.forEach(p => { p.position = 0; });
  state.currentTurn = 0;
  state.rolling = false;
  state.gameOver = false;
  buildTokens();
  renderPlayerCards();
  $id('btn-roll').disabled = false;
  $id('move-log-list').innerHTML = '';
  setStatus(`${state.players[0].name}'s turn! Roll the dice 🎲`);
}

function goToSetup() {
  $id('game-screen').classList.remove('active');
  $id('setup-screen').style.display = 'flex';
  if (document.exitFullscreen && document.fullscreenElement) {
    document.exitFullscreen().catch(() => {});
  }
  stopBgMusic();
}

// ---- CONFETTI ----
function launchConfetti() {
  const colors = ['#ff4d6d','#f7c948','#6c3fc5','#22c55e','#3b82f6','#f97316'];
  for (let i = 0; i < 80; i++) {
    setTimeout(() => {
      const piece = document.createElement('div');
      piece.className = 'confetti-piece';
      piece.style.left = Math.random() * 100 + 'vw';
      piece.style.top = '-20px';
      piece.style.background = colors[Math.floor(Math.random() * colors.length)];
      piece.style.transform = `rotate(${Math.random()*360}deg)`;
      piece.style.animationDuration = (1.5 + Math.random() * 1.5) + 's';
      piece.style.animationDelay = (Math.random() * 0.5) + 's';
      piece.style.width = (6 + Math.random() * 10) + 'px';
      piece.style.height = (6 + Math.random() * 10) + 'px';
      piece.style.borderRadius = Math.random() > 0.5 ? '50%' : '2px';
      document.body.appendChild(piece);
      setTimeout(() => piece.remove(), 3500);
    }, i * 25);
  }
}

// ---- HAMBURGER MENU ----
function initHamburgerMenu() {
  const overlay = $id('menu-overlay');
  const menu = $id('side-menu');
  const hamburger = $id('hamburger-btn');
  const closeBtn = $id('menu-close');

  function openMenu() {
    overlay.classList.add('open');
    menu.classList.add('open');
    hamburger.classList.add('open');
  }
  function closeMenu() {
    overlay.classList.remove('open');
    menu.classList.remove('open');
    hamburger.classList.remove('open');
  }

  hamburger.addEventListener('click', openMenu);
  closeBtn.addEventListener('click', closeMenu);
  overlay.addEventListener('click', closeMenu);

  // Sound toggle
  const soundToggle = $id('toggle-sound');
  soundToggle.checked = state.settings.soundEnabled;
  soundToggle.addEventListener('change', () => {
    state.settings.soundEnabled = soundToggle.checked;
  });

  // Haptic toggle
  const hapticToggle = $id('toggle-haptic');
  hapticToggle.checked = state.settings.hapticEnabled;
  hapticToggle.addEventListener('change', () => {
    state.settings.hapticEnabled = hapticToggle.checked;
    if (hapticToggle.checked) haptic([50]);
  });

  // Sound URL
  const soundUrlInput = $id('sound-url-input');
  soundUrlInput.value = state.settings.soundUrl;
  soundUrlInput.addEventListener('change', () => {
    state.settings.soundUrl = soundUrlInput.value;
  });
  $id('btn-test-sound').addEventListener('click', () => {
    playSound(soundUrlInput.value);
  });

  // Dice count
  document.querySelectorAll('.dice-count-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      document.querySelectorAll('.dice-count-btn').forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
      state.diceCount = parseInt(btn.dataset.count);
      renderDice(1, 1);
    });
  });

  // BG Music toggle
  const bgToggle = $id('toggle-bgmusic');
  bgToggle.checked = state.settings.bgMusicEnabled;
  bgToggle.addEventListener('change', () => {
    state.settings.bgMusicEnabled = bgToggle.checked;
    if (bgToggle.checked) {
      playBgMusic();
    } else {
      stopBgMusic();
    }
  });

  // Music volume
  const volSlider = $id('music-volume');
  volSlider.value = state.settings.bgMusicVolume;
  volSlider.addEventListener('input', () => {
    state.settings.bgMusicVolume = parseFloat(volSlider.value);
    if (bgAudio) bgAudio.volume = state.settings.bgMusicVolume;
  });

  // Music file upload
  $id('music-file-input').addEventListener('change', function() {
    const file = this.files[0];
    if (!file) return;
    localMusicBlob = URL.createObjectURL(file);
    $id('music-file-label-text').textContent = file.name;
    state.settings.bgMusicEnabled = true;
    bgToggle.checked = true;
    playBgMusic();
  });

  $id('btn-music-stop').addEventListener('click', () => {
    stopBgMusic();
    bgToggle.checked = false;
    state.settings.bgMusicEnabled = false;
  });

  // Fullscreen toggle
  $id('btn-fullscreen').addEventListener('click', () => {
    if (!document.fullscreenElement) {
      document.documentElement.requestFullscreen().catch(() => {});
    } else {
      document.exitFullscreen().catch(() => {});
    }
  });

  // New game
  $id('btn-menu-newgame').addEventListener('click', () => {
    closeMenu();
    goToSetup();
  });
  $id('btn-menu-restart').addEventListener('click', () => {
    closeMenu();
    replayGame();
  });
}

// ---- INIT ----
document.addEventListener('DOMContentLoaded', () => {
  initSetup();
  initHamburgerMenu();
  renderDice(1);
  // Set roll button listener
  $id('btn-roll').addEventListener('click', rollDice);
});
