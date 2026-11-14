/* ---------- 상태 ---------- */
const SAVE_KEY="rewung-stock-market-v1";
const INITIAL_CASH=10000000;
const tickOf=p=>p>=100000?100:p>=10000?10:1;
const freshStocks=()=>initialStocks.map(s=>({...s,history:[s.price],change:0}));

let stocks=freshStocks();
let cash=INITIAL_CASH,day=1,holdings={},tradeLog=[],newsLog=[],achieved=[],lastSpinDay=0,extraSpins=0,mode="buy",activeStock=null;

/* ---------- 유틸 ---------- */
const $=id=>document.getElementById(id);
const won=n=>"₩"+Math.round(n).toLocaleString("ko-KR");
const pct=n=>(n>=0?"+":"")+n.toFixed(2)+"%";
const esc=s=>String(s).replace(/[&<>"']/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[c]));
const idLabel=s=>s.id+(notes[s.id]?" · "+notes[s.id]:"");

let toastTimer=null;
function toast(msg){
 const t=$("toast");
 t.textContent=msg;t.classList.add("show");
 clearTimeout(toastTimer);
 toastTimer=setTimeout(()=>t.classList.remove("show"),2200);
}
function totalStock(){return stocks.reduce((a,s)=>a+(holdings[s.id]?.qty||0)*s.price,0)}

/* ---------- 저장 ---------- */
function saveGame(){
 try{
  localStorage.setItem(SAVE_KEY,JSON.stringify({stocks,cash,day,holdings,tradeLog,newsLog,achieved,lastSpinDay,extraSpins}));
  const t=new Date().toLocaleTimeString("ko-KR",{hour:"2-digit",minute:"2-digit"});
  $("saveState").textContent="자동 저장됨 · "+t;
 }catch(e){
  $("saveState").textContent="이 브라우저에서는 저장할 수 없습니다";
 }
}
function loadGame(){
 try{
  const raw=localStorage.getItem(SAVE_KEY);
  if(!raw)return false;
  const d=JSON.parse(raw);
  if(!Array.isArray(d.stocks))return false;
  stocks=d.stocks;cash=d.cash;day=d.day;
  holdings=d.holdings||{};tradeLog=d.tradeLog||[];newsLog=d.newsLog||[];achieved=d.achieved||[];lastSpinDay=d.lastSpinDay||0;extraSpins=d.extraSpins||0;
  return true;
 }catch(e){return false}
}
function clearGame(){
 try{localStorage.removeItem(SAVE_KEY)}catch(e){}
}

/* ---------- 렌더링 ---------- */
function renderStats(){
 const value=totalStock(),total=cash+value,p=total-INITIAL_CASH,rate=p/INITIAL_CASH*100;
 $("cash").textContent=won(cash);
 $("stockValue").textContent=won(value);
 $("total").textContent=won(total);
 $("profit").textContent=won(p)+" ("+pct(rate)+")";
 $("profit").className="stat-value "+(p>=0?"green":"red");
 $("dayLabel").textContent=`거래일 ${day}일차 · 장 운영 중`;
}

function renderMarket(){
 const q=$("search").value.trim().toLowerCase();
 const mf=$("marketFilter").value;
 let list=stocks.filter(s=>
   (mf==="all"||s.market===mf) &&
   (s.name+" "+s.id).toLowerCase().includes(q)
 );
 const sv=$("sort").value;
 if(sv==="up")list.sort((a,b)=>b.change-a.change);
 if(sv==="down")list.sort((a,b)=>a.change-b.change);
 $("market").innerHTML=list.length?list.map(s=>`<tr>
   <td><div class="stock-row">${logoHTML(s)}<div>
     <div class="stock-name">${esc(s.name)}<span class="tag">${s.market}</span></div>
     <div class="ticker">${esc(idLabel(s))}</div>
   </div></div></td>
   <td>${won(s.price)}</td>
   <td class="${s.change>=0?'green':'red'}">${pct(s.change)}</td>
   <td><div class="stock-actions"><button class="buy" data-buy="${s.id}">매수</button><button class="sell" data-sell="${s.id}">매도</button></div></td>
 </tr>`).join(""):'<tr><td colspan="4" class="empty">검색 결과가 없습니다.</td></tr>';
 $("market").querySelectorAll("[data-buy]").forEach(b=>b.onclick=()=>openTrade(b.dataset.buy,"buy"));
 $("market").querySelectorAll("[data-sell]").forEach(b=>b.onclick=()=>openTrade(b.dataset.sell,"sell"));
}

function sparkSVG(vals,up){
 const w=110,h=36;
 const min=Math.min(...vals),max=Math.max(...vals),range=max-min||1;
 const pts=vals.map((v,i)=>{
   const x=(i/Math.max(1,vals.length-1))*w;
   const y=h-4-((v-min)/range)*(h-8);
   return `${x.toFixed(1)},${y.toFixed(1)}`;
 }).join(" ");
 const c=up?"#35d39a":"#ff6b7a";
 return `<svg width="${w}" height="${h}" viewBox="0 0 ${w} ${h}" aria-hidden="true"><polyline points="${pts}" fill="none" stroke="${c}" stroke-width="2" stroke-linejoin="round" stroke-linecap="round"/></svg>`;
}

function renderHoldings(){
 const rows=stocks.filter(s=>(holdings[s.id]?.qty||0)>0);
 if(!rows.length){
  $("holdings").innerHTML='<div class="empty">보유 중인 주식이 없습니다. 시장 현황에서 매수해 보세요.</div>';
  return;
 }
 $("holdings").innerHTML=rows.map(s=>{
   const h=holdings[s.id],v=h.qty*s.price,p=v-h.cost,rate=p/h.cost*100,up=p>=0;
   return `<div class="hold-card">
    <div class="hold-top">
     <div class="stock-row">${logoHTML(s)}<div><div class="stock-name">${esc(s.name)}</div><div class="ticker">${esc(idLabel(s))}</div></div></div>
     <span class="hold-pl ${up?'up':'down'}">${pct(rate)}</span>
    </div>
    <div class="hold-mid">
     <div><div class="hold-label">평가액</div><div class="hold-value">${won(v)}</div></div>
     ${sparkSVG(s.history.slice(-14),up)}
    </div>
    <div class="hold-meta">
     <span>${h.qty.toLocaleString()}주</span>
     <span>평균 ${won(h.cost/h.qty)}</span>
     <span class="${up?'green':'red'}">${(up?"+":"")+won(p)}</span>
    </div>
    <div class="quick-sell">
     <button class="secondary" data-qs="${s.id}" data-f="0.25">25%</button>
     <button class="secondary" data-qs="${s.id}" data-f="0.5">50%</button>
     <button class="sell" data-qs="${s.id}" data-f="1">전량</button>
     <button class="secondary" data-hsell="${s.id}">직접</button>
    </div>
   </div>`;
 }).join("");
 $("holdings").querySelectorAll("[data-hsell]").forEach(b=>b.onclick=()=>openTrade(b.dataset.hsell,"sell"));
 $("holdings").querySelectorAll("[data-qs]").forEach(b=>b.onclick=()=>quickSell(b.dataset.qs,Number(b.dataset.f)));
}

/* 모달 없이 비율로 바로 매도 */
function quickSell(id,fraction){
 const s=stocks.find(x=>x.id===id),h=holdings[id];
 if(!s||!h)return;
 const q=fraction>=1?h.qty:Math.max(1,Math.floor(h.qty*fraction));
 activeStock=s;
 mode="sell";
 $("quantity").value=q;
 trade();
}

function renderHistory(){
 $("history").innerHTML=tradeLog.length?tradeLog.slice(0,12).map(x=>`<div class="news-item">
   <b class="${x.type==='매수'?'green':'red'}">${x.type}</b> · ${esc(x.name)} ${x.qty}주
   <span style="float:right">${won(x.amount)}</span>
   <small>${x.day}일차 · 체결가 ${won(x.price)}</small>
 </div>`).join(""):'<div class="empty">아직 거래 내역이 없습니다.</div>';
}
function renderNews(items){
 $("news").innerHTML=items.length?items.map(newsItemHTML).join(""):'<div class="empty">오늘의 뉴스가 없습니다.</div>';
}

function newsItemHTML(x){
 const link=x.stockId?` news-link" data-stock="${x.stockId}`:"";
 return `<div class="news-item${link}">${x.text}<small>${x.detail}</small></div>`;
}

function renderNewsArchive(){
 const past=newsLog.filter(x=>x.day<day);
 if(!past.length){$("newsArchive").innerHTML="";return;}
 const groups={};
 past.forEach(x=>{(groups[x.day]=groups[x.day]||[]).push(x)});
 const days=Object.keys(groups).map(Number).sort((a,b)=>b-a).slice(0,5);
 $("newsArchive").innerHTML=`<h2 style="margin:22px 0 4px;font-size:16px">🗞️ 지난 뉴스</h2>`+
   days.map(d=>`<div class="archive-day">${d}거래일차</div>`+
     groups[d].map(x=>`<div class="archive-item${x.stockId?' news-link':''}"${x.stockId?` data-stock="${x.stockId}"`:""}>${x.text}</div>`).join("")
   ).join("");
}
function rankedStocks(type){
 const list=[...stocks];
 if(type==="up")list.sort((a,b)=>b.change-a.change);
 else if(type==="down")list.sort((a,b)=>a.change-b.change);
 else list.sort((a,b)=>b.price-a.price);
 return list;
}

function rankRowHTML(s,rank,type,maxVal,hit){
 const isPrice=type==="price";
 const n=isPrice?s.price:Math.abs(s.change);
 const w=Math.max(2,Math.min(100,n/maxVal*100));
 const color=isPrice?"#72a7ff":(s.change>=0?"#35d39a":"#ff6b7a");
 const val=isPrice?won(s.price):pct(s.change);
 const cls=isPrice?"":(s.change>=0?"green":"red");
 return `<div class="rank-row ${hit?'rank-hit':''}">
   <div class="rank-no">${rank}</div>
   <div class="stock-row">${logoHTML(s)}<div><div class="stock-name">${esc(s.name)}</div><div class="ticker">${s.market}</div></div></div>
   <div><div class="rank-val ${cls}">${val}</div><div class="rank-bar"><i style="width:${w}%;background:${color}"></i></div></div>
 </div>`;
}

function renderRank(){
 const type=$("rankType").value;
 const list=rankedStocks(type);
 const q=$("rankSearch").value.trim().toLowerCase();
 const maxVal=Math.max(...list.map(s=>type==="price"?s.price:Math.abs(s.change)),1);
 const hitIdx=q?list.findIndex(s=>(s.name+" "+s.id).toLowerCase().includes(q)):-1;
 const hit=hitIdx>=0?list[hitIdx]:null;
 const TOP=15;
 let html=list.slice(0,TOP).map((s,i)=>rankRowHTML(s,i+1,type,maxVal,s===hit)).join("");
 if(hit&&hitIdx>=TOP)html+=`<div style="text-align:center;color:var(--muted);font-size:12px;margin:8px 0">⋯</div>`+rankRowHTML(hit,hitIdx+1,type,maxVal,true);
 $("rankList").innerHTML=html||'<div class="empty">표시할 종목이 없습니다.</div>';
 const label={up:"등락률 상위",down:"등락률 하위",price:"현재가 상위"}[type];
 $("rankInfo").textContent=hit
   ?`${hit.name} · ${label} ${hitIdx+1}위 / 전체 ${list.length}개 종목`
   :`${label} TOP ${TOP} · 전체 ${list.length}개 종목`;
}

function renderChart(){
 const s=stocks.find(x=>x.id===$("chartSelect").value)||stocks[0];
 const canvas=$("chart"),ctx=canvas.getContext("2d");
 const rect=canvas.getBoundingClientRect(),dpr=window.devicePixelRatio||1;
 canvas.width=rect.width*dpr;canvas.height=rect.height*dpr;
 ctx.setTransform(dpr,0,0,dpr,0,0);
 const w=rect.width,h=rect.height,vals=s.history;
 const min=Math.min(...vals)*.985,max=Math.max(...vals)*1.015,range=max-min||1;
 ctx.clearRect(0,0,w,h);
 ctx.strokeStyle="#293752";ctx.lineWidth=1;
 for(let i=0;i<4;i++){const y=15+i*(h-35)/3;ctx.beginPath();ctx.moveTo(38,y);ctx.lineTo(w-8,y);ctx.stroke();}
 ctx.fillStyle="#91a2c1";ctx.font="10px system-ui";
 ctx.fillText(won(max),2,13);ctx.fillText(won(min),2,h-8);
 const up=vals[vals.length-1]>=vals[0];
 ctx.strokeStyle=up?"#35d39a":"#ff6b7a";ctx.lineWidth=2.5;ctx.beginPath();
 vals.forEach((v,i)=>{
   const x=40+(w-52)*(i/Math.max(1,vals.length-1));
   const y=15+(h-35)*(1-(v-min)/range);
   i?ctx.lineTo(x,y):ctx.moveTo(x,y);
 });
 ctx.stroke();
 $("chartInfo").textContent=`${s.name} (${s.market}) · 최근 ${vals.length}거래일 · 현재가 ${won(s.price)} · ${pct(s.change)}`;
}
/* ---------- 행운의 돌림판 ---------- */
const mod=(a,n)=>((a%n)+n)%n;

/* 무료 주식은 받은 시점 시세를 매수가로 기록하므로 처음 손익은 0원에서 시작합니다. */
function freeStock(value){
 const candidates=stocks.filter(s=>s.price<=value);
 const s=candidates[Math.floor(Math.random()*candidates.length)];
 const q=Math.max(1,Math.floor(value/s.price));
 const h=holdings[s.id]||{qty:0,cost:0};
 h.qty+=q;h.cost+=q*s.price;holdings[s.id]=h;
 return `${s.name} ${q.toLocaleString()}주를 무료로 받았습니다! (약 ${won(q*s.price)}어치)`;
}

const PRIZES=[
 {label:"현금 50만",icon:"💵",color:"#35d39a",good:true,apply:()=>{cash+=500000;return "현금 ₩500,000을 받았습니다!";}},
 {label:"꽝",icon:"💨",color:"#3a4a66",good:false,apply:()=>"아쉽지만 꽝입니다. 다음 기회에!"},
 {label:"무료 주식",icon:"🎁",color:"#72a7ff",good:true,apply:()=>freeStock(300000)},
 {label:"현금 100만",icon:"💰",color:"#ffd166",good:true,apply:()=>{cash+=1000000;return "현금 ₩1,000,000 당첨!";}},
 {label:"세금 폭탄",icon:"💣",color:"#ff6b7a",good:false,apply:()=>{
   const tax=Math.min(cash,200000);cash-=tax;
   return `세금 폭탄! ₩${tax.toLocaleString()}이 빠져나갔습니다.`;
 }},
 {label:"한 번 더",icon:"🔁",color:"#b58cff",good:true,apply:()=>{extraSpins++;return "한 번 더 돌릴 수 있습니다!";}},
 {label:"무료 주식 대박",icon:"🚀",color:"#ff9f5a",good:true,apply:()=>freeStock(1000000)},
 {label:"현금 10만",icon:"🪙",color:"#5fd3e8",good:true,apply:()=>{cash+=100000;return "현금 ₩100,000을 받았습니다.";}}
];

const SEG=2*Math.PI/PRIZES.length;
let spinning=false,wheelRot=0;

function drawWheel(){
 const canvas=$("wheel"),ctx=canvas.getContext("2d");
 const size=canvas.width,c=size/2,r=c-6;
 ctx.setTransform(1,0,0,1,0,0);
 ctx.clearRect(0,0,size,size);
 ctx.save();
 ctx.translate(c,c);
 ctx.rotate(wheelRot);
 PRIZES.forEach((p,i)=>{
   const start=i*SEG;
   ctx.beginPath();
   ctx.moveTo(0,0);
   ctx.arc(0,0,r,start,start+SEG);
   ctx.closePath();
   ctx.fillStyle=p.color;
   ctx.fill();
   ctx.strokeStyle="#0b1020";ctx.lineWidth=4;ctx.stroke();

   ctx.save();
   ctx.rotate(start+SEG/2);
   ctx.textAlign="right";
   ctx.fillStyle=p.good?"#0b1020":"#fff";
   ctx.font="bold 26px system-ui,'Noto Sans KR',sans-serif";
   ctx.fillText(`${p.icon} ${p.label}`,r-26,10);
   ctx.restore();
 });
 ctx.beginPath();
 ctx.arc(0,0,44,0,Math.PI*2);
 ctx.fillStyle="#141d32";
 ctx.fill();
 ctx.strokeStyle="#ffd166";ctx.lineWidth=5;ctx.stroke();
 ctx.restore();
}

/* 무료 기회는 30거래일에 1번, '한 번 더'로 얻은 기회는 쿨다운과 상관없이 사용 */
const SPIN_COOLDOWN=30;

function spinCooldownLeft(){
 if(lastSpinDay===0)return 0;
 return Math.max(0,SPIN_COOLDOWN-(day-lastSpinDay));
}

function updateSpinUI(){
 const left=spinCooldownLeft();
 $("spinBtn").disabled=spinning||(left>0&&extraSpins===0);
 const extra=extraSpins?` · 추가 ${extraSpins}회`:"";
 $("spinInfo").textContent=left===0
   ?`지금 돌릴 수 있어요${extra}`
   :`다음 돌림판까지 ${left}거래일${extra}`;
}

function spin(){
 if(spinning)return;
 const cooldownLeft=spinCooldownLeft();
 if(cooldownLeft===0){lastSpinDay=day;}
 else if(extraSpins>0){extraSpins--;}
 else{toast(`돌림판은 ${cooldownLeft}거래일 뒤에 다시 돌릴 수 있어요.`);return;}

 spinning=true;
 $("spinResult").textContent="돌아가는 중...";
 updateSpinUI();

 const idx=Math.floor(Math.random()*PRIZES.length);
 const jitter=(Math.random()-.5)*SEG*.6;
 const center=idx*SEG+SEG/2+jitter;
 const base=-Math.PI/2-center;
 const start=wheelRot;
 const target=start+6*Math.PI+mod(base-(start+6*Math.PI),2*Math.PI);
 const t0=performance.now(),dur=3800;

 function frame(now){
   const p=Math.min(1,(now-t0)/dur);
   const e=1-Math.pow(1-p,3);
   wheelRot=start+(target-start)*e;
   drawWheel();
   if(p<1){requestAnimationFrame(frame);}
   else{
     wheelRot=target;
     drawWheel();
     finishSpin(idx);
   }
 }
 requestAnimationFrame(frame);
}
function finishSpin(idx){
 spinning=false;
 const prize=PRIZES[idx];
 const msg=prize.apply();
 $("spinResult").textContent=`${prize.icon} ${msg}`;
 if(prize.good)celebrate();
 renderAll();
}

/* ---------- 재미 요소: 등급, 기분 메시지, 업적, 축하 효과 ---------- */
const totalAssets=()=>cash+totalStock();
const returnRate=()=>(totalAssets()-INITIAL_CASH)/INITIAL_CASH*100;

function tierOf(){
 const a=totalAssets();
 if(a<9500000)return "🐜 개미 투자자";
 if(a<10500000)return "🐥 견습 투자자";
 if(a<12000000)return "📈 능숙한 투자자";
 if(a<15000000)return "🦈 큰손";
 return "🐺 월가의 늑대";
}

const ACHIEVEMENTS=[
 {id:"first",icon:"🛒",name:"첫 주문",desc:"처음으로 주식을 매수하기",ok:()=>tradeLog.some(t=>t.type==="매수")},
 {id:"ten",icon:"🔟",name:"단타 입문",desc:"거래 10회 달성",ok:()=>tradeLog.length>=10},
 {id:"div",icon:"🧺",name:"분산 투자자",desc:"5개 이상 종목 보유",ok:()=>Object.keys(holdings).length>=5},
 {id:"global",icon:"🌏",name:"세계 투자자",desc:"국내와 해외 종목을 함께 보유",ok:()=>{
   const m=new Set(Object.keys(holdings).map(id=>stocks.find(s=>s.id===id)?.market));
   return m.has("국내")&&m.has("해외");
 }},
 {id:"up5",icon:"🚀",name:"수익 5% 돌파",desc:"총 수익률 +5% 달성",ok:()=>returnRate()>=5},
 {id:"up20",icon:"🏆",name:"수익 20% 돌파",desc:"총 수익률 +20% 달성",ok:()=>returnRate()>=20},
 {id:"moon",icon:"🌕",name:"대박 종목",desc:"보유 종목 하나가 +30% 이상",ok:()=>Object.entries(holdings).some(([id,h])=>{
   const s=stocks.find(x=>x.id===id);
   return s&&(s.price*h.qty)/h.cost-1>=0.3;
 })},
 {id:"rich",icon:"💰",name:"억만장자 예비군",desc:"총자산 1억 원 이상",ok:()=>totalAssets()>=100000000},
 {id:"day10",icon:"📅",name:"10거래일 생존",desc:"10거래일 동안 살아남기",ok:()=>day>=10}
];

function celebrate(){
 const colors=["#ffd166","#35d39a","#72a7ff","#ff6b7a","#b58cff"];
 const box=document.createElement("div");
 box.className="confetti";
 for(let i=0;i<70;i++){
   const p=document.createElement("i");
   p.style.left=Math.random()*100+"%";
   p.style.background=colors[i%colors.length];
   p.style.animationDelay=(Math.random()*.4)+"s";
   p.style.animationDuration=(1.6+Math.random()*1.2)+"s";
   box.appendChild(p);
 }
 document.body.appendChild(box);
 setTimeout(()=>box.remove(),3200);
}

function checkAchievements(){
 const fresh=ACHIEVEMENTS.filter(a=>!achieved.includes(a.id)&&a.ok());
 fresh.forEach(a=>achieved.push(a.id));
 fresh.forEach((a,i)=>setTimeout(()=>{
   toast(`${a.icon} 업적 달성! ${a.name}`);
   celebrate();
 },i*2400));
}

function renderAchievements(){
 $("achv").innerHTML=ACHIEVEMENTS.map(a=>{
   const on=achieved.includes(a.id);
   return `<div class="achv ${on?'on':''}" title="${a.desc}">
     <div class="achv-icon">${on?a.icon:'🔒'}</div>
     <div><div class="achv-name">${on?a.name:"???"}</div><div class="achv-desc">${a.desc}</div></div>
   </div>`;
 }).join("");
 $("achvCount").textContent=`${achieved.length} / ${ACHIEVEMENTS.length}`;
}

function renderMood(){
 const r=returnRate();
 $("tierLabel").textContent=tierOf();
 $("moodLine").textContent=
   r>=20?"🔥 대단해요! 이대로면 월가도 노려볼 만해요."
 : r>=5 ?"😎 꽤 괜찮은 흐름이에요. 욕심은 조금만!"
 : r>=0 ?"🙂 소소하게 플러스 중이에요."
 : r>-10?"😅 괜찮아요, 시장은 원래 출렁이는 법이죠."
 :       "🥲 힘든 구간이네요. 여러 종목으로 나눠 담아 보세요.";
}

function renderAll(){
 renderStats();renderMarket();renderHoldings();renderHistory();renderChart();renderRank();renderNewsArchive();
 checkAchievements();renderAchievements();renderMood();updateSpinUI();
 saveGame();
}

/* ---------- 거래 ---------- */
function openTrade(id,type){
 activeStock=stocks.find(s=>s.id===id);
 if(!activeStock)return;
 mode=type;
 const owned=holdings[id]?.qty||0;
 $("modalTitle").textContent=`${activeStock.name} ${type==="buy"?"매수":"매도"}`;
 $("modalPrice").textContent=`현재가 ${won(activeStock.price)} · 수수료 0.1%`;
 $("ownedInfo").textContent=type==="sell"
   ?`보유 수량 ${owned.toLocaleString()}주`
   :`주문 가능 현금 ${won(cash)}`;
 $("quantity").value=1;
 $("tradeModal").classList.add("show");
 $("quantity").focus();
 $("quantity").select();
 updateEstimate();
}

function closeTrade(){$("tradeModal").classList.remove("show")}

function maxQty(){
 if(!activeStock)return 0;
 if(mode==="sell")return holdings[activeStock.id]?.qty||0;
 return Math.floor(cash/(activeStock.price*1.001));
}

function setQty(n){
 $("quantity").value=Math.max(1,n);
 updateEstimate();
}

function updateEstimate(){
 if(!activeStock)return;
 const q=Math.max(0,Math.floor(Number($("quantity").value)||0));
 const gross=q*activeStock.price,fee=gross*.001;
 $("estimate").textContent=q
   ?`예상 ${mode==="buy"?"결제":"수령"} 금액 ${won(mode==="buy"?gross+fee:gross-fee)} (수수료 ${won(fee)})`
   :"";
}

function trade(){
 const s=activeStock;
 const q=Math.floor(Number($("quantity").value));
 if(!s||!Number.isFinite(q)||q<1){toast("1주 이상 입력해 주세요.");return}
 const gross=q*s.price,fee=gross*.001;
 if(mode==="buy"){
  if(gross+fee>cash){toast("현금이 부족합니다.");return}
  cash-=gross+fee;
  const h=holdings[s.id]||{qty:0,cost:0};
  h.qty+=q;h.cost+=gross+fee;holdings[s.id]=h;
  toast(`${s.name} ${q.toLocaleString()}주를 매수했습니다.`);
 }else{
  const h=holdings[s.id];
  if(!h||q>h.qty){toast("보유 수량이 부족합니다.");return}
  const avg=h.cost/h.qty;
  cash+=gross-fee;
  h.qty-=q;h.cost-=avg*q;
  if(h.qty===0)delete holdings[s.id];
  toast(`${s.name} ${q.toLocaleString()}주를 매도했습니다.`);
 }
 tradeLog.unshift({type:mode==="buy"?"매수":"매도",name:s.name,qty:q,amount:mode==="buy"?gross+fee:gross-fee,price:s.price,day});
 closeTrade();
 renderAll();
}

/* ---------- 거래일 진행 ---------- */
/* 뉴스 문구 */
const marketEvents=[
 ["📈 증시 상승 기대감이 커졌습니다.","시장 전반에 매수세가 유입됐습니다."],
 ["📉 투자 심리가 위축됐습니다.","일부 투자자들이 위험 자산을 줄이고 있습니다."],
 ["🏦 금리 동결 소식이 전해졌습니다.","시장에 제한적인 영향을 주었습니다."],
 ["🧪 신기술 투자 소식이 나왔습니다.","성장주에 관심이 쏠리고 있습니다."],
 ["🌍 해외 시장 변동성이 커졌습니다.","종목별 움직임이 엇갈렸습니다."],
 ["💱 환율이 큰 폭으로 움직였습니다.","수출 기업과 수입 기업의 희비가 갈렸습니다."],
 ["🛢️ 국제 유가가 등락을 반복했습니다.","에너지와 운송 관련 종목이 영향을 받았습니다."],
 ["🏛️ 주요국 정책 발표가 이어졌습니다.","규제에 민감한 업종에 시선이 쏠렸습니다."]
];
const upHeadlines=[
 n=>`${n}, 실적 기대감에 주가 급등`,
 n=>`${n}, 신규 계약 소식에 매수세 유입`,
 n=>`${n}, 기관 순매수로 강세 전환`
];
const downHeadlines=[
 n=>`${n}, 차익 실현 매물에 하락`,
 n=>`${n}, 업황 우려에 약세`,
 n=>`${n}, 투자 심리 위축으로 하락 전환`
];
const pickOne=arr=>arr[Math.floor(Math.random()*arr.length)];

function nextDay(){
 day++;
 const ev=pickOne(marketEvents);
 stocks.forEach(s=>{
  let shock=(Math.random()-.5)*s.vol*2;
  if(Math.random()<.10)shock+=(Math.random()-.5)*.12;
  const old=s.price,t=tickOf(old);
  s.price=Math.max(t,Math.round(old*(1+shock)/t)*t);
  s.change=(s.price/old-1)*100;
  s.history.push(s.price);
  if(s.history.length>30)s.history.shift();
 });

 const sortedUp=[...stocks].sort((a,b)=>b.change-a.change);
 const best=sortedUp[0],worst=sortedUp[sortedUp.length-1];
 const today=[
  {text:ev[0],detail:ev[1]},
  {text:`강세: ${best.name} (${pct(best.change)})`,detail:"오늘 가장 많이 오른 종목 · 눌러서 차트 보기",stockId:best.id},
  {text:`약세: ${worst.name} (${pct(worst.change)})`,detail:"오늘 가장 많이 내린 종목 · 눌러서 차트 보기",stockId:worst.id}
 ];

 /* 변동폭이 큰 종목 중 2개를 골라 개별 뉴스 생성 */
 const movers=[...stocks]
   .filter(s=>s.id!==best.id&&s.id!==worst.id)
   .sort((a,b)=>Math.abs(b.change)-Math.abs(a.change))
   .slice(0,12);
 for(let i=0;i<2&&movers.length;i++){
  const s=movers.splice(Math.floor(Math.random()*movers.length),1)[0];
  const tpl=s.change>=0?pickOne(upHeadlines):pickOne(downHeadlines);
  today.push({text:tpl(s.name),detail:`${pct(s.change)} · ${s.market} 종목 · 눌러서 차트 보기`,stockId:s.id});
 }

 const stamped=today.map(x=>({...x,day}));
 newsLog=[...stamped,...newsLog].slice(0,80);
 renderNews(stamped);
 renderAll();
}

/* ---------- 초기화 및 시작 ---------- */
function fillChartSelect(){
 const cur=$("chartSelect").value;
 $("chartSelect").innerHTML=stocks.map(s=>`<option value="${s.id}">[${s.market}] ${esc(s.name)}</option>`).join("");
 if(cur&&stocks.some(s=>s.id===cur))$("chartSelect").value=cur;
}

function resetGame(){
 if(!confirm("모든 투자 기록을 초기화할까요? 저장된 진행 상황도 함께 지워집니다."))return;
 stocks=freshStocks();cash=INITIAL_CASH;day=1;holdings={};tradeLog=[];newsLog=[];achieved=[];lastSpinDay=0;extraSpins=0;
 clearGame();
 fillChartSelect();
 renderNews([{text:"새로운 모의 투자 게임이 시작됐습니다.",detail:"초기 자금 ₩10,000,000"}]);
 renderAll();
 toast("게임을 초기화했습니다.");
}

function init(){
 const loaded=loadGame();
 fillChartSelect();
 if(!loaded)$("chartSelect").value=stocks[0].id;

 $("search").oninput=renderMarket;
 $("marketFilter").onchange=renderMarket;
 $("sort").onchange=renderMarket;
 $("nextDay").onclick=nextDay;

 $("rankType").onchange=renderRank;
 $("rankSearch").oninput=renderRank;

 $("chartSelect").onchange=renderChart;
 $("chartSearch").oninput=()=>{
   const q=$("chartSearch").value.trim().toLowerCase();
   if(!q)return;
   const s=stocks.find(x=>(x.name+" "+x.id).toLowerCase().includes(q));
   if(s){$("chartSelect").value=s.id;renderChart();}
 };

 document.querySelectorAll("[data-q]").forEach(b=>b.onclick=()=>{
   const k=b.dataset.q;
   setQty(k==="max"?maxQty():Number(k));
 });
 $("quantity").oninput=updateEstimate;
 $("quantity").onkeydown=e=>{
   if(e.key==="Enter")trade();
   if(e.key==="Escape")closeTrade();
 };
 $("cancel").onclick=closeTrade;
 $("confirm").onclick=trade;
 $("tradeModal").onclick=e=>{if(e.target.id==="tradeModal")closeTrade();};
 $("reset").onclick=resetGame;
 $("spinBtn").onclick=spin;
 drawWheel();

 const openFromNews=e=>{
   const el=e.target.closest("[data-stock]");
   if(!el)return;
   $("chartSelect").value=el.dataset.stock;
   renderChart();
   $("chartSelect").scrollIntoView({behavior:"smooth",block:"center"});
 };
 $("news").onclick=openFromNews;
 $("newsArchive").onclick=openFromNews;

 if(loaded){
  renderNews([{text:"👋 저장된 게임을 이어서 진행합니다.",detail:`현재 ${day}거래일차 · 총 ${tradeLog.length}건의 거래 기록`}]);
 }else{
  renderNews([
   {text:"🎉 REWUNG STOCK MARKET에 오신 것을 환영합니다!",detail:"가상 시장이 개장했습니다."},
   {text:"💡 투자 팁: 한 종목에만 집중하기보다 여러 종목을 살펴보세요.",detail:"이 게임은 투자 연습용 시뮬레이션입니다."}
  ]);
 }
 renderAll();
}

window.addEventListener("resize",renderChart);
init();
