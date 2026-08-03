/* ============================================================================
 * RAGNAROK PINBALL — rules.js
 * The game's brain: switch handling, scoring, six saga modes, Mjolnir
 * multiball, the Ragnarok wizard mode, bonus, tilt and every DMD sequence.
 * ==========================================================================*/
(function (PB) {
  'use strict';
  var U = PB.U, A = PB.Audio, D = PB.DMD, F = PB.Fonts, T = PB.Table;

  var Rules = PB.Rules = {};

  /* --------------------------------------------------------------- MODES */
  Rules.MODE_NAMES = ['FROST', 'SERPNT', 'VALKYR', 'RAVEN', 'SURTR', 'BIFRST'];

  Rules.MODES = [
    {
      name: 'FROST GIANTS', hint: 'SMASH THE JOTUNN', dur: 35,
      shots: ['drop'], need: 7, base: 300000, step: 120000,
      lamps: ['a_scoop'], art: 'giant'
    },
    {
      name: 'SERPENT HUNT', hint: 'SPINNER + ORBITS', dur: 32,
      shots: ['spinner', 'lorbit', 'rorbit'], need: 14, base: 150000, step: 45000,
      lamps: ['a_lorbit', 'a_rorbit', 'a_spin'], art: 'serpent'
    },
    {
      name: 'VALKYRIE FLIGHT', hint: 'SHOOT THE RAMPS', dur: 35,
      shots: ['lramp', 'rramp'], need: 6, base: 500000, step: 250000,
      lamps: ['a_lramp', 'a_rramp'], art: 'wing'
    },
    {
      name: "RAVEN'S EYE", hint: 'HURRY-UP AT THE WELL', dur: 26, type: 'hurry',
      shots: ['scoop'], base: 6000000, lamps: ['a_scoop'], art: 'raven'
    },
    {
      name: 'FIRE OF SURTR', hint: 'BUMPERS + TARGETS', dur: 30,
      shots: ['bumper', 'standup'], need: 34, base: 70000, step: 14000,
      lamps: ['thor0', 'thor1', 'thor2', 'thor3'], art: 'fire'
    },
    {
      name: 'BIFROST RUN', hint: 'FOLLOW THE LIT SHOT', dur: 42, type: 'sequence',
      shots: ['lramp', 'rorbit', 'rramp', 'lorbit', 'scoop'],
      base: 600000, step: 300000, art: 'bridge'
    }
  ];

  var SHOT_LAMP = {
    lramp: 'a_lramp', rramp: 'a_rramp', lorbit: 'a_lorbit',
    rorbit: 'a_rorbit', scoop: 'a_scoop', spinner: 'a_spin'
  };
  var SHOT_LABEL = {
    lramp: 'BIFROST RAMP', rramp: 'VALHALLA RAMP', lorbit: 'YGGDRASIL ORBIT',
    rorbit: 'MIDGARD ORBIT', scoop: 'WELL OF URD', spinner: 'JORMUNGANDR',
    drop: 'JOTUNN TARGET', bumper: 'RUNE CAVERN', standup: 'THOR TARGET'
  };
  var SKILL_SHOTS = ['lramp', 'rramp', 'lorbit', 'rorbit', 'scoop'];

  /* =============================================================== ENGINE */
  function Engine(game) {
    this.g = game;
    this.lamps = {};
    this.t = 0;

    /* live (per-ball) state */
    this.ballSave = 0;
    this.ballSaveTotal = 0;
    this.mbActive = false;
    this.mbBalls = 0;
    this.jackpotValue = 1000000;
    this.jackpotsThisMb = 0;
    this.superLit = false;
    this.wizard = false;
    this.wizardTimer = 0;
    this.wizardShots = {};
    this.comboT = 0;
    this.comboN = 0;
    this.lastShot = '';
    this.skillLive = false;
    this.skillIdx = 0;
    this.superSkillLive = false;
    this.hurryValue = 0;
    this.seqIdx = 0;
    this.modeHits = 0;
    this.modeTimer = 0;
    this.scoreFlashT = 0;
    this.lastAward = 0;
    this.dropCycle = 0;
    this.tiltWarn = 0;
    this.tilted = false;
    this.bonusHeld = 0;
  }
  Rules.Engine = Engine;

  Engine.prototype.pl = function () { return this.g.players[this.g.current]; };

  /* -------------------------------------------------------------- lamps */
  Engine.prototype.setLamp = function (id, mode) {
    var L = this.lamps[id] || (this.lamps[id] = { mode: 'off', t: 0 });
    if (L.mode !== mode) { L.mode = mode; L.t = 0; }
  };
  Engine.prototype.lampLevel = function (id) {
    var L = this.lamps[id];
    if (!L) return 0;
    switch (L.mode) {
      case 'on': return 1;
      case 'slow': return (Math.sin(this.t * 5.2) > -0.1) ? 1 : 0.06;
      case 'fast': return (Math.sin(this.t * 13) > 0) ? 1 : 0.05;
      case 'flash': return (Math.sin(this.t * 26) > 0) ? 1 : 0;
      case 'dim': return 0.28;
      default: return 0;
    }
  };
  Engine.prototype.allLampsOff = function () {
    for (var k in this.lamps) this.lamps[k].mode = 'off';
  };
  Engine.prototype.flash = function (id, pw) {
    this.g.flashers[id] = Math.max(this.g.flashers[id] || 0, pw === undefined ? 1 : pw);
  };
  Engine.prototype.flashAll = function (pw) {
    var F2 = PB.Art.FLASHERS;
    for (var i = 0; i < F2.length; i++) this.flash(F2[i].id, pw);
  };

  /* ------------------------------------------------------------- scoring */
  Engine.prototype.add = function (n, why) {
    var p = this.pl();
    if (!p || this.tilted) return 0;
    n = Math.round(n);
    p.score += n;
    this.lastAward = n;
    this.scoreFlashT = 0.5;
    this.g.checkReplay();
    return n;
  };

  Engine.prototype.bonusValue = function (p) {
    p = p || this.pl();
    if (!p) return 0;
    var base = p.bRamps * 12000 + p.bOrbits * 9000 + p.bDrops * 6000 +
      p.bSpins * 1200 + p.bBumpers * 800 + p.bTargets * 5000 +
      p.modesCompleted * 250000;
    return base * p.bonusX;
  };

  /* ================================================== BALL LIFE-CYCLE */
  Engine.prototype.startBall = function () {
    var p = this.pl();
    this.tilted = false;
    this.tiltWarn = 0;
    this.comboN = 0; this.comboT = 0;
    this.mbActive = false; this.mbBalls = 0;
    this.superLit = false;
    this.wizard = false;
    this.modeHits = 0;
    this.skillLive = true;
    this.superSkillLive = true;
    this.skillIdx = 0;
    this.ballSave = 0;
    this.g.table.resetDrops();
    this.dropCycle = 0;
    if (p.modeActive >= 0) this.endMode(false);
    this.refreshLamps();
    A.setMusic('play');
  };

  Engine.prototype.ballLaunched = function () {
    this.ballSave = this.g.ballNum === 1 ? 10 : 8;
    this.ballSaveTotal = this.ballSave;
    this.setLamp('ballsave', 'fast');
  };

  Engine.prototype.ballDrained = function (ballsLeft) {
    var p = this.pl();
    if (this.mbActive && ballsLeft >= 2) return 'continue';
    if (this.mbActive && ballsLeft < 2) {
      this.endMultiball();
      if (ballsLeft >= 1) return 'continue';
    }
    if (ballsLeft >= 1) return 'continue';
    return 'end';
  };

  /* --------------------------------------------------------- lamp refresh */
  Engine.prototype.refreshLamps = function () {
    var p = this.pl();
    if (!p) return;
    var i;
    this.allLampsOff();

    if (this.wizard) {
      for (var k in SHOT_LAMP) this.setLamp(SHOT_LAMP[k], this.wizardShots[k] ? 'off' : 'fast');
      this.setLamp('ragnarok', 'flash');
      return;
    }

    if (this.mbActive) {
      var jk = ['lramp', 'rramp', 'lorbit', 'rorbit'];
      for (i = 0; i < jk.length; i++) this.setLamp(SHOT_LAMP[jk[i]], this.superLit ? 'dim' : 'fast');
      this.setLamp('jackpot', this.superLit ? 'flash' : 'on');
      this.setLamp('a_scoop', this.superLit ? 'flash' : 'off');
      this.setLamp('multiball', 'on');
      return;
    }

    // mode lamps
    if (p.modeActive >= 0) {
      var m = Rules.MODES[p.modeActive];
      if (m.type === 'sequence') {
        this.setLamp(SHOT_LAMP[m.shots[this.seqIdx % m.shots.length]], 'fast');
      } else if (m.lamps) {
        for (i = 0; i < m.lamps.length; i++) this.setLamp(m.lamps[i], 'fast');
      }
      this.setLamp('mode' + p.modeActive, 'fast');
    } else {
      // idle: the scoop starts a saga once the Jotunn bank is down
      var open = this.g.table.dropsDown() >= 3;
      this.setLamp('a_scoop', open ? (p.locks < 3 && p.lockReady ? 'flash' : 'fast') : 'dim');
      if (!open) for (i = 0; i < 3; i++) this.setLamp('drop' + i, 'on');
    }

    // completed sagas stay lit
    for (i = 0; i < 6; i++) if (p.modesDone[i] && p.modeActive !== i) this.setLamp('mode' + i, 'on');

    // locks
    for (i = 0; i < 3; i++) this.setLamp('lock' + (i + 1), i < p.locks ? 'on' : 'off');
    if (p.locks >= 2) this.setLamp('multiball', 'slow');

    // R-U-N-E
    for (i = 0; i < 4; i++) this.setLamp('lane' + i, (p.runeMask & (1 << i)) ? 'on' : 'slow');
    // T-H-O-R
    for (i = 0; i < 4; i++) this.setLamp('thor' + i, (p.thorMask & (1 << i)) ? 'on' : 'off');

    // bonus multiplier ladder
    this.setLamp('bx2', p.bonusX >= 2 ? 'on' : 'off');
    this.setLamp('bx3', p.bonusX >= 3 ? 'on' : 'off');
    this.setLamp('bx5', p.bonusX >= 5 ? 'on' : 'off');
    this.setLamp('bx10', p.bonusX >= 10 ? 'on' : 'off');

    this.setLamp('kickback', this.g.table.kickback.lit ? 'on' : 'off');
    this.setLamp('extraball', p.ebLit ? 'flash' : 'off');
    this.setLamp('special', p.specialLit ? 'flash' : 'off');
    this.setLamp('ballsave', this.ballSave > 0 ? 'fast' : 'off');
    this.setLamp('combo', this.comboN >= 2 ? 'fast' : 'off');
    this.setLamp('skill', this.skillLive ? 'flash' : 'off');
    if (p.modesCompleted >= 6 && !p.wizardDone) this.setLamp('ragnarok', 'flash');

    // shot arrows that aren't otherwise claimed get a soft glow
    var idle = ['a_lramp', 'a_rramp', 'a_lorbit', 'a_rorbit', 'a_spin'];
    for (i = 0; i < idle.length; i++) if (!this.lamps[idle[i]] || this.lamps[idle[i]].mode === 'off')
      this.setLamp(idle[i], 'dim');

    if (this.skillLive) this.setLamp(SHOT_LAMP[SKILL_SHOTS[this.skillIdx]], 'flash');
  };

  /* ============================================================== SWITCHES */
  Engine.prototype.majorShot = function (shot, ball) {
    var p = this.pl();
    if (!p || this.tilted) return;

    /* --- skill shot resolution --- */
    if (this.skillLive) {
      this.skillLive = false;
      if (SKILL_SHOTS[this.skillIdx] === shot) {
        var v = 750000 * (1 + p.skillLevel);
        p.skillLevel++;
        this.add(v);
        this.flashAll(1);
        A.sfx.superJackpot();
        this.dmdBig('SKILL SHOT', U.commas(v), 2.2, 8);
      }
    }
    this.superSkillLive = false;

    /* --- combos --- */
    if (this.comboT > 0 && this.lastShot !== shot) {
      this.comboN++;
      A.sfx.combo(this.comboN);
      if (this.comboN >= 2) {
        var cv = 150000 * this.comboN;
        this.add(cv);
        p.bestCombo = Math.max(p.bestCombo, this.comboN);
        this.dmdSmall((this.comboN + 1) + '-WAY COMBO', U.commas(cv), 1.4);
      }
    } else {
      this.comboN = 0;
    }
    this.comboT = 3.4;
    this.lastShot = shot;

    /* --- wizard mode --- */
    if (this.wizard) {
      if (!this.wizardShots[shot]) {
        this.wizardShots[shot] = true;
        this.add(3000000);
        this.flashAll(1);
        A.sfx.jackpot(3);
        this.dmdBig('RAGNAROK', U.commas(3000000), 1.3, 12);
        var left = 0;
        for (var kk in SHOT_LAMP) if (!this.wizardShots[kk]) left++;
        if (left === 0) {
          this.add(30000000);
          A.sfx.superJackpot();
          this.dmdBig('GODS FALL', U.commas(30000000), 3, 14);
          this.wizardShots = {};
        }
        this.refreshLamps();
      } else {
        this.add(500000);
      }
      return;
    }

    /* --- multiball jackpots --- */
    if (this.mbActive) {
      if (this.superLit && shot === 'scoop') {
        var sj = 8000000 + this.jackpotsThisMb * 500000;
        this.add(sj);
        p.jackpots++;
        this.superLit = false;
        this.jackpotsThisMb = 0;
        this.flashAll(1);
        A.sfx.superJackpot();
        A.duck(0.25, 1.4);
        this.dmdBig('SUPER JACKPOT', U.commas(sj), 2.6, 14);
        this.refreshLamps();
        return;
      }
      if (!this.superLit && (shot === 'lramp' || shot === 'rramp' || shot === 'lorbit' || shot === 'rorbit')) {
        this.add(this.jackpotValue);
        p.jackpots++;
        this.jackpotsThisMb++;
        this.jackpotValue += 250000;
        this.flash(shot === 'lramp' ? 'f_lramp' : shot === 'rramp' ? 'f_rramp' : 'f_top', 1);
        A.sfx.jackpot(this.jackpotsThisMb);
        this.dmdBig('JACKPOT', U.commas(this.jackpotValue - 250000), 1.5, 12);
        if (this.jackpotsThisMb >= 4) {
          this.superLit = true;
          this.dmdSmall('SUPER JACKPOT LIT', 'SHOOT THE WELL', 2.2);
        }
        this.refreshLamps();
        return;
      }
    }

    /* --- running saga mode --- */
    if (p.modeActive >= 0) {
      if (this.modeShot(shot)) return;
    }

    /* --- default shot values --- */
    var base = {
      lramp: 120000, rramp: 140000, lorbit: 90000, rorbit: 90000,
      scoop: 250000, spinner: 8000
    }[shot] || 50000;
    var mult = 1 + this.comboN * 0.5;
    this.add(base * mult);
    if (SHOT_LABEL[shot]) this.dmdSmall(SHOT_LABEL[shot], U.commas(Math.round(base * mult)), 1.1);
  };

  /* ------------------------------------------------------------ mode shots */
  Engine.prototype.modeShot = function (shot) {
    var p = this.pl();
    var m = Rules.MODES[p.modeActive];
    if (!m) return false;

    if (m.type === 'hurry') {
      if (shot === 'scoop') {
        var v = Math.max(500000, Math.round(this.hurryValue));
        this.add(v);
        this.flashAll(1);
        A.sfx.superJackpot();
        this.dmdBig('RAVEN COLLECTED', U.commas(v), 2.4, 13);
        this.completeMode();
        return true;
      }
      return false;
    }

    if (m.type === 'sequence') {
      var want = m.shots[this.seqIdx % m.shots.length];
      if (shot === want) {
        this.seqIdx++;
        var sv = m.base + m.step * (this.seqIdx - 1);
        this.add(sv);
        A.sfx.jackpot(this.seqIdx);
        this.flash('f_top', 0.8);
        this.dmdBig('BIFROST ' + this.seqIdx, U.commas(sv), 1.2, 11);
        if (this.seqIdx >= m.shots.length) { this.completeMode(); }
        else this.refreshLamps();
        return true;
      }
      return false;
    }

    if (m.shots.indexOf(shot) >= 0) {
      this.modeHits++;
      var mv = m.base + m.step * (this.modeHits - 1);
      this.add(mv);
      A.sfx.jackpot(this.modeHits);
      this.dmdBig(m.name, U.commas(mv), 1.15, 11);
      if (m.need && this.modeHits >= m.need) this.completeMode();
      return true;
    }
    return false;
  };

  /* ------------------------------------------------------------ mode life */
  Engine.prototype.startMode = function (idx) {
    var p = this.pl();
    p.modeActive = idx;
    this.modeHits = 0;
    this.seqIdx = 0;
    var m = Rules.MODES[idx];
    this.modeTimer = m.dur;
    if (m.type === 'hurry') this.hurryValue = m.base;
    A.sfx.modeStart();
    A.setMusic('mode');
    A.duck(0.2, 1.8);
    this.flashAll(1);
    this.refreshLamps();
    var self = this;
    D.show({
      id: 'modestart', prio: 8, dur: 2.6,
      draw: function (d, t) { drawModeIntro(d, t, m, idx); }
    });
  };

  Engine.prototype.completeMode = function () {
    var p = this.pl();
    var idx = p.modeActive;
    if (idx < 0) return;
    var m = Rules.MODES[idx];
    p.modesDone[idx] = true;
    p.modesCompleted = 0;
    for (var i = 0; i < 6; i++) if (p.modesDone[i]) p.modesCompleted++;
    var award = 1500000 + p.modesCompleted * 1000000;
    this.add(award);
    A.sfx.superJackpot();
    this.dmdBig('SAGA COMPLETE', U.commas(award), 2.8, 14);
    this.endMode(true);

    if (p.modesCompleted === 3 && !p.ebLit && p.extraBallsAwarded < 2) {
      p.ebLit = true;
      this.dmdSmall('EXTRA BALL LIT', 'SHOOT THE WELL', 2.5);
    }
    if (p.modesCompleted >= 6 && !p.wizardDone) {
      this.dmdBig('RAGNAROK IS LIT', 'SHOOT THE WELL', 3.2, 15);
    }
  };

  Engine.prototype.endMode = function (completed) {
    var p = this.pl();
    if (p.modeActive < 0) return;
    p.modeActive = -1;
    this.modeTimer = 0;
    this.g.table.resetDrops();
    if (!this.mbActive && !this.wizard) A.setMusic('play');
    this.refreshLamps();
  };

  /* ---------------------------------------------------------- multiball */
  Engine.prototype.startMultiball = function () {
    var p = this.pl();
    this.mbActive = true;
    this.jackpotValue = 1000000 + p.mbPlayed * 250000;
    this.jackpotsThisMb = 0;
    this.superLit = false;
    p.mbPlayed++;
    p.locks = 0;
    p.lockReady = false;
    this.ballSave = 12;
    this.ballSaveTotal = 12;
    A.sfx.multiball();
    A.setMusic('multiball');
    this.flashAll(1);
    this.g.addBalls(2);
    this.refreshLamps();
    D.show({
      id: 'mbstart', prio: 9, dur: 3.4,
      draw: function (d, t) { drawMultiballIntro(d, t); }
    });
  };

  Engine.prototype.endMultiball = function () {
    this.mbActive = false;
    this.superLit = false;
    A.setMusic(this.pl() && this.pl().modeActive >= 0 ? 'mode' : 'play');
    this.g.table.resetDrops();
    this.refreshLamps();
  };

  /* ------------------------------------------------------------- wizard */
  Engine.prototype.startWizard = function () {
    var p = this.pl();
    this.wizard = true;
    this.wizardTimer = 75;
    this.wizardShots = {};
    p.wizardDone = true;
    this.ballSave = 20;
    this.ballSaveTotal = 20;
    A.setMusic('wizard');
    A.sfx.multiball();
    this.flashAll(1);
    this.g.addBalls(3);
    this.refreshLamps();
    D.show({
      id: 'wizstart', prio: 10, dur: 4.0,
      draw: function (d, t) { drawWizardIntro(d, t); }
    });
  };
  Engine.prototype.endWizard = function () {
    this.wizard = false;
    A.setMusic('play');
    this.refreshLamps();
  };

  /* ================================================================ SWITCH */
  Engine.prototype.onSwitch = function (tag, ball, info) {
    var p = this.pl();
    if (!p) return;
    var g = this.g;
    var parts = tag.split(':');
    var kind = parts[0], idx = parseInt(parts[1], 10);

    switch (kind) {
      case 'bumper': {
        var bm = g.table.bumpers[idx];
        bm.fire(ball);
        A.sfx.bumper(idx);
        this.flash('f_bump', 0.75);
        if (this.tilted) return;
        p.bBumpers++;
        var bv = this.mbActive ? 25000 : (p.modeActive === 4 ? 40000 : 12000);
        this.add(bv);
        if (p.modeActive === 4) this.modeShot('bumper');
        if (p.bBumpers % 25 === 0) {
          this.add(250000);
          this.dmdSmall('RUNE CAVERN', U.commas(250000), 1.4);
        }
        break;
      }
      case 'sling': {
        var sl = g.table.slings[idx];
        sl.fire(ball, sl.col.nx, sl.col.ny);
        A.sfx.sling();
        this.flash(idx === 0 ? 'f_left' : 'f_right', 0.45);
        if (!this.tilted) this.add(3000);
        break;
      }
      case 'drop': {
        var d = g.table.drops[idx];
        if (g.table.dropTarget(d)) {
          A.sfx.dropTarget(idx);
          if (this.tilted) return;
          p.bDrops++;
          this.add(this.mbActive ? 50000 : 30000);
          if (p.modeActive === 0) this.modeShot('drop');
          if (g.table.dropsDown() >= 3) this.dropBankComplete();
          else this.dmdSmall('JOTUNN', U.commas(30000), 0.8);
          this.refreshLamps();
        }
        break;
      }
      case 'standup': {
        var st = g.table.standups[idx];
        st.press = 1; st.flash = 1;
        A.sfx.target(idx);
        if (this.tilted) return;
        p.bTargets++;
        this.add(20000);
        if (p.modeActive === 4) this.modeShot('standup');
        if (!(p.thorMask & (1 << idx))) {
          p.thorMask |= (1 << idx);
          this.dmdSmall('T-H-O-R', ['T', 'H', 'O', 'R'][idx] + ' COLLECTED', 1.1);
          if (p.thorMask === 15) this.thorComplete();
        }
        this.refreshLamps();
        break;
      }
      case 'flipper':
        if (info && info.speed > 900) A.sfx.flipperHitBall(U.clamp(info.speed / 3000, 0.2, 1));
        break;
    }
  };

  Engine.prototype.dropBankComplete = function () {
    var p = this.pl();
    this.dropCycle++;
    A.sfx.dropBank();
    this.flash('f_scoop', 1);
    var v = 200000 * this.dropCycle;
    this.add(v);
    if (p.modeActive < 0 && p.locks < 3 && !this.mbActive) {
      p.lockReady = true;
      this.dmdBig('LOCK IS LIT', 'SHOOT THE WELL', 2.2, 12);
    } else {
      this.dmdBig('JOTUNN DOWN', U.commas(v), 1.8, 12);
    }
    this.refreshLamps();
  };

  Engine.prototype.thorComplete = function () {
    var p = this.pl();
    p.thorMask = 0;
    p.thorCycles++;
    this.g.table.kickback.lit = true;
    var v = 500000 * p.thorCycles;
    this.add(v);
    A.sfx.knocker();
    this.flashAll(0.8);
    this.dmdBig('T-H-O-R', 'KICKBACK LIT  ' + U.commas(v), 2.4, 13);
    if (p.thorCycles >= 2 && !p.ebLit && p.extraBallsAwarded < 2) {
      p.ebLit = true;
      this.dmdSmall('EXTRA BALL LIT', 'SHOOT THE WELL', 2.4);
    }
    if (p.thorCycles >= 3 && !p.specialLit) p.specialLit = true;
    this.refreshLamps();
  };

  /* ================================================================= ZONES */
  Engine.prototype.onZone = function (tag, ball, entering, zone) {
    if (!entering) return;
    var p = this.pl();
    if (!p) return;
    var g = this.g;
    var parts = tag.split(':');

    switch (parts[0]) {
      case 'lane': {
        var i = parseInt(parts[1], 10);
        A.sfx.rollover();
        var ro = g.table.rollovers[i];
        if (ro) ro.flash = 1;
        if (this.tilted) return;
        this.add(25000);
        if (this.superSkillLive) {
          this.superSkillLive = false;
          this.skillLive = false;
          var sv = 1500000;
          this.add(sv);
          A.sfx.superJackpot();
          this.flashAll(1);
          this.dmdBig('SUPER SKILL SHOT', U.commas(sv), 2.4, 14);
        }
        if (!(p.runeMask & (1 << i))) {
          p.runeMask |= (1 << i);
          if (p.runeMask === 15) {
            p.runeMask = 0;
            var old = p.bonusX;
            p.bonusX = p.bonusX >= 5 ? Math.min(10, p.bonusX + 5) : p.bonusX + 1;
            this.add(150000);
            A.sfx.knocker();
            this.dmdBig('R-U-N-E', 'BONUS ' + p.bonusX + 'X', 2.2, 13);
          }
        }
        this.refreshLamps();
        break;
      }
      case 'inlane': {
        A.sfx.rollover();
        var ri = g.table.rollovers[4 + (parts[1] === 'left' ? 0 : 1)];
        if (ri) ri.flash = 1;
        if (this.tilted) return;
        this.add(10000);
        this.setLamp(parts[1] === 'left' ? 'inl' : 'inr', 'on');
        // an inlane keeps a combo alive
        if (this.comboT > 0) this.comboT = Math.max(this.comboT, 2.4);
        break;
      }
      case 'outlane': {
        if (this.tilted) return;
        this.add(30000);
        if (p.specialLit && parts[1] === 'right') {
          p.specialLit = false;
          this.awardSpecial();
        }
        break;
      }
      case 'kickback': {
        var kb = g.table.kickback;
        if (kb.lit && !this.tilted) {
          kb.lit = false;
          kb.flash = 1;
          kb.uses++;
          ball.vx = 210; ball.vy = -3050;
          ball.x = kb.x; ball.y = kb.y - 6;
          A.sfx.kicker();
          this.flash('f_left', 1);
          this.dmdBig('KICKBACK', 'BALL RETURNED', 1.8, 12);
          this.refreshLamps();
        }
        break;
      }
      case 'spinner': {
        var sp = g.table.spinner;
        sp.hit(ball);
        var n = Math.max(1, Math.round(Math.abs(sp.omega) * 0.5));
        sp.spins += n;
        if (this.tilted) return;
        p.bSpins += n;
        var sv2 = (p.modeActive === 1 ? 25000 : this.mbActive ? 15000 : 6000) * n;
        this.add(sv2);
        A.sfx.spinner(U.clamp(Math.abs(sp.omega) / 40, 0, 1));
        if (p.modeActive === 1) this.modeShot('spinner');
        this.dmdSpinner(n, sv2);
        break;
      }
      case 'orbit': {
        if (parts[1] === 'left' || parts[1] === 'right') {
          if (ball.vy < -220) ball._orbitFrom = parts[1];
          else if (ball._orbitFrom && ball._orbitFrom !== parts[1] && ball._orbitTop) {
            // completed a full circuit out the far side
            ball._orbitFrom = null; ball._orbitTop = false;
          }
        } else if (parts[1] === 'top') {
          if (ball._orbitFrom && !ball._orbitTop) {
            ball._orbitTop = true;
            var side = ball._orbitFrom;
            if (!this.tilted) {
              p.bOrbits++;
              p.loops++;
              this.flash('f_top', 0.8);
              this.majorShot(side === 'left' ? 'lorbit' : 'rorbit', ball);
            }
            // re-arms when the ball next enters a lane travelling upward
          }
        }
        break;
      }
      case 'drain':
        g.ballDrained(ball);
        break;
      case 'shooterlane':
        break;
      case 'scoopcap': {
        var sc0 = g.table.scoop;
        if (sc0.cooldown > 0 || sc0.ball || ball.state !== 'field') return;
        if (ball.vy < -60 || ball.speed() < 240) g.captureScoop(ball);
        break;
      }
      case 'rampentry': {
        var which = parts[1];
        var ramp = which === 'left' ? g.table.rampL : g.table.rampR;
        if (ball.state !== 'field') return;
        // Commit to the ramp on any upward entry; the ramp solver rolls a weak
        // shot straight back out of the flap, exactly like the real thing.
        if (ball.vy < -200) g.enterRamp(ball, ramp);
        break;
      }
    }
  };

  /* --------------------------------------------------------- ramp results */
  Engine.prototype.rampMade = function (ramp) {
    var p = this.pl();
    if (!p) return;
    ramp.made++;
    ramp.flash = 1;
    p.bRamps++;
    A.sfx.rampMade(ramp.made);
    this.flash(ramp.name === 'left' ? 'f_lramp' : 'f_rramp', 0.9);
    if (this.tilted) return;
    this.majorShot(ramp.name === 'left' ? 'lramp' : 'rramp', null);
  };
  Engine.prototype.rampRolledBack = function (ramp) {
    A.sfx.rampEnter();
    this.dmdSmall('TOO SLOW', 'HIT IT HARDER', 1.0);
  };

  /* --------------------------------------------------------------- scoop */
  Engine.prototype.scoopCaptured = function (ball) {
    var p = this.pl();
    var g = this.g;
    var sc = g.table.scoop;
    A.sfx.scoop();
    sc.flash = 1;
    this.flash('f_scoop', 1);

    if (this.tilted) { sc.timer = 0.6; sc.pending = 'eject'; return; }

    // 1. wizard mode
    if (!this.wizard && p.modesCompleted >= 6 && !p.wizardDone && !this.mbActive) {
      sc.pending = 'wizard'; sc.timer = 1.4;
      return;
    }
    // 2. super jackpot / multiball jackpot
    if (this.mbActive) {
      this.majorShot('scoop', ball);
      sc.pending = 'eject'; sc.timer = 0.7;
      return;
    }
    if (this.wizard) {
      this.majorShot('scoop', ball);
      sc.pending = 'eject'; sc.timer = 0.7;
      return;
    }
    // 3. extra ball
    if (p.ebLit) {
      p.ebLit = false;
      sc.pending = 'extraball'; sc.timer = 1.2;
      return;
    }
    // 4. ball lock
    if (p.lockReady && p.locks < 3) {
      sc.pending = 'lock'; sc.timer = 1.1;
      return;
    }
    // 5. start a saga
    if (p.modeActive < 0) {
      var next = -1;
      for (var i = 0; i < 6; i++) {
        var k = (this.dropCycle + i) % 6;
        if (!p.modesDone[k]) { next = k; break; }
      }
      if (next >= 0) { sc.pending = 'mode'; sc.modeIdx = next; sc.timer = 1.2; return; }
    }
    // 6. plain value
    this.majorShot('scoop', ball);
    sc.pending = 'eject'; sc.timer = 0.8;
  };

  Engine.prototype.scoopResolve = function () {
    var g = this.g, sc = g.table.scoop, p = this.pl();
    var act = sc.pending;
    sc.pending = null;
    switch (act) {
      case 'wizard':
        this.startWizard();
        return 'hold';
      case 'extraball':
        this.awardExtraBall();
        return 'eject';
      case 'lock':
        p.locks++;
        p.lockReady = false;
        A.sfx.kicker();
        this.flashAll(0.7);
        if (p.locks >= 3) {
          this.dmdBig('BALL 3 LOCKED', 'MJOLNIR MULTIBALL', 2.4, 14);
          this.startMultiball();
          return 'hold';
        }
        this.dmdBig('BALL ' + p.locks + ' LOCKED', 'KNOCK DOWN JOTUNN', 2.2, 12);
        g.table.resetDrops();
        this.refreshLamps();
        return 'eject';
      case 'mode':
        this.startMode(sc.modeIdx);
        g.table.resetDrops();
        return 'eject';
      default:
        return 'eject';
    }
  };

  /* ------------------------------------------------------------- awards */
  Engine.prototype.awardExtraBall = function () {
    var p = this.pl();
    p.extraBalls++;
    p.extraBallsAwarded++;
    A.sfx.knocker();
    this.flashAll(1);
    this.dmdBig('EXTRA BALL', 'SHOOT AGAIN', 3.0, 15);
    this.refreshLamps();
  };
  Engine.prototype.awardSpecial = function () {
    this.g.credits++;
    A.sfx.knocker();
    setTimeout(function () { A.sfx.knocker(); }, 180);
    this.flashAll(1);
    this.dmdBig('SPECIAL', 'CREDIT AWARDED', 3.0, 15);
  };

  /* ================================================================= TILT */
  Engine.prototype.nudged = function (power) {
    if (this.tilted || this.g.state !== 'play') return;
    this.tiltMeter = (this.tiltMeter || 0) + power * 0.42;
    if (this.tiltMeter > 1) {
      this.tiltMeter = 0.35;
      this.tiltWarn++;
      if (this.tiltWarn >= 3) this.doTilt();
      else {
        A.sfx.tiltWarn();
        D.show({
          id: 'tiltwarn', prio: 9, dur: 1.6,
          draw: function (d, t) {
            d.clear(0);
            var on = Math.floor(t * 8) % 2 === 0;
            d.text(F.F5x7, 'DANGER', 64, 6, on ? 15 : 6, { align: 'center', scale: 2 });
            d.text(F.F5x7, 'TILT WARNING', 64, 24, 10, { align: 'center' });
          }
        });
      }
    }
  };
  Engine.prototype.doTilt = function () {
    this.tilted = true;
    A.sfx.tilt();
    A.musicOn(false);
    this.allLampsOff();
    this.g.world.gravityScale = 1;
    D.show({
      id: 'tilt', prio: 12, dur: 4,
      draw: function (d, t) {
        d.clear(0);
        if (Math.floor(t * 6) % 2 === 0) {
          d.text(F.F5x7, 'TILT', 64, 8, 15, { align: 'center', scale: 3 });
        }
      }
    });
  };

  /* ================================================================ UPDATE */
  Engine.prototype.update = function (dt) {
    this.t += dt;
    var p = this.pl();
    var g = this.g;

    if (this.comboT > 0) {
      this.comboT -= dt;
      if (this.comboT <= 0) { this.comboN = 0; this.lastShot = ''; this.refreshLamps(); }
    }
    if (this.tiltMeter) this.tiltMeter = Math.max(0, this.tiltMeter - dt * 0.35);

    if (this.ballSave > 0 && g.state === 'play') {
      this.ballSave -= dt;
      if (this.ballSave <= 0) { this.ballSave = 0; this.refreshLamps(); }
    }

    if (p && g.state === 'play') {
      // saga timer
      if (p.modeActive >= 0 && !this.mbActive) {
        var m = Rules.MODES[p.modeActive];
        this.modeTimer -= dt;
        if (m.type === 'hurry') {
          this.hurryValue = Math.max(500000, m.base * (this.modeTimer / m.dur));
          if (Math.floor(this.modeTimer * 2) !== Math.floor((this.modeTimer + dt) * 2))
            A.sfx.hurryTick(1 - this.modeTimer / m.dur);
        }
        if (this.modeTimer <= 0) {
          this.dmdBig('SAGA ENDED', 'TRY AGAIN', 1.8, 9);
          this.endMode(false);
        }
      }
      if (this.wizard) {
        this.wizardTimer -= dt;
        if (this.wizardTimer <= 0) this.endWizard();
      }
    }

    // lamp phase bookkeeping
    for (var k in this.lamps) this.lamps[k].t += dt;
    if (this.scoreFlashT > 0) this.scoreFlashT -= dt;
  };

  /* ================================================================== DMD */
  Engine.prototype.dmdBig = function (title, sub, dur, level) {
    D.show({
      id: 'evt', prio: 6, dur: dur || 1.6,
      draw: function (d, t) {
        d.clear(0);
        var flash = t < 0.25 && Math.floor(t * 20) % 2 === 0;
        d.dither(0, 0, 128, 32, flash ? 6 : 2, 0);
        var y = title.length > 12 ? 3 : 2;
        d.text(F.F5x7, title, 64, y, flash ? 15 : (level || 12),
          { align: 'center', scale: title.length > 14 ? 1 : 2 });
        d.text(F.F5x7, sub, 64, 22, 11, { align: 'center' });
        d.marquee(t, 7);
      }
    });
  };
  Engine.prototype.dmdSmall = function (title, sub, dur) {
    D.show({
      id: 'small', prio: 4, dur: dur || 1.1,
      draw: function (d, t) {
        d.clear(0);
        d.text(F.F5x7, title, 64, 5, 13, { align: 'center' });
        d.text(F.F5x7, sub, 64, 18, 9, { align: 'center' });
        d.fillRect(0, 30, Math.round(128 * (1 - t / (dur || 1.1))), 2, 5);
      }
    });
  };
  Engine.prototype.dmdSpinner = function (n, val) {
    var sp = this.g.table.spinner;
    D.show({
      id: 'spin', prio: 3, dur: 0.8,
      draw: function (d, t) {
        d.clear(0);
        d.text(F.F5x7, 'JORMUNGANDR', 64, 2, 10, { align: 'center' });
        d.text(F.FBIG, U.commas(val), 64, 13, 14, { align: 'center' });
        // a wriggling serpent along the bottom
        for (var x = 0; x < 128; x++) {
          var y = 29 + Math.round(Math.sin(x * 0.28 + sp.angle) * 1.6);
          d.px(x, y, 7);
        }
      }
    });
  };

  /* ------------------------------------------------------- base DMD screen */
  Engine.prototype.baseDraw = function (d, time) {
    var g = this.g, p = this.pl();
    d.clear(0);
    if (!p) return;

    var bright = this.scoreFlashT > 0 ? 15 : 13;

    if (this.mbActive) {
      d.text(F.F5x7, 'MULTIBALL', 2, 1, 10);
      d.text(F.F5x7, this.superLit ? 'SUPER JP LIT' : 'JP ' + U.shortScore(this.jackpotValue), 126, 1, 9, { align: 'right' });
      d.score(p.score, 126, 12, bright, { align: 'right' });
      d.fillRect(0, 30, Math.round(128 * U.clamp(this.ballSave / (this.ballSaveTotal || 1), 0, 1)), 2, 6);
      return;
    }

    if (this.wizard) {
      d.text(F.F5x7, 'RAGNAROK', 2, 1, Math.floor(time * 8) % 2 ? 15 : 8);
      d.text(F.F5x7, Math.ceil(this.wizardTimer) + '', 126, 1, 12, { align: 'right' });
      d.score(p.score, 126, 12, 15, { align: 'right' });
      return;
    }

    if (p.modeActive >= 0) {
      var m = Rules.MODES[p.modeActive];
      d.text(F.F5x7, m.name, 2, 1, 12);
      d.text(F.F5x7, Math.ceil(this.modeTimer) + '', 126, 1, Math.ceil(this.modeTimer) <= 5 ? 15 : 9, { align: 'right' });
      d.score(p.score, 126, 11, bright, { align: 'right' });
      if (m.type === 'hurry')
        d.text(F.F5x7, U.commas(Math.round(this.hurryValue)), 2, 25, 11);
      else if (m.type === 'sequence')
        d.text(F.F5x7, 'SHOT ' + (this.seqIdx + 1) + ' OF ' + m.shots.length, 2, 25, 9);
      else
        d.text(F.F5x7, this.modeHits + ' / ' + m.need, 2, 25, 9);
      d.bar(96, 25, 30, 6, this.modeTimer / m.dur, 8);
      return;
    }

    // idle score screen
    d.score(p.score, 126, 3, bright, { align: 'right' });
    d.text(F.F5x7, 'BALL ' + g.ballNum, 2, 25, 9);
    if (g.players.length > 1) d.text(F.F5x7, 'PLAYER ' + (g.current + 1), 126, 25, 9, { align: 'right' });
    else if (p.bonusX > 1) d.text(F.F5x7, p.bonusX + 'X BONUS', 126, 25, 9, { align: 'right' });
    if (this.ballSave > 0) {
      d.text(F.F5x7, 'SAVE', 2, 1, Math.floor(time * 9) % 2 ? 13 : 4);
    } else if (this.skillLive) {
      d.text(F.F5x7, 'SKILL: ' + SHOT_LABEL[SKILL_SHOTS[this.skillIdx]].split(' ')[0], 2, 1,
        Math.floor(time * 5) % 2 ? 13 : 6);
    } else if (p.lockReady) {
      d.text(F.F5x7, 'LOCK LIT', 2, 1, Math.floor(time * 7) % 2 ? 14 : 5);
    } else if (g.table.dropsDown() < 3) {
      d.text(F.F5x7, 'JOTUNN ' + (3 - g.table.dropsDown()), 2, 1, 7);
    }
  };

  /* ------------------------------------------------------- intro screens */
  function drawModeIntro(d, t, m, idx) {
    d.clear(0);
    var slide = U.easeOutCubic(U.clamp(t / 0.45, 0, 1));
    var x = Math.round(U.lerp(-140, 0, slide));
    d.dither(0, 0, 128, 32, 2, Math.floor(t * 10));
    d.text(F.F5x7, 'SAGA ' + (idx + 1), 64 + x, 1, 8, { align: 'center' });
    d.text(F.F5x7, m.name, 64 + x, 9, Math.floor(t * 12) % 2 ? 15 : 11,
      { align: 'center', scale: m.name.length > 13 ? 1 : 1 });
    d.text(F.F5x7, m.hint, 64 - x, 20, 10, { align: 'center' });
    d.marquee(t, 6);
    // art flourish
    if (t > 0.5) d.bolt(4, 8, 1, 12), d.bolt(117, 8, 1, 12);
  }

  function drawMultiballIntro(d, t) {
    d.clear(0);
    var n = Math.min(3, Math.floor(t * 3) + 1);
    for (var i = 0; i < n; i++) {
      var bx = 16 + i * 20 + Math.sin(t * 6 + i) * 3;
      var by = 20 + Math.cos(t * 5 + i * 2) * 5;
      d.circle(Math.round(bx), Math.round(by), 4, 14, true);
      d.circle(Math.round(bx), Math.round(by), 4, 8, false);
    }
    d.hammer(96, 6, Math.floor(t * 10) % 2 ? 15 : 9);
    var flick = Math.floor(t * 9) % 2;
    d.text(F.F5x7, 'MJOLNIR', 62, 2, flick ? 15 : 10, { align: 'center' });
    d.text(F.F5x7, 'MULTIBALL', 62, 11, flick ? 10 : 15, { align: 'center' });
    if (t > 1.6) d.text(F.F5x7, 'SHOOT THE RAMPS', 62, 25, 11, { align: 'center' });
  }

  function drawWizardIntro(d, t) {
    d.clear(0);
    // a storm of bolts
    var rng = new U.Rng(1234);
    for (var i = 0; i < 9; i++) {
      var x = ((i * 37 + Math.floor(t * 60)) % 140) - 6;
      var yy = (i * 7) % 20;
      d.bolt(x, yy, 1, i % 2 ? 8 : 13);
    }
    var big = Math.floor(t * 7) % 2;
    d.fillRect(6, 8, 116, 15, 0);
    d.text(F.F5x7, 'RAGNAROK', 64, 9, big ? 15 : 12, { align: 'center', scale: 2 });
    if (t > 1.4) d.text(F.F5x7, 'ALL SHOTS LIT', 64, 26, 11, { align: 'center' });
    d.marquee(t, 15);
  }

  /* ------------------------------------------------------- bonus countdown */
  Rules.bonusScenes = function (g, p, onDone) {
    var rows = [
      ['RAMPS', p.bRamps, 12000],
      ['ORBITS', p.bOrbits, 9000],
      ['JOTUNN', p.bDrops, 6000],
      ['SPINS', p.bSpins, 1200],
      ['TARGETS', p.bTargets, 5000],
      ['SAGAS', p.modesCompleted, 250000]
    ];
    var idx = 0, sub = 0, acc = 0, phase = 'rows', tickT = 0, mulShown = 0;
    var total = 0;
    for (var i = 0; i < rows.length; i++) total += rows[i][1] * rows[i][2];
    var grand = total * p.bonusX;

    D.show({
      id: 'bonus', prio: 11, dur: 0,
      draw: function (d, t) {
        d.clear(0);
        d.text(F.F5x7, 'END OF BALL BONUS', 64, 1, 10, { align: 'center' });
        if (phase === 'rows') {
          var r = rows[Math.min(idx, rows.length - 1)];
          d.text(F.F5x7, r[0], 2, 12, 12);
          d.text(F.F5x7, String(sub), 62, 12, 12, { align: 'right' });
          d.text(F.F5x7, U.commas(acc), 126, 12, 14, { align: 'right' });
        } else if (phase === 'mult') {
          d.text(F.F5x7, 'BONUS ' + p.bonusX + 'X', 64, 11, Math.floor(t * 12) % 2 ? 15 : 8, { align: 'center', scale: 2 });
          d.text(F.F5x7, U.commas(mulShown), 126, 26, 13, { align: 'right' });
        } else {
          d.text(F.F5x7, 'TOTAL', 2, 12, 11);
          d.text(F.FBIG, U.commas(grand), 126, 12, 15, { align: 'right' });
        }
      }
    });

    return function step(dt) {
      tickT += dt;
      if (phase === 'rows') {
        var speed = 0.055;
        while (tickT > speed) {
          tickT -= speed;
          var r = rows[idx];
          if (!r) { phase = 'mult'; tickT = 0; break; }
          if (sub < r[1]) {
            sub++;
            acc += r[2];
            p.score += r[2];
            A.sfx.bonusTick(sub);
          } else {
            idx++; sub = 0;
            if (idx >= rows.length) { phase = p.bonusX > 1 ? 'mult' : 'total'; tickT = 0; break; }
          }
        }
      } else if (phase === 'mult') {
        var sp = 0.03;
        while (tickT > sp) {
          tickT -= sp;
          var stepv = Math.max(1, Math.round(total * (p.bonusX - 1) / 40));
          mulShown = Math.min(total * (p.bonusX - 1), mulShown + stepv);
          p.score += Math.min(stepv, total * (p.bonusX - 1) - (mulShown - stepv));
          A.sfx.bonusTick(mulShown % 12);
          if (mulShown >= total * (p.bonusX - 1)) { phase = 'total'; tickT = 0; break; }
        }
      } else {
        if (tickT > 1.5) {
          D.kill('bonus');
          onDone(grand);
          return true;
        }
      }
      return false;
    };
  };

})(window.PB = window.PB || {});
