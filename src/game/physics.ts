import { soundSynth } from '../audio/SoundSynthesizer';

export interface Ball {
  id: number;
  x: number;
  y: number;
  vx: number;
  vy: number;
  radius: number;
  color: string;
  trail: { x: number; y: number; time: number; speed: number }[];
  lastBounceTime: number;
  visitedFlippers: Set<string>;
  visitedMultipliers: Set<number>;
}

export interface FloatingNotice {
  text: string;
  x: number;
  y: number;
  vy: number;
  life: number;
  maxLife: number;
  color: string;
}

export interface Flipper {
  id: 'TL' | 'TR' | 'BL' | 'BR';
  pivotX: number;
  pivotY: number;
  length: number;
  baseAngle: number;
  strokeAngle: number;
  currentAngle: number;
  angularVelocity: number;
  isFlipping: boolean;
  activeGlow: number; // 0 to 1
  label: string;
  triggerKey: string;
}

export interface GeometricHazard {
  id: number;
  type: 'circle' | 'square' | 'triangle' | 'rectangle';
  x: number;
  y: number;
  vx: number;
  vy: number;
  radius: number;
  width?: number;
  height?: number;
  angle: number;
  angularVelocity: number;
  multiplier: number;
  color: string;
  hitGlow: number;
  isLit?: boolean;
  // Specific movement profiles
  orbitAngle?: number;
  orbitRadius?: number;
  gridTargetX?: number;
  gridTargetY?: number;
  stepTimer?: number;
}

export interface ElectricFence {
  x1: number;
  y1: number;
  x2: number;
  y2: number;
  active: boolean;
  pulseTimer: number;
  pulseDuration: number;
  period: number;
  color: string;
}

export interface DotNode {
  x: number;
  y: number;
  radius: number;
  collected: boolean;
  respawnTime: number;
  color?: string;
  isBonus?: boolean;
}

export interface Particle {
  x: number;
  y: number;
  vx: number;
  vy: number;
  life: number;
  maxLife: number;
  color: string;
  size: number;
}

export interface Shockwave {
  x: number;
  y: number;
  radius: number;
  maxRadius: number;
  color: string;
  alpha: number;
}

export interface SpikedPinwheel {
  id: 'left' | 'right';
  x: number;
  y: number;
  radius: number;
  spikeLength: number;
  spikeCount: number;
  angle: number;
  rotationSpeed: number;
  hitGlow: number;
  color: string;
}

export interface GameSettings {
  autoPilot: boolean;
  rpm: number; // 33, 45, 78, 120
  bgTheme: 'grid' | 'tempest' | 'qix' | 'kaleidoscope' | 'space';
  trailDotCount: number; // e.g. 15 to 40
  tiltSensitivity: number; // 0 to 2
  crtScanlines: boolean;
  vectorGlow: boolean;
  soundEnabled: boolean;
  spikedPinwheels?: boolean;
}

export class BumperQuestEngine {
  public canvas: HTMLCanvasElement;
  public ctx: CanvasRenderingContext2D;
  public width: number = 800;
  public height: number = 800;

  // Game elements
  public balls: Ball[] = [];
  public flippers: Flipper[] = [];
  public pinwheels: SpikedPinwheel[] = [];
  public hazards: GeometricHazard[] = [];
  public fences: ElectricFence[] = [];
  public dots: DotNode[] = [];
  public particles: Particle[] = [];
  public shockwaves: Shockwave[] = [];
  public notices: FloatingNotice[] = [];
  public onQuadBonus?: (ballCount: number) => void;
  public onMultiplierMatrixBonus?: (ballCount: number) => void;
  public onGameActivity?: () => void;
  public litMultiplierIds: Set<number> = new Set();

  // Turntable center bumper
  public turntable = {
    x: 400,
    y: 400,
    radius: 110,
    angle: 0,
    angularVelocity: 0.04,
    targetAngularVelocity: 0.04,
    scratchImpulse: 0,
    scratchGlow: 0,
    color: '#00f3ff',
    labelColor: '#ff0055',
  };

  // Tempest Spider Guardian
  public spider = {
    angle: 0,
    targetAngle: 0,
    orbitRadius: 145,
    speed: 0.08,
    activeGlow: 0,
    width: 32,
    height: 28,
  };

  // Physics params
  public gravity = { x: 0, y: 0.12 };
  public tiltGravity = { x: 0, y: 0 };
  public compassRotation: number = 0;
  public restitution: number = 0.88;
  public maxSpeed: number = 18;

  // Game stats
  public score: number = 0;
  public totalBumps: number = 0;
  public totalScratches: number = 0;
  public currentMultiplier: number = 1;
  public bottomFlairGlow: number = 0;
  public fps: number = 60;

  // Wave & Win/Loss Game States
  public wave: number = 1;
  public dotsTotal: number = 0;
  public dotsRemaining: number = 0;
  public gameState: 'playing' | 'wave_cleared' | 'game_over' = 'playing';
  public stateCountdown: number = 0;

  public onDotsUpdate?: (remaining: number, total: number) => void;
  public onWaveClear?: (wave: number, score: number) => void;
  public onGameOver?: (score: number) => void;
  public onStateChange?: (state: 'playing' | 'wave_cleared' | 'game_over', countdown: number, wave: number) => void;

  // Settings
  public settings: GameSettings = {
    autoPilot: true,
    rpm: 45,
    bgTheme: 'tempest',
    trailDotCount: 24,
    tiltSensitivity: 1.0,
    crtScanlines: true,
    vectorGlow: true,
    soundEnabled: true,
    spikedPinwheels: true,
  };

  private lastTime: number = 0;
  private animFrameId: number | null = null;
  private dotEatCounter: number = 0;

  constructor(canvas: HTMLCanvasElement) {
    this.canvas = canvas;
    const context = canvas.getContext('2d');
    if (!context) throw new Error('2D context not available');
    this.ctx = context;

    this.resize();
    this.initEntities();
  }

  public resize() {
    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    const rect = this.canvas.getBoundingClientRect();
    this.width = rect.width || 800;
    this.height = rect.height || 800;

    this.canvas.width = this.width * dpr;
    this.canvas.height = this.height * dpr;
    this.ctx.resetTransform?.();
    this.ctx.scale(dpr, dpr);

    // Update center turntable coords
    this.turntable.x = this.width / 2;
    this.turntable.y = this.height / 2;
    this.turntable.radius = Math.min(this.width, this.height) * 0.16;
    this.spider.orbitRadius = this.turntable.radius + 32;

    this.setupFlippers();
    this.setupPinwheels();
  }

  public initEntities() {
    this.balls = [];
    this.hazards = [];
    this.fences = [];
    this.dots = [];
    this.particles = [];
    this.shockwaves = [];

    // Add 1 initial ball
    this.spawnBall();

    // Setup 4 corner flippers
    this.setupFlippers();

    // Setup Spiked Corner Pinwheels (under bottom flippers)
    this.setupPinwheels();

    // Setup Moving Geometric Hazards (Ghosts with multipliers)
    this.setupHazards();

    // Setup Electric Fences
    this.setupElectricFences();

    // Setup Dot Grid
    this.setupDotGrid();
  }

  public spawnBall(x?: number, y?: number) {
    const startX = x ?? (this.width / 2 + (Math.random() - 0.5) * 80);
    const startY = y ?? (this.height * 0.28);
    const angle = Math.random() * Math.PI * 2;
    const speed = 4 + Math.random() * 3;

    const colors = ['#00f3ff', '#ff0055', '#ffaa00', '#00ff66', '#a855f7'];
    const color = colors[this.balls.length % colors.length];

    this.balls.push({
      id: Date.now() + Math.random(),
      x: startX,
      y: startY,
      vx: Math.cos(angle) * speed,
      vy: Math.sin(angle) * speed,
      radius: 9,
      color,
      trail: [],
      lastBounceTime: 0,
      visitedFlippers: new Set<string>(),
      visitedMultipliers: new Set<number>(),
    });
  }

  public clearExtraBalls() {
    if (this.balls.length > 1) {
      this.balls = [this.balls[0]];
    }
  }

  private setupFlippers() {
    const w = this.width;
    const h = this.height;
    const isPortrait = h > w;
    const flipperLen = Math.min(w, h) * (isPortrait ? 0.16 : 0.15);

    const marginX = isPortrait ? w * 0.14 : w * 0.12;
    // Safe margins away from the top status bar and bottom apron flairs
    const topMarginY = isPortrait ? Math.max(72, h * 0.12) : h * 0.13;
    const bottomMarginY = isPortrait ? Math.min(h - 64, h * 0.86) : h * 0.86;

    this.flippers = [
      {
        id: 'TL',
        pivotX: marginX,
        pivotY: topMarginY,
        length: flipperLen,
        baseAngle: 0.75, // Radians pointing down-right
        strokeAngle: -0.55,
        currentAngle: 0.75,
        angularVelocity: 0,
        isFlipping: false,
        activeGlow: 0,
        label: 'Q',
        triggerKey: 'KeyQ',
      },
      {
        id: 'TR',
        pivotX: w - marginX,
        pivotY: topMarginY,
        length: flipperLen,
        baseAngle: Math.PI - 0.75, // Radians pointing down-left
        strokeAngle: 0.55,
        currentAngle: Math.PI - 0.75,
        angularVelocity: 0,
        isFlipping: false,
        activeGlow: 0,
        label: 'E',
        triggerKey: 'KeyE',
      },
      {
        id: 'BL',
        pivotX: marginX,
        pivotY: bottomMarginY,
        length: flipperLen,
        baseAngle: -0.75, // Radians pointing up-right
        strokeAngle: 0.55,
        currentAngle: -0.75,
        angularVelocity: 0,
        isFlipping: false,
        activeGlow: 0,
        label: 'Z',
        triggerKey: 'KeyZ',
      },
      {
        id: 'BR',
        pivotX: w - marginX,
        pivotY: bottomMarginY,
        length: flipperLen,
        baseAngle: -Math.PI + 0.75, // Radians pointing up-left
        strokeAngle: -0.55,
        currentAngle: -Math.PI + 0.75,
        angularVelocity: 0,
        isFlipping: false,
        activeGlow: 0,
        label: 'C',
        triggerKey: 'KeyC',
      },
    ];
  }

  private setupPinwheels() {
    const w = this.width;
    const h = this.height;
    const isPortrait = h > w;
    const marginX = isPortrait ? w * 0.14 : w * 0.12;
    const bottomMarginY = isPortrait ? Math.min(h - 64, h * 0.86) : h * 0.86;

    // Placed in the bottom corners directly under the lower flipper pivots
    const leftX = Math.max(34, marginX * 0.60);
    const rightX = Math.min(w - 34, w - marginX * 0.60);
    const pinwheelY = Math.min(h - 26, bottomMarginY + (h - bottomMarginY) * 0.48);
    const r = Math.min(22, Math.max(16, Math.min(w, h) * 0.038));

    this.pinwheels = [
      {
        id: 'left',
        x: leftX,
        y: pinwheelY,
        radius: r,
        spikeLength: r * 0.55,
        spikeCount: 8,
        angle: 0,
        rotationSpeed: 0.13, // Fast clockwise spin (whipping balls up & in)
        hitGlow: 0,
        color: '#ffaa00',
      },
      {
        id: 'right',
        x: rightX,
        y: pinwheelY,
        radius: r,
        spikeLength: r * 0.55,
        spikeCount: 8,
        angle: 0,
        rotationSpeed: -0.13, // Fast counter-clockwise spin (whipping balls up & in)
        hitGlow: 0,
        color: '#00f3ff',
      },
    ];
  }

