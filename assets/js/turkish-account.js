/* © 2026 Grégoire Maillard. All rights reserved. Not open source: see /LICENSE.txt */
/* Turkish A1 → C2: online profiles (TRK.account). Loaded after turkish.js on every page of the section.

   Without an account nothing changes: progress lives in this browser (turkish.js, store section 8).
   With one, the same three progress parts (course, cards, settings) are also kept in one Supabase row
   per learner (table public.profiles), so they follow the learner to other devices.

     - Sign-in: email + password (the email is confirmed once, when the profile is created), or a
       one-time link sent by email (Supabase "magic link"). "Forgot password?" emails a link that
       opens a "choose a new password" box; magic-link users can set a password the same way.
     - Sync: on load, when the page comes back into view, and a few seconds after each change.
       Each part is compared with what was last synced on this device: whichever side changed wins,
       and when both changed the two are merged (lessons, units, mistakes, flashcards and XP days are
       merged entry by entry). The row's "rev" number stops two devices from overwriting each other.
     - The Supabase library (~50 kB) is only downloaded when someone is signed in, is signing in, or opens
       My Profile, so visitors without an account don't pay for it.

   The publishable key below is meant to be public: the table's row-level security policies are what
   keep each learner's row private. Never put the secret (sb_secret_…) key here. */
