import { lazy, Suspense } from 'react';
import { createRoute } from '@tanstack/react-router';
import { MenuSkeleton } from '../components/Skeletons';
import { rootRoute } from './root';

const StartCareer = lazy(() => import('../components/StartCareer').then((module) => ({ default: module.StartCareer })));

export const startCareerRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: '/start-career',
  component: () => (
    <Suspense fallback={<MenuSkeleton />}>
      <StartCareer />
    </Suspense>
  ),
});
