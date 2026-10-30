/* Daily Turkish app only (app/src/turkish-app.js): the daily reminder, Export/Import through the share sheet,
 * haptics, the status bar and the keyboard (APP-4), and a check of the no-online-profile flag.
 *
 * Not part of the website. app/scripts/build-www.mjs adds this file, Capacitor's runtime and the
 * Local Notifications plugin to the app's copy of the Turkish pages. Outside the native app
 * (a browser, the website, dailyturkish.app) it does nothing.
 *
 * What it does:
 *   - adds a "Daily reminder" card to the hub's Settings (on/off and a time, default 19:00, off);
 *   - schedules one local notification a day for the next 14 days, and skips today once the
 *     daily XP goal is met. It re-plans whenever the progress changes and whenever the app comes
 *     back to the foreground, so the skip and the streak in the text stay current. If the app
 *     isn't opened for 14 days, the reminders stop on their own.
 *   - no online profile: the pages read the build's <html data-app="ios"> flag (see below);
 *   - Export saves the file and opens the iOS share sheet, Import accepts .json and .txt, haptics on answers,
 *     finished sessions and the daily goal (switch in Settings, "trk:app:haptics"), dark status bar, and the
 *     focused field kept clear of the keyboard, the header and the dock (APP-4; see "Native touches");
 *   - the choice is kept in localStorage "trk:app:reminder" ({ on, time: "HH:MM" }), outside the
 *     course progress and its export (PROJECT.md 5.9 is unchanged).
 * Notification ids 7001–7014 belong to this file.
 */
