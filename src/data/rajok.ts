// NOTE: Runtime content is fetched from /content/rajok.json, which is written
// by scripts/sync-ecset.mjs from ECSET's /felepites/ (org structure) page —
// not editable in the CMS. name/ageGroup always mirror ECSET; there is no
// editor-authored description field (a prior invented one has been removed).

export interface Raj {
  name: string;
  ageGroup: string;
}

// Verified against live ECSET data on 2026-07-17. "Anonymus raj" is absent:
// it no longer exists in ECSET (disbanded/renamed). "Operatív raj" has no
// ageGroup: ECSET doesn't classify it by age — it's a cross-age hub of work
// groups (GH, Keretmese, Lelki, Logisztika, Média, Pénzügy), not an
// age-based patrol.
export const rajokStatic: Raj[] = [
  { name: 'Corvus', ageGroup: 'Kiscserkész' },
  { name: 'Taurus', ageGroup: 'Kiscserkész' },
  { name: 'Dorado', ageGroup: 'Cserkész' },
  { name: 'Andromeda', ageGroup: 'Cserkész' },
  { name: 'Cygnus', ageGroup: 'Cserkész' },
  { name: 'Gemini', ageGroup: 'Kósza' },
  { name: 'Göncöl', ageGroup: 'Kósza' },
  { name: 'Szent Hubertusz', ageGroup: 'Vándor' },
  { name: 'Felnőtt raj', ageGroup: 'Felnőtt' },
  { name: 'Operatív raj', ageGroup: '' },
];

export const rajok = rajokStatic;
