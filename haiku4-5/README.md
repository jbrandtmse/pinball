# Space Station Pinball - Williams Style

A fully functional 3D Williams-style arcade pinball game built with Babylon.js featuring realistic physics, amazing graphics, and authentic gameplay mechanics.

## Features

### Graphics & Visuals
- **3D Rendering**: Built with Babylon.js for stunning 3D graphics
- **Authentic Layout**: Proper Williams pinball machine dimensions and 6.5° playfield tilt
- **Dynamic Lighting**: Multiple light sources with glow effects on game elements
- **Space Station Theme**: Sci-fi inspired arcade cabinet design
- **Arcade UI**: Classic neon green terminal-style interface with score display

### Gameplay Mechanics
- **Two Main Flippers**: Left and right flippers for ball control
- **Upper Right Flipper**: Strategic flipper for accessing ramps and upper targets
- **Four Bumpers**: Yellow scoring bumpers with dynamic glow effects
- **Four Targets**: Mix of standup and drop targets for strategic play
- **Two Ramps**: Orange ramps for advanced scoring and combo building
- **Multiball Feature**: Triggered by completing targets/ramps, 5x score multiplier
- **Ball Physics**: Realistic gravity, friction, bouncing, and collisions
- **3 Balls Per Game**: Classic pinball format

### Scoring System
- **Bumpers**: 250 points per hit (1,250 in multiball)
- **Targets**: 500 points first hit (2,500 in multiball)
- **Ramps**: 1,000 points per completion (5,000 in multiball)
- **High Score Tracking**: Persistent high score saved locally
- **Score Multiplier**: 5x multiplier during multiball mode

### Controls
| Key | Action |
|-----|--------|
| **Z** | Left Flipper |
| **M** | Right Flipper |
| **Space** | Launch Ball (hold 0-0.4 seconds for power charging) |
| **Q** | Quit Game |

## Installation & Running

### Prerequisites
- Node.js (v14 or higher)
- npm (included with Node.js)

### Setup
```bash
cd C:\git\pinball
npm install
npm start
```

The game will start on `http://localhost:8080`

### Playing
1. Open browser to http://localhost:8080
2. Press **Space** to launch the first ball (hold longer for more power)
3. Use **Z** and **M** keys to control flippers
4. Try to:
   - Hit bumpers for quick points
   - Complete target sequences
   - Navigate ramps for big scores
   - Trigger multiball for 5x points!

## Technical Details

### Architecture
- **Engine**: Babylon.js 6.0.0 (3D rendering)
- **Physics**: Custom physics engine (no external physics plugin dependency)
- **Language**: Vanilla JavaScript
- **Server**: Express.js (simple file serving)

### Key Components
- `game.js`: Main game class with all gameplay logic
- `index.html`: Game container and UI
- `server.js`: Development server

### Physics Engine
- Custom implementation using vector math
- Gravity simulation with adjustable strength
- Friction and air resistance for realistic ball movement
- Collision detection for all game elements
- Bouncing with energy loss simulation

### Lighting System
- Ambient hemisphere light for base illumination
- Main spotlight for playfield focus
- Colored point lights for atmosphere
- Glow layer for scoring element highlights

## Gameplay Tips

1. **Launch Power**: Hold Space for 0.2-0.4 seconds for more launch power
2. **Target Chains**: Hitting 3+ targets triggers multiball
3. **Ramp Strategy**: Completing both ramps (2 total) also triggers multiball
4. **Multiball Madness**: All scores are 5x during multiball - make every shot count!
5. **Ball Control**: Use early flipper hits for better trajectory control
6. **Bumper Bounces**: Bumpers add momentum - use them to guide the ball

## High Score Challenge

Default high score: 0  
Current challenge: Can you break 50,000 points?  
Elite score: 100,000+ points

High scores are automatically saved in your browser's local storage.

## Game Features Implemented

✅ **Core Gameplay**
- Ball physics and collisions
- Flipper mechanics
- Ball launch system
- Game over detection
- Ball drain mechanism

✅ **Scoring**
- Point system for bumpers/targets/ramps
- Score multiplier (multiball)
- High score tracking
- Real-time score display

✅ **Advanced Features**
- Multiball (3 balls)
- Score multiplier (5x)
- Target completion tracking
- Ramp completion tracking
- Dynamic visual feedback

✅ **User Interface**
- Score display
- Balls remaining counter
- High score display
- Multiball indicator
- Game over screen
- Control instructions

✅ **Visual Polish**
- 3D rendered playfield
- Realistic lighting
- Glow effects on targets/bumpers
- Arcade-style UI
- Color-coded game elements

## File Structure

```
C:\git\pinball\
├── index.html          # Game HTML container
├── game.js            # Main game logic
├── server.js          # Express server
├── package.json       # Dependencies
├── README.md          # This file
├── prompt.md          # Original requirements
└── node_modules/      # Dependencies
```

## Browser Compatibility

- Chrome/Chromium (recommended)
- Edge
- Firefox
- Safari

Best performance on modern browsers with WebGL 2 support.

## Development Notes

### Extending the Game

To add new features:

1. **New Game Elements**: Add mesh creation in `createScene()` methods
2. **New Targets**: Follow the pattern in `createTargets()`
3. **Scoring Rules**: Modify `addScore()` calls in `updateCollisions()`
4. **Physics**: Adjust gravity, friction, and collision parameters

### Physics Tuning

Current physics parameters (in game.js):
- `gravity = 25` (acceleration due to gravity)
- `airResistance = 0.98` (friction coefficient)
- Bounce elasticity varies by collision type

### Performance

- Optimized for 60 FPS gameplay
- DeltaTime capped at 16.67ms to prevent physics instability
- Lazy object disposal to prevent memory leaks
- Glow layer limited to game elements only

## Known Limitations

- Ball visibility is enhanced but may require camera adjustment in some browser configurations
- No sound effects (planned enhancement)
- Single-player only (multiplayer not implemented)
- No difficulty levels (same physics for all games)

## Future Enhancements

- [ ] Sound effects and music
- [ ] Different difficulty levels
- [ ] Bonus modes and missions
- [ ] Additional bumpers/targets
- [ ] Multiplayer support (splitscreen or networked)
- [ ] Leaderboard integration
- [ ] Mobile/touch controls
- [ ] Custom themes

## Credits

Built with:
- [Babylon.js](https://www.babylonjs.com/) - 3D engine
- [Express.js](https://expressjs.com/) - Server framework
- Williams Electronics Games inspiration - Classic pinball machine design

## License

Open source - feel free to modify and extend!

## Troubleshooting

**Q: Ball is invisible or hard to see?**  
A: The ball is rendered in red with glow effects. Try adjusting your screen brightness or checking that WebGL is enabled.

**Q: Game won't start?**  
A: Make sure you've run `npm install` and that the server is running on port 8080.

**Q: Physics feel wrong?**  
A: Try adjusting the `gravity` parameter in game.js (default: 25). Higher values = stronger gravity.

**Q: Flippers aren't responding?**  
A: Make sure you're using Z and M keys, not arrow keys. Check that your browser has keyboard focus on the game.

---

**Enjoy the game! Try to beat the high score! 🎮🕹️**
