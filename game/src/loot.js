// loot.js — the haul: gold bars, diamonds, the Meridian Star, plus the
// laser grids that guard the vault approach. Loot is grabbed by walking
// over it (E is not needed); the Star needs a 2.5 s channel standing
// inside the vault, exposed, which is the heist's riskiest moment.

import { TILE, PLAYER, LASER, ALARM } from './config.js';
import { distToSegment } from './level.js';

export function lootTotal(level) {
  return level.loot.reduce((sum, item) => sum + item.value, 0);
}

export function haulValue(level) {
  return level.loot.filter((item) => item.taken).reduce((sum, item) => sum + item.value, 0);
}

// Returns { picked: item|null, starProgress: 0..1 }.
export function updateLoot(level, player, dt, now, sfx) {
  let picked = null;
  let starProgress = 0;
  for (const item of level.loot) {
    if (item.taken) continue;
    const cx = (item.col + 0.5) * TILE;
    const cy = (item.row + 0.5) * TILE;
    const d = Math.hypot(player.x - cx, player.y - cy);
    if (item.kind === 'star') {
      if (d < 44) {
        item.channel = (item.channel || 0) + dt / PLAYER.starSeconds;
        starProgress = Math.min(1, item.channel);
        if (item.channel >= 1) {
          item.taken = true;
          picked = item;
          if (sfx) sfx('star');
        }
      } else {
        item.channel = 0;
      }
    } else if (d < 30) {
      item.taken = true;
      picked = item;
      if (sfx) sfx(item.kind === 'diamond' ? 'diamond' : 'pickup');
    }
  }
  return { picked, starProgress };
}

export function makeLasers(level) {
  return level.lasers.map((def, i) => ({
    id: i,
    x1: def.x1 * TILE,
    y1: def.y1 * TILE,
    x2: def.x2 * TILE,
    y2: def.y2 * TILE,
    onFor: def.onFor,
    offFor: def.offFor,
    offset: def.offset,
    cooldown: 0,
    tripped: 0,
    on: true,
  }));
}

// Pulsing beams: on for a while, off for a while. Crossing a live beam
// trips the alarm; crossing while it is dark is free. Returns alarm
// points added this frame.
export function updateLasers(lasers, player, dt, now, disabledUntil, sfx) {
  let alarmGain = 0;
  for (const beam of lasers) {
    const cycle = beam.onFor + beam.offFor;
    const t = (now + beam.offset) % cycle;
    beam.on = t < beam.onFor && now >= disabledUntil;
    if (beam.cooldown > 0) beam.cooldown -= dt;
    if (beam.tripped > 0) beam.tripped -= dt;
    if (!beam.on || beam.cooldown > 0) continue;
    const d = distToSegment(player.x, player.y, beam.x1, beam.y1, beam.x2, beam.y2);
    if (d < PLAYER.radius + 3) {
      beam.cooldown = LASER.tripCooldown;
      beam.tripped = 0.8;
      alarmGain += LASER.tripAlarm;
      if (sfx) sfx('laser');
    }
  }
  return alarmGain;
}
