// Auto-launch / inlane feed study. For each launch speed: how long until the ball
// reaches a flipper and on which side, and whether a player who raises the
// flipper as the ball comes down the inlane can catch (cradle) it.
// Usage: node tools/autolaunch.mjs [speed...]
//   env RET=<orbit-return exit cap in/s>, RAMP=<ramp exit cap in/s>
import { buildWorld } from '../src/table/build.js';
import { PHYS, MATERIALS } from '../src/sim/physics.js';
// OLDRUBBER=1 restores the original slippery flipper rubber for comparison
if (process.env.OLDRUBBER) { MATERIALS.flipper.fric = 0.28; MATERIALS.flipper.grip = 2 / 7; }

const speeds = process.argv.slice(2).map(Number);
function setup() {
  const { world, h } = buildWorld();
  if (process.env.RET) for (const id of ['returnL', 'returnR']) world.paths[id].maxExitSpeed = Number(process.env.RET);
  if (process.env.RAMP) for (const id of ['rampL', 'rampR']) world.paths[id].maxExitSpeed = Number(process.env.RAMP);
  return { world, h };
}

// Launch a ball into play and report the first flipper it meets.
function trial(start, hold) {
  const { world, h } = setup();
  const b = world.addBall(start.x, start.y);
  if (start.path) world.putOnPath(b, world.paths[start.path], start.s ?? 0.02, start.vs);
  else { b.vx = start.vx || 0; b.vy = start.vy; }
  let first = null, raised = null;
  for (let t = 0; t < 6; t += PHYS.dt) {
    // a player watching the feed raises the flipper on the side the ball rolls down
    if (hold && !raised && b.mode === 'pf' && b.vy > 0 && b.y > 29 && b.y < 34 && (b.x < 3.6 || (b.x > 14.9 && b.x < 18.6))) {
      raised = b.x < 9 ? h.flippers.flipL : h.flippers.flipR; raised.pressed = true;
    }
    world.step(); world.drainEvents();
    if (!first && b.mode === 'pf' && b.contactFlipper) first = { t, v: Math.hypot(b.vx, b.vy), f: b.contactFlipper.id };
    if (first && t - first.t > 1.5) break;
    if (b.mode === 'gone') break;
  }
  const cradled = b.mode === 'pf' && Math.hypot(b.vx, b.vy) < 3 && b.y > 35;
  return { first, cradled };
}

function report(label, mk) {
  const side = {}; let caught = 0, tSum = 0, vSum = 0, hits = 0;
  const N = 20;
  for (let k = 0; k < N; k++) {
    const down = trial(mk(), false);
    if (down.first) { hits++; tSum += down.first.t; vSum += down.first.v; side[down.first.f] = (side[down.first.f] || 0) + 1; }
    else side.none = (side.none || 0) + 1;
    if (trial(mk(), true).cradled) caught++;
  }
  console.log(`${label}: first flipper ${JSON.stringify(side)} after ${(tSum / Math.max(1, hits)).toFixed(2)}s at ${(vSum / Math.max(1, hits)).toFixed(0)} in/s; caught by raising flipper ${caught}/${N}`);
}

for (const v of speeds.length ? speeds : [215]) {
  report(`launch ${v}`, () => ({ x: 19.525, y: 42.86, vy: -v * (0.97 + Math.random() * 0.06) }));
}
report('left ramp', () => ({ x: 3.15, y: 21, path: 'rampL', vs: 150 + Math.random() * 60 }));
report('right ramp', () => ({ x: 10.55, y: 21, path: 'rampR', vs: 150 + Math.random() * 60 }));
