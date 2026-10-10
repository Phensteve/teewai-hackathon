import { useState, useEffect } from 'react';
import { unrufld } from '@/api/unrufldClient';
import { X, Loader2, AlertCircle, Send, ImageIcon } from 'lucide-react';

// Dentist-side review detail dialog: shows the patient's scan photos, the AI
// findings (score, shade, stains, health), and a form for the dentist to write
// their professional report. On submit, the patient is notified by email.

export default function ReviewDetailDialog({ review, user, onClose, onSubmitted }) {
  const [scan, setScan] = useState(null);
  const [photos, setPhotos] = useState([]);
  const [loading, setLoading] = useState(true);
  const [report, setReport] = useState('');
  const [summary, setSummary] = useState('');
  const [urgency, setUrgency] = useState('routine');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');
  const [activePhoto, setActivePhoto] = useState(0);

  useEffect(() => {
    (async () => {
      try {
        const res = await unrufld.functions.invoke('dentistReview', { op: 'getDetails', review_id: review.id });
        setScan(res.data?.scan || null);
        setPhotos(res.data?.photos || []);
      } catch (e) {
        setError(e?.message || 'Could not load the scan details.');
      } finally { setLoading(false); }
    })();
  }, [review.id]);

  const handleSubmit = async () => {
    if (!report.trim()) { setError('Please write your report before submitting.'); return; }
    setSubmitting(true);
    setError('');
    try {
      const res = await unrufld.functions.invoke('dentistReview', {
        op: 'submitReview',
        review_id: review.id,
        dentist_report: report,
        dentist_summary: summary,
        urgency,
      });
      if (res.data?.error) { setError(res.data.error); }
      else { onSubmitted(); }
    } catch (e) {
      setError(e?.response?.data?.error || e?.message || 'Could not submit the review.');
    } finally { setSubmitting(false); }
  };

  return (
    <div className="fixed inset-0 z-[100] flex items-end sm:items-center justify-center bg-black/60 backdrop-blur-sm animate-fade-up p-0 sm:p-4" onClick={onClose}>
      <div
        className="relative w-full max-w-2xl max-h-[92vh] overflow-y-auto bg-card rounded-t-3xl sm:rounded-3xl border border-border shadow-2xl animate-modal-scale-in"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="sticky top-0 z-10 bg-card border-b border-border px-5 py-4 flex items-center justify-between">
          <div className="min-w-0">
            <h2 className="font-heading font-700 text-lg truncate">Review scan — {review.patient_name}</h2>
            <p className="text-xs text-muted-foreground">{review.patient_email}</p>
          </div>
          <button onClick={onClose} className="p-2 rounded-lg hover:bg-muted transition-colors flex-shrink-0">
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="p-5 space-y-4">
          {loading ? (
            <div className="flex items-center justify-center py-16">
              <Loader2 className="w-8 h-8 text-olo animate-spin" />
            </div>
          ) : (
            <>
              {/* Patient question */}
              {review.patient_question && (
                <div className="p-3 rounded-xl bg-olo/5 border border-olo/15">
                  <p className="text-xs font-semibold text-olo mb-1">Patient's question</p>
                  <p className="text-sm text-foreground">{review.patient_question}</p>
                </div>
              )}

              {/* Scan photos */}
              {photos.length > 0 ? (
                <div>
                  <p className="text-xs font-medium text-muted-foreground mb-2 flex items-center gap-1.5">
                    <ImageIcon className="w-3.5 h-3.5" /> Scan photos ({photos.length})
                  </p>
                  <div className="rounded-2xl overflow-hidden bg-olo-deep">
                    <img src={photos[activePhoto]} alt={`Scan ${activePhoto + 1}`} className="w-full max-h-80 object-contain" />
                  </div>
                  {photos.length > 1 && (
                    <div className="flex gap-2 mt-2 overflow-x-auto no-scrollbar">
                      {photos.map((p, i) => (
                        <button
                          key={i}
                          onClick={() => setActivePhoto(i)}
                          className={`flex-shrink-0 w-16 h-16 rounded-lg overflow-hidden border-2 transition-colors ${i === activePhoto ? 'border-olo' : 'border-border'}`}
                        >
                          <img src={p} alt={`Thumb ${i + 1}`} className="w-full h-full object-cover" />
                        </button>
                      ))}
                    </div>
                  )}
                </div>
              ) : (
                <p className="text-sm text-muted-foreground text-center py-8">No photos available for this scan.</p>
              )}

              {/* AI findings summary */}
              {scan && (
                <div className="p-4 rounded-2xl border border-border bg-muted/30">
                  <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-3">AI scan findings</p>
                  <div className="grid grid-cols-2 gap-3 text-sm">
                    {scan.score != null && (
                      <div><span className="text-muted-foreground">Whiteness:</span> <span className="font-semibold">{scan.score}/100</span></div>
                    )}
                    {scan.shade && (
                      <div><span className="text-muted-foreground">Shade:</span> <span className="font-semibold">{scan.shade} {scan.shade_code ? `(${scan.shade_code})` : ''}</span></div>
                    )}
                    {scan.dental_health_score != null && (
                      <div><span className="text-muted-foreground">Health:</span> <span className="font-semibold">{scan.dental_health_score}/100</span></div>
                    )}
                    {scan.gum_health && (
                      <div><span className="text-muted-foreground">Gums:</span> <span className="font-semibold capitalize">{scan.gum_health}</span></div>
                    )}
                    {scan.plaque_level && (
                      <div><span className="text-muted-foreground">Plaque:</span> <span className="font-semibold capitalize">{scan.plaque_level}</span></div>
                    )}
                    {scan.enamel_condition && (
                      <div><span className="text-muted-foreground">Enamel:</span> <span className="font-semibold capitalize">{scan.enamel_condition}</span></div>
                    )}
                  </div>
                  {scan.stain_types?.length > 0 && (
                    <div className="mt-3 flex flex-wrap gap-1.5">
                      {scan.stain_types.map((s, i) => (
                        <span key={i} className="px-2 py-0.5 rounded-full bg-olo/10 text-olo text-xs font-medium capitalize">{s.replace(/_/g, ' ')}</span>
                      ))}
                    </div>
                  )}
                  {scan.dental_health_issues?.length > 0 && (
                    <div className="mt-2">
                      <p className="text-xs text-muted-foreground mb-1">Issues flagged:</p>
                      <div className="flex flex-wrap gap-1.5">
                        {scan.dental_health_issues.map((s, i) => (
                          <span key={i} className="px-2 py-0.5 rounded-full bg-danger/10 text-danger text-xs font-medium">{s}</span>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              )}

              {/* Report form */}
              {review.status === 'pending' ? (
                <>
                  <div>
                    <label className="text-xs font-medium text-muted-foreground mb-1.5 block">One-line summary (shown to patient first)</label>
                    <input
                      type="text"
                      value={summary}
                      onChange={(e) => setSummary(e.target.value)}
                      placeholder="e.g. Mild staining, no cause for concern"
                      maxLength={200}
                      className="w-full px-3 py-2.5 rounded-xl border border-border bg-card text-sm focus:outline-none focus:ring-2 focus:ring-olo/30"
                    />
                  </div>

                  <div>
                    <label className="text-xs font-medium text-muted-foreground mb-1.5 block">Full report *</label>
                    <textarea
                      value={report}
                      onChange={(e) => setReport(e.target.value)}
                      placeholder="Write your professional assessment, findings, and recommendations…"
                      rows={6}
                      maxLength={2000}
                      className="w-full px-3 py-2.5 rounded-xl border border-border bg-card text-sm resize-none focus:outline-none focus:ring-2 focus:ring-olo/30"
                    />
                    <p className="text-xs text-muted-foreground mt-1 text-right">{report.length}/2000</p>
                  </div>

                  <div>
                    <label className="text-xs font-medium text-muted-foreground mb-1.5 block">Urgency</label>
                    <div className="grid grid-cols-3 gap-2">
                      {[
                        { key: 'routine', label: 'Routine', tone: 'border-border' },
                        { key: 'soon', label: 'Book soon', tone: 'border-warning/40 bg-warning/5' },
                        { key: 'urgent', label: 'Urgent', tone: 'border-danger/40 bg-danger/5' },
                      ].map(({ key, label, tone }) => (
                        <button
                          key={key}
                          onClick={() => setUrgency(key)}
                          className={`px-3 py-2.5 rounded-xl border text-sm font-medium transition-colors ${urgency === key ? `${tone} ring-2 ring-olo/30` : 'border-border text-muted-foreground hover:bg-muted'}`}
                        >
                          {label}
                        </button>
                      ))}
                    </div>
                  </div>

                  {error && (
                    <div className="p-3 rounded-xl bg-danger-soft flex items-start gap-2">
                      <AlertCircle className="w-4 h-4 text-danger flex-shrink-0 mt-0.5" />
                      <p className="text-sm text-danger">{error}</p>
                    </div>
                  )}

                  <button
                    onClick={handleSubmit}
                    disabled={submitting || !report.trim()}
                    className="w-full inline-flex items-center justify-center gap-2 bg-olo text-white font-semibold px-5 py-3.5 rounded-xl text-sm hover:scale-[1.01] transition-transform olo-glow disabled:opacity-50 disabled:hover:scale-100"
                  >
                    {submitting ? <><Loader2 className="w-4 h-4 animate-spin" /> Submitting…</> : <><Send className="w-4 h-4" /> Submit review to patient</>}
                  </button>
                </>
              ) : (
                <div className="p-4 rounded-2xl border border-olo/20 bg-olo/5">
                  <p className="text-xs font-semibold text-olo uppercase tracking-wider mb-2">Your report</p>
                  {review.dentist_summary && <p className="text-sm font-medium text-olo mb-2">{review.dentist_summary}</p>}
                  <p className="text-sm text-foreground leading-relaxed whitespace-pre-line">{review.dentist_report}</p>
                  <p className="text-xs text-muted-foreground mt-3 capitalize">Urgency: {review.urgency}</p>
                </div>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  );
}