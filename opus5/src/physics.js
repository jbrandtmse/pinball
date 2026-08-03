/* ============================================================================
 * RAGNAROK PINBALL — physics.js
 *
 * Rigid-body pinball simulation in real units.
 *   length : millimetres        (playfield is 521 x 1168 mm — Williams WPC)
 *   mass   : grams              (ball = 80 g, 27 mm diameter steel)
 *   time   : seconds
 *
 * The playfield is a plane inclined 6.5 deg toward the player, so in-plane
 * gravity is  g*sin(6.5) = 1110 mm/s^2  acting in +Y (down the playfield),
 * and the normal-to-playfield component is g*cos(6.5) = 9747 mm/s^2 (used by
 * the ramp solver, where the ball climbs out of the plane).
 *
 * Integration is a fixed 960 Hz substep, which keeps the per-step travel of a
 * 6 m/s ball to ~6.3 mm — comfortably under the 13.5 mm ball radius, so a ball
 * can never tunnel a wall.
 * ==========================================================================*/
(function (PB) {
  'use strict';

  var U = PB.U;
  var P = PB.Phys = {};

  /* ------------------------------------------------------------ constants */
  P.PITCH_DEG = 6.5;
  P.G = 9810;                                             // mm/s^2
  P.G_PLANE = P.G * Math.sin(P.PITCH_DEG * U.DEG);        // 1110.6 down-playfield
  P.G_NORMAL = P.G * Math.cos(P.PITCH_DEG * U.DEG);       // 9747  into playfield
  P.BALL_R = 13.5;                                        // 27 mm dia
  P.BALL_M = 80;                                          // grams
  P.HZ = 960;
  P.DT = 1 / P.HZ;
  P.MAX_SPEED = 7600;                                     // mm/s clamp (~17 mph)
  P.ROLL_DRAG = 0.021;                                    // per-second velocity fraction
  P.ROLL_RESIST = 26;                                     // mm/s^2 constant
  P.SPIN_DRAG = 1.4;

  /* ------------------------------------------------------------ materials */
  function mat(e, f, scatter, falloff) {
    return { e: e, f: f, scatter: scatter || 0, falloff: falloff === undefined ? 0.22 : falloff };
  }
  P.MAT = {
    wood:    mat(0.32, 0.32, 0.000, 0.30),
    metal:   mat(0.42, 0.16, 0.004, 0.22),
    guide:   mat(0.38, 0.14, 0.003, 0.24),   // steel ball guides / lane rails
    plastic: mat(0.52, 0.22, 0.008, 0.20),
    rubber:  mat(0.80, 0.42, 0.022, 0.16),   // sling & lane rubbers
    post:    mat(0.86, 0.38, 0.045, 0.14),   // rubber-sleeved posts scatter a lot
    target:  mat(0.40, 0.30, 0.010, 0.28),
    drop:    mat(0.34, 0.30, 0.008, 0.30),
    bumper:  mat(0.55, 0.20, 0.030, 0.18),
    flipper: mat(0.88, 0.90, 0.000, 0.15),   // VP defaults for a late-era Williams
    ball:    mat(0.62, 0.10, 0.005, 0.20)
  };

  /* ================================================================= BALL */
  var ballSeq = 0;
  P.Ball = function (x, y) {
    this.id = ++ballSeq;
    this.x = x; this.y = y;
    this.px = x; this.py = y;
    this.vx = 0; this.vy = 0;
    this.r = P.BALL_R;
    this.m = P.BALL_M;
    this.spin = 0;          // rad/s about the playfield normal (visual roll)
    this.roll = 0;          // accumulated rotation, for the surface texture
    this.z = 0;             // height above playfield (ramps)
    this.state = 'field';   // field | ramp | captured | lane | gone
    this.ramp = null;       // {ramp, s, v}
    this.hold = null;       // kicker currently holding us
    this.trail = [];
    this.age = 0;
    this.lastHit = '';
    this.stuckT = 0;
    this.live = true;       // counts toward balls-in-play
    this.newBall = false;
  };
  P.Ball.prototype.speed = function () { return Math.sqrt(this.vx * this.vx + this.vy * this.vy); };
  P.Ball.prototype.setVel = function (vx, vy) { this.vx = vx; this.vy = vy; };
  P.Ball.prototype.kick = function (dirDeg, speed, spreadDeg) {
    var a = (dirDeg + (spreadDeg ? U.rng.jit(spreadDeg) : 0)) * U.DEG;
    this.vx = Math.cos(a) * speed;
    this.vy = Math.sin(a) * speed;
  };

  /* ============================================================ COLLIDERS */
  /* Every collider exposes: aabb(), test(ball) -> {nx,ny,pen} | null, plus
     .mat .tag .enabled .solid .onHit                                        */

  /** Line segment. `side` 0 = two-sided, +1 = solid only from the normal side. */
  P.Seg = function (x1, y1, x2, y2, m, opt) {
    opt = opt || {};
    this.type = 'seg';
    this.set(x1, y1, x2, y2);
    this.mat = m || P.MAT.metal;
    this.side = opt.side || 0;
    this.tag = opt.tag || '';
    this.enabled = true;
    this.solid = true;
    this.gate = opt.gate || 0;    // 1 = one-way: passable when moving along +normal
    this.owner = opt.owner || null;
    this.vis = opt.vis !== false; // participates in the debug overlay
  };
  P.Seg.prototype.set = function (x1, y1, x2, y2) {
    this.x1 = x1; this.y1 = y1; this.x2 = x2; this.y2 = y2;
    var dx = x2 - x1, dy = y2 - y1;
    this.len2 = dx * dx + dy * dy;
    this.len = Math.sqrt(this.len2) || 1e-6;
    // normal = left of the direction vector (counter-clockwise 90 in screen space)
    this.nx = dy / this.len;
    this.ny = -dx / this.len;
    this.minx = Math.min(x1, x2); this.maxx = Math.max(x1, x2);
    this.miny = Math.min(y1, y2); this.maxy = Math.max(y1, y2);
  };
  P.Seg.prototype.aabb = function (r) {
    return [this.minx - r, this.miny - r, this.maxx + r, this.maxy + r];
  };
  P.Seg.prototype.test = function (b) {
    var dx = this.x2 - this.x1, dy = this.y2 - this.y1;
    var t = ((b.x - this.x1) * dx + (b.y - this.y1) * dy) / this.len2;
    if (t < 0) t = 0; else if (t > 1) t = 1;
    var cx = this.x1 + dx * t, cy = this.y1 + dy * t;
    var ox = b.x - cx, oy = b.y - cy;
    var d2 = ox * ox + oy * oy;
    var r = b.r;
    var sd = (b.x - this.x1) * this.nx + (b.y - this.y1) * this.ny;

    if (this.side > 0) {
      // One-sided: also catch a ball that has slipped behind the wall.
      if (sd < 0 && t > 0 && t < 1) return { nx: this.nx, ny: this.ny, pen: r - sd };
      if (d2 >= r * r) return null;
      var d = Math.sqrt(d2) || 1e-6;
      if ((ox * this.nx + oy * this.ny) < 0) return { nx: this.nx, ny: this.ny, pen: r - sd };
      return { nx: ox / d, ny: oy / d, pen: r - d };
    }
    if (d2 >= r * r) return null;
    var dd = Math.sqrt(d2);
    if (dd < 1e-6) { return { nx: this.nx * (sd < 0 ? -1 : 1), ny: this.ny * (sd < 0 ? -1 : 1), pen: r }; }
    return { nx: ox / dd, ny: oy / dd, pen: r - dd };
  };

  /** Circular obstacle (posts, bumper bodies) or circular pocket (side=-1). */
  P.Circle = function (cx, cy, r, m, opt) {
    opt = opt || {};
    this.type = 'circle';
    this.cx = cx; this.cy = cy; this.r = r;
    this.mat = m || P.MAT.post;
    this.tag = opt.tag || '';
    this.enabled = true;
    this.solid = true;
    this.inside = !!opt.inside;   // ball is contained *within* this circle
    this.owner = opt.owner || null;
    this.vis = opt.vis !== false;
  };
  P.Circle.prototype.aabb = function (r) {
    return [this.cx - this.r - r, this.cy - this.r - r, this.cx + this.r + r, this.cy + this.r + r];
  };
  P.Circle.prototype.test = function (b) {
    var ox = b.x - this.cx, oy = b.y - this.cy;
    var d = Math.sqrt(ox * ox + oy * oy);
    if (this.inside) {
      var pen = d + b.r - this.r;
      if (pen <= 0) return null;
      if (d < 1e-6) return null;
      return { nx: -ox / d, ny: -oy / d, pen: pen };
    }
    var lim = this.r + b.r;
    if (d >= lim) return null;
    if (d < 1e-6) return { nx: 0, ny: -1, pen: lim };
    return { nx: ox / d, ny: oy / d, pen: lim - d };
  };

  /** Circular arc wall. Angles in radians, screen space (y down), a0 -> a1 CCW-in-math. */
  P.Arc = function (cx, cy, rad, a0, a1, m, opt) {
    opt = opt || {};
    this.type = 'arc';
    this.cx = cx; this.cy = cy; this.rad = rad;
    this.a0 = a0; this.a1 = a1;
    this.mat = m || P.MAT.guide;
    this.tag = opt.tag || '';
    this.side = opt.side || 0;   // +1 solid from outside->in only, -1 inside->out only
    this.enabled = true;
    this.solid = true;
    this.owner = opt.owner || null;
    this.vis = opt.vis !== false;
    this._span = a1 - a0;
  };
  P.Arc.prototype.aabb = function (r) {
    var e = this.rad + r;
    return [this.cx - e, this.cy - e, this.cx + e, this.cy + e];
  };
  P.Arc.prototype.inSweep = function (a) {
    var lo = Math.min(this.a0, this.a1), hi = Math.max(this.a0, this.a1);
    // normalise a into [lo, lo+2pi)
    var k = a;
    while (k < lo) k += U.TAU;
    while (k >= lo + U.TAU) k -= U.TAU;
    return k <= hi;
  };
  P.Arc.prototype.test = function (b) {
    var ox = b.x - this.cx, oy = b.y - this.cy;
    var d = Math.sqrt(ox * ox + oy * oy);
    if (d < 1e-6) return null;
    var delta = d - this.rad;
    if (Math.abs(delta) >= b.r) return null;
    if (!this.inSweep(Math.atan2(oy, ox))) return null;
    var s = delta < 0 ? -1 : 1;
    if (this.side > 0 && s < 0) return null;   // only blocks from outside
    if (this.side < 0 && s > 0) return null;   // only blocks from inside
    return { nx: (ox / d) * s, ny: (oy / d) * s, pen: b.r - Math.abs(delta) };
  };

  /** Capsule between two moving endpoints — used by flippers and gates. */
  P.capsuleTest = function (b, x1, y1, r1, x2, y2, r2) {
    var dx = x2 - x1, dy = y2 - y1;
    var l2 = dx * dx + dy * dy;
    var t = l2 > 1e-9 ? ((b.x - x1) * dx + (b.y - y1) * dy) / l2 : 0;
    if (t < 0) t = 0; else if (t > 1) t = 1;
    var cx = x1 + dx * t, cy = y1 + dy * t;
    var rr = r1 + (r2 - r1) * t;
    var ox = b.x - cx, oy = b.y - cy;
    var d = Math.sqrt(ox * ox + oy * oy);
    var lim = rr + b.r;
    if (d >= lim) return null;
    if (d < 1e-6) return { nx: 0, ny: -1, pen: lim, t: t, cx: cx, cy: cy };
    return { nx: ox / d, ny: oy / d, pen: lim - d, t: t, cx: cx, cy: cy };
  };

  /** Axis-aligned or rotated rectangular trigger zone (no collision). */
  P.Zone = function (x, y, w, h, tag, opt) {
    opt = opt || {};
    this.type = 'zone';
    this.x = x; this.y = y; this.w = w; this.h = h;
    this.tag = tag;
    this.enabled = true;
    this.solid = false;
    this.rot = opt.rot || 0;
    this.once = opt.once !== false;   // fire on entry, re-arm on exit
    this.inside = {};                 // ball.id -> bool
    this.owner = opt.owner || null;
    this.dirX = opt.dirX || 0;        // require sign(vx)
    this.dirY = opt.dirY || 0;        // require sign(vy)
  };
  P.Zone.prototype.contains = function (b) {
    var dx = b.x - this.x, dy = b.y - this.y;
    if (this.rot) {
      var c = Math.cos(-this.rot), s = Math.sin(-this.rot);
      var rx = dx * c - dy * s, ry = dx * s + dy * c;
      dx = rx; dy = ry;
    }
    return Math.abs(dx) <= this.w * 0.5 && Math.abs(dy) <= this.h * 0.5;
  };

  /* ============================================================== FLIPPER */
  P.Flipper = function (cfg) {
    this.px = cfg.x; this.py = cfg.y;
    this.r1 = cfg.r1 === undefined ? 11.6 : cfg.r1;   // base radius (with rubber)
    this.r2 = cfg.r2 === undefined ? 7.0 : cfg.r2;    // tip radius
    this.len = cfg.len === undefined ? 58 : cfg.len;  // pivot -> tip centre
    this.restA = cfg.rest * U.DEG;
    this.endA = cfg.end * U.DEG;
    this.dir = this.endA > this.restA ? 1 : -1;
    this.ang = this.restA;
    this.omega = 0;
    this.up = false;
    this.side = cfg.side || 'left';
    this.name = cfg.name || 'flipper';
    this.mat = P.MAT.flipper;
    this.enabled = cfg.enabled !== false;
    this.accelUp = cfg.accelUp || 2350;      // rad/s^2
    this.omegaUp = cfg.omegaUp || 39;        // rad/s cap
    this.accelDn = cfg.accelDn || 980;
    this.omegaDn = cfg.omegaDn || 17;
    this.hitT = 0;                           // visual recoil timer
    this.atEnd = false;
  };
  P.Flipper.prototype.tipX = function () { return this.px + Math.cos(this.ang) * this.len; };
  P.Flipper.prototype.tipY = function () { return this.py + Math.sin(this.ang) * this.len; };
  P.Flipper.prototype.step = function (dt) {
    if (!this.enabled) { this.ang = this.restA; this.omega = 0; return; }
    var target = this.up ? this.endA : this.restA;
    var toGo = target - this.ang;
    var d = toGo === 0 ? 0 : (toGo > 0 ? 1 : -1);
    var a = this.up ? this.accelUp : this.accelDn;
    var wmax = this.up ? this.omegaUp : this.omegaDn;
    this.omega += a * d * dt;
    if (this.omega > wmax) this.omega = wmax;
    if (this.omega < -wmax) this.omega = -wmax;
    var na = this.ang + this.omega * dt;
    // Clamp at the coil stop / EOS with a tiny amount of rebound.
    if ((d > 0 && na >= target) || (d < 0 && na <= target)) {
      na = target;
      this.omega = this.up ? 0 : -this.omega * 0.06;
      this.atEnd = this.up;
    } else {
      this.atEnd = false;
    }
    this.ang = na;
    if (this.hitT > 0) this.hitT -= dt;
  };
  /** Velocity of the flipper surface at world point (x,y). */
  P.Flipper.prototype.pointVel = function (x, y, out) {
    var rx = x - this.px, ry = y - this.py;
    out[0] = -this.omega * ry;
    out[1] = this.omega * rx;
  };
  P.Flipper.prototype.test = function (b) {
    return P.capsuleTest(b, this.px, this.py, this.r1,
      this.px + Math.cos(this.ang) * this.len,
      this.py + Math.sin(this.ang) * this.len, this.r2);
  };

  /* ============================================================ BROADPHASE */
  function Grid(w, h, cell) {
    this.cell = cell;
    this.cols = Math.ceil(w / cell) + 2;
    this.rows = Math.ceil(h / cell) + 2;
    this.buckets = new Array(this.cols * this.rows);
    for (var i = 0; i < this.buckets.length; i++) this.buckets[i] = [];
    this.stamp = [];
    this.tick = 0;
  }
  Grid.prototype.add = function (obj, aabb) {
    var c = this.cell;
    var x0 = Math.max(0, Math.floor(aabb[0] / c) + 1), y0 = Math.max(0, Math.floor(aabb[1] / c) + 1);
    var x1 = Math.min(this.cols - 1, Math.floor(aabb[2] / c) + 1), y1 = Math.min(this.rows - 1, Math.floor(aabb[3] / c) + 1);
    for (var y = y0; y <= y1; y++)
      for (var x = x0; x <= x1; x++)
        this.buckets[y * this.cols + x].push(obj);
  };
  Grid.prototype.query = function (bx, by, r, out) {
    out.length = 0;
    var c = this.cell;
    var x0 = Math.max(0, Math.floor((bx - r) / c) + 1), y0 = Math.max(0, Math.floor((by - r) / c) + 1);
    var x1 = Math.min(this.cols - 1, Math.floor((bx + r) / c) + 1), y1 = Math.min(this.rows - 1, Math.floor((by + r) / c) + 1);
    var t = ++this.tick, st = this.stamp;
    for (var y = y0; y <= y1; y++) {
      for (var x = x0; x <= x1; x++) {
        var arr = this.buckets[y * this.cols + x];
        for (var i = 0; i < arr.length; i++) {
          var o = arr[i];
          if (st[o._gid] === t) continue;
          st[o._gid] = t;
          out.push(o);
        }
      }
    }
    return out;
  };

  /* ================================================================ WORLD */
  P.World = function (w, h) {
    this.w = w; this.h = h;
    this.balls = [];
    this.statics = [];       // solid colliders
    this.zones = [];         // triggers
    this.flippers = [];
    this.grid = null;
    this.events = [];
    this.gx = 0;             // extra acceleration (nudge / global tilt)
    this.gy = P.G_PLANE;
    this.nudgeVX = 0; this.nudgeVY = 0;
    this.shakeX = 0; this.shakeY = 0;
    this.time = 0;
    this._cand = [];
    this._pv = [0, 0];
    this.gravityScale = 1;
    this.onHit = null;       // fn(tag, ball, info)
    this.onZone = null;      // fn(tag, ball, entering)
    this.magnets = [];
  };

  P.World.prototype.add = function (o) {
    if (o.type === 'zone') this.zones.push(o); else this.statics.push(o);
    return o;
  };
  P.World.prototype.addAll = function (list) {
    for (var i = 0; i < list.length; i++) this.add(list[i]);
    return list;
  };
  P.World.prototype.build = function () {
    this.grid = new Grid(this.w + 200, this.h + 200, 58);
    for (var i = 0; i < this.statics.length; i++) {
      var s = this.statics[i];
      s._gid = i;
      this.grid.add(s, s.aabb(P.BALL_R + 2));
    }
  };
  /** Re-index after geometry changes (drop target banks raise/lower). */
  P.World.prototype.rebuild = function () { this.build(); };

  P.World.prototype.spawn = function (x, y) {
    var b = new P.Ball(x, y);
    this.balls.push(b);
    return b;
  };
  P.World.prototype.remove = function (b) {
    var i = this.balls.indexOf(b);
    if (i >= 0) this.balls.splice(i, 1);
  };

  P.World.prototype.nudge = function (ax, ay, power) {
    power = power === undefined ? 1 : power;
    // The cabinet moves one way; relative to the cabinet the balls move the other.
    var imp = 340 * power;
    for (var i = 0; i < this.balls.length; i++) {
      var b = this.balls[i];
      if (b.state !== 'field') continue;
      b.vx -= ax * imp * U.rng.range(0.85, 1.15);
      b.vy -= ay * imp * U.rng.range(0.85, 1.15);
    }
    this.shakeX += ax * 5.2 * power;
    this.shakeY += ay * 5.2 * power;
  };

  /* --------------------------------------------------------- contact math */
  function contact(world, b, n, m, surfVX, surfVY, tag, obj) {
    var nx = n.nx, ny = n.ny;
    // positional correction
    var push = n.pen;
    if (push > 0) { b.x += nx * push; b.y += ny * push; }

    var rvx = b.vx - (surfVX || 0), rvy = b.vy - (surfVY || 0);
    var vn = rvx * nx + rvy * ny;
    if (vn >= 0) return 0;

    var speed = -vn;
    var e = m.e;
    if (m.falloff) e *= (1 - m.falloff * Math.min(1, speed / 3400));
    if (speed < 95) e = 0;                    // settle instead of micro-bouncing
    if (e < 0) e = 0;

    var Jn = -(1 + e) * vn;                   // >= 0, velocity change along n
    b.vx += Jn * nx; b.vy += Jn * ny;

    // tangential friction + spin coupling (solid sphere: 1/m + r^2/I = 3.5/m)
    var tx = -ny, ty = nx;
    var vt = rvx * tx + rvy * ty;
    var slip = vt - b.spin * b.r;
    var jt = -slip / 3.5;
    var maxT = m.f * Jn;
    if (jt > maxT) jt = maxT; else if (jt < -maxT) jt = -maxT;
    b.vx += jt * tx; b.vy += jt * ty;
    b.spin += -2.5 * jt / b.r;

    // manufacturing scatter — real rubber never returns a ball twice the same
    if (m.scatter && speed > 260) {
      var a = U.rng.jit(m.scatter) * Math.min(1, speed / 2600);
      var c = Math.cos(a), s = Math.sin(a);
      var nvx = b.vx * c - b.vy * s, nvy = b.vx * s + b.vy * c;
      b.vx = nvx; b.vy = nvy;
    }

    if (tag && world.onHit) world.onHit(tag, b, { speed: speed, nx: nx, ny: ny, obj: obj });
    b.lastHit = tag || b.lastHit;
    return speed;
  }
  P.contact = contact;

  /* ----------------------------------------------------------------- step */
  P.World.prototype.step = function (dt) {
    this.time += dt;

    // decay the cabinet shake
    this.shakeX *= Math.pow(0.0008, dt);
    this.shakeY *= Math.pow(0.0008, dt);

    var i, j, b;
    for (i = 0; i < this.flippers.length; i++) this.flippers[i].step(dt);

    var gy = this.gy * this.gravityScale;
    var gx = this.gx;

    for (i = 0; i < this.balls.length; i++) {
      b = this.balls[i];
      if (b.state === 'ramp' && b.ramp) {
        b.age += dt;
        var res = b.ramp.path.step(b, dt);
        if (res !== 'run' && this.onRampEnd) this.onRampEnd(b, res);
        continue;
      }
      if (b.state !== 'field') continue;
      b.age += dt;
      b.px = b.x; b.py = b.y;

      // gravity down the inclined plane
      b.vx += gx * dt;
      b.vy += gy * dt;

      // magnets (wizard mode / ball-lock assist)
      for (j = 0; j < this.magnets.length; j++) {
        var mg = this.magnets[j];
        if (!mg.on) continue;
        var mdx = mg.x - b.x, mdy = mg.y - b.y;
        var md = Math.sqrt(mdx * mdx + mdy * mdy);
        if (md < mg.r && md > 0.5) {
          var f = mg.force * (1 - md / mg.r);
          b.vx += (mdx / md) * f * dt;
          b.vy += (mdy / md) * f * dt;
        }
      }

      // rolling resistance
      var sp = Math.sqrt(b.vx * b.vx + b.vy * b.vy);
      if (sp > 1e-4) {
        var dec = (P.ROLL_RESIST + P.ROLL_DRAG * sp) * dt;
        var ns = sp - dec;
        if (ns < 0) ns = 0;
        b.vx *= ns / sp; b.vy *= ns / sp;
        sp = ns;
      }
      if (sp > P.MAX_SPEED) { var k = P.MAX_SPEED / sp; b.vx *= k; b.vy *= k; sp = P.MAX_SPEED; }

      // spin decays toward the rolling condition
      b.spin -= b.spin * Math.min(1, P.SPIN_DRAG * dt);
      b.roll += b.spin * dt;

      b.x += b.vx * dt;
      b.y += b.vy * dt;

      /* ---- static colliders --------------------------------------- */
      var cand = this.grid.query(b.x, b.y, b.r + 1, this._cand);
      for (j = 0; j < cand.length; j++) {
        var o = cand[j];
        if (!o.enabled || !o.solid) continue;
        var n = o.test(b);
        if (!n) continue;
        if (o.gate) {
          // one-way: pass freely when travelling along the gate normal
          var along = b.vx * o.nx + b.vy * o.ny;
          if (along > 0) continue;
        }
        contact(this, b, n, o.mat, 0, 0, o.tag, o);
      }

      /* ---- flippers ----------------------------------------------- */
      for (j = 0; j < this.flippers.length; j++) {
        var fl = this.flippers[j];
        if (!fl.enabled) continue;
        var fn = fl.test(b);
        if (!fn) continue;
        fl.pointVel(fn.cx, fn.cy, this._pv);
        var sBefore = b.speed();
        contact(this, b, fn, fl.mat, this._pv[0], this._pv[1], 'flipper:' + fl.name, fl);
        if (b.speed() > sBefore + 250) fl.hitT = 0.09;
      }
    }

    /* ---- ball vs ball ---------------------------------------------- */
    if (this.balls.length > 1) this.ballVsBall();

    /* ---- trigger zones --------------------------------------------- */
    for (i = 0; i < this.balls.length; i++) {
      b = this.balls[i];
      if (b.state !== 'field') continue;
      for (j = 0; j < this.zones.length; j++) {
        var z = this.zones[j];
        if (!z.enabled) continue;
        var was = !!z.inside[b.id];
        var now = z.contains(b);
        if (now && !was) {
          if (z.dirY && U.sign(b.vy) !== z.dirY) { continue; }
          if (z.dirX && U.sign(b.vx) !== z.dirX) { continue; }
          z.inside[b.id] = true;
          if (this.onZone) this.onZone(z.tag, b, true, z);
        } else if (!now && was) {
          z.inside[b.id] = false;
          if (this.onZone) this.onZone(z.tag, b, false, z);
        }
      }
    }
  };

  P.World.prototype.ballVsBall = function () {
    var m = P.MAT.ball;
    for (var i = 0; i < this.balls.length; i++) {
      var a = this.balls[i];
      if (a.state !== 'field') continue;
      for (var j = i + 1; j < this.balls.length; j++) {
        var c = this.balls[j];
        if (c.state !== 'field') continue;
        var dx = c.x - a.x, dy = c.y - a.y;
        var d = Math.sqrt(dx * dx + dy * dy);
        var lim = a.r + c.r;
        if (d >= lim || d < 1e-6) continue;
        var nx = dx / d, ny = dy / d;
        var pen = lim - d;
        a.x -= nx * pen * 0.5; a.y -= ny * pen * 0.5;
        c.x += nx * pen * 0.5; c.y += ny * pen * 0.5;
        var rvx = c.vx - a.vx, rvy = c.vy - a.vy;
        var vn = rvx * nx + rvy * ny;
        if (vn >= 0) continue;
        var e = vn < -95 ? m.e : 0;
        var J = -(1 + e) * vn * 0.5;
        a.vx -= J * nx; a.vy -= J * ny;
        c.vx += J * nx; c.vy += J * ny;
        if (this.onHit && -vn > 300) this.onHit('ballball', a, { speed: -vn, nx: nx, ny: ny });
      }
    }
  };

  /** Advance by wall-clock dt using fixed substeps; returns substeps run. */
  P.World.prototype.advance = function (dt, maxSteps) {
    this._acc = (this._acc || 0) + dt;
    var n = 0;
    maxSteps = maxSteps || 40;
    while (this._acc >= P.DT && n < maxSteps) {
      this.step(P.DT);
      this._acc -= P.DT;
      n++;
    }
    if (n >= maxSteps) this._acc = 0;    // don't spiral on a slow frame
    return n;
  };

  /* ------------------------------------------------------------ RAMP PATH */
  /**
   * A guided path the ball follows once it commits to a ramp/wireform.
   * pts: [{x,y,z}]  (z = height above the playfield in mm)
   * The ball keeps a scalar speed along the arc length; gravity resolves into
   * the path tangent, so a weak shot stalls and rolls back out of the entrance.
   */
  P.RampPath = function (name, ctrl, opt) {
    opt = opt || {};
    this.name = name;
    this.pts = U.catmull(ctrl, 12, false);
    this.ctrl = ctrl;
    // arc-length parametrise
    var L = 0;
    this.pts[0].s = 0;
    for (var i = 1; i < this.pts.length; i++) {
      var a = this.pts[i - 1], b = this.pts[i];
      var dx = b.x - a.x, dy = b.y - a.y, dz = (b.z || 0) - (a.z || 0);
      L += Math.sqrt(dx * dx + dy * dy + dz * dz);
      b.s = L;
    }
    this.length = L;
    this.friction = opt.friction === undefined ? 55 : opt.friction;  // mm/s^2
    this.drag = opt.drag === undefined ? 0.10 : opt.drag;
    this.exitBoost = opt.exitBoost || 0;
    this.tag = opt.tag || name;
    this.width = opt.width || 34;
    this.style = opt.style || 'plastic';   // plastic | wire
    this.wireFrom = opt.wireFrom === undefined ? 0.55 : opt.wireFrom; // fraction where the habitrail begins
    this.color = opt.color || '#7fd4ff';
  };
  P.RampPath.prototype.at = function (s) {
    var pts = this.pts;
    if (s <= 0) return { x: pts[0].x, y: pts[0].y, z: pts[0].z || 0, i: 0 };
    if (s >= this.length) { var l = pts[pts.length - 1]; return { x: l.x, y: l.y, z: l.z || 0, i: pts.length - 1 }; }
    var lo = 0, hi = pts.length - 1;
    while (lo + 1 < hi) { var mid = (lo + hi) >> 1; if (pts[mid].s <= s) lo = mid; else hi = mid; }
    var a = pts[lo], b = pts[lo + 1];
    var t = (s - a.s) / ((b.s - a.s) || 1);
    return { x: U.lerp(a.x, b.x, t), y: U.lerp(a.y, b.y, t), z: U.lerp(a.z || 0, b.z || 0, t), i: lo, t: t };
  };
  P.RampPath.prototype.tangent = function (s) {
    var e = Math.min(6, this.length * 0.02);
    var a = this.at(Math.max(0, s - e)), b = this.at(Math.min(this.length, s + e));
    var dx = b.x - a.x, dy = b.y - a.y, dz = b.z - a.z;
    var L = Math.sqrt(dx * dx + dy * dy + dz * dz) || 1;
    return { x: dx / L, y: dy / L, z: dz / L };
  };
  /** One physics substep for a ball riding this path. Returns 'run'|'exit'|'back'. */
  P.RampPath.prototype.step = function (b, dt) {
    var r = b.ramp;
    var T = this.tangent(r.s);
    // gravity resolved into the tangent: in-plane +Y and out-of-plane -Z
    var a = P.G_PLANE * T.y - P.G_NORMAL * T.z;
    a -= U.sign(r.v) * this.friction;
    a -= r.v * this.drag;
    r.v += a * dt;
    r.s += r.v * dt;
    if (r.s >= this.length) { r.s = this.length; return 'exit'; }
    if (r.s <= 0) { r.s = 0; return 'back'; }
    var p = this.at(r.s);
    b.x = p.x; b.y = p.y; b.z = p.z;
    b.roll += (r.v / b.r) * dt;
    return 'run';
  };

})(window.PB = window.PB || {});
