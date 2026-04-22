import { Link } from 'react-router-dom';
import { rajok } from '../data/rajok';
import './Rajok.css';

export default function Rajok() {
  return (
    <main aria-label="Rajok oldal">
      <section className="page-hero" aria-labelledby="rajok-page-heading">
        <div className="container">
          <div className="hero-badge">⚜️ Rajok</div>
          <h1 id="rajok-page-heading" className="section-title section-title--lg">Rajaink</h1>
          <p className="page-hero__subtitle">
            A 811-es csapat 11 rajból áll — mindegyiknek saját neve, szelleme és vezető csapata van.
          </p>
        </div>
      </section>

      <section className="section" aria-labelledby="rajok-list-heading">
        <div className="container">
          <span className="section-label">Szervezet</span>
          <h2 id="rajok-list-heading" className="section-title">A csapat 11 raja</h2>
          <p className="section-subtitle" style={{ marginBottom: 'var(--space-10)' }}>
            Minden raj több őrsből áll, és saját rajparancsnoka vagy rajvezetője irányítja.
          </p>
          <div className="grid-3">
            {rajok.map(raj => (
              <article key={raj.name} className="raj-full-card">
                <div className="raj-full-card__name-row">
                  <h3 className="raj-full-card__name">{raj.name}</h3>
                  <span className="badge">{raj.ageGroup}</span>
                </div>
                <p className="raj-full-card__desc">{raj.description}</p>
              </article>
            ))}
          </div>
        </div>
      </section>

      <section className="section section--sm" style={{ background: 'var(--color-surface)' }}>
        <div className="container text-center">
          <h2 className="section-title">Melyik raj a tiéd?</h2>
          <p className="section-subtitle" style={{ margin: '0 auto var(--space-8)' }}>
            A rajba sorolást a csapatparancsnok és a vezető csapat végzi, életkor és érdeklődés alapján.
            Ha csatlakozol, te is megtalálod a helyed!
          </p>
          <div className="flex-center gap-4" style={{ flexWrap: 'wrap' }}>
            <Link to="/csatlakozas" className="btn btn--primary btn--lg">Csatlakozás</Link>
            <Link to="/vezetok" className="btn btn--outline btn--lg">Rajvezetők</Link>
          </div>
        </div>
      </section>
    </main>
  );
}
