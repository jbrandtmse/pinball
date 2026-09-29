// MIDNIGHT HEIST — rigid-body pinball physics.
// Units: inches and seconds. Playfield coordinates: x to the right, y toward the
// player (down the incline), z up off the playfield surface.
// Pure JS with no DOM dependency so the whole simulation runs headless in Node.

const DEG = Math.PI / 180;

export const PHYS = {
  G: 386.09,                  // gravity, in/s^2
  incline: 6.5 * DEG,         // WPC recommended playfield pitch
  ballR: 1.0625 / 2,          // 1-1/16" steel ball
  dt: 1 / 2000,               // fixed sub-step (0.5 ms)
  rollFactor: 5 / 7,          // solid sphere rolling without slipping
  rollingDecel: 1.1,          // rolling resistance, in/s^2
  maxSpeed: 520,              // sanity clamp (~13 m/s)
  restCutoff: 1.6,            // normal speeds below this don't bounce (settles contacts)
};
PHYS.gPlay = PHYS.G * Math.sin(PHYS.incline) * PHYS.rollFactor; // ~31.2 in/s^2 down-table

// Flipper polarity curve: [fraction along bat from pivot, exit angle in degrees
// from straight up-table, positive = toward the far side].
export const FLIPPER_POLARITY = [
  [0.00, 44], [0.25, 36], [0.45, 24], [0.62, 12], [0.78, 1], [0.9, -9], [1.0, -15],
];

// Coefficient of restitution falls off with impact speed (rubber gets "dead" when hit hard).
// `soft`: impacts slower than this are progressively damped (rubber and wood
// absorb gentle contacts, which is what lets a ball roll smoothly onto a flipper).
export const MATERIALS = {
  wood:    { e: 0.42, falloff: 0.30, fric: 0.10, soft: 5 },
  metal:   { e: 0.45, falloff: 0.28, fric: 0.05, soft: 5 },
  plastic: { e: 0.50, falloff: 0.32, fric: 0.08, soft: 5 },
  rubber:  { e: 0.86, falloff: 0.48, fric: 0.20, soft: 8 },
  post:    { e: 0.72, falloff: 0.42, fric: 0.18, soft: 8 },
  flipper: { e: 0.84, falloff: 0.52, fric: 0.28, soft: 40 },
  target:  { e: 0.36, falloff: 0.30, fric: 0.08, soft: 5 },
  bumper:  { e: 0.55, falloff: 0.30, fric: 0.08, soft: 5 },
  gate:    { e: 0.25, falloff: 0.30, fric: 0.04, soft: 5 },
  door:    { e: 0.40, falloff: 0.30, fric: 0.06, soft: 5 },
};

export function restitution(mat, vn) {
  const c = PHYS.restCutoff;
  if (vn < c) return 0;
  const e = mat.e / (1 + mat.falloff * vn / 100);
  if (vn >= mat.soft) return e;
  const k = (vn - c) / (mat.soft - c);
  return e * k * k;
}

// ---------------------------------------------------------------------------
// Colliders
// ---------------------------------------------------------------------------
export const SEG = 0, CIRC = 1, ARC = 2;

let nextColliderId = 1;

export function segment(ax, ay, bx, by, opts = {}) {
  const dx = bx - ax, dy = by - ay;
  const len2 = dx * dx + dy * dy;
  return {
    uid: nextColliderId++, type: SEG, ax, ay, bx, by, dx, dy, len2,
    r: opts.r || 0,
    mat: MATERIALS[opts.mat || 'wood'],
    matName: opts.mat || 'wood',
    id: opts.id || null,
    enabled: opts.enabled !== false,
    kick: opts.kick || null,        // {speed, minVn, cooldown}
    pass: opts.pass || null,        // one-way gate: direction balls may travel through
    hitMin: opts.hitMin ?? 4,       // min normal speed to register a switch hit
    lastKick: -1,
    tag: opts.tag || null,
  };
}

export function circle(x, y, r, opts = {}) {
  return {
    uid: nextColliderId++, type: CIRC, x, y, r,
    mat: MATERIALS[opts.mat || 'post'],
    matName: opts.mat || 'post',
    id: opts.id || null,
    enabled: opts.enabled !== false,
    kick: opts.kick || null,
    hitMin: opts.hitMin ?? 4,
    lastKick: -1,
    tag: opts.tag || null,
  };
}

// Arc wall. Angles in radians (y-down, so -PI/2 is "up the table").
// inside=true means the ball lives inside the circle (concave wall, e.g. the top arch).
export function arc(x, y, r, a0, a1, opts = {}) {
  return {
    uid: nextColliderId++, type: ARC, x, y, r, a0, a1,
    inside: opts.inside !== false,
    mat: MATERIALS[opts.mat || 'metal'],
    matName: opts.mat || 'metal',
    id: opts.id || null,
    enabled: opts.enabled !== false,
    kick: null, hitMin: opts.hitMin ?? 4, lastKick: -1, tag: opts.tag || null,
  };
}

