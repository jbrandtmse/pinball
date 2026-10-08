// Neon Quest Pinball - Williams-style arcade pinball
// Uses Matter.js for 2D physics and HTML5 Canvas for rendering

// Game constants
const WIDTH = 500;
const HEIGHT = 720;
const BALL_RADIUS = 9;
const FLIPPER_WIDTH = 75;
const FLIPPER_HEIGHT = 10;

// Williams-style score values
const SCORES = {
    bumper: 100,
    topBumper: 150,
    slingshot: 50,
    target: 25,
    ramp: 100,
    rollover: 10,
    diamond: 30,
    flipperHit: 50,
    jackpot: 500
};

// Theme colors - neon retro
const COLORS = {
    background: '#0a0a0f',
    playfield: '#1a1a2e',
    ball: '#ff6b6b',
    flipper: '#4ecdc4',
    bumper: '#ffe66d',
    target: '#ff6b9d',
    slingshot: '#95e1d3',
    ramp: '#f38181',
    text: '#0ff',
    jackpot: '#ff0',
    multiplier: '#0f0'
};

// Particle system for visual effects
class Particle {
    constructor(x, y, color) {
        this.x = x;
        this.y = y;
        this.vx = (Math.random() - 0.5) * 4;
        this.vy = (Math.random() - 0.5) * 4;
        this.life = 1.0;
        this.color = color;
        this.size = Math.random() * 3 + 1;
    }

    update() {
        this.x += this.vx;
        this.y += this.vy;
        this.vy += 0.1; // Gravity
        this.life -= 0.02;
    }

    draw(ctx) {
        ctx.globalAlpha = this.life;
        ctx.fillStyle = this.color;
        ctx.beginPath();
        ctx.arc(this.x, this.y, this.size, 0, 2 * Math.PI);
        ctx.fill();
        ctx.globalAlpha = 1.0;
    }
}

class PinballGame {
    constructor() {
        console.log('PinballGame constructor called');
        console.log('Matter object:', Matter);
        this.engine = Matter.Engine.create();
        this.world = this.engine.world;

        // Physics configuration for realistic pinball (CCD via sub-stepping)
        this.engine.gravity.y = 1.2;
        this.engine.timing.timeScale = 1;

        // Game state
        this.score = 0;
        this.ballsRemaining = 3;
        this.ball = null;
        this.storedBalls = [];
        this.lockedBalls = 0;
        this.flippers = { left: null, right: null };
        this.bumpers = [];
        this.targets = [];
        this.multiballActive = false;
        this.targetHits = new Set();
        this.currentBalls = 3;
        this.lockedBalls = 0;
        this.lockedBallPositions = [];
        this.lastKnownBall = null;

        // Ball save system (Williams-style)
        this.ballSaveActive = false;
        this.ballSaveTimer = null;
        this.ballSaveTime = 15; // 15 second ball save window (standard arcade timing)

        // Nudge/tilt system
        this.tiltCount = 0;
        this.maxTilts = 3;
        this.isTilted = false;

        // Combo and streak system
        this.comboStreak = 0;
        this.lastHitTime = 0;
        this.comboMultiplier = 1;
        this.currentMultiplier = 1;

        // Visual effects
        this.particles = [];
        this.scorePopups = [];
        this.attractMode = true;
        this.attractTimer = 0;
        this.attractBall = null;

        // Drop target state
        this.dropTargets = [];
        this.dropTargetHits = 0;
        this.dropTargetResetTimer = null;

        this.setupInput();
        this.createPlayfield();

        // Start game message with controls
        this.showMessage('NEON QUEST', 'Flippers: Arrows/Z-X | Launch: Space');

        // Start physics runner
        this.runner = Matter.Runner.create();
        Matter.Runner.run(this.runner, this.engine);

        // Start rendering
        this.render();

        // Ball monitoring with tighter interval for fast ball detection
        setInterval(() => this.updateBallState(), 30);
    }

    setupInput() {
        this.leftFlipperUp = false;
        this.rightFlipperUp = false;
        this.tiltCount = 0;
        this.maxTilts = 3;

        document.addEventListener('keydown', (e) => {
            switch(e.code) {
                case 'ArrowLeft':
                    this.leftFlipperUp = true;
                    this.updateFlipperAngles();
                    e.preventDefault();
                    break;
                case 'ArrowRight':
                    this.rightFlipperUp = true;
                    this.updateFlipperAngles();
                    e.preventDefault();
                    break;
                case 'KeyZ':
                    // Left flipper hold (for accessibility)
                    this.leftFlipperUp = true;
                    this.updateFlipperAngles();
                    e.preventDefault();
                    break;
                case 'KeyX':
                    // Right flipper hold (for accessibility)
                    this.rightFlipperUp = true;
                    this.updateFlipperAngles();
                    e.preventDefault();
                    break;
                case 'Space':
                    if (this.currentBalls > 0 && !this.ball) {
                        this.launchBall();
                    } else if (!this.ball && this.currentBalls === 0) {
                        this.currentBalls = 3;
                        this.score = 0;
                        this.storedBalls = [];
                        this.multiballActive = false;
                        this.targetHits = new Set();
                        this.tiltCount = 0;
                        this.showMessage('NEW GAME', 'Press SPACE to launch');
                    }
                    e.preventDefault();
                    break;
                case 'KeyR':
                    this.currentBalls = 3;
                    this.score = 0;
                    this.ball = null;
                    this.storedBalls = [];
                    this.multiballActive = false;
                    this.targetHits = new Set();
                    this.tiltCount = 0;
                    this.bumpers.forEach(b => b.render.fillStyle = COLORS.bumper);
                    this.showMessage('READY', 'Press SPACE to launch');
                    this.updateUI();
                    e.preventDefault();
                    break;
                case 'ArrowUp':
                    // Nudge - shake the machine up
                    this.nudgeBall(0, -2);
                    e.preventDefault();
                    break;
                case 'ArrowDown':
                    // Nudge - shake the machine down
                    this.nudgeBall(0, 2);
                    e.preventDefault();
                    break;
                case 'KeyA':
                    // Nudge left
                    this.nudgeBall(-2, 0);
                    e.preventDefault();
                    break;
                case 'KeyD':
                    // Nudge right
                    this.nudgeBall(2, 0);
                    e.preventDefault();
                    break;
            }
        });

        document.addEventListener('keyup', (e) => {
            switch(e.code) {
                case 'ArrowLeft':
                case 'KeyZ':
                    this.leftFlipperUp = false;
                    this.updateFlipperAngles();
                    e.preventDefault();
                    break;
                case 'ArrowRight':
                case 'KeyX':
                    this.rightFlipperUp = false;
                    this.updateFlipperAngles();
                    e.preventDefault();
                    break;
            }
        });
    }

