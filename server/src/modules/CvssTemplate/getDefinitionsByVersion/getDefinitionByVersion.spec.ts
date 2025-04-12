import { createTestDatabase } from '@tests/utils/database'
import { fakeCvssTemplate } from '@server/entities/tests/fakes'
import { CvssTemplate, CvssVersion } from '@server/entities/CvssTemplate.entity'
import { requestContext } from '@tests/utils/context'
import cvssRouter from '../index'

describe('getDefinitionsByVersion', () => {
  it('should return definitions for a specific CVSS version', async () => {
    // Arrange
    const db = await createTestDatabase()

    const templateV31Avn = fakeCvssTemplate({
      version: CvssVersion.V3_1,
      metric_key: 'AV',
      value_key: 'N',
      official_description: 'V3.1 AV:N Desc',
      simplified_description: 'Simplified V3.1 AV:N',
    })

    const templateV31Acl = fakeCvssTemplate({
      version: CvssVersion.V3_1,
      metric_key: 'AC',
      value_key: 'L',
      official_description: 'V3.1 AC:L Desc',
      simplified_description: 'Simplified V3.1 AC:L',
    })

    const templateV40Avn = fakeCvssTemplate({
      version: CvssVersion.V4_0,
      metric_key: 'AV',
      value_key: 'N',
      official_description: 'V4.0 AV:N Desc',
      simplified_description: 'Simplified V4.0 AV:N',
    })

    await db
      .getRepository(CvssTemplate)
      .save([templateV31Avn, templateV31Acl, templateV40Avn])

    const { getDefinitionsByVersion } = cvssRouter.createCaller(
      requestContext({ db })
    )

    // Act
    const result = await getDefinitionsByVersion({
      version: CvssVersion.V3_1,
    })

    // Assert
    expect(result).toHaveLength(2)
    expect(result).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          version: CvssVersion.V3_1,
          metric_key: 'AV',
          value_key: 'N',
        }),
        expect.objectContaining({
          version: CvssVersion.V3_1,
          metric_key: 'AC',
          value_key: 'L',
        }),
      ])
    )
  })

  it('should return an empty array if no definitions exist for the version', async () => {
    // Arrange
    const db = await createTestDatabase()
    const { getDefinitionsByVersion } = cvssRouter.createCaller(
      requestContext({ db })
    )

    // Act
    const result = await getDefinitionsByVersion({
      version: CvssVersion.V4_0,
    })

    // Assert
    expect(result).toHaveLength(0)
  })
})
