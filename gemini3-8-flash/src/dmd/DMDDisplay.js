import { drawString, drawCenteredString, drawLargeScore, drawChar } from './DMDFonts.js';

/**
 * DMDDisplay - Authentic 128x32 Dot Matrix Display Engine
 * Simulates Williams WPC orange neon gas plasma display.
 */
export class DMDDisplay {
  constructor(canvas) {
    this.canvas = canvas || document.createElement('canvas');
    this.width = 128;
    this.height = 32;
    this.canvas.width = 512;
    this.canvas.height = 128;
    this.ctx = this.canvas.getContext('2d');

    // 128x32 pixel buffer: 0 (off), 1 (dim), 2 (medium), 3 (bright)
    this.buffer = new Uint8Array(this.width * this.height);

    // Orange/Amber plasma dot color palette
    this.palette = [
      '#150900', // 0: off dot
      '#753600', // 1: low
      '#d96600', // 2: med
      '#ffaa00'  // 3: full bright
    ];

    // Current display mode and animation states
    this.mode = 'TITLE'; // 'TITLE', 'GAME', 'ANIMATION', 'BONUS', 'INITIALS', 'SCORES'
    this.score = 0;
    this.ballNum = 1;
    this.animTimer = 0;
    this.animDuration = 0;
    this.animCallback = null;
    this.currentAnim = null;

    // Transient message overlay
    this.message = null;
    this.messageTimer = 0;
    this.messageDuration = 0;

    // Blink timer for cursor
    this.blinkTimer = 0;

    this.showTitleScreen();
  }

  clear() {
    this.buffer.fill(0);
  }

  setPixel(x, y, brightness = 3) {
    if (x >= 0 && x < this.width && y >= 0 && y < this.height) {
      this.buffer[y * this.width + x] = brightness;
    }
  }

  setScore(score) {
    this.score = score;
    if (this.mode === 'GAME') {
      this.renderGameHUD();
    }
  }

  showTitleScreen() {
    this.mode = 'TITLE';
    this.clear();
    drawCenteredString(this.buffer, 'QUANTUM CORE', 6, 3);
    drawCenteredString(this.buffer, 'MELTDOWN', 16, 2);
    drawCenteredString(this.buffer, 'PRESS 1 TO START', 25, 1);
  }

  showInsertCoin() {
    this.mode = 'TITLE';
    this.clear();
    drawCenteredString(this.buffer, 'WILLIAMS PINBALL', 4, 2);
    drawCenteredString(this.buffer, 'FREE PLAY', 14, 3);
    drawCenteredString(this.buffer, 'PRESS 1 TO LAUNCH', 24, 1);
  }

  showHighScores(hsManager) {
    this.mode = 'SCORES';
    this.clear();
    drawCenteredString(this.buffer, 'HALL OF FAME', 2, 2);

    const scores = hsManager ? hsManager.highScores : [];
    if (scores.length > 0) {
      const top1 = scores[0];
      drawString(this.buffer, `1. ${top1.name} ${top1.score.toLocaleString()}`, 10, 12, 3);
    }
    if (scores.length > 1) {
      const top2 = scores[1];
      drawString(this.buffer, `2. ${top2.name} ${top2.score.toLocaleString()}`, 10, 22, 2);
    }
  }

  renderGameHUD() {
    this.clear();
    // Top line: BALL number and core status
    drawString(this.buffer, `BALL ${this.ballNum}`, 2, 2, 2);
    drawString(this.buffer, 'WILLIAMS', 78, 2, 1);

    // Center/bottom: Large score display
    const formatted = this.score.toLocaleString('en-US');
    const scoreLen = formatted.length * 9;
    const startX = Math.max(2, Math.floor((128 - scoreLen) / 2));
    drawLargeScore(this.buffer, this.score, startX, 14, 3);
  }

  showMessage(line1, line2, duration = 1.8) {
    this.message = { line1, line2 };
    this.messageTimer = duration;
    this.messageDuration = duration;
  }

