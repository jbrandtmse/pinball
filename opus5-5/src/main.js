// MIDNIGHT HEIST — browser entry point: wires physics, rules, display,
// sound and renderer together and runs the frame loop.
import { Machine } from './game/machine.js';
import { Game } from './game/rules.js';
import { DMD, DMDController, DMDRenderer } from './display/dmd.js';
import { TableRenderer } from './render/scene3d.js';
import { Sound } from './audio/sound.js';

const HS_KEY = 'midnightHeist.highScores.v1';
const storage = {
  load() { try { return JSON.parse(localStorage.getItem(HS_KEY)); } catch (e) { return null; } },
  save(v) { try { localStorage.setItem(HS_KEY, JSON.stringify(v)); } catch (e) { /* private mode */ } },
};

const $ = (id) => document.getElementById(id);
const sound = new Sound();
const machine = new Machine();
const dmdCtl = new DMDController(new DMD());
const game = new Game(machine, { dmd: dmdCtl, sound, storage });
machine.onFx((t, e) => sound.fx(t, e));

let renderer;
try {
  renderer = new TableRenderer($('gl'), machine, game);
} catch (err) {
  $('loading').textContent = 'WebGL is required to play MIDNIGHT HEIST. (' + err.message + ')';
  throw err;
}
const dmdRenderer = new DMDRenderer($('dmd'));
const gauge = $('gauge'), gaugeFill = $('gaugeFill');
renderer.onQualityChange = (q) => toast('GRAPHICS: ' + q + ' (auto)');
$('loading').style.display = 'none';

// ------------------------------------------------------------------ input
const KEYS = {
  left: ['ShiftLeft', 'KeyZ', 'ArrowLeft'],
  right: ['ShiftRight', 'Slash', 'ArrowRight'],
  plunger: ['Space', 'Enter', 'ArrowDown', 'NumpadEnter'],
  start: ['Digit1', 'KeyS', 'Numpad1'],
  nudgeL: ['KeyQ'], nudgeR: ['KeyE'], nudgeU: ['KeyW', 'ArrowUp'],
  pause: ['KeyP', 'Escape'], view: ['KeyV'], sound: ['KeyM'], help: ['KeyH', 'F1'], full: ['KeyF'], quality: ['KeyG'],
};
const actionOf = (code) => Object.keys(KEYS).find(k => KEYS[k].includes(code));
const held = new Set();
let paused = false;

function toast(msg) {
  const t = $('toast'); t.textContent = msg; t.classList.add('show');
  clearTimeout(toast.h); toast.h = setTimeout(() => t.classList.remove('show'), 1400);
}
function setHelp(on) { $('help').classList.toggle('show', on); }
function setPaused(on) {
  paused = on; $('paused').classList.toggle('show', on);
  if (sound.ctx) on ? sound.ctx.suspend() : sound.ctx.resume();
  if (on) { machine.setFlipper('left', false); machine.setFlipper('right', false); machine.plungerPull(false); }
}

function press(action, down) {
  switch (action) {
    case 'left': case 'right':
      machine.setFlipper(action, down);
      if (down && ['attract', 'gameover'].includes(game.state)) game.onButton(action, true);
      break;
    case 'plunger':
      if (down && ['attract', 'gameover'].includes(game.state)) { game.pressStart(); break; }
      if (down && (game.state === 'jobselect' || game.state === 'hsentry')) { game.pressStart(); break; }
      if (game.state === 'playing' || !down) machine.plungerPull(down);
      break;
    case 'start': if (down) game.pressStart(); break;
    case 'nudgeL': if (down && game.state === 'playing') machine.nudge(16, -6); break;
    case 'nudgeR': if (down && game.state === 'playing') machine.nudge(-16, -6); break;
    case 'nudgeU': if (down && game.state === 'playing') machine.nudge(0, -20); break;
    case 'pause': if (down) { if ($('help').classList.contains('show')) setHelp(false); else setPaused(!paused); } break;
    case 'view': if (down) toast('VIEW: ' + renderer.cycleView()); break;
    case 'quality': if (down) { renderer.manualQuality = true; toast('GRAPHICS: ' + renderer.cycleQuality()); } break;
    case 'sound': if (down) {
      if (sound.musicOn && sound.enabled) { sound.musicOn = false; toast('MUSIC OFF'); }
      else if (sound.enabled) { sound.setEnabled(false); toast('SOUND OFF'); }
      else { sound.setEnabled(true); sound.musicOn = true; toast('SOUND ON'); }
    } break;
    case 'help': if (down) setHelp(!$('help').classList.contains('show')); break;
    case 'full': if (down) { if (!document.fullscreenElement) document.documentElement.requestFullscreen?.(); else document.exitFullscreen?.(); } break;
  }
}

