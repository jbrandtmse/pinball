// Usage: node tools/trace.mjs out.json "x,y,vx,vy;x,y,vx,vy..." [seconds]
import { buildWorld } from '../src/table/build.js';
import { dumpGeometry } from './dumpgeom.mjs';
import { PHYS } from '../src/sim/physics.js';
import fs from 'fs';
const [, , out, spec, secs = '4'] = process.argv;
const { world } = buildWorld();
const traces = [];
const colors = [[255,255,0],[0,255,255],[255,128,0],[255,0,255],[128,255,128],[255,255,255]];
spec.split(';').forEach((s, i) => {
  const [x, y, vx, vy] = s.split(',').map(Number);
  const w = buildWorld().world;
  const b = w.addBall(x, y); b.vx = vx; b.vy = vy;
  const pts = [];
  for (let t = 0; t < Number(secs); t += PHYS.dt) {
    w.step(); w.drainEvents();
    if (b.mode === 'pf') { if (!pts.length || Math.hypot(pts[pts.length-1][0]-b.x, pts[pts.length-1][1]-b.y) > 0.1) pts.push([b.x, b.y]); }
    if (b.mode === 'gone') break;
  }
  traces.push({ pts, color: colors[i % colors.length], end: true });
});
fs.writeFileSync(out, JSON.stringify(dumpGeometry(world, { traces })));
