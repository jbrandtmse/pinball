/**
 * HighScoreManager - Persistent LocalStorage High Score Table & Initials Entry
 */
export class HighScoreManager {
  constructor() {
    this.storageKey = 'quantum_core_pinball_highscores';
    this.highScores = this.loadScores();

    // Initials entry state
    this.letters = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789!?- ';
    this.initials = ['A', 'A', 'A'];
    this.currentIndex = 0;
    this.pendingScore = 0;
    this.isEntering = false;
  }

  loadScores() {
    try {
      const data = localStorage.getItem(this.storageKey);
      if (data) {
        return JSON.parse(data);
      }
    } catch (e) {
      console.warn('Could not read high scores from localStorage:', e);
    }

    // Default classic arcade high scores
    return [
      { name: 'JMS', score: 25000000 },
      { name: 'NEO', score: 18500000 },
      { name: 'TRX', score: 14200000 },
      { name: 'WPC', score: 11000000 },
      { name: 'ACE', score: 8500000 },
      { name: 'RAD', score: 6200000 },
      { name: 'CYB', score: 4800000 },
      { name: 'MAX', score: 3500000 },
      { name: 'FOX', score: 2400000 },
      { name: 'BOB', score: 1500000 }
    ];
  }

  saveScores() {
    try {
      localStorage.setItem(this.storageKey, JSON.stringify(this.highScores));
    } catch (e) {
      console.warn('Could not save high scores to localStorage:', e);
    }
  }

  isHighScore(score) {
    if (this.highScores.length < 10) return true;
    return score > this.highScores[this.highScores.length - 1].score;
  }

  startInitialsEntry(score) {
    this.pendingScore = score;
    this.initials = ['A', 'A', 'A'];
    this.currentIndex = 0;
    this.isEntering = true;
  }

  nextLetter() {
    if (!this.isEntering) return;
    const current = this.initials[this.currentIndex];
    const idx = this.letters.indexOf(current);
    const nextIdx = (idx + 1) % this.letters.length;
    this.initials[this.currentIndex] = this.letters[nextIdx];
  }

  prevLetter() {
    if (!this.isEntering) return;
    const current = this.initials[this.currentIndex];
    const idx = this.letters.indexOf(current);
    const prevIdx = (idx - 1 + this.letters.length) % this.letters.length;
    this.initials[this.currentIndex] = this.letters[prevIdx];
  }

  confirmLetter() {
    if (!this.isEntering) return false;
    this.currentIndex++;
    if (this.currentIndex >= 3) {
      // Completed initials!
      const name = this.initials.join('');
      this.addScore(name, this.pendingScore);
      this.isEntering = false;
      return true; // Finished
    }
    return false; // Moving to next letter
  }

  addScore(name, score) {
    this.highScores.push({ name, score });
    this.highScores.sort((a, b) => b.score - a.score);
    if (this.highScores.length > 10) {
      this.highScores.length = 10;
    }
    this.saveScores();
  }

  getRank(score) {
    for (let i = 0; i < this.highScores.length; i++) {
      if (score >= this.highScores[i].score) {
        return i + 1;
      }
    }
    return null;
  }
}

