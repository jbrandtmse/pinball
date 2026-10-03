import { Vector2D } from './Vector2D.js';

/**
 * Ramp - Williams Elevated Ramp with 3D Wireform Habitrail
 * Handles entrance detection, velocity threshold, 3D spline trajectory, and inlane delivery
 */
export class Ramp {
  constructor(options = {}) {
    this.name = options.name || 'left_ramp';
    this.entrancePos = new Vector2D(options.entranceX ?? 100, options.entranceY ?? 400);
    this.entranceWidth = options.entranceWidth ?? 38.0;
    this.minSpeed = options.minSpeed ?? 800.0; // mm/s needed to make the ramp
    this.points = options.points ?? 100000;
    this.isJackpotLit = false;

    // Entrance bounding box for trigger
    this.entranceDir = new Vector2D(options.dirX ?? 0, options.dirY ?? -1).normalize();
    this.entrancePerp = new Vector2D(-this.entranceDir.y, this.entranceDir.x);

    // 3D Path points [x, y, z] for spline traversal
    // z is height above playfield (0 to 65mm)
    this.pathPoints = options.pathPoints || [];
    this.totalPathLength = this.calculatePathLength();

    // Visual meshes
    this.rampMesh = null;
    this.wireformMesh = null;

    // Callbacks
    this.onEnter = options.onEnter || null;
    this.onComplete = options.onComplete || null;
    this.onFail = options.onFail || null;
  }

  calculatePathLength() {
    let len = 0;
    for (let i = 0; i < this.pathPoints.length - 1; i++) {
      const p1 = this.pathPoints[i];
      const p2 = this.pathPoints[i + 1];
      const dx = p2[0] - p1[0];
      const dy = p2[1] - p1[1];
      const dz = p2[2] - p1[2];
      len += Math.sqrt(dx * dx + dy * dy + dz * dz);
    }
    return len > 0 ? len : 500;
  }

  // Sample position and height along 3D path at normalized progress [0, 1]
  samplePath(progress) {
    if (this.pathPoints.length < 2) {
      return { x: this.entrancePos.x, y: this.entrancePos.y, z: 0 };
    }

    const t = Math.max(0, Math.min(1, progress));
    const targetDist = t * this.totalPathLength;

    let accumulated = 0;
    for (let i = 0; i < this.pathPoints.length - 1; i++) {
      const p1 = this.pathPoints[i];
      const p2 = this.pathPoints[i + 1];
      const dx = p2[0] - p1[0];
      const dy = p2[1] - p1[1];
      const dz = p2[2] - p1[2];
      const segmentLen = Math.sqrt(dx * dx + dy * dy + dz * dz);

      if (accumulated + segmentLen >= targetDist || i === this.pathPoints.length - 2) {
        const segT = segmentLen > 0 ? (targetDist - accumulated) / segmentLen : 0;
        return {
          x: p1[0] + dx * segT,
          y: p1[1] + dy * segT,
          z: p1[2] + dz * segT
        };
      }
      accumulated += segmentLen;
    }
    const last = this.pathPoints[this.pathPoints.length - 1];
    return { x: last[0], y: last[1], z: last[2] };
  }

  checkEntrance(ball) {
    if (ball.state !== 'ACTIVE' || ball.z > 5) return false;

    // Check distance to entrance
    const diff = ball.pos.clone().sub(this.entrancePos);
    const perpDist = Math.abs(diff.dot(this.entrancePerp));
    const forwardDist = diff.dot(this.entranceDir);

    if (perpDist < this.entranceWidth / 2 && forwardDist >= -12 && forwardDist <= 12) {
      // Check forward velocity
      const forwardVel = ball.vel.dot(this.entranceDir);
      if (forwardVel > 0) {
        if (forwardVel >= this.minSpeed) {
          // Ramp made!
          ball.state = 'IN_RAMP';
          ball.rampRef = this;
          ball.rampProgress = 0;
          ball.rampSpeed = Math.max(forwardVel, 900);

          if (this.onEnter) {
            this.onEnter(this, ball);
          }
          return true;
        } else {
          // Weak shot: ball rolls back down
          ball.vel.reflect(this.entranceDir);
          ball.vel.multiplyScalar(0.4);
          if (this.onFail) {
            this.onFail(this, ball);
          }
          return false;
        }
      }
    }
    return false;
  }

  updateBallInRamp(ball, dt) {
    if (ball.rampRef !== this) return;

    // Traverse along wireform habitrail
    const distStep = ball.rampSpeed * dt;
    ball.rampProgress += distStep / this.totalPathLength;

    if (ball.rampProgress >= 1.0) {
      // Ball reached exit of wireform (drops into inlane)
      const exitPoint = this.pathPoints[this.pathPoints.length - 1];
      ball.pos.set(exitPoint[0], exitPoint[1]);
      ball.z = 0;
      ball.vz = 0;
      ball.state = 'ACTIVE';
      ball.rampRef = null;
      ball.rampProgress = 0;

      // Downward velocity feeding into inlane
      ball.vel.set(0, 450);

      if (this.onComplete) {
        this.onComplete(this, ball);
      }
    } else {
      // Update 3D position
      const p = this.samplePath(ball.rampProgress);
      ball.pos.set(p.x, p.y);
      ball.z = p.z;
    }
  }
}

