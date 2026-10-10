import React, { useState } from 'react';
import { ShoppingBag, Tag, MapPin } from 'lucide-react';
import ProductDetailModal from '@/components/ProductDetailModal';

const tierConfig = {
  budget: { label: 'Budget', color: 'bg-success-soft text-success' },
  mid: { label: 'Mid-range', color: 'bg-olo/10 text-olo' },
  premium: { label: 'Premium', color: 'bg-warning-soft text-warning' },
};

const ProductCard = React.memo(function ProductCard({ product, index, isolate }) {
  const [open, setOpen] = useState(false);
  const tier = tierConfig[product.budget_tier] || tierConfig.mid;
  return (
    <>
    <button
      type="button"
      onClick={() => setOpen(true)}
      className={`min-w-0 w-full text-left p-5 rounded-2xl border bg-card transition-all animate-fade-up cursor-pointer ${isolate ? 'border-olo shadow-2' : 'border-border hover:border-olo/40 hover:shadow-lg hover:shadow-olo/5'}`}
      style={{ animationDelay: `${index * 100}ms` }}
    >
      <div className="flex items-start justify-between gap-3 mb-3">
        <div className="flex items-start gap-3 min-w-0">
          <div className="w-10 h-10 rounded-xl bg-olo/10 flex items-center justify-center flex-shrink-0">
            <ShoppingBag className="w-5 h-5 text-olo" />
          </div>
          <div className="min-w-0">
            {isolate && <span className="text-[10px] font-semibold text-olo bg-olo/15 px-1.5 py-0.5 rounded-full mb-1 inline-block">Best value</span>}
            <h4 className="font-heading font-600 text-base leading-tight truncate">{product.name}</h4>
            <p className="text-xs text-muted-foreground">{product.category}</p>
          </div>
        </div>
        <span className={`text-xs font-semibold px-2.5 py-1 rounded-full flex-shrink-0 ${tier.color}`}>{tier.label}</span>
      </div>
      {product.active_ingredient && (
        <p className="text-xs text-muted-foreground mb-2">
          Active: <span className="text-foreground font-medium">{product.active_ingredient}</span>
        </p>
      )}
      <p className="text-sm text-muted-foreground leading-relaxed mb-3 break-words">{product.why}</p>
      <div className="flex items-center justify-between text-xs gap-2 min-w-0">
        <span className="flex items-center gap-1 font-semibold text-olo flex-shrink-0">
          <Tag className="w-3.5 h-3.5" />{product.price_range}
        </span>
        {product.where_to_buy && (
          <span className="flex items-center gap-1 text-muted-foreground truncate min-w-0">
            <MapPin className="w-3.5 h-3.5 flex-shrink-0" />{product.where_to_buy}
          </span>
        )}
      </div>
      <p className="mt-3 text-[11px] text-olo font-medium">Tap for more info →</p>
    </button>
    {open && <ProductDetailModal product={product} onClose={() => setOpen(false)} />}
    </>
  );
});

export default ProductCard;