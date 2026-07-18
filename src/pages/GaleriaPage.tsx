import { useMemo, useState } from 'react';
import GalleriaHero from '../components/gallery/GalleriaHero';
import FeaturedEventBlock from '../components/gallery/FeaturedEventBlock';
import EventGroupSection from '../components/gallery/EventGroupSection';
import InstagramStrip from '../components/gallery/InstagramStrip';
import YearJumpNav from '../components/gallery/YearJumpNav';
import GalleryCard from '../components/gallery/GalleryCard';
import GalleryLightbox from '../components/gallery/GalleryLightbox';
import { useGalleryModel } from '../lib/gallery/useGalleryModel';
import type { GalleryEventGroup, GalleryItem } from '../types/gallery';
import './GaleriaPage.css';

export type GaleriaView = 'all' | 'events' | 'camps' | 'instagram' | 'videos' | 'years';

interface LightboxState {
  items: GalleryItem[];
  index: number;
}

function EmptyState({ onBackToAll }: { onBackToAll?: () => void }) {
  return (
    <p className="gallery-empty">
      Még nincs feltöltött kép ebben a kategóriában.
      {onBackToAll && (
        <>
          {' '}
          <button type="button" className="gallery-empty__link" onClick={onBackToAll}>
            Vissza az összes fotóhoz
          </button>
        </>
      )}
    </p>
  );
}

export default function GaleriaPage() {
  const { model, loading, error } = useGalleryModel();
  const [view, setView] = useState<GaleriaView>('all');
  const [activeYear, setActiveYear] = useState<number | null>(null);
  const [lightbox, setLightbox] = useState<LightboxState | null>(null);

  const openLightbox = (items: GalleryItem[], index: number) => setLightbox({ items, index });
  const closeLightbox = () => setLightbox(null);
  const navigateLightbox = (index: number) =>
    setLightbox((prev) => (prev ? { ...prev, index } : prev));
  const backToAll = () => {
    setView('all');
    setActiveYear(null);
  };

  const handleViewChange = (next: GaleriaView) => {
    setView(next);
    if (next !== 'years') setActiveYear(null);
  };

  const years = useMemo(
    () => Array.from(new Set(model.eventGroups.map((g) => g.year))).sort((a, b) => b - a),
    [model.eventGroups],
  );

  const campGroups = useMemo(
    () => model.eventGroups.filter((g) => g.eventSlug === 'tabor'),
    [model.eventGroups],
  );

  const yearGroups = useMemo(
    () => (activeYear == null ? model.eventGroups : model.eventGroups.filter((g) => g.year === activeYear)),
    [model.eventGroups, activeYear],
  );

  const videoItems = useMemo(() => model.all.filter((i) => i.mediaType !== 'image'), [model.all]);

  const nonFeaturedGroups = model.eventGroups.filter((g) => g !== model.featured);

  const renderGroupList = (groups: GalleryEventGroup[]) =>
    groups.length === 0 ? (
      <EmptyState onBackToAll={view !== 'all' ? backToAll : undefined} />
    ) : (
      groups.map((group) => (
        <EventGroupSection key={group.eventSlug} group={group} onOpenLightbox={openLightbox} />
      ))
    );

  const renderFlatGrid = (items: GalleryItem[]) =>
    items.length === 0 ? (
      <EmptyState onBackToAll={backToAll} />
    ) : (
      <div className="gallery-grid gallery-grid--flat">
        {items.map((item, i) => (
          <div key={item.id} className="gallery-grid__cell gallery-grid__cell--portrait">
            <GalleryCard item={item} size="small" onOpen={() => openLightbox(items, i)} />
          </div>
        ))}
      </div>
    );

  return (
    <main aria-label="Galéria oldal">
      <GalleriaHero activeView={view} onViewChange={handleViewChange} />

      {loading && (
        <section className="section" aria-label="Fotók betöltése">
          <div className="container">
            <div className="gallery-grid gallery-grid--skeleton">
              {Array.from({ length: 8 }, (_, i) => (
                <div
                  key={i}
                  className={`gallery-skeleton gallery-grid__cell${i === 0 ? ' gallery-grid__cell--large' : ''}`}
                  aria-hidden="true"
                />
              ))}
            </div>
          </div>
        </section>
      )}

      {!loading && error && (
        <section className="section">
          <div className="container">
            <p className="gallery-error">A fotók betöltése nem sikerült. Kérjük, próbáld újra később.</p>
          </div>
        </section>
      )}

      {!loading && !error && (
        <>
          {view === 'all' && (
            <>
              {model.featured && <FeaturedEventBlock group={model.featured} onOpenLightbox={openLightbox} />}
              <section className="section" aria-labelledby="gallery-grid-heading">
                <div className="container">
                  <span className="section-label">Fotók</span>
                  <h2 id="gallery-grid-heading" className="section-title">
                    Cserkészéletünk
                  </h2>
                  {nonFeaturedGroups.length === 0 && !model.featured ? (
                    <EmptyState />
                  ) : (
                    renderGroupList(nonFeaturedGroups)
                  )}
                </div>
              </section>
              {model.instagramLatest.length > 0 && (
                <InstagramStrip items={model.instagramLatest} onOpenLightbox={openLightbox} />
              )}
            </>
          )}

          {view === 'events' && (
            <section className="section" aria-labelledby="gallery-grid-heading">
              <div className="container">
                <span className="section-label">Fotók</span>
                <h2 id="gallery-grid-heading" className="section-title">
                  Események
                </h2>
                {renderGroupList(model.eventGroups)}
              </div>
            </section>
          )}

          {view === 'camps' && (
            <section className="section" aria-labelledby="gallery-grid-heading">
              <div className="container">
                <span className="section-label">Fotók</span>
                <h2 id="gallery-grid-heading" className="section-title">
                  Táborok
                </h2>
                {renderGroupList(campGroups)}
              </div>
            </section>
          )}

          {view === 'instagram' && (
            <section className="section" aria-labelledby="gallery-grid-heading">
              <div className="container">
                <span className="section-label">Közösségi média</span>
                <h2 id="gallery-grid-heading" className="section-title">
                  Instagram
                </h2>
                {renderFlatGrid(model.instagram)}
              </div>
            </section>
          )}

          {view === 'videos' && (
            <section className="section" aria-labelledby="gallery-grid-heading">
              <div className="container">
                <span className="section-label">Fotók</span>
                <h2 id="gallery-grid-heading" className="section-title">
                  Videók
                </h2>
                {renderFlatGrid(videoItems)}
              </div>
            </section>
          )}

          {view === 'years' && (
            <section className="section" aria-labelledby="gallery-grid-heading">
              <div className="container">
                <span className="section-label">Fotók</span>
                <h2 id="gallery-grid-heading" className="section-title">
                  Évek
                </h2>
                <YearJumpNav years={years} activeYear={activeYear} onSelectYear={setActiveYear} />
                {renderGroupList(yearGroups)}
              </div>
            </section>
          )}
        </>
      )}

      {lightbox && (
        <GalleryLightbox
          items={lightbox.items}
          index={lightbox.index}
          onClose={closeLightbox}
          onNavigate={navigateLightbox}
        />
      )}
    </main>
  );
}
