// NOVA STRIKE — game rules, modes and scoring.
// DOM-free: talks to the outside world through `io` =
//   { dmd: DMD-like, sfx(name), music(state), highs: HighScoreAPI, log? }
// so the same rules run headless in the Node test rig.

import { serveBall } from './table.js';
import { addBall } from './physics.js';

const ST = {
  ATTRACT: 'attract',
  SERVE: 'serve',          // ball on the plunger, waiting for launch
  PLAY: 'play',
  BONUS: 'bonus',          // end-of-ball bonus count
  OVER: 'over',
  HS_ENTRY: 'hsEntry'
};

const MISSIONS = [
  { id: 'asteroid', name: 'ASTEROID STORM', secs: 40, need: 20, award: 500000,
    desc: 'POP BUMPERS 10K' },
  { id: 'rampage', name: 'RAMPAGE', secs: 40, need: 6, award: 750000,
    desc: 'RAMPS 100K' },
  { id: 'gunnery', name: 'GUNNERY DRILL', secs: 40, need: 8, award: 500000,
    desc: 'TARGETS 50K' }
];

export class Game {
  constructor(world, table, io) {
    this.world = world;
    this.table = table;
    this.io = io;
    this.state = ST.ATTRACT;
    this.credits = 0;      // free play; credits only from match
    this.resetMachine();
  }

  resetMachine() {
    this.score = 0;
    this.ball = 0;
    this.ballsPerGame = 3;
    this.state = ST.ATTRACT;
    this.tilted = false;
    this.io.music('attract');
  }

  // ------------------------------------------------------------------ flow
  startGame() {
    this.score = 0;
    this.ball = 1;
    this.extraBalls = 0;
    this.tilted = false;
    this.tiltMeter = 0;
    this.tiltWarnings = 0;
    this.state = ST.SERVE;
    this.io.music('play');
    this.io.dmd.message(['NOVA STRIKE', 'BALL 1'], 2);
    this.io.sfx('start');
    this.newBallState();
    this.serve();
  }

  newBallState() {
    // per-ball state
    this.bonusUnits = 0;
    this.multiplier = 1;
    this.lanesLit = [true, false, false];   // lit lane rotates w/ flippers
    this.lanesDone = [false, false, false];
    this.dropsDown = [false, false, false, false];
    this.banksDone = 0;
    this.locks = this.locks ?? 0;           // locks persist across balls
    this.lockLit = this.locks === 0;        // first lock lit; relight via standups
    this.standL = [false, false];
    this.kickbackLit = this.ball === 1;     // lit on ball 1 only, relight via inlane
    this.extraBallLit = false;
    this.skillShot = true;
    this.skillTimer = 0;
    this.ballSave = 10;
    this.multiball = false;
    this.jackpot = 250000;
    this.jackpotsLit = [true, true];
    this.combo = 0;
    this.comboTimer = 0;
    this.lastRamp = null;
    this.mission = null;                    // active mission instance
    this.missionsDone = this.missionsDone || [];
    this.wizard = false;
    this.wizardReady = false;
    this.saucerTimer = 0;
    this.saucerAction = null;
    this.lockedBalls = this.lockedBalls || [];
    this.clearTiltForNextBall();
  }

  serve() {
    this.state = ST.SERVE;
    this.ballSave = Math.max(this.ballSave, 8);
    serveBall(this.world, this.table);
    this.io.dmd.score(this.score, this.ball);
  }

  serveNewFromTrough() {
    // virtual trough: a fresh ball appears on the plunger (no state change —
    // other balls may still be in play during multiball)
    serveBall(this.world, this.table);
  }

  launch(power) {
    // power 0..1 from the plunger; works whenever a ball rests in the lane
    const b = this.world.balls.find(b => !b.locked && !b.onRamp && b.x > 660 && b.y > 1380);
    if (!b) return;
    if (this.state !== ST.SERVE && this.state !== ST.PLAY) return;
    b.vy = -(950 + power * 1500);
    b.vx = 0;
    b.ghost = 0;
    if (this.state === ST.SERVE) {
      this.state = ST.PLAY;
      this.skillTimer = 4;
    }
    this.io.sfx('launch');
  }

