import { createClientFromRequest } from "npm:@base44/sdk@0.8.52";
import { secrets } from "base44:runtime";
import { buildQuery } from "../../shared/insforge.ts";
import { callInsforge } from "../../shared/insforgeRateLimit.ts";
import { buildScanContext, buildFoodContext, buildHabitContext, buildSystemPrompt, sanitizeForPrompt, validateOutput, formatRelativeDate } from "../../shared/askTeewaiPrompt.ts";
import { normalizeHabitLog, computeHabitEstimate } from "../../shared/habitEstimate.ts";

// Ask Teewai — personalized dental-knowledge Q&A.
//
// Architecture:
// - Featherless AI is the PRIMARY LLM (user's own API key, OpenAI-compatible).
// - Backboard.io stores conversation threads server-side (not localStorage) for
//   privacy. History is retrieved from Backboard and fed to Featherless as context.
// - If Featherless fails (429/503/timeout) after retry + exponential backoff,
//   Backboard's /threads/messages is used as a FALLBACK for generation (which
//   also stores the conversation).
// - When Featherless succeeds, the conversation is stored in Backboard via an
//   echo prompt so the thread has the user message + a mirrored assistant response.
//
// Retry: up to 3 retries with exponential backoff (1s, 2s, 4s) on 429/503/timeout.
//
// Frontend sends: { message, thread_id?, stream? } or { load: true, thread_id }
// Non-streaming returns: { content, thread_id, images }
// Streaming returns SSE: images → content chunks → done (with thread_id)
// Load mode returns: { messages: [{role, text}, ...] }

// Normalize an InsForge scan record (fields can be at top level or nested in .data).
function normalizeScan(s: any) {
  const d = s.data || {};
  return {
    score: s.score ?? d.score ?? 0,
    shade_code: s.shade_code ?? d.shade_code,
    shade: s.shade ?? d.shade,
    stain_types: s.stain_types ?? d.stain_types,
    gum_health: s.gum_health ?? d.gum_health,
    plaque_level: s.plaque_level ?? d.plaque_level,
    dental_health_score: s.dental_health_score ?? d.dental_health_score,
    dental_health_issues: s.dental_health_issues ?? d.dental_health_issues,
    enamel_condition: s.enamel_condition ?? d.enamel_condition,
    whitening_potential_score: s.whitening_potential_score ?? d.whitening_potential_score,
    whitening_potential_shade: s.whitening_potential_shade ?? d.whitening_potential_shade,
    color_correcting_product_detected: s.color_correcting_product_detected ?? d.color_correcting_product_detected,
    artificial_whitening_detected: s.artificial_whitening_detected ?? d.artificial_whitening_detected,
    image_url: d.image_url || null,
    image_urls: d.image_urls || null,
    scan_type: d.scan_type || 'quick',
    created_at: s.created_at || d.created_date,
  };
}

// Normalize an InsForge stain_log record for food photos + diet context.
function normalizeStainLog(s: any) {
  const d = s.data || {};
  return {
    item_name: s.itemName ?? d.item_name ?? null,
    category: d.category || null,
    stain_level: d.stain_level ?? 0,
    image_url: d.image_url || null,
    log_date: s.logDate ?? d.log_date ?? s.created_at,
    created_at: s.created_at,
  };
}

// Extract displayable images from scans + food logs.
function extractImages(scans: any[], stainLogs: any[]): any[] {
  const images: any[] = [];
  for (const s of scans.slice(0, 4)) {
    const url = s.image_url || (s.image_urls?.[0]);
    if (!url) continue;
    images.push({
      url, type: 'teeth', date: s.created_at,
      label: `Teeth · ${formatRelativeDate(s.created_at)}`,
      score: s.score, shade: s.shade_code || s.shade,
    });
  }
  let foodCount = 0;
  for (const log of stainLogs) {
    if (!log.image_url) continue;
    images.push({
      url: log.image_url, type: 'food',
      date: log.log_date || log.created_at,
      label: log.item_name || 'Food',
    });
    foodCount++;
    if (foodCount >= 3) break;
  }
  return images;
}

