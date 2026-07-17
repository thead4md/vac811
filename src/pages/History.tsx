import { Link } from 'react-router-dom';
import { useContent } from '../hooks/useContent';
import { type Settings, settingsStatic } from '../data/settings';
import { settingsSchema } from '../schemas/content';
import './History.css';

const staticTimelineEntries = [
  {
    year: '1929',
    title: 'Alapítás',
    content: `A 811. Szent József Cserkészcsapat 1929-ben alakult meg Vácott, a Reménység Egyesület 
    ifjúsági szakosztályaként. Az alapítók célja a váci fiatalok jellemformálása, közösségi nevelése 
    és a keresztény értékek átadása volt a cserkészmozgalom keretein belül.`,
    highlight: true,
  },
  {
    year: '1930–1940-es évek',
    title: 'Virágkor és növekedés',
    content: `A csapat az alapítást követő évtizedekben folyamatosan bővült. A váci fiatalok körében 
    gyorsan elterjedt a cserkészmozgalom. Rendszeres táborozások, portyák és közösségi rendezvények 
    jellemezték ezeket az éveket.`,
  },
  {
    year: '1948',
    title: 'A betiltás',
    content: `A kommunista hatalomátvétel után a Magyar Cserkészszövetséget feloszlatták, a cserkészetet 
    betiltották Magyarországon. A 811-es csapat kénytelen volt megszüntetni nyilvános tevékenységét — 
    de a cserkész szellem és az összetartozás érzése soha nem halt ki teljesen.`,
    highlight: true,
    negative: true,
  },
  {
    year: '1988',
    title: 'Újjáalakulás',
    content: `A rendszerváltozás előestéjén, 1988-ban a cserkészet ismét szabad lett Magyarországon. 
    A 811-es csapat újjáalakult, 30 éves hagyományokat és emléket örökítve. Az újrakezdés lelkesedése 
    és az összegyűlt tapasztalat együtt adott új lendületet a szervezetnek.`,
    highlight: true,
  },
  {
    year: '1990-es évek',
    title: 'Konszolidáció és fejlődés',
    content: `Az újjáalakulás utáni évtizedben a csapat stabilan fejlődött. Bekapcsolódtunk a Magyar 
    Cserkészszövetség munkájába, kialakítottuk a raj-rendszert, és újra megkezdtük az éves nyári 
    táborozásokat. A Reménység Egyesület és a Dunakanyar Ifjúságáért Alapítvány szervezeti hátteret 
    biztosított a növekedéshez.`,
  },
  {
    year: '2000-es évek',
    title: 'Erősödő közösség',
    content: `Az ezredforduló után a csapat taglétszáma folyamatosan nőtt. Az évente megrendezett 
    nyári táborok egyre nagyobb létszámmal valósultak meg, és egyre változatosabb helyszíneken. 
    A programok minősége és a cserkész nevelési rendszer mélyülése révén a csapat tekintélyes 
    váci intézménnyé vált.`,
  },
  {
    year: '2013–2025',
    title: 'A tábortörténet aranykora',
    content: `Az elmúlt tizenkét évben a csapat 13 emlékezetes nyári tábort szervezett, számos különböző
    helyszínen és keretmesével. 2022-ben Alsópetényben 266 cserkész vett részt a táborban — ez volt
    eddigi legnagyobb táborunk. 2025-ben Süttőn, 135 fővel kalózoztunk.`,
    highlight: true,
  },
];

// "Ma" (today) reflects live ECSET-sourced numbers rather than a hardcoded
// snapshot, so this entry doesn't go stale as the roster changes.
function buildTimeline(settings: Settings) {
  return [
    ...staticTimelineEntries,
    {
      year: 'Ma',
      title: `${settings.activeMemberCount} aktív cserkész`,
      content: `Jelenleg ${settings.activeMemberCount} aktív cserkész alkotja a csapatot ${settings.activeOrsCount} aktív őrsben, ${settings.rajCount} rajba szervezve.
      Csapatparancsnokunk Kucsera Boglárka, és egy elkötelezett vezető csapat állt össze, hogy
      folytassa azt a nevelési munkát, amelyet elődjeink 1929-ben elkezdtek.`,
      highlight: true,
    },
  ];
}

