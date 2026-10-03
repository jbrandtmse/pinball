import { Vector2D } from './Vector2D.js';

/**
 * SingleDropTarget - Individual drop target
 */
class SingleDropTarget {
  constructor(x, y, width, angle, name) {
    this.name = name;
    this.pos = new Vector2D(x, y);
    this.width = width;
    this.angle = angle; // target face angle
    this.isDropped = false;
    this.mesh = null;

    // Normal vector pointing away from target face
    const dir = new Vector2D(Math.cos(angle), Math.sin(angle));
    this.p1 = this.pos.clone().addScaled(dir, -width / 2);
    this.p2 = this.pos.clone().addScaled(dir, width / 2);
    this.edge = this.p2.clone().sub(this.p1);
    this.len = width;
    this.normal = new Vector2D(-dir.y, dir.x);
  }

  closestPoint(p) {
    const v = p.clone().sub(this.p1);
    const dir = this.edge.clone().divideScalar(this.len);
    let t = v.dot(dir);
    t = Math.max(0, Math.min(this.len, t));
    return this.p1.clone().addScaled(dir, t);
  }

  resolveCollision(ball) {
    if (this.isDropped) return false;

    const closest = this.closestPoint(ball.pos);
    const diff = ball.pos.clone().sub(closest);
    const distSq = diff.lengthSq();
    const minDist = ball.radius + 3.0;

    if (distSq < minDist * minDist) {
      const dist = Math.sqrt(distSq);
      const normal = dist > 1e-6 ? diff.clone().divideScalar(dist) : this.normal.clone();

      const vDotN = ball.vel.dot(normal);
      if (vDotN < 0) {
        // Drop the target!
        this.isDropped = true;

        // Rebound ball with dampening
        ball.pos.addScaled(normal, (minDist - dist) + 0.1);
        const vn = normal.clone().multiplyScalar(vDotN);
        const vt = ball.vel.clone().sub(vn);
        ball.vel = vt.multiplyScalar(0.9).sub(vn.multiplyScalar(0.45));

        return true;
      }
    }
    return false;
  }
}

/**
 * DropTargetBank - 3-Bank Coolant Drop Targets
 */
export class DropTargetBank {
  constructor(options = {}) {
    this.name = options.name || 'coolant_bank';
    this.targets = [];
    this.resetTimer = 0;
    this.resetDelay = 1.2; // seconds before resetting bank
    this.onTargetHit = options.onTargetHit || null;
    this.onBankComplete = options.onBankComplete || null;

    const startX = options.startX ?? 90;
    const startY = options.startY ?? 450;
    const spacing = options.spacing ?? 26;
    const width = options.width ?? 22;
    const angle = options.angle ?? 0.35; // slight angle along left wall

    for (let i = 0; i < 3; i++) {
      const tx = startX + Math.cos(angle + Math.PI / 2) * (i * spacing);
      const ty = startY + Math.sin(angle + Math.PI / 2) * (i * spacing);
      const target = new SingleDropTarget(tx, ty, width, angle, `coolant_${i + 1}`);
      this.targets.push(target);
    }
  }

  update(dt) {
    if (this.resetTimer > 0) {
      this.resetTimer -= dt;
      if (this.resetTimer <= 0) {
        this.resetTargets();
      }
    }
  }

  resetTargets() {
    for (const t of this.targets) {
      t.isDropped = false;
    }
    this.resetTimer = 0;
  }

  resolveCollision(ball) {
    let hit = false;
    for (const target of this.targets) {
      if (!target.isDropped && target.resolveCollision(ball)) {
        hit = true;
        if (this.onTargetHit) {
          this.onTargetHit(target, 25000);
        }

        // Check if all targets in bank are down
        const allDropped = this.targets.every(t => t.isDropped);
        if (allDropped) {
          this.resetTimer = this.resetDelay;
          if (this.onBankComplete) {
            this.onBankComplete(this, 250000);
          }
        }
        break;
      }
    }
    return hit;
  }
}

