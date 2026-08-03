/* ============================================================================
 * RAGNAROK PINBALL — headless table validator
 *
 *   node test/sim.js [suite]
 *
 * Loads util/physics/table into a bare V8 context (no DOM needed) and runs the
 * real simulation to answer the questions screenshots can't:
 *   - does a plunged ball make it round the orbit?
 *   - are the ramps / orbits / vault actually reachable from each flipper?
 *   - can a ball get stuck, escape the cabinet, or tunnel a wall?
 * ==========================================================================*/
'use strict';
const fs = require('fs');
const vm = require('vm');
const path = require('path');

const SRC = path.join(__dirname, '..', 'src');

function loadPB() {
  const sandbox = {
    console, Math, Date, JSON, Array, Object, String, Number, Boolean,
    Uint8Array, Float32Array, isNaN, parseInt, parseFloat, setTimeout,
    performance: { now: () => Date.now() }
  };
  sandbox.window = sandbox;
  sandbox.globalThis = sandbox;
  vm.createContext(sandbox);
  for (const f of ['util.js', 'physics.js', 'audio.js', 'table.js']) {
    vm.runInContext(fs.readFileSync(path.join(SRC, f), 'utf8'), sandbox, { filename: f });
  }
  return sandbox.window.PB;
}

const PB = loadPB();
const U = PB.U, P = PB.Phys, T = PB.Table;

/* ------------------------------------------------------------------ rig */
function makeRig() {
  const t = T.build();
  const w = t.world;
  const rig = { t, w, events: [], zones: [], drained: 0, scooped: 0 };

  w.onHit = (tag, ball, info) => {
    if (!tag) return;
    const kind = tag.split(':')[0];
    if (kind === 'bumper') {
      t.bumpers[parseInt(tag.split(':')[1], 10)].fire(ball);
    } else if (kind === 'sling') {
      const s = t.slings[parseInt(tag.split(':')[1], 10)];
      s.fire(ball, s.col.nx, s.col.ny);
    } else if (kind === 'drop') {
      t.dropTarget(t.drops[parseInt(tag.split(':')[1], 10)]);
    }
    rig.events.push(tag);
  };

  w.onZone = (tag, ball, entering) => {
    if (!entering) return;
    rig.zones.push(tag);
    const parts = tag.split(':');
    if (parts[0] === 'drain') {
      ball.state = 'gone'; w.remove(ball); rig.drained++;
    } else if (parts[0] === 'spinner') {
      t.spinner.hit(ball);
    } else if (parts[0] === 'scoopcap') {
      if (ball.vy < -60 || ball.speed() < 240) {
        ball.state = 'gone'; w.remove(ball); rig.scooped++;
      }
    } else if (parts[0] === 'rampentry') {
      if (ball.state === 'field' && ball.vy < -200) {
        const ramp = parts[1] === 'left' ? t.rampL : t.rampR;
        const T0 = ramp.path.tangent(0);
        let v = ball.vx * T0.x + ball.vy * T0.y;
        if (v < 260) v = Math.max(260, ball.speed() * 0.8);
        ball.state = 'ramp';
        ball.ramp = { path: ramp.path, ramp: ramp, s: 0, v: v };
      }
    }
  };

  w.onRampEnd = (ball, res) => {
    const r = ball.ramp, p = r.path;
    if (res === 'exit') {
      const Te = p.tangent(p.length), pe = p.at(p.length);
      ball.x = pe.x; ball.y = pe.y; ball.z = 0;
      const ve = Math.max(360, Math.abs(r.v));
      ball.vx = Te.x * ve; ball.vy = Te.y * ve;
      rig.zones.push('rampmade:' + r.ramp.name);
    } else {
      const Tb = p.tangent(0), pb = p.at(0);
      ball.x = pb.x; ball.y = pb.y + 6; ball.z = 0;
      const vb = Math.max(320, Math.abs(r.v)) * 0.75;
      ball.vx = -Tb.x * vb; ball.vy = -Tb.y * vb;
      rig.zones.push('rampback:' + r.ramp.name);
    }
    ball.state = 'field'; ball.ramp = null;
  };
  return rig;
}

