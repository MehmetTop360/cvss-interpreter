<script lang="ts" setup>
import { computed, watch } from 'vue'
import { storeToRefs } from 'pinia'
import { useCvssStore } from '@/stores/cvssStore'
import MetricGroup from '@/components/MetricGroup.vue'

const cvssStore = useCvssStore()

const { selectedMetrics, groupedDefinitions, selectedVersion, metricGroups, currentDefinitions } =
  storeToRefs(cvssStore)

const { setMetricValue } = cvssStore

const currentMetricGroups = computed(() => {
  return metricGroups.value[selectedVersion.value] || {}
})

const orderedGroupNames = computed(() => {
  const v4Order = [
    'Base Metrics - Exploitability',
    'Base Metrics - Vulnerable System Impact',
    'Base Metrics - Subsequent System Impact',
    'Threat Metrics',
    'Supplemental Metrics',
    'Environmental Metrics - Security Requirements',
    'Environmental Metrics - Modified Base',
  ]
  const v3Order = [
    'Base Metrics - Exploitability',
    'Base Metrics - Impact',
    'Temporal Metrics',
    'Environmental Metrics - Security Requirements',
    'Environmental Metrics - Modified Base',
  ]

  const preferredOrder = selectedVersion.value === '4.0' ? v4Order : v3Order
  const availableGroupKeys = Object.keys(currentMetricGroups.value)

  return preferredOrder.filter(
    (groupName) =>
      availableGroupKeys.includes(groupName) && currentMetricGroups.value[groupName]?.length > 0
  )
})

watch(
  selectedMetrics,
  (newMetrics) => {
    console.log('Watcher: selectedMetrics changed', newMetrics)
  },
  { deep: true }
)

watch(currentDefinitions, (newDefs) => {
  console.log('Watcher: currentDefinitions changed', newDefs ? `${newDefs.length} items` : 'null')
})

function getMetricName(metricKey: string): string {
  const group = groupedDefinitions.value[metricKey]
  return group?.[0]?.metric_name || metricKey
}

function getMetricValues(metricKey: string): any[] {
  return groupedDefinitions.value?.[metricKey] || []
}

function handleMetricUpdate(metricKey: string, valueKey: string) {
  setMetricValue(metricKey, valueKey)
}
</script>

<template>
  <div class="calculator-container rounded border border-gray-200 bg-gray-50 p-4">
    <div v-if="!currentDefinitions" class="py-4 text-center text-gray-500">
      Loading metric definitions...
    </div>
    <div v-else-if="orderedGroupNames.length === 0" class="py-4 text-center text-gray-500">
      No metric groups defined or available for this version.
    </div>
    <div v-else>
      <div v-for="groupName in orderedGroupNames" :key="groupName" class="mb-4 last:mb-0">
        <h3 class="text-md mb-2 border-b border-gray-300 pb-1 font-semibold text-gray-800">
          {{ groupName }}
        </h3>
        <template v-if="currentMetricGroups[groupName]">
          <MetricGroup
            v-for="metricKey in currentMetricGroups[groupName]"
            :key="metricKey"
            :metric-key="metricKey"
            :metric-name="getMetricName(metricKey)"
            :values="getMetricValues(metricKey)"
            :selected-value="selectedMetrics[metricKey]"
            @update:metric-value="handleMetricUpdate"
          />
        </template>
        <p v-else class="text-xs text-red-500">
          Error: Metric keys not found for group '{{ groupName }}'
        </p>
      </div>
    </div>
  </div>
</template>

<style scoped></style>
