import { describe, it, expect } from 'vitest';
// @ts-expect-error — plain .mjs module without type declarations
import { bucketActivity, diversePick } from './curate-lib.mjs';

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
