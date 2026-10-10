import { useState, useEffect } from 'react';
import PageSkeleton from '@/components/loading/PageSkeleton';
import { Link } from 'react-router-dom';
import { subscriptions } from '@/lib/insforgeDb';
import { ArrowLeft, Crown, BookOpen, Lock } from 'lucide-react';
import HomeWhiteningMethods from '@/components/HomeWhiteningMethods';

const UNLIMITED_PLANS = ['pro', 'pro_yearly', 'pro_weekly', 'family_pro'];

export default function HomeWhitening() {
  const [subscription, setSubscription] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let mounted = true;
    subscriptions.filter({})
      .then((s) => { if (mounted) setSubscription(s[0] || null); })
      .catch(() => {})
      .finally(() => { if (mounted) setLoading(false); });
    return () => { mounted = false; };
  }, []);

  if (loading) return <PageSkeleton />;

  const isUnlimited = UNLIMITED_PLANS.includes(subscription?.plan);

  if (!isUnlimited) {
    return (
      <div className="max-w-md mx-auto px-4 py-12 text-center">
        <div className="w-16 h-16 rounded-2xl bg-olo/10 flex items-center justify-center mx-auto mb-5">
          <Lock className="w-8 h-8 text-olo" />
        </div>
        <h1 className="font-heading font-700 text-2xl mb-2">Unlimited members only</h1>
        <p className="text-muted-foreground text-sm mb-6 leading-relaxed">
          The full home whitening library is a perk for Unlimited plan members. Upgrade to unlock every evidence-based method — ancient practices, verified trends, and debunked myths.
        </p>
        <Link to="/subscription" className="inline-flex items-center gap-2 bg-olo text-white font-semibold px-6 py-3 rounded-2xl text-sm hover:scale-105 transition-transform olo-glow">
          <Crown className="w-4 h-4" /> Upgrade to Unlimited
        </Link>
        <Link to="/dashboard" className="block mt-4 text-sm text-muted-foreground hover:text-olo transition-colors">
          Back to dashboard
        </Link>
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto px-4 py-6">
      <Link to="/dashboard" className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-olo mb-6 transition-colors">
        <ArrowLeft className="w-4 h-4" /> Back
      </Link>

      <div className="mb-8">
        <div className="flex items-center gap-2 mb-3">
          <BookOpen className="w-5 h-5 text-olo" />
          <h1 className="font-heading font-700 text-3xl tracking-tight">Home whitening methods</h1>
        </div>
        <p className="text-muted-foreground leading-relaxed">
          Every method here is backed by at least three independent clinical sources — systematic reviews, ADA guidelines, or peer-reviewed trials. We've cut through the myths so you can focus on what actually works.
        </p>
      </div>

      <HomeWhiteningMethods />
    </div>
  );
}