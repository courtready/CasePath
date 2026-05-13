import { serve } from "https://deno.land/std@0.224.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.4";
import Stripe from "https://esm.sh/stripe@14.21.0?dts";
import {
  ALLOWED_CHECKOUT_SKUS,
  checkoutModeForSku,
  priceEnvNamesForSku,
  resolveSkuToPriceId,
  sanitizeReturnPath,
} from "../_shared/billing.ts";
import {
  CHECKOUT_USER_LIMITS,
  enforceUserRateLimit,
  getClientIp,
  rateLimitJsonResponse,
} from "../_shared/abuseGuard.ts";
import {
  checkoutConfigErrorResponse,
  collectCreateCheckoutMissingEnv,
  isHostedStripeCheckoutUrl,
  normalizeSiteUrlBase,
  warnIfCorsOriginsUnset,
} from "../_shared/checkoutEnv.ts";
import { mergeResponseHeaders, resolveBrowserCors } from "../_shared/cors.ts";

function json(
  body: unknown,
  status: number,
  cors: ReturnType<typeof resolveBrowserCors>,
): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: mergeResponseHeaders(cors, { "Content-Type": "application/json" }),
  });
}

serve(async (req) => {
  const cors = resolveBrowserCors(req);
  if (cors.kind === "reject") {
    return json(
      {
        error: "Forbidden origin",
        code: "CORS_FORBIDDEN",
        hint:
          "Set CASEPATH_ALLOWED_ORIGINS or SITE_URL in Supabase Edge secrets so this browser origin is allowed.",
      },
      403,
      cors,
    );
  }
  if (req.method === "OPTIONS") {
    if (cors.kind === "omit") {
      return new Response(null, { status: 204 });
    }
    return new Response("ok", { headers: cors.headers });
  }

  if (req.method !== "POST") {
    return json({ error: "Method not allowed", code: "METHOD_NOT_ALLOWED" }, 405, cors);
  }

  warnIfCorsOriginsUnset();

  const missingEnv = collectCreateCheckoutMissingEnv();
  if (missingEnv.length > 0) {
    const err = checkoutConfigErrorResponse(missingEnv);
    return json(err, 500, cors);
  }

  const stripeKey = (Deno.env.get("STRIPE_SECRET_KEY") ?? "").trim();
  if (stripeKey.startsWith("sk_test")) {
    console.warn(
      "[create-checkout-session] STRIPE_SECRET_KEY is a test key (sk_test_). Use live keys in production unless intentionally testing.",
    );
  }

  const siteUrl = normalizeSiteUrlBase(Deno.env.get("SITE_URL") ?? "");
  if (!siteUrl.toLowerCase().startsWith("https://")) {
    console.error("[create-checkout-session] SITE_URL must be an https URL; got:", siteUrl);
    return json(
      {
        error: "SITE_URL must use https:// for production checkout redirects.",
        code: "INVALID_SITE_URL",
        missing_env: [],
      },
      500,
      cors,
    );
  }

  const supabaseUrl = Deno.env.get("SUPABASE_URL") ?? "";
  const supabaseAnon = Deno.env.get("SUPABASE_ANON_KEY") ?? "";
  const authHeader = req.headers.get("Authorization") ?? "";
  if (!supabaseUrl || !supabaseAnon || !authHeader) {
    return json(
      { error: "Unauthorized", code: "UNAUTHORIZED" },
      401,
      cors,
    );
  }

  const supabaseUser = createClient(supabaseUrl, supabaseAnon, {
    global: { headers: { Authorization: authHeader } },
  });
  const { data: userData, error: userErr } = await supabaseUser.auth.getUser();
  if (userErr || !userData?.user?.id) {
    return json(
      { error: "Unauthorized", code: "UNAUTHORIZED" },
      401,
      cors,
    );
  }
  const userId = userData.user.id;
  const clientIp = getClientIp(req);
  const rl = enforceUserRateLimit({
    function: "create-checkout-session",
    userId,
    limits: CHECKOUT_USER_LIMITS,
    clientIp,
  });
  if (!rl.ok) {
    return rateLimitJsonResponse(rl, mergeResponseHeaders(cors, {}));
  }

  let body: { sku?: string; return_path?: string; price?: unknown };
  try {
    body = await req.json();
  } catch {
    return json({ error: "Invalid JSON", code: "INVALID_JSON" }, 400, cors);
  }

  const checkoutPayloadLog = {
    sku: typeof body?.sku === "string" ? body.sku : body?.sku,
    return_path: typeof body?.return_path === "string" ? body.return_path : body?.return_path,
  };
  console.log("[CHECKOUT] incoming payload", checkoutPayloadLog);

  if (body && typeof body === "object" && "price" in body) {
    console.warn("[create-checkout-session] Rejected client-supplied Stripe price field.");
    return json(
      {
        error: "Unknown or disallowed product",
        code: "CLIENT_PRICE_FORBIDDEN",
      },
      400,
      cors,
    );
  }

  const sku = String(body?.sku ?? "").trim();
  if (!ALLOWED_CHECKOUT_SKUS.has(sku)) {
    console.log("[CHECKOUT] resolved price id", "(rejected — SKU not whitelisted)");
    const mappingSummary: Record<string, { configured: boolean; tried: readonly string[] }> = {};
    for (const s of ALLOWED_CHECKOUT_SKUS) {
      mappingSummary[s] = {
        configured: !!resolveSkuToPriceId(s),
        tried: priceEnvNamesForSku(s),
      };
    }
    console.log("[CHECKOUT] available mappings", mappingSummary);
    return json(
      {
        error: "Unknown or disallowed product",
        code: "UNKNOWN_SKU",
        sku,
      },
      400,
      cors,
    );
  }

  const priceId = resolveSkuToPriceId(sku);
  const mode = checkoutModeForSku(sku);
  const mappingSummary: Record<string, { configured: boolean; tried: readonly string[] }> = {};
  for (const s of ALLOWED_CHECKOUT_SKUS) {
    mappingSummary[s] = {
      configured: !!resolveSkuToPriceId(s),
      tried: priceEnvNamesForSku(s),
    };
  }
  console.log("[CHECKOUT] resolved price id", priceId ?? "(none — env empty or not price_*)");
  console.log("[CHECKOUT] available mappings", mappingSummary);

  if (!priceId || !mode) {
    const tried = priceEnvNamesForSku(sku);
    console.error(
      "[create-checkout-session] Price not configured for SKU:",
      sku,
      "expected env vars:",
      tried.join(", "),
    );
    return json(
      {
        error: "Price not configured for this product",
        code: "PRICE_NOT_CONFIGURED",
        missing_env: [...tried],
        sku,
      },
      400,
      cors,
    );
  }

  const returnPath = sanitizeReturnPath(body?.return_path);
  const successUrl = `${siteUrl}${returnPath}?checkout=success&session_id={CHECKOUT_SESSION_ID}`;
  const cancelUrl = `${siteUrl}${returnPath}?checkout=cancel`;

  if (siteUrl.toLowerCase() === "https://casepath.com.au" && stripeKey.startsWith("sk_test_")) {
    console.error(
      "[create-checkout-session] Refusing checkout: production SITE_URL with Stripe test secret key.",
    );
    return json(
      {
        error:
          "Production cannot run using Stripe test keys. Set STRIPE_SECRET_KEY to a live secret (sk_live_…) for https://casepath.com.au, or use test keys only with a non-production SITE_URL.",
        code: "STRIPE_TEST_KEY_FORBIDDEN_IN_PRODUCTION",
      },
      500,
      cors,
    );
  }

  const stripe = new Stripe(stripeKey, {
    apiVersion: "2023-10-16",
    httpClient: Stripe.createFetchHttpClient(),
  });

  try {
    const session = await stripe.checkout.sessions.create({
      mode,
      line_items: [{ price: priceId, quantity: 1 }],
      success_url: successUrl,
      cancel_url: cancelUrl,
      client_reference_id: userId,
      customer_email: userData.user.email ?? undefined,
      metadata: {
        internal_sku: sku,
      },
    });

    const checkoutUrl = session.url ? String(session.url).trim() : "";
    if (!isHostedStripeCheckoutUrl(checkoutUrl)) {
      console.error(
        "[create-checkout-session] Stripe returned a non-checkout URL (refusing to echo to client).",
      );
      return json(
        {
          error: "Checkout session did not return a valid Stripe URL",
          code: "INVALID_CHECKOUT_URL",
        },
        502,
        cors,
      );
    }

    return json({ url: checkoutUrl }, 200, cors);
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    const type = typeof e === "object" && e && "type" in e
      ? String((e as { type?: unknown }).type)
      : "unknown";
    console.error("[create-checkout-session] Stripe API error:", { type, message: msg });
    return json(
      {
        error: "Stripe could not start checkout right now. Please try again shortly.",
        code: "STRIPE_ERROR",
        stripe_type: type,
      },
      502,
      cors,
    );
  }
});
