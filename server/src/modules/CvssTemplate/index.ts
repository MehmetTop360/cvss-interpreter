import { router } from '@server/trpc'
import getDefinitionsByVersion from './getDefinitionsByVersion'

const cvssRouter = router({
  getDefinitionsByVersion,
})

export default cvssRouter
