#!/usr/bin/env node
// Syncs the troop's Instagram posts into public/content/instagram.json via
// the official Instagram Graph API ("Instagram API with Instagram Login" —
// graph.instagram.com, no linked Facebook Page needed). Runs on a schedule
// (.github/workflows/sync-instagram-feed.yml) alongside the unrelated Drive
// curation pipeline (scripts/curate-gallery.mjs) — this script never touches
// gallery.json and does not require Anthropic/OpenAI/Google credentials.
//
// Required env vars:
//   INSTAGRAM_SYNC_ENDPOINT – full Graph API media-list URL, ID baked in, no
//                             token, e.g.
//                             https://graph.instagram.com/v25.0/<IG_USER_ID>/media?fields=id,caption,media_type,media_url,thumbnail_url,permalink,timestamp
//                             (get <IG_USER_ID> once via
//                             https://graph.instagram.com/v25.0/me?fields=user_id&access_token=<TOKEN>
//                             — see docs/instagram-sync-setup.md)
//   INSTAGRAM_SYNC_TOKEN     – long-lived (60-day) Instagram User access token
// Optional:
//   SYNC_LIMIT               – max posts to fetch (default 24)
//   DRY_RUN                  – 'true' to fetch and log without writing the file
//
// Resilience: a single malformed/incomplete post is logged and skipped, never
// aborts the whole sync (same convention as curate-gallery.mjs) — exits 0
// unless the API call itself fails (auth/network error), which should fail
// the workflow loudly rather than silently ship stale data.

import { writeFileSync, mkdirSync, renameSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = join(__dirname, '..');
const INSTAGRAM_PATH = join(ROOT, 'public', 'content', 'instagram.json');

const ENDPOINT = process.env.INSTAGRAM_SYNC_ENDPOINT;
const TOKEN = process.env.INSTAGRAM_SYNC_TOKEN;
const SYNC_LIMIT = Number(process.env.SYNC_LIMIT) || 24;
const DRY_RUN = process.env.DRY_RUN === 'true';

// Hungarian caption-keyword -> eventSlug inference (deterministic, no AI —
// see plan.md section 4.3). First matching rule wins; no match -> null (shown
// only in the flat Instagram feed/strip, not merged into a Drive event group).
const EVENT_KEYWORDS = [
  { slug: 'tabor', title: 'Tábor', keywords: ['tábor', 'nagytábor', 'nyári tábor'] },
  { slug: 'tura', title: 'Túrák és portyák', keywords: ['portya', 'túra', 'kirándulás'] },
  { slug: 'unnep', title: 'Ünnepek', keywords: ['fogadalom', 'mise', 'ünnepség'] },
  { slug: 'orsi-elet', title: 'Őrsi élet', keywords: ['raj', 'őrs', 'gyűlés', 'foglalkozás'] },
];

function inferEvent(caption) {
  if (!caption) return { eventSlug: null, eventTitle: null };
  const lower = caption.toLowerCase();
  for (const rule of EVENT_KEYWORDS) {
    if (rule.keywords.some((kw) => lower.includes(kw))) {
      return { eventSlug: rule.slug, eventTitle: rule.title };
    }
  }
  return { eventSlug: null, eventTitle: null };
}

function writeFileAtomic(path, contents) {
  const tmpPath = `${path}.tmp-${process.pid}`;
  writeFileSync(tmpPath, contents, 'utf-8');
  renameSync(tmpPath, path);
}

function normalizeItem(raw) {
  // Minimum viable fields — anything missing these is unusable as a tile.
  if (!raw?.id || !raw.permalink || !raw.media_type || (!raw.media_url && !raw.thumbnail_url)) {
    return null;
  }
  const mediaType = raw.media_type === 'VIDEO' ? 'video' : 'image';
  const { eventSlug, eventTitle } = inferEvent(raw.caption);
  const postedAt = raw.timestamp ?? new Date(0).toISOString();
  return {
    id: String(raw.id),
    imageUrl: raw.media_url ?? raw.thumbnail_url,
    thumbnailUrl: raw.thumbnail_url ?? undefined,
    caption: raw.caption ?? undefined,
    permalink: raw.permalink,
    mediaType,
    postedAt,
    eventSlug,
    eventTitle,
    year: new Date(postedAt).getUTCFullYear(),
  };
}

async function fetchInstagramMedia() {
  const url = new URL(ENDPOINT);
  url.searchParams.set('access_token', TOKEN);
  url.searchParams.set('limit', String(SYNC_LIMIT));

  const res = await fetch(url);
  if (!res.ok) {
    const body = await res.text();
    throw new Error(`Instagram Graph API ${res.status}: ${body.slice(0, 300)}`);
  }
  const json = await res.json();
  if (!Array.isArray(json.data)) {
    throw new Error(`Unexpected Instagram Graph API response shape: ${JSON.stringify(json).slice(0, 300)}`);
  }
  return json.data;
}

async function main() {
  if (!ENDPOINT || !TOKEN) {
    throw new Error('INSTAGRAM_SYNC_ENDPOINT and INSTAGRAM_SYNC_TOKEN are required');
  }

  const raw = await fetchInstagramMedia();
  console.log(`Fetched ${raw.length} Instagram media items`);

  const items = [];
  let skipped = 0;
  for (const rawItem of raw) {
    const item = normalizeItem(rawItem);
    if (item) items.push(item);
    else skipped++;
  }
  if (skipped > 0) console.log(`Skipped ${skipped} item(s) missing required fields`);

  items.sort((a, b) => b.postedAt.localeCompare(a.postedAt));

  if (DRY_RUN) {
    console.log('[DRY RUN] Would write public/content/instagram.json with', items.length, 'items');
    console.log(JSON.stringify({ instagram: items.slice(0, 3) }, null, 2));
    return;
  }

  mkdirSync(dirname(INSTAGRAM_PATH), { recursive: true });
  writeFileAtomic(INSTAGRAM_PATH, JSON.stringify({ instagram: items }, null, 2) + '\n');
  console.log(`Wrote ${items.length} items to public/content/instagram.json`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
