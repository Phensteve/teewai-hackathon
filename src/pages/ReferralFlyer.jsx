import { useRef, useState, useMemo } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { Download, ChevronLeft } from 'lucide-react';
import { LOGO_URL } from '@/components/Logo';
import { FLYER_VARIANTS } from '@/components/referral/FlyerVariants';

// Shareable referral flyer with 13 sleek design variants.
// Reads ?code=XXXX&name=username from URL params. The flyer says
// "Sign up & use my code" — no referral-program explanation, just the code.
export default function ReferralFlyer() {
  const flyerRef = useRef(null);
  const [searchParams] = useSearchParams();
  const [downloading, setDownloading] = useState(false);
  const [selectedVariant, setSelectedVariant] = useState(0);

  const code = searchParams.get('code') || '';
  const name = searchParams.get('name') || '';
  const variant = FLYER_VARIANTS[selectedVariant];

  const link = useMemo(() => {
    const origin = typeof window !== 'undefined' ? window.location.origin : 'https://teewai.app';
    return `${origin}/register?ref=${code}`;
  }, [code]);

  const handleDownload = async () => {
    if (!flyerRef.current || downloading) return;
    setDownloading(true);
    try {
      const html2canvas = (await import('html2canvas')).default;
      const canvas = await html2canvas(flyerRef.current, {
        scale: 2,
        useCORS: true,
        logging: false,
      });
      const a = document.createElement('a');
      a.download = `teewai-referral-${code || 'flyer'}.png`;
      a.href = canvas.toDataURL('image/png');
      a.click();
    } catch (e) {
      console.error('Flyer download failed', e);
    } finally {
      setDownloading(false);
    }
  };

  return (
    <div className="min-h-screen bg-background flex flex-col">
      {/* Top bar */}
      <div className="flex items-center justify-between p-4 border-b border-border safe-area-inset-top">
        <Link to="/referrals" className="flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground">
          <ChevronLeft className="w-4 h-4" /> Back
        </Link>
        <p className="text-sm font-medium">Referral Flyer</p>
        <div className="w-12" />
      </div>

      {/* Flyer preview */}
      <div className="flex-1 flex items-center justify-center p-4">
        <div
          ref={flyerRef}
          className="w-full max-w-[320px] aspect-[9/16] rounded-3xl overflow-hidden flex flex-col items-center justify-between p-8"
          style={{ background: variant.bg, color: variant.text }}
        >
          {/* Top: logo */}
          <div className="flex flex-col items-center gap-1.5 pt-2">
            <img src={LOGO_URL} alt="teewai" className="w-11 h-11 rounded-xl object-cover" />
            <p className="text-sm font-semibold tracking-tight" style={{ color: variant.text }}>teewai</p>
          </div>

          {/* Middle: headline + code */}
          <div className="flex-1 flex flex-col items-center justify-center text-center gap-3">
            {name && (
              <p className="text-sm" style={{ color: variant.muted }}>@{name} invited you</p>
            )}
            <h1 className="text-[1.6rem] font-bold leading-tight" style={{ color: variant.text, fontFamily: 'ui-sans-serif, system-ui, sans-serif', letterSpacing: '-0.02em' }}>
              Join me on teewai
            </h1>
            <p className="text-sm" style={{ color: variant.muted }}>Sign up & use my code</p>
            <div className="my-3">
              <p className="text-[3.5rem] font-bold tracking-[0.15em] leading-none" style={{ color: variant.accent, fontFamily: 'ui-sans-serif, system-ui, sans-serif' }}>
                {code || '0000'}
              </p>
            </div>
            <p className="text-[0.7rem] font-medium break-all px-4" style={{ color: variant.muted }}>{link}</p>
          </div>

          {/* Bottom: T&Cs */}
          <div className="w-full pt-3">
            <div className="h-px w-full mb-2.5" style={{ background: variant.hairline }} />
            <p className="text-[10px] text-center" style={{ color: variant.muted }}>T&Cs apply · teewai.app/referral-policy</p>
          </div>
        </div>
      </div>

      {/* Variant picker + download */}
      <div className="border-t border-border p-4 safe-area-inset-bottom">
        <p className="text-xs text-muted-foreground mb-2 text-center">{variant.name} · {selectedVariant + 1} of {FLYER_VARIANTS.length}</p>
        <div className="flex gap-2 overflow-x-auto no-scrollbar mb-4 pb-1">
          {FLYER_VARIANTS.map((v, i) => (
            <button
              key={v.id}
              onClick={() => setSelectedVariant(i)}
              className={`flex-shrink-0 w-11 h-14 rounded-xl border-2 transition-all ${selectedVariant === i ? 'border-olo scale-105' : 'border-transparent opacity-70'}`}
              style={{ background: v.bg }}
              title={v.name}
            >
              <div className="w-full h-full rounded-lg flex items-center justify-center">
                <div className="w-3.5 h-3.5 rounded-full" style={{ background: v.accent }} />
              </div>
            </button>
          ))}
        </div>
        <button
          onClick={handleDownload}
          disabled={downloading}
          className="w-full inline-flex items-center justify-center gap-2 py-3 rounded-xl font-semibold text-sm disabled:opacity-50 bg-olo text-white"
        >
          <Download className="w-4 h-4" />
          {downloading ? 'Saving…' : 'Download PNG'}
        </button>
      </div>
    </div>
  );
}