// MIDNIGHT HEIST — Three.js renderer. Builds the 3D table from the same layout
// data the physics uses, and animates it from machine/game state each frame.
import * as THREE from 'three';
import { EffectComposer } from 'three/addons/postprocessing/EffectComposer.js';
import { RenderPass } from 'three/addons/postprocessing/RenderPass.js';
import { UnrealBloomPass } from 'three/addons/postprocessing/UnrealBloomPass.js';
import { OutputPass } from 'three/addons/postprocessing/OutputPass.js';
import T from '../table/layout.js';
import { PHYS } from '../sim/physics.js';
import { paintPlayfield, INSERT_COLORS, glowTexture, makeCanvas } from './art.js';

const R = PHYS.ballR;
const INCLINE = PHYS.incline;
const V = (x, y, z = 0) => new THREE.Vector3(x, z, y);

// ---------------------------------------------------------------- helpers
function shapeFrom(pts) {
  const s = new THREE.Shape();
  pts.forEach(([x, y], i) => (i ? s.lineTo(x, -y) : s.moveTo(x, -y)));
  s.closePath();
  return s;
}
function extrude(pts, h, z0 = 0, bevel = 0) {
  const geo = new THREE.ExtrudeGeometry(shapeFrom(pts), {
    depth: h, bevelEnabled: bevel > 0, bevelThickness: bevel, bevelSize: bevel, bevelSegments: 2, curveSegments: 12,
  });
  geo.rotateX(-Math.PI / 2);
  geo.translate(0, z0, 0);
  return geo;
}
// Closed outline around an open polyline (a wall of thickness t)
function strip(pts, t, closed = false) {
  const n = pts.length;
  const left = [], right = [];
  const P = (i) => pts[(i + n) % n];
  for (let i = 0; i < n; i++) {
    const prev = closed || i > 0 ? P(i - 1) : null, next = closed || i < n - 1 ? P(i + 1) : null;
    const p = pts[i];
    let nx = 0, ny = 0;
    const acc = (a, b) => { const dx = b[0] - a[0], dy = b[1] - a[1], L = Math.hypot(dx, dy) || 1; nx += -dy / L; ny += dx / L; };
    if (prev) acc(prev, p); if (next) acc(p, next);
    const L = Math.hypot(nx, ny) || 1; nx /= L; ny /= L;
    let k = t / 2;
    if (prev && next) {
      const dx = p[0] - prev[0], dy = p[1] - prev[1], Lp = Math.hypot(dx, dy) || 1;
      const cos = (-dy / Lp) * nx + (dx / Lp) * ny;
      k = Math.min(t * 1.5, t / 2 / Math.max(0.3, cos));
    }
    left.push([p[0] + nx * k, p[1] + ny * k]);
    right.push([p[0] - nx * k, p[1] - ny * k]);
  }
  return [...left, ...right.reverse()];
}
function mat(color, rough = 0.5, metal = 0, extra = {}) {
  return new THREE.MeshStandardMaterial({ color, roughness: rough, metalness: metal, ...extra });
}
function canvasTex(c, srgb = true) {
  const t = new THREE.CanvasTexture(c);
  if (srgb) t.colorSpace = THREE.SRGBColorSpace;
  t.anisotropy = 8;
  return t;
}

export class TableRenderer {
  constructor(canvas, machine, game) {
    this.m = machine; this.g = game;
    this.canvas = canvas;
    const r = this.renderer = new THREE.WebGLRenderer({ canvas, antialias: true, powerPreference: 'high-performance' });
    r.setPixelRatio(Math.min(2, window.devicePixelRatio || 1));
    r.outputColorSpace = THREE.SRGBColorSpace;
    r.toneMapping = THREE.ACESFilmicToneMapping;
    r.toneMappingExposure = 1.05;
    r.shadowMap.enabled = true;
    r.shadowMap.type = THREE.PCFShadowMap;

    this.scene = new THREE.Scene();
    const bg = canvasTex(roomArt());
    this.scene.background = bg;
    this.camera = new THREE.PerspectiveCamera(36, 1, 0.5, 400);
    this.view = 0;
    this.shakeT = 0;

    this.pf = new THREE.Group();
    this.pf.rotation.x = INCLINE;
    this.scene.add(this.pf);

    this.anim = { slings: {}, pops: {}, kick: 0 };
    this.buildEnvironment();
    this.buildLights();
    this.buildPlayfield();
    this.buildWalls();
    this.buildPosts();
    this.buildBumpers();
    this.buildSlings();
    this.buildFlippers();
    this.buildTargets();
    this.buildVault();
    this.buildSpinnerGate();
    this.buildRamps();
    this.buildToys();
    this.buildInserts();
    this.buildApronPlunger();
    this.buildCabinet();
    this.buildBalls();

    this.fps = { frames: 0, t: 0, warm: 0 };
    this.setQuality(2);
    machine.onFx((type, e) => this.onFx(type, e));
    window.addEventListener('resize', () => this.resize());
  }

  // Quality tiers: 2 = high (MSAA, big shadow map, retina), 1 = medium, 0 = low.
  setQuality(q) {
    this.quality = q;
    const r = this.renderer;
    const dpr = window.devicePixelRatio || 1;
    this.pixelRatio = q === 2 ? Math.min(2, dpr) : q === 1 ? Math.min(1.25, dpr) : Math.min(1, dpr) * 0.8;
    r.setPixelRatio(this.pixelRatio);
    const shadows = q > 0;
    if (r.shadowMap.enabled !== shadows) {
      r.shadowMap.enabled = shadows;
      this.scene.traverse(o => { if (o.material) (Array.isArray(o.material) ? o.material : [o.material]).forEach(m => { m.needsUpdate = true; }); });
    }
    this.key.castShadow = shadows;
    const sm = q === 2 ? 2048 : 1024;
    if (this.key.shadow.mapSize.x !== sm) { this.key.shadow.mapSize.set(sm, sm); if (this.key.shadow.map) { this.key.shadow.map.dispose(); this.key.shadow.map = null; } }
    this.cubeEvery = q === 2 ? 6 : q === 1 ? 15 : 40;
    this.bloomScale = q === 2 ? 0.5 : q === 1 ? 0.5 : 0.25;
    if (this.composer) this.composer.dispose();
    const rt = new THREE.WebGLRenderTarget(4, 4, { type: THREE.HalfFloatType, samples: q === 2 ? 4 : 0 });
    this.composer = new EffectComposer(r, rt);
    this.composer.addPass(new RenderPass(this.scene, this.camera));
    this.bloom = new UnrealBloomPass(new THREE.Vector2(256, 256), 0.55, 0.5, 1.05);
    this.composer.addPass(this.bloom);
    this.composer.addPass(new OutputPass());
    this.resize();
    return ['LOW', 'MEDIUM', 'HIGH'][q];
  }
  cycleQuality() { return this.setQuality((this.quality + 2) % 3); }

  // ------------------------------------------------------------- scene
  buildEnvironment() {
    // A dark arcade room with a few bright fixtures: gives the chrome ball
    // believable reflections without washing out the table.
    const env = new THREE.Scene();
    const box = new THREE.Mesh(new THREE.SphereGeometry(100, 32, 16), new THREE.MeshBasicMaterial({ color: 0x0c0a16, side: THREE.BackSide }));
    env.add(box);
    const panel = (w, h, color, pos, look) => {
      const m = new THREE.Mesh(new THREE.PlaneGeometry(w, h), new THREE.MeshBasicMaterial({ color, side: THREE.DoubleSide }));
      m.position.copy(pos); m.lookAt(look); env.add(m);
    };
    const O = new THREE.Vector3(0, 0, 0);
    panel(30, 8, 0x8a8070, new THREE.Vector3(0, 70, 30), O);            // ceiling strip (behind the player)
    panel(30, 18, 0xff9a40, new THREE.Vector3(0, 30, -70), O);          // backbox glow
    panel(18, 50, 0x3050ff, new THREE.Vector3(-70, 20, 0), O);          // blue neon wall
    panel(18, 50, 0xff2a70, new THREE.Vector3(70, 20, 0), O);           // magenta neon wall
    panel(40, 10, 0xffffff, new THREE.Vector3(0, 40, 70), O);           // player-side light
    const pmrem = new THREE.PMREMGenerator(this.renderer);
    this.envMap = pmrem.fromScene(env, 0.02).texture;
    this.scene.environment = this.envMap;
    this.scene.environmentIntensity = 0.3;
  }

