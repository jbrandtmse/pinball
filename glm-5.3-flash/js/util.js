/* =========================================================================
   RISE OF ATLANTIS — util.js
   Math helpers, RNG, tiny event bus. Node-safe (no DOM).
   All playfield units are INCHES. +x right, +y toward player (down).
   ========================================================================= */
(function (root) {
  'use strict';

  const U = {};

  // ---- vectors (plain {x,y} objects, functions are allocation-light) ----
  U.v = (x, y) => ({ x, y });
  U.add = (a, b) => ({ x: a.x + b.x, y: a.y + b.y });
  U.sub = (a, b) => ({ x: a.x - b.x, y: a.y - b.y });
  U.scale = (a, s) => ({ x: a.x * s, y: a.y * s });
  U.dot = (a, b) => a.x * b.x + a.y * b.y;
  U.len = (a) => Math.hypot(a.x, a.y);
  U.norm = (a) => {
    const l = Math.hypot(a.x, a.y) || 1;
    return { x: a.x / l, y: a.y / l };
  };
  U.perp = (a) => ({ x: -a.y, y: a.x });
  U.lerp = (a, b, t) => a + (b - a) * t;
  U.clamp = (v, lo, hi) => (v < lo ? lo : v > hi ? hi : v);
  U.dist = (ax, ay, bx, by) => Math.hypot(bx - ax, by - ay);

  /** closest point on segment ab to point p; returns {x,y,t,d2} */
  U.closestOnSeg = (px, py, ax, ay, bx, by) => {
    const dx = bx - ax, dy = by - ay;
    const l2 = dx * dx + dy * dy;
    let t = l2 > 0 ? ((px - ax) * dx + (py - ay) * dy) / l2 : 0;
    t = t < 0 ? 0 : t > 1 ? 1 : t;
    const x = ax + dx * t, y = ay + dy * t;
    return { x, y, t, d2: (px - x) * (px - x) + (py - y) * (py - y) };
  };

  // ---- seeded RNG (mulberry32) for reproducible headless runs ----
  U.makeRng = (seed) => {
    let s = seed >>> 0;
    return function () {
      s |= 0; s = (s + 0x6D2B79F5) | 0;
      let t = Math.imul(s ^ (s >>> 15), 1 | s);
      t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
      return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
  };
  U.rng = U.makeRng(0xC0FFEE);
  U.rand = (a, b) => a + U.rng() * (b - a);
  U.randi = (a, b) => Math.floor(U.rand(a, b + 1));
  U.pick = (arr) => arr[Math.floor(U.rng() * arr.length) % arr.length];

  // ---- tiny event bus ----
  U.Emitter = class {
    constructor() { this._h = Object.create(null); }
    on(ev, fn) { (this._h[ev] || (this._h[ev] = [])).push(fn); return this; }
    emit(ev, a, b, c) {
      const l = this._h[ev];
      if (l) for (let i = 0; i < l.length; i++) l[i](a, b, c);
      const any = this._h['*'];
      if (any) for (let i = 0; i < any.length; i++) any[i](ev, a, b, c);
    }
  };

  U.fmt = (n) => {
    n = Math.floor(n);
    return n.toLocaleString('en-US');
  };
  U.fmtShort = (n) => {
    if (n >= 1e6) return (n / 1e6).toFixed(n % 1e6 ? 2 : 0) + 'M';
    if (n >= 1e3) return (n / 1e3).toFixed(n % 1e3 ? 1 : 0) + 'K';
    return String(Math.floor(n));
  };

  // node export
  if (typeof module !== 'undefined' && module.exports) module.exports = U;
  root.AR_UTIL = U;
})(typeof window !== 'undefined' ? window : globalThis);
