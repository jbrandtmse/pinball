import { PinballGame } from './game/PinballGame.js';
import { DMDDisplay } from './dmd/DMDDisplay.js';
import { SoundEngine } from './audio/SoundEngine.js';
import { MusicPlayer } from './audio/MusicPlayer.js';
import { VoiceCallouts } from './audio/VoiceCallouts.js';
import { TableView } from './visual/TableView.js';

/**
 * Main Application Bootstrap
 */
class App {
  constructor() {
    this.game = new PinballGame();
    this.sound = new SoundEngine();
    this.music = new MusicPlayer(this.sound);
    this.voice = new VoiceCallouts(this.sound);

    // DMD Canvases
    this.dmdHudCanvas = document.getElementById('dmd-canvas');
    this.dmd = new DMDDisplay(this.dmdHudCanvas);

    // Wire dependencies into PinballGame
    this.game.dmd = this.dmd;
    this.game.sound = this.sound;
    this.game.music = this.music;
    this.game.voice = this.voice;

    // 3D Three.js Viewport
    this.viewportContainer = document.getElementById('viewport-container');
    this.tableView = new TableView(this.viewportContainer, this.dmd.canvas, this.game.physicsWorld);
    this.game.tableView = this.tableView;

    // Timing
    this.lastTime = performance.now();
    this.isPaused = false;

    this.bindInputs();
    this.bindTouchControls();
    this.bindUI();

    // Start in Attract Mode
    this.music.playAttractMusic();

    // Begin Animation Loop
    requestAnimationFrame((t) => this.loop(t));
  }

  bindInputs() {
    const activeKeys = new Set();

    window.addEventListener('keydown', (e) => {
      // Audio unlock on user interaction
      this.sound.init();

      if (activeKeys.has(e.code)) return;
      activeKeys.add(e.code);

      switch (e.code) {
        // Left Flipper
        case 'ShiftLeft':
        case 'KeyZ':
        case 'KeyA':
          this.game.leftFlipperDown();
          e.preventDefault();
          break;

        // Right Flipper
        case 'ShiftRight':
        case 'Slash':
        case 'KeyD':
          this.game.rightFlipperDown();
          e.preventDefault();
          break;

        // Plunger Launch
        case 'Space':
        case 'ArrowDown':
        case 'Enter':
          this.game.plungerPull();
          e.preventDefault();
          break;

        // Nudges
        case 'KeyQ':
        case 'ArrowLeft':
          this.game.nudgeLeft();
          e.preventDefault();
          break;

        case 'KeyE':
        case 'ArrowRight':
          this.game.nudgeRight();
          e.preventDefault();
          break;

        case 'KeyW':
        case 'ArrowUp':
          this.game.nudgeUp();
          e.preventDefault();
          break;

        // Start Game
        case 'Digit1':
        case 'KeyS':
          if (this.game.state === 'ATTRACT' || this.game.state === 'GAME_OVER') {
            this.game.startGame();
          }
          break;

        // Camera Cycle
        case 'KeyC':
        case 'KeyV':
          this.tableView.cycleCamera();
          this.updateCameraLabel();
          break;

        // Mute Audio
        case 'KeyM':
          const muted = this.sound.toggleMute();
          const muteBtn = document.getElementById('btn-mute');
          if (muteBtn) muteBtn.textContent = muted ? 'UNMUTE (M)' : 'MUTE (M)';
          break;

        // Pause
        case 'KeyP':
        case 'Escape':
          this.isPaused = !this.isPaused;
          break;
      }
    });

    window.addEventListener('keyup', (e) => {
      activeKeys.delete(e.code);

      switch (e.code) {
        case 'ShiftLeft':
        case 'KeyZ':
        case 'KeyA':
          this.game.leftFlipperUp();
          break;

        case 'ShiftRight':
        case 'Slash':
        case 'KeyD':
          this.game.rightFlipperUp();
          break;

        case 'Space':
        case 'ArrowDown':
        case 'Enter':
          this.game.plungerRelease();
          break;
      }
    });
  }

