// Synthesised audio: mechanical sounds, scoring sounds and a procedural
// noir-jazz / spy soundtrack. Everything is generated with WebAudio.

const NOTE = (n) => 440 * Math.pow(2, (n - 69) / 12);

export class Sound {
  constructor() {
    this.ctx = null;
    this.enabled = true;
    this.musicOn = true;
    this.speechOn = true;
    this.track = null;
    this.rollLevel = 0; this.rampLevel = 0;
  }

  // Must be called from a user gesture (keydown/click)
  unlock() {
    if (this.ctx) { if (this.ctx.state === 'suspended') this.ctx.resume(); return; }
    const AC = window.AudioContext || window.webkitAudioContext;
    if (!AC) return;
    const c = this.ctx = new AC();
    this.comp = c.createDynamicsCompressor();
    this.comp.threshold.value = -14; this.comp.ratio.value = 4;
    this.master = c.createGain(); this.master.gain.value = 0.9;
    this.sfxBus = c.createGain(); this.sfxBus.gain.value = 0.8;
    this.musicBus = c.createGain(); this.musicBus.gain.value = 0.33;
    this.sfxBus.connect(this.comp); this.musicBus.connect(this.comp);
    this.comp.connect(this.master); this.master.connect(c.destination);
    // shared noise buffer
    const len = c.sampleRate * 2;
    this.noise = c.createBuffer(1, len, c.sampleRate);
    const d = this.noise.getChannelData(0);
    for (let i = 0; i < len; i++) d[i] = Math.random() * 2 - 1;
    // reverb (short room) for music and big sounds
    this.reverb = c.createConvolver();
    const irLen = c.sampleRate * 1.6, ir = c.createBuffer(2, irLen, c.sampleRate);
    for (let ch = 0; ch < 2; ch++) { const b = ir.getChannelData(ch); for (let i = 0; i < irLen; i++) b[i] = (Math.random() * 2 - 1) * Math.pow(1 - i / irLen, 3); }
    this.reverb.buffer = ir;
    this.revGain = c.createGain(); this.revGain.gain.value = 0.22;
    this.reverb.connect(this.revGain); this.revGain.connect(this.comp);
    // continuous rolling sounds
    this.roll = this.makeLoopNoise(300, 0.7);
    this.ramp = this.makeLoopNoise(1800, 2.5);
    this.startSequencer();
    if (this.pendingTrack !== undefined) this.music(this.pendingTrack);
  }

  makeLoopNoise(freq, q) {
    const c = this.ctx;
    const src = c.createBufferSource(); src.buffer = this.noise; src.loop = true;
    const f = c.createBiquadFilter(); f.type = 'bandpass'; f.frequency.value = freq; f.Q.value = q;
    const g = c.createGain(); g.gain.value = 0;
    src.connect(f); f.connect(g); g.connect(this.sfxBus); src.start();
    return { f, g, base: freq };
  }

  setRolling(speed, onRamp) {
    if (!this.ctx || !this.enabled) return;
    const t = this.ctx.currentTime;
    const a = Math.min(1, speed / 220);
    this.roll.g.gain.setTargetAtTime(a * a * 0.22, t, 0.05);
    this.roll.f.frequency.setTargetAtTime(150 + a * 600, t, 0.05);
    const r = Math.min(1, onRamp / 150);
    this.ramp.g.gain.setTargetAtTime(r * 0.12, t, 0.04);
    this.ramp.f.frequency.setTargetAtTime(1200 + r * 1600, t, 0.05);
  }

