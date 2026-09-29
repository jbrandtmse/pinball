// DMD scenes: small procedural animations drawn into the 128x32 buffer.
// Each factory returns { draw(dmd, t, duration) }.
import { DMD_W, DMD_H } from './dmd.js';

export function fmt(n) { return Math.round(n).toLocaleString('en-US'); }
const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
const ease = (x) => 1 - Math.pow(1 - clamp(x, 0, 1), 3);

// Deterministic pseudo-random for twinkles
function hash(n) { n = (n << 13) ^ n; return ((n * (n * n * 15731 + 789221) + 1376312589) & 0x7fffffff) / 0x7fffffff; }

function skyline(d, t, y0 = 32, scroll = 0, v = 5) {
  let x = -((scroll | 0) % 64);
  let k = Math.floor(scroll / 64) * 9;
  while (x < DMD_W) {
    const w = 5 + Math.floor(hash(k * 7 + 1) * 9);
    const h = 5 + Math.floor(hash(k * 13 + 3) * 13);
    for (let i = 0; i < w; i++) for (let j = 0; j < h; j++) {
      const px = x + i, py = y0 - 1 - j;
      d.set(px, py, 2);
      if (i > 0 && i < w - 1 && j > 1 && j < h - 1 && i % 2 === 1 && j % 3 === 1) {
        if (hash(k * 31 + i * 7 + j * 3 + Math.floor(t * 0.7 + k)) > 0.55) d.set(px, py, v + 4);
      }
    }
    if (hash(k * 17) > 0.7) { for (let j = 0; j < 4; j++) d.set(x + (w >> 1), y0 - 1 - h - j, 3); }
    x += w + 1; k++;
  }
}

function stars(d, t, n = 30) {
  for (let i = 0; i < n; i++) {
    const x = Math.floor(hash(i * 3 + 1) * DMD_W), y = Math.floor(hash(i * 5 + 2) * 16);
    const tw = 0.5 + 0.5 * Math.sin(t * (1 + hash(i) * 3) + i);
    d.px(x, y, Math.round(2 + tw * 6));
  }
}

function burst(d, t, cx, cy, v = 6) {
  const n = 18;
  for (let i = 0; i < n; i++) {
    const a = i / n * Math.PI * 2 + t * 0.8;
    const r0 = 8 + (t * 60) % 20, r1 = r0 + 14;
    d.line(cx + Math.cos(a) * r0, cy + Math.sin(a) * r0 * 0.5, cx + Math.cos(a) * r1, cy + Math.sin(a) * r1 * 0.5, v);
  }
}

// Vault door: ring, bolts and a rotating spoked wheel. `open` 0..1 swings it aside.
function vaultDoor(d, cx, cy, r, rot, open = 0, v = 12) {
  const shift = Math.round(open * (r * 2 + 6));
  const x = cx - shift;
  d.circle(x, cy, r, v);
  d.circle(x, cy, r - 2, Math.max(3, v - 6));
  for (let i = 0; i < 8; i++) {
    const a = i / 8 * Math.PI * 2;
    d.px(x + Math.round(Math.cos(a) * (r - 1)), cy + Math.round(Math.sin(a) * (r - 1)), 15);
  }
  for (let i = 0; i < 3; i++) {
    const a = rot + i / 3 * Math.PI;
    d.line(x - Math.cos(a) * (r - 4), cy - Math.sin(a) * (r - 4), x + Math.cos(a) * (r - 4), cy + Math.sin(a) * (r - 4), v);
  }
  d.circle(x, cy, 2, 15, true);
  if (open > 0) {
    // gold glow behind the door
    for (let j = -r + 2; j < r - 1; j++) for (let i = -r + 2; i < r - 1; i++) {
      if (i * i + j * j < (r - 2) * (r - 2) && (i + j + 64) % 3 === 0) d.px(cx + i, cy + j, Math.round(4 + 8 * open));
    }
  }
}

export function logo() {
  return {
    draw(d, t) {
      stars(d, t);
      // moon
      d.circle(112, 7, 4, 8, true); d.circle(114, 6, 4, 0, true);
      for (let j = 3; j <= 11; j++) for (let i = 108; i <= 116; i++) if ((i - 112) ** 2 + (j - 7) ** 2 <= 16 && (i - 114) ** 2 + (j - 6) ** 2 > 16) d.set(i, j, 9);
      skyline(d, t, 32, t * 6, 4);
      const s = ease(t / 0.8);
      const x1 = Math.round(-80 + s * 144);
      d.text('MIDNIGHT', x1, 3, { font: 'f5', bold: true, align: 'center', v: 15 });
      const s2 = ease((t - 0.5) / 0.8);
      d.bigText('HEIST', Math.round(64 + (1 - s2) * 120), 12, { scale: 2, align: 'center', bold: false, v: 15 });
      // spotlight sweep across the title
      const sx = ((t * 50) % 220) - 40;
      for (let y = 0; y < 26; y++) for (let x = Math.round(sx - 3 + y * 0.3); x < sx + 3 + y * 0.3; x++) {
        const v = d.get(x, y); if (v > 8) d.set(x, y, 15); else if (v === 0) d.set(x, y, 1);
      }
    },
  };
}

