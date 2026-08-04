// Table hardware: every piece of physical playfield equipment. Each entity is a small
// self-contained unit implementing some of: update(dt), resolveCollision(ball, oldPos),
// tryCapture(ball, oldPos) / updateCaptured(dt), draw(ctx), drawOverlay(ctx).
// Entities know nothing about game rules -- they fire opts.onHit/onCapture/etc. callbacks
// which table.js wires up to the scoring logic in game.js.

function computeCumulativeLengths(path) {
  const lens = [0];
  let total = 0;
  for (let i = 1; i < path.length; i++) {
    total += path[i].distanceTo(path[i - 1]);
    lens.push(total);
  }
  return { lens, total };
}

function samplePathAt(path, lens, total, t) {
  const target = clamp(t, 0, 1) * total;
  for (let i = 1; i < path.length; i++) {
    if (target <= lens[i] || i === path.length - 1) {
      const segLen = lens[i] - lens[i - 1];
      const localT = segLen < 1e-6 ? 0 : (target - lens[i - 1]) / segLen;
      return Vec2.lerp(path[i - 1], path[i], clamp(localT, 0, 1));
    }
  }
  return path[path.length - 1].clone();
}

function strokeMetalPath(ctx, points, width) {
  if (points.length < 2) return;
  ctx.save();
  ctx.lineJoin = 'round';
  ctx.lineCap = 'round';
  const grad = ctx.createLinearGradient(points[0].x, points[0].y, points[points.length - 1].x, points[points.length - 1].y);
  grad.addColorStop(0, '#e8ebef');
  grad.addColorStop(0.5, '#9aa0aa');
  grad.addColorStop(1, '#c7cbd2');
  ctx.strokeStyle = grad;
  ctx.lineWidth = width;
  ctx.beginPath();
  ctx.moveTo(points[0].x, points[0].y);
  for (let i = 1; i < points.length; i++) ctx.lineTo(points[i].x, points[i].y);
  ctx.stroke();
  ctx.strokeStyle = 'rgba(255,255,255,0.55)';
  ctx.lineWidth = Math.max(1, width * 0.22);
  ctx.beginPath();
  ctx.moveTo(points[0].x, points[0].y);
  for (let i = 1; i < points.length; i++) ctx.lineTo(points[i].x, points[i].y);
  ctx.stroke();
  ctx.restore();
}

function strokeRubberPath(ctx, points, width, color, glow) {
  if (points.length < 2) return;
  ctx.save();
  ctx.lineJoin = 'round';
  ctx.lineCap = 'round';
  if (glow) {
    ctx.shadowColor = color;
    ctx.shadowBlur = 14;
  }
  ctx.strokeStyle = color;
  ctx.lineWidth = width;
  ctx.beginPath();
  ctx.moveTo(points[0].x, points[0].y);
  for (let i = 1; i < points.length; i++) ctx.lineTo(points[i].x, points[i].y);
  ctx.stroke();
  ctx.shadowBlur = 0;
  ctx.strokeStyle = 'rgba(255,255,255,0.25)';
  ctx.lineWidth = Math.max(1, width * 0.25);
  ctx.beginPath();
  ctx.moveTo(points[0].x, points[0].y - width * 0.18);
  for (let i = 1; i < points.length; i++) ctx.lineTo(points[i].x, points[i].y - width * 0.18);
  ctx.stroke();
  ctx.restore();
}

// ---------------------------------------------------------------- Wall (rails / borders)
class Wall {
  constructor(points, opts = {}) {
    this.points = points;
    this.restitution = opts.restitution ?? 0.4;
    this.thickness = opts.thickness ?? 5;
    this.visible = opts.visible !== false;
    this.rubber = opts.rubber || false;
    this.color = opts.color || (this.rubber ? '#d1461f' : '#c7cbd2');
    this.onHit = opts.onHit || null;
    this.glow = opts.glow || false;
  }

  resolveCollision(ball, oldPos) {
    let normal = null;
    for (let i = 0; i < this.points.length - 1; i++) {
      const n = resolveBallSegment(ball, oldPos, this.points[i], this.points[i + 1], this.restitution);
      if (n) normal = n;
    }
    if (normal && this.onHit) this.onHit(ball);
    return normal;
  }

  draw(ctx) {
    if (!this.visible) return;
    if (this.rubber) strokeRubberPath(ctx, this.points, this.thickness, this.color, this.glow);
    else strokeMetalPath(ctx, this.points, this.thickness);
  }
}

