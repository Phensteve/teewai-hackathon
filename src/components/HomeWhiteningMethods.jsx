import { useState, useEffect } from 'react';
import { homeWhiteningMethods as methodsEntity } from '@/lib/insforgeDb';
import { Droplet, StickyNote, Droplets, Brush, Zap, Coffee, Link as LinkIcon, Shield, Clock, TrendingUp, ChevronRight, CheckCircle2, BookOpen, Loader2, X } from 'lucide-react';

const ICONS = {
  Droplet, StickyNote, Droplets, Brush, Zap, Coffee, Link: LinkIcon,
};

const CATEGORY_META = {
  bleaching: { label: 'Bleaching', color: 'text-olo', bg: 'bg-olo/10' },
  abrasive: { label: 'Stain removal', color: 'text-chart-2', bg: 'bg-chart-2/10' },
  enzymatic: { label: 'Enzymatic', color: 'text-chart-5', bg: 'bg-chart-5/10' },
  maintenance: { label: 'Maintenance', color: 'text-success', bg: 'bg-success/10' },
  natural: { label: 'Natural', color: 'text-warning', bg: 'bg-warning/10' },
};

const COST_LABELS = { budget: 'Budget-friendly', mid: 'Mid-range', premium: 'Premium' };

function ScoreBar({ label, score, color }) {
  return (
    <div>
      <div className="flex items-center justify-between mb-1">
        <span className="text-xs text-muted-foreground">{label}</span>
        <span className="text-xs font-semibold" style={{ color }}>{score}/100</span>
      </div>
      <div className="h-2 rounded-full bg-muted overflow-hidden">
        <div className="h-full rounded-full transition-all" style={{ width: `${score}%`, backgroundColor: color }} />
      </div>
    </div>
  );
}

