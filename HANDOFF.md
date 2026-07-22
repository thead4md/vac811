# Handoff: Cloudflare Pages Migration & Roadmap

## Context

`beta.vac811.hu` was migrated from Rackhost FTP to Cloudflare Pages (PR #73,
merged). The site is a React 19 + Vite 8 SPA; both curation Workers
(`google-git-proxy`, `image-cdn`) are redeployed pointing at the new origin.

**Decisions driving priority (confirmed with owner):**
- **beta will eventually become the real public site**, retiring/replacing the
  WordPress apex. This makes SSR/prerender + the SEO cutover *high-value*, not
  cosmetic — it's the north star of this roadmap.
- Work is a **full sequenced roadmap**, ordered by dependency and value/effort.
- The SEO cutover (noindex removal, canonical change, WordPress redirects) is
  **explicitly gated on business go-live timing** — do not flip these without
  the owner's direct go-ahead, even if asked to "do Phase 3."

Phases 1/2/3.2 (PR #75) are merged into `main`. Phase 4 work is on its own
branch/PR, opened from a rebased `main`.

Effort key: **S** <2h · **M** ~half-day · **L** 1–3d · **XL** >3d.

---

## Status at a glance

| Phase | Status | Notes |
|---|---|---|
| 1 — Quick wins | ✅ Done (code) / ⏳ 2 dashboard items open | See below |
| 2 — Prerender/SSG | ✅ Done | vite-react-ssg, 10 static routes |
| 3.2 — Social + structured data | ✅ Done | og-image, Event JSON-LD |
| 3.1 / 3.3 — SEO cutover | ⏸️ Deliberately not started | Gated on go-live decision |
| 4 — Content KV fast-path | ✅ Code done / ⏳ 3 dashboard items open | See below |
| 5 — Security & auth consolidation | ✅ 5.2 code done / ⏳ dashboard+account items open | 5.1 & 5.3 are owner-only Cloudflare actions |
| 6 — Edge consolidation | ⏸️ Not started | Depends on 4 & 5 being proven; nothing concrete to build yet |

---

## Phase 1 — Quick wins ✅ (mostly)

Commit: `d9a3ce7`

**Done:**
- **1.3** Fixed stale `/beta/admin/kuracio` link → `/admin/kuracio`
  (`public/admin/index.html`).
- **1.2** Added Cloudflare Web Analytics beacon hosts to CSP in
  `public/_headers` (`script-src`/`connect-src` allow `*.cloudflareinsights.com`).
- **1.5** Wrote `docs/cloudflare-pages-deploy.md` — rollback, preview URLs,
  build env vars, smoke check, troubleshooting.

**Still open (requires Cloudflare dashboard access, not code):**
- **1.1** Verify the `vac811-beta` Pages project has preview builds enabled
  and production branch set to `main`.
- **1.4** Confirm `VITE_GOOGLE_CLIENT_ID` and `VITE_PROXY_URL` are set as
  **Pages build environment variables** (Settings → Environment variables).
  Without these, `/admin/kuracio` shows a "misconfigured" screen instead of
  the Google sign-in button. Both documented in `docs/cloudflare-pages-deploy.md`.

---

## Phase 2 — Prerender/SSG the static routes ✅

Commit: `d0ab1d4`

Ships real per-route HTML for 10 static routes (`/`, `/rolunk`, `/tortenet`,
`/cserkeszet`, `/vezetok`, `/rajok`, `/taborok`, `/naptar`, `/csatlakozas`,
`/kapcsolat`) via **vite-react-ssg**, keeping full SPA hydration. `/galeria`
and `/admin/kuracio` stay client-only via the existing `_redirects` catch-all.

**What changed:**
- `src/App.tsx` — converted from `<BrowserRouter>/<Routes>` to a
  `RouteRecord[]` data-router with an `<Outlet/>` layout; exports `routes`.
- `src/main.tsx` — now `export const createRoot = ViteReactSSG({ routes, ... })`.
- `vite.config.ts` — `ssgOptions.includedRoutes` filters the crawler's
  (relative-path) output down to the 10 static routes.
- `src/components/Navbar.tsx` — the one real SSR blocker. It read
  `localStorage`/`matchMedia` in a `useState` initializer (throws
  server-side). Now defaults to `'light'` (matches the prerendered markup and
  the existing no-flash script in `index.html`) and adopts the real theme in
  a post-mount effect.
- New `RouteHead` component in `App.tsx` bakes per-route `<title>`/
  description/canonical/og via vite-react-ssg's `<Head>` (react-helmet-async
  under the hood), replacing the old crawler-invisible post-mount
  `SeoManager` DOM mutation. Duplicate static SEO tags removed from
  `index.html` (kept site-wide constants: keywords, author, robots,
  og:type/locale/site_name).
