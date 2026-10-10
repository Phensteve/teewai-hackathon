// "Your scan is still processing" screen — shown when the user navigated away
// mid-analysis and came back. The orchestrator polls and auto-navigates to
// results when the scan completes.
import { Link } from 'react-router-dom';
import { Loader2 } from 'lucide-react';

export default function ScanProcessing({ onDismiss }) {
  return (
    <div className="max-w-lg mx-auto text-center py-16">
      <span className="icon-tool mx-auto mb-4">
        <Loader2 className="animate-spin" />
      </span>
      <h1 className="text-h2 mb-2">Your scan is still processing</h1>
      <p className="text-caption text-muted-foreground mb-4">
        You left while your scan was being analyzed. It's still running in the background. This page
        will update automatically when it's ready.
      </p>
      <div className="flex items-center justify-center gap-3">
        <Link
          to="/my-scans"
          className="inline-flex items-center gap-2 bg-olo text-white font-semibold px-5 py-2.5 rounded-xl text-caption hover:scale-105 transition-transform"
        >
          Go to My Scans
        </Link>
        <button
          onClick={onDismiss}
          className="inline-flex items-center gap-2 border border-border font-medium px-5 py-2.5 rounded-xl text-caption hover:bg-muted/50 transition-colors"
        >
          Start a new scan
        </button>
      </div>
    </div>
  );
}