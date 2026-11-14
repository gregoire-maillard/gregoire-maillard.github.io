#!/usr/bin/env node
// Daily Turkish · the "now on iPhone" email (app-launch.html), sent to every learner with a
// profile as a Resend Broadcast. Steps in README.md, next to this file.
//
//   node scripts/turkish/emails/send-app-launch.mjs test you@example.com [Name]
//       one copy to you, to check it in a real inbox (counts as 1 normal email)
//   node scripts/turkish/emails/send-app-launch.mjs upload ~/Downloads/users.csv
//       puts the learners exported from Supabase in the Resend segment "Daily Turkish learners"
//   node scripts/turkish/emails/send-app-launch.mjs send
//       sends the email to that segment, after you type "send" to confirm
//
// Needs Node 18+ and a Resend API key with FULL access in RESEND_API_KEY (the "sending access"
// key that Supabase uses can't manage contacts or broadcasts). No npm packages.

import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";
import { createInterface } from "node:readline/promises";

// ── Settings ──────────────────────────────────────────────────────────────────────────────
// The app's page on the App Store. App Store Connect → your app → App Information →
// General Information → Apple ID (a number), then: https://apps.apple.com/app/id<that number>
const APP_STORE_URL = "https://apps.apple.com/app/id6833673702";
const FROM = "Daily Turkish <hello@dailyturkish.app>";
const REPLY_TO = "gregoire.maillard@yahoo.fr";      // replies reach you; hello@ isn't an inbox
const SUBJECT = "Daily Turkish is now on iPhone";
const SEGMENT_NAME = "Daily Turkish learners";
const BROADCAST_NAME = "iPhone app launch";
// ──────────────────────────────────────────────────────────────────────────────────────────

const API = process.env.RESEND_API_BASE || "https://api.resend.com";
const KEY = process.env.RESEND_API_KEY;
const HERE = dirname(fileURLToPath(import.meta.url));
const EMAIL_RE = /^[^\s@,;<>"]+@[^\s@,;<>"]+\.[^\s@,;<>"]+$/;
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

function die(msg) { console.error("\n✗ " + msg + "\n"); process.exit(1); }

function html(strict = true) {
  if (!/^https:\/\/apps\.apple\.com\/.*id\d{6,}/.test(APP_STORE_URL)) {
    const msg = "Put the app's App Store link in APP_STORE_URL at the top of this script" + (strict ? " first" : "") + "\n  (now: " + APP_STORE_URL + ").";
    if (strict) die(msg);
    console.log("! The button doesn't work yet. " + msg);
  }
  const s = readFileSync(join(HERE, "app-launch.html"), "utf8").replaceAll("{{APP_STORE_URL}}", APP_STORE_URL);
  if (/\{\{(?!\{)[^}]*\}\}/.test(s.replace(/\{\{\{[^}]*\}\}\}/g, ""))) die("app-launch.html still has a {{…}} placeholder the script doesn't fill.");
  return s;
}

// Resend allows a few requests a second: space them out, and wait and retry on 429.
let last = 0;
async function api(method, path, body) {
  for (let attempt = 0; ; attempt++) {
    const wait = last + 600 - Date.now(); if (wait > 0) await sleep(wait);
    last = Date.now();
    const r = await fetch(API + path, {
      method,
      headers: { Authorization: "Bearer " + KEY, "Content-Type": "application/json" },
      body: body === undefined ? undefined : JSON.stringify(body),
    });
    const text = await r.text();
    let data; try { data = text ? JSON.parse(text) : {}; } catch { data = { message: text }; }
    if (r.status === 429 && attempt < 6) { await sleep((Number(r.headers.get("retry-after")) || 2) * 1000); continue; }
    if (!r.ok) {
      const e = new Error(`${method} ${path} → ${r.status} ${data.message || data.name || text}`);
      e.status = r.status; throw e;
    }
    return data;
  }
}

async function findSegment() {
  const res = await api("GET", "/segments");
  return (res.data || []).find((s) => s.name === SEGMENT_NAME) || null;
}

// Small CSV reader: header row, quoted fields, commas and newlines inside quotes, BOM.
function readCsv(path) {
  const t = readFileSync(path, "utf8").replace(/^﻿/, "");
  const rows = []; let row = [], f = "", q = false;
  for (let i = 0; i < t.length; i++) {
    const c = t[i];
    if (q) {
      if (c === '"') { if (t[i + 1] === '"') { f += '"'; i++; } else q = false; }
      else f += c;
    } else if (c === '"') q = true;
    else if (c === ",") { row.push(f); f = ""; }
    else if (c === "\n" || c === "\r") {
      if (c === "\r" && t[i + 1] === "\n") i++;
      row.push(f); f = ""; if (row.some((x) => x.trim())) rows.push(row); row = [];
    } else f += c;
  }
  row.push(f); if (row.some((x) => x.trim())) rows.push(row);
  const head = (rows.shift() || []).map((h) => h.trim().toLowerCase());
  const ie = head.indexOf("email"), iname = head.indexOf("first_name");
  if (ie < 0) die("The CSV has no \"email\" column (columns: " + head.join(", ") + "). Export it with app-launch-users.sql.");
  return rows.map((r) => ({ email: (r[ie] || "").trim(), first_name: iname < 0 ? "" : (r[iname] || "").trim() }));
}

