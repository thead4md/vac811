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
//
// gallery.json item schema:
//   { id, name, year, event, score, reason, approved }
//   - id:       Google Drive file ID (CDN image URL is built from this)
//   - name:     AI-suggested caption (editable in CMS) — used as the caption
//   - year:     year folder the photo came from
//   - event:    event folder name (for context in the CMS)
//   - score:    0–100 quality score from Claude
//   - reason:   one-line justification (CMS hint)
//   - approved: false until a human approves it in Decap CMS

import { writeFileSync, readFileSync, mkdirSync, existsSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';
import Anthropic from '@anthropic-ai/sdk';
import { z } from 'zod';
import { zodOutputFormat } from '@anthropic-ai/sdk/helpers/zod';
import { GoogleAuth } from 'google-auth-library';

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = join(__dirname, '..');
const GALLERY_PATH = join(ROOT, 'public', 'content', 'gallery.json');

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

const ScoreSchema = z.object({
  score: z.number().describe('Scouting relevance and website value 0–100: how well does this represent the spirit, activities, and atmosphere of the scout troop?'),
  caption: z.string().describe('Short, natural Hungarian caption describing the activity or moment shown'),
  activityType: z.enum([
    'tábor',        // overnight/summer camp
    'túra',         // hiking or outdoor expedition
    'tábortűz',     // campfire or evening programme
    'foglalkozás',  // skill workshop, crafts, games
    'ünnepség',     // ceremony, parade, badge presentation
    'természet',    // nature scene with scouts present
    'csapatélet',   // everyday troop life, candid moment
    'egyéb',        // other
  ]).describe('Primary activity type visible in the photo'),
  hasIdentifiablePeople: z.boolean().describe('Are recognizable faces clearly visible?'),
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

// Pick up to `cap` items from a scored list while spreading across activityType.
// Iterates round-robin over types (highest score first within each type) so the
// result is diverse rather than dominated by one activity.
function diversePick(scored, cap) {
  const byType = new Map();
  for (const item of scored) {
    const t = item.activityType ?? 'egyéb';
    if (!byType.has(t)) byType.set(t, []);
    byType.get(t).push(item);
  }
  const queues = [...byType.values()];
  const result = [];
  let i = 0;
  while (result.length < cap) {
    const active = queues.filter((q) => q.length > 0);
    if (!active.length) break;
    const q = active[i % active.length];
    result.push(q.shift());
    i++;
  }
  return result;
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

function saveGallery(items) {
  const sorted = [...items].sort((a, b) => {
    if (String(b.year) !== String(a.year)) return String(b.year).localeCompare(String(a.year));
    if (!!b.approved !== !!a.approved) return (b.approved ? 1 : 0) - (a.approved ? 1 : 0);
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

  // Map year name → folder id
  const rootFolders = await driveList(FOLDER_ID);
  const yearFolderByName = new Map(
    rootFolders
      .filter((f) => f.mimeType === FOLDER_MIME)
      .map((f) => [f.name.trim(), f.id]),
  );

  const newCandidates = [];
  let totalPreflightSeen = 0;
  let totalPreflightSkipped = 0;

  for (const year of years) {
    const yearFolderId = yearFolderByName.get(year);
    if (!yearFolderId) {
      console.warn(`  Year folder "${year}" not found – skipping`);
      continue;
    }

    // Collect all images for this year, grouped under their event name.
    const images = [];
    await collectImages(yearFolderId, null, 0, images);
    const fresh = images.filter((img) => !knownIds.has(img.id));
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

      let preflightSeen = 0;
      let preflightSkipped = 0;
      const scored = [];

      // Free-tier Gemini: ≤15 RPM (gemini-2.0-flash) or ≤5 RPM (gemini-2.5-flash).
      // Enforce a minimum gap of 5 s between preflight calls to stay under the limit.
      let lastPreflightMs = 0;

      for (const img of imgs) {
        // Pass 1: OpenAI vision pre-filter (opt-in)
        if (PREFLIGHT_MODEL) {
          const elapsed = Date.now() - lastPreflightMs;
          if (elapsed < 5_000) await new Promise((r) => setTimeout(r, 5_000 - elapsed));
          lastPreflightMs = Date.now();
          preflightSeen++;
          totalPreflightSeen++;
          const keep = await quickScoreImage(img.id);
          if (!keep) {
            preflightSkipped++;
            totalPreflightSkipped++;
            continue;
          }
        }

        // Pass 2: Claude Haiku full score
        try {
          const result = await scoreImage(img.id);
          if (!result.suitableForPublicYouthSite) continue;
          if (result.score < threshold) continue;
          scored.push({
            id: img.id,
            name: result.caption,
            year,
            event,
            activityType: result.activityType,
            score: result.score,
            reason: `Pontszám ${result.score}. Típus: ${result.activityType}.`,
            approved: false,
          });
        } catch (err) {
          console.warn(`    Failed to score ${img.id}: ${err.message}`);
        }
      }

      scored.sort((a, b) => b.score - a.score);
      const top = diversePick(scored, cap);

      const preflightSummary = PREFLIGHT_MODEL
        ? ` | preflight: ${preflightSeen - preflightSkipped}/${preflightSeen} passed`
        : '';
      console.log(`    ${year}/${event} [${primary ? 'PRIMARY' : 'minor'}]${preflightSummary} → ${top.length} candidate(s) kept (cap=${cap}, threshold>=${threshold})`);

      if (top.length) {
        newCandidates.push(...top);
        liveGallery.push(...top);
        top.forEach((item) => knownIds.add(item.id));
        saveGallery(liveGallery);
        console.log(`    → saved to gallery.json (${liveGallery.length} total)`);
      }
    }
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

  console.log(`\nAdded ${newCandidates.length} new candidate(s); ${liveGallery.length} total in gallery.json`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
