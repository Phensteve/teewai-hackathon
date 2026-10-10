// Quick-scan reference-card guidance — prompts the user to place a VITA
// shade guide or white index card next to their teeth for color calibration.
import { Info } from 'lucide-react';
import { Link } from 'react-router-dom';

export default function ScanGuidance() {
  return (
    <div className="mb-4">
      <div className="flex items-start gap-2 text-caption text-muted-foreground bg-warning-soft border border-warning/20 rounded-xl p-3">
        <Info className="w-3.5 h-3.5 text-warning flex-shrink-0 mt-0.5" />
        <span>
          For the most accurate shade matching, place a{' '}
          <strong className="text-warning">VITA shade guide</strong> or a{' '}
          <strong className="text-warning">white index card</strong> next to your teeth as a color
          reference. teewai uses it to calibrate color precisely.{' '}
          <Link to="/reference-material" className="text-olo font-medium underline hover:no-underline">
            why?
          </Link>
        </span>
      </div>
    </div>
  );
}