// ---------------------------------------------------------------- Post (small static circle)
class Post {
  constructor(x, y, radius = 6, opts = {}) {
    this.pos = new Vec2(x, y);
    this.radius = radius;
    this.restitution = opts.restitution ?? 0.7;
    this.color = opts.color || '#e0263b';
  }
  resolveCollision(ball) {
    return resolveBallCircle(ball, this.pos, this.radius, this.restitution);
  }
  draw(ctx) {
    ctx.save();
    ctx.beginPath();
    ctx.arc(this.pos.x, this.pos.y, this.radius, 0, Math.PI * 2);
    const g = ctx.createRadialGradient(this.pos.x - 2, this.pos.y - 2, 0.5, this.pos.x, this.pos.y, this.radius);
    g.addColorStop(0, '#333');
    g.addColorStop(1, '#0a0a0a');
    ctx.fillStyle = g;
    ctx.fill();
    ctx.beginPath();
    ctx.arc(this.pos.x, this.pos.y, this.radius * 0.62, 0, Math.PI * 2);
    ctx.fillStyle = this.color;
    ctx.shadowColor = this.color;
    ctx.shadowBlur = 4;
    ctx.fill();
    ctx.restore();
  }
}

// ---------------------------------------------------------------- Pop Bumper
class Bumper {
  constructor(x, y, radius = 18, opts = {}) {
    this.pos = new Vec2(x, y);
    this.radius = radius;
    this.kickSpeed = opts.kickSpeed ?? 1950;
    this.color = opts.color || '#ffb020';
    this.label = opts.label || '';
    this.onHit = opts.onHit || null;
    this.flashTimer = 0;
    this.cooldown = 0;
    this.bopAnim = 0;
  }

  update(dt) {
    this.flashTimer = Math.max(0, this.flashTimer - dt);
    this.cooldown = Math.max(0, this.cooldown - dt);
    this.bopAnim = Math.max(0, this.bopAnim - dt * 4);
  }

  resolveCollision(ball) {
    const delta = ball.pos.sub(this.pos);
    const dist = delta.length();
    const minDist = ball.radius + this.radius;
    if (dist >= minDist) return null;
    const normal = dist > 1e-6 ? delta.mul(1 / dist) : new Vec2(0, -1);
    ball.pos = this.pos.add(normal.mul(minDist + PHYS.SLOP));
    const vn = ball.vel.dot(normal);
    ball.vel = ball.vel.sub(normal.mul(vn));
    ball.vel = ball.vel.add(normal.mul(this.kickSpeed));
    this.bopAnim = 1;
    if (this.cooldown <= 0) {
      this.cooldown = 0.09;
      this.flashTimer = 0.2;
      if (this.onHit) this.onHit(ball, this);
    }
    return normal;
  }

  draw(ctx) {
    const p = this.pos;
    const r = this.radius * (1 - this.bopAnim * 0.12);
    ctx.save();
    // skirt shadow
    ctx.beginPath();
    ctx.ellipse(p.x, p.y + r * 0.35, r * 1.15, r * 0.55, 0, 0, Math.PI * 2);
    ctx.fillStyle = 'rgba(0,0,0,0.4)';
    ctx.fill();
    // base ring (metal skirt)
    ctx.beginPath();
    ctx.arc(p.x, p.y, r * 1.05, 0, Math.PI * 2);
    const skirt = ctx.createRadialGradient(p.x, p.y, r * 0.3, p.x, p.y, r * 1.15);
    skirt.addColorStop(0, '#dfe3e8');
    skirt.addColorStop(1, '#6c7078');
    ctx.fillStyle = skirt;
    ctx.fill();
    // cap
    ctx.beginPath();
    ctx.arc(p.x, p.y, r * 0.72, 0, Math.PI * 2);
    const cap = ctx.createRadialGradient(p.x - r * 0.25, p.y - r * 0.3, r * 0.1, p.x, p.y, r * 0.75);
    if (this.flashTimer > 0) {
      cap.addColorStop(0, '#ffffff');
      cap.addColorStop(0.5, this.color);
      cap.addColorStop(1, '#7a4400');
      ctx.shadowColor = this.color;
      ctx.shadowBlur = 24;
    } else {
      cap.addColorStop(0, '#fff6e0');
      cap.addColorStop(0.55, this.color);
      cap.addColorStop(1, '#7a4400');
    }
    ctx.fillStyle = cap;
    ctx.fill();
    ctx.lineWidth = 2;
    ctx.strokeStyle = 'rgba(0,0,0,0.35)';
    ctx.stroke();
    if (this.label) {
      ctx.fillStyle = 'rgba(0,0,0,0.55)';
      ctx.font = `bold ${Math.round(r * 0.62)}px Arial`;
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText(this.label, p.x, p.y + r * 0.05);
    }
    ctx.restore();
  }
}

// ---------------------------------------------------------------- Slingshot
class Slingshot {
  constructor(points, opts = {}) {
    this.points = points;
    this.kickSpeed = opts.kickSpeed ?? 2100;
    this.restitution = opts.restitution ?? 0.45;
    this.color = opts.color || '#e0263b';
    this.onHit = opts.onHit || null;
    this.cooldown = 0;
    this.flashTimer = 0;
  }

