// NOTE: Runtime content is fetched from /content/settings.json (managed by the CMS).
// This file exports the TypeScript interface and a static fallback used during the
// initial render or if the fetch fails. Editing settings.json in the CMS is now the
// single source of truth for these values across the whole site.

export interface Settings {
  siteName: string;
  tagline: string;
  address: string;
  emailMain: string;
  emailCommander: string;
  facebook: string;
  instagram: string;
  activeMemberCount: number;
  activeOrsCount: number;
  rajCount: number;
  foundedYear: number;
}

export const settingsStatic: Settings = {
  siteName: '811. Szent József Cserkészcsapat',
  tagline: 'Cserkészek Vácon 1929 óta',
  address: '2600 Vác, Dr. Csányi László krt. 58.',
  emailMain: '811@cserkesz.hu',
  emailCommander: 'kucsera.boglarka@vac811.hu',
  facebook: 'https://www.facebook.com/vac811',
  instagram: 'https://www.instagram.com/811szentjozsef',
  activeMemberCount: 232,
  activeOrsCount: 26,
  rajCount: 11,
  foundedYear: 1929,
};
