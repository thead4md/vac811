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

### Scope 2: the content CMS (Sveltia)

Sveltia speaks the GitHub API natively, so it can't talk to the proxy directly.
Cleanest path: extend the existing `sveltia-cms-auth` Worker so it only mints a
GitHub token **after** verifying a Google `@vac811.hu` identity (a git-gateway
style gate). Bigger lift; do it after Scope 1 proves out.

`sveltia-cms-auth` isn't vendored in this repo — it's the third-party
[`sveltia/sveltia-cms-auth`](https://github.com/sveltia/sveltia-cms-auth)
project, deployed separately at `sveltia-cms-auth.dudas-adam99.workers.dev`
(`public/admin/config.yml` `base_url`). To gate it:

1. **Fork it into this repo** (e.g. `workers/sveltia-cms-auth/`) so it can be
   customized and deployed the same way as `workers/google-git-proxy` and
   `workers/image-cdn`.
2. Before it exchanges the GitHub OAuth code for a token, add the same
   `verifyGoogle()`-style check already in `workers/google-git-proxy/index.js`
   — require a valid Google ID token (passed as an extra header/param from
   the Sveltia login flow) with `email_verified` and an `@vac811.hu` (or
   allowlisted) address, and reject the request otherwise.
3. Once both the CMS and Curate paths sit behind the same Google gate, a
   single `@vac811.hu` sign-in works for both — no GitHub account needed by
   any editor.

**Folding gallery approval into the CMS as one tool:** the plan's other half —
replacing the dedicated Curate page with a Sveltia "approve"-style collection
over `gallery.json` — is a real UX trade: Curate's batch-select grid, tabs
(pending/published/rejected), and per-item caption editing are purpose-built
for reviewing dozens of AI-suggested photos quickly; a generic Sveltia list
collection doesn't have batch actions or an image-grid view out of the box.
Do this only after confirming with the site owner that a generic CMS list
view is an acceptable review experience — otherwise keep Curate as a
separate, purpose-built tool and only unify the *auth*, not the *UI*.

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
   - `public/.htaccess` → the CSP's `connect-src`/`img-src` if it lists the
     specific worker hostnames (currently `https://*.workers.dev` is
     wildcarded, so a custom domain will need adding there explicitly)
5. Re-run `wrangler secret put ...` for each secret on the new deployment —
   secrets don't carry over between accounts.
