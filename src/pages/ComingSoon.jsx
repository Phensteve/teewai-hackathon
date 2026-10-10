import { Construction } from 'lucide-react';
import BackButton from '@/components/BackButton';

export default function ComingSoon() {
  return (
    <div className="min-h-screen bg-olo-deep flex items-center justify-center px-4 text-center text-white safe-area-inset-top">
      <div className="max-w-md">
        <div className="w-16 h-16 rounded-2xl bg-olo/20 flex items-center justify-center mx-auto mb-5 olo-glow">
          <Construction className="w-8 h-8 text-olo" />
        </div>
        <h1 className="font-heading font-700 text-3xl tracking-tight mb-3">Feature coming soon</h1>
        <p className="text-white/60 mb-8">
          We're still polishing this. The dentist portal isn't live yet — check back shortly.
        </p>
        <BackButton compact className="bg-olo text-primary-foreground font-semibold px-5 py-2.5 rounded-xl olo-glow" />
      </div>
    </div>
  );
}