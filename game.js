// Space Station Pinball - Williams Style Game (Babylon.js Version without external physics)
class PinballGame {
    constructor() {
        this.canvas = document.getElementById('renderCanvas');
        this.engine = new BABYLON.Engine(this.canvas, true, {
            preserveDrawingBuffer: true,
            powerPreference: 'high-performance'
        });

        // Game state
        this.score = 0;
        this.highScore = parseInt(localStorage.getItem('pinballHighScore')) || 0;
        this.ballsLeft = 3;
        this.currentBalls = [];
        this.isMultiball = false;
        this.gameOver = false;
        this.launched = false;
        this.deltaTime = 0;

        // Physics parameters
        this.gravity = 25; // Gravity acceleration
        this.gravityStrength = 15;
        this.airResistance = 0.98; // Air friction coefficient

        // Keyboard input
        this.keys = {
            leftFlipper: false,
            rightFlipper: false,
            launch: false
        };

        // Game elements
        this.flippers = { left: null, right: null, upper: null };
        this.bumpers = [];
        this.targets = [];
        this.ramps = [];

        // Scoring multiplier
        this.scoreMultiplier = 1;

        this.init();
    }

    init() {
        this.createScene();
        this.createPlayfield();
        this.createFlippers();
        this.createBumpers();
        this.createTargets();
        this.createRamps();
        this.setupLighting();
        this.setupInput();
        this.updateUI();

        // Start game loop
        this.engine.runRenderLoop(() => this.render());
        window.addEventListener('resize', () => this.engine.resize());

        // Launch first ball
        setTimeout(() => this.launchBall(), 500);
    }

    createScene() {
        this.scene = new BABYLON.Scene(this.engine);
        this.scene.clearColor = new BABYLON.Color3(0.02, 0.04, 0.15);
        this.scene.collisionsEnabled = true;

        // Camera - positioned to view playfield from front at an angle
        this.camera = new BABYLON.UniversalCamera('camera', new BABYLON.Vector3(0, 0.6, 1.5), this.scene);
        this.camera.attachControl(this.canvas, true);
        this.camera.inertia = 0.7;
        this.camera.angularSensibility = 1000;

        // Look at the center of the playfield
        this.camera.setTarget(new BABYLON.Vector3(0, 0.2, 0));
    }

