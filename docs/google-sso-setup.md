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

## Security notes

- The Worker verifies `aud` (your client id), `email_verified`, and the domain on
  every request — a stolen client id alone can't write.
- Keep `GITHUB_TOKEN` scoped to *only* `thead4md/vac811` Contents. Rotate on leave.
- `ALLOWED_ORIGIN` locks CORS to the site; tighten it once the final domain is set.
