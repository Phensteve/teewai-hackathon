import { useEffect, useState } from 'react';
import { FEATURE_REGISTRY, CLINICAL_FRAMEWORKS } from '@/lib/unrufldteeth';
import { adminAuth } from '@/lib/adminAuth';
import { Switch } from '@/components/ui/switch';
import { useToast } from '@/components/ui/use-toast';
import { CheckCircle2, FlaskConical, Lock, Loader2, Rocket, ChevronDown } from 'lucide-react';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';

// Clinical categories — features within each group are alternatives/variants
// of the same assessment, so they're bundled into a dropdown.
const DORMANT_GROUPS = [
  { label: 'Periodontal screening', keys: ['cpi_periodontal', 'psr_screening', 'ohis_oral_hygiene', 'quigley_turesky_plaque'] },
  { label: 'Caries & risk', keys: ['cambra_risk', 'dmfs_surface_count', 'caries_risk_trend'] },
  { label: 'Tooth wear', keys: ['smith_knight_twi', 'occlusal_wear_predictor', 'bruxism_screen', 'erosion_progression'] },
  { label: 'Shade science', keys: ['vita_3d_master_map', 'shade_aging_curve', 'shade_relapse_forecast', 'whitening_responsiveness', 'stain_susceptibility'] },
  { label: 'Aesthetic & orthodontic', keys: ['bolton_discrepancy', 'nordland_papilla', 'smile_line_class', 'dai_aesthetic', 'iotn_need', 'gingival_biotype'] },
  { label: '3D & tracking', keys: ['gingival_3d_mapping', 'caries_depth_estimation', 'plaque_timelapse', 'microbiome_hint'] },
  { label: 'Holistic & historical', keys: ['halitosis_estimate', 'dental_age_estimate', 'frankl_behavior', 'ancient_remedy_context'] },
];

