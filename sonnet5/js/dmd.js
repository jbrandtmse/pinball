// Simulated 128x32 dot-matrix display, styled after the amber plasma DMDs Williams used
// throughout the WPC era (1990-99). Content is authored with normal canvas drawing calls
// (fillText, arcs, paths...) into a tiny offscreen buffer, then sampled down into a dot
// grid -- this gives us free, fully-flexible text/animation without hand-authoring a
// bitmap font.
class DMD {
  constructor(cols = 128, rows = 32) {
    this.cols = cols;
    this.rows = rows;
    this.off = document.createElement('canvas');
    this.off.width = cols;
    this.off.height = rows;
    this.octx = this.off.getContext('2d', { willReadFrequently: true });
    const n = cols * rows;
    this.brightness = new Float32Array(n);
    this.target = new Float32Array(n);
  }

  // Author a frame: `drawFn(ctx, cols, rows)` should paint in white/gray onto the buffer.
  compose(drawFn) {
    const ctx = this.octx;
    ctx.clearRect(0, 0, this.cols, this.rows);
    ctx.fillStyle = '#000';
    ctx.fillRect(0, 0, this.cols, this.rows);
    ctx.fillStyle = '#fff';
    ctx.strokeStyle = '#fff';
    ctx.textBaseline = 'middle';
    drawFn(ctx, this.cols, this.rows);
    const img = ctx.getImageData(0, 0, this.cols, this.rows).data;
    const n = this.cols * this.rows;
    for (let i = 0; i < n; i++) {
      const a = img[i * 4 + 3] / 255;
      const lum = (img[i * 4] + img[i * 4 + 1] + img[i * 4 + 2]) / (3 * 255);
      this.target[i] = a * lum;
    }
  }

  update(dt) {
    const rate = 20;
    const k = Math.min(1, rate * dt);
    for (let i = 0; i < this.brightness.length; i++) {
      this.brightness[i] += (this.target[i] - this.brightness[i]) * k;
    }
  }

  draw(ctx, x, y, w, h) {
    const dotW = w / this.cols, dotH = h / this.rows;
    const r = Math.min(dotW, dotH) * 0.40;
    ctx.save();
    ctx.translate(x, y);
    for (let ry = 0; ry < this.rows; ry++) {
      const cy = ry * dotH + dotH / 2;
      for (let rx = 0; rx < this.cols; rx++) {
        const b = this.brightness[ry * this.cols + rx];
        const cx = rx * dotW + dotW / 2;
        ctx.beginPath();
        ctx.arc(cx, cy, r, 0, Math.PI * 2);
        if (b > 0.04) {
          const g = 130 + Math.floor(b * 90);
          ctx.fillStyle = `rgba(255,${g},20,${(0.2 + b * 0.8).toFixed(3)})`;
        } else {
          ctx.fillStyle = 'rgba(55,32,10,0.4)';
        }
        ctx.fill();
      }
    }
    ctx.restore();
    // soft overall bloom so bright frames (jackpot flashes, etc.) glow like real plasma
    let totalBright = 0;
    for (let i = 0; i < this.brightness.length; i++) totalBright += this.brightness[i];
    const avg = totalBright / this.brightness.length;
    if (avg > 0.12) {
      ctx.save();
      ctx.globalAlpha = Math.min(0.35, (avg - 0.12) * 1.4);
      ctx.fillStyle = '#ff9d1a';
      ctx.filter = 'blur(6px)';
      ctx.fillRect(x, y, w, h);
      ctx.restore();
    }
  }

  measure(text, font) {
    this.octx.font = font;
    return this.octx.measureText(text).width;
  }
}
