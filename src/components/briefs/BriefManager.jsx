import { useState, useEffect, useCallback } from 'react';
import { createPortal } from 'react-dom';
import { fetchBriefData, getPendingBriefs, markBriefRead, markBriefDismissed, buildDailyBrief, buildWeeklyBrief, getDailyTitle, getWeeklyTitle, getActiveWeekStart } from '@/lib/briefData';
// Showing a popup records a "shown today" mark (same shape as dismissed:
// briefKey|today). This gives the same-evening block the spec requires — a
// second open the same day never re-pops — while still carrying over to the
// next morning if the user closes without reading (Part 3). "Got it" clears
// the mark and sets read, which stops all future pops for the period.
import { Calendar, X, ChevronRight } from 'lucide-react';
import Spinner from '@/components/Spinner';
import DailyBrief from '@/components/briefs/DailyBrief';
import WeeklyBrief from '@/components/briefs/WeeklyBrief';

// Popup only for daily & weekly. Monthly/yearly use sleek alerts
// (BriefSleekAlert). "Got it" = read (stops all future pops for this period).
// X / outside click / Escape = dismissed (allows morning carry-over).
export default function BriefManager() {
  const [pending, setPending] = useState([]);
  const [current, setCurrent] = useState(null);
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    setPending(getPendingBriefs());
  }, []);

  const showBrief = useCallback(async (item) => {
    setLoading(true);
    try {
      const briefData = await fetchBriefData();
      setData(briefData);
      setCurrent(item);
      // Record "shown today" only once the popup is actually on screen, so a
      // failed data fetch doesn't suppress the next open. Same shape as
      // dismissed (briefKey|today): same-evening block + next-morning carry-over.
      markBriefDismissed(item.type);
    } catch {} finally { setLoading(false); }
  }, []);

  useEffect(() => {
    if (pending.length > 0 && !current && !loading) {
      showBrief(pending[0]);
    }
  }, [pending, current, loading, showBrief]);

  const handleRead = useCallback(() => {
    if (current) markBriefRead(current.type);
    setCurrent(null);
    setData(null);
    setPending(getPendingBriefs());
  }, [current]);

  const handleDismiss = useCallback(() => {
    if (current) markBriefDismissed(current.type);
    setCurrent(null);
    setData(null);
    setPending(getPendingBriefs());
  }, [current]);

  useEffect(() => {
    if (!current) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => { document.body.style.overflow = prev; };
  }, [current]);

  useEffect(() => {
    if (!current) return;
    const onKey = (e) => { if (e.key === 'Escape') handleDismiss(); };
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [current, handleDismiss]);

  const buildContent = (item) => {
    if (!data) return null;
    if (item.type === 'daily') return <DailyBrief data={buildDailyBrief(data, item.referenceDate)} />;
    if (item.type === 'weekly') return <WeeklyBrief data={buildWeeklyBrief(data)} />;
    return null;
  };

  const getTitle = (item) => {
    if (item.type === 'daily') return getDailyTitle(item.referenceDate || new Date());
    if (item.type === 'weekly') return getWeeklyTitle(item.referenceDate || getActiveWeekStart(new Date()));
    return '';
  };

  if (!current) return null;

  return createPortal(
    <div
      className="fixed inset-0 z-[80] flex items-center justify-center bg-background/80 backdrop-blur-sm p-4"
      onClick={(e) => { if (e.target === e.currentTarget) handleDismiss(); }}
    >
      <div className="relative w-full max-w-[540px] max-h-[90vh] flex flex-col bg-card border border-border rounded-3xl shadow-2xl animate-modal-scale-in overflow-hidden">
        <div className="flex items-center justify-between px-5 py-4 bg-card border-b border-border flex-shrink-0">
          <div className="flex items-center gap-2">
            <Calendar className="w-5 h-5 text-olo" />
            <h2 className="font-heading font-700 text-lg">{getTitle(current)}</h2>
          </div>
          <button
            onClick={handleDismiss}
            className="w-8 h-8 rounded-full bg-muted/60 flex items-center justify-center text-muted-foreground hover:text-foreground transition-colors"
            aria-label="Close"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
        <div className="px-5 py-5 overflow-y-auto flex-1">
          {loading ? (
            <div className="flex justify-center py-12"><Spinner /></div>
          ) : (
            buildContent(current)
          )}
        </div>
        <div className="px-5 py-4 bg-card border-t border-border flex-shrink-0">
          <button
            onClick={handleRead}
            className="w-full inline-flex items-center justify-center gap-2 bg-olo text-white font-semibold py-3 rounded-xl active:scale-95 transition-transform olo-glow"
          >
            Got it <ChevronRight className="w-4 h-4" />
          </button>
        </div>
      </div>
    </div>,
    document.body
  );
}