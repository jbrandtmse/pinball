// THUNDER CANYON — game rules: scoring, feature ladders, modes, multiball,
// ball saving, ball search, tilt, extra ball, end-of-ball bonus.
// Runs headless-safe: no DOM. Emits a display model + events for audio/UI.

var T = typeof TCU !== 'undefined' ? TCU : require('./util.js');

const RULES = {};

const MODES = {
  ROCKSLIDE: { dur: 45, label: 'ROCKSLIDE' },
  GOLDRUSH: { dur: 65, label: 'GOLD RUSH MULTIBALL' },
  THUNDERSTORM: { dur: 90, label: 'THUNDERSTORM!' },
};

class Rules {
  constructor(world) {
    this.w = world;
    this.state = 'attract';
    this.score = 0;
    this.bonusPot = 0;
    this.mult = 1;               // bonus multiplier 1..6
    this.ball = 0;               // current ball number (1-based)
    this.ballsPerGame = 3;
    this.extraBalls = 0;
    this.rushLetters = { R: false, U: false, S: false, H: false };
    this.goldLetters = { G: false, O: false, L: false, D: false };
    this.rushDone = false;      // RUSH collected once -> arms rockslide charge
    this.goldDone = false;      // GOLD collected -> arms multiball
    this.mode = null;           // {key, t}
    this.jackpot = 100000;      // multiball jackpot base, escalates
    this.skillActive = false;
    this.ballSaveT = 0;
    this.kickbackUsed = false;
    this.tilted = false;
    this.searches = 0;
    this.vaultQueue = [];       // captured-ball timers
    this.plungerWait = 0;
    this.msg = ''; this.msgT = 0;
    this.msgHi = 0;
    this.display = { combo: 0 };
    this.overReason = null;
    this.events = [];
  }

  ev(type, data = {}) { this.events.push(Object.assign({ type }, data)); }
  say(text, ttl = 2.4, hi = false) {
    if (hi || ttl >= this.msgT || this.msgT <= 0) { this.msg = text; this.msgT = ttl; }
    else if (text && hi) { this.msg = text; this.msgT = Math.max(this.msgT, ttl); }
  }

  // ------------------------------------------------------------------ start
  startGame(balls = 3) {
    this.state = 'playing';
    this.score = 0; this.bonusPot = 0; this.mult = 1;
    this.ball = 0; this.extraBalls = 0;
    this.rushLetters = { R: false, U: false, S: false, H: false };
    this.goldLetters = { G: false, O: false, L: false, D: false };
    this.rushDone = false; this.goldDone = false;
    this.mode = null; this.jackpot = 100000;
    this.bankLadder = 0;
    this.modeCompleted = null;
    this.vaultQueue = [];
    this.tilted = false;
    this.overReason = null;
    this.w.clearTilt();
    this.newBall();
  }

  newBall() {
    this.ball += 1;
    this.skillActive = true;
    this.searches = 0;
    this.plungerWait = 0;
    this.ballSaveT = 0;
    this.kickbackUsed = false;
    this.w.kickbacks[0].enabled = false;
    // reset drop bank
    for (const k in this.w.targetStates) this.w.targetStates[k].down = false;
    this.w.clearTilt();
    this.tilted = false;
    // ball waits on plunger
    for (const f of this.w.flippers) f.locked = false;
    const b = this.w.addBall(18.5, 44.25, 0, 0, 'plunger');
    this.say('BALL ' + this.ball, 2.0);
    this.ev('ballStart', { ball: this.ball });
  }

  launch() {
    const b = this.w.plungerRelease();
    if (!b) return;
    this.ballSaveT = 8.0;
    this.say('GO!', 1.0);
    this.ev('launch');
  }

  // ------------------------------------------------------------------ money
  add(pts, why) {
    const got = Math.round(pts * this.activeFactor());
    this.score += got;
    this.bonusPot += Math.min(got, 200000) * 0.2;
    if (why) this.ev('score', { pts: got, why });
    return got;
  }
  activeFactor() { return this.mode ? 2 : 1; }