(function () {
  "use strict";
  var root = window;
  var KEY = "trk:app:reminder";
  var FIRST_ID = 7001, DAYS = 14;
  var DEFAULT = { on: false, time: "19:00" };

  var MESSAGES = [
    { title: "Bugün biraz Türkçe?", body: "A little Turkish today? A short lesson keeps it moving." },
    { title: "Haydi, a few minutes of Turkish", body: "One lesson or ten flashcards is enough for today." },
    { title: "Tekir is waiting", body: "Your Turkish for today is ready when you are." },
    { title: "Damlaya damlaya göl olur", body: "Drop by drop, a lake. Today's drop is ready." }
  ];

  function pad(n) { return (n < 10 ? "0" : "") + n; }
  // Same rule as turkish.js (PROJECT.md 5.9): a learning day starts at settings.dayStartHour.
  function dayOf(t, hour) {
    var d = new Date(t);
    if (d.getHours() < (hour || 0)) d.setDate(d.getDate() - 1);
    return d.getFullYear() + "-" + pad(d.getMonth() + 1) + "-" + pad(d.getDate());
  }
  function parseTime(s) {
    var m = /^(\d{1,2}):(\d{2})/.exec(s || "");
    if (!m) return null;
    var h = +m[1], mi = +m[2];
    return h < 24 && mi < 60 ? { h: h, m: mi } : null;
  }
  function pick(day) {
    var n = 0;
    for (var i = 0; i < day.length; i++) n = (n * 31 + day.charCodeAt(i)) % 9973;
    return MESSAGES[n % MESSAGES.length];
  }

  // The notifications to schedule, as LocalNotifications.schedule() takes them. Pure, for tests.
  // progress is TRK.progress (goal and streak views).
  function plan(now, rem, course, settings, progress) {
    var t = rem && rem.on ? parseTime(rem.time) : null;
    if (!t) return [];
    var hour = typeof settings.dayStartHour === "number" ? settings.dayStartHour : 4;
    var today = dayOf(now, hour);
    var goal = progress.goal(course, settings, now), streak = progress.streak(course, settings, now);
    var base = new Date(now), out = [], seenLater = false;
    for (var i = 0; i <= DAYS && out.length < DAYS; i++) {
      var at = new Date(base.getFullYear(), base.getMonth(), base.getDate() + i, t.h, t.m, 0, 0);
      if (at.getTime() <= now + 60000) continue;
      var day = dayOf(at.getTime(), hour), msg = null;
      if (day === today) {
        if (goal.met) continue;
        if (streak.current > 0 && !streak.done) {
          msg = { title: "Keep your " + streak.current + "-day streak", body: "One lesson or ten flashcards today keeps it going." };
        } else if (goal.xp > 0) {
          msg = { title: (goal.goal - goal.xp) + " XP to today's goal", body: "Nearly there. A lesson earns about 15 XP." };
        }
      } else if (day > today && !seenLater) {
        seenLater = true;
        // Studied today: tomorrow is the day the streak is at stake.
        if (streak.done && streak.current > 0) {
          msg = { title: "Keep your " + streak.current + "-day streak", body: "One lesson or ten flashcards today keeps it going." };
        }
      }
      msg = msg || pick(day);
      out.push({ id: FIRST_ID + out.length, title: msg.title, body: msg.body,
                 schedule: { at: at, allowWhileIdle: true }, extra: { trk: "reminder", day: day } });
    }
    return out;
  }

  function load() {
    try {
      var v = JSON.parse(root.localStorage.getItem(KEY));
      if (v && typeof v.on === "boolean" && parseTime(v.time)) return { on: v.on, time: v.time };
    } catch (e) { /* fall through */ }
    return { on: DEFAULT.on, time: DEFAULT.time };
  }
  function save(v) {
    try { root.localStorage.setItem(KEY, JSON.stringify({ on: !!v.on, time: v.time })); } catch (e) { /* kept for this session */ }
  }

  root.TRKApp = { plan: plan, KEY: KEY, FIRST_ID: FIRST_ID, DAYS: DAYS };

  var Cap = root.Capacitor;
  if (!Cap || typeof Cap.isNativePlatform !== "function" || !Cap.isNativePlatform()) return;
  var TRK = root.TRK;
  if (!TRK) return;

  // ── No online profile in the app ──
  // build-www.mjs writes <html data-app="ios"> into the app's pages (APP-3). turkish.js reads it as TRK.app,
  // turkish-account.js then never downloads the sign-in library (TRK.account.disabled), and the pages leave out
  // every way into sign-in and say "on this iPhone"; their CSS hides the same parts from the first paint.
  // So nothing here matches page text. If the flag is missing, the build is out of date: say so.
  if (!document.documentElement.hasAttribute("data-app") && root.console) console.warn("Daily Turkish: <html data-app> missing, rebuild www (npm run build)");

  // ── Native touches (APP-4): Export/Import, haptics, status bar, keyboard ──
  // The plugins are reached through Capacitor's runtime, so www/ needs no script per plugin; their native
  // halves are in the Xcode project (npm run sync). A plugin missing from the build is simply skipped.
  function plugin(name) {
    try { return Cap.isPluginAvailable(name) ? Cap.registerPlugin(name) : null; } catch (e) { return null; }
  }
  var Haptics = plugin("Haptics"), Filesystem = plugin("Filesystem"), Share = plugin("Share"),
      StatusBar = plugin("StatusBar"), Keyboard = plugin("Keyboard");
  var tstore = TRK.store;
  var reduce = !!(root.matchMedia && root.matchMedia("(prefers-reduced-motion: reduce)").matches);
  function quietly(p) { return p && p.catch ? p.catch(function (e) { if (root.console) console.warn("Daily Turkish:", e); }) : p; }

  // Dark clock and battery over the white header (capacitor.config.json sets the same at launch).
  if (StatusBar) quietly(StatusBar.setStyle({ style: "LIGHT" }));

  // 1. Export. The pages save files with a download link (<a download href="blob:…">), which a web view can't
  //    follow. The app catches that click, writes the file to its Documents folder (shown in Files › On My
  //    iPhone › Daily Turkish) and opens the share sheet: Save to Files, AirDrop, Mail… Every download on the
  //    hub and the flashcards page goes this way (Export progress, "Export a copy first", the storage-full
  //    notice, "Download what was found"), and the page's own status text is kept.
  if (Filesystem && Share) {
    var saveAndShare = function (name, text) {
      return Filesystem.writeFile({ path: name, data: text, directory: "DOCUMENTS", encoding: "utf8", recursive: true })
        .then(function (r) {
          return Share.share({ title: name, files: [r.uri], dialogTitle: "Keep a copy of your progress" }).catch(function (e) {
            // Closing the sheet isn't an error: the file is still in Files › On My iPhone › Daily Turkish.
            if (!/cancel/i.test((e && e.message) || "")) throw e;
          });
        });
    };
    document.addEventListener("click", function (e) {
      var a = e.target && e.target.closest ? e.target.closest("a[download]") : null;
      if (!a || !/^(blob|data):/.test(a.getAttribute("href") || "")) return;
      e.preventDefault();
      e.stopImmediatePropagation();
      var name = (a.getAttribute("download") || "turkish-progress.json").replace(/[\/\\:]/g, "-");
      fetch(a.href).then(function (r) { return r.text(); })   // read now: the page revokes the link after a second
        .then(function (text) { return saveAndShare(name, text); })
        .catch(function (err) {
          if (root.console) console.warn("Daily Turkish export:", err);
          var ps = document.getElementById("p-status");
          if (ps) ps.textContent = "The file couldn't be saved on this iPhone. Try again, or restart the app.";
        });
    }, true);
  }
  // Import. The pages' own <input type="file"> opens the iOS document picker inside the web view (Files,
  // iCloud Drive, On My iPhone › Daily Turkish) and the page reads it with FileReader, as on the website. A
  // file that came by Mail or AirDrop can arrive as .txt, so the app also accepts plain text; the page checks
  // the content either way (5.9).
  Array.prototype.forEach.call(document.querySelectorAll("input[type=file]#p-file"), function (el) {
    el.setAttribute("accept", "application/json,text/plain,.json,.txt");
  });

  // 2. Haptics: a light tap for a right answer, a double tap for a wrong one, a success buzz when a lesson,
  //    review, test or practice ends, and a longer pattern when the daily goal is met (on any page, so the
  //    flashcards count too). On by default; the switch is in the hub's Settings, kept in localStorage
  //    "trk:app:haptics" ({ on }), outside the progress and its export. iOS also mutes them when the
  //    iPhone's own Settings › Sounds & Haptics › System Haptics is off.
  var HKEY = "trk:app:haptics";
  var hOn = (function () { try { var v = JSON.parse(root.localStorage.getItem(HKEY)); return !(v && v.on === false); } catch (e) { return true; } })();
  var PATTERNS = {
    right: [["impact", "LIGHT"]],
    wrong: [["notification", "WARNING"]],
    finish: [["notification", "SUCCESS"]],
    goal: [["notification", "SUCCESS"], 300, ["impact", "MEDIUM"], 140, ["impact", "LIGHT"]]
  };
  function buzz(kind) {
    if (!hOn || !Haptics) return;
    var t = 0;
    (PATTERNS[kind] || []).forEach(function (s) {
      if (typeof s === "number") { t += s; return; }
      setTimeout(function () {
        var p = s[0] === "impact" ? Haptics.impact({ style: s[1] }) : Haptics.notification({ type: s[1] });
        if (p && p.catch) p.catch(function () {});
      }, t);
    });
  }
  // Answers: the lesson's dock turns "ok", "almost" or "bad" on every check, retries included.
  var dock = document.getElementById("dock");
  function verdictOf(cls) { return /\b(ok|almost)\b/.test(cls || "") ? "right" : /\bbad\b/.test(cls || "") ? "wrong" : null; }
  if (dock && root.MutationObserver) {
    new MutationObserver(function (list) {
      var now = verdictOf(dock.className);
      if (now && now !== verdictOf(list[0].oldValue)) buzz(now);
    }).observe(dock, { attributes: true, attributeFilter: ["class"], attributeOldValue: true });
  }
  // The daily goal, on every save; quiet while a file is imported or progress is reset.
  function goalNow() {
    try { var s = tstore.settings(); return { day: TRK.today(s), met: TRK.progress.goal(tstore.course(), s, Date.now()).met }; }
    catch (e) { return null; }
  }
  var goalWas = goalNow(), finishing = false, goalHit = false, hush = 0;
  tstore.onChange(function () {
    var g = goalNow(), was = goalWas;
    if (!g) return;
    goalWas = g;
    if (hush || !g.met || (was && was.day === g.day && was.met)) return;
    if (finishing) goalHit = true; else buzz("goal");
  });
  ["importData", "reset"].forEach(function (name) {
    var orig = tstore[name];
    if (typeof orig !== "function") return;
    tstore[name] = function () { hush++; try { return orig.apply(this, arguments); } finally { hush--; goalWas = goalNow(); } };
  });
  // The end of a session: one buzz, the goal pattern if this session met the goal.
  ["finishLesson", "finishReview", "finishTest", "finishPractice"].forEach(function (name) {
    var orig = tstore[name];
    if (typeof orig !== "function") return;
    tstore[name] = function () {
      var res;
      finishing = true; goalHit = false;
      try { res = orig.apply(this, arguments); } finally { finishing = false; }
      if (goalHit) buzz("goal");
      else if (name === "finishLesson" || name === "finishPractice" || (res && res.passed)) buzz("finish");
      return res;
    };
  });
  // The switch, in the hub's Settings (before "Your progress").
  (function mountHaptics() {
    var grid = document.querySelector("#settings .set-grid");
    if (!grid || !Haptics || document.getElementById("s-haptics")) return;
    var fs = document.createElement("fieldset");
    fs.className = "set";
    fs.id = "s-haptics";
    fs.innerHTML = '<legend>Haptics</legend>' +
      '<label class="check"><input type="checkbox" id="s-hap-on"><span>Haptic feedback' +
      '<small>A light tap for right and wrong answers, a finished lesson and the daily goal</small></span></label>';
    grid.insertBefore(fs, grid.querySelector("fieldset.set.wide"));
    var box = fs.querySelector("#s-hap-on");
    box.checked = hOn;
    box.addEventListener("change", function () {
      hOn = box.checked;
      try { root.localStorage.setItem(HKEY, JSON.stringify({ on: hOn })); } catch (e) { /* kept for this session */ }
      buzz("right");   // a sample when it's turned on
    });
  })();

  // 3. Keyboard. The web view shrinks to the space above the keyboard (Keyboard resize "native"), so the
  //    lesson's dock with Check rides on top of it. The plugin takes over WebKit's own scrolling to the focused
  //    field, so the app does it: the field, and the Turkish letter bar under it, are scrolled clear of the
  //    header and of the dock. The form accessory bar (‹ › Done) stays hidden, the plugin's default: Check,
  //    or the return key, closes the keyboard.
  if (Keyboard) quietly(Keyboard.setAccessoryBarVisible({ isVisible: false }));
  var kbOpen = false;
  function reveal() {
    var el = document.activeElement;
    if (!kbOpen || !el || !el.matches || !el.matches("input:not([type=checkbox]):not([type=radio]), textarea, [contenteditable]")) return;
    var r = el.getBoundingClientRect(), top = r.top, bottom = r.bottom;
    var ex = el.closest(".ex"), bar = ex && ex.querySelector(".kb");
    if (bar && bar.offsetParent) {
      var b = bar.getBoundingClientRect();
      if (b.top >= r.top && b.bottom - r.top < 260) bottom = Math.max(bottom, b.bottom);
    }
    var hdr = document.querySelector(".at-hdr"), minTop = (hdr ? hdr.getBoundingClientRect().bottom : 0) + 8;
    var maxBottom = root.innerHeight - 8;
    var dk = document.querySelector("#dock:not([hidden]), .dock");
    if (dk && dk.offsetParent) maxBottom = Math.min(maxBottom, dk.getBoundingClientRect().top - 8);
    var delta = 0;
    if (bottom > maxBottom) delta = bottom - maxBottom;
    if (top - delta < minTop) delta = top - minTop;   // never push the field's own top under the header
    if (Math.abs(delta) > 1) root.scrollBy({ top: delta, behavior: reduce ? "auto" : "smooth" });
  }
  root.addEventListener("keyboardWillShow", function () { kbOpen = true; });
  root.addEventListener("keyboardDidShow", function () { kbOpen = true; setTimeout(reveal, 350); });   // after the web view has shrunk
  root.addEventListener("keyboardWillHide", function () { kbOpen = false; });
  root.addEventListener("resize", function () { if (kbOpen) reveal(); });
  document.addEventListener("focusin", function () { if (kbOpen) setTimeout(reveal, 60); });

  var LN = root.capacitorLocalNotifications && root.capacitorLocalNotifications.LocalNotifications;
  if (!LN) return;

  var state = load(), denied = false, next = null, ui = null;
  var chain = Promise.resolve();

  function allIds() {
    var a = [];
    for (var i = 0; i < DAYS; i++) a.push({ id: FIRST_ID + i });
    return a;
  }
  function run() {
    return LN.cancel({ notifications: allIds() }).then(function () {
      next = null;
      if (!state.on) { denied = false; return; }
      return LN.checkPermissions().then(function (p) {
        denied = p.display !== "granted";
        if (denied) return;
        var store = TRK.store;
        var list = plan(Date.now(), state, store.course(), store.settings(), TRK.progress);
        next = list.length ? list[0].schedule.at : null;
        return list.length ? LN.schedule({ notifications: list }) : null;
      });
    });
  }
  function reschedule() {
    chain = chain.then(run).catch(function (e) { if (root.console) console.warn("Daily reminder:", e); }).then(paint);
    return chain;
  }
  var timer = null;
  function soon() { clearTimeout(timer); timer = setTimeout(reschedule, 400); }

  function when(d) {
    var now = new Date(), t = pad(d.getHours()) + ":" + pad(d.getMinutes());
    var a = new Date(now.getFullYear(), now.getMonth(), now.getDate()).getTime();
    var b = new Date(d.getFullYear(), d.getMonth(), d.getDate()).getTime();
    var gap = Math.round((b - a) / 864e5);
    if (gap === 0) return "today at " + t;
    if (gap === 1) return "tomorrow at " + t;
    return d.toLocaleDateString("en-GB", { weekday: "long" }) + " at " + t;
  }

  // ── Settings card on the hub ──
  function mount() {
    var grid = document.querySelector("#settings .set-grid");
    if (!grid || document.getElementById("s-reminder")) return;
    var css = document.createElement("style");
    css.textContent = ".set input[type=time] { font: inherit; font-size: 15px; height: 40px; border: 1px solid var(--line); " +
      "border-radius: 6px; padding: 0 10px; background: #fff; color: var(--ink); font-variant-numeric: tabular-nums; }" +
      ".set input[type=time]:disabled { opacity: .5; }";
    document.head.appendChild(css);
    var fs = document.createElement("fieldset");
    fs.className = "set";
    fs.id = "s-reminder";
    fs.innerHTML = '<legend>Daily reminder</legend>' +
      '<label class="check"><input type="checkbox" id="s-rem-on"><span>Remind me to study' +
      '<small>One notification a day, skipped once today\'s goal is met</small></span></label>' +
      '<label class="field" for="s-rem-time">Time<span class="ctl"><input type="time" id="s-rem-time" step="300"></span></label>' +
      '<p class="help" id="s-rem-help" aria-live="polite"></p>';
    grid.insertBefore(fs, grid.querySelector("fieldset.set.wide"));
    ui = { on: fs.querySelector("#s-rem-on"), time: fs.querySelector("#s-rem-time"), help: fs.querySelector("#s-rem-help") };

    ui.on.addEventListener("change", function () {
      if (!ui.on.checked) { state.on = false; save(state); reschedule(); return; }
      ui.on.disabled = true;
      LN.requestPermissions().then(function (p) {
        state.on = true;
        denied = p.display !== "granted";
        save(state);
      }, function () { state.on = true; save(state); }).then(function () { ui.on.disabled = false; reschedule(); });
    });
    ui.time.addEventListener("change", function () {
      if (!parseTime(ui.time.value)) { ui.time.value = state.time; return; }
      state.time = ui.time.value.slice(0, 5);
      save(state);
      reschedule();
    });
    paint();
  }
  function paint() {
    if (!ui) return;
    ui.on.checked = state.on;
    ui.time.value = state.time;
    ui.time.disabled = !state.on;
    var msg;
    if (!state.on) msg = "Off. Turn it on to get a nudge at the time you choose.";
    else if (denied) msg = "Notifications are turned off for Daily Turkish. Turn them on in the iPhone's Settings, under Notifications › Daily Turkish.";
    else if (next) msg = "Next reminder " + when(next) + ". If you don't open the app for two weeks, the reminders stop.";
    else msg = "On. Today's goal is met, so the next reminder is tomorrow.";
    ui.help.textContent = msg;
  }

  mount();
  reschedule();
  TRK.store.onChange(soon);
  document.addEventListener("visibilitychange", function () {
    if (document.visibilityState === "visible") { state = load(); reschedule(); }
  });
})();
