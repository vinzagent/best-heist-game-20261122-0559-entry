// main.js — The Gilded Vault: game state, the loop, and the wiring.
// One thief, one bank, one night: sneak past four guards and four
// cameras, time the laser grids, lift $8,000 of loot, and slip out to
// the getaway van before the clock runs out or the alarm hits lockdown
// and a guard lays a hand on you.

import { VIEW_W, VIEW_H, TILE, TIME_LIMIT, HAUL_TARGET, ALARM, PLAYER, SCORE } from './config.js';
import { buildLevel, hasLineOfSight } from './level.js';
import { makeGuards, updateGuards } from './guards.js';
import { makeCameras, updateCameras, camerasDisabledUntil } from './cameras.js';
import { updateLoot, makeLasers, updateLasers, haulValue } from './loot.js';
import { makePlayer, updatePlayer, throwCoin, updateCoins } from './player.js';
import { makeInput, attachInput, clickSteer } from './input.js';
import { makeAudio, playSound, unlockAudio, toggleMute, startAmbient } from './audio.js';
import { render } from './render.js';
import { shotName, stageShot } from './shots.js';

const canvas = document.getElementById('game');
const ctx = canvas.getContext('2d');
const statusEl = document.getElementById('status');

function fitCanvas() {
  const scale = Math.min(window.innerWidth / VIEW_W, window.innerHeight / VIEW_H);
  canvas.width = Math.round(VIEW_W * scale);
  canvas.height = Math.round(VIEW_H * scale);
  ctx.setTransform(scale, 0, 0, scale, 0, 0);
}

function toLogical(clientX, clientY, rect) {
  const scale = Math.min(rect.width / VIEW_W, rect.height / VIEW_H);
  // Undo the renderer's world transform (64 px offset, 0.9 scale) so
  // clicks and coin tosses land where the player points in the world.
  return {
    x: (clientX / scale - 64) / 0.9,
    y: (clientY / scale - 64) / 0.9,
  };
}

function rankTitle(score, haul, timeLeft, alarm) {
  if (score >= 14000) return 'Legend of the Night';
  if (score >= 11000) return 'Master Thief';
  if (score >= 8000) return 'Professional';
  if (score >= 5000) return 'Smooth Operator';
  return 'Lucky Amateur';
}

function newGame() {
  const level = buildLevel();
  return {
    level,
    player: makePlayer(level),
    guards: makeGuards(level),
    cameras: makeCameras(level),
    lasers: makeLasers(level),
    coins: [],
    now: 0,
    timeLeft: TIME_LIMIT,
    alarm: 0,
    haul: 0,
    disabledUntil: 0,
    screen: 'title',
    objective: 'Grab $8,000 of loot, then reach the getaway van.',
    score: 0,
    rankTitle: '',
    starProgress: 0,
    caughtBy: null,
    statusTimer: 0,
  };
}

let game = newGame();
const input = makeInput();
const audio = makeAudio();
// Read-only handle for play-testing and debugging (no secrets, no state
// the game itself needs to hide).
window.__gildedVault = { get state() { return game; } };
attachInput(input, canvas, toLogical);
fitCanvas();
window.addEventListener('resize', fitCanvas);