    nudgeBall(dx, dy) {
        // Apply a gentle force to all balls when nudging
        const nudgeForce = 0.08;

        if (this.ball) {
            Matter.Body.applyForce(this.ball, this.ball.position, {
                x: this.ball.velocity.x + dx * nudgeForce,
                y: this.ball.velocity.y + dy * nudgeForce
            });
        }

        this.storedBalls.forEach(ball => {
            Matter.Body.applyForce(ball, ball.position, {
                x: ball.velocity.x + dx * nudgeForce,
                y: ball.velocity.y + dy * nudgeForce
            });
        });

        // Track tilt count (excessive nudging)
        this.tiltCount++;
        if (this.tiltCount >= this.maxTilts) {
            this.showMessage('TILT!', 'Too much shaking!');
            this.tiltCount = 0;
        }
    }

    createPlayfield() {
        const world = this.world;

        // Playfield walls with physics properties
        const wallOptions = {
            isStatic: true,
            friction: 0.1,
            restitution: 0.7,
            render: { fillStyle: '#2a2a4e' }
        };

        // Left wall
        Matter.World.add(world, Matter.Bodies.rectangle(15, HEIGHT/2, 8, HEIGHT + 50, wallOptions));

        // Right outer wall
        Matter.World.add(world, Matter.Bodies.rectangle(WIDTH - 15, HEIGHT/2, 8, HEIGHT + 50, wallOptions));

        // Shooter lane - the plunger lane on the right side
        // Lane boundaries: left wall at WIDTH-50, right wall at WIDTH-10 (40px wide lane)
        // Left wall of shooter lane (separates it from main playfield)
        const shooterLaneLeftWall = Matter.Bodies.rectangle(WIDTH - 50, HEIGHT - 140, 8, 280, {
            isStatic: true,
            label: 'shooterLaneWall',
            friction: 0.1,
            restitution: 0.8,
            render: { fillStyle: '#2a2a4e' }
        });

        // Right wall of shooter lane (outer boundary)
        const shooterLaneRightWall = Matter.Bodies.rectangle(WIDTH - 10, HEIGHT - 140, 8, 280, {
            isStatic: true,
            label: 'shooterLaneWall',
            friction: 0.1,
            restitution: 0.8,
            render: { fillStyle: '#2a2a4e' }
        });

        Matter.World.add(world, [shooterLaneLeftWall, shooterLaneRightWall]);

        // Shooter lane outlet - curved wall that redirects ball from lane into main playfield
        // Creates a smooth 90-degree turn from upward to leftward
        const outletTopY = HEIGHT - 260;
        const outletCurveSegments = 6;

        // Left side of outlet curve (inner wall that redirects ball left)
        for (let i = 0; i < outletCurveSegments; i++) {
            const angle = (Math.PI / 2) * (i / (outletCurveSegments - 1));
            const x = (WIDTH - 50) + Math.cos(angle) * 35;
            const y = outletTopY - Math.sin(angle) * 35;
            const segment = Matter.Bodies.rectangle(x, y, 8, 12, {
                isStatic: true,
                angle: angle - Math.PI / 3,
                friction: 0.1,
                restitution: 0.85,
                label: 'shooterOutlet',
                render: { fillStyle: '#3a5' }
            });
            Matter.World.add(world, segment);
        }

        // Right side of outlet curve (outer wall) - continues the channel
        for (let i = 0; i < outletCurveSegments; i++) {
            const angle = (Math.PI / 2) * (i / (outletCurveSegments - 1));
            const x = (WIDTH - 10) + Math.cos(angle) * 25 - 10;
            const y = outletTopY - Math.sin(angle) * 25;
            const segment = Matter.Bodies.rectangle(x, y, 8, 12, {
                isStatic: true,
                angle: angle - Math.PI / 3 + 0.2,
                friction: 0.1,
                restitution: 0.85,
                label: 'shooterOutlet',
                render: { fillStyle: '#3a5' }
            });
            Matter.World.add(world, segment);
        }

        // Top arch - multiple segments for smooth curve
        const archSegments = 12;
        const archRadius = 130;
        const archCenterX = WIDTH / 2;
        const archCenterY = 80;

        for (let i = 0; i < archSegments; i++) {
            const angle = (Math.PI / archSegments) * i + Math.PI / archSegments;
            const x = archCenterX + Math.cos(angle) * archRadius;
            const y = Math.max(30, archCenterY + Math.sin(angle) * archRadius);
            const segment = Matter.Bodies.rectangle(x, y, 25, 8, {
                isStatic: true,
                angle: angle + Math.PI / 2,
                friction: 0.1,
                restitution: 0.8,
                render: { fillStyle: '#2a2a4e' }
            });
            Matter.World.add(world, segment);
        }

        // Create flippers
        this.createFlippers();

        // Create slingshots
        this.createSlingshots();

        // Create drop targets (series of targets that fall when hit)
        this.createDropTargets();

        // Create bumpers
        this.createBumpers();

        // Create targets
        this.createTargets();

        // Create ramps
        this.createRamps();

        // Create lock positions for multiball
        this.createLockPositions();

        // Create diamond obstacle in middle
        Matter.World.add(world, Matter.Bodies.rectangle(WIDTH / 2, 350, 40, 12, {
            isStatic: true,
            angle: Math.PI / 4,
            restitution: 0.9,
            label: 'diamond',
            render: { fillStyle: '#666' }
        }));

        // Set up collision events
        Matter.Events.on(this.engine, 'collisionStart', (event) => {
            this.handleCollisions(event);
        });
    }

