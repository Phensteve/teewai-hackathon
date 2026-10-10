import { useState } from 'react';
import { Check, Play, X } from 'lucide-react';

const BRACES_VIDEO = 'https://media.base44.com/videos/public/6a6611b97d7894c19d798137/7b8e5e80c_Brushing_with_braces.mp4';
const RETAINER_VIDEO = 'https://media.base44.com/videos/public/6a6611b97d7894c19d798137/6a91de9e4_Brushing_with_retainers.mp4';

const ADVICE = {
  general: {
    title: 'How to brush properly',
    steps: [
      'Use a soft-bristled brush and fluoride toothpaste.',
      'Hold the brush at a 45-degree angle to your gums.',
      'Brush gently in short circular motions for 2 minutes, twice daily.',
      'Clean the outer, inner, and chewing surfaces of every tooth.',
      'Brush your tongue to remove bacteria and freshen breath.',
      'Floss daily — brushing alone misses 40% of tooth surfaces.',
    ],
  },
  braces: {
    title: 'Brushing with braces',
    steps: [
      'Use a soft-bristled brush or an orthodontic (V-shaped) brush designed for braces.',
      'Brush at a 45-degree angle above and below the brackets to clean the gumline.',
      'Clean the top and bottom of each bracket individually with small circular motions.',
      'Use an interdental brush to sweep under the archwire and between brackets.',
      'Thread floss under the wire with a floss threader to clean between teeth.',
      'Rinse with water or a fluoride mouthwash to flush out loosened debris.',
      'Avoid hard, sticky, and crunchy foods that can break brackets.',
    ],
  },
  retainer: {
    title: 'Brushing with a retainer',
    steps: [
      'Remove your retainer before brushing your teeth.',
      'Brush your teeth thoroughly for 2 minutes with a soft brush and fluoride toothpaste.',
      'Gently brush your retainer with a soft toothbrush and mild soap (not toothpaste — it can scratch clear plastic).',
      'Rinse the retainer under lukewarm water — never hot, which can warp it.',
      'Soak it daily in a retainer cleaner or a mild denture solution to kill bacteria.',
      'Store it in its case when not wearing it — never wrap it in a napkin.',
      'Wear it exactly as your orthodontist prescribed to keep your teeth from shifting.',
    ],
  },
};

const APPLIANCE_LABELS = {
  metal_braces: 'Metal braces',
  ceramic_braces: 'Ceramic braces',
  lingual_braces: 'Lingual braces',
  clear_aligners: 'Clear aligners',
  hawley_retainer: 'Hawley retainer',
  clear_retainer: 'Clear retainer',
  fixed_retainer: 'Fixed retainer',
};

function isBraces(type) {
  return ['metal_braces', 'ceramic_braces', 'lingual_braces', 'clear_aligners'].includes(type);
}
function isRetainer(type) {
  return ['hawley_retainer', 'clear_retainer', 'fixed_retainer'].includes(type);
}

export default function BrushingAdvice({ applianceType = 'none' }) {
  const [video, setVideo] = useState(null);
  const type = applianceType || 'none';
  const showBraces = isBraces(type);
  const showRetainer = isRetainer(type);

  const sections = [];
  if (showBraces) sections.push({ key: 'braces', advice: ADVICE.braces, video: BRACES_VIDEO, label: 'Watch: brushing with braces' });
  if (showRetainer) sections.push({ key: 'retainer', advice: ADVICE.retainer, video: RETAINER_VIDEO, label: 'Watch: cleaning your retainer' });
  if (!showBraces && !showRetainer) sections.push({ key: 'general', advice: ADVICE.general, video: null, label: null });

  return (
    <div className="space-y-5">
      {type !== 'none' && (
        <div className="p-4 rounded-2xl bg-olo/5 border border-olo/20 flex items-center gap-3">
          <Check className="w-5 h-5 text-olo flex-shrink-0" />
          <p className="text-sm text-muted-foreground">
            Tailored for your <strong className="text-olo">{APPLIANCE_LABELS[type] || 'appliance'}</strong>.
          </p>
        </div>
      )}

      {sections.map(({ key, advice, video: vid, label }) => (
        <div key={key} className="p-5 rounded-2xl border border-border bg-card">
          <h3 className="font-heading font-600 text-base mb-3">{advice.title}</h3>
          <ol className="space-y-2">
            {advice.steps.map((step, i) => (
              <li key={i} className="flex items-start gap-2.5 text-sm text-foreground/80">
                <span className="w-5 h-5 rounded-full bg-olo/10 text-olo text-xs font-semibold flex items-center justify-center flex-shrink-0 mt-0.5">{i + 1}</span>
                <span className="leading-relaxed">{step}</span>
              </li>
            ))}
          </ol>
          {vid && (
            <button
              onClick={() => setVideo(vid)}
              className="mt-4 inline-flex items-center gap-2 bg-olo text-white font-semibold px-4 py-2.5 rounded-xl text-sm hover:scale-105 transition-transform olo-glow"
            >
              <Play className="w-4 h-4" /> {label}
            </button>
          )}
        </div>
      ))}

      {video && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm" onClick={() => setVideo(null)}>
          <div className="relative max-w-2xl w-full" onClick={(e) => e.stopPropagation()}>
            <button onClick={() => setVideo(null)} className="absolute -top-10 right-0 w-9 h-9 rounded-full bg-white/10 hover:bg-white/20 flex items-center justify-center text-white transition-colors">
              <X className="w-5 h-5" />
            </button>
            <video src={video} controls autoPlay className="w-full rounded-2xl border border-white/20 shadow-2xl" />
          </div>
        </div>
      )}
    </div>
  );
}