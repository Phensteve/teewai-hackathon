import { createClientFromRequest } from "npm:@base44/sdk@0.8.52";
import {
  INSFORGE_BASE_URL,
  authHeaders,
  buildQuery,
  extractStorageKey,
} from "../../shared/insforge.ts";
import { callInsforge } from "../../shared/insforgeRateLimit.ts";

// Dentist review backend — the human-review tier on top of AI scans.
//
// A patient who has completed an AI scan can request a real dentist to review
// their photos and AI findings. The dentist sees the scan in their portal,
// writes a professional report, and the patient receives it — bridging the
// AI-only scan with human clinical oversight (Toothpic-style).
//
// Ops:
//  create         — patient creates a review request (auto-assigns to their
//                   primary dentist, or a partner dentist they selected)
//  listForDentist — dentist lists their review queue (optionally by status)
//  listForPatient— patient lists their reviews (optionally by scan_id)
//  getDetails    — dentist fetches a review + its scan data + photos as base64
//  submitReview  — dentist submits their report + urgency, patient is emailed

function bufToB64(buf: ArrayBuffer): string {
  const bytes = new Uint8Array(buf);
  let binary = "";
  const chunk = 0x8000;
  for (let i = 0; i < bytes.length; i += chunk) {
    binary += String.fromCharCode(...bytes.subarray(i, i + chunk));
  }
  return btoa(binary);
}

// Fetch a single private InsForge photo as a base64 data URL (service-role).
async function fetchPhotoDataUrl(url: string): Promise<string | null> {
  try {
    const key = extractStorageKey(url);
    if (!key) return null;
    const bucket = "teeth-scans";
    const binHeaders = authHeaders();
    delete binHeaders["Content-Type"];
    const res = await fetch(
      `${INSFORGE_BASE_URL}/api/storage/buckets/${encodeURIComponent(bucket)}/objects/${encodeURIComponent(key)}`,
      { headers: { ...binHeaders, Accept: "*/*", "User-Agent": "Mozilla/5.0 teewai" } }
    );
    if (!res.ok) return null;
    const ct = (res.headers.get("content-type") || "").split(";")[0].trim() || "image/jpeg";
    if (ct && !ct.startsWith("image/") && ct !== "application/octet-stream") return null;
    const buf = await res.arrayBuffer();
    return `data:${ct};base64,${bufToB64(buf)}`;
  } catch {
    return null;
  }
}

// Fetch a scan record from InsForge by id (service-role, bypasses user RLS).
async function getScanById(scanId: string) {
  const r = await callInsforge(
    `/api/database/records/scans?${buildQuery({ id: scanId }, { limit: 1 })}`
  );
  if (!r.ok || !Array.isArray(r.data) || !r.data.length) return null;
  const row = r.data[0];
  return { userId: row.userId, data: row.data || {}, id: row.id };
}

