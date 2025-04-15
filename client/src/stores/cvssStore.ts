import { defineStore } from 'pinia'
import { trpc } from '@/trpc'
import type { CvssTemplateBare } from '@mono/server/src/shared/entities'
import type { CvssState as CvssStateType, CvssVersion } from '@/types/cvss'
import {
  metricOrderV3_1,
  metricOrderV4_0,
  defaultMetricsV3_1,
  defaultMetricsV4_0,
  metricGroupsV3_1,
  metricGroupsV4_0,
} from '@/constants/cvssConstants'

const valueOrderMaps: Record<string, string[]> = {
  AV: ['N', 'A', 'L', 'P'],
  AC: ['L', 'H'],
  AT: ['N', 'P'],
  PR: ['N', 'L', 'H'],
  UI_v4: ['N', 'P', 'A'],
  UI_v3: ['N', 'R'],
  S: ['U', 'C'],
  VC: ['N', 'L', 'H'],
  VI: ['N', 'L', 'H'],
  VA: ['N', 'L', 'H'],
  SC: ['N', 'L', 'H'],
  SI: ['N', 'L', 'H'],
  SA: ['N', 'L', 'H'],
  C: ['N', 'L', 'H'],
  I: ['N', 'L', 'H'],
  A: ['N', 'L', 'H'],
  E_v4: ['X', 'U', 'P', 'A'],
  E_v3: ['X', 'U', 'P', 'F', 'H'],
  RL: ['X', 'O', 'T', 'W', 'U'],
  RC: ['X', 'C', 'R', 'U'],
  CR: ['X', 'L', 'M', 'H'],
  IR: ['X', 'L', 'M', 'H'],
  AR: ['X', 'L', 'M', 'H'],
  MAV: ['X', 'N', 'A', 'L', 'P'],
  MAC: ['X', 'L', 'H'],
  MAT: ['X', 'N', 'P'],
  MPR: ['X', 'N', 'L', 'H'],
  MUI_v4: ['X', 'N', 'P', 'A'],
  MUI_v3: ['X', 'N', 'R'],
  MS: ['X', 'U', 'C'],
  MVC: ['X', 'N', 'L', 'H'],
  MVI: ['X', 'N', 'L', 'H'],
  MVA: ['X', 'N', 'L', 'H'],
  MSC: ['X', 'N', 'L', 'H'],
  MSI: ['X', 'N', 'L', 'H', 'S'],
  MSA: ['X', 'N', 'L', 'H', 'S'],
  MC: ['X', 'N', 'L', 'H'],
  MI: ['X', 'N', 'L', 'H'],
  MA: ['X', 'N', 'L', 'H'],
  S_sup: ['X', 'N', 'P'],
  AU: ['X', 'N', 'Y'],
  R: ['X', 'A', 'U', 'I'],
  V: ['X', 'D', 'C'],
  RE: ['X', 'L', 'M', 'H'],
  U: ['X', 'Clear', 'Green', 'Amber', 'Red'],
}

const parentChildMapV4_0: Record<string, string[]> = {
  'Base Metrics': [
    'Exploitability Metrics',
    'Vulnerable System Impact Metrics',
    'Subsequent System Impact Metrics',
  ],
  'Environmental (Modified Base Metrics)': [
    'Modified Exploitability Metrics',
    'Modified Vulnerable System Impact Metrics',
    'Modified Subsequent System Impact Metrics',
  ],
  'Supplemental Metrics': [],
  'Environmental (Security Requirements)': [],
  'Threat Metrics': [],
}

const orderedParentGroupsV4_0 = [
  'Base Metrics',
  'Supplemental Metrics',
  'Environmental (Modified Base Metrics)',
  'Environmental (Security Requirements)',
  'Threat Metrics',
]

const orderedParentGroupsV3_1 = ['Base Score', 'Temporal Score', 'Environmental Score']

export interface StructuredMetricGroup {
  name: string
  metrics?: string[]
  children?: StructuredMetricGroup[]
}

interface CvssState extends Omit<CvssStateType, 'activeInterpretationMetricKey'> {}