    createFlippers() {
        // Flipper positions - at bottom of playfield
        const flipperY = HEIGHT - 55;
        // Pivot points - flippers pivot at their INNER ends
        const leftPivotX = WIDTH / 2 - 60;
        const rightPivotX = WIDTH / 2 + 60;

        // Create pivot points (invisible static bodies)
        const leftPivot = Matter.Bodies.circle(leftPivotX, flipperY, 5, {
            isStatic: true,
            render: { visible: false }
        });

        const rightPivot = Matter.Bodies.circle(rightPivotX, flipperY, 5, {
            isStatic: true,
            render: { visible: false }
        });

        // Left flipper: dynamic body with pivot at LEFT end
        // Position the rectangle so its left edge is at the pivot
        this.flippers.left = Matter.Bodies.rectangle(
            leftPivotX + FLIPPER_WIDTH / 2,
            flipperY,
            FLIPPER_WIDTH,
            FLIPPER_HEIGHT,
            {
                label: 'leftFlipper',
                friction: 0.5,
                restitution: 0.6,
                chamfer: { radius: 5 }
            }
        );

        // Right flipper: dynamic body with pivot at RIGHT end
        this.flippers.right = Matter.Bodies.rectangle(
            rightPivotX - FLIPPER_WIDTH / 2,
            flipperY,
            FLIPPER_WIDTH,
            FLIPPER_HEIGHT,
            {
                label: 'rightFlipper',
                friction: 0.5,
                restitution: 0.6,
                chamfer: { radius: 5 }
            }
        );

        // Create constraints to pin the flipper ends
        this.leftFlipperConstraint = Matter.Constraint.create({
            bodyA: leftPivot,
            bodyB: this.flippers.left,
            pointA: { x: 0, y: 0 },
            pointB: { x: -FLIPPER_WIDTH / 2 + 5, y: 0 },
            stiffness: 1,
            length: 0
        });

        this.rightFlipperConstraint = Matter.Constraint.create({
            bodyA: rightPivot,
            bodyB: this.flippers.right,
            pointA: { x: 0, y: 0 },
            pointB: { x: FLIPPER_WIDTH / 2 - 5, y: 0 },
            stiffness: 1,
            length: 0
        });

        // Real pinball flipper angles
        this.flipperRestAngle = 28 * Math.PI / 180;
        this.flipperActiveAngle = -28 * Math.PI / 180;

        Matter.Body.setAngle(this.flippers.left, this.flipperRestAngle);
        Matter.Body.setAngle(this.flippers.right, -this.flipperRestAngle);

        this.leftFlipperPivot = { x: leftPivotX, y: flipperY };
        this.rightFlipperPivot = { x: rightPivotX, y: flipperY };

        Matter.World.add(this.world, [
            leftPivot, rightPivot,
            this.flippers.left, this.flippers.right,
            this.leftFlipperConstraint, this.rightFlipperConstraint
        ]);
    }

    updateFlipperAngles() {
        const leftFlipper = this.flippers.left;
        const rightFlipper = this.flippers.right;

        const flipperSpeed = 0.15;

        // IMPORTANT: Clamp angles to prevent full rotation
        // Left flipper angles must stay between flipperActiveAngle (-28°) and flipperRestAngle (+28°)
        let leftTargetAngle;
        if (this.leftFlipperUp) {
            leftTargetAngle = this.flipperActiveAngle;
        } else {
            leftTargetAngle = this.flipperRestAngle;
        }
        // Clamp: never go outside the valid range
        leftTargetAngle = Math.max(this.flipperActiveAngle, Math.min(leftTargetAngle, this.flipperRestAngle));

        // Smoothly interpolate toward target angle
        const leftAngleDiff = leftTargetAngle - leftFlipper.angle;
        if (Math.abs(leftAngleDiff) > 0.02) {
            Matter.Body.setAngle(leftFlipper, leftFlipper.angle + Math.sign(leftAngleDiff) * flipperSpeed);
        } else {
            Matter.Body.setAngle(leftFlipper, leftTargetAngle);
        }

        // Right flipper - mirrored (angles are opposite)
        let rightTargetAngle;
        if (this.rightFlipperUp) {
            rightTargetAngle = -this.flipperActiveAngle;
        } else {
            rightTargetAngle = -this.flipperRestAngle;
        }
        // Clamp: -flipperRestAngle (-28°) is minimum, -flipperActiveAngle (+28°) is maximum
        rightTargetAngle = Math.max(-this.flipperRestAngle, Math.min(rightTargetAngle, -this.flipperActiveAngle));

        const rightAngleDiff = rightTargetAngle - rightFlipper.angle;
        if (Math.abs(rightAngleDiff) > 0.02) {
            Matter.Body.setAngle(rightFlipper, rightFlipper.angle + Math.sign(rightAngleDiff) * flipperSpeed);
        } else {
            Matter.Body.setAngle(rightFlipper, rightTargetAngle);
        }
    }

    createSlingshots() {
        const slingshotOptions = {
            isStatic: true,
            label: 'slingshot',
            restitution: 1.5, // Super restorative like Williams machines
            friction: 0.1,
            render: { fillStyle: COLORS.slingshot }
        };

        // Left slingshot (triangle pointing right)
        this.leftSlingshot = Matter.Bodies.polygon(90, HEIGHT - 140, 3, 32, {
            ...slingshotOptions,
            angle: Math.PI / 6
        });

        // Right slingshot (triangle pointing left)
        this.rightSlingshot = Matter.Bodies.polygon(WIDTH - 90, HEIGHT - 140, 3, 32, {
            ...slingshotOptions,
            angle: -Math.PI / 6
        });

        Matter.World.add(this.world, [this.leftSlingshot, this.rightSlingshot]);
    }

    createDropTargets() {
        // Drop targets - 5 targets in a row that fall when hit
        // Classic Williams-style feature where hitting all targets triggers a bonus
        const targetY = 120;
        const startX = WIDTH / 2 - 80;
        const spacing = 35;

        this.dropTargets = [];
        for (let i = 0; i < 5; i++) {
            const target = Matter.Bodies.rectangle(startX + i * spacing, targetY, 15, 40, {
                isStatic: true,
                label: 'dropTarget',
                restitution: 0.6,
                friction: 0.1,
                render: { fillStyle: COLORS.target }
            });
            target.targetNumber = i + 1;
            target.isDropped = false;
            this.dropTargets.push(target);
        }

        Matter.World.add(this.world, this.dropTargets);
    }

