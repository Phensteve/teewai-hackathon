import { unrufld } from '@/api/unrufldClient';

const TOKEN_KEY = 'teewai_admin_token';
const USER_KEY = 'teewai_admin_user';
const ROLE_KEY = 'teewai_admin_role';
const SESSION_KEY = 'teewai_admin_session';

// Max admin session age (8h). Even if a token is lifted from localStorage,
// the client refuses to attach it past this window and auto-clears it —
// defense-in-depth on top of the backend's own expiry.
const MAX_SESSION_MS = 8 * 60 * 60 * 1000;

// Decode a JWT's `exp` claim and return true if it has expired. The admin
// token is a JWT minted by the backend; an expired token only produces a
// stream of "Invalid session" errors, so we clear it proactively.
function isJwtExpired(token) {
  try {
    const parts = String(token).split('.');
    if (parts.length < 2) return false; // not a JWT — let the backend decide
    const payload = JSON.parse(atob(parts[1].replace(/-/g, '+').replace(/_/g, '/')));
    if (payload && typeof payload.exp === 'number') {
      return Date.now() >= payload.exp * 1000 - 30000; // 30s clock-skew tolerance
    }
  } catch {}
  return false;
}

function clearAdminSession() {
  try {
    localStorage.removeItem(TOKEN_KEY);
    localStorage.removeItem(USER_KEY);
    localStorage.removeItem(ROLE_KEY);
    localStorage.removeItem(SESSION_KEY);
  } catch {}
}

function unwrap(res) {
  if (res?.data?.error) {
    const err = new Error(res.data.error);
    // Attach extra fields (e.g. retry_after_seconds from the rate limiter) so
    // the UI can show a live countdown instead of a static message.
    if (res.data.retry_after_seconds != null) err.retry_after_seconds = res.data.retry_after_seconds;
    // Auto-logout on auth failures so a dead/expired token doesn't leave the
    // admin staring at an endless stream of "Invalid session" errors — the
    // next call re-prompts for login instead of failing silently.
    if (/(invalid|expired).*(token|session)|unauthorized|not authenticated/i.test(String(res.data.error))) {
      clearAdminSession();
    }
    throw err;
  }
  return res?.data;
}