  // ------------------------------------------------------------ primitives
  env(g, t, a, d, peak) {
    g.gain.setValueAtTime(0.0001, t);
    g.gain.linearRampToValueAtTime(peak, t + a);
    g.gain.exponentialRampToValueAtTime(0.0001, t + a + d);
  }
  tone(freq, dur, { type = 'sine', vol = 0.3, attack = 0.004, t0 = 0, glide = null, bus = null, filter = null, rev = 0 } = {}) {
    const c = this.ctx, t = c.currentTime + t0;
    const o = c.createOscillator(); o.type = type; o.frequency.setValueAtTime(freq, t);
    if (glide) o.frequency.exponentialRampToValueAtTime(glide, t + dur);
    const g = c.createGain(); this.env(g, t, attack, dur, vol);
    let node = o;
    if (filter) { const f = c.createBiquadFilter(); f.type = filter.type || 'lowpass'; f.frequency.value = filter.f; f.Q.value = filter.q || 0.7; o.connect(f); node = f; }
    node.connect(g); g.connect(bus || this.sfxBus);
    if (rev) { const rg = c.createGain(); rg.gain.value = rev; g.connect(rg); rg.connect(this.reverb); }
    o.start(t); o.stop(t + attack + dur + 0.05);
  }
  noiseHit(dur, { f = 1000, q = 1, type = 'bandpass', vol = 0.3, t0 = 0, sweep = null, bus = null, attack = 0.001, rev = 0 } = {}) {
    const c = this.ctx, t = c.currentTime + t0;
    const s = c.createBufferSource(); s.buffer = this.noise;
    s.playbackRate.value = 0.8 + Math.random() * 0.4;
    const fl = c.createBiquadFilter(); fl.type = type; fl.frequency.setValueAtTime(f, t); fl.Q.value = q;
    if (sweep) fl.frequency.exponentialRampToValueAtTime(sweep, t + dur);
    const g = c.createGain(); this.env(g, t, attack, dur, vol);
    s.connect(fl); fl.connect(g); g.connect(bus || this.sfxBus);
    if (rev) { const rg = c.createGain(); rg.gain.value = rev; g.connect(rg); rg.connect(this.reverb); }
    s.start(t, Math.random() * 1.5); s.stop(t + dur + attack + 0.05);
  }
  chord(notes, dur, opts = {}) { notes.forEach((n, i) => this.tone(NOTE(n), dur, { ...opts, t0: (opts.t0 || 0) + (opts.strum || 0) * i })); }
  arp(notes, step, dur, opts = {}) { notes.forEach((n, i) => this.tone(NOTE(n), dur, { ...opts, t0: (opts.t0 || 0) + i * step })); }

