import { buildWorld } from '../src/table/build.js';
import { PHYS } from '../src/sim/physics.js';
// For each launch speed, record which switches the ball hits in the first 6 s.
for (let v = 44; v <= 250; v += (v < 60 ? 0.5 : v < 90 ? 3 : 15)) {
  const { world, h } = buildWorld();
  const b = world.addBall(19.525, 43.4 - PHYS.ballR - 0.01);
  b.vy = -v;
  const seq = [];
  let t = 0;
  while (t < 6) {
    world.step(); t += PHYS.dt;
    for (const e of world.drainEvents()) {
      if (e.type === 'switch' && e.on) { if (seq[seq.length - 1] !== e.id) seq.push(e.id); }
      if (e.type === 'hit' || e.type === 'kick') { if (seq[seq.length - 1] !== e.id) seq.push(e.id); }
      if (e.type === 'drain') seq.push('DRAIN');
    }
    if (b.mode === 'gone') break;
  }
  console.log(String(v).padStart(4), seq.slice(0, 12).join(' '), `| end ${b.x.toFixed(1)},${b.y.toFixed(1)} ${b.mode}`);
}
