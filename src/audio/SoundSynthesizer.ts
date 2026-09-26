/**
 * BumperQuest Web Audio API Generative Synthesizer
 * Generates procedural retro arcade sound effects, FM synth chimes,
 * vinyl turntable scratch FX, and ambient vinyl crackle without any external assets.
 */

class SoundSynthesizer {
  private ctx: AudioContext | null = null;
  private masterGain: GainNode | null = null;
  private crackleGain: GainNode | null = null;
  private crackleNode: AudioBufferSourceNode | null = null;
  private isMuted: boolean = false;
  private volume: number = 0.7;
  private crackleVolume: number = 0.25;
  private isInitialized: boolean = false;

  // Pentatonic musical scale for melodic bumper feedback (Frequencies in Hz)
  private readonly notes = [
    261.63, // C4
    293.66, // D4
    329.63, // E4
    392.00, // G4
    440.00, // A4
    523.25, // C5
    587.33, // D5
    659.25, // E5
    783.99, // G5
    880.00, // A5
    1046.50 // C6
  ];

  public init() {
    if (this.isInitialized && this.ctx) {
      if (this.ctx.state === 'suspended') {
        this.ctx.resume();
      }
      return;
    }

    try {
      const AudioCtx = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
      this.ctx = new AudioCtx();

      // Master Gain
      this.masterGain = this.ctx.createGain();
      this.masterGain.gain.setValueAtTime(this.isMuted ? 0 : this.volume, this.ctx.currentTime);

      // Dynamics Compressor to glue sound and avoid clipping
      const compressor = this.ctx.createDynamicsCompressor();
      compressor.threshold.setValueAtTime(-18, this.ctx.currentTime);
      compressor.knee.setValueAtTime(20, this.ctx.currentTime);
      compressor.ratio.setValueAtTime(8, this.ctx.currentTime);
      compressor.attack.setValueAtTime(0.003, this.ctx.currentTime);
      compressor.release.setValueAtTime(0.2, this.ctx.currentTime);

      this.masterGain.connect(compressor);
      compressor.connect(this.ctx.destination);

      // Initialize ambient vinyl crackle
      this.initVinylCrackle();

      this.isInitialized = true;
    } catch (e) {
      console.warn('Web Audio API could not be initialized:', e);
    }
  }

  /**
   * Generates continuous subtle vinyl surface noise and dust clicks
   */
  private initVinylCrackle() {
    if (!this.ctx || !this.masterGain) return;

    try {
      const bufferSize = this.ctx.sampleRate * 2; // 2 seconds looping buffer
      const buffer = this.ctx.createBuffer(1, bufferSize, this.ctx.sampleRate);
      const data = buffer.getChannelData(0);

      // Fill buffer with gentle pink-ish noise and sporadic dust clicks
      let b0 = 0, b1 = 0, b2 = 0;
      for (let i = 0; i < bufferSize; i++) {
        const white = Math.random() * 2 - 1;
        b0 = 0.99 * b0 + white * 0.05;
        b1 = 0.95 * b1 + white * 0.05;
        b2 = 0.85 * b2 + white * 0.05;
        let sample = (b0 + b1 + b2) * 0.2;

        // Occasional micro-pop
        if (Math.random() < 0.0015) {
          sample += (Math.random() * 2 - 1) * 0.85;
        }
        data[i] = sample;
      }

      this.crackleNode = this.ctx.createBufferSource();
      this.crackleNode.buffer = buffer;
      this.crackleNode.loop = true;

      // Bandpass filter to make it sound like genuine vinyl phonograph groove
      const filter = this.ctx.createBiquadFilter();
      filter.type = 'bandpass';
      filter.frequency.setValueAtTime(1400, this.ctx.currentTime);
      filter.Q.setValueAtTime(1.2, this.ctx.currentTime);

      this.crackleGain = this.ctx.createGain();
      this.crackleGain.gain.setValueAtTime(this.crackleVolume * 0.35, this.ctx.currentTime);

      this.crackleNode.connect(filter);
      filter.connect(this.crackleGain);
      this.crackleGain.connect(this.masterGain);

      this.crackleNode.start(0);
    } catch (e) {
      console.warn('Failed to start vinyl crackle generator:', e);
    }
  }

