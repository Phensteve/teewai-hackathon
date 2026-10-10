import { BookOpen } from 'lucide-react';
import Teewai from '@/components/Teewai';
import GoalFeedbackPillars from '@/components/landing/GoalFeedbackPillars';

// The Bandura & Cervone (1983) finding: a goal alone, or feedback alone,
// barely moves behaviour. Together they roughly double effort. Popularised
// for a general audience in "Think Small" (Owain Service & Rory Gallagher).
//
// The proximal-milestones, full Think Small framework and the loop now live
// as a blog post (see blogArticles.js → "weekly-milestones-think-small") so
// the landing page stays short.
const CELLS = [
  { label: 'No goal, no feedback', effect: '+0%', on: false },
  { label: 'A goal, but no feedback', effect: '+26%', on: false },
  { label: 'Feedback, but no goal', effect: '+24%', on: false },
  { label: 'A goal AND feedback', effect: '+60%', on: true },
];

export default function LandingGoalFeedback() {
  return (
    <section className="relative z-10 py-16 sm:py-24 px-4 sm:px-6">
      <div className="max-w-6xl mx-auto">
        <div className="max-w-2xl">
          <h2 className="font-heading font-800 text-2xl sm:text-3xl md:text-4xl tracking-tight text-balance">
            Goals work. Feedback works. Together they work far better.
          </h2>
          <p className="mt-4 text-sm sm:text-base text-muted-foreground leading-relaxed text-balance">
            In a landmark study, Albert Bandura and Daniel Cervone found that people given a goal
            <em> and </em> regular feedback on their progress put in dramatically more effort than
            people given only one of the two. The mechanism, they showed, is
            <em> self evaluative discrepancy</em>. The gap between where you are and where you
            want to be is itself the engine. Knowing where you stand in relation to your goal is
            what keeps you going. It is the idea at the heart of <em>Think Small</em> by Owain
            Service and Rory Gallagher, and it is exactly how <Teewai /> is built.
          </p>
        </div>

        {/* The 2x2 */}
        <div className="mt-9 grid grid-cols-2 gap-2.5 sm:gap-4 max-w-2xl">
          {CELLS.map((c) => (
            <div
              key={c.label}
              className={`rounded-2xl p-4 sm:p-5 border transition-colors ${
                c.on
                  ? 'border-olo bg-olo/10 frost-edge'
                  : 'border-border bg-card/60'
              }`}
            >
              <p
                className={`font-heading font-800 text-2xl sm:text-3xl tabular-nums ${
                  c.on ? 'text-olo' : 'text-muted-foreground/50'
                }`}
              >
                {c.effect}
              </p>
              <p
                className={`mt-1.5 text-[11px] sm:text-xs leading-snug ${
                  c.on ? 'text-foreground font-semibold' : 'text-muted-foreground'
                }`}
              >
                {c.label}
              </p>
            </div>
          ))}
        </div>
        <p className="mt-3 text-[11px] text-muted-foreground/70 max-w-2xl leading-relaxed">
          Effort increase observed in Bandura &amp; Cervone (1983), <em>Journal of Personality and
          Social Psychology</em>. Figures are the study&rsquo;s, not <Teewai />&rsquo;s. The
          self evaluative discrepancy mechanism is further developed in Bandura &amp; Cervone
          (1986) and Locke &amp; Latham (2002).
        </p>

        {/* How teewai supplies both */}
        <div className="mt-10 sm:mt-14">
          <GoalFeedbackPillars />
        </div>
      </div>
    </section>
  );
}