    createLockPositions() {
        // Lock positions for multiball - near the ramp exits
        // Left lock
        this.leftLock = Matter.Bodies.rectangle(120, 500, 20, 40, {
            isStatic: true,
            label: 'lockLeft',
            isLockPosition: true,
            render: { fillStyle: '#555' }
        });

        // Right lock
        this.rightLock = Matter.Bodies.rectangle(WIDTH - 120, 500, 20, 40, {
            isStatic: true,
            label: 'lockRight',
            isLockPosition: true,
            render: { fillStyle: '#555' }
        });

        Matter.World.add(this.world, [this.leftLock, this.rightLock]);
    }

    createBumpers() {
        const bumperOptions = {
            isStatic: true,
            label: 'bumper',
            restitution: 1.5,
            friction: 0.1,
            render: { fillStyle: COLORS.bumper }
        };

        // Three main bumpers in triangle formation
        this.bumpers = [
            Matter.Bodies.circle(WIDTH / 2, 180, 28, bumperOptions),
            Matter.Bodies.circle(WIDTH / 2 - 75, 250, 28, bumperOptions),
            Matter.Bodies.circle(WIDTH / 2 + 75, 250, 28, bumperOptions)
        ];

        // Top bumper
        this.bumpers.push(Matter.Bodies.circle(WIDTH / 2, 100, 22, {
            ...bumperOptions,
            label: 'topBumper'
        }));

        Matter.World.add(this.world, this.bumpers);
    }

    createTargets() {
        const targetOptions = {
            isStatic: true,
            label: 'target',
            restitution: 0.7,
            friction: 0.1,
            render: { fillStyle: COLORS.target }
        };

        // Standup targets (vertical rectangles)
        this.targets = [
            Matter.Bodies.rectangle(WIDTH / 2 - 110, 140, 12, 45, { ...targetOptions, label: 'target1' }),
            Matter.Bodies.rectangle(WIDTH / 2 - 50, 140, 12, 45, { ...targetOptions, label: 'target2' }),
            Matter.Bodies.rectangle(WIDTH / 2 + 50, 140, 12, 45, { ...targetOptions, label: 'target3' }),
            Matter.Bodies.rectangle(WIDTH / 2 + 110, 140, 12, 45, { ...targetOptions, label: 'target4' })
        ];

        // Rollover lanes (horizontal bars)
        this.rollovers = [
            Matter.Bodies.rectangle(WIDTH / 2 - 130, 80, 50, 8, {
                isStatic: true,
                label: 'rolloverLeft',
                render: { fillStyle: COLORS.ramp }
            }),
            Matter.Bodies.rectangle(WIDTH / 2 + 130, 80, 50, 8, {
                isStatic: true,
                label: 'rolloverRight',
                render: { fillStyle: COLORS.ramp }
            })
        ];

        Matter.World.add(this.world, [...this.targets, ...this.rollovers]);
    }

    createRamps() {
        // Left ramp - angled wall
        this.leftRamp = Matter.Bodies.rectangle(90, 380, 100, 12, {
            isStatic: true,
            label: 'rampLeft',
            angle: -Math.PI / 5,
            restitution: 0.8,
            friction: 0.1,
            render: { fillStyle: COLORS.ramp }
        });

        // Right ramp - angled wall
        this.rightRamp = Matter.Bodies.rectangle(WIDTH - 90, 380, 100, 12, {
            isStatic: true,
            label: 'rampRight',
            angle: Math.PI / 5,
            restitution: 0.8,
            friction: 0.1,
            render: { fillStyle: COLORS.ramp }
        });

        // Middle ramp divider
        this.middleRamp = Matter.Bodies.rectangle(WIDTH / 2, 450, 8, 120, {
            isStatic: true,
            label: 'rampDivider',
            restitution: 0.8,
            render: { fillStyle: COLORS.ramp }
        });

        Matter.World.add(this.world, [this.leftRamp, this.rightRamp, this.middleRamp]);
    }

    launchBall() {
        if (this.currentBalls <= 0) {
            this.showMessage('NO BALLS!', 'Press R to restart');
            return;
        }

        this.currentBalls--;
        this.updateUI();

        // Spawn ball at bottom of right-side shooter lane
        // Lane runs from WIDTH-50 (left) to WIDTH-10 (right), center at WIDTH-30
        const shooterLaneX = WIDTH - 30;
        const shooterLaneY = HEIGHT - 30;

        this.ball = Matter.Bodies.circle(shooterLaneX, shooterLaneY, BALL_RADIUS, {
            label: 'ball',
            restitution: 0.9,
            friction: 0.02,
            density: 0.04,
            render: { fillStyle: COLORS.ball }
        });
        this.ball.launchTime = Date.now();

        Matter.World.add(this.world, this.ball);

        // Plunger launch: strong upward, minimal horizontal
        // The outlet curve will naturally redirect the ball leftward
        Matter.Body.setVelocity(this.ball, {
            x: -2,
            y: -35
        });

        // Start ball save timer
        this.startBallSaveTimer();
    }

    startBallSaveTimer() {
        // Clear any existing timer
        if (this.ballSaveTimer) {
            clearTimeout(this.ballSaveTimer);
        }

        this.ballSaveStartTime = Date.now();
        this.ballSaveActive = true;
        this.showMessage('BALL SAVE', `${this.ballSaveTime}s`);

        // Set timer to end ball save
        this.ballSaveTimer = setTimeout(() => {
            this.endBallSaveTimer();
        }, this.ballSaveTime * 1000);
    }

    endBallSaveTimer() {
        this.ballSaveActive = false;
        this.showMessage('BALL SAVE END', 'Watch out!');
    }

