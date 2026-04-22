import { HashRouter, Routes, Route, useLocation } from 'react-router-dom';
import { useEffect } from 'react';
import Navbar from './components/Navbar';
import Footer from './components/Footer';
import Home from './pages/Home';
import About from './pages/About';
import History from './pages/History';
import Leaders from './pages/Leaders';
import Rajok from './pages/Rajok';
import Camps from './pages/Camps';
import News from './pages/News';
import Gallery from './pages/Gallery';
import Join from './pages/Join';
import Contact from './pages/Contact';
import NotFound from './pages/NotFound';

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
  '/hirek': 'Hírek & Események – 811. Cserkészcsapat',
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
          <Route path="/hirek" element={<News />} />
          <Route path="/galeria" element={<Gallery />} />
          <Route path="/csatlakozas" element={<Join />} />
          <Route path="/kapcsolat" element={<Contact />} />
          <Route path="*" element={<NotFound />} />
        </Routes>
      </div>
      <Footer />
    </>
  );
}

export default function App() {
  return (
    <HashRouter>
      <AppLayout />
    </HashRouter>
  );
}
