# `/galeria` Redesign — Phase 0 Audit

Read-only research pass across five workstreams (Drive curation pipeline, current `/galeria` page, existing Instagram integration, design tokens, CMS config & prior planning docs), consolidated here as the Phase 0 deliverable for the "unify Drive-curated photos with an Instagram layer" plan. All facts below are cited to exact `file:line` and are taken verbatim from the underlying research reports — no assumptions have been added.

---

## Drive curation pipeline

**Output JSON file paths** — declared in `scripts/curate-gallery.mjs:65-66`:
- `GALLERY_PATH` → `public/content/gallery.json` — the curated candidate/approved photo list.
- `STATE_PATH` → `public/content/gallery-pipeline-state.json` — the resumability/dedup state.

Both are written atomically (`writeFileAtomic`, `curate-gallery.mjs:389-393`, temp-file + `renameSync`) by `saveGallery()` (`curate-gallery.mjs:407-426`) and `saveState()` (`curate-gallery.mjs:395-405`). Both no-op under `GALLERY_DRY_RUN=true` (lines 396, 408).

**Exact JSON shape.**

`public/content/gallery.json` — top-level `{ "gallery": [ ...items ] }` (confirmed live: 116 items). Per-item fields (per header comment `curate-gallery.mjs:41-51`, confirmed against the live file):

| field | type | notes |
|---|---|---|
| `id` | string | Google Drive file ID; CDN URL built as `https://lh3.googleusercontent.com/d/{id}=w{width}` (`cdnUrl`, line 196-198) |
| `name` | string | AI-generated Hungarian caption (`ScoreSchema.caption`), editable in CMS |
| `year` | string | year folder name |
| `event` | string | event folder name (first-level folder under the year) |
| `activity` | string | free-form Hungarian label from Claude (`ScoreSchema.activity`) |
| `bucket` | string | normalized activity bucket from `bucketActivity()` (`curate-lib.mjs:117-123`), used only for diversity picking |
| `score` | number | 0–100 from Claude |
| `phash` | string (optional) | 16-hex-char dHash; present on 115/116 live items |
| `reason` | string | templated `"Pontszám {score}. Tevékenység: {activity}."` (line 651) |
| `status` | `'pending' \| 'approved' \| 'rejected'` | live counts: 61 pending / 46 approved / 9 rejected |
| `approved` | boolean | derived/kept in sync with `status` (`approved = status === 'approved'`) in `saveGallery()`'s normalization step, lines 410-416 |
| `primary` (optional) | boolean | present on 78/116 live items (events tagged primary by a run) |
| `cap` (optional) | number | per-event cap in effect when the item was kept — same 78/116 items |

There is **no per-item "person" field**. Grouping is flat (one array); "event/year grouping" exists only implicitly via the `year`/`event` string fields plus the sort order in `saveGallery()` (lines 417-423): sort by `year` desc, then status order (approved→pending→rejected), then `score` desc.

`public/content/gallery-pipeline-state.json` — top-level object (confirmed live):
```
{ seenIds: string[], lastRun: string|null (ISO date), runCount: number, hashes: { [driveFileId: string]: string (16-hex dHash) } }
```
Live: `seenIds.length = 4162`, `runCount = 18`, `hashes` has 4588 entries. Shape/defaults defined in `loadState()` (`curate-gallery.mjs:371-384`), written by `saveState()` (`curate-gallery.mjs:395-405`).

**Drive folder structure → field mapping.** `collectImages()` (`curate-gallery.mjs:319-332`) recurses with `MAX_RECURSION_DEPTH = 2` (line 115, commented `// year → event → (person)`):
- Depth 0 (direct children of year folder): a sub-folder becomes the **event** (`nextEvent = eventName ?? entry.name`, line 325, since `eventName` is null at this depth). An image directly under the year folder (no event folder) is tagged `event: 'Egyéb'` (line 329).
- Depth 1 (children of the event folder): images inherit the event name fixed at depth 0. A sub-folder here (optional **person** folder) is recursed at depth 2, but the person folder's name is **never captured** — it's purely an organizational convenience in Drive, discarded on write.
- Depth 2 (children of a person folder): images still tagged with the depth-0 event name. Folders found here are not descended further (depth 2 is not `< MAX_RECURSION_DEPTH(2)`).

Net effect: `year` and `event` map directly to Drive folder names; an optional person-named folder is walked but its name has **no representation in the output schema**.

