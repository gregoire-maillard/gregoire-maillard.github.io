/* Turkish A1 → C2: online profiles (TRK.account). Loaded after turkish.js on every page of the section.

   Without an account nothing changes: progress lives in this browser (turkish.js, store section 8).
   With one, the same three progress parts (course, cards, settings) are also kept in one Supabase row
   per learner (table public.profiles), so they follow the learner to other devices.

     - Sign-in: a one-time link sent by email (Supabase "magic link"); no password.
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
    sentTo: null          // the email a sign-in link was just sent to
  };
  var client = null, libPromise = null, subs = [], applying = false, pushTimer = null, chain = Promise.resolve();

  function emit() { subs.slice().forEach(function (fn) { try { fn(A); } catch (e) { setTimeout(function () { throw e; }); } }); }
  function ls(fn) { try { return fn(window.localStorage); } catch (e) { return null; } }
  function hasToken() { return !!ls(function (s) { return s.getItem(TOKEN_KEY); }); }
  function urlHasAuth() { return /(?:^#|&)(?:access_token|error_description|error_code)=/.test(location.hash); }
  function marker() { var m = ls(function (s) { return JSON.parse(s.getItem(SYNC_KEY) || "null"); }); return m && typeof m === "object" ? m : null; }
  function setMarker(m) { ls(function (s) { if (m) s.setItem(SYNC_KEY, JSON.stringify(m)); else s.removeItem(SYNC_KEY); }); }

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
      if (event === "SIGNED_IN" && /[?&]signin=1/.test(location.search)) history.replaceState(null, "", CFG.page + "#profile");
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
      A.sentTo = email; A.error = null; emit();
    });
  };
  // Signing out saves what's left to save, then clears this browser, so the next person starts fresh.
  A.signOut = function () {
    if (!client) return Promise.resolve();
    clearTimeout(pushTimer);
    return queue(push).catch(function () {}).then(function () { return client.auth.signOut(); }).then(function () {
      setMarker(null);
      applying = true; try { store.reset(); } finally { applying = false; }
      A.syncedAt = null;
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
      setMarker(null);
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
    return client.from(CFG.table).select("display_name, course, cards, settings, rev").eq("user_id", uid).maybeSingle().then(function (r) {
      if (r.error) throw new Error(r.error.message);
      if (!A.user || A.user.id !== uid) return;
      var row = r.data, local = snapshot(), m = marker();
      if (m && m.user !== uid) m = null;
      A.profile = { display_name: row ? row.display_name : null };
      if (!row) {   // first sign-in ever: this browser's progress becomes the profile's
        return columns(local).then(function (cols) {
          var ins = Object.assign({ user_id: uid, course: local.course, cards: local.cards, settings: local.settings, rev: 1 }, cols);
          return client.from(CFG.table).insert(ins).then(function (w) {
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

  T.account = A;
  // Only download the library when it's needed: someone is signed in, or arriving from a sign-in link.
  if (hasToken() || urlHasAuth()) A.ensure().catch(function () {});
})();