function angleInRange(a, a0, a1) {
  const TAU = Math.PI * 2;
  let d = (a - a0) % TAU; if (d < 0) d += TAU;
  let span = (a1 - a0) % TAU; if (span < 0) span += TAU;
  if (span === 0) span = TAU;
  return d <= span;
}

// ---------------------------------------------------------------------------
// Flipper: tapered capsule rotating about a pivot, driven by a coil.
// ---------------------------------------------------------------------------
export class Flipper {
  constructor(o) {
    this.id = o.id;
    this.px = o.x; this.py = o.y;
    this.L = o.len; this.rb = o.rb; this.rt = o.rt;
    this.rest = o.rest; this.up = o.up;
    this.dir = Math.sign(o.up - o.rest);
    this.stroke = Math.abs(o.up - o.rest);
    this.angle = o.rest; this.omega = 0;
    this.pressed = false; this.enabled = true;
    // A WPC flipper coil snaps the bat up to speed within a few milliseconds;
    // the stroke then completes in ~20-25 ms.
    this.accelUp = o.accelUp ?? 80000;    // rad/s^2 while the coil is energised
    this.maxOmegaUp = o.maxOmegaUp ?? 52; // rad/s
    this.accelDown = o.accelDown ?? 700;  // return spring
    this.maxOmegaDown = o.maxOmegaDown ?? 22;
    this.mat = MATERIALS.flipper;
    const s = (this.rb - this.rt) / this.L;
    this.sinPhi = s; this.cosPhi = Math.sqrt(1 - s * s);
    this.atEOS = false;
  }
  get u() { return (this.angle - this.rest) * this.dir; } // 0 at rest .. stroke at EOS
  step(h) {
    let u = (this.angle - this.rest) * this.dir;
    let w = this.omega * this.dir;
    const on = this.pressed && this.enabled;
    if (on && !this._wasOn) this.strokeKey = (this.strokeKey || 0) + 1;
    this._wasOn = on;
    if (on) {
      w += this.accelUp * h; if (w > this.maxOmegaUp) w = this.maxOmegaUp;
    } else {
      w -= this.accelDown * h; if (w < -this.maxOmegaDown) w = -this.maxOmegaDown;
    }
    u += w * h;
    this.atEOS = false;
    if (u >= this.stroke) { u = this.stroke; if (w > 0) w = 0; this.atEOS = true; }
    if (u <= 0) { u = 0; if (w < 0) w = 0; }
    this.angle = this.rest + u * this.dir;
    this.omega = w * this.dir;
  }
  // Signed distance from world point to the flipper surface, writing the outward
  // normal into out.{nx,ny}. Returns distance (negative when inside).
  distance(qx, qy, out) {
    const ca = Math.cos(this.angle), sa = Math.sin(this.angle);
    const dx = qx - this.px, dy = qy - this.py;
    const lx = dx * ca + dy * sa;
    const ly = -dx * sa + dy * ca;
    const side = ly >= 0 ? 1 : -1;
    const nlx = this.sinPhi, nly = side * this.cosPhi;
    const Bx = this.rb * nlx, By = this.rb * nly;
    const Tx = this.L + this.rt * nlx, Ty = this.rt * nly;
    const ex = Tx - Bx, ey = Ty - By;
    const t = ((lx - Bx) * ex + (ly - By) * ey) / (ex * ex + ey * ey);
    let d, onx, ony;
    if (t < 0) {
      const m = Math.hypot(lx, ly) || 1e-9;
      d = m - this.rb; onx = lx / m; ony = ly / m;
    } else if (t > 1) {
      const tx = lx - this.L, m = Math.hypot(tx, ly) || 1e-9;
      d = m - this.rt; onx = tx / m; ony = ly / m;
    } else {
      d = lx * nlx + ly * nly - this.rb; onx = nlx; ony = nly;
    }
    out.nx = onx * ca - ony * sa;
    out.ny = onx * sa + ony * ca;
    out.along = lx; // distance along the bat from the pivot (for rendering/debug)
    return d;
  }
  tip() {
    return { x: this.px + Math.cos(this.angle) * this.L, y: this.py + Math.sin(this.angle) * this.L };
  }
}

// ---------------------------------------------------------------------------
// Ball
// ---------------------------------------------------------------------------
let nextBallId = 1;
export class Ball {
  constructor(x, y) {
    this.id = nextBallId++;
    this.x = x; this.y = y; this.z = 0;
    this.vx = 0; this.vy = 0;
    this.mode = 'pf';          // 'pf' | 'path' | 'held' | 'gone'
    this.path = null; this.s = 0; this.vs = 0;
    this.heldBy = null;
    this.contactFlipper = null; // flipper currently touching (cradle detection)
    this.stillTime = 0;
    this.lastSwitchTime = 0;
    this.trig = new Set();      // triggers currently occupied
    // orientation for rendering (quaternion x,y,z,w in playfield frame)
    this.q = [0, 0, 0, 1];
  }
  get speed() { return this.mode === 'path' ? Math.abs(this.vs) : Math.hypot(this.vx, this.vy); }
}