// Retrieve conversation history from a Backboard thread.
// Returns messages in OpenAI format: [{role: "user"|"assistant", content: "..."}]
async function getBackboardHistory(bbApiKey: string, threadId: string | undefined): Promise<any[]> {
  if (!threadId) return [];
  try {
    const res = await fetch(`https://app.backboard.io/api/threads/${threadId}`, {
      headers: { "X-API-Key": bbApiKey },
      signal: AbortSignal.timeout(10000),
    });
    if (!res.ok) return [];
    const thread = await res.json();
    return (thread.messages || [])
      .filter((m: any) => m.role === "user" || m.role === "assistant")
      .slice(-10)
      .map((m: any) => ({ role: m.role, content: String(m.content || "") }));
  } catch { return []; }
}

// Store a conversation turn in Backboard by sending the user message with a
// system prompt that asks the LLM to echo the Featherless response. This stores
// the user message + a mirrored assistant response in the thread, preserving
// conversation history for future context.
async function storeInBackboard(
  bbApiKey: string,
  threadId: string | undefined,
  userMessage: string,
  assistantResponse: string
): Promise<string> {
  try {
    const echoPrompt =
      `You are a conversation archiver. The user's message has already been answered. ` +
      `Reply with EXACTLY the following text, word for word, with no additions, ` +
      `modifications, or commentary:\n\n${assistantResponse}`;
    const res = await fetch("https://app.backboard.io/api/threads/messages", {
      method: "POST",
      headers: { "X-API-Key": bbApiKey, "Content-Type": "application/json" },
      body: JSON.stringify({
        content: userMessage,
        thread_id: threadId,
        system_prompt: echoPrompt,
        stream: false,
      }),
      signal: AbortSignal.timeout(30000),
    });
    if (res.ok) {
      const data = await res.json();
      return data.thread_id || threadId || "";
    }
    return threadId || "";
  } catch { return threadId || ""; }
}

// Call Featherless with retry + exponential backoff.
// Retries on 429 (rate limit), 503 (service unavailable), and timeout/network errors.
// Returns { ok: true, res } on success, { ok: false, ... } on failure.
async function callFeatherlessWithRetry(
  url: string,
  body: string,
  apiKey: string | null,
  timeoutMs: number,
  maxRetries = 3
): Promise<{ ok: true; res: Response } | { ok: false; status?: number; errText?: string; error?: Error }> {
  if (!apiKey) return { ok: false, error: new Error("Featherless API key not configured") };
  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    try {
      const res = await fetch(url, {
        method: "POST",
        headers: { Authorization: `Bearer ${apiKey}`, "Content-Type": "application/json" },
        body,
        signal: AbortSignal.timeout(timeoutMs),
      });
      if (res.ok) return { ok: true, res };
      // Retry on 429 (rate limit) or 503 (service unavailable)
      if ((res.status === 429 || res.status === 503) && attempt < maxRetries) {
        const delay = Math.pow(2, attempt) * 1000; // 1s, 2s, 4s
        await new Promise((r) => setTimeout(r, delay));
        continue;
      }
      const errText = await res.text().catch(() => "");
      return { ok: false, status: res.status, errText };
    } catch (e) {
      // Retry on timeout / network errors
      if (attempt < maxRetries) {
        const delay = Math.pow(2, attempt) * 1000;
        await new Promise((r) => setTimeout(r, delay));
        continue;
      }
      return { ok: false, error: e as Error };
    }
  }
  return { ok: false, error: new Error("Max retries exceeded") };
}

// Call Backboard as a fallback for generation (also stores the conversation).
async function callBackboard(
  bbApiKey: string,
  threadId: string | undefined,
  message: string,
  systemPrompt: string,
  stream: boolean
): Promise<Response> {
  return fetch("https://app.backboard.io/api/threads/messages", {
    method: "POST",
    headers: { "X-API-Key": bbApiKey, "Content-Type": "application/json" },
    body: JSON.stringify({
      content: message,
      thread_id: threadId,
      system_prompt: systemPrompt,
      llm_provider: "openrouter",
      model_name: "deepseek/deepseek-chat-v3.1",
      stream,
    }),
    signal: AbortSignal.timeout(stream ? 60000 : 45000),
  });
}

// Strip URLs and image markdown from a text chunk (soft validation).
function softClean(text: string): string {
  return text
    .replace(/https?:\/\/\S+/gi, "")
    .replace(/<img\s[^>]*>/gi, "")
    .replace(/!\[[^\]]*\]\([^)]*\)/g, "");
}

