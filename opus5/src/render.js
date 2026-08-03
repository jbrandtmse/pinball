/* ============================================================================
 * RAGNAROK PINBALL — render.js
 * Draws the whole machine: cabinet, backbox translite, DMD, and the playfield
 * with dynamic insert lighting, flashers, ramps, plastics and the ball.
 * ==========================================================================*/
(function (PB) {
  'use strict';
  var U = PB.U, T = PB.Table, Art = PB.Art, P = PB.Phys, D = PB.DMD;
  var R = PB.Render = {};
  var K = T.K;

  R.PF_ASPECT = T.W / T.H;
  R.debug = false;

  /* ================================================================ LAYOUT */
  R.layout = function (W, H) {
    var pad = Math.round(Math.min(W, H) * 0.018);
    var pfH = H - pad * 2;
    var pfW = pfH * R.PF_ASPECT;
    var minPanel = 260;
    var compact = false;

    if (W - pfW < minPanel * 2) {
      var want = (W - minPanel * 2) / R.PF_ASPECT;
      if (want > H * 0.58) { pfH = Math.min(pfH, want); pfW = pfH * R.PF_ASPECT; }
      else compact = true;
    }
    if (compact) {
      pfH = H - pad * 2;
      pfW = pfH * R.PF_ASPECT;
      if (pfW > W - pad * 2) { pfW = W - pad * 2; pfH = pfW / R.PF_ASPECT; }
    }

    var pfX = Math.round((W - pfW) / 2);
    var pfY = Math.round((H - pfH) / 2);
    var side = pfX - pad;

    var L = {
      W: W, H: H, pad: pad, compact: compact,
      pf: { x: pfX, y: pfY, w: pfW, h: pfH, scale: pfW / T.W },
      left: { x: pad, y: pfY, w: Math.max(0, side - pad), h: pfH },
      right: { x: pfX + pfW + pad, y: pfY, w: Math.max(0, side - pad), h: pfH }
    };
    // DMD sits at the top of the right panel (or overlaid at the top when compact)
    if (compact) {
      var dw = Math.min(W - pad * 2, pfW * 1.02);
      L.dmd = { x: Math.round((W - dw) / 2), y: pad, w: dw, h: Math.round(dw / 4.6) };
    } else {
      L.dmd = { x: L.right.x, y: L.right.y, w: L.right.w, h: Math.round(L.right.w / 4.2) };
    }
    return L;
  };

  /* ================================================================= FRAME */
  R.frame = function (ctx, g) {
    var L = g.layout;
    ctx.save();
    drawRoom(ctx, L, g);
    if (!L.compact && L.left.w > 120) drawLeftPanel(ctx, L, g);
    drawPlayfield(ctx, L, g);
    if (!L.compact && L.right.w > 120) drawRightPanel(ctx, L, g);
    drawDmdPanel(ctx, L, g);
    if (L.compact) drawCompactStatus(ctx, L, g);
    ctx.restore();
  };

  /* ------------------------------------------------------------- backdrop */
  function drawRoom(ctx, L, g) {
    var gr = ctx.createRadialGradient(L.W * 0.5, L.H * 0.34, L.W * 0.1, L.W * 0.5, L.H * 0.5, L.W * 0.8);
    gr.addColorStop(0, '#151d2e');
    gr.addColorStop(0.55, '#0a0e17');
    gr.addColorStop(1, '#03050a');
    ctx.fillStyle = gr;
    ctx.fillRect(0, 0, L.W, L.H);

    // faint floor reflection under the machine
    ctx.save();
    ctx.globalAlpha = 0.12;
    var fg = ctx.createLinearGradient(0, L.H * 0.7, 0, L.H);
    fg.addColorStop(0, 'rgba(90,150,240,0)');
    fg.addColorStop(1, 'rgba(90,150,240,0.35)');
    ctx.fillStyle = fg;
    ctx.fillRect(0, L.H * 0.7, L.W, L.H * 0.3);
    ctx.restore();
  }

  /* ================================================================ PLAYFIELD */
  function drawPlayfield(ctx, L, g) {
    var pf = L.pf, sc = pf.scale, t = g.table;

    /* ---- cabinet body + side rails ---- */
    var railW = Math.max(7, 13 * sc);
    ctx.save();
    ctx.shadowColor = 'rgba(0,0,0,0.85)';
    ctx.shadowBlur = 46 * sc;
    ctx.shadowOffsetY = 12 * sc;
    ctx.fillStyle = '#10151f';
    U.roundRect(ctx, pf.x - railW, pf.y - railW * 0.5, pf.w + railW * 2, pf.h + railW, railW * 0.5);
    ctx.fill();
    ctx.restore();

    // brushed steel side rails
    [-1, 1].forEach(function (s) {
      var x = s < 0 ? pf.x - railW : pf.x + pf.w;
      var lg = ctx.createLinearGradient(x, 0, x + railW, 0);
      lg.addColorStop(0, s < 0 ? '#20293a' : '#c8d6e8');
      lg.addColorStop(0.35, '#e9f2ff');
      lg.addColorStop(0.6, '#8494ab');
      lg.addColorStop(1, s < 0 ? '#c8d6e8' : '#20293a');
      ctx.fillStyle = lg;
      ctx.fillRect(x, pf.y - railW * 0.5, railW, pf.h + railW);
      // rivets
      ctx.fillStyle = 'rgba(30,40,55,0.6)';
      for (var i = 0; i < 9; i++) {
        var ry = pf.y + pf.h * (0.06 + i * 0.11);
        ctx.beginPath(); ctx.arc(x + railW * 0.5, ry, railW * 0.16, 0, U.TAU); ctx.fill();
      }
    });

    ctx.save();
    ctx.beginPath();
    ctx.rect(pf.x, pf.y, pf.w, pf.h);
    ctx.clip();
    ctx.translate(pf.x + g.shakeX * sc, pf.y + g.shakeY * sc);
    ctx.scale(sc, sc);

    /* ---- baked artwork ---- */
    if (g.baked) ctx.drawImage(g.baked, 0, 0, T.W, T.H);

    /* ---- general illumination ---- */
    drawGI(ctx, g);

    /* ---- lit inserts ---- */
    drawInserts(ctx, g);

    /* ---- flashers (behind mechanisms so they wash the playfield) ---- */
    drawFlashers(ctx, g);

    /* ---- mechanisms ---- */
    drawSpinner(ctx, t.spinner, g);
    drawStandups(ctx, t, g);
    drawDrops(ctx, t, g);
    drawScoop(ctx, t.scoop, g);
    drawBumpers(ctx, t, g);
    drawSlings(ctx, t, g);
    drawGates(ctx, t, g);
    drawKickback(ctx, t, g);

    /* ---- balls on the playfield, then flippers over them ---- */
    drawBallShadows(ctx, g, false);
    drawBalls(ctx, g, false);
    drawFlippers(ctx, g);

    /* ---- elevated structures + their riders ---- */
    drawRamps(ctx, t, g);
    drawBallShadows(ctx, g, true);
    drawBalls(ctx, g, true);

    drawPlunger(ctx, t, g);

    if (R.debug) drawDebug(ctx, g);

    ctx.restore();

    /* ---- playfield glass ---- */
    drawGlass(ctx, pf, g);
  }

  /* ------------------------------------------------------------------ GI */
  function drawGI(ctx, g) {
    var gi = g.gi;                       // 0..1
    if (gi < 0.999) {
      ctx.save();
      ctx.fillStyle = 'rgba(0,0,4,' + (0.80 * (1 - gi)) + ')';
      ctx.fillRect(0, 0, T.W, T.H);
      ctx.restore();
    }
    // warm lamp pools from the GI strings
    ctx.save();
    ctx.globalCompositeOperation = 'lighter';
    var pools = [[110, 250], [420, 250], [70, 620], [460, 620], [130, 900], [390, 900], [264, 480], [250, 1080]];
    for (var i = 0; i < pools.length; i++) {
      var p = pools[i];
      var gr = ctx.createRadialGradient(p[0], p[1], 4, p[0], p[1], 170);
      var a = 0.11 * gi * g.giWarm;
      gr.addColorStop(0, 'rgba(255,214,150,' + a + ')');
      gr.addColorStop(1, 'rgba(255,214,150,0)');
      ctx.fillStyle = gr;
      ctx.fillRect(p[0] - 175, p[1] - 175, 350, 350);
    }
    ctx.restore();
  }

  /* -------------------------------------------------------------- inserts */
  function drawInserts(ctx, g) {
    var list = Art.INSERTS;
    ctx.save();
    for (var i = 0; i < list.length; i++) {
      var s = list[i];
      var lv = g.lampLevel(s.id);
      if (lv <= 0.01) continue;
      var rgb = U.hexToRgb(s.c);

      // under-lens glow spilling onto the playfield
      ctx.save();
      ctx.globalCompositeOperation = 'lighter';
      var rad = (Math.max(s.w || 16, s.h || 16)) * 1.9;
      var gr = ctx.createRadialGradient(s.x, s.y, 1, s.x, s.y, rad);
      gr.addColorStop(0, 'rgba(' + rgb.join(',') + ',' + (0.55 * lv) + ')');
      gr.addColorStop(0.45, 'rgba(' + rgb.join(',') + ',' + (0.17 * lv) + ')');
      gr.addColorStop(1, 'rgba(' + rgb.join(',') + ',0)');
      ctx.fillStyle = gr;
      ctx.fillRect(s.x - rad, s.y - rad, rad * 2, rad * 2);
      ctx.restore();

      // the lens itself
      ctx.save();
      Art.insertPath(ctx, s, 1);
      var lg = ctx.createLinearGradient(s.x, s.y - (s.h || s.w) * 0.6, s.x, s.y + (s.h || s.w) * 0.6);
      lg.addColorStop(0, 'rgba(255,255,255,' + (0.92 * lv) + ')');
      lg.addColorStop(0.35, 'rgba(' + rgb.map(function (v) { return Math.min(255, v + 70); }).join(',') + ',' + (0.96 * lv) + ')');
      lg.addColorStop(1, 'rgba(' + rgb.join(',') + ',' + (0.86 * lv) + ')');
      ctx.fillStyle = lg;
      ctx.fill();
      ctx.strokeStyle = 'rgba(255,255,255,' + (0.5 * lv) + ')';
      ctx.lineWidth = 1;
      ctx.stroke();
      ctx.restore();

      // silk-screen label re-drawn dark on top of the lit lens
      if (s.txt) {
        ctx.save();
        ctx.fillStyle = 'rgba(8,12,20,' + (0.62 * lv) + ')';
        var fs = Math.max(4.2, Math.min((s.h || s.w) * 0.55, s.w * 0.34));
        ctx.font = '800 ' + fs + 'px Inter, "Segoe UI", sans-serif';
        ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
        ctx.fillText(s.txt, s.x, s.y + (s.shape === 'arrow' ? 8 : 0.4));
        ctx.restore();
      }
    }
    ctx.restore();
  }

  /* ------------------------------------------------------------- flashers */
  function drawFlashers(ctx, g) {
    ctx.save();
    ctx.globalCompositeOperation = 'lighter';
    for (var i = 0; i < Art.FLASHERS.length; i++) {
      var f = Art.FLASHERS[i];
      var lv = g.flashers[f.id] || 0;
      if (lv <= 0.005) continue;
      var rgb = U.hexToRgb(f.c);
      var gr = ctx.createRadialGradient(f.x, f.y, 2, f.x, f.y, f.r);
      gr.addColorStop(0, 'rgba(255,255,255,' + (0.72 * lv) + ')');
      gr.addColorStop(0.22, 'rgba(' + rgb.join(',') + ',' + (0.46 * lv) + ')');
      gr.addColorStop(1, 'rgba(' + rgb.join(',') + ',0)');
      ctx.fillStyle = gr;
      ctx.fillRect(f.x - f.r, f.y - f.r, f.r * 2, f.r * 2);
    }
    ctx.restore();
  }

  /* -------------------------------------------------------------- bumpers */
  function drawBumpers(ctx, t, g) {
    for (var i = 0; i < t.bumpers.length; i++) {
      var b = t.bumpers[i];
      var lit = g.lampLevel('bumper' + i);
      var pulse = b.flash;

      ctx.save();
      ctx.translate(b.x, b.y);

      // skirt shadow ring on the playfield
      ctx.beginPath(); ctx.arc(1.5, 3, b.r * 1.14, 0, U.TAU);
      ctx.fillStyle = 'rgba(0,0,0,0.55)'; ctx.fill();

      // metal ring / skirt
      var rg = ctx.createRadialGradient(-b.r * 0.3, -b.r * 0.35, b.r * 0.2, 0, 0, b.r * 1.1);
      rg.addColorStop(0, '#dfeaf8'); rg.addColorStop(0.5, '#8496ad'); rg.addColorStop(1, '#2c3purple'.replace('purple', '648'));
      ctx.beginPath(); ctx.arc(0, 0, b.r * 1.1, 0, U.TAU); ctx.fillStyle = rg; ctx.fill();

      // lamp glow under the translucent cap
      var glow = 0.28 + 0.72 * Math.max(pulse, lit * 0.7);
      ctx.save();
      ctx.globalCompositeOperation = 'lighter';
      var cg = ctx.createRadialGradient(0, 0, 1, 0, 0, b.r * 2.6);
      cg.addColorStop(0, 'rgba(150,225,255,' + (0.65 * glow) + ')');
      cg.addColorStop(0.35, 'rgba(90,180,255,' + (0.30 * glow) + ')');
      cg.addColorStop(1, 'rgba(90,180,255,0)');
      ctx.fillStyle = cg;
      ctx.fillRect(-b.r * 2.6, -b.r * 2.6, b.r * 5.2, b.r * 5.2);
      ctx.restore();

      // mushroom cap
      var capR = b.r * 0.82 * (1 - b.ring * 0.09);
      var cg2 = ctx.createRadialGradient(-capR * 0.35, -capR * 0.4, capR * 0.1, 0, 0, capR);
      cg2.addColorStop(0, 'rgba(255,255,255,' + (0.6 + 0.4 * glow) + ')');
      cg2.addColorStop(0.55, 'rgba(120,200,255,' + (0.55 + 0.35 * glow) + ')');
      cg2.addColorStop(1, 'rgba(30,90,170,0.92)');
      ctx.beginPath(); ctx.arc(0, 0, capR, 0, U.TAU);
      ctx.fillStyle = cg2; ctx.fill();
      ctx.lineWidth = 1.2; ctx.strokeStyle = 'rgba(240,250,255,0.7)'; ctx.stroke();

      // rune stamped on the cap
      ctx.fillStyle = 'rgba(10,20,40,' + (0.35 + 0.3 * glow) + ')';
      ctx.font = '700 ' + (capR * 1.05) + 'px "Segoe UI Symbol", serif';
      ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
      ctx.fillText(['ᚦ', 'ᛏ', 'ᛟ'][i % 3], 0, capR * 0.06);

      // firing shock ring
      if (b.ring > 0.02) {
        ctx.beginPath();
        ctx.arc(0, 0, b.r * (1.1 + (1 - b.ring) * 1.5), 0, U.TAU);
        ctx.strokeStyle = 'rgba(180,235,255,' + (b.ring * 0.75) + ')';
        ctx.lineWidth = 2.4 * b.ring + 0.5;
        ctx.stroke();
      }
      ctx.restore();
    }
  }

  /* ------------------------------------------------------------ slingshots */
  function drawSlings(ctx, t, g) {
    for (var i = 0; i < t.slings.length; i++) {
      var s = t.slings[i];
      var k = s.kickT > 0 ? (s.kickT / 0.09) : 0;
      var nx = s.col.nx, ny = s.col.ny;
      ctx.save();
      // rubber band, bowed outward while the coil fires
      var bow = 5 * k;
      ctx.beginPath();
      ctx.moveTo(s.a[0], s.a[1]);
      ctx.quadraticCurveTo(
        (s.a[0] + s.b[0]) / 2 + nx * bow, (s.a[1] + s.b[1]) / 2 + ny * bow,
        s.b[0], s.b[1]);
      ctx.lineWidth = 5.4;
      ctx.strokeStyle = 'rgba(0,0,0,0.5)';
      ctx.stroke();
      ctx.lineWidth = 4.2;
      ctx.strokeStyle = k > 0 ? '#fff2d0' : '#e6f2ff';
      ctx.stroke();
      ctx.lineWidth = 1.6;
      ctx.strokeStyle = 'rgba(255,255,255,0.85)';
      ctx.stroke();

      // kicker flash
      if (s.flash > 0.02) {
        ctx.save();
        ctx.globalCompositeOperation = 'lighter';
        var mx = (s.a[0] + s.b[0]) / 2, my = (s.a[1] + s.b[1]) / 2;
        var gr = ctx.createRadialGradient(mx, my, 1, mx, my, 62);
        gr.addColorStop(0, 'rgba(255,240,200,' + (0.65 * s.flash) + ')');
        gr.addColorStop(1, 'rgba(255,180,80,0)');
        ctx.fillStyle = gr;
        ctx.fillRect(mx - 65, my - 65, 130, 130);
        ctx.restore();
      }
      ctx.restore();
    }
  }

  /* ---------------------------------------------------------- drop targets */
  function drawDrops(ctx, t, g) {
    for (var i = 0; i < t.drops.length; i++) {
      var d = t.drops[i];
      var down = d.anim;
      ctx.save();
      ctx.translate(d.x, d.y);
      // slot in the playfield
      ctx.fillStyle = 'rgba(0,0,0,0.75)';
      U.roundRect(ctx, -d.w / 2 - 1.5, -1.5, d.w + 3, 5, 1.5); ctx.fill();

      if (down < 0.97) {
        var hgt = 20 * (1 - down);
        // body
        var gr = ctx.createLinearGradient(0, -hgt, 0, 2);
        gr.addColorStop(0, '#f6fbff');
        gr.addColorStop(0.45, '#cfe4f6');
        gr.addColorStop(1, '#69809b');
        ctx.fillStyle = gr;
        U.roundRect(ctx, -d.w / 2, -hgt, d.w, hgt + 2, 2.2); ctx.fill();
        ctx.strokeStyle = 'rgba(10,16,26,0.7)'; ctx.lineWidth = 1; ctx.stroke();

        // lit face
        var lit = g.lampLevel('drop' + i);
        if (lit > 0.02 && hgt > 6) {
          ctx.save();
          ctx.globalCompositeOperation = 'lighter';
          ctx.fillStyle = 'rgba(255,190,80,' + (0.5 * lit) + ')';
          U.roundRect(ctx, -d.w / 2, -hgt, d.w, hgt + 2, 2.2); ctx.fill();
          ctx.restore();
        }
        // printed rune
        if (hgt > 9) {
          ctx.fillStyle = 'rgba(20,32,52,0.85)';
          ctx.font = '700 ' + Math.min(13, hgt * 0.8) + 'px "Segoe UI Symbol", serif';
          ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
          ctx.fillText(['ᚹ', 'ᛃ', 'ᛘ'][i], 0, -hgt * 0.5);
        }
        if (d.flash > 0.02) {
          ctx.save();
          ctx.globalCompositeOperation = 'lighter';
          ctx.fillStyle = 'rgba(255,255,255,' + (0.7 * d.flash) + ')';
          U.roundRect(ctx, -d.w / 2, -hgt, d.w, hgt + 2, 2.2); ctx.fill();
          ctx.restore();
        }
      }
      ctx.restore();
    }
  }

  /* -------------------------------------------------------------- standups */
  function drawStandups(ctx, t, g) {
    for (var i = 0; i < t.standups.length; i++) {
      var s = t.standups[i];
      var lit = g.lampLevel('thor' + i);
      var tx = -s.ny, ty = s.nx;
      var push = s.press * 2.4;
      ctx.save();
      ctx.translate(s.x - s.nx * push, s.y - s.ny * push);
      ctx.beginPath();
      ctx.moveTo(tx * 15, ty * 15);
      ctx.lineTo(-tx * 15, -ty * 15);
      ctx.lineWidth = 8.5;
      ctx.lineCap = 'round';
      ctx.strokeStyle = 'rgba(0,0,0,0.55)';
      ctx.stroke();
      ctx.lineWidth = 6.5;
      var base = lit > 0.4 ? '#ffd48a' : '#b9cde3';
      ctx.strokeStyle = base;
      ctx.stroke();
      ctx.lineWidth = 2.4;
      ctx.strokeStyle = 'rgba(255,255,255,0.8)';
      ctx.stroke();
      if (lit > 0.02 || s.flash > 0.02) {
        ctx.save();
        ctx.globalCompositeOperation = 'lighter';
        var a = Math.max(lit * 0.5, s.flash);
        var gr = ctx.createRadialGradient(0, 0, 1, 0, 0, 40);
        gr.addColorStop(0, 'rgba(255,180,90,' + (0.6 * a) + ')');
        gr.addColorStop(1, 'rgba(255,140,60,0)');
        ctx.fillStyle = gr; ctx.fillRect(-42, -42, 84, 84);
        ctx.restore();
      }
      ctx.restore();
    }
  }

  /* --------------------------------------------------------------- spinner */
  function drawSpinner(ctx, sp, g) {
    ctx.save();
    ctx.translate(sp.x, sp.y);
    // bracket
    ctx.strokeStyle = '#8fa2ba'; ctx.lineWidth = 2.2;
    ctx.beginPath();
    ctx.moveTo(-sp.w / 2 - 2, -11); ctx.lineTo(-sp.w / 2 - 2, 11);
    ctx.moveTo(sp.w / 2 + 2, -11); ctx.lineTo(sp.w / 2 + 2, 11);
    ctx.stroke();
    // the vane, foreshortened as it spins
    var c = Math.cos(sp.angle);
    var h = Math.abs(c) * 15 + 1.2;
    var bright = 0.4 + 0.6 * Math.abs(c);
    var lit = g.lampLevel('a_spin');
    ctx.beginPath();
    U.roundRect(ctx, -sp.w / 2, -h / 2, sp.w, h, 1.6);
    var gr = ctx.createLinearGradient(0, -h / 2, 0, h / 2);
    gr.addColorStop(0, 'rgba(255,255,255,' + bright + ')');
    gr.addColorStop(0.5, c > 0 ? '#9fd8ff' : '#4a7fae');
    gr.addColorStop(1, 'rgba(40,70,110,0.9)');
    ctx.fillStyle = gr; ctx.fill();
    ctx.strokeStyle = 'rgba(10,20,34,0.8)'; ctx.lineWidth = 0.8; ctx.stroke();
    if (h > 9) {
      ctx.fillStyle = 'rgba(10,22,40,0.7)';
      ctx.font = '700 8px "Segoe UI Symbol", serif';
      ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
      ctx.fillText('ᛊ', 0, 0);
    }
    if (Math.abs(sp.omega) > 1 || lit > 0.1) {
      ctx.save();
      ctx.globalCompositeOperation = 'lighter';
      var a = U.clamp(Math.abs(sp.omega) / 30, 0, 1) * 0.6 + lit * 0.3;
      var g2 = ctx.createRadialGradient(0, 0, 1, 0, 0, 46);
      g2.addColorStop(0, 'rgba(120,255,200,' + (0.55 * a) + ')');
      g2.addColorStop(1, 'rgba(120,255,200,0)');
      ctx.fillStyle = g2; ctx.fillRect(-48, -48, 96, 96);
      ctx.restore();
    }
    ctx.restore();
  }

  /* ------------------------------------------------------------------ scoop */
  function drawScoop(ctx, s, g) {
    ctx.save();
    ctx.translate(s.x, s.y);
    var lit = Math.max(g.lampLevel('a_scoop') * 0.6, s.flash);
    if (lit > 0.02) {
      ctx.save();
      ctx.globalCompositeOperation = 'lighter';
      var gr = ctx.createRadialGradient(0, 0, 1, 0, 0, 66);
      gr.addColorStop(0, 'rgba(255,215,120,' + (0.75 * lit) + ')');
      gr.addColorStop(1, 'rgba(255,180,60,0)');
      ctx.fillStyle = gr; ctx.fillRect(-70, -70, 140, 140);
      ctx.restore();
    }
    // stacked locked balls peeking out of the vault
    for (var i = 0; i < s.locked; i++) {
      var ox = (i - (s.locked - 1) / 2) * 5;
      ctx.save();
      ctx.globalAlpha = 0.55;
      ballBody(ctx, ox, -3 - i * 1.5, P.BALL_R * 0.72, 0);
      ctx.restore();
    }
    ctx.restore();
  }

  /* ------------------------------------------------------------------ gates */
  function drawGates(ctx, t, g) {
    for (var i = 0; i < t.gates.length; i++) {
      var gt = t.gates[i], s = gt.seg;
      ctx.save();
      var mx = (s.x1 + s.x2) / 2, my = (s.y1 + s.y2) / 2;
      var ang = Math.atan2(s.y2 - s.y1, s.x2 - s.x1) - gt.swing * 0.9;
      var half = s.len / 2;
      ctx.translate(mx, my); ctx.rotate(ang);
      ctx.beginPath();
      ctx.moveTo(-half, 0); ctx.lineTo(half, 0);
      ctx.lineWidth = 3.4; ctx.strokeStyle = 'rgba(0,0,0,0.5)'; ctx.stroke();
      ctx.lineWidth = 2.0; ctx.strokeStyle = '#cfe0f2'; ctx.stroke();
      ctx.beginPath(); ctx.arc(-half, 0, 2.2, 0, U.TAU);
      ctx.fillStyle = '#8fa4bb'; ctx.fill();
      ctx.restore();
    }
  }

  /* -------------------------------------------------------------- kickback */
  function drawKickback(ctx, t, g) {
    var kb = t.kickback;
    ctx.save();
    ctx.translate(kb.x, kb.y);
    ctx.fillStyle = 'rgba(20,28,42,0.9)';
    U.roundRect(ctx, -13, 4, 26, 7, 2); ctx.fill();
    ctx.strokeStyle = kb.lit ? '#7dffbc' : '#5d6f86';
    ctx.lineWidth = 1.6;
    U.roundRect(ctx, -13, 4, 26, 7, 2); ctx.stroke();
    if (kb.flash > 0.02) {
      ctx.save();
      ctx.globalCompositeOperation = 'lighter';
      var gr = ctx.createRadialGradient(0, 0, 1, 0, 0, 50);
      gr.addColorStop(0, 'rgba(160,255,210,' + (0.8 * kb.flash) + ')');
      gr.addColorStop(1, 'rgba(160,255,210,0)');
      ctx.fillStyle = gr; ctx.fillRect(-52, -52, 104, 104);
      ctx.restore();
    }
    ctx.restore();
  }

  /* --------------------------------------------------------------- flippers */
  function drawFlippers(ctx, g) {
    var fs = g.world.flippers;
    for (var i = 0; i < fs.length; i++) {
      var f = fs[i];
      if (!f.enabled) continue;
      var tx = f.tipX(), ty = f.tipY();
      var ang = f.ang;

      ctx.save();
      // shadow
      ctx.save();
      ctx.translate(2, 3.5);
      capsule(ctx, f.px, f.py, f.r1, tx, ty, f.r2);
      ctx.fillStyle = 'rgba(0,0,0,0.55)'; ctx.fill();
      ctx.restore();

      // bat body
      capsule(ctx, f.px, f.py, f.r1, tx, ty, f.r2);
      var gr = ctx.createLinearGradient(
        f.px - Math.sin(ang) * f.r1, f.py + Math.cos(ang) * f.r1,
        f.px + Math.sin(ang) * f.r1, f.py - Math.cos(ang) * f.r1);
      gr.addColorStop(0, '#f8fcff');
      gr.addColorStop(0.42, '#dfeaf6');
      gr.addColorStop(0.7, '#9db2c9');
      gr.addColorStop(1, '#54677e');
      ctx.fillStyle = gr; ctx.fill();
      ctx.lineWidth = 1.2; ctx.strokeStyle = 'rgba(12,20,32,0.75)'; ctx.stroke();

      // rubber stripe along the working face
      ctx.save();
      capsule(ctx, f.px, f.py, f.r1, tx, ty, f.r2);
      ctx.clip();
      var sx = f.side === 'left' ? 1 : -1;
      ctx.strokeStyle = f.hitT > 0 ? 'rgba(255,240,190,0.95)' : 'rgba(110,205,255,0.9)';
      ctx.lineWidth = 4.2;
      ctx.beginPath();
      ctx.moveTo(f.px - Math.sin(ang) * (f.r1 - 2.4) * sx, f.py + Math.cos(ang) * (f.r1 - 2.4) * sx);
      ctx.lineTo(tx - Math.sin(ang) * (f.r2 - 1.6) * sx, ty + Math.cos(ang) * (f.r2 - 1.6) * sx);
      ctx.stroke();
      ctx.restore();

      // pivot bolt
      ctx.beginPath(); ctx.arc(f.px, f.py, f.r1 * 0.42, 0, U.TAU);
      var bg = ctx.createRadialGradient(f.px - 1.5, f.py - 1.8, 0.5, f.px, f.py, f.r1 * 0.45);
      bg.addColorStop(0, '#ffe9b0'); bg.addColorStop(0.6, '#d8a340'); bg.addColorStop(1, '#7a5311');
      ctx.fillStyle = bg; ctx.fill();

      // hit sparkle
      if (f.hitT > 0) {
        ctx.save();
        ctx.globalCompositeOperation = 'lighter';
        var a = f.hitT / 0.09;
        var g2 = ctx.createRadialGradient(tx, ty, 1, tx, ty, 34);
        g2.addColorStop(0, 'rgba(255,245,210,' + (0.7 * a) + ')');
        g2.addColorStop(1, 'rgba(255,200,120,0)');
        ctx.fillStyle = g2; ctx.fillRect(tx - 36, ty - 36, 72, 72);
        ctx.restore();
      }
      ctx.restore();
    }
  }

  function capsule(ctx, x1, y1, r1, x2, y2, r2) {
    var dx = x2 - x1, dy = y2 - y1;
    var d = Math.sqrt(dx * dx + dy * dy) || 1;
    var ux = dx / d, uy = dy / d;
    var a = Math.atan2(uy, ux);
    var dr = (r1 - r2) / d;
    var ca = Math.acos(U.clamp(dr, -1, 1));
    ctx.beginPath();
    ctx.arc(x1, y1, r1, a + ca, a - ca + U.TAU);
    ctx.arc(x2, y2, r2, a - ca, a + ca);
    ctx.closePath();
  }

  /* ------------------------------------------------------------------ ramps */
  function drawRamps(ctx, t, g) {
    for (var i = 0; i < t.ramps.length; i++) {
      var ramp = t.ramps[i];
      var path = ramp.path;
      var pts = path.pts;
      var wireStart = Math.floor(pts.length * path.wireFrom);
      var lit = g.lampLevel(i === 0 ? 'a_lramp' : 'a_rramp');
      var glowA = Math.max(lit * 0.5, ramp.flash);
      var rgb = U.hexToRgb(ramp.color);

      /* --- shadow cast on the playfield --- */
      ctx.save();
      ctx.globalAlpha = 0.32;
      ctx.strokeStyle = '#000';
      ctx.lineJoin = 'round'; ctx.lineCap = 'round';
      ctx.beginPath();
      for (var s = 0; s < pts.length; s++) {
        var p = pts[s];
        var ox = p.x + p.z * 0.10, oy = p.y + p.z * 0.15;
        if (s === 0) ctx.moveTo(ox, oy); else ctx.lineTo(ox, oy);
      }
      ctx.lineWidth = path.width * 0.85;
      ctx.stroke();
      ctx.restore();

      /* --- clear plastic ramp section --- */
      ctx.save();
      ctx.lineJoin = 'round'; ctx.lineCap = 'round';
      var half = path.width * 0.5;

      // floor ribbon
      ctx.beginPath();
      for (var a = 0; a <= wireStart; a++) {
        var pa = pts[a], n = pathNormal(pts, a);
        ctx.lineTo(proj(pa.x + n.x * half), projY(pa.y + n.y * half, pa.z));
      }
      for (var b = wireStart; b >= 0; b--) {
        var pb = pts[b], n2 = pathNormal(pts, b);
        ctx.lineTo(proj(pb.x - n2.x * half), projY(pb.y - n2.y * half, pb.z));
      }
      ctx.closePath();
      var fg = ctx.createLinearGradient(pts[0].x, pts[0].y, pts[wireStart].x, pts[wireStart].y);
      fg.addColorStop(0, 'rgba(' + rgb.join(',') + ',0.20)');
      fg.addColorStop(0.5, 'rgba(230,248,255,0.15)');
      fg.addColorStop(1, 'rgba(' + rgb.join(',') + ',0.22)');
      ctx.fillStyle = fg;
      ctx.fill();
      // glow when lit
      if (glowA > 0.02) {
        ctx.save();
        ctx.globalCompositeOperation = 'lighter';
        ctx.fillStyle = 'rgba(' + rgb.join(',') + ',' + (0.28 * glowA) + ')';
        ctx.fill();
        ctx.restore();
      }

      // side rails of the plastic section
      [1, -1].forEach(function (sg) {
        ctx.beginPath();
        for (var c = 0; c <= wireStart; c++) {
          var pc = pts[c], nn = pathNormal(pts, c);
          var X = proj(pc.x + nn.x * half * sg), Y = projY(pc.y + nn.y * half * sg, pc.z);
          if (c === 0) ctx.moveTo(X, Y); else ctx.lineTo(X, Y);
        }
        ctx.lineWidth = 3.2; ctx.strokeStyle = 'rgba(10,18,30,0.55)'; ctx.stroke();
        ctx.lineWidth = 1.7;
        ctx.strokeStyle = 'rgba(' + rgb.map(function (v) { return Math.min(255, v + 40); }).join(',') + ',0.9)';
        ctx.stroke();
      });

      // entry flap (polished steel)
      var p0 = pts[0], n0 = pathNormal(pts, 0);
      ctx.beginPath();
      ctx.moveTo(p0.x + n0.x * half, p0.y + n0.y * half);
      ctx.lineTo(p0.x - n0.x * half, p0.y - n0.y * half);
      ctx.lineWidth = 5; ctx.strokeStyle = '#93a7bd'; ctx.stroke();
      ctx.lineWidth = 2; ctx.strokeStyle = '#eaf4ff'; ctx.stroke();

      /* --- wireform habitrail --- */
      ctx.lineCap = 'round';
      var wireHalf = P.BALL_R + 2.5;
      [1, -1].forEach(function (sg) {
        ctx.beginPath();
        for (var c = wireStart; c < pts.length; c++) {
          var pc = pts[c], nn = pathNormal(pts, c);
          var X = proj(pc.x + nn.x * wireHalf * sg), Y = projY(pc.y + nn.y * wireHalf * sg, pc.z);
          if (c === wireStart) ctx.moveTo(X, Y); else ctx.lineTo(X, Y);
        }
        ctx.lineWidth = 3.4; ctx.strokeStyle = 'rgba(8,14,24,0.6)'; ctx.stroke();
        ctx.lineWidth = 2.1; ctx.strokeStyle = '#aebfd3'; ctx.stroke();
        ctx.lineWidth = 0.8; ctx.strokeStyle = 'rgba(255,255,255,0.85)'; ctx.stroke();
      });
      // rungs
      ctx.lineWidth = 1.3;
      ctx.strokeStyle = 'rgba(170,190,212,0.75)';
      for (var w = wireStart; w < pts.length; w += 5) {
        var pw = pts[w], nw = pathNormal(pts, w);
        ctx.beginPath();
        ctx.moveTo(proj(pw.x + nw.x * wireHalf), projY(pw.y + nw.y * wireHalf, pw.z));
        ctx.lineTo(proj(pw.x - nw.x * wireHalf), projY(pw.y - nw.y * wireHalf, pw.z));
        ctx.stroke();
      }
      // support posts every so often
      ctx.strokeStyle = 'rgba(120,140,165,0.55)';
      ctx.lineWidth = 2;
      for (var q = 4; q < pts.length; q += 22) {
        var pq = pts[q];
        ctx.beginPath();
        ctx.moveTo(pq.x, projY(pq.y, pq.z));
        ctx.lineTo(pq.x, pq.y);
        ctx.stroke();
      }

      // travelling light chase when lit
      if (glowA > 0.05) {
        ctx.save();
        ctx.globalCompositeOperation = 'lighter';
        var head = (g.time * 0.55) % 1;
        for (var f2 = 0; f2 < 3; f2++) {
          var frac = (head - f2 * 0.09 + 1) % 1;
          var idx = Math.floor(frac * (pts.length - 1));
          var pp = pts[idx];
          var gr = ctx.createRadialGradient(pp.x, projY(pp.y, pp.z), 1, pp.x, projY(pp.y, pp.z), 26);
          gr.addColorStop(0, 'rgba(' + rgb.join(',') + ',' + (0.55 * glowA * (1 - f2 * 0.3)) + ')');
          gr.addColorStop(1, 'rgba(' + rgb.join(',') + ',0)');
          ctx.fillStyle = gr;
          ctx.fillRect(pp.x - 28, projY(pp.y, pp.z) - 28, 56, 56);
        }
        ctx.restore();
      }
      ctx.restore();
    }
  }

  function proj(x) { return x; }
  function projY(y, z) { return y + (z || 0) * 0.13; }

  function pathNormal(pts, i) {
    var a = pts[Math.max(0, i - 1)], b = pts[Math.min(pts.length - 1, i + 1)];
    var dx = b.x - a.x, dy = b.y - a.y;
    var d = Math.sqrt(dx * dx + dy * dy) || 1;
    return { x: -dy / d, y: dx / d };
  }

  /* ------------------------------------------------------------------ balls */
  function drawBallShadows(ctx, g, elevated) {
    var balls = g.world.balls;
    ctx.save();
    for (var i = 0; i < balls.length; i++) {
      var b = balls[i];
      if (b.state === 'captured' || b.state === 'gone') continue;
      if ((b.state === 'ramp') !== !!elevated) continue;
      var z = b.z || 0;
      var sx = b.x + 2.6 + z * 0.12, sy = b.y + 4.2 + z * 0.20;
      var r = b.r * (1 + z * 0.0016);
      var gr = ctx.createRadialGradient(sx, sy, r * 0.2, sx, sy, r * (1.5 + z * 0.004));
      gr.addColorStop(0, 'rgba(0,0,0,' + (0.62 - Math.min(0.35, z * 0.0035)) + ')');
      gr.addColorStop(1, 'rgba(0,0,0,0)');
      ctx.fillStyle = gr;
      ctx.beginPath(); ctx.arc(sx, sy, r * (1.5 + z * 0.004), 0, U.TAU); ctx.fill();
    }
    ctx.restore();
  }

  function drawBalls(ctx, g, elevated) {
    var balls = g.world.balls;
    for (var i = 0; i < balls.length; i++) {
      var b = balls[i];
      if (b.state === 'captured' || b.state === 'gone') continue;
      if ((b.state === 'ramp') !== !!elevated) continue;
      var z = b.z || 0;
      var bx = b.x, by = projY(b.y, z);
      var r = b.r * (1 + z * 0.0022);

      // motion blur trail
      if (b.trail && b.trail.length > 1) {
        ctx.save();
        ctx.globalCompositeOperation = 'lighter';
        for (var k = 0; k < b.trail.length; k++) {
          var tp = b.trail[k];
          var a = (k / b.trail.length) * 0.24;
          ctx.globalAlpha = a;
          var tg = ctx.createRadialGradient(tp[0], tp[1], 0, tp[0], tp[1], r * 1.05);
          tg.addColorStop(0, 'rgba(190,225,255,0.95)');
          tg.addColorStop(1, 'rgba(120,170,230,0)');
          ctx.fillStyle = tg;
          ctx.beginPath(); ctx.arc(tp[0], tp[1], r * 1.05, 0, U.TAU); ctx.fill();
        }
        ctx.restore();
      }
      ballBody(ctx, bx, by, r, b.roll);
    }
  }

  function ballBody(ctx, x, y, r, roll) {
    ctx.save();
    // chrome sphere
    var g1 = ctx.createRadialGradient(x - r * 0.38, y - r * 0.44, r * 0.06, x, y, r * 1.06);
    g1.addColorStop(0, '#ffffff');
    g1.addColorStop(0.14, '#e8f2fb');
    g1.addColorStop(0.38, '#a9bccf');
    g1.addColorStop(0.62, '#5d7186');
    g1.addColorStop(0.86, '#2b3a4c');
    g1.addColorStop(1, '#161f2b');
    ctx.beginPath(); ctx.arc(x, y, r, 0, U.TAU);
    ctx.fillStyle = g1; ctx.fill();

    ctx.save();
    ctx.clip();
    // horizon reflection band
    var g2 = ctx.createLinearGradient(x, y - r, x, y + r);
    g2.addColorStop(0.0, 'rgba(255,255,255,0)');
    g2.addColorStop(0.42, 'rgba(150,205,255,0.18)');
    g2.addColorStop(0.5, 'rgba(20,30,44,0.42)');
    g2.addColorStop(0.58, 'rgba(150,205,255,0.16)');
    g2.addColorStop(1, 'rgba(255,255,255,0)');
    ctx.fillStyle = g2;
    ctx.fillRect(x - r, y - r, r * 2, r * 2);
    // bounced light from the playfield below
    var g3 = ctx.createRadialGradient(x + r * 0.26, y + r * 0.55, r * 0.04, x + r * 0.2, y + r * 0.5, r * 0.72);
    g3.addColorStop(0, 'rgba(140,190,255,0.42)');
    g3.addColorStop(1, 'rgba(140,190,255,0)');
    ctx.fillStyle = g3;
    ctx.fillRect(x - r, y - r, r * 2, r * 2);
    // rolling scuff so rotation reads
    if (roll !== undefined) {
      ctx.globalAlpha = 0.22;
      ctx.strokeStyle = '#dfeeff';
      ctx.lineWidth = r * 0.10;
      for (var s = 0; s < 3; s++) {
        var ph = roll * 0.5 + s * 2.09;
        var yy = y + Math.sin(ph) * r * 0.62;
        var wob = Math.cos(ph) * r * 0.86;
        ctx.beginPath();
        ctx.ellipse(x, yy, Math.abs(wob) * 0.8 + 0.5, r * 0.16, 0, 0, U.TAU);
        ctx.stroke();
      }
      ctx.globalAlpha = 1;
    }
    ctx.restore();

    // rim light
    ctx.beginPath(); ctx.arc(x, y, r * 0.97, 0, U.TAU);
    ctx.strokeStyle = 'rgba(200,230,255,0.30)';
    ctx.lineWidth = r * 0.10;
    ctx.stroke();

    // specular highlights
    ctx.beginPath();
    ctx.ellipse(x - r * 0.36, y - r * 0.42, r * 0.24, r * 0.16, -0.6, 0, U.TAU);
    ctx.fillStyle = 'rgba(255,255,255,0.95)'; ctx.fill();
    ctx.beginPath();
    ctx.arc(x + r * 0.42, y - r * 0.16, r * 0.09, 0, U.TAU);
    ctx.fillStyle = 'rgba(255,255,255,0.55)'; ctx.fill();
    ctx.restore();
  }
  R.ballBody = ballBody;

  /* --------------------------------------------------------------- plunger */
  function drawPlunger(ctx, t, g) {
    var pl = t.plunger;
    var pull = pl.power * 26 - pl.release * 10;
    ctx.save();
    ctx.translate(pl.x, pl.y + pull);
    // shaft
    ctx.fillStyle = '#7f8ea3';
    ctx.fillRect(-2.5, 6, 5, 60);
    // spring
    ctx.strokeStyle = '#b9c8da'; ctx.lineWidth = 2.1;
    ctx.beginPath();
    for (var i = 0; i <= 16; i++) {
      var yy = 8 + i * 3.1;
      ctx.lineTo(-8 + (i % 2) * 16, yy);
    }
    ctx.stroke();
    // tip
    var gr = ctx.createRadialGradient(-3, -3, 1, 0, 0, 11);
    gr.addColorStop(0, '#fff4d6'); gr.addColorStop(0.5, '#e0b356'); gr.addColorStop(1, '#7a5411');
    ctx.beginPath(); ctx.arc(0, 0, 10, 0, U.TAU);
    ctx.fillStyle = gr; ctx.fill();
    ctx.strokeStyle = 'rgba(20,14,4,0.7)'; ctx.lineWidth = 1; ctx.stroke();
    ctx.restore();

    // power gauge painted beside the lane
    if (pl.ball || pl.power > 0.01) {
      ctx.save();
      ctx.translate(pl.x + 16, pl.y - 96);
      ctx.fillStyle = 'rgba(0,0,0,0.55)';
      U.roundRect(ctx, -5, 0, 10, 96, 4); ctx.fill();
      var h = 92 * pl.power;
      var lg = ctx.createLinearGradient(0, 94, 0, 2);
      lg.addColorStop(0, '#7dffbc'); lg.addColorStop(0.6, '#ffd166'); lg.addColorStop(1, '#ff5a4d');
      ctx.fillStyle = lg;
      U.roundRect(ctx, -3.4, 94 - h, 6.8, h, 3); ctx.fill();
      ctx.strokeStyle = 'rgba(200,225,255,0.5)'; ctx.lineWidth = 1;
      U.roundRect(ctx, -5, 0, 10, 96, 4); ctx.stroke();
      ctx.restore();
    }
  }

  /* ----------------------------------------------------------------- glass */
  function drawGlass(ctx, pf, g) {
    ctx.save();
    ctx.beginPath(); ctx.rect(pf.x, pf.y, pf.w, pf.h); ctx.clip();
    // long diagonal sheen
    var gr = ctx.createLinearGradient(pf.x, pf.y, pf.x + pf.w * 0.9, pf.y + pf.h * 0.55);
    gr.addColorStop(0, 'rgba(255,255,255,0.075)');
    gr.addColorStop(0.28, 'rgba(255,255,255,0.018)');
    gr.addColorStop(0.42, 'rgba(255,255,255,0.045)');
    gr.addColorStop(0.62, 'rgba(255,255,255,0.005)');
    gr.addColorStop(1, 'rgba(255,255,255,0.03)');
    ctx.fillStyle = gr;
    ctx.fillRect(pf.x, pf.y, pf.w, pf.h);
    // vignette
    var v = ctx.createRadialGradient(pf.x + pf.w / 2, pf.y + pf.h * 0.45, pf.w * 0.30,
      pf.x + pf.w / 2, pf.y + pf.h * 0.5, pf.h * 0.72);
    v.addColorStop(0, 'rgba(0,0,0,0)');
    v.addColorStop(1, 'rgba(0,0,0,0.42)');
    ctx.fillStyle = v;
    ctx.fillRect(pf.x, pf.y, pf.w, pf.h);
    ctx.restore();
  }

  /* ================================================================== DMD */
  function drawDmdPanel(ctx, L, g) {
    var d = L.dmd;
    var bez = Math.max(5, d.h * 0.10);
    ctx.save();
    ctx.shadowColor = 'rgba(0,0,0,0.8)'; ctx.shadowBlur = 26; ctx.shadowOffsetY = 8;
    ctx.fillStyle = '#161b24';
    U.roundRect(ctx, d.x - bez, d.y - bez, d.w + bez * 2, d.h + bez * 2, bez * 0.7);
    ctx.fill();
    ctx.restore();
    ctx.save();
    ctx.strokeStyle = 'rgba(180,205,235,0.22)';
    ctx.lineWidth = 1.4;
    U.roundRect(ctx, d.x - bez, d.y - bez, d.w + bez * 2, d.h + bez * 2, bez * 0.7);
    ctx.stroke();
    ctx.restore();
    D.render(ctx, d.x, d.y, d.w, d.h, [255, 150, 26], { dotScale: 0.40 });
  }

  /* ============================================================ SIDE PANELS */
  function panelBg(ctx, x, y, w, h) {
    ctx.save();
    var g = ctx.createLinearGradient(x, y, x, y + h);
    g.addColorStop(0, 'rgba(20,28,44,0.72)');
    g.addColorStop(1, 'rgba(8,12,22,0.72)');
    ctx.fillStyle = g;
    U.roundRect(ctx, x, y, w, h, 10); ctx.fill();
    ctx.strokeStyle = 'rgba(140,175,220,0.16)'; ctx.lineWidth = 1;
    U.roundRect(ctx, x, y, w, h, 10); ctx.stroke();
    ctx.restore();
  }

  function heading(ctx, txt, x, y, w, color) {
    ctx.save();
    ctx.font = '800 ' + Math.max(9, w * 0.052) + 'px Inter, "Segoe UI", sans-serif';
    ctx.fillStyle = color || 'rgba(255,200,110,0.92)';
    ctx.textAlign = 'left'; ctx.textBaseline = 'top';
    ctx.letterSpacing = '2px';
    ctx.fillText(txt, x, y);
    ctx.letterSpacing = '0px';
    ctx.restore();
  }

  /* --------------------------------------------------------- left: translite */
  function drawLeftPanel(ctx, L, g) {
    var p = L.left;
    var artH = Math.min(p.h * 0.46, p.w * 1.12);
    drawTranslite(ctx, p.x, p.y, p.w, artH, g);

    var y = p.y + artH + 14;
    var h = p.h - artH - 14;
    panelBg(ctx, p.x, y, p.w, h);

    var pad = Math.max(10, p.w * 0.06);
    var cx = p.x + pad, cw = p.w - pad * 2;
    var cy = y + pad;

    heading(ctx, 'PLAYERS', cx, cy, cw);
    cy += Math.max(16, cw * 0.075);

    var n = Math.max(1, g.players.length);
    for (var i = 0; i < n; i++) {
      var pl = g.players[i];
      var active = (g.state === 'play' || g.state === 'bonus') && i === g.current;
      var rowH = Math.max(30, cw * 0.155);
      ctx.save();
      ctx.fillStyle = active ? 'rgba(90,175,255,0.16)' : 'rgba(255,255,255,0.03)';
      U.roundRect(ctx, cx, cy, cw, rowH, 6); ctx.fill();
      if (active) {
        ctx.strokeStyle = 'rgba(120,205,255,0.6)'; ctx.lineWidth = 1.4;
        U.roundRect(ctx, cx, cy, cw, rowH, 6); ctx.stroke();
      }
      ctx.font = '700 ' + Math.max(9, cw * 0.058) + 'px Inter,sans-serif';
      ctx.fillStyle = active ? '#bfe4ff' : '#728aa6';
      ctx.textAlign = 'left'; ctx.textBaseline = 'middle';
      ctx.fillText('PLAYER ' + (i + 1), cx + 8, cy + rowH * 0.34);
      ctx.font = '800 ' + Math.max(13, cw * 0.105) + 'px "Segoe UI", Inter, sans-serif';
      ctx.fillStyle = active ? '#ffffff' : '#93a9c2';
      ctx.textAlign = 'right';
      ctx.fillText(U.commas(pl ? pl.score : 0), cx + cw - 8, cy + rowH * 0.62);
      if (pl && pl.extraBalls > 0) {
        ctx.font = '700 ' + Math.max(8, cw * 0.05) + 'px Inter,sans-serif';
        ctx.fillStyle = '#ff8a7a';
        ctx.textAlign = 'left';
        ctx.fillText('EB x' + pl.extraBalls, cx + 8, cy + rowH * 0.74);
      }
      ctx.restore();
      cy += rowH + 6;
    }

    cy += 6;
    heading(ctx, 'MACHINE', cx, cy, cw);
    cy += Math.max(16, cw * 0.075);
    var rows = [
      ['BALL', g.state === 'attract' ? '-' : (g.ballNum + ' OF ' + g.ballsPerGame)],
      ['CREDITS', String(g.credits)],
      ['HIGH SCORE', U.shortScore(g.hs.list[0] ? g.hs.list[0].score : 0)]
    ];
    ctx.save();
    ctx.textBaseline = 'middle';
    for (var r = 0; r < rows.length; r++) {
      ctx.font = '600 ' + Math.max(9, cw * 0.055) + 'px Inter,sans-serif';
      ctx.fillStyle = '#6d84a0'; ctx.textAlign = 'left';
      ctx.fillText(rows[r][0], cx, cy + 8);
      ctx.font = '800 ' + Math.max(10, cw * 0.065) + 'px Inter,sans-serif';
      ctx.fillStyle = '#d5e6fb'; ctx.textAlign = 'right';
      ctx.fillText(rows[r][1], cx + cw, cy + 8);
      cy += Math.max(18, cw * 0.085);
    }
    ctx.restore();

    // controls hint at the bottom
    var hintY = y + h - Math.max(46, cw * 0.24);
    ctx.save();
    ctx.font = '600 ' + Math.max(8.5, cw * 0.048) + 'px Inter,sans-serif';
    ctx.fillStyle = 'rgba(120,150,185,0.85)';
    ctx.textAlign = 'left'; ctx.textBaseline = 'top';
    var hints = ['SHIFT / ARROWS  flippers', 'SPACE  plunger    Z X C  nudge', 'ENTER  start      F1  help'];
    for (var q = 0; q < hints.length; q++) ctx.fillText(hints[q], cx, hintY + q * Math.max(12, cw * 0.062));
    ctx.restore();
  }

  /* ----------------------------------------------------------- the translite */
  function drawTranslite(ctx, x, y, w, h, g) {
    ctx.save();
    ctx.shadowColor = 'rgba(0,0,0,0.8)'; ctx.shadowBlur = 26; ctx.shadowOffsetY = 8;
    ctx.fillStyle = '#0a0f1a';
    U.roundRect(ctx, x, y, w, h, 8); ctx.fill();
    ctx.restore();

    ctx.save();
    U.roundRect(ctx, x, y, w, h, 8); ctx.clip();

    var bg = ctx.createLinearGradient(x, y, x, y + h);
    bg.addColorStop(0, '#14264a');
    bg.addColorStop(0.42, '#0d1930');
    bg.addColorStop(1, '#050912');
    ctx.fillStyle = bg; ctx.fillRect(x, y, w, h);

    var t = g.time;
    // aurora
    ctx.save();
    ctx.globalCompositeOperation = 'lighter';
    for (var i = 0; i < 3; i++) {
      ctx.beginPath();
      for (var px = 0; px <= w; px += 6) {
        var yy = y + h * (0.16 + i * 0.07) + Math.sin(px * 0.02 + t * (0.5 + i * 0.2) + i) * h * 0.05;
        if (px === 0) ctx.moveTo(x + px, yy); else ctx.lineTo(x + px, yy);
      }
      ctx.lineTo(x + w, y + h * 0.55); ctx.lineTo(x, y + h * 0.55); ctx.closePath();
      var ag = ctx.createLinearGradient(0, y + h * 0.12, 0, y + h * 0.55);
      ag.addColorStop(0, ['rgba(90,255,190,0.22)', 'rgba(120,170,255,0.18)', 'rgba(190,120,255,0.14)'][i]);
      ag.addColorStop(1, 'rgba(0,0,0,0)');
      ctx.fillStyle = ag; ctx.fill();
    }
    ctx.restore();

    // mountains
    ctx.beginPath();
    ctx.moveTo(x, y + h * 0.78);
    var pk = [[0, 0.70], [0.14, 0.54], [0.27, 0.66], [0.42, 0.48], [0.56, 0.63], [0.70, 0.50], [0.85, 0.66], [1, 0.58]];
    for (var m = 0; m < pk.length; m++) ctx.lineTo(x + pk[m][0] * w, y + pk[m][1] * h);
    ctx.lineTo(x + w, y + h); ctx.lineTo(x, y + h); ctx.closePath();
    var mg = ctx.createLinearGradient(0, y + h * 0.45, 0, y + h);
    mg.addColorStop(0, '#1b2f52'); mg.addColorStop(1, '#060b16');
    ctx.fillStyle = mg; ctx.fill();

    // lightning strikes
    var strike = (t * 0.7) % 4;
    if (strike < 0.22) {
      ctx.save();
      ctx.globalCompositeOperation = 'lighter';
      ctx.globalAlpha = 1 - strike / 0.22;
      ctx.strokeStyle = '#cfefff'; ctx.lineWidth = Math.max(1.4, w * 0.006);
      ctx.beginPath();
      var lx = x + w * 0.5, ly = y + h * 0.20;
      ctx.moveTo(lx, ly);
      var rng = new U.Rng(Math.floor(t * 0.7) * 7919);
      for (var s2 = 0; s2 < 8; s2++) {
        lx += rng.jit(w * 0.05); ly += h * 0.045;
        ctx.lineTo(lx, ly);
      }
      ctx.stroke();
      ctx.globalAlpha = (1 - strike / 0.22) * 0.35;
      ctx.fillStyle = '#9fd8ff';
      ctx.fillRect(x, y, w, h);
      ctx.restore();
    }

    // Mjolnir
    ctx.save();
    ctx.translate(x + w * 0.5, y + h * 0.50);
    var s3 = w * 0.0021;
    ctx.rotate(-0.16);
    ctx.shadowColor = 'rgba(120,200,255,0.9)'; ctx.shadowBlur = w * 0.06;
    var hg = ctx.createLinearGradient(0, -60 * s3 * 10, 0, 60 * s3 * 10);
    hg.addColorStop(0, '#f4f9ff'); hg.addColorStop(0.5, '#9db2cc'); hg.addColorStop(1, '#3d4c63');
    ctx.fillStyle = hg;
    U.roundRect(ctx, -w * 0.17, -h * 0.13, w * 0.34, h * 0.15, w * 0.02); ctx.fill();
    ctx.fillStyle = '#6b4a25';
    U.roundRect(ctx, -w * 0.028, h * 0.02, w * 0.056, h * 0.24, w * 0.012); ctx.fill();
    ctx.strokeStyle = 'rgba(255,220,150,0.8)'; ctx.lineWidth = Math.max(1, w * 0.004);
    U.roundRect(ctx, -w * 0.17, -h * 0.13, w * 0.34, h * 0.15, w * 0.02); ctx.stroke();
    ctx.restore();

    // title
    ctx.save();
    ctx.textAlign = 'center';
    ctx.font = '900 ' + (w * 0.155) + 'px Inter, "Segoe UI", sans-serif';
    var tg = ctx.createLinearGradient(0, y + h * 0.80, 0, y + h * 0.95);
    tg.addColorStop(0, '#fff3c8'); tg.addColorStop(0.5, '#ffc247'); tg.addColorStop(1, '#a5670f');
    ctx.fillStyle = tg;
    ctx.shadowColor = 'rgba(255,170,40,0.55)'; ctx.shadowBlur = w * 0.05;
    ctx.fillText('RAGNARÖK', x + w * 0.5, y + h * 0.90);
    ctx.shadowBlur = 0;
    ctx.font = '700 ' + (w * 0.045) + 'px Inter, sans-serif';
    ctx.fillStyle = 'rgba(170,215,255,0.85)';
    ctx.letterSpacing = '3px';
    ctx.fillText('HAMMER OF THE GODS', x + w * 0.5, y + h * 0.965);
    ctx.letterSpacing = '0px';
    ctx.restore();

    // glass sheen
    var sg = ctx.createLinearGradient(x, y, x + w, y + h);
    sg.addColorStop(0, 'rgba(255,255,255,0.10)');
    sg.addColorStop(0.4, 'rgba(255,255,255,0.02)');
    sg.addColorStop(1, 'rgba(255,255,255,0.05)');
    ctx.fillStyle = sg; ctx.fillRect(x, y, w, h);
    ctx.restore();

    ctx.save();
    ctx.strokeStyle = 'rgba(190,215,245,0.25)'; ctx.lineWidth = 1.4;
    U.roundRect(ctx, x, y, w, h, 8); ctx.stroke();
    ctx.restore();
  }

  /* ------------------------------------------------------- right: status */
  function drawRightPanel(ctx, L, g) {
    var p = L.right;
    var y = L.dmd.y + L.dmd.h + Math.max(18, L.dmd.h * 0.22);
    var h = p.y + p.h - y;
    panelBg(ctx, p.x, y, p.w, h);

    var pad = Math.max(10, p.w * 0.06);
    var cx = p.x + pad, cw = p.w - pad * 2;
    var cy = y + pad;

    heading(ctx, 'SAGA STATUS', cx, cy, cw);
    cy += Math.max(18, cw * 0.08);

    var pl = g.players[g.current] || g.blankPlayer();
    var modeNames = PB.Rules.MODE_NAMES;
    var cols = 2, cellW = (cw - 6) / cols, cellH = Math.max(20, cw * 0.088);
    for (var i = 0; i < 6; i++) {
      var col = i % cols, row = (i / cols) | 0;
      var bx = cx + col * (cellW + 6), by = cy + row * (cellH + 5);
      var done = pl.modesDone[i];
      var running = pl.modeActive === i;
      ctx.save();
      ctx.fillStyle = running ? 'rgba(255,190,80,0.28)' : done ? 'rgba(90,240,170,0.18)' : 'rgba(255,255,255,0.045)';
      U.roundRect(ctx, bx, by, cellW, cellH, 4); ctx.fill();
      ctx.strokeStyle = running ? 'rgba(255,210,120,0.9)' : done ? 'rgba(110,255,190,0.55)' : 'rgba(255,255,255,0.10)';
      ctx.lineWidth = 1.1;
      U.roundRect(ctx, bx, by, cellW, cellH, 4); ctx.stroke();
      ctx.font = '800 ' + Math.max(7.5, cellW * 0.115) + 'px Inter,sans-serif';
      ctx.fillStyle = running ? '#fff0cf' : done ? '#c8ffe6' : '#6f88a5';
      ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
      ctx.fillText(modeNames[i], bx + cellW / 2, by + cellH / 2);
      ctx.restore();
    }
    cy += 3 * (cellH + 5) + 8;

    // meters
    function meter(label, value, frac, color) {
      ctx.save();
      ctx.font = '600 ' + Math.max(8.5, cw * 0.052) + 'px Inter,sans-serif';
      ctx.fillStyle = '#6d84a0'; ctx.textAlign = 'left'; ctx.textBaseline = 'alphabetic';
      ctx.fillText(label, cx, cy + 9);
      ctx.font = '800 ' + Math.max(9.5, cw * 0.062) + 'px Inter,sans-serif';
      ctx.fillStyle = color; ctx.textAlign = 'right';
      ctx.fillText(value, cx + cw, cy + 9);
      if (frac !== null) {
        ctx.fillStyle = 'rgba(255,255,255,0.07)';
        U.roundRect(ctx, cx, cy + 13, cw, 4, 2); ctx.fill();
        ctx.fillStyle = color;
        U.roundRect(ctx, cx, cy + 13, cw * U.clamp(frac, 0, 1), 4, 2); ctx.fill();
      }
      ctx.restore();
      cy += Math.max(24, cw * 0.115);
    }

    meter('BONUS X', pl.bonusX + 'X', pl.bonusX / 10, '#7dffbc');
    meter('LOCKS', pl.locks + ' / 3', pl.locks / 3, '#8fd8ff');
    meter('T-H-O-R', pl.thorMask.toString(2).split('1').length - 1 + ' / 4',
      (pl.thorMask.toString(2).split('1').length - 1) / 4, '#ffb066');
    if (g.rules.mbActive) meter('JACKPOT', U.shortScore(g.rules.jackpotValue), null, '#ffd166');
    else meter('BONUS', U.shortScore(g.rules.bonusValue(pl)), null, '#ffd166');

    // high scores at the bottom
    var hsY = y + h - Math.max(112, cw * 0.62);
    heading(ctx, 'GRAND CHAMPION', cx, hsY, cw, 'rgba(120,215,255,0.9)');
    hsY += Math.max(17, cw * 0.075);
    ctx.save();
    ctx.textBaseline = 'middle';
    for (var s = 0; s < Math.min(4, g.hs.list.length); s++) {
      var e = g.hs.list[s];
      ctx.font = '800 ' + Math.max(9, cw * 0.058) + 'px ui-monospace,Consolas,monospace';
      ctx.fillStyle = s === 0 ? '#ffd166' : '#8ea6c2';
      ctx.textAlign = 'left';
      ctx.fillText((s + 1) + '. ' + e.initials, cx, hsY + 7);
      ctx.textAlign = 'right';
      ctx.fillStyle = s === 0 ? '#fff0cf' : '#c2d5ea';
      ctx.fillText(U.commas(e.score), cx + cw, hsY + 7);
      hsY += Math.max(16, cw * 0.072);
    }
    ctx.restore();
  }

  /* --------------------------------------------------------- compact HUD */
  function drawCompactStatus(ctx, L, g) {
    var pl = g.players[g.current] || g.blankPlayer();
    ctx.save();
    ctx.font = '800 14px Inter,sans-serif';
    ctx.fillStyle = 'rgba(210,232,255,0.9)';
    ctx.textAlign = 'left'; ctx.textBaseline = 'bottom';
    ctx.fillText('BALL ' + g.ballNum + '   P' + (g.current + 1) + '   ' + U.commas(pl.score), L.pad, L.H - L.pad);
    ctx.restore();
  }

  /* ---------------------------------------------------------------- debug */
  function drawDebug(ctx, g) {
    var w = g.world;
    ctx.save();
    ctx.lineWidth = 0.8;
    ctx.strokeStyle = 'rgba(0,255,140,0.75)';
    ctx.beginPath();
    for (var i = 0; i < w.statics.length; i++) {
      var s = w.statics[i];
      if (!s.enabled) continue;
      if (s.type === 'seg') { ctx.moveTo(s.x1, s.y1); ctx.lineTo(s.x2, s.y2); }
      else if (s.type === 'circle') { ctx.moveTo(s.cx + s.r, s.cy); ctx.arc(s.cx, s.cy, s.r, 0, U.TAU); }
      else if (s.type === 'arc') { ctx.moveTo(s.cx + Math.cos(s.a0) * s.rad, s.cy + Math.sin(s.a0) * s.rad); ctx.arc(s.cx, s.cy, s.rad, s.a0, s.a1); }
    }
    ctx.stroke();
    ctx.strokeStyle = 'rgba(255,80,220,0.6)';
    ctx.beginPath();
    for (var z = 0; z < w.zones.length; z++) {
      var q = w.zones[z];
      ctx.rect(q.x - q.w / 2, q.y - q.h / 2, q.w, q.h);
    }
    ctx.stroke();
    // velocity vectors
    ctx.strokeStyle = 'rgba(255,220,0,0.9)';
    ctx.beginPath();
    for (var b = 0; b < w.balls.length; b++) {
      var ba = w.balls[b];
      ctx.moveTo(ba.x, ba.y);
      ctx.lineTo(ba.x + ba.vx * 0.05, ba.y + ba.vy * 0.05);
    }
    ctx.stroke();
    ctx.restore();
  }

})(window.PB = window.PB || {});
