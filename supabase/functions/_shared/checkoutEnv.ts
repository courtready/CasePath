/**
 * Canonical production site origin for success/cancel URLs and CORS alignment.
 * Override with SITE_URL / CASEPATH_ALLOWED_ORIGINS secrets in Supabase.
 */
export const DEFAULT_CANONICAL_SITE_URL = "https://casepath.com.au";

export function normalizeSiteUrlBase(input: string): string {
  const t = String(input ?? "").trim().replace(/\/+$/, "");
  return t;
}

/** True when URL is https and hostname ends with .stripe.com or is stripe.com */
export function isHostedStripeCheckoutUrl(url: string): boolean {
  const u = String(url ?? "").trim();
  if (!u) return false;
  try {
    const parsed = new URL(u);
    if (parsed.protocol !== "https:") return false;
    const h = parsed.hostname.toLowerCase();
    return h === "stripe.com" || h.endsWith(".stripe.com");
  } catch {
    return false;
  }
}

export type CheckoutConfigError = {
  error: string;
  code: "MISSING_CONFIGURATION";
  missing_env: string[];
};

export function collectCreateCheckoutMissingEnv(): string[] {
  const missing: string[] = [];
  if (!(Deno.env.get("STRIPE_SECRET_KEY") ?? "").trim()) {
    missing.push("STRIPE_SECRET_KEY");
  }
  if (!(Deno.env.get("SITE_URL") ?? "").trim()) {
    missing.push("SITE_URL");
  }
  return missing;
}

/** Log once per isolate if CORS allowlist secret is unset (browser checkout may 403). */
let corsOriginsWarned = false;
export function warnIfCorsOriginsUnset(): void {
  if (corsOriginsWarned) return;
  const allowed = (Deno.env.get("CASEPATH_ALLOWED_ORIGINS") ?? "").trim();
  const site = (Deno.env.get("SITE_URL") ?? "").trim();
  if (!allowed && !site) {
    console.warn(
      "[create-checkout-session] CASEPATH_ALLOWED_ORIGINS and SITE_URL are both unset — browser CORS may reject checkout requests.",
    );
  } else if (!allowed && site) {
    console.warn(
      "[create-checkout-session] CASEPATH_ALLOWED_ORIGINS unset — CORS allowlist falls back to SITE_URL and default canonical origins.",
    );
  }
  corsOriginsWarned = true;
}

export function checkoutConfigErrorResponse(
  missing: string[],
): CheckoutConfigError {
  const label = missing.join(", ");
  console.error("[create-checkout-session] Missing required configuration:", label);
  return {
    error: "Billing is not fully configured on the server. Missing: " + label,
    code: "MISSING_CONFIGURATION",
    missing_env: missing,
  };
}
