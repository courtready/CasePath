import { serve } from "https://deno.land/std@0.224.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.4";
import {
  enforceUserRateLimit,
  getClientIp,
  rateLimitJsonResponse,
  VAULT_SIGNED_URL_USER_LIMITS,
} from "../_shared/abuseGuard.ts";
import { mergeResponseHeaders, resolveBrowserCors } from "../_shared/cors.ts";

const ALLOWED_CATEGORIES = new Set([
  "court-orders",
  "affidavits",
  "evidence",
  "documents",
  "communications",
  "parenting",
  "financial",
  "medical",
  "school",
  "tasks",
]);
const ALLOWED_EXTENSIONS = new Set(["pdf", "jpg", "jpeg", "png", "txt", "docx", "zip"]);
const BLOCKED_EXTENSIONS = new Set(["exe", "js", "php", "html", "htm", "svg"]);
const MAX_EXPIRES_SECONDS = 300;
const BUCKET = "casepath-vault";

function extensionOf(name: string): string {
  const n = String(name || "");
  const idx = n.lastIndexOf(".");
  return idx >= 0 ? n.slice(idx + 1).toLowerCase() : "";
}

function safeFileName(name: string): string {
  const trimmed = String(name || "").trim().slice(0, 120);
  return trimmed.replace(/[^a-zA-Z0-9._-]+/g, "_");
}

async function audit(
  admin: ReturnType<typeof createClient>,
  userId: string,
  action: string,
  status: string,
  detail: Record<string, unknown>,
) {
  try {
    await admin.from("vault_audit_log").insert({
      user_id: userId,
      action,
      target: BUCKET,
      status,
      detail,
    });
  } catch (_e) {
    // best effort
  }
}

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
  const anonKey = Deno.env.get("SUPABASE_ANON_KEY") ?? "";
  const serviceRole = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "";
  const authHeader = req.headers.get("Authorization") ?? "";
  if (!supabaseUrl || !anonKey || !serviceRole || !authHeader) {
    return new Response(JSON.stringify({ error: "Unauthorized" }), {
      status: 401,
      headers: mergeResponseHeaders(cors, { "Content-Type": "application/json" }),
    });
  }

  const userClient = createClient(supabaseUrl, anonKey, {
    global: { headers: { Authorization: authHeader } },
  });
  const admin = createClient(supabaseUrl, serviceRole);

  const { data: userData, error: userErr } = await userClient.auth.getUser();
  if (userErr || !userData?.user?.id) {
    return new Response(JSON.stringify({ error: "Unauthorized" }), {
      status: 401,
      headers: mergeResponseHeaders(cors, { "Content-Type": "application/json" }),
    });
  }
  const userId = userData.user.id;
  const clientIp = getClientIp(req);
  const rl = enforceUserRateLimit({
    function: "vault-signed-url",
    userId,
    limits: VAULT_SIGNED_URL_USER_LIMITS,
    clientIp,
  });
  if (!rl.ok) {
    return rateLimitJsonResponse(rl, mergeResponseHeaders(cors, {}));
  }

  let body: Record<string, unknown> = {};
  try {
    body = await req.json();
  } catch {
    return new Response(JSON.stringify({ error: "Invalid JSON" }), {
      status: 400,
      headers: mergeResponseHeaders(cors, { "Content-Type": "application/json" }),
    });
  }

  const action = String(body.action || "").trim();
  const category = String(body.category || "").trim();
  if (!ALLOWED_CATEGORIES.has(category)) {
    await audit(admin, userId, "vault_signed_url", "error", { reason: "invalid_category", category });
    return new Response(JSON.stringify({ error: "Invalid category" }), {
      status: 400,
      headers: mergeResponseHeaders(cors, { "Content-Type": "application/json" }),
    });
  }

  if (action === "upload") {
    const originalName = String(body.filename || "").trim();
    const ext = extensionOf(originalName);
    if (!ext || !ALLOWED_EXTENSIONS.has(ext) || BLOCKED_EXTENSIONS.has(ext)) {
      await audit(admin, userId, "vault_signed_upload", "error", { reason: "invalid_extension", ext });
      return new Response(JSON.stringify({ error: "Unsupported file type" }), {
        status: 400,
        headers: mergeResponseHeaders(cors, { "Content-Type": "application/json" }),
      });
    }
    const normalized = safeFileName(originalName || "file");
    const objectPath = `vault/${userId}/${category}/${crypto.randomUUID()}-${normalized}`;
    const { data, error } = await admin.storage.from(BUCKET).createSignedUploadUrl(objectPath);
    if (error || !data) {
      await audit(admin, userId, "vault_signed_upload", "error", { reason: "sign_failed", message: error?.message });
      return new Response(JSON.stringify({ error: error?.message || "Could not sign upload URL" }), {
        status: 400,
        headers: mergeResponseHeaders(cors, { "Content-Type": "application/json" }),
      });
    }
    await audit(admin, userId, "vault_signed_upload", "ok", { object_path: objectPath, category });
    return new Response(JSON.stringify({ bucket: BUCKET, object_path: objectPath, signed: data }), {
      status: 200,
      headers: mergeResponseHeaders(cors, { "Content-Type": "application/json" }),
    });
  }

  if (action === "download") {
    const objectPath = String(body.object_path || "").trim();
    const expectedPrefix = `vault/${userId}/${category}/`;
    if (!objectPath.startsWith(expectedPrefix)) {
      await audit(admin, userId, "vault_signed_download", "error", { reason: "path_mismatch", object_path: objectPath });
      return new Response(JSON.stringify({ error: "Invalid object path" }), {
        status: 400,
        headers: mergeResponseHeaders(cors, { "Content-Type": "application/json" }),
      });
    }
    const ext = extensionOf(objectPath);
    if (!ext || !ALLOWED_EXTENSIONS.has(ext) || BLOCKED_EXTENSIONS.has(ext)) {
      await audit(admin, userId, "vault_signed_download", "error", { reason: "invalid_extension", ext });
      return new Response(JSON.stringify({ error: "Unsupported file type" }), {
        status: 400,
        headers: mergeResponseHeaders(cors, { "Content-Type": "application/json" }),
      });
    }
    const expiresIn = Math.min(MAX_EXPIRES_SECONDS, Math.max(30, Number(body.expires_in || 120)));
    const { data, error } = await admin.storage.from(BUCKET).createSignedUrl(objectPath, expiresIn, {
      download: true,
    });
    if (error || !data?.signedUrl) {
      await audit(admin, userId, "vault_signed_download", "error", { reason: "sign_failed", message: error?.message });
      return new Response(JSON.stringify({ error: error?.message || "Could not sign download URL" }), {
        status: 400,
        headers: mergeResponseHeaders(cors, { "Content-Type": "application/json" }),
      });
    }
    await audit(admin, userId, "vault_signed_download", "ok", { object_path: objectPath, expires_in: expiresIn });
    return new Response(JSON.stringify({ signed_url: data.signedUrl, expires_in: expiresIn }), {
      status: 200,
      headers: mergeResponseHeaders(cors, { "Content-Type": "application/json" }),
    });
  }

  await audit(admin, userId, "vault_signed_url", "error", { reason: "invalid_action", action });
  return new Response(JSON.stringify({ error: "Invalid action" }), {
    status: 400,
    headers: mergeResponseHeaders(cors, { "Content-Type": "application/json" }),
  });
});
