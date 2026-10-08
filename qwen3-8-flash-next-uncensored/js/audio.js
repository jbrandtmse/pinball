// PLEASURE PALACE — WebAudio synth: classic pinball sounds, no assets.

(function (root, factory) {
  var mod = factory();
  if (typeof module !== 'undefined' && module.exports) module.exports = mod;
  root.PP_AUDIO = mod;
})(typeof globalThis !== 'undefined' ? globalThis : this, function () {
  'use strict';

  function create() {
    var ctx = null, master = null, musicOn = false, musicTimer = null, step = 0;

    function ensure() {
      if (ctx) return ctx;
      try {
        var AC = window.AudioContext || window.webkitAudioContext;
        if (!AC) return null;
        ctx = new AC();
        master = ctx.createGain();
        master.gain.value = 0.5;
        master.connect(ctx.destination);
      } catch (e) { ctx = null; }
      return ctx;
    }
    function resume() {
      var c = ensure();
      if (c && c.state === 'suspended') c.resume();
    }

    function tone(freq, dur, type, vol, when, glideTo) {
      if (!ctx) return;
      var t0 = ctx.currentTime + (when || 0);
      var osc = ctx.createOscillator();
      osc.type = type || 'square';
      osc.frequency.setValueAtTime(freq, t0);
      if (glideTo) osc.frequency.exponentialRampToValueAtTime(glideTo, t0 + dur);
      var g = ctx.createGain();
      g.gain.setValueAtTime(vol || 0.2, t0);
      g.gain.exponentialRampToValueAtTime(0.001, t0 + dur);
      osc.connect(g); g.connect(master);
      osc.start(t0); osc.stop(t0 + dur + 0.02);
    }
    function noise(dur, when, vol, lowpass) {
      if (!ctx) return;
      var t0 = ctx.currentTime + (when || 0);
      var n = Math.floor(ctx.sampleRate * dur);
      var buf = ctx.createBuffer(1, n, ctx.sampleRate);
      var d = buf.getChannelData(0);
      for (var i = 0; i < n; i++) d[i] = (Math.random() * 2 - 1) * (1 - i / n);
      var src = ctx.createBufferSource();
      src.buffer = buf;
      var g = ctx.createGain();
      g.gain.value = vol || 0.25;
      var f = ctx.createBiquadFilter();
      f.type = lowpass ? 'lowpass' : 'highpass';
      f.frequency.value = lowpass ? 1200 : 2500;
      src.connect(f); f.connect(g); g.connect(master);
      src.start(t0);
    }

    var lib = {
      flipper: function () { resume(); noise(0.05, 0, 0.18, true); tone(150, 0.06, 'square', 0.10); },
      launch: function () { resume(); tone(90, 0.28, 'sawtooth', 0.22, 0, 520); noise(0.12, 0.02, 0.12); },
      bumper: function (pitch) { resume(); tone(320 + 40 * (pitch || 0), 0.09, 'square', 0.24); noise(0.05, 0, 0.2); },
      sling: function () { resume(); noise(0.07, 0, 0.30, true); tone(240, 0.05, 'triangle', 0.14); },
      spin: function () { resume(); noise(0.04, 0, 0.14); noise(0.04, 0.06, 0.12); noise(0.04, 0.12, 0.10); },
      target: function () { resume(); tone(200, 0.10, 'square', 0.20); noise(0.08, 0, 0.18, true); },
      kick: function () { resume(); tone(160, 0.30, 'sine', 0.28, 0, 780); },
      drain: function () { resume(); tone(420, 0.42, 'sine', 0.22, 0, 70); noise(0.2, 0.05, 0.08, true); },
      reward: function () { resume(); [523, 659, 784].forEach(function (f, i) { tone(f, 0.16, 'square', 0.16, i * 0.09); }); },
      jackpot: function () {
        resume();
        [523, 659, 784, 1047, 1319].forEach(function (f, i) { tone(f, 0.14, 'square', 0.17, i * 0.07); });
        [523, 659, 784, 1047].forEach(function (f, i) { tone(f * 2, 0.14, 'triangle', 0.10, 0.35 + i * 0.07); });
      },
      mbStart: function () {
        resume();
        for (var i = 0; i < 6; i++) noise(0.05, i * 0.07, 0.16, true);
        [262, 330, 392, 523, 659, 784, 1047].forEach(function (f, i) { tone(f, 0.12, 'square', 0.14, 0.1 + i * 0.08); });
      },
      tilt: function () { resume(); tone(130, 0.5, 'square', 0.25, 0, 110); },
      coin: function () { resume(); tone(988, 0.09, 'square', 0.22); tone(1319, 0.16, 'square', 0.22, 0.11); },
      over: function () { resume(); [392, 330, 262, 196].forEach(function (f, i) { tone(f, 0.22, 'triangle', 0.16, i * 0.16); }); }
    };
    function play(name, arg) { if (lib[name]) lib[name](arg); }

    // --- background music: sleazy funk loop -------------------------------
    var BASS = [55, 55, 65.4, 0, 82.4, 0, 65.4, 55, 55, 0, 49, 55, 65.4, 0, 82.4, 98];
    var LEAD = [0, 0, 440, 0, 523, 0, 659, 0, 0, 523, 440, 0, 392, 0, 330, 0];
    function musicStart() {
      var c = ensure();
      if (!c || musicTimer) return;
      musicOn = true; step = 0;
      musicTimer = setInterval(function () {
        if (!musicOn || !ctx) return;
        var b = BASS[step % BASS.length];
        if (b > 0) tone(b, 0.12, 'sawtooth', 0.10);
        if (step % 4 === 0) noise(0.03, 0, 0.06);
        if (step % 4 === 2) noise(0.06, 0, 0.09, true);
        var l = LEAD[step % LEAD.length];
        if (l > 0) tone(l, 0.10, 'square', 0.05);
        step++;
      }, 135);
    }
    function musicStop() { musicOn = false; if (musicTimer) { clearInterval(musicTimer); musicTimer = null; } }

    return { play: play, musicStart: musicStart, musicStop: musicStop, resume: resume,
             musicState: function () { return musicOn; } };
  }

  return { create: create };
});
