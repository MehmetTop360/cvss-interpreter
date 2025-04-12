<script lang="ts" setup>
import { computed } from 'vue'
import { storeToRefs } from 'pinia'
import { useCvssStore } from '@/stores/cvssStore'
import type { CvssTemplateBare } from '@mono/server/src/shared/entities'

const cvssStore = useCvssStore()

const {
  selectedMetrics,
  currentDefinitions,
  selectedVersion,
  metricOrder,
  preferredDescriptionKey,
} = storeToRefs(cvssStore)

const orderedMetricKeys = computed(() => {
  return metricOrder.value?.[selectedVersion.value] || []
})

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
      <div
        v-for="metricKey in orderedMetricKeys"
        :key="metricKey"
        class="metric-interpretation border-b border-gray-200 pb-3 last:border-b-0"
      >
        <h4
          class="mb-1 text-sm font-semibold text-gray-800 underline decoration-blue-300 decoration-2 underline-offset-2"
        >
          {{ getSelectedDefinition(metricKey)?.metric_name ?? metricKey }}
        </h4>

        <p class="mb-1 text-sm font-medium text-blue-700">
          {{ getSelectedDefinition(metricKey)?.value_name ?? selectedMetrics[metricKey] ?? 'N/A' }}
          <span class="text-xs font-normal text-gray-500">
            ({{ selectedMetrics[metricKey] ?? 'N/A' }})
          </span>
        </p>

        <p class="text-sm leading-relaxed text-gray-700">
          {{ getDescriptionText(getSelectedDefinition(metricKey)) }}
        </p>
      </div>
    </div>
  </div>
</template>

<style scoped></style>