  update(dt) {
    this.cooldown = Math.max(0, this.cooldown - dt);
    this.flashTimer = Math.max(0, this.flashTimer - dt);
  }

  resolveCollision(ball, oldPos) {
    let hit = null;
    for (let i = 0; i < this.points.length - 1; i++) {
      const a = this.points[i], b = this.points[i + 1];
      const n = resolveBallSegment(ball, oldPos, a, b, this.restitution);
      if (n) {
        hit = n;
        if (this.cooldown <= 0) {
          const segDir = b.sub(a).normalized();
          ball.vel = n.mul(this.kickSpeed).add(segDir.mul(ball.vel.dot(segDir) * 0.25));
          this.cooldown = 0.22;
          this.flashTimer = 0.16;
          if (this.onHit) this.onHit(ball, this);
        }
      }
    }
    return hit;
  }

  draw(ctx) {
    strokeRubberPath(ctx, this.points, 9, this.flashTimer > 0 ? '#fff2b0' : this.color, this.flashTimer > 0);
  }
}

// ---------------------------------------------------------------- Flipper
class Flipper {
  constructor(pivotX, pivotY, length, restAngle, activeAngle, opts = {}) {
    this.pivot = new Vec2(pivotX, pivotY);
    this.length = length;
    this.restAngle = restAngle;
    this.activeAngle = activeAngle;
    this.angle = restAngle;
    this.angularVelocity = 0;
    this.pressed = false;
    this.maxOmegaUp = opts.maxOmegaUp ?? degToRad(1450);
    this.maxOmegaDown = opts.maxOmegaDown ?? degToRad(950);
    this.capsuleRadius = opts.width ?? 8.5;
    this.baseRestitution = opts.restitution ?? 0.35;
    this.side = opts.side || 'left';
    this.color = opts.color || '#ffcf3d';
  }

  get tip() { return this.pivot.add(Vec2.fromAngle(this.angle, this.length)); }

  setPressed(p) { this.pressed = p; }

  update(dt) {
    const target = this.pressed ? this.activeAngle : this.restAngle;
    const goingUp = this.pressed;
    const maxOmega = goingUp ? this.maxOmegaUp : this.maxOmegaDown;
    const diff = target - this.angle;
    const maxStep = maxOmega * dt;
    let newAngle;
    if (Math.abs(diff) <= maxStep) newAngle = target;
    else newAngle = this.angle + Math.sign(diff) * maxStep;
    this.angularVelocity = dt > 0 ? (newAngle - this.angle) / dt : 0;
    this.angle = newAngle;
  }

  resolveCollision(ball, oldPos) {
    const tip = this.tip;
    const speedFactor = clamp(Math.abs(this.angularVelocity) / this.maxOmegaUp, 0, 1);
    const restitution = this.baseRestitution + speedFactor * 0.85;
    return resolveBallCapsuleMoving(ball, oldPos, this.pivot, tip, this.capsuleRadius, this.angularVelocity, restitution);
  }

  draw(ctx) {
    const tip = this.tip;
    ctx.save();
    ctx.beginPath();
    ctx.ellipse((this.pivot.x + tip.x) / 2 + 3, (this.pivot.y + tip.y) / 2 + 4, this.length * 0.55, this.capsuleRadius + 3, this.angle, 0, Math.PI * 2);
    ctx.fillStyle = 'rgba(0,0,0,0.35)';
    ctx.fill();

    const dir = tip.sub(this.pivot).normalized();
    const perp = dir.normal();
    const r = this.capsuleRadius;
    const p1 = this.pivot.add(perp.mul(r));
    const p2 = tip.add(perp.mul(r));
    const p3 = tip.sub(perp.mul(r));
    const p4 = this.pivot.sub(perp.mul(r));

    ctx.beginPath();
    ctx.arc(this.pivot.x, this.pivot.y, r, 0, Math.PI * 2);
    ctx.moveTo(p1.x, p1.y);
    ctx.lineTo(p2.x, p2.y);
    ctx.arc(tip.x, tip.y, r, dir.angle() - Math.PI / 2, dir.angle() + Math.PI / 2);
    ctx.lineTo(p4.x, p4.y);
    ctx.closePath();

    const grad = ctx.createLinearGradient(p1.x, p1.y, p4.x, p4.y);
    grad.addColorStop(0, '#fff8de');
    grad.addColorStop(0.45, this.color);
    grad.addColorStop(1, '#9c6d00');
    ctx.fillStyle = grad;
    ctx.fill();
    ctx.lineWidth = 1.5;
    ctx.strokeStyle = 'rgba(0,0,0,0.5)';
    ctx.stroke();

    ctx.beginPath();
    ctx.arc(this.pivot.x, this.pivot.y, r * 0.42, 0, Math.PI * 2);
    ctx.fillStyle = '#2a2a2a';
    ctx.fill();
    ctx.restore();
  }
}

