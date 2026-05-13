import { serve } from "https://deno.land/std@0.224.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.4";
import {
  CONSUME_DOC_CREDIT_USER_LIMITS,
  enforceUserRateLimit,
  getClientIp,
  rateLimitJsonResponse,
} from "../_shared/abuseGuard.ts";
import { mergeResponseHeaders, resolveBrowserCors } from "../_shared/cors.ts";

serve(async (req) => {
  const cors = resolveBrowserCors(req);
  if (cors.kind === "reject") {
    return new Response(JSON.stringify({ error: "Forbidden origin" }), {
      status: 403,
      headers: { "Content-Type": "application/json" },
    });
  }
  if (req.method === "OPTIONS") {
    if (cors.kind === "omit") {
      return new Response(null, { status: 204 });
    }
    return new Response("ok", { headers: cors.headers });
  }
  if (req.method !== "POST") {
    return new Response(JSON.stringify({ error: "Method not allowed" }), {
      status: 405,
      headers: mergeResponseHeaders(cors, { "Content-Type": "application/json" }),
    });
  }

  const supabaseUrl = Deno.env.get("SUPABASE_URL") ?? "";
  const supabaseAnon = Deno.env.get("SUPABASE_ANON_KEY") ?? "";
  const authHeader = req.headers.get("Authorization") ?? "";
  if (!supabaseUrl || !supabaseAnon || !authHeader) {
    return new Response(JSON.stringify({ error: "Unauthorized" }), {
      status: 401,
      headers: mergeResponseHeaders(cors, { "Content-Type": "application/json" }),
    });
  }

  const supabase = createClient(supabaseUrl, supabaseAnon, {
    global: { headers: { Authorization: authHeader } },
  });

  const { data: userData, error: userErr } = await supabase.auth.getUser();
  if (userErr || !userData?.user?.id) {
    return new Response(JSON.stringify({ error: "Unauthorized" }), {
      status: 401,
      headers: mergeResponseHeaders(cors, { "Content-Type": "application/json" }),
    });
  }
  const userId = userData.user.id;
  const clientIp = getClientIp(req);
  const rl = enforceUserRateLimit({
    function: "consume-doc-credit",
    userId,
    limits: CONSUME_DOC_CREDIT_USER_LIMITS,
    clientIp,
  });
  if (!rl.ok) {
    return rateLimitJsonResponse(rl, mergeResponseHeaders(cors, {}));
  }

  const { data, error } = await supabase.rpc("consume_one_document_credit");
  if (error) {
    return new Response(JSON.stringify({ error: error.message }), {
      status: 400,
      headers: mergeResponseHeaders(cors, { "Content-Type": "application/json" }),
    });
  }
  const remaining = typeof data === "number" ? data : Number(data);
  if (!Number.isFinite(remaining)) {
    return new Response(JSON.stringify({ error: "invalid_rpc_response" }), {
      status: 500,
      headers: mergeResponseHeaders(cors, { "Content-Type": "application/json" }),
    });
  }
  if (remaining === -1) {
    return new Response(JSON.stringify({ error: "no_credits", remaining: 0 }), {
      status: 402,
      headers: mergeResponseHeaders(cors, { "Content-Type": "application/json" }),
    });
  }

  return new Response(JSON.stringify({ remaining }), {
    status: 200,
    headers: mergeResponseHeaders(cors, { "Content-Type": "application/json" }),
  });
});
