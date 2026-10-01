# Link-preview images

`make-og.mjs` draws the 1200×630 image LinkedIn, Slack and iMessage show when a page is shared,
from the page's card on `airlinetools.html` (group, title, description, pills, illustration).
Images go to `assets/img/og/<page>.jpg`.

When a new tool or course is added to the hub:

1. `node scripts/og/make-og.mjs <page>` (needs `npm i playwright` and `npx playwright install chromium` once).
2. Copy the `<!-- link previews … -->` block from any tool page into the new page's `<head>` and
   change the page name in `canonical`, `og:url` and `og:image`, and the title and description.
