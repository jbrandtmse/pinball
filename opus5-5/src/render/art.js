// Procedural playfield artwork (Canvas 2D). Art-deco noir: a gilded city at
// midnight. Painted once at load into a large texture.
import T from '../table/layout.js';

export const ART_PPI = 96; // pixels per inch

export const INSERT_COLORS = {
  red: [1.0, 0.16, 0.12], amber: [1.0, 0.62, 0.1], gold: [1.0, 0.8, 0.28], green: [0.2, 1.0, 0.35],
  blue: [0.25, 0.55, 1.0], white: [1.0, 0.97, 0.9], orange: [1.0, 0.42, 0.06], purple: [0.75, 0.3, 1.0],
};
const css = (c, a = 1, k = 1) => `rgba(${Math.round(c[0] * 255 * k)},${Math.round(c[1] * 255 * k)},${Math.round(c[2] * 255 * k)},${a})`;

const GOLD = '#d9b25a', GOLD_D = '#8a6a2a', INK = '#07060d';

export function paintPlayfield() {
  const S = ART_PPI;
  const W = Math.round(T.W * S), H = Math.round(T.L * S);
  const cv = makeCanvas(W, H);
  const g = cv.getContext('2d');
  g.scale(S, S);
  const lw = 1 / S;

  // --- base: midnight gradient
  const bg = g.createLinearGradient(0, 0, 0, T.L);
  bg.addColorStop(0, '#0b0f2a');
  bg.addColorStop(0.35, '#121a3d');
  bg.addColorStop(0.62, '#0d1230');
  bg.addColorStop(1, '#07081a');
  g.fillStyle = bg; g.fillRect(0, 0, T.W, T.L);

  // subtle noise / film grain
  const rnd = mulberry(7);
  for (let i = 0; i < 9000; i++) {
    g.fillStyle = `rgba(255,255,255,${rnd() * 0.035})`;
    g.fillRect(rnd() * T.W, rnd() * T.L, 0.03, 0.03);
  }

  // --- art deco sunburst rising from the flippers
  g.save();
  const cx = T.MIRROR / 2, cy = 42.5;
  const sbFade = g.createRadialGradient(cx, cy, 2, cx, cy, 22);
  sbFade.addColorStop(0, 'rgba(255,200,110,0.16)'); sbFade.addColorStop(0.55, 'rgba(255,190,100,0.06)'); sbFade.addColorStop(1, 'rgba(255,190,100,0)');
  for (let i = 0; i < 36; i++) {
    if (i % 2) continue;
    const a0 = Math.PI + (i / 36) * Math.PI, a1 = a0 + Math.PI / 36;
    g.beginPath(); g.moveTo(cx, cy);
    g.arc(cx, cy, 22, a0, a1); g.closePath();
    g.fillStyle = sbFade; g.fill();
  }
  // concentric deco arcs
  g.strokeStyle = 'rgba(217,178,90,0.18)'; g.lineWidth = 0.04;
  for (const r of [4.5, 4.8, 9.5]) { g.beginPath(); g.arc(cx, cy, r, Math.PI * 1.08, Math.PI * 1.92); g.stroke(); }
  g.restore();

  // neon glows where the shots are
  const glow = (x, y, r, col) => {
    const gr = g.createRadialGradient(x, y, 0, x, y, r);
    gr.addColorStop(0, col); gr.addColorStop(1, 'rgba(0,0,0,0)');
    g.fillStyle = gr; g.beginPath(); g.arc(x, y, r, 0, Math.PI * 2); g.fill();
  };
  glow(3.15, 22.5, 2.6, 'rgba(60,170,255,0.20)');
  glow(10.55, 22.5, 2.6, 'rgba(255,60,140,0.18)');
  glow(7.6, 22.2, 2.2, 'rgba(255,190,70,0.18)');
  glow(14.3, 22.3, 2.4, 'rgba(60,255,140,0.13)');
  glow(14.1, 10.5, 4.5, 'rgba(255,40,60,0.12)');

  // --- skyline in the upper field
  drawSkyline(g, rnd);

  // moon + searchlights
  g.save();
  const moon = g.createRadialGradient(4.2, 4.6, 0.1, 4.2, 4.6, 2.6);
  moon.addColorStop(0, 'rgba(255,240,200,0.55)'); moon.addColorStop(0.35, 'rgba(255,230,170,0.25)'); moon.addColorStop(1, 'rgba(255,230,170,0)');
  g.fillStyle = moon; g.beginPath(); g.arc(4.2, 4.6, 2.6, 0, Math.PI * 2); g.fill();
  g.fillStyle = 'rgba(250,236,200,0.8)'; g.beginPath(); g.arc(4.2, 4.6, 0.75, 0, Math.PI * 2); g.fill();
  g.fillStyle = '#0e1433'; g.beginPath(); g.arc(4.55, 4.35, 0.68, 0, Math.PI * 2); g.fill();
  for (const [x, a] of [[6.5, -0.35], [9.8, 0.25], [14.5, -0.15]]) {
    const gr = g.createLinearGradient(x, 16, x + Math.sin(a) * 14, 16 - 14);
    gr.addColorStop(0, 'rgba(180,200,255,0.16)'); gr.addColorStop(1, 'rgba(180,200,255,0)');
    g.fillStyle = gr; g.beginPath();
    g.moveTo(x - 0.15, 16); g.lineTo(x + Math.sin(a) * 14 - 1.4, 2); g.lineTo(x + Math.sin(a) * 14 + 1.4, 2); g.lineTo(x + 0.15, 16); g.fill();
  }
  g.restore();
  // stars
  for (let i = 0; i < 160; i++) {
    const x = rnd() * T.W, y = rnd() * 10;
    const d = Math.hypot(x - 10.125, y - 10.125);
    if (d > 10) continue;
    g.fillStyle = `rgba(255,250,230,${0.25 + rnd() * 0.6})`;
    g.fillRect(x, y, 0.035 + rnd() * 0.03, 0.035 + rnd() * 0.03);
  }

  // --- vault lane: brushed steel floor with laser grid
  g.save();
  const vl = g.createLinearGradient(6.3, 0, 8.9, 0);
  vl.addColorStop(0, '#1b1b24'); vl.addColorStop(0.5, '#3a3a48'); vl.addColorStop(1, '#1b1b24');
  g.fillStyle = vl; g.fillRect(6.3, 12.0, 2.6, 9.2);
  for (let y = 12.2; y < 21; y += 0.12) { g.strokeStyle = `rgba(255,255,255,${0.02 + rnd() * 0.03})`; g.lineWidth = lw; g.beginPath(); g.moveTo(6.3, y); g.lineTo(8.9, y); g.stroke(); }
  g.strokeStyle = 'rgba(255,40,40,0.55)'; g.lineWidth = 0.035;
  for (let i = 0; i < 6; i++) { g.beginPath(); g.moveTo(6.3, 15.4 + i * 0.95); g.lineTo(8.9, 16.3 + i * 0.95 - 0.9); g.stroke(); }
  g.fillStyle = 'rgba(255,215,120,0.25)'; g.fillRect(6.3, 12.0, 2.6, 2.6);
  g.restore();

  // --- orbit lanes and ramp entrances: gold deco edging
  g.strokeStyle = GOLD_D; g.lineWidth = 0.05;
  strokePoly(g, T.mass.pts, true, GOLD_D, 0.08);
  strokePoly(g, T.hideoutBlock.pts, true, GOLD_D, 0.08);

  // --- lower playfield: stepped deco borders around in/outlanes
  for (const dv of T.dividers) strokePoly(g, dv.pts, true, GOLD, 0.06);
  for (const s of T.slings) {
    g.fillStyle = 'rgba(160,20,40,0.35)';
    g.beginPath(); g.moveTo(...s.A); for (const p of s.lower) g.lineTo(...p); g.lineTo(...s.D); g.closePath(); g.fill();
  }
  // lane floors: darker channels with a gold stripe down the middle
  g.save();
  for (const [x0, x1] of [[0, 1.55], [2.05, 3.5], [T.MIRROR - 3.5, T.MIRROR - 2.05], [T.MIRROR - 1.55, T.MIRROR]]) {
    const lg = g.createLinearGradient(x0, 0, x1, 0);
    lg.addColorStop(0, 'rgba(0,0,0,0.35)'); lg.addColorStop(0.5, 'rgba(40,40,90,0.25)'); lg.addColorStop(1, 'rgba(0,0,0,0.35)');
    g.fillStyle = lg; g.fillRect(x0, 29.6, x1 - x0, 5.5);
  }
  g.restore();
  // deco lattice in the lower corners
  g.save();
  g.strokeStyle = 'rgba(217,178,90,0.12)'; g.lineWidth = 0.025;
  for (const [x0, x1] of [[0.05, 1.5], [T.MIRROR - 1.5, T.MIRROR - 0.05]]) {
    for (let y = 36; y < 41.6; y += 0.5) { g.beginPath(); g.moveTo(x0, y); g.lineTo(x1, y + 0.5); g.moveTo(x1, y); g.lineTo(x0, y + 0.5); g.stroke(); }
  }
  g.restore();
  // noir crew silhouettes flanking the job medallion
  crew(g, 4.05, 29.9, 1.0, false);
  crew(g, T.MIRROR - 4.05, 29.9, 1.0, true);

  // inlane / outlane arrows
  for (const x of [0.775, 2.775, T.MIRROR - 2.775, T.MIRROR - 0.775]) chevrons(g, x, 34.5, 3, GOLD, 0.5);

  // --- the job ring: a deco medallion
  const jr = T.jobRing;
  g.save();
  const med = g.createRadialGradient(jr.x, jr.y, 0.2, jr.x, jr.y, jr.r + 1.2);
  med.addColorStop(0, '#2a1f08'); med.addColorStop(0.7, '#141026'); med.addColorStop(1, 'rgba(10,10,30,0)');
  g.fillStyle = med; g.beginPath(); g.arc(jr.x, jr.y, jr.r + 1.2, 0, Math.PI * 2); g.fill();
  g.strokeStyle = GOLD; g.lineWidth = 0.05;
  g.beginPath(); g.arc(jr.x, jr.y, jr.r + 0.72, 0, Math.PI * 2); g.stroke();
  g.lineWidth = 0.025; g.beginPath(); g.arc(jr.x, jr.y, jr.r + 0.85, 0, Math.PI * 2); g.stroke();
  for (let i = 0; i < 24; i++) {
    const a = i / 24 * Math.PI * 2;
    g.beginPath(); g.moveTo(jr.x + Math.cos(a) * (jr.r + 0.72), jr.y + Math.sin(a) * (jr.r + 0.72));
    g.lineTo(jr.x + Math.cos(a) * (jr.r + 1.05), jr.y + Math.sin(a) * (jr.r + 1.05)); g.stroke();
  }
  g.restore();

  // --- insert wells (the unlit plastic inserts) + labels
  for (const ins of T.inserts) drawInsertWell(g, ins);
  labels(g);

  // --- logo on the lower playfield
  logo(g, T.MIRROR / 2, 36.3, 0.95);

  // shooter lane
  g.save();
  g.fillStyle = '#0a0a14'; g.fillRect(18.8, 11.3, 1.45, 33.7);
  g.translate(19.52, 33); g.rotate(-Math.PI / 2);
  deco(g, 'SKILL SHOT', 0, 0, 0.5, GOLD);
  g.restore();

  // outer vignette
  const vg = g.createRadialGradient(T.W / 2, T.L * 0.55, 8, T.W / 2, T.L * 0.55, 28);
  vg.addColorStop(0, 'rgba(0,0,0,0)'); vg.addColorStop(1, 'rgba(0,0,0,0.45)');
  g.fillStyle = vg; g.fillRect(0, 0, T.W, T.L);

  return cv;
}

