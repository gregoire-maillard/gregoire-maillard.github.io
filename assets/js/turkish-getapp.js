// © 2026 Grégoire Maillard. All rights reserved. Not open source: see /LICENSE.txt
//
// Daily Turkish · invitations to get the iPhone app (GETAPP-1, turkish/PROJECT.md 3).
// Website and dailyturkish.app only: app/scripts/build-www.mjs leaves this script out of the app, and it does
// nothing on a page flagged <html data-app>. A classic script, loaded with defer after turkish.js and
// turkish-account.js; it needs neither (it reads the streak from TRK when the page has it).
//
//   iPhone (Safari or any browser on an iPhone): a banner above the header bar, the app's icon, a line and "Get".
//   Hub, Today column, right under XP and streak (computer and tablet; not below 600 px): a card with a QR code
//     to scan with the iPhone's camera, and a link to the App Store.
//   Hub, About: a section "Daily Turkish on your iPhone" with what the app adds, two phones, and the QR code
//     (on an iPhone, a Get button instead).
//   turkishget.html (dailyturkish.app/get/, the QR code's address): opens the App Store on an iPhone, else shows
//     the QR code.
// The banner and the card share one "×": closed, or after a tap on Get, they stay away for 30 days
// (localStorage "trk:getapp:hide"). The About section always shows.

