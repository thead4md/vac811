# sveltia-cms-auth (vac811 fork)

Cloudflare Worker that brokers the OAuth handshake Sveltia CMS uses to commit
to the repo, **gated behind a Google `@vac811.hu` sign-in** so editors never
need a GitHub account.

Forked from [`sveltia/sveltia-cms-auth`](https://github.com/sveltia/sveltia-cms-auth)
(MIT). The only functional change from upstream is Phase 5.2 of the roadmap:
a self-contained Google Sign-In gate inserted before the GitHub OAuth
exchange. The identity check mirrors [`workers/google-git-proxy`](../google-git-proxy/index.js),
so the CMS and the photo-curation tool enforce the same rule.

## Flow

```
Sveltia popup ──GET /auth──▶ Google Sign-In interstitial (this worker)
                                    │ editor signs in with @vac811.hu
                                    ▼
              ──POST /auth/continue──▶ verifyGoogle() ──ok──▶ 302 to GitHub OAuth
                                    │                              │
                                    │ fail → localized error       ▼
                              ◀──GET /callback── exchange code, postMessage token
```

Everything happens inside Sveltia's auth popup on this worker's origin, so the
final `postMessage` still reaches `window.opener` (Sveltia) unchanged.

## Deploy

```bash
cd workers/sveltia-cms-auth
npx wrangler deploy
npx wrangler secret put GOOGLE_CLIENT_ID       # OAuth 2.0 Web client id
npx wrangler secret put GITHUB_CLIENT_ID       # GitHub OAuth app id
npx wrangler secret put GITHUB_CLIENT_SECRET   # GitHub OAuth app secret
# optional: restrict to named editors
# npx wrangler secret put ALLOWED_EMAILS   (or set in wrangler.toml [vars])
```

Then, on the Google OAuth Web client:
- add this worker's deployed origin as an **Authorized JavaScript origin**.

And on the GitHub OAuth app:
- set the **Authorization callback URL** to `<worker-origin>/callback`.

Finally point Sveltia at it: `public/admin/config.yml` → `backend.base_url`.

See [`docs/google-sso-setup.md`](../../docs/google-sso-setup.md) for the full
rollout (this is "Scope 2") and the account-migration steps (Phase 5.3).

## Config

| Var | Where | Default | Meaning |
|-----|-------|---------|---------|
| `GOOGLE_CLIENT_ID` | secret/var | — | OAuth Web client id: ID-token audience + embedded in the sign-in page |
| `ALLOWED_GOOGLE_DOMAIN` | var | `vac811.hu` | Required Google hosted-domain / email domain |
| `ALLOWED_EMAILS` | var/secret | _(unset)_ | Optional comma-separated editor allowlist |
| `ALLOWED_DOMAINS` | var | — | Site `site_id` allowlist (upstream), `*` wildcard ok |
| `GITHUB_CLIENT_ID` / `GITHUB_CLIENT_SECRET` | secrets | — | GitHub OAuth app |
| `GITHUB_HOSTNAME` | var | `github.com` | GitHub host |

GitLab support is carried over from upstream but unused by this repo.

## Tests

`index.test.ts` covers the Google identity decision (`evaluateGoogleIdentity`),
`verifyGoogle`'s tokeninfo handling, and the request router (unsupported
backend, the Google gate blocking `/auth/continue`, CSRF on `/callback`). Run
with the repo-wide `npm test`.