function drawSkyline(g, rnd) {
  g.save();
  // clip to inside the arch region
  g.beginPath(); g.arc(10.125, 10.125, 10.1, Math.PI, 0); g.lineTo(20.25, 21); g.lineTo(0, 21); g.closePath(); g.clip();
  const base = 20.5;
  let x = -0.3;
  const layers = [
    { col: '#161c44', win: 'rgba(255,210,120,', h: [4, 9], w: [0.9, 1.9], alpha: 0.35 },
    { col: '#0c1030', win: 'rgba(255,220,140,', h: [2.5, 7], w: [0.8, 1.6], alpha: 0.6 },
  ];
  for (const L of layers) {
    x = -0.3;
    while (x < 20.5) {
      const w = L.w[0] + rnd() * (L.w[1] - L.w[0]);
      const h = L.h[0] + rnd() * (L.h[1] - L.h[0]);
      const top = base - h;
      g.fillStyle = L.col;
      // stepped deco tops
      g.beginPath();
      g.moveTo(x, base); g.lineTo(x, top + 0.6); g.lineTo(x + w * 0.2, top + 0.6); g.lineTo(x + w * 0.2, top + 0.25);
      g.lineTo(x + w * 0.4, top + 0.25); g.lineTo(x + w * 0.5, top - (rnd() < 0.4 ? 0.9 : 0)); g.lineTo(x + w * 0.6, top + 0.25);
      g.lineTo(x + w * 0.8, top + 0.25); g.lineTo(x + w * 0.8, top + 0.6); g.lineTo(x + w, top + 0.6); g.lineTo(x + w, base); g.fill();
      for (let wy = top + 0.9; wy < base - 0.2; wy += 0.32) for (let wx = x + 0.15; wx < x + w - 0.15; wx += 0.22) {
        if (rnd() < 0.34) { g.fillStyle = L.win + (L.alpha * (0.4 + rnd() * 0.6)) + ')'; g.fillRect(wx, wy, 0.1, 0.14); }
      }
      x += w + 0.08 + rnd() * 0.3;
    }
  }
  g.restore();
}

