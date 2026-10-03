import * as THREE from 'three';

/**
 * InsertsMesh - Under-Playfield Illuminated Lamps & Flasher Strobe System
 * Dynamically illuminates Williams table inserts based on game rules
 */
export class InsertsMesh {
  constructor(tableMeshes) {
    this.table = tableMeshes;
    this.group = new THREE.Group();
    this.inserts = new Map();
    this.flashTimer = 0;

    this.initInserts();
  }

  initInserts() {
    const createInsert = (id, tx, ty, colorHex, shapeType = 'circle', sizeX = 14, sizeY = 14) => {
      const mat = new THREE.MeshStandardMaterial({
        color: colorHex,
        emissive: colorHex,
        emissiveIntensity: 0.1,
        transparent: true,
        opacity: 0.9,
        roughness: 0.2
      });

      let geom;
      if (shapeType === 'circle') {
        geom = new THREE.CylinderGeometry(sizeX / 2, sizeX / 2, 2, 16);
      } else if (shapeType === 'arrow') {
        const shape = new THREE.Shape();
        shape.moveTo(0, -sizeY / 2);
        shape.lineTo(-sizeX / 2, 0);
        shape.lineTo(sizeX / 2, 0);
        shape.closePath();
        geom = new THREE.ExtrudeGeometry(shape, { depth: 2, bevelEnabled: false });
      } else {
        geom = new THREE.BoxGeometry(sizeX, 2, sizeY);
      }

      const mesh = new THREE.Mesh(geom, mat);
      if (shapeType === 'arrow') {
        mesh.rotation.x = -Math.PI / 2 + this.table.tableAngle;
      } else {
        mesh.rotation.x = this.table.tableAngle;
      }
      const wPos = this.table.toWorldCoords(tx, ty, 1.8);
      mesh.position.copy(wPos);

      this.group.add(mesh);
      this.inserts.set(id, { mesh, mat, colorHex, isLit: false, flash: false });
    };

    // 1. C-O-R-E Lanes
    createInsert('lane_C', 187, 145, 0x00ffff, 'circle', 16, 16);
    createInsert('lane_O', 227, 145, 0x00ffff, 'circle', 16, 16);
    createInsert('lane_R', 272, 145, 0x00ffff, 'circle', 16, 16);
    createInsert('lane_E', 315, 145, 0x00ffff, 'circle', 16, 16);

    // 2. Multipliers
    createInsert('mult_2X', 255, 720, 0xffaa00, 'rect', 28, 12);
    createInsert('mult_3X', 255, 680, 0xffaa00, 'rect', 28, 12);
    createInsert('mult_4X', 255, 640, 0xffaa00, 'rect', 28, 12);
    createInsert('mult_5X', 255, 600, 0xffaa00, 'rect', 28, 12);
    createInsert('mult_10X', 255, 560, 0xff0044, 'rect', 28, 12);

    // 3. Ramp Jackpots
    createInsert('jackpot_left', 130, 440, 0xff0055, 'arrow', 24, 30);
    createInsert('jackpot_right', 380, 440, 0xff0055, 'arrow', 24, 30);

    // 4. Core Saucer / Lock
    createInsert('lock_core', 255, 520, 0x00ff88, 'circle', 36, 36);
    createInsert('super_jackpot', 255, 470, 0xff0000, 'circle', 28, 28);

    // 5. Ball Save & Kickback
    createInsert('ball_save', 255, 930, 0x00ffcc, 'circle', 20, 20);
    createInsert('kickback', 48, 880, 0xff8800, 'circle', 18, 18);
  }

  update(dt, rulesState) {
    this.flashTimer += dt;
    const pulseFast = Math.sin(this.flashTimer * 16) > 0;
    const pulseMedium = Math.sin(this.flashTimer * 8) > 0;

    if (!rulesState) return;

    // Sync C-O-R-E lanes
    if (rulesState.coreLanes) {
      for (const [lane, isLit] of Object.entries(rulesState.coreLanes)) {
        this.setInsertState(lane, isLit, false);
      }
    }

    // Sync Multipliers
    const m = rulesState.multiplier || 1;
    this.setInsertState('mult_2X', m >= 2, m === 2 && pulseMedium);
    this.setInsertState('mult_3X', m >= 3, m === 3 && pulseMedium);
    this.setInsertState('mult_4X', m >= 4, m === 4 && pulseMedium);
    this.setInsertState('mult_5X', m >= 5, m === 5 && pulseMedium);
    this.setInsertState('mult_10X', m >= 10, m >= 10 && pulseFast);

    // Sync Jackpots
    this.setInsertState('jackpot_left', rulesState.leftJackpotLit, pulseFast);
    this.setInsertState('jackpot_right', rulesState.rightJackpotLit, pulseFast);
    this.setInsertState('super_jackpot', rulesState.superJackpotLit, pulseFast);

    // Lock & Ball Save
    this.setInsertState('lock_core', rulesState.isLockLit, pulseMedium);
    this.setInsertState('ball_save', rulesState.isBallSaveActive, pulseFast);
    this.setInsertState('kickback', rulesState.isKickbackLit, false);

    // Render emissive intensity and opacity
    for (const [id, ins] of this.inserts.entries()) {
      if (ins.isLit) {
        ins.mat.opacity = 0.88;
        ins.mat.emissiveIntensity = ins.flash ? (pulseFast ? 2.8 : 0.5) : 1.8;
      } else {
        ins.mat.opacity = 0.18;
        ins.mat.emissiveIntensity = 0.0;
      }
    }
  }

  setInsertState(id, isLit, flash = false) {
    const ins = this.inserts.get(id);
    if (ins) {
      ins.isLit = isLit;
      ins.flash = flash;
    }
  }
}
