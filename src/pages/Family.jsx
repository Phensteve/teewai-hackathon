import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { unrufld } from '@/api/unrufldClient';
import { subscriptions } from '@/lib/insforgeDb';
import FamilyDashboard from '@/components/FamilyDashboard';
import FamilyHealthRanking from '@/components/FamilyHealthRanking';
import PageSkeleton from '@/components/loading/PageSkeleton';
import { Users, Trophy, ShieldCheck, WifiOff, RotateCcw } from 'lucide-react';

export default function Family() {
  const [subscription, setSubscription] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);
  const [familyMembership, setFamilyMembership] = useState(null);
  const [adminOf, setAdminOf] = useState(null);

  const loadData = async () => {
    setLoading(true);
    setError(false);
    try {
      const s = await subscriptions.filter({});
      const sub = s[0] || null;
      if (sub) {
        if (sub.plan === 'family_pro') {
          // family_pro is a monthly plan — auto-reset member counters when
          // the billing cycle rolls over. family_15 is a one-time scan bundle
          // (scans never expire), so it is NOT reset monthly.
          const now = new Date();
          const baseDate = sub.renewal_date || sub.started_date || sub.created_date;
          if (baseDate) {
            const renewal = new Date(baseDate);
            if (now >= renewal) {
              const members = (sub.members || []).map((m) => ({ ...m, scans_used: 0 }));
              const nextRenewal = new Date(renewal);
              nextRenewal.setMonth(nextRenewal.getMonth() + 1);
              await subscriptions.update(sub.id, { members, renewal_date: nextRenewal.toISOString() });
              setSubscription({ ...sub, members, renewal_date: nextRenewal.toISOString() });
            } else {
              setSubscription(sub);
            }
          } else {
            setSubscription(sub);
          }
        } else {
          setSubscription(sub);
        }
      }
    } catch {
      setError(true);
    } finally {
      setLoading(false);
    }
    unrufld.functions.invoke('familyResolve', { op: 'resolve' })
      .then(async ({ data }) => {
        if (!data?.found) return;
        setFamilyMembership(data);
        if (data?.is_admin) {
          try {
            const { data: manage } = await unrufld.functions.invoke('familyResolve', { op: 'manageAs' });
            if (manage?.subscription) setAdminOf(manage.subscription);
          } catch {}
        }
      })
      .catch(() => {});
  };

  useEffect(() => { loadData(); }, []);

  if (loading) return <PageSkeleton title="Family dashboard" />;

  if (error) {
    return (
      <div className="max-w-md mx-auto text-center py-16 px-4">
        <div className="w-14 h-14 rounded-2xl bg-danger-soft flex items-center justify-center mx-auto mb-5">
          <WifiOff className="w-7 h-7 text-danger" />
        </div>
        <h2 className="font-heading font-700 text-xl mb-2">We couldn't load your family plan</h2>
        <p className="text-sm text-muted-foreground mb-6">Your family members and scans are safe — this is usually a connection hiccup. Check your signal and try again.</p>
        <button onClick={() => loadData()} className="inline-flex items-center gap-2 bg-olo text-white font-semibold px-5 py-2.5 rounded-xl hover:scale-105 transition-transform olo-glow">
          <RotateCcw className="w-4 h-4" /> Try again
        </button>
      </div>
    );
  }

  const isFamily = subscription?.plan === 'family_15' || subscription?.plan === 'family_pro';

  // Family admin (linked member with admin rights) — manage the owner's family.
  if (!isFamily && familyMembership?.is_admin && adminOf) {
    return (
      <div className="max-w-3xl mx-auto">
        <div className="mb-6 p-5 rounded-2xl border border-olo/30 bg-olo/5 flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-olo/15 flex items-center justify-center flex-shrink-0">
            <ShieldCheck className="w-5 h-5 text-olo" />
          </div>
          <div>
            <p className="text-sm font-semibold text-olo">Family admin · managing {familyMembership.member_name || 'the family'}</p>
            <p className="text-xs text-muted-foreground">You can add, link, and remove members for this family.</p>
          </div>
        </div>
        <h1 className="font-heading font-700 text-2xl tracking-tight mb-6">Family dashboard</h1>
        <FamilyDashboard
          subscription={adminOf}
          isFamilyAdmin
          saveMembers={async (members) => { await unrufld.functions.invoke('familyResolve', { op: 'updateMembers', members }); }}
          onUpdated={(members) => setAdminOf({ ...adminOf, members })}
        />
        <div className="mt-8">
          <div className="flex items-center gap-2 mb-4">
            <Trophy className="w-5 h-5 text-olo" />
            <h2 className="font-heading font-700 text-xl">Family dental health ranking</h2>
          </div>
          <p className="text-sm text-muted-foreground mb-4">See how your family's smiles compare. Members without scans won't appear in the ranking until they scan.</p>
          <FamilyHealthRanking />
        </div>
      </div>
    );
  }

  // Linked member view — can see family health ranking but not manage members.
  if (!isFamily && familyMembership) {
    const famUsed = familyMembership.family_total_used ?? 0;
    const famLimit = familyMembership.family_total_limit;
    const isUnlimited = famLimit == null;
    const famPct = !isUnlimited && famLimit > 0 ? Math.min(100, (famUsed / famLimit) * 100) : 0;
    return (
      <div className="max-w-3xl mx-auto">
        <div className="mb-6 p-5 rounded-2xl border border-olo/30 bg-olo/5 flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-olo/15 flex items-center justify-center flex-shrink-0">
            <Users className="w-5 h-5 text-olo" />
          </div>
          <div>
            <p className="text-sm font-semibold text-olo">Family plan · {familyMembership.member_name || 'Member'}</p>
            <p className="text-xs text-muted-foreground capitalize">{familyMembership.member_role || 'Member'} · {familyMembership.scans_used}/{familyMembership.scans_limit} scans used</p>
          </div>
        </div>

        {/* Family-wide scan total — visible to every member */}
        <div className="mb-6 p-5 sm:p-6 rounded-3xl border border-olo/30 bg-olo/5">
          <div className="flex items-center justify-between flex-wrap gap-3">
            <div className="flex items-center gap-3">
              <div className="w-11 h-11 rounded-2xl bg-olo flex items-center justify-center olo-glow">
                <Users className="w-5 h-5 text-white" />
              </div>
              <div>
                <h3 className="font-heading font-700 text-lg">Family usage</h3>
                <p className="text-xs text-muted-foreground">{familyMembership.family_member_count || 0} members · {familyMembership.plan === 'family_pro' ? 'unlimited scans each' : '15 scans each'}</p>
              </div>
            </div>
            <div className="text-right">
              <p className="text-xs text-muted-foreground uppercase tracking-wider">Total scans</p>
              <p className="font-heading font-800 text-2xl text-olo">
                {famUsed}{isUnlimited ? <span className="text-base text-muted-foreground font-500"> / unlimited</span> : <span className="text-base text-muted-foreground font-500">/{famLimit}</span>}
              </p>
            </div>
          </div>
          {!isUnlimited && (
            <div className="mt-4 h-2 rounded-full bg-muted overflow-hidden">
              <div className="h-full bg-olo rounded-full transition-all" style={{ width: `${famPct}%` }} />
            </div>
          )}
        </div>

        <h1 className="font-heading font-700 text-2xl tracking-tight mb-4">Family dental health</h1>
        <FamilyHealthRanking />
      </div>
    );
  }

  if (!isFamily) {
    return (
      <div className="max-w-lg mx-auto text-center py-16">
        <div className="w-16 h-16 rounded-2xl bg-olo/10 flex items-center justify-center mx-auto mb-5">
          <Users className="w-8 h-8 text-olo" />
        </div>
        <h1 className="font-heading font-700 text-2xl mb-2">Family plan</h1>
        <p className="text-muted-foreground mb-6">You need a Family plan to manage member slots and share scans across your household.</p>
        <Link to="/subscription" className="inline-flex items-center gap-2 bg-olo text-white font-semibold px-6 py-3 rounded-xl hover:scale-105 transition-transform olo-glow">
          Get Family plan
        </Link>
      </div>
    );
  }

  return (
    <div className="max-w-3xl mx-auto">
      <h1 className="font-heading font-700 text-2xl tracking-tight mb-6">Family dashboard</h1>
      <FamilyDashboard subscription={subscription} onUpdated={(members) => setSubscription({ ...subscription, members })} />

      <div className="mt-8">
        <div className="flex items-center gap-2 mb-4">
          <Trophy className="w-5 h-5 text-olo" />
          <h2 className="font-heading font-700 text-xl">Family dental health ranking</h2>
        </div>
        <p className="text-sm text-muted-foreground mb-4">See how your family's smiles compare. Members without scans won't appear in the ranking until they scan.</p>
        <FamilyHealthRanking members={subscription?.members} />
      </div>
    </div>
  );
}