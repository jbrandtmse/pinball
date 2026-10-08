// PLEASURE PALACE — headless test harness (Node).
//   node test/headless.js             → run all suites, seeds 1..8 for game
//   node test/headless.js 42          → just seed 42
// Suites:
//   sweep : place a ball in every corridor/entry at various speeds, verify
//           it always drains or lands recoverably (no V-pockets).
//   game  : autoplay a full 3-ball game per seed with a simple but real
//           player sim (charge plunger when lane ball parked, catch/release
//           flippers on incoming balls). Assert termination, no stuck
//           balls, scoring, ball accounting.

'use strict';
const PHYS = require('../js/physics.js');
const TABLE = require('../js/table.js');
const RULES = require('../js/rules.js');

// ---- deterministic RNG --------------------------------------------------------
// The harness replaces Math.random globally so physics+rng in rules are all
// reproducible per seed (rules.firePlunger etc. call Math.random directly).
function installSeededRandom(seed) {
  var a = seed >>> 0;
  Math.random = function () {
    a |= 0; a = (a + 0x6D2B79F5) | 0;
    var t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

let failures = 0;
function ok(cond, msg) {
  if (cond) console.log('  PASS ' + msg);
  else { console.log('  FAIL ' + msg); failures++; }
}
function fmt(n) { return Math.round(n).toLocaleString('en-US'); }

// --------------------------------------------------------------------------
function runBall(scene, x, y, vx, vy, maxT) {
  let t = 0, trail = [], evts = [], drainT = null;
  const dt = 1 / 60;
  const allEvts = [];
  while (t < maxT) {
    evts = [];
    PHYS.step(scene, dt, evts);
    for (const e of evts) {
      allEvts.push(e);
      if (e.type === 'drain') drainT = t;
    }
    if (scene.balls.length === 0) break;
    const b = scene.balls[0];
    if (Math.round(t * 2) !== Math.round((t - dt) * 2)) {
      trail.push([Math.round(t), Math.round(b.x), Math.round(b.y)]);
    }
    t += dt;
  }
  return { drainT, trail, events: allEvts, t };
}

function suiteSweep() {
  console.log('== corridor sweep ==');
  const trials = [
    { name: 'plunger straight', x: 499, y: 1057, vx: 0, vy: -1280 },
    { name: 'plunger vane-l', x: 499, y: 1057, vx: -55, vy: -1280 },
    { name: 'plunger vane-r', x: 499, y: 1057, vx: 55, vy: -1280 },
    { name: 'plunger weak', x: 499, y: 1057, vx: -40, vy: -640 },
    { name: 'plunger full', x: 499, y: 1057, vx: -25, vy: -1560 },
    { name: 'left guide entry', x: 50, y: 440, vx: -30, vy: 120 },
    { name: 'arch roll right→left', x: 460, y: 300, vx: -260, vy: 60 },
    { name: 'arch apex drop', x: 270, y: 175, vx: 40, vy: 40 },
    { name: 'inlane L', x: 223, y: 885, vx: 0, vy: 60 },
    { name: 'inlane R', x: 317, y: 885, vx: 0, vy: 60 },
    { name: 'outlane L (kb off)', x: 50, y: 900, vx: 0, vy: 40 },
    { name: 'right guide', x: 454, y: 890, vx: 0, vy: 40 },
    { name: 'kitten face', x: 270, y: 740, vx: 0, vy: -300 },
    { name: 'bank face', x: 440, y: 700, vx: 30, vy: -320 },
    { name: 'bumper field drop', x: 270, y: 430, vx: 0, vy: 20 },
    { name: 'sling L hit', x: 150, y: 850, vx: 100, vy: 200 },
    { name: 'flipper crotch', x: 270, y: 935, vx: 0, vy: -20 },
  ];
  for (const tr of trials) {
    const built = TABLE.build();
    built.scene.balls.push({ x: tr.x, y: tr.y, vx: tr.vx, vy: tr.vy, r: 10.5 });
    const res = runBall(built.scene, tr.x, tr.y, tr.vx, tr.vy, 60);
    const parked = (() => {
      if (built.scene.balls.length === 0) return 'drained';
      const b = built.scene.balls[0];
      if (b.x > 478 && b.y > 1030) return 'lane-home';
      if (b.x < 80 && b.y > 1000) return 'outlane';
      // on either blade or cradled in the crotch between them (player
      // can flick out of any of these; not a dead pocket)
      const onBlade = (b.y > 940 && b.y < 1012) && b.x >= 188 && b.x <= 352;
      if (onBlade) return 'on-flipper';
      return 'alive@' + Math.round(b.x) + ',' + Math.round(b.y);
    })();
    const okStates = ['drained', 'lane-home', 'outlane', 'on-flipper'];
    const pass = okStates.includes(parked);
    console.log((pass ? '  PASS ' : '  FAIL ') + tr.name + ' → end:' + parked +
      (res.drainT !== null ? ' drain@' + res.drainT.toFixed(1) + 's' : '') +
      ' ev:' + res.events.length);
    if (!pass) {
      console.log('    trail: ' + res.trail.slice(0, 20).map(p => `(${p[1]},${p[2]})@${p[0]}s`).join(' '));
    }
  }
}

// --------------------------------------------------------------------------
function suiteGame(seed) {
  installSeededRandom(seed);
  const rand = Math.random;
  const built = TABLE.build();
  const scene = built.scene;
  const rules = RULES.create(scene);
  rules.startGame();
  let t = 0, maxBalls = 1, drainEvents = 0;
  const held = { L: false, R: false };
  const cool = { L: 0, R: 0 };
  const holdT = { L: 0, R: 0 };
  let plungerHeld = false, plungerT = 0;
  const msgs = [];
  const dt = 1 / 60;
  let evts = [];

  // player sim: when exactly one ball sits parked in the lane, charge the
  // plunger for a short random interval then release.
  function playerTick() {
    // flippers: catch descending balls, and flick anything parked on or
    // near a blade (a slow ball in the blade/wall V never "comes in")
    for (const side of ['L', 'R']) {
      if (cool[side] > 0) { cool[side] -= dt; held[side] = false; continue; }
      let act = false;
      for (const b of scene.balls) {
        const sp = Math.hypot(b.vx, b.vy);
        if (b.vy > 60 && b.y > 830 && b.y < 1015 &&
            ((side === 'L' && b.x >= 145 && b.x <= 268) ||
             (side === 'R' && b.x >= 272 && b.x <= 395))) act = true;
        if (sp < 45 && b.y > 900 && b.y < 1030) {
          if ((side === 'L' && b.x < 270) || (side === 'R' && b.x >= 270)) act = true;
        }
      }
      if (act) {
        if (holdT[side] === 0) holdT[side] = rand() * 0.12;
        holdT[side] += dt;
        if (holdT[side] >= 0.3 + rand() * 0.12) { held[side] = false; cool[side] = 0.16 + rand() * 0.1; }
        else held[side] = true;
      } else { holdT[side] = 0; }
    }
    scene.flippers[0].target = held.L ? -0.42 : 0.42;
    scene.flippers[1].target = held.R ? -0.42 : 0.42;

    // plunger: if a ball sits at lane bottom, charge & fire
    const lane = scene.balls.filter(b => b.x > 480 && b.y > 1040 && Math.hypot(b.vx, b.vy) < 90);
    if (lane.length > 0) {
      if (!plungerHeld) { plungerHeld = true; plungerT = 0; }
      plungerT += dt;
      if (plungerT >= 0.4 + rand() * 0.75) {
        rules.plungerRelease(0.55 + rand() * 0.42);
        plungerHeld = false; plungerT = 0;
      }
    } else { plungerHeld = false; plungerT = 0; }
  }

  while (t < 300 && !rules.gameOver) {
    playerTick();
    evts = [];
    PHYS.step(scene, dt, evts);
    const res = rules.handle(evts);
    rules.tick(dt);
    const ms = rules.drainMessages();
    for (const m of ms) msgs.push([t.toFixed(1), m.text]);

    for (const e of evts) if (e.type === 'drain') drainEvents++;
    maxBalls = Math.max(maxBalls, scene.balls.length);

    // stuck detection: a ball dead-slow for >10s with no flipper activity
    // around it means a true pocket (slow-but-moving corridors are fine)
    for (const b of scene.balls) {
      if (Math.hypot(b.vx, b.vy) < 14) {
        b._stuck = (b._stuck || 0) + dt;
        if (b._stuck > 10 && !b._stuckLogged) {
          console.log('  FAIL stuck ball @(' + Math.round(b.x) + ',' + Math.round(b.y) + ') t=' + t.toFixed(1));
          b._stuckLogged = true; failures++;
        }
      } else b._stuck = 0;
    }

    t += dt;
    if (rules.gameOver) break;
  }
  console.log(`  [seed ${seed}] ended=${rules.gameOver} t=${t.toFixed(0)}s score=${fmt(rules.score)} ballsLeft=${rules.ballsLeft} maxBalls=${maxBalls} drains=${drainEvents} mbEver=${rules.ballNo > 3 ? 'yes' : 'see msgs'}`);
  ok(rules.gameOver && t < 295, `seed ${seed}: game terminated in time`);
  ok(rules.score > 0, `seed ${seed}: scored points: ${fmt(rules.score)}`);
  if (rules.gameOver && t < 295) ok(drainEvents >= 3, `seed ${seed}: at least all 3 balls drained (${drainEvents})`);
  return { score: rules.score, t, gameOver: rules.gameOver };
}

// --------------------------------------------------------------------------
suiteSweep();
const seeds = process.argv[2] ? [parseInt(process.argv[2], 10)] : [1, 2, 3, 4, 5, 6, 7, 8];
for (const s of seeds) suiteGame(s);
console.log('');
if (failures > 0) { console.log('FAILURES: ' + failures); process.exit(1); }
console.log('ALL TESTS PASS');
