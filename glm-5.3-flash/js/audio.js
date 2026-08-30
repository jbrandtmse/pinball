/* =========================================================================
   RISE OF ATLANTIS — audio.js
   Web Audio synthesizer: switch SFX + state music loops. Browser-only.
   ========================================================================= */
(function (root) {
  'use strict';

  function Audio() {
    this.ok = false;
    this.muted = false;
    this.ctx = null;
    this.music = null;   // current loop name
    this._mtimer = null;
  }

  Audio.prototype.init = function () {
    if (this.ctx) return;
    const AC = root.AudioContext || root.webkitAudioContext;
    if (!AC) return;
    this.ctx = new AC();
    this.master = this.ctx.createGain();
    this.master.gain.value = 0.5;
    this.master.connect(this.ctx.destination);
    this.ok = true;
  };

  Audio.prototype.resume = function () {
    if (this.ctx && this.ctx.state === 'suspended') this.ctx.resume();
  };

  Audio.prototype.toggleMute = function () {
    this.muted = !this.muted;
    if (this.master) this.master.gain.value = this.muted ? 0 : 0.5;
    return this.muted;
  };

  // ---- primitive voices -----------------------------------------------------
  Audio.prototype.tone = function (type, f0, f1, dur, vol, delay) {
    if (!this.ok || this.muted) return;
    const t0 = this.ctx.currentTime + (delay || 0);
    const o = this.ctx.createOscillator();
    const g = this.ctx.createGain();
    o.type = type;
    o.frequency.setValueAtTime(f0, t0);
    if (f1 && f1 !== f0) o.frequency.exponentialRampToValueAtTime(Math.max(1, f1), t0 + dur);
    g.gain.setValueAtTime(vol, t0);
    g.gain.exponentialRampToValueAtTime(0.001, t0 + dur);
    o.connect(g); g.connect(this.master);
    o.start(t0); o.stop(t0 + dur + 0.02);
  };

  Audio.prototype.noise = function (dur, vol, freq, q, delay) {
    if (!this.ok || this.muted) return;
    const t0 = this.ctx.currentTime + (delay || 0);
    const len = Math.max(1, Math.floor(this.ctx.sampleRate * dur));
    const buf = this.ctx.createBuffer(1, len, this.ctx.sampleRate);
    const d = buf.getChannelData(0);
    for (let i = 0; i < len; i++) d[i] = Math.random() * 2 - 1;
    const src = this.ctx.createBufferSource();
    src.buffer = buf;
    const f = this.ctx.createBiquadFilter();
    f.type = 'bandpass';
    f.frequency.value = freq || 800;
    f.Q.value = q || 1;
    const g = this.ctx.createGain();
    g.gain.setValueAtTime(vol, t0);
    g.gain.exponentialRampToValueAtTime(0.001, t0 + dur);
    src.connect(f); f.connect(g); g.connect(this.master);
    src.start(t0);
  };

  // ---- named SFX ------------------------------------------------------------
  const SFX = {
    flipperUp: (a) => { a.tone('square', 160, 60, 0.06, 0.25); a.noise(0.04, 0.15, 900, 1); },
    flipperDn: (a) => a.tone('square', 90, 40, 0.05, 0.12),
    sling: (a) => { a.tone('square', 300, 90, 0.09, 0.3); a.noise(0.06, 0.2, 1400, 1); },
    bumper: (a) => { a.tone('square', 190, 60, 0.09, 0.34); a.noise(0.05, 0.25, 600, 0.8); },
    rollover: (a) => a.tone('sine', 880, 1320, 0.09, 0.2),
    target: (a) => { a.tone('square', 420, 180, 0.08, 0.28); a.noise(0.03, 0.18, 2000, 1); },
    spinner: (a) => a.tone('sine', 1400, 2400, 0.05, 0.12),
    launch: (a) => { a.tone('sawtooth', 120, 480, 0.3, 0.3); a.noise(0.25, 0.2, 500, 0.7); },
    ramp: (a) => { a.tone('sine', 300, 900, 0.22, 0.22); },
    orbit: (a) => { a.tone('sine', 500, 1100, 0.16, 0.2); },
    bank: (a) => { [440, 554, 659, 880].forEach((f, i) => a.tone('square', f, f, 0.12, 0.22, i * 0.09)); },
    lock: (a) => { a.tone('sawtooth', 200, 400, 0.25, 0.28); a.tone('sawtooth', 300, 600, 0.25, 0.2, 0.12); },
    mbStart: (a) => { for (let i = 0; i < 6; i++) a.tone('sawtooth', 220 + i * 60, 220 + i * 60, 0.14, 0.26, i * 0.11); a.noise(0.6, 0.22, 300, 0.6, 0.1); },
    jackpot: (a) => { [523, 659, 784, 1046].forEach((f, i) => a.tone('square', f, f, 0.15, 0.26, i * 0.08)); },
    super: (a) => { [523, 659, 784, 1046, 1318, 1568].forEach((f, i) => a.tone('square', f, f, 0.17, 0.28, i * 0.09)); },
    skill: (a) => { a.tone('sine', 660, 1980, 0.3, 0.26); },
    combo: (a) => { a.tone('square', 700, 1400, 0.12, 0.24); a.tone('square', 1050, 2100, 0.12, 0.18, 0.07); },
    modeStart: (a) => { [330, 415, 494, 659].forEach((f, i) => a.tone('triangle', f, f, 0.16, 0.24, i * 0.1)); },
    modeDone: (a) => { [659, 784, 988, 1318].forEach((f, i) => a.tone('square', f, f, 0.15, 0.24, i * 0.09)); },
    modeFail: (a) => { a.tone('sawtooth', 300, 80, 0.5, 0.26); },
    furyLit: (a) => { [220, 330, 440, 660].forEach((f, i) => a.tone('sawtooth', f, f * 1.5, 0.3, 0.22, i * 0.14)); },
    fury: (a) => { a.noise(1.2, 0.3, 180, 0.5); [110, 165, 220].forEach((f, i) => a.tone('sawtooth', f, f * 2, 0.9, 0.24, i * 0.2)); },
    gift: (a) => { a.tone('triangle', 523, 1046, 0.35, 0.26); a.tone('triangle', 784, 1568, 0.35, 0.18, 0.12); },
    save: (a) => { a.tone('square', 440, 880, 0.2, 0.26); a.tone('square', 554, 1108, 0.2, 0.2, 0.12); },
    eb: (a) => { [880, 1174, 1568].forEach((f, i) => a.tone('sine', f, f, 0.2, 0.26, i * 0.12)); },
    ebLit: (a) => { a.tone('sine', 988, 988, 0.15, 0.24); a.tone('sine', 1318, 1318, 0.22, 0.22, 0.13); },
    tilt: (a) => { a.tone('sawtooth', 160, 40, 0.9, 0.32); a.noise(0.5, 0.25, 200, 0.5); },
    nudge: (a) => a.noise(0.08, 0.3, 300, 0.8),
    kickback: (a) => { a.tone('square', 150, 500, 0.2, 0.3); a.noise(0.12, 0.25, 900, 0.8); },
    eject: (a) => { a.tone('square', 260, 520, 0.14, 0.26); },
    saucer: (a) => { a.tone('sine', 700, 350, 0.25, 0.22); },
    surge: (a) => { a.noise(0.5, 0.3, 250, 0.5); a.tone('sawtooth', 80, 160, 0.5, 0.26); },
    tide: (a) => { [392, 494, 587].forEach((f, i) => a.tone('sine', f, f, 0.14, 0.22, i * 0.08)); },
    bonusTick: (a) => a.tone('square', 1200, 1200, 0.045, 0.16),
    bonusStart: (a) => a.tone('triangle', 500, 1000, 0.2, 0.2),
    addPlayer: (a) => { a.tone('square', 523, 784, 0.16, 0.22); },
    gameover: (a) => { [523, 466, 415, 349].forEach((f, i) => a.tone('sawtooth', f, f, 0.3, 0.24, i * 0.22)); },
    city: (a) => { [262, 330, 392, 523, 659, 784, 1046].forEach((f, i) => a.tone('triangle', f, f, 0.3, 0.26, i * 0.13)); },
    drain: (a) => { a.tone('sine', 300, 80, 0.3, 0.2); },
    plunger: (a) => a.noise(0.06, 0.2, 500, 1),
    hiscore: (a) => { [523, 659, 784, 1046, 1318].forEach((f, i) => a.tone('square', f, f, 0.2, 0.26, i * 0.13)); },
  };

  Audio.prototype.sfx = function (name) {
    const fn = SFX[name];
    if (fn) fn(this);
  };

  // ---- music loops (simple step sequencer) -----------------------------------
  // patterns: bass notes (freq or 0) at 8th-note steps
  const LOOPS = {
    attract: { bpm: 96, bass: [110, 0, 110, 0, 98, 0, 98, 0, 87, 0, 87, 0, 98, 0, 110, 0], lead: [440, 0, 392, 0, 349, 392, 0, 0, 330, 0, 392, 0, 440, 0, 0, 0] },
    play: { bpm: 112, bass: [82, 0, 82, 110, 82, 0, 98, 0, 87, 0, 87, 116, 87, 0, 98, 0], lead: [] },
    mb: { bpm: 140, bass: [110, 110, 104, 104, 98, 98, 92, 92, 87, 87, 92, 92, 98, 98, 104, 104], lead: [880, 0, 830, 0, 784, 0, 740, 0, 698, 0, 740, 0, 784, 0, 830, 0] },
    mode: { bpm: 126, bass: [98, 0, 116, 0, 98, 0, 116, 0, 110, 0, 131, 0, 110, 0, 131, 0], lead: [784, 0, 932, 0, 784, 0, 932, 0, 880, 0, 1046, 0, 880, 0, 1046, 0] },
  };

  Audio.prototype.playMusic = function (name) {
    if (this.music === name) return;
    this.stopMusic();
    this.music = name;
    if (!name || !this.ok || this.muted) return;
    const loop = LOOPS[name];
    if (!loop) return;
    const stepDur = 30 / loop.bpm; // eighth notes
    let step = 0;
    const tick = () => {
      if (this.music !== name || this.muted) return;
      const b = loop.bass[step % loop.bass.length];
      if (b) this.tone('sawtooth', b, b, stepDur * 0.9, 0.07);
      const l = loop.lead && loop.lead[step % loop.lead.length];
      if (l) this.tone('square', l, l, stepDur * 0.55, 0.045);
      step++;
      this._mtimer = setTimeout(tick, stepDur * 1000);
    };
    tick();
  };

  Audio.prototype.stopMusic = function () {
    this.music = null;
    if (this._mtimer) { clearTimeout(this._mtimer); this._mtimer = null; }
  };

  root.AR_AUDIO = Audio;
})(typeof window !== 'undefined' ? window : globalThis);
