import * as THREE from 'three';

/**
 * CabinetMesh - Williams WPC Pinball Cabinet, Backbox, Translite, and Legs
 * Built with a hollow interior box so the playfield sits inside cleanly without obstruction.
 */
export class CabinetMesh {
  constructor(dmdCanvas) {
    this.group = new THREE.Group();
    this.dmdCanvas = dmdCanvas;
    this.dmdTexture = null;
    this.dmdMaterial = null;

    this.buildCabinet();
    this.buildBackbox();
    this.buildLegs();
    this.buildCoinDoor();
  }

  buildCabinet() {
    const cabWidth = 560;
    const cabLength = 1200;
    const cabHeight = 320;
    const wallThick = 18;

    const cabMat = new THREE.MeshStandardMaterial({
      color: 0x0f172a,
      roughness: 0.5,
      metalness: 0.15
    });

    // 1. Left Cabinet Wall
    const leftWallGeom = new THREE.BoxGeometry(wallThick, cabHeight, cabLength);
    const leftWall = new THREE.Mesh(leftWallGeom, cabMat);
    leftWall.position.set(-cabWidth / 2 + wallThick / 2, -140, 0);
    leftWall.castShadow = true;
    leftWall.receiveShadow = true;
    this.group.add(leftWall);

    // 2. Right Cabinet Wall
    const rightWallGeom = new THREE.BoxGeometry(wallThick, cabHeight, cabLength);
    const rightWall = new THREE.Mesh(rightWallGeom, cabMat);
    rightWall.position.set(cabWidth / 2 - wallThick / 2, -140, 0);
    rightWall.castShadow = true;
    rightWall.receiveShadow = true;
    this.group.add(rightWall);

    // 3. Front Lockdown Wall
    const frontWallGeom = new THREE.BoxGeometry(cabWidth, cabHeight, wallThick);
    const frontWall = new THREE.Mesh(frontWallGeom, cabMat);
    frontWall.position.set(0, -140, cabLength / 2 - wallThick / 2);
    frontWall.castShadow = true;
    this.group.add(frontWall);

    // 4. Back Wall
    const backWallGeom = new THREE.BoxGeometry(cabWidth, cabHeight, wallThick);
    const backWall = new THREE.Mesh(backWallGeom, cabMat);
    backWall.position.set(0, -140, -cabLength / 2 + wallThick / 2);
    backWall.castShadow = true;
    this.group.add(backWall);

    // 5. Bottom Floor
    const floorGeom = new THREE.BoxGeometry(cabWidth, wallThick, cabLength);
    const floor = new THREE.Mesh(floorGeom, cabMat);
    floor.position.set(0, -140 - cabHeight / 2 + wallThick / 2, 0);
    floor.receiveShadow = true;
    this.group.add(floor);

    // Chrome Side Rails along top of side walls
    const railMat = new THREE.MeshStandardMaterial({
      color: 0xe2e8f0,
      metalness: 0.95,
      roughness: 0.12
    });
    const railGeom = new THREE.BoxGeometry(wallThick + 4, 18, cabLength);

    const leftRail = new THREE.Mesh(railGeom, railMat);
    leftRail.position.set(-cabWidth / 2 + wallThick / 2, 22, 0);
    this.group.add(leftRail);

    const rightRail = new THREE.Mesh(railGeom, railMat);
    rightRail.position.set(cabWidth / 2 - wallThick / 2, 22, 0);
    this.group.add(rightRail);

    // Chrome Lockdown Bar (Front Top)
    const lockdownGeom = new THREE.BoxGeometry(cabWidth + 16, 26, 48);
    const lockdown = new THREE.Mesh(lockdownGeom, railMat);
    lockdown.position.set(0, 24, cabLength / 2 - 16);
    this.group.add(lockdown);
  }

  buildBackbox() {
    const bbWidth = 620;
    const bbHeight = 650;
    const bbDepth = 240;

    // Backbox wooden cabinet
    const bbMat = new THREE.MeshStandardMaterial({
      color: 0x090d16,
      roughness: 0.6,
      metalness: 0.1
    });
    const bbGeom = new THREE.BoxGeometry(bbWidth, bbHeight, bbDepth);
    const backbox = new THREE.Mesh(bbGeom, bbMat);
    backbox.position.set(0, 420, -640);
    backbox.castShadow = true;
    this.group.add(backbox);

    // Backglass Translite with High-Energy Art
    const transliteCanvas = this.createTransliteArt(1024, 512);
    const transliteTex = new THREE.CanvasTexture(transliteCanvas);
    const transliteMat = new THREE.MeshStandardMaterial({
      map: transliteTex,
      emissive: 0xffeedd,
      emissiveMap: transliteTex,
      emissiveIntensity: 0.55,
      roughness: 0.15
    });
    const transliteGeom = new THREE.PlaneGeometry(bbWidth - 30, bbHeight * 0.58);
    const translite = new THREE.Mesh(transliteGeom, transliteMat);
    translite.position.set(0, 520, -640 + bbDepth / 2 + 2);
    this.group.add(translite);

    // Speaker Panel & DMD Housing
    const panelMat = new THREE.MeshStandardMaterial({ color: 0x111622, roughness: 0.8 });
    const panelGeom = new THREE.PlaneGeometry(bbWidth - 30, bbHeight * 0.36);
    const panel = new THREE.Mesh(panelGeom, panelMat);
    panel.position.set(0, 235, -640 + bbDepth / 2 + 2);
    this.group.add(panel);

    // Speaker Grilles
    const speakerMat = new THREE.MeshStandardMaterial({ color: 0x242d3d, roughness: 0.9 });
    const spkGeom = new THREE.CircleGeometry(48, 24);
    const spkLeft = new THREE.Mesh(spkGeom, speakerMat);
    spkLeft.position.set(-215, 235, -640 + bbDepth / 2 + 4);
    this.group.add(spkLeft);

    const spkRight = new THREE.Mesh(spkGeom, speakerMat);
    spkRight.position.set(215, 235, -640 + bbDepth / 2 + 4);
    this.group.add(spkRight);

    // 128x32 DMD Screen in Backbox
    if (this.dmdCanvas) {
      this.dmdTexture = new THREE.CanvasTexture(this.dmdCanvas);
      this.dmdTexture.minFilter = THREE.LinearFilter;
      this.dmdTexture.magFilter = THREE.LinearFilter;

      this.dmdMaterial = new THREE.MeshBasicMaterial({
        map: this.dmdTexture,
        transparent: false
      });

      const dmdGeom = new THREE.PlaneGeometry(280, 75);
      const dmdMesh = new THREE.Mesh(dmdGeom, this.dmdMaterial);
      dmdMesh.position.set(0, 235, -640 + bbDepth / 2 + 4);
      this.group.add(dmdMesh);
    }
  }

