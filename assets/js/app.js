if (window.location.protocol === "file:") {
  document.body.innerHTML = `
    <div style="
      padding:40px;
      font-family:sans-serif;
      text-align:center;
    ">
      <h2>⚠ Local server required</h2>
      <p>This site uses components and must be run via a local server.</p>
      <p>Run:</p>
      <pre>npm start</pre>
      <p>Then open:</p>
      <pre>http://localhost:3000</pre>
    </div>
  `;
  throw new Error("Running via file:// not supported");
}

console.log("CasePath version: NEW BUILD");
function crLocalDevHost() {
  try {
    var h = String(window.location.hostname || "")
      .toLowerCase()
      .trim();
    if (!h) return true;
    if (h === "localhost" || h === "127.0.0.1") return true;
    if (h === "[::1]" || h === "::1") return true;
    return false;
  } catch (e) {
    return false;
  }
}

const DEV_MODE =
  crLocalDevHost() &&
  (window.CASEPATH_ENV === "development" || window.CASEPATH_ENABLE_DEV_ENTITLEMENTS === true);
window.DEV_MODE = DEV_MODE;

function normalizeCasePathEntitlements(member) {
  member = member || {};
  return Object.freeze({
    source: member.id ? "members" : null,
    plan: typeof member.plan === "string" ? member.plan : null,
    docCredits: Number.isFinite(Number(member.doc_credits)) ? Number(member.doc_credits) : 0,
  });
}

function setCasePathEntitlements(member) {
  window.CasePathEntitlements = normalizeCasePathEntitlements(member);
  return window.CasePathEntitlements;
}

function getCasePathEntitlements() {
  return window.CasePathEntitlements || setCasePathEntitlements(null);
}

setCasePathEntitlements(null);
window.getCasePathEntitlements = getCasePathEntitlements;

/*
CREATE TABLE vault_items (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id text,
  type text,
  payload jsonb,
  created_at timestamptz default now()
);

CREATE TABLE vault_shares (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  token text UNIQUE NOT NULL,
  payload jsonb,
  created_at timestamptz default now()
);
*/

const Vault = (() => {
  let key = null;

  async function deriveKey(password, salt) {
    const enc = new TextEncoder();
    const baseKey = await crypto.subtle.importKey(
      "raw",
      enc.encode(password),
      "PBKDF2",
      false,
      ["deriveKey"]
    );

    return crypto.subtle.deriveKey(
      {
        name: "PBKDF2",
        salt,
        iterations: 100000,
        hash: "SHA-256",
      },
      baseKey,
      { name: "AES-GCM", length: 256 },
      false,
      ["encrypt", "decrypt"]
    );
  }

  async function init(user) {
    const userScopedSaltKey = "vault_salt_" + String((user && user.id) || "anon");
    let storedSalt = localStorage.getItem(userScopedSaltKey);

    if (!storedSalt) {
      // One-time migration for older builds that used a global salt key.
      const legacySalt = localStorage.getItem("vault_salt");
      if (legacySalt) {
        storedSalt = legacySalt;
        localStorage.setItem(userScopedSaltKey, legacySalt);
      }
    }

    let salt;
    if (!storedSalt) {
      salt = crypto.getRandomValues(new Uint8Array(16));
      localStorage.setItem(userScopedSaltKey, JSON.stringify(Array.from(salt)));
    } else {
      salt = new Uint8Array(JSON.parse(storedSalt));
    }

    const password = String((user && user.id) || (user && user.email) || "");
    key = await deriveKey(password, salt);
  }

  async function encrypt(data) {
    const iv = crypto.getRandomValues(new Uint8Array(12));
    const encoded = new TextEncoder().encode(JSON.stringify(data));

    const encrypted = await crypto.subtle.encrypt({ name: "AES-GCM", iv }, key, encoded);

    return {
      iv: Array.from(iv),
      blob: Array.from(new Uint8Array(encrypted)),
    };
  }

  async function decrypt(payload) {
    const iv = new Uint8Array(payload.iv);
    const data = new Uint8Array(payload.blob);

    const decrypted = await crypto.subtle.decrypt({ name: "AES-GCM", iv }, key, data);

    return JSON.parse(new TextDecoder().decode(decrypted));
  }

  return { init, encrypt, decrypt };
})();

window.Vault = Vault;
console.log("Component system starting");

const initialised = {};

function initAI() {
  if (typeof window === "undefined" || window.CASEPATH_ENABLE_AI_ASSISTANT !== true) return;
  const input = document.getElementById("ai-input") || document.getElementById("ai-chat-input");
  const btn = document.getElementById("ai-send");
  if (!input || !btn) return;
  if (btn.dataset.aiWired === "1") return;
  btn.dataset.aiWired = "1";
  btn.onclick = async () => {
    const msg = String(input.value || "").trim();
    if (!msg) return;
    const reply =
      typeof callAI === "function"
        ? await callAI(msg)
        : (typeof runAIAssistant === "function" ? (await runAIAssistant(msg), null) : null);
    console.log("AI reply:", reply);
  };
}

function initNav() {
  const nav = document.querySelector("#nav nav, nav");
  if (nav) nav.style.display = "block";
}

function initPricing() {
  if (typeof casepathBindPricingCheckoutDelegation === "function") {
    casepathBindPricingCheckoutDelegation();
  }
  if (typeof window.__flushPricingHighlightPending === "function") {
    window.__flushPricingHighlightPending();
  }
}
function initLawyer() {}

function initComponent(id) {
  if (initialised[id]) return;
  initialised[id] = true;
  switch (id) {
    case "nav":
      if (typeof initNav === "function") initNav();
      break;
    case "pricing":
      if (typeof initPricing === "function") initPricing();
      break;
    case "lawyer":
      if (typeof initLawyer === "function") initLawyer();
      break;
    case "ai-assistant":
      if (typeof initAI === "function") initAI();
      break;
    default:
      break;
  }
}

async function loadComponent(id, file) {
  try {
    console.log("Loading:", file);
    const normal = String(file || "").replace(/^\/+/, "");
    const attempted = new Set();
    const candidates = ["/" + normal, "./" + normal, normal];
    let html = "";
    let loaded = false;
    for (const url of candidates) {
      if (!url || attempted.has(url)) continue;
      attempted.add(url);
      try {
        const res = await fetch(url);
        if (!res.ok) continue;
        html = await res.text();
        loaded = true;
        break;
      } catch (e) {
        // keep trying alternate path styles
      }
    }
    if (!loaded) throw new Error(file);

    const el = document.getElementById(id);
    if (!el) {
      console.warn("Missing container:", id);
      return;
    }

    el.innerHTML = html;

    if (typeof initComponent === "function") {
      initComponent(id);
    }

  } catch (err) {
    console.error("Failed:", file, err);
  }
}

function sleep(ms) {
  return new Promise(function (resolve) {
    setTimeout(resolve, ms);
  });
}

const NAV_LABELS = {
  "nav-mission": "Our Mission",
  "nav-glossary": "Glossary",
  "nav-kids": "About the Kids",
  "nav-mental-health": "Mental Health",
  "nav-your-team": "Your Family Team",
  "nav-avo": "AVO Centre",
  "nav-parenting-orders": "Parenting Orders",
  "nav-doc-helper": "Output Workflows",
  "nav-ai-assistant": "Case Assistant",
  "nav-referrals": "Referrals",
  "nav-pricing": "Pricing",
  "nav-your-case-pulse": "Your Case",
};

function applyNavLabels() {
  Object.entries(NAV_LABELS).forEach(function (entry) {
    const id = entry[0];
    const label = entry[1];
    const el = document.getElementById(id);
    if (el) el.textContent = label;
  });
}

function checkoutReturnDetected() {
  if (typeof window === "undefined" || !window.location) return false;
  const params = new URLSearchParams(window.location.search || "");
  if (params.get("checkout") === "success") return true;
  if (params.get("checkout") === "cancel") return true;
  if (params.get("success") === "true") return true;
  if (params.has("session_id")) return true;
  const q = window.location.search || "";
  return q.includes("checkout=success") || q.includes("success");
}

/** Stripe success_url only — avoids treating ?checkout=cancel as a paid return. */
function checkoutSuccessReturnDetected() {
  if (typeof window === "undefined" || !window.location) return false;
  const params = new URLSearchParams(window.location.search || "");
  if (params.get("checkout") === "cancel") return false;
  if (params.get("checkout") === "success") return true;
  if (params.has("session_id")) return true;
  if (params.get("success") === "true") return true;
  const q = window.location.search || "";
  return q.includes("checkout=success");
}

function clearCheckoutReturnParamsFromUrl() {
  if (typeof window === "undefined" || !window.location || !window.history) return;
  const url = new URL(window.location.href);
  const keys = ["success", "session_id", "canceled", "cancelled", "checkout"];
  let changed = false;
  keys.forEach(function (key) {
    if (url.searchParams.has(key)) {
      url.searchParams.delete(key);
      changed = true;
    }
  });
  if (!changed) return;
  const next =
    url.pathname + (url.searchParams.toString() ? "?" + url.searchParams.toString() : "") + url.hash;
  window.history.replaceState({}, "", next);
}

function showCheckoutVerificationNotice(message, tone) {
  if (typeof document === "undefined") return;
  const existing = document.getElementById("checkout-verify-notice");
  if (existing) existing.remove();

  const el = document.createElement("div");
  el.id = "checkout-verify-notice";
  el.textContent = message;
  el.style.position = "fixed";
  el.style.right = "14px";
  el.style.bottom = "14px";
  el.style.maxWidth = "420px";
  el.style.padding = "10px 12px";
  el.style.borderRadius = "10px";
  el.style.fontSize = "13px";
  el.style.zIndex = "9999";
  el.style.boxShadow = "0 6px 18px rgba(0,0,0,0.12)";
  el.style.border = "1px solid";

  if (tone === "warn") {
    el.style.background = "#fff7ed";
    el.style.color = "#9a3412";
    el.style.borderColor = "#fdba74";
  } else {
    el.style.background = "#f0fdf4";
    el.style.color = "#166534";
    el.style.borderColor = "#86efac";
  }

  document.body.appendChild(el);
  setTimeout(function () {
    const node = document.getElementById("checkout-verify-notice");
    if (node) node.remove();
  }, 9000);
}

async function updateAuthUI() {
  try {
    const guestWrap = document.getElementById("nav-guest-actions");
    const signOutBtn = document.getElementById("navSignOutBtn");
    const yourCaseNav = document.getElementById("nav-your-case-pulse");

    let session = null;
    if (window.supabaseClient && window.supabaseClient.auth) {
      const { data } = await window.supabaseClient.auth.getSession();
      session = data && data.session ? data.session : null;
    }

    if (guestWrap && signOutBtn) {
      if (session) {
        guestWrap.style.display = "none";
        signOutBtn.style.display = "inline-flex";
        if (yourCaseNav) yourCaseNav.style.display = "inline-block";
      } else {
        guestWrap.style.display = "flex";
        signOutBtn.style.display = "none";
        if (yourCaseNav) yourCaseNav.style.display = "none";
      }
      return;
    }

    const signinBtn = document.getElementById("nav-signin-btn");
    const signupBtn = document.getElementById("nav-signup-btn");
    const legacyUser = document.getElementById("nav-user-area");
    if (!signinBtn || !signupBtn || !legacyUser) return;

    if (session) {
      signinBtn.style.display = "none";
      signupBtn.style.display = "none";
      legacyUser.style.display = "flex";
      if (yourCaseNav) yourCaseNav.style.display = "inline-block";
    } else {
      signinBtn.style.display = "inline-block";
      signupBtn.style.display = "inline-block";
      legacyUser.style.display = "none";
      if (yourCaseNav) yourCaseNav.style.display = "none";
    }
  } catch (e) {
    console.warn("updateAuthUI failed:", e);
  }
}

window.updateAuthUI = updateAuthUI;

async function verifyCheckoutEntitlementsAfterReturn() {
  if (!checkoutSuccessReturnDetected()) return;
  if (!DEV_MODE && !crSupabaseAuthedSafe()) {
    console.warn("Stripe return detected but no auth session yet.");
    return;
  }

  console.log("Returned from Stripe checkout");
  const attempts = 4;
  let verified = false;

  for (let i = 0; i < attempts; i++) {
    await syncUser();
    const entitlements = getCasePathEntitlements();
    const hasEntitlements = !!(
      entitlements.plan || (typeof entitlements.docCredits === "number" && entitlements.docCredits > 0)
    );
    if (hasEntitlements) {
      verified = true;
      break;
    }
    await sleep(1500);
  }

  if (verified) {
    showCheckoutVerificationNotice("Payment confirmed. Your entitlements are active.", "ok");
    console.log("Payment success detected and entitlements verified.");
  } else {
    showCheckoutVerificationNotice(
      "Payment return detected, but entitlements are still syncing. Refresh in 10-20 seconds.",
      "warn"
    );
    console.warn("Payment return detected but entitlements not visible yet.");
  }

  if (typeof updateNav === "function") updateNav();
  if (typeof updateGates === "function") updateGates();
  updateCreditDisplay();
  clearCheckoutReturnParamsFromUrl();
}

document.addEventListener("DOMContentLoaded", async () => {
  const monolith =
    typeof document !== "undefined" &&
    document.getElementById("page-home") &&
    document.getElementById("page-pricing");
  if (monolith) {
    console.log("Monolithic index detected; skipping fragment component loader.");
    return;
  }

  console.log("Loading components...");

  await loadComponent("nav", "/components/nav.html");
  await loadComponent("glossary", "/components/glossary.html");
  await loadComponent("pricing", "/components/pricing.html");
  await loadComponent("lawyer", "/components/lawyer.html");
  await loadComponent("ai-assistant", "/components/ai-assistant.html");
  applyNavLabels();

  console.log("All components loaded");
});

function crSupabaseAuthedSafe() {
  if (DEV_MODE) return true;
  try {
    return typeof crSupabaseAuthed === "function" && !!crSupabaseAuthed();
  } catch (e) {
    return false;
  }
}
window.crSupabaseAuthedSafe = crSupabaseAuthedSafe;

function isAuthenticated() {
  try {
    if (window.__crAuthHydrated && window.authState && window.authState.isAuthenticated) return true;
  } catch (e) {
    /* ignore */
  }
  return (
    window.currentUser &&
    window.currentUser.loggedIn === true &&
    window.currentUser.source === "supabase"
  );
}
window.isAuthenticated = isAuthenticated;

function getCourtFromPostcode(postcode) {
  if (!postcode) return null;

  const code = parseInt(String(postcode).trim(), 10);
  if (!Number.isFinite(code)) return null;

  const map = window.POSTCODE_MAP;
  if (!Array.isArray(map)) return null;

  for (const entry of map) {
    if (code >= entry.range[0] && code <= entry.range[1]) {
      return entry;
    }
  }

  return { region: "Unknown", court: "Check local registry" };
}
window.getCourtFromPostcode = getCourtFromPostcode;

// TODO: use region to filter parenting advice, AVO guidance, and local referrals.

function enrichCurrentUserFromPostcode() {
  if (!window.currentUser || window.currentUser.loggedIn !== true) return;
  delete window.currentUser.region;
  delete window.currentUser.court;
  const location = getCourtFromPostcode(window.currentUser.postcode);
  if (location) {
    window.currentUser.region = location.region;
    window.currentUser.court = location.court;
    if (window.currentUser.region) {
      console.log("User region:", window.currentUser.region);
    }
  }
}

function updateUserLocationDisplay() {
  const el = document.getElementById("user-location");
  if (!el) return;
  if (!window.currentUser?.loggedIn || !window.currentUser?.court) {
    el.textContent = "";
    return;
  }
  el.textContent = `Likely court: ${window.currentUser.court}`;
}
window.updateUserLocationDisplay = updateUserLocationDisplay;

function findRelevantGlossary(text) {
  if (!text || !window.GLOSSARY) return [];

  const lower = String(text).toLowerCase();

  return window.GLOSSARY.filter(function (entry) {
    const termMatch = entry.term && lower.includes(entry.term.toLowerCase());
    const categoryMatch = entry.category && lower.includes(entry.category.toLowerCase());

    const keywordMatch =
      entry.term &&
      entry.term
        .toLowerCase()
        .split(/\s+/)
        .filter(function (word) {
          return word.length >= 2;
        })
        .some(function (word) {
          return lower.includes(word);
        });

    return termMatch || categoryMatch || keywordMatch;
  }).slice(0, 5);
}
window.findRelevantGlossary = findRelevantGlossary;

function buildGlossaryContext(matches) {
  if (!matches || !matches.length) return "";

  return (
    "\nRelevant legal concepts:\n" +
    matches
      .map(function (m) {
        return "- " + m.term + ": " + (m.definition || "");
      })
      .join("\n") +
    "\n"
  );
}
window.buildGlossaryContext = buildGlossaryContext;

function buildPersonalisedGuidance(userInput) {
  if (!window.currentUser) return "";

  const matches = findRelevantGlossary(userInput);

  let guidance = "";

  if (matches.length) {
    guidance += "Relevant to your situation:\n";
    guidance += matches
      .map(function (m) {
        return "• " + m.term + ": " + (m.when || m.definition || "");
      })
      .join("\n");
  }

  if (window.currentUser.court) {
    guidance += "\n\nYour likely court: " + window.currentUser.court;
  }

  return guidance;
}
window.buildPersonalisedGuidance = buildPersonalisedGuidance;

