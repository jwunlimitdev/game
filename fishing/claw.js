(() => {
  const cv = document.getElementById('claw'), g = cv.getContext('2d'), W = cv.width, H = cv.height;
  const $ = id => document.getElementById(id);
  const COST = 150, RATE = [0.8, 0.55, 0.35, 0.2], RN = ['', '일반', '레어', '에픽', '전설'];
  const RC = ['#9ca3af', '#60a5fa', '#c084fc', '#fbbf24'];
  const CHUTE = {x: 310, y: 256};
  const GEAR = [
    {type:'rod', n:'목 낚시대', e:'🎣', r:1, b:100}, {type:'rod', n:'강철 낚시대', e:'🎣', r:2, b:200},
    {type:'rod', n:'황금 낚시대', e:'🎣', r:3, b:300}, {type:'rod', n:'용왕 낚시대', e:'🔱', r:4, b:500},
    {type:'bait', n:'지렁이', e:'🪱', r:1, b:1}, {type:'bait', n:'새우 미끼', e:'🦐', r:2, b:2},
    {type:'bait', n:'루어', e:'✨', r:3, b:3}, {type:'bait', n:'전설 미끼', e:'🌟', r:4, b:6},
    {type:'bob', n:'나무 찌', e:'🟠', r:1, b:5}, {type:'bob', n:'야광 찌', e:'🟢', r:2, b:10},
    {type:'bob', n:'수정 찌', e:'🔵', r:3, b:15}, {type:'bob', n:'우주 찌', e:'🟣', r:4, b:25}
  ];
  const pickGear = () => {
    const x = Math.random() * 100;
    const r = x < 50 ? 1 : x < 80 ? 2 : x < 95 ? 3 : 4;
    const list = GEAR.filter(item => item.r === r);
    return list[Math.floor(Math.random() * list.length)];
  };
  const lerp = (a, b, k) => a + (b - a) * k;

  let items = [], cs = {x: 180, y: 40, dir: 1, phase: 'move', target: null, open: 14, shake: 0};
  let playing = false, parts = [], reveal = null;
  let msg = '코인 150으로 한 번 도전해 보세요';

  function burst(x, y, c, n) {
    for (let i = 0; i < n; i++) parts.push({x, y, vx: (Math.random() - .5) * 5, vy: (Math.random() - .5) * 5 - 1.5, life: 1, c});
  }

  function start() {
    if (playing) return;
    if (!window.FG.spend(COST)) { msg = '코인이 부족해요 (필요: ' + COST + ')'; $('gmsg').textContent = msg; return; }
    playing = true; reveal = null;
    items = Array.from({length: 10}, (_, i) => ({x: 30 + i * 31 + (Math.random() * 10 - 5), y: 226 + Math.random() * 14, gear: pickGear()}));
    cs = {x: 180, y: 40, dir: 1, phase: 'move', target: null, open: 14, shake: 0};
    msg = '집게가 오가는 순간 화면을 터치하세요!';
    $('gmsg').textContent = msg; $('gStart').disabled = true;
  }

  function drop() {
    if (playing && cs.phase === 'move') cs.phase = 'down';
  }

  function finish(gear) {
    playing = false; cs.phase = 'move'; cs.target = null;
    if (gear) {
      const eq = window.FG.give(gear);
      reveal = {t: performance.now(), gear, eq};
      msg = gear.e + ' ' + gear.n + ' 획득! (' + RN[gear.r] + ')';
      burst(180, 150, RC[gear.r - 1], 40);
    } else msg = '빈손이에요... 다시 도전!';
    $('gmsg').textContent = msg; $('gStart').disabled = false;
  }

  function update() {
    if (cs.phase === 'move') {
      cs.x += cs.dir * 2.6;
      if (cs.x < 30 || cs.x > 330) cs.dir *= -1;
    } else if (cs.phase === 'down') {
      cs.y += 3.2; cs.open = lerp(cs.open, 22, .15);
      if (cs.y >= 222) {
        cs.y = 222;
        const idx = items.findIndex(it => Math.abs(it.x - cs.x) < 16);
        if (idx >= 0 && Math.random() < RATE[items[idx].gear.r - 1]) {
          cs.target = items.splice(idx, 1)[0];
          burst(cs.x, 222, RC[cs.target.gear.r - 1], 18);
        }
        cs.shake = cs.target ? 3 : 6;
        cs.phase = 'up';
      }
    } else if (cs.phase === 'up') {
      cs.y -= 3.2; cs.open = lerp(cs.open, cs.target ? 8 : 14, .2);
      if (cs.target) { cs.target.x = cs.x; cs.target.y = cs.y + 14; }
      if (cs.y <= 40) { cs.y = 40; cs.phase = cs.target ? 'carry' : 'miss'; }
    } else if (cs.phase === 'carry') {
      const d = CHUTE.x - cs.x;
      cs.x += Math.abs(d) < 4 ? d : Math.sign(d) * 4;
      cs.target.x = cs.x; cs.target.y = cs.y + 14;
      if (cs.x === CHUTE.x) cs.phase = 'release';
    } else if (cs.phase === 'release') {
      cs.open = lerp(cs.open, 24, .25);
      cs.target.y += 7; cs.target.x = lerp(cs.target.x, CHUTE.x, .2);
      if (cs.target.y >= CHUTE.y) { const gear = cs.target.gear; burst(CHUTE.x, CHUTE.y, RC[gear.r - 1], 30); finish(gear); }
    } else if (cs.phase === 'miss') {
      finish(null);
    }
    cs.shake *= .85;
  }

  function lightRay(t) {
    g.save(); g.globalAlpha = .18;
    for (let i = 0; i < 12; i++) {
      const a = t / 900 + i * Math.PI / 6;
      g.fillStyle = RC[reveal.gear.r - 1];
      g.beginPath(); g.moveTo(180, 150); g.lineTo(180 + Math.cos(a) * 400, 150 + Math.sin(a) * 400); g.lineTo(180 + Math.cos(a + .1) * 400, 150 + Math.sin(a + .1) * 400); g.fill();
    }
    g.restore();
  }

  function draw(now) {
    g.save();
    if (cs.shake > .3) g.translate((Math.random() - .5) * cs.shake, (Math.random() - .5) * cs.shake);
    const bg = g.createLinearGradient(0, 0, 0, H);
    bg.addColorStop(0, '#1e1b4b'); bg.addColorStop(1, '#2e1065');
    g.fillStyle = bg; g.fillRect(0, 0, W, H);
    g.fillStyle = 'rgba(255,255,255,.04)';
    for (let i = 0; i < 6; i++) { g.beginPath(); g.moveTo(40 + i * 60, 14); g.lineTo(90 + i * 60, 14); g.lineTo(40 + i * 60, H); g.lineTo(-10 + i * 60, H); g.fill(); }
    g.fillStyle = '#0f0a2a'; g.fillRect(0, 0, W, 16);
    for (let i = 0; i < 14; i++) {
      const on = Math.sin(now / 180 + i) > 0;
      g.fillStyle = on ? (i % 2 ? '#fbbf24' : '#f472b6') : '#3f2a6b';
      g.beginPath(); g.arc(12 + i * 25.5, 8, 3.5, 0, Math.PI * 2); g.fill();
    }
    g.fillStyle = '#1f1147'; g.fillRect(270, 240, 80, 60);
    g.fillStyle = '#000'; g.beginPath(); g.ellipse(CHUTE.x, CHUTE.y - 6, 26, 8, 0, 0, Math.PI * 2); g.fill();
    g.fillStyle = '#fbbf24'; g.font = 'bold 11px sans-serif'; g.textAlign = 'center'; g.fillText('배출구', CHUTE.x, 232);
    g.textBaseline = 'middle'; g.font = '18px serif';
    items.forEach((it, i) => {
      const by = it.y + Math.sin(now / 400 + i) * 1.5;
      if (it.gear.r >= 3) {
        const hal = g.createRadialGradient(it.x, by, 6, it.x, by, 22);
        hal.addColorStop(0, RC[it.gear.r - 1]); hal.addColorStop(1, 'rgba(0,0,0,0)');
        g.globalAlpha = .45 + .25 * Math.sin(now / 200 + i); g.fillStyle = hal; g.beginPath(); g.arc(it.x, by, 22, 0, Math.PI * 2); g.fill(); g.globalAlpha = 1;
      }
      g.fillStyle = RC[it.gear.r - 1]; g.beginPath(); g.arc(it.x, by, 14, 0, Math.PI * 2); g.fill();
      g.fillText(it.gear.e, it.x, by + 1);
    });
    g.strokeStyle = '#e5e7eb'; g.lineWidth = 2;
    g.beginPath(); g.moveTo(cs.x, 16); g.lineTo(cs.x, cs.y); g.stroke();
    const o = cs.open;
    g.lineWidth = 3; g.strokeStyle = '#d1d5db';
    g.beginPath();
    g.moveTo(cs.x, cs.y + 6); g.quadraticCurveTo(cs.x - o * .6, cs.y + 10, cs.x - o, cs.y + 22);
    g.moveTo(cs.x, cs.y + 6); g.quadraticCurveTo(cs.x + o * .6, cs.y + 10, cs.x + o, cs.y + 22);
    g.moveTo(cs.x, cs.y + 6); g.lineTo(cs.x, cs.y + 24);
    g.stroke();
    g.fillStyle = '#9ca3af'; g.beginPath(); g.arc(cs.x, cs.y + 4, 6, 0, Math.PI * 2); g.fill();
    if (cs.target) {
      const c = RC[cs.target.gear.r - 1];
      g.shadowColor = c; g.shadowBlur = 16;
      g.fillStyle = c; g.beginPath(); g.arc(cs.target.x, cs.target.y, 14, 0, Math.PI * 2); g.fill();
      g.shadowBlur = 0; g.fillText(cs.target.gear.e, cs.target.x, cs.target.y + 1);
    }
    parts = parts.filter(p => p.life > 0);
    parts.forEach(p => {
      p.x += p.vx; p.y += p.vy; p.vy += .12; p.life -= .03;
      g.globalAlpha = Math.max(0, p.life); g.fillStyle = p.c; g.beginPath(); g.arc(p.x, p.y, 2.5, 0, Math.PI * 2); g.fill();
    });
    g.globalAlpha = 1; g.textBaseline = 'alphabetic'; g.textAlign = 'left';
    if (playing && cs.phase === 'move') { g.fillStyle = 'rgba(255,255,255,.8)'; g.font = 'bold 12px sans-serif'; g.fillText('화면을 탭하세요 ↓', 10, H - 10); }
    if (reveal) {
      const age = now - reveal.t, life = 2600;
      if (age < life) {
        const k = Math.min(1, age / 250), e = 1 - Math.pow(1 - k, 3);
        g.fillStyle = 'rgba(0,0,0,.5)'; g.fillRect(0, 0, W, H);
        lightRay(now);
        g.save(); g.translate(180, 150); g.scale(.4 + .6 * e, .4 + .6 * e); g.globalAlpha = e;
        const c = RC[reveal.gear.r - 1];
        g.shadowColor = c; g.shadowBlur = 30; g.fillStyle = '#111827';
        g.beginPath(); g.roundRect(-110, -80, 220, 160, 16); g.fill();
        g.shadowBlur = 0; g.strokeStyle = c; g.lineWidth = 3; g.stroke();
        g.textAlign = 'center'; g.fillStyle = c; g.font = 'bold 13px sans-serif'; g.fillText(RN[reveal.gear.r].toUpperCase() + ' · ' + reveal.gear.type.toUpperCase(), 0, -56);
        g.font = '52px serif'; g.textBaseline = 'middle'; g.fillText(reveal.gear.e, 0, -8);
        g.fillStyle = '#f9fafb'; g.font = 'bold 16px sans-serif'; g.fillText(reveal.gear.n, 0, 40);
        g.fillStyle = reveal.eq ? '#86efac' : '#9ca3af'; g.font = '12px sans-serif'; g.fillText(reveal.eq ? '장착 완료!' : '보관했어요', 0, 62);
        g.restore();
        g.globalAlpha = 1; g.textAlign = 'left'; g.textBaseline = 'alphabetic';
      }
    }
    g.restore();
  }

  function loop(now) {
    update(); draw(now);
    requestAnimationFrame(loop);
  }

  cv.addEventListener('click', drop);
  $('gStart').addEventListener('click', start);
  $('gacha').addEventListener('click', e => { if (e.target.id === 'gacha') $('gacha').hidden = true; });
  $('gachaBtn').addEventListener('click', () => { $('gacha').hidden = false; $('gmsg').textContent = msg; });
  $('gClose').addEventListener('click', () => { $('gacha').hidden = true; });
  requestAnimationFrame(loop);
})();
