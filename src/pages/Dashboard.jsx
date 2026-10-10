import { useState, useEffect, useMemo, useRef } from 'react';
import { useAuth } from '@/lib/AuthContext';
import { motion, AnimatePresence } from 'framer-motion';
import { useQueryClient } from '@tanstack/react-query';
import { Heart, Lightbulb, Users, Activity, TrendingUp, Trophy, History } from 'lucide-react';

// Shared React Query hooks — deduped, cached, stale-while-revalidate.
import { useScans } from '@/hooks/use-scans';
import { useSubscription, SUBSCRIPTION_KEY } from '@/hooks/use-subscription';
import { useUserProgress, PROGRESS_KEY } from '@/hooks/use-user-progress';
import { useUserProfile } from '@/hooks/use-user-profile';
import { useActiveBloom, BLOOM_KEY } from '@/hooks/use-active-bloom';
import { useTips } from '@/hooks/use-tips';

// Data services still needed for care-action writes.
import { stainLogs, userProgress } from '@/lib/insforgeDb';

// Gamification, baseline, bloom, discovery, tips, audio, payment.
import { computeMMR, computeStreak } from '@/lib/gamification';
import { ensureBaseline, findBaselineScan, setBaseline, oldestEligibleScan } from '@/lib/baseline';
import { harvestActiveBloom, shieldBloom } from '@/lib/bloom';
import { rollDiscoveryReward, recordDiscovery } from '@/lib/discoveries';
import { getDailyTip, INFO_TIPS, LIFESTYLE_TIPS, pickRandomTip } from '@/lib/dailyTips';
import { initAudio } from '@/lib/sounds';
import { FREE_SCANS } from '@/lib/payment';
import * as sim from '@/lib/stainSimulation';

// Shell + ambient dashboard components.
import PullToRefresh from '@/components/PullToRefresh';
import ErrorBoundary from '@/components/ErrorBoundary';
import ShadeEvolutionOverlay from '@/components/ShadeEvolutionOverlay';
import StreakShieldRescue from '@/components/dashboard/StreakShieldRescue';
import StreakScanReminder from '@/components/dashboard/StreakScanReminder';
import BloomCard from '@/components/bloom/BloomCard';
import InfoTipCard from '@/components/dashboard/InfoTipCard';
import DailyTipBanner from '@/components/dashboard/DailyTipBanner';
import EventCountdownCoach from '@/components/dashboard/EventCountdownCoach';
import DiscoveryReveal from '@/components/DiscoveryReveal';
import FamilyDashboard from '@/components/FamilyDashboard';
import StainRecoveryNudge from '@/components/StainRecoveryNudge';

// Decomposed dashboard sub-components.
import DashboardHeader from '@/components/dashboard/DashboardHeader';
import DashboardDataStatus from '@/components/dashboard/DashboardDataStatus';
import DashboardHeroStats from '@/components/dashboard/DashboardHeroStats';
import DashboardQuickActions from '@/components/dashboard/DashboardQuickActions';
import DashboardShortcuts from '@/components/dashboard/DashboardShortcuts';
import RoutineCard from '@/components/routine/RoutineCard';
import { useRoutine } from '@/hooks/use-routine';
import DashboardTabBar from '@/components/dashboard/DashboardTabBar';
import OverviewTab from '@/components/dashboard/tabs/OverviewTab';
import JourneyTab from '@/components/dashboard/tabs/JourneyTab';
import RankTab from '@/components/dashboard/tabs/RankTab';
import HistoryTab from '@/components/dashboard/tabs/HistoryTab';

import { useTour } from '@/lib/tourContext';
import { useToast } from '@/components/ui/use-toast';

const TABS = [
  { id: 'overview', label: 'Overview', icon: Activity },
  { id: 'journey', label: 'Journey', icon: TrendingUp },
  { id: 'rank', label: 'Rank', icon: Trophy },
  { id: 'history', label: 'History', icon: History },
];

