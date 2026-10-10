import { useLocation } from 'react-router-dom';
import { Skeleton } from '@/components/ui/skeleton';
import SkeletonBlock from '@/components/loading/SkeletonBlock';
import NavigationSkeleton from '@/components/loading/NavigationSkeleton';
import { getSkeletonLayout } from '@/components/loading/pageSkeletonLayouts';

export default function PageSkeleton({ title, compact = false, className = '', pagePath, withNavigation = false }) {
  const { pathname } = useLocation();
  const layout = getSkeletonLayout(pagePath || pathname);
  const blocks = compact ? layout.compact || layout.blocks : layout.blocks;
  const content = <div role="status" aria-busy="true" aria-label={`Loading ${title || layout.title || 'page'}`} className={`w-full ${layout.width} mx-auto space-y-6 ${className}`}>
    <span className="sr-only">Loading content…</span>
    {!compact && <div className="space-y-2">{title ? <h1 className="text-h1">{title}</h1> : <Skeleton className="h-8 w-2/3" />}<Skeleton aria-hidden="true" className="h-4 w-3/4" /></div>}
    <div aria-hidden="true" className="space-y-6">{blocks.map((block, i) => <SkeletonBlock key={i} {...block} />)}</div>
  </div>;
  return withNavigation ? <NavigationSkeleton navigation={layout.navigation}>{content}</NavigationSkeleton> : content;
}