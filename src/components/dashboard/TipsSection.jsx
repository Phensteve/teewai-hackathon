import { useState, useEffect, useCallback } from 'react';
import { tips as tipsTable } from '@/lib/insforgeDb';
import TipCard from './TipCard';
import Spinner from '@/components/Spinner';

// Loads active tips from the Tip entity (admin-defined sort order) and renders
// them as an accordion: only one tip expanded at a time. Opening one smoothly
// collapses others. Falls back to an empty state if no tips are configured.

export default function TipsSection() {
  const [tips, setTips] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);
  const [expandedId, setExpandedId] = useState(null);

  const loadTips = useCallback(async () => {
    setLoading(true);
    setError(false);
    try {
      const all = await tipsTable.list('sort_order', 100);
      const active = (all || []).filter((t) => t.active);
      setTips(active);
    } catch (e) {
      console.error('TipsSection load failed:', e);
      setError(true);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { loadTips(); }, [loadTips]);

  const toggle = useCallback((id) => {
    setExpandedId((prev) => (prev === id ? null : id));
  }, []);

  if (loading) {
    return (
      <div className="mb-4 flex items-center gap-2 text-sm text-muted-foreground">
        <Spinner size={20} /> Loading tips…
      </div>
    );
  }

  if (error || tips.length === 0) return null;

  return (
    <div className="space-y-2.5">
      {tips.map((tip) => (
        <TipCard
          key={tip.id}
          tip={tip}
          expanded={expandedId === tip.id}
          onToggle={() => toggle(tip.id)}
        />
      ))}
    </div>
  );
}