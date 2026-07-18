import type { GalleryItem } from '../../types/gallery';
import './GalleryCard.css';

interface Props {
  item: GalleryItem;
  onOpen: () => void;
  size?: 'large' | 'medium' | 'small';
}

const SIZES_ATTR: Record<NonNullable<Props['size']>, string> = {
  large: '(max-width: 768px) 100vw, 600px',
  medium: '(max-width: 768px) 50vw, 600px',
  small: '(max-width: 768px) 50vw, 300px',
};

export default function GalleryCard({ item, onOpen, size = 'small' }: Props) {
  return (
    <button
      type="button"
      className={`gallery-card gallery-card--${size}`}
      onClick={onOpen}
    >
      <img
        src={item.thumbnailUrl ?? item.imageUrl}
        srcSet={item.srcSet}
        sizes={item.srcSet ? SIZES_ATTR[size] : undefined}
        alt={item.alt}
        loading="lazy"
        decoding="async"
        className="gallery-card__img"
      />
      {item.mediaType !== 'image' && (
        <span className="gallery-card__play" aria-hidden="true">
          <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor">
            <path d="M8 5v14l11-7z" />
          </svg>
        </span>
      )}
      {item.source === 'instagram' && (
        <span className="gallery-card__badge">Instagram</span>
      )}
    </button>
  );
}
