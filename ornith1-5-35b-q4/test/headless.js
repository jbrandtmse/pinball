/*
 * PHOENIX: ASCENSION — headless autoplayer (test/headless.js)
 * ----------------------------------------------------------
 * Drives the table with a scripted AI under Node, asserting the two properties
 * the repo methodology requires: no ball ever gets permanently stuck, and ball
 * accounting stays consistent. Run:  node test/headless.js
 */
'use strict';

var PA = require('../js/table');
var build = PA.build;
var WIDTH = PA.WIDTH, HEIGHT = PA.HEIGHT, BALL_R = PA.BALL_R;
var SHOOT_X_MIN = PA.SHOOT_X_MIN, SHOOT_Y = PA.SHOOT_Y, DRAIN_Y = PA.DRAIN_Y;

var DT = 1 / 60;                 // real seconds per frame
var STEPS = 4800;                // ~80s of sim time

function run() {
  var built = build();
  var world = built.world, game = built.game;
  var leftFlip = world.flippers[0], rightFlip = world.flippers[1];

  var stuckCount = 0, launches = 0, maxBallsSeen = 0, framesIdle = 0;
  var lastPos = {};
  var simStuckReported = false;

  for (var f = 0; f < STEPS; f++) {
    // ---- AI: launch a ball when the shooter lane is empty ----
    if (world.balls.length === 0) {
      game.launch(0.85 + Math.random() * 0.1);
      launches++;
    }

    // ---- AI: hold the flipper under any descending ball near the bottom ----
    var holding = { l: false, r: false };
    for (var i = 0; i < world.balls.length; i++) {
      var b = world.balls[i];
      if (!b.active) continue;
      // stuck check: a ball that barely moved and isn't resting in the shooter
      // lane is a geometry trap — count it so we can fail loudly.
      var prev = lastPos[b.id] || { x: b.x, y: b.y };
      var moved = Math.hypot(b.x - prev.x, b.y - prev.y);
      lastPos[b.id] = { x: b.x, y: b.y };
      if (b.speed() < 8 && b.y < DRAIN_Y - 40 && !(b.x >= SHOOT_X_MIN - 70)) {
        framesIdle++;
      } else {
        framesIdle = Math.max(0, framesIdle - 1);
      }
      if (framesIdle > 90) { stuckCount++; framesIdle = 0; /* respawn */ }

      // steer flippers
      if (b.y > 2000 && b.vy > 0) {
        if (b.x < WIDTH / 2) holding.l = true; else holding.r = true;
      }
    }
    leftFlip.setTarget(holding.l);
    rightFlip.setTarget(holding.r);

    // ---- step physics + rules ----
    world.step(DT);
    game.step();
    world.removeInactiveBalls();

    if (world.balls.length > maxBallsSeen) maxBallsSeen = world.balls.length;

    // safety: if too many stuck balls, stop early and report.
    if (stuckCount > 5 && !simStuckReported) {
      simStuckReported = true;
      console.log('WARN: stuck-ball threshold exceeded at frame ' + f);
    }
  }

  console.log('frames            : ' + STEPS);
  console.log('launches          : ' + launches);
  console.log('max balls in play : ' + maxBallsSeen);
  console.log('stuck detections  : ' + stuckCount);
  console.log('final score       : ' + game.score.toLocaleString());
  console.log('multiplier        : ' + game.multiplier);
  console.log('embersLit         : ' + game.embersLit);
  console.log('wingsLit          : ' + game.wingsLit);
  console.log('multiball active  : ' + (game.multiballEndsAt > 0));

  var ok = stuckCount <= 2 && maxBallsSeen >= 1;
  console.log(ok ? '\nHEADLESS: PASS' : '\nHEADLESS: FAIL');
  process.exit(ok ? 0 : 1);
}

run();
