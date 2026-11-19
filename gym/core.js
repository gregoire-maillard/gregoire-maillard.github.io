/* /gym — pure logic (no DOM). Shared by the app and the tests.
   Week maths, time estimates, weight rounding, double progression. */
(function (root) {
  'use strict';

  const DAY = 86400000;

  /* ---------- dates & weeks ---------- */
  function localMidnight(d) { const x = new Date(d); x.setHours(0, 0, 0, 0); return x; }
  function mondayOf(d) {
    const x = localMidnight(d);
    const dow = (x.getDay() + 6) % 7; // Mon = 0
    x.setDate(x.getDate() - dow);
    return x;
  }
  function isoDate(d) {
    const x = new Date(d);
    return x.getFullYear() + '-' + String(x.getMonth() + 1).padStart(2, '0') + '-' + String(x.getDate()).padStart(2, '0');
  }
  function parseISO(s) { const [y, m, d] = s.split('-').map(Number); return new Date(y, m - 1, d); }

  /** Absolute training week (0-based) for a date, given the start date (any day of week 1). */
  function weekIndex(startISO, date) {
    const start = mondayOf(parseISO(startISO));
    const diff = Math.round((mondayOf(date) - start) / DAY);
    return Math.max(0, Math.floor(diff / 7));
  }
  function weekInfo(absWeek, plan) {
    const len = plan.weeks.length;
    const block = Math.floor(absWeek / len);
    const wib = absWeek % len;
    return { abs: absWeek, block, wib, cfg: plan.weeks[wib], label: 'Week ' + (wib + 1) + ' · Block ' + (block + 1) };
  }

  /* ---------- program resolution ---------- */
  function exerciseFor(item, block, swaps) {
    const sw = swaps && swaps[item.slot];
    if (sw) return sw;
    return item.rotation[block % item.rotation.length];
  }
  function setsFor(item, weekCfg) { return weekCfg && weekCfg.deload ? Math.min(item.sets, weekCfg.sets || 2) : item.sets; }

  /* ---------- time estimate ---------- */
  function secPerRep(tempo) {
    return String(tempo || '2-0-1').split('-').reduce((s, p) => s + (p.toUpperCase() === 'X' ? 1 : (parseFloat(p) || 0)), 0) || 3;
  }
  function setWorkSec(item, ex, timing) {
    const top = item.reps[1];
    const setup = timing.setSetup[ex.load] != null ? timing.setSetup[ex.load] : timing.setSetup.other;
    const sides = ex.side ? 2 : 1;
    return top * secPerRep(item.tempo) * sides + setup + (ex.side ? timing.perSideSwitch : 0);
  }
  /** Returns { total, items:[{id, sec, work, sets}] } for one block. */
  function blockTime(block, plan, blockIdx, weekCfg, swaps) {
    const t = plan.timing;
    const setup = block.main ? t.rampUp : (block.setup != null ? block.setup : t.blockSetup);
    const n = block.items.length;
    const rows = block.items.map(item => {
      const id = exerciseFor(item, blockIdx, swaps);
      const ex = plan.exercises[id];
      const sets = setsFor(item, weekCfg);
      const work = setWorkSec(item, ex, t);
      return { id, item, ex, sets, work, sec: sets * (work + item.rest) };
    });
    // the very last rest of the block is not spent (you walk to the next station instead)
    rows[n - 1].sec -= rows[n - 1].item.rest;
    rows.forEach(r => { r.sec += setup / n; });
    const total = rows.reduce((s, r) => s + r.sec, 0);
    return { total, items: rows.map(r => ({ id: r.id, sec: r.sec, work: r.work, sets: r.sets, slot: r.item.slot })) };
  }
  function sessionTime(key, plan, blockIdx, weekCfg, swaps) {
    const s = plan.sessions[key];
    const blocks = s.blocks.map(b => blockTime(b, plan, blockIdx, weekCfg, swaps));
    const work = blocks.reduce((a, b) => a + b.total, 0);
    const warm = s.warmup.reduce((a, x) => a + x.sec, 0);
    const cool = s.cooldown.reduce((a, x) => a + x.sec, 0);
    return { warm, work, cool, total: warm + work + cool, blocks };
  }

  /* ---------- loads & rounding ---------- */
  function loadInfo(ex, st) {
    switch (ex.load) {
      case 'barbell': return { base: st.barbell, step: 2 * Math.min(...st.plates), plate: true };
      case 'ezbar':   return { base: st.ezbar, step: 2 * Math.min(...st.plates), plate: true };
      case 'trapbar': return { base: st.trapbar, step: 2 * Math.min(...st.plates), plate: true };
      case 'smith':   return { base: st.smithBar, step: 2 * Math.min(...st.plates), plate: true };
      case 'sled':    return { base: 0, step: 2 * 2.5, plate: true };
      case 'dumbbell':
      case 'db1':     return { list: st.dumbbells.slice().sort((a, b) => a - b), perHand: ex.load === 'dumbbell' };
      case 'bw':      return { base: 0, step: 2.5, min: -80, bw: true };
      default:        return { base: ex.step || st.stackStep, step: ex.step || st.stackStep };
    }
  }
  function candidates(ex, st) {
    const L = loadInfo(ex, st);
    if (L.list) return L.list;
    const out = [];
    const lo = L.min != null ? L.min : L.base;
    for (let w = lo; w <= 400; w = Math.round((w + L.step) * 100) / 100) out.push(w);
    return out;
  }
  /** mode: 'nearest' | 'down' | 'up' */
  function roundLoad(ex, st, w, mode) {
    const c = candidates(ex, st);
    if (mode === 'down') { let best = c[0]; for (const x of c) if (x <= w + 1e-9) best = x; return best; }
    if (mode === 'up') { for (const x of c) if (x >= w - 1e-9) return x; return c[c.length - 1]; }
    let best = c[0], bd = Infinity;
    for (const x of c) { const d = Math.abs(x - w); if (d < bd - 1e-9) { bd = d; best = x; } }
    return best;
  }
  function stepFrom(ex, st, w, dir) {
    const c = candidates(ex, st);
    if (dir > 0) { for (const x of c) if (x > w + 1e-9) return x; return c[c.length - 1]; }
    let best = c[0]; for (const x of c) if (x < w - 1e-9) best = x; return best;
  }
  /** Plates per side for plate-loaded lifts, e.g. "20 + 2.5". */
  function platesPerSide(ex, st, total) {
    const L = loadInfo(ex, st);
    if (!L.plate) return null;
    let side = (total - L.base) / 2;
    if (side <= 0) return ex.load === 'sled' ? '—' : 'empty bar';
    const out = [];
    for (const p of st.plates.slice().sort((a, b) => b - a)) {
      while (side >= p - 1e-9) { out.push(p); side = Math.round((side - p) * 100) / 100; }
    }
    return out.join(' + ');
  }
  function fmtKg(ex, w) {
    if (ex.load === 'bw') return w === 0 ? 'BW' : (w > 0 ? 'BW +' + w : 'BW −' + Math.abs(w));
    return String(w);
  }

  /* ---------- progression ---------- */
  const e1rm = (w, r) => w * (1 + r / 30);

  /** All non-deload logs of an exercise, newest first: [{date, sets:[{w,r}]}] */
  function historyFor(logs, exId, includeDeload) {
    const out = [];
    for (let i = logs.length - 1; i >= 0; i--) {
      const L = logs[i];
      if (!includeDeload && L.deload) continue;
      const sets = L.ex && L.ex[exId];
      if (sets && sets.length) out.push({ date: L.date, deload: !!L.deload, sets });
    }
    return out;
  }
  function familyEstimate(plan, logs, ex, item, rir) {
    if (!ex.fam || ex.load === 'bw') return null;
    for (let i = logs.length - 1; i >= 0; i--) {
      const L = logs[i];
      if (L.deload || !L.ex) continue;
      for (const id in L.ex) {
        const other = plan.exercises[id];
        if (!other || other === ex || other.fam !== ex.fam || other.load === 'bw') continue;
        const best = Math.max(...L.ex[id].map(s => e1rm(s.w, s.r)));
        const est = best / other.k * ex.k;
        const mid = (item.reps[0] + item.reps[1]) / 2;
        return { w: est / (1 + (mid + rir) / 30), from: other.name };
      }
    }
    return null;
  }

  /**
   * Target for one exercise in one session.
   * Returns { weight, prefill:[reps per set], status, reason }
   */
  function target(plan, st, logs, exId, item, weekCfg) {
    const ex = plan.exercises[exId];
    const [lo, hi] = item.reps;
    const sets = setsFor(item, weekCfg);
    const hist = historyFor(logs, exId);
    const rir = weekCfg ? weekCfg.rir : 2;
    let weight, status, reason, prefill;
    const fill = n => Array.from({ length: sets }, () => n);

    if (hist.length) {
      const last = hist[0].sets;
      const W = last[last.length - 1].w;
      const allTop = last.length >= sets && last.every(s => s.r >= hi && s.w >= W - 1e-9);
      const avg = last.reduce((a, s) => a + s.r, 0) / last.length;
      const perHand = ex.load === 'dumbbell';
      const inc = (ex.region === 'lower' ? st.incLower : st.incUpper) / (perHand ? 2 : 1);
      if (allTop) {
        weight = roundLoad(ex, st, W + inc, 'nearest');
        if (weight <= W) weight = stepFrom(ex, st, W, +1);
        status = 'up'; reason = 'Hit ' + hi + ' reps on every set last time → +' + +(weight - W).toFixed(2) + ' kg';
        prefill = fill(lo);
      } else if (avg < lo) {
        weight = roundLoad(ex, st, W * (1 - st.reduceBy), 'down');
        if (weight >= W) weight = stepFrom(ex, st, W, -1);
        status = 'down'; reason = 'Averaged ' + avg.toFixed(1) + ' reps (< ' + lo + ') → lighter';
        prefill = fill(lo);
      } else {
        weight = W; status = 'hold';
        reason = 'Same weight — beat last time\'s reps (' + last.map(s => s.r).join('/') + ')';
        prefill = Array.from({ length: sets }, (_, i) => Math.min(hi, ((last[i] || last[last.length - 1]).r) + 1));
      }
    } else {
      const fam = familyEstimate(plan, logs, ex, item, rir);
      if (fam) {
        weight = roundLoad(ex, st, fam.w, 'down');
        status = 'estimate'; reason = 'Estimated from your ' + fam.from;
      } else {
        weight = roundLoad(ex, st, ex.start, 'nearest');
        status = 'calibrate'; reason = 'First time: starting guess — log set 1 and the next sets adjust';
      }
      prefill = fill(Math.round((lo + hi) / 2));
    }
    if (weekCfg && weekCfg.deload) {
      const base = weight;
      weight = ex.load === 'bw' ? base : roundLoad(ex, st, base * (weekCfg.load || 0.9), 'down');
      status = 'deload'; reason = 'Deload: ' + Math.round((weekCfg.load || 0.9) * 100) + '% of ' + fmtKg(ex, base) + ' kg';
      prefill = fill(lo);
    }
    return { weight, prefill, status, reason };
  }

  /** Mid-session auto-adjust: after a logged set far outside the range, re-aim the next set. */
  function adjustNext(plan, st, exId, item, weekCfg, w, r) {
    const ex = plan.exercises[exId];
    const [lo, hi] = item.reps;
    if (ex.load === 'bw') return null;
    if (r >= lo - 1 && r <= hi + 2) return null;
    const rir = weekCfg ? weekCfg.rir : 2;
    const mid = (lo + hi) / 2;
    let next = roundLoad(ex, st, e1rm(w, r) / (1 + (mid + rir) / 30), 'nearest');
    if (r > hi + 2 && next <= w) next = stepFrom(ex, st, w, +1);
    if (r < lo - 1 && next >= w) next = stepFrom(ex, st, w, -1);
    return next === w ? null : next;
  }

  const api = { DAY, mondayOf, isoDate, parseISO, weekIndex, weekInfo, exerciseFor, setsFor, secPerRep, setWorkSec, blockTime, sessionTime,
    loadInfo, candidates, roundLoad, stepFrom, platesPerSide, fmtKg, e1rm, historyFor, target, adjustNext };
  if (typeof module !== 'undefined' && module.exports) module.exports = api; else root.GymCore = api;
})(typeof window !== 'undefined' ? window : globalThis);
