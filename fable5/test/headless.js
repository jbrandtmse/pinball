/* DRAGON'S KEEP — headless playtest rig.
 * Runs the shared physics/rules in Node: scenario tests + full autoplayed
 * games with invariants (no NaN, no out-of-bounds, no stuck balls, ball
 * accounting, game completes). Usage: node test/headless.js [--long]
 */
"use strict";
require("../js/constants.js");
require("../js/physics.js");
require("../js/layout.js");
require("../js/dmdfont.js");
require("../js/dmd.js");
require("../js/game.js");

const DK = globalThis.DK;
const C = DK.C;
const M = DK.M;

let failures = 0, checks = 0;
function ok(cond, msg, detail) {
  checks++;
  if (!cond) {
    failures++;
    console.error("  FAIL: " + msg + (detail ? "  [" + detail + "]" : ""));
  }
  return cond;
}
function section(name) { console.log("== " + name); }

function makeEnv(seed) {
  const world = new DK.Physics.World();
  const layout = DK.Layout.build(world);
  let saved = null;
  const game = new DK.Game({
    world, layout,
    rng: M.rng(seed),
    storage: { load: () => saved, save: (o) => { saved = o; } }
  });
  const env = { world, layout, game, seed, frames: 0, still: new Map(), stuck: [] };
  env.step = function (n) {
    for (let i = 0; i < n; i++) {
      game.update(1 / 60);
      game.sfxQ.length = 0; game.fxQ.length = 0;
      env.frames++;
      env.checkInvariants();
    }
  };
  env.checkInvariants = function () {
    // accounting
    if (!ok(world.balls.length + game.trough === C.BALLS_TOTAL,
      "ball accounting", `balls=${world.balls.length} trough=${game.trough} f=${env.frames}`)) {
      throw new Error("accounting broken");
    }
    for (const b of world.balls) {
      if (!ok(isFinite(b.x) && isFinite(b.y) && isFinite(b.vx) && isFinite(b.vy), "finite ball state")) {
        throw new Error("NaN ball");
      }
      if (b.held || b.locked || b.onRamp || b.toss) { env.still.delete(b.id); continue; }
      ok(b.x > -25 && b.x < 565 && b.y > -35 && b.y < 1145, "ball in bounds",
        `(${b.x.toFixed(0)},${b.y.toFixed(0)}) f=${env.frames}`);
      // stuck tracking (game's own ball search should rescue before 22s)
      const inShooter = b.x > C.SHOOT_X0 && b.y > 950;
      const slow = Math.hypot(b.vx, b.vy) < 22;
      if (game.state === "playing" && slow && !inShooter) {
        const rec = env.still.get(b.id) || { t: 0, x: b.x, y: b.y };
        if (Math.hypot(b.x - rec.x, b.y - rec.y) > 24) { rec.t = 0; rec.x = b.x; rec.y = b.y; }
        rec.t += 1 / 60;
        env.still.set(b.id, rec);
        if (rec.t > 22) {
          env.stuck.push({ x: b.x, y: b.y, f: env.frames });
          rec.t = -1e9; // report once
        }
      } else env.still.delete(b.id);
    }
  };
  env.clearBalls = function () {
    for (const b of world.balls.slice()) { world.removeBall(b); game.trough++; }
    game.lockedBalls = [];
    game.holdQ = game.holdQ.filter((h) => !h.ball);
    game.serveQ = 0;
  };
  env.spawn = function (x, y, vx, vy) {
    const b = world.addBall(x, y);
    b.vx = vx; b.vy = vy;
    game.trough--;
    return b;
  };
  env.forceDrainAll = function () {
    game.ballSave = 0; game.ballSaveUsed = true;
    for (const b of world.balls.slice()) {
      if (b.locked) continue;
      b.held = false; b.onRamp = null; b.toss = null;
      b.x = 270; b.y = 1085; b.vx = 0; b.vy = 500;
    }
  };
  env.waitFor = function (pred, maxFrames, what) {
    for (let i = 0; i < maxFrames; i++) {
      env.step(1);
      if (pred()) return true;
    }
    ok(false, "timeout waiting for " + what,
      `state=${game.state} balls=${world.balls.length} f=${env.frames}`);
    return false;
  };
  return env;
}

