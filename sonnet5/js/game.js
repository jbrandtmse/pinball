// Game state machine, scoring rules, mode logic ("KRAKEN'S GOLD" ruleset), and DMD content.
// table.js/entities.js know nothing about scoring -- every named callback below is where
// that knowledge lives.

const STATE = {
  ATTRACT: 'ATTRACT',
  IN_PLAY: 'IN_PLAY',
  BALL_OVER: 'BALL_OVER',
  GAME_OVER: 'GAME_OVER',
  HIGH_SCORE_ENTRY: 'HIGH_SCORE_ENTRY',
};

const BALLS_PER_GAME = 3;
const BALL_SAVE_DURATION = 10;
const TILT_WARNING_LIMIT = 2;
const TILT_NUDGE_RESET = 12;
const NUDGE_IMPULSE = 260;
const INITIALS_CHARS = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789 ';

const SCORE = {
  BUMPER: 1000,
  SLING: 500,
  GOLD_TARGET: 5000,
  GOLD_COMPLETE_BONUS: 30000,
  KEY_TARGET: 7500,
  KEY_BANK_COMPLETE: 50000,
  SPINNER_TICK: 250,
  TOP_LANE: 2000,
  RAMP_BASE: 10000,
  RAMP_COMBO_STEP: 5000,
  MAW_SCOOP: 15000,
  MAW_LOCK: 25000,
  JACKPOT_BASE: 75000,
  JACKPOT_STEP: 25000,
  SUPER_JACKPOT: 150000,
  BONUS_PER_COUNT: 1000,
};

function fmt(n) { return Math.max(0, Math.floor(n)).toLocaleString('en-US'); }

class Player {
  constructor(index) {
    this.index = index;
    this.score = 0;
    this.bonusCount = 0;
    this.bonusMultiplier = 1;
    this.goldLetters = new Set();
    this.extraBallsQueued = 0;
    this.gotExtraBallThisBall = false;
  }
}

class Game {
  constructor(playfieldCanvas, dmdCanvas) {
    this.canvas = playfieldCanvas;
    this.ctx = playfieldCanvas.getContext('2d');
    this.dmdCanvas = dmdCanvas;
    this.dmdCtx = dmdCanvas.getContext('2d');
    this.dmd = new DMD(128, 32);
    this.particles = new ParticleSystem();

    this.state = STATE.ATTRACT;
    this.players = [new Player(0)];
    this.activePlayerIndex = 0;
    this.currentBallNumber = 1;
    this.numPlayersSelected = 1;

    this.keyBankLit = false;
    this.locksAchieved = 0;
    this.multiball = this.freshMultiballState();
    this.skillShot = { active: false, lane: 0, value: 0 };
    this.comboState = { lastShot: null, lastTime: 0, comboCount: 0 };

    this.ballWaitingAtPlunger = false;
    this.ballAtPlunger = null;
    this.plungerCharge = 0;

    this.tiltWarnings = 0;
    this.tiltActive = false;
    this.tiltNudgeResetTimer = 0;
    this._nudgeCooldown = 0;

    this.ballSaveTimer = 0;
    this.ballSaveActive = false;

    this.messageQueue = [];
    this.currentMessage = null;

    this.shakeMag = 0;
    this.flashState = { alpha: 0, color: '255,255,255' };
    this.attractTimer = 0;
    this._time = 0;
    this.paused = false;
    this.muted = false;

    this.initialsEntry = { letters: ['A', 'A', 'A'], pos: 0 };

    this.buildTableAndWire();
    this.initDOM();
    this.refreshAttractHighScores();

    document.addEventListener('visibilitychange', () => {
      if (document.hidden && this.state === STATE.IN_PLAY && !this.paused) this.togglePause();
    });
  }

  freshMultiballState() {
    return { active: false, shotsLit: { left: false, right: false, maw: false }, collected: new Set(), jackpotBase: SCORE.JACKPOT_BASE, round: 0 };
  }

  buildTableAndWire() {
    const callbacks = {
      onBumperHit: (b) => this.onBumperHit(b),
      onSlingHit: (side) => this.onSlingHit(side),
      onGoldTargetHit: (i) => this.onGoldTargetHit(i),
      onKeyTargetHit: (i) => this.onKeyTargetHit(i),
      onKeyBankComplete: () => this.onKeyBankComplete(),
      onMawCapture: (ball) => this.handleMawCapture(ball),
      onRampEnter: (name) => this.onRampEnter(name),
      onRampExit: (name) => this.onRampExit(name),
      onSpinnerSpin: () => this.onSpinnerSpin(),
      onTopLanePass: (i) => this.onTopLanePass(i),
      onKickbackFire: () => this.onKickbackFire(),
    };
    this.tableInfo = buildTable(callbacks);
    this.world = this.tableInfo.world;
    this.world.onBallLost = (ball) => this.onBallLost(ball);
  }

