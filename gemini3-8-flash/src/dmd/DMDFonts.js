/**
 * DMDFonts - Bitmap typography and icons for 128x32 Williams DMD display
 */

// 5x7 Standard Dot Matrix Font for text
export const FONT_5x7 = {
  ' ': [0, 0, 0, 0, 0],
  'A': [0x7E, 0x11, 0x11, 0x11, 0x7E],
  'B': [0x7F, 0x49, 0x49, 0x49, 0x36],
  'C': [0x3E, 0x41, 0x41, 0x41, 0x22],
  'D': [0x7F, 0x41, 0x41, 0x22, 0x1C],
  'E': [0x7F, 0x49, 0x49, 0x49, 0x41],
  'F': [0x7F, 0x09, 0x09, 0x09, 0x01],
  'G': [0x3E, 0x41, 0x49, 0x49, 0x7A],
  'H': [0x7F, 0x08, 0x08, 0x08, 0x7F],
  'I': [0x00, 0x41, 0x7F, 0x41, 0x00],
  'J': [0x20, 0x40, 0x41, 0x3F, 0x01],
  'K': [0x7F, 0x08, 0x14, 0x22, 0x41],
  'L': [0x7F, 0x40, 0x40, 0x40, 0x40],
  'M': [0x7F, 0x02, 0x0C, 0x02, 0x7F],
  'N': [0x7F, 0x04, 0x08, 0x10, 0x7F],
  'O': [0x3E, 0x41, 0x41, 0x41, 0x3E],
  'P': [0x7F, 0x09, 0x09, 0x09, 0x06],
  'Q': [0x3E, 0x41, 0x51, 0x21, 0x5E],
  'R': [0x7F, 0x09, 0x19, 0x29, 0x46],
  'S': [0x46, 0x49, 0x49, 0x49, 0x31],
  'T': [0x01, 0x01, 0x7F, 0x01, 0x01],
  'U': [0x3F, 0x40, 0x40, 0x40, 0x3F],
  'V': [0x1F, 0x20, 0x40, 0x20, 0x1F],
  'W': [0x7F, 0x20, 0x18, 0x20, 0x7F],
  'X': [0x63, 0x14, 0x08, 0x14, 0x63],
  'Y': [0x07, 0x08, 0x70, 0x08, 0x07],
  'Z': [0x61, 0x51, 0x49, 0x45, 0x43],
  '0': [0x3E, 0x51, 0x49, 0x45, 0x3E],
  '1': [0x00, 0x42, 0x7F, 0x40, 0x00],
  '2': [0x42, 0x61, 0x51, 0x49, 0x46],
  '3': [0x21, 0x41, 0x45, 0x4B, 0x31],
  '4': [0x18, 0x14, 0x12, 0x7F, 0x10],
  '5': [0x27, 0x45, 0x45, 0x45, 0x39],
  '6': [0x3C, 0x4A, 0x49, 0x49, 0x30],
  '7': [0x01, 0x71, 0x09, 0x05, 0x03],
  '8': [0x36, 0x49, 0x49, 0x49, 0x36],
  '9': [0x06, 0x49, 0x49, 0x29, 0x1E],
  ':': [0x00, 0x36, 0x36, 0x00, 0x00],
  '!': [0x00, 0x00, 0x5F, 0x00, 0x00],
  '-': [0x08, 0x08, 0x08, 0x08, 0x08],
  '?': [0x02, 0x01, 0x51, 0x09, 0x06],
  ',': [0x00, 0x50, 0x30, 0x00, 0x00],
  '.': [0x00, 0x60, 0x60, 0x00, 0x00]
};

// 7x13 Bold Williams Header Font
export const FONT_7x13 = {
  ' ': [0, 0, 0, 0, 0, 0, 0],
  '0': [0x0F, 0xF0, 0x10, 0x08, 0x10, 0x08, 0x10, 0x08, 0x0F, 0xF0],
  '1': [0x00, 0x00, 0x08, 0x10, 0x1F, 0xF8, 0x00, 0x00, 0x00, 0x00]
};

// Draw character onto 128x32 buffer
export function drawChar(buffer, char, startX, startY, brightness = 3) {
  const glyph = FONT_5x7[char.toUpperCase()];
  if (!glyph) return startX + 6;

  for (let col = 0; col < 5; col++) {
    const x = startX + col;
    if (x < 0 || x >= 128) continue;
    const colData = glyph[col];

    for (let row = 0; row < 7; row++) {
      const y = startY + row;
      if (y < 0 || y >= 32) continue;

      if ((colData & (1 << row)) !== 0) {
        buffer[y * 128 + x] = brightness;
      }
    }
  }
  return startX + 6; // 5 width + 1 spacing
}

