// audio.js — every sound is synthesized with WebAudio; the game ships
// no audio files. A tiny helper builds short blips, sweeps and noise
// bursts, and the game calls play(name) for each event.

export function makeAudio() {
  const state = { ctx: null, muted: false, master: null, ambient: null };
  return state;
}

function ensure(state) {
  if (state.ctx) return state.ctx;
  try {
    const AC = window.AudioContext || window.webkitAudioContext;
    if (!AC) return null;
    state.ctx = new AC();
    state.master = state.ctx.createGain();
    state.master.gain.value = 0.5;
    state.master.connect(state.ctx.destination);
  } catch {
    return null;
  }
  return state.ctx;
}

function tone(state, freq, dur, type, vol, slideTo) {
  const ctx = ensure(state);
  if (!ctx || state.muted) return;
  const t0 = ctx.currentTime;
  const osc = ctx.createOscillator();
  const gain = ctx.createGain();
  osc.type = type || 'sine';
  osc.frequency.setValueAtTime(freq, t0);
  if (slideTo) osc.frequency.exponentialRampToValueAtTime(Math.max(20, slideTo), t0 + dur);
  gain.gain.setValueAtTime(vol || 0.15, t0);
  gain.gain.exponentialRampToValueAtTime(0.001, t0 + dur);
  osc.connect(gain);
  gain.connect(state.master);
  osc.start(t0);
  osc.stop(t0 + dur + 0.02);
}

function noise(state, dur, vol, filterFreq) {
  const ctx = ensure(state);
  if (!ctx || state.muted) return;
  const t0 = ctx.currentTime;
  const len = Math.max(1, Math.floor(ctx.sampleRate * dur));
  const buffer = ctx.createBuffer(1, len, ctx.sampleRate);
  const data = buffer.getChannelData(0);
  for (let i = 0; i < len; i += 1) data[i] = (Math.random() * 2 - 1) * (1 - i / len);
  const src = ctx.createBufferSource();
  src.buffer = buffer;
  const filter = ctx.createBiquadFilter();
  filter.type = 'lowpass';
  filter.frequency.value = filterFreq || 1200;
  const gain = ctx.createGain();
  gain.gain.setValueAtTime(vol || 0.12, t0);
  gain.gain.exponentialRampToValueAtTime(0.001, t0 + dur);
  src.connect(filter);
  filter.connect(gain);
  gain.connect(state.master);
  src.start(t0);
}

export function playSound(state, name) {
  if (!state.ctx) return; // audio starts on the first user gesture
  if (state.muted) return;
  switch (name) {
    case 'step':
      noise(state, 0.07, 0.05, 500);
      break;
    case 'pickup':
      tone(state, 880, 0.12, 'sine', 0.16);
      tone(state, 1318, 0.18, 'sine', 0.12);
      break;
    case 'diamond':
      tone(state, 1046, 0.14, 'triangle', 0.18);
      tone(state, 1568, 0.2, 'triangle', 0.14);
      tone(state, 2093, 0.26, 'sine', 0.1);
      break;
    case 'star':
      [523, 659, 784, 1046, 1318].forEach((f, i) => {
        setTimeout(() => tone(state, f, 0.22, 'triangle', 0.16), i * 70);
      });
      break;
    case 'alert':
      tone(state, 220, 0.5, 'sawtooth', 0.14, 440);
      tone(state, 233, 0.5, 'sawtooth', 0.1, 466);
      break;
    case 'suspicious':
      tone(state, 330, 0.25, 'square', 0.07, 262);
      break;
    case 'laser':
      tone(state, 1200, 0.3, 'sawtooth', 0.14, 200);
      noise(state, 0.2, 0.1, 3000);
      break;
    case 'cameraSpot':
      tone(state, 980, 0.1, 'square', 0.05);
      break;
    case 'coinThrow':
      noise(state, 0.12, 0.08, 2500);
      break;
    case 'coinRing':
      tone(state, 2093, 0.35, 'sine', 0.12, 1568);
      tone(state, 2637, 0.3, 'sine', 0.07);
      break;
    case 'hack':
      tone(state, 660, 0.08, 'square', 0.07);
      tone(state, 990, 0.1, 'square', 0.07);
      break;
    case 'hackDone':
      [440, 660, 880].forEach((f, i) => {
        setTimeout(() => tone(state, f, 0.15, 'triangle', 0.14), i * 80);
      });
      break;
    case 'win':
      [523, 659, 784, 1046, 784, 1046, 1318].forEach((f, i) => {
        setTimeout(() => tone(state, f, 0.25, 'triangle', 0.16), i * 110);
      });
      break;
    case 'caught':
      tone(state, 392, 0.7, 'sawtooth', 0.16, 98);
      break;
    case 'unlock':
      tone(state, 784, 0.2, 'triangle', 0.14);
      tone(state, 1174, 0.3, 'triangle', 0.12);
      break;
    default:
      break;
  }
}

// Low room tone while playing: a soft filtered hum that never loops a file.
export function startAmbient(state) {
  const ctx = ensure(state);
  if (!ctx || state.ambient) return;
  const osc = ctx.createOscillator();
  osc.type = 'sine';
  osc.frequency.value = 55;
  const gain = ctx.createGain();
  gain.gain.value = 0.035;
  const lfo = ctx.createOscillator();
  lfo.frequency.value = 0.07;
  const lfoGain = ctx.createGain();
  lfoGain.gain.value = 0.015;
  lfo.connect(lfoGain);
  lfoGain.connect(gain.gain);
  osc.connect(gain);
  gain.connect(state.master);
  osc.start();
  lfo.start();
  state.ambient = { osc, lfo };
}

export function unlockAudio(state) {
  const ctx = ensure(state);
  if (ctx && ctx.state === 'suspended') ctx.resume();
  startAmbient(state);
}

export function toggleMute(state) {
  state.muted = !state.muted;
  if (state.master) state.master.gain.value = state.muted ? 0 : 0.5;
  return state.muted;
}