  currentPlayer() { return this.players[this.activePlayerIndex] || this.players[0]; }

  // =================================================================== INPUT
  processInput(dt) {
    const leftDown = Input.isDown('leftFlipper') && !this.tiltActive && !this.paused;
    const rightDown = Input.isDown('rightFlipper') && !this.tiltActive && !this.paused;
    this.tableInfo.leftFlipper.setPressed(leftDown);
    this.tableInfo.rightFlipper.setPressed(rightDown);
    if ((leftDown && !this._prevLeftDown) || (rightDown && !this._prevRightDown)) SFX.flipper();
    this._prevLeftDown = leftDown;
    this._prevRightDown = rightDown;

    if (this.state === STATE.IN_PLAY && !this.tiltActive) {
      if (Input.pressed('nudgeLeft')) this.nudge(new Vec2(-1, -0.3));
      if (Input.pressed('nudgeRight')) this.nudge(new Vec2(1, -0.3));
      if (Input.pressed('nudgeUp')) this.nudge(new Vec2(0, -1));
      this.handlePlungerInput(dt);
    }

    if (this.state === STATE.ATTRACT) {
      if (Input.pressed('p1')) this.numPlayersSelected = 1;
      if (Input.pressed('p2')) this.numPlayersSelected = 2;
      if (Input.pressed('p3')) this.numPlayersSelected = 3;
      if (Input.pressed('p4')) this.numPlayersSelected = 4;
      if (Input.pressed('plunger')) this.startGame(this.numPlayersSelected);
    } else if (this.state === STATE.HIGH_SCORE_ENTRY) {
      this.handleInitialsInput();
    } else if (this.state === STATE.GAME_OVER) {
      if (Input.pressed('plunger')) this.toAttract();
    }
  }

  handlePlungerInput(dt) {
    if (!this.ballWaitingAtPlunger) return;
    // A quick tap can deliver its keydown AND keyup within the same animation frame,
    // so charge can't be gated purely on a per-frame isDown() read (it would still be
    // sitting at 0 -- the "was down at all" state has to survive across the frame
    // boundary via this flag, and release must always fire the launch with at least a
    // floor amount of power so a fast tap still fires the plunger instead of doing nothing).
    if (Input.pressed('plunger')) this._plungerCharging = true;
    if (this._plungerCharging && Input.isDown('plunger')) {
      this.plungerCharge = Math.min(1, this.plungerCharge + dt / 1.0);
    }
    if (Input.released('plunger') && this._plungerCharging) {
      this._plungerCharging = false;
      this.launchBall(Math.max(0.15, this.plungerCharge));
    }
  }

  handleInitialsInput() {
    if (Input.pressed('leftFlipper')) this.cycleInitial(-1);
    if (Input.pressed('rightFlipper')) this.cycleInitial(1);
    if (Input.pressed('plunger')) this.confirmInitial();
  }

  cycleInitial(dir) {
    const letters = this.initialsEntry.letters;
    const i = this.initialsEntry.pos;
    let idx = INITIALS_CHARS.indexOf(letters[i]);
    idx = (idx + dir + INITIALS_CHARS.length) % INITIALS_CHARS.length;
    letters[i] = INITIALS_CHARS[idx];
    SFX.uiMove();
  }

  confirmInitial() {
    SFX.uiSelect();
    this.initialsEntry.pos++;
    if (this.initialsEntry.pos >= 3) {
      const initials = this.initialsEntry.letters.join('').trim() || 'AAA';
      HighScores.addScore(initials, this._currentHighScoreEntry.score);
      this.refreshAttractHighScores();
      this.processNextHighScoreCheck();
    }
  }

  nudge(dir) {
    if (this._nudgeCooldown > 0) return;
    this._nudgeCooldown = 0.22;
    for (const ball of this.world.balls) {
      if (!ball.alive || ball.captured) continue;
      ball.vel.addInPlace(dir.normalized().mul(NUDGE_IMPULSE));
    }
    this.shakeMag = 7;
    SFX.noiseBurst(0.06, { filterFreq: 280, filterType: 'lowpass', vol: 0.35 });
    this.registerTiltWarning();
  }