// ---------------------------------------------------------------- scenarios
function testBoot() {
  section("boot & attract");
  const env = makeEnv(1);
  env.step(120);
  ok(env.game.state === "attract", "attract state");
  ok(env.game.dmd.buf.some((v) => v > 0), "attract DMD draws");
}

function testQuickTap() {
  section("plunger quick tap fires");
  const env = makeEnv(2);
  const g = env.game;
  g.action("start", true); g.action("start", false);
  env.waitFor(() => g.ballInShooter(), 240, "serve");
  // quick tap: down and up on consecutive frames
  g.action("plunge", true);
  env.step(1);
  g.action("plunge", false);
  ok(g.stats.launches === 1, "launch fired on tap", "launches=" + g.stats.launches);
  const b = env.world.balls[0];
  env.step(90);
  ok(b.y < 980 || b.x < C.SHOOT_X0, "ball left plunger seat", `y=${b.y.toFixed(0)}`);
}

function testFullPlunge() {
  section("full plunge reaches top lanes");
  const env = makeEnv(3);
  const g = env.game;
  let keyed = 0, launched = 0;
  const oldSense = g.senseKey.bind(g);
  g.senseKey = (i, e) => { keyed++; oldSense(i, e); };
  const oldLaunch = g.onLaunched.bind(g);
  g.onLaunched = () => { launched++; oldLaunch(); };
  g.action("start", true); g.action("start", false);
  env.waitFor(() => g.ballInShooter(), 240, "serve");
  g.action("plunge", true);
  env.step(85); // ~1.4s = full charge
  g.action("plunge", false);
  env.waitFor(() => launched > 0, 120, "launched sensor");
  env.waitFor(() => keyed > 0 || g.spinner.vel > 0.1 || env.world.balls[0].y > 600, 420, "ball into upper playfield");
  ok(launched > 0, "launched");
}

function testAimedShots() {
  section("every major shot physically reachable");
  const shots = [
    { name: "orbitL", from: [330, 1015], to: [48, 520], ev: "orbitL" },
    { name: "rampL", from: [330, 1010], to: [149, 500], ev: "rampL" },
    { name: "catapult", from: [240, 1010], to: [240, 500], ev: "catapult" },
    { name: "castle gate", from: [300, 1010], to: [360, 420], ev: "castle" },
    { name: "rampR", from: [200, 1010], to: [412, 545], ev: "rampR" },
    { name: "orbitR", from: [200, 995], to: [490, 525], ev: "orbitR" },
    { name: "scoop", from: [310, 1010], to: [100, 720], ev: "scoop" },
    { name: "drops", from: [260, 1010], to: [296, 530], ev: "drop" }
  ];
  for (const s of shots) {
    const env = makeEnv(4);
    const g = env.game;
    g.action("start", true); g.action("start", false);
    env.waitFor(() => g.ballInShooter(), 240, "serve");
    env.clearBalls();
    let made = false;
    const oldReg = g.registerShot.bind(g);
    g.registerShot = (n) => { if (n === s.ev) made = true; oldReg(n); };
    const oldDrop = g.hitDrop.bind(g);
    g.hitDrop = (i, e) => { if (s.ev === "drop") made = true; oldDrop(i, e); };
    const oldCata = g.senseCatapult.bind(g);
    g.senseCatapult = (e) => { if (s.ev === "catapult") made = true; oldCata(e); };
    const oldScoop = g.senseScoop.bind(g);
    g.senseScoop = (e) => { if (s.ev === "scoop") made = true; oldScoop(e); };
    const dx = s.to[0] - s.from[0], dy = s.to[1] - s.from[1];
    const len = Math.hypot(dx, dy);
    const sp = 2100; // representative flipper exit speed after tuning
    env.spawn(s.from[0], s.from[1], (dx / len) * sp, (dy / len) * sp);
    for (let i = 0; i < 180 && !made; i++) env.step(1);
    ok(made, "shot reachable: " + s.name);
  }
}

