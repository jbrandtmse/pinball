/* DRAGON'S KEEP — constants & shared math.
 * Real Williams WPC proportions: playfield 20.25" x 42", ball 1-1/16",
 * flipper bats ~3", pitch 6.5 degrees. Scale: 1 inch = 26.667 px.
 * Playfield space: x in [0,540], y in [0,1120], +y = down-slope.
 * Runs in browser and Node (no DOM access here).
 */
"use strict";
(function (g) {
  const DK = (g.DK = g.DK || {});

  const IN = 26.667; // px per inch

  DK.C = {
    IN,
    PF_W: 540,            // 20.25"
    PF_H: 1120,           // 42"
    BALL_R: 14,           // 1.0625" dia => r ~14.2
    GRAV: 1060,           // px/s^2 along playfield (~10% under real 6.5deg pitch, for playability)
    AIR_DRAG: 0.06,       // 1/s velocity damping (rolling + air)
    MAX_SPEED: 3240,      // px/s hard clamp (~3 m/s)
    PHYS_HZ: 720,         // substep rate
    MAX_FRAME: 0.05,      // clamp render frame dt

    // Flippers
    FLIP_LEN: 84,          // ~3.05" incl. rubber
    FLIP_R0: 11.5,
    FLIP_R1: 7.5,
    FLIP_REST: 32,         // degrees below pivot line
    FLIP_UP: -22,          // degrees above
    FLIP_OMEGA_UP: 38,     // rad/s stroke
    FLIP_OMEGA_DN: 23,
    LFLIP_X: 176, RFLIP_X: 364, FLIP_Y: 1044,

    // Plunger / shooter lane
    SHOOT_X0: 500, SHOOT_X1: 540,   // lane inner walls
    SHOOT_CX: 520,
    PLUNGE_MIN: 860,
    PLUNGE_MAX: 2750,
    PLUNGE_CHARGE_T: 1.35,  // seconds to full pull
    PLUNGE_FLOOR: 0.22,     // quick tap still fires at this charge

    BALLS_TOTAL: 6,         // trough capacity (4-ball wizard multiball + spares)
    BALLS_PER_GAME: 3,

    TILT_WARNINGS: 3,
    BALL_SAVE_T: 12,
    MB_SAVE_T: 14,

    // Scoring (WPC-95 inflation era)
    SC: {
      SLING: 5110,
      POP: 25130,
      SPINNER: 12060,
      ROLLOVER: 50000,
      INLANE: 75000,
      OUTLANE: 100000,
      STANDUP: 51530,
      DROP: 151510,
      DROP_BANK: 500000,
      GATE_HIT: 110250,
      CASTLE_DESTROYED: 3000000,
      LOCK: 500000,
      RAMP: 151510,
      ORBIT: 126530,
      CATAPULT: 202570,
      SCOOP: 76510,
      SKILL: 1000000,
      SKILL_STEP: 500000,
      SUPER_SKILL: 2500000,
      JACKPOT: 1000000,
      DOUBLE_JACKPOT: 2000000,
      SUPER_JACKPOT: 4000000,
      COMBO: 250000,
      KICKBACK: 125000,
      TROLL_HIT: 401810,
      HURRYUP_MAX: 2500000,
      PEASANT: 1500000,
      WIZ_SHOT: 1000000,
      WIZ_COMPLETE: 25000000,
      REPLAY_AT: 40000000
    },

    DMD_W: 128, DMD_H: 32
  };

  // ---- math utils ----
  const M = (DK.M = {});
  M.TAU = Math.PI * 2;
  M.d2r = (d) => (d * Math.PI) / 180;
  M.clamp = (v, a, b) => (v < a ? a : v > b ? b : v);
  M.lerp = (a, b, t) => a + (b - a) * t;
  M.dist = (x0, y0, x1, y1) => Math.hypot(x1 - x0, y1 - y0);
  M.len = (x, y) => Math.hypot(x, y);

  // deterministic RNG (mulberry32)
  M.rng = function (seed) {
    let s = seed >>> 0;
    return function () {
      s |= 0; s = (s + 0x6d2b79f5) | 0;
      let t = Math.imul(s ^ (s >>> 15), 1 | s);
      t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
      return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
  };

  M.fmtScore = function (n) {
    let s = String(Math.floor(n));
    let out = "";
    while (s.length > 3) { out = "," + s.slice(-3) + out; s = s.slice(0, -3); }
    return s + out;
  };

  if (typeof module !== "undefined" && module.exports) module.exports = DK;
})(typeof window !== "undefined" ? window : globalThis);
