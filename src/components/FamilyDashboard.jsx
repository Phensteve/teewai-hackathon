import { useState, useEffect } from 'react';
import { Users, Check, Loader2, UserPlus, X, Link2, Unlink, BadgeCheck, AlertCircle, ShieldCheck, ArrowRight } from 'lucide-react';
import { unrufld } from '@/api/unrufldClient';
import { useNavigate } from 'react-router-dom';
import { EXTRA_MEMBER } from '@/lib/payment';
import { useCurrency } from '@/hooks/use-currency';
import { openExternal } from '@/lib/openExternal';
import CreateChildDialog from '@/components/family/CreateChildDialog';

const MEMBER_LIMIT = 15;
const MEMBER_COUNT = 5;
const MAX_EXTRA = 3;

// Simplified roles: parent, children, custom.
const ROLES = [
  { value: 'parent', label: 'Parent' },
  { value: 'children', label: 'Children' },
  { value: 'custom', label: 'Custom' },
];

// Map legacy roles to the new three-role system for backwards compatibility.
const ROLE_MAP = {
  mother: 'parent', father: 'parent', guardian: 'parent',
  grandfather: 'parent', grandmother: 'parent', uncle: 'parent', aunt: 'parent',
  son: 'children', daughter: 'children', nephew: 'children', niece: 'children',
  cousin: 'children', brother: 'children', sister: 'children',
  other: 'custom',
};

const normalizeRole = (r) => ROLE_MAP[r] || (['parent', 'children', 'custom'].includes(r) ? r : 'custom');

function ensureMembers(m) {
  const arr = Array.isArray(m) ? [...m] : [];
  while (arr.length < MEMBER_COUNT) arr.push({ name: '', email: '', link: '', role: 'custom', scans_used: 0, scans_limit: MEMBER_LIMIT, bonus_scans: 0, is_admin: false });
  return arr.map((x) => ({
    name: x.name || '',
    email: x.email || '',
    link: x.link || '',
    role: normalizeRole(x.role),
    scans_used: Number(x.scans_used) || 0,
    scans_limit: Number(x.scans_limit) || MEMBER_LIMIT,
    bonus_scans: Number(x.bonus_scans) || 0,
    is_admin: !!x.is_admin,
  }));
}

