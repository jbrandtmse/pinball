// NOVA STRIKE — playfield renderer.
// Static art is prerendered once to an offscreen canvas (starfield, nebula,
// rails, inserts, ramps). Dynamic stuff (balls, flippers, lamps, drop
// targets, flash effects) draws on top each frame.

import { flipperTip } from './physics.js';
import { PF_W, PF_H } from './table.js';

// deterministic starfield
function rng(seed) {
  let s = seed >>> 0;
  return () => ((s = (s * 1664525 + 1013904223) >>> 0) / 0xffffffff);
}

export class Renderer {
  constructor(canvas, world, table) {
    this.cv = canvas;
    this.ctx = canvas.getContext('2d');
    this.world = world;
    this.table = table;
    this.flash = {};          // collider/switch id -> seconds remaining
    this.static = this.buildStatic();
  }

  fx(events) {
    for (const e of events) {
      if (e.type === 'switch') this.flash[e.id] = 0.22;
      if (e.type === 'rampEnter') this.flash['ramp_' + e.tag] = 0.5;
    }
  }

  tick(dt) {
    for (const k of Object.keys(this.flash)) {
      this.flash[k] -= dt;
      if (this.flash[k] <= 0) delete this.flash[k];
    }
  }

  // ------------------------------------------------------------ static art
  buildStatic() {
    const c = document.createElement('canvas');
    c.width = PF_W; c.height = PF_H;
    const g = c.getContext('2d');
    const R = rng(1337);
    const T = this.table;

    // deep space base
    const bg = g.createLinearGradient(0, 0, 0, PF_H);
    bg.addColorStop(0, '#0b1030');
    bg.addColorStop(0.45, '#101a3e');
    bg.addColorStop(0.8, '#0a0f26');
    bg.addColorStop(1, '#070a18');
    g.fillStyle = bg;
    g.fillRect(0, 0, PF_W, PF_H);

    // nebula clouds
    for (const n of [
      { x: 220, y: 420, r: 260, c: 'rgba(90,60,200,0.16)' },
      { x: 520, y: 300, r: 200, c: 'rgba(200,60,140,0.12)' },
      { x: 360, y: 900, r: 300, c: 'rgba(40,90,200,0.10)' },
      { x: 150, y: 1150, r: 180, c: 'rgba(200,120,40,0.07)' }
    ]) {
      const rad = g.createRadialGradient(n.x, n.y, 0, n.x, n.y, n.r);
      rad.addColorStop(0, n.c);
      rad.addColorStop(1, 'rgba(0,0,0,0)');
      g.fillStyle = rad;
      g.fillRect(n.x - n.r, n.y - n.r, n.r * 2, n.r * 2);
    }

    // stars
    for (let i = 0; i < 260; i++) {
      const x = R() * PF_W, y = R() * PF_H, r = R();
      g.fillStyle = `rgba(255,255,255,${0.12 + r * 0.5})`;
      g.fillRect(x, y, r > 0.9 ? 2 : 1, r > 0.9 ? 2 : 1);
    }

    // planet with rings, upper right
    g.save();
    g.translate(560, 230);
    const pg = g.createRadialGradient(-12, -14, 6, 0, 0, 58);
    pg.addColorStop(0, '#ffd9a0');
    pg.addColorStop(0.5, '#e07840');
    pg.addColorStop(1, '#7a2f1d');
    g.fillStyle = pg;
    g.beginPath(); g.arc(0, 0, 52, 0, 7); g.fill();
    g.strokeStyle = 'rgba(255,220,170,0.55)';
    g.lineWidth = 7;
    g.save(); g.rotate(-0.35);
    g.beginPath(); g.ellipse(0, 0, 88, 22, 0, 0, 7); g.stroke();
    g.restore();
    g.restore();

    // exploding nova star, center-left of the arch
    g.save();
    g.translate(165, 330);
    const ng = g.createRadialGradient(0, 0, 0, 0, 0, 70);
    ng.addColorStop(0, 'rgba(255,255,240,0.95)');
    ng.addColorStop(0.25, 'rgba(255,210,120,0.5)');
    ng.addColorStop(1, 'rgba(255,150,60,0)');
    g.fillStyle = ng;
    g.beginPath(); g.arc(0, 0, 70, 0, 7); g.fill();
    g.strokeStyle = 'rgba(255,230,180,0.7)';
    for (const [x1, y1, x2, y2] of [[-58, 0, 58, 0], [0, -58, 0, 58], [-34, -34, 34, 34], [-34, 34, 34, -34]]) {
      g.lineWidth = 2.5;
      g.beginPath(); g.moveTo(x1, y1); g.lineTo(x2, y2); g.stroke();
    }
    g.restore();

    // ------------------------------------------------------- wall rendering
    for (const col of this.world.colliders) {
      if (col.id && col.id.startsWith('ramp')) continue; // funnels get metal
      this.drawWall(g, col);
    }
    // ramp funnel guides in metal
    for (const col of this.world.colliders) {
      if (col.id && /^ramp[LR]f/.test(col.id)) this.drawRail(g, col, '#8a93b8');
    }

    // ------------------------------------------------------- inserts / text
    g.textAlign = 'center';
    g.textBaseline = 'middle';

    // top lane inserts
    const laneIds = ['topLane1', 'topLane2', 'topLane3'];
    Object.values(T.lanes).forEach((p, i) => {
      this.insert(g, p.x, p.y, 15, '#ffd24a');
      g.fillStyle = '#1b2340';
      g.font = 'bold 11px Arial';
      g.fillText('N O V A'[i * 2] || '', p.x, p.y - 26);
    });

    // orbit labels
    g.fillStyle = '#5f7bc9';
    g.font = 'bold 13px Arial';
    g.save(); g.translate(36, 590); g.rotate(-Math.PI / 2);
    g.fillText('ORBIT', 0, 0); g.restore();

    // bumper bodies
    T.bumpers.forEach((b, i) => {
      const cx = b.cx, cy = b.cy;
      const bodyG = g.createRadialGradient(cx - 8, cy - 10, 4, cx, cy, 34);
      bodyG.addColorStop(0, ['#ff9d5c', '#5cd6ff', '#c95cff'][i]);
      bodyG.addColorStop(1, ['#8a3a10', '#0e4a6a', '#4a1070'][i]);
      g.fillStyle = bodyG;
      g.beginPath(); g.arc(cx, cy, 33, 0, 7); g.fill();
      g.fillStyle = 'rgba(255,255,255,0.85)';
      g.beginPath(); g.arc(cx, cy, 12, 0, 7); g.fill();
      g.fillStyle = '#222';
      g.font = 'bold 12px Arial';
      g.fillText('★', cx, cy + 1);
    });

    // slingshot triangles
    this.slingArt(g, 150, 1120, 195, 1335, 1);
    this.slingArt(g, 570, 1120, 525, 1335, -1);

    // NOVA drop targets
    T.drops.forEach((d, i) => {
      const x = (d.ax + d.bx) / 2, y = d.ay;
      g.fillStyle = '#20294d';
      g.fillRect(x - 21, y - 26, 42, 26);
    });
    g.fillStyle = '#7fd4ff';
    g.font = 'bold 15px Arial';
    g.fillText('N   O   V   A', 367, 985);

    // standup target labels + pads
    for (const [id, c] of Object.entries(T.targets)) {
      const x = (c.ax + c.bx) / 2, y = c.ay;
      g.fillStyle = id.startsWith('standL') ? '#3ec9a7' : '#c95c7a';
      g.fillRect(x - 17, y - 11, 34, 11);
      g.fillStyle = 'rgba(255,255,255,0.3)';
      g.fillRect(x - 17, y - 11, 34, 3);
    }
    g.font = 'bold 9px Arial';
    g.fillStyle = '#8fa3c8';
    g.fillText('LOCK', 155, 1037);
    g.fillText('LOCK', 165, 1122);
    g.fillText('S H I E L D', 590, 878);

    // saucer ("docking bay")
    g.save();
    g.translate(520, 1010);
    g.strokeStyle = '#4a5a8a';
    g.lineWidth = 4;
    g.beginPath(); g.arc(0, 0, 26, 0, 7); g.stroke();
    g.fillStyle = '#0a0e20';
    g.beginPath(); g.arc(0, 0, 22, 0, 7); g.fill();
    g.strokeStyle = '#7fd4ff';
    g.setLineDash([4, 4]);
    g.lineWidth = 1.5;
    g.beginPath(); g.arc(0, 0, 30, 0, 7); g.stroke();
    g.setLineDash([]);
    g.fillStyle = '#7fd4ff';
    g.font = 'bold 10px Arial';
    g.fillText('DOCK', 0, 44);
    g.restore();

    // ramps: translucent energy tubes along the scripted paths
    this.rampArt(g, T.rampDefs.left.path, '#54c8ff', 'LAUNCH');
    this.rampArt(g, T.rampDefs.right.path, '#b47aff', 'WARP');

    // inlane/outlane inserts
    const lanes = [
      { x: 39, y: 1210, label: 'KICK', id: 'outlaneL' },
      { x: 106, y: 1210, label: '•', id: 'inlaneL' },
      { x: 603, y: 1210, label: '•', id: 'inlaneR' },
      { x: 651, y: 1210, label: '25K', id: 'outlaneR' }
    ];
    for (const l of lanes) {
      this.insert(g, l.x, l.y, 13, '#ffd24a');
    }
    g.font = 'bold 8px Arial';
    g.fillStyle = '#8fa3c8';
    g.fillText('KICKBACK', 39, 1184);
    g.fillText('SPECIAL', 651, 1184);

    // shooter lane art
    g.save();
    g.strokeStyle = 'rgba(120,150,220,0.25)';
    g.lineWidth = 30;
    g.beginPath(); g.moveTo(687, 500); g.lineTo(687, 1450); g.stroke();
    g.restore();
    g.fillStyle = '#5f7bc9';
    g.font = 'bold 11px Arial';
    g.save(); g.translate(692, 1000); g.rotate(Math.PI / 2);
    g.fillText('S K I L L   S H O T', 0, 0);
    g.restore();

    // plunger spring
    g.strokeStyle = '#99a4c8';
    g.lineWidth = 3;
    g.beginPath();
    for (let y = 1468; y < 1530; y += 6) {
      g.moveTo(672, y);
      g.lineTo(702, y + 3);
    }
    g.stroke();

    // apron title
    g.fillStyle = 'rgba(20,26,52,0.9)';
    g.fillRect(258, 1496, 204, 60);
    g.fillStyle = '#ffb347';
    g.font = 'bold 22px Arial';
    g.fillText('NOVA STRIKE', 360, 1522);
    g.fillStyle = '#8fa3c8';
    g.font = '10px Arial';
    g.fillText('DEEP SPACE DEFENSE SYSTEM', 360, 1544);

    return c;
  }

