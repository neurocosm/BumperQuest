/**
 * BumperQuest Web Audio API Generative Synthesizer
 * Plays procedural casual retro video game chiptune theme from the record player at start,
 * transitions to kinetic game FX, and plays melodic chimes and turntable scratches.
 * (Static noise removed per user request).
 */

class SoundSynthesizer {
  private ctx: AudioContext | null = null;
  private masterGain: GainNode | null = null;
  private musicGain: GainNode | null = null;
  private isMuted: boolean = false;
  private volume: number = 0.8;
  private musicVolume: number = 0.45;
  private isInitialized: boolean = false;
  private stateListeners: Set<(isRunning: boolean) => void> = new Set();

  // Intro music sequencer state
  private musicTimerId: number | null = null;
  private musicStep: number = 0;
  private isMusicPlaying: boolean = false;

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

  // Casual retro video game melody notes (Record player startup groove)
  // Catchy, nostalgic 16-step looping arcade tune
  private readonly introMelody = [
    329.63, 0, 392.00, 440.00, 523.25, 440.00, 392.00, 0,
    349.23, 0, 392.00, 440.00, 392.00, 329.63, 261.63, 293.66,
    329.63, 392.00, 523.25, 659.25, 587.33, 523.25, 440.00, 392.00,
    440.00, 523.25, 587.33, 659.25, 783.99, 659.25, 587.33, 523.25,
  ];

  private readonly introBass = [
    130.81, 130.81, 196.00, 130.81, 146.83, 146.83, 220.00, 146.83,
    164.81, 164.81, 246.94, 164.81, 174.61, 174.61, 261.63, 196.00,
  ];

  constructor() {
    try {
      if (typeof window !== 'undefined') {
        const AudioCtx = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
        if (AudioCtx) {
          this.init();
        }
      }
    } catch {
      // Browser gesture will activate later
    }
  }

  public init(): boolean {
    if (this.isInitialized && this.ctx) {
      if (this.ctx.state === 'suspended') {
        this.ctx.resume().then(() => this.notifyState());
      }
      return this.ctx.state === 'running';
    }

    try {
      const AudioCtx = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
      if (!AudioCtx) return false;

      this.ctx = new AudioCtx();

      // Master Gain
      this.masterGain = this.ctx.createGain();
      this.masterGain.gain.setValueAtTime(this.isMuted ? 0 : this.volume, this.ctx.currentTime);

      // Music Gain node
      this.musicGain = this.ctx.createGain();
      this.musicGain.gain.setValueAtTime(this.musicVolume, this.ctx.currentTime);
      this.musicGain.connect(this.masterGain);

      // Dynamics Compressor to glue sound and avoid clipping
      const compressor = this.ctx.createDynamicsCompressor();
      compressor.threshold.setValueAtTime(-16, this.ctx.currentTime);
      compressor.knee.setValueAtTime(20, this.ctx.currentTime);
      compressor.ratio.setValueAtTime(6, this.ctx.currentTime);
      compressor.attack.setValueAtTime(0.003, this.ctx.currentTime);
      compressor.release.setValueAtTime(0.2, this.ctx.currentTime);

      this.masterGain.connect(compressor);
      compressor.connect(this.ctx.destination);

      this.ctx.onstatechange = () => {
        this.notifyState();
      };

      this.isInitialized = true;
      this.notifyState();
      return this.ctx.state === 'running';
    } catch (e) {
      console.warn('Web Audio API could not be initialized yet:', e);
      return false;
    }
  }

  /**
   * Unlock AudioContext on direct user gesture and start the turntable casual intro music
   */
  public async unlock(): Promise<boolean> {
    if (!this.ctx) {
      this.init();
    }
    if (this.ctx) {
      if (this.ctx.state === 'suspended') {
        try {
          await this.ctx.resume();
        } catch (e) {
          console.warn('Failed to resume AudioContext:', e);
        }
      }
      this.notifyState();
      return this.ctx.state === 'running';
    }
    return false;
  }

  public isRunning(): boolean {
    return !!this.ctx && this.ctx.state === 'running' && !this.isMuted;
  }

  public isSuspended(): boolean {
    return !this.ctx || this.ctx.state === 'suspended';
  }

  public subscribeState(listener: (isRunning: boolean) => void): () => void {
    this.stateListeners.add(listener);
    listener(this.isRunning());
    return () => {
      this.stateListeners.delete(listener);
    };
  }

  private notifyState() {
    const running = this.isRunning();
    this.stateListeners.forEach((fn) => fn(running));
  }

