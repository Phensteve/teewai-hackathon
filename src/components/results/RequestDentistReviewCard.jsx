import { useState, useEffect, useCallback } from 'react';
import { unrufld } from '@/api/unrufldClient';
import { Stethoscope, Loader2, CheckCircle, Clock, X, ChevronDown, ChevronUp, AlertCircle, MessageCircle } from 'lucide-react';

// Patient-side card on the Results page: lets a patient request a human
// dentist review of their AI scan, tracks the request status, and displays
// the dentist's report when it arrives. This is the "human review tier" that
// sits on top of the AI scan (Toothpic-style).

const URGENCY_LABELS = {
  routine: { label: 'No rush', tone: 'text-muted-foreground' },
  soon: { label: 'Book within weeks', tone: 'text-warning' },
  urgent: { label: 'See a dentist promptly', tone: 'text-danger' },
};

export default function RequestDentistReviewCard({ scan, user }) {
  const [reviews, setReviews] = useState(null);
  const [loading, setLoading] = useState(true);
  const [requesting, setRequesting] = useState(false);
  const [error, setError] = useState('');
  const [showForm, setShowForm] = useState(false);
  const [primaryDentist, setPrimaryDentist] = useState(null);
  const [partnerDentists, setPartnerDentists] = useState([]);
  const [selectedDentistId, setSelectedDentistId] = useState('');
  const [question, setQuestion] = useState('');
  const [reportOpen, setReportOpen] = useState(false);

  const load = useCallback(async () => {
    try {
      const res = await unrufld.functions.invoke('dentistReview', { op: 'listForPatient', scan_id: scan.id });
      setReviews(res.data?.reviews || []);
    } catch { setReviews([]); } finally { setLoading(false); }
  }, [scan.id]);

  useEffect(() => { load(); }, [load]);

  // Find the patient's primary dentist + available partner dentists for the picker.
  useEffect(() => {
    if (!user) return;
    (async () => {
      try {
        const assignments = await unrufld.entities.DentistAssignment.filter({
          patient_id: user.id, status: 'active', assignment_type: 'primary',
        });
        if (assignments.length > 0) {
          const profiles = await unrufld.entities.DentistProfile.filter({ id: assignments[0].dentist_id });
          if (profiles[0]) {
            setPrimaryDentist(profiles[0]);
            setSelectedDentistId(profiles[0].id);
          }
        }
        if (!primaryDentist) {
          const partners = await unrufld.entities.DentistProfile.filter({ subscription_active: true, verified: true }, '-rating', 20);
          setPartnerDentists(partners);
        }
      } catch {}
    })();
  }, [user]);

  const activeReview = reviews?.find((r) => r.status === 'pending' || r.status === 'reviewed');
  const pendingReview = reviews?.find((r) => r.status === 'pending');
  const reviewedReview = reviews?.find((r) => r.status === 'reviewed');

  const handleRequest = async () => {
    setRequesting(true);
    setError('');
    try {
      const res = await unrufld.functions.invoke('dentistReview', {
        op: 'create',
        scan_id: scan.id,
        dentist_id: selectedDentistId || undefined,
        patient_question: question || undefined,
      });
      if (res.data?.ok === false && res.data?.reason === 'already_exists') {
        setError('You already have a review request for this scan.');
      } else if (res.data?.error) {
        setError(res.data.error);
      } else {
        setShowForm(false);
        await load();
      }
    } catch (e) {
      setError(e?.response?.data?.error || e?.message || 'Could not request a review. Please try again.');
    } finally { setRequesting(false); }
  };

  const handleCancel = async () => {
    if (!pendingReview) return;
    try {
      await unrufld.functions.invoke('dentistReview', { op: 'cancel', review_id: pendingReview.id });
      await load();
    } catch {}
  };

  if (loading) {
    return (
      <div className="mb-4 p-5 rounded-2xl border border-border bg-card flex items-center gap-3">
        <Loader2 className="w-5 h-5 text-olo animate-spin" />
        <p className="text-sm text-muted-foreground">Checking review status…</p>
      </div>
    );
  }

  // ── Reviewed: show the dentist's report ──
  if (reviewedReview) {
    const urgency = URGENCY_LABELS[reviewedReview.urgency] || URGENCY_LABELS.routine;
    return (
      <div className="mb-4 rounded-2xl border border-olo/20 bg-olo/5 overflow-hidden">
        <div className="p-5 flex items-start gap-3">
          <span className="icon-tool flex-shrink-0">
            <Stethoscope className="w-5 h-5" />
          </span>
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 mb-1">
              <h3 className="font-heading font-600 text-base">Dentist review complete</h3>
              <CheckCircle className="w-4 h-4 text-olo flex-shrink-0" />
            </div>
            <p className="text-sm text-muted-foreground">
              Reviewed by <span className="font-medium text-foreground">{reviewedReview.dentist_name}</span>
              {reviewedReview.reviewed_date && <> · {new Date(reviewedReview.reviewed_date).toLocaleDateString('en-GB', { day: 'numeric', month: 'short' })}</>}
            </p>
            {reviewedReview.dentist_summary && (
              <p className="text-sm font-medium text-olo mt-2">{reviewedReview.dentist_summary}</p>
            )}
            <p className={`text-xs mt-1 ${urgency.tone}`}>{urgency.label}</p>
          </div>
        </div>
        <button
          onClick={() => setReportOpen((v) => !v)}
          className="w-full px-5 py-3 border-t border-olo/15 flex items-center justify-between text-sm font-medium text-olo hover:bg-olo/10 transition-colors"
        >
          {reportOpen ? 'Hide full report' : 'Read full report'}
          {reportOpen ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
        </button>
        {reportOpen && (
          <div className="px-5 pb-5 animate-fade-up">
            <div className="p-4 rounded-xl bg-card border border-border">
              <p className="text-sm text-foreground leading-relaxed whitespace-pre-line">{reviewedReview.dentist_report}</p>
            </div>
            {reviewedReview.patient_question && (
              <div className="mt-3 p-3 rounded-xl bg-muted/40 flex items-start gap-2">
                <MessageCircle className="w-4 h-4 text-muted-foreground flex-shrink-0 mt-0.5" />
                <div>
                  <p className="text-xs text-muted-foreground font-medium">Your question</p>
                  <p className="text-sm text-muted-foreground mt-0.5">{reviewedReview.patient_question}</p>
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    );
  }

  // ── Pending: show awaiting status ──
  if (pendingReview) {
    return (
      <div className="mb-4 p-5 rounded-2xl border border-olo/20 bg-olo/5 flex items-start gap-3">
        <span className="icon-tool flex-shrink-0">
          <Clock className="w-5 h-5 animate-pulse" />
        </span>
        <div className="flex-1 min-w-0">
          <h3 className="font-heading font-600 text-base">Awaiting dentist review</h3>
          <p className="text-sm text-muted-foreground mt-0.5">
            {pendingReview.dentist_name} will review your scan and write a report. You'll be notified when it's ready.
          </p>
          {pendingReview.patient_question && (
            <p className="text-xs text-muted-foreground mt-2 italic">"{pendingReview.patient_question}"</p>
          )}
          <button
            onClick={handleCancel}
            className="mt-3 text-xs font-medium text-muted-foreground hover:text-destructive transition-colors"
          >
            Cancel request
          </button>
        </div>
      </div>
    );
  }

  // ── No review yet: show the request CTA ──
  return (
    <div className="mb-4">
      <div className="p-5 rounded-2xl border border-border bg-card">
        <div className="flex items-start gap-3 mb-3">
          <span className="icon-tool flex-shrink-0">
            <Stethoscope className="w-5 h-5" />
          </span>
          <div className="flex-1 min-w-0">
            <h3 className="font-heading font-600 text-base">Get a dentist review</h3>
            <p className="text-sm text-muted-foreground mt-0.5">
              A licensed dentist will review your scan photos and AI findings, then write a professional report — usually within 24 hours.
            </p>
          </div>
        </div>

        {!showForm ? (
          <button
            onClick={() => setShowForm(true)}
            className="w-full inline-flex items-center justify-center gap-2 bg-olo text-white font-semibold px-5 py-3 rounded-xl text-sm hover:scale-[1.01] transition-transform olo-glow"
          >
            <Stethoscope className="w-4 h-4" /> Request dentist review
          </button>
        ) : (
          <div className="animate-fade-up space-y-3">
            {primaryDentist ? (
              <div className="p-3 rounded-xl bg-olo/10 border border-olo/20 flex items-center gap-2">
                <CheckCircle className="w-4 h-4 text-olo flex-shrink-0" />
                <p className="text-sm text-foreground">
                  Sent to your dentist: <span className="font-semibold">{primaryDentist.full_name || primaryDentist.clinic_name}</span>
                </p>
              </div>
            ) : (
              partnerDentists.length > 0 && (
                <div>
                  <label className="text-xs font-medium text-muted-foreground mb-1.5 block">Choose a teewai partner dentist</label>
                  <select
                    value={selectedDentistId}
                    onChange={(e) => setSelectedDentistId(e.target.value)}
                    className="w-full px-3 py-2.5 rounded-xl border border-border bg-card text-sm focus:outline-none focus:ring-2 focus:ring-olo/30"
                  >
                    <option value="">Select a dentist…</option>
                    {partnerDentists.map((d) => (
                      <option key={d.id} value={d.id}>
                        {d.full_name || d.clinic_name}{d.city ? ` · ${d.city}` : ''}{d.specialization ? ` · ${d.specialization}` : ''}
                      </option>
                    ))}
                  </select>
                </div>
              )
            )}

            <div>
              <label className="text-xs font-medium text-muted-foreground mb-1.5 block">Question for the dentist (optional)</label>
              <textarea
                value={question}
                onChange={(e) => setQuestion(e.target.value)}
                placeholder="e.g. Is the staining on my front teeth reversible?"
                rows={2}
                maxLength={500}
                className="w-full px-3 py-2.5 rounded-xl border border-border bg-card text-sm resize-none focus:outline-none focus:ring-2 focus:ring-olo/30"
              />
            </div>

            {error && (
              <div className="p-3 rounded-xl bg-danger-soft flex items-start gap-2">
                <AlertCircle className="w-4 h-4 text-danger flex-shrink-0 mt-0.5" />
                <p className="text-sm text-danger">{error}</p>
              </div>
            )}

            <div className="flex gap-2">
              <button
                onClick={handleRequest}
                disabled={requesting || (!selectedDentistId && !primaryDentist)}
                className="flex-1 inline-flex items-center justify-center gap-2 bg-olo text-white font-semibold px-5 py-3 rounded-xl text-sm hover:scale-[1.01] transition-transform olo-glow disabled:opacity-50 disabled:hover:scale-100"
              >
                {requesting ? <><Loader2 className="w-4 h-4 animate-spin" /> Sending…</> : 'Send to dentist'}
              </button>
              <button
                onClick={() => { setShowForm(false); setError(''); }}
                className="px-4 py-3 rounded-xl border border-border text-sm font-medium hover:bg-muted transition-colors"
              >
                Cancel
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}