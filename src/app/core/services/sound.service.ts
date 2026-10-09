import { Injectable } from '@angular/core';

@Injectable({ providedIn: 'root' })
export class SoundService {
  private ctx: AudioContext | null = null;
  public isMuted = false;

  toggleMute(): void {
    this.isMuted = !this.isMuted;
  }

  private initCtx(): AudioContext {
    if (!this.ctx) {
      const AudioCtx = window.AudioContext || (window as any).webkitAudioContext;
      this.ctx = new AudioCtx();
    }
    if (this.ctx.state === 'suspended') {
      this.ctx.resume();
    }
    return this.ctx;
  }

  // ── Move piece (clean wood click) ──────────────────────────────────────────
  playMove(): void {
    if (this.isMuted) return;
    try {
      const ctx = this.initCtx();
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();

      osc.type = 'sine';
      osc.frequency.setValueAtTime(320, ctx.currentTime);
      osc.frequency.exponentialRampToValueAtTime(120, ctx.currentTime + 0.06);

      gain.gain.setValueAtTime(0.35, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.06);

      osc.connect(gain);
      gain.connect(ctx.destination);

      osc.start(ctx.currentTime);
      osc.stop(ctx.currentTime + 0.06);
    } catch (e) {
      // Audio autoplay blocked or unsupported — ignore silently
    }
  }

  // ── Capture piece (heavy impact knock) ─────────────────────────────────────
  playCapture(): void {
    if (this.isMuted) return;
    try {
      const ctx = this.initCtx();
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();

      osc.type = 'triangle';
      osc.frequency.setValueAtTime(180, ctx.currentTime);
      osc.frequency.exponentialRampToValueAtTime(50, ctx.currentTime + 0.1);

      gain.gain.setValueAtTime(0.6, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.1);

      osc.connect(gain);
      gain.connect(ctx.destination);

      osc.start(ctx.currentTime);
      osc.stop(ctx.currentTime + 0.1);
    } catch (e) {}
  }

  // ── Check alert (two-tone ping) ─────────────────────────────────────────────
  playCheck(): void {
    if (this.isMuted) return;
    try {
      const ctx = this.initCtx();
      const now = ctx.currentTime;

      // First note: C5 (523Hz)
      const osc1 = ctx.createOscillator();
      const gain1 = ctx.createGain();
      osc1.frequency.setValueAtTime(523, now);
      gain1.gain.setValueAtTime(0.3, now);
      gain1.gain.exponentialRampToValueAtTime(0.001, now + 0.15);
      osc1.connect(gain1);
      gain1.connect(ctx.destination);
      osc1.start(now);
      osc1.stop(now + 0.15);

      // Second note: E5 (659Hz)
      const osc2 = ctx.createOscillator();
      const gain2 = ctx.createGain();
      osc2.frequency.setValueAtTime(659, now + 0.1);
      gain2.gain.setValueAtTime(0.35, now + 0.1);
      gain2.gain.exponentialRampToValueAtTime(0.001, now + 0.3);
      osc2.connect(gain2);
      gain2.connect(ctx.destination);
      osc2.start(now + 0.1);
      osc2.stop(now + 0.3);
    } catch (e) {}
  }

  // ── Game start / Reveal (bright 3-note arpeggio) ───────────────────────────
  playGameStart(): void {
    if (this.isMuted) return;
    try {
      const ctx = this.initCtx();
      const notes = [261.63, 329.63, 392.00, 523.25]; // C4, E4, G4, C5
      notes.forEach((freq, idx) => {
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        const start = ctx.currentTime + idx * 0.08;

        osc.type = 'sine';
        osc.frequency.setValueAtTime(freq, start);

        gain.gain.setValueAtTime(0.25, start);
        gain.gain.exponentialRampToValueAtTime(0.001, start + 0.25);

        osc.connect(gain);
        gain.connect(ctx.destination);

        osc.start(start);
        osc.stop(start + 0.25);
      });
    } catch (e) {}
  }

  // ── Victory fanfare ────────────────────────────────────────────────────────
  playVictory(): void {
    if (this.isMuted) return;
    try {
      const ctx = this.initCtx();
      const notes = [523.25, 659.25, 783.99, 1046.50]; // C5, E5, G5, C6
      notes.forEach((freq, idx) => {
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        const start = ctx.currentTime + idx * 0.12;

        osc.type = 'triangle';
        osc.frequency.setValueAtTime(freq, start);

        gain.gain.setValueAtTime(0.4, start);
        gain.gain.exponentialRampToValueAtTime(0.001, start + 0.4);

        osc.connect(gain);
        gain.connect(ctx.destination);

        osc.start(start);
        osc.stop(start + 0.4);
      });
    } catch (e) {}
  }