  /**
   * Procedural turntable vinyl scratch:
   * Filtered noise with pitch sweep + bandpass sweep, simulating vinyl jerk and needle drag
   */
  public playTurntableScratch(intensity: number = 1.0) {
    if (!this.ctx || !this.masterGain || this.isMuted) return;
    this.ensureRunning();

    try {
      const now = this.ctx.currentTime;
      const duration = 0.18 + Math.random() * 0.12;

      // Scratch noise buffer
      const bufferSize = Math.floor(this.ctx.sampleRate * duration);
      const noiseBuffer = this.ctx.createBuffer(1, bufferSize, this.ctx.sampleRate);
      const output = noiseBuffer.getChannelData(0);
      for (let i = 0; i < bufferSize; i++) {
        output[i] = Math.random() * 2 - 1;
      }

      const noise = this.ctx.createBufferSource();
      noise.buffer = noiseBuffer;

      // Resonant sweep filter
      const filter = this.ctx.createBiquadFilter();
      filter.type = 'bandpass';
      const startFreq = 400 + Math.random() * 800;
      const peakFreq = 2200 + Math.random() * 1800;
      const endFreq = 600 + Math.random() * 500;

      filter.frequency.setValueAtTime(startFreq, now);
      filter.frequency.exponentialRampToValueAtTime(peakFreq, now + duration * 0.4);
      filter.frequency.exponentialRampToValueAtTime(endFreq, now + duration);
      filter.Q.setValueAtTime(4 + intensity * 2, now);

      // Tonality oscillator for the "wah" harmonic tone
      const osc = this.ctx.createOscillator();
      osc.type = 'sawtooth';
      const baseTone = 110 + Math.random() * 80;
      osc.frequency.setValueAtTime(baseTone, now);
      osc.frequency.exponentialRampToValueAtTime(baseTone * 3.5, now + duration * 0.35);
      osc.frequency.exponentialRampToValueAtTime(baseTone * 0.8, now + duration);

      const oscGain = this.ctx.createGain();
      oscGain.gain.setValueAtTime(0.18 * intensity, now);
      oscGain.gain.exponentialRampToValueAtTime(0.001, now + duration);

      // Overall Scratch Envelope
      const scratchGain = this.ctx.createGain();
      scratchGain.gain.setValueAtTime(0.01, now);
      scratchGain.gain.linearRampToValueAtTime(0.45 * intensity, now + 0.02);
      scratchGain.gain.exponentialRampToValueAtTime(0.001, now + duration);

      noise.connect(filter);
      filter.connect(scratchGain);
      osc.connect(oscGain);
      oscGain.connect(scratchGain);

      scratchGain.connect(this.masterGain);

      noise.start(now);
      noise.stop(now + duration);
      osc.start(now);
      osc.stop(now + duration);
    } catch (e) {
      console.warn('Scratch sound error:', e);
    }
  }

  /**
   * FM Synthesizer Chime for regular bumper collisions
   */
  public playBumperChime(noteIndex?: number) {
    if (!this.ctx || !this.masterGain || this.isMuted) return;
    this.ensureRunning();

    try {
      const now = this.ctx.currentTime;
      const index = noteIndex !== undefined 
        ? Math.abs(noteIndex) % this.notes.length 
        : Math.floor(Math.random() * this.notes.length);
      const carrierFreq = this.notes[index];
      const modulatorFreq = carrierFreq * (Math.random() > 0.5 ? 2 : 1.5);
      const duration = 0.35;

      // FM Modulator
      const modulator = this.ctx.createOscillator();
      const modGain = this.ctx.createGain();
      modulator.frequency.setValueAtTime(modulatorFreq, now);
      modGain.gain.setValueAtTime(carrierFreq * 1.8, now);
      modGain.gain.exponentialRampToValueAtTime(1, now + duration);
      modulator.connect(modGain);

      // Carrier Oscillator
      const carrier = this.ctx.createOscillator();
      carrier.type = 'sine';
      carrier.frequency.setValueAtTime(carrierFreq, now);
      modGain.connect(carrier.frequency);

      // Envelope
      const carrierGain = this.ctx.createGain();
      carrierGain.gain.setValueAtTime(0.01, now);
      carrierGain.gain.linearRampToValueAtTime(0.35, now + 0.01);
      carrierGain.gain.exponentialRampToValueAtTime(0.001, now + duration);

      carrier.connect(carrierGain);
      carrierGain.connect(this.masterGain);

      modulator.start(now);
      carrier.start(now);
      modulator.stop(now + duration);
      carrier.stop(now + duration);
    } catch (e) {
      console.warn('Bumper chime error:', e);
    }
  }

  /**
   * Tempest Spider Guardian ricochet chord / chromatic arpeggio
   */
  public playSpiderDeflection() {
    if (!this.ctx || !this.masterGain || this.isMuted) return;
    this.ensureRunning();

    try {
      const now = this.ctx.currentTime;
      const chord = [523.25, 659.25, 783.99, 1046.5]; // C E G C arpeggio

      chord.forEach((freq, idx) => {
        if (!this.ctx || !this.masterGain) return;
        const noteTime = now + idx * 0.035;
        const osc = this.ctx.createOscillator();
        const gain = this.ctx.createGain();

        osc.type = 'triangle';
        osc.frequency.setValueAtTime(freq, noteTime);

        gain.gain.setValueAtTime(0.2, noteTime);
        gain.gain.exponentialRampToValueAtTime(0.001, noteTime + 0.2);

        osc.connect(gain);
        gain.connect(this.masterGain);

        osc.start(noteTime);
        osc.stop(noteTime + 0.2);
      });
    } catch (e) {
      console.warn('Spider deflection sound error:', e);
    }
  }

