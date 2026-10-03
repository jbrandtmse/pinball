import { Vector2D } from './Vector2D.js';

/**
 * Bumper - Williams Jet/Pop Bumper
 * Features: skirt switch activation, high-energy radial solenoid kick, scoring, and lighting flash
 */
export class Bumper {
  constructor(options = {}) {
    this.name = options.name || 'bumper';
    this.pos = new Vector2D(options.x ?? 0, options.y ?? 0);
    this.radius = options.radius ?? 26.0;
    this.kickStrength = options.kickStrength ?? 1900.0; // impulse velocity mm/s
    this.points = options.points ?? 1000;
    this.isSuperLit = false;
    
    // Visual state
    this.flashTimer = 0;
    this.mesh = null;
    this.ringMesh = null;
    this.pointLight = null;

    // Callbacks
    this.onHit = options.onHit || null;
  }

  update(dt) {
    if (this.flashTimer > 0) {
      this.flashTimer -= dt;
      if (this.flashTimer <= 0) {
        this.flashTimer = 0;
        if (this.pointLight) {
          this.pointLight.intensity = this.isSuperLit ? 2.5 : 0.6;
        }
      }
    }
  }

  resolveCollision(ball) {
    const diff = ball.pos.clone().sub(this.pos);
    const distSq = diff.lengthSq();
    const minDist = this.radius + ball.radius;

    if (distSq < minDist * minDist && distSq > 1e-8) {
      const dist = Math.sqrt(distSq);
      const normal = diff.clone().divideScalar(dist);

      // Prevent ball penetration
      const penetration = minDist - dist;
      ball.pos.addScaled(normal, penetration + 0.1);

      // Williams pop bumper solenoid kick:
      // Strong radial outward kick
      const kickSpeed = this.isSuperLit ? this.kickStrength * 1.3 : this.kickStrength;
      ball.vel = normal.clone().multiplyScalar(kickSpeed);

      this.flashTimer = 0.15; // 150ms bright flash
      if (this.pointLight) {
        this.pointLight.intensity = 8.0;
      }

      const score = this.isSuperLit ? this.points * 5 : this.points;
      if (this.onHit) {
        this.onHit(this, score);
      }
      return true;
    }
    return false;
  }
}