  registerTiltWarning() {
    this.tiltNudgeResetTimer = TILT_NUDGE_RESET;
    this.tiltWarnings++;
    if (this.tiltWarnings > TILT_WARNING_LIMIT) this.triggerTilt();
    else SFX.tiltWarning();
  }

  triggerTilt() {
    if (this.tiltActive) return;
    this.tiltActive = true;
    this.tableInfo.leftFlipper.setPressed(false);
    this.tableInfo.rightFlipper.setPressed(false);
    SFX.tilt();
    this.queueMessage('TILT!', '', 2.2);
    this.shakeMag = 16;
  }

  togglePause() {
    this.paused = !this.paused;
    const el = document.getElementById('pause-overlay');
    if (el) el.classList.toggle('hidden', !this.paused);
    SFX.uiMove();
  }

  toggleMute() {
    this.muted = !this.muted;
    SFX.setMuted(this.muted);
    this.toast(this.muted ? 'AUDIO MUTED' : 'AUDIO ON');
  }

  // =================================================================== BALL / TURN FLOW
  startGame(n) {
    this.players = Array.from({ length: clamp(n, 1, 4) }, (_, i) => new Player(i));
    this.activePlayerIndex = 0;
    this.currentBallNumber = 1;
    this.resetTableForNewGame();
    document.getElementById('start-overlay').classList.add('hidden');
    SFX.gameStart();
    this.startBall();
  }

  resetTableForNewGame() {
    this.world.balls = [];
    this.tableInfo.dropBankKEY.reset();
    this.tableInfo.targetsGOLD.forEach((t) => { t.lit = false; });
    this.tableInfo.scoopMaw.locked = [];
    this.tableInfo.scoopMaw.lit = false;
    this.keyBankLit = false;
    this.locksAchieved = 0;
    this.multiball = this.freshMultiballState();
    this.comboState = { lastShot: null, lastTime: 0, comboCount: 0 };
  }

  startBall() {
    const p = this.currentPlayer();
    p.bonusCount = 0;
    p.bonusMultiplier = 1;
    p.gotExtraBallThisBall = false;
    this.tiltActive = false;
    this.tiltWarnings = 0;
    this.tiltNudgeResetTimer = 0;
    this.tableInfo.kickback.active = true;
    this.state = STATE.IN_PLAY;
    this.queueMessage(`PLAYER ${this.activePlayerIndex + 1}`, `BALL ${this.currentBallNumber}`, 1.8);
    this.spawnBallAtPlunger();
    this.setupSkillShot();
    this.ballSaveTimer = BALL_SAVE_DURATION;
    this.ballSaveActive = true;
  }

  spawnBallAtPlunger() {
    const pos = this.tableInfo.plungerRest;
    const ball = new Ball(pos.x, pos.y);
    this.world.addBall(ball);
    this.ballAtPlunger = ball;
    this.ballWaitingAtPlunger = true;
    this.plungerCharge = 0;
    this._plungerCharging = false;
    return ball;
  }

  setupSkillShot() {
    const lane = Math.floor(Math.random() * 3);
    const values = [20000, 35000, 20000];
    this.skillShot = { active: true, lane, value: values[lane] };
  }

  launchBall(power) {
    const ball = this.ballAtPlunger;
    if (!ball) return;
    const speed = lerp(1050, 2650, clamp(power, 0, 1));
    ball.vel.set(randRange(-30, 30), -speed);
    SFX.launch(power);
    this.ballWaitingAtPlunger = false;
    this.ballAtPlunger = null;
    this.plungerCharge = 0;
  }

  onBallLost(ball) {
    if (this.ballSaveActive && !this.tiltActive && this.state === STATE.IN_PLAY) {
      this.saveBall(ball);
      return;
    }
    this.world.removeBall(ball);
    SFX.drain();

    if (this.multiball.active) {
      if (this.world.balls.length < 1) {
        this.multiball.active = false;
        this.endBallSequence();
        return;
      }
      if (this.world.balls.length === 1) this.endMultiball();
      return;
    }

    const p = this.currentPlayer();
    if (p.extraBallsQueued > 0 && !this.tiltActive) {
      p.extraBallsQueued--;
      this.queueMessage('EXTRA BALL!', 'SHOOT AGAIN', 1.6);
      SFX.extraBall();
      this.spawnBallAtPlunger();
      this.ballSaveTimer = BALL_SAVE_DURATION;
      this.ballSaveActive = true;
      return;
    }
    this.endBallSequence();
  }

