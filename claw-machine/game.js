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

// ───────── 인형 그래픽 ─────────

// 색을 밝게(f>0) 또는 어둡게(f<0) 만든다
function shade(hex, f) {
  const n = parseInt(hex.slice(1), 16);
  let r = (n >> 16) & 255, g = (n >> 8) & 255, b = n & 255;
  const t = f < 0 ? 0 : 255, p = Math.abs(f);
  r = Math.round(r + (t - r) * p);
  g = Math.round(g + (t - g) * p);
  b = Math.round(b + (t - b) * p);
  return 'rgb(' + r + ',' + g + ',' + b + ')';
}

function ell(x, y, rx, ry, fill, line) {
  ctx.beginPath();
  ctx.ellipse(x, y, Math.max(rx, 0.1), Math.max(ry, 0.1), 0, 0, Math.PI * 2);
  if (fill) { ctx.fillStyle = fill; ctx.fill(); }
  if (line) { ctx.strokeStyle = line; ctx.lineWidth = 2; ctx.stroke(); }
}

function tri(pts, fill, line) {
  ctx.beginPath();
  ctx.moveTo(pts[0][0], pts[0][1]);
  for (let i = 1; i < pts.length; i++) ctx.lineTo(pts[i][0], pts[i][1]);
  ctx.closePath();
  if (fill) { ctx.fillStyle = fill; ctx.fill(); }
  if (line) { ctx.strokeStyle = line; ctx.lineWidth = 2; ctx.stroke(); }
}

// 머리 뒤쪽 장식 (날개, 꼬리, 갈기)
function drawBack(name, x, y, r, c, line) {
  if (name === '사자') {
    ell(x, y, r * 1.3, r * 1.22, '#c9782b', shade('#c9782b', -0.5));
  } else if (name === '유니콘') {
    ell(x - r * 0.45, y - r * 0.2, r * 1.1, r * 0.95, '#c59bff', line);
    ell(x - r * 0.1, y - r * 0.7, r * 0.7, r * 0.5, '#ff9ad5', line);
  } else if (name === '공룡') {
    tri([[x + r * 0.6, y + r * 1.4], [x + r * 1.8, y + r * 1.5], [x + r * 0.9, y + r * 0.6]], c, line);
  } else if (name === '여우') {
    ell(x + r * 1.0, y + r * 1.3, r * 0.55, r * 0.25, c, line);
    ell(x + r * 1.45, y + r * 1.3, r * 0.2, r * 0.22, '#ffffff', line);
  } else if (name === '드래곤') {
    [-1, 1].forEach(s => tri([[x + s * r * 0.6, y + r * 0.5], [x + s * r * 2.1, y - r * 0.4], [x + s * r * 1.7, y + r * 1.1]], shade(c, -0.15), line));
  } else if (name === '천사') {
    [-1, 1].forEach(s => ell(x + s * r * 1.15, y + r * 0.5, r * 0.45, r * 0.85, 'rgba(255,255,255,0.92)', '#c9d8ff'));
  } else if (name === '요정') {
    [-1, 1].forEach(s => ell(x + s * r * 1.1, y + r * 0.5, r * 0.5, r * 0.8, 'rgba(255,170,230,0.55)', 'rgba(255,120,200,0.9)'));
  }
}

// 몸통, 팔, 발
function drawBody(name, x, y, r, c, line) {
  const by = y + r * 1.05;
  const g = ctx.createRadialGradient(x - r * 0.3, by - r * 0.3, r * 0.1, x, by, r);
  g.addColorStop(0, shade(c, 0.35));
  g.addColorStop(1, c);
  ctx.fillStyle = g; ctx.strokeStyle = line; ctx.lineWidth = 2;
  ctx.beginPath(); ctx.ellipse(x, by, r * 0.78, r * 0.72, 0, 0, Math.PI * 2); ctx.fill(); ctx.stroke();

  // 팔
  ell(x - r * 0.8, by + r * 0.1, r * 0.2, r * 0.34, c, line);
  ell(x + r * 0.8, by + r * 0.1, r * 0.2, r * 0.34, c, line);
  // 발
  ell(x - r * 0.4, y + r * 1.7, r * 0.3, r * 0.18, shade(c, -0.15), line);
  ell(x + r * 0.4, y + r * 1.7, r * 0.3, r * 0.18, shade(c, -0.15), line);

  if (name === '펭귄') ell(x, by + r * 0.15, r * 0.5, r * 0.55, '#f8f8f8');
  if (name === '로봇') ell(x, by, r * 0.18, r * 0.18, '#ffe066', line);
}

