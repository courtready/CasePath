/**
 * Canonical glossary shape for AI + UI (every entry normalized to):
 * { term, category, definition, when }
 *
 * Primary source: Supabase public.glossary
 * Fallback source: /glossary_terms.json (compact keys n,c,d,w supported).
 */
(function () {
  window.GLOSSARY = window.GLOSSARY || [];

  function normalizeGlossaryEntry(e) {
    if (!e || typeof e !== "object") return null;
    const term = e.term != null ? String(e.term).trim() : e.n != null ? String(e.n).trim() : "";
    if (!term) return null;
    return {
      term,
      category: e.category != null ? String(e.category).trim() : e.c != null ? String(e.c).trim() : "",
      definition: e.definition != null ? String(e.definition).trim() : e.d != null ? String(e.d).trim() : "",
      when: e.when != null ? String(e.when).trim() : e.w != null ? String(e.w).trim() : "",
    };
  }

  function mapRawToGlossary(raw) {
    if (!raw || !Array.isArray(raw.all_terms)) return [];
    const out = [];
    for (let i = 0; i < raw.all_terms.length; i++) {
      const row = normalizeGlossaryEntry(raw.all_terms[i]);
      if (row) out.push(row);
    }
    return out;
  }

  function mapSupabaseRows(rows) {
    if (!Array.isArray(rows)) return [];
    const out = [];
    for (let i = 0; i < rows.length; i++) {
      const r = rows[i] || {};
      const row = normalizeGlossaryEntry({
        term: r.term,
        category: r.category,
        definition: r.definition,
        when: r.when_applies,
      });
      if (row) out.push(row);
    }
    return out;
  }

  async function loadFromSupabase() {
    if (!window.supabaseClient) return [];
    try {
      const { data, error } = await window.supabaseClient
        .from("glossary")
        .select("term,category,definition,when_applies")
        .order("term", { ascending: true })
        .limit(5000);
      if (error) return [];
      return mapSupabaseRows(data);
    } catch (e) {
      return [];
    }
  }

  async function loadFromJsonFallback() {
    const urls = ["glossary_terms.json", "/glossary_terms.json", "App/glossary_terms.json"];
    for (let u = 0; u < urls.length; u++) {
      try {
        const res = await fetch(urls[u], { cache: "force-cache" });
        if (!res.ok) continue;
        const raw = await res.json();
        const mapped = mapRawToGlossary(raw);
        if (mapped.length) return mapped;
      } catch (err) {
        /* try next URL */
      }
    }
    return [];
  }

  window.__normalizeGlossaryEntry = normalizeGlossaryEntry;

  window.__GLOSSARY_LOAD_PROMISE = null;
  window.ensureGlossaryLoaded = function ensureGlossaryLoaded() {
    if (window.__GLOSSARY_LOAD_PROMISE) return window.__GLOSSARY_LOAD_PROMISE;
    if (window.GLOSSARY && window.GLOSSARY.length) {
      window.__GLOSSARY_LOAD_PROMISE = Promise.resolve();
      return window.__GLOSSARY_LOAD_PROMISE;
    }
    window.__GLOSSARY_LOAD_PROMISE = (async function () {
      // 1) Try Supabase first for live/admin-editable glossary.
      const dbRows = await loadFromSupabase();
      if (dbRows.length) {
        window.GLOSSARY = dbRows;
        return;
      }
      // 2) Safe fallback to local JSON if DB unavailable or empty.
      const jsonRows = await loadFromJsonFallback();
      if (jsonRows.length) {
        window.GLOSSARY = jsonRows;
        return;
      }
      window.GLOSSARY = window.GLOSSARY || [];
    })();
    return window.__GLOSSARY_LOAD_PROMISE;
  };
})();
