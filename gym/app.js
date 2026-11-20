/* /gym — app UI. Vanilla JS, data in localStorage (key "gym.v2"). */
(function () {
  'use strict';
  const PLAN = window.GYM_PLAN, C = window.GymCore, M = window.GymMoves;
  const LS = 'gym.v2';
  const DAYN = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
  const MUSCLE = { chest: 'Chest', back: 'Back', lowerBack: 'Lower back', shoulders: 'Shoulders', biceps: 'Biceps', triceps: 'Triceps', abs: 'Abs', glutes: 'Glutes', quads: 'Quads', hamstrings: 'Hamstrings', calves: 'Calves', hipFlexors: 'Hip flexors', forearms: 'Forearms' };
  const $ = (s, el) => (el || document).querySelector(s);
  const esc = s => String(s == null ? '' : s).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  const mmss = sec => { sec = Math.max(0, Math.round(sec)); return Math.floor(sec / 60) + ':' + String(sec % 60).padStart(2, '0'); };
  const today = () => C.isoDate(new Date());
  const fmtDay = iso => { const d = C.parseISO(iso); return DAYN[d.getDay()] + ' ' + d.getDate() + ' ' + d.toLocaleString('en', { month: 'short' }); };

  /* ================= state ================= */
  const DEFAULT = { v: 2, startDate: null, days: null, prefs: { sound: true, vibrate: true, theme: 'dark', character: 'gregoire' }, logs: [], swaps: {}, daySwaps: null, active: null };
  let S = load();
  function load() {
    try {
      let s = JSON.parse(localStorage.getItem(LS) || 'null');
      if (!s) s = migrate();
      const o = Object.assign({}, DEFAULT, s || {});
      o.prefs = Object.assign({}, DEFAULT.prefs, o.prefs || {});
      return o;
    } catch (e) { return JSON.parse(JSON.stringify(DEFAULT)); }
  }
  /** Bring over the start date, days, settings and session history from the first version. */
  function migrate() {
    try {
      const old = JSON.parse(localStorage.getItem('gym.v1') || 'null');
      if (!old) return null;
      return { startDate: old.startDate, days: old.days, prefs: Object.assign({}, DEFAULT.prefs, { sound: old.prefs && old.prefs.sound !== false, vibrate: old.prefs && old.prefs.vibrate !== false, theme: (old.prefs && old.prefs.theme) || 'dark' }),
        logs: (old.logs || []).map(l => ({ id: l.id, date: l.date, ts: l.ts, dur: l.dur, session: l.session, abs: l.abs, block: l.block, wib: l.wib, easy: !!l.deload,
          done: Object.fromEntries(Object.entries(l.ex || {}).map(([id, sets]) => [id, sets.length])) })) };
    } catch (e) { return null; }
  }
  function save() {
    try { localStorage.setItem(LS, JSON.stringify(S)); }
    catch (e) { toast('Could not save — storage is full or blocked'); }
  }
  if (!S.startDate) { S.startDate = C.isoDate(C.mondayOf(new Date())); save(); }

  const DAYS = () => S.days || PLAN.days;
  const nowAbs = () => C.weekIndex(S.startDate, new Date());
  const WK = abs => C.weekInfo(abs, PLAN);
  const EX = id => PLAN.exercises[id];
  const CHAR = () => (M.CHARS[S.prefs.character] ? S.prefs.character : 'gregoire');
  const figOpts = (ex, ch) => ({ cable: !!ex.cable, muscles: ex.muscles, character: ch || CHAR() });
  const muscleText = list => (list || []).slice(0, 3).map(m => MUSCLE[m] || m).join(' · ');
  const lvl = l => `<span class="lv ${l}">${esc(PLAN.levels[l].name)}</span>`;

  /* ================= program helpers ================= */
  function swapsFor(key, abs) {
    const W = WK(abs);
    const day = S.daySwaps && S.daySwaps.date === today() && S.daySwaps.key === key ? S.daySwaps.swaps : {};
    return Object.assign({}, S.swaps[W.block] || {}, day);
  }
  const slotOf = (key, slot) => PLAN.sessions[key].exercises.find(s => s.slot === slot);
  function buildSession(key, abs) {
    const W = WK(abs), sess = PLAN.sessions[key], swaps = swapsFor(key, abs);
    const time = C.sessionTime(PLAN, key, W.block, W.wib, swaps);
    const rows = sess.exercises.map((slot, i) => {
      const it = time.items[i];
      return { slot, exId: it.id, ex: EX(it.id), sets: it.sets, sec: it.sec, swapped: it.id !== slot.rotation[W.block % slot.rotation.length] };
    });
    return { key, abs, W, sess, rows, time };
  }
  function doneThisWeek(key, abs) { return S.logs.some(l => l.abs === abs && l.session === key); }
  function defaultPick() {
    const abs = nowAbs(), days = DAYS(), todayKey = days[new Date().getDay()];
    if (todayKey && !doneThisWeek(todayKey, abs)) return { key: todayKey, abs };
    const order = [1, 2, 3, 4, 5, 6, 0].filter(d => days[d]);
    for (const d of order) if (!doneThisWeek(days[d], abs)) return { key: days[d], abs };
    return { key: days[order[0]] || 'upper', abs: abs + 1 };
  }
  function dayOf(key) { const days = DAYS(); return [1, 2, 3, 4, 5, 6, 0].filter(d => days[d] === key).map(d => DAYN[d]).join('/'); }

  /* ================= audio / vibration / wake lock ================= */
  let actx = null, scheduled = [];
  function audioInit() {
    try {
      if (!actx) {
        const AC = window.AudioContext || window.webkitAudioContext;
        if (!AC) return;
        actx = new AC();
        try { if (navigator.audioSession) navigator.audioSession.type = 'transient'; } catch (e) { /* not supported */ }
      }
      if (actx.state === 'suspended') actx.resume();
    } catch (e) { /* audio unavailable */ }
  }
  function beeps(delay, n, freq) {
    if (!actx || !S.prefs.sound) return [];
    const out = [], t0 = actx.currentTime + Math.max(0, delay);
    for (let i = 0; i < n; i++) {
      const o = actx.createOscillator(), g = actx.createGain(), s = t0 + i * 0.24;
      o.type = 'sine'; o.frequency.value = i === n - 1 && n > 1 ? freq * 1.5 : freq;
      g.gain.setValueAtTime(0.0001, s);
      g.gain.exponentialRampToValueAtTime(0.6, s + 0.02);
      g.gain.exponentialRampToValueAtTime(0.0001, s + 0.2);
      o.connect(g); g.connect(actx.destination); o.start(s); o.stop(s + 0.22);
      out.push(o);
    }
    return out;
  }
  function cancelBeeps() { scheduled.forEach(o => { try { o.stop(); } catch (e) { /* already done */ } }); scheduled = []; }
  function scheduleRestBeeps(sec) {
    cancelBeeps();
    scheduled = beeps(sec, 3, 880);
    if (sec > 25) scheduled = scheduled.concat(beeps(sec - 10, 1, 520));
  }
  function buzz() {
    if (S.prefs.vibrate && navigator.vibrate) { try { navigator.vibrate([220, 120, 220]); } catch (e) { /* ignore */ } }
    document.body.classList.remove('flash'); void document.body.offsetWidth; document.body.classList.add('flash');
    setTimeout(() => document.body.classList.remove('flash'), 1300);
  }
  let wl = null, wlState = 'off';
  async function wakeOn() {
    if (!navigator.wakeLock || !navigator.wakeLock.request) { wlState = 'unsupported'; updWake(); return; }
    try {
      wl = await navigator.wakeLock.request('screen');
      wlState = 'on';
      wl.addEventListener('release', () => { wl = null; if (wlState === 'on') wlState = 'released'; updWake(); });
    } catch (e) { wlState = 'error'; }
    updWake();
  }
  function wakeOff() { const w = wl; wl = null; wlState = 'off'; try { w && w.release(); } catch (e) { /* ignore */ } }
  function updWake() {
    const el = $('#wake'); if (!el) return;
    const map = { on: ['☀︎', 'on'], unsupported: ['⚠︎ May sleep', 'warn'], error: ['⚠︎ Tap', 'warn'], released: ['⚠︎ Tap', 'warn'], off: ['☀︎', ''] };
    const [t, c] = map[wlState] || map.off;
    el.textContent = t; el.className = 'pill ' + c;
  }
  document.addEventListener('visibilitychange', () => {
    if (document.visibilityState === 'visible') { if (S.active && S.active.phase !== 'done') wakeOn(); tick(); }
  });

  /* ================= UI scaffolding ================= */
  const ui = { view: 'home', pick: null, open: {} };
  const app = () => $('#app');
  function applyTheme() { document.documentElement.dataset.theme = S.prefs.theme === 'light' ? 'light' : 'dark'; const m = $('meta[name=theme-color]'); if (m) m.content = S.prefs.theme === 'light' ? '#f6f6f3' : '#0e1215'; }
  let toastT = 0;
  function toast(msg) {
    let t = $('.toast'); if (!t) { t = document.createElement('div'); t.className = 'toast'; t.setAttribute('role', 'status'); document.body.appendChild(t); }
    t.textContent = msg; clearTimeout(toastT); toastT = setTimeout(() => t.remove(), 2200);
  }
  let sheetEl = null, scrimEl = null;
  const sheetAnims = [];
  function openSheet(html) {
    closeSheet(true);
    scrimEl = document.createElement('div'); scrimEl.className = 'scrim';
    sheetEl = document.createElement('div'); sheetEl.className = 'sheet'; sheetEl.setAttribute('role', 'dialog');
    sheetEl.innerHTML = '<div class="grab"></div>' + html;
    document.body.append(scrimEl, sheetEl);
    requestAnimationFrame(() => { scrimEl.classList.add('show'); sheetEl.classList.add('show'); });
    scrimEl.addEventListener('click', () => closeSheet());
    return sheetEl;
  }
  function closeSheet(now) {
    while (sheetAnims.length) sheetAnims.pop().stop();
    const s = sheetEl, c = scrimEl; sheetEl = scrimEl = null;
    if (!s) return;
    if (now) { s.remove(); c.remove(); return; }
    s.classList.remove('show'); c.classList.remove('show');
    setTimeout(() => { s.remove(); c.remove(); }, 260);
  }
  function ask(title, text, options) {
    return new Promise(res => {
      const el = openSheet(`<h2>${esc(title)}</h2>${text ? `<p class="muted">${esc(text)}</p>` : ''}<div class="stack" style="margin-top:14px">${options.map(o =>
        `<button class="btn big ${o.cls || ''}" data-v="${esc(o.v)}">${esc(o.label)}</button>`).join('')}<button class="btn big btn-ghost" data-v="">Cancel</button></div>`);
      el.addEventListener('click', e => { const b = e.target.closest('[data-v]'); if (!b) return; closeSheet(); res(b.dataset.v || null); });
      scrimEl.addEventListener('click', () => res(null), { once: true });
    });
  }

  /* ================= router ================= */
  function render() {
    applyTheme();
    document.body.classList.toggle('in-workout', !!S.active);
    if (S.active) { renderWorkout(); return; }
    killAnim();
    if (ui.view === 'history') renderHistory();
    else if (ui.view === 'settings') renderSettings();
    else renderHome();
  }
  const navHTML = () => `<nav class="nav" aria-label="Main">
      <button data-act="nav" data-v="home" class="${ui.view === 'home' ? 'on' : ''}"><i>◎</i>Today</button>
      <button data-act="nav" data-v="history" class="${ui.view === 'history' ? 'on' : ''}"><i>☰</i>History</button>
      <button data-act="nav" data-v="settings" class="${ui.view === 'settings' ? 'on' : ''}"><i>⚙︎</i>Settings</button></nav>`;

  /* ================= home ================= */
  function renderHome() {
    if (!ui.pick) ui.pick = defaultPick();
    const cur = nowAbs(), P = ui.pick, B = buildSession(P.key, P.abs);
    const days = DAYS(), todayKey = days[new Date().getDay()];
    const keys = Object.keys(PLAN.sessions).sort((a, b) => {
      const da = [1, 2, 3, 4, 5, 6, 0].findIndex(d => days[d] === a), db = [1, 2, 3, 4, 5, 6, 0].findIndex(d => days[d] === b);
      return (da < 0 ? 9 : da) - (db < 0 ? 9 : db);
    });
    const W = B.W, isNow = P.abs === cur, done = doneThisWeek(P.key, P.abs);
    let h = `<div class="top"><div><h1>Gym</h1><div class="date">${fmtDay(today())}${todayKey ? '' : ' · rest day'}</div></div></div>`;
    h += `<div class="weekbar"><button class="icon-btn" data-act="wk" data-v="-1" aria-label="Previous week" ${P.abs <= 0 ? 'disabled' : ''}>‹</button>
      <div class="mid"><b>Week ${W.wib + 1} · ${esc(W.cfg.name)}</b><span>Block ${W.block + 1}${isNow ? ' · <i class="now-tag">this week</i>' : ''}</span></div>
      <button class="icon-btn" data-act="wk" data-v="1" aria-label="Next week">›</button></div>`;
    h += `<div class="chips">${keys.map(k => `<button class="chip ${k === P.key ? 'on' : ''}" data-act="pick" data-v="${k}"><b>${esc(PLAN.sessions[k].name)}${doneThisWeek(k, P.abs) ? ' <span class="ok">✓</span>' : ''}</b><small>${dayOf(k) || 'any day'}</small></button>`).join('')}</div>`;
    h += `<div class="card"><div class="card-h"><h2>${esc(B.sess.name)}${done ? ' <span class="ok">✓</span>' : ''}</h2><span class="est tnum">${Math.round(B.time.total / 60)} min</span></div>`;
    B.rows.forEach(r => {
      h += `<button class="exrow" data-act="exinfo" data-v="${r.slot.slot}"><span class="thumb">${M.frame(r.ex.anim, r.ex.prop, 0.55, figOpts(r.ex))}</span>
        <span class="grow"><span class="nm">${r.swapped ? '⇄ ' : ''}${esc(r.ex.name)}</span>
        <span class="sets">${r.sets.map(s => `<i class="lvd ${s.level}">${s.reps}</i>`).join('')}<small>${r.ex.side ? 'reps / side' : 'reps'}</small></span></span></button>`;
    });
    h += `<div class="legend">${['L', 'M', 'H'].map(l => `<span><i class="dot ${l}"></i>${PLAN.levels[l].name}</span>`).join('')}</div></div>`;
    h += `<div class="startbar"><div><button class="btn btn-primary big" data-act="start">${isNow ? 'Start' : 'Start · logs as Week ' + (W.wib + 1)}</button></div></div>`;
    app().innerHTML = h + navHTML();
    const pk = P.key + ':' + P.abs + ':' + CHAR();
    if (!prefetched[pk] && navigator.onLine !== false) {
      prefetched[pk] = 1;
      setTimeout(() => prefetchSession({ key: P.key, character: CHAR(), exs: B.rows.map(r => ({ exId: r.exId })) }), 1500);
    }
  }
  const prefetched = {};

  /* ================= sheets: exercise info + swap, character picker ================= */
  function candidatesFor(slot, curId) {
    const ids = [];
    const add = id => { if (id && id !== curId && EX(id) && !ids.includes(id)) ids.push(id); };
    (EX(curId).alts || []).forEach(add);
    slot.rotation.forEach(add);
    return ids.slice(0, 5);
  }
  /** ctx: { key, abs, slot, inWorkout } */
  function openExercise(ctx) {
    const slot = slotOf(ctx.key, ctx.slot), W = WK(ctx.abs);
    const curId = ctx.inWorkout ? S.active.exs[S.active.ex].exId : C.exerciseFor(slot, W.block, swapsFor(ctx.key, ctx.abs));
    const ex = EX(curId), sets = C.setsFor(PLAN, ex, W.wib), planned = slot.rotation[W.block % slot.rotation.length];
    const ch = ctx.inWorkout ? S.active.character : CHAR();
    const keepOn = S.swaps[W.block] && S.swaps[W.block][ctx.slot];
    const el = openSheet(`<h2>${esc(ex.name)}</h2><div class="muscles">${esc(muscleText(ex.muscles))}</div>
      <div class="anim" id="sheetAnim"></div>
      <div class="setlist">${sets.map((s, i) => `<div class="setrow"><span>Set ${i + 1}</span><b>${s.reps} reps${ex.side ? ' / side' : ''}</b>${lvl(s.level)}</div>`).join('')}</div>
      <ul class="cues">${ex.cues.map(c => `<li>${esc(c)}</li>`).join('')}</ul>
      <div class="levels">${[...new Set(sets.map(s => s.level))].map(l => `<div>${lvl(l)} ${esc(PLAN.levels[l].hint)}</div>`).join('')}</div>
      <div class="sec-h">Machine taken? Swap for</div>
      ${curId !== planned ? `<button class="opt" data-pick="${planned}"><span class="grow"><b>↺ ${esc(EX(planned).name)}</b><small>back to the plan</small></span></button>` : ''}
      ${candidatesFor(slot, curId).map(id => { const e = EX(id); return `<button class="opt" data-pick="${id}"><span class="thumb">${M.frame(e.anim, e.prop, 0.55, figOpts(e, ch))}</span><span class="grow"><b>${esc(e.name)}</b><small>${esc(muscleText(e.muscles))}</small></span></button>`; }).join('')}
      <label class="switch"><span>Keep the swap for all of Block ${W.block + 1}</span><input type="checkbox" id="keepSwap" ${keepOn ? 'checked' : ''}></label>`);
    sheetAnims.push(M.mount($('#sheetAnim', el), ex.anim, ex.prop, figOpts(ex, ch)));
    el.addEventListener('click', e => {
      const b = e.target.closest('[data-pick]'); if (!b) return;
      applySwap(ctx, b.dataset.pick, $('#keepSwap', el).checked, planned);
      closeSheet();
    });
  }
  function applySwap(ctx, newId, keep, planned) {
    const W = WK(ctx.abs);
    if (keep) { S.swaps[W.block] = S.swaps[W.block] || {}; if (newId === planned) delete S.swaps[W.block][ctx.slot]; else S.swaps[W.block][ctx.slot] = newId; }
    else if (S.swaps[W.block] && newId === planned) delete S.swaps[W.block][ctx.slot];
    if (ctx.inWorkout) {
      const a = S.active, e = a.exs[a.ex];
      e.exId = newId; e.sets = C.setsFor(PLAN, EX(newId), W.wib);
    } else if (!keep) {
      if (!S.daySwaps || S.daySwaps.date !== today() || S.daySwaps.key !== ctx.key) S.daySwaps = { date: today(), key: ctx.key, swaps: {} };
      if (newId === planned) delete S.daySwaps.swaps[ctx.slot]; else S.daySwaps.swaps[ctx.slot] = newId;
    }
    save(); toast('Swapped to ' + EX(newId).name); render();
  }
  function openCharacterPicker() {
    const el = openSheet(`<h2>Who's training today?</h2>
      <div class="pick2">${Object.keys(M.CHARS).map(k => `<button class="who ${k === CHAR() ? 'on' : ''}" data-who="${k}"><span class="anim" id="who-${k}"></span><b>${esc(M.CHARS[k].name)}</b></button>`).join('')}</div>`);
    Object.keys(M.CHARS).forEach(k => sheetAnims.push(M.mount($('#who-' + k, el), 'bw_squat', null, { character: k, muscles: ['quads', 'glutes'] })));
    el.addEventListener('click', e => {
      const b = e.target.closest('[data-who]'); if (!b) return;
      S.prefs.character = b.dataset.who; closeSheet(true); startSession();
    });
  }

  /* ================= workout ================= */
  function startSession() {
    audioInit();
    const P = ui.pick, B = buildSession(P.key, P.abs);
    S.active = { key: P.key, abs: P.abs, character: CHAR(), startedAt: Date.now(), phase: 'warm', pIdx: 0, pStart: Date.now(),
      exs: B.rows.map(r => ({ slot: r.slot.slot, exId: r.exId, sets: r.sets, rest: r.slot.rest })), ex: 0, done: {}, rest: null };
    S.daySwaps = null;
    prefetchSession(S.active);
    save(); wakeOn(); render();
  }
  /** Ask the service worker to keep this session's videos offline. */
  function prefetchSession(a) {
    if (!a || !M.prefetch) return;
    const sess = PLAN.sessions[a.key];
    M.prefetch([...sess.warmup, ...sess.cooldown].map(w => ({ anim: w.anim, muscles: w.muscles }))
      .concat(a.exs.map(e => { const ex = EX(e.exId); return { anim: ex.anim, prop: ex.prop, muscles: ex.muscles }; })), a.character);
  }
  const A = () => S.active;
  const doneOf = i => A().done[i] || 0;
  function doneSet() {
    audioInit();
    const a = A(), e = a.exs[a.ex], n = doneOf(a.ex);
    if (n >= e.sets.length) return;
    a.done[a.ex] = n + 1;
    if (n + 1 < e.sets.length) {
      a.rest = { endAt: Date.now() + e.rest * 1000, total: e.rest, from: a.ex, label: 'Rest' };
      scheduleRestBeeps(e.rest);
    } else {
      const next = a.exs.findIndex((x, i) => i > a.ex && doneOf(i) < x.sets.length);
      if (next < 0) { toPhase('cool'); return; }
      a.ex = next;
      const sec = 60;
      a.rest = { endAt: Date.now() + sec * 1000, total: sec, from: a.exs.indexOf(e), label: 'Next exercise', prevDone: true };
      scheduleRestBeeps(sec);
    }
    save(); renderWorkout();
  }
  function toPhase(ph) {
    const a = A(); cancelBeeps();
    a.phase = ph; a.pIdx = 0; a.pStart = Date.now(); a.rest = null; a.pDone = false;
    save(); renderWorkout();
  }
  function finishSession(saveIt) {
    const a = A(); cancelBeeps();
    const done = {}; a.exs.forEach((e, i) => { if (doneOf(i)) done[e.exId] = doneOf(i); });
    if (saveIt && Object.keys(done).length) {
      const W = WK(a.abs);
      S.logs.push({ id: Date.now().toString(36), date: C.isoDate(new Date(a.startedAt)), ts: a.startedAt, dur: Math.round((Date.now() - a.startedAt) / 1000),
        session: a.key, abs: a.abs, block: W.block, wib: W.wib, easy: !!W.cfg.easy, done });
    }
    a.phase = 'done'; a.finishedAt = Date.now(); a.saved = !!saveIt && Object.keys(done).length > 0;
    save(); renderWorkout();
  }
  function closeWorkout() { S.active = null; ui.pick = null; wakeOff(); cancelBeeps(); killAnim(); save(); render(); }

  let animNode = null, animKey = '', animCtl = null;
  function killAnim() { if (animCtl) animCtl.stop(); animCtl = null; animNode = null; animKey = ''; }
  function placeAnim(key, anim, prop, opts) {
    const slot = $('#animSlot'); if (!slot) return;
    if (animKey !== key || !animNode) {
      if (animCtl) animCtl.stop();
      animNode = document.createElement('div'); animNode.className = 'anim';
      animCtl = M.mount(animNode, anim, prop, opts);
      animKey = key;
    }
    slot.replaceWith(animNode);
    if (animCtl && animCtl.resume) animCtl.resume();
  }
  const phaseList = a => a.phase === 'warm' ? PLAN.sessions[a.key].warmup : PLAN.sessions[a.key].cooldown;
  function clockHTML() {
    return `<header class="wo-top"><button class="icon-btn" data-act="wo-end" aria-label="End workout">✕</button>
      <div class="wo-clock"><div class="t tnum" id="clk">0:00</div>
      <div class="phasebar"><i id="clkbar"></i></div></div>
      <button class="pill" id="wake" data-act="wake" aria-label="Screen wake lock">☀︎</button></header>`;
  }
  function renderWorkout() {
    const a = A(); if (!a) return render();
    document.body.classList.add('in-workout');
    const h = a.phase === 'done' ? summaryHTML(a) : a.phase === 'work' ? exerciseHTML(a) : phaseHTML(a);
    if (animNode && animNode.parentNode) animNode.remove();
    app().innerHTML = `<div class="wo${a.rest ? ' resting' : ''}">${a.phase !== 'done' ? clockHTML() : ''}${h}</div>`;
    if (a.phase === 'work') { const e = a.exs[a.ex], ex = EX(e.exId); placeAnim(a.character + ':' + e.exId, ex.anim, ex.prop, figOpts(ex, a.character)); }
    else if (a.phase === 'warm' || a.phase === 'cool') { const it = phaseList(a)[a.pIdx]; placeAnim(a.character + ':ph:' + a.phase + a.pIdx, it.anim, null, { muscles: it.muscles, character: a.character }); }
    else killAnim();
    updWake(); tick();
  }
  function phaseHTML(a) {
    const list = phaseList(a), it = list[a.pIdx], next = list[a.pIdx + 1];
    return `<main class="phase"><div class="wo-label">${a.phase === 'warm' ? 'Warm-up' : 'Cool-down'} · ${a.pIdx + 1}/${list.length}</div>
      <h1 class="wo-name">${esc(it.name)}</h1>${it.note ? `<div class="muted">${esc(it.note)}</div>` : ''}
      <div id="animSlot"></div>
      <div class="ptime tnum" id="pT">${mmss(it.sec)}</div>
      <div class="nextup">${next ? 'Next: ' + esc(next.name) : a.phase === 'warm' ? 'Then: exercises' : 'Last one'}</div></main>
      <footer class="wo-foot"><div class="wo-nav two">
        <button class="btn" data-act="ph-prev" ${a.pIdx === 0 ? 'disabled' : ''}>‹ Back</button>
        <button class="btn" data-act="ph-skip">${a.phase === 'warm' ? 'Skip warm-up' : 'Finish now'}</button></div>
        <button class="btn btn-primary big" data-act="ph-next">${!next ? (a.phase === 'warm' ? 'Start exercises →' : 'Finish ✓') : 'Next →'}</button></footer>`;
  }
  function exerciseHTML(a) {
    const e = a.exs[a.ex], ex = EX(e.exId), n = doneOf(a.ex), cur = Math.min(n, e.sets.length - 1), allDone = n >= e.sets.length;
    const rest = a.rest ? `<section class="rest" id="rest" aria-live="polite"><div class="rt"><b id="restT" class="tnum">${mmss(a.rest.total)}</b>
        <span>${esc(a.rest.label)}<button class="link" data-act="undo">Undo</button></span></div>
        <div class="rest-bar"><i id="restBar"></i></div>
        <div class="rest-acts"><button class="btn" data-act="rest-add">+15 s</button><button class="btn" data-act="rest-skip">Skip rest</button></div></section>` : '';
    const curSet = e.sets[cur];
    return `${rest}<main class="wo-main">
      <div class="wo-label">Exercise ${a.ex + 1} of ${a.exs.length} · ${esc(muscleText(ex.muscles))}</div>
      <h1 class="wo-name" data-act="info">${esc(ex.name)} <span class="info-i" aria-hidden="true">ⓘ</span></h1>
      <div id="animSlot"></div>
      <div class="setlist big">${e.sets.map((s, i) => `<button class="setrow ${i < n ? 'done' : i === cur && !allDone ? 'cur' : ''}" data-act="goto" data-v="${i}">
        <span>${i < n ? '✓' : 'Set ' + (i + 1)}</span><b>${s.reps} reps${ex.side ? ' / side' : ''}</b>${lvl(s.level)}</button>`).join('')}</div>
      ${allDone ? '' : `<div class="hint">${esc(PLAN.levels[curSet.level].hint)}</div>`}</main>
      <footer class="wo-foot"><div class="wo-nav"><button class="btn" data-act="prev" ${a.ex === 0 ? 'disabled' : ''} aria-label="Previous exercise">‹</button><button class="btn" data-act="swap">Swap</button><button class="btn" data-act="next">Skip ›</button></div>
      <button class="btn btn-primary big" data-act="done" ${allDone ? 'disabled' : ''}>Done set ${allDone ? '' : (cur + 1) + '/' + e.sets.length}</button></footer>`;
  }
  function summaryHTML(a) {
    const W = WK(a.abs), sess = PLAN.sessions[a.key];
    const dur = Math.round(((a.finishedAt || Date.now()) - a.startedAt) / 1000);
    const sets = a.exs.reduce((s, e, i) => s + doneOf(i), 0), exs = a.exs.filter((e, i) => doneOf(i) > 0).length;
    return `<main class="phase"><h1 class="wo-name" style="margin-top:14px">${a.saved ? 'Well done ✓' : 'Workout ended'}</h1><p class="muted" style="margin:0">${esc(sess.name)} · Week ${W.wib + 1} · Block ${W.block + 1}</p>
      <div class="sum-grid"><div><b class="tnum">${mmss(dur)}</b><small>time</small></div><div><b class="tnum">${exs}/${a.exs.length}</b><small>exercises</small></div><div><b class="tnum">${sets}</b><small>sets</small></div></div>
      <div class="list">${a.exs.map((e, i) => `<div class="li"><span class="grow"><b>${esc(EX(e.exId).name)}</b><small>${doneOf(i)}/${e.sets.length} sets</small></span><span class="right">${doneOf(i) >= e.sets.length ? '✓' : ''}</span></div>`).join('')}</div></main>
      <footer class="wo-foot"><button class="btn btn-primary big" data-act="close-wo">Done</button></footer>`;
  }

  /* ================= ticking clocks ================= */
  function tick() {
    const a = A(); if (!a || a.phase === 'done') return;
    const now = Date.now(), el = (now - a.startedAt) / 1000;
    const clk = $('#clk'); if (clk) { clk.textContent = mmss(el) + ' / ' + mmss(PLAN.timing.budget); clk.classList.toggle('over', el > PLAN.timing.budget); }
    const bar = $('#clkbar'); if (bar) bar.style.width = Math.min(100, el / PLAN.timing.budget * 100) + '%';
    if (a.phase === 'warm' || a.phase === 'cool') {
      const list = phaseList(a), it = list[a.pIdx]; if (!it) return;
      const left = it.sec - (now - a.pStart) / 1000;
      const pT = $('#pT'); if (pT) pT.textContent = mmss(left);
      if (left <= 0) {
        if (a.pIdx < list.length - 1) { a.pIdx++; a.pStart = now; beeps(0, 1, 660); save(); renderWorkout(); }
        else if (!a.pDone) { a.pDone = true; beeps(0, 2, 660); buzz(); save(); }
      }
      return;
    }
    if (a.rest) {
      const left = (a.rest.endAt - now) / 1000;
      const t = $('#restT'); if (t) t.textContent = mmss(left);
      const rb = $('#restBar'); if (rb) rb.style.width = Math.max(0, left / a.rest.total * 100) + '%';
      if (left <= 0) {
        a.rest = null; save();
        if (!scheduled.length || !actx) beeps(0, 3, 880);
        scheduled = [];
        buzz(); renderWorkout();
      }
    }
  }
  setInterval(tick, 250);

  /* ================= history ================= */
  function renderHistory() {
    let h = `<div class="top"><h1>History</h1></div>`;
    if (!S.logs.length) h += `<div class="empty">No workouts yet.<br>Finish a session and it shows up here.</div>`;
    else {
      h += `<div class="list">${S.logs.slice().reverse().map(l => {
        const n = Object.values(l.done || {}).reduce((s, x) => s + x, 0);
        return `<button class="li" data-act="hopen" data-v="${l.id}"><span class="grow"><b>${esc((PLAN.sessions[l.session] || { name: l.session }).name)}</b><small>${fmtDay(l.date)} · Week ${l.wib + 1} · Block ${l.block + 1}</small></span><span class="right tnum">${mmss(l.dur || 0)}<br>${n} sets</span></button>` +
          (ui.open[l.id] ? `<div class="detail">${Object.keys(l.done || {}).map(id => `<div>${esc((EX(id) || { name: id }).name)} · <b>${l.done[id]} sets</b></div>`).join('')}<div style="margin-top:8px"><button class="btn small btn-danger" data-act="hdel" data-v="${l.id}">Delete</button></div></div>` : '');
      }).join('')}</div>`;
    }
    h += `<div class="sec-h">Backup</div><div class="row"><button class="btn grow" data-act="export">⇩ Export</button><button class="btn grow" data-act="import">⇧ Import</button></div>`;
    app().innerHTML = h + navHTML();
  }

  /* ================= settings ================= */
  function renderSettings() {
    const cur = WK(nowAbs()), days = DAYS();
    const opt = (v, sel, lab) => `<option value="${v}" ${v === sel ? 'selected' : ''}>${lab}</option>`;
    const sessOpts = sel => opt('', sel || '', 'Rest') + Object.keys(PLAN.sessions).map(k => opt(k, sel, PLAN.sessions[k].name)).join('');
    app().innerHTML = `<div class="top"><h1>Settings</h1></div>
      <div class="sec-h">Character</div><div class="list"><div class="field"><label for="pChar">Default<small>You can also pick each time you press Start</small></label><select id="pChar">${Object.keys(M.CHARS).map(k => opt(k, CHAR(), M.CHARS[k].name)).join('')}</select></div></div>
      <div class="sec-h">Program</div><div class="list">
        <div class="field"><label for="startDate">Start date<small>Week 1 begins the Monday of this date</small></label><input type="date" id="startDate" value="${S.startDate}"></div>
        <div class="field"><label for="jump">Today is</label><select id="jump">${Array.from({ length: 12 }, (_, i) => opt(String(i), String(nowAbs() % 12 === i ? i : -1), 'W' + (i % 4 + 1) + ' · Block ' + (Math.floor(i / 4) + 1))).join('')}</select></div>
      </div>
      <p class="muted" style="font-size:.82rem;margin:6px 4px">Now: Week ${cur.wib + 1} (${esc(cur.cfg.name)}) of Block ${cur.block + 1}. Exercises change every block of 4 weeks.</p>
      <div class="sec-h">Training days</div><div class="list">${[1, 2, 3, 4, 5, 6, 0].map(d => `<div class="field"><label>${DAYN[d]}</label><select data-day="${d}">${sessOpts(days[d])}</select></div>`).join('')}</div>
      <div class="sec-h">Rest timer</div><div class="list">
        <div class="field"><label for="pSound">Sound when rest ends</label><input type="checkbox" id="pSound" ${S.prefs.sound ? 'checked' : ''}></div>
        <div class="field"><label for="pVib">Vibration<small>Android only — on iPhone the screen flashes instead</small></label><input type="checkbox" id="pVib" ${S.prefs.vibrate ? 'checked' : ''}></div>
        <div class="field"><label>Test</label><button class="btn small" data-act="test-alert">▶ Test</button></div>
      </div>
      <div class="sec-h">Display</div><div class="list"><div class="field"><label for="pTheme">Theme</label><select id="pTheme">${opt('dark', S.prefs.theme, 'Dark')}${opt('light', S.prefs.theme, 'Light')}</select></div></div>
      <div class="sec-h">Data</div><div class="row"><button class="btn grow" data-act="export">⇩ Export</button><button class="btn grow" data-act="import">⇧ Import</button></div>
      <div style="margin-top:10px"><button class="btn btn-danger big" data-act="wipe">Delete all data on this device</button></div>
      <p class="muted" style="font-size:.8rem;margin:14px 4px">Everything is stored on this device only. The program lives in <code>/gym/plan.js</code>.</p>` + navHTML();
  }

  /* ================= backup ================= */
  function exportData() {
    const data = { app: 'gym', version: 2, exported: new Date().toISOString(), data: { startDate: S.startDate, days: S.days, prefs: S.prefs, logs: S.logs, swaps: S.swaps } };
    const name = 'gym-backup-' + today() + '.json', blob = new Blob([JSON.stringify(data, null, 1)], { type: 'application/json' });
    try {
      const file = new File([blob], name, { type: 'application/json' });
      if (navigator.canShare && navigator.canShare({ files: [file] }) && /iPhone|iPad|Android/i.test(navigator.userAgent)) { navigator.share({ files: [file], title: 'Gym backup' }).catch(() => {}); return; }
    } catch (e) { /* fall back to download */ }
    const a = document.createElement('a'); a.href = URL.createObjectURL(blob); a.download = name;
    document.body.appendChild(a); a.click();
    setTimeout(() => { URL.revokeObjectURL(a.href); a.remove(); }, 1500);
    toast('Backup downloaded');
  }
  function importData() {
    const inp = document.createElement('input'); inp.type = 'file'; inp.accept = 'application/json,.json';
    inp.addEventListener('change', async () => {
      const f = inp.files && inp.files[0]; if (!f) return;
      let d;
      try { d = JSON.parse(await f.text()); d = d.data || d; if (!Array.isArray(d.logs)) throw new Error('no logs'); }
      catch (e) { toast('That file is not a gym backup'); return; }
      d.logs = d.logs.map(l => l.done ? l : Object.assign({}, l, { done: Object.fromEntries(Object.entries(l.ex || {}).map(([id, s]) => [id, s.length])) }));
      const mode = await ask('Import backup', d.logs.length + ' sessions in the file.', [{ v: 'merge', label: 'Merge with this device', cls: 'btn-primary' }, { v: 'replace', label: 'Replace everything here', cls: 'btn-danger' }]);
      if (!mode) return;
      if (mode === 'replace') Object.assign(S, { startDate: d.startDate || S.startDate, days: d.days || null, prefs: Object.assign({}, DEFAULT.prefs, d.prefs || {}), logs: d.logs, swaps: d.swaps || {} });
      else { const have = new Set(S.logs.map(l => l.id)); d.logs.forEach(l => { if (!have.has(l.id)) S.logs.push(l); }); S.logs.sort((x, y) => (x.ts || 0) - (y.ts || 0)); }
      save(); ui.pick = null; toast('Imported ✓'); render();
    });
    inp.click();
  }

  /* ================= events ================= */
  document.addEventListener('click', async e => {
    const b = e.target.closest('[data-act]'); if (!b || b.disabled) return;
    const act = b.dataset.act, v = b.dataset.v, a = A();
    switch (act) {
      case 'nav': ui.view = v; ui.pick = null; render(); window.scrollTo(0, 0); break;
      case 'wk': ui.pick.abs = Math.max(0, ui.pick.abs + +v); render(); break;
      case 'pick': ui.pick.key = v; render(); break;
      case 'exinfo': openExercise({ key: ui.pick.key, abs: ui.pick.abs, slot: v }); break;
      case 'start': openCharacterPicker(); break;
      case 'wake': wakeOn(); setTimeout(() => { if (wlState !== 'on') toast('Screen wake lock not available here. Set Auto-Lock to "Never" during workouts (Settings → Display).'); }, 300); break;
      case 'wo-end': {
        if (a.phase === 'done') { closeWorkout(); break; }
        const n = Object.values(a.done).reduce((s, x) => s + x, 0);
        const r = await ask('End workout?', n ? n + ' sets done so far.' : 'No sets done yet.', (n ? [{ v: 'save', label: 'Save and finish', cls: 'btn-primary' }] : []).concat([{ v: 'discard', label: 'Discard', cls: 'btn-danger' }]));
        if (r === 'save') finishSession(true); else if (r === 'discard') closeWorkout();
        break;
      }
      case 'ph-next': {
        const list = phaseList(a);
        if (a.pIdx < list.length - 1) { a.pIdx++; a.pStart = Date.now(); a.pDone = false; save(); renderWorkout(); }
        else if (a.phase === 'warm') toPhase('work'); else finishSession(true);
        break;
      }
      case 'ph-prev': a.pIdx = Math.max(0, a.pIdx - 1); a.pStart = Date.now(); a.pDone = false; save(); renderWorkout(); break;
      case 'ph-skip': if (a.phase === 'warm') toPhase('work'); else finishSession(true); break;
      case 'done': doneSet(); break;
      case 'goto': { a.done[a.ex] = +v; a.rest = null; cancelBeeps(); save(); renderWorkout(); break; }
      case 'prev': a.ex = Math.max(0, a.ex - 1); a.rest = null; cancelBeeps(); save(); renderWorkout(); break;
      case 'next': {
        a.rest = null; cancelBeeps();
        if (a.ex < a.exs.length - 1) { a.ex++; save(); renderWorkout(); } else toPhase('cool');
        break;
      }
      case 'swap': case 'info': openExercise({ key: a.key, abs: a.abs, slot: a.exs[a.ex].slot, inWorkout: true }); break;
      case 'rest-add': if (a.rest) { a.rest.endAt += 15000; a.rest.total += 15; scheduleRestBeeps((a.rest.endAt - Date.now()) / 1000); save(); tick(); } break;
      case 'rest-skip': a.rest = null; cancelBeeps(); save(); renderWorkout(); break;
      case 'undo': {
        if (!a.rest) break;
        const from = a.rest.from; a.ex = from; a.done[from] = Math.max(0, doneOf(from) - 1);
        a.rest = null; cancelBeeps(); save(); renderWorkout(); toast('Set undone'); break;
      }
      case 'close-wo': closeWorkout(); break;
      case 'hopen': ui.open[v] = !ui.open[v]; render(); break;
      case 'hdel': {
        const r = await ask('Delete this session?', '', [{ v: 'y', label: 'Delete', cls: 'btn-danger' }]);
        if (r) { S.logs = S.logs.filter(l => l.id !== v); save(); render(); }
        break;
      }
      case 'export': exportData(); break;
      case 'import': importData(); break;
      case 'test-alert': audioInit(); beeps(0, 3, 880); buzz(); break;
      case 'wipe': {
        const r = await ask('Delete all data?', 'History and settings on this device will be erased.', [{ v: 'y', label: 'Delete everything', cls: 'btn-danger' }]);
        if (r) { localStorage.removeItem(LS); localStorage.removeItem('gym.v1'); S = load(); S.startDate = C.isoDate(C.mondayOf(new Date())); save(); ui.pick = null; render(); toast('All data deleted'); }
        break;
      }
    }
  });
  document.addEventListener('change', e => {
    const t = e.target;
    if (t.id === 'startDate' && t.value) { S.startDate = t.value; ui.pick = null; save(); render(); }
    else if (t.id === 'jump') { const n = +t.value, m = C.mondayOf(new Date()); m.setDate(m.getDate() - n * 7); S.startDate = C.isoDate(m); ui.pick = null; save(); render(); toast('Today is now Week ' + (n % 4 + 1) + ', Block ' + (Math.floor(n / 4) + 1)); }
    else if (t.dataset.day != null) { S.days = Object.assign({}, DAYS()); if (t.value) S.days[t.dataset.day] = t.value; else delete S.days[t.dataset.day]; ui.pick = null; save(); }
    else if (t.id === 'pSound') { S.prefs.sound = t.checked; save(); }
    else if (t.id === 'pVib') { S.prefs.vibrate = t.checked; save(); }
    else if (t.id === 'pTheme') { S.prefs.theme = t.value; save(); applyTheme(); }
    else if (t.id === 'pChar') { S.prefs.character = t.value; save(); }
  });

  /* ================= boot ================= */
  if (S.active && (!S.active.exs || Date.now() - S.active.startedAt > 4 * 3600 * 1000)) {
    if (S.active.exs && S.active.phase !== 'done') finishSession(true);
    S.active = null; save();
  }
  render();
  if (S.active && S.active.phase !== 'done') wakeOn();
  if ('serviceWorker' in navigator && location.protocol.startsWith('http')) {
    window.addEventListener('load', () => navigator.serviceWorker.register('sw.js').catch(() => { /* offline support unavailable */ }));
  }
  window.__gym = { get state() { return S; }, ui, render, tick, buildSession };
})();
