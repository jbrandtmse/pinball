/* smoke test: launch, drain, flipper shot strength */
'use strict';
const U = require('../js/util.js');
const P = require('../js/physics.js');
const T = require('../js/table.js');

const W = new P.World();
const refs = T.build(W);
console.log('table:', JSON.stringify(T.validate(W)));

function run(seconds) {
  const dt = P.DT;
  const steps = Math.floor(seconds / dt);
  for (let i = 0; i < steps; i++) W.step(dt);
}

// Test 1: full-power launch traverses to left side and reaches flippers zone
{
  U.rng = U.makeRng(42);
  const b = W.addBall(19.18, 40.4);
  W.launchPlungerBall(b, 1.0);
  let spinner = false;
  W.em.on('sensor:spinner', () => { spinner = true; });
  run(16);
  console.log('T1 launch: spinner=', spinner, 'state=', b.state, 'capId=', b.capId,
    'pos=', b.x.toFixed(1) + ',' + b.y.toFixed(1));
}

// Test 2: ball dropped at flippers drains
{
  const b = W.addBall(10.1, 30);
  b.vy = 5;
  run(25);
  console.log('T2 drop: state=', b.state, 'capId=', b.capId);
}

// Test 3: flipper flip sends ball upward
{
  const b = W.addBall(8.8, 37.15); // in firm contact with flipper surface
  b.vx = 0; b.vy = 0;
  refs.flipL.pressed = true;
  let maxUp = 99;
  const dt = P.DT;
  for (let i = 0; i < 240 * 6; i++) {
    if (i === 24) refs.flipL.pressed = false;
    W.step(dt);
    if (b.state === 'free') maxUp = Math.min(maxUp, b.y);
  }
  console.log('T3 flip: highest point y =', maxUp.toFixed(1), '(start 36.95, good if < 22)');
}

// Test 3b: wedge check at the orbit-lane mouth post
{
  const b = W.addBall(2.1, 28.0);
  const sy = b.y; const sx = b.x;
  run(10);
  const moved = Math.hypot(b.x - sx, b.y - sy) > 1.5 || b.state !== 'free';
  console.log('T3b wedge: escaped =', moved, 'end', b.state, b.x.toFixed(1) + ',' + b.y.toFixed(1));
}

// Test 4: ramp captures — sweep shot angles from left flipper into left ramp
{
  let hits = 0, tries = 0;
  for (let a = 230; a <= 285; a += 2) { // degrees, screen space (y down, up is negative-y)
    const W2 = new P.World();
    const r2 = T.build(W2);
    const ang = a * Math.PI / 180;
    const b = W2.addBall(8.9, 37.3);
    const v = 85;
    b.vx = Math.cos(ang) * v; b.vy = Math.sin(ang) * v;
    let entered = false, exited = false;
    W2.em.on('rampEnter:rampL', () => { entered = true; });
    W2.em.on('rampExit:rampL', () => { exited = true; });
    const steps = 5 * 240;
    for (let i = 0; i < steps; i++) W2.step(P.DT);
    tries++;
    if (entered) hits++;
    if (a === 254) console.log('  sample a=254: entered', entered, 'exited', exited, 'end', b.state, b.x.toFixed(1) + ',' + b.y.toFixed(1));
  }
  console.log('T4 rampL sweep: entered', hits, '/', tries, 'angles');
}
