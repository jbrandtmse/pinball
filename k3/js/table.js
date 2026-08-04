// NOVA STRIKE — playfield layout.
// Coordinates: 720 x 1560 virtual pixels, y down. Ball radius 13.5.
// All geometry is data; behavior events flow through world.events for rules.js.

import { seg, arc, circle, makeFlipper, addBall, startRamp, TAU } from './physics.js';

export const PF_W = 720;
export const PF_H = 1560;
export const BALL_R = 13.5;

const D2R = Math.PI / 180;

// helper: point on the top arch annulus
function archPt(r, deg) {
  const a = deg * D2R;
  return { x: 360 + Math.cos(a) * r, y: 500 + Math.sin(a) * r };
}

export function buildTable(world) {
  const C = world.colliders;
  const S = world.sensors;
  const T = {
    targets: {},      // id -> collider (standup/drop)
    drops: [],        // ordered drop-target colliders
    lanes: {},        // top lane sensor ids
    rampDefs: {},
    posts: []
  };

  const hit = (id, extra = {}) => (ball, w, speed) =>
    w.events.push({ type: 'switch', id, ball, speed, ...extra });

  const sw = (id, x, y, r) => S.push({
    id,
    test: (b) => !b.onRamp && ((b.x - x) ** 2 + (b.y - y) ** 2) < (r + b.r * 0.4) ** 2,
    onTrigger: (b, w) => w.events.push({ type: 'switch', id, ball: b })
  });

  // ---------------------------------------------------------------- walls
  // outer left wall
  C.push(seg(14, 500, 14, 1310, { id: 'wallL' }));
  // outer arch + outer right wall
  C.push(arc(360, 500, 346, 180 * D2R, 360 * D2R, { id: 'archOuter', inner: true }));
  C.push(seg(706, 500, 706, 1475, { id: 'wallR' }));
  // shooter lane floor
  C.push(seg(668, 1475, 706, 1475, { id: 'laneFloor', bounce: 0.1 }));
  // ------------------------------------------------- top arch lane dividers
  // The inner arch has three gaps at the top; each gap feeds a short radial
  // lane that drops the ball into the pop-bumper area. A fast plunge hugs
  // the outer wall and orbits straight past the gaps (full orbit); a slow
  // ball crests the top, rolls along the inner wall and falls through a gap
  // (skill shot).
  const GAPS = [[236, 244], [262, 270], [288, 296]];
  let prevEnd = 180;
  for (const [g0, g1] of GAPS) {
    C.push(arc(360, 500, 300, prevEnd * D2R, g0 * D2R, { id: 'archInner', inner: false }));
    prevEnd = g1;
  }
  C.push(arc(360, 500, 300, prevEnd * D2R, 360 * D2R, { id: 'archInner', inner: false }));
  for (const deg of [236, 244, 262, 270, 288, 296]) {
    const a = archPt(298, deg), b = archPt(222, deg);
    C.push(seg(a.x, a.y, b.x, b.y, { id: 'laneDiv' + deg, bounce: 0.2 }));
  }
  // top lane rollovers
  const laneAt = (deg) => archPt(258, deg);
  T.lanes = { L1: laneAt(240), L2: laneAt(266), L3: laneAt(292) };
  // shooter lane inner wall + short connector to inner arch. The connector
  // stops high and the wall starts low, leaving a tall open window beside
  // the one-way gate: a ball rolling back down the closed gate falls off
  // its left end and drops through the window into the playfield (exactly
  // like the real wireform gate + opening on a Williams shooter lane).
  C.push(seg(668, 590, 668, 1320, { id: 'laneInner' }));
  {
    const p = archPt(300, 0);
    C.push(seg(p.x, p.y, 663, 512, { id: 'laneTopJoin' }));
  }
  // One-way gate at the top of the shooter lane. Blocked direction is
  // down-right (into the lane): plunges swing through, orbit balls coming
  // down are blocked and roll back through the top lanes.
  C.push(seg(676, 548, 706, 520, {
    id: 'laneGate', oneWay: { nx: 0.60, ny: 0.80 }, bounce: 0.15
  }));

  // left orbit channel: inner wall + exit deflector into the pops
  C.push(seg(60, 500, 60, 700, { id: 'orbitInner' }));
  C.push(seg(60, 700, 175, 805, { id: 'orbitExit', bounce: 0.2 }));

  // apron diagonals (funnel to trough)
  C.push(seg(14, 1310, 258, 1545, { id: 'apronL', bounce: 0.1 }));
  C.push(seg(668, 1320, 462, 1545, { id: 'apronR', bounce: 0.1 }));

  // ------------------------------------------------- top lane rollovers
  sw('topLane1', T.lanes.L1.x, T.lanes.L1.y, 13);
  sw('topLane2', T.lanes.L2.x, T.lanes.L2.y, 13);
  sw('topLane3', T.lanes.L3.x, T.lanes.L3.y, 13);

  // orbit exit sensor (left channel) & shooter-lane sensor
  sw('orbitExitSw', 38, 640, 18);
  sw('shooterLane', 687, 300, 20);

  // ------------------------------------------------------------ pop bumpers
  const bumpers = [
    { x: 240, y: 760 }, { x: 430, y: 760 }, { x: 335, y: 900 }
  ];
  T.bumpers = bumpers.map((p, i) => {
    const c = circle(p.x, p.y, 33, {
      id: 'pop' + i,
      bounce: 0.4,
      hitThreshold: 30,
      onHit: (ball, w) => {
        // kick away from bumper center
        const dx = ball.x - p.x, dy = ball.y - p.y;
        const d = Math.hypot(dx, dy) || 1;
        ball.vx += dx / d * 620;
        ball.vy += dy / d * 620;
        w.events.push({ type: 'switch', id: 'pop' + i, ball });
      }
    });
    C.push(c);
    return c;
  });

  // ------------------------------------------------------- slingshots
  // faces kick the ball down-and-in when struck from the front
  function sling(id, ax, ay, bx, by, knx, kny) {
    // front = the side the kick normal points into; inlane balls rolling
    // along the back side just glance off without a kick
    const kl = Math.hypot(knx, kny);
    const fnx = knx / kl, fny = kny / kl;
    C.push(seg(ax, ay, bx, by, {
      id, bounce: 0.25, hitThreshold: 60,
      onHit: (ball, w) => {
        const side = (ball.x - ax) * fnx + (ball.y - ay) * fny;
        if (side <= 0) return;
        ball.vx += knx; ball.vy += kny;
        w.events.push({ type: 'switch', id, ball });
      }
    }));
  }
  sling('slingL', 150, 1120, 195, 1335, 430, 160);
  sling('slingR', 570, 1120, 525, 1335, -430, 160);

  // flipper feed guides — end tangent to the flipper base circle (like the
  // metal guide meeting the pivot washer on a real table) so the ball hands
  // off onto the bat with no pocket at the seam
  C.push(seg(195, 1335, 236.3, 1381.3, { id: 'feedL', bounce: 0.15 }));
  C.push(seg(525, 1335, 483.7, 1381.3, { id: 'feedR', bounce: 0.15 }));

  // --------------------------------------------------- inlane/outlane guides
  C.push(seg(64, 1140, 64, 1270, { id: 'outGuideL', bounce: 0.2 }));
  C.push(circle(64, 1133, 7, { id: 'outPostL', bounce: 0.75 }));
  C.push(seg(634, 1140, 634, 1270, { id: 'outGuideR', bounce: 0.2 }));
  C.push(circle(634, 1133, 7, { id: 'outPostR', bounce: 0.75 }));
  T.posts.push({ x: 64, y: 1133 }, { x: 634, y: 1133 });

  sw('outlaneL', 39, 1210, 15);
  sw('inlaneL', 106, 1210, 15);
  sw('inlaneR', 603, 1210, 15);
  sw('outlaneR', 651, 1210, 15);

  // kickback sensor sits lower in the left outlane
  sw('kickback', 39, 1285, 15);

  // ------------------------------------------------------------- flippers
  // 92px bats leave a ~37px clear drain gap between the tips (ball is 27) —
  // enough to drain cleanly, tight enough to demand aim.
  const flipL = makeFlipper(253, 1400, 92, -1, { rest: 0.50, sweep: 1.00 });
  const flipR = makeFlipper(467, 1400, 92, +1, { rest: Math.PI - 0.50, sweep: 1.00 });
  world.flippers.push(flipL, flipR);
  T.flipL = flipL; T.flipR = flipR;

  // ------------------------------------------------------- NOVA drop targets
  const dropX = [285, 340, 395, 450];
  dropX.forEach((x, i) => {
    const c = seg(x - 19, 950, x + 19, 950, {
      id: 'drop' + i, bounce: 0.3, hitThreshold: 80,
      onHit: (ball, w) => {
        if (c.disabled) return;
        c.disabled = true;
        w.events.push({ type: 'switch', id: 'drop' + i, ball, index: i });
      }
    });
    C.push(c);
    T.drops.push(c);
  });

  // standup targets: left pair + right bank of three
  const standups = [
    { id: 'standL1', x: 150, y: 1010 }, { id: 'standL2', x: 160, y: 1095 },
    { id: 'standR1', x: 576, y: 905 }, { id: 'standR2', x: 590, y: 982 }, { id: 'standR3', x: 604, y: 1059 }
  ];
  for (const s of standups) {
    const c = seg(s.x - 17, s.y, s.x + 17, s.y, {
      id: s.id, bounce: 0.3, hitThreshold: 60, onHit: hit(s.id)
    });
    C.push(c);
    T.targets[s.id] = c;
  }

  // ------------------------------------------------------------- saucer
  // "DOCKING BAY" — captures slow balls; rules eject them after a beat.
  // Fast balls skate across (no capture), like a real cupped saucer.
  T.saucer = { x: 520, y: 1010 };
  S.push({
    id: 'saucer',
    test: (b) => !b.onRamp && !b.locked && ((b.x - 520) ** 2 + (b.y - 1010) ** 2) < 24 ** 2 &&
      (b.vx * b.vx + b.vy * b.vy) < 900 * 900,
    onTrigger: (b, w) => w.events.push({ type: 'saucer', ball: b })
  });

  // ---------------------------------------------------------------- ramps
  T.rampDefs = {
    left: {
      entry: { x: 235, y: 865, r: 22 },
      path: [
        { x: 235, y: 855 }, { x: 230, y: 700 }, { x: 165, y: 560 },
        { x: 170, y: 430 }, { x: 300, y: 340 }, { x: 520, y: 340 },
        { x: 640, y: 440 }, { x: 645, y: 700 }, { x: 630, y: 1000 },
        { x: 600, y: 1150 }
      ]
    },
    right: {
      entry: { x: 505, y: 840, r: 22 },
      path: [
        { x: 505, y: 830 }, { x: 505, y: 720 }, { x: 560, y: 600 },
        { x: 555, y: 470 }, { x: 460, y: 410 }, { x: 330, y: 430 },
        { x: 185, y: 520 }, { x: 135, y: 700 }, { x: 122, y: 950 },
        { x: 110, y: 1150 }
      ]
    }
  };
  // ramp entrance funnels (physical guide walls)
  C.push(seg(170, 920, 235, 855, { id: 'rampLf1', bounce: 0.2 }));
  C.push(seg(300, 920, 235, 855, { id: 'rampLf2', bounce: 0.2 }));
  C.push(seg(438, 905, 505, 835, { id: 'rampRf1', bounce: 0.2 }));
  C.push(seg(572, 905, 505, 835, { id: 'rampRf2', bounce: 0.2 }));

  for (const [tag, def] of Object.entries(T.rampDefs)) {
    S.push({
      id: 'ramp_' + tag,
      test: (b) => !b.onRamp &&
        ((b.x - def.entry.x) ** 2 + (b.y - def.entry.y) ** 2) < def.entry.r ** 2 &&
        b.vy < -260,
      onTrigger: (b, w) => {
        const speed = Math.max(Math.abs(b.vy), 700);
        startRamp(b, def.path, speed, tag, w);
      }
    });
  }

  // ------------------------------------------------------------- plunger
  T.plunger = { x: 687, restY: 1455 };

  return T;
}

export function serveBall(world, table) {
  return addBall(world, table.plunger.x, table.plunger.restY);
}