  // -------------------------------------------------------------- update
  update(dt) {
    // consume physics events
    for (const ev of this.world.events) this.onEvent(ev);
    this.world.events.length = 0;

    if (this.state === ST.SERVE || this.state === ST.PLAY) {
      if (this.ballSave > 0) this.ballSave -= dt;
      if (this.tiltMeter > 0) this.tiltMeter = Math.max(0, this.tiltMeter - dt * 0.5);
    }
    if (this.state === ST.PLAY) {
      if (this.skillTimer > 0) {
        this.skillTimer -= dt;
        if (this.skillTimer <= 0) this.skillShot = false;
      }
      if (this.comboTimer > 0) {
        this.comboTimer -= dt;
        if (this.comboTimer <= 0) this.combo = 0;
      }
      if (this.mission) {
        this.mission.secs -= dt;
        if (this.mission.secs <= 0) this.endMission(false);
      }
      if (this.wizard) {
        this.wizardSecs -= dt;
        if (this.wizardSecs <= 0) {
          this.wizard = false;
          this.io.dmd.message(['NOVA STRIKE', 'COMPLETE!'], 3);
          this.io.music('play');
        }
      }
    }
    // saucer eject timer
    if (this.saucerTimer > 0) {
      this.saucerTimer -= dt;
      if (this.saucerTimer <= 0) this.ejectSaucer();
    }
    this.io.dmd.tick(dt);
  }

  // -------------------------------------------------------------- events
  onEvent(ev) {
    if (ev.type === 'drain') return this.onDrain(ev.ball);
    if (ev.type === 'rampExit') return this.onRamp(ev.tag);
    if (ev.type === 'saucer') return this.onSaucer(ev.ball);
    if (ev.type === 'flipperContact') return; // cosmetic (audio hook reads it)
    if (ev.type !== 'switch') return;
    if (this.state !== ST.PLAY && this.state !== ST.SERVE) return;
    if (this.tilted) return;

    const id = ev.id;
    this.bonusUnits = Math.min(this.bonusUnits + 1, 99);

    switch (true) {
      case id.startsWith('pop'): {
        const v = this.mission?.id === 'asteroid' ? 10000 : 1000;
        this.add(v * this.wizardX());
        this.io.sfx('pop');
        if (this.mission?.id === 'asteroid') this.missionHit();
        break;
      }
      case id.startsWith('sling'):
        this.add(500 * this.wizardX());
        this.io.sfx('sling');
        break;
      case id.startsWith('topLane'): {
        const i = +id.slice(-1) - 1;
        this.onTopLane(i);
        break;
      }
      case id === 'orbitExitSw':
        this.add(5000 * this.wizardX());
        break;
      case id === 'inlaneL':
        this.add(2500 * this.wizardX());
        if (!this.kickbackLit) {
          this.kickbackLit = true;
          this.io.dmd.message(['KICKBACK', 'LIT'], 1.5);
          this.io.sfx('light');
        }
        break;
      case id === 'inlaneR':
        this.add(2500 * this.wizardX());
        break;
      case id === 'outlaneL':
        this.add(10000 * this.wizardX());
        break;
      case id === 'outlaneR':
        this.add(10000 * this.wizardX());
        break;
      case id === 'kickback':
        // sensor in the left outlane throat
        if (this.kickbackLit && !this.tilted) {
          this.kickbackLit = false;
          const b = ev.ball;
          b.vx = 620; b.vy = -1250;
          this.add(10000);
          this.io.dmd.message(['KICKBACK!', ''], 1.2);
          this.io.sfx('kickback');
        }
        break;
      case id.startsWith('drop'): {
        const i = ev.index;
        this.add(5000 * this.wizardX());
        this.io.sfx('target');
        this.dropsDown[i] = true;
        if (this.mission?.id === 'gunnery') this.missionHit();
        if (this.dropsDown.every(Boolean)) this.bankComplete();
        break;
      }
      case id.startsWith('stand'): {
        this.add(2500 * this.wizardX());
        this.io.sfx('target');
        if (this.mission?.id === 'gunnery') this.missionHit();
        if (id === 'standL1') this.standL[0] = true;
        if (id === 'standL2') this.standL[1] = true;
        if (this.standL.every(Boolean) && !this.lockLit && this.locks < 2) {
          this.lockLit = true;
          this.standL = [false, false];
          this.io.dmd.message(['LOCK', 'IS LIT'], 2);
          this.io.sfx('light');
        }
        break;
      }
    }
  }

