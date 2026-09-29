// Launch balls from a flipper hitting zone across a sweep of angles; report first target.
import { buildWorld } from '../src/table/build.js';
import { PHYS } from '../src/sim/physics.js';
import { dumpGeometry } from './dumpgeom.mjs';
import fs from 'fs';
const TARGETS = ['orbitL', 'orbitR', 'rampLEnter', 'rampREnter', 'drop1', 'drop2', 'drop3', 'vaultDoor', 'vaultCap', 'hideoutCap', 'pop1', 'pop2', 'pop3', 'laneK', 'laneE', 'laneY'];
const side = process.argv[2] || 'L';
const speed = Number(process.argv[3] || 180);
const [ox, oy] = side === 'L' ? [7.6, 37.0] : [18.55 - 7.6, 37.0];
const traces = []; let out = [];
for (let a = -40; a <= 40; a += 1) {
  const { world } = buildWorld();
  const b = world.addBall(ox, oy);
  const r = a * Math.PI / 180; b.vx = Math.sin(r) * speed; b.vy = -Math.cos(r) * speed;
  let first = null, t = 0; const pts = [], hits = [];
  while (t < 2 && !first) {
    world.step(); t += PHYS.dt;
    if (b.mode === 'pf') pts.push([b.x, b.y]);
    for (const e of world.drainEvents()) {
      const id = e.type === 'switch' && e.on ? e.id : (e.type === 'hit' || e.type === 'kick') ? e.id : e.type === 'thud' ? 'wall' : e.type === 'drain' ? 'DRAIN' : null;
      if (!id) continue;
      hits.push(id);
      if (TARGETS.includes(id)) { if ((id === 'orbitL' || id === 'orbitR') && e.vy > 0) continue; first = id; }
    }
  }
  out.push(`${a}:${first || ('x' + (hits[0] || ''))}`);
  traces.push({ pts: pts.filter((_, i) => i % 20 === 0), color: first ? [0, 220, 120] : [200, 60, 60] });
}
console.log(out.join('  '));
if (process.argv[4]) fs.writeFileSync(process.argv[4], JSON.stringify(dumpGeometry(buildWorld().world, { traces })));
