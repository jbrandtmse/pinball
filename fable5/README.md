# DRAGON'S KEEP

A complete, playable Williams-style pinball machine in the browser. Zero
dependencies, no build step — open `index.html` in any modern browser
(Chrome/Edge/Firefox) and press **1**.

Medieval theme in the spirit of the great late-90s Williams tables: storm the
castle, lock balls, battle trolls, and claim the crown.

## Controls

| Key | Action |
| --- | --- |
| **1** or **S** | Start game / add player (up to 4, during ball 1) |
| **Left Shift** / **Z** | Left flipper |
| **Right Shift** / **/** | Right flipper |
| **Enter** / **Space** / **Down** | Pull plunger (hold), release to launch |
| **Arrow keys** | Nudge left / right / up — 3 warnings = TILT |
| **M** | Mute |
| **P** / **Esc** | Pause |
| **H** | How-to-play overlay |
| **5** | Coin (free play is on by default) |

Hold the **left flipper** while launching for the super skill shot
(then shoot the castle within 5 seconds).

## The game

Real Williams proportions: 20.25" x 42" playfield, 1-1/16" ball, ~3" flippers
with a just-over-one-ball tip gap, 6.5-degree effective pitch, and a 128x32
amber plasma DMD in the backbox.

**Layout** — left orbit with spinner, left ramp and right ramp on crossing
wireforms, catapult kicker that flings the ball across the table, castle bash
toy (drawbridge, portcullis gate, ball lock), two pop-up trolls, 3 pop
bumpers, top K-E-Y rollover lanes with lane change, center J-S-T drop target
bank, wizard's den scoop, dragon standup, slingshots, inlanes/outlanes, and a
wire-gate kickback that fires the ball all the way around the left orbit.

**Rules** —

- **Castle**: bash the gate to lower the drawbridge, open the gate, then
  shoot inside to destroy the castle and lock a ball. Destroy 3 castles for
  **Castle Multiball** (3 balls; jackpots on ramps/orbits, super jackpot at
  the lock). Each castle takes more hits than the last.
- **Quests** (started at the wizard's den): Joust, Rescue the Damsel, Troll
  War, Catapult Siege, and Dragon Hunt (roving shot). Timed, with escalating
  values.
- **Catapult**: three slams light **Catapult Multiball** (2 balls).
- **Wizard mode**: all 5 quests + 3 castles + a multiball played →
  **BATTLE FOR THE KINGDOM**: 4-ball multiball; collect all 8 kingdom shots
  for 25,000,000 and an extra ball.
- Skill shot (flashing top lane), combos, bonus multiplier via K-E-Y lanes,
  hurry-ups, extra balls, ball save, kickback (re-armed at the dragon
  standup), tilt, end-of-ball bonus, match sequence, replay at 40M, and a
  Grand Champion + 4 high score table with initials entry (persisted in
  localStorage).

## Architecture

Plain script files, shared between browser and Node:

- `js/constants.js` — dimensions (real-machine scale), physics constants, scoring
- `js/physics.js` — 720 Hz substepped solver: capsule/circle colliders,
  one-way gates, sensors, rotating-capsule flippers with surface velocity,
  ball-ball collisions, rolling friction
- `js/layout.js` — the table: every wall, lane, toy, sensor and lamp
- `js/game.js` — the WPC-style ruleset and state machine
- `js/dmdfont.js`, `js/dmd.js` — 128x32 DMD framebuffer, font, scene queue
- `js/render.js` — canvas renderer (cached static art + dynamic toys,
  lamps, particles, DMD, backbox)
- `js/audio.js` — WebAudio synth (all SFX + medieval music loop, no assets)
- `js/input.js`, `js/main.js` — keyboard, main loop, debug API (`window.PB`)

## Testing

```
node test/headless.js          # scenario tests + 3 autoplayed games
node test/headless.js --long   # 6 autoplayed games
node test/corridors.js         # static shot-corridor clearance check
```

The headless rig plays complete games with an autoplayer and asserts: no
NaN/out-of-bounds, ball accounting, no stuck balls, every major shot
physically reachable from the flippers, the full castle → locks → multiball
flow, tilt, and high-score entry. Current status: ~520k checks, 0 failures.
