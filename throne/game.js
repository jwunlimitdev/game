/* 쓰론폴 게임 로직
 * 낮: 건설, 업그레이드, 병사 모집 / 밤: 적 침입을 실시간으로 보여줌 / 아침: 수입 정산
 * 화면: 등각(아이소메트릭) 캔버스 렌더링
 * 밸런스 값은 data.js의 [임시]·[미확인] 항목을 따른다.
 */
let st;
let anim = null;            // 밤 애니메이션 상태 (진행 중이 아니면 null)
const SPEED = 2.2;          // 적 이동 속도 (타일/초) [임시]
const $ = id => document.getElementById(id);
const log = t => { $('msg').textContent = t; };
const col = i => i % GRID;

// ---- 등각 좌표 ----
const TW = 56, TH = 28;   // 타일 가로·세로 크기
const OX = 210, OY = 70;  // 맵 원점 (캔버스 좌표)
const canvas = $('board');
const ctx = canvas.getContext('2d');

// r, c는 소수도 가능 (적의 위치 표시용)
function tileXY(r, c) {
  return { x: OX + (c - r) * TW / 2, y: OY + (c + r) * TH / 2 };
}

// 클릭 좌표 → 격자 인덱스 (범위 밖이면 -1)
function pickTile(e) {
  const rect = canvas.getBoundingClientRect();
  const px = (e.clientX - rect.left) * canvas.width / rect.width;
  const py = (e.clientY - rect.top) * canvas.height / rect.height;
  const a = (px - OX) / (TW / 2);
  const b = (py - OY) / (TH / 2);
  const c = Math.round((a + b) / 2);
  const r = Math.round((b - a) / 2);
  if (r < 0 || r >= GRID || c < 0 || c >= GRID) return -1;
  return r * GRID + c;
}

// ---- 게임 로직 ----
function capacity() {
  return st.grid.reduce((s, b) => (b && b.type === 'barracks') ? s + BLD.barracks.lv[b.lv].cap : s, 0);
}
function towerDmg() {
  return st.grid.reduce((s, b) => (b && b.type === 'tower') ? s + BLD.tower.lv[b.lv].dmg : s, 0);
}
// 적이 가장 먼저 부딪히는 건물: 동쪽(열 번호가 큰 쪽)에서 가장 가까운 건물, 없으면 -1
function frontTarget() {
  let best = -1;
  st.grid.forEach((b, i) => {
    if (!b) return;
    if (best < 0 || col(i) > col(best)) best = i;
  });
  return best;
}
// 적이 향할 현재 목표 지점 (건물이 없으면 왕성)
function frontPoint() {
  const t = frontTarget();
  if (t < 0) return { r: Math.floor(CASTLE / GRID), c: col(CASTLE) };
  return { r: Math.floor(t / GRID), c: col(t) };
}

function init() {
  st = {
    day: 1, gold: START_GOLD, soldiers: 0, castleHp: CASTLE_HP,
    grid: Array(GRID * GRID).fill(null), sel: 'house', over: false
  };
  log('1일차 낮입니다. 빈 칸을 누르면 건설하고, 건물을 누르면 업그레이드합니다.');
  render();
}

function pick(k) { st.sel = k; render(); }

function tileClick(i) {
  if (st.over || anim || i < 0 || i === CASTLE) return;
  const b = st.grid[i];
  if (b) { upgrade(b); return; }
  const def = BLD[st.sel];
  if (st.gold < def.build) { log(`골드가 부족합니다 (${def.n} ${def.build}G).`); return; }
  st.gold -= def.build;
  st.grid[i] = { type: st.sel, lv: 0, hp: def.lv[0].hp, nights: 0 };
  log(`${def.n}을(를) 건설했습니다.`);
  render();
}

function upgrade(b) {
  const def = BLD[b.type];
  const next = def.lv[b.lv + 1];
  if (!next) { log(`${def.n}은(는) 더 업그레이드할 수 없습니다.`); return; }
  if (st.gold < next.up) { log(`업그레이드 골드 부족 (${next.up}G).`); return; }
  st.gold -= next.up;
  b.lv++;
  b.hp = next.hp;
  log(`${def.n}을(를) 레벨 ${b.lv + 1}로 업그레이드했습니다.`);
  render();
}

function recruit() {
  if (st.over || anim) return;
  const cap = capacity();
  if (cap === 0) { log('병영을 먼저 지으세요.'); return; }
  if (st.soldiers >= cap) { log(`병력 상한(${cap}명)에 도달했습니다.`); return; }
  if (st.gold < SOLDIER_COST) { log(`골드가 부족합니다 (병사 ${SOLDIER_COST}G).`); return; }
  st.gold -= SOLDIER_COST;
  st.soldiers++;
  log('병사를 모집했습니다.');
  render();
}