export default function Dashboard() {
  const queryClient = useQueryClient();
  const { user: authUser } = useAuth();

  // --- Server state via React Query (cached, deduped, refetched in background) ---
  const scansQuery = useScans();
  const profileQuery = useUserProfile();
  const subscriptionQuery = useSubscription();
  const progressQuery = useUserProgress();
  const tipsQuery = useTips();

  const scans = scansQuery.data || [];
  const me = profileQuery.data || authUser || null;
  const subscription = subscriptionQuery.data || null;
  const progress = progressQuery.data || null;
  const entityTips = tipsQuery.data || [];

  // Dental routine — personalized care plan from the latest scan
  const { routine: routineData } = useRoutine(me?.id, scans[0] || null, [], me?.appliance_type || 'none');

  const bloomQuery = useActiveBloom(me?.id);
  const bloom = bloomQuery.data || null;

  // --- Local UI state (not server state) ---
  const [tab, setTab] = useState('overview');
  const [tabIndex, setTabIndex] = useState(0);
  const [direction, setDirection] = useState(0);
  const [baselineScan, setBaselineScan] = useState(null);
  const [baselineType, setBaselineType] = useState('scan');
  const [bloomReward, setBloomReward] = useState(null);

  const { start: startTour } = useTour();
  const { toast } = useToast();

  // Each section handles its own missing data; the dashboard shell never blocks.
  // Cached results remain visible even if a background refresh fails.
  const scansReady = scansQuery.data !== undefined;
  const subscriptionReady = subscriptionQuery.data !== undefined;
  const progressReady = progressQuery.data !== undefined;
  const scansLoading = !scansReady && scansQuery.isFetching;
  const progressLoading = !progressReady && progressQuery.isFetching;
  const dataQueries = [scansQuery, profileQuery, subscriptionQuery, progressQuery];
  const dataError = dataQueries.some((q) => q.isError);
  const dataRetrying = dataQueries.some((q) => q.isFetching);

  // --- Baseline computation (one-time side-effect, same logic as before) ---
  // Runs once when both profile + scans are available; writes the smart default
  // baseline if none exists, and falls back to the oldest eligible scan if the
  // stored baseline was deleted.
  const baselineDoneRef = useRef(false);
  useEffect(() => {
    if (baselineDoneRef.current || !me || scans.length === 0) return;
    baselineDoneRef.current = true;
    let cancelled = false;
    (async () => {
      let bId = me.baseline_scan_id;
      if (!bId) bId = await ensureBaseline(me, scans);
      let bScan = findBaselineScan(scans, bId);
      if (bId && !bScan && scans.length > 0) {
        const oldest = oldestEligibleScan(scans);
        if (oldest) {
          bId = oldest.id;
          await setBaseline(bId, oldest.created_date);
          bScan = oldest;
        }
      }
      if (!cancelled) {
        setBaselineScan(bScan);
        setBaselineType(me.baseline_type === 'ideal' ? 'ideal' : 'scan');
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [me, scans]);

  // --- Mount-only effects ---
  useEffect(() => {
    initAudio();
  }, []);

  // Auto-start the walkthrough for first-time users.
  useEffect(() => {
    if (!localStorage.getItem('teewai_tour_seen')) {
      const timer = setTimeout(() => {
        startTour();
        localStorage.setItem('teewai_tour_seen', '1');
      }, 1000);
      return () => clearTimeout(timer);
    }
  }, [startTour]);

  // --- Derived values ---
  const isPro = subscription?.plan === 'pro' || subscription?.plan === 'pro_yearly' || subscription?.plan === 'pro_weekly';
  const isFamily = subscription?.plan === 'family_15' || subscription?.plan === 'family_pro';
  const isFreePlan = !subscription?.plan || subscription?.plan === 'free';
  // For family plans, the sub row's scansUsed/scansLimit are the family aggregate
  // (e.g. 82 for every member). Show only the member's personal allocation so
  // each member sees their own count, not the shared family/pack pool.
  // Includes bonus_scans (gifted scans) so gifted allocations are reflected.
  // The total family plan scans (pack + all members) are shown only on the
  // Family dashboard tab, not here.
  const famMember = isFamily ? (subscription?.members?.[0] || { scans_used: 0, scans_limit: 15 }) : null;
  const famBonus = Number(famMember?.bonus_scans) || 0;
  const scansUsed = isFamily
    ? (famMember.scans_used || 0)
    : subscription?.scans_used || 0;
  const scansLimit = isPro
    ? Infinity
    : isFamily
      ? (famMember.scans_limit || 15) + famBonus
      : isFreePlan
        ? Math.max(subscription?.scans_limit || 0, FREE_SCANS)
        : subscription?.scans_limit || 0;
  const tabs = isFamily
    ? [TABS[0], { id: 'family', label: 'Family', icon: Users }, ...TABS.slice(1)]
    : TABS;

  const latest = scans[0];
  const oldest = scans[scans.length - 1];
  const streak = useMemo(() => computeStreak(scans), [scans]);
  const mmr = useMemo(() => computeMMR(scans, streak), [scans, streak]);
  const improvement = scans.length >= 2 ? (latest?.score || 0) - (oldest?.score || 0) : 0;
  const stats = useMemo(
    () => ({
      scans: scans.length,
      streak,
      mmr,
      improvement,
      latest,
      daysSinceScan: latest
        ? Math.floor((Date.now() - new Date(latest.created_date)) / 86400000)
        : 999,
    }),
    [scans, streak, mmr, improvement, latest]
  );
  const peakMmr = progress?.peak_mmr || mmr;
  const peakRank = progress?.peak_rank;
  // Daily tip sourced from the centralized dailyTips.js (LIFESTYLE_TIPS), not
  // the old hardcoded TIPS array that was removed.
  const dailyTip = useMemo(
    () => getDailyTip(LIFESTYLE_TIPS)?.body || 'Small daily habits keep your smile bright.',
    []
  );
  const healthTip = useMemo(
    () => pickRandomTip(entityTips, me?.id, 'info') || getDailyTip(INFO_TIPS),
    [entityTips, me?.id]
  );
  const adviceTip = useMemo(
    () => pickRandomTip(entityTips, me?.id, 'lifestyle') || getDailyTip(LIFESTYLE_TIPS),
    [entityTips, me?.id]
  );

  // --- Care-action handlers (optimistic query updates) ---
  const handleBrush = async () => {
    sim.brushTeeth();
    try {
      await stainLogs.create({
        item_name: 'Brushed teeth',
        category: 'protective',
        stain_level: -30,
        log_date: new Date().toISOString().slice(0, 10),
        source: 'custom',
      });
    } catch {}
    toast({
      title: 'Brushed',
      description: 'Your shade estimate is restored to your last scan.',
    });
    const hb = await harvestActiveBloom(me?.id, 'brush');
    if (hb) {
      queryClient.setQueryData(BLOOM_KEY(me?.id), hb);
      const reward = rollDiscoveryReward('bloom');
      if (reward) {
        await recordDiscovery(reward);
        setBloomReward(reward);
      }
    }
  };

  const handleWater = async () => {
    sim.drinkWater();
    try {
      await stainLogs.create({
        item_name: 'Drank water',
        category: 'protective',
        stain_level: -15,
        log_date: new Date().toISOString().slice(0, 10),
        source: 'custom',
      });
    } catch {}
    toast({ title: 'Water logged', description: 'A rinse can reduce the impact of your most recent stain.' });
    const hb = await harvestActiveBloom(me?.id, 'water');
    if (hb) {
      queryClient.setQueryData(BLOOM_KEY(me?.id), hb);
      const reward = rollDiscoveryReward('bloom');
      if (reward) {
        await recordDiscovery(reward);
        setBloomReward(reward);
      }
    }
  };

  // Use a Streak Shield to save a fading bloom. Extends the bloom's deadlines
  // and decrements the shared shield balance on UserProgress.
  const handleUseShield = async () => {
    if (!bloom || (progress?.streak_shields || 0) <= 0) return;
    const updated = await shieldBloom(bloom);
    if (!updated) return;
    queryClient.setQueryData(BLOOM_KEY(me?.id), updated);
    try {
      const next = Math.max(0, (progress.streak_shields || 0) - 1);
      if (progress?.id) await userProgress.update(progress.id, { streak_shields: next });
      queryClient.setQueryData(PROGRESS_KEY, (p) => (p ? { ...p, streak_shields: next } : p));
    } catch {}
  };

  const handleTabChange = (id, i) => {
    setDirection(i > tabIndex ? 1 : -1);
    setTabIndex(i);
    setTab(id);
  };

  const handleReload = () => queryClient.invalidateQueries();
  const handleRefresh = async () => {
    await queryClient.refetchQueries();
  };

  // --- Main render — available content stays visible during loading or errors ---
  return (
    <PullToRefresh onRefresh={handleRefresh} className="relative max-w-4xl mx-auto">
      {/* Shade Evolution — ambient glow mirrors whiteness progress */}
      <ShadeEvolutionOverlay score={latest?.score} />

      {/* Header */}
      <DashboardHeader me={me} isPro={isPro} subscriptionReady={subscriptionReady} />

      {dataError && (
        <DashboardDataStatus
          title="Some dashboard data is unavailable"
          description="Tips and tools are still available below. Retry to refresh your saved scans and progress."
          onRetry={handleReload}
          retrying={dataRetrying}
          className="mb-4"
        />
      )}

      {/* Daily dental health tip — at the top so it's the first thing you see */}
      <DailyTipBanner tip={healthTip} category="health" icon={Heart} />

      {/* Streak Shield Rescue — auto-applied shield on return after 48–72h */}
      {progressReady && <StreakShieldRescue />}

      {/* 24h streak-decay nudge */}
      <StreakScanReminder latest={latest} streak={streak} />

      {/* Enamel Bloom — the Zeigarnik open loop from your last scan.
          Hidden once the user checks "Don't show this anymore" in the sheet. */}
      <BloomCard
        bloom={bloom}
        shields={progress?.streak_shields || 0}
        onHarvest={(action) => (action === 'brush' ? handleBrush() : handleWater())}
        onUseShield={handleUseShield}
      />

      {/* Color-correcting product alert — only when the latest scan is flagged */}
      {latest?.color_correcting_product_detected && (
        <InfoTipCard userId={me?.id} latestScanFlagged={true} />
      )}

      {/* At-a-glance hero stats */}
      <DashboardHeroStats latest={latest} streak={streak} improvement={improvement} scansReady={scansReady} />

      {/* Quick CTA — compact action bar */}
      <DashboardQuickActions
        isPro={isPro}
        scansLimit={scansLimit}
        scansUsed={scansUsed}
        subscriptionReady={subscriptionReady}
        subscriptionLoading={!subscriptionReady && subscriptionQuery.isFetching}
      />

      {/* Countdown hero widget — next smile goal event */}
      <div className="mb-4">
        <EventCountdownCoach />
      </div>

      {/* Tabs — sticky so they stay visible while scrolling tab content */}
      <DashboardTabBar tabs={tabs} tab={tab} onTabChange={handleTabChange} />

      {/* Sliding tab content */}
      <ErrorBoundary compact>
        <div className="overflow-clip">
          <AnimatePresence mode="wait" custom={direction}>
            <motion.div
              key={tab}
              custom={direction}
              variants={{
                enter: (d) => ({ x: d > 0 ? 24 : -24, opacity: 0 }),
                center: { x: 0, opacity: 1 },
                exit: (d) => ({ x: d > 0 ? -24 : 24, opacity: 0 }),
              }}
              initial="enter"
              animate="center"
              exit="exit"
              transition={{ duration: 0.28, ease: [0.4, 0, 0.2, 1] }}
            >
              {tab === 'overview' && (
                <OverviewTab
                  scans={scans}
                  latest={latest}
                  baselineScan={baselineScan}
                  baselineType={baselineType}
                  onBaselineChange={(sc) => setBaselineScan(sc)}
                  onTypeChange={(t) => setBaselineType(t)}
                  stats={stats}
                  streak={streak}
                  progress={progress}
                  dailyTip={dailyTip}
                  scansReady={scansReady}
                  scansLoading={scansLoading}
                  progressReady={progressReady}
                  progressLoading={progressLoading}
                />
              )}
              {tab === 'family' && (
                <FamilyDashboard
                  subscription={subscription}
                  onUpdated={(m) =>
                    queryClient.setQueryData(SUBSCRIPTION_KEY, (s) =>
                      s ? { ...s, members: m } : s
                    )
                  }
                />
              )}
              {tab === 'journey' && (scansReady ? (
                <JourneyTab scans={scans} latest={latest} />
              ) : (
                <DashboardDataStatus
                  loading={scansLoading}
                  title={scansLoading ? 'Loading your journey' : 'Journey unavailable'}
                  description="Your progress chart will appear when your saved scans can be loaded."
                />
              ))}
              {tab === 'rank' && (scansReady && progressReady ? (
                <RankTab
                  mmr={mmr}
                  peakMmr={peakMmr}
                  peakRank={peakRank}
                  progress={progress}
                  scans={scans}
                  me={me}
                  stats={stats}
                />
              ) : (
                <DashboardDataStatus
                  loading={scansLoading || progressLoading}
                  title={scansLoading || progressLoading ? 'Loading your rank' : 'Rank unavailable'}
                  description="Your rank and milestones will appear when your saved scans and progress can be loaded."
                />
              ))}
              {tab === 'history' && (scansReady ? (
                <HistoryTab scans={scans} baselineScan={baselineScan} />
              ) : (
                <DashboardDataStatus
                  loading={scansLoading}
                  title={scansLoading ? 'Loading scan history' : 'Scan history unavailable'}
                  description="Your saved scan list is unavailable right now. This does not mean you have no scans."
                />
              ))}
            </motion.div>
          </AnimatePresence>
        </div>
      </ErrorBoundary>

      {/* Shortcuts & tools — relocated below tabs */}
      <DashboardShortcuts
        stats={stats}
        streak={streak}
        daysSinceScan={stats.daysSinceScan}
        shields={progress?.streak_shields}
        isPro={isPro}
        subscription={subscription}
        statsReady={scansReady}
        progressReady={progressReady}
      />

      {/* Dental routine — personalized care plan from the latest scan */}
      {routineData && <RoutineCard routine={routineData} />}

      {latest && (
        <div className="mb-4">
          <StainRecoveryNudge />
        </div>
      )}

      {/* Daily dental advice tip — one at the bottom, rotates daily */}
      <div className="mt-4">
        <DailyTipBanner tip={adviceTip} category="advice" icon={Lightbulb} showHistoryLink />
      </div>

      {/* Bloom-harvest discovery reveal — compact inline, never blocks the flow */}
      <DiscoveryReveal reward={bloomReward} onClose={() => setBloomReward(null)} />
    </PullToRefresh>
  );
}