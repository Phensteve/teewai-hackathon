import { useMemo, useRef, useState, useEffect } from 'react';
import { Send, Loader2, Bot, User, MessageSquare } from 'lucide-react';
import { unrufld } from '@/api/unrufldClient';
import { sanitizeForPrompt, wrapUntrusted, SYSTEM_GUARD } from '@/lib/promptGuard';

// Context-aware support assistant. Grounds every answer in the Help Center
// FAQ (passed in as `faq`), so it never invents teewai policy. Questions outside
// the FAQ are routed to Customer Service instead of guessed at.
//
// Uses the default (automatic) LLM — the FAQ is small, so no need for a heavier
// model. The JSON schema returns a structured { answer, suggest_contact } so the
// UI can show a "Contact us" shortcut when the assistant can't help.

const SUGGESTIONS = [
  'How do I take my first scan?',
  'What plans are available?',
  'Is my photo private?',
  'I paid but my scans didn’t appear',
];

function buildFaqContext(faq) {
  if (!Array.isArray(faq)) return '';
  return faq
    .map((c) => `## ${c.label}\n` + c.items.map((it) => `Q: ${it.q}\nA: ${it.a}`).join('\n'))
    .join('\n\n');
}

export default function HelpChat({ faq }) {
  const [messages, setMessages] = useState([
    { role: 'bot', text: "Hi! I'm teewai's help assistant. Ask me anything about scans, plans, or your account." },
  ]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [suggestContact, setSuggestContact] = useState(false);
  const scrollRef = useRef(null);
  const faqContext = useMemo(() => buildFaqContext(faq), [faq]);

  useEffect(() => {
    const el = scrollRef.current;
    if (el) el.scrollTop = el.scrollHeight;
  }, [messages, loading]);

  const send = async (text) => {
    const q = (text ?? input).trim();
    if (!q || loading) return;
    setInput('');
    setMessages((m) => [...m, { role: 'user', text: q }]);
    setLoading(true);
    setSuggestContact(false);
    try {
      const safeQ = sanitizeForPrompt(q, 500);
      const res = await unrufld.integrations.Core.InvokeLLM({
        prompt:
          SYSTEM_GUARD +
          `You are teewai's friendly, concise support assistant — a dental wellness app. ` +
          `Answer the user's question using ONLY the FAQ context below. Keep answers under 60 words, warm and clear. ` +
          `If the question is not covered by the FAQ (e.g. specific account/billing issues, bugs, or anything you can't verify), ` +
          `set suggest_contact=true and answer briefly that you can't confirm it here and they should contact Customer Service.\n\n` +
          `FAQ CONTEXT:\n${faqContext}\n\n` +
          wrapUntrusted(safeQ, 'user question'),
        response_json_schema: {
          type: 'object',
          properties: {
            answer: { type: 'string' },
            suggest_contact: { type: 'boolean' },
          },
        },
      });
      const answer = res?.answer || "I'm not sure about that — our Customer Service team can help.";
      setMessages((m) => [...m, { role: 'bot', text: answer }]);
      setSuggestContact(!!res?.suggest_contact);
    } catch {
      setMessages((m) => [...m, { role: 'bot', text: "Sorry, I couldn't reach the assistant just now. Please try again or contact Customer Service." }]);
      setSuggestContact(true);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="rounded-3xl border border-border bg-card overflow-hidden flex flex-col" style={{ height: 460 }}>
      {/* Header */}
      <div className="flex items-center gap-2 px-5 py-3.5 border-b border-border bg-olo-deep text-white">
        <div className="w-8 h-8 rounded-xl bg-olo flex items-center justify-center olo-glow">
          <Bot className="w-4 h-4" />
        </div>
        <div>
          <p className="font-heading font-700 text-sm leading-tight">teewai assistant</p>
          <p className="text-[11px] text-white/60 leading-tight">Answers from our help docs</p>
        </div>
      </div>

      {/* Messages */}
      <div ref={scrollRef} className="flex-1 overflow-y-auto p-4 space-y-3 no-scrollbar">
        {messages.map((m, i) => (
          <div key={i} className={`flex gap-2.5 ${m.role === 'user' ? 'flex-row-reverse' : ''}`}>
            <div className={`w-7 h-7 rounded-lg flex items-center justify-center flex-shrink-0 ${m.role === 'user' ? 'bg-muted' : 'bg-olo/10'}`}>
              {m.role === 'user' ? <User className="w-3.5 h-3.5 text-muted-foreground" /> : <Bot className="w-3.5 h-3.5 text-olo" />}
            </div>
            <div className={`max-w-[78%] px-3.5 py-2.5 rounded-2xl text-sm leading-relaxed ${m.role === 'user' ? 'bg-olo text-white rounded-tr-sm' : 'bg-muted text-foreground rounded-tl-sm'}`}>
              {m.text}
            </div>
          </div>
        ))}
        {loading && (
          <div className="flex gap-2.5">
            <div className="w-7 h-7 rounded-lg bg-olo/10 flex items-center justify-center flex-shrink-0">
              <Bot className="w-3.5 h-3.5 text-olo" />
            </div>
            <div className="px-4 py-3 rounded-2xl rounded-tl-sm bg-muted">
              <Loader2 className="w-4 h-4 text-olo animate-spin" />
            </div>
          </div>
        )}
        {suggestContact && (
          <a
            href="/support"
            className="inline-flex items-center gap-1.5 text-xs font-medium text-olo hover:underline ml-9"
          >
            <MessageSquare className="w-3.5 h-3.5" /> Contact Customer Service
          </a>
        )}
      </div>

      {/* Quick suggestions (only before first user question) */}
      {messages.length <= 1 && !loading && (
        <div className="px-4 pb-2 flex flex-wrap gap-1.5">
          {SUGGESTIONS.map((s) => (
            <button
              key={s}
              onClick={() => send(s)}
              className="text-[11px] font-medium px-2.5 py-1.5 rounded-full border border-border bg-background hover:border-olo/40 hover:text-olo transition-colors"
            >
              {s}
            </button>
          ))}
        </div>
      )}

      {/* Input */}
      <div className="p-3 border-t border-border">
        <div className="flex items-center gap-2">
          <input
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => { if (e.key === 'Enter') send(); }}
            placeholder="Ask a question…"
            disabled={loading}
            className="flex-1 px-4 py-2.5 rounded-xl border border-border bg-background text-sm focus:outline-none focus:border-olo disabled:opacity-50"
          />
          <button
            onClick={() => send()}
            disabled={loading || !input.trim()}
            className="w-10 h-10 rounded-xl bg-olo text-white flex items-center justify-center hover:opacity-90 transition-opacity disabled:opacity-40 flex-shrink-0"
            aria-label="Send"
          >
            <Send className="w-4 h-4" />
          </button>
        </div>
      </div>
    </div>
  );
}