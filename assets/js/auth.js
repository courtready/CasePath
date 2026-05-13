async function signup(email, password, profile) {
  profile = profile || {};
  if (!window.supabaseClient) {
    return { data: null, error: { message: "Service not ready. Please refresh the page and try again." } };
  }
  const credentials = { email, password };
  if (profile.full_name != null || profile.name != null || profile.postcode != null) {
    credentials.options = {
      data: {
        full_name: String(profile.full_name || profile.name || "").trim(),
        postcode: profile.postcode != null ? String(profile.postcode).trim() : "",
      },
    };
  }
  const { data, error } = await window.supabaseClient.auth.signUp(credentials);
  if (error) console.error("signUp", error);
  return { data, error };
}

async function login(email, password) {
  window.__crLastAuthError = "";
  var client = window.supabaseClient || window.casepathSupabase;
  if (!client || !client.auth || typeof client.auth.signInWithPassword !== "function") {
    console.error("[AUTH] signInWithPassword failed: Supabase client not available");
    window.__crLastAuthError = "Service not ready. Please refresh the page and try again.";
    return null;
  }
  var timeoutMs = 15000;
  console.log("[AUTH] signInWithPassword starting");
  try {
    var result = await Promise.race([
      client.auth.signInWithPassword({ email, password }),
      new Promise(function (_, reject) {
        setTimeout(function () {
          reject(new Error("Sign-in timed out after " + timeoutMs / 1000 + " seconds. Check your network and try again."));
        }, timeoutMs);
      }),
    ]);
    var error = result && result.error;
    var data = result && result.data;
    if (error) {
      console.error("[AUTH] signInWithPassword failed", error);
      window.__crLastAuthError = error.message || "Unable to sign in.";
      return null;
    }
    console.log("[AUTH] signInWithPassword resolved");
    return data;
  } catch (e) {
    console.error("[AUTH] signInWithPassword failed", e);
    window.__crLastAuthError = (e && e.message) || "Unable to sign in.";
    return null;
  }
}

async function logout() {
  try {
    if (window.supabaseClient && window.supabaseClient.auth) {
      try {
        await window.supabaseClient.auth.signOut({ scope: "global" });
      } catch (e1) {
        await window.supabaseClient.auth.signOut();
      }
    }
  } catch (e) {
    console.warn("Supabase signOut failed:", e);
  }
}

async function getSession() {
  const { data } = await window.supabaseClient.auth.getSession();
  return data.session;
}

async function requestPasswordReset(email) {
  const targetEmail = String(email || "").trim();
  if (!targetEmail) {
    throw new Error("Please enter your email address first.");
  }
  var path = window.location.pathname || "/";
  if (path.charAt(0) !== "/") path = "/" + path;
  var redirectTo = window.location.origin + path;
  const { error } = await window.supabaseClient.auth.resetPasswordForEmail(targetEmail, {
    redirectTo,
  });
  if (error) throw error;
  return true;
}

/**
 * Resend signup confirmation email (Supabase). Rate-limited client-side when CasePathAuth is present.
 */
async function resendSignupVerification(email) {
  const targetEmail = String(email || "").trim();
  if (!targetEmail) {
    throw new Error("Please enter your email address first.");
  }
  if (window.CasePathAuth && window.CasePathAuth.rateLimit && typeof window.CasePathAuth.rateLimit.allow === "function") {
    var rl = window.CasePathAuth.rateLimit.allow("resend_verification");
    if (!rl.ok) {
      var sec = rl.retryAfterMs ? Math.ceil(rl.retryAfterMs / 1000) : 60;
      throw new Error("Please wait before requesting another email (" + sec + "s).");
    }
  }
  const { error } = await window.supabaseClient.auth.resend({
    type: "signup",
    email: targetEmail,
  });
  if (error) throw error;
  return true;
}

async function mfaEnrollTotp() {
  const { data, error } = await window.supabaseClient.auth.mfa.enroll({
    factorType: "totp",
    friendlyName: "CasePath Authenticator",
  });
  if (error) throw error;
  return data;
}

async function mfaChallengeAndVerify(factorId, code) {
  const { data: challengeData, error: challengeError } = await window.supabaseClient.auth.mfa.challenge({
    factorId,
  });
  if (challengeError) throw challengeError;

  const { data, error } = await window.supabaseClient.auth.mfa.verify({
    factorId,
    challengeId: challengeData.id,
    code: String(code || "").trim(),
  });
  if (error) throw error;
  return data;
}

window.requestPasswordReset = requestPasswordReset;
window.resendSignupVerification = resendSignupVerification;
window.mfaEnrollTotp = mfaEnrollTotp;
window.mfaChallengeAndVerify = mfaChallengeAndVerify;
