import { serve } from "https://deno.land/std@0.224.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.4";
import Stripe from "https://esm.sh/stripe@14.21.0?dts";
import { buildPriceEntitlementMap, type PriceEntitlement } from "../_shared/billing.ts";

const stripeKey = Deno.env.get("STRIPE_SECRET_KEY") ?? "";
const webhookSecret = Deno.env.get("STRIPE_WEBHOOK_SECRET") ?? "";
const supabaseUrl = Deno.env.get("SUPABASE_URL") ?? "";
const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "";

async function audit(
  admin: ReturnType<typeof createClient>,
  row: { source: string; event_type: string; stripe_event_id: string | null; user_id: string | null; detail: unknown },
) {
  try {
    await admin.from("billing_audit_log").insert(row);
  } catch (e) {
    console.error("billing_audit_log insert failed", e);
  }
}

function mergeEntitlements(items: PriceEntitlement[]): PriceEntitlement {
  let addCredits = 0;
  let setPlan: string | undefined;
  for (const e of items) {
    if (e.addCredits) addCredits += e.addCredits;
    if (e.setPlan) setPlan = e.setPlan;
  }
  return { addCredits: addCredits || undefined, setPlan };
}

serve(async (req) => {
  if (!stripeKey || !webhookSecret || !supabaseUrl || !serviceKey) {
    return new Response("Server misconfigured", { status: 500 });
  }

  const stripe = new Stripe(stripeKey, { apiVersion: "2023-10-16", httpClient: Stripe.createFetchHttpClient() });
  const admin = createClient(supabaseUrl, serviceKey);

  const sig = req.headers.get("stripe-signature");
  if (!sig) {
    return new Response("Missing stripe-signature", { status: 400 });
  }

  const rawBody = await req.text();
  let event: Stripe.Event;
  try {
    event = stripe.webhooks.constructEvent(rawBody, sig, webhookSecret);
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    await audit(admin, {
      source: "stripe_webhook",
      event_type: "signature_error",
      stripe_event_id: null,
      user_id: null,
      detail: { message: msg },
    });
    return new Response(`Webhook Error: ${msg}`, { status: 400 });
  }

  const priceMap = buildPriceEntitlementMap();

  try {
    if (event.type === "checkout.session.completed") {
      const session = event.data.object as Stripe.Checkout.Session;
      const full = await stripe.checkout.sessions.retrieve(session.id, {
        expand: ["line_items.data.price"],
      });
      const userId = session.client_reference_id ?? null;
      if (!userId) {
        await audit(admin, {
          source: "stripe_webhook",
          event_type: "checkout_missing_user",
          stripe_event_id: event.id,
          user_id: null,
          detail: { session_id: session.id },
        });
        return new Response("Missing client_reference_id", { status: 400 });
      }

      const items = full.line_items?.data ?? [];
      const ents: PriceEntitlement[] = [];
      for (const li of items) {
        const pid = typeof li.price === "string" ? li.price : li.price?.id;
        if (!pid || !pid.startsWith("price_")) continue;
        const ent = priceMap.get(pid);
        if (!ent) {
          await audit(admin, {
            source: "stripe_webhook",
            event_type: "unknown_stripe_price",
            stripe_event_id: event.id,
            user_id: userId,
            detail: { price_id: pid, session_id: session.id },
          });
          return new Response("Unknown Stripe price — configure PRICE_MAP / env", { status: 500 });
        }
        ents.push(ent);
      }
      if (!ents.length) {
        return new Response("No line items", { status: 400 });
      }

      const merged = mergeEntitlements(ents);
      const creditAdd = merged.addCredits ?? 0;
      const planSet = merged.setPlan ?? null;

      const { data: applyResult, error: applyErr } = await admin.rpc("apply_stripe_checkout_entitlements", {
        p_event_id: event.id,
        p_user_id: userId,
        p_customer_email: session.customer_email ?? "",
        p_credit_add: creditAdd,
        p_plan_set: planSet,
      });
      if (applyErr) {
        console.error("apply_stripe_checkout_entitlements", applyErr);
        return new Response(applyErr.message, { status: 500 });
      }
      const ar = applyResult as { ok?: boolean; duplicate?: boolean; error?: string };
      if (ar?.duplicate) {
        return new Response(JSON.stringify({ received: true, duplicate: true }), { status: 200 });
      }
      if (!ar?.ok) {
        const st = ar?.error === "invalid_args" ? 400 : 500;
        return new Response(JSON.stringify({ received: false, applyResult }), { status: st });
      }
    } else {
      const { data: claimed, error: claimErr } = await admin.rpc("claim_stripe_event", {
        p_event_id: event.id,
      });
      if (claimErr) {
        console.error("claim_stripe_event", claimErr);
        return new Response("claim failed", { status: 500 });
      }
      if (claimed === false) {
        return new Response(JSON.stringify({ received: true, duplicate: true }), { status: 200 });
      }
      await audit(admin, {
        source: "stripe_webhook",
        event_type: event.type,
        stripe_event_id: event.id,
        user_id: null,
        detail: { note: "no-op handler", livemode: event.livemode },
      });
    }
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    await audit(admin, {
      source: "stripe_webhook",
      event_type: "handler_error",
      stripe_event_id: event.id,
      user_id: null,
      detail: { message: msg },
    });
    return new Response(msg, { status: 500 });
  }

  return new Response(JSON.stringify({ received: true }), { status: 200 });
});
