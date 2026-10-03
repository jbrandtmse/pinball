/**
 * RulesEngine - Williams WPC-style Pinball Rulesheet
 * Manages: C-O-R-E lanes, Lane Change, Drop Target coolant, Ball Locks, 3-Ball Multiball,
 * Jackpots, Super Jackpots, Ball Save, and End-of-Ball Bonus.
 */
export class RulesEngine {
  constructor(game) {
    this.game = game;

    // Player State
    this.score = 0;
    this.ballNumber = 1;
    this.maxBalls = 3;
    this.bonusMultiplier = 1;
    this.coreTemp = 100; // 100% down to 0% (Stabilized)

    // Mode States
    this.isMultiball = false;
    this.multiballScore = 0;
    this.ballsLocked = 0;
    this.isLockLit = false;
    this.leftJackpotLit = false;
    this.rightJackpotLit = false;
    this.superJackpotLit = false;

    // Ball Save
    this.ballSaveTime = 0; // seconds remaining
    this.isBallSaveActive = false;

    // Lane Change & C-O-R-E lanes
    this.coreLanes = {
      lane_C: false,
      lane_O: false,
      lane_R: false,
      lane_E: false
    };

    // Kickback (Left Outlane)
    this.isKickbackLit = false;

    // Stats for End-of-Ball Bonus
    this.switchHits = 0;
    this.rampCount = 0;
    this.bumperHits = 0;
    this.comboCount = 0;

    // Callbacks
    this.onScoreUpdate = null;
    this.onModeChange = null;
    this.onInsertUpdate = null;
    this.onDMDEvent = null;
    this.onVoiceCallout = null;
  }

  resetGame() {
    this.score = 0;
    this.ballNumber = 1;
    this.bonusMultiplier = 1;
    this.coreTemp = 100;
    this.isMultiball = false;
    this.multiballScore = 0;
    this.ballsLocked = 0;
    this.isLockLit = true; // First lock is lit at start
    this.leftJackpotLit = false;
    this.rightJackpotLit = false;
    this.superJackpotLit = false;
    this.isKickbackLit = true; // Kickback lit at start

    this.coreLanes = { lane_C: false, lane_O: false, lane_R: false, lane_E: false };
    this.resetBallStats();
    this.notifyInserts();
  }

  startNewBall(ballNum) {
    this.ballNumber = ballNum;
    this.resetBallStats();
    this.bonusMultiplier = 1;

    // Start 12-second ball save
    this.startBallSave(12);

    if (this.onDMDEvent) {
      this.onDMDEvent('BALL_START', { ball: this.ballNumber });
    }
  }

  resetBallStats() {
    this.switchHits = 0;
    this.rampCount = 0;
    this.bumperHits = 0;
    this.comboCount = 0;
  }

  addScore(points) {
    this.score += points;
    if (this.isMultiball) {
      this.multiballScore += points;
    }
    if (this.onScoreUpdate) {
      this.onScoreUpdate(this.score, points);
    }
  }

  startBallSave(duration) {
    this.ballSaveTime = duration;
    this.isBallSaveActive = true;
    this.notifyInserts();
  }

  update(dt) {
    if (this.isBallSaveActive) {
      this.ballSaveTime -= dt;
      if (this.ballSaveTime <= 0) {
        this.ballSaveTime = 0;
        this.isBallSaveActive = false;
        this.notifyInserts();
      }
    }
  }

  // Classic Williams Flipper Lane Change: shifts lit rollovers
  laneChange(direction = 'right') {
    const keys = ['lane_C', 'lane_O', 'lane_R', 'lane_E'];
    const values = keys.map(k => this.coreLanes[k]);

    if (direction === 'right') {
      const last = values.pop();
      values.unshift(last);
    } else {
      const first = values.shift();
      values.push(first);
    }

    keys.forEach((k, i) => {
      this.coreLanes[k] = values[i];
    });

    this.notifyInserts();
  }

