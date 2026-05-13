/**
 * Canonical server-side Stripe price → entitlement map (Phase 3.2).
 * Populated ONLY from Supabase Edge secrets / env vars. Never from client JSON.
 */
export const ALLOWED_CHECKOUT_SKUS = new Set([
  "starter_monthly",
  "pro_monthly",
  "essential",
  "credits_1",
  "credits_5",
  "credits_10",
  "parenting_pack",
  "lawyer_portal",
]);

export type CheckoutMode = "subscription" | "payment";

export type SkuDefinition = {
  priceEnv: string;
  stripeMode: CheckoutMode;
};

/** SKU → which env var holds the Stripe Price ID */
export const SKU_TABLE: Record<string, SkuDefinition> = {
  starter_monthly: { priceEnv: "STRIPE_PRICE_STARTER_MONTHLY", stripeMode: "subscription" },
  pro_monthly: { priceEnv: "STRIPE_PRICE_PRO_MONTHLY", stripeMode: "subscription" },
  essential: { priceEnv: "STRIPE_PRICE_ESSENTIAL", stripeMode: "subscription" },
  credits_1: { priceEnv: "STRIPE_PRICE_CREDITS_1", stripeMode: "payment" },
  credits_5: { priceEnv: "STRIPE_PRICE_CREDITS_5", stripeMode: "payment" },
  credits_10: { priceEnv: "STRIPE_PRICE_CREDITS_10", stripeMode: "payment" },
  parenting_pack: { priceEnv: "STRIPE_PRICE_PARENTING_PACK", stripeMode: "payment" },
  lawyer_portal: { priceEnv: "STRIPE_PRICE_LAWYER_PORTAL", stripeMode: "payment" },
};

/** Optional legacy / dashboard alias env names (same Stripe price ID). Checked after primary `priceEnv`. */
const SKU_PRICE_ENV_ALIASES: Record<string, readonly string[]> = {
  starter_monthly: ["STRIPE_PRICE_STARTER"],
  pro_monthly: ["STRIPE_PRICE_PRO"],
  credits_1: ["STRIPE_PRICE_DOC_SINGLE"],
  parenting_pack: ["STRIPE_PRICE_CASEPACK"],
};

function readFirstStripePriceId(...envNames: string[]): string | null {
  for (const name of envNames) {
    const id = (Deno.env.get(name) ?? "").trim();
    if (id.startsWith("price_")) return id;
  }
  return null;
}

export function priceEnvNamesForSku(sku: string): string[] {
  const def = SKU_TABLE[sku];
  if (!def) return [];
  const aliases = SKU_PRICE_ENV_ALIASES[sku] ?? [];
  return [def.priceEnv, ...aliases];
}

export type PriceEntitlement = {
  /** Add to members.doc_credits */
  addCredits?: number;
  /** Set members.plan (authoritative string used by app hasAccess) */
  setPlan?: string;
};

/**
 * Build map: Stripe price_… id → entitlement deltas.
 * Unknown env / missing price IDs are omitted (webhook will reject unknown prices).
 */
export function buildPriceEntitlementMap(): Map<string, PriceEntitlement> {
  const m = new Map<string, PriceEntitlement>();
  const reg = (envName: string, ent: PriceEntitlement) => {
    const id = (Deno.env.get(envName) ?? "").trim();
    if (id.startsWith("price_")) m.set(id, ent);
  };
  const regMany = (envNames: readonly string[], ent: PriceEntitlement) => {
    for (const n of envNames) reg(n, ent);
  };
  regMany(["STRIPE_PRICE_CREDITS_1", "STRIPE_PRICE_DOC_SINGLE"], { addCredits: 1 });
  reg("STRIPE_PRICE_CREDITS_5", { addCredits: 5 });
  reg("STRIPE_PRICE_CREDITS_10", { addCredits: 10 });
  regMany(["STRIPE_PRICE_PARENTING_PACK", "STRIPE_PRICE_CASEPACK"], { setPlan: "casepack" });
  reg("STRIPE_PRICE_LAWYER_PORTAL", { setPlan: "lawyer_portal_access" });
  regMany(["STRIPE_PRICE_STARTER_MONTHLY", "STRIPE_PRICE_STARTER"], { setPlan: "starter" });
  reg("STRIPE_PRICE_ESSENTIAL", { setPlan: "essential" });
  regMany(["STRIPE_PRICE_PRO_MONTHLY", "STRIPE_PRICE_PRO"], { setPlan: "pro" });
  return m;
}

export function resolveSkuToPriceId(sku: string): string | null {
  if (!SKU_TABLE[sku]) return null;
  return readFirstStripePriceId(...priceEnvNamesForSku(sku));
}

export function checkoutModeForSku(sku: string): CheckoutMode | null {
  return SKU_TABLE[sku]?.stripeMode ?? null;
}

export function sanitizeReturnPath(input: string | null | undefined): string {
  const fallback = "/index.html";
  if (!input || typeof input !== "string") return fallback;
  const t = input.trim();
  if (!t.startsWith("/") || t.startsWith("//")) return fallback;
  if (t.length > 512) return fallback;
  const lower = t.toLowerCase();
  if (
    lower.startsWith("javascript:") ||
    lower.startsWith("data:") ||
    lower.startsWith("vbscript:")
  ) {
    return fallback;
  }
  return t;
}
