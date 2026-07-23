# Cloudflare Access as an optional second login wall

## What this adds

[Cloudflare Access](https://developers.cloudflare.com/cloudflare-one/policies/access/)
is a Zero Trust product that puts an SSO/login wall in front of a hostname,
enforced **at Cloudflare's edge, before the request ever reaches the
Worker**. A visitor who isn't authenticated (and doesn't match a configured
policy) gets Cloudflare's own login page and is never routed to the app at
all.

This repo's editing tools already have their own **app-level** identity
check, done in application code:

- `workers/sveltia-cms-auth` — the CMS auth broker gates on
  `ALLOWED_GOOGLE_DOMAIN` (default `vac811.hu`) via a Google Sign-In
  interstitial the worker serves itself, checking the ID token's audience,
  `email_verified`, and hosted-domain/email-suffix match
  (`evaluateGoogleIdentity` in `workers/sveltia-cms-auth/index.js`), with an
  optional `ALLOWED_EMAILS` allowlist for restricting to specific editors.
- `workers/google-git-proxy` — the photo-curation proxy runs the same shape
  of check against `ALLOWED_DOMAIN` (default `vac811.hu`) and an optional
  `ALLOWED_EMAILS` allowlist (`verifyGoogle` in
  `workers/google-git-proxy/index.js`), before it will read or commit
  `gallery.json`.

Both checks run *inside* the Worker, after the request has already reached
Cloudflare's network and been routed to it. Cloudflare Access is a second,
independent layer *in front of* that: it can block a request before it's
even routed to the Worker, using Cloudflare's own SSO (which supports
Google as an identity provider, among others). It's defense-in-depth, not a
replacement — the app-level checks above stay exactly as they are either
way.

This is deliberately **not** implemented by verifying Access's JWT
(`Cf-Access-Jwt-Assertion`) inside the Worker's own code. Cloudflare Access
is configured entirely in the Zero Trust dashboard (or via Terraform/API
against the account) against a hostname/route — there's no `wrangler.toml`
setting that turns it on, and hand-rolling JWT verification in the Worker
would duplicate protection Cloudflare's edge already provides, while adding
real risk of getting the verification subtly wrong (audience checks, key
rotation, clock skew, etc.). So: dashboard configuration, not code.

## Prerequisites

- Cloudflare Access must be enabled on the account. The free tier covers up
  to 50 seats, which comfortably covers this project's editor list.
- The hostname you're protecting (the sveltia-cms-auth or google-git-proxy
  Worker's route, or its `workers.dev` hostname) must be reachable through
  Cloudflare — both already are, since they're deployed as Workers on
  routes/zones Cloudflare controls.

## Setup — step by step

Repeat this once per Worker you want to protect (typically
`sveltia-cms-auth` first, since it's the CMS's front door; optionally
`google-git-proxy` too).

1. Go to the **Zero Trust dashboard** (`https://one.dash.cloudflare.com/`),
   under the account that owns the `vac811.hu` zone / these Workers.
2. Navigate to **Access → Applications**.
3. Click **Add an application**.
4. Choose **Self-hosted**.
5. Set the **application domain** to the Worker's public hostname — either:
   - the custom route the Worker is deployed on (see the
     `[[routes]]` block in that Worker's `wrangler.toml`), or
   - the Worker's default `*.workers.dev` hostname (e.g.
     `sveltia-cms-auth.dudas-adam99.workers.dev`), if it isn't yet on a
     `vac811.hu` route.
6. Add a **policy**, e.g.:
   - **Allow** — Include: **Emails ending in** `@vac811.hu`, or
   - **Allow** — Include: a specific **Email** allowlist (one or more named
     editor addresses), mirroring the Worker's own `ALLOWED_EMAILS` list if
     one is set.
7. **Save** the application.
8. Repeat for `google-git-proxy`'s route/hostname if you want the same wall
   in front of the curation proxy too.

Once saved, an unauthenticated visitor to that hostname is redirected to
Cloudflare's own login page (backed by whichever identity provider you
configured — Google, one-time PIN by email, etc.) and never reaches the
Worker until they pass. Authenticated requests continue through to the
Worker exactly as before, where the existing app-level `ALLOWED_*` checks
described above still apply unchanged.

## Important: nothing in this repo activates Access

There is no `wrangler.toml` field or code change that turns Cloudflare
Access on — it is entirely a dashboard-side (or Terraform/API-side)
configuration against the Cloudflare account, layered in front of the
existing Worker routes. The one-line comments in
`workers/sveltia-cms-auth/wrangler.toml` and
`workers/google-git-proxy/wrangler.toml` just point back to this document;
they don't do anything by themselves.
