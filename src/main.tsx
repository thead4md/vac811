import { ViteReactSSG } from 'vite-react-ssg';
import { routes } from './routes';
// Global styles — loaded from the entry so they're in the main bundle and
// inlined into every prerendered page's <head>.
import './styles/fonts.css';
import './styles/tokens.css';
import './styles/base.css';
import './styles/global.css';

// ViteReactSSG wires up the router for both sides of the split: it renders the
// route tree to static HTML at build time and hydrates it (hydrateRoot) in the
// browser. `createRoot` is the entry export vite-react-ssg looks for.
export const createRoot = ViteReactSSG({
  routes,
  basename: import.meta.env.BASE_URL,
});
