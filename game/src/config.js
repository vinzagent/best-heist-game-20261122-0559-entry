// config.js — tuning constants for The Gilded Vault.
// One place for every number the rest of the game reads, so balancing
// is a single-file edit and the level code stays about layout, not math.

export const TILE = 40; // px per map tile
export const VIEW_W = 1280; // logical canvas width
export const VIEW_H = 800; // logical canvas height

export const TIME_LIMIT = 240; // seconds on the clock
export const HAUL_TARGET = 8000; // dollars needed before the getaway unlocks

export const PLAYER = {
  sneakSpeed: 155,
  runSpeed: 245,
  radius: 13,
  noiseRun: 150, // px: guards hear running this far away
  noiseWalk: 0,
  coinCount: 3,
  coinThrowRange: 320,
  coinLureRadius: 230,
  hackSeconds: 3.0, // hold E at a terminal this long to kill cameras + lasers
  starSeconds: 2.5, // channel time to lift the Meridian Star
};

export const GUARD = {
  patrolSpeed: 62,
  suspiciousSpeed: 88,
  chaseSpeed: 148,
  radius: 14,
  viewDistance: 235,
  viewHalfAngle: 0.46, // radians either side of facing (~53 deg cone)
  chaseViewDistance: 290,
  suspicionPerSecond: 1.15, // fills 0..1 while the thief is in the cone
  suspicionDecay: 0.35,
  catchDistance: 26,
  searchSeconds: 5.0,
  pauseSeconds: 1.6,
  lookSeconds: 2.2,
};

export const CAMERA = {
  sweepHalfAngle: 0.85, // radians of sweep either side of base angle
  sweepSpeed: 0.55, // rad per second
  viewDistance: 250,
  viewHalfAngle: 0.30,
  alarmPerSecond: 26, // alarm points per second while the thief is seen
  disabledSeconds: 25, // how long a hack keeps cameras + lasers off
};

export const LASER = {
  tripAlarm: 30, // alarm points added when a beam is crossed
  tripCooldown: 2.5, // seconds before the same grid can trip again
};

export const ALARM = {
  decayPerSecond: 2.0,
  suspiciousAt: 40,
  lockdownAt: 70,
  guardSeePerSecond: 34, // alarm points per second a guard sees the thief
  cameraSeePerSecond: 26,
};

export const LOOT = {
  goldValue: 500,
  diamondValue: 1500,
  starValue: 5000,
};

export const SCORE = {
  timeBonusPerSecond: 25, // dollars of score per second left on the clock
  alarmPenaltyPerPoint: 15, // score lost per alarm point at escape
};

// Palette: night bank — deep navy marble, brass gold, velvet red.
export const COLORS = {
  floorA: '#232742',
  floorB: '#1d2138',
  carpet: '#3d212b',
  carpetEdge: '#8a6d2f',
  wall: '#12142a',
  wallTop: '#2e3358',
  gold: '#f2c14e',
  goldDim: '#a8842f',
  lootGlow: '#ffd75e',
  guardSuit: '#2b2f45',
  guardSkin: '#e8b98a',
  coneCalm: 'rgba(242, 193, 78, 0.30)',
  coneAlert: 'rgba(255, 64, 64, 0.38)',
  coneCamera: 'rgba(255, 92, 138, 0.30)',
  laser: '#ff2e4d',
  player: '#101018',
  playerTrim: '#f2c14e',
  hudBg: 'rgba(8, 10, 24, 0.82)',
  text: '#f4ead2',
  textDim: '#9a94b8',
  danger: '#ff4d5e',
  ok: '#7ee787',
};
