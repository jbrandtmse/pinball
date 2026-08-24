/*
 * PHOENIX: ASCENSION — physics engine (engine.js)
 * ------------------------------------------------
 * Zero-dependency 2D pinball physics. Node-safe: attaches to
 * globalThis.PA in the browser and also exports via module.exports for the
 * headless test rig. The renderer (render.js) is the only DOM-dependent file;
 * everything that must run under Node lives here or in table.js.
 *
 * Design goals:
 *  - Fixed-timestep integration with sub-stepping so a fast ball can never
 *    tunnel through a thin rail.
 *  - Circle-vs-segment collision (rails, guides, drop-target bars) and
 *    circle-vs-circle (bumpers).
 *  - Rotating flippers that transfer angular velocity to the ball (the "kick").
 *  - Slingshots with spring kick.
 *  - Crossing gates used by the rules layer to detect shots/ramps.
 */
(function (root, factory) {
  var PA = factory();
  root.PA = PA;
  if (typeof module === 'object' && module.exports) {
    module.exports = PA;
  }
})(typeof self !== 'undefined' ? self : this, function () {
  'use strict';

  // --------------------------------------------------------------------------
  // Vector helpers. Plain functions over {x,y} to stay allocation-light in the
  // hot collision loop.
  // --------------------------------------------------------------------------
  var V = {
    sub: function (a, b) { return { x: a.x - b.x, y: a.y - b.y }; },
    add: function (a, b) { return { x: a.x + b.x, y: a.y + b.y }; },
    scale: function (a, s) { return { x: a.x * s, y: a.y * s }; },
    dot: function (a, b) { return a.x * b.x + a.y * b.y; },
    len: function (a) { return Math.sqrt(a.x * a.x + a.y * a.y); },
    len2: function (a) { return a.x * a.x + a.y * a.y; },
    norm: function (a) {
      var l = Math.sqrt(a.x * a.x + a.y * a.y) || 1;
      return { x: a.x / l, y: a.y / l };
    },
    // perpendicular (rotate 90° CCW)
    perp: function (a) { return { x: -a.y, y: a.x }; },
    dist: function (a, b) { var dx = a.x - b.x, dy = a.y - b.y; return Math.sqrt(dx * dx + dy * dy); },
    lerp: function (a, b, t) { return { x: a.x + (b.x - a.x) * t, y: a.y + (b.y - a.y) * t }; }
  };

  // --------------------------------------------------------------------------
  // Ball
  // --------------------------------------------------------------------------
  function Ball(x, y, r) {
    this.x = x; this.y = y;
    this.vx = 0; this.vy = 0;
    this.r = r || 60;
    this.active = true;      // false once drained / removed
    this.resting = false;    // hint used by drain detection
    this.id = Ball._next++;
  }
  Ball._next = 1;
  Ball.prototype.applyImpulse = function (ix, iy) {
    this.vx += ix; this.vy += iy;
  };
  Ball.prototype.speed = function () { return V.len2({ x: this.vx, y: this.vy }); };

  // --------------------------------------------------------------------------
  // Segment — a static or linearly-moving wall/rail/guide. `a` and `b` are the
  // endpoints. restitution is energy kept on bounce (0..~1.5). A segment may
  // carry a linear velocity {vx,vy} for moving walls (slingshots); flippers use
  // the Flipper class instead because they rotate.
  // --------------------------------------------------------------------------
  function Segment(a, b, opts) {
    opts = opts || {};
    this.a = a; this.b = b;
    this.restitution = opts.restitution == null ? 0.42 : opts.restitution;
    this.kind = opts.kind || 'wall';      // wall | rail | guide | sling | target
    this.thickness = opts.thickness || 0; // visual only for guides
    this.vx = 0; this.vy = 0;             // linear velocity of the segment body
    this.onHit = opts.onHit || null;      // (ball, nx, ny, depth) => void
    this.passive = !!opts.passive;        // guide wall: excluded from drain search
    this.id = Segment._next++;
  }
  Segment._next = 1;

  // Closest point on segment PQ to point X. Returns {point, t, dist}.
  function closestPointOnSegment(p, q, x) {
    var pqx = q.x - p.x, pqy = q.y - p.y;
    var len2 = pqx * pqx + pqy * pqy;
    var t = len2 > 0 ? ((x.x - p.x) * pqx + (x.y - p.y) * pqy) / len2 : 0;
    if (t < 0) t = 0; else if (t > 1) t = 1;
    var cx = p.x + t * pqx, cy = p.y + t * pqy;
    var dx = x.x - cx, dy = x.y - cy;
    return { point: { x: cx, y: cy }, t: t, dist: Math.sqrt(dx * dx + dy * dy) };
  }

  // --------------------------------------------------------------------------
  // Bumper — a springy circular pad. On contact it fires a strong radial impulse.
  // --------------------------------------------------------------------------
  function Bumper(x, y, r, opts) {
    opts = opts || {};
    this.x = x; this.y = y; this.r = r;
    this.restitution = opts.restitution == null ? 1.7 : opts.restitution;
    this.score = opts.score || 0;
    this.charge = 0;        // 0..1 glow animation
    this.lit = !!opts.lit;  // rules layer may light it for bonus
    this.onHit = opts.onHit || null;
    this.id = Bumper._next++;
  }
  Bumper._next = 1;

  // --------------------------------------------------------------------------
  // Flipper — a rotating rigid segment from pivot to tip with rounded ends.
  // Transfers angular velocity to the ball on contact (the kick).
  // --------------------------------------------------------------------------
  function Flipper(opts) {
    opts = opts || {};
    this.pivot = opts.pivot;                 // {x,y}
    this.len = opts.len;                     // rest-to-tip length
    this.thickness = opts.thickness || 26;   // radius of the capsule
    this.side = opts.side === 'r' ? 'r' : 'l';
    this.restAngle = opts.restAngle;         // radians, pointing toward drain when down
    this.upAngle = opts.upAngle;             // radians, horizontal-ish when up
    this.angle = opts.restAngle;             // current angle
    this.targetAngle = opts.restAngle;
    this.maxAngVel = opts.maxAngVel || 34;   // rad/s while driving up
    this.strength = opts.strength || 20;     // base kick added to tip speed
    this.downPos = opts.downAngle != null ? opts.downAngle : opts.restAngle;
    this.upPos = opts.upAngle != null ? opts.upAngle : this.angle;
    this.prevAngle = this.angle;
    this.angVel = 0;
    this.onHit = opts.onHit || null;
    this.hitBall = -1;                       // last ball id contacted (de-dupe)
    this.id = Flipper._next++;
    // Precompute tip position at rest for convenience.
    this.tip = {
      x: this.pivot.x + Math.cos(this.restAngle) * this.len,
      y: this.pivot.y + Math.sin(this.restAngle) * this.len
    };
  }
  Flipper._next = 1;

  Flipper.prototype.setTarget = function (up) {
    this.targetAngle = up ? this.upAngle : this.restAngle;
  };
  Flipper.prototype.update = function (dt) {
    this.prevAngle = this.angle;
    var diff = this.targetAngle - this.angle;
    // Drive toward target with a max angular velocity; clamp near the stops.
    var step = this.maxAngVel * dt;
    if (Math.abs(diff) <= step) {
      this.angle = this.targetAngle;
      this.angVel = diff / (dt || 1e-6);
    } else {
      this.angle += Math.sign(diff) * step;
      this.angVel = Math.sign(diff) * this.maxAngVel;
    }
    // Decay angular velocity once we reach the stop (so a ball resting against it
    // isn't perpetually kicked).
    if (Math.abs(this.targetAngle - this.angle) < 1e-4) {
      this.angVel *= 0.2;
    }
    this.tip.x = this.pivot.x + Math.cos(this.angle) * this.len;
    this.tip.y = this.pivot.y + Math.sin(this.angle) * this.len;
  };
  // World-space velocity of a point along the flipper at distance `t` (0..1).
  Flipper.prototype.velocityAtT = function (t) {
    var rp = { x: this.pivot.x + Math.cos(this.angle) * this.len * t - this.pivot.x,
               y: this.pivot.y + Math.sin(this.angle) * this.len * t - this.pivot.y };
    // angular velocity omega (scalar, z) cross r => (-omega*ry, omega*rx)
    return { x: -this.angVel * rp.y, y: this.angVel * rp.x };
  };

  // --------------------------------------------------------------------------
  // Gate — an invisible crossing detector used to register shots / ramp runs.
  // Fires once when a ball's center crosses the line ab (with direction).
  // --------------------------------------------------------------------------
  function Gate(a, b, opts) {
    opts = opts || {};
    this.a = a; this.b = b;
    this.onPass = opts.onPass || null;       // (ball, dir) => void ; dir = +1 or -1
    this.triggered = false;
    this.resetAt = 0;                         // sim-time until which it stays quiet
    this.id = Gate._next++;
  }
  Gate._next = 1;

  function signedSide(a, b, p) {
    return (b.x - a.x) * (p.y - a.y) - (b.y - a.y) * (p.x - a.x);
  }

  // --------------------------------------------------------------------------
  // World — owns all physics objects and runs the fixed-step loop.
  // --------------------------------------------------------------------------
  function World(opts) {
    opts = opts || {};
    this.gravity = opts.gravity == null ? 2550 : opts.gravity;   // px/s^2 toward +y (drain)
    this.balls = [];
    this.segments = [];
    this.bumpers = [];
    this.flippers = [];
    this.gates = [];
    this.maxBallSpeed = opts.maxBallSpeed || 4600;
    // Fixed physics timestep. Small enough that per-step displacement < ball r
    // even at max speed, which prevents rail tunneling.
    this.dt = opts.dt || 1 / 240;
    this.simTime = 0;
  }

  World.prototype.addBall = function (x, y, r) {
    var b = new Ball(x, y, r);
    this.balls.push(b);
    return b;
  };

  // Drain line: balls crossing y >= drainY between the flippers are removed.
  World.prototype.drainY = 0;

  // A ball slower than this is "at rest". If it stays at rest longer than
  // REST_STUCK_TIME it's wedged in a pocket or on a slope (a gently-resting
  // ball never trips a slinger's impact threshold). Give it a gentle kick back
  // into play so no ball dies permanently — real tables get nudged. After
  // REST_MAX_KICKS consecutive failed dislodges the ball drains instead of
  // kicking forever in a genuinely dead spot.
  World.prototype.REST_SPEED = 45;
  World.prototype.REST_STUCK_TIME = 1.8;
  World.prototype.REST_MAX_KICKS = 4;

  World.prototype.step = function (realDt) {
    var acc = this._acc || 0;
    acc += realDt;
    var h = this.dt;
    // Guard against spiral-of-death after a pause/stall.
    if (acc > h * 8) acc = h * 8;
    while (acc >= h) {
      this.substep(h);
      this.simTime += h;
      acc -= h;
    }
    this._acc = acc;

    // Stuck-ball recovery: dislodge balls that have come to a permanent rest.
    for (var i = 0; i < this.balls.length; i++) {
      var rb = this.balls[i];
      if (!rb.active) continue;
      var sp = Math.sqrt(rb.vx * rb.vx + rb.vy * rb.vy);
      if (sp < this.REST_SPEED) {
        rb._restT = (rb._restT || 0) + h;
        if (rb._restT > this.REST_STUCK_TIME) {
          // Kick up into the field with a randomized horizontal nudge so it
          // doesn't drop straight back into the same pocket.
          var dir = Math.random() * 6.283;
          rb.applyImpulse(Math.sin(dir) * 240, -1150);
          rb._restT = 0;
          rb._kicks = (rb._kicks || 0) + 1;
          if (rb._kicks > this.REST_MAX_KICKS) {
            rb.active = false; // give up — it's in a dead spot
          }
        }
      } else {
        rb._restT = 0;
      }
    }
  };

  World.prototype.substep = function (h) {
    var g = this.gravity, maxSp2 = this.maxBallSpeed * this.maxBallSpeed;
    // Pairs (ball:element) that already fired a callback this substep. Cleared
    // each substep so a genuine separate contact fires again next substep.
    this._fired = this._fired || new Set();
    this._fired.length = 0;

    // 0) Drive every flipper toward its target so they swing and can kick the
    //    ball. (Was previously never called — flippers were static.)
    var flps = this.flippers;
    for (var fp = 0; fp < flps.length; fp++) {
      flps[fp].update(h);
    }

    // 1) Integrate gravity + position for every active ball.
    for (var i = 0; i < this.balls.length; i++) {
      var b = this.balls[i];
      if (!b.active) continue;
      b.vy += g * h;
      // clamp speed to avoid tunnelling / runaway
      var sp2 = b.vx * b.vx + b.vy * b.vy;
      if (sp2 > maxSp2) {
        var s = this.maxBallSpeed / Math.sqrt(sp2);
        b.vx *= s; b.vy *= s;
      }
      b.px = b.x; b.py = b.y;   // record previous for gate crossing
      b.x += b.vx * h;
      b.y += b.vy * h;
    }

    // 2) Collision relaxation passes. Two passes settle corner wedges; resolving
    // every pass (rather than only the last) keeps contacts from leaking through.
    var segs = this.segments, bumps = this.bumpers, flps = this.flippers;
    for (var pass = 0; pass < 2; pass++) {
      for (var j = 0; j < this.balls.length; j++) {
        var ball = this.balls[j];
        if (!ball.active) continue;
        // vs segments
        for (var k = 0; k < segs.length; k++) {
          var s = segs[k];
          var cp = closestPointOnSegment(s.a, s.b, ball);
          // penetration = how far the ball is inside the rail surface
          var pen = ball.r - (cp.dist - (s.thickness || 0));
          if (pen > 0) {
            if (globalThis.__dbg) console.log("[COLL] seg"+k+" d="+cp.dist.toFixed(1)+" pen="+pen.toFixed(1)+" at "+ball.x.toFixed(0)+","+ball.y.toFixed(0));
            this.resolveSegment(ball, s, cp, pen);
          }
        }
        // vs bumpers
        for (var m = 0; m < bumps.length; m++) {
          var bp = bumps[m];
          var dx = ball.x - bp.x, dy = ball.y - bp.y;
          var d2 = dx * dx + dy * dy;
          var minD = bp.r + ball.r;
          if (d2 < minD * minD) {
            var d = Math.sqrt(d2) || 1;
            var nx = dx / d, ny = dy / d;
            var depth = minD - d;
            ball.x += nx * depth; ball.y += ny * depth;
            var vn = ball.vx * nx + ball.vy * ny;
            if (vn < 0) {
              var e = bp.restitution + bp.charge * 0.4;
              ball.vx -= (1 + e) * vn * nx;
              ball.vy -= (1 + e) * vn * ny;
              this._fire(ball, 'b' + bp.id, function () { bp.charge = 1; if (bp.onHit) bp.onHit(ball, nx, ny); });
            }
          }
        }
        // vs flippers
        for (var n = 0; n < flps.length; n++) {
          var f = flps[n];
          this.resolveFlipper(ball, f);
        }
      }
      // vs other balls — real pinball balls collide, which matters most in
      // multiball. Equal mass: split overlap evenly and reflect relative
      // velocity along the contact normal (steel-ish restitution).
      for (var a = 0; a < this.balls.length; a++) {
        var ba = this.balls[a];
        if (!ba.active) continue;
        for (var c = a + 1; c < this.balls.length; c++) {
          var bb = this.balls[c];
          if (!bb.active) continue;
          var dx = bb.x - ba.x, dy = bb.y - ba.y;
          var d2 = dx * dx + dy * dy;
          var minD = ba.r + bb.r;
          if (d2 < minD * minD && d2 > 1e-9) {
            var d = Math.sqrt(d2);
            var nx = dx / d, ny = dy / d;
            var pen = minD - d;
            ba.x -= nx * pen * 0.5; ba.y -= ny * pen * 0.5;
            bb.x += nx * pen * 0.5; bb.y += ny * pen * 0.5;
            var rvx = ba.vx - bb.vx, rvy = ba.vy - bb.vy;
            var vn = rvx * nx + rvy * ny;
            if (vn > 0) {              // approaching
              var e = 0.6, imp = (1 + e) * vn * 0.5;
              ba.vx -= imp * nx; ba.vy -= imp * ny;
              bb.vx += imp * nx; bb.vy += imp * ny;
            }
          }
        }
      }
    }

    // 3) Gate crossing detection.
    var gates = this.gates;
    for (var p = 0; p < gates.length; p++) {
      var gate = gates[p];
      if (this.simTime < gate.resetAt) continue;
      for (var q = 0; q < this.balls.length; q++) {
        var gb = this.balls[q];
        if (!gb.active) continue;
        var s1 = signedSide(gate.a, gate.b, gb.px);
        var s2 = signedSide(gate.a, gate.b, gb.x);
        if ((s1 < 0) !== (s2 < 0) && Math.abs(s2 - s1) > 1e-9) {
          var dir = s2 < 0 ? -1 : 1;
          if (!gate.triggered || gate.onPass._retrigger) {
            gate.triggered = true;
            if (gate.onPass) gate.onPass(gb, dir);
          }
          break;
        }
      }
    }

    // 4) Decay bumper charge.
    for (var u = 0; u < this.bumpers.length; u++) {
      this.bumpers[u].charge *= 0.86;
    }
  };

  // Approach speed below which contacts are treated as resting (no callback).
  World.prototype.APPROACH_DEAD = 60;

  // Fire an element callback at most once per substep for a given ball:element
  // pair, preventing double-scoring across relaxation passes.
  World.prototype._fire = function (ball, key, fn) {
    if (!this._fired.has(key)) {
      this._fired.add(key);
      fn();
    }
  };

  // Resolve a ball penetrating segment s at closest point cp.
  World.prototype.resolveSegment = function (ball, s, cp, depth) {
    var nx, ny;
    var ox = ball.x - cp.point.x;
    var oy = ball.y - cp.point.y;
    var d2 = ox * ox + oy * oy;
    if (d2 > 1e-6) {
      var d = Math.sqrt(d2);
      nx = ox / d; ny = oy / d;
    } else {
      // Ball center exactly on the segment: use the segment's normal.
      var slx = s.b.x - s.a.x, sly = s.b.y - s.a.y;
      var ll = Math.sqrt(slx * slx + sly * sly) || 1;
      nx = -sly / ll; ny = slx / ll;
    }
    // Push out of the rail.
    ball.x += nx * depth;
    ball.y += ny * depth;
    // Relative velocity including segment linear motion (slingshots).
    var rvx = ball.vx - s.vx;
    var rvy = ball.vy - s.vy;
    var vn = rvx * nx + rvy * ny;
    if (vn < 0) {
      var e = Math.max(0.05, s.restitution);
      ball.vx -= (1 + e) * vn * nx;
      ball.vy -= (1 + e) * vn * ny;
      // add segment transport velocity back
      ball.vx += s.vx; ball.vy += s.vy;
      if (s.onHit && -vn > this.APPROACH_DEAD) {
        this._fire(ball, 's' + s.id, function () { s.onHit(ball, nx, ny); });
      }
    }
  };

  // Resolve a ball against a rotating flipper capsule.
  World.prototype.resolveFlipper = function (ball, f) {
    var cp = closestPointOnSegment(f.pivot, f.tip, ball);
    var minD = f.thickness;
    var depth = cp.dist - minD;
    if (depth >= ball.r) return;
    var nx, ny;
    var ox = ball.x - cp.point.x;
    var oy = ball.y - cp.point.y;
    var d2 = ox * ox + oy * oy;
    if (d2 > 1e-6) {
      var d = Math.sqrt(d2);
      nx = ox / d; ny = oy / d;
    } else {
      var tlx = f.tip.x - f.pivot.x, tly = f.tip.y - f.pivot.y;
      var ll = Math.sqrt(tlx * tlx + tly * tly) || 1;
      nx = -tly / ll; ny = tlx / ll;
    }
    // Push out along the flipper surface.
    var push = ball.r - depth;
    ball.x += nx * push;
    ball.y += ny * push;
    // Velocity of the flipper body at the contact point (angular kick).
    var vp = f.velocityAtT(cp.t);
    var rvx = ball.vx - vp.x, rvy = ball.vy - vp.y;
    var vn = rvx * nx + rvy * ny;
    if (vn < 0) {
      var e = 0.35; // flipper rubber is mildly bouncy
      ball.vx -= (1 + e) * vn * nx;
      ball.vy -= (1 + e) * vn * ny;
      // re-add the flipper's transport velocity so a fast-up flipper launches
      ball.vx += vp.x; ball.vy += vp.y;
      // Directional kick: when the flipper is swinging up hard, launch the ball
      // toward the playfield (up) and inward. angVel sign is side-agnostic.
      if (Math.abs(f.angVel) > 6) {
        var dir = f.side === 'r' ? -1 : 1;
        var power = Math.min(1, Math.abs(f.angVel) / (f.maxAngVel || 34));
        ball.vx += dir * 300 * power;
        ball.vy -= 420 * power;
      }
      if (f.onHit && -vn > this.APPROACH_DEAD) {
        this._fire(ball, 'f' + f.id, function () { f.onHit(ball); });
      }
    }
  };

  World.prototype.removeInactiveBalls = function () {
    for (var i = this.balls.length - 1; i >= 0; i--) {
      if (!this.balls[i].active) this.balls.splice(i, 1);
    }
  };

  return {
    V: V,
    Ball: Ball,
    Segment: Segment,
    Bumper: Bumper,
    Flipper: Flipper,
    Gate: Gate,
    World: World,
    closestPointOnSegment: closestPointOnSegment,
    // exposed for tests / corridor checker
    signedSide: signedSide
  };
});
