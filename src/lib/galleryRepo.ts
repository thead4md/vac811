import type { DriveGalleryItem as GalleryItem } from '../types/gallery';
import { driveImageUrl } from './imageCdn';

const REPO = 'thead4md/vac811';
const FILE = 'public/content/gallery.json';
const API = 'https://api.github.com';

export interface Decision {
  status: 'approved' | 'rejected' | 'pending';
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
  // GitHub returns base64 of the raw UTF-8 file bytes. atob() gives a byte
  // string (each char = one byte); TextDecoder converts those bytes to a real
  // JS string so multi-byte Hungarian characters aren't split into mojibake.
  const raw = atob(data.content.replace(/\n/g, ''));
  const bytes = Uint8Array.from(raw, (c) => c.charCodeAt(0));
  const content = JSON.parse(new TextDecoder('utf-8').decode(bytes)) as { gallery: GalleryItem[] };
  return { sha: data.sha, items: content.gallery };
}

// Apply decisions to items, commit, retry on 409 SHA conflict.
export async function commitDecisions(
  token: string,
  decisions: Map<string, Decision>,
  retryCount = 0,
): Promise<{ items: GalleryItem[] }> {
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
  const rejectedCount = [...decisions.values()].filter((d) => d.status === 'rejected').length;
  const revertedCount = [...decisions.values()].filter((d) => d.status === 'pending').length;

  const messageParts = [`${approvedCount} jóváhagyva`, `${rejectedCount} elutasítva`];
  if (revertedCount > 0) messageParts.push(`${revertedCount} visszavonva`);

  const res = await fetch(`${API}/repos/${REPO}/contents/${FILE}`, {
    method: 'PUT',
    headers: { ...authHeaders(token), 'Content-Type': 'application/json' },
    body: JSON.stringify({
      message: `kuracio: ${messageParts.join(', ')}`,
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

  return { items: updated };
}

export function cdnUrl(fileId: string, width = 800): string {
  return driveImageUrl(fileId, width);
}

// ── Proxy variants (Google ID token → Cloudflare Worker → GitHub) ────────────

function proxyHeaders(idToken: string) {
  return { Authorization: `Bearer ${idToken}`, 'Content-Type': 'application/json' };
}

export async function fetchGalleryViaProxy(
  proxyUrl: string,
  idToken: string,
): Promise<GalleryFile> {
  const res = await fetch(proxyUrl, { headers: proxyHeaders(idToken) });
  if (!res.ok) {
    const body = await res.json().catch(() => ({ error: res.statusText })) as { error?: string };
    throw new Error(body.error ?? `Proxy ${res.status}`);
  }
  const data = await res.json() as { sha: string; content: string };
  const raw = atob(data.content.replace(/\n/g, ''));
  const bytes = Uint8Array.from(raw, (c) => c.charCodeAt(0));
  const content = JSON.parse(new TextDecoder('utf-8').decode(bytes)) as { gallery: GalleryItem[] };
  return { sha: data.sha, items: content.gallery };
}

export async function commitDecisionsViaProxy(
  proxyUrl: string,
  idToken: string,
  decisions: Map<string, Decision>,
  retryCount = 0,
): Promise<{ items: GalleryItem[] }> {
  const { sha, items } = await fetchGalleryViaProxy(proxyUrl, idToken);

  const updated = items.map((item) => {
    const d = decisions.get(item.id);
    if (!d) return item;
    return { ...item, status: d.status, approved: d.status === 'approved', name: d.caption };
  });

  const json = JSON.stringify({ gallery: updated }, null, 2) + '\n';
  const b64 = btoa(
    Array.from(new TextEncoder().encode(json))
      .map((b) => String.fromCharCode(b))
      .join(''),
  );

  const approvedCount = [...decisions.values()].filter((d) => d.status === 'approved').length;
  const rejectedCount = [...decisions.values()].filter((d) => d.status === 'rejected').length;
  const revertedCount = [...decisions.values()].filter((d) => d.status === 'pending').length;

  const res = await fetch(proxyUrl, {
    method: 'PUT',
    headers: proxyHeaders(idToken),
    body: JSON.stringify({ sha, content: b64, approved: approvedCount, rejected: rejectedCount, reverted: revertedCount }),
  });

  if (res.status === 409 && retryCount < 3) {
    return commitDecisionsViaProxy(proxyUrl, idToken, decisions, retryCount + 1);
  }

  if (!res.ok) {
    const body = await res.json().catch(() => ({ error: res.statusText })) as { error?: string };
    throw new Error(body.error ?? `Proxy ${res.status}`);
  }

  return { items: updated };
}
