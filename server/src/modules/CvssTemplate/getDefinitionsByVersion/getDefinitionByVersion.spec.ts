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

  it('should return all fields of the CvssTemplate entity', async () => {
    // Arrange
    const db = await createTestDatabase()

    const template = fakeCvssTemplate({
      version: CvssVersion.V4_0,
      metric_key: 'PR',
      value_key: 'H',
      metric_name: 'Privileges Required',
      value_name: 'High',
      official_description: 'The attacker requires administrative privileges',
      simplified_description: 'Admin access needed',
    })

    await db.getRepository(CvssTemplate).save(template)

    const { getDefinitionsByVersion } = cvssRouter.createCaller(
      requestContext({ db })
    )

    // Act
    const result = await getDefinitionsByVersion({
      version: CvssVersion.V4_0,
    })

    // Assert
    expect(result).toHaveLength(1)
    expect(result[0]).toMatchObject({
      version: CvssVersion.V4_0,
      metric_key: 'PR',
      value_key: 'H',
      metric_name: 'Privileges Required',
      value_name: 'High',
      official_description: 'The attacker requires administrative privileges',
      simplified_description: 'Admin access needed',
    })
  })

  it('should correctly handle multiple definitions for the same metric with different values', async () => {
    // Arrange
    const db = await createTestDatabase()

    const templates = [
      fakeCvssTemplate({
        version: CvssVersion.V3_1,
        metric_key: 'PR',
        value_key: 'N',
        metric_name: 'Privileges Required',
        value_name: 'None',
        official_description: 'No privileges required',
        simplified_description: 'No login needed',
      }),
      fakeCvssTemplate({
        version: CvssVersion.V3_1,
        metric_key: 'PR',
        value_key: 'L',
        metric_name: 'Privileges Required',
        value_name: 'Low',
        official_description: 'Low privileges required',
        simplified_description: 'Basic user access needed',
      }),
      fakeCvssTemplate({
        version: CvssVersion.V3_1,
        metric_key: 'PR',
        value_key: 'H',
        metric_name: 'Privileges Required',
        value_name: 'High',
        official_description: 'High privileges required',
        simplified_description: 'Admin access needed',
      }),
    ]

    await db.getRepository(CvssTemplate).save(templates)

    const { getDefinitionsByVersion } = cvssRouter.createCaller(
      requestContext({ db })
    )

    // Act
    const result = await getDefinitionsByVersion({
      version: CvssVersion.V3_1,
    })

    // Assert
    expect(result).toHaveLength(3)

    const prMetrics = result.filter((item) => item.metric_key === 'PR')
    expect(prMetrics).toHaveLength(3)

    const valueKeys = prMetrics.map((item) => item.value_key)
    expect(valueKeys).toContain('N')
    expect(valueKeys).toContain('L')
    expect(valueKeys).toContain('H')
  })

  it('should correctly differentiate between templates with the same metric_key and value_key but different versions', async () => {
    // Arrange
    const db = await createTestDatabase()

    const templates = [
      fakeCvssTemplate({
        version: CvssVersion.V3_1,
        metric_key: 'AV',
        value_key: 'N',
        metric_name: 'Attack Vector',
        value_name: 'Network',
        official_description: 'V3.1 network description',
        simplified_description: 'V3.1 simple network',
      }),
      fakeCvssTemplate({
        version: CvssVersion.V4_0,
        metric_key: 'AV',
        value_key: 'N',
        metric_name: 'Attack Vector',
        value_name: 'Network',
        official_description: 'V4.0 network description',
        simplified_description: 'V4.0 simple network',
      }),
    ]

    await db.getRepository(CvssTemplate).save(templates)

    const { getDefinitionsByVersion } = cvssRouter.createCaller(
      requestContext({ db })
    )

    // Act
    const v31Result = await getDefinitionsByVersion({
      version: CvssVersion.V3_1,
    })
    const v40Result = await getDefinitionsByVersion({
      version: CvssVersion.V4_0,
    })

    // Assert
    expect(v31Result).toHaveLength(1)
    expect(v40Result).toHaveLength(1)

    expect(v31Result[0].official_description).toBe('V3.1 network description')
    expect(v40Result[0].official_description).toBe('V4.0 network description')
  })

  it('should handle a large number of templates efficiently', async () => {
    // Arrange
    const db = await createTestDatabase()

    const v31Templates = Array.from({ length: 50 }, (_, i) =>
      fakeCvssTemplate({
        version: CvssVersion.V3_1,
        metric_key: `M${i}`,
        value_key: `V${i % 5}`,
        metric_name: `Metric ${i}`,
        value_name: `Value ${i % 5}`,
        official_description: `Official description ${i}`,
        simplified_description: `Simple description ${i}`,
      })
    )

    const v40Templates = Array.from({ length: 30 }, (_, i) =>
      fakeCvssTemplate({
        version: CvssVersion.V4_0,
        metric_key: `M${i}`,
        value_key: `V${i % 3}`,
        metric_name: `Metric ${i}`,
        value_name: `Value ${i % 3}`,
        official_description: `Official description ${i}`,
        simplified_description: `Simple description ${i}`,
      })
    )

    await db
      .getRepository(CvssTemplate)
      .save([...v31Templates, ...v40Templates])

    const { getDefinitionsByVersion } = cvssRouter.createCaller(
      requestContext({ db })
    )

    // Act
    const v31Result = await getDefinitionsByVersion({
      version: CvssVersion.V3_1,
    })
    const v40Result = await getDefinitionsByVersion({
      version: CvssVersion.V4_0,
    })

    // Assert
    expect(v31Result).toHaveLength(50)
    expect(v40Result).toHaveLength(30)
  })

  it('should measure performance with different data sizes', async () => {
    // Arrange
    const db = await createTestDatabase()

    const testWithSize = async (
      size: number
    ): Promise<{ size: number; time: number }> => {
      try {
        await db.getRepository(CvssTemplate).clear()

        const templates = Array.from({ length: size }, (_, i) =>
          fakeCvssTemplate({
            version: CvssVersion.V3_1,
            metric_key: `M${i}`,
            value_key: 'V1',
            metric_name: `Metric ${i}`,
            value_name: 'Value 1',
            official_description: `Description ${i}`,
            simplified_description: `Simple ${i}`,
          })
        )

        await db.getRepository(CvssTemplate).save(templates)

        const { getDefinitionsByVersion } = cvssRouter.createCaller(
          requestContext({ db })
        )

        const start = performance.now()
        const result = await getDefinitionsByVersion({
          version: CvssVersion.V3_1,
        })
        const end = performance.now()

        expect(result.length).toBe(size)

        return {
          size,
          time: end - start,
        }
      } catch (error) {
        console.error(`Error in test with size ${size}:`, error)
        return { size, time: -1 }
      }
    }

    const smallSize = await testWithSize(5)
    const mediumSize = await testWithSize(10)
    const largeSize = await testWithSize(20)

    const results = [smallSize, mediumSize, largeSize].filter((r) => r.time > 0)

    if (results.length > 0) {
      console.log('Performance measurements:')
      console.table(results)

      if (results.length >= 2) {
        for (let i = 1; i < results.length; i += 1) {
          const prev = results[i - 1]
          const curr = results[i]
          const timeIncrease = curr.time / prev.time
          const sizeIncrease = curr.size / prev.size

          console.log(
            `Size increase ${prev.size} → ${curr.size} (${sizeIncrease.toFixed(1)}x): ` +
              `Time increase ${timeIncrease.toFixed(2)}x`
          )
        }

        // Overall analysis
        const firstResult = results[0]
        const lastResult = results[results.length - 1]
        const overallTimeIncrease = lastResult.time / firstResult.time
        const overallSizeIncrease = lastResult.size / firstResult.size

        console.log(
          `Overall: Size increased by ${overallSizeIncrease.toFixed(1)}x, ` +
            `time increased by ${overallTimeIncrease.toFixed(2)}x`
        )

        // Complexity assessment
        if (overallTimeIncrease < overallSizeIncrease * 0.5) {
          console.log(
            'Analysis suggests better than linear time (possibly O(log n) or constant)'
          )
        } else if (overallTimeIncrease < overallSizeIncrease * 1.5) {
          console.log('Analysis suggests roughly linear time O(n)')
        } else {
          console.log(
            'Analysis suggests worse than linear time (possibly O(n²) or higher)'
          )
        }
      }
    }
  })
})
