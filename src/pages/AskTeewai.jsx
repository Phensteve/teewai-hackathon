import { useRef, useState, useEffect } from 'react';
import { Sparkles } from 'lucide-react';
import ChatMessage from '@/components/askTeewai/ChatMessage';
import ChatComposer from '@/components/askTeewai/ChatComposer';
import { detectChartIntent } from '@/lib/chatFormat';
import { unrufld } from '@/api/unrufldClient';
import { appParams } from '@/lib/app-params';
import { sanitizeForPrompt, validateLlmOutput } from '@/lib/promptGuard';
import { useAuth } from '@/lib/AuthContext';
import ThinkingIndicator from '@/components/askTeewai/ThinkingIndicator';
import ChatImageGallery from '@/components/askTeewai/ChatImageGallery';

// Ask teewai — a personalized dental-knowledge Q&A backed by Backboard.io.
// The backend function (askTeewai) reads the user's scan history from InsForge,
// builds the system prompt with security rules + scan context, and calls the
// Backboard API which provides persistent conversation memory via threads.
// Conversations are stored server-side in Backboard (not localStorage) for
// privacy — only the thread_id is stored locally. On mount, the frontend
// loads the previous conversation from Backboard via the backend's load mode.
// Input is sanitized client-side (defense in depth) and the output is
// validated before showing it to the user.
//
// The backend also returns the user's scan/food photo URLs as structured
// data (never in the LLM text — security rule). The frontend renders them
// as a horizontal gallery below the bot's text via the scanPhoto proxy.

const SUGGESTIONS = [
  'Show a graph of my whiteness over the last 30 days',
  'Compare my teeth today to last week',
  'How were my teeth 2 days ago?',
  'Why are my teeth yellow?',
  'Does coffee really stain teeth?',
  'Is bleeding gums normal?',
];

