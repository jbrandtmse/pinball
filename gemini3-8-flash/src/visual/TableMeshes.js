import * as THREE from 'three';
import { generatePlayfieldTexture } from './PlayfieldArt.js';

/**
 * TableMeshes - 3D Playfield, Flippers, Bumpers, Ramps, Wireform Habitrails, and Balls
 * Maps 2D table coordinates (520mm x 1160mm) onto 6.5° inclined 3D plane
 */
export class TableMeshes {
  constructor(physicsWorld) {
    this.physics = physicsWorld;
    this.group = new THREE.Group();

    // Table inclination: 6.5 degrees
    this.tableAngle = 0.1134; // radians (~6.5 deg)
    this.tableWidth = 520.0;
    this.tableLength = 1160.0;

    // Component meshes for animation sync
    this.flipperRoots = { left: null, right: null };
    this.flipperBats = { left: null, right: null };
    this.bumperMeshes = [];
    this.dropTargetMeshes = [];
    this.ballMeshes = new Map();
    this.plungerRodMesh = null;

    // Point lights for active illumination
    this.lights = [];

    this.initPlayfield();
    this.initFlippers();
    this.initBumpers();
    this.initSlingshots();
    this.initDropTargets();
    this.initRampsAndWireforms();
    this.initGuidesAndPosts();
    this.initPlungerMesh();
  }

  toWorldCoords(tx, ty, tz = 0) {
    const localX = tx - this.tableWidth / 2;
    const localZ = ty - this.tableLength / 2;

    const sinA = Math.sin(this.tableAngle);
    const cosA = Math.cos(this.tableAngle);

    const worldX = localX;
    const worldY = -localZ * sinA + tz * cosA;
    const worldZ = localZ * cosA + tz * sinA;

    return new THREE.Vector3(worldX, worldY, worldZ);
  }

  initPlayfield() {
    // 2048x4096 High-res arcade texture
    const canvas = generatePlayfieldTexture(2048, 4096);
    const texture = new THREE.CanvasTexture(canvas);
    texture.anisotropy = 8;

    const playfieldMat = new THREE.MeshStandardMaterial({
      map: texture,
      roughness: 0.25,
      metalness: 0.05,
      side: THREE.DoubleSide
    });

    const geom = new THREE.PlaneGeometry(this.tableWidth, this.tableLength);
    const playfield = new THREE.Mesh(geom, playfieldMat);
    playfield.rotation.x = -Math.PI / 2 + this.tableAngle;
    playfield.position.set(0, 0.5, 0);
    playfield.receiveShadow = true;
    this.group.add(playfield);

    // Playfield Wooden Substrate Base
    const woodMat = new THREE.MeshStandardMaterial({ color: 0x0f172a, roughness: 0.8 });
    const baseGeom = new THREE.BoxGeometry(this.tableWidth, 18, this.tableLength);
    const base = new THREE.Mesh(baseGeom, woodMat);
    base.rotation.x = this.tableAngle;
    base.position.set(0, -12, 0);
    base.receiveShadow = true;
    this.group.add(base);
  }

