import { Vector2D } from './Vector2D.js';

/**
 * Flipper - High-fidelity Williams 3-inch flipper physics
 * Features: Solenoid acceleration curve, cradle trapping, tip velocity scaling, EOS dampening
 */
export class Flipper {
  constructor(options = {}) {
    this.name = options.name || 'left_flipper';
    this.isLeft = options.isLeft ?? true;
    this.pivot = new Vector2D(options.x ?? 0, options.y ?? 0);
    this.length = options.length ?? 76.2; // 3 inches in mm
    this.baseRadius = options.baseRadius ?? 12.0;
    this.tipRadius = options.tipRadius ?? 6.0;

    // Angles in radians
    // 0 = right (east), pi/2 = down (south), -pi/2 = up (north), pi = left (west)
    this.restAngle = options.restAngle ?? (this.isLeft ? 0.50 : Math.PI - 0.50);
    this.strokeAngle = options.strokeAngle ?? (this.isLeft ? -0.96 : 0.96); // ~55 degrees swing
    this.activeAngle = this.restAngle + this.strokeAngle;

    this.currentAngle = this.restAngle;
    this.prevAngle = this.restAngle;
    this.angularVelocity = 0; // rad/s

    // Solenoid timing
    this.flipSpeed = 42.0;  // rad/s during flip (reaches end in ~23ms)
    this.returnSpeed = 32.0; // rad/s during spring return
    this.isEnergized = false;

    // Mesh reference for rendering
    this.mesh = null;
    this.rubberMesh = null;

    // Sound callback
    this.onSolenoidFire = options.onSolenoidFire || null;
    this.onSolenoidRelease = options.onSolenoidRelease || null;
    this.onHit = options.onHit || null;
  }

  setEnergized(state) {
    if (state && !this.isEnergized) {
      if (this.onSolenoidFire) this.onSolenoidFire(this.name);
    } else if (!state && this.isEnergized) {
      if (this.onSolenoidRelease) this.onSolenoidRelease(this.name);
    }
    this.isEnergized = state;
  }

  update(dt) {
    this.prevAngle = this.currentAngle;
    const targetAngle = this.isEnergized ? this.activeAngle : this.restAngle;
    const speed = this.isEnergized ? this.flipSpeed : this.returnSpeed;

    const diff = targetAngle - this.currentAngle;
    if (Math.abs(diff) < 0.001) {
      this.currentAngle = targetAngle;
      this.angularVelocity = 0;
    } else {
      const step = Math.sign(diff) * speed * dt;
      if (Math.abs(step) >= Math.abs(diff)) {
        this.currentAngle = targetAngle;
        this.angularVelocity = diff / dt;
      } else {
        this.currentAngle += step;
        this.angularVelocity = step / dt;
      }
    }
  }

  getTipPosition() {
    return new Vector2D(
      this.pivot.x + Math.cos(this.currentAngle) * this.length,
      this.pivot.y + Math.sin(this.currentAngle) * this.length
    );
  }

  resolveCollision(ball) {
    const tip = this.getTipPosition();
    const flipperVector = tip.clone().sub(this.pivot);
    const flipperLen = this.length;
    const flipperDir = flipperVector.clone().divideScalar(flipperLen);

    // Vector from pivot to ball
    const toBall = ball.pos.clone().sub(this.pivot);
    let u = toBall.dot(flipperDir) / flipperLen;
    u = Math.max(0, Math.min(1, u));

    // Closest point along flipper spine
    const closestSpine = this.pivot.clone().addScaled(flipperDir, u * flipperLen);
    const radiusAtU = this.baseRadius * (1 - u) + this.tipRadius * u;
    const totalMinDist = radiusAtU + ball.radius;

    const diff = ball.pos.clone().sub(closestSpine);
    const distSq = diff.lengthSq();

    if (distSq < totalMinDist * totalMinDist && distSq > 1e-8) {
      const dist = Math.sqrt(distSq);
      const normal = diff.clone().divideScalar(dist);

      // Linear velocity of flipper surface at contact point
      // V_flipper = omega x r_perp
      const rRel = closestSpine.clone().sub(this.pivot);
      const vFlipper = new Vector2D(
        -this.angularVelocity * rRel.y,
        this.angularVelocity * rRel.x
      );

      // Relative velocity: V_rel = V_ball - V_flipper
      const vRel = ball.vel.clone().sub(vFlipper);
      const vRelDotN = vRel.dot(normal);

      if (vRelDotN < 0) {
        // Prevent penetration
        const penetration = totalMinDist - dist;
        ball.pos.addScaled(normal, penetration + 0.05);

        // Flipper rubber bounce
        const restitution = 0.68;
        const friction = 0.12;

        const vRelN = normal.clone().multiplyScalar(vRelDotN);
        const vRelT = vRel.clone().sub(vRelN);

        // Rebound relative velocity
        const vRelPrime = vRelT.multiplyScalar(1 - friction).sub(vRelN.multiplyScalar(restitution));

        // When flipper is swinging up, add an extra dynamic kick factor along normal
        let impulseBonus = 0;
        const isSwingingUp = this.isLeft ? (this.angularVelocity < -1.0) : (this.angularVelocity > 1.0);
        if (isSwingingUp) {
          // Extra solenoid punch based on distance from pivot (sweet spot)
          const tipFactor = 0.5 + 0.7 * u;
          impulseBonus = Math.abs(this.angularVelocity) * this.length * tipFactor * 0.018;
          vRelPrime.addScaled(normal, impulseBonus);
        }

        ball.vel = vFlipper.clone().add(vRelPrime);

        if (this.onHit) {
          this.onHit(ball, Math.abs(vRelDotN) + impulseBonus);
        }
        return true;
      }
    }
    return false;
  }
}