- `package.json` — `dev`/`build` scripts now run through `vite-react-ssg`.

**Tooling gotchas resolved (worth knowing before touching this area again):**
- `vite-react-ssg`'s `react-router-dom` peer range is `^6.14.1`; this repo is
  on RR7. RR7 moved the server-render APIs
  (`StaticRouterProvider`/`createStaticHandler`/`createStaticRouter`) from
  `react-router-dom/server` into `react-router` core and dropped the
  `/server` subpath entirely — `vite-react-ssg` still imports the old path
  and throws `ERR_PACKAGE_PATH_NOT_EXPORTED` without a fix.
  - **Fix:** `patches/react-router-dom+7.17.0.patch` (via `patch-package`)
    adds back `react-router-dom/server(.js)` as a shim re-exporting those
    three symbols from `react-router`. Reapplied automatically on every
    install via the `postinstall` script — don't remove that hook.
  - `.npmrc` sets `legacy-peer-deps=true` so `npm install`/`npm ci` don't
    choke on the RR6-vs-RR7 peer mismatch.
  - Side-effect: `legacy-peer-deps` stopped npm auto-installing
    `@testing-library/dom` (a peer of `@testing-library/react`), which broke
    `screen`/`within` imports in tests. Added as an explicit devDependency.
- If `vite-react-ssg` ever ships a release with a real RR7 peer range, revisit
  whether the patch and `legacy-peer-deps` are still needed.

**Known limitation (not a blocker, just be aware):**
- The prerendered `/naptar` HTML renders `eventsStatic` (the static fallback
  in `src/data/events.ts`), not live `public/content/events.json` — a
  relative `fetch()` inside `useContent` can't resolve during Node-side
  prerendering. The plan's Phase 2.2 flagged inlining live content at
  prerender time as a "reuse" opportunity, not a hard requirement, so this
  was left as-is. If pursued later: pass build-time-loaded JSON into routes
  via `vite-react-ssg`'s route `loader`, or statically import the JSON like
  the JSON-LD component below already does.

**Verification:** `npm run lint` / `npm test` (32 tests) / `npm run
validate:content` all green. `npm run build` prerenders all 10 routes with
`data-server-rendered="true"` roots, deduplicated per-route metadata, and a
wired hydration script (`assets/app-*.js`).

---

## Phase 3.2 — Social share image + structured data ✅

Commit: `8726aa2`. **Only 3.2 was done** — see the gating note below.

- `scripts/generate-og-image.mjs` — one-off generator (rerun manually if
  brand/copy changes) that rasterizes a branded 1200×630 `public/og-image.png`
  from the site logo + brand tokens via `sharp` (already a dependency).
  Wired as `og:image`/`twitter:image` in `index.html`; `twitter:card` switched
  to `summary_large_image`.
- `src/pages/Naptar.tsx` — new `EventsJsonLd` component emits schema.org
  `Event` JSON-LD per entry, extending the existing `Organization` JSON-LD
  in `index.html`. **Sourced from a static import of
  `public/content/events.json` directly** (not the page's own
  `useContent`/`eventsStatic` render path) — this matches what the hydrated
  page shows once the client fetch resolves, avoiding a mismatch between
  structured data and the (stale-fallback) crawled snapshot described above.

