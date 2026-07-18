import type { GalleryItem, InstagramFeedItem } from '../../types/gallery';

// scripts/sync-instagram-feed.mjs already writes items close to the unified
// shape — this adapter is the seam that isolates the rest of the app from
// that script's exact output, so either side can change independently.
export function adaptInstagramItems(rawItems: InstagramFeedItem[]): GalleryItem[] {
  return rawItems.map((item): GalleryItem => ({
    id: `instagram-${item.id}`,
    source: 'instagram',
    imageUrl: item.imageUrl,
    thumbnailUrl: item.thumbnailUrl,
    alt: item.caption?.slice(0, 200) || 'Instagram bejegyzés képe',
    caption: item.caption,
    permalink: item.permalink,
    mediaType: item.mediaType,
    eventSlug: item.eventSlug ?? undefined,
    eventTitle: item.eventTitle ?? undefined,
    year: item.year,
    postedAt: item.postedAt,
  }));
}
