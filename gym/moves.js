/* /gym — original movement animations: two shaded characters (Grégoire, Jacqueline) in SVG, with the working muscles highlighted. No images, no libraries.

   How it works
   - One shared skeleton (segment lengths in SEG, metres-ish, y points up).
   - Each pattern lists 2+ keyframes (or a pose(t) function for circular moves).
     A keyframe places the hip, the torso angle and the hand/foot targets;
     elbows and knees are solved with 2-bone inverse kinematics, so feet stay
     planted and hands stay on the handle.
   - The renderer draws tapered, shaded limbs, a torso with chest/back volume,
     a head with a nose (so you can see where the figure faces) and a floor shadow.

   Keyframe fields (side view; the figure faces +x / right):
     hip: [x, y]                  pelvis position
     torso: deg                   0 = upright, +90 = lying with head to the right
     bend: m                      spine curve (+ rounds the back, − arches it)
     head: deg                    extra neck tilt (+ = chin down)
     chest: 0–1                   breath (chest expands)
     footF / footB: [x, y]        ankle targets (F = near leg, B = far leg; B defaults to F)
     toeF / toeB: deg             foot angle (0 = flat, pointing right)
     handF / handB: [x, y]        absolute hand targets, or
     handFRel / handBRel          relative to the shoulder, or
     handFT / handBT              relative to the shoulder in the torso frame [forward, along]
     armScale: 0–1                foreshortening for arms pointing at the camera
   Front-view patterns (view: 'front') use footR / handR / handRRel and mirror the left
   side unless footL / handL / handLRel are given.

   Pattern fields: knee / kneeB / elbow / elbowL (+1 or −1: which way the joint bends),
   eq (equipment), dyn(J) (equipment that moves), anchor (cable pulley), cable (always
   draw the cable), prop (default prop), noFloor, dur (ms), segs (relative duration of
   each transition), hold (pause fraction at each keyframe), pose(t) (procedural).

   To add a move: copy a similar pattern, change the numbers, then in plan.js set
   `anim: '<key>'` on the exercise (or warm-up item; a list plays one after the other).
   Variant keys like 'squat:goblet' are picked when the exercise's prop is 'goblet'. */
