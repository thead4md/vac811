import { Link } from 'react-router-dom';
import { rajok } from '../data/rajok';
import './About.css';

const values = [
  { icon: '🙏', title: 'Hit', desc: 'Keresztény értékrenden alapuló nevelés, amelynek középpontjában az Isten felé növekedés áll.' },
  { icon: '🤝', title: 'Közösség', desc: 'Összetartó rajok és egy egységes csapat, ahol mindenki számít és mindenki otthon érzi magát.' },
  { icon: '🌲', title: 'Természet', desc: 'Az erdő és a szabadban töltött idő a cserkészélet meghatározó eleme – mozgás, kaland, felfedezés.' },
  { icon: '🧭', title: 'Jellem', desc: 'A cserkész törvény és fogadalom szerint élni – felelősség, becsület, szorgalom és segítőkészség.' },
  { icon: '🇭🇺', title: 'Magyar gyökerek', desc: 'A magyar kulturális hagyományok ápolása és a helyi, váci közösség iránti elkötelezettség.' },
  { icon: '🌟', title: 'Egyéni növekedés', desc: 'Próbák, fokozatok és szalagok – a személyes fejlődés közösségi keretben, egész életen át.' },
];

export default function About() {
  return (
    <main aria-label="Rólunk oldal">
      {/* Page Hero */}
      <section className="page-hero" aria-labelledby="about-heading">
        <div className="container">
          <div className="hero-badge">
            <svg width="12" height="12" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
              <path d="M12 2c0 0-2 2.5-2 5 0 1.1.4 2.1 1 2.8C9.4 10.6 8 12.2 8 14c0 1.5.8 2.8 2 3.5V20H9v2h6v-2h-1v-2.5c1.2-.7 2-2 2-3.5 0-1.8-1.4-3.4-3-4.2.6-.7 1-1.7 1-2.8 0-2.5-2-5-2-5z"/>
            </svg>
            Rólunk
          </div>
          <h1 id="about-heading" className="section-title section-title--lg">
            A 811-es cserkészcsapat
          </h1>
          <p className="page-hero__subtitle">
            Vác egyik legnagyobb ifjúsági szervezete vagyunk — keresztény értékek, természetszeretet
            és közösség összefonódva, 1929 óta.
          </p>
        </div>
      </section>

      {/* Overview */}
      <section className="section" aria-labelledby="overview-heading">
        <div className="container about-overview">
          <div className="about-overview__stats">
            {[
              { num: '232', label: 'Aktív cserkész' },
              { num: '26', label: 'Aktív őrs' },
              { num: '11', label: 'Raj' },
              { num: '1929', label: 'Alapítás éve' },
            ].map(s => (
              <div key={s.label} className="about-stat">
                <strong>{s.num}</strong>
                <span>{s.label}</span>
              </div>
            ))}
          </div>
          <div className="about-overview__text">
            <span className="section-label">Ki vagyunk?</span>
            <h2 id="overview-heading" className="section-title">Egy élő közösség<br/>a Dunakanyarban</h2>
            <div className="prose">
              <p>
                A 811. Szent József Cserkészcsapat a Magyar Cserkészszövetség tagcsapataként működik Vácott.
                Szervezetünk mögött a <strong>Reménység Egyesület</strong> és a <strong>Dunakanyar Ifjúságáért Alapítvány</strong> áll,
                amelyek biztosítják a stabil hátteret a csapat működéséhez.
              </p>
              <p>
                Jelenleg <strong>232 aktív cserkészt</strong> foglalunk magukban <strong>26 aktív őrsben</strong>,
                11 rajba szervezve. Csapatparancsnokunk Kucsera Boglárka, akivel és a teljes vezető csapattal
                együtt minden gyermek és fiatal számára értékes és maradandó élményt kívánunk nyújtani.
              </p>
              <p>
                Célunk Sík Sándor szavaival: <em>„emberebb emberré és magyarabb magyarrá"</em> nevelni
                mindenkit, aki a cserkész fogadalmat leteszi. A hit, a természet, a közösség és a
                jellemformálás – ezek a pillérjeink.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Values */}
      <section className="section" style={{ background: 'var(--color-surface-offset)' }} aria-labelledby="values-heading">
        <div className="container">
          <div className="text-center" style={{ marginBottom: 'var(--space-10)' }}>
            <span className="section-label">Értékeink</span>
            <h2 id="values-heading" className="section-title">Miben hiszünk?</h2>
            <p className="section-subtitle" style={{ margin: '0 auto' }}>
              A cserkésztörvény és a keresztény értékrend mentén formáljuk a jövő generációját.
            </p>
          </div>
          <div className="grid-3">
            {values.map(v => (
              <article key={v.title} className="value-card">
                <div className="value-card__icon" aria-hidden="true">{v.icon}</div>
                <h3 className="value-card__title">{v.title}</h3>
                <p className="value-card__desc">{v.desc}</p>
              </article>
            ))}
          </div>
        </div>
      </section>

      {/* Rajok */}
      <section className="section" aria-labelledby="rajok-heading">
        <div className="container">
          <div className="highlights__header" style={{ marginBottom: 'var(--space-8)' }}>
            <div>
              <span className="section-label">Szervezet</span>
              <h2 id="rajok-heading" className="section-title">Rajaink</h2>
            </div>
            <Link to="/vezetok" className="btn btn--ghost">
              Vezetők megtekintése
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
                <path d="M5 12h14M12 5l7 7-7 7"/>
              </svg>
            </Link>
          </div>
          <div className="grid-3 rajok-grid">
            {rajok.map(raj => (
              <article key={raj.name} className="raj-card">
                <div className="raj-card__header">
                  <h3 className="raj-card__name">{raj.name}</h3>
                  <span className="badge">{raj.ageGroup}</span>
                </div>
                <p className="raj-card__desc">{raj.description}</p>
              </article>
            ))}
          </div>
        </div>
      </section>

      {/* Szövetség */}
      <section className="section" style={{ background: 'var(--color-surface)' }} aria-labelledby="szovetseg-heading">
        <div className="container about-szovetseg">
          <span className="section-label">Háttér</span>
          <h2 id="szovetseg-heading" className="section-title">Szervezeti háttér</h2>
          <div className="grid-2" style={{ marginTop: 'var(--space-8)' }}>
            <div className="org-card">
              <h3>Magyar Cserkészszövetség</h3>
              <p>
                Csapatunk a Magyar Cserkészszövetség tagcsapataként működik, amelynek révén
                az országos és nemzetközi cserkészmozgalom részese vagyunk. A szövetség biztosítja
                a cserkész programrendszert, képzéseket és közösséget.
              </p>
            </div>
            <div className="org-card">
              <h3>Reménység Egyesület &amp; Dunakanyar Ifjúságáért Alapítvány</h3>
              <p>
                A csapat mögött álló civil szervezetek biztosítják a jogi és szervezeti hátteret,
                a csapatotthon fenntartását és a táborok finanszírozásának alapját.
                Támogatásukkal évtizedek óta stabil a csapat működése.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="section section--sm">
        <div className="container text-center">
          <h2 className="section-title">Kíváncsi vagy a részletekre?</h2>
          <p className="section-subtitle" style={{ margin: '0 auto var(--space-8)' }}>
            Ismerd meg a teljes történetünket, találkozz a vezetőkkel, vagy csatlakozz közvetlenül.
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