// Clinical feature registry with admin-controlled "push to live" overrides.
// The registry is code-defined; a super_admin can flip a dormant feature to
// "live" (or revert) without a deploy. The override persists in the backend
// and the app reads effective status = override || registry status.
export default function DormantFeaturesPanel() {
  const { toast } = useToast();
  const [flags, setFlags] = useState({});
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(null);
  const [openGroups, setOpenGroups] = useState({});

  const load = async () => {
    setLoading(true);
    try {
      const data = await adminAuth.listFeatureFlags();
      setFlags(data.flags || {});
    } catch {
      // read-only fallback if the flag store isn't available yet
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { load(); }, []);

  const effective = (k) => flags[k] || FEATURE_REGISTRY[k].status;
  const isOverridden = (k) => !!flags[k] && flags[k] !== FEATURE_REGISTRY[k].status;
  const fw = (key) => CLINICAL_FRAMEWORKS[key];

  const toggle = async (k, turnLive) => {
    setSaving(k);
    const next = turnLive ? 'live' : 'dormant';
    const prev = flags[k];
    setFlags((f) => ({ ...f, [k]: next }));
    try {
      await adminAuth.setFeatureFlag(k, next);
      toast({ title: turnLive ? 'Pushed to live' : 'Reverted to dormant', description: k });
    } catch (e) {
      setFlags((f) => ({ ...f, [k]: prev }));
      toast({ title: 'Could not update flag', description: e?.message || 'Try again', variant: 'destructive' });
    } finally {
      setSaving(null);
    }
  };

  const entries = Object.entries(FEATURE_REGISTRY);
  const live = entries.filter(([k]) => effective(k) === 'live');
  const dormant = entries.filter(([k]) => effective(k) === 'dormant');

  const Card = ({ k, v }) => {
    const overridden = isOverridden(k);
    const codeLive = v.status === 'live' && !overridden;
    return (
      <div className="p-4 rounded-2xl border border-border bg-card">
        <div className="flex items-start justify-between gap-2 mb-1">
          <code className="text-xs font-mono text-olo break-all">{k}</code>
          {v.framework && (
            <span className="text-[10px] uppercase tracking-wider text-muted-foreground bg-muted px-1.5 py-0.5 rounded-full flex-shrink-0">
              {v.framework}
            </span>
          )}
        </div>
        <p className="text-sm text-muted-foreground leading-snug mb-2">{v.desc}</p>
        {v.framework && fw(v.framework) && (
          <div className="mb-3 p-2.5 rounded-lg bg-muted/50 border border-border/60">
            <p className="text-[11px] font-semibold text-foreground">{fw(v.framework).name}</p>
            <p className="text-[10px] text-muted-foreground mt-0.5">
              Scale: {fw(v.framework).scale}{fw(v.framework).source ? ` · ${fw(v.framework).source}` : ''}
            </p>
            {fw(v.framework).grades && (
              <p className="text-[10px] text-muted-foreground mt-1 leading-relaxed">
                {Object.entries(fw(v.framework).grades).map(([k, val]) => `${k} = ${val}`).join(' · ')}
              </p>
            )}
            {fw(v.framework).notes && (
              <p className="text-[10px] text-muted-foreground mt-1 italic">{fw(v.framework).notes}</p>
            )}
          </div>
        )}
        <div className="flex items-center justify-between gap-2">
          {codeLive ? (
            <span className="text-[11px] text-emerald-600 font-medium">Live in code</span>
          ) : overridden ? (
            <span className="text-[11px] text-olo font-medium flex items-center gap-1">
              <Rocket className="w-3 h-3" /> Pushed live by admin
            </span>
          ) : (
            <span className="text-[11px] text-muted-foreground">Dormant</span>
          )}
          {!codeLive && (
            <div className="flex items-center gap-2">
              {saving === k && <Loader2 className="w-3.5 h-3.5 animate-spin text-muted-foreground" />}
              <Switch
                checked={effective(k) === 'live'}
                onCheckedChange={(checked) => toggle(k, checked)}
                disabled={saving === k}
              />
            </div>
          )}
        </div>
      </div>
    );
  };

  return (
    <div className="space-y-6">
      <div className="p-5 rounded-2xl border border-border bg-card">
        <div className="flex items-center gap-2 mb-1">
          <FlaskConical className="w-5 h-5 text-olo" />
          <h2 className="font-heading font-600 text-lg">Clinical feature registry</h2>
        </div>
        <p className="text-sm text-muted-foreground">
          {live.length} live · {dormant.length} dormant. Each dormant feature shows its published clinical framework and grading scale to research before pushing live.
        </p>
      </div>

      {loading ? (
        <div className="flex justify-center py-8"><Loader2 className="w-5 h-5 text-muted-foreground animate-spin" /></div>
      ) : (
        <>
          <div>
            <div className="flex items-center gap-2 mb-3">
              <CheckCircle2 className="w-4 h-4 text-emerald-500" />
              <h3 className="font-heading font-600 text-sm uppercase tracking-wider text-emerald-500">Live</h3>
              <span className="text-xs text-muted-foreground">{live.length}</span>
            </div>
            <div className="grid sm:grid-cols-2 gap-3">
              {live.map(([k, v]) => <Card key={k} k={k} v={v} />)}
            </div>
          </div>

          <div>
            <div className="flex items-center gap-2 mb-3">
              <Lock className="w-4 h-4 text-amber-500" />
              <h3 className="font-heading font-600 text-sm uppercase tracking-wider text-amber-500">Dormant</h3>
              <span className="text-xs text-muted-foreground">{dormant.length}</span>
            </div>
            <div className="space-y-2">
              {DORMANT_GROUPS.map((group) => {
                const groupItems = group.keys
                  .filter((k) => FEATURE_REGISTRY[k] && effective(k) === 'dormant')
                  .map((k) => [k, FEATURE_REGISTRY[k]]);
                if (!groupItems.length) return null;
                const isOpen = !!openGroups[group.label];
                return (
                  <Collapsible
                    key={group.label}
                    open={isOpen}
                    onOpenChange={(o) => setOpenGroups((s) => ({ ...s, [group.label]: o }))}
                    className="rounded-2xl border border-border bg-card/50 overflow-hidden"
                  >
                    <CollapsibleTrigger className="flex items-center justify-between w-full px-4 py-3 text-left hover:bg-muted/40 transition-colors">
                      <span className="flex items-center gap-2">
                        <span className="text-sm font-heading font-600">{group.label}</span>
                        <span className="text-xs text-muted-foreground">{groupItems.length}</span>
                      </span>
                      <ChevronDown className={`w-4 h-4 text-muted-foreground transition-transform ${isOpen ? 'rotate-180' : ''}`} />
                    </CollapsibleTrigger>
                    <CollapsibleContent>
                      <div className="grid sm:grid-cols-2 gap-3 p-3 pt-0">
                        {groupItems.map(([k, v]) => <Card key={k} k={k} v={v} />)}
                      </div>
                    </CollapsibleContent>
                  </Collapsible>
                );
              })}
              {(() => {
                const grouped = new Set(DORMANT_GROUPS.flatMap((g) => g.keys));
                const other = dormant.filter(([k]) => !grouped.has(k));
                if (!other.length) return null;
                return (
                  <div className="grid sm:grid-cols-2 gap-3 pt-1">
                    {other.map(([k, v]) => <Card key={k} k={k} v={v} />)}
                  </div>
                );
              })()}
            </div>
          </div>
        </>
      )}
    </div>
  );
}