  saveBall(ball) {
    ball.pos = this.tableInfo.plungerRest.clone();
    ball.vel.set(0, 0);
    ball.captured = null;
    ball.trail.length = 0;
    this.ballAtPlunger = null;
    this.ballWaitingAtPlunger = false;
    this.queueMessage('SHOOT AGAIN!', 'BALL SAVED', 1.5);
    SFX.ballSave();
    this._pendingAutoLaunch = { ball, timer: 0.4 };
  }

  endMultiball() {
    this.multiball.active = false;
    this.queueMessage('MULTIBALL OVER', '', 1.3);
  }

  endBallSequence() {
    this.state = STATE.BALL_OVER;
    this.ballWaitingAtPlunger = false;
    this.ballAtPlunger = null;
    const p = this.currentPlayer();
    const total = this.tiltActive ? 0 : p.bonusCount * SCORE.BONUS_PER_COUNT * p.bonusMultiplier;
    this._bonusAnim = { total, shown: 0, timer: 0, done: total <= 0, doneAt: 0 };
    SFX.ballOver();
  }

  advanceTurn() {
    const p = this.currentPlayer();
    p.bonusCount = 0;
    p.bonusMultiplier = 1;
    this.tiltActive = false;
    this.tiltWarnings = 0;
    this.ballSaveActive = false;

    this.activePlayerIndex++;
    if (this.activePlayerIndex >= this.players.length) {
      this.activePlayerIndex = 0;
      this.currentBallNumber++;
    }
    if (this.currentBallNumber > BALLS_PER_GAME) this.endGame();
    else this.startBall();
  }

  // =================================================================== SCORING EVENTS
  addScore(points) {
    if (this.tiltActive) return;
    this.currentPlayer().score += points;
  }

  addBonusCount(n = 1) {
    const p = this.currentPlayer();
    p.bonusCount = Math.min(30, p.bonusCount + n);
  }

  onBumperHit(b) {
    SFX.bumper();
    this.addScore(SCORE.BUMPER);
    this.particles.spark(b.pos.x, b.pos.y, { color: '#ffb020', count: 8, maxSpeed: 480 });
  }

  onSlingHit(side) {
    SFX.sling();
    this.addScore(SCORE.SLING);
    const sling = side === 'left' ? this.tableInfo.leftSling : this.tableInfo.rightSling;
    const p = sling.points[1];
    this.particles.spark(p.x, p.y, { color: '#e0263b', count: 10, maxSpeed: 520 });
  }

  onGoldTargetHit(index) {
    SFX.goldTarget();
    const p = this.currentPlayer();
    const t = this.tableInfo.targetsGOLD[index];
    t.lit = true;
    p.goldLetters.add(index);
    this.addBonusCount();
    this.addScore(SCORE.GOLD_TARGET);
    const mid = Vec2.lerp(t.a, t.b, 0.5);
    this.particles.spark(mid.x, mid.y, { color: '#ffd23d', count: 8 });

    if (p.goldLetters.size >= 4) {
      p.goldLetters.clear();
      this.tableInfo.targetsGOLD.forEach((tg) => { tg.lit = false; });
      p.bonusMultiplier = Math.min(5, p.bonusMultiplier + 1);
      this.addScore(SCORE.GOLD_COMPLETE_BONUS);
      SFX.bankComplete();
      this.queueMessage('GOLD RUSH!', `${p.bonusMultiplier}X BONUS`, 1.5);
      if (!p.gotExtraBallThisBall) {
        p.gotExtraBallThisBall = true;
        p.extraBallsQueued++;
        this.queueMessage('EXTRA BALL LIT!', '', 1.4);
      }
    } else {
      this.queueMessage(`${t.label} COLLECTED`, `${p.goldLetters.size}/4 GOLD`, 0.8);
    }
  }

  onKeyTargetHit(index) {
    SFX.dropTarget();
    this.addBonusCount();
    this.addScore(SCORE.KEY_TARGET);
    const t = this.tableInfo.dropBankKEY.targets[index];
    const mid = Vec2.lerp(t.a, t.b, 0.5);
    this.particles.spark(mid.x, mid.y, { color: '#ff5d3b', count: 8 });
  }

