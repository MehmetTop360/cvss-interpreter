<script lang="ts" setup>
import { computed, ref, watch } from 'vue'
import { storeToRefs } from 'pinia'
import { useCvssStore } from '@/stores/cvssStore'
import type { CvssTemplateBare } from '@mono/server/src/shared/entities'
import {
  defaultMetricsV3_1,
  defaultMetricsV4_0,
  metricGroupsV4_0,
  metricGroupsV3_1,
} from '@/constants/cvssConstants'

const cvssStore = useCvssStore()

const {
  selectedMetrics,
  currentDefinitions,
  selectedVersion,
  metricOrder,
  preferredDescriptionKey,
  metricGroups,
} = storeToRefs(cvssStore)

const expandedMetrics = ref<Record<string, boolean>>({})

const expandedGroups = ref<Record<string, boolean>>({})

const allExpanded = ref(true)

const currentDefaults = computed(() => {
  return selectedVersion.value === '4.0' ? defaultMetricsV4_0 : defaultMetricsV3_1
})

const organizedGroups = computed(() => {
  const version = selectedVersion.value
  const groups = version === '4.0' ? metricGroupsV4_0 : metricGroupsV3_1

  const metricToGroupMap: Record<string, string> = {}
  Object.entries(groups).forEach(([groupName, metrics]) => {
    metrics.forEach((metric) => {
      metricToGroupMap[metric] = groupName
    })
  })

  return metricToGroupMap
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

function getMetricName(metricKey: string): string {
  const definition = getSelectedDefinition(metricKey)
  return definition?.metric_name || metricKey
}

const activeMetrics = computed(() => {
  return orderedMetricKeys.value.filter((key) => shouldDisplayMetric(key))
})

const groupedActiveMetrics = computed(() => {
  const result: Record<string, string[]> = {}

  activeMetrics.value.forEach((metricKey) => {
    const group = organizedGroups.value[metricKey] || 'Other'

    if (!result[group]) {
      result[group] = []
    }

    result[group].push(metricKey)
  })

  return result
})

const orderedGroupNames = computed(() => {
  const preferredOrder =
    selectedVersion.value === '4.0'
      ? [
          'Exploitability Metrics',
          'Vulnerable System Impact Metrics',
          'Subsequent System Impact Metrics',
          'Supplemental Metrics',
          'Modified Exploitability Metrics',
          'Modified Vulnerable System Impact Metrics',
          'Modified Subsequent System Impact Metrics',
          'Environmental (Security Requirements)',
          'Threat Metrics',
        ]
      : ['Base Score', 'Temporal Score', 'Environmental Score']

  const activeGroups = Object.keys(groupedActiveMetrics.value)

  return preferredOrder.filter((group) => activeGroups.includes(group))
})

function toggleMetric(metricKey: string) {
  expandedMetrics.value[metricKey] = !expandedMetrics.value[metricKey]
}

function toggleGroup(groupName: string) {
  expandedGroups.value[groupName] = !expandedGroups.value[groupName]

  const metricsInGroup = groupedActiveMetrics.value[groupName] || []
  metricsInGroup.forEach((metricKey) => {
    expandedMetrics.value[metricKey] = expandedGroups.value[groupName]
  })
}

function toggleAllMetrics() {
  allExpanded.value = !allExpanded.value

  orderedGroupNames.value.forEach((group) => {
    expandedGroups.value[group] = allExpanded.value
  })

  activeMetrics.value.forEach((metricKey) => {
    expandedMetrics.value[metricKey] = allExpanded.value
  })
}

function initializeExpandedState() {
  orderedGroupNames.value.forEach((group) => {
    if (expandedGroups.value[group] === undefined) {
      expandedGroups.value[group] = true
    }
  })

  activeMetrics.value.forEach((metricKey) => {
    if (expandedMetrics.value[metricKey] === undefined) {
      expandedMetrics.value[metricKey] = true
    }
  })
}

watch(
  [activeMetrics, orderedGroupNames],
  () => {
    initializeExpandedState()
  },
  { deep: true }
)

initializeExpandedState()

function getValueColor(value: string) {
  if (value === 'N') return 'bg-blue-100 text-blue-700'
  if (value === 'L') return 'bg-yellow-100 text-yellow-700'
  if (value === 'H') return 'bg-red-100 text-red-700'
  if (value === 'U') return 'bg-purple-100 text-purple-700'
  if (value === 'X') return 'bg-gray-100 text-gray-700'
  if (value === 'C') return 'bg-green-100 text-green-700'
  if (value === 'T') return 'bg-orange-100 text-orange-700'
  return 'bg-gray-100 text-gray-700'
}
</script>

<template>
  <div class="interpretation-container h-full rounded-md border border-gray-200 bg-white p-4">
    <div v-if="!currentDefinitions" class="py-4 text-center text-sm text-gray-500">
      Loading definitions or select a version...
    </div>
    <div v-else-if="orderedMetricKeys.length === 0" class="py-4 text-center text-sm text-gray-500">
      No metrics defined for this version.
    </div>
    <div v-else-if="activeMetrics.length === 0" class="py-4 text-center text-sm text-gray-500">
      Only default metric values are selected. Change a metric value to see its interpretation.
    </div>
    <div v-else class="h-full space-y-1">
      <div class="mb-2 flex justify-end">
        <button
          @click="toggleAllMetrics"
          class="flex items-center text-xs font-medium text-blue-600 hover:text-blue-800"
          :title="
            allExpanded
              ? 'Collapse all interpretation sections'
              : 'Expand all interpretation sections'
          "
        >
          <span class="mr-1">{{ allExpanded ? 'Collapse All' : 'Expand All' }}</span>
          <svg
            v-if="allExpanded"
            xmlns="http://www.w3.org/2000/svg"
            fill="none"
            viewBox="0 0 24 24"
            stroke-width="1.5"
            stroke="currentColor"
            class="h-3 w-3"
          >
            <path stroke-linecap="round" stroke-linejoin="round" d="M19.5 12h-15" />
          </svg>
          <svg
            v-else
            xmlns="http://www.w3.org/2000/svg"
            fill="none"
            viewBox="0 0 24 24"
            stroke-width="1.5"
            stroke="currentColor"
            class="h-3 w-3"
          >
            <path stroke-linecap="round" stroke-linejoin="round" d="M12 4.5v15m7.5-7.5h-15" />
          </svg>
        </button>
      </div>

      <div class="interpretation-list">
        <div v-for="groupName in orderedGroupNames" :key="groupName" class="mb-4">
          <div
            @click="toggleGroup(groupName)"
            class="mb-2 flex cursor-pointer items-center justify-between rounded-md border border-gray-200 bg-gray-50 px-3 py-2 hover:bg-gray-100"
            :title="`Toggle all metrics in ${groupName}`"
          >
            <h4 class="text-sm font-semibold text-gray-700">{{ groupName }}</h4>
            <svg
              xmlns="http://www.w3.org/2000/svg"
              fill="none"
              viewBox="0 0 24 24"
              stroke-width="1.5"
              stroke="currentColor"
              class="h-3.5 w-3.5 text-gray-500 transition-transform duration-200"
              :class="{ 'rotate-180 transform': expandedGroups[groupName] }"
            >
              <path
                stroke-linecap="round"
                stroke-linejoin="round"
                d="M19.5 8.25l-7.5 7.5-7.5-7.5"
              />
            </svg>
          </div>

          <div v-if="expandedGroups[groupName]" class="space-y-2">
            <div
              v-for="metricKey in groupedActiveMetrics[groupName]"
              :key="metricKey"
              class="metric-interpretation mb-3 rounded-md border border-gray-100 shadow-sm"
            >
              <div
                @click="toggleMetric(metricKey)"
                class="flex cursor-pointer items-center justify-between border-b border-gray-100 px-3 py-2 hover:bg-gray-50"
                :title="`${getMetricName(metricKey)}: ${getSelectedDefinition(metricKey)?.value_name || ''}`"
              >
                <div class="flex items-baseline">
                  <h5 class="text-sm font-medium text-gray-800">
                    {{ getMetricName(metricKey) }}
                  </h5>
                  <span
                    class="ml-2 rounded-full px-1.5 py-0.5 text-xs font-medium"
                    :class="getValueColor(selectedMetrics[metricKey])"
                  >
                    {{ selectedMetrics[metricKey] }}
                  </span>
                </div>
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke-width="1.5"
                  stroke="currentColor"
                  class="h-3.5 w-3.5 text-gray-500 transition-transform duration-200"
                  :class="{ 'rotate-180 transform': expandedMetrics[metricKey] }"
                >
                  <path
                    stroke-linecap="round"
                    stroke-linejoin="round"
                    d="M19.5 8.25l-7.5 7.5-7.5-7.5"
                  />
                </svg>
              </div>

              <div v-if="expandedMetrics[metricKey]" class="px-3 py-2">
                <p class="mb-1 text-sm font-medium text-gray-700">
                  {{ getSelectedDefinition(metricKey)?.value_name || 'N/A' }}
                </p>

                <p class="text-xs leading-relaxed text-gray-600">
                  {{ getDescriptionText(getSelectedDefinition(metricKey)) }}
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<style scoped>
.interpretation-container {
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.1);
}

.interpretation-list {
  height: auto;
  overflow: visible;
}

.metric-interpretation {
  transition: all 0.2s ease;
}

.metric-interpretation:hover {
  box-shadow: 0 2px 5px rgba(0, 0, 0, 0.05);
}

[title] {
  position: relative;
}

[title]:hover::after {
  content: attr(title);
  position: absolute;
  bottom: 100%;
  left: 50%;
  transform: translateX(-50%);
  padding: 5px 10px;
  background: rgba(0, 0, 0, 0.8);
  color: white;
  border-radius: 3px;
  font-size: 12px;
  white-space: nowrap;
  z-index: 10;
  pointer-events: none;
}
</style>
