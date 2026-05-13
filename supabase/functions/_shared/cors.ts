/**
 * Strict browser CORS for Edge functions: echo a single allowed Origin, never "*".
 *
 * Configure production:
 *   CASEPATH_ALLOWED_ORIGINS — comma-separated absolute origins, e.g.
 *     https://www.example.com,https://example.com
 *   SITE_URL — optional; its origin is merged into the allowlist (same as checkout redirects).
 *
 * When no origins are configured, https://casepath.com.au and https://www.casepath.com.au
 * are merged automatically unless CASEPATH_DISABLE_DEFAULT_ORIGINS=true.
 *
 * Local dev: any http origin on localhost, 127.0.0.1, or ::1 (any port) is allowed.
 */

import { DEFAULT_CANONICAL_SITE_URL } from "./checkoutEnv.ts";

const ALLOW_HEADERS =
  "authorization, x-client-info, apikey, content-type";
const ALLOW_METHODS = "POST, OPTIONS";

let cache: { origins: Set<string> } | null = null;

/** Register an https origin plus www ↔ apex variant to avoid checkout CORS 403 when SITE_URL omits one form. */
function mergeHttpsOriginPair(origins: Set<string>, input: string): void {
  const t = input.trim();
  if (!t) return;
  try {
    const normalized = /^https?:\/\//i.test(t) ? t : `https://${t}`;
    const u = new URL(normalized);
    if (u.protocol !== "https:") return;
    origins.add(u.origin);
    const host = u.hostname;
    if (host.startsWith("www.")) {
      const apex = host.slice(4);
      if (apex) origins.add(`https://${apex}`);
    } else if (host) {
      origins.add(`https://www.${host}`);
    }
  } catch {
    /* ignore */
  }
}

function mergeCommaSeparatedOrigins(origins: Set<string>, raw: string): void {
  for (const part of raw.split(",")) {
    const t = part.trim();
    if (!t) continue;
    mergeHttpsOriginPair(origins, t);
  }
}

function loadConfig(): { origins: Set<string> } {
  if (cache) return cache;
  const origins = new Set<string>();
  mergeCommaSeparatedOrigins(origins, Deno.env.get("CASEPATH_ALLOWED_ORIGINS") ?? "");
  const siteUrl = (Deno.env.get("SITE_URL") ?? "").trim();
  if (siteUrl) {
    mergeHttpsOriginPair(origins, siteUrl);
  }
  const disableDefault =
    (Deno.env.get("CASEPATH_DISABLE_DEFAULT_ORIGINS") ?? "").toLowerCase() === "true" ||
    (Deno.env.get("CASEPATH_DISABLE_DEFAULT_ORIGINS") ?? "").toLowerCase() === "1";
  if (!disableDefault && origins.size === 0) {
    mergeHttpsOriginPair(origins, DEFAULT_CANONICAL_SITE_URL);
  }
  cache = { origins };
  return cache;
}

function isLocalhostDevOrigin(origin: string): boolean {
  try {
    const u = new URL(origin);
    if (u.protocol !== "http:") return false;
    const h = u.hostname;
    return (
      h === "localhost" ||
      h === "127.0.0.1" ||
      h === "[::1]" ||
      h === "::1"
    );
  } catch {
    return false;
  }
}

function originAllowed(origin: string): boolean {
  const { origins } = loadConfig();
  if (origins.has(origin)) return true;
  return isLocalhostDevOrigin(origin);
}

export type CorsResolution =
  | { kind: "allow"; origin: string; headers: Record<string, string> }
  | { kind: "omit" }
  | { kind: "reject" };

export function resolveBrowserCors(req: Request): CorsResolution {
  const origin = req.headers.get("Origin");
  if (!origin) return { kind: "omit" };
  if (!originAllowed(origin)) return { kind: "reject" };
  return {
    kind: "allow",
    origin,
    headers: {
      "Access-Control-Allow-Origin": origin,
      "Access-Control-Allow-Headers": ALLOW_HEADERS,
      "Access-Control-Allow-Methods": ALLOW_METHODS,
      "Vary": "Origin",
    },
  };
}

export function mergeResponseHeaders(
  cors: CorsResolution,
  extra: Record<string, string>,
): Record<string, string> {
  if (cors.kind !== "allow") return { ...extra };
  return { ...cors.headers, ...extra };
}
