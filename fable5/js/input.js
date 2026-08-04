/* DRAGON'S KEEP — keyboard input. */
"use strict";
(function (g) {
  const DK = g.DK;

  const MAP = {
    ShiftLeft: "flipL", KeyZ: "flipL",
    ShiftRight: "flipR", Slash: "flipR", Period: "flipR",
    Enter: "plunge", NumpadEnter: "plunge", Space: "plunge", ArrowDown: "plunge",
    Digit1: "start", KeyS: "start",
    Digit5: "coin",
    ArrowLeft: "nudgeL", ArrowRight: "nudgeR", ArrowUp: "nudgeU",
    KeyP: "pause", Escape: "pause"
  };
  const SWALLOW = new Set(["Space", "ArrowDown", "ArrowLeft", "ArrowRight", "ArrowUp", "Slash", "Enter"]);

  DK.bindInput = function (game, hooks) {
    const down = new Set();
    g.addEventListener("keydown", (e) => {
      if (SWALLOW.has(e.code)) e.preventDefault();
      if (e.repeat) return;
      if (hooks && hooks.gesture) hooks.gesture();
      // high score direct typing
      if (game.state === "hiscore" && /^Key[A-Z]$/.test(e.code) && e.code !== "KeyS" &&
          e.code !== "KeyZ" && e.code !== "KeyP" && e.code !== "KeyM" && e.code !== "KeyH") {
        game.typeChar(e.code.slice(3)); return;
      }
      if (game.state === "hiscore" && e.code === "Backspace") { game.typeChar("BACKSPACE"); return; }
      if (e.code === "KeyM") { if (hooks && hooks.mute) hooks.mute(); return; }
      if (e.code === "KeyH") { if (hooks && hooks.help) hooks.help(); return; }
      const a = MAP[e.code];
      if (!a || down.has(e.code)) return;
      down.add(e.code);
      game.action(a, true);
    });
    g.addEventListener("keyup", (e) => {
      const a = MAP[e.code];
      if (!a) return;
      down.delete(e.code);
      // only release when no other key mapped to same action is held
      for (const code of down) if (MAP[code] === a) return;
      game.action(a, false);
    });
    g.addEventListener("blur", () => {
      for (const code of Array.from(down)) {
        const a = MAP[code];
        down.delete(code);
        game.action(a, false);
      }
    });
  };
})(typeof window !== "undefined" ? window : globalThis);
