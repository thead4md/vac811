/** Korosztályok (age sections) — single source of truth per MCSSZ national standards */
export interface Korosztaly {
  name: string
  age: string
  neckColor: string
  neckLabel: string
  /** Longer description used on the /cserkeszet page. */
  desc: string
  /** Shorter description used on the /csatlakozas page. */
  descShort: string
  probák: string[]
  promise: string
  icon: string
}

export const korosztalyok: Korosztaly[] = [
  {
    name: 'Kiscserkész',
    age: '6–10 év',
    neckColor: '#f97316',
    neckLabel: 'Narancssárga nyakkendő',
    desc: 'A legfiatalabb cserkészek közössége. Játékos formában, természetközelben tanulnak önállóságot, közösségi életet és az alapvető cserkésztudást.',
    descShort: 'Játékos formában, természetközelben tanulnak önállóságot és közösségi életet. Három pajzs próbát teljesítenek (piros, fehér, zöld).',
    probák: ['Piros pajzs próba', 'Fehér pajzs próba', 'Zöld pajzs próba'],
    promise: 'kiscserkész ígéret',
    icon: '🌱',
  },
  {
    name: 'Cserkész',
    age: '10–15 év',
    neckColor: '#2d6a4f',
    neckLabel: 'Zöld nyakkendő',
    desc: 'Az újoncév végén fogadalmat tesz a cserkész — egy életre szóló elkötelezettség. Nyári táborozás, portyázás, tájékozódás, elsősegély és közösségi élet jellemzi ezt a kort.',
    descShort: 'Az újoncév végén leteszi a cserkész fogadalmat — egy életre szóló elköteleződés. Nyári táborozás, portya, tájékozódás, elsősegély.',
    probák: ['Újoncpróba', 'I. próba'],
    promise: 'cserkész fogadalom',
    icon: '🌿',
  },
  {
    name: 'Kósza',
    age: '15–18 év',
    neckColor: '#2d6a4f',
    neckLabel: 'Zöld nyakkendő',
    desc: 'Önállóbb programok, komolyabb cserkésztudás és aktív közösségi szolgálat. A kószák már részt vesznek a fiatalabbak nevelésében is.',
    descShort: 'Önállóbb programok, különpróbák, örsvezetői képzés. A kószák már aktívan segítenek a fiatalabb korosztályok nevelésében is.',
    probák: ['II. próba', 'III. próba', 'Különpróbák', 'Őrsvezetői képzés'],
    promise: 'cserkész fogadalom',
    icon: '🌲',
  },
  {
    name: 'Vándor',
    age: '19–23 év',
    neckColor: '#6b7280',
    neckLabel: 'Szürke nyakkendő',
    desc: 'Fiatal felnőtt cserkészek, akik önálló programokat szerveznek, túrákat vezényelnek és a cserkész közösség aktív mozgatói.',
    descShort: 'Fiatal felnőtt cserkészek, akik önálló programokat szerveznek és a közösség motorjai. Vándorpróba és vezető képzések jellemzik.',
    probák: ['Vándorpróba', 'Vezető képzések'],
    promise: 'cserkész fogadalom',
    icon: '🧭',
  },
  {
    name: 'Felnőtt',
    age: '23+ év',
    neckColor: '#2d6a4f',
    neckLabel: 'Zöld (sárga csíkkal)',
    desc: 'Felnőtt cserkészek és önkéntesek, akik tapasztalatukkal és elkötelezettségükkel a közösség gerincét alkotják. Önkéntesként is csatlakozhatsz — mindig szükség van lelkes felnőttekre!',
    descShort: 'Felnőtt tagok és önkéntesek, akik tapasztalatukkal a csapat gerincét alkotják. Önkéntesként is csatlakozhatsz — mindig szükség van lelkes felnőttekre!',
    probák: ['Segédtiszti képzés', 'Tiszti képzés'],
    promise: 'cserkész fogadalom',
    icon: '⚜️',
  },
]

export interface KorosztalySummary {
  icon: string
  name: string
  age: string
  neckColor: string
  description: string
}

// Condensed four-card view for the homepage (Vándor + Felnőtt vezető merged).
export const korosztalyokSummary: KorosztalySummary[] = [
  {
    icon: '🌱',
    name: 'Kiscserkész',
    age: '6–10 év',
    neckColor: '#f97316',
    description: 'Játékos formában, természetközelben tanulnak önállóságot. Piros, fehér és zöld pajzs próbákkal bizonyítják tudásukat.',
  },
  {
    icon: '🌿',
    name: 'Cserkész',
    age: '10–15 év',
    neckColor: '#2d6a4f',
    description: 'Az újoncév végén leteszi a fogadalmat — egy életre. Táborozás, portya, tájékozódás és valódi cserkésztudás.',
  },
  {
    icon: '🌲',
    name: 'Kósza',
    age: '15–18 év',
    neckColor: '#2d6a4f',
    description: 'Önállóbb programok, különpróbák és örsvezetői képzés. A kószák aktívan segítenek a fiatalabb rajok életében.',
  },
  {
    icon: '🧭',
    name: 'Vándor',
    age: '19–23 év',
    neckColor: '#6b7280',
    description: 'Fiatal felnőtt cserkészek, akik önálló programokat szerveznek és a közösség motorjai. Vándorpróba és vezető képzések jellemzik.',
  },
  {
    icon: '⚜️',
    name: 'Felnőtt',
    age: '23+ év',
    neckColor: '#2d6a4f',
    description: 'Felnőtt tagok és önkéntesek, akik tapasztalatukkal és elkötelezettségükkel a csapat gerincét alkotják. Mindig szükség van lelkes felnőttekre!',
  },
]
