/* DRAGON'S KEEP — 128x32 DMD framebuffer + scene queue. Node-safe.
 * Brightness levels 0..3 (WPC plasma look). Scenes are functions
 * (dmd, t, game) => bool  — return false to end early.
 */
"use strict";
(function (g) {
  const DK = g.DK; const C = DK.C; const FONT = () => DK.DMDFONT;

  class DMD {
    constructor() {
      this.w = C.DMD_W; this.h = C.DMD_H;
      this.buf = new Uint8Array(this.w * this.h);
      this.scenes = [];   // {prio, ttl, t, fn}
    }
    clear(v) { this.buf.fill(v || 0); }
    px(x, y, v) {
      x |= 0; y |= 0;
      if (x < 0 || y < 0 || x >= this.w || y >= this.h) return;
      this.buf[y * this.w + x] = v;
    }
    rect(x, y, w, h, v) {
      for (let j = 0; j < h; j++) for (let i = 0; i < w; i++) this.px(x + i, y + j, v);
    }
    frame(x, y, w, h, v) {
      for (let i = 0; i < w; i++) { this.px(x + i, y, v); this.px(x + i, y + h - 1, v); }
      for (let j = 0; j < h; j++) { this.px(x, y + j, v); this.px(x + w - 1, y + j, v); }
    }
    textW(str, scale, spacing) {
      scale = scale || 1; spacing = spacing == null ? 1 : spacing;
      const { glyphW } = FONT();
      let w = 0;
      for (const ch of str) w += (glyphW(ch) + spacing) * scale;
      return w - spacing * scale;
    }
    text(str, x, y, opts) {
      opts = opts || {};
      const v = opts.v == null ? 3 : opts.v;
      const scale = opts.scale || 1;
      const spacing = opts.spacing == null ? 1 : opts.spacing;
      const { F, glyphW } = FONT();
      let cx = Math.round(x);
      for (const ch of str) {
        const gl = F[ch.toUpperCase()] || F["?"];
        const gw = glyphW(ch);
        for (let r = 0; r < 7; r++) {
          const bits = gl[r];
          for (let c = 0; c < 5; c++) {
            if (bits & (16 >> c)) {
              if (c >= gw && gw < 5) continue;
              for (let sy = 0; sy < scale; sy++)
                for (let sx = 0; sx < scale; sx++)
                  this.px(cx + c * scale + sx, y + r * scale + sy, v);
            }
          }
        }
        cx += (gw + spacing) * scale;
      }
      return cx;
    }
    textC(str, y, opts) {
      opts = opts || {};
      const w = this.textW(str, opts.scale || 1, opts.spacing == null ? 1 : opts.spacing);
      return this.text(str, Math.round((this.w - w) / 2), y, opts);
    }
    textR(str, x, y, opts) {
      opts = opts || {};
      const w = this.textW(str, opts.scale || 1, opts.spacing == null ? 1 : opts.spacing);
      return this.text(str, x - w, y, opts);
    }

    // scene queue
    play(fn, ttl, prio) {
      prio = prio || 1;
      // drop lower-prio scenes if a higher one arrives
      this.scenes = this.scenes.filter((s) => s.prio > prio);
      this.scenes.push({ fn, ttl: ttl || 2, t: 0, prio });
      this.scenes.sort((a, b) => b.prio - a.prio);
    }
    clearScenes() { this.scenes = []; }
    update(dt, game, defaultScene) {
      while (this.scenes.length) {
        const s = this.scenes[0];
        s.t += dt;
        if (s.t > s.ttl) { this.scenes.shift(); continue; }
        this.clear();
        const keep = s.fn(this, s.t, game);
        if (keep === false) { this.scenes.shift(); continue; }
        return;
      }
      this.clear();
      defaultScene(this, game);
    }
  }

  DK.DMD = DMD;
  if (typeof module !== "undefined" && module.exports) module.exports = DK;
})(typeof window !== "undefined" ? window : globalThis);
