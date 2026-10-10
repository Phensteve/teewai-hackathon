import { useEffect, useMemo, useState } from 'react';
import { adminAuth } from '@/lib/adminAuth';
import AdminAnalytics from '@/components/AdminAnalytics';
import PlanPurchaseBreakdown from '@/components/admin/PlanPurchaseBreakdown';
import { useToast } from '@/components/ui/use-toast';
import { Users, Loader2, RefreshCw, Search, TrendingUp, CreditCard, Camera, DollarSign, Crown, ArrowUpDown, Ban, RotateCcw, Pencil, X, Gift, Eye, Trash2, Calendar, Trophy, Gauge, HeartPulse, BadgeCheck } from 'lucide-react';
import VerifiedBadge from '@/components/VerifiedBadge';

const PLAN_LABEL = {
  free: 'Free',
  pack_2: '2-pack',
  pack_15: '15-pack',
  pack_30: '30-pack',
  family_15: 'Family',
  pro: 'Pro',
  pro_yearly: 'Pro yearly',
  pro_weekly: 'Pro weekly',
  family_pro: 'Family Pro',
};

const PAGE_SIZE = 25;

const HOW_FOUND_OPTIONS = [
  { value: 'friend', label: 'Friend or family' },
  { value: 'social', label: 'Social media' },
  { value: 'search', label: 'Google search' },
  { value: 'dentist', label: 'My dentist' },
  { value: 'app_store', label: 'App store' },
  { value: 'from_owner', label: 'From the owner' },
  { value: 'other', label: 'Other' },
];

