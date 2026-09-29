// Rules scenario tests: drive the game ROM with synthetic switch events and
// check the rule stack (skill shot, lanes, locks, multiball, jackpots, jobs,
// wizard mode, extra ball, tilt, bonus, match, high score entry).
import { Machine } from '../src/game/machine.js';
import { Game, JOB_DEFS } from '../src/game/rules.js';
import { DMDController } from '../src/display/dmd.js';

let passed = 0, failed = 0;
function check(cond, msg) { if (cond) passed++; else { failed++; console.log('  FAIL:', msg); } }

function setup() {
  const m = new Machine();
  const dmd = new DMDController();
  let saved = null;
  const g = new Game(m, { dmd, storage: { load: () => saved, save: (v) => { saved = v; } } });
  const run = (sec, dt = 1 / 120) => { for (let t = 0; t < sec; t += dt) { m.update(dt); g.update(dt); dmd.update(dt); } };
  // Take the ball out of the shooter lane and park it mid-playfield, frozen,
  // so physics doesn't interfere with synthetic switch events.
  const park = () => {
    for (const b of m.world.balls) if (b.mode === 'pf') { b.x = 9.3; b.y = 28; b.vx = 0; b.vy = 0; b.mode = 'held'; b.heldBy = 'test'; }
  };
  const sw = (id, info = {}) => { m.sw(id, info); };
  const hit = (id, speed = 60) => { m.world.emit({ type: 'hit', id, speed, ball: 0 }); m.processEvents(); };
  const capture = (dev) => {
    const b = m.world.addBall(dev === 'vault' ? 7.6 : 15.95, dev === 'vault' ? 13.3 : 17.7);
    m.trough--;
    m.capture(dev, b); m.processEvents();
    return b;
  };
  const drainAll = () => {
    for (const b of [...m.world.balls]) { if (b.mode === 'gone') continue; m.world.removeBall(b); m.trough++; m.sw('drain', {}); }
    m.serveQueue = 0; m.autoLaunchPending = 0;
  };
  return { m, g, dmd, run, park, sw, hit, capture, drainAll, get saved() { return saved; } };
}

// ---------------------------------------------------------------- tests
function testStartAndSkill() {
  const T = setup();
  T.g.pressStart();
  T.run(1.0);
  check(T.g.state === 'playing', 'game playing after start');
  check(T.m.shooterLaneBall(), 'ball served to shooter lane');
  const lane = T.g.skill.lane;
  T.sw('gateShooter');
  T.sw(['laneK', 'laneE', 'laneY'][lane]);
  check(T.g.events.some(e => e.type === 'skillShot'), 'skill shot awarded for lit lane');
  check(T.g.p.score >= 1_000_000, 'skill shot scores >= 1M');
}

function testKeyLanes() {
  const T = setup();
  T.g.pressStart(); T.run(0.5); T.park();
  T.sw('gateShooter'); T.g.skill.active = false;
  T.sw('laneK'); T.sw('laneE'); T.sw('laneY');
  check(T.g.p.bonusX === 2, 'KEY completion advances bonus to 2X');
  T.run(0.5);
  check(T.g.p.lanes.every(l => !l), 'lanes reset after completion');
}

function testLockAndMultiball() {
  const T = setup();
  T.g.pressStart(); T.run(0.5); T.park(); T.sw('gateShooter');
  const p = T.g.p;
  for (let lock = 1; lock <= 3; lock++) {
    T.hit('drop1'); T.hit('drop2'); T.hit('drop3');
    check(p.lockLit, `lock ${lock} lit after laser grid`);
    for (let i = 0; i < p.doorHitsNeeded; i++) { T.hit('vaultDoor'); }
    check(T.m.doorOpen, `door opens for lock ${lock} (needed ${p.doorHitsNeeded} hits)`);
    T.capture('vault');
    if (lock < 3) {
      check(p.locks === lock, `ball ${lock} locked`);
      T.run(4.5);
      check(!T.m.doorOpen, `door closes after lock ${lock}`);
      check(T.m.dropsDown.every(d => !d), `drops reset after lock ${lock}`);
      check(T.m.heldCount('vault') === 0, 'vault ejected ball');
    }
  }
  check(!!T.g.mb, 'vault multiball started on third lock');
  T.run(3.2);
  check(T.m.ballsInPlay() >= 3, `multiball has 3 balls in play (${T.m.ballsInPlay()})`);
  // collect all four jackpots
  T.sw('orbitL', { vy: -100 }); T.sw('rampLMade'); T.sw('rampRMade'); T.sw('orbitR', { vy: -100 });
  check(T.g.events.filter(e => e.type === 'jackpot').length === 4, 'four jackpots collected');
  check(T.g.mb.superLit && T.m.doorOpen, 'super jackpot lit, vault open');
  T.capture('vault');
  check(T.g.events.some(e => e.type === 'superJackpot'), 'super jackpot collected');
  // end multiball: drain down to one ball
  T.run(3);
  T.g.ballSaveUntil = 0; T.m.serveQueue = 0; T.m.autoLaunchPending = 0;
  const live = T.m.world.balls.filter(b => b.mode !== 'gone');
  for (const b of live.slice(1)) { T.m.world.removeBall(b); T.m.trough++; T.m.sw('drain', {}); }
  T.m.serveQueue = 0;
  check(!T.g.mb, 'multiball ends when one ball remains');
  check(T.g.p.extraBallLit, 'first multiball lights extra ball');
}

