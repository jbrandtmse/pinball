import { Machine } from '../src/game/machine.js';
import { dumpGeometry } from './dumpgeom.mjs';
import fs from 'fs';
const traces = [];
for (let i = 0; i < 8; i++) {
  const m = new Machine();
  const b = m.world.addBall(7.6, 13.3); m.trough--; m.capture('vault', b); m.processEvents();
  m.eject('vault');
  const pts = [];
  for (let t = 0; t < 1.6; t += 1 / 240) { m.update(1 / 240); if (b.mode === 'pf') pts.push([b.x, b.y]); if (b.mode === 'gone') break; }
  traces.push({ pts, color: [255, 200 - i * 20, i * 30], end: true });
}
const m = new Machine();
fs.writeFileSync(process.argv[2], JSON.stringify(dumpGeometry(m.world, { traces })));