function MethodCard({ method, index }) {
  const [showModal, setShowModal] = useState(false);
  const Icon = ICONS[method.icon] || Droplet;
  const cat = CATEGORY_META[method.category] || CATEGORY_META.bleaching;
  const effColor = method.effectiveness_score >= 70 ? 'hsl(174 100% 36%)' : method.effectiveness_score >= 45 ? 'hsl(43 74% 50%)' : 'hsl(0 70% 55%)';
  const safeColor = method.safety_score >= 90 ? 'hsl(160 84% 39%)' : method.safety_score >= 75 ? 'hsl(43 74% 50%)' : 'hsl(0 70% 55%)';

  return (
    <div
      className="p-5 rounded-2xl border border-border bg-card hover:border-olo/30 hover:shadow-lg hover:shadow-olo/5 transition-all animate-fade-up"
      style={{ animationDelay: `${index * 80}ms` }}
    >
      <div className="flex items-start gap-3 mb-3">
        <div className="w-11 h-11 rounded-xl bg-olo/10 flex items-center justify-center flex-shrink-0">
          <Icon className="w-5 h-5 text-olo" />
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <h3 className="font-heading font-600 text-base leading-tight">{method.name}</h3>
            <span className={`text-[10px] font-semibold px-2 py-0.5 rounded-full ${cat.bg} ${cat.color}`}>{cat.label}</span>
          </div>
          <p className="text-xs text-muted-foreground mt-0.5">{method.active_ingredient}</p>
        </div>
      </div>

      <p className="text-sm text-foreground/80 leading-relaxed mb-4">{method.short_description}</p>

      <div className="grid grid-cols-2 gap-4 mb-4">
        <ScoreBar label="Effectiveness" score={method.effectiveness_score} color={effColor} />
        <ScoreBar label="Safety" score={method.safety_score} color={safeColor} />
      </div>

      <div className="flex flex-wrap gap-2 mb-4">
        <span className="inline-flex items-center gap-1 text-xs text-muted-foreground bg-muted/50 px-2.5 py-1 rounded-full">
          <Clock className="w-3 h-3" /> {method.time_to_results}
        </span>
        <span className="inline-flex items-center gap-1 text-xs text-muted-foreground bg-muted/50 px-2.5 py-1 rounded-full">
          {COST_LABELS[method.cost_tier] || method.cost_tier}
        </span>
        {method.suitable_for?.slice(0, 3).map((s) => (
          <span key={s} className="text-xs text-olo bg-olo/10 px-2.5 py-1 rounded-full capitalize">{s.replace(/_/g, ' ')}</span>
        ))}
      </div>

      <button
        onClick={() => setShowModal(true)}
        className="flex items-center gap-1.5 text-sm font-medium text-olo hover:gap-2.5 transition-all"
      >
        How to use & evidence
        <ChevronRight className="w-4 h-4" />
      </button>

      {showModal && (
        <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/50 backdrop-blur-sm animate-fade-up" onClick={() => setShowModal(false)}>
          <div className="w-full sm:max-w-lg max-h-[85vh] overflow-y-auto bg-card rounded-t-3xl sm:rounded-3xl border border-border shadow-2xl" onClick={(e) => e.stopPropagation()}>
            <div className="sticky top-0 flex items-center justify-between gap-3 p-4 bg-card border-b border-border z-10">
              <div className="flex items-center gap-3 min-w-0">
                <div className="w-10 h-10 rounded-xl bg-olo/10 flex items-center justify-center flex-shrink-0">
                  <Icon className="w-5 h-5 text-olo" />
                </div>
                <div className="min-w-0">
                  <h3 className="font-heading font-600 text-base leading-tight truncate">{method.name}</h3>
                  <p className="text-xs text-muted-foreground truncate">{method.active_ingredient}</p>
                </div>
              </div>
              <button onClick={() => setShowModal(false)} className="w-9 h-9 rounded-full bg-muted hover:bg-muted/70 flex items-center justify-center flex-shrink-0 transition-colors">
                <X className="w-4 h-4" />
              </button>
            </div>
            <div className="p-5 space-y-4">
              <div>
                <h4 className="text-xs font-heading font-600 uppercase tracking-wider text-muted-foreground mb-1.5">How to use</h4>
                <p className="text-sm text-foreground/80 leading-relaxed">{method.how_to_use}</p>
              </div>
              <div>
                <h4 className="text-xs font-heading font-600 uppercase tracking-wider text-muted-foreground mb-1.5">Frequency</h4>
                <p className="text-sm text-foreground/80">{method.frequency}</p>
              </div>
              <div>
                <h4 className="text-xs font-heading font-600 uppercase tracking-wider text-muted-foreground mb-1.5">Expected results</h4>
                <p className="text-sm text-foreground/80">{method.expected_results}</p>
              </div>
              <div className="p-3 rounded-xl bg-warning/5 border border-warning/20">
                <div className="flex items-start gap-2">
                  <Shield className="w-4 h-4 text-warning flex-shrink-0 mt-0.5" />
                  <p className="text-xs text-foreground/70 leading-relaxed">{method.safety_notes}</p>
                </div>
              </div>
              <div>
                <div className="flex items-center gap-1.5 mb-2">
                  <BookOpen className="w-3.5 h-3.5 text-olo" />
                  <h4 className="text-xs font-heading font-600 uppercase tracking-wider text-muted-foreground">Clinical evidence ({method.evidence_sources?.length || 0} independent sources)</h4>
                </div>
                <ul className="space-y-1.5">
                  {method.evidence_sources?.map((src, i) => (
                    <li key={i} className="flex items-start gap-2 text-xs text-foreground/70">
                      <CheckCircle2 className="w-3.5 h-3.5 text-success flex-shrink-0 mt-0.5" />
                      <span>{src}</span>
                    </li>
                  ))}
                </ul>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default function HomeWhiteningMethods({ scan, compact = false }) {
  const [methods, setMethods] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState('all');

  useEffect(() => {
    methodsEntity.list('sortOrder', 50)
      .then(setMethods)
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  // If a scan is provided, sort methods by suitability for the detected stains
  const sortedMethods = (() => {
    if (!scan?.stain_types?.length) return methods;
    const stains = scan.stain_types.map((s) => s.toLowerCase());
    return [...methods].sort((a, b) => {
      const aMatch = (a.suitable_for || []).filter((s) => stains.some((st) => s.includes(st) || st.includes(s))).length;
      const bMatch = (b.suitable_for || []).filter((s) => stains.some((st) => s.includes(st) || st.includes(s))).length;
      if (bMatch !== aMatch) return bMatch - aMatch;
      return (b.effectiveness_score || 0) - (a.effectiveness_score || 0);
    });
  })();

  const filtered = filter === 'all' ? sortedMethods : sortedMethods.filter((m) => m.category === filter);
  // Compact (post-scan) view shows fewer methods — the Results page is a
  // guidance moment, not a catalogue. The full library lives on /home-whitening.
  const display = compact ? filtered.slice(0, 2) : filtered;
  const categories = ['all', ...new Set(methods.map((m) => m.category))];

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="w-6 h-6 text-olo animate-spin" />
      </div>
    );
  }

  return (
    <div>
      {!compact && (
        <div className="mb-6">
          <div className="flex items-center gap-2 mb-2">
            <TrendingUp className="w-5 h-5 text-olo" />
            <h2 className="font-heading font-600 text-xl">Home whitening methods that work</h2>
          </div>
          <p className="text-sm text-muted-foreground">
            Every method below is backed by at least three independent clinical sources — systematic reviews, ADA guidelines, or peer-reviewed trials. No myths, no charcoal, no lemon juice.
          </p>
        </div>
      )}

      {!compact && categories.length > 2 && (
        <div className="flex flex-wrap gap-2 mb-5">
          {categories.map((cat) => (
            <button
              key={cat}
              onClick={() => setFilter(cat)}
              className={`px-3.5 py-1.5 rounded-full text-sm font-medium transition-all ${
                filter === cat
                  ? 'bg-olo text-white'
                  : 'bg-muted text-muted-foreground hover:bg-olo/10 hover:text-olo'
              }`}
            >
              {cat === 'all' ? 'All methods' : CATEGORY_META[cat]?.label || cat}
            </button>
          ))}
        </div>
      )}

      <div className="grid sm:grid-cols-2 gap-4">
        {display.map((m, i) => (
          <MethodCard key={m.id || i} method={m} index={i} />
        ))}
      </div>

      <p className="text-xs text-muted-foreground mt-6 flex items-start gap-2">
        <Shield className="w-3.5 h-3.5 text-muted-foreground flex-shrink-0 mt-0.5" />
        teewai compiles evidence from published dental research but does not provide medical advice. Always consult your dentist before starting a whitening regimen, especially if you have sensitive teeth, restorations, or gum disease.
      </p>
    </div>
  );
}