(function () {
  "use strict";

  // ── To fill in once Apple has approved the app ──────────────────────────────────────────────────────────────
  // The app's Apple ID: App Store Connect › Apps › Daily Turkish › App Information › General Information › Apple ID
  // (a number such as 6712345678). While it is empty nothing shows on the site: the app isn't on the App Store yet.
  // To preview before that, open any course page with ?getapp (stays on for the tab; ?getapp=off ends it);
  // ?getapp=banner also shows the iPhone banner on a computer.
  var APP_ID = "6833673702";
  // Optional: App Store Connect › Analytics › Acquisition › Campaigns › Generate a campaign link gives "pt=…".
  // With it here, App Analytics shows which invitation brought each download (ct=web-banner, web-home, web-about, qr).
  var PROVIDER_TOKEN = "";
  // ────────────────────────────────────────────────────────────────────────────────────────────────────────────

  var doc = document, html = doc.documentElement, w = window;
  if (html.hasAttribute("data-app") || w.Capacitor) { w.TRKGetApp = null; return; }   // the app itself

  var GET_URL = "https://dailyturkish.app/get/";      // what the QR code says
  var HIDE_KEY = "trk:getapp:hide", PREVIEW_KEY = "trk:getapp:preview", HIDE_DAYS = 30;
  var READY = /^\d{6,12}$/.test(APP_ID);
  var IPHONE = /iPhone|iPod/.test(navigator.userAgent || "");
  var preview = "";
  try {
    var q = new URLSearchParams(location.search).get("getapp");
    if (q === "off") sessionStorage.removeItem(PREVIEW_KEY);
    else if (q !== null) sessionStorage.setItem(PREVIEW_KEY, q === "banner" ? "banner" : "on");
    preview = sessionStorage.getItem(PREVIEW_KEY) || "";
  } catch (e) { preview = ""; }
  var ON = READY || !!preview;
  if (preview) try { localStorage.removeItem(HIDE_KEY); } catch (e) { /* nothing to undo */ }   // undo a hide set while previewing
  var closed = false;   // closed on this page view (also in preview, where the 30 days don't apply)

  function url(ct) {
    if (!READY) return GET_URL;
    return "https://apps.apple.com/app/id" + APP_ID + (PROVIDER_TOKEN ? "?pt=" + encodeURIComponent(PROVIDER_TOKEN) + "&ct=" + ct + "&mt=8" : "");
  }
  function away() {
    if (closed) return true;
    if (preview) return false;
    try { return +(localStorage.getItem(HIDE_KEY) || 0) > Date.now(); } catch (e) { return false; }
  }
  function putAway() {
    closed = true;
    if (preview) return;   // trying things out in preview doesn't hide the real invitations later
    try { localStorage.setItem(HIDE_KEY, String(Date.now() + HIDE_DAYS * 864e5)); } catch (e) { /* storage blocked: this page view only */ }
  }
  function streak() {
    try {
      var T = w.TRK;
      if (!T || !T.progress || !T.store || T.app) return 0;
      var s = T.progress.streak(T.store.course(), T.store.settings(), Date.now());
      return (s && s.current) || 0;
    } catch (e) { return 0; }
  }

  // ── artwork ──
  var MARK = '<circle cx="25" cy="21" r="8" fill="#fff"/><circle cx="28.5" cy="18" r="7.5" fill="#e34b4f"/>' +
    '<path d="m41 14 2 4 4.4.6-3.2 3.1.8 4.4-4-2.1-4 2.1.8-4.4-3.2-3.1 4.4-.6z" fill="#fff"/>' +
    '<path d="M10 34c7-3 14-2 22 3v16c-8-5-15-6-22-3zM32 37c8-5 15-6 22-3v16c-7-3-14-2-22 3z" fill="#fff"/>' +
    '<path d="M32 37v16" fill="none" stroke="#f4b7ba" stroke-linecap="round" stroke-width="2"/>';
  // The app's icon (app/icon.svg): the logo's white mark on red.
  function appIcon(cls) { return '<svg class="' + cls + '" viewBox="0 0 64 64" aria-hidden="true"><rect width="64" height="64" rx="14.3" fill="#e34b4f"/>' + MARK + "</svg>"; }
  // QR code of GET_URL, version 4 at level H (30% can be covered: the icon in the middle takes 7%), the finder
  // squares' centres in the logo's red. Made with segno and checked to decode (OpenCV) down to 100 px wide.
  var QR_PATH = "M0 0h7v1h-7zM9 0h1v1h-1zM11 0h2v1h-2zM14 0h1v1h-1zM16 0h7v1h-7zM24 0h1v1h-1zM26 0h7v1h-7zM0 1h1v1h-1zM6 1h1v1h-1zM8 1h1v1h-1zM10 1h2v1h-2zM14 1h1v1h-1zM17 1h1v1h-1zM19 1h1v1h-1zM22 1h1v1h-1zM26 1h1v1h-1zM32 1h1v1h-1zM0 2h1v1h-1zM2 2h3v1h-3zM6 2h1v1h-1zM8 2h1v1h-1zM13 2h4v1h-4zM18 2h2v1h-2zM21 2h1v1h-1zM24 2h1v1h-1zM26 2h1v1h-1zM28 2h3v1h-3zM32 2h1v1h-1zM0 3h1v1h-1zM2 3h3v1h-3zM6 3h1v1h-1zM8 3h2v1h-2zM12 3h4v1h-4zM17 3h1v1h-1zM19 3h5v1h-5zM26 3h1v1h-1zM28 3h3v1h-3zM32 3h1v1h-1zM0 4h1v1h-1zM2 4h3v1h-3zM6 4h1v1h-1zM8 4h3v1h-3zM12 4h1v1h-1zM14 4h2v1h-2zM17 4h1v1h-1zM19 4h3v1h-3zM23 4h1v1h-1zM26 4h1v1h-1zM28 4h3v1h-3zM32 4h1v1h-1zM0 5h1v1h-1zM6 5h1v1h-1zM8 5h2v1h-2zM12 5h2v1h-2zM17 5h4v1h-4zM23 5h1v1h-1zM26 5h1v1h-1zM32 5h1v1h-1zM0 6h7v1h-7zM8 6h1v1h-1zM10 6h1v1h-1zM12 6h1v1h-1zM14 6h1v1h-1zM16 6h1v1h-1zM18 6h1v1h-1zM20 6h1v1h-1zM22 6h1v1h-1zM24 6h1v1h-1zM26 6h7v1h-7zM9 7h3v1h-3zM15 7h1v1h-1zM18 7h1v1h-1zM20 7h1v1h-1zM23 7h2v1h-2zM2 8h1v1h-1zM5 8h4v1h-4zM10 8h2v1h-2zM13 8h1v1h-1zM15 8h2v1h-2zM19 8h2v1h-2zM22 8h1v1h-1zM25 8h1v1h-1zM27 8h5v1h-5zM0 9h1v1h-1zM2 9h2v1h-2zM5 9h1v1h-1zM11 9h4v1h-4zM16 9h2v1h-2zM19 9h2v1h-2zM23 9h5v1h-5zM30 9h1v1h-1zM32 9h1v1h-1zM1 10h2v1h-2zM6 10h1v1h-1zM8 10h1v1h-1zM11 10h4v1h-4zM18 10h1v1h-1zM21 10h4v1h-4zM27 10h2v1h-2zM30 10h1v1h-1zM32 10h1v1h-1zM3 11h2v1h-2zM7 11h1v1h-1zM10 11h1v1h-1zM12 11h3v1h-3zM19 11h2v1h-2zM22 11h1v1h-1zM27 11h1v1h-1zM29 11h1v1h-1zM1 12h4v1h-4zM6 12h3v1h-3zM10 12h2v1h-2zM21 12h3v1h-3zM26 12h3v1h-3zM32 12h1v1h-1zM4 13h1v1h-1zM9 13h1v1h-1zM11 13h1v1h-1zM21 13h6v1h-6zM29 13h1v1h-1zM32 13h1v1h-1zM0 14h2v1h-2zM3 14h4v1h-4zM8 14h2v1h-2zM11 14h1v1h-1zM23 14h2v1h-2zM27 14h2v1h-2zM30 14h1v1h-1zM32 14h1v1h-1zM1 15h2v1h-2zM9 15h3v1h-3zM22 15h1v1h-1zM24 15h1v1h-1zM26 15h1v1h-1zM29 15h1v1h-1zM3 16h2v1h-2zM6 16h2v1h-2zM9 16h2v1h-2zM22 16h2v1h-2zM26 16h2v1h-2zM0 17h1v1h-1zM3 17h2v1h-2zM7 17h2v1h-2zM11 17h1v1h-1zM23 17h1v1h-1zM26 17h1v1h-1zM30 17h1v1h-1zM32 17h1v1h-1zM1 18h1v1h-1zM4 18h1v1h-1zM6 18h2v1h-2zM11 18h1v1h-1zM22 18h2v1h-2zM27 18h4v1h-4zM32 18h1v1h-1zM0 19h2v1h-2zM3 19h3v1h-3zM7 19h3v1h-3zM11 19h1v1h-1zM23 19h1v1h-1zM26 19h1v1h-1zM28 19h2v1h-2zM31 19h2v1h-2zM1 20h3v1h-3zM5 20h2v1h-2zM8 20h2v1h-2zM23 20h1v1h-1zM27 20h1v1h-1zM32 20h1v1h-1zM1 21h1v1h-1zM4 21h2v1h-2zM7 21h1v1h-1zM9 21h1v1h-1zM12 21h5v1h-5zM19 21h1v1h-1zM21 21h1v1h-1zM27 21h1v1h-1zM32 21h1v1h-1zM0 22h8v1h-8zM12 22h1v1h-1zM14 22h4v1h-4zM23 22h1v1h-1zM25 22h2v1h-2zM28 22h1v1h-1zM30 22h1v1h-1zM32 22h1v1h-1zM3 23h1v1h-1zM7 23h3v1h-3zM12 23h1v1h-1zM15 23h1v1h-1zM17 23h1v1h-1zM19 23h2v1h-2zM22 23h1v1h-1zM28 23h2v1h-2zM31 23h2v1h-2zM0 24h2v1h-2zM3 24h4v1h-4zM8 24h1v1h-1zM10 24h1v1h-1zM12 24h1v1h-1zM14 24h1v1h-1zM17 24h2v1h-2zM20 24h1v1h-1zM23 24h7v1h-7zM31 24h1v1h-1zM8 25h3v1h-3zM12 25h2v1h-2zM15 25h3v1h-3zM21 25h1v1h-1zM23 25h2v1h-2zM28 25h1v1h-1zM32 25h1v1h-1zM0 26h7v1h-7zM8 26h1v1h-1zM10 26h1v1h-1zM12 26h3v1h-3zM16 26h1v1h-1zM19 26h2v1h-2zM24 26h1v1h-1zM26 26h1v1h-1zM28 26h1v1h-1zM32 26h1v1h-1zM0 27h1v1h-1zM6 27h1v1h-1zM8 27h2v1h-2zM11 27h2v1h-2zM15 27h2v1h-2zM18 27h4v1h-4zM23 27h2v1h-2zM28 27h2v1h-2zM31 27h2v1h-2zM0 28h1v1h-1zM2 28h3v1h-3zM6 28h1v1h-1zM9 28h1v1h-1zM11 28h3v1h-3zM15 28h1v1h-1zM17 28h2v1h-2zM21 28h1v1h-1zM23 28h7v1h-7zM0 29h1v1h-1zM2 29h3v1h-3zM6 29h1v1h-1zM11 29h5v1h-5zM18 29h2v1h-2zM21 29h1v1h-1zM23 29h1v1h-1zM25 29h1v1h-1zM27 29h3v1h-3zM31 29h1v1h-1zM0 30h1v1h-1zM2 30h3v1h-3zM6 30h1v1h-1zM8 30h2v1h-2zM12 30h3v1h-3zM17 30h1v1h-1zM22 30h3v1h-3zM28 30h5v1h-5zM0 31h1v1h-1zM6 31h1v1h-1zM9 31h3v1h-3zM13 31h4v1h-4zM22 31h3v1h-3zM26 31h1v1h-1zM0 32h7v1h-7zM9 32h1v1h-1zM12 32h1v1h-1zM16 32h3v1h-3zM20 32h1v1h-1zM24 32h1v1h-1zM26 32h1v1h-1zM28 32h3v1h-3zM32 32h1v1h-1z";
  var QR_EYES = '<rect x="2" y="2" width="3" height="3" fill="#c93d41"/><rect x="28" y="2" width="3" height="3" fill="#c93d41"/><rect x="2" y="28" width="3" height="3" fill="#c93d41"/>';
  function qrSvg() {
    return '<svg class="ga-qrsvg" viewBox="0 0 33 33" shape-rendering="crispEdges" role="img" aria-label="QR code that opens Daily Turkish on the App Store">' +
      '<path d="' + QR_PATH + '" fill="#151A23"/>' + QR_EYES +
      '<rect x="12.15" y="12.15" width="8.7" height="8.7" rx="2.3" fill="#fff"/>' +
      '<svg x="12.6" y="12.6" width="7.8" height="7.8" viewBox="0 0 64 64" shape-rendering="geometricPrecision"><rect width="64" height="64" rx="15" fill="#e34b4f"/>' + MARK + "</svg></svg>";
  }
  // The QR code as a link, in a camera viewfinder with a scan line.
  function qrLink(ct, cls) {
    return '<a class="ga-qr' + (cls ? " " + cls : "") + '" href="' + url(ct) + '" target="_blank" rel="noopener" data-ga-go aria-label="Daily Turkish on the App Store">' + qrSvg() +
      '<svg class="ga-vf" viewBox="0 0 100 100" preserveAspectRatio="none" aria-hidden="true"><path d="M2 18V8a6 6 0 0 1 6-6h10M82 2h10a6 6 0 0 1 6 6v10M98 82v10a6 6 0 0 1-6 6H82M18 98H8a6 6 0 0 1-6-6V82" fill="none" stroke="#e34b4f" stroke-width="3.2" stroke-linecap="round" vector-effect="non-scaling-stroke"/></svg>' +
      '<i class="ga-scan" aria-hidden="true"></i></a>';
  }
  var I = {
    x: '<svg viewBox="0 0 20 20" width="16" height="16" aria-hidden="true"><path d="M5.5 5.5l9 9M14.5 5.5l-9 9" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round"/></svg>',
    flame: '<svg class="ga-flame" viewBox="0 0 20 20" width="13" height="13" aria-hidden="true"><path d="M10.2 2.5c.4 2.6-1.3 3.9-2.6 5.4C6.4 9.3 5.5 10.6 5.5 12.4A4.5 4.5 0 0 0 10 17a4.5 4.5 0 0 0 4.5-4.6c0-2.1-1.1-3.4-1.9-4.4-.1 1.2-.6 2-1.4 2.4.3-2.8-.3-5.9-1-7.9z" fill="currentColor"/></svg>',
    bell: '<svg viewBox="0 0 20 20" width="18" height="18" aria-hidden="true"><path d="M5.5 13.5V9a4.5 4.5 0 0 1 9 0v4.5l1.3 1.6H4.2zM8.3 16.6a1.9 1.9 0 0 0 3.4 0" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linejoin="round" stroke-linecap="round"/></svg>',
    widget: '<svg viewBox="0 0 20 20" width="18" height="18" aria-hidden="true"><rect x="3" y="3" width="6" height="6" rx="1.6" fill="currentColor"/><rect x="11" y="3" width="6" height="6" rx="1.6" fill="none" stroke="currentColor" stroke-width="1.5"/><rect x="3" y="11" width="14" height="6" rx="1.6" fill="none" stroke="currentColor" stroke-width="1.5"/></svg>',
    plane: '<svg viewBox="0 0 20 20" width="18" height="18" aria-hidden="true"><path d="M8.6 17.2l1.5-5.7-4.3-.1-1.4 1.8H3.2l.8-3.2-.8-3.2h1.2l1.4 1.8 4.3-.1-1.5-5.7h1.6l3.3 5.7h3.3a1.4 1.4 0 0 1 0 2.8h-3.3l-3.3 5.7z" fill="none" stroke="currentColor" stroke-width="1.4" stroke-linejoin="round"/></svg>',
    sync: '<svg viewBox="0 0 20 20" width="18" height="18" aria-hidden="true"><path d="M15.6 8.2A5.8 5.8 0 0 0 5 6.3M4.4 11.8A5.8 5.8 0 0 0 15 13.7M5 3.4v2.9h2.9M15 16.6v-2.9h-2.9" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round"/></svg>',
    phone: '<svg viewBox="0 0 20 20" width="17" height="17" aria-hidden="true"><rect x="5.5" y="2" width="9" height="16" rx="2.2" fill="none" stroke="currentColor" stroke-width="1.6"/><path d="M8.8 4.4h2.4" stroke="currentColor" stroke-width="1.6" stroke-linecap="round"/></svg>'
  };

  // ── styles (one block, so the pages need nothing but the script tag) ──
  var IZNIK = "url(\"data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='64' height='64' viewBox='0 0 64 64'%3E%3Cg fill='none' stroke-width='1.3'%3E%3Cg stroke='%232452a0'%3E%3Crect x='21' y='21' width='22' height='22'/%3E%3Crect x='21' y='21' width='22' height='22' transform='rotate%2845 32 32%29'/%3E%3Ccircle cx='0' cy='0' r='11'/%3E%3Ccircle cx='64' cy='0' r='11'/%3E%3Ccircle cx='0' cy='64' r='11'/%3E%3Ccircle cx='64' cy='64' r='11'/%3E%3C/g%3E%3Cg stroke='%2311847f'%3E%3Ccircle cx='32' cy='32' r='5'/%3E%3Cpath d='M32 -5l5 5-5 5-5-5zM32 59l5 5-5 5-5-5zM-5 32l5-5 5 5-5 5zM59 32l5-5 5 5-5 5z'/%3E%3C/g%3E%3Cg stroke='%23c2462c'%3E%3Cpath d='M32 17.5v-4M32 46.5v4M17.5 32h-4M46.5 32h4'/%3E%3C/g%3E%3C/g%3E%3C/svg%3E\")";
  var CSS = [
    ".ga-sr{position:absolute;width:1px;height:1px;overflow:hidden;clip:rect(0 0 0 0);white-space:nowrap}",
    "html[data-app] .ga-bar,html[data-app] .ga-card,html[data-app] #getapp-about{display:none!important}",
    "#getapp-about:empty{display:none}",
    ".about-body #getapp-about>h2{margin-top:28px}",
    // iPhone banner
    ".ga-bar{--ga-blue:#287a9e;position:relative;isolation:isolate;overflow:hidden;display:flex;align-items:center;gap:10px;max-height:96px;padding:10px 10px 10px 4px;" +
      "background:linear-gradient(180deg,#fff 0%,#fdf8f6 100%);box-shadow:inset 0 -1px 0 rgb(15 23 42/.08);color:#151A23;" +
      "font:14px/1.25 -apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;-webkit-font-smoothing:antialiased;animation:ga-open .55s cubic-bezier(.2,.8,.2,1) both}",
    ".ga-bar::before{content:'';position:absolute;inset:0;z-index:-1;pointer-events:none;background:" + IZNIK + " right -10px center/58px 58px;opacity:.1;" +
      "-webkit-mask-image:linear-gradient(90deg,transparent 30%,#000 85%);mask-image:linear-gradient(90deg,transparent 30%,#000 85%)}",
    ".ga-bar.ga-shut{animation:ga-shut .32s ease-in both}",
    ".ga-x{flex:none;display:grid;place-items:center;width:30px;height:44px;margin:0 -4px 0 0;padding:0;border:0;border-radius:8px;background:none;color:#8a8f99;cursor:pointer}",
    ".ga-x:hover{color:#151A23}",
    ".ga-x:focus-visible,.ga-get:focus-visible,.ga-cx:focus-visible,.ga-qr:focus-visible,.ga-btn:focus-visible{outline:2px solid #155b7c;outline-offset:2px}",
    ".ga-ico{flex:none;display:block;width:52px;height:52px;border-radius:12px;box-shadow:0 0 0 .5px rgb(0 0 0/.14),0 3px 8px -2px rgb(227 75 79/.55);animation:ga-pop .75s cubic-bezier(.3,1.6,.5,1) .3s both}",
    ".ga-txt{flex:1;min-width:0;display:flex;flex-direction:column;gap:1px}",
    ".ga-txt b{font-size:15px;font-weight:650;letter-spacing:-.01em}",
    ".ga-l1,.ga-l2{overflow:hidden;white-space:nowrap;text-overflow:ellipsis}",
    ".ga-l1{font-size:12.5px;color:#454b57}",
    ".ga-l1 .ga-flame{vertical-align:-2px;margin-right:2px;color:#e8590c}",
    ".ga-l2{font-size:11.5px;color:#7a808b}",
    ".ga-get{flex:none;display:flex;align-items:center;min-height:44px;padding:0 2px;text-decoration:none!important;-webkit-tap-highlight-color:transparent}",
    ".ga-pill{position:relative;overflow:hidden;display:block;min-width:66px;padding:7px 16px;border-radius:999px;background:var(--ga-blue);color:#fff;" +
      "font-size:15px;font-weight:700;line-height:20px;text-align:center;box-shadow:0 2px 0 #12506c;transition:transform .08s,box-shadow .08s}",
    ".ga-pill::after{content:'';position:absolute;inset:0;background:linear-gradient(105deg,transparent 25%,rgb(255 255 255/.6) 50%,transparent 75%);transform:translateX(-130%);animation:ga-shine 1.2s ease-in-out 1.2s 2}",
    ".ga-get:active .ga-pill{transform:translateY(2px);box-shadow:0 0 0 #12506c}",
    "@media (max-width:359px){.ga-bar{gap:8px;padding-right:8px}.ga-ico{width:46px;height:46px;border-radius:11px}.ga-pill{min-width:56px;padding:7px 12px}}",
    // hub card, Today column
    ".ga-card{position:relative;isolation:isolate;overflow:hidden;padding:16px 16px 0!important}",
    ".ga-card::before{content:'';position:absolute;inset:0;z-index:-1;pointer-events:none;background:radial-gradient(130% 100% at 100% 0,rgb(227 75 79/.10),transparent 58%)}",
    ".ga-card::after{content:'';position:absolute;right:-26px;top:-26px;width:120px;height:120px;z-index:-1;pointer-events:none;background:" + IZNIK + " 0 0/40px 40px;opacity:.1;" +
      "-webkit-mask-image:radial-gradient(closest-side,#000,transparent);mask-image:radial-gradient(closest-side,#000,transparent)}",
    ".ga-card.ga-shut{animation:ga-fade .3s ease-in both}",
    ".ga-cx{position:absolute;top:6px;right:6px;display:grid;place-items:center;width:30px;height:30px;padding:0;border:0;border-radius:8px;background:none;color:#9a9ea6;cursor:pointer}",
    ".ga-cx:hover{color:#242424;background:rgb(15 23 42/.05)}",
    ".ga-cin{display:flex;align-items:center;gap:14px}",
    ".ga-ct{min-width:0}",
    ".ga-k{display:flex;align-items:center;gap:6px;margin:0;font-size:12.5px;font-weight:650;letter-spacing:.01em;color:#c93d41}",   /* "iPhone" keeps its small i: no uppercase */
    ".ga-dot{width:7px;height:7px;border-radius:50%;background:#e34b4f;box-shadow:0 0 0 0 rgb(227 75 79/.5);animation:ga-ping 2.2s ease-out infinite}",
    ".ga-card h3{margin:4px 0 0;font-size:16px;line-height:1.25;font-weight:650;color:#242424;letter-spacing:-.01em}",
    ".ga-cs{margin:5px 0 0;font-size:13px;line-height:1.4;color:#555}",
    ".ga-cs b{color:#242424;font-weight:620}",
    ".ga-cf{display:flex;align-items:center;gap:7px;margin:14px -16px 0;padding:10px 16px;border-top:1px solid #eeede9;background:rgb(250 250 248/.8);font-size:12.5px;color:#6f6f6f}",
    ".ga-cf svg{flex:none;color:#9a9ea6}",
    ".ga-cf a{font-weight:600;color:#287a9e}",
    ".ga-cf a:hover{color:#155b7c}",
    "@media (max-width:899px){.today>.ga-card{grid-column:1/-1}}",
    "@media (max-width:599px){.ga-card{display:none!important}}",
    // the QR code in its viewfinder
    ".ga-qr{position:relative;flex:none;display:block;width:104px;height:104px;padding:9px;border-radius:14px;background:#fff;" +
      "box-shadow:0 1px 1px rgb(15 23 42/.05),0 10px 22px -10px rgb(15 23 42/.35);transition:transform .25s cubic-bezier(.3,1.4,.5,1),box-shadow .25s}",
    ".ga-qr:hover{transform:translateY(-2px) rotate(-1.5deg);box-shadow:0 1px 1px rgb(15 23 42/.05),0 16px 28px -12px rgb(15 23 42/.4)}",
    ".ga-qrsvg{display:block;width:100%;height:100%}",
    ".ga-vf{position:absolute;inset:-7px;width:calc(100% + 14px);height:calc(100% + 14px);pointer-events:none;overflow:visible}",
    ".ga-scan{position:absolute;left:8px;right:8px;top:12%;height:2px;border-radius:2px;background:#e34b4f;box-shadow:0 0 10px 2px rgb(227 75 79/.55);opacity:0;pointer-events:none;animation:ga-scan 1.7s ease-in-out .7s 2 alternate}",
    ".ga-qr:hover .ga-scan{animation:ga-scan 1.5s ease-in-out infinite alternate}",
    // About section
    ".ga-about{position:relative;isolation:isolate;overflow:hidden;display:grid;grid-template-columns:minmax(0,1fr) 290px;max-width:760px;margin-top:12px;border:1px solid #f0dcd7;border-radius:14px;" +
      "background:linear-gradient(140deg,#fff7f5 0%,#fdf1ee 40%,#eef5f9 100%)}",
    ".ga-about::before{content:'';position:absolute;inset:0;z-index:-1;pointer-events:none;background:" + IZNIK + " 0 0/64px 64px;opacity:.07;" +
      "-webkit-mask-image:radial-gradient(90% 120% at 100% 100%,#000 10%,transparent 65%);mask-image:radial-gradient(90% 120% at 100% 100%,#000 10%,transparent 65%)}",
    ".ga-a-txt{padding:20px 22px 22px}",
    ".about-body .ga-a-lede,.ga-a-lede{margin:0;font-size:15px;line-height:1.4;font-weight:550;color:#242424;letter-spacing:-.01em}",
    ".ga-feat{list-style:none;margin:14px 0 0;padding:0;display:grid;grid-template-columns:repeat(2,max-content);gap:10px 20px}",
    ".ga-feat li{display:flex;align-items:center;gap:9px;font-size:14px;line-height:1.3;color:#555}",
    ".ga-feat b{color:#242424;font-weight:620}",
    ".ga-fi{flex:none;display:grid;place-items:center;width:28px;height:28px;border-radius:8px;background:#fff;color:#c93d41;box-shadow:0 0 0 1px rgb(227 75 79/.14),0 2px 6px -2px rgb(15 23 42/.15)}",
    ".ga-a-cta{display:flex;align-items:center;gap:16px;margin-top:18px}",
    ".ga-a-cta .ga-qr{width:96px;height:96px;padding:8px}",
    ".about-body .ga-a-cta p,.ga-a-cta p{margin:0}",
    ".ga-a-cta .ga-big{font-size:14px;font-weight:600;color:#242424}",
    ".ga-a-cta .ga-muted{margin-top:3px!important;font-size:13.5px;color:#6f6f6f}",
    ".ga-btn{display:inline-flex;align-items:center;justify-content:center;gap:8px;min-height:44px;margin-top:12px;padding:0 18px;border:1px solid #287a9e;border-radius:8px;" +
      "background:#287a9e;color:#fff!important;font-size:15px;font-weight:600;text-decoration:none!important;box-shadow:0 3px 0 #12506c;transition:transform .08s,box-shadow .08s,background-color .15s}",
    ".ga-btn:hover{background:#155b7c;border-color:#155b7c}",
    ".ga-btn:active{transform:translateY(2px);box-shadow:0 1px 0 #12506c}",
    ".ga-a-cta .ga-btn{min-height:40px;margin-top:10px;font-size:14px;padding:0 14px}",
    ".ga-btn.ga-wide{width:100%;margin-top:18px;min-height:46px;font-size:15px}",
    ".ga-a-phones{position:relative;min-height:250px;overflow:hidden}",
    ".ga-phone{position:absolute;top:44px;width:132px;padding:4px;border-radius:24px;background:#151A23;box-shadow:inset 0 0 0 1.5px #434957,0 34px 50px -24px rgb(21 26 35/.55),0 8px 16px -8px rgb(21 26 35/.3)}",
    ".ga-phone::before{content:'';position:absolute;top:10px;left:50%;width:36px;height:11px;margin-left:-18px;border-radius:7px;background:#0b0d12;z-index:1}",
    ".ga-phone img{display:block;width:100%;height:auto;border-radius:20px;background:#fff}",
    ".ga-back{left:calc(50% - 128px);top:64px;transform:rotate(-7deg);animation:ga-float-b 7s ease-in-out infinite}",
    ".ga-front{left:calc(50% - 12px);transform:rotate(5deg);animation:ga-float-f 6s ease-in-out infinite}",
    ".ga-note{position:absolute;z-index:3;left:calc(50% - 125px);top:14px;display:flex;align-items:center;gap:8px;width:250px;padding:7px 10px 7px 7px;border-radius:13px;" +
      "background:rgb(255 255 255/.86);-webkit-backdrop-filter:blur(14px) saturate(160%);backdrop-filter:blur(14px) saturate(160%);" +
      "box-shadow:0 0 0 .5px rgb(0 0 0/.08),0 12px 28px -12px rgb(21 26 35/.45);font-size:11.5px;line-height:1.3;color:#151A23;animation:ga-note .7s cubic-bezier(.2,1.3,.4,1) .9s both}",
    ".ga-note .ga-nico{flex:none;width:24px;height:24px;border-radius:6px}",
    ".ga-note span{min-width:0}",
    ".ga-note small{display:flex;justify-content:space-between;gap:8px;font-size:9.5px;letter-spacing:.03em;text-transform:uppercase;color:#7a808b}",
    ".ga-note b{display:block;font-weight:620}",
    "@media (max-width:759px){",
    "  .ga-about{grid-template-columns:minmax(0,1fr)}",
    "  .ga-a-txt{padding:18px 18px 4px}",
    "  .ga-a-phones{min-height:230px}",
    "  .ga-feat{grid-template-columns:minmax(0,1fr) minmax(0,1fr);gap:10px 12px}",
    "}",
    // motion
    "@keyframes ga-open{from{max-height:0;padding-top:0;padding-bottom:0;opacity:0}to{max-height:96px;opacity:1}}",
    "@keyframes ga-shut{to{max-height:0;padding-top:0;padding-bottom:0;opacity:0}}",
    "@keyframes ga-fade{to{opacity:0;transform:scale(.97)}}",
    "@keyframes ga-pop{0%{transform:scale(.3) rotate(-14deg);opacity:0}55%{transform:scale(1.1) rotate(5deg);opacity:1}78%{transform:scale(.97) rotate(-2deg)}100%{transform:none}}",
    "@keyframes ga-shine{to{transform:translateX(130%)}}",
    "@keyframes ga-ping{0%{box-shadow:0 0 0 0 rgb(227 75 79/.55)}70%,100%{box-shadow:0 0 0 7px rgb(227 75 79/0)}}",
    "@keyframes ga-scan{0%{top:10%;opacity:0}12%{opacity:1}88%{opacity:1}100%{top:88%;opacity:0}}",
    "@keyframes ga-float-f{0%,100%{transform:rotate(5deg) translateY(0)}50%{transform:rotate(5deg) translateY(-8px)}}",
    "@keyframes ga-float-b{0%,100%{transform:rotate(-7deg) translateY(0)}50%{transform:rotate(-7deg) translateY(-5px)}}",
    "@keyframes ga-note{from{opacity:0;transform:translateY(-14px) scale(.96)}to{opacity:1;transform:none}}",
    "@media (prefers-reduced-motion:reduce){.ga-bar,.ga-bar.ga-shut,.ga-ico,.ga-pill::after,.ga-dot,.ga-scan,.ga-qr:hover .ga-scan,.ga-back,.ga-front,.ga-note,.ga-card.ga-shut{animation:none!important}.ga-qr,.ga-qr:hover{transition:none;transform:none}}"
  ].join("\n");
  function addStyles() {
    if (doc.getElementById("ga-css")) return;
    var s = doc.createElement("style");
    s.id = "ga-css";
    s.textContent = CSS;
    (doc.head || html).appendChild(s);
  }

  // ── the pieces ──
  function bannerHtml() {
    var n = streak();
    var l1 = n >= 2 ? I.flame + "Keep your " + n + "-day streak" : "Learn Turkish on the go";
    return '<button type="button" class="ga-x" data-ga-x aria-label="Close">' + I.x + "</button>" +
      appIcon("ga-ico") +
      '<span class="ga-txt"><b>Daily Turkish</b><span class="ga-l1">' + l1 + '</span><span class="ga-l2">Free on the App Store</span></span>' +
      '<a class="ga-get" href="' + url("web-banner") + '" data-ga-go><span class="ga-pill">Get<span class="ga-sr"> Daily Turkish on the App Store</span></span></a>';
  }
  function showBanner() {
    if (!(IPHONE || preview === "banner") || away() || doc.querySelector(".ga-bar") || !doc.body) return;
    if (html.getAttribute("data-ga-page")) return;   // the /get page is the invitation itself
    var bar = doc.createElement("aside");
    bar.className = "ga-bar";
    bar.setAttribute("aria-label", "Get the Daily Turkish app");
    bar.innerHTML = bannerHtml();
    doc.body.insertBefore(bar, doc.body.firstChild);
  }

  // The Today column's card, right under XP and streak (turkish.html, renderToday). opts.streak: the current streak.
  function card(opts) {
    if (!ON || IPHONE || away()) return "";
    var n = (opts && opts.streak) || 0;
    var sub = n >= 2
      ? "A daily reminder to keep your <b>" + n + "-day streak</b>, a home-screen widget, and lessons that work offline."
      : "A daily reminder, a home-screen widget, and lessons that work offline. Free, no ads.";
    return '<section class="card ga-card" aria-labelledby="ga-card-h">' +
      '<button type="button" class="ga-cx" data-ga-x aria-label="Hide the app invitation">' + I.x + "</button>" +
      '<div class="ga-cin">' + qrLink("web-home") +
      '<div class="ga-ct"><p class="ga-k"><span class="ga-dot" aria-hidden="true"></span>iPhone app</p>' +
      '<h3 id="ga-card-h">Daily Turkish in your pocket</h3><p class="ga-cs">' + sub + "</p></div></div>" +
      '<p class="ga-cf">' + I.phone + '<span>Scan with your iPhone’s camera, or <a href="' + url("web-home") + '" target="_blank" rel="noopener" data-ga-go>open the App Store</a></span></p>' +
      "</section>";
  }

  // About › "Daily Turkish on your iPhone" (turkish.html fills nothing: the slot #getapp-about stays empty until here).
  function aboutHtml() {
    var n = streak(), days = n >= 2 ? n : 21;
    var cta = IPHONE
      ? '<a class="ga-btn ga-wide" href="' + url("web-about") + '" data-ga-go>' + I.phone + "Get the app · Free</a>"
      : '<div class="ga-a-cta">' + qrLink("web-about") +
        '<div><p class="ga-big">Scan with your iPhone’s camera</p>' +
        '<a class="ga-btn" href="' + url("web-about") + '" target="_blank" rel="noopener" data-ga-go>View on the App Store</a></div></div>';
    return '<h2 id="h-getapp">Daily Turkish on your iPhone</h2>' +
      '<div class="ga-about"><div class="ga-a-txt">' +
      '<p class="ga-a-lede">The same course, made for your phone. Free, no ads.</p>' +
      '<ul class="ga-feat">' +
      '<li><span class="ga-fi">' + I.bell + "</span><b>A daily reminder</b></li>" +
      '<li><span class="ga-fi">' + I.widget + "</span><b>A home-screen widget</b></li>" +
      '<li><span class="ga-fi">' + I.plane + "</span><b>Works offline</b></li>" +
      '<li><span class="ga-fi">' + I.sync + "</span><b>One profile for both</b></li>" +
      "</ul>" + cta + "</div>" +
      '<div class="ga-a-phones" aria-hidden="true">' +
      '<span class="ga-note">' + appIcon("ga-nico") + "<span><small><span>Daily Turkish</span><span>now</span></small><b>Your " + days + "-day streak ends tonight</b></span></span>" +
      '<span class="ga-phone ga-back"><img src="/assets/img/daily-turkish-app-done.webp" alt="" width="420" height="912" loading="lazy" decoding="async"></span>' +
      '<span class="ga-phone ga-front"><img src="/assets/img/daily-turkish-app-lesson.webp" alt="" width="420" height="912" loading="lazy" decoding="async"></span>' +
      "</div></div>";
  }
  function fillAbout() {
    var slot = doc.getElementById("getapp-about");
    if (slot && ON && !slot.firstChild) slot.innerHTML = aboutHtml();
  }

  // turkishget.html: dailyturkish.app/get/, where the QR code leads.
  function getPage() {
    var el = doc.getElementById("ga-get");
    if (!el) return;
    if (!READY) {
      el.innerHTML = '<p class="gp-soon">Coming soon to the App Store.</p><p class="gp-note">Meanwhile, the whole course is free on the website.</p>' +
        '<a class="ga-btn ga-wide" href="https://dailyturkish.app/">Start learning</a>';
      return;
    }
    if (IPHONE) {
      el.innerHTML = '<p class="gp-note" role="status">Opening the App Store…</p><a class="ga-btn ga-wide" href="' + url("qr") + '">Get the app · Free</a>';
      setTimeout(function () { location.replace(url("qr")); }, 350);   // a moment for the page view to be counted
      return;
    }
    el.innerHTML = '<div class="gp-qr">' + qrLink("qr") + '</div><p class="gp-note">On your iPhone, point the camera at the code: it opens the App Store.</p>' +
      '<a class="ga-btn ga-wide" href="' + url("qr") + '" target="_blank" rel="noopener">View on the App Store</a>';
  }

  // ── wiring ──
  doc.addEventListener("click", function (e) {
    var t = e.target && e.target.closest ? e.target : null;
    if (!t) return;
    var x = t.closest("[data-ga-x]");
    if (x) {
      putAway();
      var box = x.closest(".ga-bar, .ga-card");
      if (box) {
        box.classList.add("ga-shut");
        var gone = function () { if (box.parentNode) box.parentNode.removeChild(box); };
        box.addEventListener("animationend", gone);
        setTimeout(gone, 450);
      }
      return;
    }
    if (t.closest("a[data-ga-go]")) putAway();   // the App Store is open: no need to ask again soon
  });

  w.TRKGetApp = { on: ON, ready: READY, iphone: IPHONE, url: url, card: card, qr: qrSvg };
  function init() {
    if (html.getAttribute("data-ga-page") === "get") { addStyles(); getPage(); return; }
    if (!ON) return;
    addStyles();
    showBanner();
    fillAbout();
  }
  if (doc.readyState === "loading") doc.addEventListener("DOMContentLoaded", init); else init();
})();
