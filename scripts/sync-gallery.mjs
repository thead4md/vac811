#!/usr/bin/env node
// Syncs curated photos from a flat "_weboldal" folder in the shared Google
// Drive gallery root into public/content/gallery.json.
//
// Required env vars:
//   GOOGLE_DRIVE_API_KEY       – read-only Drive API key
//   GOOGLE_DRIVE_FOLDER_ID     – ID of the root "811 Galéria" Drive folder
//
// Curation workflow (no extra tools needed — just Google Drive):
//   1. After an event, copy the best photos into the "_weboldal" subfolder.
//   2. Rename each copy to set its caption, prefixed with the year:
//        "2025 Csapattábor – Tábortűz az első estén.jpg"
//        "2024 Portya – Dunakanyar.jpg"
//   3. Trigger this workflow (manually or wait for the Monday schedule).
//
// gallery.json item schema:
//   { id, name, year }
//   - id:   Google Drive file ID (used to build the CDN image URL)
//   - name: filename minus extension (used as caption)
//   - year: leading 4-digit number from filename, or "" if absent

import { writeFileSync, mkdirSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = join(__dirname, '..');

const API_KEY = process.env.GOOGLE_DRIVE_API_KEY;
const FOLDER_ID = process.env.GOOGLE_DRIVE_FOLDER_ID;

if (!API_KEY || !FOLDER_ID) {
  console.error('Missing GOOGLE_DRIVE_API_KEY or GOOGLE_DRIVE_FOLDER_ID');
  process.exit(1);
}

const IMAGE_MIME_TYPES = new Set([
  'image/jpeg',
  'image/png',
  'image/webp',
  'image/gif',
  'image/heic',
]);

const WEBOLDAL_FOLDER_NAME = '_weboldal';

async function driveList(parentId) {
  const q = encodeURIComponent(`'${parentId}' in parents and trashed = false`);
  const fields = encodeURIComponent('files(id,name,mimeType)');
  const url = `https://www.googleapis.com/drive/v3/files?q=${q}&fields=${fields}&key=${API_KEY}&pageSize=1000`;
  const res = await fetch(url);
  if (!res.ok) {
    const body = await res.text();
    throw new Error(`Drive API error ${res.status}: ${body}`);
  }
  const json = await res.json();
  return json.files ?? [];
}

function stripExtension(name) {
  return name.replace(/\.[^.]+$/, '');
}

function parseYear(name) {
  const match = name.match(/^(\d{4})\b/);
  return match ? match[1] : '';
}

async function findWeboldal() {
  const rootChildren = await driveList(FOLDER_ID);
  const folder = rootChildren.find(
    (f) =>
      f.mimeType === 'application/vnd.google-apps.folder' &&
      f.name === WEBOLDAL_FOLDER_NAME,
  );
  if (!folder) {
    throw new Error(
      `"${WEBOLDAL_FOLDER_NAME}" subfolder not found in the root gallery folder. ` +
        'Create it in Google Drive and add curated photos there.',
    );
  }
  return folder.id;
}

async function main() {
  console.log(`Looking for "${WEBOLDAL_FOLDER_NAME}" folder…`);
  const weboldaId = await findWeboldal();

  console.log('Listing curated photos…');
  const files = await driveList(weboldaId);
  const images = files.filter((f) => IMAGE_MIME_TYPES.has(f.mimeType));
  console.log(`  ${images.length} image(s) found`);

  const items = images.map((img) => {
    const name = stripExtension(img.name);
    return {
      id: img.id,
      name,
      year: parseYear(name),
    };
  });

  // Sort: newest year first, then alphabetically within same year
  items.sort((a, b) => {
    if (b.year !== a.year) return b.year.localeCompare(a.year);
    return a.name.localeCompare(b.name, 'hu');
  });

  const outDir = join(ROOT, 'public', 'content');
  mkdirSync(outDir, { recursive: true });
  const outPath = join(outDir, 'gallery.json');
  writeFileSync(outPath, JSON.stringify({ gallery: items }, null, 2) + '\n', 'utf-8');

  console.log(`\nWrote ${items.length} item(s) to public/content/gallery.json`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