// ---------------------------------------------------------------------------
// Ramp / wire-form path. The ball follows a 3D spline with 1-D dynamics.
// ---------------------------------------------------------------------------
export class Path {
  constructor(id, pts, opts = {}) {
    this.id = id;
    this.opts = opts;
    this.samples = sampleSpline(pts, 0.2);
    const n = this.samples.length;
    this.length = this.samples[n - 1].s;
    this.friction = opts.friction ?? 4.0;   // in/s^2 extra drag on plastic/wire
    this.switches = (opts.switches || []).map(sw => ({ id: sw.id, s: sw.at * this.length }));
    this.next = null;        // {path, s} continue onto another path at the end
    this.exitSpeedScale = opts.exitSpeedScale ?? 1;
    this.maxExitSpeed = opts.maxExitSpeed ?? 140;
  }
  // world height of a sample (for gravity along the path)
  at(s) {
    const S = this.samples;
    if (s < 0) s = 0; else if (s > this.length) s = this.length;
    // binary search
    let lo = 0, hi = S.length - 1;
    while (hi - lo > 1) { const mid = (lo + hi) >> 1; if (S[mid].s <= s) lo = mid; else hi = mid; }
    const a = S[lo], b = S[hi];
    const t = (s - a.s) / (b.s - a.s || 1);
    return {
      x: a.x + (b.x - a.x) * t, y: a.y + (b.y - a.y) * t, z: a.z + (b.z - a.z) * t,
      tx: b.x - a.x, ty: b.y - a.y, tz: b.z - a.z, len: b.s - a.s,
      H: a.H + (b.H - a.H) * t, slope: (b.H - a.H) / (b.s - a.s || 1),
    };
  }
}

function catmull(p0, p1, p2, p3, t) {
  const t2 = t * t, t3 = t2 * t;
  return 0.5 * ((2 * p1) + (-p0 + p2) * t + (2 * p0 - 5 * p1 + 4 * p2 - p3) * t2 + (-p0 + 3 * p1 - 3 * p2 + p3) * t3);
}

export function sampleSpline(pts, step) {
  const out = [];
  const n = pts.length;
  const P = i => pts[Math.max(0, Math.min(n - 1, i))];
  let s = 0, prev = null;
  for (let i = 0; i < n - 1; i++) {
    const a = P(i - 1), b = P(i), c = P(i + 1), d = P(i + 2);
    const segLen = Math.hypot(c[0] - b[0], c[1] - b[1], c[2] - b[2]);
    const k = Math.max(2, Math.ceil(segLen / step));
    for (let j = (i === 0 ? 0 : 1); j <= k; j++) {
      const t = j / k;
      const x = catmull(a[0], b[0], c[0], d[0], t);
      const y = catmull(a[1], b[1], c[1], d[1], t);
      const z = catmull(a[2], b[2], c[2], d[2], t);
      if (prev) s += Math.hypot(x - prev.x, y - prev.y, z - prev.z);
      prev = { x, y, z, s, H: worldHeight(x, y, z) };
      out.push(prev);
    }
  }
  return out;
}

// Height above the floor-plane reference: moving up-table (smaller y) is uphill.
export function worldHeight(x, y, z) {
  return z * Math.cos(PHYS.incline) - y * Math.sin(PHYS.incline);
}

// ---------------------------------------------------------------------------
// Triggers (non-colliding switches): rollovers, spinners, ramp mouths, captures
// ---------------------------------------------------------------------------
export function rolloverTrigger(id, x, y, r, opts = {}) {
  return { kind: 'circle', id, x, y, r, enabled: true, ...opts };
}
export function lineTrigger(id, ax, ay, bx, by, opts = {}) {
  // dir: the direction a ball must be moving to fire (e.g. into a ramp mouth)
  const dx = bx - ax, dy = by - ay, L = Math.hypot(dx, dy);
  return { kind: 'line', id, ax, ay, bx, by, nx: -dy / L, ny: dx / L, len: L, enabled: true, ...opts };
}

