import { useState, useEffect, useMemo } from 'react';
import { Link } from 'react-router-dom';
import { stainLogs } from '@/lib/insforgeDb';
import { useAllScans } from '@/hooks/use-scans';
import * as sim from '@/lib/stainSimulation';
import { useAuth } from '@/lib/AuthContext';
import { buildSeries, globalYDomain, PRESETS, GUEST_PRESETS } from '@/lib/trendAggregation';
import { findBaselineScan, getBaselineType, IDEAL_SCORE } from '@/lib/baseline';
import TrendGraph from '@/components/shadetracker/TrendGraph';
import MilestoneChips from '@/components/shadetracker/MilestoneChips';
import MealWaterPrompt from '@/components/shadetracker/MealWaterPrompt';
import { Palette, Droplet, Check, Coffee, ArrowRight, Camera, Brush, Lock, Maximize2 } from 'lucide-react';
import ExpandableGraph from '@/components/shadetracker/ExpandableGraph';
import PageSkeleton from '@/components/loading/PageSkeleton';
import ScanImage from '@/components/ScanImage';
import { useToast } from '@/components/ui/use-toast';

function timeAgo(ts) {
  const diff = Date.now() - ts;
  if (diff < 60000) return 'just now';
  if (diff < 3600000) return `${Math.floor(diff / 60000)}m ago`;
  if (diff < 86400000) return `${Math.floor(diff / 3600000)}h ago`;
  return `${Math.floor(diff / 86400000)}d ago`;
}

function ScanCard({ scan }) {
  const date = new Date(scan.created_date);
  return (
    <div className="p-4 rounded-2xl border-2 border-olo/30 bg-olo/5">
      <div className="flex items-center gap-4">
        <ScanImage url={scan.image_url} alt="Scan" className="w-14 h-14 rounded-xl object-cover flex-shrink-0" />
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-olo" />
            <p className="font-heading font-700 text-sm">Real scan</p>
            <span className="text-xs text-muted-foreground">
              {date.toLocaleDateString(undefined, { month: 'short', day: 'numeric' })}
            </span>
          </div>
          <div className="flex items-center gap-4 mt-1">
            <span className="text-lg font-heading font-700 text-olo">{scan.shade || '—'}</span>
            <span className="text-sm text-muted-foreground">Score {scan.score ?? '—'}</span>
            {scan.shade_code && <span className="text-xs text-muted-foreground">{scan.shade_code}</span>}
          </div>
        </div>
        <Link to={`/results/${scan.id}`} className="text-xs text-olo hover:underline flex-shrink-0">View</Link>
      </div>
    </div>
  );
}

function EventRow({ event }) {
  const { type, data } = event;
  const icon = type === 'stain' ? Coffee : type === 'brush' ? Check : type === 'water' ? Droplet : type === 'mouthwash' ? Brush : Camera;
  const Icon = icon;
  const color = type === 'stain' ? 'text-amber-500' : type === 'brush' ? 'text-olo' : type === 'water' ? 'text-blue-400' : type === 'mouthwash' ? 'text-teal-500' : 'text-muted-foreground';

  let label = '';
  let detail = '';
  if (type === 'stain') {
    label = data.foodName || 'Food logged';
    detail = `${data.stainLevel} stain`;
    if (data.hasWater) detail += ' (with water)';
  } else if (type === 'brush') {
    label = 'Brushed teeth';
    detail = 'Estimate restored to your last scan';
  } else if (type === 'water') {
    label = data.fromMealWater ? 'Rinsed with meal water' : 'Drank water';
    detail = data.mitigated > 0 ? `Mitigated ${data.mitigated.toFixed(1)} pts` : 'No recent stain to mitigate';
  } else if (type === 'mouthwash') {
    label = 'Used mouthwash';
    detail = data.mitigated > 0 ? `Mitigated ${data.mitigated.toFixed(1)} pts` : 'No recent stain to mitigate';
  } else if (type === 'scan_reset') {
    label = 'New scan reset';
    detail = `Shade set to ${data.shade || 'measured'}`;
  }

  return (
    <div className="flex items-center gap-3 pl-4 py-2">
      <div className="w-7 h-7 rounded-full bg-muted/40 flex items-center justify-center flex-shrink-0">
        <Icon className={`w-3.5 h-3.5 ${color}`} />
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-sm font-medium truncate">{label}</p>
        <p className="text-xs text-muted-foreground">{detail}</p>
      </div>
      <span className="text-[10px] text-muted-foreground/60 flex-shrink-0">{timeAgo(data.timestamp)}</span>
    </div>
  );
}

