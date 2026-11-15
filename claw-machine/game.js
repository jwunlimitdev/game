const cv = document.getElementById('c');
const ctx = cv.getContext('2d');
const W = 480, H = 640;
const TOP = 90, FLOOR = 500, DROP_Y = 455, BIN_X = 400, MIN_X = 50, MAX_X = 430;
const START_COINS = 20;
const DEX_BONUS = 3;

// 미션: 클리어 시 코인 보상 (한 번만 받음)
const MISSIONS = [
  { id: 'first', text: '첫 인형 획득',   reward: 5,  check: s => s.prizes >= 1 },
  { id: 'p5',    text: '인형 5개 획득',  reward: 10, check: s => s.prizes >= 5 },
  { id: 'p10',   text: '인형 10개 획득', reward: 20, check: s => s.prizes >= 10 },
  { id: 'p30',   text: '인형 30개 획득', reward: 40, check: s => s.prizes >= 30 },
  { id: 'epic',  text: '에픽 인형 획득', reward: 30, check: s => s.epic >= 1 },
  { id: 'd5',    text: '도감 5종 등록',  reward: 15, check: s => s.dex >= 5 },
  { id: 'd10',   text: '도감 10종 등록', reward: 25, check: s => s.dex >= 10 },
  { id: 'd20',   text: '도감 20종 완성', reward: 60, check: s => s.dex >= 20 }
];

let shopIdx = 0, state, clawX, clawY, clawOpen, dir, grabT, dolls, held;
let coins, score, session, msgTimer = 0;

function loadJSON(key, fallback) {
  try { return JSON.parse(localStorage.getItem(key)) ?? fallback; }
  catch (e) { return fallback; }
}
function saveJSON(key, value) {
  try { localStorage.setItem(key, JSON.stringify(value)); } catch (e) {}
}

let collection = new Set(loadJSON('clawCollection', []));
let completed = new Set(loadJSON('clawMissions', []));

function rand(a, b) { return a + Math.random() * (b - a); }
function clamp(v, a, b) { return Math.max(a, Math.min(b, v)); }

function shopPool() {
  const s = SHOPS[shopIdx];
  return DOLL_TYPES.filter(t => t.tier >= s.minTier);
}

function makeDoll() {
  const pool = shopPool();
  const t = pool[Math.floor(Math.random() * pool.length)];
  return { t, r: t.r, x: rand(60, 360), y: FLOOR - t.r };
}

function fillDolls(n) {
  while (dolls.length < n) dolls.push(makeDoll());
}

function setMsg(text) {
  document.getElementById('msg').textContent = text;
  msgTimer = 120;
}

function updHud() {
  document.getElementById('coins').textContent = coins;
  document.getElementById('score').textContent = score;
  document.getElementById('prizes').textContent = session.prizes;
  document.getElementById('dexCount').textContent = collection.size;
}

function renderShops() {
  const box = document.getElementById('shops');
  box.innerHTML = '';
  SHOPS.forEach((s, i) => {
    const b = document.createElement('button');
    b.textContent = (i + 1) + '호점';
    if (i === shopIdx) b.className = 'active';
    b.onclick = () => switchShop(i);
    box.appendChild(b);
  });
  const s = SHOPS[shopIdx];
  document.getElementById('shopInfo').textContent =
    s.name + ' · 1판 ' + s.cost + '코인 · 잡기 보정 x' + s.grip.toFixed(2);
}

function applyTheme() {
  cv.style.background = SHOPS[shopIdx].bg;
  renderShops();
}

function enterShop() {
  state = 'idle';
  clawX = 240; clawY = TOP; clawOpen = true; dir = 0; grabT = 0;
  dolls = []; held = null;
  fillDolls(10);
  applyTheme();
  setMsg(SHOPS[shopIdx].name + '에 오신 것을 환영합니다!');
}

function switchShop(i) {
  if (state !== 'idle' || held) { setMsg('인형을 다 꺼낸 뒤에 가게를 옮길 수 있어요'); return; }
  if (i === shopIdx) return;
  shopIdx = i;
  enterShop();
  updHud();
}

function drop() {
  if (state !== 'idle') return;
  const s = SHOPS[shopIdx];
  if (coins < s.cost) { setMsg('코인이 부족해요! 미션을 클리어해 코인을 모으세요'); return; }
  coins -= s.cost;
  updHud();
  state = 'down'; clawY = TOP; clawOpen = true;
}

