/* Airline Economics (/airlinetools.html): small shared helper loaded by the hub, every tool and every course.

   1. Header counts. The "N tools · M courses" pill in the hub's header is counted from the hub
      itself (one card per tool, one per course), so adding a card is the only thing needed to keep
      it right. It ships hidden with no number in the HTML and only appears once the count is known.
      (Tool and course pages no longer show the pill; the code still fills one if a page has it.)
   2. Breadcrumb. A tool page without a breadcrumb gets "Airline Economics · <topic>" at the top
      of its intro, using the topic section (data-area) its card sits in on the hub.
   3. On the hub, each course card shows how many tools follow it in its topic.
   4. Usage events for Google Analytics (the gtag snippet is on every page). Only page and control
      names are sent, never values typed or picked:
        select_content    a link to another tool or course is clicked: content_type (tool / course / hub / page),
                          content_id (the page opened), link_location (hub_card / try_it / header /
                          breadcrumb / text), from_page
        tool_interaction  the first time each control on a page is used: tool, control
        file_download     a CSV download button is clicked: tool, file_extension
        share             an element marked data-at-share is clicked (for a future "copy link to this
                          scenario" button): item_id = the page
      To see tool, control, link_location and from_page in GA4 reports, register them once as
      event-scoped custom dimensions (Admin → Custom definitions).

   No dependencies. Fails silently: if the hub can't be fetched, the pill stays hidden. */
(function () {
  "use strict";
  var HUB = "/airlinetools.html";
  var KEY = "at-hub-v3";

  function readHub(doc) {
    var info = { tools: 0, courses: 0, areas: {} };
    var tools = doc.querySelectorAll("a.tool");
    info.tools = tools.length;
    info.courses = doc.querySelectorAll("a.course").length;
    for (var i = 0; i < tools.length; i++) {
      var a = tools[i], topic = a.closest("[data-area]");
      var href = (a.getAttribute("href") || "").replace(/^\.?\//, "/");
      if (topic) info.areas[href] = topic.getAttribute("data-area");
    }
    return info;
  }

  function setCounts(info) {
    if (!info.tools) return;
    var pills = document.querySelectorAll(".at-pill, [data-at-count]");
    for (var i = 0; i < pills.length; i++) {
      var b = pills[i].querySelectorAll("b");
      if (b.length >= 2) { b[0].textContent = info.tools; b[1].textContent = info.courses; pills[i].style.display = ""; }
    }
  }

  function addCrumb(info) {
    if (document.querySelector(".crumbs")) return;
    var intro = document.querySelector(".content > .intro");
    var area = info.areas[location.pathname];
    if (!intro || !area) return;
    var div = document.createElement("div");
    div.className = "crumbs";
    var a = document.createElement("a");
    a.href = HUB; a.textContent = "Airline Economics";
    div.appendChild(a);
    div.appendChild(document.createTextNode(" · " + area));
    intro.insertBefore(div, intro.firstChild);
  }

  function countTopicTools() {
    var slots = document.querySelectorAll(".course.lead [data-tools]");
    for (var i = 0; i < slots.length; i++) {
      var row = slots[i].closest(".area-row");
      var n = row ? row.querySelectorAll("a.tool").length : 0;
      if (!n) continue;
      var b = document.createElement("b");
      b.textContent = n;
      slots[i].textContent = "";
      slots[i].appendChild(b);
      slots[i].appendChild(document.createTextNode(n === 1 ? "tool" : "tools"));
    }
  }

  // ── 4. usage events ──
  var PAGE = location.pathname.replace(/^\//, "").replace(/\.html$/, "") || "index";
  var COURSE = /^(?:rm|np|loyalty|cargo|commercial|or|impact)\d{3}$/;
  var known = {}; // pages listed as tools on the hub, filled once the hub has been read

  function track(name, params) {
    try { if (typeof window.gtag === "function") window.gtag("event", name, params); } catch (e) {}
  }
  function kindOf(page) {
    if (COURSE.test(page)) return "course";
    if (page === "airlinetools") return "hub";
    return known["/" + page + ".html"] ? "tool" : "page";
  }
  function whereIs(a) {
    if (a.matches("a.tool, a.course")) return "hub_card";
    if (a.closest(".try-it")) return "try_it";
    if (a.closest(".crumbs, .crs-back")) return "breadcrumb";
    if (a.closest(".at-hdr, .hdr, header")) return "header";
    return "text";
  }
  function controlName(el) {
    var n = el.id || el.getAttribute("name") || el.getAttribute("aria-label") || el.getAttribute("data-tab") ||
            (el.textContent || "").replace(/\s+/g, " ").trim();
    return (n || el.tagName.toLowerCase()).slice(0, 60);
  }
  var used = {};
  function onUse(el) {
    if (document.querySelector("a.tool")) return;                  // the hub has links, not controls
    if (el.closest(".at-hdr, .hdr, nav, .crumbs")) return;
    var name = controlName(el);
    if (!used[name]) { used[name] = true; track("tool_interaction", { tool: PAGE, control: name }); }
    if (/csv|download/i.test(name + " " + (el.textContent || ""))) track("file_download", { tool: PAGE, file_extension: "csv" });
  }
  function listen() {
    document.addEventListener("click", function (e) {
      var t = e.target;
      if (!t || !t.closest) return;
      var share = t.closest("[data-at-share]");
      if (share) track("share", { method: "copy_link", content_type: "scenario", item_id: PAGE });
      var a = t.closest("a[href]");
      if (a) {
        var m = /^(?:https?:\/\/(?:www\.)?gregoiremaillard\.com)?\/?([A-Za-z0-9_-]+)\.html(?:[?#].*)?$/.exec(a.getAttribute("href") || "");
        if (m && m[1] !== PAGE && m[1] !== "index") {
          track("select_content", { content_type: kindOf(m[1]), content_id: m[1], link_location: whereIs(a), from_page: PAGE });
        }
        return;
      }
      var b = t.closest("button, [role=tab], [role=button]");
      if (b && !share) onUse(b);
    }, true);
    document.addEventListener("change", function (e) {
      var el = e.target;
      if (el && el.closest && el.matches("input, select, textarea")) onUse(el);
    }, true);
  }

  function apply(info) { setCounts(info); addCrumb(info); known = info.areas || known; }

  function run() {
    listen();
    if (document.querySelector("a.tool")) { apply(readHub(document)); countTopicTools(); return; } // on the hub itself
    var cached = null;
    try { cached = JSON.parse(sessionStorage.getItem(KEY)); } catch (e) {}
    if (cached && cached.tools) apply(cached);
    if (!document.querySelector(".at-pill, [data-at-count], .content > .intro")) return; // nothing here needs the hub
    if (!window.fetch || !window.DOMParser) return;
    fetch(HUB, { cache: "no-cache" })
      .then(function (r) { if (!r.ok) throw new Error(r.status); return r.text(); })
      .then(function (text) {
        var info = readHub(new DOMParser().parseFromString(text, "text/html"));
        if (!info.tools) return;
        try { sessionStorage.setItem(KEY, JSON.stringify(info)); } catch (e) {}
        apply(info);
      })
      .catch(function () {});
  }

  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", run);
  else run();
})();
