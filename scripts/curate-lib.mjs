// Pure, side-effect-free helpers for gallery curation.
// Kept separate from curate-gallery.mjs (which has top-level env guards and
// runs main() on import) so they can be unit-tested in isolation.

// Run fn over items with at most concurrency tasks in flight.
// JS is single-threaded so qi++ is safe without a mutex.
export async function mapPool(items, concurrency, fn) {
  const results = new Array(items.length);
  const indices = items.map((_, i) => i);
  let qi = 0;
  async function worker() {
    while (qi < indices.length) {
      const i = indices[qi++];
      results[i] = await fn(items[i], i);
    }
  }
  await Promise.all(Array.from({ length: Math.min(concurrency, items.length) }, worker));
  return results;
}

// Count differing bits between two hex dHash strings.
export function hamming(a, b) {
  let dist = 0;
  const len = Math.min(a.length, b.length);
  for (let i = 0; i < len; i++) {
    let xor = parseInt(a[i], 16) ^ parseInt(b[i], 16);
    while (xor) { dist += xor & 1; xor >>>= 1; }
  }
  return dist;
}

// Greedy clustering: group items whose phash fields are within `distance` bits.
// Items without a phash field are each placed in their own singleton cluster.
// Returns array of clusters (each cluster is a non-empty array of items).
export function clusterByHash(items, distance = 10) {
  const assigned = new Set();
  const clusters = [];
  for (const item of items) {
    if (assigned.has(item.id)) continue;
    const cluster = [item];
    assigned.add(item.id);
    if (item.phash) {
      for (const other of items) {
        if (assigned.has(other.id) || !other.phash) continue;
        if (hamming(item.phash, other.phash) <= distance) {
          cluster.push(other);
          assigned.add(other.id);
        }
      }
    }
    clusters.push(cluster);
  }
  return clusters;
}

// Separate fresh images into representatives (one per near-duplicate cluster) and
// duplicates (already-kept or intra-event near-duplicates). `stateHashes` is the
// { [id]: phash } map of already-kept photos from prior runs. Callers may have
// already cached this batch's own freshly computed hashes into `stateHashes`
// (to avoid re-hashing on a later run) — entries whose id appears in
// `freshWithHashes` are excluded from the comparison pool so an image never
// matches against its own (or its batch-mates') just-cached hash.
// `extraExcludeIds` lets a caller that invokes this once per event (while
// sharing one `stateHashes` object across every event/year in a run) exclude
// every id it has already treated as "fresh" this run, not just the current
// batch — otherwise an earlier event's just-cached-but-never-kept hash would
// wrongly count as "known" once a later event's batch is compared against it.
export function dedupImages(freshWithHashes, stateHashes, distance, extraExcludeIds = new Set()) {
  const excludeIds = new Set(freshWithHashes.map((img) => img.id));
  for (const id of extraExcludeIds) excludeIds.add(id);
  const knownHashValues = Object.entries(stateHashes)
    .filter(([id]) => !excludeIds.has(id))
    .map(([, h]) => h);

  const nearKept = new Set();
  for (const img of freshWithHashes) {
    if (!img.phash) continue;
    if (knownHashValues.some((kh) => hamming(img.phash, kh) <= distance)) {
      nearKept.add(img.id);
    }
  }

  const candidates = freshWithHashes.filter((img) => !nearKept.has(img.id));
  const clusters = clusterByHash(candidates, distance);
  const representatives = clusters.map((c) => c[0]);
  const intraDupeIds = new Set(clusters.flatMap((c) => c.slice(1).map((i) => i.id)));
  const dupIds = new Set([...nearKept, ...intraDupeIds]);

  return { representatives, dupIds };
}

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
