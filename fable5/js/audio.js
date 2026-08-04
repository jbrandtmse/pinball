/* DRAGON'S KEEP — WebAudio synth engine. All sounds procedural, no assets.
 * Lazy init on first user gesture (autoplay policy). Medieval music loop
 * via lookahead scheduler with plucked-string style notes.
 */
"use strict";
(function (g) {
  const DK = g.DK;

  class Audio2 {
    constructor() {
      this.ctx = null;
      this.muted = false;
      this.musicMode = "attract";
      this._nextNote = 0;
      this._step = 0;
      this._noise = null;
    }
    init() {
      if (this.ctx) return;
      const AC = g.AudioContext || g.webkitAudioContext;
      if (!AC) return;
      this.ctx = new AC();
      const c = this.ctx;
      this.master = c.createGain(); this.master.gain.value = 0.85;
      this.comp = c.createDynamicsCompressor();
      this.comp.threshold.value = -14; this.comp.ratio.value = 6;
      this.master.connect(this.comp); this.comp.connect(c.destination);
      this.sfxG = c.createGain(); this.sfxG.gain.value = 0.9; this.sfxG.connect(this.master);
      this.musG = c.createGain(); this.musG.gain.value = 0.34; this.musG.connect(this.master);
      // noise buffer
      const len = c.sampleRate * 1.2;
      this._noise = c.createBuffer(1, len, c.sampleRate);
      const d = this._noise.getChannelData(0);
      for (let i = 0; i < len; i++) d[i] = Math.random() * 2 - 1;
      this._nextNote = c.currentTime + 0.1;
    }
    resume() { if (this.ctx && this.ctx.state === "suspended") this.ctx.resume(); }
    toggleMute() {
      this.muted = !this.muted;
      if (this.master) this.master.gain.value = this.muted ? 0 : 0.85;
      return this.muted;
    }

    // ---- helpers ----
    osc(type, f0, t0, dur, vol, f1, dest) {
      const c = this.ctx;
      const o = c.createOscillator(), gn = c.createGain();
      o.type = type; o.frequency.setValueAtTime(f0, t0);
      if (f1 != null) o.frequency.exponentialRampToValueAtTime(Math.max(1, f1), t0 + dur);
      gn.gain.setValueAtTime(vol, t0);
      gn.gain.exponentialRampToValueAtTime(0.001, t0 + dur);
      o.connect(gn); gn.connect(dest || this.sfxG);
      o.start(t0); o.stop(t0 + dur + 0.02);
    }
    noise(t0, dur, vol, fLo, fHi, dest) {
      const c = this.ctx;
      const s = c.createBufferSource(); s.buffer = this._noise; s.loop = true;
      const gn = c.createGain();
      gn.gain.setValueAtTime(vol, t0);
      gn.gain.exponentialRampToValueAtTime(0.001, t0 + dur);
      let node = s;
      if (fHi) {
        const f = c.createBiquadFilter();
        f.type = "bandpass"; f.frequency.value = Math.sqrt(fLo * fHi);
        f.Q.value = Math.max(0.4, Math.sqrt(fHi / fLo) / 2);
        node.connect(f); node = f;
      } else if (fLo) {
        const f = c.createBiquadFilter();
        f.type = "lowpass"; f.frequency.setValueAtTime(fLo, t0);
        if (arguments.length >= 7 && dest && dest._sweep) { /* unused */ }
        node.connect(f); node = f;
      }
      node.connect(gn); gn.connect(dest || this.sfxG);
      s.start(t0, Math.random() * 0.8); s.stop(t0 + dur + 0.02);
    }
    boom(t0, dur, vol, f0, f1) {
      const c = this.ctx;
      const s = c.createBufferSource(); s.buffer = this._noise; s.loop = true;
      const f = c.createBiquadFilter(); f.type = "lowpass";
      f.frequency.setValueAtTime(f0, t0);
      f.frequency.exponentialRampToValueAtTime(f1, t0 + dur);
      const gn = c.createGain();
      gn.gain.setValueAtTime(vol, t0);
      gn.gain.exponentialRampToValueAtTime(0.001, t0 + dur);
      s.connect(f); f.connect(gn); gn.connect(this.sfxG);
      s.start(t0, Math.random() * 0.5); s.stop(t0 + dur + 0.05);
    }
    pluck(freq, t0, dur, vol, dest) {
      // lute-ish pluck: detuned triangles + fast decay + lowpass
      const c = this.ctx;
      const gn = c.createGain();
      gn.gain.setValueAtTime(vol, t0);
      gn.gain.exponentialRampToValueAtTime(0.001, t0 + dur);
      const f = c.createBiquadFilter(); f.type = "lowpass";
      f.frequency.setValueAtTime(freq * 6, t0);
      f.frequency.exponentialRampToValueAtTime(freq * 1.5, t0 + dur * 0.7);
      for (const det of [0, 1.004]) {
        const o = c.createOscillator();
        o.type = "triangle"; o.frequency.value = freq * det || freq;
        o.connect(f);
        o.start(t0); o.stop(t0 + dur + 0.02);
      }
      f.connect(gn); gn.connect(dest || this.musG);
    }
    arp(notes, t0, step, dur, vol, type) {
      notes.forEach((n, i) => {
        this.osc(type || "sawtooth", n, t0 + i * step, dur, vol);
        this.osc("triangle", n * 2, t0 + i * step, dur * 0.7, vol * 0.4);
      });
    }

    // ---- sfx dispatch ----
    play(name, p) {
      if (!this.ctx || this.muted) return;
      const t = this.ctx.currentTime;
      const N2 = (f) => f; // note freq passthrough
      switch (name) {
        case "flip": this.noise(t, 0.05, 0.5, 300, 1800); this.osc("square", 110, t, 0.06, 0.35, 70); break;
        case "flipRel": this.noise(t, 0.04, 0.18, 200, 900); break;
        case "sling": this.noise(t, 0.07, 0.65, 700, 2600); this.osc("sine", 200, t, 0.08, 0.5, 90); break;
        case "pop": this.osc("sine", 150, t, 0.11, 0.85, 55); this.noise(t, 0.05, 0.4, 900, 3200); break;
        case "spin": this.noise(t, 0.025, 0.28, 2200, 6000); break;
        case "rollover": this.osc("triangle", 880, t, 0.12, 0.4); this.osc("triangle", 1320, t + 0.03, 0.1, 0.25); break;
        case "rolloverDim": this.osc("triangle", 660, t, 0.08, 0.22); break;
        case "inlane": this.osc("triangle", 740, t, 0.11, 0.35); this.osc("triangle", 1110, t + 0.05, 0.1, 0.3); break;
        case "outlane": this.osc("sawtooth", 220, t, 0.4, 0.3, 90); break;
        case "launch": {
          const q = (p && p.q) || 0.5;
          this.noise(t, 0.16, 0.5 + q * 0.3, 400, 2500);
          this.osc("square", 70 + q * 60, t, 0.18, 0.5, 260 + q * 320);
          break;
        }
        case "launched": this.noise(t, 0.2, 0.25, 900, 2400); break;
        case "serve": this.noise(t, 0.08, 0.3, 150, 700); this.osc("square", 80, t, 0.08, 0.3, 55); break;
        case "gateHit": this.osc("square", 195, t, 0.1, 0.4, 150); this.osc("square", 292, t, 0.08, 0.28, 240); this.noise(t, 0.06, 0.5, 1800, 5200); break;
        case "bridge": this.osc("sawtooth", 85, t, 0.5, 0.4, 55); this.noise(t, 0.5, 0.22, 300, 900); break;
        case "gateOpen": for (let i = 0; i < 5; i++) this.noise(t + i * 0.06, 0.05, 0.35, 1200, 4200); this.osc("square", 120, t + 0.3, 0.16, 0.35, 80); break;
        case "lock": this.osc("sine", 90, t, 0.3, 0.8, 45); this.arp([294, 370, 440], t + 0.12, 0.07, 0.16, 0.22); break;
        case "kickout": this.noise(t, 0.07, 0.45, 400, 1600); this.osc("square", 130, t, 0.07, 0.4, 90); break;
        case "explode": this.boom(t, 1.1, 1.0, 2400, 60); this.osc("sine", 55, t, 0.9, 0.8, 28); break;
        case "jackpot": this.arp([294, 370, 440, 587], t, 0.075, 0.3, 0.3); break;
        case "sjp": this.arp([294, 370, 440, 587, 740, 880], t, 0.07, 0.4, 0.32); this.boom(t, 0.7, 0.5, 1800, 120); break;
        case "mbstart": {
          this.boom(t, 1.0, 0.6, 300, 3000);
          this.arp([147, 185, 220, 294, 370, 440, 587], t + 0.15, 0.09, 0.5, 0.3);
          break;
        }
        case "drain": this.osc("sawtooth", 180, t, 0.7, 0.5, 45); this.boom(t + 0.15, 0.5, 0.5, 900, 80); break;
        case "drainMB": this.osc("sawtooth", 160, t, 0.3, 0.3, 70); break;
        case "knocker": this.noise(t, 0.03, 1.0, 80, 900); this.osc("square", 62, t, 0.09, 1.0, 40); break;
        case "tiltWarn": this.osc("sawtooth", 130, t, 0.32, 0.5, 118); break;
        case "tilt": this.osc("sawtooth", 120, t, 1.1, 0.6, 42); break;
        case "quest": this.arp([220, 294, 330, 440], t, 0.12, 0.42, 0.3); break;
        case "questHit": this.osc("triangle", 587, t, 0.12, 0.4); this.osc("triangle", 880, t + 0.06, 0.14, 0.35); break;
        case "questWin": this.arp([294, 370, 440, 587, 740], t, 0.09, 0.42, 0.32); break;
        case "questFail": this.osc("sawtooth", 330, t, 0.28, 0.3, 262); this.osc("sawtooth", 262, t + 0.28, 0.44, 0.3, 175); break;
        case "eb": this.arp([523, 659, 784, 1047, 1319], t, 0.07, 0.4, 0.3, "triangle"); break;
        case "skill": this.arp([587, 740, 880, 1175], t, 0.06, 0.42, 0.35); this.noise(t, 0.35, 0.2, 3000, 9000); break;
        case "combo": {
          const n = (p && p.n) || 2;
          this.arp([440 * Math.pow(1.122, n), 554 * Math.pow(1.122, n)], t, 0.05, 0.18, 0.3);
          break;
        }
        case "catapult": for (let i = 0; i < 4; i++) this.noise(t + i * 0.05, 0.035, 0.3, 800, 2400); break;
        case "toss": this.noise(t, 0.4, 0.35, 500, 4000); this.osc("sine", 220, t, 0.4, 0.25, 660); break;
        case "tossLand": this.osc("sine", 120, t, 0.12, 0.5, 60); this.noise(t, 0.06, 0.3, 400, 1400); break;
        case "scoop": this.osc("sine", 500, t, 0.22, 0.4, 130); this.noise(t, 0.1, 0.3, 300, 1100); break;
        case "kickback": this.noise(t, 0.12, 0.7, 500, 2200); this.osc("square", 90, t, 0.14, 0.6, 320); break;
        case "key": this.osc("square", 660, t, 0.05, 0.2); break;
        case "key2": this.osc("square", 880, t, 0.07, 0.25); break;
        case "coin": this.osc("triangle", 1568, t, 0.09, 0.35); this.osc("triangle", 2093, t + 0.09, 0.16, 0.35); break;
        case "start": this.arp([294, 440, 587, 740], t, 0.08, 0.4, 0.32); break;
        case "armed": this.arp([330, 440, 554], t, 0.06, 0.25, 0.3, "square"); break;
        case "troll": this.osc("square", 95, t, 0.18, 0.5, 62); this.osc("square", 130, t + 0.05, 0.12, 0.3, 80); break;
        case "trollUp": this.osc("square", 90, t, 0.3, 0.4, 280); break;
        case "dragonHit": this.boom(t, 0.45, 0.55, 700, 90); this.osc("sawtooth", 75, t, 0.4, 0.5, 48); break;
        case "drop": this.noise(t, 0.05, 0.55, 800, 2600); this.osc("square", 160, t, 0.07, 0.4, 100); break;
        case "bankdone": this.arp([440, 554, 659], t, 0.08, 0.3, 0.32); break;
        case "bankReset": this.noise(t, 0.09, 0.4, 200, 800); this.osc("square", 70, t + 0.05, 0.08, 0.35, 50); break;
        case "ballsave": this.arp([880, 880, 880], t, 0.09, 0.08, 0.3, "square"); break;
        case "shootAgain": this.arp([440, 587, 740, 880], t, 0.09, 0.35, 0.3); break;
        case "search": this.noise(t, 0.05, 0.3, 500, 1500); break;
        case "matchSeq": for (let i = 0; i < 8; i++) this.noise(t + i * 0.13, 0.04, 0.25, 200, 900); break;
        case "hiscore": this.arp([294, 370, 440, 587], t, 0.1, 0.45, 0.3); break;
        case "hiscoreDone": this.arp([440, 587, 740], t, 0.09, 0.4, 0.3); break;
        case "gc": this.arp([294, 370, 440, 587, 740, 880, 1175], t, 0.09, 0.55, 0.32); break;
        case "crown": this.arp([294, 370, 440, 587, 740, 880, 1175, 1480], t, 0.1, 0.7, 0.34); this.boom(t, 1.4, 0.5, 2000, 100); break;
        case "wizard": this.boom(t, 1.6, 0.5, 200, 2600); this.arp([147, 175, 208, 247, 294], t + 0.2, 0.14, 0.6, 0.3); break;
        case "nudge": this.osc("sine", 70, t, 0.08, 0.4, 45); break;
        case "thud": this.noise(t, 0.04, Math.min(0.4, ((p && p.v) || 300) / 2200), 150, 600); break;
        case "ballhit": this.noise(t, 0.03, Math.min(0.5, ((p && p.v) || 300) / 1800), 1500, 5000); break;
        case "rampIn": this.noise(t, 0.12, 0.3, 700, 2400); break;
        case "rampDone": this.osc("triangle", 988, t, 0.12, 0.35); this.noise(t, 0.14, 0.2, 1500, 4000); break;
        case "rampBack": this.noise(t, 0.07, 0.25, 300, 1100); break;
        case "orbit": this.noise(t, 0.15, 0.28, 600, 2600); break;
        case "rampMade": this.osc("triangle", 784, t, 0.1, 0.3); break;
        case "bonusX": this.arp([523, 659, 784], t, 0.06, 0.25, 0.3, "triangle"); break;
        case "bonusTally": this.osc("square", 440, t, 0.05, 0.2); break;
        default: break;
      }
    }

    // ---- music ----
    update(musicMode) {
      if (!this.ctx || this.muted) return;
      this.musicMode = musicMode;
      const c = this.ctx;
      const ahead = 0.25;
      while (this._nextNote < c.currentTime + ahead) {
        this.scheduleStep(this._step, this._nextNote);
        const bpm = musicMode === "mb" || musicMode === "wiz" ? 168 : 126;
        this._nextNote += 60 / bpm / 2; // eighth notes
        this._step = (this._step + 1) % 32;
      }
    }
    scheduleStep(s, t) {
      const mode = this.musicMode;
      if (mode === "attract" || mode === "off") return;
      // D dorian medieval progression
      const bassLine = [147, 147, 175, 147, 131, 131, 147, 131,  // D D F D C C D C
        110, 110, 131, 110, 147, 147, 175, 196];
      const bar = Math.floor(s / 2) % 16;
      if (s % 2 === 0) {
        this.pluck(bassLine[bar] / 2, t, 0.42, mode === "wiz" ? 0.5 : 0.4);
      }
      // lute arpeggio
      const arps = {
        main: [294, 349, 440, 349, 294, 349, 523, 440],
        quest: [294, 370, 440, 587, 440, 370, 294, 262],
        mb: [294, 440, 587, 440, 349, 523, 698, 523],
        wiz: [294, 311, 370, 440, 466, 440, 370, 311]
      };
      const arr = arps[mode] || arps.main;
      const note = arr[s % 8];
      if (s % 1 === 0 && (mode !== "main" || s % 2 === 1 || s % 8 === 0)) {
        this.pluck(note, t, 0.3, 0.22);
      }
      // percussion
      if (s % 8 === 0) this.boom(t, 0.1, 0.3, 300, 60);
      if (mode !== "main" && s % 8 === 4) this.noise(t, 0.05, 0.15, 2000, 6000, this.musG);
    }
  }

  DK.Audio = Audio2;
})(typeof window !== "undefined" ? window : globalThis);