  /**
   * Electric Fence Zap / Repulsion buzz
   */
  public playElectricFenceZap() {
    if (!this.ctx || !this.masterGain || this.isMuted) return;
    this.ensureRunning();

    try {
      const now = this.ctx.currentTime;
      const duration = 0.14;

      const osc = this.ctx.createOscillator();
      osc.type = 'sawtooth';
      osc.frequency.setValueAtTime(140, now);
      osc.frequency.linearRampToValueAtTime(50, now + duration);

      // Low frequency modulation buzz
      const lfo = this.ctx.createOscillator();
      lfo.frequency.setValueAtTime(60, now);
      const lfoGain = this.ctx.createGain();
      lfoGain.gain.setValueAtTime(80, now);
      lfo.connect(lfoGain);
      lfoGain.connect(osc.frequency);

      const gain = this.ctx.createGain();
      gain.gain.setValueAtTime(0.25, now);
      gain.gain.exponentialRampToValueAtTime(0.001, now + duration);

      osc.connect(gain);
      gain.connect(this.masterGain);

      lfo.start(now);
      osc.start(now);
      lfo.stop(now + duration);
      osc.stop(now + duration);
    } catch (e) {
      console.warn('Electric zap sound error:', e);
    }
  }

  /**
   * Mechanical flipper activation snap / solenoid clack
   */
  public playFlipperSnap() {
    if (!this.ctx || !this.masterGain || this.isMuted) return;
    this.ensureRunning();

    try {
      const now = this.ctx.currentTime;
      const osc = this.ctx.createOscillator();
      osc.type = 'square';
      osc.frequency.setValueAtTime(180, now);
      osc.frequency.exponentialRampToValueAtTime(40, now + 0.04);

      const gain = this.ctx.createGain();
      gain.gain.setValueAtTime(0.22, now);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.05);

      osc.connect(gain);
      gain.connect(this.masterGain);

      osc.start(now);
      osc.stop(now + 0.05);
    } catch (e) {
      console.warn('Flipper snap sound error:', e);
    }
  }

  /**
   * Dot collection rhythmic blip (Pac-man / Qix style)
   */
  public playDotBlip(counter: number = 0) {
    if (!this.ctx || !this.masterGain || this.isMuted) return;
    this.ensureRunning();

    try {
      const now = this.ctx.currentTime;
      const baseFreq = 220 + (counter % 8) * 44;
      const osc = this.ctx.createOscillator();
      osc.type = 'sine';
      osc.frequency.setValueAtTime(baseFreq, now);

      const gain = this.ctx.createGain();
      gain.gain.setValueAtTime(0.12, now);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.04);

      osc.connect(gain);
      gain.connect(this.masterGain);

      osc.start(now);
      osc.stop(now + 0.04);
    } catch (e) {
      console.warn('Dot blip error:', e);
    }
  }

  /**
   * Shape multiplier upgrade chime
   */
  public playMultiplierUpgrade(multiplier: number) {
    if (!this.ctx || !this.masterGain || this.isMuted) return;
    this.ensureRunning();

    try {
      const now = this.ctx.currentTime;
      const osc = this.ctx.createOscillator();
      osc.type = 'triangle';
      const startFreq = 440 + Math.min(multiplier * 30, 800);
      osc.frequency.setValueAtTime(startFreq, now);
      osc.frequency.exponentialRampToValueAtTime(startFreq * 1.5, now + 0.15);

      const gain = this.ctx.createGain();
      gain.gain.setValueAtTime(0.28, now);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.18);

      osc.connect(gain);
      gain.connect(this.masterGain);

      osc.start(now);
      osc.stop(now + 0.18);
    } catch (e) {
      console.warn('Multiplier sound error:', e);
    }
  }

  private ensureRunning() {
    if (this.ctx && this.ctx.state === 'suspended') {
      this.ctx.resume().catch(() => {});
    }
  }

  public setMute(muted: boolean) {
    this.isMuted = muted;
    if (this.masterGain && this.ctx) {
      this.masterGain.gain.setValueAtTime(muted ? 0 : this.volume, this.ctx.currentTime);
    }
  }

  public setVolume(vol: number) {
    this.volume = Math.max(0, Math.min(1, vol));
    if (this.masterGain && this.ctx && !this.isMuted) {
      this.masterGain.gain.setValueAtTime(this.volume, this.ctx.currentTime);
    }
  }

  public setCrackleVolume(vol: number) {
    this.crackleVolume = Math.max(0, Math.min(1, vol));
    if (this.crackleGain && this.ctx) {
      this.crackleGain.gain.setValueAtTime(this.crackleVolume * 0.35, this.ctx.currentTime);
    }
  }

  public getMuted() {
    return this.isMuted;
  }
}

export const soundSynth = new SoundSynthesizer();
