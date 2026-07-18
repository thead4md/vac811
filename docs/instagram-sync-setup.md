# Instagram sync setup

## Why this replaced the Behold widget

`/galeria` used to embed a third-party [Behold.so](https://behold.so) widget
(`src/components/InstagramWall.tsx`, now removed) to show the troop's recent
Instagram posts. Behold is a paid service; this sync pipeline instead pulls
posts directly from Meta's own **Instagram Graph API** (free, no third-party
middleman, no branding) into `public/content/instagram.json`
(`scripts/sync-instagram-feed.mjs`, run every 6h by
`.github/workflows/sync-instagram-feed.yml`), the same way
`scripts/curate-gallery.mjs` already mirrors Google Drive photos.

This is the **official, current (2026) Instagram API** — Instagram's old
"Basic Display API" was fully shut down December 4, 2024. The path used here,
**"Instagram API with Instagram Login"**, does not require linking a Facebook
Page, and reading your own account's posts only needs **Standard Access** — no
Meta App Review, no Business Verification.

## One-time setup

1. In the Instagram app: **Settings → Account type** → make sure the troop's
   account (`@811szentjozsef`) is a **Business or Creator** (Professional)
   account. Personal accounts can't be read by any current API.
2. Go to [developers.facebook.com](https://developers.facebook.com), sign in
   with a personal Facebook account, **My Apps → Create App**. Choose the
   **Business** app type (required) and name it, e.g. "Troop 811 Gallery Sync".
3. In the App Dashboard: **Add Product → Instagram**.
4. Left menu: **Instagram → API setup with Instagram login**. Follow the
   on-screen checklist (the `instagram_business_basic` permission is added by
   default).
5. Click **Add an Instagram Account**, and log in with the troop's Instagram
   Business/Creator username and password — this links *and* authorizes the
   account in one step.
6. Click **Generate token** next to the linked account. Copy the resulting
   **long-lived access token** (valid 60 days) — this is `INSTAGRAM_SYNC_TOKEN`
   below.
7. Paste this URL into a browser tab, substituting the token, to get the
   numeric Instagram user ID:
   ```
   https://graph.instagram.com/v25.0/me?fields=user_id&access_token=<TOKEN>
   ```
8. Build the full endpoint URL with that ID baked in (no token in it — the
   script appends the token at request time):
   ```
   https://graph.instagram.com/v25.0/<IG_USER_ID>/media?fields=id,caption,media_type,media_url,thumbnail_url,permalink,timestamp
   ```
9. Add both as **repo secrets** (Settings → Secrets and variables → Actions):
   - `INSTAGRAM_SYNC_ENDPOINT` — the URL from step 8
   - `INSTAGRAM_SYNC_TOKEN` — the token from step 6
10. Run the workflow once manually with `dry_run: true`
    (Actions → Sync Instagram Feed → Run workflow) and check the logged output
    before letting it commit real data on the schedule.

Two things Meta's dashboard may present slightly differently than described
above (button labels/wizard steps can shift): if you hit a wall, the
[Instagram API with Instagram Login docs](https://developers.facebook.com/docs/instagram-platform/instagram-api-with-instagram-login/get-started/)
are the source of truth.

## Refreshing the token

`INSTAGRAM_SYNC_TOKEN` expires 60 days after it's generated and does **not**
refresh itself — this pipeline deliberately does not auto-rewrite its own
GitHub secret (that would need a standing high-privilege credential this repo
doesn't otherwise have; see the sync workflow's top comment for why). Instead:

- The workflow opens a **GitHub issue** twice a month (1st and 16th) titled
  "Instagram sync token due for refresh" as a reminder.
- To refresh: repeat **steps 6–9** above (you don't need to recreate the app —
  just click **Generate token** again on the same Instagram → API setup page)
  and update the `INSTAGRAM_SYNC_TOKEN` secret. ~2 minutes, no code changes.
- If the token *does* fully expire, the sync workflow's Instagram API call
  fails loudly (non-zero exit, clear log message, opens a `workflow-failure`
  issue) rather than silently going stale.

## If this ever becomes too much to maintain

Two free/cheap fallbacks were evaluated and are worth revisiting if the manual
refresh step becomes a real burden:

- **[Feedframer](https://feedframer.com)** — closest architectural match to
  this pipeline (a headless REST/GraphQL/RSS API you fetch yourself, no
  vendor-rendered widget), free for 1 account/6 posts, $6/mo for more.
- **[LightWidget](https://lightwidget.com)** — the only widget found with
  zero forced branding even on its free tier, but it's a plain `<iframe>`
  embed (less layout control) and needs a one-time $15 add-on to work over
  HTTPS.

Both still require the same one-time Instagram Business/Creator OAuth
connection as this pipeline — there's no branding-free option that skips that.

## Content shape

`public/content/instagram.json`: `{ "instagram": GalleryItem[] }`, see
`InstagramFeedItem` in `src/types/gallery.ts` and `instagramItemSchema` in
`src/schemas/content.ts`. `eventSlug`/`eventTitle` are inferred from Hungarian
caption keywords (`scripts/sync-instagram-feed.mjs`'s `EVENT_KEYWORDS`) so
matching posts join the relevant Drive event group on `/galeria`; unmatched
posts still show in the flat "Legfrissebb Instagramról" strip.