/** Run the world forward; returns diagnostics about the ball's life. */
function run(rig, seconds, opts = {}) {
  const w = rig.w;
  const dt = P.DT;
  const steps = Math.round(seconds / dt);
  let stuckT = 0, maxSpeed = 0, escaped = null, minX = 1e9, maxX = -1e9, minY = 1e9, maxY = -1e9;
  for (let i = 0; i < steps; i++) {
    if (opts.onStep) opts.onStep(i * dt, w);
    w.step(dt);
    for (const b of w.balls) {
      if (b.state === 'gone') continue;
      if (b.state === 'field') {
        maxSpeed = Math.max(maxSpeed, b.speed());
        minX = Math.min(minX, b.x); maxX = Math.max(maxX, b.x);
        minY = Math.min(minY, b.y); maxY = Math.max(maxY, b.y);
        if (b.x < -8 || b.x > T.W + 8 || b.y < -8 || b.y > T.H + 40) {
          escaped = escaped || { x: +b.x.toFixed(1), y: +b.y.toFixed(1), t: +(i * dt).toFixed(2) };
        }
        if (b.speed() < 22) { stuckT += dt; } else stuckT = 0;
      }
    }
    if (rig.w.balls.length === 0 && !opts.keepGoing) break;
  }
  return { stuckT, maxSpeed, escaped, bbox: [minX, minY, maxX, maxY] };
}

function reset(rig) {
  rig.w.balls.length = 0;
  rig.events.length = 0;
  rig.zones.length = 0;
  rig.drained = 0; rig.scooped = 0;
  rig.t.resetDrops();
  for (const f of rig.w.flippers) { f.up = false; f.ang = f.restA; f.omega = 0; }
}

const PASS = [], FAIL = [], NOTE = [];
function check(ok, msg, detail) {
  (ok ? PASS : FAIL).push(msg + (detail ? '  [' + detail + ']' : ''));
}

/* ======================================================== 1. PLUNGER/ORBIT */
function testPlunger() {
  console.log('\n=== 1. PLUNGER  →  ORBIT ===');
  const rig = makeRig();
  for (const p of [0.15, 0.35, 0.55, 0.75, 0.95, 1.0]) {
    reset(rig);
    const b = rig.w.spawn(500, 1138);
    b.vy = -(1560 + 2760 * p);
    b.vx = 0;
    const r = run(rig, 9);
    const madeTop = rig.zones.includes('orbit:top');
    const exitedLeft = rig.zones.includes('orbit:left');
    const reachedPlay = b.state !== 'gone' ? b.x < T.K.shooterX0 : true;
    console.log(`  power ${(p * 100).toFixed(0).padStart(3)}%  v=${(1560 + 2760 * p) | 0}  ` +
      `top=${madeTop ? 'Y' : 'n'} leftLane=${exitedLeft ? 'Y' : 'n'} ` +
      `drained=${rig.drained} escaped=${r.escaped ? JSON.stringify(r.escaped) : 'no'} ` +
      `zones=${[...new Set(rig.zones)].slice(0, 7).join(',')}`);
    check(!r.escaped, `plunge ${p}: ball stays in the cabinet`,
      r.escaped && JSON.stringify(r.escaped));
    if (p >= 0.55) check(madeTop, `plunge ${p}: ball makes the top arch`);
  }
}

/* ==================================================== 2. FLIPPER SHOT MAP */
const SHOT_ZONES = ['rampmade:left', 'rampmade:right', 'rampback:left', 'rampback:right',
  'orbit:left', 'orbit:right', 'orbit:top', 'scoopcap', 'spinner',
  'lane:0', 'lane:1', 'lane:2', 'lane:3'];

function flipperShot(rig, which, frac, dropsDown) {
  reset(rig);
  if (dropsDown) for (const d of rig.t.drops) rig.t.dropTarget(d);
  const f = which === 'left' ? rig.t.flipperL : which === 'right' ? rig.t.flipperR : rig.t.flipperU;
  // rest the ball on the bat at `frac` of its length, just off the working face
  const ang = f.restA;
  // unit perpendicular pointing UP the playfield (the ball rests on the bat)
  const nx = which === 'left' ? Math.sin(ang) : -Math.sin(ang);
  const ny = which === 'left' ? -Math.cos(ang) : Math.cos(ang);
  const px = f.px + Math.cos(ang) * f.len * frac + nx * (P.BALL_R + f.r2 - 0.5);
  const py = f.py + Math.sin(ang) * f.len * frac + ny * (P.BALL_R + f.r2 - 0.5);
  const b = rig.w.spawn(px, py);
  let flipped = false;
  const res = run(rig, 6, {
    onStep: (t) => { if (!flipped && t > 0.02) { f.up = true; flipped = true; } }
  });
  const hits = rig.zones.filter(z => SHOT_ZONES.includes(z));
  const first = hits.length ? hits[0] : (rig.drained ? 'DRAIN' : (rig.scooped ? 'scoop' : '-'));
  return { first, all: [...new Set(hits)], res, drained: rig.drained, scooped: rig.scooped };
}

