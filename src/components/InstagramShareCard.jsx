import { useRef, useState } from 'react';
import { Instagram, Copy, Check } from 'lucide-react';
import { getRank } from '@/lib/gamification';
import { LOGO_URL } from '@/components/Logo';
import ShareSheet from '@/components/ShareSheet';

// Instagram share — lets a user post their smile rank (and latest milestone)
// to Instagram. Renders an html2canvas-friendly branded card, then shares it
// as an image file via the Web Share API (mobile → the native sheet lists
// Instagram → post to story/feed). On desktop (no file sharing) it downloads
// the image and opens Instagram for a manual upload. Pure client-side — no
// backend, no Instagram Graph API, no connector required.
const cardBg = '#04181c';
const olo = '#00d9c0';

export default function InstagramShareCard({ mmr, milestone, userName }) {
  const cardRef = useRef(null);
  const [copied, setCopied] = useState(false);
  const [busy, setBusy] = useState(false);
  const [shareFile, setShareFile] = useState(null);

  const { rank, tier, next, progress } = getRank(mmr || 0);

  const caption = milestone
    ? `Just hit ${rank.name} ${tier} on teewai and unlocked "${milestone}"! 🦷✨ ${mmr} MMR and climbing. Track your smile with me at teewai.app #teewai #smilejourney #teethwhitening`
    : `Just ranked up to ${rank.name} ${tier} on teewai! 🦷✨ ${mmr} MMR and counting. Track your smile with me at teewai.app #teewai #smilejourney #teethwhitening`;

  const shareToInstagram = async () => {
    if (!cardRef.current) return;
    setBusy(true);
    try {
      const { default: html2canvas } = await import('html2canvas');
      const canvas = await html2canvas(cardRef.current, {
        backgroundColor: cardBg,
        scale: 3,
        useCORS: true,
        logging: false,
      });
      canvas.toBlob((blob) => {
        if (!blob) { setBusy(false); return; }
        const file = new File([blob], 'teewai-rank.png', { type: 'image/png' });
        setShareFile(file);
        setBusy(false);
      }, 'image/png');
    } catch {
      setBusy(false);
    }
  };

  const copyCaption = async () => {
    try {
      await navigator.clipboard.writeText(caption);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {}
  };

  const today = new Date().toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' });

  return (
    <div className="p-5 rounded-3xl border border-border bg-card frost-edge">
      <div className="flex items-center gap-2 mb-4">
        <Instagram className="w-5 h-5 text-olo" />
        <h3 className="font-heading font-600 text-lg">Share to Instagram</h3>
      </div>

      <div
        ref={cardRef}
        style={{
          backgroundColor: cardBg,
          backgroundImage: `radial-gradient(circle at 80% 0%, ${rank.color}33, transparent 55%), radial-gradient(circle at 0% 100%, rgba(0,217,192,0.12), transparent 50%)`,
          borderRadius: 28,
          padding: 32,
          color: '#ffffff',
          position: 'relative',
          overflow: 'hidden',
          fontFamily: 'Inter, ui-sans-serif, system-ui, sans-serif',
          width: '100%',
          maxWidth: 380,
          height: 470,
          margin: '0 auto',
          display: 'flex',
          flexDirection: 'column',
          justifyContent: 'space-between',
        }}
      >
        {/* Top: brand */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <img src={LOGO_URL} alt="teewai" crossOrigin="anonymous" style={{ width: 28, height: 28, borderRadius: 8, display: 'block' }} />
            <span style={{ fontSize: 13, fontWeight: 600, color: 'rgba(255,255,255,0.85)', letterSpacing: 0.3, lineHeight: '28px' }}>teewai</span>
          </div>
          <span style={{ fontSize: 11, color: 'rgba(255,255,255,0.45)', letterSpacing: 1, textTransform: 'uppercase' }}>Smile rank</span>
        </div>

        {/* Middle: rank emblem + name */}
        <div style={{ textAlign: 'center' }}>
          <div style={{ fontSize: 64, lineHeight: 1, marginBottom: 10 }}>{rank.icon}</div>
          <div style={{ fontSize: 11, color: 'rgba(255,255,255,0.5)', letterSpacing: 2, textTransform: 'uppercase', marginBottom: 6 }}>
            {userName ? `${userName} · rank` : 'Rank'}
          </div>
          <div style={{ fontSize: 36, fontWeight: 800, color: rank.color, lineHeight: 1.1, fontFamily: 'Sora, Inter, sans-serif' }}>
            {rank.name} {tier}
          </div>
          <div style={{ fontSize: 15, color: 'rgba(255,255,255,0.6)', marginTop: 6 }}>{mmr} MMR</div>
        </div>

        {/* Milestone badge or progress to next rank */}
        {milestone ? (
          <div style={{ textAlign: 'center', padding: '10px 16px', borderRadius: 12, background: 'rgba(0,217,192,0.12)', border: '1px solid rgba(0,217,192,0.3)' }}>
            <div style={{ fontSize: 12, color: olo, fontWeight: 600 }}>🏆 Milestone unlocked</div>
            <div style={{ fontSize: 14, color: '#ffffff', marginTop: 2 }}>{milestone}</div>
          </div>
        ) : next ? (
          <div>
            <div style={{ height: 8, borderRadius: 999, background: 'rgba(255,255,255,0.12)', overflow: 'hidden' }}>
              <div style={{ width: `${progress}%`, height: '100%', borderRadius: 999, background: rank.color }} />
            </div>
            <div style={{ fontSize: 12, color: 'rgba(255,255,255,0.5)', textAlign: 'center', marginTop: 6 }}>
              {next.min - mmr} MMR to {next.name}
            </div>
          </div>
        ) : null}

        {/* Bottom: tagline + date */}
        <div style={{ textAlign: 'center' }}>
          <div style={{ fontSize: 14, color: 'rgba(255,255,255,0.7)', fontStyle: 'italic' }}>
            "Climbing the smile ladder with teewai"
          </div>
          <div style={{ fontSize: 11, color: 'rgba(255,255,255,0.35)', marginTop: 8 }}>{today}</div>
        </div>
      </div>

      {/* Actions */}
      <div className="flex flex-col gap-2 mt-4 max-w-[380px] mx-auto">
        <button
          onClick={shareToInstagram}
          disabled={busy}
          className="w-full inline-flex items-center justify-center gap-2 font-semibold text-sm px-4 py-3 rounded-xl text-white disabled:opacity-60 transition-transform hover:scale-[1.02]"
          style={{ background: 'linear-gradient(90deg, #f58529, #dd2a7b, #8134af)' }}
        >
          <Instagram className="w-4 h-4" /> {busy ? 'Preparing…' : 'Share to Instagram'}
        </button>
        <button
          onClick={copyCaption}
          className="w-full inline-flex items-center justify-center gap-1.5 border border-border font-medium text-xs px-3 py-2.5 rounded-lg hover:bg-muted/50 transition-colors"
        >
          {copied ? <><Check className="w-3.5 h-3.5 text-olo" /> Caption copied</> : <><Copy className="w-3.5 h-3.5" /> Copy caption</>}
        </button>
        <p className="text-[11px] text-muted-foreground text-center leading-relaxed">
          Tap share, then pick Instagram to post to your story or feed.
        </p>
      </div>

      {shareFile && (
        <ShareSheet
          file={shareFile}
          fileName="teewai-rank.png"
          caption={caption}
          onClose={() => setShareFile(null)}
        />
      )}
    </div>
  );
}