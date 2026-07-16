import { describe, it, expect } from 'vitest';
// @ts-expect-error — plain .mjs module without type declarations
import { bucketActivity, diversePick, mapPool, hamming, clusterByHash, dedupImages } from './curate-lib.mjs';

describe('bucketActivity', () => {
  it('maps accented Hungarian labels to canonical buckets', () => {
    expect(bucketActivity('tábor')).toBe('tabor');
    expect(bucketActivity('télitábor')).toBe('tabor');
    expect(bucketActivity('Túra')).toBe('tura');
    expect(bucketActivity('tábortűz')).toBe('tabortuz'); // must NOT match "tabor"
    expect(bucketActivity('kézműves foglalkozás')).toBe('foglalkozas');
    expect(bucketActivity('ünnepség')).toBe('unnepseg');
    expect(bucketActivity('természetjárás')).toBe('termeszet');
    expect(bucketActivity('csapatprogram')).toBe('csapatprogram');
  });

  it('never throws on novel or empty input — gives a graceful bucket', () => {
    expect(bucketActivity('sportnap')).toBe('sportnap');
    expect(bucketActivity('')).toBe('egyeb');
    expect(bucketActivity(null)).toBe('egyeb');
    expect(bucketActivity(undefined)).toBe('egyeb');
  });
});

describe('diversePick', () => {
  const scored = [
    { id: 'a', score: 90, bucket: 'tabor' },
    { id: 'b', score: 85, bucket: 'tabor' },
    { id: 'c', score: 80, bucket: 'tabor' },
    { id: 'd', score: 70, bucket: 'tura' },
    { id: 'e', score: 60, bucket: 'tabortuz' },
  ];

  it('spreads across buckets before repeating one', () => {
    expect(diversePick(scored, 3).map((x) => x.id)).toEqual(['a', 'd', 'e']);
  });

  it('returns all items when cap exceeds count, fairly ordered', () => {
    expect(diversePick(scored, 99).map((x) => x.id)).toEqual(['a', 'd', 'e', 'b', 'c']);
  });

  it('falls back to score order within a single bucket', () => {
    const one = [
      { id: 'x', score: 50, bucket: 'tabor' },
      { id: 'y', score: 40, bucket: 'tabor' },
    ];
    expect(diversePick(one, 2).map((x) => x.id)).toEqual(['x', 'y']);
  });

  it('handles empty input', () => {
    expect(diversePick([], 5)).toEqual([]);
  });
});

describe('mapPool', () => {
  it('runs all tasks and preserves order', async () => {
    const result = await mapPool([1, 2, 3], 2, async (x) => x * 2);
    expect(result).toEqual([2, 4, 6]);
  });

  it('respects concurrency — at most N tasks run at once', async () => {
    let inFlight = 0;
    let maxSeen = 0;
    await mapPool([1, 2, 3, 4, 5], 2, async (x) => {
      inFlight++;
      maxSeen = Math.max(maxSeen, inFlight);
      await Promise.resolve(); // yield to let other tasks start
      inFlight--;
      return x;
    });
    expect(maxSeen).toBeLessThanOrEqual(2);
  });

  it('handles empty input', async () => {
    expect(await mapPool([], 4, async (x) => x)).toEqual([]);
  });
});

describe('hamming', () => {
  it('returns 0 for identical hashes', () => {
    expect(hamming('aabbccdd', 'aabbccdd')).toBe(0);
  });

  it('counts differing bits correctly', () => {
    // 0x0 vs 0xf = 4 bits different
    expect(hamming('0', 'f')).toBe(4);
    // 0x0 vs 0x1 = 1 bit different
    expect(hamming('0', '1')).toBe(1);
  });

  it('handles mismatched lengths by using the shorter', () => {
    expect(hamming('0', '00')).toBe(0);
  });
});

