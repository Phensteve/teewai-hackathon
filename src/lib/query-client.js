import { QueryClient } from '@tanstack/react-query';


export const queryClientInstance = new QueryClient({
	defaultOptions: {
		queries: {
			refetchOnWindowFocus: false,
			retry: 1,
			// 30s — cached data is considered fresh, so navigating back to a
			// page shows content instantly instead of flashing a loading
			// spinner while data refetches. This eliminates the "change change
			// change" jank where a page shows a spinner, then partial content,
			// then final content on every visit.
			staleTime: 30_000,
			// 5 min — keep unused data in memory for quick back-navigation.
			gcTime: 5 * 60 * 1000,
		},
	},
});