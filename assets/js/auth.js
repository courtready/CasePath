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
  const { data, error } = await window.supabaseClient.auth.signInWithPassword({
    email,
    password
  });
  if (error) {
    console.error(error);
    window.__crLastAuthError = error.message || "Unable to sign in.";
    return null;
  }
  return data;
}

async function logout() {
  try {
    await window.supabaseClient.auth.signOut();
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
  const redirectTo = window.location.origin + window.location.pathname;
  const { error } = await window.supabaseClient.auth.resetPasswordForEmail(targetEmail, {
    redirectTo,
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
window.mfaEnrollTotp = mfaEnrollTotp;
window.mfaChallengeAndVerify = mfaChallengeAndVerify;
