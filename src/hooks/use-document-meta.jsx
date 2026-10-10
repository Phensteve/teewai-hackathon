import { useEffect } from 'react';

// Per-route SEO for a client-rendered SPA. The one weakness the SPA-vs-MPA
// analysis flags is search indexability: without server rendering, every
// route shares the index.html <title>/<meta description>/<link canonical>,
// so Google can't rank individual content pages. This hook gives each public
// route its own title, description and canonical URL — the modern SPA
// workaround (since Base44 doesn't run SSR). Restores the previous tags on
// unmount so navigating between routes never leaves stale metadata.
const BASE_URL = 'https://teewai.app';

export default function useDocumentMeta({ title, description, path }) {
  useEffect(() => {
    const fullTitle = title
      ? `${title} — teewai`
      : 'teewai — AI Dental Analysis & Whitening Tracker';
    const prevTitle = document.title;
    document.title = fullTitle;

    let descEl = document.querySelector('meta[name="description"]');
    const prevDesc = descEl ? descEl.getAttribute('content') : null;
    if (!descEl) {
      descEl = document.createElement('meta');
      descEl.setAttribute('name', 'description');
      document.head.appendChild(descEl);
    }
    descEl.setAttribute('content', description);

    let canonicalEl = document.querySelector('link[rel="canonical"]');
    const prevCanonical = canonicalEl ? canonicalEl.getAttribute('href') : null;
    if (path) {
      if (!canonicalEl) {
        canonicalEl = document.createElement('link');
        canonicalEl.setAttribute('rel', 'canonical');
        document.head.appendChild(canonicalEl);
      }
      canonicalEl.setAttribute('href', `${BASE_URL}${path}`);
    }

    return () => {
      document.title = prevTitle;
      if (prevDesc !== null) descEl.setAttribute('content', prevDesc);
      if (prevCanonical !== null && canonicalEl) canonicalEl.setAttribute('href', prevCanonical);
    };
  }, [title, description, path]);
}