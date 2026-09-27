import React, { useState, useCallback, useEffect } from 'react';
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
  X,
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

  // User-controlled Letterboard Stats visibility toggle via the Eyeball button
  // Persisted in localStorage so player preference is remembered across refreshes
  // Defaults to hidden (true) once gameplay commences for a clean, minimalist experience
  const [isLetterboardHidden, setIsLetterboardHidden] = useState<boolean>(() => {
    const saved = localStorage.getItem('bq_hide_letterboard');
    if (saved !== null) return saved === 'true';
    return true;
  });

  const hideLetterboard = useCallback(() => {
    setIsLetterboardHidden(true);
    localStorage.setItem('bq_hide_letterboard', 'true');
  }, []);

  const showLetterboard = useCallback(() => {
    setIsLetterboardHidden(false);
    localStorage.setItem('bq_hide_letterboard', 'false');
  }, []);

  // Close help modal on Escape key
  useEffect(() => {
    if (!showHelp) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        setShowHelp(false);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [showHelp]);

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

  const isScoreBarShown = !isLetterboardHidden;

  return (
    <>
      {/* Floating Eyeball Toggle when Letterboard Stats are hidden (moved to top-right corner as a compact circular icon, clear of gameplay and beyond the capture chamber) */}
      {isLetterboardHidden && (
        <div className="absolute top-2 right-2 z-40 pointer-events-auto animate-in fade-in duration-300">
          <button
            onClick={showLetterboard}
            aria-label="Show Letterboard Stats"
            title="Show Letterboard Stats (Click to restore top bar)"
            className="w-7 h-7 sm:w-8 sm:h-8 rounded-full bg-[#0a0c16]/90 hover:bg-[#12162a] text-cyan-400 hover:text-white border border-cyan-500/60 backdrop-blur-md shadow-lg shadow-cyan-950/80 transition-all hover:scale-110 active:scale-95 flex items-center justify-center cursor-pointer"
          >
            <Eye className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-cyan-400 animate-pulse" />
          </button>
        </div>
      )}

      {/* Sleek Top Floating Status Ribbon (Hidden when user toggles eyeball button) */}
      <header
        className={`absolute top-0 left-0 right-0 z-30 px-3 py-1.5 sm:px-4 sm:py-2 flex items-center justify-between transition-all duration-500 ease-out transform ${
          isScoreBarShown
            ? 'translate-y-0 opacity-100 pointer-events-none'
            : '-translate-y-full opacity-0 pointer-events-none'
        } bg-gradient-to-b from-black/85 via-black/35 to-transparent`}
      >
        {/* Left: Minimal Title & Auto Mode */}
        <div className="flex items-center gap-1 sm:gap-2 pointer-events-auto flex-shrink-0">
          <div className="flex items-center gap-1 sm:gap-1.5">
            <span className="font-arcade text-[10px] sm:text-xs text-cyan-400 tracking-wider glow-cyan font-bold">
              BUMPERQUEST
            </span>
            <span className="hidden sm:inline text-[9px] font-mono px-1 py-0.2 rounded bg-pink-500/20 text-pink-300 border border-pink-500/40">
              {settings.rpm} RPM
            </span>
          </div>

          {/* AI / Manual Mode Badge */}
          <button
            onClick={onToggleAutoPilot}
            title={settings.autoPilot ? 'AI Goalie Active (Click to switch to manual)' : 'Manual Mode Active'}
            className={`text-[8.5px] sm:text-[9px] font-mono font-bold px-1.5 sm:px-2 py-0.5 rounded-full border transition-all ${
              settings.autoPilot
                ? 'border-green-500/50 bg-green-950/60 text-green-300 hover:bg-green-900/60'
                : 'border-amber-500/50 bg-amber-950/60 text-amber-300 hover:bg-amber-900/60'
            }`}
          >
            {settings.autoPilot ? '● AI' : '○ MAN'}
          </button>
        </div>

        {/* Center: Inlined Clean Score, Multiplier, Wave & Dots Progress */}
        <div className="flex items-center gap-1 sm:gap-2 bg-[#0a0c16]/85 border border-cyan-500/30 px-1.5 sm:px-3 py-0.5 sm:py-1 rounded-full backdrop-blur-md shadow-md shadow-cyan-950/40 pointer-events-auto overflow-hidden">
          {/* Wave Badge */}
          <div className="flex items-center gap-0.5 sm:gap-1 px-1 sm:px-1.5 py-0.5 rounded bg-cyan-950/60 border border-cyan-500/40 text-[8.5px] sm:text-[9px] font-mono text-cyan-300 font-bold">
            <span>W{wave}</span>
          </div>

          <div className="flex items-baseline gap-1">
            <span className="hidden sm:inline text-[9px] font-mono text-cyan-300/60 tracking-wider">SCORE</span>
            <span className="font-arcade text-[10.5px] sm:text-sm text-white glow-cyan">
              {score.toLocaleString()}
            </span>
          </div>

          <span className="text-slate-600 text-xs hidden xs:inline">•</span>

          {/* Multiplier & X-Matrix Progress */}
          <div className="flex items-center gap-1 sm:gap-1.5">
            <span className="font-arcade text-[9.5px] sm:text-xs text-pink-400 glow-magenta font-bold">
              {multiplier}x
            </span>

            {/* X-Matrix Indicator: 4 geometric multipliers */}
            <div
              title={`X-Multiplier Matrix: ${litMultiplierCount} of 4 activated. Hit all 4 to trigger Multiball Surge (+2 Balls & +8 Dots)!`}
              className={`hidden sm:flex items-center gap-0.5 px-1.5 py-0.5 rounded border transition-all ${
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
            className="flex items-center gap-1 px-1 sm:px-1.5 py-0.5 rounded bg-emerald-950/40 border border-emerald-500/30 text-[8.5px] sm:text-[9px] font-mono text-emerald-300"
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
            <div className="hidden md:flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-gradient-to-r from-amber-500/25 to-yellow-500/15 border border-amber-400 text-[10px] font-mono text-amber-300 font-bold animate-pulse shadow-md shadow-amber-500/30">
              <Zap className="w-3 h-3 text-amber-400 fill-amber-400 animate-bounce" />
              <span className="tracking-wide">NEEDLE FLIPPER ONLINE</span>
            </div>
          )}
        </div>

        {/* Right: Quick Action Icons */}
        <div className="flex items-center gap-1 sm:gap-1.5 pointer-events-auto flex-shrink-0">
          {/* Record Music Indicator / Toggle */}
          {onToggleIntroMusic && (
            <button
              onClick={onToggleIntroMusic}
              title={isIntroMusicPlaying ? 'Turntable Theme: PLAYING (Click to stop)' : 'Turntable Theme: OFF (Click to play)'}
              className={`hidden md:flex p-1.5 rounded-lg border text-xs transition-colors items-center gap-1 ${
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
            className={`hidden sm:flex p-1.5 rounded-lg border text-xs transition-colors ${
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
            className={`p-1 sm:p-1.5 rounded-lg border text-xs transition-colors flex items-center gap-1 ${
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
            className="p-1 sm:p-1.5 rounded-lg bg-black/60 border border-slate-800 hover:border-slate-700 text-slate-300 transition-colors"
          >
            <Settings className="w-3.5 h-3.5" />
          </button>

          {/* Hide Top Letterboard Stats Button */}
          <button
            onClick={hideLetterboard}
            title="Hide Top Letterboard Stats (Click eyeball to hide)"
            className="p-1 sm:p-1.5 rounded-lg bg-black/60 border border-slate-800 hover:border-slate-700 text-slate-400 hover:text-cyan-400 hover:scale-105 active:scale-95 transition-all"
          >
            <EyeOff className="w-3.5 h-3.5" />
          </button>

          <button
            onClick={() => setShowHelp(true)}
            title="How to play / System Guide"
            className="p-1 sm:p-1.5 rounded-lg text-slate-500 hover:text-slate-300 transition-colors"
          >
            <HelpCircle className="w-3.5 h-3.5" />
          </button>
        </div>
      </header>

      {/* GAME OVER SELF-PLAYING RESET BANNER */}
      {gameState === 'game_over' && (
        <div className="absolute top-12 sm:top-14 left-0 right-0 z-30 flex justify-center pointer-events-none px-2 sm:px-4 animate-in fade-in zoom-in-95 duration-200">
          <div className="max-w-[94vw] flex items-center gap-2 sm:gap-3 px-3 sm:px-4 py-1 sm:py-1.5 rounded-full bg-[#18050a]/95 border-2 border-rose-500 text-rose-300 font-mono text-[9px] sm:text-xs shadow-2xl shadow-rose-950/80 pointer-events-auto">
            <span className="font-arcade text-[9.5px] sm:text-[11px] text-rose-400 glow-magenta whitespace-nowrap">
              ALL BALLS DRAINED
            </span>
            <span className="text-slate-400 text-[8.5px] sm:text-[10px] hidden xs:inline">
              RESETTING IN {Math.max(1, Math.ceil(stateCountdown))}s...
            </span>
            {onRestartRound && (
              <button
                onClick={onRestartRound}
                className="px-2 sm:px-2.5 py-0.5 sm:py-1 rounded bg-rose-600 hover:bg-rose-500 text-white font-mono text-[9px] sm:text-[10px] font-bold transition-all active:scale-95 cursor-pointer shadow whitespace-nowrap"
              >
                ↺ RESTART
              </button>
            )}
          </div>
        </div>
      )}

      {/* WAVE CLEARED CELEBRATION BANNER */}
      {gameState === 'wave_cleared' && (
        <div className="absolute top-12 sm:top-14 left-0 right-0 z-30 flex justify-center pointer-events-none px-2 sm:px-4 animate-in fade-in zoom-in-95 duration-200">
          <div className="max-w-[94vw] flex items-center gap-1.5 sm:gap-2 px-3 sm:px-4 py-1 sm:py-1.5 rounded-full bg-[#051a0e]/95 border-2 border-emerald-400 text-emerald-300 font-arcade text-[9px] sm:text-xs shadow-2xl shadow-emerald-950/80 glow-green">
            <Sparkles className="w-3.5 h-3.5 text-emerald-300 animate-spin-slow flex-shrink-0" />
            <span className="truncate">★ WAVE {wave} CLEARED! NEXT IN {Math.max(1, Math.ceil(stateCountdown))}s ★</span>
          </div>
        </div>
      )}

      {/* MATRIX MULTIBALL SURGE BANNER */}
      {matrixBonusMessage && gameState === 'playing' && (
        <div className="absolute top-12 sm:top-14 left-0 right-0 z-30 flex justify-center pointer-events-none px-2 sm:px-4 animate-in fade-in zoom-in-95 duration-200">
          <div className="max-w-[94vw] flex items-center gap-1.5 sm:gap-2 px-3 sm:px-4 py-1 sm:py-1.5 rounded-full bg-[#1c1404]/95 border border-amber-400 text-amber-300 font-arcade text-[9px] sm:text-xs tracking-wider shadow-xl shadow-amber-500/50 glow-amber">
            <Sparkles className="w-3.5 h-3.5 text-amber-300 animate-spin-slow flex-shrink-0" />
            <span className="truncate">{matrixBonusMessage}</span>
          </div>
        </div>
      )}

      {/* QUAD-CYCLE CELEBRATION BANNER */}
      {quadBonusMessage && gameState === 'playing' && (
        <div className="absolute top-12 sm:top-14 left-0 right-0 z-30 flex justify-center pointer-events-none px-2 sm:px-4 animate-in fade-in zoom-in-95 duration-200">
          <div className="max-w-[94vw] flex items-center gap-1.5 sm:gap-2 px-2.5 sm:px-4 py-1 sm:py-1.5 rounded-full bg-[#051a0e]/95 border border-green-400 text-green-300 font-arcade text-[9px] sm:text-xs tracking-wider shadow-xl shadow-green-500/40 glow-green">
            <Sparkles className="w-3.5 h-3.5 text-green-300 animate-spin-slow flex-shrink-0" />
            <span className="truncate">{quadBonusMessage}</span>
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

      {/* How to Play / Field Elements Guide Modal */}
      {showHelp && (
        <div
          onClick={() => setShowHelp(false)}
          className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-5 bg-black/85 backdrop-blur-md animate-in fade-in duration-200"
          role="dialog"
          aria-modal="true"
        >
          <div
            onClick={(e) => e.stopPropagation()}
            className="relative w-full max-w-lg max-h-[90vh] sm:max-h-[85vh] flex flex-col bg-[#0c0e1a] border border-cyan-500/50 rounded-2xl shadow-2xl shadow-cyan-950/90 overflow-hidden"
          >
            {/* Sticky Header with Title and Touch-Friendly Close 'X' Button */}
            <div className="flex items-center justify-between px-4 sm:px-5 py-3.5 bg-[#101426] border-b border-cyan-500/30 flex-shrink-0">
              <div className="flex items-center gap-2">
                <span className="w-2.5 h-2.5 rounded-full bg-cyan-400 animate-pulse shadow-[0_0_8px_#00f3ff]" />
                <h3 className="font-arcade text-cyan-300 text-xs sm:text-sm tracking-wide glow-cyan">
                  FIELD ATTRACTIONS & ELEMENTS
                </h3>
              </div>
              <button
                onClick={() => setShowHelp(false)}
                title="Close Guide (Esc)"
                className="p-1.5 sm:p-2 rounded-lg bg-black/50 hover:bg-rose-950/80 border border-slate-700 hover:border-rose-500 text-slate-400 hover:text-white transition-all active:scale-90 flex items-center justify-center cursor-pointer"
              >
                <X className="w-4 h-4 sm:w-4.5 sm:h-4.5" />
              </button>
            </div>

            {/* Scrollable Content Area */}
            <div className="flex-1 overflow-y-auto overscroll-contain p-4 sm:p-5 space-y-4 text-xs font-mono text-slate-300">
              <div className="p-3 rounded-lg bg-cyan-950/30 border border-cyan-500/30 text-cyan-200 text-[11px] leading-relaxed">
                🤖 <b className="text-white">Self-Playing Kinetic Arcade:</b> Bumper Quest is completely autonomous! AI goalies pilot all 4 flippers and automatically launch new rounds upon ball drain. Watch the kinetic choreography unfold, or jump in with flipper keys / touch triggers anytime!
              </div>

              {/* Group 1: Turntable & Center Playfield */}
              <div className="space-y-2">
                <h4 className="text-[11px] font-bold uppercase tracking-wider text-pink-400 flex items-center gap-1.5 border-b border-pink-500/20 pb-1">
                  <span>💿</span> Turntable & Center Arena
                </h4>
                <div className="space-y-2.5 pl-1">
                  <div>
                    <span className="text-pink-300 font-bold">• 45 / 33 RPM Vinyl Record:</span>
                    <p className="text-slate-400 text-[11px] mt-0.5">Spins with physical rotational drag and anisotropic light sheen glare. Balls ricochet off the rim with scratch sound effects and rhythmic dot scattering.</p>
                  </div>
                  <div>
                    <span className="text-amber-300 font-bold">• Tone Arm & Cartridge:</span>
                    <p className="text-slate-400 text-[11px] mt-0.5">Physically tracks the vinyl grooves. <b className="text-amber-200">Secret Needle Super Flipper:</b> When more than 4 balls enter the playfield, the needle awakens into an electric lightning flipper that violently bats balls back into the arena!</p>
                  </div>
                  <div>
                    <span className="text-yellow-300 font-bold">• Center Spindle Label (❚❚ Pause):</span>
                    <p className="text-slate-400 text-[11px] mt-0.5">Click or tap the center vinyl record label (or press <b className="text-white">P</b>) to freeze and resume the simulation anytime.</p>
                  </div>
                </div>
              </div>

              {/* Group 2: Kinetic Defense Bumpers */}
              <div className="space-y-2">
                <h4 className="text-[11px] font-bold uppercase tracking-wider text-cyan-400 flex items-center gap-1.5 border-b border-cyan-500/20 pb-1">
                  <span>↕</span> Kinetic Defense Bumpers
                </h4>
                <div className="space-y-2.5 pl-1">
                  <div>
                    <span className="text-cyan-300 font-bold">• Top & Bottom Drain Relief Bumpers:</span>
                    <p className="text-slate-400 text-[11px] mt-0.5">Dual motorized bumpers that move independently <b className="text-white">30 seconds apart</b>. They extend outward toward the top and bottom gutter drains to shield balls from draining, while shifting side-to-side on opposite flanks for visual dexterity!</p>
                  </div>
                  <div>
                    <span className="text-cyan-300 font-bold">• Bowing Elastic Bumpers:</span>
                    <p className="text-slate-400 text-[11px] mt-0.5">Curved elastic rubber bands flanking both drains that bow and catapult descending balls inward with high-velocity twang recoil.</p>
                  </div>
                  <div>
                    <span className="text-orange-400 font-bold">• Spiked Corner Pinwheels:</span>
                    <p className="text-slate-400 text-[11px] mt-0.5">Rapidly spinning turbine pinwheels in the bottom corners under the flippers that fling low balls diagonally back toward the record.</p>
                  </div>
                </div>
              </div>

              {/* Group 3: Special Attractions & Hyperspace */}
              <div className="space-y-2">
                <h4 className="text-[11px] font-bold uppercase tracking-wider text-purple-400 flex items-center gap-1.5 border-b border-purple-500/20 pb-1">
                  <span>🔮</span> Hazards & Hyperspace Attractions
                </h4>
                <div className="space-y-2.5 pl-1">
                  <div>
                    <span className="text-pink-400 font-bold">• ⚔️ Top-Left Laser Slicer:</span>
                    <p className="text-slate-400 text-[11px] mt-0.5">Laser beams slice any entering pinball clean in half, producing twin high-velocity balls with explosive laser slice audio.</p>
                  </div>
                  <div>
                    <span className="text-purple-300 font-bold">• 🔒 Top-Right Stasis Capture & Courtesy Ball:</span>
                    <p className="text-slate-400 text-[11px] mt-0.5">Imprisons balls in a magnetic stasis chamber for 15s before slingshotting them out. If all active balls are captured, a golden <b className="text-yellow-300">Courtesy Ball</b> is dispatched so action never stops. When the stasis ball releases, the courtesy ball humorously explodes!</p>
                  </div>
                  <div>
                    <span className="text-cyan-400 font-bold">• 🌀 Pac-Man Warp Tunnels:</span>
                    <p className="text-slate-400 text-[11px] mt-0.5">Left and right outer walls feature warp apertures. Entering one instantly teleports the ball out of the opposite side of the table!</p>
                  </div>
                  <div>
                    <span className="text-purple-400 font-bold">• 🕷 Wandering Tempest Spider:</span>
                    <p className="text-slate-400 text-[11px] mt-0.5">A rogue celestial spider that patrols the table, weaving silk dots when struck and sparking vibrant vector lightning.</p>
                  </div>
                </div>
              </div>

              {/* Group 4: Scoring, Multipliers & Wave Clear */}
              <div className="space-y-2">
                <h4 className="text-[11px] font-bold uppercase tracking-wider text-emerald-400 flex items-center gap-1.5 border-b border-emerald-500/20 pb-1">
                  <span>★</span> Scoring & Wave Progression
                </h4>
                <div className="space-y-2.5 pl-1">
                  <div>
                    <span className="text-emerald-300 font-bold">• Constellation Dots & Wave Victory:</span>
                    <p className="text-slate-400 text-[11px] mt-0.5">Collect all glowing constellation dots to conquer the wave! Unlocks massive wave-clear bonuses and advances to faster, higher-scoring waves.</p>
                  </div>
                  <div>
                    <span className="text-amber-300 font-bold">• X-Multiplier Matrix Overdrive:</span>
                    <p className="text-slate-400 text-[11px] mt-0.5">Strike all 4 geometric hazard bumpers (Circle, Square, Triangle, Rectangle) to trigger the Multiball Matrix Surge: <b className="text-white">+2 Extra Pinballs</b> and <b className="text-yellow-300">+8 Golden Stardust Dots</b>!</p>
                  </div>
                  <div>
                    <span className="text-green-300 font-bold">• Quad-Flipper Circuit:</span>
                    <p className="text-slate-400 text-[11px] mt-0.5">Guide a single ball to touch all 4 corner flippers to be rewarded with +1 bonus pinball.</p>
                  </div>
                  <div>
                    <span className="text-rose-400 font-bold">• Drain & Automatic Reset:</span>
                    <p className="text-slate-400 text-[11px] mt-0.5">If all pinballs drain into the abyss, a 3-second self-playing countdown resets the field, spawns a new ball, and automatically continues play.</p>
                  </div>
                </div>
              </div>
            </div>

            {/* Sticky Footer with Clear 'Back to Gameplay' Action */}
            <div className="p-3 sm:p-4 bg-[#101426] border-t border-cyan-500/30 flex-shrink-0 flex items-center justify-between gap-3">
              <span className="text-[10px] font-mono text-slate-400 hidden sm:inline">
                Tap anywhere outside or press ESC to exit
              </span>
              <button
                onClick={() => setShowHelp(false)}
                className="w-full sm:w-auto px-6 py-2.5 rounded-xl bg-gradient-to-r from-cyan-600 to-cyan-500 hover:from-cyan-500 hover:to-cyan-400 text-white font-mono text-xs font-bold shadow-lg shadow-cyan-950/80 transition-all active:scale-95 flex items-center justify-center gap-2 cursor-pointer"
              >
                <span>← BACK TO GAMEPLAY</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
};
