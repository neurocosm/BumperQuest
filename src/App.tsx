import React, { useEffect, useRef, useState, useCallback } from 'react';
import { BumperQuestEngine, GameSettings } from './game/physics';
import { soundSynth } from './audio/SoundSynthesizer';
import { HUD } from './components/HUD';
import { TiltVirtualPad } from './components/TiltVirtualPad';
import { ArtworkGalleryModal } from './components/ArtworkGalleryModal';
import { SettingsModal } from './components/SettingsModal';

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
  });

  // Tilt & Compass state
  const [tilt, setTilt] = useState({ x: 0, y: 0 });
  const [compassAngle, setCompassAngle] = useState(0);
  const [hasDeviceOrientation, setHasDeviceOrientation] = useState(false);

  // Modals
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [isGalleryOpen, setIsGalleryOpen] = useState(false);

  // Initialize engine & canvas loop
  useEffect(() => {
    if (!canvasRef.current) return;

    const engine = new BumperQuestEngine(canvasRef.current);
    engineRef.current = engine;
    engine.settings = { ...settings };
    engine.start();

    // Stats update loop (10fps for React state sync without lagging canvas)
    const statsInterval = setInterval(() => {
      if (engineRef.current) {
        setScore(engineRef.current.score);
        setMultiplier(engineRef.current.currentMultiplier);
        setTotalBumps(engineRef.current.totalBumps);
        setTotalScratches(engineRef.current.totalScratches);
        setBallCount(engineRef.current.balls.length);

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
            engineRef.current.compassRotation = e.alpha * 0.15; // subtle rotational warp
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

    // Check if clicked near center turntable
    const dx = x - engineRef.current.turntable.x;
    const dy = y - engineRef.current.turntable.y;
    if (Math.hypot(dx, dy) < engineRef.current.turntable.radius) {
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
    const next = !isMuted;
    setIsMuted(next);
    soundSynth.setMute(next);
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
        className="w-full h-full block cursor-crosshair"
      />

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
        onToggleMute={handleToggleMute}
        onToggleAutoPilot={handleToggleAutoPilot}
        onSpawnBall={handleSpawnBall}
        onClearBalls={handleClearBalls}
        onCycleTheme={handleCycleTheme}
        onOpenSettings={() => setIsSettingsOpen(true)}
        onOpenGallery={() => setIsGalleryOpen(true)}
        onTriggerFlipper={handleTriggerFlipper}
        onReleaseFlipper={handleReleaseFlipper}
      />

      {/* Bottom-Right Virtual Tilt Pad */}
      <div className="absolute bottom-16 right-3 sm:right-6 z-30 pointer-events-auto">
        <TiltVirtualPad
          tiltX={tilt.x}
          tiltY={tilt.y}
          compassAngle={compassAngle}
          onTiltChange={handleManualTilt}
          onResetTilt={handleResetTilt}
          hasDeviceOrientation={hasDeviceOrientation}
          onRequestSensorPermission={requestSensorPermission}
        />
      </div>

      {/* Settings Modal */}
      <SettingsModal
        isOpen={isSettingsOpen}
        onClose={() => setIsSettingsOpen(false)}
        settings={settings}
        onUpdateSettings={(newVals) => setSettings(prev => ({ ...prev, ...newVals }))}
        onResetGame={handleResetGame}
        onRequestSensorPermission={requestSensorPermission}
      />

      {/* Concept Art & Design Vault Modal */}
      <ArtworkGalleryModal
        isOpen={isGalleryOpen}
        onClose={() => setIsGalleryOpen(false)}
      />
    </div>
  );
};
