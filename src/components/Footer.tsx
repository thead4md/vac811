import { Link } from 'react-router-dom';
import './Footer.css';

export default function Footer() {
  const year = new Date().getFullYear();

  return (
    <footer className="footer" role="contentinfo">
      <div className="container">
        <div className="footer__grid">
          {/* Brand */}
          <div className="footer__brand">
            <Link to="/" className="footer__logo" aria-label="811. cserkészcsapat – Főoldal">
              <svg width="36" height="36" viewBox="0 0 40 40" fill="none" aria-hidden="true">
                <circle cx="20" cy="20" r="19" stroke="currentColor" strokeWidth="2"/>
                <path d="M20 8 L23.5 17 L33 17 L25.5 22.5 L28 32 L20 26.5 L12 32 L14.5 22.5 L7 17 L16.5 17 Z"
                  stroke="currentColor" strokeWidth="1.5" fill="none"/>
                <circle cx="20" cy="20" r="3" fill="currentColor"/>
              </svg>
              <span className="footer__logo-name">811. Szent József Cserkészcsapat</span>
            </Link>
            <p className="footer__tagline">
              „Emberebb emberré és magyarabb magyarrá" – Vác, 1929 óta.
            </p>
            <div className="footer__social">
              <a href="https://facebook.com/vac811" target="_blank" rel="noopener noreferrer"
                className="footer__social-link" aria-label="Facebook oldal">
                <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
                  <path d="M18 2h-3a5 5 0 0 0-5 5v3H7v4h3v8h4v-8h3l1-4h-4V7a1 1 0 0 1 1-1h3z"/>
                </svg>
                Facebook
              </a>
              <a href="https://instagram.com/811szentjozsef" target="_blank" rel="noopener noreferrer"
                className="footer__social-link" aria-label="Instagram oldal">
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
                  <rect x="2" y="2" width="20" height="20" rx="5" ry="5"/>
                  <path d="M16 11.37A4 4 0 1 1 12.63 8 4 4 0 0 1 16 11.37z"/>
                  <line x1="17.5" y1="6.5" x2="17.51" y2="6.5"/>
                </svg>
                Instagram
              </a>
              <a href="mailto:811@cserkesz.hu" className="footer__social-link" aria-label="Email küldése">
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
                  <path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z"/>
                  <polyline points="22,6 12,13 2,6"/>
                </svg>
                Email
              </a>
            </div>
          </div>

          {/* Nav */}
          <nav aria-label="Lábléc navigáció">
            <h3 className="footer__heading">Oldalak</h3>
            <ul className="footer__links" role="list">
              {[
                ['/', 'Kezdőlap'],
                ['/rolunk', 'Rólunk'],
                ['/tortenet', 'Történet'],
                ['/vezetok', 'Vezetők'],
                ['/taborok', 'Táborok'],
                ['/hirek', 'Hírek & Események'],
                ['/galeria', 'Galéria'],
              ].map(([path, label]) => (
                <li key={path}>
                  <Link to={path} className="footer__link">{label}</Link>
                </li>
              ))}
            </ul>
          </nav>

          {/* Contact */}
          <div>
            <h3 className="footer__heading">Elérhetőség</h3>
            <address className="footer__address">
              <p>
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
                  <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"/>
                  <circle cx="12" cy="10" r="3"/>
                </svg>
                2600 Vác, Dr. Csányi László krt. 58.
              </p>
              <p>
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
                  <path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z"/>
                  <polyline points="22,6 12,13 2,6"/>
                </svg>
                <a href="mailto:811@cserkesz.hu">811@cserkesz.hu</a>
              </p>
              <p>
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
                  <path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z"/>
                  <polyline points="22,6 12,13 2,6"/>
                </svg>
                <a href="mailto:kucsera.boglarka@vac811.hu">kucsera.boglarka@vac811.hu</a>
              </p>
            </address>

            <Link to="/csatlakozas" className="btn btn--primary footer__cta">
              Csatlakozz a csapathoz!
            </Link>
          </div>
        </div>

        <div className="footer__bottom">
          <p>© {year} 811. Szent József Cserkészcsapat, Vác. Magyar Cserkészszövetség tagcsapata.</p>
          <p className="footer__legal">Weboldal tartalma tájékoztató jellegű.</p>
        </div>
      </div>
    </footer>
  );
}
