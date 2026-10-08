// THUNDER CANYON — synthesized arcade audio (WebAudio, no sample files).
// Browser-only; every entry point is safe to call in Node (no-op).

const SFX = { muted: false, ctx: null, master: null, noiseBuf: null };

(function init() {
  if (typeof window === 'undefined') return;
  const AC = window.AudioContext || window.webkitAudioContext;
  if (!AC) return;
  window.addEventListener('pointerdown', ensure, { once: false });
  window.addEventListener('keydown', ensure);
})();

function ensure() {
  if (SFX.ctx) { if (SFX.ctx.state === 'suspended') SFX.ctx.resume(); return; }
  const AC = window.AudioContext || window.webkitAudioContext;
  if (!AC) return;
  SFX.ctx = new AC();
  SFX.master = SFX.ctx.createGain();
  SFX.master.gain.value = 0.5;
  SFX.master.connect(SFX.ctx.destination);
  // one noise buffer reused everywhere
  const n = SFX.ctx.sampleRate * 0.7;
  SFX.noiseBuf = SFX.ctx.createBuffer(1, n, SFX.ctx.sampleRate);
  const d = SFX.noiseBuf.getChannelData(0);
  for (let i = 0; i < n; i++) d[i] = Math.random() * 2 - 1;
}

SFX.ensure = ensure;
SFX.setMuted = (m) => { SFX.muted = m; if (SFX.master) SFX.master.gain.value = m ? 0 : 0.5; };

function env(node, t0, a, d, peak = 1) {
  const g = SFX.ctx.createGain();
  g.gain.setValueAtTime(0, t0);
  g.gain.linearRampToValueAtTime(peak, t0 + a);
  g.gain.exponentialRampToValueAtTime(0.001, t0 + a + d);
  node.connect(g);
  g.connect(SFX.master);
  return g;
}

function tone(freq, { type = 'square', a = 0.004, d = 0.12, peak = 0.4, slide = 0, t0 = null } = {}) {
  if (!SFX.ctx || SFX.muted) return;
  const t = t0 || SFX.ctx.currentTime;
  const o = SFX.ctx.createOscillator();
  o.type = type;
  o.frequency.setValueAtTime(freq, t);
  if (slide) o.frequency.exponentialRampToValueAtTime(Math.max(30, freq + slide), t + a + d);
  env(o, t, a, d, peak);
  o.start(t); o.stop(t + a + d + 0.05);
}

function noise({ dur = 0.08, lp = 2400, hp = 200, peak = 0.5, q = 0.8, t0 = null, sweep = 0 }) {
  if (!SFX.ctx || SFX.muted) return;
  const t = t0 || SFX.ctx.currentTime;
  const src = SFX.ctx.createBufferSource();
  src.buffer = SFX.noiseBuf;
  const f = SFX.ctx.createBiquadFilter();
  f.type = 'lowpass'; f.frequency.setValueAtTime(lp, t); f.Q.value = q;
  if (sweep) f.frequency.exponentialRampToValueAtTime(Math.max(120, lp * sweep), t + dur);
  const h = SFX.ctx.createBiquadFilter();
  h.type = 'highpass'; h.frequency.value = hp;
  src.connect(h); h.connect(f);
  env(f, t, 0.003, dur, peak);
  src.start(t); src.stop(t + dur + 0.05);
}

