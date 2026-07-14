import { lazy, Suspense } from 'react';
import { createRoute } from '@tanstack/react-router';
import { TrainingSkeleton } from '../components/Skeletons';
import { careerLayoutRoute } from './career-layout';

const TrainingView = lazy(() => import('../components/TrainingView').then((m) => ({ default: m.TrainingView })));

export const trainingRoute = createRoute({
  getParentRoute: () => careerLayoutRoute,
  path: '/training',
  component: () => (
    <Suspense fallback={<TrainingSkeleton />}>
      <TrainingView />
    </Suspense>
  ),
});