  onTopLane(i) {
    this.add(3000 * this.wizardX());
    this.io.sfx('lane');
    if (this.skillShot && this.lanesLit[i]) {
      this.skillShot = false;
      this.skillTimer = 0;
      this.add(100000);
      this.io.dmd.message(['SKILL SHOT', '100,000'], 2);
      this.io.sfx('skill');
    }
    if (!this.lanesDone[i]) {
      this.lanesDone[i] = true;
      if (this.lanesDone.every(Boolean)) {
        this.lanesDone = [false, false, false];
        this.advanceMultiplier();
      }
    }
  }

  advanceMultiplier() {
    if (this.multiplier < 10) {
      this.multiplier++;
      this.io.dmd.message(['BONUS X', this.multiplier + 'X'], 1.5);
      this.io.sfx('light');
    }
  }

  bankComplete() {
    this.banksDone++;
    this.dropsDown = [false, false, false, false];
    for (const d of this.table.drops) d.disabled = false;
    this.add(50000 * this.wizardX());
    this.advanceMultiplier();
    this.io.dmd.message(['NOVA BANK', 'COMPLETE'], 1.5);
    if (this.banksDone % 2 === 0 && !this.extraBallLit && this.extraBalls < 2) {
      this.extraBallLit = true;
      this.io.dmd.message(['EXTRA BALL', 'LIT AT DOCK'], 2.5);
      this.io.sfx('light');
    }
  }

  // --------------------------------------------------------------- ramps
  onRamp(tag) {
    if (this.tilted) return;
    this.io.sfx('ramp');
    if (this.multiball) {
      const idx = tag === 'left' ? 0 : 1;
      if (this.jackpotsLit[idx]) {
        this.add(this.jackpot);
        this.io.dmd.message(['JACKPOT', fmt(this.jackpot)], 2);
        this.io.sfx('jackpot');
        this.jackpotsLit[idx] = false;
        if (!this.jackpotsLit.some(Boolean)) {
          this.jackpotsLit = [true, true];
          this.jackpot += 25000;
          this.io.dmd.message(['JACKPOTS', 'RELIT'], 1.5);
        }
      } else {
        this.add(25000);
      }
      return;
    }
    // combo logic: alternating ramps within 4 s builds the combo
    if (this.lastRamp && this.lastRamp !== tag && this.comboTimer > 0) {
      this.combo = Math.min(this.combo + 1, 5);
    } else {
      this.combo = 1;
    }
    this.lastRamp = tag;
    this.comboTimer = 4;
    const base = 25000;
    const v = base * this.combo * this.wizardX();
    this.add(v);
    if (this.combo > 1) {
      this.io.dmd.message(['COMBO X' + this.combo, fmt(v)], 1.5);
      this.io.sfx('combo');
    }
    if (this.mission?.id === 'rampage') this.missionHit();
  }

  // -------------------------------------------------------------- saucer
  onSaucer(ball) {
    if (this.tilted || this.state !== ST.PLAY) return;
    // capture the ball
    ball.locked = true;
    ball.x = this.table.saucer.x;
    ball.y = this.table.saucer.y;
    ball.vx = ball.vy = 0;
    this.captured = ball;
    this.io.sfx('saucer');

    if (this.extraBallLit) {
      this.extraBallLit = false;
      this.extraBalls++;
      this.saucerAction = 'eject';
      this.io.dmd.message(['EXTRA', 'BALL!'], 2.5);
      this.io.sfx('extraball');
    } else if (this.wizardReady) {
      this.saucerAction = 'wizard';
    } else if (this.lockLit) {
      this.saucerAction = 'lock';
    } else if (!this.mission && !this.multiball && !this.wizard) {
      this.saucerAction = 'mission';
    } else {
      this.add(10000);
      this.saucerAction = 'eject';
    }
    this.saucerTimer = 1.4;
  }

