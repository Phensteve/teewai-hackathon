import { useRef, useState } from 'react';
import { Share2, Download } from 'lucide-react';
import { LOGO_URL } from '@/components/Logo';
import ShareSheet from '@/components/ShareSheet';

// Card uses inline styles + solid colors so html2canvas renders it faithfully
// (no backdrop-filter / text-shadow / blur(), which html2canvas can't capture).
const cardBg = '#04181c';
const olo = '#00d9c0';
const healthColor = '#34d399';

export default function BragCard({ score, shade, shadeCode, healthScore }) {
  const cardRef = useRef(null);
  const [downloading, setDownloading] = useState(false);
  const [shareFile, setShareFile] = useState(null);

  const bragText = `My teewai smile score is ${score ?? '—'}/100 — Shade ${shade || '—'}${shadeCode ? ` (${shadeCode})` : ''} · Dental health ${healthScore ?? '—'}/100. On my way to a perfect smile! ✨ #teewai`;

  const generateBlob = async () => {
    if (!cardRef.current) return null;
    const { default: html2canvas } = await import('html2canvas');
    const canvas = await html2canvas(cardRef.current, {
      backgroundColor: cardBg,
      scale: 3,
      useCORS: true,
      logging: false,
    });
    return new Promise((resolve) => canvas.toBlob(resolve, 'image/png'));
  };

  const download = async () => {
    setDownloading(true);
    try {
      const blob = await generateBlob();
      if (!blob) return;
      const link = document.createElement('a');
      link.download = 'teewai-smile.png';
      link.href = URL.createObjectURL(blob);
      link.click();
      setTimeout(() => URL.revokeObjectURL(link.href), 1000);
    } catch {} finally {
      setDownloading(false);
    }
  };

  const share = async () => {
    try {
      const blob = await generateBlob();
      if (!blob) return;
      const file = new File([blob], 'teewai-smile.png', { type: 'image/png' });
      setShareFile(file);
    } catch {}
  };

  const today = new Date().toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' });

  return (
    <div>
      <div
        ref={cardRef}
        style={{
          backgroundColor: cardBg,
          backgroundImage:
            'radial-gradient(circle at 80% 0%, rgba(0,217,192,0.28), transparent 55%), radial-gradient(circle at 0% 100%, rgba(0,217,192,0.12), transparent 50%)',
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
          <span style={{ fontSize: 11, color: 'rgba(255,255,255,0.45)', letterSpacing: 1, textTransform: 'uppercase' }}>
            Smile report
          </span>
        </div>

        {/* Middle: whiteness score */}
        <div style={{ textAlign: 'center' }}>
          <div style={{ fontSize: 11, color: 'rgba(255,255,255,0.5)', letterSpacing: 2, textTransform: 'uppercase', marginBottom: 8 }}>
            Whiteness score
          </div>
          {/* Fixed-height box keeps the big number from overlapping "out of 100" in the export */}
          <div style={{ height: 104, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <span style={{ fontSize: 88, fontWeight: 800, color: olo, lineHeight: 1, fontFamily: 'Sora, Inter, sans-serif' }}>
              {score ?? '—'}
            </span>
          </div>
          <div style={{ fontSize: 13, color: 'rgba(255,255,255,0.4)', marginTop: 16 }}>out of 100</div>
        </div>

        {/* Stats row: Shade + Dental health */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <div style={{ flex: 1, textAlign: 'center' }}>
            <div style={{ fontSize: 10, color: 'rgba(255,255,255,0.5)', letterSpacing: 1, textTransform: 'uppercase', marginBottom: 5 }}>
              Shade
            </div>
            <div style={{ fontSize: 17, fontWeight: 700, color: olo, fontFamily: 'Sora, Inter, sans-serif' }}>
              {shadeCode || shade || '—'}
            </div>
          </div>
          <div style={{ width: 1, height: 34, backgroundColor: 'rgba(255,255,255,0.12)' }} />
          <div style={{ flex: 1, textAlign: 'center' }}>
            <div style={{ fontSize: 10, color: 'rgba(255,255,255,0.5)', letterSpacing: 1, textTransform: 'uppercase', marginBottom: 5 }}>
              Dental health
            </div>
            <div style={{ fontSize: 17, fontWeight: 700, color: healthColor, fontFamily: 'Sora, Inter, sans-serif' }}>
              {healthScore != null ? `${healthScore}/100` : '—'}
            </div>
          </div>
        </div>

        {/* Bottom: tagline + date */}
        <div style={{ textAlign: 'center' }}>
          <div style={{ fontSize: 14, color: 'rgba(255,255,255,0.7)', fontStyle: 'italic' }}>
            "On my way to a perfect smile with teewai"
          </div>
          <div style={{ fontSize: 11, color: 'rgba(255,255,255,0.35)', marginTop: 8 }}>{today}</div>
        </div>
      </div>

      <div className="flex flex-row items-center gap-2 mt-4 max-w-[380px] mx-auto">
        <button
          onClick={share}
          className="flex-1 min-w-0 inline-flex items-center justify-center gap-1.5 bg-olo text-white font-semibold text-xs px-3 py-2 rounded-lg hover:opacity-90 transition-opacity"
        >
          <Share2 className="w-3.5 h-3.5 shrink-0" /> Share
        </button>
        <button
          onClick={download}
          disabled={downloading}
          className="flex-1 min-w-0 inline-flex items-center justify-center gap-1.5 bg-olo/10 text-olo font-medium text-xs px-3 py-2 rounded-lg hover:bg-olo/20 transition-colors disabled:opacity-50"
        >
          <Download className="w-3.5 h-3.5 shrink-0" /> Save
        </button>
      </div>

      {shareFile && (
        <ShareSheet
          file={shareFile}
          fileName="teewai-smile.png"
          caption={bragText}
          onClose={() => setShareFile(null)}
        />
      )}
    </div>
  );
}