  // ------------------------------------------------------------------ frame
  update(dt, physEvents) {
    this.msgT = Math.max(0, this.msgT - dt);
    if (this.state !== 'playing') { this.handle(physEvents); return; }

    // ball save countdown
    if (this.ballSaveT > 0) {
      this.ballSaveT -= dt;
      if (this.ballSaveT <= 0) this.say('BALL SAVE OFF', 1.2);
    }

    // mode timers: surviving the clock completes the mode
    if (this.mode) {
      this.mode.t -= dt;
      if (this.mode.t <= 0) this.endMode(true);
    }

    // auto-plunger: new ball parked too long (never while the player holds)
    const parked = this.w.balls.find(b => b.state === 'plunger');
    if (parked) {
      if (this.w.plunger.charge > 0) this.plungerWait = 0;
      else this.plungerWait += dt;
      if (this.plungerWait > 4.2 && !this.tilted) {
        this.w.plunger.charge = 0.92;
        this.launch();
      }
    } else this.plungerWait = 0;

    // vault eject queue
    this.vaultQueue = this.vaultQueue.filter(q => {
      q.t -= dt;
      if (q.t <= 0) this.vaultResolve(q);
      return q.t > 0;
    });

    // ball search: any ball resting too long
    for (const b of this.w.activeBalls()) {
      // a ball that dribbled back down the shooter lane gets relaunched
      if (b.p.x > 17.5 && b.p.y > 43.6 && b.speed() < 6) {
        b.v = { x: (Math.random() - 0.5) * 3, y: -182 };
        this.ev('launch');
        continue;
      }
      if (b.restT > 3.6) {
        b.restT = 0;
        this.searches += 1;
        if (this.searches <= 3) {
          this.say('BALL SEARCH', 1.6, true);
          this.ev('ballSearch');
          this.w.nudge((Math.random() - 0.5) * 26, -34 - Math.random() * 10);
          // searches must not tilt us out
          this.w.tilt = Math.min(this.w.tilt, 2);
          this.tilted = false;
        } else {
          this.say('BALL LOST', 2.0, true);
          this.ev('searchLost');
          this.forceDrain(b);
        }
      }
    }

    // kickback rearm timing (after it fires it's dead until bank/multiball rearms)
    this.handle(physEvents);
  }

  forceDrain(b) {
    if (b.state !== 'play') return;
    b.state = 'removed';
    // the queued drain event reaches handle() next frame; no direct call
    this.w.ev('drain', { ballId: b.id, search: true });
  }

  // ------------------------------------------------------------- phys events
  handle(evts) {
    for (const e of evts) {
      switch (e.type) {
        case 'rollover': this.onRollover(e.id); break;
        case 'pop': this.onPop(e); break;
        case 'sling': this.add(25000, 'sling'); break;
        case 'spinner': this.onSpinner(e); break;
        case 'target': this.onTarget(e.id); break;
        case 'standup': this.onStandup(e.id); break;
        case 'capture': this.onCapture(e); break;
        case 'kickback': this.kickbackUsed = true; this.add(75000, 'kickback'); break;
        case 'drain': this.onDrain(e.ballId); break;
        case 'tilt': this.onTilt(); break;
        case 'launch': break;
        case 'gate': case 'rubber': case 'nudge': case 'resting': case 'flipperHit': break;
      }
    }
  }

  onRollover(id) {
    if (this.state !== 'playing') return;
    if (id.startsWith('SKILL')) {
      const i = id.slice(5);
      const pts = i === '2' ? 1000000 : 500000;
      if (this.skillActive) {
        this.skillActive = false;
        this.add(pts, 'skill');
        this.say(i === '2' ? 'SKILL SHOT! 1M' : 'SKILL LANE ' + fmt(pts), 2.2, true);
        this.ev('skill', { i });
      } else this.add(25000, 'toproll');
      return;
    }
    if (id === 'TOP') {
      this.add(250000, 'orbit');
      this.say('TOP ORBIT ' + fmt(250000 * this.activeFactor()), 1.8);
      if (this.mode && this.mode.key === 'GOLDRUSH') this.hitJackpot('ORBIT');
      return;
    }
    if ('GOLD'.includes(id) && id.length === 1) {
      if (!this.goldLetters[id] && !this.goldDone) {
        this.goldLetters[id] = true;
        this.add(50000, 'gold');
        if (Object.values(this.goldLetters).every(Boolean)) {
          this.goldDone = true;
          this.say('GOLD COLLECTED - MULTIBALL ARMED', 3.0, true);
          this.ev('armMultiball');
        } else this.say('LETTER ' + id + '!', 1.6);
      } else this.add(25000, 'gold');
      return;
    }
  }

