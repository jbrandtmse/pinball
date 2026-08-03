/* ============================================================================
 * RAGNAROK PINBALL — visual check harness
 *
 *   node test/shot.js [name] [--play] [--w 1600] [--h 1100] [--t 3]
 *
 * Drives the real page in headless Chrome, optionally starts a game and
 * presses keys, then writes a PNG and dumps any console errors.
 * ==========================================================================*/
'use strict';
const puppeteer = require('puppeteer-core');
const http = require('http');
const fs = require('fs');
const path = require('path');

const ROOT = path.join(__dirname, '..');
const OUT = path.join(ROOT, 'test', 'shots');
const CHROME = process.env.CHROME_PATH ||
  'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe';

const argv = process.argv.slice(2);
function flag(n, d) { const i = argv.indexOf('--' + n); return i >= 0 ? argv[i + 1] : d; }
const NAME = (argv[0] && !argv[0].startsWith('--')) ? argv[0] : 'shot';
const PLAY = argv.includes('--play');
const W = parseInt(flag('w', 1600), 10);
const H = parseInt(flag('h', 1100), 10);
const SETTLE = parseFloat(flag('t', 2.5));
const KEYS = flag('keys', '');

const TYPES = { '.html': 'text/html', '.js': 'text/javascript', '.css': 'text/css' };

function serve(port) {
  return new Promise(res => {
    const s = http.createServer((req, rq) => {
      let rel = decodeURIComponent(req.url.split('?')[0]);
      if (rel === '/') rel = '/index.html';
      const f = path.join(ROOT, rel);
      fs.readFile(f, (e, buf) => {
        if (e) { rq.writeHead(404); return rq.end('404'); }
        rq.writeHead(200, { 'Content-Type': TYPES[path.extname(f)] || 'application/octet-stream' });
        rq.end(buf);
      });
    }).listen(port, () => res(s));
  });
}

(async () => {
  if (!fs.existsSync(OUT)) fs.mkdirSync(OUT, { recursive: true });
  const PORT = 8531;
  const server = await serve(PORT);
  const browser = await puppeteer.launch({
    executablePath: CHROME,
    headless: 'new',
    args: ['--no-sandbox', '--autoplay-policy=no-user-gesture-required',
      '--force-device-scale-factor=1', '--hide-scrollbars']
  });
  const page = await browser.newPage();
  await page.setViewport({ width: W, height: H, deviceScaleFactor: 1 });

  const errs = [];
  page.on('console', m => { if (m.type() === 'error' || m.type() === 'warning') errs.push(m.type() + ': ' + m.text()); });
  page.on('pageerror', e => errs.push('PAGEERROR: ' + e.message + '\n' + (e.stack || '').split('\n').slice(0, 4).join('\n')));

  await page.goto(`http://localhost:${PORT}/`, { waitUntil: 'load' });
  await new Promise(r => setTimeout(r, 700));

  // dismiss the boot veil
  await page.evaluate(() => { const b = document.getElementById('bootBtn'); if (b) b.click(); });
  await new Promise(r => setTimeout(r, 400));

  if (PLAY) {
    await page.evaluate(() => { window.PB.Game.credits = 9; });
    await page.keyboard.press('Enter');
    await new Promise(r => setTimeout(r, 900));
    // full plunge
    await page.keyboard.down('Space');
    await new Promise(r => setTimeout(r, 1400));
    await page.keyboard.up('Space');
  }

  for (const k of KEYS.split(',').filter(Boolean)) {
    await page.keyboard.press(k.trim());
    await new Promise(r => setTimeout(r, 200));
  }

  await new Promise(r => setTimeout(r, SETTLE * 1000));

  const state = await page.evaluate(() => {
    const g = window.PB.Game;
    return {
      state: g.state, balls: g.world.balls.length,
      ballPos: g.world.balls.map(b => [Math.round(b.x), Math.round(b.y), b.state]),
      score: g.players[g.current] ? g.players[g.current].score : 0,
      ball: g.ballNum, fps: g.dpr
    };
  });

  const file = path.join(OUT, NAME + '.png');
  await page.screenshot({ path: file });
  console.log('wrote ' + file);
  console.log('state: ' + JSON.stringify(state));
  if (errs.length) { console.log('--- console ---'); errs.slice(0, 20).forEach(e => console.log('  ' + e)); }
  else console.log('console clean');

  await browser.close();
  server.close();
})().catch(e => { console.error(e); process.exit(1); });
