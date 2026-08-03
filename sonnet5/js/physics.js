// Core physics engine: fixed-substep integration + circle/segment collision resolution.
// Units: millimeters, seconds, kilograms (real-world scale so the table matches a
// standard 20in x 42in / 6.5-degree-pitch playfield).

const PHYS = {
  GRAVITY: 1100,          // mm/s^2 -- 9810 * sin(6.5deg), the effective "downhill" pull
  BALL_RADIUS: 13.5,      // mm -- 1 1/16" standard pinball
  BALL_MASS: 0.08,        // kg -- ~80g standard pinball
  LINEAR_DRAG: 0.06,      // 1/s, gentle rolling/air resistance
  MAX_SPEED: 4800,        // mm/s hard clamp so nothing can ever break the sim
  SUBSTEP_HZ: 480,        // physics runs at a fixed 480Hz for stability & no tunneling
  MAX_SUBSTEPS: 16,
  POS_CORRECTION: 0.85,   // fraction of penetration resolved per substep
  SLOP: 0.05,             // mm of allowed penetration before correction kicks in (anti-jitter)
};

// Closest points between two segments p1-q1 and p2-q2 (Ericson, Real-Time Collision Detection).
// Used both for ball-vs-wall (ball's swept path is segment 1) and ball-vs-flipper-capsule.
function closestPtSegmentSegment(p1, q1, p2, q2) {
  const d1 = q1.sub(p1);
  const d2 = q2.sub(p2);
  const r = p1.sub(p2);
  const a = d1.dot(d1);
  const e = d2.dot(d2);
  const f = d2.dot(r);
  let s, t;

  if (a <= 1e-9 && e <= 1e-9) {
    s = 0; t = 0;
  } else if (a <= 1e-9) {
    s = 0;
    t = clamp(f / e, 0, 1);
  } else {
    const c = d1.dot(r);
    if (e <= 1e-9) {
      t = 0;
      s = clamp(-c / a, 0, 1);
    } else {
      const b = d1.dot(d2);
      const denom = a * e - b * b;
      s = denom !== 0 ? clamp((b * f - c * e) / denom, 0, 1) : 0;
      t = (b * s + f) / e;
      if (t < 0) { t = 0; s = clamp(-c / a, 0, 1); }
      else if (t > 1) { t = 1; s = clamp((b - c) / a, 0, 1); }
    }
  }

  const c1 = p1.add(d1.mul(s));
  const c2 = p2.add(d2.mul(t));
  return { c1, c2, s, t, dist: c1.distanceTo(c2) };
}

// Resolve a ball against a static (or slow, non-rotating) line segment [a,b].
// Uses the ball's full swept path this substep so fast balls can't tunnel through rails.
// Returns true if a collision occurred.
function resolveBallSegment(ball, oldPos, a, b, restitution, thickness = 0) {
  const radius = ball.radius + thickness;
  const hit = closestPtSegmentSegment(oldPos, ball.pos, a, b);
  if (hit.dist >= radius) return null;

  let normal;
  if (hit.dist > 1e-6) {
    normal = hit.c1.sub(hit.c2).normalized();
  } else {
    // Degenerate: path crosses exactly through the wall. Fall back to which side
    // the ball started on so it gets pushed back the way it came.
    const wallDir = b.sub(a).normalized();
    const side = wallDir.cross(oldPos.sub(a));
    const perp = wallDir.normal();
    normal = side >= 0 ? perp : perp.negate();
  }

  ball.pos = hit.c2.add(normal.mul(radius + PHYS.SLOP));

  const vn = ball.vel.dot(normal);
  if (vn < 0) {
    ball.vel = ball.vel.sub(normal.mul((1 + restitution) * vn));
  }
  return normal;
}

// Resolve a ball against a static circle (post, bumper body, etc.)
function resolveBallCircle(ball, center, radius, restitution) {
  const delta = ball.pos.sub(center);
  const dist = delta.length();
  const minDist = ball.radius + radius;
  if (dist >= minDist) return null;

  const normal = dist > 1e-6 ? delta.mul(1 / dist) : new Vec2(0, -1);
  ball.pos = center.add(normal.mul(minDist + PHYS.SLOP));

  const vn = ball.vel.dot(normal);
  if (vn < 0) {
    ball.vel = ball.vel.sub(normal.mul((1 + restitution) * vn));
  }
  return normal;
}

// Resolve a ball against a rotating capsule (flipper arm). The arm's angular velocity
// imparts extra momentum at the contact point, exactly like a real flipper solenoid.
function resolveBallCapsuleMoving(ball, oldPos, pivot, tip, capsuleRadius, angularVelocity, restitution) {
  const radius = ball.radius + capsuleRadius;
  const hit = closestPtSegmentSegment(oldPos, ball.pos, pivot, tip);
  if (hit.dist >= radius) return null;

  let normal;
  if (hit.dist > 1e-6) {
    normal = hit.c1.sub(hit.c2).normalized();
  } else {
    const armDir = tip.sub(pivot).normalized();
    normal = armDir.normal();
  }

  ball.pos = hit.c2.add(normal.mul(radius + PHYS.SLOP));

  // Velocity of the flipper surface at the contact point: v = omega x r
  const armLen = pivot.distanceTo(tip) || 1;
  const contactR = hit.t * armLen;
  const armDir = tip.sub(pivot).normalized();
  const tangent = armDir.normal();
  const pointVel = tangent.mul(angularVelocity * contactR);

  const relVel = ball.vel.sub(pointVel);
  const vn = relVel.dot(normal);
  if (vn < 0) {
    const j = (1 + restitution) * vn;
    ball.vel = ball.vel.sub(normal.mul(j));
  }
  return normal;
}

