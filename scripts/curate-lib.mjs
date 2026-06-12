// Pure, side-effect-free helpers for gallery curation.
// Kept separate from curate-gallery.mjs (which has top-level env guards and
// runs main() on import) so they can be unit-tested in isolation.

// Canonical activity buckets used only for diversity selection. Each bucket has
// a set of substring cues; a free-form activity label is matched against them
// after diacritic-stripping. Order matters: more-specific cues first, since
// matching returns on first hit ("tabortuz" must precede "tabor").
export const ACTIVITY_BUCKETS = [
  { key: 'tabortuz', cues: ['tabortuz', 'tuz', 'esti'] },     // tábortűz
  { key: 'tabor', cues: ['tabor'] },                          // tábor, télitábor
  { key: 'tura', cues: ['tura', 'kirandul', 'gyalog', 'hegy'] }, // túra, kirándulás
  { key: 'foglalkozas', cues: ['foglalkoz', 'kezmu', 'jatek', 'csomoz'] }, // foglalkozás, kézműves
  { key: 'unnepseg', cues: ['unnep', 'fogadalo', 'avata', 'ceremon'] }, // ünnepség, fogadalom
  { key: 'termeszet', cues: ['termeszet', 'erdo', 'taj'] },   // természet (no bare "to" — too short)
  { key: 'csapatprogram', cues: ['csapat', 'kozosseg', 'program'] }, // csapatélet
];

// Strip Hungarian diacritics and lowercase for robust matching.
export function normalizeActivity(s) {
  return (s ?? '')
    .toLowerCase()
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '');
}

// Map a free-form activity label to a canonical bucket key. Never throws — an
// unrecognized label becomes its own bucket (its normalized first word) so
// distinct novel activities still spread out rather than collapsing into one.
export function bucketActivity(activity) {
  const norm = normalizeActivity(activity);
  for (const { key, cues } of ACTIVITY_BUCKETS) {
    if (cues.some((c) => norm.includes(c))) return key;
  }
  return norm.split(/\s+/)[0] || 'egyeb';
}

// Pick up to `cap` items while spreading across activity buckets. Assumes
// `scored` is already sorted best-first; within each bucket that order is kept.
// Round-robin in full passes: take one from each non-empty bucket per pass, so
// every bucket contributes once before any contributes twice — fair even as
// buckets drain at different rates.
export function diversePick(scored, cap) {
  const byBucket = new Map();
  for (const item of scored) {
    const b = item.bucket ?? 'egyeb';
    if (!byBucket.has(b)) byBucket.set(b, []);
    byBucket.get(b).push(item);
  }
  const queues = [...byBucket.values()];
  const result = [];
  let progressed = true;
  while (result.length < cap && progressed) {
    progressed = false;
    for (const q of queues) {
      if (result.length >= cap) break;
      if (q.length) {
        result.push(q.shift());
        progressed = true;
      }
    }
  }
  return result;
}
