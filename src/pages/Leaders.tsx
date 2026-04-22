import { Link } from 'react-router-dom';
import { useContent } from '../hooks/useContent';
import { type Leader, leadersStatic } from '../data/leaders';
import './Leaders.css';

export default function Leaders() {
  const { data, loading } = useContent<Leader[]>('leaders.json', 'leaders');
  const allLeaders = data ?? leadersStatic;
  const staffLeaders = allLeaders.filter(l => l.isStaff);
  const rajLeaders = allLeaders.filter(l => !l.isStaff);

  return (
    <main aria-label="Vezetők oldal">
      {/* Hero */}
      <section className="page-hero" aria-labelledby="leaders-page-heading">
        <div className="container">
          <div className="hero-badge">🤝 Csapatvezetés</div>
          <h1 id="leaders-page-heading" className="section-title section-title--lg">
            Vezetőink
          </h1>
          <p className="page-hero__subtitle">
            A 811-es csapat elkötelezett vezetői — akik minden cserkész fejlődéséért és
            a közösség erejéért dolgoznak.
          </p>
        </div>
      </section>

      {/* Staff leaders */}
      <section className="section" aria-labelledby="staff-heading">
        <div className="container">
          <span className="section-label">Csapatvezetés</span>
          <h2 id="staff-heading" className="section-title">Csapatvezető törzs</h2>
          <p className="section-subtitle" style={{ marginBottom: 'var(--space-10)' }}>
            A csapat irányításáért és a szakmai munkáért felelős vezetők.
          </p>
          {loading ? (
            <p style={{ color: 'var(--color-text-muted)' }}>Betöltés…</p>
          ) : (
            <div className="leaders-staff-grid">
              {staffLeaders.map(leader => (
                <article key={leader.name} className="leader-profile">
                  <div className="leader-profile__avatar" aria-hidden="true">
                    <span>{leader.name.split(' ').map(n => n[0]).join('').slice(0, 2)}</span>
                  </div>
                  <div className="leader-profile__info">
                    <h3 className="leader-profile__name">{leader.name}</h3>
                    <p className="leader-profile__role">{leader.role}</p>
                    {leader.raj && (
                      <p className="leader-profile__raj">
                        <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
                          <circle cx="12" cy="12" r="10"/><path d="M12 8v4l3 3"/>
                        </svg>
                        {leader.raj}
                      </p>
                    )}
                    {leader.email && (
                      <a href={`mailto:${leader.email}`} className="leader-profile__email">
                        <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
                          <path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z"/>
                          <polyline points="22,6 12,13 2,6"/>
                        </svg>
                        {leader.email}
                      </a>
                    )}
                  </div>
                </article>
              ))}
            </div>
          )}
        </div>
      </section>

      {/* Raj leaders */}
      <section className="section" style={{ background: 'var(--color-surface-offset)' }} aria-labelledby="rajvezetok-heading">
        <div className="container">
          <span className="section-label">Rajaink</span>
          <h2 id="rajvezetok-heading" className="section-title">Rajvezetők és rajparancsnokok</h2>
          <p className="section-subtitle" style={{ marginBottom: 'var(--space-10)' }}>
            Minden raj élén egy tapasztalt és elkötelezett vezető áll.
          </p>
          {loading ? (
            <p style={{ color: 'var(--color-text-muted)' }}>Betöltés…</p>
          ) : (
            <div className="leaders-raj-grid">
              {rajLeaders.map(leader => (
                <article key={leader.name} className="leader-card">
                  <div className="leader-card__avatar" aria-hidden="true">
                    <span>{leader.name.split(' ').map(n => n[0]).join('').slice(0, 2)}</span>
                  </div>
                  <h3 className="leader-card__name">{leader.name}</h3>
                  <p className="leader-card__role">{leader.role}</p>
                  {leader.raj && <p className="leader-card__raj">{leader.raj}</p>}
                </article>
              ))}
            </div>
          )}
        </div>
      </section>

      {/* Contact note */}
      <section className="section section--sm" style={{ background: 'var(--color-surface)' }} aria-labelledby="contact-note-heading">
        <div className="container container--default">
          <div className="leaders-contact-note">
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
              <path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z"/>
              <polyline points="22,6 12,13 2,6"/>
            </svg>
            <div>
              <h2 id="contact-note-heading">Kérdésed van?</h2>
              <p>
                Ha szeretnéd gyermekedet beíratni vagy magad csatlakoznál, keress minket bátran!
                Csapatparancsnokunk, <strong>Kucsera Boglárka</strong> örömmel válaszol minden kérdésre.
              </p>
              <div className="leaders-contact-note__actions">
                <a href="mailto:kucsera.boglarka@vac811.hu" className="btn btn--primary">
                  kucsera.boglarka@vac811.hu
                </a>
                <a href="mailto:811@cserkesz.hu" className="btn btn--outline">
                  811@cserkesz.hu
                </a>
                <Link to="/csatlakozas" className="btn btn--ghost">
                  Csatlakozási lap
                </Link>
              </div>
            </div>
          </div>
        </div>
      </section>
    </main>
  );
}
