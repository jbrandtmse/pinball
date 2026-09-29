// Integration tests: real physical shots through the full machine + rules.
// Balls are launched from the flipper hitting zone at angles known to reach each
// shot, so these verify the devices and rules cooperate with actual ball motion.
import { Machine } from '../src/game/machine.js';
import { Game } from '../src/game/rules.js';
import { DMDController } from '../src/display/dmd.js';

let passed = 0, failed = 0;
function check(cond, msg) { if (cond) passed++; else { failed++; console.log('  FAIL:', msg); } }

function setup() {
  const m = new Machine();
  const dmd = new DMDController();
  const g = new Game(m, { dmd });
  const run = (sec, dt = 1 / 120, until) => {
    for (let t = 0; t < sec; t += dt) { m.update(dt); g.update(dt); dmd.update(dt); if (until && until()) return true; }
    return false;
  };
  g.pressStart(); run(1.0);
  // plunge softly-ish to put the ball in play, then grab it
  const ball = () => m.world.balls.find(b => b.mode === 'pf');
  return { m, g, run, ball };
}
// Fire the (single) playfield ball from the left flipper zone at `deg` (0 = straight up, + = right)
function fire(T, deg, speed = 190, from = [7.6, 37.0]) {
  let b = T.m.world.balls.find(b => b.mode === 'pf');
  if (!b) { T.run(3, 1 / 120, () => !!T.m.world.balls.find(b => b.mode === 'pf')); b = T.m.world.balls.find(b => b.mode === 'pf'); }
  b.x = from[0]; b.y = from[1];
  const r = deg * Math.PI / 180;
  b.vx = Math.sin(r) * speed; b.vy = -Math.cos(r) * speed;
  T.g.launchDetected();
  return b;
}
const sweep = (T, center, fn) => {
  for (const d of [0, -1, 1, -2, 2, -3, 3]) { if (fn(center + d)) return true; }
  return false;
};

// 1) Laser grid -> door -> physical vault lock
{
  const T = setup();
  const p = T.g.p;
  let hits = 0;
  for (let i = 0; i < 12 && !T.m.dropsDown.every(Boolean); i++) {
    fire(T, [-1, 0, 2][i % 3]);
    T.run(1.2);
    hits++;
  }
  check(T.m.dropsDown.every(Boolean), `physical shots knock down the laser grid (${hits} shots)`);
  check(p.lockLit && T.m.doorOpen, 'lock lit and vault door opens for the first lock');
  const locked = sweep(T, 1, (deg) => { fire(T, deg); return T.run(2.0, 1 / 120, () => p.locks >= 1); });
  check(p.locks === 1, 'physical vault shot locks a ball');
  T.run(4.5);
  check(T.m.heldCount('vault') === 0 && T.m.world.balls.some(b => b.mode === 'pf'), 'vault kicks the ball back into play');
  check(!T.m.doorOpen && T.m.dropsDown.every(d => !d), 'door closed and laser grid reset after lock');
}

// 2) Multiball start launches real balls through the shooter lane
{
  const T = setup();
  const p = T.g.p;
  p.locks = 2; p.lockLit = true; p.doorHits = 0; p.doorHitsNeeded = 0;
  T.m.dropAll(); T.m.openDoor();
  sweep(T, 1, (deg) => { fire(T, deg); return T.run(2.0, 1 / 120, () => !!T.g.mb); });
  check(!!T.g.mb, 'third physical lock starts vault multiball');
  T.run(6);
  if (process.argv.includes('-v')) console.log(T.m.world.balls.map(b => `${b.mode} ${b.x.toFixed(1)},${b.y.toFixed(1)} v${Math.hypot(b.vx, b.vy).toFixed(0)}`), 'queue', T.m.serveQueue, T.m.autoLaunchPending, 'trough', T.m.trough);
  const onField = T.m.world.balls.filter(b => b.mode === 'pf' || b.mode === 'path').length;
  check(onField >= 2, `multiball balls are physically in play (${onField} on the field)`);
  // any ball waiting in the shooter lane gets auto-launched within a second
  const waiting = T.m.world.balls.find(b => b.mode === 'pf' && b.x > 18.8 && b.y > 40);
  let minY = waiting ? waiting.y : 0;
  if (waiting) T.run(1.0, 1 / 120, () => { minY = Math.min(minY, waiting.y); return false; });
  check(!waiting || minY < 30, `auto-launch fires balls waiting in the shooter lane (min y ${minY.toFixed(1)})`);
}

// 3) Hideout: physical shot opens job select, VUK returns the ball via the wireform
{
  const T = setup();
  let got = false;
  for (const deg of [23, 22, 24, 21, 25]) {
    fire(T, deg);
    if (T.run(2.0, 1 / 120, () => T.g.state === 'jobselect' || T.m.heldCount('hideout') > 0)) { got = true; break; }
  }
  check(got, 'physical shot reaches the hideout scoop');
  T.run(1.0);
  check(T.g.state === 'jobselect', 'hideout starts job selection');
  T.g.pressStart();
  let returned = T.run(4, 1 / 120, () => T.m.world.balls.some(b => b.mode === 'path' && b.path && b.path.id === 'rampR'));
  check(returned, 'up-kicker delivers the ball onto the right wireform');
  returned = T.run(3, 1 / 120, () => T.m.world.balls.some(b => b.mode === 'pf' && b.x > 14.5 && b.y > 30));
  check(returned, 'wireform drops the ball into the right inlane');
}

// 4) Ramps: physical ramp shots register and return to the inlanes
{
  const T = setup();
  let madeR = false, madeL = false;
  for (const deg of [10, 9, 11, 8, 12]) { fire(T, deg); if (T.run(2.5, 1 / 120, () => T.g.p.ramps > 0)) { madeR = true; break; } }
  check(madeR, 'left flipper makes the GETAWAY ramp');
  T.run(2);
  const before = T.g.p.ramps;
  for (const deg of [-26, -25, -27, -24, -28]) { fire(T, deg, 190, [18.55 - 7.6, 37.0]); if (T.run(2.5, 1 / 120, () => T.g.p.ramps > before)) { madeL = true; break; } }
  check(madeL, 'right flipper makes the SKYWAY ramp');
}

console.log(`integration: ${passed} checks passed, ${failed} failed`);
process.exit(failed ? 1 : 0);