const shot = shotName();
if (shot) {
  stageShot(game, shot);
  game.screen = shot === 'title' ? 'title' : 'playing';
  // Freeze the staged scene: render it a few times so gradients and
  // the canvas settle, then stop. No timer, no audio in shot mode.
  game.now = 2.5;
  render(ctx, game);
  render(ctx, game);
} else {
  let last = performance.now();
  let firstFrame = true;

  function announce(text) {
    if (statusEl) statusEl.textContent = text;
  }

  function frame(nowMs) {
    requestAnimationFrame(frame);
    const dt = Math.min(0.05, (nowMs - last) / 1000 || 0.016);
    last = nowMs;

    if (input.pressed.mute) {
      input.pressed.mute = false;
      unlockAudio(audio);
      const muted = toggleMute(audio);
      announce(muted ? 'Sound muted' : 'Sound on');
    }
    if (input.pressed.restart) {
      input.pressed.restart = false;
      game = newGame();
      game.screen = 'playing';
      announce('New heist started');
    }
    if (input.pressed.pause) {
      input.pressed.pause = false;
      if (game.screen === 'playing') game.screen = 'paused';
      else if (game.screen === 'paused') game.screen = 'playing';
    }

    if (game.screen === 'title') {
      // Any key or click starts the night.
      const anyKey = input.up || input.down || input.left || input.right
        || input.interact || input.pressed.interact || input.clicked;
      if (anyKey || input.pressed.restart) {
        unlockAudio(audio);
        startAmbient(audio);
        game.screen = 'playing';
        announce('Heist started. Grab $8,000 of loot, then reach the getaway van.');
      }
      input.clicked = false;
      input.pressed.interact = false;
      render(ctx, game);
      return;
    }

    if (game.screen !== 'playing') {
      render(ctx, game);
      return;
    }

    game.now += dt;
    game.timeLeft -= dt;
    if (game.timeLeft <= 0) {
      game.timeLeft = 0;
      game.screen = 'timeout';
      playSound(audio, 'caught');
      announce('Dawn breaks. The heist is over.');
      render(ctx, game);
      return;
    }

    // Click-to-walk steering, cancelled by any arrow key.
    if (input.up || input.down || input.left || input.right) {
      input.clickX = null;
      input.clickY = null;
    } else {
      clickSteer(input, game.player);
    }
    updatePlayer(game.level, game.player, input, dt, game.now, game.guards, (n) => playSound(audio, n));

    // Coin toss toward the mouse.
    if (input.clicked) {
      input.clicked = false;
      if (game.player.coins > 0) {
        throwCoin(game, game.player, input.mouseX, input.mouseY, (n) => playSound(audio, n));
      }
    }
    updateCoins(game, game.guards, dt, (n) => playSound(audio, n));

    // Hacking: hold E beside a terminal to kill cameras + lasers.
    const term = game.level.terminals[0];
    const nearTerm = Math.hypot(game.player.x - term.x, game.player.y - term.y) < 52;
    if (nearTerm && input.interact && game.now >= game.disabledUntil) {
      term.progress += dt / PLAYER.hackSeconds;
      if (term.progress >= 1) {
        term.progress = 0;
        game.disabledUntil = camerasDisabledUntil(game.now);
        playSound(audio, 'hackDone');
        announce('Security systems offline for 25 seconds.');
      } else if (Math.random() < dt * 2) {
        playSound(audio, 'hack');
      }
    } else {
      term.progress = Math.max(0, term.progress - dt * 2);
    }

    // The Star channel, loot pickups, alarm from guards/cameras/lasers.
    const lootResult = updateLoot(game.level, game.player, dt, game.now, (n) => playSound(audio, n));
    game.starProgress = lootResult.starProgress;
    game.haul = haulValue(game.level);

    let alarmGain = 0;
    updateGuards(game.level, game.guards, game.player, dt, game.alarm, (g) => {
      game.screen = 'caught';
      game.caughtBy = g;
      playSound(audio, 'caught');
      announce('Busted! A guard caught you.');
    }, (n) => playSound(audio, n));
    if (game.screen !== 'playing') {
      render(ctx, game);
      return;
    }
    // Alarm rises while any guard or camera has eyes on the thief.
    for (const g of game.guards) {
      const dx = game.player.x - g.x;
      const dy = game.player.y - g.y;
      const dist = Math.hypot(dx, dy);
      if (dist < 235 && hasLineOfSight(game.level, g.x, g.y, game.player.x, game.player.y)) {
        const toPlayer = Math.atan2(dy, dx);
        let diff = toPlayer - g.angle;
        while (diff > Math.PI) diff -= Math.PI * 2;
        while (diff < -Math.PI) diff += Math.PI * 2;
        if (Math.abs(diff) < 0.46 || dist < 30) alarmGain += ALARM.guardSeePerSecond * dt;
      }
    }
    alarmGain += updateCameras(game.level, game.cameras, game.player, dt, game.now, game.disabledUntil, (n) => playSound(audio, n));
    alarmGain += updateLasers(game.lasers, game.player, dt, game.now, game.disabledUntil, (n) => playSound(audio, n));
    game.alarm = Math.max(0, Math.min(100, game.alarm + alarmGain - ALARM.decayPerSecond * dt));

    // Objective line follows the haul.
    if (game.haul >= HAUL_TARGET) {
      game.objective = 'Haul complete — reach the GETAWAY VAN (bottom left)!';
      const gw = game.level.getaway;
      if (
        game.player.x > gw.x - gw.w / 2 - 10 &&
        game.player.x < gw.x + gw.w / 2 + 10 &&
        game.player.y > gw.y - 30
      ) {
        game.screen = 'win';
        game.score = Math.round(
          game.haul + game.timeLeft * SCORE.timeBonusPerSecond - game.alarm * SCORE.alarmPenaltyPerPoint,
        );
        game.rankTitle = rankTitle(game.score, game.haul, game.timeLeft, game.alarm);
        playSound(audio, 'win');
        announce(`Clean getaway! Haul $${game.haul}, score ${game.score}.`);
      }
    } else if (game.alarm >= ALARM.lockdownAt) {
      game.objective = 'LOCKDOWN! The vault is sealed — grab what you can and run!';
    } else {
      game.objective = 'Grab $8,000 of loot, then reach the getaway van.';
    }

    if (firstFrame) {
      firstFrame = false;
      announce('Heist started. Grab $8,000 of loot, then reach the getaway van.');
    }
    render(ctx, game);
  }

  requestAnimationFrame(frame);
}