// ---------------------------------------------------------------- Standup target
class StandupTarget {
  constructor(a, b, opts = {}) {
    this.a = a; this.b = b;
    this.restitution = opts.restitution ?? 0.55;
    this.onHit = opts.onHit || null;
    this.cooldown = 0;
    this.flashTimer = 0;
    this.label = opts.label || '';
    this.lit = opts.lit ?? false;
    this.color = opts.color || '#39d0ff';
  }
  update(dt) { this.cooldown = Math.max(0, this.cooldown - dt); this.flashTimer = Math.max(0, this.flashTimer - dt); }
  resolveCollision(ball, oldPos) {
    const normal = resolveBallSegment(ball, oldPos, this.a, this.b, this.restitution);
    if (normal && this.cooldown <= 0) {
      this.cooldown = 0.18;
      this.flashTimer = 0.3;
      if (this.onHit) this.onHit(this);
    }
    return normal;
  }
  draw(ctx) {
    const mid = Vec2.lerp(this.a, this.b, 0.5);
    const dir = this.b.sub(this.a).normalized();
    const normal = dir.normal();
    const depth = 7;
    const back = mid.sub(normal.mul(depth));
    ctx.save();
    ctx.beginPath();
    ctx.moveTo(this.a.x, this.a.y);
    ctx.lineTo(this.b.x, this.b.y);
    ctx.lineTo(this.b.x - normal.x * depth, this.b.y - normal.y * depth);
    ctx.lineTo(this.a.x - normal.x * depth, this.a.y - normal.y * depth);
    ctx.closePath();
    const lit = this.lit || this.flashTimer > 0;
    const grad = ctx.createLinearGradient(this.a.x, this.a.y, this.b.x, this.b.y);
    if (lit) {
      grad.addColorStop(0, '#ffffff');
      grad.addColorStop(1, this.color);
      ctx.shadowColor = this.color;
      ctx.shadowBlur = 16;
    } else {
      grad.addColorStop(0, '#555c66');
      grad.addColorStop(1, '#20242b');
    }
    ctx.fillStyle = grad;
    ctx.fill();
    ctx.lineWidth = 1;
    ctx.strokeStyle = '#000';
    ctx.stroke();
    if (this.label) {
      ctx.shadowBlur = 0;
      ctx.fillStyle = lit ? '#1a1a1a' : '#ccc';
      ctx.font = `bold ${depth * 1.6}px Arial`;
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      const textPos = mid.sub(normal.mul(depth * 0.5));
      ctx.fillText(this.label, textPos.x, textPos.y);
    }
    ctx.restore();
  }
}

// ---------------------------------------------------------------- Drop target (+ bank)
class DropTarget {
  constructor(a, b, opts = {}) {
    this.a = a; this.b = b;
    this.isDown = false;
    this.dropAnim = 0;
    this.restitution = opts.restitution ?? 0.28;
    this.onHit = opts.onHit || null;
    this.cooldown = 0;
    this.label = opts.label || '';
    this.color = opts.color || '#ff5d3b';
  }
  update(dt) {
    this.cooldown = Math.max(0, this.cooldown - dt);
    const target = this.isDown ? 1 : 0;
    const rate = 7.5;
    if (this.dropAnim < target) this.dropAnim = Math.min(target, this.dropAnim + rate * dt);
    else if (this.dropAnim > target) this.dropAnim = Math.max(target, this.dropAnim - rate * dt);
  }
  resolveCollision(ball, oldPos) {
    if (this.isDown) return null;
    const normal = resolveBallSegment(ball, oldPos, this.a, this.b, this.restitution);
    if (normal && this.cooldown <= 0) {
      this.cooldown = 0.25;
      this.isDown = true;
      if (this.onHit) this.onHit(this);
    }
    return normal;
  }
  raise() { this.isDown = false; }
  draw(ctx) {
    if (this.dropAnim >= 0.98) return;
    const sink = this.dropAnim;
    const mid = Vec2.lerp(this.a, this.b, 0.5);
    const dir = this.b.sub(this.a).normalized();
    const normal = dir.normal();
    const depth = 6;
    const h = 16 * (1 - sink);
    ctx.save();
    ctx.globalAlpha = 1 - sink * 0.85;
    const a2 = this.a.add(normal.mul(h * 0));
    ctx.beginPath();
    ctx.moveTo(this.a.x, this.a.y);
    ctx.lineTo(this.b.x, this.b.y);
    ctx.lineTo(this.b.x - normal.x * depth, this.b.y - normal.y * depth);
    ctx.lineTo(this.a.x - normal.x * depth, this.a.y - normal.y * depth);
    ctx.closePath();
    const grad = ctx.createLinearGradient(this.a.x, this.a.y, this.b.x, this.b.y);
    grad.addColorStop(0, '#fff2c4');
    grad.addColorStop(0.5, this.color);
    grad.addColorStop(1, '#7a1500');
    ctx.fillStyle = grad;
    ctx.fill();
    ctx.lineWidth = 1;
    ctx.strokeStyle = '#000';
    ctx.stroke();
    if (this.label) {
      ctx.fillStyle = '#1a1a1a';
      ctx.font = `bold 11px Arial`;
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      const tp = mid.sub(normal.mul(depth * 0.5));
      ctx.fillText(this.label, tp.x, tp.y);
    }
    ctx.restore();
  }
}