    handleCollisions(event) {
        const pairs = event.pairs;
        const now = Date.now();

        for (const pair of pairs) {
            const bodyA = pair.bodyA;
            const bodyB = pair.bodyB;

            // Determine ball and other body
            let ball, other;
            if (bodyA.label === 'ball') {
                ball = bodyA;
                other = bodyB;
            } else if (bodyB.label === 'ball') {
                ball = bodyB;
                other = bodyA;
            } else {
                continue;
            }

            // Track last known ball position
            this.lastKnownBall = ball;

            // Combo system - hits within 500ms count as combo
            const isCombo = (now - this.lastHitTime) < 500;
            this.lastHitTime = now;

            if (isCombo) {
                this.comboStreak++;
                this.comboMultiplier = Math.min(4, 1 + Math.floor(this.comboStreak / 2));
            } else {
                this.comboStreak = 1;
                this.comboMultiplier = 1;
            }

            // Bumper collision - high score with multiplier
            if (other.label === 'bumper' || other.label === 'topBumper') {
                const baseScore = other.label === 'topBumper' ? SCORES.topBumper : SCORES.bumper;
                const points = baseScore * this.comboMultiplier;
                this.addScore(points, ball.position.x, ball.position.y);
                this.triggerBumperEffect(other);
                this.createParticles(ball.position.x, ball.position.y, COLORS.bumper, 8);
            }

            // Slingshot collision - super restorative
            if (other.label === 'slingshot') {
                const points = SCORES.slingshot * this.comboMultiplier;
                this.addScore(points, ball.position.x, ball.position.y);
                this.createParticles(ball.position.x, ball.position.y, COLORS.slingshot, 5);
            }

            // Target hit
            if (other.label === 'target') {
                this.addScore(SCORES.target * this.comboMultiplier, ball.position.x, ball.position.y);
                this.handleTargetHit(other);
            }

            // Drop target hit
            if (other.label === 'dropTarget') {
                this.handleDropTargetHit(other);
            }

            // Rollover
            if (other.label === 'rolloverLeft' || other.label === 'rolloverRight') {
                this.addScore(SCORES.rollover, ball.position.x, ball.position.y);
            }

            // Ramp hit
            if (other.label === 'rampLeft' || other.label === 'rampRight') {
                this.addScore(SCORES.ramp * this.comboMultiplier, ball.position.x, ball.position.y);
                this.checkMultiballActivation();
            }

            // Lock position - ball gets locked for multiball
            if (other.label === 'lockLeft' || other.label === 'lockRight') {
                this.lockBall(other.label);
            }

            // Diamond obstacle
            if (other.label === 'diamond') {
                this.addScore(SCORES.diamond, ball.position.x, ball.position.y);
            }

            // Flipper boost
            if (other.label === 'leftFlipper' && this.leftFlipperUp) {
                Matter.Body.applyForce(ball, ball.position, { x: 0, y: -0.025 });
            }
            if (other.label === 'rightFlipper' && this.rightFlipperUp) {
                Matter.Body.applyForce(ball, ball.position, { x: 0, y: -0.025 });
            }
        }

        this.updateUI();
    }

    handleTargetHit(target) {
        this.targetHits.add(target.label);
        this.addScore(25, target.position.x, target.position.y);
    }

    handleDropTargetHit(target) {
        if (target.isDropped) return; // Already dropped

        // Drop the target
        target.isDropped = true;
        Matter.World.remove(this.world, target);

        this.dropTargetHits++;
        this.addScore(SCORES.target * this.comboMultiplier, target.position.x, target.position.y);
        this.createParticles(target.position.x, target.position.y, COLORS.target, 5);

        // Check if all drop targets hit
        if (this.dropTargetHits >= 5) {
            this.showMessage('ALL TARGETS DOWN!', '+1000 BONUS');
            this.addScore(1000, WIDTH / 2, 100);
            this.dropTargetResetTimer = setTimeout(() => this.resetDropTargets(), 3000);
        }
    }

    resetDropTargets() {
        // Bring all drop targets back up
        this.dropTargets.forEach(target => {
            target.isDropped = false;
            Matter.World.add(this.world, target);
        });
        this.dropTargetHits = 0;
        this.showMessage('TARGETS RESET', 'Ready for more!');
    }

    lockBall(lockPosition) {
        if (!this.ball || this.ball.locked) return;

        this.lockedBalls++;
        const remaining = 2 - this.lockedBalls;

        // Store ball position for potential release
        this.lockedBallPositions.push({ x: this.ball.position.x, y: this.ball.position.y });

        // Mark ball as locked (remove from play temporarily)
        this.ball.locked = true;
        Matter.World.remove(this.world, this.ball);
        this.ball = null;

        if (remaining > 0) {
            this.showMessage('BALL LOCKED!', `${remaining} to multiball`);
        } else {
            this.showMessage('MULTIBALL READY!', 'Hit a ramp!');
        }
    }

    checkMultiballActivation() {
        // Multiball activates when we have locked balls and hit a ramp
        if (this.lockedBalls >= 2 && !this.multiballActive) {
            this.multiballActive = true;
            this.activateMultiball();
        }
    }

    activateMultiball() {
        this.showMessage('MULTIBALL!', 'JACKPOTS AWAIT!');

        // Launch all locked balls into play
        let delay = 0;
        this.lockedBallPositions.forEach((pos, idx) => {
            setTimeout(() => {
                const releaseBall = Matter.Bodies.circle(pos.x, pos.y, BALL_RADIUS, {
                    label: 'ball',
                    restitution: 0.7,
                    friction: 0.001,
                    density: 0.04,
                    render: { fillStyle: COLORS.ball }
                });

                Matter.World.add(this.world, releaseBall);
                Matter.Body.setVelocity(releaseBall, { x: (Math.random() - 0.5) * 5, y: -15 });
            }, delay);
            delay += 300;
        });

        // Add bonus points for multiball activation
        this.score += 500;

        // Store reference to released balls
        this.storedBalls = this.lockedBallPositions.map((_, idx) => ({ id: idx }));
    }

    addScore(points, x, y) {
        this.score += points;
        // Add score popup
        this.scorePopups.push({
            text: `+${points}`,
            x: x,
            y: y,
            life: 1.0
        });
    }

    createParticles(x, y, color, count) {
        for (let i = 0; i < count; i++) {
            this.particles.push(new Particle(x, y, color));
        }
    }

    triggerBumperEffect(bumper) {
        const originalColor = bumper.render.fillStyle;
        bumper.render.fillStyle = '#fff';

        // Brief flash effect
        setTimeout(() => {
            bumper.render.fillStyle = originalColor;
        }, 100);

        // Add extra points for combo
        this.score += 10;
    }

