// NOVA STRIKE — headless physics/rules test rig (Node, no browser).
// Usage:
//   node test/sim.js          full suite
//   node test/sim.js soak 300  5-minute random-play soak
import { makeWorld, stepWorld, addBall } from '../js/physics.js';
import { buildTable } from '../js/table.js';
import { Game } from '../js/rules.js';

let failures = 0;
function check(name, cond, detail = '') {
  if (cond) console.log(`  ok    ${name}`);
  else { console.error(`  FAIL  ${name} ${detail}`); failures++; }
}

// deterministic PRNG so failures reproduce
function rng(seed) {
  let s = seed >>> 0;
  return () => ((s = (s * 1664525 + 1013904223) >>> 0) / 0xffffffff);
}

function stubIO() {
  return {
    dmd: { message() {}, score() {}, tick() {} },
    sfx() {}, music() {},
    highs: { qualify: () => false, beginEntry() {} }
  };
}

function rig() {
  const world = makeWorld({ gravity: 2100 });
  const table = buildTable(world);
  const game = new Game(world, table, stubIO());
  return { world, table, game };
}

function step(rig, seconds, each) {
  const h = 1 / 120;
  const n = Math.round(seconds / h);
  for (let i = 0; i < n; i++) {
    stepWorld(rig.world, h);
    rig.game.update(h);
    if (each) each(rig, i * h);
    for (const b of rig.world.balls) {
      if (Number.isNaN(b.x) || Number.isNaN(b.y) || Number.isNaN(b.vx) || Number.isNaN(b.vy)) {
        throw new Error(`NaN ball state at t=${(i * h).toFixed(2)}`);
      }
      if (!b.locked && (b.x < -20 || b.x > 740 || b.y < -20)) {
        throw new Error(`ball escaped playfield: ${b.x.toFixed(1)},${b.y.toFixed(1)} t=${(i * h).toFixed(2)}`);
      }
    }
  }
}

// ---------------------------------------------------------------- scenario 1
function testPlunge() {
  console.log('scenario: full plunge orbits and lands in play');
  const r = rig();
  r.game.startGame();
  step(r, 0.5);
  check('ball served to plunger', r.world.balls.length === 1 &&
    Math.abs(r.world.balls[0].x - 687) < 2 && r.world.balls[0].y > 1400);
  r.game.launch(1.0);
  let sawLane = false, leftLane = false, maxY = 1e9;
  step(r, 12, (rr) => {
    const b = rr.world.balls[0];
    if (!b) return;
    if (b.y < 360 && b.x > 640) sawLane = true;   // went up the shooter lane
    if (b.x < 100 && b.y < 800) leftLane = true;  // came around to the left
    if (b.y < maxY) maxY = b.y;
  });
  check('plunge reached top of lane', sawLane, `maxY=${maxY}`);
  check('ball orbited to left side', leftLane);
  check('game in PLAY', r.game.state === 'play');
}

// ---------------------------------------------------------------- scenario 2
function testWeakPlunge() {
  console.log('scenario: weak plunge falls back to plunger');
  const r = rig();
  r.game.startGame();
  step(r, 0.5);
  r.game.launch(0.05);
  step(r, 6);
  const b = r.world.balls[0];
  check('ball returned to plunger area', !!b && b.x > 660 && b.y > 1380,
    b ? `at ${b.x.toFixed(0)},${b.y.toFixed(0)}` : 'drained');
}

// ---------------------------------------------------------------- scenario 3
function testFlipperShot() {
  console.log('scenario: flipper imparts energy');
  const r = rig();
  r.game.startGame();
  step(r, 0.2);
  // drop a ball just above the left flipper, near the base
  const b = addBall(r.world, 280, 1340);
  r.world.balls.splice(0, 1); // remove plunged ball
  step(r, 0.45); // land on the bat
  const before = Math.hypot(b.vx, b.vy);
  r.game.flipper(-1, true);
  step(r, 0.35);
  r.game.flipper(-1, false);
  check('flipper launched ball upward', b.vy < -300 || b.y < 1250,
    `vy=${b.vy.toFixed(0)} y=${b.y.toFixed(0)} (settled speed ${before.toFixed(0)})`);
}

// ---------------------------------------------------------------- scenario 4
function testSaucerLock() {
  console.log('scenario: two locks start multiball');
  const r = rig();
  r.game.startGame();
  step(r, 0.3);
  r.game.launch(0.9);
  step(r, 0.5);

  const park = () => {
    const b = r.world.balls.find(b => !b.locked && !b.onRamp);
    b.x = 520; b.y = 1010; b.vx = 10; b.vy = 5; // roll into the dock
  };
  park();
  step(r, 2.5);
  check('first ball locked', r.game.locks === 1, `locks=${r.game.locks}`);
  check('replacement ball served', r.world.balls.some(b => !b.locked));
  r.game.lockLit = true; // (normally relit by the LOCK standup targets)
  park();
  step(r, 3);
  check('multiball started', r.game.multiball === true);
  const live = r.world.balls.filter(b => !b.locked).length;
  check('3 balls live (2 released + 1 on plunger)', live === 3, `live=${live}`);
}

// ---------------------------------------------------------------- scenario 5
function testNudgeTilt() {
  console.log('scenario: nudging warns then tilts');
  const r = rig();
  r.game.startGame();
  step(r, 0.3);
  r.game.launch(0.9);
  step(r, 0.5);
  for (let i = 0; i < 8; i++) { r.game.nudge('left'); step(r, 0.15); }
  check('tilt engaged', r.game.tilted === true);
  check('flippers disabled', r.table.flipL.disabled === true);
}

