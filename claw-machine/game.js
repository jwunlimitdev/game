const cv = document.getElementById('c');
const ctx = cv.getContext('2d');
const W = 480, H = 640;
const TOP = 90, FLOOR = 500, DROP_Y = 455, BIN_X = 400, MIN_X = 50, MAX_X = 430;
const START_COINS = 20;
const DEX_BONUS = 3;
const SELL_PRICE = [5, 15, 30];   // 일반 / 레어 / 에픽 판매가
const MIN_SELL_COUNT = 2;         // 보관함에 2개 이상일 때 판매 가능

function thresholdMissions(prefix, label, key, values, rewards) {
  return values.map((v, i) => ({
    id: prefix + v,
    text: label.replace('{n}', v),
    reward: rewards[i],
    check: s => s[key] >= v
  }));
}

// 미션 목록 (총 36개)
const MISSIONS = [
  ...thresholdMissions('p', '인형 {n}개 획득', 'prizes', [1, 3, 5, 10, 20, 30, 50, 100], [5, 8, 10, 20, 30, 40, 60, 100]),
  ...thresholdMissions('d', '도감 {n}종 등록', 'dex', [1, 3, 5, 8, 10, 12, 15, 18, 20], [3, 5, 10, 12, 15, 20, 25, 30, 60]),
  ...thresholdMissions('e', '에픽 인형 {n}개 획득', 'epic', [1, 3, 5, 10], [30, 50, 80, 120]),
  ...thresholdMissions('s', '인형 {n}개 판매', 'sold', [1, 5, 10, 20, 50], [5, 15, 25, 40, 80]),
  ...thresholdMissions('sc', '점수 {n}점 달성', 'score', [1000, 5000, 10000, 30000, 50000], [10, 30, 50, 80, 120]),
  ...SHOPS.map((s, i) => ({
    id: 'v' + i,
    text: s.name + ' 방문',
    reward: 10,
    check: st => st.visited.includes(i)
  }))
];

let shopIdx = 0, state, clawX, clawY, clawOpen, dir, grabT, dolls, held;
let msgTimer = 0;
let coins, score, stats, collection, completed, visited, inv;

function loadJSON(key, fallback) {
  try { return JSON.parse(localStorage.getItem(key)) ?? fallback; }
  catch (e) { return fallback; }
}
function saveJSON(key, value) {
  try { localStorage.setItem(key, JSON.stringify(value)); } catch (e) {}
}

function loadSave() {
  const d = loadJSON('clawSave', null);
  if (d) {
    coins = d.coins; score = d.score; stats = d.stats;
    collection = new Set(d.collection);
    completed = new Set(d.completed);
    visited = new Set(d.visited);
    inv = d.inv.map(n => DOLL_TYPES.find(t => t.name === n)).filter(Boolean);
  } else {
    // 이전 버전 저장값 이어받기
    coins = START_COINS; score = 0;
    stats = { prizes: 0, epic: 0, sold: 0 };
    collection = new Set(loadJSON('clawCollection', []));
    completed = new Set(loadJSON('clawMissions', []));
    visited = new Set();
    inv = [];
  }
  visited.add(shopIdx);
}

function save() {
  saveJSON('clawSave', {
    coins, score, stats,
    collection: [...collection],
    completed: [...completed],
    visited: [...visited],
    inv: inv.map(t => t.name)
  });
}

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
  document.getElementById('prizes').textContent = stats.prizes;
  document.getElementById('dexCount').textContent = collection.size;
  document.getElementById('invCount').textContent = inv.length;
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
  visited.add(shopIdx);
  const rewards = checkMissions();
  setMsg(SHOPS[shopIdx].name + '에 오신 것을 환영합니다!' + rewards);
}

function switchShop(i) {
  if (state !== 'idle' || held) { setMsg('인형을 다 꺼낸 뒤에 가게를 옮길 수 있어요'); return; }
  if (i === shopIdx) return;
  shopIdx = i;
  enterShop();
  updHud();
  save();
}

function drop() {
  if (state !== 'idle') return;
  const s = SHOPS[shopIdx];
  if (coins < s.cost) { setMsg('코인이 부족해요! 미션을 클리어하거나 인형을 팔아 코인을 모으세요'); return; }
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
  inv.push(t);
  stats.prizes++;
  if (t.tier === 2) stats.epic++;
  score += t.value;
  let extra = '';
  if (!collection.has(t.name)) {
    collection.add(t.name);
    coins += DEX_BONUS;
    extra = ' 🆕 도감 등록! +' + DEX_BONUS + '코인';
    renderDex();
  }
  held = null;
  fillDolls(10);
  const rewards = checkMissions();
  setMsg(t.name + ' 보관함에 들어갔어요! +' + t.value + '점' + extra + rewards);
  renderInv();
  updHud();
  save();
}

function sellDoll(i) {
  if (inv.length < MIN_SELL_COUNT) { setMsg('인형이 2개 이상 있어야 팔 수 있어요'); return; }
  const t = inv.splice(i, 1)[0];
  const price = SELL_PRICE[t.tier];
  coins += price;
  stats.sold++;
  const rewards = checkMissions();
  setMsg(t.name + ' 판매! +' + price + '코인' + rewards);
  renderInv();
  updHud();
  save();
}

function checkMissions() {
  const st = {
    prizes: stats.prizes, epic: stats.epic, sold: stats.sold,
    score, dex: collection.size, visited: [...visited]
  };
  let text = '';
  MISSIONS.forEach(m => {
    if (!completed.has(m.id) && m.check(st)) {
      completed.add(m.id);
      coins += m.reward;
      text += ' 🎯 미션 클리어! ' + m.text + ' +' + m.reward + '코인';
    }
  });
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
  const done = MISSIONS.filter(m => completed.has(m.id)).length;
  document.getElementById('missionCount').textContent = done + '/' + MISSIONS.length;
  list.innerHTML = MISSIONS.map(m => {
    const isDone = completed.has(m.id);
    return '<div class="mission' + (isDone ? ' done' : '') + '">' +
      '<span>' + (isDone ? '✅ ' : '⬜ ') + m.text + '</span>' +
      '<b>+' + m.reward + '코인</b></div>';
  }).join('');
}

function renderInv() {
  const box = document.getElementById('invList');
  const can = inv.length >= MIN_SELL_COUNT;
  document.getElementById('invInfo').textContent =
    '보관 ' + inv.length + '개 · 2개 이상이면 판매할 수 있어요';
  if (!inv.length) {
    box.innerHTML = '<div class="empty">보관함이 비었어요. 인형을 잡아 보세요!</div>';
    return;
  }
  box.innerHTML = inv.map((t, i) =>
    '<div class="mission"><span><i class="dotm" style="background:' + t.color + '"></i>' + t.name + '</span>' +
    '<button class="sell" data-i="' + i + '"' + (can ? '' : ' disabled') + '>판매 +' + SELL_PRICE[t.tier] + '</button></div>'
  ).join('');
  box.querySelectorAll('button.sell').forEach(b => {
    b.onclick = () => sellDoll(Number(b.dataset.i));
  });
}

function update() {
  if (msgTimer > 0 && --msgTimer === 0 && state === 'idle' && coins < SHOPS[shopIdx].cost) {
    setMsg('코인이 부족해요! 미션을 클리어하거나 인형을 팔아 코인을 모으세요');
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
document.getElementById('toggleInv').onclick = () => togglePanel('inv', 'toggleInv', '🎒 보관함');

// 시작
loadSave();
enterShop();
renderDex();
renderMissions();
renderInv();
updHud();
save();
loop();
