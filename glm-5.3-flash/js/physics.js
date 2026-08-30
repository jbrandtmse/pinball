/* =========================================================================
   RISE OF ATLANTIS — physics.js
   2D pinball physics in real units (inches, seconds). Playfield modeled as
   the top-down plane; gravity is the along-incline component (6.5 deg).
   Node-safe.
   ========================================================================= */
(function (root) {
  'use strict';
  const U = root.AR_UTIL;

  // ---- constants ----------------------------------------------------------
  const BALL_R = 1.0625 / 2;        // 0.53125 in
  const INCLINE = 6.5 * Math.PI / 180;
  const G_FULL = 386.088;           // in/s^2
  const G = G_FULL * Math.sin(INCLINE); // ~43.7 in/s^2 along +y
  const MAXV = 170;
  const DT = 1 / 240;

  const MAT = {
    wall:   { rest: 0.42, sound: 'wall' },
    rail:   { rest: 0.50, sound: 'rail' },
    rubber: { rest: 0.62, sound: 'rubber' },
    target: { rest: 0.35, sound: 'target' },
    metal:  { rest: 0.55, sound: 'metal' },
  };

  let nextId = 1;

  // ---- element constructors ------------------------------------------------
  function seg(x1, y1, x2, y2, opts) {
    const o = opts || {};
    return {
      kind: 'seg',
      id: o.id || ('s' + nextId++),
      ax: x1, ay: y1, bx: x2, by: y2,
      mat: o.mat || 'wall',
      thick: o.thick !== undefined ? o.thick : 0.12,
      gate: o.gate || null,          // 'pos' = collide only from normal side
      sling: o.sling || 0,           // kick impulse strength
      target: o.target || null,      // target descriptor {group, drop}
      flash: -9, hitCount: 0,
    };
  }

  function post(x, y, r, opts) {
    const o = opts || {};
    return {
      kind: 'post',
      id: o.id || ('p' + nextId++),
      x, y, r: r,
      mat: o.mat || 'rubber',
      bumper: o.bumper || false,
      flash: -9, hitCount: 0,
    };
  }

  // ---- corridor (elevated ramp / guide path) -------------------------------
  function corridor(id, pts, opts) {
    const o = opts || {};
    const cum = [0];
    for (let i = 1; i < pts.length; i++) {
      cum.push(cum[i - 1] + Math.hypot(pts[i].x - pts[i - 1].x, pts[i].y - pts[i - 1].y));
    }
    return {
      kind: 'corridor', id,
      pts, cum, len: cum[cum.length - 1],
      halfW: o.halfW !== undefined ? o.halfW : 0.62,
      minSpd: o.minSpd !== undefined ? o.minSpd : 16,
      exitCap: o.exitCap,             // max exit speed (gentle wire-form deposits)
      cool: Object.create(null),      // ballId -> time until re-entry allowed
      walls: o.walls !== false,       // build physical side walls (stray balls deflect)
      flash: -9,
    };
  }

  function corridorPointAt(cor, t) {
    const pts = cor.pts, cum = cor.cum;
    if (t <= 0) { const p = pts[0], q = pts[1]; const l = Math.hypot(q.x - p.x, q.y - p.y) || 1; return { x: p.x, y: p.y, tx: (q.x - p.x) / l, ty: (q.y - p.y) / l }; }
    if (t >= cor.len) { const n = pts.length; const p = pts[n - 2], q = pts[n - 1]; const l = Math.hypot(q.x - p.x, q.y - p.y) || 1; return { x: q.x, y: q.y, tx: (q.x - p.x) / l, ty: (q.y - p.y) / l }; }
    let i = 1;
    while (i < cum.length && cum[i] < t) i++;
    const p = pts[i - 1], q = pts[i];
    const segLen = cum[i] - cum[i - 1] || 1;
    const f = (t - cum[i - 1]) / segLen;
    const l = Math.hypot(q.x - p.x, q.y - p.y) || 1;
    return { x: p.x + (q.x - p.x) * f, y: p.y + (q.y - p.y) * f, tx: (q.x - p.x) / l, ty: (q.y - p.y) / l };
  }

  // ---- flipper --------------------------------------------------------------
  function flipper(id, px, py, len, side, opts) {
    const o = opts || {};
    return {
      kind: 'flipper', id, px, py, len, side, // side: +1 = left flipper, -1 = right
      rBase: o.rBase !== undefined ? o.rBase : 0.40,
      rTip: o.rTip !== undefined ? o.rTip : 0.30,
      restAng: o.restAng !== undefined ? o.restAng : 30 * Math.PI / 180,
      upAng: o.upAng !== undefined ? o.upAng : -26 * Math.PI / 180,
      ang: 0, angVel: 0, pressed: false,
      omegaUp: 33,    // rad/s toward up (coils)
      omegaDown: 19,  // rad/s return (gravity+spring)
      flash: -9,
    };
  }

  function flipperTip(f) {
    return { x: f.px + Math.cos(f.ang) * f.len, y: f.py + Math.sin(f.ang) * f.len };
  }

  // ---- world ----------------------------------------------------------------
  function World() {
    this.segs = [];
    this.posts = [];
    this.cors = [];
    this.flippers = [];
    this.zones = [];        // {id,x,y,r,type} capture / sensor / kick zones
    this.grid = new Map();
    this.cell = 2;
    this.time = 0;
    this.balls = [];
    this.em = new U.Emitter();
    this._stamp = 0;
    this._cand = [];
  }

  World.prototype.addSeg = function (x1, y1, x2, y2, opts) { const s = seg(x1, y1, x2, y2, opts); this.segs.push(s); return s; };
  World.prototype.addPoly = function (pts, closed, opts) {
    const out = [];
    const n = pts.length;
    const m = closed ? n : n - 1;
    for (let i = 0; i < m; i++) {
      const a = pts[i], b = pts[(i + 1) % n];
      out.push(this.addSeg(a.x, a.y, b.x, b.y, opts));
    }
    return out;
  };
  World.prototype.addPost = function (x, y, r, opts) { const p = post(x, y, r, opts); this.posts.push(p); return p; };
  World.prototype.addCorridor = function (id, pts, opts) { const c = corridor(id, pts, opts); this.cors.push(c); return c; };
  World.prototype.addFlipper = function (id, px, py, len, side, opts) { const f = flipper(id, px, py, len, side, opts); f.ang = f.restAng; this.flippers.push(f); return f; };
  World.prototype.addZone = function (z) { this.zones.push(z); return z; };

  World.prototype.buildGrid = function () {
    this.grid.clear();
    const cell = this.cell;
    const insert = (item, minx, miny, maxx, maxy) => {
      const cx0 = Math.floor(minx / cell), cx1 = Math.floor(maxx / cell);
      const cy0 = Math.floor(miny / cell), cy1 = Math.floor(maxy / cell);
      for (let cy = cy0; cy <= cy1; cy++) for (let cx = cx0; cx <= cx1; cx++) {
        const k = cx * 1000 + cy;
        let arr = this.grid.get(k);
        if (!arr) { arr = []; this.grid.set(k, arr); }
        arr.push(item);
      }
    };
    for (const s of this.segs) {
      const hw = s.thick / 2 + BALL_R + 0.1;
      const minx = Math.min(s.ax, s.bx) - hw, maxx = Math.max(s.ax, s.bx) + hw;
      const miny = Math.min(s.ay, s.by) - hw, maxy = Math.max(s.ay, s.by) + hw;
      insert({ t: 's', o: s }, minx, miny, maxx, maxy);
    }
    for (const p of this.posts) {
      const r = p.r + BALL_R + 0.1;
      insert({ t: 'p', o: p }, p.x - r, p.y - r, p.x + r, p.y + r);
    }
    for (const f of this.flippers) {
      const r = f.len + f.rBase + BALL_R + 0.2;
      insert({ t: 'f', o: f }, f.px - r, f.py - r, f.px + r, f.py + r);
    }
  };

  // collect candidates for a ball AABB into this._cand (dedup by stamp)
  World.prototype.query = function (minx, miny, maxx, maxy) {
    this._stamp++;
    this._cand.length = 0;
    const cell = this.cell;
    const cx0 = Math.floor(minx / cell), cx1 = Math.floor(maxx / cell);
    const cy0 = Math.floor(miny / cell), cy1 = Math.floor(maxy / cell);
    for (let cy = cy0; cy <= cy1; cy++) for (let cx = cx0; cx <= cx1; cx++) {
      const arr = this.grid.get(cx * 1000 + cy);
      if (!arr) continue;
      for (let i = 0; i < arr.length; i++) {
        const c = arr[i];
        if (c._st === this._stamp) continue;
        c._st = this._stamp;
        this._cand.push(c);
      }
    }
    return this._cand;
  };

  // ---- balls ------------------------------------------------------------------
  World.prototype.addBall = function (x, y) {
    const b = {
      id: 'b' + nextId++,
      x, y, vx: 0, vy: 0,
      state: 'free',        // free | ramp | captured | plunger | gone
      capId: null, rampRef: null,
      noCorUntil: Object.create(null),
      lastSwitch: 0,
      trail: [],
    };
    this.balls.push(b);
    return b;
  };

  World.prototype.removeBall = function (b) {
    const i = this.balls.indexOf(b);
    if (i >= 0) this.balls.splice(i, 1);
  };

  // ---- collisions ------------------------------------------------------------
  World.prototype.collideBallStatic = function (b) {
    const r = BALL_R;
    const cand = this.query(b.x - r - 0.3, b.y - r - 0.3, b.x + r + 0.3, b.y + r + 0.3);
    let hit = null;
    for (let i = 0; i < cand.length; i++) {
      const c = cand[i];
      if (c.t === 'f') { this.collideFlipper(b, c.o); continue; }
      if (c.t === 'p') { hit = this.collideCircle(b, c.o) || hit; continue; }
      if (c.t === 's') {
        const s = c.o;
        if (s.target && s.target.down) continue;
        hit = this.collideSeg(b, s) || hit;
      }
    }
    return hit;
  };

  World.prototype.collideSeg = function (b, s) {
    const cp = U.closestOnSeg(b.x, b.y, s.ax, s.ay, s.bx, s.by);
    const rad = BALL_R + s.thick / 2;
    const d2 = cp.d2;
    if (d2 >= rad * rad) return false;
    const d = Math.sqrt(d2) || 1e-6;
    let nx = (b.x - cp.x) / d, ny = (b.y - cp.y) / d;
    // resolve position
    const push = rad - d + 0.001;
    b.x += nx * push; b.y += ny * push;
    const vn = b.vx * nx + b.vy * ny;
    if (vn < 0) {
      const m = MAT[s.mat] || MAT.wall;
      let rest = m.rest;
      // one-way gate: only block from the normal side is handled by caller geometry
      const j = -(1 + rest) * vn;
      b.vx += nx * j; b.vy += ny * j;
      // tangential friction
      const tx = -ny, ty = nx;
      const vt = b.vx * tx + b.vy * ty;
      const fr = 0.03;
      b.vx -= tx * vt * fr; b.vy -= ty * vt * fr;
      const impact = -vn;
      if (impact > 3) {
        s.flash = this.time; s.hitCount++;
        this.onHit(s.id, b, impact, s);
      }
      // slingshot active kick
      if (s.sling && impact > 2.5) {
        const k = s.sling;
        b.vx += nx * k; b.vy += ny * k;
        this.onHit(s.id + ':kick', b, impact, s);
      }
      // standup / drop target register
      if (s.target && impact > 4) {
        this.onHit('target:' + s.target.id, b, impact, s);
      }
    }
    this.capSpeed(b);
    return true;
  };

  World.prototype.collideCircle = function (b, p) {
    const rad = BALL_R + p.r;
    let dx = b.x - p.x, dy = b.y - p.y;
    const d2 = dx * dx + dy * dy;
    if (d2 >= rad * rad) return false;
    const d = Math.sqrt(d2) || 1e-6;
    let nx = dx / d, ny = dy / d;
    b.x = p.x + nx * (rad + 0.001);
    b.y = p.y + ny * (rad + 0.001);
    const vn = b.vx * nx + b.vy * ny;
    if (vn < 0) {
      const m = MAT[p.mat] || MAT.rubber;
      if (p.bumper) {
        // active pop bumper: set outward speed
        const out = Math.max(-vn * 0.55, 58 + U.rand(-4, 6));
        b.vx = nx * out + U.rand(-6, 6);
        b.vy = ny * out + U.rand(-6, 6);
        p.flash = this.time; p.hitCount++;
        this.onHit('bumper', b, out, p);
        this.onHit('bumper:' + p.id, b, out, p);
      } else {
        const j = -(1 + m.rest) * vn;
        b.vx += nx * j; b.vy += ny * j;
        if (-vn > 3) { p.flash = this.time; p.hitCount++; this.onHit('post', b, -vn, p); }
      }
    }
    this.capSpeed(b);
    return true;
  };

  World.prototype.collideFlipper = function (b, f) {
    const tip = flipperTip(f);
    const cp = U.closestOnSeg(b.x, b.y, f.px, f.py, tip.x, tip.y);
    const rad = BALL_R + (f.rBase + (f.rTip - f.rBase) * cp.t);
    const d2 = cp.d2;
    if (d2 >= rad * rad) return false;
    const d = Math.sqrt(d2) || 1e-6;
    const nx = (b.x - cp.x) / d, ny = (b.y - cp.y) / d;
    // position correction
    b.x = cp.x + nx * (rad + 0.002);
    b.y = cp.y + ny * (rad + 0.002);
    // surface velocity at contact from angular motion
    const rx = cp.x - f.px, ry = cp.y - f.py;
    const sx = -ry * f.angVel, sy = rx * f.angVel;
    const rvx = b.vx - sx, rvy = b.vy - sy;
    const vn = rvx * nx + rvy * ny;
    if (vn < 0) {
      const e = 0.45;
      const j = -(1 + e) * vn;
      b.vx += nx * j; b.vy += ny * j;
      const impact = -vn;
      if (impact > 3 && Math.abs(f.angVel) > 1) {
        f.flash = this.time;
        this.onHit('flipper', b, impact, f);
      }
    }
    // rubber grip: tangential friction lets players trap/cradle the ball
    {
      const tx2 = -ny, ty2 = nx;
      const relT = (b.vx - sx) * tx2 + (b.vy - sy) * ty2;
      const grip = 0.1;
      b.vx -= tx2 * relT * grip;
      b.vy -= ty2 * relT * grip;
    }
    // carrying: while the coil is stroking, the ball rides the rubber face —
    // it cannot leave slower than the surface it rests on (real coil transfer)
    if (Math.abs(f.angVel) > 1) {
      const vsx = -ry * f.angVel, vsy = rx * f.angVel;
      const vnS = vsx * nx + vsy * ny;
      const vnB = b.vx * nx + b.vy * ny;
      if (vnS > 0 && vnB < vnS) {
        b.vx += nx * (vnS - vnB);
        b.vy += ny * (vnS - vnB);
      }
    }
    this.capSpeed(b);
    return true;
  };

  World.prototype.capSpeed = function (b) {
    const s2 = b.vx * b.vx + b.vy * b.vy;
    if (s2 > MAXV * MAXV) {
      const s = Math.sqrt(s2);
      b.vx = b.vx / s * MAXV; b.vy = b.vy / s * MAXV;
    }
  };

  // ball-ball
  World.prototype.collideBalls = function () {
    const bs = this.balls;
    for (let i = 0; i < bs.length; i++) {
      const a = bs[i];
      if (a.state !== 'free') continue;
      for (let j = i + 1; j < bs.length; j++) {
        const c = bs[j];
        if (c.state !== 'free') continue;
        const dx = c.x - a.x, dy = c.y - a.y;
        const d2 = dx * dx + dy * dy;
        const rad = BALL_R * 2;
        if (d2 < rad * rad && d2 > 1e-9) {
          const d = Math.sqrt(d2);
          const nx = dx / d, ny = dy / d;
          const overlap = (rad - d) / 2 + 0.001;
          a.x -= nx * overlap; a.y -= ny * overlap;
          c.x += nx * overlap; c.y += ny * overlap;
          const rvn = (c.vx - a.vx) * nx + (c.vy - a.vy) * ny;
          if (rvn < 0) {
            const j = -(1 + 0.92) * rvn / 2;
            a.vx -= nx * j; a.vy -= ny * j;
            c.vx += nx * j; c.vy += ny * j;
            this.onHit('ballball', a, -rvn, c);
          }
        }
      }
    }
  };

  // ---- ramps / corridors -------------------------------------------------------
  World.prototype.tryCorridorCapture = function (b) {
    for (const cor of this.cors) {
      if ((b.noCorUntil[cor.id] || 0) > this.time) continue;
      const p0 = cor.pts[0], p1 = cor.pts[1];
      const dx = p1.x - p0.x, dy = p1.y - p0.y;
      const l = Math.hypot(dx, dy) || 1;
      const tx = dx / l, ty = dy / l;
      const rx = b.x - p0.x, ry = b.y - p0.y;
      const along = rx * tx + ry * ty;
      const side = Math.abs(rx * -ty + ry * tx);
      const spd = Math.hypot(b.vx, b.vy);
      if (along > -0.6 && along < 1.1 && side < cor.halfW * 1.35 && spd > cor.minSpd) {
        const align = (b.vx * tx + b.vy * ty) / (spd || 1);
        if (align > 0.5) {
          b.state = 'ramp';
          b.rampRef = { cor, s: Math.max(along, 0), v: Math.max(spd * 0.92, cor.minSpd) };
          cor.flash = this.time;
          this.onHit('rampEnter:' + cor.id, b, spd, cor);
          return true;
        }
      }
    }
    return false;
  };

  World.prototype.stepCorridorBall = function (b, dt) {
    const r = b.rampRef, cor = r.cor;
    // signed speed s along path; tangent y-component drives gravity
    const p = corridorPointAt(cor, r.s);
    const sgn = r.v >= 0 ? 1 : -1;
    const ty = p.ty * sgn;
    // gravity + rolling friction along path
    r.v += (G * ty) * dt;
    const fr = 5.0 + 0.06 * Math.abs(r.v);
    r.v -= Math.sign(r.v) * Math.min(Math.abs(r.v), fr * dt);
    r.s += r.v * dt;
    // stalled or oscillating in a dip: roll back out (never hang mid-ramp)
    if (Math.abs(r.v) < 12) {
      r.stillT = (r.stillT || 0) + dt;
      if (r.stillT > 2.0) {
        const pt = corridorPointAt(cor, Math.max(0, r.s));
        this.releaseCorridor(b, pt.x, pt.y, -pt.tx * 14, -pt.ty * 14, cor, false);
        return;
      }
    } else r.stillT = 0;
    if (r.s >= cor.len) {
      // exit at end
      const e = corridorPointAt(cor, cor.len);
      let spd = Math.max(Math.abs(r.v) * 0.9, 14);
      if (cor.exitCap) spd = Math.min(spd, cor.exitCap);
      this.releaseCorridor(b, e.x, e.y, e.tx * spd, e.ty * spd, cor, true);
    } else if (r.s <= 0 && r.v < 0) {
      // rolled back out the entry
      const st = corridorPointAt(cor, 0);
      const spd = Math.min(Math.abs(r.v), 18);
      this.releaseCorridor(b, st.x, st.y, -st.tx * spd, -st.ty * spd, cor, false);
    } else {
      const p2 = corridorPointAt(cor, Math.max(0, Math.min(cor.len, r.s)));
      b.x = p2.x; b.y = p2.y;
      b.vx = p2.tx * r.v; b.vy = p2.ty * r.v;
    }
  };

  World.prototype.releaseCorridor = function (b, x, y, vx, vy, cor, atEnd) {
    b.state = 'free';
    b.rampRef = null;
    b.x = x; b.y = y;
    b.vx = vx; b.vy = vy;
    b.noCorUntil[cor.id] = this.time + 0.7;
    cor.flash = this.time;
    this.onHit(atEnd ? 'rampExit:' + cor.id : 'rampFail:' + cor.id, b, Math.hypot(vx, vy), cor);
  };

  // ---- zones: captures, sensors, kickback -------------------------------------
  World.prototype.checkZones = function (b) {
    for (const z of this.zones) {
      if (z.rect) {
        if (b.x < z.rect.x0 || b.x > z.rect.x1 || b.y < z.rect.y0 || b.y > z.rect.y1) continue;
      } else {
        const dx = b.x - z.x, dy = b.y - z.y;
        if (dx * dx + dy * dy > z.r * z.r) continue;
      }
      const spd = Math.hypot(b.vx, b.vy);
      if (z.type === 'capture') {
        if (b._zCool && b._zCool[z.id] > this.time) continue;
        if (z.cond && !z.cond(b, spd)) continue;
        b.state = 'captured';
        b.capId = z.id;
        b.vx = 0; b.vy = 0;
        b.x = z.x; b.y = z.y;
        this.onHit('captured:' + z.id, b, spd, z);
      } else if (z.type === 'link') {
        // elevated return guide (orbit -> inlane): hand the ball to a corridor
        if (z.cond && !z.cond(b, spd)) continue;
        const cor = this.cors.find(c => c.id === z.cor);
        if (!cor) continue;
        b.state = 'ramp';
        b.rampRef = { cor, s: 0, v: Math.max(spd * 0.85, 12) };
        this.onHit('orbitDep:' + z.cor, b, spd, z);
      } else if (z.type === 'sensor') {
        if ((b._zCool && b._zCool[z.id] > this.time)) continue;
        if (!(b._zCool)) b._zCool = {};
        b._zCool[z.id] = this.time + (z.cool || 0.45);
        this.onHit('sensor:' + z.id, b, spd, z);
      } else if (z.type === 'kick') {
        if (z.cool && (b._zCool && b._zCool[z.id] > this.time)) continue;
        // kickback: rules decides via z.active
        if (z.active) {
          if (!b._zCool) b._zCool = {};
          b._zCool[z.id] = this.time + 1.2;
          const p = U.norm(z.dir);
          b.vx = p.x * z.power; b.vy = p.y * z.power;
          z.active = false;
          z.flash = this.time;
          this.onHit('kickback', b, z.power, z);
        }
      }
    }
  };

  // ---- main step -----------------------------------------------------------------
  World.prototype.stepFlipper = function (f, dt) {
    const target = f.pressed ? f.upAng : f.restAng;
    const om = f.pressed ? f.omegaUp : f.omegaDown;
    const d = target - f.ang;
    const maxStep = om * dt;
    if (Math.abs(d) <= maxStep) {
      f.ang = target; f.angVel = 0;
    } else {
      f.angVel = Math.sign(d) * om;
      f.ang += f.angVel * dt;
    }
  };

  World.prototype.step = function (dt) {
    this.time += dt;
    for (const f of this.flippers) this.stepFlipper(f, dt);

    for (let bi = this.balls.length - 1; bi >= 0; bi--) {
      const b = this.balls[bi];
      if (b.state === 'ramp') { this.stepCorridorBall(b, dt); continue; }
      if (b.state !== 'free') continue;

      // gravity + damping
      b.vy += G * dt;
      const sp = Math.hypot(b.vx, b.vy);
      const damp = 1 - 0.16 * dt;
      b.vx *= damp; b.vy *= damp;
      const roll = 1.6 * dt; // constant rolling decel
      if (sp > 0.01) {
        const k = Math.max(0, sp - roll) / sp;
        b.vx *= k; b.vy *= k;
      }

      // substep integration for tunneling safety
      const spd = Math.hypot(b.vx, b.vy);
      const n = Math.max(1, Math.min(6, Math.ceil(spd * dt / 0.2)));
      const h = dt / n;
      for (let i = 0; i < n; i++) {
        b.x += b.vx * h; b.y += b.vy * h;
        this.collideBallStatic(b);
        if (b.state !== 'free') break;
      }
      if (b.state !== 'free') continue;

      this.checkZones(b);
      if (b.state !== 'free') continue;
      this.tryCorridorCapture(b);
    }

    this.collideBalls();

    // anti-wedge: a free ball that barely moves for >3s gets an escalating
    // nudge, unless it is cradled on a flipper (players trap legitimately).
    // Displacement-based so slow V-rolls trigger too, not just dead rests.
    for (const b of this.balls) {
      if (b.state !== 'free') { b.slowT = 0; b.markPos = null; continue; }
      const sp = Math.hypot(b.vx, b.vy);
      if (sp < 4) {
        let cradled = false;
        for (const f of this.flippers) {
          const tip = flipperTip(f);
          const cp = U.closestOnSeg(b.x, b.y, f.px, f.py, tip.x, tip.y);
          if (cp.d2 < (BALL_R + 0.5) * (BALL_R + 0.5)) { cradled = true; break; }
        }
        if (cradled) { b.slowT = 0; b.markPos = null; b.restFires = 0; continue; }
        if (!b.markPos) b.markPos = { x: b.x, y: b.y };
        b.slowT = (b.slowT || 0) + dt;
        if (b.slowT > 3) {
          const moved = Math.hypot(b.x - b.markPos.x, b.y - b.markPos.y);
          b.markPos = { x: b.x, y: b.y };
          b.slowT = 0;
          if (moved < 0.5) {
            b.restFires = (b.restFires || 0) + 1;
            const mag = Math.min(5 + 4 * b.restFires, 26);
            b.vx += U.rand(-1, 1) * mag;
            b.vy -= U.rand(0.25, 0.55) * mag;
            this.onHit('antirest', b, 0, null);
          }
        }
      } else { b.slowT = 0; b.markPos = null; b.restFires = 0; }
    }

    // safety: hard clamp inside cabinet
    for (const b of this.balls) {
      if (b.state === 'free') {
        if (b.x < -2 || b.x > 22.3 || b.y < -2 || b.y > 44) {
          // escaped — recapture into trough (counts as drain via rules watching capId)
          b.state = 'captured'; b.capId = 'trough'; b.vx = 0; b.vy = 0; b.x = 10.1; b.y = 40.6;
          this.onHit('escaped', b, 0, null);
        }
      }
    }
  };

  World.prototype.onHit = function (ev, ball, speed, obj) {
    ball.lastSwitch = this.time;
    this.em.emit(ev, ball, speed, obj);
    this.em.emit('switch', { name: ev, ball, speed, obj });
  };

  // launch helpers
  World.prototype.launchPlungerBall = function (b, power) {
    b.state = 'free';
    b.x = 19.18; b.y = 40.2;
    const v = 34 + 118 * power;
    b.vx = U.rand(-3, 3);
    b.vy = -v;
    this.onHit('launch', b, v, null);
  };

  root.AR_PHYS = { World, corridorPointAt, BALL_R, G, DT, MAXV, MAT };
  if (typeof module !== 'undefined' && module.exports) module.exports = root.AR_PHYS;
})(typeof window !== 'undefined' ? window : globalThis);
