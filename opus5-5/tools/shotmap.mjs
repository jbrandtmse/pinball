// Shot map: roll a ball down an inlane onto a flipper and flip at varying times.
// Reports the first significant target each timing reaches.
import { buildWorld } from '../src/table/build.js';
import { PHYS } from '../src/sim/physics.js';
import fs from 'fs';
import { dumpGeometry } from './dumpgeom.mjs';

const TARGETS = new Set(['orbitL', 'orbitR', 'rampLEnter', 'rampREnter', 'rampLMade', 'rampRMade', 'drop1', 'drop2', 'drop3',
  'vaultDoor', 'hideoutCap', 'vaultCap', 'pop1', 'pop2', 'pop3', 'laneK', 'laneE', 'laneY', 'spinner']);

export function shoot(side, flipAt, opts = {}) {
  const { world, h } = buildWorld();
  const left = side === 'L';
  const f = h.flippers[left ? 'flipL' : 'flipR'];
  const b = world.addBall(left ? 2.8 : 15.75, 30.8);
  b.vy = opts.v0 ?? 60;
  if (opts.cradle) { f.angle = f.up; f.pressed = true; b.x = opts.cx; b.y = opts.cy; b.vy = 0; }
  const hits = [];
  const pts = [];
  let t = 0, first = null;
  const T = opts.secs ?? 2.5;
  while (t < T) {
    if (opts.cradle) { if (t >= opts.releaseAt && t < flipAt) f.pressed = false; else if (t >= flipAt && t < flipAt + 0.25) f.pressed = true; else if (t >= flipAt + 0.25) f.pressed = false; }
    else f.pressed = t >= flipAt && t < flipAt + 0.3;
    world.step(); t += PHYS.dt;
    if (b.mode === 'pf' && (!pts.length || Math.hypot(pts[pts.length - 1][0] - b.x, pts[pts.length - 1][1] - b.y) > 0.15)) pts.push([b.x, b.y]);
    for (const e of world.drainEvents()) {
      const id = e.type === 'switch' && e.on ? e.id : (e.type === 'hit' || e.type === 'kick') ? e.id : e.type === 'drain' ? 'DRAIN' : null;
      if (!id) continue;
      if (hits[hits.length - 1] !== id) hits.push(id);
      if (!first && (TARGETS.has(id) || id === 'DRAIN')) {
        if ((id === 'orbitL' || id === 'orbitR') && e.vy > 0) continue;
        first = id;
      }
    }
    if (first && !opts.full) break;
    if (b.mode === 'gone') break;
  }
  return { first: first || '-', hits, pts, speed: 0 };
}

if (process.argv[1].endsWith('shotmap.mjs')) {
  const side = process.argv[2] || 'L';
  const traces = [];
  const colors = { orbitL: [255, 200, 0], orbitR: [255, 120, 0], rampLEnter: [255, 60, 60], rampREnter: [255, 60, 160], rampLMade: [255, 0, 0], rampRMade: [255, 0, 120],
    drop1: [0, 255, 255], drop2: [0, 200, 255], drop3: [0, 150, 255], vaultDoor: [255, 255, 255], hideoutCap: [0, 255, 0], pop1: [200, 100, 255], pop2: [200, 100, 255], pop3: [200, 100, 255] };
  const tally = {};
  for (let ft = 0.02; ft <= 0.62; ft += 0.01) {
    const r = shoot(side, ft);
    tally[r.first] = (tally[r.first] || 0) + 1;
    console.log(side, ft.toFixed(2), r.first.padEnd(11), r.hits.slice(0, 6).join(' '));
    if (process.argv[3]) traces.push({ pts: r.pts, color: colors[r.first] || [120, 120, 120], end: true });
  }
  console.log(tally);
  if (process.argv[3]) {
    const { world } = buildWorld();
    fs.writeFileSync(process.argv[3], JSON.stringify(dumpGeometry(world, { traces })));
  }
}
