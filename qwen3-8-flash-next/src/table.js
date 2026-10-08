// THUNDER CANYON — the table: geometry, devices, feature map.
// Williams-roy body: 20.25 x 46 in playfield, 6.5-degree incline.
// All coordinates in inches, y down, origin at playfield top-left corner.

var T = typeof TCU !== 'undefined' ? TCU : require('./util.js');
const P = typeof PHYS !== 'undefined' ? PHYS : require('./physics.js');

const TABLE = {};

const W = 20.25, H = 46;
const FLOOR = 45.35;
const RAIL_L = 0.7, RAIL_R = 19.55;
const ARC_C = { x: (RAIL_L + RAIL_R) / 2, y: 10.0 };
const ARC_R = (RAIL_R - RAIL_L) / 2;   // 9.425
const SHOOT_X = 17.45;                  // shooter lane inner guide
const DRAIN_Y = 44.78;

TABLE.W = W; TABLE.H = H; TABLE.FLOOR = FLOOR; TABLE.SHOOT_X = SHOOT_X; TABLE.DRAIN_Y = DRAIN_Y;

function build() {
  const w = new P.World();
  w.playfield = { W, H, ARC_C, ARC_R, RAIL_L, RAIL_R, DRAIN_Y };

  // ---- perimeter: left wall, big top arc, right wall, floor with drain gap ----
  const per = [];
  per.push({ x: RAIL_L, y: FLOOR });
  per.push({ x: RAIL_L, y: ARC_C.y });
  T.appendTo(per, T.arcPts(ARC_C, ARC_R, Math.PI, 0, 0.055));
  per.push({ x: RAIL_R, y: FLOOR });
  w.polyline(per, 0.42);
  // floor split by the drain gap — pit is wider than the flipper tips so
  // balls that sneak under a flipper face still find the hole
  w.polyline([{ x: RAIL_R, y: FLOOR }, { x: 12.0, y: FLOOR }], 0.4);
  w.polyline([{ x: 8.2, y: FLOOR }, { x: RAIL_L, y: FLOOR }], 0.4);

  // ---- shooter lane: straight run, then an elbow curve that merges into
  // the big top arc. A full-power ball wraps the orbit; a weak ball rolls
  // back down the elbow into the plunger and relaunches (auto-plunger). ----
  const ELBOW_R = ARC_R - 2.1; // keeps the lane 2.1 in wide through the curve
  w.polyline([{ x: SHOOT_X, y: FLOOR }, { x: SHOOT_X, y: ARC_C.y }], 0.35, 'guide');
  const elbow = T.arcPts(ARC_C, ELBOW_R, 0, T.rad(80), 0.05);
  w.polyline(elbow, 0.35, 'guide');
  // one-way gate across the lane mouth just past the elbow end
  {
    const hinge = { ...elbow[elbow.length - 1] };
    const tipA = T.rad(95);
    const tip = { x: ARC_C.x + ARC_R * Math.cos(tipA), y: ARC_C.y - ARC_R * Math.sin(tipA) };
    const dir = T.norm(T.sub(tip, hinge));
    const allow = T.mul(T.norm(T.perp(dir)), -1); // wrapping direction (over the top)
    w.gates.push(new P.Gate(hinge, tip, { allow, catch: 0.5 }));
  }
  w.plunger = { lane: { x0: SHOOT_X, x1: RAIL_R, y: FLOOR }, charge: 0 };

  // ---- flippers ----
  w.flippers.push(new P.Flipper({ x: 7.125, y: 42.75 }, 'L', 2.95));
  w.flippers.push(new P.Flipper({ x: 13.125, y: 42.75 }, 'R', 2.95));

  // ---- funnels ----
  // left funnel hangs off the left rail; right funnel hangs off the shooter
  // guide (anchoring it to the rail would dam the ball in the shooter lane)
  w.polyline([{ x: RAIL_L, y: 33.5 }, { x: 1.05, y: 36.2 }, { x: 2.0, y: 38.8 },
              { x: 3.45, y: 41.0 }, { x: 4.9, y: 42.6 }], 0.4, 'funnel');
  // right funnel merges into the sling's top post — a free-standing funnel
  // endpoint at the same height as the post gives balls a dimple to nest in
  w.polyline([{ x: SHOOT_X, y: 29.0 }, { x: 16.6, y: 33.0 }, { x: 15.7, y: 36.2 },
              { x: 14.95, y: 38.6 }, { x: 13.95, y: 39.2 }], 0.4, 'funnel');
  w.posts.push(new P.Post({ x: 1.0, y: 33.2 }, 0.3, 0.5));
  w.posts.push(new P.Post({ x: 16.95, y: 28.2 }, 0.3, 0.5));

  // ---- slingshots ----
  const slings = [
    { id: 'SL', A: { x: 6.3, y: 39.2 }, B: { x: 7.55, y: 41.85 }, C: { x: 7.18, y: 42.55 } },
    { id: 'SR', A: { x: 13.95, y: 39.2 }, B: { x: 12.7, y: 41.85 }, C: { x: 13.07, y: 42.55 } },
  ];
  for (const s of slings) {
    const dir = T.norm(T.sub(s.B, s.A));
    let n = T.norm(T.perp(dir));
    // outward normal points toward playfield center
    if (T.dot(n, T.sub({ x: 10.125, y: 40 }, s.A)) < 0) n = T.mul(n, -1);
    w.polyline([s.A, s.B], 0.3, 'slingbody');           // cosmetic backstop under band
    w.polyline([s.B, s.C, s.A], 0.2, 'slingback');       // rear walls
    w.slings.push({ id: s.id, a: s.A, b: s.B, n, power: 68, cool: 0 });
    w.posts.push(new P.Post(s.A, 0.32, 0.5));
    w.posts.push(new P.Post(s.B, 0.32, 0.5));
  }

  // ---- kickback (funnel-throat ball save) ----
  // sits in the funnel's exit throat; when armed it fires any ball that
  // dribbles down the funnel back up the left rail into the top basin.
  // Power is deliberately soft: the shot just needs to clear the basin,
  // anything stronger turns a save into a rail-slide orbit.
  w.kickbacks.push({ id: 'KB', c: { x: 4.5, y: 42.15 }, r: 0.85, dir: { x: 0.30, y: -0.954 }, power: 78, enabled: false, cool: 0 });

  // ---- pop bumper cluster ----
  const bumpers = [
    { id: 'POP1', c: { x: 8.5, y: 13.3 } },
    { id: 'POP2', c: { x: 11.75, y: 13.3 } },
    { id: 'POP3', c: { x: 10.125, y: 15.85 } },
  ];
  for (const b of bumpers)
    w.poppers.push({ id: b.id, c: b.c, r: 0.92, power: 94, cool: 0 });

  // ---- drop target bank (4) ----
  w.targetStates = {};
  for (let i = 0; i < 4; i++) {
    const x = 5.825 + i * 1.0;
    w.targetStates['BANK' + i] = { down: false };
    w.walls.push(new P.Wall({ x, y: 19.52 }, { x, y: 20.22 }, 0.28, 'target', { targetId: 'BANK' + i }));
  }
  w.posts.push(new P.Post({ x: 5.12, y: 19.85 }, 0.3, 0.5));
  w.posts.push(new P.Post({ x: 9.58, y: 19.85 }, 0.3, 0.5));

  // ---- gold vault saucer (center) ----
  w.captures.push({ id: 'VAULT', c: { x: 10.125, y: 22.15 }, r: 0.78, enabled: true });

  // ---- dynamite spinner: "dynamite runway" blade across the shooter lane ----
  // every launched ball spins it on the way up and every dribble spins it
  // on the way down; the blade's ends are buried in the lane walls so a
  // ball can never balance on a tip
  w.spinners.push({ id: 'SPIN', a: { x: 17.45, y: 36.0 }, b: { x: 19.55, y: 36.0 }, dir: null, normal: null, spin: 0, cool: 0, e: 0.3 });
  {
    const s = w.spinners[0];
    s.dir = T.norm(T.sub(s.b, s.a));
    s.normal = { x: 0, y: -1 }; // faces up into the funnel flow
  }

  // ---- standup trio (canyon walls, left basin) ----
  w.polyline([{ x: 2.35, y: 12.0 }, { x: 2.35, y: 15.6 }], 0.35, 'stub');
  w.standups = [
    { id: 'R', c: { x: 2.92, y: 12.55 }, r: 0.3 },
    { id: 'U', c: { x: 2.92, y: 13.7 }, r: 0.3 },
    { id: 'S', c: { x: 2.92, y: 14.85 }, r: 0.3 },
    { id: 'H', c: { x: 2.92, y: 16.0 }, r: 0.3 },
  ];
  // stub bottom exit rubber
  w.posts.push(new P.Post({ x: 2.35, y: 15.9 }, 0.28, 0.55));

  // ---- rollover pads ----
  // skill / multiplier (top basin)
  w.sensors.push({ id: 'SKILL1', circle: true, c: { x: 8.5, y: 7.0 }, r: 0.5 });
  w.sensors.push({ id: 'SKILL2', circle: true, c: { x: 10.125, y: 6.8 }, r: 0.5 });
  w.sensors.push({ id: 'SKILL3', circle: true, c: { x: 11.75, y: 7.0 }, r: 0.5 });
  w.posts.push(new P.Post({ x: 7.75, y: 7.1 }, 0.17, 0.35));
  w.posts.push(new P.Post({ x: 9.3, y: 6.9 }, 0.17, 0.35));
  w.posts.push(new P.Post({ x: 10.95, y: 6.9 }, 0.17, 0.35));
  w.posts.push(new P.Post({ x: 12.5, y: 7.1 }, 0.17, 0.35));
  // GOLD set
  w.sensors.push({ id: 'G', circle: true, c: { x: 1.55, y: 41.6 }, r: 0.5 });// left outlane
  w.sensors.push({ id: 'O', circle: true, c: { x: 6.4, y: 41.2 }, r: 0.5 });  // left inlane apron
  w.sensors.push({ id: 'L', circle: true, c: { x: 13.85, y: 41.2 }, r: 0.5 }); // right inlane
  w.sensors.push({ id: 'D', circle: true, c: { x: 13.6, y: 37.3 }, r: 0.5 }); // lower right basin slam
  // top orbit pass (inside the elbow channel)
  w.sensors.push({ id: 'TOP', circle: true, c: { x: 16.04, y: 4.09 }, r: 0.62 });

  // drain zones: center gap between flipper tips + the two outlane throats
  w.drainZones = [
    { x0: 9.0, x1: 11.25, y: DRAIN_Y },         // center
    { x0: 15.55, x1: 17.45, y: 43.55 },         // right outlane
    { x0: 0.72, x1: 4.62, y: 43.55 },           // left outlane
  ];

  return w;
}

