export interface Leader {
  name: string;
  role: string;
  email?: string;
  raj?: string;
  isStaff?: boolean;
}

export const leaders: Leader[] = [
  {
    name: 'Kucsera Boglárka',
    role: 'Csapatparancsnok',
    email: 'kucsera.boglarka@vac811.hu',
    isStaff: true,
  },
  {
    name: 'Bénik Borbála',
    role: 'Cp. helyettes – Nevelés',
    raj: 'Dorado rajparancsnok',
    isStaff: true,
  },
  {
    name: 'Kolostori Dániel',
    role: 'Cp. helyettes – Operatív',
    isStaff: true,
  },
  {
    name: 'Pellet Teréz',
    role: 'Törzsőrsvezető',
    isStaff: true,
  },
  {
    name: 'Kende Zoltán',
    role: 'Rajparancsnok',
    raj: 'Göncöl raj',
  },
  {
    name: 'Király Boglárka',
    role: 'Rajparancsnok',
    raj: 'Corvus raj',
  },
  {
    name: 'Simon Luca',
    role: 'Rajparancsnok',
    raj: 'Anonymus raj',
  },
  {
    name: 'Sinka Dóra',
    role: 'Rajparancsnok',
    raj: 'Gemini raj',
  },
  {
    name: 'Lázi Adél',
    role: 'Rajvezető',
    raj: 'Szent Hubertusz raj',
  },
  {
    name: 'Molnár Gergely',
    role: 'Rajvezető',
    raj: 'Cygnus raj',
  },
  {
    name: 'Ortutay Abigél',
    role: 'Rajvezető',
    raj: 'Taurus raj',
  },
  {
    name: 'Sinka Panna',
    role: 'Rajvezető',
    raj: 'Anonymus raj',
  },
  {
    name: 'Szabó Lili',
    role: 'Rajvezető',
    raj: 'Andromeda raj',
  },
];
