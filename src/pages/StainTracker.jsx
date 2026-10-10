import { useState, useMemo, useRef } from 'react';
import { Link } from 'react-router-dom';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { unrufld } from '@/api/unrufldClient';
import { scans as insforgeScans, stainLogs } from '@/lib/insforgeDb';
import { saturateStainLoad } from '@/lib/stainLoad';
import { STAIN_CATALOG } from '@/lib/stainCatalog';
import { identifyFoodPhoto } from '@/lib/foodScan';
import { createScanProgress, FOOD_SCAN_STAGES } from '@/lib/scanProgress';
import { identifyFoodItem } from '@/lib/unrufldfood';
import { getCalories } from '@/lib/foodCalories';
import RewardReveal from '@/components/RewardReveal';
import WeekStainHistory from '@/components/WeekStainHistory';
import StainForecast from '@/components/StainForecast';
import { useToast } from '@/components/ui/use-toast';
import {
  rollDiscoveryReward,
  recordDiscovery,
  resolveFoodScanDiscovery,
  isFirstStainLog,
} from '@/lib/discoveries';
import { Droplet, ArrowRight, Palette, WifiOff, RotateCcw } from 'lucide-react';
import PageSkeleton from '@/components/loading/PageSkeleton';
import * as sim from '@/lib/stainSimulation';
import { useStainLogs, STAIN_LOGS_KEY } from '@/hooks/use-stain-logs';
import { markReferralScanned } from '@/lib/referral';
import StainLoadMeter from '@/components/staintracker/StainLoadMeter';
import StainTodayItems from '@/components/staintracker/StainTodayItems';
import StainScanCard from '@/components/staintracker/StainScanCard';
import StainCatalog from '@/components/staintracker/StainCatalog';

const todayStr = () => new Date().toISOString().slice(0, 10);

const LATEST_SCAN_KEY = ['latest-scan'];

