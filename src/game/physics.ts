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
  stasisImmunity?: number;
  isCourtesyBall?: boolean;
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
  baseX?: number;
  baseY?: number;
  active: boolean;
  pulseTimer: number;
  pulseDuration: number;
  period: number;
  color: string;
  hitGlow?: number;
  isMoving?: boolean;
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

export interface NeedleTonearm {
  pivotX: number;
  pivotY: number;
  length: number;
  baseAngle: number;
  parkedAngle: number;
  extendedAngle: number;
  currentAngle: number;
  targetAngle: number;
  angularVelocity: number;
  isSuperActive: boolean;
  isExtended: boolean;
  cycleTimer: number; // extension cycle between LP and 45 RPM
  isFlipping: boolean;
  flipTimer: number;
  chargeGlow: number;
  hitGlow: number;
  whipSpeed: number;
}

export interface LaserSlicer {
  x: number;
  y: number;
  radius: number;
  angle: number;
  cooldownTimer: number;
  cycleTimer: number; // 30-second cycle: 25s inactive, 5s engaged
  isEngaged: boolean; // active for 5s of every 30s
  activeGlow: number;
  sliceCount: number;
}

export interface StasisCapturedBall {
  id: number;
  color: string;
  radius: number;
  timer: number;
  maxTimer: number;
  orbitAngle: number;
  orbitRadius: number;
  orbitSpeed: number;
}

export interface StasisChamber {
  x: number;
  y: number;
  radius: number;
  rotation: number;
  activeGlow: number;
  capturedBalls: StasisCapturedBall[];
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

  // Turntable center bumper (varies dynamically between 12" LP and 45 RPM single!)
  public turntable = {
    x: 400,
    y: 400,
    radius: 112,
    targetRadius: 112,
    baseLPRadius: 112,
    compact45Radius: 76,
    is45RPM: false,
    angle: 0,
    angularVelocity: 0.04,
    targetAngularVelocity: 0.04,
    scratchImpulse: 0,
    scratchGlow: 0,
    color: '#00f3ff',
    labelColor: '#ff0055',
  };

