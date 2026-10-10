import { createClientFromRequest } from "npm:@base44/sdk@0.8.40";

// Admin + env-key gated introspection of the proprietary engine (constant-time key check).
// Not reachable by non-admin users and not surfaced anywhere in the live UI.
// The dormant feature store is returned here only — it is never executed by
// the app. Requires ENGINE_ACCESS_KEY (env) AND an authenticated admin.
export default async function (req) {
  try {
    const unrufld = createClientFromRequest(req);
    const body = await req.json().catch(() => ({}));
    const key = Deno.env.get("ENGINE_ACCESS_KEY");
    if (!key) return Response.json({ error: "forbidden" }, { status: 403 });
    // Constant-time compare to avoid leaking the access key via timing.
    const ka = new TextEncoder().encode(String(body.access_key ?? ""));
    const kb = new TextEncoder().encode(key);
    if (ka.length !== kb.length) return Response.json({ error: "forbidden" }, { status: 403 });
    let diff = 0;
    for (let i = 0; i < ka.length; i++) diff |= ka[i] ^ kb[i];
    if (diff !== 0) return Response.json({ error: "forbidden" }, { status: 403 });

    const user = await unrufld.auth.me();
    if (!user || user.role !== "admin") return Response.json({ error: "forbidden" }, { status: 403 });

    return Response.json({
      engine: "unrufldteeth",
      version: "2.0",
      frameworks: {
        silness_loe_plaque: "0-3 Silness & Loe plaque index",
        loe_silness_gingival: "0-3 Loe & Silness gingival index",
        bewe: "0-9 basic erosive wear examination",
        dmf: "decayed/missing/filled surfaces (WHO surveillance)",
        icdas: "0-6 international caries detection & assessment system",
        vita_classical: "A1-D4 shade guide",
        vita_bleached: "0M1-0M3 bleaching scale",
      },
      features: {
        live: ["calibrated_scoring", "vita_shade_map", "severity_grading", "clinical_indices", "icdas_caries", "plaque_caries_reconciliation"],
        dormant: ["gingival_3d_mapping", "caries_depth_estimation", "plaque_timelapse", "shade_aging_curve", "occlusal_wear_predictor", "bruxism_screen", "microbiome_hint"],
      },
      involvement: {
        before_ai: "preAnalyze — pure client-side calibration context (brightness/usable), no model call",
        after_ai: "postProcess — proprietary scoring + plaque/caries reconciliation against clinical indices",
      },
    });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
}