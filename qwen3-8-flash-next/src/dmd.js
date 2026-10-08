// THUNDER CANYON — dot-matrix display (DMD): 128x32, 5x7 font, scrolling
// messages, flame bars, attract logo. Renders as lit dots onto the main canvas.

const DMD = {};

const F = {}; // rows encoded as strings of 5 bits, 7 rows per glyph
const G = (rows) => rows;
F['A'] = G(['01110', '10001', '10001', '11111', '10001', '10001', '10001']);
F['B'] = G(['11110', '10001', '10001', '11110', '10001', '10001', '11110']);
F['C'] = G(['01110', '10001', '10000', '10000', '10000', '10001', '01110']);
F['D'] = G(['11110', '10001', '10001', '10001', '10001', '10001', '11110']);
F['E'] = G(['11111', '10000', '10000', '11110', '10000', '10000', '11111']);
F['F'] = G(['11111', '10000', '10000', '11110', '10000', '10000', '10000']);
F['G'] = G(['01110', '10001', '10000', '10111', '10001', '10001', '01111']);
F['H'] = G(['10001', '10001', '10001', '11111', '10001', '10001', '10001']);
F['I'] = G(['01110', '00100', '00100', '00100', '00100', '00100', '01110']);
F['J'] = G(['00111', '00010', '00010', '00010', '00010', '10010', '01100']);
F['K'] = G(['10001', '10010', '10100', '11000', '10100', '10010', '10001']);
F['L'] = G(['10000', '10000', '10000', '10000', '10000', '10000', '11111']);
F['M'] = G(['10001', '11011', '10101', '10101', '10001', '10001', '10001']);
F['N'] = G(['10001', '11001', '10101', '10011', '10001', '10001', '10001']);
F['O'] = G(['01110', '10001', '10001', '10001', '10001', '10001', '01110']);
F['P'] = G(['11110', '10001', '10001', '11110', '10000', '10000', '10000']);
F['Q'] = G(['01110', '10001', '10001', '10001', '10101', '10010', '01101']);
F['R'] = G(['11110', '10001', '10001', '11110', '10100', '10010', '10001']);
F['S'] = G(['01111', '10000', '10000', '01110', '00001', '00001', '11110']);
F['T'] = G(['11111', '00100', '00100', '00100', '00100', '00100', '00100']);
F['U'] = G(['10001', '10001', '10001', '10001', '10001', '10001', '01110']);
F['V'] = G(['10001', '10001', '10001', '10001', '10001', '01010', '00100']);
F['W'] = G(['10001', '10001', '10001', '10101', '10101', '11011', '10001']);
F['X'] = G(['10001', '10001', '01010', '00100', '01010', '10001', '10001']);
F['Y'] = G(['10001', '10001', '01010', '00100', '00100', '00100', '00100']);
F['Z'] = G(['11111', '00001', '00010', '00100', '01000', '10000', '11111']);
F['0'] = G(['01110', '10001', '10011', '10101', '11001', '10001', '01110']);
F['1'] = G(['00100', '01100', '00100', '00100', '00100', '00100', '01110']);
F['2'] = G(['01110', '10001', '00001', '00110', '01000', '10000', '11111']);
F['3'] = G(['11110', '00001', '00001', '01110', '00001', '00001', '11110']);
F['4'] = G(['10010', '10010', '10010', '11111', '00010', '00010', '00010']);
F['5'] = G(['11111', '10000', '11110', '00001', '00001', '10001', '01110']);
F['6'] = G(['01110', '10000', '10000', '11110', '10001', '10001', '01110']);
F['7'] = G(['11111', '00001', '00010', '00100', '01000', '01000', '01000']);
F['8'] = G(['01110', '10001', '10001', '01110', '10001', '10001', '01110']);
F['9'] = G(['01110', '10001', '10001', '01111', '00001', '00001', '01110']);
F[' '] = G(['00000', '00000', '00000', '00000', '00000', '00000', '00000']);
F['!'] = G(['00100', '00100', '00100', '00100', '00100', '00000', '00100']);
F['.'] = G(['00000', '00000', '00000', '00000', '00000', '01100', '01100']);
F['-'] = G(['00000', '00000', '00000', '11111', '00000', '00000', '00000']);
F[':'] = G(['00000', '01100', '01100', '00000', '01100', '01100', '00000']);
F['+'] = G(['00000', '00100', '00100', '11111', '00100', '00100', '00000']);
F['?'] = G(['01110', '10001', '00001', '00110', '00100', '00000', '00100']);
F['/'] = G(['00001', '00010', '00010', '00100', '01000', '01000', '10000']);
F['>'] = G(['01000', '00100', '00010', '00001', '00010', '00100', '01000']);

