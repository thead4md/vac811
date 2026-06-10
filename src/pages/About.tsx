import { Link } from 'react-router-dom';
import './About.css';

const values = [
  { icon: '✝️', title: 'Hit', desc: 'Keresztény értékrenden alapuló nevelés — Isten, haza, közösség hármasában. A cserkész törvény és fogadalom keresztény szellemű elköteleződés.' },
  { icon: '🤝', title: 'Közösség', desc: 'Összetartó őrsök és rajok, ahol mindenki számít. A cserkész minden cserkészt testvérének tekint — ez nem szólam, hanem törvény.' },
  { icon: '🌲', title: 'Természet', desc: 'Az erdő, a tábortűz és a szabadban töltött idő a cserkészélet meghatározó eleme. A cserkész szereti a természetet, jó az állatokhoz és kíméli a növényeket.' },
  { icon: '🧭', title: 'Jellem', desc: 'Egyeneslelkűség, becsület, szorgalom és segítőkészség — a cserkésztörvény 10 pontja életre szóló iránytű.' },
  { icon: '🇭🇺', title: 'Magyar gyökerek', desc: 'A magyar kulturális hagyományok ápolása és a helyi, váci közösség iránti elkötelezettség. "Magyarabb magyart nevelni."' },
  { icon: '⚜️', title: 'Egyéni növekedés', desc: 'Próbák, fokozatok és szalagok — a személyes fejlődés közösségi keretben. Minden cserkész a saját tempójában fejlődik, de sosem egyedül.' },
];

const rajok = [
  { name: 'Anonymus', ageGroup: 'Idősebb korosztály', desc: 'Tapasztalt, idősebb cserkészekből álló raj.' },
  { name: 'Corvus', ageGroup: 'Középső korosztály', desc: 'Dinamikus, aktív fiatalokból álló raj.' },
  { name: 'Taurus', ageGroup: 'Középső korosztály', desc: 'Kitartó és elszánt cserkészek közössége.' },
  { name: 'Dorado', ageGroup: 'Fiatalabb korosztály', desc: 'Kalandszerető, felfedező szellemű raj.' },
  { name: 'Andromeda', ageGroup: 'Fiatalabb korosztály', desc: 'Összetartó, barátságos cserkészcsapat.' },
  { name: 'Cygnus', ageGroup: 'Fiatalabb korosztály', desc: 'Kreatív és lelkes cserkészek rajja.' },
  { name: 'Gemini', ageGroup: 'Fiatalabb korosztály', desc: 'Vidám, szoros barátságokra épülő közösség.' },
  { name: 'Göncöl', ageGroup: 'Idősebb korosztály', desc: 'Hagyományőrző, tapasztalt cserkészekből álló raj.' },
  { name: 'Szent Hubertusz', ageGroup: 'Középső korosztály', desc: 'Természetszerető, erdőjáró szellemű raj.' },
  { name: 'Felnőtt raj', ageGroup: 'Felnőtt', desc: 'A felnőtt cserkészek és vezető képzések közössége.' },
  { name: 'Operatív raj', ageGroup: 'Felnőtt / Senior', desc: 'A csapat szervezési és logisztikai feladatait ellátó raj.' },
];

