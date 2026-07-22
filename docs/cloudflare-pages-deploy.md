# Cloudflare Pages Deployment & Rollback

## Overview

`beta.vac811.hu` is deployed on Cloudflare Pages. This document covers:
- How deployments work and map to GitHub Actions
- Preview environments for pull requests
- Instant rollback procedure
- Accessing deployment history

## Deployments

### Production (`main` branch)

Push to `main` triggers `.github/workflows/deploy.yml`, which:
1. Runs tests and linting (`npm run lint`, `npm test`, `npm run validate:content`)
2. Builds the Vite dist (`npm run build`)
3. Deploys to Cloudflare Pages via `cloudflare/wrangler-action` (`wrangler pages
   deploy`), which also compiles the Pages Functions under `functions/` (the
   content KV fast-path — see `docs/content-kv-fast-path.md`)
   - Project: `vac811-beta`
   - Branch: `main`
4. Smoke-checks the deployed build (HTTP 200 on `/` and the main JS bundle)
5. Alerts on failure

Deploy time: ~5–8 minutes (test + build + upload + smoke check).

**Content-only pushes are excluded** (`paths-ignore: public/content/**`) — CMS
edits and bot content syncs go live via the Workers KV fast-path in ~1 minute
instead of triggering this full rebuild. See `docs/content-kv-fast-path.md`.

### Preview Deployments (Pull Requests)

Any PR to a non-`main` branch (e.g., `claude/vac811-beta-deploy-env-ydyu8v`) automatically builds a preview environment on Cloudflare Pages.

**Preview URL pattern:**
```
https://<branch-name>.<project-name>.pages.dev
```

Example: a PR on branch `claude/vac811-beta-deploy-env-ydyu8v` gets:
```
https://claude-vac811-beta-deploy-env-ydyu8v.vac811-beta.pages.dev
```

**Why preview deployments are useful:**
- Test CMS edits, curate changes, or content updates before they reach production
- Share a link with editors/reviewers to validate changes in a live environment
- No CI/CD friction — Pages builds every non-main branch automatically

The Pages GitHub integration must have the **production branch** set to `main` in the Cloudflare dashboard.

## Rollback

Cloudflare Pages retains every deployment, enabling instant rollback from the dashboard or API.

### Via Dashboard

1. Log in to [Cloudflare](https://dash.cloudflare.com/)
2. Navigate to **Pages** → **vac811-beta**
3. Click the **Deployments** tab
4. Find the deployment to roll back to (sorted newest-first by timestamp)
5. Click the **three-dot menu** next to that deployment and select **Rollback to this deployment**
6. Confirm; the deployment is live within seconds

### Via API

Roll back programmatically:
```bash
curl -X POST https://api.cloudflare.com/client/v4/accounts/{account_id}/pages/projects/{project_name}/deployments/{deployment_id}/rollback \
  -H "Authorization: Bearer {api_token}" \
  -H "Content-Type: application/json"
```

Replace `{account_id}`, `{project_name}`, `{deployment_id}`, and `{api_token}` with your values.

### No artifact dance

Unlike the old FTP setup, there is **no need to archive or manually redeploy** old builds. Every Pages deployment is immutable and retained — just roll back from the dashboard. Rackhost/FTP is obsolete.

## Deployment History

To inspect recent deployments:

1. **In Cloudflare dashboard:** Pages → vac811-beta → **Deployments** tab
   - Shows commit SHA, author, build time, duration, and status (Success/Failed)
   - Click any deployment to see its build logs

2. **In GitHub:** `.github/workflows/deploy.yml` runs
   - View run logs at github.com/thead4md/vac811/actions
   - Each successful run includes the Cloudflare deployment link in the summary

## Build Environment Variables

Cloudflare Pages injects build env vars from the project's **Build Settings** in the dashboard.

**Required for production:**
- `VITE_GOOGLE_CLIENT_ID` — OAuth client ID for Google SSO
- `VITE_PROXY_URL` — URL to the `google-git-proxy` Worker (e.g., `https://...workers.dev`)
- `VITE_IMAGE_CDN_URL` — URL to the `image-cdn` Worker

If these are missing, the Curate tool shows a "misconfigured" screen and Google SSO doesn't load.

To update: Cloudflare dashboard → Pages → vac811-beta → **Settings** → **Environment variables**.

## Smoke Check

The deploy workflow runs a smoke check after uploading to Pages:
1. Polls `https://beta.vac811.hu/` up to 5 times (10s between retries)
2. Verifies HTTP 200 and extracts the main JS bundle reference
3. Fetches the bundle and confirms HTTP 200
4. Fails the deployment if either check fails (triggering an alert)

If smoke check fails, the Pages deployment succeeded but the app is broken — rollback immediately.

## Web Analytics

Web Analytics (free, privacy-friendly) are enabled via Cloudflare's automatic beacon injection. No cookie banner required.

**CSP requirements:**
- `script-src` must include `https://static.cloudflareinsights.com`
- `connect-src` must include `https://cloudflareinsights.com`

Both are set in `public/_headers`. Enable analytics in Cloudflare dashboard (Pages → vac811-beta → **Analytics** tab or **Settings**).

## Troubleshooting

**"Page not found" after deploy:**
- Check smoke check logs in GitHub Actions (might have failed silently)
- Verify Pages build succeeded in Cloudflare dashboard (Deployments tab)
- If both passed, check that the `_redirects` rule exists (`/* → /index.html 200`)

**Env vars not appearing in the build:**
- Confirm they're set in Pages **Settings** → **Environment variables**
- Trigger a new deployment (push to main or use `wrangler pages deploy`)
- Check that the env var name matches the reference in code (case-sensitive)

**CSP violations in console:**
- Check `public/_headers` for the necessary script/connect-src entries
- Test that Cloudflare's beacon is reachable (use your browser DevTools Network tab)
- Redeploy after updating headers

## References

- [Cloudflare Pages Docs](https://developers.cloudflare.com/pages/)
- [Pages Deployments & Rollbacks](https://developers.cloudflare.com/pages/platform/deployments/)
- [Preview Deployments](https://developers.cloudflare.com/pages/platform/preview-deployments/)
- [Build Environment Variables](https://developers.cloudflare.com/pages/configuration/build-configuration/)
- [Content KV fast-path (Phase 4)](./content-kv-fast-path.md)
