/* /gym — pure logic (no DOM): week maths, sets for a week, time estimates. */
(function (root) {
  'use strict';
  const DAY = 86400000;

  function localMidnight(d) { const x = new Date(d); x.setHours(0, 0, 0, 0); return x; }
  function mondayOf(d) { const x = localMidnight(d); x.setDate(x.getDate() - (x.getDay() + 6) % 7); return x; }
  function isoDate(d) { const x = new Date(d); return x.getFullYear() + '-' + String(x.getMonth() + 1).padStart(2, '0') + '-' + String(x.getDate()).padStart(2, '0'); }
  function parseISO(s) { const [y, m, d] = s.split('-').map(Number); return new Date(y, m - 1, d); }

  /** Absolute training week (0-based) for a date, given the start date (any day of week 1). */
  function weekIndex(startISO, date) {
    const diff = Math.round((mondayOf(date) - mondayOf(parseISO(startISO))) / DAY);
    return Math.max(0, Math.floor(diff / 7));
  }
  function weekInfo(abs, plan) {
    const len = plan.weeks.length;
    return { abs, block: Math.floor(abs / len), wib: abs % len, cfg: plan.weeks[abs % len] };
  }

  function exerciseFor(slot, block, swaps) {
    return (swaps && swaps[slot.slot]) || slot.rotation[block % slot.rotation.length];
  }
  /** Sets for an exercise in a given week of the block: [{ reps, level }] */
  function setsFor(plan, ex, wib) {
    const scheme = plan.schemes[ex.type] || plan.schemes.compound;
    return scheme[wib % scheme.length].map(([reps, level]) => ({ reps, level }));
  }

  function exerciseTime(plan, ex, sets, rest) {
    const t = plan.timing, sides = ex.side ? 2 : 1;
    const work = sets.reduce((s, x) => s + x.reps * t.secPerRep * sides + t.setSetup + (ex.side ? t.perSideSwitch : 0), 0);
    return work + (sets.length - 1) * rest + t.exerciseSetup;
  }
  function sessionTime(plan, key, block, wib, swaps) {
    const s = plan.sessions[key];
    const items = s.exercises.map(slot => {
      const id = exerciseFor(slot, block, swaps), ex = plan.exercises[id], sets = setsFor(plan, ex, wib);
      return { id, slot: slot.slot, sets, sec: exerciseTime(plan, ex, sets, slot.rest) };
    });
    const work = items.reduce((a, b) => a + b.sec, 0);
    const warm = s.warmup.reduce((a, x) => a + x.sec, 0), cool = s.cooldown.reduce((a, x) => a + x.sec, 0);
    return { warm, work, cool, total: warm + work + cool, items };
  }

  const api = { DAY, mondayOf, isoDate, parseISO, weekIndex, weekInfo, exerciseFor, setsFor, exerciseTime, sessionTime };
  if (typeof module !== 'undefined' && module.exports) module.exports = api; else root.GymCore = api;
})(typeof window !== 'undefined' ? window : globalThis);
