import { rootRoute } from './routes/root';
import { indexRoute } from './routes/index';
import { startCareerRoute } from './routes/start-career';
import { careerLayoutRoute } from './routes/career-layout';
import { hubRoute } from './routes/hub';
import { squadRoute } from './routes/squad';
import { transfersRoute } from './routes/transfers';
import { trainingRoute } from './routes/training';
import { tableRoute } from './routes/table';
import { confirmMatchRoute } from './routes/confirm-match';
import { gameRoute } from './routes/game';

export const routeTree = rootRoute.addChildren([
  indexRoute,
  startCareerRoute,
  confirmMatchRoute,
  gameRoute,
  careerLayoutRoute.addChildren([
    hubRoute,
    squadRoute,
    transfersRoute,
    trainingRoute,
    tableRoute,
  ]),
]);
