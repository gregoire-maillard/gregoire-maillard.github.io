/* Daily Turkish app only (app/src/turkish-app.js): the daily reminder, and no online profile.
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

  // ── No online profile in the app (1.0) ──
  // The sign-in link would come back to the website, not the app, and without it the app collects no data
  // ("Data not collected" on the App Store). turkish-account.js still loads, for the characters' artwork,
  // but never fetches the sign-in library, and every way into sign-in is hidden. Progress stays on the phone.
  (function noAccount() {
    var A = TRK.account;
    if (A) {
      A.ensure = function () { return new Promise(function () {}); };   // status stays "off"; nothing is downloaded
      A.signIn = function () { return Promise.reject(new Error("Sign-in isn't available in the app.")); };
    }
    var css = document.createElement("style");
    css.textContent = "#lede-acct, .hello.invite, #pf-acct, #pf-chars, .pf-side { display: none !important; }" +
      " .pf-grid { grid-template-columns: minmax(0, 1fr) !important; } .pf-main { grid-column: 1 !important; }";
    document.head.appendChild(css);
    var STATUS = "Your progress is saved on this iPhone. Export it to keep a copy or to move it to another device.";
    var ps = document.getElementById("p-status");
    if (ps) {
      var fix = function () { if (ps.textContent !== STATUS) ps.textContent = STATUS; };
      fix();
      if (root.MutationObserver) new MutationObserver(fix).observe(ps, { childList: true, characterData: true, subtree: true });
    }
    Array.prototype.forEach.call(document.querySelectorAll("#about p"), function (p) {
      if (/Without a profile/.test(p.textContent)) {
        p.textContent = "Your progress lives on this iPhone only, and deleting the app erases it. Use Export progress in Settings to keep a copy.";
      }
    });
  })();

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
