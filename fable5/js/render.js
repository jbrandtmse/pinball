/* DRAGON'S KEEP — canvas renderer.
 * Static playfield art cached to an offscreen at 2x; dynamic layer draws
 * lamps, toys, balls, particles, DMD and backbox each frame.
 */
"use strict";
(function (g) {
  const DK = g.DK; const C = DK.C; const M = DK.M;

  const BB = 186;              // backbox height in table units
  const VW = 540, VH = BB + C.PF_H;

  const COL = {
    room: "#07050a",
    cab: "#20122b",
    wood: "#5a3820",
    parch0: "#e2d2a8", parch1: "#c9b183",
    blue0: "#2a3667", blue1: "#1a2244",
    stone0: "#8e94a4", stone1: "#5b6170",
    gold: "#e8b64c", goldDark: "#a97c22",
    red: "#b23a2e", redDark: "#7d241c",
    steel: "#aab2c2", steelDark: "#616b7e",
    rubber: "#d94f43",
    plastic: "rgba(80,130,230,0.45)"
  };

  const LAMP_COLOR = {
    default: "#ffb347",
    aOrbitL: "#ffb347", aRampL: "#ffb347", aCata: "#ffb347", aCastle: "#ff5533",
    aRampR: "#ffb347", aOrbitR: "#ffb347", aScoop: "#b070ff",
    key0: "#ffe14d", key1: "#ffe14d", key2: "#ffe14d",
    quest0: "#59d666", quest1: "#59d666", quest2: "#59d666", quest3: "#59d666", quest4: "#59d666",
    lock1: "#ff4444", lock2: "#ff4444", multiball: "#ffffff", eb: "#ff5533",
    kickback: "#59d666", shootAgain: "#ff5533", dragon0: "#ff5533",
    inL: "#59d666", inR: "#59d666", outL: "#ff5533", outR: "#ff5533",
    troll0: "#59d666", troll1: "#59d666", drops: "#ffe14d", spinnerL: "#ffb347"
  };

  class Render {
    constructor(canvas, game, world, layout) {
      this.cv = canvas; this.game = game; this.world = world; this.layout = layout;
      this.ctx = canvas.getContext("2d");
      this.particles = [];
      this.shakeX = 0; this.shakeY = 0; this.shakeVX = 0; this.shakeVY = 0;
      this.flashT = 0;
      this.toastMsg = null; this.toastT = 0;
      this.helpOn = false;
      this.fps = 60;
      this._prevBall = new Map();
      this.time = 0;
      this._buildGlow();
      this._dmdCv = document.createElement("canvas");
      this._dmdCv.width = C.DMD_W; this._dmdCv.height = C.DMD_H;
      this._dmdCtx = this._dmdCv.getContext("2d");
      this._dmdImg = this._dmdCtx.createImageData(C.DMD_W, C.DMD_H);
      this.resize();
      g.addEventListener("resize", () => this.resize());
    }

    resize() {
      const dpr = Math.min(2, g.devicePixelRatio || 1);
      const w = g.innerWidth, h = g.innerHeight;
      this.cv.width = Math.floor(w * dpr); this.cv.height = Math.floor(h * dpr);
      this.cv.style.width = w + "px"; this.cv.style.height = h + "px";
      this.scale = Math.min(w / (VW + 30), h / VH) * dpr;
      this.ox = (this.cv.width - VW * this.scale) / 2;
      this.oy = (this.cv.height - VH * this.scale) / 2;
      this.renderStatic();
    }

    _buildGlow() {
      this.glows = {};
      for (const col of ["#ffb347", "#ffe14d", "#ff5533", "#59d666", "#b070ff", "#ffffff", "#59a8ff"]) {
        const cv = document.createElement("canvas");
        cv.width = cv.height = 64;
        const x = cv.getContext("2d");
        const gr = x.createRadialGradient(32, 32, 2, 32, 32, 30);
        gr.addColorStop(0, col);
        gr.addColorStop(0.35, col + "b0");
        gr.addColorStop(1, col + "00");
        x.fillStyle = gr; x.fillRect(0, 0, 64, 64);
        this.glows[col] = cv;
      }
    }

    // ================= static playfield =================
    renderStatic() {
      const ss = 2;
      const cv = document.createElement("canvas");
      cv.width = VW * ss; cv.height = C.PF_H * ss;
      const x = cv.getContext("2d");
      x.scale(ss, ss);

      // base: deep blue field
      const bg = x.createLinearGradient(0, 0, 0, C.PF_H);
      bg.addColorStop(0, "#232c58"); bg.addColorStop(0.5, "#1c2445"); bg.addColorStop(1, "#161b33");
      x.fillStyle = bg; x.fillRect(0, 0, VW, C.PF_H);

      // parchment center field
      x.save();
      x.beginPath();
      x.arc(264, 305, 196, 0, M.TAU);
      x.rect(88, 330, 356, 520);
      x.moveTo(88, 850); x.lineTo(150, 1010); x.lineTo(390, 1010); x.lineTo(452, 850);
      x.closePath();
      const pg = x.createLinearGradient(0, 100, 0, 1060);
      pg.addColorStop(0, COL.parch0); pg.addColorStop(1, COL.parch1);
      x.fillStyle = pg; x.fill();
      // wood grain strokes
      x.globalAlpha = 0.05; x.strokeStyle = "#7a5a30"; x.lineWidth = 1;
      for (let i = 0; i < 60; i++) {
        x.beginPath();
        const gx = 70 + (i * 137) % 410;
        x.moveTo(gx, 60); x.bezierCurveTo(gx + 8, 400, gx - 8, 700, gx + 4, 1060);
        x.stroke();
      }
      x.globalAlpha = 1;
      x.restore();

      // decorative ring around upper bowl + radial sun rays
      x.save();
      x.strokeStyle = "rgba(169,124,34,0.5)"; x.lineWidth = 3;
      x.beginPath(); x.arc(264, 300, 172, 0, M.TAU); x.stroke();
      x.globalAlpha = 0.14; x.strokeStyle = COL.goldDark;
      for (let a = 0; a < 16; a++) {
        x.beginPath();
        x.moveTo(264 + Math.cos(a / 16 * M.TAU) * 60, 300 + Math.sin(a / 16 * M.TAU) * 60);
        x.lineTo(264 + Math.cos(a / 16 * M.TAU) * 170, 300 + Math.sin(a / 16 * M.TAU) * 170);
        x.stroke();
      }
      x.globalAlpha = 1;
      x.restore();

      // dragon art (stylized, curling around left side)
      this.drawDragonArt(x, 150, 760, 1.15);

      // castle courtyard stones
      x.save();
      x.fillStyle = "rgba(110,115,135,0.3)";
      x.beginPath(); x.ellipse(370, 292, 86, 84, 0, 0, M.TAU); x.fill();
      x.restore();
      // moat
      x.save();
      x.fillStyle = "#28407a";
      x.beginPath(); x.ellipse(370, 372, 82, 20, 0, 0, Math.PI); x.fill();
      x.fillStyle = "rgba(120,170,255,0.35)";
      x.beginPath(); x.ellipse(370, 372, 60, 12, 0, 0, Math.PI); x.fill();
      x.restore();

      // heraldic banners near slings
      this.banner(x, 100, 862, COL.red);
      this.banner(x, 440, 862, "#2f5da8");

      // ---- insert cutouts (unlit) ----
      for (const id in this.layout.lamps) {
        const L = this.layout.lamps[id];
        this.insertShape(x, L, "#241a10", "#0d0906", id);
      }

      // ---- ramp entrance plastic floors ----
      x.save();
      x.fillStyle = COL.plastic;
      x.beginPath(); // left ramp lane
      x.moveTo(112, 558); x.lineTo(129, 432); x.lineTo(169, 432); x.lineTo(186, 558);
      x.closePath(); x.fill();
      x.beginPath(); // right ramp lane
      x.moveTo(390, 554); x.lineTo(403, 440); x.lineTo(450, 440); x.lineTo(437, 570);
      x.closePath(); x.fill();
      x.beginPath(); // catapult lane
      x.moveTo(216, 558); x.lineTo(223, 472); x.lineTo(257, 472); x.lineTo(264, 558);
      x.closePath(); x.fill();
      x.restore();

      // ---- sling bodies ----
      for (const tri of [this.layout.meta.slingL, this.layout.meta.slingR]) {
        x.save();
        x.beginPath();
        x.moveTo(tri[0][0], tri[0][1]); x.lineTo(tri[1][0], tri[1][1]); x.lineTo(tri[2][0], tri[2][1]);
        x.closePath();
        x.fillStyle = "#7d241c"; x.fill();
        x.strokeStyle = "#e8e2d2"; x.lineWidth = 5; x.lineJoin = "round"; x.stroke();
        // lightning decal
        const mx = (tri[0][0] + tri[1][0] + tri[2][0]) / 3, my = (tri[0][1] + tri[1][1] + tri[2][1]) / 3;
        x.fillStyle = COL.gold;
        x.beginPath();
        x.moveTo(mx + 2, my - 9); x.lineTo(mx - 4, my + 1); x.lineTo(mx, my + 1);
        x.lineTo(mx - 2, my + 9); x.lineTo(mx + 4, my - 1); x.lineTo(mx, my - 1);
        x.closePath(); x.fill();
        x.restore();
      }

      // ---- walls ----
      for (const w of this.layout.art.walls) this.wallStroke(x, w);

      // ---- posts ----
      for (const p of this.layout.art.posts) {
        x.save();
        x.fillStyle = COL.redDark;
        x.beginPath(); x.arc(p.x, p.y, p.r + 2.5, 0, M.TAU); x.fill();
        x.fillStyle = COL.rubber;
        x.beginPath(); x.arc(p.x, p.y, p.r + 1, 0, M.TAU); x.fill();
        x.fillStyle = "rgba(255,255,255,0.5)";
        x.beginPath(); x.arc(p.x - p.r * 0.3, p.y - p.r * 0.35, p.r * 0.4, 0, M.TAU); x.fill();
        x.fillStyle = "#333";
        x.beginPath(); x.arc(p.x, p.y, 1.6, 0, M.TAU); x.fill();
        x.restore();
      }

      // shooter lane details
      x.save();
      x.fillStyle = "rgba(70,70,90,0.5)";
      x.fillRect(505, 350, 32, 716);
      x.strokeStyle = COL.steelDark; x.lineWidth = 1;
      for (let yy = 380; yy < 1050; yy += 34) {
        x.beginPath(); x.moveTo(506, yy); x.lineTo(536, yy); x.stroke();
      }
      x.restore();

      // key lane letters
      const kl = "KEY";
      this.layout.meta.keyPos.forEach((p, i) => {
        x.save();
        x.fillStyle = "#f4e9c8"; x.font = "bold 15px Georgia"; x.textAlign = "center";
        x.fillText(kl[i], p[0], p[1] + 5);
        x.restore();
      });

      // labels
      this.label(x, "SPINNER", 45, 542, -90);
      this.label(x, "WIZARD'S DEN", 100, 762, 0);
      this.label(x, "CATAPULT", 240, 578, 0);
      this.label(x, "JOUST", 296, 566, -12);
      this.label(x, "DRAGON", 192, 736, 0);
      this.label(x, "KICKBACK", 60, 1024, 0);
      this.label(x, "LOCK", 370, 404, 0);

      // apron: full-width arch like a real machine
      x.save();
      x.beginPath();
      x.moveTo(0, 1032);
      x.lineTo(176, 1108);
      x.quadraticCurveTo(270, 1122, 364, 1108);
      x.lineTo(540, 1032);
      x.lineTo(540, 1120); x.lineTo(0, 1120);
      x.closePath();
      const ag = x.createLinearGradient(0, 1030, 0, 1120);
      ag.addColorStop(0, "#6b271e"); ag.addColorStop(1, "#3a120d");
      x.fillStyle = ag; x.fill();
      x.strokeStyle = COL.gold; x.lineWidth = 2.5;
      x.beginPath();
      x.moveTo(0, 1034); x.lineTo(176, 1110);
      x.quadraticCurveTo(270, 1124, 364, 1110);
      x.lineTo(540, 1034);
      x.stroke();
      x.font = "700 13px Georgia"; x.textAlign = "center";
      x.fillStyle = COL.gold;
      x.fillText("D R A G O N ' S   K E E P", 270, 1102);
      x.font = "600 8px Georgia"; x.fillStyle = "#d9a08a";
      x.fillText("STORM THE CASTLE • SLAY THE DRAGON • CLAIM THE CROWN", 270, 1114);
      x.restore();

      this.staticPF = cv;
    }

    drawDragonArt(x, cx, cy, s) {
      // side-view dragon silhouette with wing, horns and flame breath
      x.save();
      x.translate(cx, cy); x.scale(s, s);
      x.globalAlpha = 0.85;
      x.lineJoin = "round";
      // wing (behind body)
      x.fillStyle = "#6d1f18"; x.strokeStyle = COL.goldDark; x.lineWidth = 1.8;
      x.beginPath();
      x.moveTo(10, -18);
      x.quadraticCurveTo(30, -85, 88, -95);
      x.quadraticCurveTo(66, -68, 62, -50);
      x.quadraticCurveTo(78, -56, 92, -52);
      x.quadraticCurveTo(66, -38, 58, -26);
      x.quadraticCurveTo(70, -26, 78, -18);
      x.quadraticCurveTo(40, -8, 10, -18);
      x.closePath(); x.fill(); x.stroke();
      // body: neck up-left to head, tail sweeping right
      x.fillStyle = "#96352a";
      x.beginPath();
      x.moveTo(-52, -58);                       // head base
      x.bezierCurveTo(-40, -30, -30, -6, -4, 4);   // neck down
      x.bezierCurveTo(24, 14, 52, 12, 72, 28);     // back to tail root
      x.bezierCurveTo(96, 46, 92, 74, 70, 86);     // tail curl
      x.bezierCurveTo(84, 64, 80, 50, 58, 42);     // tail underside
      x.bezierCurveTo(30, 32, 0, 34, -18, 18);     // belly
      x.bezierCurveTo(-34, 2, -44, -28, -58, -46); // throat
      x.closePath(); x.fill(); x.stroke();
      // back spikes
      x.fillStyle = "#5f1a13";
      for (let i = 0; i < 5; i++) {
        const t = i / 4;
        const sx = M.lerp(-30, 60, t), sy = M.lerp(-24, 22, t) - 8 + 10 * t * t;
        x.beginPath();
        x.moveTo(sx - 5, sy + 4); x.lineTo(sx, sy - 8); x.lineTo(sx + 5, sy + 4);
        x.closePath(); x.fill();
      }
      // head
      x.fillStyle = "#96352a";
      x.beginPath();
      x.moveTo(-52, -58);
      x.lineTo(-84, -66);                        // snout
      x.lineTo(-64, -56); x.lineTo(-80, -48);    // jaw
      x.lineTo(-52, -44);
      x.closePath(); x.fill(); x.stroke();
      // horns
      x.beginPath();
      x.moveTo(-50, -62); x.lineTo(-38, -80); x.lineTo(-44, -60); x.closePath();
      x.moveTo(-44, -58); x.lineTo(-30, -72); x.lineTo(-38, -56); x.closePath();
      x.fillStyle = "#5f1a13"; x.fill();
      // eye
      x.fillStyle = "#ffd24d";
      x.beginPath(); x.arc(-60, -57, 2.4, 0, M.TAU); x.fill();
      // flame breath
      x.globalAlpha = 0.75;
      const fg = x.createLinearGradient(-84, -60, -130, -46);
      fg.addColorStop(0, "#ffd24d"); fg.addColorStop(0.5, "#ff8a3d"); fg.addColorStop(1, "rgba(255,80,40,0)");
      x.fillStyle = fg;
      x.beginPath();
      x.moveTo(-82, -60);
      x.quadraticCurveTo(-104, -66, -128, -56);
      x.quadraticCurveTo(-112, -52, -126, -44);
      x.quadraticCurveTo(-104, -44, -80, -50);
      x.closePath(); x.fill();
      x.globalAlpha = 1;
      x.restore();
    }

    banner(x, bx, by, col) {
      x.save();
      x.fillStyle = col;
      x.beginPath();
      x.moveTo(bx - 11, by); x.lineTo(bx + 11, by); x.lineTo(bx + 11, by + 34);
      x.lineTo(bx, by + 26); x.lineTo(bx - 11, by + 34);
      x.closePath(); x.fill();
      x.strokeStyle = COL.gold; x.lineWidth = 1.5; x.stroke();
      x.fillStyle = COL.gold;
      x.beginPath(); x.arc(bx, by + 11, 4, 0, M.TAU); x.fill();
      x.restore();
    }

    label(x, txt, lx, ly, rot) {
      x.save();
      x.translate(lx, ly); x.rotate(M.d2r(rot || 0));
      x.font = "600 9px Georgia"; x.textAlign = "center";
      x.fillStyle = "rgba(60,40,14,0.85)";
      x.fillText(txt, 0, 0);
      x.restore();
    }

    wallStroke(x, w) {
      const style = w.style;
      x.save();
      x.lineCap = "round"; x.lineJoin = "round";
      const path = () => {
        x.beginPath();
        x.moveTo(w.pts[0][0], w.pts[0][1]);
        for (let i = 1; i < w.pts.length; i++) x.lineTo(w.pts[i][0], w.pts[i][1]);
      };
      if (style === "cab") {
        path(); x.strokeStyle = "#33203f"; x.lineWidth = 13; x.stroke();
        path(); x.strokeStyle = "#54356a"; x.lineWidth = 8; x.stroke();
        path(); x.strokeStyle = "rgba(200,170,255,0.35)"; x.lineWidth = 2; x.stroke();
      } else if (style === "stone") {
        path(); x.strokeStyle = "#3b404e"; x.lineWidth = 9; x.stroke();
        path(); x.strokeStyle = COL.stone1; x.lineWidth = 6; x.stroke();
        path(); x.strokeStyle = "rgba(220,225,235,0.4)"; x.lineWidth = 1.5; x.stroke();
      } else if (style === "sling") {
        path(); x.strokeStyle = "#7d241c"; x.lineWidth = 8; x.stroke();
        path(); x.strokeStyle = "#e8e2d2"; x.lineWidth = 4.5; x.stroke();
      } else if (style === "ramp") {
        path(); x.strokeStyle = "rgba(40,70,160,0.8)"; x.lineWidth = 7; x.stroke();
        path(); x.strokeStyle = "rgba(140,180,255,0.8)"; x.lineWidth = 2.5; x.stroke();
      } else if (style === "lane") {
        path(); x.strokeStyle = "#4a5468"; x.lineWidth = 8; x.stroke();
        path(); x.strokeStyle = "#c3cad8"; x.lineWidth = 3; x.stroke();
      } else if (style === "scoop") {
        path(); x.strokeStyle = "#2b2350"; x.lineWidth = 8; x.stroke();
        path(); x.strokeStyle = "#7a68c9"; x.lineWidth = 3; x.stroke();
      } else if (style === "gate") {
        x.setLineDash([7, 5]);
        path(); x.strokeStyle = "rgba(200,210,230,0.85)"; x.lineWidth = 2.5; x.stroke();
        x.setLineDash([]);
      } else if (style === "target") {
        // drawn as toy
      } else {
        path(); x.strokeStyle = COL.steelDark; x.lineWidth = 7; x.stroke();
        path(); x.strokeStyle = COL.steel; x.lineWidth = 3; x.stroke();
      }
      x.restore();
    }

    insertShape(x, L, fill, stroke, id) {
      x.save();
      x.translate(L.x, L.y);
      if (L.kind === "arrow") {
        x.rotate(M.d2r(L.rot || 0));
        x.beginPath();
        x.moveTo(0, -14); x.lineTo(9, 6); x.lineTo(-9, 6);
        x.closePath();
      } else if (L.kind === "shield") {
        x.beginPath();
        x.moveTo(0, -10); x.lineTo(9, -6); x.lineTo(9, 3); x.quadraticCurveTo(9, 10, 0, 13);
        x.quadraticCurveTo(-9, 10, -9, 3); x.lineTo(-9, -6);
        x.closePath();
      } else {
        const r = L.kind === "small" ? 5.5 : 8.5;
        x.beginPath(); x.arc(0, 0, r, 0, M.TAU);
      }
      x.fillStyle = fill; x.fill();
      x.strokeStyle = stroke; x.lineWidth = 1.5; x.stroke();
      x.restore();
    }

    // ================= per-frame =================
    draw(dt) {
      this.time += dt;
      const x = this.ctx, gm = this.game;
      // shake spring
      this.shakeVX += -this.shakeX * 240 * dt - this.shakeVX * 8 * dt;
      this.shakeVY += -this.shakeY * 240 * dt - this.shakeVY * 8 * dt;
      this.shakeX += this.shakeVX * dt; this.shakeY += this.shakeVY * dt;
      if (this.flashT > 0) this.flashT -= dt;
      if (this.toastT > 0) this.toastT -= dt;

      // consume fx
      for (const fx of gm.fxQ) this.spawnFx(fx);
      gm.fxQ.length = 0;

      // room bg
      x.setTransform(1, 0, 0, 1, 0, 0);
      x.fillStyle = COL.room;
      x.fillRect(0, 0, this.cv.width, this.cv.height);
      this.drawCabinetSides(x);

      x.setTransform(this.scale, 0, 0, this.scale, this.ox + this.shakeX * this.scale, this.oy + this.shakeY * this.scale);

      // backbox
      this.drawBackbox(x);

      // playfield
      x.save();
      x.translate(0, BB);
      x.drawImage(this.staticPF, 0, 0, VW, C.PF_H);

      this.drawLamps(x);
      this.drawSpinner(x);
      this.drawCastle(x);
      this.drawTrolls(x);
      this.drawDrops(x);
      this.drawDragonTarget(x);
      this.drawScoop(x);
      this.drawCatapult(x);
      this.drawKickback(x);
      this.drawSlings(x);
      this.drawPops(x);
      this.drawWireforms(x);
      this.drawPlunger(x);
      this.drawFlippers(x);
      this.drawBalls(x);
      this.drawParticles(x, dt);

      // GI / flash overlay
      if (gm.giLevel > 1 || this.flashT > 0) {
        x.save();
        x.globalCompositeOperation = "lighter";
        const a = Math.max((gm.giLevel - 1) * 0.25, this.flashT > 0 ? this.flashT * 3.2 : 0);
        x.fillStyle = `rgba(255,240,210,${Math.min(0.55, a)})`;
        x.fillRect(0, 0, VW, C.PF_H);
        x.restore();
      }
      // tilt dead board dim
      if (gm.tilt) {
        x.fillStyle = "rgba(10,8,14,0.45)";
        x.fillRect(0, 0, VW, C.PF_H);
      }
      x.restore();

      this.drawOverlays(x);
    }

    drawCabinetSides(x) {
      const leftW = this.ox, h = this.cv.height;
      if (leftW < 8) return;
      const gr = x.createLinearGradient(0, 0, leftW, 0);
      gr.addColorStop(0, "#0a0612"); gr.addColorStop(1, "#241533");
      x.fillStyle = gr; x.fillRect(0, 0, leftW, h);
      const gr2 = x.createLinearGradient(this.cv.width, 0, this.cv.width - leftW, 0);
      gr2.addColorStop(0, "#0a0612"); gr2.addColorStop(1, "#241533");
      x.fillStyle = gr2; x.fillRect(this.cv.width - leftW, 0, leftW, h);
      // castle silhouettes
      x.save();
      x.fillStyle = "rgba(90,60,140,0.22)";
      const sw = Math.min(leftW * 0.8, 140 * this.scale / 2);
      for (const sx of [leftW * 0.5, this.cv.width - leftW * 0.5]) {
        x.beginPath();
        x.moveTo(sx - sw / 2, h * 0.72);
        x.lineTo(sx - sw / 2, h * 0.5);
        x.lineTo(sx - sw * 0.3, h * 0.5); x.lineTo(sx - sw * 0.3, h * 0.44);
        x.lineTo(sx - sw * 0.1, h * 0.44); x.lineTo(sx - sw * 0.1, h * 0.38);
        x.lineTo(sx + sw * 0.1, h * 0.38); x.lineTo(sx + sw * 0.1, h * 0.44);
        x.lineTo(sx + sw * 0.3, h * 0.44); x.lineTo(sx + sw * 0.3, h * 0.5);
        x.lineTo(sx + sw / 2, h * 0.5); x.lineTo(sx + sw / 2, h * 0.72);
        x.closePath(); x.fill();
      }
      x.restore();
    }

    drawBackbox(x) {
      x.save();
      const grad = x.createLinearGradient(0, 0, 0, BB);
      grad.addColorStop(0, "#2d1738"); grad.addColorStop(1, "#180d20");
      x.fillStyle = grad;
      x.fillRect(0, 0, VW, BB);
      x.strokeStyle = COL.gold; x.lineWidth = 2;
      x.strokeRect(4, 3, VW - 8, BB - 6);
      // marquee
      x.font = "700 30px Georgia"; x.textAlign = "center";
      x.fillStyle = COL.gold;
      x.shadowColor = "#ff9518"; x.shadowBlur = 14;
      x.fillText("DRAGON'S  KEEP", VW / 2, 36);
      x.shadowBlur = 0;
      x.font = "600 11px Georgia"; x.fillStyle = "#c9a0ff";
      x.fillText("A  W I L L I A M S · S T Y L E  T A B L E", VW / 2, 52);
      // dmd
      this.drawDMD(x, 46, 62, 448, 112);
      x.restore();
    }

    drawDMD(x, dx, dy, dw, dh) {
      const gm = this.game;
      const buf = gm.dmd.buf, img = this._dmdImg;
      const pal = [[26, 8, 0], [92, 38, 0], [178, 89, 8], [255, 149, 24]];
      for (let i = 0; i < buf.length; i++) {
        const p = pal[buf[i]];
        img.data[i * 4] = p[0]; img.data[i * 4 + 1] = p[1]; img.data[i * 4 + 2] = p[2];
        img.data[i * 4 + 3] = 255;
      }
      this._dmdCtx.putImageData(img, 0, 0);
      x.save();
      x.fillStyle = "#0d0502";
      x.fillRect(dx - 8, dy - 8, dw + 16, dh + 16);
      x.strokeStyle = "#443322"; x.lineWidth = 2;
      x.strokeRect(dx - 8, dy - 8, dw + 16, dh + 16);
      x.imageSmoothingEnabled = false;
      // soft bloom pass
      x.globalAlpha = 0.55;
      x.drawImage(this._dmdCv, dx - 3, dy - 3, dw + 6, dh + 6);
      x.globalAlpha = 1;
      x.drawImage(this._dmdCv, dx, dy, dw, dh);
      x.imageSmoothingEnabled = true;
      // dot grid
      x.globalAlpha = 0.18; x.strokeStyle = "#000"; x.lineWidth = 1;
      x.beginPath();
      const cw = dw / C.DMD_W;
      for (let i = 0; i <= C.DMD_W; i += 2) { x.moveTo(dx + i * cw, dy); x.lineTo(dx + i * cw, dy + dh); }
      for (let j = 0; j <= C.DMD_H; j += 2) { x.moveTo(dx, dy + j * cw * 2); x.lineTo(dx + dw, dy + j * cw * 2); }
      x.stroke();
      x.globalAlpha = 1;
      x.restore();
    }

    lampBright(id, mode) {
      const gm = this.game;
      if (gm.state === "attract") {
        // sweeping wave
        const L = this.layout.lamps[id];
        return 0.5 + 0.5 * Math.sin(this.time * 3 - L.y * 0.012 - L.x * 0.004);
      }
      if (this.game.flashers[id]) return 1;
      if (!mode) return 0;
      if (mode === 1) return 1;
      const f = mode === 2 ? 2.6 : 7;
      return Math.sin(this.time * f * Math.PI) > 0 ? 1 : 0;
    }

    drawLamps(x) {
      const gm = this.game;
      x.save();
      for (const id in this.layout.lamps) {
        const L = this.layout.lamps[id];
        const b = this.lampBright(id, gm.lampState[id] || 0);
        if (b <= 0.02) continue;
        const col = LAMP_COLOR[id] || LAMP_COLOR.default;
        x.globalAlpha = b;
        this.insertShape(x, L, col, "rgba(255,255,255,0.55)", id);
        x.globalCompositeOperation = "lighter";
        x.globalAlpha = 0.75 * b;
        const s = L.kind === "small" ? 40 : 58;
        const glow = this.glows[col] || this.glows["#ffb347"];
        x.drawImage(glow, L.x - s / 2, L.y - s / 2, s, s);
        x.globalCompositeOperation = "source-over";
      }
      x.globalAlpha = 1;
      x.restore();
    }

    drawSpinner(x) {
      const sp = this.layout.meta.spinner, st = this.game.spinner;
      x.save();
      x.translate(sp.x, sp.y);
      x.fillStyle = COL.steelDark;
      x.fillRect(-sp.w / 2 - 3, -2, 4, 6); x.fillRect(sp.w / 2 - 1, -2, 4, 6);
      const c = Math.cos((st.pos || 0) * M.TAU);
      const hh = 13 * Math.abs(c) + 1;
      const gr = x.createLinearGradient(0, -hh, 0, hh);
      gr.addColorStop(0, c > 0 ? "#ffd873" : "#8a6a1e");
      gr.addColorStop(1, c > 0 ? "#a97c22" : "#5a4310");
      x.fillStyle = gr;
      x.fillRect(-sp.w / 2 + 2, -hh, sp.w - 4, hh * 2);
      x.strokeStyle = "#443308"; x.lineWidth = 1;
      x.strokeRect(-sp.w / 2 + 2, -hh, sp.w - 4, hh * 2);
      x.restore();
    }

    drawCastle(x) {
      const gm = this.game, ca = gm.castleAnim, mt = this.layout.meta.castle;
      x.save();
      if (ca.shake > 0) x.translate((Math.random() - 0.5) * 5 * ca.shake * 3, (Math.random() - 0.5) * 4 * ca.shake * 3);
      const { x0, y0, x1, y1 } = mt;
      // keep body
      const bw = x1 - x0;
      const bg = x.createLinearGradient(x0, 0, x1, 0);
      bg.addColorStop(0, "#6d7383"); bg.addColorStop(0.5, "#8e94a4"); bg.addColorStop(1, "#565c6b");
      x.fillStyle = bg;
      x.fillRect(x0 + 8, y0 + 6, bw - 16, y1 - y0 - 6);
      // stone lines
      x.strokeStyle = "rgba(40,44,55,0.5)"; x.lineWidth = 1;
      for (let yy = y0 + 18; yy < y1; yy += 14) {
        x.beginPath(); x.moveTo(x0 + 9, yy); x.lineTo(x1 - 9, yy); x.stroke();
      }
      for (let i = 0; i < 8; i++) {
        const sx = x0 + 16 + i * 14, off = (i % 2) * 7;
        x.beginPath(); x.moveTo(sx + off, y0 + 6 + (i % 2) * 14); x.lineTo(sx + off, y1); x.stroke();
      }
      // crenellations
      x.fillStyle = "#79808f";
      for (let i = 0; i < 9; i++) {
        if (i % 2 === 0) x.fillRect(x0 + 10 + i * (bw - 20) / 9, y0 - 2, (bw - 20) / 9, 10);
      }
      // towers
      for (const tx of [x0 + 4, x1 - 4]) {
        const tg = x.createLinearGradient(tx - 15, 0, tx + 15, 0);
        tg.addColorStop(0, "#5a6070"); tg.addColorStop(0.5, "#9aa0b0"); tg.addColorStop(1, "#4c5260");
        x.fillStyle = tg;
        x.fillRect(tx - 14, y0 - 8, 28, y1 - y0 + 8);
        x.beginPath();
        x.moveTo(tx - 17, y0 - 8); x.lineTo(tx, y0 - 34); x.lineTo(tx + 17, y0 - 8);
        x.closePath();
        x.fillStyle = "#7d241c"; x.fill();
        // flag
        const wav = Math.sin(gm.castleAnim.flag * 5 + tx) * 3;
        x.strokeStyle = "#c9b183"; x.lineWidth = 1.5;
        x.beginPath(); x.moveTo(tx, y0 - 34); x.lineTo(tx, y0 - 48); x.stroke();
        x.fillStyle = COL.gold;
        x.beginPath();
        x.moveTo(tx, y0 - 48); x.quadraticCurveTo(tx + 8, y0 - 46 + wav, tx + 15, y0 - 44 + wav);
        x.quadraticCurveTo(tx + 8, y0 - 42 + wav, tx, y0 - 40);
        x.closePath(); x.fill();
      }
      // gate arch
      const gx = (mt.gate[0] + mt.gate[1]) / 2;
      x.fillStyle = "#20242e";
      x.beginPath();
      x.moveTo(mt.gate[0], y1);
      x.lineTo(mt.gate[0], y1 - 26);
      x.quadraticCurveTo(gx, y1 - 44, mt.gate[1], y1 - 26);
      x.lineTo(mt.gate[1], y1);
      x.closePath(); x.fill();
      // portcullis (slides up as gate opens)
      const openF = ca.gate;
      if (openF < 0.98) {
        x.save();
        x.beginPath();
        x.rect(mt.gate[0], y1 - 40, mt.gate[1] - mt.gate[0], 40);
        x.clip();
        x.translate(0, -34 * openF);
        x.strokeStyle = "#6b7280"; x.lineWidth = 2.5;
        x.beginPath();
        for (let i = 0; i <= 4; i++) {
          const bx = mt.gate[0] + 4 + i * (mt.gate[1] - mt.gate[0] - 8) / 4;
          x.moveTo(bx, y1 - 42); x.lineTo(bx, y1 + 2);
        }
        for (let j = 0; j < 3; j++) {
          x.moveTo(mt.gate[0], y1 - 34 + j * 14); x.lineTo(mt.gate[1], y1 - 34 + j * 14);
        }
        x.stroke();
        x.restore();
      }
      // drawbridge (lowers over the moat)
      const bf = ca.bridge;
      if (bf > 0.02) {
        x.save();
        const bl = 30 * bf;
        const bg2 = x.createLinearGradient(0, y1, 0, y1 + bl);
        bg2.addColorStop(0, "#8a5a2e"); bg2.addColorStop(1, "#5f3c1c");
        x.fillStyle = bg2;
        x.beginPath();
        x.moveTo(mt.gate[0] + 2, y1);
        x.lineTo(mt.gate[1] - 2, y1);
        x.lineTo(mt.gate[1] + 4, y1 + bl);
        x.lineTo(mt.gate[0] - 4, y1 + bl);
        x.closePath(); x.fill();
        x.strokeStyle = "rgba(30,18,8,0.6)"; x.lineWidth = 1;
        for (let i = 1; i < 4; i++) {
          const px = M.lerp(mt.gate[0] + 2, mt.gate[1] - 2, i / 4);
          const px2 = M.lerp(mt.gate[0] - 4, mt.gate[1] + 4, i / 4);
          x.beginPath(); x.moveTo(px, y1); x.lineTo(px2, y1 + bl); x.stroke();
        }
        x.restore();
      }
      // destroyed-castle shields on the left tower
      const p = gm.p;
      if (p && p.castles > 0) {
        for (let i = 0; i < Math.min(4, p.castles); i++) {
          x.fillStyle = COL.gold;
          x.beginPath(); x.arc(x0 + 4 - 8 + i * 8, y0 - 14, 2.6, 0, M.TAU); x.fill();
        }
      }
      // boom flash
      if (ca.boom > 0) {
        x.globalCompositeOperation = "lighter";
        x.fillStyle = `rgba(255,190,90,${Math.min(0.85, ca.boom)})`;
        x.beginPath(); x.arc(370, 290, 120 * (1.4 - ca.boom * 0.5), 0, M.TAU); x.fill();
        x.globalCompositeOperation = "source-over";
      }
      x.restore();
    }

    drawTrolls(x) {
      const gm = this.game;
      this.layout.meta.trolls.forEach((t, i) => {
        const a = gm.trollAnim[i];
        x.save();
        x.translate(t[0], t[1]);
        x.fillStyle = "rgba(10,8,6,0.75)";
        x.beginPath(); x.ellipse(0, 6, 15, 7, 0, 0, M.TAU); x.fill();
        if (a > 0.03) {
          const s = a;
          x.translate(0, 8 - 14 * s);
          x.scale(s, s);
          // head
          x.fillStyle = "#5f8f3e";
          x.beginPath(); x.arc(0, 0, 13, 0, M.TAU); x.fill();
          // ears
          x.beginPath(); x.moveTo(-12, -4); x.lineTo(-19, -10); x.lineTo(-10, -9); x.closePath(); x.fill();
          x.beginPath(); x.moveTo(12, -4); x.lineTo(19, -10); x.lineTo(10, -9); x.closePath(); x.fill();
          // eyes
          x.fillStyle = "#ffd24d";
          x.beginPath(); x.arc(-5, -3, 2.5, 0, M.TAU); x.arc(5, -3, 2.5, 0, M.TAU); x.fill();
          x.fillStyle = "#20140a";
          x.beginPath(); x.arc(-5, -3, 1.2, 0, M.TAU); x.arc(5, -3, 1.2, 0, M.TAU); x.fill();
          // mouth + teeth
          x.fillStyle = "#33230f";
          x.beginPath(); x.ellipse(0, 6, 6.5, 3.5, 0, 0, Math.PI); x.fill();
          x.fillStyle = "#f4e9c8";
          x.fillRect(-5, 5, 3, 3); x.fillRect(2, 5, 3, 3);
        }
        x.restore();
      });
    }

    drawDrops(x) {
      const gm = this.game;
      const letters = "JST";
      this.layout.meta.drops.forEach((d, i) => {
        const down = gm.dropAnim[i] > 0.5;
        x.save();
        x.translate(d[0], d[1]); x.rotate(d[2]);
        if (down) {
          x.fillStyle = "rgba(8,6,10,0.8)";
          x.fillRect(-10, -3, 20, 6);
        } else {
          x.fillStyle = "#701812";
          x.fillRect(-10, -10, 20, 13);
          x.fillStyle = "#c33327";
          x.fillRect(-10, -12, 20, 5);
          x.fillStyle = "#fff";
          x.font = "bold 10px Georgia"; x.textAlign = "center";
          x.fillText(letters[i], 0, 1);
        }
        x.restore();
      });
    }

    drawDragonTarget(x) {
      x.save();
      x.translate(192.5, 707.5); x.rotate(M.d2r(58));
      const b = this.lampBright("dragon0", this.game.lampState.dragon0 || 0);
      x.fillStyle = b > 0.5 ? "#ff6a3d" : "#8f1f16";
      x.beginPath();
      x.moveTo(0, -9); x.lineTo(6.5, 0); x.lineTo(0, 9); x.lineTo(-6.5, 0);
      x.closePath(); x.fill();
      x.strokeStyle = "#f4e9c8"; x.lineWidth = 1.2; x.stroke();
      x.restore();
    }

    drawScoop(x) {
      const s = this.layout.meta.scoop;
      x.save();
      x.translate(s.x, s.y);
      x.fillStyle = "rgba(6,4,10,0.9)";
      x.beginPath(); x.ellipse(2, 4, 15, 11, 0.5, 0, M.TAU); x.fill();
      x.strokeStyle = "#7a68c9"; x.lineWidth = 2;
      x.beginPath(); x.ellipse(2, 4, 15, 11, 0.5, 0, M.TAU); x.stroke();
      // wizard stars
      x.fillStyle = "#b070ff";
      for (const [px, py] of [[-16, -18], [-24, -6], [-10, -28]]) {
        x.save(); x.translate(px, py); x.rotate(this.time % 6);
        x.beginPath();
        for (let i = 0; i < 5; i++) {
          const a1 = (i / 5) * M.TAU - Math.PI / 2, a2 = a1 + M.TAU / 10;
          x.lineTo(Math.cos(a1) * 4, Math.sin(a1) * 4);
          x.lineTo(Math.cos(a2) * 1.6, Math.sin(a2) * 1.6);
        }
        x.closePath(); x.fill(); x.restore();
      }
      x.restore();
    }

    drawCatapult(x) {
      const gm = this.game, c = this.layout.meta.catapult;
      x.save();
      x.translate(c.x, c.y - 6);
      // base
      x.fillStyle = "#6d4423";
      x.fillRect(-13, 2, 26, 7);
      // arm: rest points down into pocket; anim swings up-left (throw)
      const t = gm.catapultAnim > 0 ? 1 - gm.catapultAnim / 0.9 : 0;
      const swing = gm.catapultAnim > 0 ? Math.sin(Math.min(1, t * 2.2) * Math.PI * 0.72) : 0;
      const ang = M.d2r(35 - 115 * swing);
      x.save();
      x.rotate(ang);
      x.fillStyle = "#8a5a2e";
      x.fillRect(-2.5, -26, 5, 28);
      x.fillStyle = "#5f3c1c";
      x.beginPath(); x.arc(0, -26, 6, 0, M.TAU); x.fill();
      x.restore();
      x.fillStyle = "#4c3018";
      x.beginPath(); x.arc(0, 2, 4, 0, M.TAU); x.fill();
      x.restore();
    }

    drawKickback(x) {
      const gm = this.game, k = this.layout.meta.kickback;
      if (gm.kickbackAnim > 0) {
        x.save();
        x.globalCompositeOperation = "lighter";
        x.globalAlpha = gm.kickbackAnim * 2;
        x.drawImage(this.glows["#59d666"], k.x - 30, k.y - 45, 60, 90);
        x.restore();
      }
    }

    drawSlings(x) {
      const gm = this.game;
      [this.layout.meta.slingL, this.layout.meta.slingR].forEach((tri, i) => {
        const a = gm.slingAnim[i];
        if (a <= 0) return;
        x.save();
        x.globalAlpha = Math.min(0.7, a);
        x.fillStyle = "#fff";
        x.beginPath();
        x.moveTo(tri[0][0], tri[0][1]); x.lineTo(tri[1][0], tri[1][1]); x.lineTo(tri[2][0], tri[2][1]);
        x.closePath(); x.fill();
        x.restore();
      });
    }

    drawPops(x) {
      const gm = this.game;
      const icons = ["#ffd24d", "#59a8ff", "#ff6a3d"];
      this.layout.meta.pops.forEach((p, i) => {
        const a = gm.popAnim[i];
        x.save();
        x.translate(p[0], p[1]);
        const s = 1 + a * 0.1;
        x.scale(s, s);
        // skirt
        x.fillStyle = "rgba(240,235,220,0.25)";
        x.beginPath(); x.arc(0, 0, 30, 0, M.TAU); x.fill();
        // body
        const bodyG = x.createRadialGradient(-6, -8, 4, 0, 0, 26);
        bodyG.addColorStop(0, "#e8524a"); bodyG.addColorStop(0.7, "#9c2018"); bodyG.addColorStop(1, "#6d120c");
        x.fillStyle = bodyG;
        x.beginPath(); x.arc(0, 0, 24, 0, M.TAU); x.fill();
        // cap
        const capG = x.createRadialGradient(-4, -6, 2, 0, 0, 15);
        capG.addColorStop(0, "#fff3d0"); capG.addColorStop(1, icons[i]);
        x.fillStyle = capG;
        x.beginPath(); x.arc(0, 0, 14, 0, M.TAU); x.fill();
        x.strokeStyle = "rgba(60,30,10,0.6)"; x.lineWidth = 1.5;
        x.beginPath(); x.arc(0, 0, 14, 0, M.TAU); x.stroke();
        // crown icon
        x.fillStyle = "rgba(60,30,10,0.75)";
        x.beginPath();
        x.moveTo(-6, 3); x.lineTo(-6, -2); x.lineTo(-3, 1); x.lineTo(0, -4);
        x.lineTo(3, 1); x.lineTo(6, -2); x.lineTo(6, 3);
        x.closePath(); x.fill();
        if (a > 0) {
          x.globalCompositeOperation = "lighter";
          x.globalAlpha = a * 0.9;
          x.drawImage(this.glows["#ffe14d"], -40, -40, 80, 80);
          x.globalCompositeOperation = "source-over";
        }
        x.restore();
      });
    }

    drawWireforms(x) {
      x.save();
      x.lineCap = "round";
      // elevation shadows first
      for (const key of ["left", "right"]) {
        const pts = this.layout.ramps[key].path;
        x.beginPath();
        for (let i = 0; i < pts.length; i++) {
          const sx = pts[i][0] + 5 + pts[i][2] * 0.1, sy = pts[i][1] + 8 + pts[i][2] * 0.16;
          if (i === 0) x.moveTo(sx, sy); else x.lineTo(sx, sy);
        }
        x.strokeStyle = "rgba(15,10,8,0.18)";
        x.lineWidth = 13; x.stroke();
      }
      for (const key of ["left", "right"]) {
        const r = this.layout.ramps[key];
        const pts = r.path;
        for (const off of [-5.5, 5.5]) {
          x.beginPath();
          for (let i = 0; i < pts.length - 1; i++) {
            const dx = pts[i + 1][0] - pts[i][0], dy = pts[i + 1][1] - pts[i][1];
            const l = Math.hypot(dx, dy) || 1;
            const nx = -dy / l * off, ny = dx / l * off;
            if (i === 0) x.moveTo(pts[i][0] + nx, pts[i][1] + ny);
            x.lineTo(pts[i + 1][0] + nx, pts[i + 1][1] + ny);
          }
          x.strokeStyle = "rgba(30,34,48,0.55)";
          x.lineWidth = 4; x.stroke();
          x.strokeStyle = "rgba(200,210,230,0.75)";
          x.lineWidth = 1.8; x.stroke();
        }
        // crossties
        x.strokeStyle = "rgba(170,180,200,0.5)"; x.lineWidth = 1.4;
        for (let i = 1; i < pts.length - 1; i += 2) {
          const dx = pts[i + 1][0] - pts[i][0], dy = pts[i + 1][1] - pts[i][1];
          const l = Math.hypot(dx, dy) || 1;
          const nx = -dy / l * 6.5, ny = dx / l * 6.5;
          x.beginPath();
          x.moveTo(pts[i][0] + nx, pts[i][1] + ny);
          x.lineTo(pts[i][0] - nx, pts[i][1] - ny);
          x.stroke();
        }
      }
      x.restore();
    }

    drawPlunger(x) {
      const gm = this.game;
      const q = gm.plunger.held ? gm.plunger.q : (gm.plunger.fireT > 0 ? -0.25 * gm.plunger.fireT / 0.2 : 0);
      const py = 1074 + q * 22;
      x.save();
      // spring
      x.strokeStyle = "#8f97a8"; x.lineWidth = 2;
      x.beginPath();
      const coils = 7;
      for (let i = 0; i <= coils * 2; i++) {
        const yy = py + 4 + (i / (coils * 2)) * (1112 - py - 8);
        const xx = C.SHOOT_CX + (i % 2 === 0 ? -7 : 7);
        if (i === 0) x.moveTo(xx, yy); else x.lineTo(xx, yy);
      }
      x.stroke();
      // rod + tip
      x.fillStyle = "#c8ced9";
      x.fillRect(C.SHOOT_CX - 2.5, py, 5, 1112 - py);
      x.fillStyle = "#42120c";
      x.beginPath(); x.arc(C.SHOOT_CX, py, 9, 0, M.TAU); x.fill();
      x.fillStyle = "#7d241c";
      x.beginPath(); x.arc(C.SHOOT_CX - 2, py - 2, 5, 0, M.TAU); x.fill();
      x.restore();
    }

    drawFlippers(x) {
      for (const side of ["L", "R"]) {
        const f = this.layout.flip[side];
        const tx = f.pivotX + Math.cos(f.angle) * f.len;
        const ty = f.pivotY + Math.sin(f.angle) * f.len;
        x.save();
        // shadow
        x.fillStyle = "rgba(20,12,4,0.35)";
        this.capsulePath(x, f.pivotX + 3, f.pivotY + 5, tx + 3, ty + 5, f.r0, f.r1);
        x.fill();
        // rubber
        x.fillStyle = "#8f1f16";
        this.capsulePath(x, f.pivotX, f.pivotY, tx, ty, f.r0 + 1.5, f.r1 + 1.5);
        x.fill();
        // bat
        const grd = x.createLinearGradient(f.pivotX, f.pivotY - 12, f.pivotX, f.pivotY + 12);
        grd.addColorStop(0, "#ffe08a"); grd.addColorStop(0.5, "#f5c542"); grd.addColorStop(1, "#c28f1e");
        x.fillStyle = grd;
        this.capsulePath(x, f.pivotX, f.pivotY, tx, ty, f.r0 - 1.5, f.r1 - 1.5);
        x.fill();
        // pivot dome
        x.fillStyle = "#8a6a1e";
        x.beginPath(); x.arc(f.pivotX, f.pivotY, 5, 0, M.TAU); x.fill();
        x.restore();
      }
    }
    capsulePath(x, ax, ay, bx, by, r0, r1) {
      const a = Math.atan2(by - ay, bx - ax);
      x.beginPath();
      x.arc(ax, ay, r0, a + Math.PI / 2, a - Math.PI / 2);
      x.arc(bx, by, r1, a - Math.PI / 2, a + Math.PI / 2);
      x.closePath();
    }

    drawBalls(x) {
      for (const b of this.world.balls) {
        const h = (b.onRamp ? b.rampH : 0) || b.tossH || 0;
        const dy = h * 0.4;
        const sc = 1 + h * 0.004;
        const prev = this._prevBall.get(b.id);
        x.save();
        // shadow
        x.fillStyle = `rgba(15,10,5,${0.35 - h * 0.002})`;
        x.beginPath();
        x.ellipse(b.x + 3 + h * 0.12, b.y + 6, b.r * 0.95, b.r * 0.62, 0, 0, M.TAU);
        x.fill();
        // motion streak
        if (prev && !b.held) {
          const vx = b.x - prev[0], vy = b.y - prev[1];
          const sp = Math.hypot(vx, vy);
          if (sp > 6) {
            x.strokeStyle = "rgba(220,225,235,0.28)";
            x.lineWidth = b.r * 1.5;
            x.lineCap = "round";
            x.beginPath();
            x.moveTo(b.x - vx * 1.4, b.y - dy - vy * 1.4);
            x.lineTo(b.x, b.y - dy);
            x.stroke();
          }
        }
        const r = b.r * sc;
        const bg = x.createRadialGradient(b.x - r * 0.36, b.y - dy - r * 0.42, r * 0.12, b.x, b.y - dy, r);
        bg.addColorStop(0, "#ffffff");
        bg.addColorStop(0.28, "#dfe4ec");
        bg.addColorStop(0.7, "#9099a8");
        bg.addColorStop(1, "#4e5563");
        x.fillStyle = bg;
        x.beginPath(); x.arc(b.x, b.y - dy, r, 0, M.TAU); x.fill();
        // environment warm tint
        x.fillStyle = "rgba(255,180,80,0.10)";
        x.beginPath(); x.arc(b.x, b.y - dy + r * 0.3, r * 0.8, 0, M.TAU); x.fill();
        x.restore();
        this._prevBall.set(b.id, [b.x, b.y]);
      }
    }

    spawnFx(fx) {
      if (fx.type === "shake") {
        this.shakeVX += (fx.x || 0) * 16; this.shakeVY += (fx.y || 0) * 16;
      } else if (fx.type === "flash") {
        this.flashT = 0.16;
      } else if (fx.type === "spark") {
        const colMap = { gold: "#ffd873", blue: "#59a8ff", fire: "#ff6a3d", green: "#59d666" };
        for (let i = 0; i < (fx.n || 6); i++) {
          const a = Math.random() * M.TAU, sp = 90 + Math.random() * 260;
          this.particles.push({
            x: fx.x, y: fx.y, vx: Math.cos(a) * sp, vy: Math.sin(a) * sp - 60,
            life: 0.3 + Math.random() * 0.3, t: 0, r: 1.5 + Math.random() * 2,
            col: colMap[fx.c] || "#ffd873", kind: "spark"
          });
        }
      } else if (fx.type === "boom") {
        for (let i = 0; i < 26; i++) {
          const a = Math.random() * M.TAU, sp = 60 + Math.random() * 420;
          this.particles.push({
            x: fx.x, y: fx.y, vx: Math.cos(a) * sp, vy: Math.sin(a) * sp - 140,
            life: 0.5 + Math.random() * 0.7, t: 0, r: 2 + Math.random() * 4,
            col: i % 3 === 0 ? "#8e94a4" : (i % 3 === 1 ? "#ff9a3d" : "#5b6170"), kind: "rubble"
          });
        }
        this.particles.push({ x: fx.x, y: fx.y, t: 0, life: 0.45, kind: "ring" });
      } else if (fx.type === "confetti") {
        for (let i = 0; i < 36; i++) {
          this.particles.push({
            x: fx.x + (Math.random() - 0.5) * 120, y: fx.y - Math.random() * 60,
            vx: (Math.random() - 0.5) * 160, vy: -80 - Math.random() * 180,
            life: 1.2 + Math.random(), t: 0, r: 2 + Math.random() * 2.5,
            col: ["#ffd24d", "#ff6a3d", "#59d666", "#59a8ff", "#b070ff"][i % 5], kind: "conf",
            w: Math.random() * 8
          });
        }
      }
    }

    drawParticles(x, dt) {
      const P = this.particles;
      x.save();
      for (let i = P.length - 1; i >= 0; i--) {
        const p = P[i];
        p.t += dt;
        if (p.t > p.life) { P.splice(i, 1); continue; }
        const u = 1 - p.t / p.life;
        if (p.kind === "ring") {
          x.strokeStyle = `rgba(255,210,120,${u})`;
          x.lineWidth = 4 * u;
          x.beginPath(); x.arc(p.x, p.y, 20 + (1 - u) * 130, 0, M.TAU); x.stroke();
          continue;
        }
        p.vy += (p.kind === "conf" ? 320 : 620) * dt;
        p.x += p.vx * dt; p.y += p.vy * dt;
        x.globalAlpha = u;
        x.fillStyle = p.col;
        if (p.kind === "conf") {
          x.save();
          x.translate(p.x, p.y); x.rotate(p.t * (4 + p.w));
          x.fillRect(-p.r, -p.r / 2, p.r * 2, p.r);
          x.restore();
        } else if (p.kind === "spark") {
          x.globalCompositeOperation = "lighter";
          x.beginPath(); x.arc(p.x, p.y, p.r * u + 0.5, 0, M.TAU); x.fill();
          x.globalCompositeOperation = "source-over";
        } else {
          x.fillRect(p.x - p.r / 2, p.y - p.r / 2, p.r, p.r);
        }
        x.globalAlpha = 1;
      }
      x.restore();
    }

    toast(msg) { this.toastMsg = msg; this.toastT = 1.6; }

    drawOverlays(x) {
      const gm = this.game;
      if (this.toastT > 0 && this.toastMsg) {
        x.save();
        x.globalAlpha = Math.min(1, this.toastT * 2);
        x.fillStyle = "rgba(10,8,16,0.85)";
        x.fillRect(VW / 2 - 90, BB + 340, 180, 40);
        x.strokeStyle = COL.gold; x.strokeRect(VW / 2 - 90, BB + 340, 180, 40);
        x.fillStyle = "#f4e9c8"; x.font = "600 16px Georgia"; x.textAlign = "center";
        x.fillText(this.toastMsg, VW / 2, BB + 366);
        x.restore();
      }
      if (gm.paused) {
        x.save();
        x.fillStyle = "rgba(6,4,10,0.72)";
        x.fillRect(0, BB, VW, C.PF_H);
        x.fillStyle = COL.gold; x.font = "700 34px Georgia"; x.textAlign = "center";
        x.fillText("PAUSED", VW / 2, BB + 420);
        x.font = "600 15px Georgia"; x.fillStyle = "#f4e9c8";
        x.fillText("PRESS  P  TO  RESUME", VW / 2, BB + 456);
        x.restore();
      }
      if (this.helpOn) {
        x.save();
        x.fillStyle = "rgba(8,6,14,0.88)";
        x.fillRect(60, BB + 220, VW - 120, 420);
        x.strokeStyle = COL.gold; x.lineWidth = 2;
        x.strokeRect(60, BB + 220, VW - 120, 420);
        x.fillStyle = COL.gold; x.font = "700 22px Georgia"; x.textAlign = "center";
        x.fillText("HOW TO PLAY", VW / 2, BB + 258);
        x.font = "600 13px Georgia"; x.fillStyle = "#f4e9c8"; x.textAlign = "left";
        const lines = [
          "1 / S ............ start game (add player on ball 1)",
          "SHIFT keys ....... flippers (Z and / too)",
          "ENTER / SPACE .... pull plunger, release to launch",
          "ARROWS ........... nudge  (3 warnings = TILT)",
          "M ................ mute      P ... pause",
          "",
          "Bash the castle gate, lower the bridge, open the",
          "gate, and lock balls - 3 castles = MULTIBALL.",
          "Start quests at the WIZARD'S DEN scoop. Complete",
          "all 5 quests + 3 castles + multiball to face the",
          "BATTLE FOR THE KINGDOM.",
          "",
          "Hold LEFT flipper at launch: super skill shot."
        ];
        lines.forEach((l, i) => x.fillText(l, 84, BB + 292 + i * 24));
        x.restore();
      }
    }
  }

  DK.Render = Render;
})(typeof window !== "undefined" ? window : globalThis);
