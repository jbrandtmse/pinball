/**
 * PlayfieldArt - High-Resolution 2048x4096 Arcade-Vibrant Williams Playfield Texture
 * Features rich sci-fi artwork, hazard stripes, reactor core, illuminated inserts, and instruction cards.
 */
export function generatePlayfieldTexture(width = 2048, height = 4096) {
  const canvas = document.createElement('canvas');
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext('2d');

  const sx = width / 520.0;
  const sy = height / 1160.0;
  const T = (x, y) => [x * sx, y * sy];

  // 1. Vibrant Base Playfield: Deep Cosmic Cobalt & Cybernetic Traces
  const bgGrad = ctx.createLinearGradient(0, 0, 0, height);
  bgGrad.addColorStop(0, '#0a1630');
  bgGrad.addColorStop(0.25, '#12254d');
  bgGrad.addColorStop(0.5, '#0e1c3b');
  bgGrad.addColorStop(0.75, '#152140');
  bgGrad.addColorStop(1, '#091122');
  ctx.fillStyle = bgGrad;
  ctx.fillRect(0, 0, width, height);

  // High-Tech Hexagonal Grid & Circuit Traces
  drawCyberGrid(ctx, width, height);

  // Outer Wood Border / Rail Trim
  ctx.strokeStyle = '#1e335a';
  ctx.lineWidth = 12 * sx;
  ctx.strokeRect(6 * sx, 6 * sy, width - 12 * sx, height - 12 * sy);

  // 2. Center Reactor Core Graphic
  const [coreX, coreY] = T(255, 520);
  const coreRad = 115 * sx;

  // Outer Hazard Chevron Ring (Alternating Black & Safety Amber)
  drawHazardRing(ctx, coreX, coreY, coreRad * 1.45, 18 * sx);

  // Glowing Cyan Magnetic Confinement Ring
  ctx.save();
  ctx.beginPath();
  ctx.arc(coreX, coreY, coreRad * 1.25, 0, Math.PI * 2);
  ctx.strokeStyle = '#00f2ff';
  ctx.lineWidth = 8 * sx;
  ctx.shadowColor = '#00f2ff';
  ctx.shadowBlur = 25;
  ctx.stroke();
  ctx.restore();

  // Core Plasma Chamber
  const corePlasma = ctx.createRadialGradient(coreX, coreY, 5, coreX, coreY, coreRad);
  corePlasma.addColorStop(0, '#ffffff');
  corePlasma.addColorStop(0.2, '#ffea00');
  corePlasma.addColorStop(0.55, '#ff4400');
  corePlasma.addColorStop(0.85, '#990022');
  corePlasma.addColorStop(1, '#2b0011');
  ctx.fillStyle = corePlasma;
  ctx.beginPath();
  ctx.arc(coreX, coreY, coreRad, 0, Math.PI * 2);
  ctx.fill();

  // Radiation Blades (Trefoil Hazard)
  ctx.save();
  ctx.translate(coreX, coreY);
  ctx.fillStyle = '#ffb700';
  ctx.strokeStyle = '#ffffff';
  ctx.lineWidth = 3 * sx;
  for (let i = 0; i < 3; i++) {
    const angle = (i * Math.PI * 2) / 3;
    ctx.beginPath();
    ctx.arc(0, 0, coreRad * 0.88, angle - 0.45, angle + 0.45);
    ctx.arc(0, 0, coreRad * 0.35, angle + 0.45, angle - 0.45, true);
    ctx.closePath();
    ctx.fill();
    ctx.stroke();
  }

  // Center Saucer Recess
  ctx.fillStyle = '#0a0202';
  ctx.beginPath();
  ctx.arc(0, 0, coreRad * 0.32, 0, Math.PI * 2);
  ctx.fill();
  ctx.strokeStyle = '#ff9900';
  ctx.lineWidth = 4 * sx;
  ctx.stroke();
  ctx.restore();

  // "SUPER JACKPOT" Arch Text above Core
  ctx.font = `900 ${Math.floor(22 * sx)}px Impact, Arial, sans-serif`;
  ctx.fillStyle = '#ff0055';
  ctx.textAlign = 'center';
  ctx.shadowColor = '#ff0055';
  ctx.shadowBlur = 12;
  ctx.fillText('★ SUPER JACKPOT ★', coreX, coreY - coreRad * 1.55);
  ctx.shadowBlur = 0;

  // 3. Top Arch & C - O - R - E Lanes
  const [archX, archY] = T(270, 180);
  ctx.fillStyle = 'rgba(0, 180, 255, 0.18)';
  ctx.beginPath();
  ctx.arc(archX, archY, 240 * sx, Math.PI, 0);
  ctx.fill();

  // Top Lane Insert Badges (C - O - R - E)
  const lanes = [
    { char: 'C', x: 187, y: 145 },
    { char: 'O', x: 227, y: 145 },
    { char: 'R', x: 272, y: 145 },
    { char: 'E', x: 315, y: 145 }
  ];

  for (const l of lanes) {
    const [lx, ly] = T(l.x, l.y);
    // Glowing insert lens
    const lensGrad = ctx.createLinearGradient(lx, ly - 28 * sy, lx, ly + 28 * sy);
    lensGrad.addColorStop(0, '#00ffff');
    lensGrad.addColorStop(1, '#0044aa');
    ctx.fillStyle = lensGrad;
    ctx.beginPath();
    ctx.roundRect(lx - 18 * sx, ly - 26 * sy, 36 * sx, 52 * sy, 8 * sx);
    ctx.fill();

    ctx.strokeStyle = '#ffffff';
    ctx.lineWidth = 3 * sx;
    ctx.stroke();

    ctx.font = `900 ${Math.floor(26 * sx)}px Arial, sans-serif`;
    ctx.fillStyle = '#ffffff';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(l.char, lx, ly);
  }

  // Skill Shot Callout Graphic
  ctx.font = `bold ${Math.floor(13 * sx)}px Arial, sans-serif`;
  ctx.fillStyle = '#ffea00';
  ctx.textAlign = 'center';
  ctx.fillText('SKILL SHOT 500,000 PTS (LANE CHANGE)', archX, 90 * sy);

  // 4. Pop Bumper "Turbines" Art
  const turbines = [
    { x: 255, y: 280, label: 'TURBINE 1' },
    { x: 185, y: 360, label: 'TURBINE 2' },
    { x: 325, y: 360, label: 'TURBINE 3' }
  ];

  for (const tb of turbines) {
    const [tx, ty] = T(tb.x, tb.y);
    // Outer radial starburst
    const tbGrad = ctx.createRadialGradient(tx, ty, 15 * sx, tx, ty, 52 * sx);
    tbGrad.addColorStop(0, 'rgba(255, 120, 0, 0.7)');
    tbGrad.addColorStop(0.6, 'rgba(255, 60, 0, 0.3)');
    tbGrad.addColorStop(1, 'transparent');
    ctx.fillStyle = tbGrad;
    ctx.beginPath();
    ctx.arc(tx, ty, 54 * sx, 0, Math.PI * 2);
    ctx.fill();

    ctx.font = `900 ${Math.floor(13 * sx)}px Arial, sans-serif`;
    ctx.fillStyle = '#ffaa33';
    ctx.fillText(tb.label, tx, ty + 50 * sy);
  }

  // 5. Ramps Art & Directional Arrows
  // Left Ramp: Particle Accelerator
  const [lRampX, lRampY] = T(130, 420);
  drawArcadeArrow(ctx, lRampX, lRampY, -0.22, 'ACCELERATOR', 'JACKPOT', '#00ffcc', sx, sy);

  // Right Ramp: Cryo-Coolant Overdrive
  const [rRampX, rRampY] = T(380, 420);
  drawArcadeArrow(ctx, rRampX, rRampY, 0.22, 'CRYO LOOP', 'JACKPOT', '#38bdf8', sx, sy);

  // 6. Coolant 3-Bank Drop Targets
  const [dbX, dbY] = T(65, 470);
  ctx.save();
  ctx.translate(dbX, dbY);
  ctx.rotate(0.38);
  ctx.fillStyle = '#00f5ff';
  ctx.font = `900 ${Math.floor(15 * sx)}px Arial, sans-serif`;
  ctx.fillText('◄ COOLANT RODS ►', 45 * sx, -18 * sy);
  ctx.fillStyle = '#ffaa00';
  ctx.font = `bold ${Math.floor(11 * sx)}px Arial, sans-serif`;
  ctx.fillText('RESET TO LIGHT LOCK', 45 * sx, -4 * sy);
  ctx.restore();

  // 7. Multipliers Ladder (Center Spine)
  const multipliers = [
    { text: '2X', y: 720, color: '#00ffaa' },
    { text: '3X', y: 680, color: '#ffea00' },
    { text: '4X', y: 640, color: '#ff8800' },
    { text: '5X', y: 600, color: '#ff3300' },
    { text: '10X', y: 560, color: '#ff0066' }
  ];

  for (const m of multipliers) {
    const [mx, my] = T(255, m.y);
    ctx.fillStyle = m.color;
    ctx.beginPath();
    ctx.roundRect(mx - 32 * sx, my - 14 * sy, 64 * sx, 28 * sy, 6 * sx);
    ctx.fill();

    ctx.strokeStyle = '#ffffff';
    ctx.lineWidth = 3 * sx;
    ctx.stroke();

    ctx.font = `900 ${Math.floor(18 * sx)}px Arial, sans-serif`;
    ctx.fillStyle = '#ffffff';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(m.text, mx, my);
  }

  // 8. Slingshots Triangular Graphics
  drawSlingshotGraphic(ctx, T(135, 875), 'LEFT', sx, sy);
  drawSlingshotGraphic(ctx, T(375, 875), 'RIGHT', sx, sy);

  // 9. Authentic Williams Apron (Bottom of Playfield)
  const [apronX, apronY] = T(24, 1010);
  const apronW = (516 - 24) * sx;
  const apronH = (1140 - 1010) * sy;

  // Rich Royal Metallic Blue Apron Plate
  const apronGrad = ctx.createLinearGradient(apronX, apronY, apronX, apronY + apronH);
  apronGrad.addColorStop(0, '#102244');
  apronGrad.addColorStop(0.5, '#0a1630');
  apronGrad.addColorStop(1, '#050b18');
  ctx.fillStyle = apronGrad;
  ctx.fillRect(apronX, apronY, apronW, apronH);

  ctx.strokeStyle = '#38bdf8';
  ctx.lineWidth = 6 * sx;
  ctx.strokeRect(apronX, apronY, apronW, apronH);

  // Left Instruction Card (Priceless Authentic Williams Styling)
  const [cardLX, cardLY] = T(48, 1025);
  const cardW = 165 * sx;
  const cardH = 95 * sy;

  ctx.fillStyle = '#f8fafc';
  ctx.fillRect(cardLX, cardLY, cardW, cardH);
  ctx.strokeStyle = '#0f172a';
  ctx.lineWidth = 3 * sx;
  ctx.strokeRect(cardLX, cardLY, cardW, cardH);

  ctx.fillStyle = '#0284c7';
  ctx.font = `900 ${Math.floor(12 * sx)}px Arial, sans-serif`;
  ctx.textAlign = 'left';
  ctx.fillText('QUANTUM CORE: MELTDOWN', cardLX + 8 * sx, cardLY + 18 * sy);

  ctx.fillStyle = '#0f172a';
  ctx.font = `bold ${Math.floor(9 * sx)}px Arial, sans-serif`;
  ctx.fillText('• Shoot C-O-R-E lanes for Bonus Multipliers', cardLX + 8 * sx, cardLY + 34 * sy);
  ctx.fillText('• Knock down 3 Coolant Rods to light Lock', cardLX + 8 * sx, cardLY + 48 * sy);
  ctx.fillText('• Lock 3 Balls for 3-BALL MULTIBALL', cardLX + 8 * sx, cardLY + 62 * sy);
  ctx.fillText('• Left/Right Ramps collect JACKPOTS (1M)', cardLX + 8 * sx, cardLY + 76 * sy);
  ctx.fillText('• Shoot Center Core for SUPER JACKPOT (5M)', cardLX + 8 * sx, cardLY + 90 * sy);

  // Right Instruction Card
  const [cardRX, cardRY] = T(302, 1025);
  ctx.fillStyle = '#f8fafc';
  ctx.fillRect(cardRX, cardRY, cardW, cardH);
  ctx.strokeStyle = '#0f172a';
  ctx.lineWidth = 3 * sx;
  ctx.strokeRect(cardRX, cardRY, cardW, cardH);

  ctx.fillStyle = '#dc2626';
  ctx.font = `900 ${Math.floor(12 * sx)}px Arial, sans-serif`;
  ctx.fillText('OPERATOR RULES & CONTROLS', cardRX + 8 * sx, cardRY + 18 * sy);

  ctx.fillStyle = '#0f172a';
  ctx.font = `bold ${Math.floor(9 * sx)}px Arial, sans-serif`;
  ctx.fillText('• SHIFT / Z, / : Left & Right Flippers', cardRX + 8 * sx, cardRY + 34 * sy);
  ctx.fillText('• Flippers cycle C-O-R-E lane lights', cardRX + 8 * sx, cardRY + 48 * sy);
  ctx.fillText('• SPACE / DOWN : Plunger Spring Launch', cardRX + 8 * sx, cardRY + 62 * sy);
  ctx.fillText('• Q, W, E : Nudge Table (Watch for Tilt!)', cardRX + 8 * sx, cardRY + 76 * sy);
  ctx.fillText('• C : Cycle 3D Camera Views', cardRX + 8 * sx, cardRY + 90 * sy);

  // Center Williams Logo Badge on Apron
  const [logoX, logoY] = T(260, 1072);
  ctx.save();
  ctx.translate(logoX, logoY);
  ctx.fillStyle = '#0284c7';
  ctx.beginPath();
  ctx.arc(0, 0, 26 * sx, 0, Math.PI * 2);
  ctx.fill();
  ctx.strokeStyle = '#ffffff';
  ctx.lineWidth = 4 * sx;
  ctx.stroke();

  ctx.font = `bold italic ${Math.floor(28 * sx)}px "Times New Roman", serif`;
  ctx.fillStyle = '#ffffff';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText('W', 0, 2 * sy);
  ctx.restore();

  // 10. Shooter Lane Launch Direction Strip
  const [plX, plY] = T(498, 880);
  ctx.save();
  ctx.fillStyle = '#ffaa00';
  ctx.beginPath();
  ctx.moveTo(plX, plY - 80 * sy);
  ctx.lineTo(plX - 12 * sx, plY);
  ctx.lineTo(plX + 12 * sx, plY);
  ctx.closePath();
  ctx.fill();
  ctx.restore();

  return canvas;
}

