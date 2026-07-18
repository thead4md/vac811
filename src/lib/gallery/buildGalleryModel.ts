import type { GalleryEventGroup, GalleryItem } from '../../types/gallery';

export interface GalleryModel {
  /** All items, both sources, unfiltered — used by the "Összes"/"Videók" toggles. */
  all: GalleryItem[];
  /** Drive photos (+ any Instagram posts whose inferred event matches), grouped and sorted by year desc. */
  eventGroups: GalleryEventGroup[];
  /** The group to show in the hero block, or null if there's nothing to feature yet. */
  featured: GalleryEventGroup | null;
  /** Every Instagram item, reverse-chronological — the "Instagram" toggle view. */
  instagram: GalleryItem[];
  /** A short reverse-chronological slice for the "Legfrissebb Instagramról" strip. */
  instagramLatest: GalleryItem[];
}

const INSTAGRAM_STRIP_SIZE = 12;

export function buildGalleryModel(driveItems: GalleryItem[], instagramItems: GalleryItem[]): GalleryModel {
  const all = [...driveItems, ...instagramItems];

  const groupsBySlug = new Map<string, GalleryEventGroup>();
  for (const item of all) {
    if (!item.eventSlug || item.year == null) continue;
    let group = groupsBySlug.get(item.eventSlug);
    if (!group) {
      group = {
        eventSlug: item.eventSlug,
        eventTitle: item.eventTitle || item.eventSlug,
        year: item.year,
        items: [],
        coverItem: item,
        isPrimary: false,
      };
      groupsBySlug.set(item.eventSlug, group);
    }
    group.items.push(item);
  }

  const eventGroups = Array.from(groupsBySlug.values());
  for (const group of eventGroups) {
    // Highest-score Drive item (if any) makes the best cover and decides "primary".
    const bestDriveItem = group.items
      .filter((i) => i.source === 'drive')
      .sort((a, b) => (b.sortScore ?? 0) - (a.sortScore ?? 0))[0];
    group.coverItem = bestDriveItem ?? group.items[0];
  }
  eventGroups.sort((a, b) => b.year - a.year);

  const instagram = instagramItems
    .slice()
    .sort((a, b) => (b.postedAt ?? '').localeCompare(a.postedAt ?? ''));
  const instagramLatest = instagram.slice(0, INSTAGRAM_STRIP_SIZE);

  const featured = pickFeatured(eventGroups);
  if (featured) featured.isPrimary = true;

  return { all, eventGroups, featured, instagram, instagramLatest };
}

// Prefer this year's group with the most Drive-scored photos (a proxy for the
// pipeline's own "primary event" concept — see curate-gallery.mjs's
// detectPrimaryEvent), falling back to the most recent group with any items.
function pickFeatured(groups: GalleryEventGroup[]): GalleryEventGroup | null {
  if (groups.length === 0) return null;
  const latestYear = groups[0].year;
  const thisYearGroups = groups.filter((g) => g.year === latestYear);
  const withScores = thisYearGroups
    .map((g) => ({
      group: g,
      avgScore:
        g.items.reduce((sum, i) => sum + (i.sortScore ?? 0), 0) / g.items.length,
    }))
    .sort((a, b) => b.avgScore - a.avgScore);
  return withScores[0]?.group ?? groups[0];
}
