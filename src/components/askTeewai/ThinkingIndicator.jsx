import { useState, useEffect } from 'react';

// Claude-style thinking indicator — three pulsing dots + a rotating word
// that cycles every 2s with a soft fade. Minimal, calm, premium.
const WORDS = ['Thinking', 'Considering', 'Analyzing', 'Reflecting', 'Pondering'];

export default function ThinkingIndicator() {
  const [idx, setIdx] = useState(0);

  useEffect(() => {
    const interval = setInterval(() => {
      setIdx((i) => (i + 1) % WORDS.length);
    }, 2000);
    return () => clearInterval(interval);
  }, []);

  return (
    <div className="flex items-center gap-2.5 px-4 py-3">
      <div className="flex gap-1 items-center">
        <span className="w-2 h-2 rounded-full bg-olo thinking-dot" style={{ animationDelay: '0ms' }} />
        <span className="w-2 h-2 rounded-full bg-olo thinking-dot" style={{ animationDelay: '180ms' }} />
        <span className="w-2 h-2 rounded-full bg-olo thinking-dot" style={{ animationDelay: '360ms' }} />
      </div>
      <span key={idx} className="text-sm text-muted-foreground thinking-word">
        {WORDS[idx]}…
      </span>
    </div>
  );
}