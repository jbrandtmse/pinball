// NOVA STRIKE — WebAudio synthesized sound. No audio assets.
// SFX are tiny oscillator/noise recipes; music is a lo-fi sequencer whose
// pattern depends on game state (attract / play / multiball / wizard).

export class Audio {
  constructor() {
    this.ctx = null;
    this.muted = false;
    this.musicState = 'off';
    this.seqTimer = null;
    this.step = 0;
  }

  ensure() {
    if (!this.ctx) {
      const AC = window.AudioContext || window.webkitAudioContext;
      if (!AC) return false;
      this.ctx = new AC();
      this.master = this.ctx.createGain();
      this.master.gain.value = 0.5;
      this.master.connect(this.ctx.destination);
      this.musicGain = this.ctx.createGain();
      this.musicGain.gain.value = 0.16;
      this.musicGain.connect(this.master);
      this._startMusic();
    }
    if (this.ctx.state === 'suspended') this.ctx.resume();
    return true;
  }

  toggleMute() {
    this.muted = !this.muted;
    if (this.master) this.master.gain.value = this.muted ? 0 : 0.5;
    return this.muted;
  }

  tone(freq, dur, { type = 'square', vol = 0.2, slide = 0, delay = 0 } = {}) {
    if (!this.ctx || this.muted) return;
    const t0 = this.ctx.currentTime + delay;
    const o = this.ctx.createOscillator();
    const g = this.ctx.createGain();
    o.type = type;
    o.frequency.setValueAtTime(freq, t0);
    if (slide) o.frequency.exponentialRampToValueAtTime(Math.max(20, freq + slide), t0 + dur);
    g.gain.setValueAtTime(vol, t0);
    g.gain.exponentialRampToValueAtTime(0.001, t0 + dur);
    o.connect(g); g.connect(this.master);
    o.start(t0); o.stop(t0 + dur + 0.02);
  }

  noise(dur, { vol = 0.25, freq = 1200, q = 1, delay = 0 } = {}) {
    if (!this.ctx || this.muted) return;
    const t0 = this.ctx.currentTime + delay;
    const len = Math.max(1, (dur * this.ctx.sampleRate) | 0);
    const buf = this.ctx.createBuffer(1, len, this.ctx.sampleRate);
    const d = buf.getChannelData(0);
    for (let i = 0; i < len; i++) d[i] = (Math.random() * 2 - 1) * (1 - i / len);
    const src = this.ctx.createBufferSource();
    src.buffer = buf;
    const f = this.ctx.createBiquadFilter();
    f.type = 'bandpass'; f.frequency.value = freq; f.Q.value = q;
    const g = this.ctx.createGain();
    g.gain.value = vol;
    src.connect(f); f.connect(g); g.connect(this.master);
    src.start(t0);
  }

