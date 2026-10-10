import { useState, useEffect } from 'react';
import { Shuffle, Calendar, Check, TrendingUp, Loader2, Wand2 } from 'lucide-react';
import { unrufld } from '@/api/unrufldClient';
import { playClick, playSuccess, initAudio } from '@/lib/sounds';
import { useCurrency } from '@/hooks/use-currency';
import CurrencySwitcher from '@/components/CurrencySwitcher';

const BUDGETS = (format) => [
  { key: 'budget', label: 'Budget', desc: `Under ${format(20)}` },
  { key: 'mid', label: 'Mid-range', desc: `${format(20)}–${format(60)}` },
  { key: 'premium', label: 'Premium', desc: `${format(60)}+` },
  { key: 'all', label: 'No limit', desc: 'All options' },
];

export default function PlanBuilder({ products = [], recommendations = [], scan }) {
  const { format } = useCurrency();
  const [budgetAmount, setBudgetAmount] = useState('40');
  const [noLimit, setNoLimit] = useState(false);
  const [random, setRandom] = useState(false);
  const [plan, setPlan] = useState(null);
  const [aiPlan, setAiPlan] = useState(null);
  const [aiLoading, setAiLoading] = useState(false);

  useEffect(() => {
    let selected;
    if (random) {
      selected = [...products].sort(() => Math.random() - 0.5).slice(0, 3);
    } else if (noLimit) {
      selected = products.slice(0, 4);
    } else {
      const amt = Number(budgetAmount) || 0;
      const tier = amt < 20 ? 'budget' : amt < 60 ? 'mid' : 'premium';
      selected = products.filter((p) => p.budget_tier === tier);
      if (selected.length < 2) {
        const rest = products.filter((p) => p.budget_tier !== tier);
        selected = [...selected, ...rest].slice(0, 3);
      }
    }
    const weeks = recommendations.slice(0, 4).map((r, i) => ({ week: i + 1, ...r }));
    setPlan({ products: selected, weeks });
  }, [budgetAmount, noLimit, random, products, recommendations]);

  const generateAIPlan = async () => {
    initAudio();
    playClick();
    setAiLoading(true);
    try {
      const result = await unrufld.integrations.Core.InvokeLLM({
        prompt: `You are a cosmetic dentist AI creating a personalized 4-week whitening plan. Based on this scan data, create a detailed weekly plan.

Scan data:
- Whiteness score: ${scan?.score || 'N/A'} / 100
- Shade: ${scan?.shade || 'N/A'} (${scan?.shade_code || ''})
- Dental health score: ${scan?.dental_health_score || 'N/A'} / 100
- Gum health: ${scan?.gum_health || 'N/A'} (severity ${scan?.gum_health_severity ?? 'N/A'}/100)
- Plaque: ${scan?.plaque_level || 'N/A'} (severity ${scan?.plaque_severity ?? 'N/A'}/100)
- Enamel: ${scan?.enamel_condition || 'N/A'} (severity ${scan?.enamel_severity ?? 'N/A'}/100)
- Clinical indices: plaque ${scan?.plaque_index ?? 'N/A'}/3 · gingival ${scan?.gingival_index ?? 'N/A'}/3 · BEWE ${scan?.bewe_score ?? 'N/A'}/18
- Whitening potential: ${scan?.whitening_potential_score ?? 'N/A'} (target ${scan?.whitening_potential_shade || 'N/A'}) in ${scan?.weeks_to_potential ?? 4} weeks
- Stains: ${(scan?.stains_detected || []).join(', ') || 'none'}
- Issues: ${(scan?.dental_health_issues || []).join(', ') || 'none'}

Available products: ${JSON.stringify(products.map((p) => ({ name: p.name, category: p.category, budget_tier: p.budget_tier })))}
Recommendations: ${JSON.stringify(recommendations.map((r) => r.title))}

Create a 4-week plan. For each week, include: week number, focus (what to concentrate on), daily routine (morning and evening), product to use, and a tip. Make it practical and specific to this person's scan results.

Return a JSON object: {"weeks": [{"week": number, "focus": string, "morning": string, "evening": string, "product": string, "tip": string}], "totalCost": string, "expectedImprovement": string}`,
        response_json_schema: {
          type: 'object',
          properties: {
            weeks: {
              type: 'array',
              items: {
                type: 'object',
                properties: {
                  week: { type: 'number' },
                  focus: { type: 'string' },
                  morning: { type: 'string' },
                  evening: { type: 'string' },
                  product: { type: 'string' },
                  tip: { type: 'string' },
                },
              },
            },
            totalCost: { type: 'string' },
            expectedImprovement: { type: 'string' },
          },
        },
      });
      setAiPlan(result);
      playSuccess();
    } catch {
      setAiPlan(null);
    } finally {
      setAiLoading(false);
    }
  };

  return (
    <div className="p-6 rounded-3xl border border-border bg-card">
      {/* AI plan generator */}
      <div className="mb-6 p-4 rounded-2xl bg-gradient-to-br from-olo-deep to-olo-deep/80 text-white">
        <div className="flex items-center gap-3 mb-3">
          <div className="w-10 h-10 rounded-xl bg-olo flex items-center justify-center olo-glow">
            <Wand2 className="w-5 h-5 text-white" />
          </div>
          <div>
            <h3 className="font-heading font-600 text-base">AI-personalized plan</h3>
            <p className="text-xs text-white/50">Generated from your scan results</p>
          </div>
        </div>
        <button
          onClick={generateAIPlan}
          disabled={aiLoading}
          className="w-full inline-flex items-center justify-center gap-2 bg-olo text-white font-semibold py-2.5 rounded-xl text-sm hover:scale-[1.02] transition-transform olo-glow disabled:opacity-50"
        >
          {aiLoading ? <><Loader2 className="w-4 h-4 animate-spin" /> Generating your plan…</> : <><Wand2 className="w-4 h-4" /> Generate AI plan</>}
        </button>
      </div>

      {aiPlan && (
        <div className="mb-6 space-y-3 animate-fade-up">
          <h4 className="font-heading font-600 text-sm uppercase tracking-wider text-olo">Your AI-generated plan</h4>
          {aiPlan.weeks?.map((w) => (
            <div key={w.week} className="p-4 rounded-2xl border border-olo/20 bg-olo/5">
              <div className="flex items-center gap-2 mb-2">
                <span className="w-7 h-7 rounded-lg bg-olo text-white text-xs font-bold flex items-center justify-center">{w.week}</span>
                <p className="font-heading font-600 text-sm">{w.focus}</p>
              </div>
              <div className="space-y-1.5 text-sm">
                <p className="text-muted-foreground"><span className="text-olo font-medium">Morning:</span> {w.morning}</p>
                <p className="text-muted-foreground"><span className="text-olo font-medium">Evening:</span> {w.evening}</p>
                <p className="text-muted-foreground"><span className="text-olo font-medium">Product:</span> {w.product}</p>
                <p className="text-muted-foreground"><span className="text-olo font-medium">Tip:</span> {w.tip}</p>
              </div>
            </div>
          ))}
          {aiPlan.expectedImprovement && (
            <div className="flex items-start gap-2 p-3 rounded-xl bg-olo/10 text-sm">
              <TrendingUp className="w-4 h-4 text-olo flex-shrink-0 mt-0.5" />
              <p className="text-muted-foreground">Expected improvement: <span className="text-olo font-medium">{aiPlan.expectedImprovement}</span></p>
            </div>
          )}
        </div>
      )}

      {/* Budget selector */}
      <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4 mb-6">
        <div className="flex-1">
          <div className="flex items-center justify-between gap-2 mb-2">
            <p className="text-sm text-muted-foreground">Set your budget</p>
            <CurrencySwitcher />
          </div>
          <div className="flex items-center gap-2">
            <input
              type="number"
              min="0"
              value={budgetAmount}
              onChange={(e) => { setBudgetAmount(e.target.value); setRandom(false); }}
              disabled={noLimit}
              className="w-32 px-3 py-2.5 rounded-xl border border-border bg-background text-sm focus:outline-none focus:border-olo disabled:opacity-50"
              placeholder="40"
            />
            <button
              onClick={() => { setNoLimit(!noLimit); setRandom(false); playClick(); }}
              className={`px-4 py-2.5 rounded-xl text-sm font-medium transition-all ${
                !random && noLimit ? 'bg-olo text-white olo-glow' : 'bg-muted/50 hover:bg-olo/10 text-foreground'
              }`}
            >
              No limit
            </button>
          </div>
          {!noLimit && !random && Number(budgetAmount) > 0 && Number(budgetAmount) < 10 && (
            <p className="text-xs text-amber-500 mt-2">
              ⚠️ Anything under {format(10)} is unrealistic — you won't find effective whitening products at that price.
            </p>
          )}
        </div>
        <button
          onClick={() => { setRandom(true); playClick(); }}
          className={`inline-flex items-center justify-center gap-2 px-5 py-2.5 rounded-xl font-medium text-sm transition-all flex-shrink-0 ${
            random ? 'bg-olo text-white olo-glow' : 'bg-olo/10 text-olo hover:bg-olo/20'
          }`}
        >
          <Shuffle className="w-4 h-4" /> Surprise me
        </button>
      </div>

      {plan && (
        <div className="space-y-6 animate-fade-up">
          {plan.products.length > 0 && (
            <div>
              <h4 className="font-heading font-600 text-sm uppercase tracking-wider text-muted-foreground mb-3">
                Products in your plan
              </h4>
              <div className="space-y-2">
                {plan.products.map((p, i) => (
                  <div key={i} className="flex items-center gap-3 p-3 rounded-xl bg-muted/40">
                    <div className="w-7 h-7 rounded-lg bg-olo/10 flex items-center justify-center flex-shrink-0">
                      <Check className="w-4 h-4 text-olo" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="font-medium text-sm truncate">{p.name}</p>
                      <p className="text-xs text-muted-foreground">{p.price_range} · {p.category}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {plan.weeks.length > 0 && (
            <div>
              <h4 className="font-heading font-600 text-sm uppercase tracking-wider text-muted-foreground mb-3">
                Your weekly schedule
              </h4>
              <div className="space-y-3">
                {plan.weeks.map((w) => (
                  <div key={w.week} className="flex gap-3 p-3 rounded-xl border border-border">
                    <div className="w-9 h-9 rounded-lg bg-olo-deep flex items-center justify-center flex-shrink-0">
                      <Calendar className="w-4 h-4 text-olo" />
                    </div>
                    <div className="flex-1">
                      <p className="font-medium text-sm">Week {w.week}: {w.title}</p>
                      <p className="text-xs text-muted-foreground mt-0.5">{w.frequency}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          <div className="flex items-start gap-2 p-4 rounded-xl bg-olo/5 text-sm text-muted-foreground">
            <Check className="w-4 h-4 text-olo flex-shrink-0 mt-0.5" />
            <p>Stick to this plan for 4 weeks, then scan again to measure your progress. Consistency is the key to a brighter smile.</p>
          </div>
        </div>
      )}
    </div>
  );
}