// THUNDER CANYON — 2D pinball physics. Units: inches, seconds. Screen coords (y down).
// Gravity is the in-plane component of g on a 6.5-degree incline.
// Design notes:
//  * Fixed 1/240 s steps, split further so a ball never travels >0.16 in per substep
//    (ball radius 0.53) — this plus projection keeps fast shots from tunnelling.
//  * Flippers use a near-instant coil (30 ms up / 95 ms down) with a polarity
//    exit-angle curve: energy near the tip is handed off along the tip tangent.
//  * Resting contacts get zeroed normal velocity (no Coulomb friction on rests)
//    so balls roll slopes instead of sticking.
//  * One-way gates block at a flap plane offset past the hinge so balls can
//    dribble off the flap's low end instead of parking in a V.

var T = typeof TCU !== 'undefined' ? TCU : require('./util.js');

const PHYS = {};

PHYS.BALL_R = 0.5313;            // 27 mm ball
PHYS.G = 43.8;                   // 386.1 * sin(6.5deg)
PHYS.SPEED = 0.8;                // simulation clock scale: ball runs at 80%
const SUB_DT = 1 / 240;
const MAX_SUB_MOVE = 0.16;
const REST_EPS = 1.4;            // below this normal speed a contact is a rest

class Ball {
  constructor(x, y, vx = 0, vy = 0) {
    this.p = { x, y };
    this.v = { x: vx, y: vy };
    this.r = PHYS.BALL_R;
    this.state = 'play';        // play | plunger | captured | removed
    this.id = Ball._id = (Ball._id || 0) + 1;
    this.restT = 0;             // seconds spent nearly stopped
    this.restRef = null;        // reference position for rest detection
    this.trail = [];
    this.h = 0;                 // cosmetic elevation (ramps later) — 0 on playfield
    this.lastSensorReset = {};  // sensorId -> true while inside / latched
  }
  speed() { return Math.hypot(this.v.x, this.v.y); }
}

class Wall { constructor(a, b, e = 0.42, kind = 'wall', opts = {}) {
  this.a = a; this.b = b; this.e = e; this.kind = kind;
  Object.assign(this, opts);
} }

class Post { constructor(c, r, e = 0.45, kind = 'rubber') { this.c = c; this.r = r; this.e = e; this.kind = kind; } }

class Flipper {
  constructor(pivot, side, length = 2.95, mini = false) {
    this.pivot = pivot;           // {x,y}
    this.side = side;             // 'L' | 'R'
    this.len = length;
    this.upAngle = T.rad(56);   // magnitude of raise above rest
    this.restAngle = T.rad(38); // droop below horizontal at rest — keeps the
                                  // closed tip gap (~1.35 in) wider than a ball
    this.angle = this.restAngle; // current angle below horizontal (+ = drooping)
    this.up = false;
    this.omega = 0;              // rad/s (sign handles direction)
    this.upTime = mini ? 0.028 : 0.034;
    this.downTime = 0.095;
    this.tip = { x: 0, y: 0 };
    this.updateTip(0);
  }
  // angle measured from horizontal; positive = tip below pivot. Side mirrors x.
  targetAngle() { return this.up ? -this.upAngle : this.restAngle; }
  step(dt) {
    const tgt = this.targetAngle();
    const total = this.restAngle + this.upAngle;
    const rate = total / (this.up ? this.upTime : this.downTime);
    const prev = this.angle;
    if (this.angle < tgt) this.angle = Math.min(tgt, this.angle + rate * dt);
    else if (this.angle > tgt) this.angle = Math.max(tgt, this.angle - rate * dt);
    this.omega = (this.angle - prev) / Math.max(dt, 1e-5);
    this.updateTip();
  }
  updateTip() {
    const s = this.side === 'L' ? 1 : -1;
    this.tip.x = this.pivot.x + s * this.len * Math.cos(this.angle);
    this.tip.y = this.pivot.y + this.len * Math.sin(this.angle);
    this.tipT = this.tipT || [];
  }
  radiusAt(t) { return T.lerp(0.33, 0.12, T.clamp(t, 0, 1)); } // taper pivot->tip
  // tip rubber stays thin (0.12): with two tips 1.35 in apart, contact
  // radius must stay under half the gap (0.675) or a ball resting between
  // closed tips sits in a V-dimple forever instead of rolling down the gap
}

