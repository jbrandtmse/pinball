import { Vector2D } from './Vector2D.js';

/**
 * Plunger - Williams Manual Spring Plunger & Autoplunger Solenoid
 * Supports analog spring compression, release strike, and autoplunger kick
 */
export class Plunger {
  constructor(options = {}) {
    this.name = options.name || 'plunger';
    this.restPos = new Vector2D(options.x ?? 498, options.y ?? 1080);
    this.maxPull = options.maxPull ?? 60.0; // mm max pull back
    this.currentPull = 0; // 0 to 1
    this.pullSpeed = 1.4; // 1.4s to full pull
    this.isCharging = false;
    this.maxLaunchSpeed = options.maxLaunchSpeed ?? 2800.0; // mm/s

    this.mesh = null;
    this.springMesh = null;

    this.onLaunch = options.onLaunch || null;
  }

  setCharging(state) {
    if (state) {
      this.isCharging = true;
    } else {
      if (this.isCharging) {
        this.fire();
      }
      this.isCharging = false;
    }
  }

  update(dt, ballInLane) {
    if (this.isCharging) {
      this.currentPull = Math.min(1.0, this.currentPull + this.pullSpeed * dt);
      if (ballInLane && ballInLane.state === 'IN_PLUNGER') {
        ballInLane.pos.y = this.restPos.y + this.currentPull * this.maxPull;
      }
    } else if (this.currentPull > 0) {
      // Spring snaps forward
      this.currentPull = Math.max(0, this.currentPull - 12.0 * dt);
    }
  }

  fire(ballInLane) {
    const power = Math.max(0.2, this.currentPull);
    this.currentPull = 0;
    this.isCharging = false;

    if (ballInLane && ballInLane.state === 'IN_PLUNGER') {
      ballInLane.state = 'ACTIVE';
      // Nonlinear spring impulse: quadratic power curve
      const speed = this.maxLaunchSpeed * (0.3 + 0.7 * (power * power));
      ballInLane.vel.set(0, -speed);

      if (this.onLaunch) {
        this.onLaunch(power);
      }
      return true;
    }
    return false;
  }

  autoPlunge(ball) {
    if (ball) {
      ball.state = 'ACTIVE';
      ball.pos.set(this.restPos.x, this.restPos.y);
      ball.vel.set(0, -this.maxLaunchSpeed * 0.95);
      if (this.onLaunch) {
        this.onLaunch(1.0);
      }
      return true;
    }
    return false;
  }
}

