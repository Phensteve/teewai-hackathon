import { useState, useMemo, useRef, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { unrufld } from '@/api/unrufldClient';
import { stainLogs } from '@/lib/insforgeDb';
import { identifyFoodPhoto } from '@/lib/foodScan';
import { createScanProgress, FOOD_SCAN_STAGES } from '@/lib/scanProgress';
import { saturateStainLoad } from '@/lib/stainLoad';
import { Camera, Upload, Droplet, ArrowRight } from 'lucide-react';
import Spinner from '@/components/Spinner';
import FoodScanModal from '@/components/FoodScanModal';
import AnalysisRitual from '@/components/scan/AnalysisRitual';
import RewardReveal from '@/components/RewardReveal';
import { rollDiscoveryReward, recordDiscovery, resolveFoodScanDiscovery } from '@/lib/discoveries';
import { markReferralScanned } from '@/lib/referral';

const todayStr = () => new Date().toISOString().slice(0, 10);
const stainColor = (lvl) => lvl >= 60 ? 'bg-danger' : lvl >= 30 ? 'bg-warning' : lvl > 0 ? 'bg-olo' : 'bg-muted-foreground/40';

// Compact quick-scan card — replaces the old companion vitality card.
// Shows today's stain load and lets the user snap or upload a food photo
// right from the dashboard, without navigating to the stain tracker.
export default function QuickStainCard() {
  const [todayLoad, setTodayLoad] = useState(0);
  const [scanning, setScanning] = useState(false);
  const [foodStage, setFoodStage] = useState(0);
  const [error, setError] = useState('');
  const [flash, setFlash] = useState(null);
  const [scanResult, setScanResult] = useState(null);
  const [modalOpen, setModalOpen] = useState(false);
  const [discoveryReward, setDiscoveryReward] = useState(null);
  const uploadRef = useRef(null);
  const today = todayStr();

  const loadToday = async () => {
    try {
      const logs = await stainLogs.list('-created_date', 200);
      const raw = logs.filter((l) => l.log_date === today).reduce((s, l) => s + (l.stain_level || 0), 0);
      setTodayLoad(saturateStainLoad(raw));
    } catch {}
  };
  useEffect(() => { loadToday(); }, []);

  const scanFood = async (file) => {
    if (!file) return;
    setError(''); setScanning(true);
    const progress = createScanProgress(setFoodStage, FOOD_SCAN_STAGES);
    try {
      const check = await unrufld.functions.invoke('scanQuota', { op: 'check', cost: 1 });
      if (!check?.data?.allowed) {
        setError(check?.data?.reason || "You're out of scans. Grab a pack to keep scanning.");
        setScanning(false);
        return;
      }
      // Shared Cal AI-style pipeline (same engine as the full stain tracker):
      // portion-aware calories, food-validation gate, catalog + discovered
      // food matching — replaces the old primitive hardcoded prompt.
      const res = await identifyFoodPhoto(unrufld, file, progress.advance);
      if (res.rejected) { setError(res.message); setScanResult({ rejected: true, message: res.message }); setScanning(false); return; }
      const { items, file_url } = res;
      await progress.advance(5);
      // Resolve the discovery surface BEFORE creating logs (first-log check
      // must run while no log for these items exists yet).
      const surface = await resolveFoodScanDiscovery(items);
      await Promise.all(
        items.map((it) => stainLogs.create({
          item_name: it.item.name, category: it.item.category, stain_level: it.item.stain_level,
          calories: it.item.calories ?? 0, log_date: today, source: it.matched ? 'catalog' : 'ai_scan',
          image_url: file_url,
        }))
      );
      await unrufld.functions.invoke('scanQuota', { op: 'consume', cost: 1 }).catch(() => {});
      // A successful food scan also qualifies the referral (same as a teeth scan).
      markReferralScanned();
      setFlash({ items });
      setScanResult({ items, file_url });
      setTimeout(() => setFlash(null), 3500);
      loadToday();
      // Discovery drop — uncommon-or-better charm + XP, persisted to the Collection.
      if (surface) {
        const reward = rollDiscoveryReward(surface);
        if (reward) {
          await recordDiscovery(reward);
          setDiscoveryReward(reward);
        }
      }
      await progress.finish();
    } catch {
      setError("Couldn't identify that — try the stain tracker catalog.");
      setScanResult({ rejected: true, message: "Couldn't identify that — try again." });
    } finally { setScanning(false); }
  };

  return (
    <div className="relative animate-fade-up">
      <div className="absolute -inset-4 rounded-[2.5rem] blur-3xl pointer-events-none"
        style={{ background: 'radial-gradient(60% 60% at 50% 38%, hsl(var(--olo-glow) / 0.22), transparent 72%)' }} />
      <div className="relative overflow-hidden rounded-3xl bg-olo-deep text-white ring-1 ring-white/10 frost-edge">
        <div className="absolute inset-0 radial-olo opacity-40" />
        <div className="absolute -top-16 -right-8 w-48 h-48 bg-olo-glow/15 rounded-full blur-3xl pointer-events-none" />

        <div className="relative z-10 p-4">
          <div className="flex items-center gap-2 mb-3">
            <div className="w-8 h-8 rounded-lg bg-olo/20 flex items-center justify-center flex-shrink-0">
              <Droplet className="w-4 h-4 text-olo-glow" />
            </div>
            <div className="flex-1 min-w-0">
              <p className="font-heading font-600 text-sm">Today's stain load</p>
              <p className="text-[11px] text-white/50">Snap a meal to log its impact</p>
            </div>
            <span className="font-heading font-700 text-xl">{todayLoad}</span>
          </div>

          {/* Mini load bar */}
          <div className="h-2 rounded-full bg-white/10 overflow-hidden mb-3">
            <div className={`h-full rounded-full transition-all ${stainColor(todayLoad)}`}
              style={{ width: `${Math.min(100, todayLoad)}%` }} />
          </div>

          {/* Camera + Upload buttons */}
          <div className="flex gap-2">
            <button
              onClick={() => setModalOpen(true)}
              disabled={scanning}
              className="flex-1 inline-flex items-center justify-center gap-1.5 bg-white text-olo font-semibold py-2.5 rounded-xl text-xs active:scale-95 transition-transform disabled:opacity-60"
            >
              {scanning ? <Spinner size={14} /> : <Camera className="w-3.5 h-3.5" />} Camera
            </button>
            <button
              onClick={() => uploadRef.current?.click()}
              disabled={scanning}
              className="flex-1 inline-flex items-center justify-center gap-1.5 bg-white/10 border border-white/15 text-white font-semibold py-2.5 rounded-xl text-xs active:scale-95 transition-transform disabled:opacity-60"
            >
              <Upload className="w-3.5 h-3.5" /> Upload
            </button>
          </div>

          {/* Hidden upload input — camera uses the FoodScanModal */}
          <input ref={uploadRef} type="file" accept="image/*" className="hidden"
            onChange={(e) => { scanFood(e.target.files?.[0]); e.target.value = ''; }} />

          {scanning && !modalOpen && <div className="mt-5"><AnalysisRitual stages={FOOD_SCAN_STAGES} activeStep={foodStage} loading={scanning} variant="dark" /></div>}

          {/* Flash result — per-item nutritional breakdown (calories + macros) */}
          {flash && !scanning && (
            <div className="mt-2.5 space-y-1.5">
              {flash.items.map((it, i) => {
                const m = it.macros || {};
                const kcal = it.item.calories || 0;
                const macroStr = (m.protein_g || m.carbs_g || m.fat_g)
                  ? ` · P${m.protein_g || 0}g C${m.carbs_g || 0}g F${m.fat_g || 0}g`
                  : '';
                return (
                  <div key={i} className="flex items-center gap-2 text-[11px] text-white/85 bg-white/10 border border-white/15 rounded-xl px-2.5 py-1.5">
                    <Droplet className="w-3 h-3 text-olo-glow flex-shrink-0" />
                    <span className="truncate flex-1">{it.item.name} · {it.item.stain_level} stain</span>
                    <span className="font-semibold text-white flex-shrink-0 whitespace-nowrap">{kcal} kcal{macroStr}</span>
                  </div>
                );
              })}
            </div>
          )}
          {error && <p className="mt-2.5 text-[11px] text-danger">{error}</p>}

          <Link to="/stain-tracker" className="mt-2.5 inline-flex items-center gap-1 text-[11px] text-white/60 hover:text-white transition-colors">
            Full stain tracker <ArrowRight className="w-3 h-3" />
          </Link>
        </div>
      </div>

      {/* Cal AI-style full-screen camera modal */}
      <FoodScanModal
        open={modalOpen}
        onClose={() => setModalOpen(false)}
        onCapture={scanFood}
        scanning={scanning}
        activeStep={foodStage}
        result={scanResult}
        onDismissResult={() => setScanResult(null)}
      />

      {discoveryReward && (
        <RewardReveal reward={discoveryReward} onClose={() => setDiscoveryReward(null)} />
      )}
    </div>
  );
}