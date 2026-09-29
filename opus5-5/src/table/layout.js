// MIDNIGHT HEIST — table layout.
// All geometry in inches on a 20.25" x 45" WPC-standard playfield.
// x: 0 (left rail) .. 20.25 (right rail); y: 0 (top/back) .. 45 (front/player).
// This file is the single source of truth for physics AND rendering.

const DEG = Math.PI / 180;
export const W = 20.25;
export const L = 45;
export const MIRROR = 18.55;          // lower-playfield mirror axis: x' = 18.55 - x
export const mx = x => MIRROR - x;
const mirrorPts = pts => pts.map(([x, y]) => [mx(x), y]).reverse();

function arcPts(cx, cy, r, a0, a1, n) {
  const out = [];
  for (let i = 0; i <= n; i++) {
    const a = a0 + (a1 - a0) * i / n;
    out.push([cx + Math.cos(a) * r, cy + Math.sin(a) * r]);
  }
  return out;
}

// ---------------------------------------------------------------------------
// Walls (open polylines)  mat: physics material; style: render style
// ---------------------------------------------------------------------------
// Orbit exit guide ("nose"): steers balls leaving an orbit into the same-side inlane,
// while its underside still funnels side-bound balls into the outlane.
const noseLeft = [
  [0.0, 28.3], [0.55, 26.15], [0.92, 25.85], [0.72, 25.0], [0.5, 24.0], [0.3, 23.0], [0.14, 22.0], [0.04, 21.0], [0.0, 20.0],
];

export const walls = [
  // Left cabinet wall: outlane -> nose -> orbit -> arch start
  { id: 'wallL', pts: [[0.0, 42.6], ...noseLeft, [0.0, 10.125]], mat: 'wood', style: 'rail', h: 1.35 },
  // Right: shooter lane divider, right nose, right outlane
  { id: 'wallR', pts: [[18.55, 42.6], ...noseLeft.map(([x, y]) => [mx(x), y]), [18.55, 11.8]], mat: 'wood', style: 'rail', h: 1.35 },
  { id: 'shooterDiv', pts: [[18.8, 11.8], [18.8, 44.9]], mat: 'wood', style: 'rail', h: 1.35 },
  { id: 'wallShooter', pts: [[20.25, 10.125], [20.25, 44.9]], mat: 'wood', style: 'rail', h: 1.35 },
  { id: 'shooterFloor', pts: [[18.8, 44.9], [20.25, 44.9]], mat: 'wood', style: 'hidden', h: 1 },
];

export const arch = { id: 'arch', cx: 10.125, cy: 10.125, r: 10.125, a0: Math.PI, a1: 2 * Math.PI, mat: 'metal' };

// ---------------------------------------------------------------------------
// Solid blocks (closed polygons). The ball never gets inside.
// ---------------------------------------------------------------------------
// Central mass: left orbit inner wall, left ramp strip, vault lane, right ramp strip.
export const mass = {
  id: 'mass', mat: 'wood', style: 'mass', h: 1.25,
  pts: [
    [1.4, 19.0], [1.4, 10.4],            // left orbit inner wall
    [11.9, 6.95],                          // roof up to apex under the leftmost lane guide
    [11.75, 7.35], [11.75, 21.2],          // right edge of right-ramp strip (pops side)
    [11.65, 21.2], [11.65, 19.8], [9.45, 19.8], [9.45, 21.2], // right ramp mouth (2.2")
    [8.9, 21.2], [8.9, 12.0], [6.3, 12.0], [6.3, 21.2],       // vault lane
    [4.3, 21.2], [4.3, 19.8], [2.0, 19.8], [2.0, 21.2],       // left ramp mouth (2.3")
    [1.85, 21.2],
  ],
};

// Hideout scoop housing + right orbit inner wall. The scoop lane is angled 23 deg
// so it faces the left flipper; its roof slopes to shed pop-bumper balls leftward.
export const hideoutBlock = {
  id: 'hideoutBlock', mat: 'wood', style: 'block', h: 1.25,
  pts: [
    [13.35, 20.87], [15.09, 16.97], [16.9, 15.5], [16.9, 9.4], [17.15, 9.4], [17.15, 19.0],
    [15.04, 21.63], [16.78, 17.72], [15.32, 17.07], [13.58, 20.97],
  ],
};

