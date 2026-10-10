import { useState, useEffect } from 'react';
import { Stethoscope, ShieldAlert, Loader2, Check, X, BadgeCheck, MessageSquare, Flag } from 'lucide-react';
import { adminAuth } from '@/lib/adminAuth';
import { useToast } from '@/components/ui/use-toast';

// Admin panel for reviewing (a) medical personnel verifications and
// (b) flagged / disputed community messages. Gated to super_admin +
// medical_admin by the backend (review_medical_verifications /
// review_medical_advice privileges).
export default function MedicalReviewPanel({ callerRole }) {
  const [sub, setSub] = useState('verifications');
  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2 mb-2">
        <Stethoscope className="w-5 h-5 text-olo" />
        <h2 className="font-heading font-700 text-xl">Medical moderation</h2>
      </div>
      <div className="flex gap-1 bg-muted/50 rounded-2xl p-1 w-full sm:w-auto sm:inline-flex">
        <button onClick={() => setSub('verifications')} className={`flex-1 sm:flex-none px-4 py-2 rounded-xl text-sm font-medium transition-all ${sub === 'verifications' ? 'bg-card text-foreground shadow-sm' : 'text-muted-foreground'}`}>Verifications</button>
        <button onClick={() => setSub('flags')} className={`flex-1 sm:flex-none px-4 py-2 rounded-xl text-sm font-medium transition-all ${sub === 'flags' ? 'bg-card text-foreground shadow-sm' : 'text-muted-foreground'}`}>Flagged messages</button>
      </div>
      {sub === 'verifications' ? <VerificationsTab /> : <FlagsTab />}
    </div>
  );
}

function VerificationsTab() {
  const { toast } = useToast();
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(null);

  const load = async () => {
    setLoading(true);
    try {
      const data = await adminAuth.listMedicalVerifications();
      setItems(data?.verifications || []);
    } catch (e) { toast({ title: 'Load failed', description: e?.message, variant: 'destructive' }); }
    finally { setLoading(false); }
  };
  useEffect(() => { load(); }, []);

  const review = async (id, status, notes) => {
    setBusy(id);
    try {
      await adminAuth.reviewMedicalVerification(id, status, notes || '');
      toast({ title: status === 'approved' ? 'Verification approved' : 'Verification rejected' });
      load();
    } catch (e) { toast({ title: 'Action failed', description: e?.message, variant: 'destructive' }); }
    finally { setBusy(null); }
  };

  if (loading) return <div className="flex justify-center py-10"><Loader2 className="w-6 h-6 text-olo animate-spin" /></div>;
  if (!items.length) return <p className="text-sm text-muted-foreground p-6 rounded-2xl border border-dashed border-border text-center">No verification requests.</p>;

  return (
    <div className="space-y-3">
      {items.map((v) => (
        <div key={v.id} className="p-4 rounded-2xl border border-border bg-card">
          <div className="flex items-start justify-between gap-3 flex-wrap">
            <div className="min-w-0">
              <p className="font-heading font-600 text-sm flex items-center gap-2 flex-wrap">
                {v.full_name}
                <span className="text-[10px] font-bold text-olo bg-olo/10 px-2 py-0.5 rounded-full uppercase">{(v.profession || '').replace(/_/g, ' ')}</span>
                {v.status === 'approved' && <BadgeCheck className="w-4 h-4 text-success" />}
                {v.status === 'pending' && <span className="text-[10px] font-bold text-warning bg-warning/10 px-2 py-0.5 rounded-full uppercase">Pending</span>}
                {v.status === 'rejected' && <span className="text-[10px] font-bold text-destructive bg-destructive/10 px-2 py-0.5 rounded-full uppercase">Rejected</span>}
              </p>
              <p className="text-xs text-muted-foreground mt-1">License {v.license_number} · {v.country} · {v.email}</p>
              {v.specialization && <p className="text-xs text-muted-foreground">Specialization: {v.specialization}</p>}
              {v.license_document_url && <a href={v.license_document_url} target="_blank" rel="noreferrer" className="text-xs text-olo hover:underline mt-1 inline-block">View document →</a>}
              {v.review_notes && <p className="text-xs text-muted-foreground mt-1">Notes: {v.review_notes}</p>}
            </div>
            {v.status === 'pending' && (
              <div className="flex gap-2">
                <button onClick={() => review(v.id, 'approved')} disabled={busy === v.id} className="inline-flex items-center gap-1.5 bg-success text-success-foreground text-xs font-semibold px-3 py-2 rounded-lg hover:opacity-90 disabled:opacity-50">
                  {busy === v.id ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Check className="w-3.5 h-3.5" />} Approve
                </button>
                <button onClick={() => review(v.id, 'rejected', 'Does not meet verification criteria')} disabled={busy === v.id} className="inline-flex items-center gap-1.5 border border-destructive/40 text-destructive text-xs font-semibold px-3 py-2 rounded-lg hover:bg-destructive/10 disabled:opacity-50">
                  <X className="w-3.5 h-3.5" /> Reject
                </button>
              </div>
            )}
          </div>
        </div>
      ))}
    </div>
  );
}

