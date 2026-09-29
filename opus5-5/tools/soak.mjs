// Physical soak test: bot plays with minimal device logic; reports rescues (stuck balls).
import { Machine } from '../src/game/machine.js';
import { AutoPlayer } from '../test/autoplayer.mjs';
import fs from 'fs';
import { dumpGeometry } from './dumpgeom.mjs';
const secs = Number(process.argv[2] || 600);
const m = new Machine();
const bot = new AutoPlayer(m);
const counts = {}; const rescues = []; let drains = 0;
m.onSwitch((id, e) => {
  counts[id] = (counts[id] || 0) + 1;
  if (id === 'hideout') m.after(0.8, () => m.eject('hideout'));
  if (id === 'vault') m.after(0.8, () => { m.closeDoor(); m.eject('vault'); m.after(1.2, () => m.resetDrops()); });
  if (id.startsWith('drop') && m.dropsDown.every(Boolean)) m.openDoor();
  if (id === 'drain') { drains++; }
  if (id === 'kickbackFired') m.after(3, () => { m.kickbackArmed = true; });
});
m.onFx((t, e) => { if (t === 'ballSearch') rescues.push([e.x, e.y]); });
m.setFlippersEnabled(true); m.kickbackArmed = true;
const dt = 1 / 120;
let lastLog = 0;
for (let t = 0; t < secs; t += dt) {
  if (m.ballsInPlay() === 0) m.serveBall();
  // occasionally run a 3-ball multiball
  if (Math.floor(t) % 90 === 0 && Math.floor(t) !== lastLog && m.ballsInPlay() < 3) { lastLog = Math.floor(t); m.serveBall(true); m.serveBall(true); }
  bot.update(dt);
  m.update(dt);
}
const top = Object.entries(counts).sort((a, b) => b[1] - a[1]).map(([k, v]) => `${k}:${v}`).join(' ');
console.log(`sim ${secs}s  drains ${drains}  rescues ${rescues.length}`);
console.log(top);
if (rescues.length) console.log('rescue spots:', rescues.slice(0, 40).map(([x, y]) => `(${x.toFixed(1)},${y.toFixed(1)})`).join(' '));
if (process.argv[3]) fs.writeFileSync(process.argv[3], JSON.stringify(dumpGeometry(m.world, { balls: rescues })));
