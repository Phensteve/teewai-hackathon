import { Link } from 'react-router-dom';
import { ArrowLeft, Camera, Trash2 } from 'lucide-react';

export default function ResultsHeader({ onBack, onDelete }) {
  return (
    <div className="flex items-center justify-between mb-4">
      <button
        onClick={onBack}
        className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-olo transition-colors"
      >
        <ArrowLeft className="w-4 h-4" /> Dashboard
      </button>
      <div className="flex items-center gap-2">
        <Link
          to="/scan"
          className="inline-flex items-center gap-1.5 bg-olo text-white font-semibold text-xs px-3 py-2 rounded-lg hover:opacity-90 transition-opacity"
        >
          <Camera className="w-3.5 h-3.5" /> Retake
        </Link>
        <button
          onClick={onDelete}
          aria-label="Delete scan"
          className="inline-flex items-center justify-center border border-destructive/30 text-destructive p-2 rounded-lg hover:bg-destructive/5 transition-colors"
        >
          <Trash2 className="w-3.5 h-3.5" />
        </button>
      </div>
    </div>
  );
}