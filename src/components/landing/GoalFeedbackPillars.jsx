import Teewai from '@/components/Teewai';

// Three concrete panels — each shows the actual thing teewai gives you
// (a target shade, today's scores, the closing gap) rather than a generic icon.

// The goal pillar shows the single target shade + the week you reach it — the
// "name and date" of the goal — without restating the full VITA ladder. The
// weekly milestones block below carries the scale, so only one VITA scale
// appears on the page (both still agree on A1 as the target).
function TargetShadeCard() {
  return (
    <div className="flex items-center gap-3">
      <div
        className="w-14 h-14 rounded-xl border-2 border-olo ring-2 ring-olo/30 olo-glow flex-shrink-0"
        style={{ background: '#f1e9d6' }}
        aria-label="Target shade A1"
      />
      <div>
        <p className="font-heading font-800 text-2xl text-olo tabular-nums leading-none">A1</p>
        <p className="mt-1.5 text-[11px] text-muted-foreground leading-none">Target shade · week 6</p>
      </div>
    </div>
  );
}

function ScoreReadout() {
  return (
    <div className="space-y-3">
      {[
        { label: 'Whiteness', value: 78 },
        { label: 'Dental health', value: 84 },
      ].map((r) => (
        <div key={r.label}>
          <div className="flex items-baseline justify-between mb-1.5">
            <span className="text-[11px] uppercase tracking-wider text-muted-foreground">{r.label}</span>
            <span className="font-heading font-800 text-lg text-olo tabular-nums leading-none">{r.value}</span>
          </div>
          <div className="h-1.5 rounded-full bg-muted overflow-hidden">
            <div className="h-full rounded-full bg-gradient-to-r from-olo to-olo-glow" style={{ width: `${r.value}%` }} />
          </div>
        </div>
      ))}
      <div className="flex flex-wrap gap-1.5 pt-0.5">
        {['Coffee', 'Tea', 'Lower-arch plaque'].map((s) => (
          <span key={s} className="text-[10px] px-2 py-1 rounded-full bg-muted text-muted-foreground">
            {s}
          </span>
        ))}
      </div>
    </div>
  );
}

function GapMeter() {
  return (
    <div>
      <div className="flex items-baseline justify-between text-[11px] mb-2">
        <span className="text-muted-foreground">Today · A3</span>
        <span className="text-olo font-700">Target · A1</span>
      </div>
      <div className="relative h-1.5 rounded-full bg-muted">
        <div className="absolute inset-y-0 left-0 w-[45%] rounded-full bg-gradient-to-r from-olo to-olo-glow" />
        <span className="absolute top-1/2 -translate-y-1/2 left-[45%] w-3 h-3 rounded-full bg-olo ring-4 ring-background" />
      </div>
      <div className="mt-4 flex items-baseline gap-2">
        <span className="font-heading font-800 text-2xl text-foreground tabular-nums">1.5</span>
        <span className="text-xs text-muted-foreground">shades to go · about 6 weeks left</span>
      </div>
    </div>
  );
}

const PILLARS = [
  {
    kicker: 'Your goal',
    title: 'A shade with a name and a date',
    body: (
      <>
        Not &ldquo;whiter teeth&rdquo;. <Teewai /> sets the exact VITA shade your enamel can
        realistically reach, and the week you should reach it.
      </>
    ),
    Visual: TargetShadeCard,
  },
  {
    kicker: 'Your feedback',
    title: 'Two honest numbers, every scan',
    body: 'Whiteness and dental health, scored — with the stains and plaque behind them named. Nothing left to the bathroom mirror.',
    Visual: ScoreReadout,
  },
  {
    kicker: 'The gap',
    title: 'How far you still have to go',
    body: 'The distance between today and your target, redrawn after every scan. Bandura found this is the part that keeps people going.',
    Visual: GapMeter,
  },
];

export default function GoalFeedbackPillars() {
  return (
    <div className="grid gap-4 sm:gap-5 md:grid-cols-3">
      {PILLARS.map(({ kicker, title, body, Visual }) => (
        <div key={title} className="rounded-3xl p-5 sm:p-6 glass-light frost-edge flex flex-col">
          <p className="text-[10px] font-semibold uppercase tracking-[0.18em] text-olo">{kicker}</p>
          <h3 className="mt-1.5 font-heading font-700 text-lg tracking-tight leading-snug">{title}</h3>
          <div className="my-5">
            <Visual />
          </div>
          <p className="text-sm text-muted-foreground leading-relaxed mt-auto">{body}</p>
        </div>
      ))}
    </div>
  );
}