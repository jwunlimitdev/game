/* ---------- 종목 데이터 ---------- */
/* 국내 형식: 코드|종목명|게임용 근사 시세(원)|변동성 */
const domesticRaw=`005930|삼성전자|75000|0.03
000660|SK하이닉스|200000|0.05
373220|LG에너지솔루션|380000|0.04
207940|삼성바이오로직스|1000000|0.03
005380|현대차|230000|0.03
000270|기아|110000|0.03
005490|POSCO홀딩스|300000|0.04
035420|NAVER|200000|0.04
035720|카카오|45000|0.05
051910|LG화학|350000|0.04
006400|삼성SDI|380000|0.05
028260|삼성물산|130000|0.03
105560|KB금융|90000|0.03
055550|신한지주|55000|0.03
086790|하나금융지주|80000|0.03
032830|삼성생명|110000|0.02
012330|현대모비스|240000|0.03
066570|LG전자|100000|0.04
003550|LG|100000|0.03
015760|한국전력|22000|0.03
017670|SK텔레콤|60000|0.02
030200|KT|50000|0.02
033780|KT&G|110000|0.02
096770|SK이노베이션|130000|0.04
010130|고려아연|600000|0.04
034730|SK|180000|0.03
000810|삼성화재|380000|0.02
316140|우리금융지주|25000|0.03
138040|메리츠금융지주|130000|0.04
329180|HD현대중공업|200000|0.05
009540|HD한국조선해양|200000|0.05
012450|한화에어로스페이스|900000|0.05
042660|한화오션|60000|0.05
010140|삼성중공업|17000|0.05
011200|HMM|20000|0.05
028050|삼성엔지니어링|25000|0.05
000720|현대건설|40000|0.04
047050|포스코인터내셔널|40000|0.04
018260|삼성에스디에스|150000|0.03
034020|두산에너빌리티|22000|0.06
247540|에코프로비엠|100000|0.08
086520|에코프로|90000|0.08
293490|카카오게임즈|15000|0.06
259960|크래프톤|250000|0.05
263750|펄어비스|30000|0.07
036570|엔씨소프트|200000|0.06
251270|넷마블|60000|0.06
352820|하이브|200000|0.06
041510|에스엠|90000|0.06
051900|LG생활건강|300000|0.04`;

