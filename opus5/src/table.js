/* ============================================================================
 * RAGNAROK PINBALL — table.js
 *
 *   "RAGNAROK — Hammer of the Gods"      Playfield: 521 x 1168 mm (WPC size)
 *
 *   SHOT MAP
 *     A  Left orbit   (YGGDRASIL)   left lane -> top arch -> right lane
 *     B  Left ramp    (BIFROST)     returns to the right inlane
 *     C  Jotunn 3-bank drop targets, guarding...
 *     D  ...the Well of Urd scoop   (mode start / ball lock)
 *     E  Right ramp   (VALHALLA)    returns to the left inlane
 *     F  Right orbit  (MIDGARD)
 *     G  Upper-right "Heimdall" flipper -> loops the orbit
 *     H  3 pop bumpers (RUNE CAVERN) + 4 R-U-N-E top lanes
 *     I  Jormungandr spinner in the left lane
 *     J  T-H-O-R standup targets, 2 per side
 * ==========================================================================*/
(function (PB) {
  'use strict';
  var U = PB.U, P = PB.Phys, A = PB.Audio;

  var T = PB.Table = {};

  T.W = 521;
  T.H = 1168;

  /* Handy landmark coordinates the renderer and rules also want. */
  var K = T.K = {
    archCX: 264, archCY: 320, archR: 250, guideR: 210,
    archA0: -190 * U.DEG, archA1: 10 * U.DEG,
    leftLane: [[57, 357], [60, 430], [61, 500], [62, 560], [62, 620]],
    rightLane: [[471, 357], [452, 410], [442, 470], [440, 540], [440, 620]],
    // tangent arcs that turn a 55-deg flipper shot into a vertical orbit lane
    curlL: { cx: 234, cy: 620, rOut: 220, rIn: 172, a0: 145, a1: 180 },
    curlR: { cx: 266, cy: 620, rOut: 220, rIn: 172, a0: 0, a1: 35 },
    shooterX0: 486, shooterX1: 514, shooterTop: 405,
    flipL: { x: 167, y: 1050 }, flipR: { x: 333, y: 1050 }, flipU: { x: 398, y: 576 },
    scoop: { x: 264, y: 420, r: 19 },
    drops: [{ x: 220, y: 556 }, { x: 264, y: 556 }, { x: 308, y: 556 }],
    bumpers: [{ x: 186, y: 300 }, { x: 264, y: 252 }, { x: 342, y: 300 }],
    topLanes: [186, 238, 290, 342], topLaneY: 182,
    rampL: { x: 178, y: 640 }, rampR: { x: 348, y: 640 },
    standL: [{ x: 72, y: 470 }, { x: 72, y: 522 }],
    standR: [{ x: 430, y: 470 }, { x: 430, y: 522 }],
    spinner: { x: 36, y: 470 },
    plunger: { x: 500, y: 1136 },
    drainY: 1168,
    kickback: { x: 69, y: 986 },
    inlaneL: { x: 105, y: 940 }, inlaneR: { x: 395, y: 940 },
    outlaneL: { x: 73, y: 928 }, outlaneR: { x: 427, y: 928 }
  };

  /* ======================================================== MECHANISM TYPES */

  function Bumper(x, y, idx) {
    this.x = x; this.y = y; this.idx = idx;
    this.r = 25;
    this.lit = true;
    this.flash = 0;
    this.ring = 0;         // animation for the skirt/ring drop
    this.hits = 0;
  }
  Bumper.prototype.fire = function (ball) {
    var dx = ball.x - this.x, dy = ball.y - this.y;
    var d = Math.sqrt(dx * dx + dy * dy) || 1;
    var kick = this.lit ? 2150 : 1500;
    // coil kick, replacing (not adding to) most of the incoming speed
    ball.vx = ball.vx * 0.24 + (dx / d) * kick * U.rng.range(0.9, 1.1);
    ball.vy = ball.vy * 0.24 + (dy / d) * kick * U.rng.range(0.9, 1.1);
    ball.spin += U.rng.jit(60);
    this.flash = 1; this.ring = 1; this.hits++;
  };
  Bumper.prototype.update = function (dt) {
    this.flash = Math.max(0, this.flash - dt * 5.5);
    this.ring = Math.max(0, this.ring - dt * 8);
  };

  function Slingshot(ax, ay, bx, by, cx, cy, side) {
    this.a = [ax, ay]; this.b = [bx, by]; this.c = [cx, cy];
    this.side = side;
    this.flash = 0;
    this.kickT = 0;
    this.hits = 0;
  }
  Slingshot.prototype.fire = function (ball, nx, ny) {
    var kick = 2050 * U.rng.range(0.92, 1.08);
    ball.vx = ball.vx * 0.30 + nx * kick;
    ball.vy = ball.vy * 0.30 + ny * kick - 190;   // slings always throw upward a touch
    this.flash = 1; this.kickT = 0.09; this.hits++;
  };
  Slingshot.prototype.update = function (dt) {
    this.flash = Math.max(0, this.flash - dt * 6);
    this.kickT = Math.max(0, this.kickT - dt);
  };

  function DropTarget(x, y, w, id) {
    this.x = x; this.y = y; this.w = w; this.id = id;
    this.down = false;
    this.anim = 0;     // 0 = up, 1 = fully down
    this.flash = 0;
  }
  DropTarget.prototype.update = function (dt) {
    var want = this.down ? 1 : 0;
    this.anim += U.clamp(want - this.anim, -dt * 9, dt * 14);
    this.flash = Math.max(0, this.flash - dt * 5);
  };

  function Standup(x, y, nx, ny, id, letter) {
    this.x = x; this.y = y; this.nx = nx; this.ny = ny;
    this.id = id; this.letter = letter;
    this.lit = false; this.flash = 0; this.press = 0;
  }
  Standup.prototype.update = function (dt) {
    this.flash = Math.max(0, this.flash - dt * 5);
    this.press = Math.max(0, this.press - dt * 8);
  };

  function Spinner(x, y, w) {
    this.x = x; this.y = y; this.w = w;
    this.angle = 0; this.omega = 0; this.spins = 0; this.lit = false;
  }
  Spinner.prototype.update = function (dt) {
    this.angle += this.omega * dt;
    this.omega *= Math.pow(0.12, dt);
    if (Math.abs(this.omega) < 0.4) this.omega = 0;
  };
  Spinner.prototype.hit = function (ball) {
    var s = Math.abs(ball.vy) + Math.abs(ball.vx) * 0.3;
    this.omega = U.clamp(s * 0.055, 3, 40) * (ball.vy < 0 ? -1 : 1);
    ball.vx *= 0.93; ball.vy *= 0.93;
  };

  function Scoop(x, y, r) {
    this.x = x; this.y = y; this.r = r;
    this.ball = null;
    this.timer = 0;
    this.holdTime = 1.1;
    this.ejectDir = -90;      // straight up the playfield
    this.ejectSpeed = 1700;
    this.locked = 0;          // physically stacked balls
    this.flash = 0;
    this.armed = true;
  }
  Scoop.prototype.update = function (dt) { this.flash = Math.max(0, this.flash - dt * 4); };

  function Plunger(x, y) {
    this.x = x; this.y = y;
    this.power = 0;
    this.pulling = false;
    this.ball = null;
    this.release = 0;    // visual recoil
    this.auto = 0;
  }

  function Kickback(x, y) {
    this.x = x; this.y = y;
    this.lit = false;
    this.flash = 0;
    this.uses = 0;
  }

  function Ramp(name, path, entryX, entryY, opt) {
    opt = opt || {};
    this.name = name;
    this.path = path;
    this.entryX = entryX; this.entryY = entryY;
    this.minSpeed = opt.minSpeed || 1250;
    this.flash = 0;
    this.made = 0;
    this.lit = false;
    this.exitVel = opt.exitVel || [0, 260];
    this.color = opt.color || '#66d0ff';
  }

  /* ============================================================ BUILD */

  T.build = function () {
    var world = new P.World(T.W, T.H);
    var M = P.MAT;
    var t = {
      world: world,
      bumpers: [], slings: [], drops: [], standups: [],
      ramps: [], rollovers: [], gates: [], posts: [],
      walls: [], arcs: []
    };

    function wall(x1, y1, x2, y2, m, opt) {
      var s = new P.Seg(x1, y1, x2, y2, m || M.guide, opt);
      world.add(s); t.walls.push(s); return s;
    }
    function poly(pts, m, opt) {
      var out = [];
      for (var i = 0; i < pts.length - 1; i++)
        out.push(wall(pts[i][0], pts[i][1], pts[i + 1][0], pts[i + 1][1], m, opt));
      return out;
    }
    function arc(cx, cy, r, a0, a1, m, opt) {
      var a = new P.Arc(cx, cy, r, a0, a1, m || M.guide, opt);
      world.add(a); t.arcs.push(a); return a;
    }
    function post(x, y, r, tag) {
      var c = new P.Circle(x, y, r, M.post, { tag: tag || 'post' });
      world.add(c); t.posts.push(c); return c;
    }
    function zone(x, y, w, h, tag, opt) {
      var z = new P.Zone(x, y, w, h, tag, opt);
      world.add(z); return z;
    }

    /* ------------------------------------------------- outer boundary --- */
    // Top arch (the ball guide the orbit rides against)
    arc(K.archCX, K.archCY, K.archR, Math.PI, Math.PI * 2, M.guide, { tag: 'arch', side: -1 });
    // Left rail, straight down to where the orbit curl takes over.
    wall(14, 320, 14, 620, M.guide, { side: 1 });
    // The curl: a true arc, tangent to vertical at the top and to a ~55 deg
    // flipper shot at the bottom. A polyline here made the ball rattle and lose
    // its whole shot; on an arc it rolls through and keeps its speed.
    arc(K.curlL.cx, K.curlL.cy, K.curlL.rOut, K.curlL.a0 * U.DEG, K.curlL.a1 * U.DEG, M.guide, { tag: 'curlL' });
    poly([[54, 746], [62, 806], [56, 900], [46, 1046]], M.guide, { side: 1 });
    // bottom-left funnel down to the drain
    poly([[46, 1046], [96, 1140], [172, 1176]], M.guide, { side: 1 });
    // right rail = outer wall of the shooter lane
    wall(514, 320, 514, 1152, M.guide, { side: 0 });
    // inner wall of the shooter lane / right playfield edge
    wall(K.shooterX0, K.shooterTop, K.shooterX0, 620, M.guide, { side: 0, tag: 'shooterwall' });
    wall(K.shooterX0, 620, K.shooterX0, 1152, M.guide, { side: 0, tag: 'shooterwall' });
    arc(K.curlR.cx, K.curlR.cy, K.curlR.rOut, K.curlR.a0 * U.DEG, K.curlR.a1 * U.DEG, M.guide, { tag: 'curlR' });
    poly([[446, 746], [438, 806], [444, 900], [454, 1046]], M.guide);
    poly([[454, 1046], [404, 1140], [328, 1176]], M.guide);
    // shooter lane floor (the plunger sits here)
    wall(K.shooterX0, 1152, 514, 1152, M.metal);

    // one-way gate at the top of the shooter lane
    var shooterGate = wall(486, 405, 514, 386, M.metal, { gate: 1, tag: 'gate:shooter' });
    t.gates.push({ seg: shooterGate, swing: 0, name: 'shooter' });

    /* ------------------------------------------------- orbit lane guides */
    arc(K.archCX, K.archCY, K.guideR, K.archA0, K.archA1, M.guide, { tag: 'orbitguide' });
    poly(K.leftLane, M.guide);
    poly(K.rightLane, M.guide);
    // inner guides curl with the rails, keeping the lane a constant 46 mm
    arc(K.curlL.cx, K.curlL.cy, K.curlL.rIn, K.curlL.a0 * U.DEG, K.curlL.a1 * U.DEG, M.guide, { tag: 'curlLin' });
    arc(K.curlR.cx, K.curlR.cy, K.curlR.rIn, K.curlR.a0 * U.DEG, K.curlR.a1 * U.DEG, M.guide, { tag: 'curlRin' });

    /* ------------------------------------------------------- top lanes */
    var lx = [160, 212, 264, 316, 368];
    for (var i = 0; i < lx.length; i++) wall(lx[i], 148, lx[i], 214, M.guide);
    for (i = 0; i < 4; i++) {
      var rz = zone(K.topLanes[i], K.topLaneY, 44, 26, 'lane:' + i, { dirY: 0 });
      t.rollovers.push({ zone: rz, x: K.topLanes[i], y: K.topLaneY, lit: false, flash: 0, kind: 'top', idx: i });
    }

    /* -------------------------------------------------------- bumpers */
    for (i = 0; i < K.bumpers.length; i++) {
      var bp = K.bumpers[i];
      var bm = new Bumper(bp.x, bp.y, i);
      var col = new P.Circle(bp.x, bp.y, bm.r, M.bumper, { tag: 'bumper:' + i });
      col.owner = bm;
      world.add(col);
      bm.col = col;
      t.bumpers.push(bm);
    }

    /* ---------------------------------------------------- Well of Urd */
    var sc = new Scoop(K.scoop.x, K.scoop.y, K.scoop.r);
    t.scoop = sc;
    // funnel cheeks steer a shot up the middle into the mouth
    wall(236, 462, 246, 434, M.plastic);
    wall(292, 462, 282, 434, M.plastic);
    // capture trigger sits at the mouth, below the painted hole
    sc.capX = 264; sc.capY = 434;
    zone(264, 434, 30, 26, 'scoopcap');

    /* --------------------------------------------------- drop targets */
    var bank = [];
    for (i = 0; i < K.drops.length; i++) {
      var dp = K.drops[i];
      var dt2 = new DropTarget(dp.x, dp.y, 34, i);
      var face = new P.Seg(dp.x - 17, dp.y, dp.x + 17, dp.y, M.drop, { tag: 'drop:' + i });
      // normal must face DOWN the playfield (toward the player)
      if (face.ny < 0) face.set(dp.x + 17, dp.y, dp.x - 17, dp.y);
      face.owner = dt2;
      var back = new P.Seg(dp.x + 17, dp.y - 7, dp.x - 17, dp.y - 7, M.drop, { tag: 'drop:' + i });
      back.owner = dt2;
      var e1 = new P.Seg(dp.x - 17, dp.y - 7, dp.x - 17, dp.y, M.drop, { tag: 'drop:' + i });
      var e2 = new P.Seg(dp.x + 17, dp.y, dp.x + 17, dp.y - 7, M.drop, { tag: 'drop:' + i });
      e1.owner = e2.owner = dt2;
      dt2.cols = [face, back, e1, e2];
      world.add(face); world.add(back); world.add(e1); world.add(e2);
      t.drops.push(dt2); bank.push(dt2);
    }
    t.dropBank = bank;

    /* ------------------------------------------------ standup targets */
    var THOR = ['T', 'H', 'O', 'R'];
    function standup(x, y, nx, ny, id, letter) {
      var s = new Standup(x, y, nx, ny, id, letter);
      // face is perpendicular to the normal, 30 mm wide
      var tx = -ny * 15, ty = nx * 15;
      var seg = new P.Seg(x - tx, y - ty, x + tx, y + ty, M.target, { tag: 'standup:' + id });
      if (seg.nx * nx + seg.ny * ny < 0) seg.set(x + tx, y + ty, x - tx, y - ty);
      seg.owner = s;
      s.col = seg;
      world.add(seg);
      t.standups.push(s);
      return s;
    }
    standup(K.standL[0].x, K.standL[0].y, 0.94, 0.34, 0, THOR[0]);
    standup(K.standL[1].x, K.standL[1].y, 0.94, 0.34, 1, THOR[1]);
    standup(K.standR[0].x, K.standR[0].y, -0.94, 0.34, 2, THOR[2]);
    standup(K.standR[1].x, K.standR[1].y, -0.94, 0.34, 3, THOR[3]);
    // shoulder plastics: seal the pocket above each bank so a ball can't
    // balance on the corner of a target
    wall(58, 434, 84, 452, M.plastic);
    wall(444, 434, 418, 452, M.plastic);

    /* --------------------------------------------------------- spinner */
    t.spinner = new Spinner(K.spinner.x, K.spinner.y, 40);
    zone(K.spinner.x, K.spinner.y, 44, 12, 'spinner', {});

    /* ------------------------------------------------- ramp structures */
    // Bifrost: a low, forgiving ramp that turns over the middle and drops into
    // the right inlane.  Valhalla is higher and tighter, crossing above it.
    var leftCtl = [
      { x: 178, y: 668, z: 0 }, { x: 176, y: 624, z: 9 }, { x: 182, y: 580, z: 22 },
      { x: 198, y: 542, z: 35 }, { x: 226, y: 514, z: 47 }, { x: 262, y: 500, z: 54 },
      { x: 300, y: 504, z: 56 }, { x: 330, y: 524, z: 54 }, { x: 350, y: 558, z: 50 },
      { x: 364, y: 606, z: 44 }, { x: 376, y: 670, z: 37 }, { x: 386, y: 742, z: 28 },
      { x: 394, y: 814, z: 19 }, { x: 400, y: 874, z: 11 }, { x: 404, y: 928, z: 5 }
    ];
    var rightCtl = [
      { x: 348, y: 668, z: 0 }, { x: 352, y: 620, z: 14 }, { x: 346, y: 570, z: 34 },
      { x: 328, y: 524, z: 56 }, { x: 298, y: 490, z: 76 }, { x: 258, y: 468, z: 92 },
      { x: 212, y: 466, z: 98 }, { x: 176, y: 488, z: 92 }, { x: 152, y: 524, z: 82 },
      { x: 138, y: 572, z: 71 }, { x: 128, y: 638, z: 59 }, { x: 117, y: 714, z: 47 },
      { x: 107, y: 790, z: 34 }, { x: 100, y: 858, z: 20 }, { x: 96, y: 920, z: 8 }
    ];
    var rampL = new Ramp('left',
      new P.RampPath('bifrost', leftCtl, { width: 36, wireFrom: 0.46, color: '#6fd8ff' }),
      K.rampL.x, K.rampL.y, { minSpeed: 1360, color: '#6fd8ff' });
    var rampR = new Ramp('right',
      new P.RampPath('valhalla', rightCtl, { width: 36, wireFrom: 0.44, color: '#ffd166' }),
      K.rampR.x, K.rampR.y, { minSpeed: 1620, color: '#ffd166' });
    t.ramps.push(rampL, rampR);
    t.rampL = rampL; t.rampR = rampR;

    // entrance cheeks (steel guides that flank the ramp flap, flared at the foot)
    poly([[148, 716], [156, 660], [158, 634]], M.guide);
    poly([[208, 716], [200, 660], [198, 634]], M.guide);
    poly([[318, 716], [326, 660], [328, 634]], M.guide);
    poly([[378, 716], [370, 660], [368, 634]], M.guide);
    // ramp entry triggers
    zone(K.rampL.x, 650, 34, 22, 'rampentry:left');
    zone(K.rampR.x, 650, 34, 22, 'rampentry:right');

    /* --------------------------------------------------------- posts */
    post(118, 604, 8);
    post(386, 604, 8);

    /* ---------------------------------------------------- slingshots */
    var sl = new Slingshot(126, 866, 182, 958, 122, 962, 'left');
    var sr = new Slingshot(374, 866, 318, 958, 378, 962, 'right');
    t.slings.push(sl, sr);
    [sl, sr].forEach(function (s, si) {
      var face = new P.Seg(s.a[0], s.a[1], s.b[0], s.b[1], M.rubber, { tag: 'sling:' + si });
      // normal must point away from the sling body (toward playfield centre)
      var mx = (s.a[0] + s.b[0] + s.c[0]) / 3, my = (s.a[1] + s.b[1] + s.c[1]) / 3;
      if ((s.a[0] - mx) * face.nx + (s.a[1] - my) * face.ny < 0) face.set(s.b[0], s.b[1], s.a[0], s.a[1]);
      face.owner = s;
      s.col = face;
      world.add(face);
      world.add(new P.Seg(s.b[0], s.b[1], s.c[0], s.c[1], M.rubber, { tag: '' }));
      world.add(new P.Seg(s.c[0], s.c[1], s.a[0], s.a[1], M.rubber, { tag: '' }));
    });

    /* ------------------------------------------- in / out lane furniture */
    // The divider and the inlane floor are one continuous guide that ends
    // flush against the flipper's base, so the ball is handed onto the bat
    // *past* the pivot and rolls out to the tip instead of jamming behind it.
    poly([[90, 860], [88, 996], [120, 1020], [152, 1034], [174, 1041]], M.guide);
    post(92, 1002, 9);
    poly([[410, 860], [412, 996], [380, 1020], [348, 1034], [326, 1041]], M.guide);
    post(408, 1002, 9);

    t.rollovers.push({ zone: zone(K.inlaneL.x, K.inlaneL.y, 32, 30, 'inlane:left'), x: K.inlaneL.x, y: K.inlaneL.y, lit: false, flash: 0, kind: 'inlane', side: 'left' });
    t.rollovers.push({ zone: zone(K.inlaneR.x, K.inlaneR.y, 32, 30, 'inlane:right'), x: K.inlaneR.x, y: K.inlaneR.y, lit: false, flash: 0, kind: 'inlane', side: 'right' });
    t.rollovers.push({ zone: zone(K.outlaneL.x, K.outlaneL.y, 30, 30, 'outlane:left'), x: K.outlaneL.x, y: K.outlaneL.y, lit: false, flash: 0, kind: 'outlane', side: 'left' });
    t.rollovers.push({ zone: zone(K.outlaneR.x, K.outlaneR.y, 30, 30, 'outlane:right'), x: K.outlaneR.x, y: K.outlaneR.y, lit: false, flash: 0, kind: 'outlane', side: 'right' });

    /* ------------------------------------------------------- kickback */
    t.kickback = new Kickback(K.kickback.x, K.kickback.y);
    zone(K.kickback.x, K.kickback.y, 32, 24, 'kickback', { dirY: 1 });

    /* ----------------------------------------------- orbit / lane triggers */
    zone(42, 660, 44, 26, 'orbit:left');
    zone(458, 660, 44, 26, 'orbit:right');
    zone(K.archCX, 96, 90, 34, 'orbit:top');
    zone(500, 470, 26, 40, 'shooterlane');
    zone(250, 1174, 200, 46, 'drain');

    /* ------------------------------------------------------- flippers */
    var fl = new P.Flipper({ x: K.flipL.x, y: K.flipL.y, rest: 28, end: -22, len: 58, r1: 11.6, r2: 7.0, side: 'left', name: 'left' });
    var fr = new P.Flipper({ x: K.flipR.x, y: K.flipR.y, rest: 152, end: 202, len: 58, r1: 11.6, r2: 7.0, side: 'right', name: 'right' });
    var fu = new P.Flipper({
      x: K.flipU.x, y: K.flipU.y, rest: 152, end: 200, len: 46, r1: 10.4, r2: 6.4,
      side: 'right', name: 'upper', omegaUp: 44, accelUp: 2900
    });
    world.flippers.push(fl, fr, fu);
    t.flipperL = fl; t.flipperR = fr; t.flipperU = fu;

    /* -------------------------------------------------------- plunger */
    t.plunger = new Plunger(K.plunger.x, K.plunger.y);

    /* ------------------------------------------------------- magnets */
    t.magnet = { x: 264, y: 470, r: 90, force: 0, on: false };
    world.magnets.push(t.magnet);

    world.build();

    /* ------------------------------------------------- helper accessors */
    t.dropsDown = function () {
      var n = 0;
      for (var i = 0; i < this.drops.length; i++) if (this.drops[i].down) n++;
      return n;
    };
    t.resetDrops = function () {
      for (var i = 0; i < this.drops.length; i++) {
        this.drops[i].down = false;
        for (var j = 0; j < this.drops[i].cols.length; j++) this.drops[i].cols[j].enabled = true;
      }
    };
    t.dropTarget = function (d) {
      if (d.down) return false;
      d.down = true; d.flash = 1;
      for (var j = 0; j < d.cols.length; j++) d.cols[j].enabled = false;
      return true;
    };

    t.update = function (dt) {
      var i;
      for (i = 0; i < this.bumpers.length; i++) this.bumpers[i].update(dt);
      for (i = 0; i < this.slings.length; i++) this.slings[i].update(dt);
      for (i = 0; i < this.drops.length; i++) this.drops[i].update(dt);
      for (i = 0; i < this.standups.length; i++) this.standups[i].update(dt);
      for (i = 0; i < this.rollovers.length; i++)
        this.rollovers[i].flash = Math.max(0, this.rollovers[i].flash - dt * 4);
      for (i = 0; i < this.ramps.length; i++)
        this.ramps[i].flash = Math.max(0, this.ramps[i].flash - dt * 3);
      this.spinner.update(dt);
      this.scoop.update(dt);
      this.kickback.flash = Math.max(0, this.kickback.flash - dt * 4);
      for (i = 0; i < this.gates.length; i++) {
        var g = this.gates[i];
        g.swing = Math.max(0, g.swing - dt * 6);
      }
      if (this.plunger.release > 0) this.plunger.release = Math.max(0, this.plunger.release - dt * 6);
    };

    return t;
  };

  T.Bumper = Bumper;
  T.Slingshot = Slingshot;
  T.DropTarget = DropTarget;
  T.Standup = Standup;
  T.Spinner = Spinner;
  T.Scoop = Scoop;
  T.Plunger = Plunger;
  T.Kickback = Kickback;
  T.Ramp = Ramp;

})(window.PB = window.PB || {});
