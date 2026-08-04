/* DRAGON'S KEEP — rules engine (WPC-style). Node-safe.
 * States: attract -> playing -> (bonus/match/hiscore) -> attract
 * Emits: sfxQ (sound names), fxQ (renderer effects), lampState, DMD scenes.
 */
"use strict";
(function (g) {
  const DK = g.DK; const C = DK.C; const M = DK.M; const SC = C.SC;

  const QUESTS = [
    { name: "JOUST", goal: "SHOOT THE ORBITS", need: 4, val: 600000 },
    { name: "RESCUE THE DAMSEL", goal: "SHOOT THE RAMPS", need: 3, val: 500000 },
    { name: "TROLL WAR", goal: "BASH THE TROLLS", need: 5, val: SC.TROLL_HIT },
    { name: "CATAPULT SIEGE", goal: "SHOOT THE CATAPULT", need: 2, val: 800000 },
    { name: "DRAGON HUNT", goal: "FOLLOW THE FLAMES", need: 3, val: 900000 }
  ];
  const HUNT_SHOTS = ["orbitL", "rampL", "catapult", "rampR", "orbitR"];
  const HUNT_LAMPS = ["aOrbitL", "aRampL", "aCata", "aRampR", "aOrbitR"];
  const WIZ_SHOTS = ["orbitL", "rampL", "catapult", "castle", "rampR", "orbitR", "scoop", "drops"];
  const SHOT_LAMP = {
    orbitL: "aOrbitL", rampL: "aRampL", catapult: "aCata", castle: "aCastle",
    rampR: "aRampR", orbitR: "aOrbitR", scoop: "aScoop", drops: "drops"
  };
  const DEFAULT_HS = {
    gc: { ini: "MER", score: 120000000 },
    list: [
      { ini: "ART", score: 90000000 }, { ini: "LAN", score: 70000000 },
      { ini: "GWN", score: 50000000 }, { ini: "PCV", score: 35000000 }
    ]
  };

  function newPlayer() {
    return {
      score: 0, bonusBase: 0, bonusX: 1,
      castles: 0, castleStage: 0, castleHits: 0, locks: 0,
      quests: [false, false, false, false, false],
      gateHits: 0, pops: 0, spins: 0, ramps: 0, orbits: 0, catapults: 0,
      dropBanks: 0, dragons: [false, false], kickback: true,
      keyLit: [false, false, false],
      ebLit: false, ebQuestGiven: false, ebBankGiven: false,
      extraBalls: 0, replayGiven: false,
      mbPlayed: 0, wizardDone: 0,
      slams: 0, cataMBLit: false
    };
  }

  class Game {
    constructor(opts) {
      opts = opts || {};
      this.world = opts.world;
      this.layout = opts.layout;
      this.rng = opts.rng || Math.random;
      this.storage = opts.storage || null;
      this.dmd = new DK.DMD();

      this.state = "attract";
      this.time = 0;
      this.attractT = 0;
      this.players = [];
      this.cur = 0;
      this.ballNum = 0;
      this.credits = 0;
      this.freePlay = true;

      this.sfxQ = [];
      this.fxQ = [];
      this.lampState = {};
      this.musicMode = "attract";

      // per-ball transient
      this.ballSave = 0;
      this.ballSaveUsed = false;
      this.tilt = false;
      this.tiltBob = 0;
      this.tiltWarned = 0;
      this.quest = null;
      this.mb = null;
      this.hurry = null;
      this.combo = { last: null, t: -9, n: 0 };
      this.skill = null;         // {lane, t} armed skill shot
      this.superSkill = false;
      this.superSkillT = 0;
      this._dropReset = -1;
      this.trollsUp = false;
      this.inlane2x = 0;         // ramp 2x timer
      this.plunger = { held: false, q: 0, fireT: 0 };
      this.autoPlunge = 0;       // countdown to auto fire
      this.serveQ = 0;           // pending serves
      this.serveAuto = false;
      this.trough = C.BALLS_TOTAL;
      this.lockedBalls = [];
      this.holdQ = [];           // {ball, t, fn} scheduled ejects
      this.spinner = { pos: 0, vel: 0, acc: 0 };
      this.lastSwitchT = 0;
      this.searches = 0;
      this.flipEnabled = true;
      this.paused = false;

      // toys / anim state for renderer
      this.castleAnim = { bridge: 0, gate: 0, shake: 0, boom: 0, flag: 0 };
      this.trollAnim = [0, 0];
      this.dropAnim = [0, 0, 0];  // 1 = down
      this.slingAnim = [0, 0];
      this.popAnim = [0, 0, 0];
      this.kickbackAnim = 0;
      this.catapultAnim = 0;
      this.giLevel = 1;
      this.flashers = {};        // id -> t

      this.hsTable = this.loadScores();
      this.hs = null;            // initials entry state
      this.match = null;
      this.endFlow = 0;
      this.stats = { drains: 0, launches: 0, rescues: 0, switches: 0, sparks: 0 };
      this.speed = 1;

      // precompute ramp runs
      for (const key of ["left", "right"]) {
        const r = this.layout.ramps[key];
        r.cum = [0]; r.crest = 0; let hMax = -1;
        for (let i = 1; i < r.path.length; i++) {
          const a = r.path[i - 1], b = r.path[i];
          r.cum.push(r.cum[i - 1] + Math.hypot(b[0] - a[0], b[1] - a[1]));
          if (b[2] > hMax) { hMax = b[2]; r.crest = r.cum[i]; }
        }
        r.total = r.cum[r.cum.length - 1];
      }
      this.setAttractLamps();
    }

    // ------------- persistence -------------
    loadScores() {
      try {
        if (this.storage) {
          const d = this.storage.load();
          if (d && d.gc && d.list && d.list.length === 4) return d;
        }
      } catch (e) { /* fresh */ }
      return JSON.parse(JSON.stringify(DEFAULT_HS));
    }
    saveScores() {
      try { if (this.storage) this.storage.save(this.hsTable); } catch (e) { /* ignore */ }
    }

    // ------------- utils -------------
    sfx(name, p) { this.sfxQ.push(p ? Object.assign({ name }, p) : { name }); }
    fx(type, o) { this.fxQ.push(Object.assign({ type }, o || {})); }
    lamp(id, mode) { this.lampState[id] = mode; }
    flash(id, t) { this.flashers[id] = t || 0.5; }
    get p() { return this.players[this.cur] || null; }
    score(n) {
      const p = this.p; if (!p || this.tilt) return;
      p.score += n * (this.inlane2x > 0 && this._scoring2x ? 2 : 1);
    }
    bonus(n) { const p = this.p; if (p) p.bonusBase += n; }
    ballsInPlay() {
      let n = 0;
      for (const b of this.world.balls) if (b.active && !b.locked) n++;
      return n;
    }
    ballInShooter() {
      for (const b of this.world.balls)
        if (b.active && !b.held && b.x > C.SHOOT_X0 && b.y > 980) return b;
      return null;
    }

    // ------------- input actions -------------
    action(name, down) {
      if (name === "pause" && down) { this.paused = !this.paused; return; }
      if (this.paused) return;
      switch (name) {
        case "flipL": case "flipR": {
          const f = name === "flipL" ? this.layout.flip.L : this.layout.flip.R;
          if (this.state === "playing" && !this.tilt && this.flipEnabled) {
            if (down && !f.up) this.sfx("flip");
            if (!down && f.up) this.sfx("flipRel");
            f.up = down;
          } else f.up = false;
          if (down && this.state === "playing") this.laneChange(name === "flipL" ? -1 : 1);
          if (down && this.state === "hiscore") this.hsCycle(name === "flipL" ? -1 : 1);
          break;
        }
        case "plunge":
          if (this.state === "hiscore") { if (down) this.hsCommit(); break; }
          if (down) {
            if (this.state === "playing" && this.ballInShooter()) {
              this.plunger.held = true;
            }
          } else if (this.plunger.held) {
            this.firePlunger(Math.max(this.plunger.q, C.PLUNGE_FLOOR));
          }
          break;
        case "start":
          if (down) this.pressStart();
          break;
        case "coin":
          if (down) { this.credits++; this.sfx("coin"); this.dmdBanner("CREDITS " + this.credits, "", 1.2, 2); }
          break;
        case "nudgeL": if (down) this.nudge(-1, 0); break;
        case "nudgeR": if (down) this.nudge(1, 0); break;
        case "nudgeU": if (down) this.nudge(0, -1); break;
      }
    }
    typeChar(ch) {
      if (this.state !== "hiscore" || !this.hs) return;
      ch = ch.toUpperCase();
      if (ch === "BACKSPACE") { this.hs.ini = this.hs.ini.slice(0, -1); return; }
      if (!/^[A-Z ]$/.test(ch)) return;
      if (this.hs.ini.length < 3) {
        this.hs.ini += ch; this.sfx("key");
        if (this.hs.ini.length === 3) this.hsFinish();
      }
    }
    nudge(dx, dy) {
      if (this.state !== "playing" || this.tilt) return;
      this.world.nudge(dx * 110, dy * 150 - 30);
      this.fx("shake", { x: dx * 5, y: dy * 6 });
      this.sfx("nudge");
      this.tiltBob += 1.0;
      if (this.tiltBob >= C.TILT_WARNINGS) this.doTilt();
      else if (this.tiltBob >= C.TILT_WARNINGS - 1.05) {
        this.tiltWarned++;
        this.sfx("tiltWarn");
        this.dmd.play((d, t) => { if (Math.floor(t * 8) % 2 === 0) d.textC("DANGER", 12, { scale: 2 }); }, 0.9, 5);
      }
    }
    doTilt() {
      if (this.tilt) return;
      this.tilt = true;
      this.sfx("tilt");
      this.layout.flip.L.up = this.layout.flip.R.up = false;
      this.quest = null; this.hurry = null;
      this.dmd.play((d, t) => { d.textC("TILT", 9, { scale: 2 }); }, 3.5, 8);
      this.fx("shake", { x: 8, y: 10 });
    }

    pressStart() {
      if (this.state === "attract") {
        if (!this.freePlay && this.credits < 1) { this.dmdBanner("INSERT COIN", "", 1.2, 3); return; }
        if (!this.freePlay) this.credits--;
        this.startGame();
      } else if (this.state === "playing" && this.ballNum === 1 && this.cur === 0 &&
                 this.players.length < 4 && !this._p1Done) {
        if (!this.freePlay && this.credits < 1) return;
        if (!this.freePlay) this.credits--;
        this.players.push(newPlayer());
        this.sfx("start");
        this.dmdBanner("PLAYER " + this.players.length, "GOOD LUCK", 1.4, 3);
      } else if (this.state === "hiscore") {
        this.hsCommit();
      }
    }

    // ------------- game flow -------------
    startGame() {
      this.players = [newPlayer()];
      this.cur = 0; this.ballNum = 1;
      this.state = "playing";
      this._p1Done = false;
      this.musicMode = "main";
      this.sfx("start");
      this.dmd.clearScenes();
      this.dmdBanner("DRAGONS KEEP", "STORM THE CASTLE", 2.2, 3);
      this.resetBallState();
      this.applyPlayerToys();
      this.serve(false);
    }

    resetBallState() {
      this.plunger.held = false; this.plunger.q = 0;
      this.ballSave = 0; this.ballSaveUsed = false;
      this.tilt = false; this.tiltBob = 0;
      this.quest = null; this.hurry = null; this.mb = null;
      this.combo = { last: null, t: -9, n: 0 };
      this.skill = null; this.superSkill = false;
      this.inlane2x = 0;
      this.searches = 0; this.lastSwitchT = this.time;
      this.trollsSet(false);
      const p = this.p;
      if (p) { p.bonusBase = 0; p.bonusX = 1; }
      this.updateLamps();
    }

    applyPlayerToys() {
      // restore physical castle to current player's progress
      const p = this.p; if (!p) return;
      const open = p.castleStage >= 2;
      this.layout.parts.gate.enabled = !open && !this.wizardReady();
      this.castleAnim.bridge = p.castleStage >= 1 ? 1 : 0;
      this.castleAnim.gate = open ? 1 : 0;
      for (let i = 0; i < 3; i++) {
        this.layout.parts["drop" + i].enabled = true;
        this.dropAnim[i] = 0;
      }
      this.updateLamps();
    }

    serve(auto) {
      this.serveQ++;
      this.serveAuto = auto;
    }
    trueServe() {
      if (this.trough <= 0) return;
      if (this.ballInShooter()) return; // wait until lane clear
      this.trough--;
      const b = this.world.addBall(C.SHOOT_CX, 1042);
      b.vy = -20;
      this.serveQ--;
      this.sfx("serve");
      if (this.serveAuto || this.mb) this.autoPlunge = 1.0;
      // arm skill shot lane
      if (!this.mb) {
        const lane = Math.floor(this.rng() * 3);
        this.skill = { lane, t: 0, launched: false };
      }
      this.updateLamps();
    }
    firePlunger(q) {
      this.plunger.held = false; this.plunger.q = 0;
      const b = this.ballInShooter();
      if (!b) return;
      const v = C.PLUNGE_MIN + (C.PLUNGE_MAX - C.PLUNGE_MIN) * M.clamp(q, 0, 1);
      b.vy = -v; b.vx = 0;
      this.plunger.fireT = 0.2;
      this.superSkill = this.layout.flip.L.up; // hold left flipper = super skill
      this.sfx("launch", { q });
      this.stats.launches++;
    }

    // ------------- per-frame update -------------
    update(dt) {
      if (this.paused) return;
      dt *= this.speed;
      this.time += dt;

      // physics
      if (this.state === "playing" || this.state === "bonus") {
        this.world.update(dt, (e) => this.onEvent(e));
        // out-of-bounds safety net
        for (const b of this.world.balls.slice()) {
          if (!b.active || b.held || b.locked || b.onRamp || b.toss) continue;
          if (!isFinite(b.x) || !isFinite(b.y) || b.y > 1140 || b.y < -30 || b.x < -20 || b.x > 560) {
            this.stats.rescues++;
            this.stats.oob = (this.stats.oob || 0) + 1;
            this.onDrain(b);
          }
        }
      }
      this.stepRamps(dt);
      this.stepToss(dt);
      this.stepHolds(dt);

      // plunger
      if (this.plunger.held) this.plunger.q = M.clamp(this.plunger.q + dt / C.PLUNGE_CHARGE_T, 0, 1);
      if (this.plunger.fireT > 0) this.plunger.fireT -= dt;
      if (this.autoPlunge > 0) {
        this.autoPlunge -= dt;
        if (this.autoPlunge <= 0 && this.ballInShooter()) {
          this.firePlunger(0.9 + this.rng() * 0.08);
        } else if (this.autoPlunge <= 0) this.autoPlunge = 0.4;
      }
      if (this.serveQ > 0) this.trueServe();

      // timers
      this.tiltBob = Math.max(0, this.tiltBob - 0.45 * dt);
      if (this.ballSave > 0) {
        this.ballSave -= dt;
        this.lamp("shootAgain", this.ballSave > 3 ? 1 : 3);
      } else this.lamp("shootAgain", 0);
      if (this.inlane2x > 0) this.inlane2x -= dt;
      if (this.castleAnim.shake > 0) this.castleAnim.shake -= dt;
      if (this.castleAnim.boom > 0) this.castleAnim.boom -= dt;
      if (this.kickbackAnim > 0) this.kickbackAnim -= dt;
      if (this.catapultAnim > 0) this.catapultAnim -= dt;
      for (let i = 0; i < 2; i++) this.slingAnim[i] = Math.max(0, this.slingAnim[i] - dt * 6);
      for (let i = 0; i < 3; i++) this.popAnim[i] = Math.max(0, this.popAnim[i] - dt * 5);
      for (const k in this.flashers) {
        this.flashers[k] -= dt;
        if (this.flashers[k] <= 0) delete this.flashers[k];
      }
      this.castleAnim.flag += dt;
      // trolls rise/fall anim
      for (let i = 0; i < 2; i++) {
        const want = this.trollsUp ? 1 : 0;
        this.trollAnim[i] += (want - this.trollAnim[i]) * Math.min(1, dt * 8);
      }

      // skill shot timeout
      if (this.skill && this.skill.launched) {
        this.skill.t += dt;
        if (this.skill.t > 4.5) this.skill = null;
      }
      // super skill window
      if (this.superSkillT > 0) this.superSkillT -= dt;

      // spinner
      const sp = this.spinner;
      if (sp.vel > 0.05) {
        sp.pos += sp.vel * dt;
        while (sp.pos >= sp.nextTick) {
          sp.nextTick += 0.5;
          this.score(SC.SPINNER); this.bonus(3000);
          if (this.p) this.p.spins++;
          this.sfx("spin");
        }
        sp.vel *= Math.max(0, 1 - 1.9 * dt); sp.vel -= 0.35 * dt;
      } else sp.vel = Math.max(0, sp.vel);

      // quest timer
      if (this.quest) {
        this.quest.t -= dt;
        if (this.quest.idx === 4) {
          this.quest.rove -= dt;
          if (this.quest.rove <= 0) {
            this.quest.rove = 4.5;
            this.quest.shot = (this.quest.shot + 1) % HUNT_SHOTS.length;
            this.updateLamps();
          }
        }
        if (this.quest.t <= 0) {
          this.dmdBanner("QUEST FAILED", "", 1.5, 4);
          this.sfx("questFail");
          this.quest = null;
          this.trollsSet(false);
          this.updateLamps();
        }
      }
      // hurry-up
      if (this.hurry) {
        this.hurry.t += dt;
        this.hurry.val = Math.max(250000, SC.HURRYUP_MAX - this.hurry.t * 190000);
        if (this.hurry.t > 13) { this.hurry = null; this.updateLamps(); }
      }
      // multiball end check
      if (this.mb && this.mb.started > 0.5 && this.ballsInPlay() <= 1 && this.serveQ === 0) {
        this.endMultiball();
      }
      if (this.mb) this.mb.started += dt;

      // ball search
      if (this.state === "playing") this.ballSearch(dt);

      // end-of-ball flow
      if (this.endFlow > 0) {
        this.endFlow -= dt;
        if (this.endFlow <= 0) this.endFlowStep();
      }

      // attract
      if (this.state === "attract") this.attractT += dt;

      // DMD
      this.dmd.update(dt, this, (d, gm) => this.defaultScene(d, gm));
      this.updateContextLamps();
    }

    // ------------- physics event dispatch -------------
    onEvent(e) {
      if (e.t === "ballhit") { this.sfx("ballhit", { v: e.speed }); return; }
      if (!e.id) return;
      const id = e.id;
      // passive guides and flippers aren't switches: contacts with them must
      // not reset ball search (a wedged ball touches them constantly)
      if (!Game.PASSIVE.has(id)) {
        this.lastSwitchT = this.time; this.searches = 0;
        this.stats.switches++;
      }

      if (e.t === "hit") {
        if (id === "slingL" || id === "slingR") return this.hitSling(id, e);
        if (id.startsWith("pop")) return this.hitPop(+id[3], e);
        if (id === "gate") return this.hitGate(e);
        if (id.startsWith("troll")) return this.hitTroll(+id[5], e);
        if (id.startsWith("drop")) return this.hitDrop(+id[4], e);
        if (id.startsWith("dragon")) return this.hitDragon(+id[6], e);
        if (id === "arch" || id === "shooterWall") { if (e.speed > 350) this.sfx("thud", { v: e.speed }); return; }
        return;
      }
      if (e.t === "sense") {
        if (id.startsWith("key")) return this.senseKey(+id[3], e);
        if (id === "lock") return this.senseLock(e);
        if (id === "catapult") return this.senseCatapult(e);
        if (id === "scoop") return this.senseScoop(e);
        return;
      }
      if (e.t === "cross") {
        if (id === "drain") return this.onDrain(e.ball);
        if (id === "launched") { if (e.dir < 0) this.onLaunched(); return; }
        if (id === "spinner") return this.onSpinner(e);
        if (id === "orbitL") { if (e.dir < 0) this.registerShot("orbitL"); return; }
        if (id === "orbitR") { if (e.dir < 0) this.registerShot("orbitR"); return; }
        if (id === "lrampEnter") { if (e.dir < 0 && e.speed >= 200) this.captureRamp(e.ball, "left", e.speed); return; }
        if (id === "rrampEnter") { if (e.dir < 0 && e.speed >= 200) this.captureRamp(e.ball, "right", e.speed); return; }
        if (id === "inL" || id === "inR") { if (e.dir > 0) this.onInlane(id); return; }
        if (id === "outL" || id === "outR") { if (e.dir > 0) this.onOutlane(id); return; }
        if (id === "kickback") { if (e.dir > 0) this.onKickback(e.ball); return; }
        return;
      }
    }

    onLaunched() {
      if (this.skill && !this.skill.launched) {
        this.skill.launched = true; this.skill.t = 0;
        if (this.superSkill) { this.superSkillT = 5.5; this.skill = null; }
      }
      if (!this.ballSaveUsed && this.ballSave <= 0) {
        this.ballSave = this.mb ? C.MB_SAVE_T : C.BALL_SAVE_T;
      }
      this.sfx("launched");
    }

    hitSling(id, e) {
      const i = id === "slingL" ? 0 : 1;
      if (this.tilt) return;
      const now = this.time;
      this._slingCd = this._slingCd || [0, 0];
      if (now - this._slingCd[i] < 0.12) return;
      this._slingCd[i] = now;
      const b = e.ball;
      const k = 830 + this.rng() * 190;
      b.vx = e.nx * k; b.vy = e.ny * k - 170;
      this.slingAnim[i] = 1;
      this.score(SC.SLING); this.bonus(2000);
      this.sfx("sling");
      this.fx("spark", { x: b.x, y: b.y, n: 6, c: "gold" });
    }

    hitPop(i, e) {
      if (this.tilt) return;
      const now = this.time;
      this._popCd = this._popCd || [0, 0, 0];
      if (now - this._popCd[i] < 0.09) return;
      this._popCd[i] = now;
      const b = e.ball, P = this.layout.meta.pops[i];
      const ang = Math.atan2(b.y - P[1], b.x - P[0]) + (this.rng() - 0.5) * 0.3;
      const k = 1000 + this.rng() * 230;
      b.vx = Math.cos(ang) * k; b.vy = Math.sin(ang) * k;
      this.popAnim[i] = 1;
      const p = this.p;
      if (p) {
        p.pops++;
        this.score(SC.POP); this.bonus(8000);
        if (p.pops === 40) { this.score(SC.PEASANT); this.dmdBanner("PEASANT REVOLT", "1,500,000", 1.8, 4); this.sfx("questWin"); }
      }
      this.sfx("pop");
      this.fx("spark", { x: b.x, y: b.y, n: 4, c: "blue" });
    }

    onSpinner(e) {
      const sp = this.spinner;
      if (sp.vel <= 0.05) { sp.pos = 0; sp.nextTick = 0.5; }
      sp.vel = Math.min(15, sp.vel + Math.abs(e.speed) / 260 + 1.2);
    }

    senseKey(i, e) {
      const p = this.p; if (!p) return;
      // skill shot?
      if (this.skill && this.skill.launched) {
        if (i === this.skill.lane) {
          const n = (p.skillsMade = (p.skillsMade || 0) + 1);
          const val = SC.SKILL + SC.SKILL_STEP * (n - 1);
          this.score(val); this.bonus(50000);
          p.bonusX = Math.min(8, p.bonusX + 2);
          this.sfx("skill");
          this.fx("flash", {});
          this.dmdBanner("SKILL SHOT", M.fmtScore(val), 1.8, 5);
        }
        this.skill = null;
      }
      if (!p.keyLit[i]) {
        p.keyLit[i] = true; this.score(SC.ROLLOVER); this.bonus(10000); this.sfx("rollover");
      } else { this.score(25000); this.sfx("rolloverDim"); }
      if (p.keyLit.every(Boolean)) {
        p.keyLit = [false, false, false];
        p.bonusX = Math.min(8, p.bonusX + 1);
        this.sfx("bonusX");
        this.dmdBanner("BONUS " + p.bonusX + "x", "", 1.3, 3);
      }
      this.updateLamps();
    }
    laneChange(dir) {
      const p = this.p; if (!p) return;
      const k = p.keyLit;
      p.keyLit = dir > 0 ? [k[2], k[0], k[1]] : [k[1], k[2], k[0]];
      this.updateLamps();
    }

    onInlane(id) {
      if (this.tilt) return;
      this.score(SC.INLANE); this.bonus(10000);
      this.inlane2x = 6; this._scoring2x = false;
      this.sfx("inlane");
      this.flash(id === "inL" ? "inL" : "inR", 1.2);
    }
    onOutlane(id) {
      if (this.tilt) return;
      this.score(SC.OUTLANE); this.bonus(15000);
      if (id === "outR" || !this.p || !this.p.kickback) this.sfx("outlane");
      this.flash(id === "outL" ? "outL" : "outR", 1.0);
    }
    onKickback(ball) {
      const p = this.p;
      if (p && p.kickback && !this.tilt) {
        ball.vx = 5 + this.rng() * 10; ball.vy = -1560;
        p.kickback = false;
        this.kickbackAnim = 0.5;
        this.score(SC.KICKBACK);
        this.sfx("kickback");
        this.fx("spark", { x: 50, y: 1000, n: 12, c: "fire" });
        this.dmdBanner("KICKBACK", "", 1.0, 3);
        this.updateLamps();
      }
    }

    hitDragon(i, e) {
      const p = this.p; if (!p || this.tilt) return;
      const now = this.time;
      if (now - (this._dragonCd || 0) < 0.3) return;
      this._dragonCd = now;
      this.score(SC.STANDUP); this.bonus(15000);
      this.sfx("dragonHit");
      this.flash("dragon0", 1.2);
      p.dragonHits = (p.dragonHits || 0) + 1;
      if (p.dragonHits >= 2) {
        p.dragonHits = 0;
        if (!p.kickback) {
          p.kickback = true;
          this.dmdBanner("KICKBACK ARMED", "", 1.4, 3);
          this.sfx("armed");
        } else { this.score(250000); }
      }
      this.updateLamps();
    }

    hitDrop(i, e) {
      const p = this.p; if (!p) return;
      const part = this.layout.parts["drop" + i];
      if (!part.enabled) return;
      part.enabled = false;
      this.dropAnim[i] = 1;
      this.score(SC.DROP); this.bonus(15000);
      this.sfx("drop");
      if (!this.layout.parts.drop0.enabled && !this.layout.parts.drop1.enabled && !this.layout.parts.drop2.enabled) {
        p.dropBanks++;
        this.score(SC.DROP_BANK); this.bonus(50000);
        this.sfx("bankdone");
        this.registerShot("drops");
        this.dmdBanner("JOUST BANK", M.fmtScore(SC.DROP_BANK), 1.5, 3);
        if (p.dropBanks >= 2 && !p.ebBankGiven) {
          p.ebBankGiven = true; this.lightEB();
        }
        this._dropReset = 0.5;
      }
      if (this._dropReset === undefined) this._dropReset = -1;
    }

    hitTroll(i, e) {
      if (!this.trollsUp || this.tilt) return;
      this.score(SC.TROLL_HIT); this.bonus(20000);
      this.sfx("troll");
      this.fx("spark", { x: this.layout.meta.trolls[i][0], y: this.layout.meta.trolls[i][1], n: 8, c: "green" });
      this.castleAnim.shake = Math.max(this.castleAnim.shake, 0.15);
      if (this.quest && this.quest.idx === 2) {
        this.quest.got++;
        this.dmdBanner("TROLL " + this.quest.got + " OF " + this.quest.need, M.fmtScore(SC.TROLL_HIT), 0.9, 3);
        if (this.quest.got >= this.quest.need) this.questComplete();
      }
      if (this.mb && this.mb.type === "wizard") this.wizHit("troll");
    }

    // ------------- castle -------------
    bridgeNeed() { const p = this.p; return 3 + (p ? p.castles * 2 : 0); }
    gateNeed() { const p = this.p; return 2 + (p ? p.castles : 0); }
    wizardReady() {
      const p = this.p;
      return !!p && p.quests.every(Boolean) && p.castles >= 3 && p.mbPlayed >= 1 && !p._wizDoneThisCycle;
    }

    hitGate(e) {
      const p = this.p; if (!p || this.tilt) return;
      const now = this.time;
      if (now - (this._gateCd || 0) < 0.25) return;
      this._gateCd = now;
      p.gateHits++; p.castleHits++;
      this.castleAnim.shake = 0.35;
      this.fx("spark", { x: 370, y: 372, n: 10, c: "fire" });
      this.fx("shake", { x: 0, y: 3 });
      this.score(SC.GATE_HIT); this.bonus(25000);
      this.registerShot("castle");

      // super skill shot collect
      if (this.superSkillT > 0) {
        this.superSkillT = 0;
        this.score(SC.SUPER_SKILL);
        this.hurry = { t: 0, val: SC.HURRYUP_MAX };
        this.sfx("skill");
        this.dmdBanner("SUPER SKILL SHOT", M.fmtScore(SC.SUPER_SKILL), 1.8, 5);
      }
      // hurry-up collect
      if (this.hurry) {
        this.score(this.hurry.val);
        this.dmdBanner("HURRY UP", M.fmtScore(this.hurry.val), 1.6, 5);
        this.sfx("jackpot");
        this.hurry = null;
      }
      // multiball: gate = double jackpot-ish award
      if (this.mb && this.mb.type === "castle") {
        this.score(500000);
      }
      // castle stage advance
      if (p.castleStage === 0) {
        this.sfx("gateHit");
        if (p.castleHits >= this.bridgeNeed()) {
          p.castleStage = 1; p.castleHits = 0;
          this.castleAnim.bridge = 1;
          this.sfx("bridge");
          this.dmdBanner("DRAWBRIDGE DOWN", "", 1.5, 4);
        }
      } else if (p.castleStage === 1) {
        this.sfx("gateHit");
        if (p.castleHits >= this.gateNeed()) {
          p.castleStage = 2; p.castleHits = 0;
          this.layout.parts.gate.enabled = false;
          this.castleAnim.gate = 1;
          this.sfx("gateOpen");
          this.dmdBanner("THE GATE IS OPEN", p.locks >= 2 ? "MULTIBALL AT CASTLE" : "SHOOT THE CASTLE", 1.8, 4);
        }
      }
      if (p.gateHits === 20 && !p.ebGate) { p.ebGate = true; this.lightEB(); }
      this.updateLamps();
    }

    senseLock(e) {
      const p = this.p; if (!p) return;
      const b = e.ball;
      if (b.locked || b.held) return;
      // wizard start?
      if (this.wizardReady() && !this.mb) {
        this.captureBall(b, 370, 332);
        this.holdQ.push({ ball: b, t: 2.2, fn: () => { this.ejectCastle(b); this.startWizard(); } });
        this.dmd.play((d, t) => {
          d.textC("BATTLE FOR", 4, { scale: 1 });
          d.textC("THE KINGDOM", 14, { scale: 1 });
          if (Math.floor(t * 6) % 2) d.frame(0, 0, 128, 32, 2);
        }, 2.2, 7);
        this.sfx("wizard");
        return;
      }
      if (this.mb && this.mb.type === "castle") {
        // super jackpot at the lock during castle MB
        this.captureBall(b, 370, 332);
        if (this.mb.superLit) {
          this.mb.superLit = false; this.mb.jackpots = 0;
          this.mb.value += 500000;
          this.score(SC.SUPER_JACKPOT);
          this.sfx("sjp");
          this.fx("flash", {}); this.fx("shake", { x: 4, y: 6 });
          this.dmdBanner("SUPER JACKPOT", M.fmtScore(SC.SUPER_JACKPOT), 2.0, 6);
        } else this.score(500000);
        this.holdQ.push({ ball: b, t: 1.1, fn: () => this.ejectCastle(b) });
        this.updateLamps();
        return;
      }
      if (this.mb) { // other MB: just kick it back out
        this.captureBall(b, 370, 332);
        this.score(250000);
        this.holdQ.push({ ball: b, t: 0.8, fn: () => this.ejectCastle(b) });
        return;
      }
      // normal: castle destroyed!
      p.castles++;
      this.score(SC.CASTLE_DESTROYED); this.bonus(250000);
      this.fx("boom", { x: 370, y: 290 });
      this.fx("shake", { x: 6, y: 9 });
      this.castleAnim.boom = 1.2;
      this.sfx("explode");
      this.captureBall(b, 370, 332);
      const destroyed = p.castles;
      this.dmd.play((d, t) => {
        if (t < 0.9) {
          // rumble noise
          for (let i = 0; i < 200; i++) d.px(this.rng() * 128, this.rng() * 32, this.rng() * 4 | 0);
          d.textC("CASTLE", 4, { scale: 2 });
        } else {
          d.textC("CASTLE " + destroyed, 3, { scale: 1 });
          d.textC("DESTROYED", 13, { scale: 1 });
          d.textC(M.fmtScore(SC.CASTLE_DESTROYED), 24, {});
        }
      }, 2.4, 6);

      if (p.locks < 2) {
        p.locks++;
        const lockN = p.locks;
        this.holdQ.push({
          ball: b, t: 2.0, fn: () => {
            this.dmdBanner("BALL " + lockN + " LOCKED", lockN >= 2 ? "DESTROY 1 MORE CASTLE" : "", 1.8, 5);
            this.sfx("lock");
            if (this.lockedBalls.length < 2) {
              // ball stays locked in the castle
              b.locked = true; this.lockedBalls.push(b);
              this.serve(false); // next ball to shooter
            } else {
              this.ejectCastle(b); // castle full: virtual lock
            }
            this.resetCastle();
          }
        });
      } else {
        // third castle => MULTIBALL
        this.holdQ.push({ ball: b, t: 1.8, fn: () => { this.ejectCastle(b); this.startMultiball("castle"); } });
      }
      this.updateLamps();
    }

    resetCastle() {
      const p = this.p; if (!p) return;
      p.castleStage = 0; p.castleHits = 0;
      this.layout.parts.gate.enabled = !this.wizardReady();
      this.castleAnim.bridge = 0; this.castleAnim.gate = 0;
      this.updateLamps();
    }

    ejectCastle(b) {
      this.releaseBall(b, 370, 385, (this.rng() - 0.5) * 80, 330, ["gate", "lock"]);
      this.sfx("kickout");
    }

    // ------------- catapult & scoop -------------
    senseCatapult(e) {
      const b = e.ball;
      if (b.held || b.locked) return;
      this.captureBall(b, 240, 458);
      this.catapultAnim = 0.9;
      const p = this.p;
      this.registerShot("catapult");
      if (p && !this.tilt) {
        p.catapults++; p.slams++;
        const val = SC.CATAPULT * Math.min(4, p.slams);
        this.score(val); this.bonus(20000);
        if (p.slams === 3 && !p.cataMBLit && !this.mb) {
          p.cataMBLit = true;
          this.dmdBanner("CATAPULT MULTIBALL", "IS LIT", 1.8, 4);
          this.sfx("armed");
        }
      }
      this.sfx("catapult");
      this.holdQ.push({
        ball: b, t: 0.75, fn: () => {
          const p2 = this.p;
          if (p2 && p2.cataMBLit && !this.mb) {
            p2.cataMBLit = false; p2.slams = 0;
            this.tossBall(b);
            this.startMultiball("catapult");
          } else this.tossBall(b);
        }
      });
    }
    tossBall(b) {
      const T = this.layout.meta.catapultToss;
      b.held = true;
      b.toss = { t: 0, dur: T.t, from: [b.x, b.y], to: [T.to[0] + (this.rng() - 0.5) * 60, T.to[1]], apexH: T.apexH };
      this.sfx("toss");
    }
    stepToss(dt) {
      for (const b of this.world.balls) {
        if (!b.toss) continue;
        b.toss.t += dt;
        const T = b.toss, u = Math.min(1, T.t / T.dur);
        b.x = M.lerp(T.from[0], T.to[0], u);
        b.y = M.lerp(T.from[1], T.to[1], u);
        b.tossH = T.apexH * 4 * u * (1 - u);
        if (u >= 1) {
          b.toss = null; b.held = false; b.tossH = 0;
          b.vx = (this.rng() - 0.5) * 120; b.vy = 60;
          this.sfx("tossLand");
          this.fx("spark", { x: b.x, y: b.y, n: 6, c: "gold" });
        }
      }
    }

    senseScoop(e) {
      const b = e.ball;
      if (b.held || b.locked) return;
      this.captureBall(b, 132, 622);
      this.sfx("scoop");
      const p = this.p;
      let wait = 1.0;
      if (p && !this.tilt) {
        this.registerShot("scoop");
        this.score(SC.SCOOP);
        if (p.ebLit) {
          p.ebLit = false; p.extraBalls++;
          this.sfx("eb");
          this.dmd.play((d, t) => {
            d.textC("EXTRA BALL", 8, { scale: Math.floor(t * 6) % 2 ? 2 : 1 });
          }, 2.2, 6);
          wait = 2.4;
        } else if (!this.quest && !this.mb) {
          const idx = p.quests.findIndex((q) => !q);
          if (idx >= 0) { this.startQuest(idx); wait = 2.6; }
          else this.score(250000);
        }
      }
      this.holdQ.push({
        ball: b, t: wait, fn: () => {
          const v = this.layout.meta.scoop.ejectV;
          this.releaseBall(b, 138, 630, v[0], v[1], ["scoop"]);
          this.sfx("kickout");
        }
      });
    }

    // ------------- quests -------------
    startQuest(idx) {
      const q = QUESTS[idx];
      this.quest = { idx, t: 35, need: q.need, got: 0, rove: 4.5, shot: 0 };
      if (idx === 2) this.trollsSet(true);
      this.sfx("quest");
      this.musicMode = "quest";
      const self = this;
      this.dmd.play((d, t) => {
        d.frame(0, 0, 128, 32, 1);
        d.textC(q.name, 5, { scale: 1, v: 3 });
        d.textC(q.goal, 17, { scale: 1, v: 2 });
      }, 2.4, 6);
      this.updateLamps();
    }
    questShot(name) {
      const Q = this.quest; if (!Q) return;
      const idx = Q.idx;
      let hit = false;
      if (idx === 0 && (name === "orbitL" || name === "orbitR")) hit = true;
      if (idx === 1) {
        if (Q.got < Q.need - 1 && (name === "rampL" || name === "rampR")) hit = true;
        if (Q.got >= Q.need - 1 && name === "castle") hit = true;
      }
      if (idx === 3 && name === "catapult") hit = true;
      if (idx === 4 && name === HUNT_SHOTS[Q.shot]) hit = true;
      if (!hit) return;
      Q.got++;
      const val = QUESTS[idx].val;
      this.score(val); this.bonus(30000);
      this.sfx("questHit");
      Q.t = Math.min(Q.t + 6, 35);
      if (idx === 3) { // catapult siege slams the castle
        this.hitGateFree(2);
      }
      if (Q.got >= Q.need) this.questComplete();
      else this.dmdBanner(QUESTS[idx].name, Q.got + " OF " + Q.need + "  " + M.fmtScore(val), 1.3, 4);
      this.updateLamps();
    }
    hitGateFree(n) {
      // catapult siege: counts castle damage without a physical hit
      const p = this.p; if (!p) return;
      for (let i = 0; i < n; i++) {
        p.castleHits++;
        if (p.castleStage === 0 && p.castleHits >= this.bridgeNeed()) {
          p.castleStage = 1; p.castleHits = 0; this.castleAnim.bridge = 1; this.sfx("bridge");
        } else if (p.castleStage === 1 && p.castleHits >= this.gateNeed()) {
          p.castleStage = 2; p.castleHits = 0;
          this.layout.parts.gate.enabled = false; this.castleAnim.gate = 1; this.sfx("gateOpen");
        }
      }
      this.castleAnim.shake = 0.3;
    }
    questComplete() {
      const Q = this.quest; if (!Q) return;
      const p = this.p;
      p.quests[Q.idx] = true;
      this.quest = null;
      this.trollsSet(false);
      this.score(1000000); this.bonus(300000);
      this.sfx("questWin");
      this.fx("confetti", { x: 270, y: 500 });
      this.musicMode = this.mb ? "mb" : "main";
      const name = QUESTS[Q.idx].name;
      this.dmd.play((d, t) => {
        d.textC(name, 4, {});
        d.textC("COMPLETE", 14, { scale: Math.floor(t * 5) % 2 ? 1 : 1 });
        d.textC("1,000,000", 24, {});
      }, 2.2, 6);
      const done = p.quests.filter(Boolean).length;
      if (done === 2 && !p.ebQuestGiven) { p.ebQuestGiven = true; this.lightEB(); }
      if (p.quests.every(Boolean)) {
        this.dmdBanner("ALL QUESTS DONE", this.wizardReady() ? "BATTLE AT THE CASTLE" : "DESTROY 3 CASTLES", 2.2, 5);
        this.applyPlayerToys();
      }
      this.updateLamps();
    }
    trollsSet(up) {
      this.trollsUp = up;
      this.layout.parts.troll0.enabled = up;
      this.layout.parts.troll1.enabled = up;
      if (up) this.sfx("trollUp");
    }
    lightEB() {
      const p = this.p; if (!p || p.ebLit) return;
      p.ebLit = true;
      this.sfx("armed");
      this.dmdBanner("EXTRA BALL LIT", "AT THE WIZARD", 1.8, 4);
      this.updateLamps();
    }

    // ------------- shots / combos / jackpots -------------
    registerShot(name) {
      const p = this.p; if (!p || this.tilt) return;
      const now = this.time;
      if (name === "orbitL" || name === "orbitR") { p.orbits++; this.score(SC.ORBIT); this.bonus(25000); this.sfx("orbit"); }
      if (name === "rampL" || name === "rampR") {
        p.ramps++;
        this._scoring2x = this.inlane2x > 0;
        this.score(SC.RAMP);
        this._scoring2x = false;
        this.bonus(30000); this.sfx("rampMade");
      }
      // combos
      const comboShots = ["orbitL", "orbitR", "rampL", "rampR", "catapult", "castle", "scoop"];
      if (comboShots.includes(name)) {
        if (this.combo.last && this.combo.last !== name && now - this.combo.t < 3.5) {
          this.combo.n++;
          const val = SC.COMBO * this.combo.n;
          this.score(val); this.bonus(20000);
          this.sfx("combo", { n: this.combo.n });
          this.dmdBanner("COMBO x" + this.combo.n, M.fmtScore(val), 1.1, 3);
        } else this.combo.n = 1;
        this.combo.last = name; this.combo.t = now;
      }
      // quest hooks
      this.questShot(name);
      // multiball jackpots
      if (this.mb) this.mbShot(name);
    }

    mbShot(name) {
      const mb = this.mb;
      if (mb.type === "castle") {
        if (mb.lit[name]) {
          mb.lit[name] = false; mb.jackpots++;
          this.score(mb.value); this.bonus(50000);
          this.sfx("jackpot");
          this.fx("flash", {});
          this.dmdBanner("JACKPOT", M.fmtScore(mb.value), 1.6, 5);
          if (mb.jackpots >= 4) { mb.superLit = true; this.dmdBanner("SUPER JACKPOT", "AT THE CASTLE", 1.8, 5); this.sfx("armed"); }
          if (Object.values(mb.lit).every((v) => !v)) {
            mb.lit = { orbitL: true, orbitR: true, rampL: true, rampR: true };
          }
        }
      } else if (mb.type === "catapult") {
        if (name === "catapult" || name === "rampL" || name === "rampR") {
          this.score(750000); this.bonus(40000);
          this.sfx("jackpot");
          this.dmdBanner("SLAM JACKPOT", "750,000", 1.4, 5);
        }
      } else if (mb.type === "wizard") {
        this.wizHit(name);
      }
      this.updateLamps();
    }
    wizHit(name) {
      const mb = this.mb;
      if (!mb || mb.type !== "wizard") return;
      if (name === "troll") name = "castle";
      if (mb.lit[name]) {
        mb.lit[name] = false;
        this.score(SC.WIZ_SHOT); this.bonus(60000);
        this.sfx("jackpot");
        const left = Object.values(mb.lit).filter(Boolean).length;
        this.dmdBanner("KINGDOM SHOT", left + " TO GO", 1.4, 5);
        if (left === 0) {
          this.score(SC.WIZ_COMPLETE);
          const p = this.p;
          p.wizardDone++; p._wizDoneThisCycle = true;
          p.extraBalls++;
          this.sfx("crown");
          this.fx("confetti", { x: 270, y: 400 });
          this.fx("flash", {});
          this.dmd.play((d, t) => {
            d.textC("KING OF", 3, { scale: 1 });
            d.textC("THE REALM", 12, { scale: 1 });
            d.textC("25,000,000", 24, { v: Math.floor(t * 8) % 2 ? 3 : 2 });
          }, 3.2, 7);
          // reset cycle for a second run
          p.quests = [false, false, false, false, false];
          p.castles = 0; p.locks = 0; p._wizDoneThisCycle = false;
          this.resetCastle();
        }
      }
      this.updateLamps();
    }

    // ------------- multiball -------------
    startMultiball(type) {
      const p = this.p;
      const want = type === "wizard" ? 4 : type === "castle" ? 3 : 2;
      this.mb = {
        type, started: 0, value: SC.JACKPOT, jackpots: 0, superLit: false,
        lit: type === "castle"
          ? { orbitL: true, orbitR: true, rampL: true, rampR: true }
          : type === "wizard"
            ? { orbitL: true, rampL: true, catapult: true, castle: true, rampR: true, orbitR: true, scoop: true, drops: true }
            : {}
      };
      if (p) p.mbPlayed++;
      // release locked balls
      for (const b of this.lockedBalls.splice(0)) {
        b.locked = false;
        this.holdQ.push({ ball: b, t: 0.4 + this.rng() * 0.5, fn: () => this.ejectCastle(b) });
      }
      // serve extras
      const pendingBalls = this.holdQ.filter((h) => h.ball && !h.ball.locked).length;
      const need = want - (this.ballsInPlay() + pendingBalls);
      for (let i = 0; i < need; i++) this.serve(true);
      this.ballSave = type === "wizard" ? 20 : C.MB_SAVE_T;
      this.ballSaveUsed = false;
      this.musicMode = type === "wizard" ? "wiz" : "mb";
      this.sfx("mbstart");
      this.fx("flash", {}); this.fx("shake", { x: 3, y: 5 });
      this.giLevel = 1.25;
      const title = type === "castle" ? "CASTLE MULTIBALL" : type === "catapult" ? "CATAPULT MULTIBALL" : "BATTLE FOR THE KINGDOM";
      this.dmd.play((d, t) => {
        if (Math.floor(t * 7) % 2) d.frame(0, 0, 128, 32, 2);
        d.textC(title.split(" ")[0], 4, { scale: 1 });
        d.textC(title.split(" ").slice(1).join(" ") || "MULTIBALL", 15, { scale: 1 });
        d.textC("SHOOT EVERYTHING", 25, { v: 2 });
      }, 2.6, 6);
      if (type === "castle") this.resetCastle();
      this.updateLamps();
    }
    endMultiball() {
      const wasWiz = this.mb && this.mb.type === "wizard";
      this.mb = null;
      this.giLevel = 1;
      this.musicMode = "main";
      this.dmdBanner(wasWiz ? "THE BATTLE ENDS" : "MULTIBALL OVER", "", 1.6, 4);
      const p = this.p;
      if (p) { p.locks = 0; }
      this.resetCastle();
      this.updateLamps();
    }

    // ------------- ramps -------------
    captureRamp(ball, which, speed) {
      if (ball.onRamp || ball.held) return;
      const r = this.layout.ramps[which];
      const v = Math.max(140, speed);
      ball.onRamp = { r, s: 2, v };
      ball.vx = 0; ball.vy = 0;
      this.sfx("rampIn");
      this.registerShot(which === "left" ? "rampL" : "rampR");
    }
    stepRamps(dt) {
      const HG = 3000, DRAG = 26;
      for (const b of this.world.balls) {
        if (!b.onRamp) continue;
        const R = b.onRamp, r = R.r;
        // find local slope
        let i = 0;
        while (i < r.cum.length - 2 && r.cum[i + 1] < R.s) i++;
        const segLen = r.cum[i + 1] - r.cum[i] || 1;
        const dh = r.path[i + 1][2] - r.path[i][2];
        const a = -HG * (dh / segLen) - DRAG * Math.sign(R.v);
        R.v += a * dt;
        R.s += R.v * dt;
        if (R.s <= 0) {
          // rolled back out of the entrance
          b.onRamp = null;
          b.x = r.reject.x; b.y = r.reject.y;
          b.vx = r.reject.vx + (this.rng() - 0.5) * 40;
          b.vy = Math.max(150, Math.min(420, Math.abs(R.v) * 0.55));
          this.sfx("rampBack");
          continue;
        }
        if (R.s >= r.total) {
          b.onRamp = null;
          b.x = r.exit.x; b.y = r.exit.y;
          b.vx = r.exit.vx; b.vy = r.exit.vy;
          b.grace = b.grace || {};
          this.sfx("rampDone");
          this.flash(r.name === "left" ? "inR" : "inL", 0.8);
          continue;
        }
        // position for renderer
        const t = (R.s - r.cum[i]) / segLen;
        b.x = M.lerp(r.path[i][0], r.path[i + 1][0], t);
        b.y = M.lerp(r.path[i][1], r.path[i + 1][1], t);
        b.rampH = M.lerp(r.path[i][2], r.path[i + 1][2], t);
      }
    }

    // ------------- captures / holds -------------
    captureBall(b, x, y) {
      b.held = true; b.vx = 0; b.vy = 0; b.x = x; b.y = y;
    }
    releaseBall(b, x, y, vx, vy, graceIds) {
      b.x = x; b.y = y; b.vx = vx; b.vy = vy;
      b.held = false;
      if (graceIds) for (const id of graceIds) b.grace[id] = this.world.time + 0.35;
    }
    stepHolds(dt) {
      for (let i = this.holdQ.length - 1; i >= 0; i--) {
        const h = this.holdQ[i];
        h.t -= dt;
        if (h.t <= 0) { this.holdQ.splice(i, 1); h.fn(); }
      }
      if (this._dropReset !== undefined && this._dropReset >= 0) {
        this._dropReset -= dt;
        if (this._dropReset <= 0) {
          this._dropReset = -1;
          for (let i = 0; i < 3; i++) { this.layout.parts["drop" + i].enabled = true; this.dropAnim[i] = 0; }
          this.sfx("bankReset");
        }
      }
    }

    // ------------- drain & end of ball -------------
    onDrain(ball) {
      if (ball.locked || ball._drained) return;
      ball._drained = true;
      this.world.removeBall(ball);
      this.trough++;
      this.stats.drains++;
      if (this.state !== "playing") return;

      const inPlay = this.ballsInPlay() + this.holdQ.filter((h) => !h.ball.locked).length + this.serveQ;
      if (this.ballSave > 0 && !this.tilt) {
        // saved
        if (!this.mb) this.ballSaveUsed = true, this.ballSave = Math.min(this.ballSave, 2);
        this.serve(true);
        this.sfx("ballsave");
        this.dmd.play((d, t) => {
          if (Math.floor(t * 6) % 2) d.textC("SHOOT AGAIN", 12, { scale: 1 });
        }, 1.6, 5);
        return;
      }
      if (inPlay >= 1) {
        this.sfx("drainMB");
        return; // multiball continues (end check in update)
      }
      // last ball gone
      this.sfx("drain");
      this.endOfBall();
    }

    endOfBall() {
      this.quest = null; this.hurry = null;
      this.trollsSet(false);
      this.layout.flip.L.up = this.layout.flip.R.up = false;
      if (this.mb) this.endMultiball();
      this.state = "bonus";
      const p = this.p;
      if (!p) return this.toAttract();
      if (this.tilt) {
        this.dmdBanner("TILT", "BONUS LOST", 1.6, 6);
        this.endFlow = 1.8; this._endStage = 1;
        return;
      }
      const total = p.bonusBase * p.bonusX;
      p.score += total;
      const base = p.bonusBase, bx = p.bonusX;
      this.sfx("bonusTally");
      this.dmd.play((d, t) => {
        d.textC("BONUS", 2, {});
        d.textC(M.fmtScore(base) + " x" + bx, 12, {});
        const u = Math.min(1, t / 1.6);
        d.textC(M.fmtScore(Math.floor(total * u)), 23, { scale: 1 });
      }, 2.3, 6);
      this.endFlow = 2.5; this._endStage = 1;
    }

    endFlowStep() {
      const p = this.p;
      if (this._endStage === 1) {
        // replay check
        if (p && !p.replayGiven && p.score >= SC.REPLAY_AT) {
          p.replayGiven = true; this.credits++;
          this.sfx("knocker");
          this.dmdBanner("REPLAY", "WELL PLAYED KNIGHT", 1.8, 6);
          this.endFlow = 2.0; this._endStage = 2;
          return;
        }
        this._endStage = 2;
      }
      if (this._endStage === 3) {
        const fn = this._afterMatch; this._afterMatch = null;
        if (fn) fn();
        return;
      }
      if (this._endStage === 2) {
        if (p && p.extraBalls > 0 && !this.tilt) {
          p.extraBalls--;
          this.state = "playing";
          this.resetBallState();
          this.applyPlayerToys();
          this.sfx("shootAgain");
          this.dmd.play((d, t) => {
            if (Math.floor(t * 5) % 2) { d.textC("SHOOT", 3, { scale: 1 }); d.textC("AGAIN", 13, { scale: 1 }); }
          }, 2.0, 5);
          this.serve(false);
          this.endFlow = 0;
          return;
        }
        // advance player / ball
        if (this.cur === 0) this._p1Done = true;
        let next = this.cur + 1;
        if (next >= this.players.length) { next = 0; this.ballNum++; }
        if (this.ballNum > C.BALLS_PER_GAME) return this.gameOver();
        this.cur = next;
        this.state = "playing";
        this.resetBallState();
        this.applyPlayerToys();
        this.serve(false);
        const who = this.players.length > 1 ? "PLAYER " + (this.cur + 1) : "";
        this.dmdBanner(who || "BALL " + this.ballNum, who ? "BALL " + this.ballNum : "", 1.6, 4);
        this.endFlow = 0;
      }
    }

    gameOver() {
      this.state = "match";
      this.musicMode = "attract";
      // match sequence
      const m = Math.floor(this.rng() * 10) * 10;
      const winners = this.players.map((p, i) => ({ i, hit: p.score % 100 === m }));
      const anyHit = winners.some((w) => w.hit);
      this.match = { num: m, t: 0 };
      const scores = this.players.map((p) => p.score);
      this.sfx("matchSeq");
      this.dmd.play((d, t) => {
        d.textC("MATCH", 2, {});
        const shown = t < 1.2 ? Math.floor(this.rngStable(t) * 10) * 10 : m;
        d.textC((shown < 10 ? "0" : "") + shown, 12, { scale: 2 });
        if (t > 1.2 && anyHit && Math.floor(t * 6) % 2) d.frame(0, 0, 128, 32, 3);
      }, 2.6, 7);
      if (anyHit) {
        this.credits += winners.filter((w) => w.hit).length;
        this.holdT = setTimeoutSafe(this, 1.4, () => this.sfx("knocker"));
      }
      this.endFlow = 2.8; this._endStage = 3;
      this._endStage = 3;
      // after match: high score check
      this._afterMatch = () => this.checkHighScores();
    }
    rngStable(t) { // deterministic-ish flicker for match reels
      const x = Math.sin(t * 91.7) * 43758.5453; return x - Math.floor(x);
    }

    checkHighScores() {
      // find best qualifying player not yet entered
      const cands = this.players
        .map((p, i) => ({ p, i }))
        .filter((c) => !c.p._hsEntered)
        .sort((a, b) => b.p.score - a.p.score);
      for (const c of cands) {
        const t = this.hsTable;
        if (c.p.score > t.gc.score || c.p.score > t.list[3].score) {
          c.p._hsEntered = true;
          const isGC = c.p.score > t.gc.score;
          this.state = "hiscore";
          this.hs = { pi: c.i, ini: "", chr: 0, isGC };
          this.sfx("hiscore");
          return;
        }
      }
      this.toAttract();
    }
    hsCycle(dir) {
      if (!this.hs) return;
      const CH = "ABCDEFGHIJKLMNOPQRSTUVWXYZ ";
      this.hs.chr = (this.hs.chr + dir + CH.length) % CH.length;
      this.sfx("key");
    }
    hsCommit() {
      if (!this.hs) return;
      const CH = "ABCDEFGHIJKLMNOPQRSTUVWXYZ ";
      this.hs.ini += CH[this.hs.chr];
      this.sfx("key2");
      if (this.hs.ini.length >= 3) this.hsFinish();
    }
    hsFinish() {
      const h = this.hs; if (!h) return;
      const p = this.players[h.pi];
      const ini = (h.ini + "   ").slice(0, 3);
      const t = this.hsTable;
      if (h.isGC) {
        t.list.unshift({ ini: t.gc.ini, score: t.gc.score });
        t.gc = { ini, score: p.score };
        t.list = t.list.sort((a, b) => b.score - a.score).slice(0, 4);
        this.sfx("gc");
        this.dmdBanner("GRAND CHAMPION", ini + "  " + M.fmtScore(p.score), 2.5, 7);
      } else {
        t.list.push({ ini, score: p.score });
        t.list = t.list.sort((a, b) => b.score - a.score).slice(0, 4);
        this.sfx("hiscoreDone");
        this.dmdBanner("HIGH SCORE", ini + "  " + M.fmtScore(p.score), 2.2, 7);
      }
      this.saveScores();
      this.hs = null;
      this.holdT = setTimeoutSafe(this, 2.3, () => this.checkHighScores());
    }

    toAttract() {
      this.state = "attract";
      this.attractT = 0;
      this.musicMode = "attract";
      this.hs = null;
      // clean table
      for (const b of this.world.balls.slice()) this.world.removeBall(b);
      this.trough = C.BALLS_TOTAL;
      this.lockedBalls = [];
      this.setAttractLamps();
    }

    // ------------- ball search / rescue -------------
    ballSearch(dt) {
      const balls = this.world.balls.filter((b) => b.active && !b.held && !b.locked && !b.onRamp && !b.toss);
      if (!balls.length) {
        // nothing on the playfield: if nothing pending either, something ate a ball
        if (this.serveQ === 0 && this.holdQ.length === 0 && this.ballsInPlay() === 0 &&
            this.state === "playing" && !this.endFlow && this.time - this.lastSwitchT > 6) {
          // recover: treat as drained
          this.lastSwitchT = this.time;
          this.stats.rescues++;
          this.stats.phantom = (this.stats.phantom || 0) + 1;
          this.endOfBall();
        }
        return;
      }
      // idle in shooter lane waiting for player = fine
      const allInShooter = balls.every((b) => b.x > C.SHOOT_X0 && b.y > 950);
      if (allInShooter) { this.lastSwitchT = this.time; return; }
      // player actively holding a flipper (cradling) postpones search
      if (this.layout.flip.L.up || this.layout.flip.R.up) { this.lastSwitchT = this.time; return; }
      const idle = this.time - this.lastSwitchT;
      if (idle > 14) {
        this.lastSwitchT = this.time;
        this.searches++;
        this.sfx("search");
        this.dmdBanner("BALL SEARCH", "", 1.2, 5);
        // pulse flippers
        const fl = this.layout.flip;
        fl.L.up = true; fl.R.up = true;
        this.holdQ.push({ ball: null, t: 0.35, fn: () => { if (!this.tilt) { fl.L.up = false; fl.R.up = false; } } });
        for (const b of balls) {
          if (Math.hypot(b.vx, b.vy) < 40) {
            b.vx += (this.rng() - 0.5) * 220;
            b.vy -= 160 + this.rng() * 120;
          }
        }
        if (this.searches >= 2) {
          // hard rescue: teleport slowest ball to the shooter lane
          let worst = balls[0];
          for (const b of balls) if (Math.hypot(b.vx, b.vy) < Math.hypot(worst.vx, worst.vy)) worst = b;
          this.stats.hardAt = (this.stats.hardAt || []).concat([[Math.round(worst.x), Math.round(worst.y)]]);
          worst.x = C.SHOOT_CX; worst.y = 1042; worst.vx = 0; worst.vy = 0;
          this.autoPlunge = 0.8;
          this.searches = 0;
          this.stats.rescues++;
        }
      }
    }

    // ------------- lamps -------------
    setAttractLamps() {
      this.lampState = {};
    }
    updateLamps() {
      const p = this.p;
      const L = this.lamp.bind(this);
      if (!p) return;
      for (let i = 0; i < 3; i++) L("key" + i, p.keyLit[i] ? 1 : (this.skill && this.skill.lane === i ? 3 : 0));
      L("kickback", p.kickback ? 1 : 0);
      L("inL", 0); L("inR", 0); L("outL", 0); L("outR", 0);
      L("dragon0", p.kickback ? 1 : (p.dragonHits ? 3 : 2));
      for (let i = 0; i < 5; i++) L("quest" + i, p.quests[i] ? 1 : (this.quest && this.quest.idx === i ? 3 : 0));
      L("eb", p.ebLit ? 3 : 0);
      L("lock1", p.locks >= 1 ? 1 : p.castleStage === 2 ? 3 : 0);
      L("lock2", p.locks >= 2 ? 1 : (p.locks === 1 && p.castleStage === 2 ? 3 : 0));
      L("multiball", this.mb ? 3 : (p.locks >= 2 ? 2 : 0));
      L("troll0", this.trollsUp ? 3 : 0);
      L("troll1", this.trollsUp ? 3 : 0);
      L("drops", 0);
      L("spinnerL", 1);
      // shot arrows
      const arrows = { aOrbitL: 0, aRampL: 0, aCata: 0, aCastle: 0, aRampR: 0, aOrbitR: 0, aScoop: 0 };
      if (this.quest) {
        const q = this.quest;
        if (q.idx === 0) { arrows.aOrbitL = 3; arrows.aOrbitR = 3; }
        if (q.idx === 1) { if (q.got < q.need - 1) { arrows.aRampL = 3; arrows.aRampR = 3; } else arrows.aCastle = 3; }
        if (q.idx === 3) arrows.aCata = 3;
        if (q.idx === 4) arrows[HUNT_LAMPS[q.shot]] = 3;
      } else if (this.mb) {
        const lit = this.mb.lit || {};
        for (const k in lit) if (lit[k] && SHOT_LAMP[k]) arrows[SHOT_LAMP[k]] = 3;
        if (this.mb.type === "castle") arrows.aCastle = this.mb.superLit ? 3 : 1;
        if (this.mb.type === "catapult") { arrows.aCata = 3; arrows.aRampL = 3; arrows.aRampR = 3; }
      } else {
        if (p.castleStage === 2) arrows.aCastle = 3;
        else arrows.aCastle = 1;
        if (!this.quest && !p.quests.every(Boolean)) arrows.aScoop = 2;
        if (p.ebLit) arrows.aScoop = 3;
        if (this.wizardReady()) arrows.aCastle = 3;
      }
      if (this.hurry) arrows.aCastle = 3;
      for (const k in arrows) L(k, arrows[k]);
    }
    updateContextLamps() {
      // flashing handled by renderer from lampState modes + time
    }

    // ------------- DMD scenes -------------
    dmdBanner(l1, l2, ttl, prio) {
      this.dmd.play((d, t) => {
        if (l2) { d.textC(l1, 5, {}); d.textC(l2, 17, { v: 2 }); }
        else d.textC(l1, 12, {});
      }, ttl || 1.5, prio || 2);
    }

    defaultScene(d, gm) {
      if (this.state === "attract") return this.attractScene(d);
      if (this.state === "hiscore") return this.hiscoreScene(d);
      const p = this.p;
      if (!p) return;
      // big score, right aligned
      const s = M.fmtScore(p.score);
      const scale = s.length > 10 ? 1 : 2;
      d.textR(s, 127, scale === 2 ? 2 : 5, { scale });
      // bottom line
      d.text("P" + (this.cur + 1), 1, 24, { v: 2 });
      d.text("BALL " + this.ballNum, 18, 24, { v: 2 });
      let ctx = "";
      if (this.mb) {
        ctx = this.mb.type === "wizard" ? "KINGDOM" : "MULTIBALL";
        if (this.mb.superLit) ctx = "SUPER AT CASTLE";
      } else if (this.quest) ctx = QUESTS[this.quest.idx].name.slice(0, 12) + " " + Math.ceil(this.quest.t);
      else if (this.hurry) ctx = "HURRY " + M.fmtScore(this.hurry.val);
      else if (this.ballSave > 0 && this.ballSave < 4) ctx = "SAVE " + Math.ceil(this.ballSave);
      else if (this.superSkillT > 0) ctx = "SHOOT CASTLE";
      if (ctx) d.textR(ctx, 127, 24, { v: Math.floor(this.time * 4) % 2 ? 3 : 2 });
      // multiplayer mini scores
      if (this.players.length > 1) {
        const o = (this.cur + 1) % this.players.length;
        d.text("P" + (o + 1) + " " + M.fmtScore(this.players[o].score), 1, 15, { v: 1 });
      }
    }

    attractScene(d) {
      const page = Math.floor(this.attractT / 3.4) % 6;
      const t = this.attractT % 3.4;
      if (page === 0) {
        // title with flame flicker
        d.textC("DRAGONS KEEP", 6, { scale: 1, v: 3 });
        d.textC("STORM THE CASTLE", 20, { v: 2 });
        for (let i = 0; i < 26; i++) {
          const x = (i * 5 + Math.floor(t * 30)) % 128;
          d.px(x, 1, 1); d.px(127 - x, 30, 1);
        }
      } else if (page === 1) {
        d.textC("GRAND CHAMPION", 3, { v: 2 });
        d.textC(this.hsTable.gc.ini, 12, { scale: 1 });
        d.textC(M.fmtScore(this.hsTable.gc.score), 22, {});
      } else if (page === 2) {
        d.textC("HIGH SCORES", 2, { v: 2 });
        for (let i = 0; i < 2; i++) {
          const h = this.hsTable.list[i];
          d.text((i + 1) + ". " + h.ini, 8, 11 + i * 10, {});
          d.textR(M.fmtScore(h.score), 122, 11 + i * 10, {});
        }
      } else if (page === 3) {
        d.textC("HIGH SCORES", 2, { v: 2 });
        for (let i = 2; i < 4; i++) {
          const h = this.hsTable.list[i];
          d.text((i + 1) + ". " + h.ini, 8, 11 + (i - 2) * 10, {});
          d.textR(M.fmtScore(h.score), 122, 11 + (i - 2) * 10, {});
        }
      } else if (page === 4) {
        if (Math.floor(t * 2.5) % 2) d.textC("PRESS 1 TO START", 12, {});
        else d.textC(this.freePlay ? "FREE PLAY" : "CREDITS " + this.credits, 12, {});
      } else {
        d.textC("SHIFT = FLIPPERS", 3, { v: 2 });
        d.textC("ENTER = PLUNGER", 13, { v: 2 });
        d.textC("ARROWS = NUDGE", 23, { v: 2 });
      }
    }

    hiscoreScene(d) {
      const h = this.hs; if (!h) return;
      const CH = "ABCDEFGHIJKLMNOPQRSTUVWXYZ ";
      d.textC(h.isGC ? "GRAND CHAMPION" : "HIGH SCORE", 2, { v: 2 });
      d.textC("PLAYER " + (h.pi + 1) + " ENTER INITIALS", 11, { v: 1 });
      const cur = h.ini + (Math.floor(this.time * 3) % 2 ? CH[h.chr] : "_");
      d.textC(cur + "___".slice(cur.length), 20, { scale: 1, spacing: 3 });
    }
  }

  function setTimeoutSafe(game, t, fn) {
    game.holdQ.push({ ball: null, t, fn });
    return null;
  }

  Game.PASSIVE = new Set([
    "flipL", "flipR", "arch", "shooterWall", "shooterGate",
    "orbitGuideL", "orbitGuideR", "castleWallL", "castleWallR"
  ]);

  DK.Game = Game;
  DK.QUESTS = QUESTS;
  if (typeof module !== "undefined" && module.exports) module.exports = DK;
})(typeof window !== "undefined" ? window : globalThis);