// 머리 뒤쪽 귀 (머리보다 먼저 그림)
function drawEars(name, x, y, r, c, line) {
  switch (name) {
    case '토끼':
      [-1, 1].forEach(s => {
        ell(x + s * r * 0.4, y - r * 1.15, r * 0.24, r * 0.7, c, line);
        ell(x + s * r * 0.4, y - r * 1.15, r * 0.12, r * 0.5, '#ffb3c6');
      });
      break;
    case '곰':
      [-1, 1].forEach(s => {
        ell(x + s * r * 0.72, y - r * 0.7, r * 0.36, r * 0.36, c, line);
        ell(x + s * r * 0.72, y - r * 0.7, r * 0.18, r * 0.18, shade(c, -0.2));
      });
      break;
    case '고양이':
    case '여우':
      [-1, 1].forEach(s => {
        tri([[x + s * r * 0.85, y - r * 0.15], [x + s * r * 0.7, y - r * 1.25], [x + s * r * 0.15, y - r * 0.7]], c, line);
        tri([[x + s * r * 0.7, y - r * 0.3], [x + s * r * 0.65, y - r * 0.95], [x + s * r * 0.3, y - r * 0.65]],
          name === '여우' ? '#2a1a1a' : '#ffb3c6');
      });
      break;
    case '강아지':
      [-1, 1].forEach(s => ell(x + s * r * 0.85, y - r * 0.2, r * 0.3, r * 0.6, shade(c, -0.25), line));
      break;
    case '돼지':
      [-1, 1].forEach(s => tri([[x + s * r * 0.5, y - r * 0.6], [x + s * r * 0.95, y - r * 0.95], [x + s * r * 0.9, y - r * 0.2]], c, line));
      break;
    case '햄스터':
      [-1, 1].forEach(s => {
        ell(x + s * r * 0.5, y - r * 0.85, r * 0.22, r * 0.22, c, line);
        ell(x + s * r * 0.5, y - r * 0.85, r * 0.12, r * 0.12, '#ffb3c6');
      });
      break;
    case '판다':
      [-1, 1].forEach(s => ell(x + s * r * 0.7, y - r * 0.7, r * 0.3, r * 0.3, '#222'));
      break;
    case '코알라':
      [-1, 1].forEach(s => {
        ell(x + s * r * 0.8, y - r * 0.4, r * 0.5, r * 0.5, c, line);
        ell(x + s * r * 0.8, y - r * 0.4, r * 0.3, r * 0.3, '#d7dde5');
      });
      break;
    case '기린':
      [-1, 1].forEach(s => ell(x + s * r * 0.9, y - r * 0.2, r * 0.28, r * 0.15, c, line));
      break;
    case '공룡':
      for (let i = -2; i <= 2; i++) {
        tri([[x + i * r * 0.35 - r * 0.15, y - r * 0.6], [x + i * r * 0.35, y - r * 1.25], [x + i * r * 0.35 + r * 0.15, y - r * 0.6]], shade(c, -0.2), line);
      }
      break;
    case '드래곤':
      [-1, 1].forEach(s => tri([[x + s * r * 0.45, y - r * 0.6], [x + s * r * 0.9, y - r * 1.4], [x + s * r * 0.2, y - r * 0.9]], '#ffe066', line));
      break;
    case '로봇':
      ell(x - r * 0.9, y, r * 0.2, r * 0.3, c, line);
      ell(x + r * 0.9, y, r * 0.2, r * 0.3, c, line);
      break;
  }
}

