import { useState } from 'react';
import { Flag } from 'lucide-react';
import { setBaseline, isFlagged } from '@/lib/baseline';

// Compact "Set baseline" button for scan history entries. Lives inside a
// <Link> so it stops propagation to avoid navigating on click.
// Disabled for flagged scans (color correcting product detected) because
// their shade readings are distorted and would corrupt progress data.
export default function SetBaselineButton({ scan, isCurrentBaseline, onSet }) {
  const [saving, setSaving] = useState(false);

  if (isFlagged(scan)) {
    return (
      <span className="inline-flex items-center gap-1 text-[10px] font-medium text-violet-600 dark:text-violet-400 bg-violet-500/10 px-2 py-0.5 rounded-full" title="Color correcting product detected — cannot be baseline">
        Distorted
      </span>
    );
  }

  if (isCurrentBaseline) {
    return (
      <span className="inline-flex items-center gap-1 text-[10px] font-semibold text-olo bg-olo/15 px-2 py-0.5 rounded-full">
        <Flag className="w-2.5 h-2.5" /> Baseline
      </span>
    );
  }

  const handleClick = async (e) => {
    e.preventDefault();
    e.stopPropagation();
    setSaving(true);
    try {
      await setBaseline(scan.id, scan.created_date);
      onSet(scan);
    } catch {
      setSaving(false);
    }
  };

  return (
    <button
      onClick={handleClick}
      disabled={saving}
      className="inline-flex items-center gap-1 text-[10px] font-medium text-muted-foreground hover:text-olo px-2 py-0.5 rounded-full border border-border hover:border-olo/40 transition-colors"
    >
      {saving ? <span className="w-2.5 h-2.5 border-2 border-muted border-t-olo rounded-full animate-spin" /> : <Flag className="w-2.5 h-2.5" />}
      Set baseline
    </button>
  );
}