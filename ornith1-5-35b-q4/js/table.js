/*
 * PHOENIX: ASCENSION — playfield geometry + rules controller (table.js)
 * --------------------------------------------------------------------
 * Zero-dependency, Node-safe. Attaches to globalThis.PA in the browser and
 * exports via module.exports for the headless test rig. All physics objects
 * are built on top of engine.js; this file owns the table layout and every
 * rule (scoring, mode lamps, drop/pop targets, ramps, spinner, multiball,
 * tilt, extra ball, high score). The renderer (render.js) is the only DOM
 * file.

 * Coordinate system: y increases downward (canvas space), gravity pulls toward
 * +y so the drain is at the bottom. Units are "virtual pixels" at 40 px/inch,
 * matching a real ~30" x 69" Williams glass. Ball diameter = 2.75".
 */
(function (root, factory) {
  if (typeof module === 'object' && module.exports) {
    module.exports = factory(require('./engine'));
  } else {
    root.PA = factory(root.PA);
  }
})(typeof self !== 'undefined' ? self : this, function (Engine) {
  'use strict';

  var PA = Engine;

  // --------------------------------------------------------------------------
  // Constants — real Williams proportions.
  // --------------------------------------------------------------------------
  var PPM = 40;                       // virtual pixels per inch
  var WIDTH = 30 * PPM;               // 1200   (~30" glass width)
  var HEIGHT = 69 * PPM;              // 2760   (~69" glass height)
  var BALL_R = Math.round(2.75 * PPM / 2); // 55  (2.75" ball)

  var DRAIN_Y = HEIGHT - 200;         // 2560 — crossing here between the flippers drains
  var SHOOT_X_MIN = WIDTH - 178;      // 1022 — inner wall of shooter lane (lane to its right)
  var LANE_CX = SHOOT_X_MIN + 96;     // ~1118 — center of the shooter lane (ball rests here)
  var SHOOT_Y = HEIGHT - 90;          // 2670 — ball rests here before launch
  var LANE_CX = 1132;                 // center of shooter lane (clears inner ~x1060, outer ~x1190)
  var LANE_OUTER = 1190;              // right wall of shooter lane (~" frame lip at WIDTH=1200)
  var LANE_EXIT_Y = 2000;             // kickback line: fire the lane-out as the ball clears the divider tip,
                                      // while still rising fast, so it arcs left into open play (not grazing the ramp guide)

  // --------------------------------------------------------------------------
  // Small helpers for building geometry. Every wall is a PA.Segment pushed into
  // world.segments. Guides are `passive` (excluded from the drain search) so a
  // ball resting against one never counts as drained.
  // --------------------------------------------------------------------------
  function seg(world, x1, y1, x2, y2, o) {
    var s = new PA.Segment({ x: x1, y: y1 }, { x: x2, y: y2 }, o);
    world.segments.push(s);
    return s;
  }
  function guide(world, x1, y1, x2, y2) {
    return seg(world, x1, y1, x2, y2, { kind: 'guide', thickness: 14, restitution: 0.5, passive: true });
  }
  function rail(world, x1, y1, x2, y2) {
    return seg(world, x1, y1, x2, y2, { kind: 'rail', thickness: 16, restitution: 0.6 });
  }

  // Angle from p toward q, but snapped to the short way around from `from`
  // (so a flipper never swings the long way). Returns radians in (-π, π] rel.
  function shortAngle(from, to) {
    var d = to - from;
    while (d > Math.PI) d -= 2 * Math.PI;
    while (d < -Math.PI) d += 2 * Math.PI;
    return from + d;
  }

  // --------------------------------------------------------------------------
  // Flipper factory. Left flipper pivots on the lower-left, tip points down-and-
  // outward at rest and swings up-and-inward to block the drain. Right mirrors.
  // --------------------------------------------------------------------------
  function makeFlipper(world, side) {
    var pivotX = side === 'l' ? 485 : 715;
    var len = 190, thick = 42;
    var restAngle, upAngle;
    if (side === 'l') {
      restAngle = Math.atan2(1, -1);   // down-left toward the corner
      upAngle = -0.5;                  // up-right toward center
    } else {
      restAngle = Math.atan2(1, 1);    // down-right toward the corner
      upAngle = shortAngle(Math.atan2(1, 1), Math.PI + 0.5);
    }
    var f = new PA.Flipper({
      pivot: { x: pivotX, y: 2360 },
      len: len, thickness: thick, side: side,
      restAngle: restAngle, upAngle: upAngle,
      maxAngVel: 40, strength: 22
    });
    world.flippers.push(f);
    return f;
  }

  // --------------------------------------------------------------------------
  // Build the full playfield. Returns { world, game }.
  // --------------------------------------------------------------------------
  function build() {
    var world = new PA.World({ gravity: 2550, dt: 1 / 240, maxBallSpeed: 4600 });

    // Rules controller exists for the whole of build() so geometry callbacks can
    // close over it.
    var game = new Game(world);

    // ========================================================================
    // SIDE RAILS — two continuous polylines (top arc + left + right) with NO
    // gaps. Continuity is the single most important property for avoiding
    // escaped/stuck balls. Left rail inner edge ~x120, right ~x WIDTH-120.
    // ========================================================================
    var LEFT = 120, RIGHT = WIDTH - 120;

    // Top arc: approximate a semicircle from the left rail top to the right
    // rail top with short chords (no gaps between consecutive endpoints).
    var ARC_CX = WIDTH / 2, ARC_CY = 300, ARC_R = (RIGHT - LEFT) / 2;
    var arcPts = [];
    for (var a = Math.PI; a >= 0; a -= Math.PI / 10) {
      arcPts.push({ x: ARC_CX + Math.cos(a) * ARC_R, y: ARC_CY - Math.sin(a) * ARC_R });
    }
    // Connect the arc to the vertical side rails with two more chords.
    var railTopL = arcPts[arcPts.length - 1];   // right end of arc (~RIGHT,300)
    var railTopR = arcPts[0];                    // left end of arc (~LEFT,300)
    rail(world, railTopR.x, railTopR.y, LEFT, 700);
    for (var i = 0; i < arcPts.length - 1; i++) {
      rail(world, arcPts[i].x, arcPts[i].y, arcPts[i + 1].x, arcPts[i + 1].y);
    }
    rail(world, railTopL.x, railTopL.y, RIGHT, 700);
    // Left and right vertical rails down to the lower guide zone.
    rail(world, LEFT, 700, LEFT + 20, 2050);
    // Right border rail of the main field. It STOPS at y=1400 — well above the
    // shooter-lane divider tip (y=1900) — leaving a wide OPEN CHAMBER between the
    // two so a launched ball can arc LEFT out of the lane without grazing the tip.
    rail(world, RIGHT, 700, RIGHT - 20, 1250);
    // ========================================================================
    // SHOOTER LANE / PLUNGER (far right). A channel to the RIGHT of the main-field
    // border (now the lane divider at x≈940), open at the top so a launched ball
    // exits left into the upper playfield. Enclosed on the right by a wall and
    // capped at the bottom by a floor guide so the ball rests on the plunger
    // before launch. The divider was moved LEFT from x1060 to x940 to widen the
    // lane chamber: a rising ball otherwise oscillates in a ~3" tunnel, bounces
    // off both walls with energy loss, and stalls then drains straight back down.
    // ========================================================================
    // Inner wall / lane divider: continues toward the floor. It STOPS at y=1900 —
    // above it this divider gives way to an OPEN CHAMBER (the right-field border
    // also ends well above), so the lane's left side is open there. A launched
    // ball therefore rises past y=1900 and arcs LEFT out of the lane into the upper
    // field (see Game.step, which fires a one-time leftward kickout as it clears
    // the divider tip). Below 1900 the divider seals the lane so balls rest on the
    // plunger.
    rail(world, 940, DRAIN_Y + 200, 940, 1900);
    // Outer (right) wall of the lane — this was entirely missing before, which is
    // why the ball escaped off the right edge past x=1080. It's a single straight
    // rail that angles slightly RIGHT as it rises so the lane WIDENS toward the top:
    // #13 leans in to x≈1080 at y=700, and a vertical wall at 1190 would pinch the
    // gap to exactly the ball diameter (a geometric wedge no launch power can escape).
    // Flaring from 1190 up to ~1265 keeps >150px clearance throughout so a rising ball
    // blows past the top instead of raking dead.
    rail(world, 1190, DRAIN_Y + 200, 1265, 520);
    // Lane floor: seals the bottom (divider to outer wall) so the ball rests on the
    // plunger before launch. Starts at the divider (x940) since that is now the
    // lane's left wall.
    guide(world, 940, DRAIN_Y + 200, LANE_OUTER, DRAIN_Y + 200, { passive: true });

    // ========================================================================
    // LOWER ZONE — drain, flippers, slingshots. The center (x ~460..740) is the
    // open drain between the two flippers. A ball that settles in a side pocket
    // below the flipper line (left of the shooter lane) for too long is
    // auto-ejected back to the plunger so it never wedges forever.
    // ========================================================================
    var FLIP_Y = 2360;

    // Flipper guide rails (passive) that funnel balls toward the flippers.
    guide(world, 470, 2120, 500 - 95, FLIP_Y - 60);   // left guide
    guide(world, 730, 2120, 700 + 95, FLIP_Y - 60);   // right guide

    // Bottom seal: passive rails across the very bottom with an opening only in
    // the center drain (x 460..740). Stops balls falling off; lets them collect.
    guide(world, LEFT, HEIGHT, 460, HEIGHT);           // left bottom pocket floor
    guide(world, 740, HEIGHT, RIGHT - 32, HEIGHT);     // right bottom pocket floor


    makeFlipper(world, 'l');
    makeFlipper(world, 'r');

    // Left-field sweep deflector — a short passive rail on the left field that a
    // ball descending after kickout grazes, sweeping it down-left toward the left
    // flipper/sling instead of letting it wedge in the slingshot V at (385,2136).
    // Tuned so every launch power escapes; geometry is permanent.
    guide(world, 450, 1950, 400, 2060);

    // ========================================================================
    // THREE ROUND BUMPERS — classic Williams triangle in the upper field.
    // ========================================================================
    var BX = WIDTH / 2;
    world.bumpers.push(new PA.Bumper(BX - 130, 470, 72, { restitution: 0.9, score: 1500, onHit: function (b) { game.onBumper(b); } }));
    world.bumpers.push(new PA.Bumper(BX + 130, 470, 72, { restitution: 0.9, score: 1500, onHit: function (b) { game.onBumper(b); } }));
    world.bumpers.push(new PA.Bumper(BX, 585, 72, { restitution: 0.9, score: 1500, onHit: function (b) { game.onBumper(b); } }));

    // ========================================================================
    // TWO SLINGSHOTS — rubber pads just above the flippers. A fast linear kick
    // (segment velocity) plus a lit bonus. Spring velocity decays each step so
    // the pad snaps back after firing.
    // ========================================================================
    var SLING_Y = 2180;
    game.slings = [];
    function makeSlingshot(world, x, side) {
      var len = 150, h = 90;
      var ax = x, ay = SLING_Y - h / 2;
      var bx = x + (side === 'l' ? -len : len), by = SLING_Y - h / 2;
      var topx = x + (side === 'l' ? len * 0.5 : -len * 0.5), toppy = SLING_Y + h;
      guide(world, ax, ay, topx, toppy);
      guide(world, bx, by, topx, toppy);
      var sling = seg(world, ax, ay, bx, by, { kind: 'slinger', thickness: 12, restitution: 0.75 });
      game.slings.push(sling);
      (function (s) {
        s.onHit = function (ball) { game.onSlingshot(ball, s); };
      })(sling);
      return sling;
    }
    makeSlingshot(world, 300, 'l');
    makeSlingshot(world, 745, 'r');

    // ========================================================================
    // DROP-TARGET BANK ("Embers") — 3 drop targets across the mid-left. Each is
    // a bar that falls when hit; completing all three lights Embers.
    // ========================================================================
    var DT = [];
    (function () {
      var startX = 250, gap = 95, y = 820, barLen = 74;
      for (var i = 0; i < 3; i++) {
        var cx = startX + i * gap;
        var s = seg(world, cx - barLen / 2, y, cx + barLen / 2, y, { kind: 'target', thickness: 12, restitution: 0.55 });
        DT.push({ seg: s, x: cx, y: y, down: false });
        (function (t) {
          t.seg.onHit = function (ball) { game.onDropTarget(t); };
        })(DT[i]);
      }
    })();
    game.dropTargets = DT;

    // ========================================================================
    // STAND-UP TARGETS ("Wings") — a cluster of 4 spring-back targets, upper
    // right. Hit all four to light Wings.
    // ========================================================================
    var ST = [];
    (function () {
      var cols = 2, rows = 2, sx = 830, sy = 1050, gx = 90, gy = 95;
      for (var r = 0; r < rows; r++) {
        for (var c = 0; c < cols; c++) {
          var cx = sx + c * gx, cy = sy + r * gy;
          var s = seg(world, cx - 32, cy, cx + 32, cy, { kind: 'target', thickness: 12, restitution: 0.6 });
          ST.push({ seg: s, x: cx, y: cy, hit: false });
          (function (t) {
            t.seg.onHit = function (ball) { game.onStandTarget(t); };
          })(ST[ST.length - 1]);
        }
      }
    })();
    game.standTargets = ST;

    // ========================================================================
    // RIGHT LA RAMP ("Ascension") — a guide sends a ball up the right side to a
    // top lane. A crossing gate at the exit counts the run. Complete 3 runs to
    // trigger Inferno multiball.
    // ========================================================================
    guide(world, 980, 1500, 1000, 760);        // ramp up the right side
    guide(world, 1000, 760, 880, 700);         // exit toward the top lane
    var rampGate = new PA.Gate({ x: 940, y: 730 }, { x: 940, y: 650 }, {
      onPass: function (ball) { game.onRamp(); }
    });
    world.gates.push(rampGate);

    // ========================================================================
    // SPINNER LANE ("Feather Spinner") — a lane in the lower-center with two
    // dashers. Crossing gates count spins; 3 net spins light the multiplier.
    // ========================================================================
    guide(world, 520, 1720, 680, 1720);        // upper rail of spinner lane
    guide(world, 520, 1820, 680, 1820);        // lower rail (dashers sit between)
    var spinA = new PA.Gate({ x: 540, y: 1770 }, { x: 660, y: 1770 }, { onPass: function (b, d) { game.onSpinner(d); } });
    world.gates.push(spinA);

    // ========================================================================
    // HYPERSPACE — a hidden gate near the top-center. Hitting it grants an
    // extra ball.
    // ========================================================================
    var hyperspace = new PA.Gate({ x: BX - 70, y: 250 }, { x: BX + 70, y: 250 }, {
      onPass: function (ball) { game.onHyperspace(); }
    });
    world.gates.push(hyperspace);

    // ========================================================================
    // TILT WICKET — a pendulum gate near the top. A hard hit tilts the machine
    // and voids current bonuses.
    // ========================================================================
    var tiltWicket = new PA.Gate({ x: BX - 40, y: 360 }, { x: BX + 40, y: 360 }, {
      onPass: function (ball) { game.onTilt(ball); }
    });
    world.gates.push(tiltWicket);

    // ========================================================================
    // Rules controller (created up front; see above).
    // ========================================================================
    return { world: world, game: game };
  }

  // --------------------------------------------------------------------------
  // Game — all rule state and the callbacks wired into the physics engine.
  // --------------------------------------------------------------------------
  function Game(world) {
    this.world = world;
    this.score = 0;
    this.ballsInPlay = 1;
    this.maxBalls = 3;

    this.multiplier = 1;          // 1..4 scoring multiplier
    this.ascensionMeter = 0;      // runs toward Inferno (needs 3)
    this.embersLit = false;
    this.wingsLit = false;
    this.extraBallPending = false;
    this.tiltActive = false;

    this.multiballEndsAt = 0;     // sim-time until which multiball is locked on

    // drop / stand target bookkeeping (reused by rules)
    this.dropTargets = [];
    this.standTargets = [];

    this.highScore = loadHighScore();
    this.newGame();
  }

  Game.prototype.newGame = function () {
    this.score = 0;
    this.ballsInPlay = 1;
    this.multiplier = 1;
    this.ascensionMeter = 0;      // ramp runs toward Inferno (needs 3)
    this.embersCount = 0;         // drop-target hits toward Embers (needs 3)
    this.embersLit = false;
    this.wingsLit = false;
    this.extraBallPending = false;
    this.tiltActive = false;
    this.multiballEndsAt = 0;
    this.spinNet = 0;
  };

  // Score points, honoring multiplier and tilt.
  Game.prototype.addScore = function (pts) {
    if (this.tiltActive) return;
    this.score += Math.round(pts * this.multiplier);
    if (this.score > this.highScore) this.highScore = this.score;
  };

  Game.prototype.onBumper = function (ball) {
    this.addScore(1500);
  };

  // A drop target was struck: fall it, advance the Embers sequence.
  Game.prototype.onDropTarget = function (t) {
    if (t.down) return;                 // already down this ball
    t.down = true;
    this.world.segments.splice(this.world.segments.indexOf(t.seg), 1); // drop out of the way
    this.addScore(300);
    this.embersCount++;
    if (this.embersCount >= 3) {
      this.embersLit = true;
      this.addScore(50000);
      this.lightMultiplier();
      this.resetDropTargets();
    }
  };

  Game.prototype.resetDropTargets = function () {
    this.embersCount = 0;
    var world = this.world;
    this.dropTargets.forEach(function (t) {
      t.down = false;
      if (world.segments.indexOf(t.seg) === -1) world.segments.push(t.seg); // stand up again
    });
  };

  // A stand-up target was struck.
  Game.prototype.onStandTarget = function (t) {
    if (t.hit) return;
    t.hit = true;
    this.addScore(500);
    var allHit = this.standTargets.every(function (s) { return s.hit; });
    if (allHit) {
      this.wingsLit = true;
      this.addScore(25000);
      this.lightMultiplier();
      this.resetStandTargets();
    }
  };

  Game.prototype.resetStandTargets = function () {
    var self = this;
    this.standTargets.forEach(function (t) { t.hit = false; });
  };

  // Step the multiplier lamps up through 1x..4x.
  Game.prototype.lightMultiplier = function () {
    this.multiplier = Math.min(4, this.multiplier + 1);
  };

  // Right ramp run completed — third one triggers Inferno multiball.
  Game.prototype.onRamp = function () {
    this.addScore(7500);
    this.ascensionMeter++;
    if (this.ascensionMeter >= 3) {
      this.triggerMultiball();
      this.ascensionMeter = 0;
    }
  };

  // Launch extra balls for Inferno multiball — spread them into the open upper
  // field so they never wedge together in the narrow shooter lane.
  Game.prototype.triggerMultiball = function () {
    var world = this.world;
    this.ballsInPlay = 3;
    this.multiballEndsAt = world.simTime + 45;   // ~45s of multiball action
    var spots = [{ x: 380, y: 1200 }, { x: 760, y: 1050 }];
    for (var i = 0; i < spots.length; i++) {
      var b = world.addBall(spots[i].x, spots[i].y);
      b.applyImpulse(-80 + i * 160, 400);
    }
  };

  Game.prototype.onSpinner = function (dir) {
    this.spinNet = (this.spinNet || 0) + dir;
    if (Math.abs(this.spinNet) >= 3) {
      this.addScore(10000);
      this.lightMultiplier();
      this.spinNet = 0;
    }
  };

  // Slingshot pad fired: it already transferred velocity via the segment's
  // linear motion in physics; here we add a one-time spring kick and bonus.
  Game.prototype.onSlingshot = function (ball, sling) {
    sling.vx = ball.x < WIDTH / 2 ? 900 : -900;
    sling.vy = -1400;
    this.addScore(250);
  };

  Game.prototype.onHyperspace = function () {
    this.extraBallPending = true;
  };

  Game.prototype.onTilt = function (ball) {
    if (this.tiltActive) return;
    // only a fast ball counts as a tilt nudge
    if (ball.speed() > 1500) {
      this.tiltActive = true;
    }
  };

  // Called every physics step by the loop. Handles drain detection, out-lane
  // returns, multiball lockout, and slingshot spring decay.
  Game.prototype.step = function () {
    var world = this.world;

    // Slingshots: decay their spring velocity back to rest each step so the pad
    // snaps back after firing (and never kicks a resting ball).
    for (var i = 0; i < this.slings.length; i++) {
      var s = this.slings[i];
      if (s.vx || s.vy) {
        s.vx *= 0.82; s.vy *= 0.82;
        if (Math.abs(s.vx) < 5) s.vx = 0;
        if (Math.abs(s.vy) < 5) s.vy = 0;
      }
    }

    // Drain detection: any active ball that fell past the drain line between
    // the flippers is lost.
    var survivors = [];
    for (var j = 0; j < world.balls.length; j++) {
      var b = world.balls[j];
      if (!b.active) continue;
      if (b.y > DRAIN_Y && b.x > 460 && b.x < 740) {
        // drained
        this.ballsInPlay--;
        continue;
      }
      survivors.push(b);
    }
    world.balls = survivors;

    // Lane-out kickout: the shooter lane is a tight channel and a purely-vertical
    // plunger launch would rise and fall straight back down into the chamber. Fire
    // once as the ball rises through y < 2050 (still rising) and SET its velocity to a
    // fixed up-left vector so every launch power gets an identical post-kick arc
    // regardless of how fast it was travelling — an additive impulse would scale with
    // power and give wildly inconsistent escapes. Fires once per ball via _kicked so a
    // looping ball isn't re-kicked. Tuned so every launch power (0.6..1.0) escapes and
    // reaches the upper-field features.
    // Fixed post-kick velocity. The ball must clear the lane-divider tip (y=1900)
    // from where it rests on the plunger (~y2330); a kick fired any lower bounces
    // off the divider collision zone and falls straight back into the lane. 1900
    // fires just as the ball passes the tip so every power escapes identically.
    var KX = -900;
    var KY = -2400;
    var KYTHRESH = 1900;
    for (var j = world.balls.length - 1; j >= 0; j--) {
      var b = world.balls[j];
      if (!b.active || b._kicked) continue;
      // Kickout: a ball still in the shooter lane climbing back up past y=1900
      // (i.e. it escaped the lower field and is heading back down the lane) gets a
      // hard left-and-down impulse to eject it into main play toward the features,
      // rather than letting it fall straight back to the plunger forever.
      if (b.y < KYTHRESH && b.vy < 0 && b.x > 900 && b.x < 1270) {
        b.vx = KX;
        b.vy = KY;
        b._kicked = true;
      }
    }

    // Out-lane auto-return: a ball that sits idle in a side pocket below the
    // flipper line (left of the shooter lane) for too long is sent back to the
    // plunger. This position-based timer is robust against any entry path, and
    // it deliberately ignores balls already resting on the plunger (x >=
    // SHOOT_X_MIN) so they wait to be launched rather than being re-ejected.
    var LANE_IDLE = 1.0; // seconds a ball may sit in a pocket before returning
    for (var j = world.balls.length - 1; j >= 0; j--) {
      var b = world.balls[j];
      if (!b.active) continue;
      var inPocket = b.y > DRAIN_Y - 120 && b.x < SHOOT_X_MIN;
      if (inPocket) {
        if (!b._laneTimer) b._laneTimer = world.simTime;
        else if (world.simTime - b._laneTimer > LANE_IDLE && b.speed() < 400) {
          // sink the caught ball and belt a fresh one onto the plunger
          b.active = false;
          world.balls.splice(j, 1);
          var nb = world.addBall(LANE_CX, SHOOT_Y);
          nb.applyImpulse(0, -2400);
        }
      } else {
        b._laneTimer = 0;
      }
    }

    // High score persistence.
    saveHighScore(this.highScore);
  };

  Game.prototype.drainBall = function () {
    return this.ballsInPlay <= 0;
  };

  // Launch the ball in the shooter lane with the given charge (0..1).
  Game.prototype.launch = function (power) {
    var world = this.world;
    if (world.balls.length > 0) return;   // a ball is already in play
    if (power == null) power = 1;          // default to full charge
    var b = world.addBall(LANE_CX, SHOOT_Y);
    // Launch is mostly vertical with a GENTLE constant leftward drift so the ball
    // floats out of the open chamber and arcs LEFT into play. A strong kick (the
    // old reactive -1500 impulse) overshot every shot; a small initial vx lets the
    // natural rise carry it across the divider tip at any power.
    var LVX = -260;
    b.applyImpulse(LVX, -power * 2900 - 300);
    if (this.extraBallPending) {
      this.extraBallPending = false;
    }
  };

  // --------------------------------------------------------------------------
  // High score persistence (localStorage in browser, no-op under Node).
  // --------------------------------------------------------------------------
  function loadHighScore() {
    try { return parseInt(localStorage.getItem('pa_high_score') || '0', 10) || 0; }
    catch (e) { return 0; }
  }
  function saveHighScore(s) {
    try { localStorage.setItem('pa_high_score', '' + s); } catch (e) { }
  }

  // --------------------------------------------------------------------------
  // Public API.
  // --------------------------------------------------------------------------
  return {
    build: build,
    // exposed for tests / renderer
    WIDTH: WIDTH, HEIGHT: HEIGHT, BALL_R: BALL_R,
    DRAIN_Y: DRAIN_Y, SHOOT_X_MIN: SHOOT_X_MIN, SHOOT_Y: SHOOT_Y, PPM: PPM,
    shortAngle: shortAngle
  };
});
