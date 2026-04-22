import { Link } from 'react-router-dom';
import { camps } from '../data/camps';
import './Camps.css';

export default function Camps() {
  const featured = camps[0]; // 2025

  return (
    <main aria-label="Táborok oldal">
      {/* Hero */}
      <section className="page-hero" aria-labelledby="camps-page-heading">
        <div className="container">
          <div className="hero-badge">🏕️ Táborozás</div>
          <h1 id="camps-page-heading" className="section-title section-title--lg">
            Nyári táboraink
          </h1>
          <p className="page-hero__subtitle">
            2013 óta minden nyáron – minden évben más helyszín, más keretmese, ugyanaz az elkötelezett csapat.
          </p>
        </div>
      </section>

      {/* Featured camp */}
      <section className="section" aria-labelledby="featured-camp-heading">
        <div className="container">
          <span className="section-label">Legutóbbi tábor</span>
          <div className="featured-camp">
            <div className="featured-camp__badge">
              <span className="badge">Legutóbbi tábor</span>
              <span className="featured-camp__year">{featured.year}</span>
            </div>
            <h2 id="featured-camp-heading" className="featured-camp__title">
              {featured.theme}
            </h2>
            <div className="featured-camp__meta">
              <div className="featured-camp__detail">
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
                  <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"/><circle cx="12" cy="10" r="3"/>
                </svg>
                <span><strong>Helyszín:</strong> {featured.location}</span>
              </div>
              <div className="featured-camp__detail">
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
                  <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/>
                </svg>
                <span><strong>Táborparancsnok:</strong> {featured.commander}</span>
              </div>
              {featured.participants && (
                <div className="featured-camp__detail">
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
                    <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/>
                    <path d="M23 21v-2a4 4 0 0 0-3-3.87M16 3.13a4 4 0 0 1 0 7.75"/>
                  </svg>
                  <span><strong>Résztvevők:</strong> {featured.participants} fő</span>
                </div>
              )}
              {featured.notes && (
                <div className="featured-camp__detail">
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
                    <circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/>
                  </svg>
                  <span>{featured.notes}</span>
                </div>
              )}
            </div>
          </div>
        </div>
      </section>

      {/* What is a camp */}
      <section className="section section--sm" style={{ background: 'var(--color-surface)' }} aria-labelledby="about-camps-heading">
        <div className="container container--default">
          <div className="camps-about">
            <div>
              <span className="section-label">Miért fontos?</span>
              <h2 id="about-camps-heading" className="section-title">A nyári tábor a cserkészélet csúcsa</h2>
              <div className="prose">
                <p>
                  Minden év legnagyobb és legvárt eseménye a nyári tábor. Egy hét a természetben, sátrak között,
                  tábortűznél — ahol a barátságok mélyülnek, a cserkésztudás valódi élethelyzetekben kerül elő,
                  és minden éven egyedi keretmese teszi még kalandosabbá az élményt.
                </p>
                <p>
                  A tábor nemcsak szórakozás: versengések, foglalkozások, közös főzés, tájékozódás,
                  esti programok és persze az önállóság megtapasztalása mind részei. Az évek során
                  a csapat 266 főig is növekedett egy-egy táborban.
                </p>
              </div>
            </div>
            <div className="camps-facts">
              <div className="camp-fact">
                <strong>13+</strong>
                <span>tábor 2013 óta</span>
              </div>
              <div className="camp-fact">
                <strong>266</strong>
                <span>eddigi rekord (2022)</span>
              </div>
              <div className="camp-fact">
                <strong>10+</strong>
                <span>különböző helyszín</span>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Camp archive */}
      <section className="section" aria-labelledby="archive-heading">
        <div className="container">
          <span className="section-label">Tábortörténet</span>
          <h2 id="archive-heading" className="section-title">Az összes tábor</h2>

          {/* Table view for desktop */}
          <div className="camps-table-wrap">
            <table className="camps-table" aria-label="Tábortörténet táblázat">
              <thead>
                <tr>
                  <th scope="col">Év</th>
                  <th scope="col">Helyszín</th>
                  <th scope="col">Keretmese</th>
                  <th scope="col">Táborparancsnok</th>
                  <th scope="col">Létszám</th>
                </tr>
              </thead>
              <tbody>
                {camps.map(camp => (
                  <tr key={camp.year} className={camp.year === 2025 ? 'camps-table__row--latest' : ''}>
                    <td className="camps-table__year">
                      <strong>{camp.year}</strong>
                      {camp.year === 2025 && <span className="badge" style={{ marginLeft: '0.4em' }}>Utolsó</span>}
                    </td>
                    <td>{camp.location}</td>
                    <td className="camps-table__theme">{camp.theme}</td>
                    <td>{camp.commander}</td>
                    <td>{camp.participants ? `${camp.participants} fő` : '–'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Card view for mobile */}
          <div className="camps-cards">
            {camps.map(camp => (
              <article key={camp.year} className={`camp-card${camp.year === 2025 ? ' camp-card--latest' : ''}`}>
                <div className="camp-card__year">{camp.year}</div>
                <div className="camp-card__body">
                  <h3 className="camp-card__theme">{camp.theme}</h3>
                  <p className="camp-card__location">📍 {camp.location}</p>
                  <p className="camp-card__commander">🎖️ {camp.commander}</p>
                  {camp.participants && (
                    <p className="camp-card__participants">👥 {camp.participants} fő</p>
                  )}
                </div>
              </article>
            ))}
          </div>
        </div>
      </section>

      {/* Next camp CTA */}
      <section className="section join-cta" aria-labelledby="next-camp-heading">
        <div className="container join-cta__inner">
          <h2 id="next-camp-heading" className="join-cta__title">
            Ott leszel a következő táborban?
          </h2>
          <p className="join-cta__subtitle">
            Ha cserkész vagy, automatikusan résztvevője leszel. Ha még nem cserkész,
            csatlakozz most — és jövőre ott lehetsz te is!
          </p>
          <div className="join-cta__actions">
            <Link to="/csatlakozas" className="btn btn--primary btn--lg">
              Csatlakozz a csapathoz
            </Link>
            <Link to="/kapcsolat" className="btn btn--ghost btn--lg">
              Kérdések a táborról
            </Link>
          </div>
        </div>
      </section>
    </main>
  );
}
