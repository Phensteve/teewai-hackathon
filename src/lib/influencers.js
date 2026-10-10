import { unrufld } from '@/api/unrufldClient';
import { adminAuth } from '@/lib/adminAuth';
const pendingKey = 'teewai_influencer_invitation';
export async function influencerCall(op, data = {}, admin = false) {
  const response = await unrufld.functions.invoke('influencers', { ...data, op, ...(admin ? { admin_token: adminAuth.getToken() } : {}) });
  if (response.data?.error) throw new Error(response.data.error);
  return response.data;
}
export const trackingLink = c => `https://teewai.base44.app/influencer-progress#${c.tracking_token}`;
export const invitationLink = c => `https://teewai.base44.app/register?invite=${encodeURIComponent(c.invitation_code)}`;
export function pendingInvitation() {
  const urlCode = new URLSearchParams(window.location.search).get('invite');
  if (urlCode) { storeInvitation(urlCode); return urlCode.toUpperCase(); }
  try {
    const stored = JSON.parse(localStorage.getItem(pendingKey) || 'null');
    return stored && Date.now() - stored.at < 30 * 86400000 ? stored.code : '';
  } catch { return ''; }
}
export function storeInvitation(code) {
  if (code) localStorage.setItem(pendingKey, JSON.stringify({ code: code.trim().toUpperCase(), at: Date.now() }));
  else localStorage.removeItem(pendingKey);
}
export async function claimInvitation() {
  const code = pendingInvitation();
  if (!code) return;
  await influencerCall('claim', { code });
  localStorage.removeItem(pendingKey);
}