import { Link } from 'react-router-dom';

export default function NotFound() {
  return (
    <main style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: '60vh', textAlign: 'center' }}>
      <div>
        <div style={{ fontSize: '4rem', marginBottom: '1rem' }} aria-hidden="true">🏕️</div>
        <h1 style={{ fontFamily: 'var(--font-display)', fontSize: 'var(--text-2xl)', marginBottom: '1rem', color: 'var(--color-text)' }}>
          Ez az oldal nem található
        </h1>
        <p style={{ color: 'var(--color-text-muted)', marginBottom: '2rem', maxWidth: '40ch', marginInline: 'auto' }}>
          Úgy tűnik, eltévedtél a cserkész ösvényen. Vissza a főútra!
        </p>
        <Link to="/" className="btn btn--primary btn--lg">
          Vissza a főoldalra
        </Link>
      </div>
    </main>
  );
}
