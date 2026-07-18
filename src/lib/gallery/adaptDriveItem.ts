import type { DriveGalleryItem, GalleryItem } from '../../types/gallery';
import { driveImageUrl } from '../imageCdn';
import { slugify } from './slugify';

// Only approved photos are shown publicly — AI candidates stay hidden until
// an editor approves them in Sveltia CMS (same gate as the pre-redesign page).
function isApproved(item: DriveGalleryItem): boolean {
  return item.status === 'approved' || (item.status == null && !!item.approved);
}

export function adaptDriveItems(rawItems: DriveGalleryItem[]): GalleryItem[] {
  return rawItems.filter(isApproved).map((item): GalleryItem => {
    const eventTitle = item.event || 'Egyéb';
    return {
      id: `drive-${item.id}`,
      source: 'drive',
      imageUrl: driveImageUrl(item.id, 800),
      thumbnailUrl: driveImageUrl(item.id, 400),
      srcSet: `${driveImageUrl(item.id, 400)} 400w, ${driveImageUrl(item.id, 800)} 800w, ${driveImageUrl(item.id, 1200)} 1200w`,
      alt: item.name,
      caption: item.name,
      mediaType: 'image',
      eventSlug: slugify(eventTitle),
      eventTitle,
      year: Number(item.year) || undefined,
      sortScore: item.score,
    };
  });
}
