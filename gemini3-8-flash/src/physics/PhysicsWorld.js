import { Vector2D } from './Vector2D.js';
import { Ball } from './Ball.js';
import { LineSegmentCollider, CircleCollider } from './Collider.js';
import { Flipper } from './Flipper.js';
import { Bumper } from './Bumper.js';
import { Slingshot } from './Slingshot.js';
import { DropTargetBank } from './DropTargetBank.js';
import { Ramp } from './Ramp.js';
import { Scoop } from './Scoop.js';
import { Plunger } from './Plunger.js';

/**
 * PhysicsWorld - 600 Hz Continuous Collision Detection Pinball Engine
 * Models standard Williams playfield dimensions (520mm x 1160mm) at 6.5° pitch angle.
 */
export class PhysicsWorld {
  constructor() {
    this.width = 520.0;
    this.height = 1160.0;

    // Williams 6.5 degree incline
    // g = 9810 mm/s^2 * sin(6.5 deg) ~ 1110 mm/s^2 down playfield
    this.gravity = new Vector2D(0, 1115.0);
    this.drag = 0.08; // Rolling resistance

    // Timestep configuration: 600 Hz (10 substeps per 60fps frame)
    this.substeps = 10;

    // Simulation collections
    this.balls = [];
    this.colliders = [];
    this.posts = [];
    this.rollovers = []; // Sensor trigger zones

    // Table active components
    this.leftFlipper = null;
    this.rightFlipper = null;
    this.bumpers = [];
    this.slingshots = [];
    this.dropTargets = null;
    this.leftRamp = null;
    this.rightRamp = null;
    this.scoop = null;
    this.plunger = null;

    // Callbacks
    this.onBallDrain = null;
    this.onRollover = null;
    this.onSoundEffect = null;

    this.initTable();
  }

