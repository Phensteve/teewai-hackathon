import { useState, useEffect, useMemo, useRef } from 'react';
import PageSkeleton from '@/components/loading/PageSkeleton';
import { useParams, useNavigate, useSearchParams, Link } from 'react-router-dom';
import { useQueryClient } from '@tanstack/react-query';
import {
  scans as insforgeScans,
  deleteScan,
} from '@/lib/insforgeDb';
import {
  ArrowLeft,
  AlertCircle,
  RotateCcw,
  PartyPopper,
  Loader2,
  X,
  Brush,
  TrendingUp,
  ScanLine,
} from 'lucide-react';
import ResultsSection from '@/components/results/ResultsSection';
import FullExamTab from '@/components/results/FullExamTab';
import { playConfetti } from '@/lib/sounds';
import ToothMeshOverlay from '@/components/ToothMeshOverlay';
import ScoreCircle from '@/components/ScoreCircle';
import ResultsTabBar from '@/components/results/ResultsTabBar';
import ResultsHeader from '@/components/results/ResultsHeader';
import OverviewTab from '@/components/results/OverviewTab';
import SmileTab from '@/components/results/SmileTab';
import HealthTab from '@/components/results/HealthTab';
import PlanTab from '@/components/results/PlanTab';
import {
  resolveGumSeverity,
  resolvePlaqueSeverity,
  resolveEnamelSeverity,
  diversifyImpacts,
  diversifyTiers,
  buildMockupArch,
} from '@/lib/unrufldteeth';
import EngineInsights from '@/components/EngineInsights';
import ShareReportCard from '@/components/ShareReportCard';
import ScanImage from '@/components/ScanImage';
import { useScanPhoto } from '@/hooks/use-scan-photo';
import { teethScanAccuracy, accuracyRank } from '@/lib/scanAccuracy';
import ErrorBoundary from '@/components/ErrorBoundary';
import BaselineSummaryCard from '@/components/baseline/BaselineSummaryCard';
import ColorCorrectingNotice from '@/components/purplestrip/ColorCorrectingNotice';
import {
  ensureBaseline,
  findBaselineScan,
  setBaseline,
  oldestEligibleScan,
  findPreviousScan,
} from '@/lib/baseline';
import WhatChangedCard from '@/components/results/WhatChangedCard';
import InstantDelta from '@/components/results/InstantDelta';
import FoodAttributionCard from '@/components/results/FoodAttributionCard';
import { attributeFoodShift } from '@/lib/foodAttribution';
import * as sim from '@/lib/stainSimulation';
import { markReferralScanned } from '@/lib/referral';
import { useRoutine } from '@/hooks/use-routine';
import RoutinePrompt from '@/components/routine/RoutinePrompt';
import { shadeIndex } from '@/lib/vitaShade';

// Plain-language shade distance: "Your front teeth are a B2 — 2 shades from
// your target A1." Makes the whiteness score instantly actionable instead of
// a bare number.
function shadeDistanceLine(scan) {
  const cur = scan.shade_code || scan.shade;
  const tgt = scan.whitening_potential_shade_code || scan.whitening_potential_shade;
  if (!cur || !tgt) return null;
  const ci = shadeIndex(cur);
  const ti = shadeIndex(tgt);
  if (ci < 0 || ti < 0) return null;
  const steps = Math.abs(ci - ti);
  if (steps === 0) return `You're already at your target shade (${cur}).`;
  return `Your front teeth are a ${cur} — ${steps} shade${steps === 1 ? '' : 's'} from your target ${tgt}.`;
}

// React Query hooks (cached, deduped, stale-while-revalidate).
import { useScan, SCAN_KEY } from '@/hooks/use-scan';
import { useUserProfile } from '@/hooks/use-user-profile';
import { useSubscription } from '@/hooks/use-subscription';
import { useAllScans, SCANS_KEY, ALL_SCANS_KEY } from '@/hooks/use-scans';
import { useStainLogs } from '@/hooks/use-stain-logs';

const ACCENT_TONE = {
  success: 'bg-success-soft text-success',
  olo: 'bg-olo/10 text-olo',
  warning: 'bg-warning-soft text-warning',
  danger: 'bg-danger-soft text-danger',
};

