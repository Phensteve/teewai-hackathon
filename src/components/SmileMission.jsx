import { Compass, Check, ArrowRight, Crown } from 'lucide-react';
import { Link } from 'react-router-dom';
import { getCurrentMission, getExperiencePhase, PHASES, getEndgameTitle, getCompletedMissions } from '@/lib/gamification';

// CD1: Epic Meaning & Calling — Yu-kai Chou's #1 Core Drive for long-term loyalty.
// Gives users a narrative purpose bigger than themselves: not "scan your teeth"
// but "you are on a quest to master your smile, and your journey inspires others."
export default function SmileMission({ stats }) {
  const phase = getExperiencePhase(stats);
  const phaseInfo = PHASES[phase];
  const mission = getCurrentMission(stats);
  const completed = getCompletedMissions(stats);
  const endgameTitle = getEndgameTitle(stats.mmr);
  const isEndgame = phase === 'endgame' && endgameTitle;

  return (
    <div className="space-y-4">
      {/* Endgame title — veteran status (CD1 + CD5) */}
      {isEndgame && (
        <div className="p-5 rounded-3xl border border-olo/30 bg-gradient-to-br from-olo-deep to-olo-deep/60 text-white relative overflow-hidden">
          <div className="absolute -top-8 -right-8 w-32 h-32 bg-olo/15 rounded-full blur-3xl" />
          <div className="relative z-10 flex items-start gap-4">
            <div className="w-12 h-12 rounded-2xl bg-olo/20 flex items-center justify-center flex-shrink-0 olo-glow">
              <Crown className="w-6 h-6 text-olo" />
            </div>
            <div>
              <p className="text-xs text-olo font-medium uppercase tracking-wider mb-0.5">Endgame Title</p>
              <h3 className="font-heading font-700 text-lg">{endgameTitle.title}</h3>
              <p className="text-white/70 text-sm mt-1">{endgameTitle.desc}</p>
              {endgameTitle.privileges?.includes('mentor_eligible') && (
                <p className="text-xs text-olo/80 mt-2 flex items-center gap-1.5">
                  <Check className="w-3 h-3" /> Mentor status unlocked
                </p>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Current Smile Mission — the "calling" (CD1) */}
      <div className="p-5 sm:p-6 rounded-3xl border border-border bg-card relative overflow-hidden">
        <div className="absolute -top-6 -right-6 w-24 h-24 bg-olo/5 rounded-full blur-2xl" />
        <div className="relative z-10">
          <div className="flex items-center gap-2 mb-1">
            <span className="text-[10px] font-bold text-olo bg-olo/10 px-2 py-0.5 rounded-full uppercase tracking-wider">
              {phaseInfo.label} Phase
            </span>
            <span className="text-[10px] text-muted-foreground">{completed.length}/{completed.length + 1} missions</span>
          </div>

          <div className="flex items-start gap-3 mt-3">
            <div className="w-10 h-10 rounded-xl bg-olo/10 flex items-center justify-center flex-shrink-0">
              <Compass className="w-5 h-5 text-olo" />
            </div>
            <div className="flex-1">
              <h3 className="font-heading font-700 text-base mb-1">{mission.title}</h3>
              <p className="text-sm text-muted-foreground leading-relaxed">{mission.narrative}</p>
            </div>
          </div>

          {/* Quest progress bar */}
          <div className="mt-4 p-3 rounded-2xl bg-muted/50">
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs font-medium text-foreground">Current quest</span>
              <span className="text-xs text-muted-foreground">Reward: {mission.reward}</span>
            </div>
            <p className="text-sm font-medium mb-2">{mission.quest}</p>
            <div className="h-1.5 rounded-full bg-muted overflow-hidden">
              <div
                className="h-full rounded-full bg-olo transition-all duration-700"
                style={{ width: `${mission.check(stats) ? 100 : Math.min(90, (completed.length / (completed.length + 1)) * 100)}%` }}
              />
            </div>
          </div>

          {mission.check(stats) ? (
            <div className="mt-3 flex items-center gap-2 text-sm text-emerald-500 font-medium">
              <Check className="w-4 h-4" /> Mission complete!
            </div>
          ) : (
            <Link
              to="/scan"
              className="mt-4 inline-flex items-center gap-2 text-sm font-semibold text-olo hover:gap-3 transition-all"
            >
              Continue your quest <ArrowRight className="w-4 h-4" />
            </Link>
          )}
        </div>
      </div>
    </div>
  );
}