  initFlippers() {
    const batMat = new THREE.MeshStandardMaterial({ color: 0xf8fafc, roughness: 0.2, metalness: 0.1 });
    const rubberMat = new THREE.MeshStandardMaterial({ color: 0xef4444, roughness: 0.5, metalness: 0.05 });
    const screwMat = new THREE.MeshStandardMaterial({ color: 0xe2e8f0, metalness: 0.95, roughness: 0.1 });

    const createFlipperAssembly = (isLeft) => {
      const rootGroup = new THREE.Group();
      rootGroup.rotation.x = this.tableAngle;

      const batPivot = new THREE.Group();
      rootGroup.add(batPivot);

      const shape = new THREE.Shape();
      const rBase = 12.0;
      const rTip = 6.0;
      const len = 74.0;

      shape.absarc(0, 0, rBase, Math.PI / 2, -Math.PI / 2, false);
      shape.lineTo(len, -rTip);
      shape.absarc(len, 0, rTip, -Math.PI / 2, Math.PI / 2, false);
      shape.lineTo(0, rBase);

      const extrudeSettings = { depth: 16, bevelEnabled: true, bevelThickness: 2, bevelSize: 2, bevelSegments: 3 };
      const geom = new THREE.ExtrudeGeometry(shape, extrudeSettings);
      geom.center();
      geom.translate(len / 2, 0, 0);

      const batMesh = new THREE.Mesh(geom, batMat);
      batMesh.rotation.x = -Math.PI / 2;
      batMesh.position.y = 9;
      batMesh.castShadow = true;
      batPivot.add(batMesh);

      // Red rubber band
      const rubberGeom = new THREE.BoxGeometry(len - 4, 12, 3);
      const rubberMesh = new THREE.Mesh(rubberGeom, rubberMat);
      rubberMesh.position.set(len / 2, 9, (isLeft ? 1 : -1) * (rBase - 1));
      batPivot.add(rubberMesh);

      // Pivot Cap
      const capGeom = new THREE.CylinderGeometry(8, 8, 4, 16);
      const cap = new THREE.Mesh(capGeom, screwMat);
      cap.position.set(0, 18, 0);
      batPivot.add(cap);

      return { root: rootGroup, bat: batPivot };
    };

    const left = createFlipperAssembly(true);
    this.flipperRoots.left = left.root;
    this.flipperBats.left = left.bat;
    this.group.add(left.root);

    const right = createFlipperAssembly(false);
    this.flipperRoots.right = right.root;
    this.flipperBats.right = right.bat;
    this.group.add(right.root);
  }

  initBumpers() {
    const bumperCapMat = new THREE.MeshStandardMaterial({
      color: 0xff7700,
      emissive: 0xff4400,
      emissiveIntensity: 0.6,
      roughness: 0.2,
      metalness: 0.2
    });
    const ringMat = new THREE.MeshStandardMaterial({ color: 0xdddddd, metalness: 0.9, roughness: 0.1 });

    for (const b of this.physics.bumpers) {
      const bGroup = new THREE.Group();

      const baseGeom = new THREE.CylinderGeometry(28, 30, 6, 24);
      const base = new THREE.Mesh(baseGeom, ringMat);
      base.position.y = 3;
      base.castShadow = true;
      bGroup.add(base);

      const waistGeom = new THREE.CylinderGeometry(20, 24, 14, 24);
      const waist = new THREE.Mesh(waistGeom, ringMat);
      waist.position.y = 12;
      bGroup.add(waist);

      const capGeom = new THREE.CylinderGeometry(30, 24, 12, 24);
      const cap = new THREE.Mesh(capGeom, bumperCapMat);
      cap.position.y = 22;
      cap.castShadow = true;
      bGroup.add(cap);

      const jewelGeom = new THREE.SphereGeometry(8, 16, 12);
      const jewelMat = new THREE.MeshStandardMaterial({ color: 0x00ffff, emissive: 0x00ffff, emissiveIntensity: 0.9 });
      const jewel = new THREE.Mesh(jewelGeom, jewelMat);
      jewel.position.y = 28;
      bGroup.add(jewel);

      const pLight = new THREE.PointLight(0xff7700, 1.5, 160);
      pLight.position.y = 35;
      bGroup.add(pLight);
      b.pointLight = pLight;

      bGroup.rotation.x = this.tableAngle;
      const wPos = this.toWorldCoords(b.pos.x, b.pos.y, 0);
      bGroup.position.copy(wPos);

      this.bumperMeshes.push(bGroup);
      this.group.add(bGroup);
    }
  }