export const adminAuth = {
  getToken() {
    try {
      const tok = localStorage.getItem(TOKEN_KEY);
      if (!tok) return null;
      // Defense-in-depth: refuse to use a token that is JWT-expired or older
      // than the max session window, even before the backend rejects it.
      const since = Number(localStorage.getItem(SESSION_KEY) || 0);
      if ((since && Date.now() - since > MAX_SESSION_MS) || isJwtExpired(tok)) {
        clearAdminSession();
        return null;
      }
      return tok;
    } catch { return null; }
  },
  getUser() {
    try { return localStorage.getItem(USER_KEY); } catch { return null; }
  },
  getRole() {
    try { return localStorage.getItem(ROLE_KEY) || 'admin'; } catch { return 'admin'; }
  },
  async login(username, password, totp_code) {
    const res = await unrufld.functions.invoke('adminAuth', { op: 'login', username, password, totp_code });
    const data = unwrap(res);
    // totp_required = the password was correct but 2FA is enabled and no code
    // was sent. Don't store anything — the caller should prompt for the code.
    if (data.totp_required) return data;
    if (data.totp_enrollment_required) return data;
    localStorage.setItem(TOKEN_KEY, data.token);
    localStorage.setItem(USER_KEY, data.username);
    localStorage.setItem(ROLE_KEY, data.role || 'admin');
    localStorage.setItem(SESSION_KEY, String(Date.now()));
    return data;
  },
  async enrollTotpEnrollment(enrollment_token) {
    const res = await unrufld.functions.invoke('adminAuth', { op: 'enrollTotp', enrollment_token });
    return unwrap(res);
  },
  async confirmTotpEnrollment(enrollment_token, totp_code) {
    const res = await unrufld.functions.invoke('adminAuth', { op: 'confirmTotp', enrollment_token, totp_code });
    const data = unwrap(res);
    if (data.token) {
      localStorage.setItem(TOKEN_KEY, data.token);
      localStorage.setItem(USER_KEY, data.username);
      localStorage.setItem(ROLE_KEY, data.role || 'admin');
      localStorage.setItem(SESSION_KEY, String(Date.now()));
    }
    return data;
  },
  async me() {
    const token = this.getToken();
    if (!token) throw new Error('No session');
    const res = await unrufld.functions.invoke('adminAuth', { op: 'me', token });
    const data = unwrap(res);
    if (data.role) localStorage.setItem(ROLE_KEY, data.role);
    return data;
  },
  async listAdmins() {
    const res = await unrufld.functions.invoke('adminAuth', { op: 'listAdmins', token: this.getToken() });
    return unwrap(res);
  },
  async addAdmin(username, password, role = 'admin') {
    const res = await unrufld.functions.invoke('adminAuth', { op: 'addAdmin', token: this.getToken(), username, password, role });
    return unwrap(res);
  },
  async setAdminRole(username, role) {
    const res = await unrufld.functions.invoke('adminAuth', { op: 'setAdminRole', token: this.getToken(), username, role });
    return unwrap(res);
  },
  async removeAdmin(username) {
    const res = await unrufld.functions.invoke('adminAuth', { op: 'removeAdmin', token: this.getToken(), username });
    return unwrap(res);
  },
  async listUsers() {
    const res = await unrufld.functions.invoke('adminAuth', { op: 'listUsers', token: this.getToken() });
    return unwrap(res);
  },
  async setUserStatus(user_id, status) {
    const res = await unrufld.functions.invoke('adminAuth', { op: 'setUserStatus', token: this.getToken(), user_id, status });
    return unwrap(res);
  },
  async grantScans(user_id, scans) {
    const res = await unrufld.functions.invoke('adminAuth', { op: 'grantScans', token: this.getToken(), user_id, scans });
    return unwrap(res);
  },
  async updateUser(user_id, updates) {
    const res = await unrufld.functions.invoke('adminAuth', { op: 'updateUser', token: this.getToken(), user_id, ...updates });
    return unwrap(res);
  },
  async listAuditLog() {
    const res = await unrufld.functions.invoke('adminAuth', { op: 'listAuditLog', token: this.getToken() });
    return unwrap(res);
  },
  async liveScans() {
    const res = await unrufld.functions.invoke('adminAuth', { op: 'liveScans', token: this.getToken() });
    return unwrap(res);
  },
  async userOverview(user_id) {
    const res = await unrufld.functions.invoke('adminAuth', { op: 'userOverview', token: this.getToken(), user_id });
    return unwrap(res);
  },
  async linkOrphanedPhotos() {
    const res = await unrufld.functions.invoke('adminAuth', { op: 'linkOrphanedPhotos', token: this.getToken() });
    return unwrap(res);
  },
  async photoScanAudit() {
    const res = await unrufld.functions.invoke('adminAuth', { op: 'photoScanAudit', token: this.getToken() });
    return unwrap(res);
  },
  async viewPhotos(photos) {
    const res = await unrufld.functions.invoke('adminAuth', { op: 'viewPhotos', token: this.getToken(), photos });
    return unwrap(res);
  },
  async listFeatureFlags() {
    const res = await unrufld.functions.invoke('adminAuth', { op: 'listFeatureFlags', token: this.getToken() });
    return unwrap(res);
  },
  async setFeatureFlag(feature_key, status) {
    const res = await unrufld.functions.invoke('adminAuth', { op: 'setFeatureFlag', token: this.getToken(), feature_key, status });
    return unwrap(res);
  },
  async liveVisitors() {
    const res = await unrufld.functions.invoke('adminAuth', { op: 'liveVisitors', token: this.getToken() });
    return unwrap(res);
  },
  async visitorTraffic() {
    const res = await unrufld.functions.invoke('adminAuth', { op: 'visitorTraffic', token: this.getToken() });
    return unwrap(res);
  },
  async getHeroVariant() {
    const res = await unrufld.functions.invoke('adminAuth', { op: 'getHeroVariant', token: this.getToken() });
    return unwrap(res);
  },
  async setHeroVariant(value) {
    const res = await unrufld.functions.invoke('adminAuth', { op: 'setHeroVariant', token: this.getToken(), value });
    return unwrap(res);
  },
  async enrollTotp() {
    const res = await unrufld.functions.invoke('adminAuth', { op: 'enrollTotp', token: this.getToken() });
    return unwrap(res);
  },
  async confirmTotp(totp_code) {
    const res = await unrufld.functions.invoke('adminAuth', { op: 'confirmTotp', token: this.getToken(), totp_code });
    return unwrap(res);
  },
  async disableTotp(username) {
    const res = await unrufld.functions.invoke('adminAuth', { op: 'disableTotp', token: this.getToken(), username });
    return unwrap(res);
  },
  async getTotpStatus() {
    const res = await unrufld.functions.invoke('adminAuth', { op: 'getTotpStatus', token: this.getToken() });
    return unwrap(res);
  },
  async getIpAllowlist() {
    const res = await unrufld.functions.invoke('adminAuth', { op: 'getIpAllowlist', token: this.getToken() });
    return unwrap(res);
  },
  async setIpAllowlist(allowlist) {
    const res = await unrufld.functions.invoke('adminAuth', { op: 'setIpAllowlist', token: this.getToken(), allowlist });
    return unwrap(res);
  },
  async listMedicalVerifications() {
    const res = await unrufld.functions.invoke('adminAuth', { op: 'listMedicalVerifications', token: this.getToken() });
    return unwrap(res);
  },
  async reviewMedicalVerification(verification_id, status, review_notes) {
    const res = await unrufld.functions.invoke('adminAuth', { op: 'reviewMedicalVerification', token: this.getToken(), verification_id, status, review_notes });
    return unwrap(res);
  },
  async listFlaggedMessages() {
    const res = await unrufld.functions.invoke('adminAuth', { op: 'listFlaggedMessages', token: this.getToken() });
    return unwrap(res);
  },
  async reviewFlag(message_id, decision) {
    const res = await unrufld.functions.invoke('adminAuth', { op: 'reviewFlag', token: this.getToken(), message_id, decision });
    return unwrap(res);
  },
  async listAdminPrivileges() {
    const res = await unrufld.functions.invoke('adminAuth', { op: 'listAdminPrivileges', token: this.getToken() });
    return unwrap(res);
  },
  async setAdminPrivileges(username, privileges) {
    const res = await unrufld.functions.invoke('adminAuth', { op: 'setAdminPrivileges', token: this.getToken(), username, privileges });
    return unwrap(res);
  },
  async listGuestIps() {
    const res = await unrufld.functions.invoke('adminAuth', { op: 'listGuestIps', token: this.getToken() });
    return unwrap(res);
  },
  async banGuestIp(ip_id, reason) {
    const res = await unrufld.functions.invoke('adminAuth', { op: 'banGuestIp', token: this.getToken(), ip_id, reason });
    return unwrap(res);
  },
  async unbanGuestIp(ip_id) {
    const res = await unrufld.functions.invoke('adminAuth', { op: 'unbanGuestIp', token: this.getToken(), ip_id });
    return unwrap(res);
  },
  async listCommunityMessages() {
    const res = await unrufld.functions.invoke('adminAuth', { op: 'listCommunityMessages', token: this.getToken() });
    return unwrap(res);
  },
  async deleteCommunityMessage(message_id) {
    const res = await unrufld.functions.invoke('adminAuth', { op: 'deleteCommunityMessage', token: this.getToken(), message_id });
    return unwrap(res);
  },
  async listBlogSubmissions() {
    const res = await unrufld.functions.invoke('adminAuth', { op: 'listBlogSubmissions', token: this.getToken() });
    return unwrap(res);
  },
  async reviewBlogSubmission(submission_id, status, review_notes) {
    const res = await unrufld.functions.invoke('adminAuth', { op: 'reviewBlogSubmission', token: this.getToken(), submission_id, status, review_notes });
    return unwrap(res);
  },
  async listBlogVerifications() {
    const res = await unrufld.functions.invoke('adminAuth', { op: 'listBlogVerifications', token: this.getToken() });
    return unwrap(res);
  },
  async reviewBlogVerification(verification_id, status, review_notes) {
    const res = await unrufld.functions.invoke('adminAuth', { op: 'reviewBlogVerification', token: this.getToken(), verification_id, status, review_notes });
    return unwrap(res);
  },
  async listReferrals() {
    const res = await unrufld.functions.invoke('adminAuth', { op: 'listReferrals', token: this.getToken() });
    return unwrap(res);
  },
  async listTips() {
    const res = await unrufld.functions.invoke('adminAuth', { op: 'listTips', token: this.getToken() });
    return unwrap(res);
  },
  async saveTip(tipData) {
    const res = await unrufld.functions.invoke('adminAuth', { op: 'saveTip', token: this.getToken(), ...tipData });
    return unwrap(res);
  },
  async deleteTip(tip_id) {
    const res = await unrufld.functions.invoke('adminAuth', { op: 'deleteTip', token: this.getToken(), tip_id });
    return unwrap(res);
  },
  logout() {
    clearAdminSession();
  },
};

// Cross-tab session invalidation: when an admin signs out in one tab (which
// removes the token from localStorage), every other open admin tab hears the
// `storage` event and clears its own in-memory session — so a token lifted
// from a shared machine can't keep driving admin API calls from a stale tab
// after the admin has logged out elsewhere.
if (typeof window !== 'undefined') {
  window.addEventListener('storage', (e) => {
    if (e.key === TOKEN_KEY && !e.newValue) clearAdminSession();
  });
}