import { useMemo, useState } from 'react';
import { useContent } from '../hooks/useContent';
import InstagramWall from '../components/InstagramWall';
import { gallerySchema } from '../schemas/content';
import './Gallery.css';

export interface GalleryItem {
  id: string;
  name: string;
  year: string;
  event?: string;
  activity?: string;
  bucket?: string;
  score?: number;
  phash?: string;
  reason?: string;
  status?: 'pending' | 'approved' | 'rejected';
  approved?: boolean;
}

function driveImgUrl(fileId: string, width: number) {
  return `https://lh3.googleusercontent.com/d/${fileId}=w${width}`;
}

export default function Gallery() {
  const { data: items, loading, error } = useContent<GalleryItem[]>('gallery.json', 'gallery', gallerySchema);
  const [activeYear, setActiveYear] = useState('all');

  // Only approved photos are shown publicly; AI candidates stay hidden until
  // an editor approves them in Decap CMS.
  const approvedItems = useMemo(
    () =>
      items
        ? items.filter(
            (i) => i.status === 'approved' || (i.status == null && i.approved),
          )
        : [],
    [items],
  );

  const years = useMemo(() => {
    const set = new Set(approvedItems.map((i) => i.year).filter(Boolean));
    return Array.from(set).sort((a, b) => b.localeCompare(a));
  }, [approvedItems]);

  const filtered = useMemo(
    () =>
      activeYear === 'all'
        ? approvedItems
        : approvedItems.filter((i) => i.year === activeYear),
    [approvedItems, activeYear],
  );

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

      {/* Photo grid */}
      <section className="section" aria-labelledby="gallery-grid-heading">
        <div className="container">
          <span className="section-label">Fotók</span>
          <h2 id="gallery-grid-heading" className="section-title">Cserkészéletünk</h2>

          {/* Year filter — only shown once data is loaded and has years */}
          {!loading && years.length > 0 && (
            <div className="gallery-filter" role="group" aria-label="Év szűrő">
              <button
                className={`gallery-filter__btn${activeYear === 'all' ? ' gallery-filter__btn--active' : ''}`}
                onClick={() => setActiveYear('all')}
                aria-pressed={activeYear === 'all'}
              >
                Összes
              </button>
              {years.map((year) => (
                <button
                  key={year}
                  className={`gallery-filter__btn${activeYear === year ? ' gallery-filter__btn--active' : ''}`}
                  onClick={() => setActiveYear(year)}
                  aria-pressed={activeYear === year}
                >
                  {year}
                </button>
              ))}
            </div>
          )}

          {loading && (
            <div className="gallery-grid gallery-grid--skeleton">
              {Array.from({ length: 12 }, (_, i) => (
                <div
                  key={i}
                  className={`gallery-skeleton gallery-item--${i === 0 ? 'large' : i === 4 ? 'medium' : 'small'}`}
                  aria-hidden="true"
                />
              ))}
            </div>
          )}

          {error && (
            <p className="gallery-error">
              A fotók betöltése nem sikerült. Kérjük, próbáld újra később.
            </p>
          )}

          {!loading && !error && filtered.length === 0 && (
            <p className="gallery-empty">
              Erre az évre még nincsenek feltöltött fotók.
            </p>
          )}

          {!loading && !error && filtered.length > 0 && (
            <div className="gallery-grid">
              {filtered.map((item, i) => (
                <figure
                  key={item.id}
                  className={`gallery-item gallery-item--${i === 0 ? 'large' : i === 4 ? 'medium' : 'small'}`}
                  aria-label={item.name}
                >
                  <img
                    src={driveImgUrl(item.id, 800)}
                    srcSet={`${driveImgUrl(item.id, 400)} 400w, ${driveImgUrl(item.id, 800)} 800w, ${driveImgUrl(item.id, 1200)} 1200w`}
                    sizes="(max-width: 600px) 400px, (max-width: 1200px) 800px, 1200px"
                    alt={item.name}
                    loading="lazy"
                    decoding="async"
                    className="gallery-item__img"
                  />
                  <figcaption className="gallery-item__caption">{item.name}</figcaption>
                </figure>
              ))}
            </div>
          )}
        </div>
      </section>

      {/* Instagram wall */}
      <section
        className="section section--sm"
        style={{ background: 'var(--color-surface)' }}
        aria-labelledby="instagram-wall-heading"
      >
        <div className="container container--default">
          <span className="section-label">Közösségi média</span>
          <h2 id="instagram-wall-heading" className="section-title">Instagram</h2>
          <p style={{ color: 'var(--color-text-muted)', marginBottom: 'var(--space-8)', maxWidth: '60ch' }}>
            Kövess minket Instagramon a legfrissebb cserkészélményekért!
          </p>
          <InstagramWall />
        </div>
      </section>
    </main>
  );
}
