// THUNDER CANYON — keyboard input state machine.
// Controls: Left Shift / Z = left flipper · Right Shift / / = right flipper
// Space = plunger (hold & release) · Enter = start / confirm · P = pause
// M = mute · A / D = nudge left / right · Arrows = menus

const INPUT = {
  left: false, right: false, plungerDown: false,
  start: false, pause: false, mute: false,
  nudgeL: false, nudgeR: false,
  enterJust: false, pauseJust: false, muteJust: false,
  startJust: false,
  nudgeLJust: false, nudgeRJust: false,
  leftArrow: false, rightArrow: false, upArrow: false, downArrow: false,
  leftJust: false, rightJust: false, upJust: false, downJust: false,
  backJust: false,
};

INPUT.bind = function (target = window) {
  const down = (e) => {
    const k = e.code;
    if (['Space', 'Enter', 'ArrowLeft', 'ArrowRight', 'ArrowUp', 'ArrowDown', 'Slash', 'ShiftLeft', 'ShiftRight', 'KeyA', 'KeyD', 'KeyZ', 'KeyP', 'KeyM'].includes(k))
      e.preventDefault();
    switch (k) {
      case 'ShiftLeft': case 'KeyZ':
        if (!INPUT.left) INPUT.leftJust = true;
        INPUT.left = true; break;
      case 'ShiftRight': case 'Slash':
        if (!INPUT.right) INPUT.rightJust = true;
        INPUT.right = true; break;
      case 'Space':
        if (!INPUT.plungerDown) INPUT.plungerJust = true;
        INPUT.plungerDown = true; break;
      case 'Enter':
        if (!INPUT.enter) INPUT.enterJust = true;
        INPUT.enter = true; break;
      case 'KeyP': INPUT.pauseJust = true; break;
      case 'KeyM': INPUT.muteJust = true; break;
      case 'KeyA': INPUT.nudgeLJust = true; break;
      case 'KeyD': INPUT.nudgeRJust = true; break;
      case 'ArrowLeft': if (!INPUT.leftArrow) INPUT.leftArrJust = true; INPUT.leftArrow = true; break;
      case 'ArrowRight': if (!INPUT.rightArrow) INPUT.rightArrJust = true; INPUT.rightArrow = true; break;
      case 'ArrowUp': INPUT.upJust = true; break;
      case 'ArrowDown': INPUT.downJust = true; break;
      case 'Backspace': INPUT.backJust = true; break;
    }
  };
  const up = (e) => {
    switch (e.code) {
      case 'ShiftLeft': case 'KeyZ': INPUT.left = false; break;
      case 'ShiftRight': case 'Slash': INPUT.right = false; break;
      case 'Space': INPUT.plungerDown = false; break;
      case 'Enter': INPUT.enter = false; break;
      case 'ArrowLeft': INPUT.leftArrow = false; break;
      case 'ArrowRight': INPUT.rightArrow = false; break;
    }
  };
  target.addEventListener('keydown', down);
  target.addEventListener('keyup', up);
};

INPUT.clearJusts = function () {
  INPUT.enterJust = INPUT.pauseJust = INPUT.muteJust = false;
  INPUT.nudgeLJust = INPUT.nudgeRJust = false;
  INPUT.leftJust = INPUT.rightJust = false;
  INPUT.leftArrJust = INPUT.rightArrJust = INPUT.upJust = INPUT.downJust = false;
  INPUT.plungerJust = false; INPUT.backJust = false;
};

if (typeof module !== 'undefined' && module.exports) module.exports = INPUT;
if (typeof window !== 'undefined') window.INPUT = INPUT;
