import type { CvssTemplateBare } from '@mono/server/src/shared/entities'

export type CvssVersion = '3.1' | '4.0'
export type DescriptionType = 'simplified' | 'official'
export type SelectedMetrics = Record<string, string>
export type Theme = 'light' | 'dark'

export interface CvssState {
  selectedVersion: CvssVersion
  selectedDescriptionType: DescriptionType
  definitions: {
    '3.1': CvssTemplateBare[] | null
    '4.0': CvssTemplateBare[] | null
  }
  isLoadingDefinitions: boolean
  errorLoadingDefinitions: string | null
  selectedMetrics: SelectedMetrics
  metricOrder: {
    '3.1': string[]
    '4.0': string[]
  }
  metricGroups: {
    '3.1': Record<string, string[]>
    '4.0': Record<string, string[]>
  }

  theme: Theme
}
