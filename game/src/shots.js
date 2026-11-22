// shots.js — staged screenshot scenes for the entry's screenshots.
// ?shot=cover|lasers|alarm|title (with an optional &seed=) freezes the
// game in a composed moment so each screenshot is a real render of the
// game's own code: the thief mid-room, cones sweeping, the loot glowing,
// the alarm meter live. Nothing here is composited or edited in.

import { TILE, ALARM } from './config.js';
import { tileCenter } from './level.js';

export function shotName() {
  const params = new URLSearchParams(window.location.search);
  return params.get('shot');
}

export function shotSeed() {
  const params = new URLSearchParams(window.location.search);
  const seed = Number.parseInt(params.get('seed') || '1', 10);
  return Number.isFinite(seed) ? seed : 1;
}

// Pose the world for a screenshot, then freeze the clock (main.js stops
// advancing time for shot scenes so the render is deterministic).
export function stageShot(game, name) {
  const { level, player, guards, cameras } = game;
  game.screen = 'playing';
  game.timeLeft = 187; // 3:07 on the clock reads well in the HUD
  game.haul = 1500;
  game.alarm = 18;
  game.objective = 'Grab $8,000 of loot, then reach the getaway van.';
  // One gold bar + one diamond already pocketed for the cover's haul bar.
  level.loot[1].taken = true; // gold
  level.loot[3].taken = true; // diamond
  player.coins = 2;

  if (name === 'cover') {
    // The thief crosses the gallery floor: a guard cone sweeps just
    // ahead, a camera cone crosses from the right, the vault glows
    // top-right with the Star, the alarm meter reads low.
    player.x = 560;
    player.y = 470;
    player.angle = Math.PI / 2;
    guards[0].x = 420;
    guards[0].y = 380;
    guards[0].angle = Math.PI / 4;
    guards[0].suspicion = 0.45;
    guards[0].state = 'suspicious';
    guards[1].x = 760;
    guards[1].y = 300;
    guards[1].angle = Math.PI * 0.75;
    guards[2].x = 1080;
    guards[2].y = 560;
    guards[2].angle = -Math.PI / 2;
    guards[3].x = 1060;
    guards[3].y = 300;
    guards[3].angle = Math.PI;
    cameras[0].angle = Math.PI / 2 + 0.5;
    cameras[1].angle = Math.PI - 0.4;
    cameras[3].angle = Math.PI / 2;
  } else if (name === 'lasers') {
    // Mid-vault approach: the thief times the pulsing laser grid while
    // a camera sweeps overhead and a guard patrols the corridor.
    player.x = 1020;
    player.y = 340;
    player.angle = Math.PI / 2;
    game.haul = 5500;
    level.loot[0].taken = true; // the Star is pocketed
    guards[2].x = 1060;
    guards[2].y = 620;
    guards[2].angle = -Math.PI / 2;
    guards[3].x = 1000;
    guards[3].y = 420;
    guards[3].angle = Math.PI / 2;
    cameras[1].angle = Math.PI + 0.3;
    cameras[3].angle = Math.PI / 2 + 0.6;
    game.alarm = 34;
  } else if (name === 'alarm') {
    // Lockdown: the alarm is at 82%, a guard sprints at the thief,
    // a camera has the thief dead in its cone.
    game.alarm = 82;
    game.haul = 7000;
    level.loot[0].taken = true;
    player.x = 640;
    player.y = 560;
    player.angle = -Math.PI / 2;
    guards[0].x = 640;
    guards[0].y = 430;
    guards[0].angle = Math.PI / 2;
    guards[0].state = 'chase';
    guards[0].suspicion = 1;
    guards[1].x = 780;
    guards[1].y = 480;
    guards[1].angle = Math.PI * 0.9;
    guards[1].state = 'chase';
    guards[1].suspicion = 1;
    cameras[0].angle = Math.PI / 2 + 0.2;
    cameras[0].seeing = true;
    game.objective = 'LOCKDOWN! Reach the getaway van — now!';
  } else if (name === 'title') {
    game.screen = 'title';
    // The title panel sits over a live gallery: guards on patrol,
    // cones sweeping, the Star glowing in the vault.
    player.x = 200;
    player.y = 620;
    player.angle = -Math.PI / 2;
    guards[1].x = 640;
    guards[1].y = 260;
    guards[1].angle = Math.PI / 2;
    cameras[0].angle = Math.PI / 2 - 0.4;
  }
  // Recompute the haul from the staged loot so the HUD is consistent.
  game.haul = level.loot.filter((item) => item.taken)
    .reduce((sum, item) => sum + item.value, 0);
}
