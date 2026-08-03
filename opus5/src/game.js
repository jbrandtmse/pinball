/* ============================================================================
 * RAGNAROK PINBALL — game.js
 * Machine state: attract, ball serve, play, bonus, game over, high scores.
 * Owns the canvas, the fixed-step loop and every mechanism callback.
 * ==========================================================================*/
(function (PB) {
  'use strict';
  var U = PB.U, P = PB.Phys, T = PB.Table, A = PB.Audio,
    D = PB.DMD, F = PB.Fonts, R = PB.Render, Art = PB.Art, In = PB.Input;

  var G = PB.Game = {};

  G.state = 'boot';
  G.paused = false;
  G.time = 0;
  G.credits = 2;
  G.ballsPerGame = 3;
  G.ballNum = 1;
  G.current = 0;
  G.players = [];
  G.flashers = {};
  G.gi = 0.6;
  G.giWarm = 1;
  G.shakeX = 0; G.shakeY = 0;
  G.baked = null;
  G.serveQueue = 0;
  G.serveTimer = 0;
  G.autoPlunge = 0;
  G.bonusStep = null;
  G.hsQueue = [];
  G.entry = null;
  G.matchT = 0;
  G.matchDigit = 0;
  G.attractScene = 0;
  G.attractT = 0;
  G.showHelp = false;

  /* Ball speed. A real cabinet is played at arm's length over a 1.17 m
   * playfield; on a monitor the same trajectories read considerably faster,
   * so the simulation runs at a fraction of real time. This scales the
   * physics only — every trajectory, shot angle and ramp threshold is
   * identical, just played back slower. 1.0 is true 6.5-degree pitch speed. */
  G.speed = U.clamp(U.store.get('ragnarok.speed', 0.70), 0.55, 1.15);
  G.SPEED_MIN = 0.55;
  G.SPEED_MAX = 1.15;

  /* --------------------------------------------------------------- player */
  G.blankPlayer = function () {
    return {
      score: 0, extraBalls: 0, extraBallsAwarded: 0,
      bonusX: 1,
      modesDone: [false, false, false, false, false, false],
      modeActive: -1, modesCompleted: 0,
      locks: 0, lockReady: false, mbPlayed: 0,
      thorMask: 0, thorCycles: 0, runeMask: 0,
      bRamps: 0, bOrbits: 0, bDrops: 0, bSpins: 0, bBumpers: 0, bTargets: 0,
      loops: 0, jackpots: 0, bestCombo: 0, skillLevel: 0,
      ebLit: false, specialLit: false, wizardDone: false,
      replayGiven: false, ballsPlayed: 0
    };
  };

  /* =================================================================== INIT */
  G.init = function () {
    this.canvas = document.getElementById('game');
    this.ctx = this.canvas.getContext('2d', { alpha: false });
    this.hs = new PB.HighScores();
    this.table = T.build();
    this.world = this.table.world;
    this.rules = new PB.Rules.Engine(this);
    this.players = [this.blankPlayer()];

    var self = this;
    this.world.onHit = function (tag, ball, info) { self.rules.onSwitch(tag, ball, info); };
    this.world.onZone = function (tag, ball, entering, z) { self.rules.onZone(tag, ball, entering, z); };
    this.world.onRampEnd = function (ball, res) { self.rampEnded(ball, res); };

    D.baseDraw = function (d, t) { self.attractDraw(d, t); };

    In.init();
    this.bindKeys();

    window.addEventListener('resize', function () { self.resize(true); });
    this.resize(false);

    this.lampLevel = function (id) { return self.rules.lampLevel(id); };

    this.enterAttract();
    this.last = U.now();
    requestAnimationFrame(function (ts) { self.loop(ts); });
  };

  /* ------------------------------------------------------------- resize */
  var rebakeTimer = null;
  G.resize = function (debounce) {
    var w = window.innerWidth, h = window.innerHeight;
    this.dpr = Math.min(2.2, window.devicePixelRatio || 1);
    this.canvas.width = Math.max(2, Math.floor(w * this.dpr));
    this.canvas.height = Math.max(2, Math.floor(h * this.dpr));
    this.canvas.style.width = w + 'px';
    this.canvas.style.height = h + 'px';
    this.layout = R.layout(w, h);
    var self = this;
    if (debounce) {
      if (rebakeTimer) clearTimeout(rebakeTimer);
      rebakeTimer = setTimeout(function () { self.rebake(); }, 130);
    } else this.rebake();
  };
  G.rebake = function () {
    var sc = this.layout.pf.scale * this.dpr;
    if (this.bakedScale && Math.abs(this.bakedScale - sc) < 0.02) return;
    this.bakedScale = sc;
    this.baked = Art.bake(this.table, sc);
    this.giLayer = Art.bakeGI(Math.min(sc, 1.1));
  };

  /* ------------------------------------------------------------ key binds */
  G.bindKeys = function () {
    var self = this;
    In.on('start', function () { self.pressStart(); });
    In.on('coin', function () {
      self.credits++;
      A.sfx.uiSelect();
      if (self.state === 'attract') self.dmdFlash('CREDITS ' + self.credits);
    });
    In.on('pause', function () {
      if (self.showHelp) { self.toggleHelp(false); return; }
      if (self.state === 'play' || self.state === 'bonus') self.setPaused(!self.paused);
    });
    In.on('help', function () { self.toggleHelp(!self.showHelp); });
    In.on('mute', function () {
      var m = A.toggleMute();
      self.dmdFlash(m ? 'SOUND OFF' : 'SOUND ON');
    });
    In.on('debug', function () { R.debug = !R.debug; });
    In.on('slower', function () { self.setSpeed(self.speed - 0.04); });
    In.on('faster', function () { self.setSpeed(self.speed + 0.04); });
    In.on('hiscore', function () {
      if (self.state === 'attract') { self.attractScene = 2; self.attractT = 0; }
    });
    In.on('fullscreen', function () {
      if (!document.fullscreenElement) { if (document.body.requestFullscreen) document.body.requestFullscreen(); }
      else document.exitFullscreen();
    });
  };

  G.toggleHelp = function (on) {
    on = !!on;
    if (on === this.showHelp) return;
    this.showHelp = on;
    var el = document.getElementById('help');
    if (el) el.classList.toggle('hidden', !on);
    if (on) {
      // opening help pauses a live game — and closing it must give the game
      // back, unless the player had paused deliberately beforehand
      if ((this.state === 'play' || this.state === 'bonus') && !this.paused) {
        this._helpPaused = true;
        this.setPaused(true);
      }
    } else if (this._helpPaused) {
      this._helpPaused = false;
      this.setPaused(false);
    }
  };
  G.setPaused = function (p) {
    this.paused = p;
    A.musicOn(!p && this.state === 'play');
    if (p) this.dmdFlash('PAUSED');
  };

  G.setSpeed = function (v) {
    this.speed = Math.round(U.clamp(v, this.SPEED_MIN, this.SPEED_MAX) * 100) / 100;
    U.store.set('ragnarok.speed', this.speed);
    A.sfx.uiMove();
    var pct = Math.round(this.speed * 100);
    D.show({
      id: 'speed', prio: 7, dur: 1.5,
      draw: (function (g) {
        return function (d, t) {
          d.clear(0);
          d.text(F.F5x7, 'BALL SPEED', 64, 2, 11, { align: 'center' });
          d.text(F.F5x7, pct + '%', 64, 12, 15, { align: 'center', scale: 2 });
          d.bar(14, 27, 100, 5,
            (g.speed - g.SPEED_MIN) / (g.SPEED_MAX - g.SPEED_MIN), 9);
        };
      })(this)
    });
  };

  G.dmdFlash = function (msg) {
    D.show({
      id: 'flash', prio: 7, dur: 1.4,
      draw: function (d, t) {
        d.clear(0);
        d.text(F.F5x7, msg, 64, 12, 14, { align: 'center' });
        d.marquee(t, 6);
      }
    });
  };

  /* ================================================================ STATES */
  G.enterAttract = function () {
    this.state = 'attract';
    this.attractScene = 0;
    this.attractT = 0;
    this.rules.allLampsOff();
    this.clearBalls();
    this.table.resetDrops();
    A.setMusic('idle', true);
    A.musicOn(true);
    var self = this;
    D.baseDraw = function (d, t) { self.attractDraw(d, t); };
    D.clearScenes();
  };

  G.pressStart = function () {
    if (this.showHelp) { this.toggleHelp(false); return; }
    A.init(); A.resume();

    if (this.state === 'attract') {
      if (this.credits <= 0) { this.dmdFlash('INSERT COIN'); A.sfx.uiMove(); return; }
      this.credits--;
      this.startGame(1);
    } else if (this.state === 'play' && this.ballNum === 1 && this.players.length < 4 &&
      this.world.balls.length <= 1 && !this.rules.mbActive) {
      // classic "add a player during ball one"
      if (this.credits <= 0) { this.dmdFlash('INSERT COIN'); return; }
      this.credits--;
      this.players.push(this.blankPlayer());
      A.sfx.gameStart();
      this.dmdFlash('PLAYER ' + this.players.length);
    } else if (this.state === 'gameover') {
      this.enterAttract();
    }
  };

  G.startGame = function (n) {
    this.players = [];
    for (var i = 0; i < n; i++) this.players.push(this.blankPlayer());
    this.current = 0;
    this.ballNum = 1;
    this.state = 'play';
    this.paused = false;
    D.clearScenes();
    var self = this;
    D.baseDraw = function (d, t) { self.rules.baseDraw(d, t); };
    A.sfx.gameStart();
    A.musicOn(true);
    this.gi = 1;
    this.startBall();
  };

  G.startBall = function () {
    var p = this.players[this.current];
    p.ballsPlayed++;
    this.rules.startBall();
    this.clearBalls();
    this.table.scoop.locked = 0;
    this.serve(1, 0.55);
    D.show({
      id: 'ballstart', prio: 5, dur: 1.7,
      draw: (function (g) {
        return function (d, t) {
          d.clear(0);
          d.text(F.F5x7, 'BALL ' + g.ballNum, 64, 6, 14, { align: 'center', scale: 2 });
          if (g.players.length > 1)
            d.text(F.F5x7, 'PLAYER ' + (g.current + 1), 64, 24, 11, { align: 'center' });
          else d.text(F.F5x7, 'PULL THE SHOOTER ROD', 64, 24, 9, { align: 'center' });
        };
      })(this)
    });
  };

  /* ------------------------------------------------------------ ball serve */
  G.serve = function (n, delay) {
    this.serveQueue += n;
    this.serveTimer = Math.max(this.serveTimer, delay || 0.3);
  };
  G.doServe = function () {
    var b = this.world.spawn(T.K.plunger.x, 1138);
    b.vy = 0; b.vx = 0;
    b.newBall = true;
    this.table.plunger.ball = b;
    this.table.plunger.power = 0;
    A.sfx.kicker();
    return b;
  };
  G.clearBalls = function () {
    this.world.balls.length = 0;
    this.table.plunger.ball = null;
    this.table.scoop.ball = null;
    this.table.scoop.pending = null;
  };
  G.ballsLive = function () {
    var n = 0;
    for (var i = 0; i < this.world.balls.length; i++)
      if (this.world.balls[i].state !== 'gone') n++;
    return n + (this.table.scoop.ball ? 0 : 0);
  };

  /** Eject extra balls out of the vault, staggered. */
  G.addBalls = function (n) {
    this.pendingEject = (this.pendingEject || 0) + n;
    this.ejectTimer = 0.5;
  };

  /* ---------------------------------------------------------------- drain */
  G.ballDrained = function (ball) {
    if (ball.state === 'gone') return;
    ball.state = 'gone';
    this.world.remove(ball);
    if (this.state !== 'play') return;

    var live = this.ballsLive() + (this.pendingEject || 0) + this.serveQueue;

    if (this.rules.ballSave > 0 && !this.rules.tilted) {
      A.sfx.ballSave();
      this.dmdBallSaved();
      this.serve(1, 0.5);
      this.autoPlunge = 1.6;
      return;
    }
    A.sfx.drain();

    if (this.rules.mbActive && live <= 1) this.rules.endMultiball();
    if (this.rules.wizard && live <= 1) this.rules.endWizard();

    if (live <= 0) this.endBall();
  };

  G.dmdBallSaved = function () {
    D.show({
      id: 'save', prio: 8, dur: 1.8,
      draw: function (d, t) {
        d.clear(0);
        var on = Math.floor(t * 9) % 2 === 0;
        d.text(F.F5x7, 'BALL SAVED', 64, 8, on ? 15 : 9, { align: 'center', scale: 2 });
        d.marquee(t, on ? 12 : 4);
      }
    });
  };

  /* ------------------------------------------------------------- end ball */
  G.endBall = function () {
    var p = this.players[this.current];
    this.state = 'bonus';
    this.table.plunger.ball = null;
    if (p.modeActive >= 0) this.rules.endMode(false);
    this.rules.allLampsOff();
    A.musicOn(false);

    var self = this;
    if (this.rules.tilted) {
      D.show({
        id: 'nobonus', prio: 11, dur: 1.8,
        draw: function (d) {
          d.clear(0);
          d.text(F.F5x7, 'TILT', 64, 4, 13, { align: 'center', scale: 2 });
          d.text(F.F5x7, 'NO BONUS', 64, 22, 10, { align: 'center' });
        }
      });
      this.bonusStep = (function () {
        var t = 0;
        return function (dt) { t += dt; return t > 1.9; };
      })();
    } else {
      this.bonusStep = PB.Rules.bonusScenes(this, p, function () { });
    }
  };

  G.afterBonus = function () {
    var p = this.players[this.current];
    this.bonusStep = null;
    this.checkReplay();

    if (p.extraBalls > 0 && !this.rules.tilted) {
      p.extraBalls--;
      this.state = 'play';
      A.musicOn(true);
      A.sfx.knocker();
      D.show({
        id: 'shootagain', prio: 9, dur: 2.0,
        draw: function (d, t) {
          d.clear(0);
          d.text(F.F5x7, 'SHOOT AGAIN', 64, 10, Math.floor(t * 8) % 2 ? 15 : 9, { align: 'center', scale: 2 });
        }
      });
      this.startBall();
      return;
    }

    // next player / next ball
    var next = this.current + 1;
    if (next >= this.players.length) {
      next = 0;
      this.ballNum++;
    }
    this.current = next;

    if (this.ballNum > this.ballsPerGame) { this.gameOver(); return; }
    this.state = 'play';
    A.musicOn(true);
    this.startBall();
  };

  /* ------------------------------------------------------------- game over */
  G.gameOver = function () {
    this.state = 'gameover';
    this.clearBalls();
    this.rules.allLampsOff();
    A.sfx.gameOver();
    A.setMusic('idle', true);
    A.musicOn(true);
    this.gi = 0.7;

    // queue high-score entries
    this.hsQueue = [];
    for (var i = 0; i < this.players.length; i++) {
      var p = this.players[i];
      var cats = [];
      if (this.hs.beatsCat('loop', p.loops)) cats.push(['loop', p.loops]);
      if (this.hs.beatsCat('jackpot', p.jackpots)) cats.push(['jackpot', p.jackpots]);
      if (this.hs.beatsCat('ramp', p.bRamps)) cats.push(['ramp', p.bRamps]);
      if (this.hs.beatsCat('spinner', p.bSpins)) cats.push(['spinner', p.bSpins]);
      if (this.hs.place(p.score) >= 0) this.hsQueue.push({ kind: 'score', player: i });
      for (var c = 0; c < cats.length; c++)
        this.hsQueue.push({ kind: 'cat', player: i, cat: cats[c][0], value: cats[c][1] });
    }

    var self = this;
    D.show({
      id: 'gameover', prio: 10, dur: 3.4,
      draw: function (d, t) {
        d.clear(0);
        d.text(F.F5x7, 'GAME OVER', 64, 3, 14, { align: 'center', scale: 2 });
        var p0 = self.players[0];
        d.text(F.F5x7, U.commas(self.players.length === 1 ? p0.score : self.bestScore()), 64, 22, 11, { align: 'center' });
        d.marquee(t, 6);
      },
      onEnd: function () { self.nextGameOverStep(); }
    });
  };

  G.bestScore = function () {
    var b = 0;
    for (var i = 0; i < this.players.length; i++) b = Math.max(b, this.players[i].score);
    return b;
  };

  G.nextGameOverStep = function () {
    var self = this;
    if (this.hsQueue.length) {
      var job = this.hsQueue.shift();
      var p = this.players[job.player];
      if (job.kind === 'score') {
        var place = this.hs.place(p.score);
        var title = place === 0 ? 'GRAND CHAMPION' : 'GREAT SCORE';
        this.entry = new PB.InitialsEntry(function (init) {
          self.hs.insert(init, p.score);
          self.entry = null;
          self.nextGameOverStep();
        }, title, self.players.length > 1 ? 'PLAYER ' + (job.player + 1) : '');
        A.sfx.knocker();
      } else {
        this.entry = new PB.InitialsEntry(function (init) {
          self.hs.setCat(job.cat, init, job.value);
          self.entry = null;
          self.nextGameOverStep();
        }, self.hs.cats[job.cat].label, job.value + ' ' + self.hs.cats[job.cat].unit);
      }
      this.state = 'hsentry';
      return;
    }
    // match
    this.state = 'match';
    this.matchT = 0;
    this.matchDigit = U.rng.int(10);
    A.duck(0.3, 1);
  };

  G.runMatch = function (dt) {
    this.matchT += dt;
    var self = this;
    var spin = this.matchT < 2.2;
    var shown = spin ? U.rng.int(10) : this.matchDigit;
    if (!this._matchScene) {
      this._matchScene = true;
      D.show({
        id: 'match', prio: 10, dur: 0,
        draw: function (d, t) {
          d.clear(0);
          d.text(F.F5x7, 'MATCH', 64, 1, 10, { align: 'center' });
          var s = (self.matchT < 2.2 ? U.rng.int(10) : self.matchDigit) + '0';
          d.text(F.FBIG, s, 64, 10, 15, { align: 'center' });
        }
      });
    }
    if (this.matchT > 2.2 && !this._matchDone) {
      this._matchDone = true;
      var won = false;
      for (var i = 0; i < this.players.length; i++) {
        if (Math.floor(this.players[i].score / 10) % 10 === this.matchDigit &&
          this.players[i].score > 0) won = true;
      }
      if (won) {
        this.credits++;
        A.sfx.knocker();
        setTimeout(function () { A.sfx.knocker(); }, 200);
        this.dmdFlash('MATCH  CREDIT');
      }
    }
    if (this.matchT > 4.2) {
      D.kill('match');
      this._matchScene = false;
      this._matchDone = false;
      this.enterAttract();
    }
  };

  /* --------------------------------------------------------------- replay */
  G.checkReplay = function () {
    var p = this.players[this.current];
    if (!p || p.replayGiven) return;
    if (p.score >= this.hs.replayLevel) {
      p.replayGiven = true;
      this.credits++;
      A.sfx.knocker();
      this.rules.dmdBig('REPLAY', U.commas(this.hs.replayLevel), 2.6, 15);
    }
  };

  /* ============================================================ MECHANISMS */
  G.enterRamp = function (ball, ramp) {
    var path = ramp.path;
    var T0 = path.tangent(0);
    var v = ball.vx * T0.x + ball.vy * T0.y;
    if (v < 260) v = Math.max(260, ball.speed() * 0.8);
    ball.state = 'ramp';
    ball.ramp = { path: path, ramp: ramp, s: 0, v: v };
    ball.z = 0;
    ball.trail.length = 0;
    A.sfx.rampEnter();
  };

  G.rampEnded = function (ball, res) {
    var r = ball.ramp;
    if (!r) return;
    var path = r.path, ramp = r.ramp;
    if (res === 'exit') {
      var Te = path.tangent(path.length);
      var pe = path.at(path.length);
      ball.x = pe.x; ball.y = pe.y; ball.z = 0;
      var ve = Math.max(360, Math.abs(r.v));
      ball.vx = Te.x * ve; ball.vy = Te.y * ve;
      ball.state = 'field'; ball.ramp = null;
      this.rules.rampMade(ramp);
    } else {
      var Tb = path.tangent(0);
      var pb = path.at(0);
      ball.x = pb.x; ball.y = pb.y + 6; ball.z = 0;
      var vb = Math.max(320, Math.abs(r.v)) * 0.75;
      ball.vx = -Tb.x * vb + U.rng.jit(120);
      ball.vy = -Tb.y * vb;
      ball.state = 'field'; ball.ramp = null;
      this.rules.rampRolledBack(ramp);
    }
  };

  G.captureScoop = function (ball) {
    var sc = this.table.scoop;
    if (sc.ball) return;
    ball.state = 'captured';
    ball.vx = ball.vy = 0;
    ball.x = sc.x; ball.y = sc.y;
    sc.ball = ball;
    sc.timer = sc.holdTime;
    sc.pending = null;
    this.rules.scoopCaptured(ball);
  };

  G.ejectScoop = function () {
    var sc = this.table.scoop;
    var ball = sc.ball;
    sc.ball = null;
    sc.cooldown = 0.55;
    if (!ball) return;
    ball.state = 'field';
    ball.x = sc.capX; ball.y = sc.capY + 4;
    ball.z = 0;
    ball.kick(sc.ejectDir, sc.ejectSpeed * U.rng.range(0.94, 1.06), 9);
    ball.trail.length = 0;
    A.sfx.kicker();
  };

  G.lockScoopBall = function () {
    var sc = this.table.scoop;
    if (!sc.ball) return;
    this.world.remove(sc.ball);
    sc.ball.state = 'gone';
    sc.ball = null;
    sc.locked++;
    sc.cooldown = 0.6;
  };

  /* ================================================================= UPDATE */
  G.update = function (dt) {
    this.time += dt;
    var self = this;

    /* ---- global keys that work in any state ---- */
    if (this.entry) {
      this.entry.update(dt);
      if (In.pressed.flipL) this.entry.move(-1);
      if (In.pressed.flipR) this.entry.move(1);
      if (In.pressed.start || In.pressed.plunge) this.entry.select();
      D.show({
        id: 'entry', prio: 13, dur: 0,
        draw: function (d) { self.entry.draw(d); }
      });
      D.update(dt);
      return;
    } else D.kill('entry');

    if (this.state === 'match') { this.runMatch(dt); D.update(dt); this.decayFx(dt); return; }

    if (this.state === 'attract') {
      this.attractT += dt;
      if (this.attractT > 6.5) { this.attractT = 0; this.attractScene = (this.attractScene + 1) % 6; }
      this.gi = 0.42 + 0.16 * U.pulse(this.time, 4.5);
      this.attractLamps(dt);
      this.decayFx(dt);
      D.update(dt);
      A.tickMusic();
      return;
    }

    if (this.paused || this.showHelp) { D.update(dt); return; }

    if (this.state === 'gameover') { this.decayFx(dt); D.update(dt); A.tickMusic(); return; }

    if (this.state === 'bonus') {
      if (this.bonusStep && this.bonusStep(dt)) this.afterBonus();
      this.decayFx(dt);
      D.update(dt);
      A.tickMusic();
      return;
    }

    /* ======================= PLAY ======================= */
    this.handleFlippers();
    this.handleNudge(dt);
    this.handlePlunger(dt);

    /* serve queue */
    if (this.serveQueue > 0) {
      this.serveTimer -= dt;
      if (this.serveTimer <= 0) {
        this.serveQueue--;
        this.doServe();
        this.serveTimer = 0.5;
      }
    }
    /* multiball ejects out of the vault */
    if (this.pendingEject > 0) {
      this.ejectTimer -= dt;
      if (this.ejectTimer <= 0) {
        this.pendingEject--;
        this.ejectTimer = 0.42;
        var nb = this.world.spawn(this.table.scoop.capX, this.table.scoop.capY + 4);
        nb.kick(-90, 1750 * U.rng.range(0.92, 1.08), 13);
        A.sfx.kicker();
        this.table.scoop.flash = 1;
        this.rules.flash('f_scoop', 0.8);
      }
    }

    /* physics — run in "table time" so the ball is readable on a monitor */
    var pdt = dt * this.speed;
    this.world.advance(pdt);
    this.shakeX = this.world.shakeX;
    this.shakeY = this.world.shakeY;

    /* scoop timing */
    var sc = this.table.scoop;
    if (sc.cooldown > 0) sc.cooldown -= dt;
    if (sc.ball) {
      sc.timer -= dt;
      if (sc.timer <= 0) {
        var act = this.rules.scoopResolve();
        if (act === 'eject') this.ejectScoop();
        else if (act === 'hold') {
          // ball is consumed by a lock or by multiball start
          if (this.rules.mbActive || this.rules.wizard) this.ejectScoop();
          else { this.lockScoopBall(); this.serve(1, 0.8); this.autoPlunge = 2.0; }
        }
      }
    }
    // slow ball resting over the hole falls in
    if (!sc.ball && sc.cooldown <= 0) {
      for (var i = 0; i < this.world.balls.length; i++) {
        var b = this.world.balls[i];
        if (b.state !== 'field') continue;
        if (U.dist(b.x, b.y, sc.capX, sc.capY) < 20 && b.speed() < 190) { this.captureScoop(b); break; }
      }
    }

    this.table.update(pdt);
    this.rules.update(dt);
    this.updateBalls(dt);
    this.decayFx(dt);

    /* GI behaviour */
    var giTarget = 1;
    if (this.rules.tilted) giTarget = 0.22;
    else if (this.rules.mbActive) giTarget = 0.88 + 0.22 * (Math.sin(this.time * 9) > 0 ? 1 : 0);
    else if (this.rules.wizard) giTarget = 0.6 + 0.5 * U.pulse(this.time, 0.35);
    this.gi = U.damp(this.gi, giTarget, 0.001, dt);
    this.giWarm = this.rules.mbActive ? 1.5 : 1;

    D.update(dt);
    A.tickMusic();
  };

  /* ------------------------------------------------------------- flippers */
  G.handleFlippers = function () {
    var t = this.table;
    var dead = this.rules.tilted;
    var l = !dead && !!In.down.flipL;
    var r = !dead && !!In.down.flipR;
    if (l !== t.flipperL.up) { t.flipperL.up = l; l ? A.sfx.flipperUp(1) : A.sfx.flipperDown(); }
    if (r !== t.flipperR.up) {
      t.flipperR.up = r;
      t.flipperU.up = r;
      r ? A.sfx.flipperUp(0.85) : A.sfx.flipperDown();
    }
    // pre-launch: flippers cycle the skill shot
    if (this.rules.skillLive && this.table.plunger.ball) {
      if (In.pressed.flipL) {
        this.rules.skillIdx = (this.rules.skillIdx + 4) % 5;
        A.sfx.uiMove(); this.rules.refreshLamps();
      }
      if (In.pressed.flipR) {
        this.rules.skillIdx = (this.rules.skillIdx + 1) % 5;
        A.sfx.uiMove(); this.rules.refreshLamps();
      }
    }
  };

  /* --------------------------------------------------------------- nudge */
  G.handleNudge = function (dt) {
    var w = this.world;
    if (this.rules.tilted) return;
    if (In.pressed.nudgeL) { w.nudge(-1, 0.15, 1); this.rules.nudged(1); A.sfx.flipperDown(); }
    if (In.pressed.nudgeR) { w.nudge(1, 0.15, 1); this.rules.nudged(1); A.sfx.flipperDown(); }
    if (In.pressed.nudgeU) { w.nudge(0, -1, 0.9); this.rules.nudged(0.9); A.sfx.flipperDown(); }
  };

  /* ------------------------------------------------------------- plunger */
  G.handlePlunger = function (dt) {
    var pl = this.table.plunger;
    var i;
    if (!pl.ball) {
      for (i = 0; i < this.world.balls.length; i++) {
        var b = this.world.balls[i];
        if (b.state === 'field' && b.x > T.K.shooterX0 && b.y > 1090 && Math.abs(b.vy) < 90) { pl.ball = b; break; }
      }
    } else if (pl.ball.state !== 'field' || pl.ball.y < 1070 || pl.ball.x < T.K.shooterX0) {
      pl.ball = null;
      pl.power = 0;
    }

    if (this.autoPlunge > 0) {
      this.autoPlunge -= dt;
      if (this.autoPlunge <= 0 && pl.ball) { pl.power = 0.86; this.firePlunger(); return; }
    }

    if (In.down.plunge && pl.ball) {
      if (!pl.pulling) { pl.pulling = true; A.sfx.plungerPull(); }
      pl.power = Math.min(1, pl.power + dt * 0.95);
      pl.ball.vy = 0; pl.ball.vx = 0;
      pl.ball.y = 1138;
    } else if (pl.pulling) {
      this.firePlunger();
    }
  };

  G.firePlunger = function () {
    var pl = this.table.plunger;
    pl.pulling = false;
    if (!pl.ball) { pl.power = 0; return; }
    var p = U.clamp(pl.power, 0.08, 1);
    A.sfx.plungerRelease(p);
    pl.ball.vy = -(1560 + 2760 * p);
    pl.ball.vx = U.rng.jit(26);
    pl.ball.newBall = false;
    pl.release = 1;
    pl.power = 0;
    pl.ball = null;
    if (this.rules.ballSave <= 0) this.rules.ballLaunched();
    this.rules.refreshLamps();
  };

  /* ----------------------------------------------------------- ball upkeep */
  G.updateBalls = function (dt) {
    var balls = this.world.balls;
    for (var i = balls.length - 1; i >= 0; i--) {
      var b = balls[i];
      if (b.state === 'gone') { this.world.remove(b); continue; }

      // motion trail
      if (b.state === 'field' || b.state === 'ramp') {
        var sp = b.state === 'ramp' ? Math.abs(b.ramp.v) : b.speed();
        if (sp > 900) {
          b.trail.push([b.x, b.y + (b.z || 0) * 0.13]);
          if (b.trail.length > 7) b.trail.shift();
        } else if (b.trail.length) b.trail.shift();
      }

      if (b.state !== 'field') continue;

      // safety net: a ball outside the cabinet is teleported back
      if (b.x < -30 || b.x > T.W + 30 || b.y < -60) {
        b.x = U.clamp(b.x, 40, T.W - 40);
        b.y = Math.max(80, b.y);
        b.vx *= 0.3; b.vy = Math.abs(b.vy) * 0.3 + 300;
      }
      if (b.y > T.H + 60) { this.ballDrained(b); continue; }

      // stuck-ball rescue (a real machine's ball-search relay)
      if (b.speed() < 26 && !this.table.plunger.ball) {
        b.stuckT += dt;
        if (b.stuckT > 4.5) {
          this.world.nudge(U.rng.range(-1, 1), -0.6, 0.9);
          b.stuckT = 2.5;
        }
        if (b.stuckT > 12) { this.ballDrained(b); }
      } else b.stuckT = 0;
    }
  };

  /* ------------------------------------------------------------ fx decay */
  G.decayFx = function (dt) {
    for (var k in this.flashers) {
      var v = this.flashers[k] - dt * 3.4;
      this.flashers[k] = v > 0 ? v : 0;
    }
    this.shakeX = this.world.shakeX;
    this.shakeY = this.world.shakeY;
    this.world.shakeX *= Math.pow(0.0006, dt);
    this.world.shakeY *= Math.pow(0.0006, dt);
  };

  /* ========================================================= ATTRACT MODE */
  G.attractLamps = function (dt) {
    var r = this.rules;
    var ph = Math.floor(this.time * 4);
    var ids = ['a_lorbit', 'a_lramp', 'a_scoop', 'a_rramp', 'a_rorbit'];
    for (var i = 0; i < ids.length; i++)
      r.setLamp(ids[i], (ph % ids.length) === i ? 'on' : 'off');
    for (var m = 0; m < 6; m++) r.setLamp('mode' + m, (Math.floor(this.time * 6) % 6) === m ? 'on' : 'off');
    for (var l = 0; l < 4; l++) r.setLamp('lane' + l, (Math.floor(this.time * 5) % 4) === l ? 'on' : 'off');
    r.setLamp('ragnarok', Math.floor(this.time * 2) % 2 ? 'on' : 'off');
    r.setLamp('multiball', Math.floor(this.time * 2) % 2 ? 'off' : 'on');
    for (var b = 0; b < 3; b++) r.setLamp('bumper' + b, (Math.floor(this.time * 8) % 3) === b ? 'on' : 'off');
    if (Math.floor(this.time * 1.5) % 4 === 0 && Math.random() < 0.06)
      r.flash(U.rng.pick(Art.FLASHERS).id, 0.8);
    r.t += dt;
    for (var k in r.lamps) r.lamps[k].t += dt;
  };

  G.attractDraw = function (d, t) {
    var self = this;
    var sc = this.attractScene, at = this.attractT;
    d.clear(0);
    switch (sc) {
      case 0: {   // title
        var slide = U.easeOutCubic(U.clamp(at / 0.7, 0, 1));
        var y = Math.round(U.lerp(-14, 3, slide));
        d.text(F.F5x7, 'RAGNARÖK', 64, y, 15, { align: 'center', scale: 2 });
        if (at > 0.8) d.text(F.F5x7, 'HAMMER OF THE GODS', 64, 22, 10, { align: 'center' });
        for (var i = 0; i < 4; i++) {
          var bx = 2 + ((Math.floor(at * 30) + i * 34) % 140) - 8;
          d.bolt(bx, 24, 1, 6);
        }
        d.marquee(at, 12);
        break;
      }
      case 1: {   // insert coin / press start
        var flick = Math.floor(at * 3) % 2;
        if (this.credits > 0) {
          d.text(F.F5x7, 'PRESS  ENTER', 64, 4, flick ? 15 : 8, { align: 'center', scale: 2 });
          d.text(F.F5x7, 'CREDITS ' + this.credits, 64, 24, 11, { align: 'center' });
        } else {
          d.text(F.F5x7, 'INSERT COIN', 64, 4, flick ? 15 : 8, { align: 'center', scale: 2 });
          d.text(F.F5x7, 'PRESS 5', 64, 24, 11, { align: 'center' });
        }
        break;
      }
      case 2: {   // high scores
        d.text(F.F5x7, 'HIGHEST SCORES', 64, 0, 11, { align: 'center' });
        var n = Math.min(4, this.hs.list.length);
        for (var s = 0; s < n; s++) {
          var e = this.hs.list[s];
          var yy = 9 + s * 6;
          d.text(F.F5x7, (s + 1) + ' ' + e.initials, 2, yy, s === 0 ? 15 : 9);
          d.text(F.F5x7, U.commas(e.score), 126, yy, s === 0 ? 15 : 9, { align: 'right' });
        }
        break;
      }
      case 3: {   // category champions
        var keys = ['loop', 'jackpot', 'ramp', 'spinner'];
        var k = keys[Math.floor(at / 1.7) % keys.length];
        var c = this.hs.cats[k];
        d.text(F.F5x7, c.label, 64, 3, 12, { align: 'center' });
        d.text(F.F5x7, c.initials, 40, 15, 15, { align: 'center', scale: 2 });
        d.text(F.F5x7, c.value + ' ' + c.unit, 90, 19, 10, { align: 'center' });
        d.marquee(at, 5);
        break;
      }
      case 4: {   // rules teaser
        var msgs = [
          ['SMASH THE JOTUNN', 'TO OPEN THE WELL'],
          ['LOCK 3 BALLS FOR', 'MJOLNIR MULTIBALL'],
          ['COMPLETE 6 SAGAS', 'TO LIGHT RAGNAROK'],
          ['LOOP THE ORBIT', 'FOR BIG COMBOS']
        ];
        var m = msgs[Math.floor(at / 1.6) % msgs.length];
        d.text(F.F5x7, m[0], 64, 6, 13, { align: 'center' });
        d.text(F.F5x7, m[1], 64, 18, 10, { align: 'center' });
        break;
      }
      case 5: {   // controls
        d.text(F.F5x7, 'SHIFT KEYS FLIP', 64, 2, 12, { align: 'center' });
        d.text(F.F5x7, 'SPACE LAUNCHES', 64, 12, 11, { align: 'center' });
        d.text(F.F5x7, 'Z X C TO NUDGE', 64, 22, 10, { align: 'center' });
        break;
      }
    }
  };

  /* ================================================================== LOOP */
  G.loop = function (ts) {
    var self = this;
    var dt = (ts - this.last) / 1000;
    this.last = ts;
    if (!(dt > 0)) dt = 1 / 60;
    if (dt > 0.05) dt = 0.05;

    this.update(dt);
    In.endFrame();

    var ctx = this.ctx;
    ctx.setTransform(this.dpr, 0, 0, this.dpr, 0, 0);
    R.frame(ctx, this);

    requestAnimationFrame(function (t2) { self.loop(t2); });
  };

  /* =================================================================== BOOT */
  function boot() {
    var btn = document.getElementById('bootBtn');
    var veil = document.getElementById('boot');
    var closeHelp = document.getElementById('helpClose');
    if (closeHelp) closeHelp.addEventListener('click', function () { G.toggleHelp(false); });

    G.init();

    function go() {
      A.init(); A.resume();
      A.musicOn(true);
      G.credits++;
      veil.classList.add('hidden');
      G.dmdFlash('CREDITS ' + G.credits);
      A.sfx.uiSelect();
      window.removeEventListener('keydown', keyGo);
    }
    function keyGo(e) {
      if (e.code === 'Enter' || e.code === 'Space' || e.code === 'Digit5') go();
    }
    btn.addEventListener('click', go);
    window.addEventListener('keydown', keyGo);
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', boot);
  else boot();

})(window.PB = window.PB || {});