export function city() {
  return {
    draw(d, t) {
      stars(d, t, 40);
      skyline(d, t, 32, t * 12, 6);
      // searchlight
      const a = -Math.PI / 2 + Math.sin(t * 0.9) * 0.7;
      for (let r = 0; r < 40; r++) for (let w = -Math.floor(r / 6); w <= Math.floor(r / 6); w++) {
        const x = 64 + Math.cos(a) * r - Math.sin(a) * w, y = 30 + Math.sin(a) * r + Math.cos(a) * w;
        if (d.get(Math.round(x), Math.round(y)) < 3) d.px(x, y, 3);
      }
      d.text('THE CITY SLEEPS', 64, 2, { align: 'center', v: 12 });
    },
  };
}

export function bigText(title, sub = '') {
  return {
    draw(d, t, dur) {
      const fade = Math.min(1, t * 6);
      const long = d.textWidth(title, 'f5') > 60;
      if (!sub) {
        if (long) d.text(title, 64, 12, { align: 'center', bold: true, v: Math.round(15 * fade) });
        else d.bigText(title, 64, 9, { scale: 2, align: 'center', v: Math.round(15 * fade) });
        return;
      }
      if (long) d.text(title, 64, 5, { align: 'center', bold: true, v: 15 });
      else d.bigText(title, 64, 1, { scale: 2, align: 'center', v: 15 });
      d.text(sub, 64, long ? 19 : 22, { align: 'center', v: 10 });
    },
  };
}

export function textPage(lines) {
  return {
    draw(d, t) {
      const y0 = Math.round(16 - lines.length * 5);
      lines.forEach((l, i) => {
        const k = clamp((t - i * 0.25) * 4, 0, 1);
        d.text(l, 64, y0 + i * 10, { align: 'center', v: Math.round(15 * k) });
      });
      for (let x = 0; x < DMD_W; x += 2) { d.px(x, 0, 3); d.px(x + 1, 31, 3); }
    },
  };
}

export function highScorePage(title, entries, startRank = 0) {
  return {
    draw(d, t) {
      d.text(title, 64, 1, { align: 'center', bold: true, v: 15 });
      d.line(8, 9, 120, 9, 4);
      entries.forEach((e, i) => {
        if (!e) return;
        const y = entries.length === 1 ? 14 : 12 + i * 10;
        const label = startRank ? `${startRank + i}) ${e.name}` : e.name;
        if (entries.length === 1) {
          d.text(e.name, 64, 12, { align: 'center', v: 12 });
          d.text(fmt(e.score), 64, 22, { align: 'center', v: 15, bold: true });
        } else {
          d.text(label, 4, y, { v: 12 });
          d.text(fmt(e.score), 124, y, { align: 'right', v: 15 });
        }
      });
    },
  };
}

export function lastScores(scores) {
  return {
    draw(d) {
      d.text('LAST GAME', 64, 1, { align: 'center', v: 12 });
      scores.forEach((s, i) => {
        const x = i % 2 === 0 ? 4 : 124, y = 11 + Math.floor(i / 2) * 10;
        d.text(`P${i + 1} ${fmt(s)}`, x, y, { align: i % 2 === 0 ? 'left' : 'right', v: 14, font: 'f5' });
      });
    },
  };
}

export function ballStart(pn, ball, nPlayers) {
  return {
    draw(d, t) {
      const s = ease(t / 0.4);
      d.text(nPlayers > 1 ? `PLAYER ${pn}` : 'GET READY', 64, Math.round(-8 + s * 11), { align: 'center', v: 12 });
      d.bigText(`BALL ${ball}`, 64, 13, { scale: 2, align: 'center', v: 15 });
    },
  };
}

