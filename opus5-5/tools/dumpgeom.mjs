// Dumps physics geometry (and optional traces) to JSON for tools/draw.py
import { buildWorld } from '../src/table/build.js';
import { SEG, CIRC, ARC } from '../src/sim/physics.js';
import fs from 'fs';
export function dumpGeometry(world, extra = {}) {
  const segs = [], circs = [], arcs = [];
  for (const c of world.colliders) {
    if (c.type === SEG) segs.push([c.ax, c.ay, c.bx, c.by, c.r, c.enabled ? 1 : 0, c.kick ? 1 : 0, c.pass ? 1 : 0]);
    else if (c.type === CIRC) circs.push([c.x, c.y, c.r, c.kick ? 1 : 0]);
    else arcs.push([c.x, c.y, c.r, c.a0, c.a1]);
  }
  const flips = world.flippers.map(f => {
    const pts = [];
    for (let i = 0; i < 48; i++) {
      const a = i / 48 * Math.PI * 2;
      // sample outline by marching rays from a point on the axis
      const cx = f.px + Math.cos(f.angle) * f.L * 0.4, cy = f.py + Math.sin(f.angle) * f.L * 0.4;
      let lo = 0, hi = 4; const o = {};
      for (let k = 0; k < 30; k++) { const m = (lo + hi) / 2; const d = f.distance(cx + Math.cos(a) * m, cy + Math.sin(a) * m, o); if (d < 0) lo = m; else hi = m; }
      pts.push([cx + Math.cos(a) * lo, cy + Math.sin(a) * lo]);
    }
    return pts;
  });
  const trig = world.triggers.map(t => t.kind === 'circle' ? { c: [t.x, t.y, t.r], id: t.id } : { l: [t.ax, t.ay, t.bx, t.by], id: t.id });
  const paths = Object.values(world.paths).map(p => p.samples.map(s => [s.x, s.y, s.z]));
  return { segs, circs, arcs, flips, trig, paths, ...extra };
}
if (process.argv[1].endsWith('dumpgeom.mjs')) {
  const { world, h } = buildWorld();
  const up = process.argv.includes('--up');
  if (up) for (const f of world.flippers) { f.angle = f.up; }
  fs.writeFileSync(process.argv[2] || 'geom.json', JSON.stringify(dumpGeometry(world)));
}