function tryGrab() {
  const s = SHOPS[shopIdx];
  const cand = dolls
    .filter(d => Math.abs(d.x - clawX) < d.r + 8)
    .sort((a, b) => Math.abs(a.x - clawX) - Math.abs(b.x - clawX))[0];
  if (cand && Math.random() < Math.min(0.95, cand.t.grip * s.grip)) {
    held = cand;
    dolls = dolls.filter(d => d !== cand);
    setMsg(cand.t.name + ' 잡았다! 위로 올라갑니다');
  } else {
    setMsg(cand ? '아쉽! 놓쳤어요' : '헛탕! 아무것도 없어요');
  }
}

function release() {
  const t = held.t;
  score += t.value;
  session.prizes++;
  if (t.tier === 2) session.epic++;
  let extra = '';
  if (!collection.has(t.name)) {
    collection.add(t.name);
    saveJSON('clawCollection', [...collection]);
    coins += DEX_BONUS;
    extra = ' 🆕 도감 등록! +' + DEX_BONUS + '코인';
    renderDex();
  }
  held = null;
  fillDolls(10);
  updHud();
  const rewards = checkMissions();
  setMsg(t.name + ' 획득! +' + t.value + '점' + extra + rewards);
}

function checkMissions() {
  const stats = { prizes: session.prizes, epic: session.epic, dex: collection.size };
  let text = '';
  MISSIONS.forEach(m => {
    if (!completed.has(m.id) && m.check(stats)) {
      completed.add(m.id);
      coins += m.reward;
      text += ' 🎯 미션 클리어! ' + m.text + ' +' + m.reward + '코인';
    }
  });
  if (text) saveJSON('clawMissions', [...completed]);
  renderMissions();
  updHud();
  return text;
}

function renderDex() {
  const grid = document.getElementById('dexGrid');
  grid.innerHTML = DOLL_TYPES.map(t => {
    const on = collection.has(t.name);
    return '<div class="cell' + (on ? '' : ' off') + '">' +
      '<div class="dot" style="background:' + (on ? t.color : '#444') + '"></div>' +
      (on ? t.name : '???') + '</div>';
  }).join('');
  updHud();
}

function renderMissions() {
  const list = document.getElementById('missionList');
  list.innerHTML = MISSIONS.map(m => {
    const done = completed.has(m.id);
    return '<div class="mission' + (done ? ' done' : '') + '">' +
      '<span>' + (done ? '✅ ' : '⬜ ') + m.text + '</span>' +
      '<b>+' + m.reward + '코인</b></div>';
  }).join('');
}

function update() {
  if (msgTimer > 0 && --msgTimer === 0 && state === 'idle' && coins < SHOPS[shopIdx].cost) {
    setMsg('코인이 부족해요! 미션을 클리어해 코인을 모으세요');
  }
  if (state === 'idle') {
    if (dir) clawX = clamp(clawX + dir * 3, MIN_X, MAX_X);
  } else if (state === 'down') {
    clawY += 4;
    if (clawY >= DROP_Y) { clawY = DROP_Y; state = 'grab'; grabT = 0; clawOpen = false; tryGrab(); }
  } else if (state === 'grab') {
    if (++grabT > 30) state = 'up';
  } else if (state === 'up') {
    clawY -= 3;
    if (clawY <= TOP) { clawY = TOP; state = held ? 'move' : 'idle'; }
  } else if (state === 'move') {
    clawX += 4;
    if (clawX >= BIN_X) {
      clawX = BIN_X;
      if (held) release();
      state = 'idle';
    }
  }
  if (held) { held.x = clawX; held.y = clawY + 30; }
}

function drawDoll(d) {
  const { x, y, r } = d;
  const name = d.t.name;
  ctx.fillStyle = d.t.color;
  if (name === '고양이' || name === '여우' || name === '드래곤') {
    ctx.beginPath(); ctx.moveTo(x - r * 1.0, y - r * 0.5); ctx.lineTo(x - r * 0.6, y - r * 1.2); ctx.lineTo(x - r * 0.2, y - r * 0.7); ctx.fill();
    ctx.beginPath(); ctx.moveTo(x + r * 1.0, y - r * 0.5); ctx.lineTo(x + r * 0.6, y - r * 1.2); ctx.lineTo(x + r * 0.2, y - r * 0.7); ctx.fill();
  } else {
    ctx.beginPath(); ctx.arc(x - r * 0.7, y - r * 0.8, r * 0.38, 0, Math.PI * 2); ctx.fill();
    ctx.beginPath(); ctx.arc(x + r * 0.7, y - r * 0.8, r * 0.38, 0, Math.PI * 2); ctx.fill();
  }
  ctx.beginPath(); ctx.arc(x, y, r, 0, Math.PI * 2); ctx.fill();
  ctx.fillStyle = '#222';
  ctx.beginPath(); ctx.arc(x - r * 0.35, y - r * 0.15, r * 0.1, 0, Math.PI * 2); ctx.fill();
  ctx.beginPath(); ctx.arc(x + r * 0.35, y - r * 0.15, r * 0.1, 0, Math.PI * 2); ctx.fill();
  ctx.strokeStyle = '#222'; ctx.lineWidth = 2;
  ctx.beginPath(); ctx.arc(x, y + r * 0.2, r * 0.25, 0.1, Math.PI - 0.1); ctx.stroke();
  if (name === '유니콘') {
    ctx.fillStyle = '#fff';
    ctx.beginPath(); ctx.moveTo(x, y - r * 1.7); ctx.lineTo(x - 5, y - r * 0.9); ctx.lineTo(x + 5, y - r * 0.9); ctx.fill();
  }
  if (name === '천사') {
    ctx.strokeStyle = '#ffe066'; ctx.lineWidth = 3;
    ctx.beginPath(); ctx.ellipse(x, y - r * 1.4, r * 0.5, r * 0.15, 0, 0, Math.PI * 2); ctx.stroke();
  }
}