class DropTargetBank {
  constructor(segments, opts = {}) {
    this.onTargetHit = opts.onTargetHit || null;
    this.onBankComplete = opts.onBankComplete || null;
    this.autoResetDelay = opts.autoResetDelay ?? 1.1;
    this._completeTimer = null;
    this.targets = segments.map((seg, i) => new DropTarget(seg[0], seg[1], {
      label: (opts.labels && opts.labels[i]) || '',
      color: opts.color,
      onHit: () => {
        if (this.onTargetHit) this.onTargetHit(i);
        this.checkComplete();
      },
    }));
  }
  allDown() { return this.targets.every(t => t.isDown); }
  checkComplete() {
    if (this.allDown() && this._completeTimer === null) {
      this._completeTimer = this.autoResetDelay;
      if (this.onBankComplete) this.onBankComplete(this);
    }
  }
  update(dt) {
    for (const t of this.targets) t.update(dt);
    if (this._completeTimer !== null) {
      this._completeTimer -= dt;
      if (this._completeTimer <= 0) { this.reset(); this._completeTimer = null; }
    }
  }
  reset() { for (const t of this.targets) t.raise(); }
  resolveCollision(ball, oldPos) {
    let hit = null;
    for (const t of this.targets) {
      const n = t.resolveCollision(ball, oldPos);
      if (n) hit = n;
    }
    return hit;
  }
  draw(ctx) { for (const t of this.targets) t.draw(ctx); }
}

// ---------------------------------------------------------------- Spinner
class Spinner {
  constructor(x, y, length, angleRad, opts = {}) {
    this.center = new Vec2(x, y);
    this.length = length;
    this.angle = angleRad;
    this.spin = 0;
    this.spinVel = 0;
    this.onSpin = opts.onSpin || null;
    this.scoreEvery = opts.scoreEvery ?? Math.PI * 0.9;
    this._acc = 0;
    this.color = opts.color || '#ffdf6b';
  }
  resolveCollision(ball, oldPos) {
    if (this._cooldown > 0) return null;
    const half = this.length / 2;
    const dir = Vec2.fromAngle(this.angle);
    const a = this.center.sub(dir.mul(half));
    const b = this.center.add(dir.mul(half));
    const hit = closestPtSegmentSegment(oldPos, ball.pos, a, b);
    if (hit.dist >= ball.radius * 0.55) return null;
    const kick = Math.max(400, ball.vel.length());
    this.spinVel += kick * 0.028 * Math.sign(ball.vel.dot(dir.normal()) || 1);
    this._cooldown = 0.08;
    return null;
  }
  update(dt) {
    this._cooldown = Math.max(0, (this._cooldown || 0) - dt);
    this.spin += this.spinVel * dt;
    if (Math.abs(this.spinVel) > 0.02) {
      this._scoreAcc = (this._scoreAcc || 0) + Math.abs(this.spinVel) * dt;
      if (this._scoreAcc > this.scoreEvery) {
        this._scoreAcc = 0;
        if (this.onSpin) this.onSpin();
      }
    }
    this.spinVel *= Math.max(0, 1 - 2.2 * dt);
  }
  draw(ctx) {
    const dir = Vec2.fromAngle(this.angle);
    const half = this.length / 2;
    const a = this.center.sub(dir.mul(half));
    const b = this.center.add(dir.mul(half));
    ctx.save();
    ctx.strokeStyle = '#555';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(a.x, a.y); ctx.lineTo(b.x, b.y);
    ctx.stroke();
    // blade -- foreshortened by cos(spin) to fake rotation about the vertical axis
    const w = Math.cos(this.spin) * half;
    const bx = this.center.x + dir.x * 0 - dir.y * 0;
    ctx.beginPath();
    ctx.moveTo(this.center.x - dir.x * w, this.center.y - dir.y * w);
    ctx.lineTo(this.center.x + dir.x * w, this.center.y + dir.y * w);
    ctx.lineWidth = 6;
    ctx.strokeStyle = this.color;
    ctx.shadowColor = this.color;
    ctx.shadowBlur = Math.abs(this.spinVel) > 1 ? 10 : 0;
    ctx.stroke();
    ctx.restore();
  }
}