  private setupHazards() {
    const cx = this.width / 2;
    const cy = this.height / 2;
    const scale = Math.min(this.width, this.height);

    this.hazards = [
      // 🔵 Circle: Smooth orbital path
      {
        id: 1,
        type: 'circle',
        x: cx + scale * 0.28,
        y: cy,
        vx: 0,
        vy: 0,
        radius: 20,
        angle: 0,
        angularVelocity: 0.02,
        multiplier: 2,
        color: '#00f3ff',
        hitGlow: 0,
        orbitAngle: 0,
        orbitRadius: scale * 0.28,
      },
      // 🟩 Square: Step-logic grid jumps
      {
        id: 2,
        type: 'square',
        x: cx - scale * 0.26,
        y: cy - scale * 0.15,
        vx: 0,
        vy: 0,
        radius: 22,
        angle: 0,
        angularVelocity: 0.015,
        multiplier: 3,
        color: '#00ff66',
        hitGlow: 0,
        gridTargetX: cx - scale * 0.26,
        gridTargetY: cy - scale * 0.15,
        stepTimer: 0,
      },
      // 🔺 Triangle: High-velocity screensaver zig-zag
      {
        id: 3,
        type: 'triangle',
        x: cx + scale * 0.18,
        y: cy - scale * 0.26,
        vx: 2.8,
        vy: 2.2,
        radius: 24,
        angle: 0,
        angularVelocity: 0.04,
        multiplier: 5,
        color: '#ff0055',
        hitGlow: 0,
      },
      // 🛑 Rectangle: Heavy pendulum shield sliding side to side
      {
        id: 4,
        type: 'rectangle',
        x: cx,
        y: cy + scale * 0.32,
        vx: 2.0,
        vy: 0,
        radius: 26,
        width: 60,
        height: 18,
        angle: 0,
        angularVelocity: 0,
        multiplier: 4,
        color: '#ffaa00',
        hitGlow: 0,
      },
    ];
  }

  private setupElectricFences() {
    const cx = this.width / 2;
    const cy = this.height / 2;
    const s = Math.min(this.width, this.height) * 0.36;

    this.fences = [
      // Top-mid gate
      {
        x1: cx - s * 0.45,
        y1: cy - s * 0.72,
        x2: cx + s * 0.45,
        y2: cy - s * 0.72,
        active: true,
        pulseTimer: 0,
        pulseDuration: 180,
        period: 320,
        color: '#00f3ff',
      },
      // Bottom-mid gate
      {
        x1: cx - s * 0.45,
        y1: cy + s * 0.72,
        x2: cx + s * 0.45,
        y2: cy + s * 0.72,
        active: false,
        pulseTimer: 160,
        pulseDuration: 180,
        period: 320,
        color: '#ff0055',
      },
    ];
  }

  public setupDotGrid(wave: number = 1) {
    this.dots = [];
    const cx = this.width / 2;
    const cy = this.height / 2;
    const rOuter = Math.min(this.width, this.height) * 0.38;
    const rInner = this.turntable.radius + 36;

    // Rings of retro arcade dots based on wave level
    // Wave 1: 2 rings (32 dots) - fast, accessible arcade wave
    // Wave 2: 3 rings (60 dots)
    // Wave 3+: 3-4 rings with bonus center constellation
    const ringCount = Math.min(4, 2 + ((wave - 1) % 3));
    for (let ring = 0; ring < ringCount; ring++) {
      const ringRadius = rInner + (rOuter - rInner) * ((ring + 0.5) / ringCount);
      const dotCount = 12 + ring * 8;
      for (let i = 0; i < dotCount; i++) {
        const a = (i / dotCount) * Math.PI * 2;
        this.dots.push({
          x: cx + Math.cos(a) * ringRadius,
          y: cy + Math.sin(a) * ringRadius,
          radius: 3.5,
          collected: false,
          respawnTime: 0,
        });
      }
    }

    this.dotsTotal = this.dots.length;
    this.dotsRemaining = this.dots.length;
    this.onDotsUpdate?.(this.dotsRemaining, this.dotsTotal);
  }

  // --- MANUAL FLIPPER CONTROLS ---
  public triggerFlipper(id: 'TL' | 'TR' | 'BL' | 'BR') {
    const f = this.flippers.find(flip => flip.id === id);
    if (f) {
      f.isFlipping = true;
      f.activeGlow = 1.0;
      if (id === 'BL' || id === 'BR') {
        this.bottomFlairGlow = 1.0;
      }
      soundSynth.playFlipperSnap();
    }
  }

  public releaseFlipper(id: 'TL' | 'TR' | 'BL' | 'BR') {
    const f = this.flippers.find(flip => flip.id === id);
    if (f) {
      f.isFlipping = false;
    }
  }

  // --- MAIN SIMULATION LOOP ---
  public start() {
    this.lastTime = performance.now();
    const loop = (currentTime: number) => {
      const dt = Math.min((currentTime - this.lastTime) / 1000, 0.05); // cap delta time
      this.lastTime = currentTime;

      this.update(dt);
      this.draw();

      this.animFrameId = requestAnimationFrame(loop);
    };
    this.animFrameId = requestAnimationFrame(loop);
  }

  public stop() {
    if (this.animFrameId !== null) {
      cancelAnimationFrame(this.animFrameId);
      this.animFrameId = null;
    }
  }

  private update(dt: number) {
    // 1. Update turntable RPM and rotation
    const baseRPM = this.settings.rpm;
    this.turntable.targetAngularVelocity = (baseRPM / 60) * Math.PI * 2 * 0.016;
    this.turntable.angularVelocity += (this.turntable.targetAngularVelocity - this.turntable.angularVelocity) * 0.08;
    this.turntable.angle += this.turntable.angularVelocity + this.turntable.scratchImpulse;
    this.turntable.scratchImpulse *= 0.88; // decay scratch jerk
    this.turntable.scratchGlow = Math.max(0, this.turntable.scratchGlow - dt * 2.5);

    // 2. Update Tempest Spider Guardian AI
    this.updateSpider(dt);

    // 3. Update Geometric Hazards (Ghosts)
    this.updateHazards(dt);

    // 4. Update Electric Fences
    this.updateElectricFences(dt);

    // 5. Update Flippers (Auto AI or manual)
    this.updateFlippers(dt);
    this.bottomFlairGlow = Math.max(0, this.bottomFlairGlow - dt * 2.2);

    // 5.5. Update Spiked Pinwheels rotation & glow
    if (this.settings.spikedPinwheels !== false) {
      for (const p of this.pinwheels) {
        p.angle += p.rotationSpeed * (1 + p.hitGlow * 1.5);
        p.hitGlow = Math.max(0, p.hitGlow - dt * 2.2);
      }
    }

    // 6. Update Game State Countdown (Wave Cleared or Game Over Self-Playing Reset)
    if (this.gameState === 'wave_cleared') {
      this.stateCountdown -= dt;
      this.onStateChange?.(this.gameState, this.stateCountdown, this.wave);
      if (this.stateCountdown <= 0) {
        this.advanceNextWave();
      }
    } else if (this.gameState === 'game_over') {
      this.stateCountdown -= dt;
      this.onStateChange?.(this.gameState, this.stateCountdown, this.wave);
      if (this.stateCountdown <= 0) {
        this.autoRestartGame();
      }
    }

    // 7. Update Balls physics & collisions
    this.updateBalls(dt);

    // 8. Update Particles & Shockwaves
    this.updateParticles(dt);
  }

  private updateSpider(dt: number) {
    // Spider crawls along turntable perimeter ring.
    // Intercept algorithm: find ball closest to center heading towards turntable
    let bestBall: Ball | null = null;
    let minDistance = Infinity;

    const cx = this.turntable.x;
    const cy = this.turntable.y;

    for (const ball of this.balls) {
      const dx = ball.x - cx;
      const dy = ball.y - cy;
      const dist = Math.hypot(dx, dy);

      // Check if moving toward center
      const dotProd = dx * ball.vx + dy * ball.vy;
      if (dotProd < 0 && dist < minDistance && dist < this.turntable.radius * 2.5) {
        minDistance = dist;
        bestBall = ball;
      }
    }

    if (bestBall) {
      // Calculate angular position of target
      const targetAngle = Math.atan2(bestBall.y - cy, bestBall.x - cx);
      // Interpolate angle toward target
      let diff = targetAngle - this.spider.angle;
      while (diff < -Math.PI) diff += Math.PI * 2;
      while (diff > Math.PI) diff -= Math.PI * 2;

      this.spider.angle += Math.sign(diff) * Math.min(Math.abs(diff), this.spider.speed);
    } else {
      // Idle patrol crawl
      this.spider.angle += 0.015;
    }

    this.spider.activeGlow = Math.max(0, this.spider.activeGlow - dt * 3);
  }

  private updateHazards(dt: number) {
    const cx = this.turntable.x;
    const cy = this.turntable.y;
    const scale = Math.min(this.width, this.height);

    for (const h of this.hazards) {
      h.hitGlow = Math.max(0, h.hitGlow - dt * 2.5);

      if (h.type === 'circle') {
        // Orbit around turntable
        h.orbitAngle = (h.orbitAngle || 0) + 0.02;
        const rad = h.orbitRadius || (scale * 0.28);
        h.x = cx + Math.cos(h.orbitAngle) * rad;
        h.y = cy + Math.sin(h.orbitAngle) * rad;
        h.angle += 0.03;
      } else if (h.type === 'square') {
        // Step logic: snaps/jumps to next grid cell every interval
        h.stepTimer = (h.stepTimer || 0) + 1;
        if (h.stepTimer > 90) {
          h.stepTimer = 0;
          const gridSize = 45;
          const randDir = Math.floor(Math.random() * 4);
          let tx = (h.gridTargetX || h.x);
          let ty = (h.gridTargetY || h.y);

          if (randDir === 0) tx += gridSize;
          else if (randDir === 1) tx -= gridSize;
          else if (randDir === 2) ty += gridSize;
          else ty -= gridSize;

          // Keep in bounds
          if (tx > this.width * 0.2 && tx < this.width * 0.8) h.gridTargetX = tx;
          if (ty > this.height * 0.2 && ty < this.height * 0.8) h.gridTargetY = ty;
        }

        h.x += ((h.gridTargetX || h.x) - h.x) * 0.12;
        h.y += ((h.gridTargetY || h.y) - h.y) * 0.12;
        h.angle += h.angularVelocity;
      } else if (h.type === 'triangle') {
        // High-velocity screensaver bounce
        h.x += h.vx;
        h.y += h.vy;
        h.angle += h.angularVelocity;

        const pad = 40;
        if (h.x - h.radius < pad || h.x + h.radius > this.width - pad) {
          h.vx = -h.vx;
        }
        if (h.y - h.radius < pad || h.y + h.radius > this.height - pad) {
          h.vy = -h.vy;
        }
      } else if (h.type === 'rectangle') {
        // Pendulum sliding side-to-side
        h.x += h.vx;
        const range = scale * 0.25;
        if (h.x > cx + range) {
          h.x = cx + range;
          h.vx = -Math.abs(h.vx);
        } else if (h.x < cx - range) {
          h.x = cx - range;
          h.vx = Math.abs(h.vx);
        }
      }
    }
  }

  private updateElectricFences(dt: number) {
    for (const f of this.fences) {
      f.pulseTimer += 1;
      if (f.pulseTimer >= f.period) {
        f.pulseTimer = 0;
      }
      f.active = f.pulseTimer < f.pulseDuration;
    }
  }

