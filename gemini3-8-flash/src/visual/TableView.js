import * as THREE from 'three';
import { CabinetMesh } from './CabinetMesh.js';
import { TableMeshes } from './TableMeshes.js';
import { InsertsMesh } from './InsertsMesh.js';

/**
 * TableView - Three.js WebGL Pinball Scene Orchestrator
 * Manages PBR materials, shadows, camera presets, and rendering loop.
 */
export class TableView {
  constructor(container, dmdCanvas, physicsWorld) {
    this.container = container;
    this.dmdCanvas = dmdCanvas;
    this.physics = physicsWorld;

    // Camera Views: 'PLAYER', 'ACTION', 'OVERVIEW', 'CABINET'
    this.currentViewMode = 'PLAYER';
    this.cameraPresets = {
      PLAYER: {
        pos: new THREE.Vector3(0, 640, 780),
        target: new THREE.Vector3(0, -20, 60),
        fov: 50
      },
      ACTION: {
        pos: new THREE.Vector3(0, 520, 620),
        target: new THREE.Vector3(0, 30, 20),
        fov: 52
      },
      OVERVIEW: {
        pos: new THREE.Vector3(0, 1260, 80),
        target: new THREE.Vector3(0, -10, 0),
        fov: 46
      },
      CABINET: {
        pos: new THREE.Vector3(0, 700, 1350),
        target: new THREE.Vector3(0, 150, -120),
        fov: 46
      }
    };

    this.initThree();
    this.initScene();
    this.setupLighting();

    window.addEventListener('resize', () => this.onResize());
  }

  initThree() {
    this.scene = new THREE.Scene();
    this.scene.background = new THREE.Color(0x060911);

    const aspect = this.container.clientWidth / this.container.clientHeight;
    this.camera = new THREE.PerspectiveCamera(50, aspect, 10, 5000);
    this.applyCameraPreset('PLAYER', true);

    this.renderer = new THREE.WebGLRenderer({ antialias: true, powerPreference: 'high-performance' });
    this.renderer.setSize(this.container.clientWidth, this.container.clientHeight);
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    this.renderer.shadowMap.enabled = true;
    this.renderer.shadowMap.type = THREE.PCFShadowMap;
    this.renderer.toneMapping = THREE.ACESFilmicToneMapping;
    this.renderer.toneMappingExposure = 1.15;

    this.container.appendChild(this.renderer.domElement);
  }

  initScene() {
    // 1. 3D Cabinet, Backbox, Translite, and Legs
    this.cabinet = new CabinetMesh(this.dmdCanvas);
    this.scene.add(this.cabinet.group);

    // 2. Playfield, Flippers, Bumpers, Ramps, and Balls
    this.tableMeshes = new TableMeshes(this.physics);
    this.scene.add(this.tableMeshes.group);

    // 3. Under-Playfield Inserts
    this.inserts = new InsertsMesh(this.tableMeshes);
    this.scene.add(this.inserts.group);

    // Subtle dark environment floor
    const floorMat = new THREE.MeshStandardMaterial({ color: 0x05070c, roughness: 0.9 });
    const floorGeom = new THREE.PlaneGeometry(3000, 3000);
    const floor = new THREE.Mesh(floorGeom, floorMat);
    floor.rotation.x = -Math.PI / 2;
    floor.position.y = -760;
    floor.receiveShadow = true;
    this.scene.add(floor);
  }

