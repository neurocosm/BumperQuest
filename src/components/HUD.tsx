import React from 'react';
import {
  Volume2,
  VolumeX,
  Play,
  Pause,
  Plus,
  Trash2,
  Settings,
  Sparkles,
  Disc,
  Layers,
  HelpCircle,
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
  onToggleMute: () => void;
  onToggleAutoPilot: () => void;
  onSpawnBall: () => void;
  onClearBalls: () => void;
  onCycleTheme: () => void;
  onOpenSettings: () => void;
  onOpenGallery: () => void;
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
  onToggleMute,
  onToggleAutoPilot,
  onSpawnBall,
  onClearBalls,
  onCycleTheme,
  onOpenSettings,
  onOpenGallery,
  onTriggerFlipper,
  onReleaseFlipper,
}) => {
  const [showHelp, setShowHelp] = React.useState(false);

  return (
    <>
      {/* Top Header HUD Bar */}
      <header className="absolute top-0 left-0 right-0 z-30 p-3 sm:p-4 flex flex-wrap items-center justify-between gap-3 pointer-events-none">
        {/* Title & Status */}
        <div className="flex items-center gap-3 pointer-events-auto">
          <div className="flex flex-col">
            <div className="flex items-center gap-2">
              <span className="font-arcade text-xs sm:text-sm text-cyan-400 tracking-wider glow-cyan">
                BUMPER QUEST
              </span>
              <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-pink-500/20 text-pink-300 border border-pink-500/40">
                SPIN-VORTEX
              </span>
            </div>
            <div className="flex items-center gap-2 mt-1">
              <span
                onClick={onToggleAutoPilot}
                className={`cursor-pointer text-[10px] font-mono font-bold px-2 py-0.5 rounded-full border transition-all ${
                  settings.autoPilot
                    ? 'border-green-500/50 bg-green-950/60 text-green-300'
                    : 'border-amber-500/50 bg-amber-950/60 text-amber-300'
                }`}
              >
                {settings.autoPilot ? '● AI GOALIE ACTIVE' : '○ MANUAL MODE (Q, E, Z, C)'}
              </span>
              <button
                onClick={() => setShowHelp(!showHelp)}
                className="text-slate-400 hover:text-cyan-400 transition-colors"
                title="How to play"
              >
                <HelpCircle className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>
        </div>

        {/* Center Scoreboard */}
        <div className="flex items-center gap-4 sm:gap-6 bg-[#0a0c16]/85 border border-cyan-500/30 px-4 py-2 rounded-xl backdrop-blur-md shadow-lg shadow-cyan-950/50 pointer-events-auto">
          {/* Score */}
          <div className="flex flex-col items-center">
            <span className="text-[9px] font-mono text-cyan-300/70 tracking-widest uppercase">SCORE</span>
            <span className="font-arcade text-base sm:text-lg text-white glow-cyan">
              {score.toLocaleString()}
            </span>
          </div>

          <div className="w-[1px] h-7 bg-cyan-500/20" />

          {/* Multiplier */}
          <div className="flex flex-col items-center">
            <span className="text-[9px] font-mono text-pink-300/70 tracking-widest uppercase">MULTIPLIER</span>
            <span className="font-arcade text-sm sm:text-base text-pink-400 glow-magenta">
              {multiplier}x
            </span>
          </div>

          <div className="hidden sm:block w-[1px] h-7 bg-cyan-500/20" />

          {/* High Score */}
          <div className="hidden sm:flex flex-col items-center">
            <span className="text-[9px] font-mono text-slate-400 tracking-widest uppercase">HIGH</span>
            <span className="font-arcade text-xs sm:text-sm text-amber-400">
              {highScore.toLocaleString()}
            </span>
          </div>
        </div>

        {/* Quick Stats Pill */}
        <div className="hidden md:flex items-center gap-3 text-xs font-mono text-slate-300 bg-[#0a0c16]/85 border border-slate-700/60 px-3 py-1.5 rounded-lg backdrop-blur-md pointer-events-auto">
          <div className="flex items-center gap-1.5" title="Turntable Scratches">
            <Disc className="w-3.5 h-3.5 text-cyan-400" />
            <span>{totalScratches} Scratches</span>
          </div>
          <span>•</span>
          <div title="Total Bumps">
            <span>{totalBumps} Bumps</span>
          </div>
          <span>•</span>
          <span className="text-pink-400 font-bold">{settings.rpm} RPM</span>
        </div>
      </header>

      {/* Floating Bottom Quick Action Dock */}
      <footer className="absolute bottom-3 left-0 right-0 z-30 flex items-center justify-center p-2 pointer-events-none">
        <div className="flex items-center gap-1.5 sm:gap-2 p-1.5 bg-[#090b16]/90 border border-cyan-500/30 rounded-2xl backdrop-blur-md shadow-2xl shadow-cyan-950/60 pointer-events-auto">
          {/* Spawn Ball */}
          <button
            onClick={onSpawnBall}
            title="Spawn Pinball"
            className="flex items-center gap-1 px-2.5 py-1.5 rounded-lg bg-cyan-600/30 hover:bg-cyan-600/50 border border-cyan-400/50 text-cyan-300 text-xs font-mono font-bold transition-all active:scale-95"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>+Ball ({ballCount})</span>
          </button>

          {ballCount > 1 && (
            <button
              onClick={onClearBalls}
              title="Clear Extra Balls"
              className="p-1.5 rounded-lg bg-slate-800 hover:bg-rose-950/80 text-slate-400 hover:text-rose-300 border border-slate-700 transition-colors"
            >
              <Trash2 className="w-3.5 h-3.5" />
            </button>
          )}

          <div className="w-[1px] h-5 bg-slate-700 mx-0.5" />

          {/* Auto-Pilot Toggle */}
          <button
            onClick={onToggleAutoPilot}
            title={settings.autoPilot ? 'Pause AI (Switch to manual)' : 'Resume AI Goalie'}
            className={`p-2 rounded-lg border text-xs font-mono transition-all ${
              settings.autoPilot
                ? 'bg-green-600/20 border-green-500/50 text-green-300 hover:bg-green-600/30'
                : 'bg-amber-600/20 border-amber-500/50 text-amber-300 hover:bg-amber-600/30'
            }`}
          >
            {settings.autoPilot ? <Pause className="w-4 h-4" /> : <Play className="w-4 h-4" />}
          </button>

          {/* Theme Cycler */}
          <button
            onClick={onCycleTheme}
            title={`Current Theme: ${settings.bgTheme.toUpperCase()}`}
            className="flex items-center gap-1 px-2 py-1.5 rounded-lg bg-slate-800/80 hover:bg-slate-700/80 border border-slate-700 text-slate-300 text-xs font-mono transition-colors"
          >
            <Layers className="w-3.5 h-3.5 text-pink-400" />
            <span className="hidden sm:inline capitalize">{settings.bgTheme}</span>
          </button>

          {/* Audio Mute */}
          <button
            onClick={onToggleMute}
            title={isMuted ? 'Unmute Audio' : 'Mute Audio'}
            className={`p-2 rounded-lg border text-xs transition-colors ${
              !isMuted
                ? 'bg-slate-800 border-slate-700 text-cyan-300 hover:bg-slate-700'
                : 'bg-rose-950/40 border-rose-800 text-rose-400'
            }`}
          >
            {isMuted ? <VolumeX className="w-4 h-4" /> : <Volume2 className="w-4 h-4" />}
          </button>

          {/* Concept Vault Gallery */}
          <button
            onClick={onOpenGallery}
            title="Concept Art & Design Manifest"
            className="flex items-center gap-1 px-2.5 py-1.5 rounded-lg bg-pink-950/40 hover:bg-pink-900/60 border border-pink-500/40 text-pink-300 text-xs font-mono font-bold transition-colors"
          >
            <Sparkles className="w-3.5 h-3.5 text-pink-400 animate-pulse" />
            <span className="hidden sm:inline">Concept Vault</span>
          </button>

          {/* Settings Modal */}
          <button
            onClick={onOpenSettings}
            title="Settings & Adjustments"
            className="p-2 rounded-lg bg-slate-800 hover:bg-slate-700 border border-slate-700 text-slate-300 transition-colors"
          >
            <Settings className="w-4 h-4" />
          </button>
        </div>
      </footer>

      {/* Manual Touch Flipper Triggers (Corner Overlays on Mobile) */}
      {!settings.autoPilot && (
        <div className="absolute inset-0 pointer-events-none z-20">
          {/* Top-Left */}
          <button
            onPointerDown={() => onTriggerFlipper('TL')}
            onPointerUp={() => onReleaseFlipper('TL')}
            className="absolute top-16 left-4 w-16 h-16 rounded-full border-2 border-cyan-400/40 bg-cyan-950/40 text-cyan-300 font-arcade text-xs flex items-center justify-center pointer-events-auto active:bg-cyan-500 active:text-black transition-all shadow-lg shadow-cyan-500/20"
          >
            Q
          </button>

          {/* Top-Right */}
          <button
            onPointerDown={() => onTriggerFlipper('TR')}
            onPointerUp={() => onReleaseFlipper('TR')}
            className="absolute top-16 right-4 w-16 h-16 rounded-full border-2 border-cyan-400/40 bg-cyan-950/40 text-cyan-300 font-arcade text-xs flex items-center justify-center pointer-events-auto active:bg-cyan-500 active:text-black transition-all shadow-lg shadow-cyan-500/20"
          >
            E
          </button>

          {/* Bottom-Left */}
          <button
            onPointerDown={() => onTriggerFlipper('BL')}
            onPointerUp={() => onReleaseFlipper('BL')}
            className="absolute bottom-20 left-4 w-16 h-16 rounded-full border-2 border-cyan-400/40 bg-cyan-950/40 text-cyan-300 font-arcade text-xs flex items-center justify-center pointer-events-auto active:bg-cyan-500 active:text-black transition-all shadow-lg shadow-cyan-500/20"
          >
            Z
          </button>

          {/* Bottom-Right */}
          <button
            onPointerDown={() => onTriggerFlipper('BR')}
            onPointerUp={() => onReleaseFlipper('BR')}
            className="absolute bottom-20 right-4 w-16 h-16 rounded-full border-2 border-cyan-400/40 bg-cyan-950/40 text-cyan-300 font-arcade text-xs flex items-center justify-center pointer-events-auto active:bg-cyan-500 active:text-black transition-all shadow-lg shadow-cyan-500/20"
          >
            C
          </button>
        </div>
      )}

      {/* How to Play / Info Popup */}
      {showHelp && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/85 backdrop-blur-md">
          <div className="relative w-full max-w-md bg-[#0c0e1a] border border-cyan-500/40 rounded-xl p-6 text-sm text-slate-300 space-y-4 shadow-2xl">
            <h3 className="font-arcade text-cyan-400 text-sm">HOW BUMPER QUEST WORKS</h3>
            <ul className="space-y-2 text-xs font-mono text-slate-300">
              <li>• <b className="text-white">Auto-Arcade / Fidget Spinner:</b> Plays itself via 4 autonomous corner AI flippers. Sit back, listen to the generative synth soundtrack, and watch the kinetic flow.</li>
              <li>• <b className="text-pink-400">Turntable Scratch Bumper:</b> Pinballs striking the central vinyl record trigger instant Web Audio vinyl scratches and reverse turntable slips.</li>
              <li>• <b className="text-rose-400">Tempest Spider Guardian:</b> Patrolling the perimeter ring, the spider actively intercepts and slingshots oncoming balls away from the record.</li>
              <li>• <b className="text-green-400">Charging Multipliers:</b> Bumping Circle, Square, Triangle, and Rectangle hazards multiplies score and upgrades note pitches.</li>
              <li>• <b className="text-cyan-400">Kinetic Tilt & Compass:</b> Tilt your phone (or drag the bottom-right tilt disc) to apply subtle gravitational forces to guide the pinballs!</li>
            </ul>
            <button
              onClick={() => setShowHelp(false)}
              className="w-full py-2 bg-cyan-600 hover:bg-cyan-500 text-white rounded font-mono text-xs font-bold transition-colors"
            >
              Let's Play
            </button>
          </div>
        </div>
      )}
    </>
  );
};