function buildEnhancedAIUserPrompt(userInput) {
  const raw = String(userInput || "").trim();
  if (!raw) return raw;
  try {
    const matches = findRelevantGlossary(raw);
    const glossaryContext = buildGlossaryContext(matches);
    const personalised = buildPersonalisedGuidance(raw);

    return (
      (glossaryContext ? glossaryContext + "\n" : "") +
      (personalised ? personalised + "\n\n" : "") +
      "User question:\n" +
      raw +
      "\n\nRespond clearly in plain English.\nUse relevant legal concepts where helpful.\nKeep explanations practical and relevant to Australian family law."
    );
  } catch (e) {
    console.warn("buildEnhancedAIUserPrompt", e);
    return raw;
  }
}
window.buildEnhancedAIUserPrompt = buildEnhancedAIUserPrompt;

function appendGlossaryMatchesToContainer(container, matches) {
  if (!container || !matches || !matches.length) return;
  const wrap = document.createElement("div");
  wrap.style.marginTop = "12px";
  wrap.style.fontSize = "14px";
  const strong = document.createElement("strong");
  strong.textContent = "Relevant to your situation:";
  wrap.appendChild(strong);
  const ul = document.createElement("ul");
  ul.style.margin = "0.25rem 0 0";
  matches.forEach(function (m) {
    const li = document.createElement("li");
    const b = document.createElement("strong");
    b.textContent = m.term || "";
    li.appendChild(b);
    li.appendChild(
      document.createTextNode(": " + (m.when || m.definition || "").replace(/<[^>]+>/g, "").trim())
    );
    ul.appendChild(li);
  });
  wrap.appendChild(ul);
  container.appendChild(wrap);
}
window.appendGlossaryMatchesToContainer = appendGlossaryMatchesToContainer;

function updateCreditDisplay() {
  const el = document.getElementById("credit-display");
  if (!el) return;

  const pricingNav = document.getElementById("nav-pricing");
  if (pricingNav) {
    pricingNav.style.fontWeight = "";
  }

  if (!window.currentUser || !window.currentUser.loggedIn) {
    el.textContent = "";
    el.innerHTML = "";
    el.style.color = "";
    updateBuilderCreditsNote();
    return;
  }

  const entitlements = getCasePathEntitlements();
  if (entitlements.plan === "pro") {
    el.innerHTML = "Pro Plan";
    el.style.color = "";
  } else {
    const c = typeof entitlements.docCredits === "number" ? entitlements.docCredits : 0;
    const docWord = c === 1 ? "document" : "documents";
    el.innerHTML =
      `Credits: ${c}<span style="display:block;font-size:13px;margin:2px 0 0;font-weight:400;">Enough for ${c} ${docWord}</span>`;
    el.style.color = c <= 2 ? "#b00020" : "";
    if (pricingNav && c <= 1) {
      pricingNav.style.fontWeight = "700";
    }
  }
  console.log("User credits:", entitlements.docCredits);
  updateBuilderCreditsNote();
}
window.updateCreditDisplay = updateCreditDisplay;

function updateBuilderCreditsNote() {
  const el = document.getElementById("builder-credits-note");
  if (!el) return;
  if (!window.currentUser || !window.currentUser.loggedIn) {
    el.textContent = "";
    el.innerHTML = "";
    return;
  }
  const entitlements = getCasePathEntitlements();
  if (entitlements.plan === "pro") {
    el.textContent = "Unlimited access";
    return;
  }
  const n = entitlements.docCredits || 0;
  let html = `You have ${n} credits remaining`;
  if (n <= 2) {
    html += "<br><span style=\"color:#b00020;\">You're almost out of credits</span>";
  }
  el.innerHTML = html;
}
window.updateBuilderCreditsNote = updateBuilderCreditsNote;

function checkLowCredits() {
  if (
    window.currentUser &&
    window.currentUser.loggedIn &&
    getCasePathEntitlements().plan !== "pro" &&
    getCasePathEntitlements().docCredits <= 2
  ) {
    console.warn("Low credits");
  }
}

/**
 * Consume one document credit for pay-as-you-go users (Supabase).
 * Pro: no debit; returns current balance.
 */
window.useCredit = async function useCredit() {
  try {
    if (!window.currentUser || !window.currentUser.loggedIn) {
      throw new Error("Not signed in");
    }
    if (typeof crSupabaseAuthed === "function" && !crSupabaseAuthed()) {
      throw new Error("Not signed in");
    }
    const u = window.currentUser;
    if (u.source !== "supabase") {
      throw new Error("Not signed in");
    }
    if (DEV_MODE) {
      return { remaining: getCasePathEntitlements().docCredits || 0 };
    }
    if (!window.supabaseClient || !u.id) {
      throw new Error("No client");
    }
    const baseUrl = (typeof window !== "undefined" && window.SUPABASE_PROJECT_URL) || "";
    const anon = typeof window !== "undefined" ? window.SUPABASE_ANON_KEY : "";
    if (!baseUrl) {
      throw new Error("No client");
    }
    const { data: sess } = await window.supabaseClient.auth.getSession();
    const token = sess?.session?.access_token;
    if (!token) {
      throw new Error("Not signed in");
    }
    const entitlements = getCasePathEntitlements();
    if (entitlements.plan !== "pro" && entitlements.docCredits === 1) {
      console.log("Upgrade trigger");
      alert("You're about to use your last credit. Upgrade for uninterrupted access.");
    }
    let res;
    try {
      res = await fetch(baseUrl.replace(/\/$/, "") + "/functions/v1/consume-doc-credit", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: "Bearer " + token,
          apikey: anon || "",
        },
        body: JSON.stringify({}),
      });
    } catch (err) {
      console.error("useCredit fetch:", err);
      throw err;
    }
    const payload = await res.json().catch(function () {
      return {};
    });
    if (!res.ok) {
      if (res.status === 402) {
        alert("You've run out of credits. Upgrade to continue.");
        throw new Error("No credits");
      }
      throw new Error((payload && payload.error && String(payload.error)) || res.statusText || "Debit failed");
    }
    const remaining =
      typeof payload.remaining === "number" ? payload.remaining : Number(payload.remaining);
    if (typeof window.syncUser === "function") {
      await window.syncUser();
    }
    try {
      if (window.currentUser) currentUser = window.currentUser;
    } catch (e) {
      /* ignore */
    }
    if (typeof checkLowCredits === "function") {
      checkLowCredits();
    }
    return { remaining: Number.isFinite(remaining) ? remaining : 0 };
  } finally {
    updateCreditDisplay();
  }
};

window.debugAuth = function debugAuth() {
  console.log("currentUser:", window.currentUser);
  console.log(
    "isAuthenticated:",
    typeof isAuthenticated === "function" ? isAuthenticated() : null
  );
};

function ensureCurrentUserPurchaseDefaults() {
  if (!window.CasePathEntitlements) setCasePathEntitlements(null);
}
window.ensureCurrentUserPurchaseDefaults = ensureCurrentUserPurchaseDefaults;

/** Resolve Stripe Price IDs from window at click time (not at script parse — avoids stale empty maps). */
function resolveStripePriceId(planKey) {
  var table = {
    starter_monthly: "STRIPE_PRICE_STARTER_MONTHLY",
    pro_monthly: "STRIPE_PRICE_PRO_MONTHLY",
    essential: "STRIPE_PRICE_ESSENTIAL",
    credits_1: "STRIPE_PRICE_CREDITS_1",
    credits_5: "STRIPE_PRICE_CREDITS_5",
    credits_10: "STRIPE_PRICE_CREDITS_10",
    parenting_pack: "STRIPE_PRICE_PARENTING_PACK",
    lawyer_portal: "STRIPE_PRICE_LAWYER_PORTAL",
  };
  var wk = table[String(planKey || "").trim()];
  if (!wk || typeof window === "undefined") return "";
  var v = window[wk];
  return typeof v === "string" ? v.trim() : "";
}
window.resolveStripePriceId = resolveStripePriceId;
window.STRIPE_PRICE_MAP = new Proxy(
  {},
  {
    get: function (_t, prop) {
      return resolveStripePriceId(String(prop));
    },
  }
);

window.debugBilling = () => {
  console.log("User:", window.currentUser);
};

var EARLY_ACCESS_FEATURE_PAGE = {
  document_builder: "doc-helper",
  parenting_orders: "parenting-orders",
  ai_assistant: "ai-assistant",
  vault: "vault",
  vault_basic: "vault",
  case_management: "vault",
  your_case_assistant: "vault",
};

function normalizeEarlyAccessFeature(feature) {
  var key = String(feature || "").trim();
  if (!key) return "";
  if (key === "vault_basic" || key === "case_management" || key === "your_case_assistant") return "vault";
  return key;
}

function isEarlyAccessFeature(feature) {
  var key = normalizeEarlyAccessFeature(feature);
  return (
    key === "document_builder" ||
    key === "parenting_orders" ||
    key === "ai_assistant" ||
    key === "vault"
  );
}

function earlyAccessStoreKey(feature) {
  return "casepath_early_access_" + normalizeEarlyAccessFeature(feature);
}

function markEarlyAccessAccepted(feature) {
  if (!isEarlyAccessFeature(feature)) return;
  var key = earlyAccessStoreKey(feature);
  if (!key) return;
  try {
    sessionStorage.setItem(key, "1");
  } catch (e) {}
}

function hasEarlyAccessAccepted(feature) {
  if (!isEarlyAccessFeature(feature)) return false;
  var key = earlyAccessStoreKey(feature);
  if (!key) return false;
  try {
    return sessionStorage.getItem(key) === "1";
  } catch (e) {
    return false;
  }
}

function routeEarlyAccessFeature(feature) {
  var key = normalizeEarlyAccessFeature(feature);
  var page = EARLY_ACCESS_FEATURE_PAGE[key];
  if (!page) {
    if (
      window.CasePathAuth &&
      window.CasePathAuth.redirect &&
      typeof window.CasePathAuth.redirect.safeAssignHref === "function"
    ) {
      window.CasePathAuth.redirect.safeAssignHref("/index.html");
      return true;
    }
    window.location.href = "/index.html";
    return false;
  }
  if (typeof showPage === "function") {
    showPage(page);
    return true;
  }
  if (
    window.CasePathAuth &&
    window.CasePathAuth.redirect &&
    typeof window.CasePathAuth.redirect.safeAssignHref === "function"
  ) {
    window.CasePathAuth.redirect.safeAssignHref("/index.html");
  } else {
    window.location.href = "/index.html";
  }
  return false;
}

function showPlannedPricingPage() {
  if (typeof showPage === "function") {
    showPage("pricing");
    return;
  }
  if (
    window.CasePathAuth &&
    window.CasePathAuth.redirect &&
    typeof window.CasePathAuth.redirect.safeAssignHref === "function"
  ) {
    window.CasePathAuth.redirect.safeAssignHref("/pricing.html");
    return;
  }
  window.location.href = "/pricing.html";
}

function setEarlyAccessModalError(msg) {
  var err = document.getElementById("casepath-early-access-error");
  if (!err) return;
  if (!msg) {
    err.style.display = "none";
    err.textContent = "";
    return;
  }
  err.textContent = String(msg);
  err.style.display = "";
}

function hideEarlyAccessModal() {
  var overlay = document.getElementById("casepath-early-access-modal");
  if (!overlay) return;
  overlay.classList.remove("show");
  overlay.setAttribute("aria-hidden", "true");
  try {
    var authEl = document.getElementById("auth-modal");
    if (!authEl || !authEl.classList.contains("show")) {
      document.documentElement.style.overflow = "";
    }
  } catch (e) {}
}

function ensureEarlyAccessModal() {
  if (typeof document === "undefined" || typeof document.body === "undefined") return;
  if (document.getElementById("casepath-early-access-modal")) return;

  var style = document.createElement("style");
  style.id = "casepath-early-access-style";
  style.textContent =
    "#casepath-early-access-modal{display:none;position:fixed;inset:0;background:rgba(20,36,28,0.7);z-index:100070;align-items:center;justify-content:center;padding:1rem;backdrop-filter:blur(6px);}"+
    "#casepath-early-access-modal.show{display:flex;}"+
    "#casepath-early-access-modal .casepath-early-access-card{background:var(--warm-white,#faf9f6);border-radius:24px;padding:1.5rem 1.5rem 1.25rem;width:100%;max-width:540px;box-shadow:0 32px 80px rgba(20,36,28,0.25);position:relative;}"+
    "#casepath-early-access-modal .casepath-early-access-close{position:absolute;top:0.85rem;right:0.85rem;width:40px;height:40px;border:none;border-radius:999px;background:var(--cream);color:var(--soft);font-size:1rem;cursor:pointer;}"+
    "#casepath-early-access-modal .casepath-early-access-badge{display:inline-flex;align-items:center;border:1px solid var(--border,#d8d7cf);border-radius:999px;padding:0.2rem 0.55rem;font-size:0.72rem;font-weight:600;color:var(--mid);margin-bottom:0.7rem;}"+
    "#casepath-early-access-modal h2{font-family:\"Lora\",serif;font-size:1.45rem;font-weight:700;color:var(--charcoal);margin:0 0 0.45rem;}"+
    "#casepath-early-access-modal p{font-size:0.9rem;color:var(--soft);line-height:1.5;margin:0 0 0.7rem;}"+
    "#casepath-early-access-modal .casepath-early-access-secondary{font-size:0.83rem;margin-bottom:0.95rem;}"+
    "#casepath-early-access-modal .casepath-early-access-actions{display:flex;flex-wrap:wrap;gap:0.6rem;margin-top:0.6rem;}"+
    "#casepath-early-access-modal .casepath-early-access-primary,#casepath-early-access-modal .casepath-early-access-secondary-btn{flex:1 1 220px;min-height:44px;border-radius:10px;border:none;padding:0.8rem 0.9rem;font-size:0.92rem;font-weight:600;font-family:inherit;cursor:pointer;}"+
    "#casepath-early-access-modal .casepath-early-access-primary{background:var(--sage);color:#fff;}"+
    "#casepath-early-access-modal .casepath-early-access-primary:hover{background:var(--sage-light);}"+
    "#casepath-early-access-modal .casepath-early-access-secondary-btn{background:transparent;color:var(--charcoal);border:1px solid var(--border,#d8d7cf);}"+
    "#casepath-early-access-modal #casepath-early-access-error{display:none;background:#fef2f2;border:1px solid #fca5a5;color:#b91c1c;font-size:0.8rem;padding:0.65rem 0.85rem;border-radius:8px;margin-top:0.75rem;}"+
    "@media (max-width:700px){#casepath-early-access-modal{align-items:flex-end;padding:0;}#casepath-early-access-modal .casepath-early-access-card{max-width:none;border-radius:20px 20px 0 0;padding:1.2rem 1rem 1rem;max-height:92dvh;overflow:auto;}#casepath-early-access-modal .casepath-early-access-primary,#casepath-early-access-modal .casepath-early-access-secondary-btn{flex:1 1 100%;}}";
  document.head.appendChild(style);

  var overlay = document.createElement("div");
  overlay.id = "casepath-early-access-modal";
  overlay.className = "modal-overlay";
  overlay.setAttribute("aria-hidden", "true");
  overlay.innerHTML =
    '<div class="casepath-early-access-card" role="dialog" aria-modal="true" aria-labelledby="casepath-early-access-title">' +
    '<button type="button" class="casepath-early-access-close" aria-label="Close">&times;</button>' +
    '<span class="casepath-early-access-badge">Early Access</span>' +
    '<h2 id="casepath-early-access-title">Start Free Early Access</h2>' +
    '<p>Access guided parenting order workflows, chronology tools, secure case workspace features and court-ready document assistance during the Early Access period.</p>' +
    '<p class="casepath-early-access-secondary">Pricing shown on the site reflects the intended launch structure. Early access users can explore and help shape the platform while development continues.</p>' +
    '<div class="casepath-early-access-actions">' +
    '<button type="button" class="casepath-early-access-primary" data-early-access-action="start">Start Free Early Access</button>' +
    '<button type="button" class="casepath-early-access-secondary-btn" data-early-access-action="pricing">View Planned Pricing</button>' +
    "</div>" +
    '<div id="casepath-early-access-error" role="status" aria-live="polite"></div>' +
    "</div>";
  document.body.appendChild(overlay);

  overlay.addEventListener("click", function (ev) {
    if (ev.target === overlay) hideEarlyAccessModal();
  });
  var closeBtn = overlay.querySelector(".casepath-early-access-close");
  if (closeBtn) {
    closeBtn.addEventListener("click", function () {
      hideEarlyAccessModal();
    });
  }
  overlay.addEventListener("click", function (ev) {
    var t = ev.target;
    if (!t || !t.getAttribute) return;
    var action = t.getAttribute("data-early-access-action");
    if (!action) return;
    ev.preventDefault();
    var feature = String(overlay.getAttribute("data-feature") || "");
    setEarlyAccessModalError("");
    if (action === "pricing") {
      hideEarlyAccessModal();
      showPlannedPricingPage();
      return;
    }
    if (action !== "start") return;
    if (!feature || !isEarlyAccessFeature(feature)) {
      setEarlyAccessModalError("We could not open that workflow right now. Returning to the homepage.");
      routeEarlyAccessFeature("");
      hideEarlyAccessModal();
      return;
    }
    markEarlyAccessAccepted(feature);
    window.pendingFeature = feature;
    if (typeof crSupabaseAuthed === "function" && crSupabaseAuthed()) {
      hideEarlyAccessModal();
      routeEarlyAccessFeature(feature);
      window.pendingFeature = null;
      return;
    }
    if (typeof openAuth === "function") {
      hideEarlyAccessModal();
      try {
        openAuth("signup");
      } catch (e2) {
        setEarlyAccessModalError("We could not open sign up. Please refresh and try again.");
      }
      return;
    }
    setEarlyAccessModalError("Sign up is not available right now. Please try again shortly.");
  });
}