  setupLighting() {
    // 1. General Illumination (GI) - Warm incandescent top, cool ambient bottom
    const hemi = new THREE.HemisphereLight(0xfff4e6, 0x1e293b, 2.4);
    this.scene.add(hemi);

    // 2. Main Directional Playfield Key Light
    const dirLight = new THREE.DirectionalLight(0xffffff, 2.2);
    dirLight.position.set(0, 1100, 350);
    dirLight.target.position.set(0, 0, 0);
    dirLight.castShadow = true;
    dirLight.shadow.mapSize.width = 2048;
    dirLight.shadow.mapSize.height = 2048;
    dirLight.shadow.bias = -0.0005;
    this.scene.add(dirLight);
    this.scene.add(dirLight.target);

    // 3. Playfield Overhead Spotlight
    const spot1 = new THREE.SpotLight(0xffeedd, 2.5, 2200, Math.PI / 3, 0.4, 0.8);
    spot1.position.set(0, 950, 250);
    spot1.target.position.set(0, 50, 0);
    this.scene.add(spot1);
    this.scene.add(spot1.target);

    // 4. Apron Lower Spotlight
    const spot2 = new THREE.SpotLight(0xaaccff, 1.8, 1400, Math.PI / 4, 0.5, 1.0);
    spot2.position.set(0, 700, 750);
    spot2.target.position.set(0, 0, 450);
    this.scene.add(spot2);
    this.scene.add(spot2.target);

    // 5. Backbox Glow
    const bbLight = new THREE.PointLight(0xffaa44, 2.0, 700);
    bbLight.position.set(0, 420, -520);
    this.scene.add(bbLight);

    // 6. Playfield Side Rail GI Accents (Left & Right)
    const giLeft = new THREE.PointLight(0x00f0ff, 1.0, 350);
    giLeft.position.set(-240, 40, -100);
    this.scene.add(giLeft);

    const giRight = new THREE.PointLight(0xff9900, 1.0, 350);
    giRight.position.set(240, 40, -100);
    this.scene.add(giRight);
  }

  applyCameraPreset(presetName, immediate = false) {
    const preset = this.cameraPresets[presetName];
    if (!preset) return;
    this.currentViewMode = presetName;

    if (immediate) {
      this.camera.position.copy(preset.pos);
      this.camera.fov = preset.fov;
      this.camera.updateProjectionMatrix();
      this.camera.lookAt(preset.target);
    }
  }

  cycleCamera() {
    const modes = ['PLAYER', 'ACTION', 'OVERVIEW', 'CABINET'];
    const nextIdx = (modes.indexOf(this.currentViewMode) + 1) % modes.length;
    this.applyCameraPreset(modes[nextIdx]);
  }

  onResize() {
    if (!this.container) return;
    const width = this.container.clientWidth;
    const height = this.container.clientHeight;
    this.camera.aspect = width / height;
    this.camera.updateProjectionMatrix();
    this.renderer.setSize(width, height);
  }

  update(dt, rulesState, shakeOffset = { x: 0, y: 0 }) {
    // 1. Update Cabinet & DMD Texture
    this.cabinet.update();

    // 2. Update 3D Table Meshes (flippers, balls, plunger, bumpers)
    this.tableMeshes.update();

    // 3. Update Under-Playfield Inserts
    this.inserts.update(dt, rulesState);

    // 4. Update Camera with smooth interpolation & Action Cam ball tracking
    const preset = this.cameraPresets[this.currentViewMode];
    let targetPos = preset.pos.clone();
    let lookTarget = preset.target.clone();

    if (this.currentViewMode === 'ACTION') {
      // Find lead active ball
      const activeBall = this.physics.balls.find(b => b.state === 'ACTIVE' || b.state === 'IN_RAMP');
      if (activeBall) {
        const ballWorld = this.tableMeshes.toWorldCoords(activeBall.pos.x, activeBall.pos.y, 0);
        // Track ball along table length
        targetPos.z = Math.min(800, Math.max(300, ballWorld.z + 450));
        lookTarget.z = ballWorld.z;
        lookTarget.x = ballWorld.x * 0.4;
      }
    }

    // Apply shake
    targetPos.x += shakeOffset.x;
    targetPos.y += shakeOffset.y;

    // Smooth camera lag
    this.camera.position.lerp(targetPos, 0.08);
    this.camera.lookAt(lookTarget);

    // Render Three.js frame
    this.renderer.render(this.scene, this.camera);
  }
}
