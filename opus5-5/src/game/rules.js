// MIDNIGHT HEIST — game rules (the "ROM").
// Consumes switch closures from the Machine, keeps score, runs modes and
// multiball, drives lamps / display / sound through small interfaces.
// Deterministic and DOM-free so it can be exercised headlessly.
import { JOBS as JOB_SHORT } from '../table/layout.js';
import * as S from '../display/scenes.js';

export const BALLS_PER_GAME = 3;
const SKILL_SAFE = new Set(['shooter', 'gateShooter', 'orbitR', 'orbitL', 'returnLGate', 'returnRGate', 'inL', 'inR', 'spinner']);
const BALL_SAVE_SECS = 10;
const MB_SAVE_SECS = 15;
const WIZ_SAVE_SECS = 20;
const REPLAY_SCORE = 150_000_000;

export const JOB_DEFS = [
  { id: 'CASE', name: 'CASE THE JOINT', blurb: 'SHOOT ALL LIT SHOTS', time: 40 },
  { id: 'SAFE', name: 'CRACK THE SAFE', blurb: 'RIP THE SPINNER', time: 40 },
  { id: 'LASER', name: 'LASER MAZE', blurb: 'KNOCK DOWN THE GRID', time: 40 },
  { id: 'DRIVE', name: 'GETAWAY DRIVE', blurb: 'HIT THE RAMPS', time: 40 },
  { id: 'INSIDE', name: 'INSIDE MAN', blurb: 'VAULT HURRY-UP', time: 30 },
  { id: 'CROSS', name: 'DOUBLE CROSS', blurb: 'HIT THE MOVING SHOT', time: 40 },
];

// Major shots and the switches that register them
export const SHOTS = ['orbitL', 'rampL', 'vault', 'rampR', 'hideout', 'orbitR'];
const SHOT_LAMP = { orbitL: 'arrLO', rampL: 'arrLR', vault: 'arrVault', rampR: 'arrRR', hideout: 'arrHide', orbitR: 'arrRO' };
const JP_SHOTS = ['orbitL', 'rampL', 'rampR', 'orbitR'];
const WIZ_SHOTS = JP_SHOTS; // the vault itself holds the Big Score
const JP_LAMP = { orbitL: 'jpLO', rampL: 'jpLR', rampR: 'jpRR', orbitR: 'jpRO' };

const NULL_UI = {
  dmd: { show() {}, setBase() {}, clear() {}, busy: () => false },
  sound: { play() {}, music() {}, speech() {} },
  flash() {},
  storage: { load: () => null, save() {} },
};

function newPlayer(n) {
  return {
    n, score: 0, ball: 1, extraBalls: 0, bonusX: 1,
    lanes: [false, false, false], laneCompletions: 0,
    pops: 0, popLevel: 1,
    locks: 0, lockLit: false, doorHitsNeeded: 0, doorHits: 0, mbCount: 0, lockBaseReq: 0,
    dropBanks: 0,
    ramps: 0, orbits: 0, scout: 0, jobLit: true,
    jobsPlayed: [], jobsDone: [],
    ebLitCount: 0, ebAwarded: 0, extraBallLit: false,
    kickbackLit: true, standups: [false, false],
    spinnerLitUntil: 0,
    skillCount: 0, replayAwarded: false,
    bonus: { ramps: 0, orbits: 0, locks: 0, jobs: 0, switches: 0, pops: 0 },
    wizardDone: 0,
  };
}

export class Game {
  constructor(machine, ui = {}) {
    this.m = machine;
    this.ui = { ...NULL_UI, ...ui };
    this.dmd = this.ui.dmd;
    this.t = 0;
    this.state = 'attract';
    this.players = [];
    this.pi = 0;
    this.timers = [];
    this.flashers = {};
    this.lampShowT = 0;
    this.highScores = this.loadHighScores();
    this.lastScores = [];
    this.credits = 'FREE PLAY';
    this.events = []; // log for tests
    machine.onSwitch((id, info) => this.onSwitch(id, info));
    this.dmd.setBase((d, t) => this.drawBase(d, t));
    this.enterAttract();
  }

  // ------------------------------------------------------------ utilities
  get p() { return this.players[this.pi]; }
  after(sec, fn, tag) { const tm = { at: this.t + sec, fn, tag }; this.timers.push(tm); return tm; }
  cancel(tag) { this.timers = this.timers.filter(t => t.tag !== tag); }
  log(type, data = {}) { this.events.push({ t: this.t, type, ...data }); if (this.events.length > 5000) this.events.shift(); }
  sfx(name, opts) { this.ui.sound.play(name, opts); }
  say(text) { this.ui.sound.speech && this.ui.sound.speech(text); }
  flash(id, dur = 0.25) { this.flashers[id] = Math.max(this.flashers[id] || 0, dur); this.ui.flash(id, dur); }
  show(scene, dur = 2, prio = 5) { this.dmd.show(scene, { duration: dur, priority: prio }); }

  score(points, reason) {
    if (!this.p || this.tilted || this.state !== 'playing') return 0;
    const mult = this.wizard ? 2 : 1;
    const pts = Math.round(points * mult / 10) * 10;
    this.p.score += pts;
    if (!this.p.replayAwarded && this.p.score >= REPLAY_SCORE) {
      this.p.replayAwarded = true;
      this.sfx('knocker');
      this.show(S.bigText('REPLAY', 'FREE GAME AWARDED'), 2, 7);
    }
    return pts;
  }

  // ------------------------------------------------------------- attract
  enterAttract() {
    this.state = 'attract';
    this.tilted = false;
    this.m.setFlippersEnabled(false);
    this.dmd.clear();
    this.ui.sound.music('attract');
    this.attractIdx = 0;
    this.attractNext = 0;
  }
  attractCycle() {
    const hs = this.highScores;
    const pages = [
      () => this.show(S.logo(), 6, 1),
      () => this.show(S.bigText('PRESS START', this.credits), 3, 1),
      () => this.show(S.highScorePage('GRAND CHAMPION', [hs[0]]), 3.5, 1),
      () => this.show(S.highScorePage('HIGH SCORES', hs.slice(1, 3), 1), 3.5, 1),
      () => this.show(S.highScorePage('HIGH SCORES', hs.slice(3, 5), 3), 3.5, 1),
      () => this.lastScores.length ? this.show(S.lastScores(this.lastScores), 3.5, 1) : this.show(S.city(), 4, 1),
      () => this.show(S.textPage(['KNOCK DOWN THE', 'LASER GRID TO', 'CRACK THE VAULT']), 3.5, 1),
      () => this.show(S.textPage(['LOCK 3 BALLS FOR', 'VAULT MULTIBALL']), 3, 1),
      () => this.show(S.textPage(['PLAY ALL 6 JOBS TO', 'LIGHT THE BIG SCORE']), 3.5, 1),
    ];
    pages[this.attractIdx % pages.length]();
    this.attractIdx++;
  }

