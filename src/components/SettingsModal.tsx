import React from 'react';
import { X, Sliders, Volume2, VolumeX, Disc, Eye, Zap, RefreshCw } from 'lucide-react';
import { GameSettings } from '../game/physics';
import { soundSynth } from '../audio/SoundSynthesizer';

interface SettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
  settings: GameSettings;
  onUpdateSettings: (newSettings: Partial<GameSettings>) => void;
  onResetGame: () => void;
  onRequestSensorPermission?: () => void;
}

export const SettingsModal: React.FC<SettingsModalProps> = ({
  isOpen,
  onClose,
  settings,
  onUpdateSettings,
  onResetGame,
  onRequestSensorPermission,
}) => {
  const [vol, setVol] = React.useState(0.7);
  const [crackleVol, setCrackleVol] = React.useState(0.25);
  const [muted, setMuted] = React.useState(soundSynth.getMuted());

  if (!isOpen) return null;

  const handleMuteToggle = () => {
    const nextMuted = !muted;
    setMuted(nextMuted);
    soundSynth.setMute(nextMuted);
  };

  const handleVolumeChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const v = parseFloat(e.target.value);
    setVol(v);
    soundSynth.setVolume(v);
  };

  const handleCrackleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const v = parseFloat(e.target.value);
    setCrackleVol(v);
    soundSynth.setCrackleVolume(v);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/85 backdrop-blur-md">
      <div className="relative w-full max-w-lg bg-[#0c0e1a] border border-cyan-500/40 rounded-xl shadow-2xl shadow-cyan-500/10 overflow-hidden flex flex-col max-h-[90vh]">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-cyan-500/20 bg-[#080912]">
          <div className="flex items-center gap-2">
            <Sliders className="w-5 h-5 text-cyan-400" />
            <h2 className="text-base font-bold font-arcade tracking-wider text-cyan-400">
              SIMULATOR SETTINGS
            </h2>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 text-slate-400 hover:text-white rounded-lg hover:bg-white/10 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Settings Body */}
        <div className="flex-1 overflow-y-auto p-6 space-y-5 text-sm">
          {/* Turntable Speed */}
          <div className="space-y-2">
            <label className="flex items-center gap-2 font-mono text-xs text-cyan-300 font-bold uppercase">
              <Disc className="w-4 h-4 text-cyan-400" />
              Turntable Speed (RPM)
            </label>
            <div className="grid grid-cols-4 gap-2">
              {[33, 45, 78, 120].map((speed) => (
                <button
                  key={speed}
                  onClick={() => onUpdateSettings({ rpm: speed })}
                  className={`py-2 px-3 rounded-lg font-mono text-xs font-bold border transition-all ${
                    settings.rpm === speed
                      ? 'border-cyan-400 bg-cyan-500/20 text-white shadow-md shadow-cyan-500/20'
                      : 'border-slate-700 bg-slate-900/60 text-slate-400 hover:border-slate-500'
                  }`}
                >
                  {speed === 120 ? '120 HYPER' : `${speed} RPM`}
                </button>
              ))}
            </div>
          </div>

          {/* Visual Theme */}
          <div className="space-y-2">
            <label className="flex items-center gap-2 font-mono text-xs text-pink-300 font-bold uppercase">
              <Eye className="w-4 h-4 text-pink-400" />
              Psychedelic Vector Theme
            </label>
            <div className="grid grid-cols-3 gap-2">
              {(['tempest', 'grid', 'qix', 'kaleidoscope', 'space'] as const).map((theme) => (
                <button
                  key={theme}
                  onClick={() => onUpdateSettings({ bgTheme: theme })}
                  className={`py-2 px-2 rounded-lg font-mono text-[11px] font-bold border capitalize transition-all ${
                    settings.bgTheme === theme
                      ? 'border-pink-500 bg-pink-500/20 text-white shadow-md shadow-pink-500/20'
                      : 'border-slate-700 bg-slate-900/60 text-slate-400 hover:border-slate-500'
                  }`}
                >
                  {theme}
                </button>
              ))}
            </div>
          </div>

          {/* Trail Timing Dots */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <label className="flex items-center gap-2 font-mono text-xs text-amber-300 font-bold uppercase">
                <Zap className="w-4 h-4 text-amber-400" />
                Timing Dots & Trailing Strokes
              </label>
              <span className="font-mono text-xs text-slate-300">{settings.trailDotCount} dots</span>
            </div>
            <input
              type="range"
              min={6}
              max={40}
              step={2}
              value={settings.trailDotCount}
              onChange={(e) => onUpdateSettings({ trailDotCount: parseInt(e.target.value) })}
              className="w-full accent-amber-400 bg-slate-800 h-2 rounded-lg cursor-pointer"
            />
            <p className="text-[11px] text-slate-400 font-mono">
              Adjusts the trailing strobe dots to clearly visualize ball momentum, deflection angles, and timing strokes.
            </p>
          </div>

          {/* Tilt Sensitivity */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <label className="font-mono text-xs text-green-300 font-bold uppercase">
                Gyroscope / Kinetic Tilt Force
              </label>
              <span className="font-mono text-xs text-slate-300">
                {settings.tiltSensitivity.toFixed(1)}x
              </span>
            </div>
            <input
              type="range"
              min={0.2}
              max={2.5}
              step={0.1}
              value={settings.tiltSensitivity}
              onChange={(e) => onUpdateSettings({ tiltSensitivity: parseFloat(e.target.value) })}
              className="w-full accent-green-400 bg-slate-800 h-2 rounded-lg cursor-pointer"
            />
            {onRequestSensorPermission && (
              <button
                onClick={onRequestSensorPermission}
                className="text-xs text-cyan-400 underline font-mono hover:text-cyan-300 block"
              >
                Request Phone Motion / Orientation Access
              </button>
            )}
          </div>

          {/* CRT Scanline Toggle */}
          <div className="flex items-center justify-between p-3 rounded-lg border border-slate-700 bg-slate-900/40">
            <div>
              <span className="font-mono text-xs font-bold text-slate-200">CRT Monitor Scanlines & Bloom</span>
              <p className="text-[11px] text-slate-400">Authentic 80s arcade cathode-ray tube glass simulation</p>
            </div>
            <button
              onClick={() => onUpdateSettings({ crtScanlines: !settings.crtScanlines })}
              className={`px-3 py-1 rounded text-xs font-mono font-bold transition-all ${
                settings.crtScanlines ? 'bg-cyan-500 text-black' : 'bg-slate-700 text-slate-300'
              }`}
            >
              {settings.crtScanlines ? 'ON' : 'OFF'}
            </button>
          </div>

          {/* Sound Synthesizer & Vinyl Crackle */}
          <div className="space-y-3 p-3 rounded-lg border border-slate-700 bg-slate-900/40">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                {muted ? <VolumeX className="w-4 h-4 text-rose-400" /> : <Volume2 className="w-4 h-4 text-cyan-400" />}
                <span className="font-mono text-xs font-bold text-slate-200">Generative Web Audio</span>
              </div>
              <button
                onClick={handleMuteToggle}
                className={`px-3 py-1 rounded text-xs font-mono font-bold transition-all ${
                  !muted ? 'bg-cyan-500 text-black' : 'bg-rose-900/60 text-rose-300'
                }`}
              >
                {muted ? 'MUTED' : 'ACTIVE'}
              </button>
            </div>

            <div className="space-y-1">
              <div className="flex justify-between text-[11px] font-mono text-slate-400">
                <span>Master Synth FX</span>
                <span>{Math.round(vol * 100)}%</span>
              </div>
              <input
                type="range"
                min={0}
                max={1}
                step={0.05}
                value={vol}
                onChange={handleVolumeChange}
                className="w-full accent-cyan-400 bg-slate-800 h-1.5 rounded-lg cursor-pointer"
              />
            </div>

            <div className="space-y-1">
              <div className="flex justify-between text-[11px] font-mono text-slate-400">
                <span>Analog Vinyl Groove Crackle</span>
                <span>{Math.round(crackleVol * 100)}%</span>
              </div>
              <input
                type="range"
                min={0}
                max={1}
                step={0.05}
                value={crackleVol}
                onChange={handleCrackleChange}
                className="w-full accent-pink-400 bg-slate-800 h-1.5 rounded-lg cursor-pointer"
              />
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="px-6 py-3.5 border-t border-cyan-500/20 bg-[#080912] flex items-center justify-between">
          <button
            onClick={onResetGame}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded bg-rose-950/60 border border-rose-500/40 text-rose-300 hover:bg-rose-900/80 font-mono text-xs transition-colors"
          >
            <RefreshCw className="w-3.5 h-3.5" />
            Reset Board
          </button>
          <button
            onClick={onClose}
            className="px-5 py-1.5 bg-cyan-600 hover:bg-cyan-500 text-white rounded font-mono text-xs font-bold transition-colors shadow-md shadow-cyan-600/30"
          >
            Done
          </button>
        </div>
      </div>
    </div>
  );
};
