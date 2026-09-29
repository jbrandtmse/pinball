// Machine: the "hardware" layer. Owns the physics world and the playfield
// devices (trough, shooter, drop targets, vault door, scoops, kickback, tilt bob)
// and turns raw physics events into switch closures for the game rules --
// the same split a WPC machine has between its driver board and the game ROM.
import { buildWorld } from '../table/build.js';
import { PHYS } from '../sim/physics.js';
import T from '../table/layout.js';

const SHOOTER_X = T.plunger.laneX;
const SHOOTER_REST_Y = T.plunger.y - PHYS.ballR - 0.005;

export class Machine {
  constructor(opts = {}) {
    const { world, h } = buildWorld();
    this.world = world; this.h = h;
    this.totalBalls = opts.balls ?? 5;
    this.trough = this.totalBalls;
    this.time = 0; this.acc = 0;
    this.switchListeners = [];
    this.fxListeners = [];
    this.timers = [];
    this.flippersEnabled = false;
    this.dropsDown = [false, false, false];
    this.doorOpen = false;
    this.held = { hideout: [], vault: [] };
    this.kickbackArmed = false;
    this.lastActivity = 0;
    this.ballSearchCount = 0;
    this.serveQueue = 0;
    this.autoLaunchPending = 0;
    this.tiltBob = 0; this.tiltWarnCooldown = 0;
    this.shake = { x: 0, y: 0 };
    this.buttons = { left: false, right: false };
    this.stats = { searches: 0, rescues: 0 };
    this.autoPlungeEnabled = false;

    // captures
    h.captures.hideout.onEnter = (b) => this.capture('hideout', b);
    h.captures.vault.onEnter = (b) => this.capture('vault', b);
    h.triggers.kickback.onEnter = (b) => this.onKickbackLane(b);
    this.setDoor(false);
  }

  onSwitch(fn) { this.switchListeners.push(fn); }
  onFx(fn) { this.fxListeners.push(fn); }
  sw(id, info = {}) {
    this.lastActivity = this.time;
    for (const fn of this.switchListeners) fn(id, info);
  }
  fx(type, info = {}) { for (const fn of this.fxListeners) fn(type, info); }
  after(sec, fn) { this.timers.push({ at: this.time + sec, fn }); }

  // ---------------------------------------------------------------- inputs
  setFlipper(side, pressed) {
    const f = this.h.flippers[side === 'left' ? 'flipL' : 'flipR'];
    const was = this.buttons[side];
    this.buttons[side] = pressed;
    if (pressed !== was) this.sw(side === 'left' ? 'btnLeft' : 'btnRight', { on: pressed });
    const on = pressed && this.flippersEnabled;
    if (on !== f.pressed) {
      f.pressed = on;
      this.fx(on ? 'flipperUp' : 'flipperDown', { id: f.id });
    }
  }
  setFlippersEnabled(on) {
    this.flippersEnabled = on;
    this.setFlipper('left', this.buttons.left);
    this.setFlipper('right', this.buttons.right);
  }
  plungerPull(on) {
    const p = this.world.plunger;
    if (on) { if (!p.pulling) { p.pulling = true; this.fx('plungerPull'); } }
    else if (p.pulling) { p.release(this.world); this.fx('plungerRelease', { pull: p.pull }); }
  }
  nudge(dx, dy) {
    // Shoving the cabinet moves the playfield under the ball.
    const k = 1;
    for (const b of this.world.balls) {
      if (b.mode !== 'pf') continue;
      b.vx += dx * k * (0.85 + Math.random() * 0.3);
      b.vy += dy * k * (0.85 + Math.random() * 0.3);
    }
    this.shake.x += -dx * 0.012; this.shake.y += -dy * 0.012;
    this.tiltBob += 1.0;
    this.fx('nudge', { dx, dy });
    if (this.tiltBob > 2.25 && this.tiltWarnCooldown <= 0) {
      this.tiltWarnCooldown = 0.9;
      this.tiltBob = 1.0;
      this.sw('tilt', {});
    }
  }