  // --------------------------------------------------------------- game
  pressStart() {
    if (this.state === 'attract' || this.state === 'gameover') { this.startGame(); return; }
    if (this.state === 'hsentry') { this.hsSelect(); return; }
    if (this.state === 'jobselect') { this.confirmJobSelect(); return; }
    if (this.state === 'playing' && this.p.ball === 1 && this.pi === 0 && this.players.length < 4 && this.players.every(pl => pl.ball === 1)) {
      this.players.push(newPlayer(this.players.length + 1));
      this.sfx('addPlayer');
      this.show(S.bigText(`PLAYER ${this.players.length}`, 'ADDED'), 1.5, 6);
    }
  }
  startGame() {
    this.m.resetAll();
    this.players = [newPlayer(1)];
    this.pi = 0;
    this.timers = [];
    this.state = 'playing';
    this.log('gameStart');
    this.sfx('start');
    this.say('Tonight we rob the vault');
    this.ui.sound.music('main');
    this.dmd.clear();
    this.show(S.bigText('MIDNIGHT HEIST', 'THE JOB IS ON'), 2.2, 6);
    this.startBall();
  }

  startBall() {
    const p = this.p;
    this.tilted = false; this.tiltWarnings = 0;
    this.ballActive = false;         // becomes true once the ball leaves the shooter lane
    this.ballSaveUntil = 0; this.ballSaveArmed = BALL_SAVE_SECS;
    this.mb = null; this.wizard = null;
    this.job = null;
    this.combo = { last: 0, n: 0, lastShot: null };
    this.skill = { active: true, lane: Math.floor(Math.random() * 3), timer: 0, superUntil: 0, viaOrbit: false };
    this.rampStreak = 0;
    this.m.setFlippersEnabled(true);
    this.m.kickbackArmed = p.kickbackLit;
    this.m.closeDoor();
    this.m.resetDrops();
    this.restoreDoor();
    this.m.serveBall();
    this.dmd.clear();
    this.show(S.ballStart(p.n, p.ball, this.players.length), 1.6, 4);
    this.ui.sound.music('main');
    this.log('ballStart', { player: p.n, ball: p.ball });
  }

  // Called when the ball first leaves the shooter lane
  launchDetected() {
    if (this.ballActive) return;
    this.ballActive = true;
    this.ballSaveUntil = this.t + this.ballSaveArmed;
    this.ballSaveArmed = 0;
    this.skill.timer = 6;
  }

  // ------------------------------------------------------------ switches
  onSwitch(id, info) {
    if (id === 'btnLeft' || id === 'btnRight') { this.onButton(id === 'btnLeft' ? 'left' : 'right', info.on); return; }
    if (this.state !== 'playing' && this.state !== 'jobselect') {
      if (id === 'drain') this.onDrainOutsideGame();
      if (id === 'hideout' || id === 'vault') this.after(0.5, () => this.m.eject(id));
      return;
    }
    if (id === 'tilt') { this.onTiltWarning(); return; }
    if (id === 'drain') { this.onDrain(info); return; }
    if (this.tilted) {
      if (id === 'hideout' || id === 'vault') this.after(0.4, () => this.m.eject(id));
      return;
    }
    if (id !== 'shooter' && id !== 'gateShooter' && id !== 'drain') {
      if (!this.ballActive && id !== 'plunge') this.launchDetected();
    }
    const h = this[`sw_${id}`];
    if (h) h.call(this, info);
    this.p.bonus.switches++;
    // the skill shot only counts if the plunged ball's first stop is a top lane
    if (this.skill.active && this.ballActive && !SKILL_SAFE.has(id)) this.skill.active = false;
  }

  onButton(side, on) {
    if (this.state === 'hsentry') { if (on) this.hsMove(side === 'left' ? -1 : 1); return; }
    if (this.state === 'jobselect') { if (on) this.moveJobSelect(side === 'left' ? -1 : 1); return; }
    if (this.state === 'bonus' && on && this.m.buttons.left && this.m.buttons.right) { this.bonusSpeed = 6; return; }
    if (this.state === 'attract' && on) { this.show(S.highScorePage('GRAND CHAMPION', [this.highScores[0]]), 2.5, 2); return; }
    if (this.state === 'playing' && on && !this.tilted) {
      // lane change: rotate lit K-E-Y lanes; also moves the skill-shot lane
      const p = this.p;
      if (this.skill.active && !this.ballActive) {
        this.skill.lane = (this.skill.lane + (side === 'left' ? 2 : 1)) % 3;
      } else {
        const L = p.lanes;
        p.lanes = side === 'left' ? [L[1], L[2], L[0]] : [L[2], L[0], L[1]];
      }
    }
  }

  // shooter lane / skill shot
  sw_shooter() { }
  sw_gateShooter() { this.launchDetected(); }

  laneHit(i) {
    const p = this.p;
    if (this.skill.active && this.skill.timer > 0) {
      this.skill.active = false;
      if (i === this.skill.lane) {
        const v = 1_000_000 + p.skillCount * 500_000;
        p.skillCount++;
        this.score(v);
        this.sfx('skillShot'); this.flash('flPops', 0.6);
        this.say('Skill shot');
        this.show(S.award('SKILL SHOT', v), 2.2, 7);
        this.log('skillShot', { v });
      }
    }
    if (!p.lanes[i]) {
      p.lanes[i] = true;
      this.score(25_000);
      this.sfx('laneLit');
      if (p.lanes.every(Boolean)) this.keyComplete();
    } else {
      this.score(5_000);
      this.sfx('rollover');
    }
  }
  sw_laneK() { this.laneHit(0); }
  sw_laneE() { this.laneHit(1); }
  sw_laneY() { this.laneHit(2); }

  keyComplete() {
    const p = this.p;
    p.laneCompletions++;
    this.after(0.35, () => { p.lanes = [false, false, false]; });
    this.flash('flPops', 0.5);
    let txt;
    if (p.bonusX < 6) { p.bonusX++; txt = `BONUS ${p.bonusX}X`; }
    else { this.score(1_000_000); txt = '1,000,000'; }
    if (!p.kickbackLit) { p.kickbackLit = true; this.m.kickbackArmed = true; txt += ' +KICKBACK'; }
    this.score(100_000);
    this.sfx('keyComplete');
    this.show(S.award('K-E-Y COMPLETE', null, txt), 2, 6);
    this.log('keyComplete', { bonusX: p.bonusX });
  }

