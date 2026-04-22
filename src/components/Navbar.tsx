import { useState, useEffect, useRef } from 'react';
import { Link, useLocation } from 'react-router-dom';
import './Navbar.css';

const navItems = [
  { label: 'Kezdőlap', path: '/' },
  {
    label: 'Rólunk',
    path: '/rolunk',
    children: [
      { label: 'Történet', path: '/tortenet' },
      { label: 'Vezetők', path: '/vezetok' },
      { label: 'Rajok', path: '/rajok' },
    ],
  },
  { label: 'Táborok', path: '/taborok' },
  { label: 'Hírek', path: '/hirek' },
  { label: 'Galéria', path: '/galeria' },
  { label: 'Kapcsolat', path: '/kapcsolat' },
];

export default function Navbar() {
  const [scrolled, setScrolled] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);
  const [theme, setTheme] = useState<'light' | 'dark'>('light');
  const [openDropdown, setOpenDropdown] = useState<string | null>(null);
  const location = useLocation();
  const navRef = useRef<HTMLElement>(null);

  useEffect(() => {
    const mq = window.matchMedia('(prefers-color-scheme: dark)');
    const initial = mq.matches ? 'dark' : 'light';
    setTheme(initial);
    document.documentElement.setAttribute('data-theme', initial);
  }, []);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 20);
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  useEffect(() => {
    setMenuOpen(false);
    setOpenDropdown(null);
  }, [location]);

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
    document.documentElement.setAttribute('data-theme', next);
  };

  const isActive = (path: string) => {
    if (path === '/') return location.pathname === '/';
    return location.pathname.startsWith(path);
  };

  return (
    <header className={`navbar${scrolled ? ' navbar--scrolled' : ''}`} ref={navRef}>
      <div className="navbar__inner container">
        {/* Logo */}
        <Link to="/" className="navbar__logo" aria-label="811. cserkészcsapat – Főoldal">
          <svg width="40" height="40" viewBox="0 0 40 40" fill="none" aria-hidden="true">
            <circle cx="20" cy="20" r="19" stroke="currentColor" strokeWidth="2"/>
            <path d="M20 6 L24 16 L35 16 L26 23 L29 34 L20 27 L11 34 L14 23 L5 16 L16 16 Z"
              fill="currentColor" opacity="0.15"/>
            <path d="M20 8 L23.5 17 L33 17 L25.5 22.5 L28 32 L20 26.5 L12 32 L14.5 22.5 L7 17 L16.5 17 Z"
              stroke="currentColor" strokeWidth="1.5" fill="none"/>
            <circle cx="20" cy="20" r="3" fill="currentColor"/>
          </svg>
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

          <Link to="/csatlakozas" className="btn btn--primary navbar__cta">
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
                <Link to={item.path} className={`navbar__mobile-link${isActive(item.path) ? ' active' : ''}`}>
                  {item.label}
                </Link>
                {item.children && (
                  <ul className="navbar__mobile-sub" role="list">
                    {item.children.map((child) => (
                      <li key={child.path}>
                        <Link to={child.path} className="navbar__mobile-sublink">
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
