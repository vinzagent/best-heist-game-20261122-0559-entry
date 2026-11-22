// guards.js — patrol guards with vision cones, suspicion, chase and
// search. A guard walks its waypoint loop, pauses, and looks around.
// Seeing the thief fills suspicion; at full suspicion it chases, and
// if it loses the thief it searches the last-seen spot, then recovers.

import { TILE, GUARD, ALARM } from './config.js';
import { tileCenter, hasLineOfSight, collideCircle } from './level.js';

export const GUARD_STATE = {
  PATROL: 'patrol',
  SUSPICIOUS: 'suspicious',
  CHASE: 'chase',
  SEARCH: 'search',
};

export function makeGuards(level) {
  return level.guards.map((def, i) => {
    const start = tileCenter(def.waypoints[0][0], def.waypoints[0][1]);
    return {
      id: i,
      x: start.x,
      y: start.y,
      angle: Math.PI / 2,
      waypoints: def.waypoints,
      waypointIndex: 1 % def.waypoints.length,
      pause: def.pause,
      pauseTimer: 0,
      lookTimer: 0,
      lookFrom: 0,
      lookTo: 0,
      state: GUARD_STATE.PATROL,
      suspicion: 0,
      searchTimer: 0,
      lastSeen: null,
      speed: GUARD.patrolSpeed,
      stepPhase: i * 1.7,
      alertFlash: 0,
    };
  });
}

function angleDiff(a, b) {
  let d = a - b;
  while (d > Math.PI) d -= Math.PI * 2;
  while (d < -Math.PI) d += Math.PI * 2;
  return d;
}

function turnToward(guard, target, maxStep) {
  const d = angleDiff(target, guard.angle);
  if (Math.abs(d) <= maxStep) {
    guard.angle = target;
  } else {
    guard.angle += Math.sign(d) * maxStep;
  }
}

// Can this guard see the thief right now? Cone + range + line of sight.
// Hiding behind a crate or case breaks the cone even at close range.
export function guardSees(level, guard, player, alarmLevel) {
  const dx = player.x - guard.x;
  const dy = player.y - guard.y;
  const dist = Math.hypot(dx, dy);
  const range = guard.state === GUARD_STATE.CHASE ? GUARD.chaseViewDistance : GUARD.viewDistance;
  if (dist > range) return false;
  if (dist > 30) {
    const toPlayer = Math.atan2(dy, dx);
    if (Math.abs(angleDiff(toPlayer, guard.angle)) > GUARD.viewHalfAngle) return false;
  }
  return hasLineOfSight(level, guard.x, guard.y, player.x, player.y);
}

export function updateGuards(level, guards, player, dt, alarm, onCaught, sfx) {
  const lockdown = alarm >= ALARM.lockdownAt;
  for (const g of guards) {
    g.stepPhase += dt * (g.state === GUARD_STATE.CHASE ? 11 : 6);
    if (g.alertFlash > 0) g.alertFlash -= dt;
    const sees = guardSees(level, g, player, alarm);

    if (sees) {
      g.suspicion = Math.min(1, g.suspicion + GUARD.suspicionPerSecond * dt);
      g.lastSeen = { x: player.x, y: player.y };
      if (g.suspicion >= 1 && g.state !== GUARD_STATE.CHASE) {
        g.state = GUARD_STATE.CHASE;
        g.alertFlash = 0.6;
        if (sfx) sfx('alert');
      }
    } else {
      g.suspicion = Math.max(0, g.suspicion - GUARD.suspicionDecay * dt);
      if (g.state === GUARD_STATE.SUSPICIOUS && g.suspicion <= 0.05) {
        g.state = GUARD_STATE.PATROL;
      }
    }

    if (g.state === GUARD_STATE.CHASE) {
      // Sprint at the last-seen spot; give up after a few seconds blind.
      const target = g.lastSeen || { x: player.x, y: player.y };
      const dx = target.x - g.x;
      const dy = target.y - g.y;
      const dist = Math.hypot(dx, dy);
      const speed = lockdown ? GUARD.chaseSpeed * 1.12 : GUARD.chaseSpeed;
      if (dist > 4) {
        const nx = g.x + (dx / dist) * speed * dt;
        const ny = g.y + (dy / dist) * speed * dt;
        g.x = nx;
        g.y = ny;
        collideCircle(level, g, GUARD.radius);
        turnToward(g, Math.atan2(dy, dx), 6 * dt);
      }
      if (!sees) {
        g.searchTimer += dt;
        if (g.searchTimer > 3.5) {
          g.state = GUARD_STATE.SEARCH;
          g.searchTimer = 0;
        }
      } else {
        g.searchTimer = 0;
      }
      const dPlayer = Math.hypot(player.x - g.x, player.y - g.y);
      if (dPlayer < GUARD.catchDistance) onCaught(g);
    } else if (g.state === GUARD_STATE.SEARCH) {
      // Stand at the last-seen spot and look around, then give up.
      g.searchTimer += dt;
      g.angle += dt * 1.4;
      if (g.searchTimer > GUARD.searchSeconds) {
        g.state = GUARD_STATE.PATROL;
        g.suspicion = 0;
        g.searchTimer = 0;
      }
      if (sees && g.suspicion > 0.35) {
        g.state = GUARD_STATE.SUSPICIOUS;
      }
    } else {
      // Patrol: walk to the next waypoint, pause, and look around.
      const wp = tileCenter(g.waypoints[g.waypointIndex][0], g.waypoints[g.waypointIndex][1]);
      const dx = wp.x - g.x;
      const dy = wp.y - g.y;
      const dist = Math.hypot(dx, dy);
      const speed = g.state === GUARD_STATE.SUSPICIOUS
        ? GUARD.suspiciousSpeed
        : GUARD.patrolSpeed;
      if (g.pauseTimer > 0) {
        g.pauseTimer -= dt;
        // Look around while paused: sweep the cone side to side.
        g.lookTimer += dt;
        const sweep = Math.sin((g.lookTimer / g.pause) * Math.PI * 2) * 0.9;
        g.angle = g.lookFrom + sweep;
      } else if (dist < 6) {
        g.waypointIndex = (g.waypointIndex + 1) % g.waypoints.length;
        g.pauseTimer = g.pause;
        g.lookTimer = 0;
        g.lookFrom = g.angle;
      } else {
        g.x += (dx / dist) * speed * dt;
        g.y += (dy / dist) * speed * dt;
        collideCircle(level, g, GUARD.radius);
        turnToward(g, Math.atan2(dy, dx), 5 * dt);
      }
      if (sees && g.suspicion > 0.35 && g.state === GUARD_STATE.PATROL) {
        g.state = GUARD_STATE.SUSPICIOUS;
        if (sfx) sfx('suspicious');
      }
    }
  }
}

// A guard investigates a noise: walk to the spot, look around, resume.
export function lureGuards(guards, x, y) {
  for (const g of guards) {
    if (g.state === GUARD_STATE.CHASE) continue;
    const d = Math.hypot(g.x - x, g.y - y);
    if (d < 260) {
      g.state = GUARD_STATE.SEARCH;
      g.lastSeen = { x, y };
      g.searchTimer = -2.0; // walk there first, then look around
      g.suspicion = Math.max(g.suspicion, 0.4);
    }
  }
}
