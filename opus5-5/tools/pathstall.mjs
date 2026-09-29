// Drop a dead ball at every point along every ramp/wireform: does it always leave the path?
import { buildWorld } from '../src/table/build.js';
import { PHYS } from '../src/sim/physics.js';
const { world } = buildWorld();
let stuck = 0, total = 0;
for (const id of Object.keys(world.paths)) {
  const P = world.paths[id];
  for (let s = 0.05; s < P.length; s += 0.5) {
    const { world: w } = buildWorld();
    const b = w.addBall(0, 0);
    w.putOnPath(b, w.paths[id], s, 0);
    let t = 0;
    for (; t < 6 && b.mode === 'path'; t += PHYS.dt) { w.step(); w.drainEvents(); }
    total++;
    if (b.mode === 'path') { stuck++; console.log(`STUCK on ${id} at s=${s.toFixed(2)} (${b.x.toFixed(2)},${b.y.toFixed(2)},${b.z.toFixed(2)})`); }
  }
}
console.log(`${stuck}/${total} stall points`);