  // Audiophile Tonearm: Rests safely parked off the vinyl, extends occasionally to play a 45!
  public needleArm: NeedleTonearm = {
    pivotX: 560,
    pivotY: 270,
    length: 135,
    baseAngle: 2.18,
    parkedAngle: 1.62,
    extendedAngle: 2.18,
    currentAngle: 1.62,
    targetAngle: 1.62,
    angularVelocity: 0,
    isSuperActive: false,
    isExtended: false,
    cycleTimer: 24.0,
    isFlipping: false,
    flipTimer: 0,
    chargeGlow: 0,
    hitGlow: 0,
    whipSpeed: 14,
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

  // Top-Left Laser Slicer (Engages for 5 seconds every 30 seconds!)
  public slicer: LaserSlicer = {
    x: 50,
    y: 50,
    radius: 20,
    angle: 0,
    cooldownTimer: 0,
    cycleTimer: 25.0, // starts in charging cycle: 25s until first engagement
    isEngaged: false,
    activeGlow: 0,
    sliceCount: 0,
  };

  // Top-Right Stasis Capture Chamber (Captures multiple balls for 15s each, shoots to record player!)
  public stasisChamber: StasisChamber = {
    x: 750,
    y: 50,
    radius: 24,
    rotation: 0,
    activeGlow: 0,
    capturedBalls: [],
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
  public topFlairGlow: number = 0;
  public fps: number = 60;

  // Wave & Win/Loss Game States
  public wave: number = 1;
  public dotsTotal: number = 0;
  public dotsRemaining: number = 0;
  public gameState: 'playing' | 'wave_cleared' | 'game_over' = 'playing';
  public stateCountdown: number = 0;
  public isPaused: boolean = false;

  public togglePause(): boolean {
    this.isPaused = !this.isPaused;
    if (this.isPaused) {
      soundSynth.playPauseSound();
      this.notices.push({
        text: '❚❚ GAME PAUSED',
        x: this.turntable.x,
        y: this.turntable.y - this.turntable.radius * 0.62,
        vy: -0.2,
        life: 0,
        maxLife: 80,
        color: '#ffea00',
      });
    } else {
      soundSynth.playResumeSound();
      this.notices.push({
        text: '▶ GAME RESUMED',
        x: this.turntable.x,
        y: this.turntable.y - this.turntable.radius * 0.62,
        vy: -0.2,
        life: 0,
        maxLife: 60,
        color: '#00f3ff',
      });
    }
    return this.isPaused;
  }

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
  private bumperMoveTimer: number = 0;

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
    const oldW = this.width || 800;
    const oldH = this.height || 800;

    this.width = rect.width || 800;
    this.height = rect.height || 800;

    this.canvas.width = this.width * dpr;
    this.canvas.height = this.height * dpr;
    this.ctx.resetTransform?.();
    this.ctx.scale(dpr, dpr);

    const isPortrait = this.height > this.width;

    // Dynamically calculate turntable radius based on portrait / landscape orientation
    // On phones, keeps the record from hogging the narrow horizontal width
    const lpRadius = isPortrait
      ? Math.min(this.width * 0.19, this.height * 0.10)
      : Math.min(this.height * 0.19, this.width * 0.13);
    this.turntable.baseLPRadius = Math.max(54, Math.min(115, lpRadius));
    this.turntable.targetRadius = this.turntable.baseLPRadius;
    this.turntable.radius = this.turntable.baseLPRadius;
    this.turntable.x = this.width / 2;
    this.turntable.y = this.height / 2;
    this.spider.orbitRadius = this.turntable.radius + (isPortrait ? 24 : 32);

    // Refresh all field entities with responsive orientation math
    this.setupFlippers();
    this.setupPinwheels();
    this.setupTopCornerGadgets();
    this.setupNeedleArm();
    this.setupElectricFences();
    this.setupHazards();

    // Scale existing dots if screen resized or rotated
    if (this.dots && this.dots.length > 0 && oldW > 0 && oldH > 0 && (oldW !== this.width || oldH !== this.height)) {
      const scaleX = this.width / oldW;
      const scaleY = this.height / oldH;
      for (const dot of this.dots) {
        dot.x = this.width / 2 + (dot.x - oldW / 2) * scaleX;
        dot.y = this.height / 2 + (dot.y - oldH / 2) * scaleY;
        dot.x = Math.max(28, Math.min(this.width - 28, dot.x));
        dot.y = Math.max(28, Math.min(this.height - 28, dot.y));
      }
    }

    // Keep active balls safely within new arena dimensions
    if (this.balls) {
      for (const b of this.balls) {
        b.x = Math.max(28, Math.min(this.width - 28, b.x));
        b.y = Math.max(28, Math.min(this.height - 28, b.y));
      }
    }
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

    // Setup Top Corner Gadgets (Left Slicer, Right Stasis Capture)
    this.setupTopCornerGadgets();

    // Setup Secret Super Flipper Needle Tonearm
    this.setupNeedleArm();

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

  public spawnCourtesyBall() {
    // Only spawn if no courtesy ball is already in play
    if (this.balls.some(b => b.isCourtesyBall)) return;

    const startX = this.width / 2;
    const startY = this.height * 0.28;
    const angle = Math.PI * 0.5 + (Math.random() - 0.5) * 0.6; // Downward launch into arena
    const speed = 5.5;

    this.balls.push({
      id: Date.now() + Math.random(),
      x: startX,
      y: startY,
      vx: Math.cos(angle) * speed,
      vy: Math.sin(angle) * speed,
      radius: 9,
      color: '#ffea00',
      trail: [],
      lastBounceTime: 0,
      visitedFlippers: new Set<string>(),
      visitedMultipliers: new Set<number>(),
      isCourtesyBall: true,
      stasisImmunity: 9999, // Cannot be captured by stasis
    });

    soundSynth.playBumperChime(3);
    this.addSparks(startX, startY, '#ffea00', 16);
    this.shockwaves.push({
      x: startX,
      y: startY,
      radius: 10,
      maxRadius: 85,
      color: '#ffea00',
      alpha: 1.0,
    });

    this.notices.push({
      text: '⏱️ COURTESY BALL DISPATCHED!',
      x: startX - 75,
      y: startY - 20,
      vy: -0.3,
      life: 0,
      maxLife: 85,
      color: '#ffea00',
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
    const flipperLen = isPortrait
      ? Math.min(w * 0.22, h * 0.09)
      : Math.min(h * 0.20, w * 0.12);

    const marginX = isPortrait ? Math.max(28, w * 0.12) : Math.max(45, w * 0.12);
    // Safe margins away from the top status bar/banners and bottom apron flairs
    const topMarginY = isPortrait ? Math.max(95, h * 0.14) : Math.max(48, h * 0.13);
    const bottomMarginY = isPortrait ? Math.min(h - 72, h * 0.85) : Math.min(h - 45, h * 0.86);

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
    const marginX = isPortrait ? Math.max(28, w * 0.12) : Math.max(45, w * 0.12);
    const bottomMarginY = isPortrait ? Math.min(h - 72, h * 0.85) : Math.min(h - 45, h * 0.86);

    // Placed in the bottom corners directly under the lower flipper pivots
    const leftX = Math.max(26, marginX * 0.58);
    const rightX = Math.min(w - 26, w - marginX * 0.58);
    const pinwheelY = Math.min(h - 24, bottomMarginY + (h - bottomMarginY) * 0.46);
    const r = Math.min(18, Math.max(13, Math.min(w, h) * 0.030));

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

  private setupTopCornerGadgets() {
    const w = this.width;
    const h = this.height;
    const isPortrait = h > w;
    const marginX = isPortrait ? Math.max(28, w * 0.12) : Math.max(45, w * 0.12);
    const topMarginY = isPortrait ? Math.max(95, h * 0.14) : Math.max(48, h * 0.13);

    // Placed in top corners safely above the flipper sweep and clear of banners
    const leftX = Math.max(24, marginX * 0.58);
    const rightX = Math.min(w - 24, w - marginX * 0.58);
    const gadgetY = Math.max(28, topMarginY * 0.44);
    const r = Math.min(20, Math.max(14, Math.min(w, h) * 0.032));

    // Top-Left Laser Slicer (Engages 5s every 30s)
    this.slicer = {
      x: leftX,
      y: gadgetY,
      radius: r,
      angle: 0,
      cooldownTimer: 0,
      cycleTimer: this.slicer?.cycleTimer ?? 25.0,
      isEngaged: false,
      activeGlow: 0,
      sliceCount: this.slicer?.sliceCount ?? 0,
    };

    // Top-Right Stasis Capture Chamber (Captures multiple balls for 15s each, shoots to record player!)
    this.stasisChamber = {
      x: rightX,
      y: gadgetY,
      radius: r * 1.15,
      rotation: 0,
      activeGlow: 0,
      capturedBalls: this.stasisChamber?.capturedBalls || [],
    };
  }

  private setupNeedleArm() {
    const cx = this.width / 2;
    const cy = this.height / 2;
    const r = this.turntable.baseLPRadius;

    // Anchor pivot outside top-right perimeter of the vinyl disc
    const pivotX = cx + r * 1.42;
    const pivotY = cy - r * 1.12;

    // Extended cue position onto the compact 45 RPM record
    const stylusExtendedX = cx + r * 0.45;
    const stylusExtendedY = cy - r * 0.22;
    const dx = stylusExtendedX - pivotX;
    const dy = stylusExtendedY - pivotY;
    const length = Math.hypot(dx, dy);
    const extendedAngle = Math.atan2(dy, dx);
    const parkedAngle = extendedAngle - 0.58; // tilted safely back onto rest cradle

    this.needleArm = {
      pivotX,
      pivotY,
      length,
      baseAngle: extendedAngle,
      parkedAngle,
      extendedAngle,
      currentAngle: parkedAngle,
      targetAngle: parkedAngle,
      angularVelocity: 0,
      isSuperActive: false,
      isExtended: false,
      cycleTimer: 24.0,
      isFlipping: false,
      flipTimer: 0,
      chargeGlow: 0,
      hitGlow: 0,
      whipSpeed: 16,
    };
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
      // 🛑 Rectangle: Heavy bumper shield sliding side to side
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
    const isPortrait = this.height > this.width;

    const vertOffset = isPortrait
      ? Math.min(this.height * 0.19, this.width * 0.44)
      : Math.min(this.height * 0.25, this.width * 0.18);
    const halfWidth = isPortrait
      ? Math.min(this.width * 0.22, 90)
      : Math.min(this.height * 0.16, 120);

    const topBaseY = cy - vertOffset;
    const botBaseY = cy + vertOffset;

    this.fences = [
      // Top Bumper directly above the record (moves up/down and side-to-side independently)
      {
        x1: cx - halfWidth,
        y1: topBaseY,
        x2: cx + halfWidth,
        y2: topBaseY,
        baseX: cx,
        baseY: topBaseY,
        active: true,
        pulseTimer: 0,
        pulseDuration: 999999,
        period: 999999,
        color: '#00f3ff',
        hitGlow: 0,
        isMoving: false,
      },
      // Bottom Bumper directly below the record (moves up/down and side-to-side independently)
      {
        x1: cx - halfWidth,
        y1: botBaseY,
        x2: cx + halfWidth,
        y2: botBaseY,
        baseX: cx,
        baseY: botBaseY,
        active: true,
        pulseTimer: 0,
        pulseDuration: 999999,
        period: 999999,
        color: '#ff0055',
        hitGlow: 0,
        isMoving: false,
      },
    ];
  }

  public setupDotGrid(wave: number = 1) {
    this.dots = [];
    const cx = this.width / 2;
    const cy = this.height / 2;
    const isPortrait = this.height > this.width;
    const rOuter = isPortrait 
      ? Math.min(this.width * 0.40, this.height * 0.24) 
      : Math.min(this.height * 0.38, this.width * 0.26);
    const rInner = this.turntable.baseLPRadius + (isPortrait ? 26 : 38);

    // Refined, clean, elegant arcade constellation dots - NEVER a dense glob!
    if (wave === 1) {
      // Wave 1: 14 evenly spaced constellation dots
      const dotCount = 14;
      const ringRadius = (rInner + rOuter) * 0.5;
      for (let i = 0; i < dotCount; i++) {
        const a = (i / dotCount) * Math.PI * 2;
        this.dots.push({
          x: cx + Math.cos(a) * ringRadius,
          y: cy + Math.sin(a) * ringRadius,
          radius: 3.0,
          collected: false,
          respawnTime: 0,
        });
      }
    } else if (wave === 2) {
      // Wave 2: 18 dots across 2 concentric rings
      const rings = [
        { radius: rInner + (rOuter - rInner) * 0.35, count: 8 },
        { radius: rInner + (rOuter - rInner) * 0.80, count: 10 },
      ];
      for (const r of rings) {
        for (let i = 0; i < r.count; i++) {
          const a = (i / r.count) * Math.PI * 2;
          this.dots.push({
            x: cx + Math.cos(a) * r.radius,
            y: cy + Math.sin(a) * r.radius,
            radius: 3.0,
            collected: false,
            respawnTime: 0,
          });
        }
      }
    } else {
      // Wave 3+: 22 dots across 2 concentric rings
      const rings = [
        { radius: rInner + (rOuter - rInner) * 0.32, count: 10 },
        { radius: rInner + (rOuter - rInner) * 0.78, count: 12 },
      ];
      for (const r of rings) {
        for (let i = 0; i < r.count; i++) {
          const a = (i / r.count) * Math.PI * 2 + (r.count % 2 === 0 ? 0.1 : 0);
          this.dots.push({
            x: cx + Math.cos(a) * r.radius,
            y: cy + Math.sin(a) * r.radius,
            radius: 3.0,
            collected: false,
            respawnTime: 0,
          });
        }
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
    // When paused, freeze physics simulation while letting notices gently decay
    if (this.isPaused) {
      for (let i = this.notices.length - 1; i >= 0; i--) {
        const notice = this.notices[i];
        notice.life += dt * 60;
        notice.y += notice.vy * dt * 60;
        if (notice.life >= notice.maxLife) {
          this.notices.splice(i, 1);
        }
      }
      return;
    }

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
    this.topFlairGlow = Math.max(0, this.topFlairGlow - dt * 2.2);

    // 5.5. Update Spiked Pinwheels rotation & glow
    if (this.settings.spikedPinwheels !== false) {
      for (const p of this.pinwheels) {
        p.angle += p.rotationSpeed * (1 + p.hitGlow * 1.5);
        p.hitGlow = Math.max(0, p.hitGlow - dt * 2.2);
      }
    }

    // 5.6. Update Secret Super Flipper Needle Tonearm
    this.updateNeedleArm(dt);

    // 5.7. Update Top Corner Gadgets (Laser Slicer & Stasis Capture Chamber)
    this.updateTopCornerGadgets(dt);

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
    if (this.fences.length < 2) return;

    // Master 60-second cycle:
    // Top bumper moves during 0s - 30s window (active excursion 0s - 9s)
    // Bottom bumper moves during 30s - 60s window (active excursion 30s - 39s)
    // They are spaced 30 seconds apart, move independently, and never move at the same time!
    this.bumperMoveTimer = (this.bumperMoveTimer + dt) % 60.0;
    const t = this.bumperMoveTimer;

    const cx = this.width / 2;
    const cy = this.height / 2;
    const isPortrait = this.height > this.width;

    const vertOffset = isPortrait
      ? Math.min(this.height * 0.19, this.width * 0.44)
      : Math.min(this.height * 0.25, this.width * 0.18);
    const halfWidth = isPortrait
      ? Math.min(this.width * 0.22, 90)
      : Math.min(this.height * 0.16, 120);

    const topBaseY = cy - vertOffset;
    const botBaseY = cy + vertOffset;

    const topBumper = this.fences[0];
    const botBumper = this.fences[1];

    const maxVertTravel = isPortrait ? Math.min(36, this.height * 0.045) : 32;
    const maxSideTravel = isPortrait ? Math.min(42, this.width * 0.11) : 52;

    // Cycle alternator for horizontal side (cycles between Left/Right every 60s)
    const sideDir = Math.floor((performance.now() * 0.001) / 60.0) % 2 === 0 ? 1 : -1;

    let topVertOffset = 0;
    let topSideOffset = 0;
    let topIsMoving = false;

    let botVertOffset = 0;
    let botSideOffset = 0;
    let botIsMoving = false;

    // 1. TOP BUMPER INDEPENDENT MOVEMENT: 0s to 30s window (active excursion 0s to 9s)
    if (t >= 0 && t < 9.0) {
      topIsMoving = true;
      let progress = 0;
      if (t < 2.5) {
        // Gliding out further from record (UP toward top drain) and to side (e.g. Left)
        const frac = t / 2.5;
        progress = 0.5 - 0.5 * Math.cos(frac * Math.PI);
        if (frac < 0.04 && !topBumper.isMoving) {
          soundSynth.playBumperChime(2);
          this.notices.push({
            text: '▲ TOP BUMPER GUARDING DRAIN ▲',
            x: cx - 45 * sideDir,
            y: topBaseY - 55,
            vy: -0.3,
            life: 0,
            maxLife: 70,
            color: '#00f3ff',
          });
        }
      } else if (t < 6.5) {
        // Holding at outer guard position (relieving top drain pressure)
        progress = 1.0;
      } else {
        // Gliding back to original center base place
        const frac = (t - 6.5) / 2.5;
        progress = 1.0 - (0.5 - 0.5 * Math.cos(frac * Math.PI));
        if (frac < 0.04) {
          soundSynth.playBumperChime(1);
        }
      }

      // Moves UP (negative Y, further from record, toward top drain) and to SIDE
      topVertOffset = -maxVertTravel * progress;
      topSideOffset = -maxSideTravel * sideDir * progress;
    }

    // 2. BOTTOM BUMPER INDEPENDENT MOVEMENT: 30s to 60s window (active excursion 30s to 39s)
    // 30 SECONDS APART from top bumper! Top bumper is resting at original base place.
    if (t >= 30.0 && t < 39.0) {
      botIsMoving = true;
      const bTime = t - 30.0;
      let progress = 0;
      if (bTime < 2.5) {
        // Gliding out further from record (DOWN toward bottom drain) and to OPPOSITE side (e.g. Right)
        const frac = bTime / 2.5;
        progress = 0.5 - 0.5 * Math.cos(frac * Math.PI);
        if (frac < 0.04 && !botBumper.isMoving) {
          soundSynth.playBumperChime(2);
          this.notices.push({
            text: '▼ BOTTOM BUMPER GUARDING DRAIN ▼',
            x: cx + 45 * sideDir,
            y: botBaseY + 55,
            vy: 0.3,
            life: 0,
            maxLife: 70,
            color: '#ff0055',
          });
        }
      } else if (bTime < 6.5) {
        // Holding at outer guard position (relieving bottom drain pressure)
        progress = 1.0;
      } else {
        // Gliding back to original center base place
        const frac = (bTime - 6.5) / 2.5;
        progress = 1.0 - (0.5 - 0.5 * Math.cos(frac * Math.PI));
        if (frac < 0.04) {
          soundSynth.playBumperChime(1);
        }
      }

      // Moves DOWN (positive Y, further from record, toward bottom drain) and to OPPOSITE SIDE (+ vs -)
      botVertOffset = maxVertTravel * progress;
      botSideOffset = maxSideTravel * sideDir * progress;
    }

    // Apply computed 2D positions
    const topCenterX = cx + topSideOffset;
    topBumper.x1 = topCenterX - halfWidth;
    topBumper.x2 = topCenterX + halfWidth;
    topBumper.y1 = topBaseY + topVertOffset;
    topBumper.y2 = topBaseY + topVertOffset;
    topBumper.isMoving = topIsMoving;
    topBumper.hitGlow = Math.max(0, (topBumper.hitGlow || 0) - dt * 2.5);

    const botCenterX = cx + botSideOffset;
    botBumper.x1 = botCenterX - halfWidth;
    botBumper.x2 = botCenterX + halfWidth;
    botBumper.y1 = botBaseY + botVertOffset;
    botBumper.y2 = botBaseY + botVertOffset;
    botBumper.isMoving = botIsMoving;
    botBumper.hitGlow = Math.max(0, (botBumper.hitGlow || 0) - dt * 2.5);
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

  private updateNeedleArm(dt: number) {
    const arm = this.needleArm;

    // Smooth turntable radius transition between 12" LP (112px) and 45 RPM single (76px)
    this.turntable.radius += (this.turntable.targetRadius - this.turntable.radius) * Math.min(1, dt * 3.5);

    // Tonearm automatic extension cycle (every ~26 seconds, extends for 11 seconds!)
    arm.cycleTimer = (arm.cycleTimer ?? 24.0) - dt;
    if (arm.cycleTimer <= 0) {
      arm.cycleTimer = 26.0;
    }

    const shouldExtend = arm.cycleTimer <= 11.0;

    if (!arm.isExtended && shouldExtend) {
      // Tonearm EXTENDS onto record: record switches to compact 45 RPM single!
      arm.isExtended = true;
      arm.targetAngle = arm.extendedAngle;
      this.turntable.targetRadius = this.turntable.compact45Radius; // 76px compact bumper
      this.turntable.is45RPM = true;
      soundSynth.playTurntableScratch(1.4);

      this.shockwaves.push({
        x: this.turntable.x,
        y: this.turntable.y,
        radius: 76,
        maxRadius: 160,
        color: '#ffea00',
        alpha: 1.0,
      });
      this.addSparks(this.turntable.x, this.turntable.y, '#ffea00', 20);

      this.notices.push({
        text: '⚡ 45 RPM SINGLE! (COMPACT BUMPER) ⚡',
        x: this.turntable.x,
        y: this.turntable.y - 88,
        vy: -0.4,
        life: 0,
        maxLife: 80,
        color: '#ffea00',
      });
    } else if (arm.isExtended && !shouldExtend) {
      // Tonearm RETRACTS safely to rest cradle: record expands back to 12" LP!
      arm.isExtended = false;
      arm.targetAngle = arm.parkedAngle;
      this.turntable.targetRadius = this.turntable.baseLPRadius; // 112px standard LP bumper
      this.turntable.is45RPM = false;
      soundSynth.playTurntableScratch(0.9);

      this.shockwaves.push({
        x: this.turntable.x,
        y: this.turntable.y,
        radius: 112,
        maxRadius: 200,
        color: '#00f3ff',
        alpha: 1.0,
      });

      this.notices.push({
        text: '⚡ 12" LP 33 RPM! (FULL-SIZE BUMPER) ⚡',
        x: this.turntable.x,
        y: this.turntable.y - 126,
        vy: -0.4,
        life: 0,
        maxLife: 80,
        color: '#00f3ff',
      });
    }

    // Smooth spring movement toward targetAngle
    const angleDelta = arm.targetAngle - arm.currentAngle;
    arm.currentAngle += angleDelta * Math.min(1, dt * 7.5);

    arm.chargeGlow = Math.max(0, arm.chargeGlow - dt * 2);
    arm.hitGlow = Math.max(0, arm.hitGlow - dt * 2.5);
  }

  public triggerNeedleFlipper() {
    if (this.needleArm.isFlipping) return;
    this.needleArm.isFlipping = true;
    this.needleArm.flipTimer = 0.22;
    this.needleArm.targetAngle = this.needleArm.baseAngle - 0.78; // Powerful upward-inward sweep
    this.needleArm.chargeGlow = 1.0;
    soundSynth.playFlipperSnap();
  }

  private updateTopCornerGadgets(dt: number) {
    // Slicer rotation & cooldown
    this.slicer.angle += dt * 6.5;
    this.slicer.cooldownTimer = Math.max(0, this.slicer.cooldownTimer - dt);
    this.slicer.activeGlow = Math.max(0, this.slicer.activeGlow - dt * 2.2);

    // Slicer 30-second engagement cycle: 25 seconds charging, 5 seconds active!
    this.slicer.cycleTimer = (this.slicer.cycleTimer ?? 25.0) - dt;
    if (this.slicer.cycleTimer <= 0) {
      this.slicer.cycleTimer = 30.0;
    }
    const isNowEngaged = this.slicer.cycleTimer <= 5.0;
    if (!this.slicer.isEngaged && isNowEngaged) {
      soundSynth.playLaserSlice();
      this.slicer.activeGlow = 1.0;
      this.notices.push({
        text: '⚡ SLICER ACTIVE! (5s) ⚡',
        x: this.slicer.x + 40,
        y: this.slicer.y + 30,
        vy: 0.3,
        life: 0,
        maxLife: 65,
        color: '#00f3ff',
      });
    }
    this.slicer.isEngaged = isNowEngaged;

    // Stasis Chamber rotation & glow
    this.stasisChamber.rotation += dt * 2.5;
    this.stasisChamber.activeGlow = Math.max(0, this.stasisChamber.activeGlow - dt * 1.5);

    // Update all captured balls in stasis chamber
    if (!this.stasisChamber.capturedBalls) {
      this.stasisChamber.capturedBalls = [];
    }

    for (let i = this.stasisChamber.capturedBalls.length - 1; i >= 0; i--) {
      const cb = this.stasisChamber.capturedBalls[i];
      cb.timer -= dt;
      cb.orbitAngle += dt * (cb.orbitSpeed || 4.0);

      // When 15 seconds expire -> Release and shoot deliberately towards the record player!
      if (cb.timer <= 0) {
        const dx = this.turntable.x - this.stasisChamber.x;
        const dy = this.turntable.y - this.stasisChamber.y;
        const dist = Math.hypot(dx, dy) || 1;
        const shootSpeed = 19.5;
        const dirX = dx / dist;
        const dirY = dy / dist;

        // Spawn safely outside the chamber radius towards the center turntable
        const spawnDist = this.stasisChamber.radius + cb.radius + 14;
        const spawnX = this.stasisChamber.x + dirX * spawnDist;
        const spawnY = this.stasisChamber.y + dirY * spawnDist;

        this.balls.push({
          id: cb.id,
          x: spawnX,
          y: spawnY,
          vx: dirX * shootSpeed,
          vy: dirY * shootSpeed,
          radius: cb.radius,
          color: cb.color,
          trail: [],
          lastBounceTime: 0,
          visitedFlippers: new Set(),
          visitedMultipliers: new Set(),
          stasisImmunity: 3.5, // 3.5s immunity so nearby bumpers cannot push it right back in!
        });

        this.stasisChamber.capturedBalls.splice(i, 1);
        this.stasisChamber.activeGlow = 1.0;
        soundSynth.playStasisRelease();

        // When imprisoned ball is released, courtesy ball EXPLODES!
        for (let bIdx = this.balls.length - 1; bIdx >= 0; bIdx--) {
          const b = this.balls[bIdx];
          if (b.isCourtesyBall) {
            this.addSparks(b.x, b.y, '#ffea00', 32);
            this.addSparks(b.x, b.y, '#ff0055', 24);
            this.addSparks(b.x, b.y, '#ffffff', 20);
            this.shockwaves.push({
              x: b.x,
              y: b.y,
              radius: 12,
              maxRadius: 130,
              color: '#ffea00',
              alpha: 1.0,
            });
            soundSynth.playLaserSlice();
            this.notices.push({
              text: '💥 COURTESY BALL EXPLODED! lol',
              x: b.x - 75,
              y: b.y - 25,
              vy: -0.4,
              life: 0,
              maxLife: 90,
              color: '#ffea00',
            });
            this.balls.splice(bIdx, 1);
          }
        }

        this.shockwaves.push({
          x: this.stasisChamber.x,
          y: this.stasisChamber.y,
          radius: 12,
          maxRadius: 95,
          color: '#a855f7',
          alpha: 1.0,
        });
        this.addSparks(this.stasisChamber.x, this.stasisChamber.y, '#a855f7', 24);
        this.addSparks(this.stasisChamber.x, this.stasisChamber.y, '#00f3ff', 18);

        this.notices.push({
          text: '⚡ RECORD PLAYER HYPER-LAUNCH! ⚡',
          x: this.stasisChamber.x - 70,
          y: this.stasisChamber.y + 35,
          vy: 0.3,
          life: 0,
          maxLife: 80,
          color: '#a855f7',
        });
        this.score += 1500 * this.currentMultiplier;
      }
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

      // Decrement stasis immunity
      if (ball.stasisImmunity && ball.stasisImmunity > 0) {
        ball.stasisImmunity -= dt;
      }

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

      // 0. Ball-to-Ball Elastic Ricochet Collisions
      for (let j = bIdx - 1; j >= 0; j--) {
        const other = this.balls[j];
        const bdx = other.x - ball.x;
        const bdy = other.y - ball.y;
        const minDist = ball.radius + other.radius;
        const distSq = bdx * bdx + bdy * bdy;

        if (distSq < minDist * minDist && distSq > 0.00001) {
          const dist = Math.sqrt(distSq);
          const nx = bdx / dist;
          const ny = bdy / dist;

          // Push apart to resolve any penetration
          const overlap = minDist - dist;
          ball.x -= nx * (overlap * 0.5 + 0.1);
          ball.y -= ny * (overlap * 0.5 + 0.1);
          other.x += nx * (overlap * 0.5 + 0.1);
          other.y += ny * (overlap * 0.5 + 0.1);

          // Relative velocity
          const rvx = other.vx - ball.vx;
          const rvy = other.vy - ball.vy;
          const velAlongNormal = rvx * nx + rvy * ny;

          // If moving toward each other, calculate elastic impulse
          if (velAlongNormal < 0) {
            const restitution = 0.96;
            let impulseMag = -(1 + restitution) * velAlongNormal * 0.5;
            if (impulseMag < 2.0) impulseMag = 2.0; // lively arcade minimum bounce

            const ix = impulseMag * nx;
            const iy = impulseMag * ny;

            ball.vx -= ix;
            ball.vy -= iy;
            other.vx += ix;
            other.vy += iy;

            // Audio & Visual feedback
            soundSynth.playBallRicochet();
            this.totalBumps++;
            const midX = (ball.x + other.x) * 0.5;
            const midY = (ball.y + other.y) * 0.5;
            this.addSparks(midX, midY, '#ffffff', 5);
            this.addSparks(midX, midY, ball.color || '#00f3ff', 3);
          }
        }
      }

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

      // Top Wall, Top Bowing Elastic Bumpers & Top Gutter Drain
      const topArchControlY = 38 + this.topFlairGlow * 10;
      if (ball.x >= drainLeft && ball.x <= drainRight) {
        if (ball.y - ball.radius < 10) {
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

          if (this.balls.length === 0 && (!this.stasisChamber.capturedBalls || this.stasisChamber.capturedBalls.length === 0)) {
            this.triggerGameOver();
          } else if (this.balls.length === 0 && this.stasisChamber.capturedBalls && this.stasisChamber.capturedBalls.length > 0) {
            this.spawnCourtesyBall();
          }
          continue;
        }
      } else if (ball.x >= this.width * 0.16 && ball.x < drainLeft) {
        // Top-Left Bowing Elastic Bumper Arch
        const t = (ball.x - this.width * 0.16) / (drainLeft - this.width * 0.16);
        const archY = (1 - t) * (1 - t) * 14 + 2 * (1 - t) * t * topArchControlY + t * t * 14;
        if (ball.y - ball.radius <= archY) {
          ball.y = archY + ball.radius + 1;
          ball.vy = Math.max(7.5, Math.abs(ball.vy) * 1.25 + 3.5);
          ball.vx += (t < 0.5 ? 1.5 : -1.5);
          this.topFlairGlow = 1.0;
          soundSynth.playElasticBumperSnap();
          this.totalBumps++;
          this.score += 150 * this.currentMultiplier;
          this.addSparks(ball.x, ball.y, '#00f3ff', 8);
        }
      } else if (ball.x > drainRight && ball.x <= this.width * 0.84) {
        // Top-Right Bowing Elastic Bumper Arch
        const t = (ball.x - drainRight) / (this.width * 0.84 - drainRight);
        const archY = (1 - t) * (1 - t) * 14 + 2 * (1 - t) * t * topArchControlY + t * t * 14;
        if (ball.y - ball.radius <= archY) {
          ball.y = archY + ball.radius + 1;
          ball.vy = Math.max(7.5, Math.abs(ball.vy) * 1.25 + 3.5);
          ball.vx += (t < 0.5 ? 1.5 : -1.5);
          this.topFlairGlow = 1.0;
          soundSynth.playElasticBumperSnap();
          this.totalBumps++;
          this.score += 150 * this.currentMultiplier;
          this.addSparks(ball.x, ball.y, '#00f3ff', 8);
        }
      } else {
        // Solid top corner wall bounce
        if (ball.y - ball.radius < pad) {
          ball.y = pad + ball.radius;
          ball.vy = -ball.vy * this.restitution;
          this.addSparks(ball.x, ball.y, ball.color, 4);
        }
      }

      // Bottom Wall, Bottom Bowing Elastic Bumpers & Bottom Gutter Drain
      const botArchControlY = (this.height - 38) - this.bottomFlairGlow * 10;
      if (ball.x >= drainLeft && ball.x <= drainRight) {
        if (ball.y + ball.radius > this.height - 10) {
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

          if (this.balls.length === 0 && (!this.stasisChamber.capturedBalls || this.stasisChamber.capturedBalls.length === 0)) {
            this.triggerGameOver();
          } else if (this.balls.length === 0 && this.stasisChamber.capturedBalls && this.stasisChamber.capturedBalls.length > 0) {
            this.spawnCourtesyBall();
          }
          continue;
        }
      } else if (ball.x >= this.width * 0.16 && ball.x < drainLeft) {
        // Bottom-Left Bowing Elastic Bumper Arch
        const t = (ball.x - this.width * 0.16) / (drainLeft - this.width * 0.16);
        const archY = (1 - t) * (1 - t) * (this.height - 14) + 2 * (1 - t) * t * botArchControlY + t * t * (this.height - 14);
        if (ball.y + ball.radius >= archY) {
          ball.y = archY - ball.radius - 1;
          ball.vy = -Math.max(7.5, Math.abs(ball.vy) * 1.25 + 3.5);
          ball.vx += (t < 0.5 ? 1.5 : -1.5);
          this.bottomFlairGlow = 1.0;
          soundSynth.playElasticBumperSnap();
          this.totalBumps++;
          this.score += 150 * this.currentMultiplier;
          this.addSparks(ball.x, ball.y, '#ff0055', 8);
        }
      } else if (ball.x > drainRight && ball.x <= this.width * 0.84) {
        // Bottom-Right Bowing Elastic Bumper Arch
        const t = (ball.x - drainRight) / (this.width * 0.84 - drainRight);
        const archY = (1 - t) * (1 - t) * (this.height - 14) + 2 * (1 - t) * t * botArchControlY + t * t * (this.height - 14);
        if (ball.y + ball.radius >= archY) {
          ball.y = archY - ball.radius - 1;
          ball.vy = -Math.max(7.5, Math.abs(ball.vy) * 1.25 + 3.5);
          ball.vx += (t < 0.5 ? 1.5 : -1.5);
          this.bottomFlairGlow = 1.0;
          soundSynth.playElasticBumperSnap();
          this.totalBumps++;
          this.score += 150 * this.currentMultiplier;
          this.addSparks(ball.x, ball.y, '#ff0055', 8);
        }
      } else {
        // Solid bottom corner wall bounce
        if (ball.y + ball.radius > this.height - 10) {
          ball.y = this.height - 10 - ball.radius;
          ball.vy = -ball.vy * this.restitution;
          this.addSparks(ball.x, ball.y, ball.color, 4);
        }
      }

      // 2. Central Turntable Bumper Collision (The Vinyl Scratch Bumper!)
      const dx = ball.x - cx;
      const dy = ball.y - cy;
      const distCenter = Math.hypot(dx, dy);

      // Check if ball penetrated into the inner disc circle / spindle
      if (distCenter < rTurntable - 6) {
        // BALL DISINTEGRATES! Eliminates unpleasant screeching noise loop completely
        this.addSparks(ball.x, ball.y, '#ff0055', 30);
        this.addSparks(ball.x, ball.y, '#00f3ff', 24);
        this.addSparks(ball.x, ball.y, '#ffea00', 16);
        this.shockwaves.push({
          x: ball.x,
          y: ball.y,
          radius: 12,
          maxRadius: 80,
          color: '#ff0055',
          alpha: 1.0,
        });
        soundSynth.playLaserSlice();
        this.notices.push({
          text: '⚡ VINYL DISINTEGRATED! ⚡',
          x: ball.x - 55,
          y: ball.y,
          vy: -0.4,
          life: 0,
          maxLife: 60,
          color: '#ff0055',
        });
        this.balls.splice(bIdx, 1);
        if (this.balls.length === 0 && (!this.stasisChamber.capturedBalls || this.stasisChamber.capturedBalls.length === 0)) {
          this.spawnBall();
        }
        continue;
      }

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

        // Controlled dot density: only seed 1 dot on rare scratches if dots are sparse
        if (Math.random() < 0.10 && this.dotsRemaining < 20) {
          this.seedDots(1, 'vinyl', cx, cy);
          this.notices.push({
            text: 'VINYL GROOVE +1 DOT',
            x: cx,
            y: cy - rTurntable - 15,
            vy: -0.4,
            life: 0,
            maxLife: 55,
            color: '#00f3ff',
          });
        }
      }

      // Note: Needle tonearm hangs safely overhead on its elevated gimbal, so balls roll
      // freely underneath without ever getting trapped or pinched against the record!

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

        // Spider Guardian weaves glowing silk dots in its wake (capped for clean gameplay)
        if (this.dotsRemaining < 20) {
          this.seedDots(1, 'spider', spiderX, spiderY);
          this.notices.push({
            text: 'SPIDER WEAVE +1 DOT',
            x: spiderX,
            y: spiderY - 20,
            vy: -0.4,
            life: 0,
            maxLife: 55,
            color: '#ff00aa',
          });
        }
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

      // 5. Dynamic Moving Bumpers (Above and Below the Record)
      for (const f of this.fences) {
        // Line-segment to circle distance
        const lineDist = this.distToSegment(ball.x, ball.y, f.x1, f.y1, f.x2, f.y2);
        if (lineDist.distance < ball.radius + 8) {
          // Repel with lively pinball bumper impulse
          const nx = (ball.x - lineDist.closestX) / (lineDist.distance || 1);
          const ny = (ball.y - lineDist.closestY) / (lineDist.distance || 1);

          const dot = ball.vx * nx + ball.vy * ny;
          const bounceForce = 1.25;
          ball.vx = (ball.vx - 2 * dot * nx) * bounceForce + nx * 2.5;
          ball.vy = (ball.vy - 2 * dot * ny) * bounceForce + ny * 2.5;

          ball.x = lineDist.closestX + nx * (ball.radius + 9);
          ball.y = lineDist.closestY + ny * (ball.radius + 9);

          f.hitGlow = 1.0;
          soundSynth.playElasticBumperSnap();
          this.totalBumps++;
          this.score += 250 * this.currentMultiplier;
          this.addSparks(ball.x, ball.y, f.color, 12);
          this.shockwaves.push({
            x: lineDist.closestX,
            y: lineDist.closestY,
            radius: 8,
            maxRadius: 75,
            color: f.color,
            alpha: 1.0,
          });
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

      // 5.6. Top-Left Laser Slicer (Engages for 5 seconds every 30 seconds!)
      {
        const s = this.slicer;
        const sdx = ball.x - s.x;
        const sdy = ball.y - s.y;
        const sDist = Math.hypot(sdx, sdy);

        if (sDist < s.radius + ball.radius) {
          const snx = sdx / (sDist || 1);
          const sny = sdy / (sDist || 1);

          if (s.isEngaged && s.cooldownTimer <= 0) {
            // Slicer is actively ENGAGED (5-second window): Slices ball into twins!
            s.cooldownTimer = 1.2;
            s.activeGlow = 1.0;
            s.sliceCount++;

            soundSynth.playLaserSlice();
            this.totalBumps++;
            this.score += 750 * this.currentMultiplier;

            this.shockwaves.push({
              x: s.x,
              y: s.y,
              radius: 10,
              maxRadius: 75,
              color: '#00f3ff',
              alpha: 1.0,
            });
            this.addSparks(s.x, s.y, '#00f3ff', 18);
            this.addSparks(s.x, s.y, '#ff0055', 18);

            // Deflect original ball out downward-left
            const origSpeed = Math.max(9, Math.hypot(ball.vx, ball.vy));
            ball.vx = -Math.abs(ball.vx * 0.8) - 4;
            ball.vy = Math.abs(ball.vy * 0.8) + 4;
            ball.radius = Math.max(6.5, ball.radius * 0.82); // Sliced slightly sleeker
            ball.x = s.x + 14;
            ball.y = s.y + 14;

            // Spawn the twin sliced half! (Capped to prevent chaotic ball flooding)
            if (this.balls.length < 8) {
              const twinAngle = 0.58 + (Math.random() - 0.5) * 0.3; // Launch down-right
              this.balls.push({
                id: Date.now() + Math.random(),
                x: s.x + 18,
                y: s.y + 18,
                vx: Math.cos(twinAngle) * (origSpeed * 1.1 + 3),
                vy: Math.sin(twinAngle) * (origSpeed * 1.1 + 3),
                radius: ball.radius,
                color: '#ff00aa',
                trail: [],
                lastBounceTime: 0,
                visitedFlippers: new Set(),
                visitedMultipliers: new Set(),
              });
            }

            this.notices.push({
              text: '⚔️ BALL SLICED IN HALF! x2',
              x: s.x + 40,
              y: s.y + 30,
              vy: 0.3,
              life: 0,
              maxLife: 65,
              color: '#00f3ff',
            });
          } else if (!s.isEngaged) {
            // Slicer is in 25-second charging cycle: acts as resilient corner rubber bumper!
            ball.x = s.x + snx * (s.radius + ball.radius + 2);
            const dot = ball.vx * snx + ball.vy * sny;
            const bounceForce = 1.12;
            ball.vx = (ball.vx - 2 * dot * snx) * bounceForce;
            ball.vy = (ball.vy - 2 * dot * sny) * bounceForce;

            s.activeGlow = 0.4;
            soundSynth.playPinwheelRicochet();
            this.totalBumps++;
            this.score += 100 * this.currentMultiplier;
            this.addSparks(ball.x, ball.y, '#00f3ff', 6);
          }
        }
      }

      // 5.7. Top-Right Stasis Capture Chamber (Captures multiple balls for 15s each, shoots to record player!)
      {
        const sc = this.stasisChamber;
        if (!sc.capturedBalls) sc.capturedBalls = [];

        // Courtesy ball deflects off stasis chamber like a resilient bumper
        if (ball.isCourtesyBall) {
          const cdx = ball.x - sc.x;
          const cdy = ball.y - sc.y;
          const cDist = Math.hypot(cdx, cdy);
          if (cDist < sc.radius + ball.radius) {
            const cnx = cdx / (cDist || 1);
            const cny = cdy / (cDist || 1);
            ball.x = sc.x + cnx * (sc.radius + ball.radius + 2);
            const dot = ball.vx * cnx + ball.vy * cny;
            ball.vx = (ball.vx - 2 * dot * cnx) * 1.15;
            ball.vy = (ball.vy - 2 * dot * cny) * 1.15;
            sc.activeGlow = 0.6;
            soundSynth.playPinwheelRicochet();
          }
        } else if ((ball.stasisImmunity || 0) <= 0) {
          const cdx = ball.x - sc.x;
          const cdy = ball.y - sc.y;
          const cDist = Math.hypot(cdx, cdy);

          if (cDist < sc.radius + ball.radius) {
            // Trap the ball in stasis for 15 seconds!
            const trappedCount = sc.capturedBalls.length + 1;
            sc.capturedBalls.push({
              id: ball.id,
              color: ball.color,
              radius: ball.radius,
              timer: 15.0,
              maxTimer: 15.0,
              orbitAngle: (trappedCount * Math.PI * 2) / Math.max(1, trappedCount),
              orbitRadius: 7 + (trappedCount % 3) * 4,
              orbitSpeed: 3.5 + Math.random() * 2,
            });
            sc.activeGlow = 1.0;
            soundSynth.playStasisCapture();

            this.shockwaves.push({
              x: sc.x,
              y: sc.y,
              radius: 8,
              maxRadius: 85,
              color: '#a855f7',
              alpha: 1.0,
            });
            this.addSparks(sc.x, sc.y, '#a855f7', 20);
            this.addSparks(sc.x, sc.y, '#ffffff', 10);

            this.notices.push({
              text: trappedCount > 1 ? `🔒 STASIS CAPTURE (${trappedCount} BALLS)` : '🔒 CAPTURED! (15 SECONDS)',
              x: sc.x - 70,
              y: sc.y + 30,
              vy: 0.3,
              life: 0,
              maxLife: 80,
              color: '#a855f7',
            });

            // Remove captured ball from active playfield balls
            this.balls.splice(bIdx, 1);

            // If ALL active balls are now captured, dispatch a courtesy ball to keep gameplay going!
            if (this.balls.length === 0 && sc.capturedBalls.length > 0) {
              this.spawnCourtesyBall();
            } else if (this.balls.length === 0 && sc.capturedBalls.length === 0) {
              this.triggerGameOver();
            }
            continue;
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
   * Strictly caps dot density (max 24 active dots, 42px min spacing) so dots NEVER form a mass or glob!
   */
  public seedDots(count: number, source: 'spider' | 'vinyl' | 'matrix', originX?: number, originY?: number) {
    if (this.gameState !== 'playing') return;

    // Hard ceiling on active uncollected dots (never allows a mass or glob)
    const MAX_ACTIVE_DOTS = 24;
    if (this.dotsRemaining >= MAX_ACTIVE_DOTS) return;

    const cx = originX ?? this.width / 2;
    const cy = originY ?? this.height / 2;
    const rOuter = Math.min(this.width, this.height) * 0.38;
    const rInner = this.turntable.baseLPRadius + 42;

    let added = 0;
    const maxAttempts = 16;

    for (let i = 0; i < count; i++) {
      if (this.dotsRemaining + added >= MAX_ACTIVE_DOTS) break;

      for (let attempt = 0; attempt < maxAttempts; attempt++) {
        let dx: number;
        let dy: number;
        let dotColor = '#00ff66';

        if (source === 'spider') {
          const a = this.spider.angle + (Math.random() - 0.5) * 0.8;
          const dist = this.spider.orbitRadius + (Math.random() - 0.5) * 20;
          dx = this.turntable.x + Math.cos(a) * dist;
          dy = this.turntable.y + Math.sin(a) * dist;
          dotColor = '#ff00aa'; // Magenta spider silk dot
        } else if (source === 'vinyl') {
          const a = Math.random() * Math.PI * 2;
          const dist = this.turntable.radius + 36 + Math.random() * 24;
          dx = cx + Math.cos(a) * dist;
          dy = cy + Math.sin(a) * dist;
          dotColor = '#00f3ff'; // Cyan vinyl groove dot
        } else {
          const a = (i / count) * Math.PI * 2;
          const dist = rInner + (rOuter - rInner) * (0.35 + Math.random() * 0.55);
          dx = cx + Math.cos(a) * dist;
          dy = cy + Math.sin(a) * dist;
          dotColor = '#ffea00'; // Golden matrix supernova dot
        }

        dx = Math.max(38, Math.min(this.width - 38, dx));
        dy = Math.max(38, Math.min(this.height - 48, dy));

        // Spatial density constraint: do not place dot within 42px of any existing uncollected dot!
        const tooClose = this.dots.some(d => !d.collected && Math.hypot(d.x - dx, d.y - dy) < 42);
        if (tooClose) continue;

        // Keep dots safely outside the vinyl disc perimeter
        const distCenter = Math.hypot(dx - cx, dy - cy);
        if (distCenter < this.turntable.baseLPRadius + 36) continue;

        this.dots.push({
          x: dx,
          y: dy,
          radius: source === 'matrix' ? 3.5 : 3.0,
          collected: false,
          respawnTime: 0,
          color: dotColor,
          isBonus: true,
        });
        added++;
        break;
      }
    }

    if (added > 0) {
      this.dotsTotal += added;
      this.dotsRemaining += added;
      soundSynth.playDotSpawnChime();
      this.onDotsUpdate?.(this.dotsRemaining, this.dotsTotal);
    }
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

    // 7.6. Draw Top Corner Gadgets (Laser Slicer & Stasis Capture Chamber)
    this.drawTopCornerGadgets(ctx);

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

    // 13. Draw Pause Overlay
    this.drawPauseOverlay(ctx);

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
      
      // Crisp retro-arcade constellation dot node
      ctx.fillStyle = dotColor;
      ctx.beginPath();
      ctx.arc(dot.x, dot.y, 3.0, 0, Math.PI * 2);
      ctx.fill();

      // Thin crisp outer vector halo ring (never a foggy blurry glob)
      ctx.strokeStyle = dot.isBonus ? `${dotColor}88` : 'rgba(0, 255, 102, 0.4)';
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.arc(dot.x, dot.y, 4.8, 0, Math.PI * 2);
      ctx.stroke();
    }
  }

  private drawElectricFences(ctx: CanvasRenderingContext2D) {
    const time = performance.now() * 0.001;

    for (let i = 0; i < this.fences.length; i++) {
      const f = this.fences[i];
      const isTop = i === 0;

      const baseX = f.baseX ?? (this.width / 2);
      const baseY = f.baseY ?? (isTop ? this.height / 2 - 145 : this.height / 2 + 145);

      const isPortrait = this.height > this.width;
      // Vertical excursion range: top bumper extends upward toward top drain; bottom extends downward toward bottom drain
      const vertMax = isPortrait ? Math.min(38, this.height * 0.045) : 36;
      const trackTop = isTop ? baseY - vertMax : baseY - 6;
      const trackBot = isTop ? baseY + 6 : baseY + vertMax;

      ctx.save();

      // 1. Horizontal Traverse Guide Rail (showing side-to-side travel capability)
      const travSpan = isPortrait ? Math.min(80, this.width * 0.20) : 110;
      const travLeft = baseX - travSpan;
      const travRight = baseX + travSpan;
      ctx.strokeStyle = 'rgba(100, 116, 139, 0.28)';
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.moveTo(travLeft, baseY);
      ctx.lineTo(travRight, baseY);
      ctx.stroke();

      // Horizontal calibration stops
      ctx.fillStyle = '#334155';
      ctx.fillRect(travLeft - 3, baseY - 4, 6, 8);
      ctx.fillRect(travRight - 3, baseY - 4, 6, 8);

      // 2. Vertical Telescoping Piston Guide Rails at f.x1 and f.x2
      ctx.strokeStyle = 'rgba(100, 116, 139, 0.35)';
      ctx.lineWidth = 1.8;
      // Left vertical rail slot
      ctx.beginPath();
      ctx.moveTo(f.x1, trackTop);
      ctx.lineTo(f.x1, trackBot);
      ctx.stroke();
      // Right vertical rail slot
      ctx.beginPath();
      ctx.moveTo(f.x2, trackTop);
      ctx.lineTo(f.x2, trackBot);
      ctx.stroke();

      // Calibration tick marks along vertical rails
      ctx.strokeStyle = 'rgba(148, 163, 184, 0.22)';
      ctx.lineWidth = 1;
      for (let y = Math.min(trackTop, trackBot); y <= Math.max(trackTop, trackBot); y += 8) {
        ctx.beginPath();
        ctx.moveTo(f.x1 - 2.5, y);
        ctx.lineTo(f.x1 + 2.5, y);
        ctx.moveTo(f.x2 - 2.5, y);
        ctx.lineTo(f.x2 + 2.5, y);
        ctx.stroke();
      }

      // Mechanical guide stops at ends of vertical track
      ctx.fillStyle = '#334155';
      ctx.fillRect(f.x1 - 3.5, trackTop - 2, 7, 4);
      ctx.fillRect(f.x1 - 3.5, trackBot - 2, 7, 4);
      ctx.fillRect(f.x2 - 3.5, trackTop - 2, 7, 4);
      ctx.fillRect(f.x2 - 3.5, trackBot - 2, 7, 4);

      // 3. Hydraulic servo actuator pistons (20% reduced size: radius 5.2)
      const hitGlow = f.hitGlow || 0;
      const pistonColor = hitGlow > 0 ? '#ffffff' : (f.isMoving ? '#ffea00' : f.color);

      // Left piston head
      ctx.fillStyle = '#0f172a';
      ctx.strokeStyle = pistonColor;
      ctx.lineWidth = 1.8;
      ctx.beginPath();
      ctx.arc(f.x1, f.y1, 5.2, 0, Math.PI * 2);
      ctx.fill();
      ctx.stroke();

      // Right piston head
      ctx.beginPath();
      ctx.arc(f.x2, f.y2, 5.2, 0, Math.PI * 2);
      ctx.fill();
      ctx.stroke();

      // 4. Solid Pinball Bumper Rebound Bar (20% reduced size: lineWidth 5)
      ctx.strokeStyle = hitGlow > 0 ? '#ffffff' : f.color;
      ctx.lineWidth = 5;
      ctx.shadowColor = f.color;
      ctx.shadowBlur = hitGlow > 0 ? 18 : 10;
      ctx.beginPath();
      ctx.moveTo(f.x1, f.y1);
      ctx.lineTo(f.x2, f.y2);
      ctx.stroke();

      // Hot inner energy core
      ctx.strokeStyle = hitGlow > 0 ? '#ffffff' : 'rgba(255, 255, 255, 0.85)';
      ctx.lineWidth = 1.8;
      ctx.shadowBlur = 0;
      ctx.beginPath();
      ctx.moveTo(f.x1 + 3, f.y1);
      ctx.lineTo(f.x2 - 3, f.y2);
      ctx.stroke();

      // Animated plasma micro-arcs across bumper face
      ctx.strokeStyle = hitGlow > 0 ? '#ffffff' : f.color;
      ctx.lineWidth = 1.2;
      ctx.beginPath();
      const segments = 5;
      ctx.moveTo(f.x1, f.y1);
      for (let s = 1; s < segments; s++) {
        const frac = s / segments;
        const jx = f.x1 + (f.x2 - f.x1) * frac;
        const jy = f.y1 + Math.sin(time * 12 + s * 2) * 2.2;
        ctx.lineTo(jx, jy);
      }
      ctx.lineTo(f.x2, f.y2);
      ctx.stroke();

      // 5. Center Illuminated Bumper Cap Pip (20% reduced: outer radius 6.4, inner 2.8)
      const midX = (f.x1 + f.x2) * 0.5;
      ctx.fillStyle = hitGlow > 0 ? '#ffffff' : '#0f172a';
      ctx.strokeStyle = pistonColor;
      ctx.lineWidth = 1.8;
      ctx.beginPath();
      ctx.arc(midX, f.y1, 6.4, 0, Math.PI * 2);
      ctx.fill();
      ctx.stroke();

      ctx.fillStyle = hitGlow > 0 ? '#000000' : pistonColor;
      ctx.beginPath();
      ctx.arc(midX, f.y1, 2.8, 0, Math.PI * 2);
      ctx.fill();

      // Active drain relief indicator arrows when extended
      if (f.isMoving) {
        ctx.font = '700 6px "Press Start 2P", monospace';
        ctx.textAlign = 'center';
        ctx.fillStyle = pistonColor;
        ctx.shadowColor = pistonColor;
        ctx.shadowBlur = 6;
        const labelY = isTop ? f.y1 - 10 : f.y1 + 14;
        ctx.fillText(isTop ? '▲ DRAIN RELIEF ▲' : '▼ DRAIN RELIEF ▼', midX, labelY);
      }

      ctx.restore();
    }
  }

  private drawTurntable(ctx: CanvasRenderingContext2D) {
    const cx = this.turntable.x;
    const cy = this.turntable.y;
    const r = this.turntable.radius;
    const is45 = this.turntable.is45RPM;
    const labelR = r * (is45 ? 0.48 : 0.38);

    // 1. ROTATING VINYL DISC (Spins dynamically at specified RPM)
    ctx.save();
    ctx.translate(cx, cy);
    ctx.rotate(this.turntable.angle);

    // Vinyl disc body (glossy vinyl black)
    ctx.fillStyle = '#080811';
    ctx.beginPath();
    ctx.arc(0, 0, r, 0, Math.PI * 2);
    ctx.fill();

    // Outer bumper glow ring
    ctx.strokeStyle = this.turntable.scratchGlow > 0 ? '#ffffff' : this.turntable.color;
    ctx.lineWidth = 4 + this.turntable.scratchGlow * 4;
    ctx.shadowColor = this.turntable.color;
    ctx.shadowBlur = 15 + this.turntable.scratchGlow * 20;
    ctx.stroke();
    ctx.shadowBlur = 0;

    // 1.1. Anisotropic Phonograph Light Sheen (Signature rotating bowtie reflection glare!)
    // As the record spins, these specular sheen glare fans sweep across the grooves in real-time
    const sheenAngles = [0, Math.PI, Math.PI * 0.5, Math.PI * 1.5];
    for (let si = 0; si < sheenAngles.length; si++) {
      const sa = sheenAngles[si];
      const isPrimary = si < 2;
      const spread = isPrimary ? 0.38 : 0.22;
      const alpha = isPrimary ? 0.18 : 0.08;

      ctx.save();
      ctx.beginPath();
      ctx.moveTo(Math.cos(sa - spread) * labelR, Math.sin(sa - spread) * labelR);
      ctx.arc(0, 0, r - 3, sa - spread, sa + spread);
      ctx.lineTo(Math.cos(sa + spread) * labelR, Math.sin(sa + spread) * labelR);
      ctx.closePath();

      const sheenGrad = ctx.createRadialGradient(0, 0, labelR, 0, 0, r);
      sheenGrad.addColorStop(0, `rgba(255, 255, 255, ${alpha * 0.4})`);
      sheenGrad.addColorStop(0.5, `rgba(${isPrimary ? '255, 255, 255' : '0, 243, 255'}, ${alpha})`);
      sheenGrad.addColorStop(1, `rgba(255, 255, 255, ${alpha * 0.1})`);
      ctx.fillStyle = sheenGrad;
      ctx.fill();
      ctx.restore();
    }

    // 1.2. Continuous Archimedean Spiral Sound Grooves
    // Spirals physically wind inward as the turntable rotates, creating unmistakable movement!
    const trackCount = 3;
    const bandSpan = (r - 8 - (labelR + 4)) / trackCount;

    for (let band = 0; band < trackCount; band++) {
      const bOuter = r - 8 - band * bandSpan;
      const bInner = bOuter - bandSpan * 0.88;

      // Dark ungrooved gap between songs ("band gap")
      ctx.strokeStyle = 'rgba(0, 0, 0, 0.65)';
      ctx.lineWidth = 1.8;
      ctx.beginPath();
      ctx.arc(0, 0, bOuter + 1, 0, Math.PI * 2);
      ctx.stroke();

      // Continuous spiral sound track
      const turns = 4;
      const totalPoints = turns * 36;
      ctx.strokeStyle = (band % 2 === 0) ? 'rgba(255, 255, 255, 0.18)' : 'rgba(0, 243, 255, 0.14)';
      ctx.lineWidth = 1.0;
      ctx.beginPath();
      for (let p = 0; p <= totalPoints; p++) {
        const frac = p / totalPoints;
        const theta = frac * Math.PI * 2 * turns;
        const rad = bOuter - (bOuter - bInner) * frac;
        const px = Math.cos(theta) * rad;
        const py = Math.sin(theta) * rad;
        if (p === 0) ctx.moveTo(px, py);
        else ctx.lineTo(px, py);
      }
      ctx.stroke();

      // Secondary interlaced micro-groove spiral
      ctx.strokeStyle = 'rgba(255, 255, 255, 0.09)';
      ctx.lineWidth = 0.8;
      ctx.beginPath();
      for (let p = 0; p <= totalPoints; p++) {
        const frac = p / totalPoints;
        const theta = frac * Math.PI * 2 * turns + Math.PI;
        const rad = (bOuter - 1.5) - (bOuter - bInner) * frac;
        const px = Math.cos(theta) * rad;
        const py = Math.sin(theta) * rad;
        if (p === 0) ctx.moveTo(px, py);
        else ctx.lineTo(px, py);
      }
      ctx.stroke();
    }

    // 1.3. Rotating Specular Groove Flecks & Lead-In Markers
    // Highly visible specular segments that clearly travel with rotation
    const fleckCount = 16;
    for (let f = 0; f < fleckCount; f++) {
      const fa = (f / fleckCount) * Math.PI * 2 + (f % 3) * 0.4;
      const fr = labelR + 10 + ((f * 17) % (r - labelR - 20));
      const arcLen = 0.18 + (f % 4) * 0.08;

      ctx.strokeStyle = (f % 2 === 0) ? 'rgba(255, 255, 255, 0.35)' : 'rgba(0, 243, 255, 0.30)';
      ctx.lineWidth = 1.2;
      ctx.beginPath();
      ctx.arc(0, 0, fr, fa, fa + arcLen);
      ctx.stroke();
    }

    // 1.4. Technics High-Contrast Strobe Rim Blocks
    // Dual-row strobe blocks along the platter rim that orbit with rotation
    const strobeMarks = 36;
    for (let i = 0; i < strobeMarks; i++) {
      const sa = (i / strobeMarks) * Math.PI * 2;
      const isMajor = i % 3 === 0;

      ctx.strokeStyle = isMajor ? 'rgba(255, 255, 255, 0.75)' : 'rgba(0, 243, 255, 0.45)';
      ctx.lineWidth = isMajor ? 2.5 : 1.5;
      ctx.beginPath();
      ctx.moveTo(Math.cos(sa) * (r - 7), Math.sin(sa) * (r - 7));
      ctx.lineTo(Math.cos(sa) * (r - 2), Math.sin(sa) * (r - 2));
      ctx.stroke();
    }

    // 1.5. Rotating Brass Label Clamp Collar with Grip Teeth
    // Orbiting right at the edge of the non-rotating label to give crisp movement contrast!
    ctx.strokeStyle = '#ca8a04';
    ctx.lineWidth = 1.8;
    ctx.beginPath();
    ctx.arc(0, 0, labelR + 1, 0, Math.PI * 2);
    ctx.stroke();

    const gripTeeth = 16;
    for (let g = 0; g < gripTeeth; g++) {
      const ga = (g / gripTeeth) * Math.PI * 2;
      ctx.fillStyle = '#fde047';
      ctx.beginPath();
      ctx.arc(Math.cos(ga) * (labelR + 2), Math.sin(ga) * (labelR + 2), 1.2, 0, Math.PI * 2);
      ctx.fill();
    }

    ctx.restore();

    // 2. STATIC / NON-ROTATING CENTER VINYL LABEL
    // Words do not move so they remain always upright and legible!
    ctx.save();
    ctx.translate(cx, cy);

    // Vinyl label gradient: Vibrant amber-red for 45 RPM single, deep crimson for 12" LP
    const labelGrad = ctx.createRadialGradient(0, 0, 2, 0, 0, labelR);
    if (is45) {
      labelGrad.addColorStop(0, '#f59e0b');
      labelGrad.addColorStop(0.5, '#ef4444');
      labelGrad.addColorStop(1, '#991b1b');
    } else {
      labelGrad.addColorStop(0, '#f43f5e');
      labelGrad.addColorStop(0.5, '#e11d48');
      labelGrad.addColorStop(1, '#881337');
    }
    ctx.fillStyle = labelGrad;
    ctx.beginPath();
    ctx.arc(0, 0, labelR, 0, Math.PI * 2);
    ctx.fill();

    // Outer gold foil ring
    ctx.strokeStyle = is45 ? '#fde047' : '#fbbf24';
    ctx.lineWidth = 2;
    ctx.stroke();

    // Inner concentric ring
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.35)';
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.arc(0, 0, labelR * 0.72, 0, Math.PI * 2);
    ctx.stroke();

    // Spindle Hole & 45-RPM Center Insert
    const spindleR = Math.max(9, labelR * (is45 ? 0.34 : 0.28));

    if (is45) {
      // Iconic 3-Wing Yellow Plastic 45-RPM Spider Adapter!
      ctx.fillStyle = '#ffea00';
      ctx.strokeStyle = '#ca8a04';
      ctx.lineWidth = 1.5;

      // 3 curved adapter wings
      for (let i = 0; i < 3; i++) {
        const wa = (i / 3) * Math.PI * 2;
        ctx.beginPath();
        ctx.arc(0, 0, spindleR * 1.15, wa - 0.45, wa + 0.45);
        ctx.lineTo(Math.cos(wa) * (spindleR * 0.55), Math.sin(wa) * (spindleR * 0.55));
        ctx.closePath();
        ctx.fill();
        ctx.stroke();
      }

      // 3 cutout vents (revealing dark platter beneath)
      ctx.fillStyle = '#0a0a14';
      for (let i = 0; i < 3; i++) {
        const ca = (i / 3) * Math.PI * 2 + Math.PI / 3;
        ctx.beginPath();
        ctx.arc(Math.cos(ca) * (spindleR * 0.8), Math.sin(ca) * (spindleR * 0.8), 2.5, 0, Math.PI * 2);
        ctx.fill();
      }
    }

    // Brass center spindle hole
    ctx.fillStyle = this.isPaused ? '#31102b' : '#0a0a14';
    ctx.beginPath();
    ctx.arc(0, 0, spindleR * 0.65, 0, Math.PI * 2);
    ctx.fill();
    ctx.strokeStyle = this.isPaused ? '#ffea00' : '#fbbf24';
    ctx.lineWidth = 2;
    ctx.stroke();

    // Inside Spindle: Glowing Pause Symbol ❚❚ or Resume Symbol ▶
    if (this.isPaused) {
      ctx.fillStyle = '#ffea00';
      ctx.fillRect(-3.5, -5, 2.2, 10);
      ctx.fillRect(1.5, -5, 2.2, 10);
    } else {
      ctx.fillStyle = 'rgba(255, 255, 255, 0.9)';
      ctx.fillRect(-2.5, -3.5, 1.8, 7);
      ctx.fillRect(0.8, -3.5, 1.8, 7);
    }

    // Dynamic Font Sizing: strictly auto-scales text to fit within label boundaries
    const maxTextW = labelR * 1.55;
    const drawFittedText = (
      text: string,
      yPos: number,
      baseSize: number,
      weight: string = '700',
      color: string = '#ffffff',
      fontFam: string = 'monospace'
    ) => {
      let size = baseSize;
      ctx.font = `${weight} ${size}px ${fontFam}`;
      const measured = ctx.measureText(text).width;
      if (measured > maxTextW && measured > 0) {
        size = Math.max(4.2, baseSize * (maxTextW / measured));
        ctx.font = `${weight} ${size}px ${fontFam}`;
      }
      ctx.fillStyle = color;
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.shadowColor = '#000000';
      ctx.shadowBlur = 3;
      ctx.fillText(text, 0, yPos);
    };

    drawFittedText('BumperQuest', -labelR * 0.48, is45 ? 7.5 : 8, '900', '#ffffff', '"Press Start 2P", monospace');
    drawFittedText('by: BostonyFX', -labelR * 0.25, is45 ? 6.0 : 6.5, '700', '#fef08a', 'monospace');
    drawFittedText(
      is45 ? 'CAT# BFX-45 • 45 RPM SINGLE' : `CAT# BFX-33 • ${this.settings.rpm} RPM LP`,
      labelR * 0.40,
      is45 ? 5.5 : 6,
      '600',
      '#f1f5f9',
      'monospace'
    );
    drawFittedText(
      this.isPaused ? '▶ TAP TO RESUME' : '❚❚ TAP TO PAUSE',
      labelR * 0.60,
      5.0,
      '700',
      this.isPaused ? '#ffea00' : 'rgba(255, 255, 255, 0.75)',
      'monospace'
    );

    ctx.restore();

    // Audiophile Tonearm (Parks on cradle, extends occasionally to play a 45 single!)
    this.drawNeedleArm(ctx);
  }

  private drawNeedleArm(ctx: CanvasRenderingContext2D) {
    const arm = this.needleArm;
    const time = performance.now() * 0.001;

    const pivotX = arm.pivotX;
    const pivotY = arm.pivotY;
    const angle = arm.currentAngle;
    const length = arm.length;
    const tipX = pivotX + Math.cos(angle) * length;
    const tipY = pivotY + Math.sin(angle) * length;

    // Knee bend for authentic S-shaped audiophile tonearm
    const knee1Dist = length * 0.42;
    const knee1Angle = angle - 0.14;
    const knee1X = pivotX + Math.cos(knee1Angle) * knee1Dist;
    const knee1Y = pivotY + Math.sin(knee1Angle) * knee1Dist;

    const knee2Dist = length * 0.78;
    const knee2Angle = angle + 0.08;
    const knee2X = pivotX + Math.cos(knee2Angle) * knee2Dist;
    const knee2Y = pivotY + Math.sin(knee2Angle) * knee2Dist;

    ctx.save();

    // 0. Tonearm Rest Pillar Cradle (where arm docks safely outside vinyl perimeter)
    const cradleDist = length * 0.75;
    const cradleX = pivotX + Math.cos(arm.parkedAngle) * cradleDist;
    const cradleY = pivotY + Math.sin(arm.parkedAngle) * cradleDist;

    ctx.save();
    // Rest pillar mounting post
    ctx.strokeStyle = '#475569';
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.arc(cradleX, cradleY, 5.5, 0, Math.PI * 2);
    ctx.fillStyle = '#0f172a';
    ctx.fill();
    ctx.stroke();

    // Rest clip cradle notch
    ctx.strokeStyle = arm.isExtended ? '#64748b' : '#00f3ff';
    ctx.lineWidth = 1.8;
    ctx.beginPath();
    ctx.arc(cradleX, cradleY, 3.8, arm.parkedAngle - Math.PI / 2, arm.parkedAngle + Math.PI / 2);
    ctx.stroke();
    ctx.restore();

    // Status label above tonearm gimbal
    ctx.font = '700 5.5px "Press Start 2P", monospace';
    ctx.fillStyle = arm.isExtended ? '#ffea00' : '#94a3b8';
    ctx.shadowBlur = arm.isExtended ? 6 : 0;
    ctx.shadowColor = '#ffea00';
    ctx.textAlign = 'center';
    ctx.fillText(arm.isExtended ? '▶ 45 SINGLE' : '❚❚ 12" LP', pivotX, pivotY - 18);

    // 1. Motion Trail / Sweep Fan when Super Flipper or Active
    if (arm.isSuperActive) {
      const fanAngle1 = Math.min(arm.baseAngle, arm.currentAngle) - 0.1;
      const fanAngle2 = Math.max(arm.baseAngle, arm.currentAngle) + 0.1;
      const fanGrad = ctx.createRadialGradient(pivotX, pivotY, 10, pivotX, pivotY, length + 20);
      fanGrad.addColorStop(0, 'rgba(255, 234, 0, 0)');
      fanGrad.addColorStop(0.5, 'rgba(255, 234, 0, 0.12)');
      fanGrad.addColorStop(1, 'rgba(0, 243, 255, 0.18)');

      ctx.fillStyle = fanGrad;
      ctx.beginPath();
      ctx.moveTo(pivotX, pivotY);
      ctx.arc(pivotX, pivotY, length + 15, fanAngle1, fanAngle2);
      ctx.closePath();
      ctx.fill();

      // Sweeping targeting guide laser from stylus
      ctx.strokeStyle = `rgba(255, 234, 0, ${0.3 + 0.3 * Math.sin(time * 10)})`;
      ctx.lineWidth = 1;
      ctx.setLineDash([4, 4]);
      ctx.beginPath();
      ctx.moveTo(tipX, tipY);
      ctx.lineTo(tipX + Math.cos(angle - Math.PI / 2) * 55, tipY + Math.sin(angle - Math.PI / 2) * 55);
      ctx.stroke();
      ctx.setLineDash([]);
    }

    // 2. Heavy Gimbal Pivot Base with Counterweight
    const rearAngle = angle + Math.PI;
    const weightX = pivotX + Math.cos(rearAngle) * 22;
    const weightY = pivotY + Math.sin(rearAngle) * 22;

    ctx.strokeStyle = arm.isSuperActive ? '#ffea00' : 'rgba(255, 255, 255, 0.6)';
    ctx.lineWidth = 4;
    ctx.beginPath();
    ctx.moveTo(pivotX, pivotY);
    ctx.lineTo(weightX, weightY);
    ctx.stroke();

    // Cylindrical counterweight bob
    ctx.fillStyle = arm.isSuperActive ? '#451a03' : '#1e293b';
    ctx.strokeStyle = arm.isSuperActive ? '#ffea00' : '#94a3b8';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.arc(weightX, weightY, 7.5, 0, Math.PI * 2);
    ctx.fill();
    ctx.stroke();

    // Main Gimbal Pivot Bezel
    ctx.fillStyle = arm.isSuperActive ? '#271a00' : '#0f172a';
    ctx.strokeStyle = arm.isSuperActive ? (arm.hitGlow > 0 ? '#ffffff' : '#ffea00') : '#64748b';
    ctx.lineWidth = 2.5;
    ctx.shadowColor = arm.isSuperActive ? '#ffea00' : '#00f3ff';
    ctx.shadowBlur = arm.isSuperActive ? 14 + arm.chargeGlow * 12 : 4;
    ctx.beginPath();
    ctx.arc(pivotX, pivotY, 11, 0, Math.PI * 2);
    ctx.fill();
    ctx.stroke();

    // Center pivot bearing pip
    ctx.fillStyle = arm.isSuperActive ? '#ffea00' : '#00f3ff';
    ctx.beginPath();
    ctx.arc(pivotX, pivotY, 4, 0, Math.PI * 2);
    ctx.fill();

    // 3. S-Shaped Tonearm Tube
    ctx.beginPath();
    ctx.moveTo(pivotX, pivotY);
    ctx.bezierCurveTo(knee1X, knee1Y, knee2X, knee2Y, tipX, tipY);

    if (arm.isSuperActive) {
      // Super flipper energy blade beam
      ctx.strokeStyle = arm.hitGlow > 0 ? '#ffffff' : '#ffea00';
      ctx.lineWidth = 4.5;
      ctx.shadowColor = '#00f3ff';
      ctx.shadowBlur = 20;
      ctx.stroke();

      // Core hot beam
      ctx.strokeStyle = '#ffffff';
      ctx.lineWidth = 2;
      ctx.stroke();
    } else {
      // Sleek brushed titanium tube
      ctx.strokeStyle = arm.isExtended ? '#fde047' : '#cbd5e1';
      ctx.lineWidth = 2.8;
      ctx.shadowBlur = arm.isExtended ? 4 : 2;
      ctx.shadowColor = '#fde047';
      ctx.stroke();
    }

    // 4. Cartridge & Stylus Head
    ctx.save();
    ctx.translate(tipX, tipY);
    ctx.rotate(angle);

    if (arm.isSuperActive) {
      // Kinetic impulse super-stylus head
      ctx.fillStyle = arm.hitGlow > 0 ? '#ffffff' : '#ffaa00';
      ctx.strokeStyle = '#ffffff';
      ctx.lineWidth = 2;
      ctx.shadowColor = '#ffea00';
      ctx.shadowBlur = 18;
      ctx.fillRect(-4, -5, 14, 10);
      ctx.strokeRect(-4, -5, 14, 10);

      // Plasma needle tip
      ctx.fillStyle = '#00f3ff';
      ctx.beginPath();
      ctx.moveTo(10, 0);
      ctx.lineTo(16, -4);
      ctx.lineTo(16, 4);
      ctx.closePath();
      ctx.fill();

      // Sparks emitting from active cartridge
      if (Math.random() < 0.35) {
        this.addSparks(tipX, tipY, '#ffea00', 2);
      }
    } else {
      // High-end audiophile cartridge
      ctx.fillStyle = arm.isExtended ? '#ffea00' : '#94a3b8';
      ctx.strokeStyle = '#cbd5e1';
      ctx.lineWidth = 1.5;
      ctx.fillRect(-3, -4, 10, 8);
      ctx.strokeRect(-3, -4, 10, 8);

      // Ruby stylus pin
      ctx.fillStyle = '#ff0055';
      ctx.beginPath();
      ctx.arc(7, 0, 2, 0, Math.PI * 2);
      ctx.fill();

      if (arm.isExtended && Math.random() < 0.2) {
        this.addSparks(tipX, tipY, '#00f3ff', 1);
      }
    }

    ctx.restore();
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

      // Special indicator aura if this is a temporary courtesy ball
      if (ball.isCourtesyBall) {
        const time = performance.now() * 0.001;
        ctx.strokeStyle = '#ffea00';
        ctx.lineWidth = 2.0;
        ctx.shadowColor = '#ffea00';
        ctx.shadowBlur = 14;
        ctx.beginPath();
        ctx.arc(0, 0, ball.radius + 3.5 + Math.sin(time * 8) * 1.5, 0, Math.PI * 2);
        ctx.stroke();

        ctx.font = '700 5.5px "Press Start 2P", monospace';
        ctx.textAlign = 'center';
        ctx.fillStyle = '#ffea00';
        ctx.shadowBlur = 4;
        ctx.fillText('COURTESY', 0, -ball.radius - 8);
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

    // Top Outer Wall segments (leaving opening for Bowing Elastic Bumpers & Drain)
    ctx.beginPath();
    ctx.moveTo(18, 18);
    ctx.lineTo(w * 0.16, 14);
    ctx.moveTo(w * 0.84, 14);
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

    // 3.5. Top Kinetic Vector Rebound Arches (Bowing Elastic Bumpers)
    const topGlow = this.topFlairGlow;
    ctx.strokeStyle = topGlow > 0 ? '#ffffff' : '#00f3ff';
    ctx.lineWidth = 2.5 + topGlow * 2.5;
    ctx.shadowColor = topGlow > 0 ? '#00f3ff' : '#a855f7';
    ctx.shadowBlur = 10 + topGlow * 18;

    // Top-Left Bowing Elastic Rebound Arch
    ctx.beginPath();
    ctx.moveTo(w * 0.16, 14);
    ctx.quadraticCurveTo(w * 0.30, 38 + topGlow * 12, drainL, 14);
    ctx.stroke();

    // Top-Right Bowing Elastic Rebound Arch
    ctx.beginPath();
    ctx.moveTo(drainR, 14);
    ctx.quadraticCurveTo(w * 0.70, 38 + topGlow * 12, w * 0.84, 14);
    ctx.stroke();

    // Rubber tension bands behind top rebound arches
    ctx.strokeStyle = 'rgba(0, 243, 255, 0.22)';
    ctx.lineWidth = 1.2;
    for (let i = 1; i <= 3; i++) {
      const frac = i / 4;
      const xL = w * 0.16 + (drainL - w * 0.16) * frac;
      const yL = (1 - frac) * (1 - frac) * 14 + 2 * (1 - frac) * frac * (38 + topGlow * 12) + frac * frac * 14;
      ctx.beginPath();
      ctx.moveTo(xL, 8);
      ctx.lineTo(xL, yL);
      ctx.stroke();

      const xR = drainR + (w * 0.84 - drainR) * frac;
      const yR = (1 - frac) * (1 - frac) * 14 + 2 * (1 - frac) * frac * (38 + topGlow * 12) + frac * frac * 14;
      ctx.beginPath();
      ctx.moveTo(xR, 8);
      ctx.lineTo(xR, yR);
      ctx.stroke();
    }

    // 4. Bottom Kinetic Vector Rebound Arches (Bowing Elastic Bumpers)
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

    // Rubber tension bands behind bottom rebound arches
    ctx.strokeStyle = 'rgba(255, 0, 85, 0.22)';
    ctx.lineWidth = 1.2;
    for (let i = 1; i <= 3; i++) {
      const frac = i / 4;
      const xL = w * 0.16 + (drainL - w * 0.16) * frac;
      const yL = (1 - frac) * (1 - frac) * (h - 14) + 2 * (1 - frac) * frac * (h - 38 - glow * 12) + frac * frac * (h - 14);
      ctx.beginPath();
      ctx.moveTo(xL, h - 8);
      ctx.lineTo(xL, yL);
      ctx.stroke();

      const xR = drainR + (w * 0.84 - drainR) * frac;
      const yR = (1 - frac) * (1 - frac) * (h - 14) + 2 * (1 - frac) * frac * (h - 38 - glow * 12) + frac * frac * (h - 14);
      ctx.beginPath();
      ctx.moveTo(xR, h - 8);
      ctx.lineTo(xR, yR);
      ctx.stroke();
    }

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

  private drawTopCornerGadgets(ctx: CanvasRenderingContext2D) {
    const time = performance.now() * 0.001;

    // 1. Top-Left Rotary Saw Blade Slicer (Engages 5s every 30s)
    {
      const s = this.slicer;
      ctx.save();
      ctx.translate(s.x, s.y);

      const isEngaged = s.isEngaged;
      const glow = s.activeGlow;
      const primaryColor = isEngaged ? (glow > 0 ? '#ffffff' : '#00f3ff') : '#64748b';
      const accentColor = isEngaged ? '#ff0055' : '#475569';

      // 0. Safety shroud / perimeter guard ring
      ctx.strokeStyle = isEngaged ? `rgba(0, 243, 255, ${0.4 + glow * 0.5})` : 'rgba(100, 116, 139, 0.4)';
      ctx.lineWidth = 2;
      ctx.shadowColor = isEngaged ? '#00f3ff' : '#334155';
      ctx.shadowBlur = isEngaged ? (10 + glow * 16) : 3;
      ctx.beginPath();
      ctx.arc(0, 0, s.radius + 6, 0, Math.PI * 2);
      ctx.stroke();

      // If charging, draw circular charging progress arc
      if (!isEngaged) {
        const chargeProgress = Math.max(0, 1 - Math.max(0, (s.cycleTimer ?? 25) - 5) / 25);
        ctx.strokeStyle = '#00f3ff';
        ctx.lineWidth = 2;
        ctx.shadowColor = '#00f3ff';
        ctx.shadowBlur = 6;
        ctx.beginPath();
        ctx.arc(0, 0, s.radius + 6, -Math.PI / 2, -Math.PI / 2 + chargeProgress * Math.PI * 2);
        ctx.stroke();
      }

      // 1. Spinning Rotary Saw Blade
      ctx.save();
      ctx.rotate(s.angle);

      // Industrial rotary saw blade profile with 14 carbide cutting teeth
      const teethCount = 14;
      const rTip = s.radius + 4;
      const rGullet = s.radius * 0.72;
      const rBody = s.radius * 0.88;

      ctx.beginPath();
      for (let i = 0; i < teethCount; i++) {
        const aBase = (i / teethCount) * Math.PI * 2;
        const aTip = aBase + (Math.PI * 2 / teethCount) * 0.45; // hooked forward cutting rake
        const aBack = aBase + (Math.PI * 2 / teethCount) * 0.80;

        // Gullet start
        const gx1 = Math.cos(aBase) * rGullet;
        const gy1 = Math.sin(aBase) * rGullet;

        // Hooked cutting face up to carbide tip
        const tx = Math.cos(aTip) * rTip;
        const ty = Math.sin(aTip) * rTip;

        // Sloping relief back edge down to gullet
        const bx = Math.cos(aBack) * rBody;
        const by = Math.sin(aBack) * rBody;

        if (i === 0) {
          ctx.moveTo(gx1, gy1);
        } else {
          ctx.lineTo(gx1, gy1);
        }
        ctx.lineTo(tx, ty);
        ctx.lineTo(bx, by);
      }
      ctx.closePath();

      // Metallic tool steel blade body gradient
      const bladeGrad = ctx.createRadialGradient(0, 0, 2, 0, 0, rTip);
      bladeGrad.addColorStop(0, '#e2e8f0');
      bladeGrad.addColorStop(0.3, '#94a3b8');
      bladeGrad.addColorStop(0.7, isEngaged ? (glow > 0 ? '#38bdf8' : '#475569') : '#334155');
      bladeGrad.addColorStop(1, isEngaged ? '#0f172a' : '#1e293b');
      ctx.fillStyle = bladeGrad;
      ctx.fill();

      // Carbide steel rim stroke
      ctx.strokeStyle = primaryColor;
      ctx.lineWidth = isEngaged ? 2 : 1.5;
      ctx.shadowColor = isEngaged ? '#00f3ff' : '#000000';
      ctx.shadowBlur = isEngaged ? 8 : 0;
      ctx.stroke();

      // 2. Concentric circular machining grind lines on saw face
      ctx.shadowBlur = 0;
      ctx.strokeStyle = 'rgba(255, 255, 255, 0.22)';
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.arc(0, 0, s.radius * 0.58, 0, Math.PI * 2);
      ctx.stroke();
      ctx.beginPath();
      ctx.arc(0, 0, s.radius * 0.42, 0, Math.PI * 2);
      ctx.stroke();

      // 3. Four laser-cut thermal expansion slots (characteristic of rotary circular saws)
      ctx.strokeStyle = isEngaged ? '#00f3ff' : '#0f172a';
      ctx.lineWidth = 1.2;
      for (let sl = 0; sl < 4; sl++) {
        const slotAngle = (sl / 4) * Math.PI * 2;
        const sx1 = Math.cos(slotAngle) * (s.radius * 0.38);
        const sy1 = Math.sin(slotAngle) * (s.radius * 0.38);
        const sx2 = Math.cos(slotAngle) * (s.radius * 0.76);
        const sy2 = Math.sin(slotAngle) * (s.radius * 0.76);

        ctx.beginPath();
        ctx.moveTo(sx1, sy1);
        ctx.lineTo(sx2, sy2);
        ctx.stroke();

        // Round expansion relief hole at end of slot
        ctx.fillStyle = '#0a0f1d';
        ctx.beginPath();
        ctx.arc(sx1, sy1, 1.8, 0, Math.PI * 2);
        ctx.fill();
        ctx.stroke();
      }

      // 4. Heavy Center Arbor Assembly
      // Outer clamping arbor washer
      ctx.fillStyle = '#1e293b';
      ctx.strokeStyle = isEngaged ? '#00f3ff' : '#94a3b8';
      ctx.lineWidth = 1.8;
      ctx.beginPath();
      ctx.arc(0, 0, s.radius * 0.36, 0, Math.PI * 2);
      ctx.fill();
      ctx.stroke();

      // Hexagonal arbor nut
      ctx.fillStyle = isEngaged ? (glow > 0 ? '#ffffff' : '#ff0055') : '#475569';
      ctx.strokeStyle = isEngaged ? '#ffea00' : '#cbd5e1';
      ctx.lineWidth = 1.2;
      ctx.beginPath();
      const hexSides = 6;
      const rNut = s.radius * 0.20;
      for (let h = 0; h < hexSides; h++) {
        const ha = (h / hexSides) * Math.PI * 2;
        const hx = Math.cos(ha) * rNut;
        const hy = Math.sin(ha) * rNut;
        if (h === 0) ctx.moveTo(hx, hy);
        else ctx.lineTo(hx, hy);
      }
      ctx.closePath();
      ctx.fill();
      ctx.stroke();

      // Spindle center hole
      ctx.fillStyle = '#080c14';
      ctx.beginPath();
      ctx.arc(0, 0, s.radius * 0.08, 0, Math.PI * 2);
      ctx.fill();

      ctx.restore(); // restore rotation

      // 5. Plasma laser cut line when engaged
      if (isEngaged) {
        ctx.strokeStyle = glow > 0 ? '#ffffff' : `rgba(0, 243, 255, ${0.8 + 0.2 * Math.sin(time * 14)})`;
        ctx.lineWidth = glow > 0 ? 3.5 : 2;
        ctx.shadowColor = '#00f3ff';
        ctx.shadowBlur = 14 + glow * 12;
        ctx.beginPath();
        ctx.moveTo(-s.radius - 2, 0);
        ctx.lineTo(s.radius + 2, 0);
        ctx.stroke();

        // White core spark beam
        ctx.strokeStyle = '#ffffff';
        ctx.lineWidth = 1;
        ctx.beginPath();
        ctx.moveTo(-s.radius + 1, 0);
        ctx.lineTo(s.radius - 1, 0);
        ctx.stroke();
      }

      // Status labels beneath
      const isNarrow = this.width < 500;
      ctx.font = `700 ${isNarrow ? '5px' : '6px'} "Press Start 2P", monospace`;
      ctx.textAlign = 'center';
      if (isEngaged) {
        ctx.fillStyle = '#00f3ff';
        ctx.shadowColor = '#00f3ff';
        ctx.shadowBlur = 6;
        ctx.fillText(isNarrow ? '⚔️ SAW ON' : '⚔️ ROTARY SAW [ON]', 0, s.radius + (isNarrow ? 12 : 16));
        ctx.font = `700 ${isNarrow ? '4.5px' : '5px'} "Press Start 2P", monospace`;
        ctx.fillStyle = '#ff0055';
        ctx.fillText(`${Math.ceil(s.cycleTimer)}s LEFT`, 0, s.radius + (isNarrow ? 19 : 25));
      } else {
        const secToEngage = Math.max(1, Math.ceil((s.cycleTimer ?? 25) - 5));
        ctx.fillStyle = '#94a3b8';
        ctx.shadowBlur = 0;
        ctx.fillText(isNarrow ? 'SAW IDLE' : 'ROTARY SAW IDLE', 0, s.radius + (isNarrow ? 12 : 16));
        ctx.font = `700 ${isNarrow ? '4.5px' : '5px'} "Press Start 2P", monospace`;
        ctx.fillStyle = '#00f3ff';
        ctx.fillText(`⚡ IN ${secToEngage}s`, 0, s.radius + (isNarrow ? 19 : 25));
      }

      ctx.restore();
    }

    // 2. Top-Right Stasis Capture Chamber (Captures multiple balls for 15s each, shoots to record player!)
    {
      const sc = this.stasisChamber;
      ctx.save();
      ctx.translate(sc.x, sc.y);

      const capturedList = sc.capturedBalls || [];
      const isHolding = capturedList.length > 0;
      const glow = sc.activeGlow;
      const ringColor = isHolding ? '#a855f7' : (glow > 0 ? '#ffffff' : '#38bdf8');

      // Outer magnetic containment stator
      ctx.strokeStyle = `rgba(168, 85, 247, ${0.4 + (isHolding ? 0.5 : 0)})`;
      ctx.lineWidth = 2;
      ctx.shadowColor = ringColor;
      ctx.shadowBlur = isHolding ? 16 : 8;
      ctx.beginPath();
      ctx.arc(0, 0, sc.radius + 6, 0, Math.PI * 2);
      ctx.stroke();

      // Counter-rotating magnetic flux coils
      ctx.save();
      ctx.rotate(sc.rotation);
      const coils = 3;
      for (let i = 0; i < coils; i++) {
        const a = (i / coils) * Math.PI * 2;
        ctx.strokeStyle = isHolding ? '#c084fc' : '#00f3ff';
        ctx.lineWidth = 2.5;
        ctx.beginPath();
        ctx.arc(0, 0, sc.radius, a, a + Math.PI / coils);
        ctx.stroke();
      }
      ctx.restore();

      // Swirling stasis vortex interior
      const grad = ctx.createRadialGradient(0, 0, 2, 0, 0, sc.radius);
      grad.addColorStop(0, isHolding ? 'rgba(168, 85, 247, 0.45)' : 'rgba(14, 165, 233, 0.2)');
      grad.addColorStop(1, 'rgba(5, 7, 18, 0.9)');
      ctx.fillStyle = grad;
      ctx.beginPath();
      ctx.arc(0, 0, sc.radius - 2, 0, Math.PI * 2);
      ctx.fill();

      if (isHolding) {
        const minTimer = Math.min(...capturedList.map(b => b.timer));
        const progress = Math.max(0, minTimer / 15.0);

        // Circular countdown progress meter arc
        ctx.strokeStyle = '#ffea00';
        ctx.lineWidth = 3;
        ctx.shadowColor = '#ffea00';
        ctx.shadowBlur = 12;
        ctx.beginPath();
        ctx.arc(0, 0, sc.radius + 3, -Math.PI / 2, -Math.PI / 2 + progress * Math.PI * 2);
        ctx.stroke();

        // Render each captured ball orbiting in tractor suspension
        for (let idx = 0; idx < capturedList.length; idx++) {
          const cb = capturedList[idx];
          const orbR = cb.orbitRadius || (6 + (idx % 3) * 4);
          const bx = Math.cos(cb.orbitAngle) * orbR;
          const by = Math.sin(cb.orbitAngle) * orbR;

          // Energy tendrils tethering ball
          ctx.strokeStyle = 'rgba(192, 132, 252, 0.8)';
          ctx.lineWidth = 1.2;
          ctx.beginPath();
          ctx.moveTo(-bx * 0.4, -by * 0.4);
          ctx.lineTo(bx, by);
          ctx.stroke();

          // Ball itself
          ctx.fillStyle = cb.color;
          ctx.shadowColor = cb.color;
          ctx.shadowBlur = 10;
          ctx.beginPath();
          ctx.arc(bx, by, Math.max(4, cb.radius * 0.8), 0, Math.PI * 2);
          ctx.fill();
        }

        // Glowing countdown timer in center
        ctx.font = '900 8.5px "Press Start 2P", monospace';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillStyle = '#ffea00';
        ctx.shadowColor = '#ffea00';
        ctx.shadowBlur = 8;
        ctx.fillText(`${Math.ceil(minTimer)}s`, 0, 0);

        // Status labels beneath
        const isNarrow = this.width < 500;
        ctx.font = `700 ${isNarrow ? '5px' : '6px'} "Press Start 2P", monospace`;
        ctx.fillStyle = '#c084fc';
        ctx.shadowBlur = 4;
        ctx.fillText(capturedList.length > 1 ? `🔒 ${capturedList.length} LOCK` : (isNarrow ? '🔒 STASIS' : '🔒 STASIS LOCK'), 0, sc.radius + (isNarrow ? 12 : 15));
        ctx.font = `700 ${isNarrow ? '4.5px' : '5px'} "Press Start 2P", monospace`;
        ctx.fillStyle = '#38bdf8';
        ctx.fillText(isNarrow ? 'TARGET: LP' : 'TARGET: VINYL', 0, sc.radius + (isNarrow ? 19 : 24));
      } else {
        // Idle pulsing target reticle
        ctx.strokeStyle = `rgba(168, 85, 247, ${0.5 + 0.3 * Math.sin(time * 6)})`;
        ctx.lineWidth = 1;
        ctx.beginPath();
        ctx.moveTo(-8, 0);
        ctx.lineTo(8, 0);
        ctx.moveTo(0, -8);
        ctx.lineTo(0, 8);
        ctx.stroke();

        const isNarrow = this.width < 500;
        ctx.font = `700 ${isNarrow ? '5px' : '6px'} "Press Start 2P", monospace`;
        ctx.textAlign = 'center';
        ctx.fillStyle = '#c084fc';
        ctx.shadowColor = '#a855f7';
        ctx.shadowBlur = 6;
        ctx.fillText(isNarrow ? '🔒 STASIS' : '🔒 15s STASIS', 0, sc.radius + (isNarrow ? 12 : 15));
        ctx.font = `700 ${isNarrow ? '4.5px' : '5px'} "Press Start 2P", monospace`;
        ctx.fillStyle = '#94a3b8';
        ctx.fillText(isNarrow ? 'LP LAUNCH' : 'RECORD LAUNCH', 0, sc.radius + (isNarrow ? 19 : 24));
      }

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

  private drawPauseOverlay(ctx: CanvasRenderingContext2D) {
    if (!this.isPaused) return;

    const w = this.width;
    const h = this.height;
    const cx = this.turntable.x;
    const cy = this.turntable.y;
    const time = performance.now() * 0.001;

    ctx.save();
    // Translucent dark veil
    ctx.fillStyle = 'rgba(3, 4, 10, 0.52)';
    ctx.fillRect(0, 0, w, h);

    // Glowing pause banner card in center
    const cardW = Math.min(w * 0.85, 340);
    const cardH = 80;
    const cardX = cx - cardW / 2;
    const cardY = cy - cardH / 2;

    ctx.fillStyle = 'rgba(10, 15, 30, 0.92)';
    ctx.strokeStyle = '#00f3ff';
    ctx.lineWidth = 2;
    ctx.shadowColor = '#00f3ff';
    ctx.shadowBlur = 18;
    ctx.beginPath();
    ctx.roundRect ? ctx.roundRect(cardX, cardY, cardW, cardH, 10) : ctx.rect(cardX, cardY, cardW, cardH);
    ctx.fill();
    ctx.stroke();

    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';

    // Pause icon + title
    ctx.font = '900 16px "Press Start 2P", monospace';
    ctx.fillStyle = '#ffea00';
    ctx.shadowColor = '#ffea00';
    ctx.shadowBlur = 12;
    ctx.fillText('❚❚ GAME PAUSED', cx, cy - 12);

    // Subtitle instruction
    ctx.font = '700 8.5px "Press Start 2P", monospace';
    ctx.fillStyle = `rgba(255, 255, 255, ${0.7 + 0.3 * Math.sin(time * 6)})`;
    ctx.shadowColor = '#00f3ff';
    ctx.shadowBlur = 6;
    ctx.fillText('TAP RECORD TO RESUME', cx, cy + 16);

    ctx.restore();
  }
}
