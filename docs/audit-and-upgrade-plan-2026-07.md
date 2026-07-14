# vac811.hu — Full Audit & Upgrade Plan

_Date: 2026-07-14 · Scope: robustness, security, speed, and the CMS / photo-curation pipeline._

> **For implementing agents:** this document is the source of truth for the upgrade work.
> Each roadmap task is self-contained (files, intended change, acceptance check). Do the
> phases in order unless a task says otherwise. Read [`CONTEXT.md`](../CONTEXT.md) first.
> Severities below are **post-verification** — every High finding was independently
> re-checked against the code by a second agent; where that check downgraded a claim, the
> lower severity is used here and the original is noted.

---

## 0. How this audit was produced

Six independent auditors each owned one dimension (security, robustness, performance,
photo-pipeline, CMS/content, SEO/a11y) and read the real code with `file:line` evidence.
Every **High**-severity finding was then handed to a separate adversarial verifier told to
*refute* it. No finding was rejected outright; several were downgraded for overstated impact.
The result was synthesized into the roadmap in §4.

### Decisions captured from the site owner (these shaped the plan)

| Question | Answer | Effect on the plan |
|---|---|---|
| Future of `/beta`? | **Keep `/beta` as staging** (WordPress stays at apex) | SEO/cutover work is **deferred** to the last phase; **`noindex` on `/beta` is a Phase-0 quick win** to stop duplicate-content indexing now. |
| Where is the pipeline "slow"? | **The approval page (Kuráció) + the public gallery load** — *not* the weekly job | Speed effort centers on an **image-delivery layer** (Phase 2), not batch concurrency. Batch-throughput fixes are kept but demoted to Phase 3. |
| Infra freedom? | **Stay on Rackhost, but new services (Cloudflare Workers/CDN, monitoring) OK** | The image layer is a **Cloudflare image-resizing/caching worker** in front of Google Drive — you already run Workers. |
| Priorities? | **All four:** security, pipeline speed, robustness, CMS UX | Sequenced: security+reliability → photo speed → backlog drain → general perf → CMS → SEO. |

---

## 1. Architecture snapshot

- **Public site:** React 19 + TypeScript + Vite 8 **SPA**, built to static files and
  **FTP-deployed to Rackhost** (`SamKirkland/FTP-Deploy-Action`) under
  **`https://vac811.hu/beta/`** (Vite `base: '/beta/'`). The **apex `vac811.hu/` still serves
  legacy WordPress** — `/beta` is effectively staging.
- **Content:** JSON files in `public/content/` (`leaders`, `camps`, `events`, `rajok`,
  `settings`, `gallery`). Pages fetch them at runtime via `useContent` with **static
  fallbacks** in `src/data/*.ts`.
- **CMS:** **Sveltia CMS** at `/beta/admin/` (GitHub OAuth via an external
  `sveltia-cms-auth` Worker), editing everything **except** gallery. A **separate custom
  "Fotókuráció" tool** at `/beta/admin/kuracio` (`src/pages/Curate.tsx`) approves gallery
  photos via Google SSO → a `google-git-proxy` Cloudflare Worker that commits `gallery.json`.
- **Photo curation pipeline:** weekly GitHub Action → Google Drive (service account) →
  per-image **dHash dedup** → **OpenAI `gpt-4o-mini` preflight** → **Claude Haiku vision
  scoring** → diversity pick → candidate rows (`approved:false`) → **human approval** in the
  Curate tool. Resumable via `gallery-pipeline-state.json`.
- **ECSET sync:** weekly-ish (randomized) scrape of `ecset.cserkesz.hu` → `camps/events/settings`.
- **Images** (public gallery + Curate thumbnails) are served **directly from the Google Drive
  CDN** (`lh3.googleusercontent.com`). **Instagram** via Behold; **fonts** via Fontshare.

### What is already done well (do **not** "fix" these)

Static content fallbacks + graceful fetch-error handling in `useContent`; the git-proxy
Worker re-verifies the Google ID token (`aud` + `email_verified` + hosted-domain) on every
request and **never exposes the GitHub credential to the browser**; Worker CORS is locked to a
fixed origin and the writable path is server-side pinned to `gallery.json`; UTF-8 base64
round-tripping for Hungarian text; the pipeline is genuinely resumable and budget-aborts
cleanly; strong a11y fundamentals (skip link, `:focus-visible`, `prefers-reduced-motion`
honored in CSS **and** JS, correct landmarks, decorative SVGs `aria-hidden`); gallery `<img>`
already uses `srcSet`/`sizes`/`loading=lazy`/`decoding=async`; hashed assets get 1-year cache.

---

## 2. Top risks (fix first)

1. **Live content bug — blank Leaders page.** `public/content/leaders.json` is `{"leaders": []}`
   and the `data ?? leadersStatic` fallback never fires (`[]` is not nullish), so
   `/beta/vezetok` and the Home leadership block **render empty right now**. `[HIGH]`