  initTable() {
    // 1. Plunger setup
    this.plunger = new Plunger({
      x: 498,
      y: 1060,
      onLaunch: (power) => {
        if (this.onSoundEffect) this.onSoundEffect('plunger_release', power);
      }
    });

    // 2. Flippers (Williams 3" flippers)
    this.leftFlipper = new Flipper({
      name: 'left_flipper',
      isLeft: true,
      x: 182,
      y: 990,
      length: 74,
      onSolenoidFire: () => {
        if (this.onSoundEffect) this.onSoundEffect('flipper_up');
      },
      onSolenoidRelease: () => {
        if (this.onSoundEffect) this.onSoundEffect('flipper_down');
      },
      onHit: (ball, impulse) => {
        if (this.onSoundEffect) this.onSoundEffect('flipper_hit', impulse);
      }
    });

    this.rightFlipper = new Flipper({
      name: 'right_flipper',
      isLeft: false,
      x: 328,
      y: 990,
      length: 74,
      onSolenoidFire: () => {
        if (this.onSoundEffect) this.onSoundEffect('flipper_up');
      },
      onSolenoidRelease: () => {
        if (this.onSoundEffect) this.onSoundEffect('flipper_down');
      },
      onHit: (ball, impulse) => {
        if (this.onSoundEffect) this.onSoundEffect('flipper_hit', impulse);
      }
    });

    // 3. Pop Bumpers (Turbines)
    const b1 = new Bumper({
      name: 'turbine_top',
      x: 255,
      y: 280,
      radius: 28,
      onHit: (b, pts) => {
        if (this.onSoundEffect) this.onSoundEffect('bumper_hit');
      }
    });
    const b2 = new Bumper({
      name: 'turbine_left',
      x: 185,
      y: 360,
      radius: 28,
      onHit: (b, pts) => {
        if (this.onSoundEffect) this.onSoundEffect('bumper_hit');
      }
    });
    const b3 = new Bumper({
      name: 'turbine_right',
      x: 325,
      y: 360,
      radius: 28,
      onHit: (b, pts) => {
        if (this.onSoundEffect) this.onSoundEffect('bumper_hit');
      }
    });
    this.bumpers = [b1, b2, b3];

    // 4. Slingshots (Twin Triangular Kickers)
    this.slingshots = [
      new Slingshot(125, 840, 155, 930, {
        name: 'left_slingshot',
        normal: { x: 0.85, y: -0.52 },
        onHit: () => {
          if (this.onSoundEffect) this.onSoundEffect('slingshot');
        }
      }),
      new Slingshot(385, 840, 355, 930, {
        name: 'right_slingshot',
        normal: { x: -0.85, y: -0.52 },
        onHit: () => {
          if (this.onSoundEffect) this.onSoundEffect('slingshot');
        }
      })
    ];

    // 5. Drop Targets (3-Bank Coolant Rods)
    this.dropTargets = new DropTargetBank({
      name: 'coolant_bank',
      startX: 65,
      startY: 470,
      spacing: 28,
      width: 22,
      angle: 0.38,
      onTargetHit: () => {
        if (this.onSoundEffect) this.onSoundEffect('target_hit');
      },
      onBankComplete: () => {
        if (this.onSoundEffect) this.onSoundEffect('bank_reset');
      }
    });

    // 6. Center Scoop (Reactor Core Saucer)
    this.scoop = new Scoop({
      name: 'core_scoop',
      x: 255,
      y: 520,
      radius: 20,
      ejectDirX: 0.1,
      ejectDirY: 1.0,
      onBallCaptured: () => {
        if (this.onSoundEffect) this.onSoundEffect('scoop_capture');
      },
      onBallEjected: () => {
        if (this.onSoundEffect) this.onSoundEffect('scoop_eject');
      }
    });

    // 7. Ramps
    // Left Ramp: Particle Accelerator -> Feeds Right Inlane Wireform
    this.leftRamp = new Ramp({
      name: 'left_ramp',
      entranceX: 130,
      entranceY: 420,
      dirX: 0.25,
      dirY: -0.96,
      entranceWidth: 42,
      minSpeed: 750,
      pathPoints: [
        [130, 420, 0],
        [138, 290, 35],
        [150, 160, 55],
        [220, 80, 65],
        [320, 80, 65],
        [410, 180, 55],
        [430, 400, 45],
        [430, 650, 35],
        [395, 830, 20],
        [375, 910, 0] // Drops into right inlane
      ],
      onEnter: () => {
        if (this.onSoundEffect) this.onSoundEffect('ramp_enter');
      },
      onComplete: () => {
        if (this.onSoundEffect) this.onSoundEffect('ramp_exit');
      },
      onFail: () => {
        if (this.onSoundEffect) this.onSoundEffect('ramp_fail');
      }
    });

    // Right Ramp: Cryo Loop -> Feeds Left Inlane Wireform
    this.rightRamp = new Ramp({
      name: 'right_ramp',
      entranceX: 380,
      entranceY: 420,
      dirX: -0.25,
      dirY: -0.96,
      entranceWidth: 42,
      minSpeed: 750,
      pathPoints: [
        [380, 420, 0],
        [372, 290, 35],
        [360, 160, 55],
        [290, 95, 62],
        [190, 95, 62],
        [100, 180, 52],
        [80, 400, 42],
        [80, 650, 32],
        [115, 830, 18],
        [135, 910, 0] // Drops into left inlane
      ],
      onEnter: () => {
        if (this.onSoundEffect) this.onSoundEffect('ramp_enter');
      },
      onComplete: () => {
        if (this.onSoundEffect) this.onSoundEffect('ramp_exit');
      },
      onFail: () => {
        if (this.onSoundEffect) this.onSoundEffect('ramp_fail');
      }
    });

    // 8. Static Walls & Boundary Colliders
    this.buildPlayfieldGeometry();

    // 9. Sensor Rollovers
    this.buildRollovers();
  }

