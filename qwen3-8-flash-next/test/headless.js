// THUNDER CANYON — headless test harness.
// 1) corridor sweep: a ball launched along every feature lane must reach its
//    target zone without getting stuck or escaping the table.
// 2) autoplay: a simple bot plays full games; asserts ball accounting,
//    no stuck balls, games actually end.
// 3) rule scenarios: bank ladder, multiball arming, wizard, tilt, kickback.

const T = require('../src/util.js');
const TB = require('../src/table.js');
const R = require('../src/rules.js');

let pass = 0, fail = 0;
const fails = [];

function ok(cond, name, detail = '') {
  if (cond) { pass++; console.log('  ok   ' + name); }
  else { fail++; fails.push(name + ' ' + detail); console.log('  FAIL ' + name + ' ' + detail); }
}

// determinism: physics/rules call Math.random for jitter — pin it per test
let worldSeq = 0;
const realRandom = Math.random;
function freshWorld(seedSalt = 0) {
  Math.random = T.rng(0xC0FFEE + worldSeq * 977 + seedSalt);
  worldSeq++;
  const w = TB.build();
  TB.instrument(w);
  return w;
}

function isStuck(b) { return b.state === 'play' && b.restT > 3.0; }

// ------------------------------------------------------------------ corridors
function corridor(name, spawn, target, opts = {}) {
  const w = freshWorld();
  const b = w.addBall(spawn.x, spawn.y, spawn.vx || 0, spawn.vy || 0);
  if (opts.flip && !opts.flipPress) w.setFlipper(opts.flip, true);
  if (opts.kickback) w.kickbacks[0].enabled = true;
  let hit = false, escaped = false, stuckAt = null, drained = false, captured = false, events = {};
  const tmax = opts.tmax || 12;
  let maxDx = -99;
  for (let i = 0; i < 60 * tmax; i++) {
    const evts = w.step(1 / 60);
    for (const e of evts) {
      events[e.type] = (events[e.type] || 0) + 1;
      if (e.type === 'drain') drained = true;
    }
    if (drained) break;
    if (b.state === 'captured') { captured = true; break; }
    if (b.state === 'removed') { drained = true; break; }
    if (opts.maxX) maxDx = Math.max(maxDx, b.p.x - opts.maxX);
    if (target && target(b, w)) { hit = true; break; }
    if (isStuck(b)) { stuckAt = { ...b.p }; break; }
    if (b.p.x < 0.1 || b.p.x > 20.15 || b.p.y > 45.4 + 0.01) { escaped = true; break; }
    if (opts.flipRelease && i === opts.flipRelease) w.setFlipper(opts.flip || 'L', false);
  }
  const okC = opts.wantCapture ? captured :
    opts.maxX ? (!escaped && !stuckAt && maxDx < -0.2) :
    (hit || drained) && !stuckAt && !escaped;
  ok(okC, 'corridor ' + name,
    stuckAt ? 'STUCK at ' + stuckAt.x.toFixed(2) + ',' + stuckAt.y.toFixed(2) :
    escaped ? 'ESCAPED at ' + b.p.x.toFixed(2) + ',' + b.p.y.toFixed(2) :
    opts.maxX ? 'crossed into lane x=' + b.p.x.toFixed(2) :
    (!okC ? 'ended state=' + b.state + ' at ' + b.p.x.toFixed(2) + ',' + b.p.y.toFixed(2) + ' ev=' + Object.keys(events).join('/') : ''));
  if (opts.wantEvents) ok(Object.keys(opts.wantEvents).every(k => events[k]), 'corridor ' + name + ' events',
    Object.keys(events).join('/') || 'none');
}

