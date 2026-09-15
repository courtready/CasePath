/**
 * CasePath UK store.
 * Form/assistant case data requires a signed-in account.
 * Checklists remain readable as public educational pages.
 * Logged in: localStorage cache + UK data plane via uk-state.
 */
(function (w) {
  "use strict";
  var PREFIX = "casepath_uk_";
  var CASE_KEY = PREFIX + "case_v1";
  var INDEX_KEY = PREFIX + "assistants_index_v1";
  var CHECK_KEY = PREFIX + "checklists_v1";
  var HELP_KEY = PREFIX + "help_requests_v1";
  var LAST_KEY = PREFIX + "last_location_v1";
  var CLOUD_TIMER_MS = 900;
  var ENVELOPE_V = 1;

  var hydrating = false;
  var skipAdopt = false;
  var cloudTimer = null;
  var readySettled = false;
  var readyResolve;
  var readyPromise = new Promise(function (resolve) { readyResolve = resolve; });

  function isProtectedKey(key) {
    if (!key) return false;
    if (key === CASE_KEY || key === INDEX_KEY || key === LAST_KEY) return true;
    return key.indexOf(PREFIX + "assistant_") === 0;
  }

  function read(key, fallback) {
    if (isProtectedKey(key) && !signedIn()) return fallback;
    try {
      var raw = w.localStorage.getItem(key);
      return raw ? JSON.parse(raw) : fallback;
    } catch (_e) {
      return fallback;
    }
  }

  function write(key, value) {
    if (isProtectedKey(key) && !signedIn()) return false;
    try {
      w.localStorage.setItem(key, JSON.stringify(value));
      if (!hydrating) api.scheduleCloudSync();
      return true;
    } catch (_e) {
      return false;
    }
  }

  function assistantKey(id) {
    return PREFIX + "assistant_" + id + "_v1";
  }

  function signedIn() {
    return !!(w.CasePathUK && w.CasePathUK.auth && w.CasePathUK.auth.isSignedIn());
  }

  function isoMax(values) {
    var best = "";
    (values || []).forEach(function (v) {
      var s = String(v || "");
      if (s && s > best) best = s;
    });
    return best;
  }

  function hasMeaningfulLocal() {
    var c = api.getCase() || {};
    var keys = Object.keys(c).filter(function (k) { return k !== "updatedAt"; });
    if (keys.length) return true;
    if ((api.listAssistants() || []).length) return true;
    if (Object.keys(api.listChecklists() || {}).length) return true;
    var loc = api.getLastLocation();
    return !!(loc && loc.href);
  }

  function localUpdatedAt() {
    var times = [];
    var c = api.getCase() || {};
    if (c.updatedAt) times.push(c.updatedAt);
    (api.listAssistants() || []).forEach(function (a) {
      if (a.updatedAt) times.push(a.updatedAt);
      var rec = api.loadAssistant(a.id);
      if (rec && rec.updatedAt) times.push(rec.updatedAt);
    });
    var checks = api.listChecklists() || {};
    Object.keys(checks).forEach(function (id) {
      if (checks[id] && checks[id].updatedAt) times.push(checks[id].updatedAt);
    });
    var loc = api.getLastLocation();
    if (loc && loc.updatedAt) times.push(loc.updatedAt);
    return isoMax(times);
  }

  function buildEnvelope() {
    var assistants = {};
    (api.listAssistants() || []).forEach(function (item) {
      var rec = api.loadAssistant(item.id);
      if (rec) assistants[item.id] = rec;
    });
    return {
      v: ENVELOPE_V,
      case: api.getCase() || {},
      assistantsIndex: api.listAssistants() || [],
      assistants: assistants,
      checklists: api.listChecklists() || {},
      lastLocation: api.getLastLocation(),
      updatedAt: localUpdatedAt() || new Date().toISOString(),
    };
  }

  function applyEnvelope(payload) {
    if (!payload || typeof payload !== "object") return;
    hydrating = true;
    try {
      if (payload.case && typeof payload.case === "object") write(CASE_KEY, payload.case);
      if (Array.isArray(payload.assistantsIndex)) write(INDEX_KEY, payload.assistantsIndex);
      if (payload.assistants && typeof payload.assistants === "object") {
        Object.keys(payload.assistants).forEach(function (id) {
          write(assistantKey(id), payload.assistants[id]);
        });
      }
      if (payload.checklists && typeof payload.checklists === "object") write(CHECK_KEY, payload.checklists);
      if (payload.lastLocation && typeof payload.lastLocation === "object") write(LAST_KEY, payload.lastLocation);
    } finally {
      hydrating = false;
    }
  }

  function clearSavedLocal() {
    hydrating = true;
    try {
      var remove = [];
      for (var i = 0; i < w.localStorage.length; i++) {
        var key = w.localStorage.key(i);
        if (key && key.indexOf(PREFIX) === 0 && key !== HELP_KEY) remove.push(key);
      }
      remove.forEach(function (key) {
        try { w.localStorage.removeItem(key); } catch (_e) { /* ignore */ }
      });
    } finally {
      hydrating = false;
    }
  }

  function safeLocation(loc) {
    if (!loc || typeof loc !== "object") return null;
    var href = String(loc.href || "");
    if (!href || /[:\\]|\/\//.test(href) || href.charAt(0) === "/" || href.indexOf("..") !== -1) {
      return null;
    }
    var allowed =
      /^(assistants\/run\.html\?id=[a-z0-9-]+|checklists\/[a-z0-9-]+\.html|tell-me-more\/[a-z0-9-]+\.html|legal\/[a-z0-9-]+\.html|get-help[a-z0-9-]*\.html|index\.html|my-case\.html|account\.html|prepare\.html|glossary\.html|contact\.html|mental-health\.html|about-the-kids\.html|about\.html|unsupported\.html)(\?.*)?$/i;
    if (!allowed.test(href.split("#")[0])) return null;
    var out = {
      kind: loc.kind === "checklist" ? "checklist" : loc.kind === "assistant" ? "assistant" : "page",
      href: href,
      updatedAt: loc.updatedAt || new Date().toISOString(),
    };
    if (loc.id) out.id = String(loc.id).replace(/[^a-z0-9-]/gi, "");
    if (typeof loc.screenIndex === "number" && isFinite(loc.screenIndex) && loc.screenIndex >= 0) {
      out.screenIndex = Math.floor(loc.screenIndex);
    }
    return out;
  }

  var api = {
    whenReady: function () { return readyPromise; },
    markReady: function () {
      if (readySettled) return;
      readySettled = true;
      readyResolve();
    },
    getCase: function () {
      return read(CASE_KEY, {});
    },
    mergeCase: function (patch) {
      var next = Object.assign({}, api.getCase(), patch || {}, { updatedAt: new Date().toISOString() });
      write(CASE_KEY, next);
      return next;
    },
    loadAssistant: function (id) {
      return read(assistantKey(id), null);
    },
    saveAssistant: function (id, payload) {
      var record = Object.assign({}, payload, {
        assistantId: id,
        updatedAt: new Date().toISOString(),
      });
      if (id === "c8") record.neverShareFields = [
        "confidentialAddress",
        "confidentialPhone",
        "confidentialEmail",
        "confidentialOther",
        "refugeResident",
        "c8PersonName",
        "omittedKnownToOther",
      ];
      write(assistantKey(id), record);
      var index = read(INDEX_KEY, []);
      var found = false;
      for (var i = 0; i < index.length; i++) {
        if (index[i].id === id) {
          index[i] = {
            id: id,
            title: record.title || id,
            updatedAt: record.updatedAt,
            progressPercent: record.progressPercent || 0,
            completed: !!record.completed,
          };
          found = true;
        }
      }
      if (!found) {
        index.push({
          id: id,
          title: record.title || id,
          updatedAt: record.updatedAt,
          progressPercent: record.progressPercent || 0,
          completed: !!record.completed,
        });
      }
      write(INDEX_KEY, index);
      var shared = {};
      var a = record.answers || {};
      var neverShare = {
        confidentialAddress: true,
        confidentialPhone: true,
        confidentialEmail: true,
        confidentialOther: true,
        refugeResident: true,
        c8PersonName: true,
        omittedKnownToOther: true,
      };
      if (record.neverShareFields) {
        record.neverShareFields.forEach(function (k) { neverShare[k] = true; });
      }
      ["yourName", "otherName", "childNames", "courtName", "caseNumber"].forEach(function (k) {
        if (neverShare[k]) return;
        if (a[k]) shared[k] = a[k];
      });
      if (!neverShare.children && a.children) shared.children = a.children;
      if (Object.keys(shared).length) api.mergeCase(shared);
      return record;
    },
    listAssistants: function () {
      return read(INDEX_KEY, []);
    },
    loadChecklist: function (id) {
      var all = read(CHECK_KEY, {});
      return all[id] || { ticks: {}, notes: "" };
    },
    saveChecklist: function (id, state) {
      var all = read(CHECK_KEY, {});
      all[id] = Object.assign({}, state, { updatedAt: new Date().toISOString() });
      write(CHECK_KEY, all);
      return all[id];
    },
    listChecklists: function () {
      return read(CHECK_KEY, {});
    },
    saveHelpRequest: function (payload) {
      var all = read(HELP_KEY, []);
      all.push(Object.assign({ id: "req-" + Date.now(), createdAt: new Date().toISOString() }, payload));
      write(HELP_KEY, all);
      return true;
    },
    getLastLocation: function () {
      return safeLocation(read(LAST_KEY, null));
    },
    setLastLocation: function (loc) {
      var next = safeLocation(Object.assign({}, loc, { updatedAt: new Date().toISOString() }));
      if (!next) return null;
      write(LAST_KEY, next);
      return next;
    },
    resumeHref: function () {
      var loc = api.getLastLocation();
      return loc && loc.href ? loc.href : "my-case.html";
    },
    buildEnvelope: buildEnvelope,
    scheduleCloudSync: function () {
      if (hydrating || skipAdopt || !signedIn()) return;
      if (cloudTimer) clearTimeout(cloudTimer);
      cloudTimer = setTimeout(function () {
        api.pushCloud().catch(function () { /* keep local copy */ });
      }, CLOUD_TIMER_MS);
    },
    pushCloud: function () {
      if (!signedIn() || !w.CasePathUK.state) return Promise.resolve(null);
      return w.CasePathUK.state.put(buildEnvelope());
    },
    hydrateFromCloud: function () {
      if (!signedIn() || !w.CasePathUK.state) return Promise.resolve({ mode: "local-only" });
      return w.CasePathUK.state.get().then(function (res) {
        var cloud = res && res.state;
        var payload = cloud && cloud.payload;
        var localWork = hasMeaningfulLocal();
        if (payload && typeof payload === "object") {
          var cloudTs = String(cloud.updated_at || payload.updatedAt || "");
          var localTs = localUpdatedAt();
          if (localWork && localTs && cloudTs && localTs > cloudTs) {
            return api.pushCloud().then(function () { return { mode: "local-newer-uploaded" }; });
          }
          applyEnvelope(payload);
          return { mode: "hydrated-from-cloud" };
        }
        if (localWork && !skipAdopt) {
          return api.pushCloud().then(function () { return { mode: "local-adopted" }; });
        }
        return { mode: "empty" };
      });
    },
    clearProtectedLocal: function () {
      clearSavedLocal();
    },
    deleteUkSavedWork: function () {
      if (!signedIn() || !w.CasePathUK.state) {
        clearSavedLocal();
        return Promise.resolve({ ok: true, localOnly: true });
      }
      return w.CasePathUK.state.deleteSavedWork().then(function () {
        skipAdopt = true;
        clearSavedLocal();
        skipAdopt = false;
        return { ok: true };
      });
    },
    humanError: function (kind) {
      if (kind === "save") return "We couldn't save that just now. Your answers are still on this device if this browser kept them.";
      if (kind === "need-more") return "We need a little more information before you can continue.";
      if (kind === "unsupported") return "CasePath doesn't support this application yet.";
      return "Something went wrong. Try again, or come back to My Case.";
    },
  };

  w.CasePathUK = w.CasePathUK || {};
  w.CasePathUK.store = api;

  setTimeout(function () { api.markReady(); }, 4000);
})(window);