  private updateFlippers(dt: number) {
    for (const f of this.flippers) {
      // Auto AI tracking:
      if (this.settings.autoPilot) {
        let shouldFlip = false;
        // Check if any ball is approaching this flipper's striking sector
        for (const ball of this.balls) {
          const dx = ball.x - f.pivotX;
          const dy = ball.y - f.pivotY;
          const dist = Math.hypot(dx, dy);

          // Sector detection
          if (dist > 15 && dist < f.length * 1.25) {
            const ballAngle = Math.atan2(dy, dx);
            let angleDiff = ballAngle - f.baseAngle;
            while (angleDiff < -Math.PI) angleDiff += Math.PI * 2;
            while (angleDiff > Math.PI) angleDiff -= Math.PI * 2;

            // If ball is within sweeping arc and moving with speed
            if (Math.abs(angleDiff) < 0.6) {
              shouldFlip = true;
              break;
            }
          }
        }

        if (shouldFlip && !f.isFlipping) {
          f.isFlipping = true;
          f.activeGlow = 1.0;
          if (f.id === 'BL' || f.id === 'BR') {
            this.bottomFlairGlow = 1.0;
          }
          soundSynth.playFlipperSnap();
        } else if (!shouldFlip && f.isFlipping) {
          f.isFlipping = false;
        }
      }

      // Smooth flipper rotation mechanics
      const targetAngle = f.isFlipping ? f.baseAngle + f.strokeAngle : f.baseAngle;
      const flipSpeed = f.isFlipping ? 32 : 14;
      const angleDelta = targetAngle - f.currentAngle;
      f.currentAngle += angleDelta * Math.min(1, dt * flipSpeed);

      f.activeGlow = Math.max(0, f.activeGlow - dt * 2.5);
    }
  }

  private updateBalls(dt: number) {
    const totalGx = (this.gravity.x + this.tiltGravity.x * this.settings.tiltSensitivity);
    const totalGy = (this.gravity.y + this.tiltGravity.y * this.settings.tiltSensitivity);

    const cx = this.turntable.x;
    const cy = this.turntable.y;
    const rTurntable = this.turntable.radius;

    for (let bIdx = this.balls.length - 1; bIdx >= 0; bIdx--) {
      const ball = this.balls[bIdx];

      // Apply gravity
      ball.vx += totalGx;
      ball.vy += totalGy;

      // Friction / air resistance
      ball.vx *= 0.998;
      ball.vy *= 0.998;

      // Speed clamp
      const speed = Math.hypot(ball.vx, ball.vy);
      if (speed > this.maxSpeed) {
        ball.vx = (ball.vx / speed) * this.maxSpeed;
        ball.vy = (ball.vy / speed) * this.maxSpeed;
      }

      // Move
      ball.x += ball.vx;
      ball.y += ball.vy;

      // Trail recording (timing dots)
      ball.trail.unshift({
        x: ball.x,
        y: ball.y,
        time: performance.now(),
        speed,
      });
      if (ball.trail.length > this.settings.trailDotCount) {
        ball.trail.pop();
      }

      // 1. Playfield Outer Boundary Walls, Top/Bottom Gutter Drains & Pac-Man Side Warp Tunnels
      const pad = 18;
      const drainLeft = this.width * 0.43;
      const drainRight = this.width * 0.57;
      const tunnelTop = this.height * 0.43;
      const tunnelBottom = this.height * 0.57;

      // Left Wall & Pac-Man Left Warp Tunnel
      if (ball.x - ball.radius < pad) {
        if (ball.y >= tunnelTop && ball.y <= tunnelBottom) {
          // Inside Pac-Man Left Tunnel -> Teleport to Right Tunnel Exit!
          ball.x = this.width - pad - ball.radius - 2;
          this.addSparks(pad, ball.y, '#00f3ff', 12);
          this.addSparks(ball.x, ball.y, '#ff00aa', 12);
          soundSynth.playPacManWarpSound();
          this.notices.push({
            text: 'PAC-WARP >>',
            x: ball.x - 35,
            y: ball.y,
            vy: -0.3,
            life: 0,
            maxLife: 45,
            color: '#00f3ff',
          });
        } else {
          // Solid left wall bounce
          ball.x = pad + ball.radius;
          ball.vx = -ball.vx * this.restitution;
          this.addSparks(ball.x, ball.y, ball.color, 4);
        }
      } else if (ball.x + ball.radius > this.width - pad) {
        if (ball.y >= tunnelTop && ball.y <= tunnelBottom) {
          // Inside Pac-Man Right Tunnel -> Teleport to Left Tunnel Exit!
          ball.x = pad + ball.radius + 2;
          this.addSparks(this.width - pad, ball.y, '#ff00aa', 12);
          this.addSparks(ball.x, ball.y, '#00f3ff', 12);
          soundSynth.playPacManWarpSound();
          this.notices.push({
            text: '<< PAC-WARP',
            x: ball.x + 35,
            y: ball.y,
            vy: -0.3,
            life: 0,
            maxLife: 45,
            color: '#ff00aa',
          });
        } else {
          // Solid right wall bounce
          ball.x = this.width - pad - ball.radius;
          ball.vx = -ball.vx * this.restitution;
          this.addSparks(ball.x, ball.y, ball.color, 4);
        }
      }

      // Top Wall & Top Gutter Drain
      if (ball.y - ball.radius < 10) {
        if (ball.x >= drainLeft && ball.x <= drainRight) {
          // Ball drains through the Top Gutter!
          this.addSparks(ball.x, 0, '#ff0055', 18);
          this.shockwaves.push({
            x: ball.x,
            y: 8,
            radius: 8,
            maxRadius: 80,
            color: '#ff0055',
            alpha: 1.0,
          });
          soundSynth.playBallDrainSound();

          this.balls.splice(bIdx, 1);

          if (this.balls.length === 0) {
            this.triggerGameOver();
          }
          continue;
        } else {
          // Solid top wall bounce
          ball.y = pad + ball.radius;
          ball.vy = -ball.vy * this.restitution;
          this.addSparks(ball.x, ball.y, ball.color, 4);
        }
      } else if (ball.y + ball.radius > this.height - 10) {
        // Bottom Gutter Drain Check (Narrowed by 50%!)
        if (ball.x >= drainLeft && ball.x <= drainRight) {
          // Ball drains into the bottom abyss!
          this.addSparks(ball.x, this.height, '#ff0055', 18);
          this.shockwaves.push({
            x: ball.x,
            y: this.height - 8,
            radius: 8,
            maxRadius: 80,
            color: '#ff0055',
            alpha: 1.0,
          });
          soundSynth.playBallDrainSound();

          this.balls.splice(bIdx, 1);

          // If all balls are lost -> GAME OVER (triggers self-playing reset)
          if (this.balls.length === 0) {
            this.triggerGameOver();
          }
          continue;
        } else {
          // Solid bounce off bottom rebound walls
          ball.y = this.height - 10 - ball.radius;
          ball.vy = -ball.vy * this.restitution;
          this.addSparks(ball.x, ball.y, ball.color, 4);
        }
      }

      // 2. Central Turntable Bumper Collision (The Vinyl Scratch Bumper!)
      const dx = ball.x - cx;
      const dy = ball.y - cy;
      const distCenter = Math.hypot(dx, dy);

      if (distCenter < rTurntable + ball.radius) {
        // Collision with turntable outer rim
        const nx = dx / distCenter;
        const ny = dy / distCenter;

        // Push out
        ball.x = cx + nx * (rTurntable + ball.radius);

        // Reflection vector with high elasticity bounce
        const dotProd = ball.vx * nx + ball.vy * ny;
        const bounceForce = 1.15;
        ball.vx = (ball.vx - 2 * dotProd * nx) * bounceForce;
        ball.vy = (ball.vy - 2 * dotProd * ny) * bounceForce;

        // Tangential kick from vinyl rotation
        const tangX = -ny;
        const tangY = nx;
        const rimSpeed = this.turntable.angularVelocity * rTurntable;
        ball.vx += tangX * rimSpeed * 0.4;
        ball.vy += tangY * rimSpeed * 0.4;

        // Trigger Scratch-FX
        this.turntable.scratchGlow = 1.0;
        this.turntable.scratchImpulse = (Math.random() > 0.5 ? 1 : -1) * (0.08 + Math.random() * 0.08);

        soundSynth.playTurntableScratch(1.2);
        this.totalScratches++;
        this.totalBumps++;
        this.score += 500 * this.currentMultiplier;

        // Visual shockwave ring
        this.shockwaves.push({
          x: cx,
          y: cy,
          radius: rTurntable,
          maxRadius: rTurntable * 1.8,
          color: this.turntable.color,
          alpha: 1.0,
        });

        this.addSparks(ball.x, ball.y, '#00f3ff', 12);

        // Turntable scratch impact occasionally seeds rhythmic vinyl dots!
        if (Math.random() < 0.28) {
          this.seedDots(3, 'vinyl', cx, cy);
          this.notices.push({
            text: 'VINYL GROOVE +3 DOTS',
            x: cx,
            y: cy - rTurntable - 15,
            vy: -0.4,
            life: 0,
            maxLife: 60,
            color: '#00f3ff',
          });
        }
      }

      // 3. Tempest Spider Guardian Collision
      const spiderX = cx + Math.cos(this.spider.angle) * this.spider.orbitRadius;
      const spiderY = cy + Math.sin(this.spider.angle) * this.spider.orbitRadius;
      const distSpider = Math.hypot(ball.x - spiderX, ball.y - spiderY);

      if (distSpider < 26 + ball.radius) {
        const sx = (ball.x - spiderX) / distSpider;
        const sy = (ball.y - spiderY) / distSpider;

        ball.x = spiderX + sx * (26 + ball.radius);
        // Slingshot bounce away
        ball.vx = sx * (speed * 1.25 + 6);
        ball.vy = sy * (speed * 1.25 + 6);

        this.spider.activeGlow = 1.0;
        soundSynth.playSpiderDeflection();
        this.totalBumps++;
        this.score += 350 * this.currentMultiplier;
        this.addSparks(ball.x, ball.y, '#ff0055', 14);

        // Spider Guardian weaves glowing silk dots in its wake!
        this.seedDots(3, 'spider', spiderX, spiderY);
        this.notices.push({
          text: 'SPIDER WEAVE +3 DOTS',
          x: spiderX,
          y: spiderY - 20,
          vy: -0.4,
          life: 0,
          maxLife: 60,
          color: '#ff00aa',
        });
      }

      // 4. Moving Geometric Hazards Collisions
      for (const h of this.hazards) {
        const hdx = ball.x - h.x;
        const hdy = ball.y - h.y;
        const hDist = Math.hypot(hdx, hdy);

        const hitDist = (h.type === 'rectangle' ? 24 : h.radius) + ball.radius;

        if (hDist < hitDist) {
          const hnx = hdx / hDist;
          const hny = hdy / hDist;

          ball.x = h.x + hnx * hitDist;
          const hDot = ball.vx * hnx + ball.vy * hny;
          ball.vx = (ball.vx - 2 * hDot * hnx) * 1.1;
          ball.vy = (ball.vy - 2 * hDot * hny) * 1.1;

          // Charge up multiplier!
          h.multiplier = Math.min(64, h.multiplier * 2);
          this.currentMultiplier = Math.max(this.currentMultiplier, h.multiplier);
          h.hitGlow = 1.0;
          h.isLit = true;

          // Multiplier Matrix tracking
          this.litMultiplierIds.add(h.id);
          ball.visitedMultipliers.add(h.id);

          soundSynth.playBumperChime(h.multiplier);
          soundSynth.playMultiplierUpgrade(h.multiplier);
          this.totalBumps++;
          this.score += 250 * h.multiplier;
          this.addSparks(ball.x, ball.y, h.color, 10);

          // Check if ALL 4 Geometric Multipliers are activated!
          if (this.litMultiplierIds.size >= 4) {
            this.triggerMultiplierMatrixJackpot(ball.x, ball.y);
          }
        }
      }

      // 5. Electric Fence Collisions
      for (const f of this.fences) {
        if (!f.active) continue;

        // Line-segment to circle distance
        const lineDist = this.distToSegment(ball.x, ball.y, f.x1, f.y1, f.x2, f.y2);
        if (lineDist.distance < ball.radius + 6) {
          // Repel violently
          const nx = (ball.x - lineDist.closestX) / (lineDist.distance || 1);
          const ny = (ball.y - lineDist.closestY) / (lineDist.distance || 1);

          ball.vx = nx * 10 + (Math.random() - 0.5) * 6;
          ball.vy = ny * 10 + (Math.random() - 0.5) * 6;

          soundSynth.playElectricFenceZap();
          this.totalBumps++;
          this.score += 150 * this.currentMultiplier;
          this.addSparks(ball.x, ball.y, '#ffff00', 10);
        }
      }

      // 5.5. Spiked Corner Pinwheels Ricochet Kickers (under bottom flippers)
      if (this.settings.spikedPinwheels !== false) {
        for (const p of this.pinwheels) {
          const pdx = ball.x - p.x;
          const pdy = ball.y - p.y;
          const pDist = Math.hypot(pdx, pdy);
          const effectiveRadius = p.radius + p.spikeLength;

          if (pDist < effectiveRadius + ball.radius) {
            const pnx = pdx / (pDist || 1);
            const pny = pdy / (pDist || 1);

            const isLeft = p.id === 'left';
            // Flings ball radically inward and upward back toward the flippers/playfield!
            const targetAngle = isLeft ? -0.82 : -Math.PI + 0.82;
            const radicalSpeed = Math.max(14.5, Math.hypot(ball.vx, ball.vy) * 1.55);

            // Add tangential rotational whip from high-rpm spin
            const spinSign = p.rotationSpeed > 0 ? 1 : -1;
            const tx = -pny * spinSign;
            const ty = pnx * spinSign;

            ball.vx = Math.cos(targetAngle) * radicalSpeed + tx * 3.5;
            ball.vy = Math.sin(targetAngle) * radicalSpeed + ty * 3.5;

            // Separate cleanly to prevent getting trapped
            ball.x = p.x + pnx * (effectiveRadius + ball.radius + 4);
            ball.y = p.y + pny * (effectiveRadius + ball.radius + 4);

            p.hitGlow = 1.0;
            this.bottomFlairGlow = 1.0;

            soundSynth.playPinwheelRicochet();
            this.totalBumps++;
            this.score += 200 * this.currentMultiplier;

            this.addSparks(ball.x, ball.y, '#ffea00', 16);
            this.addSparks(ball.x, ball.y, p.color, 12);
            this.shockwaves.push({
              x: p.x,
              y: p.y,
              radius: p.radius,
              maxRadius: 70,
              color: p.color,
              alpha: 1.0,
            });

            this.notices.push({
              text: '★ RADICAL RICOCHET! ★',
              x: p.x + (isLeft ? 38 : -38),
              y: p.y - 28,
              vy: -0.4,
              life: 0,
              maxLife: 55,
              color: '#ffea00',
            });
          }
        }
      }

      // 6. Dot Grid Collision
      for (const dot of this.dots) {
        if (dot.collected) continue;
        const ddx = ball.x - dot.x;
        const ddy = ball.y - dot.y;
        if (Math.hypot(ddx, ddy) < dot.radius + ball.radius) {
          dot.collected = true;
          this.dotsRemaining = Math.max(0, this.dotsRemaining - 1);
          this.dotEatCounter++;
          soundSynth.playDotBlip(this.dotEatCounter);
          this.score += 50 * this.currentMultiplier;
          this.addSparks(dot.x, dot.y, '#00ff66', 3);
          this.onDotsUpdate?.(this.dotsRemaining, this.dotsTotal);

          // WIN CONDITION: When all of the dots are collected!
          if (this.dotsRemaining <= 0 && this.gameState === 'playing') {
            this.triggerWaveClear();
            break;
          }
        }
      }

      // 7. Flippers Collision
      for (const f of this.flippers) {
        const fx2 = f.pivotX + Math.cos(f.currentAngle) * f.length;
        const fy2 = f.pivotY + Math.sin(f.currentAngle) * f.length;

        const seg = this.distToSegment(ball.x, ball.y, f.pivotX, f.pivotY, fx2, fy2);
        if (seg.distance < ball.radius + 8) {
          const normX = (ball.x - seg.closestX) / (seg.distance || 1);
          const normY = (ball.y - seg.closestY) / (seg.distance || 1);

          // Push ball out
          ball.x = seg.closestX + normX * (ball.radius + 8);

          // If flipper is swinging upward/active, launch with high power
          const flipPower = f.isFlipping ? 16 : 8;
          ball.vx = normX * flipPower + (Math.random() - 0.5) * 2;
          ball.vy = normY * flipPower + (Math.random() - 0.5) * 2;

          f.activeGlow = 1.0;
          if (f.id === 'BL' || f.id === 'BR') {
            this.bottomFlairGlow = 1.0;
          }
          soundSynth.playFlipperSnap();
          this.totalBumps++;
          this.score += 200 * this.currentMultiplier;
          this.addSparks(ball.x, ball.y, '#ffffff', 8);
          this.onGameActivity?.();

          // Quad-Flipper tracking: add to ball's visited flippers set!
          ball.visitedFlippers.add(f.id);

          // If this ball has hit all 4 corner flippers, award bonus ball!
          if (ball.visitedFlippers.size >= 4) {
            ball.visitedFlippers.clear();
            if (this.balls.length < 8) {
              this.spawnBall();
            }
            this.score += 2500 * this.currentMultiplier;
            soundSynth.playQuadCycleBonusSound();
            this.triggerQuadBonusCelebration(ball.x, ball.y);
            this.onQuadBonus?.(this.balls.length);
          }
        }
      }
    }
  }