  handleRollover(rollover) {
    this.switchHits++;

    // 1. C-O-R-E Lanes
    if (rollover.id.startsWith('lane_')) {
      if (!this.coreLanes[rollover.id]) {
        this.coreLanes[rollover.id] = true;
        this.addScore(15000);
      } else {
        this.addScore(2500);
      }

      // Check if all C-O-R-E lanes lit
      const allLit = Object.values(this.coreLanes).every(v => v);
      if (allLit) {
        // Complete C-O-R-E: Advance multiplier, reset lanes, light kickback
        this.coreLanes = { lane_C: false, lane_O: false, lane_R: false, lane_E: false };
        this.bonusMultiplier = Math.min(10, this.bonusMultiplier + 1);
        this.isKickbackLit = true;
        this.addScore(100000);

        if (this.onDMDEvent) {
          this.onDMDEvent('MULTIPLIER_ADVANCED', { mult: this.bonusMultiplier });
        }
        if (this.onVoiceCallout) {
          this.onVoiceCallout('multiplier');
        }
      }
      this.notifyInserts();
      return;
    }

    // 2. Return Inlanes & Outlanes
    if (rollover.id === 'inlane_left' || rollover.id === 'inlane_right') {
      this.addScore(10000);
    } else if (rollover.id === 'outlane_left') {
      if (this.isKickbackLit) {
        // Magnetic Kickback fires ball back into play!
        this.isKickbackLit = false;
        this.addScore(50000);
        if (this.onDMDEvent) this.onDMDEvent('KICKBACK_SAVED');
        if (this.onVoiceCallout) this.onVoiceCallout('kickback');
        this.notifyInserts();
        return 'KICKBACK_FIRE';
      }
    } else if (rollover.id === 'outlane_right') {
      this.addScore(25000);
    }
  }

  handleBumperHit(bumper, points) {
    this.bumperHits++;
    this.switchHits++;
    this.addScore(points);
  }

  handleSlingshotHit(slingshot, points) {
    this.switchHits++;
    this.addScore(points);
  }

  handleDropTargetHit(target, points) {
    this.switchHits++;
    this.addScore(points);
  }

  handleDropTargetBankComplete(bank, points) {
    this.addScore(points);
    // Cool the core by 20%
    this.coreTemp = Math.max(0, this.coreTemp - 20);
    this.isLockLit = true; // Relight core lock

    if (this.onDMDEvent) {
      this.onDMDEvent('CORE_COOLED', { temp: this.coreTemp });
    }
    if (this.onVoiceCallout) {
      this.onVoiceCallout('coolant_restored');
    }
    this.notifyInserts();
  }

  handleRampComplete(ramp) {
    this.rampCount++;
    this.switchHits++;

    if (this.isMultiball) {
      // Check for Multiball Jackpots
      if (ramp.name === 'left_ramp' && this.leftJackpotLit) {
        this.collectJackpot('LEFT RAMP');
        this.leftJackpotLit = false;
        this.checkSuperJackpot();
        return;
      } else if (ramp.name === 'right_ramp' && this.rightJackpotLit) {
        this.collectJackpot('RIGHT RAMP');
        this.rightJackpotLit = false;
        this.checkSuperJackpot();
        return;
      }
    }

    // Normal ramp points & combo
    this.comboCount++;
    const pts = 100000 + (this.comboCount * 50000);
    this.addScore(pts);

    if (this.onDMDEvent) {
      this.onDMDEvent('RAMP_MADE', { ramp: ramp.name, combo: this.comboCount });
    }
  }

