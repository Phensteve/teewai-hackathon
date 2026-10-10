import { useState } from 'react';
import { unrufld } from '@/api/unrufldClient';
import { Send, Loader2, Minus, Plus, CheckCircle2, Search } from 'lucide-react';

// Send scans to another teewai user by username or display name.
export default function TransferScans({ available = 0, onDone }) {
  const [identifier, setIdentifier] = useState('');
  const [amount, setAmount] = useState(1);
  const [found, setFound] = useState(null);
  const [checking, setChecking] = useState(false);
  const [sending, setSending] = useState(false);
  const [error, setError] = useState('');
  const [done, setDone] = useState('');

  const setCount = (n) => setAmount(Math.max(1, Math.min(Math.max(1, available), n)));

  const lookup = async () => {
    setError('');
    setDone('');
    setFound(null);
    if (identifier.trim().length < 3) { setError('Enter a username or display name.'); return; }
    setChecking(true);
    try {
      const res = await unrufld.functions.invoke('transferScans', { op: 'lookup', identifier: identifier.trim() });
      if (res.data?.found) setFound(res.data);
      else setError(res.data?.self ? "That's you — pick someone else." : "We couldn't find that user.");
    } catch (e) {
      setError(e?.message || 'Could not check that user.');
    } finally {
      setChecking(false);
    }
  };

  const send = async () => {
    setError('');
    // Client-side TOCTOU guard: `available` can go stale between the lookup
    // and the send (e.g. a concurrent scan consumed a credit). Re-check before
    // firing so we never request more than the user actually has left.
    if (amount < 1 || amount > available) {
      setError(`You only have ${available} scan${available === 1 ? '' : 's'} to send.`);
      return;
    }
    setSending(true);
    try {
      const res = await unrufld.functions.invoke('transferScans', { op: 'transfer', identifier: identifier.trim(), amount });
      if (res.data?.ok) {
        setDone(`Sent ${res.data.sent} scan${res.data.sent === 1 ? '' : 's'} to ${res.data.to}.`);
        setIdentifier('');
        setFound(null);
        setAmount(1);
        onDone?.();
      } else {
        setError(res.data?.error || 'Transfer failed.');
      }
    } catch (e) {
      setError(e?.message || 'Transfer failed.');
    } finally {
      setSending(false);
    }
  };

  return (
    <div className="mb-8 p-6 rounded-3xl border border-border bg-card">
      <div className="flex items-center gap-2 mb-1">
        <Send className="w-5 h-5 text-olo" />
        <h2 className="font-heading font-700 text-xl">Send scans to a friend</h2>
      </div>
      <p className="text-sm text-muted-foreground mb-5">
        Gift scans by username or display name. You have {available} scan{available === 1 ? '' : 's'} to give.
      </p>

      <div className="flex flex-col sm:flex-row gap-3">
        <input
          value={identifier}
          onChange={(e) => { setIdentifier(e.target.value); setFound(null); }}
          placeholder="@username or display name"
          className="flex-1 px-4 py-2.5 rounded-xl border border-border bg-background text-base focus:outline-none focus:border-olo"
        />
        <button
          onClick={lookup}
          disabled={checking || !identifier.trim()}
          className="inline-flex items-center justify-center gap-2 border border-olo text-olo font-semibold px-5 py-2.5 rounded-xl hover:bg-olo/5 transition-colors disabled:opacity-50"
        >
          {checking ? <Loader2 className="w-4 h-4 animate-spin" /> : <Search className="w-4 h-4" />}
          Find
        </button>
      </div>

      {found && (
        <div className="mt-4">
          <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-olo/10 text-olo text-sm font-medium mb-4">
            <CheckCircle2 className="w-4 h-4" />
            Sending to {found.username ? `@${found.username}` : found.display_name}
          </div>
          <div className="flex items-center gap-3">
            <button onClick={() => setCount(amount - 1)} className="w-10 h-10 rounded-xl border border-border hover:border-olo/40 flex items-center justify-center" aria-label="Fewer scans">
              <Minus className="w-4 h-4" />
            </button>
            <div className="text-center min-w-[4rem]">
              <p className="font-heading font-800 text-2xl">{amount}</p>
              <p className="text-xs text-muted-foreground">scans</p>
            </div>
            <button onClick={() => setCount(amount + 1)} className="w-10 h-10 rounded-xl border border-border hover:border-olo/40 flex items-center justify-center" aria-label="More scans">
              <Plus className="w-4 h-4" />
            </button>
            <button
              onClick={send}
              disabled={sending || available < 1}
              className="sm:ml-auto inline-flex items-center justify-center gap-2 bg-olo text-white font-semibold px-6 py-3 rounded-2xl hover:scale-105 transition-transform disabled:opacity-50"
            >
              {sending ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
              Send scans
            </button>
          </div>
        </div>
      )}

      {error && <p className="text-sm text-destructive mt-3">{error}</p>}
      {done && <p className="text-sm text-olo mt-3">{done}</p>}
    </div>
  );
}