function testFlippers() {
  console.log('\n=== 2. FLIPPER SHOT MAP  (which shots are reachable) ===');
  const rig = makeRig();
  const found = new Set();
  for (const which of ['left', 'right', 'upper']) {
    console.log(`  -- ${which} flipper --`);
    for (const frac of [0.35, 0.5, 0.62, 0.72, 0.82, 0.9, 0.97]) {
      for (const dd of [false, true]) {
        const r = flipperShot(rig, which, frac, dd);
        r.all.forEach(z => found.add(z));
        if (r.scooped) found.add('scoopcap');
        if (dd === false) {
          console.log(`     bat ${(frac * 100) | 0}%  → ${String(r.first).padEnd(14)} ` +
            `all=[${r.all.join(' ')}]${r.scooped ? ' VAULT' : ''}` +
            `${r.res.escaped ? ' ESCAPED ' + JSON.stringify(r.res.escaped) : ''}`);
        } else if (r.scooped) {
          console.log(`     bat ${(frac * 100) | 0}%  (drops down) → VAULT`);
        }
        check(!r.res.escaped, `${which} flipper @${frac}: ball stays in the cabinet`,
          r.res.escaped && JSON.stringify(r.res.escaped));
      }
    }
  }
  console.log('  reachable shots:', [...found].sort().join(', '));
  for (const need of ['rampmade:left', 'rampmade:right', 'orbit:top', 'scoopcap']) {
    check(found.has(need), `shot reachable from a flipper: ${need}`);
  }
}

/* ============================================== 2b. AIM SWEEP (geometry) */
/* Fire balls from just above each flipper tip across a fan of angles and
   speeds. Answers "is this shot geometrically possible", separate from
   "can the flipper generate it".                                          */
function testAim() {
  console.log('\n=== 2b. AIM SWEEP  (shot geometry from each flipper) ===');
  const rig = makeRig();
  const origins = {
    left: [T.K.flipL.x + 44, T.K.flipL.y + 8],
    right: [T.K.flipR.x - 44, T.K.flipR.y + 8],
    upper: [T.K.flipU.x - 34, T.K.flipU.y + 10]
  };
  const all = {};
  for (const which of Object.keys(origins)) {
    const [ox, oy] = origins[which];
    const map = {};
    for (let deg = -175; deg <= -5; deg += 2.5) {
      for (const sp of [2000, 2500, 3000, 3500, 4000]) {
        for (const dd of [false, true]) {
          reset(rig);
          if (dd) for (const d of rig.t.drops) rig.t.dropTarget(d);
          const b = rig.w.spawn(ox, oy);
          b.kick(deg, sp, 0);
          run(rig, 5);
          const hits = [...new Set(rig.zones.filter(z => SHOT_ZONES.includes(z)))];
          if (rig.scooped) hits.push('scoopcap');
          for (const key of [...new Set(hits)]) {
            (map[key] = map[key] || []).push(deg);
            all[key] = true;
          }
        }
      }
    }
    console.log(`  -- ${which} flipper (from ${ox},${oy}) --`);
    for (const k of Object.keys(map).sort()) {
      const a = map[k];
      console.log(`     ${k.padEnd(15)} angles ${Math.min(...a)}° … ${Math.max(...a)}°  (${a.length} hits)`);
    }
  }
  console.log('  all shots hit somewhere:', Object.keys(all).sort().join(', '));
  for (const need of ['rampmade:left', 'rampmade:right', 'orbit:top', 'scoopcap']) {
    check(all[need], `aim sweep reaches: ${need}`);
  }
}

/* ================================================ 3. SETTLE / STUCK SWEEP */
function testStuck() {
  console.log('\n=== 3. STUCK-BALL SWEEP (drop balls all over the playfield) ===');
  const rig = makeRig();
  const rng = new U.Rng(20260803);
  let stuck = 0, escaped = 0, drained = 0, total = 0, worst = null, skipped = 0;

  /** Only drop balls where a ball could legitimately be. */
  function validSpawn(x, y) {
    if (y < 330) {                       // inside the top arch only
      const d = Math.hypot(x - T.K.archCX, y - T.K.archCY);
      if (d > T.K.archR - P.BALL_R - 1) return false;
    }
    if (x > T.K.shooterX0 - P.BALL_R) return false;   // shooter lane
    const probe = new P.Ball(x, y);
    for (const s of rig.w.statics) {
      if (!s.enabled || !s.solid) continue;
      if (s.test(probe)) return false;   // overlapping geometry
    }
    for (const f of rig.w.flippers) if (f.test(probe)) return false;
    return true;
  }

  for (let gx = 34; gx <= 470; gx += 22) {
    for (let gy = 90; gy <= 1040; gy += 44) {
      if (!validSpawn(gx, gy)) { skipped++; continue; }
      reset(rig);
      const b = rig.w.spawn(gx, gy);
      b.vx = rng.range(-900, 900);
      b.vy = rng.range(-600, 900);
      total++;
      const r = run(rig, 14);
      if (r.escaped) {
        escaped++;
        if (!worst) worst = { at: [gx, gy], esc: r.escaped };
      }
      if (rig.drained || rig.scooped) { drained++; continue; }
      // still on the table after 14 s and not moving -> stuck
      const alive = rig.w.balls.filter(x => x.state === 'field');
      if (alive.length && alive[0].speed() < 22) {
        stuck++;
        console.log(`     STUCK from (${gx},${gy}) → rests at ` +
          `(${alive[0].x.toFixed(0)},${alive[0].y.toFixed(0)}) v=${alive[0].speed().toFixed(1)}`);
      }
    }
  }
  console.log(`  ${total} drops (${skipped} invalid spots skipped):  ` +
    `drained/scooped=${drained}  stuck=${stuck}  escaped=${escaped}`);
  if (worst) console.log('  first escape:', JSON.stringify(worst));
  check(escaped === 0, 'no ball escapes the cabinet', escaped + ' escapes');
  check(stuck <= total * 0.02, 'stuck balls under 2%', stuck + '/' + total);
}

