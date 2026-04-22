import { Link } from 'react-router-dom';
import './Contact.css';

export default function Contact() {
  return (
    <main aria-label="Kapcsolat oldal">
      {/* Hero */}
      <section className="page-hero" aria-labelledby="contact-page-heading">
        <div className="container">
          <div className="hero-badge">📬 Kapcsolat</div>
          <h1 id="contact-page-heading" className="section-title section-title--lg">
            Lépj velünk kapcsolatba
          </h1>
          <p className="page-hero__subtitle">
            Kérdésed van a cserkészetről, a csatlakozásról, vagy csak ismerkedni szeretnél?
            Örömmel várjuk üzeneted!
          </p>
        </div>
      </section>

      {/* Contact grid */}
      <section className="section" aria-labelledby="contact-info-heading">
        <div className="container">
          <div className="contact-grid">

            {/* Info */}
            <div>
              <span className="section-label">Elérhetőség</span>
              <h2 id="contact-info-heading" className="section-title">Elérési lehetőségek</h2>

              <div className="contact-cards">
                {/* Address */}
                <div className="contact-card">
                  <div className="contact-card__icon" aria-hidden="true">
                    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
                      <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"/>
                      <circle cx="12" cy="10" r="3"/>
                    </svg>
                  </div>
                  <div>
                    <h3>Csapatotthon</h3>
                    <address>
                      <p>2600 Vác</p>
                      <p>Dr. Csányi László krt. 58.</p>
                    </address>
                    <a
                      href="https://maps.google.com/?q=2600+V%C3%A1c,+Dr.+Cs%C3%A1nyi+L%C3%A1szl%C3%B3+krt.+58."
                      target="_blank"
                      rel="noopener noreferrer"
                      className="contact-card__link"
                    >
                      Megnyitás térképen
                      <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
                        <path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6M15 3h6v6M10 14L21 3"/>
                      </svg>
                    </a>
                  </div>
                </div>

                {/* Email */}
                <div className="contact-card">
                  <div className="contact-card__icon" aria-hidden="true">
                    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
                      <path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z"/>
                      <polyline points="22,6 12,13 2,6"/>
                    </svg>
                  </div>
                  <div>
                    <h3>Email</h3>
                    <p>Általános megkeresések:</p>
                    <a href="mailto:811@cserkesz.hu" className="contact-card__email">811@cserkesz.hu</a>
                    <p style={{ marginTop: 'var(--space-3)' }}>Csapatparancsnok:</p>
                    <a href="mailto:kucsera.boglarka@vac811.hu" className="contact-card__email">kucsera.boglarka@vac811.hu</a>
                  </div>
                </div>

                {/* Social */}
                <div className="contact-card">
                  <div className="contact-card__icon" aria-hidden="true">
                    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
                      <circle cx="12" cy="12" r="10"/>
                      <path d="M2 12h20M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z"/>
                    </svg>
                  </div>
                  <div>
                    <h3>Közösségi média</h3>
                    <div className="contact-social-links">
                      <a href="https://facebook.com/vac811" target="_blank" rel="noopener noreferrer" className="contact-social-link">
                        <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
                          <path d="M18 2h-3a5 5 0 0 0-5 5v3H7v4h3v8h4v-8h3l1-4h-4V7a1 1 0 0 1 1-1h3z"/>
                        </svg>
                        Facebook: vac811
                      </a>
                      <a href="https://instagram.com/811szentjozsef" target="_blank" rel="noopener noreferrer" className="contact-social-link">
                        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
                          <rect x="2" y="2" width="20" height="20" rx="5" ry="5"/>
                          <path d="M16 11.37A4 4 0 1 1 12.63 8 4 4 0 0 1 16 11.37z"/>
                          <line x1="17.5" y1="6.5" x2="17.51" y2="6.5"/>
                        </svg>
                        Instagram: @811szentjozsef
                      </a>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Map / Contact form placeholder */}
            <div>
              <div className="contact-map-placeholder">
                <div className="contact-map-placeholder__content">
                  <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" aria-hidden="true" style={{ color: 'var(--color-primary)', opacity: 0.5 }}>
                    <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"/>
                    <circle cx="12" cy="10" r="3"/>
                  </svg>
                  <h3>Vác, Dr. Csányi László krt. 58.</h3>
                  <p>A csapatotthon Vác belvárosában található.</p>
                  <a
                    href="https://maps.google.com/?q=2600+V%C3%A1c,+Dr.+Cs%C3%A1nyi+L%C3%A1szl%C3%B3+krt.+58."
                    target="_blank"
                    rel="noopener noreferrer"
                    className="btn btn--primary"
                  >
                    Google Maps
                  </a>
                </div>
              </div>

              {/* Quick join */}
              <div className="contact-join-cta">
                <h3>Szeretnél csatlakozni?</h3>
                <p>Ha csatlakozásra gondolsz, nézd meg a részletes csatlakozási oldalt!</p>
                <Link to="/csatlakozas" className="btn btn--outline" style={{ marginTop: 'var(--space-4)' }}>
                  Csatlakozás részletei
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
                    <path d="M5 12h14M12 5l7 7-7 7"/>
                  </svg>
                </Link>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Magyar Cserkészszövetség */}
      <section className="section section--sm" style={{ background: 'var(--color-surface)' }}>
        <div className="container container--default">
          <div className="contact-szovetseg">
            <svg width="32" height="32" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true" style={{ color: 'var(--color-primary)', flexShrink: 0 }}>
              <path d="M12 2c0 0-2 2.5-2 5 0 1.1.4 2.1 1 2.8C9.4 10.6 8 12.2 8 14c0 1.5.8 2.8 2 3.5V20H9v2h6v-2h-1v-2.5c1.2-.7 2-2 2-3.5 0-1.8-1.4-3.4-3-4.2.6-.7 1-1.7 1-2.8 0-2.5-2-5-2-5z"/>
            </svg>
            <div>
              <h3>Magyar Cserkészszövetség</h3>
              <p>
                A 811. cserkészcsapat a Magyar Cserkészszövetség tagcsapata.
                A szövetség weboldalán további információkat találsz a mozgalomról és a cserkészetről.
              </p>
              <a href="https://cserkesz.hu" target="_blank" rel="noopener noreferrer" className="btn btn--ghost" style={{ marginTop: 'var(--space-4)' }}>
                cserkesz.hu
                <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
                  <path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6M15 3h6v6M10 14L21 3"/>
                </svg>
              </a>
            </div>
          </div>
        </div>
      </section>
    </main>
  );
}