/* 해외 형식: 코드|종목명|게임용 근사 시세(원)|변동성 */
const foreignRaw=`AAPL|애플|322000|0.03
MSFT|마이크로소프트|588000|0.03
NVDA|엔비디아|182000|0.06
AMZN|아마존|280000|0.04
GOOGL|알파벳|238000|0.04
META|메타|812000|0.05
TSLA|테슬라|350000|0.07
AVGO|브로드컴|238000|0.05
ORCL|오라클|238000|0.05
NFLX|넷플릭스|1260000|0.05
AMD|AMD|210000|0.06
INTC|인텔|30800|0.06
CRM|세일즈포스|392000|0.04
ADBE|어도비|672000|0.04
CSCO|시스코|84000|0.03
QCOM|퀄컴|238000|0.05
TXN|텍사스인스트루먼츠|280000|0.04
AMAT|어플라이드머티리얼즈|252000|0.05
MU|마이크론|154000|0.06
IBM|IBM|322000|0.03
INTU|인튜이트|910000|0.04
PYPL|페이팔|112000|0.06
UBER|우버|112000|0.05
ABNB|에어비앤비|182000|0.05
SHOP|쇼피파이|154000|0.07
SNOW|스노우플레이크|238000|0.07
PLTR|팔란티어|112000|0.08
COIN|코인베이스|350000|0.09
SQ|블록|105000|0.07
ZM|줌|98000|0.05
ROKU|로쿠|105000|0.07
SPOT|스포티파이|812000|0.05
ANET|아리스타네트웍스|420000|0.05
PANW|팔로알토네트웍스|490000|0.04
CRWD|크라우드스트라이크|560000|0.05
NOW|서비스나우|1120000|0.04
WDAY|워크데이|350000|0.05
DDOG|데이터독|175000|0.06
ZS|지스케일러|280000|0.06
MDB|몽고DB|420000|0.07
ETSY|엣시|98000|0.07
EBAY|이베이|98000|0.04
BBY|베스트바이|112000|0.04
DG|달러제너럴|175000|0.05
F|포드|17000|0.04
GM|제너럴모터스|77000|0.04
RIVN|리비안|19000|0.08
SMCI|슈퍼마이크로컴퓨터|56000|0.09
ARM|ARM홀딩스|196000|0.07
AFRM|어펌|98000|0.09
HOOD|로빈후드|210000|0.08
RBLX|로블록스|77000|0.07
DASH|도어대시|224000|0.06
ENPH|엔페이즈에너지|35000|0.07
FSLR|퍼스트솔라|294000|0.06
SEDG|솔라엣지|30000|0.08
BRK.B|버크셔해서웨이B|658000|0.02
JPM|JP모건|336000|0.03
V|비자|420000|0.03
MA|마스터카드|700000|0.03
UNH|유나이티드헬스|700000|0.04
XOM|엑슨모빌|154000|0.03
LLY|일라이릴리|1120000|0.04
JNJ|존슨앤드존슨|224000|0.02
WMT|월마트|126000|0.03
PG|프록터앤드갬블|231000|0.02
HD|홈디포|532000|0.03
COST|코스트코|1260000|0.03
KO|코카콜라|98000|0.02
PEP|펩시코|210000|0.02
MCD|맥도날드|406000|0.02
DIS|디즈니|154000|0.04
NKE|나이키|105000|0.04
SBUX|스타벅스|133000|0.04
BA|보잉|252000|0.05
CAT|캐터필러|504000|0.04
GE|GE에어로스페이스|266000|0.04
MMM|3M|182000|0.03
BAC|뱅크오브아메리카|56000|0.03
WFC|웰스파고|84000|0.03
GS|골드만삭스|966000|0.04
MS|모건스탠리|182000|0.04
C|씨티그룹|98000|0.04
AXP|아메리칸익스프레스|392000|0.03
BLK|블랙록|1260000|0.03
SCHW|찰스슈왑|98000|0.03
CVX|쉐브론|210000|0.03
COP|코노코필립스|168000|0.04
SLB|슐럼버저|65000|0.04
LMT|록히드마틴|630000|0.02
RTX|RTX|182000|0.03
NOC|노스롭그루먼|616000|0.03
HON|허니웰|280000|0.03
UPS|UPS|168000|0.04
FDX|페덱스|350000|0.04
UNP|유니온퍼시픽|336000|0.03
DE|디어앤드컴퍼니|546000|0.03
MRK|머크|140000|0.03
PFE|화이자|35000|0.03
ABBV|애브비|259000|0.03
TMO|써모피셔사이언티픽|728000|0.03
DHR|다나허|336000|0.03
ABT|애보트|189000|0.03
BMY|브리스톨마이어스스퀴브|77000|0.03
AMGN|암젠|420000|0.03
GILD|길리어드사이언스|147000|0.03
CVS|CVS헬스|98000|0.03
MDT|메드트로닉|126000|0.03
ISRG|인튜이티브서지컬|735000|0.04
LOW|로우스|364000|0.03
TGT|타겟|168000|0.04
TJX|TJX|182000|0.03
ROST|로스스토어스|210000|0.04
BKNG|부킹홀딩스|6800000|0.03
MAR|메리어트|357000|0.03
HLT|힐튼|322000|0.03
LULU|룰루레몬|462000|0.05
ASML|ASML|1120000|0.04
SAP|SAP|364000|0.03
NVO|노보노디스크|140000|0.04
TM|도요타|266000|0.03
SONY|소니|35000|0.04
TSM|TSMC|238000|0.04
BABA|알리바바|126000|0.05
PDD|핀둬둬|168000|0.06
JD|징둥닷컴|49000|0.05
BIDU|바이두|126000|0.05
NIO|니오|8400|0.08
LI|리오토|35000|0.07
MUFG|미쓰비시UFJ|21000|0.03
SHEL|쉘|91000|0.03
AZN|아스트라제네카|119000|0.03
HSBC|HSBC|77000|0.03
UL|유니레버|77000|0.02
BP|BP|56000|0.03
TTE|토탈에너지스|84000|0.03
LVMUY|LVMH|168000|0.04
SNY|사노피|77000|0.03
NTDOY|닌텐도|105000|0.05
HMC|혼다|35000|0.03
SE|씨|224000|0.06
BHP|BHP|77000|0.03
RIO|리오틴토|105000|0.03
TCEHY|텐센트|84000|0.04
INFY|인포시스|25000|0.04
WIT|위프로|6300|0.04
VALE|발레|17000|0.04
ITUB|이타우우니방쿠|9800|0.04
NU|누뱅크|19000|0.06
MELI|메르카도리브레|2800000|0.04
GME|게임스탑|35000|0.09
AMC|AMC엔터테인먼트|4200|0.10
CPNG|쿠팡|35000|0.05
BYDDY|BYD|84000|0.05
SPCX|스페이스X|180000|0.08`;

/* 보조 안내 문구 (코드 옆에 표시) */
const notes={SPCX:"비상장 · 게임용 시세"};

