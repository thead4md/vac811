# SEO plan — vac811.hu

## Already done in this change

- **Per-route titles + meta descriptions** — `SeoManager` in `src/App.tsx` now sets
  a unique `<title>` and `<meta name="description">` per page (was title-only), plus
  syncs `og:title/description/url`, `twitter:*`, and a **self-referential canonical**
  to the actual URL on every navigation. This kills duplicate-snippet issues across
  the SPA.
- **Structured data** — `Organization` JSON-LD already present in `index.html`.

## Decide first: where does this app live?

The app builds to `/beta/` (`vite.config.ts`) while `index.html` canonical/og:url
point at `https://vac811.hu/`. That mismatch is the core SEO question:

| Situation | Action |
|---|---|
| `/beta` is **staging**, WordPress stays at root | Add `noindex` to the beta build so Google doesn't index a duplicate of the live site |
| `/beta` is the **new site**, will move to root | Keep canonicals at root, plan the cutover (below) |

Until this is decided, leave canonicals as the SeoManager sets them
(self-referential to the live URL) and don't submit a sitemap.

## When the app becomes the root site (cutover checklist)

1. Set `base: '/'` in `vite.config.ts` and `basename = ''` follows automatically.
2. Move `sitemap.xml` + `robots.txt` (added in `public/`) so they serve from the
   **domain root** — search engines only read `/{robots,sitemap}` at the apex, not
   under `/beta/`.
3. 301-redirect the old WordPress URLs to the new routes (preserve any ranking).
4. Submit `https://vac811.hu/sitemap.xml` in Google Search Console.
5. Update JSON-LD `url`/`sameAs` and verify OG image (add one — see below).

## Backlog (highest value first)

1. **Social share image** — add a 1200×630 `og:image` (the logo on a branded card)
   and set `twitter:card` to `summary_large_image`. Currently no image → bland
   link previews on Facebook/Messenger, which is where a scout group actually shares.
2. **`Event` JSON-LD** — emit schema.org `Event` markup for items in
   `events.json` (date, location, name). Enables rich results for programs/camps.
3. **Per-page OG image** — gallery/camps pages could use a representative photo.
4. **`lang`/locale** — already `hu` / `hu_HU`. Good.
5. **Performance (Core Web Vitals)** — `csapat_gomba.webp` is 552 KB for a 10%-opacity
   backdrop. Down-resize it (e.g. 1600px wide, higher compression) → big LCP win on
   mobile for near-zero visual change.
6. **`robots.txt` + `sitemap.xml`** — added to `public/` for the root cutover.
7. **Search Console + analytics** — verify the domain; add privacy-friendly
   analytics (e.g. Plausible) to measure what content drives joins.
