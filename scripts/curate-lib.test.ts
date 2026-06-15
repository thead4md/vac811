import { describe, it, expect } from 'vitest';
// @ts-expect-error — plain .mjs module without type declarations
import { bucketActivity, diversePick, mapPool, hamming, clusterByHash } from './curate-lib.mjs';

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
  it('preserves input order in results regardless of completion order', async () => {
    const out = await mapPool([10, 1, 5], 3, (n: number) =>
      new Promise((r) => setTimeout(() => r(n * 2), n)),
    );
    expect(out).toEqual([20, 2, 10]);
  });

  it('never exceeds the concurrency cap', async () => {
    let inFlight = 0;
    let peak = 0;
    await mapPool(Array.from({ length: 12 }, (_, i) => i), 4, async () => {
      inFlight++;
      peak = Math.max(peak, inFlight);
      await new Promise((r) => setTimeout(r, 5));
      inFlight--;
    });
    expect(peak).toBeLessThanOrEqual(4);
  });

  it('passes the index to fn and handles empty input', async () => {
    expect(await mapPool([], 4, async () => 1)).toEqual([]);
    expect(await mapPool(['a', 'b'], 2, async (_v: string, i: number) => i)).toEqual([0, 1]);
  });
});

describe('hamming', () => {
  it('counts differing bits between equal-length hex strings', () => {
    expect(hamming('0000000000000000', '0000000000000000')).toBe(0);
    expect(hamming('0', '1')).toBe(1); // 0000 vs 0001
    expect(hamming('f', '0')).toBe(4); // 1111 vs 0000
    expect(hamming('ff', '00')).toBe(8);
  });

  it('returns Infinity for missing or mismatched-length inputs', () => {
    expect(hamming('', 'ff')).toBe(Infinity);
    expect(hamming('ff', '')).toBe(Infinity);
    expect(hamming(null, 'ff')).toBe(Infinity);
    expect(hamming('f', 'ff')).toBe(Infinity);
  });
});

describe('clusterByHash', () => {
  it('groups items within the distance and keeps the first as representative', () => {
    const items = [
      { id: 'a', phash: '0000000000000000' },
      { id: 'b', phash: '0000000000000001' }, // 1 bit from a
      { id: 'c', phash: 'ffffffffffffffff' }, // far from a
    ];
    const clusters = clusterByHash(items, 10);
    expect(clusters).toHaveLength(2);
    expect(clusters[0].map((x: { id: string }) => x.id)).toEqual(['a', 'b']);
    expect(clusters[1].map((x: { id: string }) => x.id)).toEqual(['c']);
  });

  it('gives hashless items their own cluster (never merged)', () => {
    const items = [
      { id: 'a', phash: '0000000000000000' },
      { id: 'b' },
      { id: 'c', phash: '0000000000000000' },
    ];
    const clusters = clusterByHash(items, 10);
    expect(clusters).toHaveLength(2);
    expect(clusters[0].map((x: { id: string }) => x.id)).toEqual(['a', 'c']);
    expect(clusters[1].map((x: { id: string }) => x.id)).toEqual(['b']);
  });
});