// 머리
function drawHead(name, x, y, r, c, line) {
  const g = ctx.createRadialGradient(x - r * 0.3, y - r * 0.4, r * 0.1, x, y, r);
  g.addColorStop(0, shade(c, 0.4));
  g.addColorStop(1, c);
  ctx.fillStyle = g; ctx.strokeStyle = line; ctx.lineWidth = 2;
  ctx.beginPath();
  if (name === '로봇' && ctx.roundRect) ctx.roundRect(x - r * 0.9, y - r * 0.9, r * 1.8, r * 1.8, r * 0.4);
  else if (name === '로봇') ctx.rect(x - r * 0.9, y - r * 0.9, r * 1.8, r * 1.8);
  else ctx.arc(x, y, r, 0, Math.PI * 2);
  ctx.fill(); ctx.stroke();
}

// 눈 (흰 하이라이트 포함)
function eyePair(x, y, r, size) {
  [-1, 1].forEach(s => {
    const px = x + s * r * 0.36, py = y - r * 0.12;
    ell(px, py, r * size, r * size * 1.25, '#1b1b2f');
    ell(px + r * size * 0.3, py - r * size * 0.4, r * size * 0.35, r * size * 0.35, '#ffffff');
  });
}

// 얼굴 (눈, 볼, 코, 입)
function drawFace(name, x, y, r, c, line) {
  if (name === '개구리') {
    // 눈은 drawTop에서 머리 위에 그림
  } else if (name === '로봇') {
    ctx.fillStyle = '#67e8f9';
    ctx.fillRect(x - r * 0.5, y - r * 0.3, r * 0.3, r * 0.3);
    ctx.fillRect(x + r * 0.2, y - r * 0.3, r * 0.3, r * 0.3);
    ctx.fillStyle = '#333';
    ctx.fillRect(x - r * 0.35, y + r * 0.3, r * 0.7, r * 0.1);
    return;
  } else if (name === '판다') {
    ell(x - r * 0.36, y - r * 0.12, r * 0.3, r * 0.26, '#222');
    ell(x + r * 0.36, y - r * 0.12, r * 0.3, r * 0.26, '#222');
    eyePair(x, y, r, 0.13);
  } else {
    eyePair(x, y, r, 0.13);
  }

  // 볼 터치
  ell(x - r * 0.55, y + r * 0.2, r * 0.16, r * 0.1, 'rgba(255,120,150,0.55)');
  ell(x + r * 0.55, y + r * 0.2, r * 0.16, r * 0.1, 'rgba(255,120,150,0.55)');

  // 코와 입
  if (name === '펭귄') {
    tri([[x - r * 0.18, y + r * 0.2], [x + r * 0.18, y + r * 0.2], [x, y + r * 0.48]], '#ff9f1c', line);
    return;
  }
  if (name === '오리') {
    ell(x, y + r * 0.3, r * 0.4, r * 0.14, '#ff9f1c', line);
    return;
  }
  if (name === '돼지') {
    ell(x, y + r * 0.28, r * 0.32, r * 0.24, shade(c, -0.1), line);
    ell(x - r * 0.12, y + r * 0.28, r * 0.04, r * 0.06, '#333');
    ell(x + r * 0.12, y + r * 0.28, r * 0.04, r * 0.06, '#333');
    return;
  }
  if (name === '코알라' || name === '판다' || name === '강아지') {
    ell(x, y + r * 0.05, r * 0.2, r * 0.14, '#222');
  } else if (name === '고양이' || name === '여우') {
    tri([[x - r * 0.08, y + r * 0.02], [x + r * 0.08, y + r * 0.02], [x, y + r * 0.12]], '#ff7aa2');
  } else {
    ell(x, y + r * 0.05, r * 0.08, r * 0.06, '#333');
  }
  ctx.strokeStyle = '#222'; ctx.lineWidth = 2;
  ctx.beginPath(); ctx.arc(x, y + r * 0.2, r * 0.14, 0.15, Math.PI - 0.15); ctx.stroke();
}