function drawInsertWell(g, ins) {
  const c = INSERT_COLORS[ins.color] || INSERT_COLORS.white;
  g.save();
  g.translate(ins.x, ins.y);
  g.rotate((ins.rot || 0) * Math.PI / 180);
  const s = ins.size;
  // gold bezel
  g.fillStyle = 'rgba(0,0,0,0.6)';
  insertPath(g, ins.shape, s * 1.18, ins.w ? ins.w * 1.08 : null); g.fill();
  g.strokeStyle = GOLD_D; g.lineWidth = 0.04;
  insertPath(g, ins.shape, s * 1.1, ins.w ? ins.w * 1.05 : null); g.stroke();
  // unlit plastic: dark tinted with a highlight
  const gr = g.createRadialGradient(-s * 0.2, -s * 0.2, 0, 0, 0, s);
  gr.addColorStop(0, css(c, 1, 0.42)); gr.addColorStop(1, css(c, 1, 0.16));
  g.fillStyle = gr;
  insertPath(g, ins.shape, s, ins.w); g.fill();
  g.restore();
  if (ins.label) {
    g.save();
    const inside = ins.shape === 'circle' && ins.label.length <= 2;
    g.fillStyle = inside ? 'rgba(20,10,0,0.85)' : GOLD;
    g.font = `bold ${inside ? s * 0.62 : 0.34}px Georgia, serif`;
    g.textAlign = 'center'; g.textBaseline = 'middle';
    if (inside) g.fillText(ins.label, ins.x, ins.y + 0.02);
    else {
      // job names sit outside the ring
      const jr = T.jobRing;
      const a = Math.atan2(ins.y - jr.y, ins.x - jr.x);
      const lx = jr.x + Math.cos(a) * (jr.r + 1.18), ly = jr.y + Math.sin(a) * (jr.r + 1.18);
      g.fillText(ins.label, lx, ly);
    }
    g.restore();
  }
}

