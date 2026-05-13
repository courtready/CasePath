/**
 * Lightweight per-user rate limits for Edge Functions (in-process per isolate).
 * Best-effort: not shared across scaled instances; no external infrastructure.
 */

export type RateLimitConfig = {
  /** Rolling window length */
  windowMs: number;
  /** Max successful checks (calls recorded) within the window */
  maxInWindow: number;
  /** Optional minimum spacing between calls (last → now) */
  minIntervalMs?: number;
};

export type RateLimitDenied = {
  ok: false;
  reason: "rate_window" | "rate_cooldown";
  retryAfterMs: number;
};

export type RateLimitOk = { ok: true };

const buckets = new Map<string, number[]>();

function prune(ts: number[], windowMs: number, now: number): void {
  const cutoff = now - windowMs;
  while (ts.length > 0 && ts[0]! < cutoff) ts.shift();
}

/** Best-effort client IP for log correlation (no PII beyond what proxies send). */
export function getClientIp(req: Request): string | null {
  const cf = req.headers.get("cf-connecting-ip");
  if (cf) {
    const t = cf.trim();
    if (t) return t;
  }
  const xff = req.headers.get("x-forwarded-for");
  if (xff) {
    const first = xff.split(",")[0]?.trim();
    if (first) return first;
  }
  return null;
}

export type AbuseLogPayload = {
  pattern: "rate_window" | "rate_cooldown";
  function: string;
  user_id: string;
  client_ip?: string;
  window_ms?: number;
  max_in_window?: number;
  min_interval_ms?: number;
  retry_after_ms?: number;
};

/** Single-line JSON for log drains / grep-friendly abuse review. */
export function logAbuseWarning(payload: AbuseLogPayload): void {
  console.warn(
    JSON.stringify({
      level: "WARN",
      source: "edge_abuse_guard",
      ts: new Date().toISOString(),
      ...payload,
    }),
  );
}

/**
 * Enforce sliding-window + optional per-call cooldown. On allow, records this request.
 */
export function enforceUserRateLimit(args: {
  function: string;
  userId: string;
  limits: RateLimitConfig;
  clientIp?: string | null;
}): RateLimitOk | RateLimitDenied {
  const key = `${args.function}:${args.userId}`;
  const now = Date.now();
  const { windowMs, maxInWindow, minIntervalMs } = args.limits;

  let ts = buckets.get(key);
  if (!ts) {
    ts = [];
    buckets.set(key, ts);
  }
  prune(ts, windowMs, now);

  if (minIntervalMs !== undefined && ts.length > 0) {
    const last = ts[ts.length - 1]!;
    const elapsed = now - last;
    if (elapsed < minIntervalMs) {
      const retryAfterMs = Math.ceil(minIntervalMs - elapsed);
      logAbuseWarning({
        pattern: "rate_cooldown",
        function: args.function,
        user_id: args.userId,
        client_ip: args.clientIp ?? undefined,
        min_interval_ms: minIntervalMs,
        retry_after_ms: retryAfterMs,
      });
      return { ok: false, reason: "rate_cooldown", retryAfterMs };
    }
  }

  if (ts.length >= maxInWindow) {
    const oldest = ts[0]!;
    const retryAfterMs = Math.max(0, Math.ceil(windowMs - (now - oldest)));
    logAbuseWarning({
      pattern: "rate_window",
      function: args.function,
      user_id: args.userId,
      client_ip: args.clientIp ?? undefined,
      window_ms: windowMs,
      max_in_window: maxInWindow,
      retry_after_ms: retryAfterMs,
    });
    return { ok: false, reason: "rate_window", retryAfterMs };
  }

  ts.push(now);

  if (buckets.size > 25000) {
    for (const k of buckets.keys()) {
      const arr = buckets.get(k);
      if (!arr || arr.length === 0) buckets.delete(k);
      if (buckets.size < 18000) break;
    }
  }

  return { ok: true };
}

export function rateLimitJsonResponse(
  denied: RateLimitDenied,
  corsHeaders: Record<string, string>,
): Response {
  const retrySec = Math.max(1, Math.ceil(denied.retryAfterMs / 1000));
  return new Response(
    JSON.stringify({
      error: "Too many requests",
      retry_after_ms: denied.retryAfterMs,
      reason: denied.reason,
    }),
    {
      status: 429,
      headers: {
        ...corsHeaders,
        "Content-Type": "application/json",
        "Retry-After": String(retrySec),
      },
    },
  );
}

/** Tuned for Stripe session creation cost and abuse surface. */
export const CHECKOUT_USER_LIMITS: RateLimitConfig = {
  windowMs: 15 * 60 * 1000,
  maxInWindow: 10,
  minIntervalMs: 2000,
};

/** Signed URL minting: allow reasonable batching without tight cooldown. */
export const VAULT_SIGNED_URL_USER_LIMITS: RateLimitConfig = {
  windowMs: 60 * 1000,
  maxInWindow: 90,
};

/** Credit consumption: generous for multi-doc workflows, still caps scripted abuse. */
export const CONSUME_DOC_CREDIT_USER_LIMITS: RateLimitConfig = {
  windowMs: 60 * 1000,
  maxInWindow: 72,
  minIntervalMs: 120,
};

/** Ask a Question (public + signed-in): tighter for anonymous IP bucket. */
export const AI_ASSISTANT_ANON_LIMITS: RateLimitConfig = {
  windowMs: 60 * 1000,
  maxInWindow: 18,
  minIntervalMs: 2500,
};

export const AI_ASSISTANT_USER_LIMITS: RateLimitConfig = {
  windowMs: 60 * 1000,
  maxInWindow: 40,
  minIntervalMs: 1500,
};