export const useCvssStore = defineStore('cvss', {
  state: (): CvssState => ({
    selectedVersion: '4.0',
    selectedDescriptionType: 'simplified',
    definitions: { '3.1': null, '4.0': null },
    isLoadingDefinitions: false,
    errorLoadingDefinitions: null,
    selectedMetrics: { ...defaultMetricsV4_0 },
    metricOrder: { '3.1': metricOrderV3_1, '4.0': metricOrderV4_0 },
    metricGroups: { '3.1': metricGroupsV3_1, '4.0': metricGroupsV4_0 },
  }),

  getters: {
    currentDefinitions(state): CvssTemplateBare[] | null {
      return state.definitions[state.selectedVersion]
    },
    preferredDescriptionKey(
      state
    ): keyof Pick<CvssTemplateBare, 'simplified_description' | 'official_description'> {
      return state.selectedDescriptionType === 'simplified'
        ? 'simplified_description'
        : 'official_description'
    },
    cvssString(state): string {
      const prefix = `CVSS:${state.selectedVersion}`
      const order = state.metricOrder[state.selectedVersion]
      const defaults = state.selectedVersion === '4.0' ? defaultMetricsV4_0 : defaultMetricsV3_1
      const groups = state.metricGroups[state.selectedVersion]

      if (!order || order.length === 0 || !groups) {
        const fallbackOrder = Object.keys(state.selectedMetrics)
        if (fallbackOrder.length === 0) return prefix
        const fallbackParts = fallbackOrder.map(
          (key) => `${key}:${state.selectedMetrics[key] ?? 'X'}`
        )
        return `${prefix}/${fallbackParts.join('/')}`
      }

      let baseMetricKeys: string[] = []
      if (state.selectedVersion === '4.0') {
        baseMetricKeys = [
          ...(groups['Exploitability Metrics'] || []),
          ...(groups['Vulnerable System Impact Metrics'] || []),
          ...(groups['Subsequent System Impact Metrics'] || []),
        ]
      } else {
        baseMetricKeys = groups['Base Score'] || []
      }
      const parts = order
        .map((key) => {
          const currentValue = state.selectedMetrics[key]
          const defaultValue = defaults[key] ?? 'X'

          const includeMetric =
            baseMetricKeys.includes(key) ||
            (currentValue !== undefined && currentValue !== defaultValue)

          if (includeMetric) {
            return `${key}:${currentValue ?? 'X'}`
          } else {
            return null
          }
        })
        .filter((part): part is string => part !== null)

      return parts.length > 0 ? `${prefix}/${parts.join('/')}` : prefix
    },
    defaultCvssString(state): string {
      const version = state.selectedVersion
      const prefix = `CVSS:${version}`
      const defaults = version === '4.0' ? defaultMetricsV4_0 : defaultMetricsV3_1
      const order = state.metricOrder[version]
      const groups = state.metricGroups[version]

      if (!order || !groups) return prefix

      let baseMetricKeys: string[] = []
      if (version === '4.0') {
        baseMetricKeys = [
          ...(groups['Exploitability Metrics'] || []),
          ...(groups['Vulnerable System Impact Metrics'] || []),
          ...(groups['Subsequent System Impact Metrics'] || []),
        ]
      } else {
        baseMetricKeys = groups['Base Score'] || []
      }

      const parts = baseMetricKeys
        .filter((key) => order.includes(key))
        .sort((a, b) => order.indexOf(a) - order.indexOf(b))
        .map((key) => `${key}:${defaults[key] ?? 'X'}`)

      return `${prefix}/${parts.join('/')}`
    },
    groupedDefinitions(state): Record<string, CvssTemplateBare[]> {
      const defs = state.definitions[state.selectedVersion]
      if (!defs) return {}
      const groups: Record<string, CvssTemplateBare[]> = {}
      for (const def of defs) {
        const key = def.metric_key
        if (!groups[key]) {
          groups[key] = []
        }
        if (!groups[key].some((d) => d.value_key === def.value_key)) {
          groups[key].push(def)
        }
      }
      Object.entries(groups).forEach(([metricKey, groupValues]) => {
        let sortKey = metricKey
        if (metricKey === 'UI') sortKey = state.selectedVersion === '3.1' ? 'UI_v3' : 'UI_v4'
        if (metricKey === 'E') sortKey = state.selectedVersion === '3.1' ? 'E_v3' : 'E_v4'
        if (metricKey === 'MUI') sortKey = state.selectedVersion === '3.1' ? 'MUI_v3' : 'MUI_v4'
        if (metricKey === 'S' && state.selectedVersion === '4.0') sortKey = 'S_sup'
        if (metricKey === 'MSI' && state.selectedVersion === '4.0') sortKey = 'MSI'
        if (metricKey === 'MSA' && state.selectedVersion === '4.0') sortKey = 'MSA'

        const orderMap = valueOrderMaps[sortKey]
        if (orderMap) {
          groupValues.sort((a, b) => {
            const indexA = orderMap.indexOf(a.value_key)
            const indexB = orderMap.indexOf(b.value_key)
            if (indexA === -1) return 1
            if (indexB === -1) return -1
            return indexA - indexB
          })
        } else {
          groupValues.sort((a, b) => a.value_key.localeCompare(b.value_key))
        }
      })
      return groups
    },
    structuredMetricGroups(state): StructuredMetricGroup[] {
      const version = state.selectedVersion
      const allGroups = state.metricGroups[version]
      if (!allGroups) return []

      const structuredResult: StructuredMetricGroup[] = []

      if (version === '4.0') {
        const availableGroupKeys = Object.keys(allGroups)
        orderedParentGroupsV4_0.forEach((parentName) => {
          const parentGroup: StructuredMetricGroup = { name: parentName }
          const childNames = parentChildMapV4_0[parentName]

          if (childNames && childNames.length > 0) {
            parentGroup.children = []
            childNames.forEach((childName) => {
              if (availableGroupKeys.includes(childName) && allGroups[childName]?.length > 0) {
                parentGroup.children?.push({
                  name: childName,
                  metrics: allGroups[childName],
                })
              }
            })

            if (parentGroup.children.length > 0) {
              structuredResult.push(parentGroup)
            }
          } else {
            if (availableGroupKeys.includes(parentName) && allGroups[parentName]?.length > 0) {
              parentGroup.metrics = allGroups[parentName]
              structuredResult.push(parentGroup)
            }
          }
        })
      } else {
        orderedParentGroupsV3_1.forEach((groupName) => {
          if (allGroups[groupName] && allGroups[groupName].length > 0) {
            structuredResult.push({
              name: groupName,
              metrics: allGroups[groupName],
            })
          }
        })
      }

      return structuredResult
    },
  },

  actions: {
    setVersion(version: CvssVersion) {
      if (this.selectedVersion !== version) {
        console.log(`Switching version to ${version}`)
        this.selectedVersion = version

        this.selectedMetrics =
          version === '4.0' ? { ...defaultMetricsV4_0 } : { ...defaultMetricsV3_1 }

        if (!this.definitions[version]) {
          this.fetchDefinitions()
        } else {
          this._initializeMetricsForCurrentVersion()
        }
      }
    },

    setDescriptionType(type: 'simplified' | 'official') {
      this.selectedDescriptionType = type
    },

    setMetricValue(metricKey: string, valueKey: string) {
      const currentOrder = this.metricOrder[this.selectedVersion]
      if (currentOrder?.includes(metricKey)) {
        if (this.selectedMetrics[metricKey] !== valueKey) {
          this.selectedMetrics[metricKey] = valueKey
        }
      } else {
        console.warn(
          `Attempted to set metric ${metricKey} which is not valid for version ${this.selectedVersion}`
        )
      }
    },

    setSelectedMetrics(metrics: Record<string, string>) {
      const currentOrder = this.metricOrder[this.selectedVersion]
      if (!currentOrder) return

      const newSelectedMetrics = { ...this.selectedMetrics }
      const defaults = this.selectedVersion === '4.0' ? defaultMetricsV4_0 : defaultMetricsV3_1
      let changed = false

      currentOrder.forEach((key) => {
        if (Object.prototype.hasOwnProperty.call(metrics, key)) {
          if (newSelectedMetrics[key] !== metrics[key]) {
            newSelectedMetrics[key] = metrics[key]
            changed = true
          }
        } else {
          const defaultValue = defaults[key] ?? 'X'
          if (newSelectedMetrics[key] !== defaultValue) {
            newSelectedMetrics[key] = defaultValue
            changed = true
          }
        }
      })

      Object.keys(defaults).forEach((key) => {
        if (!Object.prototype.hasOwnProperty.call(newSelectedMetrics, key)) {
          newSelectedMetrics[key] = defaults[key] ?? 'X'
          changed = true
        }
      })

      if (changed) {
        this.selectedMetrics = newSelectedMetrics
      }
    },

    resetCurrentMetrics() {
      const currentDefaults =
        this.selectedVersion === '4.0' ? { ...defaultMetricsV4_0 } : { ...defaultMetricsV3_1 }
      this.selectedMetrics = currentDefaults
    },

    _initializeMetricsForCurrentVersion() {
      const currentDefaults =
        this.selectedVersion === '4.0' ? defaultMetricsV4_0 : defaultMetricsV3_1
      const currentOrder = this.metricOrder[this.selectedVersion] || []
      const newSelectedMetrics: Record<string, string> = {}
      let changed = false

      currentOrder.forEach((key) => {
        const existingValue = this.selectedMetrics[key]
        const defaultValue = currentDefaults[key] ?? 'X'

        newSelectedMetrics[key] = existingValue !== undefined ? existingValue : defaultValue
      })

      const currentKeys = Object.keys(this.selectedMetrics).sort()
      const newKeys = Object.keys(newSelectedMetrics).sort()

      if (
        JSON.stringify(currentKeys) !== JSON.stringify(newKeys) ||
        JSON.stringify(this.selectedMetrics) !== JSON.stringify(newSelectedMetrics)
      ) {
        changed = true
      }

      if (changed) {
        this.selectedMetrics = newSelectedMetrics
      }
    },

    async fetchDefinitions() {
      const versionToFetch = this.selectedVersion

      if (this.definitions[versionToFetch] || this.isLoadingDefinitions) {
        if (this.definitions[versionToFetch]) this._initializeMetricsForCurrentVersion()
        return
      }

      this.isLoadingDefinitions = true
      this.errorLoadingDefinitions = null
      console.log(`Fetching CVSS v${versionToFetch} definitions...`)
      try {
        const result = await trpc.CvssTemplate.getDefinitionsByVersion.query({
          version: versionToFetch as any,
        })
        this.definitions[versionToFetch] = result
        console.log(`Successfully fetched ${result.length} definitions for v${versionToFetch}.`)
        this._initializeMetricsForCurrentVersion()
      } catch (error: any) {
        console.error(`Error fetching CVSS v${versionToFetch} definitions:`, error)
        this.errorLoadingDefinitions =
          (error instanceof Error ? error.message : String(error)) || 'Failed to load definitions.'
        this.definitions[versionToFetch] = null
      } finally {
        this.isLoadingDefinitions = false
      }
    },
  },
})