export function insertPath(g, shape, s, w) {
  g.beginPath();
  switch (shape) {
    case 'circle': g.arc(0, 0, s / 2, 0, Math.PI * 2); break;
    case 'rect': {
      const hw = (w || s * 2) / 2, hh = s / 2, r = hh * 0.6;
      g.moveTo(-hw + r, -hh); g.lineTo(hw - r, -hh); g.quadraticCurveTo(hw, -hh, hw, -hh + r); g.lineTo(hw, hh - r);
      g.quadraticCurveTo(hw, hh, hw - r, hh); g.lineTo(-hw + r, hh); g.quadraticCurveTo(-hw, hh, -hw, hh - r); g.lineTo(-hw, -hh + r);
      g.quadraticCurveTo(-hw, -hh, -hw + r, -hh); break;
    }
    case 'arrow': {
      const h = s, hw = s * 0.42;
      g.moveTo(0, -h * 0.62); g.lineTo(hw, -h * 0.08); g.lineTo(hw * 0.45, -h * 0.08); g.lineTo(hw * 0.45, h * 0.5);
      g.lineTo(-hw * 0.45, h * 0.5); g.lineTo(-hw * 0.45, -h * 0.08); g.lineTo(-hw, -h * 0.08); g.closePath(); break;
    }
    case 'tri': g.moveTo(0, -s * 0.55); g.lineTo(s * 0.5, s * 0.35); g.lineTo(-s * 0.5, s * 0.35); g.closePath(); break;
    case 'star': {
      for (let i = 0; i < 10; i++) {
        const r = i % 2 ? s * 0.24 : s * 0.55, a = -Math.PI / 2 + i * Math.PI / 5;
        if (i === 0) g.moveTo(Math.cos(a) * r, Math.sin(a) * r); else g.lineTo(Math.cos(a) * r, Math.sin(a) * r);
      }
      g.closePath(); break;
    }
  }
}