function drawClaw() {
  ctx.strokeStyle = '#ccc'; ctx.lineWidth = 3;
  ctx.beginPath(); ctx.moveTo(clawX, TOP - 20); ctx.lineTo(clawX, clawY); ctx.stroke();
  ctx.fillStyle = '#888';
  ctx.fillRect(clawX - 14, clawY - 12, 28, 14);
  const spread = clawOpen ? 20 : 6;
  ctx.strokeStyle = '#ddd'; ctx.lineWidth = 5; ctx.lineCap = 'round';
  [-1, 0, 1].forEach(i => {
    ctx.beginPath();
    ctx.moveTo(clawX + i * 6, clawY + 2);
    ctx.lineTo(clawX + i * spread, clawY + 26);
    ctx.stroke();
  });
}

function draw() {
  const s = SHOPS[shopIdx];
  ctx.clearRect(0, 0, W, H);
  ctx.fillStyle = s.bg;
  ctx.fillRect(0, 0, W, H);
  ctx.fillStyle = s.skin;
  ctx.fillRect(20, TOP - 40, W - 40, 16);
  ctx.fillStyle = 'rgba(160,220,255,0.08)';
  ctx.fillRect(20, TOP - 20, W - 40, FLOOR - TOP + 40);
  ctx.fillStyle = '#6b4a9b';
  ctx.fillRect(20, FLOOR, W - 40, H - FLOOR - 60);
  ctx.fillStyle = '#111';
  ctx.fillRect(BIN_X - 30, FLOOR + 10, 60, 40);
  ctx.fillStyle = '#ffe066'; ctx.font = '12px sans-serif'; ctx.textAlign = 'center';
  ctx.fillText('배출구', BIN_X, FLOOR + 66);

  dolls.forEach(drawDoll);
  drawClaw();
  if (held) drawDoll(held);
}

function loop() {
  update();
  draw();
  requestAnimationFrame(loop);
}

// 입력 - 키보드
document.addEventListener('keydown', e => {
  if (e.key === 'ArrowLeft' || e.key === 'a') dir = -1;
  else if (e.key === 'ArrowRight' || e.key === 'd') dir = 1;
  else if (e.key === ' ' || e.key === 'Enter') { e.preventDefault(); drop(); }
});
document.addEventListener('keyup', e => {
  if (['ArrowLeft', 'a', 'ArrowRight', 'd'].includes(e.key)) dir = 0;
});

// 입력 - 버튼 (누르고 있으면 계속 이동)
function bindHold(id, d) {
  const el = document.getElementById(id);
  const start = e => { e.preventDefault(); dir = d; };
  const stop = () => { dir = 0; };
  el.addEventListener('pointerdown', start);
  el.addEventListener('pointerup', stop);
  el.addEventListener('pointerleave', stop);
  el.addEventListener('pointercancel', stop);
}
bindHold('left', -1);
bindHold('right', 1);
document.getElementById('drop').onclick = drop;

function togglePanel(panelId, btnId, label) {
  const panel = document.getElementById(panelId);
  panel.hidden = !panel.hidden;
  document.getElementById(btnId).textContent = panel.hidden ? label + ' 열기' : label + ' 닫기';
}
document.getElementById('toggleDex').onclick = () => togglePanel('dex', 'toggleDex', '📖 도감');
document.getElementById('toggleMission').onclick = () => togglePanel('mission', 'toggleMission', '🎯 미션');

// 시작
coins = START_COINS;
score = 0;
session = { prizes: 0, epic: 0 };
enterShop();
renderDex();
renderMissions();
updHud();
loop();