  // ------------------------------------------------------------ sfx table
  play(name, info = {}) {
    if (!this.ctx || !this.enabled) return;
    const s = this;
    switch (name) {
      // --- mechanical
      case 'flipperUp': s.noiseHit(0.05, { f: 900, q: 0.8, vol: 0.35 }); s.tone(90, 0.06, { vol: 0.35, glide: 50 }); break;
      case 'flipperDown': s.noiseHit(0.03, { f: 1400, q: 1, vol: 0.12 }); break;
      case 'flipperHit': s.noiseHit(0.03, { f: 2200, q: 1.5, vol: Math.min(0.3, (info.speed || 50) / 400) }); break;
      case 'thud': s.noiseHit(0.035, { f: info.mat === 'metal' ? 3200 : 1100, q: 2, vol: Math.min(0.28, (info.speed || 30) / 500) }); break;
      case 'clack': s.tone(2600, 0.02, { vol: Math.min(0.3, (info.speed || 30) / 300), type: 'triangle' }); s.noiseHit(0.02, { f: 4000, q: 3, vol: 0.12 }); break;
      case 'mechPop': s.tone(140, 0.09, { vol: 0.5, glide: 45 }); s.noiseHit(0.05, { f: 700, vol: 0.4 }); break;
      case 'mechSling': s.tone(110, 0.07, { vol: 0.45, glide: 55 }); s.noiseHit(0.04, { f: 1600, vol: 0.3 }); break;
      case 'dropDown': s.noiseHit(0.05, { f: 2000, q: 2, vol: 0.35 }); break;
      case 'dropReset': s.noiseHit(0.08, { f: 700, q: 1, vol: 0.45 }); s.tone(80, 0.1, { vol: 0.4 }); break;
      case 'capture': s.tone(70, 0.15, { vol: 0.4, glide: 40 }); s.noiseHit(0.1, { f: 400, vol: 0.3 }); break;
      case 'eject': case 'vuk': case 'vaultKick': s.tone(100, 0.1, { vol: 0.55, glide: 40 }); s.noiseHit(0.08, { f: 900, vol: 0.45 }); break;
      case 'autoLaunch': case 'plunge': s.noiseHit(0.12, { f: 600, q: 0.6, vol: 0.5 }); s.tone(120, 0.08, { vol: 0.4, glide: 60 }); break;
      case 'plungerPull': s.noiseHit(0.25, { f: 3000, q: 4, vol: 0.05, sweep: 1500 }); break;
      case 'gate': s.tone(1800, 0.03, { vol: 0.08, type: 'triangle' }); break;
      case 'doorOpenMech': case 'doorCloseMech': s.noiseHit(0.35, { f: 300, q: 2, vol: 0.35, sweep: 150 }); s.tone(60, 0.3, { vol: 0.3, type: 'sawtooth', filter: { f: 300 } }); break;
      case 'ballServe': s.noiseHit(0.15, { f: 500, vol: 0.25 }); break;
      case 'kickbackMech': s.tone(90, 0.12, { vol: 0.6, glide: 40 }); s.noiseHit(0.08, { f: 700, vol: 0.5 }); break;
      // --- scoring
      case 'pop': s.tone(NOTE(74 + Math.floor(Math.random() * 3) * 5), 0.12, { type: 'square', vol: 0.07, filter: { f: 2500 } }); break;
      case 'sling': s.tone(NOTE(62), 0.08, { type: 'square', vol: 0.05, filter: { f: 1800 } }); break;
      case 'rollover': s.tone(1400, 0.05, { vol: 0.08, type: 'triangle' }); break;
      case 'laneLit': s.arp([79, 84], 0.05, 0.1, { type: 'square', vol: 0.06, filter: { f: 3000 } }); break;
      case 'keyComplete': s.arp([74, 78, 81, 86], 0.06, 0.18, { type: 'square', vol: 0.08, filter: { f: 3500 }, rev: 0.3 }); break;
      case 'inlane': s.tone(NOTE(81), 0.06, { vol: 0.06, type: 'triangle' }); break;
      case 'outlane': s.tone(NOTE(50), 0.35, { vol: 0.12, type: 'sawtooth', glide: NOTE(43), filter: { f: 900 } }); break;
      case 'spinner': s.noiseHit(0.012, { f: 5000, q: 4, vol: 0.12 }); s.tone(2000 + Math.random() * 300, 0.02, { vol: 0.03, type: 'square' }); break;
      case 'standup': s.tone(NOTE(76), 0.08, { vol: 0.08, type: 'square', filter: { f: 2000 } }); break;
      case 'orbit': s.noiseHit(0.35, { f: 500, sweep: 3000, q: 2, vol: 0.12 }); s.arp([69, 76], 0.08, 0.12, { vol: 0.05, type: 'square', filter: { f: 2000 } }); break;
      case 'rampEnter': s.noiseHit(0.3, { f: 400, sweep: 2500, q: 1.5, vol: 0.08 }); break;
      case 'rampMade': s.arp([62, 69, 74, 78], 0.055, 0.16, { type: 'sawtooth', vol: 0.07, filter: { f: 2800 }, rev: 0.25 }); break;
      case 'dropTarget': s.tone(1600, 0.18, { type: 'sawtooth', glide: 240, vol: 0.09, filter: { f: 4000 } }); break;
      case 'bankComplete': s.tone(900, 0.5, { type: 'sawtooth', glide: 90, vol: 0.12, filter: { f: 3000 } }); s.noiseHit(0.5, { f: 3000, sweep: 300, vol: 0.12 }); break;
      case 'doorHit': [412, 1034, 1716, 2480].forEach((f, i) => s.tone(f, 0.6 - i * 0.1, { vol: 0.09 / (i + 1), rev: 0.4 })); break;
      case 'doorOpen': s.arp([50, 57, 62, 66, 69], 0.08, 0.5, { type: 'sawtooth', vol: 0.07, filter: { f: 1800 }, rev: 0.5 }); break;
      case 'vaultEnter': s.tone(55, 0.5, { vol: 0.4, glide: 35 }); s.noiseHit(0.6, { f: 200, vol: 0.3, rev: 0.6 }); break;
      case 'lock': s.chord([50, 57, 62], 0.9, { type: 'sawtooth', vol: 0.06, filter: { f: 1500 }, strum: 0.03, rev: 0.4 }); s.tone(60, 0.7, { vol: 0.4, glide: 30 }); break;
      case 'multiball':
        for (let i = 0; i < 6; i++) { s.tone(NOTE(74), 0.18, { type: 'square', vol: 0.09, t0: i * 0.4, filter: { f: 2500 } }); s.tone(NOTE(71), 0.18, { type: 'square', vol: 0.09, t0: i * 0.4 + 0.2, filter: { f: 2500 } }); }
        s.chord([38, 50, 57, 62, 66], 2.4, { type: 'sawtooth', vol: 0.05, filter: { f: 1600 }, t0: 2.4, rev: 0.5 });
        break;
      case 'jackpot':
        s.chord([62, 66, 69, 74], 1.4, { type: 'sawtooth', vol: 0.07, filter: { f: 3000 }, strum: 0.025, rev: 0.5 });
        s.noiseHit(1.4, { f: 7000, type: 'highpass', vol: 0.18, rev: 0.4 });
        s.arp([74, 78, 81, 86, 90], 0.07, 0.3, { type: 'square', vol: 0.05, filter: { f: 4000 }, t0: 0.1 });
        break;
      case 'superJackpot':
        s.chord([50, 62, 66, 69, 74, 78], 2.2, { type: 'sawtooth', vol: 0.07, filter: { f: 3500 }, strum: 0.04, rev: 0.6 });
        s.noiseHit(2.2, { f: 6000, type: 'highpass', vol: 0.22, rev: 0.5 });
        s.arp([74, 78, 81, 86, 90, 93, 98], 0.06, 0.35, { type: 'square', vol: 0.05, filter: { f: 5000 }, t0: 0.2 });
        s.tone(45, 1.2, { vol: 0.5, glide: 30 });
        break;
      case 'scoop': s.tone(180, 0.2, { vol: 0.2, glide: 60 }); break;
      case 'addABall': s.arp([67, 71, 74, 79], 0.07, 0.2, { type: 'square', vol: 0.07, filter: { f: 3000 } }); break;
      case 'mystery': for (let i = 0; i < 12; i++) s.tone(NOTE(70 + (i * 7) % 12), 0.06, { type: 'triangle', vol: 0.05, t0: i * 0.07 }); break;
      case 'ebLit': s.arp([69, 73, 76, 81], 0.1, 0.25, { type: 'triangle', vol: 0.1, rev: 0.3 }); break;
      case 'extraBall': s.chord([57, 61, 64, 69], 1.2, { type: 'sawtooth', vol: 0.06, filter: { f: 2500 }, strum: 0.08, rev: 0.5 }); break;
      case 'jobSelect': case 'select': s.tone(NOTE(name === 'select' ? 81 : 74), 0.07, { type: 'square', vol: 0.06, filter: { f: 2500 } }); break;
      case 'jobStart': s.chord([50, 53, 57], 0.6, { type: 'sawtooth', vol: 0.07, filter: { f: 1400 }, rev: 0.4 }); s.tone(NOTE(62), 0.8, { t0: 0.3, type: 'sawtooth', vol: 0.06, filter: { f: 2000 } }); break;
      case 'jobHit': s.arp([74, 81], 0.06, 0.15, { type: 'square', vol: 0.07, filter: { f: 3000 } }); s.noiseHit(0.3, { f: 6000, type: 'highpass', vol: 0.1 }); break;
      case 'jobComplete': s.arp([62, 66, 69, 74, 78, 81], 0.08, 0.4, { type: 'sawtooth', vol: 0.06, filter: { f: 3200 }, rev: 0.5 }); break;
      case 'jobFail': s.arp([62, 61, 60, 59], 0.18, 0.25, { type: 'triangle', vol: 0.08 }); break;
      case 'jobLit': s.arp([69, 74, 78], 0.07, 0.2, { type: 'triangle', vol: 0.08 }); break;
      case 'combo': s.tone(NOTE(86), 0.12, { type: 'square', vol: 0.05, filter: { f: 4000 } }); break;
      case 'superSkillLit': s.arp([74, 79, 83], 0.06, 0.15, { type: 'square', vol: 0.06 }); break;
      case 'skillShot': s.arp([67, 71, 74, 79, 83], 0.06, 0.3, { type: 'square', vol: 0.08, filter: { f: 3500 }, rev: 0.3 }); break;
      case 'alarmLevel': for (let i = 0; i < 4; i++) s.tone(i % 2 ? 900 : 1200, 0.12, { type: 'square', vol: 0.05, t0: i * 0.13, filter: { f: 3000 } }); break;
      case 'wizard': s.chord([38, 50, 57, 62, 65, 69], 3.5, { type: 'sawtooth', vol: 0.06, filter: { f: 2000 }, strum: 0.12, rev: 0.7 }); s.tone(38, 3, { vol: 0.35 }); break;
      case 'ballSave': s.arp([74, 79], 0.08, 0.2, { type: 'triangle', vol: 0.1 }); break;
      case 'kickback': s.play('kickbackMech'); break;
      case 'tiltWarning': s.tone(220, 0.35, { type: 'square', vol: 0.12, filter: { f: 900 } }); break;
      case 'tilt': s.tone(110, 1.6, { type: 'sawtooth', vol: 0.18, filter: { f: 600 } }); break;
      case 'drain': s.arp([62, 58, 55, 50], 0.14, 0.3, { type: 'triangle', vol: 0.1 }); break;
      case 'knocker': s.tone(55, 0.12, { vol: 0.8, glide: 30 }); s.noiseHit(0.08, { f: 300, q: 1, vol: 0.7 }); break;
      case 'match': for (let i = 0; i < 18; i++) s.tone(NOTE(60 + (i * 5) % 24), 0.05, { type: 'square', vol: 0.04, t0: i * 0.11, filter: { f: 2000 } }); break;
      case 'highScore': s.arp([62, 66, 69, 74, 69, 74, 78], 0.12, 0.35, { type: 'sawtooth', vol: 0.06, filter: { f: 2500 }, rev: 0.4 }); break;
      case 'hsLetter': s.tone(NOTE(86), 0.1, { type: 'square', vol: 0.06 }); break;
      case 'start': s.chord([50, 57, 62, 65], 1.0, { type: 'sawtooth', vol: 0.06, filter: { f: 1800 }, strum: 0.06, rev: 0.5 }); break;
      case 'addPlayer': s.tone(NOTE(74), 0.15, { type: 'square', vol: 0.08 }); break;
      case 'ballSearch': break;
    }
  }

