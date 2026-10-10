import { useScanPhoto } from '@/hooks/use-scan-photo';

// Drop-in replacement for <img src={scan.image_url}>. Fetches the photo through
// the ownership-verified scanPhoto backend function (the bucket is private, so
// the raw URL isn't usable). Shows a subtle shimmer placeholder while loading.
export default function ScanImage({ url, alt = '', className = '', fallback = null }) {
  const { src, loading } = useScanPhoto(url);
  if (!url) return fallback;
  if (loading || !src) return <div className={`${className} bg-olo-deep/40 animate-pulse`} />;
  return <img src={src} alt={alt} className={className} />;
}