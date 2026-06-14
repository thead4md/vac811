import { BrowserRouter, Routes, Route, Navigate, useLocation } from 'react-router-dom';
import { useEffect } from 'react';
import Navbar from './components/Navbar';
import Footer from './components/Footer';
import BackgroundField from './components/BackgroundField';
import Home from './pages/Home';
import About from './pages/About';
import History from './pages/History';
import Leaders from './pages/Leaders';
import Rajok from './pages/Rajok';
import Camps from './pages/Camps';
import Naptar from './pages/Naptar';
import Gallery from './pages/Gallery';
import Join from './pages/Join';
import Contact from './pages/Contact';
import NotFound from './pages/NotFound';
import Scouting from './pages/Scouting';
import Curate from './pages/Curate';

// Derive router basename from Vite base ('/' in dev, '/beta/' in prod build).
const basename = import.meta.env.BASE_URL.replace(/\/$/, '');

// Scroll to top on route change
function ScrollReset() {
  const { pathname } = useLocation();
  useEffect(() => {
    window.scrollTo({ top: 0, behavior: 'instant' });
  }, [pathname]);
  return null;
}

// Page title updater
const pageTitles: Record<string, string> = {
  '/': '811. Szent József Cserkészcsapat – Vác',
  '/rolunk': 'Rólunk – 811. Cserkészcsapat',
  '/tortenet': 'Történet – 811. Cserkészcsapat',
  '/vezetok': 'Vezetők – 811. Cserkészcsapat',
  '/rajok': 'Rajok – 811. Cserkészcsapat',
  '/taborok': 'Táborok – 811. Cserkészcsapat',
  '/naptar': 'Naptár – 811. Cserkészcsapat',
  '/galeria': 'Galéria – 811. Cserkészcsapat',
  '/csatlakozas': 'Csatlakozz! – 811. Cserkészcsapat',
  '/kapcsolat': 'Kapcsolat – 811. Cserkészcsapat',
};

function TitleSetter() {
  const { pathname } = useLocation();
  useEffect(() => {
    document.title = pageTitles[pathname] ?? '811. Szent József Cserkészcsapat – Vác';
  }, [pathname]);
  return null;
}

function AppLayout() {
  return (
    <>
      <BackgroundField />
      <a href="#main-content" className="skip-link">Ugrás a tartalomra</a>
      <Navbar />
      <div id="main-content">
        <ScrollReset />
        <TitleSetter />
        <Routes>
          <Route path="/" element={<Home />} />
          <Route path="/rolunk" element={<About />} />
          <Route path="/tortenet" element={<History />} />
          <Route path="/vezetok" element={<Leaders />} />
          <Route path="/rajok" element={<Rajok />} />
          <Route path="/taborok" element={<Camps />} />
          <Route path="/naptar" element={<Naptar />} />
          {/* Faithful slug kept; the beta's /hirek redirects here */}
          <Route path="/hirek" element={<Navigate to="/naptar" replace />} />
          <Route path="/galeria" element={<Gallery />} />
          <Route path="/csatlakozas" element={<Join />} />
          <Route path="/kapcsolat" element={<Contact />} />
          <Route path="/cserkeszet" element={<Scouting />} />
          <Route path="*" element={<NotFound />} />
        </Routes>
      </div>
      <Footer />
    </>
  );
}

// /admin/kuracio rendered outside the AppLayout shell (no Navbar/Footer, full-screen)
function CurateLayout() {
  return (
    <>
      <meta name="robots" content="noindex" />
      <Curate />
    </>
  );
}

export default function App() {
  return (
    <BrowserRouter basename={basename}>
      <Routes>
        <Route path="/admin/kuracio" element={<CurateLayout />} />
        <Route path="/kuracio" element={<Navigate to="/admin/kuracio" replace />} />
        <Route path="/*" element={<AppLayout />} />
      </Routes>
    </BrowserRouter>
  );
}
