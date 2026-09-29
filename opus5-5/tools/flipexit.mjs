// Exit angle/speed of a dead ball resting at distance r along the left flipper.
import { buildWorld } from '../src/table/build.js';
import { PHYS } from '../src/sim/physics.js';
for (const r of [0.8, 1.1, 1.4, 1.7, 2.0, 2.3, 2.6]) for (const roll of [0, 30]) {
  const { world, h } = buildWorld();
  const f = h.flippers.flipL;
  const o = {};
  // place ball on the upper surface at distance r
  const ca = Math.cos(f.angle), sa = Math.sin(f.angle);
  let bx = f.px + ca * r, by = f.py + sa * r;
  const b = world.addBall(bx, by - 2);
  // move ball down along normal until touching
  for (let k = 0; k < 400; k++) { const d = f.distance(b.x, b.y, o); if (d <= PHYS.ballR + 0.001) break; b.x -= o.nx * (d - PHYS.ballR) * 0.5; b.y -= o.ny * (d - PHYS.ballR) * 0.5; }
  b.vx = ca * roll; b.vy = sa * roll;
  f.pressed = true;
  let sep = null, t = 0;
  for (; t < 0.08; t += PHYS.dt) { world.step(); world.drainEvents(); const d = f.distance(b.x, b.y, o); if (!sep && d > PHYS.ballR + 0.05) sep = { t, ang: f.angle }; }
  const ang = Math.atan2(b.vx, -b.vy) * 180 / Math.PI;
  console.log(`r=${r} roll=${roll} -> speed ${Math.hypot(b.vx, b.vy).toFixed(0)} dir ${ang.toFixed(1)}deg (0=up,+right) sep ${sep ? (sep.t*1000).toFixed(1)+'ms @' + (sep.ang*180/Math.PI).toFixed(0) : '-'}`);
}
