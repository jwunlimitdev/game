(() => {
  const cv = document.getElementById('claw'), g = cv.getContext('2d');
  const $ = id => document.getElementById(id);
  const COST = 150, RATE = [0.8, 0.55, 0.35, 0.2], RN = ['', '일반', '레어', '에픽', '전설'];
  const RC = ['#9ca3af', '#60a5fa', '#c084fc', '#fbbf24'];
  const GEAR = [
    {type:'rod', n:'목 낚싯대', e:'🎣', r:1, b:100}, {type:'rod', n:'강철 낚싯대', e:'🎣', r:2, b:200},
    {type:'rod', n:'황금 낚싯대', e:'🎣', r:3, b:300}, {type:'rod', n:'용왕 낚싯대', e:'🔱', r:4, b:500},
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
  let items = [], cs = {x: 180, y: 40, dir: 1, phase: 'move', target: null}, playing = false;
  let msg = '코인 150으로 한 번 도전해 보세요';

  function start() {
    if (playing) return;
    if (!window.FG.spend(COST)) { msg = '코인이 부족해요 (필요: ' + COST + ')'; $('gmsg').textContent = msg; return; }
    playing = true;
    items = Array.from({length: 10}, (_, i) => ({x: 30 + i * 31 + (Math.random() * 10 - 5), y: 226 + Math.random() * 14, gear: pickGear()}));
    cs = {x: 180, y: 40, dir: 1, phase: 'move', target: null};
    msg = '집게가 오가는 타이밍에 화면을 터치하세요!';
    $('gmsg').textContent = msg; $('gStart').disabled = true;
  }

  function drop() {
    if (!playing || cs.phase !== 'move') return;
    cs.phase = 'down';
  }

  function finish() {
    playing = false; cs.phase = 'move';
    if (cs.target) {
      const gear = cs.target.gear, eq = window.FG.give(gear);
      msg = gear.e + ' ' + gear.n + ' 획득! (' + RN[gear.r] + ')' + (eq ? ' · 장착!' : ' · 보관 (기존 장비가 더 좋아요)');
    } else msg = '빈손이에요... 다시 도전!';
    cs.target = null; $('gmsg').textContent = msg; $('gStart').disabled = false;
  }

  function update() {
    if (cs.phase === 'move') {
      cs.x += cs.dir * 2.4;
      if (cs.x < 30 || cs.x > 330) cs.dir *= -1;
    } else if (cs.phase === 'down') {
      cs.y += 3;
      if (cs.y >= 222) {
        cs.y = 222;
        const idx = items.findIndex(it => Math.abs(it.x - cs.x) < 16);
        if (idx >= 0 && Math.random() < RATE[items[idx].gear.r - 1]) cs.target = items.splice(idx, 1)[0];
        cs.phase = 'up';
      }
    } else if (cs.phase === 'up') {
      cs.y -= 3;
      if (cs.target) { cs.target.x = cs.x; cs.target.y = cs.y + 12; }
      if (cs.y <= 40) { cs.y = 40; finish(); }
    }
  }

  function draw() {
    const W = cv.width, H = cv.height;
    const bg = g.createLinearGradient(0, 0, 0, H);
    bg.addColorStop(0, '#1e1b4b'); bg.addColorStop(1, '#312e81');
    g.fillStyle = bg; g.fillRect(0, 0, W, H);
    g.fillStyle = '#0f0a2a'; g.fillRect(0, 0, W, 14);
    g.strokeStyle = '#e5e7eb'; g.lineWidth = 2;
    g.beginPath(); g.moveTo(cs.x, 14); g.lineTo(cs.x, cs.y); g.stroke();
    const open = cs.phase === 'up' && cs.target ? 5 : 14;
    g.lineWidth = 3;
    g.beginPath();
    g.moveTo(cs.x, cs.y + 2); g.lineTo(cs.x - open, cs.y + 16);
    g.moveTo(cs.x, cs.y + 2); g.lineTo(cs.x + open, cs.y + 16);
    g.moveTo(cs.x, cs.y + 2); g.lineTo(cs.x, cs.y + 18);
    g.stroke();
    g.font = '18px serif'; g.textAlign = 'center'; g.textBaseline = 'middle';
    items.forEach(it => {
      g.fillStyle = RC[it.gear.r - 1]; g.beginPath(); g.arc(it.x, it.y, 14, 0, Math.PI * 2); g.fill();
      g.fillText(it.gear.e, it.x, it.y + 1);
    });
    if (cs.target) {
      g.fillStyle = RC[cs.target.gear.r - 1]; g.beginPath(); g.arc(cs.target.x, cs.target.y, 14, 0, Math.PI * 2); g.fill();
      g.fillText(cs.target.gear.e, cs.target.x, cs.target.y + 1);
    }
    g.fillStyle = '#374151'; g.fillRect(270, 258, 80, 34);
    g.fillStyle = '#fbbf24'; g.font = 'bold 11px sans-serif'; g.fillText('배출구', 310, 275);
    g.textAlign = 'left'; g.textBaseline = 'alphabetic';
  }

  function loop() {
    update(); draw();
    requestAnimationFrame(loop);
  }

  cv.addEventListener('click', drop);
  $('gStart').addEventListener('click', start);
  $('gacha').addEventListener('click', e => { if (e.target.id === 'gacha') $('gacha').hidden = true; });
  $('gachaBtn').addEventListener('click', () => { $('gacha').hidden = false; $('gmsg').textContent = msg; });
  $('gClose').addEventListener('click', () => { $('gacha').hidden = true; });
  requestAnimationFrame(loop);
})();