// Inlane/outlane divider blocks (left, mirrored right)
// Inlane geometry: the lane runs straight down, then its floor curves on a 5.5"
// radius into the flipper's 27 deg rest line so the ball rolls onto the bat
// tangentially. The slingshot's lower edge follows the same curve 1.45" above it.
const INLANE_R = 5.498, INLANE_TOP = 32.5, INLANE_X = 2.05, INLANE_W = 1.45, SLING_POST = 0.25;
const inlaneC = [INLANE_X + INLANE_R, INLANE_TOP];
function inlaneArc(r, n) {
  const out = [];
  for (let i = 0; i <= n; i++) {
    const phi = (90 - 63 * i / n) * DEG; // tangent direction 90deg (down) -> 27deg
    out.push([inlaneC[0] - r * Math.sin(phi), inlaneC[1] + r * Math.cos(phi)]);
  }
  return out;
}
const floorArc = inlaneArc(INLANE_R, 10);
const dividerL = [[1.55, 29.8], [INLANE_X, 29.8], ...floorArc, [5.495, 37.628], [5.45, 38.45], [6.7, 41.8], [1.55, 41.8]];
export const dividers = [
  { id: 'divL', pts: dividerL, mat: 'wood', style: 'block', h: 1.1 },
  { id: 'divR', pts: mirrorPts(dividerL), mat: 'wood', style: 'block', h: 1.1 },
];

// Slingshots: rubber-post centres. A (top), C (bottom of the vertical inlane side),
// lower edge follows the inlane curve to D; the kicking face runs A-D.
const slingLowerL = inlaneArc(INLANE_R - INLANE_W - SLING_POST, 8);
const slingXL = INLANE_X + INLANE_W + SLING_POST;
const slingL = { A: [slingXL, 30.3], C: [slingXL, INLANE_TOP], D: slingLowerL[slingLowerL.length - 1], lower: slingLowerL };
const mirrorSling = sl => ({ A: [mx(sl.A[0]), sl.A[1]], C: [mx(sl.C[0]), sl.C[1]], D: [mx(sl.D[0]), sl.D[1]], lower: sl.lower.map(([x, y]) => [mx(x), y]) });
export const slings = [
  { id: 'slingL', sw: 'slingL', ...slingL, postR: SLING_POST },
  { id: 'slingR', sw: 'slingR', ...mirrorSling(slingL), postR: SLING_POST },
];

export const solids = [mass, hideoutBlock, ...dividers];

// ---------------------------------------------------------------------------
// Posts (rubber-ringed) and lane guides
// ---------------------------------------------------------------------------
export const posts = [
  { id: 'pLOrbit', x: 1.6, y: 19.1, r: 0.22, mat: 'post' },   // bottom of left orbit inner wall
  { id: 'pLRampL', x: 1.93, y: 21.12, r: 0.1, mat: 'metal' },
  { id: 'pLRampR', x: 4.37, y: 21.12, r: 0.1, mat: 'metal' },
  { id: 'pVaultL', x: 6.2, y: 21.12, r: 0.12, mat: 'post' },
  { id: 'pVaultR', x: 9.175, y: 21.15, r: 0.26, mat: 'post' },
  { id: 'pRRampR', x: 11.7, y: 21.12, r: 0.1, mat: 'metal' },
  { id: 'pHideL', x: 13.47, y: 20.93, r: 0.15, mat: 'post' },
  { id: 'pHideR', x: 15.1, y: 21.55, r: 0.15, mat: 'post' },
  { id: 'pROrbit', x: 17.025, y: 19.05, r: 0.2, mat: 'post' },
  { id: 'pROrbitTop', x: 17.025, y: 9.4, r: 0.125, mat: 'metal' },
  { id: 'pShooterTop', x: 18.675, y: 11.8, r: 0.125, mat: 'metal' },
  { id: 'pNoseL', x: 0.68, y: 25.95, r: 0.28, mat: 'post' },
  { id: 'pNoseR', x: mx(0.68), y: 25.95, r: 0.28, mat: 'post' },
  { id: 'pDivL', x: 1.8, y: 29.75, r: 0.25, mat: 'post' },
  { id: 'pDivR', x: mx(1.8), y: 29.75, r: 0.25, mat: 'post' },
];

// Top lane guides: thin capsules
export const laneGuides = [11.9, 13.45, 15.0, 16.55].map((x, i) => ({ id: 'guide' + i, x, y0: 4.6, y1: 6.8, r: 0.12 }));

// ---------------------------------------------------------------------------
// Playfield devices
// ---------------------------------------------------------------------------
export const flippers = [
  { id: 'flipL', x: 5.875, y: 38.2, len: 2.5, rb: 0.34, rt: 0.2, rest: 27 * DEG, up: -25 * DEG },
  { id: 'flipR', x: mx(5.875), y: 38.2, len: 2.5, rb: 0.34, rt: 0.2, rest: (180 - 27) * DEG, up: (180 + 25) * DEG },
];

