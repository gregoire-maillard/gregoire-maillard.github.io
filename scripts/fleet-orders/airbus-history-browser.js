// Airbus delivery history, read in a normal browser (Airbus blocks scripted downloads).
//
// 1. Open https://www.airbus.com/en/products-services/commercial-aircraft/orders-and-deliveries
// 2. Paste this whole file into the browser's developer console and press Enter.
// 3. It downloads one YYYY.json per annual archive linked on the page (the December workbook's
//    "Deliveries" sheet: every delivery of the year by customer).
// 4. Put the files in a folder and run, from the repo root:
//      node scripts/fleet-orders/merge-airbus-history.mjs <that folder>
//    Years already in assets/data/fleet-orders.json are skipped.
(async () => {
  const links = [...new Set([...document.querySelectorAll("a[href]")].map((a) => a.href).filter((h) => /orders[-_]and[-_]deliveries[-_]\d{4}[^/]*\.zip$/i.test(h)))];
  const list = (b) => { const dv = new DataView(b.buffer); let e = b.length - 22; while (e > 0 && dv.getUint32(e, true) !== 0x06054b50) e--; const n = dv.getUint16(e + 10, true); let p = dv.getUint32(e + 16, true); const out = []; const td = new TextDecoder();
    for (let i = 0; i < n; i++) { const m = dv.getUint16(p + 10, true), cs = dv.getUint32(p + 20, true), fl = dv.getUint16(p + 28, true), xl = dv.getUint16(p + 30, true), cl = dv.getUint16(p + 32, true), lo = dv.getUint32(p + 42, true); out.push({ name: td.decode(b.subarray(p + 46, p + 46 + fl)), m, cs, lo }); p += 46 + fl + xl + cl; } return out; };
  const read = async (b, e) => { const dv = new DataView(b.buffer); const s = e.lo + 30 + dv.getUint16(e.lo + 26, true) + dv.getUint16(e.lo + 28, true); const raw = b.subarray(s, s + e.cs); if (e.m === 0) return raw.slice(); return new Uint8Array(await new Response(new Blob([raw]).stream().pipeThrough(new DecompressionStream("deflate-raw"))).arrayBuffer()); };
  const unx = (s) => s.replace(/&lt;/g, "<").replace(/&gt;/g, ">").replace(/&quot;/g, '"').replace(/&apos;/g, "'").replace(/&amp;/g, "&");
  for (const u of links) {
    const outer = new Uint8Array(await (await fetch(u)).arrayBuffer());
    const dec = list(outer).find((e) => /december/i.test(e.name) && /\.xlsx$/i.test(e.name));
    if (!dec) { console.warn("no December workbook in", u); continue; }
    const x = await read(outer, dec), xe = list(x);
    const get = async (n) => { const e = xe.find((e) => e.name === n); return e ? new TextDecoder().decode(await read(x, e)) : ""; };
    const ss = []; for (const m of (await get("xl/sharedStrings.xml")).matchAll(/<si>([\s\S]*?)<\/si>/g)) ss.push(unx([...m[1].matchAll(/<t[^>]*>([\s\S]*?)<\/t>/g)].map((t) => t[1]).join("")));
    const rels = {}; for (const m of (await get("xl/_rels/workbook.xml.rels")).matchAll(/<Relationship\b[^>]*>/g)) { const id = /Id="([^"]+)"/.exec(m[0]), t = /Target="([^"]+)"/.exec(m[0]); if (id && t) rels[id[1]] = t[1].replace(/^\/?(xl\/)?/, "xl/"); }
    let sheet = null; for (const m of (await get("xl/workbook.xml")).matchAll(/<sheet\b[^>]*>/g)) if (unx((/name="([^"]*)"/.exec(m[0]) || [])[1] || "").trim() === "Deliveries") sheet = rels[(/r:id="([^"]+)"/.exec(m[0]) || [])[1]];
    if (!sheet) { console.warn("no Deliveries sheet in", dec.name); continue; }
    const rows = [];
    for (const r of (await get(sheet)).matchAll(/<row\b([^>]*)>([\s\S]*?)<\/row>/g)) {
      const cells = [];
      for (const c of r[2].matchAll(/<c\b([^>]*?)(?:\/>|>([\s\S]*?)<\/c>)/g)) {
        const a = c[1], b = c[2] || "", ref = (/\br="([A-Z]+)\d+"/.exec(a) || [])[1], t = (/\bt="([^"]+)"/.exec(a) || [])[1], v = (/<v>([\s\S]*?)<\/v>/.exec(b) || [])[1];
        let val = null;
        if (t === "s") val = v != null ? ss[+v] : null; else if (t === "inlineStr") val = unx([...b.matchAll(/<t[^>]*>([\s\S]*?)<\/t>/g)].map((x) => x[1]).join("")); else if (t === "str") val = v != null ? unx(v) : null; else if (v != null && v !== "") val = Number(v);
        if (val !== null && val !== "") cells.push([ref, val]);
      }
      if (cells.length) rows.push([+(/\br="(\d+)"/.exec(r[1]) || [])[1], cells]);
    }
    const year = (/(\d{4})/.exec(dec.name) || [])[1];
    const a = document.createElement("a");
    a.href = URL.createObjectURL(new Blob([JSON.stringify({ file: dec.name.split("/").pop(), rows })], { type: "application/json" }));
    a.download = year + ".json"; a.click();
    console.log("saved", year + ".json", rows.length, "rows");
  }
})();
