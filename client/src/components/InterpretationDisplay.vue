<script lang="ts" setup>
import { computed, ref, watch } from 'vue'
import { storeToRefs } from 'pinia'
import { useCvssStore } from '@/stores/cvssStore'
import type { CvssTemplateBare } from '@mono/server/src/shared/entities'
import { defaultMetricsV3_1, defaultMetricsV4_0 } from '@/constants/cvssConstants'
import type { StructuredMetricGroup } from '@/stores/cvssStore'

const cvssStore = useCvssStore()

const {
  selectedMetrics,
  currentDefinitions,
  selectedVersion,
  preferredDescriptionKey,
  structuredMetricGroups,
} = storeToRefs(cvssStore)

const expandedMetrics = ref<Record<string, boolean>>({})
const expandedGroups = ref<Record<string, boolean>>({})
const allExpanded = ref(true)

const currentDefaults = computed(() => {
  return selectedVersion.value === '4.0' ? defaultMetricsV4_0 : defaultMetricsV3_1
})

function shouldDisplayMetric(metricKey: string): boolean {
  const currentValue = selectedMetrics.value?.[metricKey]
  const defaultValue = currentDefaults.value?.[metricKey] ?? 'X'
  const groups = structuredMetricGroups.value
  let isBase = false
  if (selectedVersion.value === '4.0') {
    const baseParent = groups.find((g) => g.name === 'Base Metrics')
    isBase = !!baseParent?.children?.some((child) => child.metrics?.includes(metricKey))
  } else {
    const baseGroup = groups.find((g) => g.name === 'Base Score')
    isBase = !!baseGroup?.metrics?.includes(metricKey)
  }
  return isBase || (currentValue !== undefined && currentValue !== defaultValue)
}

const activeStructuredGroups = computed((): StructuredMetricGroup[] => {
  return structuredMetricGroups.value
    .map((parentGroup): StructuredMetricGroup | null => {
      const activeParentMetrics = parentGroup.metrics?.filter(shouldDisplayMetric) ?? []
      const activeChildren =
        parentGroup.children
          ?.map((childGroup): StructuredMetricGroup | null => {
            const activeChildMetrics = childGroup.metrics?.filter(shouldDisplayMetric) ?? []
            return activeChildMetrics.length > 0
              ? { ...childGroup, metrics: activeChildMetrics }
              : null
          })
          .filter((child): child is StructuredMetricGroup => child !== null) ?? []

      const hasActiveParentMetrics = activeParentMetrics.length > 0
      const hasActiveChildren = activeChildren.length > 0

      if (hasActiveParentMetrics || hasActiveChildren) {
        return {
          name: parentGroup.name,
          metrics: hasActiveParentMetrics ? activeParentMetrics : undefined,
          children: hasActiveChildren ? activeChildren : undefined,
        }
      }
      return null
    })
    .filter((group): group is StructuredMetricGroup => group !== null)
})