  public triggerQuadBonusCelebration(x: number, y: number) {
    this.bottomFlairGlow = 1.0;
    this.shockwaves.push({
      x,
      y,
      radius: 12,
      maxRadius: 180,
      color: '#00ff66',
      alpha: 1.0,
    });
    this.shockwaves.push({
      x: this.width / 2,
      y: this.height / 2,
      radius: this.turntable.radius,
      maxRadius: this.turntable.radius * 2,
      color: '#ff0055',
      alpha: 0.9,
    });
    this.addSparks(x, y, '#00ff66', 20);
    this.addSparks(x, y, '#00f3ff', 16);

    this.notices.push({
      text: 'QUAD-FLIPPER CYCLE! +1 BALL',
      x: this.width / 2,
      y: this.height * 0.42,
      vy: -0.65,
      life: 0,
      maxLife: 100,
      color: '#00ff66',
    });
  }

  /**
   * Dynamically seeds fresh dots onto the table (Spider web weave, turntable scratch groove, or matrix supernova)
   */
  public seedDots(count: number, source: 'spider' | 'vinyl' | 'matrix', originX?: number, originY?: number) {
    if (this.gameState !== 'playing') return;
    const cx = originX ?? this.width / 2;
    const cy = originY ?? this.height / 2;
    const rOuter = Math.min(this.width, this.height) * 0.38;
    const rInner = this.turntable.radius + 30;

    let added = 0;
    for (let i = 0; i < count; i++) {
      let dx: number;
      let dy: number;
      let dotColor = '#00ff66';

      if (source === 'spider') {
        const a = this.spider.angle + (Math.random() - 0.5) * 0.8;
        const dist = this.spider.orbitRadius + (Math.random() - 0.5) * 30;
        dx = this.turntable.x + Math.cos(a) * dist;
        dy = this.turntable.y + Math.sin(a) * dist;
        dotColor = '#ff00aa'; // Magenta spider silk dot
      } else if (source === 'vinyl') {
        const a = Math.random() * Math.PI * 2;
        const dist = this.turntable.radius + 18 + Math.random() * 32;
        dx = cx + Math.cos(a) * dist;
        dy = cy + Math.sin(a) * dist;
        dotColor = '#00f3ff'; // Cyan vinyl groove dot
      } else {
        const a = (i / count) * Math.PI * 2;
        const dist = rInner + (rOuter - rInner) * (0.25 + Math.random() * 0.7);
        dx = cx + Math.cos(a) * dist;
        dy = cy + Math.sin(a) * dist;
        dotColor = '#ffea00'; // Golden matrix supernova dot
      }

      dx = Math.max(28, Math.min(this.width - 28, dx));
      dy = Math.max(28, Math.min(this.height - 40, dy));

      this.dots.push({
        x: dx,
        y: dy,
        radius: source === 'matrix' ? 4.5 : 3.5,
        collected: false,
        respawnTime: 0,
        color: dotColor,
        isBonus: true,
      });
      added++;
    }

    this.dotsTotal += added;
    this.dotsRemaining += added;
    soundSynth.playDotSpawnChime();
    this.onDotsUpdate?.(this.dotsRemaining, this.dotsTotal);
  }

  /**
   * Supernova Multiball Surge: Triggered when ALL 4 X-Multiplier hazards are hit!
   */
  public triggerMultiplierMatrixJackpot(x: number, y: number) {
    this.litMultiplierIds.clear();
    for (const h of this.hazards) {
      h.isLit = false;
      h.hitGlow = 1.0;
    }

    // Spawn +2 extra balls (max 8)
    const currentBalls = this.balls.length;
    const spawnCount = Math.min(2, Math.max(1, 8 - currentBalls));
    for (let i = 0; i < spawnCount; i++) {
      this.spawnBall(this.width / 2 + (i === 0 ? -45 : 45), this.height * 0.28);
    }

    // Seed +8 golden stardust dots onto the board
    this.seedDots(8, 'matrix');

    const bonus = 5000 * this.currentMultiplier;
    this.score += bonus;

    soundSynth.playMultiballMatrixSurge();

    // Sacred geometry shockwave
    this.shockwaves.push({
      x: this.width / 2,
      y: this.height / 2,
      radius: 20,
      maxRadius: 240,
      color: '#ffea00',
      alpha: 1.0,
    });
    this.addSparks(x, y, '#ffea00', 25);
    this.addSparks(this.width / 2, this.height / 2, '#00f3ff', 20);

    this.notices.push({
      text: `★ ALL X-MULTIPLIERS HIT! +${spawnCount} BALLS +8 DOTS ★`,
      x: this.width / 2,
      y: this.height * 0.44,
      vy: -0.5,
      life: 0,
      maxLife: 130,
      color: '#ffea00',
    });

    this.onMultiplierMatrixBonus?.(this.balls.length);
  }

  public triggerWaveClear() {
    if (this.gameState !== 'playing') return;
    this.gameState = 'wave_cleared';
    this.stateCountdown = 2.8; // 2.8 seconds celebration before next wave

    const bonus = 10000 * this.wave * this.currentMultiplier;
    this.score += bonus;

    soundSynth.playWaveClearFanfare();

    this.turntable.scratchImpulse = 0.55;
    this.turntable.scratchGlow = 1.0;
    this.bottomFlairGlow = 1.0;

    for (let i = 0; i < 6; i++) {
      const fx = this.width * (0.2 + Math.random() * 0.6);
      const fy = this.height * (0.2 + Math.random() * 0.5);
      const colors = ['#00ff66', '#00f3ff', '#ff0055', '#ffaa00', '#ffffff'];
      const c = colors[i % colors.length];
      this.addSparks(fx, fy, c, 24);
      this.shockwaves.push({
        x: fx,
        y: fy,
        radius: 12,
        maxRadius: 180 + i * 20,
        color: c,
        alpha: 1.0,
      });
    }

    this.notices.push({
      text: `★ WAVE ${this.wave} CLEARED! +${bonus.toLocaleString()} PTS ★`,
      x: this.width / 2,
      y: this.height * 0.38,
      vy: -0.4,
      life: 0,
      maxLife: 150,
      color: '#00ff66',
    });

    this.onWaveClear?.(this.wave, this.score);
    this.onStateChange?.(this.gameState, this.stateCountdown, this.wave);
  }