  createTransliteArt(width, height) {
    const canvas = document.createElement('canvas');
    canvas.width = width;
    canvas.height = height;
    const ctx = canvas.getContext('2d');

    // Deep cosmic space background
    const bg = ctx.createLinearGradient(0, 0, width, height);
    bg.addColorStop(0, '#020617');
    bg.addColorStop(0.5, '#0c1b3a');
    bg.addColorStop(1, '#1e1035');
    ctx.fillStyle = bg;
    ctx.fillRect(0, 0, width, height);

    // Glowing core reactor in center
    const coreX = width / 2;
    const coreY = height * 0.58;
    const grad = ctx.createRadialGradient(coreX, coreY, 15, coreX, coreY, 240);
    grad.addColorStop(0, '#ffffff');
    grad.addColorStop(0.2, '#00ffff');
    grad.addColorStop(0.5, '#ff4400');
    grad.addColorStop(0.8, '#880033');
    grad.addColorStop(1, 'transparent');
    ctx.fillStyle = grad;
    ctx.beginPath();
    ctx.arc(coreX, coreY, 240, 0, Math.PI * 2);
    ctx.fill();

    // Title Logo
    ctx.font = '900 68px "Arial Black", Impact, sans-serif';
    ctx.textAlign = 'center';
    ctx.fillStyle = '#00f6ff';
    ctx.shadowColor = '#00e5ff';
    ctx.shadowBlur = 24;
    ctx.fillText('QUANTUM CORE', width / 2, 105);

    ctx.font = '900 86px "Arial Black", Impact, sans-serif';
    ctx.fillStyle = '#ff6a00';
    ctx.shadowColor = '#ff4400';
    ctx.shadowBlur = 30;
    ctx.fillText('MELTDOWN', width / 2, 195);

    // Williams Badge
    ctx.shadowBlur = 0;
    ctx.font = 'bold 22px Arial, sans-serif';
    ctx.fillStyle = '#e2e8f0';
    ctx.fillText('WILLIAMS ELECTRONIC GAMES • WPC-95 PINBALL', width / 2, height - 30);

    return canvas;
  }

  buildLegs() {
    const legMat = new THREE.MeshStandardMaterial({
      color: 0xcfd8dc,
      metalness: 0.95,
      roughness: 0.15
    });
    const legGeom = new THREE.CylinderGeometry(14, 10, 680, 12);

    const legPositions = [
      [-265, -420, 520],
      [265, -420, 520],
      [-265, -420, -520],
      [265, -420, -520]
    ];

    for (const pos of legPositions) {
      const leg = new THREE.Mesh(legGeom, legMat);
      leg.position.set(pos[0], pos[1], pos[2]);
      leg.rotation.z = (pos[0] > 0 ? 0.08 : -0.08);
      leg.castShadow = true;
      this.group.add(leg);
    }
  }

  buildCoinDoor() {
    const doorMat = new THREE.MeshStandardMaterial({
      color: 0x1e293b,
      roughness: 0.7,
      metalness: 0.4
    });
    const doorGeom = new THREE.BoxGeometry(220, 240, 8);
    const door = new THREE.Mesh(doorGeom, doorMat);
    door.position.set(0, -180, 598);
    this.group.add(door);

    // Coin Reject Buttons
    const btnMat = new THREE.MeshStandardMaterial({
      color: 0xff5500,
      emissive: 0xff4400,
      emissiveIntensity: 0.65
    });
    const btnGeom = new THREE.BoxGeometry(24, 34, 6);
    const b1 = new THREE.Mesh(btnGeom, btnMat);
    b1.position.set(-45, -135, 603);
    this.group.add(b1);

    const b2 = new THREE.Mesh(btnGeom, btnMat);
    b2.position.set(45, -135, 603);
    this.group.add(b2);
  }

  update() {
    if (this.dmdTexture) {
      this.dmdTexture.needsUpdate = true;
    }
  }
}