// One-way gate: segment hinge->tip. 'allow' is the unit direction balls may
// cross in. Balls on the `passed` side at distance > flap catch cannot return.
class Gate {
  constructor(hinge, tip, opts = {}) {
    this.hinge = hinge; this.tip = tip;
    this.dir = T.norm(T.sub(tip, hinge));
    this.normal = T.norm(T.perp(this.dir));           // geometric perp
    // choose 'allow' = the crossing direction; default: perp side of normal chosen by opts
    this.allow = opts.allow || this.normal;
    if (T.dot(this.normal, this.allow) < 0) this.normal = T.mul(this.normal, -1);
    else this.normal = this.normal;
    this.catch = opts.catch ?? 0.45;  // flap-catch offset beyond plane
    this.openT = {};                    // ballId -> pass timestamp-ish
    this.kind = 'gate';
  }
}

class Spinner {
  constructor(a, b, opts = {}) {
    this.a = a; this.b = b;
    this.dir = T.norm(T.sub(b, a));
    this.normal = T.norm(T.perp(this.dir));
    this.spin = 0;        // visual 0..1 rotation accum
    this.cool = 0;
    this.kind = 'spinner';
    this.e = opts.e ?? 0.3;
  }
}

class World {
  constructor() {
    this.walls = [];      // Wall[]
    this.posts = [];      // Post[]
    this.flippers = [];
    this.gates = [];      // Gate[]
    this.spinners = [];
    this.sensors = [];    // {id, a, b} crossing lines  or {id, c, r} circles
    this.poppers = [];    // {id, c, r, power, cool}
    this.slings = [];     // {id, a, b, n, power, cool}
    this.captures = [];   // {id, c, r} saucers/pits
    this.kickbacks = [];  // {id, a, b, dir, power, cool} zones
    this.balls = [];
    this.events = [];     // drained each frame: {type, ...}
    this.t = 0;
    this.plunger = null;  // {lane:{x0,x1,y}, noseY, charge, ball}
    this.tilt = 0;
    this.tilted = false;
  }

  ev(type, data = {}) { this.events.push(Object.assign({ type }, data)); }

  addBall(x, y, vx = 0, vy = 0, state = 'play') {
    const b = new Ball(x, y, vx, vy);
    b.state = state;
    this.balls.push(b);
    return b;
  }

  activeBalls() { return this.balls.filter(b => b.state === 'play'); }
  inPlayCount() { return this.balls.filter(b => b.state === 'play' || b.state === 'plunger').length; }

  removeBall(b) { b.state = 'removed'; }

  // ---- geometry feed -------------------------------------------------------
  polyline(pts, e = 0.42, kind = 'wall') {
    for (let i = 0; i + 1 < pts.length; i++)
      this.walls.push(new Wall({ ...pts[i] }, { ...pts[i + 1] }, e, kind));
  }

  // ---- main step ----------------------------------------------------------
  step(frameDt) {
    // simulation clock at 80% of real time: the ball crosses the table at
    // 80% speed and flipper/pop kicks come off 20% softer. Gravity stays in
    // true units, so every trajectory remains physically exact — the whole
    // machine just runs at 0.8x, like a slowed cabinet.
    const dt = frameDt * PHYS.SPEED;
    let remaining = Math.min(dt, 1 / 30); // clamp spiral-of-death
    while (remaining > 1e-5) {
      const h = Math.min(SUB_DT, remaining);
      this.substep(h);
      remaining -= h;
    }
    this.t += dt;
    return this.events.splice(0);
  }

