// cameras.js — wall-mounted security cameras with sweeping cones.
// A camera pans back and forth; while the thief is inside its cone and
// in line of sight, the alarm climbs. A hack disables every camera
// (and laser) for a while — the trade is time spent standing exposed
// at a terminal.

import { TILE, CAMERA, ALARM } from './config.js';
import { hasLineOfSight } from './level.js';

export function makeCameras(level) {
  return level.cameras.map((def, i) => ({
    id: i,
    x: (def.col + 0.5) * TILE,
    y: (def.row + 0.5) * TILE,
    baseAngle: def.baseAngle,
    phase: def.phase,
    angle: def.baseAngle,
    sweep: 0,
    seeing: false,
    disabledUntil: 0,
  }));
}

function angleDiff(a, b) {
  let d = a - b;
  while (d > Math.PI) d -= Math.PI * 2;
  while (d < -Math.PI) d += Math.PI * 2;
  return d;
}

export function updateCameras(level, cameras, player, dt, now, disabledUntil, sfx) {
  let alarmGain = 0;
  for (const cam of cameras) {
    cam.sweep = Math.sin(now * CAMERA.sweepSpeed + cam.phase) * CAMERA.sweepHalfAngle;
    cam.angle = cam.baseAngle + cam.sweep;
    cam.seeing = false;
    if (now < disabledUntil) continue;
    const dx = player.x - cam.x;
    const dy = player.y - cam.y;
    const dist = Math.hypot(dx, dy);
    if (dist > CAMERA.viewDistance) continue;
    const toPlayer = Math.atan2(dy, dx);
    if (Math.abs(angleDiff(toPlayer, cam.angle)) > CAMERA.viewHalfAngle) continue;
    if (!hasLineOfSight(level, cam.x, cam.y, player.x, player.y)) continue;
    cam.seeing = true;
    alarmGain += CAMERA.alarmPerSecond * dt;
    if (sfx) sfx('cameraSpot');
  }
  return alarmGain;
}

export function camerasDisabledUntil(now) {
  return now + CAMERA.disabledSeconds;
}
