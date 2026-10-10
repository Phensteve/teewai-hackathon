import { useState, useEffect, useCallback } from 'react';
import { adminAuth } from '@/lib/adminAuth';
import { Gift, Users, Wallet, TrendingUp, Clock, Search, Loader2, Link2, AlertTriangle } from 'lucide-react';
import Spinner from '@/components/Spinner';

const STATUS_BADGE = {
  pending: 'bg-muted text-muted-foreground',
  scanned: 'bg-olo/10 text-olo',
  rewarded: 'bg-success-soft text-success',
  expired: 'bg-danger-soft text-danger',
  completed: 'bg-success-soft text-success',
  processing: 'bg-olo/10 text-olo',
  batched: 'bg-olo/10 text-olo',
  failed: 'bg-danger-soft text-danger',
};

const STATUS_LABEL = {
  pending: 'Pending',
  scanned: 'Scanned',
  rewarded: 'Rewarded',
  expired: 'Expired',
  completed: 'Completed',
  processing: 'Processing',
  batched: 'Batched',
  failed: 'Failed',
};

const PLAN_LABELS = {
  free: 'Free',
  pro: 'Pro (monthly)',
  pro_yearly: 'Pro (yearly)',
  pro_weekly: 'Pro (weekly)',
  family_pro: 'Family Pro',
  pack_2: '2-scan pack',
  pack_15: '15-scan pack',
  pack_30: '30-scan pack',
  family_15: 'Family 15',
  family_extra_member: 'Family extra member',
  custom: 'Custom bundle',
};

function planLabel(plan) {
  return PLAN_LABELS[plan] || (plan && plan !== 'free' ? plan : 'Free');
}

