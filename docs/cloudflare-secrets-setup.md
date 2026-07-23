# Cloudflare Secrets & Environment Setup

This guide explains how to configure environment variables and KV namespace bindings for the vac811 Cloudflare Pages deployment.

## Overview

- **wrangler.toml**: Centralized configuration for bindings and environment setup
- **.env.production**: Production secrets (never commit to git)
- **.env.preview**: Preview/staging secrets (never commit to git)
- **.env.example**: Template with all required variables documented

Wrangler automatically loads `.env.production` and `.env.preview` when deploying to the respective environments.

---

## 1. KV Namespace Setup

The content fast-path requires a Workers KV namespace. Set it up once per environment:

### Create Namespaces

```bash
# Production namespace
wrangler kv namespace create CONTENT

# Preview/staging namespace
wrangler kv namespace create CONTENT --preview
```

This will print two namespace IDs. Update `wrangler.toml`:

```toml
[[kv_namespaces]]
binding = "CONTENT"
id = "YOUR_PRODUCTION_NAMESPACE_ID"
preview_id = "YOUR_PREVIEW_NAMESPACE_ID"
```

### Verify Binding

```bash
# Test that the binding works
wrangler pages deploy dist --project-name=vac811
```

The deployment output should confirm the KV binding is attached.

---

## 2. Environment Variables

### Setup Steps

1. **Copy the templates:**
   ```bash
   cp .env.example .env.production
   cp .env.example .env.preview
   ```

2. **Fill in each variable** (see sections below)

3. **Never commit** — both `.env.*` files are in `.gitignore`

4. **Deploy** — Wrangler will load the appropriate `.env.*` file based on the environment

### Variable Categories

#### API Keys & Auth

| Variable | Source | Notes |
|----------|--------|-------|
| `ANTHROPIC_API_KEY` | [console.anthropic.com](https://console.anthropic.com/keys) | For gallery AI scoring |
| `OPENAI_API_KEY` | [platform.openai.com](https://platform.openai.com/account/api-keys) | For preflight image filtering |
| `GOOGLE_SERVICE_ACCOUNT_KEY` | Google Cloud Console | JSON format; see [google-sso-setup.md](./google-sso-setup.md) |
| `GOOGLE_DRIVE_FOLDER_ID` | Your Google Drive | Folder ID from the Drive URL |
| `INSTAGRAM_SYNC_ENDPOINT` | Facebook App Dashboard | Graph API endpoint; see [instagram-sync-setup.md](./instagram-sync-setup.md) |
| `INSTAGRAM_SYNC_TOKEN` | Facebook App Dashboard | 60-day token; requires refresh every 2 months |
| `ECSET_USERNAME` | ECSET administrator | Scout roster system credentials |
| `ECSET_PASSWORD` | ECSET administrator | Scout roster system credentials |
| `ECSET_TOTP_SECRET` | ECSET setup | Base32-encoded 2FA secret |

#### Build-time Client Variables (VITE_*)

These are baked into the build and visible in the browser:

| Variable | Value | Where to Get |
|----------|-------|--------------|
| `VITE_GOOGLE_CLIENT_ID` | OAuth 2.0 Client ID | Google Cloud Console → Credentials |
| `VITE_PROXY_URL` | Google Drive proxy worker URL | Deploy `workers/google-git-proxy/` first |
| `VITE_IMAGE_CDN_URL` | Image CDN worker URL | Deploy `workers/image-cdn/` first |

#### Gallery Curation Config

| Variable | Default | Purpose |
|----------|---------|---------|
| `GALLERY_PREFLIGHT_BUDGET` | 600 | gpt-4o-mini tokens per run |
| `GALLERY_HAIKU_BUDGET` | 600 | Claude Haiku tokens per run |
| `GALLERY_PREFLIGHT_INTERVAL_MS` | 1100 | ms between OpenAI requests (rate limiting) |

---

## 3. Deployment

### Production Deploy

```bash
# Load .env.production and deploy to main
wrangler pages deploy dist --project-name=vac811 --branch=main
```

### Preview Deploy

```bash
# Load .env.preview and deploy to a preview branch
wrangler pages deploy dist --project-name=vac811 --branch=preview
```

### GitHub Actions

The CI/CD pipeline in `.github/workflows/deploy.yml` handles this automatically:
- Loads `.env.production` for main branch deployments
- Secrets are GitHub repo secrets, passed to the build step

---

## 4. Rotating Secrets

### Instagram Token (60-day expiry)

See [instagram-sync-setup.md](./instagram-sync-setup.md) — the workflow sends a reminder 2x/month.

**To refresh:**
1. Generate new token in Facebook App Dashboard
2. Update `.env.production` and `.env.preview`
3. Redeploy: `wrangler pages deploy`

### Other API Keys

When rotating any key:
1. Generate new key in the service's dashboard
2. Update `.env.production` and `.env.preview`
3. Redeploy to make it live

---

## 5. Troubleshooting

### "KV binding not found" error

Check that `wrangler.toml` has the correct namespace IDs and that the namespace exists:

```bash
wrangler kv namespace list
```

### "Missing environment variable" error

Ensure the variable is in the correct `.env.*` file for the branch you're deploying:
- `main` branch → uses `.env.production`
- `preview` branch → uses `.env.preview`

### Secrets visible in logs

If a secret appears in GitHub Actions logs:
1. Rotate it immediately
2. Remove it from logs (GitHub provides a way to delete logs)
3. Never use plain text secrets in logs — always mask them with `::add-mask::`

---

## 6. Security Notes

- ✅ `.env.*` files are gitignored and never committed
- ✅ Use separate credentials for production and preview environments
- ✅ Rotate API keys regularly
- ✅ Keep the ECSET TOTP secret secure — it's time-sensitive and can't be recovered
- ✅ Use OAuth flows instead of storing user passwords when possible

---

## References

- [wrangler docs: Environment Variables](https://developers.cloudflare.com/workers/configuration/environment-variables/)
- [wrangler docs: KV Bindings](https://developers.cloudflare.com/workers/runtime-apis/kv/)
- [Cloudflare Pages: Environment Variables](https://developers.cloudflare.com/pages/configuration/build-configuration/#environment-variables)
