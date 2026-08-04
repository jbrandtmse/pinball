// NOVA STRIKE — physics core.
// Zero-dependency 2D rigid-body-ish engine tuned for pinball:
//   * balls are circles with linear velocity
//   * static colliders: line segments, arcs, circles (posts/bumpers)
//   * flippers: rotating capsules driven by angular springs (impulse response
//     includes surface velocity so flips impart real energy)
//   * fixed-timestep substeps so fast balls never tunnel
// Runs in the browser (ES module) and in Node (for the headless test rig).

export const TAU = Math.PI * 2;

export function vec(x = 0, y = 0) { return { x, y }; }
export function clamp(v, lo, hi) { return v < lo ? lo : v > hi ? hi : v; }

function dist2(ax, ay, bx, by) { const dx = bx - ax, dy = by - ay; return dx * dx + dy * dy; }

// Closest point on segment ab to point p. Returns {x, y, t}.
export function closestOnSeg(px, py, ax, ay, bx, by) {
  const dx = bx - ax, dy = by - ay;
  const len2 = dx * dx + dy * dy;
  let t = len2 > 0 ? ((px - ax) * dx + (py - ay) * dy) / len2 : 0;
  t = clamp(t, 0, 1);
  return { x: ax + dx * t, y: ay + dy * t, t };
}

// ---------------------------------------------------------------------------
// Colliders. Each static collider is { kind, ...geom, bounce, kick, id, onHit }
// bounce: restitution multiplier (1 = rubbery). kick: {x,y} velocity added on
// contact (pop bumpers / slingshots). onHit(ball, world) event hook.
// ---------------------------------------------------------------------------

export function seg(ax, ay, bx, by, opts = {}) {
  return { kind: 'seg', ax, ay, bx, by, bounce: 0.35, ...opts };
}

export function arc(cx, cy, r, a0, a1, opts = {}) {
  // a0..a1 swept clockwise (screen coords, y down). Collision on the INSIDE
  // of the arc when opts.inner, outside otherwise.
  return { kind: 'arc', cx, cy, r, a0, a1, inner: true, bounce: 0.35, ...opts };
}

export function circle(cx, cy, r, opts = {}) {
  return { kind: 'circle', cx, cy, r, bounce: 0.5, ...opts };
}

function angleIn(a, a0, a1) {
  // normalize into [0, TAU)
  const n = (v) => ((v % TAU) + TAU) % TAU;
  a = n(a); a0 = n(a0); a1 = n(a1);
  return a0 <= a1 ? (a >= a0 && a <= a1) : (a >= a0 || a <= a1);
}

// ---------------------------------------------------------------------------
// Ball
// ---------------------------------------------------------------------------

let ballId = 0;
export function makeBall(x, y, r = 13.5) {
  return {
    id: ballId++,
    x, y, r,
    vx: 0, vy: 0,
    spin: 0,             // reserved for english; cosmetic for now
    alive: true,
    onRamp: null,        // set while riding a scripted ramp path
    locked: false,       // parked in a lock mechanism
    ghost: 0,            // seconds of no-collide (eject/plunger handoff)
    lastHit: null,       // last collider id (anti-double-trigger)
    lastHitAt: 0
  };
}

// ---------------------------------------------------------------------------
// Flipper — capsule pivoting around (px,py). angle measured so that rest
// points the tip toward the drain-center; side: -1 left, +1 right.
// ---------------------------------------------------------------------------

export function makeFlipper(px, py, len, side, opts = {}) {
  const rest = opts.rest ?? (side < 0 ? 0.42 : Math.PI - 0.42); // rad, screen coords
  const sweep = opts.sweep ?? 1.02;                               // ~58 deg up
  return {
    px, py, len, side,
    r0: opts.r0 ?? 15, r1: opts.r1 ?? 8,   // base/tip radius
    rest, up: side < 0 ? rest - sweep : rest + sweep,
    angle: rest,
    av: 0,                                  // angular velocity
    active: false,
    strength: opts.strength ?? 46,          // angular spring
    damping: opts.damping ?? 9,
    maxAv: opts.maxAv ?? 26
  };
}