  // Map machine fx events to mechanical sounds
  fx(type, e) {
    switch (type) {
      case 'flipperUp': case 'flipperDown': case 'flipperHit': case 'thud': case 'clack': case 'dropDown':
      case 'dropReset': case 'capture': case 'vuk': case 'vaultKick': case 'autoLaunch': case 'plungerPull': case 'gate':
      case 'ballServe':
        this.play(type, e); break;
      case 'kick': this.play(e.id && e.id.startsWith('pop') ? 'mechPop' : 'mechSling'); break;
      case 'plungerRelease': this.play('plunge'); break;
      case 'doorOpen': this.play('doorOpenMech'); break;
      case 'doorClose': this.play('doorCloseMech'); break;
    }
  }

  speech(text) {
    if (!this.speechOn || !this.enabled || typeof speechSynthesis === 'undefined') return;
    try {
      speechSynthesis.cancel();
      const u = new SpeechSynthesisUtterance(text);
      u.rate = 1.0; u.pitch = 0.6; u.volume = 0.9;
      const v = speechSynthesis.getVoices().find(v => /en(-|_)(US|GB)/i.test(v.lang) && /male|david|daniel|george|guy/i.test(v.name)) ||
        speechSynthesis.getVoices().find(v => /^en/i.test(v.lang));
      if (v) u.voice = v;
      speechSynthesis.speak(u);
    } catch (e) { /* speech is optional */ }
  }

