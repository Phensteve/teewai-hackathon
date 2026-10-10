import { Link } from 'react-router-dom';
import { Camera, Gauge, TrendingUp } from 'lucide-react';
import LivingBackground from '@/components/landing/LivingBackground';
import SectionLabel from '@/components/landing/SectionLabel';
import DarkRisingCard from '@/components/landing/DarkRisingCard';
import EnamelCanvas from '@/components/landing/EnamelCanvas';

const steps = [
  {
    icon: Camera,
    title: 'Snap a photo',
    desc: 'Open teewai and take a photo of your teeth. Good lighting is all you need. For the best shade match, hold a VITA shade guide or a white index card next to your teeth.',
    link: '/reference-material',
    linkText: 'why we need this',
    enamel: 'incisor',
  },
  {
    icon: Gauge,
    title: 'See your scores',
    desc: 'teewai gives you a whiteness score from 0 to 100, your closest VITA shade, a breakdown of any stains, and a read on your gum and enamel health.',
    enamel: 'premolar',
  },
  {
    icon: TrendingUp,
    title: 'Follow your plan',
    desc: 'Get whitening methods picked for your teeth. Track your shade across scans. teewai tells you when to retake so you can see the difference.',
    enamel: 'molar',
  },
];

export default function LandingHowItWorks() {
  return (
    <section id="how" className="relative z-10 py-12 sm:py-20 md:py-28 bg-olo-deep text-white overflow-hidden">
      <div className="absolute inset-0 grid-pattern opacity-20" />
      <LivingBackground />
      <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[600px] h-[400px] bg-olo/20 rounded-full blur-[140px]" />

      <div className="relative z-10 mx-auto max-w-5xl px-4 sm:px-6">
        <SectionLabel
          onDark
          label="How it works"
          title="Three steps to a brighter smile"
          subtitle="From snapshot to shade to plan — teewai does the science, you do the smiling."
        />

        <div className="mt-10 sm:mt-14 flex flex-col gap-5 sm:gap-7">
          {steps.map((s, i) => {
            const Icon = s.icon;
            const flip = i % 2 === 1; // alternate enamel side on desktop
            return (
              <DarkRisingCard key={s.title} index={i} className="p-0">
                <div className="grid grid-cols-1 md:grid-cols-2">
                  {/* Enamel 3D slot */}
                  <div className={`relative h-44 sm:h-56 md:h-72 ${flip ? 'md:order-2' : ''}`}>
                    <EnamelCanvas variant={s.enamel} />
                    <div className="absolute inset-0 pointer-events-none" style={{ background: 'linear-gradient(to bottom, transparent 60%, hsl(var(--olo-deep)))' }} />
                  </div>
                  {/* Copy slot */}
                  <div className={`relative p-6 sm:p-8 md:p-10 flex flex-col justify-center ${flip ? 'md:order-1' : ''}`}>
                    <div className="flex items-center gap-3 mb-3">
                      <span className="w-10 h-10 rounded-xl bg-olo/15 flex items-center justify-center">
                        <Icon className="w-5 h-5 text-olo" />
                      </span>
                      <span className="text-label text-olo/70">{`Step ${i + 1}`}</span>
                    </div>
                    <h3 className="font-heading font-700 text-xl sm:text-2xl mb-2.5">{s.title}</h3>
                    <p className="text-white/65 leading-relaxed text-sm sm:text-base">{s.desc}</p>
                    {s.link && (
                      <Link to={s.link} className="inline-flex items-center gap-1 mt-4 text-sm text-olo hover:text-olo-glow transition-colors w-fit">
                        {s.linkText} →
                      </Link>
                    )}
                  </div>
                </div>
              </DarkRisingCard>
            );
          })}
        </div>
      </div>
    </section>
  );
}