export function flipperTip(f) {
  return { x: f.px + Math.cos(f.angle) * f.len, y: f.py + Math.sin(f.angle) * f.len };
}

export function stepFlipper(f, dt) {
  const target = f.active ? f.up : f.rest;
  const err = target - f.angle;
  f.av += err * f.strength * dt * 60 * 0.016 * 60; // spring accel
  f.av *= Math.exp(-f.damping * dt * (f.active ? 0.35 : 1.4));
  f.av = clamp(f.av, -f.maxAv, f.maxAv);
  f.angle += f.av * dt;
  // hard stops
  const lo = Math.min(f.rest, f.up), hi = Math.max(f.rest, f.up);
  if (f.angle < lo) { f.angle = lo; f.av = 0; }
  if (f.angle > hi) { f.angle = hi; f.av = 0; }
}

// ---------------------------------------------------------------------------
// World
// ---------------------------------------------------------------------------

export function makeWorld(opts = {}) {
  return {
    gravity: opts.gravity ?? 2350,          // px/s^2  (~6.5 deg table pitch)
    balls: [],
    colliders: [],
    flippers: [],
    sensors: [],                            // {id, test(ball)->bool, onTrigger(ball,world), once}
    time: 0,
    events: [],                             // drained/fired event queue for rules
    bounds: opts.bounds ?? { x: 0, y: 0, w: 720, h: 1560 },
    drainY: opts.drainY ?? 1561,
    airFriction: 0.012,
    rollFriction: 0.05
  };
}

export function addBall(world, x, y) {
  const b = makeBall(x, y);
  world.balls.push(b);
  return b;
}

// ---- collision: ball vs segment ----
function collideSeg(ball, c, world) {
  // one-way gate: {nx, ny} is the BLOCKED direction — balls moving against
  // it collide; balls moving with it swing through
  if (c.oneWay && (ball.vx * c.oneWay.nx + ball.vy * c.oneWay.ny) < 0) return;
  const p = closestOnSeg(ball.x, ball.y, c.ax, c.ay, c.bx, c.by);
  const d2 = dist2(ball.x, ball.y, p.x, p.y);
  const rr = ball.r + (c.pad || 0);
  if (d2 >= rr * rr) return;
  const d = Math.sqrt(d2) || 0.0001;
  let nx = (ball.x - p.x) / d, ny = (ball.y - p.y) / d;
  resolveStatic(ball, nx, ny, rr - d, c, world, p);
}

// ---- collision: ball vs arc ----
function collideArc(ball, c, world) {
  const dx = ball.x - c.cx, dy = ball.y - c.cy;
  const d = Math.sqrt(dx * dx + dy * dy) || 0.0001;
  const ang = Math.atan2(dy, dx);
  if (!angleIn(ang, c.a0, c.a1)) return;
  if (c.inner) {
    // ball inside a bowl: push back toward center ring
    const pen = d + ball.r - c.r;
    if (pen <= 0) return;
    const nx = -dx / d, ny = -dy / d;
    resolveStatic(ball, nx, ny, pen, c, world, { x: c.cx + dx / d * c.r, y: c.cy + dy / d * c.r });
  } else {
    const pen = ball.r - (d - c.r);
    if (pen <= 0 || d <= c.r) return;
    const nx = dx / d, ny = dy / d;
    resolveStatic(ball, nx, ny, pen, c, world, { x: c.cx + dx / d * c.r, y: c.cy + dy / d * c.r });
  }
}

// ---- collision: ball vs circle (post / bumper) ----
function collideCircle(ball, c, world) {
  const d2 = dist2(ball.x, ball.y, c.cx, c.cy);
  const rr = ball.r + c.r;
  if (d2 >= rr * rr) return;
  const d = Math.sqrt(d2) || 0.0001;
  const nx = (ball.x - c.cx) / d, ny = (ball.y - c.cy) / d;
  resolveStatic(ball, nx, ny, rr - d, c, world, { x: c.cx, y: c.cy });
}

