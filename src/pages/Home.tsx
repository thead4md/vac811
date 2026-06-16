import { useEffect, useRef } from 'react';
import { Link } from 'react-router-dom';
import { useContent } from '../hooks/useContent';
import { type Leader, leadersStatic, leaderPhotoSrc, initials } from '../data/leaders';
import { type Event, eventsStatic } from '../data/events';
import { type Camp, campsStatic } from '../data/camps';
import { type Settings, settingsStatic } from '../data/settings';
import { korosztalyokSummary as ageGroups } from '../data/korosztalyok';
import CountUp from '../components/CountUp';
import './Home.css';

const highlights = [
  {
    icon: '🏕️',
    title: 'Nyári táborozás',
    description: 'Minden évben más-más helyszínen, egyedi keretmesével – a tábor az egész évad csúcspontja.',
  },
  {
    icon: '🗺️',
    title: 'Portyák & kirándulások',
    description: 'Hétvégi kalandok Vác körzetében és az egész Dunakanyarban. Térkép, iránytű, cserkésztudás.',
  },
  {
    icon: '🙏',
    title: 'Keresztény értékrend',
    description: 'Csapatmisék, lelki napok és közösségi ünnepek. Gyökerek, amelyek megtartanak.',
  },
  {
    icon: '🤝',
    title: 'Közösségi szolgálat',
    description: 'Helyi rendezvények, önkéntes munkák, a váci közösség erősítése.',
  },
  {
    icon: '🧭',
    title: 'Készségfejlesztés',
    description: 'Csomózás, tájékozódás, elsősegély, főzés – igazi, hasznos tudás életre szólóan.',
  },
  {
    icon: '⚜️',
    title: 'Egyéni növekedés',
    description: 'Fogadalom, próbák, szalagok és fokozatok – a cserkész életút személyes mérföldkövei.',
  },
];

// Observes every `.reveal` descendant and reveals it on scroll. Reduced-motion
// users (and environments without IntersectionObserver) get everything revealed
// immediately. A short timeout fallback guards against any element that never
// fires an intersection (e.g. already in view on load).
function useReveal() {
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const reveals = el.querySelectorAll('.reveal');

    const prefersReduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    if (prefersReduced || typeof IntersectionObserver === 'undefined') {
      reveals.forEach((r) => r.classList.add('visible'));
      return;
    }

    const obs = new IntersectionObserver(
      (entries) => entries.forEach((e) => { if (e.isIntersecting) { e.target.classList.add('visible'); obs.unobserve(e.target); } }),
      { threshold: 0.05, rootMargin: '0px 0px -20px 0px' }
    );
    reveals.forEach((r) => obs.observe(r));
    // Safety fallback: ensure nothing stays hidden if an observe never fires.
    const t = setTimeout(() => {
      reveals.forEach((r) => r.classList.add('visible'));
    }, 800);
    return () => { obs.disconnect(); clearTimeout(t); };
  }, []);
  return ref;
}

// Subtle hero parallax: drift the repeating dot-grid as you scroll. Because the
// pattern repeats, shifting its background-position never reveals gaps. rAF-
// throttled and disabled for reduced-motion.
function useHeroParallax() {
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;
    let ticking = false;
    const update = () => {
      ticking = false;
      el.style.backgroundPositionY = `${window.scrollY * 0.25}px`;
    };
    const onScroll = () => { if (!ticking) { ticking = true; requestAnimationFrame(update); } };
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => window.removeEventListener('scroll', onScroll);
  }, []);
  return ref;
}

