import { CheckCircle2, Move } from 'lucide-react';

const LEVEL_STYLE = {
  good: 'bg-emerald-500/90 text-white',
  hint: 'bg-black/60 text-white',
  warn: 'bg-amber-500/90 text-white',
  idle: 'bg-black/60 text-white',
};

// Alignment guide drawn over the live camera: a mouth-framing oval that turns
// green on a good read, plus a coaching message. Advisory only.
export default function AlignmentOverlay({ aligned, level, message }) {
  return (
    <div className="absolute inset-0 pointer-events-none">
      <div className="absolute inset-0 flex items-center justify-center">
        <div
          className={`w-[72%] h-[46%] rounded-[50%] border-2 transition-colors duration-300 ${
            aligned ? 'border-emerald-400 shadow-[0_0_40px_rgba(52,211,153,0.5)]' : 'border-white/50 border-dashed'
          }`}
        />
      </div>
      <div className="absolute inset-x-0 top-16 flex justify-center px-4">
        <div className={`inline-flex items-center gap-2 px-3.5 py-2 rounded-full backdrop-blur-md text-xs font-semibold text-center transition-colors ${LEVEL_STYLE[level] || LEVEL_STYLE.idle}`}>
          {aligned ? <CheckCircle2 className="w-4 h-4" /> : <Move className="w-4 h-4" />}
          {message}
        </div>
      </div>
    </div>
  );
}