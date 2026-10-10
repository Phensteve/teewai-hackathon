import { MOOD_EMOJI } from '@/lib/gamification';
import { LOGO_URL } from '@/components/Logo';

// Parasocial companion — teewai AI personality with moods.
// Builds emotional bond; references scan history; fears losing you (loss aversion).
export default function TeewaiCompanion({ message }) {
  if (!message) return null;
  const emoji = MOOD_EMOJI[message.mood] || '✨';

  return (
    <div className="p-5 rounded-3xl border border-olo/20 bg-gradient-to-br from-olo-deep to-olo-deep/80 text-white relative overflow-hidden">
      <div className="absolute -top-10 -right-10 w-40 h-40 bg-olo/10 rounded-full blur-3xl" />
      <div className="relative z-10 flex items-start gap-4">
        <div className="relative flex-shrink-0">
          <img src={LOGO_URL} alt="teewai" className="w-14 h-14 rounded-2xl olo-glow" />
          <span className="absolute -bottom-1 -right-1 text-2xl">{emoji}</span>
        </div>
        <div className="flex-1 pt-1">
          <p className="text-xs text-olo font-medium uppercase tracking-wider mb-1">teewai</p>
          <p className="text-white/90 text-sm leading-relaxed">{message.text}</p>
        </div>
      </div>
    </div>
  );
}