  public advanceNextWave() {
    this.wave++;
    this.setupDotGrid(this.wave);
    this.gameState = 'playing';
    this.stateCountdown = 0;

    // Ensure at least 1 ball is on the table
    if (this.balls.length === 0) {
      this.spawnBall();
    }

    // Slightly increase turntable speed and spider challenge
    this.turntable.targetAngularVelocity *= 1.04;
    this.spider.speed = Math.min(0.14, 0.08 + this.wave * 0.008);

    this.notices.push({
      text: `WAVE ${this.wave} START!`,
      x: this.width / 2,
      y: this.height * 0.38,
      vy: -0.5,
      life: 0,
      maxLife: 90,
      color: '#00f3ff',
    });

    this.onStateChange?.(this.gameState, this.stateCountdown, this.wave);
  }

  public triggerGameOver() {
    if (this.gameState !== 'playing') return;
    this.gameState = 'game_over';
    this.stateCountdown = 3.2; // 3.2 seconds countdown to self-playing reset

    soundSynth.playGameOverSound();

    this.shockwaves.push({
      x: this.width / 2,
      y: this.height - 20,
      radius: 10,
      maxRadius: 220,
      color: '#ff0055',
      alpha: 1.0,
    });

    this.notices.push({
      text: 'ALL BALLS DRAINED // ROUND OVER',
      x: this.width / 2,
      y: this.height * 0.42,
      vy: -0.2,
      life: 0,
      maxLife: 160,
      color: '#ff0055',
    });

    this.onGameOver?.(this.score);
    this.onStateChange?.(this.gameState, this.stateCountdown, this.wave);
  }

  public autoRestartGame() {
    this.score = 0;
    this.totalBumps = 0;
    this.totalScratches = 0;
    this.currentMultiplier = 1;
    this.wave = 1;
    this.setupDotGrid(1);
    this.balls = [];
    this.spawnBall();
    this.gameState = 'playing';
    this.stateCountdown = 0;

    this.notices.push({
      text: 'AUTO-RESTART // WAVE 1',
      x: this.width / 2,
      y: this.height * 0.38,
      vy: -0.5,
      life: 0,
      maxLife: 90,
      color: '#00f3ff',
    });

    soundSynth.startIntroTheme();
    this.onStateChange?.(this.gameState, this.stateCountdown, this.wave);
  }

  private distToSegment(px: number, py: number, x1: number, y1: number, x2: number, y2: number) {
    const l2 = (x2 - x1) ** 2 + (y2 - y1) ** 2;
    if (l2 === 0) return { distance: Math.hypot(px - x1, py - y1), closestX: x1, closestY: y1 };

    let t = ((px - x1) * (x2 - x1) + (py - y1) * (y2 - y1)) / l2;
    t = Math.max(0, Math.min(1, t));

    const closestX = x1 + t * (x2 - x1);
    const closestY = y1 + t * (y2 - y1);
    return {
      distance: Math.hypot(px - closestX, py - closestY),
      closestX,
      closestY,
    };
  }

  private addSparks(x: number, y: number, color: string, count: number = 8) {
    for (let i = 0; i < count; i++) {
      const angle = Math.random() * Math.PI * 2;
      const speed = 1.5 + Math.random() * 4.5;
      this.particles.push({
        x,
        y,
        vx: Math.cos(angle) * speed,
        vy: Math.sin(angle) * speed,
        life: 0,
        maxLife: 20 + Math.random() * 15,
        color,
        size: 1.5 + Math.random() * 2.5,
      });
    }
  }

  private updateParticles(dt: number) {
    for (let i = this.particles.length - 1; i >= 0; i--) {
      const p = this.particles[i];
      p.x += p.vx;
      p.y += p.vy;
      p.vx *= 0.96;
      p.vy *= 0.96;
      p.life++;
      if (p.life >= p.maxLife) {
        this.particles.splice(i, 1);
      }
    }

    for (let i = this.shockwaves.length - 1; i >= 0; i--) {
      const s = this.shockwaves[i];
      s.radius += 4;
      s.alpha -= 0.035;
      if (s.alpha <= 0 || s.radius >= s.maxRadius) {
        this.shockwaves.splice(i, 1);
      }
    }

    for (let i = this.notices.length - 1; i >= 0; i--) {
      const n = this.notices[i];
      n.y += n.vy;
      n.life++;
      if (n.life >= n.maxLife) {
        this.notices.splice(i, 1);
      }
    }
  }

  // --- RENDERING ---
  public draw() {
    const ctx = this.ctx;
    ctx.save();

    // Clear background
    ctx.fillStyle = '#050508';
    ctx.fillRect(0, 0, this.width, this.height);

    // Apply compass orientation rotation if active
    if (this.compassRotation !== 0) {
      ctx.translate(this.width / 2, this.height / 2);
      ctx.rotate((this.compassRotation * Math.PI) / 180);
      ctx.translate(-this.width / 2, -this.height / 2);
    }

    // 1. Draw psychedelic background theme
    this.drawBackground(ctx);

    // 2. Draw Dot Grid (Pac-Man / Qix style nodes)
    this.drawDotGrid(ctx);

    // 3. Draw Electric Fences
    this.drawElectricFences(ctx);

    // 4. Draw Central Vinyl Turntable Bumper
    this.drawTurntable(ctx);

    // 5. Draw Tempest Spider Guardian
    this.drawTempestSpider(ctx);

    // 6. Draw Geometric Hazards (Ghosts)
    this.drawHazards(ctx);

    // 7. Draw Corner Rails & Bottom Apron Flairs
    this.drawCornerRailsAndFlairs(ctx);

    // 7.5. Draw Spiked Corner Pinwheels (under bottom flippers)
    this.drawSpikedPinwheels(ctx);

    // 8. Draw Quad-Flippers
    this.drawFlippers(ctx);

    // 9. Draw Ball Trails (Timing Dots) & Balls
    this.drawBalls(ctx);

    // 10. Draw Shockwaves & Sparks
    this.drawParticles(ctx);

    // 11. Draw Floating Celebrations
    this.drawNotices(ctx);

    // 12. Draw Game State Overlay (Wave Clear or Game Over Self-Playing Reset)
    this.drawGameStateOverlay(ctx);

    ctx.restore();
  }

  private drawBackground(ctx: CanvasRenderingContext2D) {
    const w = this.width;
    const h = this.height;
    const cx = w / 2;
    const cy = h / 2;
    const theme = this.settings.bgTheme;
    const time = performance.now() * 0.001;

    ctx.save();

    if (theme === 'grid') {
      // 80s Tron Neon Grid with shifting perspective
      ctx.strokeStyle = 'rgba(0, 243, 255, 0.12)';
      ctx.lineWidth = 1;
      const step = 40;
      const offset = (time * 25) % step;

      for (let x = 0; x < w; x += step) {
        ctx.beginPath();
        ctx.moveTo(x, 0);
        ctx.lineTo(x, h);
        ctx.stroke();
      }
      for (let y = offset; y < h; y += step) {
        ctx.beginPath();
        ctx.moveTo(0, y);
        ctx.lineTo(w, y);
        ctx.stroke();
      }
    } else if (theme === 'tempest') {
      // 3D wireframe cylinder tunnel converging into center turntable
      const lanes = 16;
      ctx.strokeStyle = 'rgba(0, 243, 255, 0.18)';
      ctx.lineWidth = 1;

      for (let i = 0; i < lanes; i++) {
        const a = (i / lanes) * Math.PI * 2 + time * 0.1;
        const outerR = Math.hypot(w, h) * 0.6;
        ctx.beginPath();
        ctx.moveTo(cx + Math.cos(a) * this.turntable.radius, cy + Math.sin(a) * this.turntable.radius);
        ctx.lineTo(cx + Math.cos(a) * outerR, cy + Math.sin(a) * outerR);
        ctx.stroke();
      }

      // Concentric web rings
      for (let r = this.turntable.radius + 30; r < Math.max(w, h); r += 45) {
        const pulseR = r + Math.sin(time * 2 + r * 0.05) * 5;
        ctx.strokeStyle = 'rgba(255, 0, 85, 0.1)';
        ctx.beginPath();
        ctx.arc(cx, cy, pulseR, 0, Math.PI * 2);
        ctx.stroke();
      }
    } else if (theme === 'qix') {
      // Geometric vector ribbon partitioning
      ctx.lineWidth = 1.5;
      const ribbons = 5;
      for (let r = 0; r < ribbons; r++) {
        const t = time * 0.8 + r * 0.5;
        const x1 = cx + Math.cos(t) * (w * 0.4);
        const y1 = cy + Math.sin(t * 1.3) * (h * 0.4);
        const x2 = cx + Math.cos(t * 1.7) * (w * 0.35);
        const y2 = cy + Math.sin(t * 0.9) * (h * 0.35);

        ctx.strokeStyle = r % 2 === 0 ? 'rgba(0, 243, 255, 0.14)' : 'rgba(255, 0, 85, 0.14)';
        ctx.beginPath();
        ctx.moveTo(x1, y1);
        ctx.lineTo(x2, y2);
        ctx.stroke();
      }
    } else if (theme === 'kaleidoscope') {
      // Symmetrical kaleidoscope prisms
      const sectors = 8;
      ctx.strokeStyle = 'rgba(168, 85, 247, 0.15)';
      ctx.lineWidth = 1.2;

      for (let i = 0; i < sectors; i++) {
        const angle = (i / sectors) * Math.PI * 2;
        ctx.save();
        ctx.translate(cx, cy);
        ctx.rotate(angle);
        ctx.beginPath();
        ctx.moveTo(0, 0);
        ctx.lineTo(Math.sin(time + i) * 180, Math.cos(time * 1.5) * 280);
        ctx.lineTo(Math.cos(time + i) * 220, 200);
        ctx.closePath();
        ctx.stroke();
        ctx.restore();
      }
    } else if (theme === 'space') {
      // Hyper-warp streaks
      ctx.strokeStyle = 'rgba(255, 255, 255, 0.22)';
      ctx.lineWidth = 1.2;
      for (let i = 0; i < 24; i++) {
        const a = (i / 24) * Math.PI * 2 + time * 0.05;
        const progress = ((time * 150 + i * 25) % (w * 0.6));
        const r1 = this.turntable.radius + progress;
        const r2 = r1 + 18;
        ctx.beginPath();
        ctx.moveTo(cx + Math.cos(a) * r1, cy + Math.sin(a) * r1);
        ctx.lineTo(cx + Math.cos(a) * r2, cy + Math.sin(a) * r2);
        ctx.stroke();
      }
    }

    ctx.restore();
  }

