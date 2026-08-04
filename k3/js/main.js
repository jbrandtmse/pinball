// NOVA STRIKE — bootstrap and main loop.

import { makeWorld, stepWorld } from './physics.js';
import { buildTable, PF_W, PF_H } from './table.js';
import { Game } from './rules.js';
import { DMD } from './dmd.js';
import { Renderer } from './art.js';
import { Audio } from './audio.js';
import { Input } from './input.js';
import { HighScores } from './highscore.js';

const world = makeWorld({ gravity: 2100 });
const table = buildTable(world);

const dmd = new DMD(document.getElementById('dmd'));
const audio = new Audio();
const highs = new HighScores(dmd);
const renderer = new Renderer(document.getElementById('pf'), world, table);
const input = new Input();

const io = {
  dmd,
  sfx: (n) => audio.sfx(n),
  music: (s) => { audio.music(s); },
  highs
};
const game = new Game(world, table, io);

// debug/testing handle
window.__nova = { world, table, game, dmd, highs };

let paused = false;
let plungerCharge = 0;

input.on('flipper', ({ side, down }) => {
  audio.ensure();
  if (highs.entering) { if (down) highs.entryKey(side < 0 ? 'left' : 'right'); return; }
  game.flipper(side, down);
  if (down) audio.sfx('flip');
});
input.on('plungerDown', () => { audio.ensure(); plungerCharge = 0.001; });
input.on('plungerUp', () => {
  if (plungerCharge > 0) game.launch(plungerCharge);
  plungerCharge = 0;
});
input.on('nudge', (dir) => game.nudge(dir));
input.on('start', () => {
  audio.ensure();
  if (highs.entering) { highs.entryKey('enter'); return; }
  if (game.state === 'attract' || game.state === 'over') game.startGame();
});
input.on('back', () => { if (highs.entering) highs.entryKey('back'); });
input.on('pause', () => { paused = !paused; dmd.message([paused ? 'PAUSED' : 'GO!', ''], 1, true); });
input.on('mute', () => { audio.ensure(); audio.toggleMute(); });

// plunger charge is visible on the playfield
Object.defineProperty(game, 'plungerCharge', { get: () => plungerCharge });

// fit the cabinet to the viewport
function fit() {
  const scale = Math.min(
    window.innerHeight / (PF_H + 230),
    window.innerWidth / (PF_W + 60)
  );
  document.getElementById('cab').style.zoom = scale;
}
window.addEventListener('resize', fit);
fit();

// main loop — fixed 120 Hz physics steps, render every frame
let last = performance.now();
let acc = 0;
const STEP = 1 / 120;

function frame(now) {
  let dt = (now - last) / 1000;
  last = now;
  dt = Math.min(dt, 0.1);

  if (!paused) {
    if (plungerCharge > 0 && input.plungerHeld) {
      plungerCharge = Math.min(1, plungerCharge + dt * 1.1);
    }
    acc += dt;
    while (acc >= STEP) {
      acc -= STEP;
      stepWorld(world, STEP);
    }
    renderer.fx(world.events.slice());
    game.update(dt);
  }
  renderer.draw(game, dt);
  requestAnimationFrame(frame);
}
requestAnimationFrame(frame);