    updateBallState() {
        // Update ball save timer display
        if (this.ballSaveActive && this.ball && this.ballSaveStartTime) {
            const timeElapsed = (Date.now() - this.ballSaveStartTime) / 1000;
            const timeLeft = Math.max(0, Math.ceil(this.ballSaveTime - timeElapsed));
            if (timeLeft > 0 && timeLeft <= 5) {
                this.showMessage('BALL SAVE', `${timeLeft}s remaining`);
            }
        }

        if (!this.ball) {
            // Check for stored balls (multiball)
            if (this.storedBalls.length > 0) {
                const stored = this.storedBalls[0];
                if (stored.position.y > HEIGHT + 30) {
                    Matter.World.remove(this.world, stored);
                    this.storedBalls.shift();

                    if (this.storedBalls.length === 0 && !this.ball) {
                        setTimeout(() => {
                            if (this.currentBalls > 0) {
                                this.showMessage('READY', 'Press SPACE to launch');
                            } else {
                                this.gameOver();
                            }
                        }, 500);
                    }
                }
            }
            return;
        }

        // Skip drain for locked balls
        if (this.ball.isLocked) {
            return;
        }

        // Grace period - don't count as drain in first 1 second after launch
        const gracePeriod = this.ball.launchTime ? (Date.now() - this.ball.launchTime) < 1000 : false;
        if (gracePeriod) {
            return;
        }

        // Check if ball is lost (drained through bottom) - increased threshold
        if (this.ball.position.y > HEIGHT + 50) {
            // Ball save protection - easier to catch
            if (this.ballSaveActive) {
                this.showMessage('BALL SAVED!', 'Good shot!');
                // Reset ball high enough to have full play
                Matter.Body.setPosition(this.ball, { x: WIDTH / 2, y: HEIGHT - 250 });
                Matter.Body.setVelocity(this.ball, {
                    x: (Math.random() - 0.5) * 3,
                    y: -5
                });
                return;
            }

            // Lost ball
            if (this.ball.locked) {
                this.ball.isLocked = false;
                Matter.Body.setPosition(this.ball, { x: WIDTH / 2, y: HEIGHT - 200 });
                Matter.Body.setVelocity(this.ball, {
                    x: (Math.random() - 0.5) * 3,
                    y: -5
                });
                this.showMessage('LOCK RELEASED', 'Ball back in play!');
                return;
            }

            Matter.World.remove(this.world, this.ball);
            this.ball = null;

            if (this.currentBalls > 0 || this.storedBalls.length > 0) {
                // More balls to play
                if (this.currentBalls > 0) {
                    setTimeout(() => {
                        this.showMessage('READY', 'Press SPACE to launch');
                    }, 500);
                }
            } else {
                // Game over
                setTimeout(() => this.gameOver(), 500);
            }
        }

        // Check for low velocity ball (stuck) - add nudge
        if (this.ball && this.ball.velocity.y > -0.5 && this.ball.velocity.y < 0.5 &&
            this.ball.position.x > WIDTH / 2 && this.ball.position.x < WIDTH - 50) {
            // Add nudge to prevent stuck ball
            Matter.Body.applyForce(this.ball, this.ball.position, { x: 0.002, y: 0 });
        }
    }

    checkHighScore() {
        const highScore = parseInt(localStorage.getItem('pinballHighScore') || '0');
        if (this.score > highScore) {
            localStorage.setItem('pinballHighScore', this.score.toString());
            return true;
        }
        return false;
    }

    showMessage(title, text) {
        const overlay = document.getElementById('message-overlay');
        const titleEl = document.getElementById('message-title');
        const textEl = document.getElementById('message-text');

        titleEl.textContent = title;
        textEl.textContent = text;
        overlay.style.display = 'block';

        // Hide after delay (unless it's a persistent message)
        if (title !== 'GAME OVER' && title !== 'NEW HIGH SCORE') {
            setTimeout(() => {
                overlay.style.display = 'none';
            }, 1500);
        }
    }

    gameOver() {
        const isNewHigh = this.checkHighScore();

        if (isNewHigh) {
            this.showMessage('NEW HIGH SCORE!', `Score: ${this.score}`);
        } else {
            this.showMessage('GAME OVER', `Score: ${this.score} | R to restart`);
        }

        this.updateUI();
    }

    updateUI() {
        document.getElementById('score').textContent = this.score;
        document.getElementById('balls').textContent = Math.max(1, this.currentBalls);
    }

