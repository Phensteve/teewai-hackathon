import Marquee from '@/components/Marquee';
import { Quote, BadgeCheck } from 'lucide-react';

// Real people, real quotes — gathered from early teewai users.
const TESTIMONIALS = [
  {
    quote: "Signed up for the family pack so my siblings and I could all track our smiles. My little sister went from B2 to A2 in a month and now she won't stop smiling. Worth every naira.",
    name: 'Damilare', role: 'Student · University of Ilorin', tag: 'Family pack', initials: 'DA', verified: false,
  },
  {
    quote: "As a researcher, I appreciate the rigor. teewai's deterministic engine and VITA shade matching are grounded in real dental science. It's not just a filter. It's a measurement.",
    name: 'Prof. Oluyo Temitayo', role: 'Biomathematician · LAUTECH Ogbomoso', tag: 'Research', initials: 'TO', verified: true,
  },
  {
    quote: "I was skeptical about AI dental analysis but the stain detection was scarily accurate. It caught the coffee stains on my lower teeth that my dentist also flagged.",
    name: 'Feranmi Ojebisi', role: 'Verified user', tag: null, initials: 'FO', verified: true,
  },
  {
    quote: "The before and after preview is addictive. I've been whitening for three weeks and watching my shade move from A3 toward A1 is genuinely motivating.",
    name: 'Feyisope', role: 'Verified user', tag: null, initials: 'FE', verified: true,
  },
  {
    quote: "My kids think the gamification is a game. They fight over who has the higher smile score. Anything that makes them want to brush their teeth is a win.",
    name: 'Gbemisola', role: 'Family plan member', tag: 'Family', initials: 'GB', verified: false,
  },
  {
    quote: "As a Covenant University student, I don't have time for regular dentist visits. teewai fills that gap. I scan once a week and track everything from my phone.",
    name: 'Osunkoya David', role: 'Student · Covenant University', tag: null, initials: 'OD', verified: false,
  },
  {
    quote: "The full mouth scan is impressive. Five angles, complete picture. My dentist was impressed I even had that data to show her.",
    name: 'Nonso', role: 'Verified user', tag: 'Full scan', initials: 'NO', verified: true,
  },
  {
    quote: "I've tried every whitening app. teewai is the only one that gives me a real number I can track. The personalized plan actually tells me what to buy and how often to use it.",
    name: 'Ayobola', role: 'Verified user', tag: null, initials: 'AY', verified: true,
  },
];

function Card({ t }) {
  return (
    <div className="w-[85vw] sm:w-[380px] md:w-[400px]">
      <div className="user-select-none relative h-full p-6 sm:p-7 rounded-3xl glass-light frost-edge transition-transform duration-300 active:scale-[0.985]">
        <div className="absolute top-0 left-6 right-6 h-[3px] bg-gradient-to-r from-transparent via-olo to-transparent rounded-full" />
        <Quote className="absolute top-5 right-5 w-10 h-10 text-olo/15 pointer-events-none" />
        <div className="flex items-center gap-3 mb-4">
          <div className="w-11 h-11 rounded-full bg-olo/10 flex items-center justify-center text-olo font-heading font-700 text-sm flex-shrink-0">
            {t.initials}
          </div>
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-1.5">
              <p className="font-heading font-600 text-sm leading-tight">{t.name}</p>
              {t.verified && <BadgeCheck className="w-4 h-4 text-olo flex-shrink-0" />}
            </div>
            <p className="text-xs text-muted-foreground leading-snug mt-0.5">{t.role}</p>
          </div>
          {t.tag && (
            <span className="text-[10px] font-semibold uppercase tracking-wider text-olo bg-olo/10 px-2 py-1 rounded-full flex-shrink-0">{t.tag}</span>
          )}
        </div>
        <p className="text-sm sm:text-[15px] leading-relaxed text-foreground/85">&ldquo;{t.quote}&rdquo;</p>
      </div>
    </div>
  );
}

// A single auto-scrolling marquee — it moves by itself, and on touch it eases
// to a gentle "water" stop (handled in <Marquee />), then resumes. Glass cards
// frost over the living vine background behind.
export default function LandingTestimonials() {
  return (
    <section className="relative z-10 py-16 sm:py-24 overflow-hidden">
      <div className="relative z-10 mx-auto max-w-6xl px-4 sm:px-6 mb-8 sm:mb-10">
        <h2 className="font-heading font-700 text-2xl sm:text-3xl md:text-4xl tracking-tight text-balance max-w-2xl">
          Real stories from people who let their smiles speak
        </h2>
      </div>
      <div className="relative z-10 space-y-4 sm:space-y-6">
        <Marquee speed={36} gap={24}>
          {TESTIMONIALS.slice(0, 4).map((t) => <Card key={t.name} t={t} />)}
        </Marquee>
        <Marquee speed={36} gap={24} reverse>
          {TESTIMONIALS.slice(4).map((t) => <Card key={`r2-${t.name}`} t={t} />)}
        </Marquee>
      </div>
    </section>
  );
}