  buildPlayfieldGeometry() {
    const C = (x1, y1, x2, y2, opt) => new LineSegmentCollider(x1, y1, x2, y2, opt);
    const P = (x, y, r, opt) => new CircleCollider(x, y, r, opt);

    // Left Wall
    this.colliders.push(C(24, 180, 24, 820, { restitution: 0.6, name: 'left_wall' }));

    // Right Wall (shooter lane outer)
    this.colliders.push(C(516, 180, 516, 1140, { restitution: 0.6, name: 'right_outer_wall' }));

    // Shooter Lane Divider
    this.colliders.push(C(478, 250, 478, 1140, { restitution: 0.6, name: 'shooter_divider' }));

    // Bottom Wall / Apron
    this.colliders.push(C(24, 1140, 516, 1140, { restitution: 0.4, name: 'bottom_wall' }));

    // Top Curved Arch (curved perimeter approximating arch with 8 segments)
    const archPoints = [];
    const archCenter = { x: 270, y: 180 };
    const archRadius = 246;
    const numArchSteps = 10;
    for (let i = 0; i <= numArchSteps; i++) {
      const angle = Math.PI + (i / numArchSteps) * Math.PI; // pi to 2pi (top half)
      archPoints.push({
        x: archCenter.x + Math.cos(angle) * archRadius,
        y: archCenter.y + Math.sin(angle) * 150
      });
    }
    for (let i = 0; i < archPoints.length - 1; i++) {
      this.colliders.push(C(archPoints[i].x, archPoints[i].y, archPoints[i + 1].x, archPoints[i + 1].y, {
        restitution: 0.7,
        name: `top_arch_${i}`
      }));
    }

    // Shooter Lane One-Way Gate at top right (allows ball to exit into playfield, blocks returning)
    this.colliders.push(C(478, 220, 516, 220, {
      restitution: 0.4,
      isOneWay: true,
      name: 'shooter_gate'
    }));

    // Inlanes and Outlanes Geometry
    // Left Inlane/Outlane divider guide
    this.colliders.push(C(72, 800, 72, 940, { restitution: 0.65, name: 'left_lane_divider' }));
    // Left Inlane wire guide
    this.colliders.push(C(118, 800, 118, 930, { restitution: 0.65, name: 'left_inlane_guide' }));
    // Left bottom return feed to flipper
    this.colliders.push(C(118, 930, 172, 985, { restitution: 0.65, name: 'left_flipper_guide' }));
    // Left outlane outer guide leading to drain
    this.colliders.push(C(24, 820, 60, 960, { restitution: 0.65, name: 'left_outlane_wall' }));
    this.colliders.push(C(60, 960, 120, 1080, { restitution: 0.4, name: 'left_drain_guide' }));

    // Right Inlane/Outlane divider guide
    this.colliders.push(C(438, 800, 438, 940, { restitution: 0.65, name: 'right_lane_divider' }));
    // Right Inlane wire guide
    this.colliders.push(C(392, 800, 392, 930, { restitution: 0.65, name: 'right_inlane_guide' }));
    // Right bottom return feed to flipper
    this.colliders.push(C(392, 930, 338, 985, { restitution: 0.65, name: 'right_flipper_guide' }));
    // Right outlane outer guide
    this.colliders.push(C(478, 820, 450, 960, { restitution: 0.65, name: 'right_outlane_wall' }));
    this.colliders.push(C(450, 960, 390, 1080, { restitution: 0.4, name: 'right_drain_guide' }));

    // Upper Orbit & Top Lane Guides
    // Top Rollover Lane Dividers (C - O - R - E lanes: 4 lanes, 3 divider guides)
    // Lanes at x: [170, 210], [210, 250], [250, 290], [290, 330]
    this.colliders.push(C(205, 120, 205, 200, { restitution: 0.6, name: 'lane_divider_1' }));
    this.colliders.push(C(250, 120, 250, 200, { restitution: 0.6, name: 'lane_divider_2' }));
    this.colliders.push(C(295, 120, 295, 200, { restitution: 0.6, name: 'lane_divider_3' }));

    // Left Orbit Guide
    this.colliders.push(C(60, 220, 150, 125, { restitution: 0.65, name: 'left_orbit_guide' }));
    // Right Orbit Guide
    this.colliders.push(C(350, 125, 440, 220, { restitution: 0.65, name: 'right_orbit_guide' }));

    // Protective Posts with Rubber Rings
    this.posts.push(P(165, 120, 5, { restitution: 0.8, name: 'post_lane_1' }));
    this.posts.push(P(205, 120, 5, { restitution: 0.8, name: 'post_lane_2' }));
    this.posts.push(P(250, 120, 5, { restitution: 0.8, name: 'post_lane_3' }));
    this.posts.push(P(295, 120, 5, { restitution: 0.8, name: 'post_lane_4' }));
    this.posts.push(P(335, 120, 5, { restitution: 0.8, name: 'post_lane_5' }));

    // Flipper return posts
    this.posts.push(P(172, 985, 4.5, { restitution: 0.85, name: 'left_flipper_post' }));
    this.posts.push(P(338, 985, 4.5, { restitution: 0.85, name: 'right_flipper_post' }));

    // Outlane entrance posts
    this.posts.push(P(72, 800, 5, { restitution: 0.85, name: 'left_outlane_post' }));
    this.posts.push(P(438, 800, 5, { restitution: 0.85, name: 'right_outlane_post' }));
  }

