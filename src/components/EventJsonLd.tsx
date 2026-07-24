import { Head } from 'vite-react-ssg';
import type { Event } from '../data/events';

// Emits schema.org Event JSON-LD for the calendar (Phase 3.2), extending the
// site-wide Organization JSON-LD in index.html. Individual events don't carry
// a location field today (see src/data/events.ts / public/content/events.json),
// so every event defaults to the team's clubhouse address — an approximation
// that's directionally correct for most entries (rajgyűlés, mise) but not
// guaranteed for off-site portyák/táborok. Revisit if/when per-event location
// data is added to the content schema.
const DEFAULT_LOCATION = {
  '@type': 'Place',
  name: '811. Szent József Cserkészcsapat csapatotthona',
  address: {
    '@type': 'PostalAddress',
    streetAddress: 'Dr. Csányi László krt. 58.',
    addressLocality: 'Vác',
    postalCode: '2600',
    addressCountry: 'HU',
  },
};

export default function EventJsonLd({ events }: { events: Event[] }) {
  if (events.length === 0) return null;

  const graph = events.map((ev) => ({
    '@type': 'Event',
    name: ev.title,
    startDate: ev.date,
    description: ev.description || ev.title,
    eventAttendanceMode: 'https://schema.org/OfflineEventAttendanceMode',
    eventStatus: 'https://schema.org/EventScheduled',
    location: DEFAULT_LOCATION,
    organizer: {
      '@type': 'Organization',
      name: '811. Szent József Cserkészcsapat',
      url: 'https://vac811.hu',
    },
  }));

  return (
    <Head>
      <script type="application/ld+json">
        {JSON.stringify({ '@context': 'https://schema.org', '@graph': graph })}
      </script>
    </Head>
  );
}