  // pop bumpers — "alarms"
  popHit(id) {
    const p = this.p;
    p.pops++; p.bonus.pops++;
    this.score(5_000 * p.popLevel + 1_000);
    this.sfx('pop'); this.flash('flPops', 0.12);
    if (p.pops % 20 === 0 && p.popLevel < 6) {
      p.popLevel++;
      this.sfx('alarmLevel');
      this.show(S.award('ALARM LEVEL ' + p.popLevel, null, `POPS WORTH ${S.fmt(5000 * p.popLevel + 1000)}`), 1.8, 5);
    }
    if (this.job && this.job.id === 'INSIDE') this.jobInsideBump();
  }
  sw_pop1() { this.popHit(1); }
  sw_pop2() { this.popHit(2); }
  sw_pop3() { this.popHit(3); }

  sw_slingL() { this.score(1_010); this.sfx('sling'); }
  sw_slingR() { this.score(1_010); this.sfx('sling'); }
  sw_inL() { this.score(10_000); this.sfx('inlane'); this.combo.inlaneAt = this.t; }
  sw_inR() { this.score(10_000); this.sfx('inlane'); this.combo.inlaneAt = this.t; }
  sw_outL() { this.score(50_000); this.sfx('outlane'); }
  sw_outR() { this.score(50_000); this.sfx('outlane'); }
  sw_kickback() { }
  sw_kickbackFired() {
    this.p.kickbackLit = false;
    this.sfx('kickback'); this.flash('flLeft', 0.4);
    this.show(S.bigText('KICKBACK', 'SAVED!'), 1.2, 5);
  }

  sw_spinner() {
    const p = this.p;
    let v = p.spinnerLitUntil > this.t ? 5_000 : 1_000;
    if (this.job && this.job.id === 'SAFE') { v = 50_000; this.jobProgress(1); }
    this.score(v);
    this.sfx('spinner');
    this.p.bonus.switches++;
  }

  standupHit(i) {
    const p = this.p;
    this.score(25_000);
    this.sfx('standup');
    p.standups[i] = true;
    if (p.standups.every(Boolean)) {
      p.standups = [false, false];
      if (!p.kickbackLit) { p.kickbackLit = true; this.m.kickbackArmed = true; this.show(S.award('ALIBI SET', null, 'KICKBACK LIT'), 1.8, 5); }
      else { p.spinnerLitUntil = this.t + 20; this.score(250_000); this.show(S.award('ALIBI SET', 250_000, 'SPINNER LIT'), 1.8, 5); }
      this.sfx('keyComplete');
    }
  }
  sw_standC() { this.standupHit(0); }
  sw_standR() { this.standupHit(1); }

  // ---------------------------------------------------------- major shots
  majorShot(shot) {
    const c = this.combo;
    if (this.t - c.last < 4 && c.lastShot !== null) {
      c.n++;
      const v = 250_000 * c.n;
      this.score(v);
      this.sfx('combo');
      this.show(S.award(`${c.n + 1}-WAY COMBO`, v), 1.4, 4);
    } else c.n = 0;
    c.last = this.t; c.lastShot = shot;
    // multiball jackpots
    if (this.mb && this.mb.jp[shot]) this.collectJackpot(shot);
    if (this.wizard && this.wizard.lit[shot]) this.wizardShot(shot);
    if (this.job) this.jobShot(shot);
  }

  sw_orbitL(info) {
    if (info.vy < 0) { this.orbitShot('orbitL'); return; }
    // a full plunge loops the arch and comes down the left orbit: super skill shot window
    if (this.skill.active && this.skill.timer > 0) {
      this.skill.active = false;
      this.skill.superUntil = this.t + 6;
      this.sfx('superSkillLit');
      this.show(S.bigText('SUPER SKILL', 'SHOOT THE RIGHT RAMP'), 1.8, 5);
    }
  }
  sw_orbitR(info) { if (info.vy < 0) this.orbitShot('orbitR'); }
  orbitShot(which) {
    const p = this.p;
    p.orbits++; p.bonus.orbits++;
    this.score(50_000);
    this.sfx('orbit');
    if (!p.jobLit && !this.job && !this.jobPending) {
      p.scout++;
      if (p.scout >= 3) { p.scout = 0; p.jobLit = true; this.sfx('jobLit'); this.show(S.award('JOB IS LIT', null, 'SHOOT THE HIDEOUT'), 1.8, 5); }
      else this.show(S.award('SCOUTING', null, `${3 - p.scout} MORE TO LIGHT JOB`), 1.2, 3);
    }
    this.majorShot(which);
  }

  sw_rampLEnter() { this.sfx('rampEnter'); }
  sw_rampREnter() { this.sfx('rampEnter'); }
  sw_rampLMade() { this.rampShot('rampL'); }
  sw_rampRMade() {
    if (this.skill.superUntil > this.t) {
      this.skill.superUntil = 0;
      const v = 3_000_000 + this.p.skillCount * 1_000_000;
      this.p.skillCount++;
      this.score(v); this.sfx('skillShot'); this.say('Super skill shot');
      this.show(S.award('SUPER SKILL SHOT', v), 2.4, 8);
    }
    this.p.spinnerLitUntil = this.t + 20;
    this.rampShot('rampR');
  }
  rampShot(which) {
    const p = this.p;
    p.ramps++; p.bonus.ramps++;
    this.rampStreak++;
    const v = 100_000 + 25_000 * Math.min(20, this.rampStreak - 1);
    this.score(v);
    this.sfx('rampMade');
    this.flash(which === 'rampL' ? 'flLeft' : 'flRight', 0.3);
    if (p.ramps === 12 || p.ramps === 30) this.lightExtraBall('RAMP MASTER');
    this.majorShot(which);
  }

  // ------------------------------------------------------ laser grid / vault
  dropHit(i) {
    const p = this.p;
    this.score(25_000);
    this.sfx('dropTarget');
    // while a job lights the vault, working the laser grid counts as the vault shot
    if (this.job && this.job.lit && this.job.lit.vault) this.jobShot('vault');
    if (this.job && this.job.id === 'LASER') { this.score(750_000); this.jobProgress(0); }
    if (this.m.dropsDown.every(Boolean)) {
      p.dropBanks++;
      this.score(100_000 * Math.min(10, p.dropBanks));
      this.flash('flVault', 0.5);
      this.sfx('bankComplete');
      if (this.job && this.job.id === 'LASER') {
        this.jobProgress(1, true);
        if (!this.job) return;
        this.after(0.8, () => this.m.resetDrops(), 'dropReset');
        return;
      }
      if (!this.mb && !this.wizard) {
        p.lockLit = true;
        p.doorHits = 0;
        p.doorHitsNeeded = p.lockBaseReq + p.locks;
        if (p.doorHitsNeeded === 0) this.openVaultForLock();
        else this.show(S.award('LASERS DOWN', null, `CRACK THE DOOR ${p.doorHitsNeeded}X`), 1.8, 5);
      }
    }
  }
  sw_drop1() { this.dropHit(0); }
  sw_drop2() { this.dropHit(1); }
  sw_drop3() { this.dropHit(2); }

