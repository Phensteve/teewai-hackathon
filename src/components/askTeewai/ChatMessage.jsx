import ReactMarkdown from 'react-markdown';
import { Sparkles } from 'lucide-react';
import ChatImageGallery from '@/components/askTeewai/ChatImageGallery';
import ChatChart from '@/components/askTeewai/ChatChart';
import { tidyBotText } from '@/lib/chatFormat';

export default function ChatMessage({ m }) {
  if (m.role === 'user') {
    return (
      <div className="flex justify-end">
        <div className="max-w-[82%] min-w-0 break-words [overflow-wrap:anywhere] px-3.5 py-2.5 rounded-2xl rounded-br-md bg-olo text-primary-foreground text-sm leading-relaxed whitespace-pre-wrap">
          {m.text}
        </div>
      </div>
    );
  }
  return (
    <div className="flex gap-2.5 min-w-0">
      <div className="w-7 h-7 rounded-lg bg-olo/10 flex items-center justify-center flex-shrink-0 mt-0.5">
        <Sparkles className="w-3.5 h-3.5 text-olo" />
      </div>
      <div className="flex-1 min-w-0 overflow-hidden">
        {m.chart && <ChatChart {...m.chart} />}
        <div className="text-sm leading-relaxed text-foreground break-words [overflow-wrap:anywhere] mt-1 [&_p]:mb-2 [&_p:last-child]:mb-0 [&_ul]:list-disc [&_ul]:pl-5 [&_ul]:mb-2 [&_ol]:list-decimal [&_ol]:pl-5 [&_li]:mb-1 [&_strong]:font-semibold">
          <ReactMarkdown>{tidyBotText(m.text)}</ReactMarkdown>
          {m.streaming && <span className="inline-block w-1.5 h-4 bg-olo ml-0.5 align-text-bottom rounded-sm animate-pulse" />}
        </div>
        {m.images?.length > 0 && <ChatImageGallery images={m.images} />}
      </div>
    </div>
  );
}