export default function StainTracker() {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  // --- Server state via React Query ---
  const logsQuery = useStainLogs();
  const latestQuery = useQuery({
    queryKey: LATEST_SCAN_KEY,
    queryFn: async () => {
      const s = await insforgeScans.list('-created_date', 1, {});
      return s[0] || null;
    },
    staleTime: 60_000,
  });

  const logs = logsQuery.data || [];
  const latest = latestQuery.data || null;

  // --- Local UI state ---
  const [query, setQuery] = useState('');
  const [cat, setCat] = useState('all');
  const [scanning, setScanning] = useState(false);
  const [foodStage, setFoodStage] = useState(0);
  const [error, setError] = useState('');
  const [flash, setFlash] = useState(null);
  const [scanResult, setScanResult] = useState(null);
  const [modalOpen, setModalOpen] = useState(false);
  const [selected, setSelected] = useState(new Set());
  const [adding, setAdding] = useState(false);
  const [discoveryReward, setDiscoveryReward] = useState(null);
  const uploadRef = useRef(null);

  const invalidateLogs = () => queryClient.invalidateQueries({ queryKey: STAIN_LOGS_KEY });

  const today = todayStr();
  const todayItems = useMemo(() => logs.filter((l) => l.log_date === today), [logs, today]);
  const todayLoad = useMemo(
    () => saturateStainLoad(todayItems.reduce((s, l) => s + (l.stain_level || 0), 0)),
    [todayItems]
  );
  const todayCalories = useMemo(
    () => todayItems.reduce((s, l) => s + (l.calories || 0), 0),
    [todayItems]
  );
  const topStainId = useMemo(() => {
    const top = todayItems
      .filter((l) => (l.stain_level || 0) > 0)
      .sort((a, b) => (b.stain_level || 0) - (a.stain_level || 0))[0];
    return top?.id;
  }, [todayItems]);

  // Stain warning tied to habits: counts how many times the same high-stain
  // item was logged today and references the user's current shade — "You
  // logged coffee 3× today — rinse to protect your B2."
  const nudgeIfHighStain = (items) => {
    const shade = latest?.shade_code || latest?.shade;
    const high = items
      .map((i) => ({
        name: i.item?.name || i.item_name || i.name,
        stain: i.item?.stain_level ?? i.stain_level ?? 0,
      }))
      .filter((i) => i.stain >= 50)
      .sort((a, b) => b.stain - a.stain);
    if (!high.length) return;
    const top = high[0];
    const matchName = (n) => (n || '').toLowerCase() === top.name.toLowerCase();
    const existingCount = todayItems.filter((l) => matchName(l.item_name)).length;
    const newCount = items.filter((i) => matchName(i.item?.name || i.item_name || i.name)).length;
    const totalCount = existingCount + newCount;
    const shadeClause = shade ? ` to protect your ${shade}` : '';
    if (totalCount >= 3) {
      toast({
        title: `You logged ${top.name} ${totalCount}× today`,
        description: `Rinse with water now${shadeClause} — repeated exposure deepens the stain.`,
      });
    } else {
      toast({
        title: 'Rinse to minimize staining',
        description: `${top.name} is high in chromogens — rinse with water within 10 minutes${shadeClause}.`,
      });
    }
  };

  const toggleSelect = (name) => {
    setSelected((s) => {
      const next = new Set(s);
      if (next.has(name)) next.delete(name);
      else next.add(name);
      return next;
    });
  };

  const addSelected = async () => {
    if (selected.size === 0) return;
    const items = STAIN_CATALOG.filter((i) => selected.has(i.name));
    const tempIds = items.map((_, i) => `temp_${Date.now()}_${i}`);
    const tempItems = items.map((item, i) => ({
      id: tempIds[i],
      item_name: item.name,
      category: item.category,
      stain_level: item.stain_level,
      calories: getCalories(item.name) ?? 0,
      log_date: today,
      source: 'catalog',
      _saving: true,
    }));
    // Optimistic insert
    queryClient.setQueryData(STAIN_LOGS_KEY, (prev) => [...tempItems, ...(prev || [])]);
    setSelected(new Set());
    setAdding(true);
    try {
      const firsts = await Promise.all(items.map((item) => isFirstStainLog(item.name)));
      const isDiscovery = firsts.some(Boolean);
      const created = await Promise.all(
        items.map((item) =>
          stainLogs.create({
            item_name: item.name,
            category: item.category,
            stain_level: item.stain_level,
            calories: getCalories(item.name) ?? 0,
            log_date: today,
            source: 'catalog',
          })
        )
      );
      queryClient.setQueryData(STAIN_LOGS_KEY, (prev) =>
        [...created.filter(Boolean), ...(prev || []).filter((x) => !tempIds.includes(x.id))]
      );
      nudgeIfHighStain(items);
      if (isDiscovery) {
        const reward = rollDiscoveryReward('stain_log');
        if (reward) {
          await recordDiscovery(reward);
          setDiscoveryReward(reward);
        }
      }
    } catch {
      queryClient.setQueryData(STAIN_LOGS_KEY, (prev) =>
        (prev || []).filter((x) => !tempIds.includes(x.id))
      );
      setError('Could not add items. Please try again.');
    } finally {
      setAdding(false);
    }
  };

  const removeItem = async (id) => {
    // Optimistic remove
    queryClient.setQueryData(STAIN_LOGS_KEY, (prev) => (prev || []).filter((x) => x.id !== id));
    try {
      await stainLogs.remove(id);
    } catch {
      invalidateLogs(); // restore from server
      setError("Couldn't delete that — it'll reappear on reload. Try again.");
      setTimeout(() => setError(''), 3000);
    }
  };

  const correctName = async (index, newName) => {
    const logId = scanResult?.logIds?.[index];
    if (!logId) return;
    const original = scanResult?.items?.[index];
    // Re-run unrufldfood on the corrected name so the stain scores, calories
    // and category update to match the corrected food — not the original
    // (wrong) identification. Macros from the original estimate are preserved.
    const resolved = identifyFoodItem({
      name: newName,
      category: original?.item?.category || 'food',
      protein_g: original?.macros?.protein_g,
      carbs_g: original?.macros?.carbs_g,
      fat_g: original?.macros?.fat_g,
    });
    const newItem = resolved.item;
    const newScores = resolved.scores;
    const newCalories = newItem.calories ?? 0;
    try {
      await stainLogs.update(logId, {
        item_name: newItem.name,
        category: newItem.category,
        stain_level: newItem.stain_level,
        calories: newCalories,
        chromogenic: Math.round(newScores.chromogenic ?? 0),
        tannin: Math.round(newScores.tannin ?? 0),
        acidity: Math.round(newScores.acidity ?? 0),
      });
      setScanResult((prev) => {
        if (!prev) return prev;
        const items = [...prev.items];
        items[index] = {
          ...items[index],
          item: { ...items[index].item, ...newItem },
          scores: newScores,
          confidence: resolved.confidence,
          macros: resolved.macros,
        };
        return { ...prev, items };
      });
      queryClient.setQueryData(STAIN_LOGS_KEY, (prev) =>
        (prev || []).map((log) =>
          log.id === logId
            ? { ...log, item_name: newItem.name, category: newItem.category, stain_level: newItem.stain_level, calories: newCalories }
            : log
        )
      );
    } catch {
      setError("Couldn't update the name — try again.");
      setTimeout(() => setError(''), 3000);
    }
  };

  const logProtective = async (action) => {
    const isRinse = action === 'rinse';
    const name = isRinse ? 'Drank water' : 'Brushed teeth';
    const reduction = isRinse ? -15 : -30;
    try {
      const created = await stainLogs.create({
        item_name: name,
        category: 'protective',
        stain_level: reduction,
        log_date: today,
        source: 'custom',
      });
      queryClient.setQueryData(STAIN_LOGS_KEY, (prev) => [created, ...(prev || [])]);
      if (isRinse) sim.drinkWater();
      else sim.brushTeeth();
      toast({
        title: isRinse ? 'Water logged' : 'Brush logged',
        description: isRinse
          ? 'Stain load reduced. Your shade estimate is mitigated too.'
          : 'Stain load reduced. Your shade estimate is restored to your last scan.',
      });
    } catch {
      setError("Couldn't log that — try again.");
      setTimeout(() => setError(''), 3000);
    }
  };

  const handleApplyStain = (items) => {
    const hasWater = items.some(
      (it) =>
        (it.item?.name || '').toLowerCase().includes('water') || it.item?.category === 'protective'
    );
    items.forEach((it) => {
      const name = (it.item?.name || '').toLowerCase();
      if (name.includes('water') || it.item?.category === 'protective') return;
      sim.applyStain(it.item, hasWater);
    });
    toast({ title: 'Counted on your smile', description: 'Your shade estimate has been updated.' });
  };

  const scanFood = async (file) => {
    if (!file) return;
    setError('');
    setScanning(true);
    setScanResult(null);
    const progress = createScanProgress(setFoodStage, FOOD_SCAN_STAGES);
    try {
      const check = await unrufld.functions.invoke('scanQuota', { op: 'check', cost: 1 });
      if (!check?.data?.allowed) {
        setError(check?.data?.reason || "You're out of scans. Grab a pack to keep scanning.");
        setScanResult({ rejected: true, message: check?.data?.reason || "You're out of scans." });
        return;
      }
      const res = await identifyFoodPhoto(unrufld, file, progress.advance);
      if (res.rejected) {
        setScanResult({ rejected: true, message: res.message });
        return;
      }
      const { items, file_url } = res;
      await progress.advance(5);
      const surface = await resolveFoodScanDiscovery(items);
      const created = await Promise.all(
        items.map((it) =>
          stainLogs.create({
            item_name: it.item.name,
            category: it.item.category,
            stain_level: it.item.stain_level,
            calories: it.item.calories ?? 0,
            log_date: today,
            source: it.matched ? 'catalog' : 'ai_scan',
            image_url: file_url,
            chromogenic: Math.round(it.scores?.chromogenic ?? 0),
            tannin: Math.round(it.scores?.tannin ?? 0),
            acidity: Math.round(it.scores?.acidity ?? 0),
          })
        )
      );
      await unrufld.functions.invoke('scanQuota', { op: 'consume', cost: 1 }).catch(() => {});
      // A successful food scan also qualifies the referral (same as a teeth scan).
      markReferralScanned();
      queryClient.setQueryData(STAIN_LOGS_KEY, (prev) => [...created.filter(Boolean), ...(prev || [])]);
      nudgeIfHighStain(items);
      setFlash({ items, file_url });
      setScanResult({ items, file_url, logIds: created.map((c) => c?.id || null) });
      setTimeout(() => setFlash(null), 4000);
      if (surface) {
        const reward = rollDiscoveryReward(surface);
        if (reward) {
          await recordDiscovery(reward);
          setDiscoveryReward(reward);
        }
      }
      await progress.finish();
    } catch {
      setError("Couldn't identify that — try picking from the catalog instead.");
      setScanResult({ rejected: true, message: "Couldn't identify that — try again." });
    } finally {
      setScanning(false);
    }
  };

  const filtered = STAIN_CATALOG.filter(
    (i) => (cat === 'all' || i.category === cat) && i.name.toLowerCase().includes(query.toLowerCase())
  );

  const insight = useMemo(() => {
    const shade = latest?.shade_code || latest?.shade;
    if (todayLoad < 30)
      return { tone: 'good', text: `Light stain day — your ${shade || 'smile'} is safe today.` };
    if (todayLoad < 60)
      return {
        tone: 'warn',
        text: `Moderate stain pressure today. Rinse with water after each item to halve the impact on your ${shade || 'teeth'}.`,
      };
    return {
      tone: 'alert',
      text: `High stain day — your ${shade || 'teeth'} is under heavy chromogenic pressure. Brush tonight and rinse after each drink.`,
    };
  }, [todayLoad, latest]);
  const insightCls =
    insight.tone === 'good'
      ? 'bg-olo/10 text-olo'
      : insight.tone === 'warn'
        ? 'bg-warning-soft text-warning'
        : 'bg-danger-soft text-danger';

  if (logsQuery.isLoading) {
    return (
      <div className="max-w-2xl mx-auto">
        <Link
          to="/dashboard"
          className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-olo transition-colors mb-5"
        >
          <ArrowRight className="w-4 h-4 rotate-180" /> Back to dashboard
        </Link>
        <div className="flex items-center gap-3 mb-2">
          <div className="w-11 h-11 rounded-2xl bg-olo/10 flex items-center justify-center">
            <Droplet className="w-6 h-6 text-olo" />
          </div>
          <div>
            <h1 className="font-heading font-700 text-2xl tracking-tight">Stain tracker</h1>
            <p className="text-sm text-muted-foreground">
              Log what you eat & drink — track stain load and calories.
            </p>
          </div>
        </div>
        <PageSkeleton compact className="mt-6" />
      </div>
    );
  }

  if (logsQuery.isError && !logsQuery.data) {
    return (
      <div className="max-w-2xl mx-auto">
        <Link
          to="/dashboard"
          className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-olo transition-colors mb-5"
        >
          <ArrowRight className="w-4 h-4 rotate-180" /> Back to dashboard
        </Link>
        <div className="max-w-md mx-auto text-center py-16 px-4">
          <div className="w-14 h-14 rounded-2xl bg-danger-soft flex items-center justify-center mx-auto mb-5">
            <WifiOff className="w-7 h-7 text-danger" />
          </div>
          <h2 className="font-heading font-700 text-xl mb-2">We couldn't load your stain log</h2>
          <p className="text-sm text-muted-foreground mb-6">
            Your logged items are safe — this is usually a connection hiccup. Check your signal and
            try again.
          </p>
          <button
            onClick={() => invalidateLogs()}
            className="inline-flex items-center gap-2 bg-olo text-white font-semibold px-5 py-2.5 rounded-xl hover:scale-105 transition-transform olo-glow"
          >
            <RotateCcw className="w-4 h-4" /> Try again
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-2xl mx-auto">
      <Link
        to="/dashboard"
        className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-olo transition-colors mb-5"
      >
        <ArrowRight className="w-4 h-4 rotate-180" /> Back to dashboard
      </Link>

      <div className="flex items-center gap-3 mb-2">
        <div className="w-11 h-11 rounded-2xl bg-olo/10 flex items-center justify-center">
          <Droplet className="w-6 h-6 text-olo" />
        </div>
        <div>
          <h1 className="font-heading font-700 text-2xl tracking-tight">Stain tracker</h1>
          <p className="text-sm text-muted-foreground">
            Log what you eat & drink — track stain load and calories.
          </p>
        </div>
      </div>

      <StainScanCard
        scanning={scanning}
        activeStep={foodStage}
        modalOpen={modalOpen}
        setModalOpen={setModalOpen}
        uploadRef={uploadRef}
        onUpload={scanFood}
        flash={flash}
        error={error}
        scanResult={scanResult}
        onDismissResult={() => setScanResult(null)}
        onCorrectName={correctName}
        onApplyStain={handleApplyStain}
      />

      <StainLoadMeter
        todayLoad={todayLoad}
        todayCalories={todayCalories}
        insight={insight}
        insightCls={insightCls}
        onRinse={() => logProtective('rinse')}
        onBrush={() => logProtective('brush')}
      />

      <WeekStainHistory logs={logs} />
      <StainForecast logs={logs} />

      <StainTodayItems todayItems={todayItems} topStainId={topStainId} onRemove={removeItem} />

      {discoveryReward && (
        <RewardReveal reward={discoveryReward} onClose={() => setDiscoveryReward(null)} />
      )}

      <StainCatalog
        query={query}
        setQuery={setQuery}
        cat={cat}
        setCat={setCat}
        filtered={filtered}
        selected={selected}
        toggleSelect={toggleSelect}
        onClear={() => setSelected(new Set())}
        onAdd={addSelected}
        adding={adding}
      />

      <Link
        to="/shade-tracker"
        className="mt-4 flex items-center gap-3 p-4 rounded-2xl border border-border bg-card hover:border-olo/40 transition-colors group"
      >
        <div className="w-10 h-10 rounded-xl bg-olo/10 flex items-center justify-center flex-shrink-0">
          <Palette className="w-5 h-5 text-olo" />
        </div>
        <div className="flex-1">
          <p className="font-heading font-600 text-sm">Shade tracker</p>
          <p className="text-xs text-muted-foreground">
            See your shade over time with live estimates between scans.
          </p>
        </div>
        <ArrowRight className="w-4 h-4 text-olo group-hover:translate-x-1 transition-transform" />
      </Link>

      <div className="mt-8 p-3 rounded-xl bg-warning-soft border border-warning/20 text-warning text-xs text-center">
        Stain impact is a wellness estimate, not a clinical measurement. Your real shade depends on
        hygiene, enamel, and timing.
      </div>
    </div>
  );
}