  openVaultForLock() {
    this.m.openDoor();
    this.sfx('doorOpen');
    this.say('The vault is open');
    this.show(S.vaultOpen('LOCK IS LIT'), 2, 6);
  }
  sw_vaultDoor() {
    const p = this.p;
    this.score(50_000);
    this.sfx('doorHit'); this.flash('flVault', 0.2);
    if (this.job && this.job.lit && this.job.lit.vault) this.jobShot('vault');
    if (this.job && this.job.id === 'SAFE') { this.score(500_000); this.jobProgress(4); }
    if (p.lockLit && !this.m.doorOpen) {
      p.doorHits++;
      if (p.doorHits >= p.doorHitsNeeded) this.openVaultForLock();
      else this.show(S.award('CRACKING', null, `${p.doorHitsNeeded - p.doorHits} MORE`), 1.2, 4);
    }
  }

  // Whenever the vault isn't meant to be open, keep the door shut.
  restoreDoor() {
    const p = this.p;
    const want = (this.mb && this.mb.superLit) || (this.wizard && this.wizard.superLit) ||
      (this.job && this.job.id === 'INSIDE') || (p && p.lockLit && p.doorHits >= p.doorHitsNeeded);
    if (want) this.m.openDoor(); else this.m.closeDoor();
    if (want && !this.m.dropsDown.every(Boolean)) this.m.dropAll();
  }

  sw_vault() {
    const p = this.p;
    this.flash('flVault', 0.8);
    this.sfx('vaultEnter');
    let hold = 1.2;
    this.majorShot('vault');
    if (this.job && this.job.id === 'INSIDE') { this.collectInsideMan(); hold = 2; }
    if (this.wizard && this.wizard.superLit) { this.wizardSuper(); hold = 2.5; }
    else if (this.mb && this.mb.superLit) { this.collectSuper(); hold = 2.5; }
    else if (!this.mb && !this.wizard && p.lockLit) {
      p.lockLit = false;
      p.locks++; p.bonus.locks++;
      this.score(500_000);
      if (p.locks >= 3) { this.startVaultMultiball(); return; }
      this.sfx('lock'); this.say(`Ball ${p.locks} locked`);
      this.show(S.ballLocked(p.locks), 2.4, 7);
      hold = 2.2;
      this.after(hold + 0.6, () => { if (!this.mb && !this.p.lockLit) this.m.resetDrops(); });
    } else {
      this.score(250_000);
    }
    this.after(hold, () => { this.m.eject('vault'); this.restoreDoor(); });
  }

  startVaultMultiball() {
    const p = this.p;
    p.locks = 0; p.mbCount++;
    p.lockBaseReq = Math.min(3, p.lockBaseReq + 1);
    this.mb = { jp: {}, jpValue: 5_000_000, collected: 0, superLit: false, superValue: 20_000_000, addABall: true, startedAt: this.t };
    for (const s of JP_SHOTS) this.mb.jp[s] = true;
    this.sfx('multiball'); this.say('Vault multiball');
    this.ui.sound.music('multiball');
    this.show(S.multiball(), 3.2, 9);
    this.log('multiballStart');
    // hold, then release the vault ball and launch two more
    this.after(2.6, () => {
      this.m.eject('vault');
      this.m.serveBall(true); this.m.serveBall(true);
      this.ballSaveUntil = this.t + MB_SAVE_SECS;
      this.m.closeDoor();
      this.m.resetDrops();
    });
  }
  collectJackpot(shot) {
    const mb = this.mb;
    mb.jp[shot] = false;
    const v = mb.jpValue;
    this.score(v);
    mb.collected++;
    mb.jpValue += 1_000_000;
    this.sfx('jackpot'); this.say('Jackpot');
    this.flash('flVault', 0.6); this.flash('flPops', 0.6); this.flash('flLeft', 0.6); this.flash('flRight', 0.6);
    this.show(S.jackpot('JACKPOT', v), 2.2, 8);
    this.log('jackpot', { v });
    if (JP_SHOTS.every(s => !mb.jp[s])) {
      mb.superLit = true;
      this.m.dropAll();
      this.m.openDoor();
      this.after(2.2, () => this.show(S.vaultOpen('SUPER JACKPOT LIT'), 2, 7));
    }
  }
  collectSuper() {
    const mb = this.mb;
    const v = mb.superValue + mb.collected * 1_000_000;
    this.score(v);
    mb.superLit = false;
    mb.superValue += 10_000_000;
    for (const s of JP_SHOTS) mb.jp[s] = true;
    this.sfx('superJackpot'); this.say('Super jackpot');
    for (const f of ['flVault', 'flPops', 'flLeft', 'flRight', 'flHide']) this.flash(f, 1.2);
    this.show(S.jackpot('SUPER JACKPOT', v), 3, 9);
    this.log('superJackpot', { v });
    this.after(2.5, () => { this.m.closeDoor(); this.m.resetDrops(); });
  }
  endMultiball() {
    this.mb = null;
    this.ui.sound.music(this.job ? 'job' : 'main');
    this.show(S.bigText('MULTIBALL', 'OVER'), 1.5, 4);
    this.restoreDoor();
    this.m.resetDrops();
    if (this.p.mbCount === 1) this.lightExtraBall('FIRST MULTIBALL');
    this.log('multiballEnd');
  }