  /**
   * Starts the casual record player retro video game intro theme
   */
  public startIntroTheme() {
    if (this.isMusicPlaying || !this.ctx) return;
    this.ensureRunning();
    this.isMusicPlaying = true;
    this.musicStep = 0;

    if (this.musicGain && this.ctx) {
      this.musicGain.gain.setValueAtTime(this.musicVolume, this.ctx.currentTime);
    }

    const stepDurationMs = 135; // ~111 BPM groovy casual tempo

    this.musicTimerId = window.setInterval(() => {
      if (!this.isMusicPlaying || !this.ctx || this.isMuted) return;
      if (this.ctx.state !== 'running') return;

      const now = this.ctx.currentTime;

      // 1. Play melody note
      const melodyFreq = this.introMelody[this.musicStep % this.introMelody.length];
      if (melodyFreq > 0) {
        this.playChiptuneNote(melodyFreq, 0.12, 'square', 0.16, now);
      }

      // 2. Play bass note
      const bassFreq = this.introBass[Math.floor(this.musicStep / 2) % this.introBass.length];
      if (this.musicStep % 2 === 0 && bassFreq > 0) {
        this.playChiptuneNote(bassFreq, 0.18, 'triangle', 0.26, now);
      }

      // 3. Subtle retro arcade click / drum tick on beat 2 and 4
      if (this.musicStep % 4 === 2) {
        this.playSnareTick(now);
      }

      this.musicStep++;
    }, stepDurationMs);
  }

  /**
   * Smoothly fades out the record player intro music when the game starts/action kicks in
   */
  public fadeOutIntroTheme(durationSec: number = 1.2) {
    if (!this.isMusicPlaying || !this.ctx || !this.musicGain) return;
    try {
      const now = this.ctx.currentTime;
      this.musicGain.gain.setValueAtTime(this.musicGain.gain.value, now);
      this.musicGain.gain.linearRampToValueAtTime(0.001, now + durationSec);
      setTimeout(() => {
        this.stopIntroTheme();
      }, durationSec * 1000);
    } catch {
      this.stopIntroTheme();
    }
  }

  public stopIntroTheme() {
    this.isMusicPlaying = false;
    if (this.musicTimerId !== null) {
      clearInterval(this.musicTimerId);
      this.musicTimerId = null;
    }
  }

  /**
   * Pauses all audio synthesizer activity and intro music immediately when game pauses
   */
  public pausePlayback() {
    // Stop the interval timer to avoid background ticking
    if (this.musicTimerId !== null) {
      clearInterval(this.musicTimerId);
      this.musicTimerId = null;
    }
    // Suspend audio context to instantly freeze all sound waves, reverbs, and music
    if (this.ctx && this.ctx.state === 'running') {
      this.ctx.suspend().catch(() => {});
    }
  }

  /**
   * Resumes audio playback cleanly when game unpauses
   */
  public resumePlayback() {
    if (this.ctx && this.ctx.state === 'suspended') {
      this.ctx.resume().catch(() => {});
    }
    // If intro music was active, restart sequencer interval smoothly
    if (this.isMusicPlaying && this.musicTimerId === null) {
      const stepDurationMs = 150;
      this.musicTimerId = window.setInterval(() => {
        if (!this.ctx || !this.musicGain || this.ctx.state === 'suspended') return;
        const now = this.ctx.currentTime;
        const melodyFreq = this.introMelody[this.musicStep % this.introMelody.length];
        if (melodyFreq > 0) {
          const oscType: OscillatorType = (this.musicStep % 8 < 4) ? 'square' : 'triangle';
          this.playChiptuneNote(melodyFreq, 0.12, oscType, 0.08, now);
        }
        const bassFreq = this.introBass[Math.floor(this.musicStep / 2) % this.introBass.length];
        if (this.musicStep % 2 === 0 && bassFreq > 0) {
          this.playChiptuneNote(bassFreq, 0.18, 'triangle', 0.14, now);
        }
        if (this.musicStep % 4 === 2) {
          this.playSnareTick(now);
        }
        this.musicStep++;
      }, stepDurationMs);
    }
  }

  public isIntroPlaying(): boolean {
    return this.isMusicPlaying;
  }

  private playChiptuneNote(freq: number, duration: number, type: OscillatorType, gainAmt: number, time: number) {
    if (!this.ctx || !this.musicGain) return;

    try {
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();

      osc.type = type;
      osc.frequency.setValueAtTime(freq, time);

      // Subtle vinyl turntable wow & flutter pitch wobble
      const wobble = Math.sin(time * 3.5) * (freq * 0.005);
      osc.frequency.setValueAtTime(freq + wobble, time);

      // Low pass filter to give it warm record-player quality
      const filter = this.ctx.createBiquadFilter();
      filter.type = 'lowpass';
      filter.frequency.setValueAtTime(type === 'square' ? 2400 : 1200, time);

      gain.gain.setValueAtTime(0.01, time);
      gain.gain.linearRampToValueAtTime(gainAmt, time + 0.01);
      gain.gain.exponentialRampToValueAtTime(0.0001, time + duration);

      osc.connect(filter);
      filter.connect(gain);
      gain.connect(this.musicGain);

      osc.start(time);
      osc.stop(time + duration);
    } catch {
      // Ignored
    }
  }