function drawCyberGrid(ctx, width, height) {
  ctx.strokeStyle = 'rgba(56, 189, 248, 0.14)';
  ctx.lineWidth = 2;
  const step = 80;
  for (let x = 0; x < width; x += step) {
    ctx.beginPath();
    ctx.moveTo(x, 0);
    ctx.lineTo(x, height);
    ctx.stroke();
  }
  for (let y = 0; y < height; y += step) {
    ctx.beginPath();
    ctx.moveTo(0, y);
    ctx.lineTo(width, y);
    ctx.stroke();
  }
}

function drawHazardRing(ctx, cx, cy, radius, width) {
  const numSegments = 24;
  for (let i = 0; i < numSegments; i++) {
    const startAngle = (i * Math.PI * 2) / numSegments;
    const endAngle = ((i + 1) * Math.PI * 2) / numSegments;
    ctx.beginPath();
    ctx.arc(cx, cy, radius, startAngle, endAngle);
    ctx.strokeStyle = i % 2 === 0 ? '#ffb700' : '#05070e';
    ctx.lineWidth = width;
    ctx.stroke();
  }
}

function drawArcadeArrow(ctx, x, y, angle, topText, bottomText, color, sx, sy) {
  ctx.save();
  ctx.translate(x, y);
  ctx.rotate(angle);

  // Large arrow insert
  ctx.fillStyle = color;
  ctx.beginPath();
  ctx.moveTo(0, -65 * sy);
  ctx.lineTo(-24 * sx, 0);
  ctx.lineTo(-11 * sx, 0);
  ctx.lineTo(-11 * sx, 65 * sy);
  ctx.lineTo(11 * sx, 65 * sy);
  ctx.lineTo(11 * sx, 0);
  ctx.lineTo(24 * sx, 0);
  ctx.closePath();
  ctx.fill();

  ctx.strokeStyle = '#ffffff';
  ctx.lineWidth = 4 * sx;
  ctx.stroke();

  ctx.font = `900 ${Math.floor(13 * sx)}px Arial, sans-serif`;
  ctx.fillStyle = '#050c1e';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText(bottomText, 0, 28 * sy);

  ctx.font = `900 ${Math.floor(15 * sx)}px Impact, Arial, sans-serif`;
  ctx.fillStyle = '#ffffff';
  ctx.fillText(topText, 0, 85 * sy);

  ctx.restore();
}

function drawSlingshotGraphic(ctx, [x, y], side, sx, sy) {
  ctx.save();
  ctx.translate(x, y);
  ctx.fillStyle = side === 'LEFT' ? 'rgba(255, 120, 0, 0.4)' : 'rgba(0, 220, 255, 0.4)';
  ctx.beginPath();
  ctx.moveTo(0, -40 * sy);
  ctx.lineTo((side === 'LEFT' ? 35 : -35) * sx, 40 * sy);
  ctx.lineTo(0, 40 * sy);
  ctx.closePath();
  ctx.fill();

  ctx.font = `900 ${Math.floor(16 * sx)}px Impact, Arial, sans-serif`;
  ctx.fillStyle = '#ffffff';
  ctx.textAlign = 'center';
  ctx.fillText('MELTDOWN', 0, 5 * sy);
  ctx.restore();
}

