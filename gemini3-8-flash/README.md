# QUANTUM CORE: MELTDOWN — Williams Arcade Pinball

A realistic Williams WPC-style arcade pinball game built for the browser using Three.js, custom substep 2D/3D physics, an authentic 128x32 dot matrix display (DMD), and dynamic WebAudio sound effects.

## Quick Start

```sh
cd gemini3-8-flash
npm install
npm run dev
```

To build production bundle:

```sh
npm run build
npm run preview
```

## Controls

| Key | Action |
|---|---|
| **Left Shift** / **Z** | Left flipper |
| **Right Shift** / **/** | Right flipper |
| **Space** / **Down Arrow** (hold & release) | Charge & launch plunger |
| **Q** / **W** / **E** | Nudge left / center / right (watch for tilt!) |
| **1** / **Enter** | Start game |
| **C** | Toggle camera view (Player / Top-down / Dynamic) |
| **M** | Mute / Unmute sound |

Touch controls are also provided for mobile or mouse interactions.

## Table Features & Rules

- **C-O-R-E Lanes & Multipliers**: Rollover top lanes spell C-O-R-E with flipper lane-change to advance the bonus multiplier (up to 10X).
- **Coolant Drop Targets**: Drop target banks cool down the Quantum Core reactor.
- **Reactor Core Meltdown Multiball**: Lock balls in the containment scoops to initiate 3-Ball Multiball with high-stakes Jackpots and Super Jackpots.
- **Ramps & Wireforms**: Particle accelerator left and right ramps with wireform habitrail feeds back to the inlanes.
- **Kickback**: Left outlane magnetic kickback to prevent untimely drains when lit.
- **DMD & Sound**: Orange dot-matrix animations, procedural retro sound effects, voice callouts, and local high score tracking.
