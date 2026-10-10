import { useState, useEffect } from 'react';
import { Send, Loader2, Check, FileText, Clock } from 'lucide-react';
import { unrufld } from '@/api/unrufldClient';
import {
  fetchBriefData,
  buildDailyBrief,
  buildWeeklyBrief,
  buildMonthlyBrief,
  buildYearlyBrief,
  getDailyTitle,
  getCurrentWeeklyTitle,
  getCurrentMonthlyTitle,
  getCurrentYearlyTitle,
} from '@/lib/briefData';

// Lets a patient package their current smile-progress brief and send it to
// their dentist. Shown in the dentist management overview tab once the
// dentist is assigned. The brief is stored in the DentistBrief entity; the
// dentist reads it via RLS on dentist_user_id.

const BRIEF_OPTIONS = [
  { type: 'daily', label: 'Daily', getTitle: () => getDailyTitle(new Date()) },
  { type: 'weekly', label: 'Weekly', getTitle: () => getCurrentWeeklyTitle() },
  { type: 'monthly', label: 'Monthly', getTitle: () => getCurrentMonthlyTitle() },
  { type: 'yearly', label: 'Yearly', getTitle: () => getCurrentYearlyTitle() },
];

function buildBrief(type, data) {
  if (type === 'daily') return buildDailyBrief(data);
  if (type === 'weekly') return buildWeeklyBrief(data);
  if (type === 'monthly') return buildMonthlyBrief(data);
  return buildYearlyBrief(data);
}

function summarize(brief) {
  const sections = brief.sections || brief.lines || [];
  return sections.map((s) => s.text).join('\n');
}

export default function SendBriefCard({ dentist, user }) {
  const [briefType, setBriefType] = useState('weekly');
  const [sending, setSending] = useState(false);
  const [justSent, setJustSent] = useState(false);
  const [sentBriefs, setSentBriefs] = useState([]);
  const [loading, setLoading] = useState(true);

  const loadSent = async () => {
    setLoading(true);
    try {
      const list = await unrufld.entities.DentistBrief
        .filter({ created_by_id: user.id, dentist_id: dentist.id }, '-created_date', 10)
        .catch(() => []);
      setSentBriefs(list);
    } catch {
      /* ignore */
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadSent();
  }, [dentist, user]);

  const handleSend = async () => {
    setSending(true);
    try {
      const data = await fetchBriefData();
      const opt = BRIEF_OPTIONS.find((o) => o.type === briefType);
      const brief = buildBrief(briefType, data);
      const summary = summarize(brief) || 'No new activity recorded for this period.';
      await unrufld.entities.DentistBrief.create({
        patient_id: user.id,
        patient_email: user.email,
        patient_name: user.full_name || user.email,
        dentist_id: dentist.id,
        dentist_user_id: dentist.user_id,
        dentist_name: dentist.full_name || dentist.clinic_name,
        brief_type: briefType,
        title: opt.getTitle(),
        summary,
        status: 'sent',
      });
      setJustSent(true);
      setTimeout(() => setJustSent(false), 2500);
      loadSent();
    } catch (e) {
      console.error('Send brief failed:', e);
    } finally {
      setSending(false);
    }
  };

  return (
    <div className="p-4 rounded-2xl border border-olo/20 bg-olo/5 space-y-3">
      <div className="flex items-center gap-2">
        <Send className="w-4 h-4 text-olo" />
        <h3 className="font-heading font-600 text-sm">Send a brief</h3>
      </div>
      <p className="text-xs text-muted-foreground">
        Share your latest smile-progress summary with {dentist.full_name || dentist.clinic_name || 'your dentist'}.
      </p>

      {/* Brief type selector */}
      <div className="flex gap-1.5 flex-wrap">
        {BRIEF_OPTIONS.map((o) => (
          <button
            key={o.type}
            type="button"
            onClick={() => setBriefType(o.type)}
            className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${
              briefType === o.type
                ? 'bg-olo text-white'
                : 'border border-border text-muted-foreground hover:text-olo hover:border-olo/40'
            }`}
          >
            {o.label}
          </button>
        ))}
      </div>

      <button
        type="button"
        onClick={handleSend}
        disabled={sending}
        className="w-full bg-olo text-white font-semibold py-2.5 rounded-xl hover:opacity-90 disabled:opacity-50 inline-flex items-center justify-center gap-2 text-sm"
      >
        {sending ? (
          <><Loader2 className="w-4 h-4 animate-spin" /> Sending…</>
        ) : justSent ? (
          <><Check className="w-4 h-4" /> Brief sent</>
        ) : (
          <><Send className="w-4 h-4" /> Send {briefType} brief</>
        )}
      </button>

      {/* Sent briefs history */}
      {sentBriefs.length > 0 && (
        <div className="pt-2 border-t border-border space-y-2">
          <p className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider">Sent to this dentist</p>
          {sentBriefs.map((b) => (
            <div key={b.id} className="flex items-start gap-2 text-xs">
              <FileText className="w-3.5 h-3.5 text-olo flex-shrink-0 mt-0.5" />
              <div className="min-w-0 flex-1">
                <p className="font-medium truncate">{b.title || `${b.brief_type} brief`}</p>
                <p className="text-muted-foreground flex items-center gap-1">
                  <Clock className="w-3 h-3" />
                  {new Date(b.created_date).toLocaleDateString(undefined, { month: 'short', day: 'numeric' })}
                  {b.status === 'read' && <span className="text-olo"> · Read</span>}
                </p>
              </div>
            </div>
          ))}
        </div>
      )}

      {!loading && sentBriefs.length === 0 && (
        <p className="text-xs text-muted-foreground text-center pt-1">No briefs sent yet.</p>
      )}
    </div>
  );
}