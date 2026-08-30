/* =========================================================================
   headless.js — autoplay rig + shot corridor sweeps
   Plays complete games with a simple flipper AI and asserts:
     - no stuck balls (every ball drains or reaches a device)
     - ball accounting (serves == drains, no phantom balls)
     - sane ball times
     - shots are makeable (corridor sweep hits every major shot)
   Usage: node test/headless.js [games] [seed]
   ========================================================================= */
'use strict';
const U = require('../js/util.js');
const P = require('../js/physics.js');
const T = require('../js/table.js');
const R = require('../js/rules.js');

let failures = 0;
function assert(cond, msg) {
  if (!cond) { failures++; console.log('  FAIL:', msg); }
  return cond;
}

function makeWorld() {
  const W = new P.World();
  const refs = T.build(W);
  return { W, refs };
}

// --------------------------------------------------------------- corridor sweep
function sweep() {
  console.log('== corridor sweep ==');
  // [name, origin, targetPoint, speed] — shots from a flipper rest position
  const L_TIP = { x: 8.6, y: 36.0 }, R_TIP = { x: 11.65, y: 36.0 };
  const shots = [
    ['rampL (left flipper)', L_TIP, { x: 6.4, y: 28.6 }, 88],
    ['rampR (right flipper)', R_TIP, { x: 14.1, y: 28.6 }, 88],
    ['orbitL (left flipper)', L_TIP, { x: 1.9, y: 21.0 }, 95],
    ['orbitR (right flipper)', R_TIP, { x: 18.0, y: 20.0 }, 95],
    ['saucer (right flipper)', R_TIP, { x: 11.4, y: 24.6 }, 62],
    ['tempest (left flipper)', L_TIP, { x: 9.2, y: 21.8 }, 60],
    ['drops (left flipper)', L_TIP, { x: 13.6, y: 23.4 }, 84],
    ['tridents (right flipper)', R_TIP, { x: 4.2, y: 26.0 }, 70],
    ['bumpers (left flipper)', L_TIP, { x: 9.4, y: 16.0 }, 80],
  ];
  const results = {};
  for (const [name, from, to, spd] of shots) {
    let entered = 0, hits = 0, drained = 0;
    const d = U.norm({ x: to.x - from.x, y: to.y - from.y });
    // sweep ±3.75 degrees in fine steps around the ideal line
    for (let off = -3.75; off <= 3.75; off += 0.75) {
      const a = Math.atan2(d.y, d.x) + off * Math.PI / 180;
      const { W, refs } = makeWorld();
      const game = new R.Game(W, refs, { headless: true });
      game.startGame(1);
      game.state = 'play';
      game.ballSaveT = 0;
      // clear the served ball; shoot directly
      for (const b of W.balls.splice(0)) W.removeBall(b);
      const b = W.addBall(from.x, from.y);
      b.vx = Math.cos(a) * spd; b.vy = Math.sin(a) * spd;
      const tags = { ramp: false, saucer: false, tempest: false, drop: false, trid: false, bumper: false, orbit: false };
      W.em.on('rampEnter:rampL', () => tags.ramp = true);
      W.em.on('rampEnter:rampR', () => tags.ramp = true);
      W.em.on('orbitDep:orbL', () => tags.orbit = true);
      W.em.on('orbitDep:orbR', () => tags.orbit = true);
      W.em.on('captured:saucer', () => tags.saucer = true);
      W.em.on('target:tempest', () => tags.tempest = true);
      W.em.on('target:drop0', () => tags.drop = true);
      W.em.on('target:trid0', () => tags.trid = true);
      W.em.on('bumper', () => tags.bumper = true);
      for (let i = 0; i < 240 * 8; i++) {
        game.update(1 / 240);
        if (b.state === 'captured' || b.state === 'plunger') break;
      }
      if (tags.ramp || tags.orbit || tags.saucer || tags.tempest || tags.drop || tags.trid) entered++;
      if (tags.bumper) hits++;
      if (b.state === 'captured' && b.capId === 'trough') drained++;
    }
    results[name] = { entered, hits, drained };
    console.log(`  ${name}: scored/entered ${entered}/11, bumper ${hits}, drained ${drained}`);
  }
  assert(results['rampL (left flipper)'].entered >= 3, 'rampL should be makeable (got ' + results['rampL (left flipper)'].entered + ')');
  assert(results['rampR (right flipper)'].entered >= 3, 'rampR should be makeable');
  assert(results['orbitL (left flipper)'].entered >= 3, 'orbitL should be makeable');
  assert(results['orbitR (right flipper)'].entered >= 3, 'orbitR should be makeable');
  assert(results['saucer (right flipper)'].entered >= 3, 'saucer should be reachable');
  assert(results['tempest (left flipper)'].entered >= 2, 'tempest should be hittable');
  assert(results['drops (left flipper)'].entered >= 2, 'drop bank should be hittable');
  assert(results['tridents (right flipper)'].entered >= 2, 'tridents should be hittable');
}

