import React from 'react';

// React.lazy with automatic retry on chunk-load failure (poor connectivity).
//
// Problem: when a dynamic import fails due to network issues, the failed
// promise is cached by the module system and the component stays broken
// even after connectivity returns — the user must manually reload.
// (https://github.com/remix-run/react-router/discussions/10333)
//
// Solution: detect chunk-load errors and automatically reload the page once.
// The browser cache will serve the chunk on the second attempt. We use
// sessionStorage to prevent infinite reload loops.
export function lazyWithRetry(componentImport) {
  return React.lazy(() =>
    componentImport().catch((error) => {
      const isChunkError =
        error?.name === 'ChunkLoadError' ||
        error?.message?.includes('Failed to fetch dynamically imported module') ||
        error?.message?.includes('Importing a module script failed');

      if (isChunkError) {
        const key = 'teewai_chunk_retry';
        if (!sessionStorage.getItem(key)) {
          sessionStorage.setItem(key, '1');
          window.location.reload();
          return new Promise(() => {}); // never resolves — reload handles it
        }
        sessionStorage.removeItem(key);
      }
      throw error;
    })
  );
}