2. **Repo-write GitHub PAT pasted into the browser in production.** The Google-SSO/worker path
   is **inert in prod** (`VITE_GOOGLE_CLIENT_ID`/`VITE_PROXY_URL` never wired into the build),
   so the live Curate tool falls back to an editor pasting a `ghp_…` PAT into a web page
   (stored in `sessionStorage`, sent straight to `api.github.com`). A leak = direct write to
   `main`, which auto-deploys. `[HIGH]`
3. **Unpinned CMS supply chain.** `public/admin/index.html` loads
   `unpkg.com/@sveltia/cms/dist/sveltia-cms.js` with **no version and no SRI**, running with
   the editor's GitHub write authority. A bad/hijacked upstream publish → RCE into the repo. `[HIGH]`
4. **Nothing gates deploys but `tsc`.** The 4 tests and `eslint` never run in CI; a compiling
   logic regression ships live. `[MED]`
5. **Deploy is plaintext, non-atomic, unmonitored.** FTP (no `ftps`) → interceptable creds;
   incremental push straight into the live dir with no health check/rollback; **zero failure
   alerting** on any cron/deploy/worker — a wedged sync or half-upload can persist for weeks. `[MED]`
6. **Two writers clobber editor edits.** The weekly ECSET sync silently overwrites CMS-edited
   `camps/events/settings` fields with no warning. `[MED]`

---

## 3. Consolidated findings (deduplicated, by area)

Effort: **S** <2h · **M** ~half-day · **L** 1–3d · **XL** >3d. Severity is post-verification.

### 3.1 Security

| # | Severity | Finding | Evidence | Fix |
|---|---|---|---|---|
| S1 | **High** | Prod Curate uses browser-pasted repo-write PAT; Google/worker path is dead code | `.env.production` has only `VITE_BEHOLD_FEED_ID`; `deploy.yml` runs bare `npm run build`; `Curate.tsx:25-27` → `github` mode; `githubAuth.ts:9-12`; `galleryRepo.ts:17-22,68-76` | Wire the two `VITE_` vars + deploy worker, **and** gate the PAT UI/code behind `import.meta.env.DEV`; fail loudly if proxy env missing |
| S2 | **High** | Sveltia CMS loaded unpinned, no SRI, holds repo write | `public/admin/index.html:33`; `config.yml:1-6` | Pin exact version + `integrity` + `crossorigin`, or self-host the vendored file |
| S3 | Medium | No app-level security headers; CSP is only `upgrade-insecure-requests` | live headers; `public/.htaccess` has no `mod_headers` block; admin is a framable route (`App.tsx:139`) | Add `mod_headers`: HSTS, `X-Frame-Options: DENY`/`frame-ancestors 'none'` on admin, `Permissions-Policy`, a real CSP scoped to actual origins |
| S4 | Medium | Deploy uses plaintext FTP | `deploy.yml:30-37` has no `protocol:` (defaults to `ftp`) | Add `protocol: ftps`; rotate FTP password |
| S5 | Medium | Worker commits arbitrary caller content, open to the whole `@vac811.hu` domain | `workers/google-git-proxy/index.js:89-102` (no parse/schema/size check); `verifyGoogle` only checks domain | Validate JSON against gallery schema + size cap; restrict to an editor email allowlist; prefer a scoped GitHub App token (keep path pin) |
| S6 | Medium | ECSET scraper needs a **2FA-disabled shared account** and deliberately evades bot detection | `sync-ecset.mjs:18-28,63,287-290`; `sync-ecset.yml:4-6,26-62` | Pursue a sanctioned export/API or explicit permission; else dedicated least-privilege account with 2FA, drop the evasion framing, restrict who can trigger |
| S7 | Low | Auth workers on a personal Cloudflare account; PAT toggle always in UI | `config.yml:5` (`dudas-adam99.workers.dev`); `Curate.tsx:300-308` | Move workers to an org-owned account + custom domain; hide PAT form in prod builds |

### 3.2 Robustness & reliability