  sfx(name) {
    if (!this.ensure()) return;
    switch (name) {
      case 'flip': this.noise(0.05, { vol: 0.18, freq: 900 }); break;
      case 'pop':
        this.tone(220, 0.09, { type: 'sine', vol: 0.5, slide: -160 });
        this.noise(0.06, { vol: 0.22, freq: 500 }); break;
      case 'sling': this.tone(330, 0.07, { vol: 0.3, slide: -120 }); break;
      case 'target': this.tone(520, 0.06, { vol: 0.25 }); this.tone(660, 0.06, { vol: 0.2, delay: 0.05 }); break;
      case 'lane': this.tone(880, 0.07, { vol: 0.2 }); break;
      case 'ramp': this.tone(300, 0.3, { vol: 0.25, slide: 700 }); break;
      case 'combo': [660, 880, 1100].forEach((f, i) => this.tone(f, 0.08, { vol: 0.25, delay: i * 0.06 })); break;
      case 'jackpot': [523, 659, 784, 1047, 1319].forEach((f, i) => this.tone(f, 0.12, { vol: 0.3, delay: i * 0.07 })); break;
      case 'saucer': this.tone(180, 0.15, { type: 'sine', vol: 0.4, slide: -80 }); break;
      case 'eject': this.noise(0.08, { vol: 0.3, freq: 700 }); this.tone(440, 0.08, { vol: 0.2, delay: 0.02 }); break;
      case 'lock': [392, 523].forEach((f, i) => this.tone(f, 0.12, { vol: 0.3, delay: i * 0.1 })); break;
      case 'multiball': [262, 330, 392, 523, 659, 784].forEach((f, i) => this.tone(f, 0.14, { vol: 0.3, delay: i * 0.08 })); break;
      case 'launch': this.noise(0.25, { vol: 0.3, freq: 400, q: 0.7 }); this.tone(120, 0.2, { type: 'sawtooth', vol: 0.2, slide: 180 }); break;
      case 'drain': this.tone(220, 0.5, { type: 'sawtooth', vol: 0.2, slide: -180 }); break;
      case 'saved': [523, 659, 784].forEach((f, i) => this.tone(f, 0.1, { vol: 0.25, delay: i * 0.07 })); break;
      case 'extraball': [784, 988, 1175, 1568].forEach((f, i) => this.tone(f, 0.14, { vol: 0.3, delay: i * 0.09 })); break;
      case 'skill': [988, 1319].forEach((f, i) => this.tone(f, 0.1, { vol: 0.28, delay: i * 0.08 })); break;
      case 'light': this.tone(1175, 0.09, { vol: 0.2 }); break;
      case 'kickback': this.noise(0.1, { vol: 0.35, freq: 600 }); this.tone(350, 0.12, { vol: 0.3, slide: 250 }); break;
      case 'mission': [440, 554, 659, 880].forEach((f, i) => this.tone(f, 0.1, { vol: 0.22, delay: i * 0.06 })); break;
      case 'complete': [659, 784, 988, 1319, 1568].forEach((f, i) => this.tone(f, 0.12, { vol: 0.28, delay: i * 0.07 })); break;
      case 'wizard': [262, 392, 523, 784, 1047, 1568].forEach((f, i) => this.tone(f, 0.16, { vol: 0.3, delay: i * 0.09 })); break;
      case 'nudge': this.noise(0.05, { vol: 0.15, freq: 300 }); break;
      case 'danger': this.tone(233, 0.15, { type: 'sawtooth', vol: 0.3 }); this.tone(233, 0.15, { type: 'sawtooth', vol: 0.3, delay: 0.2 }); break;
      case 'tilt': this.tone(110, 0.8, { type: 'sawtooth', vol: 0.35, slide: -60 }); break;
      case 'match': [523, 523, 784].forEach((f, i) => this.tone(f, 0.12, { vol: 0.25, delay: i * 0.12 })); break;
      case 'start': [392, 523, 659, 784].forEach((f, i) => this.tone(f, 0.1, { vol: 0.25, delay: i * 0.07 })); break;
      case 'coin': this.tone(988, 0.08, { vol: 0.25 }); this.tone(1319, 0.25, { vol: 0.25, delay: 0.08 }); break;
    }
  }

  music(state) {
    if (state === this.musicState && this.seqTimer) return;
    this.musicState = state;
    this._startMusic();
  }

  _startMusic() {
    if (this.seqTimer) { clearInterval(this.seqTimer); this.seqTimer = null; }
    const state = this.musicState;
    if (state === 'off' || !this.ctx) return;
    const patterns = {
      attract: { bpm: 90, notes: [220, 0, 262, 0, 330, 0, 262, 0, 220, 0, 196, 0, 220, 262, 0, 0] },
      play: { bpm: 132, notes: [110, 0, 110, 131, 110, 0, 98, 0, 110, 0, 110, 131, 147, 131, 110, 0] },
      multiball: { bpm: 150, notes: [110, 131, 110, 165, 110, 131, 196, 165, 110, 131, 110, 165, 220, 196, 165, 131] },
      wizard: { bpm: 140, notes: [131, 165, 196, 262, 131, 165, 196, 262, 147, 175, 220, 294, 165, 196, 247, 330] }
    };
    const p = patterns[state];
    if (!p) return;
    const interval = 60000 / p.bpm / 4;
    this.step = 0;
    this.seqTimer = setInterval(() => {
      if (this.muted || !this.ctx) return;
      const f = p.notes[this.step % p.notes.length];
      if (f) {
        const t0 = this.ctx.currentTime;
        const o = this.ctx.createOscillator();
        const g = this.ctx.createGain();
        o.type = this.step % 8 < 4 ? 'sawtooth' : 'square';
        o.frequency.value = f;
        g.gain.setValueAtTime(0.5, t0);
        g.gain.exponentialRampToValueAtTime(0.01, t0 + interval / 1000 * 0.9);
        o.connect(g); g.connect(this.musicGain);
        o.start(t0); o.stop(t0 + interval / 1000);
      }
      this.step++;
    }, interval);
  }
}
