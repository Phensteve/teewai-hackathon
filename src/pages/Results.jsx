import { useEffect, useState } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { ArrowLeft, Loader2, AlertCircle, Brush, Heart, Sparkles, RotateCcw } from 'lucide-react';
import { scans as insforgeScans } from '@/lib/insforgeDb';
import { useScanPhoto } from '@/hooks/use-scan-photo';

export default function Results() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [scan, setScan] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);
  const { src: photoSrc, loading: photoLoading } = useScanPhoto(scan?.image_url);

  useEffect(() => {
    let active = true;
    let timer;

    const poll = async () => {
      try {
        const s = await insforgeScans.get(id);
        if (!active) return;
        if (!s) { setError(true); setLoading(false); return; }
        setScan(s);
        if (s.status === 'analyzing') {
          timer = setTimeout(poll, 4000);
        } else {
          setLoading(false);
        }
      } catch {
        if (!active) return;
        setError(true);
        setLoading(false);
      }
    };

    poll();
    return () => { active = false; if (timer) clearTimeout(timer); };
  }, [id]);

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center py-24 text-center">
        <Loader2 className="h-8 w-8 animate-spin text-olo" />
        <p className="mt-3 font-heading text-lg font-700">Analyzing your scan…</p>
        <p className="mt-1 text-caption text-muted-foreground">This usually takes 10–20 seconds.</p>
      </div>
    );
  }

  if (error || !scan) {
    return (
      <div className="mx-auto max-w-md py-16 text-center">
        <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-danger-soft">
          <AlertCircle className="h-7 w-7 text-danger" />
        </div>
        <h2 className="font-heading text-xl font-700">We couldn't open this scan</h2>
        <p className="mt-2 text-sm text-muted-foreground">This is usually a connection hiccup.</p>
        <Link
          to="/dashboard"
          className="mt-5 inline-flex items-center gap-2 rounded-xl bg-olo px-5 py-2.5 text-sm font-semibold text-white transition-transform hover:scale-105"
        >
          <ArrowLeft className="h-4 w-4" /> Back to dashboard
        </Link>
      </div>
    );
  }

  const score = scan.score != null ? Math.round(scan.score) : null;
  const health = scan.dental_health_score != null ? Math.round(scan.dental_health_score) : null;
  const recommendations = scan.recommendations || [];
  const stains = scan.stain_types || [];

  return (
    <div className="space-y-5">
      {/* Back */}
      <button
        onClick={() => navigate('/dashboard')}
        className="inline-flex items-center gap-1.5 text-caption text-muted-foreground transition-colors hover:text-foreground"
      >
        <ArrowLeft className="h-4 w-4" /> Dashboard
      </button>

      {/* Photo */}
      <div className="overflow-hidden rounded-3xl border border-border bg-olo-deep">
        {photoLoading && !photoSrc ? (
          <div className="flex h-64 items-center justify-center">
            <Loader2 className="h-6 w-6 animate-spin text-white/40" />
          </div>
        ) : photoSrc ? (
          <img src={photoSrc} alt="Your scan" className="h-64 w-full object-cover" />
        ) : (
          <div className="flex h-64 items-center justify-center text-caption text-white/40">
            Photo unavailable
          </div>
        )}
      </div>

      {/* Score cards */}
      <div className="grid grid-cols-2 gap-3">
        <ScoreCard
          label="Whiteness"
          value={score != null ? score : '—'}
          sub={scan.shade || '—'}
          accent="olo"
        />
        <ScoreCard
          label="Dental health"
          value={health != null ? health : '—'}
          sub={scan.gum_health ? scan.gum_health.replace(/_/g, ' ') : '—'}
          accent="success"
        />
      </div>

      {/* AI summary */}
      {scan.ai_feedback && (
        <div className="rounded-2xl border border-olo/20 bg-olo/5 p-4">
          <div className="mb-2 flex items-center gap-2">
            <span className="flex h-8 w-8 items-center justify-center rounded-xl bg-olo text-white">
              <Brush className="h-4 w-4" />
            </span>
            <p className="font-heading text-sm font-700 text-olo">teewai says</p>
          </div>
          <p className="whitespace-pre-line text-caption leading-relaxed text-foreground/90">
            {scan.ai_feedback}
          </p>
        </div>
      )}

      {/* Stains */}
      {stains.length > 0 && (
        <div className="rounded-2xl border border-border bg-card p-4">
          <p className="mb-2 font-heading text-sm font-600">Stains detected</p>
          <div className="flex flex-wrap gap-2">
            {stains.map((s) => (
              <span key={s} className="rounded-full bg-warning/10 px-3 py-1 text-caption font-medium capitalize text-warning">
                {s}
              </span>
            ))}
          </div>
        </div>
      )}

      {/* Recommendations */}
      {recommendations.length > 0 && (
        <div className="rounded-2xl border border-border bg-card p-4">
          <div className="mb-3 flex items-center gap-2">
            <Sparkles className="h-4 w-4 text-olo" />
            <p className="font-heading text-sm font-600">Your care plan</p>
          </div>
          <div className="space-y-3">
            {recommendations.map((r, i) => (
              <div key={i} className="border-l-2 border-olo/30 pl-3">
                <p className="text-sm font-medium">{r.title}</p>
                {r.description && <p className="mt-0.5 text-caption text-muted-foreground">{r.description}</p>}
                <div className="mt-1.5 flex flex-wrap gap-2">
                  {r.impact && (
                    <span className="rounded-full bg-muted px-2 py-0.5 text-[11px] font-medium capitalize">
                      {r.impact} impact
                    </span>
                  )}
                  {r.frequency && (
                    <span className="rounded-full bg-muted px-2 py-0.5 text-[11px] font-medium">{r.frequency}</span>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Whitening potential */}
      {scan.whitening_potential_shade && (
        <div className="flex items-center gap-3 rounded-2xl border border-success/20 bg-success/5 p-4">
          <Heart className="h-5 w-5 shrink-0 text-success" />
          <div>
            <p className="font-heading text-sm font-600 text-success">Whitening potential</p>
            <p className="text-caption text-muted-foreground">
              Target shade {scan.whitening_potential_shade}
              {scan.weeks_to_potential ? ` · ~${scan.weeks_to_potential} weeks` : ''}
            </p>
          </div>
        </div>
      )}

      {/* Actions */}
      <div className="flex gap-3">
        <Link
          to="/scan"
          className="inline-flex flex-1 items-center justify-center gap-2 rounded-xl bg-olo px-5 py-3 text-sm font-semibold text-white transition-transform hover:scale-105"
        >
          <RotateCcw className="h-4 w-4" /> New scan
        </Link>
        <Link
          to="/dashboard"
          className="inline-flex flex-1 items-center justify-center gap-2 rounded-xl border border-border px-5 py-3 text-sm font-medium transition-colors hover:bg-muted"
        >
          Dashboard
        </Link>
      </div>

      <p className="text-center text-label text-muted-foreground">
        teewai is a wellness companion, not a medical device.
      </p>
    </div>
  );
}

function ScoreCard({ label, value, sub, accent }) {
  const tone = accent === 'olo' ? 'text-olo' : 'text-success';
  const bar = accent === 'olo' ? 'bg-olo' : 'bg-success';
  return (
    <div className="rounded-2xl border border-border bg-card p-4">
      <p className="text-label text-muted-foreground">{label}</p>
      <p className={`mt-1 font-heading text-3xl font-700 tabular-nums ${tone}`}>{value}</p>
      <p className="mt-0.5 text-caption capitalize text-muted-foreground">{sub}</p>
      {typeof value === 'number' && (
        <div className="mt-2 h-1 overflow-hidden rounded-full bg-muted">
          <div
            className={`h-full rounded-full ${bar} transition-all duration-1000`}
            style={{ width: `${Math.max(3, Math.min(100, value))}%` }}
          />
        </div>
      )}
    </div>
  );
}