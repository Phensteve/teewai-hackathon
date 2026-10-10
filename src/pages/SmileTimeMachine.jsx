import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { Hourglass, TrendingDown, TrendingUp, Camera, ArrowRight, AlertCircle } from 'lucide-react';
import { scans as insforgeScans, userProfile } from '@/lib/insforgeDb';
import { projectTimeline } from '@/lib/smileTimeMachine';
import { ensureBaseline, findBaselineScan, formatBaselineDate, shadeHex } from '@/lib/baseline';
import ScanImage from '@/components/ScanImage';
import PageSkeleton from '@/components/loading/PageSkeleton';

// Smile Time Machine — the motivational "future smile" projection. Shows the
// shade you're heading toward in 1 / 3 / 5 years if you keep your current
// habits vs if you follow your whitening plan, straight from your latest scan.
export default function SmileTimeMachine() {
  const [scan, setScan] = useState(null);
  const [baselineScan, setBaselineScan] = useState(null);
  const [useBaseline, setUseBaseline] = useState(true);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const load = async () => {
      try {
        const [scanList, me] = await Promise.all([
          insforgeScans.list('-created_date', 200).catch(() => []),
          userProfile.get().catch(() => null),
        ]);
        const latest = (scanList || [])[0] || null;
        setScan(latest);

        let bId = me?.baseline_scan_id;
        if (!bId && scanList.length > 0) {
          bId = await ensureBaseline(me, scanList);
        }
        const bScan = findBaselineScan(scanList, bId);
        setBaselineScan(bScan);
        setUseBaseline(!!bScan);
      } catch {
        setScan(null);
      } finally {
        setLoading(false);
      }
    };
    load();
  }, []);

  if (loading) return <PageSkeleton />;

  const t = scan ? projectTimeline(scan) : null;
  const beforeScan = (useBaseline && baselineScan) ? baselineScan : scan;
  const showToggle = baselineScan && scan && baselineScan.id !== scan.id;
  const beforeShadeCode = beforeScan?.shade_code || t?.current?.shadeCode;
  const beforeScore = beforeScan?.score != null ? Math.round(beforeScan.score) : t?.current?.score;
  const beforeHex = beforeShadeCode ? shadeHex(beforeShadeCode) : t?.current?.hex;

  return (
    <div className="max-w-3xl mx-auto">
      <div className="flex items-center gap-2 mb-1">
        <Hourglass className="w-5 h-5 text-olo" />
        <h1 className="font-heading font-700 text-2xl sm:text-3xl tracking-tight">Smile Time Machine</h1>
      </div>
      <p className="text-sm text-muted-foreground mb-4">
        The smile you're growing into — and the one at stake if your habits slip. Projected from your latest scan.
      </p>

      {showToggle && (
        <div className="flex gap-1 bg-muted/50 rounded-2xl p-1 mb-6 max-w-xs">
          <button
            onClick={() => setUseBaseline(true)}
            className={`flex-1 py-2 rounded-xl text-xs font-medium transition-all ${useBaseline ? 'bg-card text-foreground shadow-sm' : 'text-muted-foreground'}`}
          >
            From baseline
          </button>
          <button
            onClick={() => setUseBaseline(false)}
            className={`flex-1 py-2 rounded-xl text-xs font-medium transition-all ${!useBaseline ? 'bg-card text-foreground shadow-sm' : 'text-muted-foreground'}`}
          >
            From latest
          </button>
        </div>
      )}

      {!t ? (
        <div className="text-center py-16 px-4">
          <div className="w-14 h-14 rounded-2xl bg-olo/10 flex items-center justify-center mx-auto mb-5">
            <Camera className="w-7 h-7 text-olo" />
          </div>
          <h2 className="font-heading font-700 text-xl mb-2">Scan to see your future smile</h2>
          <p className="text-sm text-muted-foreground mb-6 max-w-sm mx-auto">
            One photo lets teewai project where your shade is heading — and how far a daily routine takes you.
          </p>
          <Link to="/scan" className="inline-flex items-center gap-2 bg-olo text-white font-semibold px-5 py-2.5 rounded-xl text-sm hover:scale-105 transition-transform olo-glow">
            <Camera className="w-4 h-4" /> Take a scan
          </Link>
        </div>
      ) : (
        <div className="space-y-5">
          {/* Today / Baseline */}
          <div className="p-5 rounded-3xl border border-border bg-card frost-edge flex items-center gap-4">
            <ScanImage url={beforeScan?.image_url} alt="Your scan" className="w-16 h-16 rounded-2xl object-cover flex-shrink-0" />
            <div className="flex-1 min-w-0">
              <p className="text-xs text-muted-foreground uppercase tracking-wider">
                {useBaseline && baselineScan ? `Baseline · ${formatBaselineDate(baselineScan.created_date)}` : 'Today'}
              </p>
              <p className="font-heading font-700 text-lg">Shade {beforeShadeCode} · {beforeScore} whiteness</p>
              <p className="text-xs text-muted-foreground truncate">Stain load {t.stainLoad}/100 · ~{t.declinePerYear.toFixed(1)} steps darker/yr if habits hold</p>
            </div>
            <div className="w-12 h-12 rounded-2xl border border-border flex-shrink-0" style={{ background: beforeHex }} />
          </div>

          {/* Improve path */}
          <PathCard
            tone="olo"
            icon={TrendingUp}
            title="If you follow your plan"
            sub="Reach your whitening potential, then hold it."
            now={t.current}
            points={t.improve}
          />

          {/* Decline path */}
          <PathCard
            tone="amber"
            icon={TrendingDown}
            title="If you keep your habits"
            sub="Stains keep accumulating at your current rate."
            now={t.current}
            points={t.decline}
          />

          {/* Takeaway */}
          <div className="p-5 rounded-3xl bg-olo-deep text-white">
            <div className="flex items-center gap-2 mb-1.5">
              <Hourglass className="w-4 h-4 text-olo" />
              <p className="font-heading font-700 text-base">Your daily routine is worth {Math.abs(t.fiveYearDelta)} points</p>
            </div>
            <p className="text-sm text-white/70 leading-relaxed">
              Five years from now, the gap between the two paths is{' '}
              <span className="text-olo font-semibold">{t.stepDelta} VITA shade steps</span> — the difference between shade{' '}
              <span className="text-warning font-semibold">{t.decline[2].shadeCode}</span> and shade{' '}
              <span className="text-olo font-semibold">{t.improve[2].shadeCode}</span>. That gap is the exact payoff of showing up every day.
            </p>
            <p className="text-xs text-white/50 mt-3 flex items-center gap-1.5">
              <AlertCircle className="w-3.5 h-3.5" /> A motivational projection, not a diagnosis. Real results depend on your enamel, habits and dental care.
            </p>
          </div>

          <div className="flex gap-3">
            <Link to="/scan" className="flex-1 flex items-center justify-center gap-2 bg-olo text-white font-semibold py-3 rounded-2xl text-sm hover:scale-[1.02] transition-transform olo-glow">
              <Camera className="w-4 h-4" /> New scan
            </Link>
            <Link to="/timeline" className="flex-1 flex items-center justify-center gap-2 border border-olo text-olo font-semibold py-3 rounded-2xl text-sm hover:bg-olo/5 transition-colors">
              VITA timeline <ArrowRight className="w-4 h-4" />
            </Link>
          </div>
        </div>
      )}
    </div>
  );
}

