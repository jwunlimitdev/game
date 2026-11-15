/* ---------- 재미 기능: 오늘의 미션, 주가 예측, 효과음, 보너스 별도 집계 ----------
   game.js 뒤에 로드되며, game.js의 전역 변수와 함수를 그대로 사용합니다. */
(() => {
 const KEY="rewung-fun-v1";
 const MISSION_REWARD=300000,PREDICT_REWARD=200000;

 const MISSIONS=[
  {text:"오늘 주식을 1번 이상 거래하기",ok:()=>tradeLog.some(t=>t.day===day)},
  {text:"보유 종목 중 하나를 +3% 이상 띄우기",ok:()=>Object.entries(holdings).some(([id,h])=>{
    const s=stocks.find(x=>x.id===id);
    return s&&(s.price*h.qty)/h.cost>=1.03;
  })},
  {text:"해외 종목 1주 이상 보유하기",ok:()=>Object.keys(holdings).some(id=>stocks.find(s=>s.id===id)?.market==="해외")},
  {text:"국내 종목 1주 이상 보유하기",ok:()=>Object.keys(holdings).some(id=>stocks.find(s=>s.id===id)?.market==="국내")},
  {text:"현금을 총자산의 절반 이하로 투자하기",ok:()=>cash<=totalAssets()*0.5}
 ];

 let FUN={missionDoneDay:0,pred:null,wins:0,guesses:0,sound:true,bonus:0};
 const saveFun=()=>{try{localStorage.setItem(KEY,JSON.stringify(FUN))}catch(e){}};
 const loadFun=()=>{try{Object.assign(FUN,JSON.parse(localStorage.getItem(KEY)||"{}"))}catch(e){}; FUN.bonus=Number(FUN.bonus)||0;};

 /* ---------- 보너스 집계와 손익 표시 ----------
    보너스(돌림판 현금·무료 주식, 미션·예측 보상)는 투자 손익에서 제외해 따로 보여줍니다. */
 const costTotal=()=>Object.values(holdings).reduce((a,h)=>a+(h.cost||0),0);
 const addBonus=n=>{FUN.bonus+=n;saveFun();};
 const sgnWon=n=>(n>0?"+":n<0?"-":"")+"₩"+Math.abs(Math.round(n)).toLocaleString("ko-KR");

 function showProfit(){
  const total=totalAssets();
  const inv=total-INITIAL_CASH-FUN.bonus;
  const rate=inv/INITIAL_CASH*100;
  const el=$("profit");
  el.textContent=sgnWon(inv)+" ("+pct(rate)+")";
  el.className="stat-value "+(inv>=0?"green":"red");
  let note=$("bonusLine");
  if(!note){
   note=document.createElement("div");
   note.id="bonusLine";
   note.className="footer-note";
   note.style.margin="6px 0 0";
   el.parentNode.appendChild(note);
  }
  note.textContent=`보너스 ${sgnWon(FUN.bonus)} · 돌림판·미션·예측 보상은 손익에서 제외`;
 }

 /* ---------- 효과음 (Web Audio, 외부 파일 없음) ---------- */
 let audioCtx=null;
 function beep(freqs,dur){
  if(!FUN.sound)return;
  try{
   audioCtx=audioCtx||new (window.AudioContext||window.webkitAudioContext)();
   const t0=audioCtx.currentTime;
   freqs.forEach((f,i)=>{
    const o=audioCtx.createOscillator(),g=audioCtx.createGain();
    const st=t0+i*dur;
    o.type="triangle";o.frequency.value=f;
    g.gain.setValueAtTime(0.0001,st);
    g.gain.exponentialRampToValueAtTime(0.15,st+0.01);
    g.gain.exponentialRampToValueAtTime(0.0001,st+dur);
    o.connect(g);g.connect(audioCtx.destination);
    o.start(st);o.stop(st+dur+0.02);
   });
  }catch(e){}
 }
 function sfx(msg){
  if(msg.includes("업적"))beep([523,659,784,1046],0.1);
  else if(msg.includes("매수했"))beep([523,659],0.08);
  else if(msg.includes("매도했"))beep([880,1175],0.08);
  else if(msg.includes("당첨")||msg.includes("받았습니다")||msg.includes("미션")||msg.includes("적중"))beep([784,988,1319],0.1);
  else if(msg.includes("부족")||msg.includes("없습니다")||msg.includes("뒤에")||msg.includes("모두 사용")||msg.includes("실패"))beep([220,180],0.12);
 }

 /* ---------- 주가 예측 ---------- */
 function predict(dir){
  if(FUN.pred){toast("이미 예측을 걸었어요. 다음 거래일에 결과가 나와요.");return;}
  const s=stocks.find(x=>x.id===$("chartSelect").value);
  if(!s)return;
  FUN.pred={id:s.id,dir,price:s.price,day};
  saveFun();
  toast(`${s.name} ${dir==="up"?"▲ 상승":"▼ 하락"}에 걸었습니다. 다음 거래일에 확인해요!`);
  renderFun();
 }

 function resolvePrediction(){
  const p=FUN.pred;
  if(!p||day<=p.day)return;
  const s=stocks.find(x=>x.id===p.id);
  FUN.pred=null;FUN.guesses++;
  const moved=s.price!==p.price;
  const hit=moved&&((p.dir==="up")===(s.price>p.price));
  if(hit){
   FUN.wins++;cash+=PREDICT_REWARD;addBonus(PREDICT_REWARD);
   toast(`🔮 예측 적중! ${s.name} 보상 ₩200,000`);
   celebrate();
  }else if(!moved){
   toast(`🔮 예측 실패… ${s.name} 가격이 그대로였어요.`);
  }else{
   toast(`🔮 예측 실패… ${s.name}은(는) ${s.price>p.price?"올랐":"내렸"}어요.`);
  }
  saveFun();
 }

 /* ---------- 오늘의 미션 ---------- */
 function checkMission(){
  const m=MISSIONS[(day-1)%MISSIONS.length];
  if(FUN.missionDoneDay!==day&&m.ok()){
   FUN.missionDoneDay=day;
   cash+=MISSION_REWARD;addBonus(MISSION_REWARD);
   toast("🎯 미션 성공! 보상 ₩300,000");
   celebrate();
   saveFun();
  }
 }

 /* ---------- 화면 ---------- */
 function renderFun(){
  const m=MISSIONS[(day-1)%MISSIONS.length];
  const done=FUN.missionDoneDay===day;
  $("missionBox").innerHTML=`<div class="fun-title">🎯 오늘의 미션 · 보상 ₩300,000</div>
   <div class="fun-text">${m.text}</div>
   <div class="fun-state ${done?'ok':''}">${done?'✅ 달성 완료!':'⏳ 진행 중 · 조건을 만족하면 자동으로 지급돼요'}</div>`;
  const p=FUN.pred;
  const name=p?(stocks.find(x=>x.id===p.id)?.name||""):"";
  $("predBox").innerHTML=`<div class="fun-title">🔮 오늘의 예측 · 적중 보상 ₩200,000</div>`+
   (p
    ?`<div class="fun-text">${esc(name)} ${p.dir==="up"?"▲ 상승":"▼ 하락"} 예측 중</div>
      <div class="fun-state">기준가 ${won(p.price)} · 다음 거래일 결과를 기다리는 중</div>`
    :`<div class="fun-text">차트에 선택된 종목이 다음 거래일에 오를까요?</div>
      <div class="fun-row"><button class="fun-up" id="predUp">▲ 오를 것</button><button class="fun-down" id="predDown">▼ 내릴 것</button></div>`)+
   `<div class="fun-state" style="margin-top:10px">적중 ${FUN.wins} / ${FUN.guesses}회</div>`;
  $("soundBtn").textContent=FUN.sound?"🔊 효과음 켜짐":"🔇 효과음 꺼짐";
 }

 function funTick(){
  const before=cash;
  resolvePrediction();
  checkMission();
  renderFun();
  if(cash!==before){renderStats();saveGame();}
 }

 function buildPanel(){
  const st=document.createElement("style");
  st.textContent=`
   .fun-grid{display:grid;grid-template-columns:1fr 1fr;gap:12px}
   .fun-box{padding:14px;border-radius:14px;background:linear-gradient(160deg,#192742,#111a2e);border:1px solid #2a3b5c}
   .fun-title{font-size:12px;color:#ffd166;font-weight:800;letter-spacing:.03em}
   .fun-text{font-size:15px;font-weight:700;margin:8px 0}
   .fun-state{font-size:12px;color:var(--muted)}
   .fun-state.ok{color:var(--green);font-weight:800}
   .fun-row{display:flex;gap:8px;margin-top:10px}
   .fun-row button{flex:1;padding:10px 0}
   .fun-up{background:#176e54;color:#fff}
   .fun-down{background:#8b3344;color:#fff}
   .fun-foot{display:flex;justify-content:space-between;align-items:center;margin-top:12px;gap:8px;flex-wrap:wrap}
   @media(max-width:800px){.fun-grid{grid-template-columns:1fr}}`;
  document.head.appendChild(st);

  const sec=document.createElement("section");
  sec.className="panel";
  sec.id="funPanel";
  sec.innerHTML=`<h2>🎲 오늘의 도전</h2>
   <div class="fun-grid"><div class="fun-box" id="missionBox"></div><div class="fun-box" id="predBox"></div></div>
   <div class="fun-foot"><span class="footer-note" style="margin:0">미션과 예측 보상은 현금으로 바로 들어갑니다.</span><button class="secondary" id="soundBtn"></button></div>`;
  const anchor=$("holdings").closest(".panel");
  anchor.parentNode.insertBefore(sec,anchor);

  sec.addEventListener("click",e=>{
   const b=e.target.closest("button");
   if(!b)return;
   if(b.id==="predUp")predict("up");
   else if(b.id==="predDown")predict("down");
   else if(b.id==="soundBtn"){FUN.sound=!FUN.sound;saveFun();renderFun();}
  });
 }

 /* ---------- 기존 함수에 기능을 덧붙입니다 (원래 동작은 그대로 유지) ---------- */
 const _toast=toast;
 toast=function(msg){_toast(msg);sfx(msg);};

 const _renderAll=renderAll;
 renderAll=function(){_renderAll();funTick();};

 const _renderStats=renderStats;
 renderStats=function(){_renderStats();showProfit();};

 /* 돌림판 결과가 현금(또는 무료 주식 매입가)을 늘리거나 줄이면 그만큼 보너스로 기록 */
 const _finishSpin=finishSpin;
 finishSpin=function(idx){
  const c0=cash,k0=costTotal();
  _finishSpin(idx);
  addBonus((cash-c0)+(costTotal()-k0));
  showProfit();
 };

 /* 게임 초기화 시 보너스와 예측 기록도 함께 초기화 (확인 창을 취소한 경우는 게임 상태가 그대로이므로 건너뜀) */
 $("reset").addEventListener("click",()=>setTimeout(()=>{
  if(day===1&&tradeLog.length===0&&newsLog.length===0&&cash===INITIAL_CASH&&Object.keys(holdings).length===0){
   FUN={missionDoneDay:0,pred:null,wins:0,guesses:0,sound:FUN.sound,bonus:0};
   saveFun();
   funTick();
   showProfit();
  }
 },0));

 loadFun();
 buildPanel();
 funTick();
 showProfit();
})();