function labels(g) {
  const L = (txt, x, y, size = 0.3, col = GOLD, rot = 0) => {
    g.save(); g.translate(x, y); g.rotate(rot * Math.PI / 180);
    g.font = `bold ${size}px Georgia, serif`; g.textAlign = 'center'; g.textBaseline = 'middle';
    g.fillStyle = 'rgba(0,0,0,0.6)'; g.fillText(txt, 0.02, 0.02);
    g.fillStyle = col; g.fillText(txt, 0, 0); g.restore();
  };
  const ins = Object.fromEntries(T.inserts.map(i => [i.id, i]));
  L('LOOP', ins.arrLO.x + 0.5, ins.arrLO.y + 0.95, 0.28, GOLD, ins.arrLO.rot);
  L('SKYWAY', ins.arrLR.x + 0.2, ins.arrLR.y + 0.95, 0.28, GOLD, ins.arrLR.rot);
  L('VAULT', ins.arrVault.x, ins.arrVault.y + 1.0, 0.32);
  L('GETAWAY', ins.arrRR.x, ins.arrRR.y + 0.95, 0.28);
  L('HIDEOUT', ins.arrHide.x - 0.2, ins.arrHide.y + 0.95, 0.28, GOLD, ins.arrHide.rot);
  L('LOOP', ins.arrRO.x - 0.5, ins.arrRO.y + 0.95, 0.28, GOLD, ins.arrRO.rot);
  L('LOCK', ins.lockLit.x, ins.lockLit.y, 0.26, '#1a1000');
  L('START JOB', ins.startJob.x, ins.startJob.y, 0.2, '#001a08', ins.startJob.rot);
  L('EXTRA', ins.extraBallLit.x, ins.extraBallLit.y - 0.07, 0.13, '#2a1000');
  L('BALL', ins.extraBallLit.x, ins.extraBallLit.y + 0.09, 0.13, '#2a1000');
  L('?', ins.mystery.x, ins.mystery.y + 0.02, 0.3, '#12002a');
  L('SHOOT AGAIN', ins.shootAgain.x, ins.shootAgain.y + 0.62, 0.22);
  L('KICKBACK', ins.lampKickback.x, ins.lampKickback.y + 0.72, 0.17);
  L('SPINNER', ins.lampSpinner.x, ins.lampSpinner.y + 0.5, 0.17);
  L('COMBO', ins.lampCombo.x, ins.lampCombo.y + 0.5, 0.17);
  L('SUPER', ins.superJP.x, ins.superJP.y + 0.62, 0.18);
  L('JACKPOT', ins.superJP.x, ins.superJP.y + 0.84, 0.18);
  L('SCOUT', 16.9, 28.1, 0.18, GOLD, -60);
  for (let i = 1; i <= 3; i++) L(`LOCK ${i}`, ins['lock' + i].x, ins['lock' + i].y, 0.22, '#1a1000');
  L('THE BIG', ins.bigScore.x, ins.bigScore.y - 0.02, 0.13, '#1a1000');
  L('SCORE', ins.bigScore.x, ins.bigScore.y + 0.14, 0.13, '#1a1000');
  L('ALARMS', 14.1, 14.35, 0.34, '#ff5a5a');
  L('K   E   Y', 14.2, 4.0, 0.3);
  L('BONUS MULTIPLIER', T.MIRROR / 2, 34.75, 0.17);
}

