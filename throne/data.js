/* 쓰론폴 고정 데이터 (건물, 기술, 난이도, 승리 조건) */
const CASTLE = 24; // 7x7 지도의 중앙 칸
const BLD = {
  farm:     { n: '농장',   i: '🌾', c: 20 },
  mine:     { n: '광산',   i: '⛏️', c: 25 },
  barracks: { n: '병영',   i: '🏹', c: 30 },
  lab:      { n: '연구소', i: '🧪', c: 40 }
};
const TECH = [
  { n: '무기 단련',  c: 40 },
  { n: '성벽 보강',  c: 80 },
  { n: '채굴 기술',  c: 120 }
];
const DIFF = { easy: { m: 0.7 }, normal: { m: 1 }, hard: { m: 1.4 } };
const WIN = 10;
