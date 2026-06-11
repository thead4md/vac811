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
//   GALLERY_YEARS            – comma-separated year folders to process
//                              (default: current year + previous year)
//   GALLERY_MAX_PER_EVENT    – cap per event folder (default 4)
//   GALLERY_SCORE_THRESHOLD  – minimum score to keep (default 70)
//   GALLERY_MODEL            – Claude model id (default claude-haiku-4-5)
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
const MAX_PER_EVENT = Number(process.env.GALLERY_MAX_PER_EVENT || 4);
const SCORE_THRESHOLD = Number(process.env.GALLERY_SCORE_THRESHOLD || 70);
const MAX_RECURSION_DEPTH = 2; // year → event → (person)

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
  score: z.number().describe('Overall quality 0–100 for use on a public scout troop website'),
  caption: z.string().describe('Short, natural Hungarian caption describing the photo'),
  hasIdentifiablePeople: z.boolean().describe('Are recognizable faces clearly visible?'),
  qualityIssues: z.array(z.string()).describe('Problems: blur, bad lighting, cluttered, duplicate-looking, etc.'),
  suitableForPublicYouthSite: z.boolean().describe('Appropriate and flattering for a public youth-organization gallery?'),
});

const SCORE_PROMPT = `Te egy magyar cserkészcsapat (811. Szent József) nyilvános weboldalának fotószerkesztője vagy.
Értékeld ezt a fotót aszerint, mennyire alkalmas a galériába:
- kompozíció, élesség, fényviszonyok, mennyire ragadja meg a cserkészélményt/programot
- vond le a pontszámot, ha homályos, rosszul exponált, zsúfolt, vagy gyengébb duplikátumnak tűnik
- jelöld meg, ha bármi nem alkalmas egy ifjúsági szervezet nyilvános oldalára (kínos, nem hízelgő, magánjellegű helyzet)
Adj egy 0–100 pontszámot és egy rövid, természetes magyar képaláírást.`;

async function driveList(parentId) {
  const token = await getAccessToken();
  const q = encodeURIComponent(`'${parentId}' in parents and trashed = false`);
  const fields = encodeURIComponent('files(id,name,mimeType)');
  const url = `https://www.googleapis.com/drive/v3/files?q=${q}&fields=${fields}&pageSize=1000`;
  const res = await fetch(url, { headers: { Authorization: `Bearer ${token}` } });
  if (!res.ok) {
    const body = await res.text();
    throw new Error(`Drive API error ${res.status}: ${body}`);
  }
  const json = await res.json();
  return json.files ?? [];
}

function cdnUrl(fileId, width = 512) {
  return `https://lh3.googleusercontent.com/d/${fileId}=w${width}`;
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

async function main() {
  const now = new Date();
  const currentYear = now.getUTCFullYear();
  const years = process.env.GALLERY_YEARS
    ? process.env.GALLERY_YEARS.split(',').map((s) => s.trim()).filter(Boolean)
    : [String(currentYear), String(currentYear - 1)];

  console.log(`Curating years: ${years.join(', ')} (model: ${MODEL})`);

  const existing = loadExisting();
  const knownIds = new Set(existing.gallery.map((i) => i.id));

  // Map year name → folder id
  const rootFolders = await driveList(FOLDER_ID);
  const yearFolderByName = new Map(
    rootFolders
      .filter((f) => f.mimeType === FOLDER_MIME)
      .map((f) => [f.name.trim(), f.id]),
  );

  const newCandidates = [];

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
    console.log(`  ${year}: ${images.length} image(s), ${fresh.length} new to score`);

    // Group fresh images by event, score, keep top N per event.
    const byEvent = new Map();
    for (const img of fresh) {
      if (!byEvent.has(img.event)) byEvent.set(img.event, []);
      byEvent.get(img.event).push(img);
    }

    for (const [event, imgs] of byEvent) {
      const scored = [];
      for (const img of imgs) {
        try {
          const result = await scoreImage(img.id);
          if (!result.suitableForPublicYouthSite) continue;
          if (result.score < SCORE_THRESHOLD) continue;
          scored.push({
            id: img.id,
            name: result.caption,
            year,
            event,
            score: result.score,
            reason: result.qualityIssues.length
              ? `Pontszám ${result.score}. Megjegyzés: ${result.qualityIssues.join(', ')}`
              : `Pontszám ${result.score}.`,
            approved: false,
          });
        } catch (err) {
          console.warn(`    Failed to score ${img.id}: ${err.message}`);
        }
      }
      scored.sort((a, b) => b.score - a.score);
      const top = scored.slice(0, MAX_PER_EVENT);
      if (top.length) {
        console.log(`    ${year}/${event}: ${top.length} candidate(s) kept`);
        newCandidates.push(...top);
      }
    }
  }

  // Merge: keep all existing items (preserving human-set approved/name),
  // append new candidates that aren't already present.
  const merged = [...existing.gallery, ...newCandidates];
  // Sort: newest year first, approved first within a year, then by score.
  merged.sort((a, b) => {
    if (String(b.year) !== String(a.year)) return String(b.year).localeCompare(String(a.year));
    if (!!b.approved !== !!a.approved) return (b.approved ? 1 : 0) - (a.approved ? 1 : 0);
    return (b.score ?? 0) - (a.score ?? 0);
  });

  mkdirSync(dirname(GALLERY_PATH), { recursive: true });
  writeFileSync(GALLERY_PATH, JSON.stringify({ gallery: merged }, null, 2) + '\n', 'utf-8');

  console.log(`\nAdded ${newCandidates.length} new candidate(s); ${merged.length} total in gallery.json`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
