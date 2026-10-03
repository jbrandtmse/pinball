import { Vector2D } from './Vector2D.js';

/**
 * Ball - Physical pinball representation
 * Standard steel ball: 1-1/16" (27mm diameter -> 13.5mm radius), 80g mass.
 */
export class Ball {
  constructor(id = 1, x = 0, y = 0, radius = 13.5) {
    this.id = id;
    this.pos = new Vector2D(x, y);
    this.prevPos = new Vector2D(x, y);
    this.vel = new Vector2D(0, 0);
    this.radius = radius;
    this.mass = 0.080; // kg
    this.z = 0;        // Height above playfield surface (0 = on surface)
    this.vz = 0;       // Vertical velocity
    this.spin = 0;     // Angular roll spin
    
    // States: 'ACTIVE', 'IN_PLUNGER', 'IN_RAMP', 'LOCKED', 'DRAINED'
    this.state = 'IN_PLUNGER';
    this.rampRef = null;
    this.rampProgress = 0;
    this.rampSpeed = 0;

    // For rendering
    this.mesh = null;
    this.active = true;
  }

  reset(x, y) {
    this.pos.set(x, y);
    this.prevPos.set(x, y);
    this.vel.set(0, 0);
    this.z = 0;
    this.vz = 0;
    this.spin = 0;
    this.state = 'IN_PLUNGER';
    this.rampRef = null;
    this.rampProgress = 0;
    this.rampSpeed = 0;
    this.active = true;
    if (this.mesh) {
      this.mesh.visible = true;
    }
  }

  applyForce(fx, fy, dt) {
    this.vel.x += (fx / this.mass) * dt;
    this.vel.y += (fy / this.mass) * dt;
  }

  applyImpulse(ix, iy) {
    this.vel.x += ix / this.mass;
    this.vel.y += iy / this.mass;
  }
}