// ---------------------------------------------------------------- scenario 6
function testFullGame(seed, seconds, verbose = false) {
  console.log(`scenario: full game soak (seed ${seed}, ${seconds}s)`);
  const r = rig();
  const rand = rng(seed);
  r.game.startGame();
  let plungeAt = 1;
  let stuckT = 0, maxStuck = 0, stuckAt = null;
  let games = 0, maxScore = 0;
  step(r, seconds, (rr, t) => {
    const g = rr.game;
    maxScore = Math.max(maxScore, g.score);
    if (t > plungeAt && (g.state === 'serve' || rr.world.balls.some(b => !b.locked && b.x > 660 && b.y > 1380))) {
      g.launch(0.35 + rand() * 0.65);
      plungeAt = t + 3 + rand() * 6;
    }
    // random flipper mashing
    if (rand() < 0.06) g.flipper(-1, rand() < 0.5);
    if (rand() < 0.06) g.flipper(1, rand() < 0.5);
    if (rand() < 0.004) g.nudge(['left', 'right', 'up'][(rand() * 3) | 0]);
    if (g.state === 'attract' || g.state === 'over') { games++; g.startGame(); }
    if (g.state === 'hsEntry') g.state = 'attract';

    // stuck-ball watchdog (ignore balls parked on plunger or in dock)
    const live = rr.world.balls.filter(b => !b.locked && !b.onRamp && !(b.x > 660 && b.y > 1380));
    const moving = live.some(b => Math.hypot(b.vx, b.vy) > 40);
    if (g.state === 'play' && live.length && !moving) {
      stuckT += 1 / 120;
      if (stuckT > maxStuck) {
        maxStuck = stuckT;
        stuckAt = live.map(b => `${b.x.toFixed(0)},${b.y.toFixed(0)}`).join(' ');
      }
    } else stuckT = 0;
  });
  check('score accumulated', maxScore > 1000, `maxScore=${maxScore}`);
  check('no permanently stuck ball', maxStuck < 10, `maxStuck=${maxStuck.toFixed(1)}s at ${stuckAt}`);
  if (verbose) console.log(`  info  maxScore=${maxScore} ball=${r.game.ball} state=${r.game.state} games=${games}`);
}

// ---------------------------------------------------------------- scenario 7
function testRamps() {
  console.log('scenario: ramp shots capture and return');
  for (const [tag, entry, exitX] of [['left', null, 600], ['right', null, 110]]) {
    const r = rig();
    r.game.startGame();
    step(r, 0.3);
    r.game.launch(0.9);
    step(r, 0.3);
    const b = r.world.balls.find(b => !b.locked);
    const def = r.table.rampDefs[tag];
    b.x = def.entry.x; b.y = def.entry.y + 120; b.vx = 0; b.vy = -1500;
    let rode = false, exited = 0;
    step(r, 6, (rr) => {
      if (b.onRamp) rode = true;
    });
    const score = r.game.score;
    check(`${tag} ramp captured and scored`, rode && score >= 25000,
      `rode=${rode} score=${score} pos=${b.x.toFixed(0)},${b.y.toFixed(0)}`);
  }
}

// ---------------------------------------------------------------- scenario 8
function testMissionsAndWizard() {
  console.log('scenario: missions, extra ball, wizard');
  const r = rig();
  r.game.startGame();
  step(r, 0.3);
  r.game.launch(0.9);
  step(r, 0.3);
  r.game.lockLit = false;

  const park = () => {
    const b = r.world.balls.find(b => !b.locked && !b.onRamp);
    b.x = 520; b.y = 1010; b.vx = 10; b.vy = 5;
  };
  // mission 1
  park(); step(r, 2);
  check('mission started at dock', !!r.game.mission, `mission=${r.game.mission?.id}`);
  const m1 = r.game.mission;
  const before = r.game.score;
  for (let i = 0; i < m1.need; i++) r.game.missionHit();
  check('mission completed with award', r.game.mission === null && r.game.score >= before + m1.award);
  // missions 2 and 3
  park(); step(r, 2);
  const m2 = r.game.mission;
  for (let i = 0; i < m2.need; i++) r.game.missionHit();
  park(); step(r, 2);
  const m3 = r.game.mission;
  for (let i = 0; i < m3.need; i++) r.game.missionHit();
  check('all missions done, wizard lit', r.game.wizardReady === true,
    `done=${r.game.missionsDone} ready=${r.game.wizardReady}`);
  park(); step(r, 2);
  check('wizard mode running', r.game.wizard === true);

  // extra ball via drop banks
  r.game.wizard = false;
  for (let bank = 0; bank < 2; bank++) {
    for (let i = 0; i < 4; i++) {
      r.world.events.push({ type: 'switch', id: 'drop' + i, index: i, ball: r.world.balls[0] });
    }
    step(r, 0.1);
  }
  check('extra ball lit after 2 banks', r.game.extraBallLit === true);
  park(); step(r, 2);
  check('extra ball awarded', r.game.extraBalls === 1, `extra=${r.game.extraBalls}`);
}

// ------------------------------------------------------------------- main
const args = process.argv.slice(2);
try {
  if (args[0] === 'soak') {
    testFullGame(42, parseInt(args[1], 10) || 300, true);
  } else {
    testPlunge();
    testWeakPlunge();
    testFlipperShot();
    testSaucerLock();
    testNudgeTilt();
    testRamps();
    testMissionsAndWizard();
    testFullGame(7, 120, true);
    testFullGame(1234, 120, true);
  }
} catch (e) {
  console.error('  FAIL  exception:', e.message);
  failures++;
}
console.log(failures ? `\n${failures} FAILURE(S)` : '\nall tests passed');
process.exit(failures ? 1 : 0);
