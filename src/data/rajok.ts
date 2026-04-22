// NOTE: Runtime content is fetched from /content/rajok.json (managed by Decap CMS).

export interface Raj {
  name: string;
  description: string;
  ageGroup: string;
}

export const rajokStatic: Raj[] = [
  { name: 'Anonymus', description: 'Tapasztalt, idősebb cserkészekből álló raj.', ageGroup: 'Idősebb korosztály' },
  { name: 'Corvus', description: 'Dinamikus, aktív fiatalokból álló raj.', ageGroup: 'Középső korosztály' },
  { name: 'Taurus', description: 'Kitartó és elszánt cserkészek közössége.', ageGroup: 'Középső korosztály' },
  { name: 'Dorado', description: 'Kalandszerető, felfedező szellemű raj.', ageGroup: 'Fiatalabb korosztály' },
  { name: 'Andromeda', description: 'Összetartó, barátságos csapat.', ageGroup: 'Fiatalabb korosztály' },
  { name: 'Cygnus', description: 'Kreatív és lelkes cserkészek rajja.', ageGroup: 'Fiatalabb korosztály' },
  { name: 'Gemini', description: 'Vidám, szoros barátságokra épülő közösség.', ageGroup: 'Fiatalabb korosztály' },
  { name: 'Göncöl', description: 'Hagyományőrző, tapasztalt cserkészekből álló raj.', ageGroup: 'Idősebb korosztály' },
  { name: 'Szent Hubertusz', description: 'Természetszerető, erdőjáró szellemű raj.', ageGroup: 'Középső korosztály' },
  { name: 'Felnőtt raj', description: 'A felnőtt cserkészek és vezetők közössége.', ageGroup: 'Felnőtt' },
  { name: 'Operatív raj', description: 'A csapat szervezési és logisztikai feladatait ellátó raj.', ageGroup: 'Felnőtt / Senior' },
];

export const rajok = rajokStatic;
