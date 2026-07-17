import { Link } from 'react-router-dom';
import { korosztalyok } from '../data/korosztalyok';
import { useContent } from '../hooks/useContent';
import { type Settings, settingsStatic } from '../data/settings';
import { settingsSchema } from '../schemas/content';
import './Scouting.css';

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
  const { data: settingsData } = useContent<Settings>('settings.json', 'settings', settingsSchema);
  const settings = settingsData ?? settingsStatic;
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
            <p>
              Csapatunk védőszentje <strong>Szent József</strong>, akinek ünnepét március 19-én tartjuk —
              ő a csapat névadója és égi pártfogója.
            </p>
          </div>
        </div>
      </section>

      {/* Köszöntés + jelszó banner */}
      <div className="jelszó-banner jelszó-banner--greeting" role="banner" aria-label="Cserkész köszöntés és jelszó">
        <p className="jelszó-banner__label">A cserkészek köszöntése</p>
        <p className="jelszó-banner__text">
          <span className="jelszó-banner__call">Jó munkát!</span>
          <span className="jelszó-banner__dash" aria-hidden="true">→</span>
          <span className="jelszó-banner__response">Légy résen!</span>
        </p>
        <p className="jelszó-banner__sub">
          A köszöntő cserkész „Jó munkát!"-ot mond, a másik „Légy résen!"-nel felel — közben
          bal kézzel fognak kezet és jobb kézzel tisztelegnek. A „Légy résen!" a cserkészek
          jelszava: készen állni mindenre, amit a nap hoz.
        </p>
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
            {korosztalyok.map(k => (
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
            A 811-es csapatban jelenleg <strong>{settings.rajCount} raj</strong> és <strong>{settings.activeOrsCount} aktív őrs</strong> működik,
            összesen <strong>{settings.activeMemberCount} cserkésszel</strong>.
          </p>
        </div>
      </section>

      {/* Jelképeink */}
      <section className="section" aria-labelledby="jelkepek-heading">
        <div className="container container--default">
          <span className="section-label">Jelképeink</span>
          <h2 id="jelkepek-heading" className="section-title">A cserkészliliom és a kézfogás</h2>
          <div className="prose scouting-intro">
            <p>
              A cserkészet jelképe a <strong>cserkészliliom</strong> (⚜️). Három szirma a fogadalom
              három fő kötelességére emlékeztet: <strong>Isten, haza és embertárs</strong> szolgálatára.
              A magyar cserkészliliom közepén gyakran a magyar címer és a „Légy résen!" jelmondat is megjelenik.
            </p>
            <p>
              A cserkészek <strong>bal kézzel</strong> fognak kezet — a szív felőli kézzel, a bizalom és
              testvériség jeleként —, miközben jobb kézzel tisztelegnek. A köszöntés: „Jó munkát!", amire
              a másik „Légy résen!"-nel felel.
            </p>
          </div>
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