  private drawDotGrid(ctx: CanvasRenderingContext2D) {
    for (const dot of this.dots) {
      if (dot.collected) continue;
      const dotColor = dot.color || '#00ff66';
      ctx.fillStyle = dotColor;
      ctx.beginPath();
      ctx.arc(dot.x, dot.y, dot.radius, 0, Math.PI * 2);
      ctx.fill();

      // Soft glow
      ctx.fillStyle = dot.isBonus ? `${dotColor}55` : 'rgba(0, 255, 102, 0.25)';
      ctx.beginPath();
      ctx.arc(dot.x, dot.y, dot.radius * 2, 0, Math.PI * 2);
      ctx.fill();
    }
  }

  private drawElectricFences(ctx: CanvasRenderingContext2D) {
    for (const f of this.fences) {
      if (!f.active) {
        // Inactive wireframe placeholder
        ctx.strokeStyle = 'rgba(100, 116, 139, 0.25)';
        ctx.lineWidth = 1;
        ctx.setLineDash([4, 4]);
        ctx.beginPath();
        ctx.moveTo(f.x1, f.y1);
        ctx.lineTo(f.x2, f.y2);
        ctx.stroke();
        ctx.setLineDash([]);
        continue;
      }

      // Active glowing electrical arc
      ctx.save();
      ctx.strokeStyle = f.color;
      ctx.lineWidth = 3;
      ctx.shadowColor = f.color;
      ctx.shadowBlur = 12;

      // Jittering electric arc
      const segments = 6;
      ctx.beginPath();
      ctx.moveTo(f.x1, f.y1);
      for (let i = 1; i < segments; i++) {
        const t = i / segments;
        const jx = f.x1 + (f.x2 - f.x1) * t + (Math.random() - 0.5) * 8;
        const jy = f.y1 + (f.y2 - f.y1) * t + (Math.random() - 0.5) * 8;
        ctx.lineTo(jx, jy);
      }
      ctx.lineTo(f.x2, f.y2);
      ctx.stroke();

      ctx.restore();
    }
  }

  private drawTurntable(ctx: CanvasRenderingContext2D) {
    const cx = this.turntable.x;
    const cy = this.turntable.y;
    const r = this.turntable.radius;

    ctx.save();
    ctx.translate(cx, cy);
    ctx.rotate(this.turntable.angle);

    // 1. Vinyl disc body (glossy black with micro-grooves)
    ctx.fillStyle = '#0a0a10';
    ctx.beginPath();
    ctx.arc(0, 0, r, 0, Math.PI * 2);
    ctx.fill();

    // Outer bumper glow ring
    ctx.strokeStyle = this.turntable.scratchGlow > 0 ? '#ffffff' : this.turntable.color;
    ctx.lineWidth = 4 + this.turntable.scratchGlow * 4;
    ctx.shadowColor = this.turntable.color;
    ctx.shadowBlur = 15 + this.turntable.scratchGlow * 20;
    ctx.stroke();

    // 2. Vinyl sound grooves (concentric micro-rings with light reflections)
    ctx.shadowBlur = 0;
    const grooveCount = 7;
    for (let i = 1; i <= grooveCount; i++) {
      const gr = r * 0.42 + (r * 0.52 * (i / grooveCount));
      ctx.strokeStyle = (i % 2 === 0) ? 'rgba(255, 255, 255, 0.12)' : 'rgba(0, 243, 255, 0.08)';
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.arc(0, 0, gr, 0, Math.PI * 2);
      ctx.stroke();
    }

    // 3. Center Vinyl Label (Retro neon record sticker)
    const labelR = r * 0.38;
    ctx.fillStyle = this.turntable.labelColor;
    ctx.beginPath();
    ctx.arc(0, 0, labelR, 0, Math.PI * 2);
    ctx.fill();

    // Label border
    ctx.strokeStyle = '#ffffff';
    ctx.lineWidth = 2;
    ctx.stroke();

    // Spindle Hole
    ctx.fillStyle = '#050508';
    ctx.beginPath();
    ctx.arc(0, 0, 8, 0, Math.PI * 2);
    ctx.fill();
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.7)';
    ctx.lineWidth = 1.5;
    ctx.stroke();

    // Label typography & RPM art
    ctx.fillStyle = '#ffffff';
    ctx.font = '700 8px monospace';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText('SPIN-VORTEX', 0, -labelR * 0.45);
    ctx.fillText(`${this.settings.rpm} RPM`, 0, labelR * 0.45);

    // Strobe timing markers along the disc edge
    const strobeMarks = 24;
    for (let i = 0; i < strobeMarks; i++) {
      const sa = (i / strobeMarks) * Math.PI * 2;
      ctx.strokeStyle = 'rgba(255, 255, 255, 0.35)';
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.moveTo(Math.cos(sa) * (r - 6), Math.sin(sa) * (r - 6));
      ctx.lineTo(Math.cos(sa) * (r - 2), Math.sin(sa) * (r - 2));
      ctx.stroke();
    }

    ctx.restore();

