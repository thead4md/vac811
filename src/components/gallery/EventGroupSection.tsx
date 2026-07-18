import type { GalleryEventGroup, GalleryItem } from '../../types/gallery';
import GalleryCard from './GalleryCard';
import './EventGroupSection.css';

interface Props {
  group: GalleryEventGroup;
  onOpenLightbox: (items: GalleryItem[], index: number) => void;
}

export default function EventGroupSection({ group, onOpenLightbox }: Props) {
  return (
    <article className="event-group">
      <header className="event-group__header">
        <h3 className="event-group__title">{group.eventTitle}</h3>
        <p className="event-group__meta">
          {group.year} · {group.items.length} fotó
        </p>
      </header>
      <div className="gallery-grid">
        {group.items.map((item, i) => (
          <div key={item.id} className={`gallery-grid__cell gallery-grid__cell--${i === 0 ? 'large' : 'small'}`}>
            <GalleryCard item={item} size={i === 0 ? 'large' : 'small'} onOpen={() => onOpenLightbox(group.items, i)} />
          </div>
        ))}
      </div>
    </article>
  );
}
