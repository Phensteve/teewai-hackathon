import { useState, useEffect } from 'react';
import { useAuth } from '@/lib/AuthContext';
import { Sun, Moon, Utensils, Lock, RefreshCw, Loader2, Sparkles, Droplets } from 'lucide-react';
import { unrufld } from '@/api/unrufldClient';
import { scans as insforgeScans, stainLogs } from '@/lib/insforgeDb';
import { useRoutine } from '@/hooks/use-routine';

import { computeStreak } from '@/lib/gamification';
import RoutineStep from '@/components/routine/RoutineStep';
import RoutineReminders from '@/components/routine/RoutineReminders';
import PageSkeleton from '@/components/loading/PageSkeleton';

// Full routine page. Loads the active routine, the latest scan, and recent
// food logs. If no routine exists yet, offers to generate one from the latest
// scan. Shows morning / evening / dietary / mitigation sections with locked
// anti-recommendation steps, and an auto-modifications log.
export default function Routine() {
  const { user: ctxUser } = useAuth();
  const userId = ctxUser?.id;
  const [loadingData, setLoadingData] = useState(true);
  const [latestScan, setLatestScan] = useState(null);
  const [foodLogList, setFoodLogList] = useState([]);
  const [appliance, setAppliance] = useState('none');
  const [streak, setStreak] = useState(0);

  // Load the latest scan + food logs + appliance type
  useEffect(() => {
    let cancelled = false;
    (async () => {
      if (!userId) { setLoadingData(false); return; }
      try {
        const [scansList, logs, me] = await Promise.all([
          insforgeScans.list('-created_date', 30),
          stainLogs.list('-created_date', 50),
          unrufld.auth.me().catch(() => null),
        ]);
        if (cancelled) return;
        setLatestScan(scansList[0] || null);
        setFoodLogList(logs);
        setAppliance(me?.appliance_type || 'none');
        setStreak(computeStreak(scansList));
      } catch {}
      finally { if (!cancelled) setLoadingData(false); }
    })();
    return () => { cancelled = true; };
  }, [userId]);

  const { routine, loading, generate, generating } = useRoutine(userId, latestScan, foodLogList, appliance);

  const handleGenerate = async () => {
    await generate({ scanId: latestScan?.id });
  };

  if (loadingData || loading) {
    return <PageSkeleton title="Your daily smile routine" />;
  }

  if (!routine) {
    return (
      <div className="max-w-lg mx-auto px-4 py-10">
        <div className="text-center mb-8">
          <div className="w-16 h-16 rounded-2xl bg-olo/10 flex items-center justify-center mx-auto mb-4">
            <Sparkles className="w-7 h-7 text-olo" />
          </div>
          <h1 className="font-heading font-700 text-2xl mb-2">Your daily smile routine</h1>
          <p className="text-sm text-muted-foreground leading-relaxed">
            A personalized care plan built from your latest scan — brushing, flossing, dietary guidance,
            and stain mitigation. Locked steps protect against detected issues.
          </p>
        </div>
        {latestScan ? (
          <div className="p-5 rounded-3xl border border-olo/20 bg-gradient-to-br from-olo/8 to-card">
            <p className="text-sm font-medium mb-1">Ready to build</p>
            <p className="text-xs text-muted-foreground mb-4">
              We found your latest scan. Generate a routine tailored to its findings.
            </p>
            <button
              onClick={handleGenerate}
              disabled={generating}
              className="w-full inline-flex items-center justify-center gap-2 bg-olo text-white font-semibold py-3 rounded-xl hover:opacity-90 disabled:opacity-50 transition-opacity"
            >
              {generating ? <Loader2 className="w-4 h-4 animate-spin" /> : <RefreshCw className="w-4 h-4" />}
              Build my routine
            </button>
          </div>
        ) : (
          <div className="p-5 rounded-3xl border border-border bg-card text-center">
            <p className="text-sm text-muted-foreground">
              Take a teeth scan first — your routine is built from its findings.
            </p>
          </div>
        )}
      </div>
    );
  }

  return (
    <div className="max-w-2xl mx-auto px-4 sm:px-6 py-6 pb-24">
      {/* Header */}
      <div className="mb-6">
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            <p className="text-label text-muted-foreground uppercase tracking-wider">Dental routine</p>
            <h1 className="font-heading font-700 text-2xl tracking-tight mt-0.5">{routine.title}</h1>
          </div>
          <button
            onClick={handleGenerate}
            disabled={generating}
            className="inline-flex items-center gap-1.5 border border-olo/30 text-olo text-sm font-semibold px-3 py-2 rounded-xl hover:bg-olo/5 disabled:opacity-50 transition-colors whitespace-nowrap flex-shrink-0"
          >
            {generating ? <Loader2 className="w-4 h-4 animate-spin" /> : <RefreshCw className="w-4 h-4" />}
            Regenerate
          </button>
        </div>
        <p className="text-sm text-muted-foreground leading-relaxed mt-3">{routine.summary}</p>
        <div className="flex flex-wrap gap-2 mt-3 text-[11px]">
          <span className="inline-flex items-center gap-1 px-2 py-1 rounded-full bg-muted text-muted-foreground">
            Version {routine.version}
          </span>
          {routine.generated_date && (
            <span className="inline-flex items-center gap-1 px-2 py-1 rounded-full bg-muted text-muted-foreground">
              {new Date(routine.generated_date).toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' })}
            </span>
          )}
        </div>
      </div>

      {/* Gentle morning/evening reminders */}
      <RoutineReminders streak={streak} />

      {/* Morning */}
      <Section icon={Sun} title="Morning" tone="olo">
        <div className="space-y-2">
          {routine.morning_steps.map((s, i) => <RoutineStep key={s.id} step={s} index={i} />)}
        </div>
      </Section>

      {/* Evening */}
      <Section icon={Moon} title="Evening" tone="olo">
        <div className="space-y-2">
          {routine.evening_steps.map((s, i) => <RoutineStep key={s.id} step={s} index={i} />)}
        </div>
      </Section>

      {/* Dietary guidance */}
      {routine.dietary_guidance?.length > 0 && (
        <Section icon={Utensils} title="Dietary guidance" tone="warning">
          <div className="space-y-2">
            {routine.dietary_guidance.map((s, i) => <RoutineStep key={s.id} step={s} index={i} />)}
          </div>
        </Section>
      )}

      {/* Stain mitigation */}
      {routine.stain_mitigation?.length > 0 && (
        <Section icon={Droplets} title="Stain mitigation" tone="olo">
          <div className="space-y-2">
            {routine.stain_mitigation.map((m, i) => (
              <div key={m.id} className="p-3 rounded-2xl border border-olo/15 bg-olo/5">
                <p className="text-sm font-medium capitalize">{m.label}</p>
                {m.detail && <p className="text-xs text-muted-foreground mt-1 leading-relaxed">{m.detail}</p>}
              </div>
            ))}
          </div>
        </Section>
      )}

      {/* Auto-modifications log */}
      {routine.auto_modifications?.length > 0 && (
        <Section icon={Sparkles} title="Automatic updates" tone="success">
          <div className="space-y-2">
            {routine.auto_modifications.map((mod, i) => (
              <div key={i} className="p-3 rounded-2xl border border-success/15 bg-success-soft/30">
                <div className="flex items-center gap-2 mb-1">
                  <span className="text-[10px] font-semibold uppercase tracking-wider px-1.5 py-0.5 rounded-full bg-success/15 text-success">
                    {mod.trigger === 'scan' ? 'Scan' : 'Food log'}
                  </span>
                  <span className="text-[11px] text-muted-foreground">
                    {new Date(mod.date).toLocaleDateString(undefined, { month: 'short', day: 'numeric' })}
                  </span>
                </div>
                <p className="text-sm font-medium">{mod.change}</p>
                <p className="text-xs text-muted-foreground mt-0.5">{mod.reason}</p>
              </div>
            ))}
          </div>
        </Section>
      )}

      {/* Legend */}
      <div className="mt-6 p-3.5 rounded-2xl border border-border bg-muted/30">
        <div className="flex items-start gap-2.5">
          <Lock className="w-4 h-4 text-warning flex-shrink-0 mt-0.5" />
          <p className="text-xs text-muted-foreground leading-relaxed">
            <span className="font-medium text-warning">Locked steps</span> have an anti-recommendation: do not change or skip them.
            They exist because your scan or food logs detected a condition they directly address. Tap a locked step to see why.
          </p>
        </div>
      </div>
    </div>
  );
}

function Section({ icon: Icon, title, tone, children }) {
  const toneCls = tone === 'warning' ? 'text-warning' : tone === 'success' ? 'text-success' : 'text-olo';
  return (
    <div className="mb-6">
      <div className="flex items-center gap-2 mb-3">
        <Icon className={`w-4.5 h-4.5 ${toneCls}`} />
        <h2 className="font-heading font-600 text-lg">{title}</h2>
      </div>
      {children}
    </div>
  );
}