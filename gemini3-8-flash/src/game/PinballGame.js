import { PhysicsWorld } from '../physics/PhysicsWorld.js';
import { RulesEngine } from './RulesEngine.js';
import { TiltManager } from './TiltManager.js';
import { HighScoreManager } from './HighScoreManager.js';

/**
 * PinballGame - Master Game State Machine & Coordinator
 */
export class PinballGame {
  constructor() {
    this.physicsWorld = new PhysicsWorld();
    this.rules = new RulesEngine(this);
    this.tilt = new TiltManager(this);
    this.highScores = new HighScoreManager();

    // Game States: 'ATTRACT', 'SKILL_SHOT', 'IN_PLAY', 'MULTIBALL', 'BALL_OVER', 'INITIALS_ENTRY', 'GAME_OVER'
    this.state = 'ATTRACT';
    this.currentBallNum = 1;
    this.maxBalls = 3;

    // Table Shake offset (visual camera effect)
    this.shakeOffset = { x: 0, y: 0 };

    // Attract mode cycling
    this.attractTimer = 0;
    this.attractPage = 0;

    // External managers set by main
    this.dmd = null;
    this.sound = null;
    this.music = null;
    this.voice = null;
    this.tableView = null;

    this.bindPhysicsEvents();
    this.bindRulesEvents();
  }

  bindPhysicsEvents() {
    // Sound routing
    this.physicsWorld.onSoundEffect = (name, param) => {
      if (this.sound) this.sound.play(name, param);
    };

    // Pop bumper hit
    for (const b of this.physicsWorld.bumpers) {
      b.onHit = (bumper, pts) => {
        if (!this.tilt.isTilted && (this.state === 'IN_PLAY' || this.state === 'MULTIBALL')) {
          this.rules.handleBumperHit(bumper, pts);
        }
      };
    }

    // Slingshot hit
    for (const s of this.physicsWorld.slingshots) {
      s.onHit = (slingshot, pts) => {
        if (!this.tilt.isTilted && (this.state === 'IN_PLAY' || this.state === 'MULTIBALL')) {
          this.rules.handleSlingshotHit(slingshot, pts);
        }
      };
    }

    // Drop targets
    this.physicsWorld.dropTargets.onTargetHit = (target, pts) => {
      if (!this.tilt.isTilted && (this.state === 'IN_PLAY' || this.state === 'MULTIBALL')) {
        this.rules.handleDropTargetHit(target, pts);
      }
    };
    this.physicsWorld.dropTargets.onBankComplete = (bank, pts) => {
      if (!this.tilt.isTilted && (this.state === 'IN_PLAY' || this.state === 'MULTIBALL')) {
        this.rules.handleDropTargetBankComplete(bank, pts);
      }
    };

    // Ramps
    this.physicsWorld.leftRamp.onComplete = (ramp) => {
      if (!this.tilt.isTilted && (this.state === 'IN_PLAY' || this.state === 'MULTIBALL')) {
        this.rules.handleRampComplete(ramp);
      }
    };
    this.physicsWorld.rightRamp.onComplete = (ramp) => {
      if (!this.tilt.isTilted && (this.state === 'IN_PLAY' || this.state === 'MULTIBALL')) {
        this.rules.handleRampComplete(ramp);
      }
    };

    // Scoop / Saucer
    this.physicsWorld.scoop.onBallCaptured = (scoop, ball) => {
      if (this.tilt.isTilted) {
        setTimeout(() => scoop.eject(), 1000);
        return;
      }

      if (this.state === 'IN_PLAY' || this.state === 'MULTIBALL') {
        const result = this.rules.handleScoopCapture(scoop, ball);
        if (result === 'LOCK_1_ENGAGED' || result === 'LOCK_2_ENGAGED') {
          // Serve next ball into plunger lane
          setTimeout(() => {
            this.serveBallToPlunger();
          }, 1500);
        } else if (result === 'MULTIBALL_START') {
          // Multiball release!
          this.startMultiballSequence();
        }
      }
    };

    // Rollovers
    this.physicsWorld.onRollover = (r, ball) => {
      if (!this.tilt.isTilted && (this.state === 'IN_PLAY' || this.state === 'MULTIBALL' || this.state === 'SKILL_SHOT')) {
        const result = this.rules.handleRollover(r);
        if (result === 'KICKBACK_FIRE') {
          // Solenoid kicks ball back up outlane
          ball.vel.set(200, -1800);
          if (this.sound) this.sound.play('kickback');
        }
      }
    };

    // Drain handling
    this.physicsWorld.onBallDrain = (ball) => {
      this.handleBallDrain(ball);
    };

    // Tilt callbacks
    this.tilt.onWarning = (warningNum) => {
      if (this.dmd) this.dmd.showWarning(`TILT WARNING ${warningNum}!`);
      if (this.sound) this.sound.play('warning');
      if (this.voice) this.voice.speak(`Warning ${warningNum}`);
    };
    this.tilt.onTilt = () => {
      if (this.dmd) this.dmd.showTilt();
      if (this.sound) this.sound.play('tilt');
      if (this.voice) this.voice.speak('Tilt!');
      // Deactivate flipper solenoids immediately
      this.physicsWorld.leftFlipper.setEnergized(false);
      this.physicsWorld.rightFlipper.setEnergized(false);
    };
  }