    // Tone arm / Stylus visual pointing into groove
    ctx.save();
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.7)';
    ctx.lineWidth = 2.5;
    const armPivotX = cx + r * 1.35;
    const armPivotY = cy - r * 1.1;
    const stylusX = cx + r * 0.75;
    const stylusY = cy - r * 0.25;

    ctx.beginPath();
    ctx.arc(armPivotX, armPivotY, 8, 0, Math.PI * 2);
    ctx.fillStyle = '#334155';
    ctx.fill();
    ctx.stroke();

    ctx.beginPath();
    ctx.moveTo(armPivotX, armPivotY);
    ctx.lineTo(stylusX + 15, stylusY - 15);
    ctx.lineTo(stylusX, stylusY);
    ctx.stroke();

    // Stylus cartridge tip
    ctx.fillStyle = '#ffaa00';
    ctx.fillRect(stylusX - 3, stylusY - 3, 6, 6);
    ctx.restore();
  }

  private drawTempestSpider(ctx: CanvasRenderingContext2D) {
    const cx = this.turntable.x;
    const cy = this.turntable.y;
    const sx = cx + Math.cos(this.spider.angle) * this.spider.orbitRadius;
    const spiderY = cy + Math.sin(this.spider.angle) * this.spider.orbitRadius;

    ctx.save();
    ctx.translate(sx, spiderY);
    // Orient spider outward along radius
    ctx.rotate(this.spider.angle + Math.PI / 2);

    const glow = this.spider.activeGlow;
    const spiderColor = glow > 0 ? '#ffffff' : '#ff0055';

    ctx.strokeStyle = spiderColor;
    ctx.lineWidth = 2.5;
    ctx.shadowColor = '#ff0055';
    ctx.shadowBlur = 10 + glow * 15;

    // Vector spider body (Tempest crawling wedge)
    ctx.beginPath();
    ctx.moveTo(0, -12);
    ctx.lineTo(10, 6);
    ctx.lineTo(4, 12);
    ctx.lineTo(-4, 12);
    ctx.lineTo(-10, 6);
    ctx.closePath();
    ctx.fillStyle = 'rgba(255, 0, 85, 0.3)';
    ctx.fill();
    ctx.stroke();

    // Segmented crawler legs
    const legSpread = [-8, 0, 8];
    for (const offset of legSpread) {
      // Left leg
      ctx.beginPath();
      ctx.moveTo(-6, offset);
      ctx.lineTo(-14, offset - 4);
      ctx.lineTo(-20, offset + 6);
      ctx.stroke();

      // Right leg
      ctx.beginPath();
      ctx.moveTo(6, offset);
      ctx.lineTo(14, offset - 4);
      ctx.lineTo(20, offset + 6);
      ctx.stroke();
    }

    // Guardian Core eye
    ctx.fillStyle = '#ffffff';
    ctx.beginPath();
    ctx.arc(0, 0, 3.5, 0, Math.PI * 2);
    ctx.fill();

    ctx.restore();
  }

  private drawHazards(ctx: CanvasRenderingContext2D) {
    const time = performance.now() * 0.001;

    // Draw active constellation laser threads connecting all lit multipliers!
    if (this.litMultiplierIds.size >= 2) {
      const litHazards = this.hazards.filter(h => this.litMultiplierIds.has(h.id));
      ctx.save();
      ctx.strokeStyle = `rgba(255, 234, 0, ${0.35 + 0.25 * Math.sin(time * 6)})`;
      ctx.lineWidth = 2;
      ctx.shadowColor = '#ffea00';
      ctx.shadowBlur = 10;
      ctx.setLineDash([6, 4]);

      ctx.beginPath();
      for (let i = 0; i < litHazards.length; i++) {
        for (let j = i + 1; j < litHazards.length; j++) {
          ctx.moveTo(litHazards[i].x, litHazards[i].y);
          ctx.lineTo(litHazards[j].x, litHazards[j].y);
        }
      }
      ctx.stroke();
      ctx.restore();
    }

    for (const h of this.hazards) {
      ctx.save();
      ctx.translate(h.x, h.y);
      ctx.rotate(h.angle);

      const isLit = h.isLit || this.litMultiplierIds.has(h.id);
      const color = h.hitGlow > 0 ? '#ffffff' : isLit ? '#ffea00' : h.color;
      ctx.strokeStyle = color;
      ctx.lineWidth = isLit ? 3.5 : 2.5;
      ctx.shadowColor = isLit ? '#ffea00' : h.color;
      ctx.shadowBlur = 12 + h.hitGlow * 12 + (isLit ? 10 : 0);

      // Rotating neon halo when lit in the matrix
      if (isLit) {
        ctx.strokeStyle = 'rgba(255, 234, 0, 0.4)';
        ctx.lineWidth = 1.5;
        ctx.beginPath();
        ctx.arc(0, 0, (h.radius || 24) + 8, 0, Math.PI * 2);
        ctx.stroke();
        ctx.strokeStyle = color;
        ctx.lineWidth = 3;
      }

      if (h.type === 'circle') {
        ctx.beginPath();
        ctx.arc(0, 0, h.radius, 0, Math.PI * 2);
        ctx.fillStyle = isLit ? 'rgba(255, 234, 0, 0.35)' : 'rgba(0, 243, 255, 0.2)';
        ctx.fill();
        ctx.stroke();
      } else if (h.type === 'square') {
        const s = h.radius * 1.5;
        ctx.beginPath();
        ctx.rect(-s / 2, -s / 2, s, s);
        ctx.fillStyle = isLit ? 'rgba(255, 234, 0, 0.35)' : 'rgba(0, 255, 102, 0.2)';
        ctx.fill();
        ctx.stroke();
      } else if (h.type === 'triangle') {
        const r = h.radius;
        ctx.beginPath();
        ctx.moveTo(0, -r);
        ctx.lineTo(r * 0.9, r * 0.7);
        ctx.lineTo(-r * 0.9, r * 0.7);
        ctx.closePath();
        ctx.fillStyle = isLit ? 'rgba(255, 234, 0, 0.35)' : 'rgba(255, 0, 85, 0.2)';
        ctx.fill();
        ctx.stroke();
      } else if (h.type === 'rectangle') {
        const w = h.width || 60;
        const ht = h.height || 18;
        ctx.beginPath();
        ctx.roundRect(-w / 2, -ht / 2, w, ht, 4);
        ctx.fillStyle = isLit ? 'rgba(255, 234, 0, 0.35)' : 'rgba(255, 170, 0, 0.2)';
        ctx.fill();
        ctx.stroke();
      }

      // Multiplier digit text
      ctx.shadowBlur = isLit ? 10 : 0;
      ctx.fillStyle = isLit ? '#ffea00' : '#ffffff';
      ctx.font = '700 12px "Press Start 2P", monospace';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText(`${h.multiplier}x`, 0, 0);

      ctx.restore();
    }
  }

  private drawFlippers(ctx: CanvasRenderingContext2D) {
    for (const f of this.flippers) {
      ctx.save();
      ctx.translate(f.pivotX, f.pivotY);

      // Pivot base ring
      ctx.strokeStyle = '#64748b';
      ctx.lineWidth = 3;
      ctx.beginPath();
      ctx.arc(0, 0, 8, 0, Math.PI * 2);
      ctx.fillStyle = '#0f172a';
      ctx.fill();
      ctx.stroke();

      // Flipper arm
      ctx.rotate(f.currentAngle);

      const isGlowing = f.activeGlow > 0;
      ctx.strokeStyle = isGlowing ? '#ffffff' : '#00f3ff';
      ctx.lineWidth = 6;
      ctx.shadowColor = '#00f3ff';
      ctx.shadowBlur = isGlowing ? 18 : 8;

      ctx.beginPath();
      ctx.moveTo(0, 0);
      ctx.lineTo(f.length, 0);
      ctx.stroke();

      // Flipper rubber edge wedge tip
      ctx.fillStyle = isGlowing ? '#ffffff' : '#ff0055';
      ctx.beginPath();
      ctx.arc(f.length, 0, 5, 0, Math.PI * 2);
      ctx.fill();

      ctx.restore();

      // Key label badge
      ctx.save();
      ctx.font = '600 11px monospace';
      ctx.fillStyle = 'rgba(255, 255, 255, 0.6)';
      ctx.textAlign = 'center';
      ctx.fillText(f.label, f.pivotX, f.pivotY - 14);
      ctx.restore();
    }
  }

  private drawBalls(ctx: CanvasRenderingContext2D) {
    for (const ball of this.balls) {
      // Draw timing stroke dots trailing behind ball
      ctx.save();
      for (let i = 0; i < ball.trail.length; i++) {
        const point = ball.trail[i];
        const progress = 1 - (i / ball.trail.length); // 1 at head, 0 at tail
        const dotSize = Math.max(1.5, ball.radius * 0.45 * progress);

        ctx.fillStyle = ball.color;
        ctx.globalAlpha = progress * 0.75;
        ctx.beginPath();
        ctx.arc(point.x, point.y, dotSize, 0, Math.PI * 2);
        ctx.fill();
      }
      ctx.restore();

      // Main pinball
      ctx.save();
      ctx.translate(ball.x, ball.y);

      // Core glow
      ctx.shadowColor = ball.color;
      ctx.shadowBlur = 14;
      ctx.fillStyle = '#ffffff';
      ctx.beginPath();
      ctx.arc(0, 0, ball.radius, 0, Math.PI * 2);
      ctx.fill();

      // Rim color stroke
      ctx.strokeStyle = ball.color;
      ctx.lineWidth = 2.5;
      ctx.stroke();

      // 4 mini quad-flipper pips orbiting the ball: TL, TR, BL, BR
      const pipDist = ball.radius + 4.5;
      const flipperAngles: { id: string; angle: number }[] = [
        { id: 'TL', angle: -Math.PI * 0.75 },
        { id: 'TR', angle: -Math.PI * 0.25 },
        { id: 'BL', angle: Math.PI * 0.75 },
        { id: 'BR', angle: Math.PI * 0.25 },
      ];

      for (const fPos of flipperAngles) {
        const px = Math.cos(fPos.angle) * pipDist;
        const py = Math.sin(fPos.angle) * pipDist;
        const isHit = ball.visitedFlippers?.has(fPos.id);

        ctx.fillStyle = isHit ? '#00ff66' : 'rgba(255, 255, 255, 0.25)';
        ctx.beginPath();
        ctx.arc(px, py, isHit ? 2.5 : 1.5, 0, Math.PI * 2);
        ctx.fill();
      }

      ctx.restore();
    }
  }

  private drawNotices(ctx: CanvasRenderingContext2D) {
    for (const n of this.notices) {
      const alpha = Math.max(0, 1 - (n.life / n.maxLife));
      ctx.save();
      ctx.globalAlpha = alpha;
      ctx.font = '700 13px "Press Start 2P", monospace';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillStyle = n.color;
      ctx.shadowColor = n.color;
      ctx.shadowBlur = 12;
      ctx.fillText(n.text, n.x, n.y);
      ctx.restore();
    }
  }

  private drawParticles(ctx: CanvasRenderingContext2D) {
    // Shockwaves
    for (const s of this.shockwaves) {
      ctx.save();
      ctx.strokeStyle = s.color;
      ctx.globalAlpha = Math.max(0, s.alpha);
      ctx.lineWidth = 3;
      ctx.beginPath();
      ctx.arc(s.x, s.y, s.radius, 0, Math.PI * 2);
      ctx.stroke();
      ctx.restore();
    }

    // Sparks
    for (const p of this.particles) {
      ctx.save();
      const alpha = 1 - (p.life / p.maxLife);
      ctx.fillStyle = p.color;
      ctx.globalAlpha = Math.max(0, alpha);
      ctx.beginPath();
      ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2);
      ctx.fill();
      ctx.restore();
    }
  }

  private drawCornerRailsAndFlairs(ctx: CanvasRenderingContext2D) {
    const w = this.width;
    const h = this.height;
    const time = performance.now() * 0.001;
    const glow = this.bottomFlairGlow;

    ctx.save();

    // 1. Bottom Arcade Apron Radiant Flare Fans
    const gradient = ctx.createLinearGradient(0, h, 0, h - 110);
    gradient.addColorStop(0, glow > 0 ? 'rgba(255, 0, 85, 0.45)' : 'rgba(0, 243, 255, 0.15)');
    gradient.addColorStop(0.5, glow > 0 ? 'rgba(255, 170, 0, 0.2)' : 'rgba(168, 85, 247, 0.08)');
    gradient.addColorStop(1, 'rgba(0, 0, 0, 0)');
    ctx.fillStyle = gradient;
    ctx.fillRect(0, h - 110, w, 110);

    // Radiant Vector Laser Fan Rays
    const rayCount = 14;
    for (let i = 0; i <= rayCount; i++) {
      const rx = (i / rayCount) * w;
      const alpha = (0.1 + glow * 0.35) * Math.sin((i / rayCount) * Math.PI);
      ctx.strokeStyle = i % 2 === 0 ? `rgba(0, 243, 255, ${alpha})` : `rgba(255, 0, 85, ${alpha})`;
      ctx.lineWidth = 1.5;
      ctx.beginPath();
      ctx.moveTo(rx, h);
      ctx.lineTo(w / 2 + (rx - w / 2) * 0.35, h - 85);
      ctx.stroke();
    }

    // 2. Left & Right Bottom Kinetic Vector Rebound Arches (leaving center open for narrowed Drain Gutter)
    const drainL = w * 0.43;
    const drainR = w * 0.57;
    const tunnelTop = h * 0.43;
    const tunnelBottom = h * 0.57;

    // Outer Perimeter Neon Boundaries (leaving gaps for Tunnels and Drains)
    ctx.strokeStyle = 'rgba(0, 243, 255, 0.4)';
    ctx.lineWidth = 2;
    ctx.shadowColor = '#00f3ff';
    ctx.shadowBlur = 6;

    // Left Wall segments
    ctx.beginPath();
    ctx.moveTo(18, 18);
    ctx.lineTo(18, tunnelTop);
    ctx.moveTo(18, tunnelBottom);
    ctx.lineTo(18, h - 18);
    ctx.stroke();

    // Right Wall segments
    ctx.beginPath();
    ctx.moveTo(w - 18, 18);
    ctx.lineTo(w - 18, tunnelTop);
    ctx.moveTo(w - 18, tunnelBottom);
    ctx.lineTo(w - 18, h - 18);
    ctx.stroke();

    // Top Wall segments
    ctx.beginPath();
    ctx.moveTo(18, 18);
    ctx.lineTo(drainL, 18);
    ctx.moveTo(drainR, 18);
    ctx.lineTo(w - 18, 18);
    ctx.stroke();

    // 3. Top Gutter Drain Aperture [drainL to drainR]
    ctx.save();
    const topDrainGrad = ctx.createLinearGradient(0, 28, 0, 0);
    topDrainGrad.addColorStop(0, 'rgba(255, 0, 85, 0)');
    topDrainGrad.addColorStop(1, 'rgba(255, 0, 85, 0.45)');
    ctx.fillStyle = topDrainGrad;
    ctx.fillRect(drainL, 0, drainR - drainL, 28);

    ctx.strokeStyle = 'rgba(255, 0, 85, 0.85)';
    ctx.lineWidth = 2;
    ctx.shadowColor = '#ff0055';
    ctx.shadowBlur = 10;
    ctx.strokeRect(drainL, 0, drainR - drainL, 8);

    ctx.font = '700 8px "Press Start 2P", monospace';
    ctx.textAlign = 'center';
    ctx.fillStyle = `rgba(255, 0, 85, ${0.4 + 0.5 * Math.sin(time * 5)})`;
    ctx.shadowBlur = 6;
    ctx.fillText('▲ DRAIN ▲', w / 2, 18);
    ctx.restore();

    // 4. Bottom Kinetic Vector Rebound Arches
    ctx.strokeStyle = glow > 0 ? '#ffffff' : '#ff0055';
    ctx.lineWidth = 2.5 + glow * 2.5;
    ctx.shadowColor = glow > 0 ? '#ff0055' : '#00f3ff';
    ctx.shadowBlur = 10 + glow * 18;

    // Left Rebound Wall
    ctx.beginPath();
    ctx.moveTo(w * 0.16, h - 14);
    ctx.quadraticCurveTo(w * 0.30, h - 38 - glow * 12, drainL, h - 14);
    ctx.stroke();

    // Right Rebound Wall
    ctx.beginPath();
    ctx.moveTo(drainR, h - 14);
    ctx.quadraticCurveTo(w * 0.70, h - 38 - glow * 12, w * 0.84, h - 14);
    ctx.stroke();

    // 5. Center Bottom Gutter Drain Aperture [drainL to drainR] (50% narrower!)
    ctx.save();
    const drainGrad = ctx.createLinearGradient(0, h - 28, 0, h);
    drainGrad.addColorStop(0, 'rgba(255, 0, 85, 0)');
    drainGrad.addColorStop(1, 'rgba(255, 0, 85, 0.45)');
    ctx.fillStyle = drainGrad;
    ctx.fillRect(drainL, h - 28, drainR - drainL, 28);

    // Hazard neon border across drain mouth
    ctx.strokeStyle = 'rgba(255, 0, 85, 0.85)';
    ctx.lineWidth = 2;
    ctx.shadowColor = '#ff0055';
    ctx.shadowBlur = 10;
    ctx.strokeRect(drainL, h - 8, drainR - drainL, 8);

    // Animated downward hazard chevrons: ▼ DRAIN ▼
    ctx.font = '700 8px "Press Start 2P", monospace';
    ctx.textAlign = 'center';
    ctx.fillStyle = `rgba(255, 0, 85, ${0.4 + 0.5 * Math.sin(time * 5)})`;
    ctx.shadowBlur = 6;
    ctx.fillText('▼ DRAIN ▼', w / 2, h - 14);
    ctx.restore();

    // 6. Pac-Man Side Warp Tunnels
    // Left Portal
    ctx.save();
    const lGrad = ctx.createLinearGradient(0, 0, 24, 0);
    lGrad.addColorStop(0, 'rgba(0, 243, 255, 0.45)');
    lGrad.addColorStop(1, 'rgba(0, 243, 255, 0)');
    ctx.fillStyle = lGrad;
    ctx.fillRect(0, tunnelTop, 24, tunnelBottom - tunnelTop);

    ctx.strokeStyle = '#00f3ff';
    ctx.lineWidth = 2.5;
    ctx.shadowColor = '#00f3ff';
    ctx.shadowBlur = 12;
    ctx.beginPath();
    ctx.moveTo(18, tunnelTop);
    ctx.lineTo(0, tunnelTop + 8);
    ctx.moveTo(18, tunnelBottom);
    ctx.lineTo(0, tunnelBottom - 8);
    ctx.stroke();

    ctx.font = '700 8px "Press Start 2P", monospace';
    ctx.textAlign = 'left';
    ctx.fillStyle = `rgba(0, 243, 255, ${0.5 + 0.4 * Math.sin(time * 6)})`;
    ctx.fillText('◀ TUNNEL', 4, (tunnelTop + tunnelBottom) / 2 + 3);
    ctx.restore();

    // Right Portal
    ctx.save();
    const rGrad = ctx.createLinearGradient(w, 0, w - 24, 0);
    rGrad.addColorStop(0, 'rgba(255, 0, 170, 0.45)');
    rGrad.addColorStop(1, 'rgba(255, 0, 170, 0)');
    ctx.fillStyle = rGrad;
    ctx.fillRect(w - 24, tunnelTop, 24, tunnelBottom - tunnelTop);

    ctx.strokeStyle = '#ff00aa';
    ctx.lineWidth = 2.5;
    ctx.shadowColor = '#ff00aa';
    ctx.shadowBlur = 12;
    ctx.beginPath();
    ctx.moveTo(w - 18, tunnelTop);
    ctx.lineTo(w, tunnelTop + 8);
    ctx.moveTo(w - 18, tunnelBottom);
    ctx.lineTo(w, tunnelBottom - 8);
    ctx.stroke();

    ctx.font = '700 8px "Press Start 2P", monospace';
    ctx.textAlign = 'right';
    ctx.fillStyle = `rgba(255, 0, 170, ${0.5 + 0.4 * Math.sin(time * 6)})`;
    ctx.fillText('TUNNEL ▶', w - 4, (tunnelTop + tunnelBottom) / 2 + 3);
    ctx.restore();

    // 7. Corner Vector Outlane Guide Rails (Curved rails guiding balls into each flipper)
    for (const f of this.flippers) {
      const isTop = f.id === 'TL' || f.id === 'TR';
      const isLeft = f.id === 'TL' || f.id === 'BL';

      const cornerX = isLeft ? 16 : w - 16;

      ctx.save();
      ctx.strokeStyle = f.activeGlow > 0 ? '#ffffff' : 'rgba(0, 243, 255, 0.45)';
      ctx.lineWidth = 2;
      ctx.shadowColor = '#00f3ff';
      ctx.shadowBlur = f.activeGlow > 0 ? 14 : 6;

      // Arc connecting perimeter wall to flipper pivot
      ctx.beginPath();
      ctx.moveTo(cornerX, f.pivotY + (isTop ? -35 : 35));
      ctx.quadraticCurveTo(cornerX, f.pivotY, f.pivotX, f.pivotY);
      ctx.stroke();

      // Guide LED strobe dots along rail
      const railDots = 4;
      for (let d = 0; d < railDots; d++) {
        const t = d / railDots;
        const qx = (1 - t) * (1 - t) * cornerX + 2 * (1 - t) * t * cornerX + t * t * f.pivotX;
        const qy = (1 - t) * (1 - t) * (f.pivotY + (isTop ? -35 : 35)) + 2 * (1 - t) * t * f.pivotY + t * t * f.pivotY;
        ctx.fillStyle = (f.activeGlow > 0) ? '#ff0055' : 'rgba(0, 243, 255, 0.7)';
        ctx.beginPath();
        ctx.arc(qx, qy, 2, 0, Math.PI * 2);
        ctx.fill();
      }

      ctx.restore();
    }

    ctx.restore();
  }

  private drawSpikedPinwheels(ctx: CanvasRenderingContext2D) {
    if (this.settings.spikedPinwheels === false) return;

    for (const p of this.pinwheels) {
      ctx.save();
      ctx.translate(p.x, p.y);

      const color = p.hitGlow > 0 ? '#ffffff' : p.color;
      const glow = 8 + p.hitGlow * 18;

      // 1. Outer Mount Bezel & Strobe Direction Indicators
      ctx.strokeStyle = `rgba(${p.id === 'left' ? '255, 170, 0' : '0, 243, 255'}, ${0.35 + p.hitGlow * 0.5})`;
      ctx.lineWidth = 1.5;
      ctx.shadowColor = p.color;
      ctx.shadowBlur = glow;
      ctx.beginPath();
      ctx.arc(0, 0, p.radius + p.spikeLength + 5, 0, Math.PI * 2);
      ctx.stroke();

      // Mini rotational directional pips around bezel
      const arrowCount = 4;
      const arrowRadius = p.radius + p.spikeLength + 5;
      const isClockwise = p.rotationSpeed > 0;
      for (let i = 0; i < arrowCount; i++) {
        const a = (i / arrowCount) * Math.PI * 2 + (isClockwise ? p.angle * 0.5 : -p.angle * 0.5);
        const ax = Math.cos(a) * arrowRadius;
        const ay = Math.sin(a) * arrowRadius;
        ctx.fillStyle = color;
        ctx.beginPath();
        ctx.arc(ax, ay, 1.8, 0, Math.PI * 2);
        ctx.fill();
      }

      // 2. Rotating Spiked Teeth Wheel
      ctx.rotate(p.angle);

      ctx.beginPath();
      const count = p.spikeCount;
      const rOuter = p.radius + p.spikeLength;
      const rInner = p.radius * 0.72;

      for (let i = 0; i < count; i++) {
        const aTip = (i / count) * Math.PI * 2;
        const aRoot = aTip + (Math.PI / count);

        // Tip of the spike
        const tipX = Math.cos(aTip) * rOuter;
        const tipY = Math.sin(aTip) * rOuter;

        // Curved valley between teeth
        const rootX = Math.cos(aRoot) * rInner;
        const rootY = Math.sin(aRoot) * rInner;

        if (i === 0) {
          ctx.moveTo(tipX, tipY);
        } else {
          ctx.lineTo(tipX, tipY);
        }
        ctx.lineTo(rootX, rootY);
      }
      ctx.closePath();

      // Metallic body gradient
      const bodyGrad = ctx.createRadialGradient(0, 0, 2, 0, 0, rOuter);
      bodyGrad.addColorStop(0, p.hitGlow > 0 ? '#ffffff' : '#334155');
      bodyGrad.addColorStop(0.5, p.hitGlow > 0 ? '#ffea00' : '#1e293b');
      bodyGrad.addColorStop(1, p.hitGlow > 0 ? p.color : '#0f172a');
      ctx.fillStyle = bodyGrad;
      ctx.fill();

      // Sharp neon edge stroke
      ctx.strokeStyle = color;
      ctx.lineWidth = 2;
      ctx.stroke();

      // 3. Center Turbine Axle Hub
      ctx.beginPath();
      ctx.arc(0, 0, p.radius * 0.45, 0, Math.PI * 2);
      ctx.fillStyle = '#080c14';
      ctx.fill();
      ctx.strokeStyle = color;
      ctx.lineWidth = 2;
      ctx.stroke();

      // Center glowing core pip
      ctx.beginPath();
      ctx.arc(0, 0, 3.5, 0, Math.PI * 2);
      ctx.fillStyle = p.hitGlow > 0 ? '#ffffff' : color;
      ctx.fill();

      ctx.restore();
    }
  }

  private drawGameStateOverlay(ctx: CanvasRenderingContext2D) {
    if (this.gameState === 'playing') return;

    const w = this.width;
    const h = this.height;
    const time = performance.now() * 0.001;

    ctx.save();

    if (this.gameState === 'wave_cleared') {
      // Victory celebration banner overlay
      ctx.fillStyle = 'rgba(5, 12, 10, 0.72)';
      ctx.fillRect(0, h * 0.30, w, h * 0.38);

      // Rainbow / neon border lines
      const lineGlow = ctx.createLinearGradient(0, 0, w, 0);
      lineGlow.addColorStop(0, '#00ff66');
      lineGlow.addColorStop(0.5, '#00f3ff');
      lineGlow.addColorStop(1, '#ff0055');
      ctx.fillStyle = lineGlow;
      ctx.fillRect(0, h * 0.30, w, 3);
      ctx.fillRect(0, h * 0.68 - 3, w, 3);

      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';

      // Title
      ctx.font = '900 24px "Press Start 2P", monospace';
      ctx.fillStyle = '#00ff66';
      ctx.shadowColor = '#00ff66';
      ctx.shadowBlur = 16;
      ctx.fillText(`★ WAVE ${this.wave} CLEARED! ★`, w / 2, h * 0.40);

      // Subtitle
      ctx.font = '700 13px "Press Start 2P", monospace';
      ctx.fillStyle = '#ffffff';
      ctx.shadowColor = '#ffffff';
      ctx.shadowBlur = 8;
      ctx.fillText('ALL DOTS COLLECTED // TABLE CONQUERED', w / 2, h * 0.47);

      // Bonus
      const bonus = 10000 * this.wave * this.currentMultiplier;
      ctx.font = '700 12px "Press Start 2P", monospace';
      ctx.fillStyle = '#ffaa00';
      ctx.shadowColor = '#ffaa00';
      ctx.shadowBlur = 10;
      ctx.fillText(`+${bonus.toLocaleString()} PTS WAVE BONUS!`, w / 2, h * 0.54);

      // Countdown
      const secs = Math.max(1, Math.ceil(this.stateCountdown));
      ctx.font = '700 11px monospace';
      ctx.fillStyle = '#00f3ff';
      ctx.shadowBlur = 6;
      ctx.fillText(`NEXT WAVE STARTING IN ${secs}s...`, w / 2, h * 0.61);

    } else if (this.gameState === 'game_over') {
      // Game Over / All Balls Drained overlay
      ctx.fillStyle = 'rgba(15, 5, 8, 0.78)';
      ctx.fillRect(0, h * 0.30, w, h * 0.38);

      ctx.fillStyle = '#ff0055';
      ctx.shadowColor = '#ff0055';
      ctx.shadowBlur = 14;
      ctx.fillRect(0, h * 0.30, w, 3);
      ctx.fillRect(0, h * 0.68 - 3, w, 3);

      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';

      // Title
      ctx.font = '900 24px "Press Start 2P", monospace';
      ctx.fillStyle = '#ff0055';
      ctx.shadowBlur = 18;
      ctx.fillText('ALL BALLS DRAINED', w / 2, h * 0.39);

      // Subtitle
      ctx.font = '700 12px "Press Start 2P", monospace';
      ctx.fillStyle = '#ffffff';
      ctx.shadowColor = '#ffffff';
      ctx.shadowBlur = 8;
      ctx.fillText(`FINAL SCORE: ${this.score.toLocaleString()} (WAVE ${this.wave})`, w / 2, h * 0.47);

      // Self-playing reset countdown
      const secs = Math.max(1, Math.ceil(this.stateCountdown));
      ctx.font = '700 13px "Press Start 2P", monospace';
      ctx.fillStyle = '#00f3ff';
      ctx.shadowColor = '#00f3ff';
      ctx.shadowBlur = 12;
      ctx.fillText(`AUTO-RESET IN ${secs}...`, w / 2, h * 0.55);

      ctx.font = '500 10px monospace';
      ctx.fillStyle = 'rgba(148, 163, 184, 0.8)';
      ctx.shadowBlur = 0;
      ctx.fillText('ZERO-PLAYER SELF-PLAYING ARCADE // RESTARTING NEW ROUND', w / 2, h * 0.62);
    }

    ctx.restore();
  }
}
