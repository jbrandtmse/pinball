// Top-5 high score table persisted to localStorage. Initials are entered the same way
// real arcade/pinball machines do it: cycle letters with the flippers, confirm with launch.
const HighScores = {
  KEY: 'krakensGold.highScores.v1',
  MAX_ENTRIES: 5,

  DEFAULTS: [
    { initials: 'WMS', score: 250000 },
    { initials: 'JOS', score: 200000 },
    { initials: 'PIN', score: 150000 },
    { initials: 'BAL', score: 100000 },
    { initials: 'ARC', score: 50000 },
  ],

  load() {
    try {
      const raw = localStorage.getItem(this.KEY);
      if (!raw) return this.DEFAULTS.map(e => ({ ...e }));
      const parsed = JSON.parse(raw);
      if (!Array.isArray(parsed) || parsed.length === 0) return this.DEFAULTS.map(e => ({ ...e }));
      return parsed;
    } catch (e) {
      return this.DEFAULTS.map(e => ({ ...e }));
    }
  },

  save(list) {
    try { localStorage.setItem(this.KEY, JSON.stringify(list)); } catch (e) { /* storage unavailable -- ignore */ }
  },

  qualifies(score) {
    if (score <= 0) return false;
    const list = this.load();
    if (list.length < this.MAX_ENTRIES) return true;
    return score > list[list.length - 1].score;
  },

  rankFor(score) {
    const list = this.load();
    let rank = list.length;
    for (let i = 0; i < list.length; i++) {
      if (score > list[i].score) { rank = i; break; }
    }
    return rank;
  },

  addScore(initials, score) {
    const list = this.load();
    list.push({ initials: initials || '---', score });
    list.sort((a, b) => b.score - a.score);
    const trimmed = list.slice(0, this.MAX_ENTRIES);
    this.save(trimmed);
    return trimmed;
  },

  topScore() {
    const list = this.load();
    return list.length ? list[0].score : 0;
  },
};
