import { Vector2D } from './Vector2D.js';

/**
 * LineSegmentCollider - Playfield walls, rails, lane dividers, rubber bands
 */
export class LineSegmentCollider {
  constructor(x1, y1, x2, y2, options = {}) {
    this.p1 = new Vector2D(x1, y1);
    this.p2 = new Vector2D(x2, y2);
    this.restitution = options.restitution ?? 0.55;
    this.friction = options.friction ?? 0.05;
    this.name = options.name ?? 'wall';
    this.material = options.material ?? 'metal'; // 'metal', 'rubber', 'wood', 'plastic'
    this.isOneWay = options.isOneWay ?? false; // Allows balls to pass from one side
    this.triggerOnly = options.triggerOnly ?? false;
    this.onHit = options.onHit ?? null;

    // Precompute normal and length
    this.edge = this.p2.clone().sub(this.p1);
    this.len = this.edge.length();
    this.unitEdge = this.len > 0 ? this.edge.clone().divideScalar(this.len) : new Vector2D(1, 0);
    // Normal pointing outward (left of edge direction)
    this.normal = new Vector2D(-this.unitEdge.y, this.unitEdge.x);
  }

  // Find closest point on line segment to a point P
  closestPoint(p) {
    const v = p.clone().sub(this.p1);
    let t = v.dot(this.unitEdge);
    t = Math.max(0, Math.min(this.len, t));
    return this.p1.clone().addScaled(this.unitEdge, t);
  }

  // Resolve collision with Ball
  resolveCollision(ball) {
    if (this.triggerOnly) return false;

    // Check distance from ball position to segment
    const closest = this.closestPoint(ball.pos);
    const diff = ball.pos.clone().sub(closest);
    const distSq = diff.lengthSq();
    const minDist = ball.radius;

    if (distSq < minDist * minDist) {
      const dist = Math.sqrt(distSq);
      let normal;

      if (dist > 1e-6) {
        normal = diff.clone().divideScalar(dist);
      } else {
        normal = this.normal.clone();
      }

      // Check one-way constraint if enabled
      if (this.isOneWay) {
        if (ball.vel.dot(this.normal) < 0) {
          return false; // Ball pushing through one-way gate
        }
      }

      // Check if moving towards the collider
      const vDotN = ball.vel.dot(normal);
      if (vDotN < 0) {
        // Position correction to prevent penetration
        const penetration = minDist - dist;
        ball.pos.addScaled(normal, penetration + 0.05);

        // Calculate rebound velocity
        const restitution = this.restitution;
        const friction = this.friction;

        // Normal and tangential velocity components
        const vn = normal.clone().multiplyScalar(vDotN);
        const vt = ball.vel.clone().sub(vn);

        ball.vel = vt.multiplyScalar(1 - friction).sub(vn.multiplyScalar(restitution));

        if (this.onHit) {
          this.onHit(ball, Math.abs(vDotN));
        }
        return true;
      }
    }
    return false;
  }
}

/**
 * CircleCollider - Posts, round rubber bumpers, circular guides
 */
export class CircleCollider {
  constructor(x, y, radius, options = {}) {
    this.center = new Vector2D(x, y);
    this.radius = radius;
    this.restitution = options.restitution ?? 0.65;
    this.friction = options.friction ?? 0.05;
    this.name = options.name ?? 'post';
    this.material = options.material ?? 'rubber';
    this.onHit = options.onHit ?? null;
    this.triggerOnly = options.triggerOnly ?? false;
  }

  resolveCollision(ball) {
    if (this.triggerOnly) return false;

    const diff = ball.pos.clone().sub(this.center);
    const distSq = diff.lengthSq();
    const minDist = this.radius + ball.radius;

    if (distSq < minDist * minDist && distSq > 1e-8) {
      const dist = Math.sqrt(distSq);
      const normal = diff.clone().divideScalar(dist);
      const vDotN = ball.vel.dot(normal);

      if (vDotN < 0) {
        const penetration = minDist - dist;
        ball.pos.addScaled(normal, penetration + 0.05);

        const vn = normal.clone().multiplyScalar(vDotN);
        const vt = ball.vel.clone().sub(vn);

        ball.vel = vt.multiplyScalar(1 - this.friction).sub(vn.multiplyScalar(this.restitution));

        if (this.onHit) {
          this.onHit(ball, Math.abs(vDotN));
        }
        return true;
      }
    }
    return false;
  }
}