  ejectSaucer() {
    const b = this.captured;
    const action = this.saucerAction;
    this.captured = null;
    this.saucerAction = null;

    if (action === 'lock') {
      // keep this ball parked; serve another
      this.locks++;
      this.lockedBalls.push(b);
      if (this.locks >= 2) {
        this.lockLit = false;
        this.startMultiball();
      } else {
        this.lockLit = false;
        this.io.dmd.message(['BALL 1', 'LOCKED'], 2);
        this.io.sfx('lock');
        this.serveNewFromTrough();
      }
      return;
    }
    if (action === 'wizard') {
      this.wizardReady = false;
      this.wizard = true;
      this.wizardSecs = 45;
      this.io.dmd.message(['NOVA STRIKE!', 'ALL SCORES 2X'], 3);
      this.io.sfx('wizard');
      this.io.music('wizard');
      this.releaseBall(b);
      return;
    }
    if (action === 'mission') this.startMission();
    this.releaseBall(b);
  }

  releaseBall(b) {
    b.locked = false;
    b.x = this.table.saucer.x;
    b.y = this.table.saucer.y + 6;
    b.vx = -140;
    b.vy = 620;
    b.ghost = 0.15;
    this.io.sfx('eject');
  }

  // ------------------------------------------------------------ multiball
  startMultiball() {
    this.multiball = true;
    this.ballSave = 15;
    this.jackpot = 250000;
    this.jackpotsLit = [true, true];
    this.io.dmd.message(['ARMADA', 'MULTIBALL!'], 3);
    this.io.sfx('multiball');
    this.io.music('multiball');
    // release locked balls from the dock, and send a third to the plunger
    for (const b of this.lockedBalls) this.releaseBall(b);
    this.lockedBalls = [];
    this.locks = 0;
    this.serveNewFromTrough();
  }

  // ------------------------------------------------------------- missions
  startMission() {
    const left = MISSIONS.filter(m => !this.missionsDone.includes(m.id));
    if (!left.length) return;
    const def = left[Math.floor(Math.random() * left.length)];
    this.mission = { ...def, hits: 0 };
    this.io.dmd.message([def.name, def.desc], 3);
    this.io.sfx('mission');
  }

  missionHit() {
    const m = this.mission;
    if (!m) return;
    m.hits++;
    if (m.hits >= m.need) this.endMission(true);
  }

  endMission(won) {
    const m = this.mission;
    this.mission = null;
    if (won) {
      this.add(m.award);
      this.missionsDone.push(m.id);
      this.io.dmd.message([m.name, 'COMPLETE ' + fmt(m.award)], 2.5);
      this.io.sfx('complete');
      if (this.missionsDone.length >= MISSIONS.length && !this.wizard && !this.wizardReady) {
        this.wizardReady = true;
        this.io.dmd.message(['NOVA STRIKE', 'LIT AT DOCK'], 3);
      }
    } else {
      this.io.dmd.message([m.name, 'TIME OUT'], 1.5);
    }
  }

  // --------------------------------------------------------------- drain
  onDrain(ball) {
    if (this.state !== ST.PLAY && this.state !== ST.SERVE) return;
    const live = this.world.balls.filter(b => b.alive && !b.locked);

    if (this.ballSave > 0 && !this.tilted) {
      this.io.dmd.message(['BALL SAVED', 'SHOOT AGAIN'], 1.5);
      this.io.sfx('saved');
      this.serveNewFromTrough();
      return;
    }

    if (this.multiball) {
      if (live.length >= 2) return; // still 2+ balls in play
      if (live.length === 1) {
        this.multiball = false;
        this.io.dmd.message(['MULTIBALL', 'OVER'], 1.5);
        this.io.music('play');
        return;
      }
    }
    if (live.length > 0) return; // safety

    this.ballOver();
  }

