import { useState, useEffect, useRef } from 'react';
import PageSkeleton from '@/components/loading/PageSkeleton';
import { useNavigate, Link } from 'react-router-dom';
import { unrufld } from '@/api/unrufldClient';
import ScanUploader from '@/components/ScanUploader';
import ScanReference from '@/components/scan/ScanReference';
import ScoreCircle from '@/components/ScoreCircle';
import { photos as insforgePhotos, subscriptions, scans as insforgeScans } from '@/lib/insforgeDb';
import { preAnalyze } from '@/lib/unrufldteeth';
import { normalizeLightingForAI } from '@/lib/teewaiVision';
import { Camera, RotateCcw, AlertTriangle, CheckCircle2, ArrowLeft, Stethoscope, Clock } from 'lucide-react';

const SEVERITY_COLOR = {
  mild: 'text-warning bg-warning/10',
  moderate: 'text-orange-500 bg-orange-500/10',
  severe: 'text-red-500 bg-red-500/10',
};

const LEVEL_LABEL = {
  none: 'No alignment concerns',
  mild: 'Mild — optional',
  moderate: 'Moderate — worth a consult',
  severe: 'Severe — see an orthodontist',
};

const BRACES_STAGES = [
  { label: 'Mapping tooth positions', desc: 'Locating each tooth in the arch' },
  { label: 'Measuring midline symmetry', desc: 'Checking center-line alignment' },
  { label: 'Scoring crowding & spacing', desc: 'Detecting overlap and gaps' },
  { label: 'Assessing arch form', desc: 'Evaluating the dental arch shape' },
];