// ---------------------------------------------------------------------------
// Spatial grid for static colliders
// ---------------------------------------------------------------------------
class Grid {
  constructor(w, h, cell) {
    this.cell = cell; this.cols = Math.ceil(w / cell) + 2; this.rows = Math.ceil(h / cell) + 2;
    this.cells = Array.from({ length: this.cols * this.rows }, () => []);
  }
  key(cx, cy) { return (cy + 1) * this.cols + (cx + 1); }
  insert(c, minx, miny, maxx, maxy) {
    const x0 = Math.max(-1, Math.floor(minx / this.cell)), x1 = Math.min(this.cols - 2, Math.floor(maxx / this.cell));
    const y0 = Math.max(-1, Math.floor(miny / this.cell)), y1 = Math.min(this.rows - 2, Math.floor(maxy / this.cell));
    for (let y = y0; y <= y1; y++) for (let x = x0; x <= x1; x++) this.cells[this.key(x, y)].push(c);
  }
  query(x, y) {
    const cx = Math.floor(x / this.cell), cy = Math.floor(y / this.cell);
    if (cx < -1 || cy < -1 || cx > this.cols - 2 || cy > this.rows - 2) return EMPTY;
    return this.cells[this.key(cx, cy)];
  }
}
const EMPTY = [];

// ---------------------------------------------------------------------------
// World
// ---------------------------------------------------------------------------
export class World {
  constructor(width, length) {
    this.width = width; this.length = length;
    this.colliders = [];
    this.grid = new Grid(width, length, 1.25);
    this.flippers = [];
    this.balls = [];
    this.triggers = [];
    this.spinners = [];
    this.paths = {};
    this.time = 0;
    this.events = [];
    this.plunger = null;
    this.drainY = length;
    this.drainTest = null; // function(ball) -> bool
    this.gateAnim = new Map(); // collider uid -> swing amount 0..1
    this._c = { nx: 0, ny: 0, along: 0 };
    this.ballBallE = 0.92;
  }

  add(c) {
    this.colliders.push(c);
    const m = PHYS.ballR + 0.6;
    if (c.type === SEG) {
      this.grid.insert(c, Math.min(c.ax, c.bx) - c.r - m, Math.min(c.ay, c.by) - c.r - m,
        Math.max(c.ax, c.bx) + c.r + m, Math.max(c.ay, c.by) + c.r + m);
    } else if (c.type === CIRC) {
      this.grid.insert(c, c.x - c.r - m, c.y - c.r - m, c.x + c.r + m, c.y + c.r + m);
    } else {
      // Arc: insert only the cells near the arc band (sampled).
      const steps = Math.ceil(Math.abs(c.a1 - c.a0) * c.r / 0.5) + 1;
      for (let i = 0; i <= steps; i++) {
        const a = c.a0 + (c.a1 - c.a0) * i / steps;
        const x = c.x + Math.cos(a) * c.r, y = c.y + Math.sin(a) * c.r;
        this.grid.insert(c, x - m, y - m, x + m, y + m);
      }
    }
    return c;
  }
  addAll(list) { for (const c of list) this.add(c); }
  addFlipper(f) { this.flippers.push(f); return f; }
  addTrigger(t) { this.triggers.push(t); return t; }
  addPath(p) { this.paths[p.id] = p; return p; }

  emit(ev) { ev.t = this.time; this.events.push(ev); }
  drainEvents() { const e = this.events; this.events = []; return e; }

  addBall(x, y) { const b = new Ball(x, y); this.balls.push(b); return b; }
  removeBall(b) { const i = this.balls.indexOf(b); if (i >= 0) this.balls.splice(i, 1); b.mode = 'gone'; }

  activeBalls() { return this.balls.filter(b => b.mode !== 'gone'); }

  // --- Paths -------------------------------------------------------------
  putOnPath(ball, path, s, vs) {
    ball.mode = 'path'; ball.path = path; ball.s = s; ball.vs = vs;
    const p = path.at(s); ball.x = p.x; ball.y = p.y; ball.z = p.z;
    for (const id of ball.trig) this.emit({ type: 'switch', id, on: false, ball: ball.id });
    ball.trig.clear();
  }

  stepPath(b, h) {
    const p = b.path;
    const here = p.at(b.s);
    const a = -PHYS.G * PHYS.rollFactor * here.slope;
    b.vs += a * h;
    const fr = p.friction * h;
    if (Math.abs(b.vs) < 2) {
      // Nearly stopped on a flat crest: no real ramp is perfectly level, so the
      // ball creeps downhill (or back toward the entrance) instead of parking.
      b.vs += (Math.sign(a) || -1) * 10 * h;
    } else b.vs -= Math.sign(b.vs) * fr;
    const s0 = b.s;
    b.s += b.vs * h;
    // path switches
    for (const sw of p.switches) {
      if ((s0 < sw.s && b.s >= sw.s)) this.emit({ type: 'switch', id: sw.id, on: true, ball: b.id, speed: Math.abs(b.vs), pulse: true });
    }
    if (b.s >= p.length) {
      if (p.next) {
        const n = p.next;
        this.emit({ type: 'pathEnd', id: p.id, ball: b.id, next: n.path.id });
        b.path = n.path; b.s = n.s; b.vs = Math.max(20, b.vs * (n.speedScale ?? 1));
        const q = b.path.at(b.s); b.x = q.x; b.y = q.y; b.z = q.z;
        return;
      }
      const end = p.at(p.length);
      const L = Math.hypot(end.tx, end.ty) || 1;
      let spd = Math.min(p.maxExitSpeed, Math.abs(b.vs) * p.exitSpeedScale);
      b.mode = 'pf'; b.path = null; b.z = 0;
      b.x = end.x; b.y = end.y;
      b.vx = end.tx / L * spd; b.vy = end.ty / L * spd;
      if (p.opts.exitDir) { const d = p.opts.exitDir; const m = Math.hypot(d[0], d[1]); b.vx = d[0] / m * spd; b.vy = d[1] / m * spd; }
      this.emit({ type: 'pathExit', id: p.id, ball: b.id, made: true });
      return;
    }
    if (b.s <= 0 && b.vs <= 0) {
      const st = p.at(0);
      const L = Math.hypot(st.tx, st.ty) || 1;
      const spd = Math.max(8, Math.abs(b.vs));
      b.mode = 'pf'; b.path = null; b.z = 0;
      b.x = st.x - st.tx / L * 0.05; b.y = st.y - st.ty / L * 0.05;
      b.vx = -st.tx / L * spd; b.vy = -st.ty / L * spd;
      this.emit({ type: 'pathExit', id: p.id, ball: b.id, made: false });
      return;
    }
    const q = p.at(b.s); b.x = q.x; b.y = q.y; b.z = q.z;
  }