  setEnabled(on) { this.enabled = on; if (this.master) this.master.gain.value = on ? 0.9 : 0; }

  // ------------------------------------------------------------ music
  music(track) {
    if (!this.ctx) { this.pendingTrack = track; return; }
    if (track === this.track) return;
    this.track = track;
    this.bar = 0; this.step16 = 0;
    this.nextTime = this.ctx.currentTime + 0.08;
  }

  startSequencer() {
    this.step16 = 0; this.bar = 0; this.nextTime = this.ctx.currentTime + 0.1;
    setInterval(() => this.schedule(), 25);
  }

  schedule() {
    if (!this.ctx || !this.track || !this.musicOn || !this.enabled) { if (this.ctx) this.nextTime = this.ctx.currentTime + 0.05; return; }
    const spec = TRACKS[this.track];
    if (!spec) return;
    const sec16 = 60 / spec.bpm / 4;
    while (this.nextTime < this.ctx.currentTime + 0.12) {
      const swing = (this.step16 % 2 === 1) ? sec16 * (spec.swing || 0) : 0;
      this.playStep(spec, this.step16, this.bar, this.nextTime + swing, sec16);
      this.nextTime += sec16;
      this.step16++;
      if (this.step16 >= 16) { this.step16 = 0; this.bar++; }
    }
  }

