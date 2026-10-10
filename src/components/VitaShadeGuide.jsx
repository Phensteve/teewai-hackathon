import { Palette } from 'lucide-react';

// The generated VITA Classical shade-guide reference card (A1-D4 + bleached
// 0M1-0M3). Embedded in the reference-material page so users see exactly what
// to hold next to their teeth for color calibration.
export const VITA_SHADE_GUIDE_URL =
  'https://media.base44.com/images/public/6a6611b97d7894c19d798137/03d415ae5_generated_image.png';

export default function VitaShadeGuide() {
  return (
    <figure className="my-6 rounded-3xl overflow-hidden border border-border bg-card">
      <img
        src={VITA_SHADE_GUIDE_URL}
        alt="VITA Classical shade guide A1–D4 with bleached shades 0M1–0M3"
        className="w-full object-cover"
        loading="lazy"
      />
      <figcaption className="px-5 py-4 text-sm text-muted-foreground leading-relaxed">
        <div className="flex items-center gap-2 mb-1 text-foreground font-medium">
          <Palette className="w-4 h-4 text-olo" /> VITA Classical A1–D4
        </div>
        The international standard for tooth shade. The <strong className="text-foreground">A</strong> group is brownish-yellow
        (most common), <strong className="text-foreground">B</strong> reddish-yellow, <strong className="text-foreground">C</strong> grey,
        <strong className="text-foreground"> D</strong> reddish-grey. The bleached row <strong className="text-foreground">0M1–0M3</strong> marks
        targets reachable with professional whitening. Holding a tab like this next to your teeth lets teewai calibrate color precisely.
      </figcaption>
    </figure>
  );
}