  onKeyBankComplete() {
    this.keyBankLit = true;
    this.tableInfo.scoopMaw.lit = true;
    this.addScore(SCORE.KEY_BANK_COMPLETE);
    SFX.bankComplete();
    this.queueMessage("MAW IS LIT!", 'LOCK YOUR BALL', 1.7);
  }

  onSpinnerSpin() {
    SFX.spinner();
    this.addScore(SCORE.SPINNER_TICK);
  }

  onTopLanePass(index) {
    this.addBonusCount();
    const lane = this.tableInfo.topLanes[index];
    const mid = Vec2.lerp(lane.a, lane.b, 0.5);
    if (this.skillShot.active) {
      this.skillShot.active = false;
      if (index === this.skillShot.lane) {
        this.addScore(this.skillShot.value);
        this.queueMessage('SKILL SHOT!', `+${fmt(this.skillShot.value)}`, 1.4);
        SFX.jackpot();
        this.particles.ring(mid.x, mid.y, { color: '#ffffff', maxRadius: 50 });
        this.particles.floatText(mid.x, mid.y, `+${fmt(this.skillShot.value)}`, { color: '#ffd23d' });
        return;
      }
    }
    this.addScore(SCORE.TOP_LANE);
    this.particles.spark(mid.x, mid.y, { color: '#39ff6a', count: 5 });
  }

  onKickbackFire() {
    SFX.kickback();
    this.queueMessage('KICKBACK!', '', 0.9);
  }

  onRampEnter(name) {
    SFX.rampEnter();
    this.addBonusCount();
    const ramp = name === 'left' ? this.tableInfo.rampLeft : this.tableInfo.rampRight;
    const mid = Vec2.lerp(ramp.entryA, ramp.entryB, 0.5);

    if (this.multiball.active && this.multiball.shotsLit[name]) {
      this.collectJackpot(name, mid);
      return;
    }

    const now = this._time;
    if (this.comboState.lastShot && now - this.comboState.lastTime < 4) this.comboState.comboCount++;
    else this.comboState.comboCount = 1;
    this.comboState.lastShot = name;
    this.comboState.lastTime = now;

    const value = SCORE.RAMP_BASE + (this.comboState.comboCount - 1) * SCORE.RAMP_COMBO_STEP;
    this.addScore(value);
    this.particles.ring(mid.x, mid.y, { color: ramp.color, maxRadius: 46 });
    if (this.comboState.comboCount > 1) {
      this.queueMessage(`${this.comboState.comboCount}X COMBO!`, `+${fmt(value)}`, 1.1);
    } else {
      this.queueMessage(name === 'left' ? "CROW'S NEST!" : 'TREASURE RAMP!', `+${fmt(value)}`, 1.1);
    }
  }

  onRampExit(name) { SFX.rampExit(); }

  handleMawCapture(ball) {
    const maw = this.tableInfo.scoopMaw;
    if (this.multiball.active && this.multiball.shotsLit.maw) {
      this.collectJackpot('maw', maw.pos);
      return 'kick';
    }
    if (this.keyBankLit && this.locksAchieved < 3) {
      this.locksAchieved++;
      this.addScore(SCORE.MAW_LOCK);
      SFX.lock();
      this.particles.ring(maw.pos.x, maw.pos.y, { color: '#8a5cff', maxRadius: 40 });
      if (this.locksAchieved >= 3) {
        this.queueMessage('KRAKEN ATTACK!', 'LOCKS COMPLETE', 1.2);
        this._pendingMultiballStart = 1.1;
      } else {
        this.queueMessage('BALL LOCKED', `${this.locksAchieved} OF 3`, 1.3);
        this._pendingServeAfterLock = 1.3;
      }
      return 'lock';
    }
    this.addScore(SCORE.MAW_SCOOP);
    SFX.scoopKick();
    this.queueMessage("DAVY JONES' LOCKER", `+${fmt(SCORE.MAW_SCOOP)}`, 1.0);
    return 'kick';
  }

  collectJackpot(name, pos) {
    const mb = this.multiball;
    const value = mb.jackpotBase + mb.collected.size * SCORE.JACKPOT_STEP;
    this.addScore(value);
    mb.shotsLit[name] = false;
    mb.collected.add(name);
    SFX.jackpot();
    this.queueMessage('JACKPOT!', `+${fmt(value)}`, 1.2);
    this.particles.ring(pos.x, pos.y, { color: '#ffd23d', maxRadius: 60 });
    this.particles.floatText(pos.x, pos.y, `+${fmt(value)}`, { color: '#ffd23d', size: 18 });

    if (mb.collected.size >= 3) {
      const superVal = SCORE.SUPER_JACKPOT + mb.round * 40000;
      this.addScore(superVal);
      SFX.superJackpot();
      this.queueMessage('SUPER JACKPOT!!', `+${fmt(superVal)}`, 1.9);
      mb.collected.clear();
      mb.shotsLit = { left: true, right: true, maw: true };
      mb.jackpotBase += 15000;
      mb.round++;
      this.flashScreen('255,215,90');
    }
  }

