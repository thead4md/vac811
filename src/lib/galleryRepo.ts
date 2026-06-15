// Read/write public/content/gallery.json directly through the GitHub Contents
// API using the leader's OAuth token. This is the swipe app's git backend — the
// same file the curation pipeline writes, so commits use the held blob SHA and
// retry on conflict (e.g. the pipeline committed between read and write).

const REPO = 'thead4md/vac811';
const BRANCH = 'main';
const FILE_PATH = 'public/content/gallery.json';
const API = 'https://api.github.com';

export type PhotoStatus = 'pending' | 'approved' | 'rejected';

export interface GalleryPhoto {
  id: string;
  name: string;
  year: string;
  event?: string;
  activity?: string;
  bucket?: string;
  score?: number;
  reason?: string;
  status?: PhotoStatus;
  approved?: boolean;
  phash?: string | null;
}

export interface Decision {
  status: PhotoStatus;
  name?: string; // optional caption edit applied at commit time
}

// Effective status for an item, migrating legacy entries that only have the
// boolean `approved` flag.
export function effectiveStatus(p: GalleryPhoto): PhotoStatus {
  if (p.status === 'approved' || p.status === 'rejected' || p.status === 'pending') {
    return p.status;
  }
  return p.approved ? 'approved' : 'pending';
}

function decodeBase64Utf8(b64: string): string {
  const bin = atob(b64.replace(/\n/g, ''));
  const bytes = Uint8Array.from(bin, (c) => c.charCodeAt(0));
  return new TextDecoder().decode(bytes);
}

function encodeBase64Utf8(str: string): string {
  const bytes = new TextEncoder().encode(str);
  let bin = '';
  bytes.forEach((b) => {
    bin += String.fromCharCode(b);
  });
  return btoa(bin);
}

// Mirror the pipeline's saveGallery ordering so the committed file stays stable.
function sortGallery(items: GalleryPhoto[]): GalleryPhoto[] {
  const rank: Record<PhotoStatus, number> = { approved: 2, pending: 1, rejected: 0 };
  return [...items].sort((a, b) => {
    if (String(b.year) !== String(a.year)) return String(b.year).localeCompare(String(a.year));
    const rb = rank[effectiveStatus(b)];
    const ra = rank[effectiveStatus(a)];
    if (rb !== ra) return rb - ra;
    return (b.score ?? 0) - (a.score ?? 0);
  });
}

async function ghFetch(token: string, path: string, init?: RequestInit): Promise<Response> {
  return fetch(`${API}${path}`, {
    ...init,
    headers: {
      Authorization: `token ${token}`,
      Accept: 'application/vnd.github+json',
      'X-GitHub-Api-Version': '2022-11-28',
      ...(init?.headers ?? {}),
    },
  });
}

export async function fetchGallery(
  token: string,
): Promise<{ photos: GalleryPhoto[]; sha: string }> {
  const res = await ghFetch(token, `/repos/${REPO}/contents/${FILE_PATH}?ref=${BRANCH}`);
  if (res.status === 401) throw new Error('A bejelentkezés lejárt — jelentkezz be újra.');
  if (!res.ok) throw new Error(`A galéria betöltése nem sikerült (${res.status}).`);
  const json = await res.json();
  const parsed = JSON.parse(decodeBase64Utf8(json.content));
  const photos: GalleryPhoto[] = Array.isArray(parsed.gallery) ? parsed.gallery : [];
  return { photos, sha: json.sha };
}

// Apply buffered decisions and commit. On a SHA conflict (someone else — e.g.
// the pipeline — committed in the meantime) re-fetch and re-apply by id, retry.
export async function commitDecisions(
  token: string,
  decisions: Map<string, Decision>,
  message: string,
): Promise<{ sha: string; photos: GalleryPhoto[] }> {
  let lastErr: Error | null = null;
  for (let attempt = 0; attempt < 3; attempt++) {
    const { photos, sha } = await fetchGallery(token);
    const updated = photos.map((p) => {
      const d = decisions.get(p.id);
      if (!d) return p;
      return {
        ...p,
        status: d.status,
        approved: d.status === 'approved',
        ...(d.name !== undefined ? { name: d.name } : {}),
      };
    });
    const body = JSON.stringify({ gallery: sortGallery(updated) }, null, 2) + '\n';
    const res = await ghFetch(token, `/repos/${REPO}/contents/${FILE_PATH}`, {
      method: 'PUT',
      body: JSON.stringify({
        message,
        content: encodeBase64Utf8(body),
        sha,
        branch: BRANCH,
      }),
    });
    if (res.ok) {
      const j = await res.json();
      return { sha: j.content.sha as string, photos: updated };
    }
    if (res.status === 409 || res.status === 422) {
      lastErr = new Error('Ütközés a mentéskor — újrapróbálom.');
      continue; // stale SHA — re-fetch and retry
    }
    throw new Error(`A mentés nem sikerült (${res.status}).`);
  }
  throw lastErr ?? new Error('A mentés többszöri próbálkozás után sem sikerült.');
}
