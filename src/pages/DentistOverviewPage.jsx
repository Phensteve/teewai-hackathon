import { useState, useEffect } from 'react';
import { useOutletContext, Link } from 'react-router-dom';
import { unrufld } from '@/api/unrufldClient';
import { Users, Inbox, CreditCard, Calendar, TrendingUp, ArrowRight } from 'lucide-react';

export default function DentistOverviewPage() {
  const { user, profile } = useOutletContext();
  const [stats, setStats] = useState({ patients: 0, pending: 0, slots: 0, slotsUsed: 0, active: false, expiry: null });

  useEffect(() => {
    (async () => {
      try {
        const [assignments, pending, subs] = await Promise.all([
          unrufld.entities.DentistAssignment.filter({ dentist_user_id: user.id, status: 'active' }),
          unrufld.entities.DentistAssignment.filter({ dentist_user_id: user.id, status: 'pending', initiated_by: 'dentist' }),
          unrufld.entities.DentistSubscription.filter({ dentist_user_id: user.id }),
        ]);
        const latest = subs.sort((a, b) => new Date(b.created_date) - new Date(a.created_date))[0];
        const active = latest?.status === 'active' && (!latest.period_end || new Date(latest.period_end) >= new Date());
        setStats({
          patients: assignments.length,
          pending: pending.length,
          slots: latest?.patient_slots || 0,
          slotsUsed: assignments.length,
          active,
          expiry: latest?.period_end,
        });
      } catch { /* non-fatal */ }
    })();
  }, [user]);

  const cards = [
    { label: 'Active patients', value: stats.patients, icon: Users, to: '/dentist-patients' },
    { label: 'Pending requests', value: stats.pending, icon: Inbox, to: '/dentist-pending' },
    { label: 'Slots used', value: `${stats.slotsUsed}/${stats.slots || 0}`, icon: TrendingUp, to: '/dentist-billing' },
    { label: 'Subscription', value: stats.active ? 'Active' : 'None', icon: CreditCard, to: '/dentist-billing' },
  ];

  return (
    <div className="max-w-3xl mx-auto px-4 sm:px-6 py-6">
      <h1 className="font-heading font-700 text-2xl tracking-tight mb-1">Overview</h1>
      <p className="text-sm text-muted-foreground mb-6">{profile?.full_name || profile?.clinic_name || 'Your practice'}</p>

      <div className="grid grid-cols-2 gap-3 mb-6">
        {cards.map((c) => (
          <Link key={c.label} to={c.to} className="p-5 rounded-2xl border border-border bg-card hover:border-olo/40 transition-colors">
            <div className="flex items-center gap-2 mb-2">
              <c.icon className="w-4 h-4 text-olo" />
              <span className="text-xs text-muted-foreground">{c.label}</span>
            </div>
            <p className="font-heading font-700 text-2xl">{c.value}</p>
          </Link>
        ))}
      </div>

      {stats.active && stats.expiry && (
        <div className="p-4 rounded-2xl border border-olo/20 bg-olo/5 flex items-center gap-3">
          <Calendar className="w-5 h-5 text-olo flex-shrink-0" />
          <p className="text-sm">Your subscription renews on <strong>{new Date(stats.expiry).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })}</strong>.</p>
        </div>
      )}

      {!stats.active && (
        <Link to="/dentist-billing" className="block p-4 rounded-2xl border border-olo/30 bg-olo/5 hover:bg-olo/10 transition-colors">
          <div className="flex items-center justify-between">
            <div>
              <p className="font-medium text-sm">Set up your subscription</p>
              <p className="text-xs text-muted-foreground">Choose patient slots to start adding patients.</p>
            </div>
            <ArrowRight className="w-5 h-5 text-olo" />
          </div>
        </Link>
      )}
    </div>
  );
}