    render() {
        const canvas = document.getElementById('game-canvas');
        const ctx = canvas.getContext('2d');
        canvas.width = WIDTH;
        canvas.height = HEIGHT;

        console.log('Render function started, canvas size:', WIDTH, 'x', HEIGHT);

        // Animation loop
        const renderLoop = () => {
            // Clear canvas - just red first to test
            ctx.fillStyle = '#ff0000';
            ctx.fillRect(0, 0, WIDTH, HEIGHT);

            // Draw playfield background gradient
            const gradient = ctx.createLinearGradient(0, 0, 0, HEIGHT);
            gradient.addColorStop(0, '#1a1a3e');
            gradient.addColorStop(1, '#0f0f1f');
            ctx.fillStyle = gradient;
            ctx.fillRect(0, 0, WIDTH, HEIGHT);

            console.log('Drawn background');

            // Draw decorative grid
            ctx.strokeStyle = 'rgba(0, 255, 255, 0.05)';
            ctx.lineWidth = 1;
            for (let x = 0; x < WIDTH; x += 50) {
                ctx.beginPath();
                ctx.moveTo(x, 0);
                ctx.lineTo(x, HEIGHT);
                ctx.stroke();
            }
            for (let y = 0; y < HEIGHT; y += 50) {
                ctx.beginPath();
                ctx.moveTo(0, y);
                ctx.lineTo(WIDTH, y);
                ctx.stroke();
            }

            // Draw all physics bodies
            const bodies = Matter.Composite.allBodies(this.world);
            console.log('Bodies count:', bodies.length);
            bodies.forEach((body, idx) => {
                if (!body) {
                    console.warn(`Body ${idx} is undefined/null`);
                    return;
                }
                console.log(`Body ${idx}: label=${body.label}, hasVertices=${!!body.vertices}, count=${body.vertices?.length || 0}`);
                try {
                    this.drawBody(ctx, body);
                } catch (e) {
                    console.warn(`Error drawing body ${idx} (${body.label}):`, e.message);
                }
            });

            // Draw launch lane indicator
            ctx.fillStyle = 'rgba(0, 255, 255, 0.2)';
            ctx.fillRect(WIDTH - 50, 50, 35, HEIGHT - 100);

            // Draw lock position indicators
            ctx.shadowColor = '#0ff';
            ctx.shadowBlur = 15;
            ctx.fillStyle = '#0ff';
            ctx.beginPath();
            ctx.arc(120, 500, 8, 0, 2 * Math.PI);
            ctx.arc(WIDTH - 120, 500, 8, 0, 2 * Math.PI);
            ctx.fill();
            ctx.shadowBlur = 0;

            // Draw drop target status
            if (this.dropTargetHits > 0 && this.dropTargetHits < 5) {
                ctx.fillStyle = '#ff6b9d';
                ctx.font = '12px monospace';
                ctx.textAlign = 'center';
                ctx.fillText(`${5 - this.dropTargetHits} targets left for bonus`, WIDTH / 2, 80);
                ctx.textAlign = 'left';
            }

            // Draw lock status text
            ctx.fillStyle = '#0ff';
            ctx.font = '10px monospace';
            ctx.textAlign = 'center';
            ctx.fillText('LOCK', 120, 530);
            ctx.fillText('LOCK', WIDTH - 120, 530);
            ctx.textAlign = 'left';

            // Draw ball launch hint
            if (!this.ball && this.currentBalls > 0) {
                ctx.fillStyle = '#0ff';
                ctx.font = 'bold 12px monospace';
                ctx.textAlign = 'center';
                ctx.fillText('PRESS SPACE', WIDTH - 32, HEIGHT - 20);
                ctx.textAlign = 'left';
            }

            // Draw high score
            const highScore = localStorage.getItem('pinballHighScore') || '0';
            ctx.fillStyle = '#ff6b6b';
            ctx.font = '12px monospace';
            ctx.textAlign = 'left';
            ctx.fillText(`HI: ${highScore}`, 20, 25);

            // Draw multiball indicator
            if (this.multiballActive) {
                ctx.shadowColor = '#ffe66d';
                ctx.shadowBlur = 20;
                ctx.fillStyle = '#ffe66d';
                ctx.font = 'bold 18px monospace';
                ctx.textAlign = 'center';
                ctx.fillText('MULTIBALL!', WIDTH / 2, 50);
                ctx.shadowBlur = 0;
                ctx.textAlign = 'left';
            }

            // Draw lock status (balls locked)
            if (this.lockedBalls > 0 && !this.multiballActive) {
                ctx.fillStyle = '#95e1d3';
                ctx.font = '12px monospace';
                ctx.textAlign = 'center';
                ctx.fillText(`LOCKED: ${this.lockedBalls}/2`, WIDTH / 2, 50);
                ctx.textAlign = 'left';
            }

            // Draw ball save timer
            if (this.ballSaveActive) {
                const timeLeft = Math.ceil(this.ballSaveTime - (Date.now() - this.ballSaveStartTime || 0) / 1000);
                if (timeLeft > 0) {
                    ctx.fillStyle = '#95e1d3';
                    ctx.font = '12px monospace';
                    ctx.textAlign = 'center';
                    ctx.fillText(`BALL SAVE: ${timeLeft}s`, WIDTH / 2, HEIGHT - 80);
                    ctx.textAlign = 'left';
                }
            }

            // Draw particles
            for (let i = this.particles.length - 1; i >= 0; i--) {
                const p = this.particles[i];
                p.update();
                p.draw(ctx);
                if (p.life <= 0) {
                    this.particles.splice(i, 1);
                }
            }

            // Draw score popups
            for (let i = this.scorePopups.length - 1; i >= 0; i--) {
                const popup = this.scorePopups[i];
                popup.y -= 1; // Float upward
                popup.life -= 0.02;
                ctx.globalAlpha = popup.life;
                ctx.fillStyle = '#ff0';
                ctx.font = 'bold 16px monospace';
                ctx.textAlign = 'center';
                ctx.fillText(popup.text, popup.x, popup.y);
                ctx.globalAlpha = 1.0;
                if (popup.life <= 0) {
                    this.scorePopups.splice(i, 1);
                }
            }

            requestAnimationFrame(renderLoop);
        };

        renderLoop();
    }

