// Builds the physics World from the table layout.
import {
  World, Flipper, Path, Spinner, Plunger, PHYS,
  segment, circle, arc, rolloverTrigger, lineTrigger,
} from '../sim/physics.js';
import T from './layout.js';

function polyline(world, pts, opts, closed = false) {
  const out = [];
  const n = pts.length;
  for (let i = 0; i < (closed ? n : n - 1); i++) {
    const a = pts[i], b = pts[(i + 1) % n];
    out.push(world.add(segment(a[0], a[1], b[0], b[1], opts)));
  }
  return out;
}

// Plunger strength curve: a broad "soft" zone for skill shots, then a steep
// ramp up to a full-power plunge that loops the ball around the top arch.
export function plungerSpeed(p) {
  if (p < 0.1) return 40 + 90 * p;                        // dribble: falls back to the right orbit
  if (p < 0.5) return 49 + (p - 0.1) / 0.4 * 4.5;         // soft zone: crests the arch into K-E-Y lanes
  return 53.5 + Math.pow((p - 0.5) / 0.5, 1.3) * 186.5;   // loops the arch and down the left orbit
}

export function buildWorld() {
  const world = new World(T.W, T.L);
  const h = {}; // handles

  for (const w of T.walls) polyline(world, w.pts, { mat: w.mat });
  world.add(arc(T.arch.cx, T.arch.cy, T.arch.r, T.arch.a0, T.arch.a1, { inside: true, mat: 'metal' }));
  for (const s of T.solids) polyline(world, s.pts, { mat: s.mat }, true);

  for (const p of T.posts) world.add(circle(p.x, p.y, p.r, { mat: p.mat, id: null }));
  for (const g of T.laneGuides) world.add(segment(g.x, g.y0, g.x, g.y1, { r: g.r, mat: 'metal' }));

  // Slingshots: rubber band capsules; the middle of the kicking face fires the kicker.
  h.slings = {};
  for (const s of T.slings) {
    const { A, C, D, postR, lower } = s;
    world.add(segment(A[0], A[1], C[0], C[1], { r: postR, mat: 'metal' }));
    for (let i = 0; i < lower.length - 1; i++) {
      world.add(segment(lower[i][0], lower[i][1], lower[i + 1][0], lower[i + 1][1], { r: postR, mat: 'metal' }));
    }
    const lerp = (t) => [A[0] + (D[0] - A[0]) * t, A[1] + (D[1] - A[1]) * t];
    const a1 = lerp(0.14), d1 = lerp(0.86);
    world.add(segment(A[0], A[1], a1[0], a1[1], { r: postR, mat: 'rubber' }));
    world.add(segment(d1[0], d1[1], D[0], D[1], { r: postR, mat: 'rubber' }));
    h.slings[s.id] = world.add(segment(a1[0], a1[1], d1[0], d1[1], {
      r: postR, mat: 'rubber', id: s.sw, hitMin: 14,
      kick: { speed: 128, minVn: 14, cooldown: 0.13, jitter: 0.12 },
    }));
  }

  // Pop bumpers
  h.bumpers = {};
  for (const b of T.bumpers) {
    h.bumpers[b.id] = world.add(circle(b.x, b.y, b.r, {
      mat: 'bumper', id: b.id, hitMin: 0,
      kick: { speed: 118, minVn: 0, cooldown: 0.05, jitter: 0.14 },
    }));
  }

  // Drop targets
  h.drops = T.drops.map(d => world.add(segment(d.a[0], d.a[1], d.b[0], d.b[1], { r: d.r, mat: 'target', id: d.id, hitMin: 9 })));

  // Standup targets
  h.standups = T.standups.map(t => world.add(segment(t.a[0], t.a[1], t.b[0], t.b[1], { r: 0.1, mat: 'target', id: t.id, hitMin: 6 })));

  // Vault door
  const vd = T.vaultDoor;
  h.door = world.add(segment(vd.a[0], vd.a[1], vd.b[0], vd.b[1], { r: vd.r, mat: 'door', id: 'vaultDoor', hitMin: 6 }));

  // Gates
  h.gates = T.gates.map(g => world.add(segment(g.a[0], g.a[1], g.b[0], g.b[1], { mat: 'gate', pass: g.pass, id: g.id })));

  // Flippers
  h.flippers = {};
  for (const f of T.flippers) h.flippers[f.id] = world.addFlipper(new Flipper(f));

  // Rollover triggers
  h.triggers = {};
  for (const r of T.rollovers) h.triggers[r.id] = world.addTrigger(rolloverTrigger(r.id, r.x, r.y, r.r));

  // Spinner
  const sp = T.spinner;
  h.spinner = new Spinner(sp.id, sp.a[0], sp.a[1], sp.b[0], sp.b[1]);
  world.spinners.push(h.spinner);
  world.addTrigger(lineTrigger('spinnerLine', sp.a[0], sp.a[1], sp.b[0], sp.b[1], {
    onCross: (b) => { h.spinner.hitBy(Math.abs(b.vy)); b.vx *= 0.97; b.vy *= 0.96; },
  }));

  // Ramps
  h.paths = {};
  for (const id of ['rampL', 'rampR']) {
    const R = T.ramps[id];
    const path = world.addPath(new Path(id, R.pts, {
      friction: 5,
      switches: [{ id: id + 'Made', at: R.madeAt }],
      maxExitSpeed: 45, // habitrails drop the ball into the inlane gently
    }));
    h.paths[id] = path;
    const m = R.mouth;
    world.addTrigger(lineTrigger(id + 'Enter', m.a[0], m.a[1], m.b[0], m.b[1], {
      dirSign: -1,
      onCross: (b, w) => {
        const t = path.at(0.01);
        const L = Math.hypot(t.tx, t.ty) || 1;
        const vs = Math.max(0, (b.vx * t.tx + b.vy * t.ty) / L);
        w.putOnPath(b, path, 0.02, vs * 0.97);
        w.emit({ type: 'rampEnter', id, ball: b.id, speed: vs });
      },
    }));
  }
  // Orbit returns: balls travelling down an orbit ride a wireform to the inlane
  for (const id of ['returnL', 'returnR']) {
    const R = T.ramps[id];
    const path = world.addPath(new Path(id, R.pts, { friction: 3, maxExitSpeed: 40 }));
    h.paths[id] = path;
    const g = R.gate;
    world.addTrigger(lineTrigger(id + 'Gate', g.a[0], g.a[1], g.b[0], g.b[1], {
      dirSign: 1,
      onCross: (b, w) => {
        const vs = Math.max(25, b.vy * 0.9);
        w.putOnPath(b, path, 0.02, vs);
        w.emit({ type: 'orbitReturn', id, ball: b.id, speed: vs });
      },
    }));
  }

  // Hideout up-kicker path joins the right wireform
  const V = T.ramps.vuk;
  const vuk = world.addPath(new Path('vuk', V.pts, { friction: 2 }));
  const rr = h.paths.rampR;
  let best = 0, bestD = 1e9;
  for (const smp of rr.samples) {
    const d = Math.hypot(smp.x - V.pts[V.pts.length - 1][0], smp.y - V.pts[V.pts.length - 1][1]);
    if (d < bestD) { bestD = d; best = smp.s; }
  }
  vuk.next = { path: rr, s: best, speedScale: 0.5 };
  h.paths.vuk = vuk;

  // Capture zones (the machine decides what to do with a captured ball)
  h.captures = {};
  h.captures.hideout = world.addTrigger(rolloverTrigger('hideoutCap', T.hideout.x, T.hideout.y, T.hideout.r));
  h.captures.vault = world.addTrigger(rolloverTrigger('vaultCap', T.vault.x, T.vault.y, T.vault.r));

  // Plunger
  world.plunger = h.plunger = new Plunger({
    x0: T.plunger.x0, x1: T.plunger.x1, y: T.plunger.y, speedFn: plungerSpeed, autoSpeed: 175,
  });

  world.drainTest = (b) => b.y > T.drainY && b.x < 18.6;
  return { world, h };
}

export { T as layout, PHYS };