  playStep(spec, s, bar, t, sec16) {
    const c = this.ctx;
    const chord = spec.chords[bar % spec.chords.length];
    const bus = this.musicBus;
    const at = t - c.currentTime;
    const tone = (n, dur, o) => this.tone(NOTE(n), dur, { ...o, t0: Math.max(0, at), bus });
    const noise = (dur, o) => this.noiseHit(dur, { ...o, t0: Math.max(0, at), bus });
    // drums
    if (spec.kick && spec.kick[s]) this.tone(110, 0.16, { vol: 0.55, glide: 40, t0: Math.max(0, at), bus });
    if (spec.snare && spec.snare[s]) noise(0.12, { f: 1800, q: 0.7, vol: spec.brush ? 0.12 : 0.28 });
    if (spec.hat && spec.hat[s]) noise(spec.ride ? 0.18 : 0.04, { f: spec.ride ? 7000 : 9000, type: 'highpass', vol: spec.ride ? 0.07 : 0.06 });
    // bass
    const bl = spec.bass(s, bar, chord);
    if (bl != null) tone(bl, sec16 * (spec.bassLen || 3.2), { type: 'triangle', vol: 0.34, filter: { f: 600 } });
    // comping / pads
    if (spec.comp && spec.comp[s]) chord.slice(1).forEach(n => tone(n + 12, sec16 * (spec.compLen || 1.6), { type: spec.compWave || 'triangle', vol: 0.05, filter: { f: 1800 } }));
    if (spec.pad && s === 0) chord.slice(1).forEach(n => tone(n + 12, sec16 * 15, { type: 'sawtooth', vol: 0.022, filter: { f: 900 }, attack: 0.4 }));
    // lead
    if (spec.lead) {
      const ln = spec.lead(s, bar, chord);
      if (ln != null) tone(ln, sec16 * (spec.leadLen || 1.8), { type: spec.leadWave || 'square', vol: 0.045, filter: { f: 2600 } });
    }
  }
}

// chord = [root, third, fifth, seventh] (MIDI numbers, bass register root)
const Dm7 = [38, 53, 57, 60], Bbmaj7 = [34, 50, 53, 57], Gm7 = [43, 50, 53, 58], A7 = [45, 49, 52, 55];
const Em7b5 = [40, 50, 53, 58], Dmaj = [38, 54, 57, 61], G = [43, 50, 55, 59], Bb = [34, 50, 53, 58], C = [36, 52, 55, 60];
const pattern = (str) => str.split('').map(ch => ch === 'x');

function walking(s, bar, ch) {
  // quarter-note walking bass with chromatic approach on beat 4
  if (s % 4 !== 0) return null;
  const beat = s / 4;
  const r = ch[0];
  return [r, r + 7, r + 12 - (bar % 2 ? 2 : 0), r + (bar % 2 ? 11 : 13)][beat] - 0;
}

