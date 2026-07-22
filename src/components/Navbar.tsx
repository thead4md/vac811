import { useState, useEffect, useRef } from 'react';
import { Link, useLocation } from 'react-router-dom';
import logoUrl from '/logo.svg?url';
import './Navbar.css';

const navItems = [
  { label: 'Kezdőlap', path: '/' },
  {
    label: 'Rólunk',
    path: '/rolunk',
    children: [
      { label: 'Történet', path: '/tortenet' },
      { label: 'A cserkészetről', path: '/cserkeszet' },
      { label: 'Vezetők', path: '/vezetok' },
      { label: 'Rajok', path: '/rajok' },
      { label: 'Táborok', path: '/taborok' },
    ],
  },
  { label: 'Naptár', path: '/naptar' },
  { label: 'Galéria', path: '/galeria' },
  { label: 'Kapcsolat', path: '/kapcsolat' },
];

export default function Navbar() {
  const [scrolled, setScrolled] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);
  // SSR-safe default: the inline no-flash script in index.html already resolved
  // the real theme (localStorage → matchMedia) and set data-theme on <html>
  // before paint, so we default to 'light' here to match the server-rendered
  // markup and adopt the actual theme in an effect after hydration — reading
  // localStorage/matchMedia during render would throw when prerendered.
  const [theme, setTheme] = useState<'light' | 'dark'>('light');
  const [openDropdown, setOpenDropdown] = useState<string | null>(null);
  const location = useLocation();
  const navRef = useRef<HTMLElement>(null);

  // Adopt whatever theme the no-flash script already applied to <html>. This
  // one-time post-mount sync from external (pre-paint) DOM state is deliberate:
  // doing it in the useState initializer instead would read the real theme
  // during render and break hydration (the prerendered markup is always
  // 'light'), so the setState here is the correct place, not a cascading-render
  // smell.
  useEffect(() => {
    const current = document.documentElement.getAttribute('data-theme');
    // eslint-disable-next-line react-hooks/set-state-in-effect
    if (current === 'light' || current === 'dark') setTheme(current);
  }, []);

  // Sync the chosen theme to the DOM (runs whenever it changes).
  useEffect(() => {
    document.documentElement.setAttribute('data-theme', theme);
  }, [theme]);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 20);
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (navRef.current && !navRef.current.contains(e.target as Node)) {
        setOpenDropdown(null);
      }
    };
    document.addEventListener('click', handler);
    return () => document.removeEventListener('click', handler);
  }, []);

  const toggleTheme = () => {
    const next = theme === 'light' ? 'dark' : 'light';
    setTheme(next);
    localStorage.setItem('theme', next);
  };

  // Close the mobile menu / open dropdown after navigating.
  const closeMenus = () => {
    setMenuOpen(false);
    setOpenDropdown(null);
  };

  const isActive = (path: string) => {
    if (path === '/') return location.pathname === '/';
    return location.pathname.startsWith(path);
  };

  return (
    <header className={`navbar${scrolled ? ' navbar--scrolled' : ''}`} ref={navRef}>
      <div className="navbar__inner container">
        {/* Logo */}
        <Link to="/" className="navbar__logo" aria-label="811. cserkészcsapat – Főoldal" onClick={closeMenus}>
          <img src={logoUrl} alt="" width="44" height="44" style={{ objectFit: 'contain', flexShrink: 0, display: 'block' }} />
          <span className="navbar__logo-text">
            <strong>811.</strong> Cserkészcsapat
          </span>
        </Link>

        {/* Desktop nav */}
        <nav className="navbar__nav" aria-label="Főnavigáció">
          <ul className="navbar__list" role="list">
            {navItems.map((item) => (
              <li key={item.path} className={`navbar__item${item.children ? ' navbar__item--dropdown' : ''}`}>
                {item.children ? (
                  <>
                    <button
                      className={`navbar__link navbar__link--btn${isActive(item.path) ? ' active' : ''}`}
                      onClick={() => setOpenDropdown(openDropdown === item.label ? null : item.label)}
                      aria-expanded={openDropdown === item.label}
                      aria-haspopup="true"
                    >
                      {item.label}
                      <svg width="12" height="12" viewBox="0 0 12 12" fill="none" aria-hidden="true"
                        style={{ transform: openDropdown === item.label ? 'rotate(180deg)' : 'none', transition: 'transform 0.2s' }}>
                        <path d="M2 4l4 4 4-4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/>
                      </svg>
                    </button>
                    {openDropdown === item.label && (
                      <ul className="navbar__dropdown" role="list">
                        {item.children.map((child) => (
                          <li key={child.path}>
                            <Link
                              to={child.path}
                              className={`navbar__dropdown-link${isActive(child.path) ? ' active' : ''}`}
                              onClick={closeMenus}
                            >
                              {child.label}
                            </Link>
                          </li>
                        ))}
                      </ul>
                    )}
                  </>
                ) : (
                  <Link
                    to={item.path}
                    className={`navbar__link${isActive(item.path) ? ' active' : ''}`}
                    onClick={closeMenus}
                  >
                    {item.label}
                  </Link>
                )}
              </li>
            ))}
          </ul>
        </nav>

        {/* Actions */}
        <div className="navbar__actions">
          <button
            className="navbar__theme-btn"
            onClick={toggleTheme}
            aria-label={theme === 'dark' ? 'Váltás világos módra' : 'Váltás sötét módra'}
          >
            {theme === 'dark' ? (
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
                <circle cx="12" cy="12" r="5"/>
                <path d="M12 1v2M12 21v2M4.22 4.22l1.42 1.42M18.36 18.36l1.42 1.42M1 12h2M21 12h2M4.22 19.78l1.42-1.42M18.36 5.64l1.42-1.42"/>
              </svg>
            ) : (
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
                <path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z"/>
              </svg>
            )}
          </button>

          <Link to="/csatlakozas" className="btn btn--primary navbar__cta" onClick={closeMenus}>
            Csatlakozz!
          </Link>

          {/* Hamburger */}
          <button
            className={`navbar__hamburger${menuOpen ? ' open' : ''}`}
            onClick={() => setMenuOpen(!menuOpen)}
            aria-label={menuOpen ? 'Menü bezárása' : 'Menü megnyitása'}
            aria-expanded={menuOpen}
          >
            <span/><span/><span/>
          </button>
        </div>
      </div>

      {/* Mobile menu */}
      {menuOpen && (
        <div className="navbar__mobile" role="navigation" aria-label="Mobil navigáció">
          <ul role="list">
            {navItems.map((item) => (
              <li key={item.path}>
                <Link to={item.path} className={`navbar__mobile-link${isActive(item.path) ? ' active' : ''}`} onClick={closeMenus}>
                  {item.label}
                </Link>
                {item.children && (
                  <ul className="navbar__mobile-sub" role="list">
                    {item.children.map((child) => (
                      <li key={child.path}>
                        <Link to={child.path} className="navbar__mobile-sublink" onClick={closeMenus}>
                          — {child.label}
                        </Link>
                      </li>
                    ))}
                  </ul>
                )}
              </li>
            ))}
            <li>
              <Link to="/csatlakozas" className="btn btn--primary" style={{ marginTop: '1rem', width: '100%', justifyContent: 'center' }}>
                Csatlakozz!
              </Link>
            </li>
          </ul>
        </div>
      )}
    </header>
  );
}