function showEarlyAccessModal(feature) {
  ensureEarlyAccessModal();
  var overlay = document.getElementById("casepath-early-access-modal");
  if (!overlay) return;
  overlay.setAttribute("data-feature", normalizeEarlyAccessFeature(feature));
  setEarlyAccessModalError("");
  overlay.classList.add("show");
  overlay.setAttribute("aria-hidden", "false");
  try {
    document.documentElement.style.overflow = "hidden";
  } catch (e) {}
}
document.addEventListener("keydown", function (ev) {
  if (!ev || ev.key !== "Escape") return;
  var overlay = document.getElementById("casepath-early-access-modal");
  if (!overlay || !overlay.classList.contains("show")) return;
  hideEarlyAccessModal();
});

function requireAuth(feature) {
  if (DEV_MODE) return true;
  feature = normalizeEarlyAccessFeature(feature);
  if (typeof crSupabaseAuthed === "function" && crSupabaseAuthed()) {
    if (isEarlyAccessFeature(feature) && hasEarlyAccessAccepted(feature)) {
      return true;
    }
    var needsEmail =
      feature === "vault" ||
      feature === "vault_basic" ||
      feature === "document_builder" ||
      feature === "parenting_orders" ||
      feature === "lawyer_portal" ||
      feature === "ai_assistant";
    if (
      needsEmail &&
      typeof window.CasePathAuth !== "undefined" &&
      typeof window.CasePathAuth.isEmailVerified === "function" &&
      !window.CasePathAuth.isEmailVerified()
    ) {
      if (typeof openAuth === "function") openAuth("signin");
      var se = document.getElementById("signin-error");
      if (se) {
        se.textContent =
          "Please verify your email before using this feature. Check your inbox and spam folder, or use “Resend confirmation email”.";
        se.style.display = "";
      }
      return false;
    }
    if (typeof hasAccess === "function" && hasAccess(feature)) return true;
    if (feature === "vault" && typeof hasAccess === "function" && hasAccess("vault_basic")) return true;
  }

  window.pendingFeature = feature;
  if (isEarlyAccessFeature(feature)) {
    showEarlyAccessModal(feature);
    return false;
  }
  if (typeof crSupabaseAuthed === "function" && crSupabaseAuthed()) {
    if (typeof showPage === "function") showPage("pricing");
    try {
      window.__pricingHighlightPending = feature;
    } catch (e) {}
    [0, 120, 350, 900].forEach(function (ms) {
      setTimeout(function () {
        if (typeof window.__flushPricingHighlightPending === "function") {
          window.__flushPricingHighlightPending();
        }
      }, ms);
    });
    window.pendingFeature = null;
  } else if (typeof openAuth === "function") {
    openAuth("signup");
  }

  return false;
}
window.requireAuth = requireAuth;

function hasAccess(feature) {
  if (DEV_MODE) return true;
  const entitlements = getCasePathEntitlements();
  const plan = String(entitlements.plan || "").toLowerCase();

  if (plan === "pro") return true;

  // TODO(production-gating): align starter vs essential vs pro with Stripe entitlements and fair-use caps.
  const starterOrEssential = plan === "essential" || plan === "starter";

  const baseFree = new Set([
    "home",
    "glossary",
    "mental_health",
    "kids",
    "forms",
    "legislation",
    "your_family_team",
  ]);
  if (baseFree.has(feature)) return true;

  if (
    feature === "litigation_tracker" ||
    feature === "qa" ||
    feature === "ask_bot"
  ) {
    return starterOrEssential;
  }

  if (feature === "document_builder") {
    return true;
  }

  if (feature === "parenting_orders") {
    return plan === "casepack" || plan === "parenting_pack" || plan === "starter";
  }

  if (feature === "lawyer_portal") {
    return plan === "lawyer_portal" || plan === "lawyer_portal_access";
  }

  if (
    feature === "vault" ||
    feature === "vault_basic" ||
    feature === "case_management" ||
    feature === "ai_assistant" ||
    feature === "your_case_assistant"
  ) {
    // TODO(production-gating): return true for Case Assistant only when entitlements include paid workspace tier.
    return false;
  }

  return false;
}
window.hasAccess = hasAccess;

function ensureGateBadgeStyles() {
  if (typeof document === "undefined") return;
  var prev = document.getElementById("cr-gate-badge-styles");
  if (prev) prev.remove();
}

function clearNavStripeAttrs(el) {
  el.removeAttribute("data-cr-locked");
  el.removeAttribute("data-cr-nav-badge");
  el.removeAttribute("data-gate-feature");
  el.removeAttribute("title");
}

function navStripeSignedIn() {
  try {
    if (window.__crAuthHydrated && window.authState && window.authState.isAuthenticated) return true;
  } catch (e) {
    /* ignore */
  }
  if (typeof window.crSupabaseAuthed === "function" && window.crSupabaseAuthed()) return true;
  return false;
}

/** Rollout badges only; account-gated sections use kind "account". */
function navStripeTargets() {
  return [
    { selector: "#nav-ai-assistant", kind: "soon", title: "Case Assistant — coming soon (interactive assistant not enabled yet)." },
    { selector: "#nav-parenting-orders", kind: "soon", title: "Parenting Orders draft generator — coming soon." },
    { selector: "#nav-referrals", kind: "soon" },
    { selector: "#nav-lawyer-portal", kind: "soon" },
    { selector: "#nav-mental-health", kind: "account" },
    { selector: "#nav-kids", kind: "account" },
    { selector: "#nav-your-team", kind: "account" },
    { selector: "#nav-avo", kind: "account" },
    { selector: "#nav-new-item", kind: "account" },
  ];
}

function updateGates() {
  if (DEV_MODE || typeof document === "undefined") return;
  ensureGateBadgeStyles();
  var signedIn = navStripeSignedIn();
  navStripeTargets().forEach(function (cfg) {
    const el = document.querySelector(cfg.selector);
    if (!el) return;
    clearNavStripeAttrs(el);
    if (cfg.kind === "soon") {
      el.setAttribute("data-cr-nav-badge", "soon");
      el.setAttribute("title", cfg.title || "Coming soon — this section is under development.");
      return;
    }
    if (cfg.kind === "account") {
      if (signedIn) return;
      el.setAttribute("data-cr-nav-badge", "account");
      el.setAttribute(
        "title",
        "Please create a free account to access this section."
      );
      return;
    }
  });

  var yc = document.querySelector("#nav-your-case-pulse");
  if (yc) {
    clearNavStripeAttrs(yc);
    yc.removeAttribute("data-cr-nav-tier");
    if (!signedIn) {
      yc.setAttribute("data-cr-nav-badge", "account");
      yc.setAttribute(
        "title",
        "Please create a free account to access this section."
      );
      yc.classList.remove("nav-mission-pulse");
    } else if (!hasAccess("vault")) {
      yc.setAttribute("data-cr-nav-badge", "upgrade");
      yc.setAttribute("data-gate-feature", "vault");
      yc.setAttribute("data-cr-nav-tier", "vault");
      yc.setAttribute(
        "title",
        "Your Case is your chronology source of truth. Upgrade to unlock full workspace access."
      );
      yc.classList.remove("nav-mission-pulse");
    } else {
      yc.classList.add("nav-mission-pulse");
    }
  }
}
window.updateGates = updateGates;

document.addEventListener(
  "click",
  function (e) {
    const soon =
      e.target && e.target.closest ? e.target.closest("[data-cr-nav-badge='soon']") : null;
    if (soon) {
      e.preventDefault();
      e.stopPropagation();
      if (typeof window.casepathShowComingSoonModal === "function") {
        window.casepathShowComingSoonModal();
      }
      return;
    }
    const account =
      e.target && e.target.closest ? e.target.closest("[data-cr-nav-badge='account']") : null;
    if (account) {
      if (!navStripeSignedIn()) {
        e.preventDefault();
        e.stopPropagation();
        if (typeof window.casepathShowAccountRequiredModal === "function") {
          window.casepathShowAccountRequiredModal();
        }
      }
      return;
    }
    const upgrade =
      e.target && e.target.closest
        ? e.target.closest("[data-cr-nav-badge='upgrade'][data-gate-feature]")
        : null;
    if (!upgrade) return;
    e.preventDefault();
    e.stopPropagation();
    const feature = upgrade.getAttribute("data-gate-feature");
    if (feature && typeof requireAuth === "function") requireAuth(feature);
  },
  true
);

/**
 * Navigate to the pricing page and apply highlight for a plan / pack (hero CTAs, deep links).
 * Does not start Stripe — use openPricingCheckout for that.
 */
function openPricing(highlightContext) {
  var ctx = String(highlightContext || "").trim() || "parenting_orders";
  try {
    window.__pricingHighlightPending = ctx;
  } catch (e) {
    /* ignore */
  }
  if (typeof showPage === "function") {
    showPage("pricing");
  }
  [0, 120, 350, 900].forEach(function (ms) {
    setTimeout(function () {
      if (typeof window.__flushPricingHighlightPending === "function") {
        window.__flushPricingHighlightPending();
      }
    }, ms);
  });
}
window.openPricing = openPricing;

var CASEPATH_CHECKOUT_SKUS = [
  "starter_monthly",
  "pro_monthly",
  "essential",
  "credits_1",
  "credits_5",
  "credits_10",
  "parenting_pack",
  "lawyer_portal",
];

function casepathIsStripeHostedCheckoutUrl(u) {
  try {
    var x = new URL(String(u || "").trim());
    if (x.protocol !== "https:") return false;
    var h = x.hostname.toLowerCase();
    return h === "stripe.com" || h.slice(-11) === ".stripe.com";
  } catch (e) {
    return false;
  }
}

function casepathShowCheckoutErrorToast(message) {
  var text = String(message || "Checkout could not start.").trim() || "Checkout could not start.";
  var id = "casepath-checkout-error-toast";
  try {
    var prev = document.getElementById(id);
    if (prev) prev.remove();
  } catch (e0) {}
  var wrap = document.createElement("div");
  wrap.id = id;
  wrap.setAttribute("role", "alert");
  wrap.style.cssText =
    "position:fixed;bottom:1.25rem;left:50%;transform:translateX(-50%);max-width:min(28rem,calc(100% - 2rem));z-index:2147483647;" +
    "background:#1e2420;color:#fffef9;padding:1rem 1.15rem 0.85rem;border-radius:12px;" +
    "box-shadow:0 12px 40px rgba(0,0,0,0.35);font-family:'DM Sans',system-ui,-apple-system,sans-serif;font-size:0.9rem;line-height:1.5;";
  var p = document.createElement("p");
  p.style.margin = "0 0 0.65rem";
  p.textContent = text;
  var btn = document.createElement("button");
  btn.type = "button";
  btn.textContent = "Dismiss";
  btn.style.cssText =
    "display:block;width:100%;background:#4a7c59;color:#fff;border:none;border-radius:8px;padding:0.45rem 0.6rem;font:inherit;font-weight:600;cursor:pointer;";
  btn.addEventListener("click", function () {
    try {
      wrap.remove();
    } catch (e1) {}
  });
  wrap.appendChild(p);
  wrap.appendChild(btn);
  var host = document.body || document.documentElement;
  host.appendChild(wrap);
  setTimeout(function () {
    try {
      if (wrap.parentNode) wrap.remove();
    } catch (e2) {}
  }, 14000);
}

function casepathCheckoutFailLogged(dataSnapshot, userMessage) {
  try {
    console.error(
      "[CasePath checkout] request failed",
      dataSnapshot != null ? JSON.stringify(dataSnapshot) : "{}"
    );
  } catch (e) {
    console.error("[CasePath checkout] request failed", dataSnapshot);
  }
  casepathShowCheckoutErrorToast(userMessage);
}

function casepathAlertCheckout(msg) {
  try {
    casepathShowCheckoutErrorToast(msg);
  } catch (e) {
    try {
      console.error("[checkout]", msg);
    } catch (e2) {}
    try {
      alert(String(msg || "Checkout could not start."));
    } catch (e3) {}
  }
}

function casepathCheckoutDiagnosticsEnabled() {
  try {
    return crLocalDevHost() || DEV_MODE;
  } catch (e) {
    return false;
  }
}

function casepathBindPricingCheckoutDelegation() {
  if (window.__casepathPricingCheckoutDelegationBound) return;
  window.__casepathPricingCheckoutDelegationBound = true;
  document.addEventListener(
    "click",
    function (ev) {
      var t = ev.target;
      if (!t || typeof t.closest !== "function") return;
      var btn = t.closest("[data-cp-checkout-sku]");
      if (!btn) return;
      if (btn.getAttribute("data-casepath-maintenance-disabled") === "1") return;
      if (btn.disabled === true || btn.getAttribute("aria-disabled") === "true") return;
      var sku = btn.getAttribute("data-cp-checkout-sku");
      if (!sku) return;
      sku = String(sku).trim();
      if (!sku) return;
      ev.preventDefault();
      if (typeof window.openPricingCheckout !== "function") {
        casepathCheckoutFailLogged(
          { code: "CLIENT_CHECKOUT_UNAVAILABLE" },
          "Checkout is not ready yet. Refresh the page and try again."
        );
        return;
      }
      void window.openPricingCheckout(sku);
    },
    false
  );
}

function casepathCheckoutMessageForResponse(status, data, requestedSku) {
  var code = data && data.code ? String(data.code) : "";
  var err = data && data.error ? String(data.error) : "";
  var errLower = err.toLowerCase();
  if (status === 401 || code === "UNAUTHORIZED") {
    return "Please sign in to continue to checkout.";
  }
  if (status === 403 || code === "CORS_FORBIDDEN") {
    return (
      "This page origin is not allowed to start checkout (CORS). Ask the site operator to add your origin to Supabase Edge secrets CASEPATH_ALLOWED_ORIGINS (or set SITE_URL to your https site)."
    );
  }
  if (code === "PRICE_NOT_CONFIGURED" || code === "UNKNOWN_SKU") {
    var diag = casepathCheckoutDiagnosticsEnabled();
    var sk = String((data && data.sku) || requestedSku || "").trim();
    if (diag && sk) {
      if (code === "UNKNOWN_SKU") {
        return (
          "Stripe plan mapping missing for: " +
          sk +
          " (SKU not in server whitelist). Allowed: " +
          CASEPATH_CHECKOUT_SKUS.join(", ") +
          "."
        );
      }
      var missDiag = data && data.missing_env;
      if (missDiag && missDiag.length) {
        return (
          "Stripe plan mapping missing for: " +
          sk +
          ". Set one of these Supabase Edge secrets to a live Stripe price_… ID: " +
          missDiag.join(", ") +
          "."
        );
      }
      return "Stripe plan mapping missing for: " + sk + ".";
    }
    var miss = data && data.missing_env;
    if (miss && miss.length) {
      return (
        "That plan is not available for checkout yet (Stripe price IDs not set on the server). Configure these Supabase Edge secrets: " +
        miss.join(", ") +
        "."
      );
    }
    return "That plan is not available for checkout yet. Choose another option or contact support.";
  }
  if (
    status === 400 &&
    (errLower.indexOf("missing priceid") !== -1 || errLower.indexOf("missing price_id") !== -1)
  ) {
    return (
      "Checkout server returned an outdated error (missing price). Deploy the latest create-checkout-session Edge function from the repo (SKU-based checkout) and set STRIPE_PRICE_* secrets for each plan in Supabase."
    );
  }
  if (code === "MISSING_CONFIGURATION" || code === "INVALID_SITE_URL") {
    var miss2 = data && data.missing_env;
    if (miss2 && miss2.length) {
      return (
        "Payments are not fully configured on the server yet. Missing: " +
        miss2.join(", ") +
        ". Add these in Supabase → Edge Functions → Secrets, then try again."
      );
    }
    return "Payments are not fully configured on the server yet. Please try again later.";
  }
  if (code === "STRIPE_ERROR" || status === 502) {
    return "Stripe is temporarily unavailable. Please wait a moment and try again.";
  }
  if (status === 500) {
    return "The checkout server hit an error. Please try again shortly.";
  }
  if (status === 400) {
    if (code === "CLIENT_PRICE_FORBIDDEN") {
      return "Invalid checkout request (client price fields are not accepted). Refresh the page and try again.";
    }
    if (code === "MALFORMED_JSON") {
      return "The checkout server returned an unreadable response. Please refresh and try again.";
    }
    return err || "Checkout could not start (invalid request).";
  }
  if (err) return err;
  return "Checkout could not start (" + status + ").";
}