  buildRollovers() {
    // Top Lanes: C - O - R - E
    const topLanes = [
      { id: 'lane_C', x: 187, y: 155, r: 16, label: 'C' },
      { id: 'lane_O', x: 227, y: 155, r: 16, label: 'O' },
      { id: 'lane_R', x: 272, y: 155, r: 16, label: 'R' },
      { id: 'lane_E', x: 315, y: 155, r: 16, label: 'E' }
    ];

    // Inlanes & Outlanes
    const returnLanes = [
      { id: 'outlane_left', x: 48, y: 880, r: 18, label: 'KICKBACK' },
      { id: 'inlane_left', x: 95, y: 880, r: 18, label: 'INLANE_L' },
      { id: 'inlane_right', x: 415, y: 880, r: 18, label: 'INLANE_R' },
      { id: 'outlane_right', x: 460, y: 880, r: 18, label: 'OUTLANE_R' }
    ];

    this.rollovers = [...topLanes, ...returnLanes];
  }

  spawnBall(id = 1) {
    let ball = this.balls.find(b => b.id === id);
    if (!ball) {
      ball = new Ball(id, this.plunger.restPos.x, this.plunger.restPos.y);
      this.balls.push(ball);
    } else {
      ball.reset(this.plunger.restPos.x, this.plunger.restPos.y);
    }
    return ball;
  }

  update(dt) {
    // Substep simulation for rock-solid continuous collision detection
    const subDt = dt / this.substeps;

    // Update active components
    this.leftFlipper.update(dt);
    this.rightFlipper.update(dt);
    for (const b of this.bumpers) b.update(dt);
    for (const s of this.slingshots) s.update(dt);
    this.dropTargets.update(dt);
    this.scoop.update(dt);

    const plungerBall = this.balls.find(b => b.state === 'IN_PLUNGER');
    this.plunger.update(dt, plungerBall);

    for (let step = 0; step < this.substeps; step++) {
      this.stepPhysics(subDt);
    }

    // Clean up drained balls
    this.checkDrains();
  }

