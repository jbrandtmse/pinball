// Cosmetic-only: sparks, floating score popups, and light-burst rings. None of this
// affects simulation state, so it's updated/drawn once per rendered frame (not per
// physics substep).
class Particle {
  constructor(x, y, vx, vy, life, opts = {}) {
    this.pos = new Vec2(x, y);
    this.vel = new Vec2(vx, vy);
    this.life = life;
    this.maxLife = life;
    this.color = opts.color || '#ffd23d';
    this.size = opts.size ?? 3;
    this.gravity = opts.gravity ?? 900;
    this.friction = opts.friction ?? 0.9;
  }
  update(dt) {
    this.vel.y += this.gravity * dt;
    const f = Math.pow(this.friction, dt * 60);
    this.vel.mulInPlace(f);
    this.pos.addInPlace(this.vel.mul(dt));
    this.life -= dt;
  }
  get alpha() { return Math.max(0, this.life / this.maxLife); }
  draw(ctx) {
    const a = this.alpha;
    if (a <= 0) return;
    ctx.save();
    ctx.globalAlpha = a;
    ctx.beginPath();
    ctx.arc(this.pos.x, this.pos.y, Math.max(0.4, this.size * a + 0.5), 0, Math.PI * 2);
    ctx.fillStyle = this.color;
    ctx.shadowColor = this.color;
    ctx.shadowBlur = 6;
    ctx.fill();
    ctx.restore();
  }
}

class FloatingText {
  constructor(x, y, text, opts = {}) {
    this.pos = new Vec2(x, y);
    this.text = text;
    this.life = opts.life ?? 0.9;
    this.maxLife = this.life;
    this.color = opts.color || '#ffffff';
    this.vy = opts.vy ?? -48;
    this.size = opts.size ?? 14;
  }
  update(dt) { this.pos.y += this.vy * dt; this.vy *= (1 - Math.min(1, 1.5 * dt)); this.life -= dt; }
  get alpha() { return clamp(this.life / this.maxLife * 2.2, 0, 1); }
  draw(ctx) {
    const a = this.alpha;
    if (a <= 0) return;
    ctx.save();
    ctx.globalAlpha = a;
    ctx.font = `bold ${this.size}px 'Arial Black', Arial, sans-serif`;
    ctx.textAlign = 'center';
    ctx.lineWidth = 3;
    ctx.strokeStyle = 'rgba(0,0,0,0.85)';
    ctx.strokeText(this.text, this.pos.x, this.pos.y);
    ctx.fillStyle = this.color;
    ctx.fillText(this.text, this.pos.x, this.pos.y);
    ctx.restore();
  }
}

class RingBurst {
  constructor(x, y, opts = {}) {
    this.pos = new Vec2(x, y);
    this.life = opts.life ?? 0.5;
    this.maxLife = this.life;
    this.maxRadius = opts.maxRadius ?? 60;
    this.color = opts.color || '#ffd23d';
    this.width = opts.width ?? 4;
  }
  update(dt) { this.life -= dt; }
  get alpha() { return Math.max(0, this.life / this.maxLife); }
  draw(ctx) {
    const t = 1 - this.alpha;
    ctx.save();
    ctx.globalAlpha = this.alpha * 0.85;
    ctx.beginPath();
    ctx.arc(this.pos.x, this.pos.y, this.maxRadius * t, 0, Math.PI * 2);
    ctx.lineWidth = this.width * (1 - t * 0.6);
    ctx.strokeStyle = this.color;
    ctx.shadowColor = this.color;
    ctx.shadowBlur = 10;
    ctx.stroke();
    ctx.restore();
  }
}

class ParticleSystem {
  constructor() {
    this.particles = [];
    this.texts = [];
    this.rings = [];
  }

  spark(x, y, opts = {}) {
    const n = opts.count ?? 10;
    for (let i = 0; i < n; i++) {
      const angle = randRange(0, Math.PI * 2);
      const speed = randRange(opts.minSpeed ?? 180, opts.maxSpeed ?? 620);
      this.particles.push(new Particle(x, y, Math.cos(angle) * speed, Math.sin(angle) * speed,
        randRange(0.22, 0.5), { color: opts.color || '#ffd23d', size: randRange(1.4, 3.0), gravity: opts.gravity ?? 850 }));
    }
    if (this.particles.length > 500) this.particles.splice(0, this.particles.length - 500);
  }

  floatText(x, y, text, opts = {}) { this.texts.push(new FloatingText(x, y, text, opts)); }
  ring(x, y, opts = {}) { this.rings.push(new RingBurst(x, y, opts)); }

  update(dt) {
    for (let i = this.particles.length - 1; i >= 0; i--) {
      this.particles[i].update(dt);
      if (this.particles[i].life <= 0) this.particles.splice(i, 1);
    }
    for (let i = this.texts.length - 1; i >= 0; i--) {
      this.texts[i].update(dt);
      if (this.texts[i].life <= 0) this.texts.splice(i, 1);
    }
    for (let i = this.rings.length - 1; i >= 0; i--) {
      this.rings[i].update(dt);
      if (this.rings[i].life <= 0) this.rings.splice(i, 1);
    }
  }

  draw(ctx) {
    for (const p of this.particles) p.draw(ctx);
    for (const r of this.rings) r.draw(ctx);
    for (const t of this.texts) t.draw(ctx);
  }
}