function PathCard({ tone, icon: Icon, title, sub, now, points }) {
  const isOlo = tone === 'olo';
  const accent = isOlo ? 'text-olo' : 'text-warning';
  const steps = [{ years: 0, shadeCode: now.shadeCode, hex: now.hex, score: now.score, label: 'Now' },
    ...points.map((p) => ({ ...p, label: `${p.years} yr` }))];
  return (
    <div className="p-5 rounded-3xl border border-border bg-card">
      <div className="flex items-center gap-2 mb-1">
        <Icon className={`w-5 h-5 ${accent}`} />
        <h3 className="font-heading font-600 text-lg">{title}</h3>
      </div>
      <p className="text-sm text-muted-foreground mb-4">{sub}</p>
      <div className="flex items-end justify-between gap-2">
        {steps.map((p) => (
          <div key={p.label} className="flex-1 flex flex-col items-center gap-1.5">
            <div className="w-full h-16 rounded-xl border border-border" style={{ background: p.hex }} />
            <p className={`text-xs font-heading font-700 ${accent}`}>{p.shadeCode}</p>
            <p className="text-[11px] text-muted-foreground">{p.label}</p>
          </div>
        ))}
      </div>
      <p className="text-[10px] text-muted-foreground/60 text-center mt-3">Illustrative estimate — not a guaranteed result</p>
    </div>
  );
}