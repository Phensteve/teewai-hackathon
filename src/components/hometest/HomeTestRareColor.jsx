import { useState } from 'react';
import { Eye } from 'lucide-react';
import SmartCTA from './SmartCTA';

export default function HomeTestRareColor() {
  const [revealed, setRevealed] = useState(false);
  return (
    <section id="rare" className="relative px-4 py-24 sm:py-32 overflow-hidden" style={{ background: 'hsl(182 85% 10%)' }}>
      {/* Olo background — matching the home page rare color section */}
      <div className="absolute inset-0 grid-pattern opacity-20" />
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] rounded-full blur-[150px] animate-pulse-glow" style={{ background: 'rgba(13,159,142,0.22)' }} />
      <div className="relative z-10 max-w-3xl mx-auto text-center">
        <div data-reveal className="inline-flex items-center gap-2 px-4 py-2 rounded-full border border-[#0d9f8e]/40 bg-[#06121a]/50 backdrop-blur-md mb-8">
          <Eye className="w-4 h-4 text-[#2dd4bf]" />
          <span className="text-sm font-medium text-white/70">A rare phenomenon</span>
        </div>
        <h2 data-reveal className="font-heading font-300 text-3xl sm:text-5xl leading-tight tracking-tight mb-6">
          You are now seeing a color<br />
          <span className="font-700 text-[#5eead4]" style={{ textShadow: '0 0 60px rgba(94,234,212,0.35)' }}>only a few people can see</span>
        </h2>
        <p data-reveal className="text-base text-white/70 max-w-xl mx-auto leading-relaxed mb-10">
          This is <span className="text-[#5eead4] font-semibold">olo</span> — an intense, saturated teal discovered deep in the light spectrum. It exists at a frequency most screens can't reproduce faithfully. If you see it vividly, your eyes are among the rare few.
        </p>
        <button
          data-reveal
          onClick={() => setRevealed(!revealed)}
          className="bg-[#0d9f8e] text-white font-semibold px-8 py-4 rounded-2xl text-base hover:scale-105 transition-transform inline-flex items-center gap-2"
          style={{ boxShadow: '0 0 50px -10px rgba(13,159,142,0.6)' }}
        >
          <Eye className="w-5 h-5" />{revealed ? 'Hide the truth' : 'Reveal the truth'}
        </button>
        {revealed && (
          <div className="mt-8 max-w-lg mx-auto animate-fade-up">
            <p className="text-white/55 text-sm leading-relaxed">olo sits at a 174° hue with 100% saturation — a wavelength so specific that only displays with wide color gamuts render it accurately. Most people see a muted teal. You see olo.</p>
            <div className="mt-6 flex items-center justify-center gap-2">
              <div className="w-10 h-10 rounded-lg bg-[#0d9f8e]" style={{ boxShadow: '0 0 30px -5px rgba(13,159,142,0.8)' }} />
              <div className="w-10 h-10 rounded-lg bg-emerald-500" />
              <div className="w-10 h-10 rounded-lg bg-teal-500" />
              <div className="w-10 h-10 rounded-lg bg-cyan-500" />
            </div>
            <p className="text-white/40 text-xs mt-3">olo stands apart from every other teal</p>
          </div>
        )}
      </div>
    </section>
  );
}