// shared impulse resolution against an immovable surface
function resolveStatic(ball, nx, ny, pen, c, world, point) {
  // positional correction
  ball.x += nx * pen;
  ball.y += ny * pen;
  const vn = ball.vx * nx + ball.vy * ny;
  const hitSpeed = -vn;
  if (vn < 0) {
    const e = c.bounce ?? 0.35;
    ball.vx -= (1 + e) * vn * nx;
    ball.vy -= (1 + e) * vn * ny;
    if (c.kick) { ball.vx += c.kick.x; ball.vy += c.kick.y; }
    if (c.onHit && hitSpeed > (c.hitThreshold ?? 40)) {
      fireHit(ball, c, world, hitSpeed, point);
    }
  }
}

function fireHit(ball, c, world, speed, point) {
  // debounce repeated contact events on the same collider
  if (ball.lastHit === c.id && world.time - ball.lastHitAt < 0.08) return;
  ball.lastHit = c.id;
  ball.lastHitAt = world.time;
  c.onHit(ball, world, speed, point);
}

// ---- collision: ball vs flipper (moving capsule) ----
function collideFlipper(ball, f, world) {
  const tip = flipperTip(f);
  const p = closestOnSeg(ball.x, ball.y, f.px, f.py, tip.x, tip.y);
  const rad = f.r0 + (f.r1 - f.r0) * p.t;         // tapered rubber
  const d2 = dist2(ball.x, ball.y, p.x, p.y);
  const rr = ball.r + rad;
  if (d2 >= rr * rr) return;
  const d = Math.sqrt(d2) || 0.0001;
  const nx = (ball.x - p.x) / d, ny = (ball.y - p.y) / d;
  const pen = rr - d;
  ball.x += nx * pen;
  ball.y += ny * pen;

  // surface velocity at contact point: v = omega x r
  const rx = p.x - f.px, ry = p.y - f.py;
  const svx = -f.av * ry, svy = f.av * rx;
  const rvx = ball.vx - svx, rvy = ball.vy - svy;
  const vn = rvx * nx + rvy * ny;
  if (vn < 0) {
    const e = 0.28; // flipper rubber
    const j = -(1 + e) * vn;
    ball.vx += j * nx;
    ball.vy += j * ny;
    // a touch of tangential grip so late flips "flick"
    const tx = -ny, ty = nx;
    const vt = rvx * tx + rvy * ty;
    ball.vx -= vt * 0.04 * tx;
    ball.vy -= vt * 0.04 * ty;
    world.events.push({ type: 'flipperContact', ball, side: f.side, speed: -vn });
  }
}

// ---- ball vs ball (equal mass elastic) ----
function collideBalls(a, b) {
  const d2 = dist2(a.x, a.y, b.x, b.y);
  const rr = a.r + b.r;
  if (d2 >= rr * rr || d2 === 0) return;
  const d = Math.sqrt(d2);
  const nx = (b.x - a.x) / d, ny = (b.y - a.y) / d;
  const pen = (rr - d) / 2;
  a.x -= nx * pen; a.y -= ny * pen;
  b.x += nx * pen; b.y += ny * pen;
  const rvx = b.vx - a.vx, rvy = b.vy - a.vy;
  const vn = rvx * nx + rvy * ny;
  if (vn < 0) {
    const j = -vn * 0.94; // slightly lossy
    a.vx -= j * nx; a.vy -= j * ny;
    b.vx += j * nx; b.vy += j * ny;
  }
}

// ---------------------------------------------------------------------------
// Main step. Call with frame dt; internally substeps at ~480 Hz.
// ---------------------------------------------------------------------------

const SUBSTEP = 1 / 480;

