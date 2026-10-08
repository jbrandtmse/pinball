# Neon Quest Pinball

A Williams-style arcade pinball game built with HTML5 Canvas and Matter.js physics engine.

## Features

### Core Gameplay
- **Realistic Physics**: Powered by Matter.js with tuned restitution, friction, and gravity for authentic pinball behavior
- **Classic Flipper Controls**: Arrow keys or Z/X for flipper activation with smooth animation
- **Ball Launch**: Spacebar launches ball from the right-side launch chute
- **High Score System**: Local storage persistence for best scores

### Williams-Style Elements

#### Playfield Features
- **4 Pop Bumpers**: 3 main bumpers + 1 top bumper in classic triangular formation
- **4 Standup Targets**: Clear all targets for multiball readiness
- **2 Slingshots**: Super restorative (1.5x bounce) like classic Williams machines
- **Ramp System**: Left and right ramps with middle divider
- **Diamond Obstacle**: Central playfield element for variety
- **Lock Positions**: 2 ball lock positions for multiball activation

#### Gameplay Systems
- **Ball Save**: 25-second protected window after launch
- **Multiball**: Lock 2 balls, then hit a ramp to activate
  - Scores 500 bonus points on activation
  - Extra ball released from lock position
  - "JACKPOTS AWAIT!" mode active
- **Tilt System**: Maximum 3 nudges before tilt warning
- **Stuck Ball Prevention**: Auto-nudge for balls that stop moving

### Keyboard Controls

| Key | Action |
|-----|--------|
| Left Arrow / Z | Left flipper |
| Right Arrow / X | Right flipper |
| Space | Launch ball |
| A | Nudge left |
| D | Nudge right |
| Up Arrow | Nudge up |
| Down Arrow | Nudge down |
| R | Restart game |

### Scoring

| Element | Points |
|---------|--------|
| Pop Bumper | 100 |
| Top Bumper | 150 |
| Slingshot | 50 |
| Standup Target | 25 |
| Ramp Hit | 75-100 |
| Rollover | 10 |
| Diamond | 30 |
| Flipper Hit | 50 |
| Multiball Bonus | 500 |

## Running the Game

```bash
npm start
```

Then open http://localhost:3000 in your browser.

## Technology Stack

- **Rendering**: HTML5 Canvas
- **Physics**: Matter.js 0.19.0
- **No Frameworks**: Pure JavaScript implementation

## Design Notes

The game features a neon retro aesthetic inspired by 80s-90s Williams arcade machines:
- Dark playfield with cyan neon accents
- Glowing bumpers with radial gradients
- 3D ball rendering with highlights
- Visual feedback for hits and bonuses
- Clean, minimal UI with score display

## File Structure

- `index.html` - Main HTML structure and styling
- `game.js` - Complete game logic, physics, and rendering
- `package.json` - Node.js configuration for serving

## Author

Created as a fresh concept with original architecture and design.
