/* =========================================================================
   RISE OF ATLANTIS — dmd.js
   128x32 amber dot-matrix display: 5x7 font, text layout, effects.
   Node-safe (font/layout testable headlessly).
   ========================================================================= */
(function (root) {
  'use strict';

  const W = 128, H = 32;

  // 5x7 glyphs, 7 rows of 5-bit patterns (msb left)
  const F = {
    'A': [14,17,17,31,17,17,17], 'B': [30,17,17,30,17,17,30], 'C': [14,17,16,16,16,17,14],
    'D': [30,17,17,17,17,17,30], 'E': [31,16,16,30,16,16,31], 'F': [31,16,16,30,16,16,16],
    'G': [14,17,16,23,17,17,14], 'H': [17,17,17,31,17,17,17], 'I': [14,4,4,4,4,4,14],
    'J': [7,2,2,2,2,18,12], 'K': [17,18,20,24,20,18,17], 'L': [16,16,16,16,16,16,31],
    'M': [17,27,21,21,17,17,17], 'N': [17,25,21,19,17,17,17], 'O': [14,17,17,17,17,17,14],
    'P': [30,17,17,30,16,16,16], 'Q': [14,17,17,17,21,18,13], 'R': [30,17,17,30,20,18,17],
    'S': [15,16,16,14,1,1,30], 'T': [31,4,4,4,4,4,4], 'U': [17,17,17,17,17,17,14],
    'V': [17,17,17,17,17,10,4], 'W': [17,17,17,21,21,27,17], 'X': [17,10,4,4,10,17,17],
    'Y': [17,10,4,4,4,4,4], 'Z': [31,1,2,4,8,16,31],
    '0': [14,17,19,21,25,17,14], '1': [4,12,4,4,4,4,14], '2': [14,17,1,2,4,8,31],
    '3': [30,1,1,14,1,1,30], '4': [2,6,10,18,31,2,2], '5': [31,16,30,1,1,17,14],
    '6': [6,8,16,30,17,17,14], '7': [31,1,2,4,8,8,8], '8': [14,17,17,14,17,17,14],
    '9': [14,17,17,15,1,2,12],
    ' ': [0,0,0,0,0,0,0], '.': [0,0,0,0,0,12,12], ',': [0,0,0,0,12,4,8],
    '-': [0,0,0,31,0,0,0], '!': [4,4,4,4,4,0,4], '?': [14,17,1,2,4,0,4],
    ':': [0,12,12,0,12,12,0], "'": [4,4,8,0,0,0,0], '/': [1,1,2,4,8,16,16],
    '+': [0,4,4,31,4,4,0], 'X2': [0,0,0,0,0,0,0],
  };

  function bitmap() { return new Uint8Array(W * H); }

  function drawChar(bmp, ch, x, y) {
    const g = F[ch];
    if (!g) return 6;
    for (let r = 0; r < 7; r++) {
      const row = g[r];
      for (let c = 0; c < 5; c++) {
        if (row & (16 >> c)) {
          const px = x + c, py = y + r;
          if (px >= 0 && px < W && py >= 0 && py < H) bmp[py * W + px] = 1;
        }
      }
    }
    return 6;
  }

  function drawText(bmp, text, x, y, scale) {
    scale = scale || 1;
    let cx = x;
    for (const ch of String(text).toUpperCase()) {
      const g = F[ch] || F['?'];
      for (let r = 0; r < 7; r++) {
        for (let c = 0; c < 5; c++) {
          if (g[r] & (16 >> c)) {
            for (let sy = 0; sy < scale; sy++) for (let sx = 0; sx < scale; sx++) {
              const px = cx + c * scale + sx, py = y + r * scale + sy;
              if (px >= 0 && px < W && py >= 0 && py < H) bmp[py * W + px] = 1;
            }
          }
        }
      }
      cx += 6 * scale;
    }
    return cx;
  }

  function textWidth(text, scale) { return String(text).length * 6 * (scale || 1); }

  function drawCentered(bmp, text, y, scale) {
    scale = scale || 1;
    drawText(bmp, text, Math.floor((W - textWidth(text, scale)) / 2), y, scale);
  }

  /** sine-wave distortion of whole bitmap (logo effect) */
  function wave(bmp, t, amp) {
    amp = amp || 1.4;
    const out = bitmap();
    for (let y = 0; y < H; y++) {
      const dx = Math.round(Math.sin(t * 3 + y * 0.45) * amp);
      for (let x = 0; x < W; x++) {
        const sx = x + dx;
        if (bmp[y * W + ((sx % W) + W) % W]) out[y * W + x] = 1;
      }
    }
    return out;
  }

  const DMD = { W, H, F, bitmap, drawChar, drawText, drawCentered, textWidth, wave };

  root.AR_DMD = DMD;
  if (typeof module !== 'undefined' && module.exports) module.exports = DMD;
})(typeof window !== 'undefined' ? window : globalThis);