  // --------------------------------------------------------------- hideout
  sw_hideout() {
    const p = this.p;
    this.flash('flHide', 0.5);
    this.sfx('scoop');
    this.majorShot('hideout');
    if (this.state !== 'playing') return;
    const actions = [];
    if (p.extraBallLit) actions.push(() => this.collectExtraBall());
    if (this.mb && this.mb.addABall) actions.push(() => this.addABall());
    let select = false;
    if (!this.mb && !this.wizard && !this.job) {
      if (p.jobsPlayed.length >= JOB_DEFS.length && p.jobLit) actions.push(() => this.startWizard());
      else if (p.jobLit) select = true;
      else if (!p.extraBallLit) actions.push(() => this.mystery());
    } else if (!actions.length) {
      this.score(500_000);
      this.show(S.award('HIDEOUT', 500_000), 1.2, 4);
    }
    let delay = 0.3;
    for (const fn of actions) { this.after(delay, fn); delay += 1.8; }
    if (select) { this.jobPending = true; this.after(delay, () => this.beginJobSelect(), 'jobSelectStart'); }
    else this.after(Math.max(1.0, delay), () => this.releaseHideout(), 'hideoutRelease');
  }
  releaseHideout() {
    if (this.state === 'jobselect') return; // job select releases it
    this.m.eject('hideout');
  }
  mystery() {
    const p = this.p;
    const awards = [
      ['BIG POINTS', () => this.score(1_500_000), 1_500_000],
      ['500,000', () => this.score(500_000)],
      ['BONUS +1X', () => { p.bonusX = Math.min(6, p.bonusX + 1); }],
      ['LIGHT KICKBACK', () => { p.kickbackLit = true; this.m.kickbackArmed = true; }],
      ['ALARM LEVEL UP', () => { p.popLevel = Math.min(6, p.popLevel + 1); }],
      ['BALL SAVE 10 SEC', () => { this.ballSaveUntil = Math.max(this.ballSaveUntil, this.t) + 10; }],
      ['SCOUT +2', () => { p.scout += 2; if (p.scout >= 3) { p.scout = 0; p.jobLit = true; } }],
      ['SPINNER LIT', () => { p.spinnerLitUntil = this.t + 25; }],
    ];
    if (p.ebAwarded < 2 && Math.random() < 0.06) awards.push(['LIGHT EXTRA BALL', () => this.lightExtraBall()]);
    const [name, fn] = awards[Math.floor(Math.random() * awards.length)];
    fn();
    this.score(100_000);
    this.sfx('mystery');
    this.show(S.mystery(name), 2.0, 6);
  }
  lightExtraBall(reason) {
    const p = this.p;
    if (p.ebAwarded + (p.extraBallLit ? 1 : 0) >= 3) { this.score(2_000_000); return; }
    p.extraBallLit = true;
    this.sfx('ebLit'); this.say('Extra ball is lit');
    this.show(S.award('EXTRA BALL LIT', null, reason || 'SHOOT THE HIDEOUT'), 2, 6);
  }
  collectExtraBall() {
    const p = this.p;
    p.extraBallLit = false; p.extraBalls++; p.ebAwarded++;
    this.sfx('extraBall'); this.say('Extra ball');
    this.show(S.bigText('EXTRA BALL', 'SHOOT AGAIN'), 2.2, 8);
    this.log('extraBall');
  }
  addABall() {
    this.mb.addABall = false;
    this.m.serveBall(true);
    this.ballSaveUntil = Math.max(this.ballSaveUntil, this.t + 6);
    this.sfx('addABall');
    this.show(S.bigText('ADD-A-BALL', 'MORE CREW'), 1.6, 7);
  }

  // ------------------------------------------------------------------ jobs
  beginJobSelect() {
    const p = this.p;
    const open = JOB_DEFS.map((j, i) => i).filter(i => !p.jobsPlayed.includes(i));
    if (!open.length || this.state !== 'playing') { this.jobPending = false; this.mystery(); this.after(1.8, () => this.releaseHideout(), 'hideoutRelease'); return; }
    this.state = 'jobselect';
    this.jobPending = true;
    this.m.setFlippersEnabled(false);
    this.jobChoices = open;
    this.jobSel = 0;
    this.jobSelectTimer = 7;
    this.cancel('hideoutRelease');
    this.sfx('jobSelect');
    this.ui.sound.music('select');
    this.show(S.jobSelect(() => JOB_DEFS[this.jobChoices[this.jobSel]], () => this.jobSelectTimer), 8, 8);
  }
  moveJobSelect(d) {
    this.jobSel = (this.jobSel + d + this.jobChoices.length) % this.jobChoices.length;
    this.sfx('select');
  }
  confirmJobSelect() {
    if (this.state !== 'jobselect') return;
    const idx = this.jobChoices[this.jobSel];
    this.state = 'playing';
    this.jobPending = false;
    if (!this.tilted) this.m.setFlippersEnabled(true);
    this.dmd.clear();
    this.startJob(idx);
    this.after(1.4, () => this.m.eject('hideout'));
  }
  startJob(idx) {
    const p = this.p;
    const def = JOB_DEFS[idx];
    p.jobLit = false;
    p.jobsPlayed.push(idx);
    this.job = { idx, id: def.id, def, time: def.time, progress: 0, need: 0, lit: {}, value: 0, hits: 0, startedAt: this.t };
    const j = this.job;
    switch (def.id) {
      case 'CASE': for (const s of SHOTS) j.lit[s] = true; j.need = SHOTS.length; j.value = 1_000_000; break;
      case 'SAFE': j.need = 60; break;
      case 'LASER': j.need = 2; this.m.resetDrops(); break;
      case 'DRIVE': j.lit.rampL = j.lit.rampR = true; j.need = 5; j.value = 2_000_000; break;
      case 'INSIDE': j.value = 15_000_000; j.need = 1; this.m.dropAll(); this.m.openDoor(); j.lit.vault = true; break;
      case 'CROSS': j.need = 4; j.moveT = 0; j.pos = 0; j.lit.orbitL = true; break;
    }
    this.sfx('jobStart'); this.say(def.name.toLowerCase());
    this.ui.sound.music('job');
    this.show(S.jobIntro(def), 2.6, 8);
    this.log('jobStart', { job: def.id });
  }
  jobShot(shot) {
    const j = this.job;
    switch (j.id) {
      case 'CASE':
        if (j.lit[shot]) {
          j.lit[shot] = false; j.progress++;
          const v = j.value; j.value += 250_000; this.score(v);
          this.sfx('jobHit'); this.show(S.jobHit(j.def.name, v, `${j.need - j.progress} TO GO`), 1.4, 6);
          if (j.progress >= j.need) this.completeJob(5_000_000);
        }
        break;
      case 'DRIVE':
        if (shot === 'rampL' || shot === 'rampR') {
          j.progress++; const v = j.value; j.value += 500_000; this.score(v); j.time += 3;
          this.sfx('jobHit'); this.show(S.jobHit('GETAWAY DRIVE', v, `${Math.max(0, j.need - j.progress)} TO GO`), 1.4, 6);
          if (j.progress >= j.need) this.completeJob(10_000_000);
        }
        break;
      case 'CROSS':
        if (j.lit[shot]) {
          j.progress++; this.score(3_000_000);
          this.sfx('jobHit'); this.show(S.jobHit('DOUBLE CROSS', 3_000_000, `${Math.max(0, j.need - j.progress)} TO GO`), 1.4, 6);
          this.crossMove();
          if (j.progress >= j.need) this.completeJob(6_000_000);
        }
        break;
    }
  }
  jobProgress(kind, bank) {
    const j = this.job; if (!j) return;
    if (j.id === 'SAFE') {
      if (kind === 1) j.progress++;
      if (kind === 4) j.progress += 5;
      if (j.progress >= j.need) this.completeJob(7_500_000);
    } else if (j.id === 'LASER' && bank) {
      j.progress++;
      this.show(S.jobHit('LASER MAZE', 2_000_000, `${Math.max(0, j.need - j.progress)} TO GO`), 1.4, 6);
      this.score(2_000_000);
      if (j.progress >= j.need) this.completeJob(8_000_000);
    }
  }
  jobInsideBump() { }
  collectInsideMan() {
    const j = this.job;
    const v = Math.round(j.value / 10000) * 10000;
    this.score(v);
    this.completeJob(0, v);
  }
  crossMove() {
    const j = this.job;
    j.lit = {};
    const opts = SHOTS.filter((s, i) => i !== j.pos);
    const s = opts[Math.floor(Math.random() * opts.length)];
    j.pos = SHOTS.indexOf(s);
    j.lit[s] = true;
    j.moveT = 0;
  }
  completeJob(bonus, shownValue) {
    const p = this.p, j = this.job;
    this.score(bonus);
    p.jobsDone.push(j.idx); p.bonus.jobs++;
    this.sfx('jobComplete'); this.say('Job complete');
    for (const f of ['flVault', 'flPops', 'flHide']) this.flash(f, 0.8);
    this.show(S.jobComplete(j.def.name, shownValue ?? bonus), 2.8, 9);
    this.log('jobComplete', { job: j.id });
    this.endJob(true);
  }
  endJob(done) {
    const p = this.p;
    const j = this.job; if (!j) return;
    this.job = null;
    if (!done) { this.sfx('jobFail'); this.show(S.bigText(j.def.name, 'TIME IS UP'), 1.8, 7); this.log('jobEnd', { job: j.id }); }
    if (!this.mb && !this.wizard) this.ui.sound.music('main');
    if (j.id === 'INSIDE' || j.id === 'LASER') { this.restoreDoor(); this.m.resetDrops(); }
    if (p.jobsDone.length === 3) this.lightExtraBall('3 JOBS DONE');
    if (p.jobsPlayed.length >= JOB_DEFS.length) {
      p.jobLit = true;
      this.after(2.5, () => this.show(S.award('THE BIG SCORE', null, 'IS LIT AT HIDEOUT'), 2.5, 7));
    } else p.scout = 0;
  }
  updateJob(dt) {
    const j = this.job;
    if (!j) return;
    const heldAll = this.m.ballsOnPlayfield() === 0;
    if (!heldAll && !this.m.shooterLaneBall()) j.time -= dt;
    if (j.id === 'INSIDE') j.value = Math.max(3_000_000, j.value - 400_000 * dt);
    if (j.id === 'CROSS') { j.moveT += dt; if (j.moveT > 3.2) this.crossMove(); }
    if (j.time <= 0) this.endJob(false);
  }

