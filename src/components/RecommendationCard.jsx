import React from 'react';
import { Zap, Clock, TrendingUp } from 'lucide-react';

const impactConfig = {
  high: { icon: Zap, color: 'bg-olo text-white', label: 'High impact' },
  medium: { icon: TrendingUp, color: 'bg-olo/15 text-olo', label: 'Medium impact' },
  low: { icon: Clock, color: 'bg-muted text-muted-foreground', label: 'Gentle' },
};

const RecommendationCard = React.memo(function RecommendationCard({ rec, index }) {
  const cfg = impactConfig[rec.impact] || impactConfig.medium;
  const Icon = cfg.icon;
  // Von Restorff isolate: the first (highest-impact) recommendation stands
  // out from the uniform grid so users act on #1 first.
  const isolate = index === 0;

  return (
    <div
      className={`p-5 rounded-2xl border bg-card transition-all animate-fade-up ${isolate ? 'border-olo shadow-2' : 'border-border hover:border-olo/40 hover:shadow-lg hover:shadow-olo/5'}`}
      style={{ animationDelay: `${index * 100}ms` }}
    >
      <div className="flex items-start justify-between gap-3 mb-3">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-olo/10 flex items-center justify-center font-heading font-700 text-olo">
            {index + 1}
          </div>
          <div>
            {isolate && <span className="text-[10px] font-semibold text-olo bg-olo/15 px-1.5 py-0.5 rounded-full mb-1 inline-block">Start here</span>}
            <h4 className="font-heading font-600 text-base leading-tight">{rec.title}</h4>
            <p className="text-xs text-muted-foreground capitalize">{rec.method}</p>
          </div>
        </div>
        <span className={`text-xs font-semibold px-2.5 py-1 rounded-full flex items-center gap-1 flex-shrink-0 ${cfg.color}`}>
          <Icon className="w-3 h-3" />
          {cfg.label}
        </span>
      </div>
      <p className="text-sm text-muted-foreground leading-relaxed mb-3">{rec.description}</p>
      {rec.frequency && (
        <div className="flex items-center gap-2 text-xs text-muted-foreground">
          <Clock className="w-3.5 h-3.5" />
          <span>{rec.frequency}</span>
        </div>
      )}
    </div>
  );
});

export default RecommendationCard;