  substep(dt) {
    for (const f of this.flippers) f.step(dt);
    for (const s of this.spinners) {
      if (s.cool > 0) s.cool -= dt;
      s.spin *= Math.exp(-2.6 * dt);   // axle friction: blade tips back to rest
    }
    for (const p of this.poppers) if (p.cool > 0) p.cool -= dt;
    for (const s of this.slings) if (s.cool > 0) s.cool -= dt;

    for (const b of this.balls) {
      if (b.state !== 'play') continue;
      const n = Math.max(1, Math.ceil((b.speed() * dt) / MAX_SUB_MOVE));
      const h = dt / n;
      for (let i = 0; i < n; i++) this.integrate(b, h);
      this.sensorsCheck(b, dt);
      this.restTrack(b, dt);
      if (b.state === 'play') {
        b.trail.push({ x: b.p.x, y: b.p.y });
        if (b.trail.length > 14) b.trail.shift();
      }
    }
  }

  integrate(b, h) {
    b.v.y += PHYS.G * h;
    // rolling air/glass drag: tiny
    b.v.x *= (1 - 0.02 * h);
    b.v.y *= (1 - 0.015 * h);
    const prev = { ...b.p };
    b.p.x += b.v.x * h;
    b.p.y += b.v.y * h;

    // Slight suction near armed poppers gives the classic "pop" grab.
    for (const p of this.poppers) {
      if (p.cool > 0) continue;
      const d = T.dist(b.p, p.c);
      if (d > p.r && d < p.r + 0.85) {
        const n = T.norm(T.sub(p.c, b.p));
        b.v.x += n.x * 55 * h; b.v.y += n.y * 55 * h;
      }
    }

    // resolve collisions (2 relaxation passes for stacks in lanes)
    for (let pass = 0; pass < 2; pass++) {
      this.collideWalls(b, prev);
      this.collidePosts(b);
      this.collideFlippers(b);
      this.collideGates(b);
      this.collideSpinners(b);
    }
    this.collideSlings(b);
    this.collidePoppers(b);
    this.collideCaptures(b);
  }

  collideWalls(b, prev) {
    for (const w of this.walls) {
      if (w.targetId && this.targetStates && this.targetStates[w.targetId] && this.targetStates[w.targetId].down) continue;
      const c = T.closestSeg(b.p, w.a, w.b);
      if (c.d >= b.r) continue;
      let n = T.sub(b.p, c.p);
      let l = T.len(n);
      if (l < 1e-6) {
        // center on the line: back off along -velocity dir or segment normal
        n = T.norm(T.sub(b.p, prev));
        if (T.len(T.mul(n, 0)) === 0 && T.len(n) < 1e-6)
          n = T.norm(T.perp(T.sub(w.b, w.a)));
      }
      n = T.norm(n);
      b.p = T.add(c.p, T.mul(n, b.r + 1e-4));
      const vn = T.dot(b.v, n);
      if (vn < 0) {
        if (vn > -REST_EPS) { b.v = T.sub(b.v, T.mul(n, vn)); }
        else {
          b.v = T.sub(b.v, T.mul(n, (1 + w.e) * vn));
          if (w.kind === 'rubber' && -vn > 20) this.ev('rubber', { x: b.p.x, y: b.p.y, v: -vn });
        }
      }
    }
  }

  collidePosts(b) {
    for (const p of this.posts) {
      const d = T.dist(b.p, p.c);
      const rr = p.r + b.r;
      if (d >= rr || d < 1e-6) continue;
      const n = T.norm(T.sub(b.p, p.c));
      b.p = T.add(p.c, T.mul(n, rr + 1e-4));
      const vn = T.dot(b.v, n);
      if (vn < 0) {
        if (vn > -REST_EPS) b.v = T.sub(b.v, T.mul(n, vn));
        else b.v = T.sub(b.v, T.mul(n, (1 + p.e) * vn));
      }
    }
  }

