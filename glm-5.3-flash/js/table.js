/* =========================================================================
   RISE OF ATLANTIS — table.js
   Playfield geometry, real WPC proportions: 20.25 in wide x 42 in long.
   y = 0 at the top (back), y = 42 at the player. Node-safe.
   ========================================================================= */
(function (root) {
  'use strict';
  const U = root.AR_UTIL;

  const PF_W = 20.25, PF_L = 42.0;
  const CX = PF_W / 2;

  const T = { PF_W, PF_L, CX };

  // ---- shared geometry helpers ---------------------------------------------
  function arcPts(cx, topY, rx, ry, a0, a1, n) {
    const pts = [];
    for (let i = 0; i <= n; i++) {
      const a = a0 + (a1 - a0) * (i / n);
      pts.push({ x: cx + rx * Math.cos(a), y: topY + ry - ry * Math.sin(a) });
    }
    return pts;
  }

  // offset polyline sideways (for ramp corridor walls)
  function offsetPoly(pts, off) {
    const out = [];
    for (let i = 0; i < pts.length; i++) {
      const p = pts[Math.max(0, i - 1)], q = pts[Math.min(pts.length - 1, i + 1)];
      let dx = q.x - p.x, dy = q.y - p.y;
      const l = Math.hypot(dx, dy) || 1;
      // right-hand normal of travel dir
      const nx = dy / l, ny = -dx / l;
      out.push({ x: pts[i].x + nx * off, y: pts[i].y + ny * off });
    }
    return out;
  }

  // ============================================================ build(world)
  T.build = function (W) {
    const refs = T.refs = { bumpers: [], tides: [], drops: [], tridents: [], slingFlash: [] };

    const wall = { mat: 'wall', thick: 0.24 };
    const rail = { mat: 'rail', thick: 0.16 };

    // ---------------- outer boundary ----------------
    // top arc: (0.5,8) -> apex (10.125,0.5) -> (19.85,8)
    const arc = arcPts(CX, 0.5, (PF_W - 1.0) / 2, 7.5, Math.PI, 0, 30);
    // left wall down to apron
    W.addPoly([{ x: 0.5, y: 8 }].concat([{ x: arc[0].x, y: arc[0].y }]), false, wall);
    W.addSeg(0.5, 8, 0.5, 38.3, wall);
    W.addPoly(arc, false, wall);
    // right wall: arc end down to shooter floor
    W.addSeg(19.85, 8, 19.85, 41.4, wall);

    // ---------------- launch deflector (shooter lane cap) ----------------
    // continuous with shooter-lane inner wall; ball launched up the lane rides
    // the outer arc, exits at the left tip into the left orbit lane.
    const defl = [
      { x: 18.5, y: 9.0 }, { x: 17.85, y: 5.9 }, { x: 15.4, y: 3.2 },
      { x: 12.0, y: 2.2 }, { x: 8.4, y: 2.35 }, { x: 5.0, y: 3.5 },
      { x: 2.6, y: 5.8 }, { x: 1.85, y: 8.3 }, { x: 1.8, y: 9.4 },
    ];
    const dsegs = W.addPoly(defl, false, { mat: 'rail', thick: 0.18 });
    refs.deflector = dsegs;
    W.addPost(1.8, 9.5, 0.13, { mat: 'metal' });           // deflector tip post
    // shooter lane inner wall (continuous with deflector start)
    W.addSeg(18.5, 9.0, 18.5, 41.4, wall);
    // shooter lane floor
    W.addSeg(18.5, 41.4, 19.85, 41.4, wall);
    T.plungerRest = { x: 19.18, y: 40.55 };

    // ---------------- left orbit lane ----------------
    // inner wall + top funnel guide
    W.addPost(2.9, 12.4, 0.14, { mat: 'metal' });
    W.addPoly([{ x: 2.9, y: 12.5 }, { x: 3.15, y: 10.6 }, { x: 3.0, y: 9.6 }], false, rail);
    W.addSeg(2.9, 12.5, 2.9, 24.5, wall);
    // orbit entry deflector: feeds approach shots into the lane above the divider
    W.addPoly([{ x: 2.9, y: 24.5 }, { x: 2.2, y: 21.8 }], false, rail);
    // right orbit lane inner wall + funnel (angled to feed ascents into the top)
    W.addPost(17.15, 12.4, 0.14, { mat: 'metal' });
    W.addPoly([{ x: 17.15, y: 12.5 }, { x: 17.3, y: 10.2 }, { x: 17.0, y: 9.4 }], false, rail);
    // right lane wall stops high so right-flipper shots can ascend into the lane
    W.addSeg(17.15, 12.5, 17.15, 20.5, wall);

    // ---------------- TIDE top lanes ----------------
    const tideX = [7.0, 8.65, 10.3];
    for (const tx of tideX) W.addSeg(tx, 5.4, tx, 7.9, { mat: 'rail', thick: 0.24 });
    W.addPoly([{ x: 5.35, y: 4.8 }, { x: 5.75, y: 6.3 }, { x: 5.75, y: 7.9 }], false, rail);
    W.addPoly([{ x: 12.65, y: 4.8 }, { x: 12.25, y: 6.3 }, { x: 12.25, y: 7.9 }], false, rail);
    refs.tideRol = [];
    const tideCenters = [6.38, 7.83, 9.48, 11.28];
    for (let i = 0; i < 4; i++) {
      W.addZone({ id: 'tide' + i, type: 'sensor', x: tideCenters[i], y: 6.65, r: 0.36, cool: 0.8 });
      refs.tides.push({ x: tideCenters[i], y: 6.65 });
    }

    // ---------------- pop bumpers ----------------
    const bpos = [[9.0, 17.0], [12.6, 17.0], [10.8, 19.6]];
    for (const [bx, by] of bpos) {
      const p = W.addPost(bx, by, 1.02, { mat: 'rubber', bumper: true });
      refs.bumpers.push(p);
    }

    // ---------------- TEMPEST standup (mode start) ----------------
    refs.tempest = W.addSeg(8.75, 22.9, 9.65, 22.9, { mat: 'target', thick: 0.3, target: { id: 'tempest' } });

    // ---------------- whirlpool saucer ----------------
    refs.saucerPos = { x: 11.4, y: 25.6, rDraw: 1.3 };
    W.addZone({ id: 'saucer', type: 'capture', x: 11.4, y: 25.6, r: 1.0, cond: (b, spd) => spd < 85 });

    // ---------------- TRIDENT standup bank (left) ----------------
    const tA = { x: 3.2, y: 24.6 }, tB = { x: 4.3, y: 27.4 };
    const tD = U.norm({ x: tB.x - tA.x, y: tB.y - tA.y });
    const tN = { x: tD.y, y: -tD.x }; // outward (toward player-right)
    for (let i = 0; i < 3; i++) {
      const c = { x: tA.x + tD.x * (0.5 + i), y: tA.y + tD.y * (0.5 + i) };
      const s = W.addSeg(c.x - tD.x * 0.4, c.y - tD.y * 0.4, c.x + tD.x * 0.4, c.y + tD.y * 0.4,
        { mat: 'target', thick: 0.3, target: { id: 'trid' + i } });
      refs.tridents.push(s);
    }
    // backing wall + base deflector
    W.addSeg(tA.x - tN.x * 0.32, tA.y - tN.y * 0.32, tB.x - tN.x * 0.32, tB.y - tN.y * 0.32, wall);
    W.addPoly([{ x: tB.x - tN.x * 0.32, y: tB.y - tN.y * 0.32 }, { x: 5.1, y: 28.1 }], false, rail);

    // ---------------- PEARL drop bank (right) ----------------
    // slanted ~28deg off horizontal so left-flipper shots cross it square-on
    const pA = { x: 14.8, y: 22.6 }, pB = { x: 12.6, y: 23.8 };
    const pD = U.norm({ x: pB.x - pA.x, y: pB.y - pA.y });
    const pN = { x: -pD.y, y: pD.x }; // one side normal (backing goes opposite)
    refs.dropSegs = [];
    for (let i = 0; i < 3; i++) {
      const c = { x: pA.x + pD.x * (0.45 + i * 0.8), y: pA.y + pD.y * (0.45 + i * 0.8) };
      const s = W.addSeg(c.x - pD.x * 0.33, c.y - pD.y * 0.33, c.x + pD.x * 0.33, c.y + pD.y * 0.33,
        { mat: 'target', thick: 0.3, target: { id: 'drop' + i } });
      refs.dropSegs.push(s);
    }
    // backing on the up-right side of the faces (opposite the incoming ball)
    W.addSeg(pA.x + pN.x * 0.32, pA.y + pN.y * 0.32, pB.x + pN.x * 0.32, pB.y + pN.y * 0.32, wall);

    // ---------------- slingshots ----------------
    // left
    refs.slingL = W.addSeg(4.85, 30.2, 6.95, 33.4, { mat: 'rubber', thick: 0.26, sling: 52 });
    W.addPoly([{ x: 4.85, y: 30.2 }, { x: 4.85, y: 33.4 }, { x: 6.95, y: 33.4 }], false, wall);
    // right
    refs.slingR = W.addSeg(15.45, 30.2, 13.4, 33.4, { mat: 'rubber', thick: 0.26, sling: 52 });
    W.addPoly([{ x: 15.45, y: 30.2 }, { x: 15.45, y: 33.4 }, { x: 13.4, y: 33.4 }], false, wall);

    // ---------------- bottom lanes (left) ----------------
    // outlane guide post + wall
    W.addPost(1.55, 28.4, 0.16, { mat: 'rubber' });
    W.addPoly([{ x: 1.55, y: 28.4 }, { x: 1.9, y: 33.0 }, { x: 2.6, y: 36.5 }, { x: 3.2, y: 37.6 }], false, rail);
    // divider from orbit lane down (funnel tips above the inlane channel head)
    W.addPost(2.9, 24.4, 0.14, { mat: 'metal' });
    W.addPoly([{ x: 2.9, y: 24.5 }, { x: 2.95, y: 27.8 }, { x: 3.35, y: 29.8 }], false, rail);
    // inlane guide (continuous with sling bottom-left corner) sealed against flipper base
    W.addPoly([{ x: 4.85, y: 33.4 }, { x: 4.6, y: 35.3 }, { x: 4.8, y: 36.7 }, { x: 6.35, y: 36.95 }], false, rail);
    // apron left
    W.addPoly([{ x: 0.5, y: 38.3 }, { x: 1.9, y: 40.3 }, { x: 5.5, y: 41.3 }, { x: 8.3, y: 41.6 }], false, wall);

    // ---------------- bottom lanes (right, mirrored about shooter wall 18.5) ------
    W.addPost(17.45, 28.4, 0.16, { mat: 'rubber' });
    W.addPoly([{ x: 17.45, y: 28.4 }, { x: 17.1, y: 33.0 }, { x: 16.4, y: 36.5 }, { x: 15.8, y: 37.6 }], false, rail);
    W.addPoly([{ x: 15.45, y: 33.4 }, { x: 15.15, y: 35.3 }, { x: 14.7, y: 36.8 }, { x: 14.0, y: 36.75 }], false, rail);
    // apron right (from shooter wall floor, feeding drain)
    W.addPoly([{ x: 18.5, y: 41.4 }, { x: 17.6, y: 40.7 }, { x: 14.7, y: 41.3 }, { x: 11.9, y: 41.6 }], false, wall);

    // lane sensors + kickback
    W.addZone({ id: 'inlaneL', type: 'sensor', x: 3.4, y: 34.0, r: 0.3, cool: 0.8 });
    W.addZone({ id: 'inlaneR', type: 'sensor', x: 16.3, y: 34.6, r: 0.3, cool: 0.8 });
    W.addZone({ id: 'outlaneL', type: 'sensor', x: 1.05, y: 31.8, r: 0.3, cool: 1.0 });
    W.addZone({ id: 'outlaneR', type: 'sensor', x: 17.95, y: 31.8, r: 0.3, cool: 1.0 });
    W.addZone({ id: 'spinner', type: 'sensor', x: 1.55, y: 15.3, r: 0.85, cool: 0.16 });
    refs.spinner = { x: 1.55, y: 15.3 };
    // top-crossing sensor: marks that a ball completed the orbit loop (either
    // direction, under the deflector or around the launch corridor)
    W.addZone({ id: 'orbitTop', type: 'sensor', rect: { x0: 5.5, x1: 15.0, y0: 0.4, y1: 6.2 }, cool: 0.4 });
    refs.kickL = W.addZone({ id: 'kickback', type: 'kick', x: 1.05, y: 33.6, r: 0.6, dir: { x: 0.3, y: -1 }, power: 92, active: false });

    // ---------------- ramps ----------------
    // LEFT RAMP: left-flipper shot, sweeps right, skies the ball into the
    // right orbit lane head (which feeds the right inlane)
    const rampLpts = [
      { x: 6.6, y: 29.3 }, { x: 5.5, y: 23.4 }, { x: 5.9, y: 17.6 }, { x: 8.4, y: 13.6 },
      { x: 12.4, y: 12.9 }, { x: 15.4, y: 15.1 }, { x: 16.2, y: 19.5 },
    ];
    // RIGHT RAMP: right-flipper shot, arcs high over the top lanes, exits upper-left field
    const rampRpts = [
      { x: 14.0, y: 29.3 }, { x: 15.25, y: 23.2 }, { x: 14.65, y: 17.2 }, { x: 12.3, y: 11.6 },
      { x: 8.0, y: 10.4 }, { x: 5.0, y: 12.6 }, { x: 4.05, y: 17.5 },
      { x: 4.15, y: 22.5 }, { x: 4.75, y: 24.6 },
    ];
    // ramp wall flows into the pearl-bank backing: one continuous surface, no slot
    W.addSeg(15.94, 23.24, 14.95, 22.32, rail);
    refs.rampL = buildRamp(W, 'rampL', rampLpts, 'R'); // mouth on right side of travel
    refs.rampR = buildRamp(W, 'rampR', rampRpts, 'R'); // mirrored chirality: outer wall on shooter side
    refs.rampL.exitCap = 45;  // exit flap scrubs speed toward the inlane
    refs.rampR.exitCap = 55;

    // ---------------- orbit return guides (elevated wire forms) ----------------
    // Balls descending an orbit lane ride the guide over the outlane entry and
    // are deposited in the inlane, exactly like a real WPC return guide.
    const orbL = W.addCorridor('orbL', [
      { x: 1.7, y: 26.6 }, { x: 2.9, y: 30.0 }, { x: 4.4, y: 32.8 }, { x: 5.5, y: 34.6 },
    ], { halfW: 0.62, minSpd: 0, walls: false, exitCap: 24 });
    W.addZone({
      id: 'orbLlink', type: 'link', cor: 'orbL',
      rect: { x0: 0.95, x1: 3.0, y0: 25.4, y1: 27.4 },
      cond: (b) => b.vy > 6,
    });
    const orbR = W.addCorridor('orbR', [
      { x: 17.6, y: 26.6 }, { x: 16.8, y: 30.2 }, { x: 15.7, y: 33.0 }, { x: 14.9, y: 34.8 },
    ], { halfW: 0.62, minSpd: 0, walls: false, exitCap: 24 });
    W.addZone({
      id: 'orbRlink', type: 'link', cor: 'orbR',
      rect: { x0: 17.05, x1: 18.62, y0: 25.4, y1: 27.4 },
      cond: (b) => b.vy > 6,
    });
    refs.orbL = orbL; refs.orbR = orbR;

    // ---------------- flippers ----------------
    refs.flipL = W.addFlipper('flipL', 6.45, 36.55, 3.0, 1, { restAng: 30 * Math.PI / 180, upAng: -26 * Math.PI / 180 });
    refs.flipR = W.addFlipper('flipR', 13.8, 36.55, 3.0, -1, { restAng: 150 * Math.PI / 180, upAng: 206 * Math.PI / 180 });

    // ---------------- drain ----------------
    W.addZone({ id: 'trough', type: 'capture', x: 10.1, y: 41.4, r: 2.6 });
    T.shooterLane = { x0: 18.5, x1: 19.85, yTop: 9.0, yBot: 41.4 };

    W.buildGrid();
    return refs;
  };

  // build a ramp corridor + its physical side walls (flared mouth left open)
  function buildRamp(W, id, pts, mouthSide) {
    const cor = W.addCorridor(id, pts, { halfW: 0.70, minSpd: 15 });
    const hw = 0.70;
    const sideR = offsetPoly(pts, hw);   // right of travel
    const sideL = offsetPoly(pts, -hw);  // left of travel
    const railOpt = { mat: 'rail', thick: 0.14 };
    // outer wall = full length + entry flare; inner (mouth) wall starts after the mouth
    const mouthIsRight = mouthSide === 'R';
    const full = mouthIsRight ? sideL : sideR;
    const inner = mouthIsRight ? sideR : sideL;
    // flare: prepend a point fanned outward+back from the throat so the entry
    // funnel feeds balls into the corridor (like a real ramp mouth)
    const p0 = pts[0], p1 = pts[1];
    const dir0 = U.norm({ x: p1.x - p0.x, y: p1.y - p0.y });
    const out0 = U.norm({ x: full[0].x - p0.x, y: full[0].y - p0.y });
    const flare = {
      x: p0.x - dir0.x * 1.2 + out0.x * 0.95,
      y: p0.y - dir0.y * 1.2 + out0.y * 0.95,
    };
    W.addSeg(flare.x, flare.y, full[0].x, full[0].y, railOpt);
    W.addPoly(full, false, railOpt);
    W.addPost(flare.x, flare.y, 0.11, { mat: 'metal' });
    // find arc-length where mouth ends
    let acc = 0, idx = 1;
    const mouthLen = 1.5;
    while (idx < pts.length && acc < mouthLen) {
      acc += Math.hypot(pts[idx].x - pts[idx - 1].x, pts[idx].y - pts[idx - 1].y);
      idx++;
    }
    const trimmed = inner.slice(idx - 1);
    if (trimmed.length >= 2) W.addPoly(trimmed, false, railOpt);
    // rounded post at inner wall start
    const sp = inner[idx - 1];
    W.addPost(sp.x, sp.y, 0.11, { mat: 'metal' });
    return cor;
  }

  // quick geometry sanity report (node)
  T.validate = function (W) {
    return {
      segs: W.segs.length,
      posts: W.posts.length,
      cors: W.cors.length,
      zones: W.zones.length,
      flippers: W.flippers.length,
    };
  };

  root.AR_TABLE = T;
  if (typeof module !== 'undefined' && module.exports) module.exports = T;
})(typeof window !== 'undefined' ? window : globalThis);
