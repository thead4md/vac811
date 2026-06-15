#!/usr/bin/env node
// ML-curated gallery: walk recent year folders in the shared Google Drive,
// score each new photo with Claude vision, and keep the best few per event as
// *candidates* (approved:false) in public/content/gallery.json. A human then
// approves them in Decap CMS before they appear on the site.
//
// Required env vars:
//   GOOGLE_SERVICE_ACCOUNT_KEY – Google service account JSON (full contents)
//   GOOGLE_DRIVE_FOLDER_ID     – ID of the root "811 Galéria" Drive folder
//   ANTHROPIC_API_KEY          – Claude API key (vision scoring)
// Optional:
//   GALLERY_YEARS              – comma-separated year folders to process
//                                (default: current year + previous year)
//   GALLERY_MAX_PRIMARY_EVENT  – cap for the primary (largest) event (default 12)
//   GALLERY_MAX_PER_EVENT      – cap for every minor event (default 1)
//   GALLERY_SCORE_THRESHOLD    – minimum score for primary events (default 70)
//   GALLERY_MINOR_THRESHOLD    – minimum score for minor events (default 80)
//   GALLERY_PRIMARY_KEYWORDS   – comma-separated Hungarian keywords to force-classify
//                                an event as primary (default "tábor,táborozás,nyári")
//   GALLERY_MODEL              – Claude model id (default claude-haiku-4-5)
//   GALLERY_PREFLIGHT_MODEL    – OpenAI model for binary pre-filter; omit to skip
//                                (default "gpt-4o-mini" when OPENAI_API_KEY is set)
//   OPENAI_API_KEY             – OpenAI API key (required for pre-filter)
//   GALLERY_PREFLIGHT_BUDGET   – hard cap on OpenAI preflight calls per run (default 200)
//   GALLERY_HAIKU_BUDGET       – hard cap on Claude Haiku scoring calls per run (default 120)
//   GALLERY_CONCURRENCY        – max images hashed/scored in parallel (default 6)
//   GALLERY_DEDUP_DISTANCE     – max dHash Hamming distance treated as a near-duplicate (default 10)
//
// Resumability:
//   Every Drive image the pipeline finishes deciding about (kept, skipped,
//   below-threshold, unsuitable, errored, or scored-but-not-picked) is recorded
//   in public/content/gallery-pipeline-state.json so it is never re-fetched or
//   re-charged on a later run. A re-run over an unchanged Drive is a no-op.
//   When a per-run budget cap is hit the run flushes progress and exits 0 (a
//   partial run is success); the next run resumes from where it stopped.
//
// gallery.json item schema:
//   { id, name, year, event, activity, bucket, score, reason, status, approved, phash }
//   - id:       Google Drive file ID (CDN image URL is built from this)
//   - name:     AI-suggested caption (editable in CMS) — used as the caption
//   - year:     year folder the photo came from
//   - event:    event folder name (for context in the CMS)
//   - activity: free-form Hungarian activity label from Claude (e.g. "tábor")
//   - bucket:   normalized activity bucket used for diversity selection
//   - score:    0–100 scouting-relevance score from Claude
//   - reason:   one-line justification (CMS hint)
//   - status:   'pending' | 'approved' | 'rejected' — set in the /kuracio swipe app
//   - approved: kept in sync with status==='approved' (legacy field, still read by the site)
//   - phash:    dHash of the photo, used for cross-run near-duplicate detection