**Scoring/curation logic** — phases in `main()` (`curate-gallery.mjs:428-712`): (1) Collect — walk year folders, skip anything already in the `seen` set (union of prior `seenIds` + IDs already in `gallery.json`, lines 476-484). (2) Classify primary vs. minor per event (`detectPrimaryEvent` lines 237-245, `isPrimary` lines 229-233) — keyword match or single-largest-event-≥2x-runner-up heuristic; primary events get a higher cap and lower score bar. (3) Dedup via 64-bit dHash (`computeDHash`, lines 200-226) clustered within `GALLERY_DEDUP_DISTANCE` (`clusterByHash`/`dedupImages`, `curate-lib.mjs:35-90`) — only one representative per cluster proceeds. (4) Optional OpenAI preflight KEEP/SKIP vision pre-filter (`quickScoreImage`, lines 261-316), paced serially (`paceOpenaiCall`, lines 253-258), defaults to KEEP on error. (5) Claude Haiku scoring (`scoreImage`, lines 334-357) returns structured `{score, caption, activity, suitableForPublicYouthSite}` (`ScoreSchema`, lines 136-141) via Hungarian system prompt (lines 144-158); items failing suitability or below threshold are dropped; transient errors leave the image unmarked for retry, unparseable responses mark it seen forever (lines 655-670). (6) Per-event diversity pick (`diversePick`, `curate-lib.mjs:130-151`) round-robins across `bucket` values up to the event's cap. (7) Budget caps allow partial-progress runs to exit 0; state/hash caching avoids re-charging for already-decided images.

Env vars referenced in `scripts/curate-gallery.mjs` (grep-verified; `curate-lib.mjs` has none — pure functions): `GOOGLE_SERVICE_ACCOUNT_KEY`, `GOOGLE_DRIVE_FOLDER_ID`, `ANTHROPIC_API_KEY`, `OPENAI_API_KEY`, `GALLERY_DRY_RUN` (69), `GALLERY_MODEL` (98), `GALLERY_MAX_PRIMARY_EVENT` (99), `GALLERY_MAX_PER_EVENT` (100), `GALLERY_SCORE_THRESHOLD` (101), `GALLERY_MINOR_THRESHOLD` (102), `GALLERY_PRIMARY_KEYWORDS` (103), `GALLERY_PREFLIGHT_MODEL` (107), `GALLERY_PREFLIGHT_BUDGET` (110), `GALLERY_HAIKU_BUDGET` (111), `GALLERY_PREFLIGHT_INTERVAL_MS` (112), `GALLERY_CONCURRENCY` (113), `GALLERY_DEDUP_DISTANCE` (114), `GALLERY_YEARS` (437-438). 18 vars total — matches CONTEXT.md's table except CONTEXT.md also lists a bare `DRY_RUN` which this script does not reference (likely from a different script).

**Workflow** — `.github/workflows/curate-gallery.yml`: triggers are `workflow_dispatch` (inputs `years`, `max_primary` default `12`, `max_minor` default `1`, `preflight` default `true`, `score_threshold` default `50`, `minor_threshold` default `80`, `dry_run` default `false`, lines 3-37) plus `schedule: cron '0 6 * * *'` (daily 06:00 UTC). Concurrency group `content-write`, `cancel-in-progress: false` (lines 39-41). Run step (60-76) executes `node scripts/curate-gallery.mjs` with secrets/inputs as env. Commit step (78-98, `if: always() && github.event.inputs.dry_run != 'true'`) `git add`s `gallery.json` and `gallery-pipeline-state.json`, commits only on non-empty diff (`chore: curate gallery candidates from Google Drive`), retries push up to 5x with backoff. Failure-alert step (100-113, `if: failure()`) opens/comments on a `workflow-failure`-labeled GitHub issue.

---

## Current galeria page

**Route**: `path="/galeria"` — `src/App.tsx:103`, nested inside `<Route path="/*" element={<AppLayout />} />` (`src/App.tsx:149`), child of the top-level `<BrowserRouter>` (`src/App.tsx:145`). Basename (`src/App.tsx:26`, `import.meta.env.BASE_URL.replace(/\/$/, '')`) is `''` in dev, `'/beta'` in production (`vite.config.ts:18`) — so the deployed URL is `vac811.hu/beta/galeria`. Gallery is lazy-loaded (`src/App.tsx:18`) inside `<Suspense fallback={null}>` (lines 92, 109). SEO metadata is registered separately via `pageSeo['/galeria']` (`src/App.tsx:53`).

**Data loading** — not a static import or raw inline fetch: goes through `useContent<GalleryItem[]>('gallery.json', 'gallery', gallerySchema)` (`src/pages/Gallery.tsx:23`). `useContent` (`src/hooks/useContent.ts:18-62`) does `fetch(`${import.meta.env.BASE_URL}content/${file}`)` (line 31) → `/content/gallery.json` (or `/beta/content/gallery.json` prod) served statically from `public/content/gallery.json` — **not** a runtime API call to GitHub/Drive. Unwraps via `json[key] ?? json` (line 37); if a Zod schema is passed, invalid data → whole fetch treated as error, `data` stays `null` (lines 38-40). Results cached in a module-level `Map` keyed by `` `${file}#${key}` `` (line 6).