/* ============================================================== 4. RAMPS */
function testRamps() {
  console.log('\n=== 4. RAMP ENERGY (entry speed vs make/roll-back) ===');
  const rig = makeRig();
  for (const side of ['left', 'right']) {
    const ramp = side === 'left' ? rig.t.rampL : rig.t.rampR;
    const line = [];
    for (const v of [1200, 1500, 1800, 2100, 2500, 3000, 3600]) {
      reset(rig);
      const b = rig.w.spawn(ramp.entryX, 690);
      b.vy = -v; b.vx = 0;
      run(rig, 8);
      const made = rig.zones.includes('rampmade:' + side);
      const back = rig.zones.includes('rampback:' + side);
      line.push(`${v}:${made ? 'MADE' : back ? 'back' : '?'}`);
      if (made) {
        const bb = rig.w.balls[0];
        if (bb && bb.state === 'field')
          line[line.length - 1] += `(exit ${bb.x.toFixed(0)},${bb.y.toFixed(0)})`;
      }
    }
    console.log(`  ${side.padEnd(5)} ramp: ${line.join('  ')}`);
    check(line.some(s => s.includes('MADE')), `${side} ramp can be made`);
    check(line.some(s => s.includes('back')), `${side} ramp rejects a weak shot`);
  }
}

/* ======================================================== 5. FLIPPER FEEL */
function testFlipperPower() {
  console.log('\n=== 5. FLIPPER POWER ===');
  const rig = makeRig();
  for (const frac of [0.5, 0.75, 0.97]) {
    reset(rig);
    const f = rig.t.flipperL;
    const ang = f.restA;
    const px = f.px + Math.cos(ang) * f.len * frac + Math.sin(ang) * (P.BALL_R + f.r2 - 0.5);
    const py = f.py + Math.sin(ang) * f.len * frac - Math.cos(ang) * (P.BALL_R + f.r2 - 0.5);
    const b = rig.w.spawn(px, py);
    let peak = 0, flipped = false;
    for (let i = 0; i < 0.5 / P.DT; i++) {
      if (!flipped && i * P.DT > 0.02) { f.up = true; flipped = true; }
      rig.w.step(P.DT);
      if (b.state === 'field') peak = Math.max(peak, b.speed());
    }
    console.log(`  bat ${(frac * 100) | 0}%  →  ${(peak / 1000).toFixed(2)} m/s`);
    check(peak > 1500 && peak < 7000, `flipper @${frac} launches at a sane speed`,
      (peak | 0) + ' mm/s');
  }
  // how far up the playfield can a full-power shot climb?
  const need = Math.sqrt(2 * P.G_PLANE * (1050 - 70));
  console.log(`  (speed needed to reach the top arch: ${(need / 1000).toFixed(2)} m/s)`);
}

/* ================================================================== MAIN */
const suite = process.argv[2];
if (!suite || suite === 'plunger') testPlunger();
if (!suite || suite === 'flippers') testFlippers();
if (!suite || suite === 'aim') testAim();
if (!suite || suite === 'ramps') testRamps();
if (!suite || suite === 'power') testFlipperPower();
if (!suite || suite === 'stuck') testStuck();

console.log('\n============================================================');
console.log(`PASS ${PASS.length}   FAIL ${FAIL.length}`);
for (const f of FAIL) console.log('  ✗ ' + f);
if (NOTE.length) { console.log('notes:'); NOTE.forEach(n => console.log('  · ' + n)); }
process.exit(FAIL.length ? 1 : 0);
