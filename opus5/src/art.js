/* ============================================================================
 * RAGNAROK PINBALL — art.js
 * Bakes the screen-printed playfield: wood, artwork, painted lanes, insert
 * lenses, steel ball guides, plastics and wear. Redrawn only on resize.
 * ==========================================================================*/
(function (PB) {
  'use strict';
  var U = PB.U, T = PB.Table, P = PB.Phys;
  var Art = PB.Art = {};
  var K = T.K;

  /* ------------------------------------------------------------- palette */
  var C = Art.C = {
    wood: '#0b1220',
    deep: '#060a14',
    ice: '#4fd0ff',
    gold: '#ffc247',
    ember: '#ff7a2f',
    violet: '#9a6bff',
    green: '#5ef2a8',
    red: '#ff4d5e',
    white: '#eef6ff'
  };

  /* ============================================================= INSERTS
   * shape: 'arrow' | 'round' | 'oval' | 'tri' | 'bar' | 'diamond' | 'star'
   * Positions are playfield mm.                                            */
  var INS = Art.INSERTS = [
    /* shot arrows -------------------------------------------------------- */
    { id: 'a_lorbit', x: 32, y: 700, r: 268, shape: 'arrow', w: 22, h: 34, c: C.ice, label: '' },
    { id: 'a_lramp', x: 178, y: 706, r: 272, shape: 'arrow', w: 24, h: 38, c: C.ice },
    { id: 'a_scoop', x: 264, y: 486, r: 270, shape: 'arrow', w: 24, h: 36, c: C.gold },
    { id: 'a_rramp', x: 348, y: 706, r: 268, shape: 'arrow', w: 24, h: 38, c: C.gold },
    { id: 'a_rorbit', x: 468, y: 700, r: 272, shape: 'arrow', w: 22, h: 34, c: C.gold },
    { id: 'a_spin', x: 32, y: 530, r: 270, shape: 'arrow', w: 18, h: 28, c: C.green },

    /* R U N E top lanes -------------------------------------------------- */
    { id: 'lane0', x: 186, y: 224, shape: 'oval', w: 30, h: 15, c: C.violet, txt: 'R' },
    { id: 'lane1', x: 238, y: 224, shape: 'oval', w: 30, h: 15, c: C.violet, txt: 'U' },
    { id: 'lane2', x: 290, y: 224, shape: 'oval', w: 30, h: 15, c: C.violet, txt: 'N' },
    { id: 'lane3', x: 342, y: 224, shape: 'oval', w: 30, h: 15, c: C.violet, txt: 'E' },

    /* T H O R standups --------------------------------------------------- */
    { id: 'thor0', x: 108, y: 448, shape: 'round', w: 15, c: C.ember, txt: 'T' },
    { id: 'thor1', x: 108, y: 546, shape: 'round', w: 15, c: C.ember, txt: 'H' },
    { id: 'thor2', x: 402, y: 448, shape: 'round', w: 15, c: C.ember, txt: 'O' },
    { id: 'thor3', x: 402, y: 546, shape: 'round', w: 15, c: C.ember, txt: 'R' },

    /* saga mode inserts, ringed round the Well of Urd -------------------- */
    { id: 'mode0', x: 186, y: 396, shape: 'round', w: 17, c: C.violet, txt: '1' },
    { id: 'mode1', x: 200, y: 348, shape: 'round', w: 17, c: C.violet, txt: '2' },
    { id: 'mode2', x: 236, y: 336, shape: 'round', w: 17, c: C.violet, txt: '3' },
    { id: 'mode3', x: 292, y: 336, shape: 'round', w: 17, c: C.violet, txt: '4' },
    { id: 'mode4', x: 328, y: 348, shape: 'round', w: 17, c: C.violet, txt: '5' },
    { id: 'mode5', x: 342, y: 396, shape: 'round', w: 17, c: C.violet, txt: '6' },

    /* locks -------------------------------------------------------------- */
    { id: 'lock1', x: 224, y: 470, shape: 'diamond', w: 15, c: C.ice },
    { id: 'lock2', x: 250, y: 448, shape: 'diamond', w: 15, c: C.ice },
    { id: 'lock3', x: 276, y: 470, shape: 'diamond', w: 15, c: C.ice },

    /* headline inserts --------------------------------------------------- */
    { id: 'multiball', x: 264, y: 604, shape: 'bar', w: 96, h: 20, c: C.ice, txt: 'MJOLNIR MULTIBALL' },
    { id: 'jackpot', x: 264, y: 636, shape: 'bar', w: 74, h: 17, c: C.gold, txt: 'JACKPOT' },
    { id: 'ragnarok', x: 264, y: 574, shape: 'bar', w: 108, h: 21, c: C.red, txt: 'RAGNAROK' },

    /* bonus multiplier ladder -------------------------------------------- */
    { id: 'bx2', x: 128, y: 830, shape: 'oval', w: 26, h: 14, c: C.green, txt: '2X' },
    { id: 'bx3', x: 128, y: 852, shape: 'oval', w: 26, h: 14, c: C.green, txt: '3X' },
    { id: 'bx5', x: 128, y: 874, shape: 'oval', w: 26, h: 14, c: C.green, txt: '5X' },
    { id: 'bx10', x: 128, y: 896, shape: 'oval', w: 26, h: 14, c: C.gold, txt: '10X' },

    /* lower playfield ---------------------------------------------------- */
    { id: 'kickback', x: 46, y: 1020, shape: 'oval', w: 34, h: 15, c: C.green, txt: 'KICKBACK' },
    { id: 'special', x: 454, y: 1020, shape: 'oval', w: 34, h: 15, c: C.red, txt: 'SPECIAL' },
    { id: 'extraball', x: 372, y: 830, shape: 'oval', w: 40, h: 16, c: C.red, txt: 'EXTRA BALL' },
    { id: 'ballsave', x: 250, y: 1096, shape: 'oval', w: 52, h: 16, c: C.green, txt: 'SHOOT AGAIN' },
    { id: 'combo', x: 372, y: 852, shape: 'oval', w: 40, h: 14, c: C.ice, txt: 'COMBO' },
    { id: 'inl', x: 84, y: 986, shape: 'oval', w: 26, h: 12, c: C.gold },
    { id: 'inr', x: 416, y: 986, shape: 'oval', w: 26, h: 12, c: C.gold },
    { id: 'skill', x: 468, y: 760, shape: 'oval', w: 30, h: 14, c: C.violet, txt: 'SKILL' }
  ];

  Art.byId = {};
  for (var ii = 0; ii < INS.length; ii++) Art.byId[INS[ii].id] = INS[ii];

  /* Flasher lamps (big bright bursts, no lens). */
  Art.FLASHERS = [
    { id: 'f_bump', x: 264, y: 300, r: 96, c: C.ice },
    { id: 'f_scoop', x: 264, y: 396, r: 84, c: C.gold },
    { id: 'f_lramp', x: 150, y: 640, r: 70, c: C.ice },
    { id: 'f_rramp', x: 376, y: 640, r: 70, c: C.gold },
    { id: 'f_left', x: 60, y: 780, r: 78, c: C.violet },
    { id: 'f_right', x: 444, y: 780, r: 78, c: C.violet },
    { id: 'f_top', x: 264, y: 130, r: 110, c: C.white },
    { id: 'f_lower', x: 250, y: 980, r: 96, c: C.ember }
  ];

  /* =================================================== insert path helper */
  Art.insertPath = function (ctx, s, sc) {
    var w = (s.w || 16) * sc, h = (s.h || s.w || 16) * sc;
    ctx.save();
    ctx.translate(s.x * sc, s.y * sc);
    if (s.r) ctx.rotate(s.r * U.DEG);
    ctx.beginPath();
    switch (s.shape) {
      case 'arrow':
        ctx.moveTo(0, -h * 0.5);
        ctx.lineTo(w * 0.5, h * 0.06);
        ctx.lineTo(w * 0.22, h * 0.06);
        ctx.lineTo(w * 0.22, h * 0.5);
        ctx.lineTo(-w * 0.22, h * 0.5);
        ctx.lineTo(-w * 0.22, h * 0.06);
        ctx.lineTo(-w * 0.5, h * 0.06);
        ctx.closePath();
        break;
      case 'round':
        ctx.arc(0, 0, w * 0.5, 0, U.TAU);
        break;
      case 'diamond':
        ctx.moveTo(0, -w * 0.62); ctx.lineTo(w * 0.5, 0);
        ctx.lineTo(0, w * 0.62); ctx.lineTo(-w * 0.5, 0);
        ctx.closePath();
        break;
      case 'tri':
        ctx.moveTo(0, -h * 0.55); ctx.lineTo(w * 0.5, h * 0.45); ctx.lineTo(-w * 0.5, h * 0.45);
        ctx.closePath();
        break;
      case 'bar':
        U.roundRect(ctx, -w * 0.5, -h * 0.5, w, h, h * 0.34);
        break;
      default: // oval
        ctx.ellipse(0, 0, w * 0.5, h * 0.5, 0, 0, U.TAU);
    }
    ctx.restore();
    return { w: w, h: h };
  };

  /* ================================================================= BAKE */
  Art.bake = function (table, sc) {
    var W = Math.ceil(T.W * sc), H = Math.ceil(T.H * sc);
    var cv = U.canvas(W, H);
    var ctx = cv.getContext('2d');
    ctx.save();

    paintBase(ctx, sc, W, H);
    paintArtwork(ctx, sc, W, H);
    paintLanePaint(ctx, sc);
    paintInsertLenses(ctx, sc);
    paintScreenText(ctx, sc);
    paintGuides(ctx, sc, table);
    paintPlastics(ctx, sc, table);
    paintWear(ctx, sc, W, H);
    paintApron(ctx, sc, W, H);

    ctx.restore();
    return cv;
  };

  /* --------------------------------------------------------------- base */
  function paintBase(ctx, sc, W, H) {
    var g = ctx.createLinearGradient(0, 0, 0, H);
    g.addColorStop(0, '#0a1730');
    g.addColorStop(0.30, '#0a1428');
    g.addColorStop(0.62, '#080f1e');
    g.addColorStop(1, '#050912');
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, W, H);

    // subtle wood grain under the print
    ctx.save();
    ctx.globalAlpha = 0.055;
    ctx.strokeStyle = '#7f6a4a';
    ctx.lineWidth = Math.max(1, 0.7 * sc);
    var rng = new U.Rng(4242);
    for (var i = 0; i < 190; i++) {
      var y = rng.range(0, H);
      ctx.beginPath();
      ctx.moveTo(0, y);
      for (var x = 0; x <= W; x += 26 * sc) ctx.lineTo(x, y + Math.sin(x * 0.013 + i) * 2.2 * sc + rng.jit(0.7 * sc));
      ctx.stroke();
    }
    ctx.restore();

    // corner vignette baked into the print
    var v = ctx.createRadialGradient(W * 0.5, H * 0.42, W * 0.25, W * 0.5, H * 0.5, H * 0.72);
    v.addColorStop(0, 'rgba(0,0,0,0)');
    v.addColorStop(1, 'rgba(0,0,0,0.55)');
    ctx.fillStyle = v;
    ctx.fillRect(0, 0, W, H);
  }

  /* ------------------------------------------------------------ artwork */
  function paintArtwork(ctx, sc, W, H) {
    ctx.save();

    /* --- aurora over the top arch --- */
    ctx.save();
    ctx.globalCompositeOperation = 'lighter';
    var bands = [
      { y: 96, h: 120, c1: 'rgba(60,240,190,0.20)', c2: 'rgba(60,240,190,0)' },
      { y: 150, h: 150, c1: 'rgba(90,150,255,0.17)', c2: 'rgba(90,150,255,0)' },
      { y: 70, h: 90, c1: 'rgba(180,110,255,0.14)', c2: 'rgba(180,110,255,0)' }
    ];
    for (var bi = 0; bi < bands.length; bi++) {
      var b = bands[bi];
      ctx.beginPath();
      for (var x = 0; x <= T.W; x += 8) {
        var yy = b.y + Math.sin(x * 0.021 + bi * 2.1) * 22 + Math.sin(x * 0.052 + bi) * 9;
        if (x === 0) ctx.moveTo(x * sc, yy * sc); else ctx.lineTo(x * sc, yy * sc);
      }
      for (var x2 = T.W; x2 >= 0; x2 -= 8) {
        var yy2 = b.y + b.h + Math.sin(x2 * 0.018 + bi * 1.4) * 26;
        ctx.lineTo(x2 * sc, yy2 * sc);
      }
      ctx.closePath();
      var gg = ctx.createLinearGradient(0, b.y * sc, 0, (b.y + b.h) * sc);
      gg.addColorStop(0, b.c1); gg.addColorStop(1, b.c2);
      ctx.fillStyle = gg;
      ctx.fill();
    }
    ctx.restore();

    /* --- stars --- */
    var rng = new U.Rng(9001);
    ctx.fillStyle = 'rgba(220,240,255,0.55)';
    for (var s = 0; s < 130; s++) {
      var sx = rng.range(0, T.W) * sc, sy = rng.range(40, 420) * sc;
      var sr = rng.range(0.3, 1.15) * sc;
      ctx.globalAlpha = rng.range(0.15, 0.75);
      ctx.beginPath(); ctx.arc(sx, sy, sr, 0, U.TAU); ctx.fill();
    }
    ctx.globalAlpha = 1;

    /* --- distant mountain range --- */
    ctx.save();
    ctx.beginPath();
    ctx.moveTo(0, 470 * sc);
    var peaks = [[0, 430], [46, 372], [92, 412], [140, 336], [196, 398], [250, 330], [306, 392], [362, 344], [420, 404], [470, 362], [521, 418]];
    for (var pi = 0; pi < peaks.length; pi++) ctx.lineTo(peaks[pi][0] * sc, peaks[pi][1] * sc);
    ctx.lineTo(521 * sc, 520 * sc); ctx.lineTo(0, 520 * sc);
    ctx.closePath();
    var mg = ctx.createLinearGradient(0, 330 * sc, 0, 520 * sc);
    mg.addColorStop(0, 'rgba(30,54,92,0.85)');
    mg.addColorStop(1, 'rgba(8,14,28,0.2)');
    ctx.fillStyle = mg; ctx.fill();
    ctx.strokeStyle = 'rgba(120,190,255,0.22)';
    ctx.lineWidth = 1.1 * sc; ctx.stroke();
    ctx.restore();

    /* --- Yggdrasil, the world tree, spanning the mid playfield --- */
    ctx.save();
    ctx.translate(264 * sc, 900 * sc);
    ctx.strokeStyle = 'rgba(150,120,70,0.30)';
    ctx.lineCap = 'round';
    branch(ctx, 0, 0, -Math.PI / 2, 250 * sc, 13 * sc, 0, new U.Rng(77));
    ctx.restore();

    /* --- rune ring around the Well of Urd --- */
    runeRing(ctx, 264 * sc, 420 * sc, 118 * sc, 'rgba(255,200,110,0.24)', sc, 16, 7002);
    runeRing(ctx, 264 * sc, 420 * sc, 146 * sc, 'rgba(110,220,255,0.14)', sc, 22, 331);

    /* --- radiating energy lines from the centre --- */
    ctx.save();
    ctx.globalCompositeOperation = 'lighter';
    ctx.translate(264 * sc, 420 * sc);
    for (var a = 0; a < 40; a++) {
      var ang = a * U.TAU / 40;
      var g2 = ctx.createLinearGradient(0, 0, Math.cos(ang) * 420 * sc, Math.sin(ang) * 420 * sc);
      g2.addColorStop(0, 'rgba(120,200,255,0.10)');
      g2.addColorStop(1, 'rgba(120,200,255,0)');
      ctx.strokeStyle = g2;
      ctx.lineWidth = (a % 4 === 0 ? 2.2 : 1) * sc;
      ctx.beginPath(); ctx.moveTo(Math.cos(ang) * 150 * sc, Math.sin(ang) * 150 * sc);
      ctx.lineTo(Math.cos(ang) * 430 * sc, Math.sin(ang) * 430 * sc);
      ctx.stroke();
    }
    ctx.restore();

    /* --- big hammer silhouette down at the apron --- */
    ctx.save();
    ctx.translate(250 * sc, 1010 * sc);
    ctx.globalAlpha = 0.16;
    ctx.fillStyle = '#8fd8ff';
    U.roundRect(ctx, -46 * sc, -34 * sc, 92 * sc, 44 * sc, 8 * sc); ctx.fill();
    U.roundRect(ctx, -10 * sc, 8 * sc, 20 * sc, 78 * sc, 6 * sc); ctx.fill();
    ctx.globalAlpha = 0.30;
    ctx.strokeStyle = '#cfefff'; ctx.lineWidth = 1.6 * sc;
    U.roundRect(ctx, -46 * sc, -34 * sc, 92 * sc, 44 * sc, 8 * sc); ctx.stroke();
    ctx.restore();

    /* --- serpent coiling up the left lane (Jormungandr) --- */
    ctx.save();
    ctx.globalAlpha = 0.30;
    ctx.strokeStyle = '#4de2a8';
    ctx.lineWidth = 5 * sc; ctx.lineCap = 'round';
    ctx.beginPath();
    for (var yy3 = 360; yy3 <= 720; yy3 += 6) {
      var xx = 32 + Math.sin(yy3 * 0.035) * 12;
      if (yy3 === 360) ctx.moveTo(xx * sc, yy3 * sc); else ctx.lineTo(xx * sc, yy3 * sc);
    }
    ctx.stroke();
    ctx.globalAlpha = 0.5;
    ctx.lineWidth = 1.6 * sc;
    ctx.stroke();
    ctx.restore();

    ctx.restore();
  }

  function branch(ctx, x, y, ang, len, wid, depth, rng) {
    if (len < 9 || depth > 7) return;
    var ex = x + Math.cos(ang) * len, ey = y + Math.sin(ang) * len;
    ctx.lineWidth = Math.max(0.6, wid);
    ctx.beginPath();
    ctx.moveTo(x, y);
    ctx.quadraticCurveTo(
      x + Math.cos(ang + 0.18) * len * 0.5,
      y + Math.sin(ang + 0.18) * len * 0.5, ex, ey);
    ctx.stroke();
    var n = depth < 2 ? 3 : 2;
    for (var i = 0; i < n; i++) {
      branch(ctx, ex, ey,
        ang + rng.range(-0.62, 0.62) + (i - (n - 1) / 2) * 0.42,
        len * rng.range(0.56, 0.74), wid * 0.62, depth + 1, rng);
    }
  }

  var RUNES = ['ᚠ', 'ᚢ', 'ᚦ', 'ᚱ', 'ᚷ', 'ᚾ', 'ᛁ', 'ᛇ',
    'ᛋ', 'ᛏ', 'ᛒ', 'ᛖ', 'ᛚ', 'ᛞ', 'ᛡ', 'ᛦ'];
  function runeRing(ctx, cx, cy, r, color, sc, n, seed) {
    var rng = new U.Rng(seed);
    ctx.save();
    ctx.fillStyle = color;
    ctx.font = '600 ' + (15 * sc) + 'px "Segoe UI Symbol", "Noto Sans Runic", serif';
    ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
    for (var i = 0; i < n; i++) {
      var a = i * U.TAU / n - Math.PI / 2;
      ctx.save();
      ctx.translate(cx + Math.cos(a) * r, cy + Math.sin(a) * r);
      ctx.rotate(a + Math.PI / 2);
      ctx.fillText(RUNES[rng.int(RUNES.length)], 0, 0);
      ctx.restore();
    }
    ctx.strokeStyle = color;
    ctx.lineWidth = 0.9 * sc;
    ctx.globalAlpha = 0.5;
    ctx.beginPath(); ctx.arc(cx, cy, r + 12 * sc, 0, U.TAU); ctx.stroke();
    ctx.beginPath(); ctx.arc(cx, cy, r - 12 * sc, 0, U.TAU); ctx.stroke();
    ctx.restore();
  }

  /* --------------------------------------------------------- lane paint */
  function paintLanePaint(ctx, sc) {
    ctx.save();
    // painted shot lanes: soft glowing corridors leading into each shot
    var lanes = [
      { x: 178, y: 700, a: -92, w: 44, len: 120, c: 'rgba(90,200,255,0.13)' },
      { x: 348, y: 700, a: -88, w: 44, len: 120, c: 'rgba(255,190,90,0.13)' },
      { x: 264, y: 560, a: -90, w: 60, len: 150, c: 'rgba(255,200,110,0.10)' },
      { x: 32, y: 660, a: -90, w: 40, len: 150, c: 'rgba(90,255,200,0.10)' },
      { x: 468, y: 660, a: -90, w: 40, len: 150, c: 'rgba(255,190,90,0.10)' }
    ];
    for (var i = 0; i < lanes.length; i++) {
      var L = lanes[i];
      ctx.save();
      ctx.translate(L.x * sc, L.y * sc);
      ctx.rotate((L.a + 90) * U.DEG);
      var g = ctx.createLinearGradient(0, 0, 0, -L.len * sc);
      g.addColorStop(0, L.c);
      g.addColorStop(1, 'rgba(0,0,0,0)');
      ctx.fillStyle = g;
      ctx.fillRect(-L.w * 0.5 * sc, -L.len * sc, L.w * sc, L.len * sc);
      ctx.restore();
    }

    // white lane liners around the in/outlanes
    ctx.strokeStyle = 'rgba(210,235,255,0.16)';
    ctx.lineWidth = 1.6 * sc;
    [[56, 838, 88, 1018], [444, 838, 412, 1018]].forEach(function (l) {
      ctx.beginPath(); ctx.moveTo(l[0] * sc, l[1] * sc); ctx.lineTo(l[2] * sc, l[3] * sc); ctx.stroke();
    });
    ctx.restore();
  }

  /* ------------------------------------------------------ insert lenses */
  function paintInsertLenses(ctx, sc) {
    for (var i = 0; i < INS.length; i++) {
      var s = INS[i];
      ctx.save();
      // recess shadow
      ctx.save();
      ctx.translate(0, 1.4 * sc);
      Art.insertPath(ctx, s, sc);
      ctx.fillStyle = 'rgba(0,0,0,0.55)';
      ctx.fill();
      ctx.restore();

      // milky unlit lens
      Art.insertPath(ctx, s, sc);
      var rgb = U.hexToRgb(s.c);
      var g = ctx.createLinearGradient(0, (s.y - (s.h || s.w) * 0.5) * sc, 0, (s.y + (s.h || s.w) * 0.5) * sc);
      g.addColorStop(0, 'rgba(' + rgb.join(',') + ',0.26)');
      g.addColorStop(1, 'rgba(' + rgb.map(function (v) { return Math.round(v * 0.35); }).join(',') + ',0.20)');
      ctx.fillStyle = g;
      ctx.fill();
      ctx.strokeStyle = 'rgba(4,8,14,0.85)';
      ctx.lineWidth = 1.5 * sc;
      ctx.stroke();
      // bevel highlight
      ctx.save();
      ctx.clip();
      ctx.strokeStyle = 'rgba(255,255,255,0.28)';
      ctx.lineWidth = 1.6 * sc;
      ctx.beginPath();
      ctx.moveTo((s.x - 40) * sc, (s.y - (s.h || s.w) * 0.5 + 1.2) * sc);
      ctx.lineTo((s.x + 40) * sc, (s.y - (s.h || s.w) * 0.5 + 1.2) * sc);
      ctx.stroke();
      ctx.restore();

      // silk-screened label on the lens
      if (s.txt) {
        ctx.fillStyle = 'rgba(6,10,18,0.72)';
        var fs = Math.max(4.2, Math.min((s.h || s.w) * 0.55, (s.w) * 0.34)) * sc;
        ctx.font = '800 ' + fs + 'px Inter, "Segoe UI", sans-serif';
        ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
        ctx.fillText(s.txt, s.x * sc, (s.y + (s.shape === 'arrow' ? 8 : 0.4)) * sc);
      }
      ctx.restore();
    }
  }

  /* --------------------------------------------------- screened lettering */
  function paintScreenText(ctx, sc) {
    ctx.save();
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';

    function label(txt, x, y, size, color, rot, weight, track) {
      ctx.save();
      ctx.translate(x * sc, y * sc);
      if (rot) ctx.rotate(rot * U.DEG);
      ctx.font = (weight || 800) + ' ' + (size * sc) + 'px Inter, "Segoe UI", sans-serif';
      if (track) {
        var total = 0, w = [];
        for (var i = 0; i < txt.length; i++) { w[i] = ctx.measureText(txt[i]).width + track * sc; total += w[i]; }
        var cx = -total / 2;
        ctx.fillStyle = color;
        for (var j = 0; j < txt.length; j++) { ctx.fillText(txt[j], cx + w[j] / 2, 0); cx += w[j]; }
      } else {
        ctx.fillStyle = color;
        ctx.fillText(txt, 0, 0);
      }
      ctx.restore();
    }

    label('YGGDRASIL', 32, 760, 8, 'rgba(160,230,255,0.55)', -90, 800, 1.6);
    label('MIDGARD', 468, 760, 8, 'rgba(255,210,140,0.55)', 90, 800, 1.6);
    label('BIFROST RAMP', 178, 736, 8.4, 'rgba(160,230,255,0.62)', 0, 800, 1.2);
    label('VALHALLA RAMP', 348, 736, 8.4, 'rgba(255,210,140,0.62)', 0, 800, 1.2);
    label('WELL OF URD', 264, 508, 9, 'rgba(255,215,140,0.70)', 0, 800, 1.6);
    label('JOTUNN', 264, 556, 8.4, 'rgba(200,225,255,0.52)', 0, 800, 2.2);
    label('RUNE CAVERN', 264, 210, 8, 'rgba(190,175,255,0.55)', 0, 800, 1.8);
    label('JORMUNGANDR', 32, 600, 6.6, 'rgba(120,245,190,0.60)', -90, 800, 1.0);
    label('HEIMDALL', 452, 706, 7, 'rgba(200,225,255,0.45)', 0, 800, 1.2);

    // maker's mark on the apron area
    label('RAGNAROK', 250, 1118, 15, 'rgba(255,196,71,0.30)', 0, 900, 4);
    label('HAMMER OF THE GODS', 250, 1136, 6.4, 'rgba(160,200,255,0.28)', 0, 700, 2.4);
    ctx.restore();
  }

  /* ---------------------------------------------------- steel ball guides */
  function paintGuides(ctx, sc, table) {
    var M = P.MAT;
    ctx.save();
    ctx.lineCap = 'round';

    function strokeShape(build, width, style, alpha) {
      ctx.globalAlpha = alpha === undefined ? 1 : alpha;
      ctx.lineWidth = width;
      ctx.strokeStyle = style;
      build();
      ctx.stroke();
      ctx.globalAlpha = 1;
    }

    var list = [];
    var i;
    for (i = 0; i < table.walls.length; i++) {
      var w = table.walls[i];
      if (!w.vis) continue;
      if (w.mat === M.drop || w.mat === M.target || w.mat === M.rubber) continue;
      if (w.tag && (w.tag.indexOf('drop:') === 0 || w.tag.indexOf('standup:') === 0 || w.tag.indexOf('sling:') === 0)) continue;
      list.push(w);
    }

    // shadow pass
    ctx.save();
    ctx.translate(1.6 * sc, 2.4 * sc);
    strokeShape(function () {
      ctx.beginPath();
      for (var j = 0; j < list.length; j++) {
        ctx.moveTo(list[j].x1 * sc, list[j].y1 * sc);
        ctx.lineTo(list[j].x2 * sc, list[j].y2 * sc);
      }
      for (var a = 0; a < table.arcs.length; a++) {
        var ar = table.arcs[a];
        if (!ar.vis) continue;
        ctx.moveTo((ar.cx + Math.cos(ar.a0) * ar.rad) * sc, (ar.cy + Math.sin(ar.a0) * ar.rad) * sc);
        ctx.arc(ar.cx * sc, ar.cy * sc, ar.rad * sc, ar.a0, ar.a1);
      }
    }, 5.4 * sc, 'rgba(0,0,0,0.55)');
    ctx.restore();

    function allPaths() {
      ctx.beginPath();
      for (var j = 0; j < list.length; j++) {
        ctx.moveTo(list[j].x1 * sc, list[j].y1 * sc);
        ctx.lineTo(list[j].x2 * sc, list[j].y2 * sc);
      }
      for (var a = 0; a < table.arcs.length; a++) {
        var ar = table.arcs[a];
        if (!ar.vis) continue;
        ctx.moveTo((ar.cx + Math.cos(ar.a0) * ar.rad) * sc, (ar.cy + Math.sin(ar.a0) * ar.rad) * sc);
        ctx.arc(ar.cx * sc, ar.cy * sc, ar.rad * sc, ar.a0, ar.a1);
      }
    }

    strokeShape(allPaths, 5.0 * sc, '#4c5568');            // guide body
    strokeShape(allPaths, 3.2 * sc, '#98a6bd');            // face
    ctx.save();
    ctx.translate(-0.6 * sc, -0.9 * sc);
    strokeShape(allPaths, 1.25 * sc, 'rgba(255,255,255,0.72)');  // specular
    ctx.restore();

    ctx.restore();
  }

  /* ------------------------------------------------------------ plastics */
  function paintPlastics(ctx, sc, table) {
    var i;
    // rubber-sleeved posts
    for (i = 0; i < table.posts.length; i++) {
      var p = table.posts[i];
      Art.post(ctx, p.cx * sc, p.cy * sc, p.r * sc, sc);
    }
    // slingshot bodies
    for (i = 0; i < table.slings.length; i++) Art.slingBase(ctx, table.slings[i], sc);
    // scoop mouth
    Art.scoopBase(ctx, table.scoop, sc);
  }

  Art.post = function (ctx, x, y, r, sc) {
    ctx.save();
    ctx.beginPath(); ctx.ellipse(x + 1.5 * sc, y + 3 * sc, r * 1.02, r * 0.85, 0, 0, U.TAU);
    ctx.fillStyle = 'rgba(0,0,0,0.5)'; ctx.fill();
    var g = ctx.createRadialGradient(x - r * 0.35, y - r * 0.4, r * 0.12, x, y, r);
    g.addColorStop(0, '#f6fbff'); g.addColorStop(0.45, '#b9cfe4'); g.addColorStop(1, '#43536a');
    ctx.beginPath(); ctx.arc(x, y, r, 0, U.TAU); ctx.fillStyle = g; ctx.fill();
    ctx.beginPath(); ctx.arc(x, y, r * 0.55, 0, U.TAU);
    ctx.fillStyle = 'rgba(20,28,42,0.85)'; ctx.fill();
    ctx.beginPath(); ctx.arc(x - r * 0.28, y - r * 0.3, r * 0.2, 0, U.TAU);
    ctx.fillStyle = 'rgba(255,255,255,0.75)'; ctx.fill();
    ctx.restore();
  };

  Art.slingBase = function (ctx, s, sc) {
    ctx.save();
    ctx.beginPath();
    ctx.moveTo(s.a[0] * sc, s.a[1] * sc);
    ctx.lineTo(s.b[0] * sc, s.b[1] * sc);
    ctx.lineTo(s.c[0] * sc, s.c[1] * sc);
    ctx.closePath();
    ctx.save();
    ctx.translate(2 * sc, 3 * sc);
    ctx.fillStyle = 'rgba(0,0,0,0.55)'; ctx.fill();
    ctx.restore();
    var mid = [(s.a[0] + s.b[0] + s.c[0]) / 3 * sc, (s.a[1] + s.b[1] + s.c[1]) / 3 * sc];
    var g = ctx.createRadialGradient(mid[0], mid[1] - 12 * sc, 4 * sc, mid[0], mid[1], 60 * sc);
    g.addColorStop(0, 'rgba(140,190,255,0.55)');
    g.addColorStop(1, 'rgba(24,44,80,0.85)');
    ctx.fillStyle = g; ctx.fill();
    ctx.strokeStyle = 'rgba(190,225,255,0.55)'; ctx.lineWidth = 1.4 * sc; ctx.stroke();
    // a rune stamped on each sling plastic
    ctx.fillStyle = 'rgba(255,220,150,0.55)';
    ctx.font = '700 ' + 16 * sc + 'px "Segoe UI Symbol", serif';
    ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
    ctx.fillText(s.side === 'left' ? 'ᚱ' : 'ᛁ', mid[0], mid[1] + 4 * sc);
    ctx.restore();
  };

  Art.scoopBase = function (ctx, sc0, sc) {
    var x = sc0.x * sc, y = sc0.y * sc, r = sc0.r * sc;
    ctx.save();
    // the hole itself
    var g = ctx.createRadialGradient(x, y - r * 0.3, r * 0.15, x, y, r * 1.35);
    g.addColorStop(0, '#000'); g.addColorStop(0.72, '#04060c'); g.addColorStop(1, '#1a2438');
    ctx.beginPath(); ctx.arc(x, y, r * 1.3, 0, U.TAU); ctx.fillStyle = g; ctx.fill();
    // steel hood
    ctx.beginPath();
    ctx.arc(x, y, r * 1.55, Math.PI * 1.02, Math.PI * 1.98);
    ctx.lineWidth = 5 * sc; ctx.strokeStyle = '#5b6a80'; ctx.stroke();
    ctx.lineWidth = 2.4 * sc; ctx.strokeStyle = '#b9cbe0'; ctx.stroke();
    ctx.restore();
  };

  /* ---------------------------------------------------------------- wear */
  function paintWear(ctx, sc, W, H) {
    ctx.save();
    var rng = new U.Rng(31337);
    // ball swirl near the flippers and the shooter lane
    ctx.globalAlpha = 0.05;
    ctx.strokeStyle = '#dfeaff';
    ctx.lineWidth = 0.8 * sc;
    for (var i = 0; i < 260; i++) {
      var cx = rng.range(60, 460) * sc;
      var cy = rng.range(560, 1120) * sc;
      var rr = rng.range(2, 16) * sc;
      var a0 = rng.range(0, U.TAU);
      ctx.beginPath(); ctx.arc(cx, cy, rr, a0, a0 + rng.range(0.7, 3.2)); ctx.stroke();
    }
    // dust in the corners
    ctx.globalAlpha = 0.075;
    ctx.fillStyle = '#000';
    for (var j = 0; j < 90; j++) {
      var x = rng.range(0, W), y = rng.range(0, H);
      ctx.beginPath(); ctx.arc(x, y, rng.range(4, 30) * sc, 0, U.TAU); ctx.fill();
    }
    ctx.restore();
  }

  /* --------------------------------------------------------------- apron */
  function paintApron(ctx, sc, W, H) {
    var y0 = 1146 * sc;
    ctx.save();
    var g = ctx.createLinearGradient(0, y0, 0, H);
    g.addColorStop(0, '#28313f');
    g.addColorStop(0.25, '#1b2230');
    g.addColorStop(1, '#0a0e16');
    ctx.fillStyle = g;
    ctx.fillRect(0, y0, W, H - y0);
    ctx.strokeStyle = 'rgba(190,215,245,0.45)';
    ctx.lineWidth = 1.6 * sc;
    ctx.beginPath(); ctx.moveTo(0, y0); ctx.lineTo(W, y0); ctx.stroke();
    ctx.restore();
  }

})(window.PB = window.PB || {});