  onPop(e) {
    const base = this.mode && this.mode.key === 'ROCKSLIDE' ? 150000 : 75000;
    this.add(base, 'pop');
    this.display.combo = (this.display.combo || 0) + 1;
    if (this.mode && this.mode.key === 'GOLDRUSH') this.hitJackpot('POP');
    if (this.mode && this.mode.key === 'THUNDERSTORM') this.hitJackpot('POP');
    if (this.display.combo % 7 === 0) this.add(500000, 'combo');
    if (!this.kickbackUsed && this.mode) this.w.kickbacks[0].enabled = true;
  }

  onSpinner(e) {
    this.add(50000, 'spinner');
    if (this.mode === null && !this.rushDone) this.say('DYNAMITE!', 1.2);
  }

  onStandup(id) {
    this.add(100000, 'standup');
    if (!this.rushLetters[id] && !this.rushDone) {
      this.rushLetters[id] = true;
      if (Object.values(this.rushLetters).every(Boolean)) {
        this.rushDone = true;
        this.say('R U S H ! ROCKSLIDE READY', 3.0, true);
        this.ev('armRockslide');
      } else this.say('STANDUP ' + id, 1.4);
    }
  }

  onTarget(id) {
    this.add(100000, 'target');
    const all = ['BANK0', 'BANK1', 'BANK2', 'BANK3'].every(k => this.w.targetStates[k].down);
    if (all) this.bankComplete();
  }

  bankComplete() {
    this.bankLadder = (this.bankLadder || 0) + 1;
    const step = Math.min(this.bankLadder, 4);
    if (step < 4) {
      const pts = [100000, 500000, 1000000][step - 1];
      this.mult = Math.min(6, this.mult + 1);
      this.add(pts, 'bank');
      this.say('BANK! ' + fmt(pts) + '  x' + this.mult, 2.6, true);
      this.ev('bank', { step });
    } else {
      this.add(5000000, 'bank');
      this.extraBalls += 1;
      this.say('BANK MAX + EXTRA BALL', 3.0, true);
      this.ev('extraBall');
      this.bankLadder = 0;
    }
    // rerack after a beat
    setTimeoutSafe(() => {
      for (const k in this.w.targetStates) this.w.targetStates[k].down = false;
    }, 900);
  }

  onCapture(e) {
    if (e.id !== 'VAULT') return;
    this.add(75000, 'vault');
    this.vaultQueue.push({ t: 0.95, ballId: e.ballId });
    this.say('IN THE VAULT...', 1.2);
  }

  vaultResolve(q) {
    const w = this.w;
    const vault = w.captures[0];
    this._alt = !this._alt;
    const side = this._alt ? 1 : -1;
    const ejectSide = { x: 0.94 * side, y: -0.34 };
    if (this.state !== 'playing') {
      w.ejectCaptured(q.ballId, vault.c, ejectSide, 62);
      return;
    }
    const mc = this.modeCompleted || {};
    if (!this.mode && mc.THUNDERSTORM_ARMED) {
      w.ejectCaptured(q.ballId, vault.c, ejectSide, 66);
      this.startThunderstorm();
    } else if (this.goldDone && !this.mode) {
      this.startGoldRush(q.ballId);
    } else if (this.rushDone && !this.mode) {
      this.startRockslide(q.ballId);
    } else if (this.mode && this.mode.key !== 'THUNDERSTORM' && this.mode.balls) {
      // reload during multiball: +1 ball & +10s
      this.mode.t += 10;
      this.add(this.jackpot, 'reload');
      this.say('VAULT RELOAD +1 BALL', 2.4, true);
      w.ejectCaptured(q.ballId, vault.c, ejectSide, 74);
      this.spawnBall({ x: 8.7, y: 18.6 }, { x: -0.75, y: -0.66 }, 52);
      this.ev('reload');
    } else {
      this.add(this.jackpot * 0.5, 'vaultjack');
      this.say(this.tilted ? 'TILTED' : 'VAULT JACKPOT', 1.8, true);
      w.ejectCaptured(q.ballId, vault.c, ejectSide, 66);
    }
    // vault guard: prevent instant recapture chaos
    vault.enabled = false;
    setTimeoutSafe(() => { vault.enabled = true; }, 1100);
  }

