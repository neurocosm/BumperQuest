import React, { useState, useEffect } from 'react';
import { X, Sliders, Volume2, VolumeX, Disc, Eye, Zap, RefreshCw, AlertCircle, CheckCircle } from 'lucide-react';
import { GameSettings } from '../game/physics';
import { soundSynth } from '../audio/SoundSynthesizer';
import { CURRENT_APP_VERSION, checkForAppUpdate, dumpCachesAndReload, CheckUpdateResult } from '../utils/versionManager';

export const APP_VERSION = CURRENT_APP_VERSION;

interface SettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
  settings: GameSettings;
  onUpdateSettings: (newSettings: Partial<GameSettings>) => void;
  onResetGame: () => void;
  onRequestSensorPermission?: () => void;
  knownUpdate?: CheckUpdateResult | null;
}

export const SettingsModal: React.FC<SettingsModalProps> = ({
  isOpen,
  onClose,
  settings,
  onUpdateSettings,
  onResetGame,
  onRequestSensorPermission,
  knownUpdate,
}) => {
  const [vol, setVol] = React.useState(0.8);
  const [musicVol, setMusicVol] = React.useState(0.45);
  const [muted, setMuted] = React.useState(soundSynth.getMuted());
  const [isCheckingUpdate, setIsCheckingUpdate] = useState(false);
  const [updateResult, setUpdateResult] = useState<CheckUpdateResult | null>(knownUpdate ?? null);
  const [isDumping, setIsDumping] = useState(false);

  useEffect(() => {
    if (isOpen) {
      setIsCheckingUpdate(true);
      checkForAppUpdate()
        .then((res) => {
          setUpdateResult(res);
        })
        .finally(() => {
          setIsCheckingUpdate(false);
        });
    }
  }, [isOpen]);

  const handlePerformUpdate = async () => {
    setIsDumping(true);
    await dumpCachesAndReload();
  };

  if (!isOpen) return null;

  const handleMuteToggle = () => {
    const nextMuted = !muted;
    setMuted(nextMuted);
    soundSynth.setMute(nextMuted);
    if (!nextMuted) {
      soundSynth.unlock().then(() => {
        soundSynth.playBumperChime(1);
      });
    }
  };

  const handleVolumeChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const v = parseFloat(e.target.value);
    setVol(v);
    soundSynth.setVolume(v);
    soundSynth.unlock();
  };

  const handleVolumeCommit = () => {
    soundSynth.unlock().then(() => {
      soundSynth.playBumperChime(3);
    });
  };

  const handleMusicVolumeChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const v = parseFloat(e.target.value);
    setMusicVol(v);
    soundSynth.setMusicVolume(v);
    soundSynth.unlock();
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
            {updateResult?.hasUpdate ? (
              <button
                onClick={handlePerformUpdate}
                disabled={isDumping}
                title={`New version ${updateResult.latestVersion} available! Click to dump cache and update.`}
                className="font-arcade text-[9.5px] text-black font-bold bg-amber-400 hover:bg-amber-300 border border-amber-200 px-2 py-0.5 rounded shadow-lg shadow-amber-500/50 animate-pulse transition-all cursor-pointer flex items-center gap-1"
              >
                <Zap className="w-3 h-3 fill-black" />
                {isDumping ? 'UPDATING...' : 'PRESS TO UPDATE'}
              </button>
            ) : (
              <span className="font-mono text-[10px] text-cyan-300 font-bold bg-cyan-950/70 border border-cyan-500/40 px-2 py-0.5 rounded shadow-sm">
                {CURRENT_APP_VERSION}
              </span>
            )}
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
          {/* Versioning & Build Info Card */}
          <div className="p-3.5 rounded-lg border border-cyan-500/30 bg-cyan-950/20 space-y-2.5">
            <div className="flex items-center justify-between">
              <div>
                <span className="font-mono text-xs font-bold text-cyan-300">System Build & Version</span>
                <p className="text-[11px] text-slate-400 font-mono">BumperQuest by: BostonyFX • Eastern USA (24h)</p>
              </div>
              {updateResult?.hasUpdate ? (
                <button
                  onClick={handlePerformUpdate}
                  disabled={isDumping}
                  className="font-arcade text-[10px] text-black font-bold bg-gradient-to-r from-amber-400 to-yellow-300 hover:from-amber-300 hover:to-yellow-200 border border-amber-200 px-3 py-1 rounded shadow-lg shadow-amber-500/40 animate-pulse transition-all cursor-pointer flex items-center gap-1.5"
                >
                  <Zap className="w-3.5 h-3.5 fill-black" />
                  {isDumping ? 'PURGING...' : 'PRESS TO UPDATE'}
                </button>
              ) : (
                <span className="font-mono text-xs font-bold text-amber-300 bg-amber-950/50 border border-amber-500/40 px-2.5 py-1 rounded shadow-sm">
                  {CURRENT_APP_VERSION}
                </span>
              )}
            </div>

            {/* Status details & Cache Dump Button */}
            <div className="flex items-center justify-between pt-2 border-t border-cyan-500/15 text-[11px] font-mono">
              {updateResult?.hasUpdate ? (
                <span className="text-amber-300 font-bold flex items-center gap-1">
                  <AlertCircle className="w-3.5 h-3.5 text-amber-400 flex-shrink-0" />
                  New build {updateResult.latestVersion} ready!
                </span>
              ) : isCheckingUpdate ? (
                <span className="text-slate-400 flex items-center gap-1.5">
                  <RefreshCw className="w-3 h-3 animate-spin text-cyan-400" />
                  Checking for updates...
                </span>
              ) : (
                <span className="text-emerald-400 flex items-center gap-1">
                  <CheckCircle className="w-3.5 h-3.5 text-emerald-400 flex-shrink-0" />
                  Build is up to date
                </span>
              )}

              <button
                onClick={handlePerformUpdate}
                disabled={isDumping}
                title="Dump all caches, unregister service workers, and force browser reload"
                className="text-slate-400 hover:text-cyan-300 underline decoration-slate-600 hover:decoration-cyan-400 transition-colors cursor-pointer text-[10.5px]"
              >
                {isDumping ? 'Dumping cache...' : 'Force Dump & Reload'}
              </button>
            </div>
          </div>
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

          {/* Spiked Pinwheels Ricochet Toggle */}
          <div className="flex items-center justify-between p-3 rounded-lg border border-slate-700 bg-slate-900/40">
            <div>
              <span className="font-mono text-xs font-bold text-amber-300">Spiked Corner Pinwheels</span>
              <p className="text-[11px] text-slate-400">High-rpm spiked ricochet turbines in bottom corners to radically fling balls back into play</p>
            </div>
            <button
              onClick={() => onUpdateSettings({ spikedPinwheels: settings.spikedPinwheels === false ? true : false })}
              className={`px-3 py-1 rounded text-xs font-mono font-bold transition-all ${
                settings.spikedPinwheels !== false ? 'bg-amber-400 text-black' : 'bg-slate-700 text-slate-300'
              }`}
            >
              {settings.spikedPinwheels !== false ? 'ON' : 'OFF'}
            </button>
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
                onPointerUp={handleVolumeCommit}
                className="w-full accent-cyan-400 bg-slate-800 h-1.5 rounded-lg cursor-pointer"
              />
            </div>

            <div className="space-y-1">
              <div className="flex justify-between text-[11px] font-mono text-slate-400">
                <span>Record Player Retro Theme / Chiptune</span>
                <span>{Math.round(musicVol * 100)}%</span>
              </div>
              <input
                type="range"
                min={0}
                max={1}
                step={0.05}
                value={musicVol}
                onChange={handleMusicVolumeChange}
                onPointerUp={handleVolumeCommit}
                className="w-full accent-pink-400 bg-slate-800 h-1.5 rounded-lg cursor-pointer"
              />
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="px-6 py-3.5 border-t border-cyan-500/20 bg-[#080912] flex items-center justify-between">
          <div className="flex items-center gap-3">
            <button
              onClick={onResetGame}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded bg-rose-950/60 border border-rose-500/40 text-rose-300 hover:bg-rose-900/80 font-mono text-xs transition-colors"
            >
              <RefreshCw className="w-3.5 h-3.5" />
              Reset Board
            </button>
            {updateResult?.hasUpdate ? (
              <button
                onClick={handlePerformUpdate}
                disabled={isDumping}
                className="flex items-center gap-1.5 px-3 py-1 rounded bg-amber-400 hover:bg-amber-300 text-black font-arcade text-[9.5px] font-bold shadow-md shadow-amber-400/40 animate-pulse cursor-pointer"
              >
                <Zap className="w-3.5 h-3.5 fill-black" />
                {isDumping ? 'DUMPING CACHE...' : 'PRESS TO UPDATE'}
              </button>
            ) : (
              <span className="font-mono text-[11px] text-cyan-400/80 tracking-wider">
                {CURRENT_APP_VERSION}
              </span>
            )}
          </div>
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
