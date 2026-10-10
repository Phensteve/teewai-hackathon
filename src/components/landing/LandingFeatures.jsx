import { Camera, Gauge, TrendingUp, Utensils, Palette, Bell } from 'lucide-react';
import SectionLabel from '@/components/landing/SectionLabel';
import DarkRisingCard from '@/components/landing/DarkRisingCard';

const features = [
  { icon: Camera, title: 'Snap & scan', desc: 'Capture your teeth in seconds. teewai reads shade, brightness, and staining right away.' },
  { icon: Gauge, title: 'Whiteness score', desc: 'A precise 0 to 100 score from computer vision, benchmarked against the VITA shade guide.' },
  { icon: TrendingUp, title: 'Progress tracking', desc: 'Every scan is saved. Watch your shade brighten week over week with a visual timeline.' },
  { icon: Utensils, title: 'Food scan', desc: 'Snap your meal. teewai IDs the chromogens, tannins and acids staining your teeth and rolls them into a daily stain load.' },
  { icon: Palette, title: 'Personalized methods', desc: 'Get whitening methods tailored to your exact shade. Strips, trays, diet tips, professional options.' },
  { icon: Bell, title: 'Smart retake prompts', desc: 'If your photo is unclear or misses your top teeth, teewai asks for exactly the right angle.' },
];

// Faint tooth-silhouette watermarks — one distinct tooth shape per card,
// each placed in a different corner / rotation so the grid feels dynamic
// rather than stamped. Premium enamel-themed visual without a per-card
// WebGL context (keeps the landing GPU-light).
const TOOTH_SHAPES = {
  incisor: 'M50 8 C32 8 22 20 22 38 C22 54 30 68 40 80 C44 86 48 90 50 90 C52 90 56 86 60 80 C70 68 78 54 78 38 C78 20 68 8 50 8 Z M50 18 C40 18 32 26 32 38 C32 50 38 60 46 72 C48 76 50 78 50 78 C50 78 52 76 54 72 C62 60 68 50 68 38 C68 26 60 18 50 18 Z',
  canine: 'M50 6 C40 6 30 14 28 30 C26 44 32 58 38 72 C42 82 46 90 50 90 C54 90 58 82 62 72 C68 58 74 44 72 30 C70 14 60 6 50 6 Z M50 14 C44 14 38 20 38 32 C38 44 42 56 48 70 C49 74 50 76 50 76 C50 76 51 74 52 70 C58 56 62 44 62 32 C62 20 56 14 50 14 Z',
  premolar: 'M50 10 C36 10 26 18 26 34 C26 46 30 56 36 68 C40 78 44 88 50 88 C56 88 60 78 64 68 C70 56 74 46 74 34 C74 18 64 10 50 10 Z M38 28 C42 24 46 30 50 30 C54 30 58 24 62 28 C66 34 62 42 58 48 C54 54 52 60 50 60 C48 60 46 54 42 48 C38 42 34 34 38 28 Z',
  molar: 'M30 16 C22 16 16 24 16 36 C16 48 22 58 28 68 C32 76 36 86 40 88 C44 88 46 82 50 82 C54 82 56 88 60 88 C64 86 68 76 72 68 C78 58 84 48 84 36 C84 24 78 16 70 16 C62 16 58 22 50 22 C42 22 38 16 30 16 Z M28 30 C34 26 40 32 44 36 C48 40 52 40 56 36 C60 32 66 26 72 30 C76 36 72 44 66 50 C60 56 54 62 50 62 C46 62 40 56 34 50 C28 44 24 36 28 30 Z',
};

// Per-card placement: corner, rotation, size, opacity — every card differs.
const WATERMARK_VARIANTS = [
  { shape: 'incisor', cls: '-right-6 -bottom-6 w-40 h-40 rotate-[-8deg] opacity-[0.07]' },
  { shape: 'canine', cls: '-left-8 -top-8 w-44 h-44 rotate-[12deg] opacity-[0.06]' },
  { shape: 'molar', cls: 'right-2 -bottom-10 w-48 h-48 rotate-[6deg] opacity-[0.05]' },
  { shape: 'premolar', cls: '-right-10 top-2 w-36 h-36 rotate-[-18deg] opacity-[0.07]' },
  { shape: 'incisor', cls: 'left-0 -bottom-8 w-44 h-44 rotate-[20deg] opacity-[0.06]' },
  { shape: 'molar', cls: '-left-6 -bottom-4 w-40 h-40 rotate-[-12deg] opacity-[0.05]' },
];

function ToothWatermark({ index = 0 }) {
  const v = WATERMARK_VARIANTS[index % WATERMARK_VARIANTS.length];
  return (
    <svg className={`absolute ${v.cls} pointer-events-none`} viewBox="0 0 100 100" aria-hidden="true">
      <path d={TOOTH_SHAPES[v.shape]} fill="white" />
    </svg>
  );
}

export default function LandingFeatures() {
  return (
    <section id="features" className="relative z-10 py-12 sm:py-20 md:py-28">
      <div className="mx-auto max-w-6xl px-4 sm:px-6">
        <SectionLabel
          label="What makes teewai different"
          title="Built for your smile"
          subtitle="teewai combines dental science with AI to guide your whitening from first scan to final shine."
        />

        <div className="mt-10 sm:mt-14 grid sm:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-5">
          {features.map((f, i) => (
            <DarkRisingCard key={f.title} index={i} className="p-6 sm:p-7 group">
              <div className="absolute inset-0 radial-olo opacity-20 pointer-events-none" />
              <ToothWatermark index={i} />
              <div className="relative z-10">
                <div className="w-11 h-11 sm:w-12 sm:h-12 rounded-2xl bg-olo/15 flex items-center justify-center mb-4 group-hover:bg-olo transition-all duration-300">
                  <f.icon className="w-5 h-5 sm:w-6 sm:h-6 text-olo group-hover:text-white transition-colors" />
                </div>
                <h3 className="font-heading font-600 text-lg sm:text-xl mb-2 text-white">{f.title}</h3>
                <p className="text-sm text-white/55 leading-relaxed">{f.desc}</p>
              </div>
            </DarkRisingCard>
          ))}
        </div>
      </div>
    </section>
  );
}