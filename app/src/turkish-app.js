/* Daily Turkish app only (app/src/turkish-app.js): the daily reminder, Export/Import through the share sheet,
 * haptics, the status bar and the keyboard (APP-4), and a check of the no-online-profile flag.
 *
 * Not part of the website. app/scripts/build-www.mjs adds this file, Capacitor's runtime and the
 * Local Notifications plugin to the app's copy of the Turkish pages. Outside the native app
 * (a browser, the website, dailyturkish.app) it does nothing.
 *
 * What it does:
 *   - adds a "Daily reminder" card to the hub's Settings (on/off and a time, default 19:00, on since APP-9d: nothing
 *     is sent until iOS allows it, which a card on the hub offers once, and again 3 days after a "Not now");
 *   - schedules one local notification a day for the next 14 days, and skips today once the
 *     daily XP goal is met. One a day at most, chosen in plan() (APP-9e): come back after 3 quiet days (then
 *     silence), streak at risk, word of the day every other day, cards ready in the morning, else a proverb. It re-plans whenever the progress changes and whenever the app comes
 *     back to the foreground, so the skip and the streak in the text stay current. After 3 days without
 *     studying, one "come back" message, then nothing until the app is used again.
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
  // On by default (APP-9d): it only sends anything once iOS has allowed notifications, which the app offers once.
  var DEFAULT = { on: true, time: "19:00" };

  // The everyday nudges (APP-9e): Turkish proverbs with their meaning, and a few plain reminders.
  var MESSAGES = [
    { title: "Damlaya damlaya göl olur", body: "Drop by drop, a lake forms. Today's drop: one lesson or ten cards." },
    { title: "Bir lisan bir insan, iki lisan iki insan", body: "One language, one person; two languages, two people. Ready for a few minutes?" },
    { title: "Bugünün işini yarına bırakma", body: "Don't leave today's work for tomorrow. A short lesson is waiting." },
    { title: "Az olsun, öz olsun", body: "Little, but good: five focused minutes of Turkish count." },
    { title: "Emek olmadan yemek olmaz", body: "No meal without effort. Your next lesson is ready." },
    { title: "Tatlı dil yılanı deliğinden çıkarır", body: "A sweet tongue draws the snake from its hole. Time to sweeten yours?" },
    { title: "Sabreden derviş muradına ermiş", body: "The patient dervish got his wish. Keep going, a little every day." },
    { title: "Bugün biraz Türkçe?", body: "A little Turkish today? One lesson or ten flashcards is enough." },
    { title: "Tekir is waiting", body: "Your Turkish for today is ready when you are." }
  ];
  var MORNING = { h: 8, m: 30 };   // when "cards ready" goes out, unless the reminder is set earlier

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

  // Word-of-the-day days: every other learning day, by the day's date, so the alternation doesn't shift when
  // the app re-plans. "2026-11-12" → a whole number of days.
  function isWordDay(day) { var p = day.split("-"); return Math.round(Date.UTC(+p[0], +p[1] - 1, +p[2]) / 864e5) % 2 === 0; }
  // words: the deck's cards to show, in order (each { tr, en: [..], ex: { tr, en } }), or empty for reminders only.
  function wordMsg(w) {
    var en = (w.en && w.en[0]) || "";
    return { title: "Word of the day: " + w.tr, body: en + (w.ex && w.ex.tr ? " · " + w.ex.tr + (w.ex.en ? " (" + w.ex.en + ")" : "") : "") };
  }

  // The notifications to schedule, as LocalNotifications.schedule() takes them. Pure, for tests.
  // progress is TRK.progress (goal and streak views); words as for wordMsg (optional); due: reviews falling due
  // per learning day, { "2026-11-14": 23 } (optional, from TRK.srs.forecast).
  // At most one a day (APP-9e), the first that applies:
  //   1. come back: 3 days after the last day studied, one message, then nothing until the app is opened again;
  //   2. streak at risk: today if the streak is alive and today isn't done yet, else tomorrow;
  //   3. word of the day, every other day by date;
  //   4. cards ready: 10 or more reviews due that day, sent in the morning (08:30, or the reminder time if earlier);
  //   5. a proverb or a plain nudge.
  // Today is skipped once the daily goal is met.
  function plan(now, rem, course, settings, progress, words, due) {
    var t = rem && rem.on ? parseTime(rem.time) : null;
    if (!t) return [];
    var hour = typeof settings.dayStartHour === "number" ? settings.dayStartHour : 4;
    var today = dayOf(now, hour);
    var goal = progress.goal(course, settings, now), streak = progress.streak(course, settings, now);
    var base = new Date(now), out = [], wi = 0;
    words = words || []; due = due || {};
    var morning = t.h * 60 + t.m < MORNING.h * 60 + MORNING.m ? t : MORNING;
    // The day the come-back message goes out: 3 days after the last day studied (none if never studied).
    var comeback = null;
    if (streak.last) { var p = streak.last.split("-"); comeback = dayOf(new Date(+p[0], +p[1] - 1, +p[2] + 3, 12).getTime(), hour); }
    var streakDay = streak.current > 0 ? (streak.done ? null : today) : null;
    if (streak.current > 0 && streak.done) streakDay = dayOf(new Date(base.getFullYear(), base.getMonth(), base.getDate() + 1, 12).getTime(), hour);
    for (var i = 0; i <= DAYS && out.length < DAYS; i++) {
      var at = new Date(base.getFullYear(), base.getMonth(), base.getDate() + i, t.h, t.m, 0, 0);
      var day = dayOf(at.getTime(), hour), msg = null;
      if (comeback && day > comeback) break;   // after the come-back message, silence
      if (day === today && goal.met) continue;
      if (day === comeback) {
        msg = { title: "Tekir misses you", body: "It's been 3 days. Five minutes of Turkish today? Your next lesson is right where you left it." };
      } else if (day === streakDay) {
        msg = { title: "Your " + streak.current + "-day streak ends tonight", body: "One lesson or ten flashcards keeps it going." };
      } else if (isWordDay(day) && (Array.isArray(words) ? wi < words.length : words[day])) {
        msg = wordMsg(Array.isArray(words) ? words[wi++] : words[day]);
      } else if ((due[day] || 0) >= 10) {
        var n = due[day], mins = Math.max(1, Math.round(n * 20 / 60));
        var am = new Date(at.getFullYear(), at.getMonth(), at.getDate(), morning.h, morning.m, 0, 0);
        if (am.getTime() > now + 60000) {
          at = am;
          msg = { title: n + " cards are ready", body: "About " + mins + " minute" + (mins === 1 ? "" : "s") + " to review them, before they slip away." };
        }
      }
      if (at.getTime() <= now + 60000) continue;
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

  // The words for the word of the day: the deck's content words (no particles or pronouns) not studied yet, in deck
  // order (then any of them).
  var WORD_POS = { noun: 1, verb: 1, adj: 1, adv: 1, phrase: 1, interj: 1 };
  function wordsFor(deck, cards, n) {
    var seen = {};
    n = n || DAYS;
    Object.keys((cards && cards.cards) || {}).forEach(function (k) { seen[k.slice(0, 7)] = true; });
    deck = deck.filter(function (c) { return WORD_POS[c.pos] && c.ex && c.ex.tr; });
    var fresh = deck.filter(function (c) { return !seen[c.id]; });
    return (fresh.length >= n ? fresh : deck).slice(0, n);
  }
  // The word of each of the next n learning days (APP-9g), the same for the notifications and the widget, and kept
  // for its day once chosen (localStorage "trk:app:wotd", { "2026-11-14": "fc-0123" }). → { day: card }
  var WOTD = "trk:app:wotd";
  function dayWords(deck, cards, settings, now, n) {
    var hour = typeof settings.dayStartHour === "number" ? settings.dayStartHour : 4, base = new Date(now);
    var byId = {}, saved = {}, out = {}, used = {}, days = [], keep = {};
    deck.forEach(function (c) { byId[c.id] = c; });
    try { saved = JSON.parse(root.localStorage.getItem(WOTD)) || {}; } catch (e) { saved = {}; }
    for (var i = 0; i < n; i++) days.push(dayOf(new Date(base.getFullYear(), base.getMonth(), base.getDate() + i, 12).getTime(), hour));
    days.forEach(function (d) { var c = byId[saved[d]]; if (c) { out[d] = c; used[c.id] = true; } });
    var fresh = wordsFor(deck, cards, n * 2).filter(function (c) { return !used[c.id]; }), k = 0;
    days.forEach(function (d) { if (!out[d] && fresh[k]) out[d] = fresh[k++]; if (out[d]) keep[d] = out[d].id; });
    try { root.localStorage.setItem(WOTD, JSON.stringify(keep)); } catch (e) { /* chosen again next time */ }
    return out;
  }

  root.TRKApp = { plan: plan, wordsFor: wordsFor, dayWords: dayWords, KEY: KEY, FIRST_ID: FIRST_ID, DAYS: DAYS };

  // ── The tab bar (APP-9) ──
  // Four tabs at the bottom instead of the header's: Course, Flashcards (a red badge with what's left to study
  // today), Profile (the learner's character) and Settings (with About under it). On the hub, the course page and
  // the grammar guide; not in a lesson, nor while studying cards. Runs wherever <html data-app> is set, so app/www
  // shows it in a plain browser too; turkish-app.css hides the header on those pages and makes room.
  (function tabBar() {
    var T = root.TRK, doc = root.document;
    if (!T || !doc || !doc.documentElement.hasAttribute("data-app") || doc.getElementById("dock") || doc.querySelector(".app-tabs")) return;
    var path = root.location.pathname, onHub = /\/(turkish\.html|index\.html)?$/.test(path), onCards = /\/turkishcards\.html$/.test(path);
    var svg = function (body) { return '<svg viewBox="0 0 24 24" width="26" height="26" aria-hidden="true">' + body + "</svg>"; };
    var ST = 'fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round"';
    var ICONS = {
      course: svg('<path d="M2.5 9 12 4.5 21.5 9 12 13.5 2.5 9Z" ' + ST + '/><path d="M6.5 11v4.6c0 1.3 2.5 3 5.5 3s5.5-1.7 5.5-3V11" ' + ST + '/><path d="M21.5 9v5.5" ' + ST + '/>'),
      cards: svg('<rect x="3.5" y="7" width="12" height="14" rx="2.2" ' + ST + '/><path d="M8.5 3.5h9.8a2.2 2.2 0 0 1 2.2 2.2V17" ' + ST + '/>'),
      games: svg('<path d="M7.5 8.5h9a4.5 4.5 0 0 1 4.4 3.6l.8 4.2a2.4 2.4 0 0 1-4.2 2l-2-2.3h-7l-2 2.3a2.4 2.4 0 0 1-4.2-2l.8-4.2a4.5 4.5 0 0 1 4.4-3.6Z" ' + ST + '/><path d="M8 11v3.4M6.3 12.7h3.4" ' + ST + '/><circle cx="15.6" cy="11.7" r=".9" fill="currentColor"/><circle cx="17.6" cy="13.7" r=".9" fill="currentColor"/>'),
      settings: svg('<circle cx="12" cy="12" r="3" ' + ST + '/><path d="M12 2.8v2.4M12 18.8v2.4M2.8 12h2.4M18.8 12h2.4M5.5 5.5l1.7 1.7M16.8 16.8l1.7 1.7M5.5 18.5l1.7-1.7M16.8 7.2l1.7-1.7" ' + ST + '/>')
    };
    var TABS = [
      { id: "course", label: "Course", href: "/turkish.html", hub: "tab-course" },
      { id: "cards", label: "Flashcards", href: "/turkishcards.html" },
      { id: "games", label: "Games", href: "/turkish.html#games" },
      { id: "profile", label: "Profile", href: "/turkish.html#profile", hub: "tab-profile" },
      { id: "settings", label: "Settings", href: "/turkish.html#settings", hub: "tab-settings" }
    ];
    var nav = doc.createElement("nav");
    nav.className = "app-tabs";
    nav.setAttribute("aria-label", "Daily Turkish");
    nav.innerHTML = TABS.map(function (t) {
      return '<a class="app-tab" data-tab="' + t.id + '" href="' + t.href + '"><span class="app-ic">' + (ICONS[t.id] || "") +
        (t.id === "cards" ? '<span class="app-badge" hidden></span>' : "") + '</span><span class="app-lbl">' + t.label + "</span></a>";
    }).join("");
    doc.body.appendChild(nav);
    doc.documentElement.classList.add("app-tabbed");

    function current() {
      if (onCards) return "cards";
      if (!onHub) return null;
      var h = root.location.hash;
      if (h === "#settings" || h === "#about") return "settings";
      if (h === "#games") return "games";
      if (h === "#profile" || /[?&]signin=1/.test(root.location.search)) return "profile";
      return "course";
    }
    function paintCurrent() {
      var c = current();
      // Games (APP-9d) is the course view showing only your mistakes, Conversations and the TYS practice.
      doc.documentElement.classList.toggle("app-games", c === "games");
      Array.prototype.forEach.call(nav.querySelectorAll(".app-tab"), function (a) {
        if (a.dataset.tab === c) a.setAttribute("aria-current", "page"); else a.removeAttribute("aria-current");
      });
    }
    // On the hub, a tab is the hidden header tab: same view switching, history and scrolling as on the website.
    nav.addEventListener("click", function (e) {
      var a = e.target.closest(".app-tab");
      if (!a) return;
      var t = TABS.filter(function (x) { return x.id === a.dataset.tab; })[0], twin = onHub && t.hub && doc.getElementById(t.hub);
      if (onCards && t.id === "cards") { e.preventDefault(); root.scrollTo(0, 0); return; }
      if (onHub && t.id === "games") { setTimeout(function () { paintCurrent(); root.scrollTo(0, 0); }, 0); return; }
      if (!twin) return;
      e.preventDefault();
      twin.click();
      setTimeout(paintCurrent, 0);
    });
    root.addEventListener("hashchange", paintCurrent);
    root.addEventListener("popstate", function () { setTimeout(paintCurrent, 0); });
    paintCurrent();

    // The Games view's title, shown only there (turkish-app.css).
    var vc = onHub && doc.getElementById("v-course");
    if (vc && !doc.getElementById("app-games-h")) {
      vc.insertAdjacentHTML("afterbegin", '<header class="app-games-h" id="app-games-h"><h1>Games</h1>' +
        '<p>Practise your mistakes, hold a conversation in Turkish, or try the TYS practice test.</p></header>');
    }

    // Course tab: the XP and streak bar gets a third cell, your character with a word for the time of day (APP-9d).
    var today = onHub && doc.getElementById("today");
    if (today && root.MutationObserver) {
      var greet = function () {
        var stats = today.querySelector(".stats");
        if (!stats || stats.querySelector(".app-hi")) return;
        var A = T.account, id = A && A.avatarSvg ? (A.avatar && A.avatar()) || A.START : null;
        var h = new Date().getHours(), met = !!stats.querySelector(".ring.met");
        try {   // APP-9g: the flame lights up once today counts for the streak
          var sv = T.progress.streak(T.store.course(), T.store.settings(), Date.now());
          stats.classList.toggle("app-done", !!(sv.done && sv.current > 0));
        } catch (e) { /* no flame change */ }
        if (root.TRKFresh) stats.classList.add("app-fresh");
        var say = root.TRKFresh ? ["Harika!", "Great job"] : met ? ["Aferin!", "Well done"] : h >= 5 && h < 11 ? ["Günaydın!", "Good morning"] : h >= 11 && h < 17 ? ["İyi günler!", "Have a nice day"]
          : h >= 17 && h < 22 ? ["İyi akşamlar!", "Good evening"] : ["İyi geceler!", "Good night"];
        var cell = doc.createElement("a");
        cell.className = "stat app-hi";
        cell.href = "/turkish.html#profile";
        cell.setAttribute("aria-label", say[0] + " (" + say[1] + "). My profile");
        cell.title = say[1];
        cell.innerHTML = '<span class="app-hi-bub"><b lang="tr">' + say[0] + "</b></span>" +
          (id ? '<span class="app-hi-av">' + A.avatarSvg(id, 34) + "</span>" : "");
        cell.addEventListener("click", function (e) { var tw = doc.getElementById("tab-profile"); if (tw) { e.preventDefault(); tw.click(); setTimeout(paintCurrent, 0); } });
        stats.appendChild(cell);
      };
      new root.MutationObserver(greet).observe(today, { childList: true });
      greet();
      if (T.account && T.account.onChange) T.account.onChange(function () { var c = today.querySelector(".app-hi"); if (c) c.remove(); greet(); });
    }

    // Flashcards (APP-9d): the overview doesn't scroll when it fits on the screen.
    if (onCards && root.MutationObserver) {
      var fitT = null;
      var fit = function () {
        var html = doc.documentElement, bar = nav.getBoundingClientRect();
        html.classList.remove("app-still");
        if (doc.body.classList.contains("studying") || /[?&]view=(browse|stats|settings)/.test(root.location.search)) return;
        var main = doc.querySelector("main") || doc.body, last = main.lastElementChild;
        while (last && (last.offsetParent === null || !last.getBoundingClientRect().height)) last = last.previousElementSibling;
        var bottom = last ? last.getBoundingClientRect().bottom + root.scrollY : 0;
        if (bottom <= bar.top - 4) { root.scrollTo(0, 0); html.classList.add("app-still"); }
      };
      var fitSoon = function () { clearTimeout(fitT); fitT = setTimeout(fit, 120); };
      new root.MutationObserver(fitSoon).observe(doc.body, { childList: true, subtree: true, attributes: true, attributeFilter: ["class"] });
      root.addEventListener("resize", fitSoon);
      root.addEventListener("popstate", fitSoon);
      fitSoon();
    }

    // Settings tab: a two-way switch at the top, Settings | About (APP-9c). Each is its own view of the hub.
    if (onHub) ["settings", "about"].forEach(function (sec) {
      var el = doc.getElementById(sec);
      if (!el || el.querySelector(".app-seg")) return;
      var seg = doc.createElement("nav");
      seg.className = "app-seg";
      seg.setAttribute("aria-label", "Settings and About");
      seg.innerHTML = '<a href="/turkish.html#settings" data-to="tab-settings"' + (sec === "settings" ? ' aria-current="page"' : "") + ">Settings</a>" +
        '<a href="/turkish.html#about" data-to="tab-about"' + (sec === "about" ? ' aria-current="page"' : "") + ">About</a>";
      el.insertBefore(seg, el.firstChild);
      seg.addEventListener("click", function (e) {
        var a = e.target.closest("a[data-to]"), twin = a && doc.getElementById(a.dataset.to);
        if (!twin) return;
        e.preventDefault();
        twin.click();
        setTimeout(paintCurrent, 0);
      });
    });

    // Course tab: one level of the path at a time (APP-9c), the one picked in the level strip; at first the level of
    // the next lesson. The hub redraws both lists on every change, so the choice is put back after each redraw.
    var levels = onHub && doc.getElementById("levels"), strip = onHub && doc.getElementById("lvl-nav");
    if (levels && strip && root.MutationObserver) {
      var sel = null, busy = false, opened = {};   // levels opened here once: folding one again is respected
      var pick = function () {
        if (busy) return;
        busy = true;
        var all = levels.querySelectorAll("details.level");
        if (all.length) {
          var here = strip.querySelector(".lvl-chip.here");
          if (!sel || !doc.getElementById(sel)) sel = here ? here.dataset.lvl : all[0].id;
          Array.prototype.forEach.call(all, function (d) {
            var on = d.id === sel;
            d.classList.toggle("app-sel", on);
            if (on && !d.open && !opened[d.id]) { opened[d.id] = true; d.open = true; }
          });
          Array.prototype.forEach.call(strip.querySelectorAll(".lvl-chip"), function (c) {
            c.classList.toggle("app-sel", c.dataset.lvl === sel);
            if (c.dataset.lvl === sel) c.setAttribute("aria-current", "true"); else c.removeAttribute("aria-current");
          });
          Array.prototype.forEach.call(levels.querySelectorAll("li.unit"), function (li) { if (unitOpen[li.id]) li.classList.add("app-open"); });
          // "Jump here" (APP-9g): only on the next locked unit, said plainly
          Array.prototype.forEach.call(levels.querySelectorAll('.uacts a[href*="?test="]'), function (a, k) {
            if (k === 0) { a.classList.add("app-jump"); a.textContent = "Already know this? Take the test"; }
            else a.classList.add("app-jump-off");
          });
        }
        busy = false;
      };
      var mo = new root.MutationObserver(function () { mo.disconnect(); pick(); watch(); });
      var watch = function () { mo.observe(levels, { childList: true }); mo.observe(strip, { childList: true }); };
      // APP-9h: a unit shown as one row opens in full when tapped (its links still work as links); again to fold it.
      var unitOpen = {};
      levels.addEventListener("click", function (e) {
        var li = e.target.closest("li.unit"), card = li && e.target.closest(".ucard");
        if (!card || li.classList.contains("is-here") || e.target.closest("a, button")) return;
        unitOpen[li.id] = !li.classList.contains("app-open");
        li.classList.toggle("app-open", unitOpen[li.id]);
      });
      strip.addEventListener("click", function (e) {
        var c = e.target.closest(".lvl-chip");
        if (!c) return;
        e.preventDefault();   // no jump: the level shows in place
        sel = c.dataset.lvl;
        delete opened[sel];
        mo.disconnect(); pick(); watch();
      });
      // A link to a unit (#a1-u05) shows its level.
      root.addEventListener("hashchange", function () {
        var m = /^#([a-c][12])(-u\d\d)?$/.exec(root.location.hash);
        if (!m) return;
        sel = m[1];
        mo.disconnect(); pick(); watch();
      });
      pick(); watch();
    }

    // Profile: the chosen character, Tekir until another is picked (turkish-account.js).
    function paintAvatar() {
      var A = T.account, ic = nav.querySelector('[data-tab="profile"] .app-ic');
      if (!ic) return;
      var id = A && A.avatarSvg ? (A.avatar && A.avatar()) || A.START : null;
      var sig = id || "none";
      if (ic.dataset.sig === sig) return;
      ic.dataset.sig = sig;
      ic.innerHTML = id ? '<span class="app-av">' + A.avatarSvg(id, 28) + "</span>"
        : svg('<circle cx="12" cy="8.5" r="3.8" ' + ST + '/><path d="M4.5 20.5c.8-3.8 3.8-6 7.5-6s6.7 2.2 7.5 6" ' + ST + '/>');
    }
    paintAvatar();
    if (T.account && T.account.onChange) T.account.onChange(paintAvatar);

    // Flashcards: today's cards still to study (learning, reviews and new), as on the hub's card.
    var badge = nav.querySelector(".app-badge"), deck = null, index = null, btimer = null;
    function paintBadge() {
      if (!deck || !index) return;
      var n = 0;
      try {
        var store = T.store;
        n = T.srs.queue({ deck: deck, cards: store.cards(), settings: store.settings(), course: store.course(), index: index }, Date.now()).counts.total;
      } catch (e) { n = 0; }
      badge.hidden = !n;
      badge.textContent = n > 99 ? "99+" : String(n);
      nav.querySelector('[data-tab="cards"]').setAttribute("aria-label", "Flashcards" + (n ? ", " + n + " to study today" : ""));
    }
    function badgeSoon() { clearTimeout(btimer); btimer = setTimeout(paintBadge, 300); }
    if (T.data && T.srs) {
      Promise.all([T.data.index(), T.data.deck()]).then(function (r) { index = r[0]; deck = r[1]; paintBadge(); }).catch(function () {});
      if (T.store && T.store.onChange) T.store.onChange(badgeSoon);
      doc.addEventListener("visibilitychange", function () { if (doc.visibilityState === "visible") paintBadge(); });
      setInterval(paintBadge, 60000);   // learning cards fall due during the day
    }
  })();

  // ── APP-9g: flow, look and content touches, on every app page (the website never has <html data-app>) ──
  (function extras() {
    var T = root.TRK, doc = root.document;
    if (!T || !doc || !doc.documentElement.hasAttribute("data-app")) return;
    var html = doc.documentElement, path = root.location.pathname;
    var onHub = /\/(turkish\.html|index\.html)?$/.test(path), onCards = /\/turkishcards\.html$/.test(path);
    var onLesson = /\/turkishlesson\.html$/.test(path), onGuide = /\/turkishguide\.html$/.test(path);
    var store = T.store;
    function ls(k, v) {
      try { if (arguments.length > 1) { root.localStorage.setItem(k, JSON.stringify(v)); return v; } return JSON.parse(root.localStorage.getItem(k)); }
      catch (e) { return null; }
    }
    function esc(x) { return T.esc ? T.esc(String(x)) : String(x).replace(/[&<>"]/g, function (c) { return { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c]; }); }
    function avatar(size) {
      var A = T.account, id = A && A.avatarSvg ? (A.avatar && A.avatar()) || A.START : null;
      return id ? A.avatarSvg(id, size) : "";
    }
    function watch(el, fn) {   // fn after each redraw of el's children (and once now)
      if (!el || !root.MutationObserver) return;
      var busy = false, mo = new root.MutationObserver(function () { if (busy) return; busy = true; mo.disconnect(); try { fn(); } finally { mo.observe(el, { childList: true, subtree: true }); busy = false; } });
      fn(); mo.observe(el, { childList: true, subtree: true });
    }
    function buzz(kind) {   // haptics when the native plugin is there (turkish-app.js's own switch decides in lessons)
      try {
        var on = ls("trk:app:haptics"); if (on && on.on === false) return;
        var C = root.Capacitor, H = C && C.isPluginAvailable && C.isPluginAvailable("Haptics") ? C.registerPlugin("Haptics") : null;
        if (!H) return;
        if (kind === "right") H.impact({ style: "LIGHT" }); else if (kind === "wrong") H.notification({ type: "WARNING" }); else H.notification({ type: "SUCCESS" });
      } catch (e) { /* no haptics */ }
    }

    // 3. New cards come from finished units by default in the app, once (the learner can turn it off in Settings).
    if (!ls("trk:app:taught")) { ls("trk:app:taught", 1); try { store.setSettings({ onlyTaughtWords: true }); } catch (e) { /* kept as is */ } }

    // ── Hub ──
    if (onHub) {
      // A lesson just finished (sessionStorage "trk:v1:fresh", read by the hub after this script): a warmer greeting
      // and the XP ring filling up again (turkish-app.js's top bar, turkish-app.css).
      try {
        var fr = JSON.parse(root.sessionStorage.getItem("trk:v1:fresh") || "null");
        if (fr && Date.now() - fr.t < 30 * 60 * 1000) { root.TRKFresh = true; setTimeout(function () { root.TRKFresh = false; }, 6000); }
      } catch (e) { /* no greeting change */ }

      // Settings: the flashcards' note from their old Settings view, and a small Backup box (Export, Import; no Reset).
      Array.prototype.forEach.call(doc.querySelectorAll("#settings fieldset.set"), function (fs) {
        var lg = fs.querySelector("legend");
        if (!lg) return;
        if (lg.textContent === "Flashcards" && !fs.querySelector(".app-ivl")) {
          fs.insertAdjacentHTML("beforeend", '<p class="help app-ivl">A card started today comes back after 1 and 10 minutes, then the next day, then at growing intervals: Anki\'s settings.</p>');
        }
        if (fs.classList.contains("wide") && !fs.querySelector(".app-backup")) {
          lg.textContent = "Backup";
          var st = fs.querySelector("#p-status");
          if (st) st.insertAdjacentHTML("afterend", '<p class="help app-backup" style="margin-top:0">Keep a copy of your progress in Files, or bring one back. With a profile, it\'s also saved online.</p>');
        }
      });

      // First launch: a welcome from the character, straight into lesson 1.
      var welcomed = ls("trk:app:welcomed");
      if (!welcomed && !Object.keys(store.course().lessons || {}).length) {
        var w = doc.createElement("div");
        w.className = "app-welcome";
        w.setAttribute("role", "dialog");
        w.setAttribute("aria-label", "Welcome");
        w.innerHTML = '<div class="app-welcome-in"><div class="app-welcome-pic">' + avatar(132) + '<span class="app-welcome-bub" lang="tr">Merhaba!</span></div>' +
          "<h1>Ready for your first Turkish lesson?</h1><p>Five minutes, a few short exercises, and you'll say hello and goodbye like a local.</p>" +
          '<a class="app-welcome-go" href="/turkishlesson.html?id=a1-u01-l01">Start lesson 1</a><button type="button" class="app-welcome-skip">Look around first</button></div>';
        doc.body.appendChild(w);
        T.data.index().then(function (ix) {
          var n = T.path.nextLesson(ix, store.course());
          if (n) w.querySelector(".app-welcome-go").href = "/turkishlesson.html?id=" + n.id;
        }).catch(function () {});
        w.querySelector(".app-welcome-go").addEventListener("click", function () { ls("trk:app:welcomed", 1); });
        w.querySelector(".app-welcome-skip").addEventListener("click", function () { ls("trk:app:welcomed", 1); w.classList.add("out"); setTimeout(function () { w.remove(); }, 300); });
      }

      // Games: the mistakes card stays (with a cheer when there are none), and a Speed round.
      var today = doc.getElementById("today");
      watch(today, function () {
        if (!today.querySelector(".stats")) return;   // not drawn yet
        if (!today.querySelector(".mis-mini")) {
          today.insertAdjacentHTML("beforeend", '<div class="card mini mis-mini app-nomis"><div class="row"><h3>Your mistakes</h3></div><p class="counts">No mistakes to practise. 🎉 Exercises you miss come back here.</p></div>');
        }
        if (!today.querySelector(".speed-mini")) {
          var best = ls("trk:app:speed");
          today.insertAdjacentHTML("beforeend", '<div class="card mini speed-mini"><div class="row"><h3>Speed round</h3><span class="lmeta">60 s</span></div>' +
            '<p class="counts">Ten words against the clock: pick the right meaning, fast.' + (best && best.best ? " Your best: <b>" + best.best + "/10</b>." : "") + "</p>" +
            '<button type="button" class="btn primary" data-app="speed">Play</button></div>');
        }
      });
      if (today) today.addEventListener("click", function (e) { if (e.target.closest('[data-app="speed"]')) speedRound(); });

      // My Profile: the next three achievements, the rest behind "See all"; calendar, progress and levels fold.
      var dash = doc.getElementById("pf-dash"), showAll = false, opened = {};
      watch(dash, function () {
        var card = dash.querySelector("#pf-s-ach .card");
        if (card && !card.querySelector(".app-next")) {
          var all = Array.prototype.slice.call(card.querySelectorAll("ul.ach > li"));
          var left = all.filter(function (li) { return !li.classList.contains("on"); }).map(function (li) {
            var m = /([\d,]+)\s*\/\s*([\d,]+)/.exec((li.querySelector(".a-n") || {}).textContent || "");
            var have = m ? +m[1].replace(/,/g, "") : 0, need = m ? +m[2].replace(/,/g, "") : 1;
            return { li: li, r: need ? have / need : 0 };
          }).sort(function (a, b) { return b.r - a.r; }).slice(0, 3);
          var head = card.querySelector(".pf-card-h");
          var box = doc.createElement("div");
          box.className = "app-next";
          box.innerHTML = left.length ? '<p class="ach-grp">Next up</p><ul class="ach"></ul>' : '<p class="ach-grp">Every achievement is yours. Tebrikler!</p>';
          left.forEach(function (x) { box.querySelector("ul").appendChild(x.li.cloneNode(true)); });
          if (head) head.insertAdjacentElement("afterend", box);
          var more = doc.createElement("button");
          more.type = "button";
          more.className = "app-seeall";
          card.appendChild(more);
          var paint = function () { card.classList.toggle("app-ach-all", showAll); more.textContent = showAll ? "Show less" : "See all " + all.length + " achievements"; };
          more.addEventListener("click", function () { showAll = !showAll; paint(); });
          paint();
        }
        ["pf-s-calendar", "pf-s-yours", "pf-s-levels"].forEach(function (id) {
          var c = dash.querySelector("#" + id + " .card");
          if (!c || c.dataset.appFold) return;
          var h = c.firstElementChild;
          if (!h) return;
          c.dataset.appFold = "1";
          c.classList.toggle("app-folded", !opened[id]);
          h.classList.add("app-fold-h");
          h.setAttribute("role", "button");
          h.setAttribute("tabindex", "0");
          h.setAttribute("aria-expanded", String(!!opened[id]));
          var flip = function () { opened[id] = !opened[id]; c.classList.toggle("app-folded", !opened[id]); h.setAttribute("aria-expanded", String(!!opened[id])); };
          h.addEventListener("click", flip);
          h.addEventListener("keydown", function (e) { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); flip(); } });
        });
      });
    }

    // ── Speed round (Games) ──
    function speedRound() {
      if (doc.querySelector(".app-speed")) return;
      var ov = doc.createElement("div");
      ov.className = "app-speed";
      ov.setAttribute("role", "dialog");
      ov.setAttribute("aria-label", "Speed round");
      ov.innerHTML = '<div class="sp-top"><button type="button" class="sp-x" aria-label="Close">✕</button><div class="sp-time"><i></i></div><span class="sp-n">0/10</span></div><div class="sp-body"><p class="sp-load">Shuffling the words…</p></div>';
      doc.body.appendChild(ov);
      html.classList.add("app-speeding");
      var close = function () { clearInterval(tick); ov.remove(); html.classList.remove("app-speeding"); };
      ov.querySelector(".sp-x").addEventListener("click", close);
      var tick = null;
      Promise.all([T.data.deck(), T.data.index()]).then(function (r) {
        var deck = r[0].filter(function (c) { return c.en && c.en.length && c.tr; }), ix = r[1], course = store.course(), cards = store.cards().cards || {};
        var seen = {}; Object.keys(cards).forEach(function (k) { seen[k.slice(0, 7)] = true; });
        var pool = deck.filter(function (c) { return seen[c.id]; });
        if (pool.length < 12) pool = pool.concat(deck.filter(function (c) { return !seen[c.id] && c.unit && T.path.unitDone(ix, course, c.unit); }));
        if (pool.length < 12) pool = pool.concat(deck.slice(0, 60));
        var uniq = {}; pool = pool.filter(function (c) { if (uniq[c.id]) return false; uniq[c.id] = 1; return true; });
        var shuffle = function (a) { for (var i = a.length - 1; i > 0; i--) { var j = Math.floor(Math.random() * (i + 1)), t = a[i]; a[i] = a[j]; a[j] = t; } return a; };
        var gloss = function (c) { return String(c.en[0]).split(/[;,(]/)[0].trim(); };
        var qs = shuffle(pool.slice()).slice(0, 10).map(function (c) {
          var same = shuffle(deck.filter(function (d) { return d.pos === c.pos && d.id !== c.id && gloss(d) !== gloss(c); })).slice(0, 3);
          return { c: c, opts: shuffle([c].concat(same)) };
        });
        var k = 0, right = 0, t0 = Date.now(), LIMIT = 60000, done = false;
        var body = ov.querySelector(".sp-body"), bar = ov.querySelector(".sp-time i"), nEl = ov.querySelector(".sp-n");
        tick = setInterval(function () {
          var left = Math.max(0, LIMIT - (Date.now() - t0));
          bar.style.width = (100 * left / LIMIT) + "%";
          ov.classList.toggle("sp-hurry", left < 10000);
          if (!left) finish();
        }, 100);
        function show() {
          if (k >= qs.length) return finish();
          var q = qs[k];
          nEl.textContent = k + "/" + qs.length;
          body.innerHTML = '<p class="sp-k">What does it mean?</p><p class="sp-w" lang="tr">' + esc(q.c.tr) + "</p>" +
            '<div class="sp-opts">' + q.opts.map(function (o, i) { return '<button type="button" data-i="' + i + '">' + esc(gloss(o)) + "</button>"; }).join("") + "</div>";
          body.querySelectorAll(".sp-opts button").forEach(function (b) {
            b.addEventListener("click", function () {
              if (done || body.dataset.lock) return;
              body.dataset.lock = "1";
              var ok = q.opts[+b.dataset.i] === q.c;
              b.classList.add(ok ? "ok" : "bad");
              if (!ok) body.querySelectorAll(".sp-opts button")[q.opts.indexOf(q.c)].classList.add("ok");
              if (ok) right++;
              buzz(ok ? "right" : "wrong");
              setTimeout(function () { delete body.dataset.lock; k++; show(); }, ok ? 350 : 900);
            });
          });
        }
        function finish() {
          if (done) return;
          done = true;
          clearInterval(tick);
          var secs = Math.round((Date.now() - t0) / 1000), best = ls("trk:app:speed") || {};
          var record = right > (best.best || 0) || (right === best.best && right && secs < (best.secs || 999));
          if (record) ls("trk:app:speed", { best: right, secs: secs });
          var xp = right;
          if (xp) { try { store.update("course", function (c) { T.progress.addXp(c, store.settings(), xp, Date.now()); }); } catch (e) { xp = 0; } }
          buzz("finish");
          nEl.textContent = "";
          bar.parentNode.style.visibility = "hidden";
          body.innerHTML = '<div class="sp-end">' + avatar(84) + '<p class="sp-score">' + right + "/" + qs.length + "</p>" +
            "<p>" + (right === qs.length ? "Mükemmel! Every word right" : right >= 7 ? "Harika! Well played" : right >= 4 ? "İyi! Keep going" : "Bir daha? Try again") +
            " · " + secs + " s" + (xp ? " · +" + xp + " XP" : "") + "</p>" +
            (record ? '<p class="sp-rec">New best score!</p>' : best.best ? "<p class=\"sp-best\">Your best: " + best.best + "/10</p>" : "") +
            '<div class="sp-acts"><button type="button" class="btn primary" data-sp="again">Play again</button><button type="button" class="btn" data-sp="done">Done</button></div></div>';
          body.querySelector('[data-sp="again"]').addEventListener("click", function () { close(); speedRound(); });
          body.querySelector('[data-sp="done"]').addEventListener("click", close);
        }
        show();
      }).catch(function () { ov.querySelector(".sp-body").innerHTML = '<p class="sp-load">The words couldn\'t be loaded. Try again in a moment.</p>'; });
    }

    // ── Lesson page ──
    if (onLesson) {
      var q = root.location.search, toGames = /[?&](dialogue|exam|practice)\b/.test(q);
      var stage = doc.getElementById("stage") || doc.body;
      watch(stage, function () {
        // After a conversation, the TYS or practising mistakes, the way back is to Games.
        if (toGames) Array.prototype.forEach.call(stage.querySelectorAll('a[href="/turkish.html"]'), function (a) {
          if (/Back to the course/.test(a.textContent)) { a.href = "/turkish.html#games"; a.textContent = "Back to Games"; }
        });
        // The start screen: three new words, the rest one tap away; no "Card" links.
        var wl = stage.querySelector(".start .wlist");
        if (wl && !wl.dataset.appFold && wl.children.length > 4) {
          wl.dataset.appFold = "1";
          var more = wl.children.length - 3;
          wl.classList.add("app-folded");
          var li = doc.createElement("li");
          li.className = "app-more";
          li.innerHTML = '<button type="button">+ ' + more + " more word" + (more === 1 ? "" : "s") + "</button>";
          wl.appendChild(li);
          li.querySelector("button").addEventListener("click", function () { wl.classList.remove("app-folded"); li.remove(); });
        }
        // The "no Turkish voice" note: once, then only in Settings.
        if (stage.querySelector(".voice-note")) {
          if (ls("trk:app:voice-told")) html.classList.add("app-voice-told"); else ls("trk:app:voice-told", 1);
        }
        // The conversations list: whether you've reached each scene's unit yet.
        var dl = stage.querySelectorAll(".dl-cards .dl-after:not([data-app])");
        if (dl.length) T.data.index().then(function (ix) {
          var course = store.course();
          Array.prototype.forEach.call(dl, function (el) {
            el.dataset.app = "1";
            var a = el.querySelector("a[href]"), m = a && /#([a-c][12]-u\d\d)/.exec(a.getAttribute("href"));
            if (!m) return;
            var ready = T.path.unitDone(ix, course, m[1]);
            el.classList.add(ready ? "app-ready" : "app-later");
            if (ready) el.firstChild.textContent = "✓ You're ready: after ";
          });
        }).catch(function () {});
      });
    }

    // ── Grammar guides and interludes: a way back, and the colour legend behind a button ──
    if (onGuide) {
      var main = doc.getElementById("main"), rail = doc.getElementById("rail") || main;
      var addBack = function () {   // the guide redraws its rail, so the link is put back after each redraw
        if (!rail || rail.querySelector(".app-back")) return;
        var back = doc.createElement("a");
        back.className = "app-back";
        back.href = "/turkish.html";
        back.innerHTML = '<svg viewBox="0 0 20 20" width="20" height="20" aria-hidden="true"><path d="M12.5 4.5 7 10l5.5 5.5" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/></svg>Back';
        back.addEventListener("click", function (e) {
          var ref = doc.referrer || "";
          if (root.history.length > 1 && (!ref || ref.indexOf(root.location.host) >= 0)) { e.preventDefault(); root.history.back(); }
        });
        rail.insertBefore(back, rail.firstChild);
      };
      watch(rail, function () {
        addBack();
        var lg = rail && rail.querySelector(".legend:not([data-app])");
        if (!lg) return;
        lg.dataset.app = "1";
        var b = doc.createElement("button");
        b.type = "button";
        b.className = "app-legend-btn";
        b.setAttribute("aria-expanded", "false");
        b.innerHTML = '<span aria-hidden="true">ⓘ</span> Colours in the examples';
        lg.parentNode.insertBefore(b, lg);
        b.addEventListener("click", function () { var on = !lg.classList.contains("app-show"); lg.classList.toggle("app-show", on); b.setAttribute("aria-expanded", String(on)); });
      });
    }

    // ── Flashcards ──
    if (onCards) {
      // Their settings live in the app's Settings tab now.
      if (/[?&]view=settings\b/.test(root.location.search)) { root.location.replace("/turkish.html#settings"); return; }
      doc.addEventListener("click", function (e) {
        var a = e.target.closest && e.target.closest('a[data-view="settings"]');
        if (a) { e.preventDefault(); e.stopImmediatePropagation(); root.location.href = "/turkish.html#settings"; }
      }, true);
      // The start card: how long today's cards take.
      var rv = doc.getElementById("v-review");
      watch(rv, function () {
        var b = rv.querySelector('[data-act="study"]');
        if (!b || b.disabled || b.querySelector(".app-min")) return;
        var n = 0;
        Array.prototype.forEach.call(rv.querySelectorAll(".due3 .num"), function (x) { n += +x.textContent || 0; });
        if (!n) return;
        var min = Math.max(1, Math.round(n * 12 / 60));
        b.insertAdjacentHTML("beforeend", '<small class="app-min">' + n + " card" + (n === 1 ? "" : "s") + " · about " + min + " min</small>");
      });
      // Statistics: one sentence and the two charts; the rest behind "Details".
      var sb = doc.getElementById("s-body"), details = false;
      watch(sb, function () {
        if (!sb || !sb.querySelector(".sgrid") || sb.querySelector(".app-says")) return;
        var say = "Study a few days and you'll see here how well you remember your words.";
        try {
          var r = T.srs.retention(store.cards(), Date.now(), store.settings(), 30).all;
          if (r.reviews >= 10 && r.rate != null) say = "You remember about <b>" + Math.round(r.rate * 10) + " out of 10</b> words you review.";
        } catch (e) { /* the default sentence */ }
        sb.insertAdjacentHTML("afterbegin", '<p class="app-says">' + say + "</p>");
        var btn = doc.createElement("button");
        btn.type = "button";
        btn.className = "app-details";
        sb.appendChild(btn);
        var paint = function () { sb.classList.toggle("app-all", details); btn.textContent = details ? "Fewer details" : "Details: retention and card counts"; };
        btn.addEventListener("click", function () { details = !details; paint(); });
        paint();
      });
    }
  })();

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

  // ── The home-screen widget (APP-9g): the streak and the word of each of the next 7 days, handed to the native
  //    WidgetBridge (App/SceneDelegate.swift), which keeps them in the App Group the widget reads. ──
  var WidgetBridge = plugin("WidgetBridge"), wTimer = null;
  function widgetUpdate() {
    if (!WidgetBridge) return;
    TRK.data.deck().then(function (deck) {
      var course = tstore.course(), settings = tstore.settings(), now = Date.now();
      var map = dayWords(deck, tstore.cards(), settings, now, 7), words = [];
      Object.keys(map).sort().forEach(function (d) {
        var c = map[d]; words.push({ day: d, tr: c.tr, en: String((c.en && c.en[0]) || "") });
      });
      var sk = course.streak || {};
      var data = { streak: sk.current || 0, last: sk.last || null, hour: typeof settings.dayStartHour === "number" ? settings.dayStartHour : 4, words: words };
      return WidgetBridge.update({ json: JSON.stringify(data) });
    }).catch(function (e) { if (root.console) console.warn("Daily Turkish widget:", e); });
  }
  if (WidgetBridge) {
    widgetUpdate();
    tstore.onChange(function () { clearTimeout(wTimer); wTimer = setTimeout(widgetUpdate, 800); });
    document.addEventListener("visibilitychange", function () { if (document.visibilityState === "hidden") widgetUpdate(); });
  }

  var LN = root.capacitorLocalNotifications && root.capacitorLocalNotifications.LocalNotifications;
  if (!LN) return;

  var state = load(), denied = false, notAsked = false, next = null, ui = null;
  var chain = Promise.resolve();

  function allIds() {
    var a = [];
    for (var i = 0; i < DAYS; i++) a.push({ id: FIRST_ID + i });
    return a;
  }
  function run() {
    return LN.cancel({ notifications: allIds() }).then(function () {
      next = null;
      if (!state.on) { denied = false; notAsked = false; return; }
      return LN.checkPermissions().then(function (p) {
        notAsked = /^prompt/.test(p.display);   // on by default, but iOS hasn't been asked: the switch shows off
        denied = p.display !== "granted";
        if (denied) return;
        var store = TRK.store;
        return TRK.data.deck().catch(function () { return []; }).then(function (deck) {
          var due = {};
          try {
            TRK.srs.forecast({ deck: deck, cards: store.cards(), settings: store.settings() }, Date.now(), DAYS + 1)
              .forEach(function (d) { due[d.day] = d.young + d.mature; });
          } catch (e) { due = {}; }
          var list = plan(Date.now(), state, store.course(), store.settings(), TRK.progress, dayWords(deck, store.cards(), store.settings(), Date.now(), DAYS + 1), due);
          next = list.length ? list[0].schedule.at : null;
          return list.length ? LN.schedule({ notifications: list }) : null;
        });
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
      '<small>A word of the day and a nudge to study, on alternate days; skipped once today\'s goal is met</small></span></label>' +
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
    ui.on.checked = state.on && !notAsked;
    ui.time.value = state.time;
    ui.time.disabled = !state.on || notAsked;
    var msg;
    if (!state.on || notAsked) msg = "Off. Turn it on to get a word of the day or a nudge at the time you choose.";
    else if (denied) msg = "Notifications are turned off for Daily Turkish. Turn them on in the iPhone's Settings, under Notifications › Daily Turkish.";
    else if (next) msg = "Next reminder " + when(next) + ". After 3 days without studying, you get one last nudge, then nothing until you're back.";
    else msg = "On. Today's goal is met, so the next reminder is tomorrow.";
    ui.help.textContent = msg;
  }

  mount();
  reschedule();

  // The offer (APP-9d): on the hub, while iOS hasn't been asked yet, a card above the tab bar proposes the reminders.
  // "Turn on" brings up iOS's own question; "Not now" asks again 3 days later, twice at most.
  var ASK = "trk:app:ask";
  function offer() {
    if (!/\/(turkish\.html|index\.html)?$/.test(root.location.pathname) || document.querySelector(".app-ask, .app-welcome") || !state.on) return;
    var asked = null;
    try { asked = JSON.parse(root.localStorage.getItem(ASK)); } catch (e) { asked = null; }
    asked = asked && typeof asked.n === "number" ? asked : { n: 0, t: 0 };
    if (asked.n >= 2 || Date.now() - asked.t < 3 * 864e5) return;
    LN.checkPermissions().then(function (p) {
      if (!/^prompt/.test(p.display)) return;
      var A = TRK.account, id = A && A.avatarSvg ? (A.avatar && A.avatar()) || A.START : null;
      var box = document.createElement("div");
      box.className = "app-ask";
      box.setAttribute("role", "dialog");
      box.setAttribute("aria-label", "Daily reminders");
      box.innerHTML = (id ? '<span class="app-ask-av">' + A.avatarSvg(id, 44) + "</span>" : "") +
        '<div><b>A little Turkish every day?</b>One notification a day at ' + state.time + ': a word of the day, or a nudge to keep your streak. ' +
        'Change the time or turn it off in Settings.<div class="app-ask-btns"><button type="button" class="yes">Turn on reminders</button>' +
        '<button type="button" class="no">Not now</button></div></div>';
      document.body.appendChild(box);
      var done = function () { box.remove(); };
      box.querySelector(".no").addEventListener("click", function () {
        try { root.localStorage.setItem(ASK, JSON.stringify({ n: asked.n + 1, t: Date.now() })); } catch (e) { /* asked again next time */ }
        done();
      });
      box.querySelector(".yes").addEventListener("click", function () {
        try { root.localStorage.setItem(ASK, JSON.stringify({ n: 2, t: Date.now() })); } catch (e) { /* fine */ }
        done();
        LN.requestPermissions().then(function (r) { denied = r.display !== "granted"; state.on = true; save(state); }, function () {}).then(reschedule);
      });
    }).catch(function () {});
  }
  setTimeout(offer, 2500);   // after the splash and the first look at the course
  TRK.store.onChange(soon);
  document.addEventListener("visibilitychange", function () {
    if (document.visibilityState === "visible") { state = load(); reschedule(); if (root.TRKSplash) root.TRKSplash(); }
  });
})();