export default function ReferralPanel() {
  const [loading, setLoading] = useState(true);
  const [accounts, setAccounts] = useState([]);
  const [referrals, setReferrals] = useState([]);
  const [withdrawals, setWithdrawals] = useState([]);
  const [search, setSearch] = useState('');
  const [view, setView] = useState('overview');
  const [error, setError] = useState('');

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const data = await adminAuth.listReferrals();
      setAccounts(data.accounts || []);
      setReferrals(data.referrals || []);
      setWithdrawals(data.withdrawals || []);
    } catch (e) {
      setError(e?.message || 'Could not load referrals');
    }
    setLoading(false);
  }, []);

  useEffect(() => { load(); }, [load]);

  // Stats
  const totalReferrers = accounts.length;
  const totalReferrals = referrals.length;
  const successfulReferrals = referrals.filter((r) => r.status === 'rewarded' || r.status === 'scanned').length;
  const pendingReferrals = referrals.filter((r) => r.status === 'pending').length;
  const blockedReferrals = referrals.filter((r) => r.blocked_reason).length;
  const totalPaidOut = withdrawals.filter((w) => w.status === 'completed').reduce((s, w) => s + (w.amount || 0), 0);
  const pendingWithdrawals = withdrawals.filter((w) => w.status === 'pending' || w.status === 'batched' || w.status === 'processing');
  const pendingWithdrawalAmount = pendingWithdrawals.reduce((s, w) => s + (w.amount || 0), 0);
  const totalHeldInBalance = accounts.reduce((s, a) => s + (a.balance_naira || 0), 0);
  const totalEarnedAllTime = accounts.reduce((s, a) => s + (a.total_earned || 0), 0);

  const filteredAccounts = search
    ? accounts.filter((a) =>
        a.referral_code?.toLowerCase().includes(search.toLowerCase()) ||
        a.user_id?.toLowerCase().includes(search.toLowerCase()))
    : accounts;

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <Spinner size={32} />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center gap-3 mb-2">
        <div className="w-10 h-10 rounded-xl bg-olo/10 flex items-center justify-center">
          <Gift className="w-5 h-5 text-olo" />
        </div>
        <div>
          <h2 className="font-heading font-700 text-xl">Referral system</h2>
          <p className="text-sm text-muted-foreground">Track referrals, rewards, and withdrawals</p>
        </div>
      </div>

      {error && (
        <div className="p-3 rounded-xl border border-danger/30 bg-danger-soft text-sm text-danger">{error}</div>
      )}

      {/* Stats grid */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <StatCard icon={Users} label="Total referrers" value={totalReferrers} />
        <StatCard icon={Link2} label="Total referrals" value={totalReferrals} sub={`${successfulReferrals} scanned · ${pendingReferrals} pending`} />
        <StatCard icon={Wallet} label="Pending withdrawals" value={`₦${pendingWithdrawalAmount.toLocaleString()}`} sub={`${pendingWithdrawals.length} requests`} />
        <StatCard icon={TrendingUp} label="Total paid out" value={`₦${totalPaidOut.toLocaleString()}`} sub={`₦${totalEarnedAllTime.toLocaleString()} earned all-time`} />
      </div>

      {blockedReferrals > 0 && (
        <div className="p-4 rounded-2xl border border-warning/30 bg-warning-soft flex items-start gap-3">
          <AlertTriangle className="w-5 h-5 text-warning flex-shrink-0 mt-0.5" />
          <div>
            <p className="font-medium text-sm text-warning">{blockedReferrals} blocked referral{blockedReferrals !== 1 ? 's' : ''}</p>
            <p className="text-xs text-muted-foreground">Anti-exploitation checks blocked these referrals (self-referral, same device, or circular). See the referrals list for details.</p>
          </div>
        </div>
      )}

      {/* View tabs */}
      <div className="flex gap-1 bg-muted/50 rounded-xl p-1">
        {[
          { id: 'overview', label: 'Accounts' },
          { id: 'referrals', label: 'Referrals' },
          { id: 'withdrawals', label: 'Withdrawals' },
        ].map((t) => (
          <button
            key={t.id}
            onClick={() => setView(t.id)}
            className={`flex-1 py-2 rounded-lg text-sm font-medium transition-all ${view === t.id ? 'bg-card text-foreground shadow-sm' : 'text-muted-foreground hover:text-foreground'}`}
          >
            {t.label}
          </button>
        ))}
      </div>

      {/* Accounts view */}
      {view === 'overview' && (
        <div>
          <div className="relative mb-4">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search by code or user ID…"
              className="w-full pl-10 pr-4 py-2.5 rounded-xl border border-border bg-card text-sm focus:outline-none focus:border-olo"
            />
          </div>
          {filteredAccounts.length === 0 ? (
            <EmptyState text="No referral accounts yet." />
          ) : (
            <div className="space-y-2">
              {filteredAccounts.map((a) => (
                <div key={a.id} className="p-4 rounded-2xl border border-border bg-card">
                  <div className="flex items-center justify-between mb-2">
                    <div className="flex items-center gap-2">
                      <code className="font-heading font-700 text-olo tracking-wider">{a.referral_code}</code>
                      {a.code_active ? (
                        <span className="text-[10px] font-bold text-success bg-success-soft px-2 py-0.5 rounded-full">ACTIVE</span>
                      ) : (
                        <span className="text-[10px] font-bold text-muted-foreground bg-muted px-2 py-0.5 rounded-full">INACTIVE</span>
                      )}
                    </div>
                    <span className="text-xs text-muted-foreground">{planLabel(a.plan_type)}</span>
                  </div>
                  <div className="grid grid-cols-4 gap-2 text-sm">
                    <div>
                      <p className="text-[11px] text-muted-foreground">Balance</p>
                      <p className="font-semibold">₦{(a.balance_naira || 0).toLocaleString()}</p>
                    </div>
                    <div>
                      <p className="text-[11px] text-muted-foreground">Earned</p>
                      <p className="font-semibold">₦{(a.total_earned || 0).toLocaleString()}</p>
                    </div>
                    <div>
                      <p className="text-[11px] text-muted-foreground">Successful</p>
                      <p className="font-semibold">{a.successful_referrals || 0}</p>
                    </div>
                    <div>
                      <p className="text-[11px] text-muted-foreground">Pending</p>
                      <p className="font-semibold">{a.pending_referrals || 0}</p>
                    </div>
                  </div>
                  <p className="text-[11px] text-muted-foreground mt-2 truncate">{a.user_email || 'No email'} · {a.user_id}</p>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Referrals view */}
      {view === 'referrals' && (
        <div>
          {referrals.length === 0 ? (
            <EmptyState text="No referrals yet." />
          ) : (
            <div className="space-y-2">
              {referrals.map((r) => (
                <div key={r.id} className="p-4 rounded-2xl border border-border bg-card">
                  <div className="flex items-center justify-between mb-1">
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-medium">{r.invited_username || r.invited_email || 'Anonymous'}</span>
                      {r.blocked_reason && (
                        <span className="text-[10px] font-bold text-danger bg-danger-soft px-2 py-0.5 rounded-full uppercase">
                          {r.blocked_reason.replace('_', ' ')}
                        </span>
                      )}
                    </div>
                    <span className={`text-xs font-semibold px-2.5 py-1 rounded-full ${STATUS_BADGE[r.status] || 'bg-muted'}`}>
                      {STATUS_LABEL[r.status] || r.status}
                    </span>
                  </div>
                  <div className="flex items-center justify-between text-xs text-muted-foreground">
                    <span>Code: {r.referrer_code}</span>
                    <span>{new Date(r.created_date).toLocaleDateString()}</span>
                  </div>
                  {r.reward_pair_id && (
                    <p className="text-[11px] text-success mt-1">Reward: ₦{getRewardAmount(r).toLocaleString()} · {r.reward_pair_id}</p>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Withdrawals view */}
      {view === 'withdrawals' && (
        <div>
          {withdrawals.length === 0 ? (
            <EmptyState text="No withdrawal requests yet." />
          ) : (
            <div className="space-y-2">
              {withdrawals.map((w) => (
                <div key={w.id} className="p-4 rounded-2xl border border-border bg-card">
                  <div className="flex items-center justify-between mb-2">
                    <p className="font-heading font-700 text-lg">₦{(w.amount || 0).toLocaleString()}</p>
                    <span className={`text-xs font-semibold px-2.5 py-1 rounded-full ${STATUS_BADGE[w.status] || 'bg-muted'}`}>
                      {STATUS_LABEL[w.status] || w.status}
                    </span>
                  </div>
                  <div className="grid grid-cols-2 gap-2 text-xs text-muted-foreground">
                    <div>
                      <p>Bank: {w.bank_name || '—'}</p>
                      <p>Acct: {w.account_number || '—'}</p>
                      <p>Name: {w.account_name || '—'}</p>
                    </div>
                    <div className="text-right">
                      <p>Batch: {w.batch_time} · {w.batch_date ? new Date(w.batch_date).toLocaleDateString() : '—'}</p>
                      <p>Requested: {w.requested_date ? new Date(w.requested_date).toLocaleDateString() : '—'}</p>
                      {w.failure_reason && <p className="text-danger">Failed: {w.failure_reason}</p>}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

function getRewardAmount(r) {
  return r.reward_amount || 50;
}

function StatCard({ icon: Icon, label, value, sub }) {
  return (
    <div className="p-4 rounded-2xl border border-border bg-card">
      <div className="flex items-center gap-2 mb-1">
        <Icon className="w-4 h-4 text-olo" />
        <p className="text-xs text-muted-foreground">{label}</p>
      </div>
      <p className="font-heading font-800 text-xl">{value}</p>
      {sub && <p className="text-[11px] text-muted-foreground mt-0.5">{sub}</p>}
    </div>
  );
}

function EmptyState({ text }) {
  return (
    <div className="py-12 text-center">
      <p className="text-sm text-muted-foreground">{text}</p>
    </div>
  );
}