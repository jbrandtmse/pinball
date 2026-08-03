// Minimal 2D vector math used throughout the physics engine and renderer.
class Vec2 {
  constructor(x = 0, y = 0) { this.x = x; this.y = y; }

  set(x, y) { this.x = x; this.y = y; return this; }
  clone() { return new Vec2(this.x, this.y); }
  copy(v) { this.x = v.x; this.y = v.y; return this; }

  add(v) { return new Vec2(this.x + v.x, this.y + v.y); }
  sub(v) { return new Vec2(this.x - v.x, this.y - v.y); }
  mul(s) { return new Vec2(this.x * s, this.y * s); }
  addInPlace(v) { this.x += v.x; this.y += v.y; return this; }
  subInPlace(v) { this.x -= v.x; this.y -= v.y; return this; }
  mulInPlace(s) { this.x *= s; this.y *= s; return this; }

  dot(v) { return this.x * v.x + this.y * v.y; }
  cross(v) { return this.x * v.y - this.y * v.x; }

  lengthSq() { return this.x * this.x + this.y * this.y; }
  length() { return Math.sqrt(this.lengthSq()); }

  normalized() {
    const len = this.length();
    if (len < 1e-9) return new Vec2(0, 0);
    return new Vec2(this.x / len, this.y / len);
  }

  normal() { // left-hand perpendicular
    return new Vec2(-this.y, this.x);
  }

  negate() { return new Vec2(-this.x, -this.y); }

  rotated(angle) {
    const c = Math.cos(angle), s = Math.sin(angle);
    return new Vec2(this.x * c - this.y * s, this.x * s + this.y * c);
  }

  distanceTo(v) { return Math.sqrt((this.x - v.x) ** 2 + (this.y - v.y) ** 2); }
  distanceToSq(v) { return (this.x - v.x) ** 2 + (this.y - v.y) ** 2; }

  angle() { return Math.atan2(this.y, this.x); }

  static fromAngle(angle, len = 1) { return new Vec2(Math.cos(angle) * len, Math.sin(angle) * len); }
  static lerp(a, b, t) { return new Vec2(a.x + (b.x - a.x) * t, a.y + (b.y - a.y) * t); }

  // Closest point on segment [a,b] to point p, returned as {point, t}
  static closestPointOnSegment(p, a, b) {
    const ab = b.sub(a);
    const lenSq = ab.lengthSq();
    let t = lenSq < 1e-9 ? 0 : (p.sub(a).dot(ab)) / lenSq;
    t = Math.max(0, Math.min(1, t));
    return { point: a.add(ab.mul(t)), t };
  }
}

function clamp(v, lo, hi) { return v < lo ? lo : (v > hi ? hi : v); }
function lerp(a, b, t) { return a + (b - a) * t; }
function degToRad(d) { return d * Math.PI / 180; }
function radToDeg(r) { return r * 180 / Math.PI; }

function randRange(lo, hi) { return lo + Math.random() * (hi - lo); }
