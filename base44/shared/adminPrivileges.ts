// Admin tier privilege map. Tiers are assigned by a super_admin; each tier
// carries a preset of privileges. A super_admin can also override the preset
// per-admin (stored in the admin_privileges table) — the effective privilege
// set is the stored override if present, otherwise the tier preset.
//
// Used by both the backend (adminAuth review ops gate on these) and the
// frontend (AdminTierManager renders the checkboxes).

export const PRIVILEGES: Record<string, string> = {
  manage_admins: "Create & remove admins, assign tiers",
  review_medical_verifications: "Approve / reject medical personnel verification",
  review_medical_advice: "Review flagged & disputed medical advice",
  moderate_community: "Remove messages & manage rooms",
  manage_users: "Suspend users & grant scans",
  view_analytics: "View admin analytics",
  manage_feature_flags: "Toggle feature flags",
  manage_ip_bans: "Ban / unban guest IPs",
  review_blogs: "Approve / reject user-submitted blogs & author verifications",
};

export const PRIVILEGE_KEYS = Object.keys(PRIVILEGES);

export const TIER_PRIVILEGES: Record<string, string[]> = {
  super_admin: [...PRIVILEGE_KEYS],
  medical_admin: ["review_medical_verifications", "review_medical_advice", "moderate_community"],
  content_admin: ["review_blogs", "moderate_community"],
  admin: ["manage_users", "moderate_community", "view_analytics", "manage_ip_bans"],
  viewer: ["view_analytics"],
};

export const TIER_LABELS: Record<string, string> = {
  super_admin: "Super admin",
  medical_admin: "Medical admin",
  content_admin: "Content admin",
  admin: "Admin",
  viewer: "Viewer",
};

export function tierPrivileges(role: string): string[] {
  return TIER_PRIVILEGES[role] || ["view_analytics"];
}

export function hasPrivilege(privs: string[] | null | undefined, key: string): boolean {
  return Array.isArray(privs) && privs.includes(key);
}

// Effective privileges: a stored override wins, otherwise the tier preset.
export function effectivePrivileges(role: string, stored?: string[] | null): string[] {
  if (Array.isArray(stored) && stored.length >= 0 && stored != null) return stored;
  return tierPrivileges(role);
}