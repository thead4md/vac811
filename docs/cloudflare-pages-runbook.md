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

This is already handled — **no changes needed in this repo.** The Cloudflare
Pages project (`vac811`) has its own **Git integration** connected directly
(the `cloudflare-workers-and-pages[bot]` GitHub App), independent of
`deploy.yml`. Every push to every branch — including PR branches — gets
built and deployed automatically by Cloudflare itself, which then posts a
PR comment with two URLs:

- a **per-commit** preview URL (`https://<hash>.vac811.pages.dev`)
- a stable **per-branch** preview URL (`https://<branch-slug>.vac811.pages.dev`)

Use either as the test target for CMS (`/admin`) and Curate
(`/admin/kuracio`) changes instead of only testing against live beta.

We deliberately did **not** add a second, Actions-driven preview job for
this — the Cloudflare GitHub App already builds and deploys every PR branch
on its own, so an Actions-based `pages-action` preview step would just be a
redundant, competing deployment of the same branch to the same project.

### Open question worth resolving with the project owner

Since Git integration deploys **every** push (including to `main`), and
`deploy.yml`'s `deploy` job *also* runs `cloudflare/pages-action` on every
push to `main`, production may currently be getting deployed **twice** per
push through two independent mechanisms. This wasn't introduced by this
runbook — it predates it — but it's worth confirming with whoever manages
the Cloudflare dashboard whether Git integration should be disabled (keeping
Actions as the single source of truth, so `npm ci`/lint/test gate every
deploy) or whether the Actions-based `deploy` job should be retired in favor
of just the Git integration (losing the lint/test/content-validation gate
and the smoke-check, unless replicated as an integration build step).

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
