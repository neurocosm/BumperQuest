import React, { useRef, useState, useEffect } from 'react';
import { Compass, RotateCw, X } from 'lucide-react';

interface TiltVirtualPadProps {
  tiltX: number; // -1 to 1
  tiltY: number; // -1 to 1
  compassAngle: number;
  onTiltChange: (x: number, y: number) => void;
  onResetTilt: () => void;
  hasDeviceOrientation: boolean;
  onRequestSensorPermission?: () => void;
  onClose?: () => void;
}

export const TiltVirtualPad: React.FC<TiltVirtualPadProps> = ({
  tiltX,
  tiltY,
  compassAngle,
  onTiltChange,
  onResetTilt,
  hasDeviceOrientation,
  onRequestSensorPermission,
  onClose,
}) => {
  const padRef = useRef<HTMLDivElement>(null);
  const [isDragging, setIsDragging] = useState(false);

  const handlePointer = (e: React.PointerEvent) => {
    if (!padRef.current) return;
    const rect = padRef.current.getBoundingClientRect();
    const centerX = rect.left + rect.width / 2;
    const centerY = rect.top + rect.height / 2;
    const radius = rect.width / 2;

    const dx = (e.clientX - centerX) / radius;
    const dy = (e.clientY - centerY) / radius;

    const clampedX = Math.max(-1, Math.min(1, dx));
    const clampedY = Math.max(-1, Math.min(1, dy));

    onTiltChange(clampedX * 0.4, clampedY * 0.4);
  };

  const handlePointerDown = (e: React.PointerEvent) => {
    setIsDragging(true);
    handlePointer(e);
  };

  useEffect(() => {
    const handleGlobalPointerMove = (e: PointerEvent) => {
      if (!isDragging || !padRef.current) return;
      const rect = padRef.current.getBoundingClientRect();
      const centerX = rect.left + rect.width / 2;
      const centerY = rect.top + rect.height / 2;
      const radius = rect.width / 2;

      const dx = (e.clientX - centerX) / radius;
      const dy = (e.clientY - centerY) / radius;

      const clampedX = Math.max(-1, Math.min(1, dx));
      const clampedY = Math.max(-1, Math.min(1, dy));
      onTiltChange(clampedX * 0.4, clampedY * 0.4);
    };

    const handleGlobalPointerUp = () => {
      setIsDragging(false);
    };

    if (isDragging) {
      window.addEventListener('pointermove', handleGlobalPointerMove);
      window.addEventListener('pointerup', handleGlobalPointerUp);
    }

    return () => {
      window.removeEventListener('pointermove', handleGlobalPointerMove);
      window.removeEventListener('pointerup', handleGlobalPointerUp);
    };
  }, [isDragging, onTiltChange]);

  // Convert tiltX and tiltY back to percentage for dot
  const dotX = 50 + (tiltX / 0.4) * 38;
  const dotY = 50 + (tiltY / 0.4) * 38;

  return (
    <div className="flex flex-col items-center gap-1.5 p-2 bg-[#0c0d18]/95 border border-cyan-500/40 rounded-xl backdrop-blur-md shadow-2xl shadow-cyan-950/80 select-none w-28">
      <div className="flex items-center justify-between w-full px-0.5 text-[9px] font-mono text-cyan-400 font-bold uppercase tracking-wider">
        <span className="flex items-center gap-1">
          <Compass className="w-3 h-3 text-cyan-400 animate-spin-slow" />
          TILT PAD
        </span>
        <div className="flex items-center gap-1">
          <button
            onClick={onResetTilt}
            title="Reset Tilt"
            className="text-slate-400 hover:text-white transition-colors p-0.5"
          >
            <RotateCw className="w-2.5 h-2.5" />
          </button>
          {onClose && (
            <button
              onClick={onClose}
              title="Close Tilt Pad"
              className="text-slate-400 hover:text-rose-400 transition-colors p-0.5"
            >
              <X className="w-3 h-3" />
            </button>
          )}
        </div>
      </div>

      {/* Touch Pad Area */}
      <div
        ref={padRef}
        onPointerDown={handlePointerDown}
        className="relative w-20 h-20 rounded-full border border-cyan-500/40 bg-black/70 cursor-crosshair overflow-hidden touch-none flex items-center justify-center shadow-inner shadow-cyan-900/40"
      >
        {/* Crosshair guide lines */}
        <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
          <div className="w-full h-[1px] bg-cyan-500/20" />
          <div className="h-full w-[1px] bg-cyan-500/20 absolute" />
          <div className="w-10 h-10 rounded-full border border-cyan-500/20" />
        </div>

        {/* Dynamic Tilt Indicator Bead */}
        <div
          className="absolute w-3.5 h-3.5 rounded-full bg-gradient-to-tr from-cyan-400 to-pink-500 shadow-md shadow-cyan-400/80 pointer-events-none transition-transform duration-75"
          style={{
            left: `${dotX}%`,
            top: `${dotY}%`,
            transform: 'translate(-50%, -50%)',
          }}
        />
      </div>

      {/* Sensor Info / Prompt */}
      <div className="text-[8px] font-mono text-slate-400 text-center leading-tight">
        {hasDeviceOrientation ? (
          <span className="text-green-400 font-bold">GYRO SYNCED</span>
        ) : onRequestSensorPermission ? (
          <button
            onClick={onRequestSensorPermission}
            className="text-[8px] text-cyan-300 underline hover:text-cyan-200"
          >
            Enable Phone Gyro
          </button>
        ) : (
          <span>Drag or WASD</span>
        )}
      </div>
    </div>
  );
};
