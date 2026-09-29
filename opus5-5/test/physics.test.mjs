// Physics regression tests: plunges, orbit returns, inlane feeds, cradles,
// shot reachability, containment at high speed and a stuck-ball soak.
import { buildWorld, plungerSpeed } from '../src/table/build.js';
import { PHYS } from '../src/sim/physics.js';
import { Machine } from '../src/game/machine.js';
import { AutoPlayer } from './autoplayer.mjs';

let passed = 0, failed = 0;
function check(cond, msg) { if (cond) passed++; else { failed++; console.log('  FAIL:', msg); } }

function simBall(x, y, vx, vy, secs, opts = {}) {
  const { world, h } = buildWorld();
  const b = world.addBall(x, y); b.vx = vx; b.vy = vy;
  if (opts.setup) opts.setup(world, h, b);
  const hits = [];
  for (let t = 0; t < secs; t += PHYS.dt) {
    if (opts.each) opts.each(world, h, b, t);
    world.step();
    for (const e of world.drainEvents()) {
      if ((e.type === 'switch' && e.on) || e.type === 'kick' || e.type === 'hit') hits.push({ id: e.id, vy: e.vy });
      if (e.type === 'drain') hits.push({ id: 'DRAIN' });
    }
    if (opts.until && opts.until(b, hits)) break;
    if (b.mode === 'gone') break;
  }
  return { b, hits, ids: hits.map(h => h.id) };
}

// Plunger: soft plunges reach the K-E-Y lanes, full plunges loop the orbit
{
  let lanes = 0, loops = 0;
  for (let p = 0.1; p <= 0.5; p += 0.02) {
    const r = simBall(19.525, 42.86, 0, -plungerSpeed(p), 4, { until: (b, h) => h.some(x => x.id.startsWith('lane')) });
    if (r.ids.some(i => i.startsWith('lane'))) lanes++;
  }
  for (let p = 0.7; p <= 1.0; p += 0.05) {
    const r = simBall(19.525, 42.86, 0, -plungerSpeed(p), 4);
    if (r.ids.includes('returnLGate') && r.ids.includes('inL')) loops++;
  }
  check(lanes >= 4, `soft plunges find the top lanes (${lanes}/21)`);
  check(loops >= 6, `full plunges loop around and feed the left inlane (${loops}/7)`);
}

// Orbit returns always feed the same-side inlane
{
  let ok = 0;
  for (const v of [60, 120, 200, 280]) {
    const L = simBall(0.7, 12, 0, v, 2, { until: (b, h) => h.some(x => x.id === 'inL') });
    const R = simBall(17.85, 12, 0, v, 2, { until: (b, h) => h.some(x => x.id === 'inR') });
    if (L.ids.includes('inL')) ok++;
    if (R.ids.includes('inR')) ok++;
  }
  check(ok === 8, `orbit returns reach inlanes (${ok}/8)`);
}

// Inlane feed rolls onto the flipper and down it (no hop over the bat)
{
  let maxRise = 0;
  const { world } = buildWorld();
  const b = world.addBall(2.8, 30.8); b.vy = 50;
  let prevY = b.y, onFlipper = false;
  for (let t = 0; t < 0.5; t += PHYS.dt) {
    world.step(); world.drainEvents();
    if (b.contactFlipper) onFlipper = true;
    if (b.x >= 8.2) break; // past the bat tip: later bounces are elsewhere
    if (onFlipper) maxRise = Math.max(maxRise, prevY - b.y);
    prevY = Math.max(prevY, b.y);
  }
  check(onFlipper, 'inlane ball reaches the flipper');
  check(maxRise < 0.35, `ball does not bounce up off the flipper (${maxRise.toFixed(2)}")`);
}

// Cradle: a ball fed to a raised flipper comes to rest
{
  const { world, h } = buildWorld();
  h.flippers.flipL.pressed = true;
  const b = world.addBall(2.8, 30.8); b.vy = 40;
  for (let t = 0; t < 4; t += PHYS.dt) { world.step(); world.drainEvents(); }
  check(Math.hypot(b.vx, b.vy) < 2 && b.mode === 'pf' && b.y > 36, `ball cradles on raised left flipper (v=${Math.hypot(b.vx, b.vy).toFixed(2)})`);
}

// Shot reachability: from each flipper's hitting zone, a sweep of angles hits every major shot
{
  const TARGETS = { orbitL: 'orbitL', orbitR: 'orbitR', rampL: 'rampLEnter', rampR: 'rampREnter', vault: 'drop', hideout: 'hideoutCap', pops: 'pop' };
  const found = {};
  for (const [ox, sign] of [[7.6, 1], [18.55 - 7.6, -1]]) {
    for (let a = -40; a <= 40; a += 1) {
      const r = a * Math.PI / 180;
      const res = simBall(ox, 37, Math.sin(r) * 180, -Math.cos(r) * 180, 1.5, {
        until: (b, h) => h.some(x => Object.values(TARGETS).some(tn => x.id.startsWith(tn)) && !(x.id.startsWith('orbit') && x.vy > 0)),
      });
      for (const [name, tn] of Object.entries(TARGETS)) if (res.hits.some(x => x.id.startsWith(tn) && !(x.id.startsWith('orbit') && x.vy > 0))) found[name] = (found[name] || 0) + 1;
    }
  }
  for (const name of Object.keys(TARGETS)) check((found[name] || 0) >= 2, `shot reachable: ${name} (${found[name] || 0} angles)`);
}

// Containment: fast balls in random directions never escape the playfield
{
  let escaped = 0;
  let seed = 12345; const rnd = () => ((seed = (seed * 16807) % 2147483647) / 2147483647);
  for (let i = 0; i < 120; i++) {
    const a = rnd() * Math.PI * 2, v = 150 + rnd() * 350;
    const { b } = simBall(3 + rnd() * 13, 22 + rnd() * 10, Math.cos(a) * v, Math.sin(a) * v, 2);
    if (b.mode === 'pf' && (b.x < -0.1 || b.x > 20.4 || b.y < -0.1 || b.y > 45.5 || Number.isNaN(b.x))) escaped++;
  }
  check(escaped === 0, `no escapes at high speed (${escaped})`);
}

// Soak: bot plays for 20 simulated minutes; count stuck-ball rescues
{
  const m = new Machine();
  const bot = new AutoPlayer(m);
  let rescues = 0, drains = 0;
  const spots = [];
  m.onFx((t, e) => { if (t === 'ballSearch') { rescues++; spots.push(`(${e.x.toFixed(2)},${e.y.toFixed(2)})`); } });
  m.onSwitch((id) => {
    if (id === 'hideout') m.after(0.8, () => m.eject('hideout'));
    if (id === 'vault') m.after(0.8, () => { m.closeDoor(); m.eject('vault'); m.after(1.5, () => m.resetDrops()); });
    if (id.startsWith('drop') && m.dropsDown.every(Boolean)) m.openDoor();
    if (id === 'drain') drains++;
  });
  m.setFlippersEnabled(true);
  const dt = 1 / 120;
  for (let t = 0; t < 1200; t += dt) {
    if (m.ballsInPlay() === 0) m.serveBall();
    bot.update(dt); m.update(dt);
    const live = m.world.balls.filter(b => b.mode !== 'gone').length;
    if (live + m.trough !== m.totalBalls) { check(false, 'ball accounting in soak'); break; }
  }
  check(rescues === 0, `soak: no stuck balls in 20 minutes (${rescues} rescues ${spots.join(' ')}, ${drains} drains)`);
}

console.log(`physics: ${passed} checks passed, ${failed} failed`);
process.exit(failed ? 1 : 0);