function FlagsTab() {
  const { toast } = useToast();
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(null);

  const load = async () => {
    setLoading(true);
    try {
      const data = await adminAuth.listFlaggedMessages();
      setItems(data?.messages || []);
    } catch (e) { toast({ title: 'Load failed', description: e?.message, variant: 'destructive' }); }
    finally { setLoading(false); }
  };
  useEffect(() => { load(); }, []);

  const review = async (id, decision) => {
    setBusy(id);
    try {
      await adminAuth.reviewFlag(id, decision);
      toast({ title: decision === 'kept' ? 'Message kept' : 'Message removed' });
      load();
    } catch (e) { toast({ title: 'Action failed', description: e?.message, variant: 'destructive' }); }
    finally { setBusy(null); }
  };

  if (loading) return <div className="flex justify-center py-10"><Loader2 className="w-6 h-6 text-olo animate-spin" /></div>;
  if (!items.length) return <p className="text-sm text-muted-foreground p-6 rounded-2xl border border-dashed border-border text-center">No flagged messages.</p>;

  return (
    <div className="space-y-3">
      {items.map((m) => (
        <div key={m.id} className="p-4 rounded-2xl border border-warning/30 bg-warning/5">
          <div className="flex items-center gap-2 mb-2 flex-wrap">
            <Flag className="w-3.5 h-3.5 text-warning" />
            <span className="text-[10px] font-bold text-warning bg-warning/15 px-2 py-0.5 rounded-full uppercase">{m.flag_status}</span>
            <span className="text-xs text-muted-foreground">by {m.author_display_name || m.author_name || 'guest'}</span>
            {m.dispute_status === 'pending' && <span className="text-[10px] font-bold text-chart-2 bg-chart-2/10 px-2 py-0.5 rounded-full uppercase">Disputed</span>}
          </div>
          <div className="flex items-start gap-2">
            <MessageSquare className="w-3.5 h-3.5 text-muted-foreground mt-0.5 flex-shrink-0" />
            <p className="text-sm text-foreground/85 leading-relaxed break-words">{m.content}</p>
          </div>
          {m.flag_reason && <p className="text-xs text-warning mt-2">Reason: {m.flag_reason}</p>}
          {m.dispute_text && <p className="text-xs text-muted-foreground mt-2 p-2 rounded-lg bg-muted/50">Dispute: "{m.dispute_text}"</p>}
          <div className="flex gap-2 mt-3">
            <button onClick={() => review(m.id, 'kept')} disabled={busy === m.id} className="inline-flex items-center gap-1.5 bg-success text-success-foreground text-xs font-semibold px-3 py-2 rounded-lg hover:opacity-90 disabled:opacity-50">
              {busy === m.id ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Check className="w-3.5 h-3.5" />} Keep
            </button>
            <button onClick={() => review(m.id, 'removed')} disabled={busy === m.id} className="inline-flex items-center gap-1.5 border border-destructive/40 text-destructive text-xs font-semibold px-3 py-2 rounded-lg hover:bg-destructive/10 disabled:opacity-50">
              <ShieldAlert className="w-3.5 h-3.5" /> Remove
            </button>
          </div>
        </div>
      ))}
    </div>
  );
}