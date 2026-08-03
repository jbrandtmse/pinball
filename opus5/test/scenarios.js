/* ============================================================================
 * RAGNAROK PINBALL — rules / UI scenario walk-through
 *   node test/scenarios.js
 * Forces each headline feature (mode, multiball, wizard, tilt, bonus, game
 * over, initials entry, match) and checks it runs without throwing.
 * ==========================================================================*/
'use strict';
const puppeteer = require('puppeteer-core');
const http = require('http');
const fs = require('fs');
const path = require('path');

const ROOT = path.join(__dirname, '..');
const OUT = path.join(ROOT, 'test', 'shots');
const CHROME = process.env.CHROME_PATH || 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe';
const TYPES = { '.html': 'text/html', '.js': 'text/javascript', '.css': 'text/css' };

function serve(port) {
  return new Promise(res => {
    const s = http.createServer((rq, rs) => {
      let rel = decodeURIComponent(rq.url.split('?')[0]);
      if (rel === '/') rel = '/index.html';
      fs.readFile(path.join(ROOT, rel), (e, b) => {
        if (e) { rs.writeHead(404); return rs.end('404'); }
        rs.writeHead(200, { 'Content-Type': TYPES[path.extname(rel)] || 'application/octet-stream' });
        rs.end(b);
      });
    }).listen(port, () => res(s));
  });
}
const wait = ms => new Promise(r => setTimeout(r, ms));

(async () => {
  if (!fs.existsSync(OUT)) fs.mkdirSync(OUT, { recursive: true });
  const server = await serve(8534);
  const browser = await puppeteer.launch({
    executablePath: CHROME, headless: 'new',
    args: ['--no-sandbox', '--autoplay-policy=no-user-gesture-required', '--hide-scrollbars']
  });
  const page = await browser.newPage();
  await page.setViewport({ width: 1440, height: 1150, deviceScaleFactor: 1 });
  const errs = [];
  page.on('pageerror', e => errs.push('PAGEERROR: ' + e.message + ' @ ' + (e.stack || '').split('\n')[1]));
  page.on('console', m => { if (m.type() === 'error' && !/404/.test(m.text())) errs.push(m.text()); });

  await page.goto('http://localhost:8534/', { waitUntil: 'load' });
  await wait(600);
  await page.evaluate(() => document.getElementById('bootBtn').click());
  await wait(300);

  const results = [];
  async function step(name, fn, settle = 900, snap = false) {
    const before = errs.length;
    try { await page.evaluate(fn); } catch (e) { errs.push(name + ': ' + e.message); }
    await wait(settle);
    if (snap) await page.screenshot({ path: path.join(OUT, 'sc-' + name + '.png') });
    const st = await page.evaluate(() => ({ state: window.PB.Game.state, balls: window.PB.Game.world.balls.length }));
    const ok = errs.length === before;
    results.push([name, ok, JSON.stringify(st)]);
    console.log(`  ${ok ? 'ok  ' : 'FAIL'} ${name.padEnd(18)} ${JSON.stringify(st)}`);
  }

  console.log('--- scenarios ---');

  await step('start-game', () => { const G = window.PB.Game; G.credits = 9; G.pressStart(); });
  await step('plunge', () => {
    const G = window.PB.Game;
    if (G.table.plunger.ball) { G.table.plunger.power = 0.9; G.firePlunger(); }
  }, 1400);

  await step('saga-mode', () => { window.PB.Game.rules.startMode(2); }, 1600, true);
  await step('saga-hurryup', () => { window.PB.Game.rules.endMode(false); window.PB.Game.rules.startMode(3); }, 1200);
  await step('saga-sequence', () => { window.PB.Game.rules.endMode(false); window.PB.Game.rules.startMode(5); }, 1200);
  await step('mode-shot', () => { window.PB.Game.rules.majorShot('lramp', null); }, 700);
  await step('complete-mode', () => { window.PB.Game.rules.completeMode(); }, 1400);

  await step('drop-bank', () => {
    const G = window.PB.Game;
    G.table.drops.forEach(d => G.table.dropTarget(d));
    G.rules.dropBankComplete();
  }, 900);

  await step('lock+multiball', () => {
    const G = window.PB.Game, p = G.players[G.current];
    p.locks = 2; p.lockReady = true;
    G.rules.startMultiball();
  }, 2600, true);
  await step('jackpot', () => { window.PB.Game.rules.majorShot('rramp', null); }, 900);
  await step('super-jackpot', () => {
    const r = window.PB.Game.rules; r.superLit = true; r.majorShot('scoop', null);
  }, 1600, true);
  await step('end-multiball', () => { window.PB.Game.rules.endMultiball(); }, 700);

  await step('wizard', () => {
    const G = window.PB.Game, p = G.players[G.current];
    for (let i = 0; i < 6; i++) p.modesDone[i] = true;
    p.modesCompleted = 6;
    G.rules.startWizard();
  }, 3200, true);
  await step('wizard-shot', () => {
    const r = window.PB.Game.rules;
    ['lramp', 'rramp', 'lorbit', 'rorbit', 'scoop', 'spinner'].forEach(s => r.majorShot(s, null));
  }, 1500);
  await step('end-wizard', () => { window.PB.Game.rules.endWizard(); }, 500);

  await step('extra-ball', () => { window.PB.Game.rules.awardExtraBall(); }, 1200);
  await step('thor-complete', () => {
    const p = window.PB.Game.players[0]; p.thorMask = 15; window.PB.Game.rules.thorComplete();
  }, 1400);
  await step('rune-complete', () => {
    const G = window.PB.Game;
    for (let i = 0; i < 4; i++) G.rules.onZone('lane:' + i, G.world.balls[0] || new window.PB.Phys.Ball(264, 182), true);
  }, 1400);

  await step('tilt-warning', () => { window.PB.Game.rules.nudged(2.5); }, 900);
  await step('tilt', () => { const r = window.PB.Game.rules; r.tiltWarn = 2; r.nudged(2.5); }, 1600, true);

  await step('end-ball', () => {
    const G = window.PB.Game;
    G.rules.tilted = false;
    G.players[0].bRamps = 12; G.players[0].bOrbits = 8; G.players[0].bDrops = 9;
    G.players[0].bSpins = 140; G.players[0].bTargets = 6; G.players[0].bonusX = 5;
    G.clearBalls();
    G.endBall();
  }, 5200, true);

  await step('game-over', () => {
    const G = window.PB.Game;
    G.ballNum = 99;
    G.players[0].extraBalls = 0;
    G.players[0].score = 999999999;
    G.gameOver();
  }, 3800, true);

  await step('initials-entry', () => { }, 1200, true);
  await step('enter-initials', () => {
    const G = window.PB.Game;
    if (G.entry) { G.entry.sel = 14; G.entry.select(); G.entry.sel = 3; G.entry.select(); G.entry.sel = 8; G.entry.select(); }
  }, 1600);
  await step('match-or-attract', () => { }, 5200, true);

  const hs = await page.evaluate(() => window.PB.Game.hs.list.slice(0, 3));
  console.log('  high scores now: ' + JSON.stringify(hs));

  const bad = results.filter(r => !r[1]);
  console.log(`\n${results.length - bad.length}/${results.length} scenarios clean`);
  if (errs.length) { console.log('ERRORS:'); errs.slice(0, 20).forEach(e => console.log('  ' + e)); }

  await browser.close();
  server.close();
  process.exit(errs.length ? 1 : 0);
})().catch(e => { console.error(e); process.exit(1); });