**Verification:** build emits 5 `Event` JSON-LD blocks on `/naptar` (schema
validated by hand — `@type`, `name`, `startDate`, `location`, `organizer`
all present) plus the unchanged `Organization` block; `og-image.png` ships to
`dist/`. Lint/tests/content-validation all green.

### 3.1 / 3.3 — deliberately NOT done — READ BEFORE TOUCHING

The plan states: *"Execute when the owner is ready to make beta the real
site."* This is the actual SEO cutover — lifting `noindex`, changing the
canonical to the final serving origin, regenerating `sitemap.xml`/
`robots.txt`, and setting up 301s from WordPress. It is **not a reversible
code tweak** — once Google crawls an indexable `beta.vac811.hu`, that's live
in search regardless of readiness.

**Do not implement 3.1/3.3 just because someone asks to "finish Phase 3."**
Confirm explicitly that the owner wants beta live as the public site *now*,
and confirm the final domain, before touching `index.html`'s `noindex`/
canonical, `public/sitemap.xml`, or `public/robots.txt`.

---

## Phase 4 — Content fast-path via edge storage ✅ (code) / ⏳ (dashboard)

**Goal:** decouple content edits (CMS, ECSET sync, curate, Instagram sync)
from full-app redeploys. Previously every content commit triggered a full
`npm ci` + Vite build + Pages deploy.

**Implemented (diverges from the original plan in one way — see below):**
a `functions/content/[file].js` Pages Function reads from a Workers KV
namespace (`CONTENT`) and returns it; on a KV miss it calls `context.next()`
to serve the committed static file in `dist/content/`. `useContent`
(`src/hooks/useContent.ts`) needed **zero changes** — it already fetches
`/content/<file>`, which is now KV-backed transparently. Full design and
runbook: **`docs/content-kv-fast-path.md`**.

**Divergence from the plan:** instead of having each content writer (Sveltia
commit hook, `google-git-proxy`, the sync scripts) write to KV directly, a
single new workflow — `.github/workflows/sync-content-kv.yml` — re-validates
content with the existing zod gate (`npm run validate:content`) and pushes it
to KV on every push to `main` touching `public/content/**`. Every writer
already funnels through a git commit, so one workflow covers all of them
uniformly (Sveltia in particular is client→GitHub only and has no path to
write KV directly without its own webhook). Git remains authoritative; the
static files stay the automatic fallback.

**Also changed, required for Functions to actually deploy:**
- Added root `wrangler.toml` (Pages project config + documented KV binding).
- `deploy.yml`'s deploy step moved from the deprecated `cloudflare/pages-action@v1`
  to `cloudflare/wrangler-action` (`wrangler pages deploy`) — the old action's
  Functions support was undocumented/unreliable; wrangler compiles `functions/`
  properly. Content-only pushes now skip this workflow (`paths-ignore:
  public/content/**`) — they take the KV path instead.
- `sync-ecset.yml`, `sync-instagram-feed.yml`, `curate-gallery.yml`: their
  post-commit dispatch (previously `deploy.yml`, or absent) now dispatches
  `sync-content-kv.yml`, since GITHUB_TOKEN pushes don't trigger other
  workflows and these bots only ever touch `public/content/**`.

**Verified locally:** `wrangler pages dev` end-to-end — seeded a KV key and
confirmed the Function serves it (with `Cache-Control: max-age=60,
stale-while-revalidate=300`); an unseeded file falls through to the real
static content unchanged. Also confirmed via a standalone unit test (13
cases: KV hit/miss/error, missing binding, unknown file, non-GET, HEAD).
`npm run lint` / `npm test` (64 tests) / `npm run validate:content` / `npm run
build` all green.