  collideFlippers(b) {
    for (const f of this.flippers) {
      const c = T.closestSeg(b.p, f.pivot, f.tip);
      const rr = f.radiusAt(c.t) + b.r;
      if (c.d >= rr) continue;
      let n = T.sub(b.p, c.p);
      if (T.len(n) < 1e-6) n = T.norm(T.perp(T.sub(f.tip, f.pivot)));
      n = T.norm(n);
      b.p = T.add(c.p, T.mul(n, rr + 1e-4));
      // surface velocity at contact from flipper rotation
      const rc = T.sub(c.p, f.pivot);
      const s = f.side === 'L' ? 1 : -1;
      // omega sign: angle decreasing (toward up) means rotating up.
      const sv = { x: -s * f.omega * rc.y, y: s * f.omega * rc.x };
      const rel = T.sub(b.v, sv);
      const vn = T.dot(rel, n);
      if (vn < 0) {
        let e = 0.5;
        // polarity exit-angle curve: near tip on the upstroke, launch along tangent
        const tipness = c.t;
        if (f.up && f.omega < -8 && tipness > 0.55) e = 0.78 + 0.12 * tipness;
        if (vn > -REST_EPS && !(f.up && tipness > 0.5)) e = 0;
        const j = -(1 + e) * vn;
        b.v = T.add(b.v, T.mul(n, j));
        // rubber grip adds tangential carry during the swing
        if (f.up && f.omega < -8) {
          const tg = T.norm(T.perp(n));
          const vtSurf = T.dot(sv, tg);
          b.v.x += tg.x * vtSurf * 0.3 * tipness;
          b.v.y += tg.y * vtSurf * 0.3 * tipness;
        }
        this.ev('flipperHit', { side: f.side, speed: -vn, x: b.p.x, y: b.p.y });
      }
    }
  }

  collideGates(b) {
    for (const g of this.gates) {
      const c = T.closestSeg(b.p, g.hinge, g.tip);
      if (c.t <= 0.001 && T.dot(T.sub(b.p, g.hinge), g.dir) < 0) continue; // behind hinge
      const rel = T.sub(b.p, c.p);
      const side = T.dot(rel, g.normal); // +: passed side, -: flap side
      const along = T.dot(b.v, g.allow);
      // Passed side: block if ball dives back across plane toward flap side.
      if (side > 0) {
        if (along > 0) continue; // still moving deeper — free
        // clamp to flap-catch plane (park on flap; gravity slides it off the low hinge end)
        const minSide = g.catch + b.r * 0.5;
        if (side < minSide) {
          b.p = T.add(b.p, T.mul(g.normal, minSide - side));
          const vn = T.dot(b.v, g.normal);
          if (vn < 0) b.v = T.sub(b.v, T.mul(g.normal, vn));
        }
        continue;
      }
      // Flap side (-): moving with allow opens the flap.
      if (along >= 0) continue; // crossing allowed direction: open
      const d = -side;
      if (d < b.r) {
        b.p = T.add(b.p, T.mul(g.normal, -b.r - 1e-4));
        const vn = T.dot(b.v, g.normal);
        if (vn < 0) {
          const e = Math.abs(vn) > 40 ? 0.45 : 0.1;
          b.v = T.sub(b.v, T.mul(g.normal, (1 + e) * vn));
          this.ev('gate', { x: b.p.x, y: b.p.y });
        }
      }
    }
  }

