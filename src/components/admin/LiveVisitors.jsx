import { useEffect, useState } from 'react';
import { adminAuth } from '@/lib/adminAuth';
import { Globe, Loader2 } from 'lucide-react';

// Shopify-style live visitor counter: a globe icon + the number of sessions
// with a heartbeat in the last 3 minutes. Polls every 10s.
export default function LiveVisitors() {
  const [active, setActive] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const load = async () => {
    try {
      const res = await adminAuth.liveVisitors();
      setActive(res.active);
      setError('');
    } catch (e) {
      setError(e?.message || 'Could not load live visitors');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
    const id = setInterval(load, 10000);
    return () => clearInterval(id);
  }, []);

  return (
    <div className="p-5 rounded-3xl border border-border bg-card mb-6">
      <div className="flex items-center gap-4">
        <div className="relative w-14 h-14 rounded-2xl bg-olo/10 flex items-center justify-center flex-shrink-0">
          <Globe className="w-7 h-7 text-olo" />
          <span className="absolute -top-0.5 -right-0.5 w-3.5 h-3.5 rounded-full bg-success border-2 border-card" />
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <h2 className="font-heading font-600 text-lg">Active visitors</h2>
            <span className="relative flex w-2 h-2">
              <span className="absolute inline-flex w-full h-full rounded-full bg-success animate-ping opacity-75" />
              <span className="relative inline-flex w-2 h-2 rounded-full bg-success" />
            </span>
          </div>
          {error ? (
            <p className="text-sm text-destructive mt-1">{error}</p>
          ) : (
            <>
              <p className="text-3xl font-heading font-800 text-olo mt-1 leading-tight">
                {loading && active === null ? <Loader2 className="w-6 h-6 animate-spin inline" /> : (active ?? 0)}
              </p>
              <p className="text-xs text-muted-foreground">Live right now · updates every 10s</p>
            </>
          )}
        </div>
      </div>
    </div>
  );
}