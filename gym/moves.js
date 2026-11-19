/* /gym — original stick-figure movement animations (SVG, no images).

   How it works
   - One shared skeleton (segment lengths in SEG, metres-ish, y points up).
   - Each pattern lists 2+ keyframes. A keyframe places the hip, the torso
     angle and the hand/foot targets; elbows and knees are solved with 2-bone
     inverse kinematics, so feet stay planted and hands stay on the handle.
   - The loop plays k0 → k1 → … → k0 with short holds.

   Keyframe fields (side view; the figure faces +x / right):
     hip: [x, y]                  pelvis position
     torso: deg                   0 = upright, +90 = lying with head to the right
     head: deg                    extra neck tilt (optional)
     footF / footB: [x, y]        ankle targets (F = near leg, B = far leg; B defaults to F)
     toeF / toeB: deg             foot angle (0 = flat, pointing right)
     handF / handB: [x, y]        absolute hand targets, or
     handFRel / handBRel          relative to the shoulder, or
     handFT / handBT              relative to the shoulder in the torso frame [forward, along]
     armScale: 0–1                foreshortening for arms pointing at the camera
   Front-view patterns (view: 'front') use footR / handR / handRRel and mirror the left side.

   Pattern fields: knee / elbow (+1 or −1: which way the joint bends), eq (equipment drawing),
   anchor (cable pulley position), noFloor, dur (ms).

   To add a move: copy a similar pattern, change the numbers, then in plan.js
   set `anim: '<your key>'` on the exercise. Variant keys like 'squat:goblet'
   are picked automatically when the exercise's prop is 'goblet'. */
