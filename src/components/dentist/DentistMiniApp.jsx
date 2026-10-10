import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { unrufld } from '@/api/unrufldClient';
const appts = unrufld.entities.Appointment;
import { useScrollLock } from '@/hooks/use-scroll-lock';
import {
  X, Stethoscope, BadgeCheck, Star, UserPlus, Share2, Calendar, Check,
  MapPin, Phone, Mail, Navigation, Loader2, ShieldCheck, CalendarPlus,
  Unlink,
} from 'lucide-react';
import { Switch } from '@/components/ui/switch';
import ScanImage from '@/components/ScanImage';
import SendBriefCard from '@/components/dentist/SendBriefCard';
import { treatmentLabel, TreatmentIcon } from '@/components/dentist/TreatmentRecordForm';

// Telegram mini-app style bottom sheet for dentist management.
// Opens from any dentist card, shows overview / scans / appointments tabs.
// Patients assign dentists, manage scan visibility, book/cancel appointments.
export default function DentistMiniApp({ open, dentist, user, onClose }) {
  const [tab, setTab] = useState('overview');
  const [assignment, setAssignment] = useState(null);
  const [scans, setScans] = useState([]);
  const [shares, setShares] = useState([]);
  const [appointments, setAppointments] = useState([]);
  const [loading, setLoading] = useState(false);
  const [consentType, setConsentType] = useState(null);
  const [assigning, setAssigning] = useState(false);
  const [bookingForm, setBookingForm] = useState({ requested_date: '', requested_time: '', reason: '' });
  const [booking, setBooking] = useState(false);
  const [cancelingId, setCancelingId] = useState(null);
  const [cancelReason, setCancelReason] = useState('');
  const [cancelId, setCancelId] = useState(null);
  const [togglingPhoto, setTogglingPhoto] = useState(false);
  const [sharingId, setSharingId] = useState(null);

  useScrollLock(open);

  const isTeewai = !!(dentist?.user_id || dentist?.isTeewai);
  const name = dentist?.full_name || dentist?.clinic_name || 'Dentist';
  const tabs = isTeewai ? ['overview', 'scans', 'appointments'] : ['overview'];

  useEffect(() => {
    if (!open || !dentist) return;
    setTab('overview');
    // Public-map clinics only need their public contact details. Do not wait
    // for private scans/appointments that this clinic cannot manage.
    if (!isTeewai) { setLoading(false); return; }
    if (user) loadData();
  }, [open, dentist, user]);

  const loadData = async () => {
    setLoading(true);
    try {
      const [myScans, myShares] = await Promise.all([
        unrufld.entities.Scan.filter({ created_by_id: user.id }, '-created_date', 50).catch(() => []),
        unrufld.entities.ScanShare.filter({ created_by_id: user.id }).catch(() => []),
      ]);
      setScans(myScans.filter((s) => s.scan_mode !== 'braces'));
      setShares(myShares.filter((s) => s.status === 'active'));

      if (isTeewai && dentist.id) {
        const [myAssignments, myAppts] = await Promise.all([
          unrufld.entities.DentistAssignment.filter({ created_by_id: user.id, dentist_id: dentist.id }).catch(() => []),
          appts.filter({ dentist_id: dentist.id, patient_email: user.email }, '-created_date', 20).catch(() => []),
        ]);
        setAssignment(myAssignments.find((a) => a.status === 'active') || null);
        setAppointments(myAppts);
      }
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  const handleAssign = async () => {
    setAssigning(true);
    try {
      if (consentType === 'primary') {
        const myPrimaries = await unrufld.entities.DentistAssignment.filter({
          created_by_id: user.id, assignment_type: 'primary', status: 'active',
        });
        for (const a of myPrimaries) {
          await unrufld.entities.DentistAssignment.update(a.id, { status: 'revoked' });
          if (a.dentist_user_id) {
            await unrufld.entities.Scan.updateMany(
              { created_by_id: user.id, dentist_id: a.dentist_user_id },
              { $unset: { dentist_id: '' } },
            );
          }
        }
      }
      await unrufld.entities.DentistAssignment.create({
        patient_id: user.id, patient_email: user.email,
        patient_name: user.full_name || user.email,
        dentist_id: dentist.id, dentist_user_id: dentist.user_id,
        dentist_name: dentist.full_name || dentist.clinic_name,
        assignment_type: consentType, status: 'active',
        consent_given: true, consent_date: new Date().toISOString(),
      });
      if (consentType === 'primary') {
        await unrufld.entities.Scan.updateMany(
          { created_by_id: user.id },
          { $set: { dentist_id: dentist.user_id } },
        );
      }
      setConsentType(null);
      loadData();
    } catch (e) {
      console.error(e);
    } finally {
      setAssigning(false);
    }
  };

  const handleRevoke = async () => {
    if (!assignment) return;
    try {
      await unrufld.entities.DentistAssignment.update(assignment.id, { status: 'revoked' });
      if (assignment.assignment_type === 'primary' && assignment.dentist_user_id) {
        await unrufld.entities.Scan.updateMany(
          { created_by_id: user.id, dentist_id: assignment.dentist_user_id },
          { $unset: { dentist_id: '' } },
        );
      }
      const dentistShares = shares.filter((s) => s.dentist_id === assignment.dentist_id);
      for (const s of dentistShares) {
        await unrufld.entities.ScanShare.update(s.id, { status: 'revoked', scan_snapshot: {} });
      }
      loadData();
    } catch (e) {
      console.error(e);
    }
  };

  const handleTogglePhoto = async () => {
    setTogglingPhoto(true);
    try {
      await unrufld.entities.DentistAssignment.update(assignment.id, {
        can_see_photos: !assignment.can_see_photos,
      });
      loadData();
    } catch (e) {
      console.error(e);
    } finally {
      setTogglingPhoto(false);
    }
  };

  const handleShare = async (scan) => {
    setSharingId(scan.id);
    try {
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
      await unrufld.entities.ScanShare.create({
        scan_id: scan.id, patient_id: user.id, patient_email: user.email,
        patient_name: user.full_name || user.email, dentist_id: dentist.id,
        dentist_user_id: dentist.user_id, dentist_name: name,
        share_type: 'report_only', status: 'active', shared_date: new Date().toISOString(),
        scan_snapshot: snapshot,
      });
      loadData();
    } catch (e) {
      console.error(e);
    } finally {
      setSharingId(null);
    }
  };

  const handleUnshare = async (share) => {
    setSharingId(share.scan_id);
    try {
      await unrufld.entities.ScanShare.update(share.id, { status: 'revoked', scan_snapshot: {} });
      loadData();
    } catch (e) {
      console.error(e);
    } finally {
      setSharingId(null);
    }
  };

  const handleBook = async (e) => {
    e.preventDefault();
    setBooking(true);
    try {
      await appts.create({
        dentist_id: dentist.id, dentist_name: name,
        patient_email: user.email,
        requested_date: bookingForm.requested_date,
        requested_time: bookingForm.requested_time,
        reason: bookingForm.reason, status: 'pending',
      });
      setBookingForm({ requested_date: '', requested_time: '', reason: '' });
      loadData();
    } catch (e) {
      console.error(e);
    } finally {
      setBooking(false);
    }
  };

  const handleCancel = async () => {
    if (!cancelId || !cancelReason.trim()) return;
    setCancelingId(cancelId);
    try {
      await appts.update(cancelId, { status: 'cancelled', patient_cancel_reason: cancelReason.trim() });
      setCancelId(null);
      setCancelReason('');
      loadData();
    } catch (e) {
      console.error(e);
    } finally {
      setCancelingId(null);
    }
  };

  if (!open || !dentist) return null;

  const dirUrl = dentist.latitude && dentist.longitude
    ? `https://www.google.com/maps/dir/?api=1&destination=${dentist.latitude},${dentist.longitude}`
    : null;
  const pendingAppts = appointments.filter((a) => a.status === 'pending' || a.status === 'confirmed');
  const pastAppts = appointments.filter((a) => ['completed', 'cancelled', 'missed', 'postponed'].includes(a.status));
  const isPrimary = assignment?.assignment_type === 'primary';
  const sharedScanIds = new Set(shares.filter((s) => s.dentist_id === dentist.id).map((s) => s.scan_id));

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 z-[1000] bg-black/50 backdrop-blur-sm flex items-end sm:items-center sm:justify-center"
        onClick={onClose}
      >
        <motion.div
          initial={{ y: '100%' }}
          animate={{ y: 0 }}
          exit={{ y: '100%' }}
          transition={{ type: 'spring', damping: 32, stiffness: 320 }}
          className="w-full sm:max-w-lg h-[92vh] sm:h-[88vh] bg-card rounded-t-3xl sm:rounded-3xl border border-border shadow-2xl flex flex-col overflow-hidden"
          onClick={(e) => e.stopPropagation()}
        >
          {/* Drag handle — Telegram mini-app style */}
          <div className="flex justify-center pt-3 pb-1 flex-shrink-0">
            <div className="w-10 h-1.5 rounded-full bg-muted-foreground/30" />
          </div>
          {/* Header */}
          <div className="flex items-center justify-between p-4 border-b border-border flex-shrink-0">
            <div className="flex items-center gap-3 min-w-0">
              <div className="w-10 h-10 rounded-xl bg-olo/10 flex items-center justify-center overflow-hidden flex-shrink-0">
                {dentist.profile_picture ? (
                  <img src={dentist.profile_picture} alt={name} className="w-full h-full object-cover" />
                ) : (
                  <Stethoscope className="w-5 h-5 text-olo" />
                )}
              </div>
              <div className="min-w-0">
                <h2 className="font-heading font-700 text-base flex items-center gap-1.5 truncate">
                  {name}
                  {dentist.verified && <BadgeCheck className="w-4 h-4 text-olo flex-shrink-0" />}
                </h2>
                {dentist.specialization && <p className="text-xs text-muted-foreground truncate">{dentist.specialization}</p>}
              </div>
            </div>
            <button onClick={onClose} className="w-9 h-9 rounded-full hover:bg-muted flex items-center justify-center flex-shrink-0">
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* Tabs */}
          <div className="flex gap-1 p-2 border-b border-border flex-shrink-0">
            {tabs.map((t) => (
              <button
                key={t}
                onClick={() => setTab(t)}
                className={`flex-1 py-2 rounded-xl text-sm font-medium capitalize transition-colors ${tab === t ? 'bg-olo/10 text-olo' : 'text-muted-foreground hover:text-foreground'}`}
              >
                {t}
              </button>
            ))}
          </div>

          {/* Content */}
          <div className="flex-1 overflow-y-auto p-4">
            {loading ? (
              <div className="flex justify-center py-12">
                <Loader2 className="w-6 h-6 text-olo animate-spin" />
              </div>
            ) : (
              <>
                {/* Overview tab */}
                {tab === 'overview' && (
                  <div className="space-y-4">
                    {dentist.bio && <p className="text-sm text-muted-foreground leading-relaxed">{dentist.bio}</p>}
                    <div className="space-y-1.5 text-sm">
                      {dentist.address && (
                        <p className="flex items-center gap-2 text-muted-foreground">
                          <MapPin className="w-4 h-4 text-olo flex-shrink-0" /> {dentist.address}
                        </p>
                      )}
                      {dentist.phone && (
                        <a href={`tel:${dentist.phone.replace(/\s+/g, '')}`} className="flex items-center gap-2 text-muted-foreground hover:text-olo">
                          <Phone className="w-4 h-4 text-olo flex-shrink-0" /> {dentist.phone}
                        </a>
                      )}
                      {dentist.contact_email && (
                        <a href={`mailto:${dentist.contact_email}`} className="flex items-center gap-2 text-muted-foreground hover:text-olo">
                          <Mail className="w-4 h-4 text-olo flex-shrink-0" /> {dentist.contact_email}
                        </a>
                      )}
                    </div>
                    {dirUrl && (
                      <a
                        href={dirUrl}
                        target="_blank"
                        rel="noreferrer"
                        className="flex items-center justify-center gap-2 border border-olo/30 text-olo font-semibold py-2.5 rounded-xl text-sm hover:bg-olo/5 transition-colors"
                      >
                        <Navigation className="w-4 h-4" /> Get directions
                      </a>
                    )}

                    {isTeewai && (
                      assignment ? (
                        <div className="space-y-3">
                          <div className="p-3 rounded-xl bg-olo/5 border border-olo/15 flex items-center justify-between gap-2">
                            <div className="min-w-0">
                              <p className="text-sm font-medium">{isPrimary ? 'Your primary dentist' : 'Your secondary dentist'}</p>
                              <p className="text-xs text-muted-foreground">{isPrimary ? 'Can see all your scan reports' : 'Only sees scans you share'}</p>
                            </div>
                            <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-olo/15 text-olo whitespace-nowrap">{isPrimary ? 'Primary' : 'Secondary'}</span>
                          </div>
                          {isPrimary && (
                            <div className="p-3 rounded-xl bg-olo/5 border border-olo/15">
                              <div className="flex items-center justify-between gap-2">
                                <div className="min-w-0">
                                  <p className="text-sm font-medium">Photo access</p>
                                  <p className="text-xs text-muted-foreground">Allow {name} to see your scan photos</p>
                                </div>
                                <Switch checked={assignment.can_see_photos} onCheckedChange={handleTogglePhoto} disabled={togglingPhoto} />
                              </div>
                            </div>
                          )}
                          <button
                            onClick={handleRevoke}
                            className="w-full inline-flex items-center justify-center gap-2 text-sm font-medium text-destructive border border-destructive/30 bg-destructive/5 py-2.5 rounded-xl hover:bg-destructive/10 transition-colors"
                          >
                            <Unlink className="w-4 h-4" /> Revoke access
                          </button>
                        </div>
                      ) : (
                        <div className="space-y-2">
                          <button
                            onClick={() => setConsentType('primary')}
                            className="w-full inline-flex items-center justify-center gap-2 bg-olo text-white font-semibold px-5 py-3 rounded-xl hover:scale-[1.01] transition-transform"
                          >
                            <Star className="w-4 h-4" /> Assign as primary dentist
                          </button>
                          <button
                            onClick={() => setConsentType('secondary')}
                            className="w-full inline-flex items-center justify-center gap-2 border border-olo/30 text-olo font-semibold px-5 py-3 rounded-xl hover:bg-olo/5 transition-colors"
                          >
                            <UserPlus className="w-4 h-4" /> Add as secondary dentist
                          </button>
                        </div>
                      )
                    )}

                    {isTeewai && assignment && (
                      <SendBriefCard dentist={dentist} user={user} />
                    )}

                    {/* Consent confirmation */}
                    {consentType && (
                      <div className="p-4 rounded-xl border border-olo/30 bg-olo/5">
                        <p className="text-sm font-medium mb-2">
                          {consentType === 'primary' ? 'Assign as primary dentist?' : 'Add as secondary dentist?'}
                        </p>
                        <p className="text-xs text-muted-foreground mb-3">
                          {consentType === 'primary'
                            ? 'Your primary dentist can see all your scan reports. Photo access is off by default.'
                            : 'Secondary dentists only see the individual scans you choose to share.'}
                        </p>
                        <div className="flex gap-2">
                          <button
                            onClick={handleAssign}
                            disabled={assigning}
                            className="flex-1 bg-olo text-white font-semibold py-2.5 rounded-xl hover:opacity-90 disabled:opacity-50 inline-flex items-center justify-center gap-2"
                          >
                            {assigning ? <Loader2 className="w-4 h-4 animate-spin" /> : <Check className="w-4 h-4" />} Confirm
                          </button>
                          <button
                            onClick={() => setConsentType(null)}
                            className="border border-border text-muted-foreground px-4 rounded-xl hover:text-foreground"
                          >
                            Cancel
                          </button>
                        </div>
                      </div>
                    )}
                  </div>
                )}

                {/* Scans tab */}
                {tab === 'scans' && (
                  <div className="space-y-3">
                    {isPrimary && (
                      <div className="p-3 rounded-xl bg-olo/5 border border-olo/15 flex items-start gap-2">
                        <ShieldCheck className="w-4 h-4 text-olo flex-shrink-0 mt-0.5" />
                        <p className="text-xs text-muted-foreground">
                          Your primary dentist can see all {scans.length} scan reports. Toggle photo access in the Overview tab.
                        </p>
                      </div>
                    )}
                    {scans.length === 0 ? (
                      <p className="text-sm text-muted-foreground text-center py-8">No scans yet. Take a scan to share with your dentist.</p>
                    ) : (
                      scans.map((scan) => {
                        const isShared = isPrimary || sharedScanIds.has(scan.id);
                        const share = shares.find((s) => s.scan_id === scan.id && s.dentist_id === dentist.id);
                        return (
                          <div key={scan.id} className="p-3 rounded-2xl border border-border bg-card flex items-center gap-3">
                            <ScanImage url={scan.image_url} alt="Scan" className="w-12 h-12 rounded-xl object-cover flex-shrink-0" />
                            <div className="flex-1 min-w-0">
                              <p className="text-sm font-medium truncate">
                                {new Date(scan.created_date).toLocaleDateString(undefined, { month: 'short', day: 'numeric' })} · Shade {scan.shade || '—'}
                              </p>
                              <p className="text-xs text-muted-foreground">Score {scan.score ?? '—'} · {scan.scan_type || 'quick'}</p>
                            </div>
                            {!isPrimary && (
                              isShared ? (
                                <button
                                  onClick={() => handleUnshare(share)}
                                  disabled={sharingId === scan.id}
                                  className="text-xs font-medium text-destructive border border-destructive/30 px-3 py-1.5 rounded-lg hover:bg-destructive/5 disabled:opacity-50"
                                >
                                  {sharingId === scan.id ? <Loader2 className="w-3 h-3 animate-spin" /> : 'Unshare'}
                                </button>
                              ) : (
                                <button
                                  onClick={() => handleShare(scan)}
                                  disabled={sharingId === scan.id}
                                  className="text-xs font-medium text-olo border border-olo/30 px-3 py-1.5 rounded-lg hover:bg-olo/5 disabled:opacity-50"
                                >
                                  {sharingId === scan.id ? <Loader2 className="w-3 h-3 animate-spin" /> : <Share2 className="w-3 h-3 inline" />}
                                  <span className="ml-1">Share</span>
                                </button>
                              )
                            )}
                            {isPrimary && (
                              <span className="text-xs font-medium text-olo px-2 py-1 rounded-lg bg-olo/10">Visible</span>
                            )}
                          </div>
                        );
                      })
                    )}
                  </div>
                )}

                {/* Appointments tab */}
                {tab === 'appointments' && (
                  <div className="space-y-4">
                    {/* Book new appointment */}
                    <form onSubmit={handleBook} className="p-4 rounded-2xl border border-border bg-card space-y-3">
                      <div className="flex items-center gap-2">
                        <CalendarPlus className="w-4 h-4 text-olo" />
                        <h3 className="font-heading font-600 text-sm">Book an appointment</h3>
                      </div>
                      <div className="grid grid-cols-2 gap-3">
                        <div>
                          <label className="text-[10px] text-muted-foreground uppercase tracking-wider">Date</label>
                          <input
                            type="date"
                            required
                            value={bookingForm.requested_date}
                            onChange={(e) => setBookingForm({ ...bookingForm, requested_date: e.target.value })}
                            className="w-full h-11 px-3 mt-1 rounded-xl border border-border bg-background focus:border-olo focus:outline-none text-sm"
                          />
                        </div>
                        <div>
                          <label className="text-[10px] text-muted-foreground uppercase tracking-wider">Time</label>
                          <input
                            type="time"
                            value={bookingForm.requested_time}
                            onChange={(e) => setBookingForm({ ...bookingForm, requested_time: e.target.value })}
                            className="w-full h-11 px-3 mt-1 rounded-xl border border-border bg-background focus:border-olo focus:outline-none text-sm"
                          />
                        </div>
                      </div>
                      <input
                        value={bookingForm.reason}
                        onChange={(e) => setBookingForm({ ...bookingForm, reason: e.target.value })}
                        placeholder="Reason (whitening consult, checkup…)"
                        className="w-full h-11 px-3 rounded-xl border border-border bg-background focus:border-olo focus:outline-none text-sm"
                      />
                      <button
                        type="submit"
                        disabled={booking}
                        className="w-full bg-olo text-white font-semibold py-2.5 rounded-xl hover:opacity-90 disabled:opacity-50 inline-flex items-center justify-center gap-2"
                      >
                        {booking ? <Loader2 className="w-4 h-4 animate-spin" /> : <CalendarPlus className="w-4 h-4" />} Request appointment
                      </button>
                    </form>

                    {/* Pending appointments */}
                    {pendingAppts.length > 0 && (
                      <div>
                        <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2">Upcoming</h3>
                        <div className="space-y-2">
                          {pendingAppts.map((a) => (
                            <div key={a.id} className="p-3 rounded-2xl border border-border bg-card">
                              <div className="flex items-start justify-between gap-2">
                                <div>
                                  <p className="text-sm font-medium flex items-center gap-1.5">
                                    <Calendar className="w-3.5 h-3.5 text-olo" /> {a.requested_date || 'No date'}
                                    {a.requested_time && ` · ${a.requested_time}`}
                                  </p>
                                  {a.reason && <p className="text-xs text-muted-foreground mt-0.5">{a.reason}</p>}
                                  <span className={`inline-block mt-1 text-[10px] font-semibold px-2 py-0.5 rounded-full ${a.status === 'confirmed' ? 'bg-olo/10 text-olo' : 'bg-amber-500/10 text-amber-500'}`}>
                                    {a.status}
                                  </span>
                                </div>
                              </div>
                              {cancelId === a.id ? (
                                <div className="mt-2 space-y-2">
                                  <textarea
                                    value={cancelReason}
                                    onChange={(e) => setCancelReason(e.target.value)}
                                    placeholder="Why can't you attend?"
                                    rows="2"
                                    className="w-full p-2 rounded-xl border border-border bg-background focus:border-olo focus:outline-none text-sm resize-none"
                                  />
                                  <div className="flex gap-2">
                                    <button
                                      onClick={handleCancel}
                                      disabled={!cancelReason.trim() || cancelingId === a.id}
                                      className="flex-1 bg-destructive text-white text-sm font-semibold py-2 rounded-xl hover:opacity-90 disabled:opacity-50 inline-flex items-center justify-center gap-1.5"
                                    >
                                      {cancelingId === a.id ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Check className="w-3.5 h-3.5" />} Confirm
                                    </button>
                                    <button
                                      onClick={() => { setCancelId(null); setCancelReason(''); }}
                                      className="border border-border text-muted-foreground px-3 rounded-xl text-sm hover:text-foreground"
                                    >
                                      Cancel
                                    </button>
                                  </div>
                                </div>
                              ) : (
                                <button
                                  onClick={() => setCancelId(a.id)}
                                  className="mt-2 text-xs font-medium text-destructive border border-destructive/30 px-3 py-1.5 rounded-lg hover:bg-destructive/5"
                                >
                                  Can't attend
                                </button>
                              )}
                            </div>
                          ))}
                        </div>
                      </div>
                    )}

                    {/* Past appointments */}
                    {pastAppts.length > 0 && (
                      <div>
                        <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2">History</h3>
                        <div className="space-y-2">
                          {pastAppts.map((a) => (
                            <div key={a.id} className={`p-3 rounded-2xl border border-border bg-card ${a.status === 'completed' ? '' : 'opacity-75'}`}>
                              <div className="flex items-start justify-between gap-2">
                                <div className="min-w-0">
                                  <p className="text-sm font-medium">
                                    {a.requested_date || 'No date'} {a.requested_time && `· ${a.requested_time}`}
                                  </p>
                                  {a.reason && <p className="text-xs text-muted-foreground mt-0.5">{a.reason}</p>}
                                  {a.patient_cancel_reason && (
                                    <p className="text-xs text-amber-600 dark:text-amber-400 mt-1">Reason: {a.patient_cancel_reason}</p>
                                  )}
                                </div>
                                <span className={`text-[10px] font-semibold px-2 py-0.5 rounded-full whitespace-nowrap ${
                                  a.status === 'completed' ? 'bg-emerald-500/10 text-emerald-500' :
                                  a.status === 'missed' ? 'bg-rose-500/10 text-rose-500' :
                                  a.status === 'postponed' ? 'bg-orange-500/10 text-orange-500' :
                                  'bg-muted text-muted-foreground'
                                }`}>
                                  {a.status}
                                </span>
                              </div>
                              {/* Treatment summary — shown when the dentist recorded treatment details */}
                              {a.status === 'completed' && (a.treatment_type || a.treatment_notes || a.teeth_treated) && (
                                <div className="mt-2 p-2.5 rounded-xl bg-emerald-500/5 border border-emerald-500/15 space-y-1">
                                  <div className="flex items-center gap-1.5">
                                    <TreatmentIcon type={a.treatment_type} className="w-3.5 h-3.5 text-emerald-600" />
                                    <span className="text-xs font-medium">{treatmentLabel(a.treatment_type)}</span>
                                  </div>
                                  {a.teeth_treated && (
                                    <p className="text-[11px] text-muted-foreground"><span className="font-medium">Teeth:</span> {a.teeth_treated}</p>
                                  )}
                                  {a.treatment_notes && (
                                    <p className="text-[11px] text-muted-foreground leading-relaxed whitespace-pre-wrap">{a.treatment_notes}</p>
                                  )}
                                </div>
                              )}
                            </div>
                          ))}
                        </div>
                      </div>
                    )}

                    {appointments.length === 0 && pendingAppts.length === 0 && (
                      <p className="text-sm text-muted-foreground text-center py-4">No appointments yet. Book one above.</p>
                    )}
                  </div>
                )}
              </>
            )}
          </div>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
}