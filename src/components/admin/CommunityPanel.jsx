import { useState, useEffect } from 'react';
import { MessageCircle, Trash2, Loader2, ShieldAlert, Lock } from 'lucide-react';
import { adminAuth } from '@/lib/adminAuth';
import { useToast } from '@/components/ui/use-toast';

// Admin community portal: lists all rooms + recent messages so a moderator
// (any role with the moderate_community privilege) can remove a message.
export default function CommunityPanel({ callerRole }) {
  const { toast } = useToast();
  const [tab, setTab] = useState('messages');
  const [rooms, setRooms] = useState([]);
  const [messages, setMessages] = useState([]);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(null);

  const load = async () => {
    setLoading(true);
    try {
      const data = await adminAuth.listCommunityMessages();
      setRooms(data?.rooms || []);
      setMessages(data?.messages || []);
    } catch (e) { toast({ title: 'Load failed', description: e?.message, variant: 'destructive' }); }
    finally { setLoading(false); }
  };
  useEffect(() => { load(); }, []);

  const remove = async (id) => {
    setBusy(id);
    try {
      await adminAuth.deleteCommunityMessage(id);
      toast({ title: 'Message removed' });
      setMessages((prev) => prev.filter((m) => m.id !== id));
    } catch (e) { toast({ title: 'Action failed', description: e?.message, variant: 'destructive' }); }
    finally { setBusy(null); }
  };

  const roomName = (rid) => rooms.find((r) => r.id === rid)?.name || '—';

  if (loading) return <div className="flex justify-center py-10"><Loader2 className="w-6 h-6 text-olo animate-spin" /></div>;

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2 mb-2">
        <MessageCircle className="w-5 h-5 text-olo" />
        <h2 className="font-heading font-700 text-xl">Community</h2>
      </div>
      <div className="flex gap-1 bg-muted/50 rounded-2xl p-1 w-full sm:w-auto sm:inline-flex">
        <button onClick={() => setTab('messages')} className={`flex-1 sm:flex-none px-4 py-2 rounded-xl text-sm font-medium transition-all ${tab === 'messages' ? 'bg-card text-foreground shadow-sm' : 'text-muted-foreground'}`}>Messages</button>
        <button onClick={() => setTab('rooms')} className={`flex-1 sm:flex-none px-4 py-2 rounded-xl text-sm font-medium transition-all ${tab === 'rooms' ? 'bg-card text-foreground shadow-sm' : 'text-muted-foreground'}`}>Rooms</button>
      </div>

      {tab === 'messages' ? (
        messages.length === 0 ? (
          <p className="text-sm text-muted-foreground p-6 rounded-2xl border border-dashed border-border text-center">No messages.</p>
        ) : (
          <div className="space-y-3">
            {messages.map((m) => {
              const removed = m.flag_status === 'resolved_removed';
              return (
                <div key={m.id} className={`p-4 rounded-2xl border bg-card ${removed ? 'border-border opacity-60' : 'border-border'}`}>
                  <div className="flex items-center gap-2 mb-1 flex-wrap">
                    <span className="text-xs font-semibold">{m.author_display_name || m.author_name || (m.is_guest ? 'Guest' : 'Anonymous')}</span>
                    {m.is_admin && <span className="text-[9px] font-bold text-warning bg-warning/10 px-1.5 py-0.5 rounded uppercase">Official</span>}
                    {m.is_guest && <span className="text-[9px] font-bold text-muted-foreground bg-muted px-1.5 py-0.5 rounded uppercase">Guest</span>}
                    {m.flag_status === 'flagged' && <span className="text-[9px] font-bold text-warning bg-warning/10 px-1.5 py-0.5 rounded uppercase">Flagged</span>}
                    {m.flag_status === 'disputed' && <span className="text-[9px] font-bold text-chart-2 bg-chart-2/10 px-1.5 py-0.5 rounded uppercase">Disputed</span>}
                    <span className="text-[10px] text-muted-foreground">in {roomName(m.room_id)}</span>
                  </div>
                  <p className="text-sm text-foreground/85 leading-relaxed break-words">{m.content}</p>
                  <div className="flex items-center justify-between mt-2">
                    <span className="text-[10px] text-muted-foreground">{new Date(m.created_date).toLocaleString()}</span>
                    {!removed && (
                      <button onClick={() => remove(m.id)} disabled={busy === m.id} className="inline-flex items-center gap-1.5 border border-destructive/40 text-destructive text-xs font-semibold px-3 py-1.5 rounded-lg hover:bg-destructive/10 disabled:opacity-50">
                        {busy === m.id ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Trash2 className="w-3.5 h-3.5" />} Remove
                      </button>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )
      ) : (
        <div className="space-y-2">
          {rooms.length === 0 ? (
            <p className="text-sm text-muted-foreground p-6 rounded-2xl border border-dashed border-border text-center">No rooms.</p>
          ) : rooms.map((r) => (
            <div key={r.id} className="p-4 rounded-2xl border border-border bg-card">
              <div className="flex items-center gap-2 flex-wrap">
                <span className="font-heading font-600 text-sm">{r.name}</span>
                {r.is_official && <span className="inline-flex items-center gap-1 text-[9px] font-bold text-warning bg-warning/10 px-1.5 py-0.5 rounded uppercase"><ShieldAlert className="w-2.5 h-2.5" /> Official</span>}
                {r.is_insider && <span className="inline-flex items-center gap-1 text-[9px] font-bold text-olo bg-olo/10 px-1.5 py-0.5 rounded uppercase"><Lock className="w-2.5 h-2.5" /> Insider</span>}
              </div>
              {r.description && <p className="text-xs text-muted-foreground mt-1">{r.description}</p>}
              <p className="text-[10px] text-muted-foreground mt-1">{messages.filter((m) => m.room_id === r.id).length} messages</p>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}