  drawWall(g, col) {
    if (col.kind === 'seg') this.drawRail(g, col, '#3a4670');
    else if (col.kind === 'arc') {
      g.strokeStyle = '#3a4670';
      g.lineWidth = 5;
      g.beginPath();
      g.arc(col.cx, col.cy, col.r, col.a0, col.a1);
      g.stroke();
      g.strokeStyle = 'rgba(160,180,230,0.35)';
      g.lineWidth = 1.5;
      g.beginPath();
      g.arc(col.cx, col.cy, col.r + (col.inner ? -3 : 3), col.a0, col.a1);
      g.stroke();
    } else if (col.kind === 'circle' && col.id && col.id.startsWith('lanePost') || col.kind === 'circle' && col.id && col.id.startsWith('outPost')) {
      g.fillStyle = '#d8deef';
      g.beginPath(); g.arc(col.cx, col.cy, col.r, 0, 7); g.fill();
      g.fillStyle = '#8a93b8';
      g.beginPath(); g.arc(col.cx, col.cy, col.r * 0.45, 0, 7); g.fill();
    }
  }

  drawRail(g, s, color) {
    g.strokeStyle = color;
    g.lineWidth = 5;
    g.lineCap = 'round';
    g.beginPath(); g.moveTo(s.ax, s.ay); g.lineTo(s.bx, s.by); g.stroke();
    g.strokeStyle = 'rgba(170,190,240,0.35)';
    g.lineWidth = 1.5;
    g.beginPath(); g.moveTo(s.ax, s.ay - 2); g.lineTo(s.bx, s.by - 2); g.stroke();
  }