  // --- Main step ------------------------------------------------------------
  step(h = PHYS.dt) {
    this.time += h;
    for (const f of this.flippers) f.step(h);
    for (const sp of this.spinners) sp.step(h, this);
    if (this.plunger) this.plunger.step(h, this);

    const balls = this.balls;
    for (let i = 0; i < balls.length; i++) {
      const b = balls[i];
      if (b.mode === 'path') { this.stepPath(b, h); continue; }
      if (b.mode !== 'pf') continue;
      // gravity + rolling resistance
      b.vy += PHYS.gPlay * h;
      const sp = Math.hypot(b.vx, b.vy);
      if (sp > 0) {
        const dec = PHYS.rollingDecel * h;
        if (sp <= dec) { b.vx = 0; b.vy = 0; }
        else { const k = (sp - dec) / sp; b.vx *= k; b.vy *= k; }
        if (sp > PHYS.maxSpeed) { const k = PHYS.maxSpeed / sp; b.vx *= k; b.vy *= k; }
      }
      const ox = b.x, oy = b.y;
      b.x += b.vx * h; b.y += b.vy * h;
      b.contactFlipper = null;
      for (let it = 0; it < 3; it++) {
        if (!this.collideStatics(b) & !this.collideFlippers(b)) break;
      }
      if (this.plunger) this.plunger.collide(b, this);
      this.checkTriggers(b, ox, oy);
      this.integrateSpin(b, h);
      if (this.drainTest && this.drainTest(b)) {
        b.mode = 'gone';
        this.emit({ type: 'drain', ball: b.id, x: b.x });
      }
    }
    // ball-ball
    for (let i = 0; i < balls.length; i++) {
      const a = balls[i]; if (a.mode !== 'pf') continue;
      for (let j = i + 1; j < balls.length; j++) {
        const b = balls[j]; if (b.mode !== 'pf') continue;
        const dx = b.x - a.x, dy = b.y - a.y;
        const d2 = dx * dx + dy * dy, R2 = 4 * PHYS.ballR * PHYS.ballR;
        if (d2 >= R2 || d2 === 0) continue;
        const d = Math.sqrt(d2), nx = dx / d, ny = dy / d;
        const pen = 2 * PHYS.ballR - d;
        a.x -= nx * pen / 2; a.y -= ny * pen / 2; b.x += nx * pen / 2; b.y += ny * pen / 2;
        const rv = (b.vx - a.vx) * nx + (b.vy - a.vy) * ny;
        if (rv < 0) {
          const e = -rv > PHYS.restCutoff ? this.ballBallE : 0;
          const j2 = -(1 + e) * rv / 2;
          a.vx -= j2 * nx; a.vy -= j2 * ny; b.vx += j2 * nx; b.vy += j2 * ny;
          if (-rv > 15) this.emit({ type: 'clack', speed: -rv, x: a.x, y: a.y });
        }
      }
    }
  }

