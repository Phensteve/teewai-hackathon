import { Navigation } from 'lucide-react';
export default function FinderRouteSummary({ route }) {
  if (!route) return null;
  return <p role="status" className="flex items-center gap-1.5 text-xs text-muted-foreground">
    <Navigation className="w-3.5 h-3.5 text-dentist-route shrink-0" />
    {route.kind === 'road' ? `${route.distance.toFixed(1)} km by road · ~${route.minutes} min driving` : route.status === 'loading' ? 'Straight-line guide shown · checking road route…' : 'Straight-line guide · road route unavailable'}
  </p>;
}