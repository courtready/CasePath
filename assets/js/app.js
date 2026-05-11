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
const DEV_MODE = false;
window.DEV_MODE = DEV_MODE;

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

function initPricing() {}
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
  "nav-doc-helper": "Document Centre",
  "nav-ai-assistant": "AI Assistant",
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
  if (params.get("success") === "true") return true;
  if (params.has("session_id")) return true;
  return (window.location.search || "").includes("success");
}

function clearCheckoutReturnParamsFromUrl() {
  if (typeof window === "undefined" || !window.location || !window.history) return;
  const url = new URL(window.location.href);
  const keys = ["success", "session_id", "canceled", "cancelled"];
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
  if (!checkoutReturnDetected()) return;
  if (!DEV_MODE && !crSupabaseAuthedSafe()) {
    console.warn("Stripe return detected but no auth session yet.");
    return;
  }

  console.log("Returned from Stripe checkout");
  const attempts = 4;
  let verified = false;

  for (let i = 0; i < attempts; i++) {
    await syncUser();
    const user = window.currentUser || {};
    const hasEntitlements = !!(
      user.plan || (typeof user.docCredits === "number" && user.docCredits > 0)
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

  if (window.currentUser.plan === "pro") {
    el.innerHTML = "Pro Plan";
    el.style.color = "";
  } else {
    const c = typeof window.currentUser.docCredits === "number" ? window.currentUser.docCredits : 0;
    const docWord = c === 1 ? "document" : "documents";
    el.innerHTML =
      `Credits: ${c}<span style="display:block;font-size:13px;margin:2px 0 0;font-weight:400;">Enough for ${c} ${docWord}</span>`;
    el.style.color = c <= 2 ? "#b00020" : "";
    if (pricingNav && c <= 1) {
      pricingNav.style.fontWeight = "700";
    }
  }
  console.log("User credits:", window.currentUser?.docCredits);
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
  if (window.currentUser.plan === "pro") {
    el.textContent = "Unlimited access";
    return;
  }
  const n = window.currentUser.docCredits || 0;
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
    window.currentUser.plan !== "pro" &&
    window.currentUser.docCredits <= 2
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
    if (u.plan === "pro") {
      return { remaining: typeof u.docCredits === "number" ? u.docCredits : 0 };
    }
    if (typeof isPromoEssentialEnabled === "function" && isPromoEssentialEnabled()) {
      const rem = typeof u.docCredits === "number" ? u.docCredits : 0;
      return { remaining: rem };
    }
    const credits = typeof u.docCredits === "number" ? u.docCredits : 0;
    if (credits <= 0) {
      alert("You've run out of credits. Upgrade to continue.");
      throw new Error("No credits");
    }
    if (credits === 1) {
      console.log("Upgrade trigger");
      alert("You're about to use your last credit. Upgrade for uninterrupted access.");
    }
    if (!window.supabaseClient || !u.id) {
      throw new Error("No client");
    }
    const next = credits - 1;
    const { error } = await window.supabaseClient.from("members").update({ doc_credits: next }).eq("id", u.id);
    if (error) {
      throw error;
    }
    if (typeof window.syncUser === "function") {
      await window.syncUser();
    }
    try {
      if (window.currentUser) currentUser = window.currentUser;
    } catch (e) {
      /* ignore */
    }
    const rem =
      window.currentUser && typeof window.currentUser.docCredits === "number"
        ? window.currentUser.docCredits
        : next;
    if (typeof checkLowCredits === "function") {
      checkLowCredits();
    }
    return { remaining: rem };
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
  if (window.currentUser) {
    if (window.currentUser.docCredits == null || window.currentUser.docCredits === "") {
      window.currentUser.docCredits = 0;
    }
  }
}
window.ensureCurrentUserPurchaseDefaults = ensureCurrentUserPurchaseDefaults;

/** Resolve Stripe Price IDs from window at click time (not at script parse — avoids stale empty maps). */
function resolveStripePriceId(planKey) {
  var table = {
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

function requireAuth(feature) {
  if (DEV_MODE) return true;
  if (typeof crSupabaseAuthed === "function" && crSupabaseAuthed()) {
    if (typeof hasAccess === "function" && hasAccess(feature)) return true;
    if (feature === "vault" && typeof hasAccess === "function" && hasAccess("vault_basic")) return true;
  }

  window.pendingFeature = feature;

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

function isPromoUnlockAllEnabled() {
  try {
    if (typeof window !== "undefined" && window.__promoUnlockAll === true) return true;
    if (typeof localStorage !== "undefined") return localStorage.getItem("cr_unlock_all_code") === "1";
  } catch (e) {
    return false;
  }
  return false;
}
window.isPromoUnlockAllEnabled = isPromoUnlockAllEnabled;

function setPromoUnlockAll(enabled) {
  const on = !!enabled;
  try {
    if (typeof window !== "undefined") window.__promoUnlockAll = on;
    if (typeof localStorage !== "undefined") {
      if (on) {
        localStorage.setItem("cr_unlock_all_code", "1");
        localStorage.removeItem("cr_promo_essential");
        if (typeof window !== "undefined") window.__promoEssential = false;
      } else {
        localStorage.removeItem("cr_unlock_all_code");
      }
    }
  } catch (e) {
    /* ignore */
  }
  if (typeof updateGates === "function") updateGates();
}
window.setPromoUnlockAll = setPromoUnlockAll;

/** Promo code “cat123” (pricing UI): Essential-tier gates incl. Document Helper (nav + export without debiting credits); not vault / AI / parenting pack. */
function isPromoEssentialEnabled() {
  try {
    if (typeof window !== "undefined" && window.__promoEssential === true) return true;
    if (typeof localStorage !== "undefined") return localStorage.getItem("cr_promo_essential") === "1";
  } catch (e) {
    /* ignore */
  }
  return false;
}
window.isPromoEssentialEnabled = isPromoEssentialEnabled;

function setPromoEssential(enabled) {
  const on = !!enabled;
  try {
    if (typeof window !== "undefined") window.__promoEssential = on;
    if (typeof localStorage !== "undefined") {
      if (on) {
        localStorage.setItem("cr_promo_essential", "1");
        localStorage.removeItem("cr_unlock_all_code");
        if (typeof window !== "undefined") window.__promoUnlockAll = false;
      } else {
        localStorage.removeItem("cr_promo_essential");
      }
    }
  } catch (e) {
    /* ignore */
  }
  if (typeof updateGates === "function") updateGates();
}
window.setPromoEssential = setPromoEssential;

function hasAccess(feature) {
  if (DEV_MODE) return true;
  if (isPromoUnlockAllEnabled()) return true;
  const u = window.currentUser || {};
  const plan = String(u.plan || "").toLowerCase();
  const credits = typeof u.docCredits === "number" ? u.docCredits : 0;

  if (plan === "pro") return true;

  const baseFree = new Set([
    "home",
    "glossary",
    "mental_health",
    "kids",
    "avo",
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
    return plan === "essential" || isPromoEssentialEnabled();
  }

  if (feature === "document_builder") {
    return true;
  }

  if (feature === "parenting_orders") {
    return plan === "casepack" || plan === "parenting_pack";
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
  if (typeof window.crSupabaseAuthed === "function" && window.crSupabaseAuthed()) return true;
  try {
    var raw = localStorage.getItem("cr_user") || localStorage.getItem("courtready_user");
    if (!raw) return false;
    var u = JSON.parse(raw);
    return !!(u && u.source === "supabase" && u.id && u.loggedIn !== false);
  } catch (e) {
    return false;
  }
}

/** Rollout badges only; live public sections (e.g. AVO Centre) are omitted so they stay unbadged until gated later. */
function navStripeTargets() {
  return [
    { selector: "#nav-parenting-orders", kind: "soon" },
    { selector: "#nav-ai-assistant", kind: "soon" },
    { selector: "#nav-pricing", kind: "soon" },
    { selector: "#nav-referrals", kind: "soon" },
    { selector: "#nav-lawyer-portal", kind: "soon" },
    { selector: "#nav-mental-health", kind: "account" },
    { selector: "#nav-kids", kind: "account" },
    { selector: "#nav-your-team", kind: "account" },
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
      el.setAttribute("title", "Coming soon — this section is under development.");
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
        "Your Case rolls out in stages — open plans when you are ready for the full vault."
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

function isConfiguredStripePriceId(priceId) {
  const id = String(priceId || "").trim();
  return !!(id && id !== "price_xxx");
}

async function openPricingCheckout(plan) {
  const planAliases = {
    doconce: "credits_1",
    doc_single: "credits_1",
    doc_five: "credits_5",
    full: "pro_monthly",
    pro: "pro_monthly",
    casepack: "parenting_pack",
    lawyer: "lawyer_portal",
    lawyer_portal_access: "lawyer_portal",
  };
  const planKey = planAliases[plan] || plan;
  const priceId = resolveStripePriceId(planKey);
  console.log("Checkout type:", planKey);
  console.log("Price ID:", priceId);

  const featureMap = {
    parenting_pack: "parenting_orders",
    credits_1: "document_builder",
    credits_5: "document_builder",
    pro_monthly: "subscription",
    essential: "subscription",
    credits_10: "document_builder",
    lawyer_portal: "lawyer_portal",
  };

  const typeMap = {
    parenting_pack: "one_time",
    credits_1: "doc_credit",
    credits_5: "doc_credit",
    pro_monthly: "subscription",
    essential: "subscription",
    credits_10: "one_time",
    lawyer_portal: "one_time",
  };

  const planMap = {
    pro_monthly: "pro",
    essential: "essential",
    lawyer_portal: "lawyer_portal_access",
  };

  const baseUrl = (typeof window !== "undefined" && window.SUPABASE_PROJECT_URL) || "";
  if (!baseUrl || !window.supabaseClient) {
    console.error("openPricingCheckout: missing Supabase client / URL");
    alert(
      "Payments are not connected yet (missing Supabase client). Check that supabase.js loaded and refresh."
    );
    return;
  }

  const { data: sess } = await window.supabaseClient.auth.getSession();
  const token = sess?.session?.access_token;
  if (!token && !DEV_MODE) {
    console.warn("openPricingCheckout: sign in required");
    if (typeof openAuth === "function") openAuth("signup");
    else alert("Please create an account or sign in to continue to checkout.");
    return;
  }

  const sessionUser = sess?.session?.user;
  const userId = sessionUser?.id || (window.currentUser && window.currentUser.id) || "";
  const email =
    sessionUser?.email || (window.currentUser && window.currentUser.email) || "";

  const anon = typeof window !== "undefined" ? window.SUPABASE_ANON_KEY : "";
  const returnPath =
    typeof window !== "undefined" && window.location && window.location.pathname
      ? window.location.pathname
      : "/";

  if (!isConfiguredStripePriceId(priceId)) {
    console.error("Missing priceId for checkout:", planKey);
    alert(
      'Stripe Price ID missing for "' +
        planKey +
        "\". In index.html, set the matching window.STRIPE_PRICE_* string (after supabase.js) to your Stripe Dashboard price id (starts with price_)."
    );
    return;
  }

  console.log("Starting checkout:", {
    user: window.currentUser?.id,
    priceId: priceId,
  });

  let res;
  try {
    res = await fetch(baseUrl.replace(/\/$/, "") + "/functions/v1/create-checkout-session", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: "Bearer " + token,
        apikey: anon || "",
      },
      body: JSON.stringify({
        userId,
        email,
        priceId,
        feature: featureMap[planKey],
        purchase_type: typeMap[planKey],
        plan: planMap[planKey] ?? null,
        return_path: returnPath,
      }),
    });
  } catch (err) {
    console.error("openPricingCheckout fetch:", err);
    alert(
      "Could not reach the checkout server. Check your connection, disable strict blockers for this site, and try again."
    );
    return;
  }

  const data = await res.json().catch(function () {
    return {};
  });

  if (!data.url) {
    console.error("Checkout failed:", res.status, data);
    var detail =
      (data && data.error && String(data.error)) || res.statusText || "Unknown error";
    alert("Checkout could not start (" + res.status + "): " + detail);
    return;
  }

  window.location.href = data.url;
}
window.openPricingCheckout = openPricingCheckout;

window.highlightPlan = function highlightPlan(feature) {
  let targetPlan = null;
  let oneTime = null;

  switch (feature) {
    case "casepack":
    case "parenting_orders":
      oneTime = "parenting_pack";
      break;

    case "document_builder":
      oneTime = "doc_single";
      targetPlan = "essential";
      break;

    case "ai_assistant":
      targetPlan = "essential";
      break;

    case "vault":
    case "case_management":
    case "vault_basic":
      targetPlan = "pro";
      break;
  }

  document.querySelectorAll(".pricing-plan-card").forEach(function (el) {
    el.classList.remove("highlight-plan");
  });

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
  // Disabled
  return;
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

window.saveToVault = async function saveToVault(type, data) {
  if ((!DEV_MODE && !crSupabaseAuthed()) || !window.supabaseClient) return;
  const uid = window.currentUser.id;
  if (!uid) {
    console.warn("saveToVault: missing user id (Supabase session required)");
    return;
  }
  await Vault.init(window.currentUser);
  const encrypted = await Vault.encrypt(data);

  const { error } = await window.supabaseClient.from("vault_items").insert({
    user_id: uid,
    type,
    payload: encrypted,
  });
  if (error) console.warn("saveToVault", error);
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

    const shareBtn = document.createElement("button");
    shareBtn.type = "button";
    shareBtn.textContent = "Copy share link";
    shareBtn.onclick = async function () {
      try {
        const url = await window.createShareLink(item);
        if (navigator.clipboard && navigator.clipboard.writeText) {
          await navigator.clipboard.writeText(url);
        }
        window.prompt("Share link (copy):", url);
      } catch (err) {
        console.warn("createShareLink", err);
        alert(err && err.message ? err.message : String(err));
      }
    };
    el.appendChild(shareBtn);
    container.appendChild(el);
  }
};

window.createShareLink = async function createShareLink(item) {
  if (!window.supabaseClient) throw new Error("Supabase client not available");
  const token = crypto.randomUUID();

  const { error } = await window.supabaseClient.from("vault_shares").insert({
    token,
    payload: item.payload,
  });
  if (error) throw error;

  const u = new URL("share.html", window.location.href);
  u.searchParams.set("token", token);
  return u.toString();
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
      const reader = new FileReader();
      reader.onload = async function () {
        try {
          if (typeof requireAuth === "function" && !requireAuth("vault")) return;
          const base64 = reader.result;
          await window.saveToVault("file", {
            name: file.name,
            data: base64,
          });
          await window.loadVault();
        } catch (err) {
          console.warn("vault file upload", err);
        }
      };
      reader.readAsDataURL(file);
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
  if (!DEV_MODE && (!crSupabaseAuthed() || !window.currentUser.id)) {
    list.innerHTML = "";
    return;
  }
  try {
    await Vault.init(window.currentUser);
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
        ensureCurrentUserPurchaseDefaults();
        try {
          currentUser = window.currentUser;
        } catch (e) {
          /* ignore */
        }
      } else {
        window.currentUser = null;
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
        name:
          meta.full_name ||
          meta.name ||
          (authUser.email || "").split("@")[0] ||
          "User",
        plan: null,
        planLabel: null,
        planDate: null,
        docCredits: 0,
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
          } else if (member) {
            window.currentUser.plan = member.plan;
            window.currentUser.docCredits = member.doc_credits || 0;
          }
        } catch (e) {
          console.warn("syncUser members fetch", e);
        }
      }

      ensureCurrentUserPurchaseDefaults();
    } else {
      /* No Supabase session: never keep a stale supabase-shaped user; legacy may remain for compatibility but never logged in. */
      const cu = window.currentUser;
      if (cu && cu.source === "legacy") {
        cu.loggedIn = false;
        ensureCurrentUserPurchaseDefaults();
        try {
          currentUser = window.currentUser;
        } catch (e) {
          /* ignore */
        }
      } else {
        window.currentUser = null;
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
    const plan = meta.plan != null ? meta.plan : null;
    const planLabel = meta.planLabel != null ? meta.planLabel : null;
    const planDate = meta.planDate != null ? meta.planDate : null;
    const ui = {
      id: authUser.id,
      email,
      name: name || (email.includes("@") ? email.split("@")[0] : "") || "User",
      plan,
      planLabel,
      planDate,
      loggedIn: true,
    };
    if (meta.profile != null) ui.profile = meta.profile;
    return ui;
  }

  window.syncUser = syncUser;
  window.syncCurrentUserFromSupabase = syncUser;

  window.signOutFromSupabaseAndSync = async function signOutFromSupabaseAndSync() {
    await logout();
    if (typeof window.crSetSignedInFlag === "function") {
      try {
        window.crSetSignedInFlag(false);
      } catch (e) {
        /* ignore */
      }
    }
    await pushAuthStateToUi();
    if (typeof showPage === "function") showPage("home");
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
      await window.supabaseClient.auth.getSession();
      await syncUser();
    } catch (error) {
      console.error("initSessionBeforeRender", error);
      try {
        await syncUser();
      } catch (e) {
        /* ignore */
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
      const email = document.getElementById("signin-email").value.trim();
      const password = document.getElementById("signin-pass").value;
      const err = document.getElementById("signin-error");
      const submitBtn = document.querySelector("#auth-signin .btn-full");
      if (!email || !password) {
        err.textContent = "Please enter your email and password.";
        err.style.display = "";
        return;
      }
      err.style.display = "none";
      const originalText = submitBtn ? submitBtn.textContent : "Sign In";
      if (submitBtn) {
        submitBtn.disabled = true;
        submitBtn.textContent = "Signing in...";
      }
      try {
        const data = await login(email, password);
        if (!data) {
          const authMsg = window.__crLastAuthError || "";
          if (authMsg && authMsg.toLowerCase().includes("email not confirmed")) {
            err.textContent = "Please confirm your email first. Check your inbox (and spam), then sign in again.";
          } else {
            err.textContent = authMsg || "Unable to sign in. Check your details and try again.";
          }
          err.style.display = "";
          return;
        }
        await syncUser();
        closeAuth();
        if (typeof updateNav === "function") updateNav();
        if (typeof updateGates === "function") updateGates();
        if (typeof botUnlockAfterLogin === "function") botUnlockAfterLogin();
        await initCaseVaultSession();
        if (typeof maybePostLoginPendingFeatureRedirect === "function") {
          maybePostLoginPendingFeatureRedirect();
        }
        // Force a clean post-login state sync in maintenance mode.
        window.location.href = "/";
      } catch (error) {
        err.textContent = (error && error.message) || "Unable to sign in right now. Please try again.";
        err.style.display = "";
      } finally {
        if (submitBtn) {
          submitBtn.disabled = false;
          submitBtn.textContent = originalText;
        }
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
        if (!hadPending && typeof showPage === "function") showPage("start-case");
        if (!hadPending && typeof startOnboarding === "function") setTimeout(startOnboarding, 350);
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

      window.supabaseClient.auth.onAuthStateChange(async (event, session) => {
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