  buildLights() {
    const s = this.scene;
    s.add(new THREE.HemisphereLight(0x9aa8ff, 0x2a1830, 1.5));
    const key = this.key = new THREE.DirectionalLight(0xfff0dd, 0.8);
    key.position.set(10, 60, 14); key.target.position.set(10, -2, 24);
    key.castShadow = true;
    key.shadow.mapSize.set(2048, 2048);
    const sc = key.shadow.camera; sc.left = -16; sc.right = 16; sc.top = 30; sc.bottom = -30; sc.near = 20; sc.far = 90;
    key.shadow.bias = -0.0006; key.shadow.radius = 3;
    s.add(key); s.add(key.target);
    // General illumination: a few real bulbs (every light costs every pixel),
    // plus painted light pools on the playfield for the rest of the GI.
    this.gi = [];
    const gi = (x, y, z, col, I, d = 22) => {
      const l = new THREE.PointLight(col, I, d, 2);
      l.position.copy(V(x, y, z)); this.pf.add(l); this.gi.push(l); l.userData.base = I;
    };
    gi(4.4, 33.0, 2.6, 0xffc58a, 11, 14); gi(14.15, 33.0, 2.6, 0xffc58a, 11, 14);
    gi(9.3, 20, 6.0, 0xffd8b0, 22, 24);
    gi(14.2, 9.5, 3.5, 0xff6a88, 10, 12);
    this.glowTex = new THREE.CanvasTexture(glowTexture());
    const pool = (x, y, r, color, a) => {
      const m = new THREE.Mesh(new THREE.PlaneGeometry(r * 2, r * 2), new THREE.MeshBasicMaterial({ map: this.glowTex, color, transparent: true, opacity: a, blending: THREE.AdditiveBlending, depthWrite: false, toneMapped: false }));
      m.rotation.x = -Math.PI / 2; m.position.copy(V(x, y, 0.03)); this.pf.add(m); return m;
    };
    this.pools = [
      pool(1.6, 24, 3, 0xffb070, 0.22), pool(16.9, 24, 3, 0xffb070, 0.22), pool(3.2, 9, 4, 0x88a8ff, 0.16),
      pool(16, 5.5, 3.5, 0xb0c0ff, 0.14), pool(7.5, 17.5, 2.5, 0xffd18a, 0.16), pool(9.3, 38.5, 4.5, 0xffc080, 0.10),
    ];
    // flashers: emissive domes + light pools, and one real light that jumps to the latest flash
    this.flashLights = {};
    for (const f of T.flashers) {
      const dome = new THREE.Mesh(new THREE.SphereGeometry(0.35, 16, 8, 0, Math.PI * 2, 0, Math.PI / 2),
        new THREE.MeshStandardMaterial({ color: f.color, transparent: true, opacity: 0.75, roughness: 0.2, emissive: new THREE.Color(f.color), emissiveIntensity: 0.1 }));
      dome.position.copy(V(f.x, f.y, f.z - 0.2));
      this.pf.add(dome);
      const glow = pool(f.x, f.y, 4.5, f.color, 0);
      this.flashLights[f.id] = { dome, glow, f };
    }
    this.flashLight = new THREE.PointLight(0xffffff, 0, 30, 2);
    this.pf.add(this.flashLight);
  }

  buildPlayfield() {
    const art = paintPlayfield();
    this.artCanvas = art;
    const tex = canvasTex(art);
    tex.anisotropy = this.renderer.capabilities.getMaxAnisotropy();
    const geo = new THREE.PlaneGeometry(T.W, T.L);
    geo.rotateX(-Math.PI / 2);
    geo.translate(T.W / 2, 0, T.L / 2);
    const m = new THREE.MeshStandardMaterial({ map: tex, roughness: 0.55, metalness: 0.0, envMapIntensity: 0.12 });
    const pf = new THREE.Mesh(geo, m);
    pf.receiveShadow = true;
    this.pf.add(pf);
    // wooden board edge
    const board = new THREE.Mesh(new THREE.BoxGeometry(T.W, 0.75, T.L), mat(0x2b1a10, 0.8));
    board.position.set(T.W / 2, -0.38, T.L / 2);
    this.pf.add(board);
  }

  buildWalls() {
    const gold = mat(0xc49a44, 0.5, 1.0);
    const lacquer = mat(0x120e1c, 0.35, 0.2);
    const chrome = mat(0x9c9cab, 0.3, 1.0);
    const add = (geo, m, shadow = true) => {
      const mesh = new THREE.Mesh(geo, m); mesh.castShadow = shadow; mesh.receiveShadow = true; this.pf.add(mesh); return mesh;
    };
    for (const w of T.walls) {
      if (w.style === 'hidden') continue;
      add(extrude(strip(w.pts, 0.22), 1.3), [chrome, chrome]);
    }
    // arch: a tall polished metal band
    const archPts = [];
    for (let i = 0; i <= 90; i++) {
      const a = Math.PI + i / 90 * Math.PI;
      archPts.push([T.arch.cx + Math.cos(a) * (T.arch.r + 0.11), T.arch.cy + Math.sin(a) * (T.arch.r + 0.11)]);
    }
    add(extrude(strip(archPts, 0.22), 1.35), [chrome, chrome]);
    // guide walls around solids: lacquered black with a gold cap
    for (const s of T.solids) {
      add(extrude(strip(s.pts, 0.18, true), s.h ?? 1.2), [gold, lacquer]);
    }
    // lane guides
    for (const g of T.laneGuides) {
      add(extrude(strip([[g.x, g.y0], [g.x, g.y1]], g.r * 2), 0.9), [chrome, chrome]);
      const cap = new THREE.Mesh(new THREE.CylinderGeometry(0.14, 0.14, 0.15, 12), gold);
      cap.position.copy(V(g.x, g.y0, 0.95)); this.pf.add(cap);
    }
    // standups' backing blocks and hideout/vault housings use the same look
    // brushed steel for large flat parts (rails, lockdown bar, ramp flaps): polished
    // chrome there mirrors the overhead key light straight into the camera.
    const brushed = mat(0x8a8a96, 0.62, 1.0);
    this.mats = { gold, lacquer, chrome, brushed };
  }

  buildPosts() {
    const { gold, chrome } = this.mats;
    const rubber = mat(0xf2efe8, 0.85, 0);
    const postGeo = new THREE.CylinderGeometry(0.1, 0.12, 1.15, 12);
    for (const p of T.posts) {
      const post = new THREE.Mesh(postGeo, p.mat === 'metal' ? chrome : gold);
      post.position.copy(V(p.x, p.y, 0.575)); post.castShadow = true; this.pf.add(post);
      if (p.mat === 'post' && p.r > 0.12) {
        const ring = new THREE.Mesh(new THREE.TorusGeometry(p.r - 0.05, 0.08, 8, 24), rubber);
        ring.rotation.x = Math.PI / 2; ring.position.copy(V(p.x, p.y, 0.53)); ring.castShadow = true; this.pf.add(ring);
      }
      const cap = new THREE.Mesh(new THREE.CylinderGeometry(0.16, 0.13, 0.12, 12), gold);
      cap.position.copy(V(p.x, p.y, 1.18)); this.pf.add(cap);
    }
    this.rubberMat = rubber;
  }

  buildBumpers() {
    this.bumpers = {};
    const capTex = canvasTex(bumperCapArt());
    for (const b of T.bumpers) {
      const grp = new THREE.Group(); grp.position.copy(V(b.x, b.y, 0));
      const base = new THREE.Mesh(new THREE.CylinderGeometry(1.05, 1.1, 0.12, 32), mat(0x101018, 0.6));
      base.position.y = 0.06; grp.add(base);
      const skirt = new THREE.Mesh(new THREE.CylinderGeometry(0.98, 1.08, 0.1, 32), mat(0xb0102a, 0.3, 0, { transparent: true, opacity: 0.9 }));
      skirt.position.y = 0.17; grp.add(skirt);
      const bodyMat = new THREE.MeshStandardMaterial({ color: 0xffe9e0, roughness: 0.25, transparent: true, opacity: 0.85, emissive: new THREE.Color(0xff5050), emissiveIntensity: 0.4 });
      const body = new THREE.Mesh(new THREE.CylinderGeometry(0.72, 0.72, 0.95, 32, 1, true), bodyMat);
      body.position.y = 0.7; grp.add(body);
      const ring = new THREE.Mesh(new THREE.TorusGeometry(0.9, 0.07, 10, 36), this.mats.chrome);
      ring.rotation.x = Math.PI / 2; ring.position.y = 0.62; grp.add(ring);
      const capMat = new THREE.MeshStandardMaterial({ map: capTex, roughness: 0.2, transparent: true, opacity: 0.95, emissive: new THREE.Color(0xff3040), emissiveMap: capTex, emissiveIntensity: 0.4 });
      const cap = new THREE.Mesh(new THREE.CylinderGeometry(1.25, 1.18, 0.32, 40), [mat(0xc01830, 0.25, 0, { transparent: true, opacity: 0.9 }), capMat, mat(0x300008)]);
      cap.position.y = 1.3; grp.add(cap);
      grp.traverse(o => { o.castShadow = true; });
      this.pf.add(grp);
      this.bumpers[b.id] = { grp, ring, body, capMat, bodyMat, t: 0 };
    }
  }

