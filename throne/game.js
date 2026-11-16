/* 쓰론폴 게임 로직
 * 낮: 건설, 업그레이드, 병사 모집 / 밤: 적 침입 처리 / 아침: 수입 정산
 * 밸런스 값은 data.js의 [임시] 항목을 따른다.
 */
let st;
const $ = id => document.getElementById(id);
const log = t => { $('msg').textContent = t; };
const col = i => i % GRID;

function capacity() {
  return st.grid.reduce((s, b) => (b && b.type === 'barracks') ? s + BLD.barracks.lv[b.lv].cap : s, 0);
}
function towerDmg() {
  return st.grid.reduce((s, b) => (b && b.type === 'tower') ? s + BLD.tower.lv[b.lv].dmg : s, 0);
}
// 적이 가장 먼저 부딪히는 건물: 동쪽(열 번호가 큰 쪽)에서 가장 가까운 건물
function frontTarget() {
  let best = -1;
  st.grid.forEach((b, i) => {
    if (!b) return;
    if (best < 0 || col(i) > col(best)) best = i;
  });
  return best;
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
  if (st.over || i === CASTLE) return;
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
  if (st.over) return;
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

function night() {
  if (st.over) return;
  const E = 2 + st.day; // [임시] 밤별 적 수
  // [임시] 방어탑 피해 + 병사 1명당 1명 격퇴
  const kills = Math.min(E, towerDmg() + st.soldiers);
  const rem = E - kills;
  // [임시] 침입자 3명당 병사 1명 전사
  const lost = rem > 0 ? Math.min(st.soldiers, Math.ceil(rem / 3)) : 0;
  st.soldiers -= lost;

  let destroyed = 0;
  for (let k = 0; k < rem && st.castleHp > 0; k++) {
    const t = frontTarget();
    if (t < 0) {
      st.castleHp -= ENEMY_DMG;
    } else {
      const b = st.grid[t];
      b.hp -= ENEMY_DMG;
      if (b.hp <= 0) { st.grid[t] = null; destroyed++; }
    }
  }

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

function render() {
  const g = $('grid');
  g.innerHTML = '';
  st.grid.forEach((b, i) => {
    const d = document.createElement('div');
    d.className = 'cell';
    if (i === CASTLE) {
      d.innerHTML = `🏰<span class="hp">${st.castleHp}</span>`;
    } else if (b) {
      d.innerHTML = `${BLD[b.type].i}<span class="hp">${b.hp}</span>`;
    }
    d.onclick = () => tileClick(i);
    g.appendChild(d);
  });
  $('status').innerHTML =
    `${st.day}일차 / ${WIN_DAY}일 · 골드 ${st.gold} · 왕성 ${st.castleHp}<br>` +
    `병사 ${st.soldiers}명 (상한 ${capacity()}) · 다음 밤 적 ${2 + st.day}명 [임시]`;
  document.querySelectorAll('#palette button').forEach(b => b.classList.toggle('on', b.dataset.b === st.sel));
  $('nightBtn').disabled = st.over;
}

init();
