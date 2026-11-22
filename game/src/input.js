// input.js — keyboard + mouse, with click-to-walk for mouse players.
// Keys: WASD / arrows move, Shift run, E interact / hack, Q toss coin,
// P pause, R restart, M mute. Clicking sets a walk target; the thief
// walks there until arrival or a key press.

export function makeInput() {
  return {
    up: false,
    down: false,
    left: false,
    right: false,
    run: false,
    interact: false,
    pause: false,
    restart: false,
    mute: false,
    mouseX: 0,
    mouseY: 0,
    clickX: null,
    clickY: null,
    clicked: false,
    pressed: {}, // edge-triggered keys, consumed by the game loop
  };
}

const KEYMAP = {
  KeyW: 'up',
  ArrowUp: 'up',
  KeyS: 'down',
  ArrowDown: 'down',
  KeyA: 'left',
  ArrowLeft: 'left',
  KeyD: 'right',
  ArrowRight: 'right',
  ShiftLeft: 'run',
  ShiftRight: 'run',
  KeyE: 'interact',
  Enter: 'interact', // ENTER starts the heist from the title screen
  KeyP: 'pause',
  KeyR: 'restart',
  KeyM: 'mute',
};

export function attachInput(input, canvas, toLogical) {
  const down = (e) => {
    const field = KEYMAP[e.code];
    if (!field) return;
    if (field === 'pause' || field === 'restart' || field === 'mute') {
      if (!e.repeat) input.pressed[field] = true;
    } else {
      input[field] = true;
      // Edge flag so a quick ENTER tap still starts the heist even if
      // the key is released before the next animation frame runs.
      if (!e.repeat) input.pressed[field] = true;
    }
    if (['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight', 'Space'].includes(e.code)) {
      e.preventDefault();
    }
  };
  const up = (e) => {
    const field = KEYMAP[e.code];
    if (!field) return;
    if (field !== 'pause' && field !== 'restart' && field !== 'mute') {
      input[field] = false;
    }
  };
  window.addEventListener('keydown', down);
  window.addEventListener('keyup', up);
  window.addEventListener('blur', () => {
    input.up = input.down = input.left = input.right = false;
    input.run = false;
    input.interact = false;
  });
  canvas.addEventListener('mousemove', (e) => {
    const rect = canvas.getBoundingClientRect();
    const p = toLogical(e.clientX - rect.left, e.clientY - rect.top, rect);
    input.mouseX = p.x;
    input.mouseY = p.y;
  });
  canvas.addEventListener('mousedown', (e) => {
    const rect = canvas.getBoundingClientRect();
    const p = toLogical(e.clientX - rect.left, e.clientY - rect.top, rect);
    input.mouseX = p.x;
    input.mouseY = p.y;
    input.clickX = p.x;
    input.clickY = p.y;
    input.clicked = true;
  });
  return () => {
    window.removeEventListener('keydown', down);
    window.removeEventListener('keyup', up);
  };
}

// Click-to-walk: steer toward the click target while no arrow key is held.
export function clickSteer(input, player) {
  if (input.clickX === null) return;
  const dx = input.clickX - player.x;
  const dy = input.clickY - player.y;
  if (Math.hypot(dx, dy) < 10) {
    input.clickX = null;
    input.clickY = null;
    return;
  }
  input.up = dy < -6;
  input.down = dy > 6;
  input.left = dx < -6;
  input.right = dx > 6;
}
