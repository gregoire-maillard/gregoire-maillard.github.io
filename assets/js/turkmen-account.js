/* © 2026 Grégoire Maillard. All rights reserved. Not open source: see /LICENSE.txt */
/* Turkmen A1 → B1: online profiles (TKM.account), forked from assets/js/turkish-account.js (ACCT-TK, TM-PROJECT.md 3).
   Loaded after turkmen.js on the four pages of the course. It loads nothing from the Turkish course.

   ONE ACCOUNT FOR BOTH COURSES. It signs in to the same Supabase project as Daily Turkish, so the same email and
   password work on dailyturkish.app and on dailyturkmen.app. The person (name, time zone) is the shared row of
   public.profiles; the progress is this course's own row of public.enrollments (lang "tk"), next to the Turkish one
   (lang "tr"). Each site keeps its own sign-in (browsers keep storage per address); the header's link to the other
   course carries the sign-in across (HANDOFF-1, below). On gregoiremaillard.com the two courses share an address, and
   signing in to one signs in to the other.

   Without an account nothing changes: progress lives in this browser (turkmen.js, store). With one, the three
   progress parts (course, cards, settings) are also kept online and follow the learner to other devices.

     - Sign-in: email + password (the email is confirmed once, when the account is created), or a one-time link sent
       by email (Supabase "magic link"). "Forgot password?" emails a link that opens a "choose a new password" box.
     - Sync: on load, when the page comes back into view, and a few seconds after each change. Each part is compared
       with what was last synced on this device: whichever side changed wins, and when both changed the two are merged
       (lessons, units, mistakes, flashcards and XP days entry by entry). The row's "rev" stops two devices from
       overwriting each other.
     - The Supabase library (~50 kB) is only downloaded when someone is signed in, is signing in, or opens My Profile.
     - The character picked in My Profile stays in this browser (tkm:v1:avatar): the profiles row's avatar column holds
       the Daily Turkish character, which this course leaves alone.

   The publishable key below is meant to be public: row-level security keeps each learner's rows private. Never put
   the secret (sb_secret_…) key here. The rows need public.languages to have 'tk' (scripts/turkmen/supabase-turkmen.sql). */