// A trench-coated crook in a fedora, loot bag in hand, rim-lit in gold.
function crew(g, x, y, s, flip) {
  g.save(); g.translate(x, y); g.scale(flip ? -s : s, s);
  const body = new Path2D();
  // fedora
  body.ellipse(0, -2.35, 0.62, 0.12, 0, 0, Math.PI * 2);
  body.moveTo(-0.38, -2.38); body.bezierCurveTo(-0.36, -2.85, 0.36, -2.85, 0.38, -2.38); body.closePath();
  // head & neck
  body.moveTo(0.3, -2.2); body.arc(0.02, -2.1, 0.3, 0, Math.PI * 2);
  // trench coat with raised collar
  body.moveTo(-0.45, -1.85); body.lineTo(0.5, -1.85); body.lineTo(0.72, -1.2); body.lineTo(0.62, 0.25);
  body.lineTo(0.78, 1.3); body.lineTo(-0.7, 1.3); body.lineTo(-0.55, 0.25); body.lineTo(-0.72, -1.2); body.closePath();
  // legs
  body.rect(-0.42, 1.3, 0.3, 0.55); body.rect(0.12, 1.3, 0.3, 0.55);
  // arm to the loot bag
  body.moveTo(0.55, -1.2); body.lineTo(1.05, -0.2); body.lineTo(0.9, -0.1); body.lineTo(0.5, -0.8); body.closePath();
  g.fillStyle = 'rgba(4,4,12,0.82)'; g.fill(body);
  g.strokeStyle = 'rgba(217,178,90,0.55)'; g.lineWidth = 0.035; g.stroke(body);
  // loot bag
  g.beginPath(); g.arc(1.05, 0.25, 0.42, 0, Math.PI * 2);
  g.fillStyle = 'rgba(40,30,12,0.9)'; g.fill(); g.strokeStyle = GOLD; g.stroke();
  g.save(); g.scale(flip ? -1 : 1, 1);
  g.fillStyle = GOLD; g.font = 'bold 0.5px Georgia, serif'; g.textAlign = 'center'; g.textBaseline = 'middle';
  g.fillText('$', (flip ? -1 : 1) * 1.05, 0.28);
  g.restore();
  g.restore();
}

function logo(g, x, y, s) {
  g.save(); g.translate(x, y); g.scale(s, s);
  g.textAlign = 'center'; g.textBaseline = 'middle';
  g.font = 'bold 0.62px Georgia, serif';
  g.lineWidth = 0.08; g.strokeStyle = INK; g.strokeText('MIDNIGHT', 0, -0.35);
  const gr = g.createLinearGradient(0, -0.7, 0, 0.9);
  gr.addColorStop(0, '#fff2c0'); gr.addColorStop(0.45, '#e2b650'); gr.addColorStop(1, '#8a5a18');
  g.fillStyle = gr; g.fillText('MIDNIGHT', 0, -0.35);
  g.font = 'bold 1.05px Georgia, serif';
  g.strokeText('HEIST', 0, 0.5); g.fillText('HEIST', 0, 0.5);
  g.strokeStyle = GOLD; g.lineWidth = 0.03;
  g.beginPath(); g.moveTo(-2.4, 1.15); g.lineTo(2.4, 1.15); g.moveTo(-2.1, 1.28); g.lineTo(2.1, 1.28); g.stroke();
  g.restore();
}

function deco(g, txt, x, y, size, col) {
  g.font = `bold ${size}px Georgia, serif`; g.textAlign = 'center'; g.textBaseline = 'middle';
  g.fillStyle = col; g.fillText(txt, x, y);
}

function chevrons(g, x, y, n, col, a) {
  g.save(); g.strokeStyle = col; g.globalAlpha = a; g.lineWidth = 0.05;
  for (let i = 0; i < n; i++) { g.beginPath(); g.moveTo(x - 0.3, y + i * 0.4); g.lineTo(x, y + 0.25 + i * 0.4); g.lineTo(x + 0.3, y + i * 0.4); g.stroke(); }
  g.restore();
}

function strokePoly(g, pts, closed, col, w) {
  g.save(); g.strokeStyle = col; g.lineWidth = w; g.beginPath();
  pts.forEach((p, i) => i ? g.lineTo(p[0], p[1]) : g.moveTo(p[0], p[1]));
  if (closed) g.closePath(); g.stroke(); g.restore();
}

export function makeCanvas(w, h) {
  if (typeof OffscreenCanvas !== 'undefined' && typeof document === 'undefined') return new OffscreenCanvas(w, h);
  const c = document.createElement('canvas'); c.width = w; c.height = h; return c;
}

function mulberry(a) {
  return function () {
    a |= 0; a = a + 0x6D2B79F5 | 0;
    let t = Math.imul(a ^ a >>> 15, 1 | a);
    t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t;
    return ((t ^ t >>> 14) >>> 0) / 4294967296;
  };
}

// Radial glow texture used for insert halos and flasher glows
export function glowTexture(size = 128) {
  const c = makeCanvas(size, size), g = c.getContext('2d');
  const gr = g.createRadialGradient(size / 2, size / 2, 0, size / 2, size / 2, size / 2);
  gr.addColorStop(0, 'rgba(255,255,255,1)'); gr.addColorStop(0.25, 'rgba(255,255,255,0.45)');
  gr.addColorStop(0.6, 'rgba(255,255,255,0.1)'); gr.addColorStop(1, 'rgba(255,255,255,0)');
  g.fillStyle = gr; g.fillRect(0, 0, size, size);
  return c;
}
