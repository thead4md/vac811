import { Link } from 'react-router-dom';
import './Scouting.css';

const korosztályok = [
  {
    name: 'Kiscserkész',
    age: '6–10 év',
    neckColor: '#3b82f6',
    neckLabel: 'Kék nyakkendő',
    desc: 'A legfiatalabb cserkészek közössége. Játékos formában, természetközelben tanulnak önállóságot, közösségi életet és az alapvető cserkésztudást.',
    probák: ['Piros pajzs próba', 'Fehér pajzs próba', 'Zöld pajzs próba'],
    promise: 'kiscserkész ígéret',
  },
  {
    name: 'Cserkész',
    age: '10–15 év',
    neckColor: '#2d6a4f',
    neckLabel: 'Zöld nyakkendő',
    desc: 'Az újoncév végén fogadalmat tesz a cserkész — egy életre szóló elkötelezettség. Táborozás, portyázás, tájékozódás, elsősegély és közösségi élet jellemzi ezt a kort.',
    probák: ['Újoncpróba', 'I. próba (szalag)', 'II. próba (nyílhegy)', 'III. próba'],
    promise: 'cserkész fogadalom',
  },
  {
    name: 'Kósza',
    age: '15–18 év',
    neckColor: '#2d6a4f',
    neckLabel: 'Zöld nyakkendő',
    desc: 'Önállóbb programok, komolyabb cserkésztudás és aktív közösségi szolgálat. A kószák már részt vesznek a fiatalabbak nevelésében is.',
    probák: ['Különpróbák', 'Örsvezetői képzés'],
    promise: 'cserkész fogadalom',
  },
  {
    name: 'Vándor',
    age: '19–23 év',
    neckColor: '#6b7280',
    neckLabel: 'Szürke nyakkendő',
    desc: 'Fiatal felnőtt cserkészek, akik önálló programokat szerveznek, túrákat vezényelnek és a cserkész közösség aktív mozgatói.',
    probák: ['Vándorpróba', 'Vezető képzések'],
    promise: 'cserkész fogadalom',
  },
  {
    name: 'Felnőtt vezető',
    age: '18+ év',
    neckColor: '#2d6a4f',
    neckLabel: 'Zöld (sárga csíkkal)',
    desc: 'Képesített cserkészvezetők — segédtisztek és tisztek — akik a rajok és az egész csapat szakmai munkáját irányítják.',
    probák: ['Segédtiszti képzés', 'Tiszti képzés'],
    promise: 'cserkész fogadalom',
  },
];

const törvények = [
  'A cserkész egyeneslelkű és feltétlenül igazat mond.',
  'A cserkész híven teljesíti kötelességeit, melyekkel Istennek, hazájának és embertársainak tartozik.',
  'A cserkész ahol tud, segít.',
  'A cserkész minden cserkészt testvérének tekint.',
  'A cserkész másokkal szemben gyöngéd, magával szemben szigorú.',
  'A cserkész szereti a természetet, jó az állatokhoz és kíméli a növényeket.',
  'A cserkész feljebbvalóinak jó lélekkel és készségesen engedelmeskedik.',
  'A cserkész vidám és meggondolt.',
  'A cserkész takarékos.',
  'A cserkész testben és lélekben tiszta.',
];