// ---------------------------------------------------------------- Rollover lane (sensor only)
class RolloverLane {
  constructor(a, b, opts = {}) {
    this.a = a; this.b = b;
    this.onPass = opts.onPass || null;
    this.cooldown = 0;
    this.lit = opts.lit ?? true;
    this.flashTimer = 0;
    this.color = opts.color || '#39ff6a';
  }
  update(dt) { this.cooldown = Math.max(0, this.cooldown - dt); this.flashTimer = Math.max(0, this.flashTimer - dt); }
  resolveCollision(ball, oldPos) {
    if (this.cooldown > 0) return null;
    const hit = closestPtSegmentSegment(oldPos, ball.pos, this.a, this.b);
    if (hit.dist > ball.radius * 0.8) return null;
    this.cooldown = 0.5;
    this.flashTimer = 0.35;
    if (this.onPass) this.onPass(this);
    return null;
  }
  draw(ctx) {
    ctx.save();
    ctx.beginPath();
    ctx.moveTo(this.a.x, this.a.y);
    ctx.lineTo(this.b.x, this.b.y);
    ctx.lineWidth = 3;
    if (this.lit) {
      ctx.strokeStyle = this.flashTimer > 0 ? '#ffffff' : this.color;
      ctx.shadowColor = this.color;
      ctx.shadowBlur = this.flashTimer > 0 ? 14 : 6;
    } else {
      ctx.strokeStyle = '#3a3f47';
    }
    ctx.stroke();
    ctx.restore();
  }
}

// ---------------------------------------------------------------- Kickback
class Kickback {
  constructor(x, y, radius, kickDir, opts = {}) {
    this.pos = new Vec2(x, y);
    this.radius = radius;
    this.kickDir = kickDir.normalized();
    this.kickSpeed = opts.kickSpeed ?? 2500;
    this.active = false;
    this.onFire = opts.onFire || null;
    this.cooldown = 0;
  }
  update(dt) { this.cooldown = Math.max(0, this.cooldown - dt); }
  resolveCollision(ball) {
    if (!this.active || this.cooldown > 0) return null;
    const d = ball.pos.distanceTo(this.pos);
    if (d > this.radius) return null;
    ball.vel = this.kickDir.mul(this.kickSpeed);
    this.cooldown = 1.2;
    this.active = false;
    if (this.onFire) this.onFire();
    return this.kickDir;
  }
  draw(ctx) {
    if (!this.active) return;
    ctx.save();
    ctx.beginPath();
    ctx.arc(this.pos.x, this.pos.y, this.radius * 0.5, 0, Math.PI * 2);
    ctx.strokeStyle = '#5cf16a';
    ctx.shadowColor = '#5cf16a';
    ctx.shadowBlur = 10;
    ctx.lineWidth = 2;
    ctx.stroke();
    ctx.restore();
  }
}

// ---------------------------------------------------------------- Scoop / lock hole
class Scoop {
  constructor(x, y, opts = {}) {
    this.pos = new Vec2(x, y);
    this.captureRadius = opts.captureRadius ?? 15;
    this.holdTime = opts.holdTime ?? 0.85;
    this.kickDir = (opts.kickDir || new Vec2(0, -1)).normalized();
    this.kickSpeed = opts.kickSpeed ?? 1500;
    this.name = opts.name || 'scoop';
    this._held = [];
    this.onCapture = opts.onCapture || null;
    this.locked = [];
    this.flashTimer = 0;
    this.color = opts.color || '#8a5cff';
    this.lit = false;
    this._pulse = 0;
  }

  tryCapture(ball, oldPos) {
    if (ball.captured) return false;
    const hit = closestPtSegmentSegment(oldPos, ball.pos, this.pos, this.pos);
    if (hit.dist > this.captureRadius) return false;
    ball.captured = this;
    ball.vel.set(0, 0);
    ball.pos = this.pos.clone();
    this.flashTimer = 0.4;
    const decision = this.onCapture ? this.onCapture(this.name, ball) : 'kick';
    if (decision === 'lock') {
      this.locked.push(ball);
      const n = this.locked.length;
      ball.pos = this.pos.add(new Vec2(-8 + n * 5, -3 - n * 3));
    } else {
      this._held.push({ ball, t: 0 });
    }
    return true;
  }

  releaseAllLocked() {
    const balls = this.locked.slice();
    this.locked = [];
    balls.forEach((ball, i) => {
      ball.captured = null;
      const spread = (i - (balls.length - 1) / 2) * 0.28;
      const dir = this.kickDir.rotated(spread);
      ball.vel = dir.mul(this.kickSpeed * 1.05);
      ball.pos = this.pos.add(dir.mul(this.captureRadius + ball.radius + 2));
    });
    return balls;
  }

  updateCaptured(dt) {
    for (let i = this._held.length - 1; i >= 0; i--) {
      const h = this._held[i];
      h.t += dt;
      if (h.t >= this.holdTime) {
        h.ball.captured = null;
        h.ball.vel = this.kickDir.mul(this.kickSpeed);
        h.ball.pos = this.pos.add(this.kickDir.mul(this.captureRadius + h.ball.radius + 2));
        this._held.splice(i, 1);
      }
    }
  }

