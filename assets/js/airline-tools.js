/* Airline tools: small shared helper loaded by the hub, every tool and every course.

   1. Header counts. The "N tools · M courses" pill is counted from the hub page itself
      (one card per tool, one per course), so adding a card to airlinetools.html is the only
      thing needed to keep every page right. The number written in each page's HTML is only
      a fallback for when this script can't run.
   2. Breadcrumb. A tool page without a breadcrumb gets "Airline tools · <group>" at the top
      of its intro, using the group its card sits in on the hub.

   No dependencies. Fails silently: if the hub can't be fetched, pages keep their static text. */
(function () {
  "use strict";
  var HUB = "/airlinetools.html";
  var KEY = "at-hub-v2";

  function readHub(doc) {
    var info = { tools: 0, courses: 0, areas: {} };
    var tools = doc.querySelectorAll("a.tool");
    info.tools = tools.length;
    info.courses = doc.querySelectorAll("a.course").length;
    for (var i = 0; i < tools.length; i++) {
      var a = tools[i], area = a.closest(".area"), h = area && area.querySelector(".area-h");
      var href = (a.getAttribute("href") || "").replace(/^\.?\//, "/");
      if (h) info.areas[href] = h.textContent.replace(/\s+/g, " ").trim();
    }
    return info;
  }

  function setCounts(info) {
    if (!info.tools) return;
    var pills = document.querySelectorAll(".at-pill, [data-at-count]");
    for (var i = 0; i < pills.length; i++) {
      var b = pills[i].querySelectorAll("b");
      if (b.length >= 2) { b[0].textContent = info.tools; b[1].textContent = info.courses; }
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
    a.href = HUB; a.textContent = "Airline tools";
    div.appendChild(a);
    div.appendChild(document.createTextNode(" · " + area));
    intro.insertBefore(div, intro.firstChild);
  }

  function apply(info) { setCounts(info); addCrumb(info); }

  function run() {
    if (document.querySelector("a.tool")) { apply(readHub(document)); return; } // on the hub itself
    var cached = null;
    try { cached = JSON.parse(sessionStorage.getItem(KEY)); } catch (e) {}
    if (cached && cached.tools) apply(cached);
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
