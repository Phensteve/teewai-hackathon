import { createClientFromRequest } from "npm:@base44/sdk@0.8.40";
import {
  buildTeewaiPrompt,
  TEEWAI_RESPONSE_SCHEMA,
  TEEWAI_FULL_RESPONSE_SCHEMA,
  buildBracesPrompt,
  BRACES_RESPONSE_SCHEMA,
} from "../../shared/teewai.ts";
import { buildScanPayload, splitScanRow, rowToScanEntity } from "../../shared/scoring.ts";
import { callInsforge } from "../../shared/insforgeRateLimit.ts";
import { buildQuery, INSFORGE_BASE_URL, authHeaders, extractStorageKey } from "../../shared/insforge.ts";
import { computeStreak, computeMMR, rollReward, getNewlyEarned, getRank } from "../../shared/gamification.ts";
import { rollTrait } from "../../shared/smileTraits.ts";
import { logConsent } from "../../shared/consentLog.ts";

// Runs the teewai dental vision AI analysis server-side. The analysis takes
// ~10-20s with gemini_3_flash (no web search — product recommendations come
// from the model's training knowledge). Backend functions have a 5-minute
// execution limit, so the call completes reliably here.
//
// DROP-SURVIVAL: when the caller passes `scan_id` (the "analyzing" record it
// already created), this function also persists the completed result directly
// to the InsForge scans table. So if the client's connection drops during the
// long AI call, the scan is still saved — the user doesn't lose it. The client
// adopts the returned `_scan` and skips its own create/update. Without
// `scan_id` the function behaves exactly as before (returns the raw result),
// so callers that persist client-side (e.g. BracesCheck) are unaffected.
// Server-side gamification: computes the reward, smile trait, MMR and newly
// earned milestones from the user's scan history, then persists UserProgress.
// Runs entirely on the backend so a dropped client connection no longer loses
// the reward / MMR update. Returns the payload (also stored on the scan record
// so the client can poll for it after a drop).
async function runGamification(user: any, newScan: any, scanId?: string, artificialWhitening?: boolean, prefetched?: any[] | null) {
  // Load the user's recent scans (newest first) for streak / MMR computation.
  // Exclude the current "analyzing" row — it has no score yet and is
  // represented by the synthetic new scan added below (avoids double-counting).
  // When `prefetched` is supplied (overlapped with the AI call), reuse those
  // results instead of re-fetching — cuts the post-AI serial wait.
  let scansRes: any, progRes: any;
  if (prefetched && prefetched.length === 2) {
    [scansRes, progRes] = prefetched;
  } else {
    scansRes = await callInsforge(
      `/api/database/records/scans?${buildQuery({ userId: user.id }, { order: { column: "created_at", ascending: false }, limit: 50 })}`
    );
    progRes = await callInsforge(
      `/api/database/records/user_progress?${buildQuery({ userId: user.id }, { limit: 1 })}`
    );
  }
  const existingRows = (scansRes.ok && Array.isArray(scansRes.data) ? scansRes.data : [])
    .filter((r: any) => r.id !== scanId);
  const existingScans = existingRows.map(rowToScanEntity);
  // The new scan isn't in the list yet — add a synthetic copy at the front.
  const syntheticNew = {
    score: newScan.score,
    dental_health_score: newScan.dental_health_score,
    created_date: new Date().toISOString(),
  };
  const allScans = [syntheticNew, ...existingScans];
  const streak = computeStreak(allScans);
  const mmr = computeMMR(allScans, streak);
  const improvement = allScans.length >= 2 ? (allScans[0]?.score || 0) - (allScans[allScans.length - 1]?.score || 0) : 0;
  const stats = { scans: allScans.length, streak, mmr, improvement };
  const trait = rollTrait(streak, allScans.length);
  const reward = rollReward();

  const progRow = progRes?.ok && Array.isArray(progRes?.data) ? progRes.data[0] : null;
  const prevData: Record<string, any> = progRow?.data || {};
  const prevEarned: string[] = Array.isArray(prevData.milestones_earned) ? prevData.milestones_earned : [];
  const newMilestones = getNewlyEarned(stats, prevEarned);
  const milestoneXP = newMilestones.reduce((a: number, m: any) => a + (m.xp || 0), 0);
  const prevMmr = typeof prevData.mmr === "number" ? prevData.mmr : (progRow?.mmr || 0);
  const peakMmr = Math.max(prevData.peak_mmr || 0, mmr);
  const peakRankInfo = getRank(peakMmr);
  const totalXP = (prevData.total_xp || 0) + reward.xp + milestoneXP;
  const seasonXP = (prevData.season_xp || 0) + reward.xp + milestoneXP;
  const rewards = [...(Array.isArray(prevData.rewards_earned) ? prevData.rewards_earned : []), reward.key];
  const milestones = [...prevEarned, ...newMilestones.map((m: any) => m.id)];
  const charms = reward.key === "charm"
    ? [...(Array.isArray(prevData.charms_collected) ? prevData.charms_collected : []), `charm_${Date.now()}`]
    : (Array.isArray(prevData.charms_collected) ? prevData.charms_collected : []);

  const progressData: Record<string, any> = {
    mmr,
    peak_mmr: peakMmr,
    peak_rank: peakRankInfo.rank.name,
    total_xp: totalXP,
    season_xp: seasonXP,
    rewards_earned: rewards,
    milestones_earned: milestones,
    charms_collected: charms,
    last_scan_date: new Date().toISOString(),
    // Sticky flag: once a scan ever matches a bleached (0M) shade, the user is
    // marked as having undergone professional / artificial whitening.
    artificial_whitening: Boolean(artificialWhitening) || Boolean(prevData.artificial_whitening),
  };

  if (progRow) {
    const merged = { ...prevData, ...progressData };
    await callInsforge(
      `/api/database/records/user_progress?${buildQuery({ id: progRow.id })}`,
      {
        method: "PATCH",
        headers: { Prefer: "return=representation" },
        body: JSON.stringify({ mmr, peakMmr, totalXp: totalXP, seasonXp: seasonXP, data: merged }),
      }
    );
  } else {
    await callInsforge(`/api/database/records/user_progress`, {
      method: "POST",
      headers: { Prefer: "return=representation" },
      body: JSON.stringify([{ userId: user.id, mmr, peakMmr, totalXp: totalXP, seasonXp: seasonXP, data: progressData }]),
    });
  }

  const rankInfo = getRank(mmr);
  const prevRankInfo = getRank(prevMmr);
  return {
    reward,
    trait,
    milestones: newMilestones,
    mmr,
    rank: rankInfo,
    prevRank: prevRankInfo,
    peakMmr,
    peakRank: peakRankInfo.rank.name,
    totalXp: totalXP,
    seasonXp: seasonXP,
    isFirst: allScans.length === 1,
  };
}