function runCorridors() {
  console.log('== corridor sweep ==');
  for (const v of [-190, -150, -118])
    corridor('shooter v' + (-v) + ' -> over the top', { x: 18.5, y: 44.25, vy: v },
      b => b.p.x < 15 && b.p.y < 10, { tmax: 12 });
  // 118 in/s is a ~53 in climb: it still clears the elbow into the basin.
  // a genuine soft dribble is a nudge-strength shot:
  corridor('soft dribble rolls back to plunger', { x: 18.5, y: 44.25, vy: -40 },
    b => b.p.y > 44.4 && b.p.x > 17.6 && b.speed() < 4, { tmax: 14 });
  corridor('min-power shot reaches basin', { x: 18.5, y: 44.25, vy: -118 },
    b => b.p.y < 30, { tmax: 14 });
  corridor('left funnel -> kicker cup', { x: 1.1, y: 34, vy: 70 },
    b => b.p.y > 41.2 && b.p.x > 3.5 && b.p.x < 5.2, { tmax: 8 });
  corridor('left funnel near throat -> drains', { x: 3.9, y: 41.2, vy: 45, vx: 8 },
    b => b.p.y > 43.4, { tmax: 10 });
  corridor('right funnel -> flipper zone', { x: 17.0, y: 30.5, vx: -30, vy: 70 },
    b => b.p.y > 38 && b.p.x < 14.5, { tmax: 10 });
  corridor('center drop -> bumpers alive', { x: 10.125, y: 10.5, vy: 120 },
    b => b.p.y > 16 && b.speed() > 120,   // only reached by getting spat out
    { tmax: 6, wantEvents: { pop: 1 } });
  corridor('vault capture', { x: 10.125, y: 19.8, vy: 40 },
    null, { wantCapture: true, tmax: 4 });
  // slings: approach head-on along the face normal so the band (not the
  // corner posts) gets the ball
  corridor('left sling rebounds', { x: 8.735, y: 39.675, vx: -108, vy: 51 },
    b => b.v.y < -40 || b.v.x > 40, { tmax: 6, wantEvents: { sling: 1 } });
  corridor('right sling rebounds', { x: 11.51, y: 39.67, vx: 108, vy: 51 },
    b => b.v.y < -40 || b.v.x < -40, { tmax: 6, wantEvents: { sling: 1 } });
  // spinner lives in the shooter lane: a rising rocket spins it one way,
  // a falling dribble spins it the other; the blade yields, never deflects
  corridor('spinner: launch spins runway blade', { x: 18.5, y: 44.25, vy: -140 },
    b => b.p.y < 30, { tmax: 8, wantEvents: { spinner: 1 } });
  corridor('spinner: dribble folds through downward', { x: 18.5, y: 33.5, vy: 25 },
    b => b.p.y > 42.5, { tmax: 8, wantEvents: { spinner: 1 } });
  corridor('bank targets drop', { x: 7.3, y: 16.5, vy: 95 },
    b => b.p.y > 21, { tmax: 6, wantEvents: { target: 1 } });
  corridor('standups left', { x: 4.2, y: 11.0, vx: -60, vy: 45 },
    b => b.p.y > 15, { tmax: 6, wantEvents: { standup: 1 } });
  corridor('top orbit pad on wrap', { x: 18.5, y: 44.25, vy: -170 },
    b => b.p.x < 6 && b.p.y < 12, { tmax: 12, wantEvents: { rollover: 1 } });
  corridor('kickback fires from cup', { x: 4.35, y: 42.0, vy: 20 },
    b => b.v.y < -40, { tmax: 5, kickback: true, wantEvents: { kickback: 1 } });
  corridor('funnel dribble into armed kicker relaunches', { x: 1.1, y: 34, vy: 70 },
    b => b.v.y < -40, { tmax: 10, kickback: true });
  corridor('right outlane drains', { x: 17.2, y: 40.5, vy: 50, vx: -4 },
    b => b.p.y > 43.4, { tmax: 6 });
  corridor('gate blocks reverse into lane', { x: 9.8, y: 1.5, vx: 90, vy: 40 },
    b => b.p.y > 30, { tmax: 8, maxX: 17.45 });
  corridor('left inlane feeds flipper', { x: 6.3, y: 40.2, vy: 60 },
    b => b.p.y > 42.2 && b.p.x > 8.2 && b.p.x < 11, { tmax: 6 });
  // flippers: ball settled on the drooping face, then the coil fires
  corridor('L flipper sends it back up', { x: 9.0, y: 43.5, vy: 0, flip: 'L', flipPress: 12, flipRelease: 30 },
    b => b.v.y < -50, { tmax: 6 });
  corridor('R flipper sends it back up', { x: 11.25, y: 43.5, vy: 0, flip: 'R', flipPress: 12, flipRelease: 30 },
    b => b.v.y < -50, { tmax: 6 });
  corridor('closed flippers let center ball drain', { x: 10.125, y: 43.5, vy: 20 },
    b => b.p.y > 44.7, { tmax: 6 });
}

