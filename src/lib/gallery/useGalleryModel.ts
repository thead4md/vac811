import { useMemo } from 'react';
import { useContent } from '../../hooks/useContent';
import { gallerySchema, instagramSchema } from '../../schemas/content';
import type { DriveGalleryItem, InstagramFeedItem } from '../../types/gallery';
import { adaptDriveItems } from './adaptDriveItem';
import { adaptInstagramItems } from './adaptInstagramItem';
import { buildGalleryModel, type GalleryModel } from './buildGalleryModel';

interface State {
  model: GalleryModel;
  loading: boolean;
  error: string | null;
}

// Drive drives the page's loading/error state (it's the primary content).
// Instagram is best-effort: missing file, fetch failure, or an empty sync
// manifest all just mean "no Instagram items yet" — never a broken page (see
// docs/galeria-audit.md plan section 5.6).
export function useGalleryModel(): State {
  const drive = useContent<DriveGalleryItem[]>('gallery.json', 'gallery', gallerySchema);
  const instagram = useContent<InstagramFeedItem[]>('instagram.json', 'instagram', instagramSchema);

  const model = useMemo(
    () => buildGalleryModel(adaptDriveItems(drive.data ?? []), adaptInstagramItems(instagram.data ?? [])),
    [drive.data, instagram.data],
  );

  return { model, loading: drive.loading, error: drive.error };
}
