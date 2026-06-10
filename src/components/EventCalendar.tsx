import { useMemo, useState, useCallback } from 'react';
import type { Event } from '../data/events';
import './EventCalendar.css';

const MONTHS = [
  'január', 'február', 'március', 'április', 'május', 'június',
  'július', 'augusztus', 'szeptember', 'október', 'november', 'december',
];
// Hungarian week starts on Monday
const WEEKDAYS = ['H', 'K', 'Sze', 'Cs', 'P', 'Szo', 'V'];

const CATEGORY_LABEL: Record<Event['category'], string> = {
  mise: 'Mise',
  portya: 'Portya',
  verseny: 'Verseny',
  tábor: 'Tábor',
  egyéb: 'Egyéb',
};

interface Props {
  events: Event[];
}

// Parse 'YYYY-MM-DD' into a local Date (avoids UTC offset surprises)
function parseDate(s: string): Date | null {
  const m = /^(\d{4})-(\d{2})-(\d{2})/.exec(s);
  if (!m) return null;
  return new Date(Number(m[1]), Number(m[2]) - 1, Number(m[3]));
}

export default function EventCalendar({ events }: Props) {
  // Group events by ISO date string for O(1) day lookup
  const eventsByDay = useMemo(() => {
    const map = new Map<string, Event[]>();
    for (const ev of events) {
      const d = parseDate(ev.date);
      if (!d) continue;
      const key = `${d.getFullYear()}-${d.getMonth()}-${d.getDate()}`;
      const arr = map.get(key);
      if (arr) arr.push(ev);
      else map.set(key, [ev]);
    }
    return map;
  }, [events]);

  // Start on the month of the earliest upcoming event, else today
  const initial = useMemo(() => {
    const today = new Date();
    const future = events
      .map((e) => parseDate(e.date))
      .filter((d): d is Date => !!d && d >= new Date(today.getFullYear(), today.getMonth(), 1))
      .sort((a, b) => a.getTime() - b.getTime());
    const ref = future[0] ?? today;
    return { year: ref.getFullYear(), month: ref.getMonth() };
  }, [events]);

  const [view, setView] = useState(initial);
  const [selected, setSelected] = useState<string | null>(null);

  const goPrev = useCallback(() => {
    setSelected(null);
    setView((v) => (v.month === 0 ? { year: v.year - 1, month: 11 } : { year: v.year, month: v.month - 1 }));
  }, []);
  const goNext = useCallback(() => {
    setSelected(null);
    setView((v) => (v.month === 11 ? { year: v.year + 1, month: 0 } : { year: v.year, month: v.month + 1 }));
  }, []);

  // Build the 6-row grid (offset so Monday is first)
  const cells = useMemo(() => {
    const first = new Date(view.year, view.month, 1);
    const offset = (first.getDay() + 6) % 7; // Mon=0 … Sun=6
    const daysInMonth = new Date(view.year, view.month + 1, 0).getDate();
    const out: ({ day: number; key: string; events: Event[] } | null)[] = [];
    for (let i = 0; i < offset; i++) out.push(null);
    for (let d = 1; d <= daysInMonth; d++) {
      const key = `${view.year}-${view.month}-${d}`;
      out.push({ day: d, key, events: eventsByDay.get(key) ?? [] });
    }
    while (out.length % 7 !== 0) out.push(null);
    return out;
  }, [view, eventsByDay]);

  const today = new Date();
  const todayKey = `${today.getFullYear()}-${today.getMonth()}-${today.getDate()}`;
  const selectedEvents = selected ? eventsByDay.get(selected) ?? [] : [];

  return (
    <div className="calendar">
      <div className="calendar__header">
        <button className="calendar__nav" onClick={goPrev} aria-label="Előző hónap">
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
            <path d="M15 18l-6-6 6-6" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        </button>
        <h3 className="calendar__title" aria-live="polite">
          {view.year}. {MONTHS[view.month]}
        </h3>
        <button className="calendar__nav" onClick={goNext} aria-label="Következő hónap">
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
            <path d="M9 18l6-6-6-6" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        </button>
      </div>

      <div className="calendar__grid" role="grid" aria-label={`${view.year}. ${MONTHS[view.month]} naptár`}>
        {WEEKDAYS.map((w) => (
          <div key={w} className="calendar__weekday" role="columnheader">{w}</div>
        ))}
        {cells.map((cell, i) =>
          cell === null ? (
            <div key={`empty-${i}`} className="calendar__cell calendar__cell--empty" role="gridcell" aria-hidden="true" />
          ) : (
            <button
              key={cell.key}
              role="gridcell"
              className={`calendar__cell${cell.key === todayKey ? ' calendar__cell--today' : ''}${
                cell.events.length ? ' calendar__cell--has-event' : ''
              }${selected === cell.key ? ' calendar__cell--selected' : ''}`}
              onClick={() => cell.events.length && setSelected(selected === cell.key ? null : cell.key)}
              aria-pressed={selected === cell.key}
              aria-label={
                cell.events.length
                  ? `${cell.day}. — ${cell.events.length} program`
                  : `${cell.day}.`
              }
              disabled={!cell.events.length}
            >
              <span className="calendar__daynum">{cell.day}</span>
              <span className="calendar__chips" aria-hidden="true">
                {cell.events.slice(0, 3).map((ev) => (
                  <span key={ev.id} className={`calendar__chip calendar__chip--${ev.category}`} />
                ))}
              </span>
            </button>
          )
        )}
      </div>

      {/* Detail popover for the selected day */}
      {selected && selectedEvents.length > 0 && (
        <div className="calendar__detail" role="region" aria-label="Kiválasztott nap programjai">
          {selectedEvents.map((ev) => (
            <article key={ev.id} className="calendar__event">
              <span className={`badge event-badge event-badge--${ev.category}`}>
                {CATEGORY_LABEL[ev.category]}
              </span>
              <h4 className="calendar__event-title">{ev.title}</h4>
              <time dateTime={ev.date} className="calendar__event-date">{ev.dateDisplay}</time>
              <p className="calendar__event-desc">{ev.description}</p>
            </article>
          ))}
        </div>
      )}

      {/* Legend */}
      <ul className="calendar__legend" role="list">
        {(Object.keys(CATEGORY_LABEL) as Event['category'][]).map((cat) => (
          <li key={cat} className="calendar__legend-item">
            <span className={`calendar__chip calendar__chip--${cat}`} aria-hidden="true" />
            {CATEGORY_LABEL[cat]}
          </li>
        ))}
      </ul>
    </div>
  );
}