  showWarning(text) {
    this.showMessage('! DANGER !', text, 1.5);
  }

  showTilt() {
    this.mode = 'ANIMATION';
    this.animTimer = 3.0;
    this.currentAnim = (t) => {
      this.clear();
      const blink = Math.floor(t * 6) % 2 === 0;
      if (blink) {
        drawCenteredString(this.buffer, 'T I L T', 12, 3);
      }
    };
  }

  showBallSaved() {
    this.showMessage('BALL SAVED!', 'DON\'T PANIC', 1.6);
  }

  showBonus(bonus, callback) {
    this.mode = 'BONUS';
    this.animTimer = 3.5;
    this.animCallback = callback;
    this.currentAnim = (t) => {
      this.clear();
      drawCenteredString(this.buffer, 'CORE BONUS', 2, 2);
      drawString(this.buffer, `BASE:  ${bonus.base.toLocaleString()}`, 10, 11, 2);
      drawString(this.buffer, `MULT:  X${bonus.multiplier}`, 10, 19, 3);
      drawString(this.buffer, `TOTAL: ${bonus.total.toLocaleString()}`, 10, 26, 3);
    };
  }

  showInitialsEntry(hsManager) {
    this.mode = 'INITIALS';
    this.hsManager = hsManager;
  }

  updateInitials(hsManager) {
    this.hsManager = hsManager;
  }

  showGameOver(callback) {
    this.mode = 'ANIMATION';
    this.animTimer = 3.0;
    this.animCallback = callback;
    this.currentAnim = (t) => {
      this.clear();
      const blink = Math.floor(t * 4) % 2 === 0;
      drawCenteredString(this.buffer, 'GAME OVER', 10, blink ? 3 : 2);
      drawCenteredString(this.buffer, `FINAL: ${this.score.toLocaleString()}`, 22, 2);
    };
  }

  handleEvent(type, data) {
    switch (type) {
      case 'BALL_START':
        this.ballNum = data.ball;
        this.mode = 'GAME';
        this.showMessage(`BALL ${this.ballNum}`, 'GET READY', 1.8);
        break;

      case 'LOCK_1':
        this.showMessage('CONTAINMENT 1', 'BALL 1 LOCKED!', 2.0);
        break;

      case 'LOCK_2':
        this.showMessage('CONTAINMENT 2', 'BALL 2 LOCKED!', 2.0);
        break;

      case 'MULTIBALL_INTRO':
        this.mode = 'ANIMATION';
        this.animTimer = 3.0;
        this.currentAnim = (t) => {
          this.clear();
          const flash = Math.floor(t * 8) % 2 === 0;
          if (flash) {
            drawCenteredString(this.buffer, 'MELTDOWN!', 6, 3);
            drawCenteredString(this.buffer, '3-BALL MULTIBALL', 18, 3);
          } else {
            drawCenteredString(this.buffer, 'JACKPOTS LIT!', 12, 2);
          }
        };
        break;

      case 'JACKPOT':
        this.mode = 'ANIMATION';
        this.animTimer = 2.0;
        this.currentAnim = (t) => {
          this.clear();
          const flash = Math.floor(t * 10) % 2 === 0;
          drawCenteredString(this.buffer, data.source || 'RAMP', 4, 2);
          drawCenteredString(this.buffer, 'JACKPOT!', 14, flash ? 3 : 2);
          drawCenteredString(this.buffer, '1,000,000', 24, 3);
        };
        break;

      case 'SUPER_JACKPOT_LIT':
        this.showMessage('SUPER JACKPOT', 'SHOOT THE CORE!', 2.2);
        break;

      case 'SUPER_JACKPOT_COLLECTED':
        this.mode = 'ANIMATION';
        this.animTimer = 2.5;
        this.currentAnim = (t) => {
          this.clear();
          const flash = Math.floor(t * 12) % 2 === 0;
          drawCenteredString(this.buffer, 'SUPER JACKPOT!', 8, flash ? 3 : 2);
          drawCenteredString(this.buffer, '5,000,000 PTS', 20, 3);
        };
        break;

      case 'CORE_COOLED':
        this.showMessage('COOLANT RESTORED', `CORE TEMP: ${data.temp}%`, 1.8);
        break;

      case 'MULTIPLIER_ADVANCED':
        this.showMessage('C-O-R-E COMPLETE', `BONUS MULTIPLIER ${data.mult}X`, 1.8);
        break;

      case 'KICKBACK_SAVED':
        this.showMessage('MAGNETIC KICKBACK', 'CORE PROTECTED', 1.8);
        break;

      case 'MULTIBALL_TOTAL':
        this.showMessage('MULTIBALL TOTAL', data.score.toLocaleString(), 2.5);
        break;
    }
  }