async function openPricingCheckout(plan) {
  var planAliases = {
    doconce: "credits_1",
    doc_single: "credits_1",
    doc_five: "credits_5",
    full: "pro_monthly",
    full_access: "pro_monthly",
    pro: "pro_monthly",
    starter: "starter_monthly",
    essential_monthly: "essential",
    casepack: "parenting_pack",
    lawyer: "lawyer_portal",
    lawyer_portal_access: "lawyer_portal",
  };
  var planKey = planAliases[plan] || plan;

  var baseUrl = (typeof window !== "undefined" && window.SUPABASE_PROJECT_URL) || "";
  if (!baseUrl || !window.supabaseClient) {
    console.error("openPricingCheckout: missing Supabase client / URL");
    casepathCheckoutFailLogged(
      { code: "MISSING_SUPABASE_CLIENT", sku: planKey },
      "Payments are not connected yet (missing Supabase client). Check that supabase.js loaded and refresh."
    );
    return;
  }

  var checkoutEndpoint =
    String(baseUrl).replace(/\/$/, "") + "/functions/v1/create-checkout-session";

  var sess = null;
  try {
    var sessRes = await window.supabaseClient.auth.getSession();
    sess = sessRes && sessRes.data ? sessRes.data.session : null;
  } catch (e) {
    console.warn("openPricingCheckout: getSession failed", e);
  }
  var token = sess && sess.access_token ? sess.access_token : "";
  if (!token && !DEV_MODE) {
    console.warn("openPricingCheckout: sign in required");
    casepathShowCheckoutErrorToast("Please create an account or sign in to continue to checkout.");
    if (typeof openAuth === "function") openAuth("signup");
    return;
  }

  var sessionUser = sess && sess.user ? sess.user : null;
  if (
    !DEV_MODE &&
    sessionUser &&
    !(sessionUser.email_confirmed_at || sessionUser.new_email_confirmed_at)
  ) {
    console.warn("openPricingCheckout: email not verified");
    casepathShowCheckoutErrorToast(
      "Please verify your email before purchasing. Check your inbox and spam folder, then try again."
    );
    if (typeof openAuth === "function") openAuth("signin");
    return;
  }

  var anon = typeof window !== "undefined" ? window.SUPABASE_ANON_KEY : "";
  var returnPath =
    typeof window !== "undefined" && window.location && window.location.pathname
      ? window.location.pathname
      : "/";

  console.info("[CasePath checkout] request start");

  if (casepathCheckoutDiagnosticsEnabled()) {
    try {
      console.log("[CasePath checkout] payload", { sku: planKey, return_path: returnPath });
    } catch (eLog) {}
  }

  var res;
  try {
    res = await fetch(checkoutEndpoint, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: "Bearer " + token,
        apikey: anon || "",
      },
      body: JSON.stringify({
        sku: planKey,
        return_path: returnPath,
      }),
    });
  } catch (err) {
    console.error("openPricingCheckout fetch:", err);
    try {
      window.__casepathLastCheckout = {
        at: new Date().toISOString(),
        sku: planKey,
        status: 0,
        error: "network",
      };
    } catch (e2) {}
    casepathCheckoutFailLogged(
      { error: "network", sku: planKey, message: String(err && err.message ? err.message : err) },
      "Could not reach the checkout server. Check your connection, disable strict blockers for this site, and try again."
    );
    return;
  }

  var rawText = "";
  try {
    rawText = await res.text();
  } catch (e3) {
    rawText = "";
  }
  var data = {};
  if (rawText) {
    try {
      data = JSON.parse(rawText);
    } catch (e4) {
      data = { error: "Malformed JSON from checkout server", code: "MALFORMED_JSON" };
    }
  }

  try {
    window.__casepathLastCheckout = {
      at: new Date().toISOString(),
      sku: planKey,
      status: res.status,
      code: data && data.code,
      error: data && data.error,
    };
  } catch (e5) {}

  if (res.ok && data && data.code === "MALFORMED_JSON") {
    console.error("Checkout: 200 with unreadable JSON body");
    casepathCheckoutFailLogged(
      data,
      "Checkout could not start: the payment server returned an unexpected response. Please refresh and try again."
    );
    return;
  }

  if (!res.ok) {
    casepathCheckoutFailLogged(data, casepathCheckoutMessageForResponse(res.status, data, planKey));
    return;
  }

  var checkoutUrl = data && data.url ? String(data.url).trim() : "";

  if (!casepathIsStripeHostedCheckoutUrl(checkoutUrl)) {
    console.error("Checkout returned unexpected URL (rejecting redirect):", checkoutUrl);
    casepathCheckoutFailLogged(
      Object.assign({}, data, { rejected_url: checkoutUrl }),
      "Checkout could not start: the payment server returned an invalid redirect. Please try again or contact support."
    );
    return;
  }

  console.info("[CasePath checkout] request success");
  window.location.href = checkoutUrl;
}
window.openPricingCheckout = openPricingCheckout;
casepathBindPricingCheckoutDelegation();

window.casepathStripeDebug = function casepathStripeDebug() {
  var origin = "";
  try {
    origin = window.location.origin;
  } catch (e) {
    origin = "";
  }
  var siteUrlHint =
    "Set Supabase Edge secret SITE_URL to your canonical https origin (production default: https://casepath.com.au). Current browser origin: " +
    origin;
  var auth = {
    hasSession: false,
    userId: null,
    emailVerified: null,
  };
  try {
    if (window.__crAuthHydrated && window.authState) {
      auth.hasSession = !!window.authState.isAuthenticated;
    }
  } catch (e2) {}
  try {
    if (typeof crSupabaseAuthed === "function") {
      auth.hasSession = !!crSupabaseAuthed();
    }
  } catch (e3) {}
  try {
    if (window.currentUser) {
      auth.userId = window.currentUser.id || null;
      auth.emailVerified = window.currentUser.emailVerified;
    }
  } catch (e4) {}
  var baseUrl = (typeof window !== "undefined" && window.SUPABASE_PROJECT_URL) || "";
  var checkoutEp = baseUrl
    ? String(baseUrl).replace(/\/$/, "") + "/functions/v1/create-checkout-session"
    : "(missing SUPABASE_PROJECT_URL)";
  var last = window.__casepathLastCheckout || null;
  var out = {
    currentOrigin: origin,
    siteUrlExpectation: siteUrlHint,
    auth: auth,
    enabledCheckoutSkus: CASEPATH_CHECKOUT_SKUS,
    checkoutEndpointUrl: checkoutEp,
    lastCheckoutAttempt: last,
    stripeRedirectRule: "https only; hostname must be stripe.com or *.stripe.com",
  };
  console.log("[casepathStripeDebug]", out);
  return out;
};

window.casepathStripeDebugAsync = async function casepathStripeDebugAsync() {
  var base = window.casepathStripeDebug();
  try {
    if (window.supabaseClient && window.supabaseClient.auth) {
      var r = await window.supabaseClient.auth.getSession();
      var s = r && r.data ? r.data.session : null;
      var u = s && s.user ? s.user : null;
      base.auth = base.auth || {};
      base.auth.hasSession = !!(s && s.access_token);
      base.auth.userId = u && u.id ? u.id : base.auth.userId;
      base.auth.emailVerified = u
        ? !!(u.email_confirmed_at || u.new_email_confirmed_at)
        : base.auth.emailVerified;
      base.auth.email = u && u.email ? u.email : null;
    }
  } catch (e) {
    base.authSessionError = String(e && e.message ? e.message : e);
  }
  console.log("[casepathStripeDebugAsync]", base);
  return base;
};

window.highlightPlan = function highlightPlan(feature) {
  let targetPlan = null;
  let oneTime = null;

  document.querySelectorAll(".pricing-plan-card").forEach(function (el) {
    el.classList.remove("highlight-plan");
  });
  var lawyerTeaserPre = document.getElementById("pricing-lawyer-teaser");
  if (lawyerTeaserPre) lawyerTeaserPre.classList.remove("highlight-plan");

  switch (feature) {
    case "casepack":
    case "parenting_orders":
      oneTime = "parenting_pack";
      break;

    case "document_builder":
      oneTime = "credits_1";
      targetPlan = "starter";
      break;

    case "ai_assistant":
      targetPlan = "essential";
      break;

    case "vault":
    case "case_management":
    case "vault_basic":
      targetPlan = "pro";
      break;

    case "lawyer_portal": {
      var lawyerEl = document.getElementById("pricing-lawyer-teaser");
      if (lawyerEl) {
        lawyerEl.classList.add("highlight-plan");
        lawyerEl.scrollIntoView({ behavior: "smooth", block: "center" });
      }
      return;
    }

    default:
      break;
  }

  if (targetPlan) {
    const planEl = document.querySelector('[data-plan="' + targetPlan + '"]');
    if (planEl) planEl.classList.add("highlight-plan");
  }

  if (oneTime) {
    const oneTimeEl = document.querySelector('[data-onetime="' + oneTime + '"]');
    if (oneTimeEl) {
      oneTimeEl.classList.add("highlight-plan");
      oneTimeEl.scrollIntoView({ behavior: "smooth", block: "center" });
    }
  }
};

/** After /components/pricing.html is injected (async), scroll/highlight pending plan from openPricing(). */
window.__flushPricingHighlightPending = function __flushPricingHighlightPending() {
  var ctx = window.__pricingHighlightPending;
  if (!ctx || typeof window.highlightPlan !== "function") return false;
  var root = document.getElementById("page-pricing");
  if (!root || !root.querySelector(".pricing-plan-card")) return false;
  window.highlightPlan(ctx);
  try {
    delete window.__pricingHighlightPending;
  } catch (e) {
    window.__pricingHighlightPending = undefined;
  }
  return true;
};

function maybePostLoginPendingFeatureRedirect() {
  var feature = normalizeEarlyAccessFeature(window.pendingFeature);
  if (!feature) return false;
  if (!isEarlyAccessFeature(feature)) return false;
  if (!(typeof crSupabaseAuthed === "function" && crSupabaseAuthed())) return false;
  if (!hasEarlyAccessAccepted(feature)) return false;
  window.pendingFeature = null;
  routeEarlyAccessFeature(feature);
  return true;
}
window.maybePostLoginPendingFeatureRedirect = maybePostLoginPendingFeatureRedirect;

// ── Parenting order comparison (line-by-line) + court tone + export ─────────
// TODO: Replace rewriteClause with AI API for semantic rewriting and legal tone refinement

function rewriteClause(clause) {
  if (!clause) return "";

  let c = clause;

  c = c.replace(/she refuses to/gi, "the other party has not agreed to");
  c = c.replace(/he refuses to/gi, "the other party has not agreed to");
  c = c.replace(/she is lying/gi, "there is a dispute regarding");
  c = c.replace(/he is lying/gi, "there is a dispute regarding");
  c = c.replace(/always/gi, "on multiple occasions");
  c = c.replace(/never/gi, "has not");
  c = c.replace(/I demand/gi, "I seek orders that");
  c = c.replace(/she must/gi, "it is proposed that the other party");
  c = c.replace(/he must/gi, "it is proposed that the other party");

  c = c.replace(/unfair/gi, "");
  c = c.replace(/ridiculous/gi, "");
  c = c.replace(/crazy/gi, "");

  return c.trim();
}

function rewriteAllClauses(results) {
  if (!results) return [];

  return results.map((r) => ({
    ...r,
    user: rewriteClause(r.user),
    other: r.other ? rewriteClause(r.other) : null,
  }));
}

function buildComparisonResults(userText, otherText) {
  const ua = (userText || "")
    .split(/\r?\n/)
    .map(function (l) {
      return l.trim();
    });
  const ob = (otherText || "")
    .split(/\r?\n/)
    .map(function (l) {
      return l.trim();
    });
  const n = Math.max(ua.length, ob.length);
  const results = [];
  for (let i = 0; i < n; i++) {
    const u = ua[i] || "";
    const o = ob[i] || "";
    if (!u && !o) continue;
    if (u && o && u.toLowerCase() === o.toLowerCase()) {
      results.push({ type: "agreed", user: u, other: o });
    } else {
      results.push({
        type: "dispute",
        user: u || "(no text on this line — your proposal)",
        other: o || "(no text on this line — other party)",
      });
    }
  }
  return results;
}

