import React, { useState } from 'react';
import {
  Volume2,
  VolumeX,
  Play,
  Pause,
  Plus,
  Trash2,
  Settings,
  Sparkles,
  Layers,
  HelpCircle,
  Compass,
  Eye,
  EyeOff,
  Music,
  Zap,
} from 'lucide-react';
import { GameSettings } from '../game/physics';

interface HUDProps {
  score: number;
  highScore: number;
  multiplier: number;
  totalBumps: number;
  totalScratches: number;
  ballCount: number;
  settings: GameSettings;
  isMuted: boolean;
  isAudioActive?: boolean;
  isIntroMusicPlaying?: boolean;
  isTiltPadOpen: boolean;
  isZenMode: boolean;
  quadBonusMessage?: string | null;
  matrixBonusMessage?: string | null;
  litMultiplierCount?: number;
  wave?: number;
  dotsRemaining?: number;
  dotsTotal?: number;
  gameState?: 'playing' | 'wave_cleared' | 'game_over';
  stateCountdown?: number;
  onRestartRound?: () => void;
  onToggleMute: () => void;
  onToggleIntroMusic?: () => void;
  onToggleAutoPilot: () => void;
  onSpawnBall: () => void;
  onClearBalls: () => void;
  onCycleTheme: () => void;
  onOpenSettings: () => void;
  onToggleTiltPad: () => void;
  onToggleZenMode: () => void;
  onTriggerFlipper: (id: 'TL' | 'TR' | 'BL' | 'BR') => void;
  onReleaseFlipper: (id: 'TL' | 'TR' | 'BL' | 'BR') => void;
}