    createPlayfield() {
        // Create main playfield surface - tilted at 6.5 degrees
        const playfieldWidth = 1.05;
        const playfieldLength = 1.95;
        const tiltAngle = 6.5 * Math.PI / 180;

        // Main playfield with visual appearance
        const playfieldMesh = BABYLON.MeshBuilder.CreateBox('playfield', {
            width: playfieldWidth,
            height: 0.05,
            depth: playfieldLength
        }, this.scene);

        playfieldMesh.position.y = 0;
        playfieldMesh.rotation.z = tiltAngle;

        // Create playfield material - glossy surface with grid pattern
        const playfieldMaterial = new BABYLON.StandardMaterial('playfieldMat', this.scene);
        playfieldMaterial.diffuse = new BABYLON.Color3(0.1, 0.1, 0.2);
        playfieldMaterial.specularColor = new BABYLON.Color3(0.8, 0.8, 1);
        playfieldMaterial.specularPower = 64;
        playfieldMaterial.emissiveColor = new BABYLON.Color3(0.05, 0.1, 0.2);
        playfieldMesh.material = playfieldMaterial;

        // Create side rails/walls
        const wallThickness = 0.05;
        const wallHeight = 0.5;

        // Left wall
        const leftWall = BABYLON.MeshBuilder.CreateBox('leftWall', {
            width: wallThickness,
            height: wallHeight,
            depth: playfieldLength
        }, this.scene);
        leftWall.position.x = -playfieldWidth / 2;
        leftWall.position.y = wallHeight / 2;
        leftWall.rotation.z = tiltAngle;

        const wallMaterial = new BABYLON.StandardMaterial('wallMat', this.scene);
        wallMaterial.diffuse = new BABYLON.Color3(0.3, 0.3, 0.4);
        wallMaterial.specularColor = new BABYLON.Color3(0.4, 0.4, 0.5);
        leftWall.material = wallMaterial;

        // Right wall
        const rightWall = BABYLON.MeshBuilder.CreateBox('rightWall', {
            width: wallThickness,
            height: wallHeight,
            depth: playfieldLength
        }, this.scene);
        rightWall.position.x = playfieldWidth / 2;
        rightWall.position.y = wallHeight / 2;
        rightWall.rotation.z = tiltAngle;
        rightWall.material = wallMaterial;

        // Ball drain (invisible trigger zone)
        this.drainZone = {
            position: new BABYLON.Vector3(0, -1, playfieldLength / 2 + 0.3),
            radius: 0.25
        };

        // Backbox panel for visual effect
        const backbox = BABYLON.MeshBuilder.CreateBox('backbox', {
            width: playfieldWidth * 1.2,
            height: 0.8,
            depth: 0.1
        }, this.scene);
        backbox.position.y = 0.5;
        backbox.position.z = -playfieldLength / 2 - 0.15;

        const backboxMaterial = new BABYLON.StandardMaterial('backboxMat', this.scene);
        backboxMaterial.diffuse = new BABYLON.Color3(0.1, 0.1, 0.15);
        backboxMaterial.emissiveColor = new BABYLON.Color3(0.15, 0.15, 0.25);
        backbox.material = backboxMaterial;

        // Store playfield data for collision
        this.playfield = {
            mesh: playfieldMesh,
            width: playfieldWidth,
            length: playfieldLength,
            tiltAngle: tiltAngle
        };

        // Plunger zone for ball launch (right side, bottom area)
        this.plungerZone = new BABYLON.Vector3(0.35, 0.2, playfieldLength / 2 - 0.1);
    }

    createFlippers() {
        // Main left flipper
        const leftFlipperBody = BABYLON.MeshBuilder.CreateBox('leftFlipperBody', {
            width: 0.35,
            height: 0.08,
            depth: 0.1
        }, this.scene);
        leftFlipperBody.position = new BABYLON.Vector3(-0.2, 0.15, 0.6);
        leftFlipperBody.rotation.z = -Math.PI / 8;

        const flipperMaterial = new BABYLON.StandardMaterial('flipperMat', this.scene);
        flipperMaterial.diffuse = new BABYLON.Color3(1, 0.2, 0.2);
        flipperMaterial.specularColor = new BABYLON.Color3(1, 0.5, 0.5);
        flipperMaterial.specularPower = 32;
        flipperMaterial.emissiveColor = new BABYLON.Color3(0.3, 0.05, 0.05);
        leftFlipperBody.material = flipperMaterial;

        this.flippers.left = {
            mesh: leftFlipperBody,
            baseRotation: -Math.PI / 8,
            activeRotation: 0.3,
            position: new BABYLON.Vector3(-0.2, 0.15, 0.6),
            width: 0.35,
            height: 0.08
        };

        // Main right flipper
        const rightFlipperBody = BABYLON.MeshBuilder.CreateBox('rightFlipperBody', {
            width: 0.35,
            height: 0.08,
            depth: 0.1
        }, this.scene);
        rightFlipperBody.position = new BABYLON.Vector3(0.2, 0.15, 0.6);
        rightFlipperBody.rotation.z = Math.PI / 8;
        rightFlipperBody.material = flipperMaterial;

        this.flippers.right = {
            mesh: rightFlipperBody,
            baseRotation: Math.PI / 8,
            activeRotation: -0.3,
            position: new BABYLON.Vector3(0.2, 0.15, 0.6),
            width: 0.35,
            height: 0.08
        };

        // Upper right flipper for ramp access
        const upperFlipperBody = BABYLON.MeshBuilder.CreateBox('upperFlipperBody', {
            width: 0.25,
            height: 0.07,
            depth: 0.08
        }, this.scene);
        upperFlipperBody.position = new BABYLON.Vector3(0.35, 0.35, -0.2);
        upperFlipperBody.rotation.z = Math.PI / 6;

        const upperFlipperMaterial = new BABYLON.StandardMaterial('upperFlipperMat', this.scene);
        upperFlipperMaterial.diffuse = new BABYLON.Color3(0.2, 0.8, 1);
        upperFlipperMaterial.specularColor = new BABYLON.Color3(0.6, 1, 1);
        upperFlipperMaterial.specularPower = 32;
        upperFlipperMaterial.emissiveColor = new BABYLON.Color3(0.1, 0.2, 0.3);
        upperFlipperBody.material = upperFlipperMaterial;

        this.flippers.upper = {
            mesh: upperFlipperBody,
            baseRotation: Math.PI / 6,
            activeRotation: -0.25,
            position: new BABYLON.Vector3(0.35, 0.35, -0.2),
            width: 0.25,
            height: 0.07
        };
    }