  ballOver() {
    if (this.tilted) {
      this.io.dmd.message(['TILT', 'NO BONUS'], 2);
    } else {
      const bonus = this.bonusUnits * 1000 * this.multiplier;
      if (bonus > 0) {
        this.add(bonus);
        this.io.dmd.message(['BONUS ' + this.multiplier + 'X', fmt(bonus)], 2);
      }
    }
    this.io.sfx('drain');

    if (this.extraBalls > 0) {
      this.extraBalls--;
      this.io.dmd.message(['SHOOT', 'AGAIN'], 2);
      this.newBallKeepProgress();
      this.serve();
      return;
    }

    if (this.ball < this.ballsPerGame) {
      this.ball++;
      this.io.dmd.message(['BALL ' + this.ball, fmt(this.score)], 2);
      this.newBallState();
      this.serve();
    } else {
      this.gameOver();
    }
  }

  newBallKeepProgress() {
    // extra ball: keep bank progress etc., reset only save/skill timers
    this.skillShot = true;
    this.ballSave = 10;
    this.kickbackLit = true;
  }

  gameOver() {
    this.state = ST.OVER;
    this.io.music('attract');
    // match feature
    const match = Math.floor(Math.random() * 100);
    const last2 = Math.floor(this.score / 10) % 100;
    if (match === last2) {
      this.credits++;
      this.io.dmd.message(['MATCH ' + String(match).padStart(2, '0'), 'FREE GAME!'], 4);
      this.io.sfx('match');
    } else {
      this.io.dmd.message(['GAME OVER', 'MATCH ' + String(match).padStart(2, '0') + ' ...'], 4);
    }
    // high score?
    if (this.io.highs.qualify(this.score)) {
      this.state = ST.HS_ENTRY;
      this.io.highs.beginEntry(this.score, () => {
        this.state = ST.ATTRACT;
      });
      return;
    }
    setTimeout(() => { if (this.state === ST.OVER) this.state = ST.ATTRACT; }, 5000);
  }

  // --------------------------------------------------------------- nudge
  nudge(dir) {
    if (this.state !== ST.PLAY && this.state !== ST.SERVE) return;
    if (this.tilted) return;
    const F = 190;
    for (const b of this.world.balls) {
      if (b.locked || b.onRamp) continue;
      if (dir === 'left') b.vx -= F;
      else if (dir === 'right') b.vx += F;
      else if (dir === 'up') b.vy -= F * 0.8;
    }
    this.tiltMeter += 1;
    this.io.sfx('nudge');
    if (this.tiltMeter >= 3) {
      this.tilted = true;
      this.world.flippers.forEach(f => { f.active = false; f.disabled = true; });
      this.io.dmd.message(['TILT!', ''], 2.5);
      this.io.sfx('tilt');
    } else if (this.tiltMeter >= 1.5) {
      this.io.dmd.message(['DANGER', ''], 0.8);
      this.io.sfx('danger');
    }
  }

  clearTiltForNextBall() {
    this.tilted = false;
    this.tiltMeter = 0;
    this.world.flippers.forEach(f => { f.disabled = false; });
  }

  // -------------------------------------------------------------- helpers
  wizardX() { return this.wizard ? 2 : 1; }

  add(n) {
    this.score += Math.round(n);
    this.io.dmd.score(this.score, this.ball);
    if (!this._scoreEB && this.score >= 2000000 && this.extraBalls < 2) {
      this._scoreEB = true;
      this.extraBalls++;
      this.io.dmd.message(['EXTRA', 'BALL!'], 2.5);
      this.io.sfx('extraball');
    }
  }

  flipper(side, down) {
    if (this.tilted) return;
    const f = side < 0 ? this.table.flipL : this.table.flipR;
    if (!f.disabled) f.active = down;
    if (down) {
      // lane change: rotate the lit top lane
      const lit = this.lanesLit.findIndex(Boolean);
      this.lanesLit = [false, false, false];
      this.lanesLit[(lit + 1) % 3] = true;
    }
  }

  get inPlay() { return this.state === ST.PLAY || this.state === ST.SERVE; }
}

export function fmt(n) {
  return n.toLocaleString('en-US');
}
