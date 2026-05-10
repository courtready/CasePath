(function () {
  var supabaseUrl = "https://zcjpqsekucmmjdnykcuu.supabase.co";
  var supabaseKey =
    "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InpjanBxc2VrdWNtbWpkbnlrY3V1Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzIzMzgzODIsImV4cCI6MjA4NzkxNDM4Mn0.WP0DfVYLZHaKmAvEMh9VOshfprJ3cTtYUJAGvPfGyL8";

  function getCreateClient() {
    var lib = typeof window !== "undefined" ? window.supabase : null;
    if (!lib) return null;
    if (typeof lib.createClient === "function") return lib.createClient;
    if (lib.default && typeof lib.default.createClient === "function") return lib.default.createClient;
    return null;
  }

  function initSupabaseClient() {
    if (window.supabaseClient) return true;
    var createClient = getCreateClient();
    if (!createClient) {
      console.error(
        "CasePath: Supabase library did not load (no createClient on window.supabase). Is the CDN script blocked?"
      );
      return false;
    }
    var client;
    try {
      client = createClient(supabaseUrl, supabaseKey);
    } catch (e) {
      console.error("CasePath: supabase createClient() failed", e);
      return false;
    }
    window.SUPABASE_PROJECT_URL = supabaseUrl;
    window.SUPABASE_ANON_KEY = supabaseKey;
    window.supabaseClient = client;
    return true;
  }

  window.initSupabaseClient = initSupabaseClient;
  initSupabaseClient();
})();
