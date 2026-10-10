import { useState } from 'react';
import { ShieldCheck, UserX, ShieldAlert, MessageCircleOff, Trophy, Hash, Ban, Pencil, Trash2, X, Check } from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';
import { unrufld } from '@/api/unrufldClient';
import { getRank } from '@/lib/gamification';
import VerifiedBadge from '@/components/VerifiedBadge';
import MedicalBadge from '@/components/community/MedicalBadge';

// Discord/WhatsApp-style message row. Consecutive messages from the same
// author stack neatly: only the first in a group shows the avatar + display
// name; continuations show just the content. Signed-in authors can edit or
// delete their own messages (an "edited" tag appears after an edit). Clicking
// a signed-in author's message expands a small profile card with their MMR,
// rank and leaderboard position. Guests can't be expanded (no profile).

export default function MessageBubble({ message, isOwn, onDispute, onEdit, onDelete, showHeader = true }) {
  const [expanded, setExpanded] = useState(false);
  const [profile, setProfile] = useState(null);
  const [loadingProfile, setLoadingProfile] = useState(false);
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState('');
  const [saving, setSaving] = useState(false);

  const guest = message.is_guest;
  const admin = message.is_admin;
  const verified = message.is_verified;
  const verifiedMedical = message.is_from_verified_medical;
  const removed = message.flag_status === 'resolved_removed';
  const underReview = message.flag_status === 'flagged' || message.flag_status === 'disputed';
  const name = message.author_display_name || message.author_name || (guest ? 'Guest' : 'Anonymous');
  const username = message.author_username;
  const initial = name ? name.charAt(0).toUpperCase() : '?';
  const canDispute = isOwn && message.flag_status === 'flagged' && onDispute;
  const canExpand = !guest && !!message.created_by_id;
  const canModerate = isOwn && !guest && !removed;

  const toggleExpand = async () => {
    if (!canExpand) return;
    const next = !expanded;
    setExpanded(next);
    if (next && !profile && !loadingProfile) {
      setLoadingProfile(true);
      try {
        const res = await unrufld.functions.invoke('communityPost', { op: 'getProfile', user_id: message.created_by_id });
        setProfile(res?.data ?? res);
      } catch (e) {
        console.error('Profile fetch failed', e);
      } finally {
        setLoadingProfile(false);
      }
    }
  };

  const startEdit = (e) => { e?.stopPropagation(); setDraft(message.content); setEditing(true); };
  const cancelEdit = () => { setEditing(false); setDraft(''); };
  const saveEdit = async () => {
    if (!draft.trim() || !onEdit) return;
    setSaving(true);
    try { await onEdit(message, draft); setEditing(false); setDraft(''); }
    finally { setSaving(false); }
  };
  const doDelete = (e) => { e?.stopPropagation(); if (onDelete) onDelete(message); };

  const editedTag = message.edited ? <span className="text-[9px] italic text-muted-foreground/80 ml-0.5">edited</span> : null;

  // Continuation message (same author, grouped) — no avatar/name, just content
  if (!showHeader) {
    return (
      <div className="group relative px-3 pl-12">
        <span className="absolute left-3 top-1 text-[9px] text-muted-foreground/0 group-hover:text-muted-foreground/70 transition-opacity">
          {formatDistanceToNow(new Date(message.created_date), { addSuffix: false })}
        </span>
        {removed ? (
          <p className="text-[13px] italic text-muted-foreground py-0.5">Message removed by moderator</p>
        ) : editing ? (
          <div className="py-1">
            <textarea value={draft} onChange={(e) => setDraft(e.target.value)} rows={2} maxLength={2000} className="w-full text-[13px] rounded-lg border border-border bg-background px-2 py-1.5 resize-y focus:outline-none focus:border-olo" />
            <div className="flex gap-2 mt-1">
              <button onClick={saveEdit} disabled={saving || !draft.trim()} className="inline-flex items-center gap-1 text-[10px] font-semibold text-olo disabled:opacity-50"><Check className="w-3 h-3" /> Save</button>
              <button onClick={cancelEdit} className="inline-flex items-center gap-1 text-[10px] text-muted-foreground"><X className="w-3 h-3" /> Cancel</button>
            </div>
          </div>
        ) : (
          <>
            <p
              onClick={toggleExpand}
              className={`text-[13px] leading-relaxed whitespace-pre-wrap break-words py-0.5 inline ${canExpand ? 'cursor-pointer hover:bg-muted/40 rounded px-1 -mx-1' : ''}`}
            >
              {message.content}{editedTag}
            </p>
            {canModerate && (
              <span className="ml-1 inline-flex gap-1.5 opacity-0 group-hover:opacity-100 transition-opacity align-middle">
                <button onClick={startEdit} className="text-muted-foreground hover:text-olo" aria-label="Edit"><Pencil className="w-3 h-3" /></button>
                <button onClick={doDelete} className="text-muted-foreground hover:text-destructive" aria-label="Delete"><Trash2 className="w-3 h-3" /></button>
              </span>
            )}
          </>
        )}
        {underReview && !removed && canDispute && (
          <button onClick={(e) => { e.stopPropagation(); onDispute(message); }} className="ml-1 text-[10px] font-semibold text-olo hover:underline">Dispute</button>
        )}
      </div>
    );
  }

  // First message in a group — avatar + display name + badges
  return (
    <div className="px-3 pt-2 group">
      <div className="flex gap-2.5">
        <div className={`w-9 h-9 rounded-full flex items-center justify-center flex-shrink-0 text-xs font-heading font-700 ${
          isOwn ? 'bg-olo text-white' : guest ? 'bg-muted text-muted-foreground' : 'bg-olo/15 text-olo-deep'
        }`}>
          {guest ? <UserX className="w-4 h-4" /> : initial}
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-1.5 flex-wrap">
            <span className={`text-[13px] font-semibold ${isOwn ? 'text-olo' : 'text-foreground'}`}>{name}</span>
            {verified && !guest && <VerifiedBadge size={13} />}
            {verifiedMedical && !guest && <MedicalBadge size={13} profession={message.medical_profession} />}
            {admin && !guest && (
              <span className="flex items-center gap-0.5 text-[9px] font-bold text-amber-600 dark:text-amber-400 bg-amber-500/10 px-1.5 py-0.5 rounded uppercase tracking-wide">
                <ShieldCheck className="w-2.5 h-2.5" /> Official
              </span>
            )}
            <span className="text-[10px] text-muted-foreground/70">
              {formatDistanceToNow(new Date(message.created_date), { addSuffix: false })}
            </span>
            {editedTag}
          </div>
          {removed ? (
            <p className="text-[13px] italic text-muted-foreground mt-0.5 inline-flex items-center gap-1.5">
              <MessageCircleOff className="w-3.5 h-3.5" /> Message removed by moderator
            </p>
          ) : editing ? (
            <div className="mt-1">
              <textarea value={draft} onChange={(e) => setDraft(e.target.value)} rows={2} maxLength={2000} className="w-full text-[13px] rounded-lg border border-border bg-background px-2 py-1.5 resize-y focus:outline-none focus:border-olo" />
              <div className="flex gap-2 mt-1">
                <button onClick={saveEdit} disabled={saving || !draft.trim()} className="inline-flex items-center gap-1 text-[11px] font-semibold text-olo disabled:opacity-50"><Check className="w-3.5 h-3.5" /> Save</button>
                <button onClick={cancelEdit} className="inline-flex items-center gap-1 text-[11px] text-muted-foreground"><X className="w-3.5 h-3.5" /> Cancel</button>
              </div>
            </div>
          ) : (
            <>
              <p
                onClick={toggleExpand}
                className={`text-[13px] leading-relaxed whitespace-pre-wrap break-words mt-0.5 inline ${canExpand ? 'cursor-pointer hover:bg-muted/40 rounded px-1 -mx-1' : ''}`}
              >
                {message.content}
              </p>
              {canModerate && (
                <span className="ml-1.5 inline-flex gap-1.5 opacity-0 group-hover:opacity-100 transition-opacity align-middle">
                  <button onClick={startEdit} className="text-muted-foreground hover:text-olo" aria-label="Edit"><Pencil className="w-3.5 h-3.5" /></button>
                  <button onClick={doDelete} className="text-muted-foreground hover:text-destructive" aria-label="Delete"><Trash2 className="w-3.5 h-3.5" /></button>
                </span>
              )}
            </>
          )}
          {underReview && !removed && !editing && (
            <div className="mt-1 flex items-center gap-2">
              <span className="inline-flex items-center gap-1 text-[10px] font-medium text-amber-600 dark:text-amber-400 bg-amber-500/10 px-2 py-0.5 rounded-full">
                <ShieldAlert className="w-2.5 h-2.5" /> {message.flag_status === 'disputed' ? 'Dispute under review' : 'Flagged for review'}
              </span>
              {canDispute && (
                <button onClick={(e) => { e.stopPropagation(); onDispute(message); }} className="text-[10px] font-semibold text-olo hover:underline">Dispute</button>
              )}
            </div>
          )}

          {/* Expandable profile card */}
          {expanded && canExpand && (
            <div className="mt-1.5 inline-flex flex-col gap-1 text-[11px] bg-muted/60 border border-border rounded-lg px-3 py-2 animate-fade-up">
              {username && <span className="text-muted-foreground font-mono">@{username}</span>}
              {loadingProfile ? (
                <span className="text-muted-foreground">Loading…</span>
              ) : profile ? (
                <>
                  <span className="inline-flex items-center gap-1.5 text-foreground">
                    <Trophy className="w-3 h-3 text-amber-500" /> {profile.mmr ?? 0} Smile MMR
                  </span>
                  {(() => {
                    const r = getRank(profile.mmr || 0);
                    return (
                      <span className="inline-flex items-center gap-1.5" style={{ color: r.rank.color }}>
                        {r.rank.icon} {r.rank.name} {r.tier}
                      </span>
                    );
                  })()}
                  {profile.position ? (
                    <span className="inline-flex items-center gap-1.5 text-foreground">
                      <Hash className="w-3 h-3 text-olo" /> #{profile.position} on the leaderboard
                    </span>
                  ) : (profile.mmr ? (
                    <span className="inline-flex items-center gap-1.5 text-muted-foreground">
                      <Hash className="w-3 h-3 text-olo" /> Keep scanning to climb the board
                    </span>
                  ) : (
                    <span className="inline-flex items-center gap-1.5 text-muted-foreground">
                      <Ban className="w-3 h-3" /> New to teewai
                    </span>
                  ))}
                </>
              ) : null}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}