export default async function(req) {
  // Hoisted so the catch block can clean up the "analyzing" row on failure.
  let scan_id: string | undefined;
  try {
    const unrufld = createClientFromRequest(req);
    const user = await unrufld.auth.me();
    if (!user) return Response.json({ error: "Unauthorized" }, { status: 401 });

    const body = await req.json().catch(() => ({}));
    const { file_url, file_urls, position, mode, dentist_id, image_url, image_urls, scan_mode, scan_type, appliance_type } = body;
    scan_id = body.scan_id;
    // Full (5-photo) scan: the caller passes `file_urls` (an array of analysis
    // URLs) + `image_urls` (the stored InsForge URLs). Quick scan passes a
    // single `file_url` + `image_url` as before.
    const isFullScan = Array.isArray(file_urls) && file_urls.length > 1;
    if (!file_url && !isFullScan) return Response.json({ error: "file_url is required" }, { status: 400 });

    // mode === "braces" runs the orthodontic alignment screening instead of the
    // full whitening/health analysis. It skips web search (no product research
    // needed) so the braces check completes faster.
    const isBraces = mode === "braces";
    const rawVisionFiles = isFullScan ? file_urls : [file_url];

    // The teeth-scans bucket is PRIVATE, so InvokeLLM (which fetches file URLs
    // server-side without auth headers) can't read the InsForge URLs. Fetch the
    // bytes with the service token and re-upload each to Base44 PRIVATE storage,
    // then mint a short-lived signed URL (120s) for the vision call. The copy
    // is never publicly accessible — only the signed URL can reach it, and it
    // expires within two minutes. The file_uri is not stored anywhere (not in
    // the scan record, not linked to the user), so the copy is ephemeral and
    // private even if it isn't explicitly deleted.
    const visionFiles: string[] = [];
    for (const url of rawVisionFiles) {
      try {
        if (!url) continue;
        const key = extractStorageKey(url);
        if (!key) {
          // Not an InsForge URL — the client already mirrored the photo to
          // Base44 public storage (UploadFile), so InvokeLLM can read this
          // URL directly. No re-upload needed.
          visionFiles.push(url);
          continue;
        }
        // InsForge private URL — fetch with the service token and re-upload to
        // Base44 private storage, then mint a short-lived signed URL (120s).
        // The InsForge storage endpoint is behind a WAF that 403s requests
        // without a browser User-Agent — send one or the photo fetch fails.
        const res = await fetch(
          `${INSFORGE_BASE_URL}/api/storage/buckets/teeth-scans/objects/${encodeURIComponent(key)}`,
          { headers: { ...authHeaders(), "User-Agent": "Mozilla/5.0 teewai" } }
        );
        if (!res.ok) continue;
        const blob = await res.blob();
        const file = new File([blob], `scan_${Date.now()}.jpg`, { type: blob.type || "image/jpeg" });
        const up = await unrufld.integrations.Core.UploadPrivateFile({ file });
        if (!up?.file_uri) continue;
        const signed = await unrufld.integrations.Core.CreateFileSignedUrl({ file_uri: up.file_uri, expires_in: 120 });
        if (signed?.signed_url) visionFiles.push(signed.signed_url);
      } catch {}
    }
    if (!visionFiles.length || (isFullScan && (rawVisionFiles.length !== 5 || visionFiles.length !== 5))) {
      return Response.json({ needs_another_photo: true, ai_feedback: 'All requested photos could not be loaded. Retry the scan; no scan credit was used.', _scan: null });
    }

    // Consent logging: record that the user consented to AI processing of
    // their scan photo. Server-side + server-timestamped + IP-stamped, so it
    // is tamper-evident — the user cannot repudiate that processing occurred
    // under their authenticated session at this time.
    logConsent(req, user, isBraces ? "ai_braces_scan" : "ai_scan_analysis", scan_id ? `scan_id=${scan_id}` : "no_scan_id").catch(() => {});
    // Prefetch the gamification history (recent scans + user_progress) in
    // parallel with the AI vision call so the post-AI gamification step has
    // its data ready and doesn't add a serial wait. Braces scans skip
    // gamification, so they don't prefetch.
    const gamPrefetch = (scan_id && !isBraces)
      ? Promise.all([
          callInsforge(`/api/database/records/scans?${buildQuery({ userId: user.id }, { order: { column: "created_at", ascending: false }, limit: 50 })}`),
          callInsforge(`/api/database/records/user_progress?${buildQuery({ userId: user.id }, { limit: 1 })}`),
        ]).catch(() => null)
      : null;
    // Web search (add_context_from_internet) was enabled for teeth scans to
    // look up real product names/prices, but it added ~15-25s per scan. The
    // LLM already knows common dental brands from training, and the prompt
    // only asks for price_range (not live prices), so we disabled web search
    // — cutting scan time roughly in half (~25-40s → ~10-20s) without losing
    // product recommendations.
    const result = await unrufld.integrations.Core.InvokeLLM({
      prompt: isBraces ? buildBracesPrompt(position || "front") : buildTeewaiPrompt(position || "front", isFullScan, appliance_type),
      file_urls: visionFiles,
      add_context_from_internet: false,
      model: "gemini_3_flash",
      response_json_schema: isBraces ? BRACES_RESPONSE_SCHEMA : isFullScan ? TEEWAI_FULL_RESPONSE_SCHEMA : TEEWAI_RESPONSE_SCHEMA,
    });

    // Rejected photos never become scored scans or earn rewards. The caller
    // handles the retake and removes its own temporary analyzing row.
    if (result?.needs_another_photo === true || (!isBraces && !result?.tooth_analysis?.length)) {
      return Response.json({ needs_another_photo: true, ai_feedback: result?.ai_feedback || result?.summary || 'Teeth are not readable in this photo. Retake a sharp close-up with even light.', summary: result?.summary, _scan: null });
    }

    // Persist server-side only when the caller handed us its "analyzing" row.
    // This is the drop-survival path: the record is updated to "completed"
    // here, so a lost client connection during the AI call no longer loses the
    // scan. Ownership is verified before writing (the service token can write
    // any row, so we constrain it to the caller's own scan).
    if (scan_id) {
      try {
        const payload = buildScanPayload(result, {
          position: position || "front",
          patientEmail: user.email || null,
          dentistId: dentist_id || null,
          imageUrl: image_url || null,
          imageUrls: image_urls || null,
          scanMode: scan_mode || (isBraces ? "braces" : "teeth"),
          scanType: scan_type || (isFullScan ? "full" : "quick"),
        });
        const row = splitScanRow(payload);

        // Read the existing "analyzing" row to verify ownership + merge `data`.
        const existing = await callInsforge(
          `/api/database/records/scans?${buildQuery({ id: scan_id }, { limit: 1 })}`
        );
        const existingRow = existing.ok && Array.isArray(existing.data) ? existing.data[0] : null;
        if (!existingRow) {
          return Response.json({ ...result, _scan: null, _persist_error: "scan record not found" });
        }
        if (existingRow.userId !== user.id) {
          return Response.json({ error: "Forbidden" }, { status: 403 });
        }

        // === SERVER-SIDE GAMIFICATION ===
        // Compute the reward, trait, MMR and milestones here so a dropped
        // client connection no longer loses them. The result is stored on the
        // scan record (for client polling) and UserProgress is updated.
        let gamification: any = null;
        if (!isBraces) {
          try {
            gamification = await runGamification(user, payload, scan_id, payload.artificial_whitening_detected, await gamPrefetch);
          } catch {}
        }

        // InsForge replaces the `data` JSONB on PATCH, so merge first to keep
        // the original image_url + any fields the client set on the analyzing row.
        const mergedData: Record<string, any> = { ...(existingRow.data || {}), ...row.data };
        if (gamification?.trait?.id) mergedData.smile_trait = gamification.trait.id;
        if (gamification) mergedData.gamification = gamification;
        const updateBody: Record<string, any> = { data: mergedData };
        if (row.score !== undefined) updateBody.score = row.score;
        if (row.shade !== undefined) updateBody.shade = row.shade;

        const updated = await callInsforge(
          `/api/database/records/scans?${buildQuery({ id: scan_id })}`,
          {
            method: "PATCH",
            headers: { Prefer: "return=representation" },
            body: JSON.stringify(updateBody),
          }
        );
        const savedRow = updated.ok && Array.isArray(updated.data) ? updated.data[0] : null;
        return Response.json({ ...result, _scan: rowToScanEntity(savedRow), _gamification: gamification });
      } catch {
        // Persist failed — still return the AI result so the client can fall
        // back to its own create/update (the old code path).
        return Response.json({ ...result, _scan: null, _gamification: null });
      }
    }

    return Response.json(result);
  } catch (error) {
    // AI analysis (or auth) failed. If the caller created an "analyzing" row,
    // delete it so it doesn't linger as a stuck live scan on the admin
    // dashboard. (Network drops are different: the client never gets a
    // response, so it no longer deletes — the backend keeps running and
    // persists the completed scan server-side via the drop-survival path.)
    if (scan_id) {
      try {
        await callInsforge(
          `/api/database/records/scans?${buildQuery({ id: scan_id })}`,
          { method: "DELETE" }
        );
      } catch {}
    }
    return Response.json({ error: error.message }, { status: 500 });
  }
}