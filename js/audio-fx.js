/**
 * @file audio-fx.js
 * @description Procedural Web Audio API sound generator for military tactical feedback.
 * Synthesizes sonar pings, alarm klaxons, and radio squelch clicks with zero external audio assets.
 */

class SoundEngine {
  constructor() {
    this.ctx = null;
    this.isMuted = true; // Muted by default to comply with browser autoplay policies
  }

  /**
   * Initializes or resumes the Web Audio context on user interaction.
   */
  initContext() {
    if (!this.ctx) {
      const AudioCtx = window.AudioContext || window.webkitAudioContext;
      if (AudioCtx) {
        this.ctx = new AudioCtx();
      }
    }
    if (this.ctx && this.ctx.state === 'suspended') {
      this.ctx.resume();
    }
  }

  /**
   * Toggles mute state.
   * @param {boolean} [forceState]
   * @returns {boolean} New mute state
   */
  toggleMute(forceState) {
    this.initContext();
    this.isMuted = typeof forceState === 'boolean' ? forceState : !this.isMuted;
    return this.isMuted;
  }

  /**
   * Synthesizes a subtle tactile military UI click.
   */
  playClick() {
    if (this.isMuted || !this.ctx) return;
    try {
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();
      osc.type = 'triangle';
      osc.frequency.setValueAtTime(800, this.ctx.currentTime);
      osc.frequency.exponentialRampToValueAtTime(120, this.ctx.currentTime + 0.04);

      gain.gain.setValueAtTime(0.12, this.ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.001, this.ctx.currentTime + 0.04);

      osc.connect(gain);
      gain.connect(this.ctx.destination);
      osc.start();
      osc.stop(this.ctx.currentTime + 0.04);
    } catch {
      // Audio failed or context suspended
    }
  }

  /**
   * Tactical high-tech radar/sonar ping.
   */
  playPing() {
    if (this.isMuted || !this.ctx) return;
    try {
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();
      osc.type = 'sine';
      osc.frequency.setValueAtTime(1400, this.ctx.currentTime);
      osc.frequency.exponentialRampToValueAtTime(700, this.ctx.currentTime + 0.35);

      gain.gain.setValueAtTime(0.08, this.ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.001, this.ctx.currentTime + 0.35);

      osc.connect(gain);
      gain.connect(this.ctx.destination);
      osc.start();
      osc.stop(this.ctx.currentTime + 0.35);
    } catch {
      // Audio context issue
    }
  }

  /**
   * Emergency alert klaxon for critical hazards (SOS, Water Ingress, High CO).
   */
  playAlarm() {
    if (this.isMuted || !this.ctx) return;
    try {
      const now = this.ctx.currentTime;
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();
      osc.type = 'sawtooth';

      // Warble pitch between 880Hz and 660Hz
      osc.frequency.setValueAtTime(880, now);
      osc.frequency.setValueAtTime(660, now + 0.1);
      osc.frequency.setValueAtTime(880, now + 0.2);

      gain.gain.setValueAtTime(0.15, now);
      gain.gain.linearRampToValueAtTime(0.15, now + 0.25);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.35);

      osc.connect(gain);
      gain.connect(this.ctx.destination);
      osc.start(now);
      osc.stop(now + 0.35);
    } catch {
      // Non-blocking fail
    }
  }
}

export const soundEngine = new SoundEngine();