export const HUD: React.FC<HUDProps> = ({
  score,
  highScore,
  multiplier,
  totalBumps,
  totalScratches,
  ballCount,
  settings,
  isMuted,
  isAudioActive = true,
  isIntroMusicPlaying = false,
  isTiltPadOpen,
  isZenMode,
  quadBonusMessage,
  matrixBonusMessage,
  litMultiplierCount = 0,
  wave = 1,
  dotsRemaining = 32,
  dotsTotal = 32,
  gameState = 'playing',
  stateCountdown = 0,
  onRestartRound,
  onToggleMute,
  onToggleIntroMusic,
  onToggleAutoPilot,
  onSpawnBall,
  onClearBalls,
  onCycleTheme,
  onOpenSettings,
  onToggleTiltPad,
  onToggleZenMode,
  onTriggerFlipper,
  onReleaseFlipper,
}) => {
  const [showHelp, setShowHelp] = useState(false);
  const [isBottomHovered, setIsBottomHovered] = useState(false);
  const [isMobileOpen, setIsMobileOpen] = useState(false);

  // Top score HUD auto-hide after 15 seconds of inactivity, hover-reveal & eyeball toggle
  const [isTopVisible, setIsTopVisible] = useState(true);
  const [isTopHovered, setIsTopHovered] = useState(false);
  const topHideTimeoutRef = React.useRef<ReturnType<typeof setTimeout> | null>(null);

  const resetTopHideTimer = React.useCallback(() => {
    setIsTopVisible(true);
    if (topHideTimeoutRef.current) clearTimeout(topHideTimeoutRef.current);
    topHideTimeoutRef.current = setTimeout(() => {
      setIsTopVisible(false);
    }, 15000); // 15 seconds
  }, []);

  // Reset hide timer whenever score, multiplier, or wave changes
  React.useEffect(() => {
    resetTopHideTimer();
  }, [score, multiplier, wave, resetTopHideTimer]);

  // Reset hide timer on user interaction (mouse move, keyboard, touch)
  React.useEffect(() => {
    const handleActivity = () => {
      resetTopHideTimer();
    };
    window.addEventListener('mousemove', handleActivity);
    window.addEventListener('keydown', handleActivity);
    window.addEventListener('pointerdown', handleActivity);
    return () => {
      window.removeEventListener('mousemove', handleActivity);
      window.removeEventListener('keydown', handleActivity);
      window.removeEventListener('pointerdown', handleActivity);
      if (topHideTimeoutRef.current) clearTimeout(topHideTimeoutRef.current);
    };
  }, [resetTopHideTimer]);

  // In Zen mode, everything is hidden except a tiny subtle toggle icon in the top right
  if (isZenMode) {
    return (
      <div className="absolute top-2 right-2 z-40">
        <button
          onClick={onToggleZenMode}
          title="Exit Zen Mode (Show HUD)"
          className="p-2 rounded-full bg-black/40 hover:bg-black/80 text-cyan-400 border border-cyan-500/30 backdrop-blur-sm transition-all"
        >
          <Eye className="w-4 h-4" />
        </button>
      </div>
    );
  }

  const isScoreBarShown = isTopVisible || isTopHovered;

  return (
    <>
      {/* Top Edge Hover Reveal Trigger Strip */}
      <div
        onMouseEnter={() => setIsTopHovered(true)}
        className="fixed top-0 left-0 right-0 h-4 z-30 pointer-events-auto"
      />

      {/* Floating Eyeball Toggle when Score HUD is hidden (top right) */}
      {!isScoreBarShown && (
        <div className="absolute top-2 right-2 z-40 pointer-events-auto animate-in fade-in duration-300">
          <button
            onClick={() => {
              setIsTopVisible(true);
              resetTopHideTimer();
            }}
            title="Show Score & Multiplier HUD (Auto-hides after 15s)"
            className="p-1.5 sm:p-2 rounded-full bg-[#0a0c16]/90 hover:bg-[#12162a] text-cyan-400 border border-cyan-500/50 backdrop-blur-md shadow-lg shadow-cyan-950/80 transition-all hover:scale-105 active:scale-95"
          >
            <Eye className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* Sleek, Non-Intrusive Top Floating Status Ribbon (Disappears after 15 seconds) */}
      <header
        onMouseEnter={() => setIsTopHovered(true)}
        onMouseLeave={() => setIsTopHovered(false)}
        className={`absolute top-0 left-0 right-0 z-30 px-3 py-1.5 sm:px-4 sm:py-2 flex items-center justify-between transition-all duration-500 ease-out transform ${
          isScoreBarShown
            ? 'translate-y-0 opacity-100 pointer-events-none'
            : '-translate-y-full opacity-0 pointer-events-none'
        } bg-gradient-to-b from-black/85 via-black/35 to-transparent`}
      >
        {/* Left: Minimal Title & Auto Mode */}
        <div className="flex items-center gap-2 pointer-events-auto">
          <div className="flex items-center gap-1.5">
            <span className="font-arcade text-[10px] sm:text-xs text-cyan-400 tracking-wider glow-cyan">
              BQ
            </span>
            <span className="hidden sm:inline font-arcade text-xs text-cyan-400 tracking-wider glow-cyan">
              QUEST
            </span>
            <span className="text-[9px] font-mono px-1 py-0.2 rounded bg-pink-500/20 text-pink-300 border border-pink-500/40">
              {settings.rpm} RPM
            </span>
          </div>

          {/* AI / Manual Mode Badge */}
          <button
            onClick={onToggleAutoPilot}
            title={settings.autoPilot ? 'AI Goalie Active (Click to switch to manual)' : 'Manual Mode Active'}
            className={`text-[9px] font-mono font-bold px-2 py-0.5 rounded-full border transition-all ${
              settings.autoPilot
                ? 'border-green-500/50 bg-green-950/60 text-green-300 hover:bg-green-900/60'
                : 'border-amber-500/50 bg-amber-950/60 text-amber-300 hover:bg-amber-900/60'
            }`}
          >
            {settings.autoPilot ? '● AI GOALIE' : '○ MANUAL'}
          </button>
        </div>

        {/* Center: Inlined Clean Score, Multiplier, Wave & Dots Progress */}
        <div className="flex items-center gap-1.5 sm:gap-2.5 bg-[#0a0c16]/85 border border-cyan-500/30 px-2 sm:px-3 py-0.5 sm:py-1 rounded-full backdrop-blur-md shadow-md shadow-cyan-950/40 pointer-events-auto">
          {/* Wave Badge */}
          <div className="flex items-center gap-1 px-1.5 py-0.5 rounded bg-cyan-950/60 border border-cyan-500/40 text-[9px] font-mono text-cyan-300 font-bold">
            <span>W{wave}</span>
          </div>

          <div className="flex items-baseline gap-1">
            <span className="hidden sm:inline text-[9px] font-mono text-cyan-300/60 tracking-wider">SCORE</span>
            <span className="font-arcade text-xs sm:text-sm text-white glow-cyan">
              {score.toLocaleString()}
            </span>
          </div>

          <span className="text-slate-600 text-xs">•</span>

          {/* Multiplier & X-Matrix Progress */}
          <div className="flex items-center gap-1.5">
            <span className="font-arcade text-[10px] sm:text-xs text-pink-400 glow-magenta font-bold">
              {multiplier}x
            </span>

            {/* X-Matrix Indicator: 4 geometric multipliers */}
            <div
              title={`X-Multiplier Matrix: ${litMultiplierCount} of 4 activated. Hit all 4 to trigger Multiball Surge (+2 Balls & +8 Dots)!`}
              className={`flex items-center gap-0.5 px-1.5 py-0.5 rounded border transition-all ${
                litMultiplierCount === 4
                  ? 'bg-amber-950/80 border-amber-400 text-amber-300 animate-pulse'
                  : litMultiplierCount > 0
                  ? 'bg-amber-950/40 border-amber-500/40 text-amber-300/90'
                  : 'bg-black/40 border-slate-800 text-slate-500'
              }`}
            >
              <span className="text-[8px] font-mono font-bold tracking-tight">X-MAT</span>
              <div className="flex gap-0.5">
                {[0, 1, 2, 3].map((idx) => (
                  <span
                    key={idx}
                    className={`w-1.5 h-1.5 rounded-full transition-all ${
                      idx < litMultiplierCount
                        ? 'bg-amber-400 shadow-[0_0_6px_#ffea00]'
                        : 'bg-slate-700/60'
                    }`}
                  />
                ))}
              </div>
            </div>
          </div>

          <span className="text-slate-600 text-xs">•</span>

          {/* Dots Remaining Meter */}
          <div
            title={`Dots remaining: ${dotsRemaining} of ${dotsTotal}. Clear all to conquer the wave!`}
            className="flex items-center gap-1 px-1.5 py-0.5 rounded bg-emerald-950/40 border border-emerald-500/30 text-[9px] font-mono text-emerald-300"
          >
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
            <span className="font-bold">{dotsRemaining}</span>
            <span className="hidden sm:inline text-emerald-400/60">/{dotsTotal}</span>
          </div>

          {highScore > 0 && (
            <div className="hidden lg:flex items-baseline gap-1 pl-1 border-l border-slate-700/60 text-[9px] font-mono text-amber-400/80">
              <span>HI:</span>
              <span>{highScore.toLocaleString()}</span>
            </div>
          )}

          {/* Secret Super Flipper Needle Arm Online Badge (> 4 balls) */}
          {ballCount > 4 && (
            <div className="flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-gradient-to-r from-amber-500/25 to-yellow-500/15 border border-amber-400 text-[10px] font-mono text-amber-300 font-bold animate-pulse shadow-md shadow-amber-500/30">
              <Zap className="w-3 h-3 text-amber-400 fill-amber-400 animate-bounce" />
              <span className="tracking-wide">NEEDLE FLIPPER ONLINE</span>
            </div>
          )}
        </div>

        {/* Right: Quick Action Icons */}
        <div className="flex items-center gap-1 sm:gap-1.5 pointer-events-auto">
          {/* Record Music Indicator / Toggle */}
          {onToggleIntroMusic && (
            <button
              onClick={onToggleIntroMusic}
              title={isIntroMusicPlaying ? 'Turntable Theme: PLAYING (Click to stop)' : 'Turntable Theme: OFF (Click to play)'}
              className={`p-1.5 rounded-lg border text-xs transition-colors flex items-center gap-1 ${
                isIntroMusicPlaying
                  ? 'bg-pink-950/50 border-pink-400 text-pink-300 animate-pulse'
                  : 'bg-black/60 border-slate-800 text-slate-500 hover:text-pink-300 hover:border-slate-700'
              }`}
            >
              <Music className="w-3.5 h-3.5" />
            </button>
          )}

          {/* Tilt Pad Toggle Button */}
          <button
            onClick={onToggleTiltPad}
            title={isTiltPadOpen ? 'Hide Tilt Pad' : 'Show Tilt Pad'}
            className={`p-1.5 rounded-lg border text-xs transition-colors ${
              isTiltPadOpen
                ? 'bg-cyan-500/20 border-cyan-400 text-cyan-300'
                : 'bg-black/60 border-slate-800 text-slate-400 hover:text-cyan-300 hover:border-slate-700'
            }`}
          >
            <Compass className="w-3.5 h-3.5" />
          </button>

          {/* Sound Mute / Unlock */}
          <button
            onClick={onToggleMute}
            title={!isAudioActive ? 'Click to Enable Audio' : isMuted ? 'Unmute Audio' : 'Mute Audio'}
            className={`p-1.5 rounded-lg border text-xs transition-colors flex items-center gap-1 ${
              !isAudioActive
                ? 'bg-amber-950/50 border-amber-500/60 text-amber-300 animate-pulse'
                : !isMuted
                ? 'bg-cyan-950/40 border-cyan-500/40 text-cyan-300 hover:bg-cyan-900/40'
                : 'bg-rose-950/40 border-rose-800 text-rose-400'
            }`}
          >
            {isMuted || !isAudioActive ? <VolumeX className="w-3.5 h-3.5" /> : <Volume2 className="w-3.5 h-3.5" />}
          </button>

          {/* Settings Modal */}
          <button
            onClick={onOpenSettings}
            title="Settings"
            className="p-1.5 rounded-lg bg-black/60 border border-slate-800 hover:border-slate-700 text-slate-300 transition-colors"
          >
            <Settings className="w-3.5 h-3.5" />
          </button>

          {/* Hide Score HUD (or wait 15 seconds) */}
          <button
            onClick={() => {
              setIsTopVisible(false);
              setIsTopHovered(false);
            }}
            title="Hide Score HUD (Auto-hides after 15s)"
            className="p-1.5 rounded-lg bg-black/60 border border-slate-800 hover:border-slate-700 text-slate-400 hover:text-white transition-colors"
          >
            <EyeOff className="w-3.5 h-3.5" />
          </button>

          <button
            onClick={() => setShowHelp(true)}
            title="How to play"
            className="p-1.5 rounded-lg text-slate-500 hover:text-slate-300 transition-colors"
          >
            <HelpCircle className="w-3.5 h-3.5" />
          </button>
        </div>
      </header>

      {/* GAME OVER SELF-PLAYING RESET BANNER */}
      {gameState === 'game_over' && (
        <div className="absolute top-14 left-0 right-0 z-30 flex justify-center pointer-events-none px-4 animate-in fade-in zoom-in-95 duration-200">
          <div className="flex items-center gap-3 px-4 py-2 rounded-full bg-[#18050a]/95 border-2 border-rose-500 text-rose-300 font-mono text-xs shadow-2xl shadow-rose-950/80 pointer-events-auto">
            <span className="font-arcade text-[11px] text-rose-400 glow-magenta">
              ALL BALLS DRAINED
            </span>
            <span className="text-slate-400 text-[10px]">
              AUTO-RESETTING IN {Math.max(1, Math.ceil(stateCountdown))}s...
            </span>
            {onRestartRound && (
              <button
                onClick={onRestartRound}
                className="px-2.5 py-1 rounded bg-rose-600 hover:bg-rose-500 text-white font-mono text-[10px] font-bold transition-all active:scale-95 cursor-pointer shadow"
              >
                ↺ RESTART NOW
              </button>
            )}
          </div>
        </div>
      )}

      {/* WAVE CLEARED CELEBRATION BANNER */}
      {gameState === 'wave_cleared' && (
        <div className="absolute top-14 left-0 right-0 z-30 flex justify-center pointer-events-none px-4 animate-in fade-in zoom-in-95 duration-200">
          <div className="flex items-center gap-2 px-4 py-1.5 rounded-full bg-[#051a0e]/95 border-2 border-emerald-400 text-emerald-300 font-arcade text-xs shadow-2xl shadow-emerald-950/80 glow-green">
            <Sparkles className="w-4 h-4 text-emerald-300 animate-spin-slow" />
            <span>★ WAVE {wave} CLEARED! NEXT IN {Math.max(1, Math.ceil(stateCountdown))}s ★</span>
          </div>
        </div>
      )}

      {/* MATRIX MULTIBALL SURGE BANNER */}
      {matrixBonusMessage && gameState === 'playing' && (
        <div className="absolute top-14 left-0 right-0 z-30 flex justify-center pointer-events-none px-4 animate-in fade-in zoom-in-95 duration-200">
          <div className="flex items-center gap-2 px-4 py-1.5 rounded-full bg-[#1c1404]/95 border-2 border-amber-400 text-amber-300 font-arcade text-xs tracking-wider shadow-xl shadow-amber-500/50 glow-amber">
            <Sparkles className="w-4 h-4 text-amber-300 animate-spin-slow" />
            <span>{matrixBonusMessage}</span>
          </div>
        </div>
      )}

      {/* QUAD-CYCLE CELEBRATION BANNER */}
      {quadBonusMessage && gameState === 'playing' && (
        <div className="absolute top-14 left-0 right-0 z-30 flex justify-center pointer-events-none px-4 animate-in fade-in zoom-in-95 duration-200">
          <div className="flex items-center gap-2 px-4 py-1.5 rounded-full bg-[#051a0e]/95 border-2 border-green-400 text-green-300 font-arcade text-xs tracking-wider shadow-xl shadow-green-500/40 glow-green">
            <Sparkles className="w-4 h-4 text-green-300 animate-spin-slow" />
            <span>{quadBonusMessage}</span>
          </div>
        </div>
      )}

      {/* DISAPPEARING BOTTOM CONTROLS WITH NEON LIP (Appears ONLY on Hover / Tap) */}
      <footer className="fixed bottom-0 left-0 right-0 z-30 flex flex-col items-center justify-end pointer-events-none">
        <div
          onMouseEnter={() => setIsBottomHovered(true)}
          onMouseLeave={() => setIsBottomHovered(false)}
          className={`pointer-events-auto flex flex-col items-center transition-all duration-300 ease-out transform ${
            isBottomHovered || isMobileOpen
              ? 'translate-y-0 opacity-100 pb-2'
              : 'translate-y-[calc(100%-8px)] opacity-80 pb-0'
          }`}
        >
          {/* Subtle Glowing Neon Lip */}
          <button
            onClick={() => setIsMobileOpen(prev => !prev)}
            title="Hover or Tap for Controls Console"
            className="flex flex-col items-center justify-center cursor-pointer py-1 px-6 group/lip focus:outline-none"
          >
            <div className="w-24 sm:w-36 h-1.5 rounded-t-full bg-gradient-to-r from-cyan-400 via-pink-400 to-cyan-400 shadow-[0_0_10px_#00f3ff] group-hover/lip:shadow-[0_0_18px_#ff0055] transition-all group-hover/lip:scale-110" />
          </button>

          {/* Hover-Revealed Controls Console */}
          <div className="flex items-center gap-1.5 sm:gap-2 p-1.5 bg-[#090b16]/95 border border-cyan-500/40 rounded-xl backdrop-blur-md shadow-2xl shadow-cyan-950/80 mt-1">
            {/* Spawn Ball */}
            <button
              onClick={onSpawnBall}
              title="Spawn Extra Pinball"
              className="flex items-center gap-1 px-2.5 py-1 rounded-lg bg-cyan-600/30 hover:bg-cyan-600/50 border border-cyan-400/50 text-cyan-300 text-xs font-mono font-bold transition-all active:scale-95"
            >
              <Plus className="w-3 h-3" />
              <span>+Ball ({ballCount})</span>
            </button>

            {ballCount > 1 && (
              <button
                onClick={onClearBalls}
                title="Clear Extra Balls"
                className="p-1 rounded-lg bg-slate-800 hover:bg-rose-950/80 text-slate-400 hover:text-rose-300 border border-slate-700 transition-colors"
              >
                <Trash2 className="w-3 h-3" />
              </button>
            )}

            <div className="w-[1px] h-4 bg-slate-700 mx-0.5" />

            {/* Auto-Pilot Toggle */}
            <button
              onClick={onToggleAutoPilot}
              title={settings.autoPilot ? 'Pause AI Goalie' : 'Resume AI Goalie'}
              className={`flex items-center gap-1 px-2 py-1 rounded-lg border text-xs font-mono transition-all ${
                settings.autoPilot
                  ? 'bg-green-600/20 border-green-500/50 text-green-300'
                  : 'bg-amber-600/20 border-amber-500/50 text-amber-300'
              }`}
            >
              {settings.autoPilot ? <Pause className="w-3 h-3" /> : <Play className="w-3 h-3" />}
              <span className="hidden sm:inline">{settings.autoPilot ? 'AI Active' : 'Manual'}</span>
            </button>

            {/* Theme Cycler */}
            <button
              onClick={onCycleTheme}
              title={`Switch Background Theme (${settings.bgTheme.toUpperCase()})`}
              className="flex items-center gap-1 px-2 py-1 rounded-lg bg-slate-800/80 hover:bg-slate-700/80 border border-slate-700 text-slate-300 text-xs font-mono transition-colors"
            >
              <Layers className="w-3 h-3 text-pink-400" />
              <span className="capitalize">{settings.bgTheme}</span>
            </button>

            {/* Stats Summary */}
            <div className="hidden md:flex items-center gap-2 text-[10px] font-mono text-slate-400 px-2">
              <span>{totalBumps} Bumps</span>
              <span>•</span>
              <span>{totalScratches} Scratches</span>
            </div>

            {/* Close on mobile */}
            {isMobileOpen && (
              <button
                onClick={() => setIsMobileOpen(false)}
                className="md:hidden text-[10px] font-mono text-slate-400 hover:text-white px-1.5"
              >
                ✕
              </button>
            )}
          </div>
        </div>
      </footer>

      {/* Manual Touch Flipper Triggers (Sleek Minimal Rings on Mobile in Manual Mode) */}
      {!settings.autoPilot && (
        <div className="absolute inset-0 pointer-events-none z-20">
          <button
            onPointerDown={() => onTriggerFlipper('TL')}
            onPointerUp={() => onReleaseFlipper('TL')}
            className="absolute top-12 left-2 w-12 h-12 rounded-full border border-cyan-400/30 bg-cyan-950/20 text-cyan-300 font-arcade text-[10px] flex items-center justify-center pointer-events-auto active:bg-cyan-500 active:text-black transition-all shadow-md shadow-cyan-500/10"
          >
            Q
          </button>

          <button
            onPointerDown={() => onTriggerFlipper('TR')}
            onPointerUp={() => onReleaseFlipper('TR')}
            className="absolute top-12 right-2 w-12 h-12 rounded-full border border-cyan-400/30 bg-cyan-950/20 text-cyan-300 font-arcade text-[10px] flex items-center justify-center pointer-events-auto active:bg-cyan-500 active:text-black transition-all shadow-md shadow-cyan-500/10"
          >
            E
          </button>

          <button
            onPointerDown={() => onTriggerFlipper('BL')}
            onPointerUp={() => onReleaseFlipper('BL')}
            className="absolute bottom-10 left-2 w-12 h-12 rounded-full border border-cyan-400/30 bg-cyan-950/20 text-cyan-300 font-arcade text-[10px] flex items-center justify-center pointer-events-auto active:bg-cyan-500 active:text-black transition-all shadow-md shadow-cyan-500/10"
          >
            Z
          </button>

          <button
            onPointerDown={() => onTriggerFlipper('BR')}
            onPointerUp={() => onReleaseFlipper('BR')}
            className="absolute bottom-10 right-2 w-12 h-12 rounded-full border border-cyan-400/30 bg-cyan-950/20 text-cyan-300 font-arcade text-[10px] flex items-center justify-center pointer-events-auto active:bg-cyan-500 active:text-black transition-all shadow-md shadow-cyan-500/10"
          >
            C
          </button>
        </div>
      )}

      {/* How to Play Modal */}
      {showHelp && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/85 backdrop-blur-md">
          <div className="relative w-full max-w-md bg-[#0c0e1a] border border-cyan-500/40 rounded-xl p-6 text-sm text-slate-300 space-y-4 shadow-2xl">
            <h3 className="font-arcade text-cyan-400 text-sm">BUMPER QUEST // SYSTEM GUIDE</h3>
            <ul className="space-y-2 text-xs font-mono text-slate-300">
              <li>• <b className="text-cyan-300">⌒ Top & Bottom Bowing Elastic Bumpers:</b> Curved elastic bumper bands flank both the top and bottom center drains, aggressively catapulting stray balls back inward with rubber twang recoil!</li>
              <li>• <b className="text-pink-400">⚔️ Top-Left Laser Slicer:</b> Entering the top-left hazard slicer splits your ball in two—cutting it in half into twin high-speed balls!</li>
              <li>• <b className="text-purple-400">🔒 Top-Right Stasis Capture:</b> Traps your ball inside a magnetic vortex for 15 seconds with a visible countdown timer, then slingshots it out at hyper-velocity!</li>
              <li>• <b className="text-emerald-400">★ Win Condition (Wave Clear):</b> Clear all glowing dots to conquer the wave and earn massive bonus points!</li>
              <li>• <b className="text-amber-400">✦ Dynamic Dot Seeding:</b> The playfield breathes and evolves! The <b className="text-purple-300">Tempest Spider</b> weaves magenta silk dots when hit, and hard <b className="text-cyan-300">Vinyl Scratches</b> scatter cyan rhythm dots onto the grooves.</li>
              <li>• <b className="text-yellow-400">⚡ All X-Multipliers Surge:</b> When all 4 geometric hazard multipliers (Circle, Square, Triangle, Rectangle) are struck, it activates the Matrix Overdrive: <b className="text-white">+2 Extra Balls</b> direct into play, plus a constellation of <b className="text-yellow-300">+8 Golden Stardust Dots</b>!</li>
              <li>• <b className="text-pink-400">⚡ Ball-to-Ball Ricochets:</b> When balls collide with one another, they bounce with full kinetic elasticity and metallic clacks!</li>
              <li>• <b className="text-yellow-300">❚❚ Tap Center to Pause:</b> Tap or click the center red record label (or press <b className="text-white">P</b>) to freeze/resume the game at any moment!</li>
              <li>• <b className="text-amber-300">⚡ Secret Needle Super Flipper:</b> When <b className="text-white">more than 4 balls</b> are generated on screen, the central turntable needle tonearm awakens into a high-energy kinetic super flipper—sweeping with plasma lightning to violently bat balls back into the arena!</li>
              <li>• <b className="text-green-300">Quad-Flipper Cycle:</b> When any single ball visits all 4 corner flippers, +1 bonus ball is immediately awarded.</li>
              <li>• <b className="text-orange-400">⚙ Spiked Corner Pinwheels:</b> High-rpm compact spiked ricochet turbines in bottom corners under flippers radically fling balls back up into the arena! Can be toggled on/off in Settings.</li>
              <li>• <b className="text-cyan-400">🌀 Pac-Man Warp Tunnels:</b> Pass through the left or right wall tunnels to teleport seamlessly across hyperspace to the opposite side of the table!</li>
              <li>• <b className="text-rose-400">▼ Gutter Drains:</b> Top and bottom center hazard drains will swallow balls. If all active balls drain into the abyss, the round ends.</li>
              <li>• <b className="text-cyan-400">↺ Self-Playing Auto-Reset:</b> When a round ends, a 3-second countdown automatically restarts a fresh round with brand new dots and ball launch—zero manual interaction needed!</li>
              <li>• <b className="text-white">Hidden Bottom Controls:</b> Hover over the glowing neon lip at the bottom of the screen to reveal the controls console!</li>
            </ul>
            <button
              onClick={() => setShowHelp(false)}
              className="w-full py-2 bg-cyan-600 hover:bg-cyan-500 text-white rounded font-mono text-xs font-bold transition-colors"
            >
              Resume
            </button>
          </div>
        </div>
      )}
    </>
  );
};
