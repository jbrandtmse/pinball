// Headless full-game test: the autoplayer plays complete games through the
// real rules. Asserts ball accounting, no stuck balls, games always finish.
import { Machine } from '../src/game/machine.js';
import { Game } from '../src/game/rules.js';
import { DMDController } from '../src/display/dmd.js';
import { AutoPlayer } from './autoplayer.mjs';

const GAMES = Number(process.argv[2] || 6);
const VERBOSE = process.argv.includes('-v');
let failures = 0;
const fail = (msg) => { failures++; console.log('FAIL:', msg); };

function playGame(seedIdx) {
  const m = new Machine();
  const dmd = new DMDController();
  let stored = null;
  const g = new Game(m, { dmd, storage: { load: () => stored, save: (v) => { stored = v; } } });
  const bot = new AutoPlayer(m, { skill: 0.93 });
  const dt = 1 / 120;
  let t = 0, rescues = 0;
  m.onFx((type) => { if (type === 'ballSearch') rescues++; });
  g.pressStart();
  if (seedIdx % 3 === 2) g.pressStart(); // two-player game
  let maxT = 60 * 40;
  let lastState = '';
  while (t < maxT) {
    bot.update(dt);
    m.update(dt);
    g.update(dt);
    dmd.update(dt);
    t += dt;
    // ball accounting
    const live = m.world.balls.filter(b => b.mode !== 'gone').length;
    if (live + m.trough !== m.totalBalls) { fail(`ball accounting: live ${live} trough ${m.trough} at t=${t.toFixed(1)}`); break; }
    if (g.state === 'jobselect' && Math.random() < 0.01) g.pressStart();
    if (g.state === 'hsentry') { if (Math.random() < 0.05) g.pressStart(); }
    if (g.state !== lastState) { if (VERBOSE) console.log(t.toFixed(1), 'state', g.state); lastState = g.state; }
    if (g.state === 'attract' && t > 5) break;
  }
  if (g.state !== 'attract') fail(`game did not finish (state ${g.state}) after ${t.toFixed(0)}s`);
  const ev = g.events;
  const count = (type) => ev.filter(e => e.type === type).length;
  const summary = {
    secs: Math.round(t), players: g.lastScores.length, scores: g.lastScores.map(s => s.toLocaleString()),
    locks: 0, mb: count('multiballStart'), jackpots: count('jackpot'), supers: count('superJackpot'), jobs: count('jobStart'),
    jobsDone: count('jobComplete'), saves: count('ballSaved'), skill: count('skillShot'), eb: count('extraBall'),
    tilts: count('tilt'), hs: count('highScore'), rescues,
  };
  return summary;
}

let totalRescues = 0;
for (let i = 0; i < GAMES; i++) {
  const s = playGame(i);
  totalRescues += s.rescues;
  console.log(`game ${i + 1}:`, JSON.stringify(s));
}
if (totalRescues > GAMES * 2) fail(`too many ball-search rescues: ${totalRescues}`);
console.log(failures ? `${failures} FAILURE(S)` : 'headless: all games completed OK');
process.exit(failures ? 1 : 0);