  // ── Defeat / Loss ──────────────────────────────────────────────────────────
  playDefeat(): void {
    if (this.isMuted) return;
    try {
      const ctx = this.initCtx();
      const notes = [392.00, 311.13, 261.63]; // G4, Eb4, C4
      notes.forEach((freq, idx) => {
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        const start = ctx.currentTime + idx * 0.18;

        osc.type = 'sawtooth';
        osc.frequency.setValueAtTime(freq, start);

        gain.gain.setValueAtTime(0.2, start);
        gain.gain.exponentialRampToValueAtTime(0.001, start + 0.35);

        osc.connect(gain);
        gain.connect(ctx.destination);

        osc.start(start);
        osc.stop(start + 0.35);
      });
    } catch (e) {}
  }

  // ── Ready click ────────────────────────────────────────────────────────────
  playReady(): void {
    if (this.isMuted) return;
    try {
      const ctx = this.initCtx();
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();

      osc.type = 'sine';
      osc.frequency.setValueAtTime(440, ctx.currentTime);
      osc.frequency.exponentialRampToValueAtTime(880, ctx.currentTime + 0.08);

      gain.gain.setValueAtTime(0.3, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.08);

      osc.connect(gain);
      gain.connect(ctx.destination);

      osc.start(ctx.currentTime);
      osc.stop(ctx.currentTime + 0.08);
    } catch (e) {}
  }

  // ── Countdown beep (for match start 3..2..1) ────────────────────────────────
  playCountdownBeep(isFinal: boolean = false): void {
    if (this.isMuted) return;
    try {
      const ctx = this.initCtx();
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();

      osc.type = isFinal ? 'triangle' : 'sine';
      const freq = isFinal ? 880 : 440;
      const duration = isFinal ? 0.25 : 0.12;

      osc.frequency.setValueAtTime(freq, ctx.currentTime);
      gain.gain.setValueAtTime(0.4, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + duration);

      osc.connect(gain);
      gain.connect(ctx.destination);

      osc.start(ctx.currentTime);
      osc.stop(ctx.currentTime + duration);
    } catch (e) {}
  }

  // ── Denial / Illegal move buzz sound ──────────────────────────────────────
  playDenial(): void {
    if (this.isMuted) return;
    try {
      const ctx = this.initCtx();
      const now = ctx.currentTime;

      [0, 0.09].forEach(delay => {
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();

        osc.type = 'sawtooth';
        osc.frequency.setValueAtTime(140, now + delay);
        osc.frequency.exponentialRampToValueAtTime(90, now + delay + 0.07);

        gain.gain.setValueAtTime(0.35, now + delay);
        gain.gain.exponentialRampToValueAtTime(0.001, now + delay + 0.07);

        osc.connect(gain);
        gain.connect(ctx.destination);

        osc.start(now + delay);
        osc.stop(now + delay + 0.07);
      });
    } catch (e) {}
  }