  // --------------------------------------------------------------- devices
  ballsInPlay() { return this.world.balls.filter(b => b.mode !== 'gone').length + this.serveQueue; }
  ballsOnPlayfield() {
    return this.world.balls.filter(b => b.mode === 'pf' || b.mode === 'path').length;
  }
  shooterLaneBall() {
    return this.world.balls.find(b => b.mode === 'pf' && b.x > T.plunger.x0 && b.y > 30);
  }
  // Put a ball from the trough into the shooter lane (queued if the lane is busy)
  serveBall(auto = false) {
    this.serveQueue++;
    if (auto) this.autoLaunchPending++;
  }
  _tryServe() {
    if (this.serveQueue <= 0 || this.trough <= 0) return;
    if (this.shooterLaneBall()) return;
    if (this._serveAt && this.time < this._serveAt) return;
    this.serveQueue--; this.trough--;
    const b = this.world.addBall(SHOOTER_X, SHOOTER_REST_Y);
    this.fx('ballServe', { ball: b.id });
    this._serveAt = this.time + 0.4;
    if (this.autoLaunchPending > 0) {
      this.autoLaunchPending--;
      this.after(0.55, () => this.autoLaunch());
    }
  }
  autoLaunch() {
    if (this.world.plunger.fireAuto(this.world)) this.fx('autoLaunch');
  }
  capture(dev, b) {
    if (b.mode !== 'pf' || (b.noCaptureUntil && this.time < b.noCaptureUntil)) return;
    b.mode = 'held'; b.heldBy = dev; b.vx = 0; b.vy = 0;
    const p = dev === 'hideout' ? T.hideout : T.vault;
    b.x = p.x; b.y = p.y;
    for (const id of b.trig) if (id !== p.id + 'Cap') this.world.emit({ type: 'switch', id, on: false, ball: b.id });
    b.trig.clear();
    this.held[dev].push(b);
    this.world.emit({ type: 'captured', dev, ball: b.id });
  }
  heldCount(dev) { return this.held[dev].length; }
  eject(dev) {
    const b = this.held[dev].shift();
    if (!b) return false;
    b.heldBy = null;
    if (dev === 'hideout') {
      // vertical up-kicker onto the right wireform
      this.world.putOnPath(b, this.h.paths.vuk, 0.01, 150);
      b.mode = 'path';
      this.fx('vuk');
    } else {
      // the kicker fires the ball back out through the vault door
      const wasOpen = this.doorOpen;
      if (!this.dropsDown.every(Boolean)) this.dropAll(); // the lane must be clear below the vault
      if (!wasOpen) { this.setDoor(true); this.after(0.9, () => { if (!this.doorWanted) this.setDoor(false); }); }
      b.mode = 'pf';
      b.x = T.vault.ejectX + 0.55 + (Math.random() - 0.5) * 0.15; b.y = T.vault.ejectY;
      // aimed to land mid-way along the left flipper rather than straight down the middle
      b.vx = -3.2 - Math.random() * 1.6; b.vy = 46 + Math.random() * 10;
      b.noCaptureUntil = this.time + 0.6;
      this.lastVaultEject = this.time;
      this.fx('vaultKick');
    }
    return true;
  }
  resetDrops() {
    // never pop targets up under a ball in the vault lane or one being kicked out
    const blocked = this.world.balls.some(b => b.mode === 'pf' && b.x > 6.1 && b.x < 9.1 && b.y > 11.9 && b.y < 21.9) ||
      this.heldCount('vault') > 0 || this.time - (this.lastVaultEject ?? -9) < 1.2;
    if (blocked) { this.after(0.4, () => this.resetDrops()); return; }
    this.dropsDown = [false, false, false];
    this.h.drops.forEach(c => { c.enabled = true; });
    this.fx('dropReset');
  }
  dropAll() {
    this.dropsDown = [true, true, true];
    this.h.drops.forEach(c => { c.enabled = false; });
    this.fx('dropDown', { all: true });
  }
  // Rules express intent with openDoor/closeDoor; setDoor is the raw coil.
  openDoor() { this.doorWanted = true; this.setDoor(true); }
  closeDoor() { this.doorWanted = false; this.setDoor(false); }
  setDoor(open) {
    if (!open) {
      const blocked = this.world.balls.some(b => b.mode === 'pf' && b.x > 6.1 && b.x < 9.1 && b.y > 11.9 && b.y < 15.8);
      if (blocked) { this.after(0.3, () => this.setDoor(false)); return; }
    }
    if (this.doorOpen !== open) this.fx(open ? 'doorOpen' : 'doorClose');
    this.doorOpen = open;
    this.h.door.enabled = !open;
  }
  onKickbackLane(b) {
    if (!this.kickbackArmed || b.vy < 0) return;
    this.kickbackArmed = false;
    this.after(0.04, () => {
      if (b.mode !== 'pf') return;
      b.vx = (Math.random() - 0.5) * 6; b.vy = -T.kickback.speed * (0.95 + Math.random() * 0.08);
      this.fx('kickback');
      this.sw('kickbackFired', {});
    });
  }