    createBumpers() {
        // Create 4 bumpers in classic pinball layout
        const bumperPositions = [
            new BABYLON.Vector3(-0.3, 0.25, -0.3),
            new BABYLON.Vector3(0.3, 0.25, -0.3),
            new BABYLON.Vector3(0, 0.25, -0.6),
            new BABYLON.Vector3(-0.15, 0.25, 0.1)
        ];

        const bumperMaterial = new BABYLON.StandardMaterial('bumperMat', this.scene);
        bumperMaterial.diffuse = new BABYLON.Color3(1, 1, 0);
        bumperMaterial.emissiveColor = new BABYLON.Color3(0.5, 0.5, 0);
        bumperMaterial.specularColor = new BABYLON.Color3(1, 1, 0.5);

        bumperPositions.forEach((pos, idx) => {
            const bumper = BABYLON.MeshBuilder.CreateSphere('bumper_' + idx, {
                diameter: 0.15,
                segments: 16
            }, this.scene);
            bumper.position = pos;
            bumper.material = bumperMaterial;

            this.bumpers.push({
                mesh: bumper,
                position: pos,
                radius: 0.075,
                hitCooldown: 0
            });
        });
    }

    createTargets() {
        // Create standup targets and drop targets
        const targetPositions = [
            { pos: new BABYLON.Vector3(-0.35, 0.2, -0.5), type: 'standup', name: 't1' },
            { pos: new BABYLON.Vector3(0.35, 0.2, -0.5), type: 'standup', name: 't2' },
            { pos: new BABYLON.Vector3(-0.45, 0.2, 0), type: 'drop', name: 't3' },
            { pos: new BABYLON.Vector3(0.45, 0.2, 0), type: 'drop', name: 't4' }
        ];

        const targetMaterial = new BABYLON.StandardMaterial('targetMat', this.scene);
        targetMaterial.diffuse = new BABYLON.Color3(0, 1, 1);
        targetMaterial.emissiveColor = new BABYLON.Color3(0.2, 0.3, 0.3);
        targetMaterial.specularColor = new BABYLON.Color3(0.5, 1, 1);

        targetPositions.forEach(t => {
            const targetMesh = BABYLON.MeshBuilder.CreateCylinder(t.name, {
                diameter: 0.08,
                height: 0.15,
                tessellation: 12
            }, this.scene);
            targetMesh.position = t.pos;
            targetMesh.material = targetMaterial;

            this.targets.push({
                mesh: targetMesh,
                position: t.pos,
                type: t.type,
                hit: false,
                name: t.name,
                radius: 0.04,
                hitCooldown: 0
            });
        });
    }

