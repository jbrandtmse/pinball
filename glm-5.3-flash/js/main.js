/* =========================================================================
   RISE OF ATLANTIS — main.js
   Boot, input, fixed-step game loop, DMD scene composition, high scores
   with initials entry, side panels. Browser-only.
   ========================================================================= */
(function () {
  'use strict';
  const root = window;
  const U = root.AR_UTIL, P = root.AR_PHYS, T = root.AR_TABLE, R = root.AR_RULES;
  const D = root.AR_DMD, Audio = root.AR_AUDIO, Renderer = root.AR_RENDER.Renderer;

  const HS_KEY = 'atlantis.hiscores.v1';
  const DEFAULT_HS = [
    { name: 'POS', score: 5000000 }, { name: 'KRK', score: 3000000 },
    { name: 'TID', score: 2000000 }, { name: 'ATL', score: 1500000 },
    { name: 'TRI', score: 1000000 },
  ];

  function loadHS() {
    try {
      const raw = localStorage.getItem(HS_KEY);
      if (raw) { const v = JSON.parse(raw); if (Array.isArray(v) && v.length) return v; }
    } catch (e) { /* private mode etc. */ }
    return DEFAULT_HS.map(h => ({ ...h }));
  }
  function saveHS(list) {
    try { localStorage.setItem(HS_KEY, JSON.stringify(list)); } catch (e) { }
  }

  const Main = {
    attractT: 0,
    messages: [],
    entry: null,        // {rank, score, letters[], cursor}
    entryQueue: [],
    paused: false,
    panelT: 0,
  };

  // ------------------------------------------------------------------ boot
  Main.boot = function () {
    const cv = document.getElementById('machine');
    Main.cv = cv;
    Main.audio = new Audio();
    Main.hs = loadHS();

    const world = new P.World();
    const refs = T.build(world);
    const game = new R.Game(world, refs, {});
    Main.game = game;

    Main.renderer = new Renderer(cv, game);

    // wire game events -> audio & dmd
    game.em.on('sfx', (d) => {
      Main.audio.sfx(d.name);
      if (d.name === 'spinner') Main.renderer.spinVel += 3.2;
      if (d.name === 'bumper') Main.renderer.spark(game.W.balls[0] ? game.W.balls[0].x : 10, 18, '#ffe9a8', 5, 20);
      if (d.name === 'jackpot' || d.name === 'super') Main.flashT = 0.5;
      if (d.name === 'drain') Main.audio.sfx('drain');
    });
    game.em.on('dmd', (d) => {
      Main.messages.push({ ...d, until: Main.game.time + (d.dur || 1.4) });
      Main.messages.sort((a, b) => b.prio - a.prio);
    });
    game.em.on('gameover', () => {
      Main.audio.stopMusic();
      Main.audio.sfx('gameover');
      Main.queueEntry();
    });

    // input
    window.addEventListener('keydown', (e) => Main.key(e, true));
    window.addEventListener('keyup', (e) => Main.key(e, false));
    window.addEventListener('pointerdown', () => { Main.audio.init(); Main.audio.resume(); }, { once: false });

    Main.resize();
    window.addEventListener('resize', () => Main.resize());

    requestAnimationFrame(Main.frame);
  };

  Main.resize = function () {
    const cv = Main.cv;
    cv.width = window.innerWidth;
    cv.height = window.innerHeight;
    Main.renderer.layout();
    Main.renderer.drawStatic();
  };

  // ------------------------------------------------------------------ input
  const KEYS = {
    ShiftLeft: 'L', ArrowLeft: 'L', KeyZ: 'L', KeyA: 'L',
    ShiftRight: 'R', ArrowRight: 'R', Slash: 'R', KeyD: 'R', Quote: 'R',
  };

  Main.key = function (e, down) {
    if (e.repeat) return;
    Main.audio.init(); Main.audio.resume();
    const g = Main.game;
    const act = KEYS[e.code];

    // initials entry capture
    if (Main.entry) { Main.entryKey(e, down); return; }

    if (act) {
      e.preventDefault();
      if (Main.paused || g.state === 'attract' || g.state === 'gameover') {
        // attract flipper wiggle does nothing
      } else {
        g.setFlipper(act === 'L' ? -1 : 1, down);
      }
      return;
    }
    switch (e.code) {
      case 'Space':
        e.preventDefault();
        if (down && !Main.paused && g.state === 'launch') {
          g.plungerHold(true);
          Main.audio.sfx('plunger');
        } else if (!down && g._plungerHeld) {
          g.plungerHold(false);
          g.doLaunch(g._plungerP || 0.5);
        }
        break;
      case 'KeyX': if (down) g.nudge(-1); break;
      case 'Period': if (down) g.nudge(1); break;
      case 'ArrowUp': if (down) g.nudge(0); break;
      case 'Enter':
        if (down) Main.startButton();
        break;
      case 'Digit1': case 'Digit2': case 'Digit3': case 'Digit4':
        if (down && (g.state === 'attract' || g.state === 'gameover')) {
          Main.audio.sfx('addPlayer');
          g.startGame(+e.code.slice(-1));
        }
        break;
      case 'KeyM':
        if (down) {
          const m = Main.audio.toggleMute();
          if (!m) Main.audio.playMusic(Main.musicFor());
        }
        break;
      case 'KeyP':
        if (down) Main.paused = !Main.paused;
        break;
    }
  };

  Main.startButton = function () {
    const g = Main.game;
    if (g.state === 'attract' || g.state === 'gameover') {
      if (Main.entry) return;
      g.startGame(1);
      Main.messages.length = 0;
    } else if (g.state === 'launch' || g.state === 'play') {
      g.addPlayer();
    }
  };

  // ------------------------------------------------------------------ high scores
  Main.queueEntry = function () {
    const g = Main.game;
    Main.entryQueue = [];
    g.players.forEach((p, i) => {
      const rank = Main.hs.findIndex(h => p.score > h.score);
      if (rank >= 0 && p.score > 0) {
        Main.entryQueue.push({ player: i, score: p.score, rank, letters: ['A', 'A', 'A'], cursor: 0 });
      }
    });
    Main.entryQueue.sort((a, b) => a.rank - b.rank);
    Main.nextEntry();
  };

  Main.nextEntry = function () {
    if (Main.entryQueue.length) {
      Main.entry = Main.entryQueue.shift();
      Main.entry.letters = ['A', 'A', 'A'];
      Main.entry.cursor = 0;
      Main.audio.sfx('hiscore');
    } else {
      Main.entry = null;
      Main.game.state = 'attract';
      Main.attractT = 0;
    }
  };

  Main.entryKey = function (e, down) {
    if (!down) return;
    const en = Main.entry;
    if (/^Key[A-Z]$/.test(e.code)) {
      en.letters[en.cursor] = e.code.slice(3);
      en.cursor = Math.min(2, en.cursor + 1);
    } else if (/^Digit[0-9]$/.test(e.code)) {
      en.letters[en.cursor] = e.code.slice(5);
      en.cursor = Math.min(2, en.cursor + 1);
    } else if (e.code === 'Backspace') {
      en.cursor = Math.max(0, en.cursor - 1);
      en.letters[en.cursor] = 'A';
    } else if (e.code === 'Enter' || e.code === 'Space') {
      // insert into table (recompute rank at insert time)
      const name = en.letters.join('');
      const item = { name, score: en.score };
      Main.hs.splice(en.rank, 0, item);
      Main.hs.length = Math.min(Main.hs.length, 5);
      saveHS(Main.hs);
      Main.audio.sfx('save');
      Main.nextEntry();
    }
  };

  // ------------------------------------------------------------------ dmd scenes
  Main.musicFor = function () {
    const g = Main.game;
    if (g.state === 'attract' || g.state === 'gameover') return 'attract';
    if (g.mb && g.mb.active) return 'mb';
    if (g.mode) return 'mode';
    return 'play';
  };

  Main.dmdBitmap = function (t) {
    const g = Main.game;
    const bmp = D.bitmap();

    if (Main.paused) {
      D.drawCentered(bmp, 'PAUSED', 13, 1);
      return bmp;
    }
    if (Main.entry) {
      const en = Main.entry;
      D.drawCentered(bmp, 'NEW HIGH SCORE ' + (en.rank + 1), 1, 1);
      D.drawCentered(bmp, U.fmt(en.score), 8, 1);
      let x = Math.floor((D.W - (3 * 14 - 2)) / 2);
      for (let i = 0; i < 3; i++) {
        const cursorOn = i === en.cursor && Math.sin(t * 8) > 0;
        D.drawChar(bmp, en.letters[i], x, 18);
        if (cursorOn) {
          for (let yy = 17; yy < 26; yy++) for (let xx = x - 1; xx <= x + 4; xx++) {
            if (yy >= 0 && yy < D.H && xx >= 0 && xx < D.W) bmp[yy * D.W + xx] = bmp[yy * D.W + xx] ? 0 : 1;
          }
        }
        x += 14;
      }
      D.drawCentered(bmp, 'ENTER TO SAVE', 28, 1);
      return bmp;
    }

    if (g.state === 'attract') {
      const phase = Math.floor(t / 3.4) % 3;
      if (phase === 0) {
        let logo = D.bitmap();
        D.drawCentered(logo, 'RISE OF', 4, 1);
        D.drawCentered(logo, 'ATLANTIS', 12, 2);
        D.drawCentered(logo, 'WILLIAMS 1996', 28, 1);
        return D.wave(logo, t, 1.3);
      } else if (phase === 1) {
        D.drawCentered(bmp, 'HIGH  SCORES', 1, 1);
        Main.hs.slice(0, 4).forEach((h, i) => {
          D.drawText(bmp, h.name, 26, 8 + i * 6, 1);
          D.drawText(bmp, U.fmt(h.score), 52, 8 + i * 6, 1);
        });
        return bmp;
      } else {
        // kraken rising
        for (let arm = 0; arm < 3; arm++) {
          for (let s = 0; s < 14; s++) {
            const yy = 31 - ((s + Math.floor(t * 14)) % 30);
            const xx = Math.floor(64 + Math.sin(t * 2 + arm * 2.1 + s * 0.4) * (12 + s * 1.6));
            const r = 1 + (s > 9 ? 1 : 0);
            for (let dy = 0; dy < r; dy++) for (let dx = 0; dx < r; dx++) {
              const px = xx + dx, py = yy + dy;
              if (px >= 0 && px < D.W && py >= 0 && py < D.H) bmp[py * D.W + px] = 1;
            }
          }
        }
        D.drawCentered(bmp, 'PRESS ENTER', 1, 1);
        return bmp;
      }
    }

    if (g.state === 'gameover' && !Main.entry) {
      D.drawCentered(bmp, 'GAME  OVER', 4, 2);
      const p = g.players[g.cur] || g.players[0];
      if (p) D.drawCentered(bmp, U.fmt(p.score), 24, 1);
      return bmp;
    }

    // ---- in-game base scene
    const p = g.P();
    if (p) {
      // top line
      D.drawText(bmp, 'P' + (g.cur + 1), 2, 1, 1);
      D.drawText(bmp, 'B' + g.ballNum + (g.extraFlavor || ''), 16, 1, 1);
      D.drawText(bmp, 'X' + g.bonusX, 108, 1, 1);
      // score (big, right aligned)
      const s = U.fmt(p.score);
      const scale = 2;
      const w = D.textWidth(s, scale);
      D.drawText(bmp, s, D.W - w - 4, 10, scale);
      // ball-save countdown bar
      if (g.ballSaveT > 0) {
        const segs = Math.ceil(g.ballSaveT / 1);
        for (let i = 0; i < Math.min(segs, 16); i++) {
          for (let y = 26; y < 30; y++) bmp[y * D.W + (10 + i * 4)] = 1;
        }
        D.drawText(bmp, 'SAV', 0, 26, 1);
      }
      // multiball banner
      if (g.mb.active) {
        if (Math.sin(t * 10) > -0.3) D.drawCentered(bmp, g.mb.wizard ? 'POSEIDON FURY' : 'KRAKEN MULTIBALL', 26, 1);
      }
    }

    // bonus count
    if (g.bonusSeq) {
      const bs = g.bonusSeq;
      const bmp2 = D.bitmap();
      D.drawCentered(bmp2, 'BONUS  X' + g.bonusX, 4, 1);
      D.drawCentered(bmp2, U.fmt(Math.min(bs.shown, bs.units) * 25000 * g.bonusX), 13, 2);
      D.drawCentered(bmp2, bs.shown <= bs.units ? bs.shown + ' / ' + bs.units : '', 26, 1);
      return bmp2;
    }

    // overlay message (highest priority, unexpired)
    const now = g.time;
    while (Main.messages.length && Main.messages[0].until < now) Main.messages.shift();
    if (Main.messages.length) {
      const m = Main.messages[0];
      const ob = D.bitmap();
      m.lines.forEach((line, i) => {
        const scale = m.lines.length === 1 ? 2 : 1;
        D.drawCentered(ob, line, i * (scale === 2 ? 16 : 9) + 2, scale);
      });
      // combine: message over base (add)
      for (let i = 0; i < bmp.length; i++) if (ob[i]) bmp[i] = 1;
    }
    return bmp;
  };

  // ------------------------------------------------------------------ panels
  Main.updatePanels = function () {
    const g = Main.game;
    const el = (id) => document.getElementById(id);
    const scoreBox = el('players');
    if (scoreBox) {
      if (g.players.length) {
        scoreBox.innerHTML = g.players.map((p, i) => {
          const cur = i === g.cur;
          return `<div class="pcard ${cur ? 'current' : ''}">
            <div class="pname">PLAYER ${i + 1}${cur ? ' — BALL ' + g.ballNum : ''}</div>
            <div class="pscore">${U.fmt(p.score)}</div>
          </div>`;
        }).join('');
      } else {
        scoreBox.innerHTML = `<div class="pcard"><div class="pname">ATTRACT MODE</div>
          <div class="pscore">PRESS ENTER</div></div>`;
      }
    }
    const hs = el('hiscores');
    if (hs) {
      hs.innerHTML = Main.hs.map((h, i) =>
        `<div class="hrow"><span class="hrank">${i + 1}</span><span class="hname">${h.name}</span><span class="hscore">${U.fmt(h.score)}</span></div>`).join('');
    }
    const st = el('status');
    if (st) {
      let s = '';
      if (Main.paused) s = 'PAUSED — press P to resume';
      else if (Main.entry) s = 'Enter your initials';
      else if (g.state === 'attract') s = 'Press ENTER (or 1-4) to start';
      else if (g.state === 'launch') s = 'Hold SPACE to charge, release to launch';
      else if (g.tilted) s = 'TILT — flippers are dead';
      else s = 'Ball ' + g.ballNum + ' — player ' + (g.cur + 1);
      st.textContent = s;
    }
  };

  // ------------------------------------------------------------------ frame loop
  Main.last = 0;
  Main.frame = function (now) {
    requestAnimationFrame(Main.frame);
    const dt = Math.min(0.05, (now - Main.last) / 1000 || 0.016);
    Main.last = now;

    if (!Main.paused) {
      Main.game.update(dt);
    }
    if (Main.flashT > 0) Main.flashT -= dt;

    // music state
    const want = Main.musicFor();
    if (want !== Main.curMusic) {
      Main.curMusic = want;
      Main.audio.playMusic(want);
    }

    // panels at ~8Hz
    Main.panelT -= dt;
    if (Main.panelT <= 0) { Main.panelT = 0.125; Main.updatePanels(); }

    Main.renderer.draw(dt);
  };

  // expose dmdBitmap to the game object for the renderer
  const oldBoot = Main.boot;

  window.addEventListener('DOMContentLoaded', () => {
    Main.boot();
    Main.game.dmdBitmap = (t) => Main.dmdBitmap(t);
  });
  window.RISE = Main;
})();
