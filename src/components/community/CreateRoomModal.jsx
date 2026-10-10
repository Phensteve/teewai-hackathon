import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, MessageCircle, Lightbulb, MessageSquare, HelpCircle, Megaphone, Plus } from 'lucide-react';

const CATEGORIES = [
  { key: 'general', label: 'General', icon: MessageCircle, color: 'text-olo' },
  { key: 'suggestions', label: 'Suggestions', icon: Lightbulb, color: 'text-amber-500' },
  { key: 'feedback', label: 'Feedback', icon: MessageSquare, color: 'text-blue-500' },
  { key: 'support', label: 'Support', icon: HelpCircle, color: 'text-purple-500' },
  { key: 'announcements', label: 'Announcements', icon: Megaphone, color: 'text-rose-500' },
];

export default function CreateRoomModal({ open, onClose, onCreate, creating }) {
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [category, setCategory] = useState('general');

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!name.trim() || creating) return;
    onCreate({ name: name.trim(), description: description.trim(), category });
    setName('');
    setDescription('');
    setCategory('general');
  };

  return (
    <AnimatePresence>
      {open && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4 bg-black/50 backdrop-blur-sm"
          onClick={onClose}
        >
          <motion.div
            initial={{ y: 40, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            exit={{ y: 40, opacity: 0 }}
            transition={{ duration: 0.28, ease: [0.16, 1, 0.3, 1] }}
            onClick={(e) => e.stopPropagation()}
            className="w-full sm:max-w-md bg-card rounded-t-3xl sm:rounded-3xl border border-border shadow-2xl overflow-hidden"
          >
            <div className="flex items-center justify-between px-5 py-3.5 border-b border-border">
              <h2 className="font-heading font-700 text-base">New room</h2>
              <button onClick={onClose} className="w-8 h-8 rounded-lg flex items-center justify-center hover:bg-muted transition-colors">
                <X className="w-4 h-4" />
              </button>
            </div>
            <form onSubmit={handleSubmit} className="p-5 space-y-4">
              <div>
                <label className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wide">Room name</label>
                <input
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="e.g. Whitening tips & tricks"
                  maxLength={80}
                  autoFocus
                  className="mt-1.5 w-full rounded-xl border border-border bg-background px-3.5 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-olo/40"
                />
              </div>
              <div>
                <label className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wide">Description</label>
                <textarea
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder="What's this room about?"
                  maxLength={500}
                  rows={2}
                  className="mt-1.5 w-full resize-none rounded-xl border border-border bg-background px-3.5 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-olo/40"
                />
              </div>
              <div>
                <label className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wide">Category</label>
                <div className="mt-1.5 grid grid-cols-3 gap-2">
                  {CATEGORIES.map((c) => {
                    const Icon = c.icon;
                    const active = category === c.key;
                    return (
                      <button
                        key={c.key}
                        type="button"
                        onClick={() => setCategory(c.key)}
                        className={`flex flex-col items-center gap-1 rounded-xl border px-2 py-2.5 transition-all ${
                          active ? 'border-olo bg-olo/10' : 'border-border hover:bg-muted/50'
                        }`}
                      >
                        <Icon className={`w-4 h-4 ${active ? c.color : 'text-muted-foreground'}`} />
                        <span className={`text-[10px] font-medium ${active ? 'text-olo' : 'text-muted-foreground'}`}>{c.label}</span>
                      </button>
                    );
                  })}
                </div>
              </div>
              <button
                type="submit"
                disabled={!name.trim() || creating}
                className="w-full bg-olo text-white font-semibold text-sm py-3 rounded-xl disabled:opacity-40 hover:opacity-90 transition-all flex items-center justify-center gap-2 olo-glow"
              >
                <Plus className="w-4 h-4" /> Create room
              </button>
            </form>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}