export default async function (req: Request) {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) return Response.json({ error: "Unauthorized" }, { status: 401 });

    const body = await req.json().catch(() => ({}));
    const threadId = body.thread_id || undefined;

    const bbApiKey = secrets.get("BACKBOARD_API_KEY");
    if (!bbApiKey) return Response.json({ error: "Backboard API key not configured" }, { status: 500 });

    // ---- Load mode: retrieve thread history from Backboard ----
    if (body.load && threadId) {
      try {
        const loadRes = await fetch(`https://app.backboard.io/api/threads/${threadId}`, {
          headers: { "X-API-Key": bbApiKey },
          signal: AbortSignal.timeout(15000),
        });
        if (loadRes.ok) {
          const thread = await loadRes.json();
          const history = (thread.messages || [])
            .filter((m: any) => m.role === "user" || m.role === "assistant")
            .map((m: any) => ({
              role: m.role === "assistant" ? "bot" : "user",
              text: String(m.content || ""),
            }));
          return Response.json({ messages: history });
        }
      } catch { /* thread not found */ }
      return Response.json({ messages: [] });
    }

    const message = sanitizeForPrompt(body.message, 500);
    if (!message) return Response.json({ error: "Message is required" }, { status: 400 });

    // Read scans + stain logs from InsForge.
    const sRes = await callInsforge(
      `/api/database/records/scans?${buildQuery(
        { userId: { eq: user.id } },
        { select: "data,created_at", order: { column: "created_at", ascending: false }, limit: 15 }
      )}`
    );
    const rawScans = sRes.ok && Array.isArray(sRes.data) ? sRes.data : [];
    const scans = rawScans.map(normalizeScan);

    const slRes = await callInsforge(
      `/api/database/records/stain_logs?${buildQuery(
        { userId: { eq: user.id } },
        { select: "data,created_at", order: { column: "created_at", ascending: false }, limit: 10 }
      )}`
    );
    const rawLogs = slRes.ok && Array.isArray(slRes.data) ? slRes.data : [];
    const stainLogs = rawLogs.map(normalizeStainLog);

    const images = extractImages(scans, stainLogs);

    // Build system prompt with scan history + food logs.
    const userName = user.username || user.display_name || user.full_name || "the user";
    const scanContext = buildScanContext(scans, userName);
    const foodContext = buildFoodContext(stainLogs);
    const habitLogs = rawLogs.map(normalizeHabitLog);
    const habitEstimate = computeHabitEstimate(rawScans[0] || null, habitLogs);
    const habitContext = buildHabitContext(habitEstimate);
    const systemPrompt = buildSystemPrompt(scanContext, foodContext, habitContext, userName);

    // Retrieve conversation history from Backboard (for Featherless context).
    const history = await getBackboardHistory(bbApiKey, threadId);

    // Build OpenAI-format messages for Featherless.
    const chatMessages = [
      { role: "system", content: systemPrompt },
      ...history,
      { role: "user", content: message },
    ];

    const featherlessKey = secrets.get("FEATHERLESS_API_KEY");
    const featherlessUrl = "https://api.featherless.ai/v1/chat/completions";
    const MODEL = "Qwen/Qwen2.5-72B-Instruct";

    const featherlessBody = (stream: boolean) =>
      JSON.stringify({ model: MODEL, messages: chatMessages, stream, max_tokens: 800, temperature: 0.4, frequency_penalty: 0.6, repetition_penalty: 1.15 });

    // ---- Streaming mode ----
    if (body.stream) {
      const encoder = new TextEncoder();
      const stream = new ReadableStream({
        async start(controller) {
          // Send images first so the frontend renders photos before text.
          if (images.length) {
            controller.enqueue(encoder.encode(`data: ${JSON.stringify({ type: "images", images })}\n\n`));
          }

          // Try Featherless first (with retry + exponential backoff).
          const featherlessResult = await callFeatherlessWithRetry(
            featherlessUrl, featherlessBody(true), featherlessKey, 45000, 3
          );

          if (featherlessResult.ok) {
            // Stream from Featherless, collecting full text for Backboard storage.
            let fullText = "";
            try {
              const reader = featherlessResult.res.body.getReader();
              const decoder = new TextDecoder();
              let buffer = "";
              while (true) {
                const { done, value } = await reader.read();
                if (done) break;
                buffer += decoder.decode(value, { stream: true });
                const lines = buffer.split("\n");
                buffer = lines.pop() || "";
                for (const line of lines) {
                  if (!line.startsWith("data: ")) continue;
                  const payload = line.slice(6).trim();
                  if (payload === "[DONE]") continue;
                  try {
                    const event = JSON.parse(payload);
                    const chunk = event.choices?.[0]?.delta?.content || "";
                    if (chunk) {
                      fullText += chunk;
                      controller.enqueue(
                        encoder.encode(`data: ${JSON.stringify({ type: "content", content: softClean(chunk) })}\n\n`)
                      );
                    }
                  } catch { /* malformed SSE */ }
                }
              }
            } catch (e) {
              controller.enqueue(
                encoder.encode(`data: ${JSON.stringify({ type: "error", error: (e as Error).message })}\n\n`)
              );
            }

            // Store the conversation in Backboard (echo trick) for persistence.
            const validatedText = validateOutput(fullText);
            const newThreadId = await storeInBackboard(bbApiKey, threadId, message, validatedText);
            controller.enqueue(
              encoder.encode(`data: ${JSON.stringify({ type: "done", thread_id: newThreadId })}\n\n`)
            );
            controller.close();
            return;
          }

          // Featherless failed — fall back to Backboard streaming.
          const bbRes = await callBackboard(bbApiKey, threadId, message, systemPrompt, true);
          if (!bbRes.ok) {
            const errText = await bbRes.text().catch(() => "");
            controller.enqueue(
              encoder.encode(
                `data: ${JSON.stringify({
                  type: "error",
                  error: `Both Featherless and Backboard failed. Backboard: ${bbRes.status} ${errText.slice(0, 200)}`,
                })}\n\n`
              )
            );
            controller.close();
            return;
          }

          try {
            const reader = bbRes.body.getReader();
            const decoder = new TextDecoder();
            let buffer = "";
            while (true) {
              const { done, value } = await reader.read();
              if (done) break;
              buffer += decoder.decode(value, { stream: true });
              const lines = buffer.split("\n");
              buffer = lines.pop() || "";
              for (const line of lines) {
                if (!line.startsWith("data: ")) continue;
                try {
                  const event = JSON.parse(line.slice(6));
                  if (event.type === "content_streaming") {
                    controller.enqueue(
                      encoder.encode(
                        `data: ${JSON.stringify({ type: "content", content: softClean(event.content || "") })}\n\n`
                      )
                    );
                  } else if (event.type === "run_ended") {
                    controller.enqueue(
                      encoder.encode(`data: ${JSON.stringify({ type: "done", thread_id: event.thread_id })}\n\n`)
                    );
                  }
                } catch { /* malformed SSE */ }
              }
            }
          } catch (e) {
            controller.enqueue(
              encoder.encode(`data: ${JSON.stringify({ type: "error", error: (e as Error).message })}\n\n`)
            );
          }
          controller.close();
        },
      });

      return new Response(stream, {
        headers: { "Content-Type": "text/event-stream", "Cache-Control": "no-cache", "Connection": "keep-alive" },
      });
    }

    // ---- Non-streaming mode ----
    // Try Featherless first (with retry + exponential backoff).
    const featherlessResult = await callFeatherlessWithRetry(
      featherlessUrl, featherlessBody(false), featherlessKey, 30000, 3
    );

    if (featherlessResult.ok) {
      const fData = await featherlessResult.res.json();
      const rawContent = fData.choices?.[0]?.message?.content || "";
      const content = validateOutput(rawContent);
      // Store in Backboard (echo trick) for conversation persistence.
      const newThreadId = await storeInBackboard(bbApiKey, threadId, message, content);
      return Response.json({ content, thread_id: newThreadId, images });
    }

    // Featherless failed — fall back to Backboard.
    const bbRes = await callBackboard(bbApiKey, threadId, message, systemPrompt, false);
    if (!bbRes.ok) {
      const errText = await bbRes.text().catch(() => "");
      return Response.json(
        { error: `Both Featherless and Backboard failed. Backboard: ${bbRes.status} ${errText.slice(0, 200)}` },
        { status: 502 }
      );
    }
    const bbData = await bbRes.json();
    const rawContent = bbData.content || "";
    const content = validateOutput(rawContent);
    const newThreadId = bbData.thread_id || threadId;
    return Response.json({ content, thread_id: newThreadId, images });
  } catch (error) {
    return Response.json({ error: (error as Error).message }, { status: 500 });
  }
}