  spawnBall(pos, dir, speed) {
    const b = this.w.addBall(pos.x, pos.y, dir.x * speed, dir.y * speed);
    this.ev('ballSpawn');
    return b;
  }

  startRockslide(ballId) {
    this.rushDone = false;
    this.mode = { key: 'ROCKSLIDE', t: MODES.ROCKSLIDE.dur, max: MODES.ROCKSLIDE.dur };
    this.say('ROCKSLIDE! 45 SEC', 3.0, true);
    this.ev('modeStart', { key: 'ROCKSLIDE' });
    this.w.ejectCaptured(ballId, this.w.captures[0].c, { x: 0.72, y: -0.69 }, 72);
    this.ballSaveT = Math.max(this.ballSaveT, 5);
  }

  startGoldRush(ballId) {
    this.goldDone = false;
    this.jackpot = 100000;
    this.mode = { key: 'GOLDRUSH', t: MODES.GOLDRUSH.dur, max: MODES.GOLDRUSH.dur, balls: true };
    this.rushDone = false;
    this.mode.storms = (this.mode.storms || 0);
    this.modeCompleted = this.modeCompleted || { ROCKSLIDE: false, GOLDRUSH: false };
    this.ev('multiballArmWizard', {});
    this.say('GOLD RUSH! 3 BALLS', 3.0, true);
    this.ev('modeStart', { key: 'GOLDRUSH' });
    this.w.ejectCaptured(ballId, this.w.captures[0].c, { x: -0.72, y: -0.69 }, 66);
    this.spawnBall({ x: 7.4, y: 17.2 }, { x: -0.55, y: -0.835 }, 50);
    this.spawnBall({ x: 12.85, y: 17.2 }, { x: 0.55, y: -0.835 }, 50);
    this.ballSaveT = 10;
    this.mult = Math.max(this.mult, 2);
  }

  startThunderstorm() {
    this.modeCompleted = { ROCKSLIDE: false, GOLDRUSH: false, THUNDERSTORM_ARMED: false };
    this.mode = { key: 'THUNDERSTORM', t: MODES.THUNDERSTORM.dur, max: MODES.THUNDERSTORM.dur, balls: true };
    this.jackpot = 250000;
    this.say('WIZARD: THUNDERSTORM!', 3.5, true);
    this.ev('modeStart', { key: 'THUNDERSTORM' });
    this.ballSaveT = 12;
    const spots = [
      [{ x: 7.6, y: 16.8 }, { x: -0.5, y: -0.866 }],
      [{ x: 12.65, y: 16.8 }, { x: 0.5, y: -0.866 }],
      [{ x: 8.8, y: 19.5 }, { x: -0.3, y: -0.95 }],
      [{ x: 11.45, y: 19.5 }, { x: 0.3, y: -0.95 }],
    ];
    for (const [p, d] of spots) this.spawnBall(p, d, 56);
    this.ev('wizard');
  }

  hitJackpot(why) {
    const mult = this.mode && this.mode.key === 'THUNDERSTORM' ? 2 : 1;
    const got = this.jackpot * mult;
    this.score += got;
    this.jackpot = Math.min(1500000, this.jackpot + 25000);
    this.say('JACKPOT! ' + fmt(got), 2.0, true);
    this.ev('jackpot', { pts: got, why });
  }

  endMode(completed) {
    if (!this.mode) return;
    const key = this.mode.key;
    if (completed) {
      this.modeCompleted = this.modeCompleted || {};
      this.modeCompleted[key] = true;
      this.add(2000000, 'modeComplete');
      this.say(key + ' COMPLETE 2M', 3.0, true);
      if (this.modeCompleted.ROCKSLIDE && this.modeCompleted.GOLDRUSH) {
        this.modeCompleted.THUNDERSTORM_ARMED = true;
        this.say('THUNDERSTORM ARMED - HIT VAULT', 3.5, true);
        this.ev('wizardArm');
      }
    } else {
      this.say(key + ' OVER', 1.6);
    }
    this.mode = null;
    this.ev('modeEnd', { key });
  }