export default function FamilyDashboard({ subscription, onUpdated, saveMembers }) {
  const navigate = useNavigate();
  const { format } = useCurrency();
  const [members, setMembers] = useState(() => ensureMembers(subscription?.members));
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [saveError, setSaveError] = useState(null);
  const [showAdd, setShowAdd] = useState(false);
  const [linking, setLinking] = useState(null);
  const [linkStatus, setLinkStatus] = useState({});
  const [showChildDialog, setShowChildDialog] = useState(false);
  const [childDialogIndex, setChildDialogIndex] = useState(null);
  const [transferring, setTransferring] = useState(false);
  const [transferFrom, setTransferFrom] = useState(0);
  const [transferTo, setTransferTo] = useState(1);
  const [transferAmount, setTransferAmount] = useState(5);

  useEffect(() => { setMembers(ensureMembers(subscription?.members)); }, [subscription?.members]);

  // On mount, verify any existing links so the cards show their linked status.
  useEffect(() => {
    members.forEach((m, i) => {
      const val = (m.link || '').trim();
      if (!val) return;
      unrufld.functions.invoke('familyResolve', { op: 'verifyLink', link: val })
        .then(({ data }) => {
          if (data?.found) {
            setLinkStatus((prev) => ({ ...prev, [i]: { verified: !data.unlinked, name: data.name, unlinked: data.unlinked } }));
          } else {
            setLinkStatus((prev) => ({ ...prev, [i]: { verified: false, error: 'Linked user not found — they may have changed their email or username' } }));
          }
        })
        .catch(() => {});
    });
  }, []);

  const persist = async (next) => {
    setMembers(next);
    if (!subscription?.id) return;
    setSaving(true); setSaved(false); setSaveError(null);
    try {
      if (saveMembers) {
        await saveMembers(next);
      } else {
        // Owner: route through familyResolve updateMembers for server-side
        // validation (no duplicate links, no relinking unlinked, admin
        // unlinkable). Direct subscriptions.update would bypass these checks.
        const { data } = await unrufld.functions.invoke('familyResolve', { op: 'updateMembers', members: next });
        if (data?.error) throw new Error(data.error);
      }
      onUpdated?.(next);
      setSaved(true);
      setTimeout(() => setSaved(false), 1500);
    } catch (e) {
      setSaveError(e.message || 'Could not save — please try again');
      // Revert to the last known-good state.
      setMembers(ensureMembers(subscription?.members));
    } finally { setSaving(false); }
  };

  const updateField = (i, field, value) => {
    setMembers((prev) => prev.map((m, idx) => idx === i ? { ...m, [field]: value } : m));
  };

  const saveBlur = () => persist(members);

  const handleLink = async (i) => {
    const val = (members[i].link || '').trim();
    if (!val) return;
    setLinking(i);
    try {
      const { data } = await unrufld.functions.invoke('familyResolve', { op: 'verifyLink', link: val });
      if (data?.found && !data.unlinked) {
        setLinkStatus((prev) => ({ ...prev, [i]: { verified: true, name: data.name } }));
        persist(members);
      } else if (data?.unlinked) {
        setLinkStatus((prev) => ({ ...prev, [i]: { verified: false, error: 'This account was previously unlinked and cannot be relinked' } }));
      } else {
        setLinkStatus((prev) => ({ ...prev, [i]: { verified: false, error: 'No teewai user found with that email, username, or display name' } }));
      }
    } catch {
      setLinkStatus((prev) => ({ ...prev, [i]: { verified: false, error: 'Could not verify — please try again' } }));
    } finally {
      setLinking(null);
    }
  };

  const handleUnlink = (i) => {
    // Admin can't be unlinked — must remove admin status first.
    if (members[i]?.is_admin) return;
    const next = members.map((m, idx) => idx === i ? { ...m, link: '' } : m);
    setLinkStatus((prev) => { const n = { ...prev }; delete n[i]; return n; });
    persist(next);
  };

  const toggleAdmin = (i) => {
    persist(members.map((m, idx) => idx === i ? { ...m, is_admin: !m.is_admin } : m));
  };

  const openChildDialog = (i) => {
    setChildDialogIndex(i);
    setShowChildDialog(true);
  };

  const handleChildCreated = (newMembers) => {
    setMembers(ensureMembers(newMembers));
    if (childDialogIndex != null) {
      const m = newMembers[childDialogIndex];
      setLinkStatus((prev) => ({ ...prev, [childDialogIndex]: { verified: true, name: m?.name || '' } }));
    }
    onUpdated?.(newMembers);
    setShowChildDialog(false);
    setChildDialogIndex(null);
  };

  const addMember = () => {
    const next = [...members, { name: '', email: '', link: '', role: 'custom', scans_used: 0, scans_limit: MEMBER_LIMIT, bonus_scans: 0, is_admin: false }];
    persist(next);
    setShowAdd(false);
  };

  const removeMember = (i) => {
    if (i < MEMBER_COUNT) return;
    persist(members.filter((_, idx) => idx !== i));
  };

  const handleTransfer = async () => {
    if (transferFrom === transferTo || transferAmount < 1) return;
    setTransferring(true);
    try {
      const { data } = await unrufld.functions.invoke('familyResolve', {
        op: 'transferScans', from_index: transferFrom, to_index: transferTo, amount: transferAmount,
      });
      if (data?.error) throw new Error(data.error);
      if (data?.members) {
        setMembers(ensureMembers(data.members));
        onUpdated?.(data.members);
        setSaved(true);
        setTimeout(() => setSaved(false), 1500);
      }
    } catch (e) {
      setSaveError(e.message || 'Transfer failed — please try again');
    } finally {
      setTransferring(false);
    }
  };

  const memberRemaining = (m) => Math.max(0, (m.scans_limit || MEMBER_LIMIT) + (m.bonus_scans || 0) - (m.scans_used || 0));

  const totalUsed = members.reduce((a, m) => a + (m.scans_used || 0), 0);
  const totalLimit = members.reduce((a, m) => a + (m.scans_limit || MEMBER_LIMIT) + (m.bonus_scans || 0), 0);
  const extraCount = Math.max(0, members.length - MEMBER_COUNT);

  // Build dropdown options for transfer (only members with remaining scans).
  const transferOptions = members.map((m, i) => ({
    value: i,
    label: m.name || `Member ${i + 1}`,
    remaining: memberRemaining(m),
  }));

  return (
    <div className="space-y-5">
      {/* Overview */}
      <div className="p-5 sm:p-6 rounded-3xl border border-olo/30 bg-olo/5">
        <div className="flex items-center justify-between flex-wrap gap-3">
          <div className="flex items-center gap-3">
            <div className="w-11 h-11 rounded-2xl bg-olo flex items-center justify-center olo-glow">
              <Users className="w-5 h-5 text-white" />
            </div>
            <div>
              <h3 className="font-heading font-700 text-lg">Family plan</h3>
              <p className="text-xs text-muted-foreground">{members.length} members · {subscription?.plan === 'family_pro' ? 'unlimited scans each' : '15 scans each'}</p>
            </div>
          </div>
          <div className="text-right">
            <p className="text-xs text-muted-foreground uppercase tracking-wider">Family usage</p>
            <p className="font-heading font-800 text-2xl text-olo">{totalUsed}<span className="text-base text-muted-foreground font-500">/{totalLimit}</span></p>
          </div>
        </div>
        <div className="mt-4 h-2 rounded-full bg-muted overflow-hidden">
          <div className="h-full bg-olo rounded-full transition-all" style={{ width: `${totalLimit > 0 ? Math.min(100, (totalUsed / totalLimit) * 100) : 0}%` }} />
        </div>
      </div>

      {/* Member cards */}
      <div className="grid sm:grid-cols-2 gap-3">
        {members.map((m, i) => {
          const used = m.scans_used || 0;
          const remaining = memberRemaining(m);
          const limit = (m.scans_limit || MEMBER_LIMIT) + (m.bonus_scans || 0);
          const pct = limit > 0 ? Math.min(100, (used / limit) * 100) : 0;
          const exhausted = remaining <= 0;
          const isChild = m.role === 'children';
          const isExtra = i >= MEMBER_COUNT;
          const hasBonus = (m.bonus_scans || 0) !== 0;
          return (
            <div key={i} className="p-4 rounded-2xl border border-border bg-card">
              <div className="flex items-center gap-2 mb-3">
                <div className="w-8 h-8 rounded-xl bg-olo/10 flex items-center justify-center text-olo font-heading font-700 text-sm flex-shrink-0">
                  {(m.name || (i + 1)).toString().charAt(0).toUpperCase()}
                </div>
                <input
                  value={m.name}
                  onChange={(e) => updateField(i, 'name', e.target.value)}
                  onBlur={() => saveBlur(i)}
                  placeholder={`Member ${i + 1}`}
                  className="flex-1 min-w-0 bg-transparent text-sm font-medium outline-none border-b border-transparent focus:border-olo/40 pb-0.5"
                />
                {isExtra && (
                  <button onClick={() => removeMember(i)} className="text-muted-foreground hover:text-destructive flex-shrink-0" aria-label="Remove member">
                    <X className="w-4 h-4" />
                  </button>
                )}
              </div>

              {/* Role selector */}
              <select
                value={m.role}
                onChange={(e) => { updateField(i, 'role', e.target.value); persist(members.map((mm, idx) => idx === i ? { ...mm, role: e.target.value } : mm)); }}
                className="w-full mb-2 bg-muted/50 rounded-lg px-2.5 py-1.5 text-xs font-medium outline-none border border-border/60 focus:border-olo/40 capitalize"
              >
                {ROLES.map((r) => <option key={r.value} value={r.value}>{r.label}</option>)}
              </select>

              {/* Link field */}
              <div className="flex items-center gap-2">
                <input
                  value={m.link}
                  onChange={(e) => {
                    updateField(i, 'link', e.target.value);
                    if (linkStatus[i]) setLinkStatus((prev) => { const n = { ...prev }; delete n[i]; return n; });
                  }}
                  placeholder={isChild ? 'Link teewai account (optional)' : 'Email, username, or display name'}
                  className="flex-1 min-w-0 bg-transparent text-xs outline-none border-b border-transparent focus:border-olo/40 pb-0.5 text-muted-foreground"
                />
                {m.link && !linkStatus[i]?.verified && (
                  <button
                    onClick={() => handleLink(i)}
                    disabled={linking === i}
                    className="flex-shrink-0 inline-flex items-center gap-1 bg-olo text-white text-[11px] font-semibold px-2.5 py-1 rounded-lg hover:opacity-90 transition-opacity disabled:opacity-50"
                  >
                    {linking === i ? <Loader2 className="w-3 h-3 animate-spin" /> : <Link2 className="w-3 h-3" />}
                    Link
                  </button>
                )}
                {linkStatus[i]?.verified && (
                  <button
                    onClick={() => handleUnlink(i)}
                    disabled={m.is_admin}
                    className="flex-shrink-0 inline-flex items-center gap-1 text-destructive text-[11px] font-medium px-2 py-1 rounded-lg hover:bg-destructive/5 transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
                    title={m.is_admin ? 'Remove admin status before unlinking' : 'Unlink'}
                  >
                    <Unlink className="w-3 h-3" /> Unlink
                  </button>
                )}
              </div>
              {linkStatus[i]?.verified && (
                <div className="flex items-center gap-1.5 mt-1.5 text-[11px] text-olo">
                  <BadgeCheck className="w-3.5 h-3.5" />
                  <span>Linked to {linkStatus[i].name}</span>
                </div>
              )}
              {linkStatus[i]?.error && (
                <div className="flex items-center gap-1.5 mt-1.5 text-[11px] text-destructive">
                  <AlertCircle className="w-3.5 h-3.5" />
                  <span>{linkStatus[i].error}</span>
                </div>
              )}

              {/* Create a kid login — only for children with no link yet */}
              {isChild && !m.link && m.name && !linkStatus[i]?.verified && (
                <button
                  onClick={() => openChildDialog(i)}
                  className="mt-2 inline-flex items-center gap-1.5 text-[11px] font-semibold text-olo bg-olo/10 px-2.5 py-1 rounded-lg hover:bg-olo/20 transition-colors"
                >
                  <UserPlus className="w-3.5 h-3.5" />
                  Create kid login
                </button>
              )}

              {/* Admin badge / appoint toggle — everyone can be made admin */}
              {linkStatus[i]?.verified && (
                <button
                  onClick={() => toggleAdmin(i)}
                  className={`mt-2 inline-flex items-center gap-1 text-[11px] font-medium px-2 py-1 rounded-lg transition-colors ${m.is_admin ? 'bg-olo/10 text-olo' : 'text-muted-foreground hover:bg-muted/50'}`}
                >
                  <ShieldCheck className="w-3.5 h-3.5" />
                  {m.is_admin ? 'Family admin' : 'Make admin'}
                </button>
              )}
              {m.is_admin && !linkStatus[i]?.verified && (
                <span className="mt-2 inline-flex items-center gap-1 text-[11px] font-medium px-2 py-1 rounded-lg bg-olo/10 text-olo">
                  <ShieldCheck className="w-3.5 h-3.5" /> Family admin
                </span>
              )}

              {/* Scan usage */}
              <div className="flex items-center justify-between mb-1.5 mt-3">
                <span className="text-xs text-muted-foreground">
                  Scans {hasBonus && <span className="text-olo">(transferred)</span>}
                </span>
                <span className={`text-xs font-semibold ${exhausted ? 'text-destructive' : 'text-olo'}`}>{used}/{limit}</span>
              </div>
              <div className="h-2 rounded-full bg-muted overflow-hidden">
                <div className={`h-full rounded-full transition-all ${exhausted ? 'bg-destructive' : 'bg-olo'}`} style={{ width: `${pct}%` }} />
              </div>
              <p className="text-[11px] text-muted-foreground mt-1.5">
                {exhausted ? 'No scans left' : `${remaining} scan${remaining !== 1 ? 's' : ''} remaining`}
              </p>
            </div>
          );
        })}
      </div>

      {/* Transfer scans between slots */}
      <div className="p-5 rounded-2xl border border-olo/20 bg-olo/5">
        <div className="flex items-center gap-2 mb-3">
          <ArrowRight className="w-4 h-4 text-olo" />
          <h4 className="font-heading font-600 text-sm">Transfer scans between members</h4>
        </div>
        <p className="text-xs text-muted-foreground mb-3">Move unused scan credits from one member to another. The source must have enough remaining.</p>
        <div className="flex flex-wrap items-end gap-2">
          <div className="flex-1 min-w-[120px]">
            <label className="text-[11px] text-muted-foreground block mb-1">From</label>
            <select
              value={transferFrom}
              onChange={(e) => setTransferFrom(Number(e.target.value))}
              className="w-full bg-card rounded-lg px-2.5 py-2 text-xs font-medium outline-none border border-border/60 focus:border-olo/40"
            >
              {transferOptions.map((o) => <option key={o.value} value={o.value}>{o.label} ({o.remaining} left)</option>)}
            </select>
          </div>
          <div className="flex-1 min-w-[120px]">
            <label className="text-[11px] text-muted-foreground block mb-1">To</label>
            <select
              value={transferTo}
              onChange={(e) => setTransferTo(Number(e.target.value))}
              className="w-full bg-card rounded-lg px-2.5 py-2 text-xs font-medium outline-none border border-border/60 focus:border-olo/40"
            >
              {transferOptions.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
            </select>
          </div>
          <div className="w-16">
            <label className="text-[11px] text-muted-foreground block mb-1">Scans</label>
            <input
              type="number"
              min="1"
              value={transferAmount}
              onChange={(e) => setTransferAmount(Math.max(1, Number(e.target.value) || 1))}
              className="w-full bg-card rounded-lg px-2 py-2 text-xs font-medium outline-none border border-border/60 focus:border-olo/40"
            />
          </div>
          <button
            onClick={handleTransfer}
            disabled={transferring || transferFrom === transferTo || transferAmount < 1}
            className="inline-flex items-center gap-1.5 bg-olo text-white text-xs font-semibold px-4 py-2 rounded-lg hover:opacity-90 transition-opacity disabled:opacity-50"
          >
            {transferring ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <ArrowRight className="w-3.5 h-3.5" />}
            Transfer
          </button>
        </div>
      </div>

      {/* Add member */}
      {extraCount < MAX_EXTRA && (
        <>
          <button
            onClick={() => setShowAdd(true)}
            className="w-full flex items-center justify-center gap-2 p-4 rounded-2xl border-2 border-dashed border-border hover:border-olo/40 text-sm font-medium text-muted-foreground hover:text-olo transition-colors"
          >
            <UserPlus className="w-4 h-4" /> Add family member
          </button>

          {showAdd && (
            <div className="p-5 rounded-2xl border border-olo/30 bg-olo/5 space-y-3">
              <div className="flex items-center gap-2">
                <UserPlus className="w-5 h-5 text-olo" />
                <h4 className="font-heading font-600 text-sm">Add a family member</h4>
              </div>
              <p className="text-xs text-muted-foreground">
                Each additional member beyond the 5 included slots costs {format(EXTRA_MEMBER.price)} (one-time) and gets 15 scans per month.
              </p>
              <div className="flex gap-2">
                <button
                  onClick={addMember}
                  className="flex-1 inline-flex items-center justify-center gap-2 bg-olo text-white font-semibold px-4 py-2.5 rounded-xl text-sm hover:scale-105 transition-transform olo-glow"
                >
                  <Check className="w-4 h-4" /> Add & pay later
                </button>
                <button
                  onClick={() => { if (openExternal('/subscription')) return; addMember(); navigate('/checkout', { state: { plan: 'family_extra_member', scans: 15 } }); }}
                  className="flex-1 inline-flex items-center justify-center gap-2 border border-olo text-olo font-semibold px-4 py-2.5 rounded-xl text-sm hover:bg-olo/5 transition-colors"
                >
                  Pay {format(EXTRA_MEMBER.price)} now
                </button>
                <button onClick={() => setShowAdd(false)} className="px-3 py-2.5 rounded-xl text-muted-foreground hover:bg-muted/50">
                  <X className="w-4 h-4" />
                </button>
              </div>
            </div>
          )}
        </>
      )}

      {/* Save status */}
      <div className="flex items-center gap-3 flex-wrap">
        {saving && <span className="inline-flex items-center gap-1.5 text-xs text-muted-foreground"><Loader2 className="w-3.5 h-3.5 animate-spin" /> Saving…</span>}
        {saved && <span className="inline-flex items-center gap-1.5 text-xs text-olo"><Check className="w-3.5 h-3.5" /> Saved</span>}
        {saveError && <span className="inline-flex items-center gap-1.5 text-xs text-destructive"><AlertCircle className="w-3.5 h-3.5" /> {saveError}</span>}
      </div>

      <p className="text-xs text-muted-foreground">
        {subscription?.plan === 'family_pro' ? 'Scan counters reset automatically each month on your billing cycle date. ' : 'These scans never expire — use them anytime. '}Type a member's email, username, or display name and click <strong className="text-olo">Link</strong> — we verify they have a teewai account, then they can scan from their own login using this family's scans. Children can scan from your device, or tap "Create kid login" to give them their own username and password tied to your email. Any linked member can be made a family admin — including children. Admins cannot be unlinked — remove their admin status first. Once unlinked, an account cannot be relinked. Transfer unused scans between members anytime.
      </p>

      <CreateChildDialog
        open={showChildDialog}
        onClose={() => { setShowChildDialog(false); setChildDialogIndex(null); }}
        memberIndex={childDialogIndex}
        memberName={childDialogIndex != null ? members[childDialogIndex]?.name : ''}
        onCreated={handleChildCreated}
      />
    </div>
  );
}