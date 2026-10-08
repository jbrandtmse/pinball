// PLEASURE PALACE — boot, render & input (browser only).

(function () {
  'use strict';
  if (typeof document === 'undefined') return;

  var canvas = document.getElementById('pcb');
  var ctx = canvas.getContext('2d');
  var DESIGN = { w: 540, h: 1100 };
  var dpr = Math.max(1, Math.min(2, window.devicePixelRatio || 1));

  canvas.width = DESIGN.w * dpr;
  canvas.height = DESIGN.h * dpr;

  var built = PP_TABLE.build();
  var scene = built.scene;
  var rules = PP_RULES.create(scene);
  var dmd = PP_DMD.create();
  var audio = PP_AUDIO.create();

  // ---------- input state ----------------------------------------------------
  var input = {
    flipL: false, flipR: false,
    plungerDown: false, plungerPower: 0, plungerDir: 1,
    musicKey: false
  };
  var state = 'attract';   // attract | play | hsentry
  var hsText = '';
  var attractT = 0;
  var lastT = performance.now();
  var shake = { x: 0, y: 0, t: 0 };

  function keyMap(code) {
    if (code === 'ShiftLeft' || code === 'KeyZ' || code === 'KeyC') return 'flipL';
    if (code === 'ShiftRight' || code === 'KeyX' || code === 'KeyV') return 'flipR';
    if (code === 'Space' || code === 'Enter') return 'plunger';
    return null;
  }

  window.addEventListener('keydown', function (e) {
    if (['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight', 'Space'].indexOf(e.code) >= 0) e.preventDefault();
    if (e.repeat) return;

    if (state === 'hsentry') {
      var nm = e.key.toUpperCase();
      if (/^[A-Z0-9]$/.test(nm) && hsText.length < 3) hsText += nm;
      if (e.key === 'Backspace') hsText = hsText.slice(0, -1);
      if (hsText.length > 0 && hsText.length < 3) {
        // live feedback: keep the prompt on screen and show the letters so far
        dmd.setPrompt('INITIALS: ' + hsText + '..');
      }
      if (hsText.length >= 3) {
        rules.recordHS(hsText);
        dmd.setPrompt(null);
        dmd.show('GREAT ' + hsText + ' — YOU WIN!', 2.5, 2);
        audio.play('coin');
        hsText = '';
        state = 'attract'; attractT = 0;
      }
      return;
    }

    if (e.code === 'KeyM') {
      if (audio.musicState()) audio.musicStop(); else audio.musicStart();
      return;
    }

    var k = keyMap(e.code);
    if (state === 'attract') {
      if (k === 'plunger' || k === 'flipL' || k === 'flipR') { audio.play('coin'); startGame(); }
      if (e.code.indexOf('Arrow') === 0) { }
      return;
    }
    if (state === 'play') {
      if (k === 'flipL') { input.flipL = true; audio.play('flipper'); }
      if (k === 'flipR') { input.flipR = true; audio.play('flipper'); }
      if (k === 'plunger') { input.plungerDown = true; }
      if (e.code === 'ArrowLeft') { rules.nudge(-170, 0); }
      if (e.code === 'ArrowRight') { rules.nudge(170, 0); }
      if (e.code === 'ArrowUp') { rules.nudge(0, -190); }
      if (e.code === 'ArrowDown') { rules.nudge(0, -140); }
    }
  });
  window.addEventListener('keyup', function (e) {
    var k = keyMap(e.code);
    if (k === 'flipL') input.flipL = false;
    if (k === 'flipR') input.flipR = false;
    if (k === 'plunger') {
      if (state === 'play' && input.plungerDown) {
        rules.plungerRelease(input.plungerPower);
        audio.play('launch');
      }
      input.plungerDown = false; input.plungerPower = 0; input.plungerDir = 1;
    }
  });

  // mouse / touch: left half = left flip, right half = right flip
  canvas.addEventListener('pointerdown', function (e) {
    e.preventDefault();
    var r = canvas.getBoundingClientRect();
    var x = (e.clientX - r.left) / r.width * DESIGN.w;
    var y = (e.clientY - r.top) / r.height * DESIGN.h;
    if (state === 'attract') { audio.play('coin'); startGame(); return; }
    if (state !== 'play') return;
    if (y > 1040 && x > scene.lane.left) input.plungerDown = true;
    else if (x < DESIGN.w / 2) { input.flipL = true; audio.play('flipper'); }
    else { input.flipR = true; audio.play('flipper'); }
  });
  canvas.addEventListener('pointerup', function () {
    if (input.plungerDown && state === 'play') {
      rules.plungerRelease(input.plungerPower); audio.play('launch');
    }
    input.plungerDown = false; input.flipL = false; input.flipR = false;
    input.plungerPower = 0;
  });

  function startGame() {
    state = 'play';
    scene.balls = [];
    rules.startGame();
    if (!audio.musicState()) audio.musicStart();
  }

  // ---------- main loop ------------------------------------------------------
  function frame(now) {
    var dt = Math.min(0.1, (now - lastT) / 1000);
    lastT = now;

    // flippers
    for (var i = 0; i < scene.flippers.length; i++) {
      var f = scene.flippers[i];
      if (f.side === 'L') f.target = input.flipL ? -0.42 : 0.42;
      else f.target = input.flipR ? -0.42 : 0.42;
    }

    if (state === 'play') {
      // plunger charge
      if (input.plungerDown) {
        input.plungerPower += input.plungerDir * dt / 0.9;
        if (input.plungerPower >= 1) { input.plungerPower = 1; input.plungerDir = -1; }
        if (input.plungerPower <= 0) { input.plungerPower = 0; input.plungerDir = 1; }
      }
      var evts = [];
      var out = PP_STEP(scene, dt, evts);
      var res = rules.handle(evts);
      for (var s = 0; s < res.sounds.length; s++) audio.play(res.sounds[s].name, res.sounds[s].pitch);
      rules.tick(dt);

      if (rules.gameOver) {
        if (rules.hsPrompt) {
          state = 'hsentry'; hsText = ''; rules.hsPrompt = false;
          dmd.setPrompt('TYPE 3 INITIALS');
        }
        else { state = 'attract'; dmd.setPrompt(null); }
        attractT = 0;
      }
    } else {
      attractT += dt;
      // keep physics alive during attract so demo elements animate? no balls — skip
      // occasionally rotate spinner card for life
      if (scene.spinner) scene.spinner.angle += dt * 1.5;
    }

    // messages -> DMD
    var ms = rules.drainMessages();
    for (var m = 0; m < ms.length; m++) dmd.show(ms[m].text, ms[m].hold, ms[m].prio);
    dmd.tick(dt);

    // flash decay
    for (i = 0; i < scene.items.length; i++) if (scene.items[i].flash > 0) scene.items[i].flash = Math.max(0, scene.items[i].flash - dt * 3);

    render(now);
    requestAnimationFrame(frame);
  }
  // physics step lives in PHYS; bind once
  function PP_STEP(sc, dt, evts) { PHYS.step(sc, dt, evts); return { }; }

  // rewire: step must return rules-agnostic events to handle(): fix flow —
  // simpler: handle() consumes evts directly in frame (already does); PP_STEP just steps.

  // ---------- rendering ------------------------------------------------------
  function render(now) {
    var t = now / 1000;
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    // cabinet frame
    ctx.fillStyle = '#050505';
    ctx.fillRect(0, 0, DESIGN.w, DESIGN.h);

    // shake effect
    var sx = 0, sy = 0;
    if (shake.t > 0) { sx = (Math.random() - 0.5) * 8 * shake.t; sy = (Math.random() - 0.5) * 8 * shake.t; shake.t = Math.max(0, shake.t - 0.03); }
    ctx.save();
    ctx.translate(sx, sy);

    drawBackbox(t);
    drawPlayfield(t);
    drawApron(t);

    ctx.restore();
  }

  function drawBackbox(t) {
    // neon logo
    ctx.save();
    ctx.fillStyle = '#1a0a0a';
    ctx.fillRect(0, 0, DESIGN.w, 160);
    // velvet stripes
    for (var i = 0; i < 6; i++) {
      ctx.fillStyle = i % 2 ? 'rgba(120,20,30,0.10)' : 'rgba(90,10,20,0.08)';
      ctx.fillRect(0, i * 26, DESIGN.w, 13);
    }
    // title
    ctx.font = 'bold 27px Georgia, serif';
    ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
    ctx.shadowColor = 'rgba(255,60,80,0.9)';
    ctx.shadowBlur = 16 + 6 * Math.sin(t * 2.1);
    ctx.fillStyle = '#ff4d5e';
    ctx.fillText('PLEASURE PALACE', DESIGN.w / 2, 34);
    ctx.shadowBlur = 0;
    ctx.font = 'bold 11px monospace';
    ctx.fillStyle = '#c9a24a';
    ctx.fillText('★ WILLIAMS-STYLE BURLESQUE TABLE ★', DESIGN.w / 2, 52);
    ctx.textAlign = 'left';
    // DMD screen
    var D = PP_TABLE.DMD;
    dmd.render(ctx, D.x, D.y, D.w, D.h, rules.score, rules.ballNo, rules.multiplier, rules.tilt, t);
    // ball-count indicators (right of DMD, in backbox margin)
    ctx.font = 'bold 11px monospace';
    ctx.fillStyle = '#c9a24a';
    ctx.fillText('BALLS', 490, 80);
    for (var b = 0; b < Math.min(8, rules.ballsLeft); b++) {
      ctx.fillStyle = (b < rules.ballsLeft) ? '#ffd27a' : '#3a2a10';
      ctx.beginPath(); ctx.arc(510 + (b % 2) * 16, 96 + Math.floor(b / 2) * 16, 6, 0, Math.PI * 2); ctx.fill();
    }
    ctx.restore();
  }

  function drawPlayfield(t) {
    // base: deep velvet
    var g = ctx.createLinearGradient(0, 160, 0, 1080);
    g.addColorStop(0, '#2b0710');
    g.addColorStop(0.5, '#3a0d14');
    g.addColorStop(1, '#1c0508');
    ctx.fillStyle = g;
    ctx.fillRect(0, 160, DESIGN.w, 920);

    // painted motifs (static, cheap):
    // 1) spotlight + pinup silhouette under arch
    var sg = ctx.createRadialGradient(270, 360, 20, 270, 360, 190);
    sg.addColorStop(0, 'rgba(255,215,140,0.16)');
    sg.addColorStop(1, 'rgba(255,215,140,0)');
    ctx.fillStyle = sg;
    ctx.fillRect(100, 180, 340, 360);
    drawPinup(270, 352);

    // 2) guide corridors
    drawGuideLanes(t);
    // 3) spinner
    drawSpinner(t);
    // 4) bumper cluster
    drawBumpers(t);
    // 5) slings
    drawSlings(t);
    // 6) bank
    drawBank(t);
    // 7) kitten
    drawKitten(t);
    // 8) lane + plunger
    drawLane(t);
    // 9) rolls (S E X Y)
    drawRolls(t);
    // 10) flippers
    drawFlippers(t);
    // 11) balls
    drawBalls(t);
    // 12) tilt lamp
    if (rules.tilt) {
      ctx.font = 'bold 30px monospace';
      ctx.fillStyle = 'rgba(255,40,40,' + (0.55 + 0.45 * Math.sin(t * 9)) + ')';
      ctx.textAlign = 'center';
      ctx.fillText('TILT', 270, 760);
      ctx.textAlign = 'left';
    }
  }

  function drawPinup(cx, cy) {
    // stylized reclining burlesque silhouette (gold on velvet)
    ctx.save();
    ctx.translate(cx, cy);
    ctx.fillStyle = 'rgba(212,160,80,0.30)';
    ctx.beginPath();
    // head
    ctx.arc(-58, -26, 11, 0, Math.PI * 2);
    ctx.fill();
    // body: reclining curve
    ctx.beginPath();
    ctx.moveTo(-52, -18);
    ctx.bezierCurveTo(-40, -6, -20, -2, 4, 2);
    ctx.bezierCurveTo(22, 5, 36, 16, 52, 26);
    ctx.bezierCurveTo(40, 30, 20, 26, 2, 20);
    ctx.bezierCurveTo(-14, 15, -34, 4, -48, -6);
    ctx.closePath();
    ctx.fill();
    // fan
    ctx.beginPath();
    ctx.fillStyle = 'rgba(255,90,110,0.35)';
    for (var a = -0.5; a < 2.6; a += 0.5) {
      ctx.moveTo(-60, -30);
      ctx.arc(-60, -30, 30, a, a + 0.3);
    }
    ctx.fill();
    ctx.restore();
  }

  function drawGuideLanes(t) {
    // corridor outlines with soft neon
    ctx.lineWidth = 3;
    ctx.strokeStyle = 'rgba(140,160,220,0.75)';
    ctx.shadowColor = 'rgba(120,150,255,0.6)';
    ctx.shadowBlur = 6;
    // left corridor
    line(20, 415, 20, 1078);
    line(78, 432, 78, 1078);
    // arch
    ctx.beginPath();
    for (var i = 0; i < 16; i++) {
      var a = (180 - i * 12) * Math.PI / 180;
      var x = 270 + 250 * Math.cos(a), y = 415 - 250 * Math.sin(a);
      if (i === 0) ctx.moveTo(x, y); else ctx.lineTo(x, y);
    }
    ctx.stroke();
    // right wall + lane
    line(520, 415, 520, 1078);
    line(478, 432, 478, 1078);
    line(480, 1080, 519, 1080);
    // inlanes
    line(196, 878, 196, 1078);
    line(250, 878, 250, 947);
    line(344, 878, 344, 1078);
    line(290, 878, 290, 947);
    // right outlane
    line(430, 878, 430, 1078);
    ctx.shadowBlur = 0;
    // corridor labels
    ctx.font = 'bold 10px monospace';
    ctx.fillStyle = 'rgba(255,200,120,0.8)';
    ctx.save(); ctx.translate(50, 700); ctx.rotate(Math.PI / 2); ctx.fillText('LEFT GUIDE', 0, 0); ctx.restore();
    ctx.save(); ctx.translate(454, 700); ctx.rotate(-Math.PI / 2); ctx.fillText('RIGHT GUIDE', 0, 0); ctx.restore();
  }

  function drawSpinner(t) {
    var sp = scene.spinner;
    var cx = (sp.ax + sp.bx) / 2, cy = (sp.ay + sp.by) / 2;
    var rot = sp.anim > 0 ? (1 - sp.anim) * 12 + t * 26 : t * 1.2;
    if (sp.anim > 0) sp.anim = Math.max(0, sp.anim - 0.03);
    var w = (sp.bx - sp.ax) / 2 - 4;
    var squeeze = Math.abs(Math.cos(rot));
    ctx.save();
    ctx.translate(cx, cy);
    ctx.fillStyle = 'rgba(255,210,120,0.9)';
    ctx.shadowColor = 'rgba(255,180,60,0.8)';
    ctx.shadowBlur = 8;
    ctx.fillRect(-w * (0.15 + 0.85 * squeeze), -10, 2 * w * (0.15 + 0.85 * squeeze), 20);
    ctx.shadowBlur = 0;
    ctx.fillStyle = '#3a1010';
    ctx.font = 'bold 9px monospace';
    ctx.textAlign = 'center';
    if (squeeze > 0.4) ctx.fillText('SPIN', 0, 3);
    ctx.textAlign = 'left';
    ctx.restore();
  }

  function drawBumpers(t) {
    var labels = { 'BIG LOVE': '#ff5a78', 'BOOBIES': '#ff7a9a', 'BOOTY': '#ff8866' };
    for (var i = 0; i < scene.circles.length; i++) {
      var c = scene.circles[i];
      if (!c.bumper) {
        ctx.fillStyle = '#8a8f9a';
        ctx.beginPath(); ctx.arc(c.cx, c.cy, c.r, 0, Math.PI * 2); ctx.fill();
        continue;
      }
      var lit = c.flash > 0 ? 1 : (0.5 + 0.5 * Math.sin(t * 3 + i * 1.7));
      var g = ctx.createRadialGradient(c.cx - 6, c.cy - 8, 4, c.cx, c.cy, c.r);
      var col = labels[c.label] || '#ff5a78';
      g.addColorStop(0, '#fff2e0');
      g.addColorStop(0.45, col);
      g.addColorStop(1, '#5c1020');
      ctx.fillStyle = g;
      ctx.beginPath(); ctx.arc(c.cx, c.cy, c.r, 0, Math.PI * 2); ctx.fill();
      // flashing ring
      ctx.lineWidth = 3;
      ctx.strokeStyle = lit > 0.6 ? 'rgba(255,255,200,0.95)' : 'rgba(255,180,120,0.35)';
      ctx.beginPath(); ctx.arc(c.cx, c.cy, c.r + 3, 0, Math.PI * 2); ctx.stroke();
      ctx.font = 'bold 9px monospace';
      ctx.fillStyle = '#ffe';
      ctx.textAlign = 'center';
      ctx.fillText(c.label, c.cx, c.cy + 3);
      ctx.textAlign = 'left';
    }
  }

  function drawSlings(t) {
    for (var i = 0; i < scene.items.length; i++) {
      var s = scene.items[i];
      if (s.kind !== 'sling') continue;
      var flash = s.flash > 0;
      ctx.lineWidth = 6;
      ctx.strokeStyle = flash ? '#fff8c0' : '#c0203a';
      ctx.shadowColor = flash ? 'rgba(255,255,200,1)' : 'rgba(192,32,58,0.5)';
      ctx.shadowBlur = flash ? 18 : 6;
      line(s.ax, s.ay, s.bx, s.by);
      ctx.shadowBlur = 0;
      // frame
      ctx.lineWidth = 2;
      ctx.strokeStyle = 'rgba(200,200,210,0.5)';
      if (s.label === 'slingL') {
        line(s.ax, s.ay, s.ax, s.by); line(s.ax, s.by, s.bx, s.by);
      } else {
        line(s.ax, s.ay, s.ax, s.by); line(s.ax, s.by, s.bx, s.by);
      }
    }
  }

  function drawBank(t) {
    ctx.font = 'bold 9px monospace';
    for (var i = 0; i < scene.items.length; i++) {
      var s = scene.items[i];
      if (!/^T[1-4]$/.test(s.label)) continue;
      if (s.dead) {
        ctx.strokeStyle = 'rgba(90,90,110,0.5)';
        ctx.setLineDash([4, 4]);
        line(s.ax, s.ay, s.bx, s.by);
        ctx.setLineDash([]);
      } else {
        ctx.lineWidth = 7;
        ctx.strokeStyle = '#e8b84a';
        ctx.shadowColor = 'rgba(255,200,80,0.8)';
        ctx.shadowBlur = 8;
        line(s.ax, s.ay, s.bx, s.by);
        ctx.shadowBlur = 0;
        var mx = (s.ax + s.bx) / 2, my = (s.ay + s.by) / 2;
        ctx.fillStyle = '#401808';
        ctx.font = 'bold 8px monospace';
        ctx.textAlign = 'center';
        ctx.fillText(s.label, mx, my + 2);
        ctx.textAlign = 'left';
      }
    }
    // bank title
    ctx.font = 'bold 11px monospace';
    ctx.fillStyle = 'rgba(255,210,120,0.9)';
    ctx.fillText('NAUGHTY LIST', 402, 570);
  }

  function drawKitten(t) {
    for (var i = 0; i < scene.items.length; i++) {
      var s = scene.items[i];
      if (s.label !== 'KITTEN') continue;
      ctx.lineWidth = 7;
      var glow = 0.6 + 0.4 * Math.sin(t * 2.4);
      ctx.strokeStyle = 'rgba(255,120,180,' + glow + ')';
      ctx.shadowColor = 'rgba(255,80,140,0.8)';
      ctx.shadowBlur = 10;
      line(s.ax, s.ay, s.bx, s.by);
      ctx.shadowBlur = 0;
      ctx.fillStyle = '#ffd8e8';
      ctx.font = 'bold 9px monospace';
      ctx.textAlign = 'center';
      ctx.fillText('SEXY KITTEN', 270, 752);
      ctx.textAlign = 'left';
    }
  }

  function drawLane(t) {
    // plunger spring + knob
    var py = scene.spawn.y + 24;
    ctx.strokeStyle = '#9aa2ae';
    ctx.lineWidth = 2;
    for (var y = 0; y < 34; y += 4) {
      ctx.beginPath();
      ctx.moveTo(490, py - 16 + y);
      ctx.lineTo(508, py - 14 + y);
      ctx.stroke();
    }
    ctx.fillStyle = '#c8ced8';
    ctx.beginPath();
    ctx.arc(499, py - 20, 9, 0, Math.PI * 2);
    ctx.fill();
    // power meter when charging
    if (input.plungerDown && state === 'play') {
      var p = input.plungerPower;
      ctx.fillStyle = '#222';
      ctx.fillRect(524, 430, 12, 130);
      var hue = 120 - p * 120;
      ctx.fillStyle = 'hsl(' + hue + ',90%,55%)';
      ctx.fillRect(524, 430 + 130 * (1 - p), 12, 130 * p);
      ctx.strokeStyle = '#fff';
      ctx.strokeRect(524, 430, 12, 130);
    }
    ctx.font = 'bold 9px monospace';
    ctx.fillStyle = 'rgba(255,200,120,0.8)';
    ctx.fillText('SHOOTER', 496, 1000);
  }

  function drawRolls(t) {
    var chars = ['S', 'E', 'X', 'Y'];
    var baseX = [50, 153, 387, 490], baseY = [300, 195, 195, 298];
    for (var i = 0; i < 4; i++) {
      var lit = rules.sexyLit[chars[i]];
      ctx.beginPath();
      ctx.arc(baseX[i], baseY[i], 13, 0, Math.PI * 2);
      ctx.fillStyle = lit ? 'rgba(255,220,120,0.95)' : 'rgba(80,50,20,0.5)';
      ctx.fill();
      ctx.font = 'bold 16px Georgia, serif';
      ctx.fillStyle = lit ? '#5c1a10' : '#c8a050';
      ctx.textAlign = 'center';
      ctx.fillText(chars[i], baseX[i], baseY[i] + 6);
      ctx.textAlign = 'left';
    }
    // inlane roll lamps
    [['INL', 223], ['INR', 317]].forEach(function (it) {
      var pulse = 0.4 + 0.3 * Math.sin(t * 4);
      ctx.beginPath();
      ctx.arc(it[1], 893, 11, 0, Math.PI * 2);
      ctx.fillStyle = 'rgba(120,200,140,' + pulse + ')';
      ctx.fill();
      ctx.font = 'bold 9px monospace';
      ctx.fillStyle = '#eafcea';
      ctx.textAlign = 'center';
      ctx.fillText('IN', it[1], 896);
      ctx.textAlign = 'left';
    });
    // kickback lamp
    var kb = scene.rolls.filter(function (r) { return r.label === 'OUTL'; })[0];
    if (kb) {
      ctx.beginPath(); ctx.arc(kb.cx, kb.cy, 12, 0, Math.PI * 2);
      ctx.fillStyle = rules.kickbackArmed ? 'rgba(255,80,80,' + (0.6 + 0.4 * Math.sin(t * 8)) + ')' : 'rgba(90,30,30,0.4)';
      ctx.fill();
      ctx.font = 'bold 8px monospace';
      ctx.fillStyle = '#ffd0d0';
      ctx.textAlign = 'center';
      ctx.fillText('KICK', kb.cx, kb.cy + 3);
      ctx.textAlign = 'left';
    }
  }

  function drawFlippers(t) {
    for (var i = 0; i < scene.flippers.length; i++) {
      var f = scene.flippers[i];
      var cs = Math.cos(f.angle), sn = Math.sin(f.angle);
      var dirx = f.side === 'L' ? 1 : -1;
      var tx = f.px + dirx * f.len * cs, ty = f.py + f.len * sn;
      var down = f.target > 0;
      var col = f.side === 'L' ? '#d83040' : '#e85030';
      // thick capsule
      ctx.lineCap = 'round';
      ctx.lineWidth = f.r0 * 2;
      ctx.strokeStyle = col;
      ctx.shadowColor = 'rgba(255,120,80,0.7)';
      ctx.shadowBlur = down ? 4 : 14;
      ctx.beginPath();
      ctx.moveTo(f.px, f.py);
      ctx.lineTo((f.px + tx) / 2, (f.py + ty) / 2);
      ctx.stroke();
      ctx.lineWidth = f.r1 * 2;
      ctx.beginPath();
      ctx.moveTo((f.px + tx) / 2, (f.py + ty) / 2);
      ctx.lineTo(tx, ty);
      ctx.stroke();
      ctx.shadowBlur = 0;
      ctx.lineCap = 'butt';
      // pivot cap
      ctx.fillStyle = '#7a828e';
      ctx.beginPath(); ctx.arc(f.px, f.py, 6, 0, Math.PI * 2); ctx.fill();
    }
  }

  function drawBalls(t) {
    for (var i = 0; i < scene.balls.length; i++) {
      var b = scene.balls[i];
      var g = ctx.createRadialGradient(b.x - b.r * 0.35, b.y - b.r * 0.4, 2, b.x, b.y, b.r);
      g.addColorStop(0, '#ffffff');
      g.addColorStop(0.35, '#cfd6de');
      g.addColorStop(0.7, '#7d8792');
      g.addColorStop(1, '#3a424c');
      ctx.fillStyle = g;
      ctx.beginPath(); ctx.arc(b.x, b.y, b.r, 0, Math.PI * 2); ctx.fill();
    }
  }

  function drawApron(t) {
    ctx.fillStyle = '#12060a';
    ctx.fillRect(0, 1080, DESIGN.w, 20);
    ctx.font = 'bold 10px monospace';
    ctx.fillStyle = '#c9a24a';
    ctx.fillText('PLEASURE PALACE', 210, 1093);
    ctx.fillStyle = 'rgba(255,120,120,0.8)';
    ctx.fillText('MATURE 17+', 40, 1093);
    ctx.fillStyle = '#888';
    ctx.fillText(state === 'play' ? ('BALLS ' + rules.ballsLeft) : 'INSERT COIN', 470, 1093);
  }

  function line(x1, y1, x2, y2) {
    ctx.beginPath(); ctx.moveTo(x1, y1); ctx.lineTo(x2, y2); ctx.stroke();
  }

  // ---------- kickback / drain-reactive shake ------------------------------
  // (rules pushes messages; we detect kickbacks via roll events already scored —
  // simple: whenever a drain happens while shake idle, small thump)
  var prevBalls = 0;
  setInterval(function () {
    if (scene.balls.length < prevBalls && state === 'play') shake.t = 0.5;
    prevBalls = scene.balls.length;
  }, 120);

  // ---------- boot -----------------------------------------------------------
  dmd.show('WELCOME TO PLEASURE PALACE', 3, 2);
  requestAnimationFrame(function (t) { lastT = t; frame(t); });

  // expose for testing / MCP
  window.PP = { scene: scene, rules: rules, dmd: dmd, audio: audio,
               stateGet: function () { return state; },
               start: function () { audio.resume(); startGame(); } };
})();
