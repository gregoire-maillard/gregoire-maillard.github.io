/* /gym — app UI. Vanilla JS, data in localStorage (key "gym.v1"). */
(function () {
  'use strict';
  const PLAN = window.GYM_PLAN, C = window.GymCore, M = window.GymMoves;
  const LS = 'gym.v1';
  const DAYN = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
  const $ = (s, el) => (el || document).querySelector(s);
  const esc = s => String(s == null ? '' : s).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  const mmss = sec => { sec = Math.max(0, Math.round(sec)); return Math.floor(sec / 60) + ':' + String(sec % 60).padStart(2, '0'); };
  const fmtMin = sec => (sec / 60).toFixed(1);
  const today = () => C.isoDate(new Date());
  const fmtDay = iso => { const d = C.parseISO(iso); return DAYN[d.getDay()] + ' ' + d.getDate() + ' ' + d.toLocaleString('en', { month: 'short' }); };

  /* ================= state ================= */
  const DEFAULT = { v: 1, startDate: null, days: null, equip: {}, prefs: { sound: true, vibrate: true, theme: 'dark' }, logs: [], swaps: {}, daySwaps: null, active: null };
  let S = load();
  function load() {
    try {
      const s = JSON.parse(localStorage.getItem(LS) || 'null');
      const o = Object.assign({}, DEFAULT, s || {});
      o.prefs = Object.assign({}, DEFAULT.prefs, o.prefs || {});
      return o;
    } catch (e) { return JSON.parse(JSON.stringify(DEFAULT)); }
  }
  function save() {
    try { localStorage.setItem(LS, JSON.stringify(S)); }
    catch (e) { toast('Could not save — storage is full or blocked'); }
  }
  if (!S.startDate) { S.startDate = C.isoDate(C.mondayOf(new Date())); save(); }

  const DAYS = () => S.days || PLAN.settings.days;
  function ST() {
    const b = PLAN.settings, e = S.equip || {}, st = Object.assign({}, b);
    ['stackStep', 'smithBar', 'barbell', 'ezbar', 'trapbar'].forEach(k => { if (e[k] != null && e[k] !== '') st[k] = +e[k]; });
    if (e.dbMin || e.dbMax || e.dbStep) {
      const mn = +(e.dbMin || b.dumbbells[0]), mx = +(e.dbMax || b.dumbbells[b.dumbbells.length - 1]), sp = +(e.dbStep || (b.dumbbells[1] - b.dumbbells[0]));
      st.dumbbells = []; for (let w = mn; w <= mx + 1e-9 && st.dumbbells.length < 200; w = +(w + sp).toFixed(2)) st.dumbbells.push(w);
    }
    if (e.plateMin) st.plates = b.plates.filter(p => p >= +e.plateMin);
    return st;
  }
  const nowAbs = () => C.weekIndex(S.startDate, new Date());
  const WK = abs => C.weekInfo(abs, PLAN);
  const EX = id => PLAN.exercises[id];
  const isCable = ex => ex.load === 'stack' && ex.prop !== 'machine';
  const unit = ex => ex.load === 'dumbbell' ? 'kg / hand' : ex.load === 'bw' ? 'kg added' : ex.load === 'sled' ? 'kg plates' : 'kg';

  /* ================= program helpers ================= */
  function swapsFor(key, abs, extra) {
    const W = WK(abs);
    const day = S.daySwaps && S.daySwaps.date === today() && S.daySwaps.key === key ? S.daySwaps.swaps : {};
    return Object.assign({}, S.swaps[W.block] || {}, day, extra || {});
  }
  function itemBySlot(key, slot) {
    for (const b of PLAN.sessions[key].blocks) for (const it of b.items) if (it.slot === slot) return it;
    return null;
  }
  /** Session resolved for a week: blocks → rows with exercise, target and estimated time. */
  function buildSession(key, abs, extra) {
    const W = WK(abs), st = ST(), sess = PLAN.sessions[key];
    const swaps = swapsFor(key, abs, extra);
    const time = C.sessionTime(key, PLAN, W.block, W.cfg, swaps);
    let letter = 0, num = 0;
    const blocks = sess.blocks.map((b, bi) => {
      const prefix = b.main ? null : String.fromCharCode(65 + letter++);
      if (b.main) num++;
      const rows = b.items.map((it, ii) => {
        const exId = C.exerciseFor(it, W.block, swaps);
        const ex = EX(exId);
        const tg = C.target(PLAN, st, S.logs, exId, it, W.cfg);
        return { label: prefix ? prefix + (b.items.length > 1 ? ii + 1 : '') : String(num), slot: it.slot, item: it, exId, ex, sets: C.setsFor(it, W.cfg), tg,
          sec: time.blocks[bi].items[ii].sec, swapped: !!swaps[it.slot] && swaps[it.slot] !== it.rotation[W.block % it.rotation.length] };
      });
      return { id: b.id, main: !!b.main, prefix, rows, sec: time.blocks[bi].total };
    });
    return { key, abs, W, sess, blocks, time, swaps };
  }
  function buildSteps(B) {
    const steps = [];
    B.blocks.forEach(blk => {
      const rounds = Math.max(...blk.rows.map(r => r.sets));
      for (let r = 0; r < rounds; r++) blk.rows.forEach(row => {
        if (r >= row.sets) return;
        steps.push({ block: blk.id, main: blk.main, label: row.label, slot: row.slot, exId: row.exId, set: r + 1, sets: row.sets,
          reps: row.item.reps, rest: row.item.rest, tempo: row.item.tempo, w: row.tg.weight, pre: row.tg.prefill[r] || row.item.reps[0],
          status: row.tg.status, reason: row.tg.reason, partner: blk.rows.length > 1 ? blk.rows.filter(x => x !== row).map(x => x.ex.name).join(' + ') : '' });
      });
      steps[steps.length - 1].rest = PLAN.timing.blockSetup;
      steps[steps.length - 1].blockEnd = true;
    });
    return steps;
  }
  function doneThisWeek(key, abs) { return S.logs.some(l => l.abs === abs && l.session === key); }
  function defaultPick() {
    const abs = nowAbs(), days = DAYS(), todayKey = days[new Date().getDay()];
    if (todayKey && !doneThisWeek(todayKey, abs)) return { key: todayKey, abs };
    const order = [1, 2, 3, 4, 5, 6, 0].filter(d => days[d]);
    for (const d of order) if (!doneThisWeek(days[d], abs)) return { key: days[d], abs };
    return { key: days[order[0]] || 'upper', abs: abs + 1 };
  }
  function dayOf(key) {
    const days = DAYS();
    return [1, 2, 3, 4, 5, 6, 0].filter(d => days[d] === key).map(d => DAYN[d]).join('/');
  }

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
    if (document.visibilityState === 'visible') {
      if (S.active && S.active.phase !== 'done') wakeOn();
      tick();
    }
  });

  /* ================= UI scaffolding ================= */
  const ui = { view: 'home', pick: null, hist: 'sessions', open: {} };
  const app = () => $('#app');
  function applyTheme() { document.documentElement.dataset.theme = S.prefs.theme === 'light' ? 'light' : 'dark'; const m = $('meta[name=theme-color]'); if (m) m.content = S.prefs.theme === 'light' ? '#f6f6f3' : '#0e1215'; }

  let toastT = 0;
  function toast(msg) {
    let t = $('.toast'); if (!t) { t = document.createElement('div'); t.className = 'toast'; t.setAttribute('role', 'status'); document.body.appendChild(t); }
    t.textContent = msg; clearTimeout(toastT); toastT = setTimeout(() => t.remove(), 2200);
  }
  let sheetEl = null, scrimEl = null, sheetHandler = null;
  function openSheet(html, handler) {
    closeSheet(true);
    scrimEl = document.createElement('div'); scrimEl.className = 'scrim';
    sheetEl = document.createElement('div'); sheetEl.className = 'sheet'; sheetEl.setAttribute('role', 'dialog');
    sheetEl.innerHTML = '<div class="grab"></div>' + html;
    document.body.append(scrimEl, sheetEl);
    sheetHandler = handler || null;
    requestAnimationFrame(() => { scrimEl.classList.add('show'); sheetEl.classList.add('show'); });
    scrimEl.addEventListener('click', () => closeSheet());
    return sheetEl;
  }
  function closeSheet(now) {
    const s = sheetEl, c = scrimEl; sheetEl = scrimEl = null; sheetHandler = null;
    if (!s) return;
    if (now) { s.remove(); c.remove(); return; }
    s.classList.remove('show'); c.classList.remove('show');
    setTimeout(() => { s.remove(); c.remove(); }, 260);
  }
  /** In-app confirm. Returns a Promise<string|null> with the chosen value. */
  function ask(title, text, options) {
    return new Promise(res => {
      const el = openSheet(`<h2>${esc(title)}</h2>${text ? `<p class="muted">${esc(text)}</p>` : ''}<div class="stack" style="margin-top:14px">${options.map(o =>
        `<button class="btn big ${o.cls || ''}" data-v="${esc(o.v)}">${esc(o.label)}</button>`).join('')}<button class="btn big btn-ghost" data-v="">Cancel</button></div>`);
      el.addEventListener('click', e => { const b = e.target.closest('[data-v]'); if (!b) return; closeSheet(); res(b.dataset.v || null); });
      scrimEl.addEventListener('click', () => res(null), { once: true });
    });
  }

  /* ================= render: router ================= */
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
      <div class="mid"><b>Week ${W.wib + 1} · ${esc(W.cfg.name)}</b><span>Block ${W.block + 1} · RPE ${W.cfg.rpe}${isNow ? ' · <i class="now-tag">now</i>' : ''}</span></div>
      <button class="icon-btn" data-act="wk" data-v="1" aria-label="Next week">›</button></div>`;
    h += `<div class="chips">${keys.map(k => `<button class="chip ${k === P.key ? 'on' : ''}" data-act="pick" data-v="${k}"><b>${esc(PLAN.sessions[k].name)}${doneThisWeek(k, P.abs) ? ' <span class="ok">✓</span>' : ''}</b><small>${dayOf(k) || 'any day'}</small></button>`).join('')}</div>`;
    h += `<div class="card"><div class="card-h"><h2>${esc(B.sess.name)}${done ? ' <span class="ok">✓</span>' : ''}</h2><span class="est tnum">${Math.round(B.time.total / 60)} min</span></div>`;
    B.blocks.forEach(blk => {
      h += `<div class="blk">`;
      blk.rows.forEach(r => {
        const mark = { up: '<i class="up">↑</i>', down: '<i class="down">↓</i>', deload: '<i class="down">−10%</i>' }[r.tg.status] || '';
        h += `<button class="exrow" data-act="exinfo" data-v="${r.slot}"><span class="thumb">${M.frame(r.ex.anim, r.ex.prop, 0.55, { cable: isCable(r.ex) })}</span>
          <span class="grow"><span class="nm">${r.swapped ? '⇄ ' : ''}${esc(r.ex.name)}</span><span class="meta tnum">${blk.main ? '' : r.label + ' · '}${r.sets} × ${r.item.reps[0]}–${r.item.reps[1]}${r.ex.side ? '/side' : ''} · ${Math.max(1, Math.round(r.sec / 60))} min</span></span>
          <span class="kg"><b class="tnum">${C.fmtKg(r.ex, r.tg.weight)}${mark}</b><small>${r.ex.load === 'dumbbell' ? 'kg / hand' : r.ex.load === 'bw' ? '' : 'kg'}</small></span></button>`;
      });
      h += `</div>`;
    });
    h += `</div>`;
    const startLabel = isNow ? `Start ${esc(B.sess.name)}` : `Start · logs as Week ${W.wib + 1}`;
    h += `<div class="startbar"><div><button class="btn btn-primary big" data-act="start">${startLabel}</button></div></div>`;
    app().innerHTML = h + navHTML();
  }

  /* ================= exercise info / swap sheets ================= */
  let sheetAnim = null;
  function candidatesFor(item, curId) {
    const ids = [];
    const addId = id => { if (id && id !== curId && EX(id) && !ids.includes(id)) ids.push(id); };
    (EX(curId).alts || []).forEach(addId);
    item.rotation.forEach(addId);
    item.rotation.forEach(r => (EX(r).alts || []).forEach(addId));
    return ids.slice(0, 6);
  }
  function historyHTML(exId, limit) {
    const hist = C.historyFor(S.logs, exId, true).slice(0, limit || 6);
    if (!hist.length) return '<p class="muted">No history yet.</p>';
    const ex = EX(exId);
    const pts = C.historyFor(S.logs, exId).slice(0, 12).reverse().map(h => Math.max(...h.sets.map(s => C.e1rm(s.w, s.r))));
    let spark = '';
    if (pts.length > 1 && ex.load !== 'bw') {
      const mn = Math.min(...pts), mx = Math.max(...pts), W = 300, H = 60, pad = 6;
      const xy = pts.map((v, i) => [pad + i * (W - 2 * pad) / (pts.length - 1), H - pad - (mx === mn ? 0.5 : (v - mn) / (mx - mn)) * (H - 2 * pad)]);
      spark = `<svg class="spark" viewBox="0 0 ${W} ${H}" preserveAspectRatio="none"><path d="M${xy.map(p => p.map(n => n.toFixed(1)).join(' ')).join(' L')}"/>${xy.map(p => `<circle cx="${p[0].toFixed(1)}" cy="${p[1].toFixed(1)}" r="3"/>`).join('')}</svg><small class="muted">Estimated 1-rep max trend: ${mn.toFixed(0)} → ${pts[pts.length - 1].toFixed(0)} kg</small>`;
    }
    return spark + `<table class="h"><tr><th>Date</th><th>Sets (kg × reps)</th></tr>${hist.map(h => `<tr><td>${fmtDay(h.date)}${h.deload ? ' <span class="tag">deload</span>' : ''}</td><td class="tnum">${h.sets.map(s => C.fmtKg(ex, s.w) + '×' + s.r).join(', ')}</td></tr>`).join('')}</table>`;
  }
  /** ctx: { key, abs, slot, inWorkout } */
  function openExercise(ctx) {
    const item = itemBySlot(ctx.key, ctx.slot);
    const W = WK(ctx.abs);
    const curId = ctx.inWorkout ? S.active.steps[S.active.idx].exId : C.exerciseFor(item, W.block, swapsFor(ctx.key, ctx.abs));
    const ex = EX(curId), st = ST();
    const tg = C.target(PLAN, st, S.logs, curId, item, W.cfg);
    const cands = candidatesFor(item, curId);
    const planned = item.rotation[W.block % item.rotation.length];
    const keepOn = S.swaps[W.block] && S.swaps[W.block][ctx.slot];
    const el = openSheet(`<h2>${esc(ex.name)}</h2>
      <div class="muted tnum">${C.setsFor(item, W.cfg)} × ${item.reps[0]}–${item.reps[1]}${ex.side ? '/side' : ''} · ${C.fmtKg(ex, tg.weight)} ${ex.load === 'bw' ? '' : unit(ex)} · rest ${mmss(item.rest)} · tempo ${esc(item.tempo)}</div>
      <div class="anim" id="sheetAnim"></div>
      <ul class="cues">${ex.cues.map(c => `<li>${esc(c)}</li>`).join('')}</ul>
      <div class="sec-h">Swap</div>
      ${curId !== planned ? `<button class="opt" data-pick="${planned}"><span class="grow"><b>↺ Back to ${esc(EX(planned).name)}</b></span></button>` : ''}
      ${cands.map(id => { const e = EX(id), t = C.target(PLAN, st, S.logs, id, item, W.cfg); return `<button class="opt" data-pick="${id}"><span class="thumb">${M.frame(e.anim, e.prop, 0.55, { cable: isCable(e) })}</span><span class="grow"><b>${esc(e.name)}</b><small class="tnum">${C.fmtKg(e, t.weight)} ${e.load === 'bw' ? '' : unit(e)}</small></span></button>`; }).join('')}
      <label class="switch"><span>Keep for the rest of Block ${W.block + 1}</span><input type="checkbox" id="keepSwap" ${keepOn ? 'checked' : ''}></label>
      <div class="sec-h">History</div>${historyHTML(curId)}`);
    sheetAnim = M.mount($('#sheetAnim', el), ex.anim, ex.prop, { cable: isCable(ex) });
    el.addEventListener('click', e => {
      const b = e.target.closest('[data-pick]'); if (!b) return;
      const keep = $('#keepSwap', el).checked;
      applySwap(ctx, b.dataset.pick, keep, planned);
      closeSheet();
    });
  }
  function applySwap(ctx, newId, keep, planned) {
    const W = WK(ctx.abs);
    if (keep) { S.swaps[W.block] = S.swaps[W.block] || {}; if (newId === planned) delete S.swaps[W.block][ctx.slot]; else S.swaps[W.block][ctx.slot] = newId; }
    else if (S.swaps[W.block] && S.swaps[W.block][ctx.slot] && newId === planned) delete S.swaps[W.block][ctx.slot];
    if (ctx.inWorkout) {
      const A = S.active, item = itemBySlot(ctx.key, ctx.slot);
      A.swaps[ctx.slot] = newId;
      const tg = C.target(PLAN, ST(), S.logs, newId, item, W.cfg);
      A.steps.forEach((s, j) => { if (s.slot === ctx.slot && !A.log[j]) { s.exId = newId; s.w = tg.weight; s.pre = tg.prefill[s.set - 1] || item.reps[0]; s.status = tg.status; s.reason = tg.reason; } });
      A.draft = null;
    } else if (!keep) {
      if (!S.daySwaps || S.daySwaps.date !== today() || S.daySwaps.key !== ctx.key) S.daySwaps = { date: today(), key: ctx.key, swaps: {} };
      if (newId === planned) delete S.daySwaps.swaps[ctx.slot]; else S.daySwaps.swaps[ctx.slot] = newId;
    }
    save(); toast('Swapped to ' + EX(newId).name); render();
  }

  /* ================= workout ================= */
  function startSession() {
    audioInit();
    const P = ui.pick, B = buildSession(P.key, P.abs);
    S.active = { key: P.key, abs: P.abs, startedAt: Date.now(), phase: 'warm', pIdx: 0, pStart: Date.now(), steps: buildSteps(B), idx: 0, log: {}, rest: null, swaps: Object.assign({}, B.swaps), draft: null };
    S.daySwaps = null;
    save(); wakeOn(); render();
  }
  const A = () => S.active;
  const stepItem = st => itemBySlot(A().key, st.slot);
  function draft() {
    const a = A(), st = a.steps[a.idx];
    if (!a.draft || a.draft.idx !== a.idx) {
      const logged = a.log[a.idx];
      a.draft = { idx: a.idx, w: logged ? logged.w : st.w, r: logged ? logged.r : st.pre };
    }
    return a.draft;
  }
  function nextOpen(from) { const a = A(); for (let j = from; j < a.steps.length; j++) if (!a.log[j]) return j; return -1; }

  function doneSet() {
    audioInit();
    const a = A(), st = a.steps[a.idx], d = draft(), W = WK(a.abs);
    a.log[a.idx] = { w: d.w, r: d.r, t: Date.now() };
    const adj = C.adjustNext(PLAN, ST(), st.exId, stepItem(st), W.cfg, d.w, d.r);
    a.steps.forEach((s, j) => {
      if (j <= a.idx || a.log[j] || s.slot !== st.slot) return;
      if (adj != null) { s.w = adj; s.reason = 'Re-aimed from your last set'; }
      else if (d.w !== st.w) s.w = d.w;
    });
    if (adj != null) toast('Next set re-aimed to ' + C.fmtKg(EX(st.exId), adj) + ' kg');
    const nxt = nextOpen(a.idx + 1);
    a.draft = null;
    if (nxt < 0) {
      const anyOpen = nextOpen(0);
      if (anyOpen >= 0) { a.idx = anyOpen; a.rest = null; }
      else { toPhase('cool'); return; }
    } else {
      a.idx = nxt;
      const sec = st.rest;
      a.rest = { endAt: Date.now() + sec * 1000, total: sec, after: Object.keys(a.log).length, from: a.steps.indexOf(st) };
      scheduleRestBeeps(sec);
    }
    save(); renderWorkout();
  }
  function toPhase(ph) {
    const a = A(); cancelBeeps();
    a.phase = ph; a.pIdx = 0; a.pStart = Date.now(); a.rest = null;
    if (ph === 'done') a.finishedAt = Date.now();
    save(); renderWorkout();
  }
  function finishSession(saveIt) {
    const a = A(); cancelBeeps();
    if (saveIt) {
      const W = WK(a.abs), ex = {};
      a.steps.forEach((s, j) => { const l = a.log[j]; if (!l) return; (ex[s.exId] = ex[s.exId] || []).push({ w: l.w, r: l.r }); });
      if (Object.keys(ex).length) {
        const entry = { id: Date.now().toString(36), date: C.isoDate(new Date(a.startedAt)), ts: a.startedAt, end: Date.now(), dur: Math.round((Date.now() - a.startedAt) / 1000),
          session: a.key, abs: a.abs, block: W.block, wib: W.wib, deload: !!W.cfg.deload, ex };
        S.logs.push(entry); a.savedId = entry.id;
      }
    }
    a.phase = 'done'; a.finishedAt = a.finishedAt || Date.now(); a.saved = !!saveIt;
    save(); renderWorkout();
  }
  function closeWorkout() { S.active = null; ui.pick = null; wakeOff(); cancelBeeps(); killAnim(); save(); render(); }

  let animNode = null, animKey = '', animCtl = null;
  function killAnim() { if (animCtl) animCtl.stop(); animCtl = null; animNode = null; animKey = ''; }
  function placeAnim(key, anim, prop, cable) {
    const slot = $('#animSlot'); if (!slot) return;
    if (animKey !== key || !animNode) {
      if (animCtl) animCtl.stop();
      animNode = document.createElement('div'); animNode.className = 'anim';
      animCtl = M.mount(animNode, anim, prop, { cable });
      animKey = key;
    }
    slot.replaceWith(animNode);
  }

  function clockHTML() {
    return `<header class="wo-top"><button class="icon-btn" data-act="wo-end" aria-label="End workout">✕</button>
      <div class="wo-clock"><div class="t tnum" id="clk">0:00</div>
      <div class="phasebar"><span class="pw"></span><span class="pk"></span><span class="pc"></span><i id="clkbar"></i></div></div>
      <button class="pill" id="wake" data-act="wake" aria-label="Screen wake lock">☀︎</button></header>`;
  }
  function renderWorkout() {
    const a = A(); if (!a) return render();
    document.body.classList.add('in-workout');
    let h = '';
    if (a.phase === 'warm' || a.phase === 'cool') h = phaseHTML(a);
    else if (a.phase === 'done') h = summaryHTML(a);
    else h = stepHTML(a);
    // keep the animation node alive across re-renders
    if (animNode && animNode.parentNode) animNode.remove();
    app().innerHTML = `<div class="wo${a.rest && a.phase === 'work' ? ' resting' : ''}">${a.phase !== 'done' ? clockHTML() : ''}${h}</div>`;
    if (a.phase === 'work') { const ex = EX(a.steps[a.idx].exId); placeAnim(a.steps[a.idx].exId, ex.anim, ex.prop, isCable(ex)); }
    else if (a.phase === 'warm' || a.phase === 'cool') { const it = phaseList(a)[a.pIdx]; if (it && it.anim) placeAnim('ph:' + a.phase + ':' + a.pIdx, it.anim, null, false); else killAnim(); }
    else killAnim();
    updWake(); tick();
  }
  const phaseList = a => a.phase === 'warm' ? PLAN.sessions[a.key].warmup : PLAN.sessions[a.key].cooldown;
  function phaseHTML(a) {
    const list = phaseList(a), it = list[a.pIdx], next = list[a.pIdx + 1];
    const last = !next;
    return `<main class="phase"><div class="wo-label">${a.phase === 'warm' ? 'Warm-up' : 'Cool-down'} · ${a.pIdx + 1}/${list.length}</div>
      <h1 class="wo-name">${esc(it.name)}</h1>${it.note ? `<div class="muted">${esc(it.note)}</div>` : ''}
      <div id="animSlot"></div>
      <div class="ptime tnum" id="pT">${mmss(it.sec)}</div>
      <div class="nextup">${next ? 'Next: ' + esc(next.name) : a.phase === 'warm' ? 'Then: lifting' : 'Last one'}</div></main>
      <footer class="wo-foot"><div class="wo-nav" style="grid-template-columns:1fr 1fr">
        <button class="btn" data-act="ph-prev" ${a.pIdx === 0 ? 'disabled' : ''}>‹ Back</button>
        <button class="btn" data-act="ph-skip">${a.phase === 'warm' ? 'Skip warm-up' : 'Finish now'}</button></div>
        <button class="btn btn-primary big" data-act="ph-next">${last ? (a.phase === 'warm' ? 'Start lifting →' : 'Finish ✓') : 'Next →'}</button></footer>`;
  }
  function rampHTML(st, ex) {
    if (!st.main || st.set !== 1 || ex.load === 'bw') return '';
    const s = ST(), w = st.w, L = C.loadInfo(ex, s);
    const pts = [];
    if (L.plate && L.base > 0) pts.push([L.base, 8]);
    [[0.5, 5], [0.75, 3]].forEach(([f, r]) => { const x = C.roundLoad(ex, s, w * f, 'down'); if (x < w && (!pts.length || x > pts[pts.length - 1][0])) pts.push([x, r]); });
    return pts.length ? `<div class="wo-hint ramp">Warm-up sets first: ${pts.map(p => p[0] + '×' + p[1]).join(' · ')}</div>` : '';
  }
  function stepHTML(a) {
    const st = a.steps[a.idx], ex = EX(st.exId), d = draft(), W = WK(a.abs);
    const last = C.historyFor(S.logs, st.exId)[0];
    const sameEx = a.steps.map((s, j) => ({ s, j })).filter(o => o.s.slot === st.slot);
    const sub = ex.load === 'dumbbell' ? 'kg / hand' : ex.load === 'bw' ? 'kg added' : ex.load === 'sled' ? 'kg plates' : 'kg';
    const restHTML = a.rest ? `<section class="rest" id="rest" aria-live="polite"><div class="rt"><b id="restT" class="tnum">${mmss(a.rest.total)}</b>
        <span>${a.steps[a.rest.from] && a.steps[a.rest.from].blockEnd ? 'Next station' : 'Rest'}<button class="link" data-act="undo">Undo set</button></span></div>
        <div class="rest-bar"><i id="restBar"></i></div>
        <div class="rest-acts"><button class="btn" data-act="rest-add">+15 s</button><button class="btn" data-act="rest-skip">Skip rest</button></div></section>` : '';
    const chip = W.cfg.deload ? 'Deload' : st.status === 'calibrate' ? 'First try' : 'RPE ' + W.cfg.rpe;
    return `${restHTML}<main class="wo-main">
      <div class="wo-head"><span class="badge">${st.label}</span><h1 class="wo-name">${esc(ex.name)}</h1></div>
      <div id="animSlot"></div>
      <p class="cue1">${esc(ex.cues[0])}</p>
      <div class="wo-set"><div class="s tnum">Set ${st.set}<small>/${st.sets}</small> <span class="reps"><b>${st.reps[0]}–${st.reps[1]}</b> reps${ex.side ? '/side' : ''}</span></div><span class="chip-s">${chip}</span></div>
      ${last ? `<div class="wo-hint tnum">Last time: ${last.sets.map(s => C.fmtKg(ex, s.w) + '×' + s.r).join(' · ')}</div>` : ''}
      ${rampHTML(st, ex)}
      <div class="steppers">
        <div class="stepper"><button data-act="w-" aria-label="Less weight">−</button><div><b id="wv">${C.fmtKg(ex, d.w)}</b><small>${esc(sub)}</small></div><button data-act="w+" aria-label="More weight">+</button></div>
        <div class="stepper"><button data-act="r-" aria-label="Fewer reps">−</button><div><b id="rv">${d.r}</b><small>reps</small></div><button data-act="r+" aria-label="More reps">+</button></div>
      </div><div class="plates tnum" id="plates">${platesText(ex, d.w)}</div>
      <div class="dots">${sameEx.map(o => { const l = a.log[o.j]; return `<button class="${l ? 'done' : ''} ${o.j === a.idx ? 'cur' : ''}" data-act="goto" data-v="${o.j}" aria-label="Set ${o.s.set}">${l ? C.fmtKg(ex, l.w) + '×' + l.r : 'Set ' + o.s.set}</button>`; }).join('')}</div></main>
      <footer class="wo-foot"><div class="wo-nav"><button class="btn" data-act="prev" ${a.idx === 0 ? 'disabled' : ''} aria-label="Previous">‹</button><button class="btn" data-act="swap">Swap · tips</button><button class="btn" data-act="next" aria-label="Next">›</button></div>
      <button class="btn btn-primary big" data-act="done">${a.log[a.idx] ? 'Update set' : 'Done set'}</button></footer>`;
  }
  function platesText(ex, w) {
    if (ex.load === 'bw') return w < 0 ? 'Assisted: ' + Math.abs(w) + ' kg of help' : w > 0 ? 'Hold or belt ' + w + ' kg' : 'Bodyweight only';
    const p = C.platesPerSide(ex, ST(), w);
    if (!p) return '';
    if (p === 'empty bar' || p === '—') return ex.load === 'sled' ? 'No plates' : 'Empty bar';
    const L = C.loadInfo(ex, ST());
    return (L.base ? L.base + ' kg bar + ' : '') + p + ' per side';
  }
  function summaryHTML(a) {
    const W = WK(a.abs), sess = PLAN.sessions[a.key];
    const dur = Math.round(((a.finishedAt || Date.now()) - a.startedAt) / 1000);
    const byEx = {};
    a.steps.forEach((s, j) => { const l = a.log[j]; if (l) (byEx[s.exId] = byEx[s.exId] || { slot: s.slot, sets: [] }).sets.push(l); });
    let vol = 0, sets = 0;
    Object.keys(byEx).forEach(id => byEx[id].sets.forEach(l => { sets++; if (EX(id).load !== 'bw') vol += l.w * l.r * (EX(id).load === 'dumbbell' ? 2 : 1); }));
    const st = ST();
    const rows = Object.keys(byEx).map(id => {
      const ex = EX(id), item = itemBySlot(a.key, byEx[id].slot);
      const nt = C.target(PLAN, st, S.logs, id, item, W.cfg.deload ? WK(a.abs + 1).cfg : W.cfg);
      const nx = W.cfg.deload ? '' : ` → next: <b>${C.fmtKg(ex, nt.weight)}</b>${nt.status === 'up' ? ' <span class="tag up">↑</span>' : nt.status === 'down' ? ' <span class="tag down">↓</span>' : ''}`;
      return `<div class="li"><span class="grow"><b>${esc(ex.name)}</b><small class="tnum">${byEx[id].sets.map(l => C.fmtKg(ex, l.w) + '×' + l.r).join(', ')}${nx}</small></span></div>`;
    }).join('');
    return `<main class="phase"><h1>${a.saved ? 'Workout saved ✓' : 'Workout ended'}</h1><p class="muted" style="margin:0">${esc(sess.name)} · Week ${W.wib + 1} · Block ${W.block + 1}${W.cfg.deload ? ' · deload (no progression)' : ''}</p>
      <div class="sum-grid"><div><b class="tnum">${mmss(dur)}</b><small>time</small></div><div><b class="tnum">${sets}</b><small>sets</small></div><div><b class="tnum">${Math.round(vol).toLocaleString('en')}</b><small>kg volume</small></div></div>
      ${rows ? `<div class="list">${rows}</div>` : '<div class="empty">No sets logged.</div>'}</main>
      <footer class="wo-foot"><button class="btn btn-primary big" data-act="close-wo">Done</button></footer>`;
  }

  /* ================= ticking clocks ================= */
  function tick() {
    const a = A(); if (!a || a.phase === 'done') return;
    const now = Date.now();
    const el = (now - a.startedAt) / 1000;
    const clk = $('#clk'); if (clk) { clk.textContent = mmss(el); clk.classList.toggle('over', el > PLAN.timing.budget); }
    const bar = $('#clkbar'); if (bar) bar.style.width = Math.min(100, el / PLAN.timing.budget * 100) + '%';
    if (a.phase === 'warm' || a.phase === 'cool') {
      const list = phaseList(a);
      const it = list[a.pIdx]; if (!it) return;
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
    let h = `<div class="top"><h1>History</h1></div><div class="seg"><button class="${ui.hist === 'sessions' ? 'on' : ''}" data-act="htab" data-v="sessions">Sessions</button><button class="${ui.hist === 'exercises' ? 'on' : ''}" data-act="htab" data-v="exercises">Exercises</button></div>`;
    if (!S.logs.length) h += `<div class="empty">No workouts logged yet.<br>Finish a session and it shows up here.</div>`;
    else if (ui.hist === 'sessions') {
      h += `<div class="list">${S.logs.slice().reverse().map(l => {
        const n = Object.values(l.ex).reduce((s, a) => s + a.length, 0);
        const open = ui.open[l.id];
        return `<button class="li" data-act="hopen" data-v="${l.id}"><span class="grow"><b>${esc((PLAN.sessions[l.session] || { name: l.session }).name)}</b><small>${fmtDay(l.date)} · Week ${l.wib + 1} · Block ${l.block + 1}${l.deload ? ' · deload' : ''}</small></span><span class="right tnum">${mmss(l.dur || 0)}<br>${n} sets</span></button>` +
          (open ? `<div class="detail">${Object.keys(l.ex).map(id => { const ex = EX(id) || { name: id, load: '' }; return `<div><b>${esc(ex.name)}</b> · <span class="tnum">${l.ex[id].map(s => C.fmtKg(ex, s.w) + '×' + s.r).join(', ')}</span></div>`; }).join('')}<div style="margin-top:8px"><button class="btn small btn-danger" data-act="hdel" data-v="${l.id}">Delete this session</button></div></div>` : '');
      }).join('')}</div>`;
    } else {
      const ids = []; S.logs.forEach(l => Object.keys(l.ex).forEach(id => { if (!ids.includes(id) && EX(id)) ids.push(id); }));
      h += `<div class="list">${ids.map(id => { const hs = C.historyFor(S.logs, id, true); const best = Math.max(...hs.flatMap(x => x.sets.map(s => C.e1rm(s.w, s.r)))); return `<button class="li" data-act="hex" data-v="${id}"><span class="grow"><b>${esc(EX(id).name)}</b><small>${hs.length} session${hs.length > 1 ? 's' : ''} · last ${fmtDay(hs[0].date)}</small></span><span class="right tnum">${EX(id).load === 'bw' ? '' : '≈ ' + best.toFixed(0) + ' kg<br><small>est. 1RM</small>'}</span></button>`; }).join('')}</div>`;
    }
    h += `<div class="sec-h">Backup</div><div class="row"><button class="btn grow" data-act="export">⇩ Export JSON</button><button class="btn grow" data-act="import">⇧ Import JSON</button></div>`;
    app().innerHTML = h + navHTML();
  }

  /* ================= settings ================= */
  function renderSettings() {
    const cur = WK(nowAbs()), days = DAYS(), e = S.equip || {}, b = PLAN.settings;
    const opt = (v, sel, lab) => `<option value="${v}" ${v === sel ? 'selected' : ''}>${lab}</option>`;
    const sessOpts = sel => opt('', sel || '', 'Rest') + Object.keys(PLAN.sessions).map(k => opt(k, sel, PLAN.sessions[k].name)).join('');
    const num = (k, lab, ph, hint) => `<div class="field"><label for="e_${k}">${lab}${hint ? `<small>${hint}</small>` : ''}</label><input type="number" inputmode="decimal" step="any" id="e_${k}" data-equip="${k}" value="${e[k] != null ? esc(e[k]) : ''}" placeholder="${ph}"></div>`;
    let h = `<div class="top"><h1>Settings</h1></div>
      <div class="sec-h">Program</div><div class="list">
        <div class="field"><label for="startDate">Start date<small>Week 1 begins the Monday of this date</small></label><input type="date" id="startDate" value="${S.startDate}"></div>
        <div class="field"><label for="jump">Today is<small>Changing this moves the start date</small></label><select id="jump">${Array.from({ length: 12 }, (_, i) => opt(String(i), String(nowAbs() % 12 === i ? i : -1), 'W' + (i % 4 + 1) + ' · Block ' + (Math.floor(i / 4) + 1))).join('')}</select></div>
      </div>
      <p class="muted" style="font-size:.82rem;margin:6px 4px">Currently Week ${cur.wib + 1} (${esc(cur.cfg.name)}) of Block ${cur.block + 1}.</p>
      <div class="sec-h">Training days</div><div class="list">${[1, 2, 3, 4, 5, 6, 0].map(d => `<div class="field"><label>${DAYN[d]}</label><select data-day="${d}">${sessOpts(days[d])}</select></div>`).join('')}</div>
      <div class="sec-h">Rest timer</div><div class="list">
        <div class="field"><label for="pSound">Sound at the end of rest</label><input type="checkbox" id="pSound" ${S.prefs.sound ? 'checked' : ''}></div>
        <div class="field"><label for="pVib">Vibration<small>Android only — iPhone browsers don't allow web vibration; the screen flashes instead</small></label><input type="checkbox" id="pVib" ${S.prefs.vibrate ? 'checked' : ''}></div>
        <div class="field"><label>Test the alert</label><button class="btn small" data-act="test-alert">▶ Test</button></div>
      </div>
      <div class="sec-h">Display</div><div class="list"><div class="field"><label for="pTheme">Theme</label><select id="pTheme">${opt('dark', S.prefs.theme, 'Dark')}${opt('light', S.prefs.theme, 'Light')}</select></div></div>
      <details class="more"><summary>Equipment</summary><p class="muted" style="font-size:.8rem;margin:4px 4px 8px">Leave blank for the defaults in plan.js.</p><div class="list">
        ${num('dbMin', 'Lightest dumbbell', b.dumbbells[0], 'kg')}
        ${num('dbMax', 'Heaviest dumbbell', b.dumbbells[b.dumbbells.length - 1], 'kg')}
        ${num('dbStep', 'Dumbbell step', b.dumbbells[1] - b.dumbbells[0], 'kg between pairs')}
        ${num('plateMin', 'Smallest plate', Math.min(...b.plates), 'kg')}
        ${num('stackStep', 'Cable / machine step', b.stackStep, 'kg per pin')}
        ${num('barbell', 'Barbell', b.barbell, 'kg')}
        ${num('ezbar', 'EZ bar', b.ezbar, 'kg')}
        ${num('trapbar', 'Trap bar', b.trapbar, 'kg')}
        ${num('smithBar', 'Smith bar counts as', b.smithBar, 'kg — 0 if counterweighted')}
      </div></details>
      <details class="more"><summary>Swaps kept for a block</summary><div class="list">${Object.keys(S.swaps).flatMap(bk => Object.keys(S.swaps[bk]).map(slot => `<div class="field"><label>Block ${+bk + 1}: ${esc(EX(S.swaps[bk][slot]).name)}</label><button class="btn small" data-act="unswap" data-v="${bk}|${slot}">Reset</button></div>`)).join('') || '<div class="field muted">None</div>'}</div></details>
      <div class="sec-h">Data</div><div class="row"><button class="btn grow" data-act="export">⇩ Export</button><button class="btn grow" data-act="import">⇧ Import</button></div>
      <div style="margin-top:10px"><button class="btn btn-danger big" data-act="wipe">Delete all data on this device</button></div>
      <p class="muted" style="font-size:.8rem;margin:14px 4px">Everything is stored on this device only (browser storage). Export a backup now and then. The program itself lives in <code>/gym/plan.js</code>.</p>`;
    app().innerHTML = h + navHTML();
  }

  /* ================= backup ================= */
  function exportData() {
    const data = { app: 'gym', version: 1, exported: new Date().toISOString(), data: { startDate: S.startDate, days: S.days, equip: S.equip, prefs: S.prefs, logs: S.logs, swaps: S.swaps } };
    const txt = JSON.stringify(data, null, 1), name = 'gym-backup-' + today() + '.json';
    const blob = new Blob([txt], { type: 'application/json' });
    try {
      const file = new File([blob], name, { type: 'application/json' });
      if (navigator.canShare && navigator.canShare({ files: [file] }) && /iPhone|iPad|Android/i.test(navigator.userAgent)) {
        navigator.share({ files: [file], title: 'Gym backup' }).catch(() => { /* cancelled */ });
        return;
      }
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
      const mode = await ask('Import backup', d.logs.length + ' sessions in the file.', [{ v: 'merge', label: 'Merge with this device', cls: 'btn-primary' }, { v: 'replace', label: 'Replace everything here', cls: 'btn-danger' }]);
      if (!mode) return;
      if (mode === 'replace') {
        Object.assign(S, { startDate: d.startDate || S.startDate, days: d.days || null, equip: d.equip || {}, prefs: Object.assign({}, DEFAULT.prefs, d.prefs || {}), logs: d.logs, swaps: d.swaps || {} });
      } else {
        const have = new Set(S.logs.map(l => l.id));
        d.logs.forEach(l => { if (!have.has(l.id)) S.logs.push(l); });
        S.logs.sort((x, y) => (x.ts || 0) - (y.ts || 0));
      }
      save(); ui.pick = null; toast('Imported ✓'); render();
    });
    inp.click();
  }

  /* ================= events ================= */
  document.addEventListener('click', async e => {
    const b = e.target.closest('[data-act]'); if (!b || b.disabled) return;
    const act = b.dataset.act, v = b.dataset.v;
    const a = A();
    switch (act) {
      case 'nav': ui.view = v; ui.pick = null; render(); window.scrollTo(0, 0); break;
      case 'wk': ui.pick.abs = Math.max(0, ui.pick.abs + +v); render(); break;
      case 'pick': ui.pick.key = v; render(); break;
      case 'exinfo': openExercise({ key: ui.pick.key, abs: ui.pick.abs, slot: v }); break;
      case 'start': startSession(); break;
      case 'wake': wakeOn(); if (wlState !== 'on') setTimeout(() => { if (wlState !== 'on') toast('Screen wake lock not available here. Set Auto-Lock to "Never" during workouts (Settings → Display).'); }, 300); break;
      case 'wo-end': {
        if (a.phase === 'done') { closeWorkout(); break; }
        const n = Object.keys(a.log).length;
        const r = await ask('End workout?', n ? n + ' sets logged so far.' : 'No sets logged yet.', (n ? [{ v: 'save', label: 'Save and finish', cls: 'btn-primary' }] : []).concat([{ v: 'discard', label: 'Discard workout', cls: 'btn-danger' }]));
        if (r === 'save') finishSession(true); else if (r === 'discard') closeWorkout();
        break;
      }
      case 'ph-next': {
        const list = a.phase === 'warm' ? PLAN.sessions[a.key].warmup : PLAN.sessions[a.key].cooldown;
        if (a.pIdx < list.length - 1) { a.pIdx++; a.pStart = Date.now(); a.pDone = false; save(); renderWorkout(); }
        else if (a.phase === 'warm') toPhase('work'); else finishSession(true);
        break;
      }
      case 'ph-prev': a.pIdx = Math.max(0, a.pIdx - 1); a.pStart = Date.now(); a.pDone = false; save(); renderWorkout(); break;
      case 'ph-skip': if (a.phase === 'warm') toPhase('work'); else finishSession(true); break;
      case 'w-': case 'w+': {
        const d = draft(), ex = EX(a.steps[a.idx].exId);
        d.w = C.stepFrom(ex, ST(), d.w, act === 'w+' ? 1 : -1);
        $('#wv').textContent = C.fmtKg(ex, d.w);
        $('#plates').textContent = platesText(ex, d.w);
        save(); break;
      }
      case 'r-': case 'r+': { const d = draft(); d.r = Math.max(0, Math.min(50, d.r + (act === 'r+' ? 1 : -1))); $('#rv').textContent = d.r; save(); break; }
      case 'done': doneSet(); break;
      case 'prev': a.idx = Math.max(0, a.idx - 1); a.draft = null; save(); renderWorkout(); break;
      case 'next': if (a.idx < a.steps.length - 1) { a.idx++; a.draft = null; save(); renderWorkout(); } else toPhase('cool'); break;
      case 'goto': a.idx = +v; a.draft = null; save(); renderWorkout(); break;
      case 'swap': openExercise({ key: a.key, abs: a.abs, slot: a.steps[a.idx].slot, inWorkout: true }); break;
      case 'rest-add': if (a.rest) { a.rest.endAt += 15000; a.rest.total += 15; scheduleRestBeeps((a.rest.endAt - Date.now()) / 1000); save(); tick(); } break;
      case 'rest-sub': if (a.rest) { a.rest.endAt -= 15000; scheduleRestBeeps(Math.max(0, (a.rest.endAt - Date.now()) / 1000)); save(); tick(); } break;
      case 'rest-skip': a.rest = null; cancelBeeps(); save(); renderWorkout(); break;
      case 'undo': {
        if (!a.rest) break;
        const j = a.rest.from; delete a.log[j]; a.idx = j; a.rest = null; a.draft = null; cancelBeeps(); save(); renderWorkout(); toast('Set undone'); break;
      }
      case 'close-wo': closeWorkout(); break;
      case 'htab': ui.hist = v; render(); break;
      case 'hopen': ui.open[v] = !ui.open[v]; render(); break;
      case 'hdel': {
        const r = await ask('Delete this session?', 'Its sets are removed from your history and progression.', [{ v: 'y', label: 'Delete', cls: 'btn-danger' }]);
        if (r) { S.logs = S.logs.filter(l => l.id !== v); save(); render(); }
        break;
      }
      case 'hex': openSheet(`<h2>${esc(EX(v).name)}</h2><div class="anim" id="sheetAnim"></div>${historyHTML(v, 20)}`); sheetAnim = M.mount($('#sheetAnim'), EX(v).anim, EX(v).prop, { cable: isCable(EX(v)) }); break;
      case 'export': exportData(); break;
      case 'import': importData(); break;
      case 'test-alert': audioInit(); beeps(0, 3, 880); buzz(); break;
      case 'unswap': { const [bk, slot] = v.split('|'); delete S.swaps[bk][slot]; if (!Object.keys(S.swaps[bk]).length) delete S.swaps[bk]; save(); render(); break; }
      case 'wipe': {
        const r = await ask('Delete all data?', 'Logs, settings and swaps on this device will be erased. Export a backup first if you want to keep them.', [{ v: 'y', label: 'Delete everything', cls: 'btn-danger' }]);
        if (r) { localStorage.removeItem(LS); S = load(); S.startDate = C.isoDate(C.mondayOf(new Date())); save(); ui.pick = null; render(); toast('All data deleted'); }
        break;
      }
    }
  });
  document.addEventListener('change', e => {
    const t = e.target;
    if (t.id === 'startDate' && t.value) { S.startDate = t.value; ui.pick = null; save(); render(); }
    else if (t.id === 'jump') { const n = +t.value; const m = C.mondayOf(new Date()); m.setDate(m.getDate() - n * 7); S.startDate = C.isoDate(m); ui.pick = null; save(); render(); toast('Today is now Week ' + (n % 4 + 1) + ', Block ' + (Math.floor(n / 4) + 1)); }
    else if (t.dataset.day != null) { S.days = Object.assign({}, DAYS()); if (t.value) S.days[t.dataset.day] = t.value; else delete S.days[t.dataset.day]; ui.pick = null; save(); }
    else if (t.id === 'pSound') { S.prefs.sound = t.checked; save(); }
    else if (t.id === 'pVib') { S.prefs.vibrate = t.checked; save(); }
    else if (t.id === 'pTheme') { S.prefs.theme = t.value; save(); applyTheme(); }
    else if (t.dataset.equip) { const k = t.dataset.equip; if (t.value === '') delete S.equip[k]; else S.equip[k] = +t.value; save(); }
  });

  /* ================= boot ================= */
  if (S.active) {
    const age = Date.now() - S.active.startedAt;
    if (age > 4 * 3600 * 1000 && S.active.phase !== 'done') {
      // stale workout from another day: save what was logged and close
      finishSession(true); S.active = null; save();
    }
  }
  render();
  if (S.active && S.active.phase !== 'done') wakeOn();
  if ('serviceWorker' in navigator && location.protocol.startsWith('http')) {
    window.addEventListener('load', () => navigator.serviceWorker.register('sw.js').catch(() => { /* offline support unavailable */ }));
  }
  window.__gym = { get state() { return S; }, ui, render, tick, buildSession, buildSteps };
})();
