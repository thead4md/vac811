import type { GalleryItem } from '../pages/Gallery';

const REPO = 'thead4md/vac811';
const FILE = 'public/content/gallery.json';
const API = 'https://api.github.com';

export interface Decision {
  status: 'approved' | 'rejected';
  caption: string;
}

export interface GalleryFile {
  sha: string;
  items: GalleryItem[];
}

function authHeaders(token: string) {
  return {
    Authorization: `token ${token}`,
    Accept: 'application/vnd.github.v3+json',
  };
}

export async function fetchGallery(token: string): Promise<GalleryFile> {
  const res = await fetch(`${API}/repos/${REPO}/contents/${FILE}?ref=main`, {
    headers: authHeaders(token),
  });
  if (!res.ok) throw new Error(`GitHub ${res.status}`);
  const data = await res.json() as { sha: string; content: string };
  const content = JSON.parse(atob(data.content.replace(/\n/g, ''))) as { gallery: GalleryItem[] };
  return { sha: data.sha, items: content.gallery };
}

// Apply decisions to items, commit, retry on 409 SHA conflict.
export async function commitDecisions(
  token: string,
  decisions: Map<string, Decision>,
  retryCount = 0,
): Promise<void> {
  const { sha, items } = await fetchGallery(token);

  const updated = items.map((item) => {
    const d = decisions.get(item.id);
    if (!d) return item;
    return { ...item, status: d.status, approved: d.status === 'approved', name: d.caption };
  });

  const json = JSON.stringify({ gallery: updated }, null, 2) + '\n';
  // btoa for Unicode: encode to UTF-8 bytes first
  const b64 = btoa(
    Array.from(new TextEncoder().encode(json))
      .map((b) => String.fromCharCode(b))
      .join(''),
  );

  const approvedCount = [...decisions.values()].filter((d) => d.status === 'approved').length;
  const rejectedCount = decisions.size - approvedCount;

  const res = await fetch(`${API}/repos/${REPO}/contents/${FILE}`, {
    method: 'PUT',
    headers: { ...authHeaders(token), 'Content-Type': 'application/json' },
    body: JSON.stringify({
      message: `kuracio: ${approvedCount} jóváhagyva, ${rejectedCount} elutasítva`,
      content: b64,
      sha,
    }),
  });

  if (res.status === 409 && retryCount < 3) {
    return commitDecisions(token, decisions, retryCount + 1);
  }

  if (!res.ok) {
    const body = await res.text();
    throw new Error(`GitHub ${res.status}: ${body.slice(0, 120)}`);
  }
}

export function cdnUrl(fileId: string, width = 800): string {
  return `https://lh3.googleusercontent.com/d/${fileId}=w${width}`;
}
