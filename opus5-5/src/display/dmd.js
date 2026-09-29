// 128x32 dot-matrix display: frame buffer, drawing primitives, a priority
// scene queue, and a canvas renderer that draws glowing amber dots.
import { FONTS } from './fonts.js';

export const DMD_W = 128, DMD_H = 32;

export class DMD {
  constructor() { this.buf = new Uint8Array(DMD_W * DMD_H); }
  clear(v = 0) { this.buf.fill(v); }
  px(x, y, v = 15) {
    x |= 0; y |= 0;
    if (x < 0 || y < 0 || x >= DMD_W || y >= DMD_H) return;
    const i = y * DMD_W + x;
    if (v > this.buf[i]) this.buf[i] = v;
  }
  set(x, y, v) { x |= 0; y |= 0; if (x >= 0 && y >= 0 && x < DMD_W && y < DMD_H) this.buf[y * DMD_W + x] = v; }
  get(x, y) { return (x < 0 || y < 0 || x >= DMD_W || y >= DMD_H) ? 0 : this.buf[y * DMD_W + x]; }
  fill(x, y, w, h, v = 15) { for (let j = 0; j < h; j++) for (let i = 0; i < w; i++) this.set(x + i, y + j, v); }
  rect(x, y, w, h, v = 15) {
    for (let i = 0; i < w; i++) { this.px(x + i, y, v); this.px(x + i, y + h - 1, v); }
    for (let j = 0; j < h; j++) { this.px(x, y + j, v); this.px(x + w - 1, y + j, v); }
  }
  line(x0, y0, x1, y1, v = 15) {
    x0 = Math.round(x0); y0 = Math.round(y0); x1 = Math.round(x1); y1 = Math.round(y1);
    const dx = Math.abs(x1 - x0), dy = -Math.abs(y1 - y0), sx = x0 < x1 ? 1 : -1, sy = y0 < y1 ? 1 : -1;
    let err = dx + dy;
    for (;;) {
      this.px(x0, y0, v);
      if (x0 === x1 && y0 === y1) break;
      const e2 = 2 * err;
      if (e2 >= dy) { err += dy; x0 += sx; }
      if (e2 <= dx) { err += dx; y0 += sy; }
    }
  }
  circle(cx, cy, r, v = 15, filled = false) {
    for (let y = -r; y <= r; y++) for (let x = -r; x <= r; x++) {
      const d = Math.sqrt(x * x + y * y);
      if (filled ? d <= r + 0.3 : Math.abs(d - r) < 0.55) this.px(cx + x, cy + y, v);
    }
  }
  dim(k) { for (let i = 0; i < this.buf.length; i++) this.buf[i] = Math.floor(this.buf[i] * k); }
  invert(x, y, w, h) { for (let j = y; j < y + h; j++) for (let i = x; i < x + w; i++) this.set(i, j, 15 - this.get(i, j)); }

  textWidth(str, font = 'f5', opts = {}) {
    const F = FONTS[font];
    let w = 0;
    for (const ch of String(str)) {
      const g = F.glyphs[ch] || (F.fallback && FONTS[F.fallback].glyphs[ch]) || F.glyphs[' '] || { w: 3 };
      w += g.w + F.gap + (opts.bold ? 1 : 0) + (opts.spacing || 0);
    }
    return Math.max(0, w - F.gap - (opts.spacing || 0));
  }
  // align: 'left' | 'center' | 'right'. Returns the width drawn.
  text(str, x, y, opts = {}) {
    const font = opts.font || 'f5';
    const F = FONTS[font];
    const v = opts.v ?? 15;
    const s = String(str).toUpperCase();
    const w = this.textWidth(s, font, opts);
    let cx = opts.align === 'center' ? Math.round(x - w / 2) : opts.align === 'right' ? x - w : x;
    for (const ch of s) {
      let g = F.glyphs[ch], gy = y;
      if (!g && F.fallback) { g = FONTS[F.fallback].glyphs[ch]; gy = y + F.h - FONTS[F.fallback].h; }
      if (!g) g = F.glyphs[' '] || { w: 3, rows: [] };
      for (let r = 0; r < g.rows.length; r++) {
        const row = g.rows[r];
        for (let c = 0; c < row.length; c++) if (row[c] === '#') {
          this.px(cx + c, gy + r, v);
          if (opts.bold) this.px(cx + c + 1, gy + r, v);
          if (opts.shadow) this.px(cx + c + 1, gy + r + 1, Math.max(1, v - 10));
        }
      }
      cx += g.w + F.gap + (opts.bold ? 1 : 0) + (opts.spacing || 0);
    }
    return w;
  }
  // Scale-up text (for headlines) using nearest-neighbour doubling.
  bigText(str, x, y, opts = {}) {
    const scale = opts.scale || 2;
    const tmp = new DMD();
    const w = tmp.text(str, 0, 0, { ...opts, align: 'left', font: opts.font || 'f5' });
    const h = FONTS[opts.font || 'f5'].h;
    const ox = opts.align === 'center' ? Math.round(x - w * scale / 2) : opts.align === 'right' ? x - w * scale : x;
    for (let j = 0; j < h; j++) for (let i = 0; i < w + 1; i++) {
      const v = tmp.get(i, j);
      if (v) for (let a = 0; a < scale; a++) for (let b = 0; b < scale; b++) this.px(ox + i * scale + a, y + j * scale + b, v);
    }
    return w * scale;
  }
}