(function (root) {
  'use strict';

  const SEG = { shin: 0.45, thigh: 0.45, torso: 0.52, neck: 0.10, headR: 0.095, upper: 0.30, fore: 0.28, shoulderW: 0.19, hipW: 0.09 };
  const rad = d => d * Math.PI / 180;

  /* ---------- equipment helpers (model coordinates) ---------- */
  const line = (x1, y1, x2, y2, w) => ({ t: 'line', a: [x1, y1], b: [x2, y2], w: w || 0.05 });
  const circ = (x, y, r, fill) => ({ t: 'circle', c: [x, y], r, fill });
  const box = (x, y, w, h) => ({ t: 'rect', x, y, w, h });
  const flatBench = (x1, x2, top) => [box(x1, top - 0.09, x2 - x1, 0.09), line(x1 + 0.12, top - 0.09, x1 + 0.12, 0, 0.04), line(x2 - 0.12, top - 0.09, x2 - 0.12, 0, 0.04)];
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
,

    /* ---------- warm-up ---------- */
    rower: { knee: 1, elbow: -1, dur: 3000, segs: [0.8, 0.7, 1.5], hold: 0.06, cable: true, anchor: [0.74, 0.44],
      eq: [line(-0.90, 0.28, 0.70, 0.28, 0.05), line(-0.85, 0.28, -0.85, 0, 0.04), line(0.55, 0.28, 0.55, 0, 0.04), circ(0.82, 0.42, 0.15, true), line(0.43, 0.20, 0.55, 0.40, 0.05)],
      dyn: J => [box(J.hip[0] - 0.11, 0.29, 0.22, 0.05)],
      k: [
        { hip: [0.00, 0.40], torso: 25, footF: [0.48, 0.32], toeF: 55, handF: [0.72, 0.66] },
        { hip: [-0.40, 0.40], torso: -15, footF: [0.48, 0.32], toeF: 55, handFRel: [0.16, -0.20] },
        { hip: [-0.38, 0.40], torso: 18, footF: [0.48, 0.32], toeF: 55, handF: [0.30, 0.66] }] },
    bike: { knee: 1, elbow: -1, dur: 1500,
      eq: [line(-0.12, 0.04, 0.60, 0.04, 0.06), line(0.06, 0.04, 0.06, 0.32, 0.05), line(0.06, 0.32, -0.14, 0.86, 0.05), box(-0.27, 0.86, 0.26, 0.06), line(0.06, 0.32, 0.40, 0.95, 0.05), line(0.40, 0.95, 0.48, 1.06, 0.04), circ(0.38, 0.30, 0.17, true)],
      dyn: J => [line(0.06, 0.32, J.ankleF[0], J.ankleF[1], 0.025)],
      pose: t => { const a = -2 * Math.PI * t, r = 0.16; return { hip: [-0.14, 0.95], torso: 28, footF: [0.06 + r * Math.cos(a), 0.32 + r * Math.sin(a)], footB: [0.06 - r * Math.cos(a), 0.32 - r * Math.sin(a)], toeF: -8 + 10 * Math.sin(a), toeB: -8 - 10 * Math.sin(a), handF: [0.46, 1.06] }; } },
    armcircles: { view: 'front', elbow: 1, dur: 1300,
      pose: t => { const a = 2 * Math.PI * t; return { hip: [0, 0.96], footR: [0.13, 0.08], handRRel: [0.53 + 0.07 * Math.cos(a), -0.02 + 0.07 * Math.sin(a)] }; } },
    pullapart: { view: 'front', elbow: 1, prop: 'band', dur: 2400, k: [
      { hip: [0, 0.96], footR: [0.13, 0.08], handRRel: [-0.07, -0.03], armScale: 0.2 },
      { hip: [0, 0.96], footR: [0.13, 0.08], handRRel: [0.54, 0.0], armScale: 1 }] },
    scap_pushup: { knee: 1, elbow: -1, dur: 1800, k: [
      { hip: [0.09, 0.44], torso: 69, footF: [-0.76, 0.17], toeF: -62, handF: [0.57, 0.02], bend: 0.035 },
      { hip: [0.09, 0.42], torso: 71, footF: [-0.76, 0.17], toeF: -62, handF: [0.57, 0.02], bend: -0.02 }] },
    catcow: { knee: 1, elbow: -1, dur: 3600, k: [
      { hip: [-0.35, 0.48], torso: 79, footF: [-0.78, 0.07], toeF: -165, handF: [0.16, 0.02], bend: 0.09, head: 30 },
      { hip: [-0.35, 0.47], torso: 80, footF: [-0.78, 0.07], toeF: -165, handF: [0.16, 0.02], bend: -0.07, head: -30 }] },
    legswing: { knee: 1, elbow: -1, dur: 1700, eq: [line(0.46, 0, 0.46, 1.25, 0.05)],
      pose: t => { const th = 10 + 45 * Math.sin(2 * Math.PI * t), r = rad(th); return { hip: [0.0, 0.97], torso: -th * 0.08, footF: [0.89 * Math.sin(r), 0.97 - 0.89 * Math.cos(r)], toeF: th * 0.7, footB: [0.0, 0.08], handF: [0.44, 1.12] }; } },
    legswing_side: { view: 'front', elbow: 1, dur: 1700,
      pose: t => { const ph = 8 + 30 * Math.sin(2 * Math.PI * t), r = rad(ph); return { hip: [0, 0.97], footR: [0.09 + 0.88 * Math.sin(r), 0.97 - 0.88 * Math.cos(r)], footL: [-0.11, 0.08], handRRel: [0.30, -0.42], handLRel: [-0.30, -0.42] }; } },
    bw_squat: { knee: 1, elbow: -1, k: [
      { hip: [-0.03, 0.96], torso: 3, footF: [0.02, 0.08], handFRel: [0.03, -0.57] },
      { hip: [-0.28, 0.48], torso: 35, footF: [0.02, 0.08], handFRel: [0.55, 0.02] }] },
    glute_bridge: { knee: 1, elbow: -1, k: [
      { hip: [0.0, 0.13], torso: -90, footF: [0.38, 0.08], handF: [0.04, 0.05] },
      { hip: [0.0, 0.40], torso: -121, head: 31, footF: [0.38, 0.08], handF: [0.08, 0.05] }] },
    wgs: { knee: 1, elbow: -1, dur: 3600, k: [
      { hip: [-0.05, 0.42], torso: 70, footF: [0.40, 0.08], footB: [-0.78, 0.12], toeB: -50, handF: [0.40, 0.03], handB: [0.32, 0.03] },
      { hip: [-0.05, 0.44], torso: 66, head: -35, footF: [0.40, 0.08], footB: [-0.78, 0.12], toeB: -50, handF: [0.46, 1.17], handB: [0.32, 0.03] }] },
    inchworm: { knee: 1, elbow: -1, dur: 6400, k: [
      { hip: [-0.47, 0.97], torso: 0, footF: [-0.45, 0.08], handFRel: [0.03, -0.57] },
      { hip: [-0.62, 0.90], torso: 160, footF: [-0.45, 0.08], handF: [-0.20, 0.02] },
      { hip: [0.408, 0.443], torso: 72.3, footF: [-0.45, 0.17], toeF: -62, handF: [0.90, 0.02] },
      { hip: [-0.62, 0.90], torso: 160, footF: [-0.45, 0.08], handF: [-0.20, 0.02] }] },
    squat_reach: { knee: 1, elbow: -1, dur: 3000, k: [
      { hip: [-0.28, 0.48], torso: 35, footF: [0.02, 0.08], handFRel: [0.55, 0.02] },
      { hip: [-0.02, 0.97], torso: -3, head: -10, footF: [0.02, 0.08], handFRel: [0.06, 0.57] }] },

    /* ---------- cool-down ---------- */
    doorway: { knee: 1, elbow: 1, dur: 4500, eq: [line(-0.33, 0, -0.33, 2.05, 0.07)], k: [
      { hip: [-0.02, 0.97], torso: 0, footF: [0.22, 0.08], footB: [-0.10, 0.08], handF: [-0.30, 1.78] },
      { hip: [0.08, 0.96], torso: 9, footF: [0.22, 0.08], footB: [-0.10, 0.08], handF: [-0.30, 1.78] }] },
    latstretch: { knee: 1, elbow: -1, dur: 4500, eq: [line(0.70, 0, 0.70, 2.0, 0.07)], k: [
      { hip: [-0.30, 0.86], torso: 62, footF: [0.0, 0.08], handF: [0.62, 1.10] },
      { hip: [-0.42, 0.72], torso: 76, head: 18, footF: [0.0, 0.08], handF: [0.62, 1.10] }] },
    crossbody: { view: 'front', elbow: 1, elbowL: -1, dur: 4000, k: [
      { hip: [0, 0.96], footR: [0.13, 0.08], handR: [-0.20, 1.44], handL: [0.06, 1.38] },
      { hip: [0, 0.96], footR: [0.13, 0.08], handR: [-0.38, 1.40], handL: [-0.06, 1.37] }] },
    childpose: { knee: 1, elbow: -1, dur: 5000, segs: [0.4, 0.6], hold: 0.08, k: [
      { hip: [-0.30, 0.28], torso: 105, footF: [-0.38, 0.06], toeF: -165, handF: [0.76, 0.04] },
      { hip: [-0.29, 0.31], torso: 99, bend: 0.04, chest: 1, footF: [-0.38, 0.06], toeF: -165, handF: [0.76, 0.04] }] },
    breathing: { knee: 1, elbow: -1, dur: 10000, segs: [0.4, 0.6], hold: 0.04, eq: flatBench(-0.55, 0.05, 0.46),
      dyn: J => [{ t: 'ring', c: [J.sh[0] + 0.02, J.sh[1] - 0.12], r: 0.26 + 0.12 * (J.chest || 0) }],
      k: [
        { hip: [-0.18, 0.55], torso: -2, footF: [0.30, 0.08], handF: [0.12, 0.60], chest: 0 },
        { hip: [-0.18, 0.55], torso: -5, head: -4, footF: [0.30, 0.08], handF: [0.11, 0.61], chest: 1 }] },
    couch: { knee: 1, kneeB: 1, elbow: -1, dur: 4500, eq: [box(-0.82, 0, 0.40, 0.46)], k: [
      { hip: [-0.18, 0.47], torso: 2, footF: [0.35, 0.08], footB: [-0.36, 0.46], toeB: 100, handF: [0.20, 0.60] },
      { hip: [-0.08, 0.45], torso: -8, footF: [0.35, 0.08], footB: [-0.36, 0.46], toeB: 100, handF: [0.22, 0.62] }] },
    hamstring: { knee: 1, elbow: -1, dur: 4500, eq: [box(0.38, 0, 0.42, 0.38)], k: [
      { hip: [-0.08, 0.97], torso: 12, footF: [0.60, 0.46], toeF: 70, footB: [-0.05, 0.08], handFRel: [0.08, -0.56] },
      { hip: [-0.10, 0.96], torso: 52, footF: [0.60, 0.46], toeF: 70, footB: [-0.05, 0.08], handF: [0.42, 0.74] }] },
    figure4: { knee: -1, kneeB: 1, elbow: -1, dur: 4500, k: [
      { hip: [0.0, 0.12], torso: -90, footB: [0.45, 0.55], footF: [0.04, 0.50], handF: [0.02, 0.36], handB: [0.0, 0.36] },
      { hip: [0.0, 0.12], torso: -90, footB: [0.33, 0.63], footF: [-0.04, 0.55], handF: [-0.04, 0.40], handB: [-0.06, 0.40] }] },
    calfstretch: { knee: 1, elbow: -1, dur: 4000, eq: [box(0.06, 0, 0.55, 0.15), line(0.50, 0, 0.50, 1.35, 0.05)], k: [
      { hip: [-0.04, 1.08], torso: 2, footF: [-0.03, 0.21], toeF: 0, handF: [0.46, 1.22] },
      { hip: [-0.05, 1.00], torso: 4, footF: [-0.04, 0.132], toeF: 25, handF: [0.46, 1.20] }] }
  };


  /* Lying face-up patterns are authored like the face-down ones and mirrored here:
     mirroring x and negating the torso angle turns the figure's chest to face up. */
  function mirrorPat(pat, over) {
    const mx = v => [-v[0], v[1]];
    const kf = k => { const o = {}; for (const key in k) { const v = k[key];
      if (key === 'torso' || key === 'head') o[key] = -v;
      else if (/^(hip|foot[FB]|hand[FB](Rel)?)$/.test(key)) o[key] = mx(v);
      else if (/^toe/.test(key)) o[key] = 180 - v;
      else o[key] = v; } return Object.assign(o, over || {}); };
    const eq = (pat.eq || []).map(s => s.t === 'line' ? Object.assign({}, s, { a: mx(s.a), b: mx(s.b) }) : s.t === 'circle' ? Object.assign({}, s, { c: mx(s.c) }) : s.t === 'rect' ? Object.assign({}, s, { x: -(s.x + s.w) }) : s);
    return Object.assign({}, pat, { knee: -(pat.knee || 1), elbow: -(pat.elbow || -1), eq, anchor: pat.anchor && mx(pat.anchor), k: pat.k.map(kf) });
  }
  ['bench', 'incline', 'skull'].forEach(k => { P[k] = mirrorPat(P[k], { toeF: 0 }); });

  /* ---------- maths ---------- */
  function ik(rootP, target, a, b, s) {
    const dx = target[0] - rootP[0], dy = target[1] - rootP[1];
    const d = Math.min(a + b - 1e-4, Math.max(Math.abs(a - b) + 1e-4, Math.hypot(dx, dy)));
    const base = Math.atan2(dy, dx);
    const A = Math.acos(Math.max(-1, Math.min(1, (a * a + d * d - b * b) / (2 * a * d))));
    const ang = base + s * A;
    const j = [rootP[0] + a * Math.cos(ang), rootP[1] + a * Math.sin(ang)];
    const ang2 = Math.atan2(target[1] - j[1], target[0] - j[0]);
    return [j, [j[0] + b * Math.cos(ang2), j[1] + b * Math.sin(ang2)]];
  }
  const add = (p, v) => [p[0] + v[0], p[1] + v[1]];
  const lerp = (a, b, t) => a + (b - a) * t;
  const ease = t => t < 0.5 ? 2 * t * t : 1 - Math.pow(-2 * t + 2, 2) / 2;

  const HAND = /^hand(F|B|R|L)(Rel|T)?$/;
  function handRep(kf, s) { return kf['hand' + s] ? '' : kf['hand' + s + 'Rel'] ? 'Rel' : kf['hand' + s + 'T'] ? 'T' : null; }
  function frontSh(kf, s) { return [kf.hip[0] + (s === 'L' ? -1 : 1) * SEG.shoulderW, kf.hip[1] + SEG.torso - 0.03]; }
  /** Absolute hand target of a keyframe (used when two keyframes describe the hand differently). */
  function handAbs(kf, s, front) {
    const rep = handRep(kf, s);
    if (rep === '') return kf['hand' + s];
    if (front) {
      if (s === 'L' && rep == null) { const r = handAbs(kf, 'R', true); return [2 * kf.hip[0] - r[0], r[1]]; }
      return add(frontSh(kf, s), kf['hand' + s + 'Rel'] || [0.03, -0.57]);
    }
    const ta = rad(kf.torso || 0), along = [Math.sin(ta), Math.cos(ta)], fwd = [Math.cos(ta), -Math.sin(ta)];
    const sh = add(kf.hip, [SEG.torso * along[0], SEG.torso * along[1]]);
    if (rep === 'Rel') return add(sh, kf['hand' + s + 'Rel']);
    if (rep === 'T') { const v = kf['hand' + s + 'T']; return add(sh, [fwd[0] * v[0] + along[0] * v[1], fwd[1] * v[0] + along[1] * v[1]]); }
    return null;
  }
  function lerpPose(a, b, t, front) {
    const o = {};
    for (const k of new Set(Object.keys(a).concat(Object.keys(b)))) {
      if (HAND.test(k)) continue;
      const def = k === 'armScale' ? 1 : (k === 'bend' || k === 'chest' || k === 'head') ? 0 : undefined;
      const va = a[k] != null ? a[k] : (def != null ? def : b[k]), vb = b[k] != null ? b[k] : (def != null ? def : va);
      o[k] = Array.isArray(va) ? [lerp(va[0], vb[0], t), lerp(va[1], vb[1], t)] : lerp(va, vb, t);
    }
    (front ? ['R', 'L'] : ['F', 'B']).forEach(s => {
      const ra = handRep(a, s), rb = handRep(b, s);
      if (ra == null && rb == null) return;
      if (ra === rb) { const k = 'hand' + s + ra; o[k] = [lerp(a[k][0], b[k][0], t), lerp(a[k][1], b[k][1], t)]; return; }
      const pa = ra == null && !front ? handAbs(b, s) : handAbs(a, s, front), pb = rb == null && !front ? pa : handAbs(b, s, front);
      o['hand' + s] = [lerp(pa[0], pb[0], t), lerp(pa[1], pb[1], t)];
    });
    return o;
  }

  /** Pose at phase t ∈ [0,1): k0 → k1 → … → k0 with holds at each keyframe (or pattern.pose(t)). */
  function poseAt(pat, t) {
    t = ((t % 1) + 1) % 1;
    if (pat.pose) return pat.pose(t);
    const k = pat.k, n = k.length, segs = pat.segs || k.map(() => 1);
    const tot = segs.reduce((s, x) => s + x, 0);
    let u = t * tot, i = 0;
    for (; i < n - 1; i++) { if (u < segs[i]) break; u -= segs[i]; }
    u = Math.min(1, u / segs[i]);
    const hold = pat.hold != null ? pat.hold : 0.18;
    u = u < hold ? 0 : (u - hold) / (1 - hold);
    return lerpPose(k[i], k[(i + 1) % n], pat.linear ? u : ease(u), pat.view === 'front');
  }

  function solveSide(p, pat) {
    const ta = rad(p.torso || 0);
    const along = [Math.sin(ta), Math.cos(ta)], fwd = [Math.cos(ta), -Math.sin(ta)];
    const hip = p.hip, sh = add(hip, [SEG.torso * along[0], SEG.torso * along[1]]);
    const bend = p.bend || 0;
    // spine tangent at the shoulder (quadratic curve through a control point offset by the bend)
    const C = [(hip[0] + sh[0]) / 2 - fwd[0] * bend * 2, (hip[1] + sh[1]) / 2 - fwd[1] * bend * 2];
    let tt = [sh[0] - C[0], sh[1] - C[1]]; const tl = Math.hypot(tt[0], tt[1]) || 1; tt = [tt[0] / tl, tt[1] / tl];
    const hr = -rad(p.head || 0);
    const hd = [tt[0] * Math.cos(hr) - tt[1] * Math.sin(hr), tt[0] * Math.sin(hr) + tt[1] * Math.cos(hr)];
    const head = add(sh, [(SEG.neck + SEG.headR) * hd[0], (SEG.neck + SEG.headR) * hd[1]]);
    const sc = p.armScale != null ? p.armScale : 1;
    const handT = side => {
      if (p['hand' + side]) return p['hand' + side];
      if (p['hand' + side + 'Rel']) return add(sh, p['hand' + side + 'Rel']);
      if (p['hand' + side + 'T']) { const v = p['hand' + side + 'T']; return add(sh, [fwd[0] * v[0] + along[0] * v[1], fwd[1] * v[0] + along[1] * v[1]]); }
      return side === 'B' ? handT('F') : add(sh, [0, -0.57]);
    };
    const foot = side => p['foot' + side] || (side === 'B' ? foot('F') : [hip[0], 0.08]);
    const kn = pat.knee || 1, knB = pat.kneeB != null ? pat.kneeB : kn, el = pat.elbow || -1, elB = pat.elbowB != null ? pat.elbowB : el;
    const [kneeF, ankleF] = ik(hip, foot('F'), SEG.thigh, SEG.shin, kn);
    const [kneeB, ankleB] = ik(hip, foot('B'), SEG.thigh, SEG.shin, knB);
    const [elbF, handF] = ik(sh, handT('F'), SEG.upper * sc, SEG.fore * sc, el);
    const [elbB, handB] = ik(sh, handT('B'), SEG.upper * sc, SEG.fore * sc, elB);
    return { view: 'side', hip, sh, head, hd, face: [hd[1], -hd[0]], bend, chest: p.chest || 0, kneeF, ankleF, kneeB, ankleB, elbF, handF, elbB, handB,
      toeF: p.toeF || 0, toeB: p.toeB != null ? p.toeB : (p.toeF || 0) };
  }
  function solveFront(p, pat) {
    const c = p.hip[0];
    const neck = [c, p.hip[1] + SEG.torso];
    const head = [c, neck[1] + SEG.neck + SEG.headR];
    const shR = frontSh(p, 'R'), shL = frontSh(p, 'L');
    const hipR = [c + SEG.hipW, p.hip[1]], hipL = [c - SEG.hipW, p.hip[1]];
    const sc = p.armScale != null ? p.armScale : 1;
    const tR = p.handR || add(shR, p.handRRel || [0.03, -0.57]);
    const tL = p.handL || (p.handLRel ? add(shL, p.handLRel) : [2 * c - tR[0], tR[1]]);
    const fR = p.footR || [c + 0.12, 0.08], fL = p.footL || [2 * c - fR[0], fR[1]];
    const el = pat.elbow || 1, elL = pat.elbowL != null ? pat.elbowL : -el;
    const [elbR, handR] = ik(shR, tR, SEG.upper * sc, SEG.fore * sc, el);
    const [elbL, handL] = ik(shL, tL, SEG.upper * sc, SEG.fore * sc, elL);
    const [kneeR, ankleR] = ik(hipR, fR, SEG.thigh, SEG.shin, 1);
    const [kneeL, ankleL] = ik(hipL, fL, SEG.thigh, SEG.shin, -1);
    return { view: 'front', hip: p.hip, neck, head, shR, shL, hipR, hipL, elbR, handR, elbL, handL, kneeR, ankleR, kneeL, ankleL };
  }
  function solve(pat, t) { const p = poseAt(pat, t); return pat.view === 'front' ? solveFront(p, pat) : solveSide(p, pat); }

  /* ---------- characters ---------- */
  // Two original characters. Colours are plain hex; far-side limbs are darkened automatically.
  const CHARS = {
    gregoire: {
      name: 'Grégoire', hair: 'short',
      col: { skin: '#d9a07c', top: '#2f80c0', bottom: '#2b3137', hair: '#2a1b13', shoe: '#e6eaed', sole: '#39424a' },
      build: { sh: 0.205, hip: 0.098, arm: 1, leg: 1,
        torsoF: [[0, 0.085], [0.42, 0.078], [0.74, 0.126], [1, 0.08]], torsoB: [[0, 0.105], [0.35, 0.082], [0.7, 0.1], [1, 0.08]] },
      sleeve: 0.42, shorts: 0.55, legging: false, topFrom: 0.16
    },
    jacqueline: {
      name: 'Jacqueline', hair: 'long',
      col: { skin: '#e3b291', top: '#c8456b', bottom: '#2e2a3b', hair: '#1a110d', shoe: '#e6eaed', sole: '#39424a' },
      build: { sh: 0.178, hip: 0.112, arm: 0.86, leg: 0.95,
        torsoF: [[0, 0.08], [0.42, 0.066], [0.64, 0.098], [0.75, 0.13], [0.86, 0.1], [1, 0.07]], torsoB: [[0, 0.118], [0.3, 0.078], [0.7, 0.088], [1, 0.07]] },
      sleeve: 0, shorts: 1, legging: true, topFrom: 0.2
    }
  };
  const HL = '#ff4a2a'; // working-muscle highlight
  const EQC = { eq: '#3e474e', load: '#d9952e', steel: '#a3adb4' };

  /* ---------- colour + vector helpers ---------- */
  const rgb = h => [parseInt(h.slice(1, 3), 16), parseInt(h.slice(3, 5), 16), parseInt(h.slice(5, 7), 16)];
  const hex = c => '#' + c.map(v => Math.max(0, Math.min(255, Math.round(v))).toString(16).padStart(2, '0')).join('');
  const shade = (h, k) => { const c = rgb(h), t = k >= 0 ? 255 : 0, a = Math.abs(k); return hex(c.map(v => v + (t - v) * a)); };
  const mat = (base, far) => { const b = far ? shade(base, -0.4) : base; return [shade(b, 0.42), b, shade(b, -0.45)]; };
  const sub = (a, b) => [a[0] - b[0], a[1] - b[1]];
  const len = v => Math.hypot(v[0], v[1]);
  const nrm = v => { const l = len(v) || 1; return [v[0] / l, v[1] / l]; };
  const dot = (a, b) => a[0] * b[0] + a[1] * b[1];
  const mul = (v, k) => [v[0] * k, v[1] * k];

  let UID = 0;
  let BX = { x0: -1.15, x1: 1.15, y1: 2.15 };
  const X = x => (x - BX.x0) * 100;
  const Y = y => (BX.y1 - y) * 100;
  const f1 = v => (Math.round(v * 10) / 10).toString();
  const S = p => [X(p[0]), Y(p[1])];
  const LX = -0.55, LY = -0.83; // light from the upper left (screen coordinates)

  function ctx(u) { return { u, n: 0, defs: [], out: [], sph: {} }; }
  const stopsOf = m => `<stop offset="0" stop-color="${m[1]}"/><stop offset=".28" stop-color="${m[0]}"/><stop offset=".62" stop-color="${m[1]}"/><stop offset="1" stop-color="${m[2]}"/>`;
  function sphereFill(R, m) {
    const k = m.join('');
    if (!R.sph[k]) { R.sph[k] = R.u + 's' + (R.n++); R.defs.push(`<radialGradient id="${R.sph[k]}" cx=".36" cy=".3" r=".78"><stop offset="0" stop-color="${m[0]}"/><stop offset=".5" stop-color="${m[1]}"/><stop offset="1" stop-color="${m[2]}"/></radialGradient>`); }
    return `url(#${R.sph[k]})`;
  }
  /** Linear gradient across a shape (lit side first), in screen space. a/b model points along the shape's axis. */
  function crossFill(R, a, b, m, halfW) {
    const A = S(a), B = S(b);
    let nx = -(B[1] - A[1]), ny = B[0] - A[0]; const nl = Math.hypot(nx, ny) || 1; nx /= nl; ny /= nl;
    if (nx * LX + ny * LY < 0) { nx = -nx; ny = -ny; }
    const mx = (A[0] + B[0]) / 2, my = (A[1] + B[1]) / 2, w = halfW * 100, id = R.u + 'g' + (R.n++);
    R.defs.push(`<linearGradient id="${id}" gradientUnits="userSpaceOnUse" x1="${f1(mx + nx * w)}" y1="${f1(my + ny * w)}" x2="${f1(mx - nx * w)}" y2="${f1(my - ny * w)}">${stopsOf(m)}</linearGradient>`);
    return `url(#${id})`;
  }
  function smoothPath(pts) {
    const n = pts.length, q = v => f1(v[0]) + ' ' + f1(v[1]);
    let d = 'M' + q(pts[0]);
    for (let i = 0; i < n; i++) {
      const p0 = pts[(i - 1 + n) % n], p1 = pts[i], p2 = pts[(i + 1) % n], p3 = pts[(i + 2) % n];
      d += 'C' + q([p1[0] + (p2[0] - p0[0]) / 6, p1[1] + (p2[1] - p0[1]) / 6]) + ' ' + q([p2[0] - (p3[0] - p1[0]) / 6, p2[1] - (p3[1] - p1[1]) / 6]) + ' ' + q(p2);
    }
    return d + 'Z';
  }
  const path = (R, pts, fill, extra) => R.out.push(`<path d="${smoothPath(pts.map(S))}" fill="${fill}"${extra || ''}/>`);
  function sphere(R, c, r, m, extra) { const P = S(c); R.out.push(`<circle cx="${f1(P[0])}" cy="${f1(P[1])}" r="${f1(r * 100)}" fill="${sphereFill(R, m)}"${extra || ''}/>`); }
  function capsule(R, a, ra, b, rb, m) {
    const A = S(a), B = S(b), RA = ra * 100, RB = rb * 100;
    let dx = B[0] - A[0], dy = B[1] - A[1]; const L = Math.hypot(dx, dy);
    if (L < 0.5) { sphere(R, a, Math.max(ra, rb), m); return; }
    dx /= L; dy /= L;
    let nx = -dy, ny = dx;
    if (nx * LX + ny * LY < 0) { nx = -nx; ny = -ny; }
    const sw = (nx * dy - ny * dx) > 0 ? 1 : 0;
    const d = `M${f1(A[0] + nx * RA)} ${f1(A[1] + ny * RA)}L${f1(B[0] + nx * RB)} ${f1(B[1] + ny * RB)}A${f1(RB)} ${f1(RB)} 0 0 ${sw} ${f1(B[0] - nx * RB)} ${f1(B[1] - ny * RB)}L${f1(A[0] - nx * RA)} ${f1(A[1] - ny * RA)}A${f1(RA)} ${f1(RA)} 0 0 ${sw} ${f1(A[0] + nx * RA)} ${f1(A[1] + ny * RA)}Z`;
    R.out.push(`<path d="${d}" fill="${crossFill(R, a, b, m, Math.max(ra, rb))}"/>`);
  }

  /* ---------- body geometry ----------
     A body part is a "geo": at(s) gives the centre P, axis T, front normal N and the front/back radii
     at fraction s along it. Outlines, clothing and muscle highlights are all cut from the same geo. */
  const prof = (tab, s) => { if (s <= tab[0][0]) return tab[0][1]; for (let i = 1; i < tab.length; i++) if (s <= tab[i][0]) { const [s0, r0] = tab[i - 1], [s1, r1] = tab[i]; return r0 + (r1 - r0) * (s - s0) / (s1 - s0); } return tab[tab.length - 1][1]; };
  function segGeo(a, b, antHint, pF, pB, k) {
    const T = nrm(sub(b, a)); let N = [-T[1], T[0]];
    if (dot(N, antHint) < 0) N = [-N[0], -N[1]];
    return { a, b, at(s) { const P = [a[0] + (b[0] - a[0]) * s, a[1] + (b[1] - a[1]) * s], rf = prof(pF, s) * k, rb = prof(pB, s) * k; return { P, T, N, rf, rb, F: [P[0] + N[0] * rf, P[1] + N[1] * rf], B: [P[0] - N[0] * rb, P[1] - N[1] * rb] }; } };
  }
  function outline(g, s0, s1) {
    s0 = s0 || 0; s1 = s1 == null ? 1 : s1;
    const n = 7, front = [], back = [];
    for (let i = 0; i <= n; i++) { const q = g.at(s0 + (s1 - s0) * i / n); front.push(q.F); back.push(q.B); }
    const cap = (q, dir) => { const c = [(q.F[0] + q.B[0]) / 2, (q.F[1] + q.B[1]) / 2], r = len(sub(q.F, c)), ax = nrm(sub(q.F, c)), out = []; for (let i = 1; i < 4; i++) { const th = Math.PI * i / 4; out.push([c[0] + (ax[0] * Math.cos(th) + dir[0] * Math.sin(th)) * r, c[1] + (ax[1] * Math.cos(th) + dir[1] * Math.sin(th)) * r]); } return out; };
    const qa = g.at(s0), qb = g.at(s1);
    const capB = s1 >= 0.999 ? cap(qb, qb.T) : [];
    // cap at the start runs from the back edge to the front edge around −T
    const ca = [];
    if (s0 <= 0.001) { const c = [(qa.F[0] + qa.B[0]) / 2, (qa.F[1] + qa.B[1]) / 2], r = len(sub(qa.B, c)), ax = nrm(sub(qa.B, c)); for (let i = 1; i < 4; i++) { const th = Math.PI * i / 4; ca.push([c[0] + (ax[0] * Math.cos(th) - qa.T[0] * Math.sin(th)) * r, c[1] + (ax[1] * Math.cos(th) - qa.T[1] * Math.sin(th)) * r]); } }
    return front.concat(capB, back.reverse(), ca);
  }
  /** Lens-shaped muscle area on the front (+1) or back (−1) of a geo between s0 and s1. */
  function region(g, side, s0, s1, depth) {
    const n = 8, outer = [], inner = [];
    for (let i = 0; i <= n; i++) {
      const s = s0 + (s1 - s0) * i / n, q = g.at(s), r = side > 0 ? q.rf : q.rb, w = Math.pow(Math.sin(Math.PI * i / n), 0.6);
      const dir = mul(q.N, side);
      outer.push([q.P[0] + dir[0] * r * (0.12 + 0.82 * w), q.P[1] + dir[1] * r * (0.12 + 0.82 * w)]);
      inner.push([q.P[0] + dir[0] * r * (depth == null ? 0.1 : depth) * w, q.P[1] + dir[1] * r * (depth == null ? 0.1 : depth) * w]);
    }
    return outer.concat(inner.reverse());
  }
  const LIMB = {
    thighF: [[0, 0.074], [0.35, 0.078], [1, 0.052]], thighB: [[0, 0.084], [0.3, 0.074], [1, 0.05]],
    shinF: [[0, 0.05], [0.5, 0.041], [1, 0.032]], shinB: [[0, 0.05], [0.25, 0.066], [0.62, 0.044], [1, 0.033]],
    upF: [[0, 0.05], [0.5, 0.053], [1, 0.037]], upB: [[0, 0.053], [0.4, 0.054], [1, 0.039]],
    foreF: [[0, 0.041], [0.3, 0.045], [1, 0.028]], foreB: [[0, 0.039], [0.3, 0.042], [1, 0.028]]
  };
  function torsoGeo(J, ch) {
    const H = J.hip, Sh = J.sh, bend = J.bend || 0, chest = J.chest || 0;
    const t0 = nrm(sub(Sh, H)), fw0 = [t0[1], -t0[0]];
    const C = [(H[0] + Sh[0]) / 2 - fw0[0] * bend * 2, (H[1] + Sh[1]) / 2 - fw0[1] * bend * 2];
    const pF = ch.build.torsoF, pB = ch.build.torsoB;
    return { a: H, b: Sh, at(s) {
      const a = (1 - s) * (1 - s), b = 2 * (1 - s) * s, c = s * s;
      const P = [a * H[0] + b * C[0] + c * Sh[0], a * H[1] + b * C[1] + c * Sh[1]];
      const T = nrm([2 * (1 - s) * (C[0] - H[0]) + 2 * s * (Sh[0] - C[0]), 2 * (1 - s) * (C[1] - H[1]) + 2 * s * (Sh[1] - C[1])]);
      const N = [T[1], -T[0]], rf = prof(pF, s) * (s > 0.5 ? 1 + 0.12 * chest : 1), rb = prof(pB, s);
      return { P, T, N, rf, rb, F: [P[0] + N[0] * rf, P[1] + N[1] * rf], B: [P[0] - N[0] * rb, P[1] - N[1] * rb] };
    } };
  }
  /** Which way the front of a limb faces: the knee points forward, the elbow points back. */
  function legAnt(hip, knee, ankle, toeDir) {
    const c = sub(ankle, hip), t = nrm(c), v = sub(knee, hip), off = sub(v, mul(t, dot(v, t)));
    return len(off) > 0.015 ? nrm(off) : toeDir;
  }
  function armAnt(sh, elb, hand, fallback) {
    const c = sub(hand, sh), t = nrm(c), v = sub(elb, sh), off = sub(v, mul(t, dot(v, t)));
    return len(off) > 0.015 ? mul(nrm(off), -1) : fallback;
  }

  /* ---------- body parts ---------- */
  function hl(R, pts, far) { R.out.push(`<path d="${smoothPath(pts.map(S))}" fill="${HL}" fill-opacity="${f1((far ? 0.5 : 1) * R.hlOp * 100) / 100}"/>`); }
  function drawLeg(R, ch, hip, knee, ankle, toe, far, front, side) {
    const k = ch.build.leg, m = (c) => mat(ch.col[c], far);
    const toeDir = front ? [side, 0] : [Math.cos(rad(toe)), Math.sin(rad(toe))];
    const ant = front ? [1, 0] : legAnt(hip, knee, ankle, toeDir);
    const th = segGeo(hip, knee, ant, LIMB.thighF, LIMB.thighB, k), sh = segGeo(knee, ankle, ant, LIMB.shinF, LIMB.shinB, k);
    const legC = ch.legging ? 'bottom' : 'skin';
    // shin, then thigh on top (knee looks right)
    path(R, outline(sh), crossFill(R, knee, ankle, m(legC), 0.06));
    if (R.mus.calves && !front) hl(R, region(sh, -1, 0.08, 0.6), far);
    path(R, outline(th), crossFill(R, hip, knee, m(legC), 0.08));
    if (!ch.legging && ch.shorts > 0) path(R, outline(th, 0, Math.min(1, ch.shorts)), crossFill(R, hip, knee, m('bottom'), 0.085));
    if (R.mus.quads) hl(R, front ? region(th, 1, 0.12, 0.9, -0.7) : region(th, 1, 0.1, 0.9), far);
    if (R.mus.hipFlexors) hl(R, front ? region(th, 1, 0.0, 0.35, -0.7) : region(th, 1, 0.0, 0.38), far);
    if (R.mus.hamstrings && !front) hl(R, region(th, -1, 0.12, 0.9), far);
    // shoe
    if (front) {
      capsule(R, [ankle[0], ankle[1] - 0.025], 0.036, [ankle[0] + side * 0.06, ankle[1] - 0.05], 0.03, m('shoe'));
    } else {
      const a = rad(toe), Rr = v => [ankle[0] + v[0] * Math.cos(a) - v[1] * Math.sin(a), ankle[1] + v[0] * Math.sin(a) + v[1] * Math.cos(a)];
      capsule(R, Rr([-0.035, -0.04]), 0.04, Rr([0.15, -0.05]), 0.03, m('shoe'));
      capsule(R, Rr([-0.04, -0.072]), 0.012, Rr([0.165, -0.074]), 0.01, m('sole'));
    }
  }
  function drawArm(R, ch, shp, elb, hand, far, fwd, front) {
    const k = ch.build.arm, m = (c) => mat(ch.col[c], far);
    const ant = front ? [0, 1] : armAnt(shp, elb, hand, fwd);
    const up = segGeo(shp, elb, ant, LIMB.upF, LIMB.upB, k), fo = segGeo(elb, hand, ant, LIMB.foreF, LIMB.foreB, k);
    path(R, outline(fo, 0, 0.86), crossFill(R, elb, hand, m('skin'), 0.045));
    if (R.mus.forearms) hl(R, region(fo, 1, 0.08, 0.6), far);
    path(R, outline(up), crossFill(R, shp, elb, m('skin'), 0.055));
    if (ch.sleeve > 0) path(R, outline(up, 0, ch.sleeve), crossFill(R, shp, elb, m('top'), 0.06));
    if (R.mus.biceps) hl(R, front ? region(up, 1, 0.15, 0.85, -0.6) : region(up, 1, 0.15, 0.88), far);
    if (R.mus.triceps) hl(R, front ? region(up, -1, 0.1, 0.85, -0.6) : region(up, -1, 0.1, 0.88), far);
    // hand (mitt along the forearm)
    const d = nrm(sub(hand, elb));
    capsule(R, sub(hand, mul(d, 0.04)), 0.032 * k + 0.004, [hand[0] + d[0] * 0.025, hand[1] + d[1] * 0.025], 0.027 * k + 0.003, m('skin'));
    if (R.mus.shoulders) R.out.push(`<circle cx="${f1(X(shp[0]))}" cy="${f1(Y(shp[1]))}" r="${f1(6.2 * k)}" fill="${HL}" fill-opacity="${f1((far ? 0.5 : 1) * R.hlOp * 100) / 100}"/>`);
  }
  function headSide(R, J, ch) {
    const f = J.face, u = J.hd, H = J.head, r = SEG.headR;
    const P = (th, rr) => [H[0] + (f[0] * Math.cos(th) + u[0] * Math.sin(th)) * rr, H[1] + (f[1] * Math.cos(th) + u[1] * Math.sin(th)) * rr];
    const hm = mat(ch.col.hair), sk = mat(ch.col.skin);
    if (ch.hair === 'long') {
      // hair falling behind the neck and down the upper back (drawn behind head and torso)
      const g = (a, b) => [H[0] + f[0] * a + u[0] * b, H[1] + f[1] * a + u[1] * b];
      path(R, [P(rad(120), 0.105), P(rad(170), 0.115), g(-0.13, -0.08), g(-0.135, -0.22), g(-0.105, -0.34), g(-0.06, -0.3), g(-0.045, -0.17), g(-0.02, -0.09)], crossFill(R, g(0, 0), g(0, -0.3), hm, 0.12));
    }
    capsule(R, [J.sh[0] + u[0] * 0.02, J.sh[1] + u[1] * 0.02], 0.042, [J.sh[0] + u[0] * 0.13, J.sh[1] + u[1] * 0.13], 0.04, sk);
    sphere(R, H, r, sk);
    sphere(R, P(rad(-8), 0.095), 0.02, sk); // nose
    const e = P(rad(22), 0.06), ear = P(rad(185), 0.012);
    R.out.push(`<circle cx="${f1(X(e[0]))}" cy="${f1(Y(e[1]))}" r="1.3" fill="#2a1d18"/>`);
    sphere(R, ear, 0.02, mat(shade(ch.col.skin, -0.12)));
    // hair cap
    const cap = ch.hair === 'long'
      ? [P(rad(28), 0.104), P(rad(70), 0.112), P(rad(120), 0.113), P(rad(170), 0.112), P(rad(215), 0.104), P(rad(220), 0.06), P(rad(160), 0.07), P(rad(90), 0.082), P(rad(40), 0.088)]
      : [P(rad(38), 0.104), P(rad(80), 0.11), P(rad(130), 0.11), P(rad(180), 0.106), P(rad(222), 0.097), P(rad(222), 0.06), P(rad(165), 0.068), P(rad(100), 0.08), P(rad(50), 0.088)];
    path(R, cap, crossFill(R, P(rad(90), 0.1), P(rad(270), 0.1), hm, 0.1));
  }
  function headFront(R, J, ch) {
    const H = J.head, hm = mat(ch.col.hair), sk = mat(ch.col.skin);
    const g = (a, b) => [H[0] + a, H[1] + b];
    if (ch.hair === 'long') path(R, [g(-0.1, 0.07), g(0, 0.115), g(0.1, 0.07), g(0.13, -0.08), g(0.14, -0.24), g(0.08, -0.26), g(0.07, -0.08), g(-0.07, -0.08), g(-0.08, -0.26), g(-0.14, -0.24), g(-0.13, -0.08)], `url(#${R.u}TFh)`);
    capsule(R, [J.neck[0], J.neck[1] - 0.02], 0.045, [J.neck[0], J.neck[1] + 0.09], 0.042, sk);
    sphere(R, g(-0.093, -0.005), 0.02, mat(shade(ch.col.skin, -0.12))); sphere(R, g(0.093, -0.005), 0.02, mat(shade(ch.col.skin, -0.12)));
    sphere(R, H, SEG.headR, sk);
    [[-0.034, 0.008], [0.034, 0.008]].forEach(v => { const p = S(g(v[0], v[1])); R.out.push(`<circle cx="${f1(p[0])}" cy="${f1(p[1])}" r="1.3" fill="#2a1d18"/>`); });
    const m1 = S(g(-0.022, -0.045)), m2 = S(g(0.022, -0.045));
    R.out.push(`<line x1="${f1(m1[0])}" y1="${f1(m1[1])}" x2="${f1(m2[0])}" y2="${f1(m2[1])}" stroke="#8a4a3c" stroke-width="1.2" stroke-linecap="round"/>`);
    const cap = ch.hair === 'long'
      ? [g(-0.105, -0.01), g(-0.1, 0.06), g(-0.05, 0.1), g(0.02, 0.108), g(0.08, 0.085), g(0.105, 0.03), g(0.1, -0.02), g(0.06, 0.05), g(-0.02, 0.06), g(-0.08, 0.03)]
      : [g(-0.1, 0.02), g(-0.085, 0.075), g(-0.03, 0.105), g(0.03, 0.105), g(0.085, 0.075), g(0.1, 0.02), g(0.07, 0.05), g(0, 0.062), g(-0.07, 0.05)];
    path(R, cap, `url(#${R.u}TFh)`);
  }
  function torsoSideDraw(R, J, ch) {
    const g = torsoGeo(J, ch);
    path(R, outline(g), crossFill(R, J.hip, J.sh, mat(ch.col.top), 0.13));
    path(R, outline(g, 0, ch.topFrom), crossFill(R, J.hip, J.sh, mat(ch.col.bottom), 0.13));
    const M = R.mus;
    if (M.chest) hl(R, region(g, 1, 0.56, 0.93));
    if (M.abs) hl(R, region(g, 1, 0.12, 0.55));
    if (M.back) hl(R, region(g, -1, 0.42, 0.94));
    if (M.lowerBack) hl(R, region(g, -1, 0.1, 0.44));
    if (M.glutes) hl(R, region(g, -1, -0.08, 0.2, 0.2));
  }
  function torsoFrontDraw(R, J, ch) {
    const c = J.hip[0], ny = J.neck[1], hy = J.hip[1], w = ch.build.sh, hw = ch.build.hip;
    const fem = ch.hair === 'long';
    const right = [[0.06, ny + 0.01], [w - 0.035, ny - 0.005], [w + 0.025, ny - 0.06], [w - 0.005, ny - 0.17], [w - (fem ? 0.04 : 0.03), ny - 0.27], [hw + (fem ? 0.0 : 0.04), ny - 0.36], [hw + 0.06, hy + 0.03], [hw + 0.035, hy - 0.07]];
    const pts = right.map(p => [c + p[0], p[1]]).concat([[c, hy - 0.1]], right.slice().reverse().map(p => [c - p[0], p[1]]));
    path(R, pts, `url(#${R.u}TFt)`);
    // shorts / leggings top
    const low = [[hw + 0.03, hy + 0.06], [hw + 0.06, hy + 0.03], [hw + 0.035, hy - 0.07], [0, hy - 0.1], [-hw - 0.035, hy - 0.07], [-hw - 0.06, hy + 0.03], [-hw - 0.03, hy + 0.06]].map(p => [c + p[0], p[1]]);
    path(R, low, `url(#${R.u}TFb)`);
    const M = R.mus, op = f1(R.hlOp * 100) / 100, el = (x, y, rx, ry) => { const p = S([x, y]); R.out.push(`<ellipse cx="${f1(p[0])}" cy="${f1(p[1])}" rx="${f1(rx * 100)}" ry="${f1(ry * 100)}" fill="${HL}" fill-opacity="${op}"/>`); };
    if (M.chest) { el(c - 0.075, ny - 0.13, 0.07, 0.05); el(c + 0.075, ny - 0.13, 0.07, 0.05); }
    if (M.abs) { const p = S([c - 0.05, ny - 0.2]); R.out.push(`<rect x="${f1(p[0])}" y="${f1(p[1])}" width="10" height="${f1((ny - 0.2 - hy - 0.04) * 100)}" rx="4" fill="${HL}" fill-opacity="${op}"/>`); }
    if (M.back) { el(c - w + 0.03, ny - 0.22, 0.035, 0.09); el(c + w - 0.03, ny - 0.22, 0.035, 0.09); }
    if (M.glutes) { el(c - hw - 0.035, hy - 0.01, 0.035, 0.06); el(c + hw + 0.035, hy - 0.01, 0.035, 0.06); }
  }

  /* ---------- equipment & props ---------- */
  function eqShape(R, s) {
    if (s.t === 'line') capsule(R, s.a, s.w / 2, s.b, s.w / 2, mat(EQC.eq));
    else if (s.t === 'circle') { if (s.fill) sphere(R, s.c, s.r, mat(EQC.eq)); }
    else if (s.t === 'rect') R.out.push(`<rect x="${f1(X(s.x))}" y="${f1(Y(s.y + s.h))}" width="${f1(s.w * 100)}" height="${f1(s.h * 100)}" rx="4" fill="url(#${R.u}Veq)"/>`);
    else if (s.t === 'ring') { const P = S(s.c); R.out.push(`<circle class="fig-ring" cx="${f1(P[0])}" cy="${f1(P[1])}" r="${f1(s.r * 100)}"/>`); }
  }
  function disc(R, c, r) {
    sphere(R, c, r, mat(EQC.load));
    const P = S(c);
    if (r > 0.1) R.out.push(`<circle cx="${f1(P[0])}" cy="${f1(P[1])}" r="${f1(r * 66)}" fill="none" stroke="${shade(EQC.load, -0.45)}" stroke-opacity=".45" stroke-width="2"/>`);
    sphere(R, c, Math.max(0.018, r * 0.24), mat(EQC.steel));
  }
  function propAt(R, prop, h, far) {
    switch (prop) {
      case 'barbell': case 'barbell_back': case 'barbell_front': case 'trapbar': if (!far) disc(R, h, 0.17); break;
      case 'dumbbell': disc(R, h, 0.066); break;
      case 'plate_small': if (!far) disc(R, h, 0.1); break;
      case 'goblet': case 'db1': if (!far) { const P = S(h); R.out.push(`<rect x="${f1(P[0] - 5)}" y="${f1(P[1] - 11)}" width="10" height="22" rx="4" fill="url(#${R.u}Vld)"/>`); } break;
      case 'band': break;
      default: if (prop) sphere(R, h, 0.03, mat(EQC.steel));
    }
  }
  function cableTo(R, a, h) {
    const A = S(a), H = S(h);
    R.out.push(`<line class="fig-cable" x1="${f1(A[0])}" y1="${f1(A[1])}" x2="${f1(H[0])}" y2="${f1(H[1])}"/>`);
    sphere(R, a, 0.05, mat(EQC.steel));
  }
  function shadowFor(R, pts) {
    const low = pts.filter(p => p[1] < 0.75);
    if (!low.length) return;
    const xs = low.map(p => p[0]), x0 = Math.min(...xs), x1 = Math.max(...xs), P = S([(x0 + x1) / 2, 0]);
    R.out.push(`<ellipse cx="${f1(P[0])}" cy="${f1(P[1])}" rx="${f1(((x1 - x0) / 2 + 0.16) * 100)}" ry="6" fill="url(#${R.u}sh)"/>`);
  }

  function drawFigure(R, J, pat, prop, cable, ch) {
    prop = prop || pat.prop;
    cable = (cable || pat.cable) && pat.anchor;
    const dyn = pat.dyn ? pat.dyn(J) : [];
    if (!pat.noFloor) R.out.push(`<line class="fig-floor" x1="${f1(X(BX.x0))}" y1="${f1(Y(0))}" x2="${f1(X(BX.x1))}" y2="${f1(Y(0))}"/>`);
    dyn.filter(s => s.t === 'ring').forEach(s => eqShape(R, s));
    if (J.view === 'front') {
      if (!pat.noFloor) shadowFor(R, [J.ankleR, J.ankleL, J.hip]);
      (pat.eq || []).forEach(s => eqShape(R, s));
      if (cable) { cableTo(R, pat.anchor, J.handR); cableTo(R, [-pat.anchor[0], pat.anchor[1]], J.handL); }
      const hipR = [J.hip[0] + ch.build.hip * 0.62, J.hip[1]], hipL = [J.hip[0] - ch.build.hip * 0.62, J.hip[1]];
      drawLeg(R, ch, hipL, J.kneeL, J.ankleL, 0, false, true, -1);
      drawLeg(R, ch, hipR, J.kneeR, J.ankleR, 0, false, true, 1);
      torsoFrontDraw(R, J, ch);
      headFront(R, J, ch);
      if (/barbell/.test(prop || '')) {
        const y = (J.handL[1] + J.handR[1]) / 2;
        capsule(R, [J.handL[0] - 0.33, y], 0.016, [J.handR[0] + 0.33, y], 0.016, mat(EQC.steel));
        [[J.handL[0] - 0.27, y], [J.handR[0] + 0.27, y]].forEach(p => { const P = S(p); R.out.push(`<rect x="${f1(P[0] - 3.5)}" y="${f1(P[1] - 18)}" width="7" height="36" rx="3" fill="url(#${R.u}Vld)"/>`); });
      } else if (prop === 'band') {
        const A = S(J.handL), B = S(J.handR);
        R.out.push(`<line class="fig-band" x1="${f1(A[0])}" y1="${f1(A[1])}" x2="${f1(B[0])}" y2="${f1(B[1])}"/>`);
      } else { propAt(R, prop, J.handR); propAt(R, prop, J.handL); }
      const shR = [J.hip[0] + ch.build.sh - 0.02, J.shR[1]], shL = [J.hip[0] - ch.build.sh + 0.02, J.shL[1]];
      drawArm(R, ch, shL, J.elbL, J.handL, false, null, true);
      drawArm(R, ch, shR, J.elbR, J.handR, false, null, true);
      dyn.filter(s => s.t !== 'ring').forEach(s => eqShape(R, s));
      return;
    }
    const fwd = J.face;
    if (!pat.noFloor) shadowFor(R, [J.ankleF, J.ankleB, J.kneeF, J.kneeB, J.hip, J.sh, J.head, J.handF, J.handB]);
    (pat.eq || []).forEach(s => eqShape(R, s));
    // far side
    drawLeg(R, ch, J.hip, J.kneeB, J.ankleB, J.toeB, true, false);
    propAt(R, prop, J.handB, true);
    drawArm(R, ch, J.sh, J.elbB, J.handB, true, fwd, false);
    // body
    if (ch.hair === 'long') { /* back hair is drawn inside headSide before the neck */ }
    torsoSideDraw(R, J, ch);
    headSide(R, J, ch);
    if (/barbell|trapbar/.test(prop || '')) propAt(R, prop, J.handF);
    if (cable) cableTo(R, pat.anchor, J.handF);
    // near side
    drawLeg(R, ch, J.hip, J.kneeF, J.ankleF, J.toeF, false, false);
    dyn.filter(s => s.t !== 'ring').forEach(s => eqShape(R, s));
    if (!/barbell|trapbar/.test(prop || '')) propAt(R, prop, J.handF);
    drawArm(R, ch, J.sh, J.elbF, J.handF, false, fwd, false);
  }

  function staticDefs(u, ch) {
    const lin = (id, m) => `<linearGradient id="${u}${id}" x1="0" y1="0" x2="1" y2="0">${stopsOf(m)}</linearGradient>`;
    return lin('TFt', mat(ch.col.top)) + lin('TFb', mat(ch.col.bottom)) + lin('TFh', mat(ch.col.hair)) + lin('Vld', mat(EQC.load)) +
      `<linearGradient id="${u}Veq" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="${shade(EQC.eq, 0.4)}"/><stop offset=".25" stop-color="${EQC.eq}"/><stop offset="1" stop-color="${shade(EQC.eq, -0.45)}"/></linearGradient>` +
      `<radialGradient id="${u}sh"><stop offset="0" stop-color="#000" stop-opacity=".45"/><stop offset="1" stop-color="#000" stop-opacity="0"/></radialGradient>`;
  }

  // Each pattern gets a viewBox fitted to everything it draws over a full loop (cached).
  const boxCache = {};
  function fitBox(pat, key, prop) {
    const ck = key + '|' + prop;
    if (boxCache[ck]) return boxCache[ck];
    let x0 = Infinity, y0 = Infinity, x1 = -Infinity, y1 = -Infinity;
    const addP = (q, r) => { r = r || 0; x0 = Math.min(x0, q[0] - r); x1 = Math.max(x1, q[0] + r); y0 = Math.min(y0, q[1] - r); y1 = Math.max(y1, q[1] + r); };
    const pr = prop || pat.prop || '';
    const plateR = /barbell|trapbar/.test(pr) ? 0.19 : 0.08;
    for (let t = 0; t < 1; t += 0.025) {
      const J = solve(pat, t);
      for (const k in J) if (Array.isArray(J[k]) && J[k].length === 2 && typeof J[k][0] === 'number' && k !== 'hd' && k !== 'face') addP(J[k], 0.08);
      addP(J.head, SEG.headR + 0.06);
      if (J.view === 'front') {
        addP(J.hip, 0.2); addP(J.neck, 0.27); addP([J.head[0], J.head[1] - 0.26], 0.15);
        addP(J.handR, plateR); addP(J.handL, plateR);
        if (/barbell/.test(pr)) { addP([J.handR[0] + 0.36, J.handR[1]], 0.18); addP([J.handL[0] - 0.36, J.handL[1]], 0.18); }
      } else {
        addP(J.hip, 0.14); addP(J.sh, 0.14);
        addP([J.head[0] - J.face[0] * 0.14 - J.hd[0] * 0.3, J.head[1] - J.face[1] * 0.14 - J.hd[1] * 0.3], 0.05);
        addP(J.handF, plateR);
      }
      if (pat.dyn) pat.dyn(J).forEach(s => { if (s.t === 'line') { addP(s.a, 0.03); addP(s.b, 0.03); } else if (s.t === 'circle' || s.t === 'ring') addP(s.c, s.r + 0.02); else if (s.t === 'rect') { addP([s.x, s.y]); addP([s.x + s.w, s.y + s.h]); } });
    }
    (pat.eq || []).forEach(s => {
      if (s.t === 'line') { addP(s.a, s.w / 2 + 0.01); addP(s.b, s.w / 2 + 0.01); } else if (s.t === 'circle') addP(s.c, s.r);
      else if (s.t === 'rect') { addP([s.x, s.y]); addP([s.x + s.w, s.y + s.h]); }
    });
    if (pat.anchor && (pat.cable || /cable|handle|bar/.test(pr))) { addP(pat.anchor, 0.06); if (pat.view === 'front') addP([-pat.anchor[0], pat.anchor[1]], 0.06); }
    if (!pat.noFloor) y0 = Math.min(y0, -0.05);
    const pad = 0.04;
    x0 -= pad; x1 += pad; y0 -= pad * 0.4; y1 += pad;
    const w = x1 - x0, h = y1 - y0;
    if (w < h * 0.75) { const d = (h * 0.75 - w) / 2; x0 -= d; x1 += d; }
    if (h < w * 0.5) { const d = (w * 0.5 - h); y1 += d * 0.7; y0 -= d * 0.3; }
    return (boxCache[ck] = { x0, y0, x1, y1, w: Math.round((x1 - x0) * 100), h: Math.round((y1 - y0) * 100) });
  }

  function keyOf(anim, prop) { return P[anim + ':' + prop] ? anim + ':' + prop : P[anim] ? anim : 'squat'; }
  function resolve(anim, prop) { return P[keyOf(anim, prop)]; }
  const charOf = opts => CHARS[(opts && opts.character) || 'gregoire'] || CHARS.gregoire;
  function frameBody(pat, key, prop, t, opts, u) {
    const box = fitBox(pat, key, prop || pat.prop);
    BX = box;
    const R = ctx(u);
    R.mus = {}; ((opts && opts.muscles) || []).forEach(m => { R.mus[m] = true; });
    R.hlOp = 0.62 + 0.2 * Math.sin(2 * Math.PI * t);
    drawFigure(R, solve(pat, t), pat, prop, opts && opts.cable, charOf(opts));
    return { box, html: `<defs>${R.defs.join('')}</defs>${R.out.join('')}` };
  }

  /** Static SVG markup for a frame (t ∈ [0,1)). anim may be a list (first is used).
      opts: { cable, muscles: [...], character: 'gregoire' | 'jacqueline' } */
  function frame(anim, prop, t, opts) {
    const a = Array.isArray(anim) ? anim[0] : anim, key = keyOf(a, prop), pat = P[key];
    const u = 'f' + (UID++) + '-';
    const fb = frameBody(pat, key, prop, t || 0, opts, u);
    return `<svg class="fig" viewBox="0 0 ${fb.box.w} ${fb.box.h}" role="img" aria-label="Movement demo"><defs>${staticDefs(u, charOf(opts))}</defs>${fb.html}</svg>`;
  }

  /** Mount a looping animation into el. anim may be a list: each plays `cycles` loops in turn. */
  function mount(el, anim, prop, opts) {
    const list = Array.isArray(anim) ? anim : [anim];
    const cycles = (opts && opts.cycles) || 2;
    const u = 'm' + (UID++) + '-';
    el.innerHTML = `<svg class="fig" role="img" aria-label="Movement demo"><defs>${staticDefs(u, charOf(opts))}</defs><g></g></svg>`;
    const svg = el.querySelector('svg'), g = el.querySelector('g');
    const reduce = root.matchMedia && root.matchMedia('(prefers-reduced-motion: reduce)').matches;
    let raf = 0, stopped = false, last = 0, idx = -1, start = performance.now(), cur = null, away = 0;
    const pick = i => {
      idx = i % list.length;
      const key = keyOf(list[idx], prop), pat = P[key];
      const box = fitBox(pat, key, prop || pat.prop);
      svg.setAttribute('viewBox', `0 0 ${box.w} ${box.h}`);
      cur = { pat, key, dur: (pat.dur || 2600) * ((opts && opts.speed) || 1) };
    };
    pick(0);
    const draw = now => {
      if (stopped) return;
      if (!el.isConnected) { if (++away > 120) return; raf = requestAnimationFrame(draw); return; }
      away = 0;
      if (now - last >= 33 || reduce) {
        last = now;
        if (list.length > 1 && now - start >= cur.dur * cycles) { start = now; pick(idx + 1); }
        const t = reduce ? 0.55 : (Math.max(0, now - start) % cur.dur) / cur.dur;
        g.innerHTML = frameBody(cur.pat, cur.key, prop, t, opts, u).html;
      }
      if (!reduce) raf = requestAnimationFrame(draw);
    };
    raf = requestAnimationFrame(draw);
    return { stop() { stopped = true; cancelAnimationFrame(raf); } };
  }

  root.GymMoves = { SEG, P, CHARS, frame, mount, solve, resolve, keys: () => Object.keys(P) };
})(typeof window !== 'undefined' ? window : globalThis);
