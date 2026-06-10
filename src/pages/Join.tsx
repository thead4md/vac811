import { Link } from 'react-router-dom';
import { korosztalyok as korosztályok } from '../data/korosztalyok';
import './Join.css';

const faq = [
  {
    q: 'Hány éves kortól lehet csatlakozni?',
    a: 'A kiscserkész program 6 éves kortól indul. Felnőtteknek is van lehetőség csatlakozni önkéntesként vagy aktív cserkészként.',
  },
  {
    q: 'Kell-e előzetes tapasztalat a cserkészethez?',
    a: 'Nem! Mindenkit befogadunk, legyen ez az első lépés a cserkész életben. A rajvezető és a tapasztaltabb cserkészek segítenek az indulásban.',
  },
  {
    q: 'Mikor és hol találkozik a csapat?',
    a: 'A rajgyűlések általában hétvégén, a csapatotthonban zajlanak (2600 Vác, Dr. Csányi László krt. 58.). A pontos időpontokat az adott rajvezető közli.',
  },
  {
    q: 'Van-e tagsági díj?',
    a: 'Igen, van egy éves tagsági díj, amely fedezi a Magyar Cserkészszövetség regisztrációs költségeit és hozzájárul a csapat működéséhez. A pontos összegről a csapatparancsnok ad tájékoztatást.',
  },
  {
    q: 'Mit kell hozni az első alkalomra?',
    a: 'Az első alkalomra nincs szükség felszerelésre — kényelmes sportruházat ajánlott. A cserkész egyenruhára (ing, nyakkendő) akkor lesz szükség, amikor a gyermek tagként csatlakozik.',
  },
  {
    q: 'Hogyan értesülök a programokról?',
    a: 'A csapat Facebook- és Instagram-oldalain, illetve a rajvezetőn keresztül. Belépés után a rajvezető tartja a kapcsolatot a szülőkkel és a cserkészekkel.',
  },
  {
    q: 'Mit jelent a cserkész fogadalom?',
    a: 'A cserkész fogadalom egyszer hangzik el és egész életre szól. Az újoncév végén, ünnepélyes keretek között teszi le a cserkész — ha felkészült rá. Ettől a pillanattól viseli a zöld nyakkendőt.',
  },
  {
    q: 'Biztosított-e a felügyelet a programokon?',
    a: 'Igen, minden programon felnőtt vezető felügyel. A táborokon és portyákon minden raj élén tapasztalt, képesített felnőtt vezető áll.',
  },
];