  // Static collider resolution. Returns true if any contact was resolved.
  collideStatics(b) {
    const list = this.grid.query(b.x, b.y);
    const R = PHYS.ballR;
    let any = false;
    for (let k = 0; k < list.length; k++) {
      const c = list[k];
      if (!c.enabled) continue;
      let nx, ny, pen;
      if (c.type === SEG) {
        let t = ((b.x - c.ax) * c.dx + (b.y - c.ay) * c.dy) / c.len2;
        if (t < 0) t = 0; else if (t > 1) t = 1;
        const px = c.ax + c.dx * t, py = c.ay + c.dy * t;
        const ddx = b.x - px, ddy = b.y - py;
        const d2 = ddx * ddx + ddy * ddy, rr = R + c.r;
        if (d2 >= rr * rr) continue;
        const d = Math.sqrt(d2);
        if (d > 1e-9) { nx = ddx / d; ny = ddy / d; }
        else { const L = Math.sqrt(c.len2); nx = -c.dy / L; ny = c.dx / L; if (nx * b.vx + ny * b.vy > 0) { nx = -nx; ny = -ny; } }
        pen = rr - d;
        if (c.pass) {
          // one-way gate: balls moving along `pass` go straight through
          const vp = b.vx * c.pass[0] + b.vy * c.pass[1];
          const side = nx * c.pass[0] + ny * c.pass[1];
          if (vp >= 0 || side < 0) {
            if (vp > 0) this.swingGate(c, Math.min(1, pen / R));
            continue;
          }
        }
      } else if (c.type === CIRC) {
        const ddx = b.x - c.x, ddy = b.y - c.y;
        const d2 = ddx * ddx + ddy * ddy, rr = R + c.r;
        if (d2 >= rr * rr) continue;
        const d = Math.sqrt(d2) || 1e-9;
        nx = ddx / d; ny = ddy / d; pen = rr - d;
      } else { // ARC
        const ddx = b.x - c.x, ddy = b.y - c.y;
        const d = Math.hypot(ddx, ddy) || 1e-9;
        const ang = Math.atan2(ddy, ddx);
        if (!angleInRange(ang, c.a0, c.a1)) continue;
        if (c.inside) {
          pen = d + R - c.r; if (pen <= 0) continue;
          nx = -ddx / d; ny = -ddy / d;
        } else {
          pen = c.r + R - d; if (pen <= 0) continue;
          nx = ddx / d; ny = ddy / d;
        }
      }
      any = true;
      b.x += nx * pen; b.y += ny * pen;
      this.respond(b, c, nx, ny, 0, 0);
    }
    return any;
  }

  collideFlippers(b) {
    const R = PHYS.ballR, o = this._c;
    let any = false;
    for (const f of this.flippers) {
      // quick reject
      const dx = b.x - f.px, dy = b.y - f.py;
      if (dx * dx + dy * dy > (f.L + f.rt + R + 0.5) ** 2) continue;
      const live = f.omega * f.dir > 2;
      // A ball already launched by this stroke is not re-caught by the same swing.
      if (live && b.launchStroke === f.strokeKey) continue;
      const d = f.distance(b.x, b.y, o);
      if (d >= R) continue;
      const pen = R - d;
      const nx = o.nx, ny = o.ny;
      const along = o.along;
      b.x += nx * pen; b.y += ny * pen;
      // contact point & surface velocity
      const cx = b.x - nx * R, cy = b.y - ny * R;
      const ux = -f.omega * (cy - f.py), uy = f.omega * (cx - f.px);
      const preVx = b.vx, preVy = b.vy;
      // A bat being driven upward is a live hit: full rubber restitution.
      const rvn = (b.vx - ux) * nx + (b.vy - uy) * ny;
      this.respond(b, f, nx, ny, ux, uy, true, live);
      if (live && -rvn > 12) this.flipperPolarity(b, f, along, Math.hypot(ux, uy), preVx, preVy);
      b.contactFlipper = f;
      any = true;
    }
    return any;
  }

  // Real flippers send early (near-base) hits across the table and late (tip)
  // hits back toward their own side. A rigid-bat model re-catches the ball
  // until end-of-stroke and loses that, so -- like the "polarity" correction
  // curves VPX tables use -- the exit angle is set from where on the bat the
  // ball was struck and how far through the stroke the bat already was.
  flipperPolarity(b, f, along, surf, pvx, pvy) {
    const u = Math.max(0, Math.min(1, along / (f.L + f.rt)));
    const P = FLIPPER_POLARITY;
    let k = 0; while (k < P.length - 2 && u > P[k + 1][0]) k++;
    const t = (u - P[k][0]) / (P[k + 1][0] - P[k][0]);
    let theta = P[k][1] + (P[k + 1][1] - P[k][1]) * Math.max(0, Math.min(1, t));
    const strokeFrac = f.u / f.stroke;
    theta -= 24 * strokeFrac;
    // incoming roll toward the tip carries the ball further across
    const ax = Math.cos(f.angle), ay = Math.sin(f.angle);
    const roll = pvx * ax + pvy * ay;
    theta += Math.max(-6, Math.min(9, roll * 0.09));
    theta += (Math.random() - 0.5) * 2.5;
    const side = f.dir < 0 ? 1 : -1; // left bat rotates CCW (dir<0) and aims right
    const rad = theta * Math.PI / 180 * side;
    // The coil reaches full speed within a few ms, so the ball takes the bat's
    // full surface speed at the contact radius (times the rubber's rebound).
    const r = Math.hypot(b.x - f.px, b.y - f.py) - PHYS.ballR;
    const batSpeed = f.maxOmegaUp * Math.max(0.35, r);
    const rebound = 1 + f.mat.e / (1 + f.mat.falloff * batSpeed / 100);
    const speed = Math.min(PHYS.maxSpeed, Math.max(Math.hypot(b.vx, b.vy), batSpeed * rebound));
    b.vx = Math.sin(rad) * speed;
    b.vy = -Math.cos(rad) * speed;
    b.launchStroke = f.strokeKey;
    this.emit({ type: 'flipShot', id: f.id, u, theta, speed });
  }

