// THUNDER CANYON — small vector/math helpers. World units are inches.
// Plain script with UMD tail so it loads from <script> tags and from Node.

const TCU = {};

TCU.v = (x = 0, y = 0) => ({ x, y });
TCU.add = (a, b) => ({ x: a.x + b.x, y: a.y + b.y });
TCU.sub = (a, b) => ({ x: a.x - b.x, y: a.y - b.y });
TCU.mul = (a, k) => ({ x: a.x * k, y: a.y * k });
TCU.dot = (a, b) => a.x * b.x + a.y * b.y;
TCU.cross = (a, b) => a.x * b.y - a.y * b.x; // z of 3D cross
TCU.perp = (a) => ({ x: -a.y, y: a.x }); // +90deg CW in screen coords (y down)
TCU.len = (a) => Math.hypot(a.x, a.y);
TCU.len2 = (a) => a.x * a.x + a.y * a.y;
TCU.norm = (a) => {
  const l = Math.hypot(a.x, a.y);
  return l > 1e-9 ? { x: a.x / l, y: a.y / l } : { x: 0, y: 0 };
};
TCU.lerp = (a, b, t) => a + (b - a) * t;
TCU.clamp = (x, lo, hi) => (x < lo ? lo : x > hi ? hi : x);
TCU.deg = (r) => (r * 180) / Math.PI;
TCU.rad = (d) => (d * Math.PI) / 180;

// Closest point on segment ab to point p; returns {p, t, d}
TCU.closestSeg = (p, a, b) => {
  const abx = b.x - a.x, aby = b.y - a.y;
  const l2 = abx * abx + aby * aby;
  let t = l2 > 1e-12 ? ((p.x - a.x) * abx + (p.y - a.y) * aby) / l2 : 0;
  t = clamp01(t);
  const q = { x: a.x + abx * t, y: a.y + aby * t };
  return { p: q, t, d: Math.hypot(p.x - q.x, p.y - q.y) };
};
function clamp01(t) { return t < 0 ? 0 : t > 1 ? 1 : t; }

// Sample an arc into polyline points. Angles in radians, screen coords (y down, CCW visually = decreasing).
// Sweep from a0 to a1 taking the shorter way if shortest=true.
TCU.arcPts = (c, r, a0, a1, step = 0.11, shortest = false) => {
  if (shortest) {
    let d = a1 - a0;
    while (d > Math.PI) d -= 2 * Math.PI;
    while (d < -Math.PI) d += 2 * Math.PI;
    a1 = a0 + d;
  }
  const n = Math.max(2, Math.ceil(Math.abs(a1 - a0) / step));
  const pts = [];
  for (let i = 0; i <= n; i++) {
    const a = a0 + ((a1 - a0) * i) / n;
    pts.push({ x: c.x + r * Math.cos(a), y: c.y - r * Math.sin(a) }); // y flipped: angle CCW above center
  }
  return pts;
};

// Append polyline pts to a target array without duplicating the join point.
TCU.appendTo = (dst, pts) => {
  for (const p of pts) {
    const last = dst[dst.length - 1];
    if (last && Math.abs(last.x - p.x) < 1e-6 && Math.abs(last.y - p.y) < 1e-6) continue;
    dst.push({ x: p.x, y: p.y });
  }
};

TCU.dist = (a, b) => Math.hypot(a.x - b.x, a.y - b.y);

// Deterministic RNG (mulberry32) — used by tests; gameplay uses Math.random.
TCU.rng = function (seed) {
  let a = seed >>> 0;
  return function () {
    a |= 0; a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
};

if (typeof module !== 'undefined' && module.exports) module.exports = TCU;
if (typeof window !== 'undefined') window.TCU = TCU;