  // ---------------------------------------------------------------- wizard
  startWizard() {
    const p = this.p;
    p.jobLit = false;
    this.wizard = { lit: {}, value: 10_000_000, collected: 0, superLit: false, level: 1 };
    for (const s of WIZ_SHOTS) this.wizard.lit[s] = true;
    this.sfx('wizard'); this.say('The big score');
    this.ui.sound.music('wizard');
    this.show(S.bigScoreIntro(), 3.5, 10);
    this.log('wizardStart');
    this.after(3, () => {
      for (let i = 0; i < 3; i++) this.m.serveBall(true);
      this.ballSaveUntil = this.t + WIZ_SAVE_SECS;
    });
  }
  wizardShot(shot) {
    const w = this.wizard;
    w.lit[shot] = false;
    const v = w.value * w.level;
    this.score(v); w.collected++;
    this.sfx('jackpot');
    this.show(S.jackpot('BIG SCORE', v), 1.6, 8);
    if (Object.values(w.lit).every(x => !x)) {
      w.superLit = true;
      this.m.dropAll(); this.m.openDoor();
      this.show(S.vaultOpen('VAULT: 100,000,000'), 2, 8);
    }
  }
  wizardSuper() {
    const w = this.wizard;
    const v = 100_000_000 * w.level;
    this.score(v);
    this.sfx('superJackpot'); this.say('You got the big score');
    for (const f of ['flVault', 'flPops', 'flLeft', 'flRight', 'flHide']) this.flash(f, 2);
    this.show(S.jackpot('THE BIG SCORE', v), 3.5, 10);
    w.superLit = false; w.level++;
    for (const s of WIZ_SHOTS) w.lit[s] = true;
    this.after(3, () => { this.m.closeDoor(); this.m.resetDrops(); });
  }
  endWizard() {
    const p = this.p;
    this.wizard = null;
    p.wizardDone++;
    p.jobsPlayed = []; p.jobsDone = []; p.jobLit = true;
    this.ui.sound.music('main');
    this.show(S.bigText('HEIST COMPLETE', 'NEW JOBS AVAILABLE'), 2.5, 8);
    this.restoreDoor(); this.m.resetDrops();
  }

  // ------------------------------------------------------------ drains etc
  onDrain() {
    const inPlay = this.m.ballsInPlay();
    if (this.state === 'jobselect' && inPlay > 0) return;
    // ball save
    if (!this.tilted && this.ballActive && this.ballSaveUntil > 0 && this.t < this.ballSaveUntil + 2) {
      this.m.serveBall(true);
      this.sfx('ballSave'); this.say('Ball saved');
      if (!this.mb && !this.wizard) this.show(S.bigText('BALL SAVED', ''), 1.5, 6);
      this.log('ballSaved');
      return;
    }
    if (inPlay === 1 && (this.mb || this.wizard)) {
      if (this.mb) this.endMultiball();
      if (this.wizard) this.endWizard();
      return;
    }
    if (inPlay === 0) this.endBall();
  }
  onDrainOutsideGame() { }

  onTiltWarning() {
    if (this.tilted) return;
    this.tiltWarnings++;
    this.sfx('tiltWarning');
    if (this.tiltWarnings >= 3) this.tilt();
    else this.show(S.bigText('DANGER', this.tiltWarnings === 1 ? 'WARNING' : 'LAST WARNING'), 1.6, 9);
  }
  tilt() {
    if (this.state === 'jobselect') { this.state = 'playing'; this.jobPending = false; this.after(0.5, () => this.m.eject('hideout')); }
    this.tilted = true;
    this.m.setFlippersEnabled(false);
    this.m.kickbackArmed = false;
    this.sfx('tilt');
    this.ui.sound.music(null);
    this.dmd.clear();
    this.show(S.bigText('T I L T', ''), 30, 10);
    this.job = null; this.mb = null; this.wizard = null;
    this.ballSaveUntil = 0;
    this.log('tilt');
  }

