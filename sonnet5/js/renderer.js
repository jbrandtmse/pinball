// Composites the whole playfield each frame: cached procedural background art, table
// hardware (each entity draws itself), balls, ramp flyover overlays, particles, plunger
// rod, and a couple of cheap full-screen effects (vignette, flash, nudge shake).
const Renderer = {
  _bgCanvas: null,

  buildBackground(world) {
    const c = document.createElement('canvas');
    c.width = TABLE.WIDTH;
    c.height = TABLE.HEIGHT;
    const ctx = c.getContext('2d');
    const W = TABLE.WIDTH, H = TABLE.HEIGHT;

    // base wash
    let g = ctx.createLinearGradient(0, 0, 0, H);
    g.addColorStop(0, '#0c2430');
    g.addColorStop(0.45, '#0a2c38');
    g.addColorStop(1, '#081a22');
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, W, H);

    // vignette glow behind bumper cluster
    this._glow(ctx, 254, 230, 220, 'rgba(255,170,40,0.16)');
    this._glow(ctx, 254, 470, 160, 'rgba(138,92,255,0.18)');
    this._glow(ctx, 254, 950, 260, 'rgba(255,205,60,0.10)');

    // kraken tentacles emanating from behind the maw
    ctx.save();
    ctx.translate(254, 470);
    const tentColors = ['rgba(60,20,90,0.55)', 'rgba(40,15,70,0.5)'];
    for (let i = 0; i < 6; i++) {
      const baseAngle = (Math.PI * 2 * i) / 6 + 0.3;
      ctx.save();
      ctx.rotate(baseAngle);
      ctx.beginPath();
      ctx.moveTo(0, 0);
      const len = randSeed(i) * 90 + 170;
      ctx.bezierCurveTo(20, len * 0.35, -18, len * 0.7, 8, len);
      ctx.lineWidth = 26;
      ctx.lineCap = 'round';
      ctx.strokeStyle = tentColors[i % 2];
      ctx.stroke();
      // suckers
      for (let s = 0.25; s < 0.95; s += 0.18) {
        ctx.beginPath();
        ctx.arc(4 * Math.sin(s * 8), len * s, 5, 0, Math.PI * 2);
        ctx.fillStyle = 'rgba(0,0,0,0.25)';
        ctx.fill();
      }
      ctx.restore();
    }
    ctx.restore();

    // compass / ship-wheel emblem low on the apron area between flippers
    this._shipWheel(ctx, 254, 870, 78);

    // gentle waves near the bottom
    ctx.save();
    ctx.globalAlpha = 0.14;
    ctx.strokeStyle = '#7fd9e8';
    ctx.lineWidth = 2;
    for (let w = 0; w < 3; w++) {
      ctx.beginPath();
      for (let x = 0; x <= W; x += 12) {
        const y = 1000 + w * 16 + Math.sin(x * 0.04 + w) * 6;
        if (x === 0) ctx.moveTo(x, y); else ctx.lineTo(x, y);
      }
      ctx.stroke();
    }
    ctx.restore();

    // scattered gold sparkle accents
    ctx.save();
    for (let i = 0; i < 26; i++) {
      const x = randSeed(i * 3.1) * W;
      const y = 120 + randSeed(i * 7.7) * 780;
      const s = 1.4 + randSeed(i * 5.3) * 2.2;
      ctx.globalAlpha = 0.25 + randSeed(i * 9.1) * 0.35;
      ctx.fillStyle = '#f4c430';
      this._sparkle(ctx, x, y, s);
    }
    ctx.restore();

    // painted title near the apron
    ctx.save();
    ctx.textAlign = 'center';
    ctx.font = "bold 30px 'Arial Black', Arial, sans-serif";
    ctx.fillStyle = 'rgba(244,196,48,0.16)';
    ctx.fillText("KRAKEN'S GOLD", W / 2, 1005);
    ctx.restore();

    // lane guide printed arrows toward each ramp entrance
    this._paintArrow(ctx, 150, 800, degToRad(-95), '#39d0ff');
    this._paintArrow(ctx, 358, 800, degToRad(-85), '#ffd23d');

    // outer dark border shading (playfield recedes into shadow at the rails)
    const edge = ctx.createRadialGradient(W / 2, H * 0.45, H * 0.25, W / 2, H * 0.45, H * 0.62);
    edge.addColorStop(0, 'rgba(0,0,0,0)');
    edge.addColorStop(1, 'rgba(0,0,0,0.55)');
    ctx.fillStyle = edge;
    ctx.fillRect(0, 0, W, H);

    this._bgCanvas = c;
    return c;
  },

  _glow(ctx, x, y, r, color) {
    const g = ctx.createRadialGradient(x, y, 0, x, y, r);
    g.addColorStop(0, color);
    g.addColorStop(1, 'rgba(0,0,0,0)');
    ctx.fillStyle = g;
    ctx.fillRect(x - r, y - r, r * 2, r * 2);
  },

  _sparkle(ctx, x, y, s) {
    ctx.save();
    ctx.translate(x, y);
    ctx.beginPath();
    ctx.moveTo(0, -s * 3); ctx.lineTo(s * 0.7, -s * 0.7); ctx.lineTo(s * 3, 0);
    ctx.lineTo(s * 0.7, s * 0.7); ctx.lineTo(0, s * 3); ctx.lineTo(-s * 0.7, s * 0.7);
    ctx.lineTo(-s * 3, 0); ctx.lineTo(-s * 0.7, -s * 0.7);
    ctx.closePath();
    ctx.fill();
    ctx.restore();
  },

  _shipWheel(ctx, x, y, r) {
    ctx.save();
    ctx.translate(x, y);
    ctx.globalAlpha = 0.15;
    ctx.strokeStyle = '#f4c430';
    ctx.lineWidth = 3;
    ctx.beginPath(); ctx.arc(0, 0, r, 0, Math.PI * 2); ctx.stroke();
    ctx.beginPath(); ctx.arc(0, 0, r * 0.65, 0, Math.PI * 2); ctx.stroke();
    for (let i = 0; i < 8; i++) {
      const a = (Math.PI * 2 * i) / 8;
      ctx.beginPath();
      ctx.moveTo(Math.cos(a) * r * 0.65, Math.sin(a) * r * 0.65);
      ctx.lineTo(Math.cos(a) * r * 1.18, Math.sin(a) * r * 1.18);
      ctx.stroke();
    }
    ctx.restore();
  },

  _paintArrow(ctx, x, y, angle, color) {
    ctx.save();
    ctx.translate(x, y);
    ctx.rotate(angle);
    ctx.globalAlpha = 0.35;
    ctx.fillStyle = color;
    ctx.beginPath();
    ctx.moveTo(0, -10); ctx.lineTo(8, 6); ctx.lineTo(-8, 6);
    ctx.closePath();
    ctx.fill();
    ctx.restore();
  },

  drawBall(ctx, ball) {
    if (!ball.alive) return;
    for (let i = 0; i < ball.trail.length; i++) {
      const t = ball.trail[i];
      const a = (i / ball.trail.length) * 0.25;
      ctx.beginPath();
      ctx.arc(t.x, t.y, ball.radius * (0.5 + 0.5 * i / ball.trail.length), 0, Math.PI * 2);
      ctx.fillStyle = `rgba(230,240,255,${a.toFixed(2)})`;
      ctx.fill();
    }
    const p = ball.pos;
    ctx.beginPath();
    ctx.ellipse(p.x + 3, p.y + 5, ball.radius * 0.95, ball.radius * 0.55, 0, 0, Math.PI * 2);
    ctx.fillStyle = 'rgba(0,0,0,0.4)';
    ctx.fill();

    const grad = ctx.createRadialGradient(p.x - ball.radius * 0.4, p.y - ball.radius * 0.45, ball.radius * 0.1, p.x, p.y, ball.radius * 1.05);
    grad.addColorStop(0, '#ffffff');
    grad.addColorStop(0.25, '#e6ecf2');
    grad.addColorStop(0.6, '#aab2bd');
    grad.addColorStop(1, '#565c66');
    ctx.beginPath();
    ctx.arc(p.x, p.y, ball.radius, 0, Math.PI * 2);
    ctx.fillStyle = grad;
    ctx.fill();

    ctx.beginPath();
    ctx.arc(p.x - ball.radius * 0.35, p.y - ball.radius * 0.4, ball.radius * 0.28, 0, Math.PI * 2);
    ctx.fillStyle = 'rgba(255,255,255,0.9)';
    ctx.fill();
  },

  drawPlunger(ctx, restPos, charge, ballWaiting) {
    if (!ballWaiting) return;
    const pull = charge * 46;
    ctx.save();
    const baseY = restPos.y + 30;
    ctx.strokeStyle = '#8b8f96';
    ctx.lineWidth = 6;
    ctx.beginPath();
    ctx.moveTo(restPos.x, baseY + pull);
    ctx.lineTo(restPos.x, baseY - 10);
    ctx.stroke();
    ctx.fillStyle = '#e0263b';
    ctx.beginPath();
    ctx.arc(restPos.x, baseY + pull, 7, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
  },

  render(ctx, { world, particles, balls, plunger, shake, flash }) {
    const W = TABLE.WIDTH, H = TABLE.HEIGHT;
    if (!this._bgCanvas) this.buildBackground(world);

    ctx.save();
    let sx = 0, sy = 0;
    if (shake && shake.mag > 0.01) {
      sx = (Math.random() * 2 - 1) * shake.mag;
      sy = (Math.random() * 2 - 1) * shake.mag;
    }
    ctx.translate(sx, sy);

    ctx.drawImage(this._bgCanvas, 0, 0);

    for (const c of world.collidables) if (c.draw) c.draw(ctx);
    for (const z of world.captureZones) if (z.draw) z.draw(ctx);

    for (const b of balls) this.drawBall(ctx, b);

    for (const z of world.captureZones) if (z.drawOverlay) z.drawOverlay(ctx);

    if (plunger) this.drawPlunger(ctx, plunger.pos, plunger.charge, plunger.waiting);

    particles.draw(ctx);

    // vignette
    const vg = ctx.createRadialGradient(W / 2, H * 0.4, H * 0.35, W / 2, H * 0.4, H * 0.68);
    vg.addColorStop(0, 'rgba(0,0,0,0)');
    vg.addColorStop(1, 'rgba(0,0,0,0.38)');
    ctx.fillStyle = vg;
    ctx.fillRect(0, 0, W, H);

    if (flash && flash.alpha > 0) {
      ctx.fillStyle = `rgba(${flash.color},${flash.alpha})`;
      ctx.fillRect(0, 0, W, H);
    }

    ctx.restore();
  },
};

function randSeed(n) {
  const x = Math.sin(n * 12.9898) * 43758.5453;
  return x - Math.floor(x);
}