(function (root) {
  'use strict';

  const SEG = { shin: 0.45, thigh: 0.45, torso: 0.52, neck: 0.10, headR: 0.095, upper: 0.30, fore: 0.28, shoulderW: 0.19, hipW: 0.09 };
  const rad = d => d * Math.PI / 180;

  /* ---------- equipment helpers (model coordinates) ---------- */
  const line = (x1, y1, x2, y2, w) => ({ t: 'line', a: [x1, y1], b: [x2, y2], w: w || 0.05 });
  const circ = (x, y, r, fill) => ({ t: 'circle', c: [x, y], r, fill });
  const box = (x, y, w, h) => ({ t: 'rect', x, y, w, h });
  const flatBench = (x1, x2, top) => [box(x1, top - 0.09, x2 - x1, 0.09), line(x1 + 0.12, top - 0.09, x1 + 0.12, 0, 0.04), line(x2 - 0.12, top - 0.09, x2 - 0.12, 0, 0.04)];
  const tower = (x) => [line(x, 0, x, 2.0, 0.05)];
  const STAND = { hip: [-0.02, 0.97], torso: 0, footF: [0.02, 0.08] };

  /* ---------- patterns ---------- */
  const P = {
    squat: { knee: 1, elbow: 1, k: [
      { hip: [-0.03, 0.96], torso: 8, footF: [0.02, 0.08], handFRel: [-0.06, 0.03] },
      { hip: [-0.30, 0.50], torso: 42, footF: [0.02, 0.08], handFRel: [-0.06, 0.03] }] },
    'squat:barbell_front': { knee: 1, elbow: -1, k: [
      { hip: [-0.03, 0.96], torso: 5, footF: [0.02, 0.08], handFRel: [0.02, 0.06] },
      { hip: [-0.24, 0.48], torso: 24, footF: [0.02, 0.08], handFRel: [0.02, 0.06] }] },
    'squat:goblet': { knee: 1, elbow: -1, k: [
      { hip: [-0.03, 0.96], torso: 5, footF: [0.02, 0.08], handFRel: [0.19, -0.05] },
      { hip: [-0.25, 0.47], torso: 22, footF: [0.02, 0.08], handFRel: [0.19, -0.05] }] },

    deadlift: { knee: 1, elbow: -1, dur: 2800, k: [
      { hip: [-0.28, 0.58], torso: 62, footF: [0.0, 0.08], handF: [0.08, 0.24] },
      { hip: [-0.02, 0.97], torso: 0, footF: [0.0, 0.08], handF: [-0.02, 0.92] }] },
    rdl: { knee: 1, elbow: -1, dur: 3000, k: [
      { hip: [-0.02, 0.96], torso: 0, footF: [0.02, 0.08], handF: [0.0, 0.91] },
      { hip: [-0.35, 0.85], torso: 72, footF: [0.02, 0.08], handF: [0.10, 0.47] }] },

    bench: { knee: -1, elbow: 1, eq: flatBench(-0.85, 0.45, 0.40), k: [
      { hip: [-0.32, 0.47], torso: 90, footF: [-0.80, 0.08], handF: [0.20, 1.04] },
      { hip: [-0.32, 0.47], torso: 90, footF: [-0.80, 0.08], handF: [0.17, 0.62] }] },
    incline: { knee: -1, elbow: 1,
      eq: [line(-0.31, 0.42, 0.18, 0.70, 0.09), line(-0.55, 0.42, -0.25, 0.42, 0.09), line(-0.10, 0.45, -0.10, 0, 0.04), line(-0.45, 0.40, -0.45, 0, 0.04)],
      k: [
        { hip: [-0.25, 0.50], torso: 60, footF: [-0.65, 0.08], handF: [0.22, 1.32] },
        { hip: [-0.25, 0.50], torso: 60, footF: [-0.65, 0.08], handF: [0.18, 0.92] }] },
    chestpress: { knee: 1, elbow: -1,
      eq: [line(-0.40, 0.45, 0.02, 0.45, 0.08), line(-0.33, 0.47, -0.39, 1.10, 0.08), line(-0.20, 0.45, -0.20, 0, 0.04)],
      k: [
        { hip: [-0.20, 0.52], torso: -5, footF: [0.15, 0.08], handFRel: [0.22, -0.02] },
        { hip: [-0.20, 0.52], torso: -5, footF: [0.15, 0.08], handFRel: [0.56, -0.04] }] },
    pushup: { knee: 1, elbow: -1, k: [
      { hip: [0.09, 0.44], torso: 69, footF: [-0.76, 0.17], toeF: -62, handF: [0.57, 0.02] },
      { hip: [0.14, 0.22], torso: 83, footF: [-0.76, 0.17], toeF: -62, handF: [0.57, 0.02] }] },
    dip: { knee: 1, elbow: -1, eq: [line(-0.22, 1.08, 0.40, 1.08, 0.05), line(-0.16, 1.08, -0.16, 0, 0.04)], k: [
      { hip: [0.03, 1.16], torso: 3, footF: [-0.30, 0.52], handF: [0.05, 1.10] },
      { hip: [0.13, 0.91], torso: 25, footF: [-0.24, 0.26], handF: [0.05, 1.10] }] },

    row_cable: { knee: 1, elbow: -1, anchor: [0.56, 0.32],
      eq: [box(-0.60, 0.22, 0.65, 0.08), line(-0.45, 0.22, -0.45, 0, 0.04), line(0.50, 0.05, 0.50, 0.45, 0.06), line(0.56, 0, 0.56, 0.40, 0.05)],
      k: [
        { hip: [-0.30, 0.38], torso: 18, footF: [0.42, 0.25], toeF: 70, handF: [0.38, 0.62] },
        { hip: [-0.30, 0.38], torso: -8, footF: [0.42, 0.25], toeF: 70, handF: [-0.20, 0.65] }] },
    row_cs: { knee: 1, elbow: -1,
      eq: [line(-0.15, 0.66, 0.25, 0.99, 0.08), line(-0.05, 0.70, -0.05, 0, 0.04)],
      k: [
        { hip: [-0.20, 0.72], torso: 50, footF: [-0.55, 0.08], handFRel: [0.0, -0.57] },
        { hip: [-0.20, 0.72], torso: 50, footF: [-0.55, 0.08], handFRel: [-0.14, -0.22] }] },
    row_bent: { knee: 1, elbow: -1, k: [
      { hip: [-0.18, 0.90], torso: 55, footF: [0.02, 0.08], handFRel: [0.0, -0.57] },
      { hip: [-0.18, 0.90], torso: 55, footF: [0.02, 0.08], handFRel: [-0.12, -0.25] }] },
    invrow: { knee: 1, elbow: 1, eq: [line(-0.40, 0, -0.40, 1.55, 0.04), circ(-0.40, 1.00, 0.035, true)], k: [
      { hip: [0.105, 0.296], torso: -76.2, footF: [0.98, 0.08], toeF: 60, handF: [-0.40, 0.99] },
      { hip: [0.224, 0.568], torso: -57.2, footF: [0.98, 0.08], toeF: 60, handF: [-0.40, 0.99] }] },

    ohp_seated: { knee: 1, elbow: -1,
      eq: [line(-0.35, 0.45, 0.05, 0.45, 0.08), line(-0.30, 0.47, -0.36, 1.25, 0.08), line(-0.15, 0.45, -0.15, 0, 0.04)],
      k: [
        { hip: [-0.15, 0.52], torso: -6, footF: [0.30, 0.08], handFRel: [0.02, 0.57] },
        { hip: [-0.15, 0.52], torso: -6, footF: [0.30, 0.08], handFRel: [0.06, 0.10] }] },
    ohp_standing: { knee: 1, elbow: -1, k: [
      { ...STAND, handFRel: [0.09, 0.04] },
      { ...STAND, handFRel: [0.0, 0.57] }] },

    pulldown: { knee: 1, elbow: -1, anchor: [-0.16, 2.02],
      eq: [line(-0.42, 0.45, 0.02, 0.45, 0.08), line(-0.15, 0.45, -0.15, 0, 0.04), circ(0.22, 0.70, 0.05, true), line(0.22, 0.70, 0.40, 0.70, 0.04)],
      k: [
        { hip: [-0.12, 0.52], torso: -12, footF: [0.30, 0.08], handF: [-0.16, 1.60] },
        { hip: [-0.12, 0.52], torso: -12, footF: [0.30, 0.08], handFRel: [0.11, -0.03] }] },
    pullup: { knee: 1, elbow: -1, eq: [line(-0.30, 1.95, 0.40, 1.95, 0.05)], k: [
      { hip: [0.0, 0.85], torso: -3, footF: [-0.32, 0.50], handF: [0.05, 1.95] },
      { hip: [-0.02, 1.32], torso: -8, footF: [-0.34, 0.97], handF: [0.05, 1.95] }] },
    straight_pd: { knee: 1, elbow: -1, anchor: [0.58, 2.02], k: [
      { hip: [-0.05, 0.95], torso: 25, footF: [0.04, 0.08], handFRel: [0.40, 0.40] },
      { hip: [-0.05, 0.95], torso: 25, footF: [0.04, 0.08], handFRel: [-0.05, -0.565] }] },

    latraise: { view: 'front', elbow: 1, anchor: [-0.75, 0.12], k: [
      { hip: [0, 0.96], footR: [0.12, 0.08], handRRel: [0.05, -0.56] },
      { hip: [0, 0.96], footR: [0.12, 0.08], handRRel: [0.54, -0.04] }] },
    revfly: { view: 'front', elbow: 1, k: [
      { hip: [0, 0.96], footR: [0.12, 0.08], handRRel: [0.04, -0.02], armScale: 0.16 },
      { hip: [0, 0.96], footR: [0.12, 0.08], handRRel: [0.55, 0.0], armScale: 1 }] },
    facepull: { knee: 1, elbow: 1, anchor: [0.66, 1.72], k: [
      { hip: [-0.03, 0.95], torso: -6, footF: [0.15, 0.08], footB: [-0.20, 0.08], handFRel: [0.50, 0.17] },
      { hip: [-0.03, 0.95], torso: -6, footF: [0.15, 0.08], footB: [-0.20, 0.08], handFRel: [0.06, 0.22], armScale: 0.55 }] },

    curl: { knee: 1, elbow: -1, anchor: [0.42, 0.12], k: [
      { ...STAND, handFRel: [0.03, -0.57] },
      { ...STAND, handFRel: [0.17, -0.07] }] },
    pushdown: { knee: 1, elbow: -1, anchor: [0.40, 2.02], k: [
      { hip: [-0.04, 0.97], torso: 10, footF: [0.02, 0.08], handFRel: [0.20, -0.09] },
      { hip: [-0.04, 0.97], torso: 10, footF: [0.02, 0.08], handFRel: [0.07, -0.57] }] },
    ohext: { knee: 1, elbow: -1, anchor: [-0.60, 0.15], k: [
      { hip: [0.0, 0.92], torso: 22, footF: [0.25, 0.08], footB: [-0.25, 0.08], handFRel: [0.20, 0.54] },
      { hip: [0.0, 0.92], torso: 22, footF: [0.25, 0.08], footB: [-0.25, 0.08], handFRel: [-0.16, 0.19] }] },
    skull: { knee: -1, elbow: 1, eq: flatBench(-0.85, 0.45, 0.40), k: [
      { hip: [-0.32, 0.47], torso: 90, footF: [-0.80, 0.08], handFRel: [0.10, 0.57] },
      { hip: [-0.32, 0.47], torso: 90, footF: [-0.80, 0.08], handFRel: [0.33, 0.25] }] },

    legpress: { knee: 1, elbow: -1,
      eq: [line(-0.75, 0.62, -0.30, 0.35, 0.08), line(-0.30, 0.35, 0.05, 0.35, 0.08), line(-0.20, 0.35, -0.20, 0, 0.04), line(0.0, 0.40, 0.80, 1.12, 0.03)],
      dyn: J => { const a = J.ankleF, d = [-0.67, 0.74]; return [line(a[0] + d[0] * 0.28, a[1] + d[1] * 0.28, a[0] - d[0] * 0.22, a[1] - d[1] * 0.22, 0.06)]; },
      k: [
        { hip: [-0.30, 0.42], torso: -55, footF: [0.05, 0.62], toeF: 125, handF: [-0.30, 0.40] },
        { hip: [-0.30, 0.42], torso: -55, footF: [0.40, 0.94], toeF: 125, handF: [-0.30, 0.40] }] },
    legcurl_seated: { knee: 1, elbow: -1,
      eq: [line(-0.40, 0.55, 0.30, 0.55, 0.08), line(-0.33, 0.57, -0.40, 1.15, 0.08), line(-0.10, 0.55, -0.10, 0, 0.04), circ(0.28, 0.73, 0.05, true)],
      dyn: J => [circ(J.ankleF[0], J.ankleF[1] - 0.07, 0.05, true)],
      k: [
        { hip: [-0.15, 0.62], torso: -8, footF: [0.74, 0.50], toeF: 80, handF: [-0.05, 0.58] },
        { hip: [-0.15, 0.62], torso: -8, footF: [0.18, 0.22], toeF: 10, handF: [-0.05, 0.58] }] },
    legcurl_lying: { knee: 1, elbow: -1, eq: flatBench(-1.05, 0.55, 0.48),
      dyn: J => [circ(J.ankleF[0] + 0.02, J.ankleF[1] + 0.07, 0.05, true)],
      k: [
        { hip: [-0.15, 0.56], torso: 90, footF: [-1.04, 0.52], toeF: -100, handF: [0.60, 0.40] },
        { hip: [-0.15, 0.56], torso: 90, footF: [-0.47, 0.98], toeF: -180, handF: [0.60, 0.40] }] },
    legext: { knee: 1, elbow: -1,
      eq: [line(-0.40, 0.55, 0.30, 0.55, 0.08), line(-0.33, 0.57, -0.40, 1.15, 0.08), line(-0.10, 0.55, -0.10, 0, 0.04)],
      dyn: J => [circ(J.ankleF[0] + 0.06, J.ankleF[1] + 0.0, 0.05, true)],
      k: [
        { hip: [-0.15, 0.62], torso: -8, footF: [0.30, 0.18], toeF: 0, handF: [-0.05, 0.58] },
        { hip: [-0.15, 0.62], torso: -8, footF: [0.74, 0.66], toeF: 90, handF: [-0.05, 0.58] }] },

    lunge: { knee: 1, elbow: -1, dur: 3000, k: [
      { hip: [0.0, 0.96], torso: 2, footF: [0.05, 0.08], footB: [0.0, 0.08], handFRel: [0.02, -0.57] },
      { hip: [-0.17, 0.53], torso: 10, footF: [0.05, 0.08], footB: [-0.62, 0.17], toeB: -55, handFRel: [0.02, -0.57] }] },
    splitsquat: { knee: 1, elbow: -1, eq: flatBench(-0.85, -0.38, 0.45), k: [
      { hip: [-0.10, 0.94], torso: 8, footF: [0.32, 0.08], footB: [-0.52, 0.52], toeB: 180, handFRel: [0.02, -0.57] },
      { hip: [-0.16, 0.56], torso: 18, footF: [0.32, 0.08], footB: [-0.52, 0.52], toeB: 180, handFRel: [0.02, -0.57] }] },
    stepup: { knee: 1, elbow: -1, dur: 3000, eq: [box(0.05, 0, 0.50, 0.35)], k: [
      { hip: [-0.12, 0.88], torso: 15, footF: [0.28, 0.43], footB: [-0.25, 0.08], handFRel: [0.02, -0.57] },
      { hip: [0.22, 1.30], torso: 3, footF: [0.28, 0.43], footB: [0.10, 0.62], toeB: -20, handFRel: [0.02, -0.57] }] },

    hipthrust: { knee: 1, elbow: -1, eq: flatBench(-0.75, -0.36, 0.42), k: [
      { hip: [-0.02, 0.24], torso: -58.8, head: 20, footF: [0.42, 0.08], handF: [0.02, 0.36] },
      { hip: [0.06, 0.52], torso: -92, head: 35, footF: [0.42, 0.08], handF: [0.10, 0.64] }] },
    backext: { knee: 1, elbow: -1,
      eq: [line(-0.66, 0.24, -0.50, 0.40, 0.05), line(-0.58, 0.20, 0.10, 0.84, 0.04), circ(0.135, 0.886, 0.055, true), line(-0.58, 0.20, -0.58, 0, 0.04), line(0.0, 0.70, 0.0, 0, 0.04)],
      k: [
        { hip: [0.086, 0.936], torso: 45, footF: [-0.55, 0.30], toeF: -45, handFT: [0.12, -0.12] },
        { hip: [0.086, 0.936], torso: 155, footF: [-0.55, 0.30], toeF: -45, handFT: [0.12, -0.12] }] },

    crunch: { knee: 1, elbow: -1, anchor: [0.34, 2.02], k: [
      { hip: [0.08, 0.50], torso: 15, footF: [-0.40, 0.07], toeF: 180, handFT: [0.10, 0.10] },
      { hip: [0.02, 0.46], torso: 95, head: 15, footF: [-0.40, 0.07], toeF: 180, handFT: [0.10, 0.10] }] },
    kneeraise: { knee: 1, elbow: -1, noFloor: true, eq: [line(-0.30, 2.06, 0.40, 2.06, 0.05)], k: [
      { hip: [0.0, 0.95], torso: 0, footF: [0.02, 0.06], handF: [0.0, 2.06] },
      { hip: [-0.04, 0.97], torso: -10, footF: [0.36, 0.59], handF: [0.0, 2.06] }] },
    pallof: { knee: 1, elbow: -1, k: [
      { ...STAND, handFRel: [0.12, -0.20] },
      { ...STAND, handFRel: [0.56, -0.14] }] }
  };

  /* ---------- maths ---------- */
  function ik(root, target, a, b, s) {
    const dx = target[0] - root[0], dy = target[1] - root[1];
    const d = Math.min(a + b - 1e-4, Math.max(Math.abs(a - b) + 1e-4, Math.hypot(dx, dy)));
    const base = Math.atan2(dy, dx);
    const A = Math.acos(Math.max(-1, Math.min(1, (a * a + d * d - b * b) / (2 * a * d))));
    const ang = base + s * A;
    const j = [root[0] + a * Math.cos(ang), root[1] + a * Math.sin(ang)];
    const ang2 = Math.atan2(target[1] - j[1], target[0] - j[0]);
    return [j, [j[0] + b * Math.cos(ang2), j[1] + b * Math.sin(ang2)]];
  }
  const add = (p, v) => [p[0] + v[0], p[1] + v[1]];
  const lerp = (a, b, t) => a + (b - a) * t;
  const HAND = /^hand(F|B|R)(Rel|T)?$/;
  function handRep(kf, s) { return kf['hand' + s] ? '' : kf['hand' + s + 'Rel'] ? 'Rel' : kf['hand' + s + 'T'] ? 'T' : null; }
  /** Absolute hand target of a keyframe (used when two keyframes describe the hand differently). */
  function handAbs(kf, s, front) {
    const rep = handRep(kf, s);
    if (rep === '') return kf['hand' + s];
    if (front) return add([kf.hip[0] + SEG.shoulderW, kf.hip[1] + SEG.torso - 0.03], kf.handRRel || [0.03, -0.57]);
    const ta = rad(kf.torso || 0), along = [Math.sin(ta), Math.cos(ta)], fwd = [Math.cos(ta), -Math.sin(ta)];
    const sh = add(kf.hip, [SEG.torso * along[0], SEG.torso * along[1]]);
    if (rep === 'Rel') return add(sh, kf['hand' + s + 'Rel']);
    if (rep === 'T') { const v = kf['hand' + s + 'T']; return add(sh, [fwd[0] * v[0] + along[0] * v[1], fwd[1] * v[0] + along[1] * v[1]]); }
    return null;
  }
  function lerpPose(a, b, t) {
    const o = {};
    for (const k of new Set(Object.keys(a).concat(Object.keys(b)))) {
      if (HAND.test(k)) continue;
      const def = k === 'armScale' ? 1 : undefined;
      const va = a[k] != null ? a[k] : (def != null ? def : b[k]), vb = b[k] != null ? b[k] : (def != null ? def : va);
      o[k] = Array.isArray(va) ? [lerp(va[0], vb[0], t), lerp(va[1], vb[1], t)] : lerp(va, vb, t);
    }
    ['F', 'B', 'R'].forEach(s => {
      const ra = handRep(a, s), rb = handRep(b, s);
      if (ra == null && rb == null) return;
      if (ra === rb) { const k = 'hand' + s + ra; o[k] = [lerp(a[k][0], b[k][0], t), lerp(a[k][1], b[k][1], t)]; return; }
      const front = s === 'R';
      const pa = ra == null ? handAbs(b, s, front) : handAbs(a, s, front), pb = rb == null ? pa : handAbs(b, s, front);
      if (front) { const sh = [o.hip[0] + SEG.shoulderW, o.hip[1] + SEG.torso - 0.03]; o.handRRel = [lerp(pa[0], pb[0], t) - sh[0], lerp(pa[1], pb[1], t) - sh[1]]; }
      else o['hand' + s] = [lerp(pa[0], pb[0], t), lerp(pa[1], pb[1], t)];
    });
    return o;
  }
  const ease = t => t < 0.5 ? 2 * t * t : 1 - Math.pow(-2 * t + 2, 2) / 2;

  /** Pose at phase t ∈ [0,1) — k0 → k1 → … → k0 with holds at each keyframe. */
  function poseAt(pat, t) {
    const k = pat.k, n = k.length, seg = 1 / n, hold = 0.18;
    t = ((t % 1) + 1) % 1;
    const i = Math.min(n - 1, Math.max(0, Math.floor(t / seg)));
    let u = (t - i * seg) / seg;
    u = u < hold ? 0 : (u - hold) / (1 - hold);
    return lerpPose(k[i], k[(i + 1) % n], ease(u));
  }

  function solveSide(p, pat) {
    const ta = rad(p.torso || 0);
    const along = [Math.sin(ta), Math.cos(ta)], fwd = [Math.cos(ta), -Math.sin(ta)];
    const hip = p.hip, sh = add(hip, [SEG.torso * along[0], SEG.torso * along[1]]);
    const ha = rad((p.torso || 0) + (p.head || 0));
    const head = add(sh, [(SEG.neck + SEG.headR) * Math.sin(ha), (SEG.neck + SEG.headR) * Math.cos(ha)]);
    const sc = p.armScale != null ? p.armScale : 1;
    const handT = side => {
      if (p['hand' + side]) return p['hand' + side];
      if (p['hand' + side + 'Rel']) return add(sh, p['hand' + side + 'Rel']);
      if (p['hand' + side + 'T']) { const v = p['hand' + side + 'T']; return add(sh, [fwd[0] * v[0] + along[0] * v[1], fwd[1] * v[0] + along[1] * v[1]]); }
      return side === 'B' ? handT('F') : add(sh, [0, -0.57]);
    };
    const foot = side => p['foot' + side] || (side === 'B' ? foot('F') : [hip[0], 0.08]);
    const kn = pat.knee || 1, el = pat.elbow || -1;
    const [kneeF, ankleF] = ik(hip, foot('F'), SEG.thigh, SEG.shin, kn);
    const [kneeB, ankleB] = ik(hip, foot('B'), SEG.thigh, SEG.shin, kn);
    const [elbF, handF] = ik(sh, handT('F'), SEG.upper * sc, SEG.fore * sc, el);
    const [elbB, handB] = ik(sh, handT('B'), SEG.upper * sc, SEG.fore * sc, el);
    return { view: 'side', hip, sh, head, kneeF, ankleF, kneeB, ankleB, elbF, handF, elbB, handB,
      toeF: p.toeF || 0, toeB: p.toeB != null ? p.toeB : (p.toeF || 0) };
  }
  function solveFront(p, pat) {
    const c = p.hip[0];
    const neck = [c, p.hip[1] + SEG.torso];
    const head = [c, neck[1] + SEG.neck + SEG.headR];
    const shR = [c + SEG.shoulderW, neck[1] - 0.03], shL = [c - SEG.shoulderW, neck[1] - 0.03];
    const hipR = [c + SEG.hipW, p.hip[1]], hipL = [c - SEG.hipW, p.hip[1]];
    const sc = p.armScale != null ? p.armScale : 1;
    const tR = p.handR || add(shR, p.handRRel || [0.03, -0.57]);
    const tL = [2 * c - tR[0], tR[1]];
    const fR = p.footR || [c + 0.12, 0.08], fL = [2 * c - fR[0], fR[1]];
    const el = pat.elbow || 1;
    const [elbR, handR] = ik(shR, tR, SEG.upper * sc, SEG.fore * sc, el);
    const [elbL, handL] = ik(shL, tL, SEG.upper * sc, SEG.fore * sc, -el);
    const [kneeR, ankleR] = ik(hipR, fR, SEG.thigh, SEG.shin, 1);
    const [kneeL, ankleL] = ik(hipL, fL, SEG.thigh, SEG.shin, -1);
    return { view: 'front', hip: p.hip, neck, head, shR, shL, hipR, hipL, elbR, handR, elbL, handL, kneeR, ankleR, kneeL, ankleL };
  }
  function solve(pat, t) { const p = poseAt(pat, t); return pat.view === 'front' ? solveFront(p, pat) : solveSide(p, pat); }

  /* ---------- SVG ---------- */
  // Each pattern gets a viewBox fitted to everything it draws over a full loop (cached).
  let BX = { x0: -1.15, y1: 2.15 };
  const X = x => +((x - BX.x0) * 100).toFixed(1);
  const Y = y => +((BX.y1 - y) * 100).toFixed(1);
  const seg = (a, b, cls, w) => `<line class="${cls}" x1="${X(a[0])}" y1="${Y(a[1])}" x2="${X(b[0])}" y2="${Y(b[1])}"${w ? ` stroke-width="${w}"` : ''}/>`;
  const dot = (c, r, cls) => `<circle class="${cls}" cx="${X(c[0])}" cy="${Y(c[1])}" r="${(r * 100).toFixed(1)}"/>`;
  const boxCache = {};
  function fitBox(pat, key, prop) {
    const ck = key + '|' + prop;
    if (boxCache[ck]) return boxCache[ck];
    let x0 = Infinity, y0 = Infinity, x1 = -Infinity, y1 = -Infinity;
    const addP = (q, r) => { r = r || 0; x0 = Math.min(x0, q[0] - r); x1 = Math.max(x1, q[0] + r); y0 = Math.min(y0, q[1] - r); y1 = Math.max(y1, q[1] + r); };
    const plateR = /barbell|trapbar/.test(prop || '') ? 0.19 : 0.08;
    for (let t = 0; t < 1; t += 0.04) {
      const J = solve(pat, t);
      for (const k in J) if (Array.isArray(J[k]) && typeof J[k][0] === 'number') addP(J[k], 0.05);
      addP(J.head, SEG.headR + 0.03);
      if (J.view === 'front') { addP(J.handR, plateR); addP(J.handL, plateR); if (/barbell/.test(prop || '')) { addP([J.handR[0] + 0.3, J.handR[1]]); addP([J.handL[0] - 0.3, J.handL[1]]); } }
      else { addP(J.handF, plateR); addP(footPts(J.ankleF, J.toeF)[1], 0.04); addP(footPts(J.ankleB, J.toeB)[1], 0.04); }
      if (pat.dyn) pat.dyn(J).forEach(s => { if (s.t === 'line') { addP(s.a, 0.03); addP(s.b, 0.03); } else if (s.t === 'circle') addP(s.c, s.r); });
    }
    (pat.eq || []).forEach(s => {
      if (s.t === 'line') { addP(s.a, 0.03); addP(s.b, 0.03); } else if (s.t === 'circle') addP(s.c, s.r);
      else if (s.t === 'rect') { addP([s.x, s.y]); addP([s.x + s.w, s.y + s.h]); }
    });
    if (pat.anchor) { addP(pat.anchor, 0.04); if (pat.view === 'front') addP([-pat.anchor[0], pat.anchor[1]], 0.04); }
    if (!pat.noFloor) y0 = Math.min(y0, -0.03);
    const pad = 0.07;
    x0 -= pad; x1 += pad; y0 -= pad * 0.5; y1 += pad;
    // keep figures from getting too letterboxed: minimum aspect
    const w = x1 - x0, h = y1 - y0;
    if (w < h * 0.75) { const d = (h * 0.75 - w) / 2; x0 -= d; x1 += d; }
    if (h < w * 0.45) { const d = (w * 0.45 - h); y1 += d * 0.7; y0 -= d * 0.3; }
    return (boxCache[ck] = { x0, y0, x1, y1, w: Math.round((x1 - x0) * 100), h: Math.round((y1 - y0) * 100) });
  }
  function footPts(ankle, deg) {
    const a = rad(deg), R = v => [ankle[0] + v[0] * Math.cos(a) - v[1] * Math.sin(a), ankle[1] + v[0] * Math.sin(a) + v[1] * Math.cos(a)];
    return [R([-0.05, -0.06]), R([0.17, -0.06])];
  }
  function shapeSVG(s) {
    if (s.t === 'line') return seg(s.a, s.b, 'fig-eq', (s.w * 100).toFixed(1));
    if (s.t === 'circle') return dot(s.c, s.r, s.fill ? 'fig-eqf' : 'fig-eq');
    if (s.t === 'rect') return `<rect class="fig-eqf" x="${X(s.x)}" y="${Y(s.y + s.h)}" width="${(s.w * 100).toFixed(1)}" height="${(s.h * 100).toFixed(1)}" rx="2"/>`;
    return '';
  }
  function propSVG(J, prop, front) {
    if (!prop) return '';
    const hands = front ? [J.handR, J.handL] : [J.handF];
    switch (prop) {
      case 'barbell': case 'barbell_back': case 'barbell_front': case 'trapbar':
        if (front) return seg([J.handL[0] - 0.28, J.handL[1]], [J.handR[0] + 0.28, J.handR[1]], 'fig-bar', 4) +
          seg([J.handL[0] - 0.24, J.handL[1] - 0.17], [J.handL[0] - 0.24, J.handL[1] + 0.17], 'fig-plate-l', 8) +
          seg([J.handR[0] + 0.24, J.handR[1] - 0.17], [J.handR[0] + 0.24, J.handR[1] + 0.17], 'fig-plate-l', 8);
        return dot(J.handF, 0.17, 'fig-plate') + dot(J.handF, 0.025, 'fig-hub');
      case 'dumbbell':
        return hands.map(h => dot(h, 0.06, 'fig-plate')).join('');
      case 'goblet': case 'db1':
        return `<rect class="fig-plate" x="${X(J.handF[0] - 0.05)}" y="${Y(J.handF[1] + 0.09)}" width="10" height="18" rx="3"/>`;
      case 'plate_small':
        return dot(J.handF, 0.1, 'fig-plate');
      default:
        return hands.map(h => dot(h, 0.032, 'fig-handle')).join('');
    }
  }
  function figureSVG(J, pat, prop, cable) {
    let s = '';
    if (!pat.noFloor) s += seg([BX.x0, 0], [BX.x1, 0], 'fig-floor');
    (pat.eq || []).forEach(e => { s += shapeSVG(e); });
    if (pat.dyn) pat.dyn(J).forEach(e => { s += shapeSVG(e); });
    if (cable && pat.anchor) {
      if (J.view === 'front') {
        const aL = [-pat.anchor[0], pat.anchor[1]];
        s += seg(pat.anchor, J.handR, 'fig-cable') + seg(aL, J.handL, 'fig-cable') + dot(pat.anchor, 0.035, 'fig-eqf') + dot(aL, 0.035, 'fig-eqf');
      } else s += seg(pat.anchor, J.handF, 'fig-cable') + dot(pat.anchor, 0.035, 'fig-eqf');
    }
    if (J.view === 'front') {
      s += seg(J.hipL, J.kneeL, 'fig-b') + seg(J.kneeL, J.ankleL, 'fig-b') + seg(J.hipR, J.kneeR, 'fig-b') + seg(J.kneeR, J.ankleR, 'fig-b');
      s += seg(J.ankleL, [J.ankleL[0] - 0.08, J.ankleL[1] - 0.06], 'fig-b') + seg(J.ankleR, [J.ankleR[0] + 0.08, J.ankleR[1] - 0.06], 'fig-b');
      s += seg(J.hipL, J.hipR, 'fig-b') + seg(J.hip, J.neck, 'fig-b') + seg(J.shL, J.shR, 'fig-b');
      s += seg(J.shL, J.elbL, 'fig-b') + seg(J.elbL, J.handL, 'fig-b') + seg(J.shR, J.elbR, 'fig-b') + seg(J.elbR, J.handR, 'fig-b');
      s += dot(J.head, SEG.headR, 'fig-head');
      s += propSVG(J, prop, true);
      return s;
    }
    const fB = footPts(J.ankleB, J.toeB), fF = footPts(J.ankleF, J.toeF);
    // far limbs first, dimmed
    s += `<g class="fig-far">${seg(J.hip, J.kneeB, 'fig-b')}${seg(J.kneeB, J.ankleB, 'fig-b')}${seg(fB[0], fB[1], 'fig-b')}${seg(J.sh, J.elbB, 'fig-b')}${seg(J.elbB, J.handB, 'fig-b')}</g>`;
    s += seg(J.hip, J.sh, 'fig-b') + dot(J.head, SEG.headR, 'fig-head');
    s += seg(J.hip, J.kneeF, 'fig-b') + seg(J.kneeF, J.ankleF, 'fig-b') + seg(fF[0], fF[1], 'fig-b');
    s += seg(J.sh, J.elbF, 'fig-b') + seg(J.elbF, J.handF, 'fig-b');
    s += propSVG(J, prop, false);
    return s;
  }

  function resolve(anim, prop) { return P[anim + ':' + prop] || P[anim] || P.squat; }

  /** Static SVG markup for a frame (t ∈ [0,1)). */
  function keyOf(anim, prop) { return P[anim + ':' + prop] ? anim + ':' + prop : P[anim] ? anim : 'squat'; }
  function frame(anim, prop, t, opts) {
    const pat = resolve(anim, prop), box = fitBox(pat, keyOf(anim, prop), prop);
    BX = box;
    const J = solve(pat, t || 0);
    return `<svg class="fig" viewBox="0 0 ${box.w} ${box.h}" role="img" aria-label="Movement demo">${figureSVG(J, pat, prop, opts && opts.cable)}</svg>`;
  }

  /** Mount a looping animation into el. Returns { stop }. */
  function mount(el, anim, prop, opts) {
    const pat = resolve(anim, prop), box = fitBox(pat, keyOf(anim, prop), prop);
    const dur = (pat.dur || 2600) * ((opts && opts.speed) || 1);
    el.innerHTML = `<svg class="fig" viewBox="0 0 ${box.w} ${box.h}" role="img" aria-label="Movement demo"><g></g></svg>`;
    const g = el.querySelector('g');
    const reduce = root.matchMedia && root.matchMedia('(prefers-reduced-motion: reduce)').matches;
    let raf = 0, t0 = performance.now(), stopped = false;
    const draw = now => {
      if (stopped || !el.isConnected) return;
      const t = reduce ? 0.5 : Math.max(0, now - t0) % dur / dur;
      BX = box;
      g.innerHTML = figureSVG(solve(pat, t), pat, prop, opts && opts.cable);
      if (!reduce) raf = requestAnimationFrame(draw);
    };
    raf = requestAnimationFrame(draw);
    return { stop() { stopped = true; cancelAnimationFrame(raf); } };
  }

  root.GymMoves = { SEG, P, frame, mount, solve, resolve, keys: () => Object.keys(P) };
})(typeof window !== 'undefined' ? window : globalThis);
