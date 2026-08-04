/* DRAGON'S KEEP — bootstrap & main loop. */
"use strict";
(function (g) {
  const DK = g.DK; const C = DK.C;

  function boot() {
    const world = new DK.Physics.World();
    const layout = DK.Layout.build(world);
    const storage = {
      load() {
        try { return JSON.parse(localStorage.getItem("dragonskeep.scores.v1")); }
        catch (e) { return null; }
      },
      save(o) {
        try { localStorage.setItem("dragonskeep.scores.v1", JSON.stringify(o)); }
        catch (e) { /* private mode */ }
      }
    };
    const game = new DK.Game({ world, layout, storage, rng: Math.random });
    const canvas = document.getElementById("game");
    const render = new DK.Render(canvas, game, world, layout);
    const audio = new DK.Audio();

    DK.bindInput(game, {
      gesture() { audio.init(); audio.resume(); },
      mute() { render.toast(audio.toggleMute() ? "MUTED" : "SOUND ON"); },
      help() { render.helpOn = !render.helpOn; }
    });

    let last = performance.now();
    let fps = 60, fpsAcc = 0, fpsN = 0;
    function frame(now) {
      let dt = (now - last) / 1000;
      last = now;
      if (dt > C.MAX_FRAME) dt = C.MAX_FRAME;
      fpsAcc += dt; fpsN++;
      if (fpsAcc > 0.5) { fps = fpsN / fpsAcc; fpsAcc = 0; fpsN = 0; }
      render.fps = fps;

      game.update(dt);
      // drain sound queue
      for (const s of game.sfxQ) audio.play(s.name, s);
      game.sfxQ.length = 0;
      audio.update(game.musicMode);
      render.draw(dt);
      requestAnimationFrame(frame);
    }
    document.getElementById("boot").remove();
    requestAnimationFrame(frame);

    document.addEventListener("visibilitychange", () => {
      if (document.hidden && game.state === "playing" && !game.paused) game.action("pause", true);
    });

    // debug / test API
    g.PB = {
      game, world, layout, render, audio,
      state: () => ({
        state: game.state, score: game.p ? game.p.score : 0, ball: game.ballNum,
        balls: world.balls.length, fps: Math.round(fps)
      }),
      spawn(x, y, vx, vy) {
        const b = world.addBall(x, y); b.vx = vx || 0; b.vy = vy || 0;
        game.trough--; return b;
      },
      clearBalls() {
        for (const b of world.balls.slice()) { world.removeBall(b); game.trough++; }
      },
      shoot(name) {
        const aims = {
          orbitL: [[330, 1015], [48, 520]], rampL: [[330, 1010], [149, 500]],
          catapult: [[240, 1010], [240, 500]], castle: [[300, 1010], [360, 420]],
          rampR: [[200, 1010], [412, 545]], orbitR: [[200, 995], [490, 525]],
          scoop: [[310, 1010], [100, 720]], drops: [[260, 1010], [296, 530]]
        };
        const a = aims[name]; if (!a) return "unknown";
        this.clearBalls();
        const dx = a[1][0] - a[0][0], dy = a[1][1] - a[0][1], l = Math.hypot(dx, dy);
        return this.spawn(a[0][0], a[0][1], dx / l * 2100, dy / l * 2100);
      },
      key(action, downMs) {
        game.action(action, true);
        setTimeout(() => game.action(action, false), downMs || 80);
      },
      fast(x) { game.speed = x || 1; }
    };
  }

  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", boot);
  else boot();
})(typeof window !== "undefined" ? window : globalThis);
