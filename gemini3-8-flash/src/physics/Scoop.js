import { Vector2D } from './Vector2D.js';

/**
 * Scoop - Reactor Core Containment Scoop & VUK (Vertical Up-Kicker)
 * Captures ball for locks, mystery awards, super jackpots, and kicks it out with solenoid eject
 */
export class Scoop {
  constructor(options = {}) {
    this.name = options.name || 'core_scoop';
    this.pos = new Vector2D(options.x ?? 260, options.y ?? 380);
    this.radius = options.radius ?? 18.0;
    this.ejectDir = new Vector2D(options.ejectDirX ?? 0.2, options.ejectDirY ?? 1).normalize();
    this.ejectSpeed = options.ejectSpeed ?? 750.0;
    this.heldBall = null;
    this.holdTimer = 0;
    this.isLockLit = false;
    this.isSuperJackpotLit = false;

    // Visual
    this.mesh = null;
    this.holeMesh = null;
    this.pointLight = null;

    // Callbacks
    this.onBallCaptured = options.onBallCaptured || null;
    this.onBallEjected = options.onBallEjected || null;
  }

  update(dt) {
    if (this.heldBall) {
      this.holdTimer -= dt;
      if (this.holdTimer <= 0) {
        this.eject();
      }
    }
  }

  checkCapture(ball) {
    if (ball.state !== 'ACTIVE' || ball.z > 5 || this.heldBall) return false;

    const diff = ball.pos.clone().sub(this.pos);
    const distSq = diff.lengthSq();

    // Check if ball is rolling over the scoop
    if (distSq < this.radius * this.radius) {
      // Capture the ball!
      this.heldBall = ball;
      ball.state = 'LOCKED';
      ball.vel.set(0, 0);
      ball.pos.copy(this.pos);
      this.holdTimer = 1.8; // default hold duration for animations & voice callout

      if (this.onBallCaptured) {
        this.onBallCaptured(this, ball);
      }
      return true;
    }
    return false;
  }

  eject() {
    if (!this.heldBall) return;

    const ball = this.heldBall;
    this.heldBall = null;
    this.holdTimer = 0;

    ball.state = 'ACTIVE';
    ball.z = 0;
    ball.pos.copy(this.pos).addScaled(this.ejectDir, this.radius + ball.radius + 2);
    ball.vel = this.ejectDir.clone().multiplyScalar(this.ejectSpeed);

    if (this.onBallEjected) {
      this.onBallEjected(this, ball);
    }
  }
}

