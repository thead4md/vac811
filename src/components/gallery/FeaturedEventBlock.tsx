import type { GalleryEventGroup, GalleryItem } from '../../types/gallery';
import './FeaturedEventBlock.css';

interface Props {
  group: GalleryEventGroup;
  onOpenLightbox: (items: GalleryItem[], index: number) => void;
}

export default function FeaturedEventBlock({ group, onOpenLightbox }: Props) {
  const coverIndex = group.items.indexOf(group.coverItem);
  const thumbs = group.items.filter((i) => i !== group.coverItem).slice(0, 4);

  return (
    <section className="featured-event" aria-labelledby="featured-event-heading">
      <div className="container">
        <span className="section-label">Kiemelt esemény</span>
        <button
          type="button"
          className="featured-event__cover"
          onClick={() => onOpenLightbox(group.items, Math.max(coverIndex, 0))}
        >
          <img
            src={group.coverItem.imageUrl}
            srcSet={group.coverItem.srcSet}
            alt={group.coverItem.alt}
            className="featured-event__img"
            loading="eager"
          />
          <div className="featured-event__overlay">
            <h2 id="featured-event-heading" className="featured-event__title">
              {group.eventTitle}
            </h2>
            <p className="featured-event__meta">
              {group.year} · {group.items.length} fotó
            </p>
          </div>
        </button>

        {thumbs.length > 0 && (
          <div className="featured-event__thumbs">
            {thumbs.map((item) => (
              <button
                key={item.id}
                type="button"
                className="featured-event__thumb"
                onClick={() => onOpenLightbox(group.items, group.items.indexOf(item))}
              >
                <img src={item.thumbnailUrl ?? item.imageUrl} alt={item.alt} loading="lazy" />
              </button>
            ))}
          </div>
        )}
      </div>
    </section>
  );
}
