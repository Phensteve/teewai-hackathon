// InsForge-backed entity adapters for security/quota tables.
//
// These 3 tables (free_scan_usage, guest_scans, device_fingerprints) were
// migrated from Base44 entities to InsForge. The backend functions
// (freeScanQuota, syncDevice, logIpRegistration, referralReward,
// checkIpRegistration) used `svc.entities.X` with the Base44 SDK API.
// This module provides drop-in replacements with the same API shape.

import { makeInsforgeEntity } from "./insforgeEntity.ts";

export const FreeScanUsage = makeInsforgeEntity("free_scan_usage", {
  key_type: "keyType", key_value: "keyValue", scans_used: "scansUsed",
  last_scan: "lastScan", ip_address: "ipAddress",
});

export const GuestScan = makeInsforgeEntity("guest_scans", {
  device_hash: "deviceHash", ip_address: "ipAddress", scanned_at: "scannedAt",
});

export const DeviceFingerprint = makeInsforgeEntity("device_fingerprints", {
  device_hash: "deviceHash", user_id: "userId", user_email: "userEmail",
  ip_address: "ipAddress", is_paid: "isPaid",
});