  onTilt() {
    if (this.tilted) return;
    this.tilted = true;
    this.ballSaveT = 0;
    this.w.kickbacks[0].enabled = false;
    for (const f of this.w.flippers) { f.up = false; f.locked = true; }
    this.say('TILT !', 3.0, true);
    this.ev('tilt');
  }

  // ----------------------------------------------------------------- drain
  onDrain(ballId) {
    if (this.state !== 'playing') return;
    const saved = this.ballSaveT > 0 && !this.tilted;
    const nPlay = this.w.activeBalls().length; // drained ball already removed

    if (this.mode && this.mode.key === 'THUNDERSTORM' && nPlay >= 1) {
      // the storm machine-guns fresh balls up the shooter lane until the
      // last one goes down — respawning mid-field would rain them straight
      // back into the drain and snowball
      this.spawnBall({ x: 18.5, y: 43.8 }, { x: 0, y: -1 }, 172);
      this.say('STORM CONTINUES', 1.6);
      this.ev('stormFeed');
      return;
    }
    if (saved && this.mode && this.mode.balls && nPlay >= 1) {
      // rescue during multiball: relaunch from the shooter lane, never
      // above the drain (a rescue that re-drains loops forever)
      this.ballSaveT = Math.max(this.ballSaveT, 4);
      this.spawnBall({ x: 18.5, y: 43.8 }, { x: 0, y: -1 }, 150);
      this.say('BALL SAVED', 1.8, true);
      this.ev('save');
      return;
    }
    if (saved && nPlay === 0) {
      this.ballSaveT = 0;
      this._alt = !this._alt;
      const dx = this._alt ? 0.8 : -0.8;
      this.spawnBall({ x: 10.125, y: 26.0 }, { x: dx, y: -0.6 }, 52);
      this.say('BALL SAVED!', 2.0, true);
      this.ev('save');
      return;
    }
    if (this.mode && this.mode.balls && nPlay >= 1) return; // multiball continues

    // last ball down: end any active mode without crediting completion
    if (this.mode) this.endMode(false);

    // single-ball drained: bonus + next ball
    if (nPlay > 0) return; // safety
    this.endOfBall();
  }

  endOfBall() {
    if (this.mode) this.endMode(false);
    const bonus = Math.floor(this.bonusPot * this.mult / 100) * 100;
    this.score += bonus;
    this.ev('bonus', { bonus, mult: this.mult, pot: this.bonusPot });
    // extra ball?
    let extraMsg = '';
    if (this.extraBalls > 0) {
      this.extraBalls -= 1;
      extraMsg = ' EXTRA BALL';
      this.ev('playExtra');
    }
    this.state = 'ballEnd';
    this.endT = 3.2;
    this.lastBonus = bonus;
    this.extraMsg = extraMsg;
    this.ev('ballEnd', { ball: this.ball, bonus });
  }

  tickBallEnd(dt) {
    this.endT -= dt;
    if (this.endT <= 0) {
      const nBalls = this.ball >= this.ballsPerGame && this.extraBalls === 0;
      if (nBalls) {
        this.state = 'gameOver';
        this.ev('gameOver', { score: this.score });
      } else {
        this.state = 'playing';
        // clear lingering physics balls (should be none)
        this.w.balls = this.w.balls.filter(b => b.state === 'play');
        this.newBall();
      }
    }
  }

  resetToAttract() {
    this.state = 'attract';
    this.mode = null;
    this.ballSaveT = 0;
    this.tilted = false;
    this.w.balls.length = 0;
    this.w.clearTilt();
  }
}

function fmt(n) {
  if (n >= 1000000000) return (n / 1000000000).toFixed(1).replace('.0', '') + 'B';
  if (n >= 1000000) return (n / 1000000).toFixed(1).replace('.0', '') + 'M';
  if (n >= 1000) return Math.round(n / 1000) + 'K';
  return String(n);
}
RULES.fmt = fmt;

function setTimeoutSafe(fn, ms) { RULES._timers.push({ fn, at: Date.now() + ms }); }
RULES._timers = [];
RULES.pumpTimers = function () {
  const now = Date.now();
  RULES._timers = RULES._timers.filter(t => {
    if (t.at <= now) { t.fn(); return false; }
    return true;
  });
};

RULES.Rules = Rules;
if (typeof module !== 'undefined' && module.exports) module.exports = RULES;
if (typeof window !== 'undefined') window.RULES = RULES;
