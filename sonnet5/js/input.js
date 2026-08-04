// Keyboard bindings. Multiple keys alias to the same logical action so players can use
// whichever convention they already know (Visual-Pinball-style Shift keys, or WASD-ish
// Z//). Flippers/plunger use held-state; nudges/menu actions are edge-triggered.
const Input = {
  KEYMAP: {
    leftFlipper: ['ShiftLeft', 'KeyZ'],
    rightFlipper: ['ShiftRight', 'Slash'],
    plunger: ['Enter', 'Space'],
    nudgeLeft: ['ArrowLeft'],
    nudgeRight: ['ArrowRight'],
    nudgeUp: ['ArrowUp'],
    pause: ['KeyP'],
    mute: ['KeyM'],
    p1: ['Digit1'], p2: ['Digit2'], p3: ['Digit3'], p4: ['Digit4'],
  },

  keys: new Set(),
  justPressed: new Set(),
  justReleased: new Set(),
  _allCodes: null,
  _initialized: false,

  init() {
    if (this._initialized) return;
    this._initialized = true;
    this._allCodes = new Set(Object.values(this.KEYMAP).flat());

    window.addEventListener('keydown', (e) => {
      SFX.resume();
      if (this._allCodes.has(e.code)) e.preventDefault();
      if (!this.keys.has(e.code)) this.justPressed.add(e.code);
      this.keys.add(e.code);
    }, { passive: false });

    window.addEventListener('keyup', (e) => {
      if (this._allCodes.has(e.code)) e.preventDefault();
      this.keys.delete(e.code);
      this.justReleased.add(e.code);
    }, { passive: false });

    window.addEventListener('blur', () => { this.keys.clear(); });
  },

  isDown(action) { return this.KEYMAP[action].some(k => this.keys.has(k)); },
  pressed(action) { return this.KEYMAP[action].some(k => this.justPressed.has(k)); },
  released(action) { return this.KEYMAP[action].some(k => this.justReleased.has(k)); },

  endFrame() { this.justPressed.clear(); this.justReleased.clear(); },
};
