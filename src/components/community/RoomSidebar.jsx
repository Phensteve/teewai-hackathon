import { Link } from 'react-router-dom';
import { Plus, Home, MessageCircle, Lightbulb, MessageSquare, HelpCircle, Megaphone, Lock } from 'lucide-react';

const CATEGORY_META = {
  general: { icon: MessageCircle, tint: 'text-olo' },
  suggestions: { icon: Lightbulb, tint: 'text-amber-500' },
  feedback: { icon: MessageSquare, tint: 'text-blue-500' },
  support: { icon: HelpCircle, tint: 'text-purple-500' },
  announcements: { icon: Megaphone, tint: 'text-rose-500' },
};

// Discord/Slack-style room list. The Common Room (house rules) is pinned at
// the top as a virtual entry; real chat rooms follow, each with its category
// icon and a live message count.
export default function RoomSidebar({ rooms, activeId, onSelect, user, onCreate, countFor }) {
  return (
    <div className="flex flex-col h-full">
      <div className="flex-1 overflow-y-auto px-2 py-3 no-scrollbar">
        {/* Common Room — pinned virtual room (house rules) */}
        <button
          onClick={() => onSelect('common-room')}
          className={`w-full flex items-center gap-2.5 px-3 py-2.5 rounded-xl text-left transition-colors ${
            activeId === 'common-room' ? 'bg-olo/12 text-olo' : 'hover:bg-muted text-foreground/80'
          }`}
        >
          <Home className="w-4 h-4 flex-shrink-0" />
          <span className="text-sm font-semibold truncate">Common Room</span>
        </button>

        <div className="px-3 mt-4 mb-1.5">
          <span className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">Rooms</span>
        </div>

        {rooms.length === 0 ? (
          <p className="px-3 py-2 text-xs text-muted-foreground">No rooms yet.</p>
        ) : (
          <div className="space-y-0.5">
            {rooms.map((room) => {
              const meta = CATEGORY_META[room.category] || CATEGORY_META.general;
              const Icon = meta.icon;
              const active = activeId === room.id;
              const count = countFor(room.id);
              return (
                <button
                  key={room.id}
                  onClick={() => onSelect(room.id)}
                  className={`w-full flex items-center gap-2.5 px-3 py-2.5 rounded-xl text-left transition-colors ${
                    active ? 'bg-olo/12 text-olo' : 'hover:bg-muted text-foreground/80'
                  }`}
                >
                  <Icon className={`w-4 h-4 flex-shrink-0 ${active ? 'text-olo' : meta.tint}`} />
                  <span className="text-sm font-medium truncate flex-1">{room.name}</span>
                  {room.is_insider && <Lock className="w-3 h-3 text-muted-foreground flex-shrink-0" />}
                  {count > 0 && <span className="text-[10px] text-muted-foreground/70 flex-shrink-0">{count}</span>}
                </button>
              );
            })}
          </div>
        )}
      </div>

      {/* Create room */}
      <div className="p-2 border-t border-border">
        {user ? (
          <button
            onClick={onCreate}
            className="w-full flex items-center gap-2 px-3 py-2.5 rounded-xl text-sm font-medium text-foreground/80 hover:bg-muted hover:text-olo transition-colors"
          >
            <Plus className="w-4 h-4" /> Create a room
          </button>
        ) : (
          <p className="px-3 py-2 text-[11px] text-muted-foreground">
            <Link to="/login" className="text-olo hover:underline">Sign in</Link> to create a room.
          </p>
        )}
      </div>
    </div>
  );
}