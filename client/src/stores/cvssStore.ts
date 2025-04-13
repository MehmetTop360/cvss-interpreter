import { defineStore } from 'pinia'
import { trpc } from '@/trpc'
import type { CvssTemplateBare } from '@mono/server/src/shared/entities'
import type { CvssState as CvssStateType } from '@/types/cvss'
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

      let baseMetrics: string[] = []
      const groups = state.metricGroups[state.selectedVersion]

      if (state.selectedVersion === '4.0' && groups) {
        baseMetrics = [
          ...(groups['Exploitability Metrics'] || []),
          ...(groups['Vulnerable System Impact Metrics'] || []),
          ...(groups['Subsequent System Impact Metrics'] || []),
        ]
      } else if (state.selectedVersion === '3.1' && groups) {
        baseMetrics = groups['Base Score'] || []
      }

      if (!order || order.length === 0) {
        const fallbackOrder = Object.keys(state.selectedMetrics)
        if (fallbackOrder.length === 0) return prefix
        const fallbackParts = fallbackOrder.map((key) => `${key}:${state.selectedMetrics[key]}`)
        return `${prefix}/${fallbackParts.join('/')}`
      }

      const parts = order
        .map((key) => {
          const currentValue = state.selectedMetrics[key]
          const defaultValue = defaults[key] ?? 'X'

          const isBase = baseMetrics.includes(key)
          const includeMetric =
            isBase || (currentValue !== undefined && currentValue !== defaultValue)

          if (includeMetric) {
            return `${key}:${currentValue ?? 'X'}`
          } else {
            return null
          }
        })
        .filter((part) => part !== null)

      return parts.length > 0 ? `${prefix}/${parts.join('/')}` : prefix
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
  },

  actions: {
    setVersion(version: '3.1' | '4.0') {
      if (this.selectedVersion !== version) {
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
          console.log(`Set ${metricKey} to ${valueKey}. New string: ${this.cvssString}`)
        }
      } else {
        console.warn(
          `Attempted to set metric ${metricKey} which is not in the order for version ${this.selectedVersion}`
        )
      }
    },
    setSelectedMetrics(metrics: Record<string, string>) {
      console.log('Setting multiple metrics:', metrics)
      const currentOrder = this.metricOrder[this.selectedVersion]
      if (!currentOrder) return
      const newSelectedMetrics = { ...this.selectedMetrics }
      let changed = false
      currentOrder.forEach((key) => {
        if (
          Object.prototype.hasOwnProperty.call(metrics, key) &&
          newSelectedMetrics[key] !== metrics[key]
        ) {
          newSelectedMetrics[key] = metrics[key]
          changed = true
        }
        if (!Object.prototype.hasOwnProperty.call(newSelectedMetrics, key)) {
          const defaults = this.selectedVersion === '4.0' ? defaultMetricsV4_0 : defaultMetricsV3_1
          newSelectedMetrics[key] = defaults[key] ?? 'X'
          changed = true
        }
      })
      if (changed) {
        this.selectedMetrics = newSelectedMetrics
        console.log('Metrics updated from bulk set. New string:', this.cvssString)
      }
    },
    _initializeMetricsForCurrentVersion() {
      const currentDefaults =
        this.selectedVersion === '4.0' ? defaultMetricsV4_0 : defaultMetricsV3_1
      const currentOrder = this.metricOrder[this.selectedVersion] || []
      const newSelectedMetrics: Record<string, string> = {}
      currentOrder.forEach((key) => {
        newSelectedMetrics[key] = this.selectedMetrics[key] ?? currentDefaults[key] ?? 'X'
      })
      if (
        JSON.stringify(Object.keys(this.selectedMetrics).sort()) !==
        JSON.stringify(Object.keys(newSelectedMetrics).sort())
      ) {
        this.selectedMetrics = newSelectedMetrics
      }
    },
    async fetchDefinitions() {
      const versionToFetch = this.selectedVersion
      if (this.definitions[versionToFetch] || this.isLoadingDefinitions) {
        if (this.definitions[versionToFetch])
          console.log(`Definitions for v${versionToFetch} already loaded.`)
        return
      }
      this.isLoadingDefinitions = true
      this.errorLoadingDefinitions = null
      console.log(`Fetching CVSS v${versionToFetch} definitions...`)
      try {
        const result = await trpc.CvssTemplate.getDefinitionsByVersion.query({
          version: versionToFetch as any,
        })
        console.log(
          `Fetched Raw Definitions (v${versionToFetch}):`,
          JSON.stringify(result, null, 2)
        )
        const mavDefs = result.filter((d) => d.metric_key === 'MAV')
        console.log(
          `Fetched MAV Definitions (v${versionToFetch}):`,
          JSON.stringify(mavDefs, null, 2)
        )
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