async function cmdTest(to, name) {
  if (!to || !EMAIL_RE.test(to)) die("Usage: send-app-launch.mjs test you@example.com [Name]");
  const body = html(false)
    .replace(/\{\{\{contact\.first_name\|([^}]*)\}\}\}/g, (_, fb) => name || fb)
    .replaceAll("{{{RESEND_UNSUBSCRIBE_URL}}}", "https://dailyturkish.app/");
  const r = await api("POST", "/emails", { from: FROM, to: [to], reply_to: REPLY_TO, subject: "[Test] " + SUBJECT, html: body });
  console.log(`✓ Test sent to ${to} (Resend id ${r.id}). In the test, "Unsubscribe" just opens dailyturkish.app.`);
}

async function cmdUpload(path) {
  if (!path) die("Usage: send-app-launch.mjs upload ~/Downloads/<the CSV from Supabase>");
  const seen = new Set(), list = [], bad = [];
  for (const c of readCsv(path)) {
    const key = c.email.toLowerCase();
    if (!EMAIL_RE.test(c.email)) { if (c.email) bad.push(c.email); continue; }
    if (seen.has(key)) continue;
    seen.add(key); list.push(c);
  }
  if (!list.length) die("No email addresses found in " + path);
  if (bad.length) console.log(`! Skipped ${bad.length} value(s) that aren't email addresses: ${bad.slice(0, 5).join(", ")}`);

  let seg = await findSegment();
  if (!seg) { seg = await api("POST", "/segments", { name: SEGMENT_NAME }); console.log(`✓ Created the segment "${SEGMENT_NAME}"`); }
  else console.log(`✓ Using the segment "${SEGMENT_NAME}" that already exists`);

  let added = 0, existing = 0; const failed = [];
  for (const [i, c] of list.entries()) {
    const contact = { email: c.email, segments: [{ id: seg.id }] };
    if (c.first_name) contact.first_name = c.first_name.slice(0, 40);
    try { await api("POST", "/contacts", contact); added++; }
    catch (e) {
      if (e.status === 401 || e.status === 403) die("Resend refused the API key: " + e.message + "\n  Use a key with Full access.");
      // Most likely the contact exists already (a second run): just put it in the segment.
      try { await api("POST", `/contacts/${encodeURIComponent(c.email)}/segments/${seg.id}`); existing++; }
      catch (e2) { failed.push(`${c.email}: ${e.message} / ${e2.message}`); }
    }
    if ((i + 1) % 25 === 0) console.log(`  ${i + 1} / ${list.length}`);
  }
  console.log(`✓ ${added + existing} of ${list.length} learners are in "${SEGMENT_NAME}" (${added} new, ${existing} already in Resend).`);
  if (failed.length) { console.log(`! ${failed.length} failed:`); failed.forEach((f) => console.log("  " + f)); }
  console.log("Next: check them in Resend → Audience, then run the send command.");
}

async function cmdSend() {
  const body = html();
  const seg = await findSegment();
  if (!seg) die(`There's no segment "${SEGMENT_NAME}" in Resend yet: run the upload command first.`);
  console.log(`\nAbout to email everyone in the Resend segment "${SEGMENT_NAME}"`);
  console.log(`  From:     ${FROM}\n  Reply-to: ${REPLY_TO}\n  Subject:  ${SUBJECT}\n  Button:   ${APP_STORE_URL}`);
  console.log("Learners who unsubscribed are skipped by Resend. This can't be undone.");
  const rl = createInterface({ input: process.stdin, output: process.stdout });
  const answer = (await rl.question('Type "send" to send it now: ')).trim().toLowerCase();
  rl.close();
  if (answer !== "send") { console.log("Nothing sent."); return; }
  const r = await api("POST", "/broadcasts", {
    segment_id: seg.id, from: FROM, reply_to: REPLY_TO, subject: SUBJECT, name: BROADCAST_NAME, html: body, send: true,
  });
  console.log(`✓ Sent (broadcast ${r.id}). Follow deliveries, opens and clicks in Resend → Broadcasts.`);
}

const [cmd, a, b] = process.argv.slice(2);
if (!["test", "upload", "send"].includes(cmd)) {
  console.log("Usage:\n  send-app-launch.mjs test you@example.com [Name]\n  send-app-launch.mjs upload ~/Downloads/users.csv\n  send-app-launch.mjs send");
  process.exit(cmd ? 1 : 0);
}
if (!KEY) die("Set your Resend API key first, e.g.  RESEND_API_KEY=re_xxx node " + process.argv[1].split("/").slice(-4).join("/") + " " + cmd + " …");
try {
  if (cmd === "test") await cmdTest(a, b);
  else if (cmd === "upload") await cmdUpload(a);
  else await cmdSend();
} catch (e) { die(e.message); }
