import { router } from '../trpc'
import CvssTemplate from './CvssTemplate'

export const appRouter = router({
  CvssTemplate,
})

export type AppRouter = typeof appRouter
