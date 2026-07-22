import { ViteReactSSG } from 'vite-react-ssg';
import './styles/fonts.css';
import './styles/tokens.css';
import './styles/base.css';
import './styles/global.css';
import { routes } from './App';

// vite-react-ssg owns root creation: it renders `routes` to static HTML at
// build time and hydrates the same tree on the client. The exported
// `createRoot` is the contract its build/runtime consumes — do not call it
// here (unlike the old manual createRoot(...).render()).
export const createRoot = ViteReactSSG({
  routes,
  basename: import.meta.env.BASE_URL,
});