    createRamps() {
        // Create simple ramp representations (visual only for now)
        const ramp1Pos = new BABYLON.Vector3(-0.35, 0.4, -0.6);
        const ramp2Pos = new BABYLON.Vector3(0.35, 0.4, -0.6);

        const rampMaterial = new BABYLON.StandardMaterial('rampMat', this.scene);
        rampMaterial.diffuse = new BABYLON.Color3(1, 0.5, 0);
        rampMaterial.emissiveColor = new BABYLON.Color3(0.3, 0.15, 0);

        // Left ramp marker
        const ramp1 = BABYLON.MeshBuilder.CreateCylinder('ramp1', {
            diameter: 0.1,
            height: 0.3
        }, this.scene);
        ramp1.position = ramp1Pos;
        ramp1.material = rampMaterial;

        this.ramps.push({
            mesh: ramp1,
            position: ramp1Pos,
            radius: 0.1,
            completed: false,
            name: 'ramp1'
        });

        // Right ramp marker
        const ramp2 = BABYLON.MeshBuilder.CreateCylinder('ramp2', {
            diameter: 0.1,
            height: 0.3
        }, this.scene);
        ramp2.position = ramp2Pos;
        ramp2.material = rampMaterial;

        this.ramps.push({
            mesh: ramp2,
            position: ramp2Pos,
            radius: 0.1,
            completed: false,
            name: 'ramp2'
        });
    }

    setupLighting() {
        // Ambient light
        const ambient = new BABYLON.HemisphericLight('ambient', new BABYLON.Vector3(0, 1, 0), this.scene);
        ambient.intensity = 0.6;
        ambient.groundColor = new BABYLON.Color3(0, 0, 0.2);

        // Main spotlight on playfield
        const mainLight = new BABYLON.SpotLight('mainLight', new BABYLON.Vector3(0, 2, 0), new BABYLON.Vector3(0, -1, 0), Math.PI / 3, 2, this.scene);
        mainLight.intensity = 1.2;
        mainLight.range = 20;

        // Side accent lights
        const sideLight1 = new BABYLON.PointLight('sideLight1', new BABYLON.Vector3(-0.7, 0.5, 0), this.scene);
        sideLight1.intensity = 0.5;
        sideLight1.range = 3;
        sideLight1.diffuse = new BABYLON.Color3(1, 0.5, 0);

        const sideLight2 = new BABYLON.PointLight('sideLight2', new BABYLON.Vector3(0.7, 0.5, 0), this.scene);
        sideLight2.intensity = 0.5;
        sideLight2.range = 3;
        sideLight2.diffuse = new BABYLON.Color3(0, 1, 1);

        // Glow layer for visual effects
        this.glow = new BABYLON.GlowLayer('glow', this.scene);
        this.targets.forEach(t => this.glow.addIncludedOnlyMesh(t.mesh));
        this.bumpers.forEach(b => this.glow.addIncludedOnlyMesh(b.mesh));
    }

    setupInput() {
        document.addEventListener('keydown', (e) => {
            switch(e.key.toLowerCase()) {
                case 'z': this.keys.leftFlipper = true; break;
                case 'm': this.keys.rightFlipper = true; break;
                case ' ': this.keys.launch = true; e.preventDefault(); break;
                case 'q': this.quitGame(); break;
            }
        });

        document.addEventListener('keyup', (e) => {
            switch(e.key.toLowerCase()) {
                case 'z': this.keys.leftFlipper = false; break;
                case 'm': this.keys.rightFlipper = false; break;
                case ' ': this.keys.launch = false; break;
            }
        });
    }

    launchBall() {
        if (this.gameOver) return;
        if (this.ballsLeft <= 0) {
            this.endGame();
            return;
        }

        const ballRadius = 0.035; // Slightly larger for visibility
        const ballMesh = BABYLON.MeshBuilder.CreateSphere('ball_' + Date.now(), {
            diameter: ballRadius * 2,
            segments: 32
        }, this.scene);

        ballMesh.position = this.plungerZone.clone();

        const ballMaterial = new BABYLON.StandardMaterial('ballMat_' + Date.now(), this.scene);
        ballMaterial.diffuse = new BABYLON.Color3(1, 0.2, 0.2); // Bright red
        ballMaterial.specularColor = new BABYLON.Color3(1, 1, 1);
        ballMaterial.specularPower = 64;
        ballMaterial.emissiveColor = new BABYLON.Color3(0.5, 0.1, 0.1); // Reddish glow
        ballMesh.material = ballMaterial;

        // Add to glow layer for better visibility - with glow intensity
        this.glow.addIncludedOnlyMesh(ballMesh);
        this.glow.intensity = 1.5;

        this.currentBalls.push({
            mesh: ballMesh,
            position: ballMesh.position.clone(),
            velocity: new BABYLON.Vector3(0, 0, 0),
            radius: ballRadius,
            mass: 1,
            launchTime: 0,
            active: true,
            launchPower: 0
        });

        this.launched = false;
    }