  endBall() {
    const p = this.p;
    this.m.setFlippersEnabled(false);
    this.m.kickbackArmed = false;
    if (this.job) { this.job = null; }
    this.mb = null; this.wizard = null;
    this.state = 'bonus';
    this.ui.sound.music(null);
    this.dmd.clear();
    this.log('ballEnd', { player: p.n, ball: p.ball, score: p.score });
    this.bonusT = 0; this.bonusDur = Infinity;
    if (this.tilted) { this.after(2.0, () => this.nextBall()); return; }
    this.sfx('drain');
    const b = p.bonus;
    const lines = [
      ['RAMPS', b.ramps, 50_000],
      ['ORBITS', b.orbits, 25_000],
      ['POPS', b.pops, 2_000],
      ['LOCKS', b.locks, 250_000],
      ['JOBS', b.jobs, 1_000_000],
      ['SWITCHES', b.switches, 500],
    ];
    const total = lines.reduce((s, [, n, v]) => s + n * v, 0);
    this.bonusSpeed = 1;
    const seq = S.bonusCount(lines, p.bonusX, total);
    const dur = 1.1 * lines.length + 2.4;
    this.show(seq, dur, 9);
    this.bonusT = 0; this.bonusDur = dur; this.bonusTotal = total * p.bonusX;
    this.bonusLines = lines.length;
  }
  finishBonus() {
    const p = this.p;
    p.score += this.bonusTotal;
    p.bonus = { ramps: 0, orbits: 0, locks: 0, jobs: 0, switches: 0, pops: 0 };
    if (!p.replayAwarded && p.score >= REPLAY_SCORE) { p.replayAwarded = true; this.sfx('knocker'); }
    this.nextBall();
  }
  nextBall() {
    const p = this.p;
    this.dmd.clear();
    if (!this.tilted && p.extraBalls > 0) {
      p.extraBalls--;
      this.state = 'playing';
      this.show(S.bigText('SHOOT AGAIN', `PLAYER ${p.n}`), 1.8, 6);
      this.startBall();
      return;
    }
    // bonus X holds only with... WPC style: reset each ball
    p.bonusX = 1;
    p.ball++;
    let next = (this.pi + 1) % this.players.length;
    // find next player with balls left
    for (let k = 0; k < this.players.length; k++) {
      const cand = this.players[(this.pi + 1 + k) % this.players.length];
      if (cand.ball <= BALLS_PER_GAME) { next = (this.pi + 1 + k) % this.players.length; break; }
    }
    if (this.players.every(pl => pl.ball > BALLS_PER_GAME)) { this.gameOver(); return; }
    this.pi = next;
    this.state = 'playing';
    this.startBall();
  }

  gameOver() {
    this.state = 'match';
    this.m.setFlippersEnabled(false);
    this.lastScores = this.players.map(pl => pl.score);
    this.log('gameOver', { scores: this.lastScores });
    const matchNum = Math.floor(Math.random() * 10) * 10;
    const matched = this.players.some(pl => (pl.score % 100) === matchNum);
    this.sfx('match');
    this.show(S.match(matchNum, this.players.map(pl => pl.score % 100), matched), 3.5, 9);
    this.after(3.6, () => {
      if (matched) this.sfx('knocker');
      this.hsQueue = this.players.map(pl => pl).filter(pl => this.qualifies(pl.score)).sort((a, b) => b.score - a.score);
      this.nextHighScoreEntry();
    });
  }

  // ---------------------------------------------------------- high scores
  loadHighScores() {
    const saved = this.ui.storage.load();
    const def = [
      { name: 'VIC', score: 250_000_000 }, { name: 'ACE', score: 150_000_000 }, { name: 'MOE', score: 100_000_000 },
      { name: 'LOU', score: 75_000_000 }, { name: 'SAL', score: 50_000_000 },
    ];
    if (Array.isArray(saved) && saved.length === 5 && saved.every(e => e && typeof e.name === 'string' && Number.isFinite(e.score))) return saved;
    return def;
  }
  qualifies(score) { return score > this.highScores[4].score; }
  nextHighScoreEntry() {
    const pl = this.hsQueue && this.hsQueue.shift();
    if (!pl) { this.finishGame(); return; }
    this.state = 'hsentry';
    this.hs = { player: pl, letters: [0, 0, 0], pos: 0, charset: 'ABCDEFGHIJKLMNOPQRSTUVWXYZ 0123456789' , timeout: 45 };
    this.hs.letters = [0, 0, 0];
    const rank = this.highScores.filter(e => e.score >= pl.score).length;
    this.hs.rank = rank;
    this.sfx('highScore'); this.say('Enter your initials');
    this.ui.sound.music('highscore');
    this.dmd.clear();
    this.show(S.hsEntry(() => this.hs), 999, 10);
  }
  hsMove(d) {
    const h = this.hs; const n = h.charset.length;
    h.letters[h.pos] = (h.letters[h.pos] + d + n) % n;
    h.timeout = 45;
    this.sfx('select');
  }
  hsSelect() {
    const h = this.hs;
    h.pos++;
    this.sfx('hsLetter');
    h.timeout = 45;
    if (h.pos >= 3) this.hsCommit();
  }
  hsCommit() {
    const h = this.hs;
    const name = h.letters.map(i => h.charset[i]).join('');
    this.highScores.push({ name: name.trim() ? name : '???', score: h.player.score });
    this.highScores.sort((a, b) => b.score - a.score);
    this.highScores = this.highScores.slice(0, 5);
    this.ui.storage.save(this.highScores);
    this.log('highScore', { name, score: h.player.score });
    this.dmd.clear();
    this.show(S.bigText(h.rank === 0 ? 'GRAND CHAMPION' : 'HIGH SCORE', name + '  ' + S.fmt(h.player.score)), 2.4, 9);
    this.state = 'hswait';
    this.after(2.5, () => this.nextHighScoreEntry());
  }
  finishGame() {
    this.state = 'gameover';
    this.ui.sound.music(null);
    this.show(S.bigText('GAME OVER', ''), 3, 8);
    this.after(3.2, () => { if (this.state === 'gameover') this.enterAttract(); });
  }

  // ---------------------------------------------------------------- update
  update(dt) {
    this.t += dt;
    for (const k in this.flashers) this.flashers[k] = Math.max(0, this.flashers[k] - dt);
    if (this.timers.length) {
      const due = this.timers.filter(tm => this.t >= tm.at);
      if (due.length) {
        this.timers = this.timers.filter(tm => this.t < tm.at);
        for (const tm of due) tm.fn();
      }
    }
    switch (this.state) {
      case 'attract':
        if (this.t >= this.attractNext && !this.dmd.busy()) { this.attractCycle(); this.attractNext = this.t + 0.2; }
        break;
      case 'playing':
        if (this.skill.active) {
          if (this.ballActive) { this.skill.timer -= dt; if (this.skill.timer <= 0) this.skill.active = false; }
          else if (this.t % 0.9 < dt && !this.m.buttons.left && !this.m.buttons.right) this.skill.lane = (this.skill.lane + 1) % 3;
        }
        this.updateJob(dt);
        break;
      case 'jobselect':
        this.jobSelectTimer -= dt;
        this.updateJob(dt);
        if (this.jobSelectTimer <= 0) this.confirmJobSelect();
        break;
      case 'bonus':
        this.bonusT += dt * (this.bonusSpeed || 1);
        if (this.bonusT >= this.bonusDur) { this.state = 'bonusdone'; this.dmd.clear(); this.finishBonus(); }
        break;
      case 'hsentry':
        this.hs.timeout -= dt;
        if (this.hs.timeout <= 0) this.hsCommit();
        break;
    }
    // Safety: a held hideout ball is always eventually released while playing
    if (this.state === 'playing' && this.m.heldCount('hideout') > 0 && !this.timers.some(t => t.tag === 'hideoutRelease') && !this.jobPending) {
      this.after(1.5, () => this.releaseHideout(), 'hideoutRelease');
    }
  }