export default function Join() {
  return (
    <main aria-label="Csatlakozás oldal">
      {/* Hero */}
      <section className="page-hero" aria-labelledby="join-page-heading">
        <div className="container">
          <div className="hero-badge">⚜️ Csatlakozás</div>
          <h1 id="join-page-heading" className="section-title section-title--lg">
            Csatlakozz a 811-es csapathoz!
          </h1>
          <p className="page-hero__subtitle">
            Legyen szó gyermekedről vagy önmagadról — szívesen fogadunk mindenkit,
            aki nyitott a cserkészéletre. A jelszó: <strong>Légy résen!</strong>
          </p>
        </div>
      </section>

      {/* Korosztályok */}
      <section className="section" aria-labelledby="korosztaly-heading">
        <div className="container">
          <span className="section-label">Kinek szól?</span>
          <h2 id="korosztaly-heading" className="section-title">Melyik korosztályba tartozol?</h2>
          <p className="section-subtitle" style={{ marginBottom: 'var(--space-10)' }}>
            A cserkészetben 6 éves kortól felnőttkorig mindenki megtalálja a helyét.
            Minden korosztálynak saját program, próbák és nyakkendőszín jár.
          </p>
          <div className="korosztaly-grid">
            {korosztályok.map(k => (
              <article key={k.name} className="korosztaly-card">
                <div className="korosztaly-card__header">
                  <div
                    className="korosztaly-card__neckerchief"
                    style={{ background: k.neckColor }}
                    aria-label={k.neckLabel}
                    title={k.neckLabel}
                  />
                  <div>
                    <h3 className="korosztaly-card__name">{k.name}</h3>
                    <p className="korosztaly-card__age">{k.age}</p>
                    <p className="korosztaly-card__necktext">{k.neckLabel}</p>
                  </div>
                </div>
                <p className="korosztaly-card__desc">{k.descShort}</p>
              </article>
            ))}
          </div>
          <p style={{ textAlign: 'center', marginTop: 'var(--space-6)', color: 'var(--color-text-muted)', fontSize: 'var(--text-sm)' }}>
            A korosztályokról részletesebben:{' '}
            <Link to="/cserkeszet" style={{ color: 'var(--color-primary)', fontWeight: 600 }}>
              A cserkészetről →
            </Link>
          </p>
        </div>
      </section>

      {/* Cserkésztörvény teaser */}
      <section className="section section--sm" style={{ background: 'var(--color-surface-offset)' }} aria-labelledby="torveny-teaser-heading">
        <div className="container container--default">
          <span className="section-label">Mire kötelezi magát?</span>
          <h2 id="torveny-teaser-heading" className="section-title">A fogadalom és a törvény</h2>
          <p style={{ color: 'var(--color-text-muted)', marginBottom: 'var(--space-6)' }}>
            Minden cserkész — az újoncév sikeres lezárása után — leteszi a cserkész fogadalmat.
            Ez nem kötelezettség az első naptól, hanem egy fejlődési út természetes állomása.
          </p>
          <blockquote className="fogadalom-quote">
            <p>
              „Én, [név], fogadom, hogy híven teljesítem kötelességeimet, amelyekkel
              Istennek, hazámnak és embertársaimnak tartozom. Minden lehetőt megteszek,
              hogy másokon segítsek. Ismerem a cserkésztörvényt és azt mindenkor megtartom."
            </p>
            <cite>— Cserkész fogadalom</cite>
          </blockquote>
          <p style={{ color: 'var(--color-text-muted)', marginTop: 'var(--space-4)', fontSize: 'var(--text-sm)' }}>
            A fogadalom a tíz cserkésztörvényre utal — amelyeket{' '}
            <Link to="/cserkeszet" style={{ color: 'var(--color-primary)', fontWeight: 600 }}>
              itt olvashatsz el részletesen.
            </Link>
          </p>
        </div>
      </section>

      {/* How to join */}
      <section className="section" aria-labelledby="how-join-heading">
        <div className="container container--default">
          <span className="section-label">Hogyan?</span>
          <h2 id="how-join-heading" className="section-title">A csatlakozás lépései</h2>
          <div className="join-steps">
            {[
              {
                num: '1',
                title: 'Vedd fel velünk a kapcsolatot',
                desc: 'Írj emailt csapatparancsnokunknak (kucsera.boglarka@vac811.hu) vagy a csapat általános elérhetőségére (811@cserkesz.hu). Rövid üzenetben jelezd, hogy szeretnél csatlakozni.',
              },
              {
                num: '2',
                title: 'Gyere el egy próbafoglalkozásra',
                desc: 'Meghívunk egy rajgyűlésre, ahol megismerheted a közösséget és a vezetőket. Nincs kötelezettség — nézz körül, és döntsd el, tetszik-e.',
              },
              {
                num: '3',
                title: 'Regisztráció és csatlakozás',
                desc: 'Ha csatlakoznál, kitöltjük a regisztrációs lapot (gyermek esetén szülővel együtt) és befizetjük az éves tagsági díjat. Ettől kezdve teljes jogú cserkész vagy!',
              },
              {
                num: '4',
                title: 'Beilleszkedés a rajba',
                desc: 'A rajvezető személyesen fogad és segít beilleszkedni. Az újoncév során megismered a cserkésztörvényt, a fogadalmat és az alapvető cserkésztudást.',
              },
            ].map(step => (
              <div key={step.num} className="join-step">
                <div className="join-step__num" aria-hidden="true">{step.num}</div>
                <div className="join-step__content">
                  <h3 className="join-step__title">{step.title}</h3>
                  <p className="join-step__desc">{step.desc}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Contact CTA */}
      <section className="section section--sm" aria-labelledby="join-contact-heading">
        <div className="container container--default">
          <div className="join-contact-box">
            <div>
              <h2 id="join-contact-heading">Kezdd el most!</h2>
              <p>
                Írj közvetlenül csapatparancsnokunknak, <strong>Kucsera Boglárkának</strong>,
                és hamarosan visszajelzünk.
              </p>
            </div>
            <div className="join-contact-box__actions">
              <a href="mailto:kucsera.boglarka@vac811.hu" className="btn btn--primary btn--lg">
                kucsera.boglarka@vac811.hu
              </a>
              <a href="mailto:811@cserkesz.hu" className="btn btn--outline btn--lg">
                811@cserkesz.hu
              </a>
            </div>
            <p className="join-contact-box__address">
              📍 Csapatotthon: 2600 Vác, Dr. Csányi László krt. 58.
            </p>
          </div>
        </div>
      </section>

      {/* FAQ */}
      <section className="section" style={{ background: 'var(--color-surface-offset)' }} aria-labelledby="faq-heading">
        <div className="container container--default">
          <span className="section-label">Kérdések</span>
          <h2 id="faq-heading" className="section-title">Gyakori kérdések</h2>
          <div className="faq-list">
            {faq.map((item, i) => (
              <details key={i} className="faq-item">
                <summary className="faq-item__question">
                  {item.q}
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="faq-item__icon" aria-hidden="true">
                    <path d="M6 9l6 6 6-6"/>
                  </svg>
                </summary>
                <p className="faq-item__answer">{item.a}</p>
              </details>
            ))}
          </div>
        </div>
      </section>
    </main>
  );
}
