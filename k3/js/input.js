// NOVA STRIKE — keyboard input.
// Left flipper:  Left Shift / Z
// Right flipper: Right Shift / /  (and . )
// Plunger:       Down / Space (hold to charge, release to launch)
// Nudge:         Left / Right / Up arrows
// Start:         Enter    Pause: P    Mute: M

export class Input {
  constructor() {
    this.left = false;
    this.right = false;
    this.plungerHeld = false;
    this.handlers = {};       // event name -> fn
    window.addEventListener('keydown', (e) => this.onKey(e, true));
    window.addEventListener('keyup', (e) => this.onKey(e, false));
  }

  on(name, fn) { this.handlers[name] = fn; }
  emit(name, arg) { this.handlers[name]?.(arg); }

  onKey(e, down) {
    const c = e.code;
    const grab = ['ShiftLeft', 'ShiftRight', 'KeyZ', 'Slash', 'Period',
      'ArrowDown', 'ArrowUp', 'ArrowLeft', 'ArrowRight', 'Space', 'Enter'];
    if (grab.includes(c)) e.preventDefault();

    switch (c) {
      case 'ShiftLeft': case 'KeyZ':
        if (down !== this.left) { this.left = down; this.emit('flipper', { side: -1, down }); }
        break;
      case 'ShiftRight': case 'Slash': case 'Period':
        if (down !== this.right) { this.right = down; this.emit('flipper', { side: 1, down }); }
        break;
      case 'ArrowDown': case 'Space':
        if (down && !this.plungerHeld) { this.plungerHeld = true; this.emit('plungerDown'); }
        else if (!down && this.plungerHeld) { this.plungerHeld = false; this.emit('plungerUp'); }
        break;
      case 'ArrowLeft': if (down && !e.repeat) this.emit('nudge', 'left'); break;
      case 'ArrowRight': if (down && !e.repeat) this.emit('nudge', 'right'); break;
      case 'ArrowUp': if (down && !e.repeat) this.emit('nudge', 'up'); break;
      case 'Enter': if (down && !e.repeat) this.emit('start'); break;
      case 'KeyP': if (down && !e.repeat) this.emit('pause'); break;
      case 'KeyM': if (down && !e.repeat) this.emit('mute'); break;
      case 'Backspace': if (down && !e.repeat) this.emit('back'); break;
    }
  }
}