// 머리 위 장식 (뿔, 광배, 안테나 등)
function drawTop(name, x, y, r, c, line) {
  if (name === '개구리') {
    [-1, 1].forEach(s => {
      ell(x + s * r * 0.5, y - r * 0.85, r * 0.42, r * 0.42, '#ffffff', line);
      ell(x + s * r * 0.5, y - r * 0.8, r * 0.2, r * 0.2, '#1b1b2f');
    });
  } else if (name === '유니콘') {
    tri([[x - r * 0.14, y - r * 0.85], [x + r * 0.14, y - r * 0.85], [x, y - r * 1.9]], '#fff8c4', line);
    ctx.strokeStyle = '#e0b84d'; ctx.lineWidth = 1.5;
    ctx.beginPath(); ctx.moveTo(x - r * 0.1, y - r * 1.3); ctx.lineTo(x + r * 0.08, y - r * 1.2); ctx.stroke();
    ctx.beginPath(); ctx.moveTo(x - r * 0.08, y - r * 1.55); ctx.lineTo(x + r * 0.06, y - r * 1.45); ctx.stroke();
  } else if (name === '기린') {
    [-1, 1].forEach(s => {
      ell(x + s * r * 0.3, y - r * 1.05, r * 0.07, r * 0.25, '#c9a14a', line);
      ell(x + s * r * 0.3, y - r * 1.3, r * 0.1, r * 0.1, '#c9a14a', line);
    });
    ell(x - r * 0.5, y - r * 0.4, r * 0.12, r * 0.12, shade(c, -0.25));
    ell(x + r * 0.45, y - r * 0.55, r * 0.13, r * 0.13, shade(c, -0.25));
    ell(x + r * 0.1, y - r * 0.7, r * 0.1, r * 0.1, shade(c, -0.25));
  } else if (name === '천사') {
    ctx.strokeStyle = '#ffe066'; ctx.lineWidth = 3;
    ctx.beginPath(); ctx.ellipse(x, y - r * 1.4, r * 0.5, r * 0.15, 0, 0, Math.PI * 2); ctx.stroke();
  } else if (name === '요정') {
    ell(x + r * 0.5, y - r * 0.9, r * 0.18, r * 0.18, '#ff9ad5', line);
    ell(x + r * 0.5, y - r * 0.9, r * 0.07, r * 0.07, '#ffe066');
  } else if (name === '로봇') {
    ctx.strokeStyle = '#9fb4c7'; ctx.lineWidth = 3;
    ctx.beginPath(); ctx.moveTo(x, y - r * 0.9); ctx.lineTo(x, y - r * 1.4); ctx.stroke();
    ell(x, y - r * 1.45, r * 0.1, r * 0.1, '#ff5c5c', line);
  } else if (name === '오리') {
    tri([[x - r * 0.1, y - r * 0.9], [x + r * 0.1, y - r * 0.9], [x + r * 0.35, y - r * 1.2]], c, line);
  }
}

function drawDoll(d) {
  const { x, y, r } = d;
  const name = d.t.name, c = d.t.color, line = shade(c, -0.5);
  ctx.save();
  // 그림자
  ctx.fillStyle = 'rgba(0,0,0,0.25)';
  ctx.beginPath(); ctx.ellipse(x, y + r * 1.85, r * 0.9, r * 0.22, 0, 0, Math.PI * 2); ctx.fill();

  drawBack(name, x, y, r, c, line);
  drawBody(name, x, y, r, c, line);
  drawEars(name, x, y, r, c, line);
  drawHead(name, x, y, r, c, line);
  drawFace(name, x, y, r, c, line);
  drawTop(name, x, y, r, c, line);
  ctx.restore();
}

// ───────── 게임 화면 ─────────

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
