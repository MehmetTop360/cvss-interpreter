import { z } from 'zod'
import { publicProcedure } from '@server/trpc'
import {
  CvssTemplate,
  CvssTemplateBare,
  CvssVersion,
} from '@server/entities/CvssTemplate.entity'

const inputSchema = z.object({
  version: z.nativeEnum(CvssVersion),
})

const getDefinitionsByVersion = publicProcedure
  .input(inputSchema)
  .query(async ({ input, ctx }) => {
    const { version } = input
    const { db } = ctx

    const definitions = (await db.getRepository(CvssTemplate).find({
      where: {
        version,
      },
    })) as CvssTemplateBare[]

    return definitions
  })

export default getDefinitionsByVersion
