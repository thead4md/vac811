# Google SSO for @vac811.hu editors

## Why this isn't a config flag

Both the content CMS (`/admin`, Sveltia) and the photo-curation tool
(`/admin/kuracio`) currently authenticate with **GitHub OAuth** and commit
straight to the `thead4md/vac811` repo. That means **every editor needs a GitHub
account with write access to the repo** — a real barrier for non-technical
leaders.

A Google identity *cannot push to GitHub by itself*. The working model is a small
proxy that (1) verifies the editor's Google sign-in and (2) commits on their
behalf with a single server-held GitHub credential:

```
browser  --Google ID token-->  Cloudflare Worker  --GitHub token-->  repo
```

The editor signs in with their `@vac811.hu` Google account and never touches GitHub.

## Prerequisite to confirm first

`vac811.hu` must be a **Google Workspace** domain so the hosted-domain (`hd`)
claim on the ID token is trustworthy. You already use `@vac811.hu` mailboxes, so
this is very likely — but confirm before building. If it is *not* Workspace, we
fall back to checking `email` ends with `@vac811.hu` (slightly weaker, still fine
for this use case).

## Rollout — two scopes

### Scope 1 (recommended first): the photo-curation tool

This is our own React code, so it's self-contained and low-risk.

1. **GitHub token** — create a fine-grained PAT (or a GitHub App installation
   token) with **Contents: Read & Write** on `thead4md/vac811`.
2. **Google OAuth client** — in Google Cloud Console → *APIs & Services →
   Credentials*, create an **OAuth 2.0 Web client**. Add `https://vac811.hu` (and
   `http://localhost:5173` for dev) as authorized JavaScript origins. Copy the
   **Client ID**.
3. **Deploy the Worker** (`workers/google-git-proxy/`):
   ```bash
   cd workers/google-git-proxy
   npx wrangler deploy
   npx wrangler secret put GOOGLE_CLIENT_ID   # paste the OAuth client id
   npx wrangler secret put GITHUB_TOKEN        # paste the PAT / App token
   ```
   Note the deployed URL, e.g. `https://vac811-google-git-proxy.<sub>.workers.dev`.
4. **Wire the frontend** — ✅ already done. Set these two env vars to activate:
   - `VITE_GOOGLE_CLIENT_ID` — the OAuth client id from step 2
   - `VITE_PROXY_URL` — the Worker URL from step 3

   In `.env.production`:
   ```
   VITE_GOOGLE_CLIENT_ID=1234-abc.apps.googleusercontent.com
   VITE_PROXY_URL=https://vac811-google-git-proxy.<sub>.workers.dev
   ```

   When both vars are present the Curate page shows Google Sign-In and routes
   all reads/writes through the Worker. When either is absent it falls back to
   the PAT token form — nothing breaks before the Worker is live.

### Scope 2: the content CMS (Sveltia) — ✅ code done (Phase 5.2)

