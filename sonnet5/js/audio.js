// All sound effects are synthesized in real time with the WebAudio API -- no external
// audio files. Every method degrades silently if the context isn't ready yet or audio
// is muted, so callers never need to guard their calls.
class AudioEngine {
  constructor() {
    this.ctx = null;
    this.master = null;
    this.muted = false;
  }

  init() {
    if (this.ctx) return;
    const Ctx = window.AudioContext || window.webkitAudioContext;
    if (!Ctx) return;
    this.ctx = new Ctx();
    this.master = this.ctx.createGain();
    this.master.gain.value = this.muted ? 0 : 0.7;
    this.master.connect(this.ctx.destination);
  }

  resume() {
    if (!this.ctx) this.init();
    if (this.ctx && this.ctx.state === 'suspended') this.ctx.resume();
  }

  setMuted(m) {
    this.muted = m;
    if (this.master) this.master.gain.setTargetAtTime(m ? 0 : 0.7, this.ctx.currentTime, 0.05);
  }

  get ready() { return !!this.ctx && !this.muted; }
  now() { return this.ctx.currentTime; }

  _envelope(gain, { when = 0, attack = 0.005, decay = 0.1, sustain = 0.3, duration = 0.15, peak = 0.5 }) {
    const t0 = this.now() + when;
    gain.gain.cancelScheduledValues(t0);
    gain.gain.setValueAtTime(0.0001, t0);
    gain.gain.exponentialRampToValueAtTime(Math.max(0.0002, peak), t0 + attack);
    gain.gain.exponentialRampToValueAtTime(Math.max(0.0002, peak * sustain), t0 + attack + decay);
    gain.gain.exponentialRampToValueAtTime(0.0001, t0 + duration);
  }

  tone(freq, duration = 0.15, opts = {}) {
    if (!this.ready) return;
    const t0 = this.now() + (opts.when || 0);
    const osc = this.ctx.createOscillator();
    osc.type = opts.type || 'square';
    osc.frequency.setValueAtTime(freq, t0);
    if (opts.freqEnd) osc.frequency.exponentialRampToValueAtTime(Math.max(1, opts.freqEnd), t0 + duration);
    const gain = this.ctx.createGain();
    osc.connect(gain).connect(this.master);
    this._envelope(gain, { when: opts.when || 0, attack: opts.attack ?? 0.004, decay: duration * 0.35, sustain: opts.sustain ?? 0.25, duration, peak: opts.vol ?? 0.4 });
    osc.start(t0);
    osc.stop(t0 + duration + 0.05);
    return osc;
  }

  noiseBurst(duration = 0.12, opts = {}) {
    if (!this.ready) return;
    const t0 = this.now() + (opts.when || 0);
    const bufferSize = Math.max(1, Math.floor(this.ctx.sampleRate * duration));
    const buffer = this.ctx.createBuffer(1, bufferSize, this.ctx.sampleRate);
    const data = buffer.getChannelData(0);
    for (let i = 0; i < bufferSize; i++) data[i] = Math.random() * 2 - 1;
    const src = this.ctx.createBufferSource();
    src.buffer = buffer;
    const filter = this.ctx.createBiquadFilter();
    filter.type = opts.filterType || 'bandpass';
    filter.frequency.setValueAtTime(opts.filterFreq ?? 1200, t0);
    if (opts.filterFreqEnd) filter.frequency.exponentialRampToValueAtTime(Math.max(30, opts.filterFreqEnd), t0 + duration);
    filter.Q.value = opts.Q ?? 0.9;
    const gain = this.ctx.createGain();
    src.connect(filter).connect(gain).connect(this.master);
    this._envelope(gain, { when: opts.when || 0, attack: 0.002, decay: duration * 0.4, sustain: 0.12, duration, peak: opts.vol ?? 0.4 });
    src.start(t0);
    src.stop(t0 + duration + 0.02);
  }

  sequence(notes) { // [{freq,duration,delay,type,vol}]
    let t = 0;
    for (const n of notes) {
      this.tone(n.freq, n.duration ?? 0.12, { when: t, type: n.type || 'square', vol: n.vol ?? 0.4 });
      t += n.delay ?? (n.duration ?? 0.12) * 0.9;
    }
  }

