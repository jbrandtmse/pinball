// NOVA STRIKE — high score table (localStorage) with classic initials entry.

const KEY = 'novaStrike.highScores.v1';
const MAX = 5;

const DEFAULTS = [
  { initials: 'NASA', score: 1500000 },
  { initials: 'ACE', score: 1000000 },
  { initials: 'NOVA', score: 750000 },
  { initials: 'JET', score: 500000 },
  { initials: 'RIO', score: 250000 }
];

export class HighScores {
  constructor(dmd) {
    this.dmd = dmd;
    this.list = this.load();
    this.dmd.setHighs(this.list);
    this.entry = null;
  }

  load() {
    try {
      const raw = localStorage.getItem(KEY);
      if (raw) {
        const l = JSON.parse(raw);
        if (Array.isArray(l) && l.length) return l;
      }
    } catch (e) { /* private mode etc. */ }
    return [...DEFAULTS];
  }

  save() {
    try { localStorage.setItem(KEY, JSON.stringify(this.list)); } catch (e) {}
  }

  qualify(score) {
    return score > 0 && (this.list.length < MAX || score > this.list[this.list.length - 1].score);
  }

  // Initials entry: left/right flipper = cycle letter, start = lock letter.
  beginEntry(score, done) {
    this.entry = { score, initials: 'AAA', pos: 0, done };
    this.renderEntry();
  }

  renderEntry() {
    const e = this.entry;
    if (!e) return;
    const shown = e.initials.split('').map((c, i) => i === e.pos ? '_' + c + '_' : ' ' + c + ' ').join('');
    this.dmd.message(['NEW HIGH SCORE!', shown], 9999, true);
  }

  entryKey(key) {
    const e = this.entry;
    if (!e) return false;
    const A = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789'.split('');
    const chars = e.initials.split('');
    const cur = A.indexOf(chars[e.pos]);
    if (key === 'left') chars[e.pos] = A[(cur + A.length - 1) % A.length];
    else if (key === 'right') chars[e.pos] = A[(cur + 1) % A.length];
    else if (key === 'enter') {
      e.pos++;
      if (e.pos >= 3) {
        this.insert(e.initials, e.score);
        this.entry = null;
        this.dmd.message(['SCORE', 'SAVED'], 2, true);
        e.done && e.done();
        return true;
      }
    } else if (key === 'back') {
      if (e.pos > 0) e.pos--;
    }
    e.initials = chars.join('');
    this.renderEntry();
    return true;
  }

  insert(initials, score) {
    this.list.push({ initials, score });
    this.list.sort((a, b) => b.score - a.score);
    this.list = this.list.slice(0, MAX);
    this.save();
    this.dmd.setHighs(this.list);
  }

  get entering() { return !!this.entry; }
}