  bindRulesEvents() {
    this.rules.onScoreUpdate = (newScore, delta) => {
      if (this.dmd) this.dmd.setScore(newScore);
    };

    this.rules.onDMDEvent = (type, data) => {
      if (this.dmd) this.dmd.handleEvent(type, data);
    };

    this.rules.onVoiceCallout = (callout) => {
      if (this.voice) this.voice.callout(callout);
    };
  }

  startGame() {
    if (this.state === 'INITIALS_ENTRY') return;

    this.rules.resetGame();
    this.tilt.reset();
    this.currentBallNum = 1;
    this.state = 'SKILL_SHOT';

    if (this.music) this.music.playMainTheme();
    if (this.voice) this.voice.speak('Quantum Core Online');
    if (this.dmd) this.dmd.setScore(0);

    this.serveBallToPlunger();
  }

  serveBallToPlunger() {
    const ball = this.physicsWorld.spawnBall(this.physicsWorld.balls.length + 1);
    ball.reset(this.physicsWorld.plunger.restPos.x, this.physicsWorld.plunger.restPos.y);
    ball.state = 'IN_PLUNGER';

    if (this.sound) this.sound.play('trough_eject');
    this.rules.startNewBall(this.currentBallNum);
  }

  startMultiballSequence() {
    this.state = 'MULTIBALL';
    this.rules.triggerMultiball();
    if (this.music) this.music.playMultiballMusic();
    if (this.sound) this.sound.play('siren');

    // Eject scoop ball if any
    if (this.physicsWorld.scoop.heldBall) {
      setTimeout(() => {
        this.physicsWorld.scoop.eject();
      }, 800);
    }

    // Auto-plunge any ball waiting in plunger lane
    const plungerBall = this.physicsWorld.balls.find(b => b.state === 'IN_PLUNGER');
    if (plungerBall) {
      this.physicsWorld.plunger.autoPlunge(plungerBall);
    }

    // Auto-plunge additional balls into play
    setTimeout(() => {
      const b2 = this.physicsWorld.spawnBall(2);
      b2.reset(this.physicsWorld.plunger.restPos.x, this.physicsWorld.plunger.restPos.y);
      this.physicsWorld.plunger.autoPlunge(b2);
    }, 1200);

    setTimeout(() => {
      const b3 = this.physicsWorld.spawnBall(3);
      b3.reset(this.physicsWorld.plunger.restPos.x, this.physicsWorld.plunger.restPos.y);
      this.physicsWorld.plunger.autoPlunge(b3);
    }, 2400);
  }

  handleBallDrain(ball) {
    if (this.sound) this.sound.play('drain');

    // Check Ball Save!
    if (this.rules.isBallSaveActive && !this.tilt.isTilted) {
      if (this.dmd) this.dmd.showBallSaved();
      if (this.sound) this.sound.play('ball_saved');
      if (this.voice) this.voice.speak('Ball Saved!');

      // Auto-plunge ball back
      setTimeout(() => {
        ball.reset(this.physicsWorld.plunger.restPos.x, this.physicsWorld.plunger.restPos.y);
        this.physicsWorld.plunger.autoPlunge(ball);
      }, 600);
      return;
    }

    // Check Multiball active balls count
    if (this.state === 'MULTIBALL') {
      const activeCount = this.physicsWorld.balls.filter(b => b.state === 'ACTIVE' || b.state === 'IN_RAMP').length;
      if (activeCount <= 1) {
        // Drop back to single ball normal play
        this.rules.endMultiball();
        this.state = 'IN_PLAY';
        if (this.music) this.music.playMainTheme();
      }
      return;
    }

    // Single ball drained: Ball Over!
    this.state = 'BALL_OVER';
    const bonus = this.tilt.isTilted ? { base: 0, multiplier: 1, total: 0 } : this.rules.calculateBonus();
    this.rules.addScore(bonus.total);

    if (this.dmd) {
      this.dmd.showBonus(bonus, () => {
        this.advanceToNextBall();
      });
    } else {
      setTimeout(() => this.advanceToNextBall(), 2500);
    }
  }

