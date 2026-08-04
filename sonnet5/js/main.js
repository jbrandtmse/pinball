// Bootstrap: size the canvas to a crisp backing resolution, wire input/audio, and drive
// the fixed-order update -> render loop.
(function () {
  const playfieldCanvas = document.getElementById('playfield');
  const dmdCanvas = document.getElementById('dmd');
  const ctx = playfieldCanvas.getContext('2d');

  let scale = 1;

  function resize() {
    const dpr = Math.min(window.devicePixelRatio || 1, 2.5);
    scale = 1.4 * dpr;
    const w = Math.max(1, Math.round(TABLE.WIDTH * scale));
    const h = Math.max(1, Math.round(TABLE.HEIGHT * scale));
    if (playfieldCanvas.width !== w) playfieldCanvas.width = w;
    if (playfieldCanvas.height !== h) playfieldCanvas.height = h;
  }
  window.addEventListener('resize', resize);
  resize();

  Input.init();

  const game = new Game(playfieldCanvas, dmdCanvas);
  window.__game = game;

  let lastT = performance.now();
  function loop(t) {
    const dt = Math.min((t - lastT) / 1000, 1 / 15);
    lastT = t;

    ctx.setTransform(scale, 0, 0, scale, 0, 0);
    ctx.clearRect(0, 0, TABLE.WIDTH, TABLE.HEIGHT);

    game.update(dt);
    game.render();

    requestAnimationFrame(loop);
  }
  requestAnimationFrame(loop);
})();