  initSlingshots() {
    const shieldMat = new THREE.MeshStandardMaterial({
      color: 0x38bdf8,
      transparent: true,
      opacity: 0.85,
      roughness: 0.1,
      metalness: 0.1
    });
    const postMat = new THREE.MeshStandardMaterial({ color: 0xffffff, roughness: 0.4 });

    for (const s of this.physics.slingshots) {
      const postGeom = new THREE.CylinderGeometry(5, 5, 20, 12);
      const p1Mesh = new THREE.Mesh(postGeom, postMat);
      p1Mesh.position.copy(this.toWorldCoords(s.p1.x, s.p1.y, 10));
      p1Mesh.rotation.x = this.tableAngle;
      this.group.add(p1Mesh);

      const p2Mesh = new THREE.Mesh(postGeom, postMat);
      p2Mesh.position.copy(this.toWorldCoords(s.p2.x, s.p2.y, 10));
      p2Mesh.rotation.x = this.tableAngle;
      this.group.add(p2Mesh);

      const shape = new THREE.Shape();
      shape.moveTo(0, 0);
      shape.lineTo(s.len, 0);
      shape.lineTo(s.len * 0.4, (s.name.includes('left') ? -35 : 35));
      shape.closePath();

      const extrude = new THREE.ExtrudeGeometry(shape, { depth: 3, bevelEnabled: true, bevelThickness: 1, bevelSize: 1 });
      const cover = new THREE.Mesh(extrude, shieldMat);
      cover.rotation.x = -Math.PI / 2 + this.tableAngle;
      const center = s.p1.clone().add(s.p2).multiplyScalar(0.5);
      cover.position.copy(this.toWorldCoords(center.x, center.y, 22));
      this.group.add(cover);

      const pLight = new THREE.PointLight(0xff9900, 0.6, 120);
      pLight.position.copy(this.toWorldCoords(center.x, center.y, 16));
      this.group.add(pLight);
      s.pointLight = pLight;
    }
  }

  initDropTargets() {
    const targetMat = new THREE.MeshStandardMaterial({
      color: 0x00f5ff,
      emissive: 0x0099bb,
      emissiveIntensity: 0.5,
      metalness: 0.4,
      roughness: 0.25
    });

    for (const target of this.physics.dropTargets.targets) {
      const tGeom = new THREE.BoxGeometry(target.width, 24, 5);
      const mesh = new THREE.Mesh(tGeom, targetMat);
      mesh.rotation.x = this.tableAngle;
      mesh.rotation.y = target.angle;
      target.mesh = mesh;
      this.dropTargetMeshes.push({ target, mesh });
      this.group.add(mesh);
    }
  }

  initRampsAndWireforms() {
    const wireMat = new THREE.MeshStandardMaterial({
      color: 0xf1f5f9,
      metalness: 0.98,
      roughness: 0.08
    });

    const createWireform = (points) => {
      const worldPoints = points.map(p => this.toWorldCoords(p[0], p[1], p[2] + 12));
      const curve = new THREE.CatmullRomCurve3(worldPoints);
      const tubeGeom = new THREE.TubeGeometry(curve, 64, 2.4, 8, false);
      const wireMesh = new THREE.Mesh(tubeGeom, wireMat);
      wireMesh.castShadow = true;
      return wireMesh;
    };

    this.group.add(createWireform(this.physics.leftRamp.pathPoints));
    this.group.add(createWireform(this.physics.rightRamp.pathPoints));

    // Clear Acrylic Ramps at entrances
    const rampMat = new THREE.MeshPhysicalMaterial({
      color: 0x38bdf8,
      transparent: true,
      opacity: 0.5,
      roughness: 0.1,
      metalness: 0.1,
      transmission: 0.6
    });

    const createRampFlap = (x, y) => {
      const flapGeom = new THREE.BoxGeometry(42, 65, 4);
      const flap = new THREE.Mesh(flapGeom, rampMat);
      flap.rotation.x = -Math.PI / 2 + this.tableAngle + 0.28;
      flap.position.copy(this.toWorldCoords(x, y, 14));
      return flap;
    };

    this.group.add(createRampFlap(130, 410));
    this.group.add(createRampFlap(380, 410));
  }

