// PLEASURE PALACE — physics engine.
// Pure simulation (no DOM): works in the browser and under Node for headless tests.
// Units: design pixels (playfield 540 wide x 1100 tall). Time in seconds.
//
// Model:
//  - Balls are discs; the table incline is projected so gravity pushes +y (down-screen)
//    with a = g*sin(6.5deg) ≈ 872 px/s^2.
//  - Static walls are line segments; events fire when a surface is struck hard enough.
//  - Flippers are rotating capsules driven by near-instant coil strokes
//    (fast up, slow down) — contact velocity of the blade is imparted to the ball.
//  - Pop bumpers / slingshots / kickback are kickers: they push the ball off fast.
//  - A spinner card and rollover lanes are trigger zones (pass-through).
//  - One-way gates block travel from one side only.
//  - Balls below the drain line are removed and reported.

(function (root, factory) {
  var PHYS = factory();
  if (typeof module !== 'undefined' && module.exports) module.exports = PHYS;
  root.PHYS = PHYS;
})(typeof globalThis !== 'undefined' ? globalThis : this, function () {
  'use strict';

  var G = 872;            // projected gravity, px/s^2
  var VMAX = 2600;        // hard speed clamp
  var REST_WALL = 0.42;   // wall restitution
  var REST_POST = 0.55;   // rubber post restitution
  var REST_RUBBER = 0.82; // slingshot rubber
  var KICK_BUMPER = 400;  // pop bumper kick speed
  var KICK_SLING = 760;   // slingshot kick speed
  var MIN_EVENT = 55;     // min impact speed to report an event (noise floor)

  function clamp(v, lo, hi) { return v < lo ? lo : (v > hi ? hi : v); }

  // ---- scene construction helpers -------------------------------------------
  // Every element: { kind, ...geometry, label, hit:false }
  // hit flag: re-arm bookkeeping so we don't spam events on one long slide.

  function wall(ax, ay, bx, by, opts) {
    opts = opts || {};
    return {
      kind: 'wall', ax: ax, ay: ay, bx: bx, by: by,
      rest: opts.rest !== undefined ? opts.rest : REST_WALL,
      oneWay: opts.oneWay || null, // {openDir:'up'|'down'|'left'|'right'} — only blocks the opposite travel
      label: opts.label || 'wall',
      dead: false
    };
  }
  function rubber(ax, ay, bx, by, label) {
    return {
      kind: 'sling', ax: ax, ay: ay, bx: bx, by: by,
      rest: REST_RUBBER, flash: 0, label: label || 'sling', dead: false
    };
  }
  function gate(ax, ay, bx, by, openDir, label) {
    return wall(ax, ay, bx, by, { oneWay: { openDir: openDir || 'up' }, label: label || 'gate' });
  }
  function post(cx, cy, r, opts) {
    opts = opts || {};
    return {
      kind: 'circle', cx: cx, cy: cy, r: r,
      rest: opts.rest !== undefined ? opts.rest : REST_POST,
      bumper: !!opts.bumper, flash: 0, label: opts.label || 'post', dead: false
    };
  }
  function flipper(px, py, len, side) {
    return {
      kind: 'flipper', px: px, py: py, len: len, side: side, // 'L' | 'R'
      angle: 0.42,        // radians from horizontal, hanging down toward center
      target: 0.42,
      omega: 0,
      r0: 9,              // thickness at pivot
      r1: 7,              // thickness at tip
      hitCool: 0
    };
  }
  function roll(x, y, r, label) {
    return { kind: 'roll', cx: x, cy: y, r: r, label: label, inside: false };
  }
  function spinLine(x1, y1, x2, y2, label) {
    return { kind: 'spinner', ax: x1, ay: y1, bx: x2, by: y2, label: label || 'spin', spins: 0, angle: 0, anim: 0 };
  }
  function archPoints(cx, cy, r, a0deg, a1deg, stepDeg) {
    // arc sampled between angles (deg, y-up: 90 = top apex). March direction
    // is inferred from a0→a1 so both increasing and decreasing spans work.
    var pts = [];
    var span = a1deg - a0deg;
    var step = (span >= 0 ? 1 : -1) * Math.abs(stepDeg || 12);
    if (span === 0) step = Math.abs(stepDeg || 12);
    for (var a = a0deg; span >= 0 ? a <= a1deg + 1e-9 : a >= a1deg - 1e-9; a += step) {
      var rad = a * Math.PI / 180;
      pts.push({ x: cx + r * Math.cos(rad), y: cy - r * Math.sin(rad) });
    }
    return pts;
  }

  // ---- closest point on a segment ------------------------------------------
  function closestOnSeg(px, py, ax, ay, bx, by) {
    var abx = bx - ax, aby = by - ay;
    var t = ((px - ax) * abx + (py - ay) * aby) / (abx * abx + aby * aby || 1);
    t = clamp(t, 0, 1);
    return { x: ax + abx * t, y: ay + aby * t, t: t };
  }

  // ---- wall / rubber / gate vs ball ----------------------------------------
  function collideSegment(ball, el, h, out) {
    var cp = closestOnSeg(ball.x, ball.y, el.ax, el.ay, el.bx, el.by);
    var dx = ball.x - cp.x, dy = ball.y - cp.y;
    var d2 = dx * dx + dy * dy;
    var rr = ball.r;
    if (d2 >= rr * rr || d2 === 0) return;
    var d = Math.sqrt(d2);
    var nx = dx / d, ny = dy / d;              // surface -> ball
    var vn = ball.vx * nx + ball.vy * ny;     // normal velocity (negative = approaching)

    if (el.kind === 'gate') {
      // one-way: only collide when approaching from the blocked side
      if (el.oneWay.openDir === 'up') { if (ball.vy < -MIN_EVENT * 0.3) return; }
      else if (el.oneWay.openDir === 'down') { if (ball.vy > MIN_EVENT * 0.3) return; }
      else if (el.oneWay.openDir === 'left') { if (ball.vx < -MIN_EVENT * 0.3) return; }
      else if (el.oneWay.openDir === 'right') { if (ball.vx > MIN_EVENT * 0.3) return; }
    }
    if (vn >= 0) {
      // not approaching; still fix penetration so nothing sinks in
      if (d < rr) { ball.x = cp.x + nx * rr; ball.y = cp.y + ny * rr; }
      return;
    }

    if (-vn < 40) {
      // slow contact = support, not bounce: cancel the normal velocity and
      // let the ball slide along the surface. Without this, weak bounces
      // act as a trampoline and the ball hovers forever on a blade.
      ball.x = cp.x + nx * rr; ball.y = cp.y + ny * rr;
      var vt = { x: ball.vx - vn * nx, y: ball.vy - vn * ny };
      var drag = el.label === 'arch' ? 0.90 : 0.998;
      ball.vx = vt.x * drag; ball.vy = vt.y * drag;
      if (el.kind === 'sling' && -vn > 20) {
        // slings still fire on gentle contact — they're sprung
        ball.vx += 120 * nx; ball.vy += 120 * ny;
        out.push({ type: 'sling', label: el.label, speed: -vn });
        el.flash = 1;
      }
      return;
    }

    var rest = el.rest;
    if (el.kind === 'sling') {
      // kicker: bounce plus spring punch
      var kick = KICK_SLING;
      ball.vx += (-(1 + rest) * vn + kick * 0.5) * nx;
      ball.vy += (-(1 + rest) * vn + kick * 0.5) * ny;
      // bias the sling kick outward along the arm so balls go up toward flippers
      ball.x = cp.x + nx * rr; ball.y = cp.y + ny * rr;
      out.push({ type: 'sling', label: el.label, speed: -vn });
      el.flash = 1;
      return;
    }

    // plain wall / gate: reflect + tangential damping (only on real bounces).
    // dome arch uses stronger friction so a fast launch can't ride the rim
    // all the way around — it breaks off and lands in playable zones.
    var vnn = -vn * rest;
    var vtx = ball.vx - vn * nx, vty = ball.vy - vn * ny;
    if (el.label === 'arch') { vtx *= 0.90; vty *= 0.90; }
    else { vtx *= 0.995; vty *= 0.995; }
    ball.vx = vnn * nx + vtx;
    ball.vy = vnn * ny + vty;
    ball.x = cp.x + nx * rr; ball.y = cp.y + ny * rr;
    if ((el.label === 'KITTEN' || /^T[1-4]$/.test(el.label)) && -vn > 40) {
      out.push({ type: 'wallHit', label: el.label, speed: -vn });
    }
  }

  // ---- pop bumper vs ball --------------------------------------------------
  function collideCircle(ball, el, out) {
    var dx = ball.x - el.cx, dy = ball.y - el.cy;
    var d2 = dx * dx + dy * dy;
    var rr = ball.r + el.r;
    if (d2 >= rr * rr || d2 === 0) return;
    var d = Math.sqrt(d2);
    var nx = dx / d, ny = dy / d;
    var vn = ball.vx * nx + ball.vy * ny;

    if (el.bumper) {
      // pop bumper fires whenever it's touched; ball is always flung off
      var sp = Math.max(-vn, 0);
      var kick = Math.max(KICK_BUMPER, sp * 0.9);
      ball.x = el.cx + nx * (rr + 0.5);
      ball.y = el.cy + ny * (rr + 0.5);
      var vt = { x: ball.vx - vn * nx, y: ball.vy - vn * ny };
      var blend = 0.35;
      ball.vx = -kick * 1.02 * nx + vt.x * blend;
      ball.vy = -kick * 1.02 * ny + vt.y * blend;
      // nudge slightly outward so a ball landing dead-center still escapes
      ball.vx += (nx * 40); ball.vy += (ny * 20);
      out.push({ type: 'bumper', label: el.label, speed: kick });
      el.flash = 1;
      return;
    }
    if (vn >= 0) return;
    var vnn = -vn * el.rest;
    var vtx = ball.vx - vn * nx, vty = ball.vy - vn * ny;
    vtx *= 0.995; vty *= 0.995;
    ball.vx = vnn * nx + vtx;
    ball.vy = vnn * ny + vty;
    ball.x = el.cx + nx * rr; ball.y = el.cy + ny * rr;
  }

  // ---- flipper vs ball -----------------------------------------------------
  function collideFlipper(ball, f, out) {
    var cs = Math.cos(f.angle), sn = Math.sin(f.angle);
    // flipper spans from pivot toward center of table
    var dirx = (f.side === 'L') ? 1 : -1;
    var tx = f.px + dirx * f.len * cs;
    var ty = f.py + f.len * sn;
    var cp = closestOnSeg(ball.x, ball.y, f.px, f.py, tx, ty);
    var dx = ball.x - cp.x, dy = ball.y - cp.y;
    var d2 = dx * dx + dy * dy;
    // thickness varies along blade
    var frac = cp.t;
    var hr = f.r0 + (f.r1 - f.r0) * frac;
    var rr = ball.r + hr;
    if (d2 >= rr * rr || d2 === 0) return;
    var d = Math.sqrt(d2);
    var nx = dx / d, ny = dy / d;

    // surface velocity of the blade at the contact point (rotation about pivot).
    // L blade: point = pivot + (d cosθ, d sinθ) → v = (−ω rpy, ω rpx).
    // R blade: point = pivot + (−d cosθ, d sinθ) → v = (ω rpy, −ω rpx).
    var rpx = cp.x - f.px, rpy = cp.y - f.py;
    var svx, svy;
    if (f.side === 'L') { svx = -f.omega * rpy; svy = f.omega * rpx; }
    else { svx = f.omega * rpy; svy = -f.omega * rpx; }
    var rvx = ball.vx - svx, rvy = ball.vy - svy;
    var rvn = rvx * nx + rvy * ny;
    if (rvn >= 0) {
      // separating; just resolve penetration
      ball.x = cp.x + nx * rr; ball.y = cp.y + ny * rr;
      return;
    }
    if (-rvn < 40) {
      // slow contact with a (near-)resting blade = support: cancel normal
      // velocity, let the ball roll down the blade to the tip and off.
      // A weak bounce would trampoline the ball forever.
      ball.x = cp.x + nx * rr; ball.y = cp.y + ny * rr;
      var vt = { x: ball.vx - rvn * nx, y: ball.vy - rvn * ny };
      ball.vx = vt.x * 0.998; ball.vy = vt.y * 0.998;
      return;
    }
    var rest = 0.42 + 0.5 * Math.min(1, Math.abs(f.omega) / 30); // snapping flipper bites harder
    var nn = -rvn * rest;
    var rvtx = rvx - rvn * nx, rvty = rvy - rvn * ny;
    rvtx *= 0.97; rvty *= 0.97;
    ball.vx = svx + (nn * nx + rvtx);
    ball.vy = svy + (nn * ny + rvty);
    ball.x = cp.x + nx * (rr + 0.4);
    ball.y = cp.y + ny * (rr + 0.4);
  }

  // ---- spinner & rollovers --------------------------------------------------
  function checkSpinner(ball, sp, out) {
    // crossing detection through the slot
    var inBand = ball.y > sp.ay - ball.r && ball.y < sp.by + ball.r &&
                 ball.x > sp.ax && ball.x < sp.bx;
    if (!inBand) { ball._spOut = true; return; }
    if (ball._spOut === undefined) ball._spOut = true;
    if (ball._spOut && Math.abs(ball.vy) > 40) {
      // crossed the card: count one spin (card is below/above line — check crossing of midline)
    }
    // one spin per pass over the card: arm when the ball enters the slot
    // band, count one spin when it crosses the midline, and only re-arm
    // after it fully leaves the band (no jitter double-counts)
    var midY = (sp.ay + sp.by) / 2;
    var margin = 8;
    var inBand = ball.y > sp.ay - ball.r - margin && ball.y < sp.by + ball.r + margin;
    if (!inBand) { ball._spSide = null; return; }
    if (ball._spSide === undefined || ball._spSide === null) {
      ball._spSide = ball.y < midY;   // entering from above (or below): no count yet
      return;
    }
    var nowAbove = ball.y < midY;
    if (nowAbove !== ball._spSide) {
      ball._spSide = nowAbove;
      if (Math.abs(ball.vy) > 60) {
        sp.spins += 1;
        sp.anim = 1;
        ball.vy *= 0.985; ball.vx *= 0.99; // card drags the ball a touch
        out.push({ type: 'spin', label: sp.label, speed: Math.abs(ball.vy) });
      }
    }
  }
  function checkRoll(ball, el, out) {
    var dx = ball.x - el.cx, dy = ball.y - el.cy;
    var rr = ball.r + el.r * 0.75;
    var d2 = dx * dx + dy * dy;
    // hysteresis: arm inside rr, disarm only outside rr + 8 (no re-fires
    // when a ball dwells or jitters at the sensor edge)
    var inside = d2 < (rr + 8) * (rr + 8) && el.inside;
    if (!el.inside && d2 < rr * rr) {
      el.inside = true;
      out.push({ type: 'roll', label: el.label, x: el.cx, y: el.cy });
    } else if (el.inside && d2 >= (rr + 8) * (rr + 8)) {
      el.inside = false;
    }
  }

  // ---- main step -----------------------------------------------------------
  function step(scene, dt, events) {
    // fixed substeps for stability
    var H = 1 / 480;
    var acc = scene._acc || 0;
    acc += dt;
    var maxSteps = 400;
    while (acc >= H && maxSteps-- > 0) {
      substep(scene, H, events);
      acc -= H;
    }
    scene._acc = acc;
  }

  function substep(scene, h, events) {
    var i, j, b, el;
    // drive flippers
    for (i = 0; i < scene.flippers.length; i++) {
      var f = scene.flippers[i];
      var da = f.target - f.angle;
      // energize (raise) = fast coil; release = slow spring return
      var speed = (f.target < f.angle) ? 40 : 12;
      var maxDa = speed * h;
      var applied = da;
      if (Math.abs(da) > maxDa) applied = (da > 0 ? maxDa : -maxDa);
      f.angle += applied;
      f.omega = applied / h;
    }

    var items = scene.items;
    var drainY = scene.drainY;
    var newBalls = [];
    for (i = 0; i < scene.balls.length; i++) {
      b = scene.balls[i];
      b.vy += G * h;
      b.vx = clamp(b.vx, -VMAX, VMAX);
      b.vy = clamp(b.vy, -VMAX, VMAX);
      b.x += b.vx * h;
      b.y += b.vy * h;

      // stop absurd micro-jitter against floors
      if (Math.abs(b.vy) < 2.5 && b.y > scene.restHintY) b.vy *= 0.9;

      for (j = 0; j < items.length; j++) {
        el = items[j];
        if (el.dead) continue;
        if (el.kind === 'circle') collideCircle(b, el, events);
        else if (el.kind === 'sling' || el.kind === 'gate' || el.kind === 'wall') collideSegment(b, el, h, events);
      }
      for (j = 0; j < scene.flippers.length; j++) collideFlipper(b, scene.flippers[j], events);
      if (scene.spinner) checkSpinner(b, scene.spinner, events);
      if (scene.rolls) {
        for (j = 0; j < scene.rolls.length; j++) checkRoll(b, scene.rolls[j], events);
      }

      // keep speed capped
      var sp = Math.hypot(b.vx, b.vy);
      if (sp > VMAX) { b.vx *= VMAX / sp; b.vy *= VMAX / sp; }

      // left/right guides & lane side trims happen through walls only.

      if (b.y > drainY || b.x < -30 || b.x > 570 || b.y < -200) {
        events.push({ type: 'drain', x: b.x, y: b.y });
      } else {
        newBalls.push(b);
      }
    }
    scene.balls = newBalls;
  }

  return {
    G: G, VMAX: VMAX,
    wall: wall, rubber: rubber, gate: gate, post: post,
    flipper: flipper, roll: roll, spinLine: spinLine, archPoints: archPoints,
    step: step
  };
});
