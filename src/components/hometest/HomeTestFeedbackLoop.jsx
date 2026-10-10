// A quiet, editorial aside — the Bandura & Cervone finding stated plainly,
// in the hometest voice: thin type, hairline rules, no cards or badges.
const ROWS = [
  { label: 'Neither', effect: '+0%' },
  { label: 'A goal alone', effect: '+26%' },
  { label: 'Feedback alone', effect: '+24%' },
  { label: 'A goal and feedback', effect: '+60%', on: true },
];

export default function HomeTestFeedbackLoop() {
  return (
    <section className="relative px-5 sm:px-8 py-24 sm:py-32">
      <div className="max-w-4xl mx-auto" data-reveal>
        <p className="text-[11px] uppercase tracking-[0.3em] text-white/35">A footnote we kept coming back to</p>

        <h2 className="mt-6 font-heading font-300 text-3xl sm:text-5xl tracking-tight leading-[1.12] max-w-2xl">
          Bandura and Cervone found that a goal without feedback
          <span className="text-[#5eead4] font-500"> barely moves anyone.</span>
        </h2>

        <div className="mt-10 grid gap-10 sm:grid-cols-[1fr_auto] sm:items-start">
          <div className="max-w-lg space-y-5 text-[15px] leading-relaxed text-white/55 font-light">
            <p>
              Their 1983 study gave people a target, or progress feedback, or both. Only the pairing
              produced a real jump in effort. Owain Service and Rory Gallagher retell it in
              <em> Think Small</em>: what matters is not just having a goal, but knowing where you
              stand in relation to it.
            </p>
            <p>
              We did not set out to build a motivation product. But that is what a shade score is —
              a number that tells you the distance left between the teeth you have and the teeth you
              are working toward. Every scan closes a little of that gap, or tells you honestly that
              it didn&rsquo;t.
            </p>
          </div>

          <div className="sm:w-64">
            {ROWS.map((r) => (
              <div
                key={r.label}
                className="flex items-baseline justify-between gap-6 py-3.5 border-b border-white/10"
              >
                <span className={`text-[13px] font-light ${r.on ? 'text-white' : 'text-white/40'}`}>
                  {r.label}
                </span>
                <span
                  className={`font-heading tabular-nums ${
                    r.on ? 'text-[#5eead4] text-2xl font-500' : 'text-white/25 text-lg font-300'
                  }`}
                >
                  {r.effect}
                </span>
              </div>
            ))}
            <p className="mt-3 text-[10px] leading-relaxed text-white/25">
              Effort increase reported in Bandura &amp; Cervone (1983).
            </p>
          </div>
        </div>

        {/* The three parts, stated plainly — no cards, no icons. */}
        <div className="mt-16 grid gap-10 sm:grid-cols-3 sm:gap-8">
          {[
            {
              k: 'The goal',
              v: 'A1',
              sub: 'a named VITA shade, with a date',
              body: 'Not "whiter teeth" — the exact shade your enamel can reach, and the week it should get there.',
            },
            {
              k: 'The feedback',
              v: '78 / 84',
              sub: 'whiteness · dental health',
              body: 'Two numbers each scan, with the stains and plaque behind them named. Nothing left to the mirror.',
            },
            {
              k: 'The gap',
              v: '1.5',
              sub: 'shades left · ~6 weeks',
              body: 'Redrawn after every scan. This is the part Bandura found actually keeps people going.',
            },
          ].map((c) => (
            <div key={c.k} className="border-t border-white/10 pt-5">
              <p className="text-[10px] uppercase tracking-[0.28em] text-white/35">{c.k}</p>
              <p className="mt-3 font-heading font-300 text-4xl text-[#5eead4] tabular-nums leading-none">{c.v}</p>
              <p className="mt-2 text-[11px] text-white/35">{c.sub}</p>
              <p className="mt-4 text-[14px] font-light leading-relaxed text-white/55">{c.body}</p>
            </div>
          ))}
        </div>

        <p className="mt-14 max-w-xl text-[15px] font-light leading-relaxed text-white/55">
          <span className="text-[#5eead4] font-500" style={{ textShadow: '0 0 26px rgba(94,234,212,0.55)' }}>teewai</span>{' '}
          is a loop, not a verdict: scan, see the number, watch the gap close. Whiter teeth, healthier
          gums and steadier daily care all come from the same place.
        </p>
      </div>
    </section>
  );
}