// ---- library -------------------------------------------------------------
SFX.flipperUp = () => { noise({ dur: 0.05, lp: 1800, hp: 500, peak: 0.35 }); tone(110, { type: 'triangle', d: 0.05, peak: 0.25, slide: -40 }); };
SFX.flipperDown = () => { noise({ dur: 0.04, lp: 900, hp: 200, peak: 0.16 }); };
SFX.bumper = () => {
  tone(320 + Math.random() * 60, { type: 'sawtooth', d: 0.16, peak: 0.32, slide: -180 });
  noise({ dur: 0.09, lp: 3800, hp: 800, peak: 0.4 });
};
SFX.sling = () => {
  tone(520 + Math.random() * 80, { type: 'square', d: 0.09, peak: 0.26, slide: 240 });
  noise({ dur: 0.05, lp: 5000, hp: 1200, peak: 0.3 });
};
SFX.rubber = () => { tone(210, { type: 'triangle', d: 0.06, peak: 0.18, slide: -60 }); };
SFX.target = () => { noise({ dur: 0.06, lp: 1500, hp: 300, peak: 0.4 }); tone(140, { type: 'square', d: 0.09, peak: 0.2, slide: -50 }); };
SFX.standup = () => { tone(880, { type: 'square', d: 0.07, peak: 0.22, slide: -300 }); };
SFX.roll = () => { tone(1250, { type: 'sine', d: 0.05, peak: 0.16 }); };
SFX.spinner = () => { noise({ dur: 0.14, lp: 2600, hp: 900, peak: 0.22, sweep: 0.4 }); };
SFX.gate = () => { noise({ dur: 0.035, lp: 2200, hp: 700, peak: 0.25 }); };
SFX.launch = () => { noise({ dur: 0.3, lp: 900, hp: 120, peak: 0.5, sweep: 2.6 }); tone(90, { type: 'sawtooth', d: 0.28, peak: 0.2, slide: 500 }); };
SFX.capture = () => { tone(420, { type: 'sine', d: 0.22, peak: 0.3, slide: -320 }); };
SFX.kickback = () => { noise({ dur: 0.18, lp: 1400, hp: 200, peak: 0.42, sweep: 2.2 }); };
SFX.drain = () => { tone(160, { type: 'triangle', d: 0.5, peak: 0.35, slide: -110 }); noise({ dur: 0.2, lp: 700, peak: 0.3 }); };
SFX.click = () => { tone(1600, { type: 'square', d: 0.03, peak: 0.1 }); };
SFX.jackpot = () => {
  if (!SFX.ctx) return; ensure(); if (!SFX.ctx) return;
  const t0 = SFX.ctx.currentTime;
  [523, 659, 784, 1046, 1318].forEach((f, i) =>
    tone(f, { type: 'square', d: 0.14, peak: 0.25, t0: t0 + i * 0.07 }));
  noise({ dur: 0.4, lp: 5000, hp: 1500, peak: 0.22, sweep: 0.3 });
};
SFX.modeStart = () => {
  if (!SFX.ctx) return; ensure(); if (!SFX.ctx) return;
  const t0 = SFX.ctx.currentTime;
  [392, 494, 587, 784].forEach((f, i) => tone(f, { type: 'sawtooth', d: 0.16, peak: 0.2, t0: t0 + i * 0.09 }));
};
SFX.erupt = () => { // thunder rumble
  if (!SFX.ctx) return; ensure(); if (!SFX.ctx) return;
  const t0 = SFX.ctx.currentTime;
  noise({ dur: 1.6, lp: 260, hp: 40, peak: 0.8, sweep: 0.4, t0 });
  tone(55, { type: 'sine', d: 1.4, peak: 0.5, slide: -20, t0 });
};
SFX.tilt = () => { tone(180, { type: 'sawtooth', d: 0.6, peak: 0.35, slide: -60 }); tone(178, { type: 'sawtooth', d: 0.6, peak: 0.3, t0: SFX.ctx ? SFX.ctx.currentTime + 0.05 : null }); };
SFX.gameOver = () => {
  if (!SFX.ctx) return; ensure(); if (!SFX.ctx) return;
  const t0 = SFX.ctx.currentTime;
  [392, 349, 294, 262].forEach((f, i) => tone(f, { type: 'square', d: 0.25, peak: 0.22, t0: t0 + i * 0.22 }));
};
SFX.arcadeStart = () => {
  if (!SFX.ctx) return; ensure(); if (!SFX.ctx) return;
  const t0 = SFX.ctx.currentTime;
  [262, 330, 392, 523, 659, 784].forEach((f, i) => tone(f, { type: 'square', d: 0.1, peak: 0.2, t0: t0 + i * 0.06 }));
};

if (typeof module !== 'undefined' && module.exports) module.exports = SFX;
if (typeof window !== 'undefined') window.SFX = SFX;
