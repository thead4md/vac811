// Unified display model for the /galeria redesign — combines the Drive
// curation pipeline's output (scripts/curate-gallery.mjs) with the Instagram
// sync pipeline's output (scripts/sync-instagram-feed.mjs) into one shape the
// page and its components render, without either source's adapter needing to
// know the other exists (see src/lib/gallery/).

// Raw shape written by scripts/curate-gallery.mjs to public/content/gallery.json
// (relocated here from src/pages/Gallery.tsx, which is being redesigned as
// GaleriaPage.tsx — src/lib/galleryRepo.ts and src/pages/Curate.tsx, the admin
// approval tool, also depend on this exact shape and are unrelated to that
// redesign).
export interface DriveGalleryItem {
  id: string;
  name: string;
  year: string;
  event?: string;
  activity?: string;
  bucket?: string;
  score?: number;
  phash?: string;
  reason?: string;
  status?: 'pending' | 'approved' | 'rejected';
  approved?: boolean;
  /** Set on items from the pipeline's largest/keyword-matched event of the year. */
  primary?: boolean;
  cap?: number;
}

// Raw shape written by scripts/sync-instagram-feed.mjs to
// public/content/instagram.json — already close to the unified shape below,
// since the sync script normalizes Instagram Graph API media straight to it.
export interface InstagramFeedItem {
  id: string;
  imageUrl: string;
  thumbnailUrl?: string;
  caption?: string;
  permalink: string;
  mediaType: 'image' | 'video';
  postedAt: string;
  eventSlug?: string | null;
  eventTitle?: string | null;
  year?: number;
}

export type GallerySource = 'drive' | 'instagram';

export interface GalleryItem {
  id: string;
  source: GallerySource;
  imageUrl: string;
  thumbnailUrl?: string;
  /** Drive only — precomputed `srcSet` string (Drive's CDN supports arbitrary widths; Instagram's media URLs don't). */
  srcSet?: string;
  alt: string;
  caption?: string;
  /** Instagram only — link to the original post. */
  permalink?: string;
  mediaType: 'image' | 'video' | 'reel';
  eventSlug?: string;
  eventTitle?: string;
  year?: number;
  /** Instagram only. */
  postedAt?: string;
  /** Drive only — the curation pipeline's 0–100 score, used to pick the featured event. */
  sortScore?: number;
}

export interface GalleryEventGroup {
  eventSlug: string;
  eventTitle: string;
  year: number;
  items: GalleryItem[];
  coverItem: GalleryItem;
  /** True if the Drive curation pipeline flagged this as the year's primary event. */
  isPrimary: boolean;
}