export const bumpers = [
  { id: 'pop1', x: 12.9, y: 9.0, r: 0.95 },
  { id: 'pop2', x: 15.55, y: 9.35, r: 0.95 },
  { id: 'pop3', x: 14.1, y: 12.1, r: 0.95 },
];

// Laser-grid drop targets across the vault lane mouth (face toward the player)
export const drops = [0, 1, 2].map(i => {
  const w = 2.6 / 3, x0 = 6.3 + i * w;
  return { id: 'drop' + (i + 1), a: [x0 + 0.04, 20.95], b: [x0 + w - 0.04, 20.95], r: 0.12, cx: x0 + w / 2 };
});

// Vault door across the vault lane
export const vaultDoor = { id: 'vaultDoor', a: [6.3, 14.8], b: [8.9, 14.8], r: 0.15 };
export const vault = { id: 'vault', x: 7.6, y: 13.3, r: 1.3, ejectX: 7.6, ejectY: 13.6 };

// Hideout scoop -> vertical up-kicker onto the right wireform
export const hideout = { id: 'hideout', x: 15.95, y: 17.72, r: 0.45 };

// Standup targets on the block between the left ramp and the vault lane
export const standups = [
  { id: 'standC', a: [4.55, 21.12], b: [5.3, 21.12] },
  { id: 'standR', a: [5.35, 21.12], b: [6.1, 21.12] },
];

export const rollovers = [
  { id: 'laneK', x: 12.675, y: 5.7, r: 0.42 },
  { id: 'laneE', x: 14.225, y: 5.7, r: 0.42 },
  { id: 'laneY', x: 15.775, y: 5.7, r: 0.42 },
  { id: 'outL', x: 0.775, y: 33.6, r: 0.45 },
  { id: 'inL', x: 2.775, y: 31.4, r: 0.45 },
  { id: 'inR', x: mx(2.775), y: 31.4, r: 0.45 },
  { id: 'outR', x: mx(0.775), y: 33.6, r: 0.45 },
  { id: 'orbitL', x: 0.7, y: 13.2, r: 0.45 },
  { id: 'orbitR', x: 17.85, y: 13.2, r: 0.45 },
  { id: 'shooter', x: 19.525, y: 41.9, r: 0.55 },
  { id: 'kickback', x: 0.775, y: 39.2, r: 0.5 },
];

export const spinner = { id: 'spinner', a: [0.02, 16.2], b: [1.38, 16.2] };

// One-way gate at the top of the shooter lane (balls may only exit upward).
// It overhangs the lane divider, whose cap sits below it, so balls rolling
// down the gate drop cleanly into the right orbit with nothing to wedge against.
export const gates = [
  { id: 'gateShooter', a: [18.55, 11.45], b: [20.25, 10.4], pass: [0, -1] },
];

export const plunger = { x0: 18.8, x1: 20.25, y: 43.4, laneX: 19.525 };
export const kickback = { x: 0.775, y: 39.2, speed: 300 };
export const drainY = 42.35;