  buildSlings() {
    this.slings = {};
    const plasticTex = canvasTex(plasticArt('#9a0e26', '#e8b858'));
    plasticTex.wrapS = plasticTex.wrapT = THREE.RepeatWrapping; plasticTex.repeat.set(0.35, 0.35);
    for (const s of T.slings) {
      const outline = [s.A, ...s.lower, s.D];
      // body wall
      const body = new THREE.Mesh(extrude(outline, 0.9), [this.mats.lacquer, this.mats.lacquer]);
      body.castShadow = true; this.pf.add(body);
      // translucent plastic on top, lit from below by the GI
      const plastic = new THREE.Mesh(extrude(outline, 0.07, 1.12),
        [new THREE.MeshStandardMaterial({ map: plasticTex, color: 0xffffff, roughness: 0.2, transparent: true, opacity: 0.9, emissive: new THREE.Color(0x3a0008), emissiveIntensity: 0.8 }), this.mats.gold]);
      plastic.castShadow = true;
      this.pf.add(plastic);
      // rubber band on the kicking face (animated)
      const [ax, ay] = s.A, [dx, dy] = s.D;
      const len = Math.hypot(dx - ax, dy - ay);
      const band = new THREE.Mesh(new THREE.CylinderGeometry(0.1, 0.1, len, 10), this.rubberMat);
      const mid = V((ax + dx) / 2, (ay + dy) / 2, 0.5);
      band.position.copy(mid);
      band.rotation.z = Math.PI / 2;
      band.rotation.y = -Math.atan2(dy - ay, dx - ax);
      band.castShadow = true;
      this.pf.add(band);
      const nx = (dy - ay) / len, ny = -(dx - ax) / len; // outward normal (toward centre)
      const side = s.id === 'slingL' ? 1 : -1;
      this.slings[s.id] = { band, mid, n: new THREE.Vector3(nx * side, 0, ny * side), t: 0 };
      for (const p of [s.A, s.C, s.D]) {
        const ring = new THREE.Mesh(new THREE.TorusGeometry(0.2, 0.08, 8, 20), this.rubberMat);
        ring.rotation.x = Math.PI / 2; ring.position.copy(V(p[0], p[1], 0.5)); this.pf.add(ring);
        const post = new THREE.Mesh(new THREE.CylinderGeometry(0.09, 0.09, 1.1, 10), this.mats.gold);
        post.position.copy(V(p[0], p[1], 0.55)); this.pf.add(post);
      }
    }
  }

  buildFlippers() {
    this.flippers = {};
    for (const f of this.m.world.flippers) {
      const outline = (grow) => {
        const pts = [];
        const n = 18;
        const rb = f.rb + grow, rt = f.rt + grow;
        // tapered capsule outline in local coords (x along the bat)
        const phi = Math.asin((f.rb - f.rt) / f.L);
        for (let i = 0; i <= n; i++) { const a = Math.PI / 2 + phi + (Math.PI - 2 * phi) * i / n; pts.push([Math.cos(a) * rb, Math.sin(a) * rb]); }
        for (let i = 0; i <= n; i++) { const a = -Math.PI / 2 + phi + (Math.PI - 2 * phi) * i / n; pts.push([f.L + Math.cos(a) * rt, Math.sin(a) * rt]); }
        return pts;
      };
      const grp = new THREE.Group();
      grp.position.copy(V(f.px, f.py, 0));
      const bat = new THREE.Mesh(extrude(outline(-0.07), 0.78, 0.1), mat(0xf5f3ee, 0.35, 0.0));
      const rubber = new THREE.Mesh(extrude(outline(0), 0.34, 0.32), mat(0xc4102a, 0.7));
      const pivotCap = new THREE.Mesh(new THREE.CylinderGeometry(0.18, 0.18, 0.1, 16), this.mats.gold);
      pivotCap.position.set(0, 0.92, 0);
      for (const m of [bat, rubber]) { m.castShadow = true; m.receiveShadow = true; grp.add(m); }
      grp.add(pivotCap);
      // logo stripe
      const stripe = new THREE.Mesh(extrude([[0.2, -0.06], [f.L - 0.2, -0.03], [f.L - 0.2, 0.03], [0.2, 0.06]], 0.02, 0.885), mat(0xd4a64a, 0.3, 1));
      grp.add(stripe);
      this.pf.add(grp);
      this.flippers[f.id] = { grp, f };
    }
  }

  buildTargets() {
    this.drops = T.drops.map((d, i) => {
      const faceTex = canvasTex(dropArt(i));
      const w = Math.hypot(d.b[0] - d.a[0], d.b[1] - d.a[1]);
      const m = new THREE.Mesh(new THREE.BoxGeometry(w, 1.05, 0.2),
        [mat(0x300a0a), mat(0x300a0a), mat(0x401010), mat(0x401010), new THREE.MeshStandardMaterial({ map: faceTex, roughness: 0.35, emissive: new THREE.Color(0xff2020), emissiveMap: faceTex, emissiveIntensity: 0.25 }), mat(0x300a0a)]);
      m.position.copy(V(d.cx, d.a[1], 0.52)); m.castShadow = true;
      this.pf.add(m);
      return { mesh: m, y: 0.52 };
    });
    this.standups = T.standups.map((s, i) => {
      const cx = (s.a[0] + s.b[0]) / 2, w = s.b[0] - s.a[0];
      const m = new THREE.Mesh(new THREE.BoxGeometry(w, 0.75, 0.12), new THREE.MeshStandardMaterial({ color: 0xffc830, roughness: 0.3, emissive: new THREE.Color(0xffa000), emissiveIntensity: 0.25 }));
      m.position.copy(V(cx, s.a[1] - 0.06, 0.62)); m.castShadow = true; this.pf.add(m);
      return { mesh: m, base: m.position.clone(), t: 0 };
    });
  }

  buildVault() {
    // Vault chamber: gold bars glowing behind a round steel door.
    const gold = new THREE.MeshStandardMaterial({ color: 0xffc040, metalness: 1, roughness: 0.45, emissive: new THREE.Color(0x805000), emissiveIntensity: 0.4 });
    const bar = new THREE.BoxGeometry(0.62, 0.26, 0.3);
    for (let i = 0; i < 9; i++) {
      const b = new THREE.Mesh(bar, gold);
      const row = Math.floor(i / 3), col = i % 3;
      b.position.copy(V(6.8 + col * 0.72 + (row % 2) * 0.1, 12.35 + row * 0.02, 0.13 + row * 0.27));
      b.rotation.y = (i % 2 ? 0.08 : -0.06);
      this.pf.add(b);
    }
    const vaultLight = new THREE.PointLight(0xffb040, 3, 5, 2);
    vaultLight.position.copy(V(7.6, 13.2, 1.2)); this.pf.add(vaultLight);
    this.vaultLight = vaultLight;
    // door on a hinge at the lane's left wall
    const hinge = new THREE.Group(); hinge.position.copy(V(6.3, 14.8, 0));
    const door = new THREE.Group(); door.position.set(1.3, 1.3, 0);
    const steel = new THREE.MeshStandardMaterial({ color: 0xb8bcc8, metalness: 1, roughness: 0.45 });
    const disc = new THREE.Mesh(new THREE.CylinderGeometry(1.28, 1.28, 0.3, 48), steel);
    disc.rotation.x = Math.PI / 2; door.add(disc);
    const rim = new THREE.Mesh(new THREE.TorusGeometry(1.2, 0.07, 8, 48), this.mats.gold);
    rim.position.z = 0.16; door.add(rim);
    for (let i = 0; i < 12; i++) {
      const a = i / 12 * Math.PI * 2;
      const bolt = new THREE.Mesh(new THREE.CylinderGeometry(0.07, 0.07, 0.12, 8), this.mats.gold);
      bolt.rotation.x = Math.PI / 2; bolt.position.set(Math.cos(a) * 1.02, Math.sin(a) * 1.02, 0.18); door.add(bolt);
    }
    const wheel = new THREE.Group(); wheel.position.z = 0.22;
    wheel.add(new THREE.Mesh(new THREE.TorusGeometry(0.5, 0.05, 8, 32), this.mats.chrome));
    for (let i = 0; i < 3; i++) {
      const spoke = new THREE.Mesh(new THREE.CylinderGeometry(0.035, 0.035, 1.0, 6), this.mats.chrome);
      spoke.rotation.z = i * Math.PI / 3; wheel.add(spoke);
    }
    const hub = new THREE.Mesh(new THREE.CylinderGeometry(0.14, 0.14, 0.12, 12), this.mats.gold);
    hub.rotation.x = Math.PI / 2; wheel.add(hub);
    door.add(wheel);
    door.traverse(o => { o.castShadow = true; });
    hinge.add(door);
    this.pf.add(hinge);
    this.vault = { hinge, wheel, open: 0, spin: 0 };
    // vault arch sign
    const sign = new THREE.Mesh(new THREE.PlaneGeometry(2.8, 0.7), new THREE.MeshBasicMaterial({ map: canvasTex(signArt('THE VAULT', '#ffd27a', '#2a1600')), transparent: true, toneMapped: false }));
    sign.position.copy(V(7.6, 11.95, 2.4)); this.pf.add(sign);
    this.vaultSign = sign;
  }