export function stepWorld(world, dt) {
  let remaining = Math.min(dt, 1 / 20); // clamp huge frame gaps
  while (remaining > 0.00001) {
    const h = Math.min(SUBSTEP, remaining);
    remaining -= h;
    world.time += h;
    substep(world, h);
  }
}

function substep(world, h) {
  for (const f of world.flippers) stepFlipper(f, h);

  const live = world.balls.filter(b => b.alive && !b.locked);
  for (const b of live) {
    if (b.onRamp) { stepRamp(b, h, world); continue; }
    if (b.ghost > 0) b.ghost -= h;

    b.vy += world.gravity * h;
    // mild drag
    const drag = 1 - world.airFriction * h;
    b.vx *= drag; b.vy *= drag;

    b.x += b.vx * h;
    b.y += b.vy * h;

    if (b.ghost <= 0) {
      for (const c of world.colliders) {
        if (c.disabled) continue;
        if (c.kind === 'seg') collideSeg(b, c, world);
        else if (c.kind === 'arc') collideArc(b, c, world);
        else if (c.kind === 'circle') collideCircle(b, c, world);
      }
      for (const f of world.flippers) collideFlipper(b, f, world);
    }

    // sensors
    for (const s of world.sensors) {
      if (s.disabled) continue;
      const was = s._state?.get(b.id) || false;
      const now = s.test(b);
      if (now && !was) s.onTrigger(b, world);
      if (!s._state) s._state = new Map();
      s._state.set(b.id, now);
    }

    // drain
    if (b.y - b.r > world.drainY && b.alive) {
      b.alive = false;
      world.events.push({ type: 'drain', ball: b });
    }
  }

  // ball-ball
  for (let i = 0; i < live.length; i++) {
    for (let j = i + 1; j < live.length; j++) {
      if (!live[i].onRamp && !live[j].onRamp) collideBalls(live[i], live[j]);
    }
  }

  // cull dead balls
  for (let i = world.balls.length - 1; i >= 0; i--) {
    if (!world.balls[i].alive) world.balls.splice(i, 1);
  }
}

// ---------------------------------------------------------------------------
// Scripted ramp travel: ball follows a polyline path at a target speed,
// ignoring gravity/colliders, then is released at the end.
// ---------------------------------------------------------------------------

export function startRamp(ball, path, speed, tag, world) {
  ball.onRamp = {
    path, tag,
    speed: Math.max(speed, 300),
    dist: 0,
    total: pathLength(path)
  };
  const p0 = path[0];
  ball.x = p0.x; ball.y = p0.y;
  ball.vx = 0; ball.vy = 0;
  world.events.push({ type: 'rampEnter', ball, tag });
}

function pathLength(path) {
  let L = 0;
  for (let i = 1; i < path.length; i++) L += Math.hypot(path[i].x - path[i - 1].x, path[i].y - path[i - 1].y);
  return L;
}

function stepRamp(ball, h, world) {
  const r = ball.onRamp;
  r.dist += r.speed * h;
  if (r.dist >= r.total) {
    const end = r.path[r.path.length - 1];
    const prev = r.path[r.path.length - 2];
    const dx = end.x - prev.x, dy = end.y - prev.y;
    const d = Math.hypot(dx, dy) || 1;
    ball.x = end.x; ball.y = end.y;
    ball.vx = dx / d * r.speed * 0.55;
    ball.vy = dy / d * r.speed * 0.55;
    ball.onRamp = null;
    ball.ghost = 0.12; // brief grace so exit geometry doesn't grab it
    world.events.push({ type: 'rampExit', ball, tag: r.tag });
    return;
  }
  // walk the polyline
  let acc = 0;
  for (let i = 1; i < r.path.length; i++) {
    const a = r.path[i - 1], b = r.path[i];
    const L = Math.hypot(b.x - a.x, b.y - a.y);
    if (acc + L >= r.dist) {
      const t = (r.dist - acc) / L;
      ball.x = a.x + (b.x - a.x) * t;
      ball.y = a.y + (b.y - a.y) * t;
      return;
    }
    acc += L;
  }
}
