/**
 * MusicPlayer - Williams DCS-style FM Synthesizer Music Engine
 * Plays procedural 90s pinball themes (Attract, Main Table, Multiball, High Score Fanfare).
 */
export class MusicPlayer {
  constructor(soundEngine) {
    this.soundEngine = soundEngine;
    this.currentTrack = 'NONE';
    this.isPlaying = false;
    this.step = 0;
    this.bpm = 124;
    this.timerId = null;
    this.bassNotes = [];
    this.leadNotes = [];
  }

  get ctx() {
    return this.soundEngine.ctx;
  }

  playAttractMusic() {
    this.stop();
    this.currentTrack = 'ATTRACT';
    this.bpm = 95;
    // Ambient sci-fi drone / chords
    this.bassNotes = [36, 36, 43, 41, 36, 38, 41, 43]; // MIDI note numbers
    this.leadNotes = [60, 63, 67, 70, 67, 65, 63, 60];
    this.startLoop();
  }

  playMainTheme() {
    this.stop();
    this.currentTrack = 'MAIN';
    this.bpm = 126;
    // Energetic driving Williams 90s bassline (like Terminator 2 / Attack from Mars)
    this.bassNotes = [38, 38, 41, 38, 43, 38, 45, 43, 38, 38, 41, 45, 46, 45, 41, 38];
    this.leadNotes = [62, 0, 65, 0, 67, 69, 67, 65, 62, 0, 70, 69, 67, 65, 67, 62];
    this.startLoop();
  }

  playMultiballMusic() {
    this.stop();
    this.currentTrack = 'MULTIBALL';
    this.bpm = 144;
    // Frantic Meltdown Multiball techno-rock groove
    this.bassNotes = [40, 40, 43, 40, 45, 40, 47, 48, 40, 40, 43, 45, 48, 47, 45, 43];
    this.leadNotes = [64, 67, 71, 72, 71, 67, 64, 0, 72, 71, 69, 67, 69, 71, 72, 76];
    this.startLoop();
  }

  playGameOverJingle() {
    this.stop();
    this.currentTrack = 'GAMEOVER';
    this.bpm = 110;
    this.bassNotes = [45, 43, 41, 38];
    this.leadNotes = [69, 67, 65, 62];
    this.startLoop();
    setTimeout(() => this.stop(), 3500);
  }

  startLoop() {
    if (!this.soundEngine.initialized) return;
    this.isPlaying = true;
    this.step = 0;
    const intervalMs = (60000 / this.bpm) / 4; // 16th notes

    const tick = () => {
      if (!this.isPlaying) return;
      this.playStep(this.step);
      this.step = (this.step + 1) % 16;
      this.timerId = setTimeout(tick, intervalMs);
    };
    tick();
  }

  playStep(step) {
    if (!this.ctx || this.soundEngine.isMuted) return;
    const t = this.ctx.currentTime;

    // Bass synthesizer
    const bassMidi = this.bassNotes[step % this.bassNotes.length];
    if (bassMidi > 0) {
      const freq = 440 * Math.pow(2, (bassMidi - 69) / 12);
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();
      osc.type = 'sawtooth';
      osc.frequency.setValueAtTime(freq, t);

      // Lowpass filter for punchy synth bass
      const filter = this.ctx.createBiquadFilter();
      filter.type = 'lowpass';
      filter.frequency.setValueAtTime(800, t);
      filter.frequency.exponentialRampToValueAtTime(180, t + 0.12);

      gain.gain.setValueAtTime(0.18, t);
      gain.gain.exponentialRampToValueAtTime(0.01, t + 0.14);

      osc.connect(filter);
      filter.connect(gain);
      gain.connect(this.soundEngine.masterGain);

      osc.start(t);
      osc.stop(t + 0.15);
    }

    // Lead synthesizer
    const leadMidi = this.leadNotes[step % this.leadNotes.length];
    if (leadMidi > 0) {
      const freq = 440 * Math.pow(2, (leadMidi - 69) / 12);
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();
      osc.type = 'square';
      osc.frequency.setValueAtTime(freq, t);

      gain.gain.setValueAtTime(0.12, t);
      gain.gain.exponentialRampToValueAtTime(0.01, t + 0.16);

      osc.connect(gain);
      gain.connect(this.soundEngine.masterGain);

      osc.start(t);
      osc.stop(t + 0.17);
    }

    // Hi-hat on every off-beat 16th
    if (step % 2 === 1 && this.currentTrack !== 'ATTRACT') {
      this.soundEngine.playNoise(0.02, 0.08, 7000);
    }
  }

  stop() {
    this.isPlaying = false;
    if (this.timerId) {
      clearTimeout(this.timerId);
      this.timerId = null;
    }
  }
}

