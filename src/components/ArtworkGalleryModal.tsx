import React from 'react';
import { X, ExternalLink, Sparkles } from 'lucide-react';

interface ArtworkGalleryModalProps {
  isOpen: boolean;
  onClose: () => void;
}

const ARTWORK_ITEMS = [
  { id: 1, file: '/images/image(1).png', title: 'Spin-Vortex Turntable Field', desc: 'Central vinyl turntable bumper with concentric sound grooves and 4-corner flippers' },
  { id: 2, file: '/images/image(2).png', title: 'Tempest Spider Guardian', desc: 'Crawler patrol perimeter intercepting ricochet balls to protect the record' },
  { id: 3, file: '/images/image(3).png', title: 'Geometric Hazard Matrix', desc: 'Circle, Square, Triangle, Rectangle multipliers that charge up with kinetic impacts' },
  { id: 4, file: '/images/image(4).png', title: 'Psychedelic Kaleidoscope Vector', desc: 'Changing 80s arcade vector visual fields and dynamic neon lighting' },
  { id: 5, file: '/images/image(5).png', title: 'Neon CRT Bloom Simulation', desc: 'Cathode-ray tube scanline bloom with high-contrast glowing lines' },
  { id: 6, file: '/images/image(6).png', title: 'Double-Pinball Kinetic Layout', desc: 'Top and bottom flipper matrix forming a closed-loop zero-player kinetic flow' },
  { id: 7, file: '/images/image(7).png', title: 'Pac-Man & Qix Dot Grid', desc: 'Consumable dot lanes composing generative synth notes as balls roll through' },
  { id: 8, file: '/images/image(8).png', title: 'Stylus & Vinyl Grooves', desc: 'Detailed analog phonograph needle tracking the spinning vinyl disc' },
  { id: 9, file: '/images/image(9).png', title: 'Electric Fence Gate', desc: 'High-voltage barrier slicing mid-lanes with crackling repelling arcs' },
  { id: 10, file: '/images/image(10).png', title: 'Cracker Jack Pocket Maze', desc: 'Mobile gyroscope and compass tilt inspired by handheld mechanical dexterity toys' },
  { id: 11, file: '/images/image(11).png', title: 'Timing Dots & Trailing Strokes', desc: 'Particle strobe trails allowing players to visualize ball timing and tempo' },
  { id: 12, file: '/images/image(12).png', title: 'Autonomous Flipper Logic', desc: 'Smart AI goalie tracking ball trajectories with mathematical precision' },
  { id: 13, file: '/images/image(13).png', title: 'Vortex Cylinder Perspective', desc: 'Tempest 3D geometric tunnel view converging into the central bumper' },
  { id: 14, file: '/images/image(14).png', title: 'Vinyl Scratch FX Concept', desc: 'Instant needle jerk and turntable rotation slip upon ball impact' },
  { id: 15, file: '/images/image(15).png', title: 'Kaleidoscopic Prism Grid', desc: 'Multi-axis radial symmetry for hypnotic ambient visual sequencing' },
  { id: 16, file: '/images/image(16).png', title: 'Self-Playing Fidget Spinner', desc: 'Zero-player automated kinetic art piece designed for relaxation and focus' },
];

export const ArtworkGalleryModal: React.FC<ArtworkGalleryModalProps> = ({ isOpen, onClose }) => {
  const [selectedImg, setSelectedImg] = React.useState<typeof ARTWORK_ITEMS[0] | null>(null);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/85 backdrop-blur-md">
      <div className="relative w-full max-w-5xl max-h-[90vh] flex flex-col bg-[#0b0c16] border border-cyan-500/40 rounded-xl shadow-2xl shadow-cyan-500/10 overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-cyan-500/20 bg-[#070810]">
          <div className="flex items-center gap-3">
            <Sparkles className="w-5 h-5 text-cyan-400" />
            <div>
              <h2 className="text-lg font-bold font-arcade tracking-wider text-cyan-400">
                ORIGINAL CONCEPT VAULT
              </h2>
              <p className="text-xs text-slate-400">
                16 Concept Designs & Mockups from repository <code className="text-pink-400">neurocosm/BumperQuest</code>
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 text-slate-400 hover:text-white rounded-lg hover:bg-white/10 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-6">
          {selectedImg ? (
            <div className="flex flex-col items-center gap-4">
              <button
                onClick={() => setSelectedImg(null)}
                className="self-start text-xs font-mono text-cyan-400 hover:underline flex items-center gap-1"
              >
                ← Back to Gallery
              </button>
              <div className="relative max-h-[60vh] max-w-full rounded-lg overflow-hidden border border-cyan-500/50 bg-black/60 shadow-xl">
                <img
                  src={selectedImg.file}
                  alt={selectedImg.title}
                  className="max-h-[60vh] max-w-full object-contain mx-auto"
                />
              </div>
              <div className="text-center max-w-xl">
                <h3 className="text-base font-bold font-arcade text-cyan-300 mb-1">{selectedImg.title}</h3>
                <p className="text-sm text-slate-300 font-mono">{selectedImg.desc}</p>
              </div>
            </div>
          ) : (
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4">
              {ARTWORK_ITEMS.map((item) => (
                <div
                  key={item.id}
                  onClick={() => setSelectedImg(item)}
                  className="group relative cursor-pointer rounded-lg overflow-hidden border border-slate-700/50 hover:border-cyan-400 bg-[#121422] transition-all hover:scale-[1.02] hover:shadow-lg hover:shadow-cyan-500/20"
                >
                  <div className="aspect-square w-full overflow-hidden bg-black/40 flex items-center justify-center">
                    <img
                      src={item.file}
                      alt={item.title}
                      className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                      loading="lazy"
                    />
                  </div>
                  <div className="p-2.5">
                    <div className="flex items-center justify-between">
                      <span className="text-[10px] font-mono font-bold text-pink-400">ITEM #{item.id}</span>
                      <ExternalLink className="w-3 h-3 text-slate-500 group-hover:text-cyan-400" />
                    </div>
                    <h4 className="text-xs font-bold text-slate-200 truncate mt-1">{item.title}</h4>
                    <p className="text-[11px] text-slate-400 line-clamp-2 mt-0.5">{item.desc}</p>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="px-6 py-3 border-t border-cyan-500/20 bg-[#070810] flex items-center justify-between text-xs text-slate-400">
          <span>Vector Ball: Auto-Arcade & Spin-Vortex Specifications</span>
          <button
            onClick={onClose}
            className="px-4 py-1.5 bg-cyan-600 hover:bg-cyan-500 text-white rounded font-mono text-xs transition-colors"
          >
            Close Vault
          </button>
        </div>
      </div>
    </div>
  );
};
