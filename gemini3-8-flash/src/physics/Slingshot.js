import { Vector2D } from './Vector2D.js';

/**
 * Slingshot - Williams Active Triangular Slingshot Kicker
 * Detects leaf-switch closure and fires a powerful solenoid kick across the playfield
 */
export class Slingshot {
  constructor(x1, y1, x2, y2, options = {}) {
    this.name = options.name || 'slingshot';
    this.p1 = new Vector2D(x1, y1);
    this.p2 = new Vector2D(x2, y2);
    this.kickStrength = options.kickStrength ?? 1650.0; // mm/s
    this.points = options.points ?? 500;

    this.edge = this.p2.clone().sub(this.p1);
    this.len = this.edge.length();
    this.unitEdge = this.len > 0 ? this.edge.clone().divideScalar(this.len) : new Vector2D(1, 0);
    // Slingshot kicker normal points into the playfield
    this.normal = options.normal 
      ? new Vector2D(options.normal.x, options.normal.y).normalize() 
      : new Vector2D(-this.unitEdge.y, this.unitEdge.x);

    this.flashTimer = 0;
    this.mesh = null;
    this.pointLight = null;

    this.onHit = options.onHit || null;
  }

  update(dt) {
    if (this.flashTimer > 0) {
      this.flashTimer -= dt;
      if (this.flashTimer <= 0) {
        this.flashTimer = 0;
        if (this.pointLight) this.pointLight.intensity = 0.5;
      }
    }
  }

  closestPoint(p) {
    const v = p.clone().sub(this.p1);
    let t = v.dot(this.unitEdge);
    t = Math.max(0, Math.min(this.len, t));
    return this.p1.clone().addScaled(this.unitEdge, t);
  }

  resolveCollision(ball) {
    const closest = this.closestPoint(ball.pos);
    const diff = ball.pos.clone().sub(closest);
    const distSq = diff.lengthSq();
    const minDist = ball.radius + 4.0; // rubber band thickness offset

    if (distSq < minDist * minDist) {
      const dist = Math.sqrt(distSq);
      const normal = dist > 1e-6 ? diff.clone().divideScalar(dist) : this.normal.clone();

      // Only kick if ball is approaching the slingshot surface
      const vDotN = ball.vel.dot(this.normal);
      if (vDotN < 0) {
        // Prevent penetration
        const penetration = minDist - dist;
        ball.pos.addScaled(this.normal, penetration + 0.1);

        // Active solenoid kick
        const kickSpeed = this.kickStrength;
        ball.vel = this.normal.clone().multiplyScalar(kickSpeed);

        this.flashTimer = 0.12;
        if (this.pointLight) this.pointLight.intensity = 6.0;

        if (this.onHit) {
          this.onHit(this, this.points);
        }
        return true;
      }
    }
    return false;
  }
}