  initGuidesAndPosts() {
    const metalMat = new THREE.MeshStandardMaterial({ color: 0xe2e8f0, metalness: 0.95, roughness: 0.12 });
    const postMat = new THREE.MeshStandardMaterial({ color: 0xfacc15, roughness: 0.35 });

    for (const c of this.physics.colliders) {
      if (c.name.includes('wall') || c.name.includes('divider') || c.name.includes('guide')) {
        const wP1 = this.toWorldCoords(c.p1.x, c.p1.y, 8);
        const wP2 = this.toWorldCoords(c.p2.x, c.p2.y, 8);

        const edge = new THREE.Vector3().subVectors(wP2, wP1);
        const len = edge.length();
        const geom = new THREE.BoxGeometry(4, 18, len);
        const rail = new THREE.Mesh(geom, metalMat);

        rail.position.copy(wP1).addScaledVector(edge, 0.5);
        rail.quaternion.setFromUnitVectors(new THREE.Vector3(0, 0, 1), edge.normalize());
        rail.castShadow = true;
        this.group.add(rail);
      }
    }

    for (const p of this.physics.posts) {
      const pGeom = new THREE.CylinderGeometry(p.radius, p.radius, 18, 12);
      const post = new THREE.Mesh(pGeom, postMat);
      post.rotation.x = this.tableAngle;
      post.position.copy(this.toWorldCoords(p.center.x, p.center.y, 9));
      post.castShadow = true;
      this.group.add(post);
    }
  }

  initPlungerMesh() {
    const rodMat = new THREE.MeshStandardMaterial({ color: 0xcfd8dc, metalness: 0.95, roughness: 0.15 });
    const rodGeom = new THREE.CylinderGeometry(4, 4, 100, 12);
    this.plungerRodMesh = new THREE.Mesh(rodGeom, rodMat);
    this.plungerRodMesh.rotation.x = -Math.PI / 2 + this.tableAngle;
    this.group.add(this.plungerRodMesh);
  }

  getOrCreateBallMesh(ball) {
    let mesh = this.ballMeshes.get(ball.id);
    if (!mesh) {
      const ballMat = new THREE.MeshStandardMaterial({
        color: 0xffffff,
        metalness: 0.98,
        roughness: 0.04
      });
      const geom = new THREE.SphereGeometry(ball.radius, 32, 24);
      mesh = new THREE.Mesh(geom, ballMat);
      mesh.castShadow = true;
      this.ballMeshes.set(ball.id, mesh);
      this.group.add(mesh);
      ball.mesh = mesh;
    }
    return mesh;
  }

  update() {
    // 1. Sync Flippers
    const leftW = this.toWorldCoords(this.physics.leftFlipper.pivot.x, this.physics.leftFlipper.pivot.y, 0);
    this.flipperRoots.left.position.copy(leftW);
    this.flipperBats.left.rotation.y = -this.physics.leftFlipper.currentAngle;

    const rightW = this.toWorldCoords(this.physics.rightFlipper.pivot.x, this.physics.rightFlipper.pivot.y, 0);
    this.flipperRoots.right.position.copy(rightW);
    this.flipperBats.right.rotation.y = -this.physics.rightFlipper.currentAngle;

    // 2. Sync Drop Targets
    for (const item of this.dropTargetMeshes) {
      const dropY = item.target.isDropped ? -14 : 6;
      const wPos = this.toWorldCoords(item.target.pos.x, item.target.pos.y, dropY);
      item.mesh.position.copy(wPos);
    }

    // 3. Sync Plunger
    const pPull = this.physics.plunger.currentPull * this.physics.plunger.maxPull;
    const pPos = this.toWorldCoords(this.physics.plunger.restPos.x, this.physics.plunger.restPos.y + pPull + 40, 10);
    this.plungerRodMesh.position.copy(pPos);

    // 4. Sync Balls
    for (const ball of this.physics.balls) {
      const bMesh = this.getOrCreateBallMesh(ball);
      if (!ball.active || ball.state === 'DRAINED') {
        bMesh.visible = false;
        continue;
      }
      bMesh.visible = true;

      const wPos = this.toWorldCoords(ball.pos.x, ball.pos.y, ball.z + ball.radius);
      bMesh.position.copy(wPos);

      const speed = ball.vel.length();
      if (speed > 10) {
        bMesh.rotation.x += ball.vel.y * 0.001;
        bMesh.rotation.z -= ball.vel.x * 0.001;
      }
    }
  }
}
