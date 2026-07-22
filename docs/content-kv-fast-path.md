# Content Fast-Path via Workers KV (Phase 4)

## What this is

Content edits (Sveltia CMS, the Curate tool, and the scheduled ECSET/Instagram/
gallery sync bots) used to only reach the live site through a full commit →
`npm ci` → Vite build → Cloudflare Pages deploy cycle (~5–8 minutes). This
phase adds a fast-path: a Pages Function reads content from Workers KV first,
so edits go live in roughly a minute, with **no client-side change** and
**no loss of git as the source of truth**.

```
editor / bot commits public/content/<file>.json to main
        │
        ▼
.github/workflows/sync-content-kv.yml  (validates with the same zod schemas
        │                                the build uses, then writes to KV)
        ▼
Workers KV namespace "CONTENT"  ──  key = "<file>.json" → raw JSON string
        │
        ▼
functions/content/[file].js  (Pages Function, intercepts GET /content/<file>)
        │
        ├─ KV hit  → serve the KV value (fresh)
        └─ KV miss → context.next() → serve the static file from dist/
                      (git's last-deployed content — automatic fallback)
        │
        ▼
src/hooks/useContent.ts fetches the same /content/<file> URL it always did.
```

Cloudflare Pages Functions take priority over static assets on a matching
route, and `context.next()` explicitly falls through to serve the committed
static asset — so if KV is empty, unset, or the binding hasn't been attached
yet, the site behaves exactly as it did before this phase.

## One-time owner setup (Cloudflare dashboard / account — not code)

These steps need Cloudflare account access this session doesn't have. Do them
once, in order:

1. **Create the KV namespace** (from a machine with `wrangler` logged into the
   vac811 Cloudflare account):
   ```bash
   npx wrangler kv namespace create CONTENT
   ```
   This prints a namespace `id`. Keep it.

2. **Bind it to the Pages project** — dashboard → Workers & Pages →
   `vac811-beta` → **Settings** → **Bindings** → **Add** → **KV namespace**:
   - Variable name: `CONTENT`
   - KV namespace: the one created in step 1

   (Alternatively, uncomment the `[[kv_namespaces]]` block in the root
   `wrangler.toml` with that id — either method works; the dashboard doesn't
   require a redeploy to take effect for existing deployments' Functions.)

3. **Add repo secrets** (GitHub → Settings → Secrets and variables → Actions)
   so `sync-content-kv.yml` can write to KV:
   - `CONTENT_KV_NAMESPACE_ID` — the namespace id from step 1
   - Confirm the existing `CLOUDFLARE_API_TOKEN` secret has **Workers KV
     Storage: Edit** permission (it's also used for Pages deploys, which need
     a different scope — check both are covered, or use two tokens).
   - `CLOUDFLARE_ACCOUNT_ID` already exists (used by `deploy.yml`).

4. **First sync** — once the secrets exist, run
   `sync-content-kv.yml` manually (Actions tab → "Sync content to Workers KV"
   → Run workflow) to seed KV from the current `public/content/*.json` files.
   After that, every push to `main` touching `public/content/**` (and every
   dispatch from the bot workflows) keeps it current.

Until step 3 is done, `sync-content-kv.yml` fails fast with a clear
`::error::` if `CONTENT_KV_NAMESPACE_ID` is missing — it doesn't silently
no-op. Until step 2 is done, `env.CONTENT` is undefined in the Function, so
every request falls through to the static file — i.e. today's behavior.

## What changed in code

- **`functions/content/[file].js`** — the Pages Function described above.
  Only the 7 known content filenames are served from KV (see `KV_FILES`);
  anything else (e.g. the internal `gallery-pipeline-state.json`) always
  falls through to static.
- **`wrangler.toml`** (new, repo root) — declares the Pages project so
  `wrangler pages deploy` compiles `functions/`. Documents (commented out)
  how to attach the KV binding as code instead of via the dashboard.
- **`.github/workflows/sync-content-kv.yml`** (new) — validates content with
  `npm run validate:content` (the same zod gate the build uses), then writes
  each file to KV via the Cloudflare REST API. Triggered by pushes to
  `public/content/**` and by explicit dispatch from the bot workflows below.
- **`.github/workflows/deploy.yml`** — the deploy step now uses
  `cloudflare/wrangler-action` (`wrangler pages deploy`) instead of the
  deprecated `cloudflare/pages-action@v1`, which doesn't reliably compile
  Pages Functions. Content-only pushes (`paths-ignore: public/content/**`) no
  longer trigger a full rebuild — they go through KV instead.
- **`sync-ecset.yml`, `sync-instagram-feed.yml`, `curate-gallery.yml`** — the
  post-commit dispatch (previously `gh workflow run deploy.yml`, or absent for
  curate-gallery) now dispatches `sync-content-kv.yml` instead, since these
  bots only ever touch `public/content/**`.

`useContent` (`src/hooks/useContent.ts`) is unchanged — it already fetches
`/content/<file>`; that URL is just KV-backed now.

## Local development / testing

```bash
npm run build
npx wrangler pages dev dist --kv=CONTENT --port=8788
```

`--kv=CONTENT` creates an ad hoc local KV namespace bound as `CONTENT` (SQLite
under `.wrangler/state/`, gitignored). Seed a key to test the KV-hit path:

```bash
npx wrangler kv key put "events.json" --path=./public/content/events.json \
  --binding=CONTENT --local --persist-to=.wrangler/state
```

Then `curl http://localhost:8788/content/events.json` should return the
seeded value with `Cache-Control: public, max-age=60, stale-while-revalidate=300`.
Delete the key (or don't seed it) to see the static-fallback path — same URL,
no `Cache-Control` from the Function, served straight from `dist/content/`.

## Rollback

- **A single file misbehaving in KV:** delete that key
  (`wrangler kv key delete "<file>.json" --binding=CONTENT`, or via dashboard)
  — the Function falls through to the static file immediately, no deploy
  needed.
- **The whole fast-path:** detach the `CONTENT` binding from the Pages project
  in the dashboard. Every request 404s the binding lookup and falls straight
  through to static — behaves exactly as before Phase 4.
- **The Function itself:** deleting `functions/content/[file].js` (or its
  containing directory) removes the interception entirely; the next deploy
  serves `/content/*` as plain static assets again.

## Known limitations

- KV is eventually consistent at Cloudflare's edge (typically well under a
  minute); an edit can very briefly be visible in some regions before others.
  Not a concern for this site's traffic/update patterns.
- The sync workflow syncs on every content-touching push; it doesn't diff
  which files actually changed, so an ECSET sync that only touches
  `camps.json` still re-PUTs all 7 files. Harmless (idempotent, cheap), just
  not maximally minimal — revisit only if KV write volume ever becomes a
  practical concern.