export default function UserManagement() {
  const { toast } = useToast();
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [query, setQuery] = useState('');
  const [sortKey, setSortKey] = useState('scans');
  const [actingId, setActingId] = useState(null);
  const [verifyingId, setVerifyingId] = useState(null);
  const [editing, setEditing] = useState(null);
  const [editForm, setEditForm] = useState({});
  const [editSaving, setEditSaving] = useState(false);
  const [editError, setEditError] = useState('');
  const [granting, setGranting] = useState(null);
  const [grantAmount, setGrantAmount] = useState(5);
  const [grantSaving, setGrantSaving] = useState(false);
  const [grantError, setGrantError] = useState('');
  const [viewing, setViewing] = useState(null);
  const [overview, setOverview] = useState(null);
  const [overviewLoading, setOverviewLoading] = useState(false);
  const [overviewError, setOverviewError] = useState('');
  const [cleaning, setCleaning] = useState(false);
  const [cleanupResult, setCleanupResult] = useState(null);
  const [page, setPage] = useState(1);

  const openOverview = async (u) => {
    setViewing(u);
    setOverview(null);
    setOverviewError('');
    setOverviewLoading(true);
    try {
      const data = await adminAuth.userOverview(u.user_id);
      setOverview(data);
    } catch (e) {
      setOverviewError(e?.message || 'Could not load overview');
    } finally {
      setOverviewLoading(false);
    }
  };

  const runCleanup = async () => {
    setCleaning(true);
    setCleanupResult(null);
    try {
      const result = await adminAuth.linkOrphanedPhotos();
      setCleanupResult(result);
      toast({ title: 'Investigation complete', description: `Linked ${result.linked} photo${result.linked === 1 ? '' : 's'} to scans · ${result.true_orphans} true orphan${result.true_orphans === 1 ? '' : 's'} (from deleted scans).` });
      await load();
    } catch (e) {
      toast({ title: 'Investigation failed', description: e?.message || 'Could not investigate', variant: 'destructive' });
    } finally {
      setCleaning(false);
    }
  };

  const grantScans = async () => {
    const n = Math.floor(Number(grantAmount));
    if (!granting || !n || n < 1) { setGrantError('Enter a number of scans (1 or more).'); return; }
    setGrantSaving(true);
    setGrantError('');
    try {
      await adminAuth.grantScans(granting.user_id, n);
      toast({ title: 'Scans added', description: `${n} scan${n === 1 ? '' : 's'} added to ${granting.full_name || granting.username || granting.email || 'user'}.` });
      setGranting(null);
      await load();
    } catch (e) {
      setGrantError(e?.message || 'Could not grant scans');
    } finally {
      setGrantSaving(false);
    }
  };

  const load = async () => {
    setLoading(true);
    setError('');
    try {
      setData(await adminAuth.listUsers());
    } catch (e) {
      setError(e?.message || 'Failed to load users');
    } finally {
      setLoading(false);
    }
  };

  const toggleStatus = async (u) => {
    const next = u.account_status === 'suspended' ? 'active' : 'suspended';
    setActingId(u.user_id);
    try {
      await adminAuth.setUserStatus(u.user_id, next);
      await load();
    } catch (e) {
      setError(e?.message || 'Could not update account');
    } finally {
      setActingId(null);
    }
  };

  const toggleVerify = async (u) => {
    const next = !u.is_verified;
    setVerifyingId(u.user_id);
    try {
      await adminAuth.updateUser(u.user_id, { is_verified: next });
      toast({ title: next ? 'Member verified' : 'Verification removed', description: `${u.full_name || u.username || u.email || 'user'} ${next ? 'now has a verified badge' : 'is no longer verified'}.` });
      await load();
    } catch (e) {
      setError(e?.message || 'Could not update verification');
    } finally {
      setVerifyingId(null);
    }
  };

  const openEdit = (u) => {
    setEditing(u);
    setEditForm({
      display_name: u.display_name || '',
      email: u.email || '',
      first_name: u.first_name || '',
      last_name: u.last_name || '',
      how_found: u.how_found || '',
      show_real_name: !!u.show_real_name,
    });
    setEditError('');
  };

  const saveEdit = async () => {
    setEditSaving(true);
    setEditError('');
    try {
      // Only send fields that actually changed — sending an unchanged email
      // triggers the super-admin-only email restriction and blocks the save.
      const changes = {};
      for (const k of Object.keys(editForm)) {
        if ((editForm[k] || '') !== (editing[k] || '')) changes[k] = editForm[k];
      }
      if (Object.keys(changes).length > 0) {
        await adminAuth.updateUser(editing.user_id, changes);
        toast({ title: 'User updated', description: `Saved changes to ${editing.full_name || editing.username || editing.email || 'user'}'s profile.` });
        await load();
      }
      setEditing(null);
    } catch (e) {
      setEditError(e?.message || 'Could not save changes');
    } finally {
      setEditSaving(false);
    }
  };

  useEffect(() => { load(); }, []);
  useEffect(() => { setPage(1); }, [query, sortKey]);

  const users = data?.users || [];
  const totals = data?.totals || { total_users: 0, paid_users: 0, free_users: 0, total_scans: 0, revenue_usd: 0, revenue_ngn: 0 };

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    let list = users;
    if (q) {
      list = list.filter((u) =>
        (u.full_name || '').toLowerCase().includes(q) ||
        (u.email || '').toLowerCase().includes(q) ||
        (u.username || '').toLowerCase().includes(q) ||
        (u.username_history || []).some((h) => String(h).toLowerCase().includes(q)) ||
        (u.user_id || '').toLowerCase().includes(q)
      );
    }
    const sorted = [...list];
    if (sortKey === 'scans') sorted.sort((a, b) => b.scan_count - a.scan_count);
    else if (sortKey === 'paid') sorted.sort((a, b) => (b.paid ? 1 : 0) - (a.paid ? 1 : 0) || b.scan_count - a.scan_count);
    else if (sortKey === 'name') sorted.sort((a, b) => (a.full_name || a.email || '').localeCompare(b.full_name || b.email || ''));
    else if (sortKey === 'recent') sorted.sort((a, b) => new Date(b.created_at || 0) - new Date(a.created_at || 0));
    else if (sortKey === 'latest_scan') sorted.sort((a, b) => new Date(b.last_scan_at || 0) - new Date(a.last_scan_at || 0));
    return sorted;
  }, [users, query, sortKey]);

  const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const currentPage = Math.min(page, totalPages);
  const paged = filtered.slice((currentPage - 1) * PAGE_SIZE, currentPage * PAGE_SIZE);
  const pageStart = filtered.length === 0 ? 0 : (currentPage - 1) * PAGE_SIZE + 1;
  const pageEnd = Math.min(filtered.length, currentPage * PAGE_SIZE);

  return (
    <div>
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 mb-6">
        <StatCard icon={Users} label="Total users" value={totals.total_users} tint="text-olo" />
        <StatCard icon={CreditCard} label="Paid users" value={totals.paid_users} sub={`${totals.free_users} free`} tint="text-emerald-500" />
        <StatCard icon={Camera} label="Total scans" value={totals.total_scans} tint="text-foreground" />
        <StatCard icon={DollarSign} label="Revenue" value={`$${totals.revenue_usd.toLocaleString()}`} sub={`₦${totals.revenue_ngn.toLocaleString()}`} tint="text-olo" />
      </div>

      <div className="flex items-center justify-end mb-6">
        <button
          onClick={runCleanup}
          disabled={cleaning}
          className="inline-flex items-center gap-2 text-xs font-medium px-3.5 py-2 rounded-xl border border-border bg-card text-muted-foreground hover:text-olo hover:border-olo/40 transition-colors disabled:opacity-50"
        >
          {cleaning ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Search className="w-3.5 h-3.5" />}
          {cleaning ? 'Investigating…' : 'Investigate orphaned photos'}
        </button>
      </div>
      {cleanupResult && (
        <div className="mb-6 p-4 rounded-2xl border border-olo/20 bg-olo/5 text-sm space-y-2">
          <p className="font-medium text-foreground">
            Investigation complete — linked {cleanupResult.linked} photo{cleanupResult.linked === 1 ? '' : 's'} to their scans.
          </p>
          <p className="text-xs text-muted-foreground">
            {cleanupResult.total_objects} photos in storage · {cleanupResult.referenced_count} already referenced · {cleanupResult.orphans_found} orphan{cleanupResult.orphans_found === 1 ? '' : 's'} found
          </p>
          {cleanupResult.true_orphans > 0 && (
            <p className="text-xs text-amber-600 dark:text-amber-400">
              {cleanupResult.true_orphans} true orphan{cleanupResult.true_orphans === 1 ? '' : 's'} from deleted or failed scans (no scan to link to). These are photos whose scan was deleted but the photo was left behind.
            </p>
          )}
          {cleanupResult.linked_details?.length > 0 && (
            <details className="text-xs text-muted-foreground">
              <summary className="cursor-pointer hover:text-olo">View linked photos ({cleanupResult.linked_details.length})</summary>
              <div className="mt-2 space-y-1 pl-4">
                {cleanupResult.linked_details.map((l, i) => (
                  <div key={i}>→ scan {l.scan_id?.slice(0, 8)}… ({l.time_diff_seconds}s apart)</div>
                ))}
              </div>
            </details>
          )}
        </div>
      )}

      <AdminAnalytics users={users} revenueEvents={data?.revenue_events || []} />

      <PlanPurchaseBreakdown revenueEvents={data?.revenue_events || []} />

      <HowFoundPanel users={users} />

      <div className="p-6 rounded-3xl border border-border bg-card">
        <div className="flex items-center justify-between gap-3 mb-4 flex-wrap">
          <div className="flex items-center gap-2">
            <Users className="w-5 h-5 text-olo" />
            <h2 className="font-heading font-600 text-lg">Users</h2>
            <span className="text-xs text-muted-foreground">{users.length} total</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="relative">
              <Search className="w-4 h-4 text-muted-foreground absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="Search name or email"
                className="pl-9 pr-3 py-2 rounded-xl border border-border bg-background text-sm focus:outline-none focus:border-olo w-48 sm:w-56"
              />
            </div>
            <button
              onClick={load}
              className="w-9 h-9 rounded-xl flex items-center justify-center text-muted-foreground hover:text-olo hover:bg-olo/5 transition-colors"
              title="Refresh"
            >
              <RefreshCw className="w-4 h-4" />
            </button>
          </div>
        </div>

        <div className="flex items-center gap-2 mb-4 flex-wrap">
          <ArrowUpDown className="w-3.5 h-3.5 text-muted-foreground" />
          {[
            { id: 'latest_scan', label: 'Latest scan' },
            { id: 'scans', label: 'Most scans' },
            { id: 'paid', label: 'Paying first' },
            { id: 'recent', label: 'Newest' },
            { id: 'name', label: 'Name' },
          ].map((s) => (
            <button
              key={s.id}
              onClick={() => setSortKey(s.id)}
              className={`text-xs px-2.5 py-1 rounded-full transition-colors ${
                sortKey === s.id ? 'bg-olo text-white' : 'bg-muted text-muted-foreground hover:text-foreground'
              }`}
            >
              {s.label}
            </button>
          ))}
        </div>

        {loading ? (
          <div className="flex justify-center py-10"><Loader2 className="w-5 h-5 text-muted-foreground animate-spin" /></div>
        ) : error ? (
          <p className="text-sm text-destructive py-6 text-center">{error}</p>
        ) : filtered.length === 0 ? (
          <div className="p-8 rounded-2xl border border-dashed border-border text-center text-muted-foreground text-sm">
            {users.length === 0 ? 'No users yet. They appear here automatically as people sign up.' : 'No users match your search.'}
          </div>
        ) : (
          <>
          <div className="space-y-2">
            {paged.map((u) => (
              <div key={u.user_id} className="flex items-center gap-3 p-3.5 rounded-2xl border border-border bg-background">
                <div className="w-10 h-10 rounded-xl bg-olo/10 flex items-center justify-center text-olo font-semibold flex-shrink-0">
                  {(u.full_name || u.email || '?').charAt(0).toUpperCase()}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="font-medium text-sm truncate flex items-center gap-1">
                    {u.full_name || u.username || '—'}
                    {u.is_verified && <VerifiedBadge size={13} />}
                    {u.username && <span className="text-muted-foreground font-normal"> · @{u.username}</span>}
                  </p>
                  {u.username_history?.length > 0 && (
                    <p className="text-[11px] text-amber-500/90 truncate">formerly @{u.username_history.join(', @')}</p>
                  )}
                  <p className="text-xs text-muted-foreground truncate">{u.email || '—'}</p>
                  <p className="text-[11px] text-muted-foreground/80 truncate">
                    Joined {u.created_at ? new Date(u.created_at).toLocaleString(undefined, { year: 'numeric', month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' }) : '—'}
                  </p>
                  {u.last_scan_at && (
                    <p className="text-[11px] text-olo/80 truncate">
                      Last scan {new Date(u.last_scan_at).toLocaleString(undefined, { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })}
                    </p>
                  )}
                </div>
                <div className="hidden sm:flex items-center gap-1.5 text-xs text-muted-foreground flex-shrink-0">
                  <Camera className="w-3.5 h-3.5" />
                  <span className="font-semibold text-foreground">{u.scan_count}</span>
                  scans
                </div>
                <div className="flex items-center gap-2 flex-shrink-0">
                  {u.paid ? (
                    <span className="inline-flex items-center gap-1 text-[10px] font-semibold px-2 py-1 rounded-full bg-olo/15 text-olo">
                      <Crown className="w-3 h-3" /> {PLAN_LABEL[u.plan] || u.plan}
                    </span>
                  ) : (
                    <span className="text-[10px] font-semibold px-2 py-1 rounded-full bg-muted text-muted-foreground">
                      {PLAN_LABEL[u.plan] || 'Free'}
                    </span>
                  )}
                  {u.account_status === 'suspended' && (
                    <span className="text-[10px] font-semibold px-2 py-1 rounded-full bg-amber-500/15 text-amber-500">Suspended</span>
                  )}
                  {u.account_status === 'deleted' && (
                    <span className="text-[10px] font-semibold px-2 py-1 rounded-full bg-destructive/15 text-destructive">Deleted</span>
                  )}
                  <button
                    onClick={() => openOverview(u)}
                    title="View account overview"
                    className="w-8 h-8 rounded-lg flex items-center justify-center text-muted-foreground hover:text-olo hover:bg-olo/10 transition-colors"
                  >
                    <Eye className="w-4 h-4" />
                  </button>
                  <button
                    onClick={() => { setGranting(u); setGrantAmount(5); setGrantError(''); }}
                    title="Grant extra scans"
                    className="w-8 h-8 rounded-lg flex items-center justify-center text-muted-foreground hover:text-olo hover:bg-olo/10 transition-colors"
                  >
                    <Gift className="w-4 h-4" />
                  </button>
                  <button
                    onClick={() => toggleVerify(u)}
                    disabled={verifyingId === u.user_id}
                    title={u.is_verified ? 'Remove verified badge' : 'Mark as verified'}
                    className={`w-8 h-8 rounded-lg flex items-center justify-center transition-colors disabled:opacity-40 ${
                      u.is_verified ? 'text-olo bg-olo/10 hover:bg-olo/20' : 'text-muted-foreground hover:text-olo hover:bg-olo/10'
                    }`}
                  >
                    {verifyingId === u.user_id ? <Loader2 className="w-4 h-4 animate-spin" /> : <BadgeCheck className="w-4 h-4" />}
                  </button>
                  <button
                    onClick={() => openEdit(u)}
                    title="Edit user info"
                    className="w-8 h-8 rounded-lg flex items-center justify-center text-muted-foreground hover:text-olo hover:bg-olo/10 transition-colors"
                  >
                    <Pencil className="w-4 h-4" />
                  </button>
                  {u.account_status !== 'deleted' && (
                    <button
                      onClick={() => toggleStatus(u)}
                      disabled={actingId === u.user_id}
                      title={u.account_status === 'suspended' ? 'Unsuspend account' : 'Suspend account'}
                      className="w-8 h-8 rounded-lg flex items-center justify-center text-muted-foreground hover:text-amber-500 hover:bg-amber-500/10 transition-colors disabled:opacity-40"
                    >
                      {actingId === u.user_id ? <Loader2 className="w-4 h-4 animate-spin" /> : u.account_status === 'suspended' ? <RotateCcw className="w-4 h-4" /> : <Ban className="w-4 h-4" />}
                    </button>
                  )}
                </div>
              </div>
            ))}
          </div>
          {filtered.length > PAGE_SIZE && (
            <div className="flex items-center justify-between gap-3 mt-4 pt-4 border-t border-border">
              <p className="text-xs text-muted-foreground">
                Showing {pageStart}–{pageEnd} of {filtered.length}
              </p>
              <div className="flex items-center gap-1.5">
                <button
                  onClick={() => setPage((p) => Math.max(1, p - 1))}
                  disabled={currentPage <= 1}
                  className="px-3 py-1.5 rounded-lg text-xs font-medium border border-border disabled:opacity-40 hover:border-olo/40 hover:text-olo transition-colors"
                >
                  Prev
                </button>
                <span className="text-xs text-muted-foreground px-1">
                  Page {currentPage} / {totalPages}
                </span>
                <button
                  onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                  disabled={currentPage >= totalPages}
                  className="px-3 py-1.5 rounded-lg text-xs font-medium border border-border disabled:opacity-40 hover:border-olo/40 hover:text-olo transition-colors"
                >
                  Next
                </button>
              </div>
            </div>
          )}
          </>
        )}
      </div>

      <p className="text-xs text-muted-foreground mt-3 flex items-center gap-1.5">
        <TrendingUp className="w-3.5 h-3.5" />
        Revenue reflects recorded purchases — money actually collected, not plan list prices.
      </p>

      {/* Grant scans modal */}
      {granting && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4" onClick={() => !grantSaving && setGranting(null)}>
          <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" />
          <div className="relative max-w-sm w-full rounded-3xl border border-border bg-card p-6 shadow-2xl" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between mb-2">
              <h3 className="font-heading font-600 text-lg flex items-center gap-2"><Gift className="w-5 h-5 text-olo" /> Grant scans</h3>
              <button onClick={() => setGranting(null)} disabled={grantSaving} className="w-8 h-8 rounded-lg flex items-center justify-center text-muted-foreground hover:text-foreground hover:bg-muted transition-colors">
                <X className="w-4 h-4" />
              </button>
            </div>
            <p className="text-sm text-muted-foreground mb-4">
              Add scans to <strong className="text-foreground">{granting.full_name || granting.username || granting.email || 'this user'}</strong>. They're added on top of their current balance{granting.scans_limit != null ? ` (limit ${granting.scans_limit}, used ${granting.scans_used ?? 0})` : ''}.
            </p>
            <Field label="Scans to add">
              <input
                type="number"
                min={1}
                max={1000}
                value={grantAmount}
                onChange={(e) => setGrantAmount(e.target.value)}
                className="w-full px-3 py-2 rounded-xl border border-border bg-background text-sm focus:outline-none focus:border-olo"
              />
            </Field>
            <div className="flex flex-wrap gap-2 mt-3">
              {[2, 5, 10, 25].map((n) => (
                <button key={n} onClick={() => setGrantAmount(n)} className={`px-3 py-1.5 rounded-xl text-xs font-medium transition-colors ${Number(grantAmount) === n ? 'bg-olo text-white' : 'bg-muted text-muted-foreground hover:text-foreground'}`}>
                  +{n}
                </button>
              ))}
            </div>
            {grantError && <p className="text-sm text-destructive mt-4">{grantError}</p>}
            <div className="flex gap-3 mt-6">
              <button onClick={() => setGranting(null)} disabled={grantSaving} className="flex-1 py-2.5 rounded-xl border border-border text-sm font-medium hover:bg-muted transition-colors">
                Cancel
              </button>
              <button onClick={grantScans} disabled={grantSaving} className="flex-1 py-2.5 rounded-xl bg-olo text-white text-sm font-semibold hover:bg-olo/90 transition-colors disabled:opacity-50 flex items-center justify-center gap-2">
                {grantSaving ? <><Loader2 className="w-4 h-4 animate-spin" /> Granting…</> : `Add ${Math.max(1, Math.floor(Number(grantAmount)) || 1)} scans`}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Edit user modal */}
      {editing && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4" onClick={() => !editSaving && setEditing(null)}>
          <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" />
          <div
            className="relative max-w-md w-full rounded-3xl border border-border bg-card p-6 shadow-2xl"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between mb-5">
              <h3 className="font-heading font-600 text-lg">Edit user</h3>
              <button
                onClick={() => setEditing(null)}
                disabled={editSaving}
                className="w-8 h-8 rounded-lg flex items-center justify-center text-muted-foreground hover:text-foreground hover:bg-muted transition-colors"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
            <div className="space-y-4">
              <Field label="Display name">
                <input
                  value={editForm.display_name}
                  onChange={(e) => setEditForm({ ...editForm, display_name: e.target.value })}
                  placeholder="The name shown across the app"
                  className="w-full px-3 py-2 rounded-xl border border-border bg-background text-sm focus:outline-none focus:border-olo"
                />
              </Field>
              <Field label="Email (super admin only)">
                <input
                  value={editForm.email}
                  onChange={(e) => setEditForm({ ...editForm, email: e.target.value })}
                  className="w-full px-3 py-2 rounded-xl border border-border bg-background text-sm focus:outline-none focus:border-olo"
                />
              </Field>
              <div className="grid grid-cols-2 gap-3">
                <Field label="First name">
                  <input
                    value={editForm.first_name}
                    onChange={(e) => setEditForm({ ...editForm, first_name: e.target.value })}
                    className="w-full px-3 py-2 rounded-xl border border-border bg-background text-sm focus:outline-none focus:border-olo"
                  />
                </Field>
                <Field label="Last name">
                  <input
                    value={editForm.last_name}
                    onChange={(e) => setEditForm({ ...editForm, last_name: e.target.value })}
                    className="w-full px-3 py-2 rounded-xl border border-border bg-background text-sm focus:outline-none focus:border-olo"
                  />
                </Field>
              </div>
              <Field label="How they found us">
                <select
                  value={editForm.how_found}
                  onChange={(e) => setEditForm({ ...editForm, how_found: e.target.value })}
                  className="w-full px-3 py-2 rounded-xl border border-border bg-background text-sm focus:outline-none focus:border-olo"
                >
                  <option value="">Not specified</option>
                  {HOW_FOUND_OPTIONS.map((o) => (
                    <option key={o.value} value={o.value}>{o.label}</option>
                  ))}
                </select>
              </Field>
              <label className="flex items-start gap-3 p-3 rounded-xl border border-border bg-background cursor-pointer hover:border-olo/40 transition-colors">
                <input
                  type="checkbox"
                  checked={editForm.show_real_name}
                  onChange={(e) => setEditForm({ ...editForm, show_real_name: e.target.checked })}
                  className="mt-0.5 w-4 h-4 rounded accent-olo flex-shrink-0"
                />
                <div>
                  <p className="text-sm font-medium flex items-center gap-1.5">
                    <BadgeCheck className="w-4 h-4 text-olo" /> Show real name as verified
                  </p>
                  <p className="text-[11px] text-muted-foreground mt-0.5 leading-relaxed">
                    When on, this verified member's real name (first + last) is shown in the Common Room instead of their display name. Only affects verified members.
                  </p>
                </div>
              </label>
            </div>
            {editError && <p className="text-sm text-destructive mt-4">{editError}</p>}
            <div className="flex gap-3 mt-6">
              <button
                onClick={() => setEditing(null)}
                disabled={editSaving}
                className="flex-1 py-2.5 rounded-xl border border-border text-sm font-medium hover:bg-muted transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={saveEdit}
                disabled={editSaving}
                className="flex-1 py-2.5 rounded-xl bg-olo text-white text-sm font-semibold hover:bg-olo/90 transition-colors disabled:opacity-50 flex items-center justify-center gap-2"
              >
                {editSaving ? <><Loader2 className="w-4 h-4 animate-spin" /> Saving…</> : 'Save changes'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Account overview modal */}
      {viewing && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4" onClick={() => !overviewLoading && setViewing(null)}>
          <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" />
          <div
            className="relative max-w-2xl w-full max-h-[85vh] overflow-y-auto rounded-3xl border border-border bg-card p-6 shadow-2xl"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between mb-5 sticky top-0 bg-card pb-3 -mx-6 px-6 border-b border-border z-10">
              <h3 className="font-heading font-600 text-lg flex items-center gap-2">
                <Eye className="w-5 h-5 text-olo" /> Account overview
              </h3>
              <button
                onClick={() => setViewing(null)}
                disabled={overviewLoading}
                className="w-8 h-8 rounded-lg flex items-center justify-center text-muted-foreground hover:text-foreground hover:bg-muted transition-colors"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {overviewLoading ? (
              <div className="flex justify-center py-16"><Loader2 className="w-6 h-6 text-olo animate-spin" /></div>
            ) : overviewError ? (
              <p className="text-sm text-destructive py-6 text-center">{overviewError}</p>
            ) : overview ? (
              <div className="space-y-5">
                {/* Profile header */}
                <div className="flex items-center gap-4">
                  <div className="w-14 h-14 rounded-2xl bg-olo/10 flex items-center justify-center text-olo font-heading font-700 text-xl flex-shrink-0">
                    {(overview.profile?.full_name || overview.profile?.email || '?').charAt(0).toUpperCase()}
                  </div>
                  <div className="min-w-0">
                    <p className="font-heading font-600 text-base truncate">
                      {overview.profile?.full_name || overview.profile?.display_name || '—'}
                      {overview.profile?.username && <span className="text-muted-foreground font-normal"> · @{overview.profile.username}</span>}
                    </p>
                    <p className="text-sm text-muted-foreground truncate">{overview.profile?.email || '—'}</p>
                    <div className="flex items-center gap-2 mt-1 flex-wrap">
                      <span className={`text-[10px] font-semibold px-2 py-0.5 rounded-full ${overview.profile?.account_status === 'active' ? 'bg-emerald-500/15 text-emerald-500' : 'bg-amber-500/15 text-amber-500'}`}>
                        {overview.profile?.account_status || 'active'}
                      </span>
                      <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-muted text-muted-foreground capitalize">
                        {overview.profile?.role || 'user'}
                      </span>
                      {overview.subscription && (
                        <span className={`text-[10px] font-semibold px-2 py-0.5 rounded-full ${overview.subscription.plan !== 'free' ? 'bg-olo/15 text-olo' : 'bg-muted text-muted-foreground'}`}>
                          {PLAN_LABEL[overview.subscription.plan] || overview.subscription.plan}
                        </span>
                      )}
                    </div>
                  </div>
                </div>

                {/* Quick stats */}
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                  <MiniStat icon={Camera} label="Scans" value={overview.scan_count} sub={`${overview.credits_used} credits`} />
                  <MiniStat icon={CreditCard} label="Plan limit" value={overview.subscription?.scans_limit ?? '—'} sub={`${overview.subscription?.scans_used ?? 0} used`} />
                  <MiniStat icon={Trophy} label="MMR" value={overview.progress?.mmr ?? 0} sub={`peak ${overview.progress?.peak_mmr ?? 0}`} />
                  <MiniStat icon={Calendar} label="Joined" value={overview.profile?.created_date ? new Date(overview.profile.created_date).toLocaleDateString(undefined, { month: 'short', day: 'numeric' }) : '—'} />
                </div>

                {/* Profile details */}
                <div className="p-4 rounded-2xl border border-border bg-background space-y-2">
                  <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-2">Profile</p>
                  <DetailRow label="First name" value={overview.profile?.first_name} />
                  <DetailRow label="Last name" value={overview.profile?.last_name} />
                  <DetailRow label="Phone" value={overview.profile?.phone_number} />
                  <DetailRow label="How found" value={overview.profile?.how_found ? (HOW_FOUND_OPTIONS.find((o) => o.value === overview.profile.how_found)?.label || overview.profile.how_found) : null} />
                  <DetailRow label="Wears appliance" value={overview.profile?.wears_appliance ? `Yes — ${overview.profile.appliance_type || 'unspecified'}` : 'No'} />
                  <DetailRow label="Last scan" value={overview.progress?.last_scan_date ? new Date(overview.progress.last_scan_date).toLocaleString(undefined, { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' }) : '—'} />
                </div>

                {/* Subscription + purchases */}
                {overview.subscription && (
                  <div className="p-4 rounded-2xl border border-border bg-background">
                    <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-2">Subscription</p>
                    <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 text-sm">
                      <div><p className="text-xs text-muted-foreground">Plan</p><p className="font-medium">{PLAN_LABEL[overview.subscription.plan] || overview.subscription.plan}</p></div>
                      <div><p className="text-xs text-muted-foreground">Status</p><p className="font-medium capitalize">{overview.subscription.status}</p></div>
                      <div><p className="text-xs text-muted-foreground">Scans</p><p className="font-medium">{overview.subscription.scans_used} / {overview.subscription.scans_limit}</p></div>
                      {overview.subscription.started_date && <div><p className="text-xs text-muted-foreground">Started</p><p className="font-medium">{new Date(overview.subscription.started_date).toLocaleDateString(undefined, { month: 'short', day: 'numeric' })}</p></div>}
                      {overview.subscription.renewal_date && <div><p className="text-xs text-muted-foreground">Renews</p><p className="font-medium">{new Date(overview.subscription.renewal_date).toLocaleDateString(undefined, { month: 'short', day: 'numeric' })}</p></div>}
                      {overview.subscription.members?.length > 0 && <div><p className="text-xs text-muted-foreground">Family</p><p className="font-medium">{overview.subscription.members.length} members</p></div>}
                    </div>
                    {overview.subscription.purchases?.length > 0 && (
                      <div className="mt-3 pt-3 border-t border-border">
                        <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-2">Purchase history</p>
                        <div className="space-y-1.5 max-h-32 overflow-y-auto">
                          {overview.subscription.purchases.map((pu, i) => (
                            <div key={i} className="flex items-center justify-between text-xs">
                              <span className="text-muted-foreground">{pu.date ? new Date(pu.date).toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' }) : '—'}</span>
                              <span className="font-medium">{PLAN_LABEL[pu.plan] || pu.plan || '—'}</span>
                              <span className="text-olo font-semibold">${Number(pu.amount_usd || 0).toFixed(2)}</span>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                )}

                {/* Progress / gamification */}
                {overview.progress && (
                  <div className="p-4 rounded-2xl border border-border bg-background">
                    <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-2 flex items-center gap-1.5"><TrendingUp className="w-3.5 h-3.5 text-olo" /> Progress</p>
                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-sm">
                      <div><p className="text-xs text-muted-foreground">Season XP</p><p className="font-medium">{overview.progress.season_xp ?? 0}</p></div>
                      <div><p className="text-xs text-muted-foreground">Total XP</p><p className="font-medium">{overview.progress.total_xp ?? 0}</p></div>
                      <div><p className="text-xs text-muted-foreground">Peak rank</p><p className="font-medium">{overview.progress.peak_rank || '—'}</p></div>
                      <div><p className="text-xs text-muted-foreground">Rewards</p><p className="font-medium">{overview.progress.rewards_earned?.length || 0}</p></div>
                    </div>
                    {overview.progress.milestones_earned?.length > 0 && (
                      <div className="mt-3 flex flex-wrap gap-1.5">
                        {overview.progress.milestones_earned.map((m, i) => (
                          <span key={i} className="text-[10px] font-medium px-2 py-0.5 rounded-full bg-olo/10 text-olo">{m}</span>
                        ))}
                      </div>
                    )}
                  </div>
                )}

                {/* Scan history */}
                {overview.scans?.length > 0 && (
                  <div className="p-4 rounded-2xl border border-border bg-background">
                    <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-3 flex items-center gap-1.5"><Camera className="w-3.5 h-3.5 text-olo" /> Scan history ({overview.scans.length})</p>
                    <div className="space-y-2 max-h-64 overflow-y-auto">
                      {overview.scans.map((s) => (
                        <div key={s.id} className="flex items-center gap-3 p-2.5 rounded-xl bg-muted/30">
                          <div className="w-10 h-10 rounded-lg bg-muted flex items-center justify-center flex-shrink-0"><Camera className="w-4 h-4 text-muted-foreground" /></div>
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2">
                              <span className="text-xs font-medium capitalize">{s.scan_type}</span>
                              {s.scan_type === 'full' && <span className="text-[9px] font-bold text-olo bg-olo/10 px-1.5 py-0.5 rounded-full">×3</span>}
                              <span className={`text-[9px] font-semibold px-1.5 py-0.5 rounded-full ${s.status === 'completed' ? 'bg-emerald-500/10 text-emerald-500' : 'bg-amber-500/10 text-amber-500'}`}>{s.status}</span>
                            </div>
                            <p className="text-[11px] text-muted-foreground">{new Date(s.created_at).toLocaleString(undefined, { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })}</p>
                          </div>
                          <div className="flex items-center gap-3 text-xs flex-shrink-0">
                            {s.score != null && <span className="flex items-center gap-1"><Gauge className="w-3 h-3 text-olo" /><span className="font-semibold">{s.score}</span></span>}
                            {s.dental_health_score != null && <span className="flex items-center gap-1"><HeartPulse className="w-3 h-3 text-emerald-500" /><span className="font-semibold">{s.dental_health_score}</span></span>}
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            ) : null}
          </div>
        </div>
      )}
    </div>
  );
}

function MiniStat({ icon: Icon, label, value, sub }) {
  return (
    <div className="p-3 rounded-2xl border border-border bg-background text-center">
      <Icon className="w-4 h-4 mx-auto mb-1 text-olo" />
      <p className="font-heading font-700 text-lg leading-none">{value}</p>
      <p className="text-[10px] text-muted-foreground mt-1">{label}</p>
      {sub && <p className="text-[10px] text-muted-foreground/70">{sub}</p>}
    </div>
  );
}

function DetailRow({ label, value }) {
  if (!value && value !== 0 && value !== false) return null;
  return (
    <div className="flex items-center justify-between text-sm">
      <span className="text-muted-foreground">{label}</span>
      <span className="font-medium text-right">{String(value)}</span>
    </div>
  );
}

function Field({ label, children }) {
  return (
    <div>
      <label className="text-xs font-medium text-muted-foreground mb-1.5 block">{label}</label>
      {children}
    </div>
  );
}

function StatCard({ icon: Icon, label, value, sub, tint }) {
  return (
    <div className="p-4 rounded-2xl border border-border bg-card">
      <div className="flex items-center gap-2 mb-2">
        <div className="w-7 h-7 rounded-lg bg-olo/10 flex items-center justify-center">
          <Icon className={`w-4 h-4 ${tint}`} />
        </div>
        <p className="text-xs text-muted-foreground uppercase tracking-wider">{label}</p>
      </div>
      <p className={`text-2xl font-heading font-700 ${tint}`}>{value}</p>
      {sub && <p className="text-xs text-muted-foreground mt-0.5">{sub}</p>}
    </div>
  );
}

const HOW_FOUND_LABELS = {
  friend: "Friend or family",
  social: "Social media",
  search: "Google search",
  dentist: "My dentist",
  app_store: "App store",
  from_owner: "From the owner",
  other: "Other",
  unspecified: "Not specified",
};

function HowFoundPanel({ users }) {
  const breakdown = useMemo(() => {
    const counts = {};
    for (const u of users) {
      const k = u.how_found || "unspecified";
      counts[k] = (counts[k] || 0) + 1;
    }
    return counts;
  }, [users]);
  const entries = Object.entries(breakdown).sort((a, b) => b[1] - a[1]);
  if (!entries.length) return null;
  const max = Math.max(1, ...entries.map((e) => e[1]));
  const total = users.length || 1;
  return (
    <div className="p-6 rounded-3xl border border-border bg-card mb-6">
      <div className="flex items-center gap-2 mb-4">
        <TrendingUp className="w-5 h-5 text-olo" />
        <h2 className="font-heading font-600 text-lg">How users found us</h2>
      </div>
      <div className="space-y-3">
        {entries.map(([k, n]) => (
          <div key={k}>
            <div className="flex justify-between text-sm mb-1">
              <span className="text-muted-foreground">{HOW_FOUND_LABELS[k] || k}</span>
              <span className="font-semibold">{n} · {Math.round((n / total) * 100)}%</span>
            </div>
            <div className="h-2.5 rounded-full bg-muted overflow-hidden">
              <div className="h-full bg-olo rounded-full transition-all" style={{ width: `${(n / max) * 100}%` }} />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}