const APPLIANCE_LABELS = {
  metal_braces: 'metal braces',
  ceramic_braces: 'ceramic braces',
  lingual_braces: 'lingual braces',
  clear_aligners: 'clear aligners',
  hawley_retainer: 'Hawley retainer',
  clear_retainer: 'clear retainer',
  fixed_retainer: 'fixed retainer',
};

const HEALTH_COLOR = 'hsl(var(--success))';
const healthTiers = [
  { min: 90, label: 'Excellent' },
  { min: 75, label: 'Good' },
  { min: 55, label: 'Fair' },
  { min: 35, label: 'Poor' },
];

export default function Results() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const isFirst = searchParams.get('first') === '1';
  const queryClient = useQueryClient();

  // --- Server state via React Query ---
  const scanQuery = useScan(id);
  const profileQuery = useUserProfile();
  const allScansQuery = useAllScans();
  const subscriptionQuery = useSubscription();
  const stainLogsQuery = useStainLogs();

  const scan = scanQuery.data || null;
  const me = profileQuery.data || null;
  const allScans = allScansQuery.data; // undefined until loaded
  const subscription = subscriptionQuery.data || null;
  const stainLogList = stainLogsQuery.data || [];

  // --- Dental routine (post-scan prompt) ---
  const { routine: activeRoutine, generate: generateRoutine, generating: routineGenerating } = useRoutine(
    me?.id, scan, stainLogList, me?.appliance_type || 'none'
  );
  const [routinePromptDismissed, setRoutinePromptDismissed] = useState(false);

  // --- Local UI state ---
  const tabTopRef = useRef(null);
  const [mockupView, setMockupView] = useState('health');
  // Full scans open on the full-mouth exam; quick scans on the overview.
  const [tab, setTab] = useState('exam');
  const [polling, setPolling] = useState(false);
  const [applianceType, setApplianceType] = useState('none');
  const [userName, setUserName] = useState('');
  const [aiExpanded, setAiExpanded] = useState(false);
  const [baselineScan, setBaselineScan] = useState(null);
  const [baselineType, setBaselineType] = useState('scan');
  const [previousScan, setPreviousScan] = useState(null);
  const [deleteError, setDeleteError] = useState(false);
  const { src: photoSrc } = useScanPhoto(scan?.image_url);

  const isUnlimited = useMemo(
    () => !!subscription && ['pro', 'pro_yearly', 'pro_weekly', 'family_pro'].includes(subscription.plan),
    [subscription]
  );

  // --- Referral scan-completion hook ---
  // When the user views a completed scan, check if they were referred and
  // mark the referral as "scanned" so the referrer earns their reward.
  const referralCheckedRef = useRef(false);
  useEffect(() => {
    if (referralCheckedRef.current || !me?.id || !scan) return;
    if (scan.status !== 'completed') return;
    referralCheckedRef.current = true;
    markReferralScanned(me.id).catch(() => {});
  }, [me?.id, scan]);

  // --- Baseline computation (one-time, once profile + scan list are loaded) ---
  const baselineDoneRef = useRef(false);
  useEffect(() => {
    if (baselineDoneRef.current || !me || !allScans) return;
    baselineDoneRef.current = true;
    let cancelled = false;
    (async () => {
      if (me.appliance_type) setApplianceType(me.appliance_type);
      setUserName(me.full_name || me.username || me.display_name || '');

      let bId = me.baseline_scan_id;
      if (!bId && allScans.length > 0) bId = await ensureBaseline(me, allScans);
      let bScan = findBaselineScan(allScans, bId);
      if (bId && !bScan && allScans.length > 0) {
        const oldest = oldestEligibleScan(allScans);
        if (oldest) {
          bId = oldest.id;
          await setBaseline(bId, oldest.created_date);
          bScan = oldest;
        }
      }
      if (!cancelled) {
        setBaselineScan(bScan);
        setBaselineType(me.baseline_type === 'ideal' ? 'ideal' : 'scan');
        setPreviousScan(findPreviousScan(allScans, id));
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [me, allScans, id]);

  // --- First-scan celebration confetti ---
  useEffect(() => {
    if (!isFirst) return;
    const colors = ['#00d9c0', '#1de9b6', '#ffffff', '#5eead4'];
    const timers = [];
    timers.push(
      setTimeout(async () => {
        playConfetti();
        const { default: confetti } = await import('canvas-confetti');
        confetti({ particleCount: 120, spread: 100, origin: { y: 0.5 }, colors });
        timers.push(
          setTimeout(
            () =>
              confetti({ particleCount: 60, angle: 60, spread: 70, origin: { x: 0 }, colors }),
            250
          )
        );
        timers.push(
          setTimeout(
            () =>
              confetti({ particleCount: 60, angle: 120, spread: 70, origin: { x: 1 }, colors }),
            450
          )
        );
        timers.push(
          setTimeout(
            () => confetti({ particleCount: 80, spread: 120, origin: { y: 0.4 }, colors }),
            700
          )
        );
      }, 600)
    );
    return () => timers.forEach(clearTimeout);
  }, [isFirst]);

  // --- Auto-poll a scan that's still "analyzing" ---
  useEffect(() => {
    if (scan?.status !== 'analyzing') return;
    setPolling(true);
    const start = Date.now();
    const interval = setInterval(async () => {
      if (Date.now() - start > 150000) {
        clearInterval(interval);
        setPolling(false);
        return;
      }
      try {
        const s = await insforgeScans.get(id);
        if (s && s.status === 'completed') {
          queryClient.setQueryData(SCAN_KEY(id), s);
          setPolling(false);
          clearInterval(interval);
          sim.resetOnNewScan(s);
        }
      } catch {
        /* keep polling */
      }
    }, 5000);
    return () => clearInterval(interval);
  }, [scan?.status, id, queryClient]);

  // --- Food attribution ---
  const foodAttribution = useMemo(() => {
    if (!scan || !previousScan || stainLogList.length === 0) return null;
    const prevTime = new Date(previousScan.created_date).getTime();
    const currTime = new Date(scan.created_date).getTime();
    const simActions = sim.getActionsInRange(prevTime, currTime);
    return attributeFoodShift(scan, previousScan, stainLogList, simActions);
  }, [scan, previousScan, stainLogList]);

  // Scroll to the top of the tab content when switching tabs, so each tab
  // starts fresh instead of inheriting the previous tab's scroll position.
  useEffect(() => {
    if (!tabTopRef.current) return;
    const rect = tabTopRef.current.getBoundingClientRect();
    const target = window.scrollY + rect.top - 80;
    if (window.scrollY > target + 10) {
      window.scrollTo({ top: Math.max(0, target), behavior: 'smooth' });
    }
  }, [tab]);

  const handleDelete = async () => {
    try {
      await deleteScan(id);
      queryClient.invalidateQueries({ queryKey: SCANS_KEY });
      queryClient.invalidateQueries({ queryKey: ALL_SCANS_KEY });
      navigate('/dashboard');
    } catch (e) {
      setDeleteError(true);
    }
  };

  const handleRetry = () => {
    setDeleteError(false);
    queryClient.invalidateQueries({ queryKey: SCAN_KEY(id) });
  };

  // --- Loading / error / not-found states ---
  if (scanQuery.isLoading) return <PageSkeleton />;

  if (deleteError || (scanQuery.isError && !scan)) {
    return (
      <div className="max-w-md mx-auto text-center py-16 px-4">
        <div className="w-14 h-14 rounded-2xl bg-danger-soft flex items-center justify-center mx-auto mb-4">
          <AlertCircle className="w-7 h-7 text-danger" />
        </div>
        <h2 className="font-heading font-700 text-xl mb-2">We couldn't open this scan</h2>
        <p className="text-sm text-muted-foreground mb-4">
          Your scan is safe — this is usually a connection hiccup. Try again, or open your scans from
          My Scans.
        </p>
        <div className="flex items-center justify-center gap-3">
          <button
            onClick={handleRetry}
            className="inline-flex items-center gap-2 bg-olo text-white font-semibold px-5 py-2.5 rounded-xl text-sm hover:scale-105 transition-transform olo-glow"
          >
            <RotateCcw className="w-4 h-4" /> Try again
          </button>
          <Link
            to="/my-scans"
            className="inline-flex items-center gap-2 border border-border font-medium px-5 py-2.5 rounded-xl text-sm hover:bg-accent transition-colors"
          >
            Go to My Scans
          </Link>
        </div>
      </div>
    );
  }

  if (!scan) {
    return (
      <div className="text-center py-16">
        <p className="text-caption text-muted-foreground">Scan not found.</p>
        <Link to="/dashboard" className="text-olo font-medium text-caption mt-4 inline-block">
          Back to dashboard
        </Link>
      </div>
    );
  }

  if (scan.status === 'analyzing') {
    return (
      <div className="max-w-lg mx-auto text-center py-20">
        <span className="icon-tool mx-auto mb-4">
          <Loader2 className="animate-spin" />
        </span>
        <h1 className="text-h2 mb-2">Still analyzing…</h1>
        <p className="text-caption text-muted-foreground mb-4">
          Your scan is still processing in the background. This page will update automatically when
          it's ready.
        </p>
        {polling ? (
          <p className="text-label text-muted-foreground flex items-center justify-center gap-1.5">
            <Loader2 className="w-3.5 h-3.5 animate-spin" /> Checking…
          </p>
        ) : (
          <div className="flex items-center justify-center gap-3">
            <button
              onClick={handleRetry}
              className="inline-flex items-center gap-2 bg-olo text-white font-semibold px-5 py-2.5 rounded-xl text-caption hover:scale-105 transition-transform"
            >
              <RotateCcw className="w-4 h-4" /> Check again
            </button>
            <Link to="/my-scans" className="text-olo font-medium text-caption">
              Back to My Scans
            </Link>
          </div>
        )}
      </div>
    );
  }

  const forecast = Math.min(100, Math.round((scan.score || 0) + 8));
  const isFullScan = scan.scan_type === 'full';
  const gumSev = resolveGumSeverity(scan);
  const plaqueSev = resolvePlaqueSeverity(scan);
  const enamelSev = resolveEnamelSeverity(scan);
  const recs = diversifyImpacts(scan.recommendations || []);
  const products = diversifyTiers(scan.products || []);
  const mockupTeeth = buildMockupArch(scan.tooth_analysis, mockupView);

  return (
    <div className="max-w-6xl mx-auto pb-24 md:pb-12">
      <ResultsHeader onBack={() => navigate('/dashboard')} onDelete={handleDelete} />

      {/* First scan celebration */}
      {isFirst && (
        <div className="mb-4 p-5 rounded-3xl bg-olo-deep text-white text-center relative overflow-hidden animate-fade-up">
          <div className="absolute inset-0 radial-olo opacity-50" />
          <div className="relative z-10">
            <PartyPopper className="w-8 h-8 text-olo mx-auto mb-2" />
            <h3 className="text-h2 mb-1">Your first scan! 🎉</h3>
            <p className="text-white/70 text-caption max-w-md mx-auto">
              You're on your way to a brighter smile. Keep scanning to track your progress.
            </p>
          </div>
        </div>
      )}

      {/* Score hero — symmetric whiteness + health cards */}
      <div className="grid grid-cols-2 gap-3 mb-4">
        <div className="relative p-4 rounded-2xl border border-olo/20 bg-gradient-to-br from-olo/8 to-card flex items-center gap-3 overflow-hidden">
          <div className="absolute -top-8 -right-8 w-24 h-24 bg-olo/10 rounded-full blur-2xl pointer-events-none" />
          <ScoreCircle score={scan.score} size={76} />
          <div className="min-w-0 relative flex-1">
            <p className="text-label text-muted-foreground">Whiteness</p>
            <p className="font-heading font-700 text-base sm:text-lg text-olo leading-tight truncate tabular-nums">
              {scan.shade || '—'}
            </p>
            {shadeDistanceLine(scan) ? (
              <p className="text-[11px] text-muted-foreground mt-0.5 leading-snug line-clamp-2">{shadeDistanceLine(scan)}</p>
            ) : (
              <p className="text-[11px] text-muted-foreground mt-0.5 leading-snug">Shade reading</p>
            )}
            {scan.score != null && (
              <div className="mt-1.5 h-1 rounded-full bg-muted overflow-hidden">
                <div
                  className="h-full rounded-full bg-olo transition-all duration-1000"
                  style={{ width: `${Math.max(3, Math.min(100, scan.score))}%` }}
                />
              </div>
            )}
          </div>
        </div>
        <div className="relative p-4 rounded-2xl border border-success/20 bg-gradient-to-br from-success/8 to-card flex items-center gap-3 overflow-hidden">
          <div className="absolute -top-8 -right-8 w-24 h-24 bg-success/10 rounded-full blur-2xl pointer-events-none" />
          <ScoreCircle score={scan.dental_health_score} size={76} color={HEALTH_COLOR} tiers={healthTiers} />
          <div className="min-w-0 relative flex-1">
            <p className="text-label text-muted-foreground">Health</p>
            <p className="font-heading font-700 text-base sm:text-lg text-success leading-tight capitalize truncate tabular-nums">
              {scan.gum_health || '—'}
            </p>
            <p className="text-[11px] text-muted-foreground mt-0.5 leading-snug line-clamp-2 capitalize">
              {scan.enamel_condition ? `${scan.enamel_condition} enamel` : 'Gums & enamel'}
            </p>
            {scan.dental_health_score != null && (
              <div className="mt-1.5 h-1 rounded-full bg-muted overflow-hidden">
                <div
                  className="h-full rounded-full bg-success transition-all duration-1000"
                  style={{ width: `${Math.max(3, Math.min(100, scan.dental_health_score))}%` }}
                />
              </div>
            )}
          </div>
        </div>
      </div>

      <ColorCorrectingNotice scan={scan} />

      {/* AI one-line summary */}
      {scan.ai_feedback && (
        <>
          <button
            onClick={() => setAiExpanded(true)}
            className="mb-4 p-3.5 rounded-2xl bg-olo-deep text-white flex items-start gap-3 w-full text-left hover:ring-1 hover:ring-olo/40 transition-all"
          >
            <span className="icon-primary olo-glow" style={{ width: '2rem', height: '2rem' }}>
              <Brush />
            </span>
            <div className="min-w-0 flex-1">
              <p className="text-caption text-white/85 leading-relaxed line-clamp-3">
                {scan.ai_feedback}
              </p>
              <span className="inline-flex items-center gap-1 mt-1.5 text-label text-olo font-medium">
                Tap to read full summary
              </span>
            </div>
          </button>

          {aiExpanded && (
            <div
              className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-fade-up"
              onClick={() => setAiExpanded(false)}
            >
              <div
                className="relative w-full max-w-lg max-h-[80vh] overflow-y-auto p-6 rounded-3xl bg-olo-deep text-white shadow-2xl olo-glow-strong"
                onClick={(e) => e.stopPropagation()}
              >
                <button
                  onClick={() => setAiExpanded(false)}
                  className="absolute top-4 right-4 w-8 h-8 rounded-full bg-white/10 hover:bg-white/20 flex items-center justify-center transition-colors"
                >
                  <X className="w-4 h-4" />
                </button>
                <div className="flex items-center gap-3 mb-4">
                  <span className="icon-primary olo-glow">
                    <Brush />
                  </span>
                  <div>
                    <h3 className="text-h3 text-olo">teewai says</h3>
                    <p className="text-caption text-white/50">Full AI summary</p>
                  </div>
                </div>
                <p className="text-body text-white/85 leading-relaxed whitespace-pre-line">
                  {scan.ai_feedback}
                </p>
              </div>
            </div>
          )}
        </>
      )}

      {/* Compact inline prompts */}
      {scan.needs_another_photo && (
        <div className="mb-4 p-3 rounded-xl border border-olo/25 bg-olo/5 flex items-start gap-2.5">
          <AlertCircle className="w-4 h-4 text-olo flex-shrink-0 mt-0.5" />
          <div className="flex-1">
            <p className="text-caption font-medium">Photo needs a retake</p>
            <p className="text-label text-muted-foreground">
              Your teeth weren't fully visible.{' '}
              <Link to="/scan" className="text-olo font-medium underline">
                Retake scan
              </Link>
            </p>
          </div>
        </div>
      )}
      {scan.reference_material_detected === false && (
        <div className="mb-4 p-3 rounded-xl border border-warning/25 bg-warning-soft flex items-start gap-2.5">
          <AlertCircle className="w-4 h-4 text-warning flex-shrink-0 mt-0.5" />
          <div className="flex-1">
            <p className="text-caption">No reference material detected</p>
            <p className="text-label text-muted-foreground">
              {scan.reference_material_note || 'Use a white index card for better color calibration.'}{' '}
              <Link to="/reference-material" className="text-olo font-medium underline">
                Learn more
              </Link>
            </p>
          </div>
        </div>
      )}

      {/* Post-scan routine prompt — the one action to take next */}
      {!routinePromptDismissed && scan?.status === 'completed' && (
        <RoutinePrompt
          scan={scan}
          routine={activeRoutine}
          onGenerate={() => generateRoutine({ scanId: scan.id })}
          onDismiss={() => setRoutinePromptDismissed(true)}
        />
      )}

      {/* Progress vs earlier scans — grouped and collapsed */}
      {(baselineScan || previousScan) && (
        <ResultsSection icon={TrendingUp} title="Your progress" subtitle="Compared with your baseline and last scan">
          <BaselineSummaryCard
            currentScan={scan}
            baselineScan={baselineScan}
            baselineType={baselineType}
            onSetBaseline={async () => {
              await setBaseline(scan.id, scan.created_date);
              setBaselineScan(scan);
              setBaselineType('scan');
            }}
          />
          {baselineScan && baselineScan.id !== scan.id && (
            <div className="mb-4">
              <InstantDelta baselineScan={baselineScan} currentScan={scan} />
            </div>
          )}
          <WhatChangedCard currentScan={scan} previousScan={previousScan} />
          <FoodAttributionCard attribution={foodAttribution} />
        </ResultsSection>
      )}

      {/* Photo, confidence and engine detail — grouped and collapsed */}
      <ResultsSection icon={ScanLine} title="Scan details" subtitle="Your photo with AI mesh, confidence and analysis notes">
        {(() => {
          const acc = teethScanAccuracy(scan);
          if (acc == null) return null;
          const rank = accuracyRank(acc);
          return (
            <div className="mb-3 flex flex-wrap items-center gap-2 text-label">
              <span className="inline-flex items-center px-2 py-1 rounded-full bg-olo/10 text-olo font-semibold tabular-nums">
                {acc}% analysis confidence
              </span>
              {rank && (
                <span className={`inline-flex items-center px-2 py-1 rounded-full font-semibold ${ACCENT_TONE[rank.tone]}`}>
                  {rank.label} read
                </span>
              )}
              {scan.scan_type === 'full' && (
                <span className="inline-flex items-center px-2 py-1 rounded-full bg-olo/10 text-olo font-semibold">Full mouth · 5 angles</span>
              )}
              {applianceType && applianceType !== 'none' && (
                <span className="inline-flex items-center px-2 py-1 rounded-full bg-olo/10 text-olo font-semibold">
                  Tailored for {APPLIANCE_LABELS[applianceType] || 'your appliance'}
                </span>
              )}
            </div>
          );
        })()}
        <div className="mb-3">
          {photoSrc ? (
            <ToothMeshOverlay src={photoSrc} smileBbox={scan.smile_bbox} className="rounded-2xl border border-border bg-olo-deep" />
          ) : (
            <div className="h-48 rounded-2xl bg-olo-deep/40 animate-pulse" />
          )}
        </div>
        <EngineInsights scan={scan} />
      </ResultsSection>

      {/* Tabs + content */}
      <div className="flex gap-6">
        <aside className="hidden md:block w-60 shrink-0">
          <ResultsTabBar tab={tab} setTab={setTab} vertical isFull={isFullScan} />
        </aside>
        <div className="flex-1 min-w-0">
          <div ref={tabTopRef} />
          <ResultsTabBar tab={tab} setTab={setTab} isFull={isFullScan} />
          <ErrorBoundary compact key={tab}>
            {tab === 'exam' && isFullScan && <FullExamTab scan={scan} />}
            {(tab === 'overview' || (tab === 'exam' && !isFullScan)) && <OverviewTab scan={scan} forecast={forecast} />}
            {tab === 'smile' && (
              <SmileTab
                scan={scan}
                mockupView={mockupView}
                setMockupView={setMockupView}
                mockupTeeth={mockupTeeth}
              />
            )}
            {tab === 'health' && (
              <HealthTab
                scan={scan}
                applianceType={applianceType}
                gumSev={gumSev}
                plaqueSev={plaqueSev}
                enamelSev={enamelSev}
              />
            )}
            {tab === 'plan' && (
              <PlanTab
                scan={scan}
                recs={recs}
                products={products}
                isUnlimited={isUnlimited}
                userName={userName}
              />
            )}
          </ErrorBoundary>
        </div>
      </div>

      <ShareReportCard scan={scan} userName={userName} />

      {/* Medical disclaimer */}
      <div className="mt-4 p-3 rounded-2xl bg-warning-soft border border-warning/15 text-warning text-caption text-center flex items-center justify-center gap-2">
        <AlertCircle className="w-3.5 h-3.5 flex-shrink-0" />
        <span>
          teewai is a wellness companion, not a medical device. We strongly advise you to visit your
          dentist for professional dental care.
        </span>
      </div>
    </div>
  );
}