  bindTouchControls() {
    const bindTouch = (btnId, onDown, onUp) => {
      const btn = document.getElementById(btnId);
      if (!btn) return;

      const down = (e) => {
        e.preventDefault();
        this.sound.init();
        onDown();
      };
      const up = (e) => {
        e.preventDefault();
        if (onUp) onUp();
      };

      btn.addEventListener('mousedown', down);
      btn.addEventListener('mouseup', up);
      btn.addEventListener('touchstart', down, { passive: false });
      btn.addEventListener('touchend', up, { passive: false });
    };

    bindTouch('touch-left-flipper', () => this.game.leftFlipperDown(), () => this.game.leftFlipperUp());
    bindTouch('touch-right-flipper', () => this.game.rightFlipperDown(), () => this.game.rightFlipperUp());
    bindTouch('touch-plunger', () => this.game.plungerPull(), () => this.game.plungerRelease());
    bindTouch('touch-nudge-left', () => this.game.nudgeLeft());
    bindTouch('touch-nudge-right', () => this.game.nudgeRight());
  }

  bindUI() {
    const startBtn = document.getElementById('btn-start');
    if (startBtn) {
      startBtn.addEventListener('click', () => {
        this.sound.init();
        this.game.startGame();
      });
    }

    const camBtn = document.getElementById('btn-camera');
    if (camBtn) {
      camBtn.addEventListener('click', () => {
        this.tableView.cycleCamera();
        this.updateCameraLabel();
      });
    }

    const muteBtn = document.getElementById('btn-mute');
    if (muteBtn) {
      muteBtn.addEventListener('click', () => {
        this.sound.init();
        const muted = this.sound.toggleMute();
        muteBtn.textContent = muted ? 'UNMUTE (M)' : 'MUTE (M)';
      });
    }

    const scoresBtn = document.getElementById('btn-highscores');
    const hsModal = document.getElementById('high-scores-modal');
    const closeHsBtn = document.getElementById('btn-close-scores');

    if (scoresBtn && hsModal) {
      scoresBtn.addEventListener('click', () => {
        this.renderHighScoresModal();
        hsModal.classList.remove('hidden');
      });
    }
    if (closeHsBtn && hsModal) {
      closeHsBtn.addEventListener('click', () => {
        hsModal.classList.add('hidden');
      });
    }
  }

  updateCameraLabel() {
    const lbl = document.getElementById('camera-mode-label');
    if (lbl) {
      lbl.textContent = `VIEW: ${this.tableView.currentViewMode}`;
    }
  }

  renderHighScoresModal() {
    const list = document.getElementById('high-scores-list');
    if (!list) return;
    list.innerHTML = '';

    const scores = this.game.highScores.highScores;
    scores.forEach((s, idx) => {
      const row = document.createElement('div');
      row.className = 'score-row';
      row.innerHTML = `
        <span class="rank">${idx + 1}.</span>
        <span class="initials">${s.name}</span>
        <span class="points">${s.score.toLocaleString()} PTS</span>
      `;
      list.appendChild(row);
    });
  }

  loop(currentTime) {
    requestAnimationFrame((t) => this.loop(t));

    const dt = Math.min(0.05, (currentTime - this.lastTime) / 1000.0);
    this.lastTime = currentTime;

    if (this.isPaused) return;

    // 1. Update Game Logic & Physics
    this.game.update(dt);

    // 2. Update DMD Display
    this.dmd.update(dt);

    // 3. Update 3D Table & Render Frame
    const rulesState = {
      coreLanes: this.game.rules.coreLanes,
      multiplier: this.game.rules.bonusMultiplier,
      isLockLit: this.game.rules.isLockLit,
      ballsLocked: this.game.rules.ballsLocked,
      leftJackpotLit: this.game.rules.leftJackpotLit,
      rightJackpotLit: this.game.rules.rightJackpotLit,
      superJackpotLit: this.game.rules.superJackpotLit,
      isKickbackLit: this.game.rules.isKickbackLit,
      isBallSaveActive: this.game.rules.isBallSaveActive,
      isMultiball: this.game.rules.isMultiball
    };

    this.tableView.update(dt, rulesState, this.game.shakeOffset);

    // 4. Update Quick HUD stats
    this.updateHUDStats();
  }

  updateHUDStats() {
    const scoreEl = document.getElementById('hud-score');
    if (scoreEl) scoreEl.textContent = this.game.rules.score.toLocaleString();

    const ballEl = document.getElementById('hud-ball');
    if (ballEl) ballEl.textContent = `BALL ${this.game.currentBallNum}`;

    const tempEl = document.getElementById('hud-temp');
    if (tempEl) tempEl.textContent = `CORE: ${this.game.rules.coreTemp}%`;

    const multEl = document.getElementById('hud-mult');
    if (multEl) multEl.textContent = `${this.game.rules.bonusMultiplier}X`;
  }
}

window.addEventListener('DOMContentLoaded', () => {
  window.app = new App();
});

