// PLEASURE PALACE — playfield layout. Pure data + construction (browser & Node).
// Canvas design space: 540 x 1100. Backbox (DMD art) lives at y<160;
// playfield arch apex at y=165, apron/drain at y>1080.
//
// Feature map (Williams-style, burlesque theme):
//   SHOOTER LANE (right): plunger + one-way gate at top
//   TOP ARCH: rollover lanes S - E - X - Y along the dome
//   LEFT GUIDE: long left corridor with SPIN THE BOTTLE spinner, drains to
//               left outlane (KICKBACK installed)
//   INLANES: left & right chutes landing on the flipper blades
//   BUMPER FIELD: three pop bumpers BOOBIES / BOOTY / BIG LOVE
//   SEXY KITTEN standup target, NAUGHTY LIST drop bank (4 targets, right)
//   SLINGSHOTS flanking center drain

(function (root, factory) {
  var mod = factory(root.PHYS || require('./physics.js'));
  if (typeof module !== 'undefined' && module.exports) module.exports = mod;
  root.PP_TABLE = mod;
})(typeof globalThis !== 'undefined' ? globalThis : this, function (PHYS) {
  'use strict';

  function buildScene() {
    var s = {
      balls: [],
      items: [],      // walls / gates / rubbers
      circles: [],    // posts & bumpers
      rolls: [],     // rollover triggers
      flippers: [],
      spinner: null,
      drainY: 1088,
      restHintY: 1082,
      spawn: { x: 499, y: 1057 },        // shooter-lane home position
      lane: { left: 478, right: 520 }
    };
    var W = PHYS.wall, G = PHYS.gate, P = PHYS.post, R = PHYS.roll;

    // ---- outer boundary: side walls + top arch --------------------------
    s.items.push(W(20, 415, 20, 1080));           // left wall
    s.items.push(W(520, 415, 520, 1080));         // right wall
    var arch = PHYS.archPoints(270, 415, 250, 180, 0, 12);
    for (var i = 0; i < arch.length - 1; i++) {
      s.items.push(W(arch[i].x, arch[i].y, arch[i + 1].x, arch[i + 1].y, { label: 'arch' }));
    }

    // ---- shooter lane (right) -----------------------------------------------
    // Lane exits straight into the arch mouth (no flapper): a weak shot
    // rolls back to the plunger for auto re-launch; a powered shot
    // (given a slight leftward vane by the plunger) rides the dome.
    s.items.push(W(478, 432, 478, 1079));                 // lane inner wall
    s.items.push(W(480, 1080, 519, 1080));               // plunger floor

    // ---- left guide / outlane corridor (x 22..78) -----------------------
    s.items.push(W(78, 432, 78, 1078));                   // guide divider
    s.spinner = PHYS.spinLine(22, 610, 78, 610, 'SPIN');
    s.rolls.push(R(50, 1010, 15, 'OUTL'));               // kickback / drain sensor

    // ---- left inlane (x 196..250) feeds flipper L ----------------------
    // inner wall bottom meets the flipper blade (y≈976) so the slot is a
    // clean funnel: ball lands on the blade, rolls to the tip, off it.
    // If the wall ended above the blade it formed a shelf the ball could
    // balance on forever (V-pocket).
    s.items.push(W(196, 878, 196, 1078));
    s.items.push(W(250, 878, 250, 977));
    s.rolls.push(R(223, 893, 13, 'INL'));

    // ---- right inlane (x 290..344) feeds flipper R ----------------------
    s.items.push(W(344, 878, 344, 1078));
    s.items.push(W(290, 878, 290, 977));
    s.rolls.push(R(317, 893, 13, 'INR'));

    // ---- right outlane (x 430..476) — no kickback, quick death ---------
    s.items.push(W(430, 878, 430, 1078));

    // ---- slingshots --------------------------------------------------------
    s.items.push(PHYS.rubber(150, 828, 196, 882, 'slingL'));
    s.items.push(PHYS.rubber(390, 828, 344, 882, 'slingR'));

    // ---- bumper field ------------------------------------------------------
    s.circles.push(P(270, 468, 30, { bumper: true, label: 'BIG LOVE' }));
    s.circles.push(P(195, 575, 28, { bumper: true, label: 'BOOBIES' }));
    s.circles.push(P(345, 575, 28, { bumper: true, label: 'BOOTY' }));
    s.circles.push(P(120, 460, 8, { label: 'post' }));
    s.circles.push(P(420, 460, 8, { label: 'post' }));
    s.circles.push(P(270, 668, 9, { label: 'post' }));

    // ---- SEXY KITTEN standup -----------------------------------------------
    s.items.push(W(246, 770, 294, 776, { rest: 0.6, label: 'KITTEN' }));

    // ---- NAUGHTY LIST drop bank (right, 4 targets) ----------------------
    // slightly stepped: balls that ride onto the bank slide back out
    var bank = [
      [404, 614, 421, 611], [425, 609, 441, 606],
      [445, 604, 461, 601], [465, 599, 476, 596]
    ];
    var bankSegs = [];
    for (var b = 0; b < 4; b++) {
      var seg = W(bank[b][0], bank[b][1], bank[b][2], bank[b][3], { rest: 0.5, label: 'T' + (4 - b) });
      s.items.push(seg);
      bankSegs.push(seg);
    }

    // ---- rollovers S E X Y ----------------------------------------
    // spread across DIFFERENT paths so one launch sweep can't complete
    // the set: Y+X on the dome sweep, S at the guide mouth, E lives in
    // the right outlane (needs its own shot) — SEXY over several trips.
    s.rolls.push(R(50, 300, 14, 'S'));
    s.rolls.push(R(453, 872, 13, 'E'));
    s.rolls.push(R(387, 195, 14, 'X'));
    s.rolls.push(R(490, 298, 14, 'Y'));

    // ---- flippers ----------------------------------------------------------
    s.flippers.push(PHYS.flipper(192, 950, 70, 'L'));
    s.flippers.push(PHYS.flipper(348, 950, 70, 'R'));

    return { scene: s, bankSegs: bankSegs };
  }

  return {
    build: buildScene,
    DMD: { x: 60, y: 70, w: 420, h: 78 }
  };
});