function testCastleAndMultiball() {
  section("castle stages, locks, multiball");
  const env = makeEnv(5);
  const g = env.game;
  g.action("start", true); g.action("start", false);
  env.waitFor(() => g.ballInShooter(), 240, "serve");

  function shootGate() {
    env.clearBalls();
    env.spawn(370, 700, 1, -1900);
    env.step(60); // ball hits gate, cleared before it can drain
  }
  // castle 1: bridge 3 + gate 2 hits
  let guard = 0;
  while (g.p.castleStage < 2 && guard++ < 30) shootGate();
  ok(g.p.castleStage === 2, "castle 1 open", "stage=" + g.p.castleStage + " hits=" + g.p.castleHits);
  env.clearBalls();
  env.spawn(370, 700, 2, -1750);
  env.waitFor(() => g.p.locks === 1, 400, "lock 1");
  ok(g.p.castles === 1, "castle 1 destroyed");
  env.waitFor(() => g.ballInShooter(), 400, "serve after lock");

  // castle 2 (needs 5+3)
  guard = 0;
  while (g.p.castleStage < 2 && guard++ < 40) shootGate();
  ok(g.p.castleStage === 2, "castle 2 open");
  env.clearBalls();
  env.spawn(370, 700, -2, -1750);
  env.waitFor(() => g.p.locks === 2, 400, "lock 2");
  env.waitFor(() => g.ballInShooter(), 400, "serve after lock 2");

  // castle 3 -> multiball
  guard = 0;
  while (g.p.castleStage < 2 && guard++ < 50) shootGate();
  ok(g.p.castleStage === 2, "castle 3 open");
  env.clearBalls();
  env.spawn(370, 700, 1, -1750);
  env.waitFor(() => !!g.mb, 500, "multiball start");
  ok(g.mb && g.mb.type === "castle", "castle multiball running");
  env.waitFor(() => g.ballsInPlay() >= 3, 900, "3 balls in play");

  // drain down to 1 -> multiball ends
  g.ballSave = 0; g.ballSaveUsed = true;
  let dropped = 0;
  env.waitFor(() => {
    if (g.ballsInPlay() > 1 && dropped < 2) {
      const b = env.world.balls.find((x) => x.active && !x.locked && !x.held && !x.onRamp && !x.toss);
      if (b) { g.ballSave = 0; b.x = 270; b.y = 1085; b.vx = 0; b.vy = 500; dropped++; }
    }
    return !g.mb && g.ballsInPlay() <= 1;
  }, 1500, "multiball ends");
  ok(!g.mb, "multiball over");
  ok(g.p.mbPlayed >= 1, "mbPlayed recorded");
}

function testTilt() {
  section("tilt");
  const env = makeEnv(6);
  const g = env.game;
  g.action("start", true); g.action("start", false);
  env.waitFor(() => g.ballInShooter(), 240, "serve");
  g.action("plunge", true); env.step(40); g.action("plunge", false);
  env.step(60);
  g.action("nudgeL", true); g.action("nudgeL", false);
  g.action("nudgeR", true); g.action("nudgeR", false);
  g.action("nudgeU", true); g.action("nudgeU", false);
  g.action("nudgeU", true); g.action("nudgeU", false);
  ok(g.tilt, "tilted after rapid nudges");
  env.forceDrainAll();
  env.waitFor(() => g.state === "playing" && !g.tilt && g.ballNum === 2, 1200, "next ball after tilt");
  ok(g.ballNum === 2, "advanced to ball 2");
}

function testHighScore() {
  section("high score entry");
  const env = makeEnv(7);
  const g = env.game;
  g.action("start", true); g.action("start", false);
  for (let ball = 0; ball < 3; ball++) {
    env.waitFor(() => g.ballInShooter() && g.state === "playing", 700, "serve b" + ball);
    g.p.score = 500000000 + ball; // guarantee GC (and avoid replay knock timing issues)
    env.forceDrainAll();
    env.waitFor(() => g.state !== "playing" || g.ballInShooter(), 900, "ball end " + ball);
  }
  env.waitFor(() => g.state === "hiscore", 900, "initials entry");
  ok(g.state === "hiscore", "in hiscore state", "state=" + g.state);
  g.typeChar("F"); g.typeChar("A"); g.typeChar("B");
  env.step(30);
  ok(g.hsTable.gc.ini === "FAB", "GC initials saved", JSON.stringify(g.hsTable.gc));
  env.waitFor(() => g.state === "attract", 600, "back to attract");
}