  // ----------------------------------------------------------- base display
  drawBase(d, t) {
    if (this.state === 'attract' || this.state === 'gameover') { S.logo().draw(d, t % 6, 6); return; }
    if (!this.p) return;
    if (this.job && this.state === 'playing') { S.drawJobStatus(d, t, this.job, this.p, this); return; }
    if (this.mb && this.state === 'playing') { S.drawMultiballStatus(d, t, this.mb, this.p); return; }
    if (this.wizard && this.state === 'playing') { S.drawWizardStatus(d, t, this.wizard, this.p); return; }
    S.drawScores(d, t, this.players, this.pi, this.p.ball, this.credits);
  }

  // ------------------------------------------------------------------ lamps
  // Returns lamp intensities 0..1 for every insert, computed each frame.
  lamps() {
    const L = {};
    const t = this.t;
    const blink = (rate) => (Math.floor(t * rate * 2) % 2 === 0 ? 1 : 0);
    const slow = blink(1.2), fast = blink(4), med = blink(2.2);
    if (this.state === 'attract' || this.state === 'gameover' || this.state === 'match' || this.state === 'hsentry' || this.state === 'hswait') {
      return this.attractLamps(t);
    }
    const p = this.p; if (!p) return L;
    if (this.tilted) return L;
    // shot arrows
    const shotLit = (s) => {
      if (this.wizard && this.wizard.lit[s]) return fast;
      if (this.job) {
        const j = this.job;
        if (j.lit && j.lit[s]) return fast;
        if (j.id === 'SAFE' && s === 'orbitL') return fast;
      }
      return 0;
    };
    for (const s of SHOTS) L[SHOT_LAMP[s]] = shotLit(s);
    if (!this.job && !this.wizard) {
      if (p.lockLit) L.arrVault = this.m.doorOpen ? fast : slow;
      if (p.extraBallLit || p.jobLit) L.arrHide = med;
      if (this.skill.superUntil > t) L.arrRR = fast;
    }
    if (this.mb) {
      for (const s of JP_SHOTS) L[JP_LAMP[s]] = this.mb.jp[s] ? med : 0;
      L.superJP = this.mb.superLit ? fast : 0;
      L.arrVault = this.mb.superLit ? fast : L.arrVault;
    }
    if (this.wizard) { L.superJP = this.wizard.superLit ? fast : 0; L.bigScore = fast; L.arrVault = this.wizard.superLit ? fast : L.arrVault; }
    // locks (chase upward toward the vault during multiball)
    if (this.mb || this.wizard) for (let i = 1; i <= 3; i++) L['lock' + i] = Math.floor(t * 8) % 3 === 3 - i ? 1 : 0.15;
    else for (let i = 1; i <= 3; i++) L['lock' + i] = p.locks >= i ? 1 : (p.locks + 1 === i && p.lockLit ? slow : 0);
    L.lockLit = p.lockLit ? (this.m.doorOpen ? fast : med) : 0;
    this.m.dropsDown.forEach((d, i) => { L['dropL' + (i + 1)] = d ? 0 : 1; });
    // hideout
    L.startJob = p.jobLit && !this.job && !this.wizard ? med : 0;
    L.extraBallLit = p.extraBallLit ? fast : 0;
    L.mystery = !p.jobLit && !p.extraBallLit && !this.job ? slow * 0.6 : 0;
    for (let i = 0; i < 3; i++) L['scout' + (i + 1)] = p.scout > i ? 1 : 0;
    // jobs
    JOB_SHORT.forEach((_, i) => {
      L['job' + i] = this.job && this.job.idx === i ? fast : p.jobsDone.includes(i) ? 1 : p.jobsPlayed.includes(i) ? 0.35 : 0;
    });
    if (!this.wizard) L.bigScore = p.jobsPlayed.length >= JOB_DEFS.length ? med : 0;
    // top lanes (skill shot flashes its lane)
    ['lampK', 'lampE', 'lampY'].forEach((id, i) => {
      if (this.skill.active && !this.ballActive) L[id] = i === this.skill.lane ? fast : 0;
      else L[id] = p.lanes[i] ? 1 : 0;
    });
    for (let m = 2; m <= 6; m++) L['bx' + m] = p.bonusX >= m ? 1 : 0;
    L.lampKickback = p.kickbackLit ? 1 : 0;
    L.lampInL = L.lampInR = this.t - (this.combo.inlaneAt || -9) < 3 ? med : 0;
    L.lampSpinner = p.spinnerLitUntil > t ? fast : 0;
    L.lampOutR = 0;
    if (p.extraBalls > 0) L.shootAgain = 1;
    else if (this.ballActive && this.ballSaveUntil > t) L.shootAgain = this.ballSaveUntil - t < 3 ? fast : med;
    else if (!this.ballActive && this.ballSaveArmed > 0) L.shootAgain = slow;
    else L.shootAgain = 0;
    L.lampCombo = t - this.combo.last < 4 && this.combo.lastShot ? fast : 0;
    return L;
  }
  attractLamps(t) {
    const L = {};
    const ids = ['arrLO', 'arrLR', 'arrVault', 'arrRR', 'arrHide', 'arrRO', 'jpLO', 'jpLR', 'jpRR', 'jpRO', 'lock1', 'lock2', 'lock3', 'superJP',
      'dropL1', 'dropL2', 'dropL3', 'lockLit', 'startJob', 'extraBallLit', 'mystery', 'scout1', 'scout2', 'scout3',
      'job0', 'job1', 'job2', 'job3', 'job4', 'job5', 'bigScore', 'lampK', 'lampE', 'lampY', 'bx2', 'bx3', 'bx4', 'bx5', 'bx6',
      'lampInL', 'lampInR', 'lampKickback', 'lampOutR', 'lampSpinner', 'shootAgain', 'lampCombo'];
    const phase = Math.floor(t / 8) % 3;
    ids.forEach((id, i) => {
      let v;
      if (phase === 0) v = Math.max(0, Math.sin(t * 4 - i * 0.35));
      else if (phase === 1) v = (Math.floor(t * 6) + i) % 6 === 0 ? 1 : 0.1;
      else v = 0.5 + 0.5 * Math.sin(t * 2 + (i % 7));
      L[id] = v;
    });
    return L;
  }
  flasherLevels() {
    const out = {};
    for (const k in this.flashers) out[k] = Math.min(1, this.flashers[k] * 5);
    return out;
  }
}