// Elastic-ish collision between two dynamic balls (multiball).
function resolveBallBall(a, b, restitution) {
  const delta = a.pos.sub(b.pos);
  const dist = delta.length();
  const minDist = a.radius + b.radius;
  if (dist >= minDist || dist < 1e-6) return false;

  const normal = delta.mul(1 / dist);
  const penetration = minDist - dist;
  const totalMass = a.mass + b.mass;
  a.pos = a.pos.add(normal.mul(penetration * (b.mass / totalMass)));
  b.pos = b.pos.sub(normal.mul(penetration * (a.mass / totalMass)));

  const relVel = a.vel.sub(b.vel);
  const vn = relVel.dot(normal);
  if (vn < 0) {
    const j = -(1 + restitution) * vn / (1 / a.mass + 1 / b.mass);
    a.vel = a.vel.add(normal.mul(j / a.mass));
    b.vel = b.vel.sub(normal.mul(j / b.mass));
  }
  return true;
}

class Ball {
  constructor(x, y, radius = PHYS.BALL_RADIUS, mass = PHYS.BALL_MASS) {
    this.pos = new Vec2(x, y);
    this.vel = new Vec2(0, 0);
    this.radius = radius;
    this.mass = mass;
    this.alive = true;        // false once drained/removed
    this.captured = null;     // set to owning entity while on a scripted ramp/scoop path
    this.trail = [];          // recent positions for motion-blur rendering
    this.spin = 0;            // purely cosmetic rolling spin angle
    this.highlight = false;   // true for the "active"/most-recently-plunged ball (rendering aid)
  }

  integrate(dt) {
    this.vel.y += PHYS.GRAVITY * dt;
    const dragFactor = Math.max(0, 1 - PHYS.LINEAR_DRAG * dt);
    this.vel.mulInPlace(dragFactor);

    const speed = this.vel.length();
    if (speed > PHYS.MAX_SPEED) this.vel.mulInPlace(PHYS.MAX_SPEED / speed);

    this.pos.addInPlace(this.vel.mul(dt));

    // cosmetic rolling
    this.spin += (this.vel.x / this.radius) * dt;
  }

  pushTrail() {
    this.trail.push({ x: this.pos.x, y: this.pos.y });
    if (this.trail.length > 6) this.trail.shift();
  }
}

// The World owns all balls and "collidable" table hardware and drives the fixed-step
// simulation loop. Every collidable implements some subset of:
//   update(dt)                    - animate (flipper angle, drop-target motion, spinner decay)
//   resolveCollision(ball, oldPos)-> bool   - static per-substep collision test/response
//   updateCaptured(dt)            - advance any balls currently "held" (ramp/scoop scripted paths)
class World {
  constructor() {
    this.balls = [];
    this.collidables = [];     // walls, bumpers, slingshots, flippers, targets, spinners, kickers
    this.captureZones = [];    // ramps, locks/scoops - own their own captured balls
    this.width = 0;
    this.height = 0;
    this.onBallLost = null;    // (ball) => void
    this.drainY = 0;
  }

  addBall(ball) { this.balls.push(ball); return ball; }

  removeBall(ball) {
    ball.alive = false;
    const i = this.balls.indexOf(ball);
    if (i >= 0) this.balls.splice(i, 1);
  }

  step(dt) {
    dt = Math.min(dt, 1 / 20);
    const subDt = 1 / PHYS.SUBSTEP_HZ;
    let steps = Math.ceil(dt / subDt);
    steps = clamp(steps, 1, PHYS.MAX_SUBSTEPS);
    const actualSubDt = dt / steps;
    for (let i = 0; i < steps; i++) this.substep(actualSubDt);
  }

  substep(dt) {
    for (const c of this.collidables) if (c.update) c.update(dt);
    for (const z of this.captureZones) if (z.update) z.update(dt);

    for (const ball of this.balls) {
      if (!ball.alive || ball.captured) continue;
      const oldPos = ball.pos.clone();
      ball.integrate(dt);

      for (const c of this.collidables) {
        if (c.resolveCollision) c.resolveCollision(ball, oldPos);
      }
      for (const z of this.captureZones) {
        if (z.tryCapture) z.tryCapture(ball, oldPos);
      }
    }

    // ball vs ball (multiball)
    for (let i = 0; i < this.balls.length; i++) {
      const a = this.balls[i];
      if (!a.alive || a.captured) continue;
      for (let j = i + 1; j < this.balls.length; j++) {
        const b = this.balls[j];
        if (!b.alive || b.captured) continue;
        resolveBallBall(a, b, 0.85);
      }
    }

    for (const z of this.captureZones) if (z.updateCaptured) z.updateCaptured(dt);

    for (const ball of this.balls) {
      if (ball.alive && !ball.captured && ball.pos.y - ball.radius > this.drainY) {
        if (this.onBallLost) this.onBallLost(ball);
      }
    }
  }
}
