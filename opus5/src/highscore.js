/* ============================================================================
 * RAGNAROK PINBALL — highscore.js
 * Grand Champion + top 4 + category champions, persisted to localStorage.
 * ==========================================================================*/
(function (PB) {
  'use strict';
  var U = PB.U;

  var KEY = 'ragnarok.hiscores.v1';

  var DEFAULT_LIST = [
    { initials: 'ODN', score: 250000000 },
    { initials: 'THR', score: 175000000 },
    { initials: 'LKI', score: 120000000 },
    { initials: 'FRJ', score: 85000000 },
    { initials: 'TYR', score: 50000000 }
  ];
  var DEFAULT_CATS = {
    loop: { initials: 'HMD', value: 9, label: 'LOOP CHAMPION', unit: 'LOOPS' },
    jackpot: { initials: 'SIF', value: 12, label: 'JACKPOT CHAMPION', unit: 'JACKPOTS' },
    ramp: { initials: 'BLD', value: 18, label: 'RAMP CHAMPION', unit: 'RAMPS' },
    spinner: { initials: 'JRM', value: 140, label: 'SPINNER CHAMPION', unit: 'SPINS' }
  };

  function HighScores() {
    var saved = U.store.get(KEY, null);
    this.list = (saved && saved.list) ? saved.list : JSON.parse(JSON.stringify(DEFAULT_LIST));
    this.cats = (saved && saved.cats) ? saved.cats : JSON.parse(JSON.stringify(DEFAULT_CATS));
    // repair any missing category after a version bump
    for (var k in DEFAULT_CATS) if (!this.cats[k]) this.cats[k] = JSON.parse(JSON.stringify(DEFAULT_CATS[k]));
    this.replayLevel = (saved && saved.replayLevel) || 45000000;
  }

  HighScores.prototype.save = function () {
    U.store.set(KEY, { list: this.list, cats: this.cats, replayLevel: this.replayLevel });
  };

  /** Returns the 0-based place if `score` makes the table, else -1. */
  HighScores.prototype.place = function (score) {
    for (var i = 0; i < this.list.length; i++) if (score > this.list[i].score) return i;
    return this.list.length < 5 ? this.list.length : -1;
  };

  HighScores.prototype.insert = function (initials, score) {
    var p = this.place(score);
    if (p < 0) return -1;
    this.list.splice(p, 0, { initials: initials, score: score });
    this.list.length = Math.min(this.list.length, 5);
    this.save();
    return p;
  };

  /** Category champions ("LOOP CHAMPION" etc.). Returns true when beaten. */
  HighScores.prototype.beatsCat = function (key, value) {
    var c = this.cats[key];
    return c && value > c.value;
  };
  HighScores.prototype.setCat = function (key, initials, value) {
    if (!this.cats[key]) return;
    this.cats[key].initials = initials;
    this.cats[key].value = value;
    this.save();
  };

  HighScores.prototype.reset = function () {
    this.list = JSON.parse(JSON.stringify(DEFAULT_LIST));
    this.cats = JSON.parse(JSON.stringify(DEFAULT_CATS));
    this.save();
  };

  PB.HighScores = HighScores;

  /* ------------------------------------------------------- initials entry */
  var LETTERS = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789 <';   // '<' = backspace

  function InitialsEntry(onDone, title, subtitle) {
    this.idx = 0;                 // which of the 3 slots
    this.sel = 0;                 // index into LETTERS
    this.chars = [' ', ' ', ' '];
    this.onDone = onDone;
    this.title = title || 'GREAT SCORE';
    this.subtitle = subtitle || '';
    this.timer = 22;              // seconds before auto-entering
    this.blink = 0;
    this.done = false;
  }
  InitialsEntry.LETTERS = LETTERS;

  InitialsEntry.prototype.move = function (dir) {
    this.sel = (this.sel + dir + LETTERS.length) % LETTERS.length;
    this.timer = Math.max(this.timer, 8);
    if (PB.Audio.sfx.uiMove) PB.Audio.sfx.uiMove();
  };
  InitialsEntry.prototype.select = function () {
    var ch = LETTERS[this.sel];
    if (ch === '<') {
      if (this.idx > 0) { this.idx--; this.chars[this.idx] = ' '; }
      PB.Audio.sfx.uiMove();
      return;
    }
    this.chars[this.idx] = ch;
    this.idx++;
    PB.Audio.sfx.uiSelect();
    if (this.idx >= 3) this.finish();
  };
  InitialsEntry.prototype.finish = function () {
    if (this.done) return;
    this.done = true;
    var s = this.chars.join('').replace(/ /g, '');
    if (!s) s = 'AAA';
    while (s.length < 3) s += ' ';
    this.onDone(s.substr(0, 3));
  };
  InitialsEntry.prototype.update = function (dt) {
    this.blink += dt;
    this.timer -= dt;
    if (this.timer <= 0) {
      // auto-fill whatever is left
      while (this.idx < 3) { this.chars[this.idx] = this.idx === 0 ? 'A' : ' '; this.idx++; }
      this.finish();
    }
  };
  /** Draws itself straight onto the DMD. */
  InitialsEntry.prototype.draw = function (d) {
    var F = PB.Fonts;
    d.clear(0);
    d.marquee(this.blink, 5);
    d.text(F.F5x7, this.title, 64, 2, 12, { align: 'center' });
    if (this.subtitle) d.text(F.F5x7, this.subtitle, 64, 11, 6, { align: 'center' });

    // the three slots
    var y = this.subtitle ? 19 : 13;
    for (var i = 0; i < 3; i++) {
      var x = 40 + i * 16;
      var ch = this.chars[i];
      if (i === this.idx) ch = LETTERS[this.sel] === '<' ? '<' : LETTERS[this.sel];
      var on = (i !== this.idx) || (Math.floor(this.blink * 4) % 2 === 0);
      if (ch !== ' ' && on) d.text(F.F5x7, ch, x, y, 15, { scale: 1 });
      d.fillRect(x - 1, y + 9, 7, 1, i === this.idx ? 12 : 5);
    }
    d.text(F.F5x7, Math.ceil(this.timer) + '', 122, 25, 5, { align: 'right' });
  };

  PB.InitialsEntry = InitialsEntry;

})(window.PB = window.PB || {});