  // ------------------------------------------------------------ simulation
  update(dt) {
    dt = Math.min(dt, 0.05);
    this.acc += dt;
    const h = PHYS.dt;
    while (this.acc >= h) {
      this.acc -= h;
      this.time += h;
      this.world.step(h);
      this.processEvents();
      if (this.timers.length) {
        for (let i = 0; i < this.timers.length; i++) {
          const t = this.timers[i];
          if (this.time >= t.at) { this.timers.splice(i--, 1); t.fn(); }
        }
      }
    }
    this._tryServe();
    this.tiltBob = Math.max(0, this.tiltBob - dt * 1.6);
    this.tiltWarnCooldown -= dt;
    this.shake.x *= Math.pow(0.02, dt); this.shake.y *= Math.pow(0.02, dt);
    this.ballSearch(dt);
  }

  processEvents() {
    const evs = this.world.drainEvents();
    for (const e of evs) {
      switch (e.type) {
        case 'switch':
          if (e.on) {
            if (e.id === 'spinnerLine' || e.id === 'hideoutCap' || e.id === 'vaultCap') break;
            this.sw(e.id, e);
          }
          this.fx('switch', e);
          break;
        case 'hit': {
          const id = e.id;
          if (id.startsWith('drop')) {
            const i = Number(id[4]) - 1;
            // only a hit on the face (from the playfield side) knocks a target down
            const front = e.y === undefined || e.y > T.drops[i].a[1];
            if (!this.dropsDown[i] && e.speed >= 9 && front) {
              this.dropsDown[i] = true;
              this.h.drops[i].enabled = false;
              this.fx('dropDown', { i });
              this.sw(id, e);
            }
          } else {
            this.sw(id, e);
            this.fx('hit', e);
          }
          break;
        }
        case 'kick':
          this.sw(e.id, e);
          this.fx('kick', e);
          break;
        case 'drain':
          this.world.removeBall(this.world.balls.find(b => b.id === e.ball) || {});
          this.trough++;
          this.fx('drain', e);
          this.sw('drain', e);
          break;
        case 'captured':
          this.fx('capture', e);
          this.sw(e.dev, e);
          break;
        default:
          this.fx(e.type, e);
      }
    }
  }

  // Ball search: if nothing has scored for a while, kick any ball that has
  // come to rest somewhere other than the shooter lane, a scoop or a cradle.
  ballSearch(dt) {
    for (const b of this.world.balls) {
      if (b.mode === 'path') {
        // last-resort: a ball can't live on a ramp forever
        b.pathTime = (b.pathTime || 0) + dt;
        if (b.pathTime > 8) { b.pathTime = 0; b.s = b.path.length; b.vs = 30; this.stats.rescues++; this.fx('ballSearch', { x: b.x, y: b.y }); }
        continue;
      }
      b.pathTime = 0;
      if (b.mode !== 'pf') { b.stillTime = 0; continue; }
      const cradled = b.contactFlipper && b.contactFlipper.pressed;
      const inShooter = b.x > T.plunger.x0;
      if (Math.hypot(b.vx, b.vy) < 1.5 && !cradled && !inShooter) b.stillTime += dt; else b.stillTime = 0;
      if (b.stillTime > 3.5) {
        b.stillTime = 0;
        if (b.x > 6.1 && b.x < 9.1 && b.y > 11.9 && b.y < 21.9) this.dropAll();
        const a = Math.random() * Math.PI * 2;
        b.vx += Math.cos(a) * 40; b.vy += -Math.abs(Math.sin(a)) * 40;
        this.stats.rescues++;
        this.fx('ballSearch', { x: b.x, y: b.y });
      }
    }
  }

  // Remove every ball (game over / reset)
  resetAll() {
    this.world.balls.length = 0;
    this.held = { hideout: [], vault: [] };
    this.trough = this.totalBalls;
    this.serveQueue = 0; this.autoLaunchPending = 0;
    this.timers = [];
    this.resetDrops();
    this.setDoor(false);
  }
}