  handleScoopCapture(scoop, ball) {
    this.switchHits++;

    if (this.isMultiball && this.superJackpotLit) {
      // COLLECT SUPER JACKPOT!
      this.collectSuperJackpot();
      return 'SUPER_JACKPOT';
    }

    if (this.isLockLit && !this.isMultiball) {
      this.ballsLocked++;
      this.isLockLit = false; // Must qualify next lock with drop targets or ramp

      if (this.ballsLocked === 1) {
        this.addScore(250000);
        if (this.onDMDEvent) this.onDMDEvent('LOCK_1');
        if (this.onVoiceCallout) this.onVoiceCallout('lock_1');
        this.notifyInserts();
        return 'LOCK_1_ENGAGED';
      } else if (this.ballsLocked === 2) {
        this.addScore(500000);
        if (this.onDMDEvent) this.onDMDEvent('LOCK_2');
        if (this.onVoiceCallout) this.onVoiceCallout('lock_2');
        this.notifyInserts();
        return 'LOCK_2_ENGAGED';
      } else if (this.ballsLocked >= 3) {
        // TRIGGER 3-BALL MELTDOWN MULTIBALL!
        this.triggerMultiball();
        return 'MULTIBALL_START';
      }
    }

    // Mystery Core Award if lock is not lit
    const awards = [
      { text: '500,000 PTS', pts: 500000 },
      { text: 'BONUS 3X', fn: () => { this.bonusMultiplier = Math.max(this.bonusMultiplier, 3); } },
      { text: 'LIGHT KICKBACK', fn: () => { this.isKickbackLit = true; } },
      { text: 'LIGHT LOCK', fn: () => { this.isLockLit = true; } }
    ];
    const award = awards[Math.floor(Math.random() * awards.length)];
    if (award.pts) this.addScore(award.pts);
    if (award.fn) award.fn();

    if (this.onDMDEvent) {
      this.onDMDEvent('CORE_AWARD', { title: award.text });
    }
    this.notifyInserts();
    return 'CORE_AWARD';
  }

  triggerMultiball() {
    this.isMultiball = true;
    this.ballsLocked = 0;
    this.multiballScore = 0;
    this.leftJackpotLit = true;
    this.rightJackpotLit = true;
    this.superJackpotLit = false;

    // 15 seconds ball save during multiball start
    this.startBallSave(15);

    if (this.onDMDEvent) this.onDMDEvent('MULTIBALL_INTRO');
    if (this.onVoiceCallout) this.onVoiceCallout('multiball');
    if (this.onModeChange) this.onModeChange('MULTIBALL');
    this.notifyInserts();
  }

  collectJackpot(source) {
    const jackpotPoints = 1000000;
    this.addScore(jackpotPoints);

    if (this.onDMDEvent) this.onDMDEvent('JACKPOT', { source, points: jackpotPoints });
    if (this.onVoiceCallout) this.onVoiceCallout('jackpot');
    this.notifyInserts();
  }

  checkSuperJackpot() {
    if (!this.leftJackpotLit && !this.rightJackpotLit) {
      // Both ramp jackpots collected: LIGHT SUPER JACKPOT at Core Scoop!
      this.superJackpotLit = true;
      if (this.onDMDEvent) this.onDMDEvent('SUPER_JACKPOT_LIT');
      if (this.onVoiceCallout) this.onVoiceCallout('super_jackpot_lit');
      this.notifyInserts();
    }
  }

  collectSuperJackpot() {
    const superPoints = 5000000;
    this.addScore(superPoints);
    this.superJackpotLit = false;
    // Relight ramp jackpots for repeating
    this.leftJackpotLit = true;
    this.rightJackpotLit = true;

    if (this.onDMDEvent) this.onDMDEvent('SUPER_JACKPOT_COLLECTED', { points: superPoints });
    if (this.onVoiceCallout) this.onVoiceCallout('super_jackpot');
    this.notifyInserts();
  }

  endMultiball() {
    this.isMultiball = false;
    this.leftJackpotLit = false;
    this.rightJackpotLit = false;
    this.superJackpotLit = false;
    this.isLockLit = false;

    if (this.onDMDEvent) {
      this.onDMDEvent('MULTIBALL_TOTAL', { score: this.multiballScore });
    }
    if (this.onModeChange) this.onModeChange('NORMAL');
    this.notifyInserts();
  }

  calculateBonus() {
    const base = (this.switchHits * 2500) + (this.rampCount * 75000) + (this.bumperHits * 12500);
    const total = base * this.bonusMultiplier;
    return {
      base,
      multiplier: this.bonusMultiplier,
      total
    };
  }

  notifyInserts() {
    if (this.onInsertUpdate) {
      this.onInsertUpdate({
        coreLanes: { ...this.coreLanes },
        multiplier: this.bonusMultiplier,
        isLockLit: this.isLockLit,
        ballsLocked: this.ballsLocked,
        leftJackpotLit: this.leftJackpotLit,
        rightJackpotLit: this.rightJackpotLit,
        superJackpotLit: this.superJackpotLit,
        isKickbackLit: this.isKickbackLit,
        isBallSaveActive: this.isBallSaveActive,
        isMultiball: this.isMultiball
      });
    }
  }
}