`src/lib/galleryRepo.ts` is **not** used by the public Gallery page — it's the admin/curation-tool data layer (used by `Curate.tsx` at `/admin/kuracio`), committing via GitHub Contents API or a Cloudflare Worker proxy (lines 25-89, 101-158). It reuses the same `GalleryItem` type and `driveImageUrl` helper for shape-compatibility only.

Image URLs built by `driveImageUrl(fileId, width)` (`src/lib/imageCdn.ts:7-12`): routes through `VITE_IMAGE_CDN_URL` worker if configured, else falls back to `https://lh3.googleusercontent.com/d/${fileId}=w${width}` directly against Google Drive.

**Data shape** — `GalleryItem` interface exported from `src/pages/Gallery.tsx:8-20`:
```ts
export interface GalleryItem {
  id: string; name: string; year: string; event?: string; activity?: string;
  bucket?: string; score?: number; phash?: string; reason?: string;
  status?: 'pending' | 'approved' | 'rejected'; approved?: boolean;
}
```
Zod schema `src/schemas/content.ts:58-71` (`galleryItemSchema` / `gallerySchema = z.array(galleryItemSchema)`) mirrors this exactly. Live JSON also carries `primary`/`cap` keys on some records that are **not** in the interface or Zod schema — Zod silently strips unknown keys rather than erroring, so this passes validation silently; these fields are currently **unused by Gallery.tsx**.

