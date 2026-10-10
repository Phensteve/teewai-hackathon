import { useState } from 'react';
import useFinderLocation from '@/hooks/use-finder-location';
import useFinderSearch from '@/hooks/use-finder-search';
import useDentistRoute from '@/hooks/use-dentist-route';
import FinderHeader from '@/components/dentist/FinderHeader';
import FinderSearchControls from '@/components/dentist/FinderSearchControls';
import FinderResults from '@/components/dentist/FinderResults';
import FinderMapCard from '@/components/dentist/FinderMapCard';
import FinderFullscreenMap from '@/components/dentist/FinderFullscreenMap';
import DentistMiniApp from '@/components/dentist/DentistMiniApp';
import useDocumentMeta from '@/hooks/use-document-meta';
import { playClick } from '@/lib/sounds';

export default function FindDentist({ embedded=false }) {
  const location=useFinderLocation();
  const finder=useFinderSearch(location);
  const [selected,setSelected]=useState(null);
  const [managed,setManaged]=useState(null);
  const [expanded,setExpanded]=useState(false);
  const [fullscreen,setFullscreen]=useState(false);
  const route=useDentistRoute(finder.userPos || finder.origin,selected);
  useDocumentMeta({title:'Find a dentist',description:'Find nearby dental clinics, closest first, or browse by name and area.',path:'/find-dentist'});
  const select=d => {playClick();setSelected(d);setExpanded(false);};
  return <>
    <section data-testid="dentist-finder" className={embedded ? 'absolute inset-0 flex flex-col overflow-hidden bg-background' : 'fixed top-[calc(3.5rem+env(safe-area-inset-top))] bottom-[calc(4.5rem+env(safe-area-inset-bottom))] inset-x-0 lg:top-0 lg:bottom-0 lg:left-64 flex flex-col overflow-hidden bg-background'}>
      <FinderMapCard finder={finder} selected={selected} onSelect={select} onExpand={() => setFullscreen(true)} expanded={expanded} route={route} embedded={embedded} />
      <div className="min-h-0 flex-1 flex flex-col rounded-t-3xl bg-card border-t border-border shadow-lg pb-[env(safe-area-inset-bottom)]">
        <FinderHeader finder={finder} expanded={expanded} onToggle={() => setExpanded(v=>!v)} />
        <div className="flex-1 min-h-0 overflow-y-auto overscroll-contain p-4 space-y-4">
          <FinderSearchControls finder={finder} />
          <FinderResults finder={finder} selected={selected} onSelect={select} onManage={setManaged} route={route} />
        </div>
      </div>
    </section>
    <FinderFullscreenMap open={fullscreen} finder={finder} selected={selected} onSelect={select} onClose={() => setFullscreen(false)} route={route} />
    <DentistMiniApp open={!!managed} dentist={managed} user={finder.user} onClose={() => setManaged(null)} />
  </>;
}