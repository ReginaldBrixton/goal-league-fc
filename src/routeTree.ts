import { rootRoute } from './routes/root'
import { indexRoute } from './routes/index'
import { careerLayoutRoute } from './routes/career-layout'
import { hubRoute } from './routes/hub'
import { squadRoute } from './routes/squad'
import { transfersRoute } from './routes/transfers'
import { trainingRoute } from './routes/training'
import { tableRoute } from './routes/table'

export const routeTree = rootRoute.addChildren([
  indexRoute,
  careerLayoutRoute.addChildren([
    hubRoute,
    squadRoute,
    transfersRoute,
    trainingRoute,
    tableRoute,
  ]),
])