// Draw string onto 128x32 buffer
export function drawString(buffer, text, startX, startY, brightness = 3) {
  let curX = startX;
  for (let i = 0; i < text.length; i++) {
    curX = drawChar(buffer, text[i], curX, startY, brightness);
  }
  return curX;
}

// Draw centered string
export function drawCenteredString(buffer, text, startY, brightness = 3) {
  const width = text.length * 6 - 1;
  const startX = Math.floor((128 - width) / 2);
  drawString(buffer, text, startX, startY, brightness);
}

// Large Score Digits (8x15)
export const DIGITS_8x15 = {
  '0': [
    0b01111110,
    0b11111111,
    0b11000011,
    0b11000011,
    0b11000011,
    0b11000011,
    0b11000011,
    0b11000011,
    0b11000011,
    0b11000011,
    0b11000011,
    0b11000011,
    0b11000011,
    0b11111111,
    0b01111110
  ],
  '1': [
    0b00001100,
    0b00011100,
    0b00111100,
    0b01111100,
    0b00001100,
    0b00001100,
    0b00001100,
    0b00001100,
    0b00001100,
    0b00001100,
    0b00001100,
    0b00001100,
    0b00001100,
    0b11111111,
    0b11111111
  ],
  '2': [
    0b01111110,
    0b11111111,
    0b11000011,
    0b00000011,
    0b00000110,
    0b00001100,
    0b00011000,
    0b00110000,
    0b01100000,
    0b11000000,
    0b11000000,
    0b11000011,
    0b11111111,
    0b11111111,
    0b11111111
  ],
  '3': [
    0b01111110,
    0b11111111,
    0b11000011,
    0b00000011,
    0b00000011,
    0b00000110,
    0b00111100,
    0b00111100,
    0b00000110,
    0b00000011,
    0b00000011,
    0b11000011,
    0b11111111,
    0b01111110,
    0b00000000
  ],
  '4': [
    0b00000110,
    0b00001110,
    0b00011110,
    0b00110110,
    0b01100110,
    0b11000110,
    0b11000110,
    0b11111111,
    0b11111111,
    0b00000110,
    0b00000110,
    0b00000110,
    0b00000110,
    0b00000110,
    0b00000110
  ],
  '5': [
    0b11111111,
    0b11111111,
    0b11000000,
    0b11000000,
    0b11011110,
    0b11111111,
    0b11000011,
    0b00000011,
    0b00000011,
    0b00000011,
    0b11000011,
    0b11111111,
    0b01111110,
    0b00000000,
    0b00000000
  ],
  '6': [
    0b00111100,
    0b01111110,
    0b11000011,
    0b11000000,
    0b11011110,
    0b11111111,
    0b11000011,
    0b11000011,
    0b11000011,
    0b11000011,
    0b11000011,
    0b11111111,
    0b01111110,
    0b00000000,
    0b00000000
  ],
  '7': [
    0b11111111,
    0b11111111,
    0b00000011,
    0b00000110,
    0b00001100,
    0b00011000,
    0b00110000,
    0b00110000,
    0b00110000,
    0b00110000,
    0b00110000,
    0b00110000,
    0b00110000,
    0b00110000,
    0b00000000
  ],
  '8': [
    0b01111110,
    0b11111111,
    0b11000011,
    0b11000011,
    0b11000011,
    0b01111110,
    0b11111111,
    0b11000011,
    0b11000011,
    0b11000011,
    0b11000011,
    0b11111111,
    0b01111110,
    0b00000000,
    0b00000000
  ],
  '9': [
    0b01111110,
    0b11111111,
    0b11000011,
    0b11000011,
    0b11000011,
    0b11111111,
    0b01111111,
    0b00000011,
    0b00000011,
    0b00000011,
    0b11000011,
    0b11111111,
    0b01111110,
    0b00000000,
    0b00000000
  ],
  ',': [
    0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0,
    0b00011000,
    0b00011000,
    0b00001100,
    0b00000110
  ]
};

export function drawLargeDigit(buffer, digitChar, startX, startY, brightness = 3) {
  const glyph = DIGITS_8x15[digitChar];
  if (!glyph) return startX + 9;

  for (let row = 0; row < glyph.length; row++) {
    const y = startY + row;
    if (y < 0 || y >= 32) continue;
    const rowByte = glyph[row];

    for (let col = 0; col < 8; col++) {
      const x = startX + col;
      if (x < 0 || x >= 128) continue;

      if ((rowByte & (0b10000000 >> col)) !== 0) {
        buffer[y * 128 + x] = brightness;
      }
    }
  }
  return startX + (digitChar === ',' ? 4 : 9);
}

export function drawLargeScore(buffer, score, startX, startY, brightness = 3) {
  const formatted = score.toLocaleString('en-US');
  let curX = startX;
  for (let i = 0; i < formatted.length; i++) {
    curX = drawLargeDigit(buffer, formatted[i], curX, startY, brightness);
  }
}