**Still open (needs the owner's Cloudflare account — I can't do these):**
1. `wrangler kv namespace create CONTENT` — create the KV namespace.
2. Bind it to the `vac811-beta` Pages project as `CONTENT` (dashboard →
   Settings → Bindings).
3. Add `CONTENT_KV_NAMESPACE_ID` as a repo secret, and confirm
   `CLOUDFLARE_API_TOKEN` has **Workers KV Storage: Edit** permission (it's
   also used for Pages deploys, which may need a different scope).

Until these are done, `env.CONTENT` is undefined in the Function and every
`/content/*` request falls straight through to static — i.e. today's
behavior, unchanged. Full steps: `docs/content-kv-fast-path.md`.

**Note:** while verifying this phase, found that `patches/react-router-dom+7.17.0.patch`
(from Phase 2) had been truncated/incomplete since the commit that introduced
it, breaking a clean `npm ci` + build. That was unrelated to Phase 4's own
logic but blocked verifying it — already fixed and merged into `main`
separately (PR #75's CI was red for the same reason; see the "Repo landmines"
section below for the root cause and the AppleDouble-cleanup habit it
motivated).

---

## Phase 5 — Security & auth consolidation ✅ (5.2 code) / ⏳ (owner dashboard)

The code-implementable core (5.2) is done and tested on this branch. 5.1 and
5.3 are almost entirely **owner-only Cloudflare dashboard/account actions** — the
code/config side of each is a review + documentation, captured below and in
`docs/google-sso-setup.md`.

- **5.2 — Google-SSO "Scope 2" ✅ (code).** Forked the third-party
  `sveltia-cms-auth` authenticator into `workers/sveltia-cms-auth/` and gated it
  behind the **same** `@vac811.hu` Google check as Curate, so one login now
  serves both the CMS and Curate — no editor needs a GitHub account.
  - **Design divergence from the doc's original sketch:** the doc imagined
    Sveltia passing a Google ID token to the worker. Sveltia's popup has no such
    hook, so the worker owns the gate: `GET /auth` serves a self-contained
    Google Sign-In interstitial (its own origin, its own CSP) → `POST
    /auth/continue` runs `verifyGoogle()` (identical checks/strings to
    `workers/google-git-proxy/index.js`) → only then the normal GitHub OAuth
    exchange + `postMessage`. All inside Sveltia's popup, so the token still
    reaches `window.opener`.
  - Unit-tested: `workers/sveltia-cms-auth/index.test.ts` (24 cases — identity
    decision, tokeninfo handling, and the router/gate) runs under `npm test`.
  - **Still open (owner Cloudflare/Google steps — I can't do these):** deploy
    the worker (`cd workers/sveltia-cms-auth && npx wrangler deploy`), set the
    `GOOGLE_CLIENT_ID` / `GITHUB_CLIENT_ID` / `GITHUB_CLIENT_SECRET` secrets, add
    the worker origin as an Authorized JavaScript origin on the Google client,
    and (if the hostname changes) point `public/admin/config.yml`
    `backend.base_url` at it. Until then the CMS keeps using the current un-gated
    upstream worker — no regression. Full steps: `docs/google-sso-setup.md`
    (Scope 2) and `workers/sveltia-cms-auth/README.md`.
- **5.1 — Cloudflare Access in front of `/admin/*` ⏳ (owner dashboard).**
  Complementary edge layer (gates *page access*; the 5.2 worker gates *token
  minting*). Setting it up is a Zero Trust dashboard action.
  - **CSP/`_headers` review (the code side): no change needed today.** Access
    authenticates via a top-level redirect (not an iframe), and the 5.2 sign-in
    page lives on the worker's own origin with its own CSP — so the site
    `public/_headers` CSP gates neither. Only an *embedded* Access challenge
    (unusual) would need `https://*.cloudflareaccess.com` in `frame-src`.
    Documented in `docs/google-sso-setup.md`.
- **5.3 — Move Workers off the personal account ⏳ (owner account action).**
  Move `google-git-proxy`, `image-cdn`, and the new `sveltia-cms-auth` off
  `dudas-adam99.workers.dev` onto an org-owned account on `*.vac811.hu`
  subdomains; then update `public/admin/config.yml` `base_url`, `VITE_PROXY_URL`,
  and tighten the `https://*.workers.dev` wildcard in `public/_headers`
  `connect-src` to the specific new hostnames. Requires Cloudflare account
  credentials an agent doesn't have. Steps: `docs/google-sso-setup.md`
  ("Moving workers off the personal Cloudflare account").

---

## Phase 6 — Longer-term edge consolidation (parked, not started)

**Explicitly not actionable yet.** The plan gates this on Phases 4 and 5
existing and having proven the Pages Functions runtime in this repo — there
is no concrete Phase 6 task list until then. Don't invent speculative work
here; the plan itself says "don't build speculatively."

Once 4/5 land: consider folding `google-git-proxy` (and `sveltia-cms-auth`)
into Pages Functions colocated with the app, and consider edge middleware for
A/B tests / feature flags / bot filtering *only* if a real need appears.

---

## Repo landmines for whoever picks this up

- **`.npmrc` has `legacy-peer-deps=true`** and **`patches/` has a
  `react-router-dom` patch applied via `postinstall`**. Both exist solely to
  make `vite-react-ssg` work with RR7 (see Phase 2 section above). Don't
  remove either without understanding why they're there — `npm ci` will
  either fail (peer conflict) or `vite-react-ssg build` will throw
  `ERR_PACKAGE_PATH_NOT_EXPORTED` (missing shim).
- **`npm run build` now runs `vite-react-ssg build`, not `vite build`.**
  Same for `dev`. If someone reverts `package.json` scripts without
  reverting `main.tsx`/`vite.config.ts`, the build breaks.
- **`/naptar`'s prerendered HTML shows stale fallback event data** (see
  Phase 2 known limitation above) — this is expected, not a regression.