export default function About() {
  return (
    <main aria-label="Rólunk oldal">
      {/* Hero */}
      <section className="page-hero" aria-labelledby="about-heading">
        <div className="container">
          <div className="hero-badge">⚜️ Rólunk</div>
          <h1 id="about-heading" className="section-title section-title--lg">
            A 811-es cserkészcsapat
          </h1>
          <p className="page-hero__subtitle">
            Vác egyik legnagyobb ifjúsági szervezete vagyunk — keresztény értékek,
            természetszeretet és közösség összefonódva, 1929 óta.
          </p>
        </div>
      </section>

      {/* Overview */}
      <section className="section" aria-labelledby="overview-heading">
        <div className="container">
          <div className="about-overview">
            <div className="about-stats" aria-label="Csapat statisztikák">
              <div className="about-stat">
                <strong>232</strong>
                <span>aktív cserkész</span>
              </div>
              <div className="about-stat">
                <strong>26</strong>
                <span>aktív őrs</span>
              </div>
              <div className="about-stat">
                <strong>11</strong>
                <span>raj</span>
              </div>
              <div className="about-stat">
                <strong>1929</strong>
                <span>alapítás éve</span>
              </div>
            </div>
            <div className="about-text">
              <span className="section-label">Ki vagyunk?</span>
              <h2 id="overview-heading" className="section-title">
                Egy élő közösség a Dunakanyarban
              </h2>
              <div className="prose">
                <p>
                  A 811. Szent József Cserkészcsapat a Magyar Cserkészszövetség tagcsapataként
                  működik Vácott. Szervezetünk mögött a <strong>Reménység Egyesület</strong> és
                  a <strong>Dunakanyur Ifjúságáért Alapítvány</strong> áll, amelyek biztosítják
                  a stabil hátteret a csapat működéséhez.
                </p>
                <p>
                  Jelenleg <strong>232 aktív cserkészt</strong> foglalunk magában <strong>26 aktív
                  őrsben</strong>, 11 rajba szervezve. Csapatparancsnokunk Kucsera Boglárka,
                  aki az egész vezető csapattal együtt minden gyermek és fiatal számára értékes
                  és maradandó élményt kíván nyújtani.
                </p>
                <p>
                  Célunk Sík Sándor szavaival: <em>„emberebb embert és magyarabb magyart nevelni"</em>,
                  miközben szolgálják Istent, a hazát, embertársaikat és a magyarságot.
                </p>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Jelszó */}
      <div className="jelszó-banner" role="banner" aria-label="Cserkész jelszó">
        <p className="jelszó-banner__label">A cserkész jelszava</p>
        <p className="jelszó-banner__text">Légy résen!</p>
        <p className="jelszó-banner__sub">— készen állni mindenre, amit a nap hoz</p>
      </div>

      {/* Values */}
      <section className="section" aria-labelledby="values-heading">
        <div className="container">
          <span className="section-label">Értékeink</span>
          <h2 id="values-heading" className="section-title">Miben hiszünk?</h2>
          <p className="section-subtitle" style={{ marginBottom: 'var(--space-10)' }}>
            A cserkésztörvény és a keresztény értékrend mentén formáljuk a jövő generációját.
          </p>
          <div className="grid-3">
            {values.map(v => (
              <article key={v.title} className="value-card card">
                <span className="value-card__icon" aria-hidden="true">{v.icon}</span>
                <h3 className="value-card__title">{v.title}</h3>
                <p className="value-card__desc">{v.desc}</p>
              </article>
            ))}
          </div>
        </div>
      </section>

      {/* Cserkésztörvény */}
      <section className="section" style={{ background: 'var(--color-surface-offset)' }} aria-labelledby="law-heading">
        <div className="container container--default">
          <span className="section-label">Cserkésztörvény</span>
          <h2 id="law-heading" className="section-title">A tíz cserkésztörvény</h2>
          <p style={{ color: 'var(--color-text-muted)', marginBottom: 'var(--space-8)' }}>
            A cserkész nem csupán kívülről tanulja meg a törvényeket — megéli őket.
            Ez az a 10 pont, amely egy cserkész mindennapjait irányítja.
          </p>
          <ol className="scout-law" aria-label="A tíz cserkésztörvény">
            {[
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
            ].map((t, i) => (
              <li key={i}>
                <span className="scout-law__num" aria-hidden="true">{i + 1}</span>
                <span className="scout-law__text">{t}</span>
              </li>
            ))}
          </ol>
          <p style={{ marginTop: 'var(--space-6)', textAlign: 'center' }}>
            <Link to="/cserkeszet" className="btn btn--outline">
              Tudj meg többet a cserkészetről →
            </Link>
          </p>
        </div>
      </section>

      {/* Rajok */}
      <section className="section" aria-labelledby="rajok-heading">
        <div className="container">
          <span className="section-label">Szervezet</span>
          <h2 id="rajok-heading" className="section-title">Rajaink</h2>
          <p className="section-subtitle" style={{ marginBottom: 'var(--space-8)' }}>
            A csapat 11 rajból és 26 aktív őrsből áll. Minden raj élén tapasztalt
            rajparancsnok vagy rajvezető áll.
          </p>
          <div className="grid-3">
            {rajok.map(raj => (
              <article key={raj.name} className="raj-card card">
                <div className="raj-card__header">
                  <h3 className="raj-card__name">{raj.name}</h3>
                  <span className="badge">{raj.ageGroup}</span>
                </div>
                <p className="raj-card__desc">{raj.desc}</p>
              </article>
            ))}
          </div>
          <p style={{ textAlign: 'center', marginTop: 'var(--space-6)' }}>
            <Link to="/rajok" className="btn btn--outline">Rajok részletesen →</Link>
          </p>
        </div>
      </section>

      {/* Szervezeti háttér */}
      <section className="section section--sm" style={{ background: 'var(--color-surface)' }} aria-labelledby="background-heading">
        <div className="container">
          <span className="section-label">Háttér</span>
          <h2 id="background-heading" className="section-title">Szervezeti háttér</h2>
          <div className="about-org-grid">
            <div className="about-org-card">
              <h3>Magyar Cserkészszövetség</h3>
              <p>
                Csapatunk a Magyar Cserkészszövetség tagcsapata. A szövetség az ország- és
                nemzetközi cserkészprogramok keretein belül biztosítja a programszintet,
                képviselet és közösséget.
              </p>
              <a href="https://cserkesz.hu" target="_blank" rel="noopener noreferrer" className="btn btn--ghost" style={{ marginTop: 'var(--space-3)' }}>
                cserkesz.hu →
              </a>
            </div>
            <div className="about-org-card">
              <h3>Reménység Egyesület &amp; Dunakanyur Ifjúságáért Alapítvány</h3>
              <p>
                A csapat mögött álló civil szervezetek biztosítják a jogi és szervezeti
                hátteret, a csapatotthon fenntartását és a táborok finanszírozásának alapját.
                Támogatásukkal évtizedek óta stabil a csapat működése.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="section section--sm" aria-labelledby="about-cta-heading">
        <div className="container text-center">
          <h2 id="about-cta-heading" className="section-title">Kíváncsi vagy a részletekre?</h2>
          <p className="section-subtitle" style={{ margin: '0 auto var(--space-8)' }}>
            Ismerd meg a teljes történetünket, találkozz a vezetőkkel, vagy csatlakozz közvetlenül!
          </p>
          <div className="flex-center gap-4" style={{ flexWrap: 'wrap' }}>
            <Link to="/tortenet" className="btn btn--primary btn--lg">Történetünk</Link>
            <Link to="/vezetok" className="btn btn--outline btn--lg">Vezető csapat</Link>
            <Link to="/csatlakozas" className="btn btn--ghost btn--lg">Csatlakozás</Link>
          </div>
        </div>
      </section>
    </main>
  );
}