// Scene queue: the base display (scores) shows unless an overlay scene is
// active. Higher-priority scenes pre-empt; equal priority queues behind.
export class DMDController {
  constructor(dmd) {
    this.d = dmd || new DMD();
    this.cur = null; this.queue = []; this.base = null; this.t = 0;
  }
  setBase(fn) { this.base = fn; }
  show(scene, opts = {}) {
    const item = { scene, dur: opts.duration ?? 2, prio: opts.priority ?? 5, t: 0 };
    if (!this.cur || item.prio > this.cur.prio) {
      if (this.cur && this.cur.t < this.cur.dur * 0.5 && this.cur.prio >= 5) this.queue.unshift(this.cur);
      this.cur = item;
    } else {
      this.queue.push(item);
      this.queue.sort((a, b) => b.prio - a.prio);
      if (this.queue.length > 6) this.queue.length = 6;
    }
  }
  clear() { this.cur = null; this.queue = []; }
  busy() { return !!this.cur; }
  update(dt) {
    this.t += dt;
    if (this.cur) {
      this.cur.t += dt;
      if (this.cur.t >= this.cur.dur) this.cur = this.queue.shift() || null;
    }
    const d = this.d;
    d.clear();
    if (this.cur) this.cur.scene.draw(d, this.cur.t, this.cur.dur);
    else if (this.base) this.base(d, this.t);
  }
}

// Canvas renderer: round dots with a warm plasma-orange glow.
export class DMDRenderer {
  constructor(canvas) {
    this.c = canvas; this.ctx = canvas.getContext('2d');
    this.sprites = [];
    this.lastW = 0;
    this.phosphor = new Float32Array(DMD_W * DMD_H);
  }
  build(pitch) {
    this.sprites = [];
    const size = Math.ceil(pitch);
    for (let v = 0; v < 16; v++) {
      const s = document.createElement('canvas'); s.width = s.height = size;
      const g = s.getContext('2d');
      const r = size * 0.42;
      const k = v / 15;
      const grad = g.createRadialGradient(size / 2, size / 2, 0, size / 2, size / 2, r);
      if (v === 0) {
        grad.addColorStop(0, 'rgba(70,28,8,0.55)'); grad.addColorStop(1, 'rgba(40,14,4,0.2)');
      } else {
        const R = Math.round(255), G = Math.round(90 + 110 * k), B = Math.round(20 + 60 * k * k);
        grad.addColorStop(0, `rgba(${R},${Math.min(255, G + 40)},${B + 30},1)`);
        grad.addColorStop(0.55, `rgba(${R},${G},${B},${0.35 + 0.65 * k})`);
        grad.addColorStop(1, `rgba(${Math.round(160 * k + 60)},${Math.round(40 * k + 10)},0,${0.25 * k})`);
      }
      g.fillStyle = grad; g.beginPath(); g.arc(size / 2, size / 2, r, 0, Math.PI * 2); g.fill();
      this.sprites.push(s);
    }
  }
  render(dmd, dt = 1 / 60) {
    const c = this.c;
    const pitch = c.width / DMD_W;
    if (Math.abs(pitch - this.lastW) > 0.01) { this.build(pitch); this.lastW = pitch; }
    const ctx = this.ctx;
    ctx.fillStyle = '#0b0503';
    ctx.fillRect(0, 0, c.width, c.height);
    const P = this.phosphor, buf = dmd.buf;
    const decay = Math.pow(1e-10, dt);
    for (let i = 0; i < buf.length; i++) {
      const v = buf[i];
      P[i] = v >= P[i] ? v : Math.max(v, P[i] * decay);
      const q = Math.round(P[i]);
      const x = (i % DMD_W) * pitch, y = Math.floor(i / DMD_W) * pitch;
      ctx.drawImage(this.sprites[q], x, y);
    }
  }
}
