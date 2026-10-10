import { Target, CalendarCheck, ShieldCheck, Trophy, Users, BarChart3, RefreshCw } from 'lucide-react';
import Teewai from '@/components/Teewai';

// Think Small (Service & Gallagher, 2017) — the Behavioural Insights Team's
// seven-step framework for achieving goals. teewai is built against all
// seven, not just the goal + feedback pair. Each step maps to a concrete
// feature in the app.
const STEPS = [
  {
    n: 1,
    name: 'Set',
    icon: Target,
    body: (
      <>
        A named VITA shade and a target week — not &ldquo;whiter teeth.&rdquo; Specific,
        difficult goals beat &ldquo;do your best&rdquo; every time (Locke &amp; Latham, 2002).
      </>
    ),
  },
  {
    n: 2,
    name: 'Plan',
    icon: CalendarCheck,
    body: (
      <>
        Daily habits, whitening methods and stain swaps — tied to your routine, not your
        willpower.
      </>
    ),
  },
  {
    n: 3,
    name: 'Commit',
    icon: ShieldCheck,
    body: (
      <>
        A visible streak with shields that protect it, and gentle reminders. Making the
        commitment visible is half the battle.
      </>
    ),
  },
  {
    n: 4,
    name: 'Reward',
    icon: Trophy,
    body: (
      <>
        Charms, ranks and milestones that fire when you actually move a shade — not just
        for opening the app.
      </>
    ),
  },
  {
    n: 5,
    name: 'Share',
    icon: Users,
    body: (
      <>
        Family plans and a leaderboard — the people who keep you honest. Social
        commitment compounds personal commitment.
      </>
    ),
  },
  {
    n: 6,
    name: 'Feedback',
    icon: BarChart3,
    body: (
      <>
        Two honest scores and named stains, every single scan. The part Bandura found
        doubles effort on its own.
      </>
    ),
  },
  {
    n: 7,
    name: 'Stick',
    icon: RefreshCw,
    body: (
      <>
        The loop: scan, see the gap shrink, adjust your approach, repeat. Then set a
        higher goal — discrepancy production starts again.
      </>
    ),
  },
];

export default function ThinkSmallFramework() {
  return (
    <div>
      <div className="max-w-2xl mb-6">
        <h3 className="font-heading font-700 text-lg sm:text-xl tracking-tight text-balance">
          The full framework, not just two of its parts
        </h3>
        <p className="mt-2 text-sm text-muted-foreground leading-relaxed text-balance">
          <em>Think Small</em> (Service &amp; Gallagher, 2017) distils decades of behavioural
          science into seven steps. <Teewai /> is built against all seven — not just goal and
          feedback, but the commitment, reward and sharing structures that make them stick.
        </p>
      </div>
      <div className="grid gap-2.5 sm:grid-cols-2 lg:grid-cols-4">
        {STEPS.map(({ n, name, icon: Icon, body }) => (
          <div
            key={name}
            className="rounded-2xl p-4 border border-border bg-card/60 frost-edge flex flex-col"
          >
            <div className="flex items-center gap-2.5 mb-2.5">
              <div className="w-8 h-8 rounded-lg bg-olo/10 flex items-center justify-center flex-shrink-0">
                <Icon className="w-4 h-4 text-olo" />
              </div>
              <div className="flex items-baseline gap-1.5">
                <span className="text-[10px] font-semibold text-muted-foreground/60 tabular-nums">
                  0{n}
                </span>
                <span className="font-heading font-700 text-sm uppercase tracking-wide">{name}</span>
              </div>
            </div>
            <p className="text-xs text-muted-foreground leading-relaxed">{body}</p>
          </div>
        ))}
      </div>
    </div>
  );
}