export const TRACKS = {
  attract: {
    bpm: 84, swing: 0.3, chords: [Dm7, Dm7, Bbmaj7, A7],
    hat: pattern('x...x...x...x...'), ride: true, brush: true, snare: pattern('....x.......x...'),
    bass: (s, b, ch) => (s === 0 ? ch[0] : s === 10 ? ch[0] + 7 : null), bassLen: 6, pad: true,
    lead: (s, b, ch) => (b % 4 === 3 && s === 8 ? ch[3] + 12 : null), leadWave: 'triangle', leadLen: 6,
  },
  main: {
    bpm: 128, swing: 0.33, chords: [Dm7, Bbmaj7, Gm7, A7, Dm7, Em7b5, Gm7, A7],
    hat: pattern('x...x.xx..x.x.xx'), ride: true, snare: pattern('....x.......x...'), brush: true, kick: pattern('x.........x.....'),
    bass: walking, comp: pattern('....x..x....x...'),
    lead: (s, b, ch) => (b % 8 >= 6 && s % 4 === 2 ? ch[1 + ((s / 4 + b) % 3 | 0)] + 12 : null), leadWave: 'triangle',
  },
  job: {
    bpm: 140, swing: 0.1, chords: [Dm7, Dm7, Bb, A7],
    hat: pattern('x.x.x.x.x.x.x.x.'), snare: pattern('....x.......x..x'), kick: pattern('x..x..x...x..x..'),
    bass: (s, b, ch) => (s % 2 === 0 ? ch[0] + (s % 8 === 6 ? 12 : 0) : null), bassLen: 1.6,
    lead: (s, b, ch) => ([0, 3, 6, 10, 12].includes(s) ? ch[(s / 3 | 0) % 4 === 0 ? 1 : 2] + 12 : null), leadWave: 'sawtooth', leadLen: 1.2,
    comp: pattern('x.......x.......'), compWave: 'sawtooth',
  },
  multiball: {
    bpm: 156, swing: 0, chords: [Dm7, Dm7, C, Bb, Dm7, Dm7, Gm7, A7],
    hat: pattern('x.x.x.x.x.x.x.x.'), snare: pattern('....x.......x...'), kick: pattern('x.x...x.x.x...x.'),
    bass: (s, b, ch) => (s % 2 === 0 ? ch[0] + ([0, 0, 12, 0, 7, 0, 10, 12][s / 2] || 0) : null), bassLen: 1.5,
    lead: (s, b, ch) => {
      const riff = [62, null, 65, 67, null, 69, null, 67, 65, null, 62, null, 60, 62, null, null];
      const n = riff[s]; return n == null ? null : n + (b % 4 === 2 ? -2 : b % 4 === 3 ? 2 : 0);
    }, leadWave: 'sawtooth', leadLen: 1.6,
  },
  wizard: {
    bpm: 164, swing: 0, chords: [Dmaj, G, Dmaj, A7, Bb, C, Dmaj, A7],
    hat: pattern('xxxxxxxxxxxxxxxx'), snare: pattern('....x.......x.x.'), kick: pattern('x...x...x...x...'),
    bass: (s, b, ch) => (s % 2 === 0 ? ch[0] + (s % 4 === 2 ? 12 : 0) : null), bassLen: 1.5, pad: true,
    lead: (s, b, ch) => (s % 2 === 0 ? ch[1 + (s / 2) % 3] + 12 : null), leadWave: 'square', leadLen: 1.4,
  },
  select: {
    bpm: 120, swing: 0, chords: [Dm7],
    hat: pattern('x.x.x.x.x.x.x.x.'), kick: pattern('x.......x.......'),
    bass: (s, b, ch) => (s % 4 === 0 ? ch[0] : null), bassLen: 2, pad: true,
  },
  highscore: {
    bpm: 96, swing: 0.2, chords: [Dmaj, G, Bb, A7],
    hat: pattern('x...x...x...x...'), ride: true, brush: true,
    bass: (s, b, ch) => (s % 8 === 0 ? ch[0] : null), bassLen: 7, pad: true,
    lead: (s, b, ch) => (s % 4 === 0 ? ch[1 + ((s / 4) % 3)] + 12 : null), leadWave: 'triangle', leadLen: 3,
  },
};