  buildSpinnerGate() {
    const sp = T.spinner;
    const grp = new THREE.Group();
    grp.position.copy(V((sp.a[0] + sp.b[0]) / 2, sp.a[1], 0.95));
    const plate = new THREE.Mesh(new THREE.BoxGeometry(1.25, 0.55, 0.04), new THREE.MeshStandardMaterial({ color: 0xd8d8e0, metalness: 1, roughness: 0.45, map: canvasTex(signArt('$', '#222', '#d4a64a')) }));
    plate.position.y = -0.3;
    const axle = new THREE.Group(); axle.add(plate);
    grp.add(axle);
    for (const x of [-0.68, 0.68]) {
      const post = new THREE.Mesh(new THREE.CylinderGeometry(0.04, 0.04, 1.0, 6), this.mats.chrome);
      post.position.set(x, -0.45, 0); grp.add(post);
    }
    this.pf.add(grp);
    this.spinnerAxle = axle;
    // shooter gate
    const g = T.gates[0];
    const gate = new THREE.Group();
    gate.position.copy(V(g.a[0], g.a[1], 0.9));
    const len = Math.hypot(g.b[0] - g.a[0], g.b[1] - g.a[1]);
    gate.rotation.y = -Math.atan2(g.b[1] - g.a[1], g.b[0] - g.a[0]);
    const flap = new THREE.Mesh(new THREE.BoxGeometry(len, 0.7, 0.03), this.mats.chrome);
    flap.position.set(len / 2, -0.35, 0);
    const pivot = new THREE.Group(); pivot.add(flap); gate.add(pivot);
    this.pf.add(gate);
    this.gatePivot = pivot;
  }

  buildRamps() {
    const plastic = new THREE.MeshStandardMaterial({ color: 0x9fd0ff, roughness: 0.08, metalness: 0.1, transparent: true, opacity: 0.32, side: THREE.DoubleSide, depthWrite: false, envMapIntensity: 1.5 });
    const plasticR = plastic.clone(); plasticR.color = new THREE.Color(0xff9fb8);
    const wire = this.mats.chrome;
    const buildPath = (path, plasticFrac, material, withEntryFlap) => {
      const S = path.samples;
      const cut = Math.floor(S.length * plasticFrac);
      if (cut > 1) this.pf.add(rampMesh(S.slice(0, cut + 1), 1.05, 0.85, material));
      if (cut < S.length - 1) wireForm(this.pf, S.slice(Math.max(0, cut - 1)), wire);
      if (withEntryFlap) {
        const s0 = S[0];
        const flap = new THREE.Mesh(new THREE.BoxGeometry(2.1, 0.03, 0.5), this.mats.brushed);
        flap.position.copy(V(s0.x, s0.y + 0.05, 0.02)); this.pf.add(flap);
      }
    };
    const P = this.m.world.paths;
    buildPath(P.rampL, T.ramps.rampL.plasticUntil, plastic, true);
    buildPath(P.rampR, T.ramps.rampR.plasticUntil, plasticR, true);
    buildPath(P.returnL, 0, null, false);
    buildPath(P.returnR, 0, null, false);
    buildPath(P.vuk, 0.0, null, false);
    // ramp signs
    const lsign = new THREE.Mesh(new THREE.PlaneGeometry(2.4, 0.6), new THREE.MeshBasicMaterial({ map: canvasTex(signArt('SKYWAY', '#7ad0ff', '#001428')), transparent: true, toneMapped: false }));
    lsign.position.copy(V(3.15, 13.5, 2.75)); lsign.rotation.x = -0.2; this.pf.add(lsign);
    const rsign = new THREE.Mesh(new THREE.PlaneGeometry(2.4, 0.6), new THREE.MeshBasicMaterial({ map: canvasTex(signArt('GETAWAY', '#ff7aa8', '#280012')), transparent: true, toneMapped: false }));
    rsign.position.copy(V(10.5, 13.5, 2.75)); rsign.rotation.x = -0.2; this.pf.add(rsign);
    this.neonSigns = [lsign, rsign, this.vaultSign];
  }

