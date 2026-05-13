import { serve } from "https://deno.land/std@0.224.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.4";
import {
  AI_ASSISTANT_ANON_LIMITS,
  AI_ASSISTANT_USER_LIMITS,
  enforceUserRateLimit,
  getClientIp,
  rateLimitJsonResponse,
} from "../_shared/abuseGuard.ts";
import { mergeResponseHeaders, resolveBrowserCors } from "../_shared/cors.ts";

function json(
  body: unknown,
  status: number,
  cors: ReturnType<typeof resolveBrowserCors>,
  extraHeaders: Record<string, string> = {},
): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: mergeResponseHeaders(cors, {
      "Content-Type": "application/json",
      ...extraHeaders,
    }),
  });
}

serve(async (req) => {
  const cors = resolveBrowserCors(req);
  if (cors.kind === "reject") {
    return json({ error: "Forbidden origin" }, 403, cors);
  }
  if (req.method === "OPTIONS") {
    if (cors.kind === "omit") {
      return new Response(null, { status: 204 });
    }
    return new Response("ok", { headers: cors.headers });
  }
  if (req.method !== "POST") {
    return json({ error: "Method not allowed" }, 405, cors);
  }

  const supabaseUrl = Deno.env.get("SUPABASE_URL") ?? "";
  const supabaseAnon = Deno.env.get("SUPABASE_ANON_KEY") ?? "";
  const apikeyHeader = (req.headers.get("apikey") ?? "").trim();
  if (!supabaseUrl || !supabaseAnon || apikeyHeader !== supabaseAnon) {
    return json({ error: "Unauthorized" }, 401, cors);
  }

  const authHeader = (req.headers.get("Authorization") ?? "").trim();
  const bearer = authHeader.startsWith("Bearer ") ? authHeader.slice(7).trim() : "";
  const supabase = createClient(supabaseUrl, supabaseAnon, {
    global: {
      headers: {
        Authorization: bearer ? `Bearer ${bearer}` : `Bearer ${supabaseAnon}`,
      },
    },
  });

  const { data: userData, error: userErr } = await supabase.auth.getUser();
  const authedUserId = !userErr && userData?.user?.id ? userData.user.id : null;
  const rateKey = authedUserId ?? `anon:${getClientIp(req) ?? "unknown"}`;
  const limits = authedUserId ? AI_ASSISTANT_USER_LIMITS : AI_ASSISTANT_ANON_LIMITS;
  const rl = enforceUserRateLimit({
    function: "ai-assistant",
    userId: rateKey,
    limits,
    clientIp: getClientIp(req),
  });
  if (!rl.ok) {
    return rateLimitJsonResponse(rl, mergeResponseHeaders(cors, { "Content-Type": "application/json" }));
  }

  const openaiKey = (Deno.env.get("OPENAI_API_KEY") ?? Deno.env.get("CASEPATH_OPENAI_API_KEY") ?? "").trim();
  if (!openaiKey) {
    return json({ error: "AI is not configured (missing OPENAI_API_KEY on the project)" }, 503, cors);
  }

  let body: Record<string, unknown>;
  try {
    body = (await req.json()) as Record<string, unknown>;
  } catch {
    return json({ error: "Invalid JSON body" }, 400, cors);
  }

  const message = String(body.message ?? "").trim();
  const system = String(body.system ?? "You are CasePath Ask a Question.").slice(0, 12_000);
  let maxTokens = Number(body.max_tokens);
  if (!Number.isFinite(maxTokens) || maxTokens < 1) maxTokens = 700;
  maxTokens = Math.min(Math.floor(maxTokens), 1200);
  const temperature =
    typeof body.temperature === "number" && Number.isFinite(body.temperature)
      ? Math.min(1, Math.max(0, body.temperature))
      : 0.35;

  if (!message || message.length > 8000) {
    return json({ error: "message is required (max 8000 chars)" }, 400, cors);
  }

  const oaRes = await fetch("https://api.openai.com/v1/chat/completions", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${openaiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      model: "gpt-4o-mini",
      messages: [
        { role: "system", content: system },
        { role: "user", content: message },
      ],
      max_tokens: maxTokens,
      temperature,
    }),
  });

  const raw = await oaRes.json().catch(() => ({}));
  if (!oaRes.ok) {
    const detail =
      raw && typeof raw === "object" && "error" in raw
        ? String((raw as { error?: { message?: string } }).error?.message ?? "")
        : "";
    console.error("openai_error", oaRes.status, detail);
    return json({ error: "Upstream model error", detail }, 502, cors);
  }

  const reply = (raw as { choices?: Array<{ message?: { content?: string } }> })?.choices?.[0]?.message
    ?.content;
  if (!reply || typeof reply !== "string") {
    return json({ error: "Empty model response" }, 502, cors);
  }

  return json({ reply: reply.trim() }, 200, cors);
});
