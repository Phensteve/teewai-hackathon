import ScanImage from '@/components/ScanImage';

// Horizontal scroll gallery of the user's scan/food photos, shown below the
// bot's text in a chat message. Each thumbnail has a label overlay (date for
// teeth, food name for food). Uses ScanImage which resolves private InsForge
// URLs through the scanPhoto proxy.
export default function ChatImageGallery({ images }) {
  if (!images?.length) return null;

  return (
    <div className="flex gap-2 overflow-x-auto no-scrollbar pb-1 mt-2.5">
      {images.map((img, i) => (
        <div
          key={i}
          className="flex-shrink-0 w-28 h-28 rounded-xl overflow-hidden border border-border bg-muted relative group"
        >
          <ScanImage
            url={img.url}
            alt={img.label}
            className="w-full h-full object-cover"
          />
          <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/75 via-black/30 to-transparent px-2 pt-3 pb-1.5">
            <p className="text-[10px] text-white font-medium truncate leading-tight">{img.label}</p>
            {img.score != null && (
              <p className="text-[10px] text-white/80 leading-tight">{img.score}/100{img.shade ? ` · ${img.shade}` : ''}</p>
            )}
          </div>
        </div>
      ))}
    </div>
  );
}