// ---------------------------------------------------------------------------
// Ramps (3D spline paths: [x, y, z]) and the hideout up-kicker path
// ---------------------------------------------------------------------------
export const ramps = {
  rampL: {
    mouth: { a: [2.0, 21.1], b: [4.3, 21.1] },
    plasticUntil: 0.42, // fraction of path that is a plastic ramp; rest is wire
    pts: [
      [3.15, 21.0, 0.0], [3.15, 18.0, 0.6], [3.2, 15.0, 1.3], [3.2, 12.0, 2.0], [3.15, 9.6, 2.6],
      [2.85, 7.9, 3.0], [2.1, 7.0, 3.2], [1.2, 7.4, 3.25], [0.75, 8.6, 3.25], [0.7, 10.5, 3.2],
      [0.7, 15.0, 3.0], [0.7, 20.0, 2.6], [0.8, 24.0, 2.25], [1.2, 27.0, 1.8], [2.0, 29.2, 1.25],
      [2.75, 30.6, 0.55], [2.9, 31.0, 0.3],
    ],
    madeAt: 0.4,
  },
  rampR: {
    mouth: { a: [9.45, 21.1], b: [11.65, 21.1] },
    plasticUntil: 0.5,
    pts: [
      [10.55, 21.0, 0.0], [10.55, 18.0, 0.6], [10.5, 15.0, 1.3], [10.5, 12.0, 2.0], [10.55, 9.2, 2.65],
      [10.9, 6.6, 3.1], [12.0, 4.6, 3.4], [13.8, 3.5, 3.6], [15.8, 3.7, 3.6], [17.3, 5.1, 3.5],
      [17.85, 7.2, 3.4], [17.85, 11.0, 3.15], [17.85, 16.0, 2.9], [17.85, 20.5, 2.6], [17.75, 24.0, 2.25],
      [17.35, 27.0, 1.8], [16.55, 29.2, 1.25], [15.8, 30.6, 0.55], [15.65, 31.0, 0.3],
    ],
    madeAt: 0.45,
  },
  // Orbit return wireforms: a ball rolling back down an orbit is caught by a
  // one-way gate at the orbit mouth and carried over the nose into the inlane.
  returnL: {
    gate: { a: [0.02, 19.35], b: [1.38, 19.35] },
    pts: [[0.7, 19.35, 0.0], [0.72, 20.6, 0.45], [0.95, 23.0, 0.85], [1.5, 25.6, 0.95], [2.2, 28.0, 0.75], [2.7, 29.9, 0.35], [2.8, 30.7, 0.1]],
  },
  returnR: {
    gate: { a: [mx(1.38), 19.35], b: [mx(0.02), 19.35] },
    pts: [[mx(0.7), 19.35, 0.0], [mx(0.72), 20.6, 0.45], [mx(0.95), 23.0, 0.85], [mx(1.5), 25.6, 0.95], [mx(2.2), 28.0, 0.75], [mx(2.7), 29.9, 0.35], [mx(2.8), 30.7, 0.1]],
  },
  // Hideout up-kicker: pops the ball up onto the right wireform
  vuk: {
    pts: [[15.95, 17.72, 0.0], [16.0, 17.55, 1.2], [16.5, 17.15, 2.4], [17.3, 16.9, 2.85], [17.85, 17.0, 2.85]],
    joinRamp: 'rampR', joinY: 17.0,
  },
};

// ---------------------------------------------------------------------------
// Lamps / inserts. shape: circle|arrow|rect|star|tri ; rot in degrees (0 = pointing up-table)
// ---------------------------------------------------------------------------
function arrowTo(x, y, tx, ty) { return Math.atan2(tx - x, -(ty - y)) / DEG; }

const jobRing = { x: MIRROR / 2, y: 29.35, r: 1.6 };
export const JOBS = ['CASE', 'SAFE', 'LASER', 'DRIVE', 'INSIDE', 'CROSS'];