  update(dt) {
    this.flashTimer = Math.max(0, this.flashTimer - dt);
    this._pulse += dt * (this.lit ? 5 : 1.2);
  }

  draw(ctx) {
    const p = this.pos;
    const pulse = (Math.sin(this._pulse) + 1) / 2;
    ctx.save();
    if (this.lit) {
      ctx.beginPath();
      ctx.arc(p.x, p.y, this.captureRadius + 10 + pulse * 4, 0, Math.PI * 2);
      ctx.strokeStyle = this.color;
      ctx.globalAlpha = 0.45 + pulse * 0.35;
      ctx.lineWidth = 3;
      ctx.shadowColor = this.color;
      ctx.shadowBlur = 14;
      ctx.stroke();
      ctx.globalAlpha = 1;
    }
    ctx.beginPath();
    ctx.arc(p.x, p.y, this.captureRadius + 4, 0, Math.PI * 2);
    ctx.fillStyle = '#000';
    ctx.fill();
    ctx.beginPath();
    ctx.arc(p.x, p.y, this.captureRadius, 0, Math.PI * 2);
    const g = ctx.createRadialGradient(p.x, p.y, 0, p.x, p.y, this.captureRadius);
    g.addColorStop(0, this.flashTimer > 0 ? '#fff' : (this.lit ? '#3a1f5e' : '#1c0f2e'));
    g.addColorStop(1, '#000');
    ctx.fillStyle = g;
    ctx.fill();
    ctx.lineWidth = 2.5;
    ctx.strokeStyle = this.color;
    ctx.shadowColor = this.color;
    ctx.shadowBlur = this.locked.length > 0 ? 16 : (this.lit ? 10 + pulse * 8 : 6);
    ctx.stroke();
    for (let i = 0; i < this.locked.length; i++) {
      ctx.beginPath();
      ctx.arc(p.x - 8 + i * 5, p.y - 3 - i * 3, PHYS.BALL_RADIUS * 0.55, 0, Math.PI * 2);
      ctx.fillStyle = '#dfe3e8';
      ctx.shadowBlur = 0;
      ctx.fill();
    }
    ctx.restore();
  }
}

// ---------------------------------------------------------------- Ramp / loop (capture + scripted path)
class RampZone {
  constructor(opts) {
    this.entryA = opts.entryA;
    this.entryB = opts.entryB;
    this.minSpeed = opts.minSpeed ?? 850;
    this.requiredDir = opts.requiredDir ? opts.requiredDir.normalized() : null;
    this.dirTolerance = opts.dirTolerance ?? 0.35;
    this.path = opts.path;
    const cum = computeCumulativeLengths(this.path);
    this.pathLens = cum.lens;
    this.pathTotal = cum.total;
    this.travelTime = opts.travelTime ?? 0.62;
    this.exitSpeedMul = opts.exitSpeedMul ?? 0.9;
    this.minExitSpeed = opts.minExitSpeed ?? 650;
    this.onEnter = opts.onEnter || null;
    this.onExit = opts.onExit || null;
    this.name = opts.name || '';
    this._captured = [];
    this.flashTimer = 0;
    this.hasFlyover = opts.hasFlyover || false;
    this.flyoverRange = opts.flyoverRange || [0.15, 0.75];
    this.color = opts.color || '#39d0ff';
    this.width = opts.width ?? 30;
  }

  tryCapture(ball, oldPos) {
    if (ball.captured) return false;
    const hit = closestPtSegmentSegment(oldPos, ball.pos, this.entryA, this.entryB);
    if (hit.dist > ball.radius * 0.95) return false;
    if (this.requiredDir) {
      const dir = ball.vel.normalized();
      if (dir.dot(this.requiredDir) < this.dirTolerance) return false;
    }
    if (ball.vel.length() < this.minSpeed) return false;

    const entrySpeed = ball.vel.length();
    ball.captured = this;
    ball.vel.set(0, 0);
    this._captured.push({ ball, t: 0, speed: entrySpeed });
    this.flashTimer = 0.5;
    if (this.onEnter) this.onEnter(this.name, ball);
    return true;
  }

  updateCaptured(dt) {
    for (let i = this._captured.length - 1; i >= 0; i--) {
      const c = this._captured[i];
      c.t += dt / this.travelTime;
      if (c.t >= 1) {
        const p1 = this.path[this.path.length - 2];
        const p2 = this.path[this.path.length - 1];
        const exitDir = p2.sub(p1).normalized();
        c.ball.pos = p2.clone();
        c.ball.vel = exitDir.mul(Math.max(this.minExitSpeed, c.speed * this.exitSpeedMul));
        c.ball.captured = null;
        this._captured.splice(i, 1);
        if (this.onExit) this.onExit(this.name, c.ball);
      } else {
        c.ball.pos = samplePathAt(this.path, this.pathLens, this.pathTotal, c.t);
      }
    }
  }

