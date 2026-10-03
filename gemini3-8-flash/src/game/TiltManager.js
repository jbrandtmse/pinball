/**
 * TiltManager - Realistic Williams Pendulum Tilt Bob Simulation
 * Handles nudge impulses, pendulum oscillation, damping, warnings, and TILT state.
 */
export class TiltManager {
  constructor(game) {
    this.game = game;
    this.bobAngle = 0;       // Pendulum displacement
    this.bobVelocity = 0;    // Pendulum angular velocity
    this.threshold = 1.0;    // Contact ring threshold
    this.damping = 2.4;      // Air/mechanical damping
    this.frequency = 12.0;   // Oscillation frequency

    this.warningCount = 0;
    this.maxWarnings = 2;
    this.isTilted = false;
    this.nudgeCooldown = 0;

    // Callbacks
    this.onWarning = null;
    this.onTilt = null;
  }

  reset() {
    this.bobAngle = 0;
    this.bobVelocity = 0;
    this.isTilted = false;
    this.warningCount = 0;
    this.nudgeCooldown = 0;
  }

  nudge(dirX = 0, dirY = 0) {
    if (this.isTilted || this.nudgeCooldown > 0) return;

    this.nudgeCooldown = 0.15; // 150ms cooldown between nudges

    // Impart impulse to pendulum bob
    const force = (dirX * 0.75) + (dirY * 0.5);
    this.bobVelocity += force;

    // Table shake visual offset for camera
    if (this.game && this.game.applyTableShake) {
      this.game.applyTableShake(dirX * 2.5, dirY * 2.5);
    }

    // Physical nudge to active balls on playfield
    if (this.game && this.game.physicsWorld) {
      for (const ball of this.game.physicsWorld.balls) {
        if (ball.state === 'ACTIVE') {
          ball.vel.x += dirX * 65.0;
          ball.vel.y += dirY * 45.0;
        }
      }
    }
  }

  update(dt) {
    if (this.nudgeCooldown > 0) {
      this.nudgeCooldown -= dt;
    }

    // Harmonic oscillator with damping: theta'' = -freq^2 * theta - damping * theta'
    const accel = -this.frequency * this.bobAngle - this.damping * this.bobVelocity;
    this.bobVelocity += accel * dt;
    this.bobAngle += this.bobVelocity * dt;

    if (!this.isTilted && Math.abs(this.bobAngle) >= this.threshold) {
      // Bob touched contact ring!
      this.bobVelocity *= -0.3; // bounce off ring
      this.warningCount++;

      if (this.warningCount > this.maxWarnings) {
        // TILT!
        this.isTilted = true;
        if (this.onTilt) this.onTilt();
      } else {
        if (this.onWarning) this.onWarning(this.warningCount);
      }
    }
  }
}