// 아침 정산: 주택·제분소는 수입, 금광은 최초 6골드에서 밤마다 1씩 감소
function dawn() {
  for (const b of st.grid) {
    if (!b) continue;
    if (b.type === 'mine') {
      st.gold += Math.max(0, MINE_BASE - b.nights);
      b.nights++;
    } else if (BLD[b.type].lv[b.lv].inc) {
      st.gold += BLD[b.type].lv[b.lv].inc;
    }
  }
}

// ---- 밤 애니메이션 ----
function night() {
  if (st.over || anim) return;
  const E = 2 + st.day;                                   // [임시] 밤별 적 수
  const kills = Math.min(E, towerDmg() + st.soldiers);    // [임시] 방어탑 피해 + 병사 1명당 1명 격퇴
  const rem = E - kills;                                  // 침입자 수
  const lost = rem > 0 ? Math.min(st.soldiers, Math.ceil(rem / 3)) : 0; // [임시] 침입자 3명당 병사 1명 전사
  st.soldiers -= lost;

  // 방어탑·병영이 격퇴 중일 때 쏘는 건물 (선만 그리기용)
  const shooters = [];
  st.grid.forEach((b, i) => { if (b && (b.type === 'tower' || b.type === 'barracks')) shooters.push(i); });

  const enemies = [];
  for (let k = 0; k < E; k++) {
    enemies.push({
      x: GRID + 0.5,                               // 동쪽 바깥에서 등장
      y: Math.random() * GRID,
      delay: k * 0.35,                             // 시차를 두고 등장
      killer: k < kills,                           // 격퇴될 적
      shot: shooters.length ? shooters[k % shooters.length] : null,
      state: 'walk', fadeT: 0, fx: null, done: false
    });
  }

  anim = {
    t: 0, last: performance.now(), E, kills, rem, lost,
    enemies, destroyed: 0, flashes: []
  };
  log(`밤 ${st.day}: 적 ${E}명이 동쪽에서 몰려옵니다!`);
  render();
  requestAnimationFrame(nightFrame);
}

// 침입자가 목표에 도착: 현재 가장 앞의 건물(또는 왕성)에 피해
function hitFront(e) {
  const t = frontTarget();
  if (t < 0) {
    st.castleHp = Math.max(0, st.castleHp - ENEMY_DMG);
    anim.flashes.push({ i: CASTLE, t: 0.3 });
    e.fx = '💢';
    return;
  }
  const b = st.grid[t];
  b.hp -= ENEMY_DMG;
  anim.flashes.push({ i: t, t: 0.3 });
  e.fx = '💢';
  if (b.hp <= 0) {
    st.grid[t] = null;
    anim.destroyed++;
    e.fx = '💥';
  }
}

function nightFrame(ts) {
  if (!anim) return;
  const dt = Math.min(0.05, (ts - anim.last) / 1000);
  anim.last = ts;
  anim.t += dt;

  let alive = false;
  for (const e of anim.enemies) {
    if (e.done) continue;
    alive = true;
    if (anim.t < e.delay) continue;

    if (e.state === 'walk') {
      // 격퇴 적은 중간 지점(열 4)에서 처치, 침입자는 현재 가장 앞의 목표로 이동
      let tr, tc;
      if (e.killer) { tr = e.y; tc = 4; }
      else { const p = frontPoint(); tr = p.r; tc = p.c; }
      const dx = tc - e.x, dy = tr - e.y;
      const d = Math.hypot(dx, dy);
      const step = SPEED * dt;
      if (d <= Math.max(0.3, step)) {
        e.x = tc; e.y = tr;
        e.state = 'fade';
        e.fadeT = 0.45;
        if (e.killer) e.fx = '💥';
        else hitFront(e);
      } else {
        e.x += dx / d * step;
        e.y += dy / d * step;
      }
    } else if (e.state === 'fade') {
      e.fadeT -= dt;
      if (e.fadeT <= 0) e.done = true;
    }
  }

  anim.flashes.forEach(f => f.t -= dt);
  anim.flashes = anim.flashes.filter(f => f.t > 0);

  render();

  if (st.castleHp <= 0 || !alive) {
    finishNight();
    return;
  }
  requestAnimationFrame(nightFrame);
}

function finishNight() {
  const { E, kills, rem, lost, destroyed } = anim;
  anim = null;
  const report = `밤 ${st.day}: 적 ${E}명 — ${kills}명 격퇴, ${rem}명 침입 (건물 ${destroyed}곳 파괴, 병사 ${lost}명 전사).`;
  if (st.castleHp <= 0) {
    st.castleHp = 0; st.over = true; render();
    log(report + ' 💀 왕성이 함락되었습니다.');
    return;
  }
  if (st.day >= WIN_DAY) {
    st.over = true; render();
    log(report + ` 🏆 ${WIN_DAY}일을 버텨 왕국을 지켰습니다!`);
    return;
  }
  st.day++;
  dawn();
  render();
  log(report + ` → ${st.day}일차 낮이 밝았습니다.`);
}