- **Site is still `noindex`.** Don't remove it without an explicit go-live
  confirmation (see Phase 3.1/3.3 section).
- **This repo lives on an external drive that generates macOS AppleDouble
  sidecar files (`._*`) on nearly every file read/write**, including inside
  `node_modules/` and `patches/`. They're gitignored/untracked and harmless
  *until* one gets swept into something generated at commit time — that's
  what silently truncated `patches/react-router-dom+7.17.0.patch` (see Phase
  4 section above). Run `find . -name '._*' -not -path './.git/*' -delete`
  before committing anything under `patches/`, and double-check `git status`
  doesn't show a `._`-prefixed path before staging.
- **`workers/**/index.js` are neither linted nor type-checked.** `eslint .`
  only targets `**/*.{ts,tsx}` (see `eslint.config.js`) and `tsc -b` only
  compiles `src/` + `vite.config.ts` (see the tsconfig `include`s). So the
  Worker JS gets *no* static analysis — the `.test.ts` beside it (e.g.
  `workers/sveltia-cms-auth/index.test.ts`, discovered by the repo-wide
  `vitest run`) is the only automated guard on that logic. Add/extend a test
  when you touch a worker; don't assume lint/tsc caught anything there.
- **`patches/react-router-dom+7.17.0.patch` now has two hunks** (the
  `dist/server.mjs` shim it always had, plus the `package.json` `exports`
  entries it was missing). If `patch-package` output on `npm install` doesn't
  say `react-router-dom@7.17.0 ✔`, the build will fail — check the patch file
  is intact (should end with a `package.json` hunk) before assuming it's a new
  problem.

---

## Verification checklist (rerun after any further phase)

```bash
npm run lint
npm test
npm run validate:content
npm run build   # confirms all 10 static routes still prerender cleanly
```

Inspect `dist/<route>.html` for `data-server-rendered="true"` and
route-specific `<title>`/canonical if touching anything SSG-related.