export default function ShadeTracker() {
  const { user, isAuthenticated } = useAuth();
  const scansQuery = useAllScans({ enabled: !!user?.id });
  const scans = scansQuery.data || [];
  const loading = scansQuery.isPending;
  const [estimate, setEstimate] = useState(null);
  const [actions, setActions] = useState([]);
  const [preset, setPreset] = useState('week');
  const [pendingMealWater, setPendingMealWater] = useState(null);
  const [expanded, setExpanded] = useState(false);
  const { toast } = useToast();

  useEffect(() => {
    if (scansQuery.isPending) return;
    const scanList = scansQuery.data || [];
    if (scanList[0]) sim.setAnchor(scanList[0]);
    setEstimate(sim.getLiveEstimate());
    setActions(sim.getActionLog());
    setPendingMealWater(sim.getPendingMealWater());
  }, [scansQuery.data, scansQuery.isPending]);

  const isGuest = !isAuthenticated;
  const allowedPresets = isGuest ? GUEST_PRESETS : PRESETS.map(p => p.id);
  const effectivePreset = allowedPresets.includes(preset) ? preset : 'week';

  const now = useMemo(() => Date.now(), []);
  const series = useMemo(() => buildSeries(scans, effectivePreset, new Date(now)), [scans, effectivePreset]);
  const yDomain = useMemo(() => globalYDomain(scans), [scans]);
  const xDomain = useMemo(() => series.length ? [series[0].t, now] : [now - 86400000, now], [series]);
  const extrapolations = useMemo(() => sim.getExtrapolations(), [actions]);

  const baselineScore = useMemo(() => {
    if (getBaselineType(user) === 'ideal') return IDEAL_SCORE;
    const bScan = findBaselineScan(scans, user?.baseline_scan_id);
    return bScan?.score ?? null;
  }, [user, scans]);

  const daysSinceLastScan = scans[0] ? Math.floor((now - new Date(scans[0].created_date).getTime()) / 86400000) : 0;

  const refresh = () => {
    setEstimate(sim.getLiveEstimate());
    setActions(sim.getActionLog());
    setPendingMealWater(sim.getPendingMealWater());
  };

  const logProtective = async (name, level) => {
    try {
      await stainLogs.create({ item_name: name, category: 'protective', stain_level: level, log_date: new Date().toISOString().slice(0, 10), source: 'custom' });
    } catch {}
  };

  const handleBrush = () => { sim.brushTeeth(); refresh(); logProtective('Brushed teeth', -30); toast({ title: 'Brushed', description: 'Your shade estimate is restored to your last scan.' }); };
  const handleWater = () => { sim.drinkWater(); refresh(); logProtective('Drank water', -15); toast({ title: 'Water logged', description: 'A rinse can reduce the impact of your most recent stain.' }); };
  const handleMouthwash = () => { sim.useMouthwash(); refresh(); logProtective('Used mouthwash', -20); toast({ title: 'Mouthwash logged', description: 'A slightly stronger rinse to lift your most recent stain.' }); };
  const handleMealWater = (rinsed) => {
    sim.resolveMealWater(rinsed);
    refresh();
    toast(rinsed
      ? { title: 'Rinse logged', description: 'We added a rinse estimate to your trend.' }
      : { title: 'Logged', description: 'The water in your meal dilutes that stain.' });
  };

  const timeline = useMemo(() => {
    const events = [];
    scans.forEach(s => events.push({ type: 'scan', date: new Date(s.created_date).getTime(), data: s }));
    const latestScanTime = scans[0] ? new Date(scans[0].created_date).getTime() : 0;
    actions.forEach(a => { if (a.timestamp >= latestScanTime) events.push({ type: a.type, date: a.timestamp, data: a }); });
    events.sort((a, b) => b.date - a.date);
    return events;
  }, [scans, actions]);

  if (loading) return <PageSkeleton title="Shade tracker" className="max-w-2xl" />;

  return (
    <div className="max-w-2xl mx-auto">
      <Link to="/dashboard" className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-olo transition-colors mb-5">
        <ArrowRight className="w-4 h-4 rotate-180" /> Back to dashboard
      </Link>

      <div className="flex items-center gap-3 mb-2">
        <div className="w-11 h-11 rounded-2xl bg-olo/10 flex items-center justify-center">
          <Palette className="w-6 h-6 text-olo" />
        </div>
        <div>
          <h1 className="font-heading font-700 text-2xl tracking-tight">Shade tracker</h1>
          <p className="text-sm text-muted-foreground">Your shade over time, with live estimates between scans.</p>
        </div>
      </div>

      {scans.length === 0 ? (
        <div className="mt-8 p-6 rounded-3xl border border-border bg-card text-center">
          <Palette className="w-10 h-10 text-muted-foreground mx-auto mb-3" />
          <p className="text-sm text-muted-foreground">Take a scan to start tracking your shade over time.</p>
          <Link to="/scan" className="mt-4 inline-flex items-center gap-2 bg-olo text-white font-semibold px-5 py-2.5 rounded-xl text-sm olo-glow">
            Take a scan <ArrowRight className="w-4 h-4" />
          </Link>
        </div>
      ) : (
        <>
          {/* Trend graph */}
          <div className="mt-6 p-5 rounded-3xl border border-border bg-card">
            <div className="flex items-center justify-between mb-4">
              <h2 className="font-heading font-600 text-lg">Shade trend</h2>
              <div className="flex items-center gap-2">
                <span className="text-[10px] text-muted-foreground/60">Illustrative estimate</span>
                <button
                  onClick={() => setExpanded(true)}
                  className="w-7 h-7 rounded-lg border border-border bg-card flex items-center justify-center text-muted-foreground hover:text-olo hover:border-olo/40 transition-colors"
                  aria-label="Expand graph"
                >
                  <Maximize2 className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>

            {!isGuest && <div className="mb-4"><MilestoneChips scans={scans} /></div>}

            {/* Period presets */}
            <div className="flex gap-1.5 overflow-x-auto no-scrollbar pb-1 mb-4">
              {PRESETS.map(p => {
                const locked = !allowedPresets.includes(p.id);
                const active = effectivePreset === p.id;
                return (
                  <button
                    key={p.id}
                    onClick={() => !locked && setPreset(p.id)}
                    disabled={locked}
                    className={`flex-shrink-0 inline-flex items-center gap-1 px-3 py-1.5 rounded-full text-xs font-medium transition-colors ${active ? 'bg-olo text-white' : locked ? 'bg-muted/40 text-muted-foreground/60' : 'bg-muted/60 text-foreground/70 hover:bg-muted'}`}
                  >
                    {locked && <Lock className="w-3 h-3" />}
                    {p.label}
                  </button>
                );
              })}
            </div>

            <TrendGraph
              series={series}
              xDomain={xDomain}
              yDomain={yDomain}
              baselineScore={baselineScore}
              extrapolations={extrapolations}
              presetId={effectivePreset}
            />

            {baselineScore != null && (
              <p className="mt-2 text-[11px] text-muted-foreground/70 flex items-center gap-1.5">
                <span className="w-3 h-0.5 rounded-full bg-olo/50" style={{ borderTop: '1px dashed' }} />
                Your baseline reference
              </p>
            )}

            {isGuest && (
              <div className="mt-4 p-4 rounded-2xl border border-olo/20 bg-olo/5 text-center">
                <Lock className="w-5 h-5 text-olo mx-auto mb-2" />
                <p className="text-sm font-medium">Log in to unlock your full trend</p>
                <p className="text-xs text-muted-foreground mb-3">See your shade over months and years, with milestones and projections.</p>
                <Link to="/login?returnTo=/shade-tracker" className="inline-flex items-center gap-1.5 bg-olo text-white text-sm font-semibold px-4 py-2 rounded-lg">
                  Log in <ArrowRight className="w-3.5 h-3.5" />
                </Link>
              </div>
            )}
          </div>

          {/* Stale data nudge */}
          {!isGuest && daysSinceLastScan >= 4 && (
            <div className="mt-3 p-3 rounded-2xl border border-border bg-muted/30 text-sm text-muted-foreground flex items-center justify-between gap-3">
              <span>Your last scan was {daysSinceLastScan} days ago. See where you stand.</span>
              <Link to="/scan" className="flex-shrink-0 inline-flex items-center gap-1 text-olo font-medium hover:underline">Scan <ArrowRight className="w-3.5 h-3.5" /></Link>
            </div>
          )}

          {/* Live estimate + actions */}
          {estimate && (
            <div className="mt-6 p-5 rounded-3xl border border-border bg-card">
              <div className="flex items-center justify-between mb-4">
                <span className="text-sm font-medium text-muted-foreground">Current shade estimate</span>
                <span className="text-[10px] text-muted-foreground/60">Illustrative estimate</span>
              </div>

              <div className="grid grid-cols-2 gap-3 mb-4">
                <div className="p-3 rounded-2xl bg-muted/40">
                  <p className="text-xs text-muted-foreground uppercase tracking-wider">Last scan</p>
                  <p className="text-2xl font-heading font-700 text-olo mt-1">{estimate.anchorShade || '—'}</p>
                  <p className="text-xs text-muted-foreground mt-0.5">Score {estimate.anchorScore}</p>
                </div>
                <div className="p-3 rounded-2xl bg-olo/5 border border-olo/20">
                  <p className="text-xs text-muted-foreground uppercase tracking-wider">Estimated now</p>
                  <p className="text-2xl font-heading font-700 text-olo mt-1">{estimate.estimate || estimate.anchorScore}</p>
                  <p className="text-xs text-muted-foreground mt-0.5">
                    {estimate.degradation > 0 ? `${estimate.degradation.toFixed(1)} pts from stain` : 'No stain accumulated'}
                  </p>
                </div>
              </div>

              <p className="text-xs text-muted-foreground mb-3">
                Estimated shade until your next scan. A new scan resets this to your real shade.
              </p>

              {pendingMealWater && (
                <MealWaterPrompt foodName={pendingMealWater.foodName} onAnswer={handleMealWater} />
              )}

              <div className="flex gap-2.5 mt-3">
                <button onClick={handleBrush} className="flex-1 inline-flex items-center justify-center gap-2 bg-olo/10 border border-olo/20 text-olo text-sm font-semibold py-2.5 rounded-xl active:scale-95 transition-transform">
                  <Check className="w-4 h-4" /> I just brushed
                </button>
                <button onClick={handleWater} className="flex-1 inline-flex items-center justify-center gap-2 bg-olo/10 border border-olo/20 text-olo text-sm font-semibold py-2.5 rounded-xl active:scale-95 transition-transform">
                  <Droplet className="w-4 h-4" /> Water
                </button>
                <button onClick={handleMouthwash} className="flex-1 inline-flex items-center justify-center gap-2 bg-olo/10 border border-olo/20 text-olo text-sm font-semibold py-2.5 rounded-xl active:scale-95 transition-transform">
                  <Brush className="w-4 h-4" /> Mouthwash
                </button>
              </div>
            </div>
          )}

          {/* Timeline */}
          <div className="mt-6">
            <h2 className="font-heading font-600 text-lg mb-4">Shade timeline</h2>
            <div className="space-y-3">
              {timeline.map((event, i) => {
                if (event.type === 'scan') return <ScanCard key={`scan-${event.data.id}`} scan={event.data} />;
                return <EventRow key={`evt-${i}`} event={event} />;
              })}
            </div>
          </div>

          <Link to="/stain-tracker" className="mt-6 flex items-center gap-3 p-4 rounded-2xl border border-border bg-card hover:border-olo/40 transition-colors group">
            <div className="w-10 h-10 rounded-xl bg-olo/10 flex items-center justify-center flex-shrink-0">
              <Coffee className="w-5 h-5 text-olo" />
            </div>
            <div className="flex-1">
              <p className="font-heading font-600 text-sm">Food stain tracker</p>
              <p className="text-xs text-muted-foreground">See how your food and drinks affect your stain load.</p>
            </div>
            <ArrowRight className="w-4 h-4 text-olo group-hover:translate-x-1 transition-transform" />
          </Link>

          <div className="mt-4 p-3 rounded-xl bg-amber-500/10 border border-amber-500/20 text-amber-600 dark:text-amber-400 text-xs text-center">
            Shade estimates are illustrative. Your real shade comes from a 90 second scan. Log foods with "Count it on my smile" to see how they affect your estimate.
          </div>
        </>
      )}

      <ExpandableGraph
        open={expanded}
        onClose={() => setExpanded(false)}
        series={series}
        xDomain={xDomain}
        yDomain={yDomain}
        baselineScore={baselineScore}
        extrapolations={extrapolations}
        presetId={effectivePreset}
      />
    </div>
  );
}