// 인형 20종 데이터 (tier 0 일반 / 1 레어 / 2 에픽)
const RAW_DOLLS = [
  ['토끼', '#ffffff', 0], ['곰', '#c98b5a', 0], ['고양이', '#ffb088', 0], ['강아지', '#e6c28c', 0],
  ['펭귄', '#2d3e5c', 0], ['오리', '#ffd166', 0], ['돼지', '#ffb3c6', 0], ['개구리', '#7ed957', 0],
  ['햄스터', '#f2c29b', 1], ['여우', '#ff9a3c', 1], ['판다', '#eeeeee', 1], ['코알라', '#a9b4c2', 1],
  ['사자', '#ffcf5c', 1], ['기린', '#f5d36b', 1], ['공룡', '#6fd3a0', 1],
  ['유니콘', '#ffd6f0', 2], ['드래곤', '#ff5c5c', 2], ['로봇', '#9fb4c7', 2], ['천사', '#fff8c4', 2], ['요정', '#c59bff', 2]
];
const TIER_VALUE = [100, 300, 500];
const TIER_GRIP = [0.55, 0.4, 0.28];
const TIER_R = [22, 25, 28];

const DOLL_TYPES = RAW_DOLLS.map(([name, color, tier]) => ({
  name, color, tier, value: TIER_VALUE[tier], grip: TIER_GRIP[tier], r: TIER_R[tier]
}));

// 인형뽑기 가게 5곳
const SHOPS = [
  { name: '1호점 동네',     cost: 1, grip: 1.0,  minTier: 0, bg: '#2b1b4d', skin: '#ff6fa5' },
  { name: '2호점 놀이터',   cost: 1, grip: 1.1,  minTier: 0, bg: '#1d3b4d', skin: '#6fb8ff' },
  { name: '3호점 시내',     cost: 2, grip: 1.2,  minTier: 1, bg: '#3d2b1d', skin: '#ffb84d' },
  { name: '4호점 쇼핑몰',   cost: 2, grip: 1.35, minTier: 1, bg: '#1d4d2b', skin: '#7ee8a0' },
  { name: '5호점 프리미엄', cost: 3, grip: 1.5,  minTier: 2, bg: '#4d1d3d', skin: '#c59bff' }
];
