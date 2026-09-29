// A simple pinball-playing bot used by the headless tests. It watches every
// ball's predicted position and flips when one is about to cross a flipper.
import { PHYS } from '../src/sim/physics.js';
export class AutoPlayer {
  constructor(machine, opts = {}) {
    this.m = machine; this.hold = { left: 0, right: 0 };
    this.skill = opts.skill ?? 0.9;         // chance to react to a ball in the zone
    this.cradleChance = opts.cradle ?? 0.35;
    this.rand = opts.rand || Math.random;
    this.plungeAt = null; this.cradle = { left: null, right: null };
  }
  update(dt) {
    const m = this.m, w = m.world;
    for (const side of ['left', 'right']) {
      const f = m.h.flippers[side === 'left' ? 'flipL' : 'flipR'];
      let want = false;
      for (const b of w.balls) {
        if (b.mode !== 'pf') continue;
        const px = b.x + b.vx * 0.03, py = b.y + b.vy * 0.03;
        const o = {};
        const d = f.distance(px, py, o);
        const dNow = f.distance(b.x, b.y, o);
        const along = o.along;
        const zone = d < PHYS.ballR + 0.35 && along > 0.5 && py > f.py - 2.2;
        const cr = this.cradle[side];
        if (cr && cr.ball === b) {
          // cradle then release and re-flip to aim
          cr.t += dt;
          if (cr.t < cr.hold) want = true;
          else if (cr.t > cr.hold + cr.delay && cr.t < cr.hold + cr.delay + 0.25) want = true;
          else if (cr.t > cr.hold + cr.delay + 0.3) this.cradle[side] = null;
          continue;
        }
        const slow = Math.hypot(b.vx, b.vy) < 25 && dNow < PHYS.ballR + 0.2;
        if (slow && f.pressed && this.rand() < this.cradleChance * dt * 10) {
          this.cradle[side] = { ball: b, t: 0, hold: 0.4 + this.rand() * 0.6, delay: 0.35 + this.rand() * 0.5 };
          want = true;
        }
        if (zone && (b.vy > -5 || dNow < PHYS.ballR + 0.1) && this.rand() < this.skill) want = true;
      }
      if (want) this.hold[side] = 0.18;
      this.hold[side] -= dt;
      m.setFlipper(side, this.hold[side] > 0);
    }
    // plunge
    const sb = m.shooterLaneBall();
    if (sb && Math.hypot(sb.vx, sb.vy) < 1) {
      if (this.plungeAt === null) { this.plungeAt = 0.4 + this.rand() * 0.6; this.pullFor = 0.15 + this.rand() * 1.0; this.pt = 0; }
      this.pt += dt;
      if (this.pt > this.plungeAt) m.plungerPull(true);
      if (this.pt > this.plungeAt + this.pullFor) { m.plungerPull(false); this.plungeAt = null; }
    }
  }
}
