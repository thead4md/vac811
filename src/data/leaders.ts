// NOTE: Runtime content is fetched from /content/leaders.json (managed by Sveltia CMS).
// This file only exports the TypeScript interface and static fallback data
// used during the initial render or if the fetch fails.

export interface Leader {
  name: string;
  role: string;
  email?: string;
  raj?: string;
  isStaff?: boolean;
  /** Optional portrait path managed by the CMS (e.g. /images/uploads/...). */
  photo?: string;
}

/** Build a usable <img src> from a CMS-stored media path, accounting for the
 *  site's base path. Returns '' for empty input. */
export function leaderPhotoSrc(photo?: string): string {
  if (!photo) return '';
  if (/^https?:\/\//.test(photo)) return photo;
  return `${import.meta.env.BASE_URL}${photo.replace(/^\/+/, '')}`;
}

/** Two-letter monogram fallback when no portrait is set. */
export function initials(name: string): string {
  return name.split(' ').map((n) => n[0]).join('').slice(0, 2);
}

export const leadersStatic: Leader[] = [
  { name: 'Kucsera Boglárka', role: 'Csapatparancsnok', email: 'kucsera.boglarka@vac811.hu', isStaff: true },
  { name: 'Bénik Borbála', role: 'Csapatparancsnok-helyettes – Nevelés', raj: 'Dorado rajparancsnok', isStaff: true },
  { name: 'Kolostori Dániel', role: 'Csapatparancsnok-helyettes – Operatív', isStaff: true },
  { name: 'Pellet Teréz', role: 'Törzsőrsvezető', isStaff: true },
  { name: 'Kende Zoltán', role: 'Rajparancsnok', raj: 'Göncöl raj', isStaff: false },
  { name: 'Király Boglárka', role: 'Rajparancsnok', raj: 'Corvus raj', isStaff: false },
  { name: 'Simon Luca', role: 'Rajparancsnok', raj: 'Anonymus raj', isStaff: false },
  { name: 'Sinka Dóra', role: 'Rajparancsnok', raj: 'Gemini raj', isStaff: false },
  { name: 'Lázi Adél', role: 'Rajvezető', raj: 'Szent Hubertusz raj', isStaff: false },
  { name: 'Molnár Gergely', role: 'Rajvezető', raj: 'Cygnus raj', isStaff: false },
  { name: 'Ortutay Abigél', role: 'Rajvezető', raj: 'Taurus raj', isStaff: false },
  { name: 'Sinka Panna', role: 'Rajvezető', raj: 'Anonymus raj', isStaff: false },
  { name: 'Szabó Lili', role: 'Rajvezető', raj: 'Andromeda raj', isStaff: false },
];

// Keep legacy export for components that haven't migrated yet
export const leaders = leadersStatic;