  respond(b, c, nx, ny, ux, uy, isFlipper = false, live = false) {
    const rvx = b.vx - ux, rvy = b.vy - uy;
    const vn = rvx * nx + rvy * ny;
    if (vn >= 0) return;
    const mat = c.mat;
    const impact = -vn;
    let e = live ? mat.e / (1 + mat.falloff * impact / 100) : restitution(mat, impact);
    // tangential friction (bounded so a sliding ball can at most reach rolling)
    let tx = rvx - vn * nx, ty = rvy - vn * ny;
    const vt = Math.hypot(tx, ty);
    let newVt = vt;
    // Sustained/rolling contacts carry no sliding friction; only real impacts
    // scrub tangential speed (the ball skids and picks up spin).
    if (vt > 1e-6 && impact > 4) {
      const dv = Math.min(mat.fric * (1 + e) * impact, vt * (2 / 7));
      newVt = vt - dv;
      tx *= newVt / vt; ty *= newVt / vt;
    }
    let outN = e * impact;
    // Active kickers: slingshots and pop bumpers add energy along the normal.
    if (c.kick && impact >= (c.kick.minVn ?? 0) && this.time - c.lastKick >= (c.kick.cooldown ?? 0.1)) {
      c.lastKick = this.time;
      const ks = c.kick.speed * (1 + (Math.random() - 0.5) * (c.kick.jitter ?? 0.1));
      outN = Math.max(outN, ks);
      this.emit({ type: 'kick', id: c.id, speed: impact, x: b.x, y: b.y, ball: b.id });
    }
    b.vx = ux + tx + nx * outN;
    b.vy = uy + ty + ny * outN;
    if (isFlipper) {
      if (impact > 6) this.emit({ type: 'flipperHit', id: c.id, speed: impact, ball: b.id });
    } else if (c.id && impact >= c.hitMin) {
      this.emit({ type: 'hit', id: c.id, speed: impact, ball: b.id, x: b.x, y: b.y, tag: c.tag });
    } else if (impact > 25) {
      this.emit({ type: 'thud', mat: c.matName, speed: impact, x: b.x, y: b.y });
    }
  }

  swingGate(c, amt) {
    const cur = this.gateAnim.get(c.uid) || 0;
    if (amt > cur) this.gateAnim.set(c.uid, amt);
    if (c.id && cur < 0.05 && amt > 0.2) this.emit({ type: 'gate', id: c.id });
  }

  checkTriggers(b, ox, oy) {
    for (const t of this.triggers) {
      if (!t.enabled) continue;
      if (t.kind === 'circle') {
        const dx = b.x - t.x, dy = b.y - t.y;
        const inside = dx * dx + dy * dy < t.r * t.r;
        const was = b.trig.has(t.id);
        if (inside && !was) {
          b.trig.add(t.id);
          this.emit({ type: 'switch', id: t.id, on: true, ball: b.id, vx: b.vx, vy: b.vy, speed: Math.hypot(b.vx, b.vy) });
          if (t.onEnter) { t.onEnter(b, this); if (b.mode !== 'pf') return; }
        } else if (!inside && was) {
          b.trig.delete(t.id);
          this.emit({ type: 'switch', id: t.id, on: false, ball: b.id });
        }
      } else if (t.kind === 'line') {
        // crossing test: signed distance changes sign and projection lies within the segment
        const d0 = (ox - t.ax) * t.nx + (oy - t.ay) * t.ny;
        const d1 = (b.x - t.ax) * t.nx + (b.y - t.ay) * t.ny;
        if ((d0 > 0) === (d1 > 0)) continue;
        const u = ((b.x - t.ax) * (t.bx - t.ax) + (b.y - t.ay) * (t.by - t.ay)) / (t.len * t.len);
        if (u < -0.02 || u > 1.02) continue;
        const vdir = b.vx * t.nx + b.vy * t.ny;
        if (t.dirSign && Math.sign(vdir) !== t.dirSign) continue;
        this.emit({ type: 'switch', id: t.id, on: true, pulse: true, ball: b.id, vx: b.vx, vy: b.vy, speed: Math.hypot(b.vx, b.vy) });
        if (t.onCross) t.onCross(b, this, vdir);
        if (b.mode !== 'pf') return;
      }
    }
  }