  update(dt) { this.flashTimer = Math.max(0, this.flashTimer - dt); }

  draw(ctx) {
    ctx.save();
    ctx.beginPath();
    ctx.moveTo(this.path[0].x, this.path[0].y);
    for (let i = 1; i < this.path.length; i++) ctx.lineTo(this.path[i].x, this.path[i].y);
    ctx.lineWidth = this.width;
    ctx.strokeStyle = 'rgba(20,24,32,0.55)';
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';
    ctx.stroke();
    ctx.lineWidth = 3;
    ctx.strokeStyle = this.flashTimer > 0 ? '#ffffff' : this.color;
    ctx.shadowColor = this.color;
    ctx.shadowBlur = this.flashTimer > 0 ? 12 : 4;
    ctx.setLineDash([2, 10]);
    ctx.stroke();
    ctx.setLineDash([]);
    ctx.restore();
  }

  drawOverlay(ctx) {
    if (!this.hasFlyover) return;
    const [t0, t1] = this.flyoverRange;
    const p0 = samplePathAt(this.path, this.pathLens, this.pathTotal, t0);
    const p1 = samplePathAt(this.path, this.pathLens, this.pathTotal, t1);
    ctx.save();
    ctx.globalAlpha = 0.32;
    ctx.beginPath();
    ctx.moveTo(p0.x, p0.y);
    for (let t = t0; t <= t1; t += 0.02) {
      const p = samplePathAt(this.path, this.pathLens, this.pathTotal, t);
      ctx.lineTo(p.x, p.y);
    }
    ctx.lineTo(p1.x, p1.y);
    ctx.lineWidth = this.width + 10;
    ctx.strokeStyle = '#cfe9ff';
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';
    ctx.stroke();
    ctx.globalAlpha = 0.5;
    ctx.lineWidth = 2;
    ctx.strokeStyle = '#ffffff';
    ctx.stroke();
    ctx.restore();
  }
}

function quadBezier(p0, p1, p2, t) {
  const mt = 1 - t;
  return new Vec2(mt * mt * p0.x + 2 * mt * t * p1.x + t * t * p2.x, mt * mt * p0.y + 2 * mt * t * p1.y + t * t * p2.y);
}

// ---------------------------------------------------------------- Plunger-to-lanes guide
// A physical diagonal deflector is too sensitive to exact contact angle to reliably route
// a plunged ball into the top lanes, so this uses the same capture-and-follow-path
// technique as ramps: catch the ball partway up the shooter lane, then sweep it along a
// curve into the lane group. WHERE it releases still depends on how hard the ball was
// launched, so plunge power keeps its meaning (a light plunge lands short/right, a hard
// plunge carries all the way to the far-left lane).
class PlungerGuide {
  constructor(opts) {
    this.entryA = opts.entryA;
    this.entryB = opts.entryB;
    this.minSpeed = opts.minSpeed ?? 400;
    this.travelTime = opts.travelTime ?? 0.3;
    this.releaseY = opts.releaseY ?? 68;
    this.xRange = opts.xRange || [200, 320];
    this.speedRange = opts.speedRange || [300, 2100];
    this.midPoint = opts.midPoint || new Vec2(430, 190);
    this._captured = [];
  }

  tryCapture(ball, oldPos) {
    if (ball.captured) return false;
    if (ball.vel.y >= 0) return false;
    const hit = closestPtSegmentSegment(oldPos, ball.pos, this.entryA, this.entryB);
    if (hit.dist > ball.radius) return false;
    const speed = ball.vel.length();
    if (speed < this.minSpeed) return false;

    const t = clamp((speed - this.speedRange[0]) / (this.speedRange[1] - this.speedRange[0]), 0, 1);
    const releaseX = lerp(this.xRange[1], this.xRange[0], t); // faster plunge carries further (smaller x)
    const start = ball.pos.clone();
    ball.captured = this;
    ball.vel.set(0, 0);
    this._captured.push({ ball, t: 0, start, end: new Vec2(releaseX, this.releaseY) });
    return true;
  }

  updateCaptured(dt) {
    for (let i = this._captured.length - 1; i >= 0; i--) {
      const c = this._captured[i];
      c.t += dt / this.travelTime;
      if (c.t >= 1) {
        c.ball.pos.set(c.end.x, c.end.y);
        c.ball.vel = new Vec2(randRange(-40, 40), 480);
        c.ball.captured = null;
        this._captured.splice(i, 1);
      } else {
        const p = quadBezier(c.start, this.midPoint, c.end, c.t);
        c.ball.pos.set(p.x, p.y);
      }
    }
  }

  update(dt) {}
  draw(ctx) {}
}
