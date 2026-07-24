import { useEffect } from 'react';
import { Outlet, useLocation } from 'react-router-dom';
import Navbar from '../components/Navbar';
import Footer from '../components/Footer';
import BackgroundField from '../components/BackgroundField';
import ScrollProgress from '../components/ScrollProgress';
import SeoHead from '../components/SeoHead';

// Scroll to top on route change. No-op during SSG (effect doesn't run server-side).
function ScrollReset() {
  const { pathname } = useLocation();
  useEffect(() => {
    window.scrollTo({ top: 0, behavior: 'instant' });
  }, [pathname]);
  return null;
}

// The public site shell (Navbar/Footer/background chrome). Rendered as a
// react-router layout route; the matched page renders into <Outlet />. Replaces
// the old nested <Routes> inside App.tsx so vite-react-ssg can enumerate the
// route table for prerendering.
export default function AppLayout() {
  return (
    <>
      <BackgroundField />
      <ScrollProgress />
      <a href="#main-content" className="skip-link">Ugrás a tartalomra</a>
      <Navbar />
      <div id="main-content">
        <ScrollReset />
        <SeoHead />
        <Outlet />
      </div>
      <Footer />
    </>
  );
}
