import { MessageCircle, Lightbulb, MessageSquare, HelpCircle, Megaphone, Lock, ArrowRight } from 'lucide-react';

const CATEGORY_META = {
  general: { icon: MessageCircle, label: 'General', tint: 'bg-olo/10 text-olo' },
  suggestions: { icon: Lightbulb, label: 'Suggestions', tint: 'bg-amber-500/10 text-amber-600 dark:text-amber-400' },
  feedback: { icon: MessageSquare, label: 'Feedback', tint: 'bg-blue-500/10 text-blue-600 dark:text-blue-400' },
  support: { icon: HelpCircle, label: 'Support', tint: 'bg-purple-500/10 text-purple-600 dark:text-purple-400' },
  announcements: { icon: Megaphone, label: 'Announcements', tint: 'bg-rose-500/10 text-rose-600 dark:text-rose-400' },
};

// Premium directory card for the Common Room welcome page — echoes the Blog's
// article-card shape (rounded, bordered, hover lift) but leads with a category
// tint and a "Join room" affordance instead of a read-time.
export default function RoomCard({ room, messageCount, onClick }) {
  const meta = CATEGORY_META[room.category] || CATEGORY_META.general;
  const Icon = room.is_official ? Lock : meta.icon;

  return (
    <button
      onClick={onClick}
      className="group text-left p-5 sm:p-6 rounded-2xl sm:rounded-3xl border border-border bg-card hover:border-olo/40 hover:shadow-xl hover:shadow-olo/5 transition-all duration-300 hover:-translate-y-0.5 flex flex-col"
    >
      <div className="flex items-center gap-2.5 mb-3">
        <span className={`w-9 h-9 rounded-xl flex items-center justify-center ${meta.tint}`}>
          <Icon className="w-4 h-4" />
        </span>
        <span className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">{meta.label}</span>
        {room.is_insider && (
          <span className="ml-auto text-[9px] font-bold text-olo bg-olo/10 px-2 py-0.5 rounded-full uppercase tracking-wide flex items-center gap-1">
            <Lock className="w-2.5 h-2.5" /> Insider
          </span>
        )}
      </div>
      <h3 className="font-heading font-600 text-lg leading-snug">{room.name}</h3>
      <p className="mt-1.5 text-sm text-muted-foreground leading-relaxed line-clamp-2 flex-1">
        {room.description || 'Join the conversation in this room.'}
      </p>
      <div className="mt-4 flex items-center justify-between">
        <span className="text-xs text-muted-foreground inline-flex items-center gap-1.5">
          <MessageCircle className="w-3.5 h-3.5" /> {messageCount} {messageCount === 1 ? 'message' : 'messages'}
        </span>
        <span className="inline-flex items-center gap-1 text-sm font-semibold text-olo group-hover:gap-1.5 transition-all">
          Join room <ArrowRight className="w-4 h-4" />
        </span>
      </div>
    </button>
  );
}