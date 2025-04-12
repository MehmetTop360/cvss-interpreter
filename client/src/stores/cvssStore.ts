import { defineStore } from 'pinia'
import { trpc } from '@/trpc'
import type { CvssTemplateBare } from '@mono/server/src/shared/entities'
import type { CvssState } from '@/types/cvss'
import {
  metricOrderV3_1,
  metricOrderV4_0,
  defaultMetricsV3_1,
  defaultMetricsV4_0,
  metricGroupsV3_1,
  metricGroupsV4_0,
} from '@/constants/cvssConstants'

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
    activeInterpretationMetricKey: null,
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
      if (!order || order.length === 0) {
        const fallbackOrder = Object.keys(state.selectedMetrics)
        if (fallbackOrder.length === 0) return prefix
        const fallbackParts = fallbackOrder.map((key) => `${key}:${state.selectedMetrics[key]}`)
        return `${prefix}/${fallbackParts.join('/')}`
      }
      const parts = order.map((key) => {
        const value = state.selectedMetrics[key as string] ?? 'X'
        return `${key}:${value}`
      })
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
      Object.values(groups).forEach((group) => {
        group.sort((a, b) => a.value_key.localeCompare(b.value_key))
      })
      return groups
    },
    activeInterpretationDefinition(state): CvssTemplateBare | undefined {
      const activeKey = state.activeInterpretationMetricKey
      const selectedValue = activeKey ? state.selectedMetrics[activeKey] : null
      const definitions = state.definitions[state.selectedVersion]
      if (!activeKey || !selectedValue || !definitions) {
        return undefined
      }
      return definitions.find(
        (def) => def.metric_key === activeKey && def.value_key === selectedValue
      )
    },
  },

  actions: {
    setVersion(version: '3.1' | '4.0') {
      if (this.selectedVersion !== version) {
        this.selectedVersion = version
        this.selectedMetrics =
          version === '4.0' ? { ...defaultMetricsV4_0 } : { ...defaultMetricsV3_1 }
        this.activeInterpretationMetricKey = null
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
          this.activeInterpretationMetricKey = metricKey
          console.log(`Set ${metricKey} to ${valueKey}. New string: ${this.cvssString}`)
        } else {
          this.activeInterpretationMetricKey = metricKey
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
        this.activeInterpretationMetricKey = null
        console.log('Metrics updated from bulk set. New string:', this.cvssString)
      }
    },
    setActiveInterpretationMetricKey(key: string | null) {
      this.activeInterpretationMetricKey = key
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