  stepPhysics(dt) {
    // 1. Update ball movement and apply forces
    for (const ball of this.balls) {
      if (!ball.active) continue;

      if (ball.state === 'IN_RAMP') {
        if (ball.rampRef) {
          ball.rampRef.updateBallInRamp(ball, dt);
        }
        continue;
      }

      if (ball.state === 'LOCKED' || ball.state === 'DRAINED') {
        continue;
      }

      if (ball.state === 'IN_PLUNGER') {
        ball.vel.set(0, 0);
        continue;
      }

      // Ball in active play: apply gravity along incline + rolling drag
      ball.vel.addScaled(this.gravity, dt);
      ball.vel.multiplyScalar(Math.max(0, 1 - this.drag * dt));

      // Velocity cap to prevent any wild spikes
      const speed = ball.vel.length();
      const maxSpeed = 3800.0; // mm/s
      if (speed > maxSpeed) {
        ball.vel.multiplyScalar(maxSpeed / speed);
      }

      ball.prevPos.copy(ball.pos);
      ball.pos.addScaled(ball.vel, dt);

      // Check collision with flippers
      this.leftFlipper.resolveCollision(ball);
      this.rightFlipper.resolveCollision(ball);

      // Check collision with pop bumpers
      for (const bumper of this.bumpers) {
        bumper.resolveCollision(ball);
      }

      // Check collision with slingshots
      for (const slingshot of this.slingshots) {
        slingshot.resolveCollision(ball);
      }

      // Check collision with drop targets
      this.dropTargets.resolveCollision(ball);

      // Check ramp entrance triggers
      this.leftRamp.checkEntrance(ball);
      this.rightRamp.checkEntrance(ball);

      // Check scoop capture
      this.scoop.checkCapture(ball);

      // Check boundary colliders & posts
      for (const c of this.colliders) {
        c.resolveCollision(ball);
      }
      for (const p of this.posts) {
        p.resolveCollision(ball);
      }

      // Check rollovers
      this.checkRollovers(ball);
    }

    // 2. Ball-to-ball elastic collisions (multi-ball!)
    const activeBalls = this.balls.filter(b => b.state === 'ACTIVE' && b.z <= 5);
    for (let i = 0; i < activeBalls.length; i++) {
      for (let j = i + 1; j < activeBalls.length; j++) {
        this.resolveBallBallCollision(activeBalls[i], activeBalls[j]);
      }
    }
  }

  resolveBallBallCollision(b1, b2) {
    const diff = b2.pos.clone().sub(b1.pos);
    const distSq = diff.lengthSq();
    const minDist = b1.radius + b2.radius;

    if (distSq < minDist * minDist && distSq > 1e-8) {
      const dist = Math.sqrt(distSq);
      const normal = diff.clone().divideScalar(dist);

      // Relative velocity along normal
      const vRel = b1.vel.clone().sub(b2.vel);
      const vRelDotN = vRel.dot(normal);

      if (vRelDotN > 0) {
        // Prevent penetration
        const penetration = minDist - dist;
        b1.pos.addScaled(normal, -penetration * 0.5);
        b2.pos.addScaled(normal, penetration * 0.5);

        // Elastic collision with steel ball restitution
        const restitution = 0.92;
        const impulse = (1 + restitution) * vRelDotN / 2;

        b1.vel.addScaled(normal, -impulse);
        b2.vel.addScaled(normal, impulse);

        if (this.onSoundEffect) {
          this.onSoundEffect('ball_hit_ball', Math.min(1.0, vRelDotN / 1000));
        }
      }
    }
  }

  checkRollovers(ball) {
    for (const r of this.rollovers) {
      const distSq = ball.pos.distanceSqTo(r);
      const triggerRadius = r.r + ball.radius * 0.5;
      if (distSq < triggerRadius * triggerRadius) {
        if (this.onRollover) {
          this.onRollover(r, ball);
        }
      }
    }
  }

  checkDrains() {
    for (const ball of this.balls) {
      if (ball.state === 'ACTIVE' && ball.pos.y > 1060 && ball.pos.x < 460) {
        // Ball has dropped below flippers into drain trough
        ball.state = 'DRAINED';
        ball.vel.set(0, 0);
        if (this.onBallDrain) {
          this.onBallDrain(ball);
        }
      }
    }
  }
}
