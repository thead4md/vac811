// NOTE: Runtime content is fetched from /content/leaders.json (managed by Decap CMS).
// This file only exports the TypeScript interface and static fallback data
// used during the initial render or if the fetch fails.

export interface Leader {
  name: string;
  role: string;
  email?: string;
  raj?: string;
  isStaff?: boolean;
}

export const leadersStatic: Leader[] = [
  { name: 'Kucsera Boglárka', role: 'Csapatparancsnok', email: 'kucsera.boglarka@vac811.hu', isStaff: true },
  { name: 'Bénik Borbála', role: 'Cp. helyettes – Nevelés', raj: 'Dorado rajparancsnok', isStaff: true },
  { name: 'Kolostori Dániel', role: 'Cp. helyettes – Operatív', isStaff: true },
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
