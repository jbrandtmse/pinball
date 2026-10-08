// PLEASURE PALACE — game rules & scoring. Pure state machine (browser & Node).
// Consumes physics events, produces scoring + DMD messages + sounds, and
// kicks balls (it holds a reference to the live scene).

(function (root, factory) {
  var mod = factory();
  if (typeof module !== 'undefined' && module.exports) module.exports = mod;
  root.PP_RULES = mod;
})(typeof globalThis !== 'undefined' ? globalThis : this, function () {
  'use strict';

  var CALL = { // DMD callout vocabulary — burlesque slang, adult flavour
    sexy:    'SEXY! ONE MORE ROUND, BABY...',
    spin:    'SPIN THE BOTTLE...',
    kick:    'KICKBACK! GET UP IN THERE!',
    kbArm:   'KICKBACK READY...',
    jackpot: 'JACKPOT!! WOAH BABY!!',
    mb:      'PLEASURE TIME! MULTIBALL!',
    mbEnd:   'PLEASURE TIME OVER... WHAT A NIGHT!',
    kitten:  'SEXY KITTEN! FEELIN\' FRISKY?',
    drain:   'ALL FOUR... ER, ALL THREE!',
    tilt:    'TILT! NAUGHTY BOY!',
    tiltWarn:'EASY TIGER...',
    save:    'BALL SAVED — AGAIN!',
    newBall: 'BALL {n} — KEEP \'EM HOT',
    launch:  'PULL & RELEASE TO LAUNCH',
    bkIn:    'STRAIGHT IN! YOU SHOW-OFF',
    orchid:  'ORCHIDS FOR LADY LUCK',
    bumper:  'BOOM BABY!',
    bumper2: 'BOOBIES LOVE YOU!',
    bumper3: 'BOOTY CALL!',
    biglove: 'BIG LOVE FOR YOU!',
    sling:   'OH YEAH!',
    bankHit: 'THE LIST GROWS...',
    c:       'SENSATIONAL!',
    top:     'YOU\'RE THE SWEETEST THING ON THE TABLE!',
    over:    'GAME OVER — GO TO BED',
    hs:      'NEW HIGH SCORE!!!'
  };

  var HIGH_KEY = 'pleasurePalaceHS';

  function create(scene) {
    var R = {
      scene: scene,
      score: 0, ballsLeft: 3, ballNo: 1, multiplier: 1,
      tilt: false, mbActive: false,
      sexyLit: { S: false, E: false, X: false, Y: false },
      sexyDoneOnce: false,
      spinCount: 0, kickbackArmed: false,
      bankDown: 0,
      ballSaveT: 0, bumperChain: 0, bumperT: 0,
      slingChain: 0, slingT: 0,
      messages: [],           // {text, hold, prio} — main renders & drains
      pendingSpawns: [],      // {at, count} — lane balls waiting to drop in
      gameOver: false,
      hsTable: [],
      hsPrompt: false,
      time: 0,
      // auto-plunger state (main drives the physical plunger; rules just prompts)
      laneBallSeen: false
    };

    // ---- message helper -----------------------------------------------------
    function msg(text, hold, prio) {
      R.messages.push({ text: text, hold: hold || 2.2, prio: prio || 0 });
    }
    function drainMessages() {
      var out = R.messages; R.messages = []; return out;
    }
    R.drainMessages = drainMessages;

    function addScore(n) { R.score += n; }

    // ---- load high scores ----------------------------------------------------
    function loadHS() {
      if (typeof localStorage !== 'undefined') {
        try { R.hsTable = JSON.parse(localStorage.getItem(HIGH_KEY) || '[]'); }
        catch (e) { R.hsTable = []; }
      }
    }
    function saveHS() {
      if (typeof localStorage !== 'undefined') {
        try { localStorage.setItem(HIGH_KEY, JSON.stringify(R.hsTable)); } catch (e) {}
      }
    }
    function qualifies(s) {
      if (R.hsTable.length < 5) return true;
      var min = 1e12;
      for (var i = 0; i < R.hsTable.length; i++) min = Math.min(min, R.hsTable[i].score);
      return s > min;
    }
    function recordHS(initials) {
      R.hsTable.push({ ini: (initials || 'AAA').slice(0, 3).toUpperCase(), score: R.score });
      R.hsTable.sort(function (a, b) { return b.score - a.score; });
      R.hsTable = R.hsTable.slice(0, 5);
      saveHS();
    }
    loadHS();
    R.recordHS = recordHS;
    R.qualifies = qualifies;

    // ---- ball spawning ------------------------------------------------------
    function spawnLane(n) {
      for (var i = 0; i < n; i++) {
        scene.balls.push({ x: scene.spawn.x, y: scene.spawn.y - i * 30, vx: 0, vy: 0, r: 10.5, home: true });
      }
    }
    R.spawnLane = spawnLane;

    // ---- per-ball reset ------------------------------------------------------
    function resetBallState() {
      R.tilt = false; R.mbActive = false;
      R.spinCount = 0; R.kickbackArmed = false;
      R.sexyLit = { S: false, E: false, X: false, Y: false };
      R.sexyDoneOnce = false;
      R.bankDown = 0;
      R.bumperChain = R.slingChain = 0;
      R.ballSaveT = 0;
      // re-raise any dropped bank targets at the start of each ball
      resetBank();
    }

    function resetBank() {
      for (var i = 0; i < scene.items.length; i++) {
        var it = scene.items[i];
        if (/^T[1-4]$/.test(it.label)) it.dead = false;
      }
      R.bankDown = 0;
    }
    R.resetBank = resetBank;

    // ---- start ---------------------------------------------------------------
    function startGame() {
      R.score = 0; R.ballsLeft = 3; R.ballNo = 1; R.multiplier = 1;
      R.gameOver = false;
      R.hsPrompt = false; R.pendingSpawns = [];
      resetBallState();
      spawnLane(1);
      msg('WELCOME TO PLEASURE PALACE', 2.6, 1);
      msg(CALL.launch, 3.4); // persist until launch
    }
    R.startGame = startGame;

    function startBall(n) {
      resetBallState();
      spawnLane(1);
      msg(CALL.newBall.replace('{n}', n), 2.4, 1);
      msg(CALL.launch, 3.4);
    }
    R.startBall = startBall;

    // ---- plunger / kickback helpers ------------------------------------------
    function ballsInLane() {
      var out = [];
      for (var i = 0; i < scene.balls.length; i++) {
        var b = scene.balls[i];
        if (b.x > scene.lane.left + 2 && b.x < scene.lane.right - 2 && b.y > 620) out.push(b);
      }
      return out;
    }
    function firePlunger(power) {
      var lane = ballsInLane();
      for (var i = 0; i < lane.length; i++) {
        var b = lane[i];
        if (b.y > scene.spawn.y - 40) {   // only the ball(s) sitting at the plunger
          b.vy = -(760 + 800 * power);
          // slight random leftward vane so the shot isn't a perfect
          // vertical re-loop; real launchers are never perfectly straight
          b.vx = -(20 + Math.random() * 90);
          b.home = false;
          msg(CALL.bkIn, 1.6);
        }
      }
    }
    R.firePlunger = firePlunger;

    // ---- tilt from nudging ---------------------------------------------------
    var nudgeTimes = [];
    function nudge(dx, dy) {
      if (R.tilt || R.gameOver) return;
      for (var i = 0; i < scene.balls.length; i++) {
        var b = scene.balls[i];
        b.vx += dx; b.vy += dy;
      }
      var now = R.time;
      nudgeTimes.push(now);
      while (nudgeTimes.length > 0 && now - nudgeTimes[0] > 1.1) nudgeTimes.shift();
      if (nudgeTimes.length >= 3) {
        R.tilt = true;
        msg(CALL.tilt, 3, 1);
        nudgeTimes = [];
      } else {
        msg(CALL.tiltWarn, 1.4);
      }
    }
    R.nudge = nudge;

    // ---- event handling ------------------------------------------------------
    function handle(evts) {
      var out = { sounds: [] };
      for (var i = 0; i < evts.length; i++) {
        var e = evts[i];
        if (e.type === 'bumper') {
          if (R.tilt) continue;
          if (R.bumperT > 0) R.bumperChain++; else R.bumperChain = 1;
          R.bumperT = 1.6;
          var pts = 450 * R.multiplier + 100 * R.bumperChain;
          addScore(pts);
          if (R.mbActive) msg(CALL.jackpot + '  ' + fmt(pts), 1.4, 1);
          else msg(['BOOM BABY!', 'BOOBIES LOVE YOU!', 'BOOTY CALL!', 'BIG LOVE FOR YOU!'][Math.min(R.bumperChain, 3) - 1] || CALL.bumper, 1.3);
          out.sounds.push({ name: 'bumper', pitch: Math.min(6, R.bumperChain), x: 0 });
        } else if (e.type === 'sling') {
          if (R.tilt) continue;
          if (R.slingT > 0) R.slingChain++; else R.slingChain = 1;
          R.slingT = 1.3;
          addScore((150 + 25 * R.slingChain) * R.multiplier);
          msg(CALL.sling, 1.1);
          out.sounds.push({ name: 'sling', pitch: Math.min(5, R.slingChain), x: 0 });
        } else if (e.type === 'spin') {
          if (R.tilt) continue;
          addScore(250 * R.multiplier);
          R.spinCount++;
          if (R.mbActive) msg('SPINNING FOR JACKPOT...', 1.2);
          if (R.spinCount === 2 && !R.kickbackArmed) {
            R.kickbackArmed = true;
            msg(CALL.kbArm, 1.8, 1);
          }
          out.sounds.push({ name: 'spin', pitch: 0 });
        } else if (e.type === 'roll') {
          if (R.tilt) continue;
          var lab = e.label;
          if (lab === 'S' || lab === 'E' || lab === 'X' || lab === 'Y') {
            if (!R.sexyLit[lab]) {
              R.sexyLit[lab] = true;
              addScore(500 * R.multiplier);
              var lit = 0, order = 'SEXY';
              var any = false;
              for (var k = 0; k < 4; k++) {
                if (R.sexyLit[order[k]]) { lit++; any = true; }
              }
              if (lit === 4 && any) {
                // SEXY complete
                R.multiplier = Math.min(6, R.multiplier + 1);
                R.ballSaveT = 8;
                if (!R.sexyDoneOnce) {
                  R.sexyDoneOnce = true;
                  if (R.ballsLeft < 7) { R.ballsLeft++; msg(CALL.sexy, 3, 2); }
                  else msg('SEXY! SENSATIONAL!', 2.4, 2);
                } else {
                  msg('SEXY AGAIN! x' + R.multiplier, 2.2, 2);
                }
                out.sounds.push({ name: 'reward', pitch: 0 });
              } else {
                msg(pick(['LANE LIT!', 'NICE ROLL...', 'HOT STUFF!']) , 1.0);
              }
            }
          } else if (lab === 'INL' || lab === 'INR') {
            addScore(150 * R.multiplier);
            msg('INLANE — SLIDE!', 1.0);
          } else if (lab === 'OUTL') {
            if (R.kickbackArmed) {
              // kick the ball out of the left outlane with gusto
              var kb = null, best = 1e9;
              for (var j = 0; j < scene.balls.length; j++) {
                var b2 = scene.balls[j];
                if (b2.x < 80 && b2.y > 950 && b2.y < best) { best = b2.y; kb = b2; }
              }
              if (kb && kb.y < 1070) {
                kb.vy = -1520; kb.vx = 180;
                R.kickbackArmed = false;
                addScore(500 * R.multiplier);
                msg(CALL.kick, 2, 1);
                out.sounds.push({ name: 'kick', pitch: 0 });
              }
            }
          }
        } else if (e.type === 'target') {
          // handled below via wall events? (targets are walls; see wall pass)
        } else if (e.type === 'drain') {
          out.sounds.push({ name: 'drain', pitch: 0 });
        }
      }
      // wall hits with target labels (bank + kitten)
      for (i = 0; i < evts.length; i++) {
        var w = evts[i];
        if (w.type === 'wallHit' && !R.tilt) {
          if (/^T[1-4]$/.test(w.label)) {
            // count unique dropped targets
            var idx = parseInt(w.label[1], 10);
            var seg = findTarget(idx);
            if (seg && !seg.dead) {
              // target drops when struck
              seg.dead = true;
              R.bankDown++;
              addScore(750 * R.multiplier);
              out.sounds.push({ name: 'target', pitch: 0 });
              if (R.bankDown >= 4) {
                if (R.mbActive) {
                  addScore(25000 * R.multiplier);
                  msg(CALL.jackpot, 3, 2);
                  out.sounds.push({ name: 'jackpot', pitch: 0 });
                  resetBank();
                  if (scene.balls.length < 5) {
                    R.pendingSpawns.push({ at: R.time + 0.8, count: 1 });
                  }
                } else {
                  msg(CALL.mb, 3, 2);
                  out.sounds.push({ name: 'jackpot', pitch: 0 });
                  R.mbActive = true;
                  R.ballSaveT = 10;
                  resetBank();
                  R.pendingSpawns.push({ at: R.time + 0.6, count: 2 });
                }
              } else {
                msg(CALL.bankHit, 1.0);
              }
            }
          } else if (w.label === 'KITTEN') {
            addScore(1000 * R.multiplier);
            msg(CALL.kitten, 1.8, 1);
            out.sounds.push({ name: 'target', pitch: 0 });
          }
        }
      }
      return out;
    }
    R.handle = handle;

    var targetSegs = {};
    function findTarget(n) {
      var label = 'T' + n;
      for (var i = 0; i < scene.items.length; i++) {
        if (scene.items[i].label === label) return scene.items[i];
      }
      return null;
    }

    // ---- tick ------------------------------------------------------------------
    function tick(dt) {
      R.time += dt;
      if (R.ballSaveT > 0) R.ballSaveT -= dt;
      if (R.bumperT > 0) R.bumperT -= dt; else R.bumperChain = 0;
      if (R.slingT > 0) R.slingT -= dt; else R.slingChain = 0;
      var acts = [];
      // release pending lane balls (after MB etc.)
      for (var i = R.pendingSpawns.length - 1; i >= 0; i--) {
        var ps = R.pendingSpawns[i];
        if (R.time >= ps.at) {
          spawnLane(ps.count);
          R.pendingSpawns.splice(i, 1);
        }
      }
      // ball accounting: count live balls; detect end-of-ball / ball-save.
      // A queued pendingSpawn means a ball is still on its way in — don't
      // end the ball (or end PLEASURE TIME) while the queue is outstanding.
      var n = scene.balls.length;
      if (n === 0 && !R.gameOver && R.pendingSpawns.length === 0) {
        if (R.ballSaveT > 0) {
          // saved! serve a fresh ball without burning one
          R.pendingSpawns.push({ at: R.time + 1.1, count: 1 });
          R.ballSaveT = 0;
          msg(CALL.save, 2.2, 1);
        } else {
          R.ballsLeft--;
          if (R.ballsLeft <= 0) {
            R.gameOver = true;
            if (qualifies(R.score)) {
              R.hsPrompt = true;
              msg(CALL.hs, 4, 2);
            } else {
              msg(CALL.over, 3, 2);
            }
          } else {
            R.ballNo++;
            startBall(R.ballNo);
          }
        }
      } else if (n === 1 && R.mbActive && R.pendingSpawns.length === 0) {
        R.mbActive = false;
        msg(CALL.mbEnd, 2.4, 1);
      }
      // auto-launch: fire any ball parked at the bottom of the shooter
      // lane (whether or not it was originally placed there — balls that
      // roll back down the lane count too)
      var anyParked = false;
      for (var q = 0; q < scene.balls.length; q++) {
        var bq = scene.balls[q];
        if (bq.x > scene.lane.left && bq.y > scene.spawn.y - 40 &&
            Math.hypot(bq.vx, bq.vy) < 80) { anyParked = true; break; }
      }
      if (anyParked) {
        if (!R._laneWait) R._laneWait = 0;
        R._laneWait += dt;
        if (R._laneWait > 3.0) {
          firePlunger(0.55 + Math.random() * 0.4);
          R._laneWait = 0;
        }
      } else { R._laneWait = 0; }
      // auto-nudge a stuck single ball occasionally
      if (n === 1 && !R.gameOver) {
        var b = scene.balls[0];
        if (Math.hypot(b.vx, b.vy) < 14) {
          if (!b._stuck) b._stuck = 0;
          b._stuck += dt;
          if (b._stuck > 7 && b.x > scene.lane.left) { /* parked in lane, plunger handles */ }
          if (b._stuck > 9) { nudge((Math.random() - 0.5) * 260, 120); b._stuck = 0; }
        } else b._stuck = 0;
      }
      // ball age cap: any ball alive past 90s is dropped down the
      // left outlane (rare; guarantees the game always terminates)
      for (var g = 0; g < scene.balls.length; g++) {
        var gb = scene.balls[g];
        gb._age = (gb._age || 0) + dt;
        if (gb._age > 90) {
          gb.x = 50; gb.y = 1074; gb.vx = 0; gb.vy = 780; gb._age = 0;
          gb._stuck = 0;
        }
      }
      return acts;
    }
    R.tick = tick;

    // plunger release from main
    R.plungerRelease = function (power) {
      var had = ballsInLane().length > 0 && scene.balls.some(function (b) { return b.home; });
      firePlunger(power);
      return had;
    };

    function fmt(n) {
      return String(n).replace(/\B(?=(\d{3})+(?!\d))/g, ',');
    }
    var PILOTS = ['WANNA PLAY?', 'COME HITHER...', 'FEELIN\' LUCKY?', 'STEP RIGHT UP', 'DISCO SMUT', 'NAUGHTY NAUGHTY', 'CHA CHING', 'OH BABY!'];
    function pick(a) { return a[Math.floor(Math.random() * a.length)]; }

    return R;
  }

  return { create: create, CALL: CALL };
});