  startMultiball() {
    this.tableInfo.scoopMaw.releaseAllLocked();
    this.locksAchieved = 0;
    this.keyBankLit = false;
    this.tableInfo.scoopMaw.lit = false;
    this.tableInfo.dropBankKEY.reset();
    this.multiball = { active: true, shotsLit: { left: true, right: true, maw: true }, collected: new Set(), jackpotBase: SCORE.JACKPOT_BASE, round: 0 };
    this.ballSaveTimer = BALL_SAVE_DURATION;
    this.ballSaveActive = true;
    SFX.multiballStart();
    this.queueMessage('KRAKEN ATTACK!', 'MULTIBALL!', 2.0);
    this.flashScreen('138,92,255');
  }

  flashScreen(colorRGB) { this.flashState = { alpha: 0.5, color: colorRGB }; }

  // =================================================================== GAME OVER / HIGH SCORES
  endGame() {
    this.state = STATE.GAME_OVER;
    this.queueMessage('GAME OVER', '', 2.2);
    SFX.gameOver();
    const matchNum = Math.floor(Math.random() * 10) * 10;
    this.queueMessage('MATCH', matchNum.toString().padStart(2, '0'), 1.8);
    this._highScoreQueue = this.players
      .map((p, i) => ({ name: `PLAYER ${i + 1}`, score: p.score }))
      .sort((a, b) => b.score - a.score);
    this._afterGameOverDelay = 3.6;
  }

  processNextHighScoreCheck() {
    while (this._highScoreQueue && this._highScoreQueue.length) {
      const entry = this._highScoreQueue.shift();
      if (HighScores.qualifies(entry.score)) {
        this._currentHighScoreEntry = entry;
        this.initialsEntry = { letters: ['A', 'A', 'A'], pos: 0 };
        this.state = STATE.HIGH_SCORE_ENTRY;
        this.queueMessage('NEW HIGH SCORE!', entry.name, 1.5);
        this.toast(`${entry.name} NEW HIGH SCORE!`);
        SFX.newHighScore();
        return;
      }
    }
    this.toAttract();
  }

  toAttract() {
    this.state = STATE.ATTRACT;
    this.world.balls = [];
    this.tableInfo.scoopMaw.locked = [];
    this.attractTimer = 0;
    const el = document.getElementById('start-overlay');
    if (el) el.classList.remove('hidden');
  }

  // =================================================================== FRAME UPDATE
  update(dt) {
    dt = Math.min(dt, 1 / 15);
    this._time += dt;

    if (Input.pressed('pause') && this.state !== STATE.ATTRACT) this.togglePause();
    if (Input.pressed('mute')) this.toggleMute();
    if (this.paused) { Input.endFrame(); return; }

    this.processInput(dt);
    this.world.step(dt);
    for (const b of this.world.balls) if (b.alive && !b.captured) b.pushTrail();

    this._nudgeCooldown = Math.max(0, this._nudgeCooldown - dt);
    this.updateTimers(dt);
    this.updateMessageQueue(dt);
    this.particles.update(dt);
    this.shakeMag = Math.max(0, this.shakeMag - dt * 40);
    if (this.flashState.alpha > 0) this.flashState.alpha = Math.max(0, this.flashState.alpha - dt * 1.1);
    if (this.state === STATE.ATTRACT) this.attractTimer += dt;

    this.updateDMD(dt);
    this.syncDOM();
    Input.endFrame();
  }