  slingArt(g, x1, y1, x2, y2, side) {
    const mx = (x1 + x2) / 2, my = (y1 + y2) / 2;
    const back = 34 * side;
    g.fillStyle = '#1c2547';
    g.strokeStyle = '#ff5c8a';
    g.lineWidth = 3;
    g.beginPath();
    g.moveTo(x1, y1);
    g.lineTo(x2, y2);
    g.lineTo(x2 + back, y2 - 10);
    g.lineTo(x1 + back, y1 + 6);
    g.closePath();
    g.fill();
    g.stroke();
    g.fillStyle = '#ff5c8a';
    g.font = 'bold 10px Arial';
    g.textAlign = 'center';
    g.fillText('500', mx + back * 0.6, my);
  }

  insert(g, x, y, r, color) {
    g.save();
    g.strokeStyle = color;
    g.globalAlpha = 0.8;
    g.lineWidth = 2;
    g.beginPath(); g.arc(x, y, r, 0, 7); g.stroke();
    g.restore();
  }

  rampArt(g, path, color, label) {
    g.save();
    g.strokeStyle = color;
    g.globalAlpha = 0.16;
    g.lineWidth = 34;
    g.lineJoin = 'round';
    g.lineCap = 'round';
    g.beginPath();
    g.moveTo(path[0].x, path[0].y);
    for (let i = 1; i < path.length; i++) g.lineTo(path[i].x, path[i].y);
    g.stroke();
    g.globalAlpha = 0.5;
    g.lineWidth = 2;
    g.setLineDash([8, 10]);
    g.stroke();
    g.setLineDash([]);
    g.globalAlpha = 0.9;
    g.fillStyle = color;
    g.font = 'bold 12px Arial';
    g.textAlign = 'center';
    const p0 = path[0];
    g.fillText(label, p0.x, p0.y + 40);
    g.restore();
  }

