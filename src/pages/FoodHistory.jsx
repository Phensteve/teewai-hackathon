// FoodHistory — dedicated page for the full food scan history (every logged
// day with expandable items + infinite scroll). Keeps the stain tracker compact
// by moving the ever-growing history list here.

import { useState, useEffect, useMemo } from 'react';
import { Link } from 'react-router-dom';
import { stainLogs } from '@/lib/insforgeDb';
import { saturateStainLoad } from '@/lib/stainLoad';
import StainHistoryList from '@/components/StainHistoryList';
import PageSkeleton from '@/components/loading/PageSkeleton';
import { Droplet, ArrowRight } from 'lucide-react';

const todayStr = () => new Date().toISOString().slice(0, 10);

export default function FoodHistory() {
  const [logs, setLogs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const load = async () => {
    setLoading(true);
    try {
      const all = await stainLogs.list('-created_date', 500);
      setLogs(all);
    } catch {
      setError('Could not load your history. Try again.');
    } finally {
      setLoading(false);
    }
  };
  useEffect(() => { load(); }, []);

  const removeItem = async (id) => {
    try {
      await stainLogs.remove(id);
      setLogs((l) => l.filter((x) => x.id !== id));
    } catch {
      setError("Couldn't delete that — it'll reappear on reload. Try again.");
      setTimeout(() => setError(''), 3000);
    }
  };

  // Summary stats across all logged days.
  const stats = useMemo(() => {
    const today = todayStr();
    const todayItems = logs.filter((l) => l.log_date === today);
    const todayLoad = saturateStainLoad(todayItems.reduce((s, l) => s + (l.stain_level || 0), 0));
    const totalCalories = logs.reduce((s, l) => s + (l.calories || 0), 0);
    const daySet = new Set(logs.map((l) => l.log_date).filter(Boolean));
    return { todayLoad, totalCalories, totalDays: daySet.size, totalItems: logs.length };
  }, [logs]);

  if (loading) {
    return (
      <div className="max-w-2xl mx-auto">
        <Link to="/stain-tracker" className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-olo transition-colors mb-5">
          <ArrowRight className="w-4 h-4 rotate-180" /> Back to stain tracker
        </Link>
        <div className="flex items-center gap-3 mb-2">
          <div className="w-11 h-11 rounded-2xl bg-olo/10 flex items-center justify-center"><Droplet className="w-6 h-6 text-olo" /></div>
          <div>
            <h1 className="font-heading font-700 text-2xl tracking-tight">Food scan history</h1>
            <p className="text-sm text-muted-foreground">Every food & drink you've logged.</p>
          </div>
        </div>
        <PageSkeleton compact className="mt-6" />
      </div>
    );
  }

  return (
    <div className="max-w-2xl mx-auto">
      <Link to="/stain-tracker" className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-olo transition-colors mb-5">
        <ArrowRight className="w-4 h-4 rotate-180" /> Back to stain tracker
      </Link>

      <div className="flex items-center gap-3 mb-2">
        <div className="w-11 h-11 rounded-2xl bg-olo/10 flex items-center justify-center"><Droplet className="w-6 h-6 text-olo" /></div>
        <div>
          <h1 className="font-heading font-700 text-2xl tracking-tight">Food scan history</h1>
          <p className="text-sm text-muted-foreground">Every food & drink you've logged.</p>
        </div>
      </div>

      {/* Summary chips */}
      <div className="mt-5 grid grid-cols-3 gap-2">
        <div className="rounded-2xl bg-muted/50 px-3 py-2.5 border-l-2 border-olo">
          <p className="text-[10px] uppercase tracking-wide text-muted-foreground">Days tracked</p>
          <p className="font-heading font-700 text-base">{stats.totalDays}</p>
        </div>
        <div className="rounded-2xl bg-muted/50 px-3 py-2.5 border-l-2" style={{ borderColor: '#f59e0b' }}>
          <p className="text-[10px] uppercase tracking-wide text-muted-foreground">Total kcal</p>
          <p className="font-heading font-700 text-base">{stats.totalCalories.toLocaleString()}</p>
        </div>
        <div className="rounded-2xl bg-muted/50 px-3 py-2.5 border-l-2" style={{ borderColor: '#14b8a6' }}>
          <p className="text-[10px] uppercase tracking-wide text-muted-foreground">Items logged</p>
          <p className="font-heading font-700 text-base">{stats.totalItems}</p>
        </div>
      </div>

      {error && <p className="mt-4 text-xs text-danger">{error}</p>}

      {/* Full history list */}
      <div className="mt-5">
        <div className="flex items-center gap-2 mb-3">
          <h2 className="font-heading font-600 text-sm">History</h2>
          <span className="text-[11px] text-muted-foreground">{stats.totalDays} day{stats.totalDays === 1 ? '' : 's'}</span>
        </div>
        <StainHistoryList logs={logs} onRemove={removeItem} />
      </div>
    </div>
  );
}