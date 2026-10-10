import { useState, useEffect } from 'react';
import { unrufld } from '@/api/unrufldClient';

// Resolves private scan-photo URLs to displayable base64 data URLs via the
// scanPhoto backend function (ownership-verified). The photos live in a
// PRIVATE InsForge bucket, so the raw URLs can't be used in <img src> — this
// hook is the only way the frontend gets image bytes for display.
//
// Micro-batch: all hooks that fire in the same tick pool their URLs into a
// single scanPhoto call, so a list of 20 thumbnails = 1 function call (not
// 20). A module-level cache means a photo is fetched once per session.

const cache = new Map(); // url -> dataUrl
const pending = new Map(); // url -> Promise (in-flight)
let batchQueue = [];
let batchScheduled = false;

function flushBatch() {
  batchScheduled = false;
  const current = batchQueue;
  batchQueue = [];
  const allUrls = [...new Set(current.flatMap((b) => b.urls).filter(Boolean))];
  const uncached = allUrls.filter((u) => !cache.has(u) && !pending.has(u));
  if (!uncached.length) {
    // Every URL is cached or already in-flight. Wait for any in-flight
    // fetches to finish before resolving the batch — otherwise a hook whose
    // URL is still pending resolves with null and leaves the image blank
    // forever (its effect already ran, so it never picks up the cached value
    // when the fetch later completes). This was causing scan photos to never
    // appear when two hooks for the same URL mounted a tick apart.
    const inflight = allUrls.filter((u) => pending.has(u)).map((u) => pending.get(u));
    if (inflight.length) {
      Promise.all(inflight).then(() => { for (const b of current) b.resolve(); });
    } else {
      for (const b of current) b.resolve();
    }
    return;
  }
  const p = unrufld.functions.invoke('scanPhoto', { urls: uncached })
    .then((res) => {
      const map = (res.data && res.data.dataUrls) || {};
      for (const [url, dataUrl] of Object.entries(map)) {
        if (dataUrl) cache.set(url, dataUrl);
      }
    })
    .catch(() => {})
    .finally(() => {
      for (const u of uncached) pending.delete(u);
    });
  for (const u of uncached) pending.set(u, p);
  p.then(() => { for (const b of current) b.resolve(); });
}

function fetchPhotos(urls) {
  return new Promise((resolve) => {
    batchQueue.push({ urls, resolve });
    if (!batchScheduled) {
      batchScheduled = true;
      // Microtask: collect all URLs from hooks firing this tick, then batch.
      Promise.resolve().then(flushBatch);
    }
  });
}

export function useScanPhoto(url) {
  const [src, setSrc] = useState(() => (url ? cache.get(url) : null) || null);
  const [loading, setLoading] = useState(() => (url ? !cache.has(url) : false));

  useEffect(() => {
    if (!url) { setSrc(null); setLoading(false); return; }
    if (cache.has(url)) { setSrc(cache.get(url)); setLoading(false); return; }
    let active = true;
    setLoading(true);
    // Retry up to 2 times if the proxy fetch fails to populate the cache —
    // a transient scanPhoto error otherwise leaves the photo blank forever
    // (the effect won't re-run unless the URL changes).
    const attempt = (retries) =>
      fetchPhotos([url]).then(() => {
        if (!active) return;
        if (cache.has(url)) { setSrc(cache.get(url)); setLoading(false); }
        else if (retries > 0) setTimeout(() => { if (active) attempt(retries - 1); }, 1500);
        else { setSrc(null); setLoading(false); }
      });
    attempt(2);
    return () => { active = false; };
  }, [url]);

  return { src, loading };
}

// Batch hook for lists — resolves many URLs at once and returns a url->dataUrl map.
export function useScanPhotos(urls) {
  const [map, setMap] = useState(() => {
    const m = {};
    for (const u of urls) if (u && cache.has(u)) m[u] = cache.get(u);
    return m;
  });
  const urlsKey = urls.filter(Boolean).join('\n');

  useEffect(() => {
    if (!urls.length) return;
    let active = true;
    const uncached = urls.filter((u) => u && !cache.has(u));
    const buildMap = () => {
      const m = {};
      for (const u of urls) if (u && cache.has(u)) m[u] = cache.get(u);
      return m;
    };
    if (!uncached.length) { setMap(buildMap()); return; }
    fetchPhotos(urls).then(() => { if (active) setMap(buildMap()); });
    return () => { active = false; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [urlsKey]);

  return map;
}