  // ------------------------------------------------------------- dynamics
  draw(game, dt) {
    const g = this.ctx;
    this.tick(dt);
    g.clearRect(0, 0, PF_W, PF_H);
    g.drawImage(this.static, 0, 0);

    this.drawLamps(g, game);
    this.drawDrops(g);
    this.drawBumpers(g);
    this.drawFlippers(g);
    this.drawPlunger(g, game);
    this.drawBalls(g);
  }

  drawLamps(g, game) {
    const T = this.table;
    const glow = (x, y, r, color, on) => {
      if (!on) return;
      const rad = g.createRadialGradient(x, y, 0, x, y, r * 2.2);
      rad.addColorStop(0, color);
      rad.addColorStop(1, 'rgba(0,0,0,0)');
      g.fillStyle = rad;
      g.beginPath(); g.arc(x, y, r * 2.2, 0, 7); g.fill();
    };
    // top lanes
    const lanePts = [T.lanes.L1, T.lanes.L2, T.lanes.L3];
    lanePts.forEach((p, i) => {
      if (game.lanesLit?.[i]) glow(p.x, p.y, 14, 'rgba(255,220,90,0.9)', true);
      if (game.lanesDone?.[i]) glow(p.x, p.y, 10, 'rgba(120,255,140,0.7)', true);
    });
    // kickback
    if (game.kickbackLit) glow(39, 1210, 14, 'rgba(255,120,80,0.9)', true);
    // lock
    if (game.lockLit) glow(520, 1010, 26, 'rgba(90,200,255,0.8)', true);
    // extra ball
    if (game.extraBallLit) glow(520, 1010, 34, 'rgba(255,255,120,0.9)', true);
    // wizard ready
    if (game.wizardReady) glow(520, 1010, 40, 'rgba(200,120,255,0.95)', true);
    // ball save
    if (game.ballSave > 0 && game.inPlay) glow(360, 1468, 16, 'rgba(255,180,60,0.8)', true);
    // switch flashes
    for (const [id, t] of Object.entries(this.flash)) {
      const k = t / 0.22;
      if (id.startsWith('topLane')) {
        const p = lanePts[+id.slice(-1) - 1];
        glow(p.x, p.y, 18 * k + 8, `rgba(255,255,255,${0.5 * k})`, true);
      }
      const laneMap = { outlaneL: [39, 1210], inlaneL: [106, 1210], inlaneR: [603, 1210], outlaneR: [651, 1210], kickback: [39, 1285] };
      if (laneMap[id]) glow(laneMap[id][0], laneMap[id][1], 16, `rgba(255,255,255,${0.5 * k})`, true);
      if (id.startsWith('sling')) {
        const s = id === 'slingL' ? [172, 1225] : [548, 1225];
        glow(s[0], s[1], 30, `rgba(255,92,138,${0.6 * k})`, true);
      }
    }
  }

