import { createTestDatabase } from '@tests/utils/database'
import { fakeCvssTemplate } from '@server/entities/tests/fakes'
import { CvssTemplate, CvssVersion } from '@server/entities/CvssTemplate.entity'
import { requestContext } from '@tests/utils/context'
import cvssRouter from '../index'

function analyzePerformanceForThesis(
  results: Array<{ size: number; time: number }>
) {
  if (results.length < 2) {
    return {
      valid: false,
      message: 'Insufficient data points for analysis',
    }
  }

  const stepAnalysis = results.slice(1).map((current, index) => {
    const previous = results[index]
    const sizeRatio = current.size / previous.size
    const timeRatio = current.time / previous.time
    const efficiencyRatio = timeRatio / sizeRatio

    return {
      stepNumber: index + 1,
      previousSize: previous.size,
      currentSize: current.size,
      sizeIncreaseFactor: sizeRatio,
      previousTime: previous.time.toFixed(2),
      currentTime: current.time.toFixed(2),
      timeIncreaseFactor: timeRatio.toFixed(2),
      efficiencyRatio: efficiencyRatio.toFixed(2),
    }
  })

  const firstResult = results[0]
  const lastResult = results[results.length - 1]
  const overallSizeIncrease = lastResult.size / firstResult.size
  const overallTimeIncrease = lastResult.time / firstResult.time
  const overallEfficiency = overallTimeIncrease / overallSizeIncrease

  const getComplexityCategory = (efficiency: number): string => {
    if (efficiency < 0.75) return 'Sub-linear (better than O(n))'
    if (efficiency < 1.25) return 'Linear (approximately O(n))'
    if (efficiency < 2) return 'Slightly super-linear'
    return 'Super-linear'
  }

  const getPerformanceQuality = (efficiency: number): string => {
    if (efficiency < 0.5) return 'excellent'
    if (efficiency < 1) return 'good'
    if (efficiency < 1.5) return 'acceptable'
    return 'concerning'
  }

  return {
    valid: true,
    stepAnalysis,
    overall: {
      initialSize: firstResult.size,
      finalSize: lastResult.size,
      sizeIncreaseFactor: overallSizeIncrease.toFixed(2),
      initialTime: firstResult.time.toFixed(2),
      finalTime: lastResult.time.toFixed(2),
      timeIncreaseFactor: overallTimeIncrease.toFixed(2),
      efficiencyRatio: overallEfficiency.toFixed(2),
      apparentComplexity: getComplexityCategory(overallEfficiency),
    },
    conclusion: `The getDefinitionsByVersion function demonstrates ${getPerformanceQuality(overallEfficiency)} performance characteristics, with time increasing by a factor of ${overallTimeIncrease.toFixed(2)} 
    while data size increased by a factor of ${overallSizeIncrease.toFixed(2)}, 
    yielding an efficiency ratio of ${overallEfficiency.toFixed(2)}.`,
  }
}

describe('getDefinitionsByVersion Performance', () => {
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

  it('should measure time complexity with different data sizes', async () => {
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
        return { size, time: -1 }
      }
    }

    const testSizes = [5, 10, 20, 50, 100]
    const results: Array<{ size: number; time: number }> = []

    await testSizes.reduce(async (prevPromise, size) => {
      await prevPromise
      const result = await testWithSize(size)
      if (result.time > 0) {
        results.push(result)
      }
      return new Promise((resolve) => {
        setTimeout(resolve, 100)
      })
    }, Promise.resolve())

    expect(results.length).toBeGreaterThan(1)

    // Performance analysis
    for (let i = 1; i < results.length; i += 1) {
      const prev = results[i - 1]
      const curr = results[i]

      expect(curr.time).toBeGreaterThan(0)
      expect(prev.time).toBeGreaterThan(0)

      const timeRatio = curr.time / prev.time
      const sizeRatio = curr.size / prev.size

      // eslint-disable-next-line no-console
      console.log(
        `Step ${i}: Size ${prev.size} → ${curr.size} (x${sizeRatio.toFixed(2)}), ` +
          `Time ${prev.time.toFixed(2)}ms → ${curr.time.toFixed(2)}ms (x${timeRatio.toFixed(2)})`
      )

      expect(timeRatio).toBeLessThan(sizeRatio * 3)

      if (curr.size < 50) {
        expect(timeRatio).toBeLessThanOrEqual(sizeRatio * 2.5)
      }
    }

    // Overall analysis
    const firstResult = results[0]
    const lastResult = results[results.length - 1]
    const overallTimeIncrease = lastResult.time / firstResult.time
    const overallSizeIncrease = lastResult.size / firstResult.size

    expect(overallTimeIncrease).toBeDefined()
    expect(overallSizeIncrease).toBeDefined()
    expect(overallTimeIncrease).toBeLessThan(overallSizeIncrease * 2)

    const thesisAnalysis = analyzePerformanceForThesis(results)
    // eslint-disable-next-line no-console
    console.log(
      `\nPerformance Analysis for Thesis:\n${JSON.stringify(thesisAnalysis, null, 2)}`
    )

    // eslint-disable-next-line no-console
    console.log(
      `Performance Data: 
        Time increased by factor of ${overallTimeIncrease.toFixed(2)}, 
        while size increased by factor of ${overallSizeIncrease.toFixed(2)}. 
        Ratio: ${(overallTimeIncrease / overallSizeIncrease).toFixed(2)}`
    )
  })
})
