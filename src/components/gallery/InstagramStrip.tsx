import type { GalleryItem } from '../../types/gallery';
import GalleryCard from './GalleryCard';
import './InstagramStrip.css';

interface Props {
  items: GalleryItem[];
  onOpenLightbox: (items: GalleryItem[], index: number) => void;
}

// Parent hides this whole section when items is empty (see GaleriaPage) —
// per plan.md 5.6, a missing/empty Instagram manifest should never render a
// broken or empty-looking section.
export default function InstagramStrip({ items, onOpenLightbox }: Props) {
  return (
    <section
      className="section section--sm instagram-strip"
      aria-labelledby="instagram-strip-heading"
    >
      <div className="container container--default">
        <span className="section-label">Közösségi média</span>
        <h2 id="instagram-strip-heading" className="section-title">
          Legfrissebb Instagramról
        </h2>
        <div className="instagram-strip__grid">
          {items.map((item, i) => (
            <div key={item.id} className="instagram-strip__cell">
              <GalleryCard item={item} size="small" onOpen={() => onOpenLightbox(items, i)} />
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