| # | Severity | Finding | Evidence | Fix |
|---|---|---|---|---|
| R1 | Medium _(orig High)_ | Tests + lint never run in CI; only `tsc` gates deploy | no `vitest`/`lint` in any workflow; `deploy.yml:24-33` | Add a `pull_request` CI job `npm ci && npm run lint && npm test && npm run build`; `deploy` `needs: test` |
| R2 | Medium _(orig High)_ | FTP deploy non-atomic, no health check/rollback; re-runs on every cron commit | `deploy.yml:29-37`; hashed bundles uploaded unordered | Post-upload `curl` smoke check; keep previous `dist` for rollback; temp-dir-then-rename if supported |
| R3 | Medium | Transient CDN/API errors during Haiku scoring **permanently discard** photos | `curate-gallery.mjs:607-611` (`seen.add` on any throw) vs preflight defaults KEEP (`292,306`) | Only mark `seen` on terminal (unparseable) errors; retry transient (network/429/5xx) next run |
| R4 | Medium | Cron commit races the browser Curate tool on `gallery.json` → rebase wedge, lost state | `curate-gallery.yml:78-90`, `sync-ecset.yml`; no `concurrency:`; Curate commits same file | Add `concurrency: {group: content-write}`; bounded pull-rebase-push retry loop |
| R5 | Medium | No error monitoring/alerting anywhere (crons, worker, live site) | no `if: failure()` steps; no error SDK in `src/` | `if: failure()` → open/ping a GitHub issue; add an uptime ping |
| R6 | Medium | ECSET scraper writes files with no post-scrape sanity check; login inferred from a cookie | `sync-ecset.mjs:87-92,111-125,162-178,318-320,61-64` | Assert invariants (member-count band, ≥N camps, non-empty events) before write; verify login by page content |
| R7 | Medium | Money-spending / data-mutating code has ~no tests | only 4 shallow suites; `curate-gallery.mjs`, `sync-ecset.mjs`, `galleryRepo.ts`, worker untested | Add tests for ECSET transforms (empty/drift preserve edits), `commitDecisions` merge + 409 retry, curate seen/budget loop |
| R8 | Low | State/gallery written non-atomically and committed on failure (`if: always()`) | `curate-gallery.mjs:395,416`; `curate-gallery.yml:74`; loaders reset on malformed | Temp-file + rename; validate JSON parses before `git add` |

### 3.3 Performance (public site)

| # | Severity | Finding | Evidence | Fix |
|---|---|---|---|---|
| P1 | Medium _(orig High)_ | No SSR/prerender — first paint (and per-route SEO) gated on the JS bundle | empty shell `index.html:61-63`; `main.tsx:11`; `App.tsx:59-76` | Build-time prerender/SSG for static routes (Phase 6) |
| P2 | Medium _(orig High)_ | **552 KB** decorative backdrop loaded on every route at opacity 0.1 | `src/assets/csapat_gomba.webp` 551,810 B; `BackgroundField.tsx:2,14`; `App.tsx:81` | Recompress to <60 KB (or optimized SVG); lazy-load; drop `background-attachment:fixed` |
| P3 | Medium | **Gallery images depend on the Google Drive CDN**; same `sizes` for every tile; no preconnect; no AVIF | `Gallery.tsx:17-19,123,127-129`; no `lh3` preconnect | **Image-delivery layer (Phase 2)** + per-tile `sizes` + preconnect |
| P4 | Medium | No route-level code splitting; admin Curate tool ships to every visitor | `App.tsx:7-19` eager-imports all pages incl. `Curate` | `React.lazy` + `Suspense`, at least isolating `CurateLayout` |
| P5 | Medium | `background-attachment:fixed` + runtime `invert()` filter → mobile scroll jank | `BackgroundField.css:4-24` | Drop fixed attachment on mobile; ship a pre-inverted dark asset |
| P6 | Medium | Render-blocking third-party Fontshare stylesheet | `index.html:53` | Self-host woff2 with `font-display:swap` + preload above-the-fold weights |
| P7 | Medium | LCP hero title animates from `opacity:0` → delays measured LCP | `Home.tsx:126`; `global.css:264-266` | Render title at full opacity; animate a wrapper/transform instead |
| P8 | Low | Content JSON fetched as a post-hydration waterfall; `leaders.json` empty = pure overhead | `Home.tsx:102-105`; `useContent.ts:27` | Preload/inline critical JSON; consider one combined content file |
| P9 | Low | Assets served gzip-only (no brotli) | live headers; no compression plugin | Emit precompressed `.br` (`vite-plugin-compression`) + `.htaccess` `AddEncoding` |

### 3.4 Photo-curation pipeline

**Note on "slow":** the owner's felt slowness is the **approval page and public gallery load**
(interactive image delivery — see P3 and C9 → **Phase 2**), *not* the weekly batch job. The
batch-throughput items below are cheap and worth doing, but land in **Phase 3**.

