/* DRAGON'S KEEP — physics engine.
 * Discrete solver at 720 Hz substeps (max ball speed 3600 px/s => ~5 px/substep,
 * always < thinnest contact band ~16 px, so no tunneling).
 * Colliders: capsule segments (optionally one-way), circles, sensors
 * (circle overlap + segment crossing). Flippers are kinematic rotating capsules
 * whose surface velocity drives the ball. Runs in browser and Node.
 */
"use strict";
(function (g) {
  const DK = g.DK; const C = DK.C; const M = DK.M;

  const CELL = 64;

  function segAabb(s) {
    const r = s.rad + C.BALL_R + 6;
    return [Math.min(s.ax, s.bx) - r, Math.min(s.ay, s.by) - r,
            Math.max(s.ax, s.bx) + r, Math.max(s.ay, s.by) + r];
  }

  class World {
    constructor() {
      this.solids = [];      // segs + circles
      this.sensorsC = [];    // circle sensors
      this.sensorsX = [];    // crossing (line) sensors
      this.flippers = [];
      this.balls = [];
      this.time = 0;
      this.grid = new Map(); // "cx,cy" -> array of solid indices
      this._gridDirty = true;
      this.gravity = C.GRAV;
    }

    addSeg(o) {
      const s = Object.assign({
        type: "seg", rad: 2, e: 0.45, fr: 0.03, id: null,
        oneway: null, enabled: true
      }, o);
      s.dx = s.bx - s.ax; s.dy = s.by - s.ay;
      s.len2 = s.dx * s.dx + s.dy * s.dy || 1e-9;
      // unit normal (left of a->b)
      const L = Math.sqrt(s.len2);
      s.nx = -s.dy / L; s.ny = s.dx / L;
      this.solids.push(s); this._gridDirty = true;
      return s;
    }

    addCircle(o) {
      const c = Object.assign({ type: "circle", rad: 8, e: 0.6, fr: 0.03, id: null, enabled: true }, o);
      this.solids.push(c); this._gridDirty = true;
      return c;
    }

    addSensorCircle(o) {
      const s = Object.assign({ type: "sc", rad: 14, id: null, enabled: true }, o);
      this.sensorsC.push(s); return s;
    }

    addSensorSeg(o) {
      // crossing sensor: fires when ball center crosses the segment span
      const s = Object.assign({ type: "sx", id: null, enabled: true }, o);
      s.dx = s.bx - s.ax; s.dy = s.by - s.ay;
      s.len2 = s.dx * s.dx + s.dy * s.dy || 1e-9;
      const L = Math.sqrt(s.len2);
      s.nx = -s.dy / L; s.ny = s.dx / L;
      this.sensorsX.push(s); return s;
    }

    // helper: polyline / arc builders
    addPolyline(pts, opts) {
      const out = [];
      for (let i = 0; i < pts.length - 1; i++) {
        out.push(this.addSeg(Object.assign({}, opts, {
          ax: pts[i][0], ay: pts[i][1], bx: pts[i + 1][0], by: pts[i + 1][1]
        })));
      }
      return out;
    }
    arcPts(cx, cy, r, a0, a1, steps) {
      const pts = [];
      for (let i = 0; i <= steps; i++) {
        const a = a0 + (a1 - a0) * (i / steps);
        pts.push([cx + r * Math.cos(a), cy + r * Math.sin(a)]);
      }
      return pts;
    }
    addArc(cx, cy, r, a0, a1, steps, opts) {
      return this.addPolyline(this.arcPts(cx, cy, r, a0, a1, steps), opts);
    }

    addFlipper(o) {
      const f = Object.assign({
        len: C.FLIP_LEN, r0: C.FLIP_R0, r1: C.FLIP_R1,
        side: "L", angle: 0, omega: 0, target: 0, up: false,
        e: 0.38, id: null, enabled: true
      }, o);
      if (f.side === "L") {
        f.restA = M.d2r(C.FLIP_REST); f.upA = M.d2r(C.FLIP_UP);
      } else {
        f.restA = Math.PI - M.d2r(C.FLIP_REST); f.upA = Math.PI - M.d2r(C.FLIP_UP);
      }
      f.angle = f.restA;
      this.flippers.push(f);
      return f;
    }

    addBall(x, y) {
      const b = {
        x, y, px: x, py: y, vx: 0, vy: 0, r: C.BALL_R,
        active: true, held: false, holdId: null,
        grace: {},           // colliderId -> ignore until time
        inside: {},          // sensor id -> true (for enter events)
        onRamp: null,        // ramp-run state owned by game
        id: World._ballId++
      };
      this.balls.push(b);
      return b;
    }
    removeBall(b) {
      const i = this.balls.indexOf(b);
      if (i >= 0) this.balls.splice(i, 1);
    }

    rebuildGrid() {
      this.grid.clear();
      for (let i = 0; i < this.solids.length; i++) {
        const s = this.solids[i];
        let bb;
        if (s.type === "seg") bb = segAabb(s);
        else { const r = s.rad + C.BALL_R + 6; bb = [s.x - r, s.y - r, s.x + r, s.y + r]; }
        const cx0 = Math.floor(bb[0] / CELL), cy0 = Math.floor(bb[1] / CELL);
        const cx1 = Math.floor(bb[2] / CELL), cy1 = Math.floor(bb[3] / CELL);
        for (let cx = cx0; cx <= cx1; cx++) for (let cy = cy0; cy <= cy1; cy++) {
          const k = cx + "," + cy;
          let a = this.grid.get(k);
          if (!a) { a = []; this.grid.set(k, a); }
          a.push(i);
        }
      }
      this._gridDirty = false;
    }

    nearSolids(x, y) {
      const k = Math.floor(x / CELL) + "," + Math.floor(y / CELL);
      return this.grid.get(k) || World._empty;
    }

    nudge(ix, iy) {
      for (const b of this.balls) {
        if (!b.active || b.held || b.onRamp) continue;
        b.vx += ix; b.vy += iy;
      }
    }

    // ---- main update: substeps ----
    update(dtFrame, emit) {
      if (this._gridDirty) this.rebuildGrid();
      const sub = Math.max(1, Math.round(dtFrame * C.PHYS_HZ));
      const dt = dtFrame / sub;
      for (let i = 0; i < sub; i++) this.step(dt, emit);
    }

    step(dt, emit) {
      this.time += dt;
      // flippers advance
      for (const f of this.flippers) {
        const tgt = f.up ? f.upA : f.restA;
        const dir = Math.sign(tgt - f.angle);
        const spd = f.up ? C.FLIP_OMEGA_UP : C.FLIP_OMEGA_DN;
        if (dir !== 0) {
          const na = f.angle + dir * spd * dt;
          if ((dir > 0 && na >= tgt) || (dir < 0 && na <= tgt)) {
            f.omega = (tgt - f.angle) / dt; f.angle = tgt;
          } else { f.omega = dir * spd; f.angle = na; }
        } else f.omega = 0;
      }

      for (const b of this.balls) {
        if (!b.active || b.held || b.onRamp) continue;
        b.px = b.x; b.py = b.y;
        // integrate
        b.vy += this.gravity * dt;
        const drag = 1 - C.AIR_DRAG * dt;
        b.vx *= drag; b.vy *= drag;
        // rolling resistance (Coulomb-ish) so slow balls settle instead of
        // oscillating forever in valleys
        {
          const sp0 = Math.hypot(b.vx, b.vy);
          const roll = 34 * dt;
          if (sp0 > 1e-6) {
            const k = Math.max(0, sp0 - roll) / sp0;
            b.vx *= k; b.vy *= k;
          }
        }
        let sp = Math.hypot(b.vx, b.vy);
        if (sp > C.MAX_SPEED) { const k = C.MAX_SPEED / sp; b.vx *= k; b.vy *= k; }
        b.x += b.vx * dt; b.y += b.vy * dt;

        // resolve collisions (few iterations for corner cases)
        for (let iter = 0; iter < 3; iter++) {
          const c = this.deepestContact(b);
          if (!c) break;
          this.resolveContact(b, c, emit);
        }
        // ball-ball
        for (const o of this.balls) {
          if (o === b || !o.active || o.onRamp) continue;
          this.ballBall(b, o, emit);
        }
        this.checkSensors(b, emit);
      }
    }

    deepestContact(b) {
      let best = null, bestPen = 0.01;
      const idxs = this.nearSolids(b.x, b.y);
      for (let i = 0; i < idxs.length; i++) {
        const s = this.solids[idxs[i]];
        if (!s.enabled) continue;
        if (s.id && b.grace[s.id] && b.grace[s.id] > this.time) continue;
        let pen, nx, ny;
        if (s.type === "seg") {
          let t = ((b.x - s.ax) * s.dx + (b.y - s.ay) * s.dy) / s.len2;
          t = t < 0 ? 0 : t > 1 ? 1 : t;
          const cx = s.ax + s.dx * t, cy = s.ay + s.dy * t;
          let ddx = b.x - cx, ddy = b.y - cy;
          const d = Math.hypot(ddx, ddy) || 1e-9;
          pen = b.r + s.rad - d;
          if (pen <= bestPen) continue;
          nx = ddx / d; ny = ddy / d;
          if (s.oneway) {
            // solid only when ball center is on the pass side (blocks return)
            const sgn = (b.x - s.ax) * s.oneway.nx + (b.y - s.ay) * s.oneway.ny;
            if (sgn < 0) continue;
          }
        } else {
          const ddx = b.x - s.x, ddy = b.y - s.y;
          const d = Math.hypot(ddx, ddy) || 1e-9;
          pen = b.r + s.rad - d;
          if (pen <= bestPen) continue;
          nx = ddx / d; ny = ddy / d;
        }
        if (pen > bestPen) { bestPen = pen; best = { s, pen, nx, ny, flip: null }; }
      }
      // flippers
      for (const f of this.flippers) {
        const c = this.flipperContact(b, f);
        if (c && c.pen > bestPen) { bestPen = c.pen; best = c; }
      }
      return best;
    }

    flipperContact(b, f) {
      const tx = f.pivotX + Math.cos(f.angle) * f.len;
      const ty = f.pivotY + Math.sin(f.angle) * f.len;
      const dx = tx - f.pivotX, dy = ty - f.pivotY;
      const len2 = dx * dx + dy * dy;
      let t = ((b.x - f.pivotX) * dx + (b.y - f.pivotY) * dy) / len2;
      t = t < 0 ? 0 : t > 1 ? 1 : t;
      const cx = f.pivotX + dx * t, cy = f.pivotY + dy * t;
      const rr = f.r0 + (f.r1 - f.r0) * t;
      const ddx = b.x - cx, ddy = b.y - cy;
      const d = Math.hypot(ddx, ddy) || 1e-9;
      const pen = b.r + rr - d;
      if (pen <= 0.01) return null;
      return { s: f, pen, nx: ddx / d, ny: ddy / d, flip: f, cpx: cx, cpy: cy };
    }

    resolveContact(b, c, emit) {
      const s = c.s;
      // positional correction
      b.x += c.nx * (c.pen + 0.05);
      b.y += c.ny * (c.pen + 0.05);

      // surface velocity (flippers rotate)
      let svx = 0, svy = 0;
      if (c.flip) {
        const f = c.flip;
        const rx = c.cpx - f.pivotX, ry = c.cpy - f.pivotY;
        svx = -f.omega * ry; svy = f.omega * rx;
      }
      const rvx = b.vx - svx, rvy = b.vy - svy;
      const vn = rvx * c.nx + rvy * c.ny;
      if (vn < 0) {
        let e = c.flip ? c.flip.e : s.e;
        if (-vn < 60) e = 0; // rest contact, no buzz
        const j = -(1 + e) * vn;
        b.vx += j * c.nx; b.vy += j * c.ny;
        // tangential friction
        const fr = c.flip ? 0.08 : s.fr;
        const tvx = b.vx - svx - ((b.vx - svx) * c.nx + (b.vy - svy) * c.ny) * c.nx;
        const tvy = b.vy - svy - ((b.vx - svx) * c.nx + (b.vy - svy) * c.ny) * c.ny;
        b.vx -= tvx * fr; b.vy -= tvy * fr;
        if (emit && s.id && -vn > 30) {
          emit({ t: "hit", id: s.id, ball: b, speed: -vn, nx: c.nx, ny: c.ny });
        }
        // flipper power stroke: guarantee separation at surface speed
        if (c.flip && c.flip.omega !== 0) {
          const sv = svx * c.nx + svy * c.ny;
          const bn = b.vx * c.nx + b.vy * c.ny;
          if (sv > 0 && bn < sv * 0.92) {
            b.vx += (sv * 0.92 - bn) * c.nx;
            b.vy += (sv * 0.92 - bn) * c.ny;
          }
        }
        let sp = Math.hypot(b.vx, b.vy);
        if (sp > C.MAX_SPEED) { const k = C.MAX_SPEED / sp; b.vx *= k; b.vy *= k; }
      }
    }

    ballBall(a, bb, emit) {
      const dx = bb.x - a.x, dy = bb.y - a.y;
      const d = Math.hypot(dx, dy) || 1e-9;
      const pen = a.r + bb.r - d;
      if (pen <= 0) return;
      const nx = dx / d, ny = dy / d;
      if (bb.held) {
        // held ball acts as static
        a.x -= nx * pen; a.y -= ny * pen;
        const vn = a.vx * nx + a.vy * ny;
        if (vn > 0) { a.vx -= 1.6 * vn * nx; a.vy -= 1.6 * vn * ny; }
        return;
      }
      a.x -= nx * pen * 0.5; a.y -= ny * pen * 0.5;
      bb.x += nx * pen * 0.5; bb.y += ny * pen * 0.5;
      const rvn = (bb.vx - a.vx) * nx + (bb.vy - a.vy) * ny;
      if (rvn < 0) {
        const j = -(1 + 0.93) * rvn * 0.5; // equal masses
        a.vx -= j * nx; a.vy -= j * ny;
        bb.vx += j * nx; bb.vy += j * ny;
        if (emit && -rvn > 120) emit({ t: "ballhit", speed: -rvn, x: (a.x + bb.x) / 2, y: (a.y + bb.y) / 2 });
      }
    }

    checkSensors(b, emit) {
      for (const s of this.sensorsC) {
        if (!s.enabled) continue;
        const inside = M.dist(b.x, b.y, s.x, s.y) < s.rad + (s.useBallR ? b.r : 0);
        const key = "c" + s.id;
        if (inside && !b.inside[key]) {
          b.inside[key] = true;
          if (emit) emit({ t: "sense", id: s.id, ball: b });
        } else if (!inside && b.inside[key]) delete b.inside[key];
      }
      for (const s of this.sensorsX) {
        if (!s.enabled) continue;
        // crossing: sign change of normal-side between prev & current, within span
        const d0 = (b.px - s.ax) * s.nx + (b.py - s.ay) * s.ny;
        const d1 = (b.x - s.ax) * s.nx + (b.y - s.ay) * s.ny;
        if ((d0 < 0) === (d1 < 0)) continue;
        const mx = (b.px + b.x) / 2, my = (b.py + b.y) / 2;
        let t = ((mx - s.ax) * s.dx + (my - s.ay) * s.dy) / s.len2;
        if (t < -0.08 || t > 1.08) continue;
        if (emit) emit({ t: "cross", id: s.id, ball: b, dir: d1 > d0 ? 1 : -1, speed: Math.hypot(b.vx, b.vy) });
      }
    }
  }
  World._ballId = 1;
  World._empty = [];

  DK.Physics = { World };
  if (typeof module !== "undefined" && module.exports) module.exports = DK;
})(typeof window !== "undefined" ? window : globalThis);
