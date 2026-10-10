import { Link } from 'react-router-dom';
import { Palette, Lightbulb, Camera, ShieldCheck, ExternalLink, CreditCard } from 'lucide-react';
import Reveal from '@/components/Reveal';
import BackButton from '@/components/BackButton';
import VitaShadeGuide from '@/components/VitaShadeGuide';
import useDocumentMeta from '@/hooks/use-document-meta';

export default function ReferenceMaterial() {
  useDocumentMeta({
    title: 'Color Reference Material',
    description: 'Why a white index card or VITA shade tab next to your teeth is the secret to accurate, honest AI color analysis — and how to position it.',
    path: '/reference-material',
  });
  return (
    <div className="min-h-screen bg-background safe-area-inset-top">
      {/* Hero */}
      <section className="relative bg-olo-deep text-white py-20 px-4 overflow-hidden">
        <div className="absolute inset-0 grid-pattern opacity-20" />
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[500px] h-[300px] bg-olo/20 rounded-full blur-[120px]" />
        <div className="relative z-10 max-w-3xl mx-auto text-center">
          <div className="w-16 h-16 rounded-2xl bg-olo flex items-center justify-center mx-auto mb-6 olo-glow">
            <Palette className="w-8 h-8 text-white" />
          </div>
          <h1 className="font-heading font-800 text-3xl sm:text-4xl md:text-5xl tracking-tight text-balance">
            Why we need a <span className="text-olo olo-text-glow">reference</span>
          </h1>
          <p className="mt-5 text-base sm:text-lg text-white/60 max-w-xl mx-auto leading-relaxed text-balance">
            A small white card or shade tab next to your teeth is the secret to accurate, honest color analysis. Here's the science.
          </p>
        </div>
      </section>

      {/* Content */}
      <div className="max-w-3xl mx-auto px-4 sm:px-6 py-12 sm:py-16">
        <BackButton compact label="Back" className="mb-8" />

        <Reveal>
          <div className="prose prose-lg max-w-none">
            <h2 className="font-heading font-700 text-2xl mb-4">The problem with photos</h2>
            <p className="text-muted-foreground leading-relaxed mb-6">
              Every phone camera renders color differently. Your lighting changes from room to room, morning to night.
              A photo taken under warm bathroom lights makes teeth look yellower than they are; cool daylight makes them look whiter.
              Without a fixed reference point, any AI — no matter how smart — is just guessing.
            </p>
          </div>
        </Reveal>

        <Reveal>
          <h2 className="font-heading font-700 text-2xl mb-4 mt-10">An example</h2>
          <figure className="my-6 rounded-3xl overflow-hidden border border-border bg-card">
            <img
              src="https://media.base44.com/images/public/6a6611b97d7894c19d798137/e7e817657_generated_image.png"
              alt="Smile with a white index card and VITA shade guide held beside the teeth for color calibration"
              className="w-full object-cover"
            />
            <figcaption className="px-5 py-4 text-sm text-muted-foreground leading-relaxed">
              A plain <strong className="text-foreground">white index card</strong> and a{' '}
              <strong className="text-foreground">VITA shade guide</strong> held next to the teeth, lit by the same light.
              teewai compares your teeth to this known white reference to calibrate color precisely — the same technique
              dentists use in-office.
            </figcaption>
          </figure>
        </Reveal>

        <Reveal>
          <h2 className="font-heading font-700 text-2xl mb-4 mt-10">The VITA shade guide, decoded</h2>
          <VitaShadeGuide />
        </Reveal>

        <Reveal>
          <div className="my-8 p-6 rounded-3xl border border-olo/20 bg-olo/5">
            <div className="flex items-start gap-4">
              <div className="w-12 h-12 rounded-xl bg-olo flex items-center justify-center flex-shrink-0 olo-glow">
                <Lightbulb className="w-6 h-6 text-white" />
              </div>
              <div>
                <h3 className="font-heading font-600 text-lg mb-2">The reference solves it</h3>
                <p className="text-muted-foreground leading-relaxed">
                  A white index card or VITA shade tab has a <strong className="text-foreground">known, fixed color</strong>.
                  When teewai sees it next to your teeth in the same lighting, it can calibrate: "this white card looks slightly warm in this light,
                  so I'll adjust the teeth readings by the same amount." This is the same technique dentists use with shade guides in their offices.
                </p>
              </div>
            </div>
          </div>
        </Reveal>

        <Reveal>
          <h2 className="font-heading font-700 text-2xl mb-4 mt-10">What you can use</h2>
          <div className="space-y-4">
            {[
              {
                icon: Palette,
                title: 'VITA Classical shade guide',
                desc: 'The gold standard. A plastic tab with labeled shade tabs (A1–D4) that dentists use. If you have one, hold it next to your teeth.',
              },
              {
                icon: Camera,
                title: 'Plain white index card',
                desc: 'A simple white card or piece of white paper works great. It gives teewai a known white reference to calibrate against.',
              },
              {
                icon: ShieldCheck,
                title: 'White coffee filter or napkin',
                desc: 'In a pinch, any bright white, unprinted material works. The key is that it is uniformly white and in the same lighting as your teeth.',
              },
            ].map((item, i) => (
              <div key={i} className="p-5 rounded-2xl border border-border bg-card flex items-start gap-4">
                <div className="w-10 h-10 rounded-xl bg-olo/10 flex items-center justify-center flex-shrink-0">
                  <item.icon className="w-5 h-5 text-olo" />
                </div>
                <div>
                  <h3 className="font-heading font-600 text-base mb-1">{item.title}</h3>
                  <p className="text-sm text-muted-foreground leading-relaxed">{item.desc}</p>
                </div>
              </div>
            ))}
          </div>
        </Reveal>

        <Reveal>
          <div className="my-10 p-6 rounded-3xl bg-olo-deep text-white">
            <div className="flex items-center gap-2 mb-4">
              <Palette className="w-5 h-5 text-olo" />
              <h3 className="font-heading font-600 text-lg">How to position it</h3>
            </div>
            <ol className="space-y-3 text-white/70">
              <li className="flex gap-3"><span className="text-olo font-bold">1.</span> Hold the reference material next to your teeth, in the same frame.</li>
              <li className="flex gap-3"><span className="text-olo font-bold">2.</span> Make sure both your teeth and the reference share the same lighting — no shadows on either.</li>
              <li className="flex gap-3"><span className="text-olo font-bold">3.</span> Face a window or use even indoor lighting. Avoid mixed light (e.g. window + lamp).</li>
              <li className="flex gap-3"><span className="text-olo font-bold">4.</span> Smile naturally and snap. teewai handles the rest.</li>
            </ol>
          </div>
        </Reveal>

        <Reveal>
          <div className="p-5 rounded-2xl border border-amber-500/20 bg-amber-500/5 flex items-start gap-3">
            <ShieldCheck className="w-5 h-5 text-amber-500 flex-shrink-0 mt-0.5" />
            <p className="text-sm text-muted-foreground">
              <strong className="text-foreground">Without a reference</strong>, teewai can still analyze your teeth — but scores may shift between scans
              taken in different lighting. The reference keeps every scan comparable, so your progress chart is honest.
            </p>
          </div>
        </Reveal>

        <Reveal>
          <div className="my-10 p-6 rounded-3xl border border-olo/30 bg-gradient-to-br from-olo/8 to-card">
            <div className="flex items-start gap-4">
              <div className="w-12 h-12 rounded-xl bg-olo flex items-center justify-center flex-shrink-0 olo-glow">
                <CreditCard className="w-6 h-6 text-white" />
              </div>
              <div className="flex-1">
                <div className="flex items-center gap-2 mb-1">
                  <h3 className="font-heading font-700 text-lg">Get the teewai calibration card</h3>
                  <span className="text-[10px] font-bold text-amber-600 bg-amber-500/10 px-2 py-0.5 rounded-full uppercase tracking-wide">Coming soon</span>
                </div>
                <p className="text-sm text-muted-foreground leading-relaxed mb-4">
                  A physical, mail-delivered white reference card standardizes lighting across <em>any</em> phone —
                  so every scan is calibrated to the same truth, no matter the device. It's the one accuracy moat
                  a software-only app can't copy.
                </p>
                <span className="inline-flex items-center gap-2 bg-muted text-muted-foreground/60 font-semibold px-5 py-2.5 rounded-xl text-sm cursor-not-allowed">
                  Request your free card
                </span>
              </div>
            </div>
          </div>
        </Reveal>

        <div className="mt-10 text-center">
          <Link
            to="/scan"
            className="inline-flex items-center gap-2 bg-olo text-white font-semibold px-8 py-3.5 rounded-xl hover:scale-105 transition-transform olo-glow"
          >
            <Camera className="w-5 h-5" /> Scan with reference
          </Link>
        </div>
      </div>
    </div>
  );
}