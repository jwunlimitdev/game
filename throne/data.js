/* 쓰론폴 데이터
 * [확인됨] 제공된 Thronefall 보충 자료의 수치
 * [임시]   밸런스를 맞추기 위해 임의로 정한 값. 실제 게임과 다르며 나중에 교체해야 함
 */
const GRID = 7;
const CASTLE = 24;          // 중앙 칸 (건설 불가)
const CASTLE_HP = 30;       // [임시]
const START_GOLD = 10;      // [임시]
const WIN_DAY = 10;         // [임시]
const ENEMY_DMG = 3;        // [임시] 침입한 적 1명이 주는 피해
const SOLDIER_COST = 5;     // [임시]
const MINE_BASE = 6;        // [확인됨] 금광 최초 수입, 이후 밤마다 1골드씩 감소

// lv: 레벨별 정보. up = 해당 레벨로 올리는 데 드는 골드, inc = 낮마다 수입(골드)
const BLD = {
  house: {
    n: '주택', i: '🏠', build: 2, st: '확인됨',
    lv: [ { hp: 20, inc: 1 }, { hp: 30, inc: 2, up: 2 } ]
  },
  mill: {
    n: '제분소', i: '⚙️', build: 3, st: '확인됨',
    lv: [ { hp: 30, inc: 1 }, { hp: 50, inc: 2, up: 4 }, { hp: 80, inc: 6, up: 6 } ]
  },
  mine: {
    n: '금광', i: '⛏️', build: 5, st: '확인됨',
    lv: [ { hp: 20 } ]
  },
  barracks: {
    n: '병영', i: '🏹', build: 4, st: '일부 확인됨',
    lv: [ { hp: 30, cap: 2 }, { hp: 40, cap: 3, up: 8 }, { hp: 50, cap: 4, up: 16 } ] // cap [임시]
  },
  tower: {
    n: '방어탑', i: '🗼', build: 3, st: '일부 확인됨',
    lv: [ { hp: 30, dmg: 1 }, { hp: 40, dmg: 2, up: 5 }, { hp: 50, dmg: 3, up: 15 } ] // hp, dmg [임시]
  }
};