export default function History() {
  const { data: settingsData } = useContent<Settings>('settings.json', 'settings', settingsSchema);
  const timeline = buildTimeline(settingsData ?? settingsStatic);
  return (
    <main aria-label="Történet oldal">
      {/* Hero */}
      <section className="page-hero" aria-labelledby="history-heading">
        <div className="container">
          <div className="hero-badge">
            <span>📜</span>
            Történetünk
          </div>
          <h1 id="history-heading" className="section-title section-title--lg">
            Kilenc évtized<br/>cserkész hagyomány
          </h1>
          <p className="page-hero__subtitle">
            1929-től napjainkig — a 811. Szent József Cserkészcsapat útja Vácott.
          </p>
        </div>
      </section>

      {/* Intro quote */}
      <section className="section section--sm" style={{ background: 'var(--color-surface)' }}>
        <div className="container container--default">
          <blockquote className="history-quote">
            <p className="history-quote__text">
              „Emberebb emberré és magyarabb magyarrá"
            </p>
            <footer className="history-quote__source">
              — Sík Sándor, a cserkészet szellemi atyja
            </footer>
          </blockquote>
          <p style={{ fontSize: 'var(--text-base)', color: 'var(--color-text-muted)', lineHeight: 1.75, textAlign: 'center', maxWidth: '65ch', margin: '0 auto' }}>
            Ez a mondat vezérli a 811-es csapat munkáját 1929 óta. A cserkészet nem csupán 
            program — életmód, értékrend és közösség, amely generációkon átível.
          </p>
        </div>
      </section>

      {/* Timeline */}
      <section className="section" aria-labelledby="timeline-heading">
        <div className="container container--default">
          <span className="section-label">Időszalag</span>
          <h2 id="timeline-heading" className="section-title">A csapat történelme</h2>

          <div className="history-timeline">
            {timeline.map((item, index) => (
              <article
                key={item.year}
                className={`timeline-item${item.highlight ? ' timeline-item--highlight' : ''}${item.negative ? ' timeline-item--negative' : ''}`}
              >
                <div className="timeline-item__marker" aria-hidden="true">
                  <div className="timeline-item__dot"/>
                  {index < timeline.length - 1 && <div className="timeline-item__line"/>}
                </div>
                <div className="timeline-item__content">
                  <div className="timeline-item__year">{item.year}</div>
                  <h3 className="timeline-item__title">{item.title}</h3>
                  <p className="timeline-item__text">{item.content}</p>
                </div>
              </article>
            ))}
          </div>
        </div>
      </section>

      {/* Founding context */}
      <section className="section" style={{ background: 'var(--color-surface-offset)' }} aria-labelledby="alapitas-heading">
        <div className="container container--default">
          <div className="history-context">
            <div>
              <span className="section-label">Alapítók öröksége</span>
              <h2 id="alapitas-heading" className="section-title">Hagyomány és folytonosság</h2>
              <div className="prose">
                <p>
                  A 811. cserkészcsapat a Reménység Egyesület keretein belül jött létre 1929-ben Vácott,
                  az akkor virágzó civil szervezeti élet részeként. Az alapítók célja az volt, hogy a váci
                  fiatalok számára olyan szervezetet hozzanak létre, amelyben keresztény értékek mentén,
                  közösségben és természetközelben nevelkedhetnek.
                </p>
                <p>
                  A „811." szám a csapatot egyértelműen azonosítja a Magyar Cserkészszövetség rendszerében,
                  a „Szent József" névadó pedig a keresztény gyökereket és a Katolikus Egyházzal való
                  kapcsolatot jelöli. A váci székesegyházzal és a helyi egyházzal ápoolt kapcsolat
                  ma is meghatározó részük az életünknek — csapatmiséink és egyházi ünnepeink ezt tükrözik.
                </p>
                <p>
                  Az 1988-as újjáalakulás egy kivételes pillanat volt: harminc évnyi szünet után,
                  a rendszerváltozás közeledtén újra szabad lett a cserkészet. Azok, akik alapítottak,
                  szellemi folytonosságot teremtettek az 1929-es alapítókkal — és ezt a folytonosságot
                  mi ma is vállaljuk és őrizzük.
                </p>
              </div>
            </div>
            <div className="history-facts">
              <h3>Fontos számok</h3>
              <ul role="list">
                <li>
                  <strong>1929</strong>
                  <span>Alapítás éve</span>
                </li>
                <li>
                  <strong>30 év</strong>
                  <span>Szünet a betiltás idején</span>
                </li>
                <li>
                  <strong>1988</strong>
                  <span>Újjáalakulás</span>
                </li>
                <li>
                  <strong>35+ év</strong>
                  <span>Az újjáalakulás óta</span>
                </li>
                <li>
                  <strong>13+</strong>
                  <span>Nyári tábor 2013 óta</span>
                </li>
                <li>
                  <strong>266</strong>
                  <span>Eddigi legnagyobb tábor (2022)</span>
                </li>
              </ul>
            </div>
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="section section--sm">
        <div className="container text-center">
          <h2 className="section-title">Te is írsz velünk történelmet</h2>
          <p className="section-subtitle" style={{ margin: '0 auto var(--space-8)' }}>
            Csatlakozz a 811-es csapathoz, és légy részese egy kilencvenhét éves tradíciónak.
          </p>
          <div className="flex-center gap-4" style={{ flexWrap: 'wrap' }}>
            <Link to="/csatlakozas" className="btn btn--primary btn--lg">Csatlakozás</Link>
            <Link to="/taborok" className="btn btn--outline btn--lg">Táboraink</Link>
          </div>
        </div>
      </section>
    </main>
  );
}