export default async function (req) {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) return Response.json({ error: "Unauthorized" }, { status: 401 });

    const body = await req.json().catch(() => ({}));
    const { op } = body;

    // ── create: patient requests a dentist review ──────────────────────────
    if (op === "create") {
      const scanId = String(body.scan_id || "").trim();
      if (!scanId) return Response.json({ error: "Scan ID is required" }, { status: 400 });

      // Fetch the scan from InsForge and verify the patient owns it.
      const scan = await getScanById(scanId);
      if (!scan) return Response.json({ error: "Scan not found" }, { status: 404 });
      if (scan.userId !== user.id) return Response.json({ error: "You can only request reviews for your own scans" }, { status: 403 });

      // Check for an existing non-terminal review for this scan.
      const existing = await base44.entities.DentistReview.filter({
        scan_id: scanId,
        patient_id: user.id,
      });
      if (existing.some((r) => r.status === "pending" || r.status === "reviewed")) {
        return Response.json({ ok: false, reason: "already_exists", review: existing.find((r) => r.status === "pending" || r.status === "reviewed") });
      }

      // Resolve the dentist: explicit choice > patient's primary assignment > error.
      let dentistProfileId = String(body.dentist_id || "").trim();
      let dentistProfile: any = null;

      if (dentistProfileId) {
        const profiles = await base44.asServiceRole.entities.DentistProfile.filter({ id: dentistProfileId });
        dentistProfile = profiles[0];
      } else {
        // Look up the patient's active primary dentist assignment.
        const assignments = await base44.asServiceRole.entities.DentistAssignment.filter({
          patient_id: user.id,
          status: "active",
          assignment_type: "primary",
        });
        if (assignments.length > 0) {
          dentistProfileId = assignments[0].dentist_id;
          const profiles = await base44.asServiceRole.entities.DentistProfile.filter({ id: dentistProfileId });
          dentistProfile = profiles[0];
        }
      }

      if (!dentistProfile) {
        return Response.json({ error: "No dentist selected and no primary dentist assigned. Pick a dentist first." }, { status: 400 });
      }

      const patientName = user.full_name || user.username || user.display_name || user.email || "Patient";
      const dentistName = dentistProfile.full_name || dentistProfile.clinic_name || "Your dentist";
      const patientQuestion = String(body.patient_question || "").trim().slice(0, 500);

      const review = await base44.entities.DentistReview.create({
        scan_id: scanId,
        patient_id: user.id,
        patient_email: user.email || "",
        patient_name: patientName,
        dentist_id: dentistProfile.id,
        dentist_user_id: dentistProfile.user_id,
        dentist_name: dentistName,
        status: "pending",
        patient_question: patientQuestion || "",
      });

      // Notify the dentist by email (best-effort — never block the request).
      try {
        const dentistUser = await base44.asServiceRole.entities.User.filter({ id: dentistProfile.user_id });
        const dentistEmail = dentistUser[0]?.email;
        if (dentistEmail) {
          await base44.integrations.Core.SendEmail({
            to: dentistEmail,
            subject: `New scan review request from ${patientName}`,
            body: `<div style="font-family:sans-serif;max-width:480px;margin:0 auto;padding:24px;">
              <h2 style="color:#00b8a5;">New scan review request</h2>
              <p>${patientName} has requested a review of their recent teeth scan.</p>
              ${patientQuestion ? `<p><strong>Their question:</strong> ${patientQuestion}</p>` : ""}
              <p>Log in to your teewai dentist portal to review the scan and write your report.</p>
              <a href="https://teewai.base44.app/dentist-reviews" style="display:inline-block;background:#00b8a5;color:#000;padding:12px 24px;border-radius:8px;text-decoration:none;font-weight:600;margin-top:12px;">Open review queue</a>
            </div>`,
            from_name: "teewai",
          });
        }
      } catch {}

      return Response.json({ ok: true, review });
    }

    // ── listForDentist: dentist fetches their review queue ────────────────
    if (op === "listForDentist") {
      const profiles = await base44.asServiceRole.entities.DentistProfile.filter({ user_id: user.id });
      if (!profiles.length) return Response.json({ error: "No dentist profile found" }, { status: 403 });

      const filters: any = { dentist_user_id: user.id };
      if (body.status) filters.status = String(body.status);
      const reviews = await base44.entities.DentistReview.filter(filters, "-created_date", 100);
      return Response.json({ ok: true, reviews });
    }

    // ── listForPatient: patient fetches their reviews ──────────────────────
    if (op === "listForPatient") {
      const filters: any = { patient_id: user.id };
      if (body.scan_id) filters.scan_id = String(body.scan_id);
      const reviews = await base44.entities.DentistReview.filter(filters, "-created_date", 50);
      return Response.json({ ok: true, reviews });
    }

    // ── getDetails: dentist fetches a review + scan data + photos ──────────
    if (op === "getDetails") {
      const reviewId = String(body.review_id || "").trim();
      if (!reviewId) return Response.json({ error: "Review ID is required" }, { status: 400 });

      const reviews = await base44.entities.DentistReview.filter({ id: reviewId });
      const review = reviews[0];
      if (!review) return Response.json({ error: "Review not found" }, { status: 404 });
      if (review.dentist_user_id !== user.id && user.role !== "admin") {
        return Response.json({ error: "You can only view reviews assigned to you" }, { status: 403 });
      }

      // Fetch the scan from InsForge (service-role).
      const scan = await getScanById(review.scan_id);
      const scanData = scan?.data || null;

      // Fetch photos as base64 data URLs so the dentist can view them.
      const photos: string[] = [];
      if (scanData) {
        const urls: string[] = [];
        if (scanData.image_url) urls.push(scanData.image_url);
        if (Array.isArray(scanData.image_urls)) for (const u of scanData.image_urls) if (u) urls.push(u);
        const results = await Promise.all(urls.map(fetchPhotoDataUrl));
        for (const r of results) if (r) photos.push(r);
      }

      return Response.json({ ok: true, review, scan: scanData, photos });
    }

    // ── submitReview: dentist submits their report ─────────────────────────
    if (op === "submitReview") {
      const reviewId = String(body.review_id || "").trim();
      if (!reviewId) return Response.json({ error: "Review ID is required" }, { status: 400 });

      const reviews = await base44.entities.DentistReview.filter({ id: reviewId });
      const review = reviews[0];
      if (!review) return Response.json({ error: "Review not found" }, { status: 404 });
      if (review.dentist_user_id !== user.id && user.role !== "admin") {
        return Response.json({ error: "You can only submit reviews assigned to you" }, { status: 403 });
      }

      const report = String(body.dentist_report || "").trim();
      const summary = String(body.dentist_summary || "").trim();
      const urgency = ["routine", "soon", "urgent"].includes(body.urgency) ? body.urgency : "routine";
      if (!report) return Response.json({ error: "Report cannot be empty" }, { status: 400 });

      const updated = await base44.entities.DentistReview.update(reviewId, {
        status: "reviewed",
        dentist_report: report.slice(0, 2000),
        dentist_summary: summary.slice(0, 200),
        urgency,
        reviewed_date: new Date().toISOString(),
      });

      // Notify the patient by email (best-effort).
      try {
        if (review.patient_email) {
          await base44.integrations.Core.SendEmail({
            to: review.patient_email,
            subject: `Your dentist review is ready`,
            body: `<div style="font-family:sans-serif;max-width:480px;margin:0 auto;padding:24px;">
              <h2 style="color:#00b8a5;">Your dentist review is ready</h2>
              <p>${review.dentist_name} has reviewed your scan and written a report.</p>
              ${summary ? `<p><strong>Summary:</strong> ${summary}</p>` : ""}
              <p>Open the teewai app to read the full report.</p>
              <a href="https://teewai.base44.app/dashboard" style="display:inline-block;background:#00b8a5;color:#000;padding:12px 24px;border-radius:8px;text-decoration:none;font-weight:600;margin-top:12px;">Open teewai</a>
            </div>`,
            from_name: "teewai",
          });
        }
      } catch {}

      return Response.json({ ok: true, review: updated });
    }

    // ── cancel: patient cancels a pending review ───────────────────────────
    if (op === "cancel") {
      const reviewId = String(body.review_id || "").trim();
      if (!reviewId) return Response.json({ error: "Review ID is required" }, { status: 400 });

      const reviews = await base44.entities.DentistReview.filter({ id: reviewId });
      const review = reviews[0];
      if (!review) return Response.json({ error: "Review not found" }, { status: 404 });
      if (review.patient_id !== user.id && user.role !== "admin") {
        return Response.json({ error: "You can only cancel your own reviews" }, { status: 403 });
      }
      if (review.status !== "pending") {
        return Response.json({ error: "Only pending reviews can be cancelled" }, { status: 400 });
      }

      const updated = await base44.entities.DentistReview.update(reviewId, { status: "cancelled" });
      return Response.json({ ok: true, review: updated });
    }

    return Response.json({ error: `Unknown op "${op}"` }, { status: 400 });
  } catch (e) {
    return Response.json({ error: e.message }, { status: 500 });
  }
}