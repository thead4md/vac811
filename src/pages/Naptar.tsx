import { useState } from 'react';
import { useContent } from '../hooks/useContent';
import { useReveal } from '../hooks/useReveal';
import { type Event, eventsStatic } from '../data/events';
import EventCalendar from '../components/EventCalendar';
import NeckerchiefDivider from '../components/NeckerchiefDivider';
import './Naptar.css';

const categoryLabel: Record<string, string> = {
  mise: 'Mise',
  portya: 'Portya',
  verseny: 'Verseny',
  tábor: 'Tábor',
  egyéb: 'Egyéb',
};

export default function Naptar() {
  const { data, loading } = useContent<Event[]>('events.json', 'events');
  const events = data ?? eventsStatic;
  const [mode, setMode] = useState<'grid' | 'list'>('grid');
  const listRef = useReveal<HTMLDivElement>();

  const sorted = [...events].sort((a, b) => a.date.localeCompare(b.date));

  return (
    <main aria-label="Naptár oldal">
      <section className="page-hero" aria-labelledby="naptar-page-heading">
        <div className="container">
          <div className="hero-badge">Naptár</div>
          <h1 id="naptar-page-heading" className="section-title section-title--lg">
            Programnaptár
          </h1>
          <p className="page-hero__subtitle">
            Csapatmisék, portyák, versenyek és táborok — minden közelgő program egy helyen.
          </p>
          <NeckerchiefDivider variant="section" />
        </div>
      </section>

      <section className="section" aria-labelledby="calendar-heading">
        <div className="container container--default">
          <div className="naptar__toolbar">
            <h2 id="calendar-heading" className="section-title" style={{ marginBottom: 0 }}>
              Események
            </h2>
            <div className="naptar__toggle" role="group" aria-label="Nézet váltása">
              <button
                className={`naptar__toggle-btn${mode === 'grid' ? ' active' : ''}`}
                onClick={() => setMode('grid')}
                aria-pressed={mode === 'grid'}
              >
                Naptár
              </button>
              <button
                className={`naptar__toggle-btn${mode === 'list' ? ' active' : ''}`}
                onClick={() => setMode('list')}
                aria-pressed={mode === 'list'}
              >
                Lista
              </button>
            </div>
          </div>

          {loading ? (
            <div className="naptar__skeleton" aria-busy="true" aria-label="Betöltés">
              {Array.from({ length: 5 }).map((_, i) => (
                <div key={i} className="naptar__skeleton-row" />
              ))}
            </div>
          ) : mode === 'grid' ? (
            <EventCalendar events={events} />
          ) : (
            <div className="naptar__list reveal" ref={listRef}>
              {sorted.map((ev) => (
                <article key={ev.id} className="event-row">
                  <div className="event-row__body">
                    <span className={`badge event-badge event-badge--${ev.category}`}>
                      {categoryLabel[ev.category]}
                    </span>
                    <h3 className="event-row__title">{ev.title}</h3>
                    <time dateTime={ev.date} className="event-row__time">{ev.dateDisplay}</time>
                    <p className="event-row__desc">{ev.description}</p>
                  </div>
                </article>
              ))}
            </div>
          )}
        </div>
      </section>

      <section className="section section--sm" aria-labelledby="naptar-social-heading">
        <div className="container container--default text-center">
          <span className="section-label">Maradj naprakész</span>
          <h2 id="naptar-social-heading" className="section-title">Kövess minket!</h2>
          <p className="section-subtitle" style={{ margin: '0 auto var(--space-8)' }}>
            A leggyorsabb hírekért, táborfotókért és eseményekért kövesd csapatunkat a közösségi médiában.
          </p>
          <div className="flex-center gap-4" style={{ flexWrap: 'wrap' }}>
            <a href="https://facebook.com/vac811" target="_blank" rel="noopener noreferrer" className="btn btn--primary btn--lg">
              Facebook: vac811
            </a>
            <a href="https://instagram.com/811szentjozsef" target="_blank" rel="noopener noreferrer" className="btn btn--outline btn--lg">
              Instagram: @811szentjozsef
            </a>
          </div>
        </div>
      </section>
    </main>
  );
}