**Markup structure** (`src/pages/Gallery.tsx:51-168`), inside `<main aria-label="Galéria oldal">`:
1. Hero section (`.page-hero`) — shared site-wide classes, not gallery-specific.
2. Grid section (`.section`):
   - **Year filter** (`.gallery-filter`, `role="group"`): "Összes" + one button per distinct year (derived via `useMemo`, lines 38-41, sorted descending). Active state via `useState('all')` (line 24) + `aria-pressed`; active button gets `.gallery-filter__btn--active`.
   - **Loading state**: `.gallery-grid.gallery-grid--skeleton`, 12 `.gallery-skeleton` divs sized `--large`/`--medium`/`--small` to mimic final layout.
   - **Error state**: plain `<p className="gallery-error">`. **Empty state**: plain `<p className="gallery-empty">`.
   - **Grid**: maps `filtered` items to `<figure className="gallery-item gallery-item--{size}">` with a single `<img className="gallery-item__img">`, responsive `src`/`srcSet`/`sizes` (400/800/1200w via `driveImageUrl`), `loading="lazy"`, `decoding="async"`, `alt={item.name}`. Size pattern: index `0` → large, index `4` → medium, everything else → small — this is **absolute-index, not repeating/modulo**: only the very first item is ever large, only the 5th ever medium (Gallery.tsx:122, duplicated at line 100 for skeleton, commented lines 123-125 as hand-synced to CSS's fixed grid-span math).
3. Instagram wall section — renders `<InstagramWall />`, unrelated to the photo grid (see next section).

**CSS** (`src/pages/Gallery.css`, 134 lines): `.gallery-filter`/`__btn` pill buttons (`--radius-full`, active fills `--color-primary`). `.gallery-grid`: CSS grid `repeat(4, 1fr)`, `grid-auto-rows: 180px`, `gap: var(--space-3)`; breakpoints `max-width:768px` → 2 columns/140px rows, `max-width:480px` → 2 columns (explicit `1fr 1fr`)/120px rows. `.gallery-item`: rounded (`--radius-lg`), bordered, `cursor:pointer`, hover `scale(1.02)` + shadow + `z-index:1`. `.gallery-item--large`: `grid-column: span 2; grid-row: span 2`. `.gallery-item--medium`: `grid-column: span 2` only. **No `.gallery-item--small` CSS rule exists** — the class is applied in JSX but is a no-op (small tiles just get the base 1×1 cell). `.gallery-item__img`: `inset:0`, `object-fit:cover`. Also present but **unused by current JSX**: `.gallery-notice`, `.gallery-notice__icon`, `.gallery-notice__links` — leftover callout-box styling from a previous page version, available to repurpose.

**Lightbox does not exist.** Grep across `src` for `lightbox|modal|dialog` (case-insensitive, `.tsx`/`.ts`/`.css`) returned zero matches. `.gallery-item` has `cursor:pointer` (Gallery.css:94) but there's no `onClick`, no click state, no keyboard handling, no focus-trap/dialog markup anywhere. A redesign introducing a lightbox is **greenfield** — nothing existing to preserve behaviorally, only the visual identity (rounded cards, border/shadow/hover-scale, the CSS custom properties) to carry over.

**Featured/hero or event-grouping logic** — **none exists in Gallery.tsx today.** `event`/`activity`/`bucket` fields exist on the type and in live JSON (e.g. `"event": "Tavaszi portya"`, `"activity": "táborozás, étkezés"`, `"bucket": "tabor"`) but are never read, grouped, or displayed — items are filtered only by `year` and rendered as one flat list. The only filtering logic is the approval gate (lines 28-36): shows if `status === 'approved'` or (`status` null/undefined AND `approved` truthy, legacy-compat fallback). The "large/medium" sizing is purely positional/cosmetic (first and fifth filtered item, regardless of content) — not data-driven. The unconsumed `primary`/`cap` fields (see previous section) are the only thing resembling scaffolding for a real "featured" concept, and they are not read anywhere in `src/`.

---

## Existing Instagram integration (IMPORTANT — read carefully, this may already partially exist)

**`src/components/InstagramWall.tsx` is a live third-party embed already wired into `/galeria` today** — not a local JSON reader, not mocked, not a stub:

- `InstagramWall.tsx:6-7` — reads `FEED_ID` from `import.meta.env.VITE_BEHOLD_FEED_ID` (falls back to a literal dev/test id); `BEHOLD_SCRIPT = 'https://w.behold.so/widget.js'`.
- `InstagramWall.tsx:15-25` — on mount, injects `<script type="module" src="https://w.behold.so/widget.js">` into `<head>` (deduped via `querySelector`). This is the **Behold.so** Instagram-widget service, which hydrates `[data-behold-id]` client-side by fetching the feed from Behold's own backend (which pulls from Instagram).
- `InstagramWall.tsx:53-57` — renders `<div data-behold-id={FEED_ID} />`; the widget script populates it at runtime.
- `InstagramWall.tsx:27-34` — a 5-second timeout checks `childElementCount === 0`; on failure, falls back to a "Kövess minket Instagramon" button linking to the profile (`PROFILE_URL`, lines 38-51).
- `InstagramWall.css:11-15` makes the injected `behold-widget` element full-width.

Supporting infrastructure confirming this is fully shipped, not a stub:
- `.env.production:1` — `VITE_BEHOLD_FEED_ID="RTiQ4suSjFTFM0QVI8lv"`.
- `src/vite-env.d.ts:4-5` — typed env var declaration.
- `index.html:73-74` — `<link rel="preconnect" href="https://w.behold.so">` with comment "Instagram feed (Behold widget on /galeria)".
- `public/.htaccess:24-28` — CSP explicitly allows `w.behold.so`, `feeds.behold.so`, `*.cdninstagram.com` for script/img/media/connect, with a comment that without it "the Gallery page's Instagram wall is silently blocked."
- Rendered from `src/pages/Gallery.tsx` (lines 3, 151-163) as `<InstagramWall />`, i.e. it is **already part of the current `/galeria` page**, not a hypothetical addition.

**Data shape**: not applicable in the way a naive plan might expect — there is **no local static JSON that InstagramWall.tsx reads**. The feed is fetched live by the third-party Behold script at runtime, keyed only by the opaque `FEED_ID` string. No Instagram post data ever lands in this repo's `public/content/`.

**`scripts/sync-gallery.mjs` is NOT Instagram-related**, despite the generic "gallery" name — it is a separate, general Drive-photo sync script:
- Header comment (`sync-gallery.mjs:1-20`) — syncs curated photos from a flat `_weboldal` folder in the shared Drive gallery root into `public/content/gallery.json`.
- Env vars (`sync-gallery.mjs:29-30`): `GOOGLE_DRIVE_API_KEY`, `GOOGLE_DRIVE_FOLDER_ID`. No Instagram/Behold/Meta vars anywhere.
- Only network call (`sync-gallery.mjs:50`): Google Drive API v3 `files.list`.
- Output (`sync-gallery.mjs:109-112`): `{ "gallery": [ { id, name, year }, ... ] }` — `id` = Drive file ID, `name` = filename minus extension, `year` = parsed leading 4-digit year or `""`.
- This script is **superseded/legacy**: not referenced by `package.json` scripts or any workflow — only by `CONTEXT.md:109` (a directory-tree listing). `scripts/curate-gallery.mjs` (718 lines) is the one actually wired into CI.

**Workflow check**: grepped all of `.github/workflows/` (`ci.yml`, `curate-gallery.yml`, `deploy-content.yml`, `deploy.yml`, `sync-ecset.yml`, `update-context.yml`) for `"instagram"` (case-insensitive) — **zero matches**. Same for `"behold"` — **zero matches**. Same for `"sync-gallery"` — **zero matches**. The only active gallery workflow, `curate-gallery.yml`, runs `curate-gallery.mjs` (line 76) on a daily cron and has nothing to do with Instagram.

**Conclusion — read carefully before scoping any "new Instagram sync pipeline":** A hypothetical `scripts/sync-instagram-feed.mjs` + new workflow would be building something that **already substantially exists architecturally**, just under a different name/mechanism — the site already has a working, CI-independent Instagram feed via the Behold.so live widget, complete with CSP entries and a preconnect hint, already rendered on `/galeria`. `scripts/sync-gallery.mjs` is a red herring with respect to Instagram: it's a Google-Drive photo sync script (itself likely legacy) with zero Instagram involvement — no shared code, env vars, or API calls. If the plan's actual goal is "show Instagram content on the site," that need is already met; a new sync script/workflow would be redundant duplicate effort **unless** the plan is a deliberate architecture change — replacing the client-side third-party Behold embed with a server-side/CI-time snapshot of Instagram posts into static JSON (to drop the Behold dependency, avoid its CSP/script-injection surface, or gain build-time control). That would be genuinely new work, but it is a **replacement/migration decision that must be made explicitly**, not something to silently assume or duplicate. Note also that the existing top-level plan (`docs/audit-and-upgrade-plan-2026-07.md:52,98`) already correctly identifies "Instagram via Behold" as the current state — it is not the source of any flawed assumption; a "unify Drive photos with an Instagram layer" plan must explicitly decide: keep Behold and design the unified layout around an embedded widget block, or replace it with an ingested-post data layer (net-new pipeline + storage + refresh cadence, all still to be designed).

---

## Design tokens & visual conventions

**Design tokens** (`src/styles/tokens.css`, root block from line 7, dark overrides at line 105 and `@media (prefers-color-scheme: dark)` at line 137):
- Typography scale (lines 10-17): `--text-xs` … `--text-hero`, all fluid `clamp()`.
- Font stacks (lines 96-101): `--font-display: 'Sora', 'Work Sans', 'Helvetica Neue', sans-serif` (headings/hero, "≥ `--text-xl`" per comment), `--font-body: 'General Sans', 'Work Sans', 'Helvetica Neue', sans-serif`, `--font-ui: 'Sora', ...` (labels/badges/buttons). Confirmed applied: `body { font-family: var(--font-body, ...) }` (`base.css:28`), `h1..h6 { font-family: var(--font-display, ...) }` (`base.css:53`). Only 5 self-hosted font files exist (`src/assets/fonts/`: `sora-600.woff2`, `sora-700.woff2`, `generalsans-400/500/600.woff2`, `@font-face` in `src/styles/fonts.css:4-38`) — no Sora 400/500 or General Sans 700.
- Spacing (4px base, lines 19-32): `--space-1` through `--space-32`, not every integer exists (no `--space-7`, `--space-9`, etc.).
- Colors: surfaces (lines 35-42), text (45-48), primary/forest-green accent + variants (51-55), earth accent (58-59), gold accent (62-63), semantic success/warning/error/info (66-69).
  - **Bug found**: `var(--color-accent)` is referenced in `src/styles/global.css:308` (fallback `#f4c430`) and `src/pages/Curate.css:181-182` (no fallback) but **`--color-accent` is never defined** in tokens.css — resolves to nothing in Curate.css. Relevant if the redesign reuses either of those rules.
- Radius: `--radius-sm` (0.375rem) through `--radius-full` (9999px), lines 72-77.
- Shadows: `--shadow-sm/md/lg/xl`, lines 80-83 (light), overridden 131-134 (dark) and 160-163 (prefers-color-scheme dark — `--shadow-xl` missing there).
- Transitions: `--transition-fast` (150ms), `--transition-interactive` (200ms), `--transition-slow` (350ms), lines 86-88.
- Content widths: `--content-narrow/default/wide/full`, lines 91-94.

**Card conventions** — base `.card` (`global.css:143-153`): `background: var(--color-surface); border-radius: var(--radius-xl); border: 1px solid var(--color-border);`, hover `box-shadow: var(--shadow-md); transform: translateY(-2px);`. Hover lift distance is **inconsistent** across the app: `-2px` on `.card` (global.css:152), `.event-card` (Home.css:350), `Leaders.css:20`; `-3px` on `.value-card`/`.raj-card` (About.css:68), `.intro__card`/`.age-card`/`.highlight-card` (Home.css:189,214,267), `.leader-card` (Home.css:396, Leaders.css:95), `.raj-full-card` (Rajok.css:10). No-transform/shadow-only or different effect: `.korosztaly-card` (global.css:333-336, actually `-2px`), `.gallery-item` uses `scale(1.02)` instead of translate (Gallery.css:97-101), `.camps-table tr:hover` (Camps.css:116, background-only). `src/pages/Curate.css` is a stylistic outlier (raw px radii, hardcoded hex colors) — internal CMS tool, not representative of public-site conventions.

**Left-border-accent pattern already EXISTS in the codebase — any plan assuming it needs to be introduced net-new is wrong.** Two confirmed instances, both using the identical `4px solid var(--color-primary)` treatment:
1. `src/styles/global.css:397` — `.fogadalom-quote { border-left: 4px solid var(--color-primary); ... }` (scout-promise blockquote, shared/global).
2. `src/pages/About.css:117` — `.org-card { border-left: 4px solid var(--color-primary); }` (About-page organization cards).

**Icon system** — `public/icons.svg` (24 lines) has exactly six `<symbol>`s: `bluesky-icon`, `discord-icon`, `documentation-icon`, `github-icon`, `social-icon`, `x-icon` (lines 2,6,9,14,17,21) — generic dev-template icons. **No fleur-de-lis or scouting-motif icon exists in `icons.svg`.** Grep for `icons.svg#` and `<use` across all of `src/` returned **zero matches** — the sprite is unreferenced/vestigial. Actual iconography in use: inline hand-authored `<svg>` in JSX (e.g. `src/components/Footer.tsx:25,32,40,74,81,88`; `src/pages/Join.tsx:197`), and emoji-as-icon content (`src/pages/Home.tsx:202,206,210,214` — `🌲`,`🙏`,`🤝`,`⚜️`; `About.tsx:108`). Notably `⚜️` (fleur-de-lis emoji) is already used at `Home.tsx:214` — the closest existing thing to a scouting motif, but it's an emoji glyph, not an SVG symbol. `src/assets/neckerchief.svg` and `public/logo.svg` are single illustrative graphics, not reusable icon sprites. **Any plan wanting a fleur-de-lis SVG symbol referenced via `<use>` must create it — it cannot be "confirmed present."**

**Breakpoints in use** (no shared `--breakpoint-*` tokens exist; every page hardcodes its own px values):

| Breakpoint | Files / lines |
|---|---|
| `max-width: 360px` | `src/pages/Curate.css:324` |
| `max-width: 480px` | `src/pages/Gallery.css:129`, `src/pages/Home.css:602` |
| `max-width: 600px` | `src/pages/Curate.css:314` |
| `max-width: 639px` | `src/components/ScrollProgress.css:49` |
| `max-width: 640px` | `src/pages/Home.css:588`, `src/pages/Scouting.css:55`, `src/pages/Camps.css:170`, `src/pages/Leaders.css:169` |
| `max-width: 768px` | `src/pages/Contact.css:173`, `src/pages/Gallery.css:118`, `src/pages/About.css:141`, `src/pages/History.css:165`, `src/components/Footer.css:123` |
| `min-width: 768px` | `src/components/Navbar.css:213` |
| `max-width: 900px` | `src/pages/Home.css:564`, `src/components/Navbar.css:216` |

`640px`, `768px`, `900px` are the three most-reused cutoffs; `360px`/`600px` are unique to the `Curate.css` admin page.

---

## CMS config & prior planning docs

**`public/admin/config.yml`** (121 lines, 4 collections: `leaders`, `camps`, `events`, `settings`): **no `gallery` collection exists at all.** `public/content/gallery.json` is entirely outside Sveltia CMS — written by `scripts/curate-gallery.mjs` and approved via the separate custom tool at `/admin/kuracio` (`src/pages/Curate.tsx`). Confirmed structurally — no `gallery`/`kuracio` block in config.yml.

- **`events` collection** (lines 67-95, `public/content/events.json`): fully CMS-editable — `id` (82), `title` (83), `date` (84), `dateDisplay` (85), `description` (86), `category` select enum `mise/portya/verseny/tábor/egyéb` (87-95). None of these fields carry the ECSET-sync hint text that `camps` fields do, even though other research (audit finding C3) says `sync-ecset.mjs` also overwrites `events` fields — a possible UI/behavior mismatch to be aware of if the redesign touches event data.
- **`camps` collection** (44-64): mixed ownership — `year`, `location`, `commander`, `participants` (59-63) carry the hint "Automatikusan frissül az ECSET szinkronból... a kézi módosítás felülíródhat"; `theme`/`notes` (62,64) are editor-only.
- **`settings` collection** (103-121) — the **only** place `instagram` appears in config.yml: line 117, `{ label: Instagram URL, name: instagram, widget: string, hint: "Kezdetben az ECSET-ből töltődik fel; miután itt beállítod, a szerkesztői érték az irányadó és a szinkron többé nem írja felül." }` — a single plain-text profile URL field, seeded from ECSET then editor-wins-permanently. **There is no Instagram feed/collection/sync config here** — just a URL string (this is `PROFILE_URL` consumed by `InstagramWall.tsx`'s fallback button, and `public/content/settings.json:8`).
- **`leaders` collection** (22-41): fully CMS-editable, no sync hints.

**`src/schemas/content.ts`** (71 lines): `eventSchema` (26-33) mirrors the `events` collection fields exactly. `galleryItemSchema`/`gallerySchema` (58-71) — comment at lines 56-57 notes the schema deliberately includes pipeline-written fields (`activity`/`bucket`/`reason`) alongside the app-facing shape, citing "audit finding C10." **No Instagram-specific schema exists anywhere** — `settingsSchema` (42-54) just has `instagram: z.string()` (49), matching the plain URL field.

**`docs/audit-and-upgrade-plan-2026-07.md`** — a pre-existing, comprehensive 6-dimension audit (security, robustness, performance, photo-pipeline, CMS/content, SEO/a11y) with a phased roadmap (`## 0` through `## 6`, including `### Phase 0` – `### Phase 6` under `## 4. Roadmap`). Gallery/Instagram-relevant content is about **backend delivery/performance/ownership, not visual redesign**:
- §1 Architecture snapshot (line 52): "Images... served directly from the Google Drive CDN... **Instagram via Behold**" — descriptive background only.
- **Finding C7** (§3.5, line 161): "Split media story: uploads committed to repo vs gallery served only from Drive" — recommends picking one storage model.
- **Phase 2 — Photo experience speed** (§4, lines 271-302): 2.1 Cloudflare image-delivery worker in front of Drive (CDN/caching/AVIF); 2.2 per-tile `sizes`/preconnect/a11y-label fixes; 2.3 speeds up the Curate approval tool; 2.4 (optional) mirrors approved images into the repo. All about load speed/reliability of existing Drive-sourced images — **not** layout/visual design.
- **No section proposes an "Instagram sync layer"** (server-side ingestion of Instagram posts) — Instagram is discussed only as (a) the existing Behold.so client-side embed and (b) the settings URL field.

---

## Open questions / discrepancies vs. the original plan

This section exists specifically to catch places where a naive redesign plan's assumptions would be **wrong** given what actually exists in the repo. Each item below names the assumption and the concrete evidence contradicting or complicating it.

1. **"We need to build a new Instagram sync pipeline" — WRONG, an Instagram integration already exists and is already live on `/galeria`.** `src/components/InstagramWall.tsx` is rendered from `Gallery.tsx:3,151-163` today. It is a third-party Behold.so widget (script injected `InstagramWall.tsx:15-25`, feed div `InstagramWall.tsx:53-57`, keyed by `VITE_BEHOLD_FEED_ID` set in `.env.production:1`), fully wired with CSP allowances (`public/.htaccess:24-28`) and a preconnect hint (`index.html:73-74`). Any plan to "unify Drive photos with an Instagram layer" must explicitly choose one of two paths rather than silently building a duplicate:
   - **(a) Keep Behold** and design the unified `/galeria` layout around embedding the existing widget block alongside the Drive grid (lowest-risk, no new backend).
   - **(b) Replace Behold** with a server-side/CI-time ingestion pipeline that snapshots Instagram posts into a static JSON file (mirroring how `curate-gallery.mjs` mirrors Drive) — this is a legitimate but materially different architecture decision (new script, new workflow, new storage shape, refresh-cadence design, and a call on whether to drop the Behold dependency and its CSP surface). This must be a deliberate decision written into the plan, not an assumption.

2. **"`scripts/sync-gallery.mjs` is the Instagram sync mechanism" or "is currently active" — WRONG on both counts.** Its name is misleading: it's a Drive-photo sync (not Instagram at all — no Instagram/Behold/Meta code, vars, or calls anywhere in its 120 lines), and it is not wired into CI (`sync-gallery.mjs` appears in zero `.github/workflows/*.yml` files and zero `package.json` scripts — only referenced by `CONTEXT.md:109` as a directory listing). The actually-active pipeline is `scripts/curate-gallery.mjs` (718 lines) run by `.github/workflows/curate-gallery.yml` on a daily cron. Any plan referencing "the existing gallery sync script" must mean `curate-gallery.mjs`, not `sync-gallery.mjs`.

3. **"The route is `/galeria`" — CONFIRMED, not a discrepancy, but verify exact casing/basename before wiring links.** Route defined at `src/App.tsx:103` as literally `path="/galeria"`. However the deployed production URL includes a `/beta` basename (`vac811.hu/beta/galeria`, from `vite.config.ts:18` + `src/App.tsx:26`) — any hardcoded absolute links in redesign copy/tests must account for this prefix in prod but not in dev.

4. **"A left-border-accent visual treatment would be a new pattern for this redesign" — WRONG, it already exists and should be reused, not reinvented.** `src/styles/global.css:397` (`.fogadalom-quote`) and `src/pages/About.css:117` (`.org-card`) both already use `border-left: 4px solid var(--color-primary)`. If the redesign wants a left-accent card style (e.g. for event-grouped photo sections), this is the established token-consistent pattern to extend, not a novel addition needing its own design decision.

5. **"There's a fleur-de-lis / scouting icon already in `public/icons.svg` to reuse" — WRONG.** `icons.svg` contains only six generic dev-template symbols (`bluesky-icon`, `discord-icon`, `documentation-icon`, `github-icon`, `social-icon`, `x-icon`) and is not referenced anywhere in `src/` (zero `<use href="/icons.svg#...">` matches). The closest existing scouting-motif asset is the `⚜️` emoji glyph at `Home.tsx:214` — not an SVG symbol. If the redesign wants a reusable fleur-de-lis icon, it must be created from scratch and added to a sprite; it cannot be sourced from the existing file.

6. **"`gallery.json` already has event-grouping / featured-photo data ready to consume" — PARTIALLY WRONG: the fields exist in data but are 100% unused by the current page, and their semantics are narrower than "featured."** `event`, `activity`, `bucket` are present on every live item, and `primary`/`cap` are present on 78/116 items, but **none of these five fields are read anywhere in `src/pages/Gallery.tsx`** — the current page filters only by `year` and sizes tiles by absolute array index (0 and 4), not content. `primary`/`cap` are also not in `GalleryItem`/`gallerySchema` (`Gallery.tsx:8-20`, `content.ts:58-71`) even though Zod silently accepts them. A redesign that wants event-grouped sections or a data-driven hero must (a) add these fields to the type/schema, and (b) write new grouping/selection logic — none of it exists today despite the data being present. Note also `primary`/`cap` describe "primary event of the year" (e.g. the main summer camp) per the curation pipeline's `detectPrimaryEvent`/cap logic (`curate-gallery.mjs:229-245`), not "this specific photo is a hero shot" — a plan conflating the two would misuse the field.

7. **"A lightbox already exists / just needs restyling" — WRONG, it is fully greenfield.** Grep across all `.tsx`/`.ts`/`.css` for `lightbox|modal|dialog` returned zero matches. `.gallery-item` has `cursor:pointer` (Gallery.css:94) suggesting an intended affordance, but there is no click handler, no open/close state, no keyboard (Escape/arrow) handling, and no focus-trap markup anywhere in the codebase. This is 100% new implementation work, not a refactor of something existing.

8. **"`.gallery-item--small` has its own styling to build on" — WRONG, it's currently a no-op class.** The JSX applies `gallery-item--small` to every tile that isn't index 0 or 4, but `Gallery.css` has no matching `.gallery-item--small` rule — those tiles simply get the base 1×1 grid cell. A redesign changing tile-size logic should not assume any existing small-tile-specific CSS is in play.

9. **`--color-accent` is used in two places but never defined** (`global.css:308`, fallback `#f4c430`; `Curate.css:181-182`, no fallback) — if the redesign's visual language leans on an "accent" token distinct from `--color-primary`/`--color-gold`, this pre-existing gap should be fixed as part of the token work, not treated as a working reference to copy.

10. **Gallery/Instagram is CMS-invisible today, and that is by design, not oversight.** `public/admin/config.yml` has no `gallery` collection (gallery content is pipeline + `/admin/kuracio`-owned) and the only `instagram`-named field anywhere in the CMS is a plain profile-URL string in `settings` (config.yml:117, `settingsSchema` `instagram: z.string()` at `content.ts:49`). A plan that assumes editors can manage "which Instagram posts show" or "which photos are grouped/featured" through the existing Sveltia CMS is wrong — no such editorial surface exists; it would need to be built (either in `/admin/kuracio` or as a new CMS collection).

11. **The existing top-level audit already claims Phase 2 backend work for gallery images (CDN worker, per-tile `sizes`, a11y labels, storage-model decision C7) — a new `/galeria` redesign plan must cross-reference this rather than re-diagnose it from scratch.** `docs/audit-and-upgrade-plan-2026-07.md` §4 Phase 2 (lines 271-302) and finding C7 (§3.5, line 161) already scope this work; duplicating it as "new" findings in the redesign plan would be wasted/conflicting effort. Conversely, that same document proposes **no visual/layout redesign of `/galeria` at all** — so the visual-design side of this effort is genuinely additive/net-new, it just needs to incorporate (not re-invent) the already-specified backend items.
