import { useState, useRef, useEffect } from 'react';
import { motion } from 'framer-motion';
import { ArrowLeft, Send, MessageCircle, Lightbulb, MessageSquare, HelpCircle, Megaphone, Lock, LogIn, Info } from 'lucide-react';
import { Link } from 'react-router-dom';
import MessageBubble from '@/components/community/MessageBubble';
import Spinner from '@/components/Spinner';

const CATEGORY_META = {
  general: { icon: MessageCircle, color: 'text-olo', bg: 'bg-olo/10' },
  suggestions: { icon: Lightbulb, color: 'text-amber-500', bg: 'bg-amber-500/10' },
  feedback: { icon: MessageSquare, color: 'text-blue-500', bg: 'bg-blue-500/10' },
  support: { icon: HelpCircle, color: 'text-purple-500', bg: 'bg-purple-500/10' },
  announcements: { icon: Megaphone, color: 'text-rose-500', bg: 'bg-rose-500/10' },
};

export default function RoomView({ room, messages, user, sending, onBack, onSend, onDispute, onEdit, onDelete }) {
  const [text, setText] = useState('');
  const meta = CATEGORY_META[room.category] || CATEGORY_META.general;
  const Icon = meta.icon;
  const endRef = useRef(null);
  const inputRef = useRef(null);
  const isInsider = room.is_insider;

  const sorted = [...messages].sort((a, b) => new Date(a.created_date) - new Date(b.created_date));

  useEffect(() => {
    endRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [sorted.length]);

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!text.trim() || sending) return;
    onSend(text);
    setText('');
  };

  const isOfficial = room.is_official;
  const isAdmin = !!(user && user.role === 'admin');
  const canPost = (user || !isInsider) && (!isOfficial || isAdmin);

  return (
    <motion.div
      initial={{ opacity: 0, x: 16 }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0, x: 16 }}
      transition={{ duration: 0.22 }}
      className="flex flex-col h-full"
    >
      {/* Header */}
      <div className="flex items-center gap-2 px-3 py-2 border-b border-border bg-card/80 backdrop-blur-md flex-shrink-0">
        <button onClick={onBack} className="lg:hidden w-8 h-8 rounded-lg flex items-center justify-center hover:bg-olo/10 transition-colors flex-shrink-0">
          <ArrowLeft className="w-4 h-4" />
        </button>
        <div className={`w-8 h-8 sm:w-9 sm:h-9 rounded-xl ${meta.bg} flex items-center justify-center flex-shrink-0`}>
          <Icon className={`w-4 h-4 ${meta.color}`} />
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-1.5">
            <h1 className="font-heading font-700 text-sm truncate">{room.name}</h1>
            {isInsider && (
              <span className="flex items-center gap-0.5 text-[9px] font-bold text-olo bg-olo/10 px-1.5 py-0.5 rounded-full uppercase tracking-wide flex-shrink-0">
                <Lock className="w-2.5 h-2.5" /> Insider
              </span>
            )}
          </div>
          <p className="text-[11px] text-muted-foreground truncate">{room.description || 'Common Room'}</p>
        </div>
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto py-2">
        <div className="max-w-3xl mx-auto px-2 sm:px-3">
          {sorted.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-20 text-center px-4">
              <div className="w-14 h-14 rounded-2xl bg-olo/10 flex items-center justify-center mb-3">
                <Icon className="w-6 h-6 text-olo" />
              </div>
              <p className="text-sm font-medium">No messages yet</p>
              <p className="text-xs text-muted-foreground mt-1">
                {canPost ? 'Be the first to start the conversation.' : isOfficial ? 'Only admins can post in this room.' : 'Sign in to join the conversation.'}
              </p>
            </div>
          ) : (
            sorted.map((m, i) => {
              const prev = sorted[i - 1];
              const showHeader = m.is_guest || !prev || prev.created_by_id !== m.created_by_id ||
                (new Date(m.created_date).getTime() - new Date(prev.created_date).getTime() > 5 * 60 * 1000);
              return (
                <MessageBubble key={m.id} message={m} isOwn={user && m.created_by_id === user.id && !m.is_guest} onDispute={onDispute} onEdit={onEdit} onDelete={onDelete} showHeader={showHeader} />
              );
            })
          )}
          <div ref={endRef} />
        </div>
      </div>

      {/* Input — geeky terminal style, full-bleed, sharp corners */}
      <div className="border-t-2 border-border bg-card/80 backdrop-blur-md px-2 py-3 safe-area-inset-bottom flex-shrink-0">
        {canPost ? (
          <form onSubmit={handleSubmit} className="flex items-stretch gap-2">
            <textarea
              ref={inputRef}
              value={text}
              onChange={(e) => setText(e.target.value)}
              onKeyDown={(e) => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handleSubmit(e); } }}
              rows={1}
              placeholder={user ? '> type a message…' : '> post as a guest…'}
              maxLength={2000}
              className="flex-1 resize-none rounded-none border border-border bg-background px-4 py-3 font-mono text-[13px] leading-relaxed focus:outline-none focus:border-olo/60 max-h-32 transition-colors"
            />
            <button
              type="submit"
              disabled={!text.trim() || sending}
              className="px-5 rounded-none bg-olo text-white font-mono text-xs font-bold uppercase tracking-wider flex items-center justify-center disabled:opacity-30 disabled:cursor-not-allowed hover:opacity-90 active:scale-95 transition-all flex-shrink-0"
            >
              {sending ? <Spinner size={16} /> : 'Send'}
            </button>
          </form>
        ) : isOfficial ? (
          <div className="flex items-center justify-center gap-2 w-full rounded-none border-2 border-border bg-muted/30 px-4 py-3 text-[13px] font-mono text-muted-foreground">
            <Megaphone className="w-4 h-4" /> Announcement-only — only admins post here
          </div>
        ) : (
          <Link to="/login" className="flex items-center justify-center gap-2 w-full rounded-none border-2 border-olo/30 bg-olo/5 px-4 py-3 text-[13px] font-mono font-medium text-olo hover:bg-olo/10 transition-colors">
            <LogIn className="w-4 h-4" /> Sign in to post in this room
          </Link>
        )}
        {!user && canPost && (
          <p className="text-[10px] text-muted-foreground/70 mt-1.5 px-1 font-mono flex items-center gap-1">
            <Info className="w-2.5 h-2.5" /> posting as guest — <Link to="/login" className="text-olo hover:underline">sign in</Link> to show your name
          </p>
        )}
      </div>
    </motion.div>
  );
}