  updateTimers(dt) {
    if (this.ballSaveTimer > 0) {
      this.ballSaveTimer -= dt;
      this.ballSaveActive = this.ballSaveTimer > 0;
    }
    if (this.tiltNudgeResetTimer > 0) {
      this.tiltNudgeResetTimer -= dt;
      if (this.tiltNudgeResetTimer <= 0) this.tiltWarnings = 0;
    }
    if (this._pendingServeAfterLock !== undefined) {
      this._pendingServeAfterLock -= dt;
      if (this._pendingServeAfterLock <= 0) { this._pendingServeAfterLock = undefined; this.spawnBallAtPlunger(); }
    }
    if (this._pendingMultiballStart !== undefined) {
      this._pendingMultiballStart -= dt;
      if (this._pendingMultiballStart <= 0) { this._pendingMultiballStart = undefined; this.startMultiball(); }
    }
    if (this._pendingAutoLaunch) {
      this._pendingAutoLaunch.timer -= dt;
      if (this._pendingAutoLaunch.timer <= 0) {
        const b = this._pendingAutoLaunch.ball;
        if (b.alive) b.vel.set(randRange(-20, 20), -1850);
        this._pendingAutoLaunch = null;
      }
    }
    if (this.state === STATE.BALL_OVER && this._bonusAnim) {
      const anim = this._bonusAnim;
      anim.timer += dt;
      if (!anim.done) {
        const speed = Math.max(700, anim.total / 1.1);
        anim.shown = Math.min(anim.total, anim.shown + speed * dt);
        if (anim.shown >= anim.total - 0.5) {
          anim.shown = anim.total;
          anim.done = true;
          this.currentPlayer().score += anim.total;
          anim.doneAt = anim.timer;
        }
      } else if (anim.timer - anim.doneAt > 0.9) {
        this._bonusAnim = null;
        this.advanceTurn();
      }
    }
    if (this.state === STATE.GAME_OVER && this._afterGameOverDelay !== undefined) {
      this._afterGameOverDelay -= dt;
      if (this._afterGameOverDelay <= 0) { this._afterGameOverDelay = undefined; this.processNextHighScoreCheck(); }
    }
  }

  updateMessageQueue(dt) {
    if (this.currentMessage) {
      this.currentMessage.timer -= dt;
      if (this.currentMessage.timer <= 0) this.currentMessage = null;
    }
    if (!this.currentMessage && this.messageQueue.length) {
      const m = this.messageQueue.shift();
      this.currentMessage = { text: m.text, subtext: m.subtext, timer: m.duration };
    }
  }

  queueMessage(text, subtext = '', duration = 1.3) {
    if (this.messageQueue.length > 6) return;
    this.messageQueue.push({ text, subtext, duration });
  }

  toast(text) {
    const container = document.getElementById('toast');
    if (!container) return;
    const div = document.createElement('div');
    div.className = 'toast-msg';
    div.textContent = text;
    container.appendChild(div);
    setTimeout(() => div.remove(), 2300);
  }

  // =================================================================== DMD CONTENT
  updateDMD(dt) {
    this.dmd.update(dt);
    if (this.state === STATE.ATTRACT) { this.updateAttractDMD(); return; }

    const p = this.currentPlayer();
    const msg = this.currentMessage;
    this.dmd.compose((ctx, W, H) => {
      if (msg) {
        ctx.textAlign = 'center';
        ctx.font = "bold 14px 'Arial Black', Arial, sans-serif";
        ctx.fillText(msg.text, W / 2, H * 0.36);
        if (msg.subtext) {
          ctx.font = 'bold 9px Arial';
          ctx.fillText(msg.subtext, W / 2, H * 0.7);
        }
        return;
      }
      if (this.state === STATE.BALL_OVER) {
        ctx.textAlign = 'center';
        ctx.font = 'bold 8px Arial';
        ctx.fillText('BONUS', W / 2, 6);
        ctx.font = "bold 17px 'Arial Black', Arial, sans-serif";
        ctx.fillText(fmt(this._bonusAnim ? this._bonusAnim.shown : 0), W / 2, H * 0.62);
        return;
      }
      if (this.state === STATE.HIGH_SCORE_ENTRY) {
        ctx.textAlign = 'center';
        ctx.font = 'bold 8px Arial';
        ctx.fillText('ENTER YOUR INITIALS', W / 2, 6);
        const letters = this.initialsEntry.letters;
        for (let i = 0; i < 3; i++) {
          const blink = i === this.initialsEntry.pos && Math.floor(this._time * 4) % 2 === 0;
          ctx.font = "bold 22px 'Arial Black', Arial, sans-serif";
          ctx.fillStyle = blink ? 'rgba(255,255,255,0.12)' : '#fff';
          ctx.fillText(letters[i], W / 2 + (i - 1) * 26, H * 0.68);
        }
        ctx.fillStyle = '#fff';
        return;
      }
      if (this.state === STATE.GAME_OVER) {
        ctx.textAlign = 'center';
        ctx.font = "bold 15px 'Arial Black', Arial, sans-serif";
        ctx.fillText('GAME OVER', W / 2, H * 0.36);
        ctx.font = 'bold 12px Arial';
        ctx.fillText(fmt(p.score), W / 2, H * 0.75);
        return;
      }
      // default in-play score screen
      ctx.textAlign = 'left';
      ctx.font = 'bold 6px Arial';
      ctx.fillText(`P${this.activePlayerIndex + 1} BALL ${this.currentBallNumber}`, 2, 4);
      ctx.textAlign = 'right';
      let status = '';
      if (this.multiball.active) status = 'MULTIBALL';
      else if (this.ballSaveActive) status = 'BALL SAVE';
      else if (this.skillShot.active) status = 'SKILL SHOT';
      else if (p.bonusMultiplier > 1) status = `${p.bonusMultiplier}X BONUS`;
      ctx.fillText(status, W - 2, 4);
      ctx.textAlign = 'center';
      ctx.font = "bold 19px 'Arial Black', Arial, sans-serif";
      ctx.fillText(fmt(p.score), W / 2, H * 0.72);
    });
  }

