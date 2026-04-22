import './Join.css';

const faq = [
  {
    q: 'Hány éves kortól lehet csatlakozni?',
    a: 'A kiscserkész program 7 éves kortól indul. Felnőtteknek is van lehetőség csatlakozni önkéntesként vagy aktív cserkészként.',
  },
  {
    q: 'Kell-e előzetes tapasztalat a cserkészethez?',
    a: 'Nem! Mindenkit befogadunk, legyen az első lépés a cserkész életben. A rajvezető és a tapasztaltabb cserkészek segítenek az indulásban.',
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
    a: 'Az első alkalomra nincs szükség felszerelésre. Kényelmes, sportruházat ajánlott. A cserkész egyenruhára akkor lesz szükség, amikor a gyermek tagként csatlakozik.',
  },
  {
    q: 'Hogyan értesülök a programokról?',
    a: 'A csapat Facebook- és Instagram-oldalain, valamint a csapatparancsnokkal való kommunikáción keresztül. A belépés után a rajvezető tart majd kapcsolatot.',
  },
  {
    q: 'Mit jelent a cserkész fogadalom?',
    a: 'A cserkész fogadalom a cserkész törvény melletti elköteleződés. Ez nem az első nap, hanem egy fejlődési út eredménye — akkor teszi le a cserkész, amikor felkészült rá.',
  },
  {
    q: 'Biztosított-e a felügyelet a programokon?',
    a: 'Igen, minden programon felnőtt vezető felügyel. A táborokon és portyákon minden raj élén tapasztalt felnőtt vezető áll.',
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
            aki nyitott a cserkészéletre.
          </p>
        </div>
      </section>

      {/* Who can join */}
      <section className="section" aria-labelledby="who-join-heading">
        <div className="container">
          <div className="join-who-grid">
            <div>
              <span className="section-label">Kinek szól?</span>
              <h2 id="who-join-heading" className="section-title">Mindenkinek van helye</h2>
              <div className="prose">
                <p>
                  A 811. cserkészcsapat nyitott minden Vácott vagy a közelben élő
                  gyermek, fiatal és felnőtt számára, aki elkötelezett a cserkész értékek iránt.
                </p>
                <p>
                  Nem szükséges előzetes tapasztalat — a cserkészet tanulható és érdemes
                  elkezdeni! Minden korosztálynak megfelelő programot, rajt és közösséget kínálunk.
                </p>
              </div>
            </div>
            <div className="join-agegroups">
              {[
                { emoji: '🌱', name: 'Kiscserkész', age: '7–10 év', desc: 'Játékos bevezetés a cserkész életbe.' },
                { emoji: '🌿', name: 'Cserkész', age: '11–14 év', desc: 'Portya, tábor, cserkésztudás.' },
                { emoji: '🌲', name: 'Öregcserkész', age: '15–18 év', desc: 'Önálló projektek, közösségi munka.' },
                { emoji: '🏕️', name: 'Felnőtt', age: '18+ év', desc: 'Önkéntes vezető, mentor, aktív cserkész.' },
              ].map(g => (
                <div key={g.name} className="join-age-card">
                  <span className="join-age-card__emoji" aria-hidden="true">{g.emoji}</span>
                  <div>
                    <strong>{g.name}</strong>
                    <span className="join-age-card__age">{g.age}</span>
                    <p>{g.desc}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* How to join */}
      <section className="section" style={{ background: 'var(--color-surface-offset)' }} aria-labelledby="how-join-heading">
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
                desc: 'Ha csatlakoznál, kitöltünk egy regisztrációs lapot (gyermek esetén szülővel együtt), és befizetjük az éves tagsági díjat. Ettől kezdve teljes jogú cserkész vagy!',
              },
              {
                num: '4',
                title: 'Beilleszkedés a rajba',
                desc: 'A rajvezető személyesen fogad, és segít beilleszkedni. Az első időszakban megismered a cserkész törvényt, a fogadalmat és a cserkész tudnivalókat.',
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
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
                  <path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z"/>
                  <polyline points="22,6 12,13 2,6"/>
                </svg>
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
