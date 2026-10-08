// THUNDER CANYON — browser shell: boot, game loop, event routing, high scores.

(function boot() {
  const T = window.TCU, W = window.PHYS, TABLE = window.TABLE, RULES = window.RULES,
    DMD = window.DMD, RENDER = window.RENDER, SFX = window.SFX, INPUT = window.INPUT;

  const world = TABLE.build();
  TABLE.instrument(world);
  const rules = new RULES.Rules(world);
  const dmd = new DMD.Dmd();
  const pu = Object.assign({}, world.playfield, { walls: world.walls, posts: world.posts });
  const rd = RENDER.make(pu, T);
  rd.paintBackground();

  const L = rd.L;
  const canvas = document.getElementById('c');
  const dpr = Math.min(2, window.devicePixelRatio || 1);
  canvas.width = L.canvas.w * dpr;
  canvas.height = L.canvas.h * dpr;
  const ctx = canvas.getContext('2d');
  ctx.scale(dpr, dpr);

  function fit() {
    const s = Math.min(1, (window.innerHeight - 24) / L.canvas.h, (window.innerWidth - 20) / L.canvas.w);
    canvas.style.height = Math.floor(L.canvas.h * s) + 'px';
    canvas.style.width = Math.floor(L.canvas.w * s) + 'px';
  }
  window.addEventListener('resize', fit); fit();
  INPUT.bind(window);

  // ---------- high scores ----------
  const HS_KEY = 'thundercanyon.hiscores.v1';
  let hiscores = [];
  try { hiscores = JSON.parse(localStorage.getItem(HS_KEY)) || []; } catch (e) { hiscores = []; }
  function saveHS() { try { localStorage.setItem(HS_KEY, JSON.stringify(hiscores)); } catch (e) { } }

  // ---------- ui state ----------
  let paused = false;
  let hsStage = null;        // 'enter' | 'rank'
  let hsName = [0, 0, 0], hsPos = 0, hsRank = 0;
  let attractT = 0, attractPage = 0;
  let overT = 0;
  const ALPH = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ';
  let bonusShown = null, bonusT = 0;

  rules.resetToAttract();

  // ---------- helpers ----------
  function targetPos(id) {
    const i = parseInt(id.slice(4), 10);
    return { x: 5.825 + i, y: 19.85 };
  }

  function routePhys(evts) {
    for (const e of evts) {
      switch (e.type) {
        case 'pop':
          SFX.bumper(); rd.pulse(e.id); rd.burst('spark', e.x, e.y, 14); rd.doFlash(0.1); rd.doShake(0.07);
          break;
        case 'sling':
          SFX.sling(); rd.pulse(e.id); rd.burst('spark', e.x, e.y, 6);
          break;
        case 'spinner': SFX.spinner(); rd.pulse('spin'); break;
        case 'target': {
          SFX.target(); const p = targetPos(e.id);
          rd.burst('dust', p.x, p.y, 10); rd.doFlash(0.08); rd.doShake(0.05); rd.pulse(e.id);
          break;
        }
        case 'standup': SFX.standup(); rd.pulse('SU' + e.id); rd.burst('spark', 2.92, 14, 5); break;
        case 'rollover': SFX.roll(); break;
        case 'gate': SFX.gate(); break;
        case 'rubber': SFX.rubber(); break;
        case 'drain': SFX.drain(); rd.doShake(0.14); rd.doFlash(0.1, '255,90,40'); break;
        case 'capture': SFX.capture(); rd.burst('smoke', 10.125, 22.15, 10); break;
        case 'kickback': SFX.kickback(); rd.burst('spark', 4.5, 42.15, 12); break;
        case 'launch': SFX.launch(); break;
        case 'tilt': SFX.tilt(); rd.doFlash(0.3, '255,40,40'); break;
        case 'nudge': rd.doShake(0.06); break;
      }
    }
  }

  function routeRules() {
    for (const e of rules.events) {
      switch (e.type) {
        case 'modeStart':
          SFX.modeStart(); rd.doFlash(0.28, '255,190,90'); rd.doShake(0.3);
          if (e.key === 'THUNDERSTORM') { SFX.erupt(); rd.doFlash(0.5, '255,230,150'); }
          break;
        case 'jackpot':
          SFX.jackpot(); rd.burst('gold', 10.125, 20, 22); rd.doFlash(0.24, '255,210,90'); rd.doShake(0.18);
          break;
        case 'bank': rd.doFlash(0.16); SFX.arcadeStart(); break;
        case 'extraBall': SFX.arcadeStart(); rd.doFlash(0.3, '120,255,240'); break;
        case 'reload': SFX.kickback(); rd.burst('gold', 10.125, 22, 14); break;
        case 'tilt': rd.doFlash(0.35, '255,30,30'); break;
        case 'bonus': bonusShown = e; bonusT = 2.8; break;
        case 'gameOver':
          SFX.gameOver();
          overT = 5;
          const rec = { name: '___', score: e.score, date: new Date().toISOString().slice(0, 10) };
          if (hiscores.length < 10 || e.score > hiscores[hiscores.length - 1].score) {
            hiscores.push(rec);
            hiscores.sort((a, b) => b.score - a.score);
            hiscores = hiscores.slice(0, 10);
            saveHS();
            hsRank = hiscores.indexOf(rec);
            hsStage = 'enter';
            hsName = [0, 0, 0]; hsPos = 0;
          } else {
            hsStage = 'rank';
            hsRank = hiscores.findIndex(h => h.score <= e.score) + 1;
            if (hsRank < 1) hsRank = 1;
          }
          break;
      }
    }
    rules.events.length = 0;
  }

  // ---------- attract ----------
  const attractPages = [];
  function attractText() {
    const top = hiscores[0];
    return [
      'THUNDER CANYON',
      'PRESS ENTER TO PLAY',
      'SPACE = LAUNCH  SHIFT = FLIP',
      top ? 'HIGH SCORE ' + top.name + ' ' + RULES.fmt(top.score) : 'SET THE FIRST HIGH SCORE',
      'COLLECT  G O L D  HIT THE VAULT',
    ];
  }

  // ---------- main loop ----------
  let last = performance.now();
  function frame(now) {
    let dt = (now - last) / 1000;
    last = now;
    dt = Math.min(dt, 1 / 24);

    // mute / pause
    if (INPUT.muteJust) { SFX.setMuted(!SFX.muted); }
    if (INPUT.pauseJust && (rules.state === 'playing' || rules.state === 'ballEnd')) paused = !paused;

    // global controls
    if (!paused) {
      world.setFlipper('L', INPUT.left);
      world.setFlipper('R', INPUT.right);
      if (INPUT.leftJust && rules.state !== 'attract') SFX.flipperUp();
      if (INPUT.rightJust && rules.state !== 'attract') SFX.flipperUp();
    }

    // plunger
    const parked = world.balls.find(b => b.state === 'plunger');
    if (INPUT.plungerDown && parked && !paused && rules.state === 'playing') world.plungerHold(dt);
    if (!INPUT.plungerDown && world.plunger.charge > 0 && rules.state === 'playing') {
      rules.launch();
    }

    // nudges
    if (!paused && rules.state === 'playing' && !rules.tilted) {
      if (INPUT.nudgeLJust) world.nudge(-16, -22);
      if (INPUT.nudgeRJust) world.nudge(16, -22);
    }

    // start game
    if (rules.state === 'attract' && (INPUT.enterJust || INPUT.plungerJust)) {
      SFX.ensure(); SFX.arcadeStart();
      rules.startGame(3);
      attractT = 0;
    }

    // physics + rules
    if (!paused) {
      const evts = world.step(dt);
      RULES.pumpTimers();
      rules.update(dt, evts);
      routePhys(evts);
      if (rules.state === 'ballEnd') rules.tickBallEnd(dt);
      routeRules();
    }

    // game-over flow
    if (rules.state === 'gameOver' && hsStage === 'enter') {
      if (INPUT.leftArrJust) hsName[hsPos] = (hsName[hsPos] + 25) % 26;
      if (INPUT.rightArrJust) hsName[hsPos] = (hsName[hsPos] + 1) % 26;
      if (INPUT.upJust) hsPos = (hsPos + 2) % 3;
      if (INPUT.downJust) hsPos = (hsPos + 1) % 3;
      if (INPUT.enterJust) {
        hiscores[hsRank].name = hsName.map(i => ALPH[i]).join('');
        saveHS();
        hsStage = 'rank'; overT = 4;
        SFX.arcadeStart();
      }
    } else if (hsStage === 'rank') {
      overT -= dt;
      if (overT <= 0) { hsStage = null; rules.resetToAttract(); }
    }

    // fx + dmd
    rd.tickFx(dt);
    rd.updParts(dt);
    updateDmd(dt);

    // ---- paint ----
    ctx.clearRect(0, 0, L.canvas.w, L.canvas.h);
    // cabinet frame
    ctx.fillStyle = '#140b06';
    ctx.fillRect(0, 0, L.canvas.w, L.canvas.h);
    ctx.fillStyle = '#3d2712';
    ctx.fillRect(2, 2, L.canvas.w - 4, L.canvas.h - 4);
    ctx.fillStyle = '#0c0705';
    ctx.fillRect(L.frame - 2, L.frame - 2, L.canvas.w - 2 * L.frame + 4, L.canvas.h - 2 * L.frame + 4);
    rd.paintBackbox(ctx);
    rd.paintLamps(ctx, rules.state !== 'attract' ? rules : null);
    dmd.paint(ctx, L.dmd.x, L.dmd.y, L.dmd.cell, rules.mode ? '#ffd257' : '#ffb04a');
    rd.frame(ctx, world, rules, dmd, rules.state === 'attract');
    drawOverlays(ctx);

    INPUT.clearJusts();
    requestAnimationFrame(frame);
  }

  function updateDmd(dt) {
    dmd.bars = !!(rules.mode && rules.mode.key === 'THUNDERSTORM');
    if (rules.state === 'attract') {
      attractT += dt;
      if (attractT > 3.4) { attractT = 0; attractPage = (attractPage + 1) % 5; }
      const pages = attractText();
      dmd.secondary = null;
      dmd.setText(pages[attractPage]);
      return;
    }
    if (rules.state === 'playing') {
      if (rules.msgT > 0) { dmd.secondary = null; dmd.setText(rules.msg); return; }
      if (rules.mode) {
        dmd.setText(rules.mode.label || '');
        dmd.secondary = { text: String(Math.ceil(rules.mode.t)) + 'S', scale: 2, y: 14 };
        dmd.setText(MODE_SHORT(rules.mode.key));
        return;
      }
      dmd.secondary = { text: String(rules.score), scale: 2, y: 14 };
      dmd.setText('SCORE');
      return;
    }
    if (rules.state === 'ballEnd') {
      dmd.secondary = null;
      if (bonusT > 0) { bonusT -= dt; dmd.setText('BONUS ' + RULES.fmt(rules.lastBonus) + ' X' + rules.mult); }
      else dmd.setText(rules.extraMsg ? 'EXTRA BALL!' : 'NEXT BALL');
      return;
    }
    if (rules.state === 'gameOver') {
      dmd.secondary = null;
      if (hsStage === 'enter') dmd.setText('NEW HIGH SCORE! ENTER INITIALS');
      else dmd.setText('GAME OVER  FINAL ' + RULES.fmt(rules.score));
    }
  }

  function MODE_SHORT(k) {
    return k === 'ROCKSLIDE' ? 'ROCKSLIDE' : k === 'GOLDRUSH' ? 'GOLD RUSH' : 'THUNDERSTORM';
  }

  function drawOverlays(ctx) {
    const X = L.pf.x, Y = L.pf.y, W = L.pf.w, H = L.pf.h;
    if (paused) {
      ctx.fillStyle = 'rgba(0,0,0,0.55)';
      ctx.fillRect(X, Y, W, H);
      ctx.fillStyle = '#ffe27a';
      ctx.font = '900 34px Impact, sans-serif';
      ctx.textAlign = 'center';
      ctx.fillText('PAUSED', X + W / 2, Y + H / 2);
      ctx.font = '12px Verdana';
      ctx.fillStyle = '#c9b';
      ctx.fillText('P TO RESUME', X + W / 2, Y + H / 2 + 26);
      ctx.textAlign = 'left';
      return;
    }
    if (rules.state === 'gameOver' && hsStage === 'enter') {
      ctx.fillStyle = 'rgba(4,2,8,0.78)';
      ctx.fillRect(X, Y + H * 0.28, W, H * 0.44);
      ctx.strokeStyle = '#ffb040'; ctx.lineWidth = 2;
      ctx.strokeRect(X + 14, Y + H * 0.28 + 14, W - 28, H * 0.44 - 28);
      ctx.textAlign = 'center';
      ctx.fillStyle = '#ffe27a';
      ctx.font = '900 26px Impact, sans-serif';
      ctx.fillText('NEW HIGH SCORE', X + W / 2, Y + H * 0.36);
      ctx.fillStyle = '#fff';
      ctx.font = 'bold 15px Verdana';
      ctx.fillText('RANK #' + (hsRank + 1) + '  WITH  ' + RULES.fmt(rules.score), X + W / 2, Y + H * 0.415);
      // initials
      for (let i = 0; i < 3; i++) {
        const cx = X + W / 2 + (i - 1) * 54;
        const cy = Y + H * 0.52;
        ctx.fillStyle = i === hsPos ? '#ffb040' : 'transparent';
        ctx.fillRect(cx - 22, cy - 26, 44, 52);
        ctx.fillStyle = '#0c0705';
        ctx.fillRect(cx - 20, cy - 24, 40, 48);
        ctx.fillStyle = i === hsPos ? (Math.sin(performance.now() / 150) > 0 ? '#ffe27a' : '#ff9020') : '#fff';
        ctx.font = '900 34px Impact, sans-serif';
        ctx.fillText(ALPH[hsName[i]], cx, cy + 12);
      }
      ctx.fillStyle = '#9fe8dd';
      ctx.font = '11px Verdana';
      ctx.fillText('ARROWS TO PICK  ENTER TO SAVE', X + W / 2, Y + H * 0.64);
      ctx.textAlign = 'left';
    }
    if (rules.state === 'gameOver' && hsStage === 'rank') {
      ctx.textAlign = 'center';
      ctx.fillStyle = '#ffe27a';
      ctx.font = '900 30px Impact, sans-serif';
      ctx.fillText('GAME OVER', X + W / 2, Y + H * 0.4);
      ctx.font = 'bold 16px Verdana';
      ctx.fillStyle = '#fff';
      ctx.fillText('FINAL  ' + RULES.fmt(rules.score), X + W / 2, Y + H * 0.45);
      ctx.textAlign = 'left';
    }
  }

  window.DBG = { world, rules, dmd, rd, INPUT };
  requestAnimationFrame(frame);
})();