// ---------------------------------------------------------------- autoplay
function autoplayGame(seed, maxMinutes) {
  const env = makeEnv(seed);
  const g = env.game;
  const rnd = M.rng(seed * 7919 + 13);
  g.action("start", true); g.action("start", false);

  let plungeState = 0, plungeTimer = 0, flipLT = 0, flipRT = 0, nudgeT = 0;
  const maxFrames = maxMinutes * 60 * 60;
  let f = 0;
  while (g.state !== "attract" && f < maxFrames) {
    f++;
    // plunger
    if (g.state === "playing") {
      const bs = g.ballInShooter();
      if (bs && g.autoPlunge <= 0 && plungeState === 0 && !g.plunger.held) {
        plungeState = 1; plungeTimer = 20 + Math.floor(rnd() * 70); // sometimes weak, sometimes full
        if (rnd() < 0.15) plungeTimer = 1; // quick taps too
        g.action("plunge", true);
      } else if (plungeState === 1) {
        if (--plungeTimer <= 0) { g.action("plunge", false); plungeState = 0; }
      }
      if (!bs && plungeState === 1) { g.action("plunge", false); plungeState = 0; }
      // flippers: press when a ball is descending into the flipper zone
      let wantL = false, wantR = false;
      for (const b of env.world.balls) {
        if (b.held || b.locked || b.onRamp || b.toss) continue;
        const slow = Math.hypot(b.vx, b.vy) < 30;
        if (b.y > 920 && b.y < 1075) {
          if (b.x < 270 && (b.vy > 0 || slow)) wantL = true;
          if (b.x >= 270 && (b.vy > 0 || slow)) wantR = true;
        }
      }
      if (wantL && flipLT <= 0 && rnd() < 0.3) flipLT = 9 + Math.floor(rnd() * 6);
      if (wantR && flipRT <= 0 && rnd() < 0.3) flipRT = 9 + Math.floor(rnd() * 6);
      if (flipLT > 0) { g.action("flipL", true); if (--flipLT <= 0) g.action("flipL", false); }
      else g.action("flipL", false);
      if (flipRT > 0) { g.action("flipR", true); if (--flipRT <= 0) g.action("flipR", false); }
      else g.action("flipR", false);
      // occasional nudge
      if (--nudgeT <= 0 && rnd() < 0.002) {
        nudgeT = 420;
        g.action(rnd() < 0.5 ? "nudgeL" : "nudgeR", true);
      }
    } else if (g.state === "hiscore") {
      if (f % 20 === 0) g.typeChar("ACE"[Math.floor(rnd() * 3)]);
    }
    env.step(1);
  }
  const p0 = g.players[0];
  return {
    env, frames: f,
    completed: g.state === "attract",
    score: p0 ? p0.score : -1,
    stats: g.stats, stuck: env.stuck
  };
}

function testAutoplay(long) {
  section("full autoplayed games");
  const seeds = long ? [11, 22, 33, 44, 55, 66] : [11, 22, 33];
  for (const s of seeds) {
    const r = autoplayGame(s, 14);
    ok(r.completed, "game " + s + " completed", "frames=" + r.frames);
    ok(r.score > 0, "game " + s + " scored", "score=" + r.score);
    ok(r.stuck.length === 0, "game " + s + " no stuck balls",
      r.stuck.map((z) => `(${z.x.toFixed(0)},${z.y.toFixed(0)})`).join(" "));
    ok(r.stats.rescues <= 2, "game " + s + " few rescues", "rescues=" + r.stats.rescues);
    console.log(`   seed ${s}: score=${M.fmtScore(Math.max(0, r.score))} drains=${r.stats.drains} ` +
      `launches=${r.stats.launches} switches=${r.stats.switches} rescues=${r.stats.rescues} ` +
      `(oob=${r.stats.oob || 0} phantom=${r.stats.phantom || 0} hard=${JSON.stringify(r.stats.hardAt || [])}) simMin=${(r.frames / 3600).toFixed(1)}`);
  }
}

// ---------------------------------------------------------------- run
const long = process.argv.includes("--long");
const t0 = Date.now();
try {
  testBoot();
  testQuickTap();
  testFullPlunge();
  testAimedShots();
  testCastleAndMultiball();
  testTilt();
  testHighScore();
  testAutoplay(long);
} catch (e) {
  failures++;
  console.error("EXCEPTION: " + (e.stack || e));
}
console.log(`\n${checks} checks, ${failures} failures  (${((Date.now() - t0) / 1000).toFixed(1)}s)`);
process.exit(failures ? 1 : 0);
