(() => {
  const cv = document.getElementById('c'), g = cv.getContext('2d');
  const $ = id => document.getElementById(id);
  const TOTAL = PLACES.reduce((s, p) => s + p.fish.length, 0);
  const stars = Array.from({length: 40}, () => ({x: Math.random() * 360, y: Math.random() * 200, p: Math.random() * 6}));
  let coins = 0, autoLv = 0, pi = 0, unlocked = [true, false, false];
  let st = 'idle', cur = null, timer = null, lastAuto = 0, dex = {}, floats = [], react = null;
  let msg = '찌를 던져 보세요';
  const P = () => PLACES[pi];
  const autoInterval = () => Math.max(3000, 12000 - autoLv * 2000);
  const upCost = () => 100 * (autoLv + 1) * (autoLv + 1);

  function pick() {
    const f = P().fish, tot = f.reduce((s, x) => s + x.w, 0);
    let r = Math.random() * tot;
    for (const x of f) { r -= x.w; if (r < 0) return x; }
    return f[0];
  }

  function cast() {
    st = 'wait'; msg = '찌가 물 위에 떠 있어요...';
    timer = setTimeout(() => {
      cur = pick(); st = 'bite'; msg = '!! 지금 챔질!';
      timer = setTimeout(() => {
        st = 'idle'; msg = '놓쳤어요 😢';
        react = {e: '💦', until: performance.now() + 900}; render();
      }, cur.win);
      render();
    }, 1500 + Math.random() * 2500);
    render();
  }

  function hook() {
    if (st === 'wait') {
      clearTimeout(timer); st = 'idle'; msg = '너무 일찍 챔질했어요!';
      react = {e: '😅', until: performance.now() + 900};
    } else if (st === 'bite') {
      clearTimeout(timer); catchFish(cur, true);
    }
    render();
  }

  function catchFish(f, manual) {
    st = 'idle'; coins += f.v; dex[f.n] = (dex[f.n] || 0) + 1;
    msg = (manual ? '' : '자동 낚시: ') + f.e + ' ' + f.n + ' 획득! +' + f.v;
    floats.push({t: performance.now(), text: '+' + f.v, color: f.v >= 200 ? '#fde047' : '#bbf7d0'});
    react = {e: f.v >= 200 ? '🤩' : '😆', until: performance.now() + 1000};
    render();
  }

  function tap() { st === 'idle' ? cast() : hook(); }

  function switchPlace(i) {
    if (st !== 'idle' || i === pi) return;
    if (!unlocked[i]) {
      if (coins < PLACES[i].cost) { msg = '코인이 부족해요 (필요: ' + PLACES[i].cost + ')'; return render(); }
      coins -= PLACES[i].cost; unlocked[i] = true;
    }
    pi = i; msg = PLACES[i].e + ' ' + PLACES[i].n + '에 도착했어요!';
    render();
  }

  function upgrade() {
    if (autoLv >= 5) { msg = '자동 낚시가 최대 레벨이에요'; return render(); }
    if (coins < upCost()) { msg = '코인이 부족해요 (필요: ' + upCost() + ')'; return render(); }
    coins -= upCost(); autoLv++; msg = '자동 낚시 Lv ' + autoLv + ' 달성!'; render();
  }

  function render() {
    $('coins').textContent = coins;
    $('lv').textContent = autoLv;
    $('msg').textContent = msg;
    $('act').textContent = st === 'idle' ? '던지기' : '챔질!';
    $('up').textContent = autoLv >= 5 ? '최대 레벨' : '자동 낚시 업그레이드 (' + upCost() + ')';
    $('places').innerHTML = PLACES.map((p, i) =>
      `<button class='pl${i === pi ? ' on' : ''}' data-i='${i}'>${unlocked[i] ? p.e + ' ' + p.n : '🔒 ' + p.n + ' · ' + p.cost}</button>`).join('');
    const n = Object.keys(dex).length;
    $('dexCount').textContent = n + ' / ' + TOTAL;
    $('dexBar').style.width = (n / TOTAL * 100) + '%';
    $('dexList').innerHTML = PLACES.flatMap(p => p.fish).map(f =>
      `<li>${dex[f.n] ? f.e + ' ' + f.n + ' x' + dex[f.n] : '???'}</li>`).join('');
  }

  function draw(t) {
    const now = performance.now(), W = cv.width, H = cv.height, WATER = 290, p = P();
    const sky = g.createLinearGradient(0, 0, 0, WATER);
    sky.addColorStop(0, p.sky[0]); sky.addColorStop(1, p.sky[1]);
    g.fillStyle = sky; g.fillRect(0, 0, W, WATER);
    if (pi === 2) {
      stars.forEach(s => { g.fillStyle = 'rgba(255,255,255,' + (.3 + .3 * Math.sin(t / 500 + s.p)) + ')'; g.fillRect(s.x, s.y, 2, 2); });
    } else {
      g.fillStyle = pi === 0 ? '#ffe08a' : '#fff3b0';
      g.beginPath(); g.arc(300, 58, 24, 0, Math.PI * 2); g.fill();
      g.fillStyle = 'rgba(255,255,255,.7)';
      for (let k = 0; k < 3; k++) {
        const x = ((t / 60 + k * 140) % (W + 120)) - 60;
        g.beginPath(); g.arc(x, 110 + k * 22, 16, 0, Math.PI * 2); g.arc(x + 18, 104 + k * 22, 20, 0, Math.PI * 2); g.arc(x + 40, 110 + k * 22, 15, 0, Math.PI * 2); g.fill();
      }
    }
    const wg = g.createLinearGradient(0, WATER, 0, H);
    wg.addColorStop(0, p.water[0]); wg.addColorStop(1, p.water[1]);
    g.fillStyle = wg; g.fillRect(0, WATER, W, H - WATER);
    g.strokeStyle = 'rgba(255,255,255,.15)'; g.lineWidth = 1.5;
    for (let i = 0; i < 4; i++) {
      g.beginPath();
      for (let x = 0; x <= W; x += 6) g.lineTo(x, WATER + 14 + i * 36 + Math.sin(x / 26 + t / 700 + i) * 4);
      g.stroke();
    }
    if (pi === 2) {
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
    requestAnimationFrame(draw);
  }

  cv.addEventListener('click', tap);
  $('act').addEventListener('click', tap);
  $('up').addEventListener('click', upgrade);
  $('places').addEventListener('click', e => {
    const b = e.target.closest('[data-i]');
    if (b) switchPlace(+b.dataset.i);
  });
  setInterval(() => {
    const now = performance.now();
    if (autoLv > 0 && st === 'idle' && now - lastAuto >= autoInterval()) {
      lastAuto = now; catchFish(pick(), false);
    }
  }, 250);

  render();
  requestAnimationFrame(draw);
})();
