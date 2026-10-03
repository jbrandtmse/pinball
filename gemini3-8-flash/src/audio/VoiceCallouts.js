/**
 * VoiceCallouts - Digitized Speech Synthesis for Arcade Callouts
 * Recreates classic 90s Williams DCS digitized speech announcements.
 */
export class VoiceCallouts {
  constructor(soundEngine) {
    this.soundEngine = soundEngine;
    this.speechSynth = typeof window !== 'undefined' && 'speechSynthesis' in window ? window.speechSynthesis : null;
    this.voice = null;

    if (this.speechSynth) {
      const loadVoices = () => {
        const voices = this.speechSynth.getVoices();
        // Look for crisp English voice
        this.voice = voices.find(v => v.lang.startsWith('en') && (v.name.includes('David') || v.name.includes('Male') || v.name.includes('Google'))) || voices[0];
      };
      loadVoices();
      if (this.speechSynth.onvoiceschanged !== undefined) {
        this.speechSynth.onvoiceschanged = loadVoices;
      }
    }
  }

  speak(text) {
    if (!this.speechSynth || (this.soundEngine && this.soundEngine.isMuted)) return;

    try {
      this.speechSynth.cancel(); // Cancel any lingering utterance
      const utterance = new SpeechSynthesisUtterance(text);
      if (this.voice) utterance.voice = this.voice;
      utterance.pitch = 0.82; // Slightly pitched down robotic/arcade feel
      utterance.rate = 1.15;  // Punchy arcade cadence
      utterance.volume = 0.9;
      this.speechSynth.speak(utterance);
    } catch (e) {
      console.warn('Speech synthesis error:', e);
    }
  }

  callout(name) {
    const callouts = {
      lock_1: 'Containment lock one engaged',
      lock_2: 'Containment lock two engaged',
      multiball: 'Warning! Core critical! Multiball!',
      jackpot: 'Jackpot!',
      super_jackpot: 'Super Jackpot collected!',
      super_jackpot_lit: 'Super Jackpot lit at the core!',
      coolant_restored: 'Coolant restored! Core stabilized',
      multiplier: 'Core power multiplied!',
      kickback: 'Magnetic kickback online'
    };

    if (callouts[name]) {
      this.speak(callouts[name]);
    }
  }
}

