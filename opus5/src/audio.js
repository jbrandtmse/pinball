/* ============================================================================
 * RAGNAROK PINBALL — audio.js
 * Fully synthesised sound: solenoid clacks, chimes, a knocker, and an adaptive
 * score. No sample files — everything is generated in WebAudio at runtime.
 * ==========================================================================*/
(function (PB) {
  'use strict';
  var U = PB.U;

  var A = PB.Audio = {
    ac: null, ready: false, muted: false,
    master: null, sfxBus: null, musicBus: null, verb: null,
    noiseBuf: null,
    _musicOn: false, _tempo: 132, _next: 0, _stepI: 0, _pattern: 'idle', _pendingPattern: null
  };

  A.init = function () {
    if (A.ac) return;
    var Ctx = window.AudioContext || window.webkitAudioContext;
    if (!Ctx) return;
    var ac = A.ac = new Ctx();

    var comp = ac.createDynamicsCompressor();
    comp.threshold.value = -14; comp.knee.value = 22; comp.ratio.value = 5;
    comp.attack.value = 0.004; comp.release.value = 0.20;

    A.master = ac.createGain();
    A.master.gain.value = 0.85;
    comp.connect(A.master); A.master.connect(ac.destination);

    A.sfxBus = ac.createGain(); A.sfxBus.gain.value = 1.0; A.sfxBus.connect(comp);
    A.musicBus = ac.createGain(); A.musicBus.gain.value = 0.0; A.musicBus.connect(comp);

    // small plate-ish reverb from generated noise
    var vlen = Math.floor(ac.sampleRate * 1.6);
    var ir = ac.createBuffer(2, vlen, ac.sampleRate);
    for (var ch = 0; ch < 2; ch++) {
      var d = ir.getChannelData(ch);
      for (var i = 0; i < vlen; i++) {
        var t = i / vlen;
        d[i] = (Math.random() * 2 - 1) * Math.pow(1 - t, 2.6) * (i < 400 ? i / 400 : 1);
      }
    }
    var conv = ac.createConvolver(); conv.buffer = ir;
    A.verb = ac.createGain(); A.verb.gain.value = 0.20;
    A.verb.connect(conv); conv.connect(comp);

    // reusable white-noise buffer
    var nlen = Math.floor(ac.sampleRate * 2);
    var nb = ac.createBuffer(1, nlen, ac.sampleRate);
    var nd = nb.getChannelData(0);
    for (var k = 0; k < nlen; k++) nd[k] = Math.random() * 2 - 1;
    A.noiseBuf = nb;

    A.ready = true;
    A._next = ac.currentTime + 0.1;
  };

  A.resume = function () { if (A.ac && A.ac.state === 'suspended') A.ac.resume(); };
  A.setMuted = function (m) {
    A.muted = m;
    if (A.master) A.master.gain.setTargetAtTime(m ? 0 : 0.85, A.ac.currentTime, 0.02);
  };
  A.toggleMute = function () { A.setMuted(!A.muted); return A.muted; };

  /* ------------------------------------------------------------- helpers */
  function t0(off) { return A.ac.currentTime + (off || 0); }

  function env(node, when, a, d, peak, dest) {
    var g = A.ac.createGain();
    g.gain.setValueAtTime(0.0001, when);
    g.gain.exponentialRampToValueAtTime(Math.max(0.0002, peak), when + a);
    g.gain.exponentialRampToValueAtTime(0.0001, when + a + d);
    node.connect(g);
    g.connect(dest || A.sfxBus);
    return g;
  }

  function osc(type, freq, when, dur, peak, dest, glideTo, detune) {
    if (!A.ready) return null;
    var o = A.ac.createOscillator();
    o.type = type;
    o.frequency.setValueAtTime(freq, when);
    if (glideTo) o.frequency.exponentialRampToValueAtTime(Math.max(1, glideTo), when + dur);
    if (detune) o.detune.value = detune;
    env(o, when, Math.min(0.008, dur * 0.2), dur, peak, dest);
    o.start(when); o.stop(when + dur + 0.08);
    return o;
  }

  function noise(when, dur, peak, filterType, f0, f1, q, dest) {
    if (!A.ready) return null;
    var s = A.ac.createBufferSource();
    s.buffer = A.noiseBuf;
    s.loop = true;
    s.playbackRate.value = 0.8 + Math.random() * 0.4;
    var bp = A.ac.createBiquadFilter();
    bp.type = filterType || 'bandpass';
    bp.frequency.setValueAtTime(f0, when);
    if (f1) bp.frequency.exponentialRampToValueAtTime(Math.max(30, f1), when + dur);
    bp.Q.value = q === undefined ? 1.2 : q;
    s.connect(bp);
    env(bp, when, Math.min(0.004, dur * 0.25), dur, peak, dest);
    s.start(when); s.stop(when + dur + 0.05);
    return s;
  }

  function verbSend(amount) {
    var g = A.ac.createGain(); g.gain.value = amount; g.connect(A.verb); return g;
  }

  /* ============================================================ SFX table */
  var S = A.sfx = {};

  S.flipperUp = function (v) {
    if (!A.ready) return;
    var w = t0();
    noise(w, 0.035, 0.30 * (v || 1), 'bandpass', 2600, 900, 1.1);
    osc('square', 165, w, 0.045, 0.16 * (v || 1), null, 78);
    osc('triangle', 62, w, 0.09, 0.20 * (v || 1), null, 44);
  };
  S.flipperDown = function () {
    if (!A.ready) return;
    var w = t0();
    noise(w, 0.028, 0.14, 'bandpass', 1700, 700, 1.0);
    osc('triangle', 96, w, 0.05, 0.09, null, 58);
  };
  S.flipperHitBall = function (v) {
    if (!A.ready) return;
    var w = t0();
    noise(w, 0.02, 0.14 * v, 'highpass', 3200, 2200, 0.8);
  };

  S.bumper = function (n) {
    if (!A.ready) return;
    var w = t0();
    var base = 300 + (n % 3) * 55;
    osc('square', base, w, 0.11, 0.26, null, base * 0.34);
    osc('sawtooth', base * 1.51, w, 0.07, 0.10, null, base * 0.5);
    noise(w, 0.05, 0.20, 'bandpass', 1800, 400, 1.4);
    osc('sine', 74, w, 0.13, 0.30, null, 45);
  };

  S.sling = function () {
    if (!A.ready) return;
    var w = t0();
    noise(w, 0.045, 0.34, 'bandpass', 3000, 1100, 1.6);
    osc('square', 430, w, 0.055, 0.16, null, 190);
    osc('sine', 92, w, 0.09, 0.20, null, 55);
  };

  S.target = function (p) {
    if (!A.ready) return;
    var w = t0();
    var f = 720 + (p || 0) * 130;
    osc('triangle', f, w, 0.10, 0.20, verbSend(0.28));
    osc('sine', f * 2.02, w, 0.07, 0.09);
    noise(w, 0.022, 0.14, 'highpass', 4200, 3000, 0.8);
  };

  S.dropTarget = function (p) {
    if (!A.ready) return;
    var w = t0();
    noise(w, 0.05, 0.26, 'bandpass', 1500, 380, 1.1);
    osc('square', 300 + (p || 0) * 90, w, 0.07, 0.16, null, 150);
    osc('sine', 110, w, 0.12, 0.22, null, 66);
  };
  S.dropBank = function () {
    if (!A.ready) return;
    var w = t0();
    for (var i = 0; i < 3; i++) noise(w + i * 0.028, 0.06, 0.22, 'bandpass', 1400 - i * 200, 300, 1.0);
    osc('sine', 130, w, 0.2, 0.24, null, 60);
  };

  S.rollover = function () {
    if (!A.ready) return;
    var w = t0();
    osc('sine', 1180, w, 0.055, 0.16, verbSend(0.3));
    osc('sine', 1770, w + 0.03, 0.05, 0.10);
  };

  S.spinner = function (rate) {
    if (!A.ready) return;
    var w = t0();
    var f = 620 + U.clamp(rate, 0, 1) * 1500;
    osc('square', f, w, 0.022, 0.075, null, f * 0.8);
  };

  S.rampEnter = function () {
    if (!A.ready) return;
    var w = t0();
    noise(w, 0.30, 0.16, 'bandpass', 500, 2600, 2.4, verbSend(0.4));
  };
  S.rampMade = function (n) {
    if (!A.ready) return;
    var w = t0();
    noise(w, 0.22, 0.14, 'bandpass', 2400, 700, 2.0);
    var base = 392 * Math.pow(2, ((n || 0) % 5) / 12);
    osc('triangle', base, w, 0.16, 0.16, verbSend(0.35), base * 2);
  };

  S.scoop = function () {
    if (!A.ready) return;
    var w = t0();
    noise(w, 0.12, 0.24, 'lowpass', 900, 220, 1.0);
    osc('sine', 180, w, 0.16, 0.22, null, 70);
  };
  S.kicker = function () {
    if (!A.ready) return;
    var w = t0();
    noise(w, 0.06, 0.34, 'bandpass', 900, 260, 0.9);
    osc('square', 130, w, 0.09, 0.28, null, 60);
  };

  S.plungerPull = function () {
    if (!A.ready) return;
    noise(t0(), 0.12, 0.08, 'bandpass', 400, 900, 3.0);
  };
  S.plungerRelease = function (p) {
    if (!A.ready) return;
    var w = t0();
    noise(w, 0.09, 0.20 + 0.24 * p, 'bandpass', 700 + 900 * p, 200, 1.1);
    osc('triangle', 150 + 130 * p, w, 0.10, 0.20 * (0.4 + p), null, 60);
  };

  S.drain = function () {
    if (!A.ready) return;
    var w = t0();
    osc('sine', 340, w, 0.55, 0.22, verbSend(0.5), 66);
    osc('sine', 226, w + 0.05, 0.5, 0.14, null, 50);
    noise(w, 0.28, 0.09, 'lowpass', 700, 120, 1.0);
  };

  S.ballSave = function () {
    if (!A.ready) return;
    var w = t0(), f = [523, 659, 784, 1046];
    for (var i = 0; i < 4; i++) osc('triangle', f[i], w + i * 0.055, 0.16, 0.16, verbSend(0.35));
  };

  /** The knocker: a real solenoid slamming the cabinet. Replay / extra ball. */
  S.knocker = function () {
    if (!A.ready) return;
    var w = t0();
    noise(w, 0.10, 0.85, 'lowpass', 1400, 180, 0.9);
    osc('sine', 88, w, 0.16, 0.75, null, 38);
    osc('square', 62, w, 0.09, 0.35, null, 30);
  };

  S.jackpot = function (n) {
    if (!A.ready) return;
    var w = t0();
    var root = 523.25 * Math.pow(2, ((n || 0) % 4) / 12);
    var seq = [0, 4, 7, 12, 16];
    for (var i = 0; i < seq.length; i++) {
      var f = root * Math.pow(2, seq[i] / 12);
      osc('square', f, w + i * 0.045, 0.16, 0.13, verbSend(0.4));
      osc('triangle', f * 2, w + i * 0.045, 0.10, 0.07);
    }
    osc('sine', 110, w, 0.3, 0.24, null, 55);
  };

  S.superJackpot = function () {
    if (!A.ready) return;
    var w = t0();
    var seq = [0, 7, 12, 16, 19, 24, 28, 31];
    for (var i = 0; i < seq.length; i++) {
      var f = 261.6 * Math.pow(2, seq[i] / 12);
      osc('sawtooth', f, w + i * 0.05, 0.22, 0.10, verbSend(0.5));
      osc('square', f * 0.5, w + i * 0.05, 0.18, 0.07);
    }
    noise(w, 0.6, 0.13, 'bandpass', 400, 5000, 1.6, verbSend(0.6));
    osc('sine', 65, w, 0.7, 0.3, null, 40);
  };

  S.modeStart = function () {
    if (!A.ready) return;
    var w = t0();
    noise(w, 0.5, 0.14, 'bandpass', 200, 4000, 2.0, verbSend(0.5));
    var seq = [0, 3, 7, 10, 12];
    for (var i = 0; i < seq.length; i++)
      osc('sawtooth', 196 * Math.pow(2, seq[i] / 12), w + i * 0.07, 0.3, 0.10, verbSend(0.4));
  };

  S.multiball = function () {
    if (!A.ready) return;
    var w = t0();
    for (var i = 0; i < 3; i++) {
      osc('sawtooth', 110, w + i * 0.18, 0.34, 0.16, verbSend(0.4), 440);
      noise(w + i * 0.18, 0.30, 0.14, 'bandpass', 300, 3000, 1.4);
    }
    osc('sine', 55, w, 1.1, 0.3, null, 40);
  };

  S.tiltWarn = function () {
    if (!A.ready) return;
    var w = t0();
    osc('square', 220, w, 0.20, 0.20, null, 200);
    osc('square', 224, w, 0.20, 0.18, null, 204);
  };
  S.tilt = function () {
    if (!A.ready) return;
    var w = t0();
    for (var i = 0; i < 6; i++) {
      osc('square', 150, w + i * 0.11, 0.09, 0.26);
      osc('square', 153, w + i * 0.11, 0.09, 0.24);
    }
  };

  S.bonusTick = function (n) {
    if (!A.ready) return;
    osc('square', 500 + (n % 12) * 42, t0(), 0.045, 0.10);
  };
  S.uiMove = function () { if (A.ready) osc('square', 660, t0(), 0.035, 0.09); };
  S.uiSelect = function () {
    if (!A.ready) return;
    var w = t0();
    osc('square', 523, w, 0.06, 0.12);
    osc('square', 784, w + 0.05, 0.09, 0.12);
  };
  S.gameStart = function () {
    if (!A.ready) return;
    var w = t0();
    var seq = [0, 5, 7, 12];
    for (var i = 0; i < seq.length; i++)
      osc('square', 196 * Math.pow(2, seq[i] / 12), w + i * 0.10, 0.22, 0.16, verbSend(0.35));
    S.knocker();
  };
  S.gameOver = function () {
    if (!A.ready) return;
    var w = t0();
    var seq = [12, 10, 7, 3, 0];
    for (var i = 0; i < seq.length; i++)
      osc('triangle', 261 * Math.pow(2, seq[i] / 12), w + i * 0.16, 0.35, 0.16, verbSend(0.5));
  };
  S.combo = function (n) {
    if (!A.ready) return;
    osc('square', 660 * Math.pow(2, Math.min(n, 6) / 12), t0(), 0.09, 0.14, verbSend(0.3));
  };
  S.hurryTick = function (t) {
    if (!A.ready) return;
    osc('square', 300 + t * 400, t0(), 0.05, 0.11);
  };

  /* ============================================================== MUSIC */
  /* A four-bar loop in D minor with a Norse lilt. Patterns swap on the fly. */
  var SCALE = { D: 146.83 };
  function nf(semi) { return SCALE.D * Math.pow(2, semi / 12); }

  var PATTERNS = {
    idle:      { bpm: 96,  bass: [0, -5, -3, -5, 0, -5, 2, -5], lead: [12, 15, 19, 15, 17, 15, 12, 10], drums: 0, gain: 0.16, wave: 'triangle' },
    play:      { bpm: 132, bass: [0, 0, 7, 0, -2, -2, 5, 3], lead: [12, 14, 15, 19, 22, 19, 15, 14], drums: 1, gain: 0.20, wave: 'sawtooth' },
    mode:      { bpm: 146, bass: [0, 3, 5, 7, 5, 3, 0, -2], lead: [19, 22, 24, 22, 19, 17, 15, 17], drums: 2, gain: 0.24, wave: 'square' },
    multiball: { bpm: 158, bass: [0, 0, 0, 5, 5, 3, 3, -2], lead: [24, 22, 19, 22, 24, 27, 24, 22], drums: 3, gain: 0.26, wave: 'sawtooth' },
    wizard:    { bpm: 172, bass: [0, -2, 3, 5, 7, 5, 3, 0], lead: [24, 27, 29, 31, 29, 27, 24, 22], drums: 3, gain: 0.30, wave: 'sawtooth' }
  };

  A.setMusic = function (name, immediate) {
    if (!PATTERNS[name]) name = 'play';
    if (A._pattern === name) return;
    if (immediate) { A._pattern = name; A._stepI = 0; }
    else A._pendingPattern = name;
  };
  A.musicOn = function (on) {
    A._musicOn = on;
    if (!A.ready) return;
    A.musicBus.gain.setTargetAtTime(on ? 1 : 0, A.ac.currentTime, 0.35);
  };
  A.duck = function (amount, time) {
    if (!A.ready) return;
    A.musicBus.gain.setTargetAtTime(amount, A.ac.currentTime, 0.03);
    A.musicBus.gain.setTargetAtTime(A._musicOn ? 1 : 0, A.ac.currentTime + (time || 0.5), 0.25);
  };

  function drum(kind, when, p) {
    if (kind === 'kick') {
      osc('sine', 130, when, 0.16, 0.42 * p, A.musicBus, 42);
      noise(when, 0.02, 0.12 * p, 'lowpass', 800, 200, 0.7, A.musicBus);
    } else if (kind === 'snare') {
      noise(when, 0.11, 0.20 * p, 'bandpass', 1900, 900, 1.0, A.musicBus);
      osc('triangle', 210, when, 0.07, 0.12 * p, A.musicBus, 150);
    } else if (kind === 'hat') {
      noise(when, 0.035, 0.075 * p, 'highpass', 7500, 6500, 0.8, A.musicBus);
    }
  }

  /** Called every frame; schedules ~120 ms ahead. */
  A.tickMusic = function () {
    if (!A.ready || !A._musicOn) return;
    var ac = A.ac;
    var pat = PATTERNS[A._pattern] || PATTERNS.play;
    var spb = 60 / pat.bpm / 2;      // eighth notes
    while (A._next < ac.currentTime + 0.14) {
      var w = A._next;
      var i = A._stepI % 8;
      if (i === 0 && A._pendingPattern) {
        A._pattern = A._pendingPattern; A._pendingPattern = null;
        pat = PATTERNS[A._pattern]; spb = 60 / pat.bpm / 2;
      }
      var g = pat.gain;

      // bass
      var bf = nf(pat.bass[i] - 24);
      osc(pat.wave, bf, w, spb * 1.5, g * 0.55, A.musicBus);
      // lead arp — softer, with reverb
      if (i % 1 === 0) {
        var lf = nf(pat.lead[i]);
        osc('triangle', lf, w, spb * 0.9, g * 0.30, A.musicBus);
        if (pat.drums >= 2) osc(pat.wave, lf * 2, w, spb * 0.5, g * 0.10, A.musicBus);
      }
      // drums
      if (pat.drums >= 1) {
        if (i === 0 || i === 3 || i === 6) drum('kick', w, 1);
        if (i === 2 || i === 6) drum('snare', w, 0.9);
        if (pat.drums >= 2) drum('hat', w, i % 2 ? 0.6 : 1.0);
        if (pat.drums >= 3 && i % 2 === 1) drum('hat', w + spb * 0.5, 0.5);
      }
      A._next += spb;
      A._stepI++;
    }
  };

})(window.PB = window.PB || {});