  buildToys() {
    // Art-deco skyscraper between the SKYWAY ramp and the vault lane
    const tower = new THREE.Group();
    tower.position.copy(V(5.3, 16.6, 0));
    const stone = new THREE.MeshStandardMaterial({ color: 0x23213a, roughness: 0.55, metalness: 0.3 });
    const winTex = canvasTex(windowsArt());
    const winMat = new THREE.MeshStandardMaterial({ map: winTex, emissive: new THREE.Color(0xffc870), emissiveMap: winTex, emissiveIntensity: 1.1, roughness: 0.4 });
    const tiers = [[1.6, 2.2, 1.6], [1.25, 1.6, 1.2], [0.9, 1.2, 0.9], [0.55, 0.8, 0.55]];
    let y = 0;
    for (const [w, h, d] of tiers) {
      const m = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), [winMat, winMat, stone, stone, winMat, winMat]);
      m.position.y = y + h / 2; tower.add(m); y += h;
      const trim = new THREE.Mesh(new THREE.BoxGeometry(w + 0.1, 0.06, d + 0.1), this.mats.gold);
      trim.position.y = y; tower.add(trim);
    }
    const spire = new THREE.Mesh(new THREE.ConeGeometry(0.16, 1.4, 8), this.mats.gold);
    spire.position.y = y + 0.7; tower.add(spire);
    const beacon = new THREE.Mesh(new THREE.SphereGeometry(0.09, 8, 8), new THREE.MeshBasicMaterial({ color: 0xff3030, toneMapped: false }));
    beacon.position.y = y + 1.45; tower.add(beacon);
    this.beacon = beacon;
    tower.traverse(o => { o.castShadow = true; });
    this.pf.add(tower);
    // Hideout garage with a neon sign
    const hs = new THREE.Mesh(new THREE.PlaneGeometry(2.6, 0.75), new THREE.MeshBasicMaterial({ map: canvasTex(signArt('HIDEOUT', '#6aff9a', '#00240c')), transparent: true, toneMapped: false }));
    hs.position.copy(V(15.9, 16.4, 2.2)); hs.rotation.x = -0.25; this.pf.add(hs);
    this.neonHide = hs;
    // pop bumper area plastic: "ALARM" siren lights
    this.sirens = [];
    for (const [x, y] of [[12.1, 12.8], [16.3, 12.2]]) {
      const s = new THREE.Mesh(new THREE.CylinderGeometry(0.22, 0.26, 0.5, 16), new THREE.MeshStandardMaterial({ color: 0xff2030, emissive: new THREE.Color(0xff1020), emissiveIntensity: 0.3, transparent: true, opacity: 0.9 }));
      s.position.copy(V(x, y, 1.6)); this.pf.add(s); this.sirens.push(s);
    }
  }

  buildInserts() {
    const glow = new THREE.CanvasTexture(glowTexture());
    this.inserts = [];
    this.insertById = {};
    for (const ins of T.inserts) {
      const shape = insertShape(ins);
      const geo = new THREE.ShapeGeometry(shape, 16);
      geo.rotateX(-Math.PI / 2);
      const c = INSERT_COLORS[ins.color] || INSERT_COLORS.white;
      const base = new THREE.Color(c[0], c[1], c[2]);
      const m = new THREE.MeshBasicMaterial({ color: base.clone(), transparent: true, opacity: 1, blending: THREE.AdditiveBlending, depthWrite: false, toneMapped: false });
      const mesh = new THREE.Mesh(geo, m);
      mesh.position.copy(V(ins.x, ins.y, 0.012));
      mesh.rotation.y = -(ins.rot || 0) * Math.PI / 180;
      this.pf.add(mesh);
      const halo = new THREE.Mesh(new THREE.PlaneGeometry(1, 1), new THREE.MeshBasicMaterial({ map: glow, color: base.clone(), transparent: true, blending: THREE.AdditiveBlending, depthWrite: false, toneMapped: false }));
      halo.rotation.x = -Math.PI / 2;
      const hs = ins.size * 3.2 * (ins.w ? 1.5 : 1);
      halo.scale.set(hs, hs, 1);
      halo.position.copy(V(ins.x, ins.y, 0.02));
      this.pf.add(halo);
      const rec = { ins, mesh, halo, base, v: 0 };
      this.inserts.push(rec); this.insertById[ins.id] = rec;
    }
  }

  buildApronPlunger() {
    // apron: metal plate across the bottom with instruction cards
    const apronPts = [[0, 41.8], [6.7, 41.8], [8.1, 42.35], [10.45, 42.35], [11.85, 41.8], [18.55, 41.8], [18.55, 45], [0, 45]];
    const apronTex = canvasTex(apronArt());
    const apron = new THREE.Mesh(extrude(apronPts, 0.35), [new THREE.MeshStandardMaterial({ map: apronTex, roughness: 0.55, metalness: 0.4 }), mat(0x1a1622, 0.5, 0.8)]);
    // map UVs of the top cap to the apron rectangle
    const uv = apron.geometry.attributes.uv, pos = apron.geometry.attributes.position;
    for (let i = 0; i < uv.count; i++) uv.setXY(i, pos.getX(i) / 18.55, 1 - (pos.getZ(i) - 41.8) / 3.2);
    apron.receiveShadow = true;
    this.pf.add(apron);
    // plunger
    const P = T.plunger;
    const rod = new THREE.Mesh(new THREE.CylinderGeometry(0.1, 0.1, 3.2, 12), this.mats.chrome);
    rod.rotation.x = Math.PI / 2;
    const tip = new THREE.Mesh(new THREE.CylinderGeometry(0.28, 0.28, 0.35, 16), mat(0x1a1a1a, 0.6));
    tip.rotation.x = Math.PI / 2; tip.position.z = -1.6;
    const knob = new THREE.Mesh(new THREE.SphereGeometry(0.55, 20, 12), new THREE.MeshStandardMaterial({ color: 0xd01830, roughness: 0.2, metalness: 0.2, transparent: true, opacity: 0.92 }));
    knob.position.z = 2.2;
    const plunger = new THREE.Group(); plunger.add(rod); plunger.add(tip); plunger.add(knob);
    plunger.position.copy(V(P.laneX, P.y + 1.6 + 0.18, 0.55));
    this.pf.add(plunger);
    this.plunger = { grp: plunger, base: plunger.position.clone() };
    // shooter lane cover plate (the ball is visible between walls)
    const spring = new THREE.Mesh(new THREE.CylinderGeometry(0.22, 0.22, 1.2, 12, 1, true), new THREE.MeshStandardMaterial({ color: 0xcccccc, metalness: 1, roughness: 0.45, wireframe: true }));
    spring.rotation.x = Math.PI / 2; spring.position.copy(V(P.laneX, P.y + 0.8, 0.55)); this.pf.add(spring);
    this.plunger.spring = spring;
  }

  buildCabinet() {
    const wood = mat(0x1b1020, 0.45, 0.2);
    const art = canvasTex(cabinetArt());
    const sideMat = new THREE.MeshStandardMaterial({ map: art, roughness: 0.5, metalness: 0.15 });
    const sideGeo = new THREE.BoxGeometry(1.0, 6.5, 50);
    for (const x of [-0.5, T.W + 0.5]) {
      const side = new THREE.Mesh(sideGeo, [sideMat, sideMat, wood, wood, wood, wood]);
      side.position.set(x, -0.6, 22.5); this.pf.add(side);
      const rail = new THREE.Mesh(new THREE.BoxGeometry(1.1, 0.25, 50), this.mats.brushed);
      rail.position.set(x, 2.75, 22.5); this.pf.add(rail);
    }
    const back = new THREE.Mesh(new THREE.BoxGeometry(T.W + 2, 6.5, 1), wood);
    back.position.set(T.W / 2, -0.6, -0.5); this.pf.add(back);
    const bar = new THREE.Mesh(new THREE.BoxGeometry(T.W + 2.2, 1.0, 1.6), this.mats.brushed);
    bar.position.set(T.W / 2, 2.4, 45.6); this.pf.add(bar);
    const front = new THREE.Mesh(new THREE.BoxGeometry(T.W + 2, 8, 1), wood);
    front.position.set(T.W / 2, -2.0, 45.9); this.pf.add(front);
    // flipper buttons on the cabinet sides
    for (const x of [-1.05, T.W + 1.05]) {
      const btn = new THREE.Mesh(new THREE.CylinderGeometry(0.45, 0.45, 0.4, 20), mat(0xd01830, 0.3));
      btn.rotation.z = Math.PI / 2; btn.position.set(x, 0.5, 41); this.pf.add(btn);
    }
    // backbox base (seen at the far end)
    const box = new THREE.Mesh(new THREE.BoxGeometry(T.W + 2.4, 3.0, 8), wood);
    box.position.set(T.W / 2, 0.8, -4.5); this.pf.add(box);
    const bg = canvasTex(backglassArt());
    const glass = new THREE.Mesh(new THREE.PlaneGeometry(T.W + 1.6, 12), new THREE.MeshBasicMaterial({ map: bg, toneMapped: false, color: 0xbbbbbb }));
    glass.position.set(T.W / 2, 8.5, -1.2); glass.rotation.x = -INCLINE; this.pf.add(glass);
  }

  buildBalls() {
    this.ballGeo = new THREE.SphereGeometry(R, 40, 24);
    this.ghostGeo = new THREE.SphereGeometry(R * 0.96, 16, 10);
    // The ball reflects the real table: a cube camera above the playfield is
    // re-captured every few frames. Reflection-only panels (layer 2) stand in
    // for the arcade's ceiling lights and the glowing backbox.
    this.cubeRT = new THREE.WebGLCubeRenderTarget(192, { type: THREE.HalfFloatType, generateMipmaps: true, minFilter: THREE.LinearMipmapLinearFilter });
    this.cubeCam = new THREE.CubeCamera(0.3, 300, this.cubeRT);
    this.cubeCam.layers.enable(2);
    this.cubeCam.children.forEach(c => c.layers.enable(2));
    this.pf.add(this.cubeCam);
    this.cubeCam.position.copy(V(T.W / 2, 27, 1.2));
    const refl = (w, h, color, x, y, z, rx) => {
      const m = new THREE.Mesh(new THREE.PlaneGeometry(w, h), new THREE.MeshBasicMaterial({ color, side: THREE.DoubleSide }));
      m.position.copy(V(x, y, z)); m.rotation.x = rx; m.layers.set(2); this.pf.add(m);
    };
    refl(14, 3.5, 0xfff6e8, T.W / 2, 18, 30, Math.PI / 2);   // ceiling strip light
    refl(14, 3.5, 0xfff6e8, T.W / 2, 34, 30, Math.PI / 2);
    refl(26, 10, 0xffa050, T.W / 2, -6, 12, 0);             // backbox glow
    refl(30, 14, 0x404880, T.W / 2, 60, 18, 0);             // room behind the player
    this.ballMat = new THREE.MeshStandardMaterial({ color: 0xffffff, metalness: 1.0, roughness: 0.05, envMap: this.cubeRT.texture, envMapIntensity: 1.25 });
    this.cubeFrame = 0;
    this.ballMeshes = new Map();
    // fake contact shadow (a soft dark blob) complements the shadow map
    const sh = makeCanvas(64, 64), sg = sh.getContext('2d');
    const gr = sg.createRadialGradient(32, 32, 2, 32, 32, 32);
    gr.addColorStop(0, 'rgba(0,0,0,0.75)'); gr.addColorStop(1, 'rgba(0,0,0,0)');
    sg.fillStyle = gr; sg.fillRect(0, 0, 64, 64);
    this.shadowTex = new THREE.CanvasTexture(sh);
  }

  // ------------------------------------------------------------- effects
  onFx(type, e) {
    switch (type) {
      case 'kick':
        if (this.slings[e.id]) this.slings[e.id].t = 0.09;
        if (this.bumpers[e.id]) this.bumpers[e.id].t = 0.12;
        break;
      case 'hit':
        if (e.id === 'standC') this.standups[0].t = 0.12;
        if (e.id === 'standR') this.standups[1].t = 0.12;
        if (e.id === 'vaultDoor') this.vault.shake = 0.2;
        break;
      case 'nudge': this.shakeT = 0.18; break;
    }
  }

  setView(v) { this.view = v; }
  cycleView() { this.view = (this.view + 1) % 3; return ['PLAYER', 'OVERHEAD', 'CINEMATIC'][this.view]; }

  resize() {
    const w = this.canvas.clientWidth || window.innerWidth, h = this.canvas.clientHeight || window.innerHeight;
    this.renderer.setSize(w, h, false);
    this.composer.setPixelRatio(this.pixelRatio);
    this.composer.setSize(w, h);
    this.bloom.setSize(Math.round(w * this.pixelRatio * this.bloomScale), Math.round(h * this.pixelRatio * this.bloomScale));
    this.fitKey = null;
    this.camera.aspect = w / h;
    this.camera.updateProjectionMatrix();
  }

  // Frame the table so it fills the screen below the DMD. The camera's pose is
  // fixed (a standing player's eye), and its distance and a vertical view
  // offset are solved so the playfield spans exactly the free area.
  fitCamera(dirFrom, lookAt, fov, topPx) {
    const cam = this.camera;
    const W = this.canvas.clientWidth || window.innerWidth, H = this.canvas.clientHeight || window.innerHeight;
    cam.fov = fov; cam.clearViewOffset();
    const corners = [[0, 0.5, 3.5], [T.W, 0.5, 3.5], [-0.6, 45.8, 1.5], [T.W + 0.6, 45.8, 1.5], [T.W / 2, -0.2, 3.8]]
      .map(([x, y, z]) => V(x, y, z).applyMatrix4(this.pf.matrixWorld));
    const dir = dirFrom.clone().normalize();
    const project = (d) => {
      cam.position.copy(lookAt).addScaledVector(dir, d); cam.lookAt(lookAt); cam.updateMatrixWorld(); cam.updateProjectionMatrix();
      let minY = 1e9, maxY = -1e9, maxX = 0;
      for (const c of corners) { const p = c.clone().project(cam); minY = Math.min(minY, p.y); maxY = Math.max(maxY, p.y); maxX = Math.max(maxX, Math.abs(p.x)); }
      return { minY, maxY, maxX };
    };
    const avail = (H - topPx) / H * 2; // NDC height available
    let lo = 5, hi = 400;
    for (let i = 0; i < 40; i++) {
      const mid = (lo + hi) / 2, r = project(mid);
      const fits = (r.maxY - r.minY) <= avail * 0.985 && r.maxX <= 0.98;
      if (fits) hi = mid; else lo = mid;
    }
    const r = project(hi);
    // shift so the table's bottom edge sits at the bottom of the screen
    const shiftNdc = -1 - r.minY + 0.01;
    const shiftPx = shiftNdc * H / 2;
    cam.setViewOffset(W, H, 0, shiftPx, W, H);
    cam.updateProjectionMatrix();
  }

  updateCamera(dt) {
    const cam = this.camera;
    const aspect = cam.aspect;
    const wp = (x, y, z = 0) => V(x, y, z).applyMatrix4(this.pf.matrixWorld);
    this.pf.updateMatrixWorld();
    const dmd = document.getElementById('dmdWrap');
    const topPx = dmd ? dmd.getBoundingClientRect().bottom + 6 : 0;
    const key = `${this.view}|${aspect.toFixed(3)}|${topPx.toFixed(0)}`;
    if (this.view === 2) {
      // cinematic: lower and closer, gently tracking the balls
      cam.clearViewOffset();
      let ty = 26;
      const balls = this.m.world.balls.filter(b => b.mode !== 'gone');
      if (balls.length) ty = balls.reduce((a, b) => a + b.y, 0) / balls.length * 0.5 + 12;
      this.camTrack = this.camTrack == null ? ty : this.camTrack + (ty - this.camTrack) * Math.min(1, dt * 2.5);
      cam.fov = 44;
      cam.position.copy(wp(T.W / 2, this.camTrack + 30, 20));
      cam.lookAt(wp(T.W / 2, this.camTrack - 4));
      cam.updateProjectionMatrix();
      this.fitKey = null;
    } else if (key !== this.fitKey) {
      this.fitKey = key;
      const look = wp(T.W / 2, 22.5);
      if (this.view === 1 || aspect < 0.75) {
        const up = new THREE.Vector3(0, Math.cos(INCLINE), Math.sin(INCLINE));
        this.fitCamera(up.add(new THREE.Vector3(0, 0, 0.35)), look, 32, topPx);
      } else {
        // player view: eye above and in front of the lockdown bar
        const eye = wp(T.W / 2, 22.5 + 46, 30);
        this.fitCamera(eye.sub(look), look, 34, topPx);
      }
      this.basePos = cam.position.clone();
    }
    if (this.view !== 2 && this.basePos) {
      cam.position.copy(this.basePos);
      if (this.shakeT > 0) {
        this.shakeT -= dt;
        cam.position.add(new THREE.Vector3((Math.random() - 0.5) * 0.25, 0, (Math.random() - 0.5) * 0.25));
      }
    }
  }

  // --------------------------------------------------------------- frame
  render(dt) {
    const m = this.m, g = this.g, w = m.world;
    const time = performance.now() / 1000;
    // flippers
    for (const id in this.flippers) { const F = this.flippers[id]; F.grp.rotation.y = -F.f.angle; }
    // balls
    const seen = new Set();
    for (const b of w.balls) {
      if (b.mode === 'gone') continue;
      seen.add(b.id);
      let rec = this.ballMeshes.get(b.id);
      if (!rec) {
        const mesh = new THREE.Mesh(this.ballGeo, this.ballMat);
        mesh.castShadow = true;
        const blob = new THREE.Mesh(new THREE.PlaneGeometry(1.5, 1.5), new THREE.MeshBasicMaterial({ map: this.shadowTex, transparent: true, depthWrite: false }));
        blob.rotation.x = -Math.PI / 2;
        this.pf.add(mesh); this.pf.add(blob);
        const ghosts = [];
        for (let k = 0; k < 4; k++) {
          const gm = new THREE.Mesh(this.ghostGeo, new THREE.MeshBasicMaterial({ color: 0xc8d0ff, transparent: true, opacity: 0, depthWrite: false }));
          this.pf.add(gm); ghosts.push(gm);
        }
        rec = { mesh, blob, ghosts, prev: null }; this.ballMeshes.set(b.id, rec);
      }
      const z = b.mode === 'path' ? b.z : 0;
      rec.mesh.position.copy(V(b.x, b.y, z + R));
      rec.mesh.quaternion.set(b.q[0], b.q[1], b.q[2], b.q[3]);
      rec.blob.position.copy(V(b.x + 0.12, b.y + 0.2, (b.mode === 'path' ? Math.max(0, z - 0.02) : 0) + 0.015));
      rec.blob.material.opacity = b.mode === 'path' ? 0.35 : 0.6;
      rec.mesh.visible = rec.blob.visible = b.mode !== 'held';
      // motion trail: faint ghosts between last frame's position and now
      const cur = rec.mesh.position;
      const spd = rec.prev ? rec.prev.distanceTo(cur) / Math.max(1e-3, dt) : 0;
      rec.ghosts.forEach((gm, k) => {
        const on = rec.prev && spd > 90 && rec.mesh.visible;
        gm.visible = !!on;
        if (!on) return;
        gm.position.lerpVectors(cur, rec.prev, (k + 1) / 5);
        gm.material.opacity = Math.min(0.28, (spd - 90) / 700) * (1 - k / 4);
      });
      rec.prev = (rec.prev || new THREE.Vector3()).copy(cur);
    }
    for (const [id, rec] of this.ballMeshes) if (!seen.has(id)) {
      this.pf.remove(rec.mesh); this.pf.remove(rec.blob); rec.blob.geometry.dispose();
      for (const gm of rec.ghosts) { this.pf.remove(gm); gm.material.dispose(); }
      this.ballMeshes.delete(id);
    }
    // bumpers
    for (const id in this.bumpers) {
      const B = this.bumpers[id];
      B.t = Math.max(0, B.t - dt);
      const k = B.t > 0 ? 1 : 0;
      B.ring.position.y = 0.62 - k * 0.32;
      B.capMat.emissiveIntensity = 0.18 + k * 3.5;
      B.bodyMat.emissiveIntensity = 0.35 + k * 4;
    }
    // slings
    for (const id in this.slings) {
      const S = this.slings[id];
      S.t = Math.max(0, S.t - dt);
      const k = S.t > 0 ? Math.sin((S.t / 0.09) * Math.PI) : 0;
      S.band.position.copy(S.mid).addScaledVector(S.n, k * 0.35);
    }
    // targets
    this.drops.forEach((d, i) => {
      const target = m.dropsDown[i] ? -0.6 : 0.52;
      d.y += (target - d.y) * Math.min(1, dt * (m.dropsDown[i] ? 30 : 14));
      d.mesh.position.y = d.y;
      d.mesh.visible = d.y > -0.5;
    });
    for (const s of this.standups) { s.t = Math.max(0, s.t - dt); s.mesh.position.copy(s.base).add(new THREE.Vector3(0, 0, -s.t * 0.8)); }
    // vault door
    const vtarget = m.doorOpen ? 1 : 0;
    this.vault.open += (vtarget - this.vault.open) * Math.min(1, dt * 5);
    this.vault.hinge.rotation.y = this.vault.open * 1.9;
    this.vault.spin += dt * (0.4 + (m.doorOpen ? 0 : 1.6) * (g.p && g.p.lockLit ? 1 : 0.2));
    this.vault.wheel.rotation.z = this.vault.spin;
    if (this.vault.shake > 0) { this.vault.shake -= dt; this.vault.hinge.position.x = 6.3 + Math.sin(time * 90) * 0.04; } else this.vault.hinge.position.x = 6.3;
    // spinner and gate
    this.spinnerAxle.rotation.x = m.h.spinner.angle;
    let gateAmt = 0; for (const v of w.gateAnim.values()) gateAmt = Math.max(gateAmt, v);
    for (const [k, v] of w.gateAnim) w.gateAnim.set(k, Math.max(0, v - dt * 3));
    this.gatePivot.rotation.x = -gateAmt * 1.2;
    // plunger
    const pl = w.plunger;
    const pull = pl.pull * pl.maxPull;
    this.plunger.grp.position.copy(this.plunger.base).add(new THREE.Vector3(0, 0, pull + (pl.releaseAnim > 0 ? -0.25 : 0)));
    this.plunger.spring.scale.y = 1 - pl.pull * 0.45;
    // lamps
    const L = g.lamps();
    for (const rec of this.inserts) {
      const target = L[rec.ins.id] || 0;
      rec.v += (target - rec.v) * Math.min(1, dt * (target > rec.v ? 40 : 14)); // bulb warm-up / fade
      const v = rec.v;
      rec.mesh.material.color.copy(rec.base).multiplyScalar(0.04 + v * 2.1);
      rec.halo.material.color.copy(rec.base).multiplyScalar(v * 0.3);
      rec.halo.visible = v > 0.02;
    }
    // flashers
    const F = g.flasherLevels();
    let best = null, bestLv = 0;
    for (const id in this.flashLights) {
      const f = this.flashLights[id];
      const lv = F[id] || 0;
      f.dome.material.emissiveIntensity = 0.15 + lv * 6;
      f.glow.material.opacity = lv * 0.55;
      if (lv > bestLv) { bestLv = lv; best = f; }
    }
    if (best) { this.flashLight.position.copy(V(best.f.x, best.f.y, best.f.z)); this.flashLight.color.setHex(best.f.color); }
    this.flashLight.intensity = bestLv * 50;
    // GI flicker & tilt blackout
    const giOn = g.tilted ? 0.15 : 1;
    // lighting mood: red alarm pulses in multiball, gold for the wizard mode
    const mood = g.wizard ? 0.5 + 0.5 * Math.sin(time * 5) : g.mb ? 0.5 + 0.5 * Math.sin(time * 7) : 0;
    const moodCol = g.wizard ? this._gold || (this._gold = new THREE.Color(0xffc040)) : this._red || (this._red = new THREE.Color(0xff2030));
    for (const l of this.gi) {
      l.intensity = l.userData.base * giOn;
      if (!l.userData.col) l.userData.col = l.color.clone();
      l.color.copy(l.userData.col).lerp(moodCol, mood * 0.6);
    }
    this.beacon.visible = Math.floor(time * 1.5) % 2 === 0;
    const sirenOn = g.mb || g.wizard;
    this.sirens.forEach((s, i) => { s.material.emissiveIntensity = sirenOn ? (Math.sin(time * 10 + i * Math.PI) > 0 ? 3 : 0.2) : 0.3; });
    for (const s of this.neonSigns) s.material.color.setScalar(g.tilted ? 0.2 : 1.25 + Math.sin(time * 3 + s.id) * 0.12);
    this.neonHide.material.color.setScalar(L.startJob || L.extraBallLit ? 1.6 : 0.9);
    this.vaultLight.intensity = 2 + (m.doorOpen ? 5 : 0) + (F.flVault || 0) * 15;

    this.updateCamera(dt);
    // frame-rate governor: step quality down if we can't hold ~50 fps
    this.fps.frames++; this.fps.t += dt; this.fps.warm += dt;
    if (this.fps.t >= 3) {
      const fps = this.fps.frames / this.fps.t;
      this.fps.frames = 0; this.fps.t = 0;
      if (this.fps.warm > 4 && fps < 48 && this.quality > 0 && !this.manualQuality) {
        this.setQuality(this.quality - 1);
        if (this.onQualityChange) this.onQualityChange(['LOW', 'MEDIUM', 'HIGH'][this.quality], fps);
      }
    }
    if (this.cubeFrame++ % this.cubeEvery === 0) {
      for (const rec of this.ballMeshes.values()) rec.mesh.visible = false;
      this.cubeCam.update(this.renderer, this.scene);
      for (const b of w.balls) { const rec = this.ballMeshes.get(b.id); if (rec) rec.mesh.visible = b.mode !== 'held'; }
    }
    this.composer.render(dt);
  }
}

