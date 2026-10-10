import { useRef, useState, useEffect } from 'react';
import { motion, useScroll, useTransform } from 'framer-motion';

// Real people, real quotes — gathered from early teewai users.
const VOICES = [
  { quote: "Signed up for the family pack so my siblings and I could track our smiles. My little sister went from B2 to A2 in a month.", name: 'Damilare', role: 'Unilorin · Family pack' },
  { quote: "As a researcher, I appreciate the rigor. The VITA shade matching is grounded in real dental science — it's a measurement, not a filter.", name: 'Prof. Oluyo Temitayo', role: 'Biomathematician · LAUTECH' },
  { quote: "The stain detection was scarily accurate. It caught the coffee stains my dentist also flagged.", name: 'Feranmi Ojebisi', role: 'Early user' },
  { quote: "Watching my shade move from A3 toward A1 over three weeks is genuinely motivating.", name: 'Feyisope', role: 'Early user' },
  { quote: "My kids think the gamification is a game. They fight over who has the higher smile score.", name: 'Gbemisola', role: 'Family plan' },
  { quote: "I scan once a week and track everything from my phone. Fills the gap between dentist visits.", name: 'Osunkoya David', role: 'Covenant University' },
  { quote: "The full-mouth scan is next level. Five angles, complete picture. My dentist was impressed.", name: 'Nonso', role: 'Early user' },
  { quote: "The only whitening app that gives me a real number I can track. The plan tells me exactly what to buy.", name: 'Ayobola', role: 'Early user' },
];

// Nonchalant: scattered rotations + vertical offsets so the rows feel
// thrown-together, not grid-perfect.
const ROTATIONS = ['rotate-[-2deg]', 'rotate-[1.5deg]', 'rotate-[-1deg]', 'rotate-[2deg]', 'rotate-[-1.5deg]', 'rotate-[1deg]', 'rotate-[-2.5deg]', 'rotate-[1.5deg]'];
const OFFSETS = ['mt-0', 'mt-8', 'mt-2', 'mt-10', 'mt-0', 'mt-6', 'mt-2', 'mt-8'];

function Card({ v, i }) {
  return (
    <div className={`flex-shrink-0 w-[78vw] sm:w-[340px] ${ROTATIONS[i % ROTATIONS.length]} ${OFFSETS[i % OFFSETS.length]}`}>
      <div className="relative p-6 sm:p-7 rounded-2xl border border-white/10 bg-white/[0.03] backdrop-blur-sm">
        <span className="absolute -top-4 left-5 text-5xl font-serif text-[#5eead4]/30 leading-none select-none">&ldquo;</span>
        <p className="font-heading font-300 text-lg sm:text-2xl leading-snug text-white/85 tracking-tight">{v.quote}</p>
        <div className="mt-5 flex items-center gap-2.5">
          <div className="w-7 h-7 rounded-full bg-[#0d9f8e]/20 flex items-center justify-center text-[#5eead4] text-[10px] font-heading font-600">
            {v.name.charAt(0)}
          </div>
          <div>
            <p className="text-sm text-white/70 font-medium">{v.name}</p>
            <p className="text-[11px] text-white/40">{v.role}</p>
          </div>
        </div>
      </div>
    </div>
  );
}

export default function HomeTestVoices() {
  const sectionRef = useRef(null);
  const track1Ref = useRef(null);
  const track2Ref = useRef(null);
  const [d1, setD1] = useState(0);
  const [d2, setD2] = useState(0);

  useEffect(() => {
    const calc = () => {
      const vw = window.innerWidth;
      if (track1Ref.current) setD1(Math.max(0, track1Ref.current.scrollWidth - vw));
      if (track2Ref.current) setD2(Math.max(0, track2Ref.current.scrollWidth - vw));
    };
    calc();
    window.addEventListener('resize', calc);
    const t = setTimeout(calc, 400);
    return () => { window.removeEventListener('resize', calc); clearTimeout(t); };
  }, []);

  const distance = Math.max(d1, d2);
  const { scrollYProgress } = useScroll({ target: sectionRef, offset: ['start start', 'end end'] });
  // Row 1 pans left; row 2 pans right — a nonchalant serpentine ring
  const x1 = useTransform(scrollYProgress, [0, 1], [0, -d1]);
  const x2 = useTransform(scrollYProgress, [0, 1], [-d2, 0]);

  return (
    <section ref={sectionRef} className="relative" style={{ height: `calc(100vh + ${distance}px)` }}>
      <div className="sticky top-0 h-screen flex flex-col justify-center overflow-hidden">
        {/* Heading */}
        <div className="px-4 mb-8 max-w-5xl mx-auto w-full">
          <span className="text-[11px] uppercase tracking-[0.2em] text-[#2dd4bf] font-semibold">voices</span>
          <h2 className="font-heading font-300 text-3xl sm:text-5xl tracking-tight mt-3 max-w-xl">
            people are <span className="font-600 text-[#5eead4]">talking</span>
          </h2>
          <p className="text-sm text-white/50 leading-relaxed font-light max-w-md mt-4">
            Not testimonials. Just things people said, mostly unprompted. They drift sideways as you scroll.
          </p>
        </div>

        {/* Row 1 — drifts left */}
        <motion.div ref={track1Ref} style={{ x: x1 }} className="flex gap-8 sm:gap-10 px-4 sm:px-10 will-change-transform items-start mb-4">
          {VOICES.slice(0, 4).map((v, i) => <Card key={`r1-${v.name}`} v={v} i={i} />)}
          <div className="flex-shrink-0 w-6 sm:w-10" />
        </motion.div>

        {/* Row 2 — drifts right (opposite direction = ring flow) */}
        <motion.div ref={track2Ref} style={{ x: x2 }} className="flex gap-8 sm:gap-10 px-4 sm:px-10 will-change-transform items-start">
          {VOICES.slice(4).map((v, i) => <Card key={`r2-${v.name}`} v={v} i={i + 4} />)}
          <div className="flex-shrink-0 w-6 sm:w-10" />
        </motion.div>

        {/* Lazy progress */}
        <div className="px-4 mt-8 max-w-5xl mx-auto w-full">
          <div className="h-px bg-white/10 rounded-full overflow-hidden">
            <motion.div style={{ scaleX: scrollYProgress }} className="h-full bg-[#5eead4] origin-left rounded-full" />
          </div>
        </div>
      </div>
    </section>
  );
}