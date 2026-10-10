import { useState, useEffect, useCallback } from 'react';
import { useOutletContext } from 'react-router-dom';
import { unrufld } from '@/api/unrufldClient';
import SkeletonBlock from '@/components/loading/SkeletonBlock';
import ReviewDetailDialog from '@/components/dentist/ReviewDetailDialog';
import { Stethoscope, Clock, CheckCircle, Loader2, Inbox } from 'lucide-react';

// Dentist portal page: the review queue. Lists pending and completed scan
// review requests assigned to this dentist. Clicking a pending review opens
// the detail dialog with the scan photos, AI findings, and a report form.

const STATUS_FILTERS = [
  { key: 'pending', label: 'Pending', icon: Clock },
  { key: 'reviewed', label: 'Reviewed', icon: CheckCircle },
];

export default function DentistReviewRequests() {
  const { user } = useOutletContext();
  const [reviews, setReviews] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState('pending');
  const [activeReview, setActiveReview] = useState(null);

  const load = useCallback(async () => {
    try {
      const res = await unrufld.functions.invoke('dentistReview', { op: 'listForDentist', status: filter });
      setReviews(res.data?.reviews || []);
    } catch { setReviews([]); } finally { setLoading(false); }
  }, [filter]);

  useEffect(() => { load(); }, [load]);

  const pendingCount = reviews.filter((r) => r.status === 'pending').length;

  return (
    <div className="max-w-2xl mx-auto px-4 sm:px-6 py-6">
      <div className="flex items-center gap-2 mb-1">
        <Stethoscope className="w-5 h-5 text-olo" />
        <h1 className="font-heading font-700 text-2xl tracking-tight">Scan Reviews</h1>
        {pendingCount > 0 && (
          <span className="ml-1 inline-flex items-center justify-center w-5 h-5 rounded-full bg-olo text-white text-xs font-bold">{pendingCount}</span>
        )}
      </div>
      <p className="text-sm text-muted-foreground mb-6">Review patient scans and write professional reports.</p>

      <div className="flex gap-2 mb-4">
        {STATUS_FILTERS.map(({ key, label, icon: Icon }) => (
          <button
            key={key}
            onClick={() => setFilter(key)}
            className={`inline-flex items-center gap-1.5 px-4 py-2 rounded-xl text-sm font-medium transition-colors ${
              filter === key ? 'bg-olo text-white' : 'border border-border text-muted-foreground hover:bg-muted'
            }`}
          >
            <Icon className="w-4 h-4" /> {label}
          </button>
        ))}
      </div>

      {loading ? (
        <div role="status" aria-label="Loading scan reviews"><SkeletonBlock type="photos" count={4} /></div>
      ) : reviews.length === 0 ? (
        <div className="p-8 rounded-2xl border border-dashed border-border text-center">
          <Inbox className="w-10 h-10 text-muted-foreground/40 mx-auto mb-3" />
          <p className="text-sm text-muted-foreground">
            {filter === 'pending' ? 'No pending reviews. You\'ll be notified when a patient requests one.' : 'No completed reviews yet.'}
          </p>
        </div>
      ) : (
        <div className="space-y-2">
          {reviews.map((r) => (
            <button
              key={r.id}
              onClick={() => setActiveReview(r)}
              className="w-full text-left p-4 rounded-2xl border border-border bg-card hover:border-olo/40 transition-colors"
            >
              <div className="flex items-center justify-between gap-3">
                <div className="min-w-0 flex-1">
                  <p className="font-medium text-sm truncate">{r.patient_name || r.patient_email}</p>
                  <p className="text-xs text-muted-foreground truncate">
                    {new Date(r.created_date).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })}
                    {r.patient_question ? ` · "${r.patient_question.slice(0, 60)}"` : ''}
                  </p>
                  {r.status === 'reviewed' && r.dentist_summary && (
                    <p className="text-xs text-olo mt-1 truncate">{r.dentist_summary}</p>
                  )}
                </div>
                <div className="flex items-center gap-2 flex-shrink-0">
                  {r.status === 'pending' ? (
                    <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-olo/10 text-olo text-xs font-semibold">
                      <Clock className="w-3 h-3" /> Review
                    </span>
                  ) : (
                    <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-success/10 text-success text-xs font-semibold">
                      <CheckCircle className="w-3 h-3" /> Done
                    </span>
                  )}
                </div>
              </div>
            </button>
          ))}
        </div>
      )}

      {activeReview && (
        <ReviewDetailDialog
          review={activeReview}
          user={user}
          onClose={() => setActiveReview(null)}
          onSubmitted={() => { setActiveReview(null); load(); }}
        />
      )}
    </div>
  );
}