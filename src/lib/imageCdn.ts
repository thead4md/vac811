// Builds an image URL for a Google Drive file id, routed through the
// img.vac811.hu edge-cache/resize Worker (audit finding P3/C7) when
// VITE_IMAGE_CDN_URL is configured. Falls back to hitting the Drive CDN
// directly so the gallery keeps working before the worker is deployed.
const IMAGE_CDN_URL = import.meta.env.VITE_IMAGE_CDN_URL ?? '';

export function driveImageUrl(fileId: string, width: number): string {
  if (IMAGE_CDN_URL) {
    return `${IMAGE_CDN_URL.replace(/\/$/, '')}/${fileId}?w=${width}`;
  }
  return `https://lh3.googleusercontent.com/d/${fileId}=w${width}`;
}
