import { useState } from 'react';
import Reveal from '@/components/Reveal';
import { Eye, EyeOff } from 'lucide-react';
import LivingBackground from '@/components/landing/LivingBackground';

export default function LandingRareColor() {
  const [revealed, setRevealed] = useState(false);

  return (
    <section className="relative z-10 py-16 sm:py-24 md:py-32 overflow-hidden bg-olo-deep text-white">
      <div className="absolute inset-0 grid-pattern opacity-20" />
      <LivingBackground />
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] bg-olo/20 rounded-full blur-[150px] animate-pulse-glow" />

      <div className="relative z-10 mx-auto max-w-3xl px-4 sm:px-6 text-center">
        <Reveal delay={100}>
          <h2 className="font-heading font-800 text-4xl md:text-6xl leading-tight tracking-tight text-balance mb-6">
            You are now seeing a color
            <br />
            only a few people can see
          </h2>
        </Reveal>

        <Reveal delay={200}>
          <p className="text-lg text-white/60 max-w-xl mx-auto leading-relaxed mb-10">
            This is <span className="text-olo olo-text-glow font-semibold">olo</span>, an intense, saturated teal discovered deep in the light spectrum. It exists at a frequency most screens can't reproduce faithfully. If you see it vividly, your eyes are among the rare few.
          </p>
        </Reveal>

        <Reveal delay={300}>
          <button
            onClick={() => setRevealed(!revealed)}
            className="bg-olo text-white font-semibold px-8 py-4 rounded-2xl text-lg hover:scale-105 transition-transform olo-glow-strong inline-flex items-center gap-2"
          >
            {revealed ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
            {revealed ? 'Hide the truth' : 'Reveal the truth'}
          </button>
        </Reveal>

        {revealed && (
          <div className="mt-8 max-w-lg mx-auto animate-fade-up">
            <p className="text-white/40 text-sm leading-relaxed">
              olo sits at a 174° hue with 100% saturation, a wavelength so specific that only displays with wide color gamuts render it accurately. Most people see a muted teal. You see olo.
            </p>
            <div className="mt-6 flex items-center justify-center gap-2">
              <div className="w-10 h-10 rounded-lg bg-olo olo-glow-strong" />
              <div className="w-10 h-10 rounded-lg bg-emerald-500" />
              <div className="w-10 h-10 rounded-lg bg-teal-500" />
              <div className="w-10 h-10 rounded-lg bg-cyan-500" />
            </div>
            <p className="text-white/30 text-xs mt-3">olo stands apart from every other teal</p>
          </div>
        )}
      </div>
    </section>
  );
}