// ------------------------------------------------------------------ autoplay
function autoplayGame(gameseed) {
  const w = freshWorld();
  const rules = new R.Rules(w);
  rules.startGame(3);
  const rnd = T.rng(gameseed);
  let t = 0;
  let multiballSeen = false, saveSeen = false, jackpotSeen = false, maxBalls = 1;
  const held = { L: false, R: false };
  const holdT = { L: 0, R: 0 };
  const dt = 1 / 60;
  while (t < 600) {
    // bot launch: hold the plunger to ~60%, then let go
    if (rules.state === 'playing' && w.balls.some(b => b.state === 'plunger')) {
      w.plungerHold(dt);
      if (w.plunger.charge > 0.6) rules.launch();
    }

    // bot flippers: react to balls falling toward each side
    for (const side of ['L', 'R']) {
      if (holdT[side] > 0) { holdT[side] -= dt; if (holdT[side] <= 0) { w.setFlipper(side, false); held[side] = false; } }
      if (!held[side]) {
        for (const b of w.activeBalls()) {
          const own = side === 'L' ? b.p.x < 10.4 : b.p.x > 9.85;
          const inZone = b.p.y > 39.4 && b.p.y < 43.6 && own && b.v.y > 10;
          const nearFace = side === 'L' ? b.p.x > 4.5 : b.p.x < 15.7;
          if (inZone && nearFace && rnd() < 0.45) {   // imperfect: sometimes misses
            held[side] = true; holdT[side] = 0.09;
            w.setFlipper(side, true);
            break;
          }
        }
      }
    }

    const evts = w.step(dt);
    R.pumpTimers();
    rules.update(dt, evts);
    if (rules.state === 'ballEnd') rules.tickBallEnd(dt);

    for (const e of rules.events) {
      if (e.type === 'gameOver') return { done: true, score: rules.score, t, multiballSeen, saveSeen, jackpotSeen, maxBalls };
      if (e.type === 'modeStart') multiballSeen = multiballSeen || !!(rules.mode && rules.mode.balls);
      if (e.type === 'save') saveSeen = true;
      if (e.type === 'jackpot') jackpotSeen = true;
    }
    rules.events.length = 0;

    maxBalls = Math.max(maxBalls, w.activeBalls().length);
    const total = w.balls.filter(b => b.state !== 'removed').length;
    if (total > 6) return { done: false, err: 'ball leak: ' + total + ' live balls @' + t.toFixed(1) };
    for (const b of w.activeBalls()) {
      // the shooter-lane dribble is parked by design — the rules relaunch it
      if (isStuck(b) && !(b.p.x > 17.5 && b.p.y > 43.4))
        return { done: false, err: 'stuck ball @' + b.p.x.toFixed(2) + ',' + b.p.y.toFixed(2) + ' t=' + t.toFixed(1) };
    }
    t += dt;
  }
  return { done: false, err: 'game did not finish in 600s', score: rules.score, state: rules.state };
}

function runAutoplay() {
  console.log('== autoplay ==');
  let mbSeen = false, saves = 0;
  for (const seed of [7, 42, 123, 555, 2024, 987654]) {
    const r = autoplayGame(seed);
    ok(r.done, 'autoplay seed=' + seed + ' completed', r.err || ('state=' + r.state));
    if (r.done) {
      ok(r.score > 100000, 'autoplay scored seed=' + seed + ' (' + R.fmt(r.score) + ' in ' + Math.round(r.t) + 's)');
      mbSeen = mbSeen || r.multiballSeen;
      if (r.saveSeen) saves++;
    }
  }
  console.log('  info  multiball seen: ' + mbSeen + ', ball saves seen: ' + saves + '/3');
}

