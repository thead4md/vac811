import { useCallback, useEffect, useRef } from 'react';
import type { GalleryItem } from '../../types/gallery';
import './GalleryLightbox.css';

interface Props {
  items: GalleryItem[];
  index: number;
  onClose: () => void;
  onNavigate: (index: number) => void;
}

// Full a11y-compliant lightbox: focus trap, Escape/arrow keys, swipe on
// touch, tap-outside to close, focus returns to the trigger on unmount.
export default function GalleryLightbox({ items, index, onClose, onNavigate }: Props) {
  const dialogRef = useRef<HTMLDivElement>(null);
  const touchStartX = useRef<number | null>(null);
  const item = items[index];

  const goPrev = useCallback(
    () => onNavigate((index - 1 + items.length) % items.length),
    [index, items.length, onNavigate],
  );
  const goNext = useCallback(
    () => onNavigate((index + 1) % items.length),
    [index, items.length, onNavigate],
  );

  // Focus the dialog on open, restore focus to whatever triggered it on close.
  useEffect(() => {
    const previouslyFocused = document.activeElement as HTMLElement | null;
    dialogRef.current?.focus();
    const prevOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      document.body.style.overflow = prevOverflow;
      previouslyFocused?.focus();
    };
  }, []);

  // Escape / arrow keys / focus trap (Tab cycles within the dialog only).
  useEffect(() => {
    function handleKeyDown(e: KeyboardEvent) {
      if (e.key === 'Escape') {
        onClose();
        return;
      }
      if (e.key === 'ArrowLeft') {
        goPrev();
        return;
      }
      if (e.key === 'ArrowRight') {
        goNext();
        return;
      }
      if (e.key === 'Tab') {
        const focusables = dialogRef.current?.querySelectorAll<HTMLElement>(
          'a[href], button:not([disabled]), [tabindex]:not([tabindex="-1"])',
        );
        if (!focusables || focusables.length === 0) return;
        const first = focusables[0];
        const last = focusables[focusables.length - 1];
        if (e.shiftKey && document.activeElement === first) {
          e.preventDefault();
          last.focus();
        } else if (!e.shiftKey && document.activeElement === last) {
          e.preventDefault();
          first.focus();
        }
      }
    }
    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [onClose, goPrev, goNext]);

  if (!item) return null;

  const label = [item.eventTitle, item.year].filter(Boolean).join(' – ') || item.alt;

  return (
    <div
      className="gallery-lightbox"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
      onTouchStart={(e) => {
        touchStartX.current = e.touches[0].clientX;
      }}
      onTouchEnd={(e) => {
        if (touchStartX.current == null) return;
        const delta = e.changedTouches[0].clientX - touchStartX.current;
        if (Math.abs(delta) > 50) (delta > 0 ? goPrev : goNext)();
        touchStartX.current = null;
      }}
    >
      <div
        ref={dialogRef}
        className="gallery-lightbox__dialog"
        role="dialog"
        aria-modal="true"
        aria-label={label}
        tabIndex={-1}
      >
        <button
          type="button"
          className="gallery-lightbox__close"
          onClick={onClose}
          aria-label="Bezárás"
        >
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
            <line x1="18" y1="6" x2="6" y2="18" />
            <line x1="6" y1="6" x2="18" y2="18" />
          </svg>
        </button>

        {items.length > 1 && (
          <button
            type="button"
            className="gallery-lightbox__nav gallery-lightbox__nav--prev"
            onClick={goPrev}
            aria-label="Előző kép"
          >
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
              <path d="M15 18l-6-6 6-6" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          </button>
        )}

        <figure className="gallery-lightbox__figure">
          {item.mediaType === 'image' ? (
            <img src={item.imageUrl} alt={item.alt} className="gallery-lightbox__img" />
          ) : (
            <video src={item.imageUrl} controls className="gallery-lightbox__img" />
          )}
          <figcaption className="gallery-lightbox__caption">
            {item.caption && <p>{item.caption}</p>}
            <p className="gallery-lightbox__meta">
              <span>{item.source === 'instagram' ? 'Instagram' : 'Galéria'}</span>
              {item.eventTitle && <span> · {item.eventTitle}</span>}
              {item.year && <span> · {item.year}</span>}
              {item.permalink && (
                <>
                  {' · '}
                  <a href={item.permalink} target="_blank" rel="noopener noreferrer">
                    Megnyitás Instagramon
                  </a>
                </>
              )}
            </p>
          </figcaption>
        </figure>

        {items.length > 1 && (
          <button
            type="button"
            className="gallery-lightbox__nav gallery-lightbox__nav--next"
            onClick={goNext}
            aria-label="Következő kép"
          >
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
              <path d="M9 18l6-6-6-6" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          </button>
        )}
      </div>
    </div>
  );
}