export default function BracesCheck() {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [result, setResult] = useState(null);
  const [subscription, setSubscription] = useState(null);
  const [subLoading, setSubLoading] = useState(true);
  const timeoutRef = useRef(null);

  useEffect(() => {
    subscriptions.filter({}).then((s) => setSubscription(s[0] || null)).finally(() => setSubLoading(false));
    return () => { if (timeoutRef.current) clearTimeout(timeoutRef.current); };
  }, []);

  const isPro = subscription?.plan === 'pro' || subscription?.plan === 'pro_yearly' || subscription?.plan === 'pro_weekly';
  const scansUsed = subscription?.scans_used || 0;
  const scansLimit = subscription?.scans_limit || 5;
  const limitReached = !isPro && scansUsed >= scansLimit;

  const runCheck = async (file) => {
    setError('');
    setLoading(true);
    timeoutRef.current = setTimeout(() => {
      setLoading(false);
      setError('Analysis is taking longer than expected. Check your connection and try again.');
    }, 90000);

    try {
      let sub = subscription;
      try {
        const fresh = await subscriptions.filter({});
        if (fresh[0]) { sub = fresh[0]; setSubscription(fresh[0]); }
      } catch {}
      const pro = sub?.plan === 'pro' || sub?.plan === 'pro_yearly' || sub?.plan === 'pro_weekly';
      const used = sub?.scans_used || 0;
      const limit = sub?.scans_limit || 5;
      if (!pro && used >= limit) {
        setError("You're out of scans. Grab a pack to run the braces check.");
        setLoading(false);
        return;
      }

      const { url: file_url, blob } = await insforgePhotos.upload(file);
      const aiBlob = await normalizeLightingForAI(blob);
      let analysisUrl = file_url;
      try {
        const up = await unrufld.integrations.Core.UploadPublicFile({ file: new File([aiBlob], 'braces.jpg', { type: 'image/jpeg' }) });
        if (up?.file_url) analysisUrl = up.file_url;
      } catch {}

      await preAnalyze(file).catch(() => ({}));
      const { data } = await unrufld.functions.invoke('analyzeScan', { file_url: analysisUrl, position: 'front', mode: 'braces' });
      if (data?.needs_another_photo) throw new Error(data.ai_feedback || data.summary || 'Please retake a sharper photo in even light. No scan credit was used.');

      // Consume one scan from the subscription limit (the braces check is a
      // distinct screening — we don't persist it as a whiteness scan).
      if (!pro) {
        if (sub) await subscriptions.update(sub.id, { scans_used: used + 1 });
        else await subscriptions.create({ plan: 'free', status: 'active', scans_used: 1, scans_limit: 5, purchases: [] });
      }

      clearTimeout(timeoutRef.current);
      setLoading(false);
      setResult(data);
      // Persist the braces screening so it appears in My Scans → Braces tab.
      try {
        await insforgeScans.create({
          image_url: file_url,
          scan_mode: 'braces',
          capture_position: 'front',
          score: data?.alignment_score,
          ai_feedback: data?.summary || '',
          dental_health_issues: (data?.issues || []).map((i) => (i.issue || '').replace(/_/g, ' ')).filter(Boolean),
          status: 'completed',
        });
      } catch (persistErr) { console.error('Persist braces scan failed:', persistErr); }
    } catch (e) {
      clearTimeout(timeoutRef.current);
      setError(e?.message || 'Something went wrong analyzing your photo. Please try again.');
      setLoading(false);
    }
  };

  if (subLoading) return <PageSkeleton />;

  return (
    <div className="max-w-2xl mx-auto">
      <button onClick={() => navigate('/dashboard')} className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-olo transition-colors mb-6">
        <ArrowLeft className="w-4 h-4" /> Back to dashboard
      </button>

      <div className="flex items-center gap-3 mb-2">
        <div className="w-12 h-12 rounded-2xl bg-olo/10 flex items-center justify-center">
          <Stethoscope className="w-6 h-6 text-olo" />
        </div>
        <div>
          <h1 className="font-heading font-700 text-2xl sm:text-3xl tracking-tight">Do I need braces or a retainer?</h1>
          <p className="text-sm text-muted-foreground">Snap a front-facing photo and teewai screens your alignment — and whether a retainer could help keep your smile in place.</p>
        </div>
      </div>

      {!result && !limitReached && (
        <>
          <div className="mt-6 mb-2 p-4 rounded-2xl bg-olo/5 border border-olo/20 flex items-start gap-3">
            <Stethoscope className="w-5 h-5 text-olo flex-shrink-0 mt-0.5" />
            <p className="text-sm text-muted-foreground">
              Smile straight at the camera with your teeth slightly apart. Good lighting helps. This uses <strong className="text-olo">1 scan</strong>.
            </p>
          </div>
          <div className="mt-4">
            <ScanReference position="braces" />
          </div>
          <ScanUploader onFile={runCheck} loading={loading} positionLabel="the front of your teeth" ritualStages={BRACES_STAGES} />
        </>
      )}

      {limitReached && (
        <div className="mt-6 text-center py-10">
          <p className="text-muted-foreground mb-4">You're out of scans. The braces check uses 1 scan.</p>
          <Link to="/subscription" className="inline-flex items-center gap-2 bg-olo text-white font-semibold px-6 py-3 rounded-xl hover:scale-105 transition-transform olo-glow">
            Get more scans
          </Link>
        </div>
      )}

      {error && (
        <div className="mt-4 p-4 rounded-xl bg-destructive/10 text-destructive text-sm flex items-center gap-2">
          <RotateCcw className="w-4 h-4 flex-shrink-0" /> {error}
        </div>
      )}

      {result && (
        <div className="mt-6 space-y-5 animate-fade-up">
          {/* Alignment score */}
          <div className="p-6 rounded-3xl border border-border bg-card flex flex-col items-center text-center">
            <h2 className="font-heading font-600 text-lg mb-3">Alignment score</h2>
            <ScoreCircle score={result.alignment_score} size={170} />
            <p className="mt-3 text-sm font-semibold text-olo">{LEVEL_LABEL[result.recommendation_level] || '—'}</p>
          </div>

          {/* Summary */}
          {result.summary && (
            <div className="p-5 rounded-2xl bg-olo-deep text-white flex items-start gap-3">
              <div className="w-10 h-10 rounded-xl bg-olo flex items-center justify-center flex-shrink-0 olo-glow">
                <CheckCircle2 className="w-5 h-5" />
              </div>
              <div>
                <h3 className="font-heading font-600 text-sm mb-1 text-olo">teewai says</h3>
                <p className="text-white/80 text-sm leading-relaxed">{result.summary}</p>
              </div>
            </div>
          )}

          {/* Retainer check */}
          {result.recommendation_level === 'none' && (
            <div className="p-5 rounded-2xl border border-olo/30 bg-olo/5 flex items-start gap-3">
              <Stethoscope className="w-5 h-5 text-olo flex-shrink-0 mt-0.5" />
              <div>
                <h3 className="font-heading font-600 text-base">Do you need a retainer?</h3>
                <p className="text-sm text-muted-foreground mt-1">
                  {result.retainer_note || "Your alignment looks fairly straight. If you've had braces before, a retainer keeps your teeth from shifting back. If you notice crowding returning, ask your dentist whether a retainer could help."}
                </p>
              </div>
            </div>
          )}

          {/* Orthodontist banner */}
          {result.see_orthodontist ? (
            <div className="p-5 rounded-2xl border border-warning/30 bg-warning/5 flex items-start gap-3">
              <AlertTriangle className="w-5 h-5 text-warning flex-shrink-0 mt-0.5" />
              <div>
                <h3 className="font-heading font-600 text-base">Worth an orthodontist visit</h3>
                <p className="text-sm text-muted-foreground mt-1">teewai noticed alignment issues a specialist should confirm. This screen is a guide, not a diagnosis.</p>
              </div>
            </div>
          ) : (
            <div className="p-5 rounded-2xl border border-success/30 bg-success/5 flex items-start gap-3">
              <CheckCircle2 className="w-5 h-5 text-success flex-shrink-0 mt-0.5" />
              <div>
                <h3 className="font-heading font-600 text-base">No urgent concerns</h3>
                <p className="text-sm text-muted-foreground mt-1">Nothing that clearly needs braces from this photo. Keep regular dental checkups.</p>
              </div>
            </div>
          )}

          {/* Issues */}
          {result.issues?.length > 0 && (
            <div className="p-5 rounded-2xl border border-border bg-card">
              <h3 className="font-heading font-600 text-base mb-3">Issues spotted</h3>
              <div className="space-y-2">
                {result.issues.map((iss, i) => (
                  <div key={i} className="flex items-start justify-between gap-3 p-3 rounded-xl bg-muted/40">
                    <div>
                      <p className="font-medium text-sm capitalize">{iss.issue.replace(/_/g, ' ')}</p>
                      {iss.note && <p className="text-xs text-muted-foreground mt-0.5">{iss.note}</p>}
                      {iss.teeth?.length > 0 && <p className="text-[11px] text-muted-foreground mt-0.5">{iss.teeth.join(', ')}</p>}
                    </div>
                    <span className={`text-xs font-semibold px-2.5 py-1 rounded-full capitalize flex-shrink-0 ${SEVERITY_COLOR[iss.severity] || 'text-muted-foreground bg-muted'}`}>
                      {iss.severity}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Treatment options */}
          {result.treatment_options?.length > 0 && (
            <div className="p-5 rounded-2xl border border-border bg-card">
              <h3 className="font-heading font-600 text-base mb-3">Options to discuss with an orthodontist</h3>
              <div className="grid sm:grid-cols-2 gap-3">
                {result.treatment_options.map((t, i) => (
                  <div key={i} className="p-4 rounded-2xl bg-muted/40">
                    <p className="font-heading font-600 text-sm">{t.name}</p>
                    {t.description && <p className="text-xs text-muted-foreground mt-1">{t.description}</p>}
                    <div className="flex items-center gap-3 mt-2 text-[11px] text-muted-foreground">
                      {t.estimated_duration && <span className="inline-flex items-center gap-1"><Clock className="w-3 h-3" /> {t.estimated_duration}</span>}
                      {t.complexity && <span className="capitalize">{t.complexity}</span>}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          <div className="flex gap-3">
            <button onClick={() => setResult(null)} className="flex-1 inline-flex items-center justify-center gap-2 bg-olo text-white font-semibold px-6 py-3 rounded-xl hover:scale-105 transition-transform olo-glow">
              <Camera className="w-4 h-4" /> Check again
            </button>
            <Link to="/dashboard" className="inline-flex items-center justify-center gap-2 border border-border font-medium px-6 py-3 rounded-xl hover:bg-muted/40 transition-colors">
              Done
            </Link>
          </div>

          <div className="p-4 rounded-2xl bg-warning-soft border border-warning/20 text-warning text-xs text-center">
            teewai is a wellness companion, not a medical device. An orthodontist must confirm any alignment diagnosis with a clinical exam and X-rays.
          </div>
        </div>
      )}
    </div>
  );
}