(function () {
  "use strict";
  var T = window.TKM;
  if (!T) return;

  // The hub's address on this site, from the page's own place (a static guide sits one folder down: TKM_BASE "../").
  function hubPath() {
    try { var p = new URL(T.C.BASE + T.C.PAGES.hub, location.href).pathname; return /\/index\.html$/.test(p) && location.hostname === "dailyturkmen.app" ? p.replace(/index\.html$/, "") : p; }
    catch (e) { return "/"; }
  }
  var CFG = {
    url: "https://xmbwayxoqlvhqenmiyzr.supabase.co",
    key: "sb_publishable_Xz3OM6yw0acx58SKoVFFaQ_iuQXWIxm",
    lib: "https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2.117.3/dist/umd/supabase.js",
    table: "profiles",       // the person: name, character, time zone (no language in it)
    progress: "enrollments", // one row per person and language: the progress (supabase-v2-multilang.sql)
    lang: T.C.LANG || "tk",  // this course's language code, a row of public.languages
    page: hubPath(),         // the course hub: / on dailyturkmen.app, /turkmen/index.html on gregoiremaillard.com
    pushDelay: 4000
  };
  var TOKEN_KEY = "sb-" + CFG.url.replace(/^https:\/\//, "").split(".")[0] + "-auth-token";
  var SYNC_KEY = "tkm:v1:sync";
  var store = T.store;
  // where the progress lives without an account, in the messages below
  function here() { return T.t(T.app ? "account.hereApp" : "account.here"); }


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

  function emit() { subs.slice().forEach(function (fn) { try { fn(A); } catch (e) { setTimeout(function () { throw e; }); } }); }
  function ls(fn) { try { return fn(window.localStorage); } catch (e) { return null; } }
  function hasToken() { return !!ls(function (s) { return s.getItem(TOKEN_KEY); }); }
  function urlHasAuth() { return /(?:^#|&)(?:access_token|error_description|error_code)=/.test(location.hash); }
  function marker() { var m = ls(function (s) { return JSON.parse(s.getItem(SYNC_KEY) || "null"); }); return m && typeof m === "object" ? m : null; }
  function setMarker(m) { ls(function (s) { if (m) s.setItem(SYNC_KEY, JSON.stringify(m)); else s.removeItem(SYNC_KEY); }); }

  // The character picked in My Profile (turkmen/index.html) lives in this browser only; signing out clears it.
  var AVATAR_KEY = "tkm:v1:avatar";
  function clearLocalAvatar() { ls(function (s) { s.removeItem(AVATAR_KEY); }); }

  // A sign-in link that failed (expired or already used) comes back with #error_description=… in the URL.
  (function readLinkError() {
    if (!/(?:^#|&)error_description=/.test(location.hash)) return;
    var p = new URLSearchParams(location.hash.slice(1));
    var code = p.get("error_code") || "";
    A.error = code === "otp_expired" ? T.t("account.linkExpired")
      : T.t("account.linkFailed", { error: (p.get("error_description") || T.t("account.unknownError")).replace(/\+/g, " ") });
    history.replaceState(null, "", CFG.page + "#profile");
  })();

  // A hand-off from the sister course (HANDOFF-1): #handoff=<token_hash>, made by the course-handoff Edge Function
  // when a signed-in learner follows the header's link to the other course's site. Read and removed from the address
  // at once, before the page's own scripts (which wait for DOMContentLoaded) read the hash.
  var handoff = null, handoffPending = false;
  (function readHandoff() {
    var m = /(?:^#|&)handoff=([^&]+)/.exec(location.hash);
    if (!m) return;
    try { handoff = decodeURIComponent(m[1]); } catch (e) { handoff = null; }
    handoffPending = !!handoff;
    history.replaceState(null, "", location.pathname + location.search);
  })();

  // ── loading the library and the client ──
  function loadLib() {
    if (window.supabase && window.supabase.createClient) return Promise.resolve();
    if (libPromise) return libPromise;
    libPromise = new Promise(function (resolve, reject) {
      var s = document.createElement("script");
      s.src = CFG.lib; s.async = true;
      s.onload = function () { window.supabase && window.supabase.createClient ? resolve() : reject(new Error("library missing")); };
      s.onerror = function () { reject(new Error(T.t("account.libFailed"))); };
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
      A.status = "unavailable"; A.error = T.t("account.unreachable", { error: e.message, where: here() });
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
      if (handoffPending) return;   // a hand-off is being used (useHandoff): stay "loading" until it settles
      A.user = null; A.profile = null; A.status = "signed-out"; A.sync = "idle";
      emit();
    }
  }

  // ── signing in and out ──
  A.signIn = function (email) {
    email = String(email || "").trim();
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) return Promise.reject(new Error(T.t("account.badEmail")));
    return A.ensure().then(function (c) {
      return c.auth.signInWithOtp({ email: email, options: { emailRedirectTo: redirectTo(), shouldCreateUser: true, data: { signup_platform: platform() } } });
    }).then(function (r) {
      if (r.error) throw new Error(/rate limit/i.test(r.error.message) ? T.t("account.tooManyLinks") : r.error.message);
      A.sentTo = email; A.sentKind = "link"; A.error = null; emit();
    });
  };

  // ── email + password ──
  var MIN_PW = 8;
  function checkEmail(email) {
    email = String(email || "").trim();
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) throw new Error(T.t("account.badEmail"));
    return email;
  }
  function checkPw(pw) {
    pw = String(pw || "");
    if (pw.length < MIN_PW) throw new Error(T.t("account.pwShort", { n: MIN_PW }));
    return pw;
  }
  function authError(e) {
    var m = (e && e.message) || T.t("account.unknownError");
    if (/invalid login credentials/i.test(m)) return new Error(T.t("account.wrongPw"));
    if (/email not confirmed/i.test(m)) return new Error(T.t("account.unconfirmed"));
    if (/rate limit/i.test(m)) return new Error(T.t("account.tooManyEmails"));
    if (/same.*password|different from the old/i.test(m)) return new Error(T.t("account.samePw"));
    return new Error(m);
  }
  // Where emailed links land (confirm, reset, sign-in): back to this course's hub on the same site, which needs the
  // redirect URLs of scripts/turkmen/supabase-turkmen.sql. (The Turkmen course isn't in the iPhone app, so unlike
  // turkish-account.js there is no capacitor:// case.)
  function redirectTo() { return location.origin + CFG.page + "?signin=1"; }
  // Where this device is (MAIL-2): the iPhone app, or the website on a phone or tablet, or on a computer. Saved with a
  // new account (auth.users.raw_user_meta_data.signup_platform; Supabase keeps it only when the account is created).
  function platform() {
    if (T.app) return "ios-app";
    var ua = navigator.userAgent || "";
    var ipad = /Macintosh/.test(ua) && navigator.maxTouchPoints > 1;   // iPadOS presents itself as a Mac
    return /Mobi|Android|iPhone|iPad|iPod/i.test(ua) || ipad ? "web-mobile" : "web-desktop";
  }

  // Signs in straight away: no email, no link.
  A.signInPassword = function (email, pw) {
    try { email = checkEmail(email); if (!pw) throw new Error(T.t("account.typePw")); } catch (e) { return Promise.reject(e); }
    return A.ensure().then(function (c) { return c.auth.signInWithPassword({ email: email, password: pw }); })
      .then(function (r) { if (r.error) throw authError(r.error); A.sentTo = null; A.error = null; });
  };
  // Creates the profile. With "Confirm email" on in Supabase, one confirmation email is sent;
  // after that, email + password is all it takes.
  A.signUp = function (email, pw) {
    try { email = checkEmail(email); pw = checkPw(pw); } catch (e) { return Promise.reject(e); }
    return A.ensure().then(function (c) {
      return c.auth.signUp({ email: email, password: pw, options: { emailRedirectTo: redirectTo(), data: { signup_platform: platform() } } });
    }).then(function (r) {
      if (r.error) {
        if (/already registered|already exists/i.test(r.error.message)) throw new Error(T.t("account.exists"));
        throw authError(r.error);
      }
      if (r.data && r.data.session) return;                       // email confirmation is off: already signed in
      var ids = r.data && r.data.user && r.data.user.identities;
      if (ids && !ids.length) throw new Error(T.t("account.exists"));
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
    if (!A.user) return Promise.reject(new Error(T.t("account.notSignedIn")));
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
      setMarker(null); clearLocalAvatar();
      applying = true; try { store.reset(); } finally { applying = false; }
      A.syncedAt = null; A.recovering = false;
      emit();
    });
  };
  A.setName = function (name) {
    name = String(name || "").replace(/\s+/g, " ").trim().slice(0, 40);
    if (!name) return Promise.reject(new Error(T.t("account.typeName")));
    if (!A.user) return Promise.reject(new Error(T.t("account.notSignedIn")));
    return client.from(CFG.table).update({ display_name: name }).eq("user_id", A.user.id).select("display_name").then(function (r) {
      if (r.error) throw new Error(r.error.message);
      if (!r.data || !r.data.length) throw new Error(T.t("account.noProfile") + " " + T.t(T.app ? "account.noProfileApp" : "account.noProfileReload"));
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
      setMarker(null); clearLocalAvatar();
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
    A.error = A.sync === "error" ? T.t("account.saveFailed", { error: e && e.message || T.t("account.unknownError"), where: here() }) : null;
    emit();
  }

  // Full sync: read the row, decide part by part, write back what's needed. Retries once on a conflict.
  function fullSync(attempt) {
    if (!A.user || !client) return Promise.resolve();
    A.sync = "syncing"; emit();
    var uid = A.user.id;
    // 1. The person (profiles). The row is made at sign-up by a trigger; made here too if it's missing.
    return client.from(CFG.table).select("user_id, display_name, timezone, ui_locale").eq("user_id", uid).maybeSingle().then(function (p) {
      if (p.error) throw new Error(p.error.message);
      if (!A.user || A.user.id !== uid) return;
      var prof = p.data;
      A.profile = { display_name: prof ? prof.display_name : null };
      var made = prof ? Promise.resolve() : client.from(CFG.table).upsert({ user_id: uid }, { onConflict: "user_id", ignoreDuplicates: true }).then(function (w) { if (w.error) throw new Error(w.error.message); });
      return made.then(function () {
        syncPerson(prof || { user_id: uid });
        // 2. The progress in this language (enrollments).
        return client.from(CFG.progress).select("*").eq("user_id", uid).eq("lang", CFG.lang).maybeSingle();
      }).then(function (r) { return mergeRow(r, uid, attempt); });
    }).then(function () {
      if (A.user && A.user.id === uid) { A.sync = "saved"; A.syncedAt = Date.now(); A.error = null; emit(); flushExtras(); }
    });
  }
  function mergeRow(r, uid, attempt) {
      if (r.error) throw new Error(r.error.message);
      if (!A.user || A.user.id !== uid) return;
      var row = r.data, local = snapshot(), m = marker();
      if (m && m.user !== uid) m = null;
      if (!row) {   // first time in this language: this browser's progress becomes the enrollment's
        return columns(local).then(function (cols) {
          var ins = Object.assign({ user_id: uid, lang: CFG.lang, course: local.course, cards: local.cards, settings: local.settings, rev: 1, last_active_at: new Date().toISOString() }, cols);
          return client.from(CFG.progress).insert(ins).then(function (w) {
            if (w.error) { if (w.error.code === "23505" && !attempt) return fullSync(1); throw new Error(w.error.message); }
            setMarker(markFor(1, local));
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
      if (!apply(result)) throw new Error(T.t("account.unreadable"));
      result = snapshot();   // what the store actually holds (repaired and pruned)
      var same = JSON.stringify(result) === JSON.stringify(remote);
      if (same) { setMarker(markFor(row.rev, result)); return; }
      return columns(result).then(function (cols) {
        var stamp = new Date().toISOString();
        var upd = Object.assign({ course: result.course, cards: result.cards, settings: result.settings, rev: row.rev + 1, updated_at: stamp, last_active_at: stamp }, cols);
        return client.from(CFG.progress).update(upd).eq("user_id", uid).eq("lang", CFG.lang).eq("rev", row.rev).select("rev").then(function (w) {
          if (w.error) throw new Error(w.error.message);
          if (!w.data || !w.data.length) { if (!attempt) return fullSync(1); throw new Error(T.t("account.conflict")); }
          setMarker(markFor(row.rev + 1, result));
        });
      });
  }
  // Time zone and language of the device, so streaks and reminders follow the learner's own days. Filled once.
  function syncPerson(prof) {
    var upd = {};
    try { var tz = Intl.DateTimeFormat().resolvedOptions().timeZone; if (!prof.timezone && tz && tz.length <= 64) upd.timezone = tz; } catch (e) {}
    var m = /^([a-z]{2})(?:-([a-z]{2}))?/i.exec(navigator.language || "");
    if (!prof.ui_locale && m) upd.ui_locale = m[1].toLowerCase() + (m[2] ? "-" + m[2].toUpperCase() : "");
    if (Object.keys(upd).length) client.from(CFG.table).update(upd).eq("user_id", prof.user_id).then(function () {}, function () {});
    markSeen(prof.user_id);
  }
  // When the profile was last used in the app and on the website (profiles.last_app_at / last_web_at, MAIL-2):
  // one small write at most every 6 hours per device. Ignored if the columns don't exist yet.
  function markSeen(uid) {
    var col = T.app ? "last_app_at" : "last_web_at", key = "tkm:account:seen:" + uid, now = Date.now(), last = 0;
    try { last = +localStorage.getItem(key) || 0; } catch (e) {}
    if (now - last < 6 * 3600 * 1000) return;
    var upd = {}; upd[col] = new Date(now).toISOString();
    client.from(CFG.table).update(upd).eq("user_id", uid).then(function (w) {
      if (!w.error) try { localStorage.setItem(key, String(now)); } catch (e) {}
    }, function () {});
  }

  // ── activity, exercise statistics, reports ──
  // activity_days: the last two weeks of the progress's own day logs (XP per day, new cards and reviews per day),
  // written as absolute values, so sending them twice, or from two devices, changes nothing.
  var sentDays = "";
  function pushActivity() {
    if (!A.user || !client) return;
    var d = snapshot(), xd = (d.course.xp && d.course.xp.days) || {}, cd = d.cards.days || {}, uid = A.user.id;
    var since = T.iso(Date.now() - 14 * 864e5).slice(0, 10), days = {};
    Object.keys(xd).concat(Object.keys(cd)).forEach(function (k) { if (/^\d{4}-\d{2}-\d{2}$/.test(k) && k >= since) days[k] = true; });
    var rows = Object.keys(days).sort().map(function (k) {
      var c = cd[k] || {};
      return { user_id: uid, lang: CFG.lang, day: k, xp: Math.max(0, Math.round(xd[k] || 0)), new_cards: Math.max(0, c["new"] || 0), reviews: Math.max(0, c.reviews || 0) };
    }).filter(function (x) { return x.xp || x.new_cards || x.reviews; });
    var key = JSON.stringify(rows);
    if (!rows.length || key === sentDays) return;
    client.from("activity_days").upsert(rows, { onConflict: "user_id,lang,day" }).then(function (w) { if (!w.error) sentDays = key; }, function () {});
  }
  // item_stats: first tries at each exercise, sent in batches (anonymous: the table has no user in it).
  var attempts = [];
  A.recordAttempt = function (id, ok) {
    if (!A.user || !id || !/^[a-z0-9-]{1,80}$/.test(id)) return;
    attempts.push({ id: id, ok: !!ok });
    if (attempts.length >= 200) flushAttempts();
  };
  function flushAttempts() {
    if (!A.user || !client || !attempts.length) return;
    var batch = attempts.splice(0, 200);
    client.rpc("record_attempts", { p_lang: CFG.lang, items: batch }).then(function (r) { if (r.error && !/sign in/.test(r.error.message)) attempts = batch.concat(attempts).slice(0, 400); }, function () { attempts = batch.concat(attempts).slice(0, 400); });
  }
  function flushExtras() { pushActivity(); flushAttempts(); }
  // feedback: "report a mistake". kind: typo · wrong-answer · audio · other. Needs a profile.
  A.report = function (o) {
    o = o || {};
    if (!A.user || !client) return Promise.reject(new Error(T.t("account.reportSignIn")));
    var msg = String(o.message || "").trim().slice(0, 2000);
    if (!msg) return Promise.reject(new Error(T.t("account.reportEmpty")));
    var kind = ["typo", "wrong-answer", "audio", "other"].indexOf(o.kind) >= 0 ? o.kind : "other";
    return client.from("feedback").insert({ user_id: A.user.id, lang: CFG.lang, item_id: o.itemId ? String(o.itemId).slice(0, 80) : null, kind: kind, message: msg, page: (location.pathname + location.search).slice(0, 200) }).then(function (r) {
      if (r.error) throw new Error(r.error.message);
    });
  };
  // Push: send only the parts changed since the last sync, if nobody else wrote in between.
  function push() {
    if (!A.user || !client) return Promise.resolve();
    var m = marker(), uid = A.user.id;
    if (!m || m.user !== uid) return fullSync(0);
    var local = snapshot(), ch = changedParts(local, m);
    if (!ch.course && !ch.cards && !ch.settings) return Promise.resolve();
    A.sync = "syncing"; emit();
    return columns(local).then(function (cols) {
      var stamp = new Date().toISOString();
      var upd = Object.assign({ rev: m.rev + 1, updated_at: stamp, last_active_at: stamp }, cols);
      ["course", "cards", "settings"].forEach(function (k) { if (ch[k]) upd[k] = local[k]; });
      return client.from(CFG.progress).update(upd).eq("user_id", uid).eq("lang", CFG.lang).eq("rev", m.rev).select("rev");
    }).then(function (w) {
      if (w.error) throw new Error(w.error.message);
      if (!w.data || !w.data.length) return fullSync(0);   // changed elsewhere: merge
      setMarker(markFor(m.rev + 1, local));
      A.sync = "saved"; A.syncedAt = Date.now(); A.error = null; emit(); flushExtras();
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
    if (document.hidden) { if (pushTimer) { clearTimeout(pushTimer); queue(push).catch(fail); } flushAttempts(); }
    else A.syncNow();
  });
  window.addEventListener("online", function () { if (A.user) A.syncNow(); });

  // Kept from the Turkish module, whose iPhone app opens emailed links on the website; the Turkmen course has no app.
  A.linksOpenWebsite = !!T.app;

  // ── Google and Apple (SEO-9) ──
  // THE SWITCH: list "google" and/or "apple" once that provider is set up in Supabase (Authentication › Sign In /
  // Providers; steps in PROJECT.md 3, Online profiles). Empty: no button anywhere. The website only: in the app, a
  // Google button would also require Sign in with Apple (App Store guideline 4.8) and a way back into the app.
  var OAUTH = [];
  A.providers = T.app ? [] : OAUTH.filter(function (p) { return p === "google" || p === "apple"; });
  // Leaves for Google or Apple, which send the learner back to the course page signed in (redirectTo: the same
  // address as the emailed links, so it is already among Supabase's redirect URLs). A new account made this way has
  // no signup_platform (Supabase takes user data only from signUp and signInWithOtp).
  A.signInWith = function (provider) {
    if (A.providers.indexOf(provider) < 0) return Promise.reject(new Error(T.t("account.noProvider")));
    return A.ensure().then(function (c) { return c.auth.signInWithOAuth({ provider: provider, options: { redirectTo: redirectTo() } }); })
      .then(function (r) { if (r && r.error) throw authError(r.error); });
  };

  // ── "Keep what you've learned" (SEO-9): after a finished lesson or flashcard session, signed out ──
  // A.nudge(el, { xp, streak, cards }) fills el with a small card inviting the learner to create a free account
  // (it links to the course page's sign-in dialog, #signup), and keeps it hidden while someone is signed in or being
  // signed in, in the app, and for 14 days after "Not now" (localStorage "tkm:nudge:hide", outside the progress).
  var NUDGE_KEY = "tkm:nudge:hide", NUDGE_DAYS = 14;
  A.nudge = function (el, o) {
    if (!el || T.app || A.disabled) return;
    o = o || {};
    var hidden = function () { var t = +ls(function (s) { return s.getItem(NUDGE_KEY); }); return t > 0 && Date.now() - t < NUDGE_DAYS * 864e5; };
    if (hidden()) return;
    if (!document.getElementById("tkm-nudge-css")) {
      var st = document.createElement("style");
      st.id = "tkm-nudge-css";
      st.textContent = ".tkm-nudge{margin:18px auto 4px;max-width:30rem;padding:14px 16px 10px;border:1px solid rgb(40 122 158 / 35%);border-radius:12px;background:var(--blue-tint,#eef5f8);text-align:left}" +
        ".tkm-nudge-t{margin:0 0 4px;font-size:15.5px;font-weight:650;line-height:1.35;color:var(--ink,#242424)}" +
        ".tkm-nudge-p{margin:0 0 8px;font-size:14px;line-height:1.5;color:var(--body,#4a4a48)}" +
        ".tkm-nudge-b{display:flex;flex-wrap:wrap;align-items:center;gap:4px 14px}" +
        ".tkm-nudge-x{min-height:44px;padding:0 4px;border:0;background:none;font:inherit;font-size:13.5px;color:var(--muted,#6f6f6f);text-decoration:underline;cursor:pointer}" +
        ".tkm-nudge-x:hover{color:var(--ink,#242424)}";
      document.head.appendChild(st);
    }
    // what is saved: the XP, the XP and the streak, the streak, the flashcard schedule, or the progress (whole sentences, TM-FR.md 4.4)
    var xp = o.xp > 0, streak = o.streak > 1;
    var what = xp && streak ? "xpStreak" : xp ? "xp" : streak ? "streak" : o.cards > 0 ? "cards" : "none";
    el.className = "tkm-nudge";
    el.setAttribute("role", "region");
    el.setAttribute("aria-label", T.t("account.nudge.label"));
    el.innerHTML = '<p class="tkm-nudge-t">' + T.esc(T.t("account.nudge.title")) + "</p>" +
      '<p class="tkm-nudge-p">' + T.t("account.nudge." + what + ".html", { xp: o.xp, n: o.streak }) + "</p>" +
      '<div class="tkm-nudge-b"><a class="btn primary" href="' + T.C.BASE + T.C.PAGES.hub + '#signup">' + T.esc(T.t("account.nudge.create")) + "</a>" +
      '<button type="button" class="tkm-nudge-x">' + T.esc(T.t("account.nudge.notNow")) + "</button></div>";
    var paint = function () { el.hidden = !!A.user || !(A.status === "off" || A.status === "signed-out") || hidden(); };
    el.querySelector(".tkm-nudge-x").addEventListener("click", function () {
      ls(function (s) { s.setItem(NUDGE_KEY, String(Date.now())); });
      el.hidden = true;
    });
    paint();
    if (nudgeOff) nudgeOff();   // a page redraws its end screen: follow the new card only
    nudgeOff = A.onChange(paint);
  };
  var nudgeOff = null;

  // ── the hand-off to the sister course (HANDOFF-1) ──
  // dailyturkish.app and dailyturkmen.app use the same accounts, but a browser keeps each site's sign-in apart. When a
  // signed-in learner clicks the header's link to the other course (a.at-sis, or any link marked data-handoff), this
  // asks the course-handoff Edge Function (scripts/turkish/supabase-course-handoff.ts) for a single-use sign-in token
  // and opens the other site with #handoff=<token>; that site signs in with it: a session of its own, so the two sites
  // never share a refresh token. Signed out, in the app, with a modifier key (new tab) or if anything fails, the link
  // just opens as it is. The token is in the hash, so it never reaches a server log or Google Analytics.
  var SISTER_HOSTS = ["dailyturkish.app", "dailyturkmen.app", "gregoiremaillard.com", "www.gregoiremaillard.com"];
  var HANDOFF_FN = "course-handoff", HANDOFF_WAIT = 4000;
  function sisterLink(a) {
    return !!a && SISTER_HOSTS.indexOf(a.hostname) >= 0 && a.hostname !== location.hostname && /^https:$/.test(a.protocol);
  }
  if (!T.app) document.addEventListener("click", function (e) {
    if (e.defaultPrevented || e.button || e.metaKey || e.ctrlKey || e.shiftKey || e.altKey) return;
    var a = e.target && e.target.closest ? e.target.closest("a.at-sis[href], a[data-handoff][href]") : null;
    if (!sisterLink(a) || a.target === "_blank" || !client || !A.user) return;
    e.preventDefault();
    var base = a.href.split("#")[0], hash = a.hash, gone = false;
    function go(token) {
      if (gone) return; gone = true;
      location.href = base + (token ? "#handoff=" + encodeURIComponent(token) : hash);
    }
    setTimeout(function () { go(null); }, HANDOFF_WAIT);   // never keep the learner waiting on a slow answer
    client.functions.invoke(HANDOFF_FN, { body: {} }).then(function (r) {
      go(r && !r.error && r.data && typeof r.data.token_hash === "string" ? r.data.token_hash : null);
    }, function () { go(null); });
  });
  function useHandoff(c) {
    var t = handoff; handoff = null;
    if (!t) return;
    function settle() {
      if (!handoffPending) return;
      handoffPending = false;
      if (!A.user) onSession("SIGNED_OUT", null);
    }
    c.auth.getSession().then(function (r) {
      if (r && r.data && r.data.session) return null;   // already signed in on this site: keep that account
      return c.auth.verifyOtp({ token_hash: t, type: "magiclink" });
    }).then(function (r) {
      // success: Supabase reports SIGNED_IN to onSession; give it a moment before settling
      setTimeout(settle, r && !r.error ? 1500 : 0);
    }, settle);
  }

  T.account = A;
  // Only download the library when it's needed: someone is signed in, or arriving from a sign-in link.
  if (!A.disabled && (hasToken() || urlHasAuth() || handoff)) A.ensure().then(useHandoff, function () { handoffPending = false; });
  else { handoff = null; handoffPending = false; }
})();