function testJobs() {
  const T = setup();
  T.g.pressStart(); T.run(0.5); T.park(); T.sw('gateShooter');
  const p = T.g.p;
  check(p.jobLit, 'first job lit at game start');
  T.capture('hideout');
  T.run(0.5);
  check(T.g.state === 'jobselect', 'hideout opens job selection');
  T.g.onButton('right', true);
  const chosen = T.g.jobChoices[T.g.jobSel];
  T.g.pressStart();
  check(T.g.job && T.g.job.idx === chosen, 'selected job starts');
  T.run(2);
  check(T.m.heldCount('hideout') === 0, 'hideout releases ball after selection');
  // complete CASE THE JOINT directly if chosen, otherwise let it time out
  if (T.g.job.id === 'CASE') {
    for (const s of ['orbitL', 'orbitR']) T.sw(s, { vy: -100 });
    T.sw('rampLMade'); T.sw('rampRMade'); T.capture('hideout');
    check(T.g.events.some(e => e.type === 'jobComplete'), 'CASE completes');
  } else {
    // unpark a ball so the job timer runs, then let it time out
    for (const b of T.m.world.balls) if (b.mode === 'held' && b.heldBy === 'test') { b.mode = 'pf'; b.heldBy = null; b.x = 9.3; b.y = 30; }
    const saveT = T.g.job.time;
    T.run(saveT + 1);
    check(!T.g.job, 'job times out');
  }
  check(p.jobsPlayed.length === 1, 'job recorded as played');
  // relight with 3 orbits
  T.park();
  for (let i = 0; i < 3; i++) T.sw('orbitL', { vy: -100 });
  check(p.jobLit, 'three loops relight the job');
}

function testWizard() {
  const T = setup();
  T.g.pressStart(); T.run(0.5); T.park(); T.sw('gateShooter');
  const p = T.g.p;
  p.jobsPlayed = JOB_DEFS.map((_, i) => i); p.jobLit = true;
  T.capture('hideout');
  T.run(0.5);
  check(!!T.g.wizard, 'all jobs played lights THE BIG SCORE');
  T.run(4);
  check(T.m.ballsInPlay() >= 4, `wizard is 4-ball (${T.m.ballsInPlay()})`);
  T.sw('orbitL', { vy: -100 }); T.sw('rampLMade'); T.sw('rampRMade'); T.sw('orbitR', { vy: -100 });
  T.hit('drop1'); // no-op
  check(T.g.wizard.superLit, 'wizard super lit after all shots (vault shot excluded)');
}

function testExtraBallAndDrain() {
  const T = setup();
  T.g.pressStart(); T.run(0.5); T.park(); T.sw('gateShooter');
  const p = T.g.p;
  p.extraBallLit = true;
  p.jobLit = false;
  T.capture('hideout');
  T.run(2.5);
  check(p.extraBalls === 1, 'extra ball collected at hideout');
  T.g.ballSaveUntil = 0;
  T.drainAll();
  check(T.g.state === 'bonus', 'drain with no balls -> bonus count');
  T.run(12);
  check(T.g.state === 'playing' && p.ball === 1, 'extra ball: same player shoots again on ball 1');
}

function testTiltAndGameOver() {
  const T = setup();
  T.g.pressStart(); T.run(0.5); T.park(); T.sw('gateShooter');
  T.sw('tilt'); T.sw('tilt'); T.sw('tilt');
  check(T.g.tilted, 'third warning tilts');
  check(!T.m.flippersEnabled, 'flippers dead after tilt');
  T.drainAll();
  T.run(3);
  check(T.g.p.ball === 2 && !T.g.tilted, 'next ball after tilt, tilt cleared');
  // play out remaining balls quickly
  for (let b = 0; b < 2; b++) { T.run(1); T.park(); T.sw('gateShooter'); T.g.ballSaveUntil = 0; T.drainAll(); T.run(12); }
  check(['match', 'hsentry', 'gameover', 'attract', 'hswait'].includes(T.g.state), `game over after 3 balls (${T.g.state})`);
}

function testHighScore() {
  const T = setup();
  T.g.pressStart(); T.run(0.5); T.park(); T.sw('gateShooter');
  T.g.p.score = 999_000_000;
  for (let b = 0; b < 3; b++) { T.g.ballSaveUntil = 0; T.drainAll(); T.run(12); if (b < 2) { T.run(1); T.park(); T.sw('gateShooter'); } }
  T.run(4);
  check(T.g.state === 'hsentry', `high score entry after big game (${T.g.state})`);
  T.g.onButton('right', true); T.g.pressStart(); T.g.pressStart(); T.g.pressStart();
  T.run(3);
  check(T.saved && T.saved[0].score === 999_000_000 + T.g.lastScores[0] - 999_000_000, 'grand champion saved');
  check(T.saved && T.saved[0].name.startsWith('B'), `initials recorded (${T.saved && T.saved[0].name})`);
  T.run(6);
  check(T.g.state === 'attract', 'back to attract mode');
}

function testMultiplayer() {
  const T = setup();
  T.g.pressStart(); T.g.pressStart(); T.g.pressStart();
  check(T.g.players.length === 3, 'three players added during ball 1');
  T.run(0.5); T.park(); T.sw('gateShooter');
  T.g.ballSaveUntil = 0; T.drainAll(); T.run(12);
  check(T.g.pi === 1, 'player 2 up after player 1 drains');
}

const tests = [testStartAndSkill, testKeyLanes, testLockAndMultiball, testJobs, testWizard, testExtraBallAndDrain, testTiltAndGameOver, testHighScore, testMultiplayer];
for (const t of tests) {
  const before = failed;
  try { t(); } catch (e) { failed++; console.log('  ERROR in', t.name, e.stack); }
  console.log(`${failed === before ? 'ok  ' : 'FAIL'} ${t.name}`);
}
console.log(`rules: ${passed} checks passed, ${failed} failed`);
process.exit(failed ? 1 : 0);
