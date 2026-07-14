import { createRouter } from '@tanstack/react-router';
import './styles/global.css';
import './styles/skeletons.css';
import { routeTree } from './routeTree';

export const router = createRouter({
  routeTree,
  defaultPreload: 'intent',
  defaultPreloadStaleTime: 30_000,
});

declare module '@tanstack/react-router' {
  interface Register {
    router: typeof router;
  }
}