  drawDrops(g) {
    this.table.drops.forEach((d, i) => {
      if (d.disabled) return;
      const x = (d.ax + d.bx) / 2, y = d.ay;
      g.fillStyle = this.flash['drop' + i] ? '#ffe9b0' : '#e8b04a';
      g.fillRect(x - 17, y - 13, 34, 13);
      g.fillStyle = '#7a4a10';
      g.font = 'bold 9px Arial';
      g.textAlign = 'center';
      g.fillText('NOVA'[i], x, y - 6);
    });
  }

  drawBumpers(g) {
    this.table.bumpers.forEach((b, i) => {
      const f = this.flash['pop' + i];
      if (!f) return;
      const k = f / 0.22;
      const rad = g.createRadialGradient(b.cx, b.cy, 0, b.cx, b.cy, 60);
      rad.addColorStop(0, `rgba(255,255,220,${0.75 * k})`);
      rad.addColorStop(1, 'rgba(255,255,255,0)');
      g.fillStyle = rad;
      g.beginPath(); g.arc(b.cx, b.cy, 60, 0, 7); g.fill();
    });
  }

  drawFlippers(g) {
    for (const f of this.world.flippers) {
      const tip = flipperTip(f);
      // shadow
      g.strokeStyle = 'rgba(0,0,0,0.45)';
      g.lineCap = 'round';
      g.lineWidth = f.r0 * 2 + 3;
      g.beginPath(); g.moveTo(f.px + 3, f.py + 4); g.lineTo(tip.x + 3, tip.y + 4); g.stroke();
      // body: tapered bat via two strokes
      g.strokeStyle = '#ffd24a';
      g.lineWidth = f.r0 * 2;
      g.beginPath();
      g.moveTo(f.px, f.py);
      g.lineTo(f.px + (tip.x - f.px) * 0.5, f.py + (tip.y - f.py) * 0.5);
      g.stroke();
      g.strokeStyle = '#f0b428';
      g.lineWidth = f.r1 * 2.4;
      g.beginPath();
      g.moveTo(f.px + (tip.x - f.px) * 0.5, f.py + (tip.y - f.py) * 0.5);
      g.lineTo(tip.x, tip.y);
      g.stroke();
      // pivot
      g.fillStyle = '#e8ecf8';
      g.beginPath(); g.arc(f.px, f.py, 6, 0, 7); g.fill();
    }
  }

  drawPlunger(g, game) {
    // red plunger tip compresses as the player charges
    const charge = game.plungerCharge || 0;
    const y = 1468 + charge * 40;
    g.fillStyle = '#d83a4a';
    g.fillRect(672, y, 30, 62 - charge * 40);
  }

  drawBalls(g) {
    for (const b of this.world.balls) {
      if (!b.alive || b.locked) continue;
      const sp = Math.hypot(b.vx, b.vy);
      if (sp > 500 && !b.onRamp) {
        g.strokeStyle = 'rgba(220,230,255,0.18)';
        g.lineWidth = b.r * 1.4;
        g.lineCap = 'round';
        g.beginPath();
        g.moveTo(b.x - b.vx * 0.012, b.y - b.vy * 0.012);
        g.lineTo(b.x, b.y);
        g.stroke();
      }
      const grad = g.createRadialGradient(b.x - 5, b.y - 6, 2, b.x, b.y, b.r + 2);
      grad.addColorStop(0, '#ffffff');
      grad.addColorStop(0.35, '#cfd8ea');
      grad.addColorStop(0.8, '#77809a');
      grad.addColorStop(1, '#3a4055');
      g.fillStyle = grad;
      g.beginPath(); g.arc(b.x, b.y, b.r, 0, 7); g.fill();
      g.fillStyle = 'rgba(255,255,255,0.9)';
      g.beginPath(); g.arc(b.x - 4.5, b.y - 5.5, 2.6, 0, 7); g.fill();
    }
  }
}
