/* 쓰론폴 게임 로직 (상태, 낮 행동, 밤 전투, 화면 출력) */
let st;
const $ = id => document.getElementById(id);
const cnt = t => st.grid.filter(x => x === t).length;
const log = t => { $('msg').textContent = t; };

function init(diff) {
  st = {
    day: 1, gold: 80, food: 30, soldiers: 2, wall: 60, maxWall: 60, atk: 2, tech: 0,
    grid: Array(49).fill(null),
    sel: (st && st.sel) || 'farm',
    diff: diff || 'normal',
    over: false
  };
  st.grid[CASTLE] = 'castle';
  log('1일차 낮입니다. 건물을 짓고 병력을 준비하세요.');
  render();
}

function pick(k) { st.sel = k; render(); }

function tileClick(i) {
  if (st.over || i === CASTLE || st.grid[i]) return;
  const b = BLD[st.sel];
  if (st.gold < b.c) { log('골드가 부족합니다.'); return; }
  st.gold -= b.c;
  st.grid[i] = st.sel;
  log(`${b.n}을(를) 건설했습니다.`);
  render();
}

function recruit() {
  if (st.over) return;
  const cap = 3 * cnt('barracks');
  if (cap === 0) { log('병영을 먼저 지으세요.'); return; }
  if (st.soldiers >= cap) { log(`병력 상한(${cap}명)에 도달했습니다.`); return; }
  if (st.gold < 10) { log('골드가 부족합니다 (병사 10G).'); return; }
  st.gold -= 10;
  st.soldiers++;
  log('병사를 모집했습니다.');
  render();
}

function repair() {
  if (st.over) return;
  if (st.wall >= st.maxWall) { log('성벽이 이미 튼튼합니다.'); return; }
  if (st.gold < 30) { log('골드가 부족합니다 (30G).'); return; }
  st.gold -= 30;
  st.wall = Math.min(st.maxWall, st.wall + 20);
  log('성벽을 보수했습니다.');
  render();
}

function research() {
  if (st.over) return;
  if (cnt('lab') === 0) { log('연구소를 먼저 지으세요.'); return; }
  if (st.tech >= TECH.length) { log('모든 기술을 연구했습니다.'); return; }
  const t = TECH[st.tech];
  if (st.gold < t.c) { log(`골드가 부족합니다 (${t.c}G).`); return; }
  st.gold -= t.c;
  st.tech++;
  if (st.tech === 1) st.atk++;
  if (st.tech === 2) { st.maxWall += 30; st.wall += 30; }
  log(`'${t.n}' 연구 완료!`);
  render();
}

function dawn() {
  const bonus = st.tech >= 3 ? 2 : 0;
  st.gold += 5 + cnt('mine') * (4 + bonus);
  st.food += cnt('farm') * 3 - st.soldiers;
  if (st.food < 0) {
    st.soldiers = Math.max(0, st.soldiers + st.food);
    st.food = 0;
  }
}

function night() {
  if (st.over) return;
  const E = Math.round((2 + st.day * 1.5) * DIFF[st.diff].m);
  const power = st.soldiers * st.atk;
  const killed = Math.min(E, Math.floor(power / 3));
  const rem = E - killed;
  st.wall -= rem * 4;
  const lost = rem > 0 ? Math.min(st.soldiers, Math.ceil(rem / 2)) : 0;
  st.soldiers -= lost;
  st.gold += killed * 3;
  const report = `밤 ${st.day}: 적 ${E}명 습격 — ${killed}명 격퇴, ${rem}명이 성벽 공격 (병사 ${lost}명 전사).`;
  if (st.wall <= 0) {
    st.wall = 0;
    st.over = true;
    render();
    log(report + ' 💀 성벽이 무너졌습니다. 왕국 함락!');
    return;
  }
  if (st.day >= WIN) {
    st.over = true;
    render();
    log(report + ' 🏆 10일을 버티고 왕국을 지켜냈습니다!');
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
  st.grid.forEach((t, i) => {
    const d = document.createElement('div');
    d.className = 'cell';
    d.textContent = t === 'castle' ? '🏰' : (t ? BLD[t].i : '');
    d.onclick = () => tileClick(i);
    g.appendChild(d);
  });
  $('status').innerHTML =
    `${st.day}일차 / ${WIN}일 · 골드 ${st.gold} · 식량 ${st.food}<br>` +
    `병사 ${st.soldiers}명 (상한 ${3 * cnt('barracks')}) · 성벽 ${st.wall}/${st.maxWall} · 기술 ${st.tech}/${TECH.length}`;
  document.querySelectorAll('#palette button').forEach(b => b.classList.toggle('on', b.dataset.b === st.sel));
  $('nightBtn').disabled = st.over;
}

init('normal');