import { writeFileSync, readFileSync, mkdirSync, existsSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';
import Anthropic from '@anthropic-ai/sdk';
import { z } from 'zod';
import { zodOutputFormat } from '@anthropic-ai/sdk/helpers/zod';
import { GoogleAuth } from 'google-auth-library';
import sharp from 'sharp';
import { bucketActivity, diversePick, mapPool, hamming, clusterByHash, dHash } from './curate-lib.mjs';

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = join(__dirname, '..');
const GALLERY_PATH = join(ROOT, 'public', 'content', 'gallery.json');
const STATE_PATH = join(ROOT, 'public', 'content', 'gallery-pipeline-state.json');

const FOLDER_ID = process.env.GOOGLE_DRIVE_FOLDER_ID;

if (!process.env.GOOGLE_SERVICE_ACCOUNT_KEY || !FOLDER_ID) {
  console.error('Missing GOOGLE_SERVICE_ACCOUNT_KEY or GOOGLE_DRIVE_FOLDER_ID');
  process.exit(1);
}
if (!process.env.ANTHROPIC_API_KEY) {
  console.error('Missing ANTHROPIC_API_KEY');
  process.exit(1);
}

const auth = new GoogleAuth({
  credentials: JSON.parse(process.env.GOOGLE_SERVICE_ACCOUNT_KEY),
  scopes: ['https://www.googleapis.com/auth/drive.readonly'],
});
let _accessToken = null;
async function getAccessToken() {
  if (!_accessToken) {
    const client = await auth.getClient();
    const tokenResponse = await client.getAccessToken();
    _accessToken = tokenResponse.token;
  }
  return _accessToken;
}

const MODEL = process.env.GALLERY_MODEL || 'claude-haiku-4-5';
const MAX_PRIMARY = Number(process.env.GALLERY_MAX_PRIMARY_EVENT || 12);
const MAX_MINOR = Number(process.env.GALLERY_MAX_PER_EVENT || 1); // was global cap (default 4) — now minor-only
const SCORE_THRESHOLD = Number(process.env.GALLERY_SCORE_THRESHOLD || 50);
const MINOR_THRESHOLD = Number(process.env.GALLERY_MINOR_THRESHOLD || 80);
const PRIMARY_KEYWORDS = (process.env.GALLERY_PRIMARY_KEYWORDS || 'tábor,táborozás,nyári')
  .split(',')
  .map((s) => s.trim().toLowerCase())
  .filter(Boolean);
const PREFLIGHT_MODEL = process.env.GALLERY_PREFLIGHT_MODEL ||
  (process.env.OPENAI_API_KEY ? 'gpt-4o-mini' : null);
const OPENAI_API_KEY = process.env.OPENAI_API_KEY || null;
const PREFLIGHT_BUDGET = Number(process.env.GALLERY_PREFLIGHT_BUDGET || 200);
const HAIKU_BUDGET = Number(process.env.GALLERY_HAIKU_BUDGET || 120);
const CONCURRENCY = Math.max(1, Number(process.env.GALLERY_CONCURRENCY || 6));
const DEDUP_DISTANCE = Number(process.env.GALLERY_DEDUP_DISTANCE || 10);
const MAX_RECURSION_DEPTH = 2; // year → event → (person)

if (PREFLIGHT_MODEL && !OPENAI_API_KEY) {
  console.error('GALLERY_PREFLIGHT_MODEL is set but OPENAI_API_KEY is missing');
  process.exit(1);
}

const FOLDER_MIME = 'application/vnd.google-apps.folder';
const IMAGE_MIME_TYPES = new Set([
  'image/jpeg',
  'image/png',
  'image/webp',
  'image/gif',
  'image/heic',
]);

const anthropic = new Anthropic();

// Free-form `activity` (not an enum): the model writes a short label in its own
// words and code normalizes it into a bucket for diversity. This can never fail
// validation, so a single image is never lost to a labeling technicality.
const ScoreSchema = z.object({
  score: z.number().describe('Scouting relevance and website value 0–100: how well does this represent the spirit, activities, and atmosphere of the scout troop?'),
  caption: z.string().describe('Short, natural Hungarian caption describing the activity or moment shown'),
  activity: z.string().describe('One or two Hungarian words naming the main activity or scene (e.g. "tábor", "túra", "tábortűz", "kézműves foglalkozás", "ünnepség", "természet", "csapatprogram"). Free text — pick whatever best fits.'),
  suitableForPublicYouthSite: z.boolean().describe('Appropriate and flattering for a public youth-organization gallery?'),
});


const SCORE_PROMPT = `Te egy magyar cserkészcsapat (811. Szent József) nyilvános weboldalának fotókurátora vagy.
A galéria célja: megmutatni az embereknek, milyen a cserkészélet — programok, természet, közösség, élmények.
A képek technikailag már rendben vannak. A kérdés az: MENNYIRE ÉRDEMES FELTENNI AZ OLDALRA?

Értékelési szempontok (0–100 pont):
- Jól látható cserkészélmény, tevékenység vagy hangulat (tábor, túra, tábortűz, foglalkozás, ünnepség)?
- Közösségi pillanat, csapategység, öröm, kaland, természetközelség?
- Egy látogató megérti-e belőle, milyen ez a csapat?

Levonj pontot, ha:
- Semmi cserkészre jellemző nem látszik (pl. valaki csak áll, random tárgyak)
- Nagyon hasonlít egy másik, tipikus csoportképre (duplikátum-jelleg)
- Nem alkalmas nyilvános ifjúsági oldalra (kínos, magánjellegű)

Adj egy 0–100 pontszámot és egy rövid, természetes magyar képaláírást.`;

const PREFLIGHT_PROMPT = `You are a curator for a Hungarian scout troop's public website gallery.
The photos are already technically good. Your job is to filter out shots that add NO value to the gallery.

Reply with KEEP or SKIP only — no other text.

SKIP only if:
- No scouting context visible: a person just standing/sitting doing nothing, random objects, food without scouts, administrative/indoor logistics shot
- Obviously a near-identical duplicate of a standard posed group photo
- Clearly not suitable for a public youth website (embarrassing, private moment)

KEEP if there is any scouting activity, outdoor/nature scene, group moment, emotion, or atmosphere visible — even partially.
When in doubt, reply KEEP.`;

async function driveList(parentId) {
  const token = await getAccessToken();
  const q = encodeURIComponent(`'${parentId}' in parents and trashed = false`);
  const fields = encodeURIComponent('files(id,name,mimeType),nextPageToken');
  // supportsAllDrives + includeItemsFromAllDrives are required when the folder
  // lives in a Shared Drive; without them the API returns an empty list.
  const baseUrl = `https://www.googleapis.com/drive/v3/files?q=${q}&fields=${fields}&pageSize=1000&supportsAllDrives=true&includeItemsFromAllDrives=true`;
  const files = [];
  let pageToken = null;
  do {
    const url = pageToken ? `${baseUrl}&pageToken=${pageToken}` : baseUrl;
    const res = await fetch(url, { headers: { Authorization: `Bearer ${token}` } });
    if (!res.ok) {
      const body = await res.text();
      throw new Error(`Drive API error ${res.status}: ${body}`);
    }
    const json = await res.json();
    files.push(...(json.files ?? []));
    pageToken = json.nextPageToken ?? null;
  } while (pageToken);
  return files;
}

function cdnUrl(fileId, width = 512) {
  return `https://lh3.googleusercontent.com/d/${fileId}=w${width}`;
}

// Download a small thumbnail and compute its dHash for near-duplicate detection.
// No API cost (plain CDN fetch); returns null on any network/decode failure so a
// hashless image simply gets its own cluster rather than aborting the run.
async function hashImage(fileId) {
  try {
    const res = await fetch(cdnUrl(fileId, 256));
    if (!res.ok) return null;
    const buf = Buffer.from(await res.arrayBuffer());
    return await dHash(sharp, buf);
  } catch {
    return null;
  }
}

// Returns true if the event name matches a primary keyword or the auto-detected primary.
function isPrimary(eventName, detectedPrimary) {
  const lower = (eventName ?? '').toLowerCase();
  if (PRIMARY_KEYWORDS.some((k) => lower.includes(k))) return true;
  return eventName === detectedPrimary;
}

// Detect the dominant event for a year: the largest event if it has at least
// 2× the image count of the second-largest. Returns null if no clear winner.
function detectPrimaryEvent(byEvent) {
  const sorted = [...byEvent.entries()]
    .map(([event, imgs]) => ({ event, count: imgs.length }))
    .sort((a, b) => b.count - a.count);
  if (sorted.length < 2) return null;
  const [first, second] = sorted;
  if (first.count >= second.count * 2) return first.event;
  return null;
}

// OpenAI vision binary pre-filter: returns true → proceed to Haiku, false → skip.
async function quickScoreImage(fileId) {
  // Pass the CDN URL directly so OpenAI fetches it — this activates detail:'low'
  // (85 tokens flat) instead of the ~2900-token cost of base64 data URIs.
  const imageUrl = cdnUrl(fileId, 512);

  let res;
  try {
    res = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${OPENAI_API_KEY}`,
      },
      body: JSON.stringify({
        model: PREFLIGHT_MODEL,
        messages: [{
          role: 'user',
          content: [
            { type: 'image_url', image_url: { url: imageUrl, detail: 'low' } },
            { type: 'text', text: PREFLIGHT_PROMPT },
          ],
        }],
        max_tokens: 10,
        temperature: 0,
      }),
    });
  } catch (err) {
    console.warn(`    [preflight] OpenAI API error for ${fileId}: ${err.message} — defaulting to KEEP`);
    return true;
  }

  if (res.status === 429) {
    const retryAfter = Number(res.headers.get('retry-after') || 0);
    const delay = retryAfter > 0 ? retryAfter * 1000 : 10_000;
    console.warn(`    [preflight] OpenAI 429 for ${fileId} — waiting ${delay / 1000}s then retrying`);
    await new Promise((r) => setTimeout(r, delay));
    return quickScoreImage(fileId);
  }

  if (!res.ok) {
    const body = await res.text();
    console.warn(`    [preflight] OpenAI ${res.status} for ${fileId}: ${body.slice(0, 120)} — defaulting to KEEP`);
    return true;
  }

  const json = await res.json();
  const text = (json.choices?.[0]?.message?.content ?? 'KEEP').trim().toUpperCase();
  return !text.startsWith('SKIP');
}

// Recursively collect image files under a folder, tracking the top-level event name.
async function collectImages(folderId, eventName, depth, out) {
  const entries = await driveList(folderId);
  for (const entry of entries) {
    if (entry.mimeType === FOLDER_MIME) {
      if (depth < MAX_RECURSION_DEPTH) {
        // First level below the year folder defines the event name.
        const nextEvent = eventName ?? entry.name;
        await collectImages(entry.id, nextEvent, depth + 1, out);
      }
    } else if (IMAGE_MIME_TYPES.has(entry.mimeType)) {
      out.push({ id: entry.id, event: eventName ?? 'Egyéb' });
    }
  }
}

async function scoreImage(fileId) {
  const response = await anthropic.messages.parse({
    model: MODEL,
    max_tokens: 1024,
    system: [
      {
        type: 'text',
        text: SCORE_PROMPT,
        cache_control: { type: 'ephemeral' },
      },
    ],
    messages: [
      {
        role: 'user',
        content: [
          { type: 'image', source: { type: 'url', url: cdnUrl(fileId) } },
        ],
      },
    ],
    output_config: { format: zodOutputFormat(ScoreSchema) },
  });
  if (!response.parsed_output) throw new Error('Claude returned unparseable response');
  return response.parsed_output;
}

function loadExisting() {
  if (!existsSync(GALLERY_PATH)) return { gallery: [] };
  try {
    const json = JSON.parse(readFileSync(GALLERY_PATH, 'utf-8'));
    return { gallery: Array.isArray(json.gallery) ? json.gallery : [] };
  } catch {
    return { gallery: [] };
  }
}

// Persistent "seen" state: the authoritative set of Drive IDs the pipeline has
// already decided about. Tolerates a missing/malformed file by resetting.
function loadState() {
  if (!existsSync(STATE_PATH)) return { seenIds: [], lastRun: null, runCount: 0, hashes: {} };
  try {
    const json = JSON.parse(readFileSync(STATE_PATH, 'utf-8'));
    return {
      seenIds: Array.isArray(json.seenIds) ? json.seenIds : [],
      lastRun: json.lastRun ?? null,
      runCount: Number(json.runCount) || 0,
      // hashes: { [keptId]: phash } — dHashes of already-kept photos so future
      // runs can drop new burst shots that duplicate something already published.
      hashes: json.hashes && typeof json.hashes === 'object' ? json.hashes : {},
    };
  } catch {
    return { seenIds: [], lastRun: null, runCount: 0, hashes: {} };
  }
}

function saveState(seenSet, runCount, hashes) {
  const state = {
    seenIds: [...seenSet],
    lastRun: new Date().toISOString(),
    runCount,
    hashes,
  };
  mkdirSync(dirname(STATE_PATH), { recursive: true });
  writeFileSync(STATE_PATH, JSON.stringify(state, null, 2) + '\n', 'utf-8');
}

// Normalize an item to carry an explicit tri-state `status` while keeping the
// legacy `approved` boolean in sync. Older entries (pre-status) are migrated by
// reading their `approved` flag; everything new is written as `pending`.
function normalizeStatus(item) {
  const status = item.status
    ?? (item.approved === true ? 'approved' : 'pending');
  return { ...item, status, approved: status === 'approved' };
}

function saveGallery(items) {
  const rank = { approved: 2, pending: 1, rejected: 0 };
  const sorted = items.map(normalizeStatus).sort((a, b) => {
    if (String(b.year) !== String(a.year)) return String(b.year).localeCompare(String(a.year));
    if (rank[b.status] !== rank[a.status]) return rank[b.status] - rank[a.status];
    return (b.score ?? 0) - (a.score ?? 0);
  });
  mkdirSync(dirname(GALLERY_PATH), { recursive: true });
  writeFileSync(GALLERY_PATH, JSON.stringify({ gallery: sorted }, null, 2) + '\n', 'utf-8');
}

async function main() {
  const now = new Date();
  const currentYear = now.getUTCFullYear();
  const years = process.env.GALLERY_YEARS
    ? process.env.GALLERY_YEARS.split(',').map((s) => s.trim()).filter(Boolean)
    : [String(currentYear), String(currentYear - 1)];

  console.log(`Curating years: ${years.join(', ')} (model: ${MODEL})`);
  console.log(`Caps: primary=${MAX_PRIMARY}, minor=${MAX_MINOR} | Thresholds: primary>=${SCORE_THRESHOLD}, minor>=${MINOR_THRESHOLD}`);
  console.log(`Primary keywords: ${PRIMARY_KEYWORDS.join(', ')}`);
  if (PREFLIGHT_MODEL) {
    console.log(`Preflight enabled: ${PREFLIGHT_MODEL} — probing API…`);
    const probeRes = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${OPENAI_API_KEY}` },
      body: JSON.stringify({
        model: PREFLIGHT_MODEL,
        messages: [{ role: 'user', content: 'Reply with OK.' }],
        max_tokens: 5,
      }),
    });
    if (!probeRes.ok) {
      const body = await probeRes.text();
      console.error(`Preflight probe failed (${probeRes.status}): ${body.slice(0, 200)}`);
      console.error('Fix OPENAI_API_KEY or re-run with preflight=false');
      process.exit(1);
    }
    console.log('Preflight probe OK.');
  } else {
    console.log('Preflight disabled (set OPENAI_API_KEY to enable)');
  }

  const existing = loadExisting();
  const liveGallery = [...existing.gallery];
  const knownIds = new Set(liveGallery.map((i) => i.id));

  const newCandidates = [];
  let totalPreflightSeen = 0;
  let totalPreflightSkipped = 0;
  let totalFetched = 0;
  let totalDeduped = 0;
  let openaiCalls = 0;
  let claudeCalls = 0;
  let budgetHit = false;

  // `seen` is the authoritative set of Drive IDs already decided about. It folds
  // in both prior-run state and every kept candidate in gallery.json, so it is
  // the single source of truth for "skip on the next run". We mark IDs into it
  // at every decision point and persist the whole set incrementally.
  const state = loadState();
  const runCount = state.runCount + 1;
  const seen = new Set([...state.seenIds, ...knownIds]);
  const initialSeenSize = seen.size;
  // dHashes of already-kept photos; grows as we keep new representatives and is
  // persisted so future runs can drop new burst shots that duplicate them.
  const keptHashes = { ...state.hashes };
  // Cross-run dedup references (kept photos) — new fresh images are matched
  // against these before being scored.
  const priorRefs = Object.entries(state.hashes).map(([id, phash]) => ({ id, phash }));
  console.log(`Resume state: ${state.seenIds.length} seen id(s), ${priorRefs.length} kept hash(es) from ${state.runCount} prior run(s); budgets: preflight<=${PREFLIGHT_BUDGET}, haiku<=${HAIKU_BUDGET}; concurrency=${CONCURRENCY}, dedup<=${DEDUP_DISTANCE}`);

  // Atomic budget reservations — checked synchronously (no await in between) so
  // concurrent scoring tasks can never overshoot a cap. Return false once spent.
  const reservePreflight = () => {
    if (openaiCalls >= PREFLIGHT_BUDGET) { budgetHit = true; return false; }
    openaiCalls++; return true;
  };
  const reserveHaiku = () => {
    if (claudeCalls >= HAIKU_BUDGET) { budgetHit = true; return false; }
    claudeCalls++; return true;
  };

  // Map year name → folder id
  const rootFolders = await driveList(FOLDER_ID);
  const yearFolderByName = new Map(
    rootFolders
      .filter((f) => f.mimeType === FOLDER_MIME)
      .map((f) => [f.name.trim(), f.id]),
  );

  const logSummary = () => {
    console.log('RUN_SUMMARY ' + JSON.stringify({
      years,
      fetched: totalFetched,
      deduped: totalDeduped,
      preflightSkipped: totalPreflightSkipped,
      scored: claudeCalls,
      kept: newCandidates.length,
      openaiCalls,
      claudeCalls,
      budgetHit,
      seenTotal: seen.size,
    }));
  };

  yearLoop:
  for (const year of years) {
    const yearFolderId = yearFolderByName.get(year);
    if (!yearFolderId) {
      console.warn(`  Year folder "${year}" not found – skipping`);
      continue;
    }

    // Collect all images for this year, grouped under their event name.
    const images = [];
    await collectImages(yearFolderId, null, 0, images);
    const fresh = images.filter((img) => !seen.has(img.id));
    totalFetched += fresh.length;
    console.log(`\n  ${year}: ${images.length} image(s), ${fresh.length} new to score`);

    // Group fresh images by event.
    const byEvent = new Map();
    for (const img of fresh) {
      if (!byEvent.has(img.event)) byEvent.set(img.event, []);
      byEvent.get(img.event).push(img);
    }

    // Classify primary event for this year.
    const detectedPrimary = detectPrimaryEvent(byEvent);
    const keywordPrimaries = [...byEvent.keys()].filter((e) =>
      PRIMARY_KEYWORDS.some((k) => e.toLowerCase().includes(k))
    );
    const effectivePrimary = keywordPrimaries.length > 0
      ? keywordPrimaries.join(', ')
      : (detectedPrimary ?? 'none — all treated as minor');
    console.log(`  Primary event for ${year}: "${effectivePrimary}"`);

    for (const [event, imgs] of byEvent) {
      const primary = isPrimary(event, detectedPrimary);
      const cap = primary ? MAX_PRIMARY : MAX_MINOR;
      const threshold = primary ? SCORE_THRESHOLD : MINOR_THRESHOLD;

      // Stage 1: hash every fresh image (concurrent, no API cost), then cluster
      // near-duplicates. Only one representative per burst is scored; the rest
      // are a terminal "duplicate" decision (marked seen, never re-charged).
      const hashes = await mapPool(imgs, CONCURRENCY, (img) => hashImage(img.id));
      imgs.forEach((img, i) => { img.phash = hashes[i]; });

      // Cross-run dedup: drop any fresh image that matches an already-kept photo.
      const refs = priorRefs.slice();
      const afterCross = [];
      let eventDeduped = 0;
      for (const img of imgs) {
        if (img.phash && refs.some((r) => hamming(r.phash, img.phash) <= DEDUP_DISTANCE)) {
          seen.add(img.id);
          eventDeduped++;
          continue;
        }
        afterCross.push(img);
      }
      // Within-run dedup: collapse this event's own bursts to representatives.
      const clusters = clusterByHash(afterCross, DEDUP_DISTANCE);
      const reps = [];
      for (const cluster of clusters) {
        reps.push(cluster[0]);
        if (cluster[0].phash) refs.push({ id: cluster[0].id, phash: cluster[0].phash });
        for (const dup of cluster.slice(1)) {
          seen.add(dup.id); // burst sibling — terminal duplicate
          eventDeduped++;
        }
      }
      totalDeduped += eventDeduped;

      let preflightSeen = 0;
      let preflightSkipped = 0;

      // Stage 2: score representatives concurrently (preflight → Haiku), each
      // task reserving budget atomically before its API call.
      const scoreRep = async (img) => {
        if (PREFLIGHT_MODEL) {
          if (!reservePreflight()) return null; // budget out — leave unseen, resume next run
          preflightSeen++; totalPreflightSeen++;
          const keep = await quickScoreImage(img.id);
          if (!keep) {
            // SKIP is terminal — mark seen so we never re-charge it. (A KEEP is
            // only a pass to Haiku and is NOT marked here, so if the Haiku budget
            // cuts us off the image stays unseen and resumes next run.)
            seen.add(img.id);
            preflightSkipped++; totalPreflightSkipped++;
            return null;
          }
        }
        if (!reserveHaiku()) return null; // budget out — leave unseen
        try {
          const result = await scoreImage(img.id);
          // A consumed Haiku call decides this image forever — even below
          // threshold or dropped by diversePick we never re-score it.
          seen.add(img.id);
          if (!result.suitableForPublicYouthSite) return null;
          if (result.score < threshold) return null;
          return {
            id: img.id,
            name: result.caption,
            year,
            event,
            activity: result.activity,
            bucket: bucketActivity(result.activity),
            score: result.score,
            reason: `Pontszám ${result.score}. Tevékenység: ${result.activity}.`,
            status: 'pending',
            approved: false,
            phash: img.phash ?? null,
          };
        } catch (err) {
          // Mark seen anyway so a permanently-bad image can't retry-loop forever.
          seen.add(img.id);
          console.warn(`    Failed to score ${img.id}: ${err.message}`);
          return null;
        }
      };

      const scored = (await mapPool(reps, CONCURRENCY, scoreRep)).filter(Boolean);
      scored.sort((a, b) => b.score - a.score);
      const top = diversePick(scored, cap);

      const preflightSummary = PREFLIGHT_MODEL
        ? ` | preflight: ${preflightSeen - preflightSkipped}/${preflightSeen} passed`
        : '';
      const dedupSummary = eventDeduped ? ` | dedup: -${eventDeduped}` : '';
      console.log(`    ${year}/${event} [${primary ? 'PRIMARY' : 'minor'}] ${imgs.length} fresh → ${reps.length} unique${dedupSummary}${preflightSummary} → ${top.length} candidate(s) kept (cap=${cap}, threshold>=${threshold})`);

      if (top.length) {
        newCandidates.push(...top);
        liveGallery.push(...top);
        top.forEach((item) => {
          knownIds.add(item.id);
          if (item.phash) keptHashes[item.id] = item.phash; // persist for cross-run dedup
        });
        saveGallery(liveGallery);
        console.log(`    → saved to gallery.json (${liveGallery.length} total)`);
      }
      // Persist seen-state after every event so a crash or budget abort never
      // loses progress (and never re-charges the images already processed).
      saveState(seen, runCount, keptHashes);

      if (budgetHit) break; // stop scanning further events this year
    }

    if (budgetHit) break yearLoop; // stop scanning further years
  }

  if (budgetHit) {
    console.warn(`[budget] cap reached (preflight ${openaiCalls}/${PREFLIGHT_BUDGET}, haiku ${claudeCalls}/${HAIKU_BUDGET}) — progress saved, exiting 0`);
    saveState(seen, runCount, keptHashes);
    logSummary();
    return; // partial run is success — exit 0 so the commit step persists progress
  }

  // Preflight cost summary
  if (PREFLIGHT_MODEL && totalPreflightSeen > 0) {
    const haikuSaved = totalPreflightSkipped * 0.0008;
    // gpt-4o-mini low-detail image: ~85 tokens × $0.15/1M = ~$0.000013 per call
    const openaiCost = totalPreflightSeen * 0.000013;
    const netSaving = haikuSaved - openaiCost;
    console.log(`\nPreflight summary: ${totalPreflightSkipped}/${totalPreflightSeen} images skipped`);
    console.log(`Estimated savings: ~$${haikuSaved.toFixed(3)} Haiku saved − ~$${openaiCost.toFixed(4)} OpenAI cost = ~$${netSaving.toFixed(3)} net`);
  }

  // Only rewrite state when something was actually processed — a true no-op
  // re-run (no fresh images) leaves the file untouched, so there is no git diff.
  if (seen.size !== initialSeenSize) saveState(seen, runCount, keptHashes);
  console.log(`\nAdded ${newCandidates.length} new candidate(s); ${liveGallery.length} total in gallery.json`);
  logSummary();
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
