(function () {
  var activeThreadFilter = "";
  var activeAffidavitFilter = "";
  var selectedEventId = "";
  var selectedThreadId = "";

  function qs(id) {
    return document.getElementById(id);
  }
  function authed() {
    try {
      return typeof crSupabaseAuthed === "function" ? crSupabaseAuthed() : !!(window.currentUser && window.currentUser.id);
    } catch (_e) {
      return false;
    }
  }
  function safeHtml(s) {
    return String(s || "").replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
  }
  function fmtDate(val) {
    if (!val) return "";
    var d = new Date(val);
    if (Number.isNaN(d.getTime())) return String(val);
    return d.toLocaleDateString("en-AU", { day: "2-digit", month: "short", year: "numeric" });
  }
  function monthKey(d) {
    var dt = new Date(d);
    if (Number.isNaN(dt.getTime())) return "Unknown";
    return dt.toLocaleDateString("en-AU", { month: "long", year: "numeric" });
  }
  function scaffoldConfig() {
    var pt = "";
    try { pt = String((window.currentUser && window.currentUser.primaryCaseType) || "").toLowerCase(); } catch (_e) {}
    if (!pt) {
      try {
        var seed = JSON.parse(localStorage.getItem("cr_case") || "{}");
        pt = String(seed.procKey || seed.caseType || "").toLowerCase();
      } catch (_e2) {}
    }
    function fromType(t) {
      if (t === "parenting") return {
        guidance: "Record parenting events, handovers, school issues and important communications as they occur.",
        quickAdd: "Record Handover Issue",
        prompt: "Try: Missed handover, school communication, or child wellbeing note.",
        priority: ["parenting", "school", "communications", "incident", "medical", "financial"]
      };
      if (t === "property") return {
        guidance: "Track financial discussions, disclosures, assets and important records chronologically.",
        quickAdd: "Add Financial Event",
        prompt: "Try: asset discussion, disclosure request, or bank record update.",
        priority: ["financial", "documents", "communications", "incident", "tasks", "medical"]
      };
      if (t === "protection" || t === "avo" || t === "urgent" || t === "breach" || t === "respond") return {
        guidance: "Record incidents, communications and supporting evidence as close to the event as possible.",
        quickAdd: "Record Incident",
        prompt: "Try: incident report, safety concern, or police/court interaction.",
        priority: ["incident", "communications", "documents", "medical", "parenting", "financial"]
      };
      if (t === "divorce") return {
        guidance: "Build a clear chronology of separation events, documents and important milestones.",
        quickAdd: "Record Milestone",
        prompt: "Try: separation milestone, legal document, or important date.",
        priority: ["documents", "incident", "communications", "tasks", "financial", "parenting"]
      };
      return {
        guidance: "Your chronology is ready. Start by recording your first incident, note or event.",
        quickAdd: "Record Incident",
        prompt: "Try: incident, communication, or supporting evidence event.",
        priority: ["incident", "parenting", "communications", "financial", "medical", "school"]
      };
    }
    return fromType(pt);
  }
  function applyScaffoldUiHints() {
    var cfg = scaffoldConfig();
    var quickBtn = qs("cw-upload-btn");
    var mobileBtn = qs("cw-mobile-upload");
    var fab = qs("cw-fab-add");
    var quickHint = qs("cw-scaffold-prompt");
    if (quickBtn) quickBtn.textContent = cfg.quickAdd;
    if (mobileBtn) mobileBtn.textContent = cfg.quickAdd;
    if (fab) fab.textContent = cfg.quickAdd;
    if (quickHint) quickHint.textContent = cfg.prompt;

    var navBtns = Array.prototype.slice.call(document.querySelectorAll("#case-workspace-root [data-cw-category]"));
    if (navBtns.length) {
      navBtns.sort(function (a, b) {
        var av = String(a.getAttribute("data-cw-category") || "").toLowerCase();
        var bv = String(b.getAttribute("data-cw-category") || "").toLowerCase();
        var ai = cfg.priority.indexOf(av);
        var bi = cfg.priority.indexOf(bv);
        if (ai < 0 && bi < 0) return 0;
        if (ai < 0) return 1;
        if (bi < 0) return -1;
        return ai - bi;
      });
      var navWrap = navBtns[0] && navBtns[0].parentNode ? navBtns[0].parentNode : null;
      if (navWrap) navBtns.forEach(function (btn) { navWrap.appendChild(btn); });
    }
  }
  function detectDevice() {
    var ua = String((navigator && navigator.userAgent) || "").toLowerCase();
    if (/iphone|ipad|ipod/.test(ua)) return "ios";
    if (/android/.test(ua)) return "android";
    if (!ua) return "unknown";
    return "desktop";
  }
  function detectPlatform() {
    var ua = String((navigator && navigator.userAgent) || "").toLowerCase();
    if (!ua) return "unknown";
    if (/iphone|ipad|ipod|android/.test(ua)) return "mobile-web";
    return "web";
  }
  function parseSafeDate(value) {
    var d = new Date(value);
    if (Number.isNaN(d.getTime())) return null;
    d.setHours(0, 0, 0, 0);
    return d;
  }
  function isFutureDate(value) {
    var d = parseSafeDate(value);
    if (!d) return false;
    var today = new Date();
    today.setHours(0, 0, 0, 0);
    return d.getTime() > today.getTime();
  }

  async function fetchThreads() {
    if (!window.supabaseClient || !window.currentUser || !window.currentUser.id) return [];
    var res = await window.supabaseClient
      .from("case_incident_threads")
      .select("id,title,category,status,affidavit_relevant,tags,updated_at")
      .eq("user_id", window.currentUser.id)
      .is("deleted_at", null)
      .order("updated_at", { ascending: false })
      .limit(100);
    return res.error ? [] : (res.data || []);
  }

  async function fetchChronologyEvents() {
    if (!window.supabaseClient || !window.currentUser || !window.currentUser.id) return [];
    var res = await window.supabaseClient
      .from("case_chronology_events")
      .select("id,user_id,vault_item_id,title,description,event_date,created_at,event_type,visibility,event_status,importance,affidavit_relevant,incident_thread_id,subcategory,tags")
      .eq("user_id", window.currentUser.id)
      .is("deleted_at", null)
      .order("event_date", { ascending: false })
      .limit(180);
    return res.error ? [] : (res.data || []);
  }

  async function fetchEvidence() {
    if (!window.supabaseClient || !window.currentUser || !window.currentUser.id) return [];
    var res = await window.supabaseClient
      .from("vault_items")
      .select("id,category,subcategory,notes,tags,created_at,payload,importance,affidavit_relevant,chronology_event_id,incident_thread_id")
      .eq("user_id", window.currentUser.id)
      .is("deleted_at", null)
      .order("created_at", { ascending: false })
      .limit(180);
    return res.error ? [] : (res.data || []);
  }

  function filterEvents(events) {
    var keyword = String((qs("cw-search") && qs("cw-search").value) || "").toLowerCase().trim();
    var category = String((qs("cw-category-filter") && qs("cw-category-filter").value) || "").toLowerCase();
    var status = String((qs("cw-status-filter") && qs("cw-status-filter").value) || "").toLowerCase();
    var threadFilter = String((qs("cw-thread-filter") && qs("cw-thread-filter").value) || activeThreadFilter || "").toLowerCase();
    var affidavitFilter = String(activeAffidavitFilter || "").toLowerCase();
    return events.filter(function (ev) {
      if (category && String(ev.event_type || "").toLowerCase() !== category) return false;
      if (status && String(ev.event_status || "").toLowerCase() !== status) return false;
      if (threadFilter && String(ev.incident_thread_id || "").toLowerCase() !== threadFilter) return false;
      if (affidavitFilter === "true" && !ev.affidavit_relevant) return false;
      if (affidavitFilter === "false" && !!ev.affidavit_relevant) return false;
      if (!keyword) return true;
      var text = [ev.title, ev.description, ev.subcategory, Array.isArray(ev.tags) ? ev.tags.join(" ") : ""].join(" ").toLowerCase();
      return text.indexOf(keyword) >= 0;
    });
  }

  function groupEvents(events) {
    var mode = String((qs("cw-group-by") && qs("cw-group-by").value) || "month");
    var groups = {};
    events.forEach(function (ev) {
      var key = "";
      if (mode === "thread") key = ev.incident_thread_id ? "Thread: " + ev.incident_thread_id : "No thread";
      else if (mode === "category") key = ev.event_type || "uncategorised";
      else if (mode === "status") key = ev.event_status || "active";
      else if (mode === "affidavit") key = ev.affidavit_relevant ? "Affidavit relevant" : "Not affidavit relevant";
      else key = monthKey(ev.event_date);
      if (!groups[key]) groups[key] = [];
      groups[key].push(ev);
    });
    return groups;
  }

  async function renderWorkspace() {
    var timelineEl = qs("cw-timeline-list");
    var filesEl = qs("cw-files-grid");
    var healthEl = qs("cw-thread-health");
    var threadSel = qs("cw-thread-select");
    var linkSel = qs("cw-upload-link-event");
    if (!timelineEl || !filesEl) return;
    applyScaffoldUiHints();

    var threads = await fetchThreads();
    var events = filterEvents(await fetchChronologyEvents());
    var evidence = await fetchEvidence();
    var threadFilterSel = qs("cw-thread-filter");
    var exportThreadSel = qs("cw-export-thread-filter");
    var threadChips = qs("cw-thread-chips");
    var affidavitChips = qs("cw-affidavit-chips");

    if (threadSel) {
      threadSel.innerHTML =
        '<option value="">Incident thread (optional)</option>' +
        threads
          .map(function (t) {
            return '<option value="' + safeHtml(t.id) + '">' + safeHtml(t.title) + "</option>";
          })
          .join("");
    }
    if (threadFilterSel) {
      threadFilterSel.innerHTML =
        '<option value="">Filter by incident thread</option>' +
        threads
          .map(function (t) {
            return '<option value="' + safeHtml(t.id) + '">' + safeHtml(t.title) + "</option>";
          })
          .join("");
      if (activeThreadFilter) threadFilterSel.value = activeThreadFilter;
    }
    if (exportThreadSel) {
      exportThreadSel.innerHTML =
        '<option value="">Export thread: all</option>' +
        threads
          .map(function (t) {
            return '<option value="' + safeHtml(t.id) + '">' + safeHtml(t.title) + "</option>";
          })
          .join("");
    }
    if (threadChips) {
      threadChips.innerHTML =
        '<span class="cw-chip" data-cw-thread-chip="">all threads</span>' +
        threads
          .slice(0, 10)
          .map(function (t) {
            return '<span class="cw-chip" data-cw-thread-chip="' + safeHtml(t.id) + '">' + safeHtml(t.title) + "</span>";
          })
          .join("");
      threadChips.querySelectorAll("[data-cw-thread-chip]").forEach(function (chip) {
        var tid = chip.getAttribute("data-cw-thread-chip") || "";
        if (tid === (activeThreadFilter || "")) {
          chip.style.background = "var(--sage)";
          chip.style.color = "#fff";
        }
        chip.onclick = function () {
          activeThreadFilter = tid;
          if (threadFilterSel) threadFilterSel.value = tid;
          void renderWorkspace();
        };
      });
    }
    if (affidavitChips) {
      affidavitChips.querySelectorAll("[data-cw-aff-filter]").forEach(function (chip) {
        var v = chip.getAttribute("data-cw-aff-filter") || "";
        if (v === activeAffidavitFilter) {
          chip.style.background = "var(--sage)";
          chip.style.color = "#fff";
        } else {
          chip.style.background = "";
          chip.style.color = "";
        }
        chip.onclick = function () {
          activeAffidavitFilter = v;
          void renderWorkspace();
        };
      });
    }
    if (linkSel) {
      linkSel.innerHTML =
        '<option value="">Attach to incident (optional)</option>' +
        events
          .slice(0, 60)
          .map(function (ev) {
            return '<option value="' + safeHtml(ev.id) + '">' + safeHtml(fmtDate(ev.event_date) + " — " + ev.title) + "</option>";
          })
          .join("");
    }

    if (!evidence.length) {
      filesEl.innerHTML = '<div class="cw-file-card"><div class="cw-file-name">No supporting evidence yet</div><div class="cw-meta">Start with Add Incident, then attach evidence.</div></div>';
    } else {
      filesEl.innerHTML = evidence
        .slice(0, 12)
        .map(function (item) {
          var p = item.payload || {};
          var name = p.name || p.file_name || "Evidence file";
          var linked = item.chronology_event_id ? "linked incident" : "unlinked";
          return (
            '<div class="cw-file-card">' +
            '<div class="cw-file-name">' + safeHtml(name) + "</div>" +
            '<div class="cw-meta">' + safeHtml((item.category || "evidence") + " • " + fmtDate(item.created_at)) + "</div>" +
            '<div class="cw-state"><span>encrypted locally</span><span>uploaded</span><span>synced</span><span>' + safeHtml(linked) + "</span></div>" +
            "</div>"
          );
        })
        .join("");
    }

    var grouped = groupEvents(events);
    var keys = Object.keys(grouped);
    if (!keys.length) {
      if (healthEl) {
        healthEl.innerHTML =
          '<span class="cw-health-chip"><strong>0</strong> active</span>' +
          '<span class="cw-health-chip"><strong>0</strong> disputed</span>' +
          '<span class="cw-health-chip"><strong>0</strong> affidavit-linked</span>' +
          '<span class="cw-health-chip"><strong>0</strong> exported</span>' +
          '<span class="cw-health-chip"><strong>0</strong> draft</span>';
      }
      var cfg = scaffoldConfig();
      timelineEl.innerHTML = '<div class="cw-timeline-item"><div class="cw-date">Your chronology is ready</div><div class="cw-item-sub">' + safeHtml(cfg.guidance) + '</div></div>';
      return;
    }
    if (healthEl) {
      var activeN = events.filter(function (e) { return (e.event_status || "active") === "active"; }).length;
      var disputedN = events.filter(function (e) { return e.event_status === "disputed"; }).length;
      var affN = events.filter(function (e) { return !!e.affidavit_relevant || e.event_status === "affidavit-linked"; }).length;
      var exportedN = events.filter(function (e) { return e.event_status === "exported"; }).length;
      var draftN = events.filter(function (e) { return e.event_status === "draft"; }).length;
      healthEl.innerHTML =
        '<span class="cw-health-chip"><strong>' + activeN + "</strong> active</span>" +
        '<span class="cw-health-chip"><strong>' + disputedN + "</strong> disputed</span>" +
        '<span class="cw-health-chip"><strong>' + affN + "</strong> affidavit-linked</span>" +
        '<span class="cw-health-chip"><strong>' + exportedN + "</strong> exported</span>" +
        '<span class="cw-health-chip"><strong>' + draftN + "</strong> draft</span>";
    }
    timelineEl.innerHTML = keys
      .map(function (k, idx) {
        var sectionId = "cw-group-" + idx;
        var rows = grouped[k]
          .map(function (ev) {
            return (
              '<div class="cw-timeline-item">' +
              '<div class="cw-meta" style="margin-bottom:0.2rem;">' + safeHtml(ev.importance || "normal") + " • " + safeHtml(ev.visibility || "private") + "</div>" +
              '<div class="cw-date">' + safeHtml(fmtDate(ev.event_date)) + "</div>" +
              '<div class="cw-item-title">' + safeHtml(ev.title || "Untitled incident") + "</div>" +
              '<div class="cw-item-sub">' +
              safeHtml((ev.event_type || "incident") + " • " + (ev.subcategory || "general") + " • " + (ev.event_status || "active")) +
              (ev.description ? "<br>" + safeHtml(ev.description) : "") +
              "</div>" +
              "</div>"
            );
          })
          .join("");
        return (
          '<div class="cw-group-wrap">' +
          '<button class="cw-btn" data-cw-toggle="' + sectionId + '" style="width:100%;text-align:left;margin-bottom:0.4rem;">' + safeHtml(k) + " (" + grouped[k].length + ")</button>" +
          '<div id="' + sectionId + '" class="cw-group-chain">' + rows + "</div>" +
          "</div>"
        );
      })
      .join("");

    document.querySelectorAll("[data-cw-toggle]").forEach(function (btn) {
      btn.onclick = function () {
        var target = qs(btn.getAttribute("data-cw-toggle"));
        if (!target) return;
        target.style.display = target.style.display === "none" ? "" : "none";
      };
    });
    timelineEl.querySelectorAll(".cw-timeline-item").forEach(function (row, i) {
      var ev = events[i];
      if (!ev) return;
      row.style.cursor = "pointer";
      row.onclick = function () {
        selectedEventId = ev.id;
        selectedThreadId = ev.incident_thread_id || "";
        void renderLinkedEventsPanel(events);
      };
    });
    if (!selectedThreadId && events[0]) selectedThreadId = events[0].incident_thread_id || "";
    await renderLinkedEventsPanel(events);
  }

  async function renderLinkedEventsPanel(events) {
    var panel = qs("cw-linked-events");
    if (!panel) return;
    var rows = events || (await fetchChronologyEvents());
    var threadId = selectedThreadId || activeThreadFilter || "";
    var linked = threadId
      ? rows.filter(function (ev) { return String(ev.incident_thread_id || "") === String(threadId); })
      : rows.slice(0, 5);
    if (!linked.length) {
      panel.innerHTML = '<div class="cw-timeline-item"><div class="cw-item-sub">No linked events yet for this thread.</div></div>';
      return;
    }
    panel.innerHTML = linked
      .slice(0, 8)
      .map(function (ev) {
        var active = selectedEventId && selectedEventId === ev.id;
        return (
          '<div class="cw-timeline-item" style="' + (active ? "border-color:var(--sage);" : "") + '">' +
          '<div class="cw-date">' + safeHtml(fmtDate(ev.event_date)) + "</div>" +
          '<div class="cw-item-title">' + safeHtml(ev.title || "Untitled") + "</div>" +
          '<div class="cw-item-sub">' + safeHtml((ev.event_status || "active") + " • " + (ev.event_type || "incident")) + "</div>" +
          "</div>"
        );
      })
      .join("");
  }

  async function ensureThread(title, category, description, tags, chronologyVisible, affidavitRelevant) {
    if (!title) return null;
    var existing = await window.supabaseClient
      .from("case_incident_threads")
      .select("id")
      .eq("user_id", window.currentUser.id)
      .eq("title", title)
      .maybeSingle();
    if (existing.data && existing.data.id) return existing.data.id;
    var ins = await window.supabaseClient
      .from("case_incident_threads")
      .insert({
        user_id: window.currentUser.id,
        title: title,
        description: description || null,
        category: category || "incident",
        chronology_visible: !!chronologyVisible,
        affidavit_relevant: !!affidavitRelevant,
        tags: tags || [],
        status: "active",
        created_from_device: detectDevice(),
        created_from_platform: detectPlatform(),
      })
      .select("id")
      .single();
    if (ins.error) throw ins.error;
    if (typeof window.logVaultEvent === "function") {
      try {
        await window.logVaultEvent("incident_thread_create", title, "ok", { thread_id: ins.data.id, category: category || "incident" });
      } catch (_e) {}
    }
    return ins.data.id;
  }

  async function addIncident() {
    if (!authed()) {
      if (typeof openAuth === "function") openAuth("signin");
      return;
    }
    var title = String((qs("cw-event-title") && qs("cw-event-title").value) || "").trim();
    var eventDate = String((qs("cw-event-date") && qs("cw-event-date").value) || "").trim();
    var category = String((qs("cw-event-type") && qs("cw-event-type").value) || "incident");
    var subcategory = String((qs("cw-event-subcategory") && qs("cw-event-subcategory").value) || "").trim();
    var notes = String((qs("cw-event-desc") && qs("cw-event-desc").value) || "").trim();
    var status = String((qs("cw-event-status") && qs("cw-event-status").value) || "active");
    var importance = String((qs("cw-event-importance") && qs("cw-event-importance").value) || "normal");
    var tagsRaw = String((qs("cw-tags") && qs("cw-tags").value) || "").trim();
    var tags = tagsRaw ? tagsRaw.split(",").map(function (t) { return t.trim(); }).filter(Boolean) : [];
    var visibility = (qs("cw-event-visible") && qs("cw-event-visible").checked) ? "private" : "shared";
    var affidavitRelevant = !!(qs("cw-event-affidavit") && qs("cw-event-affidavit").checked);
    var threadTitle = String((qs("cw-thread-title") && qs("cw-thread-title").value) || "").trim();
    var chosenThreadId = String((qs("cw-thread-select") && qs("cw-thread-select").value) || "").trim();

    if (!title || !eventDate) {
      alert("Please complete What happened? and When did it happen?");
      return;
    }
    if (title.length > 220) {
      alert("Incident title is too long. Please keep it under 220 characters.");
      return;
    }
    if (!parseSafeDate(eventDate)) {
      alert("Please choose a valid incident date.");
      return;
    }
    if (isFutureDate(eventDate)) {
      alert("Future incident dates are not allowed in chronology. Use today's date if still ongoing.");
      return;
    }
    var threadId = chosenThreadId || (await ensureThread(threadTitle, category, notes, tags, true, affidavitRelevant));
    var ins = await window.supabaseClient.from("case_chronology_events").insert({
      user_id: window.currentUser.id,
      title: title,
      description: notes || null,
      event_date: eventDate,
      event_type: category,
      visibility: visibility,
      event_status: status,
      importance: importance,
      affidavit_relevant: affidavitRelevant,
      incident_thread_id: threadId || null,
      subcategory: subcategory || null,
      tags: tags,
      created_from_device: detectDevice(),
      created_from_platform: detectPlatform(),
    }).select("id").single();
    if (ins.error) {
      alert(ins.error.message || "Could not save incident.");
      return;
    }
    if (typeof window.logVaultEvent === "function") {
      try {
        await window.logVaultEvent("chronology_incident_create", title, "ok", { category: category, status: status, thread_id: threadId || null });
      } catch (_e) {}
    }
    try {
      await window.supabaseClient
        .from("members")
        .update({ first_incident_created_at: new Date().toISOString(), workspace_initialized: true, onboarding_completed: true })
        .eq("id", window.currentUser.id)
        .is("first_incident_created_at", null);
    } catch (_e2) {}
    if (qs("cw-last-event-id")) qs("cw-last-event-id").value = ins.data.id;
    await renderWorkspace();
  }

  async function secureAttachEvidence(file, eventId, notes) {
    if (!eventId) throw new Error("Create incident first, then attach evidence.");
    if (typeof window.vaultValidateFileMeta === "function") {
      var metaErr = window.vaultValidateFileMeta(file);
      if (metaErr) throw new Error(metaErr);
    }
    if (typeof window.vaultValidateFileContent === "function") {
      var contentErr = await window.vaultValidateFileContent(file);
      if (contentErr) throw new Error(contentErr);
    }
    if (typeof window.requestVaultSignedUpload !== "function") throw new Error("Signed upload unavailable");
    var evRow = await window.supabaseClient
      .from("case_chronology_events")
      .select("id,event_type,incident_thread_id,importance,affidavit_relevant")
      .eq("id", eventId)
      .eq("user_id", window.currentUser.id)
      .single();
    if (evRow.error || !evRow.data) throw new Error("Incident not found.");

    // Resolve chronology event_type -> canonical vault storage category.
    // Never pass raw event_type to vault-signed-url: storage RLS path policy
    // and the edge function only accept the values in VAULT_ALLOWED_CATEGORIES.
    var vaultCategory;
    if (typeof window.mapEventTypeToVaultCategory === "function") {
      vaultCategory = window.mapEventTypeToVaultCategory(evRow.data.event_type);
    } else {
      console.warn("[case-workspace] mapEventTypeToVaultCategory unavailable; defaulting to 'evidence'");
      vaultCategory = "evidence";
    }

    var signed = await window.requestVaultSignedUpload(file, vaultCategory);
    var uploadUrl = signed.signed && signed.signed.signedUrl;
    if (!uploadUrl) throw new Error("Invalid upload signature.");
    var putRes;
    try {
      putRes = await fetch(uploadUrl, {
        method: "PUT",
        headers: { "Content-Type": file.type || "application/octet-stream", "x-upsert": "false" },
        body: file,
      });
    } catch (_err) {
      throw new Error("Upload interrupted. Check connection and try again.");
    }
    if (!putRes.ok) {
      if (putRes.status === 401 || putRes.status === 403) throw new Error("Upload URL expired. Please retry.");
      throw new Error("Upload failed (" + putRes.status + ").");
    }

    var duplicateCheck = await window.supabaseClient
      .from("vault_items")
      .select("id")
      .eq("user_id", window.currentUser.id)
      .eq("chronology_event_id", eventId)
      .contains("payload", { name: file.name, size: file.size })
      .is("deleted_at", null)
      .limit(1);
    if (!duplicateCheck.error && duplicateCheck.data && duplicateCheck.data.length) {
      throw new Error("This evidence appears to already be attached to the incident.");
    }

    var ins = await window.supabaseClient.from("vault_items").insert({
      user_id: window.currentUser.id,
      type: "file",
      category: vaultCategory,
      notes: notes || null,
      tags: [],
      chronology_event_id: eventId,
      incident_thread_id: evRow.data.incident_thread_id || null,
      timeline_visible: true,
      importance: evRow.data.importance || "normal",
      affidavit_relevant: !!evRow.data.affidavit_relevant,
      evidence_type: "file",
      sensitivity_level: "sensitive",
      payload: {
        name: file.name,
        size: file.size,
        mimeType: file.type || "",
        uploadedAt: new Date().toISOString(),
        storageBucket: "casepath-vault",
        objectPath: signed.object_path,
      },
      created_from_device: detectDevice(),
      created_from_platform: detectPlatform(),
    });
    if (ins.error) throw ins.error;
    if (typeof window.logVaultEvent === "function") {
      try {
        await window.logVaultEvent("evidence_attachment_create", file.name || "file", "ok", {
          chronology_event_id: eventId,
          incident_thread_id: evRow.data.incident_thread_id || null,
          object_path: signed.object_path,
        });
      } catch (_e) {}
    }
  }

  function bindUpload() {
    var modal = qs("cw-upload-modal");
    var openBtns = [qs("cw-upload-btn"), qs("cw-mobile-upload"), qs("cw-fab-add")].filter(Boolean);
    var closeBtn = qs("cw-upload-close");
    var pickBtn = qs("cw-upload-pick");
    var camBtn = qs("cw-upload-camera");
    var picker = qs("cw-upload-input");
    var status = qs("cw-upload-status");
    if (!picker) return;

    function open() {
      if (modal) modal.style.display = "flex";
      if (status) status.textContent = "";
    }
    function close() {
      if (modal) modal.style.display = "none";
    }
    openBtns.forEach(function (b) { b.onclick = open; });
    if (closeBtn) closeBtn.onclick = close;
    if (modal) modal.onclick = function (e) { if (e.target === modal) close(); };
    if (pickBtn) pickBtn.onclick = function () { picker.removeAttribute("capture"); picker.click(); };
    if (camBtn) camBtn.onclick = function () { picker.setAttribute("capture", "environment"); picker.click(); };

    picker.onchange = function (e) {
      var file = e.target.files && e.target.files[0];
      e.target.value = "";
      if (!file) return;
      var eventId = String((qs("cw-upload-link-event") && qs("cw-upload-link-event").value) || (qs("cw-last-event-id") && qs("cw-last-event-id").value) || "").trim();
      var notes = String((qs("cw-upload-notes") && qs("cw-upload-notes").value) || "").trim();
      if (status) status.textContent = "Attaching evidence...";
      void secureAttachEvidence(file, eventId, notes)
        .then(function () {
          if (status) status.textContent = "Evidence attached to incident.";
          return renderWorkspace();
        })
        .catch(function (err) {
          if (status) status.textContent = err && err.message ? err.message : "Attachment failed";
        });
    };
  }

  async function exportBundle() {
    if (!authed()) return;
    var statusFilter = String((qs("cw-export-status-filter") && qs("cw-export-status-filter").value) || "").toLowerCase();
    var threadFilter = String((qs("cw-export-thread-filter") && qs("cw-export-thread-filter").value) || "");
    var categoryFilter = String((qs("cw-export-category-filter") && qs("cw-export-category-filter").value) || "").toLowerCase();
    var visibilityFilter = String((qs("cw-export-visibility-filter") && qs("cw-export-visibility-filter").value) || "").toLowerCase();
    var affidavitFilter = String((qs("cw-export-affidavit-filter") && qs("cw-export-affidavit-filter").value) || "").toLowerCase();
    var events = await fetchChronologyEvents();
    events = events.filter(function (ev) {
      if (statusFilter && String(ev.event_status || "").toLowerCase() !== statusFilter) return false;
      if (threadFilter && String(ev.incident_thread_id || "") !== threadFilter) return false;
      if (categoryFilter && String(ev.event_type || "").toLowerCase() !== categoryFilter) return false;
      if (visibilityFilter && String(ev.visibility || "").toLowerCase() !== visibilityFilter) return false;
      if (affidavitFilter === "true" && !ev.affidavit_relevant) return false;
      if (affidavitFilter === "false" && !!ev.affidavit_relevant) return false;
      return true;
    });
    var evidence = await fetchEvidence();
    if (threadFilter) {
      evidence = evidence.filter(function (it) {
        return String(it.incident_thread_id || "") === threadFilter;
      });
    }
    var threads = await fetchThreads();
    if (threadFilter) {
      threads = threads.filter(function (t) { return String(t.id) === threadFilter; });
    }
    var orphanedEvidence = evidence.filter(function (e) {
      return e.chronology_event_id && !events.some(function (ev) { return ev.id === e.chronology_event_id; });
    });
    var eventsByThread = {};
    events.forEach(function (ev) {
      var k = ev.incident_thread_id || "unthreaded";
      if (!eventsByThread[k]) eventsByThread[k] = [];
      eventsByThread[k].push(ev.id);
    });
    var evidenceByEvent = {};
    evidence.forEach(function (it) {
      var k = it.chronology_event_id || "unlinked";
      if (!evidenceByEvent[k]) evidenceByEvent[k] = [];
      evidenceByEvent[k].push(it.id);
    });
    var data = {
      exported_at: new Date().toISOString(),
      bundle_type: "case_chronology_bundle",
      thread_count: threads.length,
      event_count: events.length,
      evidence_count: evidence.length,
      filters: {
        event_status: statusFilter || null,
        incident_thread_id: threadFilter || null,
        category: categoryFilter || null,
        visibility: visibilityFilter || null,
        affidavit_relevant: affidavitFilter || null,
      },
      threads: threads,
      chronology_events: events,
      evidence: evidence,
      linkage: {
        events_by_thread: eventsByThread,
        evidence_by_event: evidenceByEvent,
      },
      integrity: {
        orphaned_evidence_count: orphanedEvidence.length,
        orphaned_evidence_ids: orphanedEvidence.map(function (e) { return e.id; }),
      },
    };
    var blob = new Blob([JSON.stringify(data, null, 2)], { type: "application/json" });
    var url = URL.createObjectURL(blob);
    var a = document.createElement("a");
    a.href = url;
    a.download = "case-chronology-export.json";
    document.body.appendChild(a);
    a.click();
    a.remove();
    URL.revokeObjectURL(url);
    if (typeof window.logVaultEvent === "function") {
      try {
        await window.logVaultEvent("chronology_export_create", "case-chronology-export.json", "ok", {
          event_count: events.length,
          evidence_count: evidence.length,
          thread_count: threads.length,
        });
      } catch (_e) {}
    }
  }

  function bindCategoryButtons() {
    document.querySelectorAll("[data-cw-category]").forEach(function (btn) {
      btn.onclick = function () {
        document.querySelectorAll("[data-cw-category]").forEach(function (b) { b.classList.remove("active"); });
        btn.classList.add("active");
        var v = String(btn.getAttribute("data-cw-category") || "");
        if (qs("cw-category-filter")) qs("cw-category-filter").value = v === "chronology" ? "" : v;
        void renderWorkspace();
      };
    });
  }

  function init() {
    if (!qs("case-workspace-root")) return;
    if (qs("cw-search")) qs("cw-search").addEventListener("input", function () { void renderWorkspace(); });
    if (qs("cw-category-filter")) qs("cw-category-filter").addEventListener("change", function () { void renderWorkspace(); });
    if (qs("cw-status-filter")) qs("cw-status-filter").addEventListener("change", function () { void renderWorkspace(); });
    if (qs("cw-group-by")) qs("cw-group-by").addEventListener("change", function () { void renderWorkspace(); });
    if (qs("cw-thread-filter")) {
      qs("cw-thread-filter").addEventListener("change", function () {
        activeThreadFilter = qs("cw-thread-filter").value || "";
        void renderWorkspace();
      });
    }
    if (qs("cw-add-event-btn")) qs("cw-add-event-btn").onclick = function () { void addIncident(); };
    if (qs("cw-export-btn")) qs("cw-export-btn").onclick = function () { void exportBundle(); };
    bindCategoryButtons();
    bindUpload();
    void renderWorkspace();
  }

  window.caseWorkspaceRefresh = renderWorkspace;
  document.addEventListener("DOMContentLoaded", init);
})();