export default function AskTeewai() {
  const { user } = useAuth();
  const threadKey = user?.id ? `teewai_ask_thread_${user.id}` : null;
  const displayName = user?.display_name || user?.username || user?.full_name;

  const greeting = {
    role: 'bot',
    text: displayName
      ? `Hi ${displayName}, I'm Ask teewai. Ask me anything about your teeth, gums, or daily care. I can see your scan history, so feel free to ask me to compare your scans or about your scores and stains. Remember I can't diagnose — see a dentist for anything specific.`
      : "Hi, I'm Ask teewai. Ask me anything about your teeth, gums, or daily care. I can see your scan history, so feel free to ask me to compare your scans or about your scores and stains. Remember I can't diagnose — see a dentist for anything specific.",
  };

  const [messages, setMessages] = useState([greeting]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [threadId, setThreadId] = useState(() => {
    if (!threadKey) return null;
    try { return localStorage.getItem(threadKey) || null; } catch { return null; }
  });
  const [historyLoaded, setHistoryLoaded] = useState(!threadId);
  const scrollRef = useRef(null);

  useEffect(() => {
    const el = scrollRef.current;
    if (el) el.scrollTop = el.scrollHeight;
  }, [messages, loading]);

  // Persist thread_id per user. Only the thread ID is stored locally — the
  // actual conversation content lives server-side in Backboard.io for privacy.
  useEffect(() => {
    if (threadKey && threadId) {
      try { localStorage.setItem(threadKey, threadId); } catch { /* */ }
    }
  }, [threadKey, threadId]);

  // Load conversation history from Backboard on mount so the user sees their
  // previous messages. The conversation is stored server-side, not in localStorage.
  useEffect(() => {
    if (!threadId) { setHistoryLoaded(true); return; }
    let cancelled = false;
    (async () => {
      try {
        const res = await unrufld.functions.invoke('askTeewai', { load: true, thread_id: threadId });
        if (cancelled) return;
        const history = res?.data?.messages || [];
        if (history.length > 0) setMessages([...history]);
      } catch { /* */ }
      if (!cancelled) setHistoryLoaded(true);
    })();
    return () => { cancelled = true; };
  }, [threadId]);

  const send = async (text) => {
    const q = (text ?? input).trim();
    if (!q || loading) return;
    setInput('');
    const chart = detectChartIntent(q);
    setMessages((m) => [...m, { role: 'user', text: q }, ...(chart ? [{ role: 'bot', text: '', chart }] : [])]);
    setLoading(true);
    try {
      const safeQ = sanitizeForPrompt(q, 500);
      const FALLBACK = "I can only help with general dental questions about your teeth, gums, or daily care. Could you ask about one of those?";

      // Try streaming first — the user sees the first token in ~500ms instead
      // of waiting 3-6s for the full response. The backend pipes SSE from
      // Backboard.io; soft validation (URL stripping) is applied per-chunk
      // server-side, and full validation (hard block patterns) is applied
      // on the accumulated text once the stream ends.
      let streamOk = false;
      try {
        const token = localStorage.getItem('unrufld_access_token');
        const res = await fetch(`/api/apps/${appParams.appId}/functions/askTeewai`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            ...(token ? { Authorization: `Bearer ${token}` } : {}),
          },
          body: JSON.stringify({ message: safeQ, thread_id: threadId, stream: true }),
        });

        if (res.ok && (res.headers.get('content-type') || '').includes('text/event-stream')) {
          streamOk = true;
          const reader = res.body.getReader();
          const decoder = new TextDecoder();
          let buffer = '';
          let fullText = '';
          let newThreadId = null;
          let streamImages = null;

          // Store images on the streaming bot message so the gallery renders
          // below the text once content starts arriving.
          const setStreamImages = (imgs) => {
            streamImages = imgs;
            setMessages((m) => {
              const last = m[m.length - 1];
              if (last?.role === 'bot' && last.streaming) {
                return [...m.slice(0, -1), { ...last, images: imgs }];
              }
              return [...m, { role: 'bot', text: '', streaming: true, images: imgs }];
            });
          };

          const appendChunk = (chunk) => {
            fullText += chunk;
            setMessages((m) => {
              const last = m[m.length - 1];
              if (last?.role === 'bot' && last.streaming) {
                return [...m.slice(0, -1), { ...last, text: fullText }];
              }
              return [...m, { role: 'bot', text: fullText, streaming: true, images: streamImages }];
            });
            setLoading(false);
          };

          while (true) {
            const { done, value } = await reader.read();
            if (done) break;
            buffer += decoder.decode(value, { stream: true });
            const lines = buffer.split('\n');
            buffer = lines.pop() || '';
            for (const line of lines) {
              if (!line.startsWith('data: ')) continue;
              try {
                const event = JSON.parse(line.slice(6));
                if (event.type === 'images') setStreamImages(event.images || []);
                else if (event.type === 'content') appendChunk(event.content || '');
                else if (event.type === 'done') newThreadId = event.thread_id;
              } catch { /* ignore malformed SSE */ }
            }
          }

          // Finalize: full validation on the complete text, remove streaming flag.
          const { text: validated } = validateLlmOutput(fullText, { fallback: FALLBACK });
          if (newThreadId) setThreadId(newThreadId);
          setMessages((m) => {
            const last = m[m.length - 1];
            if (last?.role === 'bot' && last.streaming) {
              return [...m.slice(0, -1), { role: 'bot', text: validated || "I couldn't put that together just now — please try again.", images: streamImages }];
            }
            return [...m, { role: 'bot', text: validated || "I couldn't put that together just now — please try again.", images: streamImages }];
          });
        }
      } catch { /* fall through to non-streaming */ }

      // Fallback: non-streaming via SDK (if streaming unavailable or failed).
      if (!streamOk) {
        const res = await unrufld.functions.invoke('askTeewai', {
          message: safeQ,
          thread_id: threadId,
        });
        const raw = res?.data?.content || '';
        const { text: answer } = validateLlmOutput(raw, { fallback: FALLBACK });
        if (res?.data?.thread_id) setThreadId(res.data.thread_id);
        const imgs = res?.data?.images || null;
        setMessages((m) => [
          ...m,
          { role: 'bot', text: answer || "I couldn't put that together just now — please try again.", images: imgs },
        ]);
      }
    } catch {
      setMessages((m) => [
        ...m,
        {
          role: 'bot',
          text: "Sorry, I couldn't reach the assistant right now. Please try again in a moment.",
        },
      ]);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="chat-fill flex flex-col">
      {/* Header — compact, Sora-style sparkle icon */}
      <div className="px-4 sm:px-6 pt-1.5 pb-1.5">
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-xl bg-olo flex items-center justify-center flex-shrink-0">
            <Sparkles className="w-4 h-4 text-white" />
          </div>
          <h1 className="text-h4">Ask teewai</h1>
        </div>
      </div>

      {/* Messages */}
      <div
        ref={scrollRef}
        className="flex-1 overflow-y-auto overflow-x-hidden px-4 sm:px-6 py-3 space-y-5 no-scrollbar min-h-0"
      >
        {!historyLoaded && (
          <div className="flex items-center justify-center py-8">
            <ThinkingIndicator />
          </div>
        )}
        {historyLoaded && messages.map((m, i) => <ChatMessage key={i} m={m} />)}
        {loading && (
          <div className="pl-9"><ThinkingIndicator /></div>
        )}
      </div>

      {/* Quick suggestions — compact chips */}
      {messages.length <= 1 && !loading && (
        <div className="px-4 sm:px-6 pb-1.5 flex flex-wrap gap-1.5">
          {SUGGESTIONS.map((s) => (
            <button
              key={s}
              onClick={() => send(s)}
              className="text-[11px] font-medium px-2.5 py-1.5 rounded-full border border-border bg-card hover:border-olo/40 hover:text-olo transition-colors"
            >
              {s}
            </button>
          ))}
        </div>
      )}

      <ChatComposer value={input} onChange={setInput} onSend={() => send()} disabled={loading} />
    </div>
  );
}