  // ---------------------------------------------------------------- named SFX
  flipper() {
    this.noiseBurst(0.045, { filterType: 'highpass', filterFreq: 2600, vol: 0.3 });
    this.tone(1900, 0.03, { type: 'square', vol: 0.12 });
  }
  bumper() {
    this.tone(560, 0.11, { type: 'triangle', freqEnd: 260, vol: 0.55 });
    this.noiseBurst(0.05, { filterFreq: 1900, vol: 0.25 });
  }
  sling() {
    this.tone(700, 0.09, { type: 'sawtooth', freqEnd: 220, vol: 0.5 });
    this.noiseBurst(0.04, { filterFreq: 2200, vol: 0.2 });
  }
  target() {
    this.tone(920, 0.07, { type: 'square', vol: 0.32 });
  }
  goldTarget() {
    this.tone(1100, 0.05, { type: 'square', vol: 0.35 });
    this.tone(1500, 0.08, { type: 'square', vol: 0.3, when: 0.05 });
  }
  dropTarget() {
    this.tone(190, 0.14, { type: 'square', freqEnd: 85, vol: 0.5 });
    this.noiseBurst(0.09, { filterFreq: 350, filterType: 'lowpass', vol: 0.4 });
  }
  bankComplete() {
    this.sequence([{ freq: 440, duration: 0.08 }, { freq: 554, duration: 0.08 }, { freq: 659, duration: 0.16 }]);
  }
  spinner() {
    this.tone(1400, 0.03, { type: 'square', vol: 0.14 });
  }
  rampEnter() {
    this.noiseSweep(0.4, 500, 2600, 0.28);
  }
  rampExit() {
    this.tone(1200, 0.08, { type: 'square', vol: 0.25 });
  }
  noiseSweep(duration, startFreq, endFreq, vol = 0.3) {
    this.noiseBurst(duration, { filterType: 'bandpass', filterFreq: startFreq, filterFreqEnd: endFreq, Q: 1.4, vol });
  }
  lock() {
    this.noiseBurst(0.06, { filterFreq: 500, filterType: 'lowpass', vol: 0.4 });
    this.tone(300, 0.12, { type: 'square', freqEnd: 500, vol: 0.3, when: 0.05 });
  }
  kickback() {
    this.noiseBurst(0.05, { filterFreq: 2000, vol: 0.4 });
    this.tone(200, 0.1, { type: 'sawtooth', freqEnd: 700, vol: 0.4 });
  }
  scoopKick() {
    this.tone(250, 0.14, { type: 'sine', freqEnd: 600, vol: 0.4 });
  }
  launch(power = 1) {
    this.noiseSweep(0.18 + power * 0.1, 150, 900 + power * 800, 0.3);
    this.tone(120, 0.12, { type: 'sine', freqEnd: 340 + power * 300, vol: 0.25, when: 0.05 });
  }
  multiballStart() {
    this.sequence([
      { freq: 392, duration: 0.1, type: 'square', vol: 0.5 },
      { freq: 494, duration: 0.1, type: 'square', vol: 0.5 },
      { freq: 587, duration: 0.1, type: 'square', vol: 0.5 },
      { freq: 784, duration: 0.32, type: 'square', vol: 0.6 },
    ]);
    this.noiseBurst(0.5, { filterFreq: 1500, filterFreqEnd: 200, vol: 0.35 });
  }
  jackpot() {
    this.sequence([
      { freq: 523, duration: 0.08, type: 'square', vol: 0.5 },
      { freq: 659, duration: 0.08, type: 'square', vol: 0.5 },
      { freq: 784, duration: 0.08, type: 'square', vol: 0.5 },
      { freq: 1047, duration: 0.22, type: 'square', vol: 0.55 },
    ]);
  }
  superJackpot() {
    this.sequence([
      { freq: 523, duration: 0.09, type: 'sawtooth', vol: 0.5 },
      { freq: 659, duration: 0.09, type: 'sawtooth', vol: 0.5 },
      { freq: 784, duration: 0.09, type: 'sawtooth', vol: 0.5 },
      { freq: 1047, duration: 0.09, type: 'sawtooth', vol: 0.55 },
      { freq: 1319, duration: 0.4, type: 'sawtooth', vol: 0.6 },
    ]);
  }
  drain() {
    this.tone(320, 0.35, { type: 'sine', freqEnd: 60, vol: 0.35 });
  }
  tilt() {
    this.tone(120, 0.6, { type: 'sawtooth', vol: 0.4 });
    this.tone(124, 0.6, { type: 'sawtooth', vol: 0.3 });
  }
  tiltWarning() {
    this.tone(700, 0.09, { type: 'square', vol: 0.3 });
  }
  extraBall() {
    this.sequence([{ freq: 660, duration: 0.09 }, { freq: 880, duration: 0.09 }, { freq: 660, duration: 0.09 }, { freq: 990, duration: 0.28 }]);
  }
  newHighScore() {
    this.sequence([
      { freq: 523, duration: 0.1 }, { freq: 659, duration: 0.1 }, { freq: 784, duration: 0.1 },
      { freq: 1047, duration: 0.1 }, { freq: 1319, duration: 0.42 },
    ]);
  }
  matchFanfare() {
    this.sequence([{ freq: 440, duration: 0.1 }, { freq: 440, duration: 0.1 }, { freq: 440, duration: 0.3 }]);
  }
  ballSave() {
    this.tone(880, 0.06, { type: 'square', vol: 0.3 });
    this.tone(1180, 0.1, { type: 'square', vol: 0.32, when: 0.06 });
  }
  uiMove() { this.tone(300, 0.04, { type: 'square', vol: 0.18 }); }
  uiSelect() { this.tone(700, 0.07, { type: 'square', vol: 0.3 }); }
  gameStart() {
    this.sequence([{ freq: 262, duration: 0.08 }, { freq: 330, duration: 0.08 }, { freq: 392, duration: 0.08 }, { freq: 523, duration: 0.25 }]);
  }
  ballOver() {
    this.tone(400, 0.25, { type: 'triangle', freqEnd: 200, vol: 0.3 });
  }
  gameOver() {
    this.sequence([{ freq: 392, duration: 0.2 }, { freq: 330, duration: 0.2 }, { freq: 262, duration: 0.5 }]);
  }
}

const SFX = new AudioEngine();
