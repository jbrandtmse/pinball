/* ============================================================================
 * RAGNAROK PINBALL — input.js
 * Keyboard mapping in the style of a real cabinet: shifts are the flipper
 * buttons, space is the shooter rod, Z/X/C are the three nudge directions.
 * ==========================================================================*/
(function (PB) {
  'use strict';

  var I = PB.Input = {
    down: {},          // action -> bool
    pressed: {},       // action -> true for exactly one frame
    released: {},
    listeners: {},
    enabled: true
  };

  var MAP = {
    ShiftLeft: 'flipL', ArrowLeft: 'flipL', KeyA: 'flipL',
    ShiftRight: 'flipR', ArrowRight: 'flipR', KeyL: 'flipR',
    Space: 'plunge', ArrowDown: 'plunge',
    KeyZ: 'nudgeL', KeyC: 'nudgeR',
    KeyX: 'nudgeU', ArrowUp: 'nudgeU',
    Enter: 'start', NumpadEnter: 'start', Digit1: 'start', Numpad1: 'start',
    Digit5: 'coin', Numpad5: 'coin',
    Escape: 'pause', KeyP: 'pause',
    KeyH: 'hiscore',
    KeyM: 'mute',
    KeyF: 'fullscreen',
    F1: 'help', Slash: 'help',
    F3: 'debug',
    BracketLeft: 'slower', Minus: 'slower', NumpadSubtract: 'slower',
    BracketRight: 'faster', Equal: 'faster', NumpadAdd: 'faster',
    Backspace: 'back'
  };

  I.on = function (action, fn) {
    (this.listeners[action] || (this.listeners[action] = [])).push(fn);
  };
  I.emit = function (action, ev) {
    var l = this.listeners[action];
    if (!l) return;
    for (var i = 0; i < l.length; i++) l[i](ev);
  };

  function actionFor(e) {
    var a = MAP[e.code];
    if (a === 'help' && e.code === 'Slash' && !e.shiftKey) return null;
    return a || null;
  }

  I.init = function () {
    window.addEventListener('keydown', function (e) {
      if (!I.enabled) return;
      var a = actionFor(e);
      if (!a) return;
      if (e.code === 'Space' || e.code.indexOf('Arrow') === 0 || e.code === 'F1' || e.code === 'F3' ||
        e.code === 'Backspace' || e.code === 'Enter') e.preventDefault();
      if (e.repeat) return;
      I.down[a] = true;
      I.pressed[a] = true;
      I.emit(a, e);
    }, false);

    window.addEventListener('keyup', function (e) {
      var a = actionFor(e);
      if (!a) return;
      I.down[a] = false;
      I.released[a] = true;
      I.emit(a + ':up', e);
    }, false);

    window.addEventListener('blur', function () {
      for (var k in I.down) I.down[k] = false;
    }, false);
  };

  /** Call once per frame, after the game has read `pressed`. */
  I.endFrame = function () {
    for (var k in this.pressed) this.pressed[k] = false;
    for (var j in this.released) this.released[j] = false;
  };

  I.KEYMAP = MAP;

})(window.PB = window.PB || {});
