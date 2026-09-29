// Cradle shot map: settle the ball on a raised flipper, drop it, re-flip after `delay`.
import { buildWorld } from '../src/table/build.js';
import { PHYS } from '../src/sim/physics.js';
import { dumpGeometry } from './dumpgeom.mjs';
import fs from 'fs';
const TARGETS = ['orbitL', 'orbitR', 'rampLEnter', 'rampREnter', 'drop1', 'drop2', 'drop3', 'vaultDoor', 'vaultCap', 'hideoutCap', 'pop1', 'pop2', 'pop3', 'laneK', 'laneE', 'laneY'];
export function cradleShot(side, delay, opts = {}) {
  const { world, h } = buildWorld();
  const left = side === 'L';
  const f = h.flippers[left ? 'flipL' : 'flipR'];
  const b = world.addBall(left ? 2.8 : 15.75, 30.8); b.vy = 40;
  f.pressed = true;
  for (let t = 0; t < 3.5; t += PHYS.dt) world.step();
  world.drainEvents();
  const cradle = [b.x, b.y, b.vx, b.vy];
  f.pressed = false;
  let t = 0, first = null, maxV = 0; const hits = [], pts = [];
  while (t < 3) {
    f.pressed = t >= delay && t < delay + 0.35;
    world.step(); t += PHYS.dt;
    if (t > delay && t < delay + 0.2) maxV = Math.max(maxV, Math.hypot(b.vx, b.vy));
    if (b.mode === 'pf' && (!pts.length || Math.hypot(pts[pts.length - 1][0] - b.x, pts[pts.length - 1][1] - b.y) > 0.15)) pts.push([b.x, b.y]);
    for (const e of world.drainEvents()) {
      const id = e.type === 'switch' && e.on ? e.id : (e.type === 'hit' || e.type === 'kick') ? e.id : e.type === 'drain' ? 'DRAIN' : null;
      if (!id) continue;
      if (hits[hits.length - 1] !== id) hits.push(id);
      if (!first && (TARGETS.includes(id) || id === 'DRAIN')) { if ((id === 'orbitL' || id === 'orbitR') && e.vy > 0) continue; first = id; }
    }
    if (first && !opts.full) break;
    if (b.mode === 'gone') break;
  }
  return { first: first || '-', hits, pts, cradle, maxV };
}
if (process.argv[1].endsWith('cradlemap.mjs')) {
  const side = process.argv[2] || 'L';
  const traces = [], tally = {};
  const col = { orbitL: [255, 200, 0], orbitR: [255, 120, 0], rampLEnter: [255, 60, 60], rampREnter: [255, 60, 200], drop1: [0, 255, 255], drop2: [0, 200, 255], drop3: [0, 150, 255], vaultDoor: [255, 255, 255], hideoutCap: [0, 255, 0], pop1: [180, 100, 255], pop2: [180, 100, 255], pop3: [180, 100, 255] };
  let c;
  for (let d = 0.3; d <= 1.0; d += 0.01) {
    const r = cradleShot(side, d);
    c = r.cradle;
    tally[r.first] = (tally[r.first] || 0) + 1;
    console.log(side, d.toFixed(3), r.first.padEnd(11), 'v' + r.maxV.toFixed(0), r.hits.slice(0, 5).join(' '));
    traces.push({ pts: r.pts.slice(0, 400), color: col[r.first] || [110, 110, 110], end: false });
  }
  console.log('cradle at', c.map(v => v.toFixed(2)).join(','), tally);
  if (process.argv[3]) fs.writeFileSync(process.argv[3], JSON.stringify(dumpGeometry(buildWorld().world, { traces })));
}
