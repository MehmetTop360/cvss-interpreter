<script lang="ts" setup>
import { computed, ref } from 'vue'
import { storeToRefs } from 'pinia'
import { useCvssStore } from '@/stores/cvssStore'
import type { CvssTemplateBare } from '@mono/server/src/shared/entities'
import { defaultMetricsV3_1, defaultMetricsV4_0 } from '@/constants/cvssConstants'

const cvssStore = useCvssStore()

const {
  selectedMetrics,
  currentDefinitions,
  selectedVersion,
  metricOrder,
  preferredDescriptionKey,
  metricGroups,
} = storeToRefs(cvssStore)

const currentDefaults = computed(() => {
  return selectedVersion.value === '4.0' ? defaultMetricsV4_0 : defaultMetricsV3_1
})

const baseMetricKeys = computed(() => {
  const groups = metricGroups.value[selectedVersion.value]
  if (!groups) return []

  if (selectedVersion.value === '4.0') {
    return [
      ...(groups['Exploitability Metrics'] || []),
      ...(groups['Vulnerable System Impact Metrics'] || []),
      ...(groups['Subsequent System Impact Metrics'] || []),
    ]
  } else {
    return groups['Base Score'] || []
  }
})

const orderedMetricKeys = computed(() => {
  return metricOrder.value?.[selectedVersion.value] || []
})

function shouldDisplayMetric(metricKey: string): boolean {
  const currentValue = selectedMetrics.value?.[metricKey]
  const defaultValue = currentDefaults.value?.[metricKey] ?? 'X'
  const isBase = baseMetricKeys.value.includes(metricKey)
  return isBase || (currentValue !== undefined && currentValue !== defaultValue)
}

function getSelectedDefinition(metricKey: string): CvssTemplateBare | undefined {
  const selectedValueKey = selectedMetrics.value?.[metricKey]
  if (!selectedValueKey || !currentDefinitions.value) {
    return undefined
  }
  return currentDefinitions.value.find(
    (def) => def.metric_key === metricKey && def.value_key === selectedValueKey
  )
}

function getDescriptionText(definition: CvssTemplateBare | undefined): string {
  if (!definition) return 'Definition details not found.'
  const preferredKey = preferredDescriptionKey.value
  return definition[preferredKey] || definition.official_description || 'No description available.'
}

function getMetricNameFallback(metricKey: string): string {
  const anyDefForKey = currentDefinitions.value?.find((def) => def.metric_key === metricKey)
  return anyDefForKey?.metric_name || metricKey
}
</script>

<template>
  <div class="interpretation-container space-y-4">
    <div v-if="!currentDefinitions" class="p-4 text-center text-sm text-gray-500">
      Loading definitions or select a version...
    </div>
    <div v-else-if="orderedMetricKeys.length === 0" class="p-4 text-center text-sm text-gray-500">
      No metrics defined for this version.
    </div>
    <div v-else>
      <div v-for="metricKey in orderedMetricKeys" :key="metricKey">
        <template v-if="shouldDisplayMetric(metricKey)">
          <div
            class="metric-interpretation mb-3 border-b border-gray-200 pb-3 last:mb-0 last:border-b-0 last:pb-0"
          >
            <div>
              <div v-if="true" style="display: none">
                {{ getSelectedDefinition(metricKey) }}
              </div>

              <h4
                class="mb-1 text-sm font-semibold text-gray-800 underline decoration-blue-300 decoration-2 underline-offset-2"
              >
                {{
                  getSelectedDefinition(metricKey)?.metric_name ?? getMetricNameFallback(metricKey)
                }}
              </h4>

              <p class="mb-1 text-sm font-medium text-blue-700">
                {{
                  getSelectedDefinition(metricKey)?.value_name ??
                  selectedMetrics[metricKey] ??
                  'N/A'
                }}
                <span class="text-xs font-normal text-gray-500">
                  ({{ selectedMetrics[metricKey] ?? 'N/A' }})
                </span>
              </p>

              <p class="text-sm leading-relaxed text-gray-700">
                {{ getDescriptionText(getSelectedDefinition(metricKey)) }}
              </p>
            </div>
          </div>
        </template>
      </div>
    </div>
    <div
      v-if="currentDefinitions && orderedMetricKeys.every((key) => !shouldDisplayMetric(key))"
      class="p-4 text-center text-sm text-gray-500"
    >
      Only default metric values are selected. Change a metric value to see its interpretation.
    </div>
  </div>
</template>

<style scoped></style>
