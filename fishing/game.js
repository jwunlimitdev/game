(() => {
  const cv = document.getElementById('c'), g = cv.getContext('2d');
  const $ = id => document.getElementById(id);
  const MAX_LV = 20;
  const MULT = [1, 2, 3.5, 6, 10];
  const TIER = [null, {w:50, v:10, win:700}, {w:28, v:25, win:550}, {w:14, v:60, win:420}, {w:6, v:140, win:300}, {w:2, v:350, win:200}];
  const FISH = ZONES.map((z, zi) => z.fish.split(',').map(s => {
    const [n, e, t] = s.trim().split(':'), T = TIER[+t];
    return {n, e, t: +t, w: T.w, v: Math.round(T.v * MULT[zi]), win: T.win};
  }));
  const ALL = FISH.flat(), TOTAL = ALL.length;
  const STAGES = 20, goal = k => 200 + k * 120, zoneOf = k => Math.floor(k / 4), WATER = 290;
  const stars = Array.from({length: 40}, () => ({x: Math.random() * 360, y: Math.random() * 200, p: Math.random() * 6}));
  let coins = 0, autoLv = 0, rodLv = 0, combo = 0, best = 0;
  let stage = 0, maxStage = 0, prog = Array(STAGES).fill(0), cleared = Array(STAGES).fill(false);
  let st = 'idle', cur = null, timer = null, lastAuto = 0, dex = {}, floats = [], parts = [], react = null, shakeUntil = 0;
  let msg = '찌를 던져 보세요! 스테이지 1부터 시작해요';
  const P = () => ZONES[zoneOf(stage)];
  const autoInterval = () => Math.max(1500, 12000 - autoLv * 550);
  const autoCost = () => 100 * (autoLv + 1) ** 2;
  const rodCost = () => 150 * (rodLv + 1) ** 2;
  const winTime = f => f.win + rodLv * 100;

  function pick() {
    const list = FISH[zoneOf(stage)], tot = list.reduce((s, f) => s + f.w, 0);
    let r = Math.random() * tot;
    for (const f of list) { r -= f.w; if (r < 0) return f; }
    return list[0];
  }

  function cast() {
    st = 'wait'; msg = '찌가 물 위에 떠 있어요...';
    timer = setTimeout(() => {
      cur = {...pick(), gold: Math.random() < 0.04};
      st = 'bite'; msg = '!! 지금 챔질!';
      timer = setTimeout(miss, winTime(cur));
      render();
    }, 1500 + Math.random() * 2500);
    render();
  }

  function miss() {
    st = 'idle'; combo = 0; msg = '놓쳤어요 😢';
    react = {e: '💦', until: performance.now() + 900}; render();
  }

  function hook() {
    clearTimeout(timer);
    if (st === 'wait') {
      st = 'idle'; combo = 0; msg = '너무 일찍 챔질했어요!';
      react = {e: '😅', until: performance.now() + 900}; render();
    } else catchFish(cur, false);
  }

  function catchFish(f, auto) {
    const mult = auto ? 1 : 1 + Math.min(combo, 10) * 0.1;
    const val = Math.round(f.v * (f.gold ? 5 : 1) * mult);
    if (!auto) { combo++; best = Math.max(best, combo); }
    coins += val; prog[stage] += val; dex[f.n] = true; st = 'idle';
    const hot = f.gold || f.t >= 4, color = hot ? '#fde047' : '#bbf7d0', now = performance.now();
    for (let i = 0; i < 14; i++) parts.push({x: 230, y: WATER - 6, vx: (Math.random() - .5) * 4, vy: -Math.random() * 4 - 1, t: now, c: color});
    if (hot) shakeUntil = now + 300;
    floats.push({t: now, text: '+' + val + (f.gold ? ' ✨황금!' : ''), color});
    react = {e: f.gold ? '🤩' : (f.t >= 4 ? '😲' : '😆'), until: now + 1000};
    msg = (auto ? '자동 낚시: ' : '') + f.e + ' ' + f.n + ' 획득! +' + val + (!auto && combo > 1 ? '  ' + combo + '연속!' : '');
    if (!cleared[stage] && stage === maxStage && prog[stage] >= goal(stage)) clearStage();
    render();
  }

  function clearStage() {
    cleared[stage] = true;
    const bonus = Math.floor(goal(stage) * 0.3); coins += bonus;
    msg = '🎉 스테이지 ' + (stage + 1) + ' 클리어! 보너스 +' + bonus;
    if (stage < STAGES - 1) { stage++; maxStage = Math.max(maxStage, stage); msg += ' → 스테이지 ' + (stage + 1) + ' 시작'; }
    else msg += ' 전설의 낚시꼼 달성 🏆';
  }

  function tap() { st === 'idle' ? cast() : hook(); }

  function switchStage(i) {
    if (st !== 'idle' || i > maxStage || i === stage) return;
    stage = i; msg = ZONES[zoneOf(i)].e + ' ' + ZONES[zoneOf(i)].n + '으로 이동! 스테이지 ' + (i + 1); render();
  }

  function upgrade(kind) {
    if (kind === 'auto') {
      if (autoLv >= MAX_LV) msg = '자동 낚시 최대 레벨(' + MAX_LV + ')이에요';
      else if (coins < autoCost()) msg = '코인이 부족해요 (필요: ' + autoCost() + ')';
      else { coins -= autoCost(); autoLv++; msg = '자동 낚시 Lv ' + autoLv + ' 달성!'; }
    } else {
      if (rodLv >= MAX_LV) msg = '낚시대 최대 레벨(' + MAX_LV + ')이에요';
      else if (coins < rodCost()) msg = '코인이 부족해요 (필요: ' + rodCost() + ')';
      else { coins -= rodCost(); rodLv++; msg = '낚시대 Lv ' + rodLv + ' 강화! 챔질 시간 +0.1초'; }
    }
    render();
  }

  function render() {
    $('coins').textContent = coins;
    $('combo').textContent = combo;
    $('best').textContent = best;
    $('msg').textContent = msg;
    $('act').textContent = st === 'idle' ? '던지기' : '챔질!';
    $('up').textContent = autoLv >= MAX_LV ? '자동 최대 Lv' + MAX_LV : '자동 낚시 Lv' + autoLv + ' (' + autoCost() + ')';
    $('rod').textContent = rodLv >= MAX_LV ? '낚시대 최대 Lv' + MAX_LV : '낚시대 Lv' + rodLv + ' (' + rodCost() + ')';
    $('stageInfo').textContent = '스테이지 ' + (stage + 1) + ' / 20 · ' + P().n + ' · ' + prog[stage] + ' / ' + goal(stage);
    $('stageBar').style.width = Math.min(100, prog[stage] / goal(stage) * 100) + '%';
    $('stages').innerHTML = Array.from({length: STAGES}, (_, i) =>
      `<button class='stg${i === stage ? ' on' : ''}${cleared[i] ? ' cl' : ''}' data-i='${i}'${i > maxStage ? ' disabled' : ''}>${i + 1}</button>`).join('');
    const n = Object.keys(dex).length;
    $('dexCount').textContent = n + ' / ' + TOTAL;
    $('dexBar').style.width = (n / TOTAL * 100) + '%';
    $('dexList').innerHTML = ALL.map(f => `<li>${dex[f.n] ? f.e + ' ' + f.n : '???'}</li>`).join('');
  }

  function draw(t) {
    const now = performance.now(), W = cv.width, H = cv.height, z = P();
    g.save();
    if (now < shakeUntil) g.translate((Math.random() - .5) * 6, (Math.random() - .5) * 6);
    const sky = g.createLinearGradient(0, 0, 0, WATER);
    sky.addColorStop(0, z.sky[0]); sky.addColorStop(1, z.sky[1]);
    g.fillStyle = sky; g.fillRect(0, 0, W, WATER);
    if (z.deco === 'stars' || z.deco === 'space') {
      stars.forEach(s => { g.fillStyle = 'rgba(255,255,255,' + (.3 + .3 * Math.sin(t / 500 + s.p)) + ')'; g.fillRect(s.x, s.y, 2, 2); });
    }
    if (z.deco === 'space') {
      g.fillStyle = '#a78bfa'; g.beginPath(); g.arc(60, 70, 20, 0, Math.PI * 2); g.fill();
    } else if (z.deco === 'sun') {
      g.fillStyle = '#ffe08a'; g.beginPath(); g.arc(300, 58, 24, 0, Math.PI * 2); g.fill();
      g.fillStyle = 'rgba(255,255,255,.7)';
      for (let k = 0; k < 3; k++) {
        const x = ((t / 60 + k * 140) % (W + 120)) - 60;
        g.beginPath(); g.arc(x, 110 + k * 22, 16, 0, Math.PI * 2); g.arc(x + 18, 104 + k * 22, 20, 0, Math.PI * 2); g.arc(x + 40, 110 + k * 22, 15, 0, Math.PI * 2); g.fill();
      }
    }
    const wg = g.createLinearGradient(0, WATER, 0, H);
    wg.addColorStop(0, z.water[0]); wg.addColorStop(1, z.water[1]);
    g.fillStyle = wg; g.fillRect(0, WATER, W, H - WATER);
    if (z.deco === 'bubble') {
      g.strokeStyle = 'rgba(255,255,255,.35)'; g.lineWidth = 1.5;
      for (let i = 0; i < 8; i++) { g.beginPath(); g.arc((i * 47) % W, H - ((t / 20 + i * 60) % (H - WATER)), 4 + (i % 3), 0, Math.PI * 2); g.stroke(); }
    }
    g.strokeStyle = 'rgba(255,255,255,.15)'; g.lineWidth = 1.5;
    for (let i = 0; i < 4; i++) {
      g.beginPath();
      for (let x = 0; x <= W; x += 6) g.lineTo(x, WATER + 14 + i * 36 + Math.sin(x / 26 + t / 700 + i) * 4);
      g.stroke();
    }
    if (z.deco === 'stars') {
      for (let i = 0; i < 12; i++) {
        g.fillStyle = 'rgba(103,232,249,' + (.3 + .4 * Math.sin(t / 300 + i)) + ')';
        g.beginPath(); g.arc((i * 67 + t / 40) % W, WATER + 25 + (i * 53) % (H - WATER - 40), 3, 0, Math.PI * 2); g.fill();
      }
    }
    const cy = WATER - 70 + Math.sin(t / 400) * 2;
    g.textAlign = 'center'; g.font = '54px serif'; g.fillText('🧑‍🌾', 60, cy);
    if (react && now < react.until) { g.font = '26px serif'; g.fillText(react.e, 60, cy - 58); }
    const bx = 230, bob = Math.sin(t / 300) * 3;
    const by = st === 'idle' ? WATER - 4 + bob : WATER + 8 + bob + (st === 'bite' ? Math.sin(t / 50) * 6 : 0);
    g.strokeStyle = 'rgba(230,240,255,.7)'; g.lineWidth = 1.2;
    g.beginPath(); g.moveTo(104, cy - 12); g.lineTo(bx, by); g.stroke();
    g.strokeStyle = '#c9a36b'; g.lineWidth = 4;
    g.beginPath(); g.moveTo(84, cy + 6); g.lineTo(104, cy - 12); g.stroke();
    g.fillStyle = '#ef4444'; g.beginPath(); g.arc(bx, by, 7, 0, Math.PI * 2); g.fill();
    g.fillStyle = '#fff'; g.beginPath(); g.arc(bx, by - 6, 4, 0, Math.PI * 2); g.fill();
    if (st === 'bite') { g.fillStyle = '#fbbf24'; g.font = 'bold 40px sans-serif'; g.fillText('!', bx + 14, by - 20); }
    parts = parts.filter(p => now - p.t < 700);
    parts.forEach(p => {
      const age = now - p.t;
      g.globalAlpha = 1 - age / 700; g.fillStyle = p.c;
      g.fillRect(p.x + p.vx * age / 16, p.y + p.vy * age / 16, 4, 4);
    });
    g.globalAlpha = 1;
    floats = floats.filter(f => now - f.t < 1000);
    floats.forEach(f => {
      const age = now - f.t;
      g.globalAlpha = 1 - age / 1000; g.fillStyle = f.color; g.font = 'bold 20px sans-serif';
      g.fillText(f.text, bx, WATER - 30 - age / 25); g.globalAlpha = 1;
    });
    g.textAlign = 'left';
    if (st === 'idle' && autoLv > 0) {
      const left = Math.max(0, autoInterval() - (now - lastAuto));
      g.fillStyle = 'rgba(255,255,255,.75)'; g.font = '12px sans-serif';
      g.fillText('자동 낚시 ' + Math.ceil(left / 1000) + 's', 12, H - 12);
    }
    g.restore();
    requestAnimationFrame(draw);
  }

  cv.addEventListener('click', tap);
  $('act').addEventListener('click', tap);
  $('up').addEventListener('click', () => upgrade('auto'));
  $('rod').addEventListener('click', () => upgrade('rod'));
  $('stages').addEventListener('click', e => {
    const b = e.target.closest('[data-i]');
    if (b) switchStage(+b.dataset.i);
  });
  setInterval(() => {
    const now = performance.now();
    if (autoLv > 0 && st === 'idle' && now - lastAuto >= autoInterval()) {
      lastAuto = now; catchFish({...pick(), gold: Math.random() < 0.04}, true);
    }
  }, 250);

  render();
  requestAnimationFrame(draw);
})();
