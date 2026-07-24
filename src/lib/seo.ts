// Per-route SEO metadata, shared between the build-time <Head> injection
// (src/components/SeoHead.tsx) and — in a later phase — sitemap generation.
// Kept in its own module (no React exports) so it can be imported by both
// components and build scripts without tripping fast-refresh rules.

export interface RouteSeo {
  title: string;
  description: string;
}

export const DEFAULT_TITLE = '811. Szent József Cserkészcsapat – Vác';
export const DEFAULT_DESC =
  'A 811. Szent József Cserkészcsapat Vác egyik legnagyobb ifjúsági szervezete. Cserkészet, táborok, közösség 1929 óta.';

// Descriptions are unique per page so search engines don't see duplicate
// snippets across the site.
export const pageSeo: Record<string, RouteSeo> = {
  '/': { title: DEFAULT_TITLE, description: DEFAULT_DESC },
  '/rolunk': { title: 'Rólunk – 811. Cserkészcsapat', description: 'Ismerd meg a 811. Szent József Cserkészcsapatot: keresztény értékrend, közösség és kaland Vácon, 1929 óta.' },
  '/tortenet': { title: 'Történet – 811. Cserkészcsapat', description: 'A váci 811. cserkészcsapat története 1929-től napjainkig: alapítás, betiltás, újjáalakulás.' },
  '/cserkeszet': { title: 'A cserkészetről – 811. Cserkészcsapat', description: 'Mi a cserkészet? Korosztályok, fogadalom, cserkésztörvény és a cserkészélet a 811. csapatnál.' },
  '/vezetok': { title: 'Vezetők – 811. Cserkészcsapat', description: 'A 811. cserkészcsapat csapatvezető törzse, rajparancsnokai és rajvezetői.' },
  '/rajok': { title: 'Rajok – 811. Cserkészcsapat', description: 'A 811. cserkészcsapat rajai korosztályonként – a fiatalabbaktól a felnőtt cserkészekig.' },
  '/taborok': { title: 'Táborok – 811. Cserkészcsapat', description: 'A 811. cserkészcsapat nyári táborainak évkönyve: helyszínek, keretmesék és emlékek.' },
  '/naptar': { title: 'Naptár – 811. Cserkészcsapat', description: 'Közelgő csapatmisék, portyák, versenyek és táborok a 811. cserkészcsapat programnaptárában.' },
  '/galeria': { title: 'Galéria – 811. Cserkészcsapat', description: 'Fotók táborainkról, portyáinkról és közösségi életünkről a 811. cserkészcsapatnál.' },
  '/csatlakozas': { title: 'Csatlakozz! – 811. Cserkészcsapat', description: 'Csatlakozz a váci 811. cserkészcsapathoz! Korosztályok, a csatlakozás lépései és gyakori kérdések.' },
  '/kapcsolat': { title: 'Kapcsolat – 811. Cserkészcsapat', description: 'Lépj kapcsolatba a 811. Szent József Cserkészcsapattal Vácon – cím, e-mail és közösségi média.' },
};

// Canonical / OG origin.
//
// IMPORTANT SEQUENCING NOTE: this is set to the vac811.hu apex ahead of the
// actual DNS cutover (per owner decision — see PR discussion), while the site
// is still actually served at beta.vac811.hu and vac811.hu still serves the
// old WordPress site. A canonical URL that doesn't match the domain serving it
// is normally a red flag (crawlers may ignore it, or treat beta.vac811.hu's
// pages as unindexable duplicates of a different, unrelated live site). Do
// not merge/deploy this to production until vac811.hu's DNS actually points
// at this Cloudflare Pages project — otherwise flip this back to
// 'https://beta.vac811.hu' first.
export const SITE_ORIGIN = 'https://vac811.hu';

// Normalize a router pathname to a pageSeo key: strip any trailing slash so a
// direct load of "/rolunk/" (some hosts add the slash) still resolves the same
// metadata as "/rolunk". Root stays "/".
export function normalizePath(pathname: string): string {
  return pathname.replace(/\/+$/, '') || '/';
}

export function canonicalUrl(pathname: string): string {
  const p = normalizePath(pathname);
  return `${SITE_ORIGIN}${p}`;
}