    updateFlippers(deltaTime) {
        // Left flipper
        if (this.keys.leftFlipper) {
            this.flippers.left.mesh.rotation.z = this.flippers.left.activeRotation;
        } else {
            this.flippers.left.mesh.rotation.z = this.flippers.left.baseRotation;
        }

        // Right flipper
        if (this.keys.rightFlipper) {
            this.flippers.right.mesh.rotation.z = this.flippers.right.activeRotation;
        } else {
            this.flippers.right.mesh.rotation.z = this.flippers.right.baseRotation;
        }

        // Upper flipper
        if (this.keys.rightFlipper) {
            this.flippers.upper.mesh.rotation.z = this.flippers.upper.activeRotation;
        } else {
            this.flippers.upper.mesh.rotation.z = this.flippers.upper.baseRotation;
        }
    }

    updateBallPhysics(deltaTime) {
        this.currentBalls = this.currentBalls.filter(ball => {
            if (!ball.active) return false;

            // Limit deltaTime to prevent physics instability
            const dt = Math.min(deltaTime, 0.016); // Cap at 60fps worth of time

            // Apply gravity
            ball.velocity.y -= this.gravity * dt;

            // Apply tilt gravity (makes ball roll down the inclined playfield)
            const tiltForce = Math.sin(this.playfield.tiltAngle) * 9;
            ball.velocity.z -= tiltForce * dt;

            // Air resistance / friction
            ball.velocity.x *= this.airResistance;
            ball.velocity.y *= 0.999;
            ball.velocity.z *= this.airResistance;

            // Update position
            ball.position.x += ball.velocity.x * dt;
            ball.position.y += ball.velocity.y * dt;
            ball.position.z += ball.velocity.z * dt;
            ball.mesh.position = ball.position.clone();

            // Playfield collision (playing surface at y = 0)
            if (ball.position.y < ball.radius) {
                ball.position.y = ball.radius;
                ball.velocity.y *= -0.80; // Bounce with energy loss

                // Friction on playfield - higher friction when moving slowly
                const speedXZ = Math.sqrt(ball.velocity.x * ball.velocity.x + ball.velocity.z * ball.velocity.z);
                const frictionFactor = speedXZ > 0.5 ? 0.96 : 0.93;
                ball.velocity.x *= frictionFactor;
                ball.velocity.z *= frictionFactor;

                // Stop ball if velocity is very small
                if (speedXZ < 0.1) {
                    ball.velocity.x *= 0.8;
                    ball.velocity.z *= 0.8;
                }
            }

            // Side wall collisions with some elasticity
            const wallTolerance = this.playfield.width / 2 - ball.radius;
            if (Math.abs(ball.position.x) > wallTolerance) {
                ball.position.x = Math.sign(ball.position.x) * wallTolerance;
                ball.velocity.x *= -0.75; // Bounce
                ball.velocity.y *= 0.95; // Slight vertical dampening on wall hit
            }

            // Back wall collision (behind playfield)
            const backWallZ = -this.playfield.length / 2 - ball.radius;
            if (ball.position.z < backWallZ) {
                ball.position.z = backWallZ;
                ball.velocity.z *= -0.65;
            }

            // Check for drain (ball lost)
            if (ball.position.y < -1.5) {
                ball.mesh.dispose();
                this.ballsLeft--;
                this.updateUI();

                if (this.ballsLeft > 0 && !this.gameOver) {
                    setTimeout(() => this.launchBall(), 800);
                } else if (this.ballsLeft <= 0) {
                    setTimeout(() => this.endGame(), 800);
                }
                return false;
            }

            return true;
        });
    }

