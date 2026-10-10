import { useState } from 'react';
import { X, ScanLine } from 'lucide-react';
import ScanImage from '@/components/ScanImage';

// A subtle ghost thumbnail of the user's last capture, shown in the camera
// view so they can match the angle. Non-blocking, skippable instantly with
// the X button. Only rendered when a previous scan image exists.
export default function GhostThumbnail({ imageUrl, positionLabel }) {
  const [dismissed, setDismissed] = useState(false);

  if (!imageUrl || dismissed) return null;

  return (
    <div className="absolute top-14 left-3 flex flex-col gap-1.5 pointer-events-auto z-10">
      <div className="relative w-20 rounded-xl overflow-hidden border border-white/25 bg-black/40 backdrop-blur-sm">
        <ScanImage url={imageUrl} alt="Last scan angle" className="w-full h-14 object-cover opacity-60" />
        <button
          onClick={() => setDismissed(true)}
          className="absolute top-0.5 right-0.5 w-5 h-5 rounded-full bg-black/60 flex items-center justify-center text-white/80 hover:text-white hover:bg-black/80 transition-colors"
          aria-label="Dismiss angle hint"
        >
          <X className="w-3 h-3" />
        </button>
      </div>
      <div className="inline-flex items-center gap-1 px-2 py-1 rounded-full glass">
        <ScanLine className="w-3 h-3 text-olo" />
        <span className="text-[10px] text-white/90 font-medium whitespace-nowrap">Match this angle</span>
      </div>
    </div>
  );
}