  private playSnareTick(time: number) {
    if (!this.ctx || !this.musicGain) return;
    try {
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();
      osc.type = 'triangle';
      osc.frequency.setValueAtTime(180, time);
      osc.frequency.exponentialRampToValueAtTime(40, time + 0.04);

      gain.gain.setValueAtTime(0.1, time);
      gain.gain.exponentialRampToValueAtTime(0.001, time + 0.04);

      osc.connect(gain);
      gain.connect(this.musicGain);

      osc.start(time);
      osc.stop(time + 0.04);
    } catch {}
  }

  private ensureRunning() {
    if (this.ctx && this.ctx.state === 'suspended') {
      this.ctx.resume().then(() => this.notifyState()).catch(() => {});
    }
  }

  /**
   * Procedural turntable vinyl scratch:
   * Filtered noise with pitch sweep + bandpass sweep, simulating vinyl needle drag and slip
   */
  public playTurntableScratch(intensity: number = 1.0) {
    if (!this.ctx || !this.masterGain || this.isMuted) return;
    this.ensureRunning();

    try {
      const now = this.ctx.currentTime;
      const duration = 0.18 + Math.random() * 0.12;

      const bufferSize = Math.max(256, Math.floor(this.ctx.sampleRate * duration));
      const noiseBuffer = this.ctx.createBuffer(1, bufferSize, this.ctx.sampleRate);
      const output = noiseBuffer.getChannelData(0);
      for (let i = 0; i < bufferSize; i++) {
        output[i] = Math.random() * 2 - 1;
      }

      const noise = this.ctx.createBufferSource();
      noise.buffer = noiseBuffer;

      const filter = this.ctx.createBiquadFilter();
      filter.type = 'bandpass';
      const startFreq = 400 + Math.random() * 600;
      const peakFreq = 2000 + Math.random() * 1500;
      const endFreq = 500 + Math.random() * 400;

      filter.frequency.setValueAtTime(Math.max(20, startFreq), now);
      filter.frequency.exponentialRampToValueAtTime(Math.max(20, peakFreq), now + duration * 0.4);
      filter.frequency.exponentialRampToValueAtTime(Math.max(20, endFreq), now + duration);
      filter.Q.setValueAtTime(4 + intensity * 2, now);

      const osc = this.ctx.createOscillator();
      osc.type = 'sawtooth';
      const baseTone = 110 + Math.random() * 80;
      osc.frequency.setValueAtTime(baseTone, now);
      osc.frequency.exponentialRampToValueAtTime(baseTone * 3.5, now + duration * 0.35);
      osc.frequency.exponentialRampToValueAtTime(Math.max(20, baseTone * 0.8), now + duration);

      const oscGain = this.ctx.createGain();
      oscGain.gain.setValueAtTime(0.22 * intensity, now);
      oscGain.gain.exponentialRampToValueAtTime(0.0001, now + duration);

      const scratchGain = this.ctx.createGain();
      scratchGain.gain.setValueAtTime(0.01, now);
      scratchGain.gain.linearRampToValueAtTime(0.55 * intensity, now + 0.02);
      scratchGain.gain.exponentialRampToValueAtTime(0.0001, now + duration);

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
   * Celebratory Fanfare Sound for completing a Quad-Flipper cycle (hitting all 4 flippers)!
   */
  public playQuadCycleBonusSound() {
    if (!this.ctx || !this.masterGain || this.isMuted) return;
    this.ensureRunning();

    try {
      const now = this.ctx.currentTime;
      // Vibrant celebratory ascending fanfare arpeggio: C5 - E5 - G5 - C6
      const fanfareNotes = [523.25, 659.25, 783.99, 1046.50, 1318.51];
      fanfareNotes.forEach((freq, i) => {
        if (!this.ctx || !this.masterGain) return;
        const noteTime = now + i * 0.07;
        const osc = this.ctx.createOscillator();
        const gain = this.ctx.createGain();

        osc.type = 'triangle';
        osc.frequency.setValueAtTime(freq, noteTime);

        gain.gain.setValueAtTime(0.01, noteTime);
        gain.gain.linearRampToValueAtTime(0.35, noteTime + 0.01);
        gain.gain.exponentialRampToValueAtTime(0.0001, noteTime + 0.28);

        osc.connect(gain);
        gain.connect(this.masterGain);

        osc.start(noteTime);
        osc.stop(noteTime + 0.28);
      });
    } catch (e) {
      console.warn('Quad cycle bonus sound error:', e);
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
      const modulatorFreq = carrierFreq * 2;
      const duration = 0.38;

      const modulator = this.ctx.createOscillator();
      const modGain = this.ctx.createGain();
      modulator.frequency.setValueAtTime(modulatorFreq, now);
      modGain.gain.setValueAtTime(carrierFreq * 1.8, now);
      modGain.gain.exponentialRampToValueAtTime(0.001, now + duration);
      modulator.connect(modGain);

      const carrier = this.ctx.createOscillator();
      carrier.type = 'sine';
      carrier.frequency.setValueAtTime(carrierFreq, now);
      modGain.connect(carrier.frequency);

      const carrierGain = this.ctx.createGain();
      carrierGain.gain.setValueAtTime(0.01, now);
      carrierGain.gain.linearRampToValueAtTime(0.4, now + 0.01);
      carrierGain.gain.exponentialRampToValueAtTime(0.0001, now + duration);

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
      const chord = [523.25, 659.25, 783.99, 1046.5];

      chord.forEach((freq, idx) => {
        if (!this.ctx || !this.masterGain) return;
        const noteTime = now + idx * 0.04;
        const osc = this.ctx.createOscillator();
        const gain = this.ctx.createGain();

        osc.type = 'triangle';
        osc.frequency.setValueAtTime(freq, noteTime);

        gain.gain.setValueAtTime(0.01, noteTime);
        gain.gain.linearRampToValueAtTime(0.28, noteTime + 0.01);
        gain.gain.exponentialRampToValueAtTime(0.0001, noteTime + 0.22);

        osc.connect(gain);
        gain.connect(this.masterGain);

        osc.start(noteTime);
        osc.stop(noteTime + 0.22);
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
      const duration = 0.15;

      const osc = this.ctx.createOscillator();
      osc.type = 'sawtooth';
      osc.frequency.setValueAtTime(160, now);
      osc.frequency.linearRampToValueAtTime(45, now + duration);

      const lfo = this.ctx.createOscillator();
      lfo.frequency.setValueAtTime(65, now);
      const lfoGain = this.ctx.createGain();
      lfoGain.gain.setValueAtTime(90, now);
      lfo.connect(lfoGain);
      lfoGain.connect(osc.frequency);

      const gain = this.ctx.createGain();
      gain.gain.setValueAtTime(0.01, now);
      gain.gain.linearRampToValueAtTime(0.3, now + 0.01);
      gain.gain.exponentialRampToValueAtTime(0.0001, now + duration);

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
      osc.frequency.setValueAtTime(220, now);
      osc.frequency.exponentialRampToValueAtTime(35, now + 0.05);

      const gain = this.ctx.createGain();
      gain.gain.setValueAtTime(0.01, now);
      gain.gain.linearRampToValueAtTime(0.25, now + 0.005);
      gain.gain.exponentialRampToValueAtTime(0.0001, now + 0.05);

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
      const baseFreq = 260 + (counter % 8) * 44;
      const osc = this.ctx.createOscillator();
      osc.type = 'sine';
      osc.frequency.setValueAtTime(baseFreq, now);

      const gain = this.ctx.createGain();
      gain.gain.setValueAtTime(0.01, now);
      gain.gain.linearRampToValueAtTime(0.18, now + 0.005);
      gain.gain.exponentialRampToValueAtTime(0.0001, now + 0.05);

      osc.connect(gain);
      gain.connect(this.masterGain);

      osc.start(now);
      osc.stop(now + 0.05);
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
      const startFreq = 440 + Math.min(multiplier * 35, 900);
      osc.frequency.setValueAtTime(startFreq, now);
      osc.frequency.exponentialRampToValueAtTime(startFreq * 1.6, now + 0.16);

      const gain = this.ctx.createGain();
      gain.gain.setValueAtTime(0.01, now);
      gain.gain.linearRampToValueAtTime(0.32, now + 0.01);
      gain.gain.exponentialRampToValueAtTime(0.0001, now + 0.2);

      osc.connect(gain);
      gain.connect(this.masterGain);

      osc.start(now);
      osc.stop(now + 0.2);
    } catch (e) {
      console.warn('Multiplier sound error:', e);
    }
  }

  /**
   * All X-Multipliers Activated Multiball Matrix Surge Sound
   */
  public playMultiballMatrixSurge() {
    if (!this.ctx || !this.masterGain || this.isMuted) return;
    this.ensureRunning();

    try {
      const now = this.ctx.currentTime;
      const surgeNotes = [349.23, 440.00, 523.25, 659.25, 880.00, 1046.50];
      surgeNotes.forEach((freq, idx) => {
        if (!this.ctx || !this.masterGain) return;
        const noteTime = now + idx * 0.055;
        const osc = this.ctx.createOscillator();
        const gain = this.ctx.createGain();

        osc.type = 'sawtooth';
        osc.frequency.setValueAtTime(freq, noteTime);
        osc.frequency.exponentialRampToValueAtTime(freq * 1.5, noteTime + 0.18);

        const filter = this.ctx.createBiquadFilter();
        filter.type = 'lowpass';
        filter.frequency.setValueAtTime(800, noteTime);
        filter.frequency.exponentialRampToValueAtTime(3200, noteTime + 0.12);

        gain.gain.setValueAtTime(0.01, noteTime);
        gain.gain.linearRampToValueAtTime(0.3, noteTime + 0.01);
        gain.gain.exponentialRampToValueAtTime(0.0001, noteTime + 0.22);

        osc.connect(filter);
        filter.connect(gain);
        gain.connect(this.masterGain);

        osc.start(noteTime);
        osc.stop(noteTime + 0.22);
      });
    } catch (e) {
      console.warn('Matrix surge sound error:', e);
    }
  }

  /**
   * Crystalline blip when fresh dots are seeded or woven onto the table
   */
  public playDotSpawnChime() {
    if (!this.ctx || !this.masterGain || this.isMuted) return;
    this.ensureRunning();

    try {
      const now = this.ctx.currentTime;
      [880, 1318.51].forEach((freq, i) => {
        if (!this.ctx || !this.masterGain) return;
        const noteTime = now + i * 0.04;
        const osc = this.ctx.createOscillator();
        const gain = this.ctx.createGain();

        osc.type = 'sine';
        osc.frequency.setValueAtTime(freq, noteTime);

        gain.gain.setValueAtTime(0.01, noteTime);
        gain.gain.linearRampToValueAtTime(0.15, noteTime + 0.005);
        gain.gain.exponentialRampToValueAtTime(0.0001, noteTime + 0.12);

        osc.connect(gain);
        gain.connect(this.masterGain);

        osc.start(noteTime);
        osc.stop(noteTime + 0.12);
      });
    } catch (e) {
      console.warn('Dot spawn sound error:', e);
    }
  }

  /**
   * Pac-Man Side Warp Tunnel Hyperspace Sound
   */
  public playPacManWarpSound() {
    if (!this.ctx || !this.masterGain || this.isMuted) return;
    this.ensureRunning();

    try {
      const now = this.ctx.currentTime;
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();

      osc.type = 'sine';
      // Quick pitch swoop up and down simulating passing through a warp portal
      osc.frequency.setValueAtTime(320, now);
      osc.frequency.exponentialRampToValueAtTime(980, now + 0.07);
      osc.frequency.exponentialRampToValueAtTime(420, now + 0.16);

      gain.gain.setValueAtTime(0.01, now);
      gain.gain.linearRampToValueAtTime(0.24, now + 0.02);
      gain.gain.exponentialRampToValueAtTime(0.0001, now + 0.16);

      osc.connect(gain);
      gain.connect(this.masterGain);

      osc.start(now);
      osc.stop(now + 0.16);
    } catch (e) {
      console.warn('Warp sound error:', e);
    }
  }

  /**
   * Snappy Steel Ball-to-Ball Ricochet Clack Sound
   */
  public playBallRicochet() {
    if (!this.ctx || !this.masterGain || this.isMuted) return;
    this.ensureRunning();

    try {
      const now = this.ctx.currentTime;
      // High-pitched glassy steel clack
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();

      osc.type = 'triangle';
      osc.frequency.setValueAtTime(1600 + Math.random() * 400, now);
      osc.frequency.exponentialRampToValueAtTime(800, now + 0.045);

      gain.gain.setValueAtTime(0.01, now);
      gain.gain.linearRampToValueAtTime(0.28, now + 0.003);
      gain.gain.exponentialRampToValueAtTime(0.0001, now + 0.045);

      osc.connect(gain);
      gain.connect(this.masterGain);

      osc.start(now);
      osc.stop(now + 0.045);
    } catch (e) {
      console.warn('Ball ricochet sound error:', e);
    }
  }

  /**
   * Game Pause Chime
   */
  public playPauseSound() {
    if (!this.ctx || !this.masterGain || this.isMuted) return;
    this.ensureRunning();

    try {
      const now = this.ctx.currentTime;
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();

      osc.type = 'sine';
      osc.frequency.setValueAtTime(659.25, now); // E5
      osc.frequency.setValueAtTime(523.25, now + 0.08); // C5
      osc.frequency.exponentialRampToValueAtTime(329.63, now + 0.22); // E4

      gain.gain.setValueAtTime(0.01, now);
      gain.gain.linearRampToValueAtTime(0.25, now + 0.01);
      gain.gain.exponentialRampToValueAtTime(0.0001, now + 0.22);

      osc.connect(gain);
      gain.connect(this.masterGain);

      osc.start(now);
      osc.stop(now + 0.22);
    } catch (e) {
      console.warn('Pause sound error:', e);
    }
  }

  /**
   * Game Resume Chime
   */
  public playResumeSound() {
    if (!this.ctx || !this.masterGain || this.isMuted) return;
    this.ensureRunning();

    try {
      const now = this.ctx.currentTime;
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();

      osc.type = 'sine';
      osc.frequency.setValueAtTime(523.25, now); // C5
      osc.frequency.setValueAtTime(659.25, now + 0.08); // E5
      osc.frequency.exponentialRampToValueAtTime(880.00, now + 0.22); // A5

      gain.gain.setValueAtTime(0.01, now);
      gain.gain.linearRampToValueAtTime(0.25, now + 0.01);
      gain.gain.exponentialRampToValueAtTime(0.0001, now + 0.22);

      osc.connect(gain);
      gain.connect(this.masterGain);

      osc.start(now);
      osc.stop(now + 0.22);
    } catch (e) {
      console.warn('Resume sound error:', e);
    }
  }

  /**
   * Laser Slicer Sound - High energy plasma slice
   */
  public playLaserSlice() {
    if (!this.ctx || !this.masterGain || this.isMuted) return;
    this.ensureRunning();

    try {
      const now = this.ctx.currentTime;
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();

      osc.type = 'sawtooth';
      osc.frequency.setValueAtTime(2400, now);
      osc.frequency.exponentialRampToValueAtTime(320, now + 0.12);

      gain.gain.setValueAtTime(0.01, now);
      gain.gain.linearRampToValueAtTime(0.32, now + 0.005);
      gain.gain.exponentialRampToValueAtTime(0.0001, now + 0.12);

      osc.connect(gain);
      gain.connect(this.masterGain);

      osc.start(now);
      osc.stop(now + 0.12);
    } catch (e) {
      console.warn('Laser slice sound error:', e);
    }
  }

  /**
   * Stasis Capture Sound - Graviton tractor trap
   */
  public playStasisCapture() {
    if (!this.ctx || !this.masterGain || this.isMuted) return;
    this.ensureRunning();

    try {
      const now = this.ctx.currentTime;
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();

      osc.type = 'sine';
      osc.frequency.setValueAtTime(1200, now);
      osc.frequency.exponentialRampToValueAtTime(220, now + 0.28);

      gain.gain.setValueAtTime(0.01, now);
      gain.gain.linearRampToValueAtTime(0.35, now + 0.02);
      gain.gain.exponentialRampToValueAtTime(0.0001, now + 0.28);

      osc.connect(gain);
      gain.connect(this.masterGain);

      osc.start(now);
      osc.stop(now + 0.28);
    } catch (e) {
      console.warn('Stasis capture sound error:', e);
    }
  }

  /**
   * Stasis Release Sound - Overcharged kinetic catapult
   */
  public playStasisRelease() {
    if (!this.ctx || !this.masterGain || this.isMuted) return;
    this.ensureRunning();

    try {
      const now = this.ctx.currentTime;
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();

      osc.type = 'sine';
      osc.frequency.setValueAtTime(220, now);
      osc.frequency.exponentialRampToValueAtTime(1400, now + 0.16);

      gain.gain.setValueAtTime(0.01, now);
      gain.gain.linearRampToValueAtTime(0.4, now + 0.02);
      gain.gain.exponentialRampToValueAtTime(0.0001, now + 0.25);

      osc.connect(gain);
      gain.connect(this.masterGain);

      osc.start(now);
      osc.stop(now + 0.25);
    } catch (e) {
      console.warn('Stasis release sound error:', e);
    }
  }

  /**
   * Elastic Bowing Bumper Snappy Twang
   */
  public playElasticBumperSnap() {
    if (!this.ctx || !this.masterGain || this.isMuted) return;
    this.ensureRunning();

    try {
      const now = this.ctx.currentTime;
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();

      osc.type = 'triangle';
      osc.frequency.setValueAtTime(480, now);
      osc.frequency.exponentialRampToValueAtTime(120, now + 0.15);

      gain.gain.setValueAtTime(0.01, now);
      gain.gain.linearRampToValueAtTime(0.35, now + 0.005);
      gain.gain.exponentialRampToValueAtTime(0.0001, now + 0.15);

      osc.connect(gain);
      gain.connect(this.masterGain);

      osc.start(now);
      osc.stop(now + 0.15);
    } catch (e) {
      console.warn('Elastic bumper sound error:', e);
    }
  }

  /**
   * Radical Spiked Pinwheel Ricochet Turbine Kick Sound
   */
  public playPinwheelRicochet() {
    if (!this.ctx || !this.masterGain || this.isMuted) return;
    this.ensureRunning();

    try {
      const now = this.ctx.currentTime;
      // Punchy mechanical twang + saw ricochet buzz
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();

      osc.type = 'sawtooth';
      osc.frequency.setValueAtTime(880, now);
      osc.frequency.exponentialRampToValueAtTime(220, now + 0.14);

      const filter = this.ctx.createBiquadFilter();
      filter.type = 'bandpass';
      filter.frequency.setValueAtTime(1400, now);
      filter.Q.setValueAtTime(3.0, now);

      gain.gain.setValueAtTime(0.01, now);
      gain.gain.linearRampToValueAtTime(0.35, now + 0.008);
      gain.gain.exponentialRampToValueAtTime(0.0001, now + 0.14);

      osc.connect(filter);
      filter.connect(gain);
      gain.connect(this.masterGain);

      osc.start(now);
      osc.stop(now + 0.14);
    } catch (e) {
      console.warn('Pinwheel sound error:', e);
    }
  }

  /**
   * Secret Needle Super Flipper Activation Chime
   */
  public playSuperNeedleActivate() {
    if (!this.ctx || !this.masterGain || this.isMuted) return;
    this.ensureRunning();

    try {
      const now = this.ctx.currentTime;
      // Ascending futuristic chime chord
      const chords = [523.25, 659.25, 783.99, 1046.50, 1318.51];
      chords.forEach((freq, idx) => {
        if (!this.ctx || !this.masterGain) return;
        const noteTime = now + idx * 0.045;
        const osc = this.ctx.createOscillator();
        const gain = this.ctx.createGain();

        osc.type = 'triangle';
        osc.frequency.setValueAtTime(freq, noteTime);
        osc.frequency.exponentialRampToValueAtTime(freq * 1.08, noteTime + 0.2);

        gain.gain.setValueAtTime(0.01, noteTime);
        gain.gain.linearRampToValueAtTime(0.2, noteTime + 0.01);
        gain.gain.exponentialRampToValueAtTime(0.0001, noteTime + 0.28);

        osc.connect(gain);
        gain.connect(this.masterGain);

        osc.start(noteTime);
        osc.stop(noteTime + 0.28);
      });
    } catch (e) {
      console.warn('Super needle activate error:', e);
    }
  }

  /**
   * Secret Needle Super Flipper Whip-Kicker Blast
   */
  public playSuperNeedleFlip() {
    if (!this.ctx || !this.masterGain || this.isMuted) return;
    this.ensureRunning();

    try {
      const now = this.ctx.currentTime;
      // Deep sub-bass punch + electric vinyl slap
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();

      osc.type = 'sawtooth';
      osc.frequency.setValueAtTime(420, now);
      osc.frequency.exponentialRampToValueAtTime(75, now + 0.18);

      const filter = this.ctx.createBiquadFilter();
      filter.type = 'lowpass';
      filter.frequency.setValueAtTime(2600, now);
      filter.frequency.exponentialRampToValueAtTime(350, now + 0.18);

      gain.gain.setValueAtTime(0.01, now);
      gain.gain.linearRampToValueAtTime(0.42, now + 0.006);
      gain.gain.exponentialRampToValueAtTime(0.0001, now + 0.22);

      osc.connect(filter);
      filter.connect(gain);
      gain.connect(this.masterGain);

      osc.start(now);
      osc.stop(now + 0.22);
    } catch (e) {
      console.warn('Super needle flip error:', e);
    }
  }

  /**
   * Triumphant Wave Clear / All Dots Cleared Victory Fanfare
   */
  public playWaveClearFanfare() {
    if (!this.ctx || !this.masterGain || this.isMuted) return;
    this.ensureRunning();

    try {
      const now = this.ctx.currentTime;
      // Majestic ascending victory chords: C4-E4-G4 -> G4-B4-D5 -> C5-E5-G5-C6
      const victoryArp = [
        { freq: 261.63, delay: 0.00, dur: 0.22 },
        { freq: 329.63, delay: 0.08, dur: 0.22 },
        { freq: 392.00, delay: 0.16, dur: 0.25 },
        { freq: 523.25, delay: 0.28, dur: 0.30 },
        { freq: 659.25, delay: 0.38, dur: 0.35 },
        { freq: 783.99, delay: 0.48, dur: 0.45 },
        { freq: 1046.50, delay: 0.60, dur: 0.85 },
      ];

      victoryArp.forEach((note) => {
        if (!this.ctx || !this.masterGain) return;
        const noteTime = now + note.delay;
        const osc = this.ctx.createOscillator();
        const gain = this.ctx.createGain();

        osc.type = 'triangle';
        osc.frequency.setValueAtTime(note.freq, noteTime);

        gain.gain.setValueAtTime(0.01, noteTime);
        gain.gain.linearRampToValueAtTime(0.35, noteTime + 0.02);
        gain.gain.exponentialRampToValueAtTime(0.0001, noteTime + note.dur);

        osc.connect(gain);
        gain.connect(this.masterGain);

        osc.start(noteTime);
        osc.stop(noteTime + note.dur);
      });
    } catch (e) {
      console.warn('Wave clear fanfare error:', e);
    }
  }

  /**
   * Ball Drained Sound (descending pitch slide down the outlane gutter)
   */
  public playBallDrainSound() {
    if (!this.ctx || !this.masterGain || this.isMuted) return;
    this.ensureRunning();

    try {
      const now = this.ctx.currentTime;
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();

      osc.type = 'sawtooth';
      osc.frequency.setValueAtTime(280, now);
      osc.frequency.exponentialRampToValueAtTime(45, now + 0.35);

      gain.gain.setValueAtTime(0.01, now);
      gain.gain.linearRampToValueAtTime(0.28, now + 0.01);
      gain.gain.exponentialRampToValueAtTime(0.0001, now + 0.35);

      osc.connect(gain);
      gain.connect(this.masterGain);

      osc.start(now);
      osc.stop(now + 0.35);
    } catch (e) {
      console.warn('Ball drain sound error:', e);
    }
  }

  /**
   * Retro Arcade Game Over Sound (all balls lost)
   */
  public playGameOverSound() {
    if (!this.ctx || !this.masterGain || this.isMuted) return;
    this.ensureRunning();

    try {
      const now = this.ctx.currentTime;
      const sadNotes = [
        { freq: 392.00, delay: 0.00 }, // G4
        { freq: 369.99, delay: 0.18 }, // F#4
        { freq: 349.23, delay: 0.36 }, // F4
        { freq: 311.13, delay: 0.54 }, // D#4
        { freq: 261.63, delay: 0.80 }, // C4 low
      ];

      sadNotes.forEach((n) => {
        if (!this.ctx || !this.masterGain) return;
        const noteTime = now + n.delay;
        const osc = this.ctx.createOscillator();
        const gain = this.ctx.createGain();

        osc.type = 'square';
        osc.frequency.setValueAtTime(n.freq, noteTime);

        gain.gain.setValueAtTime(0.01, noteTime);
        gain.gain.linearRampToValueAtTime(0.22, noteTime + 0.01);
        gain.gain.exponentialRampToValueAtTime(0.0001, noteTime + 0.28);

        osc.connect(gain);
        gain.connect(this.masterGain);

        osc.start(noteTime);
        osc.stop(noteTime + 0.28);
      });
    } catch (e) {
      console.warn('Game over sound error:', e);
    }
  }

  public setMute(muted: boolean) {
    this.isMuted = muted;
    if (this.masterGain && this.ctx) {
      this.masterGain.gain.setValueAtTime(muted ? 0 : this.volume, this.ctx.currentTime);
    }
    if (!muted) {
      this.unlock().then(() => {
        if (!this.isMusicPlaying) {
          this.playBumperChime(2);
        }
      });
    }
    this.notifyState();
  }

  public setVolume(vol: number) {
    this.volume = Math.max(0, Math.min(1, vol));
    if (this.masterGain && this.ctx && !this.isMuted) {
      this.masterGain.gain.setValueAtTime(this.volume, this.ctx.currentTime);
    }
  }

  public setMusicVolume(vol: number) {
    this.musicVolume = Math.max(0, Math.min(1, vol));
    if (this.musicGain && this.ctx) {
      this.musicGain.gain.setValueAtTime(this.musicVolume, this.ctx.currentTime);
    }
  }

  public getMuted() {
    return this.isMuted;
  }
}

export const soundSynth = new SoundSynthesizer();
