// Frontend mirror of base44/shared/adminPrivileges.ts — the admin tier
// privilege map used by the AdminTierManager. Kept in sync with the backend
// module so the checkboxes the super admin sees match what the server enforces.

export const PRIVILEGES = {
  manage_admins: 'Create & remove admins, assign tiers',
  review_medical_verifications: 'Approve / reject medical personnel verification',
  review_medical_advice: 'Review flagged & disputed medical advice',
  moderate_community: 'Remove messages & manage rooms',
  manage_users: 'Suspend users & grant scans',
  view_analytics: 'View admin analytics',
  manage_feature_flags: 'Toggle feature flags',
  manage_ip_bans: 'Ban / unban guest IPs',
  review_blogs: 'Approve / reject user-submitted blogs & author verifications',
};

export const PRIVILEGE_KEYS = Object.keys(PRIVILEGES);

export const TIER_PRIVILEGES = {
  super_admin: [...PRIVILEGE_KEYS],
  medical_admin: ['review_medical_verifications', 'review_medical_advice', 'moderate_community'],
  content_admin: ['review_blogs', 'moderate_community'],
  admin: ['manage_users', 'moderate_community', 'view_analytics', 'manage_ip_bans'],
  viewer: ['view_analytics'],
};

export const TIER_LABELS = {
  super_admin: 'Super admin',
  medical_admin: 'Medical admin',
  content_admin: 'Content admin',
  admin: 'Admin',
  viewer: 'Viewer',
};

export function tierPrivileges(role) {
  return TIER_PRIVILEGES[role] || ['view_analytics'];
}

export function hasPrivilege(privs, key) {
  return Array.isArray(privs) && privs.includes(key);
}