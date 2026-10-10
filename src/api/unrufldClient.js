import { createClient } from '@base44/sdk';
import { appParams } from '@/lib/app-params';

// The SDK's built-in analytics module is disabled at the config level so no
// analytics events, session IDs, or heartbeats are sent to the platform.
// This keeps all browser storage strictly essential (auth, preferences,
// security) — no consent banner is required under GDPR/ePrivacy.
const { appId, token, functionsVersion, appBaseUrl } = appParams;

export const unrufld = createClient({
  appId,
  token,
  functionsVersion,
  serverUrl: '',
  requiresAuth: false,
  appBaseUrl,
  analytics: { enabled: false },
});