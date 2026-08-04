// "KRAKEN'S GOLD" playfield layout -- a pirate/sea-monster themed table sized to a real
// 20in x 42in / 6.5-degree pitch playfield (508mm x 1067mm, see PHYS in physics.js).
//
// buildTable(callbacks) constructs a fresh World plus references to every named piece of
// hardware the game logic needs to drive. `callbacks` is supplied by game.js -- table.js
// only knows about geometry/physics, never about scoring or modes.

const TABLE = { WIDTH: 508, HEIGHT: 1067 };

function mirrorX(x) { return TABLE.WIDTH - x; }
function mirrorPt(p) { return new Vec2(mirrorX(p.x), p.y); }

function arcPoints(cx, cy, rx, ry, startAngle, endAngle, segments) {
  const pts = [];
  for (let i = 0; i <= segments; i++) {
    const t = startAngle + (endAngle - startAngle) * (i / segments);
    pts.push(new Vec2(cx + Math.cos(t) * rx, cy + Math.sin(t) * ry));
  }
  return pts;
}

function buildTable(callbacks = {}) {
  const cb = callbacks;
  const world = new World();
  world.width = TABLE.WIDTH;
  world.height = TABLE.HEIGHT;
  world.drainY = 1058;

  const info = { world, bumpers: [], topLanes: [], posts: [] };

  // ================================================================= OUTER BOUNDARY
  const domeCx = 254, domeCy = 300, domeRx = 240, domeRy = 282;
  const outerPoints = [
    new Vec2(46, 1050), new Vec2(14, 1025), new Vec2(14, 788),
    ...arcPoints(domeCx, domeCy, domeRx, domeRy, Math.PI, 2 * Math.PI, 28),
    new Vec2(494, 788), new Vec2(494, 1025), new Vec2(462, 1050),
  ];
  const outerWall = new Wall(outerPoints, { restitution: 0.42, thickness: 6 });
  world.collidables.push(outerWall);

  // ================================================================= PLUNGER LANE
  const plungerInner = new Wall([
    new Vec2(450, 1012), new Vec2(450, 550), new Vec2(445, 400),
    new Vec2(420, 290), new Vec2(385, 200), new Vec2(345, 150),
  ], { restitution: 0.35, thickness: 6 });
  world.collidables.push(plungerInner);
  const shooterFloor = new Wall([new Vec2(448, 1013), new Vec2(494, 1013)], { restitution: 0.15, thickness: 6 });
  world.collidables.push(shooterFloor);
  // Catches a plunged ball partway up the lane and sweeps it into the top-lane group;
  // release position depends on entry speed so plunge power still selects the lane.
  const plungerGuide = new PlungerGuide({
    entryA: new Vec2(430, 360), entryB: new Vec2(494, 360),
    xRange: [200, 320], speedRange: [300, 2100],
  });
  world.captureZones.push(plungerGuide);
  info.plungerGuide = plungerGuide;
  info.plungerRest = new Vec2(472, 995);
  info.plungerChannel = { xMin: 452, xMax: 492, yTop: 320 };

  // ================================================================= FLIPPERS
  const leftFlipper = new Flipper(170, 975, 70, degToRad(30), degToRad(-33), { side: 'left', color: '#ffcf3d' });
  const rightFlipper = new Flipper(338, 975, 70, degToRad(150), degToRad(213), { side: 'right', color: '#ffcf3d' });
  world.collidables.push(leftFlipper, rightFlipper);
  info.leftFlipper = leftFlipper;
  info.rightFlipper = rightFlipper;

  // ================================================================= SLINGSHOTS
  const leftSling = new Slingshot(
    [new Vec2(196, 932), new Vec2(226, 863), new Vec2(247, 918)],
    { kickSpeed: 2150, onHit: () => cb.onSlingHit && cb.onSlingHit('left') }
  );
  const rightSling = new Slingshot(
    [new Vec2(312, 932), new Vec2(282, 863), new Vec2(261, 918)],
    { kickSpeed: 2150, onHit: () => cb.onSlingHit && cb.onSlingHit('right') }
  );
  world.collidables.push(leftSling, rightSling);
  info.leftSling = leftSling;
  info.rightSling = rightSling;

  const slingPostL = new Post(220, 852, 6.5, { color: '#ff9d1a' });
  const slingPostR = new Post(288, 852, 6.5, { color: '#ff9d1a' });
  world.collidables.push(slingPostL, slingPostR);

  // ================================================================= INLANE / OUTLANE DIVIDERS
  const leftInlaneWall = new Wall([new Vec2(93, 820), new Vec2(133, 920)], { restitution: 0.35 });
  const rightInlaneWall = new Wall([new Vec2(415, 820), new Vec2(375, 920)], { restitution: 0.35 });
  world.collidables.push(leftInlaneWall, rightInlaneWall);
  const dividerPostL = new Post(70, 848, 7, { color: '#5cf16a' });
  const dividerPostR = new Post(438, 848, 7, { color: '#5cf16a' });
  world.collidables.push(dividerPostL, dividerPostR);

  // ================================================================= KICKBACK (left outlane)
  const kickback = new Kickback(30, 955, 16, new Vec2(0.55, -1), {
    kickSpeed: 2500,
    onFire: () => cb.onKickbackFire && cb.onKickbackFire(),
  });
  world.collidables.push(kickback);
  info.kickback = kickback;

  // ================================================================= POP BUMPERS
  const bumperDefs = [
    { x: 254, y: 178, label: '' },
    { x: 208, y: 258, label: '' },
    { x: 300, y: 258, label: '' },
  ];
  for (const d of bumperDefs) {
    const b = new Bumper(d.x, d.y, 19, {
      kickSpeed: 1950,
      onHit: () => cb.onBumperHit && cb.onBumperHit(b),
    });
    world.collidables.push(b);
    info.bumpers.push(b);
  }

  // ================================================================= GOLD STANDUP TARGETS
  const goldDefs = [
    { a: new Vec2(172, 340), b: new Vec2(194, 340), label: 'G' },
    { a: new Vec2(206, 340), b: new Vec2(228, 340), label: 'O' },
    { a: new Vec2(280, 340), b: new Vec2(302, 340), label: 'L' },
    { a: new Vec2(314, 340), b: new Vec2(336, 340), label: 'D' },
  ];
  info.targetsGOLD = goldDefs.map((d, i) => {
    const t = new StandupTarget(d.a, d.b, {
      label: d.label, color: '#ffd23d',
      onHit: () => cb.onGoldTargetHit && cb.onGoldTargetHit(i),
    });
    world.collidables.push(t);
    return t;
  });

  // ================================================================= KEY DROP TARGET BANK
  const dropBank = new DropTargetBank(
    [[new Vec2(175, 560), new Vec2(200, 560)], [new Vec2(208, 560), new Vec2(233, 560)], [new Vec2(241, 560), new Vec2(266, 560)]],
    {
      labels: ['K', 'E', 'Y'],
      color: '#ff5d3b',
      onTargetHit: (i) => cb.onKeyTargetHit && cb.onKeyTargetHit(i),
      onBankComplete: () => cb.onKeyBankComplete && cb.onKeyBankComplete(),
    }
  );
  world.collidables.push(dropBank);
  info.dropBankKEY = dropBank;

  // ================================================================= KRAKEN'S MAW (lock scoop)
  const scoopMaw = new Scoop(254, 470, {
    captureRadius: 16,
    holdTime: 0.8,
    kickDir: new Vec2(0.08, -1),
    kickSpeed: 1550,
    name: 'maw',
    color: '#8a5cff',
    onCapture: (name, ball) => cb.onMawCapture ? cb.onMawCapture(ball) : 'kick',
  });
  world.captureZones.push(scoopMaw);
  info.scoopMaw = scoopMaw;

  // ================================================================= SPINNER (plunger lane)
  const spinner = new Spinner(472, 500, 30, 0, {
    onSpin: () => cb.onSpinnerSpin && cb.onSpinnerSpin(),
    color: '#ffdf6b',
  });
  world.collidables.push(spinner);
  info.spinner = spinner;

  // ================================================================= TOP SKILL-SHOT LANES
  const laneDividerA = new Wall([new Vec2(228, 72), new Vec2(228, 136)], { restitution: 0.5, thickness: 4 });
  const laneDividerB = new Wall([new Vec2(280, 72), new Vec2(280, 136)], { restitution: 0.5, thickness: 4 });
  // outer backstops so a hard-plunged ball can't sail laterally past the whole lane group
  const laneOuterLeft = new Wall([new Vec2(168, 55), new Vec2(168, 140)], { restitution: 0.45, thickness: 4 });
  const laneOuterRight = new Wall([new Vec2(340, 55), new Vec2(340, 140)], { restitution: 0.45, thickness: 4 });
  world.collidables.push(laneDividerA, laneDividerB, laneOuterLeft, laneOuterRight);

  const laneDefs = [
    { a: new Vec2(178, 92), b: new Vec2(226, 76), color: '#39ff6a' },
    { a: new Vec2(230, 76), b: new Vec2(278, 76), color: '#ff5d3b' },
    { a: new Vec2(282, 76), b: new Vec2(330, 92), color: '#39d0ff' },
  ];
  info.topLanes = laneDefs.map((d, i) => {
    const lane = new RolloverLane(d.a, d.b, {
      color: d.color,
      onPass: () => cb.onTopLanePass && cb.onTopLanePass(i),
    });
    world.collidables.push(lane);
    return lane;
  });

  // ================================================================= RAMPS
  const rampLeft = new RampZone({
    name: 'left',
    entryA: new Vec2(160, 825), entryB: new Vec2(130, 850),
    requiredDir: new Vec2(0, -1), dirTolerance: 0.32, minSpeed: 780,
    path: [new Vec2(145, 838), new Vec2(113, 795), new Vec2(98, 600), new Vec2(108, 400), new Vec2(138, 220), new Vec2(173, 150), new Vec2(213, 122), new Vec2(238, 175)],
    width: 24, hasFlyover: true, flyoverRange: [0.18, 0.7],
    color: '#39d0ff',
    onEnter: () => cb.onRampEnter && cb.onRampEnter('left'),
    onExit: () => cb.onRampExit && cb.onRampExit('left'),
  });
  const rampRight = new RampZone({
    name: 'right',
    entryA: new Vec2(348, 825), entryB: new Vec2(378, 850),
    requiredDir: new Vec2(0, -1), dirTolerance: 0.32, minSpeed: 780,
    path: [new Vec2(363, 838), new Vec2(395, 795), new Vec2(410, 600), new Vec2(400, 400), new Vec2(370, 220), new Vec2(335, 150), new Vec2(295, 122), new Vec2(270, 175)],
    width: 24, hasFlyover: true, flyoverRange: [0.18, 0.7],
    color: '#ffd23d',
    onEnter: () => cb.onRampEnter && cb.onRampEnter('right'),
    onExit: () => cb.onRampExit && cb.onRampExit('right'),
  });
  world.captureZones.push(rampLeft, rampRight);
  info.rampLeft = rampLeft;
  info.rampRight = rampRight;

  return info;
}
