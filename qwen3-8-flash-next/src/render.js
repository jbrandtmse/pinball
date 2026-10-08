// THUNDER CANYON — canvas renderer. Canyon-dusk art direction: painted mesa
// basin up top, dark rock mining claim below, neon everywhere, chunky chrome.
// Static playfield art is pre-rendered once; only actors redraw per frame.

const R = {};

function make(pu, T) {
  const TAU = Math.PI * 2;
  const rnd = T.rng(1337);

  const L = {};
  L.canvas = { w: 470, h: 1246 };
  L.frame = 14;
  L.title = { y: 18, h: 112 };
  L.dmd = { x: 0, y: 138, cell: 3 };           // 128x32 dots
  L.dmd.x = Math.floor((L.canvas.w - 128 * L.dmd.cell) / 2);
  L.lamps = { y: 246, h: 26 };
  L.pu = 20.4;
  L.pf = { x: Math.floor((L.canvas.w - pu.W * L.pu) / 2), y: 276, w: pu.W * L.pu, h: pu.H * L.pu };
  L.px = (x) => L.pf.x + x * L.pu;
  L.py = (y) => L.pf.y + y * L.pu;
  L.pr = (r) => r * L.pu;

  // ---------- static playfield prerender ----------
  const bg = document.createElement('canvas');
  bg.width = Math.ceil(L.pf.w); bg.height = Math.ceil(L.pf.h);

  function paintBackground() {
    const g = bg.getContext('2d');
    const W = L.pf.w, H = L.pf.h;
    // dusk sky basin
    const sky = g.createLinearGradient(0, 0, 0, H * 0.34);
    sky.addColorStop(0, '#120a26');
    sky.addColorStop(0.45, '#3b1a4e');
    sky.addColorStop(0.8, '#8a352c');
    sky.addColorStop(1, '#c65c26');
    g.fillStyle = sky;
    g.fillRect(0, 0, W, H * 0.34);
    // stars
    for (let i = 0; i < 90; i++) {
      const x = rnd() * W, y = rnd() * H * 0.24;
      g.fillStyle = `rgba(255,235,200,${0.25 + rnd() * 0.5})`;
      g.fillRect(x, y, rnd() < 0.2 ? 2 : 1, rnd() < 0.2 ? 2 : 1);
    }
    // moon
    const mg = g.createRadialGradient(W * 0.78, H * 0.045, 2, W * 0.78, H * 0.045, 16);
    mg.addColorStop(0, 'rgba(255,246,220,0.95)');
    mg.addColorStop(0.5, 'rgba(255,220,170,0.35)');
    mg.addColorStop(1, 'rgba(255,180,120,0)');
    g.fillStyle = mg;
    g.beginPath(); g.arc(W * 0.78, H * 0.045, 16, 0, TAU); g.fill();

    // ground: dark rock
    const gnd = g.createLinearGradient(0, H * 0.30, 0, H);
    gnd.addColorStop(0, '#31170f');
    gnd.addColorStop(0.25, '#20120c');
    gnd.addColorStop(1, '#120b08');
    g.fillStyle = gnd;
    g.fillRect(0, H * 0.30, W, H * 0.70);

    // mesa silhouettes (two ranges)
    const horizon = H * 0.135;
    function ridge(baseY, amp, col, rim, step) {
      g.beginPath();
      g.moveTo(0, baseY + 40);
      let x = 0;
      while (x < W) {
        const wSeg = step * (0.6 + rnd() * 1.4);
        const flat = rnd() < 0.45;
        const topY = baseY - (flat ? amp * (0.55 + rnd() * 0.45) : amp * (0.12 + rnd() * 0.3));
        g.lineTo(x, topY);
        g.lineTo(x + wSeg * 0.75, topY);
        if (rnd() < 0.5) { g.lineTo(x + wSeg * 0.75, topY + amp * 0.3 * rnd()); }
        x += wSeg;
        g.lineTo(x, baseY + amp * (0.05 + rnd() * 0.25));
      }
      g.lineTo(W, baseY + 60); g.lineTo(0, baseY + 60); g.closePath();
      g.fillStyle = col; g.fill();
      // rim light
      g.strokeStyle = rim; g.lineWidth = 1.4; g.stroke();
    }
    ridge(horizon, 34, '#1c0f1c', 'rgba(255,140,60,0.5)', 26);
    ridge(horizon + 22, 44, '#150a14', 'rgba(255,110,40,0.42)', 38);
    ridge(horizon + 52, 50, '#0e070f', 'rgba(255,90,30,0.3)', 52);

    // center glow (lava under the mesa)
    const lava = g.createRadialGradient(W / 2, H * 0.30, 8, W / 2, H * 0.30, W * 0.5);
    lava.addColorStop(0, 'rgba(255,120,30,0.16)');
    lava.addColorStop(1, 'rgba(255,60,10,0)');
    g.fillStyle = lava;
    g.fillRect(0, 0, W, H);

    // ---- painted playfield art ----
    const px = (x) => x * L.pu, py = (y) => y * L.pu;

    // dynamite lane hatching
    g.save();
    g.translate(px(16.3), py(10.4));
    g.rotate(0.64);
    g.strokeStyle = 'rgba(255,170,60,0.14)'; g.lineWidth = 2;
    for (let i = 0; i < 7; i++) { g.beginPath(); g.moveTo(-30, i * 8); g.lineTo(28, i * 8); g.stroke(); }
    g.fillStyle = 'rgba(255,190,80,0.75)';
    g.font = 'bold 9px Verdana';
    g.fillText('DYNAMITE', -28, -8);
    g.restore();

    // mine rails toward the vault
    g.strokeStyle = 'rgba(160,120,70,0.35)'; g.lineWidth = 2;
    g.beginPath(); g.moveTo(px(7.0), py(26.5)); g.lineTo(px(9.55), py(22.6)); g.stroke();
    g.beginPath(); g.moveTo(px(13.2), py(26.5)); g.lineTo(px(10.7), py(22.6)); g.stroke();
    for (let i = 0; i < 5; i++) {
      const t = i / 4;
      g.beginPath();
      g.moveTo(px(7.0 + 2.55 * t * 0.6), py(26.5 - 3.9 * t * 0.6));
      g.lineTo(px(13.2 - 2.55 * t * 0.6), py(26.5 - 3.9 * t * 0.6));
      g.stroke();
    }

    // arrow leading to vault
    g.fillStyle = 'rgba(255,180,60,0.55)';
    for (let i = 0; i < 3; i++) {
      const y = py(24.2 + i * 1.1);
      g.beginPath();
      g.moveTo(px(9.75), y); g.lineTo(px(10.125), y - px(0.4)); g.lineTo(px(10.5), y);
      g.closePath(); g.fill();
    }

    // SKILL letters over the basin
    g.font = 'bold 13px Verdana';
    g.fillStyle = 'rgba(120,230,255,0.8)';
    const skillX = [8.5, 10.125, 11.75];
    for (let i = 0; i < 3; i++) g.fillText('SKILL'[i], px(skillX[i]) - 4, py(7.05) + 4);

    // big title on the rock, arc-ish
    g.save();
    g.translate(L.pf.w / 2, py(27.6));
    g.font = '900 26px Impact, Arial Black, sans-serif';
    g.textAlign = 'center';
    g.lineWidth = 5; g.strokeStyle = '#1a0c06';
    g.strokeText('THUNDER', 0, 0);
    const tg = g.createLinearGradient(0, -20, 0, 14);
    tg.addColorStop(0, '#ffe27a'); tg.addColorStop(1, '#ff7a2e');
    g.fillStyle = tg;
    g.fillText('THUNDER', 0, 0);
    g.font = '900 19px Impact, Arial Black, sans-serif';
    g.strokeText('CANYON', 0, 22);
    g.fillText('CANYON', 0, 22);
    // lightning bolt
    g.fillStyle = '#ffe27a';
    g.beginPath();
    g.moveTo(-92, -18); g.lineTo(-84, -2); g.lineTo(-89, -2); g.lineTo(-80, 16);
    g.lineTo(-95, 4); g.lineTo(-89, 4); g.lineTo(-96, -18); g.closePath(); g.fill();
    g.beginPath();
    g.moveTo(92, -18); g.lineTo(84, -2); g.lineTo(89, -2); g.lineTo(80, 16);
    g.lineTo(95, 4); g.lineTo(89, 4); g.lineTo(96, -18); g.closePath(); g.fill();
    g.restore();

    // GOLD letters painted near their rollovers
    g.font = 'bold 12px Verdana';
    const goldPos = { G: [1.55, 40.35], O: [6.4, 39.95], L: [13.85, 39.95], D: [13.6, 37.3] };
    for (const k in goldPos) {
      g.fillStyle = 'rgba(180,140,60,0.55)';
      g.fillText(k, px(goldPos[k][0]) - 4, py(goldPos[k][1]));
    }

    // shooter lane tread
    g.strokeStyle = 'rgba(180,150,110,0.12)'; g.lineWidth = 1;
    for (let y = 6; y < 44; y += 1.15) {
      g.beginPath(); g.moveTo(px(17.55), py(y)); g.lineTo(px(19.45), py(y + 0.4)); g.stroke();
    }

    // rails & walls: chrome highlight over collision lines
    function strokePoly(pts, wCol, w, aCol, a) {
      g.strokeStyle = wCol; g.lineWidth = w;
      g.lineCap = 'round'; g.lineJoin = 'round';
      g.beginPath();
      pts.forEach((p, i) => i ? g.lineTo(px(p.x), py(p.y)) : g.moveTo(px(p.x), py(p.y)));
      g.stroke();
      if (aCol) {
        g.strokeStyle = aCol; g.lineWidth = a;
        g.stroke();
      }
    }
    for (const wl of pu.walls) {
      if (wl.kind === 'target') continue;
      const col = wl.kind === 'rubber' ? '#d8453a' : (wl.kind === 'funnel' ? 'rgba(196,168,130,0.85)' : 'rgba(228,206,178,0.8)');
      strokePoly([wl.a, wl.b], col, wl.kind === 'funnel' ? 5 : 6, 'rgba(30,16,8,0.9)', 2);
    }
    // drop bank rack
    g.fillStyle = '#241108';
    g.fillRect(px(5.0), py(19.3), px(4.6), px(1.1));
    g.strokeStyle = 'rgba(255,190,90,0.35)'; g.lineWidth = 1.5;
    g.strokeRect(px(5.0), py(19.3), px(4.6), px(1.1));

    for (const p of pu.posts) {
      const grd = g.createRadialGradient(px(p.c.x) - 1, py(p.c.y) - 1, 0.5, px(p.c.x), py(p.c.y), px(p.r));
      if (p.kind === 'rubber') { grd.addColorStop(0, '#ff7057'); grd.addColorStop(1, '#8c2418'); }
      else { grd.addColorStop(0, '#e8e0d4'); grd.addColorStop(1, '#6a6158'); }
      g.fillStyle = grd;
      g.beginPath(); g.arc(px(p.c.x), py(p.c.y), px(p.r), 0, TAU); g.fill();
    }

    // decorative guide posts (dynamite shaft art)
    g.fillStyle = '#8c857a';
    for (const s of [[16.2, 9.4], [17.3, 12.2]]) {
      g.beginPath(); g.arc(px(s[0]), py(s[1]), 4, 0, TAU); g.fill();
    }
    // dynamite runway blade cradle across the shooter lane
    g.fillStyle = '#3a2f22';
    g.fillRect(px(17.45), py(35.82), px(2.1), px(0.36));
    // kickback mouth (funnel exit throat)
    g.fillStyle = '#0b0b0d';
    g.beginPath();
    g.ellipse(px(4.5), py(42.15), px(0.72), px(0.55), 0.5, 0, TAU); g.fill();
    g.strokeStyle = '#8a5a2a'; g.lineWidth = 1.5;
    g.beginPath(); g.ellipse(px(4.5), py(42.15), px(0.72), px(0.55), 0.5, 0, TAU); g.stroke();

    // drain: glowing pit
    const dz = g.createRadialGradient(px(10.125), py(44.9), 2, px(10.125), py(44.9), px(1.7));
    dz.addColorStop(0, '#ff5a1e'); dz.addColorStop(0.55, '#7a1c06'); dz.addColorStop(1, '#160803');
    g.fillStyle = dz;
    g.fillRect(px(8.2), py(44.0), px(3.8), py(1.4));

    // apron
    g.fillStyle = '#0c0806';
    g.fillRect(0, py(45.0), W, H - py(45.0));
    g.strokeStyle = 'rgba(255,170,60,0.3)';
    g.beginPath(); g.moveTo(0, py(45.0)); g.lineTo(W, py(45.0)); g.stroke();

    // vignette
    const vg = g.createRadialGradient(W / 2, H * 0.45, H * 0.28, W / 2, H * 0.5, H * 0.62);
    vg.addColorStop(0, 'rgba(0,0,0,0)'); vg.addColorStop(1, 'rgba(0,0,0,0.42)');
    g.fillStyle = vg; g.fillRect(0, 0, W, H);
  }

  // ---------- particles ----------
  const parts = [];
  function burst(type, x, y, n = 12) {
    const X = L.px(x), Y = L.py(y);
    for (let i = 0; i < n; i++) {
      const a = Math.random() * TAU, sp = 40 + Math.random() * 160;
      parts.push({
        type, x: X, y: Y,
        vx: Math.cos(a) * sp, vy: Math.sin(a) * sp - 40,
        life: 0.35 + Math.random() * 0.45, t: 0,
        size: type === 'smoke' ? 6 + Math.random() * 8 : 1.5 + Math.random() * 2.2,
      });
    }
    if (parts.length > 420) parts.splice(0, parts.length - 420);
  }
  function updParts(dt) {
    for (let i = parts.length - 1; i >= 0; i--) {
      const p = parts[i];
      p.t += dt;
      if (p.t > p.life) { parts.splice(i, 1); continue; }
      p.x += p.vx * dt; p.y += p.vy * dt;
      p.vy += (p.type === 'smoke' ? -18 : 260) * dt;
      p.vx *= 0.985;
    }
  }
  function drawParts(ctx) {
    for (const p of parts) {
      const k = 1 - p.t / p.life;
      if (p.type === 'spark') {
        ctx.fillStyle = `rgba(255,${170 + Math.random() * 80 | 0},60,${k})`;
        ctx.fillRect(p.x, p.y, p.size, p.size);
      } else if (p.type === 'gold') {
        ctx.fillStyle = `rgba(255,210,90,${k})`;
        ctx.beginPath(); ctx.arc(p.x, p.y, 2.2, 0, TAU); ctx.fill();
      } else if (p.type === 'smoke') {
        ctx.fillStyle = `rgba(160,150,140,${0.16 * k})`;
        ctx.beginPath(); ctx.arc(p.x, p.y, p.size * (1 + p.t * 2), 0, TAU); ctx.fill();
      } else if (p.type === 'dust') {
        ctx.fillStyle = `rgba(210,190,160,${0.35 * k})`;
        ctx.fillRect(p.x, p.y, p.size, p.size);
      }
    }
  }

  // ---------- dynamic actors ----------
  let flash = 0, flashCol = '255,200,120';
  let shake = { x: 0, y: 0, t: 0 };
  const glow = {}; // id -> ttl

  function pulse(id, ttl = 0.25) { glow[id] = ttl; }
  function tickFx(dt) {
    flash = Math.max(0, flash - dt * 2.4);
    shake.t = Math.max(0, shake.t - dt);
    if (shake.t > 0) {
      shake.x = (Math.random() - 0.5) * shake.t * 26;
      shake.y = (Math.random() - 0.5) * shake.t * 26;
    } else { shake.x = 0; shake.y = 0; }
    for (const k in glow) glow[k] = Math.max(0, glow[k] - dt);
    for (const k in glow) if (glow[k] <= 0) delete glow[k];
  }
  function doFlash(a, col) { flash = Math.max(flash, a); if (col) flashCol = col; }
  function doShake(s) { shake.t = Math.max(shake.t, s); }

  function drawBall(ctx, b) {
    const x = L.px(b.p.x), y = L.py(b.p.y), r = L.pr(b.r);
    // trail
    if (b.trail.length > 2) {
      ctx.strokeStyle = 'rgba(255,240,210,0.12)';
      ctx.lineWidth = r * 1.3; ctx.lineCap = 'round';
      ctx.beginPath();
      const st = Math.max(0, b.trail.length - 7);
      for (let i = st; i < b.trail.length; i++) {
        const tp = b.trail[i];
        i === st ? ctx.moveTo(L.px(tp.x), L.py(tp.y)) : ctx.lineTo(L.px(tp.x), L.py(tp.y));
      }
      ctx.stroke();
    }
    // shadow
    ctx.fillStyle = 'rgba(0,0,0,0.45)';
    ctx.beginPath(); ctx.arc(x + r * 0.35, y + r * 0.5, r * 0.95, 0, TAU); ctx.fill();
    // chrome ball
    const g = ctx.createRadialGradient(x - r * 0.4, y - r * 0.45, r * 0.1, x, y, r);
    g.addColorStop(0, '#ffffff');
    g.addColorStop(0.25, '#d8dde2');
    g.addColorStop(0.55, '#9aa2ab');
    g.addColorStop(0.8, '#565d66');
    g.addColorStop(1, '#2a2e33');
    ctx.fillStyle = g;
    ctx.beginPath(); ctx.arc(x, y, r, 0, TAU); ctx.fill();
    ctx.fillStyle = 'rgba(255,255,255,0.9)';
    ctx.beginPath(); ctx.arc(x - r * 0.38, y - r * 0.42, r * 0.16, 0, TAU); ctx.fill();
    // warm bounce from playfield glow
    ctx.fillStyle = 'rgba(255,150,60,0.10)';
    ctx.beginPath(); ctx.arc(x + r * 0.2, y + r * 0.35, r * 0.5, 0, TAU); ctx.fill();
  }

  function drawFlipper(ctx, f) {
    const pxv = L.px(f.pivot.x), pyv = L.py(f.pivot.y);
    const tx = L.px(f.tip.x), ty = L.py(f.tip.y);
    ctx.save();
    // shadow
    ctx.strokeStyle = 'rgba(0,0,0,0.5)';
    ctx.lineWidth = L.pr(0.30) * 2; ctx.lineCap = 'round';
    ctx.beginPath(); ctx.moveTo(pxv + 3, pyv + 4); ctx.lineTo(tx + 3, ty + 4); ctx.stroke();
    // rubber body
    const hot = glow['flipL'] && f.side === 'L' || glow['flipR'] && f.side === 'R';
    const grad = ctx.createLinearGradient(pxv, pyv - 6, pxv, pyv + 8);
    grad.addColorStop(0, hot ? '#ffcf5a' : '#ff8452');
    grad.addColorStop(1, hot ? '#ff9020' : '#b23a1c');
    ctx.strokeStyle = grad;
    ctx.lineWidth = L.pr(0.32) * 2;
    ctx.beginPath(); ctx.moveTo(pxv, pyv); ctx.lineTo(tx, ty); ctx.stroke();
    // metal shaft strip
    ctx.strokeStyle = 'rgba(230,230,235,0.8)';
    ctx.lineWidth = 2;
    ctx.beginPath(); ctx.moveTo(pxv, pyv - 2); ctx.lineTo(tx, ty - 2); ctx.stroke();
    // pivot nut
    ctx.fillStyle = '#c9c9cf';
    ctx.beginPath(); ctx.arc(pxv, pyv, 4, 0, TAU); ctx.fill();
    ctx.fillStyle = '#333';
    ctx.beginPath(); ctx.arc(pxv, pyv, 1.6, 0, TAU); ctx.fill();
    ctx.restore();
  }

  function drawBumper(ctx, p) {
    const x = L.px(p.c.x), y = L.py(p.c.y), r = L.pr(p.r);
    const hot = glow[p.id] > 0;
    // skirt
    ctx.fillStyle = '#17171c';
    ctx.beginPath(); ctx.arc(x, y + 2, r * 1.02, 0, TAU); ctx.fill();
    ctx.fillStyle = hot ? '#ff6a2e' : '#3c3c46';
    ctx.beginPath(); ctx.arc(x, y + 1.5, r * 0.98, 0, TAU); ctx.fill();
    // cap
    const g = ctx.createRadialGradient(x - 3, y - 4, 1, x, y, r * 0.82);
    g.addColorStop(0, hot ? '#ffffff' : '#ffe27a');
    g.addColorStop(0.6, hot ? '#ffb040' : '#e0781e');
    g.addColorStop(1, '#7a3410');
    ctx.fillStyle = g;
    ctx.beginPath(); ctx.arc(x, y - 1, r * 0.8, 0, TAU); ctx.fill();
    ctx.strokeStyle = 'rgba(255,255,255,0.25)'; ctx.lineWidth = 1.5;
    ctx.beginPath(); ctx.arc(x, y - 1, r * 0.8, Math.PI * 1.05, Math.PI * 1.75); ctx.stroke();
    if (hot) {
      ctx.save();
      ctx.globalAlpha = glow[p.id] * 2;
      ctx.strokeStyle = 'rgba(255,230,120,0.9)';
      ctx.lineWidth = 3;
      ctx.beginPath(); ctx.arc(x, y, r * (1 + (0.3 - glow[p.id]) * 1.6), 0, TAU); ctx.stroke();
      ctx.restore();
    }
  }

  function drawSling(ctx, s) {
    const x0 = L.px(s.a.x), y0 = L.py(s.a.y), x1 = L.px(s.b.x), y1 = L.py(s.b.y);
    const hot = glow[s.id] > 0;
    ctx.strokeStyle = hot ? '#ffe27a' : '#ff5a34';
    ctx.lineWidth = hot ? 5.5 : 4;
    ctx.lineCap = 'round';
    ctx.beginPath(); ctx.moveTo(x0, y0); ctx.lineTo(x1, y1); ctx.stroke();
    ctx.strokeStyle = 'rgba(0,0,0,0.35)';
    ctx.lineWidth = 1;
    ctx.beginPath(); ctx.moveTo(x0, y0 + 2); ctx.lineTo(x1, y1 + 2); ctx.stroke();
  }

  function drawSpinner(ctx, s) {
    const cx = (L.px(s.a.x) + L.px(s.b.x)) / 2, cy = (L.py(s.a.y) + L.py(s.b.y)) / 2;
    const half = L.px(Math.hypot(s.b.x - s.a.x, s.b.y - s.a.y) / 2);
    ctx.save();
    ctx.translate(cx, cy);
    ctx.rotate(Math.sin((s.spin % TAU)) * 1.3); // blade seen edge-on, tipping as it spins
    ctx.fillStyle = glow.spin > 0 ? '#ffe27a' : '#d8d8de';
    ctx.fillRect(-half, -1.5, half * 2, 3);
    ctx.fillStyle = '#333';
    ctx.beginPath(); ctx.arc(-half, 0, 2, 0, TAU); ctx.arc(half, 0, 2, 0, TAU); ctx.fill();
    ctx.restore();
  }

  function drawTargets(ctx, table) {
    const T2 = table;
    for (let i = 0; i < 4; i++) {
      const st = T2.w.targetStates['BANK' + i];
      const x = L.px(5.825 + i), y0 = L.py(19.52), y1 = L.py(20.22);
      if (st.down) {
        ctx.fillStyle = '#0d0705';
        ctx.fillRect(x - 3, y0, 6, y1 - y0);
      } else {
        const hot = glow['BANK' + i] > 0;
        ctx.fillStyle = hot ? '#ffe27a' : '#c8402a';
        ctx.fillRect(x - 3.5, y0 - 2, 7, y1 - y0 + 4);
        ctx.fillStyle = 'rgba(255,255,255,0.7)';
        ctx.font = 'bold 8px Verdana';
        ctx.textAlign = 'center';
        ctx.fillText(String(i + 1), x, y1 - 2);
        ctx.textAlign = 'left';
      }
    }
  }

  function drawStandups(ctx, table) {
    for (const s of table.w.standups) {
      const hot = glow['SU' + s.id] > 0;
      const x = L.px(s.c.x), y = L.py(s.c.y);
      ctx.fillStyle = hot ? '#ffe27a' : '#e0e0e6';
      ctx.beginPath(); ctx.arc(x, y, L.pr(s.r), 0, TAU); ctx.fill();
      ctx.fillStyle = '#a3341f';
      ctx.font = 'bold 8px Verdana'; ctx.textAlign = 'center';
      ctx.fillText(s.id, x, y + 3);
      ctx.textAlign = 'left';
    }
  }

  function drawVault(ctx, v, rules) {
    const x = L.px(v.c.x), y = L.py(v.c.y);
    const armed = rules.goldDone || (rules.modeCompleted && rules.modeCompleted.THUNDERSTORM_ARMED) || (rules.rushDone);
    const lid = rules.vaultQueue.length > 0;
    ctx.fillStyle = '#070403';
    ctx.beginPath(); ctx.arc(x, y, L.pr(0.78), 0, TAU); ctx.fill();
    if (armed) {
      const t = performance.now() / 1000;
      ctx.save();
      ctx.globalAlpha = 0.5 + 0.3 * Math.sin(t * 6);
      ctx.strokeStyle = '#ffd257';
      ctx.lineWidth = 2.5;
      ctx.beginPath(); ctx.arc(x, y, L.pr(0.78), 0, TAU); ctx.stroke();
      ctx.restore();
    }
    ctx.strokeStyle = lid ? 'rgba(255,200,90,0.9)' : 'rgba(140,110,70,0.6)';
    ctx.lineWidth = 3;
    ctx.beginPath(); ctx.arc(x, y, L.pr(0.62), lid ? -2.4 : -2.8, lid ? -0.7 : -0.3); ctx.stroke();
  }

  function drawRolls(ctx, rules) {
    const map = {
      G: rules.goldLetters.G, O: rules.goldLetters.O, L: rules.goldLetters.L, D: rules.goldLetters.D,
      SKILL1: true, SKILL2: true, SKILL3: true,
    };
    for (const s of rules.w.sensors) {
      if (!s.circle) continue;
      const lit = map[s.id];
      const blink = (rules.state === 'playing' && (rules.goldDone && 'GOLD'.includes(s.id))) ||
        (s.id.startsWith('SKILL') && rules.skillActive);
      const t = performance.now() / 1000;
      const on = blink ? (Math.sin(t * 8) > 0) : lit;
      if (s.id === 'TOP') {
        ctx.strokeStyle = on || rules.skillActive ? 'rgba(255,210,90,0.8)' : 'rgba(255,210,90,0.25)';
        ctx.lineWidth = 2;
        ctx.beginPath(); ctx.arc(L.px(s.c.x), L.py(s.c.y), L.pr(0.5), 0, TAU); ctx.stroke();
        continue;
      }
      ctx.strokeStyle = on ? 'rgba(80,240,220,0.9)' : 'rgba(80,220,200,0.22)';
      ctx.lineWidth = 2;
      ctx.beginPath(); ctx.arc(L.px(s.c.x), L.py(s.c.y), L.pr(0.46), 0, TAU); ctx.stroke();
    }
    // kickback lamp
    const kb = rules.w.kickbacks[0];
    ctx.fillStyle = kb.enabled ? (Math.sin(performance.now() / 120) > 0 ? '#5af0ff' : '#1a7d8a') : '#123c44';
    ctx.beginPath(); ctx.arc(L.px(4.15), L.py(42.7), 3.4, 0, TAU); ctx.fill();
  }

  function drawPlunger(ctx, w) {
    const x = L.px(18.5);
    const top = L.py(44.4 - (w.plunger.charge || 0) * 0.55);
    // spring
    ctx.strokeStyle = '#8a8f96'; ctx.lineWidth = 2;
    ctx.beginPath();
    for (let i = 0; i < 8; i++) {
      const yy = L.py(45.1) + i * 1.4;
      ctx.moveTo(x - 6, yy); ctx.lineTo(x + 6, yy - 1);
    }
    ctx.stroke();
    // knob
    ctx.fillStyle = '#d0d4d9';
    ctx.fillRect(x - 7, top, 14, 4);
    ctx.fillStyle = (w.plunger.charge || 0) > 0.6 ? '#ff5030' : '#ffb040';
    ctx.fillRect(x - 7, top, 14, 2);
  }

  // ---------- full frame ----------
  function frame(ctx, world, rules, dmd, attract) {
    ctx.save();
    // playfield bitmap and every actor share one absolute coordinate system:
    // bg sits at the playfield origin, and L.px/L.py/L.pr place everything
    // relative to that same origin
    ctx.translate(L.pf.x + shake.x, L.pf.y + shake.y);
    ctx.drawImage(bg, 0, 0);

    ctx.restore();
    ctx.save();
    ctx.translate(shake.x, shake.y);

    // spinner
    for (const s of world.spinners) drawSpinner(ctx, s);
    // slings, flippers
    for (const s of world.slings) drawSling(ctx, s);
    drawTargets(ctx, rules ? { w: world } : { w: world });
    drawStandups(ctx, { w: world });
    drawVault(ctx, world.captures[0], rules || { goldDone: false, vaultQueue: [] });
    drawRolls(ctx, rules || { goldLetters: {}, state: '', skillActive: false, w: world, kickbacks: [{ enabled: false }] });
    for (const b of world.balls) if (b.state === 'play' || b.state === 'plunger') drawBall(ctx, b);
    for (const p of world.poppers) drawBumper(ctx, p);
    for (const f of world.flippers) drawFlipper(ctx, f);
    if (world.plunger) drawPlunger(ctx, world);
    drawParts(ctx);

    // ball search strobe
    if (rules && rules.searches > 0 && rules.searches < 4 &&
        world.activeBalls().some(b => b.restT > 0.1)) {
      ctx.fillStyle = `rgba(255,255,255,${0.05 + 0.05 * Math.sin(performance.now() / 60)})`;
      ctx.fillRect(L.pf.x, L.pf.y, L.pf.w, L.pf.h);
    }

    // flash
    if (flash > 0) {
      ctx.fillStyle = `rgba(${flashCol},${Math.min(0.5, flash)})`;
      ctx.fillRect(L.pf.x, L.pf.y, L.pf.w, L.pf.h);
    }
    ctx.restore();
  }

  // ---------- backbox (title + lamps) ----------
  const bb = document.createElement('canvas');
  bb.width = (L.canvas.w - 2 * L.frame); bb.height = L.title.h;
  (function paintBackbox() {
    const g = bb.getContext('2d');
    const W = bb.width;
    const sky = g.createLinearGradient(0, 0, 0, bb.height);
    sky.addColorStop(0, '#160a2a'); sky.addColorStop(1, '#401426');
    g.fillStyle = sky; g.fillRect(0, 0, W, bb.height);
    // clouds/mesa
    g.fillStyle = '#0d0512';
    g.beginPath();
    g.moveTo(0, bb.height);
    let x = 0;
    while (x < W) {
      const w = 30 + Math.random() * 50, h = 20 + Math.random() * 40;
      g.lineTo(x, bb.height - h); g.lineTo(x + w * 0.7, bb.height - h);
      x += w; g.lineTo(x, bb.height - h * 0.35);
    }
    g.lineTo(W, bb.height); g.closePath(); g.fill();
    // neon title
    g.textAlign = 'center';
    g.font = '900 44px Impact, Arial Black, sans-serif';
    const tg = g.createLinearGradient(0, 18, 0, 70);
    tg.addColorStop(0, '#fff3b0'); tg.addColorStop(0.55, '#ffcf4e'); tg.addColorStop(1, '#ff6a20');
    g.shadowColor = '#ff9030'; g.shadowBlur = 18;
    g.fillStyle = tg;
    g.fillText('THUNDER CANYON', W / 2, 58);
    g.shadowBlur = 0;
    g.font = 'bold 13px Verdana';
    g.fillStyle = '#5ce8d8';
    g.shadowColor = '#2ac0c0'; g.shadowBlur = 8;
    g.fillText('GOLD  RUSH  MULTIBALL', W / 2, 84);
    g.shadowBlur = 0;
    // bolts
    g.fillStyle = '#ffe27a';
    const bolt = (bx, by, s, flip) => {
      g.beginPath();
      g.moveTo(bx, by - 14 * s); g.lineTo(bx + 5 * s * flip, by - 2 * s);
      g.lineTo(bx + 1 * s * flip, by - 2 * s); g.lineTo(bx + 8 * s * flip, by + 14 * s);
      g.lineTo(bx - 3 * s * flip, by + 2 * s); g.lineTo(bx + 1 * s * flip, by + 2 * s);
      g.closePath(); g.fill();
    };
    bolt(40, 46, 1.1, 1);
    bolt(W - 40, 46, 1.1, -1);
    g.textAlign = 'left';
  })();

  function paintBackbox(ctx) {
    ctx.drawImage(bb, L.frame, L.title.y);
    // neon flicker on the subtitle
    if (Math.random() < 0.02) {
      ctx.fillStyle = 'rgba(255,255,255,0.06)';
      ctx.fillRect(L.frame, L.title.y, bb.width, bb.height);
    }
  }

  function paintLamps(ctx, rules) {
    const y = L.lamps.y + 13;
    const lamps = [
      { t: 'BALL 1', on: rules && rules.ball >= 1 },
      { t: 'BALL 2', on: rules && rules.ball >= 2 },
      { t: 'BALL 3', on: rules && rules.ball >= 3 },
      { t: 'MULT ' + (rules ? rules.mult : 1), on: rules && rules.mult > 1 },
      { t: 'SAVE', on: rules && rules.ballSaveT > 0 },
      { t: 'EXTRA', on: rules && rules.extraBalls > 0 },
    ];
    const x0 = L.frame + 12, dx = (L.canvas.w - 2 * L.frame - 24) / lamps.length;
    ctx.font = 'bold 8px Verdana';
    ctx.textAlign = 'center';
    lamps.forEach((lp, i) => {
      const x = x0 + dx * (i + 0.5);
      const blink = lp.t.startsWith('SAVE') && lp.on && Math.sin(performance.now() / 90) > 0;
      ctx.fillStyle = lp.on ? (blink ? '#ffe27a' : '#ffb040') : '#2b2118';
      ctx.shadowColor = lp.on ? '#ff9020' : 'transparent';
      ctx.shadowBlur = lp.on ? 8 : 0;
      ctx.beginPath(); ctx.arc(x, y - 6, 4.5, 0, TAU); ctx.fill();
      ctx.shadowBlur = 0;
      ctx.fillStyle = lp.on ? '#ffe0a0' : '#6d5a44';
      ctx.fillText(lp.t, x, y + 8);
    });
    ctx.textAlign = 'left';
  }

  return { L, paintBackground, bg, frame, paintBackbox, paintLamps, burst, updParts, drawParts, pulse, tickFx, doFlash, doShake, parts, glow };
}

R.make = make;
if (typeof module !== 'undefined' && module.exports) module.exports = R;
if (typeof window !== 'undefined') window.RENDER = R;