    drawBody(ctx, body) {
        // Skip constraints and non-body objects
        if (!body || body.bodyA || body.bodyB || body.constraint) return;
        if (!body.label) return;
        if (!body.position || typeof body.position.x !== 'number') return;
        if (!body.vertices || !Array.isArray(body.vertices) || body.vertices.length === 0) return;

        // Verify all vertices have x and y
        for (const v of body.vertices) {
            if (!v || typeof v.x !== 'number' || typeof v.y !== 'number') return;
        }

        ctx.beginPath();

        if (body.label === 'ball') {
            // Ball with 3D effect
            const gradient = ctx.createRadialGradient(
                body.position.x - 3, body.position.y - 3, 0,
                body.position.x, body.position.y, BALL_RADIUS
            );
            gradient.addColorStop(0, '#ffaaaa');
            gradient.addColorStop(0.5, COLORS.ball);
            gradient.addColorStop(1, '#cc4444');
            ctx.fillStyle = gradient;
            ctx.arc(body.position.x, body.position.y, BALL_RADIUS, 0, 2 * Math.PI);
            ctx.fill();

            // Ball highlight
            ctx.fillStyle = 'rgba(255, 255, 255, 0.5)';
            ctx.beginPath();
            ctx.arc(body.position.x - 3, body.position.y - 3, 3, 0, 2 * Math.PI);
            ctx.fill();
        } else if (body.label === 'bumper' || body.label === 'topBumper') {
            // Bumper with glow effect
            const radius = body.label === 'topBumper' ? 22 : 28;
            ctx.shadowColor = COLORS.bumper;
            ctx.shadowBlur = 25;

            const gradient = ctx.createRadialGradient(
                body.position.x - radius/3, body.position.y - radius/3, 0,
                body.position.x, body.position.y, radius
            );
            gradient.addColorStop(0, '#fff');
            gradient.addColorStop(0.5, COLORS.bumper);
            gradient.addColorStop(1, '#ddaa00');
            ctx.fillStyle = gradient;
            ctx.arc(body.position.x, body.position.y, radius, 0, 2 * Math.PI);
            ctx.fill();
            ctx.shadowBlur = 0;

            // Inner ring
            ctx.strokeStyle = '#fff';
            ctx.lineWidth = 2;
            ctx.beginPath();
            ctx.arc(body.position.x, body.position.y, radius * 0.5, 0, 2 * Math.PI);
            ctx.stroke();
        } else if (body.label === 'target') {
            // Target with light effect
            ctx.shadowColor = COLORS.target;
            ctx.shadowBlur = 10;
            ctx.fillStyle = COLORS.target;
            ctx.fillRect(
                body.position.x - 6,
                body.position.y - 22,
                12,
                44
            );

            // Target light indicator
            if (this.targetHits.has(body.label)) {
                ctx.fillStyle = '#0f0';
                ctx.shadowColor = '#0f0';
                ctx.fillRect(body.position.x - 4, body.position.y - 10, 8, 20);
            }
            ctx.shadowBlur = 0;
        } else if (body.label === 'slingshot') {
            ctx.shadowColor = COLORS.slingshot;
            ctx.shadowBlur = 15;
            ctx.fillStyle = COLORS.slingshot;

            ctx.beginPath();
            const vertices = body.vertices;
            ctx.moveTo(vertices[0].x, vertices[0].y);
            for (let i = 1; i < vertices.length; i++) {
                ctx.lineTo(vertices[i].x, vertices[i].y);
            }
            ctx.closePath();
            ctx.fill();
            ctx.shadowBlur = 0;
        } else if (body.label === 'lockLeft' || body.label === 'lockRight') {
            // Lock position - glowing indicator
            ctx.shadowColor = '#0ff';
            ctx.shadowBlur = 20;
            ctx.fillStyle = '#0ff';

            // Draw circle for lock
            ctx.beginPath();
            ctx.arc(body.position.x, body.position.y, 12, 0, 2 * Math.PI);
            ctx.fill();

            // Inner ring
            ctx.fillStyle = '#fff';
            ctx.beginPath();
            ctx.arc(body.position.x, body.position.y, 6, 0, 2 * Math.PI);
            ctx.fill();
            ctx.shadowBlur = 0;
        } else if (body.label === 'leftFlipper' || body.label === 'rightFlipper') {
            // Flipper with gradient
            const gradient = ctx.createLinearGradient(
                body.position.x - FLIPPER_WIDTH/2,
                body.position.y - FLIPPER_HEIGHT/2,
                body.position.x + FLIPPER_WIDTH/2,
                body.position.y + FLIPPER_HEIGHT/2
            );
            gradient.addColorStop(0, '#4ecdc4');
            gradient.addColorStop(1, '#33b9b0');

            ctx.shadowColor = '#4ecdc4';
            ctx.shadowBlur = 10;
            ctx.fillStyle = gradient;

            ctx.beginPath();
            const vertices = body.vertices;
            ctx.moveTo(vertices[0].x, vertices[0].y);
            for (let i = 1; i < vertices.length; i++) {
                ctx.lineTo(vertices[i].x, vertices[i].y);
            }
            ctx.closePath();
            ctx.fill();
            ctx.shadowBlur = 0;
        } else if (body.label === 'rampLeft' || body.label === 'rampRight' || body.label === 'rampDivider') {
            ctx.shadowColor = COLORS.ramp;
            ctx.shadowBlur = 12;
            ctx.fillStyle = COLORS.ramp;

            ctx.beginPath();
            const vertices = body.vertices;
            ctx.moveTo(vertices[0].x, vertices[0].y);
            for (let i = 1; i < vertices.length; i++) {
                ctx.lineTo(vertices[i].x, vertices[i].y);
            }
            ctx.closePath();
            ctx.fill();
            ctx.shadowBlur = 0;
        } else if (body.label === 'rolloverLeft' || body.label === 'rolloverRight') {
            ctx.fillStyle = COLORS.ramp;
            ctx.beginPath();
            const vertices = body.vertices;
            ctx.moveTo(vertices[0].x, vertices[0].y);
            for (let i = 1; i < vertices.length; i++) {
                ctx.lineTo(vertices[i].x, vertices[i].y);
            }
            ctx.closePath();
            ctx.fill();
        } else if (body.label === 'diamond') {
            ctx.shadowColor = '#888';
            ctx.shadowBlur = 10;
            ctx.fillStyle = '#666';
            ctx.beginPath();
            const vertices = body.vertices;
            ctx.moveTo(vertices[0].x, vertices[0].y);
            for (let i = 1; i < vertices.length; i++) {
                ctx.lineTo(vertices[i].x, vertices[i].y);
            }
            ctx.closePath();
            ctx.fill();
            ctx.shadowBlur = 0;
        } else {
            // Wall/body - default rendering
            if (!body.render || !body.render.fillStyle) return;

            ctx.fillStyle = body.render.fillStyle || '#2a2a4e';
            ctx.beginPath();
            const vertices = body.vertices;
            if (vertices && vertices.length > 0) {
                ctx.moveTo(vertices[0].x, vertices[0].y);
                for (let i = 1; i < vertices.length; i++) {
                    ctx.lineTo(vertices[i].x, vertices[i].y);
                }
                ctx.closePath();
                ctx.fill();
            }
        }
    }
}

// Load Matter.js and start game
const script = document.createElement('script');
script.src = 'https://cdn.jsdelivr.net/npm/matter-js@0.19.0/build/matter.min.js';
script.onload = () => {
    // Matter.js loads as global 'Matter' namespace
    console.log('Matter.js loaded, Matter =', Matter);
    console.log('Matter.Engine =', Matter.Engine);
    console.log('Matter.Bodies =', Matter.Bodies);
    if (typeof Matter === 'undefined') {
        console.error('Matter.js failed to load properly');
        alert('Physics engine failed to initialize');
        return;
    }
    console.log('Creating PinballGame...');
    window.pinballGame = new PinballGame();
};
script.onerror = () => {
    console.error('Failed to load Matter.js');
    alert('Failed to load physics engine. Please check your internet connection.');
};
document.body.appendChild(script);