function poCompareEscapeHtml(s) {
  return String(s)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

function renderComparisonAdvanced(results) {
  const el = document.getElementById("compare-advanced-out");
  if (!el || !results || !results.length) {
    if (el) el.innerHTML = "";
    return;
  }
  let html = '<ul style="margin:0;padding-left:1.15rem;">';
  results.forEach(function (r) {
    const border = r.type === "agreed" ? "var(--sage)" : "#c2410c";
    const label = r.type === "agreed" ? "Agreed" : "In dispute";
    html +=
      '<li style="margin-bottom:0.65rem;border-left:3px solid ' +
      border +
      ';padding-left:0.5rem;list-style-position:outside;">';
    html += "<strong>" + label + "</strong><br>";
    html += '<span style="color:var(--charcoal);">You: ' + poCompareEscapeHtml(r.user) + "</span>";
    if (r.other != null && r.other !== "") {
      html += '<br><span style="color:var(--mid);">Other: ' + poCompareEscapeHtml(r.other) + "</span>";
    }
    html += "</li>";
  });
  html += "</ul>";
  el.innerHTML = html;
}

function renderSummary(results) {
  const el = document.getElementById("compare-summary-out");
  if (!el || !results) return;
  const agreed = results.filter(function (r) {
    return r.type === "agreed";
  }).length;
  const disputed = results.filter(function (r) {
    return r.type === "dispute";
  }).length;
  el.textContent = agreed + " agreed line(s), " + disputed + " disputed line(s).";
}

function buildCourtSummary(results) {
  if (!results || !results.length) return "";

  const agreed = results.filter((r) => r.type === "agreed");
  const disputed = results.filter((r) => r.type === "dispute");

  let text = "MATTERS AGREED\n\n";

  agreed.forEach((a, i) => {
    text += (i + 1) + ". " + (a.user || "") + "\n";
  });

  text += "\nMATTERS IN DISPUTE\n\n";

  disputed.forEach((d, i) => {
    text += (i + 1) + ". " + (d.user || "") + "\n";
  });

  return text;
}

function downloadTextFile(filename, text) {
  if (!text) {
    console.warn("No content to download");
    return;
  }

  const blob = new Blob([text], { type: "text/plain" });
  const link = document.createElement("a");
  const url = URL.createObjectURL(blob);
  link.href = url;
  link.download = filename;

  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  setTimeout(function () {
    URL.revokeObjectURL(url);
  }, 0);
}

function ensureCompareOrderRewriteExportButtons() {
  const section = document.getElementById("compare-orders");
  if (!section) return;

  let host = document.getElementById("compare-orders-actions");
  if (!host) {
    const compareBtn = document.getElementById("compare-orders-btn");
    if (!compareBtn || !compareBtn.parentNode) return;
    host = document.createElement("div");
    host.id = "compare-orders-actions";
    host.setAttribute("style", "display:flex;flex-wrap:wrap;gap:0.5rem;margin-bottom:1rem;");
    compareBtn.parentNode.insertBefore(host, compareBtn.nextSibling);
  }

  if (!document.getElementById("rewrite-btn")) {
    const rewriteBtn = document.createElement("button");
    rewriteBtn.type = "button";
    rewriteBtn.id = "rewrite-btn";
    rewriteBtn.className = "po-next-btn";
    rewriteBtn.style.background = "var(--sage)";
    rewriteBtn.textContent = "Make Language Court-Appropriate";
    host.appendChild(rewriteBtn);
  }

  if (!document.getElementById("export-btn")) {
    const exportBtn = document.createElement("button");
    exportBtn.type = "button";
    exportBtn.id = "export-btn";
    exportBtn.className = "po-back-btn";
    exportBtn.style.margin = "0";
    exportBtn.textContent = "Download Court Summary";
    host.appendChild(exportBtn);
  }
}

function wireParentingOrderComparison() {
  const compareBtn = document.getElementById("compare-orders-btn");
  if (compareBtn && !compareBtn.dataset.wired) {
    compareBtn.dataset.wired = "1";
    compareBtn.addEventListener("click", function () {
      try {
        const uEl = document.getElementById("po-compare-user-text");
        const oEl = document.getElementById("po-compare-other-text");
        const results = buildComparisonResults(uEl ? uEl.value : "", oEl ? oEl.value : "");
        window.lastComparisonResults = results;
        if (typeof renderComparisonAdvanced === "function") {
          renderComparisonAdvanced(results);
        }
        if (typeof renderSummary === "function") {
          renderSummary(results);
        }
      } catch (err) {
        console.warn("Parenting comparison failed:", err);
      }
    });
  }
}

window.rewriteClause = rewriteClause;
window.rewriteAllClauses = rewriteAllClauses;
window.buildComparisonResults = buildComparisonResults;
window.renderComparisonAdvanced = renderComparisonAdvanced;
window.renderSummary = renderSummary;
window.buildCourtSummary = buildCourtSummary;
window.downloadTextFile = downloadTextFile;
window.wireParentingOrderComparison = wireParentingOrderComparison;
window.ensureCompareOrderRewriteExportButtons = ensureCompareOrderRewriteExportButtons;

function cdPrePopulateChron() {
  var existing = typeof cdLoadChron === "function" ? cdLoadChron() : [];
  if (existing.length > 0) return;
  var raw = null;
  try {
    raw = localStorage.getItem("cr_case");
  } catch (e) {
    raw = null;
  }
  if (!raw) return;
  var data = JSON.parse(raw);
  var procKey = data.procKey || "";
  var today = new Date().toISOString().split("T")[0];
  var seeds = [];
  if (procKey === "notstarted") {
    seeds.push({ date: today, cat: "Other", desc: "Parties separated." });
  } else if (procKey === "mediation") {
    seeds.push({
      date: today,
      cat: "Court",
      desc: "Family Dispute Resolution (mediation) commenced.",
    });
  } else if (procKey === "filed") {
    seeds.push({
      date: today,
      cat: "Court",
      desc: "Initiating Application filed with the FCFCOA.",
    });
  } else if (procKey === "served") {
    seeds.push({ date: today, cat: "Court", desc: "Documents served on the respondent." });
  } else if (procKey === "hearing") {
    seeds.push({ date: today, cat: "Court", desc: "Court hearing date approaching." });
  } else if (procKey === "orders") {
    seeds.push({ date: today, cat: "Court", desc: "Final orders made by the court." });
  }
  if (seeds.length > 0) {
    seeds.forEach(function (s, i) {
      s.id = Date.now() + i;
    });
    if (typeof cdSaveChron === "function") {
      cdSaveChron(seeds);
    }
  }
}
window.cdPrePopulateChron = cdPrePopulateChron;

function downloadDocx() {
  var raw = (document.getElementById("dh-input") || {}).value;
  raw = String(raw || "").trim();
  if (!raw) {
    alert("Please generate a document first.");
    return;
  }
  var btn = document.getElementById("dh-docx-btn");
  if (!btn) return;
  btn.textContent = "⏳ Generating…";
  btn.disabled = true;

  setTimeout(function () {
    try {
      var lines = raw
        .split(/\n+/)
        .map(function (s) {
          return s.trim();
        })
        .filter(function (s) {
          return s.length > 5;
        });
      var family =
        (document.getElementById("dh-family-name") || {}).value ||
        (document.getElementById("dh-gen-family") || {}).value ||
        "";
      var given =
        (document.getElementById("dh-given-names") || {}).value ||
        (document.getElementById("dh-gen-given") || {}).value ||
        "";
      var typeNames = {
        affidavit: "Affidavit",
        "affidavit-avo": "Affidavit_AVO_Local_Court",
        "affidavit-care": "Affidavit_Care_Protection",
        "notice-of-risk": "Notice_of_Risk",
        initiating: "Initiating_Application",
        response: "Response_to_Application",
        consent: "Consent_Orders",
        "divorce-sole": "Divorce_Sole",
        "divorce-joint": "Divorce_Joint",
        financial: "Financial_Statement",
      };
      var selectedType = typeof dhSelectedType !== "undefined" ? dhSelectedType : "";
      var fname =
        (typeNames[selectedType] || "CasePath_Document") +
        "_" +
        new Date().toISOString().slice(0, 10) +
        ".docx";

      function esc(s) {
        return String(s)
          .replace(/&/g, "&amp;")
          .replace(/</g, "&lt;")
          .replace(/>/g, "&gt;")
          .replace(/"/g, "&quot;");
      }
      function para(t, bold, center) {
        var rPr = bold ? "<w:b/>" : "";
        var pPr = center ? '<w:pPr><w:jc w:val="center"/></w:pPr>' : "";
        return (
          "<w:p>" +
          pPr +
          "<w:r>" +
          (rPr ? "<w:rPr>" + rPr + "</w:rPr>" : "") +
          '<w:t xml:space="preserve">' +
          esc(t) +
          "</w:t></w:r></w:p>"
        );
      }
      var body = para("Federal Circuit and Family Court of Australia", true, true);
      body += para((typeNames[selectedType] || "Document").replace(/_/g, " ").toUpperCase(), true, true);
      body += para("");
      body += para("Applicant: " + given + " " + family, false, false);
      body += para("");
      body += para("STATEMENT OF FACTS", true, false);
      lines.forEach(function (line, i) {
        body += para(i + 1 + ".  " + line);
      });
      body += para("");
      body += para("Signature: ________________________   Date: _____________");

      var xmlDoc =
        '<?xml version="1.0" encoding="UTF-8" standalone="yes"?>' +
        '<w:document xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main">' +
        "<w:body>" +
        body +
        '<w:sectPr><w:pgMar w:top="1440" w:right="1440" w:bottom="1440" w:left="1440"/></w:sectPr></w:body></w:document>';

      var zip = new JSZip();
      zip.file(
        "[Content_Types].xml",
        '<?xml version="1.0" encoding="UTF-8"?><Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types"><Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/><Default Extension="xml" ContentType="application/xml"/><Override PartName="/word/document.xml" ContentType="application/vnd.openxmlformats-officedocument.wordprocessingml.document.main+xml"/></Types>'
      );
      zip.file(
        "_rels/.rels",
        '<?xml version="1.0" encoding="UTF-8"?><Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships"><Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument" Target="word/document.xml"/></Relationships>'
      );
      zip.file("word/document.xml", xmlDoc);
      zip.file(
        "word/_rels/document.xml.rels",
        '<?xml version="1.0" encoding="UTF-8"?><Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships"></Relationships>'
      );

      zip
        .generateAsync({
          type: "blob",
          mimeType: "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
        })
        .then(function (blob) {
          var url = URL.createObjectURL(blob);
          var a = document.createElement("a");
          a.href = url;
          a.download = fname;
          document.body.appendChild(a);
          a.click();
          document.body.removeChild(a);
          URL.revokeObjectURL(url);
          btn.textContent = "⬇️ Download Word (.docx)";
          btn.disabled = false;
        });
    } catch (e) {
      btn.textContent = "⬇️ Download Word (.docx)";
      btn.disabled = false;
      alert("Error: " + e.message);
    }
  }, 50);
}
window.downloadDocx = downloadDocx;

const VAULT_ALLOWED_FILE_EXTENSIONS = new Set(["pdf", "jpg", "jpeg", "png", "txt", "docx", "zip"]);
const VAULT_BLOCKED_EXTENSIONS = new Set(["exe", "js", "php", "html", "htm", "svg"]);
const VAULT_ALLOWED_MIME_TYPES = new Set([
  "application/pdf",
  "image/jpeg",
  "image/png",
  "text/plain",
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
  "application/zip",
  "application/x-zip-compressed",
]);
const VAULT_MAX_FILE_SIZE_BYTES = 15 * 1024 * 1024;
const VAULT_INDEXED_DB = "casepath_vault_local";
const VAULT_AUTOSAVE_STORE = "autosave";
const VAULT_PENDING_STORE = "pending";

// Canonical vault category allow-list. Must stay in sync with:
//   - supabase/functions/vault-signed-url/index.ts (ALLOWED_CATEGORIES)
//   - supabase/migrations/20260511180000_phase33_storage_vault_security.sql
//     (casepath_storage_object_allowed_path + storage object naming `vault/<uid>/<category>/...`)
const VAULT_ALLOWED_CATEGORIES = new Set([
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
const VAULT_DEFAULT_CATEGORY = "evidence";

// Single source of truth mapping chronology event_type values
// (see case_chronology_events_type_check in
//  supabase/migrations/20260511190000_phase34_event_centric_chronology.sql)
// onto the vault storage categories above. Every raw event_type entering
// the vault upload pipeline MUST be resolved through mapEventTypeToVaultCategory.
const CHRONOLOGY_EVENT_TO_VAULT_CATEGORY = Object.freeze({
  incident: "evidence",
  court: "court-orders",
  avo: "court-orders",
  breach: "evidence",
  communication: "communications",
  parenting: "parenting",
  financial: "financial",
  medical: "medical",
  wellbeing: "medical",
  school: "school",
  task: "tasks",
  agreement: "documents",
});

function mapEventTypeToVaultCategory(eventType) {
  const normalized = String(eventType == null ? "" : eventType).trim().toLowerCase();
  if (!normalized) {
    console.warn(
      "[vault] missing chronology event_type; falling back to '" + VAULT_DEFAULT_CATEGORY + "'"
    );
    return VAULT_DEFAULT_CATEGORY;
  }
  const mapped = CHRONOLOGY_EVENT_TO_VAULT_CATEGORY[normalized];
  if (!mapped || !VAULT_ALLOWED_CATEGORIES.has(mapped)) {
    console.warn(
      "[vault] unknown chronology event_type '" + normalized +
      "' has no canonical vault category; falling back to '" + VAULT_DEFAULT_CATEGORY + "'"
    );
    return VAULT_DEFAULT_CATEGORY;
  }
  return mapped;
}
window.mapEventTypeToVaultCategory = mapEventTypeToVaultCategory;
window.VAULT_ALLOWED_CATEGORIES = VAULT_ALLOWED_CATEGORIES;
window.VAULT_DEFAULT_CATEGORY = VAULT_DEFAULT_CATEGORY;

function vaultGetExtension(name) {
  const n = String(name || "");
  const idx = n.lastIndexOf(".");
  return idx < 0 ? "" : n.slice(idx + 1).toLowerCase();
}

function vaultValidateFileMeta(file) {
  if (!file || !file.name) return "No file selected.";
  const ext = vaultGetExtension(file.name);
  if (!ext || !VAULT_ALLOWED_FILE_EXTENSIONS.has(ext)) {
    return "Unsupported file type. Allowed: PDF, JPG, PNG, TXT, DOCX, ZIP.";
  }
  if (VAULT_BLOCKED_EXTENSIONS.has(ext)) {
    return "This file type is blocked for security reasons.";
  }
  if (file.size > VAULT_MAX_FILE_SIZE_BYTES) {
    return "File exceeds 15MB limit.";
  }
  const mime = String(file.type || "").toLowerCase().trim();
  if (!mime || !VAULT_ALLOWED_MIME_TYPES.has(mime)) {
    return "Unsupported content type for secure upload.";
  }
  return "";
}

function vaultReadTextSnippet(file, limitBytes) {
  return new Promise(function (resolve, reject) {
    try {
      const blob = file.slice(0, limitBytes || 8192);
      const reader = new FileReader();
      reader.onload = function () {
        resolve(String(reader.result || ""));
      };
      reader.onerror = function () {
        reject(reader.error || new Error("Could not read file."));
      };
      reader.readAsText(blob);
    } catch (e) {
      reject(e);
    }
  });
}

async function vaultValidateFileContent(file) {
  const ext = vaultGetExtension(file.name);
  if (ext === "svg" || ext === "html" || ext === "htm") {
    return "SVG/HTML uploads are blocked.";
  }
  if (ext === "txt") {
    try {
      const snippet = (await vaultReadTextSnippet(file, 16384)).toLowerCase();
      if (
        snippet.includes("<script") ||
        snippet.includes("javascript:") ||
        snippet.includes("<iframe") ||
        snippet.includes("<object")
      ) {
        return "Text file appears to contain active script markup.";
      }
    } catch (e) {
      return "Could not inspect text file safely.";
    }
  }
  return "";
}

function openVaultDb() {
  return new Promise(function (resolve, reject) {
    if (typeof indexedDB === "undefined") {
      reject(new Error("IndexedDB unavailable"));
      return;
    }
    const req = indexedDB.open(VAULT_INDEXED_DB, 1);
    req.onupgradeneeded = function () {
      const db = req.result;
      if (!db.objectStoreNames.contains(VAULT_AUTOSAVE_STORE)) {
        db.createObjectStore(VAULT_AUTOSAVE_STORE, { keyPath: "key" });
      }
      if (!db.objectStoreNames.contains(VAULT_PENDING_STORE)) {
        db.createObjectStore(VAULT_PENDING_STORE, { autoIncrement: true });
      }
    };
    req.onsuccess = function () {
      resolve(req.result);
    };
    req.onerror = function () {
      reject(req.error || new Error("IndexedDB open failed"));
    };
  });
}

async function putVaultAutosaveSnapshot(uid, payload) {
  const db = await openVaultDb();
  await new Promise(function (resolve, reject) {
    const tx = db.transaction([VAULT_AUTOSAVE_STORE], "readwrite");
    tx.objectStore(VAULT_AUTOSAVE_STORE).put({
      key: "latest:" + uid,
      payload: payload,
      savedAt: new Date().toISOString(),
    });
    tx.oncomplete = resolve;
    tx.onerror = function () {
      reject(tx.error || new Error("autosave write failed"));
    };
  });
  db.close();
}

async function queuePendingVaultWrite(uid, type, payload) {
  const db = await openVaultDb();
  await new Promise(function (resolve, reject) {
    const tx = db.transaction([VAULT_PENDING_STORE], "readwrite");
    tx.objectStore(VAULT_PENDING_STORE).add({
      uid: uid,
      type: type,
      payload: payload,
      createdAt: new Date().toISOString(),
    });
    tx.oncomplete = resolve;
    tx.onerror = function () {
      reject(tx.error || new Error("pending queue write failed"));
    };
  });
  db.close();
}

async function flushPendingVaultWrites() {
  if (!window.supabaseClient || !window.currentUser || !window.currentUser.id) return;
  const uid = window.currentUser.id;
  const db = await openVaultDb();
  const rows = await new Promise(function (resolve, reject) {
    const tx = db.transaction([VAULT_PENDING_STORE], "readonly");
    const store = tx.objectStore(VAULT_PENDING_STORE);
    const out = [];
    const cursorReq = store.openCursor();
    cursorReq.onsuccess = function (ev) {
      const cursor = ev.target && ev.target.result;
      if (!cursor) {
        resolve(out);
        return;
      }
      const value = cursor.value || {};
      out.push({ key: cursor.key, value: value });
      cursor.continue();
    };
    cursorReq.onerror = function () {
      reject(cursorReq.error || new Error("pending queue read failed"));
    };
  });
  const processedKeys = [];
  for (const row of rows) {
    if (!row || !row.value || row.value.uid !== uid) continue;
    const { error } = await window.supabaseClient.from("vault_items").insert({
      user_id: uid,
      type: row.value.type || "document",
      payload: row.value.payload,
    });
    if (error) {
      console.warn("flushPendingVaultWrites", error);
      continue;
    }
    processedKeys.push(row.key);
  }
  await new Promise(function (resolve, reject) {
    const tx = db.transaction([VAULT_PENDING_STORE], "readwrite");
    const store = tx.objectStore(VAULT_PENDING_STORE);
    processedKeys.forEach(function (k) {
      store.delete(k);
    });
    tx.oncomplete = resolve;
    tx.onerror = function () {
      reject(tx.error || new Error("pending queue cleanup failed"));
    };
  });
  db.close();
}

async function logVaultEvent(action, target, status, detail) {
  if (!window.supabaseClient || !window.currentUser || !window.currentUser.id) return;
  try {
    await window.supabaseClient.rpc("log_vault_event", {
      p_action: String(action || ""),
      p_target: target == null ? null : String(target),
      p_status: String(status || "ok"),
      p_detail: detail == null ? null : detail,
    });
  } catch (e) {
    console.warn("logVaultEvent failed", e);
  }
}
window.logVaultEvent = logVaultEvent;

async function requestVaultSignedUpload(file, category) {
  if (!window.supabaseClient) throw new Error("Supabase client not available");
  const baseUrl = (typeof window !== "undefined" && window.SUPABASE_PROJECT_URL) || "";
  const anon = typeof window !== "undefined" ? window.SUPABASE_ANON_KEY : "";
  const { data: sess } = await window.supabaseClient.auth.getSession();
  const token = sess?.session?.access_token;
  if (!baseUrl || !token) throw new Error("Signed upload unavailable");

  // Defence in depth: ensure only allow-listed categories reach the
  // vault-signed-url edge function / storage RLS path policy. Callers
  // SHOULD already pass a value produced by mapEventTypeToVaultCategory,
  // but never trust a raw string here.
  const requested = String(category == null ? "" : category).trim().toLowerCase();
  const safeCategory = VAULT_ALLOWED_CATEGORIES.has(requested) ? requested : VAULT_DEFAULT_CATEGORY;
  if (requested && requested !== safeCategory) {
    console.warn(
      "[vault] '" + requested + "' is not an allowed vault category; using '" + safeCategory + "'"
    );
  }

  const res = await fetch(baseUrl.replace(/\/$/, "") + "/functions/v1/vault-signed-url", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: "Bearer " + token,
      apikey: anon || "",
    },
    body: JSON.stringify({
      action: "upload",
      category: safeCategory,
      filename: file.name,
    }),
  });
  const body = await res.json().catch(function () {
    return {};
  });
  if (!res.ok || !body.signed || !body.object_path) {
    throw new Error((body && body.error) || "Could not obtain signed upload URL");
  }
  return body;
}
window.requestVaultSignedUpload = requestVaultSignedUpload;
window.vaultValidateFileMeta = vaultValidateFileMeta;
window.vaultValidateFileContent = vaultValidateFileContent;

window.saveToVault = async function saveToVault(type, data) {
  if ((!DEV_MODE && !crSupabaseAuthed()) || !window.supabaseClient) return;
  const uid = window.currentUser.id;
  if (!uid) {
    console.warn("saveToVault: missing user id (Supabase session required)");
    return;
  }
  await Vault.init(window.currentUser);
  const encrypted = await Vault.encrypt(data);
  if (type === "document") {
    try {
      await putVaultAutosaveSnapshot(uid, encrypted);
    } catch (e) {
      console.warn("putVaultAutosaveSnapshot", e);
    }
  }

  const { error } = await window.supabaseClient.from("vault_items").insert({
    user_id: uid,
    type,
    payload: encrypted,
  });
  if (error) {
    console.warn("saveToVault", error);
    await logVaultEvent("vault_insert", type, "error", { message: error.message || String(error) });
    await queuePendingVaultWrite(uid, type, encrypted).catch(function (e) {
      console.warn("queuePendingVaultWrite", e);
    });
    return;
  }
  await logVaultEvent("vault_insert", type, "ok", { hasPayload: !!encrypted });
};

window.loadVault = async function loadVault() {
  const container = document.getElementById("vault-list");
  if (!container) return;
  if ((!DEV_MODE && !crSupabaseAuthed()) || !window.currentUser.id || !window.supabaseClient) {
    container.innerHTML = "";
    return;
  }

  const { data, error } = await window.supabaseClient
    .from("vault_items")
    .select("*")
    .eq("user_id", window.currentUser.id)
    .order("created_at", { ascending: false });

  if (error) {
    console.warn("loadVault", error);
    container.innerHTML = "";
    return;
  }

  await Vault.init(window.currentUser);

  container.innerHTML = "";

  const rows = data || [];
  for (const item of rows) {
    let line = item.type + " — " + new Date(item.created_at).toLocaleString();
    try {
      if (item.payload) {
        const decrypted = await Vault.decrypt(item.payload);
        if (decrypted && decrypted.name) line = item.type + ": " + decrypted.name;
      }
    } catch (e) {
      /* keep metadata line */
    }

    const el = document.createElement("div");
    el.className = "vault-item";
    el.textContent = line;

    // Share-link UI is intentionally disabled until the recipient access flow is
    // implemented end-to-end. The vault_shares table is preserved for future work.
    container.appendChild(el);
  }
};

// Disabled at launch: recipient access flow is not implemented, so we must not
// generate share URLs that would point recipients at a dead-end share page or
// write speculative tokens into vault_shares. The function is kept (rather than
// removed) so any caller fails loudly with a clear message instead of silently
// constructing a misleading URL. Re-enable once the recipient flow ships.
window.createShareLink = async function createShareLink(_item) {
  const err = new Error("Sharing is not available yet.");
  err.code = "share_disabled";
  throw err;
};

window.collectDocHelperFormData = function collectDocHelperFormData() {
  const ta = document.getElementById("dh-input");
  const sel = document.getElementById("dh-type-select");
  const outEl = document.getElementById("dh-output");
  let details = null;
  try {
    if (typeof getDhDetails === "function") details = getDhDetails();
  } catch (e) {
    details = { _collectError: String(e) };
  }
  return {
    savedAt: new Date().toISOString(),
    docType: typeof dhSelectedType !== "undefined" ? dhSelectedType : sel && sel.value,
    notes: ta ? ta.value : "",
    generatedHtmlPreview: outEl && outEl.innerHTML ? outEl.innerHTML.slice(0, 8000) : "",
    details: details,
  };
};

window.autoSaveDocument = async function autoSaveDocument(formData) {
  try {
    await window.saveToVault("document", formData);
  } catch (e) {
    console.warn("autoSaveDocument failed:", e);
  }
};

window.notifyDocHelperDocumentGenerated = function notifyDocHelperDocumentGenerated() {
  if (typeof window.autoSaveDocument === "function" && typeof window.collectDocHelperFormData === "function") {
    void window.autoSaveDocument(window.collectDocHelperFormData());
  }
};

function wireCaseVaultUi() {
  if (window._caseVaultUiWired) return;
  window._caseVaultUiWired = true;

  const uploadBtn = document.getElementById("vault-upload-btn");
  const fileInput = document.getElementById("vault-file-input");
  if (uploadBtn && fileInput) {
    uploadBtn.onclick = function () {
      if (typeof requireAuth === "function" && !requireAuth("vault")) return;
      fileInput.click();
    };
    fileInput.onchange = async function (e) {
      const file = e.target.files && e.target.files[0];
      e.target.value = "";
      if (!file) return;
      const metaErr = vaultValidateFileMeta(file);
      if (metaErr) {
        alert(metaErr);
        await logVaultEvent("vault_upload_rejected", file.name || "unknown", "error", {
          reason: metaErr,
          size: file.size || 0,
          type: file.type || "",
        });
        return;
      }
      const contentErr = await vaultValidateFileContent(file);
      if (contentErr) {
        alert(contentErr);
        await logVaultEvent("vault_upload_rejected", file.name || "unknown", "error", {
          reason: contentErr,
          size: file.size || 0,
          type: file.type || "",
        });
        return;
      }
      try {
        if (typeof requireAuth === "function" && !requireAuth("vault")) return;
        const signed = await requestVaultSignedUpload(file, "evidence");
        const uploadUrl = signed.signed && signed.signed.signedUrl;
        const uploadToken = signed.signed && signed.signed.token;
        if (!uploadUrl || !uploadToken) throw new Error("Invalid signed upload payload");
        const putRes = await fetch(uploadUrl, {
          method: "PUT",
          headers: {
            "Content-Type": file.type || "application/octet-stream",
            "x-upsert": "false",
          },
          body: file,
        });
        if (!putRes.ok) {
          throw new Error("Signed upload failed (" + putRes.status + ")");
        }
        await window.saveToVault("file", {
          name: file.name,
          size: file.size,
          mimeType: file.type || "",
          uploadedAt: new Date().toISOString(),
          storageBucket: "casepath-vault",
          objectPath: signed.object_path,
          uploadToken: uploadToken,
        });
        await logVaultEvent("vault_upload", file.name || "unknown", "ok", {
          size: file.size,
          type: file.type || "",
          objectPath: signed.object_path,
        });
        await window.loadVault();
      } catch (err) {
        console.warn("vault file upload", err);
        await logVaultEvent("vault_upload", file.name || "unknown", "error", {
          message: err && err.message ? err.message : String(err),
          size: file.size || 0,
          type: file.type || "",
        });
      }
    };
  }
}

function wireDocHelperVaultAutosave() {
  if (window._dhVaultAutosaveWired) return;
  const ta = document.getElementById("dh-input");
  if (!ta) return;
  window._dhVaultAutosaveWired = true;
  let debounceTimer = null;
  ta.addEventListener("input", function () {
    clearTimeout(debounceTimer);
    debounceTimer = setTimeout(function () {
      if (typeof window.autoSaveDocument === "function" && typeof window.collectDocHelperFormData === "function") {
        void window.autoSaveDocument(window.collectDocHelperFormData());
      }
    }, 10000);
  });
}

async function initCaseVaultSession() {
  const list = document.getElementById("vault-list");
  if (!list) return;
  var cu = window.currentUser;
  if (!DEV_MODE && (!crSupabaseAuthed() || !cu || !cu.id)) {
    list.innerHTML = "";
    return;
  }
  try {
    await Vault.init(window.currentUser);
    await flushPendingVaultWrites().catch(function (e) {
      console.warn("flushPendingVaultWrites", e);
    });
    await window.loadVault();
  } catch (e) {
    console.warn("initCaseVaultSession", e);
  }
}

async function syncUser() {
  async function ensureMemberRow(userId, userEmail) {
    if (!userId || !window.supabaseClient) return;
    try {
      const { error } = await window.supabaseClient
        .from("members")
        .upsert({ id: userId, email: userEmail || null }, { onConflict: "id" });
      if (error) {
        console.warn("ensureMemberRow upsert:", error.message || error);
      }
    } catch (e) {
      console.warn("ensureMemberRow failed", e);
    }
  }

  try {
    if (!window.supabaseClient) {
      const cuNoClient = window.currentUser;
      if (cuNoClient && cuNoClient.source === "legacy") {
        cuNoClient.loggedIn = false;
        setCasePathEntitlements(null);
        try {
          currentUser = window.currentUser;
        } catch (e) {
          /* ignore */
        }
      } else {
        window.currentUser = null;
        setCasePathEntitlements(null);
        try {
          currentUser = null;
        } catch (e) {
          /* ignore */
        }
      }
      return;
    }

    const { data } = await window.supabaseClient.auth.getUser();

    if (data && data.user) {
      const authUser = data.user;
      const meta = authUser.user_metadata || {};
      const metaPost = meta.postcode != null ? String(meta.postcode).trim() : "";
      window.currentUser = {
        id: authUser.id,
        email: authUser.email,
        loggedIn: true,
        source: "supabase",
        emailVerified: !!(authUser.email_confirmed_at || authUser.new_email_confirmed_at),
        name:
          meta.full_name ||
          meta.name ||
          (authUser.email || "").split("@")[0] ||
          "User",
        postcode: metaPost || null,
      };

      currentUser = window.currentUser;

      /* Entitlements: members row keyed by auth user id (RLS: auth.uid() = id). */
      if (authUser.id) {
        await ensureMemberRow(authUser.id, authUser.email || null);
        try {
          const { data: member, error: memErr } = await window.supabaseClient
            .from("members")
            .select("*")
            .eq("id", authUser.id)
            .single();
          console.log("Member data:", member);
          if (memErr) {
            console.warn("syncUser members:", memErr.message);
            setCasePathEntitlements(null);
          } else if (member) {
            setCasePathEntitlements(member);
            window.currentUser.onboardingCompleted = !!member.onboarding_completed;
            window.currentUser.workspaceInitialized = !!member.workspace_initialized;
            window.currentUser.primaryCaseType = member.primary_case_type || null;
            window.currentUser.firstIncidentCreatedAt = member.first_incident_created_at || null;
            window.currentUser.workspaceLastOpenedAt = member.workspace_last_opened_at || null;
          } else {
            setCasePathEntitlements(null);
          }
        } catch (e) {
          console.warn("syncUser members fetch", e);
          setCasePathEntitlements(null);
        }
      } else {
        setCasePathEntitlements(null);
      }

      ensureCurrentUserPurchaseDefaults();
    } else {
      /* No Supabase session: never keep a stale supabase-shaped user; legacy may remain for compatibility but never logged in. */
      const cu = window.currentUser;
      if (cu && cu.source === "legacy") {
        cu.loggedIn = false;
        setCasePathEntitlements(null);
        try {
          currentUser = window.currentUser;
        } catch (e) {
          /* ignore */
        }
      } else {
        window.currentUser = null;
        setCasePathEntitlements(null);
        try {
          currentUser = null;
        } catch (e) {
          /* ignore */
        }
      }
    }
  } catch (error) {
    console.error("syncUser failed:", error);
    window.currentUser = null;
    setCasePathEntitlements(null);
    try {
      currentUser = null;
    } catch (e) {
      /* ignore */
    }
  } finally {
    enrichCurrentUserFromPostcode();
    updateCreditDisplay();
    updateUserLocationDisplay();
  }
}

/**
 * Supabase session = source of truth for who is signed in.
 * window.currentUser = plain object shaped for existing UI (nav, gates, checkout).
 */
(function () {
  window.currentUser = window.currentUser ?? null;

  /** Map Supabase Auth user → legacy UI shape (no localStorage). */
  function deriveUiUserFromSupabase(authUser) {
    if (!authUser) return null;
    const email = authUser.email || "";
    const meta = authUser.user_metadata || {};
    const name = meta.full_name || meta.name || "";
    const ui = {
      id: authUser.id,
      email,
      name: name || (email.includes("@") ? email.split("@")[0] : "") || "User",
      loggedIn: true,
    };
    if (meta.profile != null) ui.profile = meta.profile;
    return ui;
  }

  window.syncUser = syncUser;
  window.syncCurrentUserFromSupabase = syncUser;

  window.signOutFromSupabaseAndSync = async function signOutFromSupabaseAndSync() {
    if (window.CasePathAuth && window.CasePathAuth.session && typeof window.CasePathAuth.session.clearPendingRedirects === "function") {
      window.CasePathAuth.session.clearPendingRedirects();
    }
    await logout();
    if (typeof window.crSetSignedInFlag === "function") {
      try {
        window.crSetSignedInFlag(false);
      } catch (e) {
        /* ignore */
      }
    }
    if (typeof window.CasePathAuth !== "undefined" && typeof window.CasePathAuth.clearAuthState === "function") {
      window.CasePathAuth.clearAuthState("SIGNED_OUT");
    }
    await pushAuthStateToUi();
    if (
      window.CasePathAuth &&
      window.CasePathAuth.redirect &&
      typeof window.CasePathAuth.redirect.safeStableShell === "function"
    ) {
      window.CasePathAuth.redirect.safeStableShell();
    } else if (window.CasePathAuth && window.CasePathAuth.redirect && typeof window.CasePathAuth.redirect.safe === "function") {
      window.CasePathAuth.redirect.safe("/index.html");
    } else if (typeof showPage === "function") showPage("home");
  };

  function flushInlineAuthUi() {
    if (window.authUI) {
      if (typeof crSupabaseAuthed === "function" && crSupabaseAuthed()) window.authUI.showDashboard(window.currentUser);
      else window.authUI.showLoginForm();
    }
    if (typeof updateNav === "function") updateNav();
    if (typeof updateGates === "function") updateGates();
  }

  async function pushAuthStateToUi() {
    await syncUser();
    updateCreditDisplay();
    if (typeof updateAuthUI === "function") await updateAuthUI();
    flushInlineAuthUi();
    await initCaseVaultSession();
    if (typeof maybePostLoginPendingFeatureRedirect === "function") {
      maybePostLoginPendingFeatureRedirect();
    }
  }

  async function initSessionBeforeRender() {
    try {
      if (window.supabaseClient && window.supabaseClient.auth) {
        const { data } = await window.supabaseClient.auth.getSession();
        if (window.CasePathAuth && typeof window.CasePathAuth.applySession === "function") {
          window.CasePathAuth.applySession(data && data.session, "INITIAL_SESSION");
        }
        try {
          window.__crAuthHydrated = true;
        } catch (e0) {
          console.warn("[AUTH] initSessionBeforeRender __crAuthHydrated set failed", e0);
        }
      }
      await syncUser();
    } catch (error) {
      console.error("initSessionBeforeRender", error);
      try {
        await syncUser();
      } catch (e) {
        console.warn("[AUTH] initSessionBeforeRender syncUser fallback failed", e);
      }
    }
  }

  function wireSupabaseModalAuth() {
    function crTermsScroll() {
      const box = document.getElementById("signup-terms-box");
      const checkbox = document.getElementById("signup-terms-check");
      const hint = document.getElementById("signup-terms-scroll-hint");
      if (!box || !checkbox || !box.isConnected) return;

      const hasOverflow = box.scrollHeight > box.clientHeight + 2;
      const maxScrollTop = Math.max(0, box.scrollHeight - box.clientHeight);
      const unlockTolerance = Math.max(8, Math.ceil(box.clientHeight * 0.04));
      const nearBottom =
        !hasOverflow || box.scrollTop >= maxScrollTop - unlockTolerance;

      if (nearBottom) {
        window.crTermsUnlocked = true;
        checkbox.disabled = false;
        if (hint) hint.style.display = "none";
      } else if (!window.crTermsUnlocked) {
        checkbox.disabled = true;
      }
    }

    function crTermsCheck() {
      const checkbox = document.getElementById("signup-terms-check");
      const btn = document.getElementById("signup-submit-btn");
      if (!btn || !checkbox) return;
      if (!window.crTermsUnlocked && checkbox.checked) checkbox.checked = false;
      btn.disabled =
        checkbox.disabled || !checkbox.checked || !window.crTermsUnlocked;
    }

    function resetSignupTermsGate() {
      const box = document.getElementById("signup-terms-box");
      const checkbox = document.getElementById("signup-terms-check");
      const btn = document.getElementById("signup-submit-btn");
      const hint = document.getElementById("signup-terms-scroll-hint");

      window.crTermsUnlocked = false;
      if (box) box.scrollTop = 0;
      if (checkbox) {
        checkbox.checked = false;
        checkbox.disabled = true;
      }
      if (btn) btn.disabled = true;
      if (hint) hint.style.display = "";
    }

    function initSignupTermsGate() {
      const box = document.getElementById("signup-terms-box");
      const checkbox = document.getElementById("signup-terms-check");
      if (!box || !checkbox) return;
      if (typeof window.crTermsUnlocked !== "boolean") window.crTermsUnlocked = false;

      if (!box.dataset.crTermsBound) {
        box.dataset.crTermsBound = "1";
        box.addEventListener("scroll", crTermsScroll);
      }
      if (!checkbox.dataset.crTermsBound) {
        checkbox.dataset.crTermsBound = "1";
        checkbox.addEventListener("change", crTermsCheck);
      }
      crTermsScroll();
      crTermsCheck();
    }

    window.crTermsScroll = crTermsScroll;
    window.crTermsCheck = crTermsCheck;
    window.resetSignupTermsGate = resetSignupTermsGate;
    window.initSignupTermsGate = initSignupTermsGate;

    window.doSignIn = async function () {
      if (typeof initSupabaseClient === "function") initSupabaseClient();
      const email = document.getElementById("signin-email").value.trim();
      const password = document.getElementById("signin-pass").value;
      const err = document.getElementById("signin-error");
      const submitBtn = document.querySelector("#auth-signin .btn-full");
      if (!email || !password) {
        if (err) {
          err.textContent = "Please enter your email and password.";
          err.style.display = "";
        }
        return;
      }
      if (err) err.style.display = "none";
      const originalText = submitBtn ? submitBtn.textContent : "Sign In";
      if (submitBtn) {
        submitBtn.disabled = true;
        submitBtn.textContent = "Signing in...";
      }

      let data = null;
      try {
        if (window.CasePathAuth && window.CasePathAuth.rateLimit && typeof window.CasePathAuth.rateLimit.allow === "function") {
          var rlSignin = window.CasePathAuth.rateLimit.allow("login");
          if (!rlSignin.ok) {
            var waitS = rlSignin.retryAfterMs ? Math.ceil(rlSignin.retryAfterMs / 1000) : 60;
            if (err) {
              err.textContent = "Too many sign-in attempts. Please wait " + waitS + " seconds and try again.";
              err.style.display = "";
            }
            return;
          }
        }
        var sb = window.supabaseClient || window.casepathSupabase;
        if (!sb || !sb.auth) {
          console.error("[AUTH] doSignIn: Supabase client missing after init");
          if (err) {
            err.textContent = "Sign-in is not ready yet. Please refresh the page and try again.";
            err.style.display = "";
          }
          alert("Sign-in is not ready yet. Please refresh the page and try again.");
          return;
        }
        data = await login(email, password);
        if (!data) {
          const authMsg = window.__crLastAuthError || "";
          if (err) {
            if (authMsg && authMsg.toLowerCase().includes("email not confirmed")) {
              err.textContent =
                "Please confirm your email first. Check your inbox (and spam), then sign in again.";
            } else {
              err.textContent = authMsg || "Unable to sign in. Check your details and try again.";
            }
            err.style.display = "";
          }
          return;
        }
        if (data.session && window.CasePathAuth && typeof window.CasePathAuth.applySession === "function") {
          window.CasePathAuth.applySession(data.session, "SIGNED_IN");
        }
        try {
          window.__crAuthHydrated = true;
        } catch (eH) {
          console.warn("[AUTH] doSignIn __crAuthHydrated set failed", eH);
        }
      } catch (error) {
        if (err) {
          err.textContent = (error && error.message) || "Unable to sign in right now. Please try again.";
          err.style.display = "";
        }
        console.error("[CasePath] doSignIn", error);
        alert((error && error.message) || "Unable to sign in right now. Please try again.");
      } finally {
        if (submitBtn) {
          submitBtn.disabled = false;
          submitBtn.textContent = originalText;
        }
      }

      if (!data) return;

      try {
        if (typeof crMarkHasAccount === "function") crMarkHasAccount();
        if (typeof crSetSignedInFlag === "function") crSetSignedInFlag(true);
        await syncUser();
        closeAuth();
        if (typeof updateNav === "function") updateNav();
        if (typeof updateGates === "function") updateGates();
        if (typeof botUnlockAfterLogin === "function") botUnlockAfterLogin();
        await initCaseVaultSession();
        if (typeof maybePostLoginPendingFeatureRedirect === "function") {
          maybePostLoginPendingFeatureRedirect();
        }
        if (typeof crConsumePostAuthRedirect === "function" && crConsumePostAuthRedirect()) {
          return;
        }
        if (typeof crFlushPendingPageAfterAuth === "function") {
          crFlushPendingPageAfterAuth();
        }
      } catch (postErr) {
        console.error("[CasePath] doSignIn post-login", postErr);
        alert(
          (postErr && postErr.message) || "Signed in, but something went wrong finishing setup. Try refreshing the page."
        );
      }
    };

    window.doSignUp = async function () {
      const submitBtn = document.getElementById("signup-submit-btn");
      const name = document.getElementById("signup-name").value.trim();
      const email = document.getElementById("signup-email").value.trim();
      const password = document.getElementById("signup-pass")
        ? document.getElementById("signup-pass").value
        : "";
      const confirmPassword = document.getElementById("confirm-password")
        ? document.getElementById("confirm-password").value
        : "";
      const postcode = document.getElementById("postcode") ? document.getElementById("postcode").value.trim() : "";
      const err = document.getElementById("signup-error");
      const termsEl = document.getElementById("signup-terms-check");
      const termsChecked = termsEl && termsEl.checked;
      if (!window.crTermsUnlocked) {
        err.textContent =
          "Please scroll through the Terms of Use to the end before accepting.";
        err.style.display = "";
        return;
      }
      if (!name) {
        err.textContent = "Please enter your name.";
        err.style.display = "";
        return;
      }
      if (!email || !email.includes("@")) {
        err.textContent = "Please enter a valid email address.";
        err.style.display = "";
        return;
      }
      if (password.length < 8) {
        err.textContent = "Password must be at least 8 characters.";
        err.style.display = "";
        return;
      }
      if (password !== confirmPassword) {
        err.style.display = "none";
        alert("Passwords do not match");
        return;
      }
      console.log("Postcode:", postcode);
      if (!postcode || !/^[0-9]{4}$/.test(postcode)) {
        err.textContent = "Please enter a valid 4-digit postcode.";
        err.style.display = "";
        return;
      }
      if (!termsChecked) {
        err.textContent = "Please read and accept the Terms of Use to continue.";
        err.style.display = "";
        return;
      }
      err.style.display = "none";
      if (!window.supabaseClient || typeof signup !== "function") {
        err.textContent = "Signup is not ready yet. Please refresh the page and try again.";
        err.style.display = "";
        return;
      }

      const originalText = submitBtn ? submitBtn.textContent : "";
      if (submitBtn) {
        submitBtn.disabled = true;
        submitBtn.textContent = "Creating account...";
      }

      try {
        const { data, error: signUpErr } = await signup(email, password, { full_name: name, postcode });
        if (signUpErr) {
          err.textContent = signUpErr.message || "Could not create account. Please try again.";
          err.style.display = "";
          return;
        }
        if (!data) {
          err.textContent = "Could not create account. Try again or use a different email.";
          err.style.display = "";
          return;
        }
        const u = data.user;
        if (u && u.identities && u.identities.length === 0) {
          err.textContent = "This email is already registered. Please sign in or use Forgot password.";
          err.style.display = "";
          return;
        }
        if (u && !data.session) {
          const msg =
            "We sent a confirmation link to your email. After you confirm, return here and sign in.";
          const se = document.getElementById("signin-email");
          if (se) se.value = email;
          const signinErr = document.getElementById("signin-error");
          if (signinErr) {
            signinErr.textContent = msg;
            signinErr.style.display = "";
          } else {
            err.textContent = msg;
            err.style.display = "";
          }
          if (typeof switchAuth === "function") switchAuth("signin");
          return;
        }
        if (!u) {
          err.textContent = "Could not create account. Try again or use a different email.";
          err.style.display = "";
          return;
        }
        await syncUser();
        const hadPending = !!window.pendingFeature;
        closeAuth();
        if (typeof updateNav === "function") updateNav();
        if (typeof updateGates === "function") updateGates();
        if (typeof botUnlockAfterLogin === "function") botUnlockAfterLogin();
        if (typeof maybePostLoginPendingFeatureRedirect === "function") {
          maybePostLoginPendingFeatureRedirect();
        }
        if (!hadPending && typeof showPage === "function") showPage("vault");
        if (!hadPending && typeof window.resolveCaseWorkspaceEntry === "function") {
          setTimeout(function () {
            void window.resolveCaseWorkspaceEntry();
          }, 220);
        }
        await initCaseVaultSession();
      } catch (error) {
        console.error("Signup failed:", error);
        err.textContent = (error && error.message) || "Signup failed. Please try again.";
        err.style.display = "";
      } finally {
        if (submitBtn) {
          const termsElDone = document.getElementById("signup-terms-check");
          submitBtn.disabled = !(
            termsElDone &&
            termsElDone.checked &&
            window.crTermsUnlocked
          );
          submitBtn.textContent = originalText || "Create Free Account";
        }
      }
    };
  }

  function wireSupabaseAuthListener() {
    if (!window.__authListenerAttached) {
      window.__authListenerAttached = true;
      if (!window.supabaseClient || !window.supabaseClient.auth) {
        console.warn("[AUTH] Login listeners not attached: Supabase client missing");
        return;
      }
      console.log("[AUTH] Login listeners attached");
      window.supabaseClient.auth.onAuthStateChange(async (event, session) => {
        if (window.CasePathAuth && typeof window.CasePathAuth.applySession === "function") {
          if (event === "SIGNED_OUT" || !session) {
            window.CasePathAuth.clearAuthState(event);
          } else {
            window.CasePathAuth.applySession(session, event);
          }
        }
        try {
          window.__crAuthHydrated = true;
        } catch (e0) {
          console.warn("[AUTH] onAuthStateChange __crAuthHydrated set failed", e0);
        }
        if (
          event === "TOKEN_REFRESHED" &&
          !session &&
          window.CasePathAuth &&
          window.CasePathAuth.session &&
          typeof window.CasePathAuth.session.handleRefreshFailure === "function"
        ) {
          await window.CasePathAuth.session.handleRefreshFailure();
          return;
        }
        await syncUser();
        await updateAuthUI();

        console.log("Auth state changed:", event);

        if (typeof updateNav === "function") updateNav();
        if (typeof updateGates === "function") updateGates();

        if (typeof flushInlineAuthUi === "function") flushInlineAuthUi();
        if (typeof initCaseVaultSession === "function") void initCaseVaultSession();
        if (typeof maybePostLoginPendingFeatureRedirect === "function") {
          maybePostLoginPendingFeatureRedirect();
        }
        if (
          event === "SIGNED_IN" &&
          typeof window.crFlushPendingPageAfterAuth === "function"
        ) {
          window.crFlushPendingPageAfterAuth();
        }
      });
    }
  }

  async function boot() {
    wireSupabaseModalAuth();
    if (typeof window.initSignupTermsGate === "function") {
      window.initSignupTermsGate();
      window.resetSignupTermsGate();
    }

    if (!window.__signupGateOpenAuthHooked) {
      window.__signupGateOpenAuthHooked = true;
      const priorOpenAuth = window.openAuth;
      if (typeof priorOpenAuth === "function") {
        window.openAuth = function patchedOpenAuth(panel) {
          const out = priorOpenAuth.apply(this, arguments);
          if (panel === "signup") {
            if (typeof window.initSignupTermsGate === "function") window.initSignupTermsGate();
            if (typeof window.resetSignupTermsGate === "function") window.resetSignupTermsGate();
            requestAnimationFrame(function () {
              if (typeof window.crTermsScroll === "function") window.crTermsScroll();
              if (typeof window.crTermsCheck === "function") window.crTermsCheck();
            });
            setTimeout(function () {
              if (typeof window.crTermsScroll === "function") window.crTermsScroll();
            }, 120);
          }
          return out;
        };
      }
      const priorSwitchAuth = window.switchAuth;
      if (typeof priorSwitchAuth === "function") {
        window.switchAuth = function patchedSwitchAuth(panel) {
          const out = priorSwitchAuth.apply(this, arguments);
          if (panel === "signup") {
            if (typeof window.initSignupTermsGate === "function") window.initSignupTermsGate();
            if (typeof window.resetSignupTermsGate === "function") window.resetSignupTermsGate();
            requestAnimationFrame(function () {
              if (typeof window.crTermsScroll === "function") window.crTermsScroll();
              if (typeof window.crTermsCheck === "function") window.crTermsCheck();
            });
            setTimeout(function () {
              if (typeof window.crTermsScroll === "function") window.crTermsScroll();
            }, 120);
          }
          return out;
        };
      }
    }

    wireCaseVaultUi();
    wireDocHelperVaultAutosave();
    await initSessionBeforeRender();
    flushInlineAuthUi();
    await initCaseVaultSession();
    (function attachVaultShowPageHook() {
      var prevShowPage = window.showPage;
      if (typeof prevShowPage !== "function" || prevShowPage._vaultRefreshHook) return;
      var pageFeatureGateMap = {
        "doc-helper": "document_builder",
        // TODO(production-gating): enforce subscription / plan for Case Assistant (ai_assistant) before routing to page.
        "ai-assistant": "ai_assistant",
        "vault": "vault",
        "parenting-orders": "parenting_orders",
        "lawyer-portal": "lawyer_portal",
      };
      function showPageWithVaultRefresh(id) {
        var gateFeature = pageFeatureGateMap[id];
        if (gateFeature && typeof requireAuth === "function") {
          if (!requireAuth(gateFeature)) {
            return null;
          }
        }
        var ret = prevShowPage.apply(this, arguments);
        if (id === "vault" && typeof window.loadVault === "function") {
          setTimeout(function () {
            void window.loadVault();
          }, 80);
        }
        return ret;
      }
      showPageWithVaultRefresh._vaultRefreshHook = true;
      window.showPage = showPageWithVaultRefresh;
    })();
    wireSupabaseAuthListener();
    ensureCompareOrderRewriteExportButtons();
    wireParentingOrderComparison();
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", function () {
      void boot();
    });
  } else {
    void boot();
  }
})();

