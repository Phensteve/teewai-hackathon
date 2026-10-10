import { useState, useEffect, useCallback } from 'react';
import { Link } from 'react-router-dom';
import { Gift, Copy, Check, Share2, Users, Wallet, Clock, Loader2, ArrowRight, Info, ChevronDown, ChevronUp, Pencil, Lock, Download, RotateCcw } from 'lucide-react';
import { unrufld } from '@/api/unrufldClient';
import { subscriptions } from '@/lib/insforgeDb';
import PageSkeleton from '@/components/loading/PageSkeleton';
import ExplorePlansCard from '@/components/referral/ExplorePlansCard';
import {
  getOrCreateReferralAccount,
  syncReferralEligibility,
  isEligibleForReferrals,
  getReferralList,
  getWithdrawalList,
  requestWithdrawal,
  computeNextBatchTime,
  buildReferralLink,
  setReferralCode,
  isCodeLocked,
  REWARD_PER_REFERRAL,
  MIN_WITHDRAWAL,
  MIN_AIRTIME_WITHDRAWAL,
} from '@/lib/referral';

export default function Referrals() {
  const [loading, setLoading] = useState(true);
  const [account, setAccount] = useState(null);
  const [subscription, setSubscription] = useState(null);
  const [referrals, setReferrals] = useState([]);
  const [withdrawals, setWithdrawals] = useState([]);
  const [copied, setCopied] = useState(false);
  const [copiedLink, setCopiedLink] = useState(false);
  const [showWithdraw, setShowWithdraw] = useState(false);
  const [withdrawType, setWithdrawType] = useState('bank');
  const [withdrawAmount, setWithdrawAmount] = useState(0);
  const [bankName, setBankName] = useState('');
  const [accountNumber, setAccountNumber] = useState('');
  const [accountName, setAccountName] = useState('');
  const [phoneNumber, setPhoneNumber] = useState('');
  const [withdrawing, setWithdrawing] = useState(false);
  const [withdrawMsg, setWithdrawMsg] = useState('');
  const [withdrawError, setWithdrawError] = useState('');
  const [expandedHow, setExpandedHow] = useState(false);
  const [username, setUsername] = useState('');
  const [codeEditing, setCodeEditing] = useState(false);
  const [codeInput, setCodeInput] = useState('');
  const [codeLocked, setCodeLocked] = useState(false);
  const [codeSaving, setCodeSaving] = useState(false);
  const [codeMsg, setCodeMsg] = useState('');
  const [codeError, setCodeError] = useState('');
  const [refreshing, setRefreshing] = useState(false);

  const load = useCallback(async () => {
    try {
      const me = await unrufld.auth.me();
      if (!me?.id) { setLoading(false); return; }

      const [subs, refList, wdList] = await Promise.all([
        subscriptions.filter({}),
        getReferralList(me.id),
        getWithdrawalList(me.id),
      ]);

      const sub = subs[0] || null;
      setSubscription(sub);
      setReferrals(refList);
      setWithdrawals(wdList);

      // Sync eligibility + get/create account. Only paid users get a code.
      const eligibleForCode = isEligibleForReferrals(sub);
      await syncReferralEligibility(me.id, sub);
      const acct = await getOrCreateReferralAccount(me.id, me.email, eligibleForCode, sub);
      setAccount(acct);
      setUsername(me.username || me.display_name || me.first_name || '');
      setCodeLocked(await isCodeLocked(me.id));
      if (acct) setWithdrawAmount(Math.max(MIN_AIRTIME_WITHDRAWAL, acct.balance_naira || 0));
    } catch {}
    setLoading(false);
  }, []);

  useEffect(() => { load(); }, [load]);

  const refresh = async () => {
    setRefreshing(true);
    await load();
    setRefreshing(false);
  };

  const eligible = isEligibleForReferrals(subscription);
  const balance = account?.balance_naira || 0;
  const successfulCount = account?.successful_referrals || 0;
  const pendingCount = account?.pending_referrals || 0;
  const progressToWithdraw = Math.min(100, (balance / MIN_WITHDRAWAL) * 100);
  const nextBatch = computeNextBatchTime();

  const referralLink = account?.referral_code ? buildReferralLink(account.referral_code) : '';

  const copyCode = () => {
    if (!account?.referral_code) return;
    try { navigator.clipboard.writeText(account.referral_code); } catch {}
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const copyLink = () => {
    if (!referralLink) return;
    try { navigator.clipboard.writeText(referralLink); } catch {}
    setCopiedLink(true);
    setTimeout(() => setCopiedLink(false), 2000);
  };

  const shareLink = () => {
    if (!referralLink) return;
    const text = `Join me on teewai and track your smile journey! Use my referral link: ${referralLink}`;
    try {
      if (navigator.share) {
        navigator.share({ title: 'teewai referral', text, url: referralLink });
      } else {
        navigator.clipboard.writeText(text);
        setCopiedLink(true);
        setTimeout(() => setCopiedLink(false), 2000);
      }
    } catch {}
  };

  const handleWithdraw = async () => {
    setWithdrawMsg('');
    setWithdrawError('');
    const minAmount = withdrawType === 'airtime' ? MIN_AIRTIME_WITHDRAWAL : MIN_WITHDRAWAL;
    if (balance < minAmount) {
      setWithdrawError(`Minimum ${withdrawType} withdrawal is ₦${minAmount.toLocaleString()}.`);
      return;
    }
    if (withdrawType === 'bank' && (!bankName.trim() || !accountNumber.trim() || !accountName.trim())) {
      setWithdrawError('Please fill in all bank details.');
      return;
    }
    if (withdrawType === 'bank' && !/^\d{10}$/.test(accountNumber.trim())) {
      setWithdrawError('Account number must be exactly 10 digits.');
      return;
    }
    if (withdrawType === 'airtime' && !phoneNumber.trim()) {
      setWithdrawError('Please enter a phone number.');
      return;
    }
    if (withdrawType === 'airtime') {
      const digits = phoneNumber.replace(/\D/g, '');
      if (digits.length < 11) {
        setWithdrawError('Phone number must be at least 11 digits.');
        return;
      }
      if (!/^(0\d{10}|234\d{10})$/.test(digits)) {
        setWithdrawError('Enter a valid Nigerian phone number (e.g. 08031234567).');
        return;
      }
    }
    // Amount must be a multiple of ₦50 (the referral reward unit). Blocks
    // uneven amounts like ₦53 before they reach the API.
    if (!Number.isFinite(withdrawAmount) || withdrawAmount % REWARD_PER_REFERRAL !== 0) {
      setWithdrawError(`Amount must be in multiples of ₦${REWARD_PER_REFERRAL}.`);
      return;
    }
    setWithdrawing(true);
    try {
      const me = await unrufld.auth.me();
      const result = await requestWithdrawal(me.id, withdrawAmount, {
        withdrawal_type: withdrawType,
        bank_name: bankName.trim(),
        account_number: accountNumber.trim(),
        account_name: accountName.trim(),
        phone_number: phoneNumber.trim(),
      });
      if (result.ok) {
        setWithdrawMsg(withdrawType === 'airtime'
          ? 'Airtime delivered instantly to your phone.'
          : `Withdrawal queued for the ${nextBatch.batch_time} batch on ${new Date(nextBatch.batch_date).toLocaleDateString()}. Your bank account will be credited automatically.`);
        setShowWithdraw(false);
        setBankName(''); setAccountNumber(''); setAccountName(''); setPhoneNumber('');
        await load();
      } else {
        setWithdrawError(result.error || 'Withdrawal failed.');
      }
    } catch (e) {
      setWithdrawError(e?.message || 'Withdrawal failed.');
    } finally {
      setWithdrawing(false);
    }
  };

  const handleSaveCode = async () => {
    setCodeMsg('');
    setCodeError('');
    if (!/^\d{4}$/.test(codeInput)) {
      setCodeError('Code must be exactly 4 digits.');
      return;
    }
    setCodeSaving(true);
    try {
      const me = await unrufld.auth.me();
      const result = await setReferralCode(me.id, codeInput);
      if (result.ok) {
        setCodeMsg('Code updated!');
        setCodeEditing(false);
        await load();
      } else {
        setCodeError(result.error || 'Failed to set code.');
      }
    } catch (e) {
      setCodeError(e?.message || 'Failed to set code.');
    } finally {
      setCodeSaving(false);
    }
  };

  if (loading) return <PageSkeleton />;

  return (
    <div className="max-w-2xl mx-auto">
      {/* Header */}
      <div className="text-center mb-6">
        <div className="flex items-center justify-center gap-2 mb-4">
          <div className="w-14 h-14 rounded-2xl bg-olo/10 flex items-center justify-center">
            <Gift className="w-7 h-7 text-olo" />
          </div>
        </div>
        <div className="flex items-center justify-center gap-2 mb-2">
          <h1 className="font-heading font-700 text-3xl tracking-tight">Refer & earn</h1>
          <button
            onClick={refresh}
            disabled={refreshing}
            aria-label="Refresh referrals"
            className="inline-flex items-center justify-center w-8 h-8 rounded-lg text-olo hover:bg-olo/10 transition-colors disabled:opacity-50"
          >
            <RotateCcw className={`w-4 h-4 ${refreshing ? 'animate-spin' : ''}`} />
          </button>
        </div>
        <p className="text-muted-foreground">Earn ₦{REWARD_PER_REFERRAL.toLocaleString()} for every friend who completes their first scan — paid once per referral, from the very first one. Withdraw to airtime from ₦{MIN_AIRTIME_WITHDRAWAL.toLocaleString()} or bank from ₦{MIN_WITHDRAWAL.toLocaleString()}.</p>
        <Link to="/referral-policy" className="inline-flex items-center gap-1 text-sm text-olo hover:underline mt-3">
          Read the referral policy <ArrowRight className="w-3.5 h-3.5" />
        </Link>
      </div>

      {/* Explore plans for non-paid users */}
      {!eligible && <ExplorePlansCard />}

      {/* Referral code + link card */}
      <div className={`mb-6 p-6 rounded-3xl border-2 ${eligible ? 'border-olo bg-olo/5 olo-glow' : 'border-border bg-card opacity-60'}`}>
        <p className="text-label text-muted-foreground mb-2 text-center">Your referral code</p>
        <div className="flex items-center justify-center gap-3 mb-4">
          <code className={`font-heading font-800 text-3xl tracking-wider ${eligible ? 'text-olo' : 'text-muted-foreground'}`}>
            {account?.referral_code || 'TEE-------'}
          </code>
        </div>
        <div className="flex gap-2 mb-3">
          <button
            onClick={copyCode}
            disabled={!eligible}
            className="flex-1 inline-flex items-center justify-center gap-2 bg-olo text-white font-semibold py-2.5 rounded-xl hover:scale-[1.01] transition-transform disabled:opacity-50"
          >
            {copied ? <><Check className="w-4 h-4" /> Copied</> : <><Copy className="w-4 h-4" /> Copy code</>}
          </button>
          <button
            onClick={shareLink}
            disabled={!eligible}
            className="inline-flex items-center justify-center gap-2 px-4 border border-border rounded-xl hover:bg-muted/40 transition-colors disabled:opacity-50"
          >
            <Share2 className="w-4 h-4" />
          </button>
        </div>
        {eligible && (
          <div className="pt-3 border-t border-border">
            <p className="text-label text-muted-foreground mb-1.5">Or share your referral link</p>
            <div className="flex gap-2">
              <input
                readOnly
                value={referralLink}
                onClick={(e) => e.target.select()}
                className="flex-1 px-3 py-2 rounded-lg border border-border bg-background text-xs text-muted-foreground truncate focus:outline-none"
              />
              <button
                onClick={copyLink}
                className="inline-flex items-center justify-center gap-1.5 px-3 border border-border rounded-lg hover:bg-muted/40 transition-colors text-xs font-medium"
              >
                {copiedLink ? <><Check className="w-3.5 h-3.5 text-success" /> Copied</> : <><Copy className="w-3.5 h-3.5" /> Copy</>}
              </button>
            </div>
          </div>
        )}
        {!eligible && (
          <p className="text-xs text-muted-foreground text-center mt-3">Code activates when you have an active paid plan.</p>
        )}
      </div>

      {/* Set custom code / lock notice */}
      {eligible && !codeLocked && (
        <div className="mb-6 p-4 rounded-2xl border border-border bg-card">
          {!codeEditing ? (
            <button onClick={() => { setCodeEditing(true); setCodeInput(account?.referral_code || ''); setCodeError(''); setCodeMsg(''); }} className="w-full flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Pencil className="w-4 h-4 text-olo" />
                <p className="text-sm font-medium">Set your own 4-digit code</p>
              </div>
              <ArrowRight className="w-4 h-4 text-olo" />
            </button>
          ) : (
            <div>
              <p className="text-sm font-medium mb-3">Choose your 4-digit code</p>
              <div className="flex gap-2">
                <input
                  value={codeInput}
                  onChange={(e) => setCodeInput(e.target.value.replace(/\D/g, '').slice(0, 4))}
                  placeholder="1234"
                  inputMode="numeric"
                  maxLength={4}
                  className="flex-1 px-4 py-2.5 rounded-xl border border-border bg-background text-lg tracking-[0.5em] text-center font-heading font-700 focus:outline-none focus:border-olo"
                />
                <button onClick={handleSaveCode} disabled={codeSaving || codeInput.length !== 4} className="px-4 py-2.5 rounded-xl bg-olo text-white font-semibold disabled:opacity-50">
                  {codeSaving ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Save'}
                </button>
                <button onClick={() => { setCodeEditing(false); setCodeError(''); setCodeMsg(''); }} className="px-4 py-2.5 rounded-xl border border-border text-sm font-medium">Cancel</button>
              </div>
              {codeError && <p className="text-sm text-danger mt-2">{codeError}</p>}
              {codeMsg && <p className="text-sm text-success mt-2">{codeMsg}</p>}
              <p className="text-xs text-muted-foreground mt-2">Once someone signs up with your code, it can't be changed.</p>
            </div>
          )}
        </div>
      )}
      {eligible && codeLocked && (
        <div className="mb-6 p-3 rounded-2xl bg-muted/40 flex items-center gap-2">
          <Lock className="w-4 h-4 text-muted-foreground flex-shrink-0" />
          <p className="text-xs text-muted-foreground">Your code is locked because it's been used. It can't be changed.</p>
        </div>
      )}

      {/* Download flyer */}
      {eligible && account?.referral_code && (
        <Link to={`/referral-flyer?code=${account.referral_code}&name=${encodeURIComponent(username || '')}`} className="mb-6 flex items-center justify-between p-4 rounded-2xl border border-border bg-card hover:bg-muted/40 transition-colors">
          <div className="flex items-center gap-3">
            <Download className="w-5 h-5 text-olo" />
            <div>
              <p className="text-sm font-medium">Download your referral flyer</p>
              <p className="text-xs text-muted-foreground">13 sleek designs to share</p>
            </div>
          </div>
          <ArrowRight className="w-4 h-4 text-olo" />
        </Link>
      )}

      {/* Balance + stats */}
      <div className="grid grid-cols-2 gap-3 mb-6">
        <div className="p-4 rounded-2xl border border-border bg-card">
          <div className="flex items-center gap-2 mb-1">
            <Wallet className="w-4 h-4 text-olo" />
            <p className="text-xs text-muted-foreground">Balance</p>
          </div>
          <p className="font-heading font-800 text-2xl">₦{balance.toLocaleString()}</p>
          <div className="mt-2 h-1.5 rounded-full bg-muted overflow-hidden">
            <div className="h-full bg-olo rounded-full transition-all" style={{ width: `${progressToWithdraw}%` }} />
          </div>
          <p className="text-[11px] text-muted-foreground mt-1">{balance >= MIN_WITHDRAWAL ? 'Ready for bank withdrawal' : balance >= MIN_AIRTIME_WITHDRAWAL ? 'Ready for airtime withdrawal' : `₦${(MIN_AIRTIME_WITHDRAWAL - balance).toLocaleString()} to withdraw`}</p>
        </div>
        <div className="p-4 rounded-2xl border border-border bg-card">
          <div className="flex items-center gap-2 mb-1">
            <Users className="w-4 h-4 text-olo" />
            <p className="text-xs text-muted-foreground">Referrals</p>
          </div>
          <p className="font-heading font-800 text-2xl">{successfulCount}</p>
          <p className="text-[11px] text-muted-foreground mt-1">{pendingCount} pending · {successfulCount} scanned</p>
        </div>
      </div>

      {/* Per-referral earning */}
      <div className="mb-6 p-4 rounded-2xl border border-border bg-card">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-sm font-medium">Per referral</p>
            <p className="text-xs text-muted-foreground mt-0.5">Paid once per referral when your friend completes their first scan.</p>
          </div>
          <p className="font-heading font-800 text-2xl text-olo">₦{REWARD_PER_REFERRAL.toLocaleString()}</p>
        </div>
      </div>

      {/* Withdrawal section */}
      {balance >= MIN_AIRTIME_WITHDRAWAL && (
        <div className="mb-6">
          {!showWithdraw ? (
            <button
              onClick={() => setShowWithdraw(true)}
              className="w-full p-4 rounded-2xl border-2 border-olo/40 bg-olo/5 flex items-center justify-between hover:bg-olo/10 transition-colors"
            >
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-olo flex items-center justify-center">
                  <Wallet className="w-5 h-5 text-white" />
                </div>
                <div className="text-left">
                  <p className="font-heading font-700 text-sm">Withdraw your earnings</p>
                  <p className="text-xs text-muted-foreground">₦{balance.toLocaleString()} available · airtime from ₦{MIN_AIRTIME_WITHDRAWAL.toLocaleString()}, bank from ₦{MIN_WITHDRAWAL.toLocaleString()}</p>
                </div>
              </div>
              <ArrowRight className="w-5 h-5 text-olo" />
            </button>
          ) : (
            <div className="p-5 rounded-2xl border border-border bg-card">
              <div className="flex gap-2 mb-4 p-1 rounded-xl bg-muted/40">
                <button
                  onClick={() => { setWithdrawType('airtime'); setWithdrawAmount(Math.max(MIN_AIRTIME_WITHDRAWAL, balance)); }}
                  className={`flex-1 py-2 rounded-lg text-sm font-medium transition-colors ${withdrawType === 'airtime' ? 'bg-card text-olo shadow-sm' : 'text-muted-foreground'}`}
                >
                  Airtime
                </button>
                <button
                  onClick={() => { setWithdrawType('bank'); setWithdrawAmount(Math.max(MIN_WITHDRAWAL, balance)); }}
                  disabled={balance < MIN_WITHDRAWAL}
                  className={`flex-1 py-2 rounded-lg text-sm font-medium transition-colors disabled:opacity-40 ${withdrawType === 'bank' ? 'bg-card text-olo shadow-sm' : 'text-muted-foreground'}`}
                >
                  Bank transfer
                </button>
              </div>
              {withdrawType === 'bank' ? (
                <div className="space-y-3">
                  <input value={bankName} onChange={(e) => setBankName(e.target.value)} placeholder="Bank name (e.g. GTBank)" className="w-full px-4 py-2.5 rounded-xl border border-border bg-background text-sm focus:outline-none focus:border-olo" />
                  <input value={accountNumber} onChange={(e) => setAccountNumber(e.target.value)} placeholder="Account number (10 digits)" inputMode="numeric" className="w-full px-4 py-2.5 rounded-xl border border-border bg-background text-sm focus:outline-none focus:border-olo" />
                  <input value={accountName} onChange={(e) => setAccountName(e.target.value)} placeholder="Account name" className="w-full px-4 py-2.5 rounded-xl border border-border bg-background text-sm focus:outline-none focus:border-olo" />
                </div>
              ) : (
                <div className="space-y-3">
                  <input value={phoneNumber} onChange={(e) => setPhoneNumber(e.target.value)} placeholder="Phone number (e.g. 08031234567)" inputMode="tel" className="w-full px-4 py-2.5 rounded-xl border border-border bg-background text-sm focus:outline-none focus:border-olo" />
                  <p className="text-xs text-muted-foreground">Airtime is sent to the phone number above via Peyflex.</p>
                </div>
              )}
              <div className="flex items-center gap-2 p-3 rounded-xl bg-muted/40 mt-3">
                <Clock className="w-4 h-4 text-muted-foreground flex-shrink-0" />
                <p className="text-xs text-muted-foreground">{withdrawType === 'airtime' ? 'Airtime is delivered instantly to your phone via Peyflex.' : 'Bank transfer is processed instantly via Flutterwave. Enter the official bank name (e.g. "Access Bank", "GTBank", "Zenith Bank").'}</p>
              </div>
              <div className="flex items-start gap-2 p-3 rounded-xl bg-warning-soft/50 mt-2">
                <Info className="w-4 h-4 text-warning flex-shrink-0 mt-0.5" />
                <p className="text-xs text-muted-foreground">Our payment servers may be busy at times and a withdrawal might not go through on the first try. If that happens, just try again — your balance is unaffected and will be refunded automatically if a transfer fails.</p>
              </div>
              {withdrawError && <p className="text-sm text-danger mt-3">{withdrawError}</p>}
              {withdrawMsg && <p className="text-sm text-success mt-3">{withdrawMsg}</p>}
              <div className="flex gap-2 mt-3">
                <button onClick={() => setShowWithdraw(false)} className="px-4 py-2.5 rounded-xl border border-border text-sm font-medium hover:bg-muted/40">Cancel</button>
                <button onClick={handleWithdraw} disabled={withdrawing} className="flex-1 inline-flex items-center justify-center gap-2 bg-olo text-white font-semibold py-2.5 rounded-xl disabled:opacity-50">
                  {withdrawing ? <><Loader2 className="w-4 h-4 animate-spin" /> Processing…</> : `Withdraw ₦${withdrawAmount.toLocaleString()} to ${withdrawType === 'bank' ? 'bank' : 'airtime'}`}
                </button>
              </div>
            </div>
          )}
        </div>
      )}

      {/* How it works */}
      <div className="mb-6 p-5 rounded-2xl border border-border bg-card">
        <button onClick={() => setExpandedHow(!expandedHow)} className="w-full flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Info className="w-5 h-5 text-olo" />
            <h3 className="font-heading font-700 text-base">How it works</h3>
          </div>
          {expandedHow ? <ChevronUp className="w-4 h-4 text-muted-foreground" /> : <ChevronDown className="w-4 h-4 text-muted-foreground" />}
        </button>
        {expandedHow && (
          <div className="mt-4 space-y-3">
            {[
              { n: 1, t: 'Share your code', d: 'Send your referral code to friends and family.' },
              { n: 2, t: 'They sign up & scan', d: 'Your friend creates an account and takes their first teeth scan.' },
              { n: 3, t: 'You earn ₦50', d: 'Each referral pays ₦50 once — credited the moment your friend completes their first scan.' },
              { n: 4, t: 'Withdraw', d: 'Cash out to airtime from ₦50 (instant) or bank from ₦2,000.' },
            ].map((s) => (
              <div key={s.n} className="flex gap-3">
                <div className="w-7 h-7 rounded-lg bg-olo/10 flex items-center justify-center flex-shrink-0">
                  <span className="text-xs font-bold text-olo">{s.n}</span>
                </div>
                <div>
                  <p className="font-medium text-sm">{s.t}</p>
                  <p className="text-xs text-muted-foreground">{s.d}</p>
                </div>
              </div>
            ))}
            <p className="text-xs text-muted-foreground pt-2 border-t border-border">
              Your referral code stays active while you have a paid plan. If your subscription lapses, your code pauses until you renew.
            </p>
          </div>
        )}
      </div>

      {/* Referral list */}
      {referrals.length > 0 && (
        <div className="mb-6 p-5 rounded-2xl border border-border bg-card">
          <div className="flex items-center justify-between mb-4">
            <h3 className="font-heading font-700 text-base">Your referrals</h3>
            <button
              onClick={refresh}
              disabled={refreshing}
              aria-label="Refresh referrals"
              className="inline-flex items-center gap-1.5 text-xs font-medium text-olo hover:bg-olo/10 px-2.5 py-1.5 rounded-lg transition-colors disabled:opacity-50"
            >
              <RotateCcw className={`w-3.5 h-3.5 ${refreshing ? 'animate-spin' : ''}`} /> Refresh
            </button>
          </div>
          <div className="space-y-2">
            {referrals.map((r) => (
              <div key={r.id} className="flex items-center justify-between py-2.5 border-b border-border last:border-0">
                <div>
                  <p className="font-medium text-sm">{r.invited_username || r.invited_email || 'Anonymous'}</p>
                  <p className="text-xs text-muted-foreground">{new Date(r.created_date).toLocaleDateString()}</p>
                </div>
                <span className={`text-xs font-semibold px-2.5 py-1 rounded-full ${
                  r.status === 'rewarded' ? 'bg-success-soft text-success' :
                  r.status === 'scanned' ? 'bg-olo/10 text-olo' :
                  r.status === 'expired' ? 'bg-danger-soft text-danger' :
                  'bg-muted text-muted-foreground'
                }`}>
                  {r.status === 'rewarded' ? 'Rewarded' : r.status === 'scanned' ? 'Scanned' : r.status === 'expired' ? 'Expired' : 'Pending'}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Withdrawal history */}
      {withdrawals.length > 0 && (
        <div className="p-5 rounded-2xl border border-border bg-card">
          <h3 className="font-heading font-700 text-base mb-4">Withdrawal history</h3>
          <div className="space-y-2">
            {withdrawals.map((w) => (
              <div key={w.id} className="flex items-center justify-between py-2.5 border-b border-border last:border-0">
                <div>
                  <p className="font-medium text-sm">₦{(w.amount || 0).toLocaleString()}</p>
                  <p className="text-xs text-muted-foreground">{new Date(w.requested_date).toLocaleDateString()}{w.withdrawal_type === 'bank' && w.batch_time ? ` · Batch ${w.batch_time}` : w.withdrawal_type === 'airtime' ? ' · Airtime' : ''}</p>
                </div>
                <span className={`text-xs font-semibold px-2.5 py-1 rounded-full ${
                  w.status === 'completed' ? 'bg-success-soft text-success' :
                  w.status === 'processing' || w.status === 'batched' ? 'bg-olo/10 text-olo' :
                  w.status === 'failed' ? 'bg-danger-soft text-danger' :
                  'bg-muted text-muted-foreground'
                }`}>
                  {w.status === 'completed' ? 'Completed' : w.status === 'processing' ? 'Processing' : w.status === 'batched' ? 'Batched' : w.status === 'failed' ? 'Failed' : 'Pending'}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}