// ------------------------------------------------------------ geometry util
function insertShape(ins) {
  const s = ins.size, sh = new THREE.Shape();
  // mirror y because shapes are built in (x, -y)
  switch (ins.shape) {
    case 'circle': sh.absarc(0, 0, s / 2, 0, Math.PI * 2, false); break;
    case 'rect': {
      const hw = (ins.w || s * 2) / 2, hh = s / 2, r = hh * 0.6;
      sh.moveTo(-hw + r, -hh); sh.lineTo(hw - r, -hh); sh.quadraticCurveTo(hw, -hh, hw, -hh + r); sh.lineTo(hw, hh - r);
      sh.quadraticCurveTo(hw, hh, hw - r, hh); sh.lineTo(-hw + r, hh); sh.quadraticCurveTo(-hw, hh, -hw, hh - r); sh.lineTo(-hw, -hh + r);
      sh.quadraticCurveTo(-hw, -hh, -hw + r, -hh); break;
    }
    case 'arrow': {
      const h = s, hw = s * 0.42;
      const pts = [[0, -h * 0.62], [hw, -h * 0.08], [hw * 0.45, -h * 0.08], [hw * 0.45, h * 0.5], [-hw * 0.45, h * 0.5], [-hw * 0.45, -h * 0.08], [-hw, -h * 0.08]];
      pts.forEach(([x, y], i) => (i ? sh.lineTo(x, -y) : sh.moveTo(x, -y))); sh.closePath(); break;
    }
    case 'tri': sh.moveTo(0, s * 0.55); sh.lineTo(s * 0.5, -s * 0.35); sh.lineTo(-s * 0.5, -s * 0.35); sh.closePath(); break;
    case 'star':
      for (let i = 0; i < 10; i++) {
        const r = i % 2 ? s * 0.24 : s * 0.55, a = -Math.PI / 2 + i * Math.PI / 5;
        const x = Math.cos(a) * r, y = -Math.sin(a) * r;
        if (i === 0) sh.moveTo(x, y); else sh.lineTo(x, y);
      }
      sh.closePath(); break;
  }
  return sh;
}