document.addEventListener("DOMContentLoaded", async () => {
  await syncUser();
  updateCreditDisplay();

  if (typeof updateNav === "function") updateNav();
  if (typeof updateGates === "function") updateGates();

  // keep all existing logic AFTER this point unchanged

  await verifyCheckoutEntitlementsAfterReturn();
  console.log("Current user:", window.currentUser);
  await initCaseVaultSession();
  if (typeof maybePostLoginPendingFeatureRedirect === "function") {
    maybePostLoginPendingFeatureRedirect();
  }
  if (typeof ensureCompareOrderRewriteExportButtons === "function") {
    ensureCompareOrderRewriteExportButtons();
  }
  if (typeof wireParentingOrderComparison === "function") {
    wireParentingOrderComparison();
  }
});

document.addEventListener("DOMContentLoaded", () => {
  if (typeof ensureCompareOrderRewriteExportButtons === "function") {
    ensureCompareOrderRewriteExportButtons();
  }

  const rewriteBtn = document.getElementById("rewrite-btn");
  if (rewriteBtn && !rewriteBtn.dataset.crSpecWired) {
    rewriteBtn.dataset.crSpecWired = "1";
    rewriteBtn.addEventListener("click", () => {
      if (!window.lastComparisonResults) {
        console.warn("No comparison results to rewrite");
        return;
      }

      const rewritten = rewriteAllClauses(window.lastComparisonResults);
      window.lastComparisonResults = rewritten;

      if (typeof renderComparisonAdvanced === "function") {
        renderComparisonAdvanced(rewritten);
      }

      if (typeof renderSummary === "function") {
        renderSummary(rewritten);
      }

      console.log("Rewritten for court tone");
    });
  }
});

