import Reveal from '@/components/Reveal';
import { useState } from 'react';
import { ChevronDown } from 'lucide-react';

const faqs = [
  {
    q: 'How does teewai score my teeth?',
    a: 'teewai uses AI vision to analyze your photo against the VITA shade guide, the dental industry standard. It assesses brightness, shade, and staining to produce a 0 to 100 whiteness score in seconds.',
  },
  {
    q: 'Is my photo private?',
    a: 'Absolutely. Your scans are tied to your account and encrypted. You can delete any scan or your entire history at any time. We never share your photos.',
  },
  {
    q: 'Can teewai replace my dentist?',
    a: 'No. teewai is a wellness companion, not a medical device. It guides your cosmetic whitening. Always consult a dentist for clinical concerns.',
  },
  {
    q: 'Why might teewai ask for another photo?',
    a: 'If the image is blurry, poorly lit, or doesn’t show all your teeth (like the top arch), teewai will request a specific retake so your score is accurate.',
  },
  {
    q: 'Can I cancel my subscription anytime?',
    a: 'Yes. Pro is a simple monthly plan. Cancel with one click and you keep access until the end of your billing period.',
  },
  {
    q: 'What’s the difference between a quick scan and a full scan?',
    a: 'A quick scan uses one photo for a fast whiteness and dental health score. A full scan captures five angles (front, upper, lower, left and right) for a complete picture of your whole mouth, and costs 3 scan credits.',
  },
  {
    q: 'How accurate is the VITA shade match?',
    a: 'teewai compares your teeth to the VITA Classical A1–D4 shade guide, the same standard dentists use. For the most precise color calibration, include a VITA shade tab or a plain white index card in the frame as a reference.',
  },
  {
    q: 'Does teewai detect plaque, calculus and enamel wear?',
    a: 'Yes. teewai screens for stains, plaque, calculus, enamel erosion and early caries using validated indices like the Silness and Löe Plaque Index, BEWE erosion score and ICDAS caries grading, all from a single photo. Your dentist confirms these with a clinical exam.',
  },
  {
    q: 'Can my whole family use teewai?',
    a: 'Yes. Family plans include up to 5 members with 15 scans each per month, tracked individually in a shared family dashboard so everyone can follow their own whitening progress.',
  },
];

export default function LandingFAQ() {
  const [open, setOpen] = useState(0);
  return (
    <section className="relative z-10 py-16 sm:py-24 md:py-32">
      <div className="mx-auto max-w-3xl px-4 sm:px-6">
        <Reveal className="text-center mb-8 sm:mb-16">
          <h2 className="font-heading font-700 text-2xl sm:text-3xl md:text-4xl tracking-tight text-balance">Questions, answered</h2>
        </Reveal>
        <Reveal>
          <div className="space-y-3">
            {faqs.map((f, i) => (
              <div key={i} className="rounded-2xl border border-border bg-card overflow-hidden">
                <button
                  onClick={() => setOpen(open === i ? -1 : i)}
                  className="w-full flex items-center justify-between p-5 text-left hover:bg-olo/5 transition-colors"
                >
                  <span className="font-heading font-600 text-lg">{f.q}</span>
                  <ChevronDown className={`w-5 h-5 text-olo transition-transform ${open === i ? 'rotate-180' : ''}`} />
                </button>
                <div className={`grid transition-all duration-300 ${open === i ? 'grid-rows-[1fr]' : 'grid-rows-[0fr]'}`}>
                  <div className="overflow-hidden">
                    <p className="px-5 pb-5 text-muted-foreground leading-relaxed">{f.a}</p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </Reveal>
      </div>
    </section>
  );
}