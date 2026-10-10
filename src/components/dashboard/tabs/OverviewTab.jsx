import { Link } from 'react-router-dom';
import {
  LayoutGrid,
  Activity,
  TrendingUp,
  History,
  Trophy,
  Share2,
  ArrowRight,
  CalendarHeart,
  Gem,
} from 'lucide-react';
import ScoreCircle from '@/components/ScoreCircle';
import FirstScanEmpty from '@/components/FirstScanEmpty';
import DashboardDataStatus from '@/components/dashboard/DashboardDataStatus';
import BaselineDashboardCard from '@/components/baseline/BaselineDashboardCard';
import StatWidget from '@/components/dashboard/StatWidget';
import DashboardSection from '@/components/DashboardSection';
import VelocityMultiplier from '@/components/VelocityMultiplier';
import MicroShadeProgress from '@/components/MicroShadeProgress';
import StreakShieldStatus from '@/components/StreakShieldStatus';
import DailyQuests from '@/components/DailyQuests';
import BigEventCountdown from '@/components/BigEventCountdown';
import ToothbrushTracker from '@/components/ToothbrushTracker';
import BadgeCollection from '@/components/BadgeCollection';
import BragCard from '@/components/BragCard';
import CollectionSummary from '@/components/dashboard/CollectionSummary';

export default function OverviewTab({
  scans,
  latest,
  baselineScan,
  baselineType,
  onBaselineChange,
  onTypeChange,
  stats,
  streak,
  progress,
  dailyTip,
  scansReady = true,
  scansLoading = false,
  progressReady = true,
  progressLoading = false,
}) {
  return (
    <div className="space-y-4">
      {/* Latest scan */}
      <div className="p-5 sm:p-6 rounded-3xl border border-border bg-card frost-edge">
        {latest ? (
          <div className="flex flex-col sm:flex-row items-center gap-5">
            <ScoreCircle score={latest.score} size={130} />
            <div className="flex-1 text-center sm:text-left">
              <h3 className="text-h3 mb-1">Latest scan</h3>
              <p className="text-caption text-muted-foreground mb-1">
                Whiteness <span className="text-olo font-semibold">{latest.shade || '—'}</span>
                {latest.shade_code && (
                  <span className="text-muted-foreground"> ({latest.shade_code})</span>
                )}
              </p>
              <p className="text-caption text-muted-foreground mb-1">
                Health{' '}
                <span className="text-success font-semibold capitalize">
                  {latest.gum_health || '—'}
                </span>
              </p>
              <p className="text-caption text-muted-foreground mb-4">
                {latest.stains_detected?.length || 0} staining areas ·{' '}
                {latest.dental_health_issues?.length || 0} health notes
              </p>
              <Link
                to={`/results/${latest.id}`}
                className="inline-flex items-center gap-2 bg-olo text-white font-semibold px-5 py-2.5 rounded-xl text-caption hover:scale-105 transition-transform olo-glow"
              >
                View full results <ArrowRight className="w-4 h-4" />
              </Link>
            </div>
          </div>
        ) : !scansReady ? (
          <DashboardDataStatus
            loading={scansLoading}
            title={scansLoading ? 'Loading your scan summary' : 'Scan summary unavailable'}
            description="Your latest results will appear here when scan history is available."
          />
        ) : (
          <FirstScanEmpty />
        )}
      </div>

      {/* Baseline card */}
      {latest && (
        <BaselineDashboardCard
          scans={scans}
          baselineScan={baselineScan}
          baselineType={baselineType}
          onBaselineChange={onBaselineChange}
          onTypeChange={onTypeChange}
        />
      )}

      {/* Stat cards */}
      {latest && (
        <div className="grid grid-cols-2 gap-3">
          <StatWidget
            icon={Activity}
            value={latest.dental_health_score ?? '—'}
            label="Health"
            accent="success"
          />
          <StatWidget icon={History} value={scans.length} label="Total scans" accent="muted" />
        </div>
      )}

      {/* Progress details — velocity, micro-shade & streak shield */}
      {latest && (
        <DashboardSection
          icon={TrendingUp}
          title="Progress details"
          summary="Velocity, micro-shade progression & streak shield"
          belowTabBar
        >
          <VelocityMultiplier scans={scans} streak={streak} latest={latest} />
          <MicroShadeProgress scans={scans} />
          {progressReady && (
            <StreakShieldStatus
              streak={streak}
              shields={progress?.streak_shields}
              daysSinceScan={stats.daysSinceScan}
            />
          )}
        </DashboardSection>
      )}

      {/* Daily goals & tips — quests, countdown, brush tracker & daily tip */}
      <DashboardSection
        icon={CalendarHeart}
        title="Daily goals"
        summary="Quests & event countdown"
        belowTabBar
      >
        {scansReady && <DailyQuests stats={stats} />}
        <BigEventCountdown />
      </DashboardSection>

      {/* Toothbrush tracker — shown directly after the first scan */}
      {latest && (
        <div className="scroll-mt-[calc(7rem+env(safe-area-inset-top))] lg:scroll-mt-24">
          <ToothbrushTracker />
        </div>
      )}

      {/* Badges & sharing — badge collection & brag card */}
      {latest && (
        <DashboardSection
          icon={Trophy}
          title="Badges & sharing"
          summary="Your badge collection & brag card"
          belowTabBar
        >
          <BadgeCollection stats={stats} />
          <div>
            <div className="flex items-center gap-2 mb-3">
              <Share2 className="w-5 h-5 text-olo" />
              <h3 className="font-heading font-600 text-lg">Brag card</h3>
            </div>
            <BragCard
              score={latest.score}
              shade={latest.shade}
              shadeCode={latest.shade_code}
              healthScore={latest.dental_health_score}
            />
          </div>
        </DashboardSection>
      )}

      {/* Collection Cabinet — charms, traits & discovery XP summary */}
      <DashboardSection
        icon={Gem}
        title="Collection Cabinet"
        summary="Charms, smile traits & discoveries"
        belowTabBar
      >
        {progressReady ? <CollectionSummary /> : (
          <DashboardDataStatus
            loading={progressLoading}
            title={progressLoading ? 'Loading your collection' : 'Collection unavailable'}
            description="Your charms, traits and badges will appear when saved progress can be loaded."
          />
        )}
      </DashboardSection>
    </div>
  );
}