export const inserts = [
  // shot arrows
  { id: 'arrLO', shape: 'arrow', x: 3.35, y: 24.6, rot: arrowTo(3.35, 24.6, 0.7, 19), size: 0.95, color: 'amber' },
  { id: 'arrLR', shape: 'arrow', x: 4.7, y: 24.9, rot: arrowTo(4.7, 24.9, 3.2, 21), size: 0.95, color: 'red' },
  { id: 'arrVault', shape: 'arrow', x: 7.6, y: 24.5, rot: 0, size: 1.0, color: 'gold' },
  { id: 'arrRR', shape: 'arrow', x: 10.5, y: 24.5, rot: 0, size: 0.95, color: 'red' },
  { id: 'arrHide', shape: 'arrow', x: 13.6, y: 24.9, rot: arrowTo(13.6, 24.9, 16.1, 21), size: 0.95, color: 'green' },
  { id: 'arrRO', shape: 'arrow', x: 15.0, y: 24.6, rot: arrowTo(15.0, 24.6, 17.85, 19), size: 0.95, color: 'amber' },
  // jackpot dots behind each arrow
  { id: 'jpLO', shape: 'circle', x: 2.75, y: 23.3, size: 0.5, color: 'white' },
  { id: 'jpLR', shape: 'circle', x: 4.3, y: 23.4, size: 0.5, color: 'white' },
  { id: 'jpRR', shape: 'circle', x: 10.5, y: 23.1, size: 0.5, color: 'white' },
  { id: 'jpRO', shape: 'circle', x: 15.6, y: 23.3, size: 0.5, color: 'white' },
  // vault lane
  { id: 'lock1', shape: 'rect', x: 7.6, y: 19.4, size: 0.55, w: 1.5, color: 'gold' },
  { id: 'lock2', shape: 'rect', x: 7.6, y: 18.4, size: 0.55, w: 1.5, color: 'gold' },
  { id: 'lock3', shape: 'rect', x: 7.6, y: 17.4, size: 0.55, w: 1.5, color: 'gold' },
  { id: 'superJP', shape: 'star', x: 7.6, y: 16.1, size: 0.75, color: 'white' },
  { id: 'dropL1', shape: 'circle', x: drops[0].cx, y: 22.1, size: 0.38, color: 'red' },
  { id: 'dropL2', shape: 'circle', x: drops[1].cx, y: 22.1, size: 0.38, color: 'red' },
  { id: 'dropL3', shape: 'circle', x: drops[2].cx, y: 22.1, size: 0.38, color: 'red' },
  { id: 'lockLit', shape: 'rect', x: 7.6, y: 23.1, size: 0.5, w: 1.3, color: 'gold' },
  // hideout
  { id: 'startJob', shape: 'rect', x: 12.95, y: 23.2, size: 0.5, w: 1.3, color: 'green', rot: arrowTo(13.6, 24.9, 16.1, 21) },
  { id: 'extraBallLit', shape: 'circle', x: 12.55, y: 24.3, size: 0.5, color: 'orange' },
  { id: 'mystery', shape: 'circle', x: 14.1, y: 23.9, size: 0.42, color: 'purple' },
  // scouting (orbits light jobs)
  { id: 'scout1', shape: 'tri', x: 16.3, y: 27.2, size: 0.42, color: 'amber', rot: -30 },
  { id: 'scout2', shape: 'tri', x: 16.0, y: 27.9, size: 0.42, color: 'amber', rot: -30 },
  { id: 'scout3', shape: 'tri', x: 15.7, y: 28.6, size: 0.42, color: 'amber', rot: -30 },
  // job ring
  ...JOBS.map((j, i) => {
    const a = (-90 + i * 60) * DEG;
    return { id: 'job' + i, shape: 'circle', x: jobRing.x + Math.cos(a) * jobRing.r, y: jobRing.y + Math.sin(a) * jobRing.r, size: 0.62, color: 'blue', label: j };
  }),
  { id: 'bigScore', shape: 'star', x: jobRing.x, y: jobRing.y, size: 1.1, color: 'gold' },
  // top lanes K-E-Y
  { id: 'lampK', shape: 'circle', x: 12.675, y: 6.3, size: 0.42, color: 'white', label: 'K' },
  { id: 'lampE', shape: 'circle', x: 14.225, y: 6.3, size: 0.42, color: 'white', label: 'E' },
  { id: 'lampY', shape: 'circle', x: 15.775, y: 6.3, size: 0.42, color: 'white', label: 'Y' },
  // bonus multiplier row
  ...[2, 3, 4, 5, 6].map((m, i) => ({ id: 'bx' + m, shape: 'circle', x: MIRROR / 2 + (i - 2) * 0.95, y: 33.95 - Math.abs(i - 2) * 0.18, size: 0.46, color: 'orange', label: m + 'X' })),
  // lanes
  { id: 'lampInL', shape: 'circle', x: 2.775, y: 32.6, size: 0.36, color: 'white' },
  { id: 'lampInR', shape: 'circle', x: mx(2.775), y: 32.6, size: 0.36, color: 'white' },
  { id: 'lampKickback', shape: 'arrow', x: 0.775, y: 36.8, rot: 0, size: 0.7, color: 'green' },
  { id: 'lampOutR', shape: 'circle', x: mx(0.775), y: 35.5, size: 0.4, color: 'orange' },
  { id: 'lampSpinner', shape: 'circle', x: 5.9, y: 28.4, size: 0.42, color: 'amber' },
  { id: 'shootAgain', shape: 'circle', x: MIRROR / 2, y: 40.9, size: 0.6, color: 'red' },
  { id: 'lampCombo', shape: 'circle', x: 12.65, y: 28.4, size: 0.42, color: 'amber' },
];

// General illumination & flashers (render only)
export const flashers = [
  { id: 'flVault', x: 7.6, y: 11.0, z: 2.5, color: 0xffc44d },
  { id: 'flPops', x: 14.2, y: 7.0, z: 3.2, color: 0xff3355 },
  { id: 'flLeft', x: 1.2, y: 26.5, z: 2.5, color: 0x33aaff },
  { id: 'flRight', x: 17.3, y: 26.5, z: 2.5, color: 0x33aaff },
  { id: 'flHide', x: 16.1, y: 15.3, z: 2.2, color: 0x33ff88 },
];

export const table = {
  W, L, MIRROR, walls, arch, mass, hideoutBlock, dividers, slings, solids, posts, laneGuides,
  flippers, bumpers, drops, vaultDoor, vault, hideout, standups, rollovers, spinner, gates, plunger,
  kickback, drainY, ramps, inserts, flashers, JOBS, jobRing,
};
export default table;
