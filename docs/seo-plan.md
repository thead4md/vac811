# SEO plan — vac811.hu

> Supersedes the pre-migration version of this doc. See also
> `docs/ssg-prerendering.md` (Phase 2: prerendering) and
> `docs/cloudflare-pages-runbook.md` (deploy/rollback).

## Current state (Phase 3 — SEO cutover)

- **Prerendered per-route HTML** (Phase 2) — the 10 static routes ship real
  server-rendered markup + metadata, not just a post-mount DOM mutation.
- **Per-route titles/descriptions/canonical/OG** — baked at build time by
  `src/components/SeoHead.tsx` (`src/lib/seo.ts` holds the `pageSeo` map),
  reused for client-side navigation too.
- **`noindex` removed** — the site is now crawlable/indexable.
- **Canonical/OG origin is `https://vac811.hu`** (the apex), set ahead of the
  actual DNS cutover per an explicit owner decision. **This is a sequencing
  risk** — see the callout in `src/lib/seo.ts`. A canonical pointing at a
  domain not yet serving this content can cause crawlers to ignore it or treat
  this site's pages as duplicates of the (currently different) content at that
  URL. Get the apex DNS pointed at this Cloudflare Pages project as soon as
  possible after merging this to minimize the window where that's true.
- **`sitemap.xml`** — regenerated from the actual route list by
  `scripts/generate-sitemap.mjs` (re-run after adding/removing a public route).
- **`robots.txt`** — allows everything except `/admin/`, points at the sitemap.
- **Social share image** — `public/og-image.png` (1200×630, branded), generated
  by `scripts/generate-og-image.mjs`; `twitter:card` is `summary_large_image`.
- **`Event` JSON-LD** — `src/components/EventJsonLd.tsx` emits schema.org
  `Event` markup per calendar entry on `/naptar`, extending the `Organization`
  JSON-LD already in `index.html`. Events don't carry per-event location data
  today, so every event defaults to the team's clubhouse address — see the
  code comment for the accuracy caveat.

## WordPress apex retirement (outside this repo — owner action required)

None of this can be done from the codebase; it needs access to the Rackhost/
WordPress hosting, the Cloudflare zone/DNS, and Google Search Console:

1. **Point `vac811.hu` at this Cloudflare Pages project** (custom domain in the
   Pages dashboard + DNS). Until this happens, the canonical URLs above are
   aspirational, not yet true — see the sequencing risk above.
2. **Relocate (don't delete) the WordPress site** to `vac811.hu/old` (or
   another subpath) so historical content and any inbound links stay reachable
   — `src/components/Footer.tsx` already links to `/old` in anticipation of
   this. This is a nontrivial WordPress reconfiguration (siteurl/home, theme
   asset paths, plugin behavior all assume root), not just a DNS change —
   budget real effort here or reconsider the subpath vs. a full archive/export.
3. **301-redirect old WordPress URLs** to their new equivalent routes on this
   site (e.g. old query-string or slug-based WP permalinks → `/rolunk`,
   `/naptar`, etc.). Do this via a Cloudflare Bulk Redirect or a `_redirects`
   rule once the apex is on this Pages project — preserves any existing search
   ranking instead of just 404ing.
4. **Submit `https://vac811.hu/sitemap.xml` in Google Search Console** and
   request indexing/URL inspection on a few key pages once the apex is live.
5. **Watch for duplicate-content warnings** in Search Console for the first
   few weeks — expected and self-resolving once the redirects (step 3) are in
   place and Google re-crawls.

## Backlog / nice-to-haves (not blocking cutover)

- Per-page OG images for gallery/camp posts (currently one site-wide image).
- Down-resize `csapat_gomba.webp` (currently ~550 KB combined for a low-opacity
  backdrop) for a Core Web Vitals / LCP win.
- Google Search Console + analytics verification (Cloudflare Web Analytics is
  covered in Phase 1.2 of the Cloudflare migration roadmap).
