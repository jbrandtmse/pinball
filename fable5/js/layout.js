/* DRAGON'S KEEP — table layout.
 * All geometry in playfield units (540 x 1120 = 20.25" x 42").
 * build(world) registers colliders/sensors and returns a layout object with
 * named references, ramp paths, lamp positions and art data for the renderer.
 */
"use strict";
(function (g) {
  const DK = g.DK; const C = DK.C; const M = DK.M;
  const D = M.d2r;

  // Top arch: center + base radius; bulges outward over the key lanes so a
  // fast orbit ball can hold the outer wall past the lane mouths (full loop)
  // while a slow ball drops into a lane.
  const ARCH = { cx: 281, cy: 300, r: 259, bulge: 13 };
  function archR(aDeg) {
    const t = -aDeg; // 0..180
    let b = 0;
    if (t > 60 && t < 130) {
      if (t < 75) b = (t - 60) / 15;
      else if (t > 115) b = (130 - t) / 15;
      else b = 1;
    }
    return ARCH.r + ARCH.bulge * (b * b * (3 - 2 * b));
  }

  const LANE_R = 222;          // key-lane sensor radius
  const GUIDE_R = 213;         // inner arch guide radius
  const LANE_ANGLES = [-113, -95, -77]; // K, E, Y (left to right)

  function build(world) {
    const L = {
      art: { walls: [], posts: [] },
      lamps: {},
      flip: {},
      parts: {},
      ramps: {},
      meta: { ARCH, GUIDE_R, LANE_R, LANE_ANGLES }
    };

    // helpers that register collider + art
    function wall(pts, opts, style) {
      const segs = world.addPolyline(pts, Object.assign({ rad: 3, e: 0.5, fr: 0.03 }, opts));
      L.art.walls.push({ pts, style: style || "steel", rad: (opts && opts.rad) || 3 });
      return segs;
    }
    function post(x, y, r, opts, style) {
      const c = world.addCircle(Object.assign({ x, y, rad: r, e: 0.7, fr: 0.05 }, opts));
      L.art.posts.push({ x, y, r, style: style || "rubber" });
      return c;
    }
    function lamp(id, x, y, kind, rot) {
      L.lamps[id] = { x, y, kind: kind || "round", rot: rot || 0 };
    }
    const arcPts = (cx, cy, r, a0, a1, st) => world.arcPts(cx, cy, r, D(a0), D(a1), st);

    // ---------------- outer boundary ----------------
    // top arch (with bulge) from right wall top (540,300) to left wall top (22,300)
    const archPts = [];
    for (let a = 0; a >= -180; a -= 3) {
      const r = archR(a);
      archPts.push([ARCH.cx + r * Math.cos(D(a)), ARCH.cy + r * Math.sin(D(a))]);
    }
    wall(archPts, { rad: 3, e: 0.5, id: "arch" }, "cab");
    // left wall: straight, then angles in toward the drain
    wall([[22, 300], [22, 970], [44, 1022]], { rad: 3, e: 0.45 }, "cab");
    // right outer wall (shooter lane outer)
    wall([[540, 300], [540, 1080]], { rad: 3, e: 0.45 }, "cab");
    // right main wall below orbit: straight, then angles in
    wall([[500, 940], [500, 970], [478, 1022]], { rad: 3, e: 0.45 }, "cab");
    // no physical funnels below flipper level: everything there drains
    // (the apron art covers this region, like a real machine)

    // ---------------- shooter lane ----------------
    wall([[500, 360], [500, 1070]], { rad: 3, e: 0.45, id: "shooterWall" }, "steel");
    post(500, 356, 5, { e: 0.6 });
    wall([[502, 1070], [540, 1070]], { rad: 3, e: 0.25 }, "steel"); // lane floor / plunger seat
    // one-way flap at top of shooter lane (pass = up-left)
    {
      const len = Math.hypot(40, 22);
      const nx = -22 / len, ny = -40 / len;
      const s = world.addSeg({ ax: 500, ay: 352, bx: 540, by: 330, rad: 2.5, e: 0.3, id: "shooterGate", oneway: { nx, ny } });
      L.parts.shooterGate = s;
    }
    world.addSensorSeg({ ax: 502, ay: 344, bx: 538, by: 324, id: "launched" });

    // ---------------- orbits & arch guide ----------------
    // right orbit inner guide; lower end flares inward (soft reject, no tip spikes)
    wall([[460, 185], [460, 505], [452, 527], [440, 541]], { rad: 3, e: 0.5, id: "orbitGuideR" }, "steel");
    // right orbit exit curve: wall-hugging returns delivered above the inlane
    wall([[500, 640], [484, 730], [458, 800]], { rad: 3, e: 0.45 }, "steel");
    post(455, 804, 4.5, { e: 0.7 });
    // left orbit inner guide; lower end flares inward and merges EXACTLY into
    // the left-ramp guide line (continuous wall, no pocket above the joint)
    wall([[68, 300], [68, 500], [82, 514], [100, 528], [113, 540]], { rad: 3, e: 0.5, id: "orbitGuideL" }, "steel");
    // left orbit exit curve on the wall side — ONE-WAY (wire gate): descending
    // orbit balls ride it to the inlane; the kickback fires up through it
    // into the orbit lane like a real wire-gate kickback
    world.addSeg({ ax: 22, ay: 640, bx: 36, by: 740, rad: 3, e: 0.45, oneway: { nx: 0.990, ny: -0.139 } });
    world.addSeg({ ax: 36, ay: 740, bx: 70, by: 806, rad: 3, e: 0.45, oneway: { nx: 0.889, ny: -0.458 } });
    L.art.walls.push({ pts: [[22, 640], [36, 740], [70, 806]], style: "gate", rad: 3 });
    post(73, 810, 4.5, { e: 0.7 });
    // inner arch guide: right span, then lane gap, then left span
    wall(arcPts(ARCH.cx, ARCH.cy, GUIDE_R, -32.8, -68, 10), { rad: 3, e: 0.5 }, "steel");
    wall(arcPts(ARCH.cx, ARCH.cy, GUIDE_R, -122, -180, 16), { rad: 3, e: 0.5 }, "steel");
    // key-lane divider vanes (radial capsules) at -86 and -104 deg
    for (const a of [-86, -104]) {
      const ca = Math.cos(D(a)), sa = Math.sin(D(a));
      wall([[ARCH.cx + 214 * ca, ARCH.cy + 214 * sa], [ARCH.cx + 226 * ca, ARCH.cy + 226 * sa]],
        { rad: 4, e: 0.55 }, "lane");
    }
    // key lane rollover sensors
    L.meta.keyPos = [];
    LANE_ANGLES.forEach((a, i) => {
      const x = ARCH.cx + LANE_R * Math.cos(D(a)), y = ARCH.cy + LANE_R * Math.sin(D(a));
      world.addSensorCircle({ x, y, rad: 15, id: "key" + i });
      L.meta.keyPos.push([x, y]);
      lamp("key" + i, x, y - 24, "small");
    });
    // orbit entry/exit crossing sensors (dir -1 = moving up = shot in)
    world.addSensorSeg({ ax: 24, ay: 430, bx: 66, by: 430, id: "orbitL" });
    world.addSensorSeg({ ax: 463, ay: 430, bx: 497, by: 430, id: "orbitR" });
    // spinner in left orbit
    world.addSensorSeg({ ax: 25, ay: 488, bx: 65, by: 488, id: "spinner" });
    L.meta.spinner = { x: 45, y: 488, w: 38 };

    // ---------------- pop bumpers ----------------
    L.meta.pops = [[150, 235], [245, 185], [232, 290]];
    L.meta.pops.forEach((p, i) => {
      const c = world.addCircle({ x: p[0], y: p[1], rad: 24, e: 0.65, id: "pop" + i });
      L.parts["pop" + i] = c;
    });

    // ---------------- castle ----------------
    // structure: x 300..440, y 220..360, gate gap 350..390
    wall([[300, 360], [350, 360]], { rad: 3.5, e: 0.42, id: "castleWallL" }, "stone");
    wall([[390, 360], [440, 360]], { rad: 3.5, e: 0.42, id: "castleWallR" }, "stone");
    wall([[300, 220], [300, 360]], { rad: 3.5, e: 0.42 }, "stone");
    wall([[440, 220], [440, 360]], { rad: 3.5, e: 0.42 }, "stone");
    // roof: one continuous downhill slope from the arc-guide end (460,185)
    // to the left corner — anything landing on the castle sheds left
    wall([[296, 216], [370, 204], [460, 185]], { rad: 3.5, e: 0.42 }, "stone");
    // interior deflectors funnel any ball inside back out through the gap
    wall([[302, 340], [350, 356]], { rad: 3, e: 0.3 }, "stone");
    wall([[438, 340], [390, 356]], { rad: 3, e: 0.3 }, "stone");
    post(350, 360, 5, { e: 0.6 });
    post(390, 360, 5, { e: 0.6 });
    L.parts.gate = world.addSeg({ ax: 350, ay: 360, bx: 390, by: 360, rad: 4, e: 0.35, id: "gate" });
    world.addSensorCircle({ x: 370, y: 332, rad: 22, id: "lock" });
    L.meta.castle = { x0: 300, y0: 220, x1: 440, y1: 360, gate: [350, 390], lockAt: [370, 332] };
    lamp("lock1", 344, 388, "small"); lamp("lock2", 396, 388, "small");
    lamp("aCastle", 370, 500, "arrow", 0);

    // trolls (pop-up): colliders enabled only when up
    L.meta.trolls = [[340, 430], [400, 430]];
    L.meta.trolls.forEach((t, i) => {
      const c = world.addCircle({ x: t[0], y: t[1], rad: 13, e: 0.55, id: "troll" + i });
      c.enabled = false;
      L.parts["troll" + i] = c;
      lamp("troll" + i, t[0], t[1] + 26, "small");
    });

    // ---------------- left ramp (entrance lane + flight path) ----------------
    // left guide curls over at the top toward the orbit guide, sealing the
    // dead sliver between them (entrance < ball width)
    // sliver-sealing curl ends high at a convex peak with the ridge, so a
    // slow ball can never bridge curl face + ridge cap
    wall([[80, 398], [124, 414]], { rad: 3, e: 0.5 }, "ramp");
    wall([[128, 430], [110, 560]], { rad: 3, e: 0.5 }, "ramp");
    wall([[196, 586], [188, 560], [170, 430]], { rad: 3, e: 0.5 }, "ramp");
    // ridge from the curl peak to the catapult crown: constant ~8.5-degree
    // descent, doubles as the lane back stop; everything sheds rightward
    // into the pocket (which captures)
    wall([[124, 414], [238, 431]], { rad: 3, e: 0.3 }, "ramp");
    world.addSensorSeg({ ax: 126, ay: 472, bx: 172, by: 472, id: "lrampEnter" });
    world.addSensorSeg({ ax: 124, ay: 442, bx: 174, by: 442, id: "lrampMade" });
    lamp("aRampL", 149, 612, "arrow", 0);
    L.ramps.left = {
      name: "left",
      entry: { x: 149, y: 452 },
      reject: { x: 149, y: 500, vx: 15, vy: 260 },
      exit: { x: 437, y: 906, vx: -25, vy: 185 },
      path: [
        [149, 448, 0], [128, 380, 14], [116, 300, 26], [124, 212, 40], [178, 132, 52],
        [262, 98, 60], [352, 106, 58], [424, 150, 50], [470, 222, 42], [490, 310, 36],
        [498, 410, 30], [496, 520, 24], [482, 640, 17], [458, 770, 10], [440, 862, 4], [437, 906, 0]
      ]
    };

    // ---------------- right ramp ----------------
    // entrance rotated toward the left flipper (real tables angle it);
    // wide mouth + right-guide funnel flare so entries don't rattle out
    wall([[388, 556], [402, 438]], { rad: 3, e: 0.5 }, "ramp");
    wall([[426, 594], [440, 572], [452, 438]], { rad: 3, e: 0.5 }, "ramp");
    wall([[400, 434], [448, 422]], { rad: 3, e: 0.3 }, "ramp"); // sheds left
    world.addSensorSeg({ ax: 390, ay: 482, bx: 448, by: 470, id: "rrampEnter" });
    world.addSensorSeg({ ax: 398, ay: 446, bx: 454, by: 446, id: "rrampMade" });
    lamp("aRampR", 422, 612, "arrow", 0);
    L.ramps.right = {
      name: "right",
      entry: { x: 423, y: 456 },
      reject: { x: 423, y: 505, vx: -15, vy: 260 },
      exit: { x: 140, y: 904, vx: 25, vy: 185 },
      path: [
        [423, 452, 0], [440, 380, 14], [448, 300, 28], [438, 220, 40], [400, 158, 50],
        [330, 122, 57], [244, 122, 60], [162, 152, 54], [104, 218, 46], [74, 300, 38],
        [62, 400, 31], [64, 510, 24], [78, 640, 16], [104, 770, 9], [128, 866, 3], [140, 904, 0]
      ]
    };

    // ---------------- catapult (kicker pocket, center-left) ----------------
    wall([[214, 560], [222, 470]], { rad: 3, e: 0.5 }, "ramp");
    wall([[266, 560], [258, 470]], { rad: 3, e: 0.5 }, "ramp");
    wall(arcPts(240, 452, 20, 180, 360, 8), { rad: 3, e: 0.3 }, "steel");
    world.addSensorCircle({ x: 240, y: 455, rad: 20, id: "catapult" });
    // seal the V-notches between adjacent guide bottoms (no two-point cradles)
    post(201, 562, 7, { e: 0.6 });
    post(268, 545, 5, { e: 0.6 });
    post(452, 548, 4, { e: 0.6 });
    L.meta.catapult = { x: 240, y: 458 };
    lamp("aCata", 240, 612, "arrow", 0);
    // catapult toss: ballistic arc into the pops
    L.meta.catapultToss = { from: [240, 448], to: [235, 200], apexH: 90, t: 0.85 };

    // ---------------- wizard scoop ----------------
    wall(arcPts(100, 720, 22, 140, 360, 12), { rad: 3.5, e: 0.35 }, "scoop");
    world.addSensorCircle({ x: 100, y: 720, rad: 13, id: "scoop" });
    L.meta.scoop = { x: 100, y: 720, ejectV: [225, 320] };
    lamp("aScoop", 122, 780, "arrow", 35);

    // quest shield lamps row
    for (let i = 0; i < 5; i++) lamp("quest" + i, 190 + i * 40, 748, "shield");
    lamp("eb", 270, 706, "round");
    lamp("multiball", 270, 560, "round");

    // ---------------- dragon standup (center-left, arms kickback) ----------------
    L.parts.dragon0 = world.addSeg({ ax: 185, ay: 695, bx: 200, by: 720, rad: 3.5, e: 0.4, id: "dragon0" });
    L.art.walls.push({ pts: [[185, 695], [200, 720]], style: "target", rad: 3.5 });
    lamp("dragon0", 208, 698, "small");

    // ---------------- drop target bank (center, J-S-T) ----------------
    // classic center bank below the castle approach
    {
      const ax = 270, ay = 524, bx = 322, by = 512;
      const dx = (bx - ax) / 3, dy = (by - ay) / 3;
      L.meta.drops = [];
      for (let i = 0; i < 3; i++) {
        const x0 = ax + dx * i + dx * 0.1, y0 = ay + dy * i + dy * 0.1;
        const x1 = ax + dx * (i + 1) - dx * 0.1, y1 = ay + dy * (i + 1) - dy * 0.1;
        const s = world.addSeg({ ax: x0, ay: y0, bx: x1, by: y1, rad: 3.5, e: 0.35, id: "drop" + i });
        L.parts["drop" + i] = s;
        L.meta.drops.push([(x0 + x1) / 2, (y0 + y1) / 2, Math.atan2(y1 - y0, x1 - x0)]);
      }
      // backing deflector: single rightward slope, sheds into the open gap
      wall([[266, 498], [328, 510]], { rad: 2, e: 0.22 }, "steel");
      lamp("drops", 296, 552, "small");
    }
    lamp("aOrbitR", 483, 655, "arrow", 0);
    lamp("aOrbitL", 45, 640, "arrow", 0);
    lamp("spinnerL", 45, 520, "small");

    // ---------------- slingshots ----------------
    // back edges near-vertical: the inlane channel must not pinch below 34px
    L.parts.slingL = world.addSeg({ ax: 136, ay: 914, bx: 163, by: 988, rad: 4, e: 0.6, id: "slingL" });
    wall([[136, 914], [134, 982]], { rad: 3, e: 0.5 }, "sling");
    wall([[134, 982], [163, 988]], { rad: 3, e: 0.5 }, "sling");
    L.parts.slingR = world.addSeg({ ax: 404, ay: 914, bx: 377, by: 988, rad: 4, e: 0.6, id: "slingR" });
    wall([[404, 914], [406, 976]], { rad: 3, e: 0.5 }, "sling");
    wall([[406, 976], [377, 988]], { rad: 3, e: 0.5 }, "sling");
    L.meta.slingL = [[136, 914], [163, 988], [134, 982]];
    L.meta.slingR = [[404, 914], [377, 988], [406, 976]];

    // ---------------- inlanes / outlanes ----------------
    // rail, then a staggered floor that delivers the inlane ball ONTO the
    // flipper; the stagger gap (21px < ball) is sealed but lets outlane balls
    // pass under the floor to the drain without a V-pocket
    wall([[64, 856], [70, 990]], { rad: 3.5, e: 0.45 }, "lane");
    wall([[84, 1006], [170, 1032]], { rad: 3.5, e: 0.4 }, "lane");
    wall([[456, 856], [450, 990]], { rad: 3.5, e: 0.45 }, "lane");
    wall([[436, 1006], [370, 1032]], { rad: 3.5, e: 0.4 }, "lane");
    post(64, 854, 5, { e: 0.72 });
    post(456, 854, 5, { e: 0.72 });
    world.addSensorSeg({ ax: 90, ay: 950, bx: 128, by: 950, id: "inL" });
    world.addSensorSeg({ ax: 410, ay: 950, bx: 442, by: 950, id: "inR" });
    world.addSensorSeg({ ax: 26, ay: 950, bx: 80, by: 950, id: "outL" });
    world.addSensorSeg({ ax: 452, ay: 950, bx: 494, by: 950, id: "outR" });
    world.addSensorSeg({ ax: 36, ay: 996, bx: 80, by: 996, id: "kickback" });
    lamp("inL", 106, 918, "small"); lamp("inR", 430, 918, "small");
    lamp("outL", 52, 900, "small"); lamp("outR", 478, 900, "small");
    lamp("kickback", 60, 1005, "round");
    L.meta.kickback = { x: 62, y: 1005 };

    // ---------------- flippers & drain ----------------
    L.flip.L = world.addFlipper({ pivotX: C.LFLIP_X, pivotY: C.FLIP_Y, side: "L", id: "flipL" });
    L.flip.R = world.addFlipper({ pivotX: C.RFLIP_X, pivotY: C.FLIP_Y, side: "R", id: "flipR" });
    world.addSensorSeg({ ax: 26, ay: 1106, bx: 514, by: 1106, id: "drain" });
    lamp("shootAgain", 270, 1072, "round");

    return L;
  }

  DK.Layout = { build, ARCH };
  if (typeof module !== "undefined" && module.exports) module.exports = DK;
})(typeof window !== "undefined" ? window : globalThis);
