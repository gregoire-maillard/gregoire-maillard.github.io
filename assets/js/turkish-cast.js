/* Daily Turkish · faces for the conversations' cast, and the learner's character as a lesson companion (FX-1, PROJECT.md 6.10).
   Loaded by turkishlesson.html after turkish.js and turkish-account.js. No data file: each person's look is written here,
   keyed by dialogue id and cast id, in the flat style of the level characters (turkish-account.js). A person with no look
   here (a new dialogue) gets one made from their name, so nothing breaks.

   TRK.cast.face(dialogueId, castIdOrIndex, size, opts)  an <svg class="cf"> string; opts { mood, live, label }
   TRK.cast.mood(svg, mood, pop)                          smile (default) | happy | unsure | puzzled; pop: a small bounce
   TRK.cast.talk(svg, on)                                 the mouth moves while a line is read
   TRK.cast.buddy(size)                                   the learner's character (Tekir when none is chosen) as an <svg>
   TRK.cast.cheer(kind, n)                                { tr, en } for: streak (n in a row), oops, perfect, done, retry, talked
   The CSS for .cf and .buddy sits in turkishlesson.html. */
(function (root) {
  "use strict";
  var T = root.TRK;
  if (!T) return;

  var SKIN = { a: "#f6d5b8", b: "#f2c9a1", c: "#e7b48e", d: "#d9a07a", e: "#c4875e", f: "#9f6a47" };
  var HAIR = { black: "#2f2a26", dark: "#4a3426", brown: "#6b4426", chestnut: "#8a4f2b", auburn: "#a4512e", blond: "#c99a4b", grey: "#a7a39b", white: "#ecebe6" };

  // One look per person. s skin, h hair style, hc hair colour, bg background, t top colour, o outfit, age kid | teen | old,
  // m moustache, b beard (opacity), g glasses, e earrings, sc scarf colour, cap cap colour, x extra colour (vest, apron, coat…)
  var LOOKS = {
    "dlg-cafe": {
      waiter: { s: "c", h: "side", hc: "black", bg: "#e6eef2", t: "#f7f5f0", o: "vest", x: "#2b2b30", m: 1 },
      deniz: { s: "b", h: "long", hc: "chestnut", bg: "#dcefe9", t: "#2f8f86", o: "tee", e: 1 }
    },
    "dlg-taxi": {
      driver: { s: "d", h: "short", hc: "dark", bg: "#fbe7a6", t: "#3d4a5c", o: "shirt", m: 1, cap: "#55585e", age: "old" }
    },
    "dlg-directions": {
      grocer: { s: "c", h: "bald", hc: "grey", bg: "#e3efd9", t: "#4f7a45", o: "apron", x: "#f3efe4", m: 1, age: "old" },
      emre: { s: "c", h: "short", hc: "black", bg: "#e8e3f3", t: "#d9862e", o: "tee", age: "teen" }
    },
    "dlg-hotel": {
      ayse: { s: "b", h: "bun", hc: "brown", bg: "#f6e3d3", t: "#f7f5f0", o: "blouse", x: "#c2462c", e: 1 },
      zeynep: { s: "b", h: "pigtails", hc: "dark", bg: "#fbe0e6", t: "#e0708a", o: "tee", age: "kid" }
    },
    "dlg-market": {
      vendor: { s: "d", h: "short", hc: "black", bg: "#f5e1c2", t: "#8a5a2b", o: "apron", x: "#e9e1cf", b: .7, m: 1 },
      boy: { s: "d", h: "messy", hc: "black", bg: "#e2edf6", t: "#2c6e8f", o: "apron", x: "#e9e1cf", age: "teen" }
    },
    "dlg-pharmacy": {
      pharmacist: { s: "a", h: "bob", hc: "auburn", bg: "#ddf0e3", t: "#4f8a6e", o: "coat", x: "#fbfbf8", badge: 1 }
    },
    "dlg-doctor": {
      doctor: { s: "b", h: "side", hc: "grey", bg: "#e1edf5", t: "#7aa6c9", o: "coat", x: "#fbfbf8", g: 1, steth: 1, age: "old" },
      can: { s: "c", h: "round", hc: "brown", bg: "#fbe6cf", t: "#d94f3d", o: "tee", age: "kid" }
    },
    "dlg-landlord": {
      landlord: { s: "c", h: "side", hc: "grey", bg: "#ece6dc", t: "#7b6a58", o: "cardigan", x: "#e8e2d6", m: 1, age: "old" }
    },
    "dlg-phone": {
      nermin: { s: "b", h: "bob", hc: "grey", bg: "#eee4f2", t: "#8a5aa0", o: "cardigan", x: "#f4eef6", e: 1, g: 1, age: "old" },
      selin: { s: "c", h: "long", hc: "black", bg: "#fbe2dc", t: "#c2462c", o: "tee", e: 1 }
    },
    "dlg-complaint": {
      assistant: { s: "d", h: "pony", hc: "dark", bg: "#e4e8f3", t: "#2452a0", o: "blazer", x: "#f7f5f0", tag: 1 },
      manager: { s: "a", h: "bob", hc: "blond", bg: "#f3e2e6", t: "#7a2e3e", o: "blazer", x: "#f7f5f0", e: 1 }
    },
    "dlg-dinner": {
      ayten: { s: "b", h: "scarf", hc: "brown", sc: "#c2462c", bg: "#f7e7d2", t: "#6a4a7a", o: "cardigan", x: "#efe6f3", age: "old" },
      dede: { s: "c", h: "bald", hc: "white", bg: "#e6ecdf", t: "#5a6a4a", o: "vestw", x: "#8a6a4a", m: 1, g: 1, age: "old" },
      ece: { s: "b", h: "curly", hc: "brown", bg: "#fdecc8", t: "#d6a121", o: "tee", e: 1 },
      mert: { s: "b", h: "messy", hc: "chestnut", bg: "#dcecf6", t: "#2f7ec4", o: "tee", age: "kid" }
    },
    "dlg-interview": {
      elif: { s: "b", h: "bob", hc: "dark", bg: "#e9e6f3", t: "#3d4a5c", o: "blazer", x: "#f7f5f0", g: 1, e: 1 },
      kerem: { s: "c", h: "side", hc: "dark", bg: "#e0eef0", t: "#4a8bb0", o: "shirt", b: .35 }
    }
  };

  function hex(c) { c = c.replace("#", ""); return [parseInt(c.slice(0, 2), 16), parseInt(c.slice(2, 4), 16), parseInt(c.slice(4, 6), 16)]; }
  function shade(c, f) { var v = hex(c); return "rgb(" + v.map(function (x) { return Math.round(x * f); }).join(" ") + ")"; }
  function hash(s) { var h = 2166136261; for (var i = 0; i < s.length; i++) { h ^= s.charCodeAt(i); h = Math.imul(h, 16777619); } return h >>> 0; }

  // A look for someone with none written above, from their name; pitch below 1 reads as a man's voice (PROJECT.md 6.5).
  function guess(p) {
    var n = hash(String(p.name || p.id || "?")), pick = function (a, k) { return a[(n >>> k) % a.length]; };
    var man = (p.pitch || 1) < 1;
    return { s: pick("abcdef".split(""), 1), hc: pick(["black", "dark", "brown", "chestnut"], 4), t: pick(["#2f8f86", "#2452a0", "#c2462c", "#6a4a7a", "#4f7a45", "#d9862e"], 7),
      bg: pick(["#e6eef2", "#dcefe9", "#f6e3d3", "#fbe0e6", "#e3efd9", "#eee4f2"], 10), h: man ? pick(["short", "side"], 13) : pick(["long", "bob", "bun"], 13),
      o: pick(["tee", "shirt", "cardigan"], 16), x: "#f4eef6", m: man && n % 3 === 0 ? 1 : 0, e: !man && n % 2 ? 1 : 0, age: (p.pitch || 1) >= 1.3 ? "kid" : null };
  }

  function draw(L) {
    var kid = L.age === "kid", teen = L.age === "teen", old = L.age === "old";
    var skin = SKIN[L.s] || SKIN.b, sk2 = shade(skin, .86), hair = HAIR[L.hc] || L.hc || HAIR.dark, hr2 = shade(hair.charAt(0) === "#" ? hair : "#4a3426", .82);
    var cx = 32, cy = kid ? 34 : teen ? 31.5 : 30, rx = kid ? 12 : teen ? 12.2 : 12.5, ry = kid ? 12.2 : teen ? 13.6 : 14, top = cy - ry;
    var by = kid ? 50 : 46.5, ink = "#2a2420", lip = "#7a3b2e";
    var o = [];
    o.push('<circle cx="32" cy="32" r="32" fill="' + L.bg + '"/>');
    // hair behind the head
    var back = {
      long: "M" + (cx - rx - 2.5) + " " + cy + "C" + (cx - rx - 3.5) + " " + (top - 5) + " " + (cx + rx + 3.5) + " " + (top - 5) + " " + (cx + rx + 2.5) + " " + cy + "L" + (cx + rx + 4) + " " + (cy + ry + 7) + "Q" + cx + " " + (cy + ry + 10) + " " + (cx - rx - 4) + " " + (cy + ry + 7) + "z",
      bob: "M" + (cx - rx - 2.5) + " " + cy + "C" + (cx - rx - 3.5) + " " + (top - 5) + " " + (cx + rx + 3.5) + " " + (top - 5) + " " + (cx + rx + 2.5) + " " + cy + "L" + (cx + rx + 3) + " " + (cy + ry - 1) + "Q" + cx + " " + (cy + ry + 1) + " " + (cx - rx - 3) + " " + (cy + ry - 1) + "z",
      curly: "M" + (cx - rx - 4) + " " + (cy + 6) + "C" + (cx - rx - 8) + " " + (top - 6) + " " + (cx + rx + 8) + " " + (top - 6) + " " + (cx + rx + 4) + " " + (cy + 6) + "Q" + cx + " " + (cy + ry + 2) + " " + (cx - rx - 4) + " " + (cy + 6) + "z",
      pony: "M" + (cx + rx - 2) + " " + (top + 6) + "c6 1 9 8 7 18-1 4-4 6-6 4 2-6 1-12-3-16z"
    };
    if (L.h === "scarf") {
      o.push('<path d="M' + (cx - rx - 5) + " " + (cy + 2) + "C" + (cx - rx - 6) + " " + (top - 7) + " " + (cx + rx + 6) + " " + (top - 7) + " " + (cx + rx + 5) + " " + (cy + 2) + "L" + (cx + rx + 7) + " " + (by + 4) + "H" + (cx - rx - 7) + 'z" fill="' + L.sc + '"/>');
    } else if (back[L.h]) o.push('<path d="' + back[L.h] + '" fill="' + hair + '"/>');
    if (L.h === "bun") o.push('<circle cx="' + cx + '" cy="' + (top - 2.5) + '" r="5.5" fill="' + hair + '"/>');
    if (L.h === "pigtails") o.push('<circle cx="' + (cx - rx - 2.5) + '" cy="' + (cy - 1) + '" r="4.6" fill="' + hair + '"/><circle cx="' + (cx + rx + 2.5) + '" cy="' + (cy - 1) + '" r="4.6" fill="' + hair + '"/>' +
      '<circle cx="' + (cx - rx + .5) + '" cy="' + (cy - 3) + '" r="1.6" fill="#f0c14b"/><circle cx="' + (cx + rx - .5) + '" cy="' + (cy - 3) + '" r="1.6" fill="#f0c14b"/>');
    // body and clothes
    var body = kid ? "M14 64c1-8.5 7-14 18-14s17 5.5 18 14z" : "M10 64c1-11 9-17.5 22-17.5s21 6.5 22 17.5z";
    var top2 = L.o === "coat" || L.o === "vestw" ? L.x : L.t;
    if (L.o === "vestw") top2 = L.t;
    o.push('<path d="' + body + '" fill="' + (L.o === "coat" ? L.x : top2) + '"/>');
    o.push('<path d="M' + (cx - 4.5) + " " + (cy + ry - 4) + "h9v" + (by - cy - ry + 5) + "c0 2-2 3-4.5 3s-4.5-1-4.5-3z" + '" fill="' + sk2 + '"/>');
    var V = function (w, d, fill) { return '<path d="M' + (cx - w) + " " + (by - .5) + "L" + cx + " " + (by + d) + "L" + (cx + w) + " " + (by - .5) + 'z" fill="' + fill + '"/>'; };
    if (L.o === "tee") o.push('<path d="M' + (cx - 5) + " " + (by - .3) + "q5 4.5 10 0" + '" fill="' + sk2 + '"/>');
    if (L.o === "shirt") o.push(V(5, 6, sk2) +
      '<path d="M' + (cx - 5.5) + " " + (by - 1) + "L" + (cx - 1) + " " + (by + 6) + "M" + (cx + 5.5) + " " + (by - 1) + "L" + (cx + 1) + " " + (by + 6) + '" stroke="' + shade(L.t, .7) + '" stroke-width="1.2" fill="none" stroke-linecap="round"/>');
    if (L.o === "vest") {
      o.push(V(4.5, 9, "#f7f5f0"));
      o.push('<path d="M10 64c1-10 8-16.5 17-17.5l3 17.5zM54 64c-1-10-8-16.5-17-17.5l-3 17.5z" fill="' + L.x + '"/>');
      o.push('<path d="M' + (cx - 4.5) + " " + (by + 1) + "l4.5 2-4.5 2zM" + (cx + 4.5) + " " + (by + 1) + 'l-4.5 2 4.5 2z" fill="' + L.x + '"/><circle cx="' + cx + '" cy="' + (by + 3) + '" r="1.2" fill="' + L.x + '"/>');
    }
    if (L.o === "vestw") o.push(V(4, 8, "#f7f5f0") + '<path d="M11 64c1-10 8-16.5 16-17.5l3 17.5zM53 64c-1-10-8-16.5-16-17.5l-3 17.5z" fill="' + L.x + '"/>');
    if (L.o === "coat") {
      o.push(V(5, 10, L.t));
      o.push('<path d="M' + (cx - 5) + " " + (by - .5) + "L" + (cx - 1.5) + " " + (by + 10) + "M" + (cx + 5) + " " + (by - .5) + "L" + (cx + 1.5) + " " + (by + 10) + "M" + cx + " " + (by + 10) + 'V64" stroke="#d6d4cc" stroke-width="1" fill="none"/>');
      if (L.steth) o.push('<path d="M' + (cx - 6) + " " + (by + .5) + "c-2 6 0 11 4 12M" + (cx + 6) + " " + (by + .5) + "c2 6 0 11-4 12" + '" stroke="#3d4a5c" stroke-width="1.3" fill="none" stroke-linecap="round"/><circle cx="' + cx + '" cy="' + (by + 13.5) + '" r="2" fill="#7c8796"/>');
      if (L.badge) o.push('<rect x="40" y="55" width="7" height="7" rx="1.5" fill="#fff" stroke="#d6d4cc" stroke-width=".6"/><path d="M43.5 56.3v4.4M41.3 58.5h4.4" stroke="#2b8a4f" stroke-width="1.6"/>');
    }
    if (L.o === "blazer") {
      o.push(V(5, 10, L.x));
      o.push('<path d="M' + (cx - 5.5) + " " + (by - 1) + "L" + (cx - 1) + " " + (by + 10) + "L" + (cx - 7) + " " + (by + 6) + "zM" + (cx + 5.5) + " " + (by - 1) + "L" + (cx + 1) + " " + (by + 10) + "L" + (cx + 7) + " " + (by + 6) + 'z" fill="' + shade(L.t, .78) + '"/>');
      if (L.tag) o.push('<rect x="39" y="55" width="8" height="4" rx="1" fill="#fff"/>');
    }
    if (L.o === "blouse") o.push('<path d="M' + (cx - 5) + " " + (by - .3) + "q5 4.5 10 0" + '" fill="' + sk2 + '"/><path d="M' + (cx - 6.5) + " " + (by - .5) + "q6.5 6 13 0l1.5 2.5q-8 6.5-16 0z" + '" fill="' + L.x + '"/>');
    if (L.o === "cardigan") {
      o.push(V(5, 9, L.x));
      o.push('<path d="M' + (cx - 5) + " " + (by - .5) + "L" + (cx - 1) + " " + (by + 9) + "V64M" + (cx + 5) + " " + (by - .5) + "L" + (cx + 1) + " " + (by + 9) + 'V64" stroke="' + shade(L.t, .75) + '" stroke-width="1.2" fill="none"/>');
      o.push('<circle cx="' + (cx - 2.3) + '" cy="' + (by + 12) + '" r=".9" fill="' + shade(L.t, .6) + '"/><circle cx="' + (cx - 2.3) + '" cy="' + (by + 15.5) + '" r=".9" fill="' + shade(L.t, .6) + '"/>');
    }
    if (L.o === "apron") {
      o.push('<path d="M' + (cx - 5) + " " + (by - .3) + "q5 4.5 10 0" + '" fill="' + sk2 + '"/>');
      o.push('<path d="M' + (cx - 6.5) + " " + (by + 4) + "h13l2 13.5H" + (cx - 8.5) + 'z" fill="' + L.x + '"/><path d="M' + (cx - 6.5) + " " + (by + 4.5) + "L" + (cx - 5) + " " + (by - .5) + "M" + (cx + 6.5) + " " + (by + 4.5) + "L" + (cx + 5) + " " + (by - .5) + '" stroke="' + L.x + '" stroke-width="1.6"/>');
    }
    if (L.h === "scarf") o.push('<path d="M' + (cx - 8) + " " + (by - 2) + "Q" + cx + " " + (by + 5) + " " + (cx + 8) + " " + (by - 2) + "L" + (cx + 6) + " " + (by + 3) + "Q" + cx + " " + (by + 7) + " " + (cx - 6) + " " + (by + 3) + 'z" fill="' + shade(L.sc, .85) + '"/>');
    // ears, head
    if (L.h !== "scarf") o.push('<ellipse cx="' + (cx - rx - .3) + '" cy="' + (cy + 1) + '" rx="2.6" ry="3.6" fill="' + skin + '"/><ellipse cx="' + (cx + rx + .3) + '" cy="' + (cy + 1) + '" rx="2.6" ry="3.6" fill="' + skin + '"/>');
    if (L.e && L.h !== "scarf") o.push('<circle cx="' + (cx - rx - .4) + '" cy="' + (cy + 5) + '" r="1.1" fill="#e0b23c"/><circle cx="' + (cx + rx + .4) + '" cy="' + (cy + 5) + '" r="1.1" fill="#e0b23c"/>');
    o.push('<ellipse cx="' + cx + '" cy="' + cy + '" rx="' + rx + '" ry="' + ry + '" fill="' + skin + '"/>');
    // hair in front
    var cap = function (low, dip) {   // a cap of hair over the top of the head, down to `low` at the temples
      return "M" + (cx - rx - .6) + " " + low + "C" + (cx - rx - 1.2) + " " + (top - 3.5) + " " + (cx + rx + 1.2) + " " + (top - 3.5) + " " + (cx + rx + .6) + " " + low +
        "C" + (cx + rx - 1.5) + " " + (top + 6) + " " + (cx + 4 + dip) + " " + (top + 5.5) + " " + (cx + dip) + " " + (top + 6.5) + "C" + (cx - 5 + dip) + " " + (top + 5.5) + " " + (cx - rx + 1.5) + " " + (top + 6) + " " + (cx - rx - .6) + " " + low + "z";
    };
    var F = {
      short: cap(cy - 3, 0), side: cap(cy - 2, 4), round: cap(cy - 1, 0), messy: cap(cy - 2, -2), long: cap(cy, 3), bob: cap(cy + 1, -3), bun: cap(cy - 3, 0), pigtails: cap(cy - 2, 0), pony: cap(cy - 2, 3)
    };
    if (F[L.h]) o.push('<path d="' + F[L.h] + '" fill="' + hair + '"/>');
    if (L.h === "side") o.push('<path d="M' + (cx + 3) + " " + (top + 1) + "q-6 2-9 7" + '" stroke="' + hr2 + '" stroke-width="1" fill="none" opacity=".5"/>');
    if (L.h === "messy") o.push('<path d="M' + (cx - 7) + " " + (top + 1.5) + "q1-3.5 4-3 0-2.8 3.5-2.5 1.5-2.5 4.5-1 3 .2 3.5 3z" + '" fill="' + hair + '"/>');
    if (L.h === "curly") for (var k = 0; k < 6; k++) o.push('<circle cx="' + (cx - rx + 1 + k * (2 * rx - 2) / 5) + '" cy="' + (top + 2.5 + (k % 2) * 1.6) + '" r="3.6" fill="' + hair + '"/>');
    if (L.h === "bald") o.push('<path d="M' + (cx - rx - .4) + " " + (cy + 1) + "C" + (cx - rx - 1) + " " + (cy - 6) + " " + (cx - rx + 1) + " " + (cy - 9) + " " + (cx - rx + 3.5) + " " + (cy - 9) + "C" + (cx - rx + 2) + " " + (cy - 5) + " " + (cx - rx + 2) + " " + (cy - 1) + " " + (cx - rx + 1.5) + " " + (cy + 2) + "z" +
      "M" + (cx + rx + .4) + " " + (cy + 1) + "C" + (cx + rx + 1) + " " + (cy - 6) + " " + (cx + rx - 1) + " " + (cy - 9) + " " + (cx + rx - 3.5) + " " + (cy - 9) + "C" + (cx + rx - 2) + " " + (cy - 5) + " " + (cx + rx - 2) + " " + (cy - 1) + " " + (cx + rx - 1.5) + " " + (cy + 2) + 'z" fill="' + hair + '"/>' +
      '<ellipse cx="' + (cx - 4) + '" cy="' + (top + 4) + '" rx="4.5" ry="2" fill="#fff" opacity=".35"/>');
    if (L.h === "scarf") o.push('<path d="' + cap(cy + 4, 0) + '" fill="' + L.sc + '"/><path d="M' + (cx - rx + 2) + " " + (top + 4) + "Q" + cx + " " + (top + 1) + " " + (cx + rx - 2) + " " + (top + 4) + '" stroke="#fff" stroke-opacity=".45" stroke-width="1.1" fill="none" stroke-dasharray="1.5 2"/>' +
      [[-9, -6], [-4, -11], [3, -12], [9, -7], [-13, 3], [13, 3], [-10, 12], [10, 12]].map(function (d) { return '<circle cx="' + (cx + d[0]) + '" cy="' + (cy + d[1]) + '" r="1" fill="#fff" opacity=".55"/>'; }).join("") +
      '<path d="M' + (cx - rx - .5) + " " + (cy + 4) + "C" + (cx - rx - 1) + " " + (top - 1) + " " + (cx + rx + 1) + " " + (top - 1) + " " + (cx + rx + .5) + " " + (cy + 4) + '" stroke="' + shade(L.sc, .8) + '" stroke-width="1.3" fill="none"/>');
    if (L.cap) o.push('<path d="M' + (cx - rx - 1.5) + " " + (cy - 4) + "C" + (cx - rx - 1) + " " + (top - 5) + " " + (cx + rx + 1) + " " + (top - 5) + " " + (cx + rx + 1.5) + " " + (cy - 4) + 'z" fill="' + L.cap + '"/>' +
      '<path d="M' + (cx - rx - 1.5) + " " + (cy - 4.5) + "H" + (cx + rx + 5) + "q-1 3-5 3H" + (cx - rx - 1) + 'z" fill="' + shade(L.cap, .75) + '"/>');
    // the face: cheeks, eyes, brows, nose, mouths
    var ey = cy + (kid ? 1 : .5), ex = kid ? 4.6 : 5, eyR = kid || teen ? 1.9 : 1.6, eyH = kid || teen ? 2.2 : 1.9, by2 = ey - (kid ? 4 : 4.6), my = cy + (kid ? 6.3 : 7.6);
    var brow = old && (L.hc === "white" || L.hc === "grey") ? "#8d877e" : shade(hair.charAt(0) === "#" ? hair : "#4a3426", hair === HAIR.blond ? .7 : 1);
    o.push('<circle cx="' + (cx - 7.5) + '" cy="' + (ey + 4) + '" r="2.3" fill="#ef8a78" opacity=".35"/><circle cx="' + (cx + 7.5) + '" cy="' + (ey + 4) + '" r="2.3" fill="#ef8a78" opacity=".35"/>');
    o.push('<g class="ey"><ellipse cx="' + (cx - ex) + '" cy="' + ey + '" rx="' + eyR + '" ry="' + eyH + '" fill="' + ink + '"/><ellipse cx="' + (cx + ex) + '" cy="' + ey + '" rx="' + eyR + '" ry="' + eyH + '" fill="' + ink + '"/>' +
      (kid || teen ? '<circle cx="' + (cx - ex + .6) + '" cy="' + (ey - .7) + '" r=".6" fill="#fff"/><circle cx="' + (cx + ex + .6) + '" cy="' + (ey - .7) + '" r=".6" fill="#fff"/>' : "") + "</g>");
    o.push('<path class="ey-h" d="M' + (cx - ex - 2) + " " + (ey + .8) + "q2-2.8 4 0M" + (cx + ex - 2) + " " + (ey + .8) + 'q2-2.8 4 0" stroke="' + ink + '" stroke-width="1.5" fill="none" stroke-linecap="round"/>');
    o.push('<path class="bw bw-l" d="M' + (cx - ex - 2.5) + " " + (by2 + .5) + "q2.5-1.7 5 0" + '" stroke="' + brow + '" stroke-width="1.4" fill="none" stroke-linecap="round"/>' +
      '<path class="bw bw-r" d="M' + (cx + ex - 2.5) + " " + (by2 + .5) + "q2.5-1.7 5 0" + '" stroke="' + brow + '" stroke-width="1.4" fill="none" stroke-linecap="round"/>');
    o.push('<path d="M' + (cx - .4) + " " + (ey + 2) + "q1.4 2 0 3" + '" stroke="' + sk2 + '" stroke-width="1.3" fill="none" stroke-linecap="round"/>');
    if (L.b) o.push('<path d="M' + (cx - rx + .3) + " " + (cy + 1) + "C" + (cx - rx + .5) + " " + (cy + ry + 3) + " " + (cx + rx - .5) + " " + (cy + ry + 3) + " " + (cx + rx - .3) + " " + (cy + 1) + "C" + (cx + rx - 3) + " " + (cy + 9) + " " + (cx - rx + 3) + " " + (cy + 9) + " " + (cx - rx + .3) + " " + (cy + 1) + 'z" fill="' + hair + '" opacity="' + L.b + '"/>');
    var ln = '" stroke="' + lip + '" stroke-width="1.5" fill="none" stroke-linecap="round" stroke-linejoin="round"/>';
    o.push('<path class="mo m-s" d="M' + (cx - 3) + " " + my + "q3 2.6 6 0" + ln);
    o.push('<path class="mo m-h" d="M' + (cx - 3.8) + " " + (my - .6) + "q3.8 5.4 7.6 0z" + '" fill="' + lip + '"/>');
    o.push('<path class="mo m-n" d="M' + (cx - 2.4) + " " + (my + .8) + "h4.8" + ln);
    o.push('<path class="mo m-p" d="M' + (cx - 3.2) + " " + (my + 1.2) + "q1.6-1.6 3.2 0t3.2 0" + ln);
    o.push('<ellipse class="mo m-o" cx="' + cx + '" cy="' + (my + .9) + '" rx="2.5" ry="2.1" fill="' + lip + '"/>');
    if (L.m) o.push('<path d="M' + (cx - 5.2) + " " + (my - 1.5) + "c1.6-2.4 3.7-2.6 5.2-1.1 1.5-1.5 3.6-1.3 5.2 1.1-2.1.9-3.6.6-5.2-.4-1.6 1-3.1 1.3-5.2.4z" + '" fill="' + (L.hc === "white" || L.hc === "grey" ? "#dcd9d2" : hair) + '"/>');
    if (L.g) o.push('<g fill="#fff" fill-opacity=".18" stroke="#3a3a3a" stroke-width="1.1"><circle cx="' + (cx - ex) + '" cy="' + ey + '" r="3.5"/><circle cx="' + (cx + ex) + '" cy="' + ey + '" r="3.5"/></g><path d="M' + (cx - ex + 3.5) + " " + ey + "h" + (2 * ex - 7) + '" stroke="#3a3a3a" stroke-width="1.1"/>');
    return o.join("");
  }

  function look(dlg, who) {
    var set = LOOKS[dlg] || {}, L = null, p = typeof who === "object" && who ? who : { id: who };
    if (typeof p.id === "number") { var keys = Object.keys(set); L = set[keys[p.id]]; }
    else L = set[p.id];
    return L || guess(p);
  }

  var seq = 0, cache = {};
  var C = T.cast = {
    LOOKS: LOOKS,
    // who: a cast id, the cast entry ({ id, name, pitch }) or its position in the dialogue's cast (the index has no ids)
    face: function (dlg, who, size, opts) {
      opts = opts || {};
      var p = typeof who === "object" && who ? who : { id: who };
      var key = dlg + ":" + p.id + ":" + (p.name || "");
      var art = cache[key] || (cache[key] = draw(look(dlg, p)));
      var c = "trk-cf" + (++seq);
      return '<svg class="cf' + (opts.live ? " live" : "") + '" data-mood="' + (opts.mood || "smile") + '" viewBox="0 0 64 64" width="' + size + '" height="' + size + '"' +
        (opts.label ? ' role="img" aria-label="' + T.esc(opts.label) + '"' : ' aria-hidden="true"') + ' style="--blink:' + (-(hash(key + seq) % 4600) / 1000).toFixed(2) + 's">' +
        '<defs><clipPath id="' + c + '"><circle cx="32" cy="32" r="32"/></clipPath></defs><g clip-path="url(#' + c + ')">' + art + "</g></svg>";
    },
    mood: function (el, mood, pop) {
      if (!el) return;
      el.setAttribute("data-mood", mood || "smile");
      if (pop) { el.classList.remove("pop", "tilt"); void el.getBoundingClientRect(); el.classList.add(mood === "puzzled" || mood === "unsure" ? "tilt" : "pop"); }
    },
    talk: function (el, on) { if (el) el.classList.toggle("talk", !!on); },
    // The learner's character: the one picked in My Profile, else Tekir, the starter (always Tekir in the app, which has no profiles)
    buddyId: function () {
      var A = T.account;
      if (!A || !A.avatarSvg) return null;
      return (A.avatar && A.avatar()) || A.START || "tekir";
    },
    buddy: function (size) { var id = C.buddyId(); return id ? T.account.avatarSvg(id, size) : ""; },
    // What the companion says: short, everyday Turkish with its English, picked at random within a kind.
    cheer: function (kind, n) {
      var S = {
        streak: [["Aferin!", "Well done!"], ["Çok iyi!", "Very good!"], ["Harika!", "Wonderful!"], ["Süpersin!", "You're great!"], ["Bravo!", "Bravo!"]],
        hot: [["Muhteşem!", "Magnificent!"], ["Durdurulamıyorsun!", "You're unstoppable!"], ["Devam, devam!", "Keep going!"]],
        oops: [["Olsun!", "Never mind!"], ["Olsun, devam!", "Never mind, keep going!"], ["Bir dahakine!", "Next time!"]],
        perfect: [["Mükemmel!", "Perfect!"], ["Kusursuz!", "Flawless!"]],
        done: [["Tebrikler!", "Congratulations!"], ["Aferin sana!", "Good for you!"], ["Helal olsun!", "Hats off!"]],
        retry: [["Bir daha deneyelim!", "Let's try again!"], ["Pes etmek yok!", "No giving up!"]],
        talked: [["Ne güzel konuştun!", "You spoke so well!"], ["Tebrikler!", "Congratulations!"]]
      };
      var list = kind === "streak" && n >= 10 ? S.hot : S[kind] || S.done;
      var x = list[Math.floor(Math.random() * list.length)];
      return { tr: x[0], en: x[1] };
    }
  };
})(typeof window !== "undefined" ? window : this);
