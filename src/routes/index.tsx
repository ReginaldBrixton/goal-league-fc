import { lazy, Suspense } from 'react';
import { createRoute } from '@tanstack/react-router';
import { MenuSkeleton } from '../components/Skeletons';
import { rootRoute } from './root';

const MainMenu = lazy(() => import('../components/MainMenu').then((module) => ({ default: module.MainMenu })));

export const indexRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: '/',
  component: () => (
    <Suspense fallback={<MenuSkeleton />}>
      <MainMenu />
    </Suspense>
  ),
});
