import { useEffect, useState } from 'react';
import { unrufld } from '@/api/unrufldClient';
import { scans as insforgeScans, userProfile } from '@/lib/insforgeDb';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useAuth } from '@/lib/AuthContext';
import { useUserProfile, PROFILE_KEY } from '@/hooks/use-user-profile';
import { useUserProgress } from '@/hooks/use-user-progress';
import ProfileIdentitySkeleton from '@/components/loading/ProfileIdentitySkeleton';
import PageSkeleton from '@/components/loading/PageSkeleton';
import { Skeleton } from '@/components/ui/skeleton';
import { User, Crown, Flame, Camera, Brush, Trophy, Save, Loader2, Check, Calendar, HeartPulse, AtSign, X, ShieldCheck, Stethoscope, PenLine } from 'lucide-react';
import { computeMMR, computeStreak, getRank, MILESTONES } from '@/lib/gamification';
import ScoreCircle from '@/components/ScoreCircle';
import { Link } from 'react-router-dom';
import IpAccountMatchSettings from '@/components/IpAccountMatchSettings';

export default function Profile() {
  const { user: authUser } = useAuth();
  const queryClient = useQueryClient();
  const profileQuery = useUserProfile();
  const scansQuery = useQuery({
    queryKey: ['profile-scans', authUser?.id],
    queryFn: () => insforgeScans.list('-created_date', 50),
    enabled: !!authUser?.id,
    staleTime: 60_000,
  });
  const progressQuery = useUserProgress();
  const me = profileQuery.data || null;
  const scans = scansQuery.data || [];
  const progress = progressQuery.data || null;
  const loading = scansQuery.isPending || progressQuery.isPending;
  const [username, setUsername] = useState('');
  const [usernameStatus, setUsernameStatus] = useState('idle');
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    if (!me) return;
    setUsername(me.username || '');
    if (me.username) setUsernameStatus('available');
  }, [me?.id, me?.username]);

  // Debounced username uniqueness check
  useEffect(() => {
    const value = username.trim().toLowerCase();
    const current = (me?.username || '').toLowerCase();
    if (!value) { setUsernameStatus('idle'); return; }
    if (value.length < 3) { setUsernameStatus('too_short'); return; }
    if (value === current) { setUsernameStatus('available'); return; }
    setUsernameStatus('checking');
    const t = setTimeout(async () => {
      try {
        const res = await unrufld.functions.invoke('userProfile', { op: 'checkUsername', username: value });
        setUsernameStatus(res.data?.available ? 'available' : 'taken');
      } catch {
        setUsernameStatus('error');
      }
    }, 450);
    return () => clearTimeout(t);
  }, [username, me?.username]);

  const streak = computeStreak(scans);
  const mmr = computeMMR(scans, streak);
  const rankInfo = getRank(mmr);
  const peakMmr = progress?.peak_mmr || mmr;
  const peakRank = progress?.peak_rank;
  const latest = scans[0];
  const oldest = scans[scans.length - 1];
  const improvement = scans.length >= 2 ? (latest?.score || 0) - (oldest?.score || 0) : 0;
  const earnedIds = progress?.milestones_earned || [];
  const earnedMilestones = MILESTONES.filter((m) => earnedIds.includes(m.id));
  const charms = progress?.charms_collected || [];

  const usernameValid = username.trim().length >= 3 && usernameStatus === 'available';

  const newUsername = username.trim().toLowerCase();
  const changingUsername = !!me?.username && newUsername !== (me.username || '').toLowerCase();
  const usernameLockedUntil = me?.username_changed_date
    ? new Date(new Date(me.username_changed_date).getTime() + 30 * 24 * 60 * 60 * 1000)
    : null;
  const usernameBlocked = changingUsername && usernameLockedUntil && usernameLockedUntil > new Date();

  const saveProfile = async () => {
    if (!usernameValid || usernameBlocked) return;
    setSaving(true);
    try {
      const payload = { username: newUsername };
      if (changingUsername) {
        payload.username_history = [...(me?.username_history || []), me.username];
        payload.username_changed_date = new Date().toISOString();
      }
      await userProfile.update(payload);
      queryClient.setQueryData([...PROFILE_KEY, authUser?.id], (prev) => prev ? { ...prev, ...payload } : prev);
      setSaved(true);
      setTimeout(() => setSaved(false), 2000);
    } finally {
      setSaving(false);
    }
  };

  const stats = [
    { label: 'Total scans', value: scans.length, icon: Camera, color: 'text-olo' },
    { label: 'Day streak', value: streak, icon: Flame, color: 'text-olo' },
    { label: 'Smile MMR', value: mmr, icon: Trophy, color: 'text-foreground' },
    { label: 'Peak MMR', value: peakMmr, icon: Crown, color: 'text-foreground' },
  ];

  return (
    <div className="max-w-3xl mx-auto space-y-6 overflow-x-hidden">
      <h1 className="text-h1">Profile</h1>

      {/* Identity loads independently of scan history and rewards. */}
      {profileQuery.isPending ? <ProfileIdentitySkeleton /> : !me ? (
        <div className="p-6 rounded-3xl border border-border bg-card space-y-3" role="alert">
          <p className="text-caption text-muted-foreground">Could not load your profile.</p>
          <button onClick={() => profileQuery.refetch()} className="text-primary text-sm font-medium">Try again</button>
        </div>
      ) : <div className="p-6 rounded-3xl border border-border bg-card overflow-hidden page-enter-fade">
        <div className="flex items-center gap-4">
          <div className="w-16 h-16 rounded-2xl bg-olo/10 flex items-center justify-center flex-shrink-0">
            <User className="w-8 h-8 text-olo" />
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-h2 truncate">{me.username || me.display_name || me.full_name || 'Your profile'}</p>
            <p className="text-caption text-muted-foreground truncate">{me?.email}</p>
            <div className="mt-2">
              {loading ? <Skeleton className="h-7 w-28 rounded-full bg-muted motion-reduce:animate-none" /> : <span
                className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-caption font-semibold"
                style={{ backgroundColor: `${rankInfo.rank.color}22`, color: rankInfo.rank.color }}
              >
                {rankInfo.rank.icon} {rankInfo.rank.name} {rankInfo.tier}
              </span>}
            </div>
          </div>
        </div>

        {/* Account details — username only, full editing on Edit Profile page */}
        <div className="mt-5 pt-5 border-t border-border space-y-4">
          <div>
            <div className="flex items-center justify-between">
              <label className="text-label text-muted-foreground">Username</label>
              <span className="text-label font-bold text-danger bg-danger/10 px-2 py-0.5 rounded-full">Required</span>
            </div>
            <div className="relative mt-2">
              <AtSign className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <input
                value={username}
                onChange={(e) => setUsername(e.target.value.replace(/\s+/g, ''))}
                className="w-full pl-10 pr-3 py-2.5 rounded-xl border border-border bg-background text-base focus:outline-none focus:border-olo"
                placeholder="yourname"
              />
            </div>
            {usernameStatus === 'checking' && <p className="text-caption text-muted-foreground mt-1 flex items-center gap-1.5"><Loader2 className="w-3.5 h-3.5 animate-spin" /> Checking…</p>}
            {usernameStatus === 'too_short' && <p className="text-caption text-warning mt-1">At least 3 characters</p>}
            {usernameStatus === 'available' && <p className="text-caption text-success mt-1 flex items-center gap-1.5"><Check className="w-3.5 h-3.5" /> Available</p>}
            {usernameStatus === 'taken' && <p className="text-caption text-danger mt-1 flex items-center gap-1.5"><X className="w-3.5 h-3.5" /> Already taken</p>}
            {usernameBlocked && (
              <p className="text-caption text-warning mt-1">
                Username can only be changed once every 30 days — next change available {usernameLockedUntil.toLocaleDateString(undefined, { month: 'short', day: 'numeric' })}.
              </p>
            )}
            {!usernameBlocked && me?.username && (
              <p className="text-caption text-muted-foreground mt-1.5">You can change your username once every 30 days.</p>
            )}
          </div>

          <Link
            to="/edit-profile"
            className="flex items-center justify-center gap-2 w-full py-3 rounded-xl border border-border bg-background text-sm font-semibold text-olo hover:bg-olo/5 hover:border-olo/40 transition-colors"
          >
            <PenLine className="w-4 h-4" /> Edit profile
          </Link>

          <div className="flex justify-end">
            <button
              onClick={saveProfile}
              disabled={saving || !usernameValid || usernameBlocked}
              className="inline-flex items-center gap-2 bg-olo text-white font-semibold px-5 py-2.5 rounded-xl hover:scale-105 transition-transform disabled:opacity-50"
            >
              {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : saved ? <Check className="w-4 h-4" /> : <Save className="w-4 h-4" />}
              {saved ? 'Saved' : 'Save username'}
            </button>
          </div>
        </div>
      </div>}

      {/* Applications & verification */}
      <div className="p-6 rounded-3xl border border-border bg-card">
        <div className="flex items-center gap-2 mb-4">
          <ShieldCheck className="w-5 h-5 text-olo" />
          <h2 className="text-h3">Applications & verification</h2>
        </div>
        <div className="grid sm:grid-cols-2 gap-3">
          <Link to="/apply" className="flex items-start gap-3 p-4 rounded-2xl border border-border bg-background hover:border-olo/40 hover:bg-olo/5 transition-colors">
            <span className="icon-tool"><Stethoscope /></span>
            <div className="min-w-0">
              <p className="font-medium text-caption">Medical professional</p>
              <p className="text-label text-muted-foreground mt-0.5">Apply to be verified as a clinician.</p>
            </div>
          </Link>
          <Link to="/write" className="flex items-start gap-3 p-4 rounded-2xl border border-border bg-background hover:border-olo/40 hover:bg-olo/5 transition-colors">
            <span className="icon-tool"><PenLine /></span>
            <div className="min-w-0">
              <p className="font-medium text-caption">Write a blog</p>
              <p className="text-label text-muted-foreground mt-0.5">Share a story & apply to be a verified blogger.</p>
            </div>
          </Link>
        </div>
      </div>

      {/* Latest scores */}
      {latest && (
        <div className="grid grid-cols-2 gap-3">
          <div className="p-5 rounded-3xl border border-border bg-card flex flex-col items-center text-center overflow-hidden">
            <div className="flex items-center gap-2 mb-2 text-olo">
              <Brush className="w-4 h-4" />
              <h2 className="text-caption font-heading font-600">Whiteness</h2>
            </div>
            <ScoreCircle score={latest.score} size={120} />
          </div>
          <div className="p-5 rounded-3xl border border-border bg-card flex flex-col items-center text-center overflow-hidden">
            <div className="flex items-center gap-2 mb-2 text-success">
              <HeartPulse className="w-4 h-4" />
              <h2 className="text-caption font-heading font-600">Dental health</h2>
            </div>
            <ScoreCircle score={latest.dental_health_score} size={120} color="hsl(var(--success))" tiers={[{ min: 90, label: 'Excellent' }, { min: 75, label: 'Good' }, { min: 55, label: 'Fair' }, { min: 35, label: 'Poor' }]} />
          </div>
        </div>
      )}

      {loading ? <PageSkeleton compact /> : <div className="space-y-6 page-enter-fade">
      {/* Smile stats */}
      <div>
        <h2 className="text-h3 mb-3">Smile stats</h2>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          {stats.map(({ label, value, icon: Icon, color }) => (
            <div key={label} className="p-4 rounded-2xl border border-border bg-card text-center">
              <Icon className={`w-5 h-5 mx-auto mb-2 ${color}`} />
              <p className="text-h2 tabular-nums">{value}</p>
              <p className="text-label text-muted-foreground">{label}</p>
            </div>
          ))}
        </div>
      </div>

      {/* Rank progress */}
      <div className="p-6 rounded-3xl border border-border bg-card">
        <div className="flex items-center gap-2 mb-4">
          <Trophy className="w-5 h-5 text-olo" />
          <h2 className="text-h3">Rank progress</h2>
        </div>
        <div className="flex items-center justify-between text-caption mb-2">
          <span style={{ color: rankInfo.rank.color }} className="font-semibold">
            {rankInfo.rank.icon} {rankInfo.rank.name} {rankInfo.tier}
          </span>
          <span className="text-muted-foreground">
            {rankInfo.next ? `${rankInfo.next.name} next` : 'Max rank'}
          </span>
        </div>
        <div className="h-3 rounded-full bg-muted overflow-hidden">
          <div className="h-full rounded-full bg-olo transition-all" style={{ width: `${rankInfo.progress}%` }} />
        </div>
        <div className="flex justify-between text-label text-muted-foreground mt-1.5">
          <span className="tabular-nums">{mmr} MMR</span>
          {rankInfo.next && <span className="tabular-nums">{rankInfo.next.min} to promote</span>}
        </div>
        {peakRank && (
          <p className="text-caption text-muted-foreground mt-3 flex items-center gap-1.5">
            <Crown className="w-3.5 h-3.5 text-olo" /> Peak rank: {peakRank}
          </p>
        )}
      </div>

      {/* Journey */}
      <div className="p-6 rounded-3xl border border-border bg-card">
        <div className="flex items-center gap-2 mb-4">
          <Calendar className="w-5 h-5 text-olo" />
          <h2 className="text-h3">Your journey</h2>
        </div>
        <div className="grid grid-cols-3 gap-3 text-center">
          <div>
            <p className="text-label text-muted-foreground">First scan</p>
            <p className="text-h3 tabular-nums">{oldest ? new Date(oldest.created_date).toLocaleDateString(undefined, { month: 'short', day: 'numeric' }) : '—'}</p>
          </div>
          <div>
            <p className="text-label text-muted-foreground">Latest scan</p>
            <p className="text-h3 tabular-nums">{latest ? new Date(latest.created_date).toLocaleDateString(undefined, { month: 'short', day: 'numeric' }) : '—'}</p>
          </div>
          <div>
            <p className="text-label text-muted-foreground">Improvement</p>
            <p className={`text-h3 tabular-nums ${improvement > 0 ? 'text-olo' : 'text-muted-foreground'}`}>
              {improvement > 0 ? `+${improvement}` : improvement || '—'}
            </p>
          </div>
        </div>
      </div>

      {/* Milestones earned */}
      <div className="p-6 rounded-3xl border border-border bg-card">
        <div className="flex items-center gap-2 mb-4">
          <Brush className="w-5 h-5 text-olo" />
          <h2 className="text-h3">Milestones earned</h2>
        </div>
        {earnedMilestones.length ? (
          <div className="flex flex-wrap gap-2">
            {earnedMilestones.map((m) => (
              <span key={m.id} className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-caption font-medium bg-olo/10 text-olo">
                <Check className="w-3.5 h-3.5" /> {m.label}
              </span>
            ))}
          </div>
        ) : (
          <p className="text-caption text-muted-foreground">No milestones yet — take scans to earn your first!</p>
        )}
        {charms.length > 0 && (
          <p className="text-caption text-muted-foreground mt-4">🍀 Lucky charms collected: {charms.length}</p>
        )}
      </div>

      </div>}
      {/* Device & network association */}
      <IpAccountMatchSettings />
    </div>
  );
}