  updateAttractDMD() {
    const slide = Math.floor(this.attractTimer / 3.4) % 3;
    const scores = HighScores.load();
    this.dmd.compose((ctx, W, H) => {
      ctx.textAlign = 'center';
      if (slide === 0) {
        ctx.font = "bold 16px 'Arial Black', Arial, sans-serif";
        ctx.fillText("KRAKEN'S", W / 2, H * 0.32);
        ctx.fillText('GOLD', W / 2, H * 0.68);
      } else if (slide === 1) {
        ctx.font = 'bold 8px Arial';
        ctx.fillText('HIGH SCORES', W / 2, 6);
        ctx.font = "bold 9px 'Arial Black', Arial, sans-serif";
        scores.slice(0, 4).forEach((s, i) => {
          ctx.textAlign = 'left';
          ctx.fillText(`${i + 1}. ${s.initials}`, 6, 14 + i * 6.2);
          ctx.textAlign = 'right';
          ctx.fillText(fmt(s.score), W - 6, 14 + i * 6.2);
        });
      } else {
        ctx.font = 'bold 10px Arial';
        ctx.fillText(`${this.numPlayersSelected} PLAYER${this.numPlayersSelected > 1 ? 'S' : ''}`, W / 2, H * 0.35);
        ctx.font = 'bold 8px Arial';
        ctx.fillText('PRESS 1-4, THEN ENTER', W / 2, H * 0.68);
      }
    });
  }

  refreshAttractHighScores() {
    const el = document.getElementById('attract-hiscores');
    if (!el) return;
    const scores = HighScores.load();
    el.innerHTML = '';
    scores.forEach((s, i) => {
      const row = document.createElement('div');
      row.textContent = `${i + 1}. ${s.initials}   ${fmt(s.score)}`;
      el.appendChild(row);
    });
  }

  // =================================================================== DOM SYNC
  initDOM() {
    const lampsEl = document.getElementById('apron-lamps');
    this._ballLamps = [];
    if (lampsEl) {
      lampsEl.innerHTML = '';
      for (let i = 0; i < BALLS_PER_GAME; i++) {
        const d = document.createElement('div');
        d.className = 'lamp';
        lampsEl.appendChild(d);
        this._ballLamps.push(d);
      }
    }
  }

  syncDOM() {
    const leftLabel = document.querySelector('.apron-label.left');
    const rightLabel = document.querySelector('.apron-label.right');
    if (leftLabel) leftLabel.classList.toggle('lit', this.ballSaveActive && this.state === STATE.IN_PLAY);
    if (rightLabel) rightLabel.classList.toggle('lit', this.tiltActive);
    if (this._ballLamps) {
      this._ballLamps.forEach((el, i) => el.classList.toggle('on', this.state !== STATE.ATTRACT && i < this.currentBallNumber));
    }
  }

  // =================================================================== RENDER
  render() {
    Renderer.render(this.ctx, {
      world: this.world,
      particles: this.particles,
      balls: this.world.balls,
      plunger: { pos: this.tableInfo.plungerRest, charge: this.plungerCharge, waiting: this.ballWaitingAtPlunger },
      shake: { mag: this.shakeMag },
      flash: this.flashState,
    });
    this.dmd.draw(this.dmdCtx, 0, 0, this.dmdCanvas.width, this.dmdCanvas.height);
  }
}