export default function Scouting() {
  return (
    <main aria-label="A cserkészetről oldal">

      {/* Hero */}
      <section className="page-hero" aria-labelledby="scouting-heading">
        <div className="container">
          <div className="hero-badge">⚜️ A cserkészetről</div>
          <h1 id="scouting-heading" className="section-title section-title--lg">
            Mi a cserkészet?
          </h1>
          <p className="page-hero__subtitle">
            A cserkészet a világ legnagyobb ifjúsági mozgalma — Magyarországon 1910 óta,
            a 811-es csapatban 1929 óta neveljük a fiatalokat keresztény értékek,
            természetszeretet és közösség jegyében.
          </p>
        </div>
      </section>

      {/* What is scouting */}
      <section className="section" aria-labelledby="mi-a-cserkeszet">
        <div className="container container--default">
          <span className="section-label">Alapok</span>
          <h2 id="mi-a-cserkeszet" className="section-title">Emberebb embert, magyarabb magyart</h2>
          <div className="prose scouting-intro">
            <p>
              A cserkészet célja — ahogy Sík Sándor megfogalmazta — <strong>„emberebb embert
              és magyarabb magyart nevelni"</strong>. Nem iskola, nem sport, nem egyházi ifjúsági
              szervezet — hanem mindezek ötvözete, egy életre szóló közösség.
            </p>
            <p>
              A cserkész nem csupán akkor cserkész, amikor egyenruhát visel vagy táborban van.
              A fogadalom — amelyet egyszer, egész életre tesz le — arra szólítja, hogy
              mindennapjaiban is a tíz cserkésztörvény szerint éljen.
            </p>
            <p>
              A Magyar Cserkészszövetség (MCSSZ) tagcsapataként a 811-es csapat
              a <strong>Reménység Egyesület</strong> és a <strong>Dunakanyur Ifjúságáért Alapítvány</strong> háttérszervezetei
              által működik Vácott, 232 aktív cserkésszel.
            </p>
          </div>
        </div>
      </section>

      {/* Jelszó banner */}
      <div className="jelszó-banner" role="banner" aria-label="Cserkész jelszó">
        <p className="jelszó-banner__label">A cserkész jelszava</p>
        <p className="jelszó-banner__text">Légy résen!</p>
        <p className="jelszó-banner__sub">— készen állni mindenre, amit a nap hoz</p>
      </div>

      {/* Korosztályok */}
      <section className="section" aria-labelledby="korosztályok-heading">
        <div className="container">
          <span className="section-label">Korosztályok</span>
          <h2 id="korosztályok-heading" className="section-title">Kinek való a cserkészet?</h2>
          <p className="section-subtitle" style={{ marginBottom: 'var(--space-10)' }}>
            A cserkészetben mindenki megtalálja a helyét 6 éves kortól felnőttkorig.
            Minden korosztálynak saját program, saját próbák és saját nyakkendőszín jár.
          </p>
          <div className="korosztaly-grid">
            {korosztályok.map(k => (
              <article key={k.name} className="korosztaly-card">
                <div className="korosztaly-card__header">
                  <div
                    className="korosztaly-card__neckerchief"
                    style={{ background: k.neckColor }}
                    title={k.neckLabel}
                    aria-label={k.neckLabel}
                  />
                  <div>
                    <h3 className="korosztaly-card__name">{k.name}</h3>
                    <p className="korosztaly-card__age">{k.age}</p>
                    <p className="korosztaly-card__necktext">{k.neckLabel}</p>
                  </div>
                </div>
                <p className="korosztaly-card__desc">{k.desc}</p>
                <div className="korosztaly-card__probak">
                  {k.probák.map(p => <span key={p}>{p}</span>)}
                </div>
              </article>
            ))}
          </div>
        </div>
      </section>

      {/* Szervezeti felépítés */}
      <section className="section section--sm" style={{ background: 'var(--color-surface-offset)' }} aria-labelledby="structure-heading">
        <div className="container">
          <span className="section-label">Szervezet</span>
          <h2 id="structure-heading" className="section-title">Hogyan épül fel a csapat?</h2>
          <p className="section-subtitle" style={{ marginBottom: 'var(--space-8)' }}>
            A cserkész szervezet alulról felfelé épül — a legkisebb egységtől az országos szövetségig.
          </p>
          <div className="scout-structure" role="list" aria-label="Szervezeti egységek">
            <div className="scout-structure__unit" role="listitem">
              <strong>Őrs</strong>
              <span>6–8 cserkész</span>
            </div>
            <div className="scout-structure__arrow" aria-hidden="true">→</div>
            <div className="scout-structure__unit" role="listitem">
              <strong>Raj</strong>
              <span>3–4 őrs (~20–30 fő)</span>
            </div>
            <div className="scout-structure__arrow" aria-hidden="true">→</div>
            <div className="scout-structure__unit" role="listitem">
              <strong>Csapat</strong>
              <span>több raj együtt</span>
            </div>
            <div className="scout-structure__arrow" aria-hidden="true">→</div>
            <div className="scout-structure__unit" role="listitem">
              <strong>Körzet / Kerület</strong>
              <span>több csapat</span>
            </div>
            <div className="scout-structure__arrow" aria-hidden="true">→</div>
            <div className="scout-structure__unit" role="listitem">
              <strong>MCSSZ</strong>
              <span>Magyar Cserkészszövetség</span>
            </div>
          </div>
          <p className="scouting-structure-note">
            A 811-es csapatban jelenleg <strong>11 raj</strong> és <strong>26 aktív őrs</strong> működik,
            összesen <strong>232 cserkésszel</strong>.
          </p>
        </div>
      </section>

      {/* Fogadalom */}
      <section className="section" aria-labelledby="fogadalom-heading">
        <div className="container container--default">
          <span className="section-label">Fogadalom</span>
          <h2 id="fogadalom-heading" className="section-title">Egy életre szóló ígéret</h2>
          <p style={{ color: 'var(--color-text-muted)', marginBottom: 'var(--space-6)' }}>
            A cserkész fogadalom egyszer hangzik el — és egész életre szól. Az újoncév végén,
            ha a jelölt bizonyította rátermettségét, ünnepélyes keretek között teszi le.
            Ettől a pillanattól viseli a zöld nyakkendőt.
          </p>
          <blockquote className="fogadalom-quote">
            <p>
              „Én, [név], fogadom, hogy híven teljesítem kötelességeimet, amelyekkel
              Istennek, hazámnak és embertársaimnak tartozom. Minden lehetőt megteszek,
              hogy másokon segítsek. Ismerem a cserkésztörvényt és azt mindenkor megtartom."
            </p>
            <cite>— Cserkész fogadalom, Magyar Cserkészszövetség</cite>
          </blockquote>

          <h3 style={{ fontFamily: 'Playfair Display, serif', marginTop: 'var(--space-10)', marginBottom: 'var(--space-4)', fontSize: 'var(--text-xl)' }}>
            Kiscserkész ígéret
          </h3>
          <p style={{ color: 'var(--color-text-muted)', marginBottom: 'var(--space-4)' }}>
            A kiscserkészek még nem fogadalmat tesznek, hanem ígéretet — a saját koruknak megfelelő, egyszerűbb szavakkal:
          </p>
          <blockquote className="fogadalom-quote">
            <p>„Én, [név], ígérem, hogy jó leszek. Ismerem a kiscserkész törvényt, és azt mindenkor megtartom."</p>
            <cite>— Kiscserkész ígéret</cite>
          </blockquote>
        </div>
      </section>

      {/* Cserkésztörvény */}
      <section className="section" style={{ background: 'var(--color-surface-offset)' }} aria-labelledby="torveny-heading">
        <div className="container container--default">
          <span className="section-label">Cserkésztörvény</span>
          <h2 id="torveny-heading" className="section-title">A tíz cserkésztörvény</h2>
          <p style={{ color: 'var(--color-text-muted)', marginBottom: 'var(--space-8)' }}>
            Baden-Powell, a cserkészet megalapítója tíz pontban foglalta össze azokat a szabályokat,
            amelyek alapján egy cserkész él. Nem elég kívülről megtanulni — meg kell élni őket.
          </p>
          <ol className="scout-law" aria-label="A tíz cserkésztörvény">
            {törvények.map((t, i) => (
              <li key={i}>
                <span className="scout-law__num" aria-hidden="true">{i + 1}</span>
                <span className="scout-law__text">{t}</span>
              </li>
            ))}
          </ol>
        </div>
      </section>

      {/* CTA */}
      <section className="section join-cta" aria-labelledby="scouting-cta-heading">
        <div className="container join-cta__inner">
          <h2 id="scouting-cta-heading" className="join-cta__title">Készen állsz?</h2>
          <p className="join-cta__subtitle">
            Ha felkeltette az érdeklődésed a cserkészet, gyere el egy összejövetelre,
            vagy írj nekünk — szívesen várunk mindenkit!
          </p>
          <div className="join-cta__actions">
            <Link to="/csatlakozas" className="btn btn--primary btn--lg">Csatlakozz hozzánk</Link>
            <Link to="/kapcsolat" className="btn btn--ghost btn--lg">Írj nekünk</Link>
          </div>
        </div>
      </section>

    </main>
  );
}