export function award(title, value, sub) {
  return {
    draw(d, t) {
      const flash = t < 0.5 && Math.floor(t * 16) % 2 === 0;
      d.text(title, 64, 2, { align: 'center', bold: true, v: flash ? 6 : 15 });
      if (value != null) {
        const txt = fmt(value);
        const w = d.textWidth(txt, 'big');
        if (w <= 124) d.text(txt, 64, 12, { font: 'big', align: 'center', v: 15 });
        else d.text(txt, 64, 15, { align: 'center', bold: true });
      }
      if (sub) d.text(sub, 64, value != null ? 26 : 16, { align: 'center', v: value != null ? 9 : 13, font: value != null ? 'f3' : 'f5' });
    },
  };
}

export function jackpot(title, value) {
  return {
    draw(d, t, dur) {
      burst(d, t, 64, 16, 4);
      const pulse = Math.floor(t * 10) % 2;
      const w = d.textWidth(title, 'f5', { bold: true });
      d.fill(64 - (w >> 1) - 3, 1, w + 6, 10, 0);
      d.text(title, 64, 2, { align: 'center', bold: true, v: pulse ? 15 : 10 });
      const shown = t < 0.9 ? value * ease(t / 0.9) : value;
      const txt = fmt(Math.round(shown / 10) * 10);
      const tw = d.textWidth(txt, 'big');
      d.fill(64 - (tw >> 1) - 2, 13, tw + 4, 15, 0);
      d.text(txt, 64, 14, { font: 'big', align: 'center', v: 15 });
      if (t < 0.25) d.invert(0, 0, DMD_W, DMD_H);
    },
  };
}

export function vaultOpen(sub) {
  return {
    draw(d, t) {
      const open = ease((t - 0.6) / 0.8);
      vaultDoor(d, 22, 16, 13, t * 4 * (1 - open * 0.8), open);
      d.text('THE VAULT', 88, 4, { align: 'center', bold: true });
      d.text('IS OPEN', 88, 14, { align: 'center', v: 12 });
      d.text(sub, 88, 25, { align: 'center', font: 'f3', v: Math.floor(t * 6) % 2 ? 15 : 8 });
    },
  };
}

export function ballLocked(n) {
  return {
    draw(d, t) {
      const close = ease(t / 0.7);
      vaultDoor(d, 22, 16, 13, t * 3, 1 - close);
      d.text(`BALL ${n}`, 88, 4, { align: 'center', bold: true });
      d.text('LOCKED', 88, 14, { align: 'center', bold: true, v: Math.floor(t * 8) % 2 ? 15 : 9 });
      d.text(n < 2 ? 'LOCK 3 FOR MULTIBALL' : 'NEXT LOCK: MULTIBALL', 88, 25, { align: 'center', font: 'f3', v: 9 });
    },
  };
}

export function multiball() {
  return {
    draw(d, t) {
      // alarm lights sweeping
      // spinning alarm beacons either side of the headline
      for (let i = 0; i < 2; i++) {
        const a = t * 6 + i * Math.PI;
        const cx = i ? 96 : 32;
        for (let r = 2; r < 12; r++) { d.px(cx + Math.cos(a) * r, 5 + Math.sin(a) * r * 0.35, 6); d.px(cx - Math.cos(a) * r, 5 - Math.sin(a) * r * 0.35, 6); }
        d.circle(cx, 5, 2, 15, true);
      }
      const on = Math.floor(t * 8) % 2 === 0;
      d.text('VAULT', 64, 2, { align: 'center', bold: true, v: on ? 15 : 9 });
      d.bigText('MULTIBALL', 64, 12, { scale: 2, align: 'center', v: 15 });
      if (t < 0.2 || (t > 1 && t < 1.1)) d.invert(0, 0, DMD_W, DMD_H);
    },
  };
}

export function mystery(name) {
  return {
    draw(d, t) {
      d.text('MYSTERY', 64, 2, { align: 'center', bold: true });
      if (t < 1.0) {
        const opts = ['BIG POINTS', 'EXTRA BALL', 'BONUS X', 'KICKBACK', 'SPINNER', 'ALARMS', 'SCOUT'];
        d.text(opts[Math.floor(t * 20) % opts.length], 64, 16, { align: 'center', v: 8 });
      } else d.text(name, 64, 16, { align: 'center', bold: true, v: 15 });
      for (let i = 0; i < 6; i++) d.text('?', 6 + i * 23 + Math.round(Math.sin(t * 5 + i) * 2), 25, { font: 'f3', v: 5 });
    },
  };
}

