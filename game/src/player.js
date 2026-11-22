// player.js — the thief: sneak/run movement, coin tosses, hacking.
// Running is fast but loud; sneaking is slow and silent. A tossed coin
// lands with a ring that pulls nearby guards to investigate it.

import { TILE, PLAYER, GUARD } from './config.js';
import { collideCircle } from './level.js';
import { lureGuards } from './guards.js';

export function makePlayer(level) {
  return {
    x: level.playerStart.x,
    y: level.playerStart.y,
    angle: -Math.PI / 2, // facing up, into the bank
    moving: false,
    running: false,
    coins: PLAYER.coinCount,
    stepPhase: 0,
    lastStepAt: 0,
    hackProgress: 0,
    hackingTerminal: null,
  };
}

export function updatePlayer(level, player, input, dt, now, guards, sfx) {
  let dx = 0;
  let dy = 0;
  if (input.up) dy -= 1;
  if (input.down) dy += 1;
  if (input.left) dx -= 1;
  if (input.right) dx += 1;
  const len = Math.hypot(dx, dy);
  player.moving = len > 0;
  player.running = player.moving && input.run;
  if (player.moving) {
    dx /= len;
    dy /= len;
    const speed = player.running ? PLAYER.runSpeed : PLAYER.sneakSpeed;
    player.x += dx * speed * dt;
    player.y += dy * speed * dt;
    collideCircle(level, player, PLAYER.radius);
    player.angle = Math.atan2(dy, dx);
    player.stepPhase += dt * (player.running ? 11 : 7);
    if (player.running && now - player.lastStepAt > 0.28) {
      player.lastStepAt = now;
      if (sfx) sfx('step');
      // Running is loud: guards in earshot come to look.
      for (const g of guards) {
        const d = Math.hypot(g.x - player.x, g.y - player.y);
        if (d < PLAYER.noiseRun && g.state !== 'chase') {
          g.suspicion = Math.min(1, g.suspicion + 0.25);
          if (g.suspicion > 0.35 && g.state === 'patrol') g.state = 'suspicious';
        }
      }
    }
  }
  return player;
}

// A coin toss: the coin arcs toward the aim point (mouse, or facing
// direction) and rings on landing, luring guards that can hear it.
export function throwCoin(state, player, tx, ty, sfx) {
  if (player.coins <= 0) return null;
  player.coins -= 1;
  const dx = tx - player.x;
  const dy = ty - player.y;
  const dist = Math.hypot(dx, dy);
  const range = Math.min(dist, PLAYER.coinThrowRange);
  const nx = player.x + (dx / (dist || 1)) * range;
  const ny = player.y + (dy / (dist || 1)) * range;
  const coin = { x: nx, y: ny, t: 0, rang: false };
  state.coins.push(coin);
  if (sfx) sfx('coinThrow');
  return coin;
}

export function updateCoins(state, guards, dt, sfx) {
  for (const coin of state.coins) {
    coin.t += dt;
    if (!coin.rang && coin.t > 0.45) {
      coin.rang = true;
      if (sfx) sfx('coinRing');
      lureGuards(guards, coin.x, coin.y);
    }
  }
  state.coins = state.coins.filter((coin) => coin.t < 6);
}
