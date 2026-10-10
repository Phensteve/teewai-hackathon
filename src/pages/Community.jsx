import { useState, useEffect, useCallback } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { ArrowLeft, Menu, MessageCircleOff, X } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { unrufld } from '@/api/unrufldClient';
import { filterProfanity } from '@/lib/profanityFilter';
import RoomView from '@/components/community/RoomView';
import RoomSidebar from '@/components/community/RoomSidebar';
import CommonRoomPanel from '@/components/community/CommonRoomPanel';
import CreateRoomModal from '@/components/community/CreateRoomModal';
import DisputeModal from '@/components/community/DisputeModal';
import AppealForm from '@/components/AppealForm';
import Logo from '@/components/Logo';
import BackButton from '@/components/BackButton';
import ThemeToggle from '@/components/ThemeToggle';
import Spinner from '@/components/Spinner';

// Discord/Slack-style community: a persistent room sidebar (with the
// Common Room — house rules — pinned at the top) and an inline chat pane.
// All data logic (load, realtime, send, create, dispute) is unchanged.

export default function Community() {
  const navigate = useNavigate();
  const [user, setUser] = useState(null);
  const [rooms, setRooms] = useState([]);
  const [messages, setMessages] = useState([]);
  const [activeRoomId, setActiveRoomId] = useState('common-room');
  const [loading, setLoading] = useState(true);
  const [showCreate, setShowCreate] = useState(false);
  const [creating, setCreating] = useState(false);
  const [sending, setSending] = useState(false);
  const [disputeTarget, setDisputeTarget] = useState(null);
  const [disputing, setDisputing] = useState(false);
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [postError, setPostError] = useState('');
  const [showAppeal, setShowAppeal] = useState(false);

  useEffect(() => {
    unrufld.auth.me().then(setUser).catch(() => setUser(null));
  }, []);

  const loadData = useCallback(async () => {
    setLoading(true);
    try {
      const [roomsData, msgsData] = await Promise.all([
        unrufld.entities.DiscussionRoom.list('-created_date', 100),
        unrufld.entities.DiscussionMessage.list('-created_date', 1000),
      ]);
      setRooms(roomsData || []);
      setMessages(msgsData || []);
    } catch (e) {
      console.error('Community load failed', e);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { loadData(); }, [loadData]);

  // Realtime: new messages appear live
  useEffect(() => {
    const unsub = unrufld.entities.DiscussionMessage.subscribe((event) => {
      if (event.type === 'create') {
        setMessages((prev) => [event.data, ...prev]);
      }
    });
    return unsub;
  }, []);

  // Hide insider rooms from guests
  const visibleRooms = rooms.filter((r) => user || !r.is_insider);
  const activeRoom = visibleRooms.find((r) => r.id === activeRoomId);
  const isCommonRoom = activeRoomId === 'common-room';

  const countFor = (roomId) => messages.filter((m) => m.room_id === roomId).length;

  const selectRoom = (id) => {
    setActiveRoomId(id);
    setSidebarOpen(false);
  };

  const handleCreateRoom = async (data) => {
    setCreating(true);
    try {
      const room = await unrufld.entities.DiscussionRoom.create(data);
      setRooms((prev) => [room, ...prev]);
      setShowCreate(false);
      setActiveRoomId(room.id);
    } catch (e) {
      console.error('Create room failed', e);
    } finally {
      setCreating(false);
    }
  };

  const handleSendMessage = async (content) => {
    if (!activeRoomId) return;
    setPostError('');
    const filtered = filterProfanity(content.trim());
    if (!filtered) return;
    // Client-side rate throttle (fallback for the server-side limit in the
    // communityPost function): 5 posts per 2 min per user.
    const RATE_KEY = 'teewai_community_posts';
    const now = Date.now();
    const recent = JSON.parse(localStorage.getItem(RATE_KEY) || '[]').filter((t) => t > now - 2 * 60 * 1000);
    if (recent.length >= 5) return;
    setSending(true);
    try {
      // Route through the communityPost backend function for both signed-in
      // users and guests: server-side rate limiting, IP ban enforcement, and
      // medical-advice auto-flagging all run server-side. The realtime
      // subscription adds the new message to the list.
      await unrufld.functions.invoke('communityPost', { room_id: activeRoomId, content: filtered });
      localStorage.setItem(RATE_KEY, JSON.stringify([...recent, now]));
    } catch (e) {
      console.error('Send message failed', e);
      setPostError(e?.response?.data?.error || e?.message || 'Could not post your message. If you have been blocked or banned, you can appeal.');
    } finally {
      setSending(false);
    }
  };

  const handleDispute = async (text) => {
    if (!disputeTarget) return;
    setDisputing(true);
    try {
      await unrufld.functions.invoke('communityPost', { op: 'dispute', message_id: disputeTarget.id, dispute_text: text });
      setMessages((prev) => prev.map((m) => m.id === disputeTarget.id ? { ...m, flag_status: 'disputed', dispute_status: 'pending', dispute_text: text } : m));
      setDisputeTarget(null);
    } catch (e) {
      console.error('Dispute failed', e);
    } finally {
      setDisputing(false);
    }
  };

  const handleEdit = async (message, newContent) => {
    const filtered = filterProfanity(newContent.trim());
    if (!filtered) return;
    try {
      const res = await unrufld.functions.invoke('communityPost', { op: 'editMessage', message_id: message.id, content: filtered });
      const updated = res?.data?.message;
      setMessages((prev) => prev.map((m) => m.id === message.id ? (updated || { ...m, content: filtered, edited: true, edited_date: new Date().toISOString() }) : m));
    } catch (e) {
      console.error('Edit failed', e);
    }
  };

  const handleDelete = async (message) => {
    try {
      await unrufld.functions.invoke('communityPost', { op: 'deleteMessage', message_id: message.id });
      setMessages((prev) => prev.filter((m) => m.id !== message.id));
    } catch (e) {
      console.error('Delete failed', e);
    }
  };

  const sidebar = (
    <RoomSidebar
      rooms={visibleRooms}
      activeId={activeRoomId}
      onSelect={selectRoom}
      user={user}
      onCreate={() => { setShowCreate(true); setSidebarOpen(false); }}
      countFor={countFor}
    />
  );

  return (
    <div className="h-[100dvh] flex flex-col bg-background">
      {/* Header */}
      <header className="flex-shrink-0 border-b border-border bg-card/90 backdrop-blur-xl safe-area-inset-top z-30">
        <div className="px-3 sm:px-6 py-3 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <button
              onClick={() => setSidebarOpen(true)}
              className="lg:hidden w-9 h-9 rounded-lg flex items-center justify-center hover:bg-muted transition-colors"
              aria-label="Open rooms"
            >
              <Menu className="w-5 h-5" />
            </button>
            <Link to="/" className="flex items-center gap-2">
              <Logo size={28} className="olo-glow" />
              <span className="font-heading font-700 text-lg tracking-tight">teewai</span>
              <span className="ml-1 text-xs font-medium text-muted-foreground hidden sm:inline">Community</span>
            </Link>
          </div>
          <div className="flex items-center gap-2">
            <BackButton compact label="Back" className="font-medium" />
            <ThemeToggle />
          </div>
        </div>
      </header>

      <div className="flex-1 flex overflow-hidden">
        {/* Desktop sidebar */}
        <aside className="hidden lg:flex w-72 flex-col border-r border-border bg-card/50 flex-shrink-0">
          {sidebar}
        </aside>

        {/* Mobile drawer — slides in from the left */}
        <AnimatePresence>
          {sidebarOpen && (
            <div className="lg:hidden fixed inset-0 z-50 flex">
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                transition={{ duration: 0.2 }}
                className="absolute inset-0 bg-black/50 backdrop-blur-sm"
                onClick={() => setSidebarOpen(false)}
              />
              <motion.div
                initial={{ x: '-100%' }}
                animate={{ x: 0 }}
                exit={{ x: '-100%' }}
                transition={{ type: 'spring', damping: 32, stiffness: 320 }}
                className="relative w-72 max-w-[82vw] bg-card border-r border-border flex flex-col"
              >
                {/* Discord-style drawer header: a back arrow that EXITS the
                    community to Home (the missing "exit"), the brand, and a
                    close button that just shuts the drawer. */}
                <div className="flex items-center gap-2 px-3 py-3 border-b border-border flex-shrink-0">
                  <BackButton compact label="" className="w-8 h-8 rounded-lg justify-center hover:bg-muted shrink-0" />
                  <Link to="/" className="flex items-center gap-2 flex-1 min-w-0">
                    <Logo size={22} className="olo-glow" />
                    <span className="font-heading font-700 text-sm tracking-tight">teewai</span>
                    <span className="text-xs font-medium text-muted-foreground truncate">Community</span>
                  </Link>
                  <button
                    onClick={() => setSidebarOpen(false)}
                    className="w-8 h-8 rounded-lg flex items-center justify-center hover:bg-muted transition-colors flex-shrink-0"
                    aria-label="Close rooms"
                  >
                    <X className="w-4 h-4" />
                  </button>
                </div>
                <div className="flex-1 min-h-0 flex flex-col">{sidebar}</div>
              </motion.div>
            </div>
          )}
        </AnimatePresence>

        {/* Main pane */}
        <main className="flex-1 flex flex-col min-w-0">
          {postError && (
            <div className="flex-shrink-0 px-3 py-2 bg-warning/10 border-b border-warning/20 flex items-center justify-between gap-2">
              <p className="text-xs text-warning truncate">{postError}</p>
              <div className="flex items-center gap-2 flex-shrink-0">
                <button onClick={() => setShowAppeal(true)} className="text-xs font-semibold text-olo hover:underline">Appeal</button>
                <button onClick={() => setPostError('')} className="text-xs text-muted-foreground hover:text-foreground">Dismiss</button>
              </div>
            </div>
          )}
          {loading ? (
            <div className="flex-1 flex items-center justify-center"><Spinner /></div>
          ) : isCommonRoom ? (
            <CommonRoomPanel />
          ) : activeRoom ? (
            <RoomView
              room={activeRoom}
              messages={messages.filter((m) => m.room_id === activeRoomId)}
              user={user}
              sending={sending}
              onBack={() => setSidebarOpen(true)}
              onSend={handleSendMessage}
              onDispute={setDisputeTarget}
              onEdit={handleEdit}
              onDelete={handleDelete}
            />
          ) : (
            <div className="flex-1 flex flex-col items-center justify-center text-center px-6">
              <div className="w-12 h-12 rounded-2xl bg-olo/10 flex items-center justify-center mb-3">
                <MessageCircleOff className="w-5 h-5 text-olo" />
              </div>
              <p className="text-sm font-medium">Select a room</p>
              <p className="text-xs text-muted-foreground mt-1">Pick a room from the sidebar to start chatting.</p>
            </div>
          )}
        </main>
      </div>

      <DisputeModal
        open={!!disputeTarget}
        message={disputeTarget}
        onClose={() => setDisputeTarget(null)}
        onConfirm={handleDispute}
        submitting={disputing}
      />

      <CreateRoomModal
        open={showCreate}
        onClose={() => setShowCreate(false)}
        onCreate={handleCreateRoom}
        creating={creating}
      />

      <AppealForm open={showAppeal} onClose={() => setShowAppeal(false)} blockType="guest_post" reasonShown={postError} />
    </div>
  );
}