Sveltia speaks the GitHub API natively, so it can't talk to the `google-git-proxy`
directly. The upstream authenticator it uses,
[`sveltia/sveltia-cms-auth`](https://github.com/sveltia/sveltia-cms-auth)
(deployed at `sveltia-cms-auth.dudas-adam99.workers.dev`,
`public/admin/config.yml` `base_url`), has now been **forked into this repo at
[`workers/sveltia-cms-auth/`](../workers/sveltia-cms-auth/)** and gated behind
the same Google check as Curate.

**Design note — why the gate lives in the worker, not "passed from Sveltia":**
the original sketch above imagined Sveltia handing the worker a Google ID token
as an extra header/param. In practice Sveltia's login popup has *no hook* to do
that — it only knows how to start a provider OAuth flow. So the fork makes the
worker own the gate end-to-end:

1. `GET /auth` no longer redirects straight to GitHub — it serves a
   **self-contained Google Sign-In interstitial** (on the worker's own origin,
   inside Sveltia's existing popup).
2. On sign-in, the page POSTs the Google ID token to `POST /auth/continue`,
   which runs the **same `verifyGoogle()` check as
   `workers/google-git-proxy/index.js`** (`aud` = our client id,
   `email_verified`, `@vac811.hu` domain / `hd`, optional `ALLOWED_EMAILS`
   allowlist) — identical rule and error strings.
3. Only on success does it proceed to the normal GitHub OAuth exchange and
   `postMessage` the token back to Sveltia. Everything stays inside the popup,
   so `window.opener` still receives the token unchanged.

Result: one `@vac811.hu` sign-in now gates **both** the CMS and Curate — no
editor needs a GitHub account. The decision logic (`evaluateGoogleIdentity`,
`verifyGoogle`, `buildProviderRedirect`) and the request router are unit-tested
in `workers/sveltia-cms-auth/index.test.ts` (runs under `npm test`).

**To activate (owner Cloudflare/Google steps — I can't do these):**

```bash
cd workers/sveltia-cms-auth
npx wrangler deploy
npx wrangler secret put GOOGLE_CLIENT_ID       # the OAuth Web client id from Scope 1
npx wrangler secret put GITHUB_CLIENT_ID       # existing Sveltia GitHub OAuth app id
npx wrangler secret put GITHUB_CLIENT_SECRET   # existing Sveltia GitHub OAuth app secret
# optional but recommended: restrict to named editors
# npx wrangler secret put ALLOWED_EMAILS
```

- On the **Google OAuth Web client** (same one Scope 1 created): add the
  deployed worker origin as an **Authorized JavaScript origin**.
- On the **GitHub OAuth app**: set the Authorization callback URL to
  `<worker-origin>/callback` (unchanged from today if you redeploy to the same
  hostname).
- Point Sveltia at the new deployment: `public/admin/config.yml` →
  `backend.base_url`.

Until deployed, the CMS keeps using the current un-gated upstream worker — no
regression. Full config table + flow diagram: `workers/sveltia-cms-auth/README.md`.

**Folding gallery approval into the CMS as one tool:** the plan's other half —
replacing the dedicated Curate page with a Sveltia "approve"-style collection
over `gallery.json` — is a real UX trade: Curate's batch-select grid, tabs
(pending/published/rejected), and per-item caption editing are purpose-built
for reviewing dozens of AI-suggested photos quickly; a generic Sveltia list
collection doesn't have batch actions or an image-grid view out of the box.
Do this only after confirming with the site owner that a generic CMS list
view is an acceptable review experience — otherwise keep Curate as a
separate, purpose-built tool and only unify the *auth*, not the *UI*.

## Cloudflare Access in front of `/admin/*` (Phase 5.1) — owner dashboard step

Access is a **complementary** edge layer, not a replacement for the worker gate
above: Access controls *who can reach the admin pages*; the worker gate above
controls *who can mint a repo-writing token*. Together they're defence in depth.
Setting Access up is a Cloudflare **dashboard** action (I can't do it):

1. Zero Trust → Access → Applications → **Add a self-hosted application** for
   `beta.vac811.hu/admin/*` (and `/admin/kuracio` if it isn't covered by the
   `/admin/*` path).
2. Add a policy: **Allow** where *Emails ending in* `@vac811.hu` (or a named
   allowlist), identity provider = Google.

**CSP / `_headers` review (the code-side of 5.1): no change required today.**
- Access authenticates via a **top-level redirect** to
  `<team>.cloudflareaccess.com` and back with a `CF_Authorization` cookie — a
  full-page navigation, not an iframe, so the site's `frame-src` /
  `frame-ancestors` in `public/_headers` don't gate it.
- The Phase 5.2 Google sign-in page is served on the **worker's** origin with
  its own CSP (set in `renderGoogleGate`), so the site `_headers` CSP doesn't
  apply to it either.
- **Only if** you later configure Access to render its login as an *embedded*
  challenge (unusual) would you need to add `https://*.cloudflareaccess.com` to
  `frame-src` in `public/_headers`. Revisit then, not now.

## Security notes

- The Worker verifies `aud` (your client id), `email_verified`, and the domain on
  every request — a stolen client id alone can't write.
- Keep `GITHUB_TOKEN` scoped to *only* `thead4md/vac811` Contents. Rotate on leave.
- `ALLOWED_ORIGIN` locks CORS to the site; tighten it once the final domain is set.

## Moving workers off the personal Cloudflare account

Both `sveltia-cms-auth` (external) and this repo's own `google-git-proxy` /
`image-cdn` workers currently deploy under a personal Cloudflare account
(`dudas-adam99.workers.dev`). This needs the account owner to act — an agent
without Cloudflare credentials can't do it — but the steps are:

1. Create (or get access to) an org-owned Cloudflare account/zone for `vac811.hu`.
2. Re-run `npx wrangler deploy` for each worker (`workers/google-git-proxy`,
   `workers/image-cdn`, and the forked `sveltia-cms-auth` if Scope 2 above is
   done) while authenticated against the org account — `wrangler.toml` in
   this repo has no account-specific IDs baked in, so this is a plain redeploy,
   not a code change.
3. Point each at a custom subdomain instead of `*.workers.dev` (e.g.
   `git-proxy.vac811.hu`, `img.vac811.hu` — see `workers/image-cdn/wrangler.toml`
   for the commented-out route block) via the zone's DNS + a `routes` entry.
4. Update the URLs that reference the old `*.workers.dev` addresses:
   - `public/admin/config.yml` → `backend.base_url`
   - `.env.production` → `VITE_PROXY_URL`, `VITE_IMAGE_CDN_URL`
   - `public/_headers` → the CSP's `connect-src`/`img-src` if it lists the
     specific worker hostnames (currently `https://*.workers.dev` is
     wildcarded, so a custom domain like `git-proxy.vac811.hu` will need
     adding there explicitly, and the `*.workers.dev` wildcard can then be
     tightened). Note the CMS auth worker is reached via a `window.open`
     popup, not `fetch`/iframe, so it needs no `connect-src`/`frame-src`
     entry — only the Curate page's `fetch` to `google-git-proxy` does.
5. Re-run `wrangler secret put ...` for each secret on the new deployment —
   secrets don't carry over between accounts.