const parseRaw=(raw,market)=>raw.trim().split("\n").map(line=>{
 const [id,name,price,vol]=line.split("|");
 return {id,name,price:Number(price),vol:Number(vol),market};
});
const initialStocks=[...parseRaw(domesticRaw,"국내"),...parseRaw(foreignRaw,"해외")];
/* 로고 도메인 (없거나 불러오지 못하면 글자 배지로 표시) */
const domains={
 "005930":"samsung.com","000660":"skhynix.com","373220":"lgensol.com","207940":"samsungbiologics.com",
 "005380":"hyundai.com","000270":"kia.com","005490":"posco-inc.com","035420":"navercorp.com",
 "035720":"kakaocorp.com","051910":"lgchem.com","006400":"samsungsdi.com","028260":"samsung.com",
 "105560":"kbfg.com","055550":"shinhan.com","086790":"hanafn.com","032830":"samsunglife.com",
 "012330":"mobis.co.kr","066570":"lg.com","003550":"lg.co.kr","015760":"kepco.co.kr",
 "017670":"sktelecom.com","030200":"kt.com","096770":"skinnovation.com","010130":"koreazinc.co.kr",
 "034730":"sk.com","000810":"samsungfire.com","316140":"woorifg.com","138040":"meritz.co.kr",
 "012450":"hanwhaaerospace.com","042660":"hanwhaocean.com","010140":"samsungheavy.com",
 "000720":"hdec.co.kr","047050":"poscointl.com","018260":"samsungsds.com",
 "034020":"doosanenerbility.com","086520":"ecopro.co.kr","293490":"kakaogames.com",
 "259960":"krafton.com","036570":"ncsoft.com","251270":"netmarble.com","352820":"hybecorp.com",
 "041510":"smtown.com","051900":"lghnh.com",
 AAPL:"apple.com",MSFT:"microsoft.com",NVDA:"nvidia.com",AMZN:"amazon.com",GOOGL:"abc.xyz",
 META:"meta.com",TSLA:"tesla.com",NFLX:"netflix.com",AMD:"amd.com",INTC:"intel.com",
 CRM:"salesforce.com",ADBE:"adobe.com",CSCO:"cisco.com",IBM:"ibm.com",ORCL:"oracle.com",
 UBER:"uber.com",ABNB:"airbnb.com",SPOT:"spotify.com",PLTR:"palantir.com",COIN:"coinbase.com",
 SNOW:"snowflake.com",RIVN:"rivian.com",SMCI:"supermicro.com",HOOD:"robinhood.com",
 RBLX:"roblox.com",GME:"gamestop.com",AMC:"amctheatres.com",CPNG:"coupang.com",
 BYDDY:"byd.com",SPCX:"spacex.com",JPM:"jpmorganchase.com",V:"visa.com",MA:"mastercard.com",
 "BRK.B":"berkshirehathaway.com",JNJ:"jnj.com",PFE:"pfizer.com",LLY:"lilly.com",
 XOM:"exxonmobil.com",PG:"pg.com",HD:"homedepot.com",LMT:"lockheedmartin.com",
 UNH:"unitedhealthgroup.com",WMT:"walmart.com",COST:"costco.com",KO:"coca-colacompany.com",
 PEP:"pepsico.com",MCD:"mcdonalds.com",SBUX:"starbucks.com",NKE:"nike.com",DIS:"disney.com",
 BA:"boeing.com",F:"ford.com",GM:"gm.com",TM:"toyota.com",SONY:"sony.com",ASML:"asml.com",
 SAP:"sap.com",TSM:"tsmc.com",BABA:"alibabagroup.com",NVO:"novonordisk.com",
 AZN:"astrazeneca.com",SHEL:"shell.com",HSBC:"hsbc.com",SQ:"block.xyz",PYPL:"paypal.com"
};

const logoHTML=s=>{
 const hue=[...s.id].reduce((a,c)=>a+c.charCodeAt(0),0)%360;
 const letters=/[A-Za-z]/.test(s.id)?s.id.replace(/[^A-Za-z]/g,"").slice(0,3).toUpperCase():s.name.slice(0,2);
 const bg=`background:hsl(${hue} 50% 40%)`;
 const d=domains[s.id];
 if(!d)return `<span class="logo-wrap"><span class="logo-fb" style="${bg}">${letters}</span></span>`;
 return `<span class="logo-wrap"><img class="logo" alt="" loading="lazy" src="https://www.google.com/s2/favicons?domain=${d}&sz=64" onerror="this.style.display='none';this.nextElementSibling.style.display='inline-flex'"><span class="logo-fb" style="${bg};display:none">${letters}</span></span>`;
};

