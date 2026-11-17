// Dawnwell tuning: field size, keeper movement, wave pacing and the palette.
// Everything the other modules need to agree on lives here, so balancing the
// game means editing this one file and nothing else.

export const FIELD = { width: 960, height: 600 };

export const KEEPER = {
  width: 92,
  height: 26,
  radius: 14,
  speed: 460,
  dashSpeed: 980,
  dashSeconds: 0.16,
  dashCooldown: 1.1,
  startLives: 3,
};

export const WAVE = {
  seconds: 18,
  countToWin: 5,
  firstSpawnEvery: 0.82,
  spawnShrinkPerWave: 0.09,
  fallBoostPerWave: 34,
};

export const SCORE = {
  drop: 40,
  sun: 120,
  waveClearBonus: 150,
  dawnTargetBonus: 500,
};

export const BEST_KEY = 'dawnwell-best-score-v1';
export const STEP = 1 / 60;

export const PALETTE = {
  skyTop: '#101736',
  skyBottom: '#2a1e4f',
  hillFar: '#241d4d',
  hillNear: '#191238',
  ground: '#120d2b',
  wellGlow: '#ffd76a',
  drop: '#8fe3ff',
  dropCore: '#eafcff',
  sun: '#ffc94d',
  shard: '#ff5d73',
  shardDark: '#a11f38',
  keeper: '#ffb347',
  keeperDark: '#8a4b12',
  shield: '#7dffce',
  ink: '#f4f1ff',
  dim: '#b9b3d9',
  accent: '#ffd76a',
  danger: '#ff7a8a',
};
