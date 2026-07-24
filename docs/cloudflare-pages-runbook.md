# Cloudflare Pages: deploy, rollback, and preview runbook

`beta.vac811.hu` is served by Cloudflare Pages (project `vac811-beta`), deployed
from `.github/workflows/deploy.yml`. This replaced the old Rackhost FTP flow —
the capabilities below didn't exist before and aren't tribal knowledge yet.

## Production deploys

- Trigger: every push to `main` (or manual `workflow_dispatch`).
- Flow: `test` job (lint, content validation, `npm test`) → `deploy` job
  (`npm run build` with `VITE_*` vars injected from repo/org Actions
  variables → `cloudflare/pages-action` uploads `dist/` → smoke-check hits
  `https://beta.vac811.hu/` and its main JS bundle for `200`).
- The smoke-check parses the bundle filename straight out of the deployed
  `index.html` (`grep -oE '/assets/[^"]+\.js'`), so it isn't tied to a
  specific Vite chunk-naming scheme (it broke once already when the entry
  chunk was renamed from `index-*.js` to `app-*.js`).
- A failed workflow files/updates a GitHub issue labeled `workflow-failure`
  automatically (see the `Alert on failure` step).

## Rollback

Cloudflare Pages keeps **every** deployment — there is no `dist-<sha>`
artifact dance to restore from anymore (that step was removed from
`deploy.yml` during the migration). To roll back:

1. Cloudflare dashboard → **Workers & Pages → vac811-beta → Deployments**.
2. Find the last-known-good deployment and click **Rollback to this
   deployment** (or **Retry deployment** to redeploy it as-is).
3. Alternatively, via the API/`wrangler`: list deployments and re-promote one
   — see [Cloudflare's Pages rollback docs] for the exact API call.

Rollback is near-instant (edge config change, not a rebuild) and doesn't
require touching git history or re-running CI.

## PR preview deployments

Every pull request now gets its own Cloudflare Pages preview build via the
`preview` job in `deploy.yml`:

- Triggered on `pull_request` (any branch, targeting any base).
- Runs the same `test` job first, then builds and deploys with
  `branch: ${{ github.head_ref }}` instead of `main` — Cloudflare Pages
  treats any non-production branch as a preview deployment, so this never
  touches the live `beta.vac811.hu` site.
- The workflow posts (and updates, on re-push) a PR comment with the
  preview URL (`*.vac811-beta.pages.dev`).
- Use the preview URL as the test target for CMS (`/admin`) and Curate
  (`/admin/kuracio`) changes instead of only testing against live beta.

Concurrency: production and preview deploys use separate concurrency groups
(`pages-deploy-main` vs `pages-deploy-<PR number>`), so a preview build can't
block or be blocked by a production deploy. Preview runs cancel superseded
in-flight builds on the same PR; production runs queue instead of cancelling.

## Known gaps / follow-ups

- **CSP drift:** the live CSP response header includes allowances (e.g.
  Google Fonts, extra `sha256-` script hashes) that aren't present in this
  repo's `public/_headers`. This means something outside the repo — a
  Cloudflare dashboard Transform Rule, or a Pages project setting — is
  modifying response headers at the edge. Worth reconciling so
  `public/_headers` is the single source of truth; flagged here rather than
  guessed at, since it needs dashboard access to confirm.
- **Google SSO on Curate:** confirm `VITE_GOOGLE_CLIENT_ID` and
  `VITE_PROXY_URL` are set as GitHub Actions repo/org variables (see
  `docs/google-sso-setup.md`) — the production bundle previously shipped in
  the "misconfigured" state when these were unset.