  // spinner: a hinged blade on a low-friction axle. It never reverses a
  // ball — the blade swings out of the way in either crossing direction.
  // The friction bite is taken ONCE per crossing (leading-edge contact);
  // trimming every substep across the contact band would strangle a
  // crossing ball mid-blade and hang it there.
  collideSpinners(b) {
    for (const s of this.spinners) {
      const c = T.closestSeg(b.p, s.a, s.b);
      if (c.d >= b.r + 0.09) continue;
      const n = s.normal;
      const vn = T.dot(b.v, n);
      if (s.cool <= 0) {                        // first touch of a crossing:
        s.cool = 0.12;                          // spin the blade up once
        b.v = T.sub(b.v, T.mul(n, 0.10 * vn)); // light bearing friction
        s.spin += Math.max(0.4, Math.abs(vn) / 140);
        if (Math.abs(vn) > 8) this.ev('spinner', { id: s.id, v: b.speed() });
      }
      // if nearly parallel to the plane, settle onto the nearer face so the
      // ball can't chatter across the contact band
      if (Math.abs(vn) < 1.5) {
        const side = T.dot(T.sub(b.p, c.p), n) >= 0 ? 1 : -1;
        b.p = T.add(c.p, T.mul(n, side * (b.r + 0.09)));
      }
    }
  }

  collideSlings(b) {
    for (const s of this.slings) {
      const c = T.closestSeg(b.p, s.a, s.b);
      if (c.d >= b.r + 0.12) continue;
      const vn = T.dot(b.v, s.n); // heading toward face => vn<0 with n pointing into field
      b.p = T.add(b.p, T.mul(s.n, b.r + 0.13 - c.d));
      if (vn < 0) {
        b.v = T.sub(b.v, T.mul(s.n, (1 + 0.55) * vn));
        if (s.cool <= 0) {
          s.cool = 0.09;
          b.v = T.add(b.v, T.mul(s.n, s.power));
          this.ev('sling', { id: s.id, x: b.p.x, y: b.p.y });
        }
      }
    }
  }

  collidePoppers(b) {
    for (const p of this.poppers) {
      const d = T.dist(b.p, p.c);
      if (d >= p.r + b.r || d < 1e-6) continue;
      const n = T.norm(T.sub(b.p, p.c));
      b.p = T.add(p.c, T.mul(n, p.r + b.r + 1e-3));
      if (p.cool <= 0) {
        p.cool = 0.085;
        const sp = p.power + b.speed() * 0.15;
        b.v = T.add(T.mul(n, sp), T.mul(T.norm(T.perp(n)), T.dot(b.v, T.perp(n)) * 0.35));
        this.ev('pop', { id: p.id, x: p.c.x, y: p.c.y, vx: b.v.x, vy: b.v.y });
      } else {
        const vn = T.dot(b.v, n);
        if (vn < 0) b.v = T.sub(b.v, T.mul(n, (1 + 0.5) * vn));
      }
    }
  }

  collideCaptures(b) {
    for (const cs of this.captures) {
      if (!cs.enabled) continue;
      if (T.dist(b.p, cs.c) < cs.r) {
        b.state = 'captured';
        b.v = { x: 0, y: 0 };
        b.p = { ...cs.c };
        this.ev('capture', { id: cs.id, ballId: b.id });
      }
    }
  }

  sensorsCheck(b, dt) {
    for (const s of this.sensors) {
      if (s.circle) {
        const inside = T.dist(b.p, s.c) < s.r;
        if (inside && !b.lastSensorReset[s.id]) {
          b.lastSensorReset[s.id] = true;
          this.ev('rollover', { id: s.id, ballId: b.id });
        } else if (!inside && b.lastSensorReset[s.id]) {
          b.lastSensorReset[s.id] = false;
        }
      } else {
        // line crossing, either direction, rearm outside pad
        const d0 = sideOf(b.trail.length ? b.trail[b.trail.length - 1] : b.p, s);
        const d1 = sideOf(b.p, s);
        const armed = !b.lastSensorReset[s.id];
        const onPad = Math.abs(d1) < 1.0 && withinSeg(b.p, s);
        if (armed && d0 !== d1 && onPad) {
          b.lastSensorReset[s.id] = true;
          this.ev('rollover', { id: s.id, ballId: b.id });
        } else if (b.lastSensorReset[s.id] && !onPad) {
          b.lastSensorReset[s.id] = false;
        }
      }
    }
    // kickbacks
    for (const k of this.kickbacks) {
      if (!k.enabled || k.cool > 0) continue;
      k.cool -= dt;
      if (T.dist(b.p, k.c) < k.r) {
        k.enabled = false; k.cool = 1.5;
        b.v = { x: k.dir.x * k.power + (Math.random() - 0.5) * 6, y: k.dir.y * k.power };
        this.ev('kickback', { id: k.id });
      }
    }
  }

