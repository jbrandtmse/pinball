/* static shot-corridor checker: walks each shot line and reports every
 * collider that intrudes into the ball's swept corridor. */
"use strict";
require("../js/constants.js"); require("../js/physics.js"); require("../js/layout.js");
require("../js/dmdfont.js"); require("../js/dmd.js"); require("../js/game.js");
const DK = globalThis.DK, C = DK.C;

const world = new DK.Physics.World();
const layout = DK.Layout.build(world);

const LINES = [
  { name: "orbitL ", from: [330, 1015], to: [48, 520], stopY: 500 },
  { name: "scoop  ", from: [310, 1010], to: [100, 720], stopY: 740 },
  { name: "rampL  ", from: [330, 1010], to: [149, 500], stopY: 480 },
  { name: "cataplt", from: [240, 1010], to: [240, 470], stopY: 480 },
  { name: "castleR", from: [300, 1010], to: [364, 420], stopY: 400 },
  { name: "castleL", from: [240, 1035], to: [364, 430], stopY: 400 },
  { name: "rampR  ", from: [200, 1010], to: [425, 540], stopY: 520 },
  { name: "orbitR ", from: [200, 995], to: [487, 530], stopY: 505 },
  { name: "drops  ", from: [260, 1010], to: [296, 530], stopY: 520 }
];

function distSeg(px, py, s) {
  let t = ((px - s.ax) * s.dx + (py - s.ay) * s.dy) / s.len2;
  t = t < 0 ? 0 : t > 1 ? 1 : t;
  return Math.hypot(px - (s.ax + s.dx * t), py - (s.ay + s.dy * t));
}

for (const L of LINES) {
  const dx = L.to[0] - L.from[0], dy = L.to[1] - L.from[1];
  const len = Math.hypot(dx, dy), ux = dx / len, uy = dy / len;
  const hits = new Map();
  for (let d = 30; d < len * 1.15; d += 3) {
    const px = L.from[0] + ux * d, py = L.from[1] + uy * d;
    if (py < L.stopY) break;
    for (const s of world.solids) {
      if (!s.enabled) continue;
      let dist, desc;
      if (s.type === "seg") {
        dist = distSeg(px, py, s) - s.rad;
        desc = `seg(${s.ax.toFixed(0)},${s.ay.toFixed(0)})-(${s.bx.toFixed(0)},${s.by.toFixed(0)})${s.id ? " " + s.id : ""}`;
      } else {
        dist = Math.hypot(px - s.x, py - s.y) - s.rad;
        desc = `circle(${s.x.toFixed(0)},${s.y.toFixed(0)})r${s.rad}${s.id ? " " + s.id : ""}`;
      }
      const pen = C.BALL_R - dist;
      if (pen > -2) { // within 2px of grazing
        const cur = hits.get(desc);
        if (!cur || pen > cur.pen) hits.set(desc, { pen, at: [px, py] });
      }
    }
  }
  console.log(L.name + (hits.size === 0 ? " CLEAR" : ""));
  for (const [desc, h] of hits) {
    console.log(`   ${h.pen > 0 ? "BLOCK" : "graze"} pen=${h.pen.toFixed(1)} at (${h.at[0].toFixed(0)},${h.at[1].toFixed(0)}): ${desc}`);
  }
}