describe('clusterByHash', () => {
  const items = [
    { id: 'a', phash: '0000000000000000' },
    { id: 'b', phash: '0000000000000001' }, // 1 bit from a
    { id: 'c', phash: 'ffffffffffffffff' }, // very far from a and b
    { id: 'd', phash: null },               // no hash — singleton
  ];

  it('groups near-duplicates into the same cluster', () => {
    const clusters = clusterByHash(items, 4);
    expect(clusters).toHaveLength(3); // {a,b}, {c}, {d}
    const clusterIds = clusters.map((c) => c.map((i) => i.id).sort());
    expect(clusterIds).toContainEqual(['a', 'b']);
    expect(clusterIds).toContainEqual(['c']);
    expect(clusterIds).toContainEqual(['d']);
  });

  it('keeps each item as its own cluster when distance=0 and they differ', () => {
    const clusters = clusterByHash([items[0], items[1]], 0);
    expect(clusters).toHaveLength(2);
  });

  it('handles empty input', () => {
    expect(clusterByHash([], 10)).toEqual([]);
  });

  it('puts null-phash items in singleton clusters', () => {
    const result = clusterByHash([{ id: 'x', phash: null }], 10);
    expect(result).toHaveLength(1);
    expect(result[0][0].id).toBe('x');
  });
});

describe('dedupImages', () => {
  it('does not self-match a fresh batch already cached into stateHashes (regression: 2026-07-16 run scored 0/2714)', () => {
    // Caller pattern in curate-gallery.mjs: computeDHash results are written into
    // stateHashes as they're computed, *before* dedupImages is called, so the cache
    // can be reused on a later run. stateHashes here holds only this batch's own
    // hashes — no genuinely prior-run "kept" photos exist yet.
    const freshWithHashes = [
      { id: 'fresh-1', phash: '0000000000000000' },
      { id: 'fresh-2', phash: 'ffffffffffffffff' }, // far from fresh-1
    ];
    const stateHashes = {
      'fresh-1': '0000000000000000',
      'fresh-2': 'ffffffffffffffff',
    };

    const { representatives, dupIds } = dedupImages(freshWithHashes, stateHashes, 10);

    expect(representatives.map((i) => i.id).sort()).toEqual(['fresh-1', 'fresh-2']);
    expect(dupIds.size).toBe(0);
  });

  it('still drops images that match a genuinely prior-run kept hash', () => {
    const freshWithHashes = [{ id: 'fresh-1', phash: '0000000000000001' }]; // 1 bit from kept-a
    const stateHashes = { 'kept-a': '0000000000000000' };

    const { representatives, dupIds } = dedupImages(freshWithHashes, stateHashes, 10);

    expect(representatives).toHaveLength(0);
    expect(dupIds).toEqual(new Set(['fresh-1']));
  });

  it('still clusters intra-batch near-duplicates down to one representative', () => {
    const freshWithHashes = [
      { id: 'a', phash: '0000000000000000' },
      { id: 'b', phash: '0000000000000001' }, // 1 bit from a
      { id: 'c', phash: 'ffffffffffffffff' },
    ];
    const stateHashes = { a: '0000000000000000', b: '0000000000000001', c: 'ffffffffffffffff' };

    const { representatives, dupIds } = dedupImages(freshWithHashes, stateHashes, 10);

    expect(representatives.map((i) => i.id)).toEqual(['a', 'c']);
    expect(dupIds).toEqual(new Set(['b']));
  });

  it('extraExcludeIds prevents an earlier event (same run) from wrongly deduping a later, unrelated event', () => {
    // Simulates the caller's real pattern: one shared `stateHashes` object across
    // every event's dedupImages call within a run. Event A's photo gets cached
    // into stateHashes even though it was never "kept" — without extraExcludeIds,
    // Event B's visually-similar-but-unrelated photo would wrongly match it.
    const stateHashes = { 'a-1': '0000000000000000' }; // Event A already processed and cached
    const runFreshIds = new Set(['a-1', 'b-1']); // both a-1 and b-1 are fresh this run

    const eventBFresh = [{ id: 'b-1', phash: '0000000000000001' }]; // 1 bit from a-1

    const withoutExclude = dedupImages(eventBFresh, stateHashes, 10);
    expect(withoutExclude.representatives).toHaveLength(0); // demonstrates the leak exists without the guard

    const withExclude = dedupImages(eventBFresh, stateHashes, 10, runFreshIds);
    expect(withExclude.representatives.map((i) => i.id)).toEqual(['b-1']);
    expect(withExclude.dupIds.size).toBe(0);
  });
});