  integrateSpin(b, h) {
    // rolling: angular velocity axis is perpendicular to motion, in the playfield plane.
    // playfield frame for render: X=x, Y=z(up), Z=y. omega = (up x v)/R  => (vz?)...
    const R = PHYS.ballR;
    const wx = b.vy / R, wz = -b.vx / R; // rotation axis in render frame (X, Z)
    const ang = Math.hypot(wx, wz) * h;
    if (ang < 1e-7) return;
    const ax = wx / (ang / h), az = wz / (ang / h);
    const s = Math.sin(ang / 2), c = Math.cos(ang / 2);
    const qx = ax * s, qy = 0, qz = az * s, qw = c;
    const [x, y, z, w] = b.q;
    // q = dq * q
    b.q[0] = qw * x + qx * w + qy * z - qz * y;
    b.q[1] = qw * y - qx * z + qy * w + qz * x;
    b.q[2] = qw * z + qx * y - qy * x + qz * w;
    b.q[3] = qw * w - qx * x - qy * y - qz * z;
  }
}

// ---------------------------------------------------------------------------
// Devices that live in the physics world
// ---------------------------------------------------------------------------

// Spinner: a plate across a lane; crossing balls spin it, each half turn scores.
export class Spinner {
  constructor(id, ax, ay, bx, by) {
    this.id = id; this.ax = ax; this.ay = ay; this.bx = bx; this.by = by;
    this.angle = 0; this.omega = 0; this.halfTurns = 0;
    const dx = bx - ax, dy = by - ay, L = Math.hypot(dx, dy);
    this.nx = -dy / L; this.ny = dx / L; this.len = L;
  }
  hitBy(speed) {
    // plate angular speed proportional to ball speed through the lane (rad/s)
    this.omega = Math.max(this.omega, Math.min(160, speed * 0.55));
  }
  step(h, world) {
    if (this.omega <= 0.01) {
      // settle to hanging position
      const a = this.angle % Math.PI;
      if (a > 0.001) this.angle += (a < Math.PI / 2 ? -a : Math.PI - a) * Math.min(1, h * 8);
      this.omega = 0; return;
    }
    this.angle += this.omega * h;
    this.omega -= (1.5 + this.omega * 0.35) * h * 6;
    const half = Math.floor(this.angle / Math.PI);
    if (half > this.halfTurns) { this.halfTurns = half; world.emit({ type: 'switch', id: this.id, on: true, pulse: true }); }
  }
}

// Plunger: spring-loaded rod at the bottom of the shooter lane.
export class Plunger {
  constructor(o) {
    this.x0 = o.x0; this.x1 = o.x1; this.restY = o.y; this.maxPull = o.maxPull ?? 1.1;
    this.pull = 0; this.pulling = false; this.pullRate = o.pullRate ?? 1 / 1.1; // full pull in ~1.1 s
    this.speedFn = o.speedFn;
    this.releaseAnim = 0;
    this.autoFire = false;
    this.autoSpeed = o.autoSpeed ?? 215;
  }
  get tipY() { return this.restY + this.pull * this.maxPull; }
  step(h, world) {
    if (this.pulling) this.pull = Math.min(1, this.pull + this.pullRate * h);
    if (this.releaseAnim > 0) this.releaseAnim = Math.max(0, this.releaseAnim - h);
  }
  ballOnTip(b) {
    return b.mode === 'pf' && b.x > this.x0 && b.x < this.x1 && Math.abs(b.y + PHYS.ballR - this.tipY) < 0.25;
  }
  release(world) {
    const p = this.pull;
    this.pull = 0; this.pulling = false; this.releaseAnim = 0.06;
    if (p < 0.02) return;
    const speed = this.speedFn(p);
    for (const b of world.balls) {
      if (b.mode === 'pf' && b.x > this.x0 && b.x < this.x1 && b.y + PHYS.ballR > this.restY - 0.3 && b.y < this.restY + 2) {
        b.y = this.restY - PHYS.ballR - 0.002;
        b.vy = -speed; b.vx = 0;
        world.emit({ type: 'plunge', speed, pull: p });
      }
    }
  }
  fireAuto(world) {
    let fired = false;
    for (const b of world.balls) {
      if (b.mode === 'pf' && b.x > this.x0 && b.x < this.x1 && b.y > this.restY - 3) {
        b.y = this.restY - PHYS.ballR - 0.002; b.vy = -this.autoSpeed * (0.97 + Math.random() * 0.06); b.vx = 0; fired = true;
      }
    }
    this.releaseAnim = 0.06;
    if (fired) world.emit({ type: 'autoplunge' });
    return fired;
  }
  collide(b, world) {
    if (b.x <= this.x0 || b.x >= this.x1) return;
    const top = this.tipY;
    const pen = b.y + PHYS.ballR - top;
    if (pen > 0 && pen < 1.5) {
      b.y -= pen;
      if (b.vy > 0) b.vy = b.vy > 20 ? -b.vy * 0.25 : 0;
    }
  }
}