// ---- 화면 그리기 ----
function drawTile(r, c, fill) {
  const { x, y } = tileXY(r, c);
  ctx.beginPath();
  ctx.moveTo(x, y - TH / 2);
  ctx.lineTo(x + TW / 2, y);
  ctx.lineTo(x, y + TH / 2);
  ctx.lineTo(x - TW / 2, y);
  ctx.closePath();
  ctx.fillStyle = fill;
  ctx.fill();
  ctx.strokeStyle = '#2a1f10';
  ctx.lineWidth = 1;
  ctx.stroke();
}

function render() {
  ctx.clearRect(0, 0, canvas.width, canvas.height);
  ctx.globalAlpha = 1;

  const flashing = new Set(anim ? anim.flashes.map(f => f.i) : []);

  // 뒤쪽 타일부터 그려서 앞쪽 건물이 가려지지 않게 함
  const order = [];
  for (let r = 0; r < GRID; r++) for (let c = 0; c < GRID; c++) order.push([r, c]);
  order.sort((a, b) => (a[0] + a[1]) - (b[0] + b[1]));

  for (const [r, c] of order) {
    const i = r * GRID + c;
    const { x, y } = tileXY(r, c);
    drawTile(r, c, i === CASTLE ? '#7a6a4a' : ((r + c) % 2 ? '#5b7a3c' : '#587536'));
    if (flashing.has(i)) drawTile(r, c, 'rgba(255,60,60,0.5)');

    let emoji = null, hp = 0, max = 1;
    if (i === CASTLE) {
      emoji = '🏰'; hp = st.castleHp; max = CASTLE_HP;
    } else if (st.grid[i]) {
      const b = st.grid[i];
      emoji = BLD[b.type].i; hp = b.hp; max = BLD[b.type].lv[b.lv].hp;
    }
    if (emoji) {
      ctx.font = '22px sans-serif';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'bottom';
      ctx.fillText(emoji, x, y + 4);
      const w = 28;
      ctx.fillStyle = '#000';
      ctx.fillRect(x - w / 2, y + 3, w, 4);
      ctx.fillStyle = '#6f6';
      ctx.fillRect(x - w / 2, y + 3, w * Math.max(0, hp) / max, 4);
    }
  }

  // 밤: 적, 처치 효과, 공격 선
  if (anim) {
    for (const e of anim.enemies) {
      if (e.done || anim.t < e.delay) continue;
      const { x, y } = tileXY(e.y, e.x);
      if (e.state === 'fade') {
        if (e.killer && e.shot !== null && e.fadeT > 0.2) {
          const s = tileXY(Math.floor(e.shot / GRID), col(e.shot));
          ctx.beginPath();
          ctx.moveTo(s.x, s.y - 10);
          ctx.lineTo(x, y - 8);
          ctx.strokeStyle = '#ffe066';
          ctx.lineWidth = 2;
          ctx.stroke();
        }
        ctx.globalAlpha = Math.max(0, e.fadeT / 0.45);
        ctx.font = '18px sans-serif';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText(e.fx ? (e.killer ? '👹' : '👹') : '👹', x, y - 8);
        if (e.fx) ctx.fillText(e.fx, x + 14, y - 22);
        ctx.globalAlpha = 1;
      } else {
        ctx.font = '18px sans-serif';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText('👹', x, y - 8);
      }
    }
  }

  // 침입 방향 표시 (동쪽 = 맵 오른쪽)
  const edge = tileXY(3, 6);
  ctx.font = '12px sans-serif';
  ctx.textAlign = 'left';
  ctx.textBaseline = 'middle';
  ctx.fillStyle = '#ffe9a8';
  ctx.fillText('동쪽 침입 ▶', edge.x + 26, edge.y);

  $('status').innerHTML =
    `${st.day}일차 / ${WIN_DAY}일 · 골드 ${st.gold} · 왕성 ${st.castleHp}<br>` +
    `병사 ${st.soldiers}명 (상한 ${capacity()}) · 다음 밤 적 ${2 + st.day}명 [임시]`;
  document.querySelectorAll('#palette button, #palette2 button').forEach(b => b.classList.toggle('on', b.dataset.b === st.sel));
  $('nightBtn').disabled = st.over || !!anim;
}

canvas.addEventListener('click', e => tileClick(pickTile(e)));

init();