(function () {
  "use strict";
  var T = window.TRK;
  if (!T) return;

  var CFG = {
    url: "https://xmbwayxoqlvhqenmiyzr.supabase.co",
    key: "sb_publishable_Xz3OM6yw0acx58SKoVFFaQ_iuQXWIxm",
    lib: "https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2.117.3/dist/umd/supabase.js",
    table: "profiles",
    page: "/turkish.html",
    pushDelay: 4000
  };
  var TOKEN_KEY = "sb-" + CFG.url.replace(/^https:\/\//, "").split(".")[0] + "-auth-token";
  var SYNC_KEY = "trk:v1:sync";
  var store = T.store;


  var A = {
    status: "off",        // off (not loaded) · loading · signed-out · signed-in · unavailable
    user: null,           // { id, email }
    profile: null,        // { display_name }
    sync: "idle",         // idle · syncing · saved · offline · error
    syncedAt: null,
    error: null,          // a message for the profile page
    sentTo: null,         // the email a sign-in link was just sent to
    sentKind: null,       // link · confirm · reset: which email was sent
    recovering: false     // signed in from a "reset password" link: ask for a new password
  };
  var client = null, libPromise = null, subs = [], applying = false, pushTimer = null, chain = Promise.resolve();

  function emit() { try { paintTab(); } catch (e) {} subs.slice().forEach(function (fn) { try { fn(A); } catch (e) { setTimeout(function () { throw e; }); } }); }
  function ls(fn) { try { return fn(window.localStorage); } catch (e) { return null; } }
  function hasToken() { return !!ls(function (s) { return s.getItem(TOKEN_KEY); }); }
  function urlHasAuth() { return /(?:^#|&)(?:access_token|error_description|error_code)=/.test(location.hash); }
  function marker() { var m = ls(function (s) { return JSON.parse(s.getItem(SYNC_KEY) || "null"); }); return m && typeof m === "object" ? m : null; }
  function setMarker(m) { ls(function (s) { if (m) s.setItem(SYNC_KEY, JSON.stringify(m)); else s.removeItem(SYNC_KEY); }); }

  // Level characters (64×64, drawn for this course). Each one is unlocked by certifying its level, except Tekir,
  // the starter every signed-in learner has from the first day (shown until another one is picked; never stored).
  var START = "tekir";
  var AVATARS = [
    { id: "tekir", cefr: "Start", name: "Tekir", blurb: "The Istanbul street cat who walks with you from day one",
      art: "<circle cx='32' cy='32' r='32' fill='#efe7da'/><path d='M13 64c1-12 8-20 19-20s18 8 19 20z' fill='#df8f3f'/><path d='M26 64c0-8 3-14 6-14s6 6 6 14z' fill='#fbefe0'/><path d='M18 25l1-14 11 8zM46 25l-1-14-11 8z' fill='#e39a4b'/><path d='M20.5 21l.7-6.5 5 3.8zM43.5 21l-.7-6.5-5 3.8z' fill='#f4b6b0'/><ellipse cx='32' cy='31' rx='16' ry='14.5' fill='#e9a256'/><path d='M28 18.5q4 3 8 0M32 17v6M27 21.5l2 2.5M37 21.5l-2 2.5M16.5 30l4 1M16.5 34l4 0M47.5 30l-4 1M47.5 34l-4 0' stroke='#b2662a' stroke-width='1.5' fill='none' stroke-linecap='round'/><ellipse cx='32' cy='37.5' rx='7' ry='5' fill='#fbefe0'/><ellipse cx='26' cy='30' rx='2.6' ry='3' fill='#4a7a34'/><ellipse cx='38' cy='30' rx='2.6' ry='3' fill='#4a7a34'/><ellipse cx='26' cy='30.3' rx='1' ry='2.3' fill='#1f2a1a'/><ellipse cx='38' cy='30.3' rx='1' ry='2.3' fill='#1f2a1a'/><circle cx='26.8' cy='29' r='.7' fill='#fff'/><circle cx='38.8' cy='29' r='.7' fill='#fff'/><path d='M30.4 35h3.2l-1.6 1.9z' fill='#e07a7a'/><path d='M32 36.9q-1.6 2.2-3.4 1.1M32 36.9q1.6 2.2 3.4 1.1' stroke='#8a4a20' stroke-width='1.1' fill='none' stroke-linecap='round'/><path d='M24 37.5l-8-1.5M24 39l-8 1.5M40 37.5l8-1.5M40 39l8 1.5' stroke='#fff' stroke-width='.8' stroke-linecap='round' opacity='.9'/>" },
    { id: "a1", cefr: "A1", name: "Hoca'nın Eşeği", blurb: "Nasreddin Hoca's donkey: slow, stubborn, and always gets there in the end",
      art: "<circle cx='32' cy='32' r='32' fill='#f3e7cf'/><path d='M12 64c1-11 9-18 20-18s19 7 20 18z' fill='#8f8a93'/><path d='M23 22C17 13 15 5 18 3c4-1 8 9 9.5 17zM41 22c6-9 8-17 5-19-4-1-8 9-9.5 17z' fill='#8f8a93'/><path d='M22.5 18.5c-2.5-5-3.5-10-2.4-12 1.8.3 4 6 5.2 11zM41.5 18.5c2.5-5 3.5-10 2.4-12-1.8.3-4 6-5.2 11z' fill='#e6bfbf'/><ellipse cx='32' cy='30' rx='12' ry='14' fill='#9c97a1'/><path d='M27 18.5c1-3.5 3-5 5-5s4 1.5 5 5c-1.6-1-3.2-1.2-5 0-1.8-1.2-3.4-1-5 0z' fill='#4a4550'/><ellipse cx='32' cy='40' rx='9.5' ry='7.5' fill='#ded6cc'/><ellipse cx='28.6' cy='39.6' rx='1.2' ry='1.7' fill='#6b6370'/><ellipse cx='35.4' cy='39.6' rx='1.2' ry='1.7' fill='#6b6370'/><path d='M28.5 44q3.5 1.8 7 0' stroke='#6b6370' stroke-width='1.2' fill='none' stroke-linecap='round'/><circle cx='26.5' cy='29' r='2.3' fill='#2a2730'/><circle cx='37.5' cy='29' r='2.3' fill='#2a2730'/><circle cx='27.3' cy='28.2' r='.8' fill='#fff'/><circle cx='38.3' cy='28.2' r='.8' fill='#fff'/><circle cx='23.5' cy='34' r='1.8' fill='#f4b6b0' opacity='.7'/><circle cx='40.5' cy='34' r='1.8' fill='#f4b6b0' opacity='.7'/><path d='M20.5 50.5q11.5 6 23 0' stroke='#c4362f' stroke-width='1.6' fill='none' stroke-linecap='round'/><circle cx='32' cy='54' r='4' fill='#1f5fb4'/><circle cx='32' cy='54' r='2.7' fill='#fff'/><circle cx='32' cy='54' r='1.7' fill='#6fb3e8'/><circle cx='32' cy='54' r='.8' fill='#13233a'/>" },
    { id: "a2", cefr: "A2", name: "Keloğlan", blurb: "The clever bald boy of the folk tales",
      art: "<circle cx=\"32\" cy=\"32\" r=\"32\" fill=\"#f6e2bf\"/><path d=\"M12 64c1-11 9-18 20-18s19 7 20 18z\" fill=\"#f4f1ea\"/><path d=\"M12 64c1-10 6-16 13-17l3 17zM52 64c-1-10-6-16-13-17l-3 17z\" fill=\"#c4362f\"/><path d=\"M27 46h10v4c0 2-2 3-5 3s-5-1-5-3z\" fill=\"#e9b78f\"/><ellipse cx=\"15.5\" cy=\"31\" rx=\"3.5\" ry=\"5\" fill=\"#e9b78f\"/><ellipse cx=\"48.5\" cy=\"31\" rx=\"3.5\" ry=\"5\" fill=\"#e9b78f\"/><ellipse cx=\"32\" cy=\"29\" rx=\"16\" ry=\"18\" fill=\"#f2c9a1\"/><ellipse cx=\"27\" cy=\"16\" rx=\"6\" ry=\"3\" fill=\"#fff\" opacity=\".45\"/><path d=\"M23 25.5q3-2 6 0M35 25.5q3-2 6 0\" stroke=\"#5a3a24\" stroke-width=\"1.4\" fill=\"none\" stroke-linecap=\"round\"/><circle cx=\"26\" cy=\"30\" r=\"1.9\" fill=\"#3b2a1e\"/><circle cx=\"38\" cy=\"30\" r=\"1.9\" fill=\"#3b2a1e\"/><path d=\"M31 33q1 2.5 2 0\" stroke=\"#c98d68\" stroke-width=\"1.3\" fill=\"none\" stroke-linecap=\"round\"/><path d=\"M26 38q6 5 12 0\" stroke=\"#7a3b26\" stroke-width=\"1.6\" fill=\"none\" stroke-linecap=\"round\"/><circle cx=\"21.5\" cy=\"35\" r=\"2.6\" fill=\"#ec9c8a\" opacity=\".6\"/><circle cx=\"42.5\" cy=\"35\" r=\"2.6\" fill=\"#ec9c8a\" opacity=\".6\"/>" },
    { id: "b1", cefr: "B1", name: "Nasreddin Hoca", blurb: "The wise fool of a thousand jokes",
      art: "<circle cx=\"32\" cy=\"32\" r=\"32\" fill=\"#dcebd3\"/><path d=\"M10 64c1-12 10-20 22-20s21 8 22 20z\" fill=\"#3f7a52\"/><path d=\"M27 46l5 18 5-18z\" fill=\"#e9e1cf\"/><ellipse cx=\"32\" cy=\"34\" rx=\"12\" ry=\"13\" fill=\"#e7b48e\"/><path d=\"M20 35c0 11 5 20 12 20s12-9 12-20c-2 4-6 6-12 6s-10-2-12-6z\" fill=\"#f7f5f0\"/><path d=\"M25 41q7-4 14 0q-7 3-14 0z\" fill=\"#ebe6dc\"/><path d=\"M14 24c0-9 8-15 18-15s18 6 18 15c0 4-3 6-6 6H20c-3 0-6-2-6-6z\" fill=\"#fbfaf6\"/><path d=\"M17 21c4 3 9 4 15 4s11-1 15-4M15.5 26c5 2 10 3 16.5 3s11.5-1 16.5-3\" stroke=\"#d9d3c5\" stroke-width=\"1.4\" fill=\"none\"/><path d=\"M27 9.5c0-3 2.2-5 5-5s5 2 5 5c-1.5.5-3.2.8-5 .8s-3.5-.3-5-.8z\" fill=\"#3f7a52\"/><path d=\"M24.5 35q2.5-2 5 0M34.5 35q2.5-2 5 0\" stroke=\"#3b2a1e\" stroke-width=\"1.6\" fill=\"none\" stroke-linecap=\"round\"/><path d=\"M24 31.5q2.5-1.5 5 0M35 31.5q2.5-1.5 5 0\" stroke=\"#f1eee6\" stroke-width=\"1.6\" fill=\"none\" stroke-linecap=\"round\"/><path d=\"M30 39q2 1.5 4 0\" stroke=\"#c98d68\" stroke-width=\"1.4\" fill=\"none\" stroke-linecap=\"round\"/>" },
    { id: "b2", cefr: "B2", name: "Karagöz", blurb: "The everyman of the shadow theatre",
      art: "<circle cx=\"32\" cy=\"32\" r=\"32\" fill=\"#f5cf8c\"/><circle cx=\"32\" cy=\"32\" r=\"26\" fill=\"#f9dfa9\"/><path d=\"M14 64c2-10 9-15 18-15s16 5 18 15z\" fill=\"#2c6e8f\"/><path d=\"M26 49l6 15 6-15z\" fill=\"#e6c94e\"/><path d=\"M21 32c0-8 5-13 12-13 6 0 11 4 12 10l3 5c.6 1-.2 2-1.3 1.8L45 35c-.5 4-2 7-5 9H24c-2-3-3-7-3-12z\" fill=\"#d99b6c\"/><circle cx=\"30.5\" cy=\"42.5\" r=\"9\" fill=\"#1d1d1f\"/><path d=\"M40 41q2-1.5 4-.5\" stroke=\"#1d1d1f\" stroke-width=\"2\" fill=\"none\" stroke-linecap=\"round\"/><circle cx=\"38\" cy=\"28.5\" r=\"4.2\" fill=\"#fff\"/><circle cx=\"39.3\" cy=\"28.8\" r=\"2.2\" fill=\"#1d1d1f\"/><path d=\"M34 23.5q4-2.5 8 0\" stroke=\"#1d1d1f\" stroke-width=\"1.8\" fill=\"none\" stroke-linecap=\"round\"/><path d=\"M20 22c-1-8 3-15 10-17 4-1 6 1 6 3l-1 15c-5-2-10-2-15-1z\" fill=\"#c8312d\"/><path d=\"M19.5 22.5c5-1.5 11-1 16 1l-.5 3c-5-2-10-2.5-15-1z\" fill=\"#e6c94e\"/><path d=\"M33 6c4-2 8 0 9 4\" stroke=\"#c8312d\" stroke-width=\"3\" fill=\"none\" stroke-linecap=\"round\"/><circle cx=\"42.5\" cy=\"11\" r=\"2.4\" fill=\"#e6c94e\"/><circle cx=\"27\" cy=\"51\" r=\"1.6\" fill=\"#f9dfa9\"/>" },
    { id: "c1", cefr: "C1", name: "Köroğlu", blurb: "The bard and outlaw of the epics",
      art: "<circle cx=\"32\" cy=\"32\" r=\"32\" fill=\"#f2d6cf\"/><path d=\"M48 10l4 1-9 40-3-1z\" fill=\"#8a5a2b\"/><path d=\"M48.5 6l4.5 1.2-1 4.4-4.4-1.2z\" fill=\"#5b3a1c\"/><path d=\"M10 64c1-12 10-19 22-19s21 7 22 19z\" fill=\"#5a4636\"/><path d=\"M23 45l9 10 9-10z\" fill=\"#c23a2b\"/><path d=\"M38 52c4-3 10-3 13 1 3 4 1 10-4 11-6 1-11-3-11-7 0-2 .7-4 2-5z\" fill=\"#a9733e\"/><circle cx=\"44.5\" cy=\"57\" r=\"2\" fill=\"#5b3a1c\"/><ellipse cx=\"32\" cy=\"32\" rx=\"12\" ry=\"14\" fill=\"#d9a07a\"/><path d=\"M19 28c-1-9 5-16 13-16s14 7 13 16c-3-3-8-5-13-5s-10 2-13 5z\" fill=\"#2f2a26\"/><path d=\"M18 27c0-10 6-17 14-17s14 7 14 17c-2-5-7-8-14-8s-12 3-14 8z\" fill=\"#c23a2b\"/><path d=\"M20 22c3-2 7-3 12-3s9 1 12 3\" stroke=\"#e8b04a\" stroke-width=\"1.6\" fill=\"none\" stroke-dasharray=\"1.5 2\"/><path d=\"M44 21c3 1 5 4 4 8l-3-3z\" fill=\"#a52e22\"/><path d=\"M24.5 28.5h5M34.5 28.5h5\" stroke=\"#2f2a26\" stroke-width=\"2\" stroke-linecap=\"round\"/><circle cx=\"27\" cy=\"31.5\" r=\"1.7\" fill=\"#2f2a26\"/><circle cx=\"37\" cy=\"31.5\" r=\"1.7\" fill=\"#2f2a26\"/><path d=\"M32 33v4\" stroke=\"#b97e5c\" stroke-width=\"1.4\" stroke-linecap=\"round\"/><path d=\"M32 38.5c-3-1.5-7-1-10 2 2-.2 4 .1 5.5 1 2-.7 3.5-1.6 4.5-3zM32 38.5c3-1.5 7-1 10 2-2-.2-4 .1-5.5 1-2-.7-3.5-1.6-4.5-3z\" fill=\"#2f2a26\"/><path d=\"M29.5 43q2.5 1 5 0\" stroke=\"#8a4a36\" stroke-width=\"1.3\" fill=\"none\" stroke-linecap=\"round\"/>" },
    { id: "c2", cefr: "C2", name: "Atatürk", blurb: "Founder of the Republic and of the 1928 alphabet",
      art: "<circle cx=\"32\" cy=\"32\" r=\"32\" fill=\"#c8102e\"/><circle cx=\"32\" cy=\"32\" r=\"29\" fill=\"none\" stroke=\"#fff\" stroke-opacity=\".3\" stroke-width=\"1\"/><path d=\"M9 64c1-9 8-14 16-15.5h14C47 50 54 55 55 64z\" fill=\"#2a2c33\"/><path d=\"M25 48.5l7 9 7-9z\" fill=\"#f3f1ec\"/><path d=\"M30.6 51l1.4 1.6 1.4-1.6 1 11h-4.8z\" fill=\"#5a1d25\"/><path d=\"M25 48.5l-3 3.5 5.5 9 4.5-4zM39 48.5l3 3.5-5.5 9-4.5-4z\" fill=\"#1d1f24\"/><path d=\"M28.3 43h7.4v6.5c0 1.4-1.7 2.3-3.7 2.3s-3.7-.9-3.7-2.3z\" fill=\"#dcae8c\"/><ellipse cx=\"20.6\" cy=\"32.5\" rx=\"2.2\" ry=\"3.6\" fill=\"#e2b694\"/><ellipse cx=\"43.4\" cy=\"32.5\" rx=\"2.2\" ry=\"3.6\" fill=\"#e2b694\"/><path d=\"M20.4 24c0 13.5 4 22.5 11.6 22.5S43.6 37.5 43.6 24z\" fill=\"#ebc3a2\"/><path d=\"M23.2 36.5c.6 1.5 1.4 2.6 2.4 3.4M40.8 36.5c-.6 1.5-1.4 2.6-2.4 3.4\" stroke=\"#d8a785\" stroke-width=\".9\" fill=\"none\" stroke-linecap=\"round\"/><path d=\"M29.6 28.9c-1.9-1-3.9-1.5-6-1.5M34.4 28.9c1.9-1 3.9-1.5 6-1.5\" stroke=\"#4a3426\" stroke-width=\"1.4\" fill=\"none\" stroke-linecap=\"round\"/><path d=\"M24.4 31.4c1-1 3.6-1.1 5 0-1.4.9-3.8.9-5 0zM34.6 31.4c1.4-1.1 4-1 5 0-1.2.9-3.6.9-5 0z\" fill=\"#fff\"/><circle cx=\"27\" cy=\"31.3\" r=\"1.15\" fill=\"#3f86c9\"/><circle cx=\"37\" cy=\"31.3\" r=\"1.15\" fill=\"#3f86c9\"/><circle cx=\"27\" cy=\"31.3\" r=\".5\" fill=\"#1b2430\"/><circle cx=\"37\" cy=\"31.3\" r=\".5\" fill=\"#1b2430\"/><path d=\"M32.4 30v6.4c0 .6-.6 1.1-1.6 1.2\" stroke=\"#c48d6b\" stroke-width=\"1.2\" fill=\"none\" stroke-linecap=\"round\"/><path d=\"M29.2 41.4h5.6\" stroke=\"#a5624f\" stroke-width=\"1.2\" fill=\"none\" stroke-linecap=\"round\"/><path d=\"M19 24.2L18.2 10.4C25 7.4 39 7.4 45.8 10.4L45 24.2C37 22.8 27 22.8 19 24.2z\" fill=\"#38383d\"/><path d=\"M20.5 11.5q2 -1.6 4 0q2 -1.6 4 0q2 -1.6 4 0q2 -1.6 4 0q2 -1.6 4 0q2 -1.6 4 0M19.5 16q2 -1.6 4 0q2 -1.6 4 0q2 -1.6 4 0q2 -1.6 4 0q2 -1.6 4 0q2 -1.6 4 0q1.6 -1.3 3.2 0M20 20.5q2 -1.6 4 0q2 -1.6 4 0q2 -1.6 4 0q2 -1.6 4 0q2 -1.6 4 0q2 -1.6 4 0\" stroke=\"#4a4a50\" stroke-width=\"1\" fill=\"none\" stroke-linecap=\"round\"/>" }
  ];
  var AVATAR_KEY = "trk:v1:avatar", avSeq = 0;
  function byId(id) { for (var i = 0; i < AVATARS.length; i++) if (AVATARS[i].id === id) return AVATARS[i]; return null; }
  A.AVATARS = AVATARS;
  // The character's picture as an <svg>, clipped to a circle. size in px; label for screen readers (none: decorative).
  A.avatarSvg = function (id, size, label) {
    var a = byId(id);
    if (!a) return "";
    var c = "trk-av" + (++avSeq);
    return '<svg viewBox="0 0 64 64" width="' + size + '" height="' + size + '"' + (label ? ' role="img" aria-label="' + T.esc(label) + '"' : ' aria-hidden="true"') + ' style="display:block;flex:none">' +
      '<defs><clipPath id="' + c + '"><circle cx="32" cy="32" r="32"/></clipPath></defs><g clip-path="url(#' + c + ')">' + a.art + "</g></svg>";
  };
  A.START = START;
  A.avatar = function () { var v = ls(function (s) { return s.getItem(AVATAR_KEY); }); return byId(v) && v !== START ? v : A.user ? START : null; };
  function setLocalAvatar(id) { ls(function (s) { if (id) s.setItem(AVATAR_KEY, id); else s.removeItem(AVATAR_KEY); }); paintTab(); }
  // Which characters are unlocked: one per certified level (from A.summary()).
  A.unlocked = function (summary) {
    var out = {}; out[START] = true;
    summary.levels.forEach(function (l) { if (l.certified) out[l.id] = true; });
    return out;
  };
  // Picks a character (null: back to the initial). Saved in this browser, and in the profile when signed in.
  A.setAvatar = function (id) {
    if (id && !byId(id)) return Promise.reject(new Error("Unknown character."));
    if (id === START) id = null;   // the starter is the default: nothing to store
    setLocalAvatar(id || null);
    emit();
    if (!A.user || !client) return Promise.resolve();
    return client.from(CFG.table).update({ avatar: id || null }).eq("user_id", A.user.id).then(function (r) {
      if (r.error) throw new Error(/avatar/.test(r.error.message) ? "the profiles table has no avatar column yet (run the SQL update)" : r.error.message);
    });
  };
  // The header's My Profile tab shows the chosen character instead of the person icon.
  function paintTab() {
    var tab = document.getElementById("tab-profile");
    if (!tab) return;
    if (!document.getElementById("trk-av-css")) {
      var st = document.createElement("style");
      st.id = "trk-av-css";
      st.textContent = ".at-hdr .at-av{display:block;margin-right:8px;border-radius:50%;box-shadow:0 0 0 1px rgb(15 23 42 / .08)}.at-hdr .at-tab.has-av .at-gear{display:none!important}" +
        "@media (max-width:599px){.at-hdr .at-av{margin-right:0}}";
      document.head.appendChild(st);
    }
    var id = A.avatar(), old = tab.querySelector(".at-av");
    if (old) old.remove();
    tab.classList.toggle("has-av", !!id);
    if (id) {
      var span = document.createElement("span");
      span.className = "at-av";
      span.innerHTML = A.avatarSvg(id, 22);
      tab.insertBefore(span, tab.firstChild);
    }
  }
  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", paintTab); else paintTab();

  // A sign-in link that failed (expired or already used) comes back with #error_description=… in the URL.
  (function readLinkError() {
    if (!/(?:^#|&)error_description=/.test(location.hash)) return;
    var p = new URLSearchParams(location.hash.slice(1));
    var code = p.get("error_code") || "";
    A.error = code === "otp_expired" ? "That sign-in link has expired or was already used. Ask for a new one below."
      : "Signing in didn't work (" + (p.get("error_description") || "unknown error").replace(/\+/g, " ") + "). Ask for a new link below.";
    history.replaceState(null, "", CFG.page + "#profile");
  })();

  // ── loading the library and the client ──
  function loadLib() {
    if (window.supabase && window.supabase.createClient) return Promise.resolve();
    if (libPromise) return libPromise;
    libPromise = new Promise(function (resolve, reject) {
      var s = document.createElement("script");
      s.src = CFG.lib; s.async = true;
      s.onload = function () { window.supabase && window.supabase.createClient ? resolve() : reject(new Error("library missing")); };
      s.onerror = function () { reject(new Error("couldn't download the sign-in library")); };
      document.head.appendChild(s);
    });
    libPromise.catch(function () { libPromise = null; });
    return libPromise;
  }
  A.ensure = function () {
    if (client) return Promise.resolve(client);
    if (A.status === "off") { A.status = "loading"; emit(); }
    return loadLib().then(function () {
      if (client) return client;
      client = window.supabase.createClient(CFG.url, CFG.key, {
        auth: { flowType: "implicit", persistSession: true, autoRefreshToken: true, detectSessionInUrl: true }
      });
      client.auth.onAuthStateChange(function (event, session) {
        // Supabase asks not to call it again from inside this callback: defer the work.
        setTimeout(function () { onSession(event, session); }, 0);
      });
      return client;
    }).catch(function (e) {
      A.status = "unavailable"; A.error = "Online profiles can't be reached right now (" + e.message + "). Your progress is still saved in this browser.";
      emit();
      throw e;
    });
  };

  function onSession(event, session) {
    var before = A.user && A.user.id;
    if (session && session.user) {
      A.user = { id: session.user.id, email: session.user.email };
      A.status = "signed-in";
      if ((event === "SIGNED_IN" || event === "PASSWORD_RECOVERY") && /[?&]signin=1/.test(location.search)) history.replaceState(null, "", CFG.page + "#profile");
      if (event === "PASSWORD_RECOVERY") A.recovering = true;
      if (before !== A.user.id) { A.error = null; A.sentTo = null; emit(); A.syncNow(); }
      else emit();
    } else {
      A.user = null; A.profile = null; A.status = "signed-out"; A.sync = "idle";
      emit();
    }
  }

  // ── signing in and out ──
  A.signIn = function (email) {
    email = String(email || "").trim();
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) return Promise.reject(new Error("That doesn't look like an email address."));
    return A.ensure().then(function (c) {
      return c.auth.signInWithOtp({ email: email, options: { emailRedirectTo: location.origin + CFG.page + "?signin=1", shouldCreateUser: true } });
    }).then(function (r) {
      if (r.error) throw new Error(/rate limit/i.test(r.error.message) ? "Too many sign-in emails were sent in the last hour. Please try again a bit later." : r.error.message);
      A.sentTo = email; A.sentKind = "link"; A.error = null; emit();
    });
  };

  // ── email + password ──
  var MIN_PW = 8;
  function checkEmail(email) {
    email = String(email || "").trim();
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) throw new Error("That doesn't look like an email address.");
    return email;
  }
  function checkPw(pw) {
    pw = String(pw || "");
    if (pw.length < MIN_PW) throw new Error("Your password needs at least " + MIN_PW + " characters.");
    return pw;
  }
  function authError(e) {
    var m = (e && e.message) || "unknown error";
    if (/invalid login credentials/i.test(m)) return new Error("Wrong email or password. If you've only signed in with emailed links so far, use \u201cForgot password?\u201d to set one.");
    if (/email not confirmed/i.test(m)) return new Error("Confirm your email first: open the link we sent when you created your profile. Use \u201cForgot password?\u201d if you can't find it.");
    if (/rate limit/i.test(m)) return new Error("Too many emails were sent in the last hour. Please try again a bit later.");
    if (/same.*password|different from the old/i.test(m)) return new Error("Choose a password different from your current one.");
    return new Error(m);
  }
  function redirectTo() { return location.origin + CFG.page + "?signin=1"; }

  // Signs in straight away: no email, no link.
  A.signInPassword = function (email, pw) {
    try { email = checkEmail(email); if (!pw) throw new Error("Type your password."); } catch (e) { return Promise.reject(e); }
    return A.ensure().then(function (c) { return c.auth.signInWithPassword({ email: email, password: pw }); })
      .then(function (r) { if (r.error) throw authError(r.error); A.sentTo = null; A.error = null; });
  };
  // Creates the profile. With "Confirm email" on in Supabase, one confirmation email is sent;
  // after that, email + password is all it takes.
  A.signUp = function (email, pw) {
    try { email = checkEmail(email); pw = checkPw(pw); } catch (e) { return Promise.reject(e); }
    return A.ensure().then(function (c) {
      return c.auth.signUp({ email: email, password: pw, options: { emailRedirectTo: redirectTo() } });
    }).then(function (r) {
      if (r.error) {
        if (/already registered|already exists/i.test(r.error.message)) throw new Error("There's already a profile with this email. Sign in instead, or use \u201cForgot password?\u201d.");
        throw authError(r.error);
      }
      if (r.data && r.data.session) return;                       // email confirmation is off: already signed in
      var ids = r.data && r.data.user && r.data.user.identities;
      if (ids && !ids.length) throw new Error("There's already a profile with this email. Sign in instead, or use \u201cForgot password?\u201d.");
      A.sentTo = email; A.sentKind = "confirm"; A.error = null; emit();
    });
  };
  A.resetPassword = function (email) {
    try { email = checkEmail(email); } catch (e) { return Promise.reject(e); }
    return A.ensure().then(function (c) { return c.auth.resetPasswordForEmail(email, { redirectTo: redirectTo() }); })
      .then(function (r) { if (r.error) throw authError(r.error); A.sentTo = email; A.sentKind = "reset"; A.error = null; emit(); });
  };
  // Sets or changes the password of the signed-in learner (also after a reset link).
  A.setPassword = function (pw) {
    try { pw = checkPw(pw); } catch (e) { return Promise.reject(e); }
    if (!A.user) return Promise.reject(new Error("You're not signed in."));
    return client.auth.updateUser({ password: pw }).then(function (r) {
      if (r.error) throw authError(r.error);
      A.recovering = false; emit();
    });
  };
  // Signing out saves what's left to save, then clears this browser, so the next person starts fresh.
  A.signOut = function () {
    if (!client) return Promise.resolve();
    clearTimeout(pushTimer);
    return queue(push).catch(function () {}).then(function () { return client.auth.signOut(); }).then(function () {
      setMarker(null); setLocalAvatar(null);
      applying = true; try { store.reset(); } finally { applying = false; }
      A.syncedAt = null; A.recovering = false;
      emit();
    });
  };
  A.setName = function (name) {
    name = String(name || "").replace(/\s+/g, " ").trim().slice(0, 40);
    if (!name) return Promise.reject(new Error("Type a name first."));
    if (!A.user) return Promise.reject(new Error("You're not signed in."));
    return client.from(CFG.table).update({ display_name: name }).eq("user_id", A.user.id).select("display_name").then(function (r) {
      if (r.error) throw new Error(r.error.message);
      if (!r.data || !r.data.length) throw new Error("Your profile wasn't found. Reload the page and try again.");
      A.profile = A.profile || {}; A.profile.display_name = name; emit();
    });
  };
  // Deletes the sign-in, the profile and the online progress (the delete_my_account() function in Supabase).
  A.deleteAccount = function () {
    if (!A.user) return Promise.resolve();
    clearTimeout(pushTimer);
    return client.rpc("delete_my_account").then(function (r) {
      if (r.error) throw new Error(r.error.message);
      return client.auth.signOut({ scope: "local" });
    }).then(function () {
      setMarker(null); setLocalAvatar(null);
      applying = true; try { store.reset(); } finally { applying = false; }
      emit();
    });
  };

  // ── merging two copies of the progress ──
  function isObj(v) { return v !== null && typeof v === "object" && !Array.isArray(v); }
  function laterIso(a, b) { return !a ? b : !b ? a : (a > b ? a : b); }
  function emptyCourse(c) { return !c || (!Object.keys(c.lessons || {}).length && !Object.keys(c.units || {}).length && !(c.xp && c.xp.total)); }
  function emptyCards(c) { return !c || !Object.keys(c.cards || {}).length; }
  function maxDays(a, b) {
    var out = {};
    [a || {}, b || {}].forEach(function (d) { Object.keys(d).forEach(function (k) { out[k] = Math.max(out[k] || 0, d[k] || 0); }); });
    return out;
  }
  function mergeCourse(a, b, now) {
    var out = JSON.parse(JSON.stringify(a));
    Object.keys(b.lessons || {}).forEach(function (id) {
      var x = out.lessons[id], y = b.lessons[id];
      if (!x) { out.lessons[id] = y; return; }
      var m = { first: x.first < y.first ? x.first : y.first, last: laterIso(x.last, y.last), runs: Math.max(x.runs, y.runs), best: Math.max(x.best, y.best), xp: Math.max(x.xp, y.xp) };
      if (x.via === "test" && y.via === "test") m.via = "test";           // done for real on either side beats "tested out"
      out.lessons[id] = m;
    });
    Object.keys(b.units || {}).forEach(function (id) {
      var x = out.units[id] || {}, y = b.units[id], m = {};
      ["reviewed", "tested", "guide", "culture"].forEach(function (k) { var v = laterIso(x[k], y[k]); if (v) m[k] = v; });
      if (x.reviewBest != null || y.reviewBest != null) m.reviewBest = Math.max(x.reviewBest || 0, y.reviewBest || 0);
      out.units[id] = m;
    });
    Object.keys(b.mistakes || {}).forEach(function (id) {
      var x = out.mistakes[id], y = b.mistakes[id];
      if (!x || y.last > x.last) out.mistakes[id] = y;
    });
    // XP: start from the copy with more, and add what the other earned on days the first doesn't know about.
    var big = a.xp.total >= b.xp.total ? a.xp : b.xp, small = big === a.xp ? b.xp : a.xp, extra = 0;
    Object.keys(small.days || {}).forEach(function (d) { extra += Math.max(0, (small.days[d] || 0) - ((big.days || {})[d] || 0)); });
    out.xp = { total: big.total + extra, days: maxDays(a.xp.days, b.xp.days) };
    var sa = a.streak, sb = b.streak, newer = (sb.last || "") > (sa.last || "") ? sb : sa;
    out.streak = { current: newer.current, best: Math.max(sa.best, sb.best, newer.current), last: newer.last };
    out.updated = T.iso(now);
    return out;
  }
  function mergeCards(a, b, now) {
    var out = JSON.parse(JSON.stringify(a));
    Object.keys(b.cards || {}).forEach(function (k) {
      var x = out.cards[k], y = b.cards[k];
      if (!x || (y.last || 0) > (x.last || 0)) out.cards[k] = y;
    });
    Object.keys(b.days || {}).forEach(function (d) {
      var x = out.days[d] || {}, y = b.days[d], m = {};
      Object.keys(x).concat(Object.keys(y)).forEach(function (f) { m[f] = Math.max(x[f] || 0, y[f] || 0); });
      out.days[d] = m;
    });
    out.updated = T.iso(now);
    return out;
  }

  // ── what the profile page and the profiles row show ──
  // ix is the course index (T.data.index()); course and cards default to this browser's progress.
  A.summary = function (ix, course, cards, settings) {
    course = course || store.course(); cards = cards || store.cards(); settings = settings || store.settings();
    var f = T.path.flatten(ix), done = function (l) { return !!course.lessons[l.id]; };
    var ready = f.units.filter(function (u) { return u.status === "ready"; });
    var unitsDone = ready.filter(function (u) { return T.path.unitDone(ix, course, u.id); });
    var words = {}, known = {};
    Object.keys(cards.cards).forEach(function (k) {
      var s = cards.cards[k], id = k.split(":")[0];
      if (s.ivl > 0) words[id] = true;                 // graduated from learning at least once
      if (s.ivl >= T.C.SRS.mature) known[id] = true;   // reviewed at 21+ day intervals: known well
    });
    var levels = ix.levels.map(function (lv) {
      var total = lv.units.length, written = lv.units.filter(function (u) { return u.status === "ready"; }).length;
      var d = lv.units.filter(function (u) { return T.path.unitDone(ix, course, u.id); }).length;
      return { id: lv.id, cefr: lv.cefr, title: lv.title, total: total, written: written, done: d, certified: total > 0 && written === total && d === total };
    });
    var certified = null;
    for (var i = 0; i < levels.length && levels[i].certified; i++) certified = levels[i];
    var working = levels[certified ? levels.indexOf(certified) + 1 : 0] || null;
    var active = {};
    Object.keys(course.xp.days).forEach(function (d) { if (course.xp.days[d] > 0) active[d] = true; });
    Object.keys(cards.days).forEach(function (d) { var x = cards.days[d]; if ((x["new"] || 0) + (x.reviews || 0) > 0) active[d] = true; });
    var countRead = function (k) { return ready.filter(function (u) { return course.units[u.id] && course.units[u.id][k]; }).length; };
    return {
      xp: course.xp.total,
      lessons: { done: f.lessons.filter(done).length, written: f.lessons.length },
      units: { done: unitsDone.length, written: ready.length, all: f.units.length,
               mastered: ready.filter(function (u) { return course.units[u.id] && course.units[u.id].reviewed; }).length },
      words: { learned: Object.keys(words).length, known: Object.keys(known).length, total: (ix.flashcards && ix.flashcards.count) || 0 },
      guides: countRead("guide"), interludes: countRead("culture"),
      levels: levels, certified: certified, working: working,
      level: certified ? certified.cefr + " certified" : "Pre-A1",
      daysActive: Object.keys(active).length,
      streak: T.progress.streak(course, settings, Date.now()),
      goal: T.progress.goal(course, settings, Date.now())
    };
  };
  function columns(local) {
    return T.data.index().then(function (ix) {
      var s = A.summary(ix, local.course, local.cards, local.settings);
      return { xp: s.xp, lessons_done: s.lessons.done, words_learned: s.words.learned, level: s.level };
    }).catch(function () { return { xp: local.course.xp.total }; });
  }

  // ── syncing ──
  function queue(fn) { var p = chain.then(fn, fn); chain = p.catch(function () {}); return p; }
  function snapshot() { var d = store.exportData(Date.now()); return { course: d.course, cards: d.cards, settings: d.settings }; }
  function markFor(rev, parts) { return { user: A.user.id, rev: rev, course: parts.course.updated, cards: parts.cards.updated, settings: JSON.stringify(parts.settings) }; }
  function changedParts(local, m) {
    return {
      course: !m || local.course.updated !== m.course,
      cards: !m || local.cards.updated !== m.cards,
      settings: !m || JSON.stringify(local.settings) !== m.settings
    };
  }
  function apply(parts) {
    var cur = snapshot();
    if (JSON.stringify(cur) === JSON.stringify(parts)) return true;
    applying = true;
    try {
      var r = store.importData({ app: T.C.APP, schema: 1, exported: T.iso(Date.now()), course: parts.course, cards: parts.cards, settings: parts.settings });
      return r.ok;
    } finally { applying = false; }
  }
  function fail(e) {
    A.sync = navigator.onLine === false || /fetch|network/i.test(String(e && e.message)) ? "offline" : "error";
    A.error = A.sync === "error" ? "Your progress couldn't be saved online (" + (e && e.message || "unknown error") + "). It's safe in this browser; we'll try again." : null;
    emit();
  }

  // Full sync: read the row, decide part by part, write back what's needed. Retries once on a conflict.
  function fullSync(attempt) {
    if (!A.user || !client) return Promise.resolve();
    A.sync = "syncing"; emit();
    var uid = A.user.id;
    return client.from(CFG.table).select("*").eq("user_id", uid).maybeSingle().then(function (r) {
      if (r.error) throw new Error(r.error.message);
      if (!A.user || A.user.id !== uid) return;
      var row = r.data, local = snapshot(), m = marker();
      if (m && m.user !== uid) m = null;
      A.profile = { display_name: row ? row.display_name : null };
      if (row) syncAvatar(row);
      if (!row) {   // first sign-in ever: this browser's progress becomes the profile's
        return columns(local).then(function (cols) {
          var ins = Object.assign({ user_id: uid, course: local.course, cards: local.cards, settings: local.settings, rev: 1 }, cols);
          return client.from(CFG.table).insert(ins).then(function (w) {
            if (w.error) { if (w.error.code === "23505" && !attempt) return fullSync(1); throw new Error(w.error.message); }
            setMarker(markFor(1, local));
            if (A.avatar()) client.from(CFG.table).update({ avatar: A.avatar() }).eq("user_id", uid).then(function () {});
          });
        });
      }
      var remote = { course: row.course, cards: row.cards, settings: row.settings };
      var lc = changedParts(local, m), now = Date.now(), result = {};
      var remoteChanged = function (k) { return !m || (k === "settings" ? JSON.stringify(remote.settings) !== m.settings : !remote[k] || remote[k].updated !== m[k]); };
      ["course", "cards", "settings"].forEach(function (k) {
        if (!remote[k]) { result[k] = local[k]; return; }
        if (!lc[k]) { result[k] = remote[k]; return; }
        if (!remoteChanged(k)) { result[k] = local[k]; return; }
        // both changed (or first sync on this device)
        if (k === "course") result[k] = emptyCourse(local.course) ? remote.course : emptyCourse(remote.course) ? local.course : mergeCourse(local.course, remote.course, now);
        else if (k === "cards") result[k] = emptyCards(local.cards) ? remote.cards : emptyCards(remote.cards) ? local.cards : mergeCards(local.cards, remote.cards, now);
        else result[k] = m ? local.settings : remote.settings;   // first sync on a device: the profile's settings
      });
      if (!apply(result)) throw new Error("the online copy couldn't be read");
      result = snapshot();   // what the store actually holds (repaired and pruned)
      var same = JSON.stringify(result) === JSON.stringify(remote);
      if (same) { setMarker(markFor(row.rev, result)); return; }
      return columns(result).then(function (cols) {
        var upd = Object.assign({ course: result.course, cards: result.cards, settings: result.settings, rev: row.rev + 1, updated_at: new Date().toISOString() }, cols);
        return client.from(CFG.table).update(upd).eq("user_id", uid).eq("rev", row.rev).select("rev").then(function (w) {
          if (w.error) throw new Error(w.error.message);
          if (!w.data || !w.data.length) { if (!attempt) return fullSync(1); throw new Error("another device kept changing the progress"); }
          setMarker(markFor(row.rev + 1, result));
        });
      });
    }).then(function () {
      if (A.user && A.user.id === uid) { A.sync = "saved"; A.syncedAt = Date.now(); A.error = null; emit(); }
    });
  }
  // The character: the profile's choice wins; a choice made before signing in is saved to the profile.
  // (Skipped when the table has no avatar column yet.)
  function syncAvatar(row) {
    if (!("avatar" in row)) return;
    var mine = A.avatar();
    if (mine === START) mine = null;
    if (row.avatar && byId(row.avatar) && row.avatar !== START) { if (row.avatar !== mine) setLocalAvatar(row.avatar); }
    else if (mine) client.from(CFG.table).update({ avatar: mine }).eq("user_id", row.user_id).then(function () {});
  }
  // Push: send only the parts changed since the last sync, if nobody else wrote in between.
  function push() {
    if (!A.user || !client) return Promise.resolve();
    var m = marker(), uid = A.user.id;
    if (!m || m.user !== uid) return fullSync(0);
    var local = snapshot(), ch = changedParts(local, m);
    if (!ch.course && !ch.cards && !ch.settings) return Promise.resolve();
    A.sync = "syncing"; emit();
    return columns(local).then(function (cols) {
      var upd = Object.assign({ rev: m.rev + 1, updated_at: new Date().toISOString() }, cols);
      ["course", "cards", "settings"].forEach(function (k) { if (ch[k]) upd[k] = local[k]; });
      return client.from(CFG.table).update(upd).eq("user_id", uid).eq("rev", m.rev).select("rev");
    }).then(function (w) {
      if (w.error) throw new Error(w.error.message);
      if (!w.data || !w.data.length) return fullSync(0);   // changed elsewhere: merge
      setMarker(markFor(m.rev + 1, local));
      A.sync = "saved"; A.syncedAt = Date.now(); A.error = null; emit();
    });
  }
  A.syncNow = function () { clearTimeout(pushTimer); return queue(function () { return fullSync(0); }).catch(fail); };
  function schedulePush() {
    if (applying || !A.user) return;
    clearTimeout(pushTimer);
    pushTimer = setTimeout(function () { queue(push).catch(fail); }, CFG.pushDelay);
  }
  A.onChange = function (fn) { subs.push(fn); return function () { subs = subs.filter(function (f) { return f !== fn; }); }; };

  store.onChange(schedulePush);
  document.addEventListener("visibilitychange", function () {
    if (!A.user) return;
    if (document.hidden) { if (pushTimer) { clearTimeout(pushTimer); queue(push).catch(fail); } }
    else A.syncNow();
  });
  window.addEventListener("online", function () { if (A.user) A.syncNow(); });

  // The iPhone app (TRK.app, APP-3): no online profile. The library is never downloaded and every sign-in call fails,
  // so the status stays "off"; the pages read A.disabled (and the CSS <html data-app>) to show no way in.
  if (T.app) {
    A.disabled = true;
    A.ensure = function () { return Promise.reject(new Error("Online profiles aren't available in the app.")); };
  }

  T.account = A;
  // Only download the library when it's needed: someone is signed in, or arriving from a sign-in link.
  if (!A.disabled && (hasToken() || urlHasAuth())) A.ensure().catch(function () {});
})();