const DMDW = 128, DMDH = 32;

class Dmd {
  constructor() {
    this.w = DMDW; this.h = DMDH;
    this.buf = new Uint8Array(DMDW * DMDH);
    this.scrollX = 0;
    this.text = '';
    this.autoScroll = false;
    this.t = 0;
    this.large = null; // {text, color} for splash logo
    this.bars = false; // flame bars
  }

  width(text) { let x = 0; for (const ch of text) x += (F[ch] ? 5 : 5) + 1; return x; }

  setText(text, scroll = null) {
    if (text === this.text) return;
    this.text = String(text || '').toUpperCase();
    this.autoScroll = scroll === null ? this.width(this.text) > DMDW : scroll;
    this.scrollX = this.autoScroll ? DMDW : Math.floor((DMDW - this.width(this.text)) / 2);
  }

  tick(dt) {
    this.t += dt;
    this.buf.fill(0);
    if (this.autoScroll) {
      this.scrollX -= dt * 26;
      if (this.scrollX < -this.width(this.text)) this.scrollX = DMDW;
    }
    this.renderText(this.text, this.scrollX, this.secondary ? 1 : 12, 1);
    if (this.secondary) {
      const s = this.secondary;
      const sc = s.scale || 2;
      const cx = Math.floor((DMDW - this.width(s.text) * sc) / 2);
      this.renderText(s.text, cx, s.y ?? 12, sc);
    }
    if (this.bars) this.drawFlames();
  }

  renderText(text, x0, y0, scale = 1) {
    let cx = Math.floor(x0);
    for (const ch of text) {
      const g = F[ch] || F['?'];
      for (let r = 0; r < 7; r++) {
        for (let c = 0; c < 5; c++) {
          if (g[r][c] === '1') {
            const px = cx + c * scale, py = y0 + r * scale;
            for (let sy = 0; sy < scale; sy++)
              for (let sx = 0; sx < scale; sx++)
                this.dot(px + sx, py + sy, 255);
          }
        }
      }
      cx += 6 * scale;
    }
  }

  drawFlames() {
    // bottom 4 rows: flickering bars
    for (let x = 0; x < DMDW; x++) {
      const h = 1 + Math.floor(3 * Math.abs(Math.sin(x * 0.35 + this.t * 7) * Math.sin(x * 0.13 - this.t * 3)));
      for (let k = 0; k < h; k++) {
        const y = DMDH - 1 - k;
        this.buf[y * DMDW + x] = Math.max(this.buf[y * DMDW + x], 180 - k * 60);
      }
    }
  }

  dot(x, y, v = 255) {
    if (x < 0 || y < 0 || x >= DMDW || y >= DMDH) return;
    this.buf[y * DMDW + x] = Math.max(this.buf[y * DMDW + x], v);
  }

  // Draw dot matrix onto a 2d ctx inside (dx,dy,dw,dh) device px box.
  paint(ctx, dx, dy, cell, color) {
    ctx.fillStyle = '#150a06';
    ctx.fillRect(dx - 3, dy - 3, cell * DMDW + 6, cell * DMDH + 6);
    ctx.fillStyle = 'rgba(255,120,40,0.055)';
    for (let y = 0; y < DMDH; y++)
      for (let x = 0; x < DMDW; x++)
        if (!this.buf[y * DMDW + x]) ctx.fillRect(dx + x * cell, dy + y * cell, cell - 1, cell - 1);
    ctx.fillStyle = color || '#ffb04a';
    for (let y = 0; y < DMDH; y++)
      for (let x = 0; x < DMDW; x++) {
        const v = this.buf[y * DMDW + x];
        if (v > 200) ctx.fillRect(dx + x * cell, dy + y * cell, cell - 1, cell - 1);
      }
  }
}

DMD.Dmd = Dmd;
if (typeof module !== 'undefined' && module.exports) module.exports = DMD;
if (typeof window !== 'undefined') window.DMD = DMD;