| # | Severity | Finding | Evidence | Fix |
|---|---|---|---|---|
| PL1 | Medium _(orig High)_ | Per-run budget caps × weekly cron → a big camp folder drains over many weeks | `curate-gallery.mjs:104-105,582-586,638-641`; cron `curate-gallery.yml:36`; 1094 seen / 8 runs | Raise repo vars `GALLERY_HAIKU_BUDGET`/`GALLERY_PREFLIGHT_BUDGET` (~600); daily/seasonal cron |
| PL2 | Medium _(orig High)_ | dHash fetches every fresh image before any budget check; unscored reps re-fetched/re-hashed every run | `curate-gallery.mjs:195-219,542-545,625-627`; reps not added to `seen` | Persist **every** phash by id in state; look up before fetching; skip dHash once `budgetHit` |
| PL3 | Medium | Years/events run strictly sequentially; concurrency=6 only inside one event | `curate-gallery.mjs:505,536,542,557` | Flatten to one `mapPool` over all reps (carry event/threshold/cap), diversity-pick per event after |
| PL4 | Medium | Every scored image is fetched **3×** from the throttling Drive CDN (ours + OpenAI + Claude) | `curate-gallery.mjs:197,266-268,349` | Combine with PL2 caching; use Drive `thumbnailLink`/smaller dHash width |
| PL5 | Medium | Preflight KEEPs are discarded and re-charged next run (budget 200 > 120) | `curate-gallery.mjs:572-577` | Set `PREFLIGHT_BUDGET == HAIKU_BUDGET` (one-line) or persist KEEP decisions |
| PL6 | Low | `cache_control` on the Haiku system prompt is a **no-op** (prompt < 4096-token cache min) | `curate-gallery.mjs:338-343,137-151` | Remove the marker / correct the assumption — no cost benefit exists |
| PL7 | Low | `gallery.json` + full state rewritten after every event (I/O amplification) | `curate-gallery.mjs:631,636,386-417` | Persist once per year / on budget-hit / at end |
| PL8 | Low | Startup OpenAI probe adds a serial round-trip every run | `curate-gallery.mjs:437-452` | Make best-effort (warn, don't exit) |
| PL9 | Low | Each Curate "Save" = 3 chained proxy round-trips (each re-verifies token) | `Curate.tsx:194-196`; `galleryRepo.ts:120` | Return `updated` items from commit so no re-fetch (3→2) |

### 3.5 CMS & content architecture

| # | Severity | Finding | Evidence | Fix |
|---|---|---|---|---|
| C1 | **High** | `leaders.json` empty → Leaders page & Home block blank (fallback never fires) | `public/content/leaders.json`; `useContent.ts:33`; `Leaders.tsx:8`; `Home.tsx:104,109` | Repopulate JSON from `leadersStatic`; change fallback to `data && data.length ? data : static` |
| C2 | Medium _(orig High)_ | Browser-PAT login always available; silent fallback funnels editors into token paste | `Curate.tsx:277-309,25-27` | (Same as S1) DEV-gate PAT; fail loudly on missing proxy env |
| C3 | Medium _(orig High)_ | ECSET sync silently overwrites CMS-edited `camps/events/settings` fields | `config.yml:41-140`; `sync-ecset.mjs:183-202,229-243,252-262` | Per-field ownership: hide/readonly sync fields in CMS **or** switch sync to `prev ?? scraped` |
| C4 | Medium | Two editing tools, two auth models; Sveltia editors still need GitHub write | `config.yml:1-6`; `docs/google-sso-setup.md:5-19` | Finish "Scope 2": Google gate for Sveltia; fold gallery approval into one tool |
| C5 | Medium | No schema validation despite `zod` installed | `package.json:22` (unused); `useContent.ts:27-36` | Zod schemas mirroring TS interfaces; validate at runtime (fallback) + in CI |
| C6 | Medium | No preview; every edit = full rebuild + FTP redeploy | `config.yml` (no `preview`/workflow); `deploy.yml:2-6` | Enable editorial workflow/preview; content-only deploy path |
| C7 | Medium | Split media story: uploads committed to repo vs gallery served only from Drive | `config.yml:10-11`; `Gallery.tsx:17-19` | Pick one model; mirror approved images or add `onerror` fallback |
| C8 | Low | `huDate` double-period fix never repairs committed data (`prev ?? …`) | `sync-ecset.mjs:224-227,239`; `events.json` still `…30..` | One-time regenerate `dateDisplay`; recompute if sync-owned |
| C9 | Low | Pervasive "Decap CMS" naming though deployed CMS is Sveltia | `config.yml:9,13`; `useContent.ts:13`; `src/data/*.ts` | Repo-wide rename; fix local-dev instructions |
| C10 | Low | `GalleryItem` type omits pipeline-written fields (`activity/bucket/reason`) | `Gallery.tsx:6-15` vs `gallery.json` | One shared schema/type used by app **and** pipeline |

### 3.6 SEO & accessibility

| # | Severity | Finding | Evidence | Fix |
|---|---|---|---|---|
| E1 | Medium _(orig High)_ | No SSR → every deep link serves the homepage shell; non-JS crawlers see 11 identical pages | `index.html:8-20`; `.htaccess:15`; `App.tsx:59-76` | Prerender/SSG (Phase 6) |
| E2 | Medium _(orig High)_ | Canonical vs sitemap vs deploy URL disagree three ways | `index.html:12,16` (apex); `App.tsx:63` (`/beta`); `sitemap.xml:5-15` (root) | **`noindex` beta now**; reconcile at cutover; make static canonical match serving origin |
| E3 | Medium | No `og:image`; `twitter:card=summary` → bland social previews | `index.html:14-25` | Add 1200×630 share image; `summary_large_image` |
| E4 | Low | Dark-mode users see a light-theme flash on every load | `index.html:2`; `Navbar.tsx:27-39` | No-flash inline `<head>` theme script |
| E5 | Low | Gallery images triple-labeled (figure aria-label + img alt + figcaption) | `Gallery.tsx:121-135` | Keep visible `figcaption`; `alt=""` + drop figure aria-label |
| E6 | Low | Structured data only `Organization`; no `Event` markup | `index.html:28-49`; `events.json` | Emit `Event` JSON-LD (ideally at prerender) |

---

## 4. Roadmap (phased, agent-executable)

Phases are ordered by the owner's priorities. **Phase 2 (photo experience speed) can run in
parallel with Phase 1** — it's mostly Cloudflare-worker + frontend work with no dependency on
the security tasks. Each task lists **files → change → acceptance**.

---

### Phase 0 — Quick wins (ship immediately)

Fix the live bug and land the cheapest security/reliability/perf/SEO wins. No design or infra changes.

- **0.1 Fix empty-leaders bug `[S]` `[C1]`** — Repopulate `public/content/leaders.json` from the
  13 entries in `src/data/leaders.ts` (`leadersStatic`). Change `src/pages/Leaders.tsx:8`
  `data ?? leadersStatic` → `data && data.length ? data : leadersStatic`; apply the same
  length-aware guard in `src/pages/Home.tsx` (~104/109). **Root cause:** `useContent.ts:33`
  returns `json[key]` = `[]`, which is not nullish so `??` never falls back.
  **Accept:** `/beta/vezetok` and Home show leader cards; add a test asserting Leaders renders
  >0 cards when content is empty.
- **0.2 Switch FTP → FTPS `[S]` `[S4]`** — In `deploy.yml`, add `protocol: ftps` (and `port: 21`)
  to the `FTP-Deploy-Action` step. Rotate the Rackhost password afterward; confirm Rackhost
  enforces FTPS. **Accept:** step uses `ftps`; a test deploy succeeds.
- **0.3 Pin + SRI the Sveltia script `[S]` `[S2]`** — In `public/admin/index.html:33`, pin to an
  exact `@sveltia/cms@X.Y.Z`, add `integrity="sha384-…"` + `crossorigin="anonymous"` (or
  self-host the file under `public/admin/`). **Accept:** admin still loads and authenticates.
- **0.4 Baseline security headers `[M]` `[S3]`** — Add an `<IfModule mod_headers.c>` block to
  `public/.htaccess`: HSTS (once HTTPS-only confirmed), `X-Frame-Options: DENY` +
  `frame-ancestors 'none'` on admin, `Permissions-Policy`, and a real CSP scoped to
  `self, accounts.google.com, api.github.com, lh3.googleusercontent.com, api.fontshare.com`,
  the worker origin (and `unpkg` only if not self-hosting the CMS). **Accept:** `curl -I`
  shows the headers; SPA, admin, gallery, fonts, and worker calls still work under the CSP.
- **0.5 Workflow failure alerting `[S]` `[R5]`** — Add an `if: failure()` final step to
  `deploy`, `curate-gallery`, `sync-ecset`, `update-context` that opens/pings a tracking
  GitHub issue. **Accept:** a forced failure creates/updates an issue.
- **0.6 `noindex` the `/beta` build `[S]` `[E2]`** — Since `/beta` stays staging, add
  `<meta name="robots" content="noindex">` to the beta build (or a build-time flag) and do
  **not** submit `sitemap.xml`. Make `index.html`'s static canonical match where pages are
  actually served rather than the WordPress apex. **Accept:** `/beta/` HTML carries `noindex`;
  canonical no longer points visitors' pre-JS render at the WP homepage.
- **0.7 No-flash theme script `[S]` `[E4]`** — Add a tiny synchronous inline `<script>` at the
  top of `<head>` in `index.html` reading `localStorage('theme')`/`matchMedia` and setting
  `document.documentElement.dataset.theme` before the app loads. **Accept:** dark users reload
  with no light flash.
- **0.8 Recompress the backdrop `[S]` `[P2]`** — Recompress `src/assets/csapat_gomba.webp`
  (551 KB monochrome line art) to <60 KB, drop `background-attachment:fixed` on mobile in
  `BackgroundField.css`, ship a pre-inverted dark asset instead of the runtime `invert()`.
  **Accept:** asset <60 KB; visually unchanged; smooth mobile scroll.

---

### Phase 1 — Security & reliability foundation

Close the credential-in-browser gap, gate deploys on tests, make repeated deploys safe.

- **1.1 Eliminate the browser-PAT auth path in production `[M]` `[S1/C2]`** — Two parts:
  (a) deploy the `google-git-proxy` worker and set `VITE_GOOGLE_CLIENT_ID` + `VITE_PROXY_URL`
  in `.env.production` (or as build env in `deploy.yml`) so the Google→worker path is actually
  used; (b) gate the PAT form and all PAT code (`githubAuth.ts`, the direct-`api.github.com`
  paths in `galleryRepo.ts`) behind `import.meta.env.DEV`, and make `detectMode` show a visible
  error rather than silently fall back when proxy env is missing.
  **Accept:** a prod build of `/beta/admin/kuracio` shows **only** Google sign-in; grep confirms
  PAT UI/code is `DEV`-guarded; commits still succeed via the worker.
- **1.2 Run tests + lint in CI, gate deploy `[S]` `[R1]`** — Add a `pull_request` workflow (or a
  `test` job in `deploy.yml`) running `npm ci && npm run lint && npm test && npm run build`;
  add `needs: test` to `deploy`. **Accept:** a PR that breaks a test/lint fails CI; deploy is blocked.
- **1.3 Harden the FTP deploy `[L]` `[R2]`** _(depends on 1.2)_ — Add a post-upload `curl` smoke
  check on `https://vac811.hu/beta/` (assert 200 + the referenced main JS resolves 200); keep
  the previous `dist` for one-command rollback; prefer temp-dir-then-rename if Rackhost FTP
  supports it. **Accept:** a simulated broken build fails the health check and alerts; rollback
  restores the prior version.
- **1.4 Concurrency guard + retry on content crons `[M]` `[R4]`** — Add
  `concurrency: { group: content-write, cancel-in-progress: false }` to `curate-gallery.yml` and
  `sync-ecset.yml`; replace `git pull --rebase && git push` with a bounded retry loop.
  **Accept:** a forced concurrent edit no longer fails the cron push.
- **1.5 Validate content JSON (runtime + CI) `[M]` `[C5/C10]`** — Define `zod` schemas mirroring
  `src/data/*.ts` (include pipeline fields `activity/bucket/reason` in `GalleryItem`). Validate
  in `useContent` (fall back to static on failure); add a CI step validating every
  `public/content/*.json`. **Accept:** a malformed-but-parseable file fails CI and triggers the
  runtime static fallback.
- **1.6 Harden ECSET sanity + login checks `[M]` `[R6]`** — In `sync-ecset.mjs`, before writing,
  assert invariants (member count within a sane band vs previous, ≥N camps, non-empty events
  when ICS was 200) and abort+alert on violation; verify login by post-login page content, not
  just a `sessionid` cookie. **Accept:** a maintenance/error page or column-shift aborts without
  committing; a normal scrape still writes.
- **1.7 Harden the git-proxy worker `[M]` `[S5]`** — In `workers/google-git-proxy/index.js`,
  `JSON.parse` + schema-validate + size-limit the committed content before the PUT; restrict to
  an env-configured editor email allowlist instead of the whole domain; keep the `gallery.json`
  path pin; prefer a scoped GitHub App token. **Accept:** malformed/oversized content and
  non-allowlisted callers are rejected; valid approvals still commit.

---

### Phase 2 — Photo **experience** speed (the owner's stated pain)

Goal: make the **approval page and the public gallery** load fast and reliably. The images come
straight from the Google Drive CDN today (`lh3.googleusercontent.com`), which is slow and
throttle-prone. Introduce a controlled image-delivery layer (Cloudflare — already in use).

- **2.1 Image-delivery worker in front of Google Drive `[L]` `[P3/C7]`** — **Headline task.** Stand
  up a Cloudflare Worker (or Cloudflare Images / a cached fetch proxy) at e.g.
  `img.vac811.hu/<driveId>?w=<width>` that fetches the Drive original once, caches it at the
  edge (long TTL, keyed by id+width), and serves **AVIF/WebP** at requested widths. Point both
  the public gallery (`Gallery.tsx` `driveImgUrl`) and the Curate thumbnails
  (`galleryRepo.ts cdnUrl`, `Curate.tsx`) at it. This removes the Drive-throttle dependency and
  is the single biggest win for the felt slowness. **Accept:** gallery + Curate images load from
  `img.vac811.hu` with edge cache HITs, AVIF where supported; repeated loads are near-instant;
  a Drive throttle no longer degrades the site.
- **2.2 Per-tile `sizes` + preconnect + a11y labels `[M]` `[P3/E5]`** — In `Gallery.tsx:127-129`
  set `sizes` reflecting each tile's real rendered width (small/medium/large differ); add a
  `preconnect` to the image host in `index.html`. Fix triple labeling (`Gallery.tsx:121-135`):
  keep the visible `figcaption` as the accessible name, set `img alt=""`, drop the figure
  `aria-label`. **Accept:** small tiles request small widths (network tab); screen reader
  announces each caption once.
- **2.3 Speed up the Curate approval tool `[S]` `[PL9/R8]`** — Have `commitDecisionsViaProxy`
  return the already-computed `updated` items (`galleryRepo.ts:122-126`) so `handleSave`
  (`Curate.tsx:194-196`) sets state from that instead of a third proxy round-trip (3→2). Load
  Curate thumbnails through the 2.1 image worker at small widths. Make `saveState`/`saveGallery`
  writes atomic (temp-file + rename). **Accept:** a save does 2 proxy calls not 3; thumbnails
  load fast; state writes are atomic.
- **2.4 (Optional) Own the published images `[L]` `[C7]`** — At approval time, mirror the approved
  image into the repo/image store so the public site no longer hard-depends on a Drive file
  staying present and shared. **Accept:** removing/re-permissioning a Drive file no longer 404s
  the live gallery.

---

### Phase 3 — Curation backlog drain (batch job)

Not the felt slowness, but cheap and worth it — new photos surface as candidates in days, not weeks.

- **3.1 Raise budgets + increase cadence `[S]` `[PL1]`** — Set repo variables
  `GALLERY_HAIKU_BUDGET` and `GALLERY_PREFLIGHT_BUDGET` to ~600 (Haiku ≈ $0.0008/image → ~$0.50
  worst case). Change `curate-gallery.yml` cron to daily (or a summer-daily schedule). Pure
  config. **Accept:** a `workflow_dispatch` run scores several hundred images; backlog drains
  over a few daily runs.
- **3.2 `PREFLIGHT_BUDGET == HAIKU_BUDGET` `[S]` `[PL5]`** _(depends on 3.1)_ — So preflight never
  charges OpenAI for images that can't be scored this run. Optionally persist per-id KEEP
  decisions. **Accept:** across two runs, no image is preflighted twice.
- **3.3 Cache dHash by id across runs `[M]` `[PL2/PL4]`** — Persist **every** computed phash keyed
  by id in `gallery-pipeline-state.json`; in `computeDHash` look up `stateHashes[id]` and skip
  the CDN fetch if present; short-circuit the dHash pass once `budgetHit`. **Accept:** a second
  run does zero dHash CDN fetches for already-hashed ids; dedup results unchanged.
- **3.4 Don't discard photos on transient errors `[S]` `[R3]`** — In the Haiku catch block
  (`curate-gallery.mjs:607-611`), only `seen.add` on terminal (unparseable) errors; retry
  transient (network/429/5xx) next run. **Accept:** a simulated transient error leaves the image
  out of `seen`; an unparseable response still marks it seen.
- **3.5 Flatten concurrency across events/years `[M]` `[PL3]`** _(depends on 3.3)_ — Collect all
  representatives into one flat list (carry event/threshold/cap), run a single `mapPool`, then
  diversity-pick per event. Keep concurrency 8–10 (CDN throttle). **Accept:** wall-clock drops
  for multi-event backlogs; selection output unchanged on the same input.
- **3.6 Housekeeping `[S]` `[PL6/PL7/PL8]`** — Remove the no-op `cache_control` marker (or the
  false "cheap due to caching" assumption); persist state once per year/on budget-hit/at end
  instead of per event; make the startup OpenAI probe best-effort. **Accept:** fewer writes per
  run; run still fails safe on a bad key.

---

### Phase 4 — General public-site performance

- **4.1 Route-level code splitting `[M]` `[P4]`** — `React.lazy` + `Suspense`, at minimum
  isolating `CurateLayout` + auth libs into their own chunk; ideally lazy-load all non-Home
  routes. **Accept:** admin code is a separate chunk not loaded on Home; homepage bundle shrinks.
- **4.2 Self-host fonts / de-block Fontshare `[M]` `[P6]`** — Self-host the two families as woff2
  with `font-display:swap`; preload above-the-fold weights; or load the Fontshare CSS
  non-render-blocking. **Accept:** no render-blocking third-party stylesheet; fonts swap in.
- **4.3 LCP hero not gated on fade `[S]` `[P7]`** — Render `hero__title` at full opacity; animate
  a wrapper/transform instead. **Accept:** title painted at full opacity on load.
- **4.4 Preload/inline critical content JSON `[S]` `[P8]`** — Preload (or inline) `settings.json`;
  consider one combined content file. **Accept:** hero stats don't visibly pop in late.
- **4.5 Precompressed brotli `[S]` `[P9]`** — `vite-plugin-compression` emits `.br`/`.gz`; add
  `.htaccess` `AddEncoding` if Rackhost honors it. **Accept:** `.br` in `dist`; `Accept-Encoding:
  br` returns `content-encoding: br` (if supported).

---

### Phase 5 — CMS unification & content ownership

- **5.1 Per-field ownership: ECSET vs CMS `[M]` `[C3]`** — Make sync-owned fields read-only/hidden
  in `config.yml` (or move them out of the CMS); switch the sync to `prev ?? scraped` for any
  editor-touchable field; document which fields the robot controls. **Accept:** an editor change
  to an editor-owned field survives a subsequent sync.
- **5.2 Regenerate stale `dateDisplay` `[S]` `[C8]`** _(depends on 5.1)_ — One-time regenerate
  `dateDisplay` for sync-owned events (fixes `…30..`); recompute if sync-owned. **Accept:**
  `events.json` has no double-period dates and stays clean after a sync.
- **5.3 Unify auth + fold gallery into one tool `[L]` `[C4]`** _(depends on 1.1)_ — Put a Google
  `@vac811.hu` gate in front of the Sveltia auth worker (git-gateway style) so there is one
  identity model; fold gallery approval into the CMS as an approve-style collection. **Accept:**
  editors authenticate once with `@vac811.hu` and edit both content and gallery without a GitHub
  account.
- **5.4 Move workers to an org-owned Cloudflare account `[M]` `[S7]`** — Migrate both workers off
  the personal `dudas-adam99.workers.dev` to an org account + custom domain; update
  `config.yml base_url` + `VITE_PROXY_URL`; document ownership/rotation. **Accept:** workers run
  under org ownership; auth still works.
- **5.5 Editorial workflow / preview + content-only deploy `[L]` `[C6]`** — Enable Sveltia's
  draft→review→publish; explore a content-only deploy path (content is fetched at runtime, so a
  JSON change need not rebuild the whole app). **Accept:** editors can preview before publish;
  a content edit publishes faster than a full rebuild.
- **5.6 Rename Decap → Sveltia `[S]` `[C9]`** — Repo-wide rename in comments/`config.yml`; fix
  local-dev instructions to Sveltia's workflow. **Accept:** `grep -i decap` returns nothing.

---

### Phase 6 — SEO & future `/beta`→apex cutover (deferred)

Do this only when the owner decides to retire the WordPress apex. Until then, `noindex` (0.6)
holds.

- **6.1 Build-time prerender/SSG for static routes `[L]` `[P1/E1]`** — e.g. `vite-react-ssg` or a
  puppeteer prerender step, so each route ships real HTML with its own metadata; keep SPA
  hydration. **Accept:** `curl` (no JS) of `/naptar`, `/taborok`, `/vezetok` returns
  route-specific `<title>`/description/canonical.
- **6.2 Reconcile canonical/sitemap/deploy URLs at cutover `[S]` `[E2]`** — Set Vite `base:'/'`;
  regenerate sitemap/canonicals to one origin; remove `noindex`; 301 old WordPress URLs; submit
  the sitemap in Search Console. **Accept:** all three URL sources agree; Search Console accepts
  the sitemap.
- **6.3 `og:image` + per-page + `Event` structured data `[M]` `[E3/E6]`** _(depends on 6.1)_ — Add
  a 1200×630 share image and `summary_large_image`; per-page images for `/galeria` and
  `/taborok`; emit `Event` JSON-LD from `events.json` (ideally at prerender). **Accept:** rich
  social cards; a rich-results test recognizes `Event` on `/naptar`.
- **6.4 Sanctioned ECSET data path `[L]` `[S6]`** — Pursue an official export/API or explicit
  permission; else a dedicated 2FA-enabled least-privilege account, drop the evasion framing,
  rotate the password, restrict who can trigger the workflow. **Accept:** sync uses a sanctioned
  path or a compliant account; evasion framing removed.

---

## 5. Suggested execution order & effort

| Phase | Theme | Rough effort | Owner priority |
|---|---|---|---|
| 0 | Quick wins (incl. live leaders bug) | ~1 day total | Ship now |
| 1 | Security & reliability foundation | ~1 week | #1 |
| 2 | Photo experience speed (image layer) | ~3–5 days | #2 (felt pain) |
| 3 | Curation backlog drain | ~1–2 days | #2 (cheap) |
| 4 | General public-site perf | ~2–3 days | supporting |
| 5 | CMS unification | ~1–2 weeks | #4 |
| 6 | SEO & cutover | when apex retires | deferred |

Phases 1 and 2 can proceed in parallel (different surfaces).

## 6. Open questions / assumptions for implementers

- **Rackhost `mod_headers`/`AddEncoding` support** — confirm the shared plan allows them
  (0.4, 4.5); if not, set headers at the RHProxy layer or via a Cloudflare proxy.
- **Google Workspace domain** — the `hd` claim gate assumes `vac811.hu` is Workspace
  (see `docs/google-sso-setup.md`); confirm before relying on it in 1.7/5.3.
- **Editor allowlist** — 1.7 needs the list of `@vac811.hu` addresses allowed to commit.
- **Image host** — 2.1 assumes a new subdomain (`img.vac811.hu`) can be pointed at a Cloudflare
  Worker; alternatively use Cloudflare Images.
- This plan intentionally contains **no code changes** — it is the brief. Implement per phase,
  keep each phase on its own branch/PR, and run `npm run lint && npm test && npm run build`
  before every deploy once 1.2 lands.
