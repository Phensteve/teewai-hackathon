import { Stethoscope } from 'lucide-react';

// Clinician badge shown next to verified medical professionals in the Common
// Room. Distinct from the teewai verified badge — this signals a credentialed
// clinician who may give medical advice.
export default function MedicalBadge({ size = 13, profession }) {
  const label = profession ? `Verified ${profession.replace(/_/g, ' ')}` : 'Verified clinician';
  return (
    <span
      className="inline-flex items-center gap-0.5 text-[9px] font-bold text-emerald-700 dark:text-emerald-300 bg-emerald-500/15 px-1.5 py-0.5 rounded-full uppercase tracking-wide"
      title={label}
    >
      <Stethoscope className="w-2.5 h-2.5" /> {profession ? profession.replace(/_/g, ' ') : 'Clinician'}
    </span>
  );
}