    updateCollisions(deltaTime) {
        this.currentBalls.forEach(ball => {
            const ballPos = ball.position;

            // Bumper collisions
            this.bumpers.forEach(bumper => {
                const distance = BABYLON.Vector3.Distance(ballPos, bumper.position);
                if (distance < bumper.radius + ball.radius && bumper.hitCooldown <= 0) {
                    const direction = BABYLON.Vector3.Normalize(
                        BABYLON.Vector3.Subtract(ballPos, bumper.position)
                    );
                    ball.velocity = new BABYLON.Vector3(direction.x * 8, direction.y * 8, direction.z * 8);

                    this.addScore(250 * this.scoreMultiplier);
                    bumper.hitCooldown = 0.2;
                    this.createBumperEffect(bumper.position);
                }
            });

            // Target collisions
            this.targets.forEach(target => {
                const distance = BABYLON.Vector3.Distance(ballPos, target.position);
                if (distance < target.radius + ball.radius && target.hitCooldown <= 0) {
                    if (!target.hit) {
                        target.hit = true;
                        this.addScore(500 * this.scoreMultiplier);
                        this.createTargetEffect(target.position);
                        this.checkMultiballCondition();
                    }
                    target.hitCooldown = 0.3;

                    // Bounce ball away
                    const direction = BABYLON.Vector3.Normalize(
                        BABYLON.Vector3.Subtract(ballPos, target.position)
                    );
                    ball.velocity = new BABYLON.Vector3(direction.x * 3, direction.y * 3, direction.z * 3);
                }
            });

            // Ramp collisions
            this.ramps.forEach(ramp => {
                const distance = BABYLON.Vector3.Distance(ballPos, ramp.position);
                if (distance < ramp.radius + ball.radius) {
                    if (!ramp.completed) {
                        ramp.completed = true;
                        this.addScore(1000 * this.scoreMultiplier);
                        this.createTargetEffect(ramp.position);
                        this.checkMultiballCondition();
                    }
                    const direction = BABYLON.Vector3.Normalize(
                        BABYLON.Vector3.Subtract(ballPos, ramp.position)
                    );
                    ball.velocity = new BABYLON.Vector3(direction.x * 5, direction.y * 5, direction.z * 5);
                }
            });

            // Flipper collisions
            this.checkFlipperCollision(ball, this.flippers.left, 4);
            this.checkFlipperCollision(ball, this.flippers.right, 4);
            this.checkFlipperCollision(ball, this.flippers.upper, 4);
        });

        // Update cooldowns
        this.bumpers.forEach(b => { b.hitCooldown -= deltaTime; });
        this.targets.forEach(t => { t.hitCooldown -= deltaTime; });
    }

    checkFlipperCollision(ball, flipper, force) {
        // Simplified flipper collision
        const flipperPos = flipper.mesh.position;
        const distance = BABYLON.Vector3.Distance(ball.position, flipperPos);

        if (distance < 0.15) {
            const direction = BABYLON.Vector3.Normalize(
                BABYLON.Vector3.Subtract(ball.position, flipperPos)
            );

            // Boost velocity based on flipper rotation
            let boostFactor = 1;
            if (Math.abs(flipper.mesh.rotation.z - flipper.activeRotation) < 0.1) {
                boostFactor = 1.5;
            }

            ball.velocity = new BABYLON.Vector3(direction.x * force * boostFactor, direction.y * force * boostFactor, direction.z * force * boostFactor);
        }
    }

    checkMultiballCondition() {
        const targetsHit = this.targets.filter(t => t.hit).length;
        const rampsCompleted = this.ramps.filter(r => r.completed).length;

        if ((targetsHit >= 3 || rampsCompleted >= 2) && !this.isMultiball && this.currentBalls.length === 1) {
            this.startMultiball();
        }
    }

