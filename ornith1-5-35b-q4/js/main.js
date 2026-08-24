/*
 * PHOENIX: ASCENSION — game loop + input (main.js)
 * --------------------------------------------------------------------
 * Wires the table to a browser canvas: builds the world/rules, runs the real
 * fixed-timestep loop (world.step -> game.step -> render each animation frame),
 * and maps keyboard input to flippers and the plunger. This file is browser-only;
 * it must load AFTER engine.js, table.js, and render.js so PA.build / PA.Renderer
 * exist.
 *
 * Loop cadence: requestAnimationFrame drives frames (~60Hz). Each frame we pass
 * the real elapsed time to world.step(), which internally substeps at 1/240s —
 * matching the headless test rig's physics while running at real game speed.
 */
(function () {
  'use strict';

  var canvas = document.getElementById('table');
  if (!canvas) { console.error('main.js: #table canvas not found'); return; }

  // Build the table (world + rules controller).
  var inst = PA.build();
  var world = inst.world;
  var game = inst.game;

  var renderer = new PA.Renderer(canvas);

  // Left / right flippers. Engine flipper order matches makeFlipper('l'/'r').
  var FLIP_L = world.flippers[0];
  var FLIP_R = world.flippers[1];

  // ----------------------------------------------------------------------
  // Fixed-timestep loop.
  // ----------------------------------------------------------------------
  var last = performance.now();
  var rafId = 0;

  function frame(now) {
    var dtSec = (now - last) / 1000;
    last = now;
    if (dtSec > 0.05) dtSec = 0.05;   // clamp big gaps (tab switch) to avoid spiral-of-death

    world.step(dtSec);   // physics: internal accumulator + substeps at 1/240
    game.step();         // rules: drain detection, kickout, slinger decay, high score
    renderer.render(game);
    world.removeInactiveBalls();

    rafId = requestAnimationFrame(frame);
  }

  function startLoop() {
    if (rafId) return;
    last = performance.now();
    rafId = requestAnimationFrame(frame);
  }
  function stopLoop() {
    if (rafId) { cancelAnimationFrame(rafId); rafId = 0; }
  }

  // ----------------------------------------------------------------------
  // Input. Flippers latch while a key is held; the plunger charges on hold and
  // launches on release (floored so a quick tap still reaches the upper field).
  // ----------------------------------------------------------------------
  var LAUNCH_KEYS = { Space: true, Enter: true };
  var charging = false;
  var pressTime = 0;

  function setFlipper(side, up) {
    var f = side === 'l' ? FLIP_L : FLIP_R;
    if (f) f.setTarget(up);
  }

  window.addEventListener('keydown', function (e) {
    // Restart after a game over.
    if ((e.key === 'r' || e.key === 'R') && game.drainBall()) {
      game.newGame();
      world.balls = [];
      return;
    }

    if (e.key === 'ArrowLeft' || e.key === 'z' || e.key === 'Z') {
      setFlipper('l', true);
      e.preventDefault();
      return;
    }
    if (e.key === 'ArrowRight' || e.key === '/' ) {
      setFlipper('r', true);
      e.preventDefault();
      return;
    }

    if (LAUNCH_KEYS[e.key]) {
      if (world.balls.length === 0 && !game.drainBall()) {
        charging = true;
        pressTime = performance.now();
      }
      e.preventDefault();
      return;
    }
  });

  window.addEventListener('keyup', function (e) {
    if (e.key === 'ArrowLeft' || e.key === 'z' || e.key === 'Z') { setFlipper('l', false); return; }
    if (e.key === 'ArrowRight' || e.key === '/') { setFlipper('r', false); return; }

    if (charging && LAUNCH_KEYS[e.key]) {
      charging = false;
      var power = ((performance.now() - pressTime) / 1000) * 1.2;
      game.launch(Math.min(1, Math.max(0.8, power)));   // floor at 0.8 for a tap
      e.preventDefault();
    }
  });

  // Resize handler keeps the playfield width-fitted to the window.
  window.addEventListener('resize', function () { renderer.resize(); });

  // Go.
  renderer.resize();
  startLoop();
})();