const hasActiveMetrics = computed(() => {
  return activeStructuredGroups.value.length > 0
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

function getMetricName(metricKey: string): string {
  const definition = currentDefinitions.value?.find((def) => def.metric_key === metricKey)
  return definition?.metric_name || metricKey
}

function getValueColor(value: string | undefined): string {
  if (!value) return 'bg-gray-100 text-gray-700 border border-gray-200'
  value = value.toUpperCase()

  if (value === 'N') return 'bg-blue-100 text-blue-800 border border-blue-200'
  if (value === 'L') return 'bg-yellow-100 text-yellow-800 border border-yellow-200'
  if (value === 'M') return 'bg-orange-100 text-orange-800 border border-orange-200'
  if (value === 'H') return 'bg-red-100 text-red-800 border border-red-200'
  if (value === 'P') return 'bg-purple-100 text-purple-800 border border-purple-200'
  if (value === 'A') return 'bg-pink-100 text-pink-800 border border-pink-200'
  if (value === 'U') return 'bg-indigo-100 text-indigo-800 border border-indigo-200'
  if (value === 'C') return 'bg-green-100 text-green-800 border border-green-200'
  if (value === 'R') return 'bg-teal-100 text-teal-800 border border-teal-200'
  if (value === 'F') return 'bg-rose-100 text-rose-800 border border-rose-200'
  if (value === 'O') return 'bg-lime-100 text-lime-800 border border-lime-200'
  if (value === 'T') return 'bg-cyan-100 text-cyan-800 border border-cyan-200'
  if (value === 'W') return 'bg-sky-100 text-sky-800 border border-sky-200'
  if (value === 'S') return 'bg-red-200 text-red-900 border border-red-300 font-bold'
  if (value === 'Y') return 'bg-emerald-100 text-emerald-800 border border-emerald-200'
  if (value === 'D') return 'bg-stone-100 text-stone-800 border border-stone-200'
  if (value === 'I') return 'bg-zinc-100 text-zinc-800 border border-zinc-200'
  if (value === 'CLEAR') return 'bg-slate-100 text-slate-800 border border-slate-200'
  if (value === 'GREEN') return 'bg-green-100 text-green-800 border border-green-200'
  if (value === 'AMBER') return 'bg-amber-100 text-amber-800 border border-amber-200'
  if (value === 'RED') return 'bg-red-100 text-red-800 border border-red-200'
  return 'bg-gray-100 text-gray-700 border border-gray-200'
}

function toggleMetric(metricKey: string) {
  expandedMetrics.value[metricKey] = !expandedMetrics.value[metricKey]
  updateAllExpandedState()
}

function toggleGroup(groupName: string) {
  const isExpanded = !expandedGroups.value[groupName]
  expandedGroups.value[groupName] = isExpanded

  const findAndToggle = (groups: StructuredMetricGroup[]) => {
    for (const group of groups) {
      if (group.name === groupName) {
        group.metrics?.forEach((metricKey) => {
          if (expandedMetrics.value[metricKey] !== undefined) {
            expandedMetrics.value[metricKey] = isExpanded
          }
        })
        group.children?.forEach((child) => {
          if (expandedGroups.value[child.name] !== undefined) {
            expandedGroups.value[child.name] = isExpanded
          }
          child.metrics?.forEach((metricKey) => {
            if (expandedMetrics.value[metricKey] !== undefined) {
              expandedMetrics.value[metricKey] = isExpanded
            }
          })
        })
        return true
      }
      if (group.children && findAndToggle(group.children)) {
        return true
      }
    }
    return false
  }

  findAndToggle(activeStructuredGroups.value)
  updateAllExpandedState()
}

function toggleAllMetrics() {
  const newState = !allExpanded.value
  allExpanded.value = newState

  const setExpansionState = (groups: StructuredMetricGroup[]) => {
    groups.forEach((group) => {
      if (expandedGroups.value[group.name] !== undefined) {
        expandedGroups.value[group.name] = newState
      }
      group.metrics?.forEach((metricKey) => {
        if (expandedMetrics.value[metricKey] !== undefined) {
          expandedMetrics.value[metricKey] = newState
        }
      })
      if (group.children) {
        setExpansionState(group.children)
      }
    })
  }
  setExpansionState(activeStructuredGroups.value)
}

function checkAllExpandedState(): boolean {
  if (!hasActiveMetrics.value) return true

  let allAreCurrentlyExpanded = true
  const checkExpansion = (groups: StructuredMetricGroup[]) => {
    for (const group of groups) {
      if (expandedGroups.value[group.name] === false) {
        allAreCurrentlyExpanded = false
        return
      }
      if (group.metrics) {
        for (const metricKey of group.metrics) {
          if (expandedMetrics.value[metricKey] === false) {
            allAreCurrentlyExpanded = false
            return
          }
        }
      }
      if (group.children && allAreCurrentlyExpanded) {
        checkExpansion(group.children)
        if (!allAreCurrentlyExpanded) return
      }
    }
  }

  checkExpansion(activeStructuredGroups.value)
  return allAreCurrentlyExpanded
}

function updateAllExpandedState() {
  allExpanded.value = checkAllExpandedState()
}

function initializeExpandedState() {
  const initialize = (groups: StructuredMetricGroup[]) => {
    groups.forEach((group) => {
      if (expandedGroups.value[group.name] === undefined) {
        expandedGroups.value[group.name] = true
      }
      group.metrics?.forEach((metricKey) => {
        if (expandedMetrics.value[metricKey] === undefined) {
          expandedMetrics.value[metricKey] = true
        }
      })
      if (group.children) {
        initialize(group.children)
      }
    })
  }
  initialize(activeStructuredGroups.value)
  updateAllExpandedState()
}

watch(
  activeStructuredGroups,
  () => {
    initializeExpandedState()
  },
  { deep: true, immediate: true }
)
</script>

<template>
  <div
    class="interpretation-container h-full rounded-lg border border-gray-200 bg-white p-4 shadow-sm"
  >
    <div class="mb-3 flex items-center justify-between border-b border-gray-200 pb-2">
      <h2 class="text-base font-semibold text-gray-700">Interpretation</h2>
      <button
        v-if="hasActiveMetrics"
        @click="toggleAllMetrics"
        class="flex items-center rounded-md px-2 py-1 text-xs font-medium text-blue-600 hover:bg-blue-50 hover:text-blue-800 focus:outline-none focus:ring-2 focus:ring-blue-300"
      >
        <span class="mr-1">{{ allExpanded ? 'Collapse All' : 'Expand All' }}</span>
        <svg
          v-if="allExpanded"
          xmlns="http://www.w3.org/2000/svg"
          fill="none"
          viewBox="0 0 24 24"
          stroke-width="2"
          stroke="currentColor"
          class="h-3.5 w-3.5"
        >
          <path
            stroke-linecap="round"
            stroke-linejoin="round"
            d="M15 12H9m12 0a9 9 0 1 1-18 0 9 9 0 0 1 18 0Z"
          />
        </svg>
        <svg
          v-else
          xmlns="http://www.w3.org/2000/svg"
          fill="none"
          viewBox="0 0 24 24"
          stroke-width="2"
          stroke="currentColor"
          class="h-3.5 w-3.5"
        >
          <path
            stroke-linecap="round"
            stroke-linejoin="round"
            d="M12 9v6m3-3H9m12 0a9 9 0 1 1-18 0 9 9 0 0 1 18 0Z"
          />
        </svg>
      </button>
    </div>

    <div v-if="!currentDefinitions" class="py-4 text-center text-sm text-gray-500">
      Loading definitions or select a version...
    </div>
    <div
      v-else-if="structuredMetricGroups.length === 0"
      class="py-4 text-center text-sm text-gray-500"
    >
      No metrics defined for this version.
    </div>
    <div v-else-if="!hasActiveMetrics" class="py-4 text-center text-sm text-gray-500">
      Only default metric values are selected. Change a metric value to see its interpretation.
    </div>

    <div v-else class="interpretation-list-wrapper h-full">
      <div class="interpretation-list space-y-4">
        <div v-for="parentGroup in activeStructuredGroups" :key="parentGroup.name">
          <div
            @click="toggleGroup(parentGroup.name)"
            class="group-header mb-2 flex cursor-pointer items-center justify-between rounded-md border border-gray-200 bg-gray-50 px-3 py-2 hover:bg-gray-100"
          >
            <h3 class="text-sm font-semibold text-gray-800">{{ parentGroup.name }}</h3>
            <svg
              xmlns="http://www.w3.org/2000/svg"
              fill="none"
              viewBox="0 0 24 24"
              stroke-width="2"
              stroke="currentColor"
              class="h-4 w-4 text-gray-500 transition-transform duration-200"
              :class="{ 'rotate-180 transform': expandedGroups[parentGroup.name] }"
            >
              <path stroke-linecap="round" stroke-linejoin="round" d="m19.5 8.25-7.5 7.5-7.5-7.5" />
            </svg>
          </div>

          <div
            v-show="expandedGroups[parentGroup.name]"
            class="ml-2 space-y-3 border-l-2 border-gray-100 pl-3"
          >
            <div v-if="parentGroup.metrics && parentGroup.metrics.length > 0" class="space-y-3">
              <div
                v-for="metricKey in parentGroup.metrics"
                :key="metricKey"
                class="metric-interpretation rounded-md border border-gray-100 bg-white shadow-sm"
              >
                <div
                  @click="toggleMetric(metricKey)"
                  class="flex cursor-pointer items-center justify-between border-b border-gray-100 px-3 py-2 hover:bg-gray-50"
                >
                  <div class="flex items-center">
                    <h5 class="text-xs font-medium text-gray-700">
                      {{ getMetricName(metricKey) }} ({{ metricKey }})
                    </h5>
                    <span
                      class="ml-2 rounded-full px-2 py-0.5 text-xs font-semibold"
                      :class="getValueColor(selectedMetrics[metricKey])"
                    >
                      {{ selectedMetrics[metricKey] }}
                    </span>
                  </div>
                  <svg
                    xmlns="http://www.w3.org/2000/svg"
                    fill="none"
                    viewBox="0 0 24 24"
                    stroke-width="2"
                    stroke="currentColor"
                    class="h-3.5 w-3.5 text-gray-400 transition-transform duration-200"
                    :class="{ 'rotate-180 transform': expandedMetrics[metricKey] }"
                  >
                    <path
                      stroke-linecap="round"
                      stroke-linejoin="round"
                      d="m19.5 8.25-7.5 7.5-7.5-7.5"
                    />
                  </svg>
                </div>
                <div v-show="expandedMetrics[metricKey]" class="px-3 pb-3 pt-2">
                  <p class="mb-1 text-xs font-semibold text-gray-800">
                    {{ getSelectedDefinition(metricKey)?.value_name || 'N/A' }}
                  </p>
                  <p class="text-xs leading-relaxed text-gray-600">
                    {{ getDescriptionText(getSelectedDefinition(metricKey)) }}
                  </p>
                </div>
              </div>
            </div>

            <div v-if="parentGroup.children && parentGroup.children.length > 0" class="space-y-3">
              <div v-for="childGroup in parentGroup.children" :key="childGroup.name">
                <div
                  @click="toggleGroup(childGroup.name)"
                  class="group-header -ml-1 mb-2 flex cursor-pointer items-center justify-between rounded-md border border-gray-100 bg-gray-50 px-3 py-1.5 hover:bg-gray-100"
                >
                  <h4 class="text-xs font-semibold text-gray-600">{{ childGroup.name }}</h4>
                  <svg
                    xmlns="http://www.w3.org/2000/svg"
                    fill="none"
                    viewBox="0 0 24 24"
                    stroke-width="2"
                    stroke="currentColor"
                    class="h-3.5 w-3.5 text-gray-400 transition-transform duration-200"
                    :class="{ 'rotate-180 transform': expandedGroups[childGroup.name] }"
                  >
                    <path
                      stroke-linecap="round"
                      stroke-linejoin="round"
                      d="m19.5 8.25-7.5 7.5-7.5-7.5"
                    />
                  </svg>
                </div>

                <div
                  v-show="expandedGroups[childGroup.name] && childGroup.metrics"
                  class="ml-2 space-y-3 border-l-2 border-gray-100 pl-3"
                >
                  <div
                    v-for="metricKey in childGroup.metrics"
                    :key="metricKey"
                    class="metric-interpretation rounded-md border border-gray-100 bg-white shadow-sm"
                  >
                    <div
                      @click="toggleMetric(metricKey)"
                      class="flex cursor-pointer items-center justify-between border-b border-gray-100 px-3 py-2 hover:bg-gray-50"
                    >
                      <div class="flex items-center">
                        <h5 class="text-xs font-medium text-gray-700">
                          {{ getMetricName(metricKey) }} ({{ metricKey }})
                        </h5>
                        <span
                          class="ml-2 rounded-full px-2 py-0.5 text-xs font-semibold"
                          :class="getValueColor(selectedMetrics[metricKey])"
                        >
                          {{ selectedMetrics[metricKey] }}
                        </span>
                      </div>
                      <svg
                        xmlns="http://www.w3.org/2000/svg"
                        fill="none"
                        viewBox="0 0 24 24"
                        stroke-width="2"
                        stroke="currentColor"
                        class="h-3.5 w-3.5 text-gray-400 transition-transform duration-200"
                        :class="{ 'rotate-180 transform': expandedMetrics[metricKey] }"
                      >
                        <path
                          stroke-linecap="round"
                          stroke-linejoin="round"
                          d="m19.5 8.25-7.5 7.5-7.5-7.5"
                        />
                      </svg>
                    </div>
                    <div v-show="expandedMetrics[metricKey]" class="px-3 pb-3 pt-2">
                      <p class="mb-1 text-xs font-semibold text-gray-800">
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
      </div>
    </div>
  </div>
</template>

<style scoped>
.interpretation-container {
  box-shadow:
    0 1px 3px 0 rgb(0 0 0 / 0.1),
    0 1px 2px -1px rgb(0 0 0 / 0.1);
  display: flex;
  flex-direction: column;
}

.interpretation-list-wrapper {
  flex-grow: 1;
  overflow-y: auto;
}

.interpretation-list {
  height: auto;
}

.group-header {
  transition: background-color 0.15s ease-in-out;
}

.metric-interpretation {
  transition: box-shadow 0.15s ease-in-out;
}

.metric-interpretation:hover {
  box-shadow:
    0 1px 3px 0 rgb(0 0 0 / 0.07),
    0 1px 2px -1px rgb(0 0 0 / 0.07);
}

.value-pill {
  display: inline-block;
  padding: 1px 8px;
  border-radius: 9999px;
  font-size: 0.7rem;
  font-weight: 600;
  line-height: 1.2;
  text-align: center;
  min-width: 20px;
}
</style>