  advanceToNextBall() {
    this.tilt.reset();

    if (this.currentBallNum < this.maxBalls) {
      this.currentBallNum++;
      this.state = 'SKILL_SHOT';
      this.serveBallToPlunger();
    } else {
      // Game Over!
      this.handleGameOver();
    }
  }

  handleGameOver() {
    if (this.music) this.music.playGameOverJingle();
    if (this.voice) this.voice.speak('Game Over');

    if (this.highScores.isHighScore(this.rules.score)) {
      this.state = 'INITIALS_ENTRY';
      this.highScores.startInitialsEntry(this.rules.score);
      if (this.dmd) this.dmd.showInitialsEntry(this.highScores);
    } else {
      this.state = 'GAME_OVER';
      if (this.dmd) {
        this.dmd.showGameOver(() => {
          this.state = 'ATTRACT';
          if (this.music) this.music.playAttractMusic();
        });
      }
    }
  }

  // Inputs
  leftFlipperDown() {
    if (this.state === 'INITIALS_ENTRY') {
      this.highScores.prevLetter();
      if (this.dmd) this.dmd.updateInitials(this.highScores);
      if (this.sound) this.sound.play('letter_cycle');
      return;
    }
    if (!this.tilt.isTilted) {
      this.physicsWorld.leftFlipper.setEnergized(true);
      this.rules.laneChange('left');
    }
  }

  leftFlipperUp() {
    this.physicsWorld.leftFlipper.setEnergized(false);
  }

  rightFlipperDown() {
    if (this.state === 'INITIALS_ENTRY') {
      this.highScores.nextLetter();
      if (this.dmd) this.dmd.updateInitials(this.highScores);
      if (this.sound) this.sound.play('letter_cycle');
      return;
    }
    if (!this.tilt.isTilted) {
      this.physicsWorld.rightFlipper.setEnergized(true);
      this.rules.laneChange('right');
    }
  }

  rightFlipperUp() {
    this.physicsWorld.rightFlipper.setEnergized(false);
  }

  plungerPull() {
    if (this.state === 'SKILL_SHOT' || this.state === 'IN_PLAY' || this.state === 'MULTIBALL') {
      this.physicsWorld.plunger.setCharging(true);
    }
  }

  plungerRelease() {
    if (this.state === 'INITIALS_ENTRY') {
      const done = this.highScores.confirmLetter();
      if (this.sound) this.sound.play('letter_select');
      if (done) {
        if (this.dmd) this.dmd.showHighScores(this.highScores);
        setTimeout(() => {
          this.state = 'ATTRACT';
          if (this.music) this.music.playAttractMusic();
        }, 4000);
      } else {
        if (this.dmd) this.dmd.updateInitials(this.highScores);
      }
      return;
    }

    if (this.state === 'SKILL_SHOT') {
      const plungerBall = this.physicsWorld.balls.find(b => b.state === 'IN_PLUNGER');
      const launched = this.physicsWorld.plunger.fire(plungerBall);
      if (launched) {
        this.state = 'IN_PLAY';
      }
    } else {
      this.physicsWorld.plunger.setCharging(false);
    }
  }

  nudgeLeft() {
    this.tilt.nudge(-1.0, 0.2);
    if (this.sound) this.sound.play('nudge');
  }

  nudgeRight() {
    this.tilt.nudge(1.0, 0.2);
    if (this.sound) this.sound.play('nudge');
  }

  nudgeUp() {
    this.tilt.nudge(0, -1.0);
    if (this.sound) this.sound.play('nudge');
  }

  applyTableShake(sx, sy) {
    this.shakeOffset.x = sx;
    this.shakeOffset.y = sy;
  }

  update(dt) {
    // Shake decay
    this.shakeOffset.x *= 0.88;
    this.shakeOffset.y *= 0.88;

    // Physics step
    this.physicsWorld.update(dt);
    this.rules.update(dt);
    this.tilt.update(dt);

    // Attract mode cycle
    if (this.state === 'ATTRACT') {
      this.attractTimer += dt;
      if (this.attractTimer >= 5.0) {
        this.attractTimer = 0;
        this.attractPage = (this.attractPage + 1) % 3;
        if (this.dmd) {
          if (this.attractPage === 0) this.dmd.showTitleScreen();
          else if (this.attractPage === 1) this.dmd.showHighScores(this.highScores);
          else this.dmd.showInsertCoin();
        }
      }
    }
  }
}
