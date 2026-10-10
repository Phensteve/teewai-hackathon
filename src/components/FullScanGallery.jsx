import { useState } from 'react';
import { X } from 'lucide-react';
import ScanImage from '@/components/ScanImage';

const ANGLES = [
  { key: 'front', label: 'Front' },
  { key: 'top', label: 'Upper' },
  { key: 'lower', label: 'Lower' },
  { key: 'left', label: 'Left' },
  { key: 'right', label: 'Right' },
];

export default function FullScanGallery({ imageUrls = [] }) {
  const [active, setActive] = useState(null);

  if (!imageUrls.length) return null;

  return (
    <div className="mb-6">
      <div className="flex items-center gap-2 mb-3">
        <span className="text-[11px] font-medium text-olo bg-olo/10 px-2 py-0.5 rounded-full">Full scan</span>
        <p className="text-sm text-muted-foreground">All {imageUrls.length} angles captured</p>
      </div>
      <div className="grid grid-cols-2 sm:grid-cols-5 gap-2">
        {imageUrls.map((url, i) => {
          const angle = ANGLES[i] || { label: `Photo ${i + 1}` };
          return (
            <button
              key={i}
              onClick={() => setActive(url)}
              className="group relative aspect-square rounded-xl overflow-hidden border border-border bg-olo-deep hover:border-olo/50 transition-colors"
            >
              <ScanImage url={url} alt={angle.label} className="w-full h-full object-cover" />
              <span className="absolute bottom-0 inset-x-0 bg-gradient-to-t from-black/70 to-transparent text-white text-[10px] font-medium px-2 py-1 text-left">
                {angle.label}
              </span>
            </button>
          );
        })}
      </div>

      {active && (
        <div
          className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4"
          onClick={() => setActive(null)}
        >
          <button
            className="absolute top-4 right-4 w-10 h-10 rounded-full bg-white/10 hover:bg-white/20 text-white flex items-center justify-center transition-colors"
            onClick={() => setActive(null)}
            aria-label="Close"
          >
            <X className="w-5 h-5" />
          </button>
          <div onClick={(e) => e.stopPropagation()}>
            <ScanImage
              url={active}
              alt="Full scan angle"
              className="max-w-full max-h-[85vh] rounded-2xl object-contain"
            />
          </div>
        </div>
      )}
    </div>
  );
}