  restTrack(b, dt) {
    if (!b.restRef || T.dist(b.p, b.restRef) > 0.22) {
      b.restRef = { ...b.p };
      b.restT = 0;
      b.restAnnounced = false;
      return;
    }
    if (b.speed() < 3.2) b.restT += dt;
    else { b.restT = 0; b.restAnnounced = false; }
    // announce a rest once, then let the clock keep growing — the rules
    // layer reads restT directly to decide when to search / force-drain
    if (b.restT > 2.2 && !b.restAnnounced) {
      b.restAnnounced = true;
      this.ev('resting', { ballId: b.id, x: b.p.x, y: b.p.y });
    }
  }

  // ---- controls -----------------------------------------------------------
  setFlipper(side, up) {
    for (const f of this.flippers) if (f.side === side && !f.locked) f.up = up;
  }

  nudge(vx, vy) {
    for (const b of this.balls) {
      if (b.state !== 'play') continue;
      b.v.x += vx; b.v.y += vy;
    }
    this.tilt += 1;
    this.ev('nudge');
    if (this.tilt >= 3 && !this.tilted) {
      this.tilted = true;
      this.ev('tilt');
    }
  }

  clearTilt() { this.tilt = 0; this.tilted = false; }

  // Eject a captured ball from a device.
  ejectCaptured(ballId, pos, dir, speed, jitter = 0.12) {
    const b = this.balls.find(bb => bb.id === ballId);
    if (!b) return null;
    b.state = 'play';
    b.p = { ...pos };
    const j = (Math.random() - 0.5) * jitter;
    const c = Math.cos(j), s = Math.sin(j);
    const d = { x: dir.x * c - dir.y * s, y: dir.x * s + dir.y * c };
    b.v = { x: d.x * speed, y: d.y * speed };
    b.restT = 0; b.restRef = null; b.trail = [];
    return b;
  }

  plungerHold(dt, maxT = 1.25) {
    if (!this.plunger) return;
    this.plunger.charge = T.clamp((this.plunger.charge || 0) + dt / maxT, 0, 1);
  }
  plungerRelease() {
    if (!this.plunger) return null;
    const ch = this.plunger.charge || 0;
    this.plunger.charge = 0;
    const ball = this.balls.find(b => b.state === 'plunger');
    if (!ball) return null;
    ball.state = 'play';
    const speed = 118 + ch * 74; // 118..192 in/s — min still clears the lane gate
    ball.v = { x: (Math.random() - 0.5) * 3, y: -speed };
    this.ev('launch', { power: ch });
    return ball;
  }
}

function sideOf(p, s) {
  const d = T.sub(p, s.a);
  return T.dot(d, T.norm(T.perp(T.sub(s.b, s.a)))) >= 0 ? 1 : -1;
}
function withinSeg(p, s) {
  const c = T.closestSeg(p, s.a, s.b);
  return c.t > 0.02 && c.t < 0.98;
}

PHYS.World = World;
PHYS.Ball = Ball;
PHYS.Wall = Wall;
PHYS.Post = Post;
PHYS.Flipper = Flipper;
PHYS.Gate = Gate;
PHYS.Spinner = Spinner;

if (typeof module !== 'undefined' && module.exports) module.exports = PHYS;
if (typeof window !== 'undefined') window.PHYS = PHYS;