export default function Home() {
  const pageRef = useReveal();
  const heroPatternRef = useHeroParallax();

  // Content is CMS-managed (public/content/*.json); static imports are fallbacks.
  const { data: settingsData } = useContent<Settings>('settings.json', 'settings');
  const { data: eventsData } = useContent<Event[]>('events.json', 'events');
  const { data: leadersData } = useContent<Leader[]>('leaders.json', 'leaders');
  const { data: campsData } = useContent<Camp[]>('camps.json', 'camps');

  const settings = settingsData ?? settingsStatic;
  const events = eventsData ?? eventsStatic;
  const leaders = leadersData ?? leadersStatic;
  const campCount = (campsData ?? campsStatic).length;

  const upcomingEvents = events.slice(0, 3);
  const staffLeaders = leaders.filter((l) => l.isStaff).slice(0, 4);

  return (
    <main ref={pageRef} aria-label="Főoldal">
      {/* ── HERO ── */}
      <section className="hero" aria-labelledby="hero-heading">
        <div className="hero__bg" aria-hidden="true">
          <div className="hero__pattern" ref={heroPatternRef}/>
        </div>
        <div className="container hero__content">
          <div className="hero__badge animate-fade-in">
            Vác · Magyar Cserkészszövetség
          </div>
          <h1 id="hero-heading" className="hero__title animate-fade-in animate-delay-1">
            811. Szent József<br/>
            <span className="hero__title-accent">Cserkészcsapat</span>
          </h1>
          <p className="hero__subtitle animate-fade-in animate-delay-2">
            „Emberebb embert és magyarabb magyart nevelni" — ez a cserkészet célja {settings.foundedYear} óta.
            {' '}{settings.activeMemberCount} aktív cserkész, {settings.rajCount} raj, {settings.activeOrsCount} őrs. Jelszavunk: Légy résen!
          </p>
          <div className="hero__ctas animate-fade-in animate-delay-3">
            <Link to="/csatlakozas" className="btn btn--primary btn--lg">
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
                <path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2"/>
                <circle cx="9" cy="7" r="4"/>
                <path d="M22 21v-2a4 4 0 0 0-3-3.87M16 3.13a4 4 0 0 1 0 7.75"/>
              </svg>
              Csatlakozz hozzánk
            </Link>
            <Link to="/rolunk" className="btn btn--ghost btn--lg">
              Ismerd meg a csapatot
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
                <path d="M5 12h14M12 5l7 7-7 7"/>
              </svg>
            </Link>
          </div>
          <div className="hero__stats animate-fade-in animate-delay-4">
            <div className="hero__stat">
              <strong><CountUp value={settings.activeMemberCount} /></strong>
              <span>aktív cserkész</span>
            </div>
            <div className="hero__stat-divider" aria-hidden="true"/>
            <div className="hero__stat">
              <strong><CountUp value={settings.rajCount} /></strong>
              <span>raj</span>
            </div>
            <div className="hero__stat-divider" aria-hidden="true"/>
            <div className="hero__stat">
              <strong>{settings.foundedYear}</strong>
              <span>alapítva</span>
            </div>
            <div className="hero__stat-divider" aria-hidden="true"/>
            <div className="hero__stat">
              <strong><CountUp value={campCount} suffix="+" /></strong>
              <span>tábor</span>
            </div>
          </div>
        </div>
        <div className="hero__scroll" aria-hidden="true">
          <div className="hero__scroll-dot"/>
        </div>
      </section>

      {/* ── WHO WE ARE ── */}
      <section className="section intro reveal" aria-labelledby="intro-heading">
        <div className="container intro__grid">
          <div className="intro__text">
            <span className="section-label">Kik vagyunk?</span>
            <h2 id="intro-heading" className="section-title">
              Egy életre szóló<br/>közösség Vácott
            </h2>
            <p className="intro__body">
              A 811. Szent József Cserkészcsapat Vác egyik legnagyobb és legelkötelezettebb ifjúsági szervezete.
              Keresztény értékrenden alapuló, nyitott közösség vagyunk, ahol a gyerekek nemcsak cserkészetet tanulnak,
              hanem barátokat szereznek, karaktert formálnak, és megtalálják önmagukat.
            </p>
            <p className="intro__body">
              Sík Sándor szavai vezérelnek minket: <em>„emberebb emberré és magyarabb magyarrá"</em> nevelni
              minden cserkészt – legyen az 6 éves kiscserkész, vagy 17 éves öregcserkész.
            </p>
            <div className="intro__links">
              <Link to="/tortenet" className="btn btn--outline">Ismerd meg a történetünket</Link>
              <Link to="/rolunk" className="btn btn--ghost">Rólunk bővebben</Link>
            </div>
          </div>
          <div className="intro__visual" aria-hidden="true">
            <div className="intro__card intro__card--1">
              <div className="intro__icon">🌲</div>
              <span>Természet és kaland</span>
            </div>
            <div className="intro__card intro__card--2">
              <div className="intro__icon">🙏</div>
              <span>Keresztény értékek</span>
            </div>
            <div className="intro__card intro__card--3">
              <div className="intro__icon">🤝</div>
              <span>Közösség és barátság</span>
            </div>
            <div className="intro__card intro__card--4">
              <div className="intro__icon">⚜️</div>
              <span>Cserkész hagyományok</span>
            </div>
          </div>
        </div>
      </section>

      {/* ── AGE GROUPS ── */}
      <section className="section age-groups reveal" style={{ background: 'var(--color-surface-offset)' }} aria-labelledby="age-heading">
        <div className="container">
          <div className="text-center" style={{ marginBottom: 'var(--space-10)' }}>
            <span className="section-label">Kiknek szól?</span>
            <h2 id="age-heading" className="section-title">Mindenkinek van helye</h2>
            <p className="section-subtitle" style={{ margin: '0 auto' }}>
              6 évestől felnőttkorig – a cserkészet minden életszakaszban ad értéket és közösséget.
            </p>
          </div>
          <div className="grid-4 age-grid">
            {ageGroups.map((group) => (
              <article key={group.name} className="age-card reveal">
                <div className="age-card__icon" aria-hidden="true">{group.icon}</div>
                <h3 className="age-card__name">{group.name}</h3>
                <div className="age-card__age">{group.age}</div>
                <p className="age-card__desc">{group.description}</p>
              </article>
            ))}
          </div>
          <div className="text-center" style={{ marginTop: 'var(--space-8)' }}>
            <Link to="/csatlakozas" className="btn btn--primary btn--lg">
              Szeretnék csatlakozni
            </Link>
          </div>
        </div>
      </section>

      {/* ── HIGHLIGHTS ── */}
      <section className="section highlights reveal" aria-labelledby="highlights-heading">
        <div className="container">
          <div className="highlights__header">
            <div>
              <span className="section-label">Mit csinálunk?</span>
              <h2 id="highlights-heading" className="section-title">A cserkészélet ízelítője</h2>
            </div>
            <Link to="/rolunk" className="btn btn--ghost">
              Minden tevékenység
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
                <path d="M5 12h14M12 5l7 7-7 7"/>
              </svg>
            </Link>
          </div>
          <div className="highlights__grid">
            {highlights.map((h, i) => (
              <article key={h.title} className={`highlight-card reveal${i === 0 ? ' highlight-card--featured' : ''}`}>
                <div className="highlight-card__icon" aria-hidden="true">{h.icon}</div>
                <h3 className="highlight-card__title">{h.title}</h3>
                <p className="highlight-card__desc">{h.description}</p>
              </article>
            ))}
          </div>
        </div>
      </section>

      {/* ── CAMPS TEASER ── */}
      <section className="section camps-teaser reveal" style={{ background: 'var(--color-surface)' }} aria-labelledby="camps-heading">
        <div className="container">
          <div className="camps-teaser__inner">
            <div className="camps-teaser__text">
              <span className="section-label">Táborozás</span>
              <h2 id="camps-heading" className="section-title">
                Minden nyáron egy<br/>új kaland vár
              </h2>
              <p className="section-subtitle">
                Tizenkét éve minden nyáron felállítjuk a sátrakat, meggyújtjuk a tábortüzet,
                és életre szóló emlékeket teremtünk. 2025-ben kalózoztunk Süttőn, 135 fővel.
              </p>
              <Link to="/taborok" className="btn btn--primary" style={{ marginTop: 'var(--space-6)' }}>
                Tábortörténetünk
              </Link>
            </div>
            <div className="camps-teaser__years">
              {[2025, 2024, 2023, 2022, 2021, 2020].map((year) => (
                <div key={year} className="camps-teaser__year">
                  <span className="camps-teaser__year-num">{year}</span>
                </div>
              ))}
              <div className="camps-teaser__more">
                <span>+7 tábor</span>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ── EVENTS ── */}
      <section className="section events reveal" aria-labelledby="events-heading">
        <div className="container">
          <div className="highlights__header">
            <div>
              <span className="section-label">Naptár</span>
              <h2 id="events-heading" className="section-title">Közelgő események</h2>
            </div>
            <Link to="/hirek" className="btn btn--ghost">
              Összes esemény
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
                <path d="M5 12h14M12 5l7 7-7 7"/>
              </svg>
            </Link>
          </div>
          <div className="events__list">
            {upcomingEvents.map((event) => (
              <article key={event.id} className="event-card reveal">
                <div className="event-card__meta">
                  <span className={`badge event-badge event-badge--${event.category}`}>
                    {event.category === 'mise' && 'Mise'}
                    {event.category === 'portya' && 'Portya'}
                    {event.category === 'verseny' && 'Verseny'}
                    {event.category === 'tábor' && 'Tábor'}
                    {event.category === 'egyéb' && 'Esemény'}
                  </span>
                  <time dateTime={event.date} className="event-card__date">{event.dateDisplay}</time>
                </div>
                <h3 className="event-card__title">{event.title}</h3>
                <p className="event-card__desc">{event.description}</p>
              </article>
            ))}
          </div>
        </div>
      </section>

      {/* ── LEADERS PREVIEW ── */}
      <section className="section leaders-preview reveal" style={{ background: 'var(--color-surface-offset)' }} aria-labelledby="leaders-heading">
        <div className="container">
          <div className="text-center" style={{ marginBottom: 'var(--space-10)' }}>
            <span className="section-label">Csapatvezetés</span>
            <h2 id="leaders-heading" className="section-title">Akik irányítják a csapatot</h2>
          </div>
          <div className="leaders-grid">
            {staffLeaders.map((leader) => (
              <article key={leader.name} className="leader-card reveal">
                <div className="leader-card__avatar" aria-hidden="true">
                  {leader.photo
                    ? <img className="leader-avatar-img" src={leaderPhotoSrc(leader.photo)} alt="" loading="lazy" />
                    : <span>{initials(leader.name)}</span>}
                </div>
                <h3 className="leader-card__name">{leader.name}</h3>
                <p className="leader-card__role">{leader.role}</p>
                {leader.raj && <p className="leader-card__raj">{leader.raj}</p>}
                {leader.email && (
                  <a href={`mailto:${leader.email}`} className="leader-card__email" aria-label={`Email küldése: ${leader.name}`}>
                    <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
                      <path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z"/>
                      <polyline points="22,6 12,13 2,6"/>
                    </svg>
                    {leader.email}
                  </a>
                )}
              </article>
            ))}
          </div>
          <div className="text-center" style={{ marginTop: 'var(--space-8)' }}>
            <Link to="/vezetok" className="btn btn--outline">Összes vezető megtekintése</Link>
          </div>
        </div>
      </section>

      {/* ── HISTORY TEASER ── */}
      <section className="section history-teaser reveal" aria-labelledby="history-heading">
        <div className="container history-teaser__inner">
          <div className="history-teaser__content">
            <span className="section-label">Hagyomány</span>
            <h2 id="history-heading" className="section-title">Kilenc évtized<br/>cserkészhagyomány</h2>
            <p>
              A 811-es csapat 1929-ben alakult Vácott a Reménység Egyesület keretein belül.
              A cserkészet 1948-as betiltása után 1988-ban újjáalakulva, harmincéves hagyományokat
              örökítve indult újra a csapat – immár a Magyar Cserkészszövetség tagjaként.
            </p>
            <Link to="/tortenet" className="btn btn--primary" style={{ marginTop: 'var(--space-6)' }}>
              Fedezd fel a történetünket
            </Link>
          </div>
          <div className="history-teaser__timeline">
            {[
              { year: String(settings.foundedYear), label: 'Alapítás' },
              { year: '1948', label: 'Betiltás' },
              { year: '1988', label: 'Újjáalakulás' },
              { year: 'Ma', label: `${settings.activeMemberCount} cserkész` },
            ].map((item, i, arr) => (
              <div key={item.year} className="history-item">
                <div className="history-item__year">{item.year}</div>
                <div className="history-item__label">{item.label}</div>
                {i < arr.length - 1 && <div className="history-item__line" aria-hidden="true"/>}
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── JOIN CTA ── */}
      <section className="join-cta" aria-labelledby="join-heading">
        <div className="container join-cta__inner">
          <div className="join-cta__text">
            <h2 id="join-heading" className="join-cta__title">
              Csatlakozz te is a<br/>811-es közösséghez!
            </h2>
            <p className="join-cta__subtitle">
              Legyen szó 8 éves gyermekedről, vagy arról, hogy te magad szeretnél aktív cserkész lenni –
              szívesen fogadunk mindenkit.
            </p>
            <div className="join-cta__actions">
              <Link to="/csatlakozas" className="btn btn--primary btn--lg">
                Regisztráció & csatlakozás
              </Link>
              <Link to="/kapcsolat" className="btn btn--ghost btn--lg">
                Kérdésem van
              </Link>
            </div>
            <p className="join-cta__address">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
                <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"/>
                <circle cx="12" cy="10" r="3"/>
              </svg>
              Csapatotthon: 2600 Vác, Dr. Csányi László krt. 58.
            </p>
          </div>
        </div>
      </section>
    </main>
  );
}
