// NOTE: Runtime content is fetched from /content/camps.json (managed by Decap CMS).

export interface Camp {
  year: number;
  location: string;
  commander: string;
  theme: string;
  participants?: number;
  notes?: string;
}

export const campsStatic: Camp[] = [
  { year: 2025, location: 'Süttő, Pap-rét', commander: 'Sinka Dóra', theme: 'Kalózos kalandok', participants: 135, notes: 'Altáborparancsnok: Lázi Adél, Mészáros Béla' },
  { year: 2024, location: 'Bernecebaráti, Bodzás kút', commander: 'Máté Dorottya', theme: 'A Gyűrűk Ura', participants: 170 },
  { year: 2023, location: 'Makkoshotyka', commander: 'Kende Zoltán', theme: 'Egyiptomi kalandok' },
  { year: 2022, location: 'Alsópetény', commander: 'Melisek Máté (950. csapat)', theme: 'Ősmagyar világ', participants: 266 },
  { year: 2021, location: 'Vácrátót, 5 erdőtag', commander: 'Nagy Levente', theme: 'Magyar népmesék', participants: 120 },
  { year: 2020, location: 'Csővár, Kilián-forrás', commander: 'Nagy Levente', theme: 'Szuperhősök nyomában', participants: 100 },
  { year: 2019, location: 'Nagyoroszi, Irtásbükki-rét', commander: 'Szigeti Bence', theme: 'Harry Potter varázslatos világa', participants: 98 },
  { year: 2018, location: 'Lábatlan, Szágodó hegy', commander: 'Paulik Áron', theme: 'Cowboy kalandok', participants: 80 },
  { year: 2017, location: 'Tahitótfalu, Kecske-zátony', commander: 'Paulik Áron', theme: 'Kalózos kalandok', participants: 75 },
  { year: 2016, location: 'Homokbödöge, KNT', commander: 'Ronkay János Péter', theme: 'Vikingek világa' },
  { year: 2015, location: 'Nagyoroszi, Irtásbükki-rét', commander: 'Paulik Áron', theme: 'Keresztes lovagok kora' },
  { year: 2014, location: 'Bakonybél', commander: 'Paulik Áron', theme: 'Az ókori Róma' },
  { year: 2013, location: 'Bernecebaráti, Bábaasszony rétje', commander: 'Csáki Viktor', theme: 'Hollywoodi kalandok', participants: 80 },
];

export const camps = campsStatic;
