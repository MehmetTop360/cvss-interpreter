import {
  CvssVersion,
  type CvssTemplate,
} from '@server/entities/CvssTemplate.entity'
import { random } from '@tests/utils/random'

const randomId = () => random.integer({ min: 1, max: 2147483647 })

export const fakeCvssTemplate = <T extends Partial<CvssTemplate>>(
  overrides: T = {} as T
) =>
  ({
    id: randomId(),
    version: CvssVersion.V3_1,
    metric_key: 'AV',
    value_key: 'N',
    metric_name: 'Attack Vector',
    value_name: 'Network',
    official_description: 'Official description text...',
    simplified_description: 'Simplified description text...',
    ...overrides,
  }) as CvssTemplate