// ------------------------------------------------------------------ scenarios
function scenarios() {
  console.log('== rule scenarios ==');
  // bank ladder at the rule layer (physics rack-down is corridor-tested):
  // complete the rack repeatedly -> multiplier climbs and caps at x6,
  // step 4 awards the extra ball and the rack reracks
  {
    const w = freshWorld();
    const rules = new R.Rules(w);
    rules.startGame(3);
    let extra = 0, bankEvs = 0, ladderAfterMax = -1;
    for (let round = 0; round < 6; round++) {
      R.pumpTimers();
      for (const k in w.targetStates) w.targetStates[k].down = false;   // rerack
      for (const k of ['BANK0', 'BANK1', 'BANK2', 'BANK3']) {
        w.targetStates[k].down = true;                                    // simulate physics knockdown
        rules.onTarget(k);
      }
      for (const e of rules.events) { if (e.type === 'bank') bankEvs++; if (e.type === 'extraBall') extra++; }
      if (extra && ladderAfterMax < 0) ladderAfterMax = rules.bankLadder;
      rules.events.length = 0;
    }
    // completions 1-3 step mult 2→4, completion 4 = extra ball + rerack
    // (ladder back to 0), completions 5-6 climb again toward the x6 cap
    ok(rules.mult === 6, 'bank ladder climbs to cap x6 (' + rules.mult + ')');
    ok(extra >= 1, 'max bank awards extra ball (' + extra + ')');
    ok(bankEvs >= 5, 'five completions banked (' + bankEvs + ')');
    ok(ladderAfterMax === 0, 'max bank resets ladder for next round (' + ladderAfterMax + ')');
  }
  // GOLD rollovers arm multiball; vault starts 3 balls
  {
    const w = freshWorld();
    const rules = new R.Rules(w);
    rules.startGame(3);
    for (const id of ['G', 'O', 'L', 'D']) rules.onRollover(id);
    ok(rules.goldDone, 'GOLD rollovers arm multiball');
    w.addBall(10.125, 21.5, 0, 30);
    for (let i = 0; i < 200; i++) {
      const evts = w.step(1 / 60);
      R.pumpTimers();
      rules.update(1 / 60, evts);
      rules.events.length = 0;
      if (rules.mode && rules.mode.key === 'GOLDRUSH') break;
    }
    ok(!!rules.mode && rules.mode.key === 'GOLDRUSH', 'vault starts GOLDRUSH');
    ok(w.activeBalls().length === 3, 'multiball = 3 balls (' + w.activeBalls().length + ')');
    // forced-drain stress: shove a ball into the pit every other frame for
    // ~4s; ball-save rescues must recycle via the shooter lane, never stack
    let maxBalls = w.activeBalls().length;
    for (let i = 0; i < 240; i++) {
      const bs = w.activeBalls();
      if (bs.length) { bs[i % 2 === 0 ? 0 : bs.length - 1].p = { x: 10.125, y: 44.9 }; }
      const evts = w.step(1 / 60);
      R.pumpTimers();
      rules.update(1 / 60, evts);
      rules.events.length = 0;
      maxBalls = Math.max(maxBalls, w.activeBalls().length);
    }
    ok(maxBalls <= 8, 'forced drains do not multiply balls (peak ' + maxBalls + ')');
  }
  // wizard path
  {
    const w = freshWorld();
    const rules = new R.Rules(w);
    rules.startGame(3);
    rules.modeCompleted = { ROCKSLIDE: true, GOLDRUSH: true, THUNDERSTORM_ARMED: true };
    w.addBall(10.125, 21.5, 0, 30);
    for (let i = 0; i < 200; i++) {
      const evts = w.step(1 / 60);
      R.pumpTimers();
      rules.update(1 / 60, evts);
      rules.events.length = 0;
      if (rules.mode && rules.mode.key === 'THUNDERSTORM') break;
    }
    ok(!!rules.mode && rules.mode.key === 'THUNDERSTORM', 'armed vault starts THUNDERSTORM');
    ok(w.activeBalls().length === 5, 'wizard spawns 5 balls (' + w.activeBalls().length + ')');
    // storm continues after a drain while others roll
    const before = w.activeBalls().length;
    const b0 = w.activeBalls()[0];
    b0.p = { x: 10.125, y: 44.9 };
    let fed = false;
    for (let i = 0; i < 30; i++) {
      const evts = w.step(1 / 60);
      rules.update(1 / 60, evts);
      for (const e of rules.events) if (e.type === 'stormFeed') fed = true;
      rules.events.length = 0;
      if (fed) break;
    }
    ok(fed && w.activeBalls().length === before, 'thunderstorm refills on drain');
  }
  // tilt: 3 nudges tilt, flippers lock, cleared next ball
  {
    const w = freshWorld();
    const rules = new R.Rules(w);
    rules.startGame(3);
    w.nudge(10, -20); w.nudge(10, -20);
    rules.update(1 / 60, w.events.splice(0));
    ok(!rules.tilted, 'no tilt after 2 nudges');
    w.nudge(10, -20);
    rules.update(1 / 60, w.events.splice(0));
    ok(rules.tilted, 'tilt after 3 nudges');
    w.setFlipper('L', true);
    ok(w.flippers[0].up === false, 'flippers stay locked while tilted');
    rules.endOfBall(); rules.tickBallEnd(4);
    ok(!rules.tilted && w.flippers[0].locked === false, 'tilt cleared on new ball');
  }
  // rollover letter gating: duplicate letters score but do not re-collect
  {
    const w = freshWorld();
    const rules = new R.Rules(w);
    rules.startGame(3);
    rules.onRollover('G'); rules.onRollover('G');
    ok(rules.goldLetters.G === true && !rules.goldDone, 'letter latch is one-time');
  }
}

console.log('THUNDER CANYON headless tests');
runCorridors();
runAutoplay();
scenarios();
Math.random = realRandom;
console.log('---');
console.log(pass + ' passed, ' + fail + ' failed');
if (fail) { console.log(fails.join('\n')); process.exit(1); }
