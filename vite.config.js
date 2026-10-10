import base44 from "@base44/vite-plugin"
import react from '@vitejs/plugin-react'
import { defineConfig } from 'vite'

// https://vite.dev/config/
export default defineConfig({
  resolve: {
    // Force a single copy of React/react-dom across all deps. Without this,
    // a dependency that resolves its own React copy produces "Cannot read
    // properties of null (reading 'useState')" when hooks run against the
    // wrong instance.
    dedupe: ['react', 'react-dom'],
  },
  plugins: [
    base44({
      // Support for legacy code that imports the base44 SDK with @/integrations, @/entities, etc.
      // can be removed if the code has been updated to use the new SDK imports from @base44/sdk
      legacySDKImports: process.env.BASE44_LEGACY_SDK_IMPORTS === 'true',
      hmrNotifier: true,
      navigationNotifier: true,
      analyticsTracker: true,
      visualEditAgent: true
    }),
    react(),
  ],
  build: {
    // Isolate the heaviest vendor libs into their own cached chunks so they
    // don't bloat every page chunk and can load in parallel. three.js, Leaflet,
    // Recharts, framer-motion and the PDF libs are each large enough that
    // inlining them into a page chunk makes that page's first load noticeably
    // slower — splitting them lets the browser cache + reuse them across
    // pages and fetch them in parallel with the page's own chunk.
    rollupOptions: {
      output: {
        manualChunks: {
          three: ['three'],
          leaflet: ['leaflet', 'react-leaflet'],
          recharts: ['recharts'],
          motion: ['framer-motion'],
          pdf: ['jspdf', 'html2canvas'],
        },
      },
    },
  },
});