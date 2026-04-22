import { useContent } from '../hooks/useContent';
import { type Event, eventsStatic } from '../data/events';
import './News.css';

const categoryLabel: Record<string, string> = {
  mise: 'Mise',
  portya: 'Portya',
  verseny: 'Verseny',
  tábor: 'Tábor',
  egyéb: 'Esemény',
};

const newsItems = [
  {
    id: 'news-1',
    title: 'A 2025-ös nyári tábor sikeresen zárult',
    date: '2025-08-10',
    dateDisplay: '2025. augusztus 10.',
    category: 'tábor',
    summary: 'A 811-es cserkészcsapat 2025-ös nyári tábora Süttőn, a Pap-réten 135 fővel zárult sikeresen. A kalózos keretmesével tarkított tábort Sinka Dóra vezette.',
  },
  {
    id: 'news-2',
    title: 'Csapatmise a váci székesegyházban',
    date: '2026-04-05',
    dateDisplay: '2026. április 5.',
    category: 'mise',
    summary: 'Csapatunk részt vett a havi csapatmisén a váci székesegyházban. 4 cserkész biztosított baldachint az ünnepségen.',
  },
  {
    id: 'news-3',
    title: 'Csapatportya – háromnapos kaland a természetben',
    date: '2026-04-17',
    dateDisplay: '2026. április 17–19.',
    category: 'portya',
    summary: 'Április közepén háromnapos csapatportyára indulnak rajjaink. A részletekért kövesd oldalunkat!',
  },
];

export default function News() {
  const { data, loading } = useContent<Event[]>('events.json', 'events');
  const events = data ?? eventsStatic;

  return (
    <main aria-label="Hírek és események oldal">
      {/* Hero */}
      <section className="page-hero" aria-labelledby="news-page-heading">
        <div className="container">
          <div className="hero-badge">📰 Hírek</div>
          <h1 id="news-page-heading" className="section-title section-title--lg">
            Hírek &amp; Események
          </h1>
          <p className="page-hero__subtitle">
            Legfrissebb hírek a csapat életéből, közelgő programjaink és visszatekintők.
          </p>
        </div>
      </section>

      {/* Upcoming events */}
      <section className="section" aria-labelledby="upcoming-heading">
        <div className="container">
          <span className="section-label">Közelgő</span>
          <h2 id="upcoming-heading" className="section-title">Programnaptár</h2>
          {loading ? (
            <p style={{ color: 'var(--color-text-muted)', marginTop: 'var(--space-6)' }}>Betöltés…</p>
          ) : (
            <div className="events-upcoming">
              {events.map(event => (
                <article key={event.id} className="event-row">
                  <div className="event-row__date">
                    <div className="event-row__date-display">
                      {event.dateDisplay.split('. ')[1]?.split(' ')[0] || ''}
                      <span>{event.date.split('-')[0]}</span>
                    </div>
                  </div>
                  <div className="event-row__body">
                    <span className={`badge event-badge event-badge--${event.category}`}>
                      {categoryLabel[event.category]}
                    </span>
                    <h3 className="event-row__title">{event.title}</h3>
                    <time dateTime={event.date} className="event-row__time">{event.dateDisplay}</time>
                    <p className="event-row__desc">{event.description}</p>
                  </div>
                </article>
              ))}
            </div>
          )}
        </div>
      </section>

      {/* News articles */}
      <section className="section" style={{ background: 'var(--color-surface-offset)' }} aria-labelledby="latestnews-heading">
        <div className="container">
          <span className="section-label">Visszatekintők</span>
          <h2 id="latestnews-heading" className="section-title">Legfrissebb hírek</h2>
          <div className="news-grid">
            {newsItems.map(item => (
              <article key={item.id} className="news-article">
                <div className="news-article__header">
                  <span className={`badge event-badge event-badge--${item.category}`}>
                    {categoryLabel[item.category]}
                  </span>
                  <time dateTime={item.date} className="news-article__date">{item.dateDisplay}</time>
                </div>
                <h3 className="news-article__title">{item.title}</h3>
                <p className="news-article__summary">{item.summary}</p>
              </article>
            ))}
          </div>
          <p className="news-placeholder-note">
            📋 <em>Megjegyzés: Az összes cikk és archív tartalom tartalmának frissítése folyamatban van. 
            Kövess minket Facebookon és Instagramon az azonnali értesülésekért!</em>
          </p>
        </div>
      </section>

      {/* Social CTA */}
      <section className="section section--sm" aria-labelledby="social-cta-heading">
        <div className="container container--default text-center">
          <span className="section-label">Maradj naprakész</span>
          <h2 id="social-cta-heading" className="section-title">Kövess minket!</h2>
          <p className="section-subtitle" style={{ margin: '0 auto var(--space-8)' }}>
            A leggyorsabb hírekért, táborfotókért és eseményekért kövesd csapatunkat a közösségi médiában.
          </p>
          <div className="flex-center gap-4" style={{ flexWrap: 'wrap' }}>
            <a href="https://facebook.com/vac811" target="_blank" rel="noopener noreferrer" className="btn btn--primary btn--lg">
              <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
                <path d="M18 2h-3a5 5 0 0 0-5 5v3H7v4h3v8h4v-8h3l1-4h-4V7a1 1 0 0 1 1-1h3z"/>
              </svg>
              Facebook: vac811
            </a>
            <a href="https://instagram.com/811szentjozsef" target="_blank" rel="noopener noreferrer" className="btn btn--outline btn--lg">
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
                <rect x="2" y="2" width="20" height="20" rx="5" ry="5"/>
                <path d="M16 11.37A4 4 0 1 1 12.63 8 4 4 0 0 1 16 11.37z"/>
                <line x1="17.5" y1="6.5" x2="17.51" y2="6.5"/>
              </svg>
              Instagram: @811szentjozsef
            </a>
          </div>
        </div>
      </section>
    </main>
  );
}
