// Validates public/content/*.json against the zod schemas in src/schemas/content.ts.
// Run in CI so a malformed-but-parseable content file fails the build instead of
// silently shipping and relying on the runtime static fallback.
import { readFileSync } from 'node:fs';
import {
  leadersSchema,
  campsSchema,
  eventsSchema,
  rajokSchema,
  settingsSchema,
  gallerySchema,
  instagramSchema,
} from '../src/schemas/content.ts';

const files = [
  { path: 'public/content/leaders.json', key: 'leaders', schema: leadersSchema },
  { path: 'public/content/camps.json', key: 'camps', schema: campsSchema },
  { path: 'public/content/events.json', key: 'events', schema: eventsSchema },
  { path: 'public/content/rajok.json', key: 'rajok', schema: rajokSchema },
  { path: 'public/content/settings.json', key: 'settings', schema: settingsSchema },
  { path: 'public/content/gallery.json', key: 'gallery', schema: gallerySchema },
  { path: 'public/content/instagram.json', key: 'instagram', schema: instagramSchema },
];

let failed = false;

for (const { path, key, schema } of files) {
  const json = JSON.parse(readFileSync(path, 'utf8'));
  const value = json[key] ?? json;
  const result = schema.safeParse(value);
  if (!result.success) {
    failed = true;
    console.error(`✗ ${path} failed validation:`);
    for (const issue of result.error.issues) {
      console.error(`  ${issue.path.join('.')}: ${issue.message}`);
    }
  } else {
    console.log(`✓ ${path}`);
  }
}

if (failed) {
  process.exit(1);
}
