import { useState, useEffect, useCallback } from 'react';
import { Link } from 'react-router-dom';
import { unrufld } from '@/api/unrufldClient';
import AssignmentCard from '@/components/dentist/AssignmentCard';
import ShareScansModal from '@/components/dentist/ShareScansModal';
import ConsentDialog from '@/components/dentist/ConsentDialog';
import PageSkeleton from '@/components/loading/PageSkeleton';
import { Stethoscope, UserPlus, Loader2, Inbox } from 'lucide-react';
import PendingRequestCard from '@/components/dentist/PendingRequestCard';

export default function MyDentists() {
  const [user, setUser] = useState(null);
  const [assignments, setAssignments] = useState([]);
  const [dentists, setDentists] = useState({});
  const [scans, setScans] = useState([]);
  const [shares, setShares] = useState([]);
  const [pending, setPending] = useState([]);
  const [loading, setLoading] = useState(true);
  const [revokingId, setRevokingId] = useState(null);
  const [togglingId, setTogglingId] = useState(null);
  const [shareModalFor, setShareModalFor] = useState(null);

  const load = useCallback(async () => {
    try {
      const me = await unrufld.auth.me();
      setUser(me);
      const [myAssignments, myScans, myShares, myPending] = await Promise.all([
        unrufld.entities.DentistAssignment.filter({ created_by_id: me.id }),
        unrufld.entities.Scan.filter({ created_by_id: me.id }, '-created_date', 50),
        unrufld.entities.ScanShare.filter({ created_by_id: me.id }),
        unrufld.entities.DentistAssignment.filter({ patient_id: me.id, status: 'pending', initiated_by: 'dentist' }),
      ]);
      const active = myAssignments.filter((a) => a.status === 'active');
      setAssignments(active);
      setScans(myScans);
      setShares(myShares);
      setPending(myPending);

      const dentistIds = [...new Set([...active.map((a) => a.dentist_id), ...myPending.map((a) => a.dentist_id)])];
      const dMap = {};
      for (const did of dentistIds) {
        try { dMap[did] = await unrufld.entities.DentistProfile.get(did); } catch {}
      }
      setDentists(dMap);
    } catch { /* non-fatal */ } finally { setLoading(false); }
  }, []);

  useEffect(() => { load(); }, [load]);

  const handleRevoke = async (assignment) => {
    setRevokingId(assignment.id);
    try {
      await unrufld.entities.DentistAssignment.update(assignment.id, { status: 'revoked' });
      if (assignment.assignment_type === 'primary' && assignment.dentist_user_id) {
        await unrufld.entities.Scan.updateMany(
          { created_by_id: user.id, dentist_id: assignment.dentist_user_id },
          { $unset: { dentist_id: "" } }
        );
      }
      // Revoke all ScanShares with this dentist
      const dentistShares = shares.filter((s) => s.dentist_id === assignment.dentist_id && s.status === 'active');
      for (const s of dentistShares) {
        await unrufld.entities.ScanShare.update(s.id, { status: 'revoked', scan_snapshot: {} });
      }
      load();
    } catch (e) { console.error(e); } finally { setRevokingId(null); }
  };

  const handleTogglePhotos = async (assignment) => {
    setTogglingId(assignment.id);
    try {
      await unrufld.entities.DentistAssignment.update(assignment.id, {
        can_see_photos: !assignment.can_see_photos,
      });
      load();
    } catch (e) { console.error(e); } finally { setTogglingId(null); }
  };

  const handleShare = async (scan, shareType) => {
    const dentist = dentists[shareModalFor];
    if (!dentist) return;
    const snapshot = {
      score: scan.score, shade: scan.shade, shade_code: scan.shade_code,
      brightness: scan.brightness, stains_detected: scan.stains_detected,
      stain_types: scan.stain_types, smile_zone_score: scan.smile_zone_score,
      smile_zone_shade: scan.smile_zone_shade,
      whitening_potential_score: scan.whitening_potential_score,
      whitening_potential_shade: scan.whitening_potential_shade,
      dental_health_score: scan.dental_health_score, gum_health: scan.gum_health,
      plaque_level: scan.plaque_level, recommendations: scan.recommendations,
      ai_feedback: scan.ai_feedback, scan_type: scan.scan_type, scan_date: scan.created_date,
    };
    if (shareType === 'report_and_photos') snapshot.image_url = scan.image_url;
    await unrufld.entities.ScanShare.create({
      scan_id: scan.id, patient_id: user.id, patient_email: user.email,
      patient_name: user.full_name || user.email, dentist_id: dentist.id,
      dentist_user_id: dentist.user_id, dentist_name: dentist.full_name || dentist.clinic_name,
      share_type: shareType, status: 'active', shared_date: new Date().toISOString(),
      scan_snapshot: snapshot,
    });
    load();
  };

  const handleUnshare = async (share) => {
    await unrufld.entities.ScanShare.update(share.id, { status: 'revoked', scan_snapshot: {} });
    load();
  };

  if (loading) return <PageSkeleton />;

  const primary = assignments.find((a) => a.assignment_type === 'primary');
  const secondary = assignments.filter((a) => a.assignment_type === 'secondary');
  const shareDentist = shareModalFor ? dentists[shareModalFor] : null;
  const shareDentistShares = shareModalFor ? shares.filter((s) => s.dentist_id === shareModalFor) : [];

  return (
    <div className="max-w-2xl mx-auto px-4 sm:px-6 py-6">
      <div className="flex items-center justify-between mb-4">
        <h1 className="font-heading font-700 text-2xl tracking-tight">My Dentists</h1>
        <Link to="/dentists" className="inline-flex items-center gap-1.5 text-sm font-medium text-olo hover:underline">
          <UserPlus className="w-4 h-4" /> Find a dentist
        </Link>
      </div>

      {pending.length > 0 && (
        <div className="mb-4 space-y-2">
          <h2 className="text-xs font-semibold text-amber-600 dark:text-amber-400 uppercase tracking-wider mb-2 flex items-center gap-1.5">
            <Inbox className="w-3.5 h-3.5" /> Pending Requests ({pending.length})
          </h2>
          {pending.map((a) => (
            <PendingRequestCard key={a.id} assignment={a} dentist={dentists[a.dentist_id]} onResolved={load} />
          ))}
        </div>
      )}

      {assignments.length === 0 ? (
        <div className="p-8 rounded-2xl border border-dashed border-border text-center">
          <Stethoscope className="w-10 h-10 text-muted-foreground/40 mx-auto mb-3" />
          <p className="text-sm text-muted-foreground mb-1">You haven't assigned a dentist yet.</p>
          <p className="text-xs text-muted-foreground mb-4">Find a dentist to share your scan reports.</p>
          <Link to="/dentists" className="inline-flex items-center gap-1.5 bg-olo text-white text-sm font-semibold px-4 py-2.5 rounded-xl hover:scale-105 transition-transform">
            <UserPlus className="w-4 h-4" /> Find a dentist
          </Link>
        </div>
      ) : (
        <div className="space-y-4">
          {primary && (
            <div>
              <h2 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2">Primary Dentist</h2>
              <AssignmentCard
                assignment={primary}
                dentist={dentists[primary.dentist_id]}
                onRevoke={() => handleRevoke(primary)}
                onTogglePhotos={() => handleTogglePhotos(primary)}
                revoking={revokingId === primary.id}
              />
            </div>
          )}
          {secondary.length > 0 && (
            <div>
              <h2 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2">Secondary Dentists</h2>
              <div className="space-y-2">
                {secondary.map((a) => (
                  <AssignmentCard
                    key={a.id}
                    assignment={a}
                    dentist={dentists[a.dentist_id]}
                    onRevoke={() => handleRevoke(a)}
                    onShareScans={() => setShareModalFor(a.dentist_id)}
                    revoking={revokingId === a.id}
                  />
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      <ShareScansModal
        open={!!shareModalFor}
        dentist={shareDentist}
        patientScans={scans}
        existingShares={shareDentistShares}
        onShare={handleShare}
        onUnshare={handleUnshare}
        onClose={() => setShareModalFor(null)}
      />
    </div>
  );
}