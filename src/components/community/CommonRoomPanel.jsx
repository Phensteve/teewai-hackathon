import { Home } from 'lucide-react';
import CommunityGuidelines from '@/components/community/CommunityGuidelines';

// The Common Room — the virtual "rules" room. Renders a room-style header
// (matching RoomView's chrome) with the house rules as the scrollable body,
// so selecting "Common Room" in the sidebar feels like opening a room whose
// content is the community guidelines.
export default function CommonRoomPanel() {
  return (
    <div className="flex flex-col h-full">
      <div className="flex items-center gap-2.5 px-3 py-2.5 border-b border-border bg-card/80 backdrop-blur-md flex-shrink-0">
        <div className="w-9 h-9 rounded-xl bg-olo/10 flex items-center justify-center flex-shrink-0">
          <Home className="w-4 h-4 text-olo" />
        </div>
        <div className="flex-1 min-w-0">
          <h1 className="font-heading font-700 text-sm truncate">Common Room</h1>
          <p className="text-[11px] text-muted-foreground truncate">House rules & welcome</p>
        </div>
      </div>
      <div className="flex-1 overflow-y-auto">
        <div className="max-w-3xl mx-auto px-4 sm:px-6 py-6 sm:py-8">
          <div className="mb-8">
            <span className="text-olo font-semibold text-xs uppercase tracking-widest">Welcome</span>
            <h2 className="mt-2 font-heading font-700 text-2xl sm:text-3xl tracking-tight text-balance">
              The teewai Common Room
            </h2>
            <p className="mt-3 text-sm text-muted-foreground leading-relaxed max-w-2xl text-balance">
              A friendly space to share your smile journey, swap tips, ask questions, and celebrate progress with people who get it. Be kind, stay curious, and make someone feel welcome today.
            </p>
          </div>
          <CommunityGuidelines />
        </div>
      </div>
    </div>
  );
}