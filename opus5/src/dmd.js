/* ============================================================================
 * RAGNAROK PINBALL — dmd.js
 * A 128 x 32 dot-matrix display with 16 intensity levels, like the Williams
 * WPC plasma panel. Everything the machine "says" goes through here.
 * ==========================================================================*/
(function (PB) {
  'use strict';
  var U = PB.U, F = PB.Fonts;

  var W = 128, H = 32;

  var D = PB.DMD = {
    W: W, H: H,
    buf: new Uint8Array(W * H),
    scenes: [],
    t: 0,
    baseDraw: null,      // fallback renderer (score screen)
    flashT: 0
  };

  /* ------------------------------------------------------------ raster ops */
  D.clear = function (v) { this.buf.fill(v || 0); };
  D.px = function (x, y, v) {
    x |= 0; y |= 0;
    if (x < 0 || y < 0 || x >= W || y >= H) return;
    this.buf[y * W + x] = v;
  };
  D.pxMax = function (x, y, v) {
    x |= 0; y |= 0;
    if (x < 0 || y < 0 || x >= W || y >= H) return;
    var i = y * W + x;
    if (v > this.buf[i]) this.buf[i] = v;
  };
  D.get = function (x, y) {
    if (x < 0 || y < 0 || x >= W || y >= H) return 0;
    return this.buf[y * W + x];
  };
  D.fillRect = function (x, y, w, h, v) {
    x |= 0; y |= 0;
    for (var j = 0; j < h; j++) {
      var yy = y + j; if (yy < 0 || yy >= H) continue;
      for (var i = 0; i < w; i++) {
        var xx = x + i; if (xx < 0 || xx >= W) continue;
        this.buf[yy * W + xx] = v;
      }
    }
  };
  D.rect = function (x, y, w, h, v) {
    for (var i = 0; i < w; i++) { this.px(x + i, y, v); this.px(x + i, y + h - 1, v); }
    for (var j = 0; j < h; j++) { this.px(x, y + j, v); this.px(x + w - 1, y + j, v); }
  };
  D.line = function (x0, y0, x1, y1, v) {
    x0 |= 0; y0 |= 0; x1 |= 0; y1 |= 0;
    var dx = Math.abs(x1 - x0), sx = x0 < x1 ? 1 : -1;
    var dy = -Math.abs(y1 - y0), sy = y0 < y1 ? 1 : -1;
    var err = dx + dy;
    for (var guard = 0; guard < 512; guard++) {
      this.px(x0, y0, v);
      if (x0 === x1 && y0 === y1) break;
      var e2 = 2 * err;
      if (e2 >= dy) { err += dy; x0 += sx; }
      if (e2 <= dx) { err += dx; y0 += sy; }
    }
  };
  D.circle = function (cx, cy, r, v, fill) {
    for (var y = -r; y <= r; y++) {
      for (var x = -r; x <= r; x++) {
        var d = Math.sqrt(x * x + y * y);
        if (fill ? d <= r : (d <= r + 0.5 && d >= r - 0.5)) this.px(cx + x, cy + y, v);
      }
    }
  };
  /** Dither-shaded box, for backgrounds that shouldn't wash out the text. */
  D.dither = function (x, y, w, h, v, phase) {
    phase = phase || 0;
    for (var j = 0; j < h; j++)
      for (var i = 0; i < w; i++)
        if (((i + j + phase) & 1) === 0) this.px(x + i, y + j, v);
  };

  /* -------------------------------------------------------------- text */
  D.text = function (font, str, x, y, v, opt) {
    opt = opt || {};
    var scale = opt.scale || 1, tracking = opt.tracking || 0;
    str = String(str);
    var maxW = opt.maxW === undefined ? W - 2 : opt.maxW;
    var w = F.width(font, str, scale, tracking);
    // shrink to fit the 128-dot panel rather than running off the edge
    while (scale > 1 && w > maxW) { scale--; w = F.width(font, str, scale, tracking); }
    while (w > maxW && tracking > -1) { tracking -= 1; w = F.width(font, str, scale, tracking); }
    if (opt.align === 'center') x = Math.round(x - w / 2);
    else if (opt.align === 'right') x = Math.round(x - w);
    var cx = x;
    for (var i = 0; i < str.length; i++) {
      var ch = str[i];
      var g = font.glyphs[ch] || font.glyphs[ch.toUpperCase()] || font.glyphs['?'] || font.glyphs[' '];
      if (ch !== ' ') this.glyph(g, cx, y, v, scale, opt.outline);
      cx += (g.w + font.gap + tracking) * scale;
    }
    return w;
  };
  D.glyph = function (g, x, y, v, scale, outline) {
    scale = scale || 1;
    for (var gy = 0; gy < g.h; gy++) {
      var bits = g.rows[gy];
      if (!bits && !outline) continue;
      for (var gx = 0; gx < g.w; gx++) {
        if (!(bits & (1 << gx))) continue;
        if (scale === 1) this.px(x + gx, y + gy, v);
        else this.fillRect(x + gx * scale, y + gy * scale, scale, scale, v);
      }
    }
  };
  D.textW = function (font, str, scale, tracking) { return F.width(font, String(str), scale || 1, tracking || 0); };

  /** Score with thousands separators in the tall font. */
  D.score = function (n, x, y, v, opt) {
    return this.text(F.FBIG, U.commas(n), x, y, v, opt);
  };

  /* ------------------------------------------------------------- scenes */
  /**
   * show({id, prio, dur, draw(dmd, t, life), onEnd})
   * Higher prio wins. Same id replaces (so repeated jackpots restart cleanly).
   */
  D.show = function (s) {
    s.t = 0;
    s.prio = s.prio || 1;
    s.dur = s.dur === undefined ? 2 : s.dur;
    if (s.id) {
      for (var i = 0; i < this.scenes.length; i++) {
        if (this.scenes[i].id === s.id) { this.scenes.splice(i, 1); break; }
      }
    }
    this.scenes.push(s);
    this.scenes.sort(function (a, b) { return a.prio - b.prio; });
    return s;
  };
  D.kill = function (id) {
    for (var i = this.scenes.length - 1; i >= 0; i--) if (this.scenes[i].id === id) this.scenes.splice(i, 1);
  };
  D.has = function (id) {
    for (var i = 0; i < this.scenes.length; i++) if (this.scenes[i].id === id) return true;
    return false;
  };
  D.clearScenes = function () { this.scenes.length = 0; };

  D.update = function (dt) {
    this.t += dt;
    for (var i = this.scenes.length - 1; i >= 0; i--) {
      var s = this.scenes[i];
      s.t += dt;
      if (s.dur > 0 && s.t >= s.dur) {
        if (s.onEnd) s.onEnd();
        this.scenes.splice(i, 1);
      }
    }
    // render
    this.clear(0);
    var top = this.scenes.length ? this.scenes[this.scenes.length - 1] : null;
    if (top) top.draw(this, s ? top.t : top.t, top.dur ? top.t / top.dur : 0);
    else if (this.baseDraw) this.baseDraw(this, this.t);
  };

  /* --------------------------------------------------- reusable widgets */
  /** Marching-ants border used all over WPC games. */
  D.marquee = function (t, v, inset) {
    var i = inset || 0;
    var per = 12, ph = Math.floor(t * 26) % per;
    var x, y;
    for (x = i; x < W - i; x++) {
      if ((x + ph) % per < 6) { this.px(x, i, v); this.px(x, H - 1 - i, v); }
    }
    for (y = i; y < H - i; y++) {
      if ((y + ph) % per < 6) { this.px(i, y, v); this.px(W - 1 - i, y, v); }
    }
  };

  /** Horizontal progress bar. */
  D.bar = function (x, y, w, h, frac, v) {
    this.rect(x, y, w, h, Math.max(3, v - 6));
    var inner = Math.round((w - 4) * U.clamp(frac, 0, 1));
    if (inner > 0) this.fillRect(x + 2, y + 2, inner, h - 4, v);
  };

  /** Simple lightning bolt — the game's signature glyph. */
  D.bolt = function (x, y, s, v) {
    var pts = [[4, 0], [1, 6], [3, 6], [0, 13], [6, 5], [3, 5], [6, 0]];
    var last = null;
    for (var i = 0; i < pts.length; i++) {
      var p = [x + pts[i][0] * s, y + pts[i][1] * s];
      if (last) this.line(last[0], last[1], p[0], p[1], v);
      last = p;
    }
    this.line(last[0], last[1], x + pts[0][0] * s, y + pts[0][1] * s, v);
  };

  /** A hammer silhouette (Mjolnir). */
  D.hammer = function (x, y, v) {
    this.fillRect(x, y, 11, 7, v);
    this.fillRect(x + 4, y + 7, 3, 12, v);
    this.rect(x, y, 11, 7, Math.max(3, v - 8));
    this.px(x + 2, y + 2, Math.max(2, v - 10));
    this.px(x + 8, y + 4, Math.max(2, v - 10));
  };

  /* -------------------------------------------------------------- render */
  /**
   * Paint the framebuffer onto a canvas as round plasma dots with bloom.
   * `tint` is [r,g,b] for the lit dot colour.
   */
  D.render = function (ctx, x, y, w, h, tint, opt) {
    opt = opt || {};
    var dw = w / W, dh = h / H;
    var dot = Math.min(dw, dh);
    var r = dot * (opt.dotScale || 0.40);
    tint = tint || [255, 148, 24];
    var offx = x + (w - dw * W) / 2, offy = y + (h - dh * H) / 2;

    // panel background
    ctx.save();
    ctx.fillStyle = opt.bg || '#100603';
    ctx.fillRect(x, y, w, h);

    // Unlit dot grid. 4096 arcs is far too much to redraw every frame, so it
    // is baked once per panel size and blitted.
    var key = (w | 0) + 'x' + (h | 0);
    if (this._gridKey !== key) {
      this._gridKey = key;
      var gc = U.canvas(Math.max(1, w), Math.max(1, h));
      var g2 = gc.getContext('2d');
      g2.fillStyle = 'rgba(255,150,60,0.055)';
      for (var gy = 0; gy < H; gy++) {
        for (var gx = 0; gx < W; gx++) {
          g2.beginPath();
          g2.arc((w - dw * W) / 2 + (gx + 0.5) * dw, (h - dh * H) / 2 + (gy + 0.5) * dh, r * 0.72, 0, U.TAU);
          g2.fill();
        }
      }
      this._grid = gc;
    }
    ctx.drawImage(this._grid, x, y);

    // lit dots, batched per intensity bucket
    var buckets = [];
    for (var i = 0; i < 16; i++) buckets.push([]);
    for (var py = 0; py < H; py++) {
      for (var px = 0; px < W; px++) {
        var v = this.buf[py * W + px];
        if (v > 0) buckets[v].push(px, py);
      }
    }
    ctx.globalCompositeOperation = 'lighter';
    for (var lv = 1; lv < 16; lv++) {
      var arr = buckets[lv];
      if (!arr.length) continue;
      var f = lv / 15;
      var cr = Math.round(tint[0] * (0.30 + 0.70 * f));
      var cg = Math.round(tint[1] * (0.16 + 0.84 * f * f));
      var cb = Math.round(tint[2] * (0.06 + 0.94 * f * f * f));
      ctx.fillStyle = 'rgb(' + cr + ',' + cg + ',' + cb + ')';
      ctx.beginPath();
      for (var k = 0; k < arr.length; k += 2) {
        var cx = offx + (arr[k] + 0.5) * dw, cy = offy + (arr[k + 1] + 0.5) * dh;
        ctx.moveTo(cx + r, cy);
        ctx.arc(cx, cy, r, 0, U.TAU);
      }
      ctx.fill();
      // bloom halo for the brightest dots
      if (lv >= 11) {
        ctx.globalAlpha = 0.14 * f;
        ctx.beginPath();
        for (var k2 = 0; k2 < arr.length; k2 += 2) {
          var bx = offx + (arr[k2] + 0.5) * dw, by = offy + (arr[k2 + 1] + 0.5) * dh;
          ctx.moveTo(bx + r * 2.4, by);
          ctx.arc(bx, by, r * 2.4, 0, U.TAU);
        }
        ctx.fill();
        ctx.globalAlpha = 1;
      }
    }
    ctx.globalCompositeOperation = 'source-over';

    // glass reflection
    var gl = ctx.createLinearGradient(x, y, x + w * 0.35, y + h);
    gl.addColorStop(0, 'rgba(255,255,255,0.055)');
    gl.addColorStop(0.45, 'rgba(255,255,255,0.012)');
    gl.addColorStop(1, 'rgba(255,255,255,0)');
    ctx.fillStyle = gl;
    ctx.fillRect(x, y, w, h);
    ctx.restore();
  };

})(window.PB = window.PB || {});
