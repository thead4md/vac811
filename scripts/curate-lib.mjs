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

// Run `fn` over `items` with at most `concurrency` calls in flight, preserving
// input order in the results array. A worker pulls the next index off a shared
// cursor as soon as it frees up, so slow items never stall the others. `fn`
// receives (item, index). Rejections propagate (the returned promise rejects).
export async function mapPool(items, concurrency, fn) {
  const results = new Array(items.length);
  const width = Math.max(1, Math.min(concurrency | 0 || 1, items.length || 1));
  let cursor = 0;
  async function worker() {
    while (cursor < items.length) {
      const i = cursor++;
      results[i] = await fn(items[i], i);
    }
  }
  await Promise.all(Array.from({ length: width }, worker));
  return results;
}

// Hamming distance between two equal-length hex strings (e.g. 16-hex-char
// 64-bit dHashes). Counts differing bits. Returns Infinity if either is missing
// or lengths differ, so a malformed/absent hash never falsely matches.
export function hamming(a, b) {
  if (!a || !b || a.length !== b.length) return Infinity;
  let dist = 0;
  for (let i = 0; i < a.length; i++) {
    let x = parseInt(a[i], 16) ^ parseInt(b[i], 16); // diff bits in this nibble
    while (x) { dist += x & 1; x >>= 1; }
  }
  return dist;
}

// Greedy near-duplicate clustering. `items` each carry a `.phash` hex string.
// Walks items in order; each item joins the first existing cluster whose
// representative (cluster[0]) is within `distance` bits, otherwise starts a new
// cluster. Items missing a hash always get their own cluster (never merged).
// Returns an array of clusters (arrays of items); cluster[0] is the
// representative. Order-stable: pass best-first to keep the best as rep.
export function clusterByHash(items, distance) {
  const clusters = [];
  for (const item of items) {
    let placed = false;
    if (item && item.phash) {
      for (const cluster of clusters) {
        if (hamming(cluster[0].phash, item.phash) <= distance) {
          cluster.push(item);
          placed = true;
          break;
        }
      }
    }
    if (!placed) clusters.push([item]);
  }
  return clusters;
}

// Compute a 64-bit difference hash (dHash) for raw image bytes, returned as a
// 16-char hex string. Resizes to 9×8 grayscale and sets one bit per row-adjacent
// pixel comparison (left brighter than right). Requires a `sharp` instance
// passed in (kept out of this pure module's imports so tests don't load native
// code). Returns null on any decode failure — callers treat that as "no hash".
export async function dHash(sharp, buffer) {
  try {
    const { data } = await sharp(buffer)
      .greyscale()
      .resize(9, 8, { fit: 'fill' })
      .raw()
      .toBuffer({ resolveWithObject: true });
    let bits = '';
    for (let row = 0; row < 8; row++) {
      for (let col = 0; col < 8; col++) {
        const left = data[row * 9 + col];
        const right = data[row * 9 + col + 1];
        bits += left > right ? '1' : '0';
      }
    }
    let hex = '';
    for (let i = 0; i < 64; i += 4) {
      hex += parseInt(bits.slice(i, i + 4), 2).toString(16);
    }
    return hex;
  } catch {
    return null;
  }
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