    startMultiball() {
        this.isMultiball = true;
        this.scoreMultiplier = 5;
        document.getElementById('multiballStatus').classList.remove('hidden');

        // Add 2 more balls
        for (let i = 0; i < 2; i++) {
            setTimeout(() => this.launchBall(), i * 300);
        }

        // End multiball after 30 seconds
        setTimeout(() => {
            if (this.isMultiball) {
                this.endMultiball();
            }
        }, 30000);
    }

    endMultiball() {
        this.isMultiball = false;
        this.scoreMultiplier = 1;
        document.getElementById('multiballStatus').classList.add('hidden');
    }

    updateLaunch(deltaTime) {
        if (this.currentBalls.length === 0) return;

        const launchBall = this.currentBalls[0];

        // Only launch the first ball if it hasn't been launched yet and is in the plunger zone
        const isInPlungerZone = BABYLON.Vector3.Distance(launchBall.position, this.plungerZone) < 0.3;

        if (this.keys.launch && !this.launched && isInPlungerZone) {
            launchBall.launchTime += deltaTime;
            const power = Math.min(launchBall.launchTime, 0.4) / 0.4; // Extended to 0.4 seconds
            launchBall.launchPower = power;
            launchBall.velocity.z = -15 * power; // Increased launch force
        } else if (!this.keys.launch && this.currentBalls.length > 0 && isInPlungerZone) {
            if (launchBall.launchTime > 0.05) { // Only register if pressed for at least 50ms
                this.launched = true;
                launchBall.launchTime = 0;
                launchBall.launchPower = 0;
            } else if (launchBall.launchTime > 0) {
                launchBall.launchTime = 0;
                launchBall.velocity.z = 0;
            }
        }
    }

    addScore(points) {
        this.score += points;
        this.updateUI();
    }

    createBumperEffect(position) {
        const light = new BABYLON.PointLight('bumpLight_' + Date.now(), position, this.scene);
        light.intensity = 2;
        light.range = 1;
        light.diffuse = new BABYLON.Color3(1, 1, 0);
        setTimeout(() => light.dispose(), 200);
    }

    createTargetEffect(position) {
        const light = new BABYLON.PointLight('targetLight_' + Date.now(), position, this.scene);
        light.intensity = 1.5;
        light.range = 1;
        light.diffuse = new BABYLON.Color3(0, 1, 1);
        setTimeout(() => light.dispose(), 150);
    }

    updateUI() {
        const scoreStr = this.score.toString().padStart(7, '0');
        const highScoreStr = this.highScore.toString().padStart(7, '0');

        document.getElementById('scoreDisplay').textContent = scoreStr;
        document.getElementById('highScoreDisplay').textContent = highScoreStr;
        document.getElementById('ballsLeft').textContent = this.ballsLeft;
    }

    endGame() {
        this.gameOver = true;

        // Update high score
        if (this.score > this.highScore) {
            this.highScore = this.score;
            localStorage.setItem('pinballHighScore', this.highScore);
            document.getElementById('newHighScore').style.display = 'block';
        }

        document.getElementById('finalScore').textContent = this.score.toString().padStart(7, '0');
        document.getElementById('gameOverScreen').style.display = 'block';
    }

    quitGame() {
        if (confirm('Quit game? Your current score will not be saved.')) {
            location.reload();
        }
    }

    render() {
        const deltaTime = Math.min(this.engine.getDeltaTime() / 1000, 0.016); // Cap at 60fps

        if (!this.gameOver) {
            this.updateFlippers(deltaTime);
            this.updateBallPhysics(deltaTime);
            this.updateCollisions(deltaTime);
            this.updateLaunch(deltaTime);
        }

        this.scene.render();
    }
}

// Initialize game when page loads
window.addEventListener('DOMContentLoaded', () => {
    new PinballGame();
});