window.addEventListener('keydown', (e) => {
  sound.unlock();
  const a = actionOf(e.code);
  if (!a) return;
  e.preventDefault();
  if (e.repeat) return;
  if (held.has(e.code)) return;
  held.add(e.code);
  if (paused && a !== 'pause' && a !== 'help' && a !== 'sound' && a !== 'full') return;
  if ($('help').classList.contains('show') && (a === 'start' || a === 'plunger')) setHelp(false);
  press(a, true);
});
window.addEventListener('keyup', (e) => {
  const a = actionOf(e.code);
  if (!a) return;
  e.preventDefault();
  held.delete(e.code);
  // a flipper stays up while any of its keys is still held
  if ((a === 'left' || a === 'right' || a === 'plunger') && KEYS[a].some(k => held.has(k))) return;
  press(a, false);
});
window.addEventListener('blur', () => {
  held.clear(); machine.setFlipper('left', false); machine.setFlipper('right', false); machine.plungerPull(false);
  if (game.state === 'playing') setPaused(true);
});

// Touch: left/right halves flip; bottom-right corner is the plunger; top taps start.
const touchMap = new Map();
function zoneFor(x, y) {
  const w = window.innerWidth, h = window.innerHeight;
  if (y < h * 0.22) return 'start';
  if (x > w * 0.8 && y > h * 0.75) return 'plunger';
  return x < w / 2 ? 'left' : 'right';
}
window.addEventListener('pointerdown', (e) => {
  sound.unlock();
  if (e.target.closest && e.target.closest('button, a, #help')) return;
  if (e.pointerType === 'mouse') return;
  const z = zoneFor(e.clientX, e.clientY);
  touchMap.set(e.pointerId, z);
  press(z, true);
});
const endTouch = (e) => { const z = touchMap.get(e.pointerId); if (z) { touchMap.delete(e.pointerId); press(z, false); } };
window.addEventListener('pointerup', endTouch);
window.addEventListener('pointercancel', endTouch);
$('helpBtn').addEventListener('click', () => setHelp(true));
$('closeHelp').addEventListener('click', () => setHelp(false));

// ------------------------------------------------------------------ loop
let last = performance.now();
function frame(now) {
  const dt = Math.min(0.05, Math.max(0, (now - last) / 1000));
  last = now;
  if (!paused) {
    machine.update(dt);
    game.update(dt);
  }
  dmdCtl.update(paused ? 0 : dt);
  dmdRenderer.render(dmdCtl.d, dt);
  // rolling sounds
  let roll = 0, ramp = 0;
  for (const b of machine.world.balls) {
    if (b.mode === 'pf') roll = Math.max(roll, Math.hypot(b.vx, b.vy));
    else if (b.mode === 'path') ramp = Math.max(ramp, Math.abs(b.vs));
  }
  sound.setRolling(paused ? 0 : roll, paused ? 0 : ramp);
  // plunger power gauge (the green band is the soft "skill shot" zone)
  const pl = machine.world.plunger;
  gauge.classList.toggle('show', pl.pulling || pl.pull > 0);
  gaugeFill.style.height = `calc(${(pl.pull * 100).toFixed(1)}% - 4px)`;
  renderer.render(paused ? 0 : dt);
  requestAnimationFrame(frame);
}
requestAnimationFrame(frame);

// expose for debugging / automated tests
window.MH = { machine, game, renderer, sound, dmdCtl };
