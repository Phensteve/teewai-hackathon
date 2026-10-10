import { Link } from 'react-router-dom';
import { Route, Heart, ShoppingBag, Wrench, Share2, ArrowLeft } from 'lucide-react';
import RecommendationCard from '@/components/RecommendationCard';
import ProductCard from '@/components/ProductCard';
import PlanBuilder from '@/components/PlanBuilder';
import HomeWhiteningMethods from '@/components/HomeWhiteningMethods';
import BragCard from '@/components/BragCard';

export default function PlanTab({ scan, recs, products, isUnlimited, userName }) {
  // Von Restorff isolate: the best-value (budget) product stands out from the
  // uniform product grid; falls back to the first product if none is budget.
  const bestValueIdx = products?.length ? (() => {
    const i = products.findIndex((x) => x.budget_tier === 'budget');
    return i >= 0 ? i : 0;
  })() : -1;
  return (
    <>
      {/* Recommendations */}
      {scan.recommendations?.length > 0 && (
        <div className="mb-4">
          <h2 className="font-heading font-600 text-xl mb-4">Your personalized plan</h2>
          <div className="grid sm:grid-cols-2 gap-4">
            {recs.map((rec, i) => (
              <RecommendationCard key={i} rec={rec} index={i} />
            ))}
          </div>
        </div>
      )}

      {/* Your whitening journey — evidence-based guidance, sorted by this scan's stains */}
      <div className="mb-4">
        <div className="flex items-center justify-between gap-3 mb-4">
          <div className="flex items-center gap-2">
            <Route className="w-5 h-5 text-olo" />
            <h2 className="font-heading font-600 text-xl">Your whitening journey</h2>
          </div>
          {isUnlimited && (
            <Link to="/home-whitening" className="text-sm text-olo font-medium hover:underline whitespace-nowrap flex items-center gap-1">
              Explore all methods <ArrowLeft className="w-3.5 h-3.5 rotate-180" />
            </Link>
          )}
        </div>
        {isUnlimited && (
          <div className="mb-4 p-4 rounded-2xl bg-olo-deep text-white relative overflow-hidden border border-olo/30">
            <div className="absolute -top-10 -right-10 w-36 h-36 bg-olo/25 rounded-full blur-3xl" />
            <div className="relative flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-olo flex items-center justify-center flex-shrink-0 olo-glow">
                <Heart className="w-5 h-5 text-white" />
              </div>
              <div className="min-w-0">
                <p className="text-sm font-heading font-600 text-olo">Specially for you, {userName || 'friend'}</p>
                <p className="text-xs text-white/70 leading-snug">Your unlimited portal — every evidence-based method, guided for your journey.</p>
              </div>
            </div>
          </div>
        )}
        <HomeWhiteningMethods scan={scan} compact />
      </div>

      {/* Product recommendations */}
      {scan.products?.length > 0 && (
        <div className="mb-4">
          <div className="flex items-center gap-2 mb-4">
            <ShoppingBag className="w-5 h-5 text-olo" />
            <h2 className="font-heading font-600 text-xl">Recommended products</h2>
          </div>
          <div className="grid sm:grid-cols-2 gap-4">
            {products.map((p, i) => (
              <ProductCard key={i} product={p} index={i} isolate={i === bestValueIdx} />
            ))}
          </div>
        </div>
      )}

      {/* Plan builder */}
      {scan.products?.length > 0 && (
        <div className="mb-4">
          <div className="flex items-center gap-2 mb-4">
            <Wrench className="w-5 h-5 text-olo" />
            <h2 className="font-heading font-600 text-xl">Build your whitening plan</h2>
          </div>
          <PlanBuilder products={products} recommendations={recs} scan={scan} />
        </div>
      )}

      {/* Brag card */}
      <div>
        <div className="flex items-center gap-2 mb-4">
          <Share2 className="w-5 h-5 text-olo" />
          <h2 className="font-heading font-600 text-xl">Share your progress</h2>
        </div>
        <BragCard score={scan.score} shade={scan.shade} shadeCode={scan.shade_code} healthScore={scan.dental_health_score} />
      </div>
    </>
  );
}