export function jobSelect(getJob, getTimer) {
  return {
    draw(d, t) {
      const j = getJob();
      d.text('SELECT YOUR JOB', 64, 1, { align: 'center', font: 'f3', v: 10 });
      d.text(j.name, 64, 10, { align: 'center', bold: true });
      d.text(j.blurb, 64, 20, { align: 'center', font: 'f3', v: 11 });
      const a = Math.floor(t * 4) % 2 ? 15 : 7;
      d.text('<', 3, 10, { v: a }); d.text('>', 120, 10, { v: a });
      d.text(`${Math.max(0, Math.ceil(getTimer()))}`, 124, 26, { font: 'f3', align: 'right', v: 8 });
      d.text('FLIPPERS CHOOSE  START OK', 60, 26, { font: 'f3', align: 'center', v: 6 });
    },
  };
}

export function jobIntro(def) {
  return {
    draw(d, t) {
      const s = ease(t / 0.5);
      d.fill(0, 0, Math.round(128 * s), 11, 3);
      d.text('JOB STARTED', 64, 2, { align: 'center', v: 15, bold: true });
      d.text(def.name, 64, 14, { align: 'center', v: 15 });
      d.text(def.blurb, 64, 25, { align: 'center', font: 'f3', v: Math.floor(t * 5) % 2 ? 14 : 8 });
    },
  };
}

export function jobHit(name, value, sub) {
  return {
    draw(d, t) {
      d.text(name, 64, 1, { align: 'center', font: 'f3', v: 10 });
      d.text(fmt(value), 64, 10, { font: 'big', align: 'center' });
      d.text(sub, 64, 25, { align: 'center', font: 'f3', v: 12 });
      if (t < 0.12) d.invert(0, 0, DMD_W, DMD_H);
    },
  };
}

export function jobComplete(name, value) {
  return {
    draw(d, t) {
      burst(d, t, 64, 16, 3);
      d.fill(8, 0, 112, 32, 0);
      d.text(name, 64, 1, { align: 'center', v: 12 });
      d.text('COMPLETE', 64, 10, { align: 'center', bold: true, v: Math.floor(t * 8) % 2 ? 15 : 10 });
      if (value) d.text(fmt(value), 64, 21, { align: 'center', bold: true });
    },
  };
}

export function bigScoreIntro() {
  return {
    draw(d, t) {
      stars(d, t, 50);
      skyline(d, t, 32, t * 30, 8);
      d.fill(10, 2, 108, 20, 0);
      d.text('THE', 64, 3, { align: 'center', v: 12 });
      d.bigText('BIG SCORE', 64, 11, { scale: 2, align: 'center', v: Math.floor(t * 6) % 2 ? 15 : 11 });
      if (Math.floor(t * 3) % 3 === 0) d.invert(0, 0, DMD_W, 2);
    },
  };
}

export function bonusCount(lines, mult, total) {
  const step = 1.1;
  return {
    draw(d, t) {
      const i = Math.floor(t / step);
      d.text('BONUS', 64, 1, { align: 'center', bold: true });
      if (i < lines.length) {
        const [name, n, v] = lines[i];
        d.text(`${n} ${name}`, 64, 12, { align: 'center', v: 13 });
        d.text(`X ${fmt(v)}`, 64, 22, { align: 'center', v: 10 });
      } else if (t < lines.length * step + 1.1) {
        d.text(`${fmt(total)}`, 64, 12, { align: 'center', v: 13 });
        d.text(`X ${mult}`, 64, 22, { align: 'center', bold: true });
      } else {
        d.text('TOTAL BONUS', 64, 11, { align: 'center', font: 'f3', v: 10 });
        d.text(fmt(total * mult), 64, 19, { align: 'center', bold: true });
      }
    },
  };
}

export function match(num, digits, matched) {
  return {
    draw(d, t) {
      d.text('MATCH', 32, 4, { align: 'center', bold: true });
      digits.forEach((dg, i) => d.text(String(dg).padStart(2, '0'), 12 + i * 14, 20, { v: 9 }));
      const shown = t < 2.2 ? (Math.floor(t * 12) % 10) * 10 : num;
      d.bigText(String(shown).padStart(2, '0'), 96, 6, { scale: 2, align: 'center', v: t > 2.2 && matched && Math.floor(t * 8) % 2 ? 8 : 15 });
    },
  };
}

export function hsEntry(getHs) {
  return {
    draw(d, t) {
      const h = getHs(); if (!h) return;
      d.text(`PLAYER ${h.player.n}`, 64, 0, { align: 'center', font: 'f3', v: 9 });
      d.text(h.rank === 0 ? 'GRAND CHAMPION!' : 'ENTER INITIALS', 64, 7, { align: 'center', bold: true });
      for (let i = 0; i < 3; i++) {
        const ch = h.charset[h.letters[i]];
        const x = 14 + i * 15;
        const cur = i === h.pos;
        const v = cur ? (Math.floor(t * 5) % 2 ? 15 : 6) : i < h.pos ? 15 : 4;
        d.bigText(ch === ' ' ? '_' : ch, x + 3, 16, { scale: 2, align: 'center', v });
      }
      d.text(fmt(h.player.score), 126, 20, { align: 'right', font: 'f3', v: 9 });
      d.text('FLIPPERS + START', 126, 27, { align: 'right', font: 'f3', v: 5 });
    },
  };
}

