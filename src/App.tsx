import React, { useEffect, useRef, useState, useCallback } from 'react';
import { Volume2, RefreshCw, Zap } from 'lucide-react';
import { BumperQuestEngine, GameSettings } from './game/physics';
import { soundSynth } from './audio/SoundSynthesizer';
import { HUD } from './components/HUD';
import { TiltVirtualPad } from './components/TiltVirtualPad';
import { SettingsModal } from './components/SettingsModal';
import { checkForAppUpdate, dumpCachesAndReload, CheckUpdateResult } from './utils/versionManager';

export const App: React.FC = () => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const engineRef = useRef<BumperQuestEngine | null>(null);

  // React state for HUD
  const [score, setScore] = useState(0);
  const [highScore, setHighScore] = useState(() => {
    return parseInt(localStorage.getItem('bq_highscore') || '0', 10);
  });
  const [multiplier, setMultiplier] = useState(1);
  const [totalBumps, setTotalBumps] = useState(0);
  const [totalScratches, setTotalScratches] = useState(0);
  const [ballCount, setBallCount] = useState(1);
  const [isMuted, setIsMuted] = useState(false);
  const [isAudioActive, setIsAudioActive] = useState(soundSynth.isRunning());
  const [isIntroMusicPlaying, setIsIntroMusicPlaying] = useState(false);
  const [quadBonusMessage, setQuadBonusMessage] = useState<string | null>(null);
  const [matrixBonusMessage, setMatrixBonusMessage] = useState<string | null>(null);
  const [litMultiplierCount, setLitMultiplierCount] = useState(0);

  // Wave & Win/Loss game states
  const [wave, setWave] = useState(1);
  const [dotsRemaining, setDotsRemaining] = useState(32);
  const [dotsTotal, setDotsTotal] = useState(32);
  const [gameState, setGameState] = useState<'playing' | 'wave_cleared' | 'game_over'>('playing');
  const [stateCountdown, setStateCountdown] = useState(0);

  // Settings
  const [settings, setSettings] = useState<GameSettings>({
    autoPilot: true,
    rpm: 45,
    bgTheme: 'tempest',
    trailDotCount: 24,
    tiltSensitivity: 1.0,
    crtScanlines: true,
    vectorGlow: true,
    soundEnabled: true,
    spikedPinwheels: true,
  });

  // Tilt & Compass state
  const [tilt, setTilt] = useState({ x: 0, y: 0 });
  const [compassAngle, setCompassAngle] = useState(0);
  const [hasDeviceOrientation, setHasDeviceOrientation] = useState(false);
  const [isTiltPadOpen, setIsTiltPadOpen] = useState(false);
  const [isZenMode, setIsZenMode] = useState(false);

  // Modals
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);

  // Versioning & Update Detection
  const [availableUpdate, setAvailableUpdate] = useState<CheckUpdateResult | null>(null);
  const [isUpdating, setIsUpdating] = useState(false);

  // Check for updates on game load
  useEffect(() => {
    checkForAppUpdate().then((result) => {
      if (result.hasUpdate) {
        setAvailableUpdate(result);
      }
    });
  }, []);

  // Listen to audio synthesizer state & unlock on global user gestures
  useEffect(() => {
    const unsubscribe = soundSynth.subscribeState((running) => {
      setIsAudioActive(running);
    });

    const unlockOnGesture = () => {
      soundSynth.unlock().then((running) => {
        if (running) {
          if (!soundSynth.isIntroPlaying()) {
            soundSynth.startIntroTheme();
            setIsIntroMusicPlaying(true);
          }
        }
      });
    };

    window.addEventListener('pointerdown', unlockOnGesture, { capture: true, once: true });
    window.addEventListener('keydown', unlockOnGesture, { capture: true, once: true });
    window.addEventListener('touchstart', unlockOnGesture, { capture: true, once: true });

    return () => {
      unsubscribe();
      window.removeEventListener('pointerdown', unlockOnGesture, { capture: true });
      window.removeEventListener('keydown', unlockOnGesture, { capture: true });
      window.removeEventListener('touchstart', unlockOnGesture, { capture: true });
    };
  }, []);

  // Initialize engine & canvas loop
  useEffect(() => {
    if (!canvasRef.current) return;

    const engine = new BumperQuestEngine(canvasRef.current);
    engineRef.current = engine;
    engine.settings = { ...settings };

    // Quad-Flipper cycle reward celebration
    engine.onQuadBonus = (newCount: number) => {
      setQuadBonusMessage(`QUAD-FLIPPER CYCLE! +1 PINBALL (${newCount} ACTIVE)`);
      setTimeout(() => {
        setQuadBonusMessage(null);
      }, 3500);
    };

    // All X-Multipliers Hit Supernova Multiball Surge
    engine.onMultiplierMatrixBonus = (newCount: number) => {
      setMatrixBonusMessage(`★ ALL X-MULTIPLIERS HIT! +2 BALLS +8 DOTS (${newCount} ACTIVE) ★`);
      setTimeout(() => {
        setMatrixBonusMessage(null);
      }, 3800);
    };

    // Transition from record player intro theme to kinetic game FX as game begins
    let hasStartedGameAction = false;
    engine.onGameActivity = () => {
      if (!hasStartedGameAction && soundSynth.isIntroPlaying()) {
        hasStartedGameAction = true;
        setTimeout(() => {
          soundSynth.fadeOutIntroTheme(1.8);
          setIsIntroMusicPlaying(false);
        }, 2500);
      }
    };

    engine.start();

    // Stats update loop (10fps for React state sync without lagging canvas)
    const statsInterval = setInterval(() => {
      if (engineRef.current) {
        setScore(engineRef.current.score);
        setMultiplier(engineRef.current.currentMultiplier);
        setTotalBumps(engineRef.current.totalBumps);
        setTotalScratches(engineRef.current.totalScratches);
        setBallCount(engineRef.current.balls.length);
        setWave(engineRef.current.wave);
        setDotsRemaining(engineRef.current.dotsRemaining);
        setDotsTotal(engineRef.current.dotsTotal);
        setGameState(engineRef.current.gameState);
        setStateCountdown(engineRef.current.stateCountdown);
        setLitMultiplierCount(engineRef.current.litMultiplierIds.size);

        if (engineRef.current.score > highScore) {
          setHighScore(engineRef.current.score);
          localStorage.setItem('bq_highscore', engineRef.current.score.toString());
        }
      }
    }, 100);

    const handleResize = () => {
      engineRef.current?.resize();
    };
    window.addEventListener('resize', handleResize);

    return () => {
      clearInterval(statsInterval);
      window.removeEventListener('resize', handleResize);
      engine.stop();
    };
  }, []);

  // Sync settings changes to engine
  useEffect(() => {
    if (engineRef.current) {
      engineRef.current.settings = { ...settings };
    }
  }, [settings]);

  // Audio start on first user interaction
  const handleUserInteraction = useCallback(() => {
    soundSynth.init();
  }, []);

  // Gyroscope / DeviceOrientation handlers
  useEffect(() => {
    const handleOrientation = (e: DeviceOrientationEvent) => {
      if (e.gamma !== null && e.beta !== null) {
        setHasDeviceOrientation(true);
        // gamma is left-to-right tilt (-90 to 90)
        // beta is front-to-back tilt (-180 to 180)
        const gx = Math.max(-1, Math.min(1, e.gamma / 35)) * 0.4;
        const gy = Math.max(-1, Math.min(1, (e.beta - 35) / 45)) * 0.4;

        setTilt({ x: gx, y: gy });
        if (engineRef.current) {
          engineRef.current.tiltGravity = { x: gx, y: gy };
          if (e.alpha !== null) {
            setCompassAngle(e.alpha);
          }
        }
      }
    };

    window.addEventListener('deviceorientation', handleOrientation);
    return () => {
      window.removeEventListener('deviceorientation', handleOrientation);
    };
  }, []);

  const requestSensorPermission = useCallback(async () => {
    handleUserInteraction();
    if (typeof (DeviceOrientationEvent as unknown as { requestPermission?: () => Promise<string> }).requestPermission === 'function') {
      try {
        const permissionState = await (DeviceOrientationEvent as unknown as { requestPermission: () => Promise<string> }).requestPermission();
        if (permissionState === 'granted') {
          setHasDeviceOrientation(true);
        }
      } catch (err) {
        console.warn('Sensor permission error:', err);
      }
    }
  }, [handleUserInteraction]);

  // Keyboard controls
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      handleUserInteraction();
      if (!engineRef.current) return;

      if (e.code === 'KeyQ') engineRef.current.triggerFlipper('TL');
      if (e.code === 'KeyE') engineRef.current.triggerFlipper('TR');
      if (e.code === 'KeyZ') engineRef.current.triggerFlipper('BL');
      if (e.code === 'KeyC') engineRef.current.triggerFlipper('BR');

      // Arrow keys keyboard tilt
      if (e.code === 'ArrowLeft' || e.code === 'KeyA') {
        engineRef.current.tiltGravity.x = -0.3;
        setTilt(prev => ({ ...prev, x: -0.3 }));
      }
      if (e.code === 'ArrowRight' || e.code === 'KeyD') {
        engineRef.current.tiltGravity.x = 0.3;
        setTilt(prev => ({ ...prev, x: 0.3 }));
      }
      if (e.code === 'ArrowUp' || e.code === 'KeyW') {
        engineRef.current.tiltGravity.y = -0.3;
        setTilt(prev => ({ ...prev, y: -0.3 }));
      }
      if (e.code === 'ArrowDown' || e.code === 'KeyS') {
        engineRef.current.tiltGravity.y = 0.3;
        setTilt(prev => ({ ...prev, y: 0.3 }));
      }

      if (e.code === 'Space') {
        engineRef.current.spawnBall();
      }

      // P key toggles pause
      if (e.code === 'KeyP') {
        engineRef.current.togglePause();
      }
    };

    const handleKeyUp = (e: KeyboardEvent) => {
      if (!engineRef.current) return;
      if (e.code === 'KeyQ') engineRef.current.releaseFlipper('TL');
      if (e.code === 'KeyE') engineRef.current.releaseFlipper('TR');
      if (e.code === 'KeyZ') engineRef.current.releaseFlipper('BL');
      if (e.code === 'KeyC') engineRef.current.releaseFlipper('BR');

      if (['ArrowLeft', 'ArrowRight', 'KeyA', 'KeyD'].includes(e.code)) {
        engineRef.current.tiltGravity.x = 0;
        setTilt(prev => ({ ...prev, x: 0 }));
      }
      if (['ArrowUp', 'ArrowDown', 'KeyW', 'KeyS'].includes(e.code)) {
        engineRef.current.tiltGravity.y = 0;
        setTilt(prev => ({ ...prev, y: 0 }));
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    window.addEventListener('keyup', handleKeyUp);
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      window.removeEventListener('keyup', handleKeyUp);
    };
  }, [handleUserInteraction]);

  // Click on canvas to spawn ball at pointer or bump
  const handleCanvasClick = (e: React.MouseEvent<HTMLCanvasElement>) => {
    handleUserInteraction();
    if (!engineRef.current || !canvasRef.current) return;
    const rect = canvasRef.current.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;

    // Check if clicked near needle arm
    const arm = engineRef.current.needleArm;
    const armDist = Math.hypot(x - arm.pivotX, y - arm.pivotY);
    if (armDist < arm.length + 25) {
      if (arm.isSuperActive) {
        engineRef.current.triggerNeedleFlipper();
        return;
      }
    }

    // Check if clicked near Top-Left Slicer
    const slicer = engineRef.current.slicer;
    if (Math.hypot(x - slicer.x, y - slicer.y) < slicer.radius + 15) {
      slicer.activeGlow = 1.0;
      soundSynth.playLaserSlice();
      return;
    }

    // Check if clicked near Top-Right Stasis Chamber
    const stasis = engineRef.current.stasisChamber;
    if (Math.hypot(x - stasis.x, y - stasis.y) < stasis.radius + 15) {
      stasis.activeGlow = 1.0;
      soundSynth.playStasisCapture();
      return;
    }

    // Check if clicked near center turntable
    const dx = x - engineRef.current.turntable.x;
    const dy = y - engineRef.current.turntable.y;
    const distToCenter = Math.hypot(dx, dy);
    const labelRadius = engineRef.current.turntable.radius * 0.44;

    // Center record label tap -> TOGGLE PAUSE!
    if (distToCenter <= labelRadius) {
      engineRef.current.togglePause();
      return;
    }

    if (distToCenter < engineRef.current.turntable.radius) {
      // Manual scratch tap!
      engineRef.current.turntable.scratchGlow = 1.0;
      engineRef.current.turntable.scratchImpulse = (Math.random() > 0.5 ? 1 : -1) * 0.12;
      soundSynth.playTurntableScratch(1.5);
    } else {
      // Spawn extra ball at click position if under 8 balls
      if (engineRef.current.balls.length < 8) {
        engineRef.current.spawnBall(x, y);
      }
    }
  };

  const handleCanvasTouchStart = (e: React.TouchEvent<HTMLCanvasElement>) => {
    handleUserInteraction();
    if (!engineRef.current || !canvasRef.current || e.touches.length === 0) return;
    const touch = e.touches[0];
    const rect = canvasRef.current.getBoundingClientRect();
    const x = touch.clientX - rect.left;
    const y = touch.clientY - rect.top;

    const dx = x - engineRef.current.turntable.x;
    const dy = y - engineRef.current.turntable.y;
    const distToCenter = Math.hypot(dx, dy);
    const labelRadius = engineRef.current.turntable.radius * 0.44;

    if (distToCenter <= labelRadius) {
      engineRef.current.togglePause();
    }
  };

  const handleManualTilt = (x: number, y: number) => {
    handleUserInteraction();
    setTilt({ x, y });
    if (engineRef.current) {
      engineRef.current.tiltGravity = { x, y };
    }
  };

  const handleResetTilt = () => {
    setTilt({ x: 0, y: 0 });
    if (engineRef.current) {
      engineRef.current.tiltGravity = { x: 0, y: 0 };
    }
  };

  const handleSpawnBall = () => {
    handleUserInteraction();
    engineRef.current?.spawnBall();
  };

  const handleClearBalls = () => {
    engineRef.current?.clearExtraBalls();
  };

  const handleToggleAutoPilot = () => {
    handleUserInteraction();
    setSettings(prev => ({ ...prev, autoPilot: !prev.autoPilot }));
  };

  const handleCycleTheme = () => {
    handleUserInteraction();
    const themes: GameSettings['bgTheme'][] = ['tempest', 'grid', 'qix', 'kaleidoscope', 'space'];
    const nextIdx = (themes.indexOf(settings.bgTheme) + 1) % themes.length;
    setSettings(prev => ({ ...prev, bgTheme: themes[nextIdx] }));
  };

  const handleToggleMute = () => {
    handleUserInteraction();
    if (!isAudioActive) {
      soundSynth.unlock().then(() => {
        setIsMuted(false);
        soundSynth.setMute(false);
        soundSynth.startIntroTheme();
        setIsIntroMusicPlaying(true);
      });
      return;
    }
    const next = !isMuted;
    setIsMuted(next);
    soundSynth.setMute(next);
  };

  const handleToggleIntroMusic = () => {
    handleUserInteraction();
    if (soundSynth.isIntroPlaying()) {
      soundSynth.stopIntroTheme();
      setIsIntroMusicPlaying(false);
    } else {
      soundSynth.unlock().then(() => {
        soundSynth.startIntroTheme();
        setIsIntroMusicPlaying(true);
      });
    }
  };

  const handleTriggerFlipper = (id: 'TL' | 'TR' | 'BL' | 'BR') => {
    handleUserInteraction();
    engineRef.current?.triggerFlipper(id);
  };

  const handleReleaseFlipper = (id: 'TL' | 'TR' | 'BL' | 'BR') => {
    engineRef.current?.releaseFlipper(id);
  };

  const handleResetGame = () => {
    if (engineRef.current) {
      engineRef.current.score = 0;
      engineRef.current.totalBumps = 0;
      engineRef.current.totalScratches = 0;
      engineRef.current.currentMultiplier = 1;
      engineRef.current.initEntities();
    }
    setScore(0);
    setMultiplier(1);
    setTotalBumps(0);
    setTotalScratches(0);
    setIsSettingsOpen(false);
  };

  return (
    <div
      onClick={handleUserInteraction}
      className={`relative w-screen h-screen overflow-hidden bg-black select-none ${
        settings.crtScanlines ? 'crt-overlay' : ''
      }`}
    >
      {/* Simulation Canvas */}
      <canvas
        ref={canvasRef}
        onClick={handleCanvasClick}
        onTouchStart={handleCanvasTouchStart}
        className="w-full h-full block cursor-crosshair"
      />

      {/* Prominent Tap to Unmute Banner (if browser blocked autoplay before user gesture) */}
      {!isAudioActive && !isMuted && (
        <div className="absolute top-12 left-0 right-0 z-40 flex justify-center pointer-events-none px-4 animate-in fade-in slide-in-from-top-2">
          <button
            onClick={() => {
              soundSynth.unlock().then((running) => {
                if (running) {
                  soundSynth.playBumperChime(2);
                }
              });
            }}
            className="pointer-events-auto flex items-center gap-2 px-4 py-1.5 rounded-full bg-[#0a0c18]/95 hover:bg-[#121428] border-2 border-cyan-400 text-cyan-200 font-mono text-xs font-bold shadow-xl shadow-cyan-500/40 animate-pulse transition-all active:scale-95 cursor-pointer"
          >
            <Volume2 className="w-4 h-4 text-cyan-400" />
            <span>TAP ANYWHERE TO UNMUTE SYNTH AUDIO</span>
          </button>
        </div>
      )}

      {/* On-Load Update Alert Banner */}
      {availableUpdate?.hasUpdate && (
        <div className="absolute top-12 sm:top-14 left-0 right-0 z-50 flex justify-center pointer-events-none px-3 animate-in fade-in slide-in-from-top-2">
          <div className="max-w-[94vw] flex items-center gap-2 px-3 py-1.5 rounded-full bg-[#1c1404]/95 border-2 border-amber-400 text-amber-300 font-mono text-xs shadow-2xl shadow-amber-950/80 pointer-events-auto backdrop-blur-md">
            <span className="font-arcade text-[9px] sm:text-[10px] text-amber-300 glow-amber whitespace-nowrap">
              UPDATE {availableUpdate.latestVersion} AVAILABLE!
            </span>
            <button
              onClick={async () => {
                setIsUpdating(true);
                await dumpCachesAndReload();
              }}
              disabled={isUpdating}
              className="px-2.5 py-0.5 rounded-full bg-amber-400 hover:bg-amber-300 text-black font-arcade text-[9px] sm:text-[10px] font-bold shadow-md shadow-amber-400/50 animate-pulse transition-all cursor-pointer whitespace-nowrap flex items-center gap-1"
            >
              <Zap className="w-3 h-3 fill-black" />
              {isUpdating ? 'UPDATING...' : 'PRESS TO UPDATE'}
            </button>
            <button
              onClick={() => setAvailableUpdate(null)}
              className="text-slate-400 hover:text-white px-1 text-xs"
              title="Dismiss for now"
            >
              ✕
            </button>
          </div>
        </div>
      )}

      {/* Retro Arcade HUD */}
      <HUD
        score={score}
        highScore={highScore}
        multiplier={multiplier}
        totalBumps={totalBumps}
        totalScratches={totalScratches}
        ballCount={ballCount}
        settings={settings}
        isMuted={isMuted}
        isAudioActive={isAudioActive}
        isIntroMusicPlaying={isIntroMusicPlaying}
        isTiltPadOpen={isTiltPadOpen}
        isZenMode={isZenMode}
        quadBonusMessage={quadBonusMessage}
        matrixBonusMessage={matrixBonusMessage}
        litMultiplierCount={litMultiplierCount}
        wave={wave}
        dotsRemaining={dotsRemaining}
        dotsTotal={dotsTotal}
        gameState={gameState}
        stateCountdown={stateCountdown}
        onRestartRound={() => engineRef.current?.autoRestartGame()}
        onToggleMute={handleToggleMute}
        onToggleIntroMusic={handleToggleIntroMusic}
        onToggleAutoPilot={handleToggleAutoPilot}
        onSpawnBall={handleSpawnBall}
        onClearBalls={handleClearBalls}
        onCycleTheme={handleCycleTheme}
        onOpenSettings={() => setIsSettingsOpen(true)}
        onToggleTiltPad={() => setIsTiltPadOpen(prev => !prev)}
        onToggleZenMode={() => setIsZenMode(prev => !prev)}
        onTriggerFlipper={handleTriggerFlipper}
        onReleaseFlipper={handleReleaseFlipper}
      />

      {/* Floating Virtual Tilt Pad (Toggleable, neatly docked at mid-right away from flippers) */}
      {isTiltPadOpen && (
        <div className="absolute top-16 right-3 sm:right-6 z-30 pointer-events-auto animate-in fade-in zoom-in-95">
          <TiltVirtualPad
            tiltX={tilt.x}
            tiltY={tilt.y}
            compassAngle={compassAngle}
            onTiltChange={handleManualTilt}
            onResetTilt={handleResetTilt}
            hasDeviceOrientation={hasDeviceOrientation}
            onRequestSensorPermission={requestSensorPermission}
            onClose={() => setIsTiltPadOpen(false)}
          />
        </div>
      )}

      {/* Settings Modal */}
      <SettingsModal
        isOpen={isSettingsOpen}
        onClose={() => setIsSettingsOpen(false)}
        settings={settings}
        onUpdateSettings={(newVals) => setSettings(prev => ({ ...prev, ...newVals }))}
        onResetGame={handleResetGame}
        onRequestSensorPermission={requestSensorPermission}
        knownUpdate={availableUpdate}
      />

      {/* Fullscreen Cache Dump & Reload Overlay */}
      {isUpdating && (
        <div className="fixed inset-0 z-[100] flex flex-col items-center justify-center bg-black/95 text-amber-300 font-arcade text-xs gap-4 p-6 text-center animate-in fade-in duration-150">
          <RefreshCw className="w-10 h-10 text-amber-400 animate-spin" />
          <span className="text-sm font-bold tracking-wider">DUMPING CACHE & RELOADING...</span>
          <span className="font-mono text-[11px] text-slate-400">Purging CacheStorage & Service Workers for clean build</span>
        </div>
      )}
    </div>
  );
};