  update(dt) {
    this.blinkTimer += dt;

    if (this.messageTimer > 0) {
      this.messageTimer -= dt;
      if (this.messageTimer <= 0) {
        this.message = null;
        if (this.mode === 'GAME') {
          this.renderGameHUD();
        }
      }
    }

    if (this.animTimer > 0) {
      this.animTimer -= dt;
      if (this.currentAnim) {
        this.currentAnim(this.animTimer);
      }
      if (this.animTimer <= 0) {
        this.currentAnim = null;
        if (this.animCallback) {
          const cb = this.animCallback;
          this.animCallback = null;
          cb();
        } else if (this.mode === 'GAME') {
          this.renderGameHUD();
        }
      }
    } else if (this.mode === 'GAME' && !this.message) {
      this.renderGameHUD();
    } else if (this.mode === 'INITIALS' && this.hsManager) {
      this.clear();
      drawCenteredString(this.buffer, 'NEW HIGH SCORE!', 2, 2);
      drawString(this.buffer, 'ENTER INITIALS:', 14, 12, 1);

      const inits = this.hsManager.initials;
      const cIdx = this.hsManager.currentIndex;
      const blink = Math.floor(this.blinkTimer * 4) % 2 === 0;

      for (let i = 0; i < 3; i++) {
        const char = inits[i];
        const isCurrent = i === cIdx;
        const bright = isCurrent ? (blink ? 3 : 0) : 2;
        drawChar(this.buffer, char, 64 + i * 14, 12, bright);
      }
      drawCenteredString(this.buffer, 'FLIPPERS=CHANGE  LAUNCH=SELECT', 24, 1);
    }

    // Overlay transient message if active
    if (this.message) {
      this.clear();
      if (this.message.line1) drawCenteredString(this.buffer, this.message.line1, 7, 3);
      if (this.message.line2) drawCenteredString(this.buffer, this.message.line2, 19, 2);
    }

    // Render buffer to canvas
    this.drawCanvas();
  }

  drawCanvas() {
    const ctx = this.ctx;
    const dotW = this.canvas.width / this.width;
    const dotH = this.canvas.height / this.height;
    const radius = Math.min(dotW, dotH) * 0.42;

    // Background fill
    ctx.fillStyle = '#0a0400';
    ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);

    for (let y = 0; y < this.height; y++) {
      for (let x = 0; x < this.width; x++) {
        const val = this.buffer[y * this.width + x];
        const cx = x * dotW + dotW / 2;
        const cy = y * dotH + dotH / 2;

        ctx.fillStyle = this.palette[val];
        ctx.beginPath();
        ctx.arc(cx, cy, radius, 0, Math.PI * 2);
        ctx.fill();

        // Extra bloom dot for max brightness
        if (val === 3) {
          ctx.fillStyle = 'rgba(255, 200, 80, 0.45)';
          ctx.beginPath();
          ctx.arc(cx, cy, radius * 1.5, 0, Math.PI * 2);
          ctx.fill();
        }
      }
    }
  }
}