// ------------------------------------------------------------- base displays
export function drawScores(d, t, players, pi, ball, credits) {
  const p = players[pi];
  if (players.length === 1) {
    const txt = fmt(p.score);
    const w = d.textWidth(txt, 'big');
    if (w <= 126) d.text(txt, 64, 4, { font: 'big', align: 'center' });
    else d.text(txt, 64, 7, { align: 'center', bold: true });
    d.text(`BALL ${ball}`, 2, 26, { font: 'f3', v: 9 });
    d.text(credits, 126, 26, { font: 'f3', align: 'right', v: 6 });
    return;
  }
  // multi-player: active score large, others in corners
  const corners = [[2, 0, 'left'], [126, 0, 'right'], [2, 27, 'left'], [126, 27, 'right']];
  players.forEach((pl, i) => {
    if (i === pi) return;
    const [x, y, al] = corners[i];
    d.text(fmt(pl.score), x, y, { font: 'f3', align: al, v: 7 });
  });
  const txt = fmt(p.score);
  if (d.textWidth(txt, 'big') <= 110) d.text(txt, 64, 9, { font: 'big', align: 'center' });
  else d.text(txt, 64, 12, { align: 'center', bold: true });
  const [cx, cy, al] = corners[pi];
  d.text(`P${pi + 1} BALL ${ball}`, cx, cy, { font: 'f3', align: al, v: Math.floor(t * 2) % 2 ? 12 : 6 });
}

export function drawJobStatus(d, t, job, p, game) {
  d.text(job.def.name, 2, 0, { font: 'f3', v: 10 });
  d.text(String(Math.max(0, Math.ceil(job.time))), 126, 0, { align: 'right', bold: true, v: job.time < 6 && Math.floor(t * 4) % 2 ? 6 : 15 });
  d.text(fmt(p.score), 64, 11, { align: 'center', bold: true });
  let info = '';
  switch (job.id) {
    case 'CASE': info = `LIT SHOTS ${fmt(job.value)}`; break;
    case 'SAFE': info = `SPINS ${job.progress}/${job.need}`; break;
    case 'LASER': info = `GRIDS ${job.progress}/${job.need}  750,000 EACH`; break;
    case 'DRIVE': info = `RAMPS ${job.progress}/${job.need}  ${fmt(job.value)}`; break;
    case 'INSIDE': info = `VAULT ${fmt(Math.round(job.value / 10000) * 10000)}`; break;
    case 'CROSS': info = `HIT THE MOVING SHOT ${job.progress}/${job.need}`; break;
  }
  d.text(info, 64, 25, { align: 'center', font: 'f3', v: 12 });
  // timer bar
  const frac = clamp(job.time / job.def.time, 0, 1);
  d.line(2, 8, 2 + Math.round(40 * frac), 8, 5);
}

export function drawMultiballStatus(d, t, mb, p) {
  d.text('VAULT MULTIBALL', 64, 0, { align: 'center', font: 'f3', v: Math.floor(t * 3) % 2 ? 12 : 7 });
  const txt = fmt(p.score);
  if (d.textWidth(txt, 'big') <= 126) d.text(txt, 64, 8, { font: 'big', align: 'center' });
  else d.text(txt, 64, 11, { align: 'center', bold: true });
  d.text(mb.superLit ? `SUPER JACKPOT AT VAULT` : `JACKPOT ${fmt(mb.jpValue)}`, 64, 26, { align: 'center', font: 'f3', v: 13 });
}

export function drawWizardStatus(d, t, w, p) {
  d.text('THE BIG SCORE', 64, 0, { align: 'center', font: 'f3', v: Math.floor(t * 4) % 2 ? 15 : 8 });
  const txt = fmt(p.score);
  if (d.textWidth(txt, 'big') <= 126) d.text(txt, 64, 8, { font: 'big', align: 'center' });
  else d.text(txt, 64, 11, { align: 'center', bold: true });
  d.text(w.superLit ? 'VAULT: 100,000,000' : `SHOTS WORTH ${fmt(w.value * w.level)}`, 64, 26, { align: 'center', font: 'f3', v: 13 });
}
