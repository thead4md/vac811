import './Gallery.css';

const galleryCategories = [
  { id: 'taborok', label: 'Táborok' },
  { id: 'portyak', label: 'Portyák' },
  { id: 'kozosseg', label: 'Közösség' },
];

// Placeholder gallery items — replace with real photos
const placeholderItems = Array.from({ length: 12 }, (_, i) => ({
  id: `photo-${i + 1}`,
  alt: `Cserkész fotó ${i + 1}`,
  category: galleryCategories[i % 3].id,
  caption: [
    'Nyári tábor 2025 – Süttő',
    'Tábortűz est a rajokkal',
    'Csapatportya a Dunakanyarban',
    'Közösségi foglalkozás',
    'Tájékozódási verseny',
    'Csapatmise a székesegyházban',
    'Nyári tábor 2024 – Bernecebaráti',
    'Kézügyességi verseny',
    'Tábori főzőverseny',
    'Cserkész fogadalom',
    'Rajgyűlés',
    'Fesztiválszerű program',
  ][i],
}));

export default function Gallery() {
  return (
    <main aria-label="Galéria oldal">
      {/* Hero */}
      <section className="page-hero" aria-labelledby="gallery-page-heading">
        <div className="container">
          <div className="hero-badge">📷 Galéria</div>
          <h1 id="gallery-page-heading" className="section-title section-title--lg">
            Fotógaléria
          </h1>
          <p className="page-hero__subtitle">
            Táboraink, portyáink és közösségi életünk pillanatai képekben.
          </p>
        </div>
      </section>

      {/* Gallery note */}
      <section className="section section--sm" style={{ background: 'var(--color-surface)' }}>
        <div className="container container--default">
          <div className="gallery-notice">
            <div className="gallery-notice__icon" aria-hidden="true">📸</div>
            <div>
              <h2>Fotók hamarosan</h2>
              <p>
                A galéria feltöltése folyamatban van. Addig is, nézz be Facebook- és Instagram-oldalunkra,
                ahol rendszeresen osztunk meg képeket és videókat cserkészéletünkből!
              </p>
              <div className="gallery-notice__links">
                <a href="https://facebook.com/vac811" target="_blank" rel="noopener noreferrer" className="btn btn--primary">
                  Facebook – vac811
                </a>
                <a href="https://instagram.com/811szentjozsef" target="_blank" rel="noopener noreferrer" className="btn btn--outline">
                  Instagram – @811szentjozsef
                </a>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Placeholder grid */}
      <section className="section" aria-labelledby="gallery-grid-heading">
        <div className="container">
          <span className="section-label">Előnézet</span>
          <h2 id="gallery-grid-heading" className="section-title">Cserkészéletünk</h2>
          <p style={{ color: 'var(--color-text-muted)', marginBottom: 'var(--space-8)', maxWidth: '60ch' }}>
            Az alábbi helyek valós fotókkal lesznek feltöltve. A csillagszabású cserkészkalandok képeiért
            kövesd közösségi oldalainkat!
          </p>
          <div className="gallery-grid">
            {placeholderItems.map((item, i) => (
              <figure
                key={item.id}
                className={`gallery-item gallery-item--${i === 0 ? 'large' : i === 4 ? 'medium' : 'small'}`}
                aria-label={item.alt}
              >
                <div className="gallery-item__placeholder" aria-hidden="true">
                  <div className="gallery-item__placeholder-icon">📷</div>
                  <span className="gallery-item__placeholder-text">Fotó hamarosan</span>
                </div>
                <figcaption className="gallery-item__caption">{item.caption}</figcaption>
              </figure>
            ))}
          </div>
        </div>
      </section>
    </main>
  );
}
