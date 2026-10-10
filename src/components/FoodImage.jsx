import { useScanPhoto } from '@/hooks/use-scan-photo';

// Renders a food photo from either source:
//  - InsForge private storage (`/api/storage/buckets/food-scans/…`) → fetched
//    through the ownership-verified scanPhoto proxy (base64), never the raw URL.
//  - Legacy Base44 public URLs (older stain logs) → rendered directly.
// Detects the source from the URL so both old and new logs display correctly.
const isInsForgeUrl = (url) => /\/api\/storage\/buckets\//.test(String(url || ''));

export default function FoodImage({ url, alt = '', className = '', fallback = null }) {
  const insforge = isInsForgeUrl(url);
  const { src, loading } = useScanPhoto(insforge ? url : null);
  if (!url) return fallback;
  if (!insforge) return <img src={url} alt={alt} className={className} />;
  if (loading || !src) return <div className={`${className} bg-muted animate-pulse rounded-xl`} />;
  return <img src={src} alt={alt} className={className} />;
}