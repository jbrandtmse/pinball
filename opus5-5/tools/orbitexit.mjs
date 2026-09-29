import { buildWorld } from '../src/table/build.js';
import { PHYS } from '../src/sim/physics.js';
for (const vx0 of [-15, 0, 15]) for (const v of [40, 80, 120, 160, 200, 250]) {
  const { world } = buildWorld();
  const b = world.addBall(0.7, 12); b.vy = v; b.vx = vx0;
  let t = 0, res = 'timeout', hits = [];
  while (t < 3) {
    world.step(); t += PHYS.dt;
    for (const e of world.drainEvents()) if ((e.type === 'switch' && e.on) || e.type === 'kick') hits.push(e.id);
    if (b.mode === 'pf' && b.y > 31) { res = `x=${b.x.toFixed(2)} v=(${b.vx.toFixed(0)},${b.vy.toFixed(0)})`; break; }
  }
  console.log(`vx0=${vx0} v=${v}: ${res} ${hits.filter(h=>h!=='spinnerLine').join(' ')}`);
}