// Plastic ramp: floor ribbon + two side walls following the path samples.
function rampMesh(S, width, wallH, material) {
  const pos = [], idx = [];
  const n = S.length;
  const up = new THREE.Vector3(0, 1, 0);
  const rows = [];
  for (let i = 0; i < n; i++) {
    const a = S[Math.max(0, i - 1)], b = S[Math.min(n - 1, i + 1)];
    const t = new THREE.Vector3(b.x - a.x, b.z - a.z, b.y - a.y).normalize();
    const right = new THREE.Vector3().crossVectors(t, up).normalize();
    const c = V(S[i].x, S[i].y, S[i].z);
    const hw = width / 2 + 0.05;
    const L = c.clone().addScaledVector(right, -hw), Rr = c.clone().addScaledVector(right, hw);
    rows.push([L.clone().add(new THREE.Vector3(0, wallH, 0)), L, Rr, Rr.clone().add(new THREE.Vector3(0, wallH, 0))]);
  }
  rows.forEach(r => r.forEach(p => pos.push(p.x, p.y, p.z)));
  for (let i = 0; i < n - 1; i++) for (let k = 0; k < 3; k++) {
    const a = i * 4 + k, b = a + 1, c = a + 4, d = a + 5;
    idx.push(a, c, b, b, c, d);
  }
  const geo = new THREE.BufferGeometry();
  geo.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
  geo.setIndex(idx);
  geo.computeVertexNormals();
  const mesh = new THREE.Mesh(geo, material);
  mesh.renderOrder = 2;
  // chrome edge rails along the top of the walls
  const grp = new THREE.Group(); grp.add(mesh);
  for (const k of [0, 3]) {
    const curve = new THREE.CatmullRomCurve3(rows.filter((_, i) => i % 3 === 0 || i === n - 1).map(r => r[k]));
    const tube = new THREE.Mesh(new THREE.TubeGeometry(curve, Math.max(8, n), 0.05, 6), new THREE.MeshStandardMaterial({ color: 0xe0e0e8, metalness: 1, roughness: 0.45 }));
    grp.add(tube);
  }
  return grp;
}

// Wireform: four steel rails forming a channel, with periodic brackets
function wireForm(parent, S, material) {
  const up = new THREE.Vector3(0, 1, 0);
  const rails = [[-0.36, 0.02], [0.36, 0.02], [-0.6, 0.55], [0.6, 0.55]];
  const pts = rails.map(() => []);
  const step = Math.max(1, Math.floor(S.length / 60));
  for (let i = 0; i < S.length; i += step) {
    const a = S[Math.max(0, i - 1)], b = S[Math.min(S.length - 1, i + 1)];
    const t = new THREE.Vector3(b.x - a.x, b.z - a.z, b.y - a.y).normalize();
    const right = new THREE.Vector3().crossVectors(t, up).normalize();
    const c = V(S[i].x, S[i].y, S[i].z);
    rails.forEach(([o, h], k) => pts[k].push(c.clone().addScaledVector(right, o).add(new THREE.Vector3(0, h - 0.05, 0))));
    if ((i / step) % 7 === 3) {
      const ring = new THREE.Mesh(new THREE.TorusGeometry(0.62, 0.03, 6, 16, Math.PI), material);
      ring.position.copy(c).add(new THREE.Vector3(0, 0.25, 0));
      ring.lookAt(c.clone().add(t)); ring.rotateZ(Math.PI);
      parent.add(ring);
    }
  }
  for (const p of pts) {
    if (p.length < 2) continue;
    const curve = new THREE.CatmullRomCurve3(p);
    const tube = new THREE.Mesh(new THREE.TubeGeometry(curve, p.length * 2, 0.055, 6), material);
    tube.castShadow = true;
    parent.add(tube);
  }
}