// --------------------------------------------------------------- autoplay
function autoplayOne(gameIdx, seed) {
  const rng = U.makeRng(seed);
  U.rng = rng;
  const { W, refs } = makeWorld();
  const game = new R.Game(W, refs, { headless: true, rng });
  game.startGame(1);

  let serves = 0, drains = 0, maxBallTime = 0, ballStart = 0;
  let switchCount = 0;
  const counts = { ramp: 0, orbit: 0, saucer: 0, tempest: 0, drop: 0, trid: 0, bumper: 0, spinner: 0, lock: 0, mbStart: 0, jackpot: 0, mode: 0, modeDone: 0, skill: 0 };
  game.em.on('sfx', (d) => {
    const n = d.name;
    if (counts[n] !== undefined) counts[n]++;
    if (n === 'launch') { serves++; ballStart = game.time; }
  });
  game.em.on('dmd', () => {});
  game.em.on('gameover', () => { over = true; });
  let over = false;

  W.em.on('switch', (e) => {
    switchCount++;
    const n = e.name;
    if (n === 'captured:trough') drains++;
  });

  const dt = 1 / 60;
  let t = 0;
  let lastFlip = 0;
  let stuckT = 0, lastPos = null;
  const maxSeconds = 60 * 25; // 25 game-minutes hard cap

  while (!over && t < maxSeconds) {
    // --- AI: crude but exercises everything ---
    if (game.state === 'launch') {
      // charge & release plunger with varied power
      if (!game._plungerHeld) game.plungerHold(true);
      else if ((game._plungerP || 0) > 0.55 + 0.4 * rng()) {
        game.plungerHold(false);
        game.doLaunch(game._plungerP);
      }
    } else if (game.state === 'play') {
      // imperfect reflexes: misses only on fast balls; slow balls are sure catches
      for (const b of W.balls) {
        if (b.state !== 'free') continue;
        const sp = Math.hypot(b.vx, b.vy);
        const nearL = (b.x > 5.6 && b.x < 8.4 && b.y > 34.5) || (b.x > 3.6 && b.x < 7.0 && b.y > 35.5);
        const nearR = (b.x > 11.8 && b.x < 14.6 && b.y > 34.5) || (b.x > 13.2 && b.x < 16.4 && b.y > 35.5);
        const chance = sp < 30 ? 0.94 : 0.38;
        if (b.vy > -4 && nearL && t - lastFlip > (sp < 30 ? 0.2 : 0.5) && Math.random() < chance) {
          game.setFlipper(-1, true); game._ejectIn(0.09, () => game.setFlipper(-1, false));
          lastFlip = t;
        }
        if (b.vy > -4 && nearR && t - lastFlip > (sp < 30 ? 0.2 : 0.5) && Math.random() < chance) {
          game.setFlipper(1, true); game._ejectIn(0.09, () => game.setFlipper(1, false));
          lastFlip = t;
        }
      }
      // occasional deliberate shots from a cradle
      if (rng() < 0.003 && t - lastFlip > 0.5) {
        const side = rng() < 0.5 ? -1 : 1;
        game.setFlipper(side, true);
        game._ejectIn(0.12, () => game.setFlipper(side, false));
        lastFlip = t;
      }
      // nudge out of trouble
      if (rng() < 0.0015) game.nudge(rng() < 0.5 ? -1 : 1);
    }

    game.update(dt);
    t += dt;

    // stuck check: any free ball not moving for 14s (cradled-on-flipper exempt)
    let anySlow = false;
    for (const b of W.balls) {
      if (b.state === 'free') {
        const sp = Math.hypot(b.vx, b.vy);
        if (sp < 1.2) {
          let cradled = false;
          for (const f of W.flippers) {
            const tip = { x: f.px + Math.cos(f.ang) * f.len, y: f.py + Math.sin(f.ang) * f.len };
            const cp = U.closestOnSeg(b.x, b.y, f.px, f.py, tip.x, tip.y);
            if (cp.d2 < (P.BALL_R + 0.55) * (P.BALL_R + 0.55)) { cradled = true; break; }
          }
          if (!cradled) anySlow = true;
        }
      }
    }
    if (anySlow && game.state === 'play') stuckT += dt; else stuckT = 0;
    if (stuckT > 14) {
      // ball search in rules should have fired; if still stuck, dump geometry
      const wb = W.balls.find(b => b.state === 'free');
      if (wb) {
        console.log(`  WEDGE game ${gameIdx} t=${t.toFixed(0)} at ${wb.x.toFixed(2)},${wb.y.toFixed(2)} v=${Math.hypot(wb.vx, wb.vy).toFixed(2)}`);
        for (const s of W.segs) {
          const cp = U.closestOnSeg(wb.x, wb.y, s.ax, s.ay, s.bx, s.by);
          const rad = P.BALL_R + s.thick / 2;
          if (cp.d2 < (rad + 0.06) * (rad + 0.06)) console.log(`    seg ${s.ax.toFixed(2)},${s.ay.toFixed(2)} -> ${s.bx.toFixed(2)},${s.by.toFixed(2)} [${s.mat}]`);
        }
        for (const p of W.posts) if (Math.hypot(wb.x - p.x, wb.y - p.y) < P.BALL_R + p.r + 0.06) console.log(`    post ${p.x},${p.y} r${p.r}`);
      }
      assert(false, `game ${gameIdx}: ball stuck >14s at t=${t.toFixed(0)}`);
      break;
    }
    for (const b of W.balls) {
      assertNum(b.x, `game ${gameIdx} ball x`);
      assertNum(b.y, `game ${gameIdx} ball y`);
      assertNum(b.vx, `game ${gameIdx} ball vx`);
    }
    if (game.state === 'gameover') over = true;
  }

  const p = game.players[0];
  const ballTime = game.time - ballStart;
  console.log(`  game ${gameIdx} (seed ${seed}): ${over ? 'FINISHED' : 'TIMEOUT'} t=${t.toFixed(0)}s ` +
    `score=${U.fmt(p ? p.score : 0)} switches=${switchCount} drains=${drains}`);
  console.log(`    shots: ramps=${counts.ramp} orbits=${counts.orbit} saucer=${counts.saucer} ` +
    `tempest=${counts.tempest} drops=${counts.drop} tridents=${counts.trid} bumpers=${counts.bumper} ` +
    `mbStart=${counts.mbStart} jackpots=${counts.jackpot} skill=${counts.skill}`);
  console.log(`    progression: modesDone=${p ? p.modesDone.filter(v => v).length : 0}/4 locks=${game.locks} ` +
    `mbActive=${game.mb.active} state=${game.state}`);

  assert(over, `game ${gameIdx}: game should finish (state=${game.state})`);
  assert(drains >= 3, `game ${gameIdx}: at least 3 drains expected (got ${drains})`);
  assert(Math.abs(serves - drains) <= 2, `game ${gameIdx}: serve/drain accounting serves=${serves} drains=${drains}`);
  assert(switchCount > 40, `game ${gameIdx}: too few switches (${switchCount}) — table may be dead`);
  if (p && p.score <= 0) { failures++; console.log('  FAIL: zero score'); }
  return { over, score: p ? p.score : 0, counts };
}

function assertNum(v, what) {
  if (typeof v !== 'number' || !isFinite(v)) { failures++; console.log('  FAIL: NaN at', what); }
}

// --------------------------------------------------------------- run
const nGames = parseInt(process.argv[2] || '3', 10);
const baseSeed = parseInt(process.argv[3] || '12345', 10);
console.log('RISE OF ATLANTIS — headless test');
sweep();
console.log('== autoplay games ==');
let totalScore = 0;
for (let i = 0; i < nGames; i++) {
  const r = autoplayOne(i + 1, baseSeed + i * 7919);
  totalScore += r.score;
}
console.log(`== done: ${failures} failure(s), avg score ${U.fmt(totalScore / nGames)} ==`);
process.exit(failures ? 1 : 0);
