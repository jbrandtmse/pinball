/* ============================================================================
 * RAGNAROK PINBALL — util.js
 * Shared math, easing, deterministic RNG, small helpers.
 * All world units are MILLIMETRES and SECONDS unless noted.
 * ==========================================================================*/
(function (PB) {
  'use strict';

  var U = PB.U = {};

  U.TAU = Math.PI * 2;
  U.DEG = Math.PI / 180;
  U.RAD = 180 / Math.PI;

  U.clamp = function (v, a, b) { return v < a ? a : v > b ? b : v; };
  U.lerp = function (a, b, t) { return a + (b - a) * t; };
  U.mix = U.lerp;
  U.sign = function (v) { return v < 0 ? -1 : v > 0 ? 1 : 0; };
  U.sq = function (v) { return v * v; };

  /** Framerate independent exponential approach. `rate` = fraction remaining after 1s. */
  U.damp = function (a, b, rate, dt) { return b + (a - b) * Math.pow(rate, dt); };

  U.smoothstep = function (t) { t = U.clamp(t, 0, 1); return t * t * (3 - 2 * t); };
  U.easeOutCubic = function (t) { t = U.clamp(t, 0, 1); var p = 1 - t; return 1 - p * p * p; };
  U.easeInCubic = function (t) { t = U.clamp(t, 0, 1); return t * t * t; };
  U.easeOutBack = function (t) {
    t = U.clamp(t, 0, 1);
    var c1 = 1.70158, c3 = c1 + 1, p = t - 1;
    return 1 + c3 * p * p * p + c1 * p * p;
  };
  U.pulse = function (t, period) { return 0.5 + 0.5 * Math.sin(t * U.TAU / period); };

  /** Shortest signed difference between two angles (radians). */
  U.angDiff = function (a, b) {
    var d = (b - a) % U.TAU;
    if (d > Math.PI) d -= U.TAU;
    if (d < -Math.PI) d += U.TAU;
    return d;
  };

  U.dist = function (x1, y1, x2, y2) { var dx = x2 - x1, dy = y2 - y1; return Math.sqrt(dx * dx + dy * dy); };
  U.dist2 = function (x1, y1, x2, y2) { var dx = x2 - x1, dy = y2 - y1; return dx * dx + dy * dy; };

  /* ---------------------------------------------------------------- RNG */
  /** Mulberry32 — small, fast, seedable. Keeps replays/attract mode reproducible. */
  U.Rng = function (seed) {
    this.s = (seed >>> 0) || 0x9e3779b9;
  };
  U.Rng.prototype.next = function () {
    this.s = (this.s + 0x6D2B79F5) | 0;
    var t = this.s;
    t = Math.imul(t ^ (t >>> 15), 1 | t);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
  U.Rng.prototype.range = function (a, b) { return a + (b - a) * this.next(); };
  U.Rng.prototype.int = function (n) { return (this.next() * n) | 0; };
  U.Rng.prototype.pick = function (arr) { return arr[(this.next() * arr.length) | 0]; };
  /** Symmetric jitter in [-a, a]. */
  U.Rng.prototype.jit = function (a) { return (this.next() * 2 - 1) * a; };

  /** Global gameplay RNG (physics scatter, kicker variance, match digit...). */
  U.rng = new U.Rng(0x5eed1a7e);

  /* ------------------------------------------------------------ formatting */
  U.commas = function (n) {
    n = Math.floor(n);
    var s = String(n), out = '', c = 0;
    for (var i = s.length - 1; i >= 0; i--) {
      out = s[i] + out;
      if (++c % 3 === 0 && i > 0) out = ',' + out;
    }
    return out;
  };

  /** Compact score for cramped displays: 12,345,678 -> 12.34M */
  U.shortScore = function (n) {
    if (n >= 1e9) return (n / 1e9).toFixed(2) + 'B';
    if (n >= 1e6) return (n / 1e6).toFixed(2) + 'M';
    if (n >= 1e3) return (n / 1e3).toFixed(1) + 'K';
    return String(Math.floor(n));
  };

  U.pad = function (n, w) {
    var s = String(n);
    while (s.length < w) s = '0' + s;
    return s;
  };

  /* --------------------------------------------------------------- colour */
  /** Blend two "r,g,b" component arrays. */
  U.mixRgb = function (a, b, t) {
    return [
      Math.round(U.lerp(a[0], b[0], t)),
      Math.round(U.lerp(a[1], b[1], t)),
      Math.round(U.lerp(a[2], b[2], t))
    ];
  };
  U.rgba = function (c, a) { return 'rgba(' + c[0] + ',' + c[1] + ',' + c[2] + ',' + a + ')'; };
  U.rgb = function (c) { return 'rgb(' + c[0] + ',' + c[1] + ',' + c[2] + ')'; };

  U.hexToRgb = function (h) {
    h = h.replace('#', '');
    if (h.length === 3) h = h[0] + h[0] + h[1] + h[1] + h[2] + h[2];
    return [parseInt(h.substr(0, 2), 16), parseInt(h.substr(2, 2), 16), parseInt(h.substr(4, 2), 16)];
  };

  /** Scale an "#rrggbb" toward white(+)/black(-). k in [-1,1] */
  U.shade = function (hex, k) {
    var c = U.hexToRgb(hex), t = k < 0 ? 0 : 255, p = Math.abs(k);
    return 'rgb(' + Math.round(U.lerp(c[0], t, p)) + ',' +
      Math.round(U.lerp(c[1], t, p)) + ',' + Math.round(U.lerp(c[2], t, p)) + ')';
  };

  /* -------------------------------------------------------- misc helpers */
  U.now = function () { return (typeof performance !== 'undefined' ? performance.now() : Date.now()); };

  /** Create an offscreen canvas + 2d context. */
  U.canvas = function (w, h) {
    var c = document.createElement('canvas');
    c.width = Math.max(1, Math.ceil(w));
    c.height = Math.max(1, Math.ceil(h));
    return c;
  };

  /** Rounded-rectangle path (older Safari lacks ctx.roundRect). */
  U.roundRect = function (ctx, x, y, w, h, r) {
    r = Math.min(r, Math.abs(w) * 0.5, Math.abs(h) * 0.5);
    ctx.beginPath();
    ctx.moveTo(x + r, y);
    ctx.arcTo(x + w, y, x + w, y + h, r);
    ctx.arcTo(x + w, y + h, x, y + h, r);
    ctx.arcTo(x, y + h, x, y, r);
    ctx.arcTo(x, y, x + w, y, r);
    ctx.closePath();
  };

  /** Regular polygon path. */
  U.polyPath = function (ctx, cx, cy, r, n, rot) {
    ctx.beginPath();
    for (var i = 0; i < n; i++) {
      var a = rot + i * U.TAU / n;
      var x = cx + Math.cos(a) * r, y = cy + Math.sin(a) * r;
      if (i === 0) ctx.moveTo(x, y); else ctx.lineTo(x, y);
    }
    ctx.closePath();
  };

  /** Catmull-Rom sampling of a control-point list -> dense polyline. */
  U.catmull = function (pts, samplesPerSeg, closed) {
    var out = [], n = pts.length;
    function P(i) {
      if (closed) return pts[(i % n + n) % n];
      return pts[U.clamp(i, 0, n - 1)];
    }
    var last = closed ? n : n - 1;
    for (var i = 0; i < last; i++) {
      var p0 = P(i - 1), p1 = P(i), p2 = P(i + 1), p3 = P(i + 2);
      for (var j = 0; j < samplesPerSeg; j++) {
        var t = j / samplesPerSeg, t2 = t * t, t3 = t2 * t;
        var q = {};
        for (var k in p1) {
          if (typeof p1[k] !== 'number') continue;
          var a0 = p0[k] === undefined ? p1[k] : p0[k];
          var a3 = p3[k] === undefined ? p2[k] : p3[k];
          q[k] = 0.5 * ((2 * p1[k]) + (-a0 + p2[k]) * t +
            (2 * a0 - 5 * p1[k] + 4 * p2[k] - a3) * t2 +
            (-a0 + 3 * p1[k] - 3 * p2[k] + a3) * t3);
        }
        out.push(q);
      }
    }
    if (!closed) out.push(pts[n - 1]);
    return out;
  };

  /** Storage that degrades gracefully (file:// in some browsers, private mode). */
  U.store = {
    get: function (k, dflt) {
      try {
        var v = window.localStorage.getItem(k);
        return v === null ? dflt : JSON.parse(v);
      } catch (e) { return U.store._mem[k] !== undefined ? U.store._mem[k] : dflt; }
    },
    set: function (k, v) {
      U.store._mem[k] = v;
      try { window.localStorage.setItem(k, JSON.stringify(v)); } catch (e) { /* memory only */ }
    },
    _mem: {}
  };

})(window.PB = window.PB || {});