TABLE.build = build;

// wire physics for special features that need table knowledge
TABLE.instrument = function (w) {
  const HIT_EPS = 2.0;

  // standups: post collisions that also emit events
  const collideStand = (b) => {
    for (const s of w.standups) {
      const d = T.dist(b.p, s.c);
      if (d < s.r + b.r && d > 1e-6) {
        const n = T.norm(T.sub(b.p, s.c));
        b.p = T.add(s.c, T.mul(n, s.r + b.r + 1e-4));
        const vn = T.dot(b.v, n);
        if (vn < 0) {
          if (vn < -HIT_EPS) {
            b.v = T.sub(b.v, T.mul(n, 1.45 * vn));
            w.ev('standup', { id: s.id });
          } else b.v = T.sub(b.v, T.mul(n, vn));
        }
      }
    }
  };

  const origCollide = w.integrate.bind(w);
  w.integrate = function (b, h) {
    origCollide(b, h);
    if (b.state === 'play') collideStand(b);
    // drain zone detection
    if (b.state === 'play') {
      for (const dz of w.drainZones) {
        if (b.p.y > dz.y && b.p.x > dz.x0 && b.p.x < dz.x1) {
          b.state = 'removed';
          w.ev('drain', { ballId: b.id });
          break;
        }
      }
    }
  };

  // drop targets: after the generic wall pass, any live target touched by a
  // moving ball drops and reports in.
  const origWalls = w.collideWalls.bind(w);
  w.collideWalls = function (b, prev) {
    origWalls(b, prev);
    if (b.state !== 'play') return;
    for (const wl of w.walls) {
      if (!wl.targetId) continue;
      const st = w.targetStates[wl.targetId];
      if (st.down) continue;
      const c = T.closestSeg(b.p, wl.a, wl.b);
      if (c.d < b.r + 0.02 && b.speed() > 8) {
        st.down = true;
        st.hitT = w.t;
        w.ev('target', { id: wl.targetId });
      }
    }
  };
};

if (typeof module !== 'undefined' && module.exports) module.exports = TABLE;
if (typeof window !== 'undefined') window.TABLE = TABLE;