function cpDhEsc(s) {
  return String(s == null ? "" : s)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

function cpDhNorm(v) {
  return String(v == null ? "" : v).trim().toLowerCase();
}

function cpDhYmd(d) {
  if (!d) return "";
  const raw = String(d).trim();
  const m = raw.match(/^(\d{4}-\d{2}-\d{2})/);
  if (m) return m[1];
  const dd = new Date(raw);
  if (Number.isNaN(dd.getTime())) return "";
  return dd.toISOString().slice(0, 10);
}

function cpDhDateInRange(dateStr, from, to) {
  const d = cpDhYmd(dateStr);
  if (!d) return false;
  if (from && d < from) return false;
  if (to && d > to) return false;
  return true;
}

function cpDhDocMap(assemblyType) {
  const key = cpDhNorm(assemblyType);
  const map = {
    chronology_export: "affidavit",
    affidavit_scaffold: "affidavit",
    parenting_orders_draft: "consent",
    case_summary: "initiating",
    incident_summary: "response",
    communication_summary: "response",
    financial_chronology: "financial",
  };
  return map[key] || "affidavit";
}

function cpDhTitle(assemblyType) {
  const key = cpDhNorm(assemblyType);
  const map = {
    chronology_export: "Chronology Export",
    affidavit_scaffold: "Affidavit Scaffold",
    parenting_orders_draft: "Parenting Orders Draft",
    case_summary: "Case Summary",
    incident_summary: "Incident Summary",
    communication_summary: "Communication Summary",
    financial_chronology: "Financial Chronology",
  };
  return map[key] || "Chronology Draft";
}

function cpDhAsArray(v) {
  if (Array.isArray(v)) return v;
  if (typeof v === "string" && v.trim()) return v.split(",").map(function (x) { return x.trim(); }).filter(Boolean);
  return [];
}

window.casepathDocAssemblyState = window.casepathDocAssemblyState || {
  loaded: false,
  loading: false,
  threads: [],
  events: [],
  evidence: [],
  filteredEvents: [],
  selectedEventIds: new Set(),
  wireDone: false,
  mounted: false,
};

async function cpDhLoadAssemblySources() {
  const st = window.casepathDocAssemblyState;
  if (!window.supabaseClient || !window.currentUser || !window.currentUser.id) {
    return { ok: false, message: "Sign in to load chronology sources." };
  }
  if (st.loading) return { ok: false, message: "Loading chronology sources..." };
  st.loading = true;
  try {
    const uid = window.currentUser.id;
    const threadsQ = window.supabaseClient
      .from("case_incident_threads")
      .select("id,title,category,status,affidavit_relevant,chronology_visible,deleted_at")
      .eq("user_id", uid);
    const eventsQ = window.supabaseClient
      .from("case_chronology_events")
      .select(
        "id,title,description,event_date,category,event_status,affidavit_relevant,importance,notes,tags,incident_thread_id,visibility,deleted_at,created_at"
      )
      .eq("user_id", uid);
    const evidenceQ = window.supabaseClient
      .from("vault_items")
      .select("*")
      .eq("user_id", uid);
    const [threadsRes, eventsRes, evidenceRes] = await Promise.all([threadsQ, eventsQ, evidenceQ]);
    if (threadsRes.error) throw threadsRes.error;
    if (eventsRes.error) throw eventsRes.error;
    if (evidenceRes.error) throw evidenceRes.error;

    st.threads = (threadsRes.data || []).filter(function (r) { return !r.deleted_at; });
    st.events = (eventsRes.data || []).filter(function (r) { return !r.deleted_at; });
    st.evidence = (evidenceRes.data || []).filter(function (r) { return !r.deleted_at; });
    st.loaded = true;
    return { ok: true };
  } catch (e) {
    return { ok: false, message: e && e.message ? e.message : String(e) };
  } finally {
    st.loading = false;
  }
}

function cpDhEvidenceForEvent(eventId) {
  const st = window.casepathDocAssemblyState;
  const target = String(eventId || "");
  if (!target) return [];
  const keys = [
    "chronology_event_id",
    "linked_event_id",
    "case_chronology_event_id",
    "event_id",
    "linked_chronology_event_id",
  ];
  return (st.evidence || []).filter(function (row) {
    for (let i = 0; i < keys.length; i++) {
      const v = row && row[keys[i]];
      if (v != null && String(v) === target) return true;
    }
    return false;
  });
}

function cpDhApplyAssemblyFilters() {
  const st = window.casepathDocAssemblyState;
  const threadEl = document.getElementById("dh-assembly-thread");
  const catEl = document.getElementById("dh-assembly-category");
  const statusEl = document.getElementById("dh-assembly-status");
  const affEl = document.getElementById("dh-assembly-aff");
  const fromEl = document.getElementById("dh-assembly-from");
  const toEl = document.getElementById("dh-assembly-to");

  const threadId = threadEl ? String(threadEl.value || "") : "";
  const category = cpDhNorm(catEl ? catEl.value : "");
  const status = cpDhNorm(statusEl ? statusEl.value : "");
  const aff = cpDhNorm(affEl ? affEl.value : "any");
  const from = cpDhYmd(fromEl ? fromEl.value : "");
  const to = cpDhYmd(toEl ? toEl.value : "");

  const filtered = (st.events || [])
    .filter(function (ev) {
      if (threadId && String(ev.incident_thread_id || "") !== threadId) return false;
      if (category && cpDhNorm(ev.category) !== category) return false;
      if (status && cpDhNorm(ev.event_status) !== status) return false;
      if (!cpDhDateInRange(ev.event_date || ev.created_at, from, to)) return false;
      if (aff === "yes" && !ev.affidavit_relevant) return false;
      if (aff === "no" && !!ev.affidavit_relevant) return false;
      return true;
    })
    .sort(function (a, b) {
      const ad = cpDhYmd(a.event_date || a.created_at) || "";
      const bd = cpDhYmd(b.event_date || b.created_at) || "";
      if (ad < bd) return -1;
      if (ad > bd) return 1;
      return String(a.title || "").localeCompare(String(b.title || ""));
    });

  st.filteredEvents = filtered;
  const nextSet = new Set();
  filtered.forEach(function (ev) {
    const id = String(ev.id);
    if (st.selectedEventIds.has(id)) nextSet.add(id);
  });
  if (!nextSet.size) {
    filtered.forEach(function (ev) {
      nextSet.add(String(ev.id));
    });
  }
  st.selectedEventIds = nextSet;
}

function cpDhRenderAssemblyEvents() {
  const st = window.casepathDocAssemblyState;
  const host = document.getElementById("dh-assembly-events");
  if (!host) return;
  const rows = st.filteredEvents || [];
  if (!rows.length) {
    host.innerHTML =
      '<div style="font-size:0.82rem;color:var(--soft);padding:0.5rem 0;">No chronology events match these filters.</div>';
    return;
  }
  let html = "";
  rows.forEach(function (ev) {
    const id = String(ev.id);
    const checked = st.selectedEventIds.has(id) ? " checked" : "";
    const dt = cpDhYmd(ev.event_date || ev.created_at) || "No date";
    html +=
      '<label style="display:block;border:1px solid var(--border);border-radius:8px;padding:0.55rem 0.65rem;margin-bottom:0.45rem;background:white;">' +
      '<div style="display:flex;gap:0.55rem;align-items:flex-start;">' +
      '<input type="checkbox" data-dh-ev="' + cpDhEsc(id) + '"' + checked + ' style="margin-top:0.2rem;">' +
      '<div style="min-width:0;">' +
      '<div style="font-size:0.8rem;color:var(--soft);margin-bottom:0.1rem;">' +
      cpDhEsc(dt) +
      " · " +
      cpDhEsc(ev.category || "incident") +
      " · " +
      cpDhEsc(ev.event_status || "active") +
      "</div>" +
      '<div style="font-size:0.87rem;color:var(--charcoal);font-weight:600;">' +
      cpDhEsc(ev.title || "Untitled event") +
      "</div>" +
      "</div></div></label>";
  });
  host.innerHTML = html;
}

function cpDhRenderAssemblyPreview() {
  const st = window.casepathDocAssemblyState;
  const host = document.getElementById("dh-assembly-preview");
  const countEl = document.getElementById("dh-assembly-count");
  if (!host) return;
  const selected = (st.filteredEvents || []).filter(function (ev) {
    return st.selectedEventIds.has(String(ev.id));
  });
  if (countEl) countEl.textContent = selected.length + " selected";
  if (!selected.length) {
    host.innerHTML = '<div style="font-size:0.82rem;color:var(--soft);">Select one or more chronology events to build a structured preview.</div>';
    return;
  }
  const threadMap = {};
  (st.threads || []).forEach(function (t) { threadMap[String(t.id)] = t; });
  const groups = {};
  selected.forEach(function (ev) {
    const tid = String(ev.incident_thread_id || "none");
    if (!groups[tid]) groups[tid] = [];
    groups[tid].push(ev);
  });
  const keys = Object.keys(groups).sort(function (a, b) {
    const at = threadMap[a] && threadMap[a].title ? threadMap[a].title : "Unthreaded";
    const bt = threadMap[b] && threadMap[b].title ? threadMap[b].title : "Unthreaded";
    return String(at).localeCompare(String(bt));
  });
  let html = "";
  keys.forEach(function (k) {
    const threadTitle = threadMap[k] && threadMap[k].title ? threadMap[k].title : "Unthreaded Events";
    html += '<div style="margin-bottom:0.6rem;"><div style="font-weight:700;color:var(--charcoal);font-size:0.86rem;">' + cpDhEsc(threadTitle) + "</div>";
    html += '<div style="margin-top:0.25rem;padding-left:0.75rem;border-left:2px solid var(--border);">';
    groups[k].forEach(function (ev) {
      const evDate = cpDhYmd(ev.event_date || ev.created_at) || "No date";
      html += '<div style="font-size:0.82rem;color:var(--mid);line-height:1.55;">';
      html += "&#8226; " + cpDhEsc(evDate) + " — " + cpDhEsc(ev.title || "Untitled event");
      html += "</div>";
    });
    html += "</div></div>";
  });
  host.innerHTML = html;
}

function cpDhAssembleStructuredNotes() {
  const st = window.casepathDocAssemblyState;
  const typeEl = document.getElementById("dh-assembly-type");
  const includeEvidenceEl = document.getElementById("dh-assembly-evidence");
  const includeEvidence = !includeEvidenceEl || !!includeEvidenceEl.checked;
  const selectedType = typeEl ? String(typeEl.value || "chronology_export") : "chronology_export";
  const selected = (st.filteredEvents || []).filter(function (ev) {
    return st.selectedEventIds.has(String(ev.id));
  });
  const lines = [];
  lines.push(cpDhTitle(selectedType));
  lines.push("");
  lines.push("This draft is assembled from selected chronology events.");
  lines.push("");

  const threadMap = {};
  (st.threads || []).forEach(function (t) { threadMap[String(t.id)] = t; });
  const groups = {};
  selected.forEach(function (ev) {
    const key = String(ev.incident_thread_id || "none");
    if (!groups[key]) groups[key] = [];
    groups[key].push(ev);
  });
  Object.keys(groups).forEach(function (k) {
    groups[k].sort(function (a, b) {
      const ad = cpDhYmd(a.event_date || a.created_at) || "";
      const bd = cpDhYmd(b.event_date || b.created_at) || "";
      return ad.localeCompare(bd);
    });
  });
  const orderedKeys = Object.keys(groups).sort(function (a, b) {
    const at = threadMap[a] && threadMap[a].title ? threadMap[a].title : "Unthreaded Events";
    const bt = threadMap[b] && threadMap[b].title ? threadMap[b].title : "Unthreaded Events";
    return String(at).localeCompare(String(bt));
  });

  orderedKeys.forEach(function (k) {
    const threadTitle = threadMap[k] && threadMap[k].title ? threadMap[k].title : "Unthreaded Events";
    lines.push(threadTitle + ":");
    groups[k].forEach(function (ev) {
      const d = cpDhYmd(ev.event_date || ev.created_at) || "No date";
      lines.push("- " + d + " — " + String(ev.title || "Untitled event"));
      if (ev.description) lines.push("  Summary: " + String(ev.description));
      if (ev.notes) lines.push("  Notes: " + String(ev.notes));
      const tags = cpDhAsArray(ev.tags);
      if (tags.length) lines.push("  Tags: " + tags.join(", "));
      if (includeEvidence) {
        const evEvidence = cpDhEvidenceForEvent(ev.id);
        if (evEvidence.length) {
          lines.push("  Supporting Evidence:");
          evEvidence.forEach(function (item) {
            const nm = item.name || item.filename || item.original_filename || item.object_path || "Evidence item";
            lines.push("  - " + String(nm));
          });
        }
      }
      lines.push("");
    });
  });
  return lines.join("\n").trim();
}

function cpDhWireAssemblyEvents() {
  const st = window.casepathDocAssemblyState;
  if (st.wireDone) return;
  const root = document.getElementById("dh-assembly-root");
  if (!root) return;
  root.addEventListener("change", function (e) {
    const t = e.target;
    if (!t) return;
    if (t.matches("[data-dh-ev]")) {
      const id = String(t.getAttribute("data-dh-ev") || "");
      if (!id) return;
      if (t.checked) st.selectedEventIds.add(id);
      else st.selectedEventIds.delete(id);
      cpDhRenderAssemblyPreview();
      return;
    }
    if (
      t.id === "dh-assembly-thread" ||
      t.id === "dh-assembly-category" ||
      t.id === "dh-assembly-status" ||
      t.id === "dh-assembly-aff" ||
      t.id === "dh-assembly-from" ||
      t.id === "dh-assembly-to"
    ) {
      cpDhApplyAssemblyFilters();
      cpDhRenderAssemblyEvents();
      cpDhRenderAssemblyPreview();
      return;
    }
    if (t.id === "dh-assembly-type") {
      const targetDoc = cpDhDocMap(t.value);
      const docSel = document.getElementById("dh-type-select");
      if (docSel && docSel.value !== targetDoc && typeof window.selectDocTypeByValue === "function") {
        window.selectDocTypeByValue(targetDoc);
      }
      cpDhRenderAssemblyPreview();
      return;
    }
    if (t.id === "dh-assembly-evidence") {
      cpDhRenderAssemblyPreview();
    }
  });
  st.wireDone = true;
}

function cpDhRenderAssemblyUi() {
  const st = window.casepathDocAssemblyState;
  const root = document.getElementById("dh-assembly-root");
  if (!root) return;
  const threadOptions = ['<option value="">All threads</option>']
    .concat(
      (st.threads || []).map(function (t) {
        return '<option value="' + cpDhEsc(t.id) + '">' + cpDhEsc(t.title || "Untitled thread") + "</option>";
      })
    )
    .join("");

  const categories = {};
  (st.events || []).forEach(function (ev) {
    const c = cpDhNorm(ev.category);
    if (c) categories[c] = true;
  });
  const categoryOptions = ['<option value="">All categories</option>']
    .concat(
      Object.keys(categories)
        .sort()
        .map(function (k) {
          return '<option value="' + cpDhEsc(k) + '">' + cpDhEsc(k) + "</option>";
        })
    )
    .join("");

  root.innerHTML =
    '<div style="display:flex;gap:0.65rem;flex-wrap:wrap;margin-bottom:0.75rem;">' +
    '<label style="font-size:0.78rem;color:var(--mid);">Document model<br><select id="dh-assembly-type" style="margin-top:0.25rem;padding:0.45rem 0.55rem;border:1px solid var(--border);border-radius:8px;">' +
    '<option value="chronology_export">Chronology Export</option>' +
    '<option value="affidavit_scaffold">Affidavit Scaffold</option>' +
    '<option value="parenting_orders_draft">Parenting Orders Draft</option>' +
    '<option value="case_summary">Case Summary</option>' +
    '<option value="incident_summary">Incident Summary</option>' +
    '<option value="communication_summary">Communication Summary</option>' +
    '<option value="financial_chronology">Financial Chronology</option>' +
    "</select></label>" +
    '<label style="font-size:0.78rem;color:var(--mid);">Thread<br><select id="dh-assembly-thread" style="margin-top:0.25rem;padding:0.45rem 0.55rem;border:1px solid var(--border);border-radius:8px;">' +
    threadOptions +
    "</select></label>" +
    '<label style="font-size:0.78rem;color:var(--mid);">Category<br><select id="dh-assembly-category" style="margin-top:0.25rem;padding:0.45rem 0.55rem;border:1px solid var(--border);border-radius:8px;">' +
    categoryOptions +
    "</select></label>" +
    '<label style="font-size:0.78rem;color:var(--mid);">Status<br><select id="dh-assembly-status" style="margin-top:0.25rem;padding:0.45rem 0.55rem;border:1px solid var(--border);border-radius:8px;">' +
    '<option value="">All statuses</option><option value="draft">draft</option><option value="active">active</option><option value="archived">archived</option><option value="affidavit-linked">affidavit-linked</option><option value="disputed">disputed</option><option value="exported">exported</option>' +
    "</select></label>" +
    '<label style="font-size:0.78rem;color:var(--mid);">Affidavit relevance<br><select id="dh-assembly-aff" style="margin-top:0.25rem;padding:0.45rem 0.55rem;border:1px solid var(--border);border-radius:8px;"><option value="any">Any</option><option value="yes">Yes</option><option value="no">No</option></select></label>' +
    '<label style="font-size:0.78rem;color:var(--mid);">From<br><input id="dh-assembly-from" type="date" style="margin-top:0.25rem;padding:0.42rem 0.55rem;border:1px solid var(--border);border-radius:8px;"></label>' +
    '<label style="font-size:0.78rem;color:var(--mid);">To<br><input id="dh-assembly-to" type="date" style="margin-top:0.25rem;padding:0.42rem 0.55rem;border:1px solid var(--border);border-radius:8px;"></label>' +
    "</div>" +
    '<div style="display:flex;align-items:center;justify-content:space-between;gap:0.5rem;margin-bottom:0.4rem;">' +
    '<div style="font-size:0.8rem;color:var(--charcoal);font-weight:600;">Source events <span id="dh-assembly-count" style="color:var(--soft);font-weight:500;">0 selected</span></div>' +
    '<label style="font-size:0.78rem;color:var(--mid);display:flex;align-items:center;gap:0.35rem;"><input id="dh-assembly-evidence" type="checkbox" checked> Include evidence references</label>' +
    "</div>" +
    '<div id="dh-assembly-events" style="max-height:210px;overflow:auto;background:#fafafa;border:1px solid var(--border);border-radius:10px;padding:0.55rem;"></div>' +
    '<div style="margin-top:0.75rem;font-size:0.8rem;color:var(--charcoal);font-weight:600;">Structure preview</div>' +
    '<div id="dh-assembly-preview" style="margin-top:0.35rem;background:#fafafa;border:1px solid var(--border);border-radius:10px;padding:0.65rem;min-height:70px;"></div>' +
    '<div style="margin-top:0.55rem;font-size:0.77rem;color:var(--soft);">Assembled sections remain editable in the notes field before generation.</div>';
}

async function cpDhInitAssemblyMode() {
  const st = window.casepathDocAssemblyState;
  const root = document.getElementById("dh-assembly-root");
  if (!root || st.mounted) return;
  st.mounted = true;
  root.innerHTML = '<div style="font-size:0.82rem;color:var(--soft);">Loading chronology sources...</div>';
  const loaded = await cpDhLoadAssemblySources();
  if (!loaded.ok) {
    root.innerHTML =
      '<div style="font-size:0.82rem;color:#7c3d0a;background:#fff8f0;border:1px solid #f0a060;border-radius:8px;padding:0.6rem 0.75rem;">' +
      cpDhEsc(loaded.message || "Could not load chronology sources.") +
      "</div>";
    return;
  }
  cpDhRenderAssemblyUi();
  cpDhWireAssemblyEvents();
  cpDhApplyAssemblyFilters();
  cpDhRenderAssemblyEvents();
  cpDhRenderAssemblyPreview();
}

function cpDhWrapRunDocHelper() {
  if (window.__cpDhAssemblyPatched) return;
  const original = window.runDocHelper;
  if (typeof original !== "function") {
    setTimeout(cpDhWrapRunDocHelper, 300);
    return;
  }
  window.runDocHelper = async function wrappedRunDocHelper() {
    if (window.CasePathAuth && typeof window.CasePathAuth.guardDocumentGeneration === "function") {
      if (!window.CasePathAuth.guardDocumentGeneration()) return;
    }
    if (typeof window.useCredit === "function") {
      try {
        await window.useCredit();
      } catch (e) {
        console.warn("Document generation blocked:", e && e.message ? e.message : e);
        return;
      }
    }
    try {
      const root = document.getElementById("dh-assembly-root");
      const ta = document.getElementById("dh-input");
      const st = window.casepathDocAssemblyState;
      if (root && ta && st && st.filteredEvents && st.filteredEvents.length) {
        const assembled = cpDhAssembleStructuredNotes();
        if (assembled && assembled.length > 20) {
          ta.value = assembled;
          if (typeof window.updateCharCount === "function") window.updateCharCount();
          if (typeof window.checkOpinionWords === "function") window.checkOpinionWords();
        }
      }
    } catch (e) {
      console.warn("cpDhWrapRunDocHelper:", e);
    }
    return original.apply(this, arguments);
  };
  window.__cpDhAssemblyPatched = true;
}

document.addEventListener("DOMContentLoaded", function () {
  setTimeout(function () {
    void cpDhInitAssemblyMode();
    cpDhWrapRunDocHelper();
  }, 120);
});

if (DEV_MODE) {
  window.crSupabaseAuthed = function () {
    return true;
  };

  function unlockUiForDev() {
    document.querySelectorAll("[data-locked]").forEach(function (el) {
      el.removeAttribute("data-locked");
    });
    document.querySelectorAll(".locked, .blurred").forEach(function (el) {
      el.classList.remove("locked", "blurred");
    });
    document
      .querySelectorAll("button[disabled], input[disabled], select[disabled], textarea[disabled]")
      .forEach(function (el) {
        el.disabled = false;
        el.removeAttribute("disabled");
      });
  }

  document.addEventListener("DOMContentLoaded", function () {
    unlockUiForDev();
    setTimeout(unlockUiForDev, 500);
    setTimeout(unlockUiForDev, 1500);
  });
}

document.addEventListener("DOMContentLoaded", () => {
  setTimeout(updateAuthUI, 500);
});

document.addEventListener("DOMContentLoaded", () => {
  if (typeof ensureCompareOrderRewriteExportButtons === "function") {
    ensureCompareOrderRewriteExportButtons();
  }

  const exportBtn = document.getElementById("export-btn");
  if (exportBtn && !exportBtn.dataset.crSpecWired) {
    exportBtn.dataset.crSpecWired = "1";
    exportBtn.addEventListener("click", () => {
      if (!window.lastComparisonResults) {
        console.warn("No comparison results to export");
        return;
      }

      const summary = buildCourtSummary(window.lastComparisonResults);

      downloadTextFile("parenting_orders_summary.txt", summary);

      console.log("Court summary downloaded");
    });
  }
});