// ------------------------------------------------------------ texture art
function roomArt() {
  // a dim arcade at night: deep purple walls with out-of-focus neon
  const c = makeCanvas(1024, 512), g = c.getContext('2d');
  const gr = g.createLinearGradient(0, 0, 0, 512);
  gr.addColorStop(0, '#0d0918'); gr.addColorStop(0.6, '#07050e'); gr.addColorStop(1, '#030206');
  g.fillStyle = gr; g.fillRect(0, 0, 1024, 512);
  const cols = ['255,60,140', '60,170,255', '255,180,70', '140,80,255'];
  let seed = 3; const rnd = () => ((seed = (seed * 16807) % 2147483647) / 2147483647);
  for (let i = 0; i < 38; i++) {
    const x = rnd() * 1024, y = 40 + rnd() * 300, r = 12 + rnd() * 50;
    if (x > 330 && x < 694) continue; // keep the area behind the table dark
    const col = cols[i % cols.length];
    const b = g.createRadialGradient(x, y, 0, x, y, r);
    b.addColorStop(0, `rgba(${col},${0.10 + rnd() * 0.14})`); b.addColorStop(1, `rgba(${col},0)`);
    g.fillStyle = b; g.beginPath(); g.arc(x, y, r, 0, Math.PI * 2); g.fill();
  }
  // neon tube sign glow on the left wall
  g.strokeStyle = 'rgba(255,70,150,0.22)'; g.lineWidth = 6; g.lineCap = 'round';
  g.beginPath(); g.moveTo(90, 140); g.lineTo(250, 140); g.moveTo(110, 175); g.lineTo(230, 175); g.stroke();
  g.strokeStyle = 'rgba(80,180,255,0.2)';
  g.beginPath(); g.moveTo(800, 120); g.lineTo(940, 120); g.lineTo(940, 200); g.stroke();
  // floor sheen
  const fl = g.createLinearGradient(0, 380, 0, 512);
  fl.addColorStop(0, 'rgba(60,40,90,0)'); fl.addColorStop(1, 'rgba(60,40,90,0.25)');
  g.fillStyle = fl; g.fillRect(0, 380, 1024, 132);
  return c;
}

function bumperCapArt() {
  const c = makeCanvas(256, 256), g = c.getContext('2d');
  const gr = g.createRadialGradient(128, 128, 10, 128, 128, 128);
  gr.addColorStop(0, '#ffe0c0'); gr.addColorStop(0.5, '#e02040'); gr.addColorStop(1, '#600010');
  g.fillStyle = gr; g.fillRect(0, 0, 256, 256);
  g.strokeStyle = '#ffd27a'; g.lineWidth = 6;
  for (let i = 0; i < 12; i++) { const a = i / 12 * Math.PI * 2; g.beginPath(); g.moveTo(128 + Math.cos(a) * 30, 128 + Math.sin(a) * 30); g.lineTo(128 + Math.cos(a) * 118, 128 + Math.sin(a) * 118); g.stroke(); }
  g.fillStyle = '#ffd27a'; g.font = 'bold 44px Georgia'; g.textAlign = 'center'; g.textBaseline = 'middle';
  g.fillText('ALARM', 128, 128);
  return c;
}
function plasticArt(base, trim) {
  const c = makeCanvas(256, 256), g = c.getContext('2d');
  g.fillStyle = base; g.fillRect(0, 0, 256, 256);
  g.strokeStyle = trim; g.lineWidth = 5;
  for (let i = -256; i < 512; i += 26) { g.beginPath(); g.moveTo(i, 0); g.lineTo(i + 256, 256); g.stroke(); }
  return c;
}
function dropArt(i) {
  const c = makeCanvas(128, 160), g = c.getContext('2d');
  g.fillStyle = '#1a0306'; g.fillRect(0, 0, 128, 160);
  g.fillStyle = '#ff2a2a';
  for (let k = 0; k < 4; k++) g.fillRect(0, 22 + k * 34, 128, 6);
  // laser emitter: a gold ring with a hot red lens
  g.strokeStyle = '#ffd27a'; g.lineWidth = 8; g.beginPath(); g.arc(64, 84, 30, 0, Math.PI * 2); g.stroke();
  const lens = g.createRadialGradient(64, 84, 2, 64, 84, 24);
  lens.addColorStop(0, '#ffffff'); lens.addColorStop(0.3, '#ff5050'); lens.addColorStop(1, '#600000');
  g.fillStyle = lens; g.beginPath(); g.arc(64, 84, 22, 0, Math.PI * 2); g.fill();
  return c;
}
function signArt(text, col, bg) {
  const c = makeCanvas(512, 128), g = c.getContext('2d');
  g.fillStyle = bg; g.fillRect(0, 0, 512, 128);
  g.strokeStyle = col; g.lineWidth = 6; g.strokeRect(8, 8, 496, 112);
  g.font = 'bold 76px Georgia'; g.textAlign = 'center'; g.textBaseline = 'middle';
  g.shadowColor = col; g.shadowBlur = 24; g.fillStyle = col;
  g.fillText(text, 256, 68);
  g.shadowBlur = 0; g.fillStyle = '#ffffff'; g.globalAlpha = 0.65; g.fillText(text, 256, 68);
  return c;
}
function windowsArt() {
  const c = makeCanvas(128, 256), g = c.getContext('2d');
  g.fillStyle = '#15132a'; g.fillRect(0, 0, 128, 256);
  for (let y = 6; y < 250; y += 14) for (let x = 6; x < 124; x += 14) {
    g.fillStyle = Math.random() < 0.45 ? `rgba(255,${190 + Math.random() * 50 | 0},110,${0.6 + Math.random() * 0.4})` : '#0b0a18';
    g.fillRect(x, y, 8, 9);
  }
  return c;
}
function apronArt() {
  const c = makeCanvas(1024, 180), g = c.getContext('2d');
  const gr = g.createLinearGradient(0, 0, 0, 180);
  gr.addColorStop(0, '#2a2438'); gr.addColorStop(1, '#0e0b16');
  g.fillStyle = gr; g.fillRect(0, 0, 1024, 180);
  g.strokeStyle = '#d4a64a'; g.lineWidth = 3;
  const card = (x, lines, title) => {
    g.fillStyle = '#f2e6c8'; g.fillRect(x, 70, 250, 100);
    g.strokeRect(x + 4, 74, 242, 92);
    g.fillStyle = '#2a1600'; g.font = 'bold 18px Georgia'; g.textAlign = 'center'; g.fillText(title, x + 125, 94);
    g.font = '12px Georgia';
    lines.forEach((l, i) => g.fillText(l, x + 125, 114 + i * 15));
  };
  card(28, ['Laser grid + vault door = LOCK', 'Lock 3 balls: VAULT MULTIBALL', 'Ramps & loops score JACKPOTS'], 'THE VAULT');
  card(742, ['3 loops light a JOB at the hideout', 'Play all 6 jobs to light', 'THE BIG SCORE wizard mode'], 'THE JOBS');
  g.fillStyle = '#d4a64a'; g.font = 'bold 34px Georgia'; g.textAlign = 'center';
  g.fillText('MIDNIGHT  HEIST', 512, 140);
  return c;
}
function cabinetArt() {
  const c = makeCanvas(512, 128), g = c.getContext('2d');
  const gr = g.createLinearGradient(0, 0, 512, 0);
  gr.addColorStop(0, '#10081c'); gr.addColorStop(0.5, '#1e1236'); gr.addColorStop(1, '#10081c');
  g.fillStyle = gr; g.fillRect(0, 0, 512, 128);
  g.strokeStyle = '#d4a64a'; g.lineWidth = 3;
  for (let x = 0; x < 512; x += 40) { g.beginPath(); g.moveTo(x, 128); g.lineTo(x + 20, 64); g.lineTo(x + 40, 128); g.stroke(); }
  return c;
}
function backglassArt() {
  const c = makeCanvas(1024, 600), g = c.getContext('2d');
  const gr = g.createLinearGradient(0, 0, 0, 600);
  gr.addColorStop(0, '#060818'); gr.addColorStop(1, '#241046');
  g.fillStyle = gr; g.fillRect(0, 0, 1024, 600);
  for (let i = 0; i < 120; i++) { g.fillStyle = `rgba(255,255,230,${Math.random() * 0.8})`; g.fillRect(Math.random() * 1024, Math.random() * 300, 2, 2); }
  let x = 0;
  while (x < 1024) {
    const w = 40 + Math.random() * 80, h = 120 + Math.random() * 260;
    g.fillStyle = '#0b0a1c'; g.fillRect(x, 600 - h, w, h);
    for (let yy = 600 - h + 10; yy < 590; yy += 16) for (let xx = x + 6; xx < x + w - 6; xx += 12) if (Math.random() < 0.35) { g.fillStyle = 'rgba(255,200,110,0.8)'; g.fillRect(xx, yy, 6, 8); }
    x += w + 4;
  }
  g.font = 'bold 120px Georgia'; g.textAlign = 'center';
  g.shadowColor = '#ffb030'; g.shadowBlur = 30; g.fillStyle = '#ffd27a';
  g.fillText('MIDNIGHT', 512, 170); g.fillText('HEIST', 512, 300);
  return c;
}
