/*
 * PHOENIX: ASCENSION — renderer (render.js)
 * --------------------------------------------------------------------
 * The ONLY DOM-dependent file in this table. It owns every canvas draw call:
 * playfield geometry, bumpers, flippers, gates, drop/stand targets, the ball(s),
 * and the on-screen HUD (score, multiplier, target lamps, ball count, tilt /
 * multiball banners). It is browser-safe — no Node globals are touched — and
 * attaches PA.Renderer to the shared namespace so main.js can drive it.
 *
 * The playfield is a tall virtual canvas (PA.WIDTH x PA.HEIGHT). We fit it to
 * the browser width with a uniform scale and run a vertical "camera" that tracks
 * the ball(s) so upper-field features stay on screen as the ball ascends.
 */
(function (root, factory) {
  if (typeof module === 'object' && module.exports) {
    module.exports = factory(require('./engine'));
  } else {
    root.PA = root.PA || {};
    root.PA.Renderer = factory(root.PA);
  }
})(typeof self !== 'undefined' ? self : this, function (PA) {
  'use strict';

  // Per-kind palette (ember / phoenix theme: dark field, orange accents).
  var KIND_STYLE = {
    wall:      { color: '#2a2f3a', thickness: 8 },
    rail:      { color: '#6b7488', thickness: 12 },
    guide:     { color: '#3d5a5e', thickness: 10, passive: true },
    sling:     { color: '#ff7a1a', thickness: 12 },
    target:    { color: '#4fd6ff', thickness: 12 }
  };

  function clamp(v, lo, hi) { return v < lo ? lo : (v > hi ? hi : v); }

  // --------------------------------------------------------------------------
  // Renderer. Holds the canvas + context and a width-fit scale; reads world/game
  // fresh from main.js every frame via render(game).
  // --------------------------------------------------------------------------
  function Renderer(canvas) {
    if (!canvas) throw new Error('Renderer needs a canvas');
    this.canvas = canvas;
    this.ctx = canvas.getContext('2d');
    this.scale = 1;      // virtual px -> browser px (width-fit)
    this.camY = 0;       // virtual-y offset of the viewport top
    this._lastW = 0;
  }

  // Recompute scale so the playfield fills the canvas width.
  Renderer.prototype.resize = function () {
    var c = this.canvas, ctx = this.ctx;
    var dpr = (window && window.devicePixelRatio) || 1;
    var cssW = c.clientWidth || c.parentNode.clientWidth || 1200;
    var cssH = c.clientHeight || c.parentNode.clientHeight || 2760;
    c.width = Math.round(cssW * dpr);
    c.height = Math.round(cssH * dpr);
    c.style.width = cssW + 'px';
    c.style.height = cssH + 'px';
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    this.scale = cssW / PA.WIDTH;
    this._lastW = cssW;
    this._lastH = cssH;
  };

  // Vertical camera: center on the midpoint of all active balls so multiball
  // stays in frame; clamp so we never scroll past the table's top or bottom.
  Renderer.prototype._cameraY = function (world) {
    var balls = world.balls;
    var midY = PA.HEIGHT / 2;
    if (balls.length) {
      var minY = Infinity, maxY = -Infinity;
      for (var i = 0; i < balls.length; i++) {
        if (!balls[i].active) continue;
        if (balls[i].y < minY) minY = balls[i].y;
        if (balls[i].y > maxY) maxY = balls[i].y;
      }
      if (isFinite(minY)) midY = (minY + maxY) / 2;
    }
    var viewH = this._lastH / this.scale;
    return clamp(midY - viewH / 2, 0, Math.max(0, PA.HEIGHT - viewH));
  };

  // --------------------------------------------------------------------------
  // Drawing helpers (all in virtual coordinates).
  // --------------------------------------------------------------------------
  function drawSegment(ctx, s) {
    var st = KIND_STYLE[s.kind] || KIND_STYLE.wall;
    ctx.strokeStyle = st.color;
    ctx.lineWidth = s.thickness || st.thickness;
    ctx.lineCap = 'round';
    ctx.beginPath();
    ctx.moveTo(s.a.x, s.a.y);
    ctx.lineTo(s.b.x, s.b.y);
    ctx.stroke();
  }

  function drawFlipper(ctx, f) {
    var tip = f.tip || { x: f.pivot.x + Math.cos(f.angle) * f.len,
                         y: f.pivot.y + Math.sin(f.angle) * f.len };
    ctx.strokeStyle = '#ffb347';
    ctx.lineWidth = f.thickness;
    ctx.lineCap = 'round';
    ctx.beginPath();
    ctx.moveTo(f.pivot.x, f.pivot.y);
    ctx.lineTo(tip.x, tip.y);
    ctx.stroke();
    // pivot hub
    ctx.fillStyle = '#cc7a1f';
    ctx.beginPath();
    ctx.arc(f.pivot.x, f.pivot.y, f.thickness * 0.7, 0, Math.PI * 2);
    ctx.fill();
  }

  function drawBumper(ctx, b) {
    var glow = b.charge || 0;
    if (glow > 0.01) {
      ctx.save();
      ctx.globalAlpha = 0.5 + 0.5 * glow;
      ctx.fillStyle = '#ff9d2e';
      ctx.beginPath();
      ctx.arc(b.x, b.y, b.r * (1.35 - 0.35 * glow), 0, Math.PI * 2);
      ctx.fill();
      ctx.restore();
    }
    var grad = ctx.createRadialGradient(b.x, b.y, b.r * 0.2, b.x, b.y, b.r);
    grad.addColorStop(0, b.lit ? '#fff6db' : '#ffd27a');
    grad.addColorStop(1, b.lit ? '#ff9d2e' : '#cc5a10');
    ctx.fillStyle = grad;
    ctx.beginPath();
    ctx.arc(b.x, b.y, b.r, 0, Math.PI * 2);
    ctx.fill();
    ctx.strokeStyle = b.lit ? '#fff' : '#7a3608';
    ctx.lineWidth = 4;
    ctx.stroke();
  }

  function drawBall(ctx, b) {
    var r = b.r || PA.BALL_R;
    var grad = ctx.createRadialGradient(b.x - r * 0.3, b.y - r * 0.3, r * 0.1, b.x, b.y, r);
    grad.addColorStop(0, '#ffffff');
    grad.addColorStop(1, '#b9c6d6');
    ctx.fillStyle = grad;
    ctx.beginPath();
    ctx.arc(b.x, b.y, r, 0, Math.PI * 2);
    ctx.fill();
    ctx.strokeStyle = '#7f8a99';
    ctx.lineWidth = 2;
    ctx.stroke();
  }

  // --------------------------------------------------------------------------
  // HUD (screen space — drawn after the transform is restored).
  // --------------------------------------------------------------------------
  function drawHUD(ctx, game) {
    var W = this._lastW;
    ctx.save();
    ctx.font = 'bold 34px "Arial Black", Arial, sans-serif';
    ctx.textBaseline = 'top';
    ctx.fillStyle = '#ffffff';
    ctx.fillText(game.score.toLocaleString(), 28, 18);

    ctx.font = 'bold 26px Arial, sans-serif';
    ctx.textAlign = 'center';
    ctx.fillStyle = game.multiplier > 1 ? '#ffb347' : '#9aa4b4';
    ctx.fillText('x' + game.multiplier, W / 2, 22);

    ctx.textAlign = 'right';
    ctx.fillStyle = '#ffffff';
    ctx.font = 'bold 24px Arial, sans-serif';
    ctx.fillText('Balls: ' + game.ballsInPlay, W - 28, 22);

    // Lamp rows — left (Embers) and right (Wings), plus meter bars.
    var drop = game.dropTargets || [];
    var stand = game.standTargets || [];
    ctx.textAlign = 'left';
    ctx.font = '16px Arial, sans-serif';
    ctx.fillStyle = '#9aa4b4';
    ctx.fillText('EMBERS', 24, 70);
    for (var i = 0; i < drop.length; i++) {
      var down = worldSegMissing(game, drop[i]);
      lamp(ctx, 60 + i * 26, 72, !down, game.embersLit);
    }

    ctx.textAlign = 'right';
    ctx.fillText('WINGS', W - 24, 70);
    for (var j = 0; j < stand.length; j++) {
      lamp(ctx, W - 60 - j * 26, 72, !stand[j].hit, game.wingsLit);
    }

    // Ascension ramp meter (3 runs → Inferno).
    ctx.textAlign = 'left';
    ctx.fillStyle = '#9aa4b4';
    ctx.fillText('ASCENT', 24, 108);
    for (var k = 0; k < 3; k++) {
      lamp(ctx, 60 + k * 26, 110, k < game.ascensionMeter, false);
    }

    // Spinner net meter.
    ctx.fillText('SPIN', 24, 146);
    var net = Math.max(0, Math.min(3, Math.abs(game.spinNet || 0)));
    for (var m = 0; m < 3; m++) {
      lamp(ctx, 60 + m * 26, 148, m < net, false);
    }

    // Banners.
    if (game.multiballEndsAt > game.world.simTime) {
      banner.call(this, ctx, 'INFERNO MULTIBALL', '#ff9d2e');
    }
    if (game.tiltActive) {
      banner.call(this, ctx, 'TILT — BONUS VOIDED', '#ff4d4d');
    }
    ctx.restore();
  }

  // A target's seg is present while up and removed from the world when it falls.
  function worldSegMissing(game, t) {
    return game.world.segments.indexOf(t.seg) === -1;
  }

  function lamp(ctx, x, y, lit, glow) {
    ctx.beginPath();
    ctx.arc(x, y, 8, 0, Math.PI * 2);
    if (lit) {
      ctx.fillStyle = glow ? '#fff6db' : '#ff9d2e';
      ctx.save();
      ctx.globalAlpha = 0.5;
      ctx.fill();
      ctx.restore();
    } else {
      ctx.fillStyle = '#333a47';
    }
    ctx.strokeStyle = '#1c222c';
    ctx.lineWidth = 2;
    ctx.stroke();
  }

  function banner(ctx, text, color) {
    var W = this._lastW;
    ctx.save();
    ctx.textAlign = 'center';
    ctx.font = 'bold 40px "Arial Black", Arial, sans-serif';
    ctx.fillStyle = color;
    ctx.globalAlpha = 0.85;
    ctx.fillText(text, W / 2, this._lastH * 0.12);
    ctx.restore();
  }

  // --------------------------------------------------------------------------
  // Main render pass.
  // --------------------------------------------------------------------------
  Renderer.prototype.render = function (game) {
    var ctx = this.ctx;
    var world = game.world;
    this.resize();
    this.camY = this._cameraY(world);

    // Background playfield fill.
    ctx.clearRect(0, 0, PA.WIDTH, PA.HEIGHT);
    ctx.fillStyle = '#141821';
    ctx.fillRect(0, 0, PA.WIDTH, PA.HEIGHT);

    ctx.save();
    ctx.scale(this.scale, this.scale);
    ctx.translate(0, -this.camY);

    // Shooter-lane floor highlight.
    ctx.fillStyle = 'rgba(255,157,46,0.06)';
    ctx.fillRect(PA.SHOOT_X_MIN, 0, PA.WIDTH - PA.SHOOT_X_MIN, PA.HEIGHT);

    // Geometry (passive guides drawn first / dimmer).
    for (var i = 0; i < world.segments.length; i++) {
      var s = world.segments[i];
      if (s.kind === 'guide' && KIND_STYLE[s.kind] && KIND_STYLE[s.kind].passive) {
        ctx.save();
        ctx.globalAlpha = 0.6;
      }
      drawSegment(ctx, s);
      if (s.kind === 'guide') ctx.restore();
    }

    // Drop targets — drawn from rule state (their seg is removed when fallen).
    var drop = game.dropTargets || [];
    for (var d = 0; d < drop.length; d++) {
      var t = drop[d];
      var fallen = worldSegMissing(game, t);
      ctx.fillStyle = fallen ? '#3a3f4b' : '#4fd6ff';
      ctx.save();
      if (fallen) { ctx.globalAlpha = 0.5; }
      ctx.fillRect(t.x - 37, t.y + (fallen ? 55 : 0), 74, 12);
      ctx.restore();
    }

    // Stand-up targets — spring back, so seg stays; use hit flag.
    var stand = game.standTargets || [];
    for (var s = 0; s < stand.length; s++) {
      var st = stand[s];
      ctx.fillStyle = st.hit ? '#3a3f4b' : '#ffd24a';
      ctx.fillRect(st.x - 32, st.y - 6, 64, 12);
    }

    // Gates — faint when untriggered.
    for (var g = 0; g < world.gates.length; g++) {
      var gate = world.gates[g];
      ctx.strokeStyle = gate.triggered ? 'rgba(255,210,120,0.9)' : 'rgba(120,140,160,0.35)';
      ctx.lineWidth = 4;
      ctx.beginPath();
      ctx.moveTo(gate.a.x, gate.a.y);
      ctx.lineTo(gate.b.x, gate.b.y);
      ctx.stroke();
    }

    // Bumpers, flippers, then balls on top.
    for (var bi = 0; bi < world.bumpers.length; bi++) drawBumper(ctx, world.bumpers[bi]);
    for (var fi = 0; fi < world.flippers.length; fi++) drawFlipper(ctx, world.flippers[fi]);
    for (var bqi = 0; bqi < world.balls.length; bqi++) {
      if (world.balls[bqi].active) drawBall(ctx, world.balls[bqi]);
    }

    ctx.restore();

    // HUD + launch / game-over prompts in screen space.
    drawHUD.call(this, ctx, game);
    var c = this.canvas;
    ctx.textAlign = 'center';
    if (world.balls.length === 0 && !game.drainBall()) {
      ctx.fillStyle = 'rgba(255,255,255,0.9)';
      ctx.font = 'bold 30px Arial, sans-serif';
      ctx.fillText('SPACE / ENTER — launch', this._lastW / 2, this._lastH - 60);
    } else if (game.drainBall()) {
      ctx.fillStyle = '#ff4d4d';
      ctx.font = 'bold 48px "Arial Black", Arial, sans-serif';
      ctx.fillText('GAME OVER', this._lastW / 2, this._lastH / 2);
      ctx.fillStyle = '#ffffff';
      ctx.font = 'bold 26px Arial, sans-serif';
      ctx.fillText('press R for a new game', this._lastW / 2, this._lastH / 2 + 54);
    }
  };

  return Renderer;
});
