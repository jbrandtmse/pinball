/* =========================================================================
   RISE OF ATLANTIS — render.js
   Canvas rendering: sunken-temple playfield art (static layer) + dynamic
   elements (balls, flippers, lights, ramps, whirlpool) + backbox with DMD.
   Browser-only. Playfield coordinates are inches; scale S px/inch.
   ========================================================================= */
(function (root) {
  'use strict';
  const U = root.AR_UTIL, T = root.AR_TABLE, P = root.AR_PHYS, D = root.AR_DMD;

  const TEAL = '#19e0c8', GOLD = '#ffd257', DEEP = '#041220', CYAN = '#39b7ff';

  function Renderer(canvas, game) {
    this.cv = canvas;
    this.g2 = canvas.getContext('2d');
    this.game = game;
    this.W = game.W;
    this.refs = game.refs;
    this.time = 0;
    this.spinVel = 0;
    this.particles = [];
    this.staticCv = document.createElement('canvas');
    this._flashers = [];
  }

  // ---- layout -----------------------------------------------------------------
  // The view morphs between the full machine (attract: big backglass) and a
  // zoomed playfield view (game on: backbox compresses to a slim DMD strip).
  Renderer.prototype.BB_FULL = 14.5;
  Renderer.prototype.BB_ZOOM = 5.6;

  Renderer.prototype.layout = function () {
    this.cw = this.cv.width;
    this.ch = this.cv.height;
  };

  Renderer.prototype.applyView = function (dt) {
    const playing = this.game.state === 'launch' || this.game.state === 'play' || this.game.state === 'bonus';
    const target = playing ? 1 : 0;
    this.zoom = this.zoom === undefined ? target : this.zoom + (target - this.zoom) * Math.min(1, dt * 2.4);
    const cw = this.cw, ch = this.ch;
    const bbH = this.BB_FULL + (this.BB_ZOOM - this.BB_FULL) * this.zoom;
    const cabW = 22.6, pfH = 42.9, cabH = bbH + pfH + 1.6;
    const S = Math.min(cw / cabW, ch / cabH);
    this.S = S;
    this.ox = (cw - 20.25 * S) / 2;
    this.bbTop = (ch - cabH * S) / 2;
    this.pfTop = this.bbTop + bbH * S;
  };

  Renderer.prototype.px = function (x) { return this.ox + x * this.S; };
  Renderer.prototype.py = function (y) { return this.pfTop + y * this.S; };

  // ---- static playfield art ----------------------------------------------------
  Renderer.prototype.drawStatic = function () {
    // render at the highest scale the morphing view can reach, then scale down
    const cw = this.cv.width, ch = this.cv.height;
    const Smax = Math.max(
      Math.min(cw / 22.6, ch / (this.BB_FULL + 42.9 + 1.6)),
      Math.min(cw / 22.6, ch / (this.BB_ZOOM + 42.9 + 1.6)));
    const S = Smax;
    const cv = this.staticCv;
    cv.width = Math.ceil(20.25 * S) + 2;
    cv.height = Math.ceil(42 * S) + 2;
    const g = cv.getContext('2d');
    const px = (x) => x * S, py = (y) => y * S;

    // deep-sea base
    const grad = g.createLinearGradient(0, 0, 0, 42 * S);
    grad.addColorStop(0, '#0b3a52');
    grad.addColorStop(0.35, '#0f4a66');
    grad.addColorStop(0.7, '#0d3c58');
    grad.addColorStop(1, '#0a2438');
    g.fillStyle = grad;
    g.fillRect(0, 0, cv.width, cv.height);

    // god-rays from the surface
    g.save();
    g.globalAlpha = 0.05;
    g.fillStyle = '#bfe9ff';
    for (let i = 0; i < 6; i++) {
      const x0 = px(3 + i * 2.8);
      g.beginPath();
      g.moveTo(x0, 0);
      g.lineTo(x0 + 40, 0);
      g.lineTo(x0 + 130, 42 * S);
      g.lineTo(x0 + 60, 42 * S);
      g.closePath();
      g.fill();
    }
    g.restore();

    // faint sunken-city grid lines
    g.strokeStyle = 'rgba(57,183,255,0.06)';
    g.lineWidth = 1;
    for (let i = 1; i < 8; i++) {
      g.beginPath(); g.moveTo(px(2.5 + i * 2), 0); g.lineTo(px(1 + i * 2.2), 42 * S); g.stroke();
    }

    // ruins silhouettes (background art)
    g.fillStyle = 'rgba(6,32,48,0.9)';
    for (const [bx, by, bw, bh] of [[3.2, 4.2, 1.3, 2.6], [6.3, 3.4, 1.0, 2.2], [13.9, 3.6, 1.2, 2.4], [16.6, 4.4, 1.1, 2.2], [8.9, 2.9, 0.9, 1.7]]) {
      g.fillRect(px(bx), py(by), px(bw), py(bh));
      // broken column top
      g.beginPath();
      g.moveTo(px(bx), py(by));
      g.lineTo(px(bx + bw * 0.3), py(by - 0.35));
      g.lineTo(px(bx + bw * 0.7), py(by - 0.15));
      g.lineTo(px(bx + bw), py(by));
      g.closePath(); g.fill();
    }

    // temple medallion in lower middle
    g.save();
    g.translate(px(10.125), py(30.5));
    g.strokeStyle = 'rgba(25,224,200,0.14)';
    g.lineWidth = 2;
    for (let r = 1.2; r <= 3.4; r += 1.1) {
      g.beginPath(); g.arc(0, 0, r * S, 0, Math.PI * 2); g.stroke();
    }
    // trident lines
    g.strokeStyle = 'rgba(255,210,87,0.10)';
    g.lineWidth = 2.5;
    g.beginPath(); g.moveTo(0, -2.2 * S); g.lineTo(0, 2.2 * S); g.stroke();
    g.restore();

    // lane paint: orbit arrows, ramp guide chevrons
    const arrow = (x, y, ang, col) => {
      g.save(); g.translate(px(x), py(y)); g.rotate(ang);
      g.fillStyle = col;
      g.beginPath();
      g.moveTo(0, -0.32 * S); g.lineTo(0.26 * S, 0.1 * S); g.lineTo(0.09 * S, 0.1 * S);
      g.lineTo(0.09 * S, 0.42 * S); g.lineTo(-0.09 * S, 0.42 * S); g.lineTo(-0.09 * S, 0.1 * S);
      g.lineTo(-0.26 * S, 0.1 * S); g.closePath(); g.fill();
      g.restore();
    };
    for (const y of [18.5, 20.5, 22.5]) {
      arrow(1.65, y, Math.PI / 2, 'rgba(57,183,255,0.35)');   // left orbit up
      arrow(17.9, y, Math.PI / 2, 'rgba(57,183,255,0.35)');   // right orbit up
    }
    // inlane chevrons
    for (const y of [34.6, 36]) {
      arrow(2.65, y, Math.PI / 2, 'rgba(255,210,87,0.30)');
      arrow(16.35, y, Math.PI / 2, 'rgba(255,210,87,0.30)');
    }

    // TIDE lane paint
    g.fillStyle = 'rgba(25,224,200,0.16)';
    const tc = ['T', 'I', 'D', 'E'];
    const tideC = [6.38, 7.83, 9.48, 11.28];
    g.font = `${Math.round(0.62 * S)}px bold sans-serif`;
    g.textAlign = 'center'; g.textBaseline = 'middle';
    for (let i = 0; i < 4; i++) {
      g.fillText(tc[i], px(tideC[i]), py(7.0));
    }

    // whirlpool base art
    g.save();
    g.translate(px(11.4), py(25.6));
    const wg = g.createRadialGradient(0, 0, 0, 0, 0, 1.3 * S);
    wg.addColorStop(0, '#02090f');
    wg.addColorStop(0.7, '#06283c');
    wg.addColorStop(1, 'rgba(6,40,60,0)');
    g.fillStyle = wg;
    g.beginPath(); g.arc(0, 0, 1.3 * S, 0, Math.PI * 2); g.fill();
    g.restore();

    // shooter lane art
    g.fillStyle = 'rgba(255,210,87,0.08)';
    g.fillRect(px(18.55), py(9.2), px(19.8) - px(18.55), py(40.8) - py(9.2));

    // apron
    const apronGrad = g.createLinearGradient(0, py(38), 0, py(42));
    apronGrad.addColorStop(0, '#123a52');
    apronGrad.addColorStop(1, '#0b2233');
    g.fillStyle = apronGrad;
    g.beginPath();
    g.moveTo(px(0.5), py(38.1));
    g.lineTo(px(1.9), py(40.3)); g.lineTo(px(5.5), py(41.3)); g.lineTo(px(8.3), py(41.65));
    g.lineTo(px(11.9), py(41.65)); g.lineTo(px(14.7), py(41.3)); g.lineTo(px(17.6), py(40.7));
    g.lineTo(px(18.5), py(41.4)); g.lineTo(px(19.85), py(41.4)); g.lineTo(px(19.85), py(42));
    g.lineTo(px(0.5), py(42));
    g.closePath(); g.fill();
    // apron title plate
    g.fillStyle = 'rgba(255,210,87,0.85)';
    g.font = `bold ${Math.round(0.52 * S)}px Georgia, serif`;
    g.textAlign = 'center';
    g.fillText('RISE  OF  ATLANTIS', px(10.125), py(40.6));

    // wall chrome: draw every wall as a dark rail with light top edge
    const drawSeg = (s) => {
      g.lineCap = 'round';
      g.strokeStyle = '#0c1520';
      g.lineWidth = Math.max(2, (s.thick + 0.1) * S);
      g.beginPath(); g.moveTo(px(s.ax), py(s.ay)); g.lineTo(px(s.bx), py(s.by)); g.stroke();
      g.strokeStyle = 'rgba(120,190,225,0.5)';
      g.lineWidth = Math.max(1, 0.05 * S);
      g.beginPath(); g.moveTo(px(s.ax), py(s.ay)); g.lineTo(px(s.bx), py(s.by)); g.stroke();
    };
    for (const s of this.W.segs) {
      if (s.target && s.target.id && s.target.id.startsWith('drop')) continue; // dynamic
      if (s.sling) continue; // dynamic
      if (s.target && s.target.id === 'tempest') continue; // dynamic
      drawSeg(s);
    }
    // posts
    for (const p of this.W.posts) {
      if (p.bumper) continue;
      g.fillStyle = '#182a3a';
      g.beginPath(); g.arc(px(p.x), py(p.y), Math.max(2, p.r * S), 0, Math.PI * 2); g.fill();
      g.strokeStyle = 'rgba(160,215,240,0.6)';
      g.lineWidth = 1;
      g.beginPath(); g.arc(px(p.x), py(p.y), Math.max(2, p.r * S), 0, Math.PI * 2); g.stroke();
    }
  };

  // ---- helpers ------------------------------------------------------------------
  Renderer.prototype.poly = function (g, pts, close) {
    g.beginPath();
    g.moveTo(this.px(pts[0].x), this.py(pts[0].y));
    for (let i = 1; i < pts.length; i++) g.lineTo(this.px(pts[i].x), this.py(pts[i].y));
    if (close) g.closePath();
  };

  Renderer.prototype.insertLight = function (g, x, y, r, color, on, blink, label) {
    const lit = on && (!blink || Math.sin(this.time * 9) > -0.2);
    const X = this.px(x), Y = this.py(y), R = r * this.S;
    g.beginPath(); g.arc(X, Y, R, 0, Math.PI * 2);
    g.fillStyle = lit ? color : 'rgba(10,25,38,0.9)';
    g.fill();
    g.strokeStyle = lit ? '#ffffff' : 'rgba(120,170,200,0.35)';
    g.lineWidth = 1;
    g.stroke();
    if (lit) {
      const gl = g.createRadialGradient(X, Y, 0, X, Y, R * 3);
      gl.addColorStop(0, color.replace(')', ',0.5)').replace('rgb', 'rgba'));
      gl.addColorStop(1, 'rgba(0,0,0,0)');
      g.fillStyle = gl;
      g.beginPath(); g.arc(X, Y, R * 3, 0, Math.PI * 2); g.fill();
    }
    if (label) {
      g.fillStyle = lit ? '#e8fbff' : 'rgba(150,190,215,0.5)';
      g.font = `bold ${Math.round(0.3 * this.S)}px sans-serif`;
      g.textAlign = 'center'; g.textBaseline = 'middle';
      g.fillText(label, X, Y - R - 0.16 * this.S);
    }
  };

  Renderer.prototype.spark = function (x, y, color, n, speed) {
    for (let i = 0; i < (n || 6); i++) {
      const a = Math.random() * Math.PI * 2;
      this.particles.push({
        x, y, vx: Math.cos(a) * speed * (0.4 + Math.random()),
        vy: Math.sin(a) * speed * (0.4 + Math.random()),
        life: 0.35 + Math.random() * 0.25, t: 0, color,
      });
    }
  };

  // ---- main draw ------------------------------------------------------------------
  Renderer.prototype.draw = function (dt) {
    this.time += dt;
    const g = this.g2, game = this.game, S = this.S;
    if (this.cw === undefined) this.layout();
    this.applyView(dt);
    const cw = this.cv.width, ch = this.cv.height;

    // room background
    const room = g.createLinearGradient(0, 0, 0, ch);
    room.addColorStop(0, '#05070c');
    room.addColorStop(1, '#0a0d14');
    g.fillStyle = room;
    g.fillRect(0, 0, cw, ch);

    this.drawBackbox(g);
    g.drawImage(this.staticCv, this.px(0), this.py(0), 20.25 * S, 42 * S);

    this.drawRamps(g);
    this.drawZones(g);
    this.drawTargets(g);
    this.drawBumpers(g);
    this.drawSlings(g);
    this.drawSpinner(g);
    this.drawWhirlpool(g);
    this.drawLights(g);
    this.drawFlippers(g);
    this.drawBalls(g);
    this.drawPlunger(g);
    this.drawParticles(g, dt);

    // playfield glass glare
    const glare = g.createLinearGradient(this.px(2), this.py(2), this.px(18), this.py(30));
    glare.addColorStop(0, 'rgba(180,220,255,0.045)');
    glare.addColorStop(0.5, 'rgba(180,220,255,0.0)');
    g.fillStyle = glare;
    g.fillRect(this.px(0.3), this.py(0.3), 19.65 * S, 41.4 * S);

    // side rails + cabinet edges
    g.strokeStyle = '#2a3a4c';
    g.lineWidth = Math.max(3, 0.22 * S);
    g.strokeRect(this.px(0.28), this.py(0.28), 19.72 * S, 41.44 * S);

    this.drawDMD(g);
  };

  Renderer.prototype.drawBackbox = function (g) {
    const S = this.S;
    const x0 = this.px(-1.15), x1 = this.px(21.4), y0 = this.bbTop, y1 = this.pfTop;
    const compressed = this.zoom > 0.5;
    // panel
    const grad = g.createLinearGradient(x0, y0, x1, y1);
    grad.addColorStop(0, '#0b2033');
    grad.addColorStop(0.5, '#123a55');
    grad.addColorStop(1, '#0b2033');
    g.fillStyle = grad;
    g.fillRect(x0, y0, x1 - x0, y1 - y0);

    if (!compressed) {
      // sun rays
      g.save();
      g.globalAlpha = 0.18;
      g.strokeStyle = GOLD;
      g.lineWidth = 2;
      for (let i = 0; i < 12; i++) {
        const a = Math.PI + (i / 11) * Math.PI;
        g.beginPath();
        g.moveTo(this.px(10.125), y0 + (y1 - y0) * 0.30);
        g.lineTo(this.px(10.125) + Math.cos(a) * 12 * S, y0 + (y1 - y0) * 0.30 + Math.sin(a) * 12 * S);
        g.stroke();
      }
      g.restore();

      // trident emblem
      g.save();
      g.translate(this.px(10.125), y0 + (y1 - y0) * 0.30);
      g.strokeStyle = GOLD;
      g.lineWidth = Math.max(2, 0.14 * S);
      g.lineCap = 'round';
      const u = 0.9 * S;
      g.beginPath();
      g.moveTo(0, -1.4 * u); g.lineTo(0, 1.3 * u);              // shaft
      g.moveTo(-0.75 * u, -1.35 * u); g.quadraticCurveTo(-0.75 * u, -0.35 * u, 0, -0.3 * u); // left tine
      g.moveTo(0.75 * u, -1.35 * u); g.quadraticCurveTo(0.75 * u, -0.35 * u, 0, -0.3 * u);   // right tine
      g.moveTo(-0.9 * u, 0.55 * u); g.quadraticCurveTo(0, 1.0 * u, 0.9 * u, 0.55 * u);       // barbs
      g.stroke();
      g.restore();

      // title
      g.fillStyle = '#e8fbff';
      g.font = `bold ${Math.round(1.05 * S)}px Georgia, serif`;
      g.textAlign = 'center';
      g.fillText('RISE  OF  ATLANTIS', this.px(10.125), y1 - 1.05 * S);
      g.fillStyle = TEAL;
      g.font = `italic ${Math.round(0.42 * S)}px Georgia, serif`;
      g.fillText('the  lost  empire  awakens', this.px(10.125), y1 - 0.42 * S);
    } else {
      // slim strip: small title left of the DMD
      g.fillStyle = '#e8fbff';
      g.font = `bold ${Math.round(0.42 * S)}px Georgia, serif`;
      g.textAlign = 'left';
      g.fillText('RISE OF ATLANTIS', x0 + 0.5 * S, y0 + 0.72 * S);
      g.fillStyle = TEAL;
      g.font = `italic ${Math.round(0.26 * S)}px Georgia, serif`;
      g.textAlign = 'right';
      g.fillText('the lost empire awakens', x1 - 0.5 * S, y0 + 0.72 * S);
    }

    // frame
    g.strokeStyle = '#31506b';
    g.lineWidth = 3;
    g.strokeRect(x0, y0, x1 - x0, y1 - y0);
  };

  Renderer.prototype.drawRamps = function (g) {
    const S = this.S;
    for (const cor of this.W.cors) {
      if (cor.walls === false) continue; // wire forms drawn subtly below
      const hot = this.time - cor.flash < 0.4;
      // body
      g.beginPath();
      g.moveTo(this.px(cor.pts[0].x), this.py(cor.pts[0].y));
      for (let i = 1; i < cor.pts.length; i++) g.lineTo(this.px(cor.pts[i].x), this.py(cor.pts[i].y));
      g.lineWidth = cor.halfW * 2 * S;
      g.lineCap = 'round'; g.lineJoin = 'round';
      g.strokeStyle = hot ? 'rgba(255,210,87,0.30)' : 'rgba(57,183,255,0.13)';
      g.stroke();
      // rails
      for (const off of [-1, 1]) {
        const shifted = cor.pts.map((p, i) => {
          const a = cor.pts[Math.max(0, i - 1)], c = cor.pts[Math.min(cor.pts.length - 1, i + 1)];
          const dx = c.x - a.x, dy = c.y - a.y, l = Math.hypot(dx, dy) || 1;
          return { x: p.x + (dy / l) * off * cor.halfW, y: p.y + (-dx / l) * off * cor.halfW };
        });
        this.poly(g, shifted, false);
        g.strokeStyle = hot ? 'rgba(255,225,140,0.9)' : 'rgba(150,200,230,0.55)';
        g.lineWidth = Math.max(1.5, 0.07 * S);
        g.stroke();
      }
      // flow arrows when hot
      if (hot) {
        const P0 = root.AR_PHYS; // corridorPointAt
        const pt = P0.corridorPointAt(cor, (this.time * 40) % cor.len);
        g.fillStyle = '#fff';
        g.beginPath(); g.arc(this.px(pt.x), this.py(pt.y), 0.14 * S, 0, Math.PI * 2); g.fill();
      }
    }
  };

  Renderer.prototype.drawZones = function (g) {
    // kickback arrow in the left outlane
    const kb = this.game.kickbackLit;
    this.insertLight(g, 1.0, 33.6, 0.3, 'rgb(255,120,60)', kb, true);
  };

  Renderer.prototype.drawTargets = function (g) {
    const S = this.S;
    // trident standups
    this.refs.tridents.forEach((s, i) => {
      const lit = this.game.P() && !this.game.P().tridents[i];
      const mx = (s.ax + s.bx) / 2, my = (s.ay + s.by) / 2;
      g.save();
      g.translate(this.px(mx), this.py(my));
      g.rotate(Math.atan2(s.by - s.ay, s.bx - s.ax));
      g.fillStyle = lit ? (Math.sin(this.time * 6) > 0 ? GOLD : '#c9a530') : '#20364a';
      g.fillRect(-0.4 * S, -0.12 * S, 0.8 * S, 0.24 * S);
      g.strokeStyle = '#0c1520';
      g.lineWidth = 1.5;
      g.strokeRect(-0.4 * S, -0.12 * S, 0.8 * S, 0.24 * S);
      g.restore();
    });
    // TEMPEST
    const t = this.refs.tempest;
    const furyReady = this.game.P() && this.game.P().furyLit;
    const blinkFast = furyReady && Math.sin(this.time * 12) > 0;
    g.save();
    g.translate(this.px((t.ax + t.bx) / 2), this.py(t.ay));
    g.fillStyle = blinkFast ? '#fff' : furyReady ? GOLD : (Math.sin(this.time * 5) > 0 ? '#e0653a' : '#8a3f28');
    g.fillRect(-0.45 * S, -0.12 * S, 0.9 * S, 0.24 * S);
    g.strokeStyle = '#0c1520'; g.strokeRect(-0.45 * S, -0.12 * S, 0.9 * S, 0.24 * S);
    g.restore();
    g.fillStyle = furyReady ? '#fff' : 'rgba(230,190,140,0.75)';
    g.font = `bold ${Math.round(0.26 * S)}px sans-serif`;
    g.textAlign = 'center';
    g.fillText(furyReady ? 'FURY' : 'TEMPEST', this.px(9.2), this.py(23.6));
    // pearl drops
    this.refs.dropSegs.forEach((s) => {
      const down = s.target.down;
      const mx = (s.ax + s.bx) / 2, my = (s.ay + s.by) / 2;
      g.save();
      g.translate(this.px(mx), this.py(my));
      g.rotate(Math.atan2(s.by - s.ay, s.bx - s.ax));
      if (down) {
        g.fillStyle = 'rgba(5,15,25,0.9)';
        g.fillRect(-0.42 * S, -0.1 * S, 0.84 * S, 0.2 * S);
      } else {
        const pg = g.createLinearGradient(0, -0.12 * S, 0, 0.12 * S);
        pg.addColorStop(0, '#f2f7ff');
        pg.addColorStop(0.5, '#c9d8ea');
        pg.addColorStop(1, '#8fa6bd');
        g.fillStyle = pg;
        g.beginPath(); g.ellipse(0, 0, 0.42 * S, 0.13 * S, 0, 0, Math.PI * 2); g.fill();
        g.strokeStyle = '#5b7288'; g.lineWidth = 1; g.stroke();
      }
      g.restore();
    });
    g.fillStyle = 'rgba(200,225,245,0.6)';
    g.font = `bold ${Math.round(0.26 * S)}px sans-serif`;
    g.fillText('PEARLS', this.px(14.6), this.py(21.2));
  };

  Renderer.prototype.drawBumpers = function (g) {
    const S = this.S;
    for (const b of this.W.posts) {
      if (!b.bumper) continue;
      const hot = this.time - b.flash < 0.18;
      const X = this.px(b.x), Y = this.py(b.y), R = b.r * S;
      // glow
      if (hot) {
        const gl = g.createRadialGradient(X, Y, 0, X, Y, R * 2.4);
        gl.addColorStop(0, 'rgba(255,225,140,0.55)');
        gl.addColorStop(1, 'rgba(255,225,140,0)');
        g.fillStyle = gl;
        g.beginPath(); g.arc(X, Y, R * 2.4, 0, Math.PI * 2); g.fill();
      }
      // skirt
      g.fillStyle = hot ? '#fff3c4' : '#134058';
      g.beginPath(); g.arc(X, Y, R, 0, Math.PI * 2); g.fill();
      g.strokeStyle = hot ? GOLD : 'rgba(140,200,235,0.5)';
      g.lineWidth = 2;
      g.stroke();
      // cap
      g.fillStyle = hot ? '#ffffff' : '#0d2c40';
      g.beginPath(); g.arc(X, Y, R * 0.55, 0, Math.PI * 2); g.fill();
      g.strokeStyle = TEAL; g.lineWidth = 1.5;
      g.beginPath(); g.arc(X, Y, R * 0.55, 0, Math.PI * 2); g.stroke();
    }
    if (this.game.tidalSurge) {
      g.fillStyle = Math.sin(this.time * 8) > 0 ? GOLD : 'rgba(255,210,87,0.4)';
      g.font = `bold ${Math.round(0.32 * S)}px sans-serif`;
      g.textAlign = 'center';
      g.fillText('TIDAL SURGE', this.px(10.8), this.py(23.4));
    }
  };

  Renderer.prototype.drawSlings = function (g) {
    for (const s of [this.refs.slingL, this.refs.slingR]) {
      const hot = this.time - s.flash < 0.16;
      g.lineCap = 'round';
      g.strokeStyle = hot ? '#ffffff' : '#1c5a78';
      g.lineWidth = 0.26 * this.S;
      g.beginPath(); g.moveTo(this.px(s.ax), this.py(s.ay)); g.lineTo(this.px(s.bx), this.py(s.by)); g.stroke();
      if (hot) {
        g.strokeStyle = 'rgba(255,225,140,0.6)';
        g.lineWidth = 0.5 * this.S;
        g.beginPath(); g.moveTo(this.px(s.ax), this.py(s.ay)); g.lineTo(this.px(s.bx), this.py(s.by)); g.stroke();
      }
    }
  };

  Renderer.prototype.drawSpinner = function (g) {
    this.spinVel *= Math.pow(0.12, 1 / 60);
    const X = this.px(this.refs.spinner.x), Y = this.py(this.refs.spinner.y);
    const L = 0.85 * this.S;
    const a = this.time * this.spinVel * 2;
    g.save();
    g.translate(X, Y);
    g.fillStyle = 'rgba(255,210,87,0.16)';
    g.fillRect(-0.55 * this.S, -L, 1.1 * this.S, 2 * L);
    for (const phase of [0, Math.PI]) {
      g.save();
      g.rotate(a + phase);
      g.fillStyle = 'rgba(255,255,255,0.75)';
      g.fillRect(-0.5 * this.S, -L * 0.55, 1.0 * this.S, L * 0.18);
      g.restore();
    }
    g.restore();
  };

  Renderer.prototype.drawWhirlpool = function (g) {
    const X = this.px(11.4), Y = this.py(25.6), R = 1.15 * this.S;
    g.save();
    g.translate(X, Y);
    g.rotate(this.time * 2.2);
    g.strokeStyle = 'rgba(57,183,255,0.55)';
    for (let arm = 0; arm < 3; arm++) {
      g.beginPath();
      for (let tt = 0; tt <= 1; tt += 0.08) {
        const r = R * (0.15 + 0.85 * tt);
        const an = arm * (Math.PI * 2 / 3) + tt * 4.2;
        const x = Math.cos(an) * r, y = Math.sin(an) * r;
        if (tt === 0) g.moveTo(x, y); else g.lineTo(x, y);
      }
      g.lineWidth = 2;
      g.stroke();
    }
    g.restore();
    // context light
    const p = this.game.P();
    const gl2 = g.createRadialGradient(X, Y, R * 0.4, X, Y, R * 1.7);
    const active = (this.game.lockLit || (p && p.giftLit) || (g.mb && g.mb.superLit) || (this.game.fury && this.game.fury.superLit));
    gl2.addColorStop(0, active ? 'rgba(255,210,87,0.35)' : 'rgba(57,183,255,0.18)');
    gl2.addColorStop(1, 'rgba(0,0,0,0)');
    g.fillStyle = gl2;
    g.beginPath(); g.arc(X, Y, R * 1.7, 0, Math.PI * 2); g.fill();
  };

  Renderer.prototype.drawLights = function (g) {
    const game = this.game, p = game.P() || {};
    // TIDE lane inserts
    const tideC = [6.38, 7.83, 9.48, 11.28];
    for (let i = 0; i < 4; i++) {
      this.insertLight(g, tideC[i], 8.15, 0.16, 'rgb(25,224,200)', !game.tideLanes[i] && game.tideLanes.some(v => v), false);
    }
    // skill shot arrow at skill lane
    if (game.skillAvail) {
      const x = game.skillLane === 0 ? 1.65 : 6.4;
      this.insertLight(g, x, game.skillLane === 0 ? 12.5 : 29.0, 0.22, 'rgb(255,210,87)', true, true);
    }
    // trident bank arrows
    for (let i = 0; i < 3; i++) {
      this.insertLight(g, 3.1 + i * 0.0, 0, 0, ''); // skip; bank lights drawn at left
    }
    this.insertLight(g, 2.55, 26.0, 0.24, 'rgb(255,210,87)', p.giftLit, true, 'GIFT');
    // lock lights
    this.insertLight(g, 13.3, 25.6, 0.24, 'rgb(120,90,255)', game.lockLit, true, 'LOCK');
    this.insertLight(g, 13.3, 27.4, 0.24, 'rgb(120,90,255)', game.locks >= 1, false, '');
    this.insertLight(g, 13.3, 23.8, 0.24, 'rgb(120,90,255)', game.mb.active && !game.mb.wizard, false, 'KRAKEN');
    // mode lights
    const names = ['TOWER', 'PEARLS', 'TIDES', 'CROWN'];
    for (let i = 0; i < 4; i++) {
      const done = p.modesDone && p.modesDone[i];
      const active = game.mode && game.mode.idx === i;
      this.insertLight(g, 4.4 + i * 0.85, 20.6 - (i % 2) * 0.0, 0.2, 'rgb(25,224,200)', active || (done && Math.sin(this.time * 3) > 0), active, names[i]);
    }
    // fury
    this.insertLight(g, 7.6, 22.9, 0.24, 'rgb(255,120,60)', p.furyLit, true, 'FURY');
    // extra ball
    this.insertLight(g, 12.6, 34.9, 0.22, 'rgb(120,255,140)', p.ebLit, true, 'EB');
    // combo arrow between ramps
    this.insertLight(g, 10.1, 28.6, 0.2, 'rgb(120,90,255)', game.comboT > this.W.time && game.combo > 0, false, 'COMBO');
  };

  Renderer.prototype.drawFlippers = function (g) {
    for (const f of this.W.flippers) {
      const hot = this.time - f.flash < 0.15;
      g.save();
      g.translate(this.px(f.px), this.py(f.py));
      g.rotate(f.ang);
      const L = f.len * this.S, r0 = f.rBase * this.S, r1 = f.rTip * this.S;
      // body
      const grad = g.createLinearGradient(0, -r0, 0, r0);
      grad.addColorStop(0, hot ? '#ffffff' : '#f5f2e8');
      grad.addColorStop(0.5, hot ? '#ffe9a8' : '#e2dccb');
      grad.addColorStop(1, hot ? '#d8b74a' : '#9a937e');
      g.fillStyle = grad;
      g.beginPath();
      g.arc(0, 0, r0, Math.PI / 2, -Math.PI / 2);
      g.lineTo(L, -r1);
      g.arc(L, 0, r1, -Math.PI / 2, Math.PI / 2);
      g.closePath();
      g.fill();
      // rubber stripe
      g.strokeStyle = '#c33';
      g.lineWidth = Math.max(2, r0 * 0.5);
      g.beginPath();
      g.moveTo(r0 * 0.8, 0);
      g.lineTo(L - r1 * 0.8, 0);
      g.stroke();
      g.strokeStyle = 'rgba(0,0,0,0.35)';
      g.lineWidth = 1;
      g.beginPath();
      g.arc(0, 0, r0, 0, Math.PI * 2);
      g.stroke();
      g.restore();
    }
  };

  Renderer.prototype.drawBalls = function (g) {
    const S = this.S, R = P.BALL_R * S;
    for (const b of this.W.balls) {
      if (b.state === 'captured' || b.state === 'plunger' || b.state === 'gone') continue;
      let x = this.px(b.x), y = this.py(b.y);
      const spd = Math.hypot(b.vx, b.vy);
      // motion trail
      if (spd > 45) {
        g.strokeStyle = 'rgba(200,230,255,0.25)';
        g.lineWidth = R * 1.2;
        g.lineCap = 'round';
        g.beginPath();
        g.moveTo(x, y);
        g.lineTo(x - b.vx / spd * R * 3.2, y - b.vy / spd * R * 3.2);
        g.stroke();
      }
      // shadow
      g.fillStyle = 'rgba(0,0,0,0.4)';
      g.beginPath(); g.ellipse(x + R * 0.25, y + R * 0.35, R * 0.95, R * 0.75, 0, 0, Math.PI * 2); g.fill();
      // steel ball
      const bg = g.createRadialGradient(x - R * 0.4, y - R * 0.45, R * 0.1, x, y, R);
      bg.addColorStop(0, '#ffffff');
      bg.addColorStop(0.25, '#d5e4f2');
      bg.addColorStop(0.6, '#7f97ad');
      bg.addColorStop(1, '#3a4f63');
      g.fillStyle = bg;
      g.beginPath(); g.arc(x, y, R, 0, Math.PI * 2); g.fill();
      g.strokeStyle = 'rgba(230,245,255,0.5)';
      g.lineWidth = 0.8;
      g.beginPath(); g.arc(x, y, R, 0, Math.PI * 2); g.stroke();
    }
  };

  Renderer.prototype.drawPlunger = function (g) {
    const game = this.game;
    let pull = 0;
    if (game.state === 'launch' && game._plungerHeld) pull = game._plungerP || 0;
    const S = this.S;
    const x = this.px(19.18);
    const tipY = this.py(40.55 + pull * 0.7);
    g.strokeStyle = '#8fa6bd';
    g.lineWidth = 0.16 * S;
    g.beginPath(); g.moveTo(x, tipY); g.lineTo(x, this.py(41.9)); g.stroke();
    g.fillStyle = GOLD;
    g.beginPath(); g.arc(x, tipY, 0.2 * S, 0, Math.PI * 2); g.fill();
  };

  Renderer.prototype.drawParticles = function (g, dt) {
    for (let i = this.particles.length - 1; i >= 0; i--) {
      const pt = this.particles[i];
      pt.t += dt;
      if (pt.t > pt.life) { this.particles.splice(i, 1); continue; }
      pt.x += pt.vx * dt; pt.y += pt.vy * dt;
      pt.vy += 30 * dt;
      g.globalAlpha = 1 - pt.t / pt.life;
      g.fillStyle = pt.color;
      g.fillRect(this.px(pt.x) - 1.5, this.py(pt.y) - 1.5, 3, 3);
      g.globalAlpha = 1;
    }
  };

  // ---- DMD ------------------------------------------------------------------------
  Renderer.prototype.drawDMD = function (g) {
    const S = this.S;
    const dotAreaW = 128, dotAreaH = 32;
    const scale = Math.min(19.8 / dotAreaW * S, 4.6 * S / dotAreaH);
    const dw = dotAreaW * scale, dh = dotAreaH * scale;
    const x0 = this.px(10.125) - dw / 2;
    const y0 = this.pfTop - 4.55 * S;

    // bezel
    g.fillStyle = '#05080d';
    g.fillRect(x0 - 6, y0 - 6, dw + 12, dh + 12);
    g.strokeStyle = '#31506b';
    g.lineWidth = 2;
    g.strokeRect(x0 - 6, y0 - 6, dw + 12, dh + 12);

    const bmp = this.game.dmdBitmap ? this.game.dmdBitmap(this.time) : null;
    g.fillStyle = '#0a0402';
    g.fillRect(x0, y0, dw, dh);
    if (!bmp) return;
    const dot = Math.max(1, scale - scale * 0.28);
    for (let y = 0; y < D.H; y++) {
      for (let x = 0; x < D.W; x++) {
        if (bmp[y * D.W + x]) {
          g.fillStyle = (x + y) % 2 === 0 ? '#ffb43c' : '#ff9a1f';
          g.fillRect(x0 + x * scale, y0 + y * scale, dot, dot);
        }
      }
    }
  };

  root.AR_RENDER = { Renderer, TEAL, GOLD };
})(typeof window !== 'undefined' ? window : globalThis);