  // ── Battleship Cannon Hit (Deep Heavy Boom with Pitch Variation) ───────────
  playBattleshipHit(): void {
    if (this.isMuted) return;
    try {
      const ctx = this.initCtx();
      const now = ctx.currentTime;

      // Subtle organic pitch variants around base frequency (+/- 3.5%)
      const pitchFactor = 0.965 + Math.random() * 0.07;
      const startFreq = 160 * pitchFactor;
      const filterCutoff = 650 * pitchFactor;

      // Sub-bass pitch drop (boom)
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = 'sawtooth';
      osc.frequency.setValueAtTime(startFreq, now);
      osc.frequency.exponentialRampToValueAtTime(22 * pitchFactor, now + 0.38);

      gain.gain.setValueAtTime(0.75, now);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.38);

      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start(now);
      osc.stop(now + 0.38);

      // Filtered noise burst for explosive impact punch
      const bufferSize = Math.floor(ctx.sampleRate * 0.28);
      const buffer = ctx.createBuffer(1, bufferSize, ctx.sampleRate);
      const data = buffer.getChannelData(0);
      for (let i = 0; i < bufferSize; i++) {
        data[i] = Math.random() * 2 - 1;
      }

      const noise = ctx.createBufferSource();
      noise.buffer = buffer;

      const filter = ctx.createBiquadFilter();
      filter.type = 'lowpass';
      filter.frequency.setValueAtTime(filterCutoff, now);
      filter.frequency.exponentialRampToValueAtTime(75, now + 0.28);

      const noiseGain = ctx.createGain();
      noiseGain.gain.setValueAtTime(0.65, now);
      noiseGain.gain.exponentialRampToValueAtTime(0.001, now + 0.28);

      noise.connect(filter);
      filter.connect(noiseGain);
      noiseGain.connect(ctx.destination);

      noise.start(now);
    } catch (e) {}
  }

  // ── Battleship Miss (Authentic Ocean Water Splash & Plop) ─────────────────
  playBattleshipSplash(): void {
    if (this.isMuted) return;
    try {
      const ctx = this.initCtx();
      const now = ctx.currentTime;

      // 1. Water Drop / Plop Component (Sine drop 850Hz -> 180Hz)
      const plopPitch = 850 + (Math.random() * 150 - 75);
      const plopOsc = ctx.createOscillator();
      const plopGain = ctx.createGain();

      plopOsc.type = 'sine';
      plopOsc.frequency.setValueAtTime(plopPitch, now);
      plopOsc.frequency.exponentialRampToValueAtTime(180, now + 0.09);

      plopGain.gain.setValueAtTime(0.4, now);
      plopGain.gain.exponentialRampToValueAtTime(0.001, now + 0.09);

      plopOsc.connect(plopGain);
      plopGain.connect(ctx.destination);
      plopOsc.start(now);
      plopOsc.stop(now + 0.09);

      // 2. Secondary Bubble Pop (delayed slightly for wet splatter effect)
      const popOsc = ctx.createOscillator();
      const popGain = ctx.createGain();
      popOsc.type = 'triangle';
      popOsc.frequency.setValueAtTime(1100, now + 0.03);
      popOsc.frequency.exponentialRampToValueAtTime(280, now + 0.11);

      popGain.gain.setValueAtTime(0.25, now + 0.03);
      popGain.gain.exponentialRampToValueAtTime(0.001, now + 0.11);

      popOsc.connect(popGain);
      popGain.connect(ctx.destination);
      popOsc.start(now + 0.03);
      popOsc.stop(now + 0.11);

      // 3. Ocean Water Spray Noise Burst (Bandpass filtered noise sweep)
      const bufferSize = Math.floor(ctx.sampleRate * 0.32);
      const buffer = ctx.createBuffer(1, bufferSize, ctx.sampleRate);
      const data = buffer.getChannelData(0);
      for (let i = 0; i < bufferSize; i++) {
        data[i] = Math.random() * 2 - 1;
      }

      const noise = ctx.createBufferSource();
      noise.buffer = buffer;

      const filter = ctx.createBiquadFilter();
      filter.type = 'bandpass';
      filter.Q.value = 2.5;
      filter.frequency.setValueAtTime(2200, now);
      filter.frequency.exponentialRampToValueAtTime(350, now + 0.28);

      const noiseGain = ctx.createGain();
      noiseGain.gain.setValueAtTime(0.01, now);
      noiseGain.gain.linearRampToValueAtTime(0.5, now + 0.04);
      noiseGain.gain.exponentialRampToValueAtTime(0.001, now + 0.28);

      noise.connect(filter);
      filter.connect(noiseGain);
      noiseGain.connect(ctx.destination);

      noise.start(now);
    } catch (e) {}
  }

  // ── Ship Destroyed (Multi-Boom Explosion sequence for total ship cells) ─────
  playShipDestroyed(cellCount: number = 4): void {
    if (this.isMuted) return;
    try {
      const count = Math.max(2, Math.min(6, cellCount));
      for (let i = 0; i < count; i++) {
        setTimeout(() => {
          this.playSingleExplosion(i === count - 1);
        }, i * 140);
      }
    } catch (e) {}
  }

  private playSingleExplosion(isFinal: boolean = false): void {
    try {
      const ctx = this.initCtx();
      const now = ctx.currentTime;
      const duration = isFinal ? 0.65 : 0.42;

      // Small organic pitch variation for each boom in the cascade (+/- 15%)
      const pitchFactor = 0.85 + Math.random() * 0.30;
      const startFreq = (isFinal ? 210 : 150) * pitchFactor;
      const filterCutoff = (isFinal ? 850 : 550) * pitchFactor;

      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = 'sawtooth';
      osc.frequency.setValueAtTime(startFreq, now);
      osc.frequency.exponentialRampToValueAtTime(18 * pitchFactor, now + duration);

      gain.gain.setValueAtTime(isFinal ? 0.85 : 0.6, now);
      gain.gain.exponentialRampToValueAtTime(0.001, now + duration);

      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start(now);
      osc.stop(now + duration);

      // Heavy explosion noise rumble
      const bufferSize = Math.floor(ctx.sampleRate * duration);
      const buffer = ctx.createBuffer(1, bufferSize, ctx.sampleRate);
      const data = buffer.getChannelData(0);
      for (let k = 0; k < bufferSize; k++) {
        data[k] = Math.random() * 2 - 1;
      }

      const noise = ctx.createBufferSource();
      noise.buffer = buffer;

      const filter = ctx.createBiquadFilter();
      filter.type = 'lowpass';
      filter.frequency.setValueAtTime(filterCutoff, now);
      filter.frequency.exponentialRampToValueAtTime(45, now + duration);

      const noiseGain = ctx.createGain();
      noiseGain.gain.setValueAtTime(isFinal ? 0.75 : 0.5, now);
      noiseGain.gain.exponentialRampToValueAtTime(0.001, now + duration);

      noise.connect(filter);
      filter.connect(noiseGain);
      noiseGain.connect(ctx.destination);

      noise.start(now);
    } catch (e) {}
  }
}
