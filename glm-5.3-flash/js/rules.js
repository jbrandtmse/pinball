/* =========================================================================
   RISE OF ATLANTIS — rules.js
   Williams-WPC-style rule stack: skill shot, TIDE lanes + bonus multiplier,
   Current Combo, Trident mystery, Pearl locks -> Kraken Multiball, four
   RISE modes -> Poseidon's Fury wizard, kickback, ball save, extra ball,
   end-of-ball bonus, tilt. Node-safe.
   ========================================================================= */
(function (root) {
  'use strict';
  const U = root.AR_UTIL;
  const P = root.AR_PHYS;

  const MODES = [
    { id: 'tower', name: 'TOWER OF POSEIDON', dur: 25, shots: 5, hit: 40000, bonus: 400000 },
    { id: 'pearls', name: 'HALL OF PEARLS', dur: 30, banks: 3, hit: 100000, bonus: 300000 },
    { id: 'tides', name: 'TEMPLE OF TIDES', dur: 15, spins: 15, spinVal: 5000, bonus: 250000 },
    { id: 'crown', name: 'CROWN OF ATLAS', dur: 24,
      seq: ['rampL', 'orbR', 'rampR', 'orbL'], start: 150000, bonus: 400000 },
  ];

  const GIFTS = [
    { id: 'pts100', label: '100,000', w: 3 },
    { id: 'pts250', label: '250,000', w: 2 },
    { id: 'bonusx', label: 'BONUS X', w: 2 },
    { id: 'kickback', label: 'KICKBACK', w: 2 },
    { id: 'extraball', label: 'EXTRA BALL', w: 1 },
    { id: 'hold', label: 'HOLD BONUS', w: 2 },
  ];

  function Game(world, refs, opts) {
    const o = opts || {};
    this.rng = o.rng || U.rng;
    this.headless = !!o.headless;
    this.em = new U.Emitter();       // game events for audio/dmd/ui

    // world
    this.W = world;
    this.refs = refs;
    this.time = 0;

    // game state
    this.state = 'attract';          // attract|launch|play|bonus|gameover|entry
    this.players = [];
    this.cur = 0;
    this.ballNum = 1;
    this.ballsPerGame = 3;
    this.extraBalls = 0;
    this.bonusHold = false;
    this.shootAgain = false;

    // per-ball (mirrored into player at drain)
    this.bonusX = 1;
    this.tideLanes = [false, false, false, false];
    this.tideComplete = 0;
    this.tridents = [false, false, false];
    this.drops = [false, false, false];
    this.combo = 0; this.comboT = 0;
    this.bumperHits = 0; this.tidalSurge = false;

    // locks / multiball
    this.lockLit = false;
    this.locks = 0;
    this.mb = { active: false, live: 0, jackpots: 0, superLit: false, wizard: false, t: 0 };

    // modes
    this.modesDone = [false, false, false, false];
    this.mode = null;                // {idx, t, shots|banks|spins|seqStep, val}
    this.furyLit = false;
    this.fury = null;                // {t, jackpots, superDone}

    // flags
    this.kickbackLit = false;
    this.skillLane = 0;              // alternates 0=orbit,1=rampL
    this.skillAvail = false;
    this.launchT = -99;
    this.ballSaveT = 0;
    this.noBonus = false;
    this.tiltWarnings = 0; this.tilted = false; this.tiltT = 0;
    this.lastSwitchT = 0; this.searchStage = 0;

    // plumbing
    this.ejectQ = [];                // {t, fn}
    this.bonusSeq = null;            // end-of-ball bonus animation state
    this.msg = null; this.msgT = 0;  // transient dmd message
    this._wire();
  }

  Game.prototype.emit = function (type, data) { this.em.emit(type, data); };

  Game.prototype.say = function (lines, dur, prio) {
    if (this.headless) return;
    this.em.emit('dmd', { lines, dur: dur || 1.4, prio: prio || 0 });
  };

  Game.prototype.sfx = function (name, data) {
    this.em.emit('sfx', Object.assign({ name }, data || {}));
  };

  // ---------------- wiring -------------------------------------------------
  Game.prototype._wire = function () {
    const W = this.W, R = this.refs;
    W.em.on('launch', (b, v) => {
      this.launchT = this.time;
      this.skillAvail = true;
      this.ballSaveT = Math.max(this.ballSaveT, this.mb.active ? 12 : 8);
      this.sfx('launch', { power: v });
    });
    W.em.on('sensor:spinner', (b, spd) => this._spinner(b, spd));
    W.em.on('sensor:orbitTop', (b) => { b.passedSpinner = true; });
    for (let i = 0; i < 4; i++) W.em.on('sensor:tide' + i, (b) => this._tide(i, b));
    W.em.on('sensor:inlaneL', () => this._award(500, 'inlane'));
    W.em.on('sensor:inlaneR', () => this._award(500, 'inlane'));
    W.em.on('sensor:outlaneL', () => this._award(250, 'outlane'));
    W.em.on('sensor:outlaneR', () => this._award(250, 'outlane'));
    W.em.on('bumper', (b, spd) => this._bumper(b, spd));
    for (const s of W.segs) {
      if (s.sling) W.em.on(s.id + ':kick', () => this._sling());
      if (s.target) W.em.on('target:' + s.target.id, (b, spd) => this._target(s.target.id, b, spd));
    }
    W.em.on('rampEnter:rampL', (b, spd) => this._ramp('rampL', b, spd));
    W.em.on('rampEnter:rampR', (b, spd) => this._ramp('rampR', b, spd));
    W.em.on('rampExit:rampL', () => this.sfx('ramp'));
    W.em.on('rampExit:rampR', () => this.sfx('ramp'));
    W.em.on('orbitDep:orbL', (b) => this._orbit('orbL', b));
    W.em.on('orbitDep:orbR', (b) => this._orbit('orbR', b));
    W.em.on('kickback', () => {
      this.kickbackLit = false;
      this._award(5000, 'kickback');
      this.say(['KICKBACK'], 1.2);
      this.sfx('kickback');
    });
    W.em.on('captured:saucer', (b, spd) => this._saucer(b));
    W.em.on('captured:trough', (b) => this._trough(b));
  };

  // ---------------- helpers ------------------------------------------------
  Game.prototype.P = function () { return this.players[this.cur]; };

  Game.prototype._award = function (pts, kind, ball) {
    if (this.state !== 'play' && this.state !== 'launch') return 0;
    if (this.tilted) return 0;
    const p = this.P();
    if (!p) return 0;
    const prevLevel = Math.floor(p.score / 1500000);
    p.score += pts;
    this.emit('score', { pts, kind });
    if (!p.ebLit && Math.floor(p.score / 1500000) > prevLevel) {
      p.ebLit = true;
      this.say(['EXTRA BALL', 'LIT'], 2, 1);
      this.sfx('ebLit');
    }
    return pts;
  };

  Game.prototype.plungerHold = function (held) {
    this._plungerHeld = held;
  };

  Game.prototype.plungerPower = function () {
    // 0..1 ramp while held
    if (this.state !== 'launch' || !this._plungerHeld) return 0;
    this._plungerP = Math.min(1, (this._plungerP || 0) + 1 / 1.1 * (1 / 60));
    return this._plungerP;
  };

  Game.prototype.doLaunch = function (power) {
    const b = this.W.balls.find(x => x.state === 'plunger');
    if (!b) return;
    b.launchedAt = this.time;
    b.passedSpinner = false;
    this.W.launchPlungerBall(b, U.clamp(power, 0.05, 1));
    this.state = 'play';
    this._plungerP = 0;
  };

  Game.prototype.serveBall = function (auto) {
    // recycle a trough ball to the plunger
    const tb = this.W.balls.find(x => x.state === 'captured' && x.capId === 'trough');
    if (tb) this.W.removeBall(tb);
    const b = this.W.addBall(T_x(), T_y());
    b.state = 'plunger';
    b.x = 19.18; b.y = 40.55;
    this.state = 'launch';
    this._plungerP = 0;
    if (auto) this._ejectIn(0.9, () => this.doLaunch(0.55 + this.rng() * 0.2));
    else this.say(['BALL ' + this.ballNum, 'PLAYER ' + (this.cur + 1)], 1.6);
  };
  function T_x() { return 19.18; }
  function T_y() { return 40.55; }

  Game.prototype.liveBalls = function () {
    return this.W.balls.filter(b => b.state === 'free' || b.state === 'ramp' || b.state === 'plunger').length;
  };

  Game.prototype._ejectIn = function (sec, fn) { this.ejectQ.push({ t: this.time + sec, fn }); };

  // ---------------- switch handlers ----------------------------------------
  Game.prototype._spinner = function (b, spd) {
    b.passedSpinner = true;
    const ticks = Math.max(1, Math.min(14, Math.round(1 + spd / 22)));
    if (this.mode && this.mode.idx === 2) {
      this.mode.spins += ticks;
      this._award(ticks * MODES[2].spinVal, 'spinner');
      if (this.mode.spins >= MODES[2].spins) this._completeMode();
    } else {
      this._award(ticks * 300, 'spinner');
    }
    const p = this.P();
    if (p) p.spinner += ticks;
    this.sfx('spinner', { ticks });
  };

  Game.prototype._tide = function (i, b) {
    if (this.state !== 'play' && this.state !== 'launch') return;
    this._award(500, 'rollover');
    this.sfx('rollover');
    if (!this.tideLanes[i]) {
      this.tideLanes[i] = true;
      if (this.tideLanes.every(v => v)) {
        this.tideLanes = [false, false, false, false];
        this.tideComplete++;
        if (this.bonusX < 6) {
          this.bonusX++;
          this.say(['BONUS', 'MULTIPLIER', U.fmtShort(this.bonusX * 25000) + ' AT X' + this.bonusX], 1.6, 1);
        } else {
          this._award(25000, 'tide');
          this.say(['BONUS X AT MAX', '50,000'], 1.4);
        }
        if (!this.kickbackLit) { this.kickbackLit = true; this.say(['KICKBACK', 'LIT'], 1.4, 1); }
        this.sfx('tide');
      }
    }
  };

  Game.prototype.laneChange = function (dir) {
    if (this.state !== 'play' && this.state !== 'launch') return;
    const n = this.tideLanes.length;
    const out = new Array(n);
    for (let i = 0; i < n; i++) out[i] = this.tideLanes[(i + dir + n * 2) % n];
    this.tideLanes = out;
  };

  Game.prototype._bumper = function (b, spd) {
    this.bumperHits++;
    if (!this.tidalSurge && this.bumperHits >= 25) {
      this.tidalSurge = true;
      this.say(['TIDAL SURGE', 'BUMPER SCORE X2'], 1.5);
      this.sfx('surge');
    }
    this._award(this.tidalSurge ? 500 : 250, 'bumper');
    this.sfx('bumper');
  };

  Game.prototype._sling = function () {
    this._award(210, 'sling');
    this.sfx('sling');
  };

  Game.prototype._target = function (id, b, spd) {
    const p = this.P();
    this._award(750, 'target');
    this.sfx('target');
    if (id.startsWith('trid')) {
      const i = +id.slice(4);
      if (!p || !p.tridents) p.tridents = [false, false, false];
      if (!p.tridents[i]) {
        p.tridents[i] = true;
        if (p.tridents.every(v => v)) {
          p.tridents = [false, false, false];
          if (!p.giftLit) {
            p.giftLit = true;
            this.say(["POSEIDON'S GIFT", 'AT WHIRLPOOL'], 1.8, 1);
          } else { this._award(25000, 'gift'); }
          this.sfx('bank');
        }
      }
    } else if (id.startsWith('drop')) {
      const i = +id.slice(4);
      const seg = this.refs.dropSegs[i];
      if (seg && !seg.target.down) {
        seg.target.down = true;
        this._award(500, 'drop');
        if (this.refs.dropSegs.every(s => s.target.down)) {
          this._banksDone();
        }
      }
    } else if (id === 'tempest') {
      this._award(1000, 'tempest');
      this._tempest();
    }
  };

  Game.prototype._banksDone = function () {
    this.sfx('bank');
    // mode progression
    if (this.mode && this.mode.idx === 1) {
      this.mode.banks++;
      this._award(MODES[1].hit, 'mode');
      if (this.mode.banks >= MODES[1].banks) { this._completeMode(); this._resetDrops(1.2); return; }
    }
    // kraken lock progression (not during any MB)
    if (!this.mb.active && !this.fury) {
      if (this.locks >= 2) { /* re-light lock */ this.lockLit = true; }
      else {
        this.lockLit = true;
        this.say(['PEARL BANK', this.locks === 0 ? 'LOCK LIT' : 'FINAL LOCK LIT'], 1.6, 1);
        this._resetDrops(1.2);
        return;
      }
    }
    this._award(5000, 'bank');
    this.say(['PEARL BANK', '5,000'], 1.2);
    this._resetDrops(1.2);
  };

  Game.prototype._resetDrops = function (delay) {
    this._ejectIn(delay || 1.2, () => { for (const s of this.refs.dropSegs) s.target.down = false; });
  };

  Game.prototype._tempest = function () {
    const p = this.P();
    if (!p || this.mb.active || this.fury) return;
    if (this.mode) { this.say(['MODE IN PROGRESS'], 1.0); return; }
    if (p.furyLit) { this._startFury(); return; }
    const next = p.modesDone.indexOf(false);
    if (next < 0) return;
    this._startMode(next);
  };

  Game.prototype._startMode = function (idx) {
    const M = MODES[idx];
    this.mode = { idx, t: M.dur, shots: 0, banks: 0, spins: 0, seqStep: 0, val: M.start || 0 };
    this.say(['MODE ' + (idx + 1), M.name], 2, 2);
    this.sfx('modeStart');
  };

  Game.prototype._completeMode = function () {
    const M = MODES[this.mode.idx];
    const p = this.P();
    this._award(M.bonus, 'modeComplete');
    p.modesDone[this.mode.idx] = true;
    this.mode = null;
    this.say([M.name, 'COMPLETE', U.fmtShort(M.bonus)], 2, 2);
    this.sfx('modeDone');
    if (p.modesDone.every(v => v)) {
      p.furyLit = true;
      this.say(['ALL MODES COMPLETE', "POSEIDON'S FURY", 'LIT AT TEMPEST'], 2.5, 2);
      this.sfx('furyLit');
    }
  };

  Game.prototype._failMode = function () {
    const M = MODES[this.mode.idx];
    this.say([M.name, 'FAILED'], 1.6, 1);
    this.sfx('modeFail');
    this.mode = null;
  };

  Game.prototype._startFury = function () {
    const p = this.P();
    p.furyLit = false;
    p.furys++;
    this.fury = { t: 40, jackpots: 0, superLit: false, superDone: false };
    this.mb.active = true; this.mb.wizard = true; this.mb.live = 0; this.mb.jackpots = 0;
    this.say(["POSEIDON'S FURY", 'THE CITY AWAKENS'], 2.5, 3);
    this.sfx('fury');
    this._ejectIn(0.8, () => this._mbServe());
    this._ejectIn(1.6, () => this._mbServe());
    this.ballSaveT = Math.max(this.ballSaveT, 12);
  };

  // multiball / wizard jackpot on a major shot
  Game.prototype._jackpotShot = function (which) {
    if (this.fury) {
      if (!this.fury.superDone) {
        this.fury.jackpots++;
        this._award(500000, 'jackpot');
        this.say(['JACKPOT', '500,000'], 1.5, 3);
        this.sfx('jackpot');
      }
      return true;
    }
    if (this.mb.active) {
      if (this.mb.jackpots < 3) {
        this.mb.jackpots++;
        this._award(250000, 'jackpot');
        this.say(['JACKPOT', '250,000'], 1.4, 3);
        this.sfx('jackpot');
      } else if (!this.mb.superLit) {
        this.mb.superLit = true;
        this.say(['SUPER JACKPOT', 'LIT AT WHIRLPOOL'], 1.6, 3);
        this.sfx('superLit');
      }
      return true;
    }
    return false;
  };

  Game.prototype._ramp = function (which, b, spd) {
    if (this.state !== 'play' && this.state !== 'launch') return;
    const p = this.P();
    // skill shot
    if (this.skillAvail && (this.time - this.launchT) < 7 && which === 'rampL' && this.skillLane === 1) {
      this._skillShot(); return;
    }
    this._award(2500, 'ramp');
    this.sfx('ramp');
    // combo
    if (this.comboT > this.time && ((this.comboSide === 'rampL' && which === 'rampR') ||
        (this.comboSide === 'rampR' && which === 'rampL'))) {
      this.combo = Math.min(this.combo + 1, 8);
      const pts = 50000 * this.combo;
      this._award(pts, 'combo');
      this.say(['CURRENT COMBO', 'X' + this.combo, U.fmtShort(pts)], 1.4, 1);
      this.sfx('combo');
    } else this.combo = 0;
    this.comboSide = which; this.comboT = this.time + 4;
    p.ramps++;
    this._modeShot(which);
    this._jackpotShot(which);
  };

  Game.prototype._orbit = function (which, b) {
    if (this.state !== 'play' && this.state !== 'launch') return;
    const p = this.P();
    // skill shot on orbit
    if (this.skillAvail && (this.time - this.launchT) < 7 && which === 'orbL' && this.skillLane === 0
        && b.passedSpinner) {
      this._skillShot(); return;
    }
    if (!b.passedSpinner) return; // rolled back — no orbit credit
    this._award(1500, 'orbit');
    this.sfx('orbit');
    p.orbits++;
    this._modeShot(which);
    this._jackpotShot(which);
  };

  Game.prototype._skillShot = function () {
    this.skillAvail = false;
    this._award(50000, 'skill');
    this.say(['SKILL SHOT', '50,000'], 1.8, 2);
    this.sfx('skill');
  };

  Game.prototype._modeShot = function (which) {
    if (!this.mode) return;
    const M = MODES[this.mode.idx], m = this.mode;
    if (m.idx === 0) {
      m.shots++;
      this._award(M.hit, 'mode');
      if (m.shots >= M.shots) this._completeMode();
    } else if (m.idx === 3) {
      const want = M.seq[m.seqStep];
      if (which === want) {
        this._award(m.val, 'mode');
        this.say(['CROWN OF ATLAS', U.fmtShort(m.val)], 1.0);
        m.seqStep++;
        m.val = Math.max(50000, m.val - 25000);
        m.t = Math.min(M.dur, m.t + 4);
        if (m.seqStep >= M.seq.length) this._completeMode();
      } else {
        this.say(['CROWN OF ATLAS', 'WRONG SHOT'], 0.9);
      }
    }
  };

  Game.prototype._saucer = function (b) {
    if (this.state !== 'play' && this.state !== 'launch') return;
    // wizard super jackpot?
    if (this.fury && this.fury.superLit && !this.fury.superDone) {
      this.fury.superDone = true;
      this._award(1000000, 'super');
      this.say(['SUPER JACKPOT', '1,000,000'], 2.2, 3);
      this.sfx('super');
      this._ejectIn(1.0, () => this._saucerEject(b));
      return;
    }
    // kraken super jackpot
    if (this.mb.active && !this.mb.wizard && this.mb.superLit) {
      this.mb.superLit = false;
      this._award(500000, 'super');
      this.say(['KRAKEN SUPER', '500,000'], 2, 3);
      this.sfx('super');
      this._ejectIn(1.0, () => this._saucerEject(b));
      return;
    }
    // lock?
    if (this.lockLit && this.locks < 2 && !this.mb.active && !this.fury) {
      this.lockLit = false;
      this.locks++;
      this.W.removeBall(b);
      this.say([this.locks === 1 ? 'BALL LOCKED' : 'KRAKEN MULTIBALL', this.locks === 1 ? '1 MORE' : 'RELEASED'], 2, 2);
      this.sfx('lock');
      if (this.locks >= 2) {
        this._ejectIn(0.8, () => this._startKraken());
      } else {
        this._ejectIn(0.6, () => this.serveBall(true));
      }
      return;
    }
    // gift?
    const p = this.P();
    if (p && p.giftLit) {
      p.giftLit = false;
      this._collectGift();
      this._ejectIn(1.0, () => this._saucerEject(b));
      return;
    }
    // plain collect
    this._award(5000, 'saucer');
    this.say(['WHIRLPOOL', '5,000'], 1.0);
    this.sfx('saucer');
    this._ejectIn(0.8, () => this._saucerEject(b));
  };

  Game.prototype._saucerEject = function (b) {
    if (!this.W.balls.includes(b)) return;
    b.state = 'free';
    b.x = 11.4; b.y = 24.3;
    const v = 78;
    b.vx = -0.5 * v; b.vy = 0.87 * v;
    b.capId = null;
    if (!b._zCool) b._zCool = {};
    b._zCool['saucer'] = this.W.time + 1.4;
    this.sfx('eject');
  };

  Game.prototype._collectGift = function () {
    const total = GIFTS.reduce((s, g) => s + g.w, 0);
    let r = this.rng() * total, g = GIFTS[0];
    for (const cand of GIFTS) { r -= cand.w; if (r <= 0) { g = cand; break; } }
    switch (g.id) {
      case 'pts100': this._award(100000, 'gift'); break;
      case 'pts250': this._award(250000, 'gift'); break;
      case 'bonusx': if (this.bonusX < 6) { this.bonusX++; } else this._award(100000, 'gift'); break;
      case 'kickback': this.kickbackLit = true; break;
      case 'extraball': this.ebLit = true; break;
      case 'hold': this.bonusHold = true; break;
    }
    this.say(["POSEIDON'S GIFT", g.label], 2, 2);
    this.sfx('gift');
  };

  Game.prototype._startKraken = function () {
    const p = this.P();
    if (p) p.krakens++;
    this.mb.active = true; this.mb.wizard = false;
    this.mb.live = 0; this.mb.jackpots = 0; this.mb.superLit = false;
    this.say(['KRAKEN MULTIBALL', '3 BALLS', 'JACKPOTS LIT'], 2.2, 3);
    this.sfx('mbStart');
    this._ejectIn(0.5, () => this._mbServe());
    this._ejectIn(1.3, () => this._mbServe());
    this.ballSaveT = Math.max(this.ballSaveT, 12);
  };

  // spawn an auto-launched ball (multiball serve)
  Game.prototype._mbServe = function () {
    const b = this.W.addBall(19.18, 40.55);
    b.state = 'plunger';
    b.launchedAt = this.time;
    b.passedSpinner = false;
    this.W.launchPlungerBall(b, 0.55 + this.rng() * 0.2);
    this.mb.live++;
    if (this.state === 'attract' || this.state === 'launch') this.state = 'play';
  };

  Game.prototype._trough = function (b) {
    // drained ball
    this._ejectIn(0.35, () => this._afterDrain(b));
  };

  Game.prototype._afterDrain = function (b) {
    this.W.removeBall(b);
    const live = this.liveBalls();
    if (this.mb.active) {
      this.mb.live = Math.max(0, this.mb.live - 1);
      if (this.mb.live > 0 || live > 0) return; // multiball continues
      this._endMultiball();
    }
    if (live > 0) return;
    // last ball drained
    if (this.ballSaveT > 0) {
      this.ballSaveT = 0;
      this.say(['BALL SAVED'], 1.6, 2);
      this.sfx('save');
      this.serveBall(true);
      return;
    }
    this._endBall();
  };

  Game.prototype._endMultiball = function () {
    this.mb.active = false;
    const wasWizard = this.mb.wizard;
    this.mb.wizard = false;
    if (wasWizard && this.fury) {
      this._award(this.fury.superDone ? 1000000 : 250000, 'furyEnd');
      this.say([this.fury.superDone ? 'CITY AWAKENED' : "POSEIDON'S FURY", 'OVER'], 2, 2);
      this.fury = null;
    } else {
      this.say(['KRAKEN MULTIBALL', 'OVER'], 1.6, 1);
    }
    this.sfx('mbEnd');
    // ball save re-serve if drained out entirely during save
    if (this.ballSaveT > 0) {
      this.ballSaveT = 0;
      this.serveBall(true);
    }
  };

  Game.prototype._endBall = function () {
    const p = this.P();
    // bonus
    const units = 1 + 2 * p.modesDone.filter(v => v).length + 2 * this.tideComplete +
      5 * (p.krakens || 0) + 10 * (p.furys || 0);
    if (this.noBonus || this.tilted) {
      this.noBonus = false;
      this._finishBall();
      return;
    }
    this.bonusSeq = { units, shown: 0, t: 0 };
    this.state = 'bonus';
    this.sfx('bonusStart');
  };

  Game.prototype._finishBall = function () {
    this.bonusSeq = null;
    this.tilted = false; this.tiltWarnings = 0;
    // reset per-ball progress
    this.bonusX = 1; this.tideComplete = 0;
    this.tideLanes = [false, false, false, false];
    this.bumperHits = 0; this.tidalSurge = false;
    this.combo = 0; this.mode = null; this.locks = 0; this.lockLit = false;
    this.bonusHold = false;
    for (const s of this.refs.dropSegs) s.target.down = false;
    const p = this.P();
    // extra ball (bonus already counted) — replay same ball number
    if (p.ebLit) {
      p.ebLit = false;
      this.say(['SHOOT AGAIN'], 2, 2);
      this.sfx('eb');
      this.serveBall(false);
      return;
    }
    if (this.ballNum < this.ballsPerGame) {
      this.ballNum++;
    } else {
      this.ballNum = 1;
      this.cur++;
      if (this.cur >= this.players.length) {
        this.state = 'gameover';
        this.em.emit('gameover', { players: this.players });
        return;
      }
    }
    this.serveBall(false);
  };

  // ---------------- player input -------------------------------------------
  Game.prototype.setFlipper = function (side, pressed) {
    const f = side < 0 ? this.refs.flipL : this.refs.flipR;
    if (!f) return;
    if (this.tilted) { f.pressed = false; return; }
    f.pressed = pressed;
    if (pressed) {
      this.sfx('flipperUp');
      // pop balls resting in the flipper-base pocket (the rotating surface
      // sweeps them out on a real machine)
      if (this.state === 'play' || this.state === 'launch') {
        for (const b of this.W.balls) {
          if (b.state !== 'free') continue;
          if (Math.hypot(b.x - f.px, b.y - f.py) < 1.3 && Math.hypot(b.vx, b.vy) < 25) {
            b.vx += side * 16 + U.rand(-6, 6);
            b.vy -= 44 + U.rand(0, 14);
          }
        }
      }
      if (this.state === 'play' || this.state === 'launch') this.laneChange(side < 0 ? -1 : 1);
    } else {
      this.sfx('flipperDn');
    }
  };

  Game.prototype.nudge = function (dir) { // dir: -1 left, +1 right, 0 up
    if (this.tilted || (this.state !== 'play' && this.state !== 'launch')) return;
    const n = { x: dir * 14 + U.rand(-3, 3), y: dir === 0 ? -16 : U.rand(-2, 2) };
    for (const b of this.W.balls) {
      if (b.state === 'free') { b.vx += n.x; b.vy += n.y; }
      else if (b.state === 'ramp' && b.rampRef) b.rampRef.v += n.y * 0.5;
    }
    this.sfx('nudge');
    this.tiltWarnings++;
    this.tiltT = this.time + 2.5;
    if (this.tiltWarnings >= 3) {
      this.tilted = true;
      for (const f of this.refs ? [this.refs.flipL, this.refs.flipR] : []) f.pressed = false;
      this.say(['TILT'], 3, 5);
      this.sfx('tilt');
    } else if (!this.headless) {
      this.say(['TILT WARNING ' + this.tiltWarnings], 0.8, 3);
    }
  };

  // ---------------- main update --------------------------------------------
  Game.prototype.update = function (dt) {
    // fixed-step physics
    this._acc = (this._acc || 0) + dt;
    const step = P.DT;
    let n = 0;
    while (this._acc >= step && n < 12) { this.W.step(step); this._acc -= step; n++; }
    this.time += dt;

    // plunger charging
    if (this.state === 'launch' && this._plungerHeld) this.plungerPower();

    // ball resting in shooter lane (weak plunge rolled back)
    if (this.state === 'play') {
      for (const b of this.W.balls) {
        if (b.state === 'free' && b.x > 18.55 && b.y > 38 && Math.hypot(b.vx, b.vy) < 30) {
          b.state = 'plunger';
          b.vx = 0; b.vy = 0; b.x = 19.18; b.y = 40.55;
          this.state = 'launch';
        }
      }
    }

    // eject queue
    for (let i = this.ejectQ.length - 1; i >= 0; i--) {
      if (this.time >= this.ejectQ[i].t) {
        const fn = this.ejectQ[i].fn;
        this.ejectQ.splice(i, 1);
        fn();
      }
    }

    // ball save countdown
    if (this.ballSaveT > 0) {
      this.ballSaveT -= dt;
      if (this.ballSaveT <= 0 && (this.state === 'play')) {
        this.ballSaveT = 0;
        if (!this.headless) this.em.emit('saveExpired');
      }
    }

    // combo window expiry
    if (this.comboT < this.time && this.combo > 0) this.combo = 0;

    // mode timers
    if (this.mode) {
      this.mode.t -= dt;
      if (this.mode.idx === 3 && this.mode.val > 50000) {
        this.mode.val = Math.max(50000, this.mode.val - 4200 * dt);
      }
      if (this.mode.t <= 0) this._failMode();
    }
    if (this.fury) {
      this.fury.t -= dt;
      // fury: 3 jackpots light the super at the whirlpool
      if (this.fury.jackpots >= 3 && !this.fury.superLit && !this.fury.superDone) {
        this.fury.superLit = true;
        this.say(['SUPER JACKPOT', 'LIT AT WHIRLPOOL'], 1.8, 3);
      }
      if (this.fury.superDone) {
        this._award(5000000, 'cityAwakened');
        this.say(['CITY AWAKENED', '5,000,000'], 3, 4);
        this.sfx('city');
        this.fury = null;
        this.mb.active = false; this.mb.wizard = false;
      } else if (this.fury && this.fury.t <= 0) {
        this.say(["POSEIDON'S FURY", 'OVER'], 1.6, 2);
        this.fury = null;
        this.mb.active = false; this.mb.wizard = false;
      }
    }

    // bonus count animation
    if (this.bonusSeq) {
      this.bonusSeq.t += dt;
      if (this.bonusSeq.t > 0.22) {
        this.bonusSeq.t = 0;
        this.bonusSeq.shown++;
        const p = this.P();
        const val = 25000 * this.bonusX;
        if (this.bonusSeq.shown <= this.bonusSeq.units) {
          p.score += val;
          this.sfx('bonusTick');
          if (!this.headless) this.em.emit('bonusCount', { shown: this.bonusSeq.shown, units: this.bonusSeq.units, val });
        } else {
          this._finishBall();
        }
      }
    }

    // play-clock safety: if a ball has been live for 3 minutes straight
    // (jam/stall the ball search can't free), force it to drain so the
    // game always moves on.
    if (this.state === 'play' && this.liveBalls() > 0) {
      this.ballT = (this.ballT || 0) + dt;
      if (this.ballT > 180) {
        this.ballT = 0;
        const victim = this.W.balls.find(b => b.state === 'free' || b.state === 'ramp');
        if (victim) {
          victim.state = 'captured';
          victim.capId = 'trough';
          victim.vx = 0; victim.vy = 0;
          victim.x = 10.1; victim.y = 41.4;
          this.W.onHit('captured:trough', victim, 0, null);
        }
      }
    } else this.ballT = 0;

    // ball search (stuck ball rescue, like a real machine)
    if ((this.state === 'play' || this.state === 'launch') && this.liveBalls() > 0) {
      if (this.time - this.lastSwitchT > 10 + this.searchStage * 5) {
        this.searchStage = Math.min(this.searchStage + 1, 3);
        this.lastSwitchT = this.time;
        for (const b of this.W.balls) {
          if (b.state === 'free') {
            b.vx += U.rand(-9, 9) * this.searchStage;
            b.vy += U.rand(-12, 4) * this.searchStage;
          }
        }
        // fire flippers briefly
        this.refs.flipL.pressed = true; this.refs.flipR.pressed = true;
        this._ejectIn(0.3, () => { this.refs.flipL.pressed = false; this.refs.flipR.pressed = false; });
      }
    } else this.searchStage = 0;

    // track switch activity
    if (this.W.time !== this._lastWTime) {
      if (this.W.balls.some(b => b.lastSwitch > this.time - 0.05)) this.lastSwitchT = this.time;
      this._lastWTime = this.W.time;
    }

    // tilt decay
    if (this.tiltT && this.time > this.tiltT && !this.tilted) {
      this.tiltT = 0;
      this.tiltWarnings = Math.max(0, this.tiltWarnings - 1);
    }
  };

  // ---------------- game management -----------------------------------------
  function newPlayer() {
    return {
      score: 0, spinner: 0, ramps: 0, orbits: 0, krakens: 0, furys: 0,
      modesDone: [false, false, false, false], tideComplete: 0,
      giftLit: false, furyLit: false, ebLit: false,
      tridents: [false, false, false],
    };
  }

  Game.prototype.startGame = function (numPlayers) {
    this.players = [];
    for (let i = 0; i < numPlayers; i++) this.players.push(newPlayer());
    this.cur = 0; this.ballNum = 1;
    this.bonusX = 1; this.tideComplete = 0;
    this.fury = null;
    this.mb = { active: false, live: 0, jackpots: 0, superLit: false, wizard: false, t: 0 };
    this.locks = 0; this.lockLit = false;
    this.kickbackLit = false; this.tilted = false; this.tiltWarnings = 0;
    this.skillLane = this.rng() < 0.5 ? 0 : 1;
    this.state = 'launch';
    this.say(['PLAYER 1', 'BALL 1'], 1.8, 1);
    this.serveBall(false);
  };

  Game.prototype.addPlayer = function () {
    if (this.state !== 'launch' && this.state !== 'play') return false;
    if (this.ballNum !== 1 || this.cur !== 0) return false;
    if (this.players.length >= 4) return false;
    this.players.push(newPlayer());
    this.say(['PLAYER ' + this.players.length + ' ADDED'], 1.4, 1);
    this.sfx('addPlayer');
    return true;
  };

  root.AR_RULES = { Game, MODES };
  if (typeof module !== 'undefined' && module.exports) module.exports = root.AR_RULES;
})(typeof window !== 'undefined' ? window : globalThis);
