/* ============================================================================
 * RAGNAROK PINBALL — in-browser soak / autoplay test
 *   node test/soak.js [seconds]
 * Starts a real game, plays it with a simple bot, and reports frame time,
 * stuck balls, rule progress and any console/page errors.
 * ==========================================================================*/
'use strict';
const puppeteer = require('puppeteer-core');
const http = require('http');
const fs = require('fs');
const path = require('path');

const ROOT = path.join(__dirname, '..');
const OUT = path.join(ROOT, 'test', 'shots');
const CHROME = process.env.CHROME_PATH || 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe';
const SECONDS = parseFloat(process.argv[2] || 30);
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

(async () => {
  if (!fs.existsSync(OUT)) fs.mkdirSync(OUT, { recursive: true });
  const PORT = 8532;
  const server = await serve(PORT);
  const browser = await puppeteer.launch({
    executablePath: CHROME, headless: 'new',
    args: ['--no-sandbox', '--autoplay-policy=no-user-gesture-required', '--hide-scrollbars']
  });
  const page = await browser.newPage();
  await page.setViewport({ width: 1500, height: 1050, deviceScaleFactor: 1 });
  const errs = [];
  page.on('pageerror', e => errs.push('PAGEERROR: ' + e.message));
  page.on('console', m => { if (m.type() === 'error' && !/404/.test(m.text())) errs.push(m.text()); });

  await page.goto(`http://localhost:${PORT}/`, { waitUntil: 'load' });
  await new Promise(r => setTimeout(r, 600));
  await page.evaluate(() => document.getElementById('bootBtn').click());

  // install a bot that flips, plunges and records telemetry
  await page.evaluate(() => {
    const G = window.PB.Game, In = window.PB.Input, U = window.PB.U;
    G.credits = 99;
    window.__tel = {
      frames: 0, worstFrame: 0, longFrames: 0, drains: 0, stuck: 0,
      shots: {}, maxScore: 0, ballsSeen: 0, stuckWorst: 0
    };
    const T = window.PB.Table;
    // record every rule event
    const origMajor = G.rules.majorShot.bind(G.rules);
    G.rules.majorShot = function (shot, ball) {
      window.__tel.shots[shot] = (window.__tel.shots[shot] || 0) + 1;
      return origMajor(shot, ball);
    };
    const origDrain = G.ballDrained.bind(G);
    G.ballDrained = function (b) { window.__tel.drains++; return origDrain(b); };

    let last = performance.now();
    const stuckT = {};
    function bot() {
      const now = performance.now();
      const dt = now - last; last = now;
      const t = window.__tel;
      t.frames++;
      if (dt > t.worstFrame) t.worstFrame = dt;
      if (dt > 34) t.longFrames++;
      t.maxScore = Math.max(t.maxScore, G.players[0] ? G.players[0].score : 0);

      if (G.state === 'attract') { In.down.start = false; G.pressStart(); }

      // plunge: hold the rod for ~0.7 s, then let go
      const pl = G.table.plunger;
      if (pl.ball) {
        if (!window.__pl) window.__pl = now;
        In.down.plunge = (now - window.__pl) < 700;
      } else { window.__pl = 0; In.down.plunge = false; }

      // flip when a ball is in range of a flipper
      let L = false, R = false;
      for (const b of G.world.balls) {
        if (b.state !== 'field') continue;
        // stuck watchdog
        if (b.speed() < 25) { stuckT[b.id] = (stuckT[b.id] || 0) + dt / 1000; }
        else stuckT[b.id] = 0;
        if (stuckT[b.id] > 5) { t.stuck++; t.stuckWorst = Math.max(t.stuckWorst, stuckT[b.id]); stuckT[b.id] = 0; }

        if (b.y > 985 && b.y < 1090) {
          if (b.x > 150 && b.x < 265) L = true;
          if (b.x > 235 && b.x < 350) R = true;
        }
        if (b.y > 470 && b.y < 700 && b.x > 330 && b.x < 470) R = true;  // upper flipper
      }
      // Pulse rather than hold — holding a flipper just cradles the ball
      // forever (which is correct behaviour, but it isn't a play test).
      const beat = Math.floor(now / 260) % 2 === 0;
      In.down.flipL = L && beat;
      In.down.flipR = R && beat;
      // where does the ball actually spend its time?
      if (t.frames % 4 === 0) {
        for (const b of G.world.balls) {
          if (b.state === 'gone') continue;
          const cell = (Math.round(b.x / 60) * 60) + ',' + (Math.round(b.y / 120) * 120) + ':' + b.state;
          t.heat = t.heat || {}; t.heat[cell] = (t.heat[cell] || 0) + 1;
        }
      }
      requestAnimationFrame(bot);
    }
    requestAnimationFrame(bot);
  });

  await new Promise(r => setTimeout(r, SECONDS * 1000));

  const tel = await page.evaluate(() => {
    const G = window.PB.Game, t = window.__tel;
    const p = G.players[0] || {};
    return {
      tel: t, state: G.state, ball: G.ballNum,
      score: p.score, bonusX: p.bonusX, locks: p.locks, modes: p.modesCompleted,
      ramps: p.bRamps, orbits: p.bOrbits, drops: p.bDrops, spins: p.bSpins,
      bumpers: p.bBumpers, targets: p.bTargets, jackpots: p.jackpots,
      mbPlayed: p.mbPlayed, balls: G.world.balls.length
    };
  });

  await page.screenshot({ path: path.join(OUT, 'soak.png') });

  const t = tel.tel;
  console.log(`--- ${SECONDS}s soak ---`);
  console.log(`frames ${t.frames}  (${(t.frames / SECONDS).toFixed(1)} fps)  worst frame ${t.worstFrame.toFixed(1)} ms  >34ms: ${t.longFrames}`);
  console.log(`state=${tel.state} ball=${tel.ball} score=${tel.score} bonusX=${tel.bonusX} locks=${tel.locks} sagas=${tel.modes} multiballs=${tel.mbPlayed}`);
  console.log(`counters: ramps=${tel.ramps} orbits=${tel.orbits} drops=${tel.drops} spins=${tel.spins} bumpers=${tel.bumpers} targets=${tel.targets} jackpots=${tel.jackpots}`);
  console.log(`shots: ${JSON.stringify(t.shots)}`);
  console.log(`drains ${t.drains}   stuck-events ${t.stuck} (worst ${t.stuckWorst.toFixed(1)}s)`);
  if (t.heat) {
    const top = Object.entries(t.heat).sort((a, b) => b[1] - a[1]).slice(0, 10);
    console.log('ball dwell (x,y:state = samples): ' + top.map(e => e[0] + '=' + e[1]).join('  '));
  }
  console.log(errs.length ? 'ERRORS:\n  ' + errs.slice(0, 12).join('\n  ') : 'no errors');

  await browser.close();
  server.close();
  process.